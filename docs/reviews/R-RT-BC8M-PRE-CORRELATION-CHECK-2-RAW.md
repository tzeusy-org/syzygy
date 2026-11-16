# R-RT-BC8M pre-correlation check-2 gate exact-head review — RAW
Subject: PR #572 (agent/syzygy-bc8m) on main 98698608, diff 98698608..cb55dacd (packages/cap1-core, packages/cap1-daemon, docs/evidence/syzygy-bc8m)
Reviewed commit: cb55dacdb145358ada87c21c0fd1b44e5e1f4b34
Verdict: CONFIRM WITH EXCEPTIONS

Scope: [Observed] Independent PR-review worker pass (review bead `syzygy-wv9c`, implementation bead `syzygy-bc8m`), first review, risk tier high (consent). Run in a fresh worktree at the reviewed commit after `npm ci`. The head already contains `origin/main` 98698608 (`git merge-base --is-ancestor` true), so no rebase was done. Zero review threads on the PR.

## Checks

1. **The quoted clause is the clause (rule 8).** [Observed] `docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md` §4 lines 166–167: "It is called at most once per act per capture, only for acts that passed checks 1–23, with no retry." §3 table line 82, check 2: "artifact pair equals the entry pair (entry reference only)" → `record-subject-mismatch`. §6 capture order repeats "correlation (provider present, act passed checks 1–23)". The PR body and the evidence record quote the §4 sentence exactly. The page's head says it is an implementation convention, not conformance authority, which the PR body also says.

2. **Decision behaviour unchanged (algebra).** [Observed] In `decideRepositoryConsent`, `reference` is `entry.consent` (line 561). Site 1 calls the predicate with that `reference`, so its `reference === entry.consent` arm is always true and the predicate reduces to the old pair test. Site 2 runs only for `input.reference !== reference` (the `continue` above it), so the entry arm is always false and the predicate reduces to the old `pair && grantState === 'withdrawn'`. Both sites compute the same boolean as before for every input.

3. **The gate matches the decision's consumption exactly.** [Observed] Correlation is read only inside `fullEvaluation` → `applyCorrelation` for the input being evaluated; `relationsOf` reads no correlation. `fullEvaluation` is reached only for inputs passing the predicate at site 1 or site 2 for some declared entry. The capture gate is `declared.repositories.some(predicate)`, the union of exactly those sites, so no act a decision evaluates loses its correlation, and none it never evaluates is offered to the provider. An entry reference failing check 2 is excluded; a withdrawal for a declared pair is included; a top-level grant (non-withdrawn, non-entry reference) is excluded, which §4's "at most" permits and no decision consults.

4. **No read before the closed decision.** [Observed] The predicate is pure over the already-loaded record; the diff adds no reader call, and the per-entry decisions still run before any repository-root or entry read (`source-snapshot.ts` step 5 then step 6, unchanged).

5. **cap1 imports nothing shared.** [Observed] `grep -rn "@syzygy/support" packages/cap1-*/` over `.ts` and `package.json`, excluding `node_modules`: 0 hits.

6. **Tests and gates at the reviewed commit.** [Observed] `npx vitest run packages/cap1-daemon packages/cap1-core packages/cap1-conformance`: 53 files, 473 tests passed. `npm run typecheck`: exit 0. `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".

7. **Rule-6 record re-checked.** [Observed] `docs/evidence/syzygy-bc8m/pre-correlation-check-2-mutation-run-2026-11-02.json` names commit 836bcde1 and three subject digests; each re-hashed from `git show 836bcde1:<path>` matches, and each also matches the reviewed head's bytes. Its record stores `old`/`new` fragments for M1–M3. Independent re-run of M1 (delete `if (!evaluated) continue;`): the new test fails ("1 failed | 21 passed"), the other 21 pass.

## Exceptions (non-blocking)

1. **The predicate's `grantState === 'withdrawn'` condition is unpinned for a non-withdrawn grant on a declared pair.** [Observed] Mutant M4, `return reference === entry.consent || record.grantState === 'withdrawn';` → `return true;` in `consentPairEvaluatedForEntry`, survives the cap1-daemon, cap1-core and cap1-conformance suites (473 passed). Under M4 a second, non-withdrawn grant for an entry's pair becomes a rule-3 withdrawal candidate and refuses that entry `withdrawn`, and its act reaches the provider. [Observed] The gap predates this PR: on base `main` sources, deleting `|| other.grantState !== 'withdrawn'` from the old site-2 condition fails only the PR's new test (which fails at base anyway), so the decision tests never pinned it. The mutant fails closed (more refusals), so it is not a consent-widening hole. [Inferred] It is still the one arm of the new shared predicate no test reaches; the PR's rule-6 record mutates the withdrawal arm away (M2) but never widens it. Repair: one case with a top-level reference that is a valid `consent` grant for a declared pair, asserting it is neither called nor a withdrawal candidate.

2. **`docs/design/CAP1-CONSENT-IMPLEMENTATION-REVIEW-DISPOSITION.md` row 4 turns false at merge.** [Observed] Line 16 reads "Deferred. The provider may be called for an act whose pair fails check 2 …" in the present tense. The file is not act-bound: its current sha256 (and its only historical version, commit 019da04b) appears in no tracked file; its one citer is `docs/README.md` by path; it heads itself "never authority". The raw `R-RT-U2A2-IMPLEMENTATION-EXACT-HEAD-2-RAW.md:21` quotes the finding in its own words, not this row, so the row is editable. It need not change in this PR (an edit would retire this review under rule 10), but per the CG-27 lesson it should be marked at the sentence, dated, keeping the original text, in the integration step that lands this PR, naming `syzygy-bc8m` and PR #572.

## Findings

No blocking finding.
