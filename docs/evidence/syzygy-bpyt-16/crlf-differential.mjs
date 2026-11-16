// Differential for syzygy-bpyt.16: the code-context mask ends a line at CRLF, CR and LF.
// Usage: node crlf-differential.mjs <base dist> <head dist> <out.json>
//   <dist> is packages/three-surface-poc-core/dist of a built checkout: BASE the parent of the fix, HEAD the fix.
//
// Corpora (every text is synthetic; nothing is read from any observed repository):
//   vet     the 36 cases and 15 variants of the V-CRLF-MASK-1 vet (vet-v-crlf-mask-1/tools/corpus.mjs), rendered exactly as
//           the vet's run.mjs renders them (CRLF, CR, and the explicit mixed / trailing-CR variants), 904 rows.
//   fence   the 33 cases of docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs (the CASES literal is cut from that file by name and
//           its digest is recorded), at every payload slot and every probe slot, in seven renderings, with and without a final
//           terminator.
//   n2      the two fail-open shapes of the #533 round-1/2 finding N2, and four more built from them, in the same renderings.
//
// For every text T, with L its LF form (the same lines, every terminator replaced by LF):
//   C1  LF unchanged     scanActiveContent(L) and maskMarkdownCodeContexts(L) are deep-equal at BASE and HEAD. It runs over the distinct
//                        LF forms of the rows above and over the separator slice below: LF texts whose lines hold U+2028, U+2029,
//                        U+0085, VT and FF at fence and span positions (line content under the ruling; a split widened to them, as
//                        a maintainer completing the line-terminator set would write it, changes those texts' decisions).
//   C2  rendering equals LF   at HEAD, T decides exactly as L: the same multiset of findings (form, context, and the line of a
//                        malformed finding), and an equal mask (kind, fences, spans, reason, line; the masked text equal once
//                        every terminator is read as LF).
//   C3  mask invariants  at HEAD, the masked text has T's length, every terminator byte at its offset, and every other byte
//                        either T's own or a space.
//   C4  CRLF positions   at HEAD, a text with CRLF after every line has findings deep-equal to L's, line and column included
//                        (positionOf counts LF only, and a CRLF text has as many LFs as its LF form).
// Any failure of C1..C4 is listed and the tool exits 1. The delta is the other output: for each text the tool compares BASE with
// HEAD on T itself and tallies refuses (BASE admits, HEAD excludes), accepts (BASE excludes, HEAD admits), the same decision
// with another finding set, and unchanged, per corpus, rendering and slot class.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [baseDist, headDist, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: crlf-differential.mjs <base dist> <head dist> <out.json>');

const loadDist = async (dist) => {
  const reader = await import(pathToFileURL(join(dist, 'git-object-reader.js')).href);
  const mask = await import(pathToFileURL(join(dist, 'markdown-code-context.js')).href);
  return { scan: reader.scanActiveContent, mask: mask.maskMarkdownCodeContexts };
};
const base = await loadDist(baseDist);
const head = await loadDist(headDist);

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const PAYLOAD = '<script>x</script>';
const PROBE = '## PROBE [p](probe.md)';
const B = '```';
const T = '~~~';
const LF = '\n';
const CRLF = '\r\n';
const CR = '\r';

// ------------------------------------------------------------------ the corpora
const vetPath = join(here, 'vet-v-crlf-mask-1', 'tools', 'corpus.mjs');
const { CASES: VET_CASES, VARIANTS: VET_VARIANTS } = await import(pathToFileURL(vetPath).href);

const fencePath = join(here, '..', 'syzygy-bpyt-6-3', 'fence-probe.mjs');
const fenceSource = readFileSync(fencePath, 'utf8');
const FENCE_CASES = (() => {
  const start = fenceSource.indexOf('const CASES = [');
  const end = fenceSource.indexOf('\n];', start);
  if (start < 0 || end < 0 || fenceSource.indexOf('const CASES = [', start + 1) >= 0) throw new Error('fence-probe CASES: not exactly one literal');
  const literal = fenceSource.slice(start + 'const CASES = '.length, end + 2);
  return new Function('B', 'T', `return ${literal};`)(B, T).map(([id, what, lines]) => ({ id, what, lines }));
})();

// The shapes of finding N2 of the #533 reviews (the fail-open class is wider than three shapes), and four built from them.
const N2_CASES = [
  { id: 'n2-tilde-backtick-tilde-script-tilde-backtick-tilde', what: 'N2 shape 1: two tilde fences each showing a lone backtick-fence line, a script element between them', lines: [T, B, T, PAYLOAD, T, B, T] },
  { id: 'n2-backtick-script-closer-with-text', what: 'N2 shape 2: backtick fence, a script element, a closing-shaped line followed by text', lines: [B, PAYLOAD, `${B} text`] },
  { id: 'n2-tilde-script-closer-with-text', what: 'shape 2 with tildes', lines: [T, PAYLOAD, `${T} text`] },
  { id: 'n2-closer-with-text-then-closer', what: 'shape 2 followed by a real closer', lines: [B, PAYLOAD, `${B} text`, B, 'after'] },
  { id: 'n2-two-tilde-fences-one-backtick-line-each', what: 'shape 1 with the script element inside the second fence', lines: [T, B, T, 'mid', T, B, PAYLOAD, T] },
  { id: 'n2-closer-trailing-tab-script', what: 'a closer with a trailing tab around a script element', lines: [B, 'x', `${B}\t`, PAYLOAD, B, 'y', B] },
];

// ------------------------------------------------------------------ renderings
// A rendering gives the terminator after line i of n lines. `final` false leaves the last line without one.
const RENDERINGS = {
  lf: () => LF,
  crlf: () => CRLF,
  cr: () => CR,
  firstCrlf: (i) => (i === 0 ? CRLF : LF),
  lastCrlf: (i, n) => (i === n - 1 ? CRLF : LF),
  firstCr: (i) => (i === 0 ? CR : LF),
  cycle: (i) => [LF, CRLF, CR][i % 3],
};
const terminatorsOf = (rendering, n, final) => Array.from({ length: n }, (_, i) => (i === n - 1 && !final ? '' : RENDERINGS[rendering](i, n)));
const render = (lines, terms) => lines.map((line, i) => line + terms[i]).join('');
const toLf = (terms) => terms.map((t) => (t === '' ? '' : LF));

// Every payload and probe position of a case: the control (no insertion), an inserted line in each of the n+1 gaps, and the
// payload / probe appended to each of the n lines.
function placements(lines) {
  const n = lines.length;
  const result = [{ slot: 'control', kind: 'control', lines }];
  for (const [kind, text] of [['payload', PAYLOAD], ['probe', PROBE]]) {
    for (let s = 0; s <= n; s += 1) result.push({ slot: `${kind}-line-before-${s + 1}`, kind, lines: [...lines.slice(0, s), text, ...lines.slice(s)] });
    for (let i = 0; i < n; i += 1) result.push({ slot: `${kind}-appended-to-${i + 1}`, kind, lines: lines.map((line, j) => (j === i ? line + text : line)) });
  }
  return result;
}

// ------------------------------------------------------------------ the rows
// A row is one text with its LF form. `terms` are the terminators of the lines of the rendering.
const rows = [];
const addRow = (row) => rows.push(row);

// vet corpus, positions exactly as the vet's run.mjs makes them (payload only).
{
  const vetPositions = (lines, terms, ins) => {
    const n = lines.length;
    const result = [{ slot: 'control', lines, terms }];
    for (let s = 0; s <= n; s += 1) {
      const l = [...lines];
      const t = [...terms];
      if (s === n) {
        const lastTerm = t[n - 1];
        if (lastTerm === '') t[n - 1] = ins;
        l.push(PAYLOAD);
        t.push(lastTerm);
      } else {
        l.splice(s, 0, PAYLOAD);
        t.splice(s, 0, ins);
      }
      result.push({ slot: `line-before-${s + 1}`, lines: l, terms: t });
    }
    for (let i = 0; i < n; i += 1) {
      const l = [...lines];
      l[i] += PAYLOAD;
      result.push({ slot: `appended-to-${i + 1}`, lines: l, terms: [...terms] });
    }
    return result;
  };
  const uniform = (n, term, final) => Array.from({ length: n }, (_, i) => (i === n - 1 && !final ? '' : term));
  const push = (corpus, caseId, variant, label, ps) => {
    for (const p of ps) addRow({ corpus, caseId, variant, label, slot: p.slot, text: render(p.lines, p.terms), lfText: render(p.lines, toLf(p.terms)), uniform: variant === 'CRLF' ? 'crlf' : variant === 'CR' ? 'cr' : undefined });
  };
  for (const c of VET_CASES) {
    const final = c.final !== false;
    const n = c.lines.length;
    push('vet', c.id, 'CRLF', c.label, vetPositions(c.lines, uniform(n, CRLF, final), CRLF));
    push('vet', c.id, 'CR', c.label, vetPositions(c.lines, uniform(n, CR, final), CR));
  }
  for (const v of VET_VARIANTS) {
    const baseCase = VET_CASES.find((c) => c.id === v.base);
    if (baseCase.lines.length !== v.terms.length) throw new Error(`variant ${v.id}: terms length`);
    push('vet', v.base, v.id, v.label, vetPositions(baseCase.lines, v.terms, v.ins));
  }
}
const vetRowCount = rows.length;

for (const [corpus, cases] of [['fence', FENCE_CASES], ['n2', N2_CASES]]) {
  for (const c of cases) {
    for (const p of placements(c.lines)) {
      for (const rendering of Object.keys(RENDERINGS)) {
        for (const final of [true, false]) {
          const n = p.lines.length;
          const terms = terminatorsOf(rendering, n, final);
          addRow({
            corpus,
            caseId: c.id,
            variant: `${rendering}${final ? '' : '-nofinal'}`,
            label: c.what,
            slot: p.slot,
            text: render(p.lines, terms),
            lfText: render(p.lines, toLf(terms)),
            uniform: rendering === 'crlf' || rendering === 'cr' ? rendering : undefined,
          });
        }
      }
    }
  }
}

// ------------------------------------------------------------------ measurement
const findingKey = (f) => `${f.form}${f.context ? `:${f.context}` : ''}${f.form === 'malformed-code-context' ? `@${f.line}` : ''}`;
const findingSet = (findings) => findings.map(findingKey).sort();
const excluded = (findings) => findings.length > 0;

// The mask with every terminator read as LF, so a CRLF / CR text's mask compares with its LF form's.
const maskSkeleton = (m) => (m.kind === 'masked' ? { kind: m.kind, fences: m.fences, spans: m.spans, masked: m.masked.replace(/\r\n|\r/g, LF) } : { kind: m.kind, reason: m.reason, line: m.line });

const memo = new Map();
const measure = (which, text) => {
  const key = `${which}\u0000${text}`;
  let hit = memo.get(key);
  if (hit === undefined) {
    const impl = which === 'base' ? base : head;
    hit = { findings: impl.scan(text), mask: impl.mask(text) };
    memo.set(key, hit);
  }
  return hit;
};

const failures = [];
const fail = (check, row, detail) => failures.push({ check, corpus: row.corpus, caseId: row.caseId, variant: row.variant, slot: row.slot, detail });

// C1 over the distinct LF forms.
const lfTexts = [...new Set(rows.map((r) => r.lfText))];
for (const text of lfTexts) {
  const b = measure('base', text);
  const h = measure('head', text);
  if (!isDeepStrictEqual(b.findings, h.findings) || !isDeepStrictEqual(b.mask, h.mask)) {
    fail('C1', { corpus: 'lf', caseId: '', variant: '', slot: '' }, { text, base: b, head: h });
  }
}

// The separator slice of C1: U+2028, U+2029, U+0085, VT (U+000B) and FF (U+000C) are line content, not line ends (the ruling leaves
// every LF reading as it was).
// Each case of the three corpora (the vet's, the fence probe's, the N2 shapes) is joined, with and without a script element as a last
// line, by the separator in place of every LF at once, with the separator in place of one LF, and with the separator appended to or
// prepended to one line. No text holds a CR.
const SEPARATORS = ['\u2028', '\u2029', '\u0085', '\u000b', '\u000c'];
const separatorSlice = (() => {
  const texts = new Set();
  for (const lines of [...VET_CASES, ...FENCE_CASES, ...N2_CASES].map((c) => c.lines)) {
    for (const body of [lines, [...lines, PAYLOAD]]) {
      for (const sep of SEPARATORS) {
        texts.add(body.join(sep));
        for (let i = 0; i < body.length; i += 1) {
          texts.add(body.map((line, j) => (j === i ? line + sep : line)).join(LF));
          texts.add(body.map((line, j) => (j === i ? sep + line : line)).join(LF));
          if (i > 0) texts.add(body.slice(0, i).join(LF) + sep + body.slice(i).join(LF));
        }
      }
    }
  }
  const list = [...texts];
  if (list.some((t) => t.includes(CR))) throw new Error('the separator slice holds a CR');
  if (!SEPARATORS.every((sep) => list.some((t) => t.includes(sep)))) throw new Error('the separator slice misses a separator');
  return list;
})();
for (const text of separatorSlice) {
  const b = measure('base', text);
  const h = measure('head', text);
  if (!isDeepStrictEqual(b.findings, h.findings) || !isDeepStrictEqual(b.mask, h.mask)) {
    fail('C1', { corpus: 'lf-separators', caseId: '', variant: '', slot: '' }, { text, base: b, head: h });
  }
}

const tally = () => ({ rows: 0, refuses: 0, accepts: 0, sameDecisionOtherFindings: 0, unchanged: 0 });
const groups = new Map();
const groupOf = (name) => {
  if (!groups.has(name)) groups.set(name, tally());
  return groups.get(name);
};
const signature = (findings) => (findings.length === 0 ? 'admit' : `exclude[${[...new Set(findings.map((f) => `${f.form}${f.context ? `:${f.context}` : ''}`))].sort().join(', ')}]`);
const transitions = new Map();
const byCase = new Map();
const vetChanged = [];

let c2 = 0;
let c3 = 0;
let c4 = 0;
let c4Differ = 0;
let positionDiffers = 0;
for (const row of rows) {
  const { text, lfText } = row;
  const h = measure('head', text);
  const hl = measure('head', lfText);
  const b = measure('base', text);

  // C2
  c2 += 1;
  if (!isDeepStrictEqual(findingSet(h.findings), findingSet(hl.findings))) fail('C2', row, { kind: 'findings', head: findingSet(h.findings), lf: findingSet(hl.findings) });
  if (!isDeepStrictEqual(maskSkeleton(h.mask), maskSkeleton(hl.mask))) fail('C2', row, { kind: 'mask', head: maskSkeleton(h.mask), lf: maskSkeleton(hl.mask) });

  // C3
  if (h.mask.kind === 'masked') {
    c3 += 1;
    const masked = h.mask.masked;
    if (masked.length !== text.length) fail('C3', row, { kind: 'length', text: text.length, masked: masked.length });
    else {
      for (let i = 0; i < text.length; i += 1) {
        const original = text[i];
        const got = masked[i];
        const isTerminator = original === LF || original === CR;
        if (isTerminator ? got !== original : got !== original && got !== ' ') {
          fail('C3', row, { kind: 'byte', offset: i, original, got });
          break;
        }
      }
    }
  }

  // C4
  if (row.uniform === 'crlf') {
    c4 += 1;
    if (!isDeepStrictEqual(h.findings, hl.findings)) c4Differ += 1, fail('C4', row, { head: h.findings, lf: hl.findings });
  } else if (text !== lfText && !isDeepStrictEqual(h.findings, hl.findings)) {
    positionDiffers += 1;
  }

  // delta: BASE against HEAD on the text itself.
  const g = [`${row.corpus}/${row.variant}/${row.slot === 'control' ? 'control' : 'placed'}`, `${row.corpus}/all`];
  const change = excluded(b.findings) === excluded(h.findings) ? (isDeepStrictEqual(findingSet(b.findings), findingSet(h.findings)) ? 'unchanged' : 'sameDecisionOtherFindings') : excluded(h.findings) ? 'refuses' : 'accepts';
  for (const name of g) {
    const t = groupOf(name);
    t.rows += 1;
    t[change] += 1;
  }
  const caseKey = `${row.corpus}/${row.caseId}`;
  if (!byCase.has(caseKey)) byCase.set(caseKey, tally());
  const ct = byCase.get(caseKey);
  ct.rows += 1;
  ct[change] += 1;
  if (change !== 'unchanged') {
    const key = `${change}: ${signature(b.findings)} -> ${signature(h.findings)}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    if (row.corpus === 'vet' && (change === 'refuses' || change === 'accepts')) vetChanged.push([row.caseId, row.variant, row.slot, change, signature(b.findings), signature(h.findings)]);
  }
}

// The vet's own selection: CRLF and CR uniform, and the explicit variants, payload rows apart from controls.
const vetSelection = (variantTest, control) => {
  const t = tally();
  for (const row of rows.slice(0, vetRowCount)) {
    if (!variantTest(row.variant) || (row.slot === 'control') !== control) continue;
    const b = measure('base', row.text);
    const h = measure('head', row.text);
    t.rows += 1;
    if (excluded(b.findings) === excluded(h.findings)) t.unchanged += 1;
    else if (excluded(h.findings)) t.refuses += 1;
    else t.accepts += 1;
  }
  return t;
};
const vetSummary = {
  CRLF: { payload: vetSelection((v) => v === 'CRLF', false), control: vetSelection((v) => v === 'CRLF', true) },
  CR: { payload: vetSelection((v) => v === 'CR', false), control: vetSelection((v) => v === 'CR', true) },
  variants: { payload: vetSelection((v) => v !== 'CRLF' && v !== 'CR', false), control: vetSelection((v) => v !== 'CRLF' && v !== 'CR', true) },
};

const byCheck = (check) => failures.filter((f) => f.check === check).length;
const result = {
  tool: 'docs/evidence/syzygy-bpyt-16/crlf-differential.mjs',
  baseDistModule: sha(readFileSync(join(baseDist, 'markdown-code-context.js'))),
  headDistModule: sha(readFileSync(join(headDist, 'markdown-code-context.js'))),
  corpusFiles: {
    vetCorpus: { path: 'docs/evidence/syzygy-bpyt-16/vet-v-crlf-mask-1/tools/corpus.mjs', sha256: sha(readFileSync(vetPath)) },
    fenceProbe: { path: 'docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs', sha256: sha(fenceSource) },
  },
  population: {
    texts: rows.length,
    distinctTexts: new Set(rows.map((r) => r.text)).size,
    distinctLfForms: lfTexts.length,
    vet: { cases: VET_CASES.length, variants: VET_VARIANTS.length, rows: vetRowCount },
    fence: { cases: FENCE_CASES.length },
    n2: { cases: N2_CASES.length },
    renderings: Object.keys(RENDERINGS),
    separatorSlice: { separators: SEPARATORS.map((sep) => `U+${sep.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`), texts: separatorSlice.length, holdingEach: Object.fromEntries(SEPARATORS.map((sep) => [`U+${sep.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`, separatorSlice.filter((t) => t.includes(sep)).length])), holdingNone: separatorSlice.filter((t) => !SEPARATORS.some((sep) => t.includes(sep))).length, excludedByHead: separatorSlice.filter((t) => excluded(measure('head', t).findings)).length },
  },
  checks: {
    C1_lfUnchanged: { texts: lfTexts.length, separatorSliceTexts: separatorSlice.length, failures: byCheck('C1') },
    C2_renderingEqualsLf: { texts: c2, failures: byCheck('C2') },
    C3_maskInvariants: { maskedTexts: c3, failures: byCheck('C3') },
    C4_crlfFindingsEqualLfIncludingPositions: { texts: c4, failures: byCheck('C4') },
  },
  positionOf: { note: 'positionOf counts LF only (unchanged by the fix): rows whose non-malformed findings sit at another line or column than the LF form, mixed and bare-CR renderings', rows: positionDiffers },
  vetSelection: vetSummary,
  delta: Object.fromEntries([...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
  deltaByCase: Object.fromEntries([...byCase.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
  transitions: Object.fromEntries([...transitions.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
  vetChangedDecisions: { fields: ['case', 'variant', 'slot', 'change', 'base', 'head'], rows: vetChanged },
  failingChecks: [...new Set(failures.map((f) => f.check))].sort(),
  failureCount: failures.length,
  failures: failures.slice(0, 50),
};
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ population: result.population, checks: result.checks, positionOf: result.positionOf, vetSelection: result.vetSelection }, null, 1));
if (failures.length > 0) {
  console.error(`${failures.length} failure(s); first: ${JSON.stringify(failures[0]).slice(0, 600)}`);
  process.exit(1);
}
