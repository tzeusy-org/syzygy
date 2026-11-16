# Consent live module: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.19`
(pull request #517). The change does four things:
- It moves the consent gate's in-force rules (`inForceRecords`,
  `notInForceRecords` and `NotInForce`, with their helpers `ref`, `Dead` and
  `effective`) out of `consent-ports.ts` into a new module, `in-force.ts`.
  `consent-ports.ts` re-exports them.
- It adds the subpath `@syzygy/polaris-generation-consent/live`
  (`src/live.ts`). Every value it exports is the root's own object.
- The dossier's `screen.ts` and `gate-sources.ts` import that subpath, and
  `package-reader.ts` imports `in-force.js`.
- `island-boundary.test.ts` drops its `consent-ports.ts` exception.

So the `syzygy` CLI no longer loads the core provider island: its runtime load
set falls from 139 to 131 workspace modules, with island 0 of 20 (raw section
3, item 8). This is the residual that 8.1's review left on this bead (8.1's
N1).

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-CONSENT-LIVE-MODULE-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `59f04097` | `r1-review.diff` sha256 `6496aab116fb68950f2d269da970be609b4bfb1c14d055f4691f0b32e7929bd0` |

The subject equals `git diff 9a30237ed700e6579f3fcc1c6292e6c759861c3f
59f0409701b9a9291907d8acbd0d6559df7db1a4`. At landing the branch took one
merge of main `7de5dc40` (#516 and #509). #509 also edits `vitest.config.ts`,
two lines in another hunk, and git merged that file without conflict. So after
the merge, `git diff origin/main HEAD` differs from the subject in one way
only: that file's `index` line names different blobs. With every `index` line
removed, the two diffs print the same sha256
(`8e7f7b0f6c84b5141a94fa0e2e939d240af47da8788c3d2a54a130d2e1afc5db`).

The reviewer found "There are no blocking findings (no F ids)." (section 4),
with seven notes. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and the results this record relies on are kept under
`docs/evidence/consent-live-module-review-2026-10-24/`, 34 files:
- `tools/` (8 files): `verbatim.py`, `identity_probe.mjs`,
  `zz-r517-identity.test.ts`, `esbuild_inputs.mjs`, `evidence_heads.py`,
  `make_reviewer_differential.py`, `differential_reviewer.mjs` and
  `census_reviewer_mutants.py`. `zz-r517-identity.test.ts` is kept as the
  reviewer ran it. It sits outside every Vitest project's `include` and every
  tsconfig, so the suite never runs it.
- 26 result files:
  - `results-*` (6), the verbatim-move, compiled-diff, identity, esbuild and
    evidence-head results;
  - `loads-base.json` and `loads-head.json`;
  - `reviewer-boundary-spec.json` (sha256
    `178c73c451eeddad737ecabf86bd2ae305ad669bfeac339b91d47fdda82050cb`), which
    holds each boundary mutant's `old` and `new` fragment, with
    `reviewer-boundary-mutants.json` and `reviewer-boundary.log`;
  - the census re-runs `census-before-rev.json`, `census-after-rev.json`,
    `census-mutants-rev.json`, `census-mutants-rev.log` and
    `census-reviewer-mutants.json`;
  - the differential sample and negative-control reproduction,
    `diff-sample.json`, `diff-sample.log`, `nc-repro.json` and `nc-repro.log`;
  - the gate-port extension (N1), with its logs:
    - `gp-diff.json`, sha256
      `68fc2a821cb48ffcae1ed137bbfdb44d3e04010e748fee5da7b7d861fa6cfa4f`;
    - `gp-nc1.json`, sha256
      `6c2645cb4d7d49e1eb9736c0b5450db33095a1cfb2e481024105869608931620`;
    - `gp-nc2.json`, sha256
      `da73adeca451575ed2d3fc27881ed9f9e5c4ed6fd0e7cd5e959a8ac2296e62f8`.

Not retained: the two `check_governance` transcripts, which name the
reviewer's scratch paths, and the `npm ci`, typecheck and targeted Vitest
logs. The raw quotes the result line of each (section 3, items 1 to 3).

## N1: the committed differential never asks the gate sources' port-backed questions

[Observed by the reviewer] `scripts/differential_consent_act_families.mjs`
has no reader that calls `repositoryIdsFor`, `consentAbsenceFor`,
`consentedRevisionsFor`, `observationConsentFor` or `screeningPolicy`. Those
are the gate-sources methods that reach the moved rules. Its `port` reader
runs in base and policy-bytes worlds only: 22 of 56,781 answers, none in an
altered-prose world. The reviewer's extension adds a `gate-port` reader:
- 0 mismatches over 2,765 answers, 218 of the worlds altered-prose;
- `gate-port` 486 answers and `port` 486 answers;
- a blunt in-force mutant moves 25 of 30 `gate-port` answers, so the reader is
  wired to the moved rules.

**Disposition:** for this change, the extension supplies AC3's evidence for
the port-backed answers, and `gp-diff.json`, `gp-nc1.json` and `gp-nc2.json`
are retained as that evidence (above). The script's fix is carried to
`syzygy-bpyt.8.26`, which already extends the records-port comparison. It
should:
- fold `gate-port` and `port` into the shared script's `ADMISSION` readers,
  with the fragments in the retained `tools/make_reviewer_differential.py`;
- add one world where an observation record has a successor that took effect;
- turn a negative control's `controlNote` expectation into a checked
  predicate (per reader, mismatches above 0).

## N2: `syzygy-bpyt.8.23` is not moot

[Observed by the reviewer] The pull request body says "syzygy-bpyt.8.23 is
moot: the exception it concerns is gone." Bead 8.23 has two halves. Its N3
half, the whole-module `consent-ports.ts` exception, is the one this change
deletes. Its N2 half (computed `import()`, `createRequire`, Node condition
order, a second entry) stands: the reviewer's R3 (a computed `import()` in
`in-force.ts`) and R4 (a `node` condition ahead of `import` in consent
`./live`) both survive `island-boundary.test.ts` at `59f04097`. Under R4, Node
resolves `./live` to `dist/index.js`.

**Disposition:** the pull request body's sentence is corrected here: 8.19
resolves only 8.23's N3. Bead 8.23 stays open for its N2 half, with R4's
consent-`./live` variant added to its acceptance mutants. The fragments are in
`reviewer-boundary-spec.json`.

## N3: `in-force.ts`'s header says the package reader only reports by the rules

[Observed by the reviewer] `in-force.ts:3-4` says the package reader
"reports by it". Its records port also grants by it: the observation and
egress consent `check` (`package-reader.ts:979-985`), and the dossier start
gate's `observationConsentFor` (`gate-sources.ts:506-509`).

**Disposition:** filed as `syzygy-bpyt.8.31`, a comment-only change. It cannot
ride in this pull request, because any byte change would retire round 1.

## N4: the consent README's "Entry points" heading sits over the consent-ports list

[Observed by the reviewer] `packages/polaris-generation-consent/README.md:10`
puts `## Entry points` between the intro paragraph and the list that describes
`consent-ports.ts` (lines 22-51). So that list reads as part of the `./live`
entry point, which line 15 says excludes `consent-ports.ts`.

**Disposition:** filed as `syzygy-bpyt.8.31`, beside N3.

## N5: the boundary test's failure does not name the edge that caused it

[Observed by the reviewer] Every killed boundary mutant fails with the same
line, "AssertionError: expected [ …(11) ] to deeply equal []". It lists the
core root's 11 re-exports of the island, not the CLI-side import that reached
the root.

**Disposition:** carried to `syzygy-bpyt.8.23`, as the raw proposes: report
the first path from the entry for each island edge, or assert in test 3 that
neither the consent root nor `consent-ports.ts` is reached, each with its own
message.

## N6: three hand-kept resolution maps for consent `./live`

[Observed by the reviewer] `package.json` `exports`, `vitest.config.ts:9` and
`no-egress.test.ts:38` each resolve `./live` to `src/live.ts` today. The
reviewer's R5, which points the Vitest alias at `src/index.ts`, survives the
boundary test, which reads only `package.json`.

**Disposition:** carried to `syzygy-bpyt.8.23`: a test that every `@syzygy/*`
key in the Vitest alias map resolves to the `src/` module its package's
`exports` names. The raw's section 7 adds one more item for that bead. The new
positive control passes only while `consent-ports.ts` imports the core root,
so a later bead that decouples `consent-ports.ts` must re-point it.

## N7: the `prompts.ts` ruling and the owner notice

[Observed by the reviewer] The `prompts.ts` ruling (8.1's N5) was recorded
only in the pull request body, and no 8.19 owner notice was on
`syzygy-bpyt.10`.

**Disposition:** the ruling is recorded here, in 8.19's close reason and on
the epic `syzygy-bpyt` as an input to the next audit's island list.
`prompts.ts` stays in core `./live`. Moving it into the island would remove
names from a subpath already on main, which is a class-6 endpoint removal.
Island membership is the next audit's question under the Q8 row ("Deletion is
revisited at the next audit"). The reviewer agrees (section 2). The owner
notice is posted on `syzygy-bpyt.10` at landing.

## Class

Classes 1 and 4, and class 6 additively, by the reviewer's ruling (section 2).
Class 3 is not touched. The stop clause is not triggered: the reviewer found
no input on which any gate accepts or refuses differently. GP-Q0's three
checks:
- **Differential: met.** The committed differential has 0 mismatches over
  56,781 answers. The reviewer's sample has 0 over 4,019, and each of its 518
  per-world vectors equals the committed one. The gate-port extension has 0
  over 2,765 (N1).
- **A rule-6 mutant per predicate: met for the predicates the test
  implements.**
  - Boundary: 10 recorded mutants are killed. The reviewer's B1, B4, R1 and R2
    are killed. R3 and R4 survive, the class 8.23 owns (N2), and R5 survives
    (N6).
  - Census: 8 of 8 recorded mutants behave as recorded, plus the reviewer's 2.
    R-C2, a type that changes shape, survives the census, and the build fails
    on it.
- **Owner notice:** posted at landing (N7).

## Acceptance criteria (raw section 6)

- AC1 met. The boundary test has no exception and passes, 4 of 4. B1 and B4
  fail it, and the reviewer reproduced both.
- AC2 met. The census, re-derived, equals the record: `./live` is additive (48
  names, every value the root's object), and nothing is removed.
- AC3 met, with the reviewer's extension supplying the port-backed answers
  (N1).
- AC4: the raw is the independent class 1 and 4 review. The owner notice is
  posted at landing.
