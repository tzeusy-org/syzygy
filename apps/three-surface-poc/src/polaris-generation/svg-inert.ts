/**
 * Allow-list validator for the draft preview's server-rendered diagrams. This is
 * the security boundary the 2026-09-28 SVG direction names: an SVG reaches the
 * page only when it contains nothing but static shapes, paths, text and styling
 * hooks. It validates; it never repairs. Anything outside the list throws
 * `unsafe-svg`, and the caller renders the asset unresolved instead.
 *
 * The accepted grammar is deliberately the renderer's own output form: one `<svg>`
 * root, double-quoted attributes, balanced tags, text limited to the five entities
 * `escape` emits. It is not a general SVG or XML parser.
 */

const ELEMENTS = new Set(['svg', 'defs', 'marker', 'g', 'rect', 'path', 'text', 'tspan', 'title']);
/** Exactly the attributes `renderDiagramSvg` emits (diagram-layout.ts). */
const ATTRIBUTES = new Set([
  'xmlns', 'viewBox', 'role', 'aria-labelledby', 'aria-describedby', 'id', 'class',
  'x', 'y', 'dy', 'width', 'height', 'rx', 'd',
  'refX', 'refY', 'markerWidth', 'markerHeight', 'orient', 'marker-end', 'text-anchor',
  // The derived figure's element identities (version 2.3): inert data, an identity Syzygy wrote (`_tree-root`, `_tree-unit-<k>`, ...).
  'data-derived-id',
  // A computed map's element identities and an Unknown element's RFC2-24 reason (version 2.9): inert data Syzygy wrote (`_manifest-<k>`, a
  // reason code), never a draft's text.
  'data-manifest-id', 'data-unknown-reason',
  // A schema-v9 graph edge's relation type, and a witnessed edge's witnessing fact, rule and version and its Observed marking (version 2.19):
  // inert data Syzygy wrote from closed lists and its own identities, never a draft's free text.
  'data-relation', 'data-witness-fact', 'data-witness-rule', 'data-witness-rule-version', 'data-epistemic',
  // A schema-v12 element or relationship more than one view selects (version 2.24): its identity, which the draft schema's identity
  // pattern bounds and the value pattern below checks again, never a draft's free text.
  'data-element', 'data-relationship',
  // A v15 view's base element and its display-name line (version 2.35): the provenance word (`computed` or `curated`), and the name's
  // claim identity `<diagram>:name:<k>`, built from an identity the value pattern below checks again, never a draft's free text.
  'data-visual-provenance', 'data-name',
]);
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
/** Attribute values the renderer emits: numbers, path commands, ids, class names; a colon only inside an identity (a display name's
 * `<diagram>:name:<k>`, version 2.35), never a scheme, which the test before this one refuses. */
const VALUE = /^[A-Za-z0-9 #().,:_-]*$/u;
const LOCAL_URL = /url\(#([A-Za-z0-9_-]+)\)/gu;
const TOKEN = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:\s+[^\s=/>"']+="[^"]*")*)\s*(\/?)>|[^<>]+/uy;
const ATTRIBUTE = /\s+([^\s=/>"']+)="([^"]*)"/gu;
const TEXT_ENTITY = /&(?!(?:amp|lt|gt|quot|#39);)/u;

function unsafe(): never {
  throw new Error('unsafe-svg');
}

function assertAttribute(element: string, name: string, value: string, isRoot: boolean): void {
  const lower = name.toLowerCase();
  if (lower.startsWith('on') || lower === 'style' || lower === 'href' || lower.endsWith(':href')) unsafe();
  if (!ATTRIBUTES.has(name)) unsafe();
  if (name === 'xmlns') {
    if (!isRoot || element !== 'svg' || value !== SVG_NAMESPACE) unsafe();
    return;
  }
  if (/javascript:|vbscript:|data:|https?:/iu.test(value) || value.includes('&')) unsafe();
  if (!VALUE.test(value)) unsafe();
  const withoutLocal = value.replace(LOCAL_URL, '');
  if (/url\(/iu.test(withoutLocal)) unsafe();
}

/** Throws `unsafe-svg` unless `svg` is exactly one allow-listed, inert `<svg>` element. */
export function assertInertSvg(svg: string): void {
  if (typeof svg !== 'string' || svg.includes('<!') || svg.includes('<?')) unsafe();
  if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) unsafe();
  const stack: string[] = [];
  const ids = new Set<string>();
  const localReferences: string[] = [];
  let closedRoot = false;
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < svg.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(svg);
    if (match === null || match.index !== start) unsafe();
    if (closedRoot) unsafe();
    const [token, closing, name, attributes, selfClosing] = match;
    if (name === undefined) {
      if (stack.length === 0 || TEXT_ENTITY.test(token)) unsafe();
      continue;
    }
    if (!ELEMENTS.has(name)) unsafe();
    if (closing) {
      if (attributes || selfClosing || stack.pop() !== name) unsafe();
      if (stack.length === 0) closedRoot = true;
      continue;
    }
    const isRoot = stack.length === 0;
    if (isRoot !== (name === 'svg') || (isRoot && start !== 0)) unsafe();
    const seen = new Set<string>();
    for (const attribute of (attributes ?? '').matchAll(ATTRIBUTE)) {
      const [, attributeName, value] = attribute as unknown as [string, string, string];
      if (seen.has(attributeName)) unsafe();
      seen.add(attributeName);
      assertAttribute(name, attributeName, value, isRoot);
      if (attributeName === 'id') {
        if (ids.has(value)) unsafe();
        ids.add(value);
      }
      for (const reference of value.matchAll(LOCAL_URL)) localReferences.push(reference[1]!);
    }
    if (!selfClosing) stack.push(name);
    else if (isRoot) unsafe();
  }
  if (stack.length !== 0 || !closedRoot) unsafe();
  if (localReferences.some(id => !ids.has(id))) unsafe();
}
