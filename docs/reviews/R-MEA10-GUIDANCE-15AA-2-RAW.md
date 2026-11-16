# R-MEA10-GUIDANCE-15AA-2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: 15aa71870f8c10596a687c2e2a62abd825ea846e

Scope: `git diff cf84aea5 15aa7187`, 6 files. Commands run from the worktree root, at HEAD 15aa7187 with a clean tree:
- `npx tsc --noEmit -p .` exited 0 with no output.
- `npx vitest run packages/polaris-dossier/src/render.test.ts packages/polaris-dossier/src/brief.test.ts apps/three-surface-poc/src/polaris-generation`: 24 files, 362 tests, all passed.

## Acceptance criteria

AC1, notes 1-4 repaired without contradicting other rules: met, except finding 1. [Observed]
- Note 1: brief.ts:56 now reads "why someone would use it, as its sources state".
- Note 2: brief.ts:56 now reads "a concrete example from the sources", which agrees with DOSSIER rules 1 and 7 (brief.ts:42, 48).
- Note 3: brief.ts:58 now reads "A block holds at most twelve children, so group a longer enumeration under several lead blocks". That matches `children: list(ref('paragraph'), 0, 12)` (draft-schema.ts:103).
- Note 4: design-review.ts:78 now reads "An advisory finding alone does not make a page deficient". This agrees with the readiness sentence (design-review.ts:80) and with the checker. design-review.ts:142 and :179 test only for `severity === 'blocking'` or `verdict !== 'acceptable'`, and nothing ties an advisory finding to a deficient page.

AC2, the mutant record: met. [Observed]
- All 3 `subjects` digests equal `git show 15aa7187:<path> | sha256sum`:
  - brief.ts 6476be8a…
  - design-review.ts 4e29f9a5…
  - dossier-site.ts 384b3eec…
- `baseCommit` cf84aea5 is an ancestor of 15aa7187 (`git merge-base --is-ancestor` exit 0).
- The 5 new mutants cover each repaired sentence: `g-sourced-why`, `g-sourced-example`, `g-twelve-dropped`, `d-advisory-acceptable`, and `g-code-rule` for the rule-4 gap the prior review noted.
- All 13 `old` fragments occur exactly once in the subject bytes. I did not re-run the mutants: this review is read-only and a mutant rewrites sources. The `killed` outcomes are taken from the record.

AC3, tests and no new defect: met. render.test.ts:971, :974 and :976 pin the full repaired sentences. brief.test.ts:175 pins the whole READABILITY_GUIDANCE block in the rendered brief.

## Findings

1. Non-blocking. Rule 1 and DOSSIER rule 4 pull in different directions (brief.ts:56 against brief.ts:45). Rule 1 now asks for "in everyday words … why someone would use it, as its sources state". Under DOSSIER rule 4, a stated advantage "is reported only as a quotation", and the claim is never to be restated unquoted. A reason to use the project is often an advantage, so the repaired sentence steers toward exactly the paraphrase that rule 4 forbids. The preamble at brief.ts:162 keeps the quotation rules in force, so an agent that reads the whole brief resolves the conflict. The sentence on its own still invites the paraphrase, and a fidelity review may refuse it, which costs a repair cycle. Suggested wording: "…what the project does and what it is for, as its sources state; a stated advantage is still a quotation (rule 4)". [Inferred]

2. Non-blocking. The new design-review sentence (design-review.ts:78) says "An advisory finding", not "an advisory readability finding". So it covers every advisory finding, including those under the label, anchor and disclosure criteria at design-review.ts:77, not only the newcomer criterion that note 4 was about. It agrees with the readiness rule and the checker, so no defect follows. It does widen the semantics beyond note 4's scope, and the commit message and the campaign file (mea10-dossier-readability.md:13) do not say so. [Observed wording; Inferred scope]

3. Observation, not a defect. The record's `note` still says "working tree on baseCommit, committed unchanged next". That is now accurate: the subject bytes are those of 15aa7187, whose parent is cf84aea5. `BRIEF_VERSION` and `READABILITY_GUIDANCE_VERSION` stay `polaris-dossier-readability-v1` although the text changed. This follows the practice the prior review recorded. [Observed]
