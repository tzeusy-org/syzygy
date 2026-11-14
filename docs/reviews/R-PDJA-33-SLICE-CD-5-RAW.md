# R-PDJA-33-SLICE-CD-5 — slice C and D repairs, implementation review, round 5
Reviewed commit: 61baeff6
Subject: branch agent/syzygy-pdja-33-impl, round-4 repairs (3864b641..61baeff6)
Verdict: CONFIRM WITH EXCEPTIONS

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl` fetched head `61baeff631753acf993ef12a0b1a7a0c25aa4463`.
  - I ran `git worktree add --detach /home/orca/.tmp/reviews/rvCD5 61baeff6`, then `npm ci`, which exited 0. `TMPDIR` was `/home/orca/.tmp/reviews/tmpCD5` for every command.
  - At the end, `git status --porcelain` printed 0 lines and HEAD was `61baeff6`.
  - I then removed the worktree and TMPDIR. `git worktree list | grep -c rvCD5` printed 0.
- [Observed] What I read:
  - `docs/reviews/R-PDJA-33-SLICE-CD-4-RAW.md` in full.
  - `git diff 3864b641 61baeff6` over `packages/` and `docs/evidence/`. It has three commits:
    - `3e198a82`: the alternates probe moves ahead of the configuration read.
    - `1c015d5a`: init strips the nested `locatorStatements`.
    - `61baeff6`: docs only.
  - `readCloneSnapshot` in full (`launch-clone.ts:191` onward).
  - `launchConsent`'s `refuse`, `steps()` up to the copy step, and every `refuse(` call site.
  - `init.ts`'s `locatorLines` and its refusal path.
  - Spec 046 line 17, and 047's closed read list, its copy-step paragraph and its stage rule (lines 236–256).
- [Observed] The mutation record names commit `1c015d5a`, not the reviewed head.
  - `git diff --stat 1c015d5a 61baeff6` touches only the evidence JSON, the campaign file and the CD-4 raw.
  - At 61baeff6, `launch-clone.ts` hashes to `af6fe735…`, which equals H1's `file_sha256_at_commit`.
  - `init.ts` hashes to `208eed8d…`, which equals H2's.
- [Observed] Probes:
  - I used one untracked vitest file, `cd5.probe.ts`, under a scratch config with the `source` condition. It used the `launch.testkit.ts` fixtures and synthetic Git repos under TMPDIR.
  - The origin carried the user `bob` and the password marker `hunter2SECRET`.
  - The leak check searched the outcome JSON, the printed lines and init's `renderHuman` text for both.
  - The statement count is the number of occurrences of `carried user information` in that JSON or text.
  - Nothing touched a real repository or a provider. No consent phrase was typed. No probe reached a question.
  - The probe gave `Tests  5 passed (5)`. I moved both files out of the tree before the gates and mutants ran.
- [Observed] Gates:
  - `npm run check`: exit 0, `Test Files  188 passed (188)`, `Tests  4436 passed | 1 skipped (4437)`.
  - `npm run test:integration`: exit 0, `Test Files  94 passed (94)`, `Tests  2917 passed | 4 skipped (2921)`.
    - The earlier `Tests  1 failed (1)` and `no tests` lines come from the `check_unit_tmpdir` selftest fixtures.
    - All 10 `tmpdir-selftest-case` lines say `"status":"pass"`.
  - `npm run check:battery`: exit 0, `battery: 144 ok, 0 failed, 144 commands`. It ran in the foreground.
  - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`:
    - `second-method PASS: git ls-files=859; git ls-tree=859; exact path sets equal`
    - `partition PASS: denominator=859; assigned=859; raw=812; other=47; unmatched=0; overlaps=0; campaigns=152`
- [Observed] Rule 6:
  - Each mutant was an exact-once replacement, asserted to occur once.
  - Each ran the record's two commands: the unit command over 7 files and the integration command over 6.
  - Each file was restored, and its sha256 was asserted equal to the pre-mutation bytes.

| Mutant | Source | Unit | Integration | Outcome |
|---|---|---|---|---|
| H1-F1 (configuration read moved back ahead of the alternates probe) | record | `Tests  225 passed (225)` | `Tests  1 failed \| 490 passed (491)` | killed, as recorded, by "an alternates file that cannot be examined is refused before the configuration is read…" |
| H2-F4 (`{ launch: outcome.refusal }` in init) | record | `Tests  225 passed (225)` | `Tests  1 failed \| 490 passed (491)` | killed, as recorded, by "init prints the user-information statement on every path…" |
| Z1: `locatorStatements = cloneStatements;` becomes `locatorStatements = [];` in `launch.ts` | mine | `Tests  225 passed (225)` | `Tests  1 failed \| 490 passed (491)` | killed, by "the user-information statement is made once, from the clone step on, whatever then happens to the U…" |

## Round-4 findings

- F1, a clone-step refusal made after the configuration read carried no statement: **resolved.**
  - [Observed] Re-run of S-clone-alternates-EACCES:
    - Setup: a credential origin, with `.git/objects/info` set to mode 000.
    - The launch refuses at `clone` with "…/.git/objects/info/alternates cannot be examined (EACCES)".
    - `locatorStatements` is absent, the statement count is 0, and nothing leaks.
    - My ordered fs log shows 0 reads of `.git/config`. The alternates `lstat` is the last thing examined.
    - Through `initRun`, the same clone refuses with `stage: launch`. The count is 0 in the JSON and 0 in `renderHuman`, with no leak.
  - [Observed] The arm now falls inside the stated residual, which `launch.ts`'s comment after `readCloneSnapshot` now lists in full: "an alternates file that cannot be examined".
  - [Observed] Recorded H1 restores the old order and is killed in the integration tier. The kill comes from the new test's assertion that `config` was never opened.
- F4, init's refusal document carried the statement twice: **resolved.** See judgement 3 below.
- F2 and F3 are owner questions and are not judged in this round.

**Judgement 1 — the read order conforms to 047**

- [Observed] 047's closed list (lines 248–254) says the reads "SHALL be only these". It sets no order among them.
  - The only ordering constraints are:
    - a reftable clone is refused "before any Git process starts";
    - a copy-class clone with alternates is refused "before the copy step starts".
- [Observed] The ordered log of a normal `readCloneSnapshot` ends with these entries, so the alternates probe now comes just before the configuration:
  - `lstatSync .git/objects/info/alternates`
  - `lstatSync .git/config`
  - `openSync .git/config`
- [Observed] The alternates refusals still come before any Git process and before the copy step.
  - `readCloneSnapshot` is the first call in `steps()`, and it starts no process.
  - The existence refusal (`launch.ts`, `if (snapshot.alternates) return refuse('clone', …)`) is unchanged. It is still the first check of the copy-class branch, ahead of `makeCopy`.
  - My S-alternates-exists probe (a credential origin with an alternates file) refuses at `clone` with the statement once.
- [Observed] No new read kind appears. On every path, the set of reads is the same as before or smaller, with one exception:
  - Smaller: on the EACCES path, the configuration is now not read at all.
  - Exception: on a configuration over the 16 MiB bound (or unreadable), the alternates `lstat` now runs before that refusal, where before it did not.
  - The P3 probe's log for the over-bound case shows exactly these entries: `lstatSync .git/objects/info/alternates`, `lstatSync .git/config`.
  - That probe is read (4) of the closed list, which 047 permits for every launch-consented run.
  - [Inferred] It is therefore not a read that "should not" happen. Finding 1 below records it only so that nobody reads the reorder as a pure removal.

**Judgement 2 — the stated residual is now exact**

- [Observed] Sweep of `readCloneSnapshot`'s refusal arms. I used Python over the function body and located each `ok: false` site relative to the `readBounded(… 'config')` line.
  - Denominator: 17 sites.
  - 16 come before the configuration read: `.git` missing, a link or not a directory (3); the reftable constructor (1, returned once); HEAD absent or unreadable (1); HEAD not a value (1); `packed-refs` (1); a refs `lstat` error, a link, a `readdir` error or `MAX_REFS` (4); the four `admit` and `admitAll` arms (4); and alternates EACCES (1).
  - 1 is the configuration read's own refusal (unreadable or over the bound).
  - No refusal follows the parse. The only later return is `ok: true`.
  - [Observed] So every snapshot refusal is made before the configuration is read. That matches the residual listed in `launch.ts`'s comment exactly.
- [Observed] After `read.ok`, `locatorStatements = cloneStatements` is set before the first `refuse(` call that follows.
  - `refuse` attaches `locatorStatements` whenever it is non-empty, in both its no-copy and copy-class arms.
  - Lines 359 and 362 re-assign it as `[...cloneStatements, …]`, so the identity statements never displace it.
  - `grep -n "kind: 'refused'" launch.ts` finds only `refuse`'s two returns (178, 181) and the type at 136. No refusal is built outside `refuse`.
  - 27 `refuse(` calls follow line 207.
- [Observed] Probes after the configuration read, each with a credential origin:

| Probe | Stage | Count in launch outcome | Count in init document | Count in init `renderHuman` | Leak |
|---|---|---|---|---|---|
| S-terminal | `terminal` | 1 | 1 | 1 | none |
| S-alternates-exists | `clone` | 1 | 1 | 1 | none |
| S-identity-onlyone | `identity` | 1 | 1 | 1 | none |

- [Observed] Probes before the configuration read, each with a credential origin:

| Probe | Stage | Count | Leak |
|---|---|---|---|
| S-clone-alternates-EACCES | `clone` | 0 | none |
| reftable HEAD placeholder | `clone` | 0 | none |
| configuration over 16 MiB | `clone` | 0 | none |

- [Observed] Recorded Z1 (mine) drops the statement for refusals between the clone step and the identity stage. It is killed, so the stage range has its own pin.

**Judgement 3 — init's refusal carries the statement exactly once**

- [Observed] `init.ts` strips `locatorStatements` from the nested `launch` refusal. `locatorLines` still takes them from `outcome.refusal.locatorStatements` and appends them to `disclosures` (`init.ts:115`).
  - So the other locator statements, such as a rule a remote URL fails, also stay exactly once, in `disclosures`.
- [Observed] Across the three post-configuration init probes, the count is 1 in the JSON and 1 in `renderHuman`, with no leak.
- [Observed] Only the test reads `refusal.launch.locatorStatements`. No production consumer reads the nested field:
  - `grep -rn locatorStatements` over `packages/`, `apps/` and `scripts/` finds no other reader.
- [Observed] Recorded H2 is killed in the integration tier.

## Findings

**Finding 1 — a configuration over the bound, or unreadable, now also examines the alternates path before refusing** (note)

- [Observed] Before the repair, that refusal returned before the alternates `lstat`. Now the `lstat` runs first. The P3 log over the over-bound case shows exactly these entries:
  - `lstatSync .git/objects/info/alternates`
  - `lstatSync .git/config`
- [Observed] The `lstat` is read (4) of 047's closed list, "whether `objects/info/alternates` exists". 047 neither orders the list nor limits read (4) to runs that pass the configuration read.
- [Inferred] It conforms and states nothing. It is recorded only because the repair note calls the configuration "read last", which describes the order, not which reads a refusal skips.

**Finding 2 — the mutation record names `1c015d5a`, not the reviewed head** (note)

- [Observed] `1c015d5a..61baeff6` changes only the evidence JSON, the campaign file and the CD-4 raw.
- [Observed] Both mutated files hash at 61baeff6 to their recorded `file_sha256_at_commit`.
- [Observed] Both mutants reproduce their recorded unit and integration summary lines exactly.
- [Inferred] The record is re-runnable against the reviewed bytes. Nothing needs repair.

[Observed] Expected values in the two new test blocks are literals: the refusal reason template, the absent `locatorStatements` key, the count of 1, and the leak pattern. None is imported from the module under test.
