Verdict: REVISE
Reviewed commit: b524ea4968aa96ab6fd3133d4db7dff103b949c5
Reviewer: independent fresh-context session
Date: 2026-11-06

Findings 1–4 block confirmation. Each one reproduces at HEAD in a scratch copy, using the app's own CDP browser driver. The worktree was not touched and is still clean at this commit. The Redis run on disk predates this commit, so nothing below comes from a re-render of real prose.

## Findings, most severe first

**1. New regression, not caught by any test: on the readable form, edge lines strike through node labels and other edges' labels.** [Observed]
- `diagram-layout.ts:237` now draws `${nodes}${edges}` when `labelsOnTop` is set. That order applies to paths as well as label boxes.
- `diagram-layout.ts:149-154` routes a same-row skip as a straight line at node centre height.
- Rendered n0→n1→n2→n3 plus n0→n3: the path `M 224 52 C 723 52, 723 52, 1222 52` is drawn over "Node n1" and "Node n2" and through the n1→n2 and n2→n3 label text. A screenshot confirms it.
- The old order hid this line behind the boxes. The same ordering applies to a back edge leaving an upper-row node, whose path can cross lower-row nodes [Inferred].
- Every check compares label boxes with node rects, so path-over-text and label-over-label are both unpinned (`diagram-layout.test.ts` shapes, browser `INTERSECTIONS`).

**2. Finding 10 (diagram scale floor) is not repaired.** [Observed]
- `dossier-site.ts:160`, `.diagram-scroll svg{max-width:max(100%,860px)}`, is a width cap, not a legibility floor. Any wider diagram shrinks to fit, and the source comment "down to a legible size, then scrolls" is false for those.
- Measured with `svg text` at 13px and a 1848 px wide loop diagram (five layers):

| Viewport | Effective text size |
|---|---|
| 1440 px | 6.8 px |
| 1920 px | 7.6 px |
| 390 px | 6.05 px |

- Loops, skips and fans are the shapes that stay on one band and "scroll" (`diagram-layout.ts:115-121`), so they are hit hardest. Wider ones shrink further.
- No mutant in the record targets this rule (0 hits for the literal), and no test measures rendered text size.

**3. Finding 3 (labels on nodes) is only partly repaired.** [Observed]
- `diagram-layout.ts:117-121` allows bands when the crossing edge joins two lone nodes, but never checks the height of the other columns in that band.
- The hand-off label sits at the midpoint of the gap (`diagram-layout.ts:142-146`).
- Failing case: a→{m1,m2,m3}→x→y→z. The x→y label box (435.1, 277.5, 177.9×51) lands on node m3 (424, 264, 200×56), and the browser reports 1 collision at 390, 1440 and 1920 px. Its path crosses the same region.
- No fixture in `SHAPES` has a tall column in a band that wraps. "Loop over a tall middle layer" stays on one band, and "fan inside one band" has only two layers.

**4. Finding 4 (focus ring) is repaired only for the collapsed state; the default open state is clipped.** [Observed]
- `dossier-site.ts:158` sets `overflow:visible` only on `.nav-panel:not([open])`. The panel renders `open`, and `.contents` keeps `overflow:auto`.
- The summary rect equals the panel's left, top and right edges, and the outline is 3px at offset 5px.
- A screenshot with `:focus-visible` confirmed shows only the bottom edge of the ring. The first keyboard stop in the navigation therefore has a ring clipped on three sides.
- The browser test checks overflow only after folding (`dossier-reading.browser.test.ts:48`).

**5. Finding 10 (size report) is repaired by an undisclosed subtraction.** [Observed]
- `dossier-site.ts:594` removes popup bytes as well as words. The comment there says the report "states what a reader loads and reads", but those bytes are loaded.
- `dossier-site.ts:606` still reads "Measured from the rendered bytes… each page is measured without its review-status region", with no mention of glossary entries.
- On the fixture variant, `index.html` is 56,730 bytes and the report says 54,754. That gap also includes the disclosed region removal; I did not separate the two.
- Fix by disclosing the removal, or by excluding popups from words only.

**6. Finding 5: overflow, table clipping and hover are repaired, but three parts are not.**
- **Hoverable:** [Observed] the popup opens about 3.9 px below the term. Moving the pointer down with real CDP mouse events gives `block` on the term, `none` at +2 px and `block` on the popup. A slow pointer loses the entry before reaching it. On a late term at 1440 px the term spans x 351–406 and the popup x 351–703; on a longer line the popup would sit further left of the term [Inferred].
- **Tooltip semantics:** [Observed] `dossier-site.ts:319` emits no `role` and no `aria-describedby`, and the `aria-label` replaces the link's content. A keyboard screen-reader user who focuses the term gets only "replica, glossary entry", while a sighted user sees the entry. RFC7-34 recoverability is met through the link to the glossary entry, so this is not a contract breach, but it was not repaired.
- **Esc deferral:** acceptable, with two corrections.
  - `syzygy-pdja.5` does not carry it. A search of its text for esc, dismiss and 1.4.13 finds nothing relevant. Only the record's `notCovered` at line 804 mentions it, so it needs to go on that bead. [Observed]
  - The stated reason, "without a script", overstates the constraint. Native `popover`/`popovertarget` dismisses on Esc with no script, and the bead names HTML popover as an option. It would change the interaction, so deferring is defensible, but the reason should say that. [Inferred, no-script behaviour not run here]

**7. Finding 7 (tests claiming more than they pin) is partly repaired.** [Observed]
- `dossier-reading.test.ts:126-130`, "opens an entry on hover… dims a withheld marker", only checks stylesheet substrings. No test hovers a term or reads a computed colour on a marker, and `entry-not-on-hover` and `marker-not-dimmed` die only on that literal text.
- My own mouse probe shows the hover rule does work; the gap is in the test. `notCovered` discloses only diagram hover, not term hover.
- `dossier-reading.test.ts:20`, "shows a source identifier only in the source page identity details…", excludes source pages from its sweep and never checks a source page's visible text outside the details.
- The page denominator (line 24) is pinned, but to six fixture pages. The real run also has discovery, clarifications, executions and review pages and deep dives, none of which the fixture exercises.

**8. Finding 8 (mutation record) is mostly repaired, with one residual.** [Observed]
- **Digests:** the `subjectDigests` match HEAD for both files, and `dossier-site.ts` hashes the same at all three recorded commits.
- **Fragments:** all 47 `old` fragments apply exactly once at HEAD.
- **Independent re-run:** I re-ran all 47 at HEAD's tests in scratch. Result: 47 killed, 0 survived, baseline 93 tests passing. Kills are by exit code only.
- **Residual:** the record does not show this itself. Most entries name `a5ba6a1`, and the tests and testkit changed after that commit (`dossier-reading.test.ts`, testkit, `diagram-layout.test.ts`). The record's anchor covers source digests only, and no test digest or runner command is stored. Add both, and re-record at the final bytes.

**9. Scope remainder from the bead's hex-id point, not stated in the commit.** [Observed]
- `packages/polaris-dossier/src/render.ts:543` still renders full object and revision hashes in discovery's "Read by this render". In the pre-change Redis run that page has 77 40-hex tokens and 0 `src-` tokens.
- The acceptance test ("no visible src-<hex>") is met, and the hash may be the subject of that section, as the bead allows. The commit message should say that this was decided.

**10. Glossary popups show an entry without its citation.** [Inferred, low severity]
- `dossier-site.ts:319` renders text and marking only. `sourceIds` stay on the glossary page, one link away.
- Finding 2's listed items are met, so I do not count this as a breach.

**11. Same family as finding 1: a skip's label lands on its neighbour's label.** [Inferred]
- `diagram-layout.ts:155` places a skip label at (x1+gapX/2, y1). That is the same point as the sibling edge's midpoint when both leave one node and the target is on the same row.
- In the skip fixture the n0→n1 and n0→n3 boxes coincide at x=323. The text was identical there, so it hid the overlap; differing labels would overprint. Not pinned by any test.

## Repaired on inspection

| Prior finding | Result |
|---|---|
| 1. RFC5-17 / RFC7-34 | Repaired. The count is visible as `[n]†N` and in the accessible name, tooltip and `data-redacted-lines`, with one legend per page using it, on every page built through `add`. Source page and `sources/index` counts are kept. |
| 2. RFC7-33 | Repaired. Entries carry marking and `data-epistemic` and are listed in `machine.json`. Unknown terms and non-normative blocks link nothing. |
| 6. Quotation test | Repaired. The quotation is the only use of both terms in its section, and the mutant dies. Source pages and the glossary carry no term link. |
| 9. Term matching | Repaired for the plural, capitalised, upper-case and hyphen-free forms, file names and collapsed first use. Wrong-sense matching on everyday words stays disclosed in `notCovered`, as does the fact that real Redis prose was never rendered. |
| CSP / no script | The test and all my probe pages ran under the page CSP. `pageSinkCspFinding` is null on every fixture page per that test, which I ran at HEAD. |

I did not run `npm run check:all`.
