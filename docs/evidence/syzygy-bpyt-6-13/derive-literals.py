#!/usr/bin/env python3
"""Derive, outside the modules under test, the literal digests that syzygy-bpyt.6.13 pins (review R-GP-IMPL-SUPPORT-LEAF-1 N2).

Usage:
  derive-literals.py manifest    <manifest.json>      digest of a manifest JSON dump (the dump's own `digest` is removed first)
  derive-literals.py observation <observation.json>   digest of an observation dump (observationDigest and both capture instants removed)
  derive-literals.py strings                           the digests whose pre-image is a typed string (artifact bytes, questions file,
                                                       clarification question tuples, attempt identities)
  derive-literals.py --selftest

The canonical form is Python's json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=False). It equals the modules' own
(`canonicalJson`: key-sorted JSON.stringify) only while every object key is ASCII, since Python sorts by code point and JS by UTF-16 unit;
the fixtures' keys are ASCII identifiers, and the dump's own digest, which the module computed, is printed beside the derived one so a
disagreement shows. The pre-images below are typed from the fixtures' source text, never read back from a module.
Every digest here is taken with hashlib; the second method for the typed strings is `sha256sum` over a file holding the same bytes (--selftest
runs one).
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile


def sha(data):
    return hashlib.sha256(data.encode('utf-8') if isinstance(data, str) else data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def manifest_digest(dump):
    body = {k: v for k, v in dump.items() if k != 'digest'}
    return 'sha256:' + sha(canonical(body))


def observation_digest(dump):
    body = {k: v for k, v in dump.items() if k not in ('observationDigest', 'capturedAt')}
    body['sources'] = [{**s, 'stamp': {k: v for k, v in s['stamp'].items() if k != 'capturedAt'}} for s in body['sources']]
    return 'sha256:' + sha(canonical(body))


# C3: model.test.ts butlersFixture(), the five required artifacts, byte for byte.
ARTIFACTS = {
    'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md': '# WhatsApp identity design\nStatus: Approved for implementation\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md': '# Repair WhatsApp identity reconciliation\n- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.\nowner-approved-intent-marker\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md': '# switchboard identity\nREQ-switchboard-identity-001\nwhatsapp_user_client -> whatsapp_jid\n',
    'src/butlers/identity.py': 'def canonical_identity():\n    return "private-source-marker"\n',
    'tests/core/test_identity.py': 'def test_identity():\n    assert "private-test-marker"\n',
}

# C11: dossier-evaluation.test.ts QUESTIONS, JSON.stringify of the object below (compact, insertion order).
QUESTIONS = json.dumps({
    'format': 'polaris-reader-questions-v1',
    'questions': [
        {'id': 'q-ideas', 'topics': ['core-ideas'], 'text': 'What is the central idea?'},
        {'id': 'q-trade', 'topics': ['trade-offs', 'mechanisms'], 'text': 'What does speed cost?'},
        {'id': 'q-purpose', 'topics': [], 'text': 'Who is it for?'},
    ],
}, separators=(',', ':'), ensure_ascii=False)

# R3: dossier-profile.ts openQuestions(), the tuple [id, question, scope, reason] of each question, JSON.stringify'd.
R3 = {
    'purpose': ['purpose', 'What is this project for, and who is it for?', 'The purpose and beneficiary framing of every section.',
                'No selected source path looks like an overview, README or statement of purpose (a path test, not a reading of content).'],
    'audience': ['audience', 'Who should this dossier be written for?', 'Depth, vocabulary and which workflows are treated as primary.', 'No intended reader was declared.'],
    'scope-2-deferred': ['scope', '2 file(s) did not fit the source budget. Continue with a limited account, or extend the budget?',
                         'Every claim about material in the deferred files.', 'Selection was capped, so part of the repository is counted but unread.'],
}

# R9: durable-lifecycle.ts attemptId(), `attempt-` + sha256(requestId NUL stage NUL ordinal). The ordinal is pipeline.ts's count of
# calls made so far (`ordinal: calls`), so a run with one call per stage numbers inventory 0, plan 1, author 2, edit 3, fidelity 4.
def attempt_id(request, stage, ordinal):
    return 'attempt-' + sha(f'{request}\0{stage}\0{ordinal}')


def strings():
    out = {
        'C3 artifact digests': {path: 'sha256:' + sha(text) for path, text in ARTIFACTS.items()},
        'C11 questions file': {'text': QUESTIONS, 'sha256': sha(QUESTIONS)},
        'R3 clarification question digests': {k: sha(json.dumps(v, separators=(',', ':'), ensure_ascii=False)) for k, v in R3.items()},
        'R9 attempt identities (request run-one)': {f'{stage}@{ordinal}': attempt_id('run-one', stage, ordinal) for ordinal, stage in enumerate(('inventory', 'plan', 'author', 'edit', 'fidelity'))},
    }
    return out


def selftest():
    ok = True

    def check(name, passed):
        nonlocal ok
        ok = ok and passed
        print(('ok  ' if passed else 'BAD ') + name)

    # The second method: sha256sum over a file holding the same bytes.
    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, 'f')
        sample = next(iter(ARTIFACTS.values()))
        open(path, 'wb').write(sample.encode('utf-8'))
        coreutils = subprocess.run(['sha256sum', path], capture_output=True, text=True, check=True).stdout.split()[0]
        check('hashlib equals sha256sum over a file of the same bytes', coreutils == sha(sample))
    check('the canonical form sorts keys and drops spaces', canonical({'b': 1, 'a': [1, {'d': 2, 'c': 3}]}) == '{"a":[1,{"c":3,"d":2}],"b":1}')
    check('a changed field changes the manifest digest', manifest_digest({'a': 1, 'digest': 'x'}) != manifest_digest({'a': 2, 'digest': 'x'}))
    check('the manifest digest ignores the dump\'s own digest field', manifest_digest({'a': 1, 'digest': 'x'}) == manifest_digest({'a': 1, 'digest': 'y'}))
    base = {'k': 1, 'capturedAt': 't1', 'observationDigest': 'd', 'sources': [{'p': 'a', 'stamp': {'capturedAt': 't1', 'm': 1}}]}
    other = {'k': 1, 'capturedAt': 't2', 'observationDigest': 'e', 'sources': [{'p': 'a', 'stamp': {'capturedAt': 't2', 'm': 1}}]}
    check('the observation digest ignores both capture instants and its own digest', observation_digest(base) == observation_digest(other))
    check('the observation digest follows a stamp field that is not the instant', observation_digest(base) != observation_digest({**base, 'sources': [{'p': 'a', 'stamp': {'capturedAt': 't1', 'm': 2}}]}))
    check('an attempt identity follows the field order', attempt_id('r', 's', 0) != 'attempt-' + sha('s\0r\x000'))
    return ok


def main():
    if sys.argv[1:] == ['--selftest']:
        sys.exit(0 if selftest() else 1)
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode in ('manifest', 'observation'):
        dump = json.load(open(sys.argv[2]))
        derived = (manifest_digest if mode == 'manifest' else observation_digest)(dump)
        own = dump['digest' if mode == 'manifest' else 'observationDigest']
        print(json.dumps({'derived': derived, 'moduleOwn': own, 'equal': derived == own}, indent=1))
        sys.exit(0 if derived == own else 1)
    if mode == 'strings':
        print(json.dumps(strings(), indent=1, ensure_ascii=False))
        return
    raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
