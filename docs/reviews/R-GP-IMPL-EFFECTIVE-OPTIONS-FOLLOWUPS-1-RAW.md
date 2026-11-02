# R-GP-IMPL-EFFECTIVE-OPTIONS-FOLLOWUPS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.42, round 1
Verdict: REVISE
Reviewed commit: 276ceda5
Subject: review.diff (git diff b77bae09...276ceda5) sha256 cf3a2678b0faf62b65d601e7ce85080f2c2e44549eed04009eca5e3fa798ca6b

Reviewer: w-rev-z666 (review bead syzygy-z666; fresh context, did not author the change). Date: 2026-11-02.
PR: #563, head branch `agent/syzygy-bpyt.4.42`, rebased by the reviewer onto main `b77bae09` on the coordinator's
authorization (prepared-head rebase only; no byte outside the base changed). Pre-rebase head `d64acda6`.
Originating findings: `docs/reviews/R-GP-IMPL-EFFECTIVE-OPTIONS-1-RAW.md`, sha256
72724482962a1a81becc499305f5b310422dd0d4fd09d3fe27aa7c6fcd651aba (re-hashed this session; matches the bead).

## 1. Scope and method

- Read the bead's seven items and acceptance line, the originating raw's F1, F2, N2, N3, N4, N6, N7 finding texts
  (lines 336-500), the code diff (3 files) and the PR body, and the rule-6 record's structure.
- [Observed] The three subject files hash identically at `f83a6041` (the rule-6 commit) and at `276ceda5`:
  `scripts/clean_build.mjs` e59b490ae2a4…, `product-build.test.ts` 22e87a1c267f…, `sync-child-process-guard.test.ts`
  1c6f9dbf3228…. `git log e5667689..origin/main` touches none of them nor `vitest.config.ts`, so the rebase does not
  invalidate the rule-6 record's bytes.
- [Observed] At `276ceda5`, after `npm ci` in the worktree: `npm run typecheck` exit 0; `npx vitest run` of the two
  test files: 2 files, 34 tests passed (9 + 25).
- [Observed] Two mutants re-run independently (not copied from the record):
  - C10 (`startsWith(`${dist}/`)` → `startsWith(dist)` in `clean_build.mjs`): 1 failed of 25, the `dist-x` row.
  - G1-like (`.extends === true ? []` → `.extends !== false ? []` in `detachedProjects`): 1 failed of 9, the unit row.
  - Both restored; worktree clean after.
- Not run: the canonical battery and the full suite at `276ceda5`; hosted `checks` and `node` were IN_PROGRESS at
  review time.

## 2. Item-by-item against the originating findings

| Item | Finding text asks | At `276ceda5` | Met? |
|---|---|---|---|
| 1 | F2 optional hardening: backslash row after the it.each, before `// tsc -b requires composite only…`; E1 into MUTANTS; fresh run | Row inserted at that place, word for word; E1 is a mutant in the copied runner `docs/evidence/syzygy-bpyt-4-42/tools/mutants.py` and the record shows it killed by "directory name holds a backslash" (1 of 25 failed). The original `syzygy-bpyt-65/tools/mutants.py` is left unchanged because #558's record and the raw cite its digest; that is a sound disposition of "move E1 … in mutants.py" | Yes |
| 2 | N2: `dist-x` row after `'reaches a referenced project that inherits composite false'`, kills C10 | Present at that place, word for word; C10 killed (record and my re-run) | Yes |
| 3 | F1 header: add "or set it to `null`" to line 8, or test the value (owner, GP-Q0) | Header now names a `declarationDir` or `outFile` an extended file sets to `null`; comment-only change (5 comment lines). Value-test alternative declined with the GP-Q0 reason | Yes |
| 4 | N6: clear `KEPT_OUTSIDE` at each case start | `KEPT_OUTSIDE.length = 0` at the top of the refusal case; the assertion loop no longer splices. Probe N6-before (2 failing rows) vs N6-after (1) recorded | Yes |
| 5 | N7 optional: "(a composite build also fails, TS6307)" | Added to the header comment | Yes |
| 6 | N3: refuse any `extends` other than `true` and any non-object entry; X9-through-another-file mutant; owner notice | `detachedProjects` over the loaded config; N3p/N3s/N3m and G1/G2 killed; differential base vs head over 9 cases, 0 newly accepted, 6 newly refused by the guard. Owner notice on `syzygy-bpyt.10`: not yet posted (see N1) | Yes, notice pending |
| 7 | N4: future records derive verdict from `tsc --showConfig` | Disposition only; this PR writes no effective-options record | Dispositioned |

Acceptance line: Tests delta stated (guard 8 → 9, build 23 → 25, none removed) [consistent with my 34 = 9 + 25];
CC-REV-1 class stated; rule-6 record holds each mutant's `old`/`new` fragments, file sha256 and commit.

## 3. CC-REV-1 class ruling

Class 4, as the body proposes: a test guard refuses more and nothing is newly accepted; `clean_build.mjs` changes in
comment lines only, so the build script's accept/refuse set is unchanged (class 3 is not touched). The landing carries an
owner notice on `syzygy-bpyt.10` naming the guard's new refusal.

## 4. Findings

### F1 — The PR body's Verification section ships unfilled placeholders and a stale base (low, blocking: the body is the verification record and states no result for the battery or hosted CI)

**Evidence.** [Observed] The body ends:

> - Canonical battery in a clean clone at `d64acda6`: @@BATTERY@@.
> - Hosted `checks` and `node` at `d64acda6`: @@CI@@.

and its Summary says "The base is main `e5667689`, the merge of #558." After the authorized rebase the head is
`276ceda5` on main `b77bae09`; `d64acda6` is no longer the PR head, and no battery result is stated for any commit.
AGENTS.md rule 7: "Run the battery in a clone before calling it green; the report is valid only for that commit."

**Failure scenario.** The PR lands with literal `@@BATTERY@@` / `@@CI@@` tokens as its verification record; a later
reader cannot tell whether the battery was run at the merged bytes.

**Exact fix (PR body only, no code change).**
- Replace the two placeholder bullets with the canonical battery result from a clean clone at the final head and the
  hosted `checks`/`node` conclusions at that head, each naming the commit.
- Add after "The base is main `e5667689`, the merge of #558.": "Rebased onto main `b77bae09` for review; the three subject
  files are byte-identical at `f83a6041` and at the rebased head, so the rule-6 record stands."

### N1 — The `syzygy-bpyt.10` owner notice for this landing is not yet posted (note)

[Observed] `bd comments syzygy-bpyt.10` holds 3 comments naming `4.42`, all from the #558 landing notice; none is a
notice for this PR. The body says the landing "should carry" one. Coordinator action at landing: post it, naming the
guard refusal (the "Every new refusal" section) and that `clean_build.mjs` changed comments only.

### N2 — The rule-6 and surface-version records name `f83a6041`, which the rebase leaves reachable from no ref (note)

[Observed] Byte identity of the three subject files is established above, so the record's outcomes hold at `276ceda5`.
The surface version `polaris@e13f91aad360` was computed at `f83a6041`; [Inferred] main's movement since `e5667689` may
move the landing's surface version (the precedent N5 of the originating raw). The dispositions or landing notice should
name the version at the landing commit.

### N3 — The PR body carries a runtime session URL (note)

[Observed] The body ends with a `https://claude.ai/code/session_…` line. [Observed] No file under `.github/` references
that host, so no CI gate fails on it; the reviewer workflow's hygiene rule says such links do not belong in PR bodies.
Optional: drop the line when the body is next edited for F1.

## 5. What was not found

- No newly accepted tree or config: the code change is a guard that refuses more plus two test rows pinning refusals the
  script has made since #558, and a comment-only script edit (0 non-comment lines in the diff of `clean_build.mjs`,
  re-read from the diff above).
- No test asserts source text: the new guard row reads the loaded config object; the unit row pins the predicate.

## 6. Verdict

REVISE — one blocking PR-body finding (F1), no code change required. Every bead item is met or dispositioned; notes N1-N3
are for the coordinator and the landing record.
