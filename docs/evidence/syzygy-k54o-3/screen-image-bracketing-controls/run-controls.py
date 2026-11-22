from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import sys

source = Path("packages/polaris-dossier/src/url-ordered-design-screen.ts")
test_path = "packages/polaris-dossier/src/url-ordered-design-screen.test.ts"
subject = "9eb31ba04eb3164b269727fc57417e7117528efc"
assert subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() == subject
assert not subprocess.check_output(["git", "status", "--porcelain"])
text = source.read_text()
storage = Path(sys.argv[1])
storage.mkdir(exist_ok=False)
switch = "    const readCurrent = options.imageReadCurrent ?? options.current;"
guard = "    const imageReadCurrent = (): void => { if (!readCurrent() || Date.now() >= options.deadlineEpochMilliseconds) refuse(); };"
identity = "  return same(held.stat, fs.fstatSync(held.fd, { bigint: true })) && same(held.stat, fs.lstatSync(held.file.path, { bigint: true }));"
final = "    options.chargeCpuMicroseconds?.(cpuMicroseconds);\n    current();"
faults = {
    "repeat-full-guard": ("hashes trusted images under the private guard", switch, "    const readCurrent = options.current;"),
    "ignore-private-refusal": (
        "refuses private-guard withdrawn",
        guard,
        "    const imageReadCurrent = (): void => { readCurrent(); if (Date.now() >= options.deadlineEpochMilliseconds) refuse(); };",
    ),
    "omit-held-name": (
        "rechecks worker named-identity",
        identity,
        "  return same(held.stat, fs.fstatSync(held.fd, { bigint: true }));",
    ),
    "omit-final-authority": (
        "rechecks full authority after charging",
        final,
        "    options.chargeCpuMicroseconds?.(cpuMicroseconds);",
    ),
}
results = []
for name, (pattern, old, new) in faults.items():
    assert text.count(old) == 1, name
    command = ["npx", "--no-install", "vitest", "run", "--project", "integration", "--maxWorkers=1", test_path, "-t", pattern]
    source.write_text(text.replace(old, new, 1))
    try:
        case = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=110)
    finally:
        source.write_text(text)
    (storage / f"{name}.log").write_bytes(case.stdout)
    output = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", case.stdout.decode())
    assert case.returncode == 1 and "AssertionError" in output and "1 failed" in output, f"{name}: {case.returncode}"
    results.append({"id": name, "old": old, "new": new, "exit": case.returncode, "command": command, "logSha256": sha256(case.stdout).hexdigest()})
    print(f"{name}: fault detected", flush=True)
assert not subprocess.check_output(["git", "status", "--porcelain"])
baseline = Path("/home/orca/.tmp/f3-9eb-screen-baseline.log").read_bytes()
assert b"1 passed" in baseline
(storage / "baseline.log").write_bytes(baseline)
(storage / "binding.json").write_text(json.dumps({"commit": subject, "source": str(source), "sourceSha256": sha256(text.encode()).hexdigest(),
    "baselineLogSha256": sha256(baseline).hexdigest(), "results": results}, indent=2) + "\n")
