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
