# R-MEA10-RENDER-READABILITY-9070-1
Verdict: REVISE
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: 9070f7a05ccc88f492a63f527ed0dd25ec0b9a2e

Checks run in the worktree at 9070f7a0, which was clean. `npx tsc --noEmit -p .` exited 0. `npx vitest run packages/polaris-dossier/src/render.test.ts apps/three-surface-poc/src/polaris-generation packages/polaris-generation-core` passed 48 of 48 files and 1240 of 1240 tests, including the provider golden test. `git show 9070f7a0:apps/three-surface-poc/src/polaris-generation/dossier-site.ts | sha256sum` gives d135fa8f810720c8b9f27d61b1a806e6a0ce845c35ef3be37610c29387711d8a, which equals the mutant record's `subjectSha256`. The record lists 12 mutants, each with its old and new fragment, and all 12 are killed.

**P1 (blocking): the light variant makes table cells unreadable.** The shared tokens set `table { … background: #091416; … }` (apps/three-surface-poc/src/design-tokens.ts:323). The dossier theme's table rule (apps/three-surface-poc/src/polaris-generation/dossier-site.ts:129) never resets that background. Under `prefers-color-scheme: light` (dossier-site.ts:114), `td` text takes `--ink:#1f1e1d` on #091416, which computes to 1.12:1. Links in those cells compute to 3.5:1. Every operator-agent run has this problem on its size-report tables (dossier-site.ts:436-437, which render with `chrome`). The `th` cells are fine, because they get `--panel-raised`. This is a new defect against criterion 6, and it falls inside goal (a)'s light variant. Fix: add `background:var(--panel)` (or `transparent`) to the theme's `table` rule. In dark mode those cells keep a cool #091416 inside the warm palette, which is cosmetic only.

**P2 (non-blocking): two light-variant colours fall just short of AA.** In light mode, `--amber:#a35f00` is used as text in `.pipeline-notice` (draft-preview.ts:19, 0.8rem). On its new `--d-info-tint:#eef2fb` background it computes to 4.47:1, under 4.5. `--observed` and `--amber` fall to 4.43–4.49:1 on `#f3f1ea`/`#eef2fb`. Today they appear there only as borders [Inferred, from a grep of every `color:var(--…)` site]. Criterion 4's own requirement, the dark background, is met. Computed minimums over `--void`, `--panel`, `--panel-raised` and the four tints:

| Colour | Minimum contrast |
|---|---|
| ink | 11.38 |
| muted | 5.24 |
| link (`--cyan`) | 5.53 |
| observed | 6.14 |
| amber | 6.12 |
| proposed | 6.07 |

Every callout keeps its text label, so no meaning rests on colour alone.

**P3 (non-blocking): the focus ring colour equals a claim colour.** The theme sets `--focus:#8fb0f0`, the same value as `--proposed` (dossier-site.ts:111). The design-tokens comment (design-tokens.ts, beside `--focus`) records this collision class as a VIS-7 defect, S11-F2. On dossier pages `--proposed` currently colours only a callout border, never a claim [Inferred]. Give `--focus` its own value.

**P4 (non-blocking): the source number has no visible key on the page.** The path appears only in `aria-label` (screen readers) and `title` (hover only, dossier-site.ts:228). A sighted keyboard reader sees "[1]" and has to follow the link to learn which source it is. This is still discoverable, since the link opens the source page (DESIGN-ACCEPTANCE "Depth and evidence"), and the old visible text did not show the path either, so nothing regresses. A per-page source list would close the gap.

**P5 (non-blocking): RFC7-10 form, criterion 1 holds.** The clause relied on (polaris-dossier-local-agent-mode spec.md, about 245 + 0): "Each anchor SHALL take RFC7-10's form: the target class is an evidence artifact identifier with integrity digest, whose identifier is the blob's object identifier as Syzygy recomputed it … the optional fragment is the byte range of the span; the target state is the pinned revision. The repository path is shown beside it as a label, never as its identity." The Observable list names "the rendered quotations, anchors … and source pages". All of these fields survive:
- The quote link still carries `anchorAttributes` (class, identifier, algorithm, fragment, target state).
- The source page still renders `anchorDetails` with the full `algorithm:identifier`, range and revision (dossier-render-local.ts:39-44).
- The machine view's quotations still carry `anchor`.
- The accessible name keeps the byte range or "whole file".

Only a 12-hex prefix left the visible text, so no required information is lost.

**P6 (non-blocking): scanner, criterion 2 holds, with a test gap.** `attrs.get('data-source-id') ?? /^Read source (.+)$/` (dossier-page-scan.ts:121) keeps the draft-preview path (draft-preview.ts:55). Provider-mode `refs` is unchanged (dossier-site.ts:227), so the `Read source` rewrites in dossier-quote-fidelity.test.ts:61 and :113 still apply to the pages they render. No producer other than the dossier emits `data-source-id`; a grep of apps/ and packages/ found these two in dossier-site.ts only (lines 228 and 249).

There is a behaviour change on operator-agent pages. `evaluateDossier`'s in-block quote check (dossier-evaluation.ts:159-160) reads `claim.text` with tags removed, so the backticks consumed by `<code>` no longer appear in that text. Agent prose that quotes source text containing backticks inside straight quotes would now be reported as `quote-not-in-cited-sources`. The size report's word counts also shift.

Two gaps remain:
- No unit test in polaris-generation-core covers the `data-source-id` branch, an empty value (`''` does not fall back) or the precedence when both forms are present.
- The mutant record covers only dossier-site.ts, not the scanner.

**P7 (non-blocking): `prose()` cannot inject markup, criterion 3 holds.** `escape` (draft-preview.ts:23) runs first and leaves backticks alone. The replacement wraps the already-escaped capture in a bare `<code>` with no attributes.

`prose` is reached only from:
- prose segments (dossier-site.ts:242)
- local `item` text (dossier-site.ts:268)

Titles, details, the unknown reason and basis, quotations, exact-source text and every attribute value still go through `escape`. The CSP and page-sink tests pass.

One inconsistency: `entry.details` and diagram text are still plain `escape`, so a backtick pair there stays literal.
