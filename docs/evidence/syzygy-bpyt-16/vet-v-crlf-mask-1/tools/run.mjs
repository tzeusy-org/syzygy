// V-CRLF-MASK-1 runner. Usage: node run.mjs <path-to-three-surface-poc-core/dist> <out.json>
// Runs the real scanActiveContent over the synthetic corpus in corpus.mjs,
// each case rendered with LF, CRLF and bare-CR terminators (plus the explicit
// mixed / trailing-CR variants), and compares: today's decision, the three
// arms, and two independent oracles written here from the PWB-REQ-006 text
// (CR read as a line terminator; CR read as line content).
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CASES, PAYLOAD, VARIANTS } from './corpus.mjs';

const dist = process.argv[2];
const out = process.argv[3];
const reader = await import(pathToFileURL(`${dist}/git-object-reader.js`).href);
const maskModule = await import(pathToFileURL(`${dist}/markdown-code-context.js`).href);
const { scanActiveContent } = reader;
const { maskMarkdownCodeContexts } = maskModule;

// ---------------------------------------------------------------- rendering
function render(lines, terms) {
  let text = '';
  for (let i = 0; i < lines.length; i += 1) text += lines[i] + terms[i];
  return text;
}

// Every payload position of a case: a payload line in each of the n+1 gaps,
// the payload appended to each of the n lines, and one no-payload control.
function positions(lines, terms, ins) {
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
    l[i] = l[i] + PAYLOAD;
    result.push({ slot: `appended-to-${i + 1}`, lines: l, terms: [...terms] });
  }
  return result;
}

const uniformTerms = (n, term, final) => Array.from({ length: n }, (_, i) => (i === n - 1 && !final ? '' : term));
const toLf = (terms) => terms.map((t) => (t === '' ? '' : '\n'));

// ---------------------------------------------------------------- decisions
function decide(findings) {
  if (findings.length === 0) return 'admit';
  const forms = [...new Set(findings.map((f) => (f.context ? `${f.form}:${f.context}` : f.form)))].sort();
  return `exclude(${forms.join(',')})`;
}
const isExcluded = (d) => d.startsWith('exclude');
const today = (text) => decide(scanActiveContent(text));
const armA = (text) => decide(scanActiveContent(text.replace(/\r\n/g, '\n')));
const armAPlus = (text) => decide(scanActiveContent(text.replace(/\r\n?/g, '\n')));
const armB = (text) => {
  const raw = today(text);
  const norm = armA(text);
  return isExcluded(raw) ? raw : norm;
};
const armBPlus = (text) => {
  const raw = today(text);
  const norm = armAPlus(text);
  return isExcluded(raw) ? raw : norm;
};

// ---------------------------------------------------------------- oracles
// Independent of markdown-code-context.ts: written from the PWB-REQ-006
// "Code-context profile" bullets. `mode` decides what a line is:
//   'term'    — LF, CRLF and bare CR all end a line (CommonMark's line ending);
//   'content' — only LF ends a line; a CR is a character of the line.
function splitLines(text, mode) {
  const out = [];
  const re = mode === 'term' ? /\r\n|\r|\n/g : /\n/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    out.push({ body: text.slice(at, m.index), term: m[0] });
    at = m.index + m[0].length;
  }
  out.push({ body: text.slice(at), term: '' });
  return out;
}

function oracleMask(text, mode) {
  const lines = splitLines(text, mode);
  const blankBody = (s) => ' '.repeat(s.length);
  const keepTerm = (t) => t; // terminators are never context bytes
  const outLines = [];
  let fence; // { char, len, line, pending: [] }
  let span; // { len, line }
  for (let idx = 0; idx < lines.length; idx += 1) {
    const { body, term } = lines[idx];
    if (fence) {
      fence.pending.push({ body, term });
      // closer: 0-3 spaces, the opener char repeated >= opener length, then spaces only
      let i = 0;
      while (i < 3 && body[i] === ' ') i += 1;
      let j = i;
      while (j < body.length && body[j] === fence.char) j += 1;
      const run = j - i;
      let k = j;
      while (k < body.length && body[k] === ' ') k += 1;
      if (run >= fence.len && run >= 3 && k === body.length) {
        for (const p of fence.pending) outLines.push(blankBody(p.body) + keepTerm(p.term));
        fence = undefined;
      }
      continue;
    }
    // opener: 0-3 spaces then >= 3 identical backticks or tildes; the rest is info
    let i = 0;
    while (i < 3 && body[i] === ' ') i += 1;
    const ch = body[i];
    if (ch === '`' || ch === '~') {
      let j = i;
      while (j < body.length && body[j] === ch) j += 1;
      if (j - i >= 3) {
        if (span) return { malformed: 'unclosed-inline-span' };
        const info = body.slice(j);
        if (ch === '`' && info.includes('`')) return { malformed: 'backtick-fence-with-backtick-in-info-string' };
        fence = { char: ch, len: j - i, pending: [{ body, term }] };
        continue;
      }
    }
    // inline spans, continuing across lines
    let rendered = '';
    let c = 0;
    while (c < body.length) {
      if (body[c] !== '`') {
        rendered += span ? ' ' : body[c];
        c += 1;
        continue;
      }
      let e = c;
      while (e < body.length && body[e] === '`') e += 1;
      const len = e - c;
      if (!span) span = { len };
      else if (len === span.len) span = undefined;
      rendered += ' '.repeat(len);
      c = e;
    }
    outLines.push(rendered + keepTerm(term));
  }
  if (fence) return { malformed: 'unclosed-fence' };
  if (span) return { malformed: 'unclosed-inline-span' };
  return { masked: outLines.join('') };
}

let remaskChecks = 0;
function oracle(text, mode) {
  const m = oracleMask(text, mode);
  if (m.malformed) return `exclude(malformed-code-context:${m.malformed})`;
  if (m.masked.length !== text.length) throw new Error('oracle mask changed length');
  // Backticks and tildes take part in no active-content form, so the oracle
  // turns any left outside its contexts into '-': the production mask then
  // finds no context of its own, whatever its line model, and the production
  // active-form scan sees exactly the oracle's mask.
  const neutral = m.masked.replace(/[`~]/g, '-');
  const again = maskMarkdownCodeContexts(neutral);
  if (again.kind !== 'masked' || again.masked !== neutral || again.fences !== 0 || again.spans !== 0) {
    throw new Error(`re-mask not identity for ${JSON.stringify(text)}`);
  }
  remaskChecks += 1;
  return decide(scanActiveContent(neutral));
}

// ---------------------------------------------------------------- run
const rows = [];
function evaluate(caseId, variantId, label, positionsList, lfPositions) {
  positionsList.forEach((p, k) => {
    const lf = lfPositions[k];
    const text = render(p.lines, p.terms);
    const lfText = render(lf.lines, lf.terms);
    rows.push({
      case: caseId,
      variant: variantId,
      slot: p.slot,
      lf: today(lfText),
      today: today(text),
      a: armA(text),
      aPlus: armAPlus(text),
      b: armB(text),
      bPlus: armBPlus(text),
      oTerm: oracle(text, 'term'),
      oContent: oracle(text, 'content'),
      oLf: oracle(lfText, 'term'),
      label,
    });
  });
}

for (const c of CASES) {
  const final = c.final !== false;
  const n = c.lines.length;
  const lfP = positions(c.lines, uniformTerms(n, '\n', final), '\n');
  evaluate(c.id, 'CRLF', c.label, positions(c.lines, uniformTerms(n, '\r\n', final), '\r\n'), lfP);
  evaluate(c.id, 'CR', c.label, positions(c.lines, uniformTerms(n, '\r', final), '\r'), lfP);
}
for (const v of VARIANTS) {
  const base = CASES.find((c) => c.id === v.base);
  if (base.lines.length !== v.terms.length) throw new Error(`variant ${v.id} terms length`);
  const lfP = positions(base.lines, toLf(v.terms), '\n');
  evaluate(v.base, v.id, v.label, positions(base.lines, v.terms, v.ins), lfP);
}

// Oracle validation: on LF text the CR-as-terminator oracle must equal the code.
const oracleDisagreeLf = rows.filter((r) => r.oLf !== r.lf);
const summary = { rows: rows.length, remaskChecks, oracleDisagreeLf: oracleDisagreeLf.length };

function tally(filter, a, b) {
  const sel = rows.filter(filter);
  const count = (pred) => sel.filter(pred).length;
  const exA = (r) => isExcluded(r[a]);
  const exB = (r) => isExcluded(r[b]);
  return {
    denominator: sel.length,
    same: count((r) => exA(r) === exB(r)),
    [`${a}Admits_${b}Excludes`]: count((r) => !exA(r) && exB(r)),
    [`${a}Excludes_${b}Admits`]: count((r) => exA(r) && !exB(r)),
    casesAdmitsExcludes: [...new Set(sel.filter((r) => !exA(r) && exB(r)).map((r) => r.case))],
    casesExcludesAdmits: [...new Set(sel.filter((r) => exA(r) && !exB(r)).map((r) => r.case))],
  };
}
const payloadOnly = (r) => r.slot !== 'control';
const controlOnly = (r) => r.slot === 'control';
const sets = {
  CRLF: (r) => r.variant === 'CRLF',
  CR: (r) => r.variant === 'CR',
  MRT: (r) => r.variant !== 'CRLF' && r.variant !== 'CR',
};
for (const [name, sel] of Object.entries(sets)) {
  summary[name] = {
    payload_today_vs_lf: tally((r) => sel(r) && payloadOnly(r), 'today', 'lf'),
    control_today_vs_lf: tally((r) => sel(r) && controlOnly(r), 'today', 'lf'),
    payload_today_vs_oTerm: tally((r) => sel(r) && payloadOnly(r), 'today', 'oTerm'),
    payload_today_vs_oContent: tally((r) => sel(r) && payloadOnly(r), 'today', 'oContent'),
    control_today_vs_oContent: tally((r) => sel(r) && controlOnly(r), 'today', 'oContent'),
    payload_a_vs_oTerm: tally((r) => sel(r) && payloadOnly(r), 'a', 'oTerm'),
    payload_aPlus_vs_oTerm: tally((r) => sel(r) && payloadOnly(r), 'aPlus', 'oTerm'),
    payload_b_vs_oTerm: tally((r) => sel(r) && payloadOnly(r), 'b', 'oTerm'),
    payload_bPlus_vs_oTerm: tally((r) => sel(r) && payloadOnly(r), 'bPlus', 'oTerm'),
    payload_a_vs_today: tally((r) => sel(r) && payloadOnly(r), 'a', 'today'),
    payload_aPlus_vs_today: tally((r) => sel(r) && payloadOnly(r), 'aPlus', 'today'),
    payload_b_vs_today: tally((r) => sel(r) && payloadOnly(r), 'b', 'today'),
    payload_bPlus_vs_today: tally((r) => sel(r) && payloadOnly(r), 'bPlus', 'today'),
    control_a_vs_today: tally((r) => sel(r) && controlOnly(r), 'a', 'today'),
    control_aPlus_vs_today: tally((r) => sel(r) && controlOnly(r), 'aPlus', 'today'),
    control_b_vs_today: tally((r) => sel(r) && controlOnly(r), 'b', 'today'),
    control_bPlus_vs_today: tally((r) => sel(r) && controlOnly(r), 'bPlus', 'today'),
  };
}
// CR-only renderings decide exactly as CRLF renderings?
const crlfRows = rows.filter((r) => r.variant === 'CRLF');
const crRows = rows.filter((r) => r.variant === 'CR');
summary.crEqualsCrlf = { denominator: crlfRows.length, equal: crlfRows.filter((r, i) => isExcluded(r.today) === isExcluded(crRows[i].today)).length };

// Compact rows: decision strings are indexed into `decisions`.
const FIELDS = ['case', 'variant', 'slot', 'lf', 'today', 'a', 'aPlus', 'b', 'bPlus', 'oTerm', 'oContent'];
const decisions = [];
const code = (d) => {
  let i = decisions.indexOf(d);
  if (i === -1) i = decisions.push(d) - 1;
  return i;
};
const compact = rows.map((r) => FIELDS.map((f, k) => (k < 3 ? r[f] : code(r[f]))));
writeFileSync(out, JSON.stringify({ summary, fields: FIELDS, decisions, rows: compact, oracleDisagreeLf: oracleDisagreeLf.length }));
console.log(JSON.stringify(summary, null, 1));
