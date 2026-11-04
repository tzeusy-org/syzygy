#!/usr/bin/env python3
"""Sweeps for the syzygy-bpyt.6.6 reconciliation (M4a, DC-1..DC-5). Evidence tooling, not a test.

    python3 docs/evidence/syzygy-bpyt-6-6/tools/sweeps.py > docs/evidence/syzygy-bpyt-6-6/sweeps.json

Population: tracked .ts/.mts/.mjs/.js/.cjs files under packages/, apps/ and scripts/ (git ls-files), no dist/.
"Test" is a path matching TEST below (tests, testkits, the test-kit package, fixtures, test-support).
Each pattern is a Python regex run per line (rule 1: no ugrep). Method 2 is `git grep -c -P` over the same
population for the same pattern; the two counts must agree, and the script exits 1 if any pair differs (rule 2).
"""
import json
import os
import re
import subprocess
import sys

ROOT = subprocess.run(["git", "rev-parse", "--show-toplevel"], check=True, capture_output=True, text=True).stdout.strip()
os.chdir(ROOT)
HEAD = subprocess.run(["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
FILES = [f for f in subprocess.run(["git", "ls-files", "-z", "packages", "apps", "scripts"], check=True, capture_output=True, text=True).stdout.split("\0")
         if re.search(r"\.(ts|mts|mjs|js|cjs)$", f) and "/dist/" not in f]
TEST = re.compile(r"\.test\.|testkit|^packages/test-kit/|-fixture|/fixtures?/|/test-support/")
NON_TEST = [f for f in FILES if not TEST.search(f)]

PATTERNS = {
    # DC-1 / DC-5
    "ls-tree invocation": r"\[\s*'ls-tree'",
    "cat-file invocation": r"['\"]cat-file['\"]",
    "--no-optional-locks wrapper": r"--no-optional-locks",
    "execFileSync('git'": r"execFileSync\(\s*'git'",
    # DC-2
    "NON_HUMAN_PRINCIPAL definition": r"\bNON_HUMAN_PRINCIPAL\s*=",
    # DC-3
    "sha256 definition": r"(?:function\s+sha256\w*\s*\(|(?:const|let)\s+sha256\w*\s*=)",
    "createHash('sha256') site": r"createHash\(\s*['\"]sha256['\"]",
    "deepFreeze definition": r"(?:function\s+deepFreeze\w*\s*[<(]|(?:const|let)\s+deepFreeze\w*\s*=)",
    "canonical JSON encoder definition": r"(?:function\s+(?:encode)?[cC]anonical(?:Json|JSON)\w*\s*[<(]|(?:const|let)\s+(?:encode)?[cC]anonical(?:Json|JSON)\w*\s*=)",
    "decodeUtf8 definition": r"(?:function\s+decodeUtf8\w*\s*\(|(?:const|let)\s+decodeUtf8\w*\s*=)",
    "strict TextDecoder, BOM dropped": r"TextDecoder\([^)]*fatal:\s*true(?![^)]*ignoreBOM)",
    "strict TextDecoder, ignoreBOM": r"TextDecoder\([^)]*fatal:\s*true[^)]*ignoreBOM",
    "isIsoDate definition": r"(?:function\s+isIsoDate\w*\s*\(|(?:const|let)\s+isIsoDate\w*\s*=)",
    "object predicate definition": r"(?:function\s+(?:isRecord|isObj|isObject|isPlainObject)\s*\(|(?:const|let)\s+(?:isRecord|isObj|isObject|isPlainObject)\s*=)",
    "isoOf definition": r"(?:function\s+isoOf\s*\(|(?:const|let)\s+isoOf\s*=)",
    # DC-4
    "prose-only Unknown arm (kind/state 'unknown', reason: string)": r"(?:kind|state):\s*'unknown';\s*readonly reason:\s*string",
    "cast to UnknownReason or keyof typeof": r"\bas\s+(?:UnknownReason\b|keyof typeof UNKNOWN_REASON)",
    "ParsePassBudgetExceeded": r"ParsePassBudgetExceeded",
}


def hits(pattern, files):
    rx = re.compile(pattern)
    out = []
    for f in files:
        with open(f, encoding="utf-8", errors="replace") as handle:
            for number, line in enumerate(handle, 1):
                if rx.search(line):
                    out.append(f"{f}:{number}")
    return out


def git_grep_count(pattern, files):
    if not files:
        return 0
    run = subprocess.run(["git", "grep", "-c", "-P", "-e", pattern, "--", *files], capture_output=True, text=True)
    if run.returncode not in (0, 1):
        raise SystemExit(run.stderr)
    return sum(int(line.rsplit(":", 1)[1]) for line in run.stdout.splitlines() if line)


def cycles(directory):
    mods = sorted(f[:-3] for f in os.listdir(directory) if f.endswith(".ts") and not TEST.search(f"{directory}/{f}"))
    rx = re.compile(r"""(?:from|import)\s*\(?\s*['"]\./([a-z0-9-]+)\.js['"]""")
    graph = {m: sorted({t for t in rx.findall(open(f"{directory}/{m}.ts", encoding="utf-8").read()) if t in mods}) for m in mods}
    index, low, stack, on, comps, counter = {}, {}, [], set(), [], [0]

    def visit(v):
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on.add(v)
        for w in graph[v]:
            if w not in index:
                visit(w)
                low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on.discard(w)
                comp.append(w)
                if w == v:
                    break
            if len(comp) > 1:
                comps.append(sorted(comp))

    sys.setrecursionlimit(10000)
    for m in mods:
        if m not in index:
            visit(m)
    return {"directory": directory, "modules": len(mods), "cyclicComponents": sorted(comps)}


rows, disagreements = [], []
for name, pattern in PATTERNS.items():
    all_hits, non_test = hits(pattern, FILES), hits(pattern, NON_TEST)
    second = git_grep_count(pattern, NON_TEST)
    if second != len(non_test):
        disagreements.append(name)
    rows.append({"pattern": name, "regex": pattern, "nonTest": len(non_test), "nonTestByGitGrep": second, "all": len(all_hits), "nonTestSites": non_test})

json.dump({
    "probe": "sweeps",
    "commit": HEAD,
    "population": {"files": len(FILES), "nonTest": len(NON_TEST), "testRule": TEST.pattern},
    "rows": rows,
    "importCycles": cycles("packages/three-surface-poc-core/src"),
    "methodDisagreements": disagreements,
}, sys.stdout, indent=1)
sys.stdout.write("\n")
sys.exit(1 if disagreements else 0)
