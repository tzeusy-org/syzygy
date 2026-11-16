#!/usr/bin/env python3
"""Builds docs/evidence/syzygy-bpyt-4-5/bounds-and-pins.json from the retained results beside it (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I build_record.py TREE BASE_COMMIT MAIN_COMMIT EVIDENCE_COMMIT PRIOR_TEST_COMMIT ROUND1_TEST_COMMIT LATER_MAIN

BASE_COMMIT is where the branch began and where every base-side result ran; MAIN_COMMIT is the main the branch last merged.
The change is `git diff MAIN_COMMIT EVIDENCE_COMMIT`, and each file it touches must be identical at BASE_COMMIT and MAIN_COMMIT,
so the base-side results ran against the bytes the change replaced. LATER_MAIN is main as it stands when the record is
built: the record lists which of the change's files and the daemon-entry runs' bound inputs differ between MAIN_COMMIT and
it (`mainMovedSince`), since nothing here re-ran against those bytes.

Every digest and total is computed here from the files and git objects, never typed in: the subject (the test files the
change touches, their sha256 at EVIDENCE_COMMIT, and the sha256 of `git diff MAIN EVIDENCE -- <them>`), each tool and
result file's sha256, the census totals at both commits, the mutant outcomes, the CPU separations and the full-suite runs.

What each result must have run against, checked here: the mutants and the head census at EVIDENCE_COMMIT itself; the
daemon-entry probe at a commit whose main.ts, state-directory.ts, http-host's shutdown.ts and daemon-entry test are
byte-identical to EVIDENCE_COMMIT's; both CPU separations (thread CPU on Node 24, and process CPU on Node 22, where the
tests' cpuUsage falls back) at a commit whose three timed test files are emit-equal to EVIDENCE_COMMIT's (tools/emit_equal.mjs:
TypeScript's emit with comments removed and each `const <NAME>_CPU_MS = <n>;` masked), so they differ only in comments, types
or a bound's value, none of which changes what the timed regions run.
Each result's tool must hash, at EVIDENCE_COMMIT, to the digest the result records, and each result that reads
tools/mutant-cases.json must record the digest that file has at EVIDENCE_COMMIT.

Checked claims: every mutant case ran as its `expect` says; every CPU bound in the tests sits 10x or more from the head's
slowest region and from the mutant's fastest, on thread CPU and under the process-CPU fallback alike. Both figures are
derived here from the runs, never read from the producer's summary: the head maximum is the largest region over the head
runs, each mutant row's minimum is the smallest over its runs (a capped run counts at its reading, a lower bound), a row is
reached when its minimum is 10x the head maximum or more, and the mutant minimum is the smallest over reached rows. The
rows not reached must be exactly the ones declared here (UNREACHED: the near-miss tag-names row under TAG_SCAN_CPU_MS, on
both paths), so a row that runs under its bound is refused rather than left out. Each figure must equal the one the
separation recorded, and its `fileBound` must agree, or the record is refused; the ratios written are the ones computed
here. The bounds were set at 3fc3709f at the geometric mean of the first separation and are not refitted: each later
run's mean, the square root of the derived head maximum times the derived mutant minimum rounded down to two significant
figures (cpu_separation.py's rounding), is computed here, must equal the separation's `proposedBoundMs`, and is recorded
as `geometricMeanNowMs`. The test file must hold the base's old text pin byte for byte (its `it` block on PIN and the one
comment line above it, as BASE_COMMIT has them), exactly once. On the daemon entry, the four runs (the new test, the old
test from BASE_COMMIT, and the tests from PRIOR_TEST_COMMIT and ROUND1_TEST_COMMIT) hold the same mutants, none skipped
but a `hook` mutant in a test without the load-hook row; every `defect` mutant fails the new test, every `hook` mutant
fails the load-hook row, the R- mutants (rev-532's daemon-path loads) pass the kept text row as it stood at
PRIOR_TEST_COMMIT and fail it now, S1-S6 (rev-532b's) pass the test at ROUND1_TEST_COMMIT and fail both the new text row
and the old pin, S7 (an `else` whose load names the POC app nowhere in main.ts) passes the round-1 test and fails the new
text row, Y1-Y5 (rev-532c's: a then-block that loads the POC app and then reaches the daemon path) fail the old pin and
fail the new test at the restored pin alone, every `equivalent` fails exactly the rows the record discloses for it
(E-type-only-import and C1-comment-outside-branches the text row and the restored pin; the pin's five known false
refusals, PIN_FALSE_REFUSALS, the restored pin alone; every other equivalent none), the `residual` X2 passes every row
of all four tests while X1 fails the new text row and X3 the load-hook row, as the record says; and the last full-suite
attempt is one green run at EVIDENCE_COMMIT. The narrative fields (`sites`, `residuals`) are the lane's own words.
"""
import glob, hashlib, json, math, os, re, subprocess, sys

tree, base, main, ev, prior, round1, later = os.path.abspath(sys.argv[1]), *sys.argv[2:8]
here = os.path.join(tree, 'docs/evidence/syzygy-bpyt-4-5')
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, check=True).stdout
sha = lambda b: hashlib.sha256(b).hexdigest()
load = lambda name: json.load(open(os.path.join(here, name), encoding='utf8'))
base, main, ev, prior, round1, later = (git('rev-parse', c).decode().strip() for c in (base, main, ev, prior, round1, later))
changed = sorted(p for p in git('diff', '--name-only', main, ev).decode().split('\n') if p)
for p in changed:
    if not p.startswith('docs/evidence/syzygy-bpyt-4-5/') and subprocess.run(['git', 'diff', '--quiet', base, main, '--', p], cwd=tree).returncode != 0:
        sys.exit(f'{p} differs between {base} and {main}')
tests = [p for p in changed if p.startswith(('apps/', 'packages/'))]
MAIN, STATE, DE_TEST = 'apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.ts', 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
SHUT = 'packages/http-host/src/shutdown.ts'
PIN = 'each import is dynamic and inside the `dossier` or `polaris` branch'
base_lines = git('show', f'{base}:{DE_TEST}').decode().split('\n')
opens = [i for i, l in enumerate(base_lines) if l.startswith('  it(') and PIN in l]
if len(opens) != 1 or not base_lines[opens[0] - 1].startswith('  // '): sys.exit(f'{base}: the old pin is not one `it` block on PIN under one comment line')
pin_block = '\n'.join(base_lines[opens[0] - 1:base_lines.index('  });', opens[0]) + 1]) + '\n'
if git('show', f'{ev}:{DE_TEST}').decode().count(pin_block) != 1: sys.exit(f'{ev}: the test file does not hold the old pin from {base} byte for byte, exactly once')

mutants, census_base, census_head = load('bound-and-pin-mutants.json'), load('census-base.json'), load('census-head.json')
de_head, de_base, sep = load('daemon-entry-head.json'), load('daemon-entry-base-test.json'), load('cpu-separation.json')
de_prior, de_round1, sep22 = load('daemon-entry-prior-test.json'), load('daemon-entry-round1-test.json'), load('cpu-separation-node22.json')
if de_prior['testFileFrom'] != prior: sys.exit(f'daemon-entry-prior-test ran the test from {de_prior["testFileFrom"]}, not {prior}')
if de_round1['testFileFrom'] != round1: sys.exit(f'daemon-entry-round1-test ran the test from {de_round1["testFileFrom"]}, not {round1}')
if sep['cpuSource'] != 'thread' or sep22['cpuSource'] != 'process' or not sep22['node'].startswith('v22.'):
    sys.exit('the CPU separations are not one thread-CPU run and one process-CPU run on Node 22')
for name, at in (('mutants', mutants['tree']), ('census-head', census_head['commit'])):
    if at != ev: sys.exit(f'{name} ran at {at}, not {ev}')
if census_base['commit'] != base or mutants['base'] != base or de_base['testFileFrom'] != base: sys.exit('a base-side result names another base')
DE_RUNS = (('daemon-entry-head', de_head), ('daemon-entry-base-test', de_base), ('daemon-entry-prior-test', de_prior), ('daemon-entry-round1-test', de_round1))
for name, record in DE_RUNS:
    if subprocess.run(['git', 'diff', '--quiet', record['commit'], ev, '--', MAIN, STATE, SHUT, DE_TEST], cwd=tree).returncode != 0:
        sys.exit(f'{name}: {MAIN}, {STATE}, {SHUT} or the test differ between {record["commit"]} and {ev}')
cpu_files = sorted({s['file'] for s in sep['sites']})
for name, record in (('cpu-separation', sep), ('cpu-separation-node22', sep22)):
    equal = json.loads(subprocess.run(['node', os.path.join(here, 'tools', 'emit_equal.mjs'), tree, record['tree'], ev, *cpu_files],
                                      capture_output=True, text=True, check=True).stdout)
    if sorted(equal) != cpu_files or not all(equal.values()): sys.exit(f'{name}: a timed test file is not emit-equal between {record["tree"]} and {ev}: {equal}')
cases_sha = sha(git('show', f'{ev}:docs/evidence/syzygy-bpyt-4-5/tools/mutant-cases.json'))
for name, record in (('mutants', mutants), ('cpu-separation', sep), ('cpu-separation-node22', sep22)):
    if record['cases']['sha256'] != cases_sha: sys.exit(f'{name} used a mutant-cases.json other than the one at {ev}')
for name, record in (('mutants', mutants), *DE_RUNS, ('cpu-separation', sep), ('cpu-separation-node22', sep22), ('census', census_head)):
    path = f'docs/evidence/syzygy-bpyt-4-5/tools/{record["tool"]["name"]}'
    if sha(git('show', f'{ev}:{path}')) != record['tool']['sha256']: sys.exit(f'{name}: tool digest differs from {ev}')

cases = {c['id']: c for c in mutants['results']}
def ran_as_expected(ids):
    for i in ids:
        if i not in cases: sys.exit(f'no mutant case {i}')
        if not all(s['asExpected'] for s in cases[i]['sides']): sys.exit(f'case {i} did not run as expected')
    def said(s):
        failed = [r for r in s.get('rows', []) if r['status'] == 'failed']
        return 'fail (by the test timeout)' if s['outcome'] == 'fail' and failed and all(r.get('byTimeout') for r in failed) else s['outcome']
    return {i: {s['side']: said(s) for s in cases[i]['sides']} for i in ids}
if not all(s['asExpected'] for c in cases.values() for s in c['sides']): sys.exit('a mutant case did not run as expected')

UNREACHED = {'TAG_SCAN_CPU_MS': ['scans near-miss tag names at the ceiling']}
def round_down_2sf(x):
    e = math.floor(math.log10(x)) - 1
    return math.floor(x / 10 ** e) * 10 ** e
bounds_at_ev = {}
for f in cpu_files:
    for m in re.finditer(r'^const ([A-Z_]+_CPU_MS) = ([0-9_]+);', git('show', f'{ev}:{f}').decode(), re.M): bounds_at_ev[m.group(1)] = int(m.group(2).replace('_', ''))
def separated(s, record):
    """The site's figures derived from its runs, checked against what the separation recorded and against the bound the test holds."""
    b, name = bounds_at_ev.get(s['bound']), f'{record}: {s["bound"]}'
    if b is None or s['fileBound']['ms'] != b: sys.exit(f'{name}: the separation measured a bound other than the {b} the test holds')
    if not s['headRuns'] or any(h['exit'] != 0 for h in s['headRuns']): sys.exit(f'{name}: no head runs, or a head run failed')
    head = [g['cpuMs'] for h in s['headRuns'] for g in h['regions'] if g['bound'] == s['bound']]
    if not head: sys.exit(f'{name}: no head run probed the region')
    head_max, rows = max(head), []
    for m in s['mutants']:
        values = [r['capped']['regionCpuMsAtLeast'] if r['capped'] else min((g['cpuMs'] for g in r['regions'] if g['bound'] == s['bound']), default=None)
                  for r in m['runs']]
        if not values or None in values: sys.exit(f'{name}: {m["id"]} has a run that neither capped nor probed the region')
        capped = sum(1 for r in m['runs'] if r['capped'])
        if min(values) != m['min'] or capped != m['cappedRuns']: sys.exit(f'{name}: {m["id"]} records min {m["min"]} over {m["cappedRuns"]} capped runs; its runs give {min(values)} over {capped}')
        rows.append({'id': m['id'], 'title': m['title'], 'runs': len(m['runs']), 'cappedRuns': capped, 'minMs': min(values), 'reached': min(values) >= 10 * head_max})
    reached = [r for r in rows if r['reached']]
    if sorted(r['title'] for r in rows if not r['reached']) != UNREACHED.get(s['bound'], []):
        sys.exit(f'{name}: the rows not reached are {sorted(r["title"] for r in rows if not r["reached"])}, not the declared {UNREACHED.get(s["bound"], [])}')
    if not reached: sys.exit(f'{name}: no mutant row reaches 10x the head maximum {head_max}')
    mutant_min = min(r['minMs'] for r in reached)
    lower = any(r['cappedRuns'] and r['minMs'] == mutant_min for r in reached)
    if (head_max, mutant_min, lower) != (s['headMaxMs'], s['mutantMinMs'], s['mutantMinIsLowerBound']):
        sys.exit(f'{name}: the runs give head max {head_max} and mutant min {mutant_min} (lower bound {lower}); the separation records {s["headMaxMs"]}, {s["mutantMinMs"]} ({s["mutantMinIsLowerBound"]})')
    mean = round_down_2sf(math.sqrt(head_max * mutant_min))
    if mean != s['proposedBoundMs']: sys.exit(f'{name}: the runs give a geometric mean of {mean}; the separation records {s["proposedBoundMs"]}')
    over, under = round(b / head_max, 1), round(mutant_min / b, 1)
    if not (b / head_max >= 10 and mutant_min / b >= 10): sys.exit(f'{name}: not 10x from both sides ({over}, {under})')
    if (s['fileBound']['overHeadMax'], s['fileBound']['mutantMinOver'], s['fileBound']['separated']) != (over, under, True):
        sys.exit(f'{name}: fileBound records {s["fileBound"]}; the runs give {over}x and {under}x')
    return {'boundMs': b, 'headRuns': len(s['headRuns']), 'headMaxMs': head_max, 'mutants': rows, 'mutantMinMs': mutant_min, 'mutantMinIsLowerBound': lower,
            'boundOverHeadMax': over, 'mutantMinOverBound': under, 'geometricMeanNowMs': mean}
for name, record in (('cpu-separation', sep), ('cpu-separation-node22', sep22)):
    if sorted(s['bound'] for s in record['sites']) != sorted(bounds_at_ev): sys.exit(f'{name} measured {sorted(s["bound"] for s in record["sites"])}, not every bound the tests hold ({sorted(bounds_at_ev)})')
fallback = {s['bound']: {'node': sep22['node'], 'cpuSource': 'process', **{k: v for k, v in separated(s, 'cpu-separation-node22').items() if k not in ('boundMs', 'mutants')}}
            for s in sep22['sites']}
separation = {}
for s in sep['sites']:
    figures = separated(s, 'cpu-separation')
    loads = [r['load1Start'] for r in s['headRuns']] + [r['load1End'] for r in s['headRuns']]
    separation[s['bound']] = {'file': s['file'], **{k: figures[k] for k in ('boundMs', 'headRuns', 'headMaxMs')}, 'headLoad1': [min(loads), max(loads)],
                              **{k: figures[k] for k in ('mutants', 'mutantMinMs', 'mutantMinIsLowerBound', 'boundOverHeadMax', 'mutantMinOverBound')},
                              'geometricMeanNowMs': figures['geometricMeanNowMs'], 'underProcessCpuFallback': fallback[s['bound']]}

SITES = [
    {'site': 'apps/three-surface-poc/src/capture-test-artifact-main.test.ts:381 (base)', 'was': 'expect(Date.now() - started).toBeLessThan(5_000)',
     'property': 'a FIFO is refused before any open', 'now': 'the lstat-refusal message alone; no elapsed bound',
     'mutants': ['fifo-no-lstat', 'fifo-blocking-open']},
    {'site': 'apps/three-surface-poc/src/main.test.ts:547 (base)', 'was': 'expect(Date.now() - began).toBeLessThan(WAIT_MS / 2)',
     'property': 'started() reports a finished run at once', 'now': "a bound twice the test's own timeout, so a report made at the bound times the test out",
     'mutants': ['started-waits-for-bound']},
    {'site': 'packages/polaris-dossier/src/git-object-reader.test.ts:581 (base) and the refusedWithin call sites (refusedWithinCallSites)', 'was': 'expect(Date.now() - started).toBeLessThan(30_000); refusedWithin(2000 | 5000 | 30_000, ...)',
     'property': 'refusal by the byte budget, the depth cap or the stored bound; a special file never blocks', 'now': "refusal() and each test's own timeout",
     'mutants': ['reader-no-call-budget', 'reader-no-depth-cap', 'reader-blocking-open', 'reader-no-stored-bound']},
    {'site': 'packages/polaris-generation-core/src/dossier-profile.test.ts:167 (base)', 'was': 'expect(performance.now() - started).toBeLessThan(2000)',
     'property': 'the edge trim is linear', 'now': 'EDGE_TRIM_CPU_MS, a CPU-time bound; each filler also goes in as a blank run between visible characters, the shape the old regex is quadratic on',
     'finding': 'The base guard is vacuous: the backtracking edge trim it names passes the base test (edge-backtracking-regex, base side), because no base timed input has a blank run between visible characters.',
     'mutants': ['edge-backtracking-regex'], 'bound': 'EDGE_TRIM_CPU_MS'},
    {'site': 'packages/polaris-generation-core/src/excerpt.test.ts:262 (base), 2 cases', 'was': 'expect(Date.now() - started).toBeLessThan(500)',
     'property': 'a line past the pattern prefix is never pattern-matched', 'now': 'HOSTILE_LINE_CPU_MS, a CPU-time bound',
     'finding': "The bound has a predicate of its own: with the prefix cap removed and FUNCTION_LINE backtracking, the `an identifier` case's output assertion still passes once the bound is deleted and vitest's timeout lifted (excerpt-time-only).",
     'mutants': ['excerpt-quadratic-pattern-only', 'excerpt-no-prefix-cap', 'excerpt-no-cap-quadratic-pattern', 'excerpt-time-only'], 'bound': 'HOSTILE_LINE_CPU_MS'},
    {'site': 'packages/three-surface-poc-core/src/test-artifact-verification.test.ts:96 (base), 3 cases', 'was': 'expect(performance.now() - started).toBeLessThan(2_000)',
     'property': 'the JUnit tag scan is linear', 'now': 'TAG_SCAN_CPU_MS, a CPU-time bound', 'mutants': ['junit-tag-regex'], 'bound': 'TAG_SCAN_CPU_MS'},
    {'site': 'packages/three-surface-poc-core/src/test-artifact-verification.test.ts:103 (base)', 'was': 'expect(performance.now() - started).toBeLessThan(2_000)',
     'property': 'the JUnit attribute scan is linear', 'now': 'ATTRIBUTE_SCAN_CPU_MS, a CPU-time bound', 'mutants': ['junit-attr-regex'], 'bound': 'ATTRIBUTE_SCAN_CPU_MS'},
    {'site': 'packages/polaris-generation-core/src/dossier-evaluation.test.ts:107-113,127-131 (base)', 'was': 'byte literals 1038, 670, 235, 1273, 669',
     'property': 'page bytes, bytes through the last level-0 close, per-depth and total bytes', 'now': 'counts taken from the fixture text',
     'mutants': ['dossier-page-bytes-plus-one', 'dossier-first-level-short', 'dossier-total-first-page', 'dossier-budget-first-level-short', 'dossier-budget-total-first-page']},
    {'site': 'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts:137 (base)', 'was': 'expect(bytes.selected).toBeGreaterThan(390_000)',
     'property': 'the byte cap is filled greedily', 'now': 'every unsplit deferred file holds more quotable bytes than the room left; the 400,000 cap stays (the contract, named in the describe title)',
     'mutants': ['redis-stop-at-first-misfit']},
    {'site': 'apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts:11 (base), PINNED_MAIN', 'was': 'an exact 40-hex commit pin',
     'property': "the self-corpus denominator is the one the M7 record measured", 'disposition': 'kept',
     'now': 'kept as an exact pin: the commit is the contract docs/evidence/polaris-m7-synthetic-successor-2026-09-23.json binds, and node-ci.yml checks out with fetch-depth: 0 to keep it in a hosted checkout; the comment above the constant says so',
     'mutants': []},
    {'site': 'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts:152,159 (base), the two [Observed] rows', 'was': 'exact byte totals {selected, deferred, cap}',
     'property': 'what selection measured on the fixed fixture corpus', 'disposition': 'kept',
     'now': "kept: each row reports an observation over the fixed fixture corpus, so its totals are the observation and not a bound; the greedy fill is the :137 (base) row's property; the comment above the two rows says so",
     'mutants': []},
]
for s in SITES:
    s['outcomes'] = ran_as_expected(s['mutants'])
    if 'bound' in s: s['separation'] = separation[s['bound']]
controls = ran_as_expected(sorted(i for i in cases if i.startswith('control-')))

HOOK_ROW ='the daemon path never loads the POC app, and the `dossier render` branch does'
TEXT_ROW = 'every mention of the POC app in main.ts lies inside the `dossier` or the `polaris` branch'
ROUND1_TEXT_ROW = 'every line of main.ts naming the POC app sits inside the `dossier` or the `polaris` branch'
REV_LOADS, DROPPED_EQUIVALENTS = ['R1-flag-between-branches', 'R2-flag-createRequire-before-daemon', 'R3-runtime-hook'], ['E-comment-in-branch', 'E-renamed-binding', 'E-branch-swap']
ROUND2_LOADS = ['S1-else-if-flag-after-dossier', 'S2-same-line-if-after-dossier', 'S3-else-if-flag-after-polaris', 'S4-else-runtime-hook-after-dossier',
                'S5-else-createRequire-flag-after-polaris', 'S6-misindented-close-after-dossier']
ELSE_ONLY = 'S7-else-split-specifier-after-dossier'
ROUND2_EQUIVALENTS, TEXT_ROW_FAILS = ['L1-else-if-chain', 'L2-nested-function-in-dossier', 'L3-nested-try-in-polaris'], ['E-type-only-import', 'C1-comment-outside-branches']
ROUND3_LOADS = ['Y1-dossier-serve-falls-through', 'Y2-dossier-serve-reenters-main', 'Y3-flag-rewrites-argv-into-dossier', 'Y4-polaris-labelled-break',
                'Y5-dossier-serve-callback-after-branch']
PIN_FALSE_REFUSALS = DROPPED_EQUIVALENTS + ['L2-nested-function-in-dossier', 'L3-nested-try-in-polaris']
# The rows of the new test each equivalent fails, as the record discloses them; any equivalent not named fails none.
EQUIVALENT_FAILS = {**{mid: ['pin', 'text'] for mid in TEXT_ROW_FAILS}, **{mid: ['pin'] for mid in PIN_FALSE_REFUSALS}}
row_of = lambda title: 'pin' if PIN in title else 'text' if TEXT_ROW in title else 'hook' if HOOK_ROW in title else title
def outcome(record):
    out = {}
    for r in record['results']:
        mid = (r['mutant'] or {}).get('id', 'control')
        out[mid] = {'kind': (r['mutant'] or {}).get('kind'), 'skipped': r.get('skipped'), 'passed': r['passed'], 'failed': r['failed']}
    return out
new, old, prior_test, round1_test = outcome(de_head), outcome(de_base), outcome(de_prior), outcome(de_round1)
for name, record in (('old', old), ('prior', prior_test), ('round1', round1_test)):
    if list(record) != list(new) or any(record[mid]['kind'] != new[mid]['kind'] for mid in new): sys.exit(f'the {name}-test run holds other mutants than the new-test run')
for name, record in (('new', new), ('old', old), ('prior', prior_test), ('round1', round1_test)):
    for mid, r in record.items():
        if r['skipped'] and not (name != 'new' and r['kind'] == 'hook'): sys.exit(f'{mid}: skipped in the {name}-test run ({r["skipped"]})')
        if mid == 'control' and (r['failed'] or not r['passed']): sys.exit(f'the {name}-test control failed or ran nothing')
fails = lambda record, mid, row: any(row in t for t in record[mid]['failed'])
KINDS = {**{mid: 'defect' for mid in REV_LOADS + ROUND2_LOADS + ROUND3_LOADS + [ELSE_ONLY, 'X1-close-failed-callback-in-main', 'X3-shutdown-in-http-host']},
         **{mid: 'equivalent' for mid in DROPPED_EQUIVALENTS + ROUND2_EQUIVALENTS + TEXT_ROW_FAILS}, 'X2-close-failure-in-http-host': 'residual'}
if not set(KINDS) <= set(new): sys.exit(f'mutants this record names are absent: {sorted(set(KINDS) - set(new))}')
if any(new[mid]['kind'] != kind for mid, kind in KINDS.items()): sys.exit(f'a named mutant carries another kind: {[(m, new[m]["kind"]) for m, k in KINDS.items() if new[m]["kind"] != k]}')
for mid in REV_LOADS:
    if prior_test[mid]['failed'] or not prior_test[mid]['passed']: sys.exit(f'{mid}: fails the kept text row as it stood at {prior}, so it is not the survivor rev-532 found')
    if not fails(new, mid, TEXT_ROW): sys.exit(f'{mid}: the new text row passes it')
for mid in ROUND2_LOADS:
    if round1_test[mid]['failed'] or not round1_test[mid]['passed']: sys.exit(f'{mid}: fails the test as it stood at {round1}, so it is not the survivor rev-532b found')
    if not fails(new, mid, TEXT_ROW): sys.exit(f'{mid}: the new text row passes it')
    if not fails(old, mid, PIN): sys.exit(f'{mid}: the old pin passes it')
if not fails(new, ELSE_ONLY, TEXT_ROW) or not round1_test[ELSE_ONLY]['passed'] or round1_test[ELSE_ONLY]['failed']:
    sys.exit(f'{ELSE_ONLY}: the new text row passes it, or the round-1 test fails it')
for mid in ROUND3_LOADS:
    if not fails(old, mid, PIN): sys.exit(f'{mid}: the old pin passes it, so it is not the load rev-532c found')
    if sorted({row_of(t) for t in new[mid]['failed']}) != ['pin']: sys.exit(f'{mid}: the record says the new test fails it at the restored pin alone')
for mid, r in new.items():
    if r['kind'] == 'defect' and not r['failed']: sys.exit(f'{mid}: a defect the new test passes')
    if r['kind'] == 'hook' and not fails(new, mid, HOOK_ROW): sys.exit(f'{mid}: a hook mutant the load-hook row passes')
    if r['kind'] == 'equivalent' and sorted({row_of(t) for t in r['failed']}) != EQUIVALENT_FAILS.get(mid, []):
        sys.exit(f'{mid}: an equivalent the new test fails at {sorted({row_of(t) for t in r["failed"]})}; the record discloses {EQUIVALENT_FAILS.get(mid, [])}')
    if r['kind'] == 'residual' and any(record[mid]['failed'] for record in (new, old, prior_test, round1_test)):
        sys.exit(f"{mid}: a residual some test now fails, so the record's residual is stale")
if not fails(new, 'X1-close-failed-callback-in-main', TEXT_ROW) or not fails(new, 'X3-shutdown-in-http-host', HOOK_ROW):
    sys.exit('X1 passes the text row or X3 the load-hook row, so the X2 residual misstates them')
verdict = lambda record, mid: 'skipped' if record[mid]['skipped'] else ('pass' if not record[mid]['failed'] else sorted(record[mid]['failed']))
daemon_entry = {
    'mutants': [{'id': mid, 'kind': r['kind'], 'newHookRow': 'fail' if fails(new, mid, HOOK_ROW) else 'pass',
                 'newTextRow': 'fail' if fails(new, mid, TEXT_ROW) else 'pass',
                 'newPinRow': 'fail' if fails(new, mid, PIN) else 'pass',
                 'newOtherRows': sorted(t for t in r['failed'] if row_of(t) not in ('hook', 'text', 'pin')),
                 'oldTextPin': 'skipped' if old[mid]['skipped'] else ('fail' if fails(old, mid, PIN) else 'pass'),
                 'oldOtherRows': sorted(t for t in old[mid]['failed'] if PIN not in t),
                 'priorTest': verdict(prior_test, mid),
                 'roundOneTest': verdict(round1_test, mid),
                 'roundOneTextRow': 'skipped' if round1_test[mid]['skipped'] else ('fail' if fails(round1_test, mid, ROUND1_TEXT_ROW) else 'pass')} for mid, r in new.items()],
    'priorTestFrom': prior, 'roundOneTestFrom': round1,
    'note': 'defect: the daemon path loads the POC app on some argv or event; equivalent: nothing on any daemon path loads it; hook: the load hook itself is broken; residual: a daemon-path load no row reaches, disclosed in `residuals`.'}
pin_alone = [m for m in daemon_entry['mutants'] if m['newPinRow'] == 'fail' and m['newHookRow'] == 'pass' and m['newTextRow'] == 'pass' and not m['newOtherRows']]
daemon_entry['pinRowAlone'] = {'defects': [m['id'] for m in pin_alone if m['kind'] == 'defect'], 'knownFalseRefusals': [m['id'] for m in pin_alone if m['kind'] == 'equivalent'],
                               'note': "the mutants only the restored pin fails: the defects are loads both other rows pass, and the equivalents are its known false refusals, which load nothing"}
if sorted(daemon_entry['pinRowAlone']['defects']) != sorted(ROUND3_LOADS) or sorted(daemon_entry['pinRowAlone']['knownFalseRefusals']) != sorted(PIN_FALSE_REFUSALS):
    sys.exit(f'the restored pin alone fails {daemon_entry["pinRowAlone"]}, not Y1-Y5 and {PIN_FALSE_REFUSALS}')
daemon_entry['pinMisses'] = [m['id'] for m in daemon_entry['mutants'] if m['kind'] in ('defect', 'residual') and m['oldTextPin'] == 'pass']

THIRD = r'hrtime|performance\.now\(\)|Date\.now\(\) *-|elapsed|getTime\(\) *-|[cC]puUsage'
third = [l for l in git('grep', '-n', '-E', THIRD, ev, '--', 'apps/*.test.*', 'packages/*.test.*').decode().split('\n') if l]
grep_n = lambda commit, pattern, path: [l for l in subprocess.run(['git', 'grep', '-n', '-F', pattern, commit, '--', path], cwd=tree, capture_output=True, text=True).stdout.split('\n') if l]
READER = 'packages/polaris-dossier/src/git-object-reader.test.ts'
refused_within = {'base': [l for l in grep_n(base, 'refusedWithin(', READER) if 'function refusedWithin' not in l and 'const refusedWithin' not in l],
                  'head': grep_n(ev, 'refusedWithin', READER)}
timeouts = [r for r in census_head['rows'] if r['kind'].startswith('timeout')]
RESIDUALS = [
    'process.threadCpuUsage() exists from Node 23.9.0 while package.json engines admits Node 22.15 and later. Where it is absent (Node before 23.9) the tests fall back to process.cpuUsage(), which also counts the worker process\'s other threads (garbage collection, compilation): each bound\'s separation under that fallback, measured on Node 22, is `underProcessCpuFallback`. CI and this host run Node 24.',
    'The near-miss tag-names case runs under TAG_SCAN_CPU_MS with no mutant that fails it: the replaced scan is linear on that input too, so the bound rests on the other two cases; the test says so in a comment.',
    'A capped mutant run gives a lower bound on its region, not the region: the mutant minimum for those bounds is at least the cap, so each bound sits at least as far from the mutant as recorded.',
    'The kept daemon-entry text row also fails mutants that load nothing: a type-only import naming the POC app at module top (E-type-only-import) and a header comment naming it outside the two branches (C1-comment-outside-branches). The equivalents it passes are in daemonEntry.',
    "The compiler-API text row and the load-hook row both pass rev-532c's Y1-Y5: a then-block that loads the POC app and then reaches the daemon path, by falling through, re-entering main(), breaking out of a label, scheduling a callback or rewriting argv under a flag. The text row checks where each mention lies, not whether control leaves the branch, and the load-hook row never drives those argv. Only the base's old pin, restored byte for byte under round 3's stopping rule, fails them (daemonEntry.pinRowAlone.defects), because each adds a line naming the app; a version that adds no such line passes all three rows (rev-532c's N1, a follow-up).",
    'The restored pin reads main.ts by exact line, so it also fails five mutants that load nothing and that the other two rows pass: a comment naming the POC app in the dossier branch (E-comment-in-branch), the renderer bound under another name (E-renamed-binding), the two branches swapped (E-branch-swap), the dossier import in a nested function (L2) and the polaris import in a nested try (L3) (daemonEntry.pinRowAlone.knownFalseRefusals). A legitimate refactor of either branch turns it red, as it did at the base; that cost was accepted with the stopping rule.',
    "A load in http-host's close-failure branch (packages/http-host/src/shutdown.ts, X2-close-failure-in-http-host) passes every row of the new test, the old pin and both earlier tests: main's #529 moved the shutdown handler out of main.ts, the one file the text row reads, and no row drives a failing close. A load in main.ts's closeFailed callback (X1) still fails the text row, and one in http-host's shutdown function (X3) the load-hook row. Extending the check to closeOnSignal is round 1's N5 follow-up, not this bead.",
    "dossier-evaluation's INDEX and DEEP fixtures are ASCII, so a module that counted string length instead of UTF-8 bytes would pass every byte assertion there, at the base (literals) and at the head (counts) alike.",
    'A FIFO capture with the lstat refusal removed blocks in a synchronous open at both sides: the row fails by the test timeout or the run is killed, never by a fast refusal (fifo-blocking-open).',
    'Explicit timeouts are harness bounds, not assertions, and are out of this bead (syzygy-bpyt.4.31); most carry no one-line reason (unreasonedTimeouts).',
    'Two concurrent full-suite runs were not green on this host at the base or the head alike (attempts 1 to 3): every failure was a 5 s default timeout or a 10 s hook timeout in a file this change does not touch. One run at a time, twice in sequence, was green (attempts 4 and 5), and so was one run of the round-2 repair at default timeouts (attempt 6).',
]
row_delta = subprocess.run([sys.executable, '-I', os.path.join(here, 'tools', 'row_delta.py'), tree, main, ev], capture_output=True, text=True, check=True).stdout.splitlines()
suites = [load(os.path.relpath(p, here)) for p in sorted(glob.glob(os.path.join(here, 'full-suite', 'attempt-*.json')))]
durations = [load(os.path.relpath(p, here)) for p in sorted(glob.glob(os.path.join(here, 'durations', '*.json')))]
if [r['commit'] for r in suites[-1]['runs']] != [ev] or any(r['exit'] or not r['success'] or r['totals']['numFailedTests'] for r in suites[-1]['runs']):
    sys.exit(f'the last full-suite attempt is not one green run at {ev}')

files = sorted(p for p in glob.glob(os.path.join(here, '**', '*'), recursive=True) if os.path.isfile(p) and not p.endswith('bounds-and-pins.json'))
watched = sorted(set(changed) | {MAIN, STATE, SHUT, DE_TEST})
moved = [p for p in watched if subprocess.run(['git', 'diff', '--quiet', main, later, '--', p], cwd=tree).returncode != 0]
main_moved = {'laterMain': later, 'paths': [{'path': p, 'commits': git('log', '--format=%H %s', f'{main}..{later}', '--', p).decode().splitlines()} for p in moved],
              'over': "the change's files and the daemon-entry runs' bound inputs (main.ts, state-directory.ts, shutdown.ts, the daemon-entry test)",
              'note': 'The subject stays MAIN_COMMIT: no result here re-ran against laterMain, and the base side was not re-run, so build_record with laterMain as MAIN refuses where a listed path is one of the change\'s files.'}
record = {
    'schema': 'syzygy-bpyt-4-5-bounds-and-pins/3', 'bead': 'syzygy-bpyt.4.5',
    'subject': {'base': base, 'main': main, 'evidenceCommit': ev, 'testFiles': [{'path': p, 'sha256': sha(git('show', f'{ev}:{p}'))} for p in tests],
                'testDiffSha256': sha(git('diff', main, ev, '--', *tests)), 'note': 'The test files are the subject; no product file differs between base and the evidence commit.'},
    'mainMovedSince': main_moved,
    'productFilesChanged': [p for p in changed if not p.startswith('docs/evidence/syzygy-bpyt-4-5/') and p not in tests],
    'resultsRanAt': {'mutants': mutants['tree'], 'censusHead': census_head['commit'], 'daemonEntryHead': de_head['commit'], 'daemonEntryOldTest': de_base['commit'], 'daemonEntryPriorTest': de_prior['commit'], 'daemonEntryRoundOneTest': de_round1['commit'],
                     'cpuSeparation': sep['tree'], 'cpuSeparationNode22': sep22['tree']},
    'files': [{'path': os.path.relpath(p, tree), 'sha256': sha(open(p, 'rb').read())} for p in files],
    'ac1Sweep': {'population': {'base': census_base['population'], 'head': census_head['population']},
                 'elapsedFirstMethod': {'base': census_base['summary'].get('elapsed', {}).get('lines', 0), 'head': census_head['summary'].get('elapsed', {}).get('lines', 0),
                                        'baseLines': [r for r in census_base['rows'] if r['kind'] == 'elapsed']},
                 'elapsedSecondMethod': {'base': len(census_base['secondMethod']), 'head': len(census_head['secondMethod']), 'headLines': census_head['secondMethod']},
                 'thirdMethod': {'regex': THIRD, 'over': 'apps/*.test.* and packages/*.test.* at the evidence commit, git grep -E', 'lines': third},
                 'refusedWithinCallSites': refused_within,
                 'raceTimers': {'base': [r for r in census_base['rows'] if r['kind'] == 'race'], 'head': [r for r in census_head['rows'] if r['kind'] == 'race']},
                 'cpuBounds': {'lines': [r for r in census_head['rows'] if r['kind'] == 'cpu-bound'], 'justification': 'CPU time of the thread running the test, not wall time; each bound and its separation in `sites`.'},
                 'clockReadingsAtHead': {cls: sum(1 for r in census_head['rows'] if r['kind'] == 'clock' and r['class'] == cls) for cls in ('deadline', 'now-input')},
                 'unreasonedTimeouts': {'sites': len(timeouts), 'withReason': sum(1 for r in timeouts if r['reason']),
                                        'withoutReason': sum(1 for r in timeouts if not r['reason']), 'files': census_head['unreasonedTimeoutFiles'], 'bead': 'syzygy-bpyt.4.31'}},
    'sites': SITES, 'controls': controls, 'residuals': RESIDUALS,
    'mutantTotals': {'cases': len(cases), 'sides': sum(len(c['sides']) for c in cases.values()), 'asExpected': sum(s['asExpected'] for c in cases.values() for s in c['sides'])},
    'daemonEntry': daemon_entry,
    'rowDelta': {'tool': 'row_delta.py', 'base': main, 'head': ev, 'lines': row_delta},
    'wallDurations': durations, 'fullSuite': suites,
}
open(os.path.join(here, 'bounds-and-pins.json'), 'w', encoding='utf8').write(json.dumps(record, indent=1, ensure_ascii=False) + '\n')
print(json.dumps({'rowDelta': row_delta[-1], 'testFiles': len(tests), 'productFilesChanged': record['productFilesChanged'], 'mutantTotals': record['mutantTotals'],
                  'ac1': record['ac1Sweep']['elapsedFirstMethod']['head'], 'bounds': {k: (v['boundMs'], v['boundOverHeadMax'], v['mutantMinOverBound']) for k, v in separation.items()},
                  'pinRowAlone': {k: daemon_entry['pinRowAlone'][k] for k in ('defects', 'knownFalseRefusals')}, 'pinMisses': daemon_entry['pinMisses'],
                  'mainMovedSince': [p['path'] for p in main_moved['paths']]}))
