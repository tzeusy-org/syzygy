"""syzygy-bpyt.4.2: how long the build a POC tool launch runs takes, before and after.

`python3 launch_timing.py <base checkout> <head checkout> <runs>` runs `npm run build:poc --silent` in each installed checkout,
alternating base and head, and prints one JSON record of each run's wall time and the 1-minute load average when it started.
Before this change the build was `tsc -b --force` over the POC projects; after it, the clean build over the same projects."""
import json, os, subprocess, sys, time

base, head, runs = sys.argv[1], sys.argv[2], int(sys.argv[3])


def commit(root):
    return subprocess.run(["git", "-C", root, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()


def script(root):
    return json.load(open(os.path.join(root, "package.json")))["scripts"]["build:poc"]


samples = {"base": [], "head": []}
for _ in range(runs):
    for label, root in (("base", base), ("head", head)):
        load = os.getloadavg()[0]
        start = time.monotonic()
        done = subprocess.run(["npm", "run", "build:poc", "--silent"], cwd=root, capture_output=True, text=True)
        samples[label].append({"seconds": round(time.monotonic() - start, 2), "load1AtStart": round(load, 2), "exit": done.returncode})
print(json.dumps({
    "subject": "wall time of `npm run build:poc`, the build every poc:* tool launch runs first",
    "base": {"commit": commit(base), "buildPoc": script(base), "runs": samples["base"]},
    "head": {"commit": commit(head), "buildPoc": script(head), "runs": samples["head"]},
    "cpus": os.cpu_count(),
}, indent=1))
