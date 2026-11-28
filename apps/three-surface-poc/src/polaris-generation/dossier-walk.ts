import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';

/** A figure walk's style rules (REQ-polaris-generation-034 version 2.40, syzygy-3efd.88), carried only by a page holding a walk. The layer
 * lies over the drawing from its top-left corner; it takes no pointer itself, and each box takes the pointer over its node, so the box's
 * outline stands for the drawing's own emphasis of a node under the pointer. The box a step's link names is outlined by `:target` alone, in
 * a dashed line, so the highlight is a shape and never a colour alone. A badge sits at its box's top left in the figure's 13 px text; a
 * box's source link fills its box; no box paints its interior, so the drawing shows through every one. */
export const WALK_FIGURE_CSS = `.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:${tokens.length.none};top:${tokens.length.none};`
  + `width:${tokens.length.full};height:${tokens.length.full};pointer-events:none}.walk-node{position:absolute;box-sizing:border-box;pointer-events:auto;`
  + `border-radius:${tokens.radius.hint}}.walk-node:hover{outline:${tokens.line.emphasis} solid var(--accent)}`
  + `.walk-node:target{outline:${tokens.line.emphasis} dashed var(--ink);outline-offset:${tokens.line.focus}}`
  + `.walk-badge{position:absolute;left:${tokens.length.none};top:${tokens.length.none};font-size:${tokens.type.walkBadge};font-weight:${tokens.type.strongWeight};`
  + `line-height:${tokens.type.compactLeading};padding:${tokens.spacing.none} ${tokens.spacing.labelInset};background:var(--panel);color:var(--ink);`
  + `border:${tokens.line.hairline} solid var(--accent)}.walk-source{position:absolute;left:${tokens.length.none};top:${tokens.length.none};`
  + `width:${tokens.length.full};height:${tokens.length.full};cursor:pointer}`;

/** The rules that position a layer over its drawing (REQ-polaris-generation-034 version 2.50): the wrapper the layer is placed against, the
 * layer from the drawing's top-left corner, each box at its stated position and size, and no box painting its interior. A page holding a
 * walk carries them once, inside `WALK_FIGURE_CSS`. */
export const LAYER_POSITIONING_CSS = `.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:${tokens.length.none};top:${tokens.length.none};`
  + `width:${tokens.length.full};height:${tokens.length.full}}.walk-node{position:absolute;box-sizing:border-box;border-radius:${tokens.radius.hint}}`;
/** The zoom rules (version 2.50): a zoom link at its box's top right in the figure's 13 px text, the pointer cursor over it, and a solid
 * outline offset from it while it has the keyboard focus, a shape and never a colour alone; it covers only its own corner of the box. */
export const ZOOM_LINK_CSS = `.zoom-link{position:absolute;right:${tokens.length.none};top:${tokens.length.none};font-size:${tokens.type.walkBadge};`
  + `font-weight:${tokens.type.strongWeight};line-height:${tokens.type.compactLeading};padding:${tokens.spacing.none} ${tokens.spacing.labelInset};`
  + `background:var(--panel);color:var(--ink);border:${tokens.line.hairline} solid var(--accent);text-decoration:none;cursor:pointer}`
  + `.zoom-link:focus-visible{outline:${tokens.line.emphasis} solid var(--ink);outline-offset:${tokens.line.focus}}`;
/** The pass-through rules (version 2.50): inside a `zoom-only` wrapper the layer and every box let the pointer through to the drawing, which
 * keeps its own emphasis of a node under the pointer, and only a zoom link takes it; the walk rules' outline under the pointer and `:target`
 * highlight are overridden there, by selectors more specific than theirs. */
export const ZOOM_PASS_THROUGH_CSS = '.zoom-only .walk-layer,.zoom-only .walk-node{pointer-events:none}'
  + '.zoom-only .walk-node:hover,.zoom-only .walk-node:target{outline:none}.zoom-only .zoom-link{pointer-events:auto}';

/** A page's layer rules: version 2.40's walk rules byte for byte where it holds a walk, else the positioning rules where it holds a zoom link;
 * then, where it holds a zoom link, the zoom and pass-through rules. */
export const figureLayerCss = (walk: boolean, zoom: boolean): string =>
  `${walk ? WALK_FIGURE_CSS : zoom ? LAYER_POSITIONING_CSS : ''}${zoom ? `${ZOOM_LINK_CSS}${ZOOM_PASS_THROUGH_CSS}` : ''}`;
