# Review 1 — implementation of PWB-REQ-014 anchor resolution (PR #571)
Reviewed commit: 58cf3fe81842ef0f543fa875512856a17e703629
Subject: PR #571 head `agent/syzygy-u05.21`, against signed PWB-REQ-014 at tag `pwb-anchor-resolution-amendment-v1.0`; review bead `syzygy-etr6`
Verdict: CONFIRM WITH EXCEPTIONS

## Scope and method

Fresh-context review of the three commits on `agent/syzygy-u05.21` over
`origin/main` (0 commits behind at review time): `d243ef12` (feature),
`30ca9020` (tests), `58cf3fe8` (evidence records only; `git diff --stat
30ca9020 HEAD` touches only the two `docs/evidence/` files, so the rule-6
record's commit carries the same source and test bytes as the head).

Judged against the signed text of PWB-REQ-014 in
`openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`
(the "Anchor shape" and "Anchor resolution count" bullets, the Case, Oracle,
Oracle independence and Falsifier additions, and the scenario "Anchor
resolution is counted, never made authority"), the sign-off record
`.syzygy/governance/decisions/PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md`
(owner selection Q2 "Keep RFC7-3", Q3 "Leave it", Q4 "Machine only"), and the
acceptance criteria of `syzygy-u05.21`. Not judged against the PR body except
where it makes a claim checked below.

Commands run in the review worktree at the reviewed commit, after `npm ci`:

- `npx vitest run --project @syzygy/three-surface-poc-app` on
  `polaris-anchor-resolution.test.ts` and `polaris-narrative.test.ts`: 21
  passed, 0 failed.
- `npm run typecheck`: exit 0.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `npx vitest run` (whole workspace): 5929 passed, 5 skipped, 1 failed. The
  one failure is `polaris-authority-sweep.test.ts` "no
  source/authority/provenance field ... names the Polaris surface", "Test
  timed out in 5000ms" under host load; re-run alone it passes (5 of 5,
  596 ms for that test). [Inferred] a load timeout, not a regression: the
  test walks the trees and this PR adds no Polaris-naming field.
- Seven reviewer-authored mutants (below), plus a read of all 23 recorded
  mutants' `old`/`new` fragments.

## Findings against the signed text

1. **Anchor shape — met.** [Observed] The anchor shape test parses the
   serialized narrative of three evaluations and requires exactly the seven
   keys (`anchorId`, `captured`, `locator`, `revision`, `supports`,
   `targetClass`, `targetId`), `captured` exactly `label`/`reason`/`tier`,
   `anchorId` beginning with its own block's id and `#`, no anchor id
   prefixed by any other block's id and `#`, and unique anchor ids; the
   denominator is pinned at 19 + 70 + 74 = 163 anchors. Mutants S1–S5 (wrong
   separator, no block, another block, missing field, extra field) are the
   falsifier limbs "an anchor missing a field of the one shape or naming no
   block or another block".

2. **Resolution predicate — met.** [Observed]
   `apps/three-surface-poc/src/polaris-anchor-resolution.ts` counts objects
   (not arrays) whose own `identity` member is a string and resolves an anchor
   iff that count for its `targetId` is exactly 1. `sourceIdentity` is a
   different key and is never counted; a composed identity is never
   synthesised. This is the signed predicate ("exactly one record with an
   `identity` field of its own whose whole value equals the anchor's target
   identity"). The duplicate case (count 2 resolves nowhere) and the
   reference/composition case (`sourceIdentity` and an array-valued
   `stamp.identity`) are each pinned by a hand-built case cross-checked
   against the independent resolver.

3. **Pair per block and narrative sum — met.** [Observed] One pair per
   registered (anchored) block and one on the narrative; the narrative pair
   is accumulated from the same loop. Tests pin the sum relation over two
   evaluations, `total === anchors.length` per block, hand-typed literals
   (observed 50 of 70 over 58 blocks, distribution `0/1:5, 0/2:6, 0/3:1,
   1/1:43, 2/2:2, 3/3:1`; baseline 54 of 74 over 61 blocks), a 0-of-3 block
   served as counted ("never rounded up"), and the signed 2-of-3 scenario.

4. **Independent resolver — met.** [Observed] The resolver in the test file
   reads only `blocks[].blockId`, `blocks[].anchors[].targetId` and the
   answer's bytes, via a `JSON.parse` reviver rather than a walk of the model,
   and imports no narrative or rendering module for the resolution itself
   (the test file imports `renderPolarisPresentation` and `NarrativeRegistry`
   only to obtain the builder's output under test). The route test feeds it
   the real `GET /api/poc` body and the real `GET /api/poc/polaris` envelope
   from a daemon on port 0, so the "machine answer's bytes" the oracle names
   are the served bytes, including `links` and `responseIdentity` that the
   builder's in-memory walk does not see. [Observed] neither adds a string
   `identity` member today (`buildResponseIdentity` returns `contentKey`,
   `excludes`, `stableAcross`, `varyingWith`).

5. **Withholding — met.** [Observed] Withholding the one resolved target
   held by the most blocks (12 blocks, hand-typed) lowers exactly those 12
   blocks by the number of their anchors naming it, totals unchanged, every
   block non-citable, narrative 38 of 70, in two forms (deleted, and demoted
   to `sourceIdentity`). A hand-built case pins a block with two anchors on
   one withheld target losing both (the "by the number of their anchors that
   name it" limb with a count of 2). Withholding every identity makes every
   block pair and the narrative pair Unknown, with reason and a resolution
   route and no `resolved`/`total`; the unevaluated fixture (no shape
   observed) is Unknown from the start, not 0 of 19.

6. **Never authority; machine channel only — met.** [Observed] `citable`
   stays the literal `false` on the narrative and each block; nothing reads
   the pair. Tests assert no block or narrative becomes citable at 2 of 3,
   3 of 3 and 6 of 6 (mutants C1, C2), the human page HTML names no pair
   (H1), the `/api/poc` body and every envelope member other than
   `narrative` carry no `anchorsResolved` (H2, H3), and the envelope carries
   exactly 58 + 1 pairs. The evidence record reports human-page byte counts
   equal before and after in all three fixtures. No new route, read,
   content class or egress is added; the daemon executes nothing new.

7. **Openings — met by absence.** [Observed] `polaris-narrative.ts` has no
   occurrence of "opening" (case-insensitive grep, 0 lines); the machine
   narrative serves only anchored blocks and deep dives, so the bullet "An
   opening carries no anchor set, so it carries no pair" has no population
   to test today.

## Verdicts on the implementer's stated decisions

- **Unknown `closedReason: 'missing-evidence'` — accepted.** The signed text
  says "every pair is Unknown with its reason" and names no closed reason.
  `missing-evidence` is an existing member of the closed reason set already
  used by `packages/three-surface-poc-core/src/model.ts` for absent
  evidence, and the condition (no record with an own identity to resolve
  against) is an absence of evidence. The reason string states the
  condition and a resolution route is carried. Lawful within the signed
  text; a later spec could name a reason, which would be a new act.
- **`PolarisRenderInputs.machineAnswer` as a test seam — accepted, with a
  note.** [Observed] No production caller sets it (`grep machineAnswer` over
  non-test `apps/**` and `packages/**`: only its declaration and the one
  read in `polaris.ts`), and production counts against the same `model` it
  renders, which satisfies "the machine answer at the same evaluation". The
  seam sits on a production interface, so nothing structural stops a future
  caller from counting against a different answer; see note N2.
- **No opening-carries-no-pair test — accepted.** The population is empty
  (finding 7), so a test would assert over nothing. When openings enter the
  machine narrative the bullet becomes testable and the test is owed then.

## AC4 — the live Butlers figure

[Observed] The PR body's "Limits" section and the evidence record's
`butlersFigure` both say the figure is not re-derived, give the reason (the
daemon binds the approved locator outside the lane's home; the 2026-10-03
captures were not retained), refuse to quote 883 of 902 as current, and give
operator steps. The bead notes route it to an operator. The disclosure is
honest under VIS-2: Unknown with reason and route, never a figure standing in
for a measurement. AC4 itself remains open (tracked as `syzygy-43l7`, per the
dispatch).

## Rule 6

[Observed] The record `docs/evidence/pwb-anchor-resolution-rule6-2026-11-02.json`
stores each mutant's file, `old`, `new`, command and outcome, at commit
`30ca9020` with per-file sha256: 23 mutants, 23 killed, and the falsifier
limbs map onto them (shape S1–S5; missing pair P1, P2; wrong pair P3, R2,
R8, R9; rounded R3, R4; count where Unknown R5, R6; Unknown where count R7;
ambiguous counted R1; citable from pair C1, C2; page/answer/envelope carries
pair H1–H3; Unknown without label R10).

Reviewer-authored mutants, each a single textual replacement in the reviewed
tree, run with `npx vitest run --project @syzygy/three-surface-poc-app
apps/three-surface-poc/src/polaris-anchor-resolution.test.ts`, file restored
after each:

| Id | File | Mutation | Outcome |
|---|---|---|---|
| X1 | resolution.ts | count distinct resolved targets per block, not anchors | killed (2 failed) |
| X2 | resolution.ts | narrative total counts distinct targets per block | killed (2 failed) |
| X3 | resolution.ts | stop descending below a record once its own `identity` is counted (`continue`) | **survived** (15 passed) |
| X4 | resolution.ts | a block with 0 resolved is served Unknown | killed (8 failed) |
| X5 | resolution.ts | narrative resolved rounds the last block up to its total | killed (9 failed) |
| X6 | resolution.ts | walk only the first member of every array | killed (8 failed) |
| X7 | narrative.ts | each block gets its neighbour's pair (index + 1) | killed (10 failed) |

X1, X2 and X5 exercise count limbs with N >= 2 blocks; all killed.

## Notes (none blocking)

- **N1. X3 survives: the builder's full descent below an identified record is
  unpinned.** No fixture model and no hand-built answer nests a record with
  its own `identity` beneath another record that has one, so a walker that
  stops at the first identified record reproduces every pinned figure. The
  production walker is correct today (it pushes every member). A future
  answer shape with nested identified records (for example an item carrying
  its own source records) would make the builder under-count, and the route
  test would catch it only if a fixture happened to nest. One hand-built
  answer with a nested identified record, compared against
  `independentResolve`, kills X3.
- **N2. `machineAnswer` lives on the production `PolarisRenderInputs`.** It
  is the only way to withhold while the page still renders, which is a fair
  reason; but `'machineAnswer' in inputs` means a production factory that
  ever spreads an object carrying the key (even `undefined`) silently counts
  against something other than the rendered model. A test-only entry point,
  or a guard that the seam is unused in `routes.ts`, would pin "same
  evaluation" structurally.
- **N3. "A status claim fed by its pair" is pinned only by key name.** H2
  and H3 inject the literal key `anchorsResolved` into the envelope evidence
  or `/api/poc`, and the test asserts the string is absent. A status claim
  derived from the pair under another name (a label or a count copied into
  a model field) would pass. [Inferred] no such consumer exists: nothing in
  the diff reads the pair. Acceptable for this slice; a reader-side sweep
  would be stronger.
- **N4. Every human-page render now walks the whole model.**
  `renderPolarisPage` calls `renderPolarisPresentation`, which computes the
  narrative (and so `ownIdentityCounts` over the model) and discards it. The
  walk is linear and iterative; [Unknown] its cost on a Butlers-sized model,
  which no record measures. Not a correctness issue.
- **N5. Whole-workspace run hit a 5 s load timeout** in
  `polaris-authority-sweep.test.ts` (see method); unrelated to this diff, but
  the battery report for this head should come from a run where it passes.

## Verdict

CONFIRM WITH EXCEPTIONS — no revise finding: every signed obligation,
oracle limb and falsifier limb examined is implemented and pinned, the
three implementer decisions are lawful within the signed text, and AC4 is
disclosed as Unknown with reason and route. Notes N1–N5 are non-blocking.
