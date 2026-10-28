"""syzygy-bpyt.4.19, rule 6 and the delayed-scan probe for cdp-browser.test.ts's drain-timeout test.

Run from the root of a clean Syzygy checkout at the head: `python3 -I <this file> <base commit> > record.json`. Every run is
`npx vitest run apps/three-surface-poc/src/cdp-browser.test.ts` with a JSON reporter, and every edited file is restored.
- `delay`: the first closeDisposableBrowser call's fake group scan busy-waits 60 ms of wall time per scan, standing in for a
  loaded host. It runs over the base commit's test file and over the head's. The base must fail with the wall-clock deadline
  error; the head must pass, because its drain clock counts scans.
- K1-K3 mutate the product's drain in cdp-browser.ts at the head; each must fail the drain-timeout test, which shows its
  assertions still bite with the injected clock. K2 halves the drain deadline, which only the first call's injected clock reaches
  in time (3 scans at 25 ms against 50 ms).
"""
import hashlib, json, os, subprocess, sys, tempfile

TESTF = "apps/three-surface-poc/src/cdp-browser.test.ts"
PROD = "apps/three-surface-poc/src/cdp-browser.ts"
TARGET = "disposable browser shutdown waits for private Chrome group members before removal and retains the profile on drain timeout"
SCAN = "      groupProcesses: () => ++scans === 1 ? [123] : [],\n"
DELAYED = "      groupProcesses: () => { const until = Date.now() + 60; while (Date.now() < until); return ++scans === 1 ? [123] : []; },\n"
MUTANTS = [
    ("K1", "the drain stops after one empty scan", PROD, "if (emptyScans >= 2) break;", "if (emptyScans >= 1) break;"),
    ("K2", "the drain deadline is half the configured drain", PROD,
     "const drainDeadline = now() + (options.profileDrainMs ?? BROWSER_PROFILE_DRAIN_MS);",
     "const drainDeadline = now() + (options.profileDrainMs ?? BROWSER_PROFILE_DRAIN_MS) / 2;"),
    ("K3", "the profile is removed before the protocol socket closes", PROD,
     "  connection.close();\n", "  (options.removeProfile ?? removeBrowserProfile)(profile);\n  connection.close();\n"),
]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "r.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    rows = [r for f in counts.get("testResults", []) for r in f.get("assertionResults", [])]
    return {"exit": done.returncode, "passed": counts.get("numPassedTests"), "failed": counts.get("numFailedTests"), "total": counts.get("numTotalTests"),
            "failing": [{"test": r["fullName"], "message": (r.get("failureMessages") or [""])[0].split("\n")[0][:300]} for r in rows if r["status"] == "failed"]}


def with_text(path, text, fn):
    original = open(path, "rb").read()
    try:
        open(path, "w", encoding="utf8").write(text)
        return fn()
    finally:
        open(path, "wb").write(original)


def edited(path, old, new, source=None):
    text = source if source is not None else open(path, encoding="utf8").read()
    if text.count(old) != 1:
        raise SystemExit(f"{path}: the fragment occurs {text.count(old)} times")
    return text.replace(old, new)


base = git("rev-parse", f"{sys.argv[1]}^{{commit}}").strip()
head = git("rev-parse", "HEAD").strip()
record = {"subject": "syzygy-bpyt.4.19: the drain-timeout test's clock, delayed-scan probe and rule-6 mutants", "commit": head, "base": base,
          "tool": {"path": "docs/evidence/syzygy-bpyt-4-19/tools/rule6.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
          "worktreeClean": git("status", "--porcelain") == "", "loadavgBefore": open("/proc/loadavg").read().split()[:3],
          "testFileSha256": {"base": hashlib.sha256(git("show", f"{base}:{TESTF}").encode()).hexdigest(),
                             "head": hashlib.sha256(open(TESTF, "rb").read()).hexdigest()},
          "prodFileSha256": hashlib.sha256(open(PROD, "rb").read()).hexdigest(),
          "unmutated": vitest(), "delay": {}, "mutants": []}
record["delay"]["fragment"] = {"file": TESTF, "old": SCAN, "new": DELAYED}
record["delay"]["baseTest"] = with_text(TESTF, edited(TESTF, SCAN, DELAYED, git("show", f"{base}:{TESTF}")), vitest)
record["delay"]["headTest"] = with_text(TESTF, edited(TESTF, SCAN, DELAYED), vitest)
for ident, what, path, old, new in MUTANTS:
    outcome = with_text(path, edited(path, old, new), vitest)
    record["mutants"].append({"id": ident, "mutation": what, "file": path, "old": old, "new": new, **outcome,
                              "killed": outcome["exit"] != 0 and any(f["test"] == TARGET for f in outcome["failing"])})
record["baseFailsOnWallClock"] = any(f["test"] == TARGET and "two empty scans before deadline" in f["message"] for f in record["delay"]["baseTest"]["failing"])
record["headPassesDelayed"] = record["delay"]["headTest"]["exit"] == 0 and record["delay"]["headTest"]["failed"] == 0
record["killed"] = sum(m["killed"] for m in record["mutants"])
record["of"] = len(record["mutants"])
record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
record["worktreeCleanAfter"] = git("status", "--porcelain") == ""
print(json.dumps(record, indent=1, ensure_ascii=False))
