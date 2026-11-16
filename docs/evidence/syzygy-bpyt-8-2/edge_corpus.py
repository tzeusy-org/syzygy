"""syzygy-bpyt.8.2: the edge-form argv corpus for the dossier CLI golden. For every command it builds the forms node:util parseArgs reads
differently from a hand-rolled loop (--opt=value, -abc groups, the -- terminator, a lone -, negative numbers, repeats, an option after
a positional, a dash-leading value, --json and the boolean flags in odd places), plus the top-level forms. Every path is under
/nonexistent-la-b82, which no command can create, so nothing is read from or written to any repository. Usage: edge_corpus.py <out.json>
"""
import json, sys

N = '/nonexistent-la-b82'
RUN, SESS, URL, CLONE, FILE, STATE = f'{N}/run', f'{N}/run.sessions/session-1/', 'https://github.com/example/none', f'{N}/clone', f'{N}/f.json', f'{N}/state'

# name: (positional, valued options, required option values, boolean flags)
COMMANDS = {
    'status': ([RUN], [], {}, []), 'preflight': ([URL], [], {}, []), 'brief': ([RUN], [], {}, []), 'render': ([RUN], [], {}, []),
    'inventory-brief': ([RUN], [], {}, []),
    'check': ([RUN], ['--draft'], {}, []),
    'session-prompt': ([RUN, 'inventory'], ['--kind', '--tool', '--tool-version', '--model'], {}, ['--fresh']),
    'await': ([SESS], ['--round', '--submit', '--wait-minutes'], {}, ['--stdin']),
    'review-packet': ([RUN], ['--kind'], {'--kind': 'fidelity'}, []),
    'review-check': ([RUN], ['--verdict', '--kind'], {}, []),
    'close': ([RUN], ['--usage-tokens', '--usage-turns'], {}, []),
    'launch-form': ([RUN, 'inventory', 'terminal'], ['--kind'], {}, []),
    'inventory-check': ([RUN], ['--inventory'], {}, []),
    'allow-execution': ([RUN], ['--revision', '--declare'], {'--revision': 'abc', '--declare': 'owner-started-session,owners-own-host,owner-attends'}, []),
    'init': ([CLONE], ['--url', '--config', '--state-root'], {'--url': URL, '--config': FILE, '--state-root': STATE}, []),
}
DASH_FORMS = ['-abc', '--', '-', '-5', '--bogus', '--bogus=x', '-h', '--help', '--json=1', '---x', '-j', '--JSON']
VALUE_FORMS = lambda o: [[o, 'v'], [f'{o}=v'], [o], [o, '-v'], [o, '-5'], [o, '--'], [o, '-'], [o, 'v', o, 'w'], [o, '--json', 'v'], [o, '--json'], [o, ''],
                         [o, '--fresh', 'v'], [o, '--stdin', 'v'], [f'-{o[2]}', 'v'], [o.upper(), 'v'], [o + 's', 'v']]


def required(req, without=None):
    return [x for k, v in req.items() if k != without for x in (k, v)]


def forms():
    out = [[], ['--json'], ['help'], ['help', 'x'], ['help', '--json'], ['--json', 'help'], ['--help'], ['-h'], ['-hx'], ['--help', 'x'], ['--'], ['-'],
           ['bogus'], ['STATUS', RUN], ['status=x'], ['--json', '--json'], ['-h', 'status', RUN], ['--', 'status', RUN], ['status', '--json', '--json', RUN]]
    for cmd, (pos, valued, req, flags) in COMMANDS.items():
        full = [*pos, *required(req)]
        out += [[cmd], [cmd, *full], [cmd, *full, 'extra'], [cmd, *full, '--json'], ['--json', cmd, *full], [cmd, '--json', *full],
                [cmd, *pos[:-1]] if len(pos) > 1 else [cmd, *required(req)]]
        out += [[cmd, *full, d] for d in DASH_FORMS] + [[cmd, d, *full] for d in ('--', '-', '-5', '-abc')]
        for o in valued:
            rest = required(req, without=o)
            out += [[cmd, *pos, *rest, *form] for form in VALUE_FORMS(o)]
            out += [[cmd, o, 'v', *pos, *rest], [cmd, *pos[:1], o, 'v', *pos[1:], *rest]]
        for k in req:
            out.append([cmd, *pos, *required(req, without=k)])
        for f in flags:
            out += [[cmd, *full, f], [cmd, *full, f, f], [cmd, *full, f'{f}=x'], [cmd, f, *full], [cmd, *full, f, '--json', f]]
        foreign = '--kind' if '--kind' not in valued else '--draft'
        out.append([cmd, *full, foreign, 'fidelity'])
    for role in ('inventory', 'review', 'all', 'bogus', ''):
        out += [['session-prompt', RUN, role], ['session-prompt', RUN, role, '--kind', 'fidelity'], ['session-prompt', RUN, role, '--fresh']]
    for role, form in (('review', 'bang'), ('review', 'terminal'), ('inventory', 'bang'), ('x', 'y')):
        out += [['launch-form', RUN, role, form], ['launch-form', RUN, role, form, '--kind', 'design']]
    out += [['close', RUN, '--usage-tokens', '-1'], ['close', RUN, '--usage-tokens', '1e3'], ['await', SESS, '--round', '-1'], ['await', SESS, '--wait-minutes', '-0']]
    seen, unique = set(), []
    for argv in out:
        key = json.dumps(argv)
        if key not in seen:
            seen.add(key)
            unique.append(argv)
    return unique


corpus = forms()
json.dump(corpus, open(sys.argv[1], 'w'), indent=0)
print(len(corpus), 'argv')
