#!/usr/bin/env python3
"""For each generation-mutation-gate run id in a TSV (id first column), fetch
the run log with `gh run view --log` and report the count of `killed` and
`SURVIVED` lines from the mutation step, the ordered mutant ids, and every
`expected exactly one occurrence` line. Reviewer tool for
R-GP-IMPL-GEN-MUTATION-PLAN-1. Writes one JSON object per run to stdout.

usage: sweep_gate_logs.py <runs.tsv>
"""
import json
import re
import subprocess
import sys

KILLED = re.compile(r"\s(killed  |SURVIVED) (\S+) \((\d+) failing")
FRAGMENT = re.compile(r"expected exactly one occurrence of the fragment, found \d+")
SUMMARY = re.compile(r"summary: \d+/\d+ killed, \d+ survived, \d+ restore failures")
BASELINE = re.compile(r"baseline: \d+/\d+ passed; \d+ mutations")


def main() -> int:
    for row in open(sys.argv[1]):
        cols = row.rstrip("\n").split("\t")
        run_id, event, conclusion, created, sha = cols[:5]
        log = subprocess.run(["gh", "run", "view", run_id, "-R", "Tzeusy/syzygy", "--log"],
                             capture_output=True, text=True).stdout
        lines = log.splitlines()
        mutants = [(m.group(1).strip(), m.group(2), int(m.group(3))) for line in lines
                   for m in [KILLED.search(line)] if m]
        fragment_lines = [l for l in lines if FRAGMENT.search(l)]
        fragment_ids = [re.search(r"(\S+): expected exactly one", l).group(1) for l in fragment_lines]
        print(json.dumps({
            "run": run_id, "event": event, "conclusion": conclusion, "created": created, "sha": sha,
            "logLines": len(lines),
            "baseline": [BASELINE.search(l).group(0) for l in lines if BASELINE.search(l)],
            "killed": sum(1 for k, _, _ in mutants if k == "killed"),
            "survived": sum(1 for k, _, _ in mutants if k == "SURVIVED"),
            "mutantIds": [i for _, i, _ in mutants],
            "fragmentErrorLines": len(fragment_lines),
            "fragmentErrorIds": fragment_ids,
            "summary": [SUMMARY.search(l).group(0) for l in lines if SUMMARY.search(l)],
        }))
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
