// Fence-rule probe for syzygy-bpyt.6.3 (DC-3, the fence-rule finding): which lines of one corpus does each
// production fence recognizer treat as outside a fenced block?
// Usage: node fence-probe.mjs <built clone> <out.json>   (the clone is built with `npm run build:poc`)
//
// Method. A case is a list of lines (a fence opener, body lines, closers and near-misses). For every position k
// (k = 0..n) a probe line `## PROBE [p](probe.md)` is inserted as line k, the case's other lines keeping their order, and
// each recognizer reports whether that line is visible, that is outside every fence it recognizes:
//   profile     maskMarkdownCodeContexts (markdown-code-context.ts): the probe line is unchanged in the mask.
//               'M' when the mask of the whole text is malformed (an unclosed fence or span, or a backtick fence
//               whose info string holds a backtick): the pipeline excludes such a source whole, whatever k is.
//   links       indexLinkTargets (project-shape-manifest.ts, stripFences): probe.md is among the targets.
//   extraction  extractClass('project-account-section', 'architecture.md', ...) (project-shape-extraction.ts,
//               parseDoc): the one level-2 heading is found; 'H' is the grammar's missing-heading failure.
//   consent     outsideFences (polaris-generation-consent package-reader.ts): the probe line is not blanked. The
//               function is private, so its text is cut from the built module by name and brace matching and run
//               as is; the digest of the cut text is recorded.
//   renderer    renderPolarisMarkdown (apps/three-surface-poc polaris-markdown.ts): the probe is rendered as a
//               heading (`<h4>PROBE`), not as code.
// A vector is the string of V (visible) / H (hidden) / M (malformed profile) over k = 0..n. A recognizer is compared
// with the profile only on a case whose whole text the profile reads as well formed.
//
// A second probe measures what the gate decides: the same positions with an active-content payload instead of the
// heading, through scanActiveContent (the profile plus the HTML/SVG/script scan). 'X' is excluded (a finding, the
// source is withheld), 'A' is admitted.
//
// Every case is a function of the recognizers' code only: no repository body is read, no file outside the clone.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: fence-probe.mjs <built clone> <out.json>');
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const { renderPolarisMarkdown } = await load('apps/three-surface-poc/dist/polaris-markdown.js');

const B = '```';
const T = '~~~';
const sha = (v) => createHash('sha256').update(v).digest('hex');

// outsideFences, cut from the built consent module.
const consentPath = 'packages/polaris-generation-consent/dist/package-reader.js';
const consentText = readFileSync(join(root, consentPath), 'utf8');
const cut = (() => {
  const start = consentText.indexOf('function outsideFences(text)');
  if (start < 0 || consentText.indexOf('function outsideFences(text)', start + 1) >= 0) throw new Error('outsideFences: not exactly one definition');
  let depth = 0;
  for (let i = consentText.indexOf('{', start); i < consentText.length; i += 1) {
    if (consentText[i] === '{') depth += 1;
    if (consentText[i] === '}' && --depth === 0) return consentText.slice(start, i + 1);
  }
  throw new Error('outsideFences: no closing brace');
})();
const outsideFences = new Function(`${cut}; return outsideFences;`)();

const PROBE = '## PROBE [p](probe.md)';
const PAYLOAD = '<script>x</script>';
const gate = (text) => (core.scanActiveContent(text).length > 0 ? 'X' : 'A');

// Every line, the last included, ends with the line terminator, as in a file.
const joined = (lines, eol) => lines.map((line) => line + eol).join('');

// Is line k of the text the probe, unchanged (a trailing CR from a CRLF file aside)?
const atLine = (text, k) => (text.split('\n')[k] ?? '').replace(/\r$/, '') === PROBE;

const recognizers = {
  profile: (text, k) => {
    const mask = core.maskMarkdownCodeContexts(text);
    if (mask.kind === 'malformed') return 'M';
    return atLine(mask.masked, k) ? 'V' : 'H';
  },
  links: (text) => (core.indexLinkTargets(text).includes('probe.md') ? 'V' : 'H'),
  extraction: (text) => {
    const result = core.extractClass('project-account-section', 'architecture.md', text);
    return result.kind === 'items' && result.items.some((item) => (item.statement ?? '').includes('PROBE')) ? 'V' : 'H';
  },
  consent: (text, k) => (atLine(outsideFences(text), k) ? 'V' : 'H'),
  renderer: (text) => (renderPolarisMarkdown(text).includes('<h4>PROBE') ? 'V' : 'H'),
};

// [id, what it tests, lines]. Every case is run with LF and with CRLF line terminators, one after every line.
const CASES = [
  ['backtick-col0', 'three backticks at column 0, closed by the same', [B, 'x', B]],
  ['backtick-indent1', 'opener and closer indented one space', [` ${B}`, 'x', ` ${B}`]],
  ['backtick-indent2', 'opener and closer indented two spaces', [`  ${B}`, 'x', `  ${B}`]],
  ['backtick-indent3', 'opener and closer indented three spaces', [`   ${B}`, 'x', `   ${B}`]],
  ['backtick-indent4', 'four spaces: indented code, not a fence', [`    ${B}`, 'x', `    ${B}`]],
  ['backtick-tab', 'a tab before the opener', [`\t${B}`, 'x', `\t${B}`]],
  ['tilde-col0', 'three tildes at column 0', [T, 'x', T]],
  ['tilde-indent3', 'tildes indented three spaces', [`   ${T}`, 'x', `   ${T}`]],
  ['tilde-indent4', 'tildes indented four spaces', [`    ${T}`, 'x', `    ${T}`]],
  ['opener-four-closer-three', 'a three-backtick line inside a four-backtick fence', ['````', 'x', B, 'y', '````']],
  ['closer-longer', 'a closer longer than the opener', [B, 'x', '````']],
  ['closer-indent1', 'a closer indented one space under a column-0 opener', [B, 'x', ` ${B}`, 'y']],
  ['closer-indent3', 'a closer indented three spaces under a column-0 opener', [B, 'x', `   ${B}`, 'y']],
  ['closer-indent4', 'a closer indented four spaces (not a closer)', [B, 'x', `    ${B}`, 'y', B]],
  ['closer-trailing-space', 'a closer with a trailing space', [B, 'x', `${B} `]],
  ['closer-trailing-tab', 'a closer with a trailing tab, nothing after', [B, 'x', `${B}\t`]],
  ['closer-trailing-tab-then-closer', 'a closer with a trailing tab, then a plain closer', [B, 'x', `${B}\t`, 'y', B]],
  ['closer-with-info', 'a closing-shaped line with an info string', [B, 'x', `${B}js`, 'y', B]],
  ['closer-longer-with-info', 'a longer closing-shaped line with an info string', [B, '````js', 'y', B]],
  ['closer-with-text', 'a closing-shaped line followed by text', [B, 'x', `${B} text`, 'y', B]],
  ['closer-other-char', 'tildes inside a backtick fence', [B, 'x', T, 'y', B]],
  ['tilde-fence-backtick-line', 'backticks inside a tilde fence', [T, 'x', B, 'y', T]],
  ['tilde-opener-four-closer-three', 'a three-tilde line inside a four-tilde fence', ['~~~~', 'x', T, 'y', '~~~~']],
  ['info-string', 'a backtick opener with an info word', [`${B}js`, 'x', B]],
  ['info-string-space', 'a backtick opener, a space, an info word', [`${B} js`, 'x', B]],
  ['backtick-info-with-backtick', 'a backtick opener whose info string holds a backtick', [`${B}a\`b`, 'x', B]],
  ['tilde-info-with-backtick', 'a tilde opener whose info string holds a backtick', [`${T}a\`b`, 'x', T]],
  ['unclosed', 'an opener with no closer', [B, 'x']],
  ['empty-fence', 'an opener closed by the next line', [B, B]],
  ['two-backticks', 'two backticks are not a fence', ['``', 'x', '``']],
  ['blockquote', 'a fence inside a block quote', [`> ${B}`, '> x', `> ${B}`]],
  ['list-item', 'a fence inside a list item', [`- ${B}`, '  x', `  ${B}`]],
  ['two-fences', 'two closed fences in a row', [B, 'x', B, T, 'y', T]],
];

const cases = [];
for (const [caseId, what, lines] of CASES) for (const eol of ['\n', '\r\n']) {
  const id = eol === '\n' ? caseId : `${caseId}@crlf`;
  const vectors = Object.fromEntries(Object.keys(recognizers).map((name) => [name, '']));
  let activeContent = '';
  for (let k = 0; k <= lines.length; k += 1) {
    activeContent += gate(joined([...lines.slice(0, k), PAYLOAD, ...lines.slice(k)], eol));
    const text = joined([...lines.slice(0, k), PROBE, ...lines.slice(k)], eol);
    for (const [name, probe] of Object.entries(recognizers)) vectors[name] += probe(text, k);
  }
  // the case without a probe: does the profile read it as well formed (so that the pipeline reads the source)?
  const whole = core.maskMarkdownCodeContexts(joined(lines, eol));
  const wellFormed = whole.kind === 'masked';
  // Compared with the profile only where the profile reads the text: a malformed text is excluded whole.
  const disagreesWithProfile = wellFormed
    ? Object.fromEntries(Object.keys(recognizers).filter((n) => n !== 'profile' && vectors[n] !== vectors.profile).map((n) => [n, vectors[n]]))
    : {};
  cases.push({
    id, caseId, what, eol: eol === '\n' ? 'LF' : 'CRLF', lines, vectors, activeContent,
    profileOnTheWholeCase: whole.kind === 'malformed' ? `malformed:${whole.reason}` : 'well-formed',
    profileFences: whole.kind === 'masked' ? whole.fences : null,
    profileInlineSpans: whole.kind === 'masked' ? whole.spans : null,
    disagreeWithProfile: disagreesWithProfile,
  });
}

// Inline code spans on one line. Only two recognizers have a rule for them: the profile and the manifest's
// stripFences (links). Each case holds one link, `[p](probe.md)`; the question is whether the link is outside a span.
const LINK = '[p](probe.md)';
const INLINE = [
  ['no-span', `see ${LINK}`],
  ['inside-span', `\`${LINK}\``],
  ['inside-double-span', `\`\`${LINK}\`\``],
  ['unclosed-span', `\` ${LINK}`],
  ['link-between-spans', `\`a\` ${LINK} \`b\``],
  ['double-span-with-inner-backtick-before-link', `\`\` a \` b \`\` ${LINK}`],
  ['double-span-with-inner-backtick-around-link', `\`\`${LINK} \` \`\``],
  ['backslash-before-delimiters', `\\\`${LINK}\\\``],
];
const inlineCases = INLINE.map(([id, line]) => {
  const mask = core.maskMarkdownCodeContexts(line);
  const profile = mask.kind === 'malformed' ? 'M' : mask.masked.includes(LINK) ? 'V' : 'H';
  const links = core.indexLinkTargets(line).includes('probe.md') ? 'V' : 'H';
  return { id, line, profile, links, agree: profile === 'M' ? null : profile === links };
});

const names = Object.keys(recognizers).filter((n) => n !== 'profile');
// The fence-rule comparison is made on the LF cases; CRLF is a separate comparison of each recognizer with itself.
const lfCases = cases.filter((c) => c.eol === 'LF');
const wellFormedCases = lfCases.filter((c) => c.profileOnTheWholeCase === 'well-formed');
// A case in which the profile's inline-code-span rule fires is a difference of the span rule, not of fence recognition.
const fenceOnly = wellFormedCases.filter((c) => c.profileInlineSpans === 0);
const spanInPlay = wellFormedCases.filter((c) => c.profileInlineSpans > 0);
const lf = new Map(lfCases.map((c) => [c.caseId, c]));
const summary = {
  cases: { total: cases.length, lf: lfCases.length, lfWellFormedUnderTheProfile: wellFormedCases.length, ofThoseWithNoInlineSpan: fenceOnly.length, ofThoseWithAnInlineSpan: spanInPlay.length, lfMalformedUnderTheProfile: lfCases.length - wellFormedCases.length },
  lfMalformedUnderTheProfile: Object.fromEntries(lfCases.filter((c) => c.profileOnTheWholeCase !== 'well-formed').map((c) => [c.id, c.profileOnTheWholeCase])),
  crlfWholeCaseUnderTheProfile: Object.fromEntries(cases.filter((c) => c.eol === 'CRLF').map((c) => [c.caseId, c.profileOnTheWholeCase])),
  fenceRuleDisagreementsWithTheProfile: Object.fromEntries(names.map((n) => [n, fenceOnly.filter((c) => n in c.disagreeWithProfile).map((c) => c.id)])),
  inlineSpanCasesWhereTheRecognizerDisagrees: Object.fromEntries(names.map((n) => [n, spanInPlay.filter((c) => n in c.disagreeWithProfile).map((c) => c.id)])),
  // LF against CRLF, per recognizer: the case ids whose vector differs between the two line terminators
  // What the gate decides, LF against CRLF, position by position: 'crlfAdmitsWhatLfExcludes' is the fail-open direction.
  activeContentGate: (() => {
    const admits = [], excludes = [];
    for (const c of cases.filter((x) => x.eol === 'CRLF')) {
      const l = lf.get(c.caseId).activeContent;
      for (let k = 0; k < l.length; k += 1) {
        if (l[k] === 'X' && c.activeContent[k] === 'A') admits.push(`${c.caseId}@${k}`);
        if (l[k] === 'A' && c.activeContent[k] === 'X') excludes.push(`${c.caseId}@${k}`);
      }
    }
    return { positionsCompared: cases.filter((x) => x.eol === 'CRLF').reduce((n, c) => n + c.activeContent.length, 0), crlfAdmitsWhatLfExcludes: admits, crlfExcludesWhatLfAdmits: excludes };
  })(),
  crlfDiffersFromLf: Object.fromEntries(Object.keys(recognizers).map((n) => [n, cases.filter((c) => c.eol === 'CRLF' && c.vectors[n] !== lf.get(c.caseId).vectors[n]).map((c) => c.caseId)])),
};

const result = {
  probeSha256: sha(readFileSync(new URL(import.meta.url), 'utf8')),
  cases: cases.length,
  prefixesPerRecognizer: cases.reduce((n, c) => n + c.lines.length + 1, 0),
  consentFunction: { module: consentPath, moduleSha256: sha(consentText), cutText: cut, cutSha256: sha(cut) },
  recognizers: Object.keys(recognizers),
  summary,
  cases,
  inlineSpanCases: inlineCases,
};
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`cases ${cases.length}`);
console.log(JSON.stringify(summary.cases));
console.log('inline: ' + inlineCases.map((c) => `${c.id}=${c.profile}/${c.links}`).join(' '));
for (const n of names) console.log(`${n}: fence-rule disagreements ${summary.fenceRuleDisagreementsWithTheProfile[n].length} of ${fenceOnly.length}; span cases ${summary.inlineSpanCasesWhereTheRecognizerDisagrees[n].length} of ${spanInPlay.length}`);
for (const n of Object.keys(recognizers)) console.log(`${n}: CRLF differs from LF in ${summary.crlfDiffersFromLf[n].length} of ${lf.size} cases`);
console.log('gate: ' + JSON.stringify(summary.activeContentGate));
