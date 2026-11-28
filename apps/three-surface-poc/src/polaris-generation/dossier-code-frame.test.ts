import { describe, expect, it } from 'vitest';
import type { LocalRenderInput } from '@syzygy/polaris-generation-core';
import { codeExcerptInput, readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// The numbered code excerpt's markup and style rules (REQ-polaris-generation-034 version 2.54, syzygy-3efd.33), over the renderer alone.
// Every expected string is a literal written from the requirement's text and the fixture, never read from the module under test.

const indexOf = (input: { readonly local: LocalRenderInput }): string => renderLocalDossier(input as Parameters<typeof renderLocalDossier>[0]).files.get('index.html')!;
const figureOf = (page: string): string => {
  const start = page.indexOf('<figure class="code-excerpt" id="element-x"');
  return page.slice(start, page.indexOf('</figure>', start) + '</figure>'.length);
};
const u = '<span class="code-unbanded"></span>', b = '<span class="code-band"> </span>';
const GUTTER = '<pre class="code-gutter" aria-hidden="true"><span class="code-number">10</span>\n<span class="code-number">11</span>\n'
  + '<span class="code-number code-highlighted">12</span> <span class="code-note-mark">1</span>\n<span class="code-number code-highlighted">13</span>\n'
  + '<span class="code-number">14</span>\n<span class="code-number">15</span>\n<span class="code-number">16</span>\n<span class="code-number">17</span>\n'
  + '<span class="code-number code-highlighted">18</span> <span class="code-note-mark">2</span>\n<span class="code-number">19</span>\n<span class="code-number">20</span></pre>';
const BANDS = `<pre class="code-bands" aria-hidden="true">${[u, u, b, b, u, u, u, u, b, u, u].join('\n')}</pre>`;
const AFTER = '<p class="code-highlights">Highlighted: lines 12–13 (shown lines 3–4), line 18 (shown line 9).</p>'
  + '<ol class="code-notes" aria-label="Notes on src/pool.ts, lines 10–20"><li>Line 12 (shown line 3) <a class="code-note" href="#block-p-pool">Read note 1<span class="visually-hidden"> on src/pool.ts, lines 10–20</span></a></li>'
  + '<li>Line 18 (shown line 9) <a class="code-note" href="#block-p-free">Read note 2<span class="visually-hidden"> on src/pool.ts, lines 10–20</span></a></li></ol><p class="code-anchor">';
/** The style rules the requirement states, each as the page writes it. */
const RULES = ['.code-frame{display:grid;grid-template-columns:max-content minmax(max-content,1fr);grid-template-areas:"gutter lines";margin:.5rem 0;overflow-x:auto;', 'figure.code-excerpt .code-frame>pre{grid-area:lines;margin:0;border:0;', 'background:none;overflow:visible;padding:.75rem 1rem;font:.85rem/1.5 var(--font-mono);white-space:pre;position:relative}',
  'figure.code-excerpt .code-frame>pre code{display:inline;font:inherit;white-space:pre}', 'pre.code-gutter{grid-area:gutter;position:static;', 'pre.code-bands{padding-left:0;padding-right:0;user-select:none;pointer-events:none;position:static}',
  '.code-band{display:inline-block;width:100%;background:var(--d-warn-tint)}', '.code-number.code-highlighted{font-weight:600;'];

describe('numbered code excerpt (version 2.54)', () => {
  it('frames the excerpt: gutter, the unchanged pre, bands opening with line 10\'s empty element, then the sentence and the notes', () => {
    const index = indexOf(codeExcerptInput());
    const figure = figureOf(index);
    expect(figure).toContain(`</figcaption><div class="code-frame">${GUTTER}<pre><code class="verified-quote"`);
    expect(figure).toMatch(new RegExp(`</code></pre>${BANDS.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}</div>${AFTER.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u'));
    expect(figure.match(/ id="/gu)?.length).toBe(1);
    for (const rule of RULES) expect(index, rule).toContain(rule);
    expect(index).not.toMatch(/<script/iu);
  });

  it('reads two quotation parts as one excerpt, each its own code element in the one pre', () => {
    const figure = figureOf(indexOf(codeExcerptInput(true)));
    expect(figure.match(/<code class="verified-quote"/gu)?.length).toBe(2);
    expect(figure).toContain(`<div class="code-frame">${GUTTER}<pre><code class="verified-quote"`);
    expect(figure).toContain(`</code></pre>${BANDS}</div>`);
  });

  it('carries the style rules only on a page holding a frame', () => {
    const plain = indexOf(readingInput());
    for (const rule of RULES) expect(plain, rule).not.toContain(rule);
  });

  it('leaves an excerpt whose lines hold a byte a browser may count otherwise unnumbered, keeping the sentence and the notes', () => {
    for (const char of ['\r', '\u000B', '\u000C', '\u0085', '\u2028', '\u2029']) {
      const input = codeExcerptInput();
      const draft = input.local.draft as unknown as { sections: { paragraphs: { element?: { parts: { text: string }[] } }[] }[] };
      const parts = draft.sections[0]!.paragraphs[2]!.element!.parts;
      parts[0] = { ...parts[0]!, text: parts[0]!.text.replace('slot11 = 11;\n', `slot11 = 11;${char}`) };
      const index = indexOf(input);
      const figure = figureOf(index);
      const name = `U+${char.codePointAt(0)!.toString(16).padStart(4, '0')}`;
      expect(figure, name).not.toContain('code-frame');
      expect(figure, name).not.toContain('code-gutter');
      expect(figure, name).toContain(`</figcaption><pre><code class="verified-quote"`);
      expect(figure, name).toContain(`</code></pre>${AFTER}`);
      for (const rule of RULES) expect(index, `${name}: ${rule}`).not.toContain(rule);
    }
    // A carriage return a line feed follows is no such byte.
    const input = codeExcerptInput();
    const draft = input.local.draft as unknown as { sections: { paragraphs: { element?: { parts: { text: string }[] } }[] }[] };
    const parts = draft.sections[0]!.paragraphs[2]!.element!.parts;
    parts[0] = { ...parts[0]!, text: parts[0]!.text.replace('slot11 = 11;\n', 'slot11 = 11;\r\n') };
    expect(figureOf(indexOf(input))).toContain('<div class="code-frame">');
  });

  it('renders no frame where the draft gives no marks: the excerpt of a draft before v18', () => {
    const input = codeExcerptInput();
    const { codeMarks: _marks, ...local } = input.local;
    const figure = figureOf(indexOf({ ...input, local }));
    expect(figure).toContain('</figcaption><pre><code class="verified-quote"');
    for (const absent of ['code-frame', 'code-gutter', 'code-bands', 'code-highlights', 'code-notes']) expect(figure, absent).not.toContain(absent);
  });
});
