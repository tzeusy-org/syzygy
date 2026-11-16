"""syzygy-bpyt.56, the second method for "refuses more, accepts nothing new": the gate's text, base against head.

`python3 -I structural.py <base> <head>` from inside a Syzygy checkout prints one JSON record. It reads pocObserverInputsAreClean
from each commit's git-observation.ts, and compares its exactInputs line, its inputPrefixes list (each quoted entry, in order) and
its return statement. Head refuses at least what base refuses when the exact line and the return are identical and the head list
contains every base entry. It also reports whether the root files and every apps/*, packages/* tsconfig.json differ between the two.
"""
import json, re, subprocess, sys

base, head = (subprocess.run(["git", "rev-parse", f"{c}^{{commit}}"], capture_output=True, text=True, check=True).stdout.strip() for c in sys.argv[1:3])
FILE = "apps/three-surface-poc/src/git-observation.ts"


def parts(commit):
    text = subprocess.run(["git", "show", f"{commit}:{FILE}"], capture_output=True, text=True, check=True).stdout
    fn = text[text.index("export function pocObserverInputsAreClean("):]
    fn = fn[: fn.index("\n}\n") + 3]
    exact = re.search(r"^  const exactInputs = .*$", fn, re.M).group(0)
    prefixes = re.findall(r"'([^'\n]+)'", re.search(r"const inputPrefixes = \[(.*?)\];", fn, re.S).group(1))
    ret = fn[fn.index("  return observation.changedPaths.every("):]
    return exact, prefixes, ret


(be, bp, br), (he, hp, hr) = parts(base), parts(head)
diff = subprocess.run(["git", "diff", "--name-only", base, head, "--", "package.json", "package-lock.json", "tsconfig.base.json",
                       ":(glob)apps/*/tsconfig.json", ":(glob)packages/*/tsconfig.json"], capture_output=True, text=True, check=True).stdout.split()
print(json.dumps({"base": base, "head": head, "exactInputsIdentical": be == he, "returnIdentical": br == hr,
                  "basePrefixes": bp, "headPrefixes": hp, "removed": [p for p in bp if p not in hp], "added": [p for p in hp if p not in bp],
                  "rootFilesAndTsconfigsChanged": diff}, indent=1))
