#!/usr/bin/env python3
"""Rule-6 mutants for every alternative of NON_HUMAN_PRINCIPAL (syzygy-bpyt.6.8).

Usage: mutate_non_human_principal.py <tree> <out.json> [--differential-only]
       mutate_non_human_principal.py --selftest

Successor of docs/evidence/non-human-principal-pins-2026-10-22/ (syzygy-bpyt.6.11).
The rule and the mutants are the same; four things differ: (1) the record
stores the sha256 of this script and of regex-differential.mjs; (2) the run
stops, after restoring the file, when any mutant's observed.total differs from
the baseline total (a mutant that breaks module load would otherwise score as
a survivor); (3) it refuses a mutant whose literal equals the original and a
file that is not byte-identical after a restore; (4) --selftest feeds each of
these predicates, and the rule check, a mutated input and requires a refusal.

<tree> is a git checkout, built or not (vitest aliases the packages to source).
The script reads the rule from <tree>/packages/three-surface-poc-core/src/act-fields.ts,
asserts it equals the four arms spelled below (so a changed rule stops the run
instead of being mutated blind), and builds one mutant per single deletion:

  * each word of each alternation group, alone (arm 1 or arm 3), and from both
    line-start arms together (the reviewer's section 3H mutants);
  * each character of each separator class and each end-of-input alternative;
  * each anchor, each whole arm, and the case-insensitive flag.

For every mutant it records (a) a differential over a generated corpus, run by
regex-differential.mjs on the JavaScript engine: how many strings flip, in which
direction, with the shortest witnesses; (b) the result of the two gate test files
with the mutant in place: how many tests ran, which failed, and each failing
test's first error line. A mutant that flips no corpus string is reported as
equivalent on the corpus; it is not counted as a survivor. The file is restored
byte for byte after every mutant, and the record states the commit, the tracked
tree's cleanliness before and after, and the sha256 of every subject file.
Nothing is hard-coded to a worktree path.
"""
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RULE_FILE = 'packages/three-surface-poc-core/src/act-fields.ts'
TEST_FILES = [
    'packages/three-surface-poc-core/src/body-read-authority.test.ts',
    'packages/three-surface-poc-core/src/walkthrough-judgment.test.ts',
]

W1 = ['agent', 'bot', 'machine', 'service', 'system', 'ci', 'pipeline', 'model']
W2 = ['claude', 'codex', 'gpt', 'copilot', 'llm']
W3 = ['agent', 'bot', 'ci', 'system', 'daemon', 'service', 'pipeline', 'automation', 'model', 'claude', 'syzygy']
W4 = [r'\[bot\]', '-bot', '-agent']
C1 = [':', r'\s', '-']
C3 = [r'\s', ':', '/', '-']
BASE = dict(w1=W1, w2=W2, w3=W3, w4=W4, c1=C1, e1=True, c3=C3, e3=True, a1=True, a3=True, b2l=True, b2t=True, a4=True, drop=(), flag='i')


def build(p: dict) -> tuple[str, str]:
    arms = []
    if 1 not in p['drop']:
        sep = '[' + ''.join(p['c1']) + ']' + ('|$' if p['e1'] else '')
        arms.append(('^' if p['a1'] else '') + '(' + '|'.join(p['w1']) + ')(' + sep + ')')
    if 2 not in p['drop']:
        arms.append(('\\b' if p['b2l'] else '') + '(' + '|'.join(p['w2']) + ')' + ('\\b' if p['b2t'] else ''))
    if 3 not in p['drop']:
        sep = '[' + ''.join(p['c3']) + ']' + ('|$' if p['e3'] else '')
        arms.append(('^' if p['a3'] else '') + '(?:' + '|'.join(p['w3']) + ')(?:' + sep + ')')
    if 4 not in p['drop']:
        arms.append('(?:' + '|'.join(p['w4']) + ')' + ('$' if p['a4'] else ''))
    return '|'.join(arms), p['flag']


def variant(**changes) -> dict:
    return {**BASE, **changes}


def mutants() -> list[tuple[str, str, str, dict]]:
    """(id, class, description, parameters)"""
    out = []
    shared = [w for w in W1 if w in W3]
    for w in shared:
        out.append((f'both-arms-drop-{w}', 'section-3H', f'{w} deleted from both line-start arms', variant(w1=[x for x in W1 if x != w], w3=[x for x in W3 if x != w])))
    out.append(('arm1-sep-drop-colon', 'section-3H', 'the colon deleted from the first arm\'s separator class', variant(c1=[c for c in C1 if c != ':'])))
    for w in W1:
        out.append((f'arm1-drop-{w}', 'single-arm-word', f'{w} deleted from the first line-start arm only', variant(w1=[x for x in W1 if x != w])))
    for w in W3:
        out.append((f'arm3-drop-{w}', 'single-arm-word', f'{w} deleted from the second line-start arm only', variant(w3=[x for x in W3 if x != w])))
    for w in W2:
        out.append((f'arm2-drop-{w}', 'model-name-word', f'{w} deleted from the model-name arm', variant(w2=[x for x in W2 if x != w])))
    for w in W4:
        out.append((f'arm4-drop-{w}', 'suffix-form', f'the suffix {w} deleted', variant(w4=[x for x in W4 if x != w])))
    for c in C1:
        if c != ':':
            out.append((f'arm1-sep-drop-{c}', 'separator', f'{c} deleted from the first arm\'s separator class', variant(c1=[x for x in C1 if x != c])))
    out.append(('arm1-sep-drop-end', 'separator', 'end of input deleted from the first arm\'s separator', variant(e1=False)))
    for c in C3:
        out.append((f'arm3-sep-drop-{c}', 'separator', f'{c} deleted from the second arm\'s separator class', variant(c3=[x for x in C3 if x != c])))
    out.append(('arm3-sep-drop-end', 'separator', 'end of input deleted from the second arm\'s separator', variant(e3=False)))
    out.append(('anchor-arm1-start', 'anchor', 'the start anchor of the first arm deleted', variant(a1=False)))
    out.append(('anchor-arm3-start', 'anchor', 'the start anchor of the second arm deleted', variant(a3=False)))
    out.append(('anchor-arm2-leading-boundary', 'anchor', 'the leading word boundary of the model-name arm deleted', variant(b2l=False)))
    out.append(('anchor-arm2-trailing-boundary', 'anchor', 'the trailing word boundary of the model-name arm deleted', variant(b2t=False)))
    out.append(('anchor-arm4-end', 'anchor', 'the end anchor of the suffix arm deleted', variant(a4=False)))
    for n, label in ((1, 'first line-start arm'), (2, 'model-name arm'), (3, 'second line-start arm'), (4, 'suffix arm')):
        out.append((f'drop-arm-{n}', 'whole-arm', f'the {label} deleted', variant(drop=(n,))))
    out.append(('flag-case-insensitive', 'flag', 'the case-insensitive flag deleted', variant(flag='')))
    return out


# Single deletions that cannot change what the rule accepts, with the argument.
# A mutant with no corpus flip and no entry here is reported separately.
EQUIVALENCE_ARGUMENTS = {
    **{f'arm1-drop-{w}': f'the second line-start arm lists {w} with the same start anchor and a separator class (whitespace, colon, slash, hyphen, end) that contains every separator of the first arm, so it matches whatever the first arm\'s {w} matched'
       for w in ('agent', 'bot', 'service', 'system', 'ci', 'pipeline', 'model')},
    'arm3-drop-claude': 'the model-name arm matches claude as a word; the second arm\'s claude needs a start anchor and then a separator or end, all non-word, so a word boundary holds on both sides and the model-name arm matches too',
}


def corpus() -> list[str]:
    words = sorted(set(re.sub(r'\\', '', w) for w in W1 + W2 + W3 + ['bot', 'agent'])) + ['claudette', 'botha', 'agentha', 'anna', 'jean', 'smith', 'renovate', 'deploy', 'review', 'nightly', 'build', 'x', 'release']
    pres = ['', 'Anna ', 'x-', 'x/', 'x:', 'an ', 'x', 'Anna']
    sufs = ['', ':', ': x', ' x', '-x', '-', '-7', '/', '/x', '_x', '.x', ' ', 'ha', '[bot]', '-bot', '-agent', ' Claude Code', ' build-42']
    out = set()
    for w in words:
        for cased in (w, w.upper(), w.title()):
            for pre in pres:
                for suf in sufs:
                    out.add(pre + cased + suf)
    for s in ('renovate[bot]', 'deploy-bot', 'review-agent', 'Somebody Else', 'Claudette', 'Botha', 'Agentha Smith', 'Anna Model', 'Anna Daemon', 'Jean-Botha', 'agent: Claude Code', 'GitHub Copilot', 'an llm', 'gpt-5', 'ci/release', 'automation: nightly'):
        out.add(s)
    return sorted(out)


def load_rule(original: str) -> tuple[str, str, str]:
    """(body, flag, literal) of the rule in the file text; stops unless it is the four arms spelled above."""
    match = re.search(r'export const NON_HUMAN_PRINCIPAL =\s*/(.*)/([a-z]*);', original)
    if not match:
        raise SystemExit('NON_HUMAN_PRINCIPAL literal not found')
    body, flag = match.group(1), match.group(2)
    if (body, flag) != build(BASE):
        raise SystemExit(f'the rule is not the four arms this script mutates:\n  file    /{body}/{flag}\n  script  /{build(BASE)[0]}/{build(BASE)[1]}')
    literal = f'/{body}/{flag}'
    if original.count(literal) != 1:
        raise SystemExit('the regex literal does not occur exactly once in the rule file')
    return body, flag, literal


def require_changed(mid: str, literal: str, new_literal: str) -> None:
    if new_literal == literal:
        raise SystemExit(f'{mid}: the mutant leaves the rule unchanged')


def require_same_total(mid: str, observed_total: int, baseline_total: int) -> None:
    if observed_total != baseline_total:
        raise SystemExit(f'{mid}: {observed_total} tests ran against a baseline of {baseline_total}; the mutant broke test collection, so its result says nothing')


def require_restored(mid: str, current_digest: str, original_digest: str) -> None:
    if current_digest != original_digest:
        raise SystemExit(f'{mid}: the rule file is not byte-identical to the original after the restore')


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_tests(tree: Path) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / 'result.json'
        subprocess.run(['npx', 'vitest', 'run', *TEST_FILES, '--reporter=json', f'--outputFile={out}'], cwd=tree, capture_output=True, text=True)
        data = json.loads(out.read_text(encoding='utf-8'))
    failing = []
    for file_result in data['testResults']:
        for test in file_result['assertionResults']:
            if test['status'] == 'failed':
                message = (test.get('failureMessages') or [''])[0]
                failing.append({'test': f"{Path(file_result['name']).name} > {test['fullName']}", 'firstErrorLine': message.strip().splitlines()[0] if message.strip() else ''})
    return {'total': data['numTotalTests'], 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'failing': failing}


def git(tree: Path, *args: str) -> str:
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    tree, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    rule = tree / RULE_FILE
    original_bytes = rule.read_bytes()
    original = original_bytes.decode('utf-8')
    body, flag, literal = load_rule(original)

    specs = mutants()
    sources = [(mid, build(p)) for mid, _, _, p in specs]
    strings = corpus()
    diff_input = {'flags': flag, 'original': body, 'corpus': strings, 'mutants': [{'id': mid, 'source': src} for mid, (src, _) in sources if mid != 'flag-case-insensitive']}
    helper = Path(__file__).resolve().parent / 'regex-differential.mjs'
    diff_result = json.loads(subprocess.run(['node', str(helper)], input=json.dumps(diff_input), capture_output=True, text=True, check=True).stdout)
    diff_by_id = {m['id']: m for m in diff_result['mutants']}
    if '--differential-only' in sys.argv:
        # Planning aid: which single deletions change what the rule accepts, with a shortest witness each.
        for mid, d in diff_by_id.items():
            print(f"{mid}: valid={d['valid']} narrower={d.get('narrower')} broader={d.get('broader')} witnesses={d.get('narrowerWitnesses', [])[:3]}")
        return 0

    dirty_before = git(tree, 'status', '--porcelain', '--untracked-files=no').splitlines()
    record = {
        'subject': 'NON_HUMAN_PRINCIPAL (act-fields.ts), single-deletion mutants against body-read-authority.test.ts and walkthrough-judgment.test.ts',
        'commit': git(tree, 'rev-parse', 'HEAD'),
        'trackedTreeDirtyBefore': dirty_before,
        'subjectDigests': {RULE_FILE: sha(rule), **{f: sha(tree / f) for f in TEST_FILES}},
        'harnessDigests': {'mutate_non_human_principal.py': sha(Path(__file__).resolve()), 'regex-differential.mjs': sha(helper)},
        'testFiles': TEST_FILES,
        'rule': {'literal': literal, 'arms': 4},
        'corpus': {'strings': len(strings), 'originalMatches': diff_result['originalMatches']},
    }
    record['baseline'] = run_tests(tree)
    print(f"baseline: {record['baseline']['total']} tests, {record['baseline']['failed']} failed", flush=True)
    records = []
    try:
        for (mid, klass, description, params), (_, (src, new_flag)) in zip(specs, sources):
            new_literal = f'/{src}/{new_flag}'
            if mid != 'flag-case-insensitive' and not diff_by_id[mid].get('valid'):
                raise SystemExit(f'{mid}: the mutated regular expression does not compile; fix the mutant, not the rule')
            require_changed(mid, literal, new_literal)
            rule.write_text(original.replace(literal, new_literal), encoding='utf-8')
            tests = run_tests(tree)
            rule.write_bytes(original_bytes)
            require_restored(mid, sha(rule), record['subjectDigests'][RULE_FILE])
            require_same_total(mid, tests['total'], record['baseline']['total'])
            if mid == 'flag-case-insensitive':
                # The flag mutant changes the flags, not the source: evaluate it on its own.
                differential = {'valid': True, **_count_flag_flips(body, strings)}
            else:
                d = diff_by_id.get(mid, {'valid': False, 'error': 'invalid regular expression'})
                differential = {k: d[k] for k in d if k != 'id'}
            flips = (differential.get('narrower', 0) or 0) + (differential.get('broader', 0) or 0)
            records.append({
                'id': mid,
                'class': klass,
                'description': description,
                'fragments': [{'old': literal, 'new': new_literal}],
                'differentialOverCorpus': differential,
                'observed': {'total': tests['total'], 'passed': tests['passed'], 'failed': tests['failed']},
                'failing': tests['failing'],
                'killed': tests['failed'] > 0,
                'equivalentOnCorpus': flips == 0,
                'equivalenceArgument': EQUIVALENCE_ARGUMENTS.get(mid) if flips == 0 else None,
                'restored': sha(rule) == record['subjectDigests'][RULE_FILE],
            })
            print(f"{mid}: killed={tests['failed'] > 0} failing={tests['failed']} flips={flips}", flush=True)
    finally:
        rule.write_bytes(original_bytes)
    record['trackedTreeDirtyAfter'] = git(tree, 'status', '--porcelain', '--untracked-files=no').splitlines()
    record['mutants'] = records
    survivors = [r for r in records if not r['killed']]
    record['summary'] = {
        'planned': len(records),
        'killed': sum(r['killed'] for r in records),
        'survivors': len(survivors),
        'survivorsEquivalentWithArgument': [r['id'] for r in survivors if r['equivalentOnCorpus'] and r['equivalenceArgument']],
        'survivorsEquivalentOnCorpusWithoutArgument': [r['id'] for r in survivors if r['equivalentOnCorpus'] and not r['equivalenceArgument']],
        'survivorsWithCorpusWitness': [r['id'] for r in survivors if not r['equivalentOnCorpus']],
        'section3HKilled': f"{sum(r['killed'] for r in records if r['class'] == 'section-3H')} of {sum(1 for r in records if r['class'] == 'section-3H')}",
        'allRestored': all(r['restored'] for r in records),
    }
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(record['summary']), flush=True)
    return 0


def selftest() -> int:
    """Each predicate passes its unmutated input and refuses its mutated one. Prints a JSON record."""
    literal = '/' + build(BASE)[0] + '/' + build(BASE)[1]
    good = f'export const NON_HUMAN_PRINCIPAL =\n  {literal};\n'
    arms = build(BASE)[0]

    def refuses(call) -> bool:
        try:
            call()
        except SystemExit:
            return True
        return False

    cases = [
        # (predicate, description of the mutation, old, new, unmutated call, mutated call)
        ('load_rule', 'the rule has a fifth word in the model-name arm', 'llm', 'llm|gemini',
         lambda: load_rule(good), lambda: load_rule(good.replace('llm', 'llm|gemini'))),
        ('load_rule', 'the rule loses its end anchor on the suffix arm', '|(?:\\[bot\\]|-bot|-agent)$', '|(?:\\[bot\\]|-bot|-agent)',
         lambda: load_rule(good), lambda: load_rule(good.replace('-agent)$', '-agent)'))),
        ('load_rule', 'the rule literal is missing', 'export const NON_HUMAN_PRINCIPAL', 'export const OTHER',
         lambda: load_rule(good), lambda: load_rule(good.replace('NON_HUMAN_PRINCIPAL', 'OTHER'))),
        ('load_rule', 'the rule literal occurs twice', 'one literal', 'two literals',
         lambda: load_rule(good), lambda: load_rule(good + literal)),
        ('require_changed', 'a mutant whose literal equals the original', 'new_literal != literal', 'new_literal == literal',
         lambda: require_changed('m', 'a', 'b'), lambda: require_changed('m', 'a', 'a')),
        ('require_same_total', 'a mutant that ran fewer tests than the baseline', 'total 463', 'total 0',
         lambda: require_same_total('m', 463, 463), lambda: require_same_total('m', 0, 463)),
        ('require_same_total', 'a mutant that ran more tests than the baseline', 'total 463', 'total 464',
         lambda: require_same_total('m', 463, 463), lambda: require_same_total('m', 464, 463)),
        ('require_restored', 'a rule file whose digest differs after the restore', 'digest d1', 'digest d2',
         lambda: require_restored('m', 'd1', 'd1'), lambda: require_restored('m', 'd2', 'd1')),
    ]
    results = []
    for predicate, description, old, new, ok_call, bad_call in cases:
        results.append({'predicate': predicate, 'mutation': description, 'old': old, 'new': new,
                        'unmutatedPasses': not refuses(ok_call), 'mutatedRefused': refuses(bad_call)})
    # A real file: the restore predicate on bytes written and then altered on disk.
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'act-fields.ts'
        f.write_text(good, encoding='utf-8')
        d = sha(f)
        f.write_text(good + '\n', encoding='utf-8')
        results.append({'predicate': 'require_restored', 'mutation': 'the file on disk gains a trailing newline', 'old': 'bytes as written', 'new': 'bytes plus one newline',
                        'unmutatedPasses': not refuses(lambda: require_restored('m', d, d)), 'mutatedRefused': refuses(lambda: require_restored('m', sha(f), d))})
    record = {'subject': 'mutate_non_human_principal.py --selftest', 'harnessDigest': sha(Path(__file__).resolve()),
              'ruleArms': arms, 'cases': results, 'allRefused': all(r['unmutatedPasses'] and r['mutatedRefused'] for r in results)}
    print(json.dumps(record, indent=1))
    return 0 if record['allRefused'] else 1


def _count_flag_flips(body: str, strings: list[str]) -> dict:
    """The flag mutant: the same source evaluated without the i flag against the i original."""
    script = (
        "import {readFileSync} from 'node:fs';const i=JSON.parse(readFileSync(0,'utf8'));"
        "const o=new RegExp(i.body,'i'),m=new RegExp(i.body,'');const n=[];for(const s of i.corpus){if(o.test(s)&&!m.test(s))n.push(s);}"
        "n.sort((a,b)=>a.length-b.length||(a<b?-1:1));console.log(JSON.stringify({narrower:n.length,broader:0,narrowerWitnesses:n.slice(0,5),broaderWitnesses:[]}));"
    )
    res = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps({'body': body, 'corpus': strings}), capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


if __name__ == '__main__':
    sys.exit(main())
