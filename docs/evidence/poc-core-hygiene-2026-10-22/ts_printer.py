"""Python side of ts_print.mjs: print many sources with TypeScript's printer, comments removed.

`print_without_comments([(name, text), ...])` returns the printed texts in order.
The node script resolves `typescript` from the repository's node_modules (run
`npm ci` first); one node process serves the whole batch.
"""
import json
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / 'ts_print.mjs'


def print_without_comments(files: list[tuple[str, str]]) -> list[str]:
    payload = json.dumps([{'name': n, 'text': t} for n, t in files])
    run = subprocess.run(['node', str(SCRIPT)], input=payload.encode('utf-8'), capture_output=True, check=False)
    if run.returncode != 0:
        raise SystemExit(f'ts_print.mjs failed: {run.stderr.decode(errors="replace")[-400:]}')
    return [item['printed'] for item in json.loads(run.stdout.decode('utf-8'))]


STATEMENTS = Path(__file__).resolve().parent / 'ts_statements.mjs'


def top_level_statements(files: list[tuple[str, str]]) -> list[list[dict]]:
    """Each file's top-level statements (kind, exported, names, printed text), in order."""
    payload = json.dumps([{'name': n, 'text': t} for n, t in files])
    run = subprocess.run(['node', str(STATEMENTS)], input=payload.encode('utf-8'), capture_output=True, check=False)
    if run.returncode != 0:
        raise SystemExit(f'ts_statements.mjs failed: {run.stderr.decode(errors="replace")[-400:]}')
    return [item['statements'] for item in json.loads(run.stdout.decode('utf-8'))]
