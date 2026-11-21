#!/usr/bin/python3
"""Execute source-extracted pre-effect admission prefixes, never either full writer.

The record's structured argv/environment locate a synthetic fixture. Narrative
prose is retained as untrusted input metadata and is never an authority input.
"""
import argparse
import ast
import hashlib
import json
import os
import pathlib
import sys
import tempfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def admission(source, guarded):
    """Select the real argument parse and, for the successor, its immediate guard.

    Fail closed if the actual module's pre-effect structure has drifted. The
    predecessor seam is executable argument resolution, not an invented True.
    """
    tree = ast.parse(source)
    positions = [i for i, n in enumerate(tree.body) if isinstance(n, ast.Assign)
                 and any(isinstance(t, ast.Tuple) and
                         [e.id for e in t.elts] == ['repo', 'commit', 'tmp_root', 'out']
                         for t in n.targets)]
    assert len(positions) == 1, 'one actual four-argument admission statement required'
    index = positions[0]
    parse = tree.body[index]
    assert ast.unparse(parse) == (
        'repo, commit, tmp_root, out = (pathlib.Path(sys.argv[1]).resolve(), '
        'sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), '
        'pathlib.Path(sys.argv[4]).resolve())'), 'argument boundary changed'
    selected = [parse]
    if guarded:
        functions = [n for n in tree.body if isinstance(n, ast.FunctionDef)
                     and n.name == 'private_directory']
        assert len(functions) == 1
        call = tree.body[index + 1]
        assert ast.unparse(call) == 'tmp_root = private_directory(tmp_root)'
        selected = [functions[0], parse, call]
    else:
        assert not any(isinstance(n, ast.FunctionDef) and n.name == 'private_directory'
                       for n in tree.body), 'predecessor unexpectedly guarded'
        assert ast.unparse(tree.body[index + 1]) == "PROJECT = '@syzygy/three-surface-poc-app'"
    # The actual first discovery statement is excluded, as are all writers,
    # imports, tracked(), process creation and module-level output operations.
    first_query = next(n for n in tree.body if isinstance(n, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == 'all_tests'
                               for t in n.targets))
    assert selected[-1].end_lineno < first_query.lineno
    segments = [{'start_line': n.lineno, 'end_line': n.end_lineno,
                 'text': ast.get_source_segment(source, n)} for n in selected]
    module = ast.fix_missing_locations(ast.Module(body=selected, type_ignores=[]))
    return compile(module, 'guarded-admission' if guarded else 'old-admission', 'exec'), segments


def execute(code, record):
    structured = record['structured']
    os.environ.clear()
    os.environ.update(structured['environment'])
    tempfile.tempdir = structured['cached_temp_directory']
    original_argv = sys.argv
    sys.argv = ['leak_by_file.py', *structured['argv']]
    scope = {'pathlib': pathlib, 'sys': sys, 'tempfile': tempfile, 'os': os}
    try:
        exec(code, scope)
        return {'admitted': True, 'resolved_root': str(scope['tmp_root']),
                'diagnostic': None, 'exit_at_seam': 0}
    except SystemExit as error:
        return {'admitted': False, 'resolved_root': None,
                'diagnostic': str(error), 'exit_at_seam': 1}
    finally:
        sys.argv = original_argv


def validate(result):
    rows = result['rows']
    assert len(rows) == 33 and len({r['id'] for r in rows}) == 33
    assert {r['prose_variant'] for r in rows} == {'neutral', 'grant-claim', 'refusal-claim'}
    grouped = {}
    for row in rows:
        assert row['old']['admitted'] is True, (row['id'], 'predecessor admission')
        assert row['new']['admitted'] == row['expected']['new_admitted'], row['id']
        assert row['old']['exit_at_seam'] == 0
        expected_refusal = row['expected']['refusal_fragment']
        if expected_refusal:
            assert expected_refusal in row['new']['diagnostic'], row['id']
            assert row['new']['exit_at_seam'] == 1
        else:
            assert row['new']['resolved_root'] == str(pathlib.Path(row['structured']['argv'][2]).resolve())
        grouped.setdefault(row['case'], []).append(row)
    assert len(grouped) == 11
    for members in grouped.values():
        assert len(members) == 3
        assert len({json.dumps(m['structured'], sort_keys=True) for m in members}) == 1
        assert len({m['prose'] for m in members}) == 3
        assert len({json.dumps([m['old'], m['new']], sort_keys=True) for m in members}) == 1
    assert sum(not row['new']['admitted'] for row in rows) == 24
    assert sum(row['new']['admitted'] for row in rows) == 9


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('inputs', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    args = parser.parse_args()
    inputs = json.loads(args.inputs.read_text())
    codes, bindings = {}, {}
    for label, guarded in [('old', False), ('new', True)]:
        item = inputs['source_bindings'][label]
        data = pathlib.Path(item['copy']).read_bytes()
        assert digest(data) == item['sha256']
        codes[label], segments = admission(data.decode(), guarded)
        bindings[label] = {**item, 'executed_segments': segments,
                           'executed_segments_sha256': digest(json.dumps(segments, sort_keys=True).encode())}
    rows = []
    for record in inputs['records']:
        rows.append({**record, 'old': execute(codes['old'], record),
                     'new': execute(codes['new'], record)})
    result = {'schema': 'n13-safe-admission-differential/1',
              'input_sha256': digest(args.inputs.read_bytes()),
              'driver_sha256': digest(pathlib.Path(__file__).read_bytes()),
              'source_bindings': bindings, 'rows': rows,
              'scope': 'Only source-extracted admission prefixes execute; no discovery, child, writer or result code from either full script executes.',
              'record_population': 33, 'structured_cases': 11, 'prose_variants': 3,
              'expected_changed_admissions': 24, 'expected_unchanged_admissions': 9}
    validate(result)
    # Sensitivity of the result checks: an invented predecessor refusal, dropped
    # successor guard, absent row and prose-specific result must each be rejected.
    checks = []
    for name in ('old-refusal', 'dropped-new-guard', 'missing-row', 'prose-override'):
        mutant = json.loads(json.dumps(result))
        if name == 'old-refusal':
            mutant['rows'][0]['old']['admitted'] = False
        elif name == 'missing-row':
            mutant['rows'].pop()
        elif name == 'dropped-new-guard':
            for target in mutant['rows']:
                target['new'] = dict(target['old'])
        else:
            target = next(r for r in mutant['rows'] if not r['expected']['new_admitted'])
            target['new'] = dict(target['old'])
        try:
            validate(mutant)
        except AssertionError:
            checks.append({'name': name, 'rejected': True})
        else:
            raise AssertionError(f'checker accepted {name}')
    result['checker_sensitivity'] = checks
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'record_population': len(rows), 'changed': 24, 'unchanged': 9,
                      'checker_sensitivity': checks, 'holds': True}), flush=True)


if __name__ == '__main__':
    main()
