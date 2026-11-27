# R-CHOICE-FLOOR-2 — syzygy-5dhm.43 choice floor rebuilt as 2.37
Reviewed commit: 9646d280429c64d4f3e6876e2f5ec8fc1d8624a8
Verdict: REVISE

Scope: the PR's own files (28, from `git diff --name-only $(git merge-base origin/main 9646d2804) 9646d2804`), compared
as PR-net diffs (merge-base 1c42a078e..95c3f3b0d against merge-base 00a8f8d8c..9646d2804). 17 files changed their net
diff since R-CHOICE-FLOOR-1; `packages/polaris-dossier/src/reader-advice.ts`, `check.test.ts` and
`reader-standards.test.ts` did not (their net PR diff is byte-identical to the first review's). New PR commits:
7a55940f1 (spec + wiring), 9a1859b50 (A-336 + routes), 256f6394d (wiring mutants); merges ea4f58380, 2133a5170,
9646d2804 (remerge-diff: conflict resolutions in AGENT-ADOPTIONS.md, PROJECT-STATUS.md, openspec/README.md, census.json,
and ea4f58380 dropped the 2.33-era reconciler/counter wiring).

Environment: snapshot worktree at 9646d2804; a scratch clone (origin = the GitHub remote, origin/main = 00a8f8d8c) for
runs that need protected main and for revert trials.

## Findings

1. **[High] [Observed] A-336's whole-change revert does not run at the PR head, even under A-335's ledger rule.**
   `.syzygy/governance/decisions/AGENT-ADOPTIONS.md:128`.
   Evidence, scratch clone at 9646d2804:
   - Revert the row commit 9a1859b50 first (ledger conflict → kept as it stands per A-335), then the listed
     `git revert --no-edit 7a55940f1 95c3f3b0d … 69848195` (ledger conflicts kept; 95c3f3b0d becomes empty and is
     skipped): stops at 7a410f539 with a non-ledger conflict in `docs/evidence/syzygy-5dhm-43/README.md`. Cause: the list
     omits 256f6394d (the wiring-mutants commit), which landed *after* the row commit and appends to that README. The
     row's phrase "before the commit that last amends this row" does not cover a commit after it.
   - With 256f6394d reverted first: stops at d208c6135 with a non-ledger conflict in
     `scripts/check_spec_reconciliation.py` (the `declared_source_historical_cases` R1/R2 subtraction, now interleaved
     with main's figplan/vbase lines); taking HEAD there, it stops again at 55839b33e in the same file (the 2.33-era
     constant block, which merge ea4f58380's resolution removed so the old hunks no longer have their context).
   - The A-335 list rule covers only the cli.test.ts source list; neither rule covers these.
   - `git revert 7a55940f1` alone (the spec-only revert the row also states) applies cleanly (10 files).
   Repair: give a whole-change revert that runs and verify it in a clone at the PR head, e.g. after merge
   `git revert -m 1 <PR merge commit>` (the merge-commit form survives because the old commits' wiring was replaced in a
   merge), or a single inverse commit; if a commit list is kept, include 256f6394d and every later commit, and state a
   resolution for each non-ledger conflict. Retain the trial transcript beside the evidence.

2. **[High, inherited — not a PR defect] [Observed] The head is red in any tag-bearing checkout, so CI fails and the
   choice floor's effective state is not witnessed there.** CI run 46032454219: `checks (reconciliation selftest)` →
   "census refused: Derived-base screening: a tag attempts to bind the retired A-267 claim"; `checks (governance)`
   `build_polaris_dossier_local_agent_mode --check` → the same finding. Locally, `--check` and the counter fail
   identically on merged main 00a8f8d8c (R1, R3, R5 FAIL; counter "FAIL: derived-base screening adoption findings")
   because the retired tag `polaris-dossier-derived-base-views-v2.34` exists on the remote (`e9eaf3e4`) and the
   reconciler refuses it (`scripts/check_spec_reconciliation.py:3671`). At the PR head the chain then collapses
   (screening 2.35 → source-example 2.36 → choice 2.37 unavailable) and adds R1/R3 "prior v2.36 source-example advice
   adoption is unavailable" and R5 "calls choice floor v2.37 adopted while it is not in force" ×2.
   In the scratch clone with that one tag deleted locally: R1–R5 OK (64/117/130/7012/186 examined, 0 findings), R6 WARN
   (two pre-existing PWB pin findings), R7 OK; counter "TOTAL: 39 requirements, 612 scenarios", matching
   `PROJECT-STATUS.md:301`. Repair: none in this PR; merge only after main's A-267 tag defect is repaired, then re-run CI.
   Name the dependency in the PR body.

3. **[Low] [Observed] The wiring-mutant script runs no unmutated baseline, and four expected strings also appear on a red
   base.** `docs/evidence/syzygy-5dhm-43/choice_floor_reconcile_mutation.py:24-45`. `census-skips-choice` and
   `expected-skips-choice` expect `FAIL  R3`, `status-want-unadjusted` expects `FAIL  R5`, `row-old-tag` expects "calls
   choice floor v2.37 adopted while it is not in force"; all four appear unmutated in a checkout holding the v2.34 tag
   (finding 2), where they would be "killed" without the mutation doing anything. I re-ran the script in the green scratch
   clone: 10 of 10 killed, so the recorded outcomes hold on a green base. Repair: run the unmutated tree first and refuse
   unless it exits 0; key each mutant on its own specific finding text; record the baseline in the JSON (rule 6, rule 11).

4. **[Low] [Observed] Code and test comments still name the choice floor "version 2.33" and "schema-v13 draft only".**
   `packages/polaris-dossier/src/reader-advice.ts:25,29,39,66,85`, `check.test.ts:2312`,
   `reader-standards.test.ts:229-230`. 2.33 now names the figure plan; the spec says v13, v14 or v15. Repair: say 2.37
   (and "v13; v14/v15 once check parses them"), comments only.

5. **[Low] [Observed] The row and the campaign page still say no review has read the 2.37 rebuild.**
   `AGENT-ADOPTIONS.md:128` ("No review has read the 2.37 rebuild."). Repair: once this raw is retained, cite it and its
   verdict copied from this file.

6. **[Low] [Inferred] The tag binds 7a55940f1, which only a merge-commit merge keeps reachable from main.**
   `polaris-dossier-choice-floor-v2.37` does not exist yet locally or on the remote (`git ls-remote --tags`), which matches
   sibling practice (`_reviewed_version_binding`, `check_spec_reconciliation.py:3281-3312`, checks the row's tag text, not
   the tag). A squash or rebase merge would re-hash 7a55940f1 and orphan the row's commit column, snapshot URL and tag
   target. Repair: merge with a merge commit (or re-point row, snapshot and tag after merge), then create the annotated
   tag at 7a55940f1.

## Checks that held

- **Spec (key check 1) [Observed].** `diff` of the v2.36 spec (`polaris-source-example-advice/…/spec.md`, equal to tag
  `polaris-dossier-source-example-advice-v2.36` → 8e6452261) against the v2.37 spec: five hunks — title, header
  paragraph, one inserted paragraph after the worth-knowing paragraph (line 152), word-level appends to the
  Observable/Oracle/Falsifier bullets (additions only, checked by `--word-diff`), two scenarios appended at the end.
  Scenario split by script: 263 → 265, the first 263 scenarios' WHEN/THEN/AND bytes identical and in order (the one
  block that differed is scenario 249 only because the requirement's Observable/Oracle/Falsifier bullets sit inside
  it in v2.36 already), and the two new ones are last.
- **Spec agrees with code [Observed]** (`reader-advice.ts:41-93`): Inferred only (`label === 'inferred'`), Unknown
  excluded; every citation of an item (`citations`, any position); section citations at any depth (`citedPathsIn`
  recursive over `citations` and `citation`); deep dives attributed through `sectionId` to the Pole counting that
  section; each section in the first Pole naming it (`poleGroups`); threshold `CHOICE_FLOOR = 3`, `>= 3` no advisory;
  no-Poles group at `$.sections` counting every Inferred item; singular "choice or trade-off" at 1; " citing a file its
  sections cite" omitted for the no-Poles group; advice only (reader advice, not check record). The detail literal
  matches the spec's character for character.
- **v14 gating (key check 2) [Observed].** The v2.36 text carries every v13 worth-knowing rule to v14 and every v14 rule
  to v15, so "v13, v14 or v15" is consistent. Code gates on `hasWorthKnowingForm` (`draft-schema.ts:75`, v13 only);
  check does not parse v14 today (`check.test.ts:2532`, a v14 draft is a `schema` finding), so no v14 draft can reach
  the advice and the divergence is unreachable. Disclosed at `tasks.md:3` and `design.md:17`. [Inferred] the figure
  plan's implementation must widen that gate; I did not find which bead names it.
- **Wiring (key check 3) [Observed].** Counter `build_composition` chains `P5_ADVICE_SPEC` then `CHOICE_SPEC`;
  `choice_binding` takes `p5_advice_effective` as predecessor (only effective v2.36 counts); census refuses a choice
  amendment without effective advice; `polaris_expected`, `vbase_screening_projects`, `check_generated`,
  `check_routes`, the status count (own scoped sentence; earlier sentences adjusted by `choice_delta`) and the counter's
  `read_status_assertion` all add the choice step after the advice. Pending filters: `is_choice_row` added to every
  ledger projection that strips later Polaris rows (qkind, figplan, vbase, term-brief, declared-source, url-source,
  reach, raw-read, treeread, readmit, figure base) and `project_source_example_history` strips its row and routes and
  rewrites its index row as candidate. Declared-historical control: R1 subtracts `choice_records`, R2 `choice_subjects`
  (`check_spec_reconciliation.py:8585-8602`). Cosmetic: the `v2.37 inactive` retirement text is placed between v2.33
  and v2.34.
- **Row (key check 4) [Observed].** Commit column 7a55940f1 (the spec commit), snapshot URL at that commit, tag column
  `polaris-dossier-choice-floor-v2.37`, spec subject digest bound in `CHOICE_SUBJECTS`. Its revert list fails as finding 1.
- **Runs (key check 5).** See finding 2: red in the snapshot (same as main); green in the clone without the v2.34 tag.
