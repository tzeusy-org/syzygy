"""Rule-6 mutants for syzygy-bpyt.8.11: each rewrites one fragment of execution-choice.ts, runs the unit test file, and restores.

Run from the repository root: python3 docs/evidence/syzygy-bpyt-8-11/run_mutants.py <out.json>. A mutant is killed when vitest exits non-zero.
"""
import json, subprocess, sys

TARGET = 'packages/polaris-dossier/src/execution-choice.ts'
TEST = 'packages/polaris-dossier/src/execution-choice.test.ts'
CHECK = """  const marker = launchedMarkerState(run);
  if (marker === 'launched') {"""
MUTANTS = [
    ('M1-launched-arm', "  if (marker === 'launched') {", "  if (marker === ('launched' as string) && false) {"),
    ('M2-unreadable-arm', "  if (marker === 'unreadable') {", "  if (marker === ('unreadable' as string) && false) {"),
    ('M3-after-run-name', None, None),
]

def main() -> None:
    original = open(TARGET, encoding='utf-8').read()
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    results = []
    for ident, old, new in MUTANTS:
        if old is None:
            # Move the whole marker block below the run-name refusal.
            start = original.index('  // syzygy-bpyt.8.11: a launched run')
            end = original.index('  const runId = path.basename(run);')
            block = original[start:end]
            anchor = "  if (!RUN_ID.test(runId)) return refuse('run', `${run} is not a run directory: its name is not of the form run-<32 hex>`);\n"
            mutated = original[:start] + original[end:]
            assert mutated.count(anchor) == 1
            mutated = mutated.replace(anchor, anchor + block, 1)
            old, new = block + 'const runId ... RUN_ID refusal', 'RUN_ID refusal\n' + block
        else:
            assert original.count(old) == 1, ident
            mutated = original.replace(old, new)
        open(TARGET, 'w', encoding='utf-8').write(mutated)
        try:
            run = subprocess.run(['npx', 'vitest', 'run', '--project', 'unit', TEST], capture_output=True, text=True)
        finally:
            open(TARGET, 'w', encoding='utf-8').write(original)
        failed = [line.strip() for line in run.stdout.splitlines() if line.strip().startswith('×')]
        results.append({'id': ident, 'old': old, 'new': new, 'exit': run.returncode, 'killed': run.returncode != 0, 'failedTests': failed})
    json.dump({'subject': TARGET, 'test': TEST, 'commit': commit, 'mutants': results}, open(sys.argv[1], 'w'), indent=2)
    print(json.dumps([(r['id'], r['killed'], len(r['failedTests'])) for r in results]))

main()
