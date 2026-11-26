"""Profile one reconciliation selftest without editing it (syzygy-0yit).

Usage: python3 profile_selftest.py <checkout root> <out dir> [--cprofile]

Runs `check_spec_reconciliation.selftest(witness)` in-process, as `--selftest`
does, with SELFTEST_WORKERS from the environment, and records:

- `phases.jsonl`: wall start and end of every module-level `*_cases` function
  and of `_map_cases` (the forked pool), in the parent;
- `cases.jsonl`: per pooled case, its index, name, start tree, worker pid,
  start and end wall times and seconds;
- with --cprofile, `case-<index>.prof` per pooled case (a fresh profiler in
  the worker, the inherited one cleared) and `parent.prof` for the parent
  (pool time shows as waiting inside `_map_cases`).

Nothing in scripts/ is edited: the driver replaces module attributes in its
own process, and the forked workers inherit them.
"""
import cProfile
import functools
import json
import os
import sys
import time
from pathlib import Path

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
profile = "--cprofile" in sys.argv[3:]
out.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(root / "scripts"))
os.chdir(root)
import check_spec_reconciliation as checker  # noqa: E402

T0 = time.time()


def log(name, record):
    with open(out / name, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")


def timed(name, function):
    @functools.wraps(function)
    def wrapper(*args, **kwargs):
        begun = time.time()
        try:
            return function(*args, **kwargs)
        finally:
            log("phases.jsonl", {"phase": name, "start": round(begun - T0, 3),
                                 "end": round(time.time() - T0, 3), "pid": os.getpid()})
    return wrapper


for attr in sorted(dir(checker)):
    if (attr.endswith("_cases") or attr == "_map_cases") and callable(getattr(checker, attr)):
        setattr(checker, attr, timed(attr, getattr(checker, attr)))

real_case = checker._run_case


def profiled_case(index):
    _tmp, cases = checker._CASE_STATE
    start, _clean, mutant = cases[index]
    begun = time.time()
    if profile:
        if parent is not None:
            parent.disable()   # the parent's profiler, inherited through fork
        prof = cProfile.Profile()
        result = prof.runcall(real_case, index)
        prof.dump_stats(str(out / f"case-{index}.prof"))
    else:
        result = real_case(index)
    log("cases.jsonl", {"index": index, "name": mutant[0], "start_tree": Path(start).name,
                        "pid": os.getpid(), "start": round(begun - T0, 3),
                        "end": round(time.time() - T0, 3),
                        "seconds": round(time.time() - begun, 3)})
    return result


checker._run_case = profiled_case

parent = cProfile.Profile() if profile else None
begun = time.time()
if parent:
    parent.enable()
code = checker.selftest(str(out / "witness.json"))
if parent:
    parent.disable()
    parent.dump_stats(str(out / "parent.prof"))
log("phases.jsonl", {"phase": "selftest", "start": 0.0, "end": round(time.time() - T0, 3),
                     "exit": code, "workers": checker._selftest_workers(), "pid": os.getpid()})
sys.exit(code)
