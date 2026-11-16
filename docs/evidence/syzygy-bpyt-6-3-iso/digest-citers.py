#!/usr/bin/env python3
"""Does any tracked file cite the digest of a file this change edits? For syzygy-bpyt.6.3 stack 4 (the object-shape and ISO helpers); adapted from the stack-3 tool of the same name.

Usage: digest-citers.py <git repo> <base commit> <code head> <population commit> <out.json> [--also <tracked path>]...
       digest-citers.py --selftest
`--also` names a further tracked file (any extension) that is swept when it differs between the two commits; the repair of round 1 of the
review (R-GP-IMPL-OBJECT-ISO-HELPERS-1) edits AGENTS.md, which is not a .ts file.

The edited files are the .ts files under packages/ and apps/ that differ between the base and the code head, tests included (a test can be
digest-bound as well); a file the change adds has a head digest only. For each, the sha256 of its bytes and its git blob id
at the base and at the code head are computed (never transcribed) and looked for, as the full 64 (or 40) hex digits and as the first 12,
in every tracked file at the population commit except the directory docs/evidence/syzygy-bpyt-6-3-iso/ (which holds this tool's own output). Method one
reads every blob with Python `bytes.find`; method two is `git grep -F -l` per needle; the two must name the same files.
Prints a JSON summary; exit status 1 when a digest is cited anywhere or the two methods disagree.
"""
import hashlib
import json
import subprocess
import sys

OWN = 'docs/evidence/syzygy-bpyt-6-3-iso/'


def git(repo, *args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


def edited_production(repo, base, head):
    """(path, status) of every .ts file under packages/ or apps/ the change touches."""
    parts = git(repo, 'diff', '--name-status', '-z', base, head).decode().split('\0')
    rows = [(parts[i + 1], parts[i]) for i in range(0, len(parts) - 1, 2)]
    return [(p, s) for p, s in rows if p.startswith(('packages/', 'apps/')) and p.endswith('.ts')]


def citers(repo, head, needles):
    files = [f for f in git(repo, 'ls-tree', '-r', '-z', '--name-only', head).decode().split('\0') if f and not f.startswith(OWN)]
    method_one = {n: [] for n in needles}
    for f in files:
        blob = git(repo, 'show', f'{head}:{f}')
        for n in needles:
            if blob.find(n.encode()) >= 0:
                method_one[n].append(f)
    method_two = {}
    for n in needles:
        out = subprocess.run(['git', '-C', repo, 'grep', '-F', '-l', '-e', n, head], capture_output=True, text=True)
        method_two[n] = sorted(l.split(':', 1)[1] for l in out.stdout.splitlines() if not l.split(':', 1)[1].startswith(OWN))
    return files, method_one, method_two


def selftest():
    """A digest that a tracked file does cite must be found by both methods; an absent one by neither."""
    import re
    here = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, check=True).stdout.strip()
    host = 'docs/evidence/syzygy-bpyt-8-36/summary.json'
    token = re.search(rb'[0-9a-f]{64}', git(here, 'show', f'HEAD:{host}')).group(0).decode()
    absent = hashlib.sha256(b'syzygy-bpyt.6.3 digest-citers: a digest no file cites').hexdigest()
    _, one, two = citers(here, 'HEAD', [token, token[:12], absent])
    ok = host in one[token] and host in one[token[:12]] and sorted(one[token]) == two[token] and sorted(one[token[:12]]) == two[token[:12]] and one[absent] == [] and two[absent] == []
    print(json.dumps({'selftest': 'present digest found by both methods, absent digest by neither', 'host': host, 'pass': ok}))
    sys.exit(0 if ok else 1)


def main():
    if '--selftest' in sys.argv:
        selftest()
    repo, base, head, population, out = sys.argv[1:6]
    extra = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--also']
    edited = edited_production(repo, base, head)
    for path in extra:
        parts = git(repo, 'diff', '--name-status', '-z', base, head, '--', path).decode().split('\0')
        if len(parts) >= 2 and parts[1] == path:
            edited.append((path, parts[0]))
    digests = []
    for path, status in edited:
        for label, commit in (('base', base), ('head', head)):
            if label == 'base' and status == 'A':
                continue
            digests.append({'path': path, 'at': label, 'sha256': hashlib.sha256(git(repo, 'show', f'{commit}:{path}')).hexdigest(),
                            'gitBlob': git(repo, 'rev-parse', f'{commit}:{path}').decode().strip()})
    # a file is named by its content digest or by its git blob id (the STATIC-TRACE records carry both); full and first twelve of each
    needles = sorted({d[k] for d in digests for k in ('sha256', 'gitBlob')} | {d[k][:12] for d in digests for k in ('sha256', 'gitBlob')})
    files, one, two = citers(repo, population, needles)
    hits = {n: v for n, v in one.items() if v}
    agree = all(sorted(one[n]) == two[n] for n in needles)
    result = {
        'baseCommit': base, 'codeHeadCommit': head, 'populationCommit': population,
        'population': f'{len(files)} tracked files at the population commit, excluding {OWN}',
        'editedFiles': [p for p, _ in edited], 'digests': digests, 'needles': len(needles),
        'methods': 'one: Python bytes.find over every blob; two: git grep -F -l per needle',
        'methodsAgree': agree, 'needlesCited': hits,
    }
    json.dump(result, open(out, 'w'), indent=1)
    open(out, 'a').write('\n')
    print(f'edited {len(edited)} files, {len(needles)} needles, {len(files)} files scanned, cited {len(hits)}, methods agree {agree}')
    sys.exit(1 if hits or not agree else 0)


if __name__ == '__main__':
    main()
