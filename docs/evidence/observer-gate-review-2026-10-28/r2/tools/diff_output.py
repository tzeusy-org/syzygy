"""R-GP-IMPL-OBSERVER-GATE-2: run git-observation.test.ts under one gate mutant with the default reporter, so the equality row's
diff lists every mismatch string; restores the gate's bytes. Usage, from a clean clone: python3 -I <this> <R2|M4> <out.txt>"""
import subprocess, sys
GATE = "apps/three-surface-poc/src/git-observation.ts"
EDITS = {"R2": ("inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.includes(prefix))"),
         "M4": ("    'packages/polaris-generation-consent/',\n", "    'packages/polaris-generation-consent/',\n    'packages/polaris-dossier/',\n")}
old, new = EDITS[sys.argv[1]]
original = open(GATE, "rb").read()
text = original.decode()
assert text.count(old) == 1
try:
    open(GATE, "w").write(text.replace(old, new))
    done = subprocess.run(["npx", "vitest", "run", "apps/three-surface-poc/src/git-observation.test.ts", "-t", "refuses exactly"], capture_output=True, text=True, env={**__import__("os").environ, "NO_COLOR": "1", "FORCE_COLOR": "0"})
finally:
    open(GATE, "wb").write(original)
open(sys.argv[2], "w").write(done.stdout + done.stderr)
print(done.returncode)
