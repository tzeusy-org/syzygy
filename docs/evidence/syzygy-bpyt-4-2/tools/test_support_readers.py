"""List every reader of the nine test-support modules the product build stops emitting (R-GP-IMPL-SOURCE-RESOLUTION-1 F1).

    python3 -I docs/evidence/syzygy-bpyt-4-2/tools/test_support_readers.py OUT.json

Run it from the root of a checkout. Population: every tracked file whose suffix is one of .ts .mts .cts .js .mjs .cjs
.py .sh .yml .yaml, or whose basename is package.json or tsconfig*.json, outside docs/reviews/ (retained raw reviews).
A hit is a line holding a module's basename stem as a literal (str.find). Each hit is classed by Python re:
  dist     the line names a `dist` path segment: (?<![\\w-])dist/
  src      the line names the module under `src/` or by a relative `./` specifier
  other    anything else (a comment or a list)
and by its file: a `*.test.ts` file, a module in the nine, or a reader outside both. A dist reader outside the tests and
the nine is what F1 asks to list.
"""
import hashlib
import json
import re
import subprocess
import sys

MODULES = [
    "apps/three-surface-poc/src/test-deep-dive-markers.ts",
    "apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts",
    "apps/three-surface-poc/src/test-http-client.ts",
    "packages/polaris-dossier/src/child-process.testkit.ts",
    "packages/polaris-dossier/src/fs-patch.testkit.ts",
    "packages/polaris-dossier/src/full-run.testkit.ts",
    "packages/polaris-generation-core/src/workspace-reach.testkit.ts",
    "packages/three-surface-poc-core/src/test-cleanup.ts",
    "packages/three-surface-poc-core/src/test-frozen.ts",
]
SUFFIXES = (".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".py", ".sh", ".yml", ".yaml")
DIST = re.compile(r"(?<![\w-])dist/")


def stem(module):
    return module.rsplit("/", 1)[1][: -len(".ts")]


def main(out):
    files = subprocess.run(["git", "ls-files", "-z"], capture_output=True, text=True, check=True).stdout.split("\0")
    population = [f for f in files if f and not f.startswith("docs/reviews/") and (
        f.endswith(SUFFIXES) or f.rsplit("/", 1)[-1] == "package.json" or re.fullmatch(r"tsconfig.*\.json", f.rsplit("/", 1)[-1]))]
    hits = []
    for f in population:
        try:
            lines = open(f, encoding="utf-8").read().split("\n")
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        for n, line in enumerate(lines, 1):
            for module in MODULES:
                name = stem(module)
                if line.find(name) < 0:
                    continue
                kind = "dist" if DIST.search(line) else "src" if ("src/" + name) in line or ("./" + name) in line else "other"
                role = "test" if f.endswith(".test.ts") else "kit" if f in MODULES else "reader"
                hits.append({"module": module, "file": f, "line": n, "kind": kind, "role": role, "text": line.strip()[:200]})
    readers = [h for h in hits if h["role"] == "reader"]
    record = {"subject": "readers of the nine test-support modules at HEAD",
              "commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip(),
              "tool": {"path": "docs/evidence/syzygy-bpyt-4-2/tools/test_support_readers.py",
                       "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
              "worktreeClean": subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, check=True).stdout == "",
              "population": len(population), "hits": len(hits),
              "byModule": {m: {"test": sum(h["module"] == m and h["role"] == "test" for h in hits),
                               "kit": sum(h["module"] == m and h["role"] == "kit" for h in hits),
                               "reader": [f"{h['file']}:{h['line']} [{h['kind']}] {h['text']}" for h in readers if h["module"] == m]}
                           for m in MODULES},
              "distReaders": sorted({h["file"] for h in readers if h["kind"] == "dist"})}
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(f"population {record['population']}; hits {record['hits']}; dist readers {record['distReaders']}")
    for m, row in record["byModule"].items():
        print(m, "tests", row["test"], "kits", row["kit"])
        for r in row["reader"]:
            print("   ", r)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
