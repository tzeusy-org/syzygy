"""The candidate general line-content pin of note N1: inserts it after the F1 pin in a clone's markdown-code-context.test.ts,
optionally mutates the mask, runs that one test file, restores both files, and prints each failing test with its first assertion
line. Usage: python3 -I general-pin.py <clone> <tmpdir> <out.json> <label> [<old fragment file> <new fragment file>]"""
import json, os, subprocess, sys
clone, tmpdir, out, label = sys.argv[1:5]
TEST = os.path.join(clone, 'packages/three-surface-poc-core/src/markdown-code-context.test.ts')
MASK = os.path.join(clone, 'packages/three-surface-poc-core/src/markdown-code-context.ts')
ANCHOR = "  it('U+2028, U+2029 and U+0085 are line content, not line ends', () => {\n"
CANDIDATE = """
  // Every other UTF-16 code unit is line content too, so a line end widened past the three above (VT, FF, or U+001C to U+001E as
  // Python's str.splitlines reads them) fails here; the failure lists, in hex, each unit the mask kept as a line end.
  it('no code unit but CR and LF ends a line', () => {
    const kept: string[] = [];
    for (let unit = 0; unit <= 0xffff; unit += 1) {
      if (unit === 0x0a || unit === 0x0d || unit === 0x60) continue;
      const mask = maskMarkdownCodeContexts(`a \\`b${String.fromCharCode(unit)}c\\` d`);
      if (mask.kind !== 'masked' || mask.masked !== 'a       d') kept.push(unit.toString(16));
    }
    expect(kept).toEqual([]);
  });
"""
test_src, mask_src = open(TEST, encoding='utf8').read(), open(MASK, encoding='utf8').read()
i = test_src.index(ANCHOR)
j = test_src.index('  });\n', i) + len('  });\n')
os.makedirs(tmpdir, exist_ok=True)
report = os.path.join(tmpdir, f'{label}.json')
try:
    open(TEST, 'w', encoding='utf8').write(test_src[:j] + CANDIDATE + test_src[j:])
    if len(sys.argv) > 5:
        old, new = (open(p, encoding='utf8').read().rstrip('\n') for p in sys.argv[5:7])
        if mask_src.count(old) != 1:
            raise SystemExit('old fragment not once')
        open(MASK, 'w', encoding='utf8').write(mask_src.replace(old, new))
    before = open('/proc/loadavg').read().strip()
    subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}', 'packages/three-surface-poc-core/src/markdown-code-context.test.ts'],
                   cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True)
    after = open('/proc/loadavg').read().strip()
finally:
    open(TEST, 'w', encoding='utf8').write(test_src)
    open(MASK, 'w', encoding='utf8').write(mask_src)
d = json.load(open(report, encoding='utf8'))
fails = [(a['title'], (a['failureMessages'][0] if a['failureMessages'] else '').split('\n')[0][:200], round(a.get('duration') or 0))
         for r in d['testResults'] for a in r['assertionResults'] if a['status'] != 'passed']
cand = [round(a.get('duration') or 0) for r in d['testResults'] for a in r['assertionResults'] if a['title'] == 'no code unit but CR and LF ends a line']
row = {'label': label, 'tests': d['numTotalTests'], 'failed': d['numFailedTests'], 'loadavgBefore': before, 'loadavgAfter': after, 'candidateMs': cand, 'failures': fails}
print(json.dumps(row))
rows = json.load(open(out)) if os.path.exists(out) else []
json.dump(rows + [row], open(out, 'w'), indent=1)
