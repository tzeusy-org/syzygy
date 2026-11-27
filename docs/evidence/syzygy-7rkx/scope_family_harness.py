"""Controls for the per-run scope and the family pool (syzygy-7rkx), on a checkout.

Usage: python3 scope_family_harness.py <checkout root>

Exit 0 when every control holds, 1 when one fails; one `HELD`/`FAILED` line
per control. Runs in seconds: P115's answer is replaced by a stub that reads a
marker file, and the families are synthetic.

1. scope-resets: an answer memoized in one `_run_scope()` is not the answer in
   the next scope over the same path after the tree changes, and outside any
   scope nothing is memoized.
2. families-fresh: three families on two workers each run in their own fork
   (distinct pids), and none sees the module state an earlier family left.
3. families-order: eight families that finish in reverse order are merged in
   list order, witnesses and printed lines alike.
4. families-failures: every family's failures are merged, including a family
   that records failures and no witness.
"""
import io
import contextlib
import os
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / "scripts"))
import check_spec_reconciliation as checker  # noqa: E402

results = []


def control(cid, held, detail):
    results.append(held)
    print(f"{'HELD' if held else 'FAILED'} {cid}: {detail}", flush=True)


def scope_resets(tmp):
    marker = tmp / "marker"
    reference = checker.poc_reference()
    real = reference.is_signed
    reference.is_signed = lambda root: (Path(root) / "marker").read_text()
    try:
        marker.write_text("first")
        with checker._run_scope():
            first = checker.reference_signed(tmp)
        marker.write_text("second")
        with checker._run_scope():
            second = checker.reference_signed(tmp)
        after = (checker._SIGNED_MEMO, checker._RUN_MEMO)
        marker.write_text("third")
        outside = checker.reference_signed(tmp)
    finally:
        reference.is_signed = real
    control("scope-resets", (first, second, outside, after) == ("first", "second", "third", (None, None)),
            f"answers {first!r}, {second!r}, outside {outside!r}; memos after exit {after}")


def leaky(w, f):
    w.append({"pid": os.getpid(), "saw": repr(checker._SIGNED_MEMO)})
    checker._SIGNED_MEMO = {"left-behind": True}


def observer(w, f):
    w.append({"pid": os.getpid(), "saw": repr(checker._SIGNED_MEMO)})


def families_fresh():
    witnesses, failures = [], []
    checker._run_families([leaky, observer, observer], witnesses, failures)
    pids = [w["pid"] for w in witnesses]
    saw = [w["saw"] for w in witnesses]
    control("families-fresh", len(set(pids)) == 3 and pids[0] != os.getpid()
            and saw == ["None"] * 3,
            f"pids distinct {len(set(pids))} of 3, parent excluded {os.getpid() not in pids}; saw {saw}")


def ordered(i, count):
    def family(w, f):
        time.sleep(0.15 * (count - i))   # later families finish first
        print(f"family {i}")
        w.append({"family": i})
    return family


def families_order():
    count = 8
    witnesses, failures = [], []
    with contextlib.redirect_stdout(io.StringIO()) as printed:
        checker._run_families([ordered(i, count) for i in range(count)], witnesses, failures)
    got = [w["family"] for w in witnesses]
    lines = printed.getvalue().split()
    control("families-order", got == list(range(count))
            and printed.getvalue() == "".join(f"family {i}\n" for i in range(count)),
            f"witness order {got}; printed {lines[1::2]}")


def families_failures():
    def both(w, f):
        w.append({"family": "both"})
        f.append("both: a failure")

    def failure_only(w, f):
        f.append("failure-only: a failure")

    def clean(w, f):
        w.append({"family": "clean"})

    witnesses, failures = [], []
    checker._run_families([both, failure_only, clean], witnesses, failures)
    control("families-failures", failures == ["both: a failure", "failure-only: a failure"],
            f"failures {failures}")


if __name__ == "__main__":
    os.environ["SELFTEST_WORKERS"] = "2"
    with tempfile.TemporaryDirectory(prefix="7rkx-harness-") as tmp:
        scope_resets(Path(tmp))
    families_fresh()
    families_order()
    families_failures()
    failed = results.count(False)
    print(f"HARNESS {'FAIL' if failed else 'PASS'}: {len(results) - failed} of {len(results)} controls held")
    sys.exit(1 if failed else 0)
