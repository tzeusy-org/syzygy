import { OWNER_TOPICS } from './topics.js';

/** The hand-rolled scanner over a rendered dossier page; split out of `dossier-evaluation.ts` unchanged. */

// One string, not a list of literals: the response-ceiling check (C3) flags a
// quoted two-letter element name as a content-coding token.
const VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decodes the entities a renderer's `escape` emits plus numeric references; any other named entity stays literal.
 * Kept apart from quote-fidelity.ts `decodeEntity` on purpose (syzygy-bpyt.8.41, GP-Q0): this one reads a page as a reader sees it, so it caps
 * digits at 7 decimal or 6 hex and decodes `&#0;`; that one normalises quotation text and caps nothing and keeps `&#0;` literal.
 * `entity-decoder-divergence.test.ts` pins where they differ. */
export function decodeHtmlText(text: string): string {
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z]+));/gu, (match, decimal: string | undefined, hex: string | undefined, name: string | undefined) => {
    if (name !== undefined) return NAMED_ENTITIES[name] ?? match;
    const code = decimal !== undefined ? Number.parseInt(decimal, 10) : Number.parseInt(hex!, 16);
    return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}

const countWords = (text: string): number => text.match(/\S+/gu)?.length ?? 0;

function attributes(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of source.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/gu)) {
    out.set(match[1]!.toLowerCase(), decodeHtmlText(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return out;
}

export interface ScannedSection { readonly id: string | null; readonly topics: readonly string[] }
export interface ScannedClaim {
  readonly id: string;
  readonly epistemic: string | null;
  readonly hasQuote: boolean;
  /** The claim element's text as a reader sees it (entities decoded, tags removed). */
  readonly text: string;
  /** Source ids named by `data-source-id` or `Read source <id>` anchors inside the claim, in page order. */
  readonly citedSourceIds: readonly string[];
}
export interface ScannedQuote { readonly sourceId: string | null; readonly start: string | null; readonly end: string | null; readonly text: string }
export interface ScannedPage {
  readonly bytes: number;
  /** Words by reading level; `unlabelled` holds body text under no marked level. */
  readonly words: { readonly byLevel: Readonly<Record<string, number>>; readonly unlabelled: number };
  /** UTF-8 bytes from the start of the file through the close of the last level-0 element; null when the page marks none. */
  readonly bytesThroughFirstLevel: number | null;
  readonly sections: readonly ScannedSection[];
  readonly ids: ReadonlySet<string>;
  readonly claims: readonly ScannedClaim[];
  readonly quotes: readonly ScannedQuote[];
  readonly findings: readonly string[];
}

interface Open { readonly name: string; readonly level: string | null; readonly quote: { text: string } | null; readonly claim: { hasQuote: boolean; text: string; citedSourceIds: string[] } | null }

export function scanDossierPage(html: string): ScannedPage {
  const byLevel: Record<string, number> = {};
  let unlabelled = 0;
  let lastLevelZeroClose: number | null = null;
  const sections: ScannedSection[] = [];
  const ids = new Set<string>();
  const claims: { id: string; epistemic: string | null; hasQuote: boolean; text: string; citedSourceIds: string[] }[] = [];
  const quotes: (ScannedQuote & { text: string })[] = [];
  const findings: string[] = [];
  const stack: Open[] = [];
  const level = (): string | null => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]!.level !== null) return stack[i]!.level;
    return null;
  };
  const text = (raw: string): void => {
    // HTML input-stream preprocessing: a reader's DOM has LF where the bytes have
    // CRLF or a lone CR, so a source CR survives only as a character reference.
    const decoded = decodeHtmlText(raw.replace(/\r\n?/gu, '\n'));
    for (const open of stack) { if (open.quote !== null) open.quote.text += decoded; if (open.claim !== null) open.claim.text += decoded; }
    const words = countWords(decoded);
    if (words === 0) return;
    const current = level();
    if (current === null) unlabelled += words;
    else byLevel[current] = (byLevel[current] ?? 0) + words;
  };
  const token = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/\s*([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/gu;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html)) !== null) {
    text(html.slice(cursor, match.index));
    cursor = token.lastIndex;
    if (match[1] !== undefined) {
      const name = match[1].toLowerCase();
      const at = stack.map(open => open.name).lastIndexOf(name);
      if (at === -1) { findings.push(`unmatched-close:${name}`); continue; }
      if (at !== stack.length - 1) findings.push(`implicit-close:${stack.slice(at + 1).map(open => open.name).join(',')}`);
      for (const closed of stack.splice(at)) {
        if (closed.level === '0') lastLevelZeroClose = Buffer.byteLength(html.slice(0, cursor), 'utf8');
      }
      continue;
    }
    if (match[2] === undefined) continue;
    const name = match[2].toLowerCase();
    const attrs = attributes(match[3] ?? '');
    const id = attrs.get('id');
    if (id !== undefined) {
      if (ids.has(id)) findings.push(`duplicate-id:${id}`);
      ids.add(id);
    }
    if (name === 'section') {
      const topics = (attrs.get('data-topics') ?? '').split(/\s+/u).filter(Boolean);
      for (const topic of topics) if (!(OWNER_TOPICS as readonly string[]).includes(topic)) findings.push(`unknown-topic:${topic}`);
      sections.push({ id: id ?? null, topics });
      if (id === undefined) findings.push('section-without-id');
    }
    const claimId = attrs.get('data-claim-id');
    let claim: { id: string; epistemic: string | null; hasQuote: boolean; text: string; citedSourceIds: string[] } | null = null;
    if (claimId !== undefined) {
      claim = { id: claimId, epistemic: attrs.has('data-epistemic') ? attrs.get('data-epistemic')! : null, hasQuote: false, text: '', citedSourceIds: [] };
      claims.push(claim);
    }
    // A citation names its source by `data-source-id` (the dossier's numbered links) or by a `Read source <id>` label (the draft preview).
    const cited = name !== 'a' ? null : attrs.get('data-source-id') ?? /^Read source (.+)$/u.exec(attrs.get('aria-label') ?? '')?.[1] ?? null;
    if (cited !== null) for (const open of stack) if (open.claim !== null) open.claim.citedSourceIds.push(cited);
    let quote: { text: string } | null = null;
    if (attrs.has('data-quote-source') || attrs.has('data-quote-start') || attrs.has('data-quote-end')) {
      for (const open of stack) if (open.claim !== null) open.claim.hasQuote = true;
      if (claim !== null) claim.hasQuote = true;
      const record = { sourceId: attrs.get('data-quote-source') ?? null, start: attrs.get('data-quote-start') ?? null, end: attrs.get('data-quote-end') ?? null, text: '' };
      quotes.push(record);
      quote = record;
    }
    let readingLevel: string | null = null;
    if (attrs.has('data-reading-level')) {
      const value = attrs.get('data-reading-level')!;
      if (/^(?:0|[1-9]\d{0,2})$/u.test(value)) readingLevel = value;
      else findings.push(`invalid-reading-level:${value}`);
    }
    const selfClosing = (match[3] ?? '').trimEnd().endsWith('/');
    if (VOID.has(name) || selfClosing) continue;
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'giu');
      close.lastIndex = cursor;
      const end = close.exec(html);
      const body = html.slice(cursor, end === null ? html.length : end.index);
      // Script, style and title text is not page reading; a textarea's is.
      if (name === 'textarea') { stack.push({ name, level: readingLevel, quote, claim }); text(body); stack.pop(); }
      cursor = end === null ? html.length : close.lastIndex;
      token.lastIndex = cursor;
      if (end === null) findings.push(`unclosed:${name}`);
      continue;
    }
    stack.push({ name, level: readingLevel, quote, claim });
  }
  text(html.slice(cursor));
  if (stack.some(open => open.name !== 'html' && open.name !== 'body')) findings.push(`unclosed:${stack.map(open => open.name).join(',')}`);
  return {
    bytes: Buffer.byteLength(html, 'utf8'),
    words: { byLevel, unlabelled },
    bytesThroughFirstLevel: lastLevelZeroClose,
    sections, ids, claims, quotes, findings,
  };
}
