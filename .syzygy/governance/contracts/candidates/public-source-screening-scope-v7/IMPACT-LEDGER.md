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
  `FORBIDDEN_DIRECTIVES` and `pageSinkCspFinding` implement the new reading,
  with one fixture per row of the builder's table.
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
  opened. **[Unknown]** Hash-allowed inline scripts on `file://` have not been
  tried in this repository.
- `page-sink.test.ts` and its renderer contract. Provider and preview bytes stay
  pinned: the preview keeps its no-script policy.

## Not affected

Every detector, placement, class rule and consent. Butlers' reader takes the
same policy file; its pages are not rendered by this renderer. **[Inferred]**
from `apps/three-surface-poc/src/main.ts`'s import closure, which does not reach
the dossier renderer.
