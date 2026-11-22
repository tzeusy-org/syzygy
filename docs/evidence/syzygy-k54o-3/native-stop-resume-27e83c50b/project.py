#!/usr/bin/env python3
"""Project an owned uninstrumented stop-resume run without copying raw bodies or paths."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys

ROLES = ('author', 'inventory', 'fidelity', 'design')
KINDS = frozenset(('declaration', 'launch-attempt', 'launch-history', 'launch-terminal', 'machine-peer', 'design-delivery',
                   'design-ordered', 'ordered-design-verdict', 'design-verdict', 'usage', 'relay', 'control',
                   'before-tool', 'tool-receipt', 'design-artifact-read'))
OUTCOMES = frozenset(('exited', 'launch-refused', 'stopped', 'wall-limit', 'output-limit', 'storage-limit',
                      'process-limit', 'inspection-failed'))
OPERATIONS = frozenset(('inference-forward', 'inference-query', 'artifact_read', 'dossier_step', 'artifact_write', 'source_read'))
RELAY = frozenset(('attempt-allowed', 'attempt-refused', 'send-attempt', 'send-outcome', 'response-admitted',
                   'response-refused', 'transport-failed'))
BLOCKERS = ('binding-changed', 'launch-unavailable', 'audit-unavailable', 'control-unavailable', 'role-ended',
            'transport-unavailable', 'provenance-unavailable', 'cleanup-unconfirmed', 'cpu-budget',
            'protected rendered site evidence changed or expired', 'recovery history unavailable')
DIGEST = re.compile(r'[a-f0-9]{64}\Z')
ISO = re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\Z')
SCREEN_CLOCK = re.compile(r'^\s*(\d{2}:\d{2}:\d{2})\s+(.+)$')

def sum_hash(raw):
    return hashlib.sha256(raw).hexdigest()

def integer(value):
    return value if type(value) is int else None

def label(value, allowed):
    return value if type(value) is str and value in allowed else 'Unknown'

def timestamp(value):
    if type(value) is int and 0 <= value <= 4_102_444_800_000:
        return datetime.fromtimestamp(value/1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    return value if isinstance(value, str) and ISO.fullmatch(value) else None

def digest(value):
    return value if isinstance(value, str) and DIGEST.fullmatch(value) else None

def file_binding(file):
    raw = file.read_bytes()
    return {'bytes':len(raw), 'sha256':sum_hash(raw), 'lastModifiedNs':file.stat().st_mtime_ns}

def terminal(payload):
    return {
        'outcome': label(payload.get('outcome'), OUTCOMES),
        'exitCode': integer(payload.get('exitCode')),
        'signal': None if payload.get('signal') is None else label(payload.get('signal'), ('SIGTERM', 'SIGKILL')),
        'viewTermination': label(payload.get('viewTermination'), ('view-exited',)),
        'groupTermination': label(payload.get('groupTermination'), ('confirmed',)),
        'toolTermination': label(payload.get('toolTermination'), ('settled',)),
        'pendingInvocations': integer(payload.get('pendingInvocations')),
    }

def segment(file, role, include_digest):
    raw = file.read_bytes()
    prefix = raw.splitlines()
    if not raw.endswith(b'\n') and prefix:
        prefix.pop()
    rows = []
    for line in prefix:
        envelope = json.loads(line)
        event = envelope['event']
        kind = label(event.get('kind'), KINDS)
        row = {'sequence': integer(envelope.get('sequence')), 'kind':kind}
        payload = event.get('payload')
        if isinstance(payload, dict):
            if kind == 'launch-terminal':
                row['terminal'] = terminal(payload)
            if kind == 'machine-peer':
                row['operation'] = label(payload.get('operation'), OPERATIONS)
                row['at'] = timestamp(payload.get('at'))
            if kind == 'relay':
                row['relay'] = label(payload.get('event'), RELAY)
                row['at'] = timestamp(payload.get('at'))
            if kind == 'design-delivery':
                row['round'] = integer(payload.get('round'))
                row['site'] = integer(payload.get('site'))
        rows.append(row)
    out = {'records':len(rows), 'kinds':dict(Counter(row['kind'] for row in rows))}
    if role == 'design':
        out['chronology'] = rows
    else:
        end = next((row['terminal'] for row in reversed(rows) if 'terminal' in row), None)
        if end is not None:
            out['terminal'] = end
    if include_digest:
        out['binding'] = file_binding(file)
    return out

def attempt_population(cut, include_digest=True):
    initial = Path(cut['hidden'])
    attempts = sorted((p for p in initial.parent.glob('attempt-*') if p.is_dir()),
                      key=lambda p: (p != initial, p.stat().st_ctime_ns))
    observations = []
    for attempt in attempts:
        roles = {}
        for role in ROLES:
            for path in attempt.glob(f'*-{role}.jsonl'):
                roles[role] = segment(path, role, include_digest)
        observations.append({'kind':'initial' if attempt == initial else 'fresh', 'roles':roles})
    return observations

def load_optional(path):
    return json.loads(path.read_bytes()) if path.is_file() else {}

def safe_checks(values):
    accepted = {
        'verify': {'ok', 'nextDesignRound'},
        'claim': {'exactCut', 'current'},
        'resumed-guards': {'policyWithdrawal', 'claimWithdrawal'},
        'machine-claim': {'current', 'claimChecks', 'withdrawn', 'asyncCurrent', 'asyncWithdrawn'},
    }
    results = []
    for row in values:
        phase = row.get('phase')
        if phase in accepted:
            closed = {k:v for k,v in row.items() if k in accepted[phase]
                      and (type(v) in (bool, int) or v in ('refused', 'accepted'))}
            results.append({'phase':phase, **closed})
    return results

def witness_view(witness):
    state = witness.get('state', {})
    final = state.get('finalSite', {})
    if not isinstance(final, dict):
        final = {}
    probes = [row for row in witness.get('profiles', []) if row.get('role') in ROLES]
    return {
        'inputTreeSha256':digest(witness.get('inputTreeSha256')),
        'profileRegistrySha256':digest(witness.get('profileRegistrySha256')),
        'profiles':[{ 'role': row['role'], 'sha256':digest(row.get('sha256'))} for row in probes],
        'recordSha256':digest(witness.get('recordSha256')),
        'requestsBeforeResume':[integer(x) for x in witness.get('requestsBeforeResume', [])],
        'requestsAfterResume':[integer(x) for x in witness.get('requestsAfterResume', [])],
        'launchesBeforeResume':[label(x, ROLES) for x in witness.get('launchesBeforeResume', [])],
        'launchesAfterResume':[label(x, ROLES) for x in witness.get('launchesAfterResume', [])],
        'deliveryReproductions':[[integer(x) for x in row] for row in witness.get('deliveryReproductions', [])],
        'finalSiteBeforeStop':integer(witness.get('finalSiteBeforeStop')),
        'finalSite':integer(final.get('site')),
        'coldFinalContinuations':integer(witness.get('coldFinalContinuations')),
        'orderedBeginsAfterResume':integer(witness.get('orderedBeginsAfterResume')),
    }

def screen_chronology(log):
    events = []
    for line in log.splitlines():
        found = SCREEN_CLOCK.match(re.sub(r'\x1b\[[0-9;]*[mHJK]', '', line))
        if not found:
            continue
        clock, detail = found.groups()
        bracket = re.search(r'\bprepared design round ([0-9]+)\b', detail)
        status = next((code for code in BLOCKERS if code in detail), None)
        if bracket:
            events.append({'clock':clock, 'phase':'prepared-design', 'round':int(bracket.group(1))})
        elif status:
            events.append({'clock':clock, 'phase':status})
        elif re.search(r'\brendering draft revision [0-9]+\b', detail):
            events.append({'clock':clock, 'phase':'rendering-draft'})
        elif re.search(r'\bExecution Record', detail, re.I):
            events.append({'clock':clock, 'phase':'execution-record'})
    distinct = list(dict.fromkeys((row['clock'], row['phase'], row.get('round')) for row in events))
    return [{'clock':clock, 'phase':phase, **({'round':number} if number is not None else {})}
            for clock,phase,number in distinct]

def project(prefix, process_exit):
    artifacts = {name:Path(str(prefix) + suffix) for name,suffix in (
        ('nativeLog','.log'), ('cut','-cut.json'), ('failure','-cut.json.failure.json'), ('witness','-witness.json'))}
    cut, failure, witness = (load_optional(artifacts[key]) for key in ('cut','failure','witness'))
    log = artifacts['nativeLog'].read_text()
    selected = re.search(r'stop-resume ([0-9]+)ms', log)
    suite = re.search(r'tests ([0-9.]+)s, environment', log)
    overall = re.search(r'Duration\s+([0-9.]+)s', log)
    verdict = re.search(r'Tests\s+1 (passed|failed) \| 3 skipped \(4\)', log)
    forwards = set(re.findall(r'"designForwards":([0-9]+)', log))
    base = cut or failure
    record = Path(base['run'])/'record.json' if base else None
    record_sha = sum_hash(record.read_bytes()) if record and record.is_file() else None
    view = witness_view(witness) if witness else None
    if view and view['recordSha256'] != record_sha:
        raise ValueError('retained record does not match native witness')
    return {
        'subjectCommit':'27e83c50b66723f2b87c54e7ea254c7f401507a7',
        'subjectTree':'902e744770db877bef05be32844ab111603e7f63',
        'fixture': {'selectedTest':'runs the genuine production pipeline to stop-resume',
                    'runDeadline':'PT2H', 'watchdogMilliseconds':540_000, 'workers':1, 'exitCode':process_exit,
                    'suiteVerdict':verdict.group(1) if verdict else 'Unknown',
                    'selectedElapsedMilliseconds':int(selected.group(1)) if selected else None,
                    'suiteTestsElapsedMilliseconds':round(float(suite.group(1))*1000) if suite else None,
                    'totalElapsedMilliseconds':round(float(overall.group(1))*1000) if overall else None,
                    'initialCutRetained':bool(cut), 'resumeChecks':safe_checks((witness or failure).get('resumeChecks', [])),
                    'designForwardsTotal':int(next(iter(forwards))) if len(forwards) == 1 else None,
                    'executionRecordSha256':record_sha},
        'screenChronology':screen_chronology(log),
        'nativeWitness':view,
        'auditPopulations':attempt_population(base) if base else [],
        'retainedOriginalArtifactsByDigest':{name:file_binding(path) for name,path in artifacts.items() if path.is_file()},
    }

if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        raise SystemExit('usage: project.py ARTIFACT_PREFIX [PROCESS_EXIT]')
    prefix = Path(sys.argv[1])
    if len(sys.argv) == 2:
        cut = load_optional(Path(f'{prefix}-cut.json'))
        print(json.dumps(attempt_population(cut, include_digest=False) if cut else [], indent=2))
    else:
        print(json.dumps(project(prefix, int(sys.argv[2])), indent=2))
