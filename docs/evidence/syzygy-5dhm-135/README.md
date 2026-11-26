# syzygy-5dhm.135: the per-kind floor (REQ-polaris-generation-034 version 2.32)

Evidence for the question-kind floor: check's advice on the kinds of newcomer question (purpose, structure, mechanism, rationale,
change, limits) no declared block answers per major unit. The specification is
`openspec/changes/dossier-question-kind-floor/`; its review is `docs/reviews/syzygy-5dhm-135/R-QUESTION-KIND-FLOOR-1-RAW.md`.

## Specification bytes

- `question_kind_build_spec.py` builds the 2.32 text from the 2.29 text (A-306); `question_kind_inverse.py` removes the builder's
  additions and compares the result with 2.29, and the 215 predecessor scenarios with the first 215 of 2.32. It shares the builder's
  literals, so it checks the builder's arithmetic; the review's own line diff is the independent check.

## Replay over the stored drafts (acceptance 2)

- `question-kind-replay-2026-11-25.json`, from `question_kind_replay_all.sh`, `question_kind_replay.ts` and
  `question_kind_combine.py`. [Inferred] No stored draft declares `questionKinds`, so the harness tags each Inferred claim block by a
  published keyword rule (its `rules` member) in place of an author's declaration; the record's `caution` says so. Over the six stored
  Redis runs, `change` is missing in every major directory of every run (`changeMissingInEveryMajorDirectory`), which agrees with the
  pilot's weakest kind (change); the comparison with the pilot's per-kind shares is Inferred. The one stored run of another repository
  is left out of the record.

## Mutation (rule 6)

- `question_kind_mutation.mjs` mutates each new predicate (major units, the Unknown forms and the guard, row validity, counted blocks,
  citation reach, the secret detector, field-version, the schema, check's wiring and the brief paragraph). Each record stores every
  mutant's `old` and `new` fragment, the commit and the subject digests.
- `question-kind-mutation-2026-11-25.json`: 29 mutants, 26 killed. The three survivors (an empty identifier kept, a repeated block id
  counted twice, check passing no detector) each got a test.
- `question-kind-mutation-survivors-2026-11-26.json`: those three re-run over the added tests, 3 of 3 killed.

## Comprehension regression (CONTRIBUTING.md)

- `question-kind-rerender-2026-11-26.json`, from `question_kind_rerender_all.sh` (through
  `docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts`) and `question_kind_rerender_compare.py`: the six stored Redis runs
  rendered with the merge-base tree and with this branch. [Observed] Every file of every site is byte-identical (`allIdentical`), so a
  reader of a re-rendered stored run reads what the kept pilot arms read, and its before and after shares are equal; no reader was run.
  [Unknown] Brief v21 changes what a new authoring session is asked; no new run was made, so its effect on the reader's share is not
  measured.
