"""N8 exports-pin probe: mutate packages/support/package.json's exports three ways and run support-purity.test.ts each time,
restoring the bytes. Run from a checkout root; prints exit, counts and the failing test names."""
import json, os, subprocess, tempfile
P = "packages/support/package.json"
orig = open(P, "rb").read()
def run():
    with tempfile.TemporaryDirectory() as d:
        rep = os.path.join(d, "r.json")
        p = subprocess.run(["npx", "vitest", "run", "packages/support/src/support-purity.test.ts", "--reporter=json", f"--outputFile={rep}"], capture_output=True, text=True)
        r = json.load(open(rep))
    return p.returncode, r["numPassedTests"], r["numFailedTests"], [(x["fullName"][:90], (x.get("failureMessages") or [""])[0].split("\n")[0][:120]) for f in r["testResults"] for x in f["assertionResults"] if x["status"] == "failed"]
def mutate(fn):
    m = json.loads(orig); fn(m["exports"]); open(P, "w").write(json.dumps(m, indent=2) + "\n")
cases = {"source dropped": lambda e: e["."].pop("source"),
         "source names another module": lambda e: e["."].__setitem__("source", "./src/sha256.ts"),
         "a second entry ./purity": lambda e: e.__setitem__("./purity", {"source": "./src/purity.testkit.ts", "types": "./dist/purity.testkit.d.ts", "import": "./dist/purity.testkit.js", "default": "./dist/purity.testkit.js"})}
try:
    print("unmutated", run())
    for name, fn in cases.items():
        mutate(fn); print(name, run()); open(P, "wb").write(orig)
finally:
    open(P, "wb").write(orig)
print("restored", open(P, "rb").read() == orig)
