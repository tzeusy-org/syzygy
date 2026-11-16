"""Reviewer's own argv corpus (R-GP-IMPL-DOSSIER-CLI-TABLE-1), built independently of the lane's edge_corpus.py.
Atoms the lane's corpus does not stress: Unicode look-alike dashes, whitespace-padded flags, prototype-named options, empty and
'='-only tokens, option-name prefixes, '--' as a consumed value, stop/boolean options as values, triple repeats, very long tokens.
Every path is under /nonexistent-r518. Usage: my_corpus.py <out-dir>"""
import json, os, sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
N = '/nonexistent-r518'
URL = 'https://github.com/example/none'

UNICODE = ['–json', '—help', '−5', '‐x', '‑‑json', '－－help', '­--json', '−h', '–-root']
PADDED = [' --json', '--json ', '--json\n', '\t-x', ' -h', '--help ']
WEIRD = ['', ' ', '=', '-=', '--=', '--=x', '---', '----', '--constructor', '--__proto__', '--toString', '--hasOwnProperty', '-1e3', '-.5',
         '-0', '-', '--', '-abc', '-hh', '-h-', '--no-json', '--json=', '--JSON', 'a b', 'a\nb', 'x' * 300, '-' + 'x' * 50, '-é', '--été']
ATOMS = UNICODE + PADDED + WEIRD


def uniq(rows):
    seen, kept = set(), []
    for row in rows:
        key = json.dumps(row)
        if key not in seen:
            seen.add(key)
            kept.append(row)
    return kept


def daemon():
    V = ['--root', '--state-dir', '--port']
    rows = [[]]
    for a in ATOMS:
        rows += [[a], [a, '--help'], ['--help', a], ['-h', a]]
    for v in V:
        rows += [[v, a] for a in ATOMS]
        rows += [[v, '--help'], [v, '-h'], [v, '--', '--help'], [v, '--', 'x'], [v, v], [v, v, v], [v, 'a', v], [v, 'a', v, 'b', v, 'c'],
                 [f'{v}=x'], [f'{v}=', 'x'], [v + 'x', 'y'], [v[:-1], 'y'], [v.upper(), 'y'], [v, 'a', '--help'], [v, 'a', '--', '--help']]
    rows += [['--state', 'x'], ['--port0'], ['--root-x', 'y'], ['--port', '--root', 'x'], ['--root', '--port', '--state-dir'],
             ['--root', N, '--state-dir', f'{N}/s', '--port', '0', '--help'], ['--root', N, '--port', '-0'], ['--port', ''], ['--port', ' 7 '],
             ['--port', '0x10'], ['--port', '1e3'], ['--port', '-1'], ['--port', '65536'], ['--root', '', '--state-dir', ''], ['--help', '--port']]
    return uniq(rows)


def polaris():
    V = ['--clone', '--revision', '--state-root', '--deadline', '--audience', '--model', '--repair-cycles', '--questions', '--token-budget',
         '--turn-budget', '--operator', '--attach', '--stop', '--resume', '--tmux-session']
    B = ['--author-skip-permissions', '--no-attach', '--supervise']
    rows = [[], [URL], [URL, URL]]
    for a in ATOMS:
        rows += [[URL, a], [a, URL], [a]]
    for v in V:
        rows += [[URL, v], [URL, v, '--help'], [URL, v, '-h'], [URL, v, '--'], [URL, v, '--', '--help'], [URL, f'{v}=x'], [URL, v, 'a', v, 'b'],
                 [v, URL], [URL, v, ''], [URL, v, '-1'], [URL, v, '−help'], [URL, v[:-1], 'x'], [URL, v, v]]
    for b in B:
        rows += [[URL, b], [URL, b, b], [URL, f'{b}=1'], [b, URL], [URL, b, '--help'], [URL, '--attach', b]]
    rows += [['--', URL], [URL, '--'], [URL, '--', '--help'], ['-hh'], ['-h', '--bogus'], ['--bogus', '-h'], ['--attach', 'run-x', '--stop', 'run-y'],
             ['--resume', f'{N}/run-z/'], ['--stop', ''], ['--no-attach', '--attach', '--no-attach'], [URL, '--no-attach=x'], ['--supervise', '--tmux-session']]
    return uniq(rows)


RUN, SESS, CLONE, FILE, STATE = f'{N}/run', f'{N}/run.sessions/session-1/', f'{N}/clone', f'{N}/f.json', f'{N}/state'
COMMANDS = {
    'status': ([RUN], [], {}, None), 'preflight': ([URL], [], {}, None), 'brief': ([RUN], [], {}, None), 'render': ([RUN], [], {}, None),
    'inventory-brief': ([RUN], [], {}, None), 'check': ([RUN], ['--draft'], {}, None),
    'session-prompt': ([RUN, 'inventory'], ['--kind', '--tool', '--tool-version', '--model'], {}, '--fresh'),
    'await': ([SESS], ['--round', '--submit', '--wait-minutes'], {}, '--stdin'),
    'review-packet': ([RUN], ['--kind'], {'--kind': 'fidelity'}, None), 'review-check': ([RUN], ['--verdict', '--kind'], {}, None),
    'close': ([RUN], ['--usage-tokens', '--usage-turns'], {}, None), 'launch-form': ([RUN, 'inventory', 'terminal'], ['--kind'], {}, None),
    'inventory-check': ([RUN], ['--inventory'], {}, None),
    'allow-execution': ([RUN], ['--revision', '--declare'], {'--revision': 'abc', '--declare': 'owner-started-session,owners-own-host,owner-attends'}, None),
    'init': ([CLONE], ['--url', '--config', '--state-root'], {'--url': URL, '--config': FILE, '--state-root': STATE}, None),
}
DOSSIER_ATOMS = UNICODE + PADDED + ['', '=', '--=', '---', '--constructor', '--__proto__', '-1e3', '-0', '-', '--', '-abc', '--json=', '-j', '--fresh', '--stdin',
                                    '--fresh=1', '--stdin=1', 'x' * 300, '-é']


def dossier():
    rows = [[], ['help', ''], ['help', '--json', '--json'], ['', 'status', RUN], ['--json'], ['--json', '--json', 'help'], ['-h', ''], ['—help'],
            ['help\n'], [' status', RUN], ['status ', RUN], ['--constructor'], ['constructor'], ['__proto__'], ['toString'], ['hasOwnProperty'],
            ['valueOf', RUN], ['status', '--', '--json'], ['--json', '--', 'status', RUN]]
    for cmd, (pos, valued, req, flag) in COMMANDS.items():
        fixed = [x for k, val in req.items() for x in (k, val)]
        full = [*pos, *fixed]
        for a in DOSSIER_ATOMS:
            rows += [[cmd, *full, a], [cmd, a, *full], [cmd, *pos[:1], a, *pos[1:], *fixed]]
        rows += [[cmd, *full, '--json', '--json'], [cmd, '--json', *full, '--json'], [cmd, *full, '', '']]
        for v in valued:
            rest = [x for k, val in req.items() if k != v for x in (k, val)]
            for a in ['', '=', '--', '-', '--json', '−x', '–json', ' -x', '--fresh', '--stdin', v, '--help', '-h', 'help']:
                rows.append([cmd, *pos, *rest, v, a])
            rows += [[cmd, *pos, *rest, v, 'a', v, 'b', v, 'c'], [cmd, *pos, *rest, v, '--json', '--json', 'x'], [cmd, *pos, *rest, f'{v}=', 'x'],
                     [cmd, *pos, *rest, v[:-1], 'x'], [cmd, *pos, *rest, v + '-x', 'x'], [cmd, v, '--', *pos, *rest], [cmd, *pos, *rest, v]]
        if flag is not None:
            rows += [[cmd, *full, flag, flag, flag], [cmd, flag, '--json', flag, *full], [cmd, *full, f' {flag}'], [cmd, *full, flag.upper()],
                     [cmd, *pos, valued[0], flag, flag], [cmd, *pos, valued[0], flag], [cmd, *pos, flag, valued[0]]]
        other = [o for o in ('--fresh', '--stdin') if o != flag]
        rows += [[cmd, *full, o] for o in other]
    rows += [['session-prompt', RUN, 'all', '--fresh'], ['session-prompt', RUN, '', ''], ['session-prompt', RUN, 'review', '--kind', ''],
             ['launch-form', RUN, '', '', ''], ['launch-form', RUN, 'review', 'bang', '--kind', '--kind'], ['await', '', '--submit', ''],
             ['init', '', '--url', '', '--config', '', '--state-root', ''], ['init', CLONE, '--url', URL, '--config', FILE],
             ['allow-execution', RUN, '--revision', '', '--declare', ''], ['close', RUN, '--usage-tokens', '0', '--usage-turns', '−1']]
    return uniq(rows)


counts = {}
for name, rows in (('daemon', daemon()), ('polaris', polaris()), ('dossier', dossier())):
    json.dump(rows, open(os.path.join(out, f'{name}.json'), 'w'), ensure_ascii=True)
    counts[name] = len(rows)
print(json.dumps(counts))
