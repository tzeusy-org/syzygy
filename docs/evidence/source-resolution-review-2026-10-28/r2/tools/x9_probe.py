"""X9: a resolver plugin scoped to one vitest project (the POC app's), double-quoted name, sending @syzygy/support to its dist.
Run from a built checkout root: python3 -I x9_probe.py OUT.json. Restores every byte it touches.
Arm 1 (detection): mutant applied, real dists; run workspace-reach.test.ts and sync-child-process-guard.test.ts. Passing = not seen.
Arm 2 (effect): packages/support/dist/index.js replaced by a top-level throw; run git-observation.test.ts (app project, imports
@syzygy/support through git-observation.ts) unmutated, then mutated. The mutant redirects only if the mutated run fails with the poison."""
import json, os, subprocess, sys, tempfile
CFG = "vitest.config.ts"
OLD = "      {\n        extends: true,\n        test: {\n          name: '@syzygy/three-surface-poc-app',"
NEW = ("      {\n        extends: true,\n        plugins: [{ name: \"r2-x9\", enforce: 'pre', resolveId(id: string) { return id === '@syzygy/support' ? "
       "fileURLToPath(new URL('./packages/support/dist/index.js', import.meta.url)) : null; } }],\n        test: {\n          name: '@syzygy/three-surface-poc-app',")
DIST = "packages/support/dist/index.js"
def vitest(files):
    with tempfile.TemporaryDirectory() as d:
        rep = os.path.join(d, "r.json")
        p = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={rep}"], capture_output=True, text=True)
        r = json.load(open(rep)) if os.path.exists(rep) else {}
    fails = [(x["fullName"], (x.get("failureMessages") or [""])[0].split("\n")[0][:200]) for f in r.get("testResults", []) for x in f.get("assertionResults", []) if x["status"] == "failed"]
    fails += [(os.path.relpath(f["name"]), (f.get("message") or "").split("\n")[0][:200]) for f in r.get("testResults", []) if f.get("status") == "failed" and not any(x["status"] == "failed" for x in f.get("assertionResults", []))]
    return {"exit": p.returncode, "passed": r.get("numPassedTests"), "failed": r.get("numFailedTests"), "total": r.get("numTotalTests"), "failing": fails[:5]}
cfg0 = open(CFG, "rb").read(); dist0 = open(DIST, "rb").read()
assert cfg0.decode().count(OLD) == 1
out = {"load": open("/proc/loadavg").read().split()[:3], "fragment": {"old": OLD, "new": NEW}}
try:
    open(CFG, "w").write(cfg0.decode().replace(OLD, NEW))
    out["detectionMutated"] = vitest(["packages/polaris-generation-core/src/workspace-reach.test.ts", "apps/three-surface-poc/src/sync-child-process-guard.test.ts"])
    open(CFG, "wb").write(cfg0)
    open(DIST, "w").write("throw new Error('R549B-POISONED-SUPPORT-DIST');\n")
    out["effectUnmutated"] = vitest(["apps/three-surface-poc/src/git-observation.test.ts"])
    open(CFG, "w").write(cfg0.decode().replace(OLD, NEW))
    out["effectMutated"] = vitest(["apps/three-surface-poc/src/git-observation.test.ts"])
finally:
    open(CFG, "wb").write(cfg0); open(DIST, "wb").write(dist0)
out["restored"] = open(CFG, "rb").read() == cfg0 and open(DIST, "rb").read() == dist0
json.dump(out, open(sys.argv[1], "w"), indent=1); print(json.dumps(out, indent=1)[:3000])
