"""Measure proposal 1 without editing scripts/ (syzygy-0yit).

Usage: python3 measure_scope.py <checkout root>

On one scratch copy of the checkout (with the selftest's proposed candidate),
time `check_outcomes(tree, Report())` as `_entry_kind_cases` calls it (outside
run(), so no per-run memo), then inside the same per-run scope run() sets up
(`_SIGNED_MEMO`, `_RUN_MEMO`, the memoized D10 state), counting `is_signed`
calls each way, and check the two reports' findings are equal.
"""
import json
import sys
import tempfile
import time
from pathlib import Path

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / "scripts"))
import check_spec_reconciliation as checker  # noqa: E402
import d10_supersession  # noqa: E402

reference = checker.poc_reference()
stock_is_signed = reference.is_signed
calls = {"n": 0}


def counted(tree):
    calls["n"] += 1
    return stock_is_signed(tree)


reference.is_signed = counted


def bare(tree):
    report = checker.Report()
    checker.check_outcomes(tree, report)
    return report


def scoped(tree):
    state = d10_supersession.state
    checker._SIGNED_MEMO, checker._RUN_MEMO = {}, {}
    d10_supersession.state = checker._per_run(state)
    try:
        return bare(tree)
    finally:
        checker._SIGNED_MEMO = checker._RUN_MEMO = None
        d10_supersession.state = state


out = {}
with tempfile.TemporaryDirectory() as tmp:
    tree = Path(tmp) / "base"
    checker.scratch(checker.ROOT, tree)
    checker._propose_candidate(tree)
    reports = {}
    for name, function in (("bare", bare), ("scoped", scoped), ("bare-again", bare)):
        calls["n"] = 0
        begun = time.perf_counter()
        reports[name] = function(tree)
        out[name] = {"seconds": round(time.perf_counter() - begun, 2), "isSignedCalls": calls["n"]}
    out["findingsEqual"] = (reports["bare"].findings == reports["scoped"].findings
                            == reports["bare-again"].findings)
print(json.dumps(out, indent=2))
