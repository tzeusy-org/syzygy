"""Rule-6 run of scripts/test_reconciliation_pool.py over the scope and the pool (syzygy-7rkx).

Usage: python3 pool_mutation.py <checkout root> <out.json>

Supersedes scope_family_mutation.py and its synthetic harness after review
R7RKX (docs/reviews/syzygy-7rkx/R7RKX-REVIEW-RAW.md): the controls now live in
scripts/test_reconciliation_pool.py, which CI runs beside the selftest.

Each mutant replaces fragments that each occur exactly once in
scripts/check_spec_reconciliation.py, runs the test file (unittest, 300 s
bound), and restores the file in `finally`. A mutant is killed when the tests
exit non-zero or overrun the bound (a hang is a failure). The kills are by
these tests alone; `--selftest` is not run under any mutant, because no
mutant here changes a selftest verdict on the clean path (the review's
inference, F3). The record keeps each mutant's fragments, the failing test
names, the commit and the subject digest. The unmutated baseline runs first
and must pass.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2])
target = root / "scripts/check_spec_reconciliation.py"
tests = root / "scripts/test_reconciliation_pool.py"
BOUND = 300

GET = "            return pending.get(timeout=_selftest_timeout())"
MAP = ("        pending = pool.map_async(functools.partial(_guarded, function),\n"
       "                                 range(count), chunksize=1)\n")
CATCH = ("        except KeyboardInterrupt:\n            raise\n"
         "        except BaseException as exc:\n"
         "            failed.append(f\"family {index} ({_family_name(family)}) raised \"\n"
         "                          f\"{type(exc).__name__}: {exc}\")")

MUTANTS = [
    ("scope-keeps-memo", "the scope does not reset the memo between runs", [
        ("    assert _SIGNED_MEMO is None and _RUN_MEMO is None, \"_run_scope nested\"\n"
         "    _SIGNED_MEMO = {}\n    _RUN_MEMO = {}\n",
         "    _SIGNED_MEMO = {} if _SIGNED_MEMO is None else _SIGNED_MEMO\n"
         "    _RUN_MEMO = {} if _RUN_MEMO is None else _RUN_MEMO\n"),
        ("    finally:\n        _SIGNED_MEMO = None\n        _RUN_MEMO = None\n        d10_supersession.state = d10_state",
         "    finally:\n        d10_supersession.state = d10_state")]),
    ("scope-nests", "a nested scope is entered instead of refused", [
        ("    assert _SIGNED_MEMO is None and _RUN_MEMO is None, \"_run_scope nested\"\n", "")]),
    ("run-skips-scope", "run() does not enter the scope (review mutant B)", [
        ("    report = Report()\n    with _run_scope():\n        check_outcomes(root, report)",
         "    report = Report()\n    with contextlib.nullcontext():\n        check_outcomes(root, report)")]),
    ("families-share-worker", "state leaks across families in a worker (no fresh fork per family)", [
        ("            workers, maxtasksperchild=1 if fresh else None) as pool:",
         "            workers, maxtasksperchild=None) as pool:")]),
    ("merge-out-of-order", "results are merged in completion order", [
        (MAP + "        try:\n" + GET,
         "        done = pool.imap_unordered(functools.partial(_guarded, function),\n"
         "                                   range(count), chunksize=1)\n"
         "        try:\n"
         "            return [done.next(timeout=_selftest_timeout()) for _ in range(count)]")]),
    ("drop-family-failures", "a family's failures are dropped when it records no witness", [
        ("        failures.extend(failed)",
         "        if found:\n            failures.extend(failed)")]),
    ("family-exception-swallowed", "a family's exception is swallowed (review mutant A)", [
        (CATCH, "        except BaseException:\n            pass")]),
    ("family-exit-uncaught", "a family's SystemExit is not turned into a failure (F1)", [
        ("        except BaseException as exc:\n            failed.append(",
         "        except Exception as exc:\n            failed.append(")]),
    ("task-exit-unguarded", "a pooled task's SystemExit kills its worker (F1)", [
        ("    except BaseException as exc:\n        raise RuntimeError(",
         "    except BaseException as exc:\n        raise\n        raise RuntimeError(")]),
    ("no-timeout", "a lost result is waited for without bound (F1)", [
        (GET, "            return pending.get()")]),
]


def check():
    begun = time.monotonic()
    env = dict(os.environ, PYTHONWARNINGS="ignore::DeprecationWarning")
    try:
        done = subprocess.run([sys.executable, str(tests)], cwd=root, env=env,
                              capture_output=True, text=True, timeout=BOUND)
    except subprocess.TimeoutExpired:
        return {"testsExit": None, "testsFailed": [f"overran {BOUND} s"],
                "testsVerdict": "HUNG", "testsSeconds": round(time.monotonic() - begun)}
    failed = re.findall(r"^(?:FAIL|ERROR): (\S+ \([^)]*\))", done.stderr, re.M)
    verdict = (done.stderr.strip().splitlines() or [""])[-1]
    return {"testsExit": done.returncode, "testsFailed": failed,
            "testsVerdict": verdict, "testsSeconds": round(time.monotonic() - begun)}


def killed(result):
    return result["testsExit"] != 0


original = target.read_bytes()
commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True,
                        text=True, check=True).stdout.strip()
record = {"format": "mutation-run/1", "ranAt": datetime.now(timezone.utc).isoformat(),
          "commit": commit,
          "subject": {rel: hashlib.sha256((root / rel).read_bytes()).hexdigest()
                      for rel in ("scripts/check_spec_reconciliation.py",
                                  "scripts/test_reconciliation_pool.py")},
          "method": __doc__.strip(), "killedBy": "scripts/test_reconciliation_pool.py only",
          "withSelftest": False}
record["baseline"] = check()
print("baseline", record["baseline"]["testsVerdict"], flush=True)
record["mutants"] = []
if killed(record["baseline"]):
    out.write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8")
    sys.exit("baseline does not pass")
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
        print(mid, entry["outcome"], entry["testsFailed"], flush=True)
finally:
    target.write_bytes(original)
out.write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8")
survived = [m["id"] for m in record["mutants"] if m["outcome"] != "killed"]
print(f"{len(record['mutants']) - len(survived)} of {len(record['mutants'])} mutants killed"
      + (f"; survived {survived}" if survived else ""))
sys.exit(1 if survived else 0)
