"""Summarize a profile_selftest.py output directory (syzygy-0yit).

Usage: python3 summarize_profile.py <timing dir> <cprofile dir> [names...]

Prints the phase walls (timing run), the pool's per-case walls, and, from the
cProfile run, cumulative time for the named functions (default: a fixed list)
in the parent profile and summed over every pooled case's profile, with call
counts. Run-to-run figures are the timing run's; cProfile inflates them.
"""
import glob
import json
import pstats
import sys
from pathlib import Path

timing, cprof = Path(sys.argv[1]), Path(sys.argv[2])
NAMES = sys.argv[3:] or [
    "run", "check_outcomes", "check_census", "check_generated", "check_routes",
    "check_pins", "check_unions", "census", "main", "_cli_exits", "_library_error",
    "signoff_texts", "reference_signed", "is_signed", "copytree", "scratch",
    "inputs", "_reverse_apply", "reverse_apply", "regenerate", "_run_case",
]


def cumulative(stats, names):
    out = {}
    for (filename, _line, func), (_cc, nc, _tt, ct, _callers) in stats.stats.items():
        if func in names and ("check_spec_reconciliation" in filename
                              or "prepare_three_surface" in filename
                              or func in ("copytree",)):
            calls, seconds = out.get(func, (0, 0.0))
            out[func] = (calls + nc, seconds + ct)
    return {k: (v[0], round(v[1], 1)) for k, v in sorted(out.items(), key=lambda kv: -kv[1][1])}


phases = [json.loads(line) for line in open(timing / "phases.jsonl")]
print("PHASES (timing run, wall seconds)")
for p in sorted(phases, key=lambda p: -(p["end"] - p["start"])):
    print(f"  {p['phase']:40} {p['end'] - p['start']:8.1f}  from {p['start']:7.1f}")
cases = [json.loads(line) for line in open(timing / "cases.jsonl")]
print(f"POOL: {len(cases)} cases, {sum(c['seconds'] for c in cases):.1f} worker-seconds, "
      f"mean {sum(c['seconds'] for c in cases) / len(cases):.2f}")

parent = pstats.Stats(str(cprof / "parent.prof"))
print("PARENT (cProfile, cumulative; recursion counted once per frame)")
for k, v in cumulative(parent, set(NAMES)).items():
    print(f"  {k:24} calls {v[0]:6}  {v[1]:8.1f}s")
files = glob.glob(str(cprof / "case-*.prof"))
workers = pstats.Stats(*files)
print(f"WORKERS ({len(files)} case profiles summed)")
for k, v in cumulative(workers, set(NAMES)).items():
    print(f"  {k:24} calls {v[0]:6}  {v[1]:8.1f}s")
