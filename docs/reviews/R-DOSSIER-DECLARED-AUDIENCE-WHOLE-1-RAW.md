# R-DOSSIER-DECLARED-AUDIENCE-WHOLE-1 — canonical exact-head review of PR #818
Verdict: REVISE
Reviewed commit: e8c5c70cfdf4b5eeea7553cd6e58e243da95a2dc
Base: 7f237f091ad7086d6728ad48db4257452cf0d5bc

Reviewer: Claude (Opus 5.5) fresh-context teammate `review-818`, canonical review for bead `syzygy-n535`; not the author. Date: 2026-11-17.
Worktree: `.worktrees/review/r-818`, detached at the reviewed commit, `npm ci` exit 0, left clean (`git status --short` empty after every step).
Subject: PR #818 (`syzygy-fnry.17`), draft, branch `agent/syzygy-fnry.17`. Against `origin/main` 7f237f09: 22 files, +887/−29 (merge-base equals origin/main).
No edit to the branch, no `bd` write, no push, merge, consent or owner act. No dossier, provider or observed-repository run.

## Summary

[Observed] The audience behaviour is correct, sits where the bead's design asks, fails closed, and is well tested: all 10 of my own mutants were killed. The census-test correction keeps its expectations and is placed in the right tier. `npm run check`, `check_governance.py`, the campaign partition and all 9 hosted checks pass at this head.

One revise-severity finding blocks landing (R1). The merge of main left the brief's version label `polaris-dossier-brief-v7` naming two different brief texts. Four note-severity findings follow it.

## Findings

### R1 (revise): `BRIEF_VERSION` collides with main's independent v7

- [Observed] At the branch base `5be0fce2e`, `BRIEF_VERSION` was `polaris-dossier-brief-v6`. This PR's `bfe08caa9` moved it to `-v7` because the brief's bytes change (the bead design says: "the brief's bytes change, so BRIEF_VERSION moves v6 -> v7").
- [Observed] Main separately moved v6 → v7 in `6d84a3956` (`syzygy-pdja.33`, 2026-11-13, "the briefs name the copy"). The merges `80e409087` and `b19a0545c` resolved to `-v7` without a further bump.
- [Observed] So `origin/main:packages/polaris-dossier/src/brief.ts` issues a v7 brief with no audience (`audienceGuidance` occurs 0 times there). This head issues a v7 brief with the audience lines (`brief.ts:135-136`).
- [Inferred] One version label now names two texts. The governing clause requires a versioned brief. REQ in `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:230` says: "In the operator-agent mode Syzygy SHALL issue a versioned brief bound to the run and its pinned revision."
  - A run record's `briefVersion` (`brief.ts:244`, `:308`, `:345`) can no longer tell which text was issued.
  - Any run issued on main between `6d84a3956` and landing is indistinguishable by version from one issued after.
- [Observed] Both earlier raws accepted "v7" as criterion 3 met. `R-DOSSIER-DECLARED-AUDIENCE-1-RAW.md:23` was correct at its pre-merge base. `R-DOSSIER-DECLARED-AUDIENCE-GUARDIAN-1-RAW.md:50` checked only that the literal stayed v7, not that main's v7 was a different text.
- Repair:
  - Move `BRIEF_VERSION` to `polaris-dossier-brief-v8`, together with the two test literals at `brief.test.ts:84` and `:110`.
  - Confirm `syzygy-fnry.18`'s planned bump renumbers after this.
  - The acceptance criterion's "brief v7" wording is stale. Its intent is "a new version, because the bytes change", and that intent is what governs.

### N1 (note): the campaign entry is incomplete and paraphrases one verdict line

- [Observed] Append-only holds: the file is new to this PR, and the version at `c206d7bbb` is a byte prefix of the head version (1150 → 2332 bytes, `startswith` true).
- [Observed] The four new raws are byte-exact copies of the originals in the coordinator directory (sha256 checked):
  - GUARDIAN `c8175523…`
  - CENSUS-DIAGNOSTIC `af8e4cc7…`
  - CENSUS-CORRECTION `6b6e036e…`
  - RETENTION `c019ff87…`
  - The round-1 raw also matches its original (`f3ee0ac5…`).
- [Observed] Gaps in how the campaign records them:
  - `R-DOSSIER-DECLARED-AUDIENCE-RETENTION-1-RAW.md` (line 2 "Content verdict: CONFIRM", line 3 "Final verification/readiness: NOT ESTABLISHED") is retained but has no campaign entry. The entry still says "These three raws are retained verbatim".
  - The diagnostic raw's line 2 reads "Diagnostic verdict: CONFIRM test-tier misplacement; timeout cause remains Unknown". The campaign renders it as "confirms real-tree tier misplacement and a shared budget…" and drops "timeout cause remains Unknown". AGENTS.md requires verdict words to be copied exactly.
  - The other verdict renderings match their line 2 or line 3:
    - GUARDIAN REVISE with audience content CONFIRM: line 2 and line 66.
    - CORRECTION "Content verdict: CONFIRM" with PENDING verification: lines 2–3.
- [Observed] Two raws written against `c206d7bb` are neither retained nor named in the campaign:
  - `fnry17-retention-review-RAW.md`: Verdict CONFIRM, sha256 `9ac4aa24…`.
  - `fnry17-verification-event-assessment-RAW.md`: Verdict REVISE, sha256 `0e0e48bd…`. The retained GUARDIAN raw cites it at line 76.
  - [Inferred] Retaining the REVISE assessment, or at least naming it, keeps every failed attempt represented. Today the record shows only the later reviews.

### N2 (note): the census correction splits the time budget, but the cause is still Unknown

- [Observed] `2020c29bb` changes only `census.test.ts` and `vitest.tiers.ts`. The expectations are literally unchanged:
  - policy version `1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv`
  - trial commit: `[]`
  - other commit: `['TLS.md','modules/MODULES.md','redis.conf']`
  - The policy-version assertion now runs at both commits, which strengthens the test.
- [Observed] Moving the file to integration is correct. `vitest.tiers.ts` defines integration as "git, a real tree, …", and the default loader reads the real act tree (`recordsRoot: REAL_ROOT`).
- [Observed] Integration keeps vitest's default timeout. `vitest.config.ts` sets no `testTimeout` for any tier, so the limit is still 5000 ms per case.
- [Observed] The fix gives each placement its own budget and moves it to another tier. It does not reduce the work.
- [Observed] The diagnostic raw (line 2 and line 72) says the historical cause "remains Unknown".
- [Observed] Locally, the two cases took 469 ms and 546 ms (24/24 in the integration project).
- [Inferred] This is adequate. The test is main-owned, and the fix travels in this PR as a gate prerequisite. If it recurs under integration-tier load, it belongs in its own bead, not in this one.

### N3 (note): the supervisor-refusal test catches mutants by timeout, not by assertion

- [Observed] Mutants M5 (remove the refusal) and M6 (refuse only when `--audience` is undefined) were killed. The failure in both was the 5000 ms test timeout (5013 ms and 5015 ms), not the stderr or `readdirSync` assertions. With the refusal gone, `supervise` continues into setup and does not return.
- [Inferred] The kill is real but rests on a hang. An injected port or a shorter per-test timeout would make the failure name the missing refusal.

### N4 (note): authority and placement

- [Observed] Authority chain:
  - The dossier mode's signed specification versions v1.0–v1.6, tagged `polaris-dossier-local-agent-mode-v1.0`…`v1.6`; the v1.6 record is `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.6.md`.
  - The direction `POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md:51`: "…bring it to you for a version-tag sign-off, then implement."
- [Observed] Supporting clauses:
  - The understanding amendment, `spec.md:78`: "The editorial plan SHALL identify the central reader question, … and reasons for diagram, glossary and deep-dive selection for the chosen audience."
  - The understanding amendment, `spec.md:584`: "Before claiming source coverage it SHALL expose the selected project boundary and audience, …"
- [Observed] No requirement names the audience in the brief or in the design criteria. The change is additive within:
  - spec.md:230's brief list. Its exclusion, "The brief SHALL carry no project content beyond the repository identity and the pinned revision", is respected: the audience is operator-declared content, labelled Inferred.
  - spec.md:460's criteria list. Its required questions are kept verbatim, including "whether the lead uses the category term a reader knows".
- [Observed] The bead cites the release choice ("pursuit-2026-11-09-release, choice A"), which is recorded only in a questionnaire packet under `/home/orca/.tmp/`, not in `decisions/`. [Inferred] That choice selects work; it does not extend scope. Scope rests on the acts above.
- [Observed] No dependence on unsigned v1.7 (PR #817). The PR diff has 0 matches for `v1.7`, `fnry.19` or terminology wording.
- [Observed] The versioned texts keep their bytes:
  - reader standards
  - `READABILITY_GUIDANCE` (v4)
  - `DOSSIER_GUIDANCE`
  - `VOICE_RULES`
  - The qualifier sits beside them.
- [Inferred] Style only: in `designCriteria` the three audience lines come before the "You are the rendered-design review session" role sentence. Placing them after it, next to the reader line they qualify, would read better.

## Correctness of the audience behaviour (confirmed)

- [Observed] Brief: under `## What the dossier answers`, `brief.ts:135` adds `audienceGuidance(declared.audience)`:
  - the line "The operator declared this audience (Inferred):"
  - the audience in double quotes on its own line, with whitespace collapsed (`/\s+/gu` → one space, trimmed)
  - the qualifier sentence, which maps "a software engineer", "a newcomer" and RS-2's "engineer new to the project" onto the declared reader, with "RS-2's bar still applies".
- [Observed] Design criteria: `designCriteria(runDir, audience)` (`design-review.ts:76-78`) carries the same three lines. `buildDesignPacket` takes `audience`, and all three callers pass the run's declared value:
  - `render.ts:194`
  - `render.ts:200`
  - `review-packet.ts:208`
  - So the audience is part of the packet digest. A test asserts that the digest differs when the audience changes.
- [Observed] Inertness: the quoted line starts with `"`, so it cannot open a heading, list or fence. The multiline test (`brief.test.ts:178`) checks that `"  Operators\n# Redis administrators\r\n\tand integrators  "` adds no heading line.
- [Observed] Fail-closed behaviour:
  - `parseRunConfig` refuses a missing, non-string or whitespace-only `audience` (`run-config.ts:149-152`).
  - The supervisor refuses a new run whose `--audience` is absent or whitespace-only before any write (`polaris.ts:289`). The test checks three cases: no flag, `'  \n\t'`, and resume of a missing run. Each leaves the state root empty.
  - The `'unspecified'` fallback is removed (`polaris.ts:381`).
  - The start path still asks for an audience or refuses (`:167-170`).

## Tests and mutation (rule 6)

- [Observed] My own 10 mutants, applied one at a time and restored, were run against brief, design-review, render, reader-standards and polaris-launch-guidance tests at e8c5c70c. All 10 were killed. The record holds each `old`/`new` fragment and the commit: `/home/orca/.tmp/syzygy-looper-20261116/R-DOSSIER-DECLARED-AUDIENCE-WHOLE-1-mutants.json` (sha256 `d1f6eba33663b6753075790f74a72d57ad1601e9cd5c21057de5404557e76b3c`).

| Mutant | What it changes | Result |
|---|---|---|
| M1 | Drops the quoted audience line | 4 failed |
| M2 | Removes the whitespace collapse | 1 failed |
| M3 | Removes the audience from the criteria | 2 failed |
| M4 | Removes the audience from the brief | 2 failed |
| M5 | Removes the supervisor refusal | 1 failed, by timeout |
| M6 | Drops the whitespace check from the refusal | 1 failed, by timeout |
| M7 | Constant audience in the render "reviewed" packet | 62 failed |
| M8 | Constant audience in the render "published" packet | 62 failed |
| M9 | Constant audience in the review packet | 7 failed |
| M10 | Qualifier drops the RS-2 clause | 2 failed |

- [Observed] Expected values are hard-coded literals, not imported from the module under test.

## Runtime and test files unchanged since 2020c29b (confirmed)

- [Observed] The PR-relative population under `packages/` plus `vitest.tiers.ts` has 14 paths. All 14 are blob-identical between `2020c29bb` and HEAD (per-path `git rev-parse <c>:<p>`).
- [Observed] `git diff --name-only 2020c29bb HEAD -- packages vitest.tiers.ts` lists only `packages/three-surface-poc-core/src/obfuscated-destination-equivalence.test.ts`. That file came in with main `7f237f09` and is not in the PR diff against main.

## Checks run at e8c5c70c

- [Observed] `npm run check`: exit 0. No `error TS` lines from the typecheck. Unit tier: 187 files, 4491 passed, 1 skipped. Log: `/home/orca/.tmp/syzygy-looper-20261116/r818-npm-check.log`.
- [Observed] Targeted dossier files: 6 files, 328/328 passed. `census.test.ts` under `--project integration`: 24/24 passed.
- [Observed] `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)". The warnings are the standing downgraded advisories.
- [Observed] `scripts/check_docs_review_campaign_partition.py --check`: exit 0.
  - Second method: `git ls-files` = `git ls-tree` = 878.
  - Partition: assigned 878, raw 831, other 47, unmatched 0, overlaps 0, campaigns 154.
- [Observed] Hosted: `gh pr checks 818` shows all 9 rows passing at head `e8c5c70c` (`checks`, P115, governance, readability, reconciliation, node, node e2e, node integration, node unit). PR is draft, MERGEABLE.
- Not run, per the brief: `check:all`. The coordinator's clean-clone run at this head is a separate record. [Unknown] its result.

## Disposition

REVISE for R1 alone. After a v8 bump and its two literals, the audience content needs no other change. N1 should be repaired in the same pass:
- add a campaign entry for the RETENTION raw
- copy the diagnostic verdict line exactly
- retain or name the two `c206d7bb` raws

N2–N4 are advisory. This raw grants no merge permission and establishes no landing readiness. The no-open-run census before landing stays a separate obligation.
