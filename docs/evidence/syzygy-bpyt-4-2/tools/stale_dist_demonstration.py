"""syzygy-bpyt.4.2, acceptance criterion 2: a stale dist cannot change what a POC tool does.

Run from the root of a Syzygy checkout whose dependencies are installed: `python3 <this file> > record.json`. It writes only
under the dist directories `npm run build:poc` builds, and leaves them as a clean `npm run build:poc` does.

For each of three ways to build the POC, starting from a clean `npm run build:poc`, it plants four stale outputs:
- `apps/three-surface-poc/dist/main.js` poisoned (its source is unchanged);
- `packages/support/dist/index.js` poisoned, in a project the POC build reaches only through a reference;
- `apps/three-surface-poc/dist/orphan-stale.js` written, an output whose source is gone;
- `apps/three-surface-poc/dist/routes.js` deleted.

It then builds, and records what is left of each, whether every built dist is byte-identical to the clean build's, and what one
POC tool does: `node apps/three-surface-poc/dist/main.js` against a directory that is not the registered repository, which loads
the daemon's whole static import graph and then refuses (exit status, stdout and stderr, compared with the clean build's run).
The three ways are an incremental `tsc -b`, the `tsc -b --force` that `build:poc` ran before this change, and `npm run build:poc`
as this checkout defines it. The project list is read from this checkout's `build:poc` script."""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile

POISON = 'throw new Error("poisoned stale output");\n'
POISONED = ["apps/three-surface-poc/dist/main.js", "packages/support/dist/index.js"]
ORPHAN = "apps/three-surface-poc/dist/orphan-stale.js"
DELETED = "apps/three-surface-poc/dist/routes.js"

scripts = json.load(open("package.json"))["scripts"]
projects = re.fullmatch(r"node scripts/clean_build\.mjs ((?:(?:apps|packages)/[\w.-]+ ?)+)", scripts["build:poc"]).group(1).split()


def closure(names):
    seen = []
    def visit(project):
        if project in seen:
            return
        seen.append(project)
        for reference in json.load(open(os.path.join(project, "tsconfig.json"))).get("references", []):
            visit(os.path.normpath(os.path.join(project, reference["path"])))
    for name in names:
        visit(name)
    return sorted(seen)


BUILT = closure(projects)


def dist_digest():
    digest = hashlib.sha256()
    count = 0
    for project in BUILT:
        for directory, _, files in sorted(os.walk(os.path.join(project, "dist"))):
            for name in sorted(files):
                path = os.path.join(directory, name)
                digest.update(path.encode() + b"\0" + open(path, "rb").read() + b"\0")
                count += 1
    return {"files": count, "sha256": digest.hexdigest()}


def run(command):
    done = subprocess.run(command, capture_output=True, text=True)
    return {"exit": done.returncode, "stdout": done.stdout, "stderr": done.stderr}


scratch = tempfile.mkdtemp(prefix="bpyt-4-2-stale-")
not_a_repo = os.path.join(scratch, "not-a-repo")
os.makedirs(not_a_repo)


def probe():
    state = tempfile.mkdtemp(dir=scratch)
    result = run(["node", "apps/three-surface-poc/dist/main.js", "--repo", not_a_repo, "--port", "0", "--state-dir", state])
    result["stateDirEntries"] = len(os.listdir(state))
    return result


def clean_build():
    result = run(["npm", "run", "build:poc", "--silent"])
    if result["exit"] != 0:
        sys.exit(f"clean build:poc failed: {result['stderr']}")


ARMS = [
    ("incremental tsc -b", ["npx", "tsc", "-b", *projects]),
    ("tsc -b --force (build:poc before this change)", ["npx", "tsc", "-b", "--force", *projects]),
    ("npm run build:poc (this checkout)", ["npm", "run", "build:poc", "--silent"]),
]
record = {
    "subject": "acceptance criterion 2 of syzygy-bpyt.4.2: a stale dist cannot change a POC tool's behaviour",
    "commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip(),
    "worktreeClean": subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == "",
    "subjectSha256": {path: hashlib.sha256(open(path, "rb").read()).hexdigest() for path in ("scripts/clean_build.mjs", "package.json")},
    "buildPocScript": scripts["build:poc"],
    "builtProjects": BUILT,
    "tsc": subprocess.run(["npx", "tsc", "-v"], capture_output=True, text=True).stdout.strip(),
    "node": subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip(),
    "planted": {"poisoned": POISONED, "poison": POISON, "orphan": ORPHAN, "deleted": DELETED},
    "arms": [],
}
try:
    for label, command in ARMS:
        clean_build()
        reference, reference_probe = dist_digest(), probe()
        for path in POISONED:
            open(path, "w").write(POISON)
        open(ORPHAN, "w").write(POISON)
        os.remove(DELETED)
        built = run(command)
        after = probe()
        record["arms"].append({
            "build": label, "command": command, "buildExit": built["exit"],
            "left": {
                "poisonedStillPoisoned": {path: open(path).read() == POISON for path in POISONED},
                "orphanStillPresent": os.path.exists(ORPHAN),
                "deletedStillMissing": not os.path.exists(DELETED),
            },
            "cleanDist": reference, "distAfter": dist_digest(),
            "cleanProbe": reference_probe, "probeAfter": after,
            "probeUnchanged": all(after[key] == reference_probe[key] for key in ("exit", "stdout", "stderr", "stateDirEntries")),
        })
        record["arms"][-1]["distIdenticalToClean"] = record["arms"][-1]["distAfter"] == reference
finally:
    clean_build()
    shutil.rmtree(scratch, ignore_errors=True)
print(json.dumps(record, indent=1))
