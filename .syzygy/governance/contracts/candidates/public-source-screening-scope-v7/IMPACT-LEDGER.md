# Impact ledger — public-source screening scope, version 7

> **Candidate — binds nothing.** Drafted 2026-11-06 (`syzygy-pdja.5`). It names
> what an act over this package's row would break or require. The install is
> separate work after the act and is not part of this package.

## Method

At this package's base (`origin/main` when the branch was cut), `git grep` over
`packages/`, `apps/` and `scripts/` (and `PROJECT-STATUS.md`, `.github/`) for:

- the version-6 version literal, `1.7.0-public-source-candidate…v6-p`: 18 lines
  outside the screening-scope builders, in 11 tracked files;
- the version-6 act file name, `…PUBLIC-SOURCE-SCOPE-V6-ACT.md`: 8 files outside
  the builders.

Figures are re-derived by those two sweeps, never carried; re-run them at the
install commit.

## What an act requires, in one landing

A policy act without its install turns `main` red, so these land together:

- `packages/polaris-generation-core/src/public-source-classification.ts`:
  `EXEMPTION_TEXTS.renderCondition` accepts the new text's digest;
  `pageSinkCspFinding` implements the closed set, replacing `FORBIDDEN_DIRECTIVES`,
  and splits on ASCII whitespace only, with one fixture per row of the builder's
  table.
- `packages/polaris-dossier/src/render.ts`: a new `PAGE_SINK_CONTRACT` id declares
  the script half, so the current id with a `script-src` is unconfirmed. Each page
  is checked: every `<script>` has no `src` and hashes to the renderer's pinned set.
- `apps/three-surface-poc/src/governance-inputs.ts` and
  `packages/three-surface-poc-core/src/git-object-reader.ts`: act records and
  policy identity, as the version-6 install changed them. Both are under the
  surface merge freeze paths: the install cannot land while
  `scripts/surface-merge-freeze.json` is frozen.
- The version literal's test readers, the recorder and its battery lines.
- A version-7 act recorder, written after a confirming review.

## What the feature then requires, separately

- A dossier spec version replacing the no-script text; signed by the owner.
- The script, its hash in `DRAFT_PREVIEW_CSP_META`'s dossier counterpart, tests
  with scripts on and off, and a run over `file://`, which is how pages are
  opened. **[Observed]** Round 1 of review ran a hash-allowed inline script over
  `file://` on Chrome 120; **[Unknown]** other browsers are untried.
- Tests for the judged limbs: scripts-on against scripts-off DOM text on a canary;
  a request listener sees no connection or navigation; a storage dump holds no page
  text; a page with ids that clobber the script's lookups; a fragment holding markup.
- `page-sink.test.ts` and its renderer contract. Provider and preview bytes stay
  pinned: the preview keeps its no-script policy.

## Not affected

Every detector, placement, class rule and consent. Butlers' reader takes the
same policy file; its pages are not rendered by this renderer. **[Inferred]**
from `apps/three-surface-poc/src/main.ts`'s import closure, which does not reach
the dossier renderer.
