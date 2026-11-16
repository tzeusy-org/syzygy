"""rev-558: clean_build.mjs at each commit in a tree where typescript does not resolve (no node_modules). Usage from a checkout
root: python3 -I no_typescript.py <commit>..."""
import json, os, shutil, subprocess, sys, tempfile
out = []
for commit in sys.argv[1:]:
    script = subprocess.run(["git", "show", f"{commit}:scripts/clean_build.mjs"], capture_output=True, text=True, check=True).stdout
    root = tempfile.mkdtemp(prefix="nots-")
    try:
        os.makedirs(os.path.join(root, "scripts")); open(os.path.join(root, "scripts/clean_build.mjs"), "w").write(script)
        os.makedirs(os.path.join(root, "packages/a/src")); os.makedirs(os.path.join(root, "packages/a/dist"))
        open(os.path.join(root, "packages/a/dist/SENTINEL"), "w").write("kept\n")
        json.dump({"compilerOptions": {"composite": True, "outDir": "dist", "tsBuildInfoFile": "dist/.tsbuildinfo"}, "include": ["src"]}, open(os.path.join(root, "packages/a/tsconfig.json"), "w"))
        p = subprocess.run(["node", "scripts/clean_build.mjs", "packages/a"], cwd=root, capture_output=True, text=True)
        msg = next((l for l in p.stderr.splitlines() if l.startswith("Error")), "")
        out.append({"commit": commit, "exit": p.returncode, "message": msg.replace(root, "<tree>")[:160], "sentinelKept": os.path.exists(os.path.join(root, "packages/a/dist/SENTINEL"))})
    finally:
        shutil.rmtree(root)
print(json.dumps(out, indent=1))
