"""syzygy-bpyt.8.2: the dossier CLI golden corpus. Every argv the polaris-dossier test suite handed runDossierCli at base 9a30237e
(captured one JSON line per call), with each absolute path the tests made rewritten under /nonexistent-la-b82, then the edge
corpus; duplicates dropped, first occurrence kept. Usage: build_corpus.py <capture.jsonl> <edge.json> <out.json>
"""
import json, sys

REWRITES = [('/tmp/la-b82/c', '/nonexistent-la-b82/cap'), ('/tmp/x', '/nonexistent-la-b82/tmpx')]


def rewrite(arg):
    for old, new in REWRITES:
        if arg == old or arg.startswith(old + '/'):
            return new + arg[len(old):]
    if arg == '/c' or arg.startswith('/c/'):
        return '/nonexistent-la-b82/c' + arg[2:]
    return arg


captured = [[rewrite(a) for a in json.loads(line)] for line in open(sys.argv[1])]
edge = json.load(open(sys.argv[2]))
seen, corpus = set(), []
for argv in captured + edge:
    key = json.dumps(argv)
    if key not in seen:
        seen.add(key)
        corpus.append(argv)
leaks = [a for argv in corpus for a in argv if a.startswith('/tmp') or a == '/c' or a.startswith('/c/')]
assert not leaks, leaks[:5]
json.dump(corpus, open(sys.argv[3], 'w'), indent=0)
print(f'captured={len(captured)} edge={len(edge)} corpus={len(corpus)}')
