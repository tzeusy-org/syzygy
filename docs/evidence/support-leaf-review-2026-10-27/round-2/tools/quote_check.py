#!/usr/bin/env python3
"""Check every quotation and line cite in the round-2 raw against the bytes at the named commit.

Usage: quote_check.py <repo> <pr-body.txt>
Each row: (commit, path or None for the PR body, first line, last line, quoted text). A row passes when the quoted
text, whitespace-normalized, is a substring of the whitespace-normalized cited line range.
"""
import re
import subprocess
import sys

H = 'a5ab2b287266e9be6b8e96b381d014cb8e73d9d4'
A088 = 'a088f1ca'
POL = '.syzygy/governance/policies/craft-and-care/review-and-documentation.md'
GPQ0 = '.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md'
SK = '.claude/skills/th-engineering/subskills/test-rigor/SKILL.md'
NE = 'packages/polaris-dossier/src/no-egress.test.ts'

ROWS = [
    (H, POL, 18, 20, 'Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides which classes it touches.'),
    (H, POL, 31, 32, '1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);'),
    (H, POL, 35, 36, '3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);'),
    (H, POL, 37, 37, '4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;'),
    (H, POL, 45, 46, '**Class membership is contested by default and is never finally determined by the agent performing the change**'),
    (H, POL, 51, 51, '**A reviewer or the owner** may reclassify at any time.'),
    (H, GPQ0, 52, 52, '"Behavior-preserving" means none of the following changes:'),
    (H, GPQ0, 53, 53, 'a rendered byte, a wire format, a refusal string or an exit code;'),
    (H, GPQ0, 54, 54, 'a signed or digest-bound artifact;'),
    (H, GPQ0, 55, 55, 'a consent, security or retention decision.'),
    (H, GPQ0, 62, 62, '**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint.'),
    (H, GPQ0, 64, 64, 'an old-versus-new differential over a mutated-record corpus that includes records with altered prose;'),
    (H, GPQ0, 65, 65, 'a rule-6 mutant for each predicate;'),
    (H, GPQ0, 66, 66, 'a non-blocking owner notice in the cycle report.'),
    (H, GPQ0, 95, 96, 'Any change not listed here to what a gate accepts or refuses stops and returns to the owner.'),
    (H, 'AGENTS.md', 123, 124, "Read a check's output, not its exit code, and check its denominator against the whole population."),
    (H, 'AGENTS.md', 126, 127, 'Mutate the input and confirm the check fails, per predicate, before trusting it'),
    (H, 'AGENTS.md', 132, 132, 'A claim of absence needs a sweep with a denominator.'),
    (H, 'AGENTS.md', 134, 135, "An evidence record names its subject and the subject's digest"),
    (H, 'AGENTS.md', 282, 284, 'Root Vitest `test.projects` must alias `@syzygy/cap1-core`, `@syzygy/cap1-daemon` and `@syzygy/http-host` to source; verify with every `dist/` absent.'),
    (H, SK, 42, 42, '**A test is worth keeping only if some plausible bug makes it fail.**'),
    (H, SK, 64, 67, "A test that mirrors the implementation's logic to compute its expected value, or that asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or independently derived."),
    (H, SK, 85, 86, 'Duplication, dead fixtures, and copy-paste setup rot suites until people stop reading failures.'),
    (H, SK, 93, 95, 'A test is worth *adding* only if it catches a plausible bug no existing test catches'),
    (H, SK, 103, 104, 'apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not* catch but should.'),
    (H, NE, 43, 43, "'@syzygy/http-host': src('packages/http-host/src/index.ts'),"),
    (H, NE, 45, 45, "'@syzygy/support': src('packages/support/src/index.ts'),"),
    (H, NE, 82, 82, 'expect(run.calls.filter((line) => INTERNET_FAMILY.test(line))).toEqual([])'),
    (H, 'vitest.config.ts', 7, 7, '@syzygy/support'),
    (H, 'vitest.config.ts', 14, 25, '@syzygy/cap1-core/testing'),
    (H, 'vitest.config.ts', 14, 25, '@syzygy/http-host'),
    (H, 'vitest.config.ts', 14, 25, '@syzygy/cap1-daemon'),
    (H, 'vitest.config.ts', 41, 41, '@syzygy/support'),
    (H, 'vitest.config.ts', 83, 83, '@syzygy/http-host'),
    (H, 'packages/http-host/src/credentials.ts', 379, 379, "createHash('sha256')"),
    (H, 'packages/http-host/src/credentials.ts', 380, 380, "createHash('sha256')"),
    (H, 'packages/three-surface-poc-core/src/test-artifact-verification.ts', 367, 367, 'digest'),
    (A088, 'apps/three-surface-poc/src/polaris-narrative.ts', 133, 136, 'Object.freeze'),
    (H, 'docs/evidence/syzygy-bpyt-6-3/support-purity-mutants.py', 61, 61, "'failedTests': failed[:4]"),
    (H, 'docs/evidence/syzygy-bpyt-6-3/diff-probe.mjs', 3, 7, '/tmp/lc63x'),
    (H, 'docs/evidence/syzygy-bpyt-6-3/diff-probe.mjs', 3, 7, 'TMPDIR'),
    (None, None, 67, 67, '`cap1-daemon/src/credentials.ts` x2'),
    (None, None, 5, 5, '`cap1-daemon` takes raw digests'),
    (None, None, 1, 0, 'five `http-host` files, none with a hash or freeze site'),
    (H, 'docs/evidence/syzygy-bpyt-6-3/dc3-support-module-differential-2026-10-25.json', 1, 0, 'the population grew from 236 to 241 files because @syzygy/http-host brings five production files, none of which holds a hash or freeze site'),
]


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def main():
    repo, body = sys.argv[1], sys.argv[2]
    paths = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', H], capture_output=True, check=True).stdout.decode().split('\0')
    bad = 0
    for commit, path, a, b, quote in ROWS:
        if path is None:
            lines = open(body, encoding='utf-8').read().split('\n')
            shown = 'pr-body.txt'
        else:
            if path not in paths and commit == H:
                hits = [p for p in paths if p.endswith('/' + path.rsplit('/', 1)[-1])]
                print('MISSING', path, 'candidates', hits[:5])
                bad += 1
                continue
            lines = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True, check=True).stdout.decode('utf-8').split('\n')
            shown = f'{commit[:8]}:{path}'
        window = norm(' '.join(lines[a - 1:b] if b else lines))
        ok = norm(quote) in window
        anywhere = [i + 1 for i, l in enumerate(lines) if norm(quote)[:40] in norm(l)]
        print('OK  ' if ok else 'FAIL', f'{shown}:{a}-{b}', '' if ok else f'first-40-chars found at lines {anywhere[:6]}')
        bad += 0 if ok else 1
    print('rows', len(ROWS), 'failed', bad)


if __name__ == '__main__':
    main()
