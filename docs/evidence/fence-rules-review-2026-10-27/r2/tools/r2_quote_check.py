#!/usr/bin/env python3
"""Check that each quotation the round-2 raw cites by file and line appears on those lines at the reviewed commit.
Usage: r2_quote_check.py <clone> <commit> <pr-body.md> <governance log>
Reads files with `git show <commit>:<path>`; whitespace is normalized across the cited line range."""
import re
import subprocess
import sys

clone, commit, body, govlog = sys.argv[1:5]
Q = [
    ('docs/evidence/syzygy-bpyt-6-3/line-level-check.mjs', 144, 146, 'i += 2'),
    ('docs/evidence/syzygy-bpyt-6-3/line-level-check.mjs', 170, 170, 'import.meta.url === `file://${process.argv[1]}`'),
    ('docs/evidence/syzygy-bpyt-6-3/comment-only.mjs', 18, 18, '--name-status'),
    ('apps/three-surface-poc/src/fence-rules.test.ts', 9, 9, 'pins its opener, its closer and its CR-blindness'),
    ('apps/three-surface-poc/src/fence-rules.test.ts', 195, 196, 'A fix flips the two rows below'),
    ('packages/polaris-generation-consent/src/package-reader.test.ts', 153, 153, 'pin that refusal, not the mechanism'),
    ('docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json', 4047, 4047, 'pins four of the gaps'),
    ('AGENTS.md', 196, 196, 'pins four of them (the consent reader through the probe and its own tests)'),
    ('AGENTS.md', 198, 199, 'G1, the CRLF reading, is ruled by the owner (`syzygy-bpyt.1.14`) and `syzygy-bpyt.16` fixes it; G2 and G3 are open owner questions.'),
    ('AGENTS.md', 388, 389, 'A page that restates state it does not own goes stale silently. Cite `PROJECT-STATUS.md` or the act record instead of repeating the row.'),
    ('AGENTS.md', 123, 123, "Read a check's output, not its exit code"),
    ('AGENTS.md', 126, 126, 'Mutate the input and confirm the check fails, per predicate, before trusting it'),
    ('packages/three-surface-poc-core/src/project-shape-extraction.ts', 16, 17, 'A source never yields a partial item set.'),
    ('packages/three-surface-poc-core/src/project-shape-manifest.ts', 488, 488, 'namedSources: namedPaths.size'),
    ('packages/three-surface-poc-core/src/index.ts', 30, 30, "export * from './project-shape-extraction.js'"),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 18, 20, 'Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally decides which classes it touches.'),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 31, 32, '1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);'),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 35, 36, '3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);'),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 37, 37, '4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;'),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 40, 41, '6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;'),
    ('.syzygy/governance/policies/craft-and-care/review-and-documentation.md', 51, 51, '**A reviewer or the owner** may reclassify at any time.'),
    ('.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md', 52, 55, '"Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision.'),
    ('.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md', 62, 62, '**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint.'),
    ('.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md', 95, 96, 'Any change not listed here to what a gate accepts or refuses stops and returns to the owner.'),
    ('.claude/skills/th-engineering/subskills/test-rigor/SKILL.md', 42, 45, 'A test is worth keeping only if some plausible bug makes it fail.'),
    ('.claude/skills/th-engineering/subskills/test-rigor/SKILL.md', 52, 54, 'A pure refactor should not break tests; a behavior change must.'),
    ('.claude/skills/th-engineering/subskills/test-rigor/SKILL.md', 60, 63, 'Edge and failure paths are first-class.'),
    ('.claude/skills/th-engineering/subskills/test-rigor/SKILL.md', 64, 67, 'Expected values are literals or independently derived.'),
]
BODY = [
    'This does not always fail closed.',
    'a partial item set under a known denominator',
    'Both refusals are committed tests, so a change that made those checks CR-tolerant fails them before it opens the field-inside-a-fence path',
    '+15 ~34 -0',
    'which were produced at `fe3855a1` and `7e58cd1f`',
    'bb05df7e',
]
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
bad = 0
for path, a, b, q in Q:
    r = subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], capture_output=True, text=True)
    lines = r.stdout.split('\n')
    seg = norm(' '.join(lines[a - 1:b]))
    ok = r.returncode == 0 and norm(q) in seg
    bad += not ok
    print('OK  ' if ok else 'FAIL', f'{path}:{a}-{b}', '' if ok else repr(seg[:300]))
text = norm(open(body, encoding='utf8').read())
for q in BODY:
    ok = norm(q) in text
    bad += not ok
    print('OK  ' if ok else 'FAIL', 'PR body:', q)
gl = open(govlog, encoding='utf8').read().split('\n')
print('governance log 994-999:')
for i in range(993, 999):
    print(' ', i + 1, gl[i][:200])
print('failures', bad, 'of', len(Q) + len(BODY))
