"""The per-run memo of check_spec_reconciliation.run() is per run and per tree (syzygy-v0b5).

Usage: python3 memo_rerun_harness.py <checkout root>

The selftest copies a fresh tree for every case, so a memo that wrongly
outlived its run() would be keyed by a root no later case uses, and the
selftest alone cannot see it. This harness runs the checker twice over the
SAME tree path, breaking D10's record in place between the runs, and compares
the second report with a run over a fresh copy of the broken tree at another
path. Exit 0: the second run saw the broken record (reports equal, and unequal
to the first). Exit 1: a stale answer leaked from the first run into the second.

It then checks the memo's own contract directly, for callers the checker does
not have today (a probe over run(ROOT) on 2026-11-24 found every memoized call
made with the run's own root, none while _FILES_OVERRIDE stood, and no caller
that changes what it is given): two roots in one run get two answers, a call
while _FILES_OVERRIDE stands is never answered from the memo, and a caller that
changes what it was given does not change what the next caller gets. Exit 1
when any of these fails.
"""
import shutil
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root / "scripts"))
import check_spec_reconciliation as c  # noqa: E402
import d10_supersession  # noqa: E402

with tempfile.TemporaryDirectory() as tmp:
    tree = Path(tmp) / "tree"
    c.scratch(c.ROOT, tree)
    c._propose_candidate(tree)
    first = c.run(tree)
    record = tree / d10_supersession.rec.ACT
    record.write_bytes(record.read_bytes() + b"\nbroken in place by memo_rerun_harness\n")
    second = c.run(tree)
    fresh = Path(tmp) / "fresh"
    shutil.copytree(tree, fresh)
    third = c.run(fresh)
    same_tree = [line.replace(str(tree), "<tree>") for line in second.lines]
    fresh_tree = [line.replace(str(fresh), "<tree>") for line in third.lines]
    print(f"first run failed: {sorted(first.failed)}")
    print(f"second run (same path, record broken) failed: {sorted(second.failed)}")
    print(f"fresh copy of the broken tree failed: {sorted(third.failed)}")
    if first.failed or not third.failed:
        print("HARNESS INVALID: the clean tree must pass and the broken record must fail")
        sys.exit(2)
    if same_tree != fresh_tree:
        print("STALE: the second run over the same path did not see the broken record")
        sys.exit(1)
    print("FRESH: the second run over the same path saw the broken record")

# Every binding of a root the module defines is memoized, wherever a later
# version adds it.
import inspect  # noqa: E402
unwrapped = sorted(name for name, value in vars(c).items()
                   if name.endswith("_binding") and inspect.isfunction(value)
                   and list(inspect.signature(getattr(value, "unmemoized", value)).parameters) == ["root"]
                   and not hasattr(value, "unmemoized"))
if unwrapped:
    print("CONTRACT BROKEN: bindings not memoized: " + ", ".join(unwrapped))
    sys.exit(1)


def imported_fixture_binding(root):
    return root


namespace = {"__name__": c.__name__, "imported_fixture_binding": imported_fixture_binding}
c._memoize_bindings(namespace)
if namespace["imported_fixture_binding"] is not imported_fixture_binding:
    print("CONTRACT BROKEN: a foreign binding was memoized")
    sys.exit(1)

# The memo's contract, checked on a counting function under a live memo.
answered = []


def probe(root):
    answered.append(str(root))
    return {"root": str(root), "findings": []}


memoized = c._per_run(probe)
broken = []
c._RUN_MEMO = {}
try:
    a1, b1 = memoized(Path(root / "a")), memoized(Path(root / "b"))
    if a1["root"] == b1["root"]:
        broken.append("two roots in one run got one answer")
    a1["findings"].append("changed by a caller")
    if memoized(Path(root / "a"))["findings"]:
        broken.append("a caller's change reached the next caller")
    before = len(answered)
    c._FILES_OVERRIDE = ("x", {})
    try:
        memoized(Path(root / "a"))
    finally:
        c._FILES_OVERRIDE = None
    if len(answered) == before:
        broken.append("a call while _FILES_OVERRIDE stood was answered from the memo")
finally:
    c._RUN_MEMO = None
if broken:
    print("CONTRACT BROKEN: " + "; ".join(broken))
    sys.exit(1)
print("CONTRACT HELD: per root, per caller, bypassed under _FILES_OVERRIDE")
