# F3 ordered authority join — independent source review R1

Verdict: **PASS — source only**.

[Inferred] I found no blocking correctness or regression finding in the five-file delta against the acceptance scope below. This is a source review, not evidence that an eligible or interrupted recovery run reaches close. I did not run tests, mutation checks, the governance battery, or recovery commands, and do not attest the supplied test log to this exact commit beyond its recorded contents.

## Frozen subject

[Observed] Subject: `a22156faec6ad7458cd33371a92fd5d034b79466`. Direct parent/base: `44f5c74126f0e3be9d64ca7f494f213db35138d4`. The complete commit delta contains the five files below. I checked the worktree copies against their subject blobs and independently checked each subject SHA-256 with sha256sum. Unrelated uncommitted evidence files were excluded and left untouched.

| File | Base SHA-256 | Subject SHA-256 |
|---|---|---|
| `packages/polaris-dossier/src/session-launch.ts` | `14117f0c9c75b583ac5fb103aeb6bfdb7aced16ade490bac7c583742eb8c5c46` | `ae11d188b224c653efef418e7584246a88af36e048faa6b41228bb33a6df2617` |
| `packages/polaris-dossier/src/session-launch.test.ts` | `f3e58d68c17589e01f4047c791d679799ad5019ebda647dd44da4ebe43e8a8e0` | `a03053fb8bbe6f1593adcb0da2a81c7fd31224842e03b5188d24025dcd7fb954` |
| `packages/polaris-dossier/src/url-launch-history.ts` | `810f4ddbf08504ff175837b1c2e88093dfb7535768fc3c184063cd1d445516ea` | `5075dd3b2fe8581acbaafc0a7d499adb5cfd556a75a9a1dccacedb503694e014` |
| `packages/polaris-dossier/src/url-launch-history.test.ts` | `3b34755cd146348bef200b524f07fe8e7167df0a8f81ae428a48f42a2a88e592` | `bda655d6cf70d452ad662016bda5691824e7d4474e669e16beb93cd5c32d386d` |
| `packages/polaris-dossier/src/url-run-composed.test.ts` | `17ebca69f8a151bf3078f25a4daf0e7d74a69b9771b1870047b778663012cddf` | `e4f5a7f1b3dd936fc488e7f8bfd499ed10e1ac97d385a602668c7125d44fee43` |

[Observed] Exact binary diff SHA-256: `50213bcdcb82d616cc7f7142afb568b5d4def7e43330c54a54371ed5c34e5730` (25218 bytes). Reproduce with `git diff --binary --no-ext-diff --no-color 44f5c74126f0e3be9d64ca7f494f213db35138d4 a22156faec6ad7458cd33371a92fd5d034b79466 --` followed, in table order, by the five file paths. The digest names the emitted Git diff bytes, including headers and terminal newlines; it is not a source-tree digest.

## Governing references and acceptance criteria

[Observed] I used the supplied repository operating rules, VIS-4/D10 in `.syzygy/governance/doctrine/vision.md`, REQ-polaris-generation-048 in `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` (A14 adoption supplied in the review assignment), RFC3-16(d)(5)/(6) in `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`, and the engineering-bar skill at `/home/orca/orca/projects/syzygy/.codex/skills/th-engineering/subskills/engineering-bar/SKILL.md`. I did not treat diagnosis recommendations or source comments as governing authority.

[Observed] The relevant defined clauses require:

- REQ-polaris-generation-048, ordered support: “another role would receive the design-only settings” requires refusal, and a genuine control exercises the ordered path “under the actual finite limits.”
- REQ-polaris-generation-048, refusal/timeout/stop: “no later step or close is counted,” owned child trees stop, and unconfirmed termination is disclosed.
- RFC3-16(d)(5): “Before any protected data delivery, reply registration, tool/adapter effect or dependent forwarding” re-read the named current authority predicates; missing/inconsistent state refuses and resume cannot widen the original deadline or role.
- RFC3-16(d)(6): “Maintain finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline,” with safe actual audit before effect and unchanged safeguards.
- VIS-4 allows agent decisions on behavior-changing fixes outside its four owner classes, with ordinary adoption/reporting. This review does not perform or attest adoption.

[Inferred] Acceptance requires the genuine ordered profile alone to select a finite 5,000ms aggregate inspection ceiling; ordinary profiles remain at 2,000ms and callers may tighten. Storage/process census stays at most 2,000ms from the original sample start. Verification remains concurrent, final confirmation fresh and synchronous, and the deadline is rechecked after it. Actual audit records the selected limit; history joins the matching sample ceiling while its independent current-authority wait remains 1,000ms. The fixture may remove only the artificial Author brief-recheck packet wait and must preserve the real packet/stop/final invariants.

## Source findings

[Observed] `session-launch.ts:247–262` selects the maximum using `isOrderedDesignSessionProfile(profile)`, after `isNativeSessionProfile` validation. That predicate uses the factory's issued-object set (`session-profile.ts:120–124`), rather than a role string or a copied object's fields. Limits retain integer/positive/known-key/upper-bound validation. Ordinary callers cannot select 2,001ms; ordered callers cannot select 5,001ms. Caller overrides can tighten either class. The existing genuine ordered-host/profile pairing gate remains at `session-launch.ts:590–596`.

[Observed] `session-launch.ts:645–657` captures one `sampleBegan` and computes the resource ceiling as `min(selected inspection, 2,000)`. Both storage and process checks compare against that original origin. The inner bounded wait (`670–714`) does not reset the checks' origin. Storage checks run after completed storage and before updating `sampledStorageBytes` (`690–694`); process checks run after its promise and before updating `peakProcesses` (`699–707`). The resource deadline therefore cannot be bypassed by a delayed IO completion, delayed timer delivery, or a 5s authority envelope.

[Observed] Authority verification starts before awaiting the census (`662–669`), and its promise handles rejection. Census/resource refusal retains precedence. After the census, the joined verification/current result is checked against active state and aggregate elapsed time (`715–720`). The exact `confirm` callback runs only after that join and is followed by another monotonic check (`721–726`), so synchronous confirmation that consumes the remaining envelope refuses even if a timer cannot fire while it blocks. A withdrawal still stops the child (`728–736`). No authority guard is deleted by the delta.

[Inferred] The nested bounded operations introduce no new grant or cleanup race in this path. Bounds limit waiting rather than cancelling caller IO. On timeout, the catch stops the launch and the finally marks its closure `sampleActive = false`; shutdown also sets `reason`, `exited`, or `finishedCapture`. A late storage/process continuation encounters those checks before publishing its result; a late verification encounters the check before confirmation. A timed-out inner resource wait rejects the outer operation rather than letting it proceed to authority. Existing process-read rejection handling, storage close joining, child-group termination, host close, output draining, and residual Unknown reporting remain in place. The supervisor still has one `pendingSample`, so a 5s join does not accumulate parallel samples. This does not claim arbitrary blocked IO is cancelled or settled by the timer.

[Observed] The preparation freezes the selected limits. The actual pre-spawn `session-launch-attempt` callback receives that same retained `limits` object (`602–604`). The new ordered cases inspect the actual captured 5,000ms limit (`session-launch.test.ts:1435`); the existing audit-failure test still withholds native spawn and checks frozen selected ordinary limits (`980–998`). `commandSha256` hashes the physical `/usr/bin/prlimit` program and argument vector (`session-launch.ts:270–271`, `572–574`, `614–615`); the host's inspection timer is not a physical command argument and is bound separately by the audit's limits field. Equality of the command digest is not a claim that the digest includes that timer.

[Observed] `url-launch-history.ts:158–161` selects 5,000ms only for a genuine ordered profile and otherwise retains 2,000ms, then separately invokes unchanged `requireCurrent(current)`. Its default remains 1,000ms (`94`). The writer still checks independently after sample joining and around durable publication; this delta changes no instance lifecycle, policy scopes, history authority, canonical writer, or original run expiry.

[Observed] The composed fixture's executable edit removes only the Author's `await waitForFidelityPacket` at the brief recheck (`url-run-composed.test.ts:1827–1829`). Its async wrapper, recheck tool, and script position remain. Fidelity still validates the real waiting result, releases Inventory, and awaits the checked packet before reading it (`1863–1872`). Packet resolution remains after genuine registration returns (`1993–1999`). The ordinary final-response releases and durable after-end-turn sequence, eligible native SIGSTOP (`1592–1621`), public CLI Stop (`1954–1961`), pre-stop three final-product/two live-continuation assertions (`1978–1989`), resumed final-site/cold-continuation assertions (`2336–2345`), and closed-again/unchanged-record assertions (`2360–2364`) remain present. The complete five-file diff contains no edits to those assertion blocks.

## Test delta and evidence limits

[Observed] Net parameterized-case growth is **8**: one ceiling-selection case, five ordered inspection dispositions, one ordered history sequencing arm, and one ordered history timeout arm. The selection matrix protects nominal profile identity, both maxima and caller tightening. The ordered inspection arms distinguish successful authority beyond ordinary 2s, withdrawn authority after verification, aggregate verification timeout with late resolution, resource timeout before the larger envelope, and synchronous confirmation exhausting the aggregate deadline. The two history additions distinguish accepting a 3s ordered sample before starting independent authority from refusing an indefinitely stalled ordered sample at5s. Those are distinct regressions; these additions are worthwhile despite overlap in setup. Existing ordinary inspection dispositions and their assertions are byte-unchanged; the history parameterization preserves the ordinary1.5s/550ms sequencing arm and ordinary2s/authority1s refusal assertions.

[Observed] Supplied diagnostic/log byte identities:

- `docs/evidence/syzygy-k54o-3/recovery-ef014/ef014-interrupted-diagnosis.json`: `488f4feef0597b921b60e516bc3606a05aca365488a6624e2e76cdabe3753acf`.
- `/home/orca/.tmp/f3-inspection-storage-diagnostic/ef014-eligible-diagnosis.json`: `c2574ceea8c3ebdc8100f23fb2a8dd4fb40a91d92ef66ba5ffaccd7761d3d84d`.
- `/home/orca/.tmp/f3-native-admission-fixes/ordered-inspection-focused.log`: `eb0bfff61f349745b723ef54729bd063126459d3aa89cbdf2dd715f870795444`.

[Observed] The interrupted diagnosis describes an earlier source commit's accepted storage/process/verification with confirmation crossing2s and downstream refusal. The eligible diagnosis separately describes the artificial Author wait and a generic transport interruption whose native cause is Unknown. Neither is runtime evidence for this subject. The former's recommendation to preserve2s is diagnosis advice, not a numeric governing clause; this implementation retains that resource limit while changing the separately bounded ordered authority join.

[Observed] The supplied focused log records two passing files, **11 passed and106 skipped out of117**, including the six new launcher cases and five history arms (three preserved plus two new). The log does not execute the preserved ordinary launcher cases or the composed recovery fixture. [Unknown] Full suite, interrupted/eligible stop-resume outcome, and end-to-end close at the reviewed subject remain unverified by this review. Source-only PASS must not be reported as runtime recovery success.

## Disposition

**PASS — source only.** [Inferred] The bounded ordered join and scoped fixture correction meet the stated source acceptance criteria without a blocking finding. The outstanding runtime evidence requirements remain with the implementation owner. No code, adoption record, commit, or unrelated evidence was changed in this review.
