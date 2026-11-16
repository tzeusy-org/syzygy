"""R-GP-IMPL-SOURCE-RESOLUTION-3: re-check F2's second sentence. Declare a resolver plugin inside the POC app's project entry of
vitest.config.ts (sending @syzygy/support to a nonexistent dist module), run the new row's file and the text check's file, revert.

python3 -I x9_recheck.py CHECKOUT TMPDIR
"""
import hashlib, os, subprocess, sys
repo, tmp = sys.argv[1:3]
quote = sys.argv[3] if len(sys.argv) > 3 else "single"  # the plugin name's quote: single or double
mutate = True
cfg = os.path.join(repo, "vitest.config.ts")
orig = open(cfg, "rb").read()
anchor = b"          name: '@syzygy/three-surface-poc-app',\n"
assert orig.count(anchor) == 1
q = b"'" if quote == "single" else b'"'
plugin = (b"        plugins: [{ name: " + q + b"x9-r3" + q + b", enforce: 'pre', resolveId(id: string) { return id === '@syzygy/support' ? "
          b"'/r549c-x9/packages/support/dist/index.js' : undefined; } }],\n")
mutated = orig.replace(b"        test: {\n" + anchor, plugin + b"        test: {\n" + anchor)
assert mutated != orig
open(cfg, "wb").write(mutated if mutate else orig)
print("mutated:", mutate, "plugin name quote:", quote)
try:
    env = {**os.environ, "TMPDIR": tmp}
    p = subprocess.run(["npx", "vitest", "run", "packages/polaris-generation-core/src/workspace-reach.test.ts",
                        "apps/three-surface-poc/src/sync-child-process-guard.test.ts"], cwd=repo, env=env, capture_output=True, text=True, timeout=580)
    out = p.stdout + p.stderr
    print("exit", p.returncode)
    for line in out.splitlines():
        s = line.strip()
        if s.startswith(("Test Files", "Tests ", "FAIL", "✓", "×", "AssertionError", "Error", "TypeError", "- ", "+ ", "→")) or "x9-r3" in s or "Expected" in s or "Received" in s: print(" ", s[:300])
finally:
    open(cfg, "wb").write(orig)
print("config restored:", hashlib.sha256(open(cfg, "rb").read()).hexdigest() == hashlib.sha256(orig).hexdigest())
