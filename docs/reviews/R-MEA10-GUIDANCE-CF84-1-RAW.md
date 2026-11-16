# R-MEA10-GUIDANCE-CF84-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: cf84aea563a27d733adbcf9c86408f9776784691

Scope: `git diff 9bf1bb82 cf84aea5` (6 files). Commands run from the worktree root: `npx tsc --noEmit -p .` exit 0 with no output. `npx vitest run packages/polaris-dossier/src/render.test.ts packages/polaris-dossier/src/brief.test.ts apps/three-surface-poc/src/polaris-generation`: 24 files, 362 tests, all passed. The provider golden is in that population.

## Acceptance criteria

AC1, consistency with the existing rules and no project content: met, apart from findings 1 and 2. [Observed] I checked each of the four rules (packages/polaris-dossier/src/brief.ts:56-59) against the labelling, citation and quotation rules and DOSSIER_GUIDANCE (brief.ts:47-50).
- None of the four rules prescribes an `Inferred:` prefix.
- Rule 4 limits backticks to text outside quotations, which agrees with DOSSIER rule 4's "without adding backticks" and with the lead-in-only quotation form.
- Rule 1's "one idea to a sentence" does not apply to quotations, which are verbatim.
- Rule 2 is gated on "sections whose sources describe…", which agrees with DOSSIER rule 2 (never bridge an unshown hop).
- The preamble at brief.ts:162 keeps every rule above it in force.
- No project name or content appears. The test fixture's `Client`/`Server` labels are in a test only.

AC2, expressible in the draft schema: met, apart from finding 3. [Observed]
- The kinds named (`flow`, `boundary`, `dependency`, `lifecycle`, `state-machine`) are all in DIAGRAM_KINDS (polaris-generation-core/src/draft-model.ts:17).
- The diagram limit is 0-20 and the section limit 1-30 (draft-schema.ts:126-132). One diagram for each of the five owner-topic sections, plus "several small" ones, fits.
- Children render as `<ul class="block-children"><li>` (dossier-site.ts:273), so "renders as a bulleted list" is true.
- The render test adds a diagram (`d-core`) that no requested asset names, and the run renders, so an extra diagram is accepted.

AC3, severity and quoting: met, apart from finding 4. [Observed] design-review.ts:78 makes a readability finding advisory by default, and blocking only "where the page cannot be followed". It asks for no quotation; design-review.ts:82 still forbids quoting.

AC4, local-only placement, tests and mutant record: met, apart from finding 5. [Observed]
- dossier-site.ts:333-335 swaps the order only when `local !== undefined`.
- The provider golden passes.
- Tests pin the guidance strings (render.test.ts:968-976; brief.test.ts:169-177) and the figure-before-block order (render.test.ts:952-966).
- Every `subjects` digest in the mutant record equals `git show cf84aea5:<path> | sha256sum`, for all 3 paths (brief.ts 4a49cc98…, dossier-site.ts 384b3eec…, design-review.ts 54d27bdb…).
- All 8 mutants are recorded as killed, each with its `old`/`new` fragment.

AC5, no new defect: met. The typecheck and the tests are green. Findings 1-5 are guidance-quality issues or record-accuracy notes.

## Findings

1. Non-blocking. brief.ts:56 asks the agent to say "what the project does and why someone would use it". No sourcing qualifier sits next to "why someone would use it". DOSSIER rule 4 (brief.ts:47) says an advantage no source states "is never written, not even as Inferred:", and allows a stated advantage only as a quotation. The general preamble (brief.ts:162) covers this, but the sentence itself invites unsourced benefit prose. Suggest "…why someone would use it, as its sources state". [Inferred]

2. Non-blocking. brief.ts:56 says "give a concrete example before an abstraction" without saying that the example must come from the cited sources. DOSSIER rules 1 and 7 forbid any claim no source supports, and a made-up example is exactly the "plausible general account" rule 7 rules out. Suggest "a concrete example from the sources". [Inferred]

3. Non-blocking, answering AC2's direct question. A block carries 0-12 children (draft-schema.ts:103), and children cannot have children of their own. An enumeration of more than 12 items therefore cannot be "a short lead block" with each item its own child. It still has a lawful form: split it across several lead blocks of at most 12 children each, since a section holds up to 30 blocks (draft-schema.ts:126). Rule 3 (brief.ts:58) does not say this, so an agent may hit a schema refusal and spend a repair cycle. The guidance should add one clause, e.g. "more than twelve items: group them under several lead blocks". [Observed limits; Inferred cost]

4. Non-blocking. Repair-cycle risk in the design criterion: design-review.ts:80-81 declares `readiness` ready only when no finding is blocking and every page is acceptable. design-review.ts:78 does not say that an advisory readability finding leaves the page acceptable. A reviewer may mark a page `deficient` for an advisory, subjective finding such as "needs prior knowledge", and that blocks readiness and costs a cycle. Suggest adding "an advisory finding alone does not make a page deficient". [Inferred]

5. Non-blocking. Record accuracy: the mutant record's `baseCommit` is 003cff41. That commit is the pre-rebase twin of 34f3bdbe (its parent is bcfe5f8c) and is not an ancestor of cf84aea5 (`git merge-base --is-ancestor` fails). The `note` says "working tree on baseCommit, committed unchanged next", but what was committed next is 34f3bdbe, not 003cff41. The subject bytes are identical at 003cff41, 34f3bdbe and cf84aea5 (checked for all 3 paths), so the digests remain a valid anchor and the outcomes stand. Separately, no mutant targets rule 4's string (brief.ts:59), though the test at render.test.ts:975 pins it. [Observed]

Observation, not counted as a finding: the brief's text changed but `BRIEF_VERSION` (brief.ts:34) stays `polaris-dossier-brief-v1`. This follows the existing practice: the version has never moved across the file's 11 prior commits. The new sub-version `polaris-dossier-readability-v1` labels the added bytes.
