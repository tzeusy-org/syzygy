"""R-GP-IMPL-SOURCE-RESOLUTION-3: F4 replacement probe. For each tree, run the clean-build script of 2f249d2c and of a607bb62 over
that tree's own build:poc and build project lists, with a stub tsc that records its argv, and a marker planted in every project's
dist. Reports exit status, refusal line, which dists were removed, and the tsc argv.

python3 -I clean_build_parity.py CHECKOUT WORKDIR TREE...
"""
import json, os, shutil, subprocess, sys

repo, work = sys.argv[1:3]
trees = sys.argv[3:]
def git(*a, **k): return subprocess.run(["git", "-C", repo, *a], capture_output=True, check=True, **k).stdout
results = []
for tree in trees:
    pkg = json.loads(git("show", f"{tree}:package.json"))
    for script_name in ("build:poc", "build"):
        args = pkg["scripts"][script_name].split()
        assert args[:2] == ["node", "scripts/clean_build.mjs"], (tree, script_name, args)
        projects = args[2:]
        for script_rev in ("2f249d2c", "a607bb62"):
            d = os.path.join(work, f"{tree}-{script_name.replace(':', '_')}-{script_rev}")
            shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
            tar = git("archive", tree)
            subprocess.run(["tar", "-x", "-C", d], input=tar, check=True)
            os.makedirs(os.path.join(d, "scripts"), exist_ok=True)
            open(os.path.join(d, "scripts/clean_build.mjs"), "wb").write(git("show", f"{script_rev}:scripts/clean_build.mjs"))
            os.makedirs(os.path.join(d, "node_modules/typescript/bin"))
            open(os.path.join(d, "node_modules/typescript/package.json"), "w").write('{"name":"typescript","version":"0.0.0-stub"}')
            open(os.path.join(d, "node_modules/typescript/bin/tsc"), "w").write(
                "require('fs').writeFileSync(require('path').join(process.cwd(), 'tsc-argv.json'), JSON.stringify(process.argv.slice(2)));\n")
            planted = []
            for parent in ("apps", "packages"):
                for name in sorted(os.listdir(os.path.join(d, parent))):
                    if os.path.isfile(os.path.join(d, parent, name, "tsconfig.json")):
                        os.makedirs(os.path.join(d, parent, name, "dist"), exist_ok=True)
                        open(os.path.join(d, parent, name, "dist", "marker"), "w").write("x")
                        planted.append(f"{parent}/{name}")
            p = subprocess.run(["node", "scripts/clean_build.mjs", *projects], cwd=d, capture_output=True, text=True)
            removed = sorted(q for q in planted if not os.path.exists(os.path.join(d, q, "dist", "marker")))
            argv_path = os.path.join(d, "tsc-argv.json")
            argv = json.load(open(argv_path)) if os.path.exists(argv_path) else None
            err = [l for l in p.stderr.splitlines() if l.startswith("Error")]
            r = {"tree": tree, "list": script_name, "script": script_rev, "exit": p.returncode, "refusal": err[:1], "removed": removed, "tscArgv": argv}
            results.append(r); print(json.dumps(r))
            shutil.rmtree(d)
for tree in trees:
    for script_name in ("build:poc", "build"):
        a, b = [r for r in results if r["tree"] == tree and r["list"] == script_name]
        print(tree, script_name, "same removed set:", a["removed"] == b["removed"], "same tsc argv:", a["tscArgv"] == b["tscArgv"], "both exit 0:", a["exit"] == b["exit"] == 0)
