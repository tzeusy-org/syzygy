"""syzygy-bpyt.8.2: argv corpora for the daemon parser (parseCli in apps/syzygy/src/main.ts) and the `syzygy polaris` parser
(parseArgs in packages/polaris-dossier/src/polaris.ts): the argv their tests pass, every form node:util parseArgs reads differently
from a hand-rolled loop, and each option in each position. Every path is under /nonexistent-la-b82. Usage: parse_corpus.py <out-dir>
"""
import json, os, sys

N = '/nonexistent-la-b82'
EDGE = ['-abc', '--', '-', '-5', '--bogus', '--bogus=x', '---x', '-hx', '-xh', '--help=1', '-h=1', '', 'x', '--HELP', '-H']


def dedupe(forms):
    seen, out = set(), []
    for argv in forms:
        key = json.dumps(argv)
        if key not in seen:
            seen.add(key)
            out.append(argv)
    return out


def value_forms(o, good):
    return [[o, good], [f'{o}={good}'], [o], [o, '-v'], [o, '-5'], [o, '--'], [o, '-'], [o, ''], [o, '--help'], [o, '-h'],
            [o, good, o, good + '2'], [o, good, o], [o, o], [o.upper(), good], [o + 's', good], [f'-{o[2]}', good]]


def daemon():
    valued = {'--root': f'{N}/root', '--state-dir': f'{N}/state', '--port': '0'}
    out = [[], ['--help'], ['-h'], ['--help', 'dossier'], ['--bogus'], ['--port', '0', 'dossier'], ['Dossier'], ['--port'],
           ['--port', '70000'], ['--root', f'{N}/root', '--state-dir', f'{N}/root/.syzygy/x'], ['--root', f'{N}/root', '--state-dir', f'{N}/state', '--port', '0'],
           ['--help', '--bogus'], ['--bogus', '--help'], ['x', '--help'], ['--', '--help'], ['--help', '--'], ['-h', '-h'], ['--help', '--help']]
    out += [[e] for e in EDGE] + [[e, '--help'] for e in EDGE] + [['--port', '0', e] for e in EDGE]
    for o, good in valued.items():
        out += value_forms(o, good)
        out += [[o, good, '--help'], ['--help', o], [o, good, 'extra'], ['extra', o, good]]
    for port in ['-1', '1e3', ' 7', '0x10', '65535', '65536', '', '7.0', '07', '+7', 'NaN', 'Infinity']:
        out.append(['--port', port])
    out += [['--port', '0', '--port', '70000'], ['--port', '70000', '--port', '0'],
            ['--root', f'{N}/root', '--state-dir', f'{N}/root/openspec'], ['--root', f'{N}/root', '--state-dir', f'{N}/root/openspecx'],
            ['--root', f'{N}/root', '--state-dir', f'{N}/root/.syzygy'], ['--root', 'rel', '--state-dir', 'rel/.syzygy/a'],
            ['--state-dir', '.syzygy/a'], ['--state-dir', 'openspec'], ['--root', f'{N}/a', '--root', f'{N}/b', '--state-dir', f'{N}/b/.syzygy']]
    return dedupe(out)


def polaris():
    valued = ['--clone', '--revision', '--state-root', '--deadline', '--audience', '--model', '--repair-cycles', '--questions',
              '--token-budget', '--turn-budget', '--operator', '--attach', '--stop', '--resume', '--tmux-session']
    booleans = ['--author-skip-permissions', '--no-attach', '--supervise', '--help', '-h']
    url = 'https://github.com/example/none'
    out = [[], [url], [url, 'extra'], ['--help'], ['-h'], [url, '--help'], ['--help', '--bogus'], ['--bogus', '--help'], ['--', url], [url, '--'],
           ['-', url], [url, '-'], [''], ['', url], [url, '']]
    out += [[url, e] for e in EDGE] + [[e, url] for e in EDGE]
    for o in valued:
        good = '3' if o in ('--repair-cycles', '--questions', '--token-budget', '--turn-budget') else f'{N}/v'
        out += [[url, *form] for form in value_forms(o, good)]
        out += [[o, good, url], [o, good]]
    for o in booleans:
        out += [[url, o], [o, url], [url, o, o], [url, f'{o}=x'], [o]]
    for n in ['--repair-cycles', '--questions', '--token-budget', '--turn-budget']:
        out += [[url, n, v] for v in ['0', '007', '-1', '1.5', '1e3', '', ' 3', '3 ', '+3', '99999999999999999999']]
    out += [['--attach', f'{N}/run-x'], ['--stop', f'{N}/run-x'], ['--resume', f'{N}/run-x'], ['--resume', f'{N}/run-x', url], ['--attach', 'a', '--stop', 'b'],
            ['--stop', 'b', '--attach', 'a'], ['--supervise', '--attach', 'a'], ['--attach', '.'], ['--attach', '/'], ['--attach', ''],
            [url, '--audience', 'Operators', '--model', 'm', '--no-attach', '--author-skip-permissions', '--state-root', f'{N}/s'],
            [url, '--deadline', 'P1D', '--operator', 'op', '--tmux-session', 't', '--clone', 'rel/clone', '--revision', 'abc']]
    return dedupe(out)


os.makedirs(sys.argv[1], exist_ok=True)
for name, corpus in (('daemon', daemon()), ('polaris', polaris())):
    json.dump(corpus, open(os.path.join(sys.argv[1], f'{name}-corpus.json'), 'w'), indent=0)
    print(name, len(corpus))
