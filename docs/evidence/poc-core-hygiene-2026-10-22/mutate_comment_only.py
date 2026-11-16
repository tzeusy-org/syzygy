#!/usr/bin/env python3
"""Rule-6 mutation record for comment_only_check.py.

Usage: mutate_comment_only.py <tree> <old-commit> <out.json> [--merge-with <ref>]

Each mutant perturbs one file of <tree> in place (a source file, a source file
that <ref> also changed, a built dist file, or the file's deletion), runs
comment_only_check.py against <old-commit> with the same arguments, records what
the check reported, and restores the file's exact bytes in a finally block. A
mutant is killed when the check's verdict is the failing one. <tree> must be
built and have no tracked changes under packages/ and apps/.

With --merge-with the record also holds two controls: the unperturbed run, whose
verdict must be comment-only, and the same run without --merge-with, whose
verdict must be NOT comment-only because the changes that arrived from <ref> then
count as edits (this is what makes the baseline predicate observable).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

CORE = 'packages/three-surface-poc-core/'
APP = 'apps/three-surface-poc/'
MUTANTS = [
    # id, file, old fragment, new fragment (None deletes the file), predicate over the check record that holds when the mutant is killed
    ('source-code-token-added', CORE + 'src/evidence-population.ts', '// Keep the name, the path and the barrel export.\n', '// Keep the name, the path and the barrel export.\nexport const ZZ_MUTANT = 1;\n', 'comment-only-false'),
    # NEGATIVE CONTROL, not a mutant: it passes by staying silent, so it is reported apart and never counted as killed.
    ('source-comment-edit-is-not-a-failure', CORE + 'src/evidence-population.ts', '// Keep the name, the path and the barrel export.\n', '// Keep the name, the path and the barrel export. (edited)\n', 'comment-only-true'),
    # Whitespace inside a template literal is rendered text: the comparison must see it (review R-GP-IMPL-POC-CORE-HYGIENE-2, N8).
    ('template-literal-trailing-space-added', APP + 'src/materialize-action.ts', '  .materialize-status { font-size: .85rem; }\n', '  .materialize-status { font-size: .85rem; } \n', 'comment-only-false'),
    ('template-literal-blank-line-added', APP + 'src/materialize-action.ts', '  .materialize-panel dt { color: var(--muted); }\n', '  .materialize-panel dt { color: var(--muted); }\n\n', 'comment-only-false'),
    ('template-literal-indent-changed', APP + 'src/materialize-action.ts', '  .materialize-panel dd { margin: 0;', '    .materialize-panel dd { margin: 0;', 'comment-only-false'),
    ('source-file-deleted', CORE + 'src/test-cleanup.ts', None, None, 'comment-only-false'),
    ('dist-module-export-removed', CORE + 'dist/evidence-population.js', 'export function derivePopulationBlock', 'function derivePopulationBlock', 'module-export-false'),
    ('dist-barrel-reexport-removed', CORE + 'dist/index.js', "export * from './evidence-population.js';", '', 'barrel-false'),
    # A file the merged ref also changed: its main-side change is baseline, this edit is not.
    ('code-token-added-to-a-file-main-changed', CORE + 'src/body-read-authority.test.ts', "import { describe", "const ZZ_MUTANT = 1;\nimport { describe", 'comment-only-false-with-merge'),
]


def killed(kind: str, rec: dict) -> bool:
    return {
        'comment-only-false': rec['allIdenticalAfterCommentStrip'] is False,
        'comment-only-false-with-merge': rec['allIdenticalAfterCommentStrip'] is False and rec['mergedWith'] is not None,
        'comment-only-true': rec['allIdenticalAfterCommentStrip'] is True,
        'module-export-false': rec['retainedExport']['moduleExportsFunction'] is False,
        'barrel-false': rec['retainedExport']['barrelReexportsSameFunction'] is False,
    }[kind]


def main() -> int:
    tree, old, out = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3])
    extra = sys.argv[4:]
    check = Path(__file__).resolve().parent / 'comment_only_check.py'
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no', '--', 'packages', 'apps'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    if dirty:
        raise SystemExit(f'commit or restore the tracked changes under packages/ and apps/ first:\n{dirty}')

    def run_check(args: list[str]) -> tuple[subprocess.CompletedProcess, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            res = subprocess.run([sys.executable, str(check), str(tree), old, str(Path(tmp) / 'r.json'), *args], capture_output=True, text=True)
            return res, json.loads((Path(tmp) / 'r.json').read_text())

    controls = []
    if extra:
        for label, args, expect in (('unperturbed, with --merge-with', extra, True), ('unperturbed, without --merge-with', [], False)):
            res, rec = run_check(args)
            controls.append({'control': label, 'arguments': args, 'expectedAllIdenticalAfterCommentStrip': expect, 'allIdenticalAfterCommentStrip': rec['allIdenticalAfterCommentStrip'],
                             'holds': rec['allIdenticalAfterCommentStrip'] is expect, 'filesChanged': rec['filesChanged'], 'files': [f['file'] for f in rec['files']],
                             'firstOutputLine': res.stdout.splitlines()[0]})
    records = []
    for mutant_id, rel, frag_old, frag_new, kind in MUTANTS:
        if kind == 'comment-only-false-with-merge' and not extra:
            continue
        path = tree / rel
        original = path.read_bytes()
        text = original.decode('utf-8')
        if frag_old is not None and text.count(frag_old) != 1:
            raise SystemExit(f'{mutant_id}: old fragment occurs {text.count(frag_old)} times in {rel}, expected 1')
        try:
            if frag_old is None:
                path.unlink()
            else:
                path.write_text(text.replace(frag_old, frag_new), encoding='utf-8')
            res, rec = run_check(extra)
        finally:
            path.write_bytes(original)
        records.append({'id': mutant_id, 'negativeControl': kind == 'comment-only-true', 'file': rel, 'old': frag_old, 'new': frag_new, 'deletesTheFile': frag_old is None, 'expectedFailure': kind, 'killed': killed(kind, rec),
                        'firstOutputLine': res.stdout.splitlines()[0] if res.stdout else res.stderr.splitlines()[-1]})
    after = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no', '--', 'packages', 'apps'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    if after:
        raise SystemExit(f'the tree was not restored:\n{after}')
    real = [r for r in records if not r['negativeControl']]
    negative = [r for r in records if r['negativeControl']]
    summary = {'subject': 'comment_only_check.py', 'ranAtCommit': commit, 'oldCommit': old, 'checkArguments': extra, 'controls': controls,
               'mutants': len(real), 'killed': sum(r['killed'] for r in real), 'survivors': [r['id'] for r in real if not r['killed']],
               'negativeControls': len(negative), 'negativeControlsHolding': sum(r['killed'] for r in negative), 'records': records}
    out.write_text(json.dumps(summary, indent=1) + '\n', encoding='utf-8')
    print(f"controls={[c['holds'] for c in controls]} mutants={summary['mutants']} killed={summary['killed']} survivors={summary['survivors']} "
          f"negativeControls={summary['negativeControls']} holding={summary['negativeControlsHolding']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
