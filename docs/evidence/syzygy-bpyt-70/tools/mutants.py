#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.70 (the PR 554 reviews' follow-ups: items 2 and 5-8), run in a clean clone.

Round 1 of review R-GP-IMPL-SEGMENT-RULES-1 (REVISE over 9fd03a8e) added RX3, RX4 and RX7, from that review's tools, and K1.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present>

The edit, run and restore steps are syzygy-bpyt.6.14's (docs/evidence/syzygy-bpyt-6-14/tools/mutants.py), and the failing-set
form and the row-title constants are syzygy-bpyt.46's (docs/evidence/syzygy-bpyt-46/tools/mutants.py), both imported from the
clone and unedited. Every row records its edits verbatim as {path, old, new}, and the clone's `git status --porcelain` is recorded
after (expected empty). Each row names, before the run, the exact set of failing test names (vitest full names, or `file: <first
line of the file's message, 160 characters>`) it must give: [] for a row that must pass. A `tool` row runs
docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs instead and names the exit it must give.
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

LANE_614 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'
LANE_46 = 'docs/evidence/syzygy-bpyt-46/tools/mutants.py'
PIN_TOOL = 'docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs'
REACH_TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
REACH_KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
NO_EGRESS = 'packages/polaris-dossier/src/no-egress.test.ts'
DOSSIER_PKG = 'packages/polaris-dossier/package.json'
PURITY = 'packages/support/src/support-purity.test.ts'
GUARD = 'apps/three-surface-poc/src/sync-child-process-guard.test.ts'
CONFIG = 'vitest.config.ts'


def load(clone, path, name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(clone, path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


ENTRIES = 'the workspace entry modules '
DOTDOT_ROW = ENTRIES + 'throws on a /../ segment that the resolver would join away, since Node refuses the entry'
UNREAD_ROW = ENTRIES + 'throws on such a target under a condition Node does not read, or in a main, and names the one Node refuses first'
KEY_ROW = ENTRIES + 'throws on a condition key with a /../ segment, at any depth'
LOAD_ROW = "the tree's own exports load, under the suite, each entry from its source module"
CASE = "the segment rules the entry reader copies from Node 24's exports resolver reads "


def case(target, outcome):
    return f'{CASE}{json.dumps(target)} as Node does: it {outcome}'


WRITE_READER = 'the property-write reader the no-write row stands on reads '
RPC = 'suite child processes and the vitest worker RPC '
CONFIG_ROW = RPC + 'loads the vitest config and finds no alias key at any depth'
WALK_ROW = RPC + 'reads an alias key wherever the config holds one, and no other key'

CHECK = "      if (fault !== undefined) throw new Error(`${specifier}: ${fault}`);\n"
FIRST_TEST = "    if (!INVALID_SEGMENT.test(target.replace(/^\\.\\//u, ''))) return [];\n"
REFUSED_TAIL = "(s|%73|%53))(\\\\|\\/|$)/i;"
INVALID_TAIL = "(s|%73|%53))?(\\\\|\\/|$)/i;"
STATE = ('      "source": "./src/state-directory.ts",\n      "types": "./dist/state-directory.d.ts",\n'
         '      "import": "./dist/state-directory.js",\n      "default": "./dist/state-directory.js"\n')
STATE_DOTDOT = STATE.replace('./src/state-directory.ts', './src/x/../state-directory.ts').replace(
    '"./dist/state-directory.js"', '"./dist/x/../state-directory.js"')
E4S_MESSAGE = ('@syzygy/polaris-dossier/state-directory: its import condition target "./dist/x/../state-directory.js" has an empty, '
               "'.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)")
CONFIG_HEAD = 'export default defineConfig({\n'
ALIAS_WRONG = ("const alias = { '@syzygy/support': '/nonexistent/support/index.ts' };\n\n"
               'export default defineConfig({\n  resolve: { alias },\n')
ALIAS_RIGHT = ("const alias = { '@syzygy/support': fileURLToPath(new URL('./packages/support/src/index.ts', import.meta.url)) };\n\n"
               'export default defineConfig({\n  resolve: { alias },\n')
WALK = '[[...at, key], ...keyPaths(member, [...at, key])]'
REFUSES = ['./dist/x/../index.js', './dist/./index.js', './dist/node_modules/index.js', './dist/NODE_MODULES/index.js', './dist/%2e%2e/index.js',
           './dist/%2E/index.js', './dist/%6eode_modules/index.js', './dist/x\\..\\index.js', './dist/%4Eode_modules/index.js']
WARNS = ['./dist//index.js', './dist/']
INVALID_HEAD = "export const INVALID_SEGMENT = /(^|\\\\|\\/)((\\.|%2e)(\\.|%2e)?|(n|%6e|%4e)"
REFUSED_HEAD = INVALID_HEAD.replace('INVALID_SEGMENT', 'REFUSED_SEGMENT')


def app_first(clone):
    """The PR 557 round-1 review's RX7: the POC app project, which holds the config's one globalSetup, moved to the front of
    test.projects (its fragment derived from the config as that review's rev_mutants.py derives it)."""
    cfg = open(os.path.join(clone, CONFIG)).read()
    app = cfg[cfg.rindex('      {\n', 0, cfg.index("name: '@syzygy/three-surface-poc-app'")):cfg.rindex('    ],\n')]
    return [edit(CONFIG, app + '    ],\n', '    ],\n'), edit(CONFIG, '    projects: [\n', '    projects: [\n' + app)]

# (id, test file(s) or 'tool', edits, the failing test names expected ([] for a row that must pass), or for a tool row its exit).
ROWS = [
    ('W0-entries-unmutated', REACH_TEST, [], []),
    ('N0-no-egress-unmutated', NO_EGRESS, [], []),
    ('P0-support-unmutated', PURITY, [], []),
    ('G0-guard-unmutated', GUARD, [], []),
    ('T0-pin-tool-unmutated', 'tool', [], 0),
    # Item 2: the segment check and each of its predicates, alone.
    ('E1-segment-check-dropped', REACH_TEST, [edit(REACH_KIT, CHECK, '')], [DOTDOT_ROW, UNREAD_ROW, KEY_ROW]),
    ('E5-segment-check-reads-only-a-string-entry', REACH_TEST,
     [edit(REACH_KIT, '  return Object.entries(entry).flatMap(([condition, target]) => targetsOf(target, [...conditions, condition]));\n', '  return [];\n')],
     [DOTDOT_ROW, UNREAD_ROW, *[case(t, 'refuses') for t in REFUSES], *[case(t, 'warns') for t in WARNS]]),
    ('E6-segment-check-reads-one-condition-deep', REACH_TEST,
     [edit(REACH_KIT, 'targetsOf(target, [...conditions, condition]));', "typeof target === 'string' ? [[[...conditions, condition], target] as const] : []);")],
     [UNREAD_ROW]),
    ('E7-segment-check-narrowed-to-dotdot', REACH_TEST, [edit(REACH_KIT, FIRST_TEST, "    if (!target.includes('/../')) return [];\n")],
     [UNREAD_ROW, *[case(t, 'refuses') for t in REFUSES[1:]], *[case(t, 'warns') for t in WARNS]]),
    ('E8-refused-rule-case-sensitive', REACH_TEST, [edit(REACH_KIT, REFUSED_TAIL, REFUSED_TAIL.replace('/i;', '/;'))],
     [case('./dist/NODE_MODULES/index.js', 'refuses'), case('./dist/%2E/index.js', 'refuses'), case('./dist/%4Eode_modules/index.js', 'refuses')]),
    ('E9-empty-segment-rule-dropped', REACH_TEST, [edit(REACH_KIT, INVALID_TAIL, REFUSED_TAIL)], [case(t, 'warns') for t in WARNS]),
    # The PR 557 round-1 review's N3: RX3 (an encoded capital N dropped from both copies) and RX4 (require not a Node condition)
    # survived the suite at 9fd03a8e; the %4E case row and the require severity row each must now kill one.
    ('RX3-both-rules-drop-encoded-capital-n', REACH_TEST,
     [edit(REACH_KIT, INVALID_HEAD, INVALID_HEAD.replace('(n|%6e|%4e)', '(n|%6e)')), edit(REACH_KIT, REFUSED_HEAD, REFUSED_HEAD.replace('(n|%6e|%4e)', '(n|%6e)'))],
     [case('./dist/%4Eode_modules/index.js', 'refuses')]),
    ('RX4-require-not-a-node-condition', REACH_TEST, [edit(REACH_KIT, "'node', 'import', 'require',", "'node', 'import',")], [UNREAD_ROW]),
    # The review's N2: a condition key with a /../ segment stays refused; the key check dropped fails the key row alone.
    ('K1-condition-key-check-dropped', REACH_TEST, [edit(REACH_KIT, ".filter(([, key]) => key.includes('/../'))", '.filter(() => false)')], [KEY_ROW]),
    # Item 7 (round 2's N3, the reviewer's M4): a target under a condition Node does not read, or a main, exempted.
    ('M4-types-condition-exempt', REACH_TEST, [edit(REACH_KIT, FIRST_TEST, FIRST_TEST.replace(") return [];", " || conditions.includes('types')) return [];"))],
     [UNREAD_ROW]),
    ('M4b-source-condition-exempt', REACH_TEST, [edit(REACH_KIT, FIRST_TEST, FIRST_TEST.replace(") return [];", " || conditions.includes('source')) return [];"))],
     [UNREAD_ROW]),
    ('M6-main-exempt', REACH_TEST, [edit(REACH_KIT, FIRST_TEST, FIRST_TEST.replace(") return [];", ' || main) return [];'))], [UNREAD_ROW]),
    # The messages and their order.
    ('R1-severity-order-dropped', REACH_TEST, [edit(REACH_KIT, '[...faults, ...keyFaults].sort((a, b) => a.rank - b.rank)[0]?.message', '[...faults, ...keyFaults][0]?.message')],
     [UNREAD_ROW]),
    ('R2-unread-target-claims-node-refuses', REACH_TEST,
     [edit(REACH_KIT, "[2, main ? 'which Node reads without its exports rules' : 'which Node does not read']", "[0, 'which Node refuses (ERR_INVALID_PACKAGE_TARGET)']")],
     [UNREAD_ROW]),
    ('R3-empty-segment-claims-node-refuses', REACH_TEST,
     [edit(REACH_KIT, "[1, 'which Node accepts with a deprecation warning (DEP0166)']", "[0, 'which Node refuses (ERR_INVALID_PACKAGE_TARGET)']")],
     [UNREAD_ROW, *[case(t, 'warns') for t in WARNS]]),
    ('R4-default-not-a-node-condition', REACH_TEST, [edit(REACH_KIT, "'node-addons', 'default']", "'node-addons']")], [UNREAD_ROW]),
    # Item 5 (round 2's N1): the uniform /../ entry in the real workspace, source included, fails the S10 file at load; with the
    # check dropped as well it passes, since the resolver reads the source condition and joins the segment away (the residual).
    ('E4S-uniform-dotdot-entry-source-included', NO_EGRESS, [edit(DOSSIER_PKG, STATE, STATE_DOTDOT)], ['file: ' + E4S_MESSAGE[:160]]),
    ('E1E4S-residual-check-dropped-and-uniform-entry', NO_EGRESS, [edit(DOSSIER_PKG, STATE, STATE_DOTDOT), edit(REACH_KIT, CHECK, '')], []),
    # Item 6 (round 2's N2, the reviewer's M5): the object-rest arm of the write reader, dropped, fails the new row alone.
    ('W4-write-reader-object-rest-arm-dropped', PURITY,
     [edit(PURITY, ' : ts.isSpreadAssignment(property) ? targets(property.expression) : []', ' : []')],
     [WRITE_READER + '"({ ...Object.freeze } = {});"']),
    # Item 8 (round 2's N4): an alias in shorthand, which the text check misses. S2's wrong target also fails the suite load row;
    # S3's right target fails nothing but the new row.
    ('S2-shorthand-alias-wrong-target', [GUARD, REACH_TEST], [edit(CONFIG, CONFIG_HEAD, ALIAS_WRONG)], [CONFIG_ROW, LOAD_ROW]),
    ('S3-shorthand-alias-right-target', [GUARD, REACH_TEST], [edit(CONFIG, CONFIG_HEAD, ALIAS_RIGHT)], [CONFIG_ROW]),
    ('S4-key-walk-one-level-deep', GUARD, [edit(GUARD, WALK, '[[...at, key]]')], [CONFIG_ROW, WALK_ROW]),
    ('S5-alias-key-matched-by-substring', GUARD, [edit(GUARD, "path.at(-1) === 'alias'", "path.at(-1)!.includes('alias')")], [WALK_ROW]),
    ('S6-key-walk-skips-arrays', GUARD,
     [edit(GUARD, "  if (typeof value !== 'object' || value === null) return [];\n  return Object.entries(value).flatMap(",
           "  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];\n  return Object.entries(value).flatMap(")],
     [CONFIG_ROW, WALK_ROW]),
    # The review's F2: the config row no longer pins the globalSetup to the ninth project, so RX7 (the projects reordered) passes.
    ('RX7-projects-reordered', GUARD, app_first, []),
    # The pin tool: a test expectation or a copied rule that disagrees with Node fails it.
    ('T1-pin-tool-test-expectation-changed', 'tool', [edit(REACH_TEST, "['./dist//index.js', 'warns']", "['./dist//index.js', 'loads']")], 1),
    ('T2-pin-tool-refused-rule-case-sensitive', 'tool', [edit(REACH_KIT, REFUSED_TAIL, REFUSED_TAIL.replace('/i;', '/;'))], 1),
    ('T3-pin-tool-empty-segment-rule-dropped', 'tool', [edit(REACH_KIT, INVALID_TAIL, REFUSED_TAIL)], 1),
]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def run_tool(clone, tmpdir):
    proc = subprocess.run(['node', PIN_TOOL], cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=600)
    return {'exit': proc.returncode, 'stdout': proc.stdout.strip()[:400], 'stderrTail': proc.stderr[-400:]}


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    lane614 = load(clone, LANE_614, 'lane614')
    lane46 = load(clone, LANE_46, 'lane46')
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = lane614.dist_dirs(clone)
    built = sorted(f'{project}/dist' for project in json.load(open(os.path.join(clone, 'package.json')))['scripts']['build'].split()[2:])
    assert (dist == 'absent' and present == []) or (dist == 'present' and present == built), (dist, present, built)
    rows = []
    for rid, test, edits, want in ROWS:
        if callable(edits):
            edits = edits(clone)
        undo = lane614.apply(clone, edits)
        try:
            res = run_tool(clone, tmpdir) if test == 'tool' else lane614.run(clone, test, tmpdir)
        finally:
            lane614.restore(undo)
        if test == 'tool':
            failing = None
            ok = res['exit'] == want
        else:
            failing = lane46.failing_set(res)
            ok = 'error' not in res and failing == sorted(want) and (res['exit'] == 0) == (want == [])
        rows.append({'id': rid, 'test': test, 'edits': edits, 'expected': sorted(want) if isinstance(want, list) else want, 'failing': failing,
                     'asExpected': ok, **{k: res.get(k) for k in ('exit', 'passed', 'failed', 'total', 'failedFiles', 'fileMessages', 'error', 'stdout')}})
        print(rid, 'as expected' if ok else 'UNEXPECTED', res.get('exit'), res.get('passed'), res.get('failed'), failing if failing is not None else res.get('stdout'), flush=True)
    status = git('status', '--porcelain')
    summary = {'rows': len(rows), 'asExpected': sum(r['asExpected'] for r in rows), 'unexpected': [r['id'] for r in rows if not r['asExpected']]}
    json.dump({'commit': commit, 'dist': dist, 'distDirs': present,
               'importedTools': {LANE_614: sha256_file(os.path.join(clone, LANE_614)), LANE_46: sha256_file(os.path.join(clone, LANE_46))},
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status))


if __name__ == '__main__':
    main()
