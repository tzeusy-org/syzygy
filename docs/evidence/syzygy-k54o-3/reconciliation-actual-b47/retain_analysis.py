#!/usr/bin/env python3
"""Retain and compare complete printed witness populations; never run the checker."""
import argparse
import ast
import collections
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_log(path):
    data = path.read_bytes()
    return gzip.decompress(data) if path.suffix == '.gz' else data


def parse_log(raw):
    text = raw.decode('utf-8')
    profiles, interleaved = [], []
    decoder = json.JSONDecoder()
    position = 0
    while True:
        start = text.find('SELFTEST_PROFILE {', position)
        if start < 0:
            break
        json_start = start + len('SELFTEST_PROFILE ')
        value, length = decoder.raw_decode(text[json_start:])
        assert isinstance(value, dict) and set(value) <= {
            'phase', 'elapsedMs', 'outcome', 'witnessesAdded'}
        profiles.append(value)
        if start and text[start - 1] != '\n':
            interleaved.append({'phase': value['phase'],
                                'rawPrecedingCharacter': text[start - 1]})
        text = text[:start] + text[json_start + length:]
        position = start
    lines = [re.sub(r'^\d{4}-\d\d-\d\dT\S+Z ', '', line)
             for line in text.splitlines()]
    witnesses, independent = [], []
    for line in lines:
        match = re.fullmatch(
            r'(killed|held|SURVIVED|BROKEN) +([^ ]+) +(.*) \(failed: (.*)\)', line)
        if match:
            witnesses.append({'outcome': match[1], 'id': match[2],
                              'expected': match[3], 'failedPrinted': match[4],
                              'normalizedLine': line})
        # Independent method: tokens and final delimiter, without the row regex.
        fields = line.split(None, 2)
        if fields and fields[0] in ('killed', 'held', 'SURVIVED', 'BROKEN'):
            assert len(fields) == 3
            expected, separator, failed = fields[2].rpartition(' (failed: ')
            assert separator and failed.endswith(')')
            independent.append((fields[0], fields[1], expected, failed[:-1]))
    assert [(w['outcome'], w['id'], w['expected'], w['failedPrinted'])
            for w in witnesses] == independent
    return witnesses, profiles, interleaved, lines


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--clone', type=Path, required=True)
    parser.add_argument('--actual-log', type=Path, required=True)
    parser.add_argument('--predecessor-log', type=Path, required=True)
    parser.add_argument('--result-json', type=Path, required=True)
    parser.add_argument('--subject-json', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    actual_commit = 'b47cd8290c8d4a981789a6d779054ecaa5f3d14c'
    predecessor_commit = 'f043a10aab6bf3baee0b1acd24c72b78d3654ded'
    args.output_dir.mkdir(parents=True, exist_ok=True)
    actual_raw, predecessor_raw = read_log(args.actual_log), read_log(args.predecessor_log)
    actual, phases, merged, actual_lines = parse_log(actual_raw)
    predecessor, old_phases, old_merged, _ = parse_log(predecessor_raw)
    assert len(actual) == len(predecessor) == 679
    assert len({w['id'] for w in actual}) == len({w['id'] for w in predecessor}) == 679
    identities = lambda rows: [(w['id'], w['expected']) for w in rows]
    assert identities(actual) == identities(predecessor)
    outcome_counts = collections.Counter(w['outcome'] for w in actual)
    assert outcome_counts == {'killed': 566, 'held': 113}
    summary = [line for line in actual_lines if line.startswith('SELFTEST PASS:')]
    assert len(summary) == 1
    terminal = re.search(r'; (\d+) of (\d+) mutants killed .*; (\d+) of (\d+) controls held '
                         r'\(commit ([0-9a-f]+)\)', summary[0])
    assert terminal and list(map(int, terminal.groups()[:4])) == [566, 566, 113, 113]
    assert actual_commit.startswith(terminal[5])
    result = json.loads(args.result_json.read_text())
    subject = json.loads(args.subject_json.read_text())
    assert result['commit'] == subject['commit'] == actual_commit
    assert result['exit'] == 0
    transitions = collections.Counter(a['outcome'] + '->' + b['outcome']
                                     for a, b in zip(predecessor, actual))
    changed = [{'index': i, 'id': old['id'], 'before': old['outcome'],
                'after': new['outcome']} for i, (old, new) in enumerate(zip(predecessor, actual))
               if old['outcome'] != new['outcome']]
    assert len(changed) == 326
    def git(*arguments):
        return subprocess.run(['git', *arguments], cwd=args.repo,
                              capture_output=True, check=True).stdout
    script = git('show', actual_commit + ':scripts/check_spec_reconciliation.py')
    assert digest(script) == 'c68cf76134cfdb53c1b7c736d7de909913e1f3d105c2b5a5ee02e1ed510066ed'
    tree = ast.parse(script)
    dictionaries = {n.targets[0].id: n.value for n in tree.body
                    if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name)
                    and isinstance(n.value, ast.Dict)}
    entry_names = [ast.literal_eval(k) for key in
                   ('ENTRY_KIND_CASES', 'ENTRY_CONTROLS', 'AFTER_REFUSAL_CASES')
                   for k in dictionaries[key].keys]
    entry_names += ['signoff-entry-control-live-writer-fifo']
    case_function = next(n for n in tree.body if isinstance(n, ast.FunctionDef)
                         and n.name == '_selftest_cases')
    family_tuple = next(n.value for n in case_function.body if isinstance(n, ast.Assign)
                        and isinstance(n.targets[0], ast.Name) and n.targets[0].id == 'families')
    edition_names = [n.id for n in family_tuple.elts]
    entry_phases = [p for p in phases if p['phase'] in entry_names]
    edition_phases = [p for p in phases if p['phase'] in edition_names]
    assert len(entry_phases) == 17 and len(edition_phases) == 19
    assert sum(p['witnessesAdded'] for p in entry_phases) == 17
    assert sum(p['witnessesAdded'] for p in edition_phases) == 359
    by_name = {p['phase']: p for p in phases}
    assert len(by_name) == len(phases) == 57
    known_sequential = [p for p in phases if p['phase'] not in
                        set(entry_names + edition_names + ['total'])]
    selected = {
        'actualCommit': actual_commit, 'predecessorCommit': predecessor_commit,
        'actualTerminal': summary[0], 'actualExit': result['exit'],
        'elapsedSeconds': result['elapsedSeconds'], 'witnessCount': len(actual),
        'independentTokenParserCount': len(actual), 'terminalSum': 566 + 113,
        'distinctIds': 679, 'outcomes': dict(outcome_counts),
        'predecessorOutcomes': dict(collections.Counter(w['outcome'] for w in predecessor)),
        'orderedIdentityExpectationPairsEqual': True,
        'statusTransitions': dict(transitions), 'changedStatusCount': len(changed),
        'actualProfileCount': len(phases),
        'profileTotalMs': by_name['total']['elapsedMs'],
        'prefixMs': by_name['prefix-mutants']['elapsedMs'],
        'entryPhaseWallMs': by_name['_entry_kind_cases']['elapsedMs'],
        'entryTaskElapsedSumMs': sum(p['elapsedMs'] for p in entry_phases),
        'entryTaskWitnesses': 17,
        'editionTaskElapsedSumMs': sum(p['elapsedMs'] for p in edition_phases),
        'editionTaskWitnesses': 359, 'editionPoolWallMs': None,
        'remainderIncludingEditionPoolAndUnprofiledWorkMs': (
            by_name['total']['elapsedMs'] - sum(p['elapsedMs'] for p in known_sequential)),
        'profiles': phases, 'interleavedProfileFragments': merged,
        'limits': [
            'Predecessor comparison is to a failed hosted run, not a repaired serial baseline.',
            'Printed witness identities/expectations/outcomes are complete; printed output omits '
            'the original structured path/old/new fields, so full structured tuple equality is not claimed.',
            'Worker task durations overlap. Their sum is not pool wall time. Edition pool wall '
            'time has no dedicated aggregate measurement.',
            '719-second local pass does not establish a performance win or either hosted seven-minute clock.',
        ]}
    payloads = {
        'actual-witness-population.json': actual,
        'predecessor-witness-population.json': predecessor,
        'status-changes.json': changed,
    }
    compressed = []
    for name, data in [('actual.log', actual_raw), ('predecessor.log', predecessor_raw)] + [
            (name, (json.dumps(value, indent=2) + '\n').encode())
            for name, value in payloads.items()]:
        (args.output_dir / (name + '.gz')).write_bytes(gzip.compress(data, mtime=0))
        compressed.append({'path': name + '.gz', 'uncompressedSha256': digest(data),
                           'uncompressedBytes': len(data), 'mtime': 0})
    (args.output_dir / 'selected-report.json').write_text(json.dumps(selected, indent=2) + '\n')
    (args.output_dir / 'result.json').write_bytes(args.result_json.read_bytes())
    (args.output_dir / 'run-subject.json').write_bytes(args.subject_json.read_bytes())
    sources = []
    for commit in (actual_commit, predecessor_commit):
        for path in ('scripts/check_spec_reconciliation.py',
                     '.syzygy/governance/decisions/AGENT-ADOPTIONS.md',
                     '.github/workflows/governance-docs.yml'):
            data = git('show', commit + ':' + path)
            sources.append({'commit': commit, 'path': path, 'sha256': digest(data),
                            'gitBlob': git('rev-parse', commit + ':' + path).decode().strip()})
    clone_head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=args.clone,
                                capture_output=True, check=True, text=True).stdout.strip()
    binding = {'actualCommit': actual_commit,
               'actualTree': git('rev-parse', actual_commit + '^{tree}').decode().strip(),
               'actualParents': git('show', '-s', '--format=%P', actual_commit).decode().split(),
               'sources': sources, 'compressedRecords': compressed,
               'sourceMatchesFrozenCombinedCandidate': True,
               'currentVerificationCloneHead': clone_head,
               'cloneNowMatchesActualSourceFiles': {
                   row['path']: digest((args.clone / row['path']).read_bytes()) == row['sha256']
                   for row in sources if row['commit'] == actual_commit},
               'runIdentityProvenance': 'Retained result and run-subject JSON name b47; '
               'terminal selftest summary names b47. Clone HEAD has since moved; current '
               'clone inspection is not a fresh b47 checkout certification.',
               'comparisonBoundary': selected['limits'],
               'normalization': 'Only JSON-decoded SELFTEST_PROFILE fragments are removed '
               'before parsing witness lines. Optional hosted ISO timestamps are stripped. '
               'The raw byte-exact logs remain retained with hashes.',
               'analysisScriptSha256': digest(Path(__file__).read_bytes())}
    (args.output_dir / 'source-binding.json').write_text(json.dumps(binding, indent=2) + '\n')
    print(json.dumps({key: selected[key] for key in (
        'witnessCount', 'distinctIds', 'orderedIdentityExpectationPairsEqual',
        'statusTransitions', 'elapsedSeconds', 'profileTotalMs', 'entryPhaseWallMs',
        'entryTaskElapsedSumMs', 'editionTaskElapsedSumMs',
        'remainderIncludingEditionPoolAndUnprofiledWorkMs')}, indent=2))


if __name__ == '__main__':
    main()
