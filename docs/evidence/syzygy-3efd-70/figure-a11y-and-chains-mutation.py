"""Mutation run over the syzygy-3efd.70 and syzygy-3efd.66 guards (AGENTS.md rule 6), round 2, after review notes 4 and 6.

Usage: python3 docs/evidence/syzygy-3efd-70/figure-a11y-and-chains-mutation.py <repo> <out.json> <chrome-headless-shell>
Writes figure-a11y-and-chains-mutation-2026-11-22-r2.json. Round 1 (figure-a11y-and-chains-mutation-2026-11-22.json) ran an
earlier form of this script, whose A mutants named the description id on the <details>; its record keeps each old/new fragment."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import datetime
import signal

ROOT = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
BROWSER = sys.argv[3]
TIMEOUT = 300
SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts'
LAYOUT = 'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts'
ARIA = ['apps/three-surface-poc/src/polaris-generation/figure-aria.test.ts', 'apps/three-surface-poc/src/polaris-generation/figure-aria.browser.test.ts',
        'apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts',
        'apps/three-surface-poc/src/polaris-generation/dossier-derived-region.test.ts']
MAPS = ['apps/three-surface-poc/src/polaris-generation/figure-aria.test.ts', 'apps/three-surface-poc/src/polaris-generation/figure-aria.browser.test.ts',
        'apps/three-surface-poc/src/polaris-generation/dossier-computed-maps.test.ts', 'apps/three-surface-poc/src/polaris-generation/computed-maps.browser.test.ts']
FIT = ['apps/three-surface-poc/src/polaris-generation/diagram-layout.test.ts', 'packages/polaris-dossier/src/synthetic-shapes.test.ts',
       'apps/three-surface-poc/src/polaris-generation/dossier-reading.browser.test.ts', 'apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts']

MUTANTS = [
    # syzygy-3efd.70: the ids the drawing's aria references name.
    ('A1', SITE, '    : { title: ` id="diagram-title-${index}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', '    : { title: \'\', textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', ARIA),
    ('A2', SITE, '    : { title: ` id="diagram-title-${index}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', '    : { title: ` id="diagram-title-${index}"`, textOpen: `<div>`, textClose: \'</div>\' };', ARIA),
    ('A3', SITE, '    : { title: ` id="diagram-title-${index}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', '    : { title: ` id="diagram-title-${index + 1}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', ARIA),
    ('A4', SITE, '    : { title: ` id="diagram-title-${index}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: \'</div>\' };', '    : { title: ` id="diagram-text-${index}"`, textOpen: `<div id="diagram-title-${index}">`, textClose: \'</div>\' };', ARIA),
    ('A5', SITE, "=> local === undefined\n    ? { title: '', textOpen: '', textClose: '' }", "=> false\n    ? { title: '', textOpen: '', textClose: '' }", ARIA),
    ('A6', SITE, '${curated}><figcaption${ids.title}>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}', '${curated}><figcaption>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}', ARIA),
    ('A7', SITE, '${ids.textOpen}<ul>${nodeList}', '<ul>${nodeList}', ARIA),
    ('A8', SITE, 'data-figure-kind="${figure.kind}"><figcaption${ids.title}>', 'data-figure-kind="${figure.kind}"><figcaption>', ARIA),
    ('A9', SITE, '${ids.textOpen}<ul>${ownerList}', '<ul>${ownerList}', ARIA),
    ('A10', SITE, '<figcaption id="diagram-title-derived">', '<figcaption>', ARIA),
    ('A11', SITE, '<ul class="derived-facts" id="diagram-text-derived">', '<ul class="derived-facts">', ARIA),
    # Review note 4 (syzygy-3efd.70): the description is the figure's lists alone.
    ('D1', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${nodeList}</ul><ol>${edgeList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>', '<details${ids.textOpen === \'\' ? \'\' : ` id="diagram-text-${index}"`}><summary>Read every component and relationship</summary><ul>${nodeList}</ul><ol>${edgeList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>', ARIA),
    ('D2', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${ownerList}</ul><ol>${useList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>', '<details${ids.textOpen === \'\' ? \'\' : ` id="diagram-text-${index}"`}><summary>Read every component and relationship</summary><ul>${ownerList}</ul><ol>${useList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>', ARIA),
    ('D3', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${nodeList}</ul><ol>${edgeList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>', '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${nodeList}</ul><ol>${edgeList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>${ids.textClose}', ARIA),
    ('D4', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${ownerList}</ul><ol>${useList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>', '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${ownerList}</ul><ol>${useList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>${ids.textClose}', ARIA),
    ('D5', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${nodeList}</ul><ol>${edgeList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>', '<details>${ids.textOpen}<summary>Read every component and relationship</summary><ul>${nodeList}</ul><ol>${edgeList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>', ARIA),
    ('D6', SITE, '<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${ownerList}</ul><ol>${useList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>', '<details>${ids.textOpen}<summary>Read every component and relationship</summary><ul>${ownerList}</ul><ol>${useList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details>', ARIA),
    ('D7', SITE, '<details><summary>Read every derived fact</summary><ul class="derived-facts" id="diagram-text-derived">', '<details id="diagram-text-derived"><summary>Read every derived fact</summary><ul class="derived-facts">', ARIA),
    # syzygy-3efd.70 on the computed map figures (2.9), after the merge.
    ('M1', SITE, '<figcaption id="diagram-title-${index}">${escape(caption)}</figcaption>', '<figcaption>${escape(caption)}</figcaption>', MAPS),
    ('M2', SITE, '<ol class="map-list" id="diagram-text-${index}">', '<ol class="map-list">', MAPS),
    ('M3', SITE, '<figcaption id="diagram-title-${index}">${escape(caption)}</figcaption>', '<figcaption id="diagram-title-${index}-map">${escape(caption)}</figcaption>', MAPS),
    # The map spacing keeps two columns (648 px) and stacks anything wider, a plain chain among them.
    ('M4', SITE, 'export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 648 } as const;', 'export const MAP_SPACING = { ...READABLE_SPACING } as const;', MAPS),
    ('M5', SITE, 'export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 648 } as const;', 'export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 1048 } as const;', MAPS),
    ('M6', SITE, 'export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 648 } as const;', 'export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 647 } as const;', MAPS),
    # syzygy-3efd.66: every readable diagram wider than the phone column stacks.
    ('S1', LAYOUT, "  if (width > spacing.stackWiderThan) return stackDiagram(", "  if (width > spacing.stackWiderThan + 400) return stackDiagram(", FIT),
    ('S2', LAYOUT, "  if (width > spacing.stackWiderThan) return stackDiagram(", "  if (width > spacing.stackWiderThan + 800) return stackDiagram(", FIT),
    ('S3', LAYOUT, "stackWiderThan: STACK_COLUMN, edgeChars", "stackWiderThan: 1048, edgeChars", FIT),
    ('S4', LAYOUT, "stackWiderThan: Number.POSITIVE_INFINITY, edgeChars: 18", "stackWiderThan: STACK_COLUMN, edgeChars: 18", FIT),
    ('S5', LAYOUT, "  const contentHeight = Math.max(...members.map(m => columnHeight(m.length)));", "  const contentHeight = Math.min(...members.map(m => columnHeight(m.length)));", FIT),
    ('S6', LAYOUT, "  const width = MARGIN * 2 + layerCount * NODE_WIDTH + (layerCount - 1) * gapX;", "  const width = MARGIN * 2 + layerCount * NODE_WIDTH + (layerCount - 2) * gapX;", FIT),
    ('S7', LAYOUT, "x: MARGIN + layer[i]! * (NODE_WIDTH + gapX), y: MARGIN + offset", "x: MARGIN + layer[i]! * (NODE_WIDTH + gapX), y: offset", FIT),
]


def sha(rel: str) -> str:
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()


def run(tests: list[str]) -> tuple[int | None, list[str], list[str]]:
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as handle:
        out = handle.name
    env = dict(os.environ, SYZYGY_POC_BROWSER=BROWSER)
    proc = subprocess.Popen(['npx', 'vitest', 'run', *tests, '--reporter=json', f'--outputFile={out}'], cwd=ROOT, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        proc.wait(timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        # A mutant that hangs its tests past the limit is killed by timeout; the whole vitest process group is stopped.
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
        if os.path.exists(out):
            os.unlink(out)
        return 124, ['(timeout)'], [f'(no result within {TIMEOUT} s: the run was stopped)']
    text = pathlib.Path(out).read_text(encoding='utf-8')
    os.unlink(out)
    if not text.strip():
        return proc.returncode or 1, ['(no report)'], ['(vitest wrote no report)']
    report = json.loads(text)
    failed_files, failed_tests = [], []
    for result in report['testResults']:
        rel = os.path.relpath(result['name'], ROOT)
        bad = [f"{rel} > {a['fullName']}" for a in result['assertionResults'] if a['status'] == 'failed']
        if bad or result['status'] == 'failed':
            failed_files.append(rel)
            failed_tests.extend(bad or [f'{rel} > (file failed: {result.get("message", "")[:200]})'])
    return proc.returncode, failed_files, failed_tests


files = sorted({m[1] for m in MUTANTS})
subject = {rel: sha(rel) for rel in files}
status = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
if status.strip():
    sys.exit('tree not clean')
started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
baseline = {}
for group, tests in (('aria', ARIA), ('maps', MAPS), ('fit', FIT)):
    code, bad_files, bad_tests = run(tests)
    if code != 0:
        sys.exit(f'baseline {group} fails: {bad_tests}')
    baseline[group] = tests
records = []
for mid, rel, old, new, tests in MUTANTS:
    path = ROOT / rel
    original = path.read_bytes()
    text = original.decode('utf-8')
    if text.count(old) != 1:
        sys.exit(f'{mid}: old occurs {text.count(old)} times in {rel}')
    try:
        path.write_bytes(text.replace(old, new).encode('utf-8'))
        code, bad_files, bad_tests = run(tests)
    finally:
        path.write_bytes(original)
    if sha(rel) != subject[rel]:
        sys.exit(f'{mid}: {rel} not restored')
    records.append({'id': mid, 'file': rel, 'old': old, 'new': new, 'tests': tests, 'killed': code != 0, 'killedBy': bad_files, 'failedTests': bad_tests})
    OUT.with_name(OUT.stem + '.partial.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print(mid, 'killed' if code != 0 else 'SURVIVED', len(bad_tests), flush=True)

killed = sum(1 for r in records if r['killed'])
OUT.write_text(json.dumps({
    'format': 'mutation-run/1',
    'ranAt': started,
    'commit': head,
    'subject': subject,
    'command': "SYZYGY_POC_BROWSER=<chrome-headless-shell 158.0.8127.36> npx vitest run <the mutant's `tests`> --reporter=json --outputFile=<tmp>",
    'method': 'Each mutant replaces one fragment (`old`, occurring exactly once in `file`) with `new`, runs its listed test files with vitest, counts the mutant killed when the run exits non-zero, records the failed tests, and restores the file byte for byte in a `finally` block (checked against `subject` after each mutant). The unmutated run of each test group passed first. A run with no result within 300 s is stopped (its whole process group) and counted killed by timeout. Rule 6, AGENTS.md. Round 2, after review notes 4 (the description is the lists alone: D1-D7, and A1-A11 re-aimed at the wrapper) and 6.',
    'beads': ['syzygy-3efd.70', 'syzygy-3efd.66'],
    'runner': 'docs/evidence/syzygy-3efd-70/figure-a11y-and-chains-mutation.py',
    'follows': ['docs/evidence/syzygy-3efd-70/figure-a11y-and-chains-mutation-2026-11-22.json'],
    'testsByGroup': baseline,
    'mutants': records,
    'killed': killed,
    'total': len(records),
}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'{killed} of {len(records)} killed')
