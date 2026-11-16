import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@syzygy/support';

/** SEC-3's text as adopted, read live from the doctrine file each time a brief is issued (REQ-polaris-generation-033, 034).
 *
 * A brief that does not permit execution quotes SEC-3's head paragraph, and a permitting brief and the run record carry D9's cost
 * bullet; both are cut from the bytes of `security.md` as it stands, never restated, so a quotation can be compared byte for byte with
 * the adopted file. The cut is by line: the head is the paragraph that opens `**SEC-3 — `, the cost is the bullet that opens
 * `- **What the permitted case costs:**` inside SEC-3's section (up to `**SEC-4 — `) with its indented continuation lines. Either
 * occurring other than exactly once refuses; the cost bullet's absence is reported, not refused, since only a permitting brief needs it. */

export const SECURITY_DOCTRINE_PATH = '.syzygy/governance/doctrine/security.md';
const MAX_BYTES = 1_048_576;
const HEAD_OPEN = '**SEC-3 — ';
const NEXT_OPEN = '**SEC-4 — ';
const COST_OPEN = '- **What the permitted case costs:**';

export interface DoctrineSpan {
  /** The span's bytes as the file holds them, its lines joined by the file's own line feeds. */
  readonly text: string;
  /** 1-based, inclusive. */
  readonly startLine: number;
  readonly endLine: number;
}

export interface Sec3Text {
  readonly path: typeof SECURITY_DOCTRINE_PATH;
  readonly sha256: string;
  readonly head: DoctrineSpan;
  readonly cost: DoctrineSpan | null;
}

export type Sec3Read = { readonly ok: true; readonly sec3: Sec3Text } | { readonly ok: false; readonly reason: string };

export function readSec3(recordsRoot: string): Sec3Read {
  const file = path.join(recordsRoot, SECURITY_DOCTRINE_PATH);
  let bytes: Buffer;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return { ok: false, reason: `${SECURITY_DOCTRINE_PATH} is not a regular file` };
    if (stat.size > MAX_BYTES) return { ok: false, reason: `${SECURITY_DOCTRINE_PATH} is larger than ${MAX_BYTES} bytes` };
    bytes = fs.readFileSync(file);
  } catch (cause) {
    return { ok: false, reason: `${SECURITY_DOCTRINE_PATH} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (Buffer.from(text, 'utf8').compare(bytes) !== 0) return { ok: false, reason: `${SECURITY_DOCTRINE_PATH} is not valid UTF-8` };
  const cut = cutSec3(text);
  if (typeof cut === 'string') return { ok: false, reason: cut };
  return { ok: true, sec3: { path: SECURITY_DOCTRINE_PATH, sha256: sha256(bytes), ...cut } };
}

/** The cut itself, over the decoded file text; a reason string when the text does not have the shape described above. */
export function cutSec3(text: string): { readonly head: DoctrineSpan; readonly cost: DoctrineSpan | null } | string {
  const lines = text.split('\n');
  const opens = indexesOf(lines, (line) => line.startsWith(HEAD_OPEN));
  if (opens.length !== 1) return `${SECURITY_DOCTRINE_PATH} has ${opens.length} lines opening ${HEAD_OPEN.trim()}, not exactly one`;
  const start = opens[0]!;
  const nexts = indexesOf(lines, (line) => line.startsWith(NEXT_OPEN));
  if (nexts.length !== 1 || nexts[0]! < start) return `${SECURITY_DOCTRINE_PATH} has no single ${NEXT_OPEN.trim()} after SEC-3, so SEC-3's section has no end`;
  const end = nexts[0]!;
  let headEnd = start;
  while (headEnd + 1 < end && lines[headEnd + 1]!.trim() !== '') headEnd++;
  const head = span(lines, start, headEnd);
  const costs = indexesOf(lines, (line, index) => index > start && index < end && line.startsWith(COST_OPEN));
  if (costs.length > 1) return `SEC-3's section in ${SECURITY_DOCTRINE_PATH} has ${costs.length} bullets opening ${COST_OPEN}, not at most one`;
  if (costs.length === 0) return { head, cost: null };
  let costEnd = costs[0]!;
  while (costEnd + 1 < end && /^ {2}\S/.test(lines[costEnd + 1]!)) costEnd++;
  return { head, cost: span(lines, costs[0]!, costEnd) };
}

function indexesOf(lines: readonly string[], test: (line: string, index: number) => boolean): number[] {
  return lines.flatMap((line, index) => (test(line, index) ? [index] : []));
}

function span(lines: readonly string[], first: number, last: number): DoctrineSpan {
  return { text: lines.slice(first, last + 1).join('\n'), startLine: first + 1, endLine: last + 1 };
}
