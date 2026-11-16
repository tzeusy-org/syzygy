"""X10: a built module names a test-support module by a triple-slash reference instead of an import. Prepends
/// <reference path="./test-frozen.ts" /> to packages/three-surface-poc-core/src/index.ts; asks tsc whether the project's program now
holds test-frozen.ts (--listFilesOnly), and runs product-build.test.ts. Restores the bytes. Run from a checkout root."""
import json, os, subprocess, tempfile
P = "packages/three-surface-poc-core/src/index.ts"
orig = open(P, "rb").read()
def listed():
    p = subprocess.run(["node", "node_modules/typescript/bin/tsc", "-p", "packages/three-surface-poc-core/tsconfig.json", "--listFilesOnly"], capture_output=True, text=True)
    return [l for l in p.stdout.splitlines() if "three-surface-poc-core/src/test-frozen" in l]
def vitest():
    with tempfile.TemporaryDirectory() as d:
        rep = os.path.join(d, "r.json")
        p = subprocess.run(["npx", "vitest", "run", "apps/three-surface-poc/src/product-build.test.ts", "--reporter=json", f"--outputFile={rep}"], capture_output=True, text=True)
        r = json.load(open(rep))
    return {"exit": p.returncode, "passed": r["numPassedTests"], "failed": r["numFailedTests"], "failing": [x["fullName"][:100] for f in r["testResults"] for x in f["assertionResults"] if x["status"] == "failed"]}
out = {"unmutatedListed": listed()}
try:
    open(P, "wb").write(b'/// <reference path="./test-frozen.ts" />\n' + orig)
    out["mutatedListed"] = listed(); out["mutatedRun"] = vitest()
finally:
    open(P, "wb").write(orig)
out["restored"] = open(P, "rb").read() == orig
print(json.dumps(out))
