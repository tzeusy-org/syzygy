# R-PDJA-33-SLICE-CD-3 — slice C and D repairs, implementation review, round 3
Reviewed commit: ef668003
Subject: branch agent/syzygy-pdja-33-impl, round-2 repairs (7a7a52ee..ef668003)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl` fetched head `ef66800316f1c2879dde1adbb51f8535f9f274c6`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rvCD3 ef668003`, then `npm ci` (exit 0), with `TMPDIR=/home/orca/.tmp/reviews/tmpCD3`.
  - At the end, `git status --porcelain` printed 0 lines and HEAD was `ef668003`. I then removed the worktree and TMPDIR. `git worktree list | grep -c rvCD3` printed 0.
- [Observed] What I read:
  - `docs/reviews/R-PDJA-33-SLICE-CD-2-RAW.md` in full.
  - `git diff 7a7a52ee ef668003` over `packages/` and `docs/review-campaigns/`, and the seven commit subjects.
  - In `launch.ts`: `refuse`, `steps` up to the question, and the no-copy pin and pre-answer read (lines 156-362).
  - `proposeIdentity`, `readLocator` and `carriesUserInformation` in `launch-identity.ts`.
  - `initRun`'s `try`/`finally` and its call to the launch (init.ts 130-200).
  - `openPinnedObjectReader`'s `step`.
  - The mutation record, all 12 entries.
  - From the spec: 046 lines 15 and 17; 047 lines 240-248; the scenario "Clone with an alternate" (lines 348-353).
- [Observed] Probes:
  - The probe was one untracked vitest file, `cd3.probe.ts`, run under a scratch config with the `source` condition.
  - It used `launch.testkit.ts` fixtures (`makeUpstream`, `fullClone`, `makeHome`, `scriptedTerminal`, `noOtherActs`) and synthetic Git repos under TMPDIR, with the password marker `hunter2SECRET` in the origin URL.
  - No real repository, no person, no provider. The scripted terminal was given no consent phrase.
  - I moved the file and the config out of the tree before the gates and the mutants ran, and deleted them with TMPDIR.
  - The probe file passed: `Tests  5 passed (5)`.
- [Observed] Gates:
  - `npm run check`: exit 0. `Test Files  188 passed (188)`, `Tests  4435 passed | 1 skipped (4436)`.
  - `npm run test:integration`: exit 0. `Test Files  94 passed (94)`, `Tests  2914 passed | 4 skipped (2918)`.
    - Its two `Tests  1 failed (1)` lines come from `check_unit_tmpdir.mjs --selftest` fixtures. All 10 `tmpdir-selftest-case` lines say `"status":"pass"`.
  - `npm run check:battery`: exit 0, `battery: 144 ok, 0 failed, 144 commands`.
  - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`:
    - `second-method PASS: git ls-files=857; git ls-tree=857; exact path sets equal`
    - `partition PASS: denominator=857; assigned=857; raw=810; other=47; unmatched=0; overlaps=0; campaigns=152`
  - The harness moved the battery command to the background after 600 s. I waited in the foreground for it to finish and ran no mutant meanwhile.
- [Observed] Rule 6:
  - Each mutant is an exact-once replacement, asserted to occur once.
  - Each ran the record's two commands: the unit command over 7 files and the integration command over 6.
  - Each file was restored, and its sha256 was asserted equal to the pre-mutation bytes.

| Mutant | Source | Unit | Integration | Outcome |
|---|---|---|---|---|
| E2-F1 (the two-segment refusal drops `...said()`) | record | `Tests  224 passed (224)` | `Tests  1 failed \| 487 passed (488)` | killed, as recorded |
| E4-F2 (`statements: stageStatements(stateOf(null))`, no `BRIEFS_NOT_REACHED`) | record | `Tests  224 passed (224)` | `Tests  1 failed \| 487 passed (488)` | killed, as recorded |
| Y1-F6: in `carriesUserInformation`, `slash < 0 ? body :` becomes `slash < 0 ? '' :`, so a scheme URL with no path never carries user information | mine | `Tests  224 passed (224)` | `Tests  488 passed (488)` | **survived** (Finding 3) |

## Round-2 findings

- F1, the user-information statement lost on identity refusals: **resolved for the arms round 2 named.** Finding 1 below covers a sibling arm the repair does not reach.
  - [Observed] P7a: origin `https://bob:<pw>@git.example.org/onlyone.git`. The launch refuses at `identity`, and `locatorStatements` holds "The URL of the clone's remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it." Neither the password nor `bob` appears in the outcome JSON or the printed lines.
  - [Observed] P7b (`_a/_b`), P7c (an invalid `--identity`) and P7e (scp-form `git@git.example.org:onlyone.git`) give the same statement, with no leak.
  - [Observed] Through `initRun`, P7a's refusal JSON holds "user information" and the not-reached brief form, with no password.
  - [Observed] Recorded mutant E2-F1, re-run: killed.
- F2, refusals never stated the brief stage: **resolved.**
  - [Observed] 20 refused launches across 14 refusal stages each ended with "Syzygy issued no brief and delivered no packet.", exactly once. The stages: clone (reftable, alternates), self-observation, revision (unresolved name, blob), copy, identity, write-consent, terminal, a1, answer, not-public and failure.
  - [Observed] P11 (alternates, copy-class) states, in order: the named identifier, reached; "No copy was made: the copy step did not start."; "The commit was not pinned, and its committer date is Unknown."; "No question was asked."; and the brief form. Its `copyStatement` is "No copy was made." That is the scenario's full list, plus nothing else about the copy.
  - [Observed] Recorded mutant E4-F2, re-run: killed.
- F3: deferred to the owner, as the lead stated. Not judged.
- F4, the cutoff's basis: **resolved.**
  - [Observed] The doc comment now names the branch and `d19a11bd`. It says `main` writes no disclosure until the merge, and that a run `main` creates on or after the cutoff is refused at `brief` after the upgrade.
  - [Observed] A unit case pins the refusal of `pinnedAt: 'not-an-instant'`. Recorded E6-F4 (the X1 form) is killed in the unit tier: `Tests  1 failed | 223 passed (224)`.
- F5, an unreachable no-copy text: **resolved.**
  - [Observed] The intermediate state is removed. `pinnedState` is now set only by the `commitHead` read, as a date, or as Unknown with "Syzygy could not read the commit object (…)".
  - [Inferred] Nothing between `checkNoCopyPin` and that read can refuse. `openPinnedObjectReader` does its I/O lazily, inside `step`, so constructing the reader does not throw.
- F6, a multi-URL remote with user information: **resolved.**
  - [Observed] P10a (origin has two url lines, the second credential-bearing, plus a `fork` remote; no options) refuses at `identity`. It states both "The clone's remote origin has no one URL to read…" and "A url line of the clone's remote origin carried user information; Syzygy read none of those URLs as a locator and does not print, store or record them."
  - [Observed] P10b (with `--identity` and `--upstream`) reaches the question and then refuses at `answer`, with the same two statements.
  - [Observed] In both, the printed output names neither the fork nor any credential.
- F7, a SIGINT after init's last check: **resolved.**
  - [Observed] `held()` is read synchronously after `steps()` resolves and before the `finally` disarms the watch, so no event-loop turn falls between them.
  - [Observed] The new integration test emits SIGINT inside `runId` and finds `INTERRUPT_AFTER_CREATION` as the last disclosure. Recorded E11 and E12 are killed.

## Findings

**Finding 1 — a single remote URL that is not a remote locator and carries user information gets no user-information statement** (revise)

- [Observed] P7f: origin `https://bob:<pw>@github.com/redis/redis.git?x=1`. The launch refuses at `identity`, and `locatorStatements` is exactly: "The URL of the clone's remote origin is not a remote locator, so it derives nothing: it carries a query or a fragment. Syzygy does not print, store or record it." Nothing says user information.
- [Observed] Two more cases end the same way:
  - P7g, `ftp://bob:<pw>@…`, fails the form rule.
  - P7h, `https://bob%41:<pw>@…`, fails the percent rule. There the string "user information" appears only inside that rule's own text ("its user information or host holds a percent-encoded character").
- [Observed] No credential leaked in any of the three.
- [Observed] Cause:
  - `readLocator` returns `{ ok: false, rule }` with no user-information flag for these rules: query/fragment and form are tested before the authority is split, and the percent and port/host rules return before `userInformation` is computed.
  - `proposeIdentity`'s non-locator arm (`launch-identity.ts` around line 239) pushes only the rule statement.
  - The F6 repair's `carriesUserInformation` exists, and it answers true for P7f's URL. But it is applied only to multi-URL remotes in `parseConfig`.
- [Observed] 046 line 17: "Where a remote URL carried user information, the launch output SHALL say so". The condition is not limited to remote locators, and 047 line 246 exempts it from the stage rule.
- [Inferred] The same credential-bearing URL now produces a user-information statement when it is one of two url lines (P10a), but not when it is the only one (P7f). The repair commit `ae6d7a05` says "every such refusal".
- Repair:
  - In the non-locator arm, push the user-information statement where `carriesUserInformation(remote.url)` holds.
  - Add tests for the query, form and percent rules with credentials, plus a mutant that drops it.

**Finding 2 — refusals before the identity stage never say that the identity remote carried user information** (note, owner question)

- [Observed] P11c (alternates), S-revision-blob, S-copy-noroot, S-self-observation and S-clone-reftable, each run with a credential-bearing origin: `locatorStatements` is absent, and nothing says user information. No credential leaked.
  - P7d (an invalid `--upstream`, which `proposeIdentity` refuses before it reads the remote) is the same.
- [Observed] The configuration's url lines are parsed at the clone step (read (3), `parseConfig`). Only `proposeIdentity` reads a URL as a locator.
- [Inferred] Whether line 17's "a remote URL carried user information" requires the statement before Syzygy has read the URL as a locator is a reading question. Under the implementer's reading, only a URL read as a locator triggers it. Under the literal one, every launch output for such a clone carries it.
- Suggest: put it to the owner with F3. Or state it from the stage the configuration is parsed, which needs no new read.

**Finding 3 — the F6 predicate's no-path arm is untested** (note)

- [Observed] Y1-F6 survived both tiers. `carriesUserInformation('https://bob:pw@h')` returns true at ef668003 and false under the mutant, so the mutant is not equivalent. A two-line remote holding such a url line would lose its statement.
- [Observed] The unit table (`launch-identity.test.ts`) has no scheme URL without a `/` after the authority.
- Suggest: add `https://bob:pw@h` (true) and `https://h` (false) to the table.

**Finding 4 — `carriesUserInformation` can over-state on a query or fragment in the authority** (note)

- [Inferred] For `https://h?x@y/a/b` or `https://h#@/a`, the authority is taken up to the first `/`, so the `@` inside the query counts. The launch would then say a url line "carried user information" when it did not.
  - The statement remains non-leaking and fails toward disclosure.
  - It applies only to multi-URL remotes, which derive nothing anyway.
- Suggest: end the authority at the first of `/`, `?` or `#`, or say why the over-statement is accepted.

**Finding 5 — `INTERRUPT_AFTER_CREATION` hedges about a copy in a no-copy run** (note)

- [Observed] The text reads "the run is kept, with its copy where it has one", and it is emitted for both classes.
- [Inferred] It states no stage the run did not reach and is not one of 047's listed copy statements, so the stage rule does not strictly govern it. A class-specific form would match the stage rule's "a no-copy run's form of every copy statement is that no copy was made".

**Stage sweep for question 2** (summary)

- [Observed] Across the 20 probed refusals, no repair adds a statement for a stage the run did not reach:
  - `BRIEFS_NOT_REACHED` is the not-reached form, appended to refusals only, which never reach a brief.
  - The F1 and F6 locator statements are stage-exempt (047 line 246).
  - F5 removes a statement rather than adding one.
  - `INTERRUPT_AFTER_CREATION` is added only to a completed `init`.
- [Observed] `reached: true` ids matched each refusal's actual progress. For example, the alternates refusal reached `named-identifier` only, and S-answer reached `question` too.

[Observed] Expected values in the new tests are literals (statement texts, refusal reasons, the `carriesUserInformation` truth table). None is imported from the module under test.
