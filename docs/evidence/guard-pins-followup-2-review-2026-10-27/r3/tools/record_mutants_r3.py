"""rev-541c: mutants of syzygy-bpyt.8.39's record.py for round 3, run against a scratch clone at the reviewed commit.

Two kinds:
- source mutants: record.py with one textual edit (each `old` must occur exactly once), run with --check and --selftest;
- git-object mutants of the new REPAIR1-to-HEAD check: a commit made off HEAD (00b7dcf7) with one edit, built with a private
  index so the clone's worktree is untouched; a copy of record.py whose HEAD is that commit and whose main() prints the problem
  list is run, and only the problems of the check under test (prefix 'suite: HEAD differs from REPAIR1') are read.
Usage: python3 -I record_mutants_r3.py <clone> <work dir> <out.json>
"""
import json, os, subprocess, sys

clone, work, out = (os.path.realpath(a) for a in sys.argv[1:4])
os.makedirs(work, exist_ok=True)
REC = os.path.join(clone, 'docs/evidence/syzygy-bpyt-8-39/record.py')
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
HEAD = '00b7dcf70b764b13017784581bc80a5a3502532f'
source = open(REC).read()
git = lambda *a, **k: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True, **k).stdout


def once(text, old, new):
    if text.count(old) != 1:
        raise SystemExit(f'not exactly once: {old[:60]!r}')
    return text.replace(old, new)


def run(script_text, name, *args):
    path = os.path.join(work, f'{name}.py')
    with open(path, 'w') as fh:
        fh.write(script_text)
    r = subprocess.run(['python3', '-I', path, clone, *args], capture_output=True, text=True, timeout=1800)
    return r.returncode, r.stdout.splitlines()


SOURCE = [
    # (id, what, old, new, flags, expected exit per flag)
    ('S1', "F1_CLAUSE's pinned text, one word changed ('absent' to 'present')",
     "alias's range is `*`, absent or one", "alias's range is `*`, present or one"),
    ('S2', 'F1_CLAUSE_SHA256 changed in one hex digit', "F1_CLAUSE_SHA256 = 'e5500fb4", "F1_CLAUSE_SHA256 = 'e5500fb5"),
    ('S3', "the LOCAL_VERSION-line selftest mutation moved back to line 78 (round 2's line)",
     "lambda lines: [*lines, ['+', 79, ' * x']]},\n    'a code line changed since",
     "lambda lines: [*lines, ['+', 78, ' * x']]},\n    'a code line changed since"),
    ('S4', 'the new late check: its ` * ` prefix test dropped',
     "or not re.match(r' \\* ', text)\n                                         for s, n, text in late)",
     "or False\n                                         for s, n, text in late)"),
    ('S5', 'the new late check: its path test dropped (any file may differ)', "if since != [KIT] or not late", "if not late"),
    ('S6', 'the F1 retired-phrase test dropped', " or any(words in kit for words in F1_RETIRED)", ""),
]
SELFTEST_ADDED = [
    # (id, what, label, mutation source) - added to SELFTEST, then --selftest run: a survivor exits 1
    ('T1', "a testkit whose clause is true but for one word ('the root's manifest refuses it')", 'rev541c T1',
     "{'@kit': lambda kit: kit.replace(\"either the root's manifest declares it\", \"either the root's manifest refuses it\", 1)}"),
    ('T2', "a testkit that keeps round 1's rule in other words (no retired phrase)", 'rev541c T2',
     "{'@kit': lambda kit: kit + \"// npm fetches that spec from the registry unless the alias is declared under a workspace's own name and that workspace's version satisfies it\\n\"}"),
    ('T3', 'a REPAIR1-to-HEAD comment line on the line after LOCAL_VERSION (80)', 'rev541c T3',
     "{f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 80, ' * x']]}"),
    ('T4', 'a REPAIR1-to-HEAD ` * ` line inside the span that closes the comment and adds a token (simulated through the hook)', 'rev541c T4',
     "{f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 70, \" *   a workspace package's name */ const EXTRA = 1; /*\"]]}"),
]
GITOBJ = [
    # (id, what, path, old, new, expect the late check to fail)
    ('G1', "a ` * ` line inside the span that closes the comment early and adds a token", KIT,
     " *   a workspace package's name,", " *   a workspace package's name */ const EXTRA = 1; /*", True),
    ('G2', 'a ` * ` line in another doc comment (targetOf, line 43)', KIT,
     ' * same string. Node takes', ' * same string, Node takes', True),
    ('G3', 'the LOCAL_VERSION line itself, a code token changed', KIT, '|link:|', '|lnk:|', True),
    ('G4', 'a file outside the evidence directory changed beside a comment-only testkit', 'README.md', None, None, True),
    ('G5', 'negative control: one ` * ` line inside the span reworded', KIT, 'failing closed.\n * The tarball', 'failing shut.\n * The tarball', False),
    ('G6', "negative control: HEAD itself (no edit)", None, None, None, False),
]
results = {'source': [], 'selftestAdded': [], 'gitObject': []}
base_check = run(source, 'unmutated', '--check')
results['unmutated'] = {'checkExit': base_check[0], 'checkOut': base_check[1][-1:]}
for sid, what, old, new in SOURCE:
    text = once(source, old, new)
    c = run(text, sid, '--check')
    s = run(text, sid, '--selftest')
    results['source'].append({'id': sid, 'what': what, 'checkExit': c[0], 'checkOut': c[1][-1:], 'selftestExit': s[0],
                              'selftestTail': s[1][-1:], 'survivors': [l for l in s[1] if l.startswith('SURVIVED')]})
    print(sid, c[0], c[1][-1:], s[0], s[1][-1:], flush=True)
for tid, what, label, mutation in SELFTEST_ADDED:
    text = once(source, "\n}\n\n\ndef main():", f"\n    {label!r}: {mutation},\n}}\n\n\ndef main():")
    s = run(text, tid, '--selftest')
    line = next((l for l in s[1] if f'| {label} |' in l), None)
    results['selftestAdded'].append({'id': tid, 'what': what, 'selftestExit': s[0], 'line': line, 'tail': s[1][-1:]})
    print(tid, s[0], line, flush=True)
env = {**os.environ, 'GIT_INDEX_FILE': os.path.join(work, 'index')}
for gid, what, path, old, new, expect in GITOBJ:
    commit = HEAD
    if path is not None:
        git('read-tree', HEAD, env=env)
        text = git('show', f'{HEAD}:{path}')
        text = text + 'x\n' if old is None else once(text, old, new)
        blob = subprocess.run(['git', '-C', clone, 'hash-object', '-w', '--stdin'], input=text, capture_output=True, text=True, check=True).stdout.strip()
        git('update-index', '--cacheinfo', f'100644,{blob},{path}', env=env)
        tree = git('write-tree', env=env).strip()
        commit = subprocess.run(['git', '-C', clone, 'commit-tree', tree, '-p', HEAD, '-m', f'rev541c {gid}'], capture_output=True, text=True,
                                check=True, env={**env, 'GIT_AUTHOR_NAME': 'r', 'GIT_AUTHOR_EMAIL': 'r@x', 'GIT_COMMITTER_NAME': 'r',
                                                 'GIT_COMMITTER_EMAIL': 'r@x'}).stdout.strip()
    text = once(source, f"HEAD = '{HEAD}'", f"HEAD = '{commit}'")
    text = once(text, '\n\nmain()\n', "\n\nprint(json.dumps(main_summary()['problems']))\n")
    code, lines = run(text, gid)
    problems = json.loads(lines[-1]) if code == 0 and lines else None
    late = [p for p in problems or [] if p.startswith('suite: HEAD differs from REPAIR1')]
    results['gitObject'].append({'id': gid, 'what': what, 'commit': commit, 'exit': code, 'lateCheckProblems': late,
                                 'lateCheckFails': bool(late), 'expected': expect, 'asExpected': bool(late) == expect,
                                 'otherProblems': len(problems or []) - len(late)})
    print(gid, commit[:8], code, late, flush=True)
with open(out, 'w') as fh:
    json.dump(results, fh, indent=1)
print('wrote', out)
