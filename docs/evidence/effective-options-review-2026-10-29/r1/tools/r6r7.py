"""rev-558: try to reach R6 and R7 of clean_build.mjs with a project directory whose name holds a backslash, which TypeScript
normalizes to a slash. Usage from a checkout root: python3 -I r6r7.py <commit>... ; E1:<commit> runs that commit's script with the lane's E1 mutant applied."""
import json, os, shutil, subprocess, sys, tempfile
NM = os.path.abspath("node_modules")
CO = {"composite": True, "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler", "types": [], "rootDir": "src", "outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}
def proj(root, d):
    os.makedirs(os.path.join(root, d, "src"), exist_ok=True)
    open(os.path.join(root, d, "src", "m.ts"), "w").write("export const m = 1;\n")
    json.dump({"compilerOptions": CO, "include": ["src"]}, open(os.path.join(root, d, "tsconfig.json"), "w"))
    os.makedirs(os.path.join(root, d, "dist"), exist_ok=True); open(os.path.join(root, d, "dist", "SENTINEL"), "w").write("kept\n")
out = []
for commit in sys.argv[1:]:
    if commit.startswith("E1:"):
        script = subprocess.run(["git", "show", f"{commit[3:]}:scripts/clean_build.mjs"], capture_output=True, text=True, check=True).stdout
        frag = "!underDist(effective.outDir) || !underDist(effective.tsBuildInfoFile) || "
        assert script.count(frag) == 1
        script = script.replace(frag, "")
    else:
        script = subprocess.run(["git", "show", f"{commit}:scripts/clean_build.mjs"], capture_output=True, text=True, check=True).stdout
    for case, dirs in [("A: packages/x\\y alone (tried for R7)", ["packages/x\\y"]), ("B: packages/x\\y beside a nested packages/x/y (tried for R6)", ["packages/x\\y", "packages/x/y"])]:
        root = tempfile.mkdtemp(prefix="r67-")
        try:
            os.symlink(NM, os.path.join(root, "node_modules")); os.makedirs(os.path.join(root, "scripts"))
            open(os.path.join(root, "scripts/clean_build.mjs"), "w").write(script)
            for d in dirs: proj(root, d)
            p = subprocess.run(["node", "scripts/clean_build.mjs", "packages/x\\y"], cwd=root, capture_output=True, text=True, timeout=300)
            lines = [l for l in (p.stderr + p.stdout).splitlines() if l.startswith(("Error:", "TypeError:")) or "error TS" in l]
            out.append({"commit": commit, "case": case, "exit": p.returncode, "message": (lines[0] if lines else "").replace(root, "<tree>")[:200],
                        "sentinelKept": os.path.exists(os.path.join(root, "packages/x\\y/dist/SENTINEL"))})
        finally:
            shutil.rmtree(root)
print(json.dumps(out, indent=1))
