# R-RT-U2A2 implementation exact-head review 3 — RAW
Subject: PR #569 rebased onto main b77bae09, implementation diff b77bae09..e4134547 (packages, apps)
Reviewed commit: e41345478e55ab15981b00302fc472f8b6074d83
Verdict: CONFIRM WITH EXCEPTIONS

Scope: [Observed] Independent PR-review worker pass (review bead `syzygy-jz3h`, implementation bead `syzygy-u2a.2`). It does not redo rounds 1 and 2. It checks four things: (a) the change since round 2's subject `82ead455` is the rebase only; (b) the round-1 blocking repair holds under a falsifying mutant; (c) acceptance criteria 1–6 each have a test that a mutant reversing the behaviour fails; (d) no dependent content read comes before the closed consent decision. Run in the worktree at the reviewed commit after `npm ci`.

## (a) Rebase only

- [Observed] PR head `672946dc` was DIRTY against main `b77bae09` (#561). It was rebased onto `b77bae09`. The one conflict was the `docs/README.md` partition count sentence, resolved to the PR side. That count is re-derived in the commit that retains this raw.
- [Observed] `git range-diff 67e7cdd0..672946dc b77bae09..e4134547`: 8 of 9 commits are `=`. The ninth is the count-sentence commit, which differs only in the resolved line.
- [Observed] `git diff --name-only 82ead455 672946dc` names four files: `.github/workflows/governance-docs.yml`, `.github/workflows/node-ci.yml` (both equal to `git diff 03d78cd9 67e7cdd0`, main's workflow-only change), `docs/README.md` (the round-2 row and the count) and the round-2 raw. No file under `packages/` or `apps/` changed after round 2's subject.

## (b) Round-1 blocking repair holds

- [Observed] Mutant `self-supersession-excluded` (from `review-repair-mutations-2026-11-02.json`) was re-applied at the reviewed commit. It restores the `relation.reference !== input.reference` conjunct in `packages/cap1-core/src/consent-decision.ts`. `req-011.conformance.test.ts` then fails: `Tests 1 failed | 55 passed (56)`. Restored afterwards; the tree was clean.

## (c) Each of AC 1–6 is pinned by a test a mutant fails

All 14 recorded mutants (9 + 5) were re-applied one at a time at the reviewed commit. Each `old` fragment occurred exactly once, and each was restored. All 14 were killed. I also ran two mutants of my own, for AC 2 and AC 4, where the recorded set had no direct mutant.

| AC | Mutant | Test run result |
|---|---|---|
| 1 snapshot = manifest digest; asOf separate | `caller-snapshot`; `manifest-unsorted` | 1 failed / 21; 1 failed / 21 |
| 2 inputs, versions and configuration are identity-bound | reviewer `ac2-versions-unbound` (drops `...deps.versions` from the manifest); `scope-unchecked` | 1 failed / 21 ("changing the observer version changes the digest"); 2 failed / 56 |
| 3 closed decision before I/O; refusal gives zero reads | `read-without-admission`; `grant-without-act`; `state2-downgrade`; `withdrawal-dropping`; `omitted-audit-as-absent`; `audit-digest-unchecked`; `bound-unvalidated`; `binding-digest-includes-act-record` | 40/56; 3/56; 10/56; 2/56; 1/56; 1/56; 5/21; 1/56 failed |
| 4 both channels carry the same fields | reviewer `ac4-human-diagnostic-swapped` (human `data-consent-diagnostic` emits `tuple.reason`) | 25 failed / 83 across req-046, req-011 and routes-human |
| 5 evaluation and `/entry` read only the capture | `post-capture-entry-read` | 1 failed / 21 |
| 6 a mid-capture change fails by name, with no retry | `no-revalidation` | 1 failed / 21 |

- [Observed] At base `b77bae09`, `consent-decision.ts`, `snapshot.ts`, `source-snapshot.ts` and `source-snapshot.test.ts` do not exist, so none of these tests can pass at base.

## (d) No dependent content read before the closed decision

- [Observed] In `packages/cap1-daemon/src/source-snapshot.ts`, the only reads before `decideRepositoryConsent` (`:422-430`) are the governance-root declaration and the consent artifact and owner-act records. These are authority inputs under frozen §5.
- [Observed] The repository-root listing (`:454`) runs only when `decision.authorization === 'admitted'` (`:448`). The entry read (`:479`) runs only when the governance root is admitted (`:475`). Revalidation (`:490-505`) re-reads only reads and listings that were already recorded.
- [Observed] Sweep of `readFile|readdir|stat(|existsSync|node:fs` over the non-test daemon `src` and `apps/syzygy/src/main.ts`. The hits are `source-snapshot.ts`, `observation.ts` and `consent-loading.ts`. Product code uses only constants from `observation.ts` and only the text-parsing helpers from `consent-loading.ts`. The request-time entry reader was removed from `main.ts`.

## Findings

1. **Non-blocking exceptions, carried over unchanged.** Round 2's three deferrals still stand at this head: the correlation provider can be called before check 2 (`source-snapshot.ts:383-395`); the entry is read from `observedRootDir`; a consent-refused entry is described as "unreadable" in the visible prose. [Observed] No code changed after round 2, so round 2's analysis holds: neither of the first two can be reached in the shipped composition. The first must be closed before any provider is wired.
2. **Informational.** `observation.ts` (`observeDeclaration`, `observeRootCandidate`, `observeReadmeEvidence`, `observeRepositorySnapshot`) and `loadConsentReferences` in `consent-loading.ts` are still exported through the `@syzygy/cap1-daemon` barrel. They read the filesystem outside the capture seam. [Observed] No non-test caller exists in `packages/` or `apps/`. [Inferred] A future composition could bypass the capture. Removing them or fencing them to test support is follow-up work, not a defect of this change.

## Gates (at the reviewed commit)

- `npm run typecheck`: exit 0.
- `npx vitest run packages/cap1-core packages/cap1-conformance packages/cap1-daemon packages/cap1-system apps/syzygy`: 53 files, 472 passed.
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).
- Review threads: 0 unresolved. PR body states the net test delta (+69).
