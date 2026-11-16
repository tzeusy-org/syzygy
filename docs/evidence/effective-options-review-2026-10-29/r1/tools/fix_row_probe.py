"""rev-558: try the proposed R6 and dist-x refusal rows in product-build.test.ts at the head, then under E1 and C10. Usage from a
clean checkout root at 807024b8: python3 -I fix_row_probe.py. Restores every byte."""
import json, os, subprocess, tempfile
B = "apps/three-surface-poc/src/product-build.test.ts"
S = "scripts/clean_build.mjs"
ANCHOR = "    }, 'packages/a/tsconfig.json: a referenced project is not composite'],\n  ])('refuses, removing nothing, when it %s'"
ROWS = (
    "    }, 'packages/a/tsconfig.json: a referenced project is not composite'],\n"
    "    ['reaches a project whose declarations sit in a sibling of dist through extends', ['packages/d'], (root) => inherit(root, 'packages/a', { declarationDir: 'dist-x' }),\n"
    "      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],\n"
    "  ])('refuses, removing nothing, when it %s'")
ANCHOR2 = "  }, 30_000);\n\n  // tsc -b requires composite only of a referenced project"
ROW2 = (
    "  }, 30_000);\n\n"
    "  // TypeScript reads a backslash in a path as a separator, so it resolves this project's outDir to packages/x/y/dist, outside its\n"
    "  // own dist, while the tsconfig's own outDir is 'dist' (R6).\n"
    "  it('refuses, removing nothing, when it names a project whose directory name holds a backslash', async () => {\n"
    "    const root = scratchTree();\n"
    "    plant(root, 'packages/x\\\\y/src/m.ts', \"export const m = 'm';\\n\");\n"
    "    plant(root, 'packages/x\\\\y/tsconfig.json', readFileSync(join(root, 'packages/c/tsconfig.json'), 'utf8'));\n"
    "    plant(root, 'packages/x\\\\y/dist/m.js', 'kept\\n');\n"
    "    await expect(cleanBuild(root, 'packages/x\\\\y')).rejects\n"
    "      .toMatchObject({ stderr: expect.stringContaining('packages/x\\\\y/tsconfig.json: its outputs and incremental state are not both under dist') });\n"
    "    expect(readFileSync(join(root, 'packages/x\\\\y/dist/m.js'), 'utf8')).toBe('kept\\n');\n"
    "  }, 30_000);\n\n"
    "  // tsc -b requires composite only of a referenced project")
E1 = ("!underDist(effective.outDir) || !underDist(effective.tsBuildInfoFile) || ", "")
C10 = ("file.startsWith(`${dist}/`)", "file.startsWith(dist)")


def vitest():
    with tempfile.TemporaryDirectory() as d:
        rep = os.path.join(d, "r.json")
        p = subprocess.run(["npx", "vitest", "run", B, "--reporter=json", f"--outputFile={rep}"], capture_output=True, text=True)
        r = json.load(open(rep)) if os.path.exists(rep) else {}
    fails = [(a["title"], (a.get("failureMessages") or [""])[0].split("\n")[0][:200]) for f in r.get("testResults", []) for a in f["assertionResults"] if a["status"] == "failed"]
    return {"exit": p.returncode, "passed": r.get("numPassedTests"), "failed": r.get("numFailedTests"), "failing": fails}


orig = {p: open(p, "rb").read() for p in (B, S)}
out = {}
try:
    t = orig[B].decode()
    assert t.count(ANCHOR) == 1
    assert t.count(ANCHOR2) == 1
    open(B, "w").write(t.replace(ANCHOR, ROWS).replace(ANCHOR2, ROW2))
    out["rowsText"] = ROWS
    out["row2Text"] = ROW2
    out["head"] = vitest()
    for name, (old, new) in (("E1", E1), ("C10", C10)):
        s = orig[S].decode(); assert s.count(old) == 1
        open(S, "w").write(s.replace(old, new))
        out[name] = vitest()
        open(S, "wb").write(orig[S])
finally:
    for p, b in orig.items():
        open(p, "wb").write(b)
print(json.dumps(out, indent=1))
