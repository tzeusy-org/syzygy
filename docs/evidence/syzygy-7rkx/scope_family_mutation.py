"""Rule-6 run over the per-run scope and the family pool (syzygy-7rkx).

Usage: python3 scope_family_mutation.py <checkout root> <out.json> [--selftest]

Each mutant replaces fragments that each occur exactly once in
scripts/check_spec_reconciliation.py, runs scope_family_harness.py (and, with
--selftest, `check_spec_reconciliation.py --selftest`, SELFTEST_WORKERS from
the environment), and restores the file in `finally`. A mutant is killed when
the harness exits 1 (or the selftest exits non-zero); the record keeps each
mutant's fragments, the harness's FAILED lines and verdict, and the commit and
subject digest it ran at. The unmutated baseline runs first and must pass.
"""
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2])
with_selftest = "--selftest" in sys.argv[3:]
target = root / "scripts/check_spec_reconciliation.py"
harness = Path(__file__).resolve().parent / "scope_family_harness.py"

MUTANTS = [
    ("scope-keeps-memo", "the scope does not reset the memo between runs", [
        ("    global _SIGNED_MEMO, _RUN_MEMO\n    _SIGNED_MEMO = {}\n    _RUN_MEMO = {}\n    import d10_supersession",
         "    global _SIGNED_MEMO, _RUN_MEMO\n    _SIGNED_MEMO = {} if _SIGNED_MEMO is None else _SIGNED_MEMO\n"
         "    _RUN_MEMO = {} if _RUN_MEMO is None else _RUN_MEMO\n    import d10_supersession"),
        ("    finally:\n        _SIGNED_MEMO = None\n        _RUN_MEMO = None\n        d10_supersession.state = d10_state",
         "    finally:\n        d10_supersession.state = d10_state")]),
    ("families-share-worker", "state leaks across families in a worker (no fresh fork per family)", [
        ("            workers, maxtasksperchild=1 if fresh else None) as pool:",
         "            workers, maxtasksperchild=None) as pool:")]),
    ("merge-out-of-order", "results are merged in completion order", [
        ("        return pool.map(function, range(count), chunksize=1)",
         "        return list(pool.imap_unordered(function, range(count), chunksize=1))")]),
    ("drop-family-failures", "a family's failures are dropped when it records no witness", [
        ("        failures.extend(failed)",
         "        if found:\n            failures.extend(failed)")]),
]


def run(cmd, timeout):
    begun = time.monotonic()
    done = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=timeout)
    return done, round(time.monotonic() - begun)


def check():
    done, seconds = run([sys.executable, str(harness), str(root)], 1800)
    lines = done.stdout.splitlines()
    result = {"harnessExit": done.returncode,
              "harnessFailed": [line for line in lines if line.startswith("FAILED ")],
              "harnessVerdict": next((line for line in lines if line.startswith("HARNESS ")),
                                     done.stderr.strip().splitlines()[-1:] or ""),
              "harnessSeconds": seconds}
    if with_selftest:
        done, seconds = run([sys.executable, "scripts/check_spec_reconciliation.py", "--selftest"],
                            7200)
        tail = done.stdout.strip().splitlines()[-1:] or done.stderr.strip().splitlines()[-1:]
        result.update(selftestExit=done.returncode, selftestVerdict=tail[0] if tail else "",
                      selftestSeconds=seconds)
    return result


def killed(result):
    return result["harnessExit"] == 1 or result.get("selftestExit", 0) != 0


original = target.read_bytes()
commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True,
                        text=True, check=True).stdout.strip()
record = {"format": "mutation-run/1", "ranAt": datetime.now(timezone.utc).isoformat(),
          "commit": commit,
          "subject": {"scripts/check_spec_reconciliation.py": hashlib.sha256(original).hexdigest()},
          "method": __doc__.strip(), "withSelftest": with_selftest}
record["baseline"] = check()
print("baseline", record["baseline"]["harnessVerdict"], flush=True)
if killed(record["baseline"]):
    record["mutants"] = []
    out.write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8")
    sys.exit("baseline does not pass")
record["mutants"] = []
try:
    for mid, what, fragments in MUTANTS:
        text = original.decode("utf-8")
        for old, new in fragments:
            assert text.count(old) == 1, (mid, old)
            text = text.replace(old, new)
        target.write_bytes(text.encode("utf-8"))
        result = check()
        entry = {"id": mid, "what": what,
                 "fragments": [{"old": o, "new": n} for o, n in fragments],
                 **result, "outcome": "killed" if killed(result) else "SURVIVED"}
        record["mutants"].append(entry)
        print(mid, entry["outcome"], entry["harnessFailed"], flush=True)
finally:
    target.write_bytes(original)
out.write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8")
survived = [m["id"] for m in record["mutants"] if m["outcome"] != "killed"]
print(f"{len(record['mutants']) - len(survived)} of {len(record['mutants'])} mutants killed"
      + (f"; survived {survived}" if survived else ""))
sys.exit(1 if survived else 0)
