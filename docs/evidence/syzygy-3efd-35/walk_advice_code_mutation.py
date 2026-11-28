#!/usr/bin/env python3
"""Mutation run for syzygy-3efd.35: each mutant replaces `old` with `new` exactly once, runs the command, restores the file."""
import hashlib, json, os, subprocess, sys, tempfile

WT = '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-3efd.35-code'
OUT = sys.argv[1]
ADV = 'packages/polaris-dossier/src/walk-advice.ts'
CHK = 'packages/polaris-dossier/src/check.ts'
TESTS = ['packages/polaris-dossier/src/walk-advice.test.ts', 'packages/polaris-dossier/src/walk.test.ts']
MUTANTS = [
    ('words-no-lowercase', ADV, "out += String.fromCodePoint(c + 0x20);", "out += ch;"),
    ('words-z-excluded', ADV, "c <= 0x5a", "c <= 0x59"),
    ('words-numbers-split', ADV, "/^[\\p{L}\\p{N}]$/u", "/^[\\p{L}]$/u"),
    ('words-empties-kept', ADV, "return out.split(' ').filter((word) => word !== '');", "return out.split(' ');"),
    ('words-runs-kept-whole', ADV, "out += WORD_CODE_POINT.test(ch) ? ch : ' ';", "out += WORD_CODE_POINT.test(ch) ? ch : '';"),
    ('filler-shown-dropped', ADV, "'see', 'shown', 'shows'", "'see', 'shows'"),
    ('filler-the-dropped', ADV, "'that', 'the', 'then'", "'that', 'then'"),
    ('match-es-dropped', ADV, "word === `${label}s` || word === `${label}es` ||", "word === `${label}s` ||"),
    ('match-one-way', ADV, " || label === `${word}s` || label === `${word}es`;", ";"),
    ('restates-any-word', ADV, "adviceWords(paragraph).every(", "adviceWords(paragraph).some("),
    ('paragraph-join-empty', ADV, "].join(' ');", "].join('');"),
    ('paragraph-children-ignored', ADV, "[text(block['text']) ?? '', ...list(block['children'])", "[text(block['text']) ?? '', ...list([])"),
    ('under-bracket-dropped', ADV, " || at.startsWith(`${walkAt}[`)", ""),
    ('under-dot-dropped', ADV, " || at.startsWith(`${walkAt}.`)", ""),
    ('under-bare-prefix', ADV, "at === walkAt || at.startsWith(`${walkAt}.`)", "at.startsWith(walkAt) || at.startsWith(`${walkAt}.`)"),
    ('schema-finding-ignored', ADV, " || findings.some((finding) => finding.kind === 'schema')", ""),
    ('walk-form-ignored', ADV, "!hasWalkForm(doc['schemaVersion']) || ", ""),
    ('walk-finding-ignored', ADV, "    if (findings.some((finding) => under(finding.at, at))) continue;\n", ""),
    ('graph-kind-ignored', ADV, " || !GRAPH_KINDS.has(diagram['kind'])", ""),
    ('examined-not-counted', ADV, "      examined++;\n", ""),
    ('examined-unread-counted', ADV, "      if (label === undefined || block === undefined) return;\n      examined++;", "      examined++;\n      if (label === undefined || block === undefined) return;"),
    ('step-number-zero-based', ADV, "walkAdviceDetail(read.figure, k + 1, step.block)", "walkAdviceDetail(read.figure, k, step.block)"),
    ('step-at-off-by-one', ADV, "at: `${at}.steps[${k}]`", "at: `${at}.steps[${k + 1}]`"),
    ('node-label-for-views', ADV, "if (isViewKind(diagram) && isRecord(diagram['view'])) return", "if (false) return"),
    ('view-label-for-nodes', ADV, "if (isViewKind(diagram) && isRecord(diagram['view'])) return", "return"),
    ('base-not-shown-read', ADV, "  if (found.state !== 'shown') return undefined;\n", ""),
    ('base-hidden-read', ADV, "screen.hidden(repositoryPath) || ", ""),
    ('base-path-unscreened', ADV, "screen.admit(repositoryPath) !== 'admitted' || ", ""),
    ('base-label-unscreened', ADV, " || screen.admit(base.label) !== 'admitted'", ""),
    ('base-unavailable-admitted', ADV, "screen.admit(base.label) !== 'admitted'", "screen.admit(base.label) === 'withheld'"),
    ('base-screen-unit-path', ADV, "const repositoryPath = base.manifest ?? base.path;", "const repositoryPath = base.path;"),
    ('base-map-fixed', ADV, "maps[element.map === 'units' ? 'units' : 'directories']", "maps['units']"),
    ('check-member-dropped', CHK, "    ...(walks === undefined ? {} : { walkAdvice: walks }),\n", ""),
    ('check-failure-propagates', CHK, "    } catch { walks = undefined; }", "    } catch (error) { throw error; }"),
    ('check-findings-unpassed', CHK, "computeWalkAdvice(walked, findings,", "computeWalkAdvice(walked, [],"),
    ('check-maps-unpassed', CHK, "computeWalkAdvice(walked, findings, checkBaseMaps(treeFacts, manifestFacts),", "computeWalkAdvice(walked, findings, {},"),
    ('check-hidden-unscreened', CHK, "        hidden: (repositoryPath) => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path' });",
     "        hidden: () => false });"),
]

# A mutant argued equivalent before the run: it is still run and recorded, and its survival is not counted as a gap.
EQUIVALENT = {
    'graph-kind-ignored': 'a walk whose figure is not of a graph kind always carries a walk finding at its figure (REQ-034 2.40), and a walk with a finding at or below its path is skipped first, so the kind test is reached only by a walk the finding test already removed',
    'base-not-shown-read': 'without the guard an absent or unestablished step has no factId: an unestablished map is undefined in maps, and an established map has no element whose factId is undefined, so the lookup that follows returns undefined either way; the guard narrows the type and changes no outcome',
}

def run_tests():
    with tempfile.NamedTemporaryFile('r', suffix='.json', dir='/home/orca/.tmp/spec86', delete=False) as f:
        report = f.name
    proc = subprocess.run(['npx', 'vitest', 'run', *TESTS, '--reporter=json', f'--outputFile={report}'], cwd=WT, capture_output=True, text=True, timeout=900)
    failed = []
    try:
        data = json.load(open(report))
        for suite in data.get('testResults', []):
            for t in suite.get('assertionResults', []):
                if t.get('status') == 'failed':
                    msg = (t.get('failureMessages') or [''])[0].split('\n')[0][:300]
                    failed.append({'test': t.get('title'), 'message': msg})
            if suite.get('status') == 'failed' and not suite.get('assertionResults'):
                failed.append({'test': f"(suite) {suite.get('name', '').replace(WT + '/', '')}", 'message': (suite.get('message') or '').split('\n')[0][:300]})
    except Exception as e:  # noqa: BLE001
        failed.append({'test': '(no report)', 'message': str(e)[:300]})
    os.unlink(report)
    return proc.returncode, failed

def main():
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=WT, capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=WT, capture_output=True, text=True).stdout.strip()
    if dirty:
        sys.exit('worktree has tracked changes; commit first')
    files = sorted({m[1] for m in MUTANTS} | set(TESTS))
    subject = {p: hashlib.sha256(open(os.path.join(WT, p), 'rb').read()).hexdigest() for p in files}
    for mid, path, old, new in MUTANTS:
        text = open(os.path.join(WT, path), encoding='utf-8').read()
        if text.count(old) != 1:
            sys.exit(f'{mid}: old fragment occurs {text.count(old)} times in {path}')
    if len(sys.argv) > 2 and sys.argv[2] == '--dry':
        print('fragments ok', len(MUTANTS)); return
    base_code, base_failed = run_tests()
    if base_code != 0:
        sys.exit(f'baseline fails: {base_failed[:3]}')
    out = []
    for mid, path, old, new in MUTANTS:
        full = os.path.join(WT, path)
        original = open(full, encoding='utf-8').read()
        try:
            open(full, 'w', encoding='utf-8').write(original.replace(old, new, 1))
            code, failed = run_tests()
        finally:
            open(full, 'w', encoding='utf-8').write(original)
        killed = code != 0
        out.append({'id': mid, 'file': path, 'old': old, 'new': new, 'killed': killed, 'failedTests': failed, **({'equivalent': EQUIVALENT[mid]} if mid in EQUIVALENT else {})})
        print(mid, 'killed' if killed else 'SURVIVED', len(failed), flush=True)
    assert subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=WT, capture_output=True, text=True).stdout.strip() == ''
    record = {
        'format': 'mutation-run/1', 'bead': 'syzygy-3efd.35', 'date': '2026-11-28', 'ranAt': commit, 'subject': subject,
        'command': 'SYZYGY_POC_BROWSER=<chromium-1223> npx vitest run ' + ' '.join(TESTS) + ' --reporter=json',
        'round': 2, 'method': 'round 2 runs after two tests were added for round 1 survivors (words-z-excluded, under-bracket-dropped); each mutant replaces old with new exactly once in file, runs the command, restores the file; killed means a non-zero exit, and failedTests records each failing test and the first line of its message, so a kill by an assertion is told apart from a kill by a throw; the baseline run at ranAt passed before any mutant',
        'mutants': out, 'killed': sum(m['killed'] for m in out),
        'killedByAssertion': sum(1 for m in out if m['killed'] and any(f['message'].startswith('AssertionError') for f in m['failedTests'])),
        'total': len(out),
        'equivalent': sum(1 for m in out if 'equivalent' in m),
        'survivedNotEquivalent': [m['id'] for m in out if not m['killed'] and 'equivalent' not in m],
        'notes': {'check-hidden-unscreened': 'not argued equivalent. Check passes walk advice the same `hidden` predicate it gives the base rendering. No check-level fixture was found where it decides: a secret path is left out of both maps (derive.ts, manifest-facts.ts secretPathsLeftOut), and a directory a denied-path basename names (kubeconfig/, tried at this commit) was read as not hidden by that predicate. The walk-advice side of the screen is killed at the unit tier by base-hidden-read.'},
    }
    open(OUT, 'w', encoding='utf-8').write(json.dumps(record, indent=2, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    main()
