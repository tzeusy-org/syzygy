#!/usr/bin/env python3
"""Compare the edits of the PR #546 tool's mutants with the tools it says it
copied byte for byte (R-GP-IMPL-GEN-PLAN-TEST-1).

usage: python3 -I compare_edits.py <clone>

R1-R8 against docs/evidence/gen-mutation-plan-review-2026-10-27/r1/tools/
own_test_mutants.py; T1-T7 against docs/evidence/syzygy-kpbq/
plan_test_mutants.py. The modules are loaded by path and their MUTANTS lists
compared as Python values (file -> list of (old, new) pairs). A tool whose
MUTANTS rows carry the edits in another position is located by the first
dict-valued field; the kpbq tool's rows carry a bare list of (old, new) pairs
on the plan, which is compared as {PLAN: pairs}.
"""
import importlib.util
import os
import sys

PR_TOOL = "docs/evidence/syzygy-vsqr/test_mutants.py"
SOURCES = {
    "docs/evidence/gen-mutation-plan-review-2026-10-27/r1/tools/own_test_mutants.py": ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
    "docs/evidence/syzygy-kpbq/plan_test_mutants.py": ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
}


def load(clone, rel, name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(clone, rel))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"


def edits_of(row):
    for field in row:
        if isinstance(field, dict):
            return field
    return {PLAN: next(field for field in row if isinstance(field, list))}


def main(clone):
    pr = {row[0]: edits_of(row) for row in load(clone, PR_TOOL, "pr_tool").MUTANTS}
    for index, (rel, ids) in enumerate(SOURCES.items()):
        source = {row[0]: edits_of(row) for row in load(clone, rel, f"source_{index}").MUTANTS}
        for mutant_id in ids:
            same = source.get(mutant_id) == pr.get(mutant_id)
            print(f"{mutant_id} {'equal' if same else 'DIFFERENT'} ({rel})")
    return 0


if __name__ == "__main__":
    sys.exit(main(os.path.abspath(sys.argv[1])))
