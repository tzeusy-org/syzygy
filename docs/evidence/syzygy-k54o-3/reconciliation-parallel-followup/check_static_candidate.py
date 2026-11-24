#!/usr/bin/env python3
"""Compare real fixture AST and the entire declared source change without imports."""
import argparse
import ast
import copy
import hashlib
import json
from pathlib import Path
import subprocess


def shape(node):
    if isinstance(node, list):
        return [shape(n) for n in node]
    return ast.dump(node, include_attributes=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--base-commit', required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = subprocess.run(['git', 'show', args.base_commit +
                          ':scripts/check_spec_reconciliation.py'], cwd=args.repo,
                         capture_output=True, check=True).stdout
    newraw = args.candidate.read_bytes()
    before, after = ast.parse(raw), ast.parse(newraw)
    old = {n.name: n for n in before.body if isinstance(n, ast.FunctionDef)}
    new = {n.name: n for n in after.body if isinstance(n, ast.FunctionDef)}
    old_entry_loops = [n for n in old['_entry_kind_cases'].body
                       if isinstance(n, ast.For)]
    old_after_loop = next(n for n in old['_after_refusal_cases'].body
                          if isinstance(n, ast.For))

    def original_skip(body):
        body = copy.deepcopy(body)
        skip = body[0]
        assert isinstance(skip, ast.If) and len(skip.body) == 2
        output, leave = skip.body
        assert isinstance(output, ast.Expr) and isinstance(output.value, ast.Call)
        assert shape(output.value.func) == shape(ast.parse('messages.append').body[0].value)
        assert isinstance(leave, ast.Return) and leave.value is None
        output.value.func = ast.Name(id='print', ctx=ast.Load())
        skip.body[1] = ast.Continue()
        return body

    kind = new['_entry_kind_case']
    assert shape(kind.body[0]) == shape(ast.parse('entry, setup, kind, cls = case').body[0])
    assert shape(original_skip(kind.body[1:])) == shape(old_entry_loops[0].body)
    assert shape(new['_entry_control_case'].body) == shape(old_entry_loops[1].body)
    assert shape(original_skip(new['_after_refusal_case'].body)) == shape(old_after_loop.body)
    assert shape(new['_entry_kind_cases'].body[0]) == shape(old['_entry_kind_cases'].body[0])
    tasks = new['_entry_kind_cases'].body[1]
    expected = ast.parse("""tasks = ([('kind', name, case) for name, case in ENTRY_KIND_CASES.items()]
             + [('control', name, setup) for name, setup in ENTRY_CONTROLS.items()]
             + [('fifo', 'signoff-entry-control-live-writer-fifo', None)]
             + [('after', name, case) for name, case in AFTER_REFUSAL_CASES.items()])""").body[0]
    assert shape(tasks) == shape(expected)
    dictionaries = {n.targets[0].id: n.value for n in before.body
                    if isinstance(n, ast.Assign) and len(n.targets) == 1
                    and isinstance(n.targets[0], ast.Name) and isinstance(n.value, ast.Dict)}
    counts = {name: len(dictionaries[name].keys) for name in
              ('ENTRY_KIND_CASES', 'ENTRY_CONTROLS', 'AFTER_REFUSAL_CASES')}
    assert list(counts.values()) == [8, 3, 5]
    names = [ast.literal_eval(k) for name in counts for k in dictionaries[name].keys]
    names += ['signoff-entry-control-live-writer-fifo']
    assert len(names) == len(set(names)) == 17

    cases = copy.deepcopy(new['_selftest_cases'])
    old_loop = next(n for n in old['_selftest_cases'].body if isinstance(n, ast.For)
                    and isinstance(n.target, ast.Name) and n.target.id == 'case')
    start = next(i for i, n in enumerate(cases.body) if isinstance(n, ast.Assign)
                 and isinstance(n.targets[0], ast.Name) and n.targets[0].id == 'families')
    end = next(i for i, n in enumerate(cases.body[start:], start)
               if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
               and isinstance(n.value.func, ast.Name) and n.value.func.id == '_join_case_results')
    assert shape(cases.body[start].value) == shape(old_loop.iter)
    family_names = [n.id for n in old_loop.iter.elts]
    assert len(family_names) == 19
    for name in family_names:
        assert ast.get_source_segment(raw.decode(), old[name]) == (
            ast.get_source_segment(newraw.decode(), new[name]))
    for coordinator in (new['_entry_kind_cases'], cases):
        dispatcher = next(n for n in coordinator.body if isinstance(n, ast.Try))
        assert not dispatcher.handlers and len(dispatcher.finalbody) == 1
        reset = dispatcher.finalbody[0]
        assert isinstance(reset, ast.Assign) and isinstance(reset.value, ast.Constant)
        assert reset.value.value is None
    cases.body[start:end + 1] = [copy.deepcopy(old_loop)]
    assert shape(cases) == shape(old['_selftest_cases'])

    mapper = copy.deepcopy(new['_map_cases'])
    assert [a.arg for a in mapper.args.args] == ['count', 'worker']
    assert len(mapper.args.defaults) == 1 and mapper.args.defaults[0].value is None
    assert shape(mapper.body[1]) == shape(ast.parse(
        'if worker is None:\n    worker = _run_case').body[0])
    mapper.body.pop(1)
    mapper.args.args.pop()
    mapper.args.defaults = []
    class OriginalWorker(ast.NodeTransformer):
        def visit_Name(self, node):
            return ast.copy_location(ast.Name(id='_run_case', ctx=node.ctx), node) \
                if node.id == 'worker' else node
    mapper = OriginalWorker().visit(mapper)
    assert shape(mapper) == shape(old['_map_cases'])
    normalized = copy.deepcopy(after)
    kept = []
    added = {'_entry_kind_case', '_entry_control_case', '_run_entry',
             '_run_edition', '_join_case_results'}
    for node in normalized.body:
        if isinstance(node, ast.FunctionDef):
            if node.name in added:
                continue
            if node.name == '_map_cases':
                node = mapper
            elif node.name == '_selftest_cases':
                node = cases
            elif node.name == '_entry_kind_cases':
                node = copy.deepcopy(old['_entry_kind_cases'])
            elif node.name == '_after_refusal_case':
                node = copy.deepcopy(old['_after_refusal_cases'])
        if (isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
                and node.targets[0].id in ('_ENTRY_STATE', '_EDITION_STATE')):
            assert isinstance(node.value, ast.Constant) and node.value.value is None
            continue
        kept.append(node)
    normalized.body = kept
    assert shape(normalized) == shape(before)
    report = {'baseCommit': args.base_commit,
              'baseSourceSha256': hashlib.sha256(raw).hexdigest(),
              'candidateSourceSha256': hashlib.sha256(newraw).hexdigest(),
              'verifierSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'entryFixtureCounts': counts, 'entryFixtureTotal': 17,
              'entryFixtureBodyAstPreservedExceptSkipBufferAndContinueToReturn': True,
              'editionFamilyCount': len(family_names), 'editionBodiesByteIdentical': True,
              'fullModuleAstIdenticalAfterReversingDeclaredEdits': True,
              'originalWorkerPolicyPreserved': True,
              'fifoWriterAndCliLimitsGuardsCleanupClassesPreserved': True,
              'boundary': 'AST/git blob inspection only; no project execution.'}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
