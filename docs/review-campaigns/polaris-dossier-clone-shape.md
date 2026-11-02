# Polaris dossier clone shape

## Patterns

- `R-POLARIS-DOSSIER-CLONE-SHAPE-.*\.md`

## What was under review

Pre-merge review of preflight's clone commands and init's clone-shape check, `packages/polaris-dossier/src/{preflight,clone-shape,init,git-object-reader}.ts` (PR #392, `syzygy-qkea.24`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-POLARIS-DOSSIER-CLONE-SHAPE-1-RAW.md:2`) over `1a45e1ae`: two revise findings (`commondir` and `modules/` inside `.git` pass unread; `objects/info/alternates` and `http-alternates` are not refused) and eleven notes, repaired in the same PR by turning the `.git` scan into an allowlist, with notes N1–N5 and N7–N9 (N10 needed no change); note N6 (a reftable clone is refused at the head stage, failing closed, before this PR) is left; note N11 (line 37 of the change's `design.md` still shows a full clone) goes to `syzygy-qkea.18`'s amendment list. Round 2 `REVISE` (`R-POLARIS-DOSSIER-CLONE-SHAPE-2-RAW.md:2`) over `41c334ba`: two revise findings (`config` is admitted unread, so promisor, include, `core.hooksPath` and `core.fsmonitor` settings let the agent's git fetch or run what was never consented; an empty `branches/` left by gits older than about 2.49 is refused) and six notes, repaired in the same PR by reading `config` bounded and admitting only the `[core]` keys `git init` writes, and by admitting an empty `branches/`, with notes 3–5 (and 6–7 through the config allowlist); note 8 (an absent `refs/`, `hooks/` or `logs/HEAD` passes, failing closed on the agent's side) is left
