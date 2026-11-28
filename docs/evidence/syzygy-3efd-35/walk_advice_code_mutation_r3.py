#!/usr/bin/env python3
"""Mutation run for syzygy-3efd.35: each mutant replaces `old` with `new` exactly once, runs the command, restores the file."""
import hashlib, json, os, subprocess, sys, tempfile

WT = '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-3efd.35-code'
OUT = sys.argv[1]
ADV = 'packages/polaris-dossier/src/walk-advice.ts'
CHK = 'packages/polaris-dossier/src/check.ts'
SCR = 'packages/polaris-dossier/src/screen.ts'
TESTS = ['packages/polaris-dossier/src/walk-advice.test.ts', 'packages/polaris-dossier/src/walk.test.ts', 'packages/polaris-dossier/src/view-level.test.ts', 'packages/polaris-dossier/src/inventory.test.ts']
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
    ('check-hidden-unscreened', CHK, "        hidden: (repositoryPath) => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path',",
     "        hidden: () => false,"),
    ('check-hidden-denied-dropped', CHK, " || screen.screenPath(repositoryPath) === 'denied-path',", ","),
    ('check-hidden-secret-dropped', CHK, "hidden: (repositoryPath) => secretOrUnder(repositoryPath.split('/'), isSecretPath) || ", "hidden: (repositoryPath) => "),
    ('check-denies-below-unscreened', CHK, "        deniesBelow: screen.deniesBelow });", "        deniesBelow: () => false });"),
    ('check-command-unguarded', CHK, "  if (plan.command === 'check' && parseFault === null && isRecord(walked)) {\n    try {", "  if (parseFault === null && isRecord(walked)) {\n    try {"),
    ('check-parse-unguarded', CHK, "  if (plan.command === 'check' && parseFault === null && isRecord(walked)) {\n    try {", "  if (plan.command === 'check' && isRecord(walked)) {\n    try {"),
    ('check-record-unguarded', CHK, "  if (plan.command === 'check' && parseFault === null && isRecord(walked)) {\n    try {", "  if (plan.command === 'check' && parseFault === null) {\n    try {"),
    ('base-denies-below-read', ADV, " || (base.manifest === undefined && screen.deniesBelow(repositoryPath))", ""),
    ('base-denies-below-units', ADV, "(base.manifest === undefined && screen.deniesBelow(repositoryPath))", "screen.deniesBelow(repositoryPath)"),
    ('screen-denies-below-none', SCR, "      deniesBelow: (directory) => deniedDirectory(`${directory}/-`, directories),", "      deniesBelow: () => false,"),
    ('screen-denies-below-final', SCR, "deniedDirectory(`${directory}/-`, directories)", "deniedDirectory(directory, directories)"),
    ('walk-read-undefined-read', ADV, "    if (read === undefined || diagram === undefined || !GRAPH_KINDS.has(diagram['kind'])) continue;", "    if (read === undefined) throw new Error('malformed');\n    if (diagram === undefined || !GRAPH_KINDS.has(diagram['kind'])) continue;"),
    ('walk-diagram-missing-read', ADV, "read === undefined || diagram === undefined || ", "read === undefined || "),
    ('step-block-missing-counted', ADV, "      if (label === undefined || block === undefined) return;", "      if (label === undefined) return;"),
    ('node-missing-labelled', ADV, "    return isRecord(node) ? text(node['label']) : undefined;", "    return isRecord(node) ? text(node['label']) : '';"),
    ('view-record-ignored', ADV, "if (isViewKind(diagram) && isRecord(diagram['view'])) return", "if (isViewKind(diagram)) return"),
    ('d7-utf16-code-units', ADV, "  for (const ch of value) {\n    const c = ch.codePointAt(0)!;", "  for (let i = 0; i < value.length; i++) {\n    const ch = value[i]!;\n    const c = ch.charCodeAt(0);"),
    ('d7-one-new-word', ADV, "  return adviceWords(paragraph).every((word) => WALK_FILLER.has(word) || labelWords.some((other) => matches(word, other)));",
     "  return adviceWords(paragraph).filter((word) => !(WALK_FILLER.has(word) || labelWords.some((other) => matches(word, other)))).length <= 1;"),
    ('d7-echo-word', ADV, "walkAdviceDetail(read.figure, k + 1, step.block)", "walkAdviceDetail(read.figure, k + 1, `${step.block} (${adviceWords(paragraphText(block))[0] ?? ''})`)"),
]

# A mutant argued equivalent before the run: it is still run and recorded, and its survival is not counted as a gap.
EQUIVALENT = {
    'base-not-shown-read': 'without the guard an absent or unestablished step has no factId: an unestablished map is undefined in maps, and an established map has no element whose factId is undefined, so the lookup that follows returns undefined either way (the R35 code review, note 4, confirms it)',
    'check-hidden-secret-dropped': 'a secret path is left out of the directory map (derive.ts, deriveTreeFacts keeps no isSecretPath blob) and of the unit map (secretPathsLeftOut), so no shown base element has a path the secret half names; it is kept as a fail-closed guard (R35 code review, note 2)',
    'check-command-unguarded': 'the inventory report is the only other plan; an inventory file is never a v16 or v17 draft without a schema finding, and walkAdvice returns undefined for an earlier schema or under a schema finding, so the guard decides nothing that the rule does not already',
    'check-parse-unguarded': 'a draft that does not parse leaves no record to read: walked is then not a record, or a record with a schema finding, and walkAdvice returns undefined for both (hasWalkForm of a missing schemaVersion is false)',
    'check-record-unguarded': 'a value that is not a record has no v16 or v17 schemaVersion, so walkAdvice returns undefined; null throws inside the try block and check leaves the member out, as the guard does',
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
        'format': 'mutation-run/1', 'bead': 'syzygy-3efd.35', 'date': '2026-11-29', 'ranAt': commit, 'subject': subject,
        'command': 'SYZYGY_POC_BROWSER=<chromium-1223> npx vitest run ' + ' '.join(TESTS) + ' --reporter=json',
        'round': 3, 'method': 'round 3 runs at the R35 code review repair head: the round 2 mutants re-run against the reviewed and repaired bytes, with the three D7 mutants the review found missing, the denied-directory mutants of the repair, the composition guards now tested at unit level and the check guards; round 2 ran after two tests were added for round 1 survivors (words-z-excluded, under-bracket-dropped); each mutant replaces old with new exactly once in file, runs the command, restores the file; killed means a non-zero exit, and failedTests records each failing test and the first line of its message, so a kill by an assertion is told apart from a kill by a throw; the baseline run at ranAt passed before any mutant',
        'mutants': out, 'killed': sum(m['killed'] for m in out),
        'killedByAssertion': sum(1 for m in out if m['killed'] and any(f['message'].startswith('AssertionError') for f in m['failedTests'])),
        'total': len(out),
        'equivalent': sum(1 for m in out if 'equivalent' in m),
        'survivedNotEquivalent': [m['id'] for m in out if not m['killed'] and 'equivalent' not in m],
        'notes': {'graph-kind-ignored': 'argued equivalent in round 2 through check\'s composition only; the R35 code review (note 4) found the exported walkAdvice reads such a figure when called directly, so round 3 tests the direct call and the mutant is counted as any other.',
                  'check-hidden-unscreened': 'a survivor in round 2 under the fixture policy, which denies no directory; round 3 adds a check-level fixture under the committed dossier policy (kubeconfig, a denied basename, and .ssh, a denied directory name).'},
    }
    open(OUT, 'w', encoding='utf-8').write(json.dumps(record, indent=2, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    main()
