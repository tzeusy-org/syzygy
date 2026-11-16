"""syzygy-bpyt.4.19, the 20-run repeat record for cdp-browser.test.ts (review F4).

Run from the root of a clean checkout: `python3 -I <this file> > record.json`. Each run is
`npx vitest run apps/three-surface-poc/src/cdp-browser.test.ts` with a JSON reporter; the host's load average is read before
and after each run. No load generator is started: the load is whatever the host carries.
"""
import hashlib, json, os, subprocess, tempfile

TESTF = "apps/three-surface-poc/src/cdp-browser.test.ts"
RUNS = 20


def load():
    return open("/proc/loadavg").read().split()[:3]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


runs = []
for index in range(1, RUNS + 1):
    before = load()
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "r.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    runs.append({"run": index, "exit": done.returncode, "passed": counts.get("numPassedTests"), "failed": counts.get("numFailedTests"),
                 "total": counts.get("numTotalTests"), "loadavgBefore": before, "loadavgAfter": load()})
print(json.dumps({"subject": "syzygy-bpyt.4.19: cdp-browser.test.ts repeated runs", "commit": git("rev-parse", "HEAD").strip(),
                  "tool": {"path": "docs/evidence/syzygy-bpyt-4-19/tools/repeat.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
                  "testFileSha256": hashlib.sha256(open(TESTF, "rb").read()).hexdigest(), "worktreeClean": git("status", "--porcelain") == "",
                  "runs": runs, "runsPassing": sum(r["exit"] == 0 and r["failed"] == 0 for r in runs), "of": RUNS}, indent=1))
