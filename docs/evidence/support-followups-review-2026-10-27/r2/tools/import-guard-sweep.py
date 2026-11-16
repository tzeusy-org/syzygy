#!/usr/bin/env python3
"""Find every tracked check that reads import edges out of source files.

Usage: import-guard-sweep.py <clone> <rev>

Population: every tracked file under apps/, packages/ and scripts/ at <rev>
whose name ends in .ts, .mts, .mjs, .js, .cjs or .py, excluding dist/ and
node_modules/. Signals (Python re, never ugrep; rule 1):
  S1 ts.isImportDeclaration / ts.isExportDeclaration / moduleSpecifier
  S2 a regex literal or string that matches import syntax: `from\\s`,
     `import\\s`, `import\\(` written inside a RegExp or re.compile
  S3 an allowlist name: ALLOWED_IMPORTS and look-alikes, `allowed` beside `import`
  S4 a literal "imports " used as a violation label
  S5 names @syzygy/support as a string literal in a test or script
Prints one row per file with any signal, then the denominator.
"""
import re
import subprocess
import sys

clone, rev = sys.argv[1], sys.argv[2]


def git(*args):
    return subprocess.run(['git', '-C', clone, *args], check=True, capture_output=True).stdout


paths = [p.decode() for p in git('ls-tree', '-r', '-z', '--name-only', rev, '--', 'apps', 'packages', 'scripts').split(b'\0') if p]
exts = ('.ts', '.mts', '.mjs', '.js', '.cjs', '.py')
pop = [p for p in paths if p.endswith(exts) and '/dist/' not in p and '/node_modules/' not in p]
signals = {
    'S1': re.compile(r'isImportDeclaration|isExportDeclaration|moduleSpecifier|ImportKeyword'),
    'S2': re.compile(r"""(?:RegExp\(|re\.compile\(|/)[^\n]{0,80}(?:from\\s|import\\s|import\\\(|\bfrom\s*\[|\bfrom\s+\['"\]|import\s*\(\s*\['"\])"""),
    'S3': re.compile(r'(?i)allowed_?imports|import_?allow|allowed_?modules|allowed_?specifiers|allowedDeps|ALLOWED_DEPENDENCIES|allowedPackages'),
    'S4': re.compile(r"""[`'"]imports [`'"$]"""),
    'S5': re.compile(r"""['"`]@syzygy/support['"`/]"""),
}
rows = []
for p in pop:
    text = git('show', f'{rev}:{p}').decode('utf-8', 'replace')
    hits = {k: len(rx.findall(text)) for k, rx in signals.items()}
    if any(hits.values()):
        rows.append((p, hits))
tests = [p for p in pop if re.search(r'(\.test\.[mc]?[jt]s$|(^|/)test_[^/]*\.py$|_test\.py$)', p)]
print(f'rev={rev} population={len(pop)} (test files {len(tests)}) files-with-signal={len(rows)}')
for p, hits in rows:
    print(p, ' '.join(f'{k}={v}' for k, v in hits.items() if v))
