import { beforeAll, describe, expect, it } from 'vitest';
import type { ProviderDraft } from '@syzygy/polaris-generation-core';
import { renderDraftPreview } from './draft-preview.js';
import { assertInertSvg } from './svg-inert.js';
import { syntheticGenerationSource } from './synthetic-source.js';

// Rule 6: each case mutates one valid rendered SVG and must make the boundary throw.
let valid = '';

beforeAll(() => {
  const revision = 'b'.repeat(40);
  const sources = [syntheticGenerationSource('inert', revision, 'purpose', 'Keep drawings inert.'),
    syntheticGenerationSource('inert', revision, 'flow', 'A reader asks; the renderer draws; review checks.')];
  const draft: ProviderDraft = {
    title: 'Inert drawings', introduction: { id: 'intro', text: 'Keep drawings inert.', sourceIds: ['purpose'] },
    sections: [{ id: 'how', title: 'How', paragraphs: [{ id: 'p', text: 'Reader asks renderer; renderer draws for review; review checks reader.', sourceIds: ['flow'], children: [] }], disposition: { kind: 'produced', assetIds: ['how'] } }],
    diagrams: [{ id: 'd', title: 'Loop', sectionId: 'how', kind: 'lifecycle', relationship: 'The review loop', nodes: [
      { id: 'reader', label: 'Reader', sourceIds: ['flow'], epistemic: 'observed' },
      { id: 'renderer', label: 'Renderer', sourceIds: ['flow'], epistemic: 'inferred' },
      { id: 'review', label: 'Review', sourceIds: ['flow'], epistemic: 'unknown' },
    ], edges: [
      { id: 'asks', from: 'reader', to: 'renderer', label: 'asks', sourceIds: ['flow'], epistemic: 'observed' },
      { id: 'draws', from: 'renderer', to: 'review', label: 'draws for', sourceIds: ['flow'], epistemic: 'inferred' },
      { id: 'checks', from: 'review', to: 'reader', label: 'checks', sourceIds: ['flow'], epistemic: 'unknown' },
    ], disposition: { kind: 'produced', assetIds: ['d'] } }],
    deepDives: [], unresolved: [],
  };
  valid = renderDraftPreview(draft, sources).match(/<svg[\s\S]*?<\/svg>/u)![0];
});

const beforeClose = (fragment: string) => (svg: string) => svg.replace(/<\/svg>$/u, `${fragment}</svg>`);
const replaceFirst = (from: string, to: string) => (svg: string) => {
  if (!svg.includes(from)) throw new Error(`fixture lacks ${from}`);
  return svg.replace(from, to);
};

const mutations: [string, (svg: string) => string][] = [
  ['script element', beforeClose('<script>alert(1)</script>')],
  ['onload attribute', replaceFirst('<svg ', '<svg onload="alert(1)" ')],
  ['onclick attribute on a shape', replaceFirst('<rect ', '<rect onclick="alert(1)" ')],
  ['animate element', beforeClose('<animate attributeName="d" dur="1s"/>')],
  ['set element', beforeClose('<set attributeName="class" to="x"/>')],
  ['foreignObject element', beforeClose('<foreignObject width="10" height="10"></foreignObject>')],
  ['a href link', beforeClose('<a href="#arrow-0"><text x="0" y="0">x</text></a>')],
  ['href attribute on a shape', replaceFirst('<path ', '<path href="#arrow-0" ')],
  ['xlink:href attribute', replaceFirst('<path ', '<path xlink:href="#arrow-0" ')],
  ['style attribute', replaceFirst('<rect ', '<rect style="fill:red" ')],
  ['style element', beforeClose('<style>rect{fill:red}</style>')],
  ['url(http://x) reference', replaceFirst('marker-end="url(#arrow-0)"', 'marker-end="url(http://x)"')],
  ['dangling url(#local) reference', replaceFirst('marker-end="url(#arrow-0)"', 'marker-end="url(#elsewhere)"')],
  ['javascript: in d', replaceFirst(' d="', ' d="javascript:alert(1) ')],
  ['javascript: in href', beforeClose('<path href="javascript:alert(1)" d="M 0 0"/>')],
  ['data: scheme', replaceFirst(' class="', ' class="data:x ')],
  ['entity-encoded attribute value', replaceFirst(' class="', ' class="&#106;')],
  ['comment', beforeClose('<!-- x -->')],
  ['CDATA section', beforeClose('<text x="0" y="0"><![CDATA[x]]></text>')],
  ['DOCTYPE', svg => `<!DOCTYPE svg>${svg}`],
  ['processing instruction', svg => `<?xml version="1.0"?>${svg}`],
  ['single-quoted attribute', replaceFirst('<rect ', "<rect x='0' ")],
  ['valueless attribute', replaceFirst('<svg ', '<svg onload ')],
  ['unknown entity in text', replaceFirst('</tspan>', '&#60;</tspan>')],
  ['raw > in text', replaceFirst('</tspan>', '></tspan>')],
  ['unbalanced tag', beforeClose('<g>')],
  ['content after the root', svg => `${svg}<svg xmlns="http://www.w3.org/2000/svg"></svg>`],
  ['foreign namespace', replaceFirst('xmlns="http://www.w3.org/2000/svg"', 'xmlns="http://evil.test/ns"')],
  ['uppercase element name', beforeClose('<SCRIPT>x</SCRIPT>')],
];

describe('assertInertSvg allow-list boundary', () => {
  it('accepts the unmodified rendered SVG', () => {
    expect(valid.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(valid).toContain('marker-end="url(#arrow-0)"');
    expect(() => assertInertSvg(valid)).not.toThrow();
  });

  it.each(mutations)('refuses a rendered SVG with an injected %s', (_name, mutate) => {
    const mutated = mutate(valid);
    expect(mutated).not.toBe(valid);
    expect(() => assertInertSvg(mutated)).toThrow('unsafe-svg');
  });

  it('admits each witness attribute in its one closed form, and refuses words, another state or a malformed identity (syzygy-3efd.89)', () => {
    const at = (attrs: string): string => replaceFirst('<path ', `<path ${attrs} `)(valid);
    const good = 'data-witness-state="corroborated" data-witness-fact="_import-3" data-witness-rule="typescript-relative-import" data-witness-rule-version="1"';
    expect(() => assertInertSvg(at(good))).not.toThrow();
    expect(() => assertInertSvg(at('data-witness-fact="_tree-contains-12" data-witness-rule="top-level-unit" data-witness-rule-version="1"'))).not.toThrow();
    for (const bad of ['data-witness-state="witnessed"', 'data-witness-state="corroborated by words"', 'data-witness-fact="PLANTED FREE TEXT"',
      'data-witness-fact="_import-0"', 'data-witness-fact="import-3"', 'data-witness-rule="typescript relative import"', 'data-witness-rule-version="01"',
      'data-witness-rule-version="1 2"']) {
      expect(() => assertInertSvg(at(bad)), bad).toThrow('unsafe-svg');
    }
  });

  it('refuses non-SVG input outright', () => {
    for (const input of ['', '<g></g>', 'text', '<svg xmlns="http://www.w3.org/2000/svg"/>']) {
      expect(() => assertInertSvg(input)).toThrow('unsafe-svg');
    }
  });
});
