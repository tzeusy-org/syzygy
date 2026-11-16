"""Re-run the 32 rows of mutants-8fcf409c.json at the current checkout (a607bb62), reading old/new fragments and test files from
the record, not retyping them, except where a fragment no longer occurs exactly once: those rows take the head's equivalent from
ADAPT below (stated old and new). Writes one JSONL line per row as it goes (argv[1]), restores every byte whatever happens.
Optional argv[2:]: row ids to run (default all). Killed = vitest exit non-zero with a failing test or suite."""
import hashlib, json, os, subprocess, sys, tempfile
REC = json.load(open("docs/evidence/syzygy-bpyt-4-2/mutants-8fcf409c.json"))
ADAPT = {("M5", "packages/support/tsconfig.json"): (",\n  \"exclude\": [\"src/**/*.test.ts\", \"src/**/*.testkit.ts\"]", "")}
def vitest(files):
    with tempfile.TemporaryDirectory() as d:
        rep = os.path.join(d, "r.json")
        p = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={rep}"], capture_output=True, text=True)
        r = json.load(open(rep)) if os.path.exists(rep) else {}
    fails = [{"test": x["fullName"], "message": (x.get("failureMessages") or [""])[0].split("\n")[0][:300]} for f in r.get("testResults", []) for x in f.get("assertionResults", []) if x["status"] == "failed"]
    fails += [{"suite": os.path.relpath(f["name"]), "message": (f.get("message") or "").split("\n")[0][:300]} for f in r.get("testResults", []) if f.get("status") == "failed" and not any(x["status"] == "failed" for x in f.get("assertionResults", []))]
    return {"exit": p.returncode, "passed": r.get("numPassedTests"), "failed": r.get("numFailedTests"), "failedSuites": r.get("numFailedTestSuites"), "total": r.get("numTotalTests"), "failing": fails}
want = set(sys.argv[2:])
out = open(sys.argv[1], "a")
head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
clean = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == ""
if not want or "unmutated" in want:
    files = sorted({f for m in REC["mutants"] for f in m["tests"]})
    out.write(json.dumps({"id": "unmutated", "commit": head, "worktreeClean": clean, "load": open("/proc/loadavg").read().split()[:3], **vitest(files)}) + "\n"); out.flush()
for m in REC["mutants"]:
    if want and m["id"] not in want: continue
    orig = {p: open(p, "rb").read() for p in m["edits"]}
    used = {}
    try:
        for p, edits in m["edits"].items():
            t = orig[p].decode()
            for e in edits:
                old, new = ADAPT.get((m["id"], p), (e["old"], e["new"]))
                if old == "": t += new
                else:
                    if t.count(old) != 1: raise RuntimeError(f"{m['id']}: fragment occurs {t.count(old)} times in {p}")
                    t = t.replace(old, new)
                used.setdefault(p, []).append({"old": old, "new": new, "adapted": (m["id"], p) in ADAPT})
            open(p, "w").write(t)
        load = open("/proc/loadavg").read().split()[:3]
        res = vitest(m["tests"])
    finally:
        for p, b in orig.items(): open(p, "wb").write(b)
    restored = all(open(p, "rb").read() == b for p, b in orig.items())
    out.write(json.dumps({"id": m["id"], "commit": head, "edits": used, "tests": m["tests"], "load": load, **res,
                          "killed": res["exit"] != 0 and (res["failed"] or 0) + (res["failedSuites"] or 0) > 0, "restored": restored}) + "\n"); out.flush()
    print(m["id"], "killed" if res["exit"] != 0 else "SURVIVED", (res["failing"][:1] or [{}])[0].get("message", "")[:120], flush=True)
