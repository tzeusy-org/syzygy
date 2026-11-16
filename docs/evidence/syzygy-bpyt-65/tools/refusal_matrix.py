"""syzygy-bpyt.65: scripts/clean_build.mjs at a base and a head commit, over the same scratch trees.

Usage, from the root of a Syzygy checkout with node_modules installed: `python3 -I refusal_matrix.py <base> <head> > record.json`.
Each case builds a fresh tree under $TMPDIR: one-file composite projects packages/a, packages/b -> ../a, packages/d -> ../b,
packages/c and tools/x, as product-build.test.ts builds them, with node_modules linked to the checkout's. It applies one edit,
plants a `kept` sentinel in every dist and in packages/a/types, copies each commit's script to <tree>/scripts/clean_build.mjs
(so it resolves typescript from the tree), runs it naming the case's projects, and records the exit status, the first error line
and every sentinel that did not survive. The cases are round 2's refusal probe of the PR 549 review
(docs/evidence/source-resolution-review-2026-10-28/r2/tools/refusal_probe.py), the refusal rows of product-build.test.ts, and the
options syzygy-bpyt.65 reads through `extends`. The record lists the cases the head refuses and the base did not, and the cases
the base refused and the head does not."""
import hashlib, json, os, shutil, subprocess, sys, tempfile

base, head = (subprocess.run(["git", "rev-parse", f"{c}^{{commit}}"], capture_output=True, text=True, check=True).stdout.strip() for c in sys.argv[1:3])
SCRIPTS = {c: subprocess.run(["git", "show", f"{c}:scripts/clean_build.mjs"], capture_output=True, text=True, check=True).stdout for c in (base, head)}
NODE_MODULES = os.path.abspath("node_modules")
SENT = ["packages/a/dist/a.js", "packages/a/types/a.d.ts", "packages/b/dist/b.js", "packages/c/dist/c.js", "packages/d/dist/d.js", "tools/x/dist/x.js"]


def project(root, d, refs):
    name = d.rsplit("/", 1)[1]
    os.makedirs(os.path.join(root, d, "src"), exist_ok=True)
    open(os.path.join(root, d, "src", f"{name}.ts"), "w").write(f"export const {name} = '{name}';\n")
    co = {"composite": True, "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler", "types": [], "rootDir": "src", "outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}
    json.dump({"compilerOptions": co, "include": ["src"], "references": [{"path": r} for r in refs]}, open(os.path.join(root, d, "tsconfig.json"), "w"))


def edit(root, d, fn):
    p = os.path.join(root, d, "tsconfig.json"); c = json.load(open(p)); fn(c); json.dump(c, open(p, "w"))


def raw(root, d, text):
    open(os.path.join(root, d, "tsconfig.json"), "w").write(text)


def inherit(root, d, options, own=None):
    json.dump({"compilerOptions": options}, open(os.path.join(root, d, "base.json"), "w"))
    def fn(c):
        c["extends"] = "./base.json"
        if own: own(c)
    edit(root, d, fn)


def outside(root):
    out = tempfile.mkdtemp(prefix="cbm-outside-")
    json.dump(json.load(open(os.path.join(root, "packages/c/tsconfig.json"))), open(os.path.join(out, "tsconfig.json"), "w"))
    os.symlink(out, os.path.join(root, "packages/e"))
    return out


def setc(key, value):
    return lambda c: c["compilerOptions"].__setitem__(key, value)


CASES = [
    # Round 2's refusal probe, in its order.
    ("r2: self-reference", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("references", [{"path": "."}]))),
    ("r2: two-node cycle not through the named project", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("references", [{"path": "../b"}]))),
    ("r2: reference written as a tsconfig file path", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../a/tsconfig.json"}]))),
    ("r2: reference with a trailing slash", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../a/"}]))),
    ("r2: compilerOptions a string", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("compilerOptions", "x"))),
    ("r2: tsconfig is JSON null", ["packages/d"], lambda r: raw(r, "packages/a", "null")),
    ("r2: references an object, not a list", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", {"path": "../a"}))),
    ("r2: declarationDir under dist", ["packages/d"], lambda r: edit(r, "packages/a", setc("declarationDir", "dist"))),
    ("r2: outDir './dist'", ["packages/d"], lambda r: edit(r, "packages/a", setc("outDir", "./dist"))),
    ("r2: outFile null", ["packages/d"], lambda r: edit(r, "packages/a", setc("outFile", None))),
    ("r2: named project via ..", ["packages/c/../d"], lambda r: None),
    ("r2: named project a symlink to another project inside the checkout", ["packages/alias"], lambda r: os.symlink(os.path.join(r, "packages/a"), os.path.join(r, "packages/alias"))),
    ("r2: reference to a non-composite project", ["packages/d"], lambda r: edit(r, "packages/a", setc("composite", False))),
    ("r2: inherited declarationDir through extends", ["packages/d"], lambda r: (json.dump({"compilerOptions": {"declarationDir": "types"}}, open(os.path.join(r, "base.json"), "w")), edit(r, "packages/a", lambda c: c.__setitem__("extends", "../../base.json")))),
    # product-build.test.ts's refusal rows before syzygy-bpyt.65.
    ("test: names no project", [], lambda r: None),
    ("test: names a directory with no tsconfig.json", ["packages/e"], lambda r: None),
    ("test: names a project outside the workspaces", ["tools/x"], lambda r: None),
    ("test: reaches a project whose outputs leave dist", ["packages/d"], lambda r: edit(r, "packages/a", setc("outDir", "out"))),
    ("test: reaches a project whose declarations leave dist", ["packages/d"], lambda r: edit(r, "packages/a", setc("declarationDir", "types"))),
    ("test: reaches a project that bundles its outputs into one file", ["packages/d"], lambda r: edit(r, "packages/a", setc("outFile", "dist/a.js"))),
    ("test: reaches a reference cycle", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("references", [{"path": "../d"}]))),
    ("test: reaches a tsconfig.json that is not plain JSON", ["packages/d"], lambda r: raw(r, "packages/a", "// a comment\n" + open(os.path.join(r, "packages/a/tsconfig.json")).read())),
    ("test: names a project whose directory resolves outside the checkout", ["packages/e"], outside),
    # syzygy-bpyt.65: options read through extends.
    ("65: declarationDir outside dist through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "types"})),
    ("65: outFile through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"outFile": "dist/a.js"})),
    ("65: referenced project with composite false", ["packages/d"], lambda r: edit(r, "packages/a", setc("composite", False))),
    ("65: referenced project with composite unset", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c["compilerOptions"].pop("composite"))),
    ("65: referenced project inheriting composite false", ["packages/d"], lambda r: inherit(r, "packages/a", {"composite": False}, lambda c: c["compilerOptions"].pop("composite"))),
    ("65: a project both named and referenced, not composite", ["packages/a", "packages/b"], lambda r: edit(r, "packages/a", setc("composite", False))),
    # Trees the head must still accept.
    ("accept: the tree as built", ["packages/d"], lambda r: None),
    ("accept: declarationDir under dist through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist/types"})),
    ("accept: an inherited outDir the project's own outDir overrides", ["packages/d"], lambda r: inherit(r, "packages/a", {"outDir": "out"})),
    ("accept: a named project nothing references, not composite", ["packages/c"], lambda r: edit(r, "packages/c", lambda c: (c["compilerOptions"].pop("composite"), c["compilerOptions"].__setitem__("incremental", True)))),
    ("accept: composite true through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"composite": True}, lambda c: c["compilerOptions"].pop("composite"))),
]


def run(commit, named, fn):
    root = tempfile.mkdtemp(prefix="cbm-")
    extra = []
    try:
        os.symlink(NODE_MODULES, os.path.join(root, "node_modules"))
        for d, refs in [("packages/a", []), ("packages/b", ["../a"]), ("packages/c", []), ("packages/d", ["../b"]), ("tools/x", [])]:
            project(root, d, refs)
        made = fn(root)
        if isinstance(made, str):
            extra.append(made)
        for s in SENT:
            os.makedirs(os.path.dirname(os.path.join(root, s)), exist_ok=True); open(os.path.join(root, s), "w").write("kept\n")
        os.makedirs(os.path.join(root, "scripts"))
        open(os.path.join(root, "scripts/clean_build.mjs"), "w").write(SCRIPTS[commit])
        p = subprocess.run(["node", "scripts/clean_build.mjs", *named], cwd=root, capture_output=True, text=True, timeout=300)
        lines = [l for l in (p.stderr + "\n" + p.stdout).splitlines() if l.strip()]
        message = next((l for l in lines if l.lstrip().startswith(("Error:", "TypeError:")) or "error TS" in l), lines[-1] if lines else "")
        gone = [s for s in SENT if not (os.path.exists(os.path.join(root, s)) and open(os.path.join(root, s)).read() == "kept\n")]
        return {"exit": p.returncode, "message": message.strip().replace(root, "<tree>")[:240], "sentinelsGone": gone}
    finally:
        shutil.rmtree(root)
        for d in extra:
            shutil.rmtree(d)


rows = []
for name, named, fn in CASES:
    b, h = run(base, named, fn), run(head, named, fn)
    rows.append({"case": name, "named": named, "base": b, "head": h})
refused = lambda side: side["exit"] != 0
print(json.dumps({
    "subject": "scripts/clean_build.mjs, base against head, over the same scratch trees",
    "tool": {"path": "docs/evidence/syzygy-bpyt-65/tools/refusal_matrix.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
    "base": {"commit": base, "scriptSha256": hashlib.sha256(SCRIPTS[base].encode()).hexdigest()},
    "head": {"commit": head, "scriptSha256": hashlib.sha256(SCRIPTS[head].encode()).hexdigest()},
    "loadavg": open("/proc/loadavg").read().split()[:3],
    "cases": len(rows),
    "newlyRefused": [r["case"] for r in rows if refused(r["head"]) and not refused(r["base"])],
    "newlyAccepted": [r["case"] for r in rows if refused(r["base"]) and not refused(r["head"])],
    "headRefusedAfterRemoval": [r["case"] for r in rows if refused(r["head"]) and r["head"]["sentinelsGone"]],
    "baseRefusedAfterRemoval": [r["case"] for r in rows if refused(r["base"]) and r["base"]["sentinelsGone"]],
    "messageChanged": [r["case"] for r in rows if refused(r["base"]) and refused(r["head"]) and r["base"]["message"] != r["head"]["message"]],
    "rows": rows,
}, indent=1))
