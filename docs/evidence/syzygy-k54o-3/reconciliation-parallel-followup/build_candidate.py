#!/usr/bin/env python3
"""Generate the external, narrow dispatcher candidate from one frozen git blob."""
import argparse
import ast
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import textwrap


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--base-commit", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    rel = "scripts/check_spec_reconciliation.py"
    raw = subprocess.run(["git", "show", args.base_commit + ":" + rel],
                         cwd=args.repo, capture_output=True, check=True).stdout
    assert hashlib.sha256(raw).hexdigest() == (
        "b64c1338d9eec7770b626cb650e87082174326a1da623d0e7c05be40c6b0648f")
    original = raw.decode()
    tree = ast.parse(original)
    definitions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
    lines = original.splitlines(keepends=True)
    def body(nodes):
        return textwrap.dedent("".join(lines[nodes[0].lineno - 1:nodes[-1].end_lineno]))
    def indent(text):
        return textwrap.indent(text, "    ")
    entry = definitions["_entry_kind_cases"]
    loops = [n for n in entry.body if isinstance(n, ast.For)]
    assert len(loops) == 2
    kind_body = body(loops[0].body)
    kind_body = kind_body.replace(
        '    print(f"SKIPPED  {name}: no unreadable block device under /dev")\n'
        '    continue\n',
        '    messages.append(f"SKIPPED  {name}: no unreadable block device under /dev")\n'
        '    return\n', 1)
    control_body = body(loops[1].body)
    after = definitions["_after_refusal_cases"]
    after_loop = next(n for n in after.body if isinstance(n, ast.For))
    after_body = body(after_loop.body).replace(
        '    print(f"SKIPPED  {name}: no /dev/ptmx")\n    continue\n',
        '    messages.append(f"SKIPPED  {name}: no /dev/ptmx")\n    return\n', 1)
    entry_doc = ''.join(lines[entry.body[0].lineno - 1:entry.body[0].end_lineno])
    new_entry = 'def _entry_kind_cases(tmp, base, witnesses, failures):\n'
    new_entry += entry_doc
    new_entry += '''    tasks = ([('kind', name, case) for name, case in ENTRY_KIND_CASES.items()]
             + [('control', name, setup) for name, setup in ENTRY_CONTROLS.items()]
             + [('fifo', 'signoff-entry-control-live-writer-fifo', None)]
             + [('after', name, case) for name, case in AFTER_REFUSAL_CASES.items()])
    global _ENTRY_STATE
    _ENTRY_STATE = (tmp, base, tasks)
    try:
        results = _map_cases(len(tasks), _run_entry)
    finally:
        _ENTRY_STATE = None
    _join_case_results(results, len(tasks), witnesses, failures)


def _entry_kind_case(tmp, base, name, case, witnesses, failures, messages):
    entry, setup, kind, cls = case
'''
    new_entry += indent(kind_body) + '\n\n'
    new_entry += 'def _entry_control_case(tmp, base, name, setup, witnesses, failures):\n'
    new_entry += indent(control_body)
    new_after = ('def _after_refusal_case(tmp, base, name, setup, expected,\n'
                 '                        witnesses, failures, messages):\n'
                 + indent(after_body))
    cases = definitions["_selftest_cases"]
    loop = next(n for n in cases.body if isinstance(n, ast.For)
                and isinstance(n.target, ast.Name) and n.target.id == "case")
    edition_block = '    families = ' + ast.get_source_segment(original, loop.iter) + '\n'
    edition_block += '''    global _EDITION_STATE
    _EDITION_STATE = (tmp, figure_base, families)
    try:
        results = _map_cases(len(families), _run_edition)
    finally:
        _EDITION_STATE = None
    _join_case_results(results, len(families), witnesses, failures)
'''
    mapper = '''def _map_cases(count, worker=None):
    """Run every case, in parallel under fork, returning results in order."""
    if worker is None:
        worker = _run_case
    workers = _selftest_workers()
    if workers == 1 or "fork" not in multiprocessing.get_all_start_methods():
        return [worker(i) for i in range(count)]
    with multiprocessing.get_context("fork").Pool(workers) as pool:
        return pool.map(worker, range(count), chunksize=1)


def _run_entry(index):
    tmp, base, tasks = _ENTRY_STATE
    kind, name, case = tasks[index]
    witnesses, failures, messages = [], [], []
    if kind == 'kind':
        function, arguments = _entry_kind_case, (name, case, witnesses, failures, messages)
    elif kind == 'control':
        function, arguments = _entry_control_case, (name, case, witnesses, failures)
    elif kind == 'fifo':
        function, arguments = _fifo_control, (witnesses, failures)
    elif kind == 'after':
        setup, expected = case
        function, arguments = _after_refusal_case, (
            name, setup, expected, witnesses, failures, messages)
    else:
        raise RuntimeError('unknown entry fixture kind')
    _profile_selftest_call(name, function, tmp, base, *arguments, witnesses=witnesses)
    return index, witnesses, failures, messages


def _run_edition(index):
    tmp, figure_base, families = _EDITION_STATE
    family = families[index]
    witnesses, failures = [], []
    _profile_selftest_call(family.__name__, family, tmp, figure_base,
                           witnesses, failures, witnesses=witnesses)
    return index, witnesses, failures, []


def _join_case_results(results, count, witnesses, failures):
    indices = [index for index, _witnesses, _failures, _messages in results]
    if any(type(index) is not int for index in indices) or indices != list(range(count)):
        raise RuntimeError('selftest task result population differs')
    for _index, task_witnesses, task_failures, messages in results:
        for message in messages:
            print(message)
        witnesses.extend(task_witnesses)
        failures.extend(task_failures)
'''
    edits = [(entry.lineno - 1, entry.end_lineno, new_entry),
             (after.lineno - 1, after.end_lineno, new_after),
             (loop.lineno - 1, loop.end_lineno, edition_block),
             (definitions['_map_cases'].lineno - 1,
              definitions['_map_cases'].end_lineno, mapper)]
    for start, end, replacement in sorted(edits, reverse=True):
        lines[start:end] = [replacement]
    candidate = ''.join(lines)
    marker = '_CASE_STATE = None\n\n\ndef _selftest_workers'
    assert candidate.count(marker) == 1
    candidate = candidate.replace(marker, '_CASE_STATE = None\n_ENTRY_STATE = None\n'
                                  '_EDITION_STATE = None\n\n\ndef _selftest_workers', 1)
    ast.parse(candidate)
    patch = ''.join(difflib.unified_diff(
        original.splitlines(True), candidate.splitlines(True),
        fromfile='a/' + rel, tofile='b/' + rel))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / 'check_spec_reconciliation.py').write_text(candidate)
    (args.output_dir / 'candidate.patch').write_text(patch)
    record = {'baseCommit': args.base_commit, 'sourcePath': rel,
              'baseSourceSha256': hashlib.sha256(raw).hexdigest(),
              'candidateSourceSha256': hashlib.sha256(candidate.encode()).hexdigest(),
              'patchSha256': hashlib.sha256(patch.encode()).hexdigest(),
              'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'status': 'External candidate only; timing success and real canonical '
              'witness equality remain Unknown. No primary apply/adoption.'}
    (args.output_dir / 'binding.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record, indent=2))


if __name__ == '__main__':
    main()
