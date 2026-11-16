"""rev-558: clean_build.mjs base vs head over the lane's 34 trees plus the reviewer's own, with a full post-run snapshot.

Usage, from a Syzygy checkout root with node_modules installed: python3 -I matrix2.py <lane-tool> <base> <head> > out.json
For every case and commit it records exit, first error line, sentinels gone, and a sha256 snapshot of every file under the tree
(node_modules excluded, the tree root replaced by <tree>). For cases both commits accept it compares the snapshots."""
import hashlib, json, os, shutil, subprocess, sys, tempfile

lane_tool, base_arg, head_arg = sys.argv[1:4]
src = open(lane_tool).read()
prefix = src[: src.index("\n\ndef run(")]
ns = {"__file__": lane_tool}
argv = sys.argv
sys.argv = [lane_tool, base_arg, head_arg]
exec(compile(prefix, lane_tool, "exec"), ns)
sys.argv = argv
base, head, SCRIPTS, SENT = ns["base"], ns["head"], ns["SCRIPTS"], ns["SENT"]
edit, raw, inherit, setc, project = ns["edit"], ns["raw"], ns["inherit"], ns["setc"], ns["project"]
NODE_MODULES = os.path.abspath("node_modules")
OWN_NM = []  # cases that need a real node_modules directory


def wjson(root, path, obj):
    p = os.path.join(root, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write(obj if isinstance(obj, str) else json.dumps(obj))


def ext(value, own=None):
    def fn(c):
        c["extends"] = value
        if own: own(c)
    return fn


def pop(key):
    return lambda c: c["compilerOptions"].pop(key)


def pkg_extends(r, options, spec, via_pkgjson=False):
    # A real node_modules dir: typescript linked to the checkout's, and a config package cfgpkg.
    os.unlink(os.path.join(r, "node_modules"))
    os.makedirs(os.path.join(r, "node_modules"))
    os.symlink(os.path.join(NODE_MODULES, "typescript"), os.path.join(r, "node_modules/typescript"))
    wjson(r, "node_modules/cfgpkg/base.json" if via_pkgjson else "node_modules/cfgpkg/tsconfig.json", {"compilerOptions": options})
    wjson(r, "node_modules/cfgpkg/package.json", {"name": "cfgpkg", "version": "1.0.0", **({"tsconfig": "./base.json"} if via_pkgjson else {})})
    edit(r, "packages/a", ext(spec))


def dup_keys(r, first, second):
    # Two compilerOptions members in one JSON text: JSON.parse keeps the last; TypeScript's reader is what this probes.
    rest = json.load(open(os.path.join(r, "packages/a/tsconfig.json")))
    rest.pop("compilerOptions")
    body = json.dumps(rest)[1:-1]
    raw(r, "packages/a", '{"compilerOptions": %s, "compilerOptions": %s, %s}' % (json.dumps(first), json.dumps(second), body))


CO = {"composite": True, "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler", "types": [], "rootDir": "src", "outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}

MINE = [
    ("rev: extends depth 2, declarationDir outside at the end", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"extends": "./b2.json"}), wjson(r, "packages/a/b2.json", {"compilerOptions": {"declarationDir": "types"}}), edit(r, "packages/a", ext("./b1.json")))),
    ("rev: extends depth 3, outFile at the end", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"extends": "./b2.json"}), wjson(r, "packages/a/b2.json", {"extends": "../../b3.json"}), wjson(r, "b3.json", {"compilerOptions": {"outFile": "dist/a.js"}}), edit(r, "packages/a", ext("./b1.json")))),
    ("rev: extends depth 2, composite false at the end", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"extends": "./b2.json"}), wjson(r, "packages/a/b2.json", {"compilerOptions": {"composite": False}}), edit(r, "packages/a", ext("./b1.json", pop("composite"))))),
    ("rev: extends depth 2, declarationDir relative to the deepest file, under dist", ["packages/d"], lambda r: (wjson(r, "packages/a/cfg/b1.json", {"extends": "./deep/b2.json"}), wjson(r, "packages/a/cfg/deep/b2.json", {"compilerOptions": {"declarationDir": "../../dist/types"}}), edit(r, "packages/a", ext("./cfg/b1.json")))),
    ("rev: declarationDir relative to a parent-directory base, outside", ["packages/d"], lambda r: (wjson(r, "packages/base.json", {"compilerOptions": {"declarationDir": "types"}}), edit(r, "packages/a", ext("../base.json")))),
    ("rev: declarationDir relative to a parent-directory base, resolving under a/dist", ["packages/d"], lambda r: (wjson(r, "packages/base.json", {"compilerOptions": {"declarationDir": "a/dist/types"}}), edit(r, "packages/a", ext("../base.json")))),
    ("rev: declarationDir with configDir template, under dist", ["packages/d"], lambda r: (wjson(r, "base.json", {"compilerOptions": {"declarationDir": "${configDir}/dist/types"}}), edit(r, "packages/a", ext("../../base.json")))),
    ("rev: declarationDir with configDir template, outside", ["packages/d"], lambda r: (wjson(r, "base.json", {"compilerOptions": {"declarationDir": "${configDir}/types"}}), edit(r, "packages/a", ext("../../base.json")))),
    ("rev: extends array, second sets outFile", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"compilerOptions": {"strict": True}}), wjson(r, "packages/a/b2.json", {"compilerOptions": {"outFile": "dist/a.js"}}), edit(r, "packages/a", ext(["./b1.json", "./b2.json"])))),
    ("rev: extends array, first composite false, second composite true", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"compilerOptions": {"composite": False}}), wjson(r, "packages/a/b2.json", {"compilerOptions": {"composite": True}}), edit(r, "packages/a", ext(["./b1.json", "./b2.json"], pop("composite"))))),
    ("rev: extends array, first composite true, second composite false", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"compilerOptions": {"composite": True}}), wjson(r, "packages/a/b2.json", {"compilerOptions": {"composite": False}}), edit(r, "packages/a", ext(["./b1.json", "./b2.json"], pop("composite"))))),
    ("rev: extends a package specifier (pkg/tsconfig.json), declarationDir outside", ["packages/d"], lambda r: pkg_extends(r, {"declarationDir": "types"}, "cfgpkg/tsconfig.json")),
    ("rev: extends a bare package name, composite false", ["packages/d"], lambda r: (pkg_extends(r, {"composite": False}, "cfgpkg"), edit(r, "packages/a", pop("composite")))),
    ("rev: extends a package via package.json tsconfig field, composite true", ["packages/d"], lambda r: (pkg_extends(r, {"composite": True}, "cfgpkg", True), edit(r, "packages/a", pop("composite")))),
    ("rev: extends a package, declarationDir under dist via configDir", ["packages/d"], lambda r: pkg_extends(r, {"declarationDir": "${configDir}/dist/types"}, "cfgpkg")),
    ("rev: composite true by extends, overridden false by own", ["packages/d"], lambda r: inherit(r, "packages/a", {"composite": True}, lambda c: c["compilerOptions"].__setitem__("composite", False))),
    ("rev: composite false by extends, overridden true by own", ["packages/d"], lambda r: inherit(r, "packages/a", {"composite": False})),
    ("rev: composite as the string 'true'", ["packages/d"], lambda r: edit(r, "packages/a", setc("composite", "true"))),
    ("rev: references a directory with './' form", ["packages/d"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "./../a"}]))),
    ("rev: references a file (tsconfig.json) in a named project", ["packages/b"], lambda r: edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../a/tsconfig.json"}]))),
    ("rev: reference through a symlinked project directory inside the checkout", ["packages/d"], lambda r: (os.symlink(os.path.join(r, "packages/a"), os.path.join(r, "packages/alias")), edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../alias"}])))),
    ("rev: named symlinked project, non-composite reference via it", ["packages/b"], lambda r: (os.symlink(os.path.join(r, "packages/a"), os.path.join(r, "packages/alias")), edit(r, "packages/b", lambda c: c.__setitem__("references", [{"path": "../alias"}])), edit(r, "packages/a", setc("composite", False)))),
    ("rev: tsBuildInfoFile without incremental, named, nothing references it", ["packages/c"], lambda r: edit(r, "packages/c", pop("composite"))),
    ("rev: inherited declarationDir null", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": None})),
    ("rev: inherited outFile null", ["packages/d"], lambda r: inherit(r, "packages/a", {"outFile": None})),
    ("rev: inherited outDir null (own dist)", ["packages/d"], lambda r: inherit(r, "packages/a", {"outDir": None})),
    ("rev: inherited composite null", ["packages/d"], lambda r: inherit(r, "packages/a", {"composite": None}, lambda c: c["compilerOptions"].pop("composite"))),
    ("rev: extends a missing file", ["packages/d"], lambda r: edit(r, "packages/a", ext("./nope.json"))),
    ("rev: extends a file with comments and a trailing comma", ["packages/d"], lambda r: (wjson(r, "packages/a/base.json", '// c\n{"compilerOptions": {"declarationDir": "types",},}\n'), edit(r, "packages/a", ext("./base.json")))),
    ("rev: extends itself", ["packages/d"], lambda r: edit(r, "packages/a", ext("./tsconfig.json"))),
    ("rev: extends a two-file cycle", ["packages/d"], lambda r: (wjson(r, "packages/a/b1.json", {"extends": "./b2.json"}), wjson(r, "packages/a/b2.json", {"extends": "./b1.json", "compilerOptions": {"declarationDir": "types"}}), edit(r, "packages/a", ext("./b1.json")))),
    ("rev: duplicate compilerOptions, first sets declarationDir outside", ["packages/d"], lambda r: dup_keys(r, {**CO, "declarationDir": "types"}, CO)),
    ("rev: duplicate compilerOptions, first sets outDir out, second dist", ["packages/d"], lambda r: dup_keys(r, {**CO, "outDir": "out"}, CO)),
    ("rev: duplicate compilerOptions, first is the full set, second lacks composite", ["packages/d"], lambda r: dup_keys(r, CO, {k: v for k, v in CO.items() if k != "composite"})),
    ("rev: duplicate outDir inside one compilerOptions (out then dist)", ["packages/d"], lambda r: raw(r, "packages/a", json.dumps({"compilerOptions": CO, "include": ["src"], "references": []}).replace('"outDir": "dist"', '"outDir": "out", "outDir": "dist"'))),
    ("rev: tsconfig is an array", ["packages/d"], lambda r: raw(r, "packages/a", "[]")),
    ("rev: compilerOptions an array with outDir property impossible; compilerOptions null", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("compilerOptions", None))),
    ("rev: tsconfig.json is a directory", ["packages/d"], lambda r: (os.unlink(os.path.join(r, "packages/a/tsconfig.json")), os.makedirs(os.path.join(r, "packages/a/tsconfig.json")))),
    ("rev: include matches no input", ["packages/d"], lambda r: edit(r, "packages/a", lambda c: c.__setitem__("include", ["nothing"]))),
    ("rev: emitDeclarationOnly with declarationDir under dist", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist/types", "emitDeclarationOnly": True})),
    ("rev: tsBuildInfoFile inherited elsewhere, own dist (own wins)", ["packages/d"], lambda r: inherit(r, "packages/a", {"tsBuildInfoFile": "out/.tsbuildinfo"})),
    ("rev: declarationDir exactly dist through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist"})),
    ("rev: declarationDir 'dist-x' (prefix trap) through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist-x"})),
    ("rev: declarationDir 'dist/../types' through extends", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist/../types"})),
    ("rev: declarationDir a symlink under dist? (dist/types -> ../types)", ["packages/d"], lambda r: inherit(r, "packages/a", {"declarationDir": "dist/types"})),
    ("rev: two named, the second referenced by the first, second non-composite", ["packages/b", "packages/a"], lambda r: edit(r, "packages/a", setc("composite", False))),
    ("rev: non-composite referenced project already built earlier in the walk", ["packages/a", "packages/d"], lambda r: edit(r, "packages/a", setc("composite", False))),
]


def snapshot(root):
    out = {}
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d != "node_modules"]
        for f in fns:
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, root)
            if os.path.islink(p) and not os.path.exists(p):
                out[rel] = "dangling"; continue
            try:
                data = open(p, "rb").read().replace(root.encode(), b"<tree>")
            except OSError:
                out[rel] = "unreadable"; continue
            out[rel] = hashlib.sha256(data).hexdigest()
    return out


def run(commit, named, fn):
    root = tempfile.mkdtemp(prefix="r2m-")
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
        snap = snapshot(root)
        return {"exit": p.returncode, "message": message.strip().replace(root, "<tree>")[:240], "sentinelsGone": gone, "snapshot": snap,
                "tsErrors": sorted({l.split("error ")[1].split(":")[0] for l in lines if "error TS" in l})}
    finally:
        shutil.rmtree(root)
        for d in extra:
            shutil.rmtree(d)


which = sys.argv[4] if len(sys.argv) > 4 else "all"
cases = (ns["CASES"] if which in ("all", "lane") else []) + (MINE if which in ("all", "mine") else [])
rows = []
for name, named, fn in cases:
    b, h = run(base, named, fn), run(head, named, fn)
    rows.append({"case": name, "named": named, "base": b, "head": h, "own": name.startswith("rev:")})
    print(name, b["exit"], h["exit"], file=sys.stderr, flush=True)
refused = lambda s: s["exit"] != 0
acc = [r for r in rows if not refused(r["base"]) and not refused(r["head"])]
for r in rows:
    r["snapshotsEqual"] = r["base"]["snapshot"] == r["head"]["snapshot"]
    r["snapshotDiff"] = sorted(k for k in set(r["base"]["snapshot"]) | set(r["head"]["snapshot"]) if r["base"]["snapshot"].get(k) != r["head"]["snapshot"].get(k))
    for s in ("base", "head"):
        r[s]["files"] = len(r[s].pop("snapshot"))
print(json.dumps({
    "tool": {"sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
    "base": base, "head": head, "loadavg": open("/proc/loadavg").read().split()[:3], "cases": len(rows),
    "own": sum(r["own"] for r in rows),
    "newlyRefused": [r["case"] for r in rows if refused(r["head"]) and not refused(r["base"])],
    "newlyAccepted": [r["case"] for r in rows if refused(r["base"]) and not refused(r["head"])],
    "headRefusedAfterRemoval": [r["case"] for r in rows if refused(r["head"]) and r["head"]["sentinelsGone"]],
    "baseRefusedAfterRemoval": [r["case"] for r in rows if refused(r["base"]) and r["base"]["sentinelsGone"]],
    "messageChanged": [r["case"] for r in rows if refused(r["base"]) and refused(r["head"]) and r["base"]["message"] != r["head"]["message"]],
    "acceptedBoth": len(acc),
    "acceptedBothSnapshotDiffer": [r["case"] for r in acc if not r["snapshotsEqual"]],
    "rows": rows,
}, indent=1))
