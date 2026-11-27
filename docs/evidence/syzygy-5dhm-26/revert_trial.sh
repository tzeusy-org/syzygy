#!/usr/bin/env bash
# syzygy-5dhm.26: try A-338's withdrawal recipe in a scratch clone, adapted from docs/evidence/syzygy-5dhm-45/revert_trial.sh.
# Usage: revert_trial.sh <repo> <branch head> <scratch dir>
# Points the clone's origin/main at the shared repository's fetched origin/main (the checker reads it as protected main), merges the
# branch head into it with a merge commit (as the merge queue lands it), then reverts that merge with -m 1 while keeping the adoption
# ledger as it stands (it is append-only), and runs the reconciler and the scenario counter after each step. It also tries the
# specification-only revert of the tagged commit on the merged head and reports its conflicts, then aborts it.
set -u
repo=$1; head=$2; dir=$3
SPEC=44bddc50427adab06af55ad5cdc5c4098df9086b
rm -rf "$dir"
git clone -q --no-local "$repo" "$dir"
cd "$dir" || exit 1
git fetch -q "$repo" refs/remotes/origin/main:refs/remotes/origin/main
git -c advice.detachedHead=false checkout -q origin/main
git tag -l 'polaris-dossier-derived-base-views-v2.34' | xargs -r git tag -d >/dev/null
G="git -c user.name=trial -c user.email=trial@example.invalid"
LEDGER=.syzygy/governance/decisions/AGENT-ADOPTIONS.md
echo "== base $(git rev-parse HEAD)"
python3 scripts/check_spec_reconciliation.py --check 2>&1 | grep -E 'predicates'
$G merge -q --no-ff --no-edit "$head" && echo "== merged $(git rev-parse HEAD)"
python3 scripts/check_spec_reconciliation.py --check 2>&1 | grep -E '^(OK|FAIL|WARN) |^        |predicates' | grep -v 'pins sha'
python3 scripts/count_polaris_effective_scenarios.py 2>&1 | tail -1
merge=$(git rev-parse HEAD)
echo "== git revert $SPEC on the merged head (specification commit alone)"
if $G revert --no-commit "$SPEC" >/dev/null 2>&1; then echo "   applies cleanly"; else git status --porcelain | grep '^UU' | sed 's/^/   conflict: /'; fi
$G revert --abort 2>/dev/null || git reset -q --hard "$merge"
echo "== git revert -m 1 --no-commit $merge, keeping the ledger"
$G revert -m 1 --no-commit "$merge" 2>&1 | tail -3
git status --porcelain | grep '^UU' | sed 's/^/   conflict: /'
git checkout -q "$merge" -- "$LEDGER"
git add -A
$G commit -q -m "trial: withdraw v2.41 (revert -m 1 of $merge), ledger kept"
echo "== after revert $(git rev-parse HEAD); ledger as it stood: $(git diff --quiet "$merge" HEAD -- "$LEDGER" && echo yes || echo no); files changed: $(git diff --name-only "$merge" HEAD | wc -l)"
echo "== tree equals origin/main except the ledger: $(git diff --quiet origin/main HEAD -- . ":(exclude)$LEDGER" && echo yes || echo no)"
python3 scripts/check_spec_reconciliation.py --check 2>&1 | grep -E '^(OK|FAIL|WARN) |^        |predicates' | grep -v 'pins sha'
python3 scripts/count_polaris_effective_scenarios.py 2>&1 | tail -1
