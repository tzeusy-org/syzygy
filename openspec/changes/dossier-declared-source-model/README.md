# dossier-declared-source-model

Consolidate local dossier admission around declared sources, pinned objects and committed screening policy under D10; retain secret protections and independent review bindings.

Source package PR824 landed on the default branch2026-11-18. The specification2.0 tag is `polaris-dossier-declared-source-model-v2.0`; the append-only adoption record is [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md), A-4. That row names the reviewed specification, screening policy and four scoped contract-applicability judgments.

The replacement text remains unchanged at `proposed/polaris-generation/spec.md`. Its candidate-era banner is historical; applicability comes from the adoption record, never its filename or banner. This is an explicit five-ID MODIFIED overlay after the existing Polaris additions. The effective composition is checked independently by ID and requirement name, including046's renamed title. Other additions remain ADDED-only. No source/provider admission path reads adoption metadata.

F-1 remains open until the adoption tail's actual default landing and verification. URL/default acquisition and execution orchestration (F-3), reader build identity (F-4) and generic ceremony retirement (F-5) remain separate.

## Rollback after an owner veto

Keep A-4 as history and append a new row recording the veto after the rollback lands; a vetoed change is not adopted again without the owner. The source landing is a merge commit, so its recorded reversal selects mainline1.

First reverse this tail's eleven operative paths using PR825's actual merge delta. This removes its composition hooks and restores the source-era routes/census without deleting the adoption ledger or later evidence. Then apply A-4's source reversal. Use a clean branch; changes made after this tail may require conflict resolution. Inspect the staged changes before committing the rollback and record its actual landing in the new veto row.

```sh
set -euo pipefail
tail_merge="$(gh pr view 825 --repo tzeusy-org/syzygy --json mergeCommit --jq '.mergeCommit.oid')"
test "$tail_merge" != null
git diff --binary "$tail_merge^1" "$tail_merge" -- \
  PROJECT-STATUS.md docs/evidence/spec-readability-reconciliation-2026-10-02/census.json \
  openspec/README.md openspec/changes/dossier-declared-source-model/README.md \
  openspec/changes/dossier-declared-source-model/tasks.md \
  scripts/check_spec_reconciliation.py scripts/build_polaris_dependency_unions.py \
  scripts/prepare_three_surface_poc_governedby_reference_recording.py \
  scripts/count_polaris_effective_scenarios.py \
  scripts/build_polaris_dossier_local_agent_mode.py \
  scripts/build_polaris_dossier_launch_consent.py | \
  git apply --reverse --index
git revert --no-commit -m 1 182a703b2dbae97a16ae7334cd84a32b634cedc0
git diff --cached --stat
```

The last reversal is the row's recorded command with `--no-commit` to permit inspection; after review, commit and land the rollback, then append its veto record. This procedure is Git rollback guidance, not a new adoption recorder or an execution/admission gate.
