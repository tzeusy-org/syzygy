from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess

source = Path("packages/polaris-dossier/src/session-launch.ts")
test = "packages/polaris-dossier/src/session-launch.test.ts"
subject = "db7dbbd88db2bfc50dd4e8bfd36e4fae5f28de28"
assert subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() == subject
assert not subprocess.check_output(["git", "status", "--porcelain"])
text = source.read_text()
inline = """      const authority = state.inspectionAuthority;
      // Verification reads authority only. Census refusal takes precedence and
      // the exact live guard runs when both the census and verification settle.
      const verification = authority === undefined ? undefined
        : Promise.resolve().then(authority.verify).then(result => result === true, () => false);
"""
current = "      let stillCurrent = await (verification ?? state.current());\n"
guard = current + "      checkSample();\n"
confirm = "        stillCurrent = authority.confirm(stillCurrent === true);\n"
mutants = {
    "start-after-census": ("when current$", [[inline, ""], [current, inline + current]]),
    "omit-confirmation": ("when withdrawn$", [[confirm, "        stillCurrent = stillCurrent === true;\n"]]),
    "omit-pre-confirmation-deadline": ("when timed-out$", [[guard, current]]),
    "omit-post-confirmation-deadline": ("when confirmation-expired$", [[confirm + "        checkSample();\n", confirm]]),
}
storage = Path("/home/orca/.tmp/f3-db7-inspection-selected-faults")
storage.mkdir(exist_ok=False)
results = []

def run(name, pattern, edits):
    modified = text
    for old, new in edits:
        assert modified.count(old) == 1, name
        modified = modified.replace(old, new, 1)
    if edits:
        source.write_text(modified)
    command = ["npx", "--no-install", "vitest", "run", "--project", "integration", "--maxWorkers=1", test, "-t", pattern]
    try:
        r = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=90)
    finally:
        if edits:
            source.write_text(text)
    (storage / f"{name}.log").write_bytes(r.stdout)
    output = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", r.stdout.decode())
    assert (r.returncode == 1 and "AssertionError" in output and "1 failed" in output) if edits else (
        r.returncode == 0 and re.search(r"\b8 passed\b", output)
    ), f"{name} returned {r.returncode}, inspect its exact log"
    results.append({"id": name, "edits": edits, "exit": r.returncode, "command": command, "logSha256": sha256(r.stdout).hexdigest()})
    print(f"{name}: {'fault detected' if edits else '8 target cases passed'}", flush=True)

run(
    "baseline",
    "joins independent inspection authority|bounds storage census retries|keeps the 200ms cadence|bounds a stuck launch audit",
    [],
)
for name, (pattern, edits) in mutants.items():
    run(name, "joins independent inspection authority with the live census " + pattern, edits)
assert not subprocess.check_output(["git", "status", "--porcelain"])
(storage / "binding.json").write_text(json.dumps({"commit": subject, "source": str(source), "sourceSha256": sha256(text.encode()).hexdigest(), "results": results}, indent=2) + "\n")
