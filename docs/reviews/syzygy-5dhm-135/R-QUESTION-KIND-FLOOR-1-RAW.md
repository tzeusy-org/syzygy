# CONFIRM WITH EXCEPTIONS
Reviewed commit: cc9b609428df72f2b34bf8b08ae30e81b55c9077
Spec sha256: 2c6936eaf293c1ad636b6c54cf092fb3ce9f4bba1fafa5ed382dfa8b9ea151ab
Reviewer: fresh-context general-purpose agent, 2026-11-25

Subject: `openspec/changes/dossier-question-kind-floor/` (spec 2.32 at the digest above), the `packages/polaris-dossier` diff against
origin/main, the `QKIND_*` reconciliation wiring and `docs/evidence/syzygy-5dhm-135/`. Predecessor
`openspec/changes/dossier-brief-terminology/proposed/polaris-generation/spec.md`, sha256 recomputed:
`64944deafb9ae449323a0b0308929bd0d5fa071f8f4e048a06c4157bfa5aa60c` (matches the delta).

## What was checked, and held

- [Observed] Independent inverse (Python `difflib` over lines, not the commit's own inverse script): the only differences from 2.29 are
  line 1 (title), line 3 (banner), six inserted lines after line 222 (three paragraphs, L224/L226/L228, with blank lines), 28 inserted
  lines from L1502 (five scenarios), and pure suffixes on L1533 (Observable), L1534 (Oracle), L1536 (Falsifier), each predecessor line
  kept as the prefix. Scenario headings: 215 in 2.29, 220 in 2.32. SEMANTIC-DELTA.md is accurate.
- [Observed] `QKIND_SUBJECTS` in `scripts/check_spec_reconciliation.py` pins the digest above; `check_spec_reconciliation.py --check`
  reports 7 of 7 without FAIL (R6 WARN is the pre-existing PWB pin, syzygy-2g0d).
- [Observed] The brief v21 paragraph in spec L228 (between `which reads: "` and `" Every statement above`), `QUESTION_KINDS_PARAGRAPH` in
  `brief.ts:162` and the independent literal in `brief.test.ts:359` are byte-equal (864 code points, all ASCII); it sits after the
  worth-knowing paragraph and before `## Task routes` (`brief.ts:205-209`).
- [Observed] Predicates match L226: Unknown unless schema v13 and tree listed and at least one row with a non-empty string `blockId` and
  one valid kind (`question-kinds.ts:82,83,92,101`); major units = `.` with listed files (`files - secretPathsLeftOut`), then listed
  `top-level-unit` facts with `files*20 >= listed`, files descending then code unit, at most 8 (`:71-77`); counted blocks = claim blocks
  (`textKey 'text'`, so not understanding items), label `inferred`, id named, counted once, kinds unioned (`:107-112`); first path
  segment rule (`:114-118`); `missing` in kinds order; `unmatched` first-mention and `duplicated` second-mention order (`:85-100,133`).
- [Observed] Schema: closed object `{blockId: handle, kinds: 1..6 of the six, uniqueItems}`, 0..2000 rows, v13 only
  (`draft-schema.ts:400`); a repeated kind surfaces as kind `schema` (`check.test.ts` last case passes). Earlier schema: one
  `field-version` at `$.questionKinds` with the spec's detail, suppressing the schema finding (`check-derive.ts:708-710,725,772-773`).
  "v12 or earlier" in the spec versus "v10 or earlier" in code follows the 2.26 worth-knowing precedent (spec L162; the code knows no
  v11/v12 draft, `draft-schema.ts:55-59`).
- [Observed] The advice cannot change an outcome, record or gate: it is computed after the check record and step-log line are written
  (`check.ts:388` after `:342-350`), only for `check` with a parsed draft, spread into the report alone; nothing reads it. The test pins
  that neither `checks/rev-0.json` nor `steps.jsonl` carries it. The only outcome effect is the member's own schema/field-version
  findings, which the spec states.
- [Observed] No secret path is named: unit names come from `deriveTreeFacts`, which drops every blob whose path or any directory prefix a
  detector matches (`derive.ts:204`) and already appears on the report as `structureRecord`.
- [Observed] Inert-member argument: the 2.12 conditions (optional, never rendered, read by no gate, "accept the member whichever of the
  two schema files its run was briefed with") carry over; check validates against the code's schema, never the run's
  `draft.schema.json` (no reader of that file outside `draft-schema.ts`, `state-directory.ts`, `cli.ts`), and the step guard compares
  tool and provider, not the schema digest (`brief.ts:39-41`), so runs briefed with v19/v20 keep checking. 2.26 (L148) requires a new
  number only for a schema joining v11/v12 to the mark; it does not forbid a v14, so design.md's sentence is a cost argument, not a bar,
  but the 2.12 precedent alone suffices.
- [Observed] Provider golden: `git diff origin/main...HEAD -- apps` is empty; the provider schema is not `localDraftSchema`.
- [Observed] Tests: `question-kinds.test.ts` (6), `brief.test.ts` (42), `regression-hold-out.test.ts` (7) and the four new
  `check.test.ts` cases pass. Expected values are literals. The bead's two cases are covered: no-`change` unit advised
  (`question-kinds.test.ts:71-73`, `check.test.ts` first new case), all-six unit not advised (`question-kinds.test.ts:66-67`). The
  boundary fixture (docs = 5 of 100 listed, 102 total) kills a `>`-for-`>=` mutant and a `files`-for-listed mutant [Inferred: by hand].
- [Observed] The six kind spellings match the pilot key (`docs/evidence/pursuit-2026-11-21b/pilot/`: purpose, structure, mechanism,
  rationale, change, limits).

## Findings

F1 (advisory; must land before the bead closes) [Observed] Acceptance 2 ("the newest stored draft, replayed, shows the gaps the pilot
found") has no retained record at this commit: `git ls-files docs/evidence/syzygy-5dhm-135/` lists only the five scripts, and
`tasks.md:4` is unchecked. `README.md:5` nevertheless says "The replay over the stored Redis runs is `docs/evidence/syzygy-5dhm-135/`",
a sentence that is false at this commit. [Inferred] Because no stored draft declares kinds, the replay's declarations come from a keyword
proxy (`question_kind_replay.ts:18-26`), so the replay can show what the floor reports over proxy tags, not that author declarations
reproduce the pilot's 0.04/0.29 gaps; the record should say so in its first lines, and compare unit-by-unit with the pilot's per-kind
shares only as Inferred. Also: an untracked `__pycache__/` sits in that directory; keep it out of the commit.

F2 (advisory) [Observed] `declarations.unmatched` and `declarations.duplicated` echo draft-written `blockId` strings onto the report with
no secret screening (`question-kinds.ts:90-97,133`). This is the class syzygy-9xvm (open, BLOCKED) is fixing for
`inventoryOmissions` (`inventory-coverage.ts:118`); this change adds two more unscreened lists. It does not weaken SEC-5 (no path is
named, and it is the author's text back to the author), but because the advice is computed for any parsed draft, including one whose
schema check failed, a `blockId` here is any non-empty string of any length, not only the handle form. Either drop and count ids that
`secretPathOf(screen)` matches now, stated in L226, or add these two lists to syzygy-9xvm's scope in the bead.

F3 (advisory) [Inferred] `check.ts:388` calls `questionKindAdvice` with no guard, while L226 says "a failure to compute it never refuses
or fails a check". I found no throw path over parsed JSON (the helpers `list`/`text`/`isRecord` are total; `collectBlocks` is shared
with other advice), so this is a structural, not an observed, gap: a throw would escape after the check record is written. A
`try`/`catch` mapping to the Unknown form would make the sentence true by construction.

F4 (advisory) [Inferred] Test gaps against the Falsifier (L1536) and L226: no fixture names an understanding item in `questionKinds`, so
deleting `block.textKey !== 'text'` at `question-kinds.ts:108` survives; no non-normative block case (the Falsifier names one); no
render or `machine.json` test that the member reaches no page (the Falsifier names "a page"); the unlisted-tree Unknown is unit-tested
only. The bead's two required cases are covered; these are additional.

F5 (advisory) [Observed] `question_kind_inverse.py` imports the builder's literals (`:13-17`), so it is not independent of the builder,
and `inv.replace(b.SCENARIOS, '', 1)` (`:25`) has no count assertion, unlike the other removals. The independent diff above confirms the
result, so the delta stands; the script is weaker evidence than its docstring suggests.

F6 (advisory) [Inferred] On the top-level-unit choice: acceptable as a disclosed stand-in for the absent coverage plan, and versioned
(`major-unit` v1) so it can be replaced. Limits worth one sentence in design.md: rule `top-level-unit` lists the first 250 directories
by code unit, not by size (`derive.ts:208`, `census.ts:30`), so a large directory past that point is never major (only `unitsNotListed`
shows it); a monorepo's `packages/` or `apps/` becomes one unit, so per-package gaps are invisible; and the `.` unit is answered by any
declared block, so its `missing` is the weakest signal. The 1/20 share and the cap of 8 are not justified beyond the `.github` example.

F7 (nit) [Observed] L224 says "no label, citation, quotation, finding, gate or rendered byte rests on it", yet the member's own `schema`
and `field-version` findings do rest on its shape (stated two sentences later). The wording is inherited from 2.12 (L222: "no label,
citation, quotation or finding rests on it"), so it is consistent with precedent, but "no finding but those of its own shape" would be
exact.

Blocking: none. Advisory: F1-F6. Nit: F7.
