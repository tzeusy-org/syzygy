import { sha256 } from '@syzygy/support';

/** The launch consent record family (REQ-polaris-generation-046): one generic form for every repository, with no per-repository code,
 * phrase, form or registry entry (line 25).
 *
 * Three classes, each its own file and none read as another (line 21): an observation consent for (`project:syzygy`, the repository
 * identity) at one pinned revision (line 17); a drawer statement for the subject and not for any revision (line 19); and a provider
 * statement per subject and agent provider, naming the content classes (line 21). Each is "an owner-act record binding the exact digest
 * of its content (RFC3-16) and preserving the exact owner phrase", with provenance state `owner-adopted (bootstrap, uncorrelated)` and
 * its A1 audit-record identity explicitly absent while no A1 mechanism is in force, and records its ceremony: "the question in full, the
 * phrase, the terminal it came from and the operator's declaration above" (line 17).
 *
 * The file is the content, then one last line `Content digest (SHA-256): \`<hex>\`` over every byte before it. A reader recomputes the
 * digest from the bytes and refuses a record whose last line does not hold it. A record names no execution choice (line 25). File names
 * carry no identity (`LAUNCH-<CLASS>-<12 hex>-<instant>-<8 hex>.md`), so no name can carry a stem the decisions readers sweep for. */

export type LaunchRecordClass = 'observation-consent' | 'drawer-statement' | 'provider-statement';
export type PublicDeclaration = 'public' | 'not-public' | 'not-given';

export const LAUNCH_RECORD_DIR = '.syzygy/governance/decisions/launch-consent';
export const PROVENANCE_STATE = 'owner-adopted (bootstrap, uncorrelated)';
const CLASS_TOKEN: Readonly<Record<LaunchRecordClass, string>> = { 'observation-consent': 'OBSERVATION', 'drawer-statement': 'DRAWER', 'provider-statement': 'PROVIDER' };
const TITLE: Readonly<Record<LaunchRecordClass, string>> = {
  'observation-consent': '# Launch consent record — observation consent',
  'drawer-statement': '# Launch consent record — drawer statement',
  'provider-statement': '# Launch consent record — agent-provider statement',
};

export interface LaunchRecordCommon {
  readonly recordClass: LaunchRecordClass;
  readonly recordId: string;
  readonly identity: string;
  readonly identitySource: string;
  readonly normalisedUrl: string;
  readonly urlSource: string;
  readonly publicDeclaration: PublicDeclaration;
  /** The full pinned revision of the launch that recorded it: an observation consent's scope; for a statement, the revision it was asked at. */
  readonly revision: string;
  readonly grantInstant: string;
  readonly supersedes: string | null;
  readonly phrase: string;
  readonly terminal: string;
  readonly question: string;
  /** An observation consent's recorded scope (046, line 21): `copy`, held in the copy REQ-polaris-generation-047 makes from the operator's
   * own clone with no network request by Syzygy (version 1.2, every record written now); `operator-clone`, held in the operator's own clone
   * with no fetch by Syzygy (the scope version 1.1 recorded, read back unchanged). Absent on a statement. */
  readonly observationScope?: ObservationScope;
}
export type ObservationScope = 'copy' | 'operator-clone';
const SCOPE_TAIL: Readonly<Record<ObservationScope, string>> = {
  copy: 'held in the copy that REQ-polaris-generation-047 makes from the operator\'s own clone, with no network request by Syzygy',
  'operator-clone': 'held in the operator\'s own clone; Syzygy fetches nothing',
};
export interface ProviderFields { readonly agentTool: string; readonly provider: string; readonly contentClasses: readonly string[] }
export type LaunchRecord = LaunchRecordCommon & { readonly provider?: ProviderFields };

/** Whether a grant instant names a real calendar instant, exactly as written: `Date.parse` alone rolls a day past its month's end or an
 * hour 24 over into another instant (`2026-11-31` is read as 1 December), so the instant must also print back to itself. `T24:00:00Z`
 * is refused (owner's choice): a record's instant is read only as the instant it names. */
export function instantIsReadable(text: string): boolean {
  const ms = Date.parse(text);
  return !Number.isNaN(ms) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(text) && new Date(ms).toISOString() === `${text.slice(0, -1)}.000Z`;
}

/** `LAUNCH-<CLASS>-<12 hex of the revision>-<instant>-<8 hex of the identity's sha256>`: two launches in one second at one revision for two
 * identities get two names, and no name carries the identity itself. */
export const recordIdFor = (recordClass: LaunchRecordClass, revision: string, instant: string, identity: string): string =>
  `LAUNCH-${CLASS_TOKEN[recordClass]}-${revision.slice(0, 12)}-${instant.replace(/[-:]/g, '')}-${sha256(identity).slice(0, 8)}`;
export const recordFileFor = (recordId: string): string => `${recordId}.md`;

const subjectOf = (r: LaunchRecord): string => r.recordClass === 'provider-statement'
  ? `(project:syzygy, ${r.identity}, agent-provider:${r.provider!.provider})` : `(project:syzygy, ${r.identity})`;

const FENCE = '````';

export function renderLaunchRecord(r: LaunchRecord): string {
  for (const text of [r.question, r.phrase]) if (text.includes(FENCE)) throw new Error('launch record: a ceremony text holds a four-backtick fence');
  const lines = [
    TITLE[r.recordClass], '',
    `Record ID: \`${r.recordId}\``, '',
    `Record class: \`${r.recordClass}\``, '',
    `Subject: \`${subjectOf(r)}\``, '',
    `Repository identity: \`${r.identity}\` [Inferred]: proposed from ${r.identitySource} and declared by the owner's phrase`, '',
    `Normalised URL: \`${r.normalisedUrl}\` [Inferred]: from ${r.urlSource}; a locator hint, never the identity; the clone's configuration lies within the agent sessions' write reach`, '',
    `Public declaration: \`${r.publicDeclaration}\` [Inferred]: the operator's declaration whether the repository is public`, '',
  ];
  if (r.recordClass === 'observation-consent') {
    lines.push(
      `Pinned revision: \`${r.revision}\``, '',
      `Scope: the commit object \`${r.revision}\` and the tree and blob objects reachable from its root tree, and nothing else, ${SCOPE_TAIL[r.observationScope ?? 'copy']}`, '',
    );
  } else if (r.recordClass === 'drawer-statement') {
    lines.push(
      'Statement: no kernel evidence drawer (RFC-0006 §3.5) exists for this subject', '',
      `Scope: the subject, not any revision; asked at the launch pinned to \`${r.revision}\``, '',
    );
  } else {
    const p = r.provider!;
    lines.push(
      `Agent tool: \`${p.agentTool}\``, '',
      `Agent provider: \`${p.provider}\``, '',
      'Content classes the provider may receive (computed as a preview of the policy\'s classification once the repository is admitted):', '',
      ...p.contentClasses.map(c => `- \`${c}\``), '',
      `Scope: the subject and this provider, not any revision; asked at the launch pinned to \`${r.revision}\`; a consent record, not an egress record; the agent sessions read the clone without restriction whatever classes it names`, '',
    );
  }
  lines.push(
    'Granting principal: the owner, as declared by the operator [Inferred]', '',
    `Grant instant: \`${r.grantInstant}\` (Syzygy's clock at the answer)`, '',
    'Revocation state: none', '',
    `Supersedes: ${r.supersedes === null ? 'none' : `\`${r.supersedes}\``}`, '',
    `Provenance state: \`${PROVENANCE_STATE}\``, '',
    'A1 audit-record identity: explicitly absent', '',
    'Execution choice: none; a launch consent is never an execution choice and records none', '',
    '## Ceremony', '',
    'Who answered: the operator\'s declaration that the owner answered in person [Inferred]; Syzygy cannot observe who typed the answer', '',
    `Terminal: \`${r.terminal}\``, '',
    'Owner phrase:', '', FENCE, r.phrase, FENCE, '',
    'Question, in full:', '', FENCE, r.question, FENCE, '',
  );
  const content = lines.join('\n');
  return `${content}Content digest (SHA-256): \`${sha256(content)}\`\n`;
}

export type ParsedLaunchRecord = { readonly ok: true; readonly record: LaunchRecord; readonly digest: string } | { readonly ok: false; readonly why: string };

const one = (text: string, re: RegExp): string | null => {
  const all = [...text.matchAll(re)];
  return all.length === 1 ? all[0]![1]! : null;
};

/** A record read back from its bytes: the digest line must hold the digest of every byte before it, and the bytes must be exactly what
 * `renderLaunchRecord` writes from the fields read out of them; anything else is refused. */
export function parseLaunchRecord(text: string): ParsedLaunchRecord {
  const m = /\nContent digest \(SHA-256\): `([0-9a-f]{64})`\n$/.exec(text);
  if (m === null) return { ok: false, why: 'the record does not end with its content digest line' };
  const content = text.slice(0, m.index + 1);
  if (sha256(content) !== m[1]) return { ok: false, why: 'the record\'s bytes do not hash to the content digest it binds' };
  const recordClass = one(text, /^Record class: `(observation-consent|drawer-statement|provider-statement)`$/gm) as LaunchRecordClass | null;
  const recordId = one(text, /^Record ID: `(LAUNCH-[A-Z]+-[0-9a-f]{12}-\d{8}T\d{6}Z-[0-9a-f]{8})`$/gm);
  const identity = one(text, /^Repository identity: `(repository:[a-z0-9][a-z0-9._-]*)` \[Inferred\]: proposed from (.+) and declared by the owner's phrase$/gm);
  const identitySource = one(text, /^Repository identity: `[^`]+` \[Inferred\]: proposed from (.+) and declared by the owner's phrase$/gm);
  const normalisedUrl = one(text, /^Normalised URL: `([^`\n]+)` \[Inferred\]: from /gm);
  const urlSource = one(text, /^Normalised URL: `[^`\n]+` \[Inferred\]: from (.+); a locator hint, never the identity; /gm);
  const publicDeclaration = one(text, /^Public declaration: `(public|not-public|not-given)` /gm) as PublicDeclaration | null;
  const revision = one(text, /^(?:Pinned revision: `|Scope: the subject(?:, not any revision| and this provider, not any revision); asked at the launch pinned to `)([0-9a-f]{40}|[0-9a-f]{64})`/gm);
  const grantInstant = one(text, /^Grant instant: `(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)` /gm);
  const supersedesRaw = one(text, /^Supersedes: (none|`LAUNCH-[A-Z]+-[0-9a-f]{12}-\d{8}T\d{6}Z-[0-9a-f]{8}`)$/gm);
  const terminal = one(text, /^Terminal: `([^`\n]+)`$/gm);
  const phrase = one(text, /^Owner phrase:\n\n````\n(.*)\n````$/gm);
  const question = /\nQuestion, in full:\n\n````\n([\s\S]*)\n````\n$/.exec(content)?.[1] ?? null;
  if (recordClass === null || recordId === null || identity === null || identitySource === null || normalisedUrl === null || urlSource === null
    || publicDeclaration === null || revision === null || grantInstant === null || supersedesRaw === null || terminal === null || phrase === null || question === null) {
    return { ok: false, why: 'the record does not carry exactly one of each field the launch record form writes' };
  }
  if (!instantIsReadable(grantInstant)) return { ok: false, why: `its grant instant ${grantInstant} is not a real calendar instant` };
  let provider: ProviderFields | undefined;
  if (recordClass === 'provider-statement') {
    const agentTool = one(text, /^Agent tool: `([^`\n]+)`$/gm), name = one(text, /^Agent provider: `([^`\n]+)`$/gm);
    const at = text.indexOf('Content classes the provider may receive');
    const classes: string[] = [];
    for (const line of text.slice(at).split('\n').slice(2)) {
      const c = /^- `([a-z-]+)`$/.exec(line);
      if (c === null) break;
      classes.push(c[1]!);
    }
    if (agentTool === null || name === null || at < 0) return { ok: false, why: 'the provider statement does not name exactly one agent tool and provider' };
    provider = { agentTool, provider: name, contentClasses: classes };
  }
  let observationScope: ObservationScope | undefined;
  if (recordClass === 'observation-consent') {
    const tail = one(text, /^Scope: the commit object `[0-9a-f]+` and the tree and blob objects reachable from its root tree, and nothing else, (.+)$/gm);
    observationScope = tail === SCOPE_TAIL['operator-clone'] ? 'operator-clone' : tail === SCOPE_TAIL.copy ? 'copy' : undefined;
    if (observationScope === undefined) return { ok: false, why: 'the observation consent does not record a scope the launch record form writes' };
  }
  const record: LaunchRecord = {
    recordClass, recordId, identity, identitySource, normalisedUrl, urlSource, publicDeclaration, revision, grantInstant,
    supersedes: supersedesRaw === 'none' ? null : supersedesRaw.slice(1, -1), phrase, terminal, question,
    ...(provider === undefined ? {} : { provider }), ...(observationScope === undefined ? {} : { observationScope }),
  };
  let again: string;
  try { again = renderLaunchRecord(record); } catch { return { ok: false, why: 'the record cannot be rendered back' }; }
  if (again !== text) return { ok: false, why: 'the record is not exactly what the launch record form writes from its own fields' };
  if (recordId !== recordIdFor(recordClass, revision, grantInstant, identity)) return { ok: false, why: 'the record ID does not name the record\'s class, revision, instant and identity' };
  return { ok: true, record, digest: m[1]! };
}
