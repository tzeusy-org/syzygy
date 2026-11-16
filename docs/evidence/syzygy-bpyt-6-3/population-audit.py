#!/usr/bin/env python3
"""Audit the basename rule of sweep.py: which `test-*.ts` files hold a hash or freeze site, and does production import them.

Usage: population-audit.py <repo> <commit> [--selftest]

Why (review R-GP-IMPL-SUPPORT-LEAF-1, N1): sweep.py sets aside every file whose basename begins `test-` as test support.
One of them, packages/three-surface-poc-core/src/test-artifact-verification.ts, is production code (index.ts re-exports it and
model.ts imports it) and holds a createHash('sha256') site, so the sweep's "62 to 6" counted a smaller population than it said.
This tool does not replace the sweep. It lists the files the basename rule alone sets aside, the importers of each, and the
sites each holds, then restates the two figures under two population rules, so the reader sees the difference:
  name rule        sweep.py's: *.test.ts, *.browser.test.ts, *.testkit.ts and every basename `test-*.ts` are out.
  reachability     as the name rule, except that a `test-*.ts` file with at least one importer that is not itself a test-class
                   file (by the name rule) is in. One level of importers, found by the relative specifier
                   `from '<relative path>/<stem>.js'`; a re-export is an import. Never transitive: a file reached only through
                   another test-class file stays out.
Sites are read with sweep.py's own patterns (`createHash('sha256')` and a `function sha256` / `const sha256 =` definition),
so the two tools cannot disagree on what a site is. Python `re`, never ugrep; the second method is `git grep -F -c` per file.
Every row is printed; nothing is summarised without the rows behind it.
"""
import importlib.util
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('sweep', os.path.join(HERE, 'sweep.py'))
sweep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sweep)

STRICT_TEST = re.compile(r'\.(test|browser\.test)\.ts$|\.testkit\.ts$')
BASENAME_TEST = re.compile(r'(^|/)test-[^/]*\.ts$')


def read_population(repo, commit):
    names = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout.decode().split('\0')
    names = sorted(n for n in names if n and sweep.POPULATION.match(n))
    blobs = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(f'{commit}:{n}\n' for n in names).encode(), capture_output=True, check=True).stdout
    texts, pos = {}, 0
    for n in names:
        header_end = blobs.index(b'\n', pos)
        _, kind, size = blobs[pos:header_end].decode().split()
        assert kind == 'blob'
        texts[n] = blobs[header_end + 1:header_end + 1 + int(size)].decode('utf-8')
        pos = header_end + 1 + int(size) + 1
    return texts


def is_test_class(name):
    return bool(STRICT_TEST.search(name) or BASENAME_TEST.search(name))


def importers_of(texts, target):
    stem = re.escape(os.path.basename(target)[:-3])
    pattern = re.compile(r"""from\s+['"]\.{1,2}/(?:[^'"]*/)?""" + stem + r"""\.js['"]""")
    return sorted(n for n, text in texts.items() if n != target and pattern.search(text))


def sites_in(text):
    rows = []
    for m in sweep.SHA256_SITE.finditer(text):
        rows.append({'kind': 'createHash(sha256)', 'line': text.count('\n', 0, m.start()) + 1, 'form': sweep.site_form(text, m.start())})
    for m in sweep.LOCAL_DEF.finditer(text):
        rows.append({'kind': 'local ' + (m.group(1) or m.group(2)), 'line': text.count('\n', 0, m.start()) + 1})
    return rows


def audit_texts(texts):
    name_rule = sorted(n for n in texts if not is_test_class(n))
    basename_only = sorted(n for n in texts if BASENAME_TEST.search(n) and not STRICT_TEST.search(n))
    rows = []
    for n in basename_only:
        imps = importers_of(texts, n)
        production = [i for i in imps if not is_test_class(i)]
        rows.append({'file': n, 'importers': len(imps), 'productionImporters': production, 'sites': sites_in(texts[n]), 'inUnderReachability': bool(production)})
    reach_rule = sorted(name_rule + [r['file'] for r in rows if r['inUnderReachability']])

    def count(files):
        sha_sites = sum(len(sweep.SHA256_SITE.findall(texts[f])) for f in files)
        defs = {'sha256': 0, 'deepFreeze': 0}
        for f in files:
            for m in sweep.LOCAL_DEF.finditer(texts[f]):
                defs[m.group(1) or m.group(2)] += 1
        return {'files': len(files), 'createHashSha256Sites': sha_sites, 'localSha256Definitions': defs['sha256'], 'localDeepFreezeDefinitions': defs['deepFreeze']}

    return {'nameRule': count(name_rule), 'reachabilityRule': count(reach_rule), 'basenameOnlyFiles': rows}


def second_method(repo, commit, files):
    out = {}
    for f in files:
        run = subprocess.run(['git', '-C', repo, 'grep', '-F', '-c', "createHash('sha256')", commit, '--', f], capture_output=True, text=True)
        out[f] = int(run.stdout.strip().rsplit(':', 1)[1]) if run.stdout.strip() else 0
    return out


def selftest():
    base = {
        'packages/a/src/prod.ts': "import { x } from './test-used.js';\nexport const y = x;\n",
        'packages/a/src/test-used.ts': "import { createHash } from 'node:crypto';\nexport const x = createHash('sha256').update('a').digest('hex');\n",
        'packages/a/src/test-lonely.ts': "import { createHash } from 'node:crypto';\nexport const z = createHash('sha256').update('b').digest('hex');\n",
        'packages/a/src/test-by-test.ts': "export const w = 1;\n",
        'packages/a/src/uses.test.ts': "import { w } from './test-by-test.js';\nexport const q = w;\n",
    }
    got = audit_texts(base)
    by = {r['file']: r for r in got['basenameOnlyFiles']}
    checks = {
        'the used test-* file is in under reachability': by['packages/a/src/test-used.ts']['inUnderReachability'] is True,
        'the unimported test-* file stays out': by['packages/a/src/test-lonely.ts']['inUnderReachability'] is False,
        'a file imported only by a test stays out': by['packages/a/src/test-by-test.ts']['inUnderReachability'] is False,
        'name rule counts only prod.ts': got['nameRule']['files'] == 1 and got['nameRule']['createHashSha256Sites'] == 0,
        'reachability adds exactly the used file and its one site': got['reachabilityRule']['files'] == 2 and got['reachabilityRule']['createHashSha256Sites'] == 1,
    }
    # Mutate the input: the importer is renamed to a test-class name, and the used file must fall out.
    mutated = dict(base)
    mutated['packages/a/src/test-prod.ts'] = mutated.pop('packages/a/src/prod.ts')
    by_m = {r['file']: r for r in audit_texts(mutated)['basenameOnlyFiles']}
    checks['mutant: a test-class importer no longer brings the file in'] = by_m['packages/a/src/test-used.ts']['inUnderReachability'] is False
    # Mutate the input: the specifier names another stem, and the used file must fall out.
    mutated = dict(base)
    mutated['packages/a/src/prod.ts'] = "import { x } from './test-other.js';\nexport const y = x;\n"
    by_m = {r['file']: r for r in audit_texts(mutated)['basenameOnlyFiles']}
    checks['mutant: a different stem is no import'] = by_m['packages/a/src/test-used.ts']['inUnderReachability'] is False
    # A stem that is a prefix of another must not match.
    mutated = dict(base)
    mutated['packages/a/src/prod.ts'] = "import { x } from './test-used-more.js';\nexport const y = x;\n"
    by_m = {r['file']: r for r in audit_texts(mutated)['basenameOnlyFiles']}
    checks['mutant: a longer stem is no import'] = by_m['packages/a/src/test-used.ts']['inUnderReachability'] is False
    return {'cases': len(checks), 'failures': [k for k, v in checks.items() if not v]}


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        result = selftest()
        print(json.dumps(result))
        sys.exit(1 if result['failures'] else 0)
    repo, commit = sys.argv[1], sys.argv[2]
    texts = read_population(repo, commit)
    record = {'commit': commit, 'populationAllTsUnderSrc': len(texts)}
    record.update(audit_texts(texts))
    record['secondMethod'] = {'createHashSha256PerBasenameOnlyFile': second_method(repo, commit, [r['file'] for r in record['basenameOnlyFiles']])}
    print(json.dumps(record, indent=1))
