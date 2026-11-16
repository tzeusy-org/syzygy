"""Round-2 refusal probe of scripts/clean_build.mjs at a checkout (argv[1]); scratch parent argv[2]; JSONL out argv[3].
Each case builds a fresh tree: packages/a, packages/b -> ../a, packages/d -> ../b, packages/c (one-file composite projects as in
product-build.test.ts), plants 'kept' sentinels in every dist and in packages/a/types, applies one edit, runs the script naming
the given projects, and records exit status, the last stderr/stdout line, and every sentinel that did not survive."""
import json, os, shutil, subprocess, sys, tempfile
repo, parent, out = sys.argv[1:4]
SCRIPT = os.path.join(repo, "scripts/clean_build.mjs")
TSC_NODE_MODULES = os.path.join(repo, "node_modules")
def project(root, d, refs, extra=None):
    name = d.rsplit("/", 1)[1]
    os.makedirs(os.path.join(root, d, "src"), exist_ok=True)
    open(os.path.join(root, d, "src", f"{name}.ts"), "w").write(f"export const {name} = '{name}';\n")
    co = {"composite": True, "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler", "types": [], "rootDir": "src", "outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}
    co.update(extra or {})
    json.dump({"compilerOptions": co, "include": ["src"], "references": [{"path": r} for r in refs]}, open(os.path.join(root, d, "tsconfig.json"), "w"))
def edit(root, d, fn):
    p = os.path.join(root, d, "tsconfig.json"); c = json.load(open(p)); fn(c); json.dump(c, open(p, "w"))
SENT = ["packages/a/dist/a.js", "packages/a/types/a.d.ts", "packages/b/dist/b.js", "packages/c/dist/c.js", "packages/d/dist/d.js"]
def raw(root, d, text): open(os.path.join(root, d, "tsconfig.json"), "w").write(text)
CASES = [
    ("self-reference", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("references", [{"path": "."}]))),
    ("two-node cycle not through the named project", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("references", [{"path": "../b"}]))),
    ("reference written as a tsconfig file path", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../a/tsconfig.json"}]))),
    ("reference with a trailing slash", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../a/"}]))),
    ("compilerOptions a string", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("compilerOptions", "x"))),
    ("tsconfig is JSON null", ["packages/d"], lambda r: raw(r, "packages/a", "null")),
    ("references an object, not a list", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", {"path": "../a"}))),
    ("declarationDir under dist", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c["compilerOptions"].__setitem__("declarationDir", "dist"))),
    ("outDir './dist'", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c["compilerOptions"].__setitem__("outDir", "./dist"))),
    ("outFile undefined-valued key via null", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c["compilerOptions"].__setitem__("outFile", None))),
    ("named project via ..", ["packages/c/../d"], lambda r: None),
    ("named project a symlink to another project inside the checkout", ["packages/alias"], lambda r: os.symlink(os.path.join(r, "packages/a"), os.path.join(r, "packages/alias"))),
    ("reference to a non-composite project (tsc's refusal, after the script)", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c["compilerOptions"].__setitem__("composite", False))),
    ("inherited declarationDir through extends (declared not read)", ["packages/d"], lambda r: (open(os.path.join(r, "base.json"), "w").write(json.dumps({"compilerOptions": {"declarationDir": "types"}})), edit(r, "packages/a", lambda c: c.__setitem__("extends", "../../base.json")))),
]
rows = []
for name, named, fn in CASES:
    root = tempfile.mkdtemp(prefix="cb-", dir=parent)
    os.symlink(TSC_NODE_MODULES, os.path.join(root, "node_modules"))
    project(root, "packages/a", []); project(root, "packages/b", ["../a"]); project(root, "packages/c", []); project(root, "packages/d", ["../b"])
    fn(root)
    for s in SENT:
        os.makedirs(os.path.dirname(os.path.join(root, s)), exist_ok=True); open(os.path.join(root, s), "w").write("kept\n")
    p = subprocess.run(["node", SCRIPT, *named], cwd=root, capture_output=True, text=True, timeout=300)
    lines = [l for l in (p.stderr + "\n" + p.stdout).splitlines() if l.strip()]
    errline = next((l for l in lines if l.lstrip().startswith(("Error:", "TypeError:")) or "error TS" in l), lines[-1] if lines else "")
    gone = [s for s in SENT if not (os.path.exists(os.path.join(root, s)) and open(os.path.join(root, s)).read() == "kept\n")]
    rows.append({"case": name, "named": named, "exit": p.returncode, "message": errline.strip()[:240], "sentinelsGone": gone})
    shutil.rmtree(root)
with open(out, "w") as f:
    for r in rows: f.write(json.dumps(r) + "\n")
for r in rows: print(r["exit"], "|", r["case"], "|", r["message"][:150], "| gone:", r["sentinelsGone"])
