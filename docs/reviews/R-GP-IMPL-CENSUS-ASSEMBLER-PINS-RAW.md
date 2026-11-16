# Review: PR #678 (syzygy-bpyt.4.34), census assembler self-test pins for N12 and N15
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 2264660c376c7acd2dab140da035c3748ca1fe96
Subject: PR #678

Scope: one file changed, `docs/evidence/scratch-prefix-census-2026-10-23/assemble_census.py` (+58 -17), fixture, literals and six mutants only. No assembler logic changed.

## 1. Gates, run at the head in a scratch detached worktree
- `assemble_census.py --selftest <out>`: `unmutated: true`, `holds: true`, all 49 mutants killed, including the six new ones (kill-leftover-count-doubled, kill-leftovers-not-reported, seed-entries-counted-as-the-runs-own, mkdtemp-count-includes-derived, r3-long-gap-strict-threshold, r3-published-filter-dropped).
- `scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).

## 2. Coverage of N12 and N15
- N12: covered. The fixture gains a fresh run `f` seeded from the SIGKILLed run `k`, a derived name `tk-ZZZZZZ-out.md`, and a `leftovers` block holding leftAfterSIGKILL, afterTheNextFreshRun and leftByTheFreshRunItself. The four named mutants are killed.
- N15: covered. A gap of exactly two intervals (6.0-7.0) holds the never-sampled `u-KKKKKK`; the unpublished class `v-LLLLLL` sits in the 1.0-3.0 long gap. Both named mutants are killed.
- N18: deferred to the next regeneration, as the bead says; not in scope.

## 3. Literals
- Expected values are hard-coded in `EXPECTED_AGGREGATE`, none computed from the code under test.
- Hand re-derivation, all matching: sighting instants {0, .5, 1, 3, 3.5, 4, 6, 7} give 3 long gaps of 5.0 s and 4 short gaps of 2.0 s. `u-KKKKKK` (6.7 s less the 0.2 s offset = 6.5 s) falls in 6.0-7.0. `v-LLLLLL` (2.7 less 0.2 = 2.5 s) falls in 1.0-3.0. `p-` has 3 names. The leftovers per class (bytes and mtimes) follow `AGG_RECORDS`.

## 4. Rule-6 mutants of my own (old/new stored in my scratch script; run against the head)
Killed (8): bytes-zero, fresh-itself-empty, stillthere-zero, bytesstill-zero, leftbysigkill-zero, inlong-any-gap, gap-start-excluded, offset-lower.
Survived (7), none part of N12 or N15, all notes:
- oldest-max: `min(slot['oldestMtime'], ...)` => `max(...)`; every slot in the fixture holds one entry, so oldest equals newest.
- newest-min: `max(slot['newestMtime'], ...)` => `min(...)`; same cause.
- inlong-upper-strict: `earlier < made <= later` => `earlier < made < later` in `in_a_long_gap`; no never-sampled name sits exactly on a long gap's upper bound.
- inlong-lower-incl: `earlier <= made <= later` in `in_a_long_gap`; no name on a lower bound.
- inside-lower-incl: same change in the per-gap `inside` list.
- published-count-wrong: `len(published)` => `len(by_class)`; equal in this fixture because every published class has a name.
- first-seed-branch-off: first `if family in (...) and name in seed_names` branch replaced by `False`; the fixture's seeded names do not reach it.
These do not block N12/N15 (the two named predicates are pinned); they are candidates for a follow-up.

## 5. Bound digests and review referents (rule 10)
- Old digest of the file `ffbc0f97...`; head digest differs (expected: file edited).
- The old digest is cited by `assemble-selftest-2026-10-24.json`, `census-2026-10-24.json`, `verification-2026-10-24.json`, `input-checks-2026-10-24.json`, the round-3 review reruns and `R-GP-IMPL-SCRATCH-PREFIX-CENSUS-3-RAW.md`, and in `shared-mutation-runner-authorization-2026-10-29/r2/consumer-sweep.json`. These are records of the earlier bytes and stay valid history; none is a governed or act-bound file (no hit under `.syzygy/`, `openspec/`, `scripts/`, `.github/`, `package.json`). `check_governance` is 0 FAIL at the head.
- `input_checks.py` hashes the assembler at its own run time and does not pin a value, so it is unaffected.
- The recorded self-test and census are not regenerated; the PR says so. A reader who reruns now gets a different `sha256` in the self-test record: that is the disclosed state.

## 6. Test growth
- PR body states +6 ~1 -0; the six mutants and extended fixtures match the diff.

## Exceptions
- None blocking. The seven surviving neighbouring mutants in section 4 are notes; the strict-boundary ones (inlong-*) arguably belong with N15's intent and could be pinned by a name created exactly at a gap bound.
