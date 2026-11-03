#!/usr/bin/env python3
"""Show that the blind spots review R-GP-IMPL-POC-CORE-HYGIENE-2 found (N8, N9) were real in the predecessor tools and are closed in the repaired ones.

Usage: predecessor_blind_spots.py <tree> <predecessor-commit> <out.json>

<tree> holds the repaired tools (this directory) and is built (npm run build)
with no tracked change under packages/ and apps/. The predecessor tools are read
with `git show <predecessor-commit>:<path>` into a scratch directory beside
their own copies of the helpers they import.

N9: the two census-lexer mutants of mutate_census.py (the ones whose id starts
`lexer-nested-template`, `lexer-expression-close`) are applied to the
predecessor's export_census.py and to the repaired one; the predecessor's
`--selftest` must still pass (the mutant survives) and the repaired one must fail.
N8: each template-literal mutant of mutate_comment_only.py is applied to the
tree in place, bytes restored in a finally block; the predecessor's
comment_only_check.py must report allCommentOnly=True (the blind spot) and the
repaired one False.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import mutate_census  # noqa: E402
import mutate_comment_only  # noqa: E402

REL = 'docs/evidence/poc-core-hygiene-2026-10-22/'


def show(tree: Path, commit: str, name: str) -> str:
    return subprocess.run(['git', 'show', f'{commit}:{REL}{name}'], cwd=tree, capture_output=True, text=True, check=True).stdout


def main() -> int:
    tree, commit, out = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3])
    if subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no', '--', 'packages', 'apps'], cwd=tree, capture_output=True, text=True).stdout.strip():
        raise SystemExit('tracked changes under packages/ and apps/: restore them first')
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    result: dict = {'tree': str(tree.name), 'ranAtCommit': head, 'predecessorCommit': commit}

    n9 = []
    old_source, new_source = show(tree, commit, 'export_census.py'), (HERE / 'export_census.py').read_text(encoding='utf-8')
    with tempfile.TemporaryDirectory() as tmp:
        for mutant_id, old, new in mutate_census.MUTANTS:
            if not mutant_id.startswith(('lexer-nested-template', 'lexer-expression-close')):
                continue
            row = {'id': mutant_id, 'old': old, 'new': new}
            for label, source in (('predecessor', old_source), ('repaired', new_source)):
                if source.count(old) != 1:
                    raise SystemExit(f'{mutant_id}: fragment occurs {source.count(old)} times in the {label} tool')
                copy = Path(tmp) / f'{label}.py'
                copy.write_text(source.replace(old, new), encoding='utf-8')
                run = subprocess.run([sys.executable, str(copy), '--selftest'], capture_output=True, text=True)
                row[label] = {'selftestExit': run.returncode, 'lastLine': run.stdout.strip().splitlines()[-1]}
            row['survivedPredecessor'] = row['predecessor']['selftestExit'] == 0
            row['killedByRepaired'] = row['repaired']['selftestExit'] != 0
            n9.append(row)
    result['n9'] = n9

    n8 = []
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp)
        for name in ('export_census.py', 'comment_only_check.py'):
            (scratch / f'pred_{name}').write_text(show(tree, commit, name), encoding='utf-8')
        # The predecessor imports `export_census` by that name: give it its own directory.
        pred_dir = scratch / 'pred'
        pred_dir.mkdir()
        (pred_dir / 'export_census.py').write_text(show(tree, commit, 'export_census.py'), encoding='utf-8')
        (pred_dir / 'comment_only_check.py').write_text(show(tree, commit, 'comment_only_check.py'), encoding='utf-8')
        for mutant_id, rel, old, new, kind in mutate_comment_only.MUTANTS:
            if not mutant_id.startswith('template-literal'):
                continue
            path = tree / rel
            original = path.read_bytes()
            text = original.decode('utf-8')
            if text.count(old) != 1:
                raise SystemExit(f'{mutant_id}: fragment occurs {text.count(old)} times in {rel}')
            row = {'id': mutant_id, 'file': rel, 'old': old, 'new': new}
            try:
                path.write_text(text.replace(old, new), encoding='utf-8')
                for label, tool in (('predecessor', pred_dir / 'comment_only_check.py'), ('repaired', HERE / 'comment_only_check.py')):
                    rec_path = scratch / f'{label}-{mutant_id}.json'
                    run = subprocess.run([sys.executable, str(tool), str(tree), head, str(rec_path)], capture_output=True, text=True)
                    row[label] = {'exit': run.returncode, 'allCommentOnly': json.loads(rec_path.read_text())['allIdenticalAfterCommentStrip'], 'firstLine': run.stdout.splitlines()[0][:80] if run.stdout else run.stderr[-200:]}
            finally:
                path.write_bytes(original)
            row['missedByPredecessor'] = row['predecessor']['allCommentOnly'] is True
            row['caughtByRepaired'] = row['repaired']['allCommentOnly'] is False
            n8.append(row)
    result['n8'] = n8
    result['summary'] = {'n9Mutants': len(n9), 'n9SurvivedPredecessor': sum(r['survivedPredecessor'] for r in n9), 'n9KilledByRepaired': sum(r['killedByRepaired'] for r in n9),
                         'n8Mutants': len(n8), 'n8MissedByPredecessor': sum(r['missedByPredecessor'] for r in n8), 'n8CaughtByRepaired': sum(r['caughtByRepaired'] for r in n8)}
    out.write_text(json.dumps(result, indent=1) + '\n', encoding='utf-8')
    print(result['summary'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
