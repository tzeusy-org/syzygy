"""Round-2 reader sweep for the ten test-support modules the head no longer emits (round 1's nine plus support's purity.testkit).
Run from a checkout root: python3 -I reader_sweep_r2.py OUT.json
Population A: every tracked file that decodes as UTF-8 (any suffix), docs/reviews/ included and reported separately.
Hit: a line holding a module stem (str.find). Class 'dist' when the same line matches (?<![\w-])dist(?![\w-]) (Python re).
Population B (dist enumerators): every tracked code file (.ts .mts .cts .js .mjs .cjs .py .sh .yml .yaml, package.json) line that
names a dist segment AND one of readdir|walk|glob|listdir|ls-files|find , i.e. a reader that may take every module of a dist."""
import json, re, subprocess, sys
MODS = ["apps/three-surface-poc/src/test-deep-dive-markers.ts", "apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts",
        "apps/three-surface-poc/src/test-http-client.ts", "packages/polaris-dossier/src/child-process.testkit.ts",
        "packages/polaris-dossier/src/fs-patch.testkit.ts", "packages/polaris-generation-core/src/workspace-reach.testkit.ts",
        "packages/three-surface-poc-core/src/test-cleanup.ts", "packages/three-surface-poc-core/src/test-frozen.ts",
        "packages/support/src/purity.testkit.ts",
        # kept kits, for contrast
        "packages/polaris-dossier/src/full-run.testkit.ts", "packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts"]
DIST = re.compile(r"(?<![\w-])dist(?![\w-])")
ENUM = re.compile(r"readdir|\bwalk|glob|listdir|ls-files|\bfind\b")
CODE = (".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".py", ".sh", ".yml", ".yaml")
files = [f for f in subprocess.run(["git", "ls-files", "-z"], capture_output=True, text=True, check=True).stdout.split("\0") if f]
pop, undecodable, hits, enum = 0, 0, [], []
for f in files:
    try: text = open(f, encoding="utf-8").read()
    except (UnicodeDecodeError, IsADirectoryError, FileNotFoundError): undecodable += 1; continue
    pop += 1
    for n, line in enumerate(text.split("\n"), 1):
        for m in MODS:
            stem = m.rsplit("/", 1)[1][:-3]
            if stem in line and DIST.search(line):
                hits.append({"module": m, "file": f, "line": n, "text": line.strip()[:220]})
        if (f.endswith(CODE) or f.endswith("package.json")) and DIST.search(line) and ENUM.search(line):
            enum.append(f"{f}:{n}: {line.strip()[:200]}")
out = {"population": pop, "undecodable": undecodable, "tracked": len(files), "distStemHits": hits, "distEnumeratorLines": enum}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print("tracked", len(files), "decoded", pop, "undecodable", undecodable, "dist+stem hits", len(hits), "enumerator lines", len(enum))
for h in hits:
    if not h["file"].startswith("docs/reviews/"): print(" ", h["module"].rsplit("/",1)[1], "|", h["file"], h["line"], "|", h["text"][:150])
print("in docs/reviews:", sum(h["file"].startswith("docs/reviews/") for h in hits))
