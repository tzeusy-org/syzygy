# R-PDJA-33-SLICE-CD-4 — slice C and D repairs, implementation review, round 4
Reviewed commit: 3864b641
Subject: branch agent/syzygy-pdja-33-impl, round-3 repairs (ef668003..3864b641)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl` fetched head `3864b64168b0943213bc7060990c8977bea4b79e`.
  - I ran `git worktree add --detach /home/orca/.tmp/reviews/rvCD4 3864b641`, then `npm ci`, which exited 0. `TMPDIR` was `/home/orca/.tmp/reviews/tmpCD4`.
  - At the end, `git status --porcelain` printed 0 lines and HEAD was `3864b641`.
  - I then removed the worktree and TMPDIR. `git worktree list | grep -c rvCD4` printed 0.
- [Observed] What I read:
  - `docs/reviews/R-PDJA-33-SLICE-CD-3-RAW.md` in full.
  - `git diff ef668003 3864b641` over `packages/`:
    - `init.ts`: `interruptAfterCreation`.
    - `launch-clone.ts`: `parseConfig`, which now flags every remote.
    - `launch-identity.ts`: `carriesUserInformation` and the new `remoteUserInformationStatement`. The two per-arm pushes were removed from `proposeIdentity`.
    - `launch.ts`: `cloneStatements`, set after `readCloneSnapshot`, and its uses at `identity`, in `outputOf` and in the run-up to the question.
    - The test changes.
  - `readCloneSnapshot` in full, for where the configuration is read (`launch-clone.ts`, after the reference reads). The alternates `lstat` comes after the configuration read.
  - `refuse` and the non-refusal returns in `launch.ts`. The `head-consented` return carries no statement, but [Observed] `init.ts` is its only caller and always passes `headConsentedElsewhere: false`, so that return is unreachable from init.
  - `initRun`'s `refuse` and its `launch` nesting, and `renderHuman` in `cli.ts`.
  - Spec 046 line 17 and 047 lines 240–248, line 246's exemption included.
- [Observed] The mutation record names commit `9db1e99d`, not the reviewed head.
  - `9db1e99d..3864b641` is one docs commit.
  - For all 11 mutants, each file's sha256 at 3864b641 equals the recorded `file_sha256_at_commit`, and each `old` text occurs exactly once.
- [Observed] Probes:
  - One untracked vitest file, `cd4.probe.ts`, under a scratch config with the `source` condition.
  - It used the `launch.testkit.ts` fixtures and synthetic Git repos under TMPDIR.
  - The origin carried the password marker `hunter2SECRET` and the user `bob`. The leak check searched the outcome JSON, the printed lines and the prompts for both.
  - No real repository, no provider, and no consent phrase was given to the scripted terminal, except the synthetic `S recorded` and `I recorded` fixtures, which answer a fixture terminal against a fixture home.
  - The probe passed: `Tests  1 passed (1)`.
  - I moved both files out of the tree before the gates and mutants ran.
- [Observed] Gates:
  - `npm run check`, first run: exit 1, `Tests  1 failed | 4435 passed | 1 skipped (4437)`.
    - The failure was `packages/polaris-generation-core/src/island-boundary.test.ts`, "Test timed out in 5000ms" (6079 ms), with a load average of 21.
    - The diff does not touch that package. Run alone, the file gave `Tests  9 passed (9)`.
  - `npm run check`, second run: exit 0, `Test Files  188 passed (188)`, `Tests  4436 passed | 1 skipped (4437)`.
  - `npm run test:integration`: exit 0, `Test Files  94 passed (94)`, `Tests  2916 passed | 4 skipped (2920)`.
    - The `Tests  1 failed (1)` and `no tests` lines come from the `check_unit_tmpdir` selftest fixtures. All 10 `tmpdir-selftest-case` lines say `"status":"pass"`.
  - `npm run check:battery`: exit 0, `battery: 144 ok, 0 failed, 144 commands`.
    - I started it detached and waited on its pid in the foreground, with `tail --pid`. No mutant ran meanwhile.
  - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`:
    - `second-method PASS: git ls-files=858; git ls-tree=858; exact path sets equal`
    - `partition PASS: denominator=858; assigned=858; raw=811; other=47; unmatched=0; overlaps=0; campaigns=152`
- [Observed] Rule 6:
  - Each mutant was an exact-once replacement, asserted to occur once.
  - Each ran the record's two commands: the unit command over 7 files and the integration command over 6.
  - Each file was restored, and its sha256 was asserted equal to the pre-mutation bytes.

| Mutant | Source | Unit | Integration | Outcome |
|---|---|---|---|---|
| G6-F1 (`remoteUserInformationStatement(snapshot.remotes, null)`) | record | `Tests  225 passed (225)` | `Tests  1 failed \| 489 passed (490)` | killed, as recorded |
| G10-F5 (`interruptAfterCreation(null)` in init) | record | `Tests  225 passed (225)` | `Tests  1 failed \| 489 passed (490)` | killed, as recorded |
| Z1: in `parseConfig`, `list.some(carriesUserInformation)` becomes `carriesUserInformation(list[0] ?? '')`, so only the first url line is tested | mine | `Tests  1 failed \| 224 passed (225)` | `Tests  1 failed \| 489 passed (490)` | killed |

## Round-3 findings

- F1, a single non-locator URL with user information got no statement: **resolved.**
  - [Observed] Each case below refuses at `identity`. Each states the user-information statement exactly once, first, followed by the rule statement. None leaks a credential.
    - P7f (query)
    - P7g (`ftp://`)
    - P7h (`bob%41`, percent rule)
    - P7i (non-decimal port)
    - P7j (`https://bob:<pw>@h`, no path)
    - P7k (fragment)
    - The statement reads: "The URL of the clone's remote origin carried user information; Syzygy does not print, store or record it, and removes it before deriving anything from that URL."
  - [Observed] P7a (`onlyone`), P7b (`_a/_b`), P7d (`--upstream file:///x/y`) and P7e (scp `git@…:onlyone.git`) each carry it once at `identity`, with no leak.
  - [Observed] P7c (`--identity 'Not An Identity!'`) reached the question and refused at `answer`. It printed the statement once, and the outcome carries it once.
  - [Observed] P10a, a two-url origin plus a clean `fork`, gives "A url line of the clone's remote origin carried user information; …" once, then the no-one-URL statement.
  - [Observed] P10b (with `--identity` and `--upstream`) gives the same pair at `answer`, printed once. Neither names the fork or any credential.
  - [Observed] Recorded G1–G3, G6 and G7 cover the clone-step assignment, both identity assignments, the remote choice and the run-up print. I re-ran G6: killed.
- F2, refusals before the identity stage (owner question): **addressed by implementation, with a stated residual.** Finding 2 judges the residual.
  - [Observed] Each refusal below states the statement once, with no leak:
    - P11c (alternates, `clone`)
    - S-self-observation (a home given a credential origin)
    - S-revision-unresolved
    - S-revision-blob
    - S-copy-noroot
    - S-records
    - S-write-consent
    - S-terminal
    - S-a1
    - S-answer
    - S-not-public
    - S-failure (the terminal throws after the copy)
  - [Observed] S-recorded holds it once in `locatorStatements`, once in `output` and once in the printed lines.
  - [Observed] S-clone-reftable carries none. This is the stated residual: HEAD's placeholder refuses before the configuration is read.
  - [Observed] S-clone-alternates-EACCES carries none, and is not in that residual (Finding 1).
- F3, the no-path arm untested: **resolved.**
  - [Observed] Recorded G8-F3 is killed in the unit tier.
  - [Observed] Probe P7j states it end to end.
- F4, an `@` in a query or fragment over-stated: **resolved.**
  - [Observed] The authority now ends at the first `/`, `?` or `#`.
  - [Observed] A single-URL origin `https://h?x@y/a/b` refuses at `identity` with only the query rule's statement, and no user-information statement.
  - [Observed] Recorded G9-F4 is killed in the unit tier.
- F5, the interrupt text hedged about a copy: **resolved.**
  - [Observed] `interruptAfterCreation` takes the run's copy. A copy-class run names its copy's path. A no-copy run says "No copy was made."
  - [Observed] Recorded G10 (re-run, killed) and G11 are killed in the integration tier.
  - [Observed] The no-copy text is pinned by a direct call (`launch.test.ts:1299`), not by a no-copy init run.

## Findings

**Finding 1 — a clone-step refusal made after the configuration is read carries no user-information statement** (revise)

- [Observed] Probe S-clone-alternates-EACCES:
  - Setup: a credential origin, with `.git/objects/info` set to mode 000.
  - The launch refuses at `clone` with "…/objects/info/alternates cannot be examined (EACCES)". `locatorStatements` is absent, and nothing says user information. No credential leaked.
- [Observed] Cause:
  - In `readCloneSnapshot`, the configuration is read and parsed (`parseConfig`, which sets `userInformation` for every remote) before the alternates `lstat`.
  - That `lstat`'s non-ENOENT arm returns `{ ok: false, reason }` and drops the parsed remotes.
  - `launch.ts` computes `cloneStatements` only after `read.ok`.
- [Observed] The repair's own comment at `launch.ts` (after `readCloneSnapshot`) says "from the clone step on, every launch output says the identity remote's URL carried user information". The stated residual covers only refusals made before the configuration is read. This refusal is after that read and at the clone stage, so it falls outside both.
- [Inferred] The arm is narrow: an unexaminable `objects/info`. But this is the same class as round 3's F1: an arm the "every output" claim does not reach.
- Repair, either one:
  - Move the alternates `lstat` before the configuration read, so the arm falls inside the stated residual.
  - Or return the parsed remotes with that refusal and state the statement from them.
  - Add a test for the arm and a mutant that drops it.

**Finding 2 — the residual (refusals before the configuration is read) is a reading question, not a defect** (note, owner question)

- [Observed] The pre-configuration refusals are:
  - the reftable placeholder, and any HEAD or reference that is unreadable or not admitted
  - `.git` missing, a link, or a file
  - a configuration that is unreadable or over the byte bound
- None of them carries the statement. S-clone-reftable confirms one of them.
- [Inferred] 046 line 17 reads: "Where a remote URL carried user information, the launch output SHALL say so". It sits in the paragraph about URLs "Syzygy reads from the clone's remote configuration". On that reading, a run that refused before reading any URL owes no statement, and the residual conforms.
- [Inferred] On the literal reading, the condition is a fact of the clone. A reftable refusal could read the configuration (read (3) is in the closed list) before refusing, and say so.
- [Inferred] The output asserts nothing false either way. It is silent, not wrong.
- Suggest: put it to the owner with F3 of round 2. Neither reading is the agent's to choose.

**Finding 3 — user information on a remote other than the identity remote is computed and never stated** (note, owner question)

- [Observed] Probe W-clean-origin-cred-fork: origin is clean, and a `fork` remote carries `bob:<pw>@`. Probe W-cred-origin-clean-default-up: origin carries credentials, and `up` is the default's remote and clean.
  - Both runs refuse at `terminal` with no user-information statement and no leak.
- [Observed] `parseConfig` now sets `userInformation` for every remote. `remoteUserInformationStatement` reads only `identityRemote`'s.
  - The unit test pins this choice: "another remote's user information is not it" (`launch-identity.test.ts`, the CD-3 finding 1 case).
- [Observed] The statement never names the wrong remote.
  - W-cred-origin-clean-default-up says nothing, rather than naming origin under `up`.
  - The recorded test with `up` names `up`.
  - A clean identity remote never gets the statement: W-clean-origin, W-scp-no-user and W-query-at-single.
- [Inferred] Whether "a remote URL" in line 17 means any url line Syzygy parses, or only the one the identity rule reads, is the same reading question as Finding 2. Syzygy does parse these lines and holds the flag.

**Finding 4 — init's refusal document carries the statement twice** (note)

- [Observed] Through `initRun`, P7a-shaped and S-terminal-shaped launches refuse with `stage: launch`. `renderHuman` of the refusal then holds the statement on two lines: `launch.locatorStatements.0` and `disclosures.4`. The JSON form holds it in the same two fields.
  - A recorded init holds it once (`disclosures.21`).
  - No credential appears in any of them.
- [Observed] This structure predates the round. `init.ts` nests `launch: outcome.refusal` and appends `locatorLines` to `disclosures`, and the CD-3 diff changes neither.
- [Inferred] It leaks nothing and states nothing false. It falls short only of "exactly once" across a document's fields.
- Suggest: leave it, or drop `locatorStatements` from the nested launch refusal in init's document.

**Stage sweep** (summary)

- [Observed] Across all 33 probed launch outcomes, `reached: true` ids matched each run's actual progress. For example:
  - S-revision-unresolved, S-self-observation, S-records and S-clone-reftable reached nothing.
  - P11c and S-copy-noroot reached `named-identifier` only.
  - S-revision-blob reached the copy ids but not `pinned-commit`.
  - The `answer`, `not-public` and `failure` refusals reached `question`.
- [Observed] The user-information statement is the only one this repair moved. It is stage-exempt (047 line 246), and it is never made before the clone step's configuration read.
- [Observed] `interruptAfterCreation` now states no copy for a no-copy run, and names the copy only where one exists.

[Observed] Expected values in the new tests are literals: statement texts, the `carriesUserInformation` table and the interrupt texts. None is imported from the module under test, apart from the `interruptAfterCreation(null)` call, which is checked against a literal.
