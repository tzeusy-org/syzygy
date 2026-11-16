"""syzygy-bpyt.4.2, acceptance criterion 1: what `npm run build` emits, before and after, file by file.

`python3 compare_emit.py <base root> <base commit> <head root> <head commit>` prints one JSON record over every file under
each tree's `apps/*/dist` and `packages/*/dist`. Each root is a checkout built with `npm run build` from nothing (every dist
removed first); the commits are labels the caller vouches for. Files are classed by emitted suffix (.js, .js.map, .d.ts,
.d.ts.map, and any other, such as .tsbuildinfo, which records the build itself and is not compared). For each suffix the record
counts each tree's files and test outputs (a name that, less its suffix, ends in `.test`), lists every file on one side only and
every common file whose bytes differ, and digests each tree (path and bytes of every file of that suffix). Since the PR 549
review's F3 it compares every suffix, not the JavaScript alone."""
import hashlib, json, os, sys

base, base_commit, head, head_commit = sys.argv[1:5]
SUFFIXES = (".d.ts.map", ".js.map", ".d.ts", ".js")


def suffix_of(path):
    return next((suffix for suffix in SUFFIXES if path.endswith(suffix)), "other")


def emitted(root):
    out = {}
    for parent in ("packages", "apps"):
        for name in sorted(os.listdir(os.path.join(root, parent))):
            for directory, _, files in os.walk(os.path.join(root, parent, name, "dist")):
                for file in files:
                    path = os.path.join(directory, file)
                    out[os.path.relpath(path, root)] = open(path, "rb").read()
    return out


def is_test(path):
    suffix = suffix_of(path)
    return suffix != "other" and path[: -len(suffix)].endswith(".test")


def tree(files, commit):
    return {"commit": commit, "files": len(files), "tests": sum(is_test(path) for path in files),
            "sha256": hashlib.sha256(b"".join(p.encode() + b"\0" + files[p] for p in sorted(files))).hexdigest()}


a, b = emitted(base), emitted(head)
record = {"subject": "every file `npm run build` emits under apps/*/dist and packages/*/dist, by suffix", "bySuffix": {}}
for suffix in (*SUFFIXES, "other"):
    sa = {p: v for p, v in a.items() if suffix_of(p) == suffix}
    sb = {p: v for p, v in b.items() if suffix_of(p) == suffix}
    common = sorted(set(sa) & set(sb))
    row = {"base": tree(sa, base_commit), "head": tree(sb, head_commit), "common": len(common),
           "onlyInBaseTests": sum(is_test(p) for p in set(sa) - set(sb)),
           "onlyInBaseOther": sorted(p for p in set(sa) - set(sb) if not is_test(p)),
           "onlyInHead": sorted(set(sb) - set(sa))}
    if suffix == "other":
        row["compared"] = False
    else:
        row["byteIdentical"] = sum(sa[p] == sb[p] for p in common)
        row["differ"] = [p for p in common if sa[p] != sb[p]]
    record["bySuffix"][suffix] = row
print(json.dumps(record, indent=1))
