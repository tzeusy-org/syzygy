#!/usr/bin/env python3
"""Exercise extracted dispatch and guard code with synthetic, non-I/O fixtures."""
import argparse
import ast
import contextlib
import copy
import errno
import hashlib
import io
import json
import multiprocessing
import os
from pathlib import Path
import sys
import threading
import types


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--base-commit', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source = args.source.read_text()
    tree = ast.parse(source)
    definitions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
    helpers = ['_profile_selftest_call', '_selftest_workers', '_map_cases',
               '_run_entry', '_run_edition', '_join_case_results', '_entry_kind_cases',
               '_entry_kind_case', '_entry_control_case', '_after_refusal_case',
               '_fifo_control', '_library_error', '_cli_exits']
    module = types.ModuleType('_isolated_combined_dispatch')
    namespace = module.__dict__
    sys.modules[module.__name__] = module
    namespace.update({'os': None, 'multiprocessing': multiprocessing, 'Path': Path,
                      'contextlib': contextlib, 'io': io, 'sys': sys,
                      '_ENTRY_STATE': None, '_EDITION_STATE': None,
                      '_run_case': lambda i: i})
    exec(compile(ast.Module(body=[copy.deepcopy(definitions[n]) for n in helpers],
                           type_ignores=[]), '<isolated-helpers>', 'exec'), namespace)
    real_helpers = {name: namespace[name] for name in helpers}
    cases = definitions['_selftest_cases'].body
    start = next(i for i, n in enumerate(cases) if isinstance(n, ast.Assign)
                 and isinstance(n.targets[0], ast.Name) and n.targets[0].id == 'families')
    end = next(i for i, n in enumerate(cases[start:], start)
               if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
               and isinstance(n.value.func, ast.Name) and n.value.func.id == '_join_case_results')
    family_names = [n.id for n in cases[start].value.elts]
    wrapper = ast.FunctionDef(name='dispatch_editions', args=ast.arguments(
        posonlyargs=[], args=[ast.arg(arg=n) for n in
                            ('tmp', 'figure_base', 'witnesses', 'failures')],
        vararg=None, kwonlyargs=[], kw_defaults=[], kwarg=None, defaults=[]),
        body=copy.deepcopy(cases[start:end + 1]), decorator_list=[])
    exec(compile(ast.fix_missing_locations(ast.Module(body=[wrapper], type_ignores=[])),
                 '<actual-edition-dispatch>', 'exec'), namespace)
    dictionaries = {n.targets[0].id: n.value for n in tree.body
                    if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name)
                    and isinstance(n.value, ast.Dict)}
    kind_names = [ast.literal_eval(k) for k in dictionaries['ENTRY_KIND_CASES'].keys]
    control_names = [ast.literal_eval(k) for k in dictionaries['ENTRY_CONTROLS'].keys]
    after_names = [ast.literal_eval(k) for k in dictionaries['AFTER_REFUSAL_CASES'].keys]
    fifo_name = 'signoff-entry-control-live-writer-fifo'
    entry_names = kind_names + control_names + [fifo_name] + after_names
    assert len(entry_names) == 17 and len(family_names) == 19
    namespace.update({'ENTRY_KIND_CASES': {n: ('payload', n) for n in kind_names},
                      'ENTRY_CONTROLS': {n: ('payload', n) for n in control_names},
                      'AFTER_REFUSAL_CASES': {n: (('setup', n), ('expected', n))
                                            for n in after_names}})
    recorded = []
    skipped = {kind_names[0], after_names[2]}

    def install(raising_name=None, fork_mode=False):
        def complete(name, tmp, base, witnesses, failures, messages=None):
            assert (tmp, base) == ('synthetic-tmp', 'synthetic-base')
            assert witnesses == [] and failures == []
            if messages is not None:
                assert messages == []
            if name == raising_name:
                raise ValueError('synthetic-family-error')
            if messages is not None and name in skipped:
                messages.append('SKIPPED  ' + name + ': synthetic unavailable')
                return
            if name == fifo_name:
                if fork_mode:
                    assert os.getpid() != parent_pid
                done = []
                thread = threading.Thread(target=lambda: done.append(True))
                thread.start()
                thread.join()
                assert done == [True] and not thread.is_alive()
            witnesses.append({'name': name, 'steps': ['setup', 'checks', 'cleanup'],
                              'pid': os.getpid()})
            if name in (control_names[0], family_names[0]):
                failures.append('synthetic-finding-' + name)
        def kind(tmp, base, name, case, w, f, messages):
            assert case == ('payload', name)
            complete(name, tmp, base, w, f, messages)
        def control(tmp, base, name, setup, w, f):
            assert setup == ('payload', name)
            complete(name, tmp, base, w, f)
        def after(tmp, base, name, setup, expected, w, f, messages):
            assert setup == ('setup', name) and expected == ('expected', name)
            complete(name, tmp, base, w, f, messages)
        namespace.update({'_entry_kind_case': kind, '_entry_control_case': control,
                          '_after_refusal_case': after,
                          '_fifo_control': lambda tmp, base, w, f:
                          complete(fifo_name, tmp, base, w, f)})
        for name in family_names:
            def family(tmp, base, w, f, name=name):
                complete(name, tmp, base, w, f)
            family.__name__ = name
            namespace[name] = family

    parent_pid = os.getpid()
    fallback = types.SimpleNamespace(get_all_start_methods=lambda: [],
        get_context=lambda _: (_ for _ in ()).throw(AssertionError('unexpected pool')))
    assert 'fork' in multiprocessing.get_all_start_methods()
    try:
        for mode, workers, backend in [('workers1', '1', multiprocessing),
                                       ('fork', '2', multiprocessing),
                                       ('no-fork', '2', fallback)]:
            namespace['os'] = types.SimpleNamespace(
                environ={'SELFTEST_WORKERS': workers}, cpu_count=lambda: 4)
            namespace['multiprocessing'] = backend
            for group, dispatch, names, state, fail_at in [
                    ('entry', namespace['_entry_kind_cases'], entry_names,
                     '_ENTRY_STATE', kind_names[1]),
                    ('edition', namespace['dispatch_editions'], family_names,
                     '_EDITION_STATE', family_names[1])]:
                install(fork_mode=mode == 'fork')
                witnesses, failures, output = [], [], io.StringIO()
                with contextlib.redirect_stdout(output):
                    dispatch('synthetic-tmp', 'synthetic-base', witnesses, failures)
                expected = [n for n in names if group != 'entry' or n not in skipped]
                assert [w['name'] for w in witnesses] == expected
                assert all(w['steps'] == ['setup', 'checks', 'cleanup'] for w in witnesses)
                expected_fail = ['synthetic-finding-' + (control_names[0]
                                 if group == 'entry' else family_names[0])]
                assert failures == expected_fail
                expected_output = ''.join('SKIPPED  ' + n + ': synthetic unavailable\n'
                                          for n in names if group == 'entry' and n in skipped)
                assert output.getvalue() == expected_output
                pids = {w['pid'] for w in witnesses}
                assert (parent_pid not in pids) if mode == 'fork' else pids == {parent_pid}
                assert namespace[state] is None
                recorded.append({'case': mode + '-' + group, 'passed': True,
                                 'tasks': len(names), 'witnesses': len(witnesses),
                                 'orderedSkipMessages': len(expected_output.splitlines())})
                install(raising_name=fail_at, fork_mode=mode == 'fork')
                witnesses, failures, output = [], [], io.StringIO()
                try:
                    with contextlib.redirect_stdout(output):
                        dispatch('synthetic-tmp', 'synthetic-base', witnesses, failures)
                except ValueError as error:
                    assert str(error) == 'synthetic-family-error'
                else:
                    raise AssertionError('worker failure swallowed')
                assert namespace[state] is None
                assert witnesses == [] and failures == [] and output.getvalue() == ''
                recorded.append({'case': mode + '-' + group + '-failure', 'passed': True})
        namespace['os'] = types.SimpleNamespace(
            environ={'SELFTEST_WORKERS': '1'}, cpu_count=lambda: 4)
        namespace['multiprocessing'] = multiprocessing
        assert namespace['_map_cases'](3) == [0, 1, 2]
        recorded.append({'case': 'original-default-worker', 'passed': True})
        for name, indices in [('missing', [0, 1]), ('duplicate', [0, 1, 1]),
                               ('reordered', [1, 0, 2]), ('out-of-range', [0, 1, 3]),
                               ('boolean-alias', [0, True, 2])]:
            witnesses, failures, output = ['sentinel'], ['sentinel'], io.StringIO()
            try:
                with contextlib.redirect_stdout(output):
                    namespace['_join_case_results'](
                        [(i, [i], [i], ['should-not-print']) for i in indices],
                        3, witnesses, failures)
            except RuntimeError as error:
                assert str(error) == 'selftest task result population differs'
            else:
                raise AssertionError('invalid indices accepted')
            assert witnesses == failures == ['sentinel'] and output.getvalue() == ''
            recorded.append({'case': name + '-result-guard', 'passed': True})
        namespace['_ENTRY_STATE'] = ('synthetic-tmp', 'synthetic-base', [('unknown', 'name', None)])
        try:
            namespace['_run_entry'](0)
        except RuntimeError as error:
            assert str(error) == 'unknown entry fixture kind'
        else:
            raise AssertionError('unknown task accepted')
        finally:
            namespace['_ENTRY_STATE'] = None
        recorded.append({'case': 'unknown-entry-kind', 'passed': True})

        # Exercise the real existing early skip guards without touching the filesystem.
        namespace['_block_device'] = lambda: None
        messages = []
        real_helpers['_entry_kind_case'](None, None, 'x-block-device',
                                        (None, None, None, None), [], [], messages)
        assert messages == ['SKIPPED  x-block-device: no unreadable block device under /dev']
        recorded.append({'case': 'real-block-device-skip', 'passed': True})
        namespace['Path'] = lambda _: types.SimpleNamespace(exists=lambda: False)
        messages = []
        real_helpers['_after_refusal_case'](None, None, 'x-ptmx', None, None, [], [], messages)
        assert messages == ['SKIPPED  x-ptmx: no /dev/ptmx']
        recorded.append({'case': 'real-ptmx-skip', 'passed': True})
        namespace['Path'] = Path
        path = Path('/synthetic/entry')
        def raise_error(error):
            def fail(_):
                raise error
            return fail
        guard_cases = [
            ('expected-oserror', PermissionError(errno.EACCES, 'synthetic', str(path)), PermissionError, True),
            ('wrong-oserror-class', FileNotFoundError(errno.ENOENT, 'synthetic', str(path)), PermissionError, False),
            ('wrong-filename', PermissionError(errno.EACCES, 'synthetic', '/other'), PermissionError, False),
            ('unicode-error', UnicodeDecodeError('utf8', b'\xff', 0, 1, 'synthetic'), UnicodeDecodeError, True),
            ('unexpected-error', RuntimeError('synthetic'), PermissionError, False)]
        for name, error, expected_class, accepted in guard_cases:
            result = real_helpers['_library_error']('synthetic', raise_error(error),
                                                     None, path, expected_class)
            assert (result == []) == accepted
            recorded.append({'case': 'real-library-guard-' + name, 'passed': True})
        assert real_helpers['_library_error']('synthetic', lambda _: None,
                                               None, path, PermissionError)
        recorded.append({'case': 'real-library-guard-not-refused', 'passed': True})

        # Fake all filesystem/reader/writer effects while executing the real FIFO finally.
        events = []
        class FakeWriter:
            TEXT = b'synthetic finite stream'
            def __init__(self, _):
                events.append('writer-start')
            def stop(self):
                events.append('writer-stop')
        namespace.update({'shutil': types.SimpleNamespace(copytree=lambda *_: None),
                          'os': types.SimpleNamespace(mkfifo=lambda _: None),
                          'DECISIONS': 'decisions', 'FIFO_CONTROL_ENTRY': 'FIFO.md',
                          '_FifoWriter': FakeWriter})
        namespace['census'] = lambda _: events.append('census')
        namespace['signoff_texts'] = lambda *_, **__: [(
            Path('/synthetic/signoff-entry-control-live-writer-fifo/decisions/FIFO.md'),
            FakeWriter.TEXT.decode())]
        namespace['_cli_exits'] = lambda _: ({flag: (0, False) for flag in
                                             ('--check', '--census', '--regenerate')}, False)
        for raising in (False, True):
            events.clear()
            def run(_):
                events.append('run')
                if raising:
                    raise RuntimeError('synthetic-uncaught')
                return types.SimpleNamespace(failed=set())
            namespace['run'] = run
            witnesses, failures = [], []
            try:
                real_helpers['_fifo_control']('/synthetic', None, witnesses, failures)
            except RuntimeError as error:
                assert raising and str(error) == 'synthetic-uncaught'
            else:
                assert not raising and len(witnesses) == 1 and failures == []
            assert events[0] == 'writer-start' and events[-1] == 'writer-stop'
            recorded.append({'case': 'real-fifo-finally-' + str(raising), 'passed': True})

        class EmptyTree:
            def rglob(self, _):
                return []
        namespace.update({'ROOT': 'original-root', 'os': os})
        for raising in (False, True):
            calls = []
            def fake_main(flags):
                calls.extend(flags)
                assert namespace['ROOT'] is fake_tree
                if raising:
                    raise RuntimeError('synthetic-cli-error')
                return 0
            fake_tree = EmptyTree()
            namespace['main'] = fake_main
            try:
                result = real_helpers['_cli_exits'](fake_tree)
            except RuntimeError as error:
                assert raising and str(error) == 'synthetic-cli-error'
            else:
                assert not raising and list(result[0]) == ['--check', '--census', '--regenerate']
                assert result[1] is False
            assert namespace['ROOT'] == 'original-root'
            recorded.append({'case': 'real-cli-root-finally-' + str(raising), 'passed': True})

        contents = [b'original']
        class SyntheticFile:
            def is_file(self):
                return True
            def read_bytes(self):
                return contents[0]
        synthetic_file = SyntheticFile()
        class ChangingTree:
            def rglob(self, _):
                return [synthetic_file]
        namespace['os'] = types.SimpleNamespace(access=lambda *_: True, R_OK=4)
        def writing_main(flags):
            if flags == ['--regenerate']:
                contents[0] = b'changed'
            return 0
        namespace['main'] = writing_main
        result = real_helpers['_cli_exits'](ChangingTree())
        assert result[1] is True and namespace['ROOT'] == 'original-root'
        recorded.append({'case': 'real-cli-no-write-detector', 'passed': True})

        join = copy.deepcopy(definitions['_join_case_results'])
        guard = join.body.pop(1)
        assert isinstance(guard, ast.If)
        old_guard = ast.get_source_segment(source, guard)
        mutant_namespace = {}
        exec(compile(ast.Module(body=[join], type_ignores=[]), '<guard-mutant>', 'exec'), mutant_namespace)
        witnesses, failures = [], []
        mutant_namespace['_join_case_results']([(0, [0], [], []), (1, [1], [], [])],
                                                3, witnesses, failures)
        assert witnesses == [0, 1]
        mutation = {'id': 'remove-population-guard', 'old': old_guard, 'new': '',
                    'expectedCount': 3, 'indices': [0, 1], 'outcome': 'killed',
                    'predicate': 'incomplete result population must refuse before merge'}
        recorded.append({'case': 'guard-removal-mutation', 'passed': True})
    finally:
        del sys.modules[module.__name__]
    report = {'baseCommit': args.base_commit,
              'candidateSourceSha256': hashlib.sha256(source.encode()).hexdigest(),
              'harnessSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'entryTasks': 17, 'editionTasks': 19, 'cases': recorded,
              'caseCount': len(recorded), 'passed': len(recorded), 'mutation': mutation,
              'boundary': 'Only extracted helper/coordinator/guard AST executes. '
              'Fake family callbacks, filesystems, readers, devices and FIFO writer; '
              'two fork workers and one tiny synthetic thread. No project import, '
              'real fixture/tree/CLI child, canonical selftest, build or native run.'}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('candidateSourceSha256', 'caseCount', 'passed')}, indent=2))


if __name__ == '__main__':
    main()
