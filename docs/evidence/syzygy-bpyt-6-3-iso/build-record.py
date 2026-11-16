#!/usr/bin/env python3
"""Builds dc4-object-and-iso-helpers-2026-10-28.json, the record of syzygy-bpyt.6.3 stack 4, from the outputs beside it.
Every digest and total is computed; the decision table is the only hand-written part and is checked against the census.

Usage: build-record.py <git repo> <base commit> <code commit> <evidence dir> <repair commit> <reviewed commit> <merge commit> <allow-list commit> <SM4 commit>
                       <round-2 repair commit> <round-2 reviewed head>
The code commit is the one the census, differential and equivalence results are about; the repair commit is the one that answers round 1
of the review (R-GP-IMPL-OBJECT-ISO-HELPERS-1) and is the commit the mutants, tests, typecheck and digest sweep of the repair ran at; the
reviewed commit is the head that review was made over. After #545 merged, three commits follow the evidence of the repair: the merge of main (merge commit), the
allow-list names of the support purity test (allow-list commit) and the self-test case that kills SM4 (SM4 commit, the commit the equivalence mutants ran at). The round-2 repair commit (R-GP-IMPL-OBJECT-ISO-HELPERS-2) is the commit the test
delta and the run summary were re-measured at; the round-2 reviewed head is the head that review was made over.
Refuses (exit 1) unless the outputs say what the record is about to say: the two census methods agree per file at both commits, every
census row of the object-shape and ISO populations has a decision, the differential groups are the ones the decisions rest on, every
non-equivalent mutant is killed, both digest-citer methods agree, the equivalence check names only the declared exceptions, every
test of the head runs passed, and the repair touched only the files it says.
"""
import hashlib
import json
import os
import subprocess
import sys

repo, base_arg, code_arg, evidence, repair_arg, reviewed_arg, merge_arg, allow_arg, sm4_arg, repair2_arg, reviewed2_arg = sys.argv[1:]
REGISTRY_BOUND = 'packages/polaris-dossier/src/git-object-reader.ts'
# The reviewer's strict file (R-GP-IMPL-OBJECT-ISO-HELPERS-1 raw, F1 fix, rev-548/tools/site-equivalence-strict.mjs), as the coordinator's repair list states it.
# It is the tool at the repair commit; the SM4 commit adds one self-test case to it, so the tool is no longer these bytes.
REVIEWER_STRICT_TOOL_SHA256 = 'fbcee6fc821dfb35f7461f0fa5cbab4eb7e828d9eef1d866cd48b8db51adb942'
REVIEW_RAW_SHA256 = '157563c5e445b201d56c49ead8685d4dd0fbec3c2a80a1b215e358f5fcff56df'
REVIEW_RAW2_SHA256 = '2693097ed4d5929d979d03944c39b45bba471e815dac034430727b505554590c'
REPAIR_PRODUCTION_FILES = sorted([
    'AGENTS.md', 'packages/polaris-dossier/src/screen.test.ts', 'packages/polaris-generation-core/src/secret-redaction.test.ts',
    'packages/support/src/is-record.ts', 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts',
])
SURFACE_VALUES = ['polaris@b3384e7662f1', 'polaris@64c4c7a6ef72', 'b3384e7662f1', '64c4c7a6ef72']


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(name):
    return json.load(open(os.path.join(evidence, name), encoding='utf8'))


def file_sha(name):
    return sha(open(os.path.join(evidence, name), 'rb').read())


def full(ref):
    return git('rev-parse', ref).decode().strip()


base = git('rev-parse', base_arg).decode().strip()
code = git('rev-parse', code_arg).decode().strip()
repair = git('rev-parse', repair_arg).decode().strip()
reviewed = git('rev-parse', reviewed_arg).decode().strip()
merge = git('rev-parse', merge_arg).decode().strip()
allow = git('rev-parse', allow_arg).decode().strip()
sm4 = git('rev-parse', sm4_arg).decode().strip()
repair2 = git('rev-parse', repair2_arg).decode().strip()
reviewed2 = git('rev-parse', reviewed2_arg).decode().strip()
problems = []

census_b, census_h = load('census-base.json'), load('census-head.json')
grep_b, grep_h = load('census-grep-base.json'), load('census-grep-head.json')
diff = load('differential-base.json')
dates = load('date-probe-base.json')
equiv = load('site-equivalence.json')
mut_s, mut_i, mut_c, mut_n = load('mutants-S.json'), load('mutants-I.json'), load('mutants-C.json'), load('mutants-N.json')
se_mut = load('site-equivalence-mutants.json')
se_selftest = open(os.path.join(evidence, 'site-equivalence-selftest-output.txt'), encoding='utf8').read()
citers_repair = load('digest-citers-repair.json')
citers = load('digest-citers.json')
citersR2 = load('digest-citers-repair2.json')
tests = load('test-delta.json')
runs = load('test-runs-summary.json')

for label, c, g in (('base', census_b, grep_b), ('head', census_h, grep_h)):
    if not g['namedEqualPerFile'] or g['namedMethodOne'] != g['namedMethodTwo']:
        problems.append(f'census methods disagree at {label}')
    if c['summary']['commit'] != (base if label == 'base' else code):
        problems.append(f'census {label} is of another commit')

# ---- the decision table, keyed file:line at the base commit
MERGED = 'merged into @syzygy/support isRecord'
SUPPORT_MERGED = {
    'packages/polaris-dossier/src/check.ts:194': 3, 'packages/polaris-dossier/src/close.ts:86': 3, 'packages/polaris-dossier/src/design-review.ts:28': 3,
    'packages/polaris-dossier/src/execution-flags.ts:43': 3, 'packages/polaris-dossier/src/inventory.ts:77': 3, 'packages/polaris-dossier/src/render.ts:121': 3,
    'packages/polaris-dossier/src/review.ts:61': 3, 'packages/polaris-dossier/src/run-record.ts:136': 3, 'packages/polaris-dossier/src/screen.ts:73': 4,
    'packages/polaris-dossier/src/session-statement.ts:31': 3, 'packages/polaris-dossier/src/waiting-sessions.ts:71': 3,
    'packages/polaris-generation-core/src/discovery.ts:219': 3, 'packages/polaris-generation-core/src/dossier-evaluation.ts:50': 3,
    'packages/polaris-generation-core/src/public-source-classification.ts:56': 4, 'packages/polaris-generation-core/src/reader-questions.ts:22': 3,
    'packages/polaris-generation-core/src/secret-redaction.ts:35': 4, 'packages/three-surface-poc-core/src/authority-artifact-fields.ts:85': 1,
}
KEPT = {
    'packages/polaris-generation-core/src/discovery-provider.ts:66': ('decides differently', 'adds a prototype check ([Object.prototype, null].includes(Object.getPrototypeOf(value))); the differential finds 24 of the 62 values on which it differs from the plain test (discoveryProviderDiffersOn): class instances, Date, Map, boxed primitives, objects with another prototype and cross-realm objects it refuses where the plain test admits, and a proxy with trapping handlers it throws on'),
    'packages/three-surface-poc-core/src/response-identity.ts:131': ('type contract', 'the caller deletes keys from the narrowed value (three sites), which Readonly<Record<string, unknown>> forbids: tsc TS2542 at response-identity.ts 155, 158 and 191 (typecheck-all-20-sites-attempt.log); the decision is identical'),
    'apps/three-surface-poc/src/block-provenance-sweep.test.ts:40': ('type contract', 'narrows Json | undefined to the test\'s own Obj; the support guard narrows to Readonly<Record<string, unknown>> and the typed reads that follow fail (TS2345, TS18047, TS2339 in the attempt log); the decision is identical'),
    'apps/three-surface-poc/src/governing-intent-sweep.test.ts:39': ('type contract', 'the same narrowing as block-provenance-sweep.test.ts'),
    'packages/cap1-core/src/declaration.ts:72': ('package boundary', 'a cap1 package; cap1 packages never import @syzygy/support (cap1-system is an independent oracle); named isPlainObject, outside the three names in the bead; the decision is identical'),
    'packages/cap1-daemon/src/consent-loading.ts:124': ('package boundary', 'a cap1 package, as above'),
    'packages/three-surface-poc-core/src/body-read-authority.test.ts:189': ('test oracle', 'a boolean-returning helper named isPlainObject inside an authority test; outside the three names; left so the test does not share a helper with the code it checks; the decision is identical'),
    'scripts/redis_screening_remeasure.mjs:326': ('outside the workspace packages', 'a plain-JavaScript measurement script under scripts/, outside packages/ and apps/; the decision is identical'),
    'apps/three-surface-poc/src/polaris-generation/public-source-screening.ts:167': ('not an object-shape predicate', 'an id extractor that returns a list; the census found it by its typeof test'),
    'packages/polaris-dossier/src/draft-schema.test.ts:94': ('not an object-shape predicate', 'a recursive reference collector that returns a list'),
    'scripts/differential_line_slot.mjs:73': ('not the same predicate', 'duck-types an object that has fields() and render() functions'),
}
ISO_FILES = ['brief', 'check', 'close', 'inventory', 'review', 'session-handover', 'waiting-sessions']

rows = census_b['rows']
table, seen = [], set()
for r in rows:
    key = f"{r['file']}:{r['line']}"
    if 'shape' in r['kinds'] or (r['name'] == 'isoOf') or (r['name'] == 'isIsoDate'):
        if r['name'] == 'isoOf':
            decision, reason, klass = 'merged into packages/polaris-dossier/src/iso-of.ts', 'seven textually identical copies; @syzygy/support cannot hold it (the purity guard forbids the Date constructor)', 3
        elif r['name'] == 'isIsoDate':
            decision, reason, klass = 'kept', 'one definition, a validator and not a copy of isoOf; it accepts impossible calendar dates (see dateFinding); a change would change what a gate accepts', 1
        elif key in SUPPORT_MERGED:
            decision, reason, klass = MERGED, 'decides identically (differential group); types compile', SUPPORT_MERGED[key]
        elif key in KEPT:
            decision, reason, klass = 'kept', KEPT[key][0] + ': ' + KEPT[key][1], None
        else:
            problems.append(f'no decision for {key}')
            continue
        seen.add(key)
        table.append({'at': key, 'name': r['name'], 'exactTextSha256': r['exactSha256'], 'decision': decision, 'reason': reason, 'ccRev1Class': klass})
missing = (set(SUPPORT_MERGED) | set(KEPT)) - seen
if missing:
    problems.append('a decision names a row the census does not have: ' + ', '.join(sorted(missing)))

merged = [t for t in table if t['decision'] == MERGED]
if len(merged) != 17:
    problems.append(f'{len(merged)} merged, expected 17')
iso = [t for t in table if t['name'] == 'isoOf']
if len(iso) != 7 or sorted(os.path.basename(t['at'].split(':')[0])[:-3] for t in iso) != sorted(ISO_FILES):
    problems.append('isoOf rows are not the seven expected files')

# ---- the differential: the groups the decisions rest on
obj = diff['object']
group_of = {m: g for g in obj['groups'] for m in g['members']}
plain_group = max(obj['groups'], key=lambda g: len(g['members']))
for t in table:
    if t['decision'] == MERGED:
        member = f"{t['at']} {t['name']}"
        if group_of.get(member) is not plain_group:
            problems.append(f'merged row outside the plain group: {member}')
if len(plain_group['members']) != 24 or not plain_group['booleanOnly']:
    problems.append('the plain group is not 24 boolean-only functions')
provider = [g for g in obj['groups'] if any('discovery-provider' in m for m in g['members'])][0]
if provider is plain_group or len(provider['members']) != 1:
    problems.append('discovery-provider is not alone')
if len(diff['isoOf']['groups']) != 1 or len(diff['isoOf']['groups'][0]['members']) != 7:
    problems.append('isoOf copies do not form one group of seven')
dv = {g['members'][0].split(' ')[-1]: g for g in diff['dateValidators']['groups']}
if len(diff['dateValidators']['groups']) != 3:
    problems.append('the date validators are not three distinct groups')
provider_only = [obj['corpusLabels'][i] for i, (a, b) in enumerate(zip(plain_group['outcomes'], provider['outcomes'])) if a != b]

# ---- date finding
date_only = dates['pairs']['dateOnly']
disagree_dates = sorted(k for k, v in date_only.items() if len(set(v.values())) > 1)
if disagree_dates != ['"1900-02-29"', '"2026-02-29"', '"2026-02-30"', '"2026-02-31"', '"2026-04-31"']:
    problems.append(f'date-only disagreements are not the five expected: {disagree_dates}')

# ---- equivalence
if equiv['notEqual'] != sorted(['packages/polaris-dossier/src/iso-of.ts', 'packages/support/src/index.ts', 'packages/support/src/is-record.ts']):
    problems.append('equivalence exceptions are not the declared three: ' + ', '.join(equiv['notEqual']))
if equiv['equal'] != 19 or equiv['modified'] != 20:
    problems.append('the equivalence counts are not 19 of 20 modified')
if (equiv['base'], equiv['head']) != (base, code):
    problems.append('site-equivalence.json is of another pair of commits')
TOOL_PATH = 'docs/evidence/syzygy-bpyt-6-3-iso/site-equivalence.mjs'
tool_at_repair = git('show', f'{repair}:{TOOL_PATH}')
tool_at_sm4 = git('show', f'{sm4}:{TOOL_PATH}')
if sha(tool_at_repair) != REVIEWER_STRICT_TOOL_SHA256:
    problems.append('site-equivalence.mjs at the repair commit is not the reviewer\'s strict file byte for byte')
if file_sha('site-equivalence.mjs') != sha(tool_at_sm4) or sha(tool_at_sm4) == REVIEWER_STRICT_TOOL_SHA256:
    problems.append('site-equivalence.mjs beside the record is not the SM4 commit\'s, or is still the reviewer\'s bytes')
sm4_added = [l for l in __import__('difflib').unified_diff(tool_at_repair.decode().splitlines(), tool_at_sm4.decode().splitlines(), lineterm='', n=0) if l[:1] in '+-' and l[:3] not in ('+++', '---')]
if len(sm4_added) != 5 or any(l[0] != '+' for l in sm4_added):
    problems.append('the SM4 commit does not only add five lines to the tool')
if subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', repair, merge]).returncode != 0:
    problems.append('the repair commit is not an ancestor of the merge commit')
if [full(x + '^') for x in (allow, sm4)] != [merge, allow]:
    problems.append('the allow-list and SM4 commits are not the two commits after the merge, in that order')
if se_selftest != 'site-equivalence selftest ok\n':
    problems.append('the equivalence tool selftest output is not its one ok line')
by_id = {r['id']: r for r in se_mut['rows']}
PAIR = {'modified': 20, 'equal': 19, 'notEqual': 3, 'exit': 1}
pair = se_mut['summary']['pair']
if se_mut['summary']['ranAt'] != sm4 or pair is None or (full(pair['base']), full(pair['head'])) != (base, code):
    problems.append('the equivalence mutants ran at another commit or on another pair')
if not se_mut['summary']['controlsClean'] or by_id['C0-unmutated']['onThePair'] != PAIR or by_id['N0-trailing-comment']['onThePair'] != PAIR:
    problems.append('the equivalence mutant controls are not clean on the pair')
if sorted(se_mut['summary']['killedBySelftest']) != ['SM1-rename-guard-removed', 'SM2-blank-line-filter-restored', 'SM3-definition-removed-without-its-line-end', 'SM4-iso-import-removed-without-its-line-end'] or se_mut['summary']['survivedSelftest'] != [] or se_mut['summary']['killed'] != 4:
    problems.append('the equivalence mutants are not four killed by the selftest')
sm4_row = by_id['SM4-iso-import-removed-without-its-line-end']
if not (sm4_row['killed'] and sm4_row['exit'] != 0 and 'isoOf definition replaced by its import' in sm4_row['firstLine']):
    problems.append('SM4 is not killed by the new self-test case')
if by_id['SM4-iso-import-removed-without-its-line-end']['onThePair']['equal'] == 19 or by_id['SM3-definition-removed-without-its-line-end']['onThePair']['equal'] == 19:
    problems.append('SM3 or SM4 does not change the result on the pair')

# ---- mutants
EQUIVALENT = {
    'C-authority-artifact-fields-L141n4-A': 'typedAuthority is parsed JSON: an array has no own writeSurface, so reading it as an object yields the same missing field as the original branch; the test feeds an array there and the result is identical',
    'C-screen-L81n0-A': 'the policy document is parsed JSON: an array has no policyId, so reading it as an object refuses with the same identity-unreadable text as the original branch',
    'C-screen-L84n2-A': 'source admission is parsed JSON: an array has no deniedPathBasenames, so the next test refuses with the same text',
    'C-screen-L88n3-A': 'the content classification is parsed JSON: an array has no rules, so rules is the empty list either way',
    'C-screen-L89n4-A': 'a rules entry is parsed JSON: an array has no class, so it is passed over either way',
    'C-screen-L90n5-A': 'codeContent[0] is an object or undefined (it comes from the isRecord filter above it); the mutant differs from isRecord only on arrays, which cannot be there',
    'C-screen-L90n5-B': 'the same: the mutant differs from isRecord only on null, which cannot be there',
    'C-screen-L100n6-A': 'a detectors entry is parsed JSON: an array has no string id, so it is passed over either way',
}
EQUIVALENT_N = {
    'N-authority-artifact-fields-L141n4-E': 'the same argument as L141n4 A: typedAuthority is parsed JSON, a primitive has no own writeSurface, and the next read gives the same missing field',
    'N-screen-L81n0-E': 'the policy document is parsed JSON: a primitive has no policyId, so the identity test refuses with the same text',
    'N-screen-L84n2-E': 'source admission is parsed JSON: a primitive has no deniedPathBasenames, so the next test refuses with the same text',
    'N-screen-L88n3-E': 'the content classification is parsed JSON: a primitive has no rules, so rules is the empty list either way',
    'N-screen-L89n4-E': 'a rules entry is parsed JSON: a primitive has no class, so it is passed over either way',
    'N-screen-L100n6-E': 'a detectors entry is parsed JSON: a primitive has no string id, so it is passed over either way',
}
survivors = [m for m in mut_c['mutants'] if not (m['killed'] or m.get('killedByRelated'))]
surv_ids = sorted(m['id'] for m in survivors)
if surv_ids != sorted(EQUIVALENT):
    problems.append(f'survivors are not the explained equivalents: {surv_ids}')
for m in mut_s['mutants'] + mut_i['mutants']:
    if not m['killed']:
        problems.append(f"{m['id']} survived")
for c in mut_s['controls'] + mut_i['controls'] + mut_c['controls'] + mut_n['controls']:
    if not c['passed_clean']:
        problems.append(f"control {c['id']} did not pass clean")
for label, m in (('S', mut_s), ('I', mut_i), ('C', mut_c), ('N', mut_n)):
    if m['commit'] != repair:
        problems.append(f'mutants-{label}.json ran at {m["commit"]}, not at the repair commit')
if len(mut_c['mutants']) != 60:
    problems.append(f"{len(mut_c['mutants'])} call-site mutants, expected 60")
by_n = {m['id']: m for m in mut_n['mutants']}
o8 = by_n.get('N3-O8-function-admitted')
if o8 is None or not o8['killed'] or o8['failed'] != 1 or not o8['failedTests'][0].endswith('refuses a declaration that is a function that carries every field'):
    problems.append('the reviewer\'s O8 is not killed by exactly the new function row')
e_rows = [m for m in mut_n['mutants'] if m['id'].endswith('-E')]
e_survivors = sorted(m['id'] for m in e_rows if not m['killed'])
if e_survivors != sorted(EQUIVALENT_N):
    problems.append(f'the E survivors are not the explained equivalents: {e_survivors}')
number_only = sorted(m['id'] for m in e_rows if m['killed'] and m['failsOnANumberRow'] and not m['failsOnAStringRow'])
if number_only != ['N-authority-artifact-fields-L102n0-E', 'N-authority-artifact-fields-L121n1-E', 'N-authority-artifact-fields-L132n2-E', 'N-screen-L83n1-E']:
    problems.append(f'the sites where only an a-number row kills E are not the four expected: {number_only}')
other_killed = sorted(m['id'] for m in e_rows if m['killed'] and m['id'] not in number_only)
if other_killed != ['N-authority-artifact-fields-L136n3-E', 'N-screen-L90n5-E']:
    problems.append(f'the other killed E rows are not the two expected: {other_killed}')

# ---- citers
if not citers['methodsAgree'] or full(citers['baseCommit']) != base or full(citers['codeHeadCommit']) != code:
    problems.append('digest-citers: methods disagree or another commit')
reg_before = sha(git('show', f'{base}:{REGISTRY_BOUND}'))
reg_after = sha(git('show', f'{code}:{REGISTRY_BOUND}'))
if reg_before != reg_after:
    problems.append('the registry-bound file changed')
head_digests = {d['path']: d['sha256'] for d in citers['digests'] if d['at'] == 'head'}
needles_cited = set(citers['needlesCited'])
cited_base = sorted({d['path'] for d in citers['digests'] if d['at'] == 'base' and ({d['sha256'], d['gitBlob'], d['sha256'][:12], d['gitBlob'][:12]} & needles_cited)})
cited_head = sorted({d['path'] for d in citers['digests'] if d['at'] == 'head' and ({d['sha256'], d['gitBlob'], d['sha256'][:12], d['gitBlob'][:12]} & needles_cited)})

# ---- tests
if not (tests['allBasePassed'] and tests['allHeadPassed']):
    problems.append('a test did not pass')
PIN = 'no route and no credential > sweeps a non-empty population of source files'
if set(tests['changedGeneratedTests']) != {PIN, 'reading the rule > refuses %s'} or tests['removed']:
    problems.append('the changed test calls are not the pinned list and the refusal table, or a test was removed')
if runs['headTestsOnBase']['failed'] != [{'file': 'cli.test.ts', 'name': 'no route and no credential sweeps a non-empty population of source files'}]:
    problems.append('the head tests on base code fail more than the one declared pin')
if runs['head']['failed'] != 0:
    problems.append('the head run has failures')

# ---- the repair: what it touched, and that the one production file it touched emits the same code
if subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', reviewed, repair]).returncode != 0:
    problems.append('the reviewed commit is not an ancestor of the repair commit')
touched = sorted(f for f in git('diff', '--name-only', '-z', reviewed, repair).decode().split('\0') if f and not f.startswith('docs/evidence/'))
if touched != REPAIR_PRODUCTION_FILES:
    problems.append(f'the repair touches {touched}')


def emitted(commit, path):
    script = ("const ts = require('typescript'); const src = require('fs').readFileSync(0, 'utf8');"
              "process.stdout.write(ts.transpileModule(src, { fileName: 'x.ts', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText);")
    return subprocess.run(['node', '-e', script], input=git('show', f'{commit}:{path}'), capture_output=True, check=True, cwd=repo).stdout


is_record_emit_equal = emitted(reviewed, 'packages/support/src/is-record.ts') == emitted(repair, 'packages/support/src/is-record.ts')
if not is_record_emit_equal:
    problems.append('is-record.ts emits other code after the repair')
if not citers_repair['methodsAgree'] or citers_repair['needlesCited'] or full(citers_repair['baseCommit']) != reviewed or full(citers_repair['codeHeadCommit']) != repair:
    problems.append('digest-citers-repair: methods disagree, a digest is cited, or another range')
if sorted(citers_repair['editedFiles']) != REPAIR_PRODUCTION_FILES:
    problems.append('digest-citers-repair swept other files than the repair edits')
if tests['headTests'] != 551 or runs['head']['checkout'] != repair2 or runs['head']['tests'] != 551 or len(tests['added']) != 137:
    problems.append('the test runs are not the 551 tests (+137) of the round-2 repair commit')
if not citersR2['methodsAgree'] or citersR2['needlesCited'] or citersR2['populationCommit'] != repair2 or citersR2['codeHeadCommit'] != repair2 or citersR2['baseCommit'] != reviewed2:
    problems.append('the round-2 digest sweep is of another range, its methods disagree, or a digest is cited')
ROUND2_FILES = ['AGENTS.md', 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts']
touched2 = sorted(f for f in git('diff', '--name-only', '-z', reviewed2, repair2).decode().split('\0') if f and not f.startswith('docs/evidence/'))
if touched2 != ROUND2_FILES:
    problems.append(f'the round-2 repair touches {touched2}')
if subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', reviewed2, repair2]).returncode != 0:
    problems.append('the round-2 reviewed head is not an ancestor of the round-2 repair commit')


def surface_citers(commit):
    files = [f for f in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0') if f]
    one = sorted(f for f, blob in ((f, git('show', f'{commit}:{f}')) for f in files) if any(v.encode() in blob for v in SURFACE_VALUES))
    args = ['git', '-C', repo, 'grep', '-F', '-l'] + [x for v in SURFACE_VALUES for x in ('-e', v)] + [commit]
    two = sorted(line.split(':', 1)[1] for line in subprocess.run(args, capture_output=True, text=True).stdout.splitlines())
    return len(files), one, two


surface_population, surface_one, surface_two = surface_citers(repair)
if surface_one != surface_two:
    problems.append('the surface-version sweep methods disagree')
surface_outside = [f for f in surface_one if not f.startswith('docs/evidence/syzygy-bpyt-6-3-iso/')]
if surface_outside:
    problems.append(f'a tracked file outside the evidence directory carries a surface value: {surface_outside}')

if problems:
    print('refusing:', *problems, sep='\n  ')
    sys.exit(1)

changed_files = git('diff', '--name-only', '-z', base, code).decode().split('\0')
changed_files = [f for f in changed_files if f]
unchanged_support = git('diff', '--stat', '6ab7a12b', code, '--', 'packages/support/src/is-record.ts', 'packages/support/src/is-record.test.ts', 'packages/polaris-dossier/src/iso-of.ts', 'packages/polaris-dossier/src/iso-of.test.ts').decode().strip()

record = {
    'format': 'syzygy-bpyt-6-3-stack-4-record/1',
    'bead': 'syzygy-bpyt.6.3',
    'subject': 'one object-shape predicate in @syzygy/support, one isoOf in polaris-dossier, and the date validators left where they are',
    'baseCommit': base,
    'codeCommit': code,
    'codeCommits': [c for c in git('log', '--format=%H', '--reverse', f'{base}..{code}').decode().split()],
    'epistemic': 'Observed for every count, group and mutant below (computed by the tools beside this file, at the commits named); Inferred where a row says so (a validator rebuilt from its line)',
    'toolDigests': {n: file_sha(n) for n in ['census.mjs', 'census-grep.py', 'differential.mjs', 'date-probe.mjs', 'apply-is-record.mjs', 'apply-iso-of.mjs', 'site-equivalence.mjs', 'site-equivalence-mutants.mjs', 'mutants.py', 'digest-citers.py', 'test-delta.py', 'test-inventory.mjs', 'test-runs-summary.py']},
    'outputDigests': {n: file_sha(n) for n in ['census-base.json', 'census-head.json', 'census-grep-base.json', 'census-grep-head.json', 'differential-base.json', 'date-probe-base.json', 'site-equivalence.json', 'site-equivalence-selftest-output.txt', 'site-equivalence-mutants.json', 'mutants-S.json', 'mutants-I.json', 'mutants-C.json', 'mutants-N.json', 'digest-citers.json', 'digest-citers-repair.json', 'test-delta.json', 'test-runs-summary.json', 'typecheck-all-20-sites-attempt.log', 'typecheck-head.log', 'typecheck-repair.log']},
    'census': {
        'method': 'one: TypeScript syntax tree over every tracked .ts/.mjs/.cjs file of packages/, apps/ and scripts/ read from the commit; two: git grep -E over the same paths, reconciled per file',
        'population': {'base': census_b['summary']['population'], 'head': census_h['summary']['population']},
        'named': {'base': census_b['summary']['named'], 'head': census_h['summary']['named']},
        'namedTotal': {'base': census_b['summary']['namedTotal'], 'head': census_h['summary']['namedTotal']},
        'objectPredicatesUnderPackagesAndApps': {'base': sum(1 for r in rows if 'named' in r['kinds'] and r['name'] in ('isObj', 'isObject', 'isRecord') and not r['file'].startswith('scripts/')), 'baseNote': 'isObj 12 + isObject 6 + isRecord 4 = 22 definitions, 21 under packages/ and apps/ (one is a script)'},
        'shapeTestingFunctions': {'base': census_b['summary']['shape'], 'head': census_h['summary']['shape']},
        'shapeUnderOtherNames': census_b['summary']['shapeUnderOtherNames'],
        'methodsAgreePerFile': {'base': grep_b['namedEqualPerFile'], 'head': grep_h['namedEqualPerFile']},
        'inlineObjectTestsNotInAnyFunction': {'base': len(grep_b['shapeRemainders']), 'head': len(grep_h['shapeRemainders']), 'note': 'lines that test typeof x === \'object\' inline, inside a larger function; listed in census-grep-base.json; not helpers and not in scope'},
        'beadPremise': 'The bead names eight files for isIsoDate/isoOf. There are seven isoOf copies (polaris-dossier) and exactly one isIsoDate (act-fields.ts), which validates a date and is not a copy of isoOf.',
    },
    'decisions': table,
    'differential': {
        'object': {'corpusSize': obj['corpusSize'], 'functions': obj['functions'], 'groups': [{'signatureSha256': g['signatureSha256'], 'members': len(g['members']), 'booleanOnly': g['booleanOnly']} for g in obj['groups']],
                   'plainGroupMembers': plain_group['members'], 'discoveryProviderDiffersOn': provider_only},
        'isoOf': {'corpusSize': diff['isoOf']['corpusSize'], 'functions': diff['isoOf']['functions'], 'groups': len(diff['isoOf']['groups'])},
        'dateValidators': {'corpusSize': diff['dateValidators']['corpusSize'], 'functions': diff['dateValidators']['functions'], 'groups': len(diff['dateValidators']['groups'])},
    },
    'dateFinding': {
        'epistemic': 'Observed for isIsoDate (its exact text, run); Inferred for the consent reader\'s line (rebuilt from its exact text, not run in place)',
        'claim': 'act-fields isIsoDate accepts calendar dates that do not exist, because it checks the shape and then asks Date.parse, which V8 answers for them; the consent package reader refuses the same strings by a round trip through toISOString. The two authorities decide differently on these date-only strings.',
        'strings': disagree_dates,
        'validators': dates['validators'],
        'acceptedBy': 'isIsoDate: T on each of the five; consent reader day (line 706): F on each',
        'reach': 'isIsoDate is the date test of the act-instant and expires checks in body-read-authority.ts and walkthrough-judgment.ts (class 1). Not changed here: tightening it changes what a gate accepts, an owner decision (GP-Q0).',
        'otherValidatorsKeptApart': 'the instant validators (project-shape-observation, dossier check, dossier run-record, package-reader) each accept a different language (offsets, fractional seconds, millisecond form, whole seconds); date-probe-base.json lists the corpus rows where they disagree',
    },
    'typecheck': {
        'attempt': 'with all 20 in-scope sites merged tsc failed in the three files kept local (8 errors); typecheck-all-20-sites-attempt.log',
        'head': 'npm run typecheck exit 0 at the code commit; typecheck-head.log',
        'repair': 'npm run typecheck exit 0 at the repair commit; typecheck-repair.log',
    },
    'equivalence': {'tool': 'site-equivalence.mjs', 'changedProductionFiles': equiv['changedSourceFiles'], 'modified': equiv['modified'], 'equalModuloDeclaredEdit': equiv['equal'],
                    'declaredExceptions': equiv['notEqual'], 'exceptionNote': 'the support index (one added export) and the two new modules; test files are listed, not compared',
                    'pair': {'base': base, 'head': code},
                    'toolIsTheReviewersStrictFile': {'sha256': file_sha('site-equivalence.mjs'), 'equalsReviewersFile': False,
                                                     'reviewersSha256': REVIEWER_STRICT_TOOL_SHA256, 'equalAtTheRepairCommit': True,
                                                     'sm4Commit': sm4, 'addedAtTheSm4Commit': 'exactly five lines before the final console.log of selftest(): the isoOf case (a local definition against its import line is equal; a changed isoOf call is not), checked by this script',
                                                     'what': 'the reviewer\'s strict file plus that one case; the reviewer\'s description of the strict file: ' + 'each censused definition and each import line is removed with its own line end, no blank-line filter is applied, and before the rename the tool counts matches of the old names against Identifier nodes in the base emit and refuses a file where an old name occurs elsewhere (RENAME-GUARD)'},
                    'selftest': se_selftest.strip(), 'selftestRanAt': sm4,
                    'rule6': {'ranAt': se_mut['summary']['ranAt'], 'mutants': se_mut['summary']['mutants'], 'killedBySelftest': se_mut['summary']['killedBySelftest'], 'survivedSelftest': se_mut['summary']['survivedSelftest'],
                              'onThePair': {r['id']: r['onThePair'] for r in se_mut['rows']},
                              'reading': 'SM1 (the rename guard removed) and SM2 (the blank-line filter restored) are killed by the selftest and leave the pair at 20 modified, 19 equal [Observed]; the reading is that no string or template literal of the reviewed pair is touched, so the guard and the filter protect and are not active here [Inferred: the review\'s own raw-source check found the same]. SM3 (a definition removed without its line end) is killed and changes the pair to 0 equal. SM4 (the isoOf import removed without its line end) survived the reviewer\'s selftest, which held no isoOf import case, and changes the pair from 19 equal to 12 [Observed at the repair commit]; the SM4 commit adds the case and the selftest now kills it (the first failing line is the new case). The tool is no longer the reviewer\'s bytes.'}},
    'mutants': {
        'support': {'commit': mut_s['commit'], 'mutants': len(mut_s['mutants']), 'killed': sum(m['killed'] for m in mut_s['mutants']), 'controlsClean': all(c['passed_clean'] for c in mut_s['controls'])},
        'iso': {'commit': mut_i['commit'], 'mutants': len(mut_i['mutants']), 'killed': sum(m['killed'] for m in mut_i['mutants']), 'controlsClean': all(c['passed_clean'] for c in mut_i['controls'])},
        'callSites': {'commit': mut_c['commit'], 'mutants': len(mut_c['mutants']), 'killed': len(mut_c['mutants']) - len(survivors), 'survivors': [{'id': m['id'], 'file': m['file'], 'line': m['line'], 'old': m['old'], 'new': m['new'], 'equivalentBecause': EQUIVALENT[m['id']]} for m in survivors],
                      'escalation': 'a mutant that survived the importer\'s direct test files was re-run against vitest related <file>; none of the eight was killed there either',
                      'byImporter': {f: sum(1 for m in mut_c['mutants'] if m['file'] == f) for f in sorted({m['file'] for m in mut_c['mutants']})}},
        'unchangedBetweenSupportRunAndCallSiteRun': unchanged_support == '',
        'note': 'each row of the outputs stores file, line, the exact text replaced, its replacement and the commit; all four outputs (S, I, C, N) ran at the repair commit',
        'repairRows': {
            'commit': mut_n['commit'], 'mutants': len(mut_n['mutants']),
            'o8': {'what': 'the reviewer\'s mutant: a function is admitted at the secret-redaction declaration read', 'file': o8['file'], 'line': o8['line'], 'old': o8['old'], 'new': o8['new'],
                   'killedBy': o8['failedTests'], 'failed': o8['failed'], 'of': o8['total'], 'survivesAtTheReviewedCommit': 'observed by the reviewer (raw, N3): it survives the head and the base tests; the new row is the only test that kills it here'},
            'e': {'what': 'a test written as typeof value !== string: isRecord(x) replaced by (x !== null && typeof x !== string && !Array.isArray(x)), at each call of the two importers whose NOT_OBJECTS tables hold the a-number row',
                  'mutants': len(e_rows), 'killed': sum(m['killed'] for m in e_rows),
                  'killedOnlyByANumberRow': number_only,
                  'killedAlsoForAnotherReason': {m['id']: 'admits undefined (an entry with no subject, a classification with no rules), which breaks the positive cases; the a-string rows fail as collateral' for m in e_rows if m['id'] in other_killed},
                  'survivors': [{'id': m['id'], 'file': m['file'], 'line': m['line'], 'old': m['old'], 'new': m['new'], 'equivalentBecause': EQUIVALENT_N[m['id']]} for m in e_rows if not m['killed']]},
            'reading': 'The a-number row is the only test that fails a string-naming test at 4 of the 12 call sites it was run at (authority-artifact-fields.ts 102, 121, 132 and screen.ts 83). At 2 sites that mutant dies of admitting undefined, and at 6 it is equivalent. None of the lane\'s mutants (A, B and D admit true and a number alike, E admits both) separates a true row from the a-number row; round 2 of the review\'s mutant F, which names string and number and admits a boolean, survives at 102, 121 and 132 without the true row and is killed by it alone, so the true row stays.',
        },
    },
    'digestCitersOfEditedFiles': {
        'population': citers['population'], 'editedFiles': len(citers['editedFiles']), 'needles': citers['needles'], 'methodsAgree': citers['methodsAgree'],
        'filesWhoseBaseDigestOrBlobIsCited': cited_base, 'filesWhoseHeadDigestOrBlobIsCited': cited_head,
        'citers': sorted({c for v in citers['needlesCited'].values() for c in v}),
        'reading': 'every citer is a record of an earlier commit or run (it names its own commit, run or diff); none is a performed act, a manifest row or a script input; the head digests are cited nowhere. The governed-plane citer is a static trace that names its source commit.',
        'registryBoundFile': {'path': REGISTRY_BOUND, 'sha256AtBase': reg_before, 'sha256AtCode': reg_after, 'equal': reg_before == reg_after},
        'repairSweep': {'editedFiles': citers_repair['editedFiles'], 'range': {'from': reviewed, 'to': repair}, 'needles': citers_repair['needles'], 'population': citers_repair['population'], 'methodsAgree': True, 'cited': 0,
                        'note': 'sha256 and git blob id, full and first twelve, of the four .ts files and AGENTS.md the repair edits, at both ends of the range; no tracked file outside the evidence directory cites any'},
    },
    'tests': {'line': f"Tests: +{len(tests['added'])} ~1 -{len(tests['removed'])}", 'toolLine': tests['line'], 'baseTests': tests['baseTests'], 'headTests': tests['headTests'], 'added': len(tests['added']), 'removed': len(tests['removed']),
              'changedCalls': tests['changedCalls'], 'runs': runs, 'measuredAt': repair2,
              'previousMeasurement': {'what': 'the round-1 repair commit, before the true row was restored', 'headTests': 546, 'added': 132, 'headTestsOnBaseTests': 486},
              'reading': 'the changed text is the pinned list of swept source files in cli.test.ts (iso-of.ts joins it); the 45 other generated tests the tool counts as changed are unchanged rows of the public-source-classification refusal table, which gained five rows counted in +',
              'headTestsOnBaseCode': 'the call-site tests and every other test of the head pass on the base code but the one pinned list, which expects the new module'},
    'ccRev1Classes': {
        'statedBy': 'the author; never finally decided by the author',
        '1 authority boundaries': ['packages/three-surface-poc-core/src/authority-artifact-fields.ts (reads the consent, policy and registry artifacts of PWB-REQ-005)'],
        '4 security': ['packages/polaris-generation-core/src/secret-redaction.ts', 'packages/polaris-generation-core/src/public-source-classification.ts', 'packages/polaris-dossier/src/screen.ts'],
        '3 deterministic observation': 'the other thirteen consumers (dossier run records, checks, reviews, rendering; generation discovery, evaluation and reader questions) and the seven isoOf callers, whose text becomes run-record and brief bytes',
        '6 public interface': ['packages/support/src/index.ts: a new export of an internal workspace package (no external API)'],
        'none of': ['2 graph identity', '5 data migration', '7 certificate logic'],
        'reviewerRuling': {'review': 'R-GP-IMPL-OBJECT-ISO-HELPERS-1, section 2', 'claimed': 'classes 1, 3 and 4 touched, as the author claimed; class 6 over-inclusive because packages/support/package.json has "private": true, so no external consumer can depend on the new export (over-claiming only adds review); 2, 5 and 7 not touched'},
    },
    'pocSurfaceVersion': {'base': 'polaris@b3384e7662f1', 'code': 'polaris@64c4c7a6ef72', 'why': 'authority-artifact-fields.ts is in packages/three-surface-poc-core/src, one of the two trees the version addresses; no tracked file outside this evidence directory carries either value',
                          'sweep': {'commit': repair, 'population': surface_population, 'values': SURFACE_VALUES, 'methods': 'one: Python bytes search over every blob; two: git grep -F -l', 'methodsAgree': True, 'carriedBy': surface_one,
                                    'outsideTheEvidenceDirectory': surface_outside},
                          'atTheMerge': 'the version that lands is neither value: it is re-derived at the merge commit by the coordinator (review note N4)'},
    'repair': {
        'review': {'id': 'R-GP-IMPL-OBJECT-ISO-HELPERS-1', 'round': 1, 'verdict': 'REVISE', 'reviewedCommit': reviewed, 'rawSha256': REVIEW_RAW_SHA256,
                   'epistemic': 'the raw is retained by the coordinator, not in this tree'},
        'repairCommit': repair, 'noProductionBehaviourChange': True,
        'changedOutsideEvidence': touched,
        'changedFiles': sorted(f for f in git('diff', '--name-only', '-z', reviewed, repair).decode().split('\0') if f),
        'isRecordEmitsTheSameCode': is_record_emit_equal,
        'items': {
            'F1': 'site-equivalence.mjs was the reviewer\'s strict file byte for byte at the repair commit; its selftest, its rule-6 rows and the regenerated site-equivalence.json are in equivalence (the SM4 commit later added one case: round2)',
            'F2': 'three PR-body sentences replaced with the reviewer\'s text (the PR body; the surface-version sweep is in pocSurfaceVersion)',
            'N1 N2': 'mutants.py: the occurrence note, and a --tmpdir argument or TMPDIR in place of a fixed path',
            'N3': 'a function-that-carries-every-field row in secret-redaction.test.ts; mutants.repairRows.o8',
            'N5': 'AGENTS.md names isRecord and why isoOf stays in polaris-dossier',
            'N8': 'the a-number row is kept in both NOT_OBJECTS tables with a comment naming the bug it catches; the true row of authority-artifact-fields.test.ts, dropped in the round-1 repair, is restored in the round-2 repair (R-GP-IMPL-OBJECT-ISO-HELPERS-2, F1, Fix A): the reviewer\'s mutant F survives at 102, 121 and 132 without it and is killed by it alone; mutants.repairRows.e and repair.round2Review',
            'N10': 'is-record.ts: a revoked proxy of an object or an array throws',
            'N6': 'the PR body Battery section states the lc63s4 result at the reviewed commit, not at the repair head',
            'classes': 'ccRev1Classes.reviewerRuling',
            'notTaken': 'N4, N7 and N9 are the coordinator\'s, by the repair list',
        },
        'followUps': [],
        'round2Review': {
            'review': {'id': 'R-GP-IMPL-OBJECT-ISO-HELPERS-2', 'round': 2, 'verdict': 'REVISE', 'blockingFindings': ['F1'], 'reviewedCommit': reviewed2, 'rawSha256': REVIEW_RAW2_SHA256,
                       'epistemic': 'the raw is retained by the coordinator, not in this tree'},
            'digestSweep': {'output': 'docs/evidence/syzygy-bpyt-6-3-iso/digest-citers-repair2.json', 'range': {'from': reviewed2, 'to': repair2}, 'editedFiles': citersR2['editedFiles'], 'needles': citersR2['needles'], 'population': citersR2['population'], 'methodsAgree': True, 'cited': 0,
                            'note': 'sha256 and git blob id, full and first twelve, of the edited test file and AGENTS.md at both ends of the range; no tracked file outside the evidence directory cites any'},
            'repairCommit': repair2, 'noProductionByteChanged': True, 'changedOutsideEvidence': touched2,
            'F1': 'Fix A: the true row of NOT_OBJECTS in authority-artifact-fields.test.ts is restored with the reviewer\'s three lines, copied by script; the reason given in round 1 (a test refusing a string and a number yet admitting a boolean has to name three types) was false: the reviewer\'s mutant F (names string and number, admits a boolean) survives at authority-artifact-fields.ts 102, 121 and 132 without the row and is killed by it alone [Observed by the review, run 11, not re-run here]. The mutant outputs of this directory ran at the round-1 repair commit; the restored row adds a test and removes none, so a kill there stays a kill [Inferred]',
            'N2': 'AGENTS.md: the support note calls isRecord the shared object test (non-null, not an array; it does not check the prototype); nothing else in AGENTS.md changes',
            'notTaken': 'N1 (two more SM4 selftest cases, eight lines instead of five) is filed by the coordinator as a follow-up: it would change the SM4 bytes that round 2 reviewed',
            'remeasured': {'tests': 'test-delta.json and test-runs-summary.json at ' + repair2 + ': Tests +137 ~51 -0, 414 -> 551; the head versions of the six existing files run on the base code: 491 tests, 490 pass, the one failure the pinned list in cli.test.ts'},
        },
        'round2': {
            'what': 'the steps that follow the merge of #545 (a1b9bde2), in the order the coordinator fixed: one merge of main, the five names the support purity test now meets, the SM4 self-test case. No other file changes',
            'mergeCommit': merge, 'mergedMain': 'a1b9bde272f21dd5f110498c39e95f9f827344f4',
            'allowListCommit': allow, 'allowList': 'packages/support/src/support-purity.test.ts: Array, Readonly, Record, isArray and isRecord added to ALLOWED_IDENTIFIERS (the object predicate\'s names); support-purity.test.ts and the dossier no-egress test pass on the result',
            'sm4Commit': sm4, 'sm4': 'site-equivalence.mjs gains the isoOf import case; the strict tool\'s selftest, the pair (20 modified, 19 equal, 3 exceptions) and the four rule-6 rows were re-run at that commit',
        },
    },
    'changedFiles': changed_files,
}
out = os.path.join(evidence, 'dc4-object-and-iso-helpers-2026-10-28.json')
json.dump(record, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
print('wrote', out, 'sha256', sha(open(out, 'rb').read()))
