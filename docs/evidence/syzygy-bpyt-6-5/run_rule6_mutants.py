#!/usr/bin/env python3
"""Rule-6 run for syzygy-bpyt.6.5: apply each mutant alone, run the
@syzygy/three-surface-poc-core suite, restore, and record the outcome.

Usage: run_rule6_mutants.py MUTANTS.json OUT.json   (from the repository root,
on a clean tree; TMPDIR should be short). Rewrites sources in place while it
runs and restores each file byte-for-byte; never edit while it runs.
"""
import json
import pathlib
import re
import subprocess
import sys


def main(mutants_path: str, out_path: str) -> int:
    mutants = json.loads(pathlib.Path(mutants_path).read_text(encoding="utf-8"))
    head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(["git", "status", "--porcelain", "--", "packages"], capture_output=True, text=True, check=True).stdout
    if dirty:
        raise SystemExit(f"packages/ is not clean at {head}:\n{dirty}")
    results = []
    for mutant in mutants:
        path = pathlib.Path(mutant["file"])
        original = path.read_bytes()
        text = original.decode("utf-8")
        count = text.count(mutant["old"])
        if count != 1:
            results.append({**mutant, "outcome": "not-applied", "occurrences": count})
            continue
        path.write_text(text.replace(mutant["old"], mutant["new"]), encoding="utf-8")
        try:
            run = subprocess.run(
                ["npx", "vitest", "run", "--project", "@syzygy/three-surface-poc-core"],
                capture_output=True, text=True,
            )
        finally:
            path.write_bytes(original)
        output = run.stdout + run.stderr
        failed = sorted(set(re.findall(r"^\s*(?:×|✗) (.+?)(?: \d+ms)?$", output, re.M)))
        tests_line = next((line.strip() for line in output.splitlines() if line.strip().startswith("Tests ")), "")
        files_line = next((line.strip() for line in output.splitlines() if line.strip().startswith("Test Files ")), "")
        killed = run.returncode != 0 and len(failed) > 0
        results.append({**mutant, "outcome": "killed" if killed else ("survived" if run.returncode == 0 else "errored"),
                        "exitCode": run.returncode, "testFiles": files_line, "tests": tests_line, "failingTests": failed[:12]})
        print(mutant["id"], results[-1]["outcome"], tests_line, flush=True)
    record = {
        "subject": "syzygy-bpyt.6.5 reader predicates",
        "commit": head,
        "mutantsFile": mutants_path,
        "suite": "npx vitest run --project @syzygy/three-surface-poc-core",
        "mutants": len(results),
        "killed": sum(1 for r in results if r["outcome"] == "killed"),
        "survived": [r["id"] for r in results if r["outcome"] == "survived"],
        "notKilledOrApplied": [r["id"] for r in results if r["outcome"] not in ("killed", "survived")],
        "results": results,
    }
    pathlib.Path(out_path).write_text(json.dumps(record, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0 if record["killed"] == len(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
