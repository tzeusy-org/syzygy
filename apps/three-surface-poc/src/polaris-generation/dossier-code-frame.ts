import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';

/** A numbered code excerpt's style rules (REQ-polaris-generation-034 version 2.54, syzygy-3efd.33), carried only by a page holding a
 * `code-frame` element. The frame is one grid that scrolls as one: the gutter in its first column, the excerpt's `<pre>` and the bands in
 * the same cell of its second, so each number and each band sits on the line it names at every width and scroll by construction. The three
 * `<pre>`s and the excerpt's `code` elements share one font, size and line height; the `<pre>`s share one vertical padding and carry no
 * vertical border or margin, the frame carrying the border, margin and background. The excerpt's `code` elements lay out inline, so a
 * quotation part ending inside a line does not break it. Each band is painted above the frame's background and below the excerpt's text:
 * the excerpt's `<pre>` paints no background and, positioned where the bands are not, is painted after them. A highlighted line's number is set heavier, never told apart by
 * colour alone. */
export const CODE_FRAME_CSS = `.code-frame{display:grid;grid-template-columns:max-content minmax(max-content,${tokens.length.fraction});grid-template-areas:"gutter lines";`
  + `margin:${tokens.spacing.small} ${tokens.spacing.none};overflow-x:auto;background:var(--d-surface-2);border:${tokens.line.hairline} solid var(--line);`
  + `border-radius:${tokens.radius.callout}}`
  + `figure.code-excerpt .code-frame>pre{grid-area:lines;margin:${tokens.spacing.none};border:${tokens.line.none};border-radius:${tokens.line.none};`
  + `background:none;overflow:visible;padding:${tokens.spacing.medium} ${tokens.spacing.standard};font:${tokens.type.helper}/${tokens.type.bodyLeading} var(--font-mono);`
  + `white-space:pre;position:relative}`
  + `figure.code-excerpt .code-frame>pre code{display:inline;font:inherit;white-space:pre}`
  + `figure.code-excerpt .code-frame>pre.code-gutter{grid-area:gutter;position:static;padding-right:${tokens.spacing.small};text-align:right;color:var(--muted);user-select:none}`
  + `figure.code-excerpt .code-frame>pre.code-bands{padding-left:${tokens.spacing.none};padding-right:${tokens.spacing.none};user-select:none;pointer-events:none;position:static}`
  + `.code-band{display:inline-block;width:${tokens.length.full};background:var(--d-warn-tint)}`
  + `.code-number.code-highlighted{font-weight:${tokens.type.strongWeight};color:var(--ink)}`
  + `.code-note-mark{color:var(--accent);font-weight:${tokens.type.strongWeight}}`
  + `.code-highlights,ol.code-notes{margin:${tokens.spacing.small} ${tokens.spacing.none};font-size:${tokens.type.small}}`;

/** The bytes at which a browser may break or join lines where Syzygy's line count does not: a carriage return no line feed follows, a line
 * tabulation, a form feed, U+0085, U+2028 and U+2029. An excerpt holding one renders with no frame. */
export const CODE_LINE_BREAK_UNCERTAIN = /\r(?!\n)|[\u000B\u000C\u0085\u2028\u2029]/u;
