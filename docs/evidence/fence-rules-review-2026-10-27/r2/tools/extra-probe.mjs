// Reviewer's extra probe for PR 533 (R-GP-IMPL-FENCE-RULES-1). Usage: node extra-probe.mjs <built clone> <out.json>
// Reads only the built modules of the clone; every input is a synthetic fixture written here.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const { renderPolarisMarkdown } = await load('apps/three-surface-poc/dist/polaris-markdown.js');
const consentText = readFileSync(join(root, 'packages/polaris-generation-consent/dist/package-reader.js'), 'utf8');
const cut = (() => {
  const start = consentText.indexOf('function outsideFences(text)');
  let depth = 0;
  for (let i = consentText.indexOf('{', start); i < consentText.length; i += 1) {
    if (consentText[i] === '{') depth += 1;
    if (consentText[i] === '}' && --depth === 0) return consentText.slice(start, i + 1);
  }
  throw new Error('no cut');
})();
const outsideFences = new Function(`${cut}; return outsideFences;`)();

const B = '```', T = '~~~', S = '<script>x</script>';
const joined = (lines, eol) => lines.map((l) => l + eol).join('');
const gate = (text) => core.scanActiveContent(text).map((f) => f.form);
const result = {};

// G1 beyond the corpus: a text the profile reads as well formed in LF, where CRLF hides a script that LF sees.
// Tilde fences hide backtick runs in LF; in CRLF the tildes are text and the backtick runs pair as an inline span.
{
  const lines = [T, B, T, S, T, B, T];
  result.g1WellFormedLfFailOpen = {
    lines,
    lfMask: core.maskMarkdownCodeContexts(joined(lines, '\n')).kind,
    lf: gate(joined(lines, '\n')),
    crlf: gate(joined(lines, '\r\n')),
  };
  const lines2 = [B, 'x', '```` ', S, B]; // LF: closer-longer closes; script visible; then an unclosed opener -> malformed
  result.g1Extra2 = { lines: lines2, lf: gate(joined(lines2, '\n')), crlf: gate(joined(lines2, '\r\n')) };
  const lines3 = [B, 'x', '``` text', S, B]; // LF unclosed? closer-with-text is no closer: one fence, closes at last B: hides S
  result.g1Extra3 = { lines: lines3, lf: gate(joined(lines3, '\n')), crlf: gate(joined(lines3, '\r\n')) };
  const lines4 = [B, S, '``` text']; // LF: unclosed -> malformed; CRLF: span closes at the closer-shaped line -> admitted
  result.g1ClosingShapedLineAtEnd = { lines: lines4, lf: gate(joined(lines4, '\n')), crlf: gate(joined(lines4, '\r\n')) };
}

// Bare CR: not in the corpus. Each case in LF, CRLF and CR.
{
  const cases = {
    'backtick-info-with-backtick': ['```a`b', S, B],
    'tilde-fence': [T, S, T],
    'backtick-fence': [B, S, B],
    'closer-trailing-tab': [B, S, '```\t'],
  };
  result.bareCr = Object.fromEntries(Object.entries(cases).map(([id, lines]) => [id, {
    lf: gate(joined(lines, '\n')), crlf: gate(joined(lines, '\r\n')), cr: gate(joined(lines, '\r')),
    crLinesSeenByProfile: joined(lines, '\r').split('\n').length,
  }]));
}

// The mask keeps CR? blank() replaces every character but LF, so a CR inside a closed context becomes a space.
{
  const m = core.maskMarkdownCodeContexts('```\r\nx\r\n```\r\n');
  result.maskOfCrlfFence = { kind: m.kind, masked: m.kind === 'masked' ? JSON.stringify(m.masked) : null };
}

// G3 beyond the corpus: a link inside a code span that runs across lines (no heading in the probe line).
{
  const cases = {
    'two-backtick-span-across-lines': ['``', '[p](probe.md)', '``'],
    'one-backtick-span-across-lines': ['`', '[p](probe.md)', '`'],
    'span-opened-mid-line': ['see `a', '[p](probe.md)', 'b` end'],
  };
  result.g3MultiLineSpan = Object.fromEntries(Object.entries(cases).map(([id, lines]) => {
    const text = joined(lines, '\n');
    const mask = core.maskMarkdownCodeContexts(text);
    return [id, {
      profile: mask.kind === 'malformed' ? 'M' : mask.masked.includes('[p](probe.md)') ? 'V' : 'H',
      links: core.indexLinkTargets(text).includes('probe.md') ? 'V' : 'H',
      renderer: renderPolarisMarkdown(text),
    }];
  }));
}

// G2 reach: a closer indented 1-3 spaces under a column-0 opener never closes for the extractor; what follows is hidden.
{
  const vision = (closer) => [
    '# Vision', '', '## Non-Negotiable Rules', '',
    '1. **First.** one', '', B, 'code', closer, '', '2. **Second.** two', '', '3. **Third.** three', '',
  ].join('\n');
  const view = (r) => (r.kind === 'items' ? { kind: r.kind, keys: r.items.map((i) => i.key) } : { kind: r.kind, failure: r.failure });
  result.g2IndentedCloserReach = {
    closerColumn0: view(core.extractClass('principle', 'vision.md', vision(B))),
    closerIndented1: view(core.extractClass('principle', 'vision.md', vision(' ' + B))),
    profileOnIndented1: core.maskMarkdownCodeContexts(vision(' ' + B)).kind,
  };
  // The tab-terminated closer-shaped line on a population the profile reads as well formed: the profile keeps the fence
  // open to the later plain closer; the extractor closes at the tab line and the plain closer opens a fence to the end.
  const tab = [
    '# Vision', '', '## Non-Negotiable Rules', '',
    '1. **First.** one', '', B, 'code', '```\t', 'more code', B, '', '2. **Second.** two', '', '3. **Third.** three', '',
  ].join('\n');
  result.g2TabCloserReach = {
    profile: core.maskMarkdownCodeContexts(tab).kind,
    extraction: view(core.extractClass('principle', 'vision.md', tab)),
  };
  // An opener indented 1-3 spaces: the extractor mints an item from text the profile hides.
  const minted = [
    '# Vision', '', '## Non-Negotiable Rules', '',
    '1. **First.** one', '', ' ' + B, '2. **Fenced.** inside a fence', ' ' + B, '',
  ].join('\n');
  result.g2IndentedOpenerMints = {
    profileHidesFencedItem: (() => { const m = core.maskMarkdownCodeContexts(minted); return m.kind === 'masked' && !m.masked.includes('Fenced.'); })(),
    extraction: view(core.extractClass('principle', 'vision.md', minted)),
  };
}

// G3, the hide direction: a closer-shaped line with info text closes the link reader's fence early, so the real closer
// opens a fence that runs to the end and hides a link the profile leaves visible.
{
  const index = [B, 'x', '```js', 'y', B, '', '[a](a.md)', ''].join('\n');
  const mask = core.maskMarkdownCodeContexts(index);
  result.g3CloserShapedLineHides = {
    profile: mask.kind === 'masked' ? (mask.masked.includes('[a](a.md)') ? 'V' : 'H') : 'M',
    links: core.indexLinkTargets(index),
  };
}

// G4, the consent reader's private outsideFences on a CRLF text, and the `one()` rule (all === 1 && prose === 1).
{
  const field = /^Recorded at \(UTC\): (\S+)$/gm;
  const one = (text) => {
    const all = [...text.matchAll(field)].length, prose = [...outsideFences(text).matchAll(field)].length;
    return { all, prose, accepted: all === 1 && prose === 1 };
  };
  const onlyInFence = ['# Title', '', B, 'Recorded at (UTC): 2026-10-04T09:30:00Z', B, ''];
  const inProseAndFence = ['# Title', '', 'Recorded at (UTC): 2026-10-04T09:30:00Z', '', B, 'Recorded at (UTC): 2026-10-04T09:30:00Z', B, ''];
  result.g4OneRule = {
    fieldOnlyInFence: { lf: one(onlyInFence.join('\n')), crlf: one(onlyInFence.join('\r\n')) },
    fieldInProseAndInFence: { lf: one(inProseAndFence.join('\n')), crlf: one(inProseAndFence.join('\r\n')) },
    titleCheckOnCrlf: { startsWithTitleLf: onlyInFence.join('\r\n').startsWith('# Title\n') },
  };
}

writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(result, null, 1));
