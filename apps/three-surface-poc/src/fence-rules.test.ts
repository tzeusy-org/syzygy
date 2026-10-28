// Characterization of the Markdown fence recognizers (syzygy-bpyt.6.3, the DC-3 fence-rule finding; syzygy-bpyt.55, the owner's ruling on it).
//
// Four production readers decide which lines sit inside a fenced block. Three of them share one rule, since syzygy-bpyt.55:
//   profile     maskMarkdownCodeContexts (markdown-code-context.ts), built on recognizeCodeContexts: PWB-REQ-006 "Code-context profile", the spec's own rule.
//   links       indexLinkTargets (project-shape-manifest.ts, stripFences): the profile's fences and, alone, its code spans, on the reader's LF-split lines.
//   extraction  extractClass (project-shape-extraction.ts, parseDoc): the profile's fences (no spans), on the extractor's LF-split lines.
//   renderer    renderPolarisMarkdown (polaris-markdown.ts): the presentation of admitted text; it keeps its own rule.
// A fifth, outsideFences in polaris-generation-consent, is private and keeps its own rule; docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs measures it and
// packages/polaris-generation-consent/src/package-reader.test.ts pins its opener, its closer and its CR-blindness through the public
// admission reader.
//
// This file pins what each reader does, so that merging or "fixing" a rule is a visible decision and not an accident. It decides nothing:
// the record docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json says, per reader, which clause governed it before syzygy-bpyt.55
// and where it departed, and its addendum dc3-fence-rules-addendum-2026-10-29.json says what changed. Changing a row below changes what a
// gate accepts or refuses, which needs the owner (GP-Q0), and the record changes with it.
// G1, the profile's reading of a CRLF opener, was ruled by the owner (decision bead syzygy-bpyt.1.14) and fixed by syzygy-bpyt.16. G2 (the
// extractor) and G3 (the link reader) were ruled by the owner on 2026-10-28 (GP-B2 Q2, answer C) and fixed by syzygy-bpyt.55: the rows that
// pinned them are now equalities with the profile (below). What remains of them is the LF-only line model of the extractor and the link
// reader, which a bare CR does not end (the GAP rows below), and the stray-backtick residual (the last describe).
//
// A row is one case: its lines, then one string per reader. A string has one letter for each place a probe line can be
// inserted (before line 0, before line 1, ... after the last): V the probe line is outside every fence the reader
// recognizes, H it is inside one, M the profile calls the whole text malformed (an unclosed fence or span, or a backtick
// fence whose info string holds a backtick), X the active-content gate excludes a source with a script element at that
// place, A it admits it. The columns are the reading of the text with LF after every line; a text with CRLF after every line, with a
// bare CR after every line, and four mixed-terminator renderings must read the same for the profile and the gate (syzygy-bpyt.16).
// `whole` is the profile's reading of the case with no probe line: well formed, or malformed with its reason (WF, UF, BI, US below).
// Expected values are literals.
import { describe, expect, it } from 'vitest';
import { extractClass, extractSource, indexLinkTargets, maskMarkdownCodeContexts, scanActiveContent } from '@syzygy/three-surface-poc-core';
import { renderPolarisMarkdown } from './polaris-markdown.js';

const B = '```';
const T = '~~~';
const PROBE = '## PROBE [p](probe.md)';
const PAYLOAD = '<script>x</script>';
// The profile's reading of a case with no probe line, as maskMarkdownCodeContexts reports it: well formed, or malformed with a reason.
const WF = 'well-formed';
const UF = 'malformed:unclosed-fence';
const BI = 'malformed:backtick-fence-with-backtick-in-info-string';
const US = 'malformed:unclosed-inline-span';

interface FenceCase {
  readonly id: string;
  readonly lines: readonly string[];
  readonly profile: string;
  readonly links: string;
  readonly extraction: string;
  readonly renderer: string;
  readonly gate: string;
  readonly whole: string;
}

const CASES: readonly FenceCase[] = [
  { id: 'backtick-col0', lines: [B, 'x', B], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'backtick-indent1', lines: [' ```', 'x', ' ```'], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'backtick-indent2', lines: ['  ```', 'x', '  ```'], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'backtick-indent3', lines: ['   ```', 'x', '   ```'], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'backtick-indent4', lines: ['    ```', 'x', '    ```'], profile: 'VHHV', links: 'VHHV', extraction: 'VVVV', renderer: 'VVVV', gate: 'XAAX', whole: WF },
  { id: 'backtick-tab', lines: ['\t```', 'x', '\t```'], profile: 'VHHV', links: 'VHHV', extraction: 'VVVV', renderer: 'VVVV', gate: 'XAAX', whole: WF },
  { id: 'tilde-col0', lines: [T, 'x', T], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'tilde-indent3', lines: ['   ~~~', 'x', '   ~~~'], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'tilde-indent4', lines: ['    ~~~', 'x', '    ~~~'], profile: 'VVVV', links: 'VVVV', extraction: 'VVVV', renderer: 'VVVV', gate: 'XXXX', whole: WF },
  { id: 'opener-four-closer-three', lines: ['````', 'x', B, 'y', '````'], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'closer-longer', lines: [B, 'x', '````'], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'closer-indent1', lines: [B, 'x', ' ```', 'y'], profile: 'VHHVV', links: 'VHHVV', extraction: 'VHHVV', renderer: 'VHHVV', gate: 'XAAXX', whole: WF },
  { id: 'closer-indent3', lines: [B, 'x', '   ```', 'y'], profile: 'VHHVV', links: 'VHHVV', extraction: 'VHHVV', renderer: 'VHHVV', gate: 'XAAXX', whole: WF },
  { id: 'closer-indent4', lines: [B, 'x', '    ```', 'y', B], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'closer-trailing-space', lines: [B, 'x', '``` '], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'closer-trailing-tab', lines: [B, 'x', '```\t'], profile: 'MMMM', links: 'VHHH', extraction: 'VHHH', renderer: 'VHHV', gate: 'XXXX', whole: UF },
  { id: 'closer-trailing-tab-then-closer', lines: [B, 'x', '```\t', 'y', B], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHVVH', gate: 'XAAAAX', whole: WF },
  { id: 'closer-with-info', lines: [B, 'x', '```js', 'y', B], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'closer-longer-with-info', lines: [B, '````js', 'y', B], profile: 'VHHHV', links: 'VHHHV', extraction: 'VHHHV', renderer: 'VHHHV', gate: 'XAAAX', whole: WF },
  { id: 'closer-with-text', lines: [B, 'x', '``` text', 'y', B], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'closer-other-char', lines: [B, 'x', T, 'y', B], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'tilde-fence-backtick-line', lines: [T, 'x', B, 'y', T], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'tilde-opener-four-closer-three', lines: ['~~~~', 'x', T, 'y', '~~~~'], profile: 'VHHHHV', links: 'VHHHHV', extraction: 'VHHHHV', renderer: 'VHHHHV', gate: 'XAAAAX', whole: WF },
  { id: 'info-string', lines: ['```js', 'x', B], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'info-string-space', lines: ['``` js', 'x', B], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'backtick-info-with-backtick', lines: ['```a`b', 'x', B], profile: 'MMMM', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XXXX', whole: BI },
  { id: 'tilde-info-with-backtick', lines: ['~~~a`b', 'x', T], profile: 'VHHV', links: 'VHHV', extraction: 'VHHV', renderer: 'VHHV', gate: 'XAAX', whole: WF },
  { id: 'unclosed', lines: [B, 'x'], profile: 'MMM', links: 'VHH', extraction: 'VHH', renderer: 'VHH', gate: 'XXX', whole: UF },
  { id: 'empty-fence', lines: [B, B], profile: 'VHV', links: 'VHV', extraction: 'VHV', renderer: 'VHV', gate: 'XAX', whole: WF },
  { id: 'two-backticks', lines: ['``', 'x', '``'], profile: 'VHHV', links: 'VHHV', extraction: 'VVVV', renderer: 'VVVV', gate: 'XAAX', whole: WF },
  { id: 'blockquote', lines: ['> ```', '> x', '> ```'], profile: 'VHHV', links: 'VHHV', extraction: 'VVVV', renderer: 'VVVV', gate: 'XAAX', whole: WF },
  { id: 'list-item', lines: ['- ```', '  x', '  ```'], profile: 'MMMM', links: 'VVVH', extraction: 'VVVH', renderer: 'VVVV', gate: 'XXXX', whole: US },
  { id: 'two-fences', lines: [B, 'x', B, T, 'y', T], profile: 'VHHVHHV', links: 'VHHVHHV', extraction: 'VHHVHHV', renderer: 'VHHVHHV', gate: 'XAAXAAX', whole: WF },
];

// Inline code spans on one line, for the two readers that have a rule for them: V the link is outside a span, H inside one,
// M the profile calls the text malformed.
const INLINE_SPANS: readonly { readonly id: string; readonly line: string; readonly profile: string; readonly links: string }[] = [
  { id: 'no-span', line: 'see [p](probe.md)', profile: 'V', links: 'V' },
  { id: 'inside-span', line: '`[p](probe.md)`', profile: 'H', links: 'H' },
  { id: 'inside-double-span', line: '``[p](probe.md)``', profile: 'H', links: 'H' },
  { id: 'unclosed-span', line: '` [p](probe.md)', profile: 'M', links: 'V' },
  { id: 'link-between-spans', line: '`a` [p](probe.md) `b`', profile: 'V', links: 'V' },
  { id: 'double-span-with-inner-backtick-before-link', line: '`` a ` b `` [p](probe.md)', profile: 'V', links: 'V' },
  { id: 'double-span-with-inner-backtick-around-link', line: '``[p](probe.md) ` ``', profile: 'H', links: 'H' },
  { id: 'backslash-before-delimiters', line: '\\`[p](probe.md)\\`', profile: 'H', links: 'H' },
];

const joined = (lines: readonly string[], eol: string): string => lines.map((line) => line + eol).join('');
// A rendering turns a list of lines into text. Three are uniform; four give the i-th line end of the text its own terminator.
type Render = (lines: readonly string[]) => string;
const reterm = (pattern: (i: number, count: number) => string): Render => (lines) => {
  const count = lines.length;
  return lines.map((line, i) => line + pattern(i, count)).join('');
};
const RENDERINGS: Readonly<Record<string, Render>> = {
  lf: (lines) => joined(lines, '\n'),
  crlf: (lines) => joined(lines, '\r\n'),
  cr: (lines) => joined(lines, '\r'),
  // a CRLF opener, LF after it; an LF opener, CRLF on the last line (the closer in most cases); a bare CR first; the three in turn
  firstCrlf: reterm((i) => (i === 0 ? '\r\n' : '\n')),
  lastCrlf: reterm((i, count) => (i === count - 1 ? '\r\n' : '\n')),
  firstCr: reterm((i) => (i === 0 ? '\r' : '\n')),
  cycle: reterm((i) => ['\n', '\r\n', '\r'][i % 3] as string),
};
const LINE_END = /\r\n|\r|\n/;
// Every character that is not a terminator becomes a dot: equal skeletons mean the same length and each CR and LF at its offset.
const skeleton = (text: string): string => text.replace(/[^\r\n]/g, '.');
const wholeReading = (text: string): string => {
  const mask = maskMarkdownCodeContexts(text);
  return mask.kind === 'malformed' ? `malformed:${mask.reason}` : WF;
};
const atLine = (text: string, k: number): boolean => (text.split(LINE_END)[k] ?? '') === PROBE;

type Read = (text: string, k: number) => string;
const readers: Readonly<Record<'profile' | 'links' | 'extraction' | 'renderer', Read>> = {
  profile: (text, k) => {
    const mask = maskMarkdownCodeContexts(text);
    if (mask.kind === 'masked') expect(skeleton(mask.masked), 'the mask keeps the length and every terminator at its offset').toBe(skeleton(text));
    return mask.kind === 'malformed' ? 'M' : atLine(mask.masked, k) ? 'V' : 'H';
  },
  links: (text) => (indexLinkTargets(text).includes('probe.md') ? 'V' : 'H'),
  extraction: (text) => {
    const result = extractClass('project-account-section', 'architecture.md', text);
    return result.kind === 'items' && result.items.some((item) => (item.statement ?? '').includes('PROBE')) ? 'V' : 'H';
  },
  renderer: (text) => (renderPolarisMarkdown(text).includes('<h4>PROBE') ? 'V' : 'H'),
};
const gate: Read = (text) => (scanActiveContent(text).length > 0 ? 'X' : 'A');

function vector(read: Read, insert: string, lines: readonly string[], render: Render): string {
  let out = '';
  for (let k = 0; k <= lines.length; k += 1) out += read(render([...lines.slice(0, k), insert, ...lines.slice(k)]), k);
  return out;
}
const LF = RENDERINGS['lf'] as Render;
const CRLF = RENDERINGS['crlf'] as Render;
const CR = RENDERINGS['cr'] as Render;

describe('Markdown fence recognizers: what each reader treats as inside a fence', () => {
  it.each(CASES)('$id', (c) => {
    const read = {
      profile: vector(readers.profile, PROBE, c.lines, LF),
      links: vector(readers.links, PROBE, c.lines, LF),
      extraction: vector(readers.extraction, PROBE, c.lines, LF),
      renderer: vector(readers.renderer, PROBE, c.lines, LF),
      gate: vector(gate, PAYLOAD, c.lines, LF),
      whole: wholeReading(joined(c.lines, '\n')),
    };
    for (const key of ['profile', 'links', 'extraction', 'renderer', 'gate', 'whole'] as const) expect(read[key], `${c.id} ${key}`).toBe(c[key]);
  });

  // G1, ruled and fixed (syzygy-bpyt.1.14, syzygy-bpyt.16): the profile ends a line at CRLF, CR and LF alike and keeps every
  // terminator, so a text with any of them, or with several in one text, reads as its LF form does. The profile reader also checks,
  // at every place, that the masked text has the original's skeleton: its length and each CR and LF at its offset.
  describe('the profile and the gate read every rendering as the LF text is read', () => {
    it.each(Object.keys(RENDERINGS).filter((name) => name !== 'lf'))('%s', (name) => {
      const render = RENDERINGS[name] as Render;
      for (const c of CASES) {
        expect(vector(readers.profile, PROBE, c.lines, render), `${c.id} profile`).toBe(c.profile);
        expect(vector(gate, PAYLOAD, c.lines, render), `${c.id} gate`).toBe(c.gate);
        expect(wholeReading(render(c.lines)), `${c.id} whole`).toBe(c.whole);
      }
    });
  });

  it('the cases cover the population this file claims: 33 cases, 152 insertion places per reader, seven renderings', () => {
    expect(CASES).toHaveLength(33);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(33);
    expect(CASES.reduce((n, c) => n + c.lines.length + 1, 0)).toBe(152);
    expect(Object.keys(RENDERINGS)).toHaveLength(7);
    for (const c of CASES) for (const key of ['profile', 'links', 'extraction', 'renderer', 'gate'] as const) expect(c[key], `${c.id} ${key}`).toHaveLength(c.lines.length + 1);
  });

  it('links, extraction and the renderer read CRLF exactly as they read LF', () => {
    for (const c of CASES) {
      for (const name of ['links', 'extraction', 'renderer'] as const) {
        expect(vector(readers[name], PROBE, c.lines, CRLF), `${c.id} ${name}`).toBe(c[name]);
      }
    }
  });

  // The extractor strips a trailing CR from each line it splits at LF, so for LF and CRLF its line model is the profile's. Where the
  // two agree on a case read as LF, they agree on the CRLF text too. They agree on every well-formed case but four, and those four are
  // the cases where the profile's H is a code span and not a fence (the extractor reads fences only); the cases the profile calls
  // malformed are read by recovery (D1: an unclosed fence runs to the end of the text).
  it('the extractor and the profile hold one line model for LF and CRLF: where they agree on LF they agree on CRLF', () => {
    const agree = CASES.filter((c) => c.whole === WF && c.extraction === c.profile);
    expect(agree.map((c) => c.id)).toEqual([
      'backtick-col0', 'backtick-indent1', 'backtick-indent2', 'backtick-indent3', 'tilde-col0', 'tilde-indent3', 'tilde-indent4', 'opener-four-closer-three',
      'closer-longer', 'closer-indent1', 'closer-indent3', 'closer-indent4', 'closer-trailing-space', 'closer-trailing-tab-then-closer', 'closer-with-info',
      'closer-longer-with-info', 'closer-with-text', 'closer-other-char', 'tilde-fence-backtick-line', 'tilde-opener-four-closer-three', 'info-string',
      'info-string-space', 'tilde-info-with-backtick', 'empty-fence', 'two-fences',
    ]);
    expect(CASES.filter((c) => c.whole === WF && c.extraction !== c.profile).map((c) => c.id)).toEqual(['backtick-indent4', 'backtick-tab', 'two-backticks', 'blockquote']);
    for (const c of agree) expect(vector(readers.extraction, PROBE, c.lines, CRLF), `${c.id}`).toBe(vector(readers.profile, PROBE, c.lines, CRLF));
  });

  // The link reader reads the profile's fences and spans: on every well-formed case its vector is the profile's, for LF and for CRLF.
  it('the link reader holds the profile\'s vector on every well-formed case, for LF and CRLF', () => {
    for (const c of CASES.filter((k) => k.whole === WF)) {
      expect(c.links, `${c.id} links`).toBe(c.profile);
      expect(vector(readers.links, PROBE, c.lines, CRLF), `${c.id} links CRLF`).toBe(c.profile);
    }
  });

  // GAP, what syzygy-bpyt.55 left (the plan kept the readers' line model, the owner's Q2 answer C changed their fence and span rules): a
  // bare CR ends a line for the profile and the gate (since syzygy-bpyt.16) and for the renderer, which turns \r\n? into \n, but not for
  // the extractor or the link reader, which split at LF only and ask the profile whether the first character of each such line is fenced.
  // In a bare-CR text that is one line, fenced when the text opens a fence at its start. Over the 33 cases the link reader's vector differs
  // from its LF vector in 26 and the extractor's in all 33; the renderer's, the profile's and the gate's in none. A change of that line
  // model flips the two rows.
  describe('GAP: a bare CR is a line end for the profile, the gate and the renderer, not for the extractor or the link reader', () => {
    const measure = (name: 'links' | 'extraction' | 'renderer'): { readonly differing: number; readonly sample: Readonly<Record<string, string>> } => {
      const differing = CASES.filter((c) => vector(readers[name], PROBE, c.lines, CR) !== c[name]);
      return { differing: differing.length, sample: Object.fromEntries(['backtick-col0', 'unclosed'].map((id) => [id, vector(readers[name], PROBE, (CASES.find((c) => c.id === id) as FenceCase).lines, CR)])) };
    };

    it('the link reader', () => {
      expect(measure('links')).toEqual({ differing: 26, sample: { 'backtick-col0': 'VHHH', unclosed: 'VHH' } });
    });

    it('the extractor', () => {
      expect(measure('extraction')).toEqual({ differing: 33, sample: { 'backtick-col0': 'HHHH', unclosed: 'HHH' } });
    });

    it('the renderer reads a bare CR as the LF text is read', () => {
      expect(measure('renderer')).toEqual({ differing: 0, sample: { 'backtick-col0': 'VHHV', unclosed: 'VHH' } });
    });
  });

  it.each(INLINE_SPANS)('inline span: $id', (c) => {
    const mask = maskMarkdownCodeContexts(c.line);
    const profile = mask.kind === 'malformed' ? 'M' : mask.masked.includes('[p](probe.md)') ? 'V' : 'H';
    expect({ profile, links: indexLinkTargets(c.line).includes('probe.md') ? 'V' : 'H' }).toEqual({ profile: c.profile, links: c.links });
  });

  // The renderer also uses its fence rule where the vector cannot see it: to end a paragraph, and to find the fragment's root heading.
  it('renderer: a fence line indented three spaces ends a paragraph, one indented four spaces does not', () => {
    expect(renderPolarisMarkdown('text\n   ' + B + '\nx\n   ' + B)).toBe('<p>text</p>\n<pre><code>x</code></pre>');
    expect(renderPolarisMarkdown('text\n    ' + B + '\nx')).toBe('<p>text\n    ' + B + '\nx</p>');
  });

  it('renderer: a fence line indented with a tab does not end a paragraph', () => {
    expect(renderPolarisMarkdown('text\n\t' + B + '\nx')).toBe('<p>text\n\t' + B + '\nx</p>');
  });

  it('renderer: a closed fence does not hide the heading after it from the fragment root', () => {
    expect(renderPolarisMarkdown('### A\n\n' + B + '\nx\n' + B + '\n\n# B')).toBe('<h4>A</h4>\n<pre><code>x</code></pre>\n<h4>B</h4>');
  });

  // G1, ruled and fixed (decision bead syzygy-bpyt.1.14, implemented by syzygy-bpyt.16): a line "```a`b" is a fence opener whether the CR
  // counts as part of the line or as its terminator, and a backtick opener's info text may hold no backtick, so the LF text is
  // malformed and excluded. The opener regex ends in `(.*)$` and `.` does not match CR, so until the fix a CRLF or CR text was read as an
  // inline span that hid the script element. The mask now ends a line at CRLF, CR and LF; the rows below pin the two directions of
  // the change, with literal expected values (the first was admitted before the fix, the second excluded).
  it('G1, fixed: a CRLF or CR source is excluded as a malformed code context, as the same LF source is', () => {
    const body = '```a`b\n<script>alert(1)</script>\n```\n';
    for (const end of ['\n', '\r\n', '\r']) {
      expect(scanActiveContent(body.replace(/\n/g, end)), JSON.stringify(end)).toEqual([
        { form: 'malformed-code-context', line: 1, column: 1, context: 'backtick-fence-with-backtick-in-info-string' },
      ]);
    }
  });

  it('G1, fixed: a script element inside a closed tilde fence is admitted whatever ends the lines', () => {
    const body = '# Doc\n\n~~~\n<script>alert(1)</script>\n~~~\nafter\n';
    for (const end of ['\n', '\r\n', '\r']) expect(scanActiveContent(body.replace(/\n/g, end)), JSON.stringify(end)).toEqual([]);
  });

  // The two shapes of the fail-open class that the review of syzygy-bpyt.6.3 named (N2), which is wider than LF-malformed sources:
  // a script element between two tilde fences that each show a backtick-fence line (well formed and excluded on LF), and a
  // closer-shaped line followed by text (malformed on LF). Both were admitted on CRLF.
  it('G1, fixed: the fail-open class is closed for a well-formed LF source too', () => {
    const between = ['~~~', B, '~~~', PAYLOAD, '~~~', B, '~~~'];
    const afterText = [B, PAYLOAD, B + ' text'];
    for (const name of Object.keys(RENDERINGS)) {
      const render = RENDERINGS[name] as Render;
      expect(scanActiveContent(render(between)).map((f) => f.form), name).toEqual(['script-element', 'script-element']);
      expect(scanActiveContent(render(afterText)).map((f) => f.form), name).toEqual(['malformed-code-context']);
    }
  });

  // G2, ruled (GP-B2 Q2, answer C) and fixed (syzygy-bpyt.55): the extractor recognizes fences by the profile, so a closer indented one to
  // three spaces closes the fence and a closer-shaped line ending in a tab does not. The denominators below were 1 of 3 before the fix and
  // are 3 of 3 now; the source is not failed in either case.
  describe("G2, fixed: the extractor reads the profile's fences", () => {
    const SOURCE = { path: 'vision.md', extractionClasses: ['principle'] } as const;
    const vision = (fence: readonly string[]): string => ['# Vision', '', '## Non-Negotiable Rules', '', '1. **First.** one', '', ...fence, '', '2. **Second.** two', '', '3. **Third.** three', ''].join('\n');
    const principles = (text: string): { readonly kind: string; readonly denominators: unknown; readonly keys: readonly string[] } => {
      const result = extractSource(SOURCE, text);
      return result.kind === 'extracted' ? { kind: result.kind, denominators: result.denominators, keys: result.items.map((item) => item.key) } : { kind: result.kind, denominators: null, keys: [] };
    };
    const ALL_THREE = { kind: 'extracted', denominators: { principle: 3 }, keys: ['First.', 'Second.', 'Third.'] };

    it('a plain closer: the control, three principles declared and three extracted', () => {
      const text = vision([B, 'code', B]);
      expect(maskMarkdownCodeContexts(text).kind).toBe('masked');
      expect(principles(text)).toEqual(ALL_THREE);
    });

    it.each([['one space', ' ' + B], ['three spaces', '   ' + B]])('a closer indented %s: the profile closes the fence and so does the extractor, and the denominator is 3 of 3', (_name, closer) => {
      const text = vision([B, 'code', closer]);
      expect(maskMarkdownCodeContexts(text).kind).toBe('masked');
      expect(principles(text)).toEqual(ALL_THREE);
    });

    it('a closer-shaped line ending in a tab: the profile keeps the fence open to the plain closer, and so does the extractor', () => {
      const text = vision([B, 'code', B + '\t', 'more code', B]);
      expect(maskMarkdownCodeContexts(text).kind).toBe('masked');
      expect(principles(text)).toEqual(ALL_THREE);
    });

    it('a fence opener indented four spaces is not a fence for the profile or the extractor', () => {
      const text = vision(['    ' + B, 'code', '    ' + B]);
      expect(principles(text)).toEqual(ALL_THREE);
    });
  });

  // G3, ruled and fixed (syzygy-bpyt.55): the link reader recognizes fences and code spans by the profile, so a link on a line inside a span
  // that opens and closes on other lines is hidden (as the profile hides it), a closer-shaped line with an info string or a trailing tab
  // does not close a fence, and the real closer does. The probe lines of the vector corpus are headings, which end a CommonMark paragraph and
  // so never sit inside a span there; these rows carry a link on a line of its own.
  describe("G3, fixed: the link reader reads the profile's fences and spans", () => {
    const LINK = '[p](probe.md)';
    const SPANS = [
      { id: 'double-backtick-span-over-three-lines', lines: ['``', LINK, '``'], rendered: '<p><code>\n[p](probe.md)\n</code></p>' },
      { id: 'single-backtick-span-over-three-lines', lines: ['`', LINK, '`'], rendered: '<p><code>\n[p](probe.md)\n</code></p>' },
      { id: 'span-opened-mid-line', lines: ['see `a', LINK, 'b` end'], rendered: '<p>see <code>a\n[p](probe.md)\nb</code> end</p>' },
    ];
    const visible = (text: string, link: string): boolean => {
      const mask = maskMarkdownCodeContexts(text);
      return mask.kind === 'masked' && mask.masked.includes(link);
    };

    it.each(SPANS)('a link on a line inside a span that runs across lines is hidden, as the profile hides it: $id', (c) => {
      const text = joined(c.lines, '\n');
      expect(visible(text, LINK)).toBe(false);
      expect(indexLinkTargets(text)).toEqual([]);
      expect(renderPolarisMarkdown(text)).toBe(c.rendered);
    });

    it('a single-line span is stripped: the control for the rows above', () => {
      expect(indexLinkTargets(joined(['`' + LINK + '`'], '\n'))).toEqual([]);
    });

    it('a closer-shaped line with an info string does not close the fence, and the real closer shows every later link', () => {
      const text = joined([B, 'x', B + 'js', 'y', B, '', '[a](a.md)'], '\n');
      expect(visible(text, '[a](a.md)')).toBe(true);
      expect(indexLinkTargets(text)).toEqual(['a.md']);
      expect(indexLinkTargets(joined([B, 'x', 'y', B, '', '[a](a.md)'], '\n'))).toEqual(['a.md']);
    });

    it('a closer-shaped line ending in a tab, on a text the profile reads as well formed, hides the link inside the fence and shows the one after it', () => {
      const text = joined([B, 'x', B + '\t', '[inside](mint.md)', B, '[after](hide.md)'], '\n');
      expect(visible(text, '[inside](mint.md)')).toBe(false);
      expect(visible(text, '[after](hide.md)')).toBe(true);
      expect(indexLinkTargets(text)).toEqual(['hide.md']);
    });
  });

  // RESIDUAL, named by the owner's Q2 answer C ("the stray-backtick drop"): two stray single backticks around a list of links make those links a
  // code span for the profile, so the links drop from the link reader with no signal, and the gate admits the text because the span closes.
  // Signalling it would need a new failure reason, a specification amendment, which comes back to the owner as its own packet.
  describe('RESIDUAL: two stray single backticks around a list of links', () => {
    const text = joined(['Use the `foo flag.', '', '- [a](a.md)', '- [b](b.md)', '', 'Then the bar` flag.', '- [c](c.md)'], '\n');

    it('the links between them drop, and nothing says so', () => {
      expect(maskMarkdownCodeContexts(text).kind).toBe('masked');
      expect(scanActiveContent(text)).toEqual([]);
      expect(indexLinkTargets(text)).toEqual(['c.md']);
    });
  });
});
