Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: db185da4b82a56e5b2762a0e52324fa9fa1bf3fc
Subject: syzygy-pdja.17 reader standards
Reviewer: fresh-context subagent, 2026-11-08

Scope: `git diff origin/main..db185da4` (origin/main = 8ee4d0f7), 15 files. The wording of
RS-1..RS-25 was not reviewed (owner-approved). All findings are notes; none blocks or
requires revision.

## What was checked, and how

- Three copies equal [Observed]: `sha256sum` of `.claude/.../reader-standards.md` and
  `.codex/.../reader-standards.md` both `ede073f1...e7e9555`; `cmp` reports identical;
  `reader-standards.test.ts` compares each copy to `READER_STANDARDS` and the codex-copy
  mutant fails it (re-run below).
- Version and digest recorded truthfully [Observed]: `READER_STANDARDS_SHA256` is computed
  from the constant (`reader-standards.ts:191`), not transcribed; the brief record
  (`brief.ts:298`), the brief heading and the design criterion lead all name that value and
  `polaris-reader-standards-v1`; the brief test reads the expected digest from the shipped
  skill file (independent of the module under test).
- Brief nesting [Observed]: the section is placed after `## Readability`; its title becomes
  one `##` heading and the nine `##` subheadings become `###`; the `Version:` line and its
  following blank line are dropped. Pinned by `brief.test.ts` and `reader-standards.test.ts`.
- Advice cannot change outcome, exit code, or stored record [Observed]: `check.ts:262-266`
  computes advice after the record is built and logged, adds it only to the report, only
  for `plan.command === 'check'` (never `inventory-check`) and only when the draft parsed.
  `cli.ts:323` derives the exit code from `report.outcome` alone. `check.test.ts` new case:
  an RS-13 title yields outcome `passed`, `findings: []`, exit 0, and `checks/rev-0.json`
  contains neither `readerAdvice` nor `RS-13`.
- Heuristics against the standards text [Observed]: RS-13 titles of sections and deep
  dives; RS-14 `deepDives.length > 3` (text: "at most three"); RS-16 only sections, matched
  by diagram `sectionId` (the draft schema's field, `draft-schema.ts:165`) ("Counted for
  sections with no diagram"); RS-19 counts block `text` plus children's `text`, skipping
  any entry with a `kind` (elements), threshold `> 300` ("about 300 words ... outside
  diagrams and elements").
- No crash on malformed drafts [Observed]: a scratch vitest (deleted after; not committed)
  fed `readerAdvice` every pairing of `null, 1, 'x', [], {}, true, [null], [1], ['s'], [[]],
  {length:5}` into `sections`/`deepDives`/`diagrams`/`paragraphs`/`children`/`title`/`text`/
  `id`/`sectionId`, plus an `Object.create(null)` doc and `__proto__`/`toString` ids. No
  throw; `__proto__` id is reported correctly as undrawn (Set, not object lookup).
- Scope [Observed]: `git diff --name-only` touches nothing under `.syzygy/**` or
  `openspec/**`; every code change is in `packages/polaris-dossier` (operator-agent dossier
  mode); no provider-generation package changed. `BRIEF_VERSION` is only emitted, never
  compared by any reader (`grep briefVersion` over packages/apps/scripts, non-test), so the
  v3 to v4 bump changes no gate's acceptance. The design-verdict schema is unchanged
  (findings bound 0..1000).
- Tests and typecheck [Observed]: `npx vitest run packages/polaris-dossier/src/{reader-standards,brief,check,cli,design-review}.test.ts`
  260 passed; `npx tsc --noEmit -p tsconfig.json` exit 0. `git status` clean before and
  after.
- Mutation record [Observed]: all ten `subjectDigests` in
  `docs/evidence/syzygy-pdja-17/reader-standards-mutants-2026-11-08.json` equal the bytes
  at db185da4. Re-ran three recorded mutants, each alone, restored with `git checkout --`:
  - `report-no-advice` (check.ts): killed, 1 failed (check.test.ts new case).
  - `elements-counted` (reader-advice.ts): killed, 1 failed (RS-19 case).
  - `codex-copy-diverges` (.codex reference): killed, 1 failed (copy-equality case).

## Findings

1. note - `packages/polaris-dossier/src/reader-standards.ts:196-201`, `brief.ts:205`.
   The brief heading says "(`polaris-reader-standards-v1`, sha256 `<d>`)" over a body that
   is a transform of the standards (version line removed, headings demoted), so hashing
   the carried section does not give `<d>`; `<d>` is the digest of the reference file.
   This is truthful as "the standards' digest" and the brief record says the same, but a
   reader checking the brief's own text cannot reproduce it. Consider naming the subject
   ("sha256 of references/reader-standards.md") in the heading or the intro sentence.

2. note - `packages/polaris-dossier/src/reader-advice.ts:252-256`. RS-13 heuristics flag
   common proper names and non-symbols [Observed, scratch run]: "Node.js and Deno",
   "Next.js rendering" (file), "Why PostgreSQL", "GitHub Actions" (PascalCase),
   "The iPhone client", "gRPC transport" (camelCase), "Read/write paths", "I/O scheduling",
   "TCP/IP" (path). The detail says "may" and exempts product or proper names, and it is
   advice only, so no outcome is affected; but `I/O`, `read/write` and `TCP/IP` are not
   proper names, and the path rule will be noisy in prose titles. Not a correctness defect.

3. note - `packages/polaris-dossier/src/design-review.ts:81-82` with the standards' "How
   to use them" bullet. The standards ask the design reviewer to answer pass, fail or not
   applicable per standard and page, while the verdict schema has no slot for passes or
   n/a and the new criterion asks only for a finding per failure. The criterion's own
   "Where a standard and a criterion above differ, the criterion governs" resolves it, so
   the reviewer is not stuck; noting that the carried text and the packet's request differ.

4. note - `packages/polaris-dossier/src/cli.ts:322`. The comment still says only
   `reviewVisibility` and `screenCensus` are report-only; `readerAdvice` is now a third.
   Unchanged by the diff, so slightly stale.

5. note - mutation record `subjectDigests` omit `packages/polaris-dossier/src/cli.test.ts`
   (in the record's `command`, changed by this diff) and both `SKILL.md` files. Rule 11 is
   met for the files listed; the run's full test input is not entirely digest-anchored.

6. note - no test pins that `inventory-check` reports no `readerAdvice`, or that a draft
   with a parse fault yields none. Both are guarded in code at `check.ts:262`; risk is low.
