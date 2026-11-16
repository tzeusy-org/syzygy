"""syzygy-bpyt.8.39: derive summary.json from the raw outputs beside it, checking each against the git objects of the tree given.

The subject is the code commits over BASE (main after PR 487), ending at HEAD: FIRST, the PR 536 review's notes N1, N2 and N4, and
N3's optional comment clause; REPAIR1, the repair of round 1 of this bead's own review (R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-1): F1's
`npm:` clause, N1's two rows and N2's residual; REPAIR2, the repair of round 2 (R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-2): F1's six-line
`npm:` clause and N2's dated count, comment lines only; then HEAD, the repair of round 3 (R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3): F1's
six `npm:` lines, scoped per declaration, comment lines only. Inputs (all in this directory):
  rev536-at-base.json, rev536-at-head.json  all 11 of the PR 536 reviewer's mutants, run unchanged from
                       docs/evidence/guard-pins-followup-review-2026-10-27/rev536-specs.json at BASE and at HEAD, with that
                       reviewer's copy of mut.py (the PR 524 reviewer's runner);
  rev541-at-base.json, rev541-at-head.json  all 7 of the round-1 reviewer's own mutants, from rev541-specs.json here (that reviewer's
                       file, kept unchanged), at BASE and at HEAD, with the same mut.py;
  island-diff.json, island-diff-selftest.json  docs/evidence/syzygy-bpyt-8-36/island_diff.py, old testkit (BASE) against new (HEAD);
  repeat-runs.json, titles.json  docs/evidence/syzygy-bpyt-8-36/repeat.py (the four guard files five times at HEAD) and titles.py
                       (their Vitest titles at both commits);
  comment-only.json    comment_only.cjs here: the testkit's comment-free emit and comment-free print at BASE and HEAD, with its selftest;
  npa-probe.json       npa_probe.cjs here: npm-package-arg's type for every version form the testkit comment and the rows name;
  npm-alias-probe.json  npm_alias_probe.py here: what npm installs, offline, for an `npm:` alias under a workspace's name or another;
  suite.json           suite_summary.py here, over Vitest JSON reports of the whole suite in a clean clone at REPAIR1, which differs
                       from HEAD only in testkit comment lines (checked).
The test diff must be exactly the PR 536 reviewer's FIX-rows-only edits (rev536-fix-specs.json), then the round-1 reviewer's
FIX541-rows-only edits (rev541-fix-specs.json here, kept unchanged), applied to BASE.
repeat-runs.json, titles.json, npa-probe.json and npm-alias-probe.json carry no commit of their own; each is tied to HEAD by its
content: the repeat total is HEAD's title count, every added title's row is in HEAD's blob and not BASE's, the npa probe's pattern
line is HEAD's, and the npm probe's outcomes are the ones HEAD's `npm:` clause states.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, posixpath, re, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE_REL = 'docs/evidence/syzygy-bpyt-8-39'
HERE = TREE / HERE_REL
BASE = 'd38d7a3ce632a34c2a41bdb77ad323ba0b05b777'
FIRST = '308a62f4a48e47b625aeff9cc718b1b2c37161f8'
REPAIR1 = '5f0d5547dfe7f89adf3e86310f819ddeebfaae90'
REPAIR2 = '00b7dcf70b764b13017784581bc80a5a3502532f'
HEAD = 'c5fe2d4054f274adbea9eb1f8b38f2b43189b9d1'
REACH = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
OLD_KIT = 'packages/polaris-generation-core/src/zz-836-old-testkit.ts'  # island_diff.py's scratch copy of BASE's testkit
CODE = [REACH, KIT]
GUARDS = ['packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts', REACH]
REVIEW_DIR = 'docs/evidence/guard-pins-followup-review-2026-10-27'
RUNNER = f'{REVIEW_DIR}/tools/mut.py'
RUNNER_524 = 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py'
REVIEW_SPECS = f'{REVIEW_DIR}/rev536-specs.json'
FIX_SPECS = f'{REVIEW_DIR}/rev536-fix-specs.json'
# The round-1 reviewer's spec files, kept here unchanged: their sha256 as that review's raw lists them (its section 8).
SPECS_541 = {'rev541-specs.json': '3f9d1900546b54413766d95a3790db1114ac10f51a79313fcae0d678509d63e7',
             'rev541-fix-specs.json': '50d59d9550e333892885ef3f8c082bf472f9c772d765cb3991a3377a99fe0f20'}
TOOLS = {name: f'docs/evidence/syzygy-bpyt-8-36/{name}' for name in ('island_diff.py', 'titles.py', 'repeat.py')}
OWN_TOOLS = ['comment_only.cjs', 'npa_probe.cjs', 'npm_alias_probe.py', 'suite_summary.py', 'record.py']
WS = f'{REACH} > the shared workspace resolver > '
NAMING = lambda label: f'{WS}reads a bare name declared as {label} as naming no module'
ROOT_DECLARES = f"{WS}reads a bare name the workspace root's manifest declares as a local dependency as naming no module"
# Each of the PR 536 review's N1 and N2 targets, and the new rows that must be its only failures at HEAD. M7 has two: the round-1
# repair's unversioned alias row kills it too.
TARGETS = {
    'RV536-M2-http-url-reads-outside': [NAMING('a remote http tarball URL dependency')],
    'RV536-M7-npm-alias-workspace-scope-only': [NAMING('an npm: alias of a registry package'), NAMING('an npm: alias with no version')],
    'RV536-M8-root-declarations-unread': [ROOT_DECLARES],
    'RV536-M9-dotdot-alone-outside': [NAMING('a dependency on its parent directory')],
}
# Survivors at both commits, as the review ruled them: M5 and M10 equivalent on the tree, M11 the named 8.38 residual.
RESIDUAL = ['RV536-M5-tree-depth-two', 'RV536-M10-test-exclusion-end-anchor-dropped', 'RV536-M11-residual-widened']
# The round-1 reviewer's mutants: all 7 survive at BASE; at HEAD, each target is killed by these rows alone (X3 and X5 by N1's rows),
# and X1 and X4 survive, as that review ruled them (its section 7).
TARGETS_541 = {
    'R541-X2-root-devDependencies-unread': [ROOT_DECLARES],
    'R541-X3-npm-alias-needs-version': [NAMING('an npm: alias with no version')],
    'R541-X5-tarball-arm-skips-hash': [NAMING('a git dependency whose spec ends in a tarball extension')],
    'R541-X6-unscoped-manifests-unread': [ROOT_DECLARES],
    'R541-X7-http-url-tgz-only': [NAMING('a remote http tarball URL dependency')],
}
RESIDUAL_541 = ['R541-X1-root-reads-devDependencies-only', 'R541-X4-npm-arm-case-sensitive']
# The 6 titles this bead adds, each with the row literal that must be in HEAD's blob and not in BASE's.
ADDED = {
    ROOT_DECLARES: (REACH, '''  it("reads a bare name the workspace root's manifest declares as a local dependency as naming no module", () => {\n'''),
    **{NAMING(label): (REACH, f"    ['{label}', 'dossier', {{ dependencies: {{ dossier: '{version}' }} }}, {{}}],\n") for label, version in (
        ('a remote http tarball URL dependency', 'http://example.com/lib-1.0.0.tar.gz'), ('an npm: alias of a registry package', 'npm:typescript@^5.5.0'),
        ('a dependency on its parent directory', '..'), ('a git dependency whose spec ends in a tarball extension', 'github:someone/dossier#v1.tar'),
        ('an npm: alias with no version', 'npm:typescript'))},
}
# npm-package-arg's type for each form the testkit comment names, as the comment states it.
CLAIMS = {**{f: 'directory' for f in ('file:../x', '.', '..', './x', '../x', '/x', '~/x')}, **{f: 'file' for f in ('x.tgz', 'x.tar', 'x.tar.gz')},
          'link:../x': 'throws EUNSUPPORTEDPROTOCOL', 'workspace:*': 'throws EUNSUPPORTEDPROTOCOL', 'npm:@syzygy/lib@*': 'alias',
          'npm:typescript@^5.5.0': 'alias', 'https://example.com/x.tgz': 'remote', 'http://example.com/x.tgz': 'remote',
          'github:someone/dossier#v1.tar': 'git', 'git+https://example.com/lib.tgz': 'git'}
# The comment's N4 premise: npm takes only a registry spec after `npm:`, and refuses any other.
REGISTRY_TYPES = {'range', 'version', 'tag'}
NOT_REGISTRY_ALIASES = ['npm:./lib', 'npm:file:../lib']
NAMED_IN_COMMENT = ['`npm:`', '`github:someone/dossier#v1.tar`', '`https://…/x.tgz`', 'npm-package-arg 12.0.2 accepts only a registry spec after `npm:`',
                    'Residual (the review of 8.39, N2): a workspace whose name is not `@syzygy/`-scoped is read by its bare name as outside the',
                    'At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped']
# The round-3 reviewer's text for the `npm:` clause (F1, f1-r3-replacement.txt), which HEAD's testkit must carry verbatim, and the
# phrases of the three texts it replaced: round 0's; round 1's, false for a declaration in the root's manifest (two of its phrases,
# as the round-3 review's N2 asks); and round 2's, false for a workspace's declaration when the root's manifest declares the same alias.
F1_CLAUSE = (' * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`. npm 11.5.1 skips each declaration in the\n'
          " *   root's manifest under a workspace's own name, whatever its version, and links that workspace. For every other declaration,\n"
          " *   npm fetches the alias's spec from the registry unless that declaration is under a workspace's own name and the alias's range\n"
          " *   is `*`, absent or one that workspace's version satisfies; then npm links the workspace, as for a plain range so declared.\n"
          ' *   Every workspace here is `@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name before this pattern. Its target may\n'
          " *   carry a workspace package's name, which other package managers can link locally; every alias is refused, failing closed.\n")
F1_CLAUSE_SHA256 = '2aad70a67dbcb898a27f7b5f09641ac77a8d3d5c9790970cfd42ddfb8f2ef432'  # f1-r3-replacement.txt, as the round-3 raw cites it
F1_RETIRED = ['npm installs it from the registry', "as for any dependency declared under a workspace's name",
              "and that workspace's version satisfies it", "either the root's manifest declares it"]
# What npm_alias_probe.py must observe for each case, keyed by the manifest that declares it (by the manifests, in order, when more
# than one does), as HEAD's `npm:` clause states it: a link to the workspace's directory, or a registry request for the name given
# (offline, so ENOTCACHED).
NPM_EXPECTED = {
    ('app', 'dossier', 'npm:typescript@^5.5.0'): ('registry', 'typescript'), ('app', 'dossier', 'npm:wlib@*'): ('registry', 'wlib'),
    ('app', 'dossier', 'npm:typescript'): ('registry', 'typescript'), ('app', 'wlib', 'npm:typescript@*'): ('link', 'w'),
    ('app', 'wlib', 'npm:typescript@^1.0.0'): ('link', 'w'), ('app', 'wlib', 'npm:typescript@^5.5.0'): ('registry', 'typescript'),
    ('app', '@syzygy/slib', 'npm:typescript@*'): ('link', 's'), ('app', 'wlib', '^1.0.0'): ('link', 'w'),
    ('app', 'wlib', '^5.5.0'): ('registry', 'wlib'), ('app', 'wlib', 'npm:typescript'): ('link', 'w'),
    # Round 2: npm skips a root declaration under a workspace's name, whatever its version, and links the workspace.
    ('root', 'wlib', 'npm:typescript@^5.5.0'): ('link', 'w'), ('root', '@syzygy/slib', 'npm:typescript@^5.5.0'): ('link', 's'),
    ('root', 'wlib', '^5.5.0'): ('link', 'w'), ('root', 'dossier', 'npm:typescript@^5.5.0'): ('registry', 'typescript'),
    # Round 3: the root's declaration is skipped, and app's same declaration is read by its own range, so npm fetches it.
    (('root', 'app'), 'wlib', 'npm:typescript@^5.5.0'): ('registry', 'typescript'),
}
NPM_REGISTRY = 'http://127.0.0.1:9/'
RESIDUAL_FORMS = ['packages/polaris-dossier/', '.hidden-lib', 'a/b/c']
OUTSIDE_VERSIONS = ['2.9.0', '^1.0.0', 'github:someone/dossier', '~1.2.3', 'git+https://example.com/lib.tgz.git']
LOCAL_VERSION = re.compile(r'^(?:file:|link:|workspace:|npm:|\.\.?(?:/|$)|/|~/)|\.(?:tgz|tar|tar\.gz)$', re.I)
# The whole suite's five skips: the strace capture this host cannot run, and four tests gated on a live Butlers checkout or a browser.
SKIPS = ['apps/three-surface-poc/src/polaris-opening-index.browser.test.ts', 'apps/three-surface-poc/src/project-shape-discovery.live.test.ts',
         'packages/polaris-dossier/src/no-egress.test.ts', 'packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts',
         'packages/three-surface-poc-core/src/work-items.live.test.ts']
WHOLE = 'npx vitest run --reporter=json'
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], check=True, capture_output=True, text=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def blob(commit, path, cache={}):
    key = (commit, path)
    if key not in cache:
        try:
            cache[key] = git('show', f'{commit}:{path}')
        except subprocess.CalledProcessError:
            cache[key] = None
    return cache[key]


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hooked(key, value):
    """A git-derived value, which --selftest may replace through MUTATE['@<key>']."""
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def named(where):
    """The manifest, or manifests, that declare an npm probe case, as a label."""
    return where if isinstance(where, str) else ' and '.join(where)


def row(line):
    """A mut.py FAIL line, less its project: `<file> > <describe> > <title>`."""
    match = re.fullmatch(r'FAIL\s+\S+\s+(\S.*)', line.strip())
    return match.group(1) if match else line


def check_runs(name, commit, specs, problems):
    d = load(name)
    if d['head'] != commit:
        problems.append(f'{name}: ran at {d["head"]}, not {commit}')
    rows = {}
    for r in d['results']:
        spec = specs.get(r['id'])
        if spec is None:
            problems.append(f'{name} {r["id"]}: no such spec')
            continue
        if r.get('edits') != spec['edits']:
            problems.append(f'{name} {r["id"]}: edits differ from the spec')
        for e in spec['edits']:
            if 'old' in e and (blob(commit, e['file']) or '').count(e['old']) != 1:
                problems.append(f'{name} {r["id"]}: old fragment does not occur once in {e["file"]} at {commit[:8]}')
        expected = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if r.get('outcome') != expected:
            problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} disagrees with exit {r.get("exit")} and {len(r.get("failed", []))} failed rows')
        if r.get('timeouts'):
            problems.append(f'{name} {r["id"]}: {r["timeouts"]} timeouts, so a failure may be load, not the mutant')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: tree not clean after')
        rows[r['id']] = {'outcome': r.get('outcome'), 'failedRows': sorted(row(f) for f in r.get('failed', [])), 'tests': r.get('tests')}
    missing = sorted(set(specs) - set(rows))
    if missing:
        problems.append(f'{name}: {len(missing)} specs never ran: {missing[:3]}')
    return rows


def diff_lines(path, a=BASE, b=HEAD):
    """Every changed line of `path`, a to b, as (sign, line number on its side, text)."""
    out, old, new = [], None, None
    for line in git('diff', '-U0', a, b, '--', path).splitlines():
        hunk = re.match(r'@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', line)
        if hunk:
            old, new = int(hunk.group(1)), int(hunk.group(2))
        elif old is None:
            continue  # the header, before the first hunk
        elif line.startswith('-'):
            out.append(['-', old, line[1:]])
            old += 1
        elif line.startswith('+'):
            out.append(['+', new, line[1:]])
            new += 1
    return hooked(f'lines {path}' if (a, b) == (BASE, HEAD) else f'lines {path} {a[:8]}', out)


def doc_comment_span(text):
    """The 1-based first and last lines of the doc comment directly above `const LOCAL_VERSION`."""
    lines = text.splitlines()
    at = [i for i, line in enumerate(lines) if line.startswith('const LOCAL_VERSION = ')]
    if len(at) != 1 or not lines[at[0] - 1].endswith('*/'):
        return None
    start = max(i for i in range(at[0]) if lines[i].startswith('/**'))
    if any('*/' in line for line in lines[start:at[0] - 1]):
        return None
    return start + 1, at[0]


def apply_fix(text, edits, problems):
    for e in edits:
        if e['file'] != REACH or text.count(e['old']) != 1:
            problems.append(f'fix: an edit is not to {REACH} or its old text does not occur once where it applies')
            continue
        text = text.replace(e['old'], e['new'])
    return text


def main_summary():
    problems = []
    tracked = [p for p in git('ls-tree', '-r', '--name-only', '-z', HEAD).split('\0') if p]
    manifests = [p for p in tracked if p == 'package.json' or re.fullmatch(r'(?:apps|packages)/[^/]+/package\.json', p)]
    review = {m['id']: m for m in json.loads(blob(HEAD, REVIEW_SPECS) or '{"mutants": []}')['mutants']}
    if blob(BASE, REVIEW_SPECS) != blob(HEAD, REVIEW_SPECS) or len(review) != 11:
        problems.append('the reviewer specs differ between BASE and HEAD, or are not 11')
    base = check_runs('rev536-at-base.json', BASE, review, problems)
    head = check_runs('rev536-at-head.json', HEAD, review, problems)
    for i, own_rows in TARGETS.items():
        b, h = base.get(i, {}), head.get(i, {})
        if (b.get('outcome'), h.get('outcome')) != ('survives', 'killed'):
            problems.append(f'{i}: {b.get("outcome")} at base, {h.get("outcome")} at head')
        if h.get('failedRows') != sorted(own_rows):
            problems.append(f'{i}: killed at head by {h.get("failedRows")}, not by its own rows alone')
    for i in RESIDUAL:
        if (base.get(i, {}).get('outcome'), head.get(i, {}).get('outcome')) != ('survives', 'survives'):
            problems.append(f'{i}: the residual is not a survivor at both commits')
    compare = {'stronger': [], 'unchanged': [], 'weaker': []}
    for i in sorted(set(review) - set(TARGETS) - set(RESIDUAL)):
        b, h = base.get(i), head.get(i)
        if b is None or h is None:
            continue
        if b['outcome'] != 'killed' or h['outcome'] != 'killed' or not set(b['failedRows']) <= set(h['failedRows']):
            compare['weaker'].append(i)
        else:
            compare['stronger' if set(h['failedRows']) > set(b['failedRows']) else 'unchanged'].append(i)
    if compare['weaker']:
        problems.append(f'weaker at head, or not killed at base: {compare["weaker"]}')

    for name, digest in SPECS_541.items():
        if hooked(f'sha {name}', sha((HERE / name).read_text())) != digest:
            problems.append(f"{name}: not the round-1 reviewer's file, by the sha256 its raw lists")
    review541 = {m['id']: m for m in load('rev541-specs.json')['mutants']}
    if sorted(review541) != sorted([*TARGETS_541, *RESIDUAL_541]):
        problems.append(f'rev541-specs.json: the mutants are not the 7 named here: {sorted(review541)}')
    base541 = check_runs('rev541-at-base.json', BASE, review541, problems)
    head541 = check_runs('rev541-at-head.json', HEAD, review541, problems)
    for i in review541:
        if base541.get(i, {}).get('outcome') != 'survives':
            problems.append(f'{i}: {base541.get(i, {}).get("outcome")} at base, not a survivor')
    for i, own_rows in TARGETS_541.items():
        if (head541.get(i, {}).get('outcome'), head541.get(i, {}).get('failedRows')) != ('killed', sorted(own_rows)):
            problems.append(f'{i}: {head541.get(i, {}).get("outcome")} at head by {head541.get(i, {}).get("failedRows")}, not by its own row alone')
    for i in RESIDUAL_541:
        if head541.get(i, {}).get('outcome') != 'survives':
            problems.append(f'{i}: the named survivor is {head541.get(i, {}).get("outcome")} at head')

    fix = {m['id']: m for m in json.loads(blob(HEAD, FIX_SPECS) or '{"mutants": []}')['mutants']}.get('FIX-rows-only', {'edits': []})
    fix541 = {m['id']: m for m in load('rev541-fix-specs.json')['mutants']}.get('FIX541-rows-only', {'edits': []})
    first_fixed = apply_fix(blob(BASE, REACH) or '', fix['edits'], problems)
    fixed = hooked('fixed', apply_fix(first_fixed, fix541['edits'], problems))
    if not fix['edits'] or not fix541['edits'] or first_fixed != blob(FIRST, REACH) or fixed != blob(HEAD, REACH):
        problems.append("fix: FIRST's test file is not FIX-rows-only applied to BASE, or HEAD's is not FIX541-rows-only applied to FIRST's")
    reach_lines = diff_lines(REACH)
    if any(sign == '-' for sign, _, _ in reach_lines):
        problems.append(f'{REACH}: the subject removes a line')

    kit_lines = diff_lines(KIT)
    spans = {'-': doc_comment_span(blob(BASE, KIT) or ''), '+': doc_comment_span(blob(HEAD, KIT) or '')}
    outside = [line for line in kit_lines if spans[line[0]] is None or not spans[line[0]][0] < line[1] <= spans[line[0]][1]
               or not re.match(r' \* ', line[2])]
    if not kit_lines or outside:
        problems.append(f'testkit: a changed line is not a ` * ` line inside the LOCAL_VERSION doc comment: {outside[:1]}')
    only = load('comment-only.json')
    st = only.get('selftest', {})
    if (only['file'], only['base'], only['head'], only['baseSha256'], only['headSha256'], only['bytesDiffer'], only['emitEqual'], only['printEqual']) \
            != (KIT, BASE, HEAD, sha(blob(BASE, KIT) or ''), sha(blob(HEAD, KIT) or ''), True, True, True):
        problems.append("comment-only: not BASE's and HEAD's testkit, or the comment-free emit or print differs")
    if st.get('identifierRenamed') != {'emitEqual': False, 'printEqual': False} or st.get('literalChanged') != {'emitEqual': False, 'printEqual': False} \
            or st.get('commentAdded') != {'emitEqual': True, 'printEqual': True}:
        problems.append('comment-only: the selftest does not separate a code change from a comment change')

    diff, selftest = load('island-diff.json'), load('island-diff-selftest.json')
    tool = sha(blob(HEAD, TOOLS['island_diff.py']) or '')
    for d, label in ((diff, 'island-diff'), (selftest, 'island-diff-selftest')):
        if (d['base'], d['head'], d['cleanAfter'], d['vitestExit'], d['toolSha256']) != (BASE, HEAD, True, 0, tool):
            problems.append(f'{label}: base, head, clean tree, exit or tool digest is not as required')
        if d.get('scratchSha256', {}).get(OLD_KIT) != sha(blob(BASE, KIT) or ''):
            problems.append(f"{label}: the old testkit it compared is not BASE's testkit blob")
    if diff['selftest'] or diff['walks']['equal'] != diff['walks']['entries'] or diff['resolves']['equal'] != diff['resolves']['specifiers'] \
            or diff['walks']['unequal'] or diff['resolves']['unequal']:
        problems.append('island-diff: an answer differs')
    if not selftest['selftest'] or selftest['walks']['equal'] == selftest['walks']['entries'] or selftest['resolves']['equal'] == selftest['resolves']['specifiers']:
        problems.append('island-diff-selftest: the mutated testkit changed no answer')

    titles = load('titles.json')
    added = [f'{f} > {n}' for f, n in titles['addedNames']]
    per_file = titles['perFile']
    if titles['removed'] or titles['removedNames'] or titles['added'] != len(added) or titles['head'] - titles['base'] != len(added) \
            or sum(v['base'] for v in per_file.values()) != titles['base'] or sum(v['head'] for v in per_file.values()) != titles['head'] \
            or titles['duplicatesBase'] or titles['duplicatesHead']:
        problems.append('titles: a title was removed, the arithmetic does not close, or a title is duplicated')
    if sorted(added) != sorted(ADDED):
        problems.append(f'titles: added {sorted(set(added) ^ set(ADDED))[:2]} beyond or short of the {len(ADDED)} titles this bead adds')
    for title, (path, fragment) in ADDED.items():
        if (blob(HEAD, path) or '').count(fragment) != 1 or fragment in (blob(BASE, path) or ''):
            problems.append(f'titles: the row of {title.rsplit(" > ", 1)[-1]!r} is not new at HEAD')
    repeat = load('repeat-runs.json')
    if len(repeat['runs']) < 5 or any(r['exit'] or r['failed'] or r['passed'] != r['total'] or r['total'] != titles['head'] for r in repeat['runs']):
        problems.append("repeat-runs: fewer than 5 ran, a run failed, or a total is not HEAD's title count")

    probe = load('npa-probe.json')
    pattern = [line for line in (blob(HEAD, KIT) or '').splitlines() if line.startswith('const LOCAL_VERSION = ')]
    base_pattern = [line for line in (blob(BASE, KIT) or '').splitlines() if line.startswith('const LOCAL_VERSION = ')]
    if probe['pattern'] != (pattern[0] if len(pattern) == 1 else None) or pattern != base_pattern or probe['npaVersion'] != '12.0.2':
        problems.append("npa-probe: not HEAD's pattern line, the pattern moved since BASE, or not npm-package-arg 12.0.2")
    comment = {r['spec']: r for r in probe['comment']}
    for form, kind in CLAIMS.items():
        if (comment.get(form, {}).get('npa'), comment.get(form, {}).get('local')) != (kind, True):
            problems.append(f'npa-probe: {form} is not {kind} and refused')
    aliases = [r for r in [*probe['comment'], *probe['rows']] if r['npa'] == 'alias']
    if not aliases or any(r.get('aliasOf') not in REGISTRY_TYPES for r in aliases) \
            or any(comment.get(form, {}).get('npa') != 'throws aliases only work for registry deps' for form in NOT_REGISTRY_ALIASES):
        problems.append('npa-probe: npm takes an alias of a spec that is not a registry spec')
    kit = hooked('kit', blob(HEAD, KIT) or '')
    for words in NAMED_IN_COMMENT:
        if words not in kit:
            problems.append(f'testkit comment: does not name {words}')
    if kit.count(F1_CLAUSE) != 1 or any(words in kit for words in F1_RETIRED) or hooked('f1 sha', sha(F1_CLAUSE)) != F1_CLAUSE_SHA256:
        problems.append("testkit comment: the `npm:` clause is not the round-3 reviewer's text, or a retired phrase remains")
    workspaces = hooked('workspaces', {p: json.loads(blob(HEAD, p))['name'] for p in manifests if p != 'package.json'})
    if json.loads(blob(HEAD, 'package.json')).get('workspaces') != ['packages/*', 'apps/*'] or len(workspaces) != 12 \
            or [name for name in workspaces.values() if not name.startswith('@syzygy/')]:
        problems.append(f'workspaces: not the 12 `@syzygy/`-scoped ones the N2 residual counts: {sorted(workspaces.values())}')
    for form in RESIDUAL_FORMS:
        if (comment.get(form, {}).get('npa'), comment.get(form, {}).get('local')) != ('directory', False) or f'`{form}`' not in kit:
            problems.append(f'npa-probe: the residual {form} is not a directory npm reads that the pattern leaves outside, named in the comment')
    for r in probe['rows']:
        if f": '{r['spec']}' }}" not in (blob(HEAD, REACH) or '') or r['local'] != (r['spec'] not in OUTSIDE_VERSIONS):
            problems.append(f'npa-probe: the row version {r["spec"]} is not in HEAD\'s rows, or sits on the wrong side')
    if sorted(r['spec'] for r in probe['rows'] if not r['local']) != sorted(OUTSIDE_VERSIONS):
        problems.append('npa-probe: the outside rows are not the five controls')

    npm = load('npm-alias-probe.json')
    if (npm['npm'], npm['registry'], npm['offline'], npm['workspaces']) != ('11.5.1', NPM_REGISTRY, True, {'w': 'wlib', 's': '@syzygy/slib'}):
        problems.append('npm-alias-probe: not npm 11.5.1, offline against the unreachable registry, over the two workspaces')
    declared = [(tuple(w) if isinstance(w := r.get('declaredIn'), list) else w, *next(iter(r['declared'].items())))
                for r in npm['results'] if len(r['declared']) == 1]
    if sorted(declared, key=repr) != sorted(NPM_EXPECTED, key=repr) or len(declared) != len(npm['results']):
        problems.append(f'npm-alias-probe: the cases are not the {len(NPM_EXPECTED)} named here, each once')
    for r, (where, name, spec) in zip(npm['results'], declared):
        kind, what = NPM_EXPECTED.get((where, name, spec), (None, None))
        link = r['installedLink'] and posixpath.normpath(posixpath.join(posixpath.dirname(f'node_modules/{name}'), r['installedLink']))
        observed = ('link', what) if (r['lockExit'], r['lockEntry'], r['installExit'], link, r['appLoads']) == (
            0, {'resolved': what, 'link': True}, 0, what, {'packageJson': f'{what}/package.json', 'name': npm['workspaces'].get(what), 'version': '1.0.0'}) \
            else ('registry', r['wouldRequest'][len(NPM_REGISTRY):]) if r['lockExit'] and r['errorCode'] == 'ENOTCACHED' and (r['wouldRequest'] or '').startswith(NPM_REGISTRY) \
            and (r['lockEntry'], r['installExit'], r['installedLink'], r['appLoads']) == (None, None, None, None) else None
        if observed != (kind, what):
            problems.append(f'npm-alias-probe: {named(where)} {name}: {spec} gives {observed}, not {(kind, what)} as the `npm:` clause states')

    suite = load('suite.json')
    whole = {r['label']: r for r in suite['runs']}.get('whole', {})
    if suite['commit'] != REPAIR1 or not suite['cleanAfter'] or [r['label'] for r in suite['runs']] != ['whole'] or whole.get('command') != WHOLE:
        problems.append('suite: not one run of the whole suite in a clean tree at REPAIR1')
    # The suite ran at REPAIR1; HEAD may differ from it only in ` * ` lines inside the testkit's LOCAL_VERSION doc comment.
    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]
    late = diff_lines(KIT, REPAIR1, HEAD)
    late_spans = {'-': doc_comment_span(blob(REPAIR1, KIT) or ''), '+': spans['+']}
    if since != [KIT] or not late or any(late_spans[s] is None or not late_spans[s][0] < n <= late_spans[s][1] or not re.match(r' \* ', text)
                                         for s, n, text in late):
        problems.append(f'suite: HEAD differs from REPAIR1 beyond testkit comment lines: {since}')
    not_passed = whole.get('notPassed', [])
    if not whole.get('success') or whole.get('failed') or whole.get('total') != whole.get('passed', 0) + whole.get('skipped', 0) \
            or whole.get('skipped') != len(not_passed) or sorted(t['file'] for t in not_passed) != SKIPS or any(t['status'] != 'skipped' for t in not_passed):
        problems.append('suite: a test failed, the totals do not close, or a test other than the five known skips did not run')
    if whole.get('files', 0) < 246:
        problems.append(f'suite: {whole.get("files")} files, fewer than the whole suite')

    runner = sha(blob(HEAD, RUNNER) or '')
    if runner != sha(blob(HEAD, RUNNER_524) or 'x'):
        problems.append("the mutant runner is not the PR 524 reviewer's mut.py")
    # Round 1's evidence commit sits between FIRST and HEAD, so the commits also touch this directory; nothing else may change.
    changed = hooked('names', [p for p in git('diff', '--name-only', BASE, HEAD).split() if not p.startswith(f'{HERE_REL}/')])
    if sorted(changed) != sorted(CODE):
        problems.append(f'the subject touches {changed}, not the two files')
    importers = hooked('importers', sorted(line.split(':', 1)[1] for line in git('grep', '-l', '-F', 'workspace-reach.testkit', HEAD, '--',
                                                                                 'apps', 'packages', 'scripts').split()))
    if importers != sorted(GUARDS):
        problems.append(f'the testkit is imported by {importers}, not the three guard tests')
    versions = [[p, field, name, version] for p in manifests for field in ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')
                for name, version in json.loads(blob(HEAD, p)).get(field, {}).items()]
    return {
        'bead': 'syzygy-bpyt.8.39', 'base': BASE, 'first': FIRST, 'head': HEAD,
        'subject': {'what': f'git diff {BASE[:8]} {HEAD[:8]} -- {" ".join(CODE)}', 'sha256': sha(git('diff', BASE, HEAD, '--', *CODE)),
                    'files': {f: {'base': sha(blob(BASE, f)), 'head': sha(blob(HEAD, f))} for f in CODE}},
        'repairs': {f'round{i}': {'what': f'git diff {a[:8]} {b[:8]} -- {" ".join(CODE)}', 'sha256': sha(git('diff', a, b, '--', *CODE))}
                    for i, (a, b) in ((1, (FIRST, REPAIR1)), (2, (REPAIR1, REPAIR2)), (3, (REPAIR2, HEAD)))},
        'suiteCommit': REPAIR1,
        'productFilesChanged': [f for f in changed if f not in CODE],
        'testkitImporters': importers,
        'mutRunnerSha256': runner,
        'targets': {i: {'base': base.get(i, {}).get('outcome'), 'head': head.get(i, {}).get('outcome'),
                        'headFailedRows': head.get(i, {}).get('failedRows')} for i in [*TARGETS, *RESIDUAL]},
        'otherReviewMutants': compare,
        'round1Mutants': {i: {'base': base541.get(i, {}).get('outcome'), 'head': head541.get(i, {}).get('outcome'),
                              'headFailedRows': head541.get(i, {}).get('failedRows')} for i in [*TARGETS_541, *RESIDUAL_541]},
        'fix': {'specs': [FIX_SPECS, f'{HERE_REL}/rev541-fix-specs.json'], 'specsSha256': [sha(blob(HEAD, FIX_SPECS) or ''), SPECS_541['rev541-fix-specs.json']],
                'edits': [len(fix['edits']), len(fix541['edits'])], 'headEqualsBaseWithFixes': fixed == blob(HEAD, REACH),
                'linesAdded': len(reach_lines), 'linesRemoved': 0},
        'testkit': {'changedLines': {'-': sum(1 for l in kit_lines if l[0] == '-'), '+': sum(1 for l in kit_lines if l[0] == '+')},
                    'docCommentLines': {'base': spans['-'], 'head': spans['+']},
                    'emitEqual': only['emitEqual'], 'printEqual': only['printEqual'], 'typescript': only['typescript'], 'selftest': st},
        'islandDiff': {'walks': {k: diff['walks'][k] for k in ('entries', 'equal', 'answersSha256')},
                       'resolves': {k: diff['resolves'][k] for k in ('files', 'specifiers', 'equal', 'byAnswer', 'answersSha256')},
                       'selftest': {'walksEqual': selftest['walks']['equal'], 'resolvesEqual': selftest['resolves']['equal']}, 'toolSha256': tool,
                       'oldTestkitSha256': diff.get('scratchSha256', {}).get(OLD_KIT)},
        'repeats': {'runs': len(repeat['runs']), 'passed': [r['passed'] for r in repeat['runs']], 'load1': [r['load1'] for r in repeat['runs']]},
        'titles': {'base': titles['base'], 'head': titles['head'], 'added': len(added), 'removed': titles['removed'], 'perFile': per_file,
                   'line': f'Tests: +{len(added)} ~0 -{titles["removed"]}'},
        'npaProbe': {'npaVersion': probe['npaVersion'], 'node': probe['node'], 'forms': len(probe['comment']) + len(probe['rows'])},
        'npmAliasProbe': {'npm': npm['npm'], 'arborist': npm['arborist'], 'node': npm['node'], 'cases': len(npm['results']),
                          'links': sorted(f'{named(w)} {n}: {s}' for (w, n, s), (k, _) in NPM_EXPECTED.items() if k == 'link'),
                          'registry': sorted(f'{named(w)} {n}: {s}' for (w, n, s), (k, _) in NPM_EXPECTED.items() if k == 'registry')},
        'workspaces': {'count': len(workspaces), 'unscoped': [n for n in workspaces.values() if not n.startswith('@syzygy/')]},
        'suite': {r['label']: {k: r[k] for k in ('command', 'files', 'total', 'passed', 'failed', 'skipped', 'load1Before', 'load1After')} for r in suite['runs']},
        'tools': {**{name: sha(blob(HEAD, path) or '') for name, path in TOOLS.items()},
                  **{name: sha((HERE / name).read_text()) for name in OWN_TOOLS}},
        'faithfulTree': {'manifests': len(manifests), 'dependencyVersions': len(versions),
                         'local': [v for v in versions if LOCAL_VERSION.search(v[3])],
                         'bareDirectoryShaped': [v for v in versions if ':' not in v[3] and ('/' in v[3] or v[3].startswith('.')) and not LOCAL_VERSION.search(v[3])]},
        'problems': problems,
    }


def first(d, i):
    return next(r for r in d['results'] if r['id'] == i)


def kill(r, rows=('FAIL   @syzygy/x  packages/x/src/x.test.ts > x > y',)):
    r.update(outcome='killed', exit=1, failed=list(rows))


def run(d, label):
    return next(r for r in d['runs'] if r['label'] == label)


def case(d, where, name, spec):
    return next(r for r in d['results'] if (r['declaredIn'], r['declared']) == (where, {name: spec}))


SELFTEST = {
    'a target that survives at head': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M8-root-declarations-unread').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a target killed at base': {'rev536-at-base.json': lambda d: (kill(first(d, 'RV536-M2-http-url-reads-outside')), d)[1]},
    'a target killed by another row too': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M7-npm-alias-workspace-scope-only')['failed'].append('FAIL   @syzygy/x  ' + ROOT_DECLARES), d)[1]},
    'a target never run at base': {'rev536-at-base.json': lambda d: (d.update(results=[r for r in d['results'] if r['id'] != 'RV536-M9-dotdot-alone-outside']), d)[1]},
    'a residual killed at head': {'rev536-at-head.json': lambda d: (kill(first(d, 'RV536-M5-tree-depth-two')), d)[1]},
    'a base kill lost at head': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M6-root-keeps-only-dependencies').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a base kill with a row lost at head': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M3-tarball-needs-dot-slash')['failed'].pop(0), d)[1]},
    'a run at another commit': {'rev536-at-head.json': lambda d: (d.update(head=BASE), d)[1]},
    'a run with a timeout': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M1-https-url-reads-outside').update(timeouts=1), d)[1]},
    'an outcome that disagrees with its exit': {'rev536-at-base.json': lambda d: (first(d, 'RV536-M4-census-takes-ts-md').update(exit=0), d)[1]},
    'a run whose edits are not its spec': {'rev536-at-base.json': lambda d: (first(d, 'RV536-M2-http-url-reads-outside')['edits'][0].update(new='x'), d)[1]},
    'a tree left dirty': {'rev536-at-head.json': lambda d: (first(d, 'RV536-M10-test-exclusion-end-anchor-dropped').update(cleanAfter=False), d)[1]},
    'a round-1 target that survives at head': {'rev541-at-head.json': lambda d: (first(d, 'R541-X3-npm-alias-needs-version').update(outcome='survives', exit=0, failed=[]), d)[1]},
    'a round-1 target killed at base': {'rev541-at-base.json': lambda d: (kill(first(d, 'R541-X5-tarball-arm-skips-hash')), d)[1]},
    'a round-1 target killed by another row too': {'rev541-at-head.json': lambda d: (first(d, 'R541-X5-tarball-arm-skips-hash')['failed'].append('FAIL   @syzygy/x  ' + ROOT_DECLARES), d)[1]},
    'a round-1 survivor killed at head': {'rev541-at-head.json': lambda d: (kill(first(d, 'R541-X1-root-reads-devDependencies-only')), d)[1]},
    'a round-1 run at another commit': {'rev541-at-base.json': lambda d: (d.update(head=HEAD), d)[1]},
    'a round-1 run missing a mutant': {'rev541-at-head.json': lambda d: (d.update(results=[r for r in d['results'] if r['id'] != 'R541-X4-npm-arm-case-sensitive']), d)[1]},
    "a round-1 spec file that is not the reviewer's": {'@sha rev541-specs.json': lambda digest: '0' * 64},
    "a round-1 fix spec file that is not the reviewer's": {'@sha rev541-fix-specs.json': lambda digest: '0' * 64},
    'a round-1 spec set short of a mutant': {'rev541-specs.json': lambda d: (d.update(mutants=d['mutants'][:-1]), d)[1]},
    'a round-1 fix with no edits': {'rev541-fix-specs.json': lambda d: (next(m for m in d['mutants'] if m['id'] == 'FIX541-rows-only').update(edits=[]), d)[1]},
    "a test file that is not the reviewer's fix": {'@fixed': lambda text: text.replace("'..'", "'../'", 1)},
    'a line removed from the test file': {f'@lines {REACH}': lambda lines: [*lines, ['-', 90, "    ['a ./ path dependency', ..."]]},
    'a code line changed in the testkit': {f'@lines {KIT}': lambda lines: [*lines, ['+', 70, 'const LOCAL_VERSION = /^file:/iu;']]},
    'a comment line changed outside the doc comment': {f'@lines {KIT}': lambda lines: [*lines, ['+', 3, ' * x']]},
    'a changed line on the LOCAL_VERSION line itself': {f'@lines {KIT}': lambda lines: [*lines, ['+', 79, ' * x']]},
    'a code line changed since the suite ran': {f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 79, 'const LOCAL_VERSION = /^file:/iu;']]},
    'a comment line changed since the suite ran on the LOCAL_VERSION line': {f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 79, ' * x']]},
    # The REPAIR1-to-HEAD check's other two predicates, each alone (syzygy-bpyt.39, the round-3 review's N1).
    'a non-evidence path changed since the suite ran': {'@since': lambda names: [*names, 'README.md']},
    "another bead's evidence path changed since the suite ran": {'@since': lambda names: [*names, 'docs/evidence/syzygy-bpyt-8-36/x.json']},
    'a non-comment line inside the span since the suite ran': {f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 70, 'const X = 1;']]},
    "a clause that is not the round-3 reviewer's file": {'@f1 sha': lambda digest: '0' * 64},
    "a testkit that keeps round 1's rule": {'@kit': lambda kit: kit + "// as for any dependency declared under a workspace's name\n"},
    "a testkit that restates round 1's rule": {'@kit': lambda kit: kit + "// unless the alias is declared under a workspace's own name and that workspace's version satisfies it\n"},
    "a testkit that keeps round 2's rule": {'@kit': lambda kit: kit + "// unless the alias is declared under a workspace's own name and either the root's manifest declares it\n"},
    "a testkit without the reviewer's npm: text": {'@kit': lambda kit: kit.replace('then npm links', 'then npm fetches', 1)},
    'a testkit that keeps the false sentence': {'@kit': lambda kit: kit + '// npm installs it from the registry\n'},
    'a testkit without the N2 residual count': {'@kit': lambda kit: kit.replace('At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped', '', 1)},
    'an unscoped workspace': {'@workspaces': lambda names: {**names, 'packages/plainlib/package.json': 'plainlib'}},
    'a comment-free emit that differs': {'comment-only.json': lambda d: (d.update(emitEqual=False), d)[1]},
    'a comment-only check of another blob': {'comment-only.json': lambda d: (d.update(headSha256='0' * 64), d)[1]},
    'a comment-only selftest that misses a rename': {'comment-only.json': lambda d: (d['selftest']['identifierRenamed'].update(printEqual=True), d)[1]},
    'a walk that differs': {'island-diff.json': lambda d: (d['walks'].update(equal=d['walks']['equal'] - 1), d)[1]},
    'an island diff by another tool': {'island-diff.json': lambda d: (d.update(toolSha256='0' * 64), d)[1]},
    'an island diff over another old testkit': {'island-diff.json': lambda d: (d['scratchSha256'].update({OLD_KIT: '0' * 64}), d)[1]},
    'an island selftest over another old testkit': {'island-diff-selftest.json': lambda d: (d['scratchSha256'].pop(OLD_KIT), d)[1]},
    'a differential selftest that changes nothing': {'island-diff-selftest.json': lambda d: (d['resolves'].update(equal=d['resolves']['specifiers']), d['walks'].update(equal=d['walks']['entries']), d)[2]},
    'a repeat run that fails': {'repeat-runs.json': lambda d: (d['runs'][2].update(failed=['x'], passed=d['runs'][2]['passed'] - 1), d)[1]},
    "a repeat run of BASE's population": {'repeat-runs.json': lambda d: ([r.update(total=165, passed=165) for r in d['runs']], d)[1]},
    'a title removed': {'titles.json': lambda d: (d.update(removed=1), d['removedNames'].append([REACH, 'x']), d)[2]},
    'an added title this bead does not add': {'titles.json': lambda d: (d['addedNames'][0].__setitem__(1, 'x > y'), d)[1]},
    'a probe of another pattern': {'npa-probe.json': lambda d: (d.update(pattern=d['pattern'].replace('tgz|', '')), d)[1]},
    'a comment claim npm does not make': {'npa-probe.json': lambda d: (next(r for r in d['comment'] if r['spec'] == 'github:someone/dossier#v1.tar').update(npa='remote'), d)[1]},
    'an alias of a path that npm takes': {'npa-probe.json': lambda d: (next(r for r in d['comment'] if r['spec'] == 'npm:./lib').update(npa='alias', aliasOf='directory'), d)[1]},
    'an alias of a non-registry spec': {'npa-probe.json': lambda d: (next(r for r in d['rows'] if r['spec'] == 'npm:typescript@^5.5.0').update(aliasOf='git'), d)[1]},
    'a residual the pattern refuses': {'npa-probe.json': lambda d: (next(r for r in d['comment'] if r['spec'] == 'a/b/c').update(local=True), d)[1]},
    'a row version on the wrong side': {'npa-probe.json': lambda d: (next(r for r in d['rows'] if r['spec'] == '..').update(local=False), d)[1]},
    'an npm case that links where the clause says registry': {'npm-alias-probe.json': lambda d: (case(d, 'app', 'wlib', 'npm:typescript@^5.5.0').update(
        lockExit=0, errorCode=None, wouldRequest=None, lockEntry={'resolved': 'w', 'link': True}, installExit=0, installedLink='../w',
        appLoads={'packageJson': 'w/package.json', 'name': 'wlib', 'version': '1.0.0'}), d)[1]},
    'an npm case that fetches where the clause says link': {'npm-alias-probe.json': lambda d: (case(d, 'app', 'wlib', 'npm:typescript@*').update(
        lockExit=1, errorCode='ENOTCACHED', wouldRequest='http://127.0.0.1:9/typescript', lockEntry=None, installExit=None, installedLink=None, appLoads=None), d)[1]},
    'an npm registry case that requests another name': {'npm-alias-probe.json': lambda d: (case(d, 'app', 'dossier', 'npm:wlib@*').update(wouldRequest='http://127.0.0.1:9/typescript'), d)[1]},
    'an npm link to another workspace': {'npm-alias-probe.json': lambda d: (case(d, 'app', '@syzygy/slib', 'npm:typescript@*').update(installedLink='../../w'), d)[1]},
    'an npm case where Node loads another package': {'npm-alias-probe.json': lambda d: (case(d, 'app', 'wlib', '^1.0.0')['appLoads'].update(name='typescript'), d)[1]},
    'an npm probe against a reachable registry': {'npm-alias-probe.json': lambda d: (d.update(registry='https://registry.npmjs.org/'), d)[1]},
    'an npm probe missing a case': {'npm-alias-probe.json': lambda d: (d.update(results=d['results'][:-1]), d)[1]},
    'a root case that fetches where the clause says link': {'npm-alias-probe.json': lambda d: (case(d, 'root', 'wlib', 'npm:typescript@^5.5.0').update(
        lockExit=1, errorCode='ENOTCACHED', wouldRequest='http://127.0.0.1:9/typescript', lockEntry=None, installExit=None, installedLink=None, appLoads=None), d)[1]},
    'a root case read as declared in app': {'npm-alias-probe.json': lambda d: (case(d, 'root', '@syzygy/slib', 'npm:typescript@^5.5.0').update(declaredIn='app'), d)[1]},
    'a case declared in both manifests that links': {'npm-alias-probe.json': lambda d: (case(d, ['root', 'app'], 'wlib', 'npm:typescript@^5.5.0').update(
        lockExit=0, errorCode=None, wouldRequest=None, lockEntry={'resolved': 'w', 'link': True}, installExit=0, installedLink='../w',
        appLoads={'packageJson': 'w/package.json', 'name': 'wlib', 'version': '1.0.0'}), d)[1]},
    'a case declared in both manifests read as declared in app alone': {'npm-alias-probe.json': lambda d: (case(d, ['root', 'app'], 'wlib', 'npm:typescript@^5.5.0').update(declaredIn='app'), d)[1]},
    'a suite at another commit': {'suite.json': lambda d: (d.update(commit=BASE), d)[1]},
    'a whole suite with a failure': {'suite.json': lambda d: (run(d, 'whole').update(success=False, failed=1, passed=run(d, 'whole')['passed'] - 1), d)[1]},
    'a whole suite that skips another test': {'suite.json': lambda d: (run(d, 'whole')['notPassed'].append({'file': REACH, 'name': 'y', 'status': 'skipped', 'ms': None, 'error': ''}),
                                                                  run(d, 'whole').update(skipped=6, passed=run(d, 'whole')['passed'] - 1), d)[2]},
    'a suite of two packages only': {'suite.json': lambda d: (run(d, 'whole').update(command=WHOLE + ' --project @syzygy/polaris-dossier'), d)[1]},
    'a whole suite whose totals do not close': {'suite.json': lambda d: (run(d, 'whole').update(total=run(d, 'whole')['total'] + 1), d)[1]},
    'a whole suite over fewer files': {'suite.json': lambda d: (run(d, 'whole').update(files=55), d)[1]},
    'a product file in the subject': {'@names': lambda names: [*names, 'packages/polaris-dossier/src/argv.ts']},
    'a product module importing the testkit': {'@importers': lambda names: sorted([*names, 'apps/syzygy/src/main.ts'])},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if main_summary()['problems']:
            print('selftest: the unmutated inputs already fail')
            sys.exit(1)
        survived = []
        for label, mutation in SELFTEST.items():
            MUTATE.clear()
            MUTATE.update(mutation)
            problems = main_summary()['problems']
            print('killed' if problems else 'SURVIVED', '|', label, '|', problems[:1])
            if not problems:
                survived.append(label)
        MUTATE.clear()
        print(f'selftest: {len(SELFTEST) - len(survived)}/{len(SELFTEST)} mutations make a check fail')
        sys.exit(1 if survived else 0)
    text = json.dumps(main_summary(), indent=1, ensure_ascii=False) + '\n'
    summary = json.loads(text)
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(summary['problems']))
        sys.exit(0 if same and not summary['problems'] else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', len(summary['problems']))
    for p in summary['problems']:
        print(' -', p)


main()
