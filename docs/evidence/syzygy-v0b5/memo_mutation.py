"""Rule-6 run over the per-run memo and the reverse-apply cache (syzygy-v0b5).

Usage: python3 memo_mutation.py <checkout root> <out.json> [--harness-only] [mutant id ...]

Each mutant replaces fragments that each occur exactly once in
scripts/check_spec_reconciliation.py, runs `--selftest` (SELFTEST_WORKERS from
the environment) and then memo_rerun_harness.py, and restores the file in
`finally`. A mutant is killed when the selftest exits non-zero or the harness
exits 1; the record keeps which one, the selftest's last line and the
harness's verdict line. The unmutated baseline runs both first and must pass.
With --harness-only the selftest is not run (its result for those mutants is in
the earlier record); naming mutant ids runs only those.
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
harness_only = "--harness-only" in sys.argv[3:]
only = [a for a in sys.argv[3:] if not a.startswith("--")]
target = root / "scripts/check_spec_reconciliation.py"
harness = Path(__file__).resolve().parent / "memo_rerun_harness.py"

MUTANTS = [
    ("memo-global-and-kept", "a memo keyed by function alone and kept from one run() to the next", [
        ("        key = (function.__module__, function.__name__, str(Path(args[0]).resolve()))",
         "        key = (function.__module__, function.__name__)"),
        ("    _RUN_MEMO = {}\n    import d10_supersession",
         "    _RUN_MEMO = _RUN_MEMO if _RUN_MEMO is not None else {}\n    import d10_supersession"),
        ("        _SIGNED_MEMO = None\n        _RUN_MEMO = None\n", "        _SIGNED_MEMO = None\n"),
    ]),
    ("memo-kept-between-runs", "a memo keyed by root but kept from one run() to the next", [
        ("    _RUN_MEMO = {}\n    import d10_supersession",
         "    _RUN_MEMO = _RUN_MEMO if _RUN_MEMO is not None else {}\n    import d10_supersession"),
        ("        _SIGNED_MEMO = None\n        _RUN_MEMO = None\n", "        _SIGNED_MEMO = None\n"),
    ]),
    ("memo-global-key", "a memo keyed by function alone within one run()", [
        ("        key = (function.__module__, function.__name__, str(Path(args[0]).resolve()))",
         "        key = (function.__module__, function.__name__)"),
    ]),
    ("memo-ignores-override", "the memo answers while _FILES_OVERRIDE stands in front of a read", [
        ("        if _RUN_MEMO is None or _FILES_OVERRIDE is not None or len(args) != 1 or kwargs:",
         "        if _RUN_MEMO is None or len(args) != 1 or kwargs:"),
    ]),
    ("memo-shares-objects", "the memo hands every caller the same object", [
        ("        return copy.deepcopy(_RUN_MEMO[key])", "        return _RUN_MEMO[key]"),
    ]),
    ("reverse-cache-ignores-body", "the reverse-apply cache key leaves out the body", [
        ("    key = (sha(patch), Path(target_rel).as_posix(), sha(body), zero_context)",
         "    key = (sha(patch), Path(target_rel).as_posix(), zero_context)"),
    ]),
    ("reverse-cache-ignores-patch", "the reverse-apply cache key leaves out the patch", [
        ("    key = (sha(patch), Path(target_rel).as_posix(), sha(body), zero_context)",
         "    key = (Path(target_rel).as_posix(), sha(body), zero_context)"),
    ]),
]

original = target.read_bytes()
text = original.decode("utf-8")
for mid, _what, pairs in MUTANTS:
    for old, _new in pairs:
        if text.count(old) != 1:
            raise SystemExit(f"{mid}: fragment occurs {text.count(old)} times: {old[:60]!r}")


def last_line(s, needle):
    lines = [line for line in s.splitlines() if needle in line]
    return lines[-1] if lines else None


def attempt():
    started = time.time()
    st = (subprocess.CompletedProcess([], 0, "SELFTEST not run (--harness-only)\n", "") if harness_only
          else subprocess.run([sys.executable, str(target), "--selftest"], cwd=root, capture_output=True, text=True))
    h = subprocess.run([sys.executable, str(harness), str(root)], cwd=root, capture_output=True, text=True)
    return {
        "selftestExit": st.returncode,
        "selftestVerdict": last_line(st.stdout, "SELFTEST"),
        "selftestFailures": [line for line in st.stdout.splitlines() if line.startswith("SELFTEST FAIL")][:20],
        "harnessExit": h.returncode,
        "harnessVerdicts": [line for line in h.stdout.splitlines() if line.split(":")[0] in ("FRESH", "STALE", "HARNESS INVALID", "CONTRACT HELD", "CONTRACT BROKEN")],
        "seconds": round(time.time() - started),
    }


head = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
record = {
    "format": "mutation-run/1",
    "ranAt": datetime.now(timezone.utc).isoformat(),
    "commit": head,
    "subject": {"scripts/check_spec_reconciliation.py": hashlib.sha256(original).hexdigest()},
    "method": __doc__.strip(),
    "harnessOnly": harness_only,
    "baseline": None,
    "mutants": [],
    "summary": None,
}
try:
    base = attempt()
    record["baseline"] = base
    if base["selftestExit"] != 0 or base["harnessExit"] != 0:
        raise SystemExit(f"baseline fails: {base}")
    for mid, what, pairs in MUTANTS:
        if only and mid not in only:
            continue
        mutated = text
        for old, new in pairs:
            mutated = mutated.replace(old, new)
        try:
            target.write_text(mutated, encoding="utf-8")
            r = attempt()
        finally:
            target.write_bytes(original)
        killed_by = [name for name, hit in (("selftest", r["selftestExit"] != 0), ("harness", r["harnessExit"] == 1)) if hit]
        record["mutants"].append({"id": mid, "what": what, "fragments": [{"old": o, "new": n} for o, n in pairs],
                                  "killed": bool(killed_by), "killedBy": killed_by, **r})
        print(f"{mid}: {'killed by ' + '+'.join(killed_by) if killed_by else 'SURVIVED'} ({r['seconds']} s)", flush=True)
finally:
    target.write_bytes(original)
    killed = sum(m["killed"] for m in record["mutants"])
    record["summary"] = {"mutants": len(record["mutants"]), "killed": killed, "survived": len(record["mutants"]) - killed}
    out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
