#!/usr/bin/env python3
"""Instrument a SCRATCH clone for the canonical JSON measurement of syzygy-bpyt.6.3 stack 2. Never run it in a worktree you commit from.

Usage: canonical-json-tap-apply.py <scratch clone root>

Makes three edits in the clone and prints the digest of each file before and after:
  project-shape-manifest.ts      one line at the top of `canonicalJson`: report the call to globalThis.__cjTap
  canonical-json.ts              one line at the top of `encodeCanonicalJson`: the same
  vitest.config.ts               a second setup file, cj-tap-setup.ts, copied here from canonical-json-tap.ts
Each anchor must occur exactly once or nothing is written. Then run the suite there with
  CJ_TAP_OUT=<dir>/tap CJ_TAP_ROOT=<clone root> npx vitest run
and aggregate with canonical-json-tap-aggregate.py.
"""
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
EDITS = [
    ('packages/three-surface-poc-core/src/project-shape-manifest.ts',
     'export function canonicalJson(value: unknown): string {\n  return JSON.stringify(canonicalize(value));\n}',
     "export function canonicalJson(value: unknown): string {\n  (globalThis as { __cjTap?: (kind: string, value: unknown) => void }).__cjTap?.('lenient', value);\n  return JSON.stringify(canonicalize(value));\n}"),
    ('packages/polaris-generation-core/src/canonical-json.ts',
     'export function encodeCanonicalJson(value: unknown, limits: CanonicalJsonLimits): string {\n',
     "export function encodeCanonicalJson(value: unknown, limits: CanonicalJsonLimits): string {\n  (globalThis as { __cjTap?: (kind: string, value: unknown, limits: unknown) => void }).__cjTap?.('strict', value, limits);\n"),
    ('vitest.config.ts',
     "setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],",
     "setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url)), fileURLToPath(new URL('./cj-tap-setup.ts', import.meta.url))],"),
]


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main():
    root = sys.argv[1]
    plan = []
    for rel, old, new in EDITS:
        path = os.path.join(root, rel)
        text = open(path, encoding='utf-8').read()
        if text.count(old) != 1:
            raise SystemExit(f'{rel}: anchor occurs {text.count(old)} times; nothing written')
        plan.append((path, rel, text, old, new))
    report = []
    for path, rel, text, old, new in plan:
        before = sha(path)
        open(path, 'w', encoding='utf-8').write(text.replace(old, new))
        report.append({'file': rel, 'sha256Before': before, 'sha256After': sha(path)})
    shutil.copyfile(os.path.join(HERE, 'canonical-json-tap.ts'), os.path.join(root, 'cj-tap-setup.ts'))
    report.append({'file': 'cj-tap-setup.ts', 'copiedFrom': 'docs/evidence/syzygy-bpyt-6-3/canonical-json-tap.ts', 'sha256': sha(os.path.join(root, 'cj-tap-setup.ts'))})
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
