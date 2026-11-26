"""Controls for the trace-keyed `is_signed` cache (syzygy-offm), on a checkout.

Usage: python3 trace_cache_harness.py <checkout root> [--json OUT]

Exit 0 when every control holds, 1 when one fails. One line per control:
`HELD <id>: ...` or `FAILED <id>: ...`.

1. audit: a traced `is_signed` over a scratch copy has zero unhooked events and
   no reason to be unusable; its answer equals the stock call's.
2. copy-hits: a second scratch copy of the same tree matches the trace and gets
   the stock answer.
3. stat-symlink: a governing input the call `lstat`s, whose parent it does not
   list, replaced by a symlink to a file of the same bytes, must miss.
4. listing-extra: an extra file in a directory the call lists, named by no
   other observation, must miss (the directory's own stat, mode and size, is
   unchanged by one more small entry; `kinds` checks that).
5. git-objects: a tree whose `.git` is a shared clone of the checkout is
   traced; the same files over an empty repository must miss.
6. detector controls: a direct C `stat`, a clock read, a random read, a
   non-git subprocess, a write outside the trace's temporary directories, a
   `DirEntry.stat` and a symlink creation are each caught; an environment read
   makes the environment an input; a replaced module global misses.

Each of 3, 4 and 5 isolates one observation kind: the harness asserts that the
case differs from the traced tree in that kind of observation and no other
(`kinds`), so dropping that kind from the trace is the only way to make it hit.
"""
import json
import os
import posix
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / "scripts"))
import check_spec_reconciliation as checker  # noqa: E402
import signed_trace_cache as stc  # noqa: E402

reference = checker.poc_reference()
results = []


def control(cid, held, detail):
    results.append({"id": cid, "held": bool(held), "detail": detail})
    print(f"{'HELD' if held else 'FAILED'} {cid}: {detail}", flush=True)


def entry_for(root, function=None):
    function = function or reference.is_signed
    result, trace = stc.trace_call(root, function)
    modules, missing = stc._module_files_snapshot(trace.executed)
    if missing:
        trace.fail(f"modules not found: {missing}")
    return stc.Entry(trace, result, modules), trace


def differing_kinds(entry, root):
    """Which observation kinds of `entry` evaluate differently on `root`."""
    memo, kinds = {}, set()
    for key, value in entry.obs.items():
        if stc._evaluate(key, os.path.abspath(root), memo) != value:
            kinds.add(key[0])
    return sorted(kinds)


def outcome(function, root):
    try:
        return ("value", function(root))
    except Exception as exc:  # the stock call may raise on a broken repository
        return ("raised", type(exc).__name__)


def main(tmp):
    base = tmp / "base"
    checker.scratch(ROOT, base)
    stock = reference.is_signed(base)

    # 1. audit
    begun = time.perf_counter()
    entry, trace = entry_for(base)
    traced_seconds = round(time.perf_counter() - begun, 2)
    counts = stc._counts(trace.obs)
    control("audit", not trace.unhooked and not trace.unusable and entry.result == stock,
            f"unhooked events {len(trace.unhooked)}, unusable reasons {trace.unusable[:5]}, "
            f"traced answer {entry.result!r} vs stock {stock!r}, observations {counts}, "
            f"traced in {traced_seconds}s")

    # 2. copy-hits
    copy = tmp / "copy"
    shutil.copytree(base, copy)
    begun = time.perf_counter()
    hit = stc.matches(entry, copy)
    lookup_seconds = round(time.perf_counter() - begun, 3)
    control("copy-hits", hit and entry.result == reference.is_signed(copy),
            f"matches {hit} in {lookup_seconds}s; stock answer {reference.is_signed(copy)!r}")

    listed = {k[1] for k in entry.obs if k[0] == "list"}
    other_paths = {k[1] for k in entry.obs if k[0] in ("read", "stat", "lstat", "readlink")}

    # 3. stat-symlink: an lstat'd input, read, whose parent is not listed.
    candidates = sorted(k[1] for k in entry.obs if k[0] == "lstat" and k[1].startswith("@R/")
                        and ("read", k[1]) in entry.obs
                        and os.path.dirname(k[1]) not in listed)
    if not candidates:
        control("stat-symlink", False, "no lstat'd, read input outside a listed directory")
    else:
        rel = candidates[0][3:]
        tree = tmp / "stat-symlink"
        shutil.copytree(base, tree)
        target = tree / rel
        twin = tree / (rel + ".same-bytes")
        shutil.copyfile(target, twin)
        target.unlink()
        target.symlink_to(twin.name)
        kinds = differing_kinds(entry, tree)
        control("stat-symlink", not stc.matches(entry, tree) and kinds == ["lstat"],
                f"{rel} -> symlink to identical bytes: differing observation kinds {kinds}; "
                f"stock answer {outcome(reference.is_signed, tree)!r}")

    # 4. listing-extra: a listed directory, an extra file no observation names.
    dirs = sorted(d for d in listed if d.startswith("@R/"))
    chosen = None
    for d in dirs:
        extra = d + "/zz-offm-extra.md"
        if extra not in other_paths:
            chosen = d
            break
    if chosen is None:
        control("listing-extra", False, "no listed directory free of other observations")
    else:
        tree = tmp / "listing-extra"
        shutil.copytree(base, tree)
        (tree / chosen[3:] / "zz-offm-extra.md").write_text("extra\n", encoding="utf-8")
        kinds = differing_kinds(entry, tree)
        control("listing-extra", not stc.matches(entry, tree) and kinds == ["list"],
                f"extra file in {chosen}: differing observation kinds {kinds}; "
                f"stock answer {outcome(reference.is_signed, tree)!r}")

    # 5. git-objects: .git a shared clone of the checkout, then an empty one.
    t1 = tmp / "git-shared"
    shutil.copytree(base, t1)
    subprocess.run(["git", "clone", "--quiet", "--bare", "--shared", str(ROOT), str(t1 / ".git")],
                   check=True, capture_output=True)
    entry1, trace1 = entry_for(t1)
    t2 = tmp / "git-empty"
    shutil.copytree(base, t2)
    subprocess.run(["git", "init", "--quiet", "--bare", str(t2 / ".git")], check=True,
                   capture_output=True)
    # Move t2 to t1's path so that only the repository differs.
    shutil.rmtree(t1)
    t2.rename(t1)
    kinds = differing_kinds(entry1, t1)
    control("git-objects", not trace1.unusable and not stc.matches(entry1, t1)
            and set(kinds) <= {"git", "oids"} and kinds,
            f"traced over a shared clone ({entry1.result!r}, unusable {trace1.unusable[:3]}); "
            f"over an empty repository the differing observation kinds are {kinds}; "
            f"stock answer {outcome(reference.is_signed, t1)!r}")

    detectors(tmp)


def detectors(tmp):
    tree = tmp / "detect"
    tree.mkdir()
    (tree / "a").write_text("a\n", encoding="utf-8")

    def probe(cid, function, expect):
        _result, trace = stc.trace_call(tree, function)
        got = trace.unhooked if expect == "unhooked" else trace.unusable
        control(f"detects-{cid}", bool(got), f"{expect}: {got[:2]}")

    probe("direct-stat", lambda r: posix.stat(str(r / "a")), "unhooked")
    probe("clock", lambda r: time.time(), "unusable")
    probe("random", lambda r: __import__("random").random(), "unusable")
    probe("non-git-subprocess", lambda r: subprocess.run(["true"]), "unusable")
    probe("write-outside", lambda r: (r / "b").write_text("b"), "unusable")
    probe("direntry-stat", lambda r: [e.stat() for e in os.scandir(r)], "unhooked")
    probe("symlink", lambda r: os.symlink("a", r / "c"), "unusable")
    _result, trace = stc.trace_call(tree, lambda r: os.environ.get("HOME"))
    control("detects-env-as-input", ("env", "environ") in trace.obs and not trace.unusable,
            f"observations {sorted(trace.obs)[:3]}")

    # A module global replaced after the trace (as the selftest injects D10
    # states) must miss, and restoring it must hit again.
    import d10_supersession
    entry, _trace = entry_for(tree, lambda r: d10_supersession.disk_files(r, "absent"))
    real = d10_supersession.amendment
    try:
        d10_supersession.amendment = lambda *_a, **_k: None
        patched = stc.matches(entry, tree)
    finally:
        d10_supersession.amendment = real
    control("detects-module-global", not patched and stc.matches(entry, tree),
            f"patched matches {patched}, restored matches {stc.matches(entry, tree)}")


if __name__ == "__main__":
    os.environ.setdefault("TMPDIR", tempfile.gettempdir())
    with tempfile.TemporaryDirectory(prefix="offm-harness-") as tmp:
        main(Path(tmp))
    failed = [r["id"] for r in results if not r["held"]]
    if "--json" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--json") + 1])
        out.write_text(json.dumps({"results": results}, indent=2) + "\n", encoding="utf-8")
    print(f"HARNESS {'FAIL' if failed else 'PASS'}: {len(results) - len(failed)} of "
          f"{len(results)} controls held" + (f"; failed {failed}" if failed else ""))
    sys.exit(1 if failed else 0)
