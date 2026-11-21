/** URL selection (REQ-polaris-generation-047). Advertisements are untrusted
 * metadata, never proof that the selected object is a commit. No Git process,
 * consent record or previous run participates in this parser. */

export type UrlRevisionPlan =
  | { readonly kind: 'remote-default'; readonly queries: readonly ['HEAD'] }
  | { readonly kind: 'full-commit'; readonly commit: string; readonly queries: readonly [] }
  | { readonly kind: 'remote-ref'; readonly references: readonly string[]; readonly queries: readonly string[] };

export interface UrlRevisionSelection {
  readonly mode: UrlRevisionPlan['kind'];
  readonly reference: string | null;
  readonly identifier: string;
  readonly objectFormat: 'sha1' | 'sha256';
}

export type UrlRevisionFailureCode = 'selector-limit' | 'selector-unsupported' | 'metadata-limit' | 'metadata-invalid' | 'default-missing' | 'ref-missing' | 'ref-ambiguous';
export type UrlRevisionResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly code: UrlRevisionFailureCode; readonly reason: string };

const FULL_IDENTIFIER = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/iu;
const bad = (code: UrlRevisionFailureCode, reason: string): UrlRevisionResult<never> => ({ ok: false, code, reason });

/** The relevant Git ref-name rules, applied before constructing a query. A
 * selector is never passed as a fetch refspec or interpreted by a shell. */
function validReference(reference: string): boolean {
  return reference.length <= 1024 && reference.startsWith('refs/') && !/[\x00-\x20\x7f~^:?*\[\\]/u.test(reference)
    && !reference.includes('..') && !reference.includes('@{') && !reference.includes('//')
    && !reference.endsWith('.') && reference.split('/').every(part => part !== '' && !part.startsWith('.') && !part.endsWith('.lock'));
}

export function planUrlRevision(selector?: string): UrlRevisionResult<UrlRevisionPlan> {
  if (selector === undefined) return { ok: true, value: { kind: 'remote-default', queries: ['HEAD'] } };
  if (selector.length > 1024) return bad('selector-limit', '--revision exceeds the 1024-character selector limit; use a full commit identifier');
  if (FULL_IDENTIFIER.test(selector)) return { ok: true, value: { kind: 'full-commit', commit: selector.toLowerCase(), queries: [] } };
  if (/^[0-9a-f]{4,63}$/iu.test(selector)) return bad('selector-unsupported', '--revision abbreviated object identifiers are unsupported; use a full commit identifier or refs/heads/<branch> or refs/tags/<tag>');
  const references = selector.startsWith('refs/') ? [selector] : [`refs/heads/${selector}`, `refs/tags/${selector}`];
  if (selector.startsWith('-') || references.some(ref => !validReference(ref) || !/^refs\/(?:heads|tags)\/.+/u.test(ref))) {
    return bad('selector-unsupported', '--revision must name a full commit identifier or an exact remote branch/tag reference; patterns and revision expressions are unsupported');
  }
  return { ok: true, value: {
    kind: 'remote-ref', references,
    queries: references.flatMap(ref => ref.startsWith('refs/tags/') ? [ref, `${ref}^{}`] : [ref]),
  } };
}

/** Match the exact returned field, not Git's query-pattern behavior. Duplicate,
 * unexpected or conflicting rows fail closed, including duplicate equal rows.
 * The caller screens selected metadata before storing or printing it. */
export function selectUrlRevision(plan: UrlRevisionPlan, advertisement: string): UrlRevisionResult<UrlRevisionSelection> {
  const selection = (mode: UrlRevisionPlan['kind'], reference: string | null, identifier: string): UrlRevisionResult<UrlRevisionSelection> => ({
    ok: true, value: { mode, reference, identifier, objectFormat: identifier.length === 64 ? 'sha256' : 'sha1' },
  });
  if (plan.kind === 'full-commit') return selection(plan.kind, null, plan.commit);
  if (advertisement.length > 2_097_152) return bad('metadata-limit', 'the remote advertisement exceeds the metadata limit; give --revision with a full commit identifier');
  const identifiers = new Map<string, string>();
  const requested = new Set<string>(plan.queries);
  let defaultReference: string | null = null;
  const malformed = (): UrlRevisionResult<never> => bad('metadata-invalid', 'the remote advertisement is malformed or conflicting; use --revision with a full commit identifier or exact remote reference');
  const rows = advertisement.endsWith('\n') ? advertisement.slice(0, -1).split('\n') : advertisement.split('\n');
  for (const row of rows) {
    const fields = row.split('\t');
    if (fields.length !== 2) return malformed();
    const [value, reference] = fields as [string, string];
    if (value.startsWith('ref: ')) {
      if (plan.kind !== 'remote-default' || reference !== 'HEAD' || defaultReference !== null) return malformed();
      const target = value.slice(5);
      if (!target.startsWith('refs/heads/') || !validReference(target)) return malformed();
      defaultReference = target;
    } else {
      if (!FULL_IDENTIFIER.test(value) || identifiers.has(reference) || !requested.has(reference)) return malformed();
      identifiers.set(reference, value.toLowerCase());
    }
  }
  if (new Set([...identifiers.values()].map(id => id.length)).size > 1) return malformed();
  if (plan.kind === 'remote-default') {
    const identifier = identifiers.get('HEAD');
    if (defaultReference === null || identifier === undefined) return bad('default-missing', 'the remote advertises no single default HEAD; give --revision with a full commit identifier or exact remote reference');
    return selection(plan.kind, defaultReference, identifier);
  }
  const matches = plan.references.filter(ref => identifiers.has(ref));
  if (matches.length !== 1) return bad(matches.length === 0 ? 'ref-missing' : 'ref-ambiguous', matches.length === 0
    ? '--revision matches no advertised remote branch or tag; give a full commit identifier or exact remote reference'
    : '--revision is ambiguous between a remote branch and tag; use refs/heads/<branch> or refs/tags/<tag>');
  const reference = matches[0]!;
  for (const ref of identifiers.keys()) if (ref.endsWith('^{}') && !identifiers.has(ref.slice(0, -3))) return malformed();
  // A peeled target is selected only for a named tag. An explicit full object
  // identifier above is never peeled; the pinned reader must show it a commit.
  return selection(plan.kind, reference, identifiers.get(`${reference}^{}`) ?? identifiers.get(reference)!);
}
