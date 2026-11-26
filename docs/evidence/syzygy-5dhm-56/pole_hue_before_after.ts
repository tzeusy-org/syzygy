// Before/after for syzygy-5dhm.56: render the pole-hue fixture and list, per page, the hue each card, curated figure and in-column
// eyebrow inherits (the nearest data-hue at or above it). Run with the worktree's dossier-site.ts as it stands.
import { renderLocalDossier } from '../../../apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
import { poleHueInput } from '../../../apps/three-surface-poc/src/polaris-generation/dossier-reading.testkit.ts';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
let positionalCards = false;
function hues(html: string, wanted: RegExp): string[] {
  const out: string[] = [];
  let cardIndex = 0;
  const stack: { name: string; hue: string | null }[] = [];
  const body = html.replace(/<style>[\s\S]*?<\/style>/gu, '').replace(/<pre>[\s\S]*?<\/pre>/gu, '');
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"]|"[^"]*")*?)(\/?)>/gu)) {
    const [whole, close, name, attrs, self] = m as unknown as string[];
    if (close === '/') { const at = stack.map(e => e.name).lastIndexOf(name!); if (at >= 0) stack.length = at; continue; }
    const hue = /\sdata-hue="(\d)"/u.exec(attrs!)?.[1] ?? stack.at(-1)?.hue ?? null;
    // Before this change a card's own positional rule (ul.cards>li.card:nth-child(6n+k)) set its hue, overriding what it inherited.
    if (/^<ul class="cards"/u.test(whole!)) cardIndex = 0;
    const positional = positionalCards && /^<li class="card">$/u.test(whole!) ? String((cardIndex++ % 6) + 1) : null;
    const figure = /id="figure-([^"]+)"/u.exec(whole!)?.[1];
    if (wanted.test(whole!)) out.push(`${figure === undefined ? '' : `${figure}: `}${positional ?? hue ?? 'none'}`);
    if (self !== '/' && !VOID.has(name!)) stack.push({ name: name!, hue });
  }
  return out;
}
const files = renderLocalDossier(poleHueInput()).files;
const pages = ['index.html', 'poles/2.html', 'deep-dives/why-detail.html', 'deep-dives/words-detail.html'];
const result: Record<string, unknown> = {};
positionalCards = files.get('index.html')!.includes('ul.cards>li.card:nth-child(6n+1)');
for (const page of pages) {
  const html = files.get(page)!;
  result[page] = {
    cards: hues(html, /^<li class="card">$/u),
    figures: hues(html, /^<figure [^>]*data-visual-provenance="curated"/u),
    eyebrowsInColumn: hues(html.slice(html.indexOf('<main')), /^<span class="eyebrow">$/u),
  };
}
const css = files.get('index.html')!;
result['positionalHueRules'] = [...css.matchAll(/[^{}]*:nth-child\([^)]*\)[^{}]*\{[^{}]*--accent:[^{}]*\}/gu)].length;
console.log(JSON.stringify(result));
