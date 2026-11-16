"""lane_tool_mutants.py: the reviewer's own mutants against the lane's tools (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 lane_tool_mutants.py <checkout at f44cd65d> <scratch-dir> <out.json>

Each mutant changes one tool fragment (exactly one occurrence) or one input fact, runs the tool and the lane's own
checks on it, and records whether anything the lane ships refuses it. KILLED means a lane check (its mutant suite's
baseline assertions, the tool's own exit status, or a recorded figure it reproduces) fails or the output departs from
the ruling in a way the tool itself reports; SURVIVED means every lane check still passes, and the mutant's effect on
the outcome is printed so a human can judge whether that matters.

  T1 decide.py tests at the default: TEST_THRESHOLD_MS = 5000 (ruling 1 says half, 2500).
  T2 decide.py hooks at the default: HOOK_THRESHOLD_MS = 10000.
  T3 decide.py drops the hosted-run condition (hosted_ok always true).
  T4 citation_audit.py input: keyboard-sweep-record:59's record renamed so it names only a different test of the same
     file; ruling 6 makes that a counted residual.
  T5 citation_audit.py input: a hook's record names only a different file sharing its stem
     (polaris-opening-index.browser.test.ts -> polaris-opening-index.test.ts in full-runs.json, opening-index:316).
  T6 check_removals.py holds a hook to the test threshold's double, i.e. the hook default (`threshold` read as 2x).
"""
import copy, json, os, shutil, subprocess, sys

repo, scratch, out_path = sys.argv[1:4]
E = os.path.join(repo, 'docs/evidence/syzygy-bpyt-4-31')
T = os.path.join(E, 'tools')
os.makedirs(scratch, exist_ok=True)
res = []

def mutate_tool(name, old, new):
    src = open(os.path.join(T, name)).read()
    assert src.count(old) == 1, (name, old, src.count(old))
    d = os.path.join(scratch, 'tools-' + name.replace('.py', ''))
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(T, d)
    open(os.path.join(d, name), 'w').write(src.replace(old, new))
    return d

def run(args):
    p = subprocess.run([sys.executable, '-I', *args], capture_output=True, text=True, cwd=repo)
    return p.returncode, (p.stdout + p.stderr)[-600:]

def decide_outcome(tools_dir, label):
    o = os.path.join(scratch, f'{label}-decisions.json')
    code, _ = run([os.path.join(tools_dir, 'decide.py'), f'{E}/census-546f1ff0.json', f'{E}/site-durations-546f1ff0.json', f'{E}/ci-durations.json', f'{E}/cited.json', o])
    rows = {r['site']: r['decision'] for r in json.load(open(o))['rows']} if code == 0 else {}
    mcode, mout = run([os.path.join(tools_dir, 'decide_mutants.py'), f'{E}/census-546f1ff0.json', f'{E}/site-durations-546f1ff0.json', f'{E}/ci-durations.json', f'{E}/cited.json', os.path.join(scratch, f'{label}-dm.json')])
    ccode, cout = run([os.path.join(tools_dir, 'check_removals.py'), o, f'{E}/site-durations-head.json', f'{E}/head-durations', f'{E}/full-runs.json', os.path.join(scratch, f'{label}-rc.json')])
    return code, rows, mcode, mout.strip().splitlines()[-1:] , ccode

base = {r['site']: r['decision'] for r in json.load(open(f'{E}/decisions-546f1ff0.json'))['rows']}
for mid, what, old, new in [
        ('T1', 'decide.py: test threshold at the default', "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook'] // 2", "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'], DEFAULT_MS['hook'] // 2"),
        ('T2', 'decide.py: hook threshold at the default', "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook'] // 2", "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook']"),
        ('T3', 'decide.py: no hosted-run condition', "hosted_ok = bool(hosted) and all(b['boundMs'] is not None and b['boundMs'] <= threshold for b in hosted)", "hosted_ok = True")]:
    d = mutate_tool('decide.py', old, new)
    code, rows, mcode, mlast, ccode = decide_outcome(d, mid)
    flipped = sorted(k for k in rows if rows[k] != base.get(k))
    killed = code != 0 or mcode != 0 or ccode != 0
    res.append({'id': mid, 'predicate': what, 'change': {'file': 'decide.py', 'old': old, 'new': new}, 'decideExit': code,
                'decideMutantsExit': mcode, 'decideMutantsLast': mlast, 'checkRemovalsExit': ccode,
                'decisionsChanged': len(flipped), 'changed': flipped[:12], 'outcome': 'killed' if killed else 'survived'})

# citation_audit.py input mutants: rewrite one cited record in a scratch clone of the census commit? The tool reads the
# record with `git show <census commit>:<path>`, so the mutant runs match_record directly on a rewritten copy.
sys.path.insert(0, T)
import importlib.util
spec = importlib.util.spec_from_file_location('ca', os.path.join(T, 'citation_audit.py'))
ca = importlib.util.module_from_spec(spec); spec.loader.exec_module(ca)
census = json.load(open(f'{E}/census-head.json'))
sites = {f"{s['path']}:{s['line']}": s for s in census['sites']}
show = lambda p: json.loads(subprocess.run(['git', '-C', repo, 'show', f"{census['commit']}:{p}"], capture_output=True, text=True, check=True).stdout)

def rewrite(node, fn):
    if isinstance(node, dict): return {fn(k): rewrite(v, fn) for k, v in node.items()}
    if isinstance(node, list): return [rewrite(v, fn) for v in node]
    return fn(node) if isinstance(node, str) else node

key = 'apps/three-surface-poc/src/keyboard-sweep-record.test.ts:59'
site, rec = sites[key], 'docs/evidence/syzygy-bpyt-4-31/durations/keyboard-sweep-record.test.tests.json'
before = ca.match_record(show(rec), site, rec)
title = site['title']
other = 'decodes the escaped footer and refuses a page that names no evaluation, two, or an abbreviated revision'
doc = rewrite(show(rec), lambda s: s.replace(title, other + ' (moved)'))
after = ca.match_record(doc, site, rec)
res.append({'id': 'T4', 'predicate': "citation_audit.py: a test site measured only by another test of its file is a counted residual (ruling 6)",
            'site': key, 'citation': rec, 'change': {'everyString': {'old': title, 'new': other + ' (moved)'}},
            'before': before[0]['kind'] if before else None, 'after': after[0]['kind'] if after else None,
            'outcome': 'killed' if not after else 'survived'})

key = 'apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:316'
site, rec = sites[key], 'docs/evidence/syzygy-bpyt-4-31/full-runs.json'
before = ca.match_record(show(rec), site, rec)
doc = rewrite(show(rec), lambda s: s.replace('polaris-opening-index.browser.test.ts', 'polaris-opening-index.test.ts'))
after = ca.match_record(doc, site, rec)
res.append({'id': 'T5', 'predicate': "citation_audit.py: a file match needs the site's own file, not another with its stem",
            'site': key, 'citation': rec, 'change': {'everyString': {'old': 'polaris-opening-index.browser.test.ts', 'new': 'polaris-opening-index.test.ts'}},
            'before': before[0]['kind'] if before else None, 'after': after[0]['kind'] if after else None,
            'afterName': after[0]['name'][:120] if after else None, 'outcome': 'killed' if not after else 'survived'})

# T6: check_removals.py with a hook held to twice its threshold; its own mutant suite should notice (M4).
src = open(os.path.join(T, 'check_removals.py')).read()
old = "row['thresholdMs']"
if src.count(old) >= 1:
    first = src.index(old)
    new_src = src[:first] + "(row['thresholdMs'] * (2 if row['kind'] == 'hook' else 1))" + src[first + len(old):]
    d = os.path.join(scratch, 'tools-check_removals'); shutil.rmtree(d, ignore_errors=True); shutil.copytree(T, d)
    open(os.path.join(d, 'check_removals.py'), 'w').write(new_src)
    mcode, mout = run([os.path.join(d, 'check_removals_mutants.py'), f'{E}/decisions-546f1ff0.json', f'{E}/site-durations-head.json', f'{E}/head-durations', f'{E}/full-runs.json', os.path.join(scratch, 'T6-rcm.json')])
    res.append({'id': 'T6', 'predicate': 'check_removals.py: a hook is held to its own threshold, not the hook default',
                'change': {'file': 'check_removals.py', 'old': old + ' (first occurrence)', 'new': "(row['thresholdMs'] * (2 if row['kind'] == 'hook' else 1))"},
                'mutantSuiteExit': mcode, 'mutantSuiteLast': mout.strip().splitlines()[-3:], 'outcome': 'killed' if mcode != 0 else 'survived'})
else:
    res.append({'id': 'T6', 'outcome': 'not applied', 'why': f'{old!r} not in check_removals.py'})

json.dump({'tool': 'lane_tool_mutants.py', 'repoHead': subprocess.run(['git', '-C', repo, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(), 'mutants': res}, open(out_path, 'w'), indent=1)
for r in res: print(r['id'], r['outcome'], '|', json.dumps({k: v for k, v in r.items() if k not in ('id', 'outcome', 'change')})[:500])
