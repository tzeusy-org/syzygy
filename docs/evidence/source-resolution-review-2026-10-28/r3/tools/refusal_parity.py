"""R-GP-IMPL-SOURCE-RESOLUTION-3: F4's parenthetical. Four synthetic trees (a reference cycle, declarationDir, outFile, a project
directory symlinked outside the checkout), each run under the clean-build script of 2f249d2c and of a607bb62 with a stub tsc.

python3 -I refusal_parity.py CHECKOUT WORKDIR
"""
import json, os, shutil, subprocess, sys
repo, work = sys.argv[1:3]
OK = {"outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}
CASES = {
    "cycle": {"packages/a": {"compilerOptions": OK, "references": [{"path": "../b"}]}, "packages/b": {"compilerOptions": OK, "references": [{"path": "../a"}]}},
    "declarationDir": {"packages/a": {"compilerOptions": {**OK, "declarationDir": "types"}, "references": [{"path": "../b"}]}, "packages/b": {"compilerOptions": OK}},
    "outFile": {"packages/a": {"compilerOptions": {**OK, "outFile": "dist/a.js"}, "references": [{"path": "../b"}]}, "packages/b": {"compilerOptions": OK}},
    "outside": {"packages/a": {"compilerOptions": OK, "references": [{"path": "../b"}]}, "OUTSIDE:packages/b": {"compilerOptions": OK}},
}
for case, projects in CASES.items():
    for rev in ("2f249d2c", "a607bb62"):
        base = os.path.join(work, f"{case}-{rev}"); shutil.rmtree(base, ignore_errors=True)
        d = os.path.join(base, "root"); os.makedirs(os.path.join(d, "scripts"))
        open(os.path.join(d, "scripts/clean_build.mjs"), "wb").write(subprocess.run(["git", "-C", repo, "show", f"{rev}:scripts/clean_build.mjs"], capture_output=True, check=True).stdout)
        os.makedirs(os.path.join(d, "node_modules/typescript/bin"))
        open(os.path.join(d, "node_modules/typescript/package.json"), "w").write('{"name":"typescript","version":"0.0.0-stub"}')
        open(os.path.join(d, "node_modules/typescript/bin/tsc"), "w").write("require('fs').writeFileSync('tsc-ran', '');\n")
        markers = []
        for name, cfg in projects.items():
            if name.startswith("OUTSIDE:"):
                name = name[len("OUTSIDE:"):]
                real = os.path.join(base, "outside", os.path.basename(name)); os.makedirs(real)
                os.makedirs(os.path.join(d, os.path.dirname(name)), exist_ok=True); os.symlink(real, os.path.join(d, name))
            pd = os.path.join(d, name); os.makedirs(os.path.join(pd, "dist"), exist_ok=True)
            json.dump(cfg, open(os.path.join(pd, "tsconfig.json"), "w"))
            open(os.path.join(pd, "dist", "marker"), "w").write("x"); markers.append(name)
        p = subprocess.run(["node", "scripts/clean_build.mjs", "packages/a"], cwd=d, capture_output=True, text=True)
        removed = [m for m in markers if not os.path.exists(os.path.join(d, m, "dist", "marker"))]
        err = [l for l in p.stderr.splitlines() if l.startswith("Error")]
        print(json.dumps({"case": case, "script": rev, "exit": p.returncode, "refusal": err[:1], "removed": removed, "tscRan": os.path.exists(os.path.join(d, "tsc-ran"))}))
        shutil.rmtree(base)
