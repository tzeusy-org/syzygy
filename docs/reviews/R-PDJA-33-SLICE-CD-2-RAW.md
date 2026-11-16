# R-PDJA-33-SLICE-CD-2 — slice C and D repairs, implementation review, round 2
Reviewed commit: 7a7a52ee
Subject: branch agent/syzygy-pdja-33-impl, slice-C repairs (3c879e36..14e24f0c) and slice-D repairs (14e24f0c..7a7a52ee)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl`. The fetched head was `7a7a52eee0d528456b703c98299c1d10848dad26`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rvCD2 7a7a52ee`, then `npm ci` (exit 0), with `TMPDIR=/home/orca/.tmp/reviews/tmpCD2`.
  - At the end, `git status --porcelain` printed 0 lines and HEAD was still `7a7a52ee`. I then removed the worktree and TMPDIR. `git worktree list` no longer names rvCD2.
- [Observed] What I read:
  - The C-1 and D-1 raws in full.
  - `git diff 3c879e36 14e24f0c` and `git diff 14e24f0c 7a7a52ee`.
  - `launch.ts` lines 150-430.
  - `launch-statements.ts` in full.
  - The proposal and refusal branches of `launch-identity.ts`.
  - `init.ts` from the interrupt check to the end.
  - `briefCopyOf` and `cloneUnderCopies` in `launch-disclosure.ts`.
  - `render.ts`'s brief items.
  - Both mutation records.
  - From the spec: 046 lines 15, 17 and 37; 047 lines 240, 244 and 246; the falsifiers (lines 223 and 396); and the scenario "Clone with an alternate" (lines 350-353).
  - The owner direction of 2026-11-12.
- [Observed] `npm run check:all` exited 1. The chain stopped at `test:e2e`, so its later steps did not run in that invocation. Its summary lines:
  - typecheck and unit: `Test Files  188 passed (188)`, `Tests  4433 passed | 1 skipped (4434)`.
  - test:tiers: `ok: every test file is in exactly one tier` (unit 188, integration 94, e2e 26, live 3).
  - integration: `Test Files  94 passed (94)`, `Tests  2912 passed | 4 skipped (2916)`. The `|fixture|` failures in the log come from the tmpdir selftest and are intended.
  - e2e (vitest part): `Test Files  3 failed | 12 passed (15)`, `Tests  1 failed | 139 passed | 2 skipped (142)`. All three failures are `private browser guardian did not verify descendant cleanup` in `apps/three-surface-poc` (orrery, trajectory-narrowing, surface-routes).
- [Observed] Follow-up runs, because the chain stopped:
  - The three failed e2e files, run alone: `Test Files  3 passed (3)`, `Tests  21 passed (21)`.
  - `npm run test:e2e` twice more. Each time `cdp-browser.browser.test.ts` failed (`Tests  4 failed | 136 passed | 2 skipped (142)`; "expected 17 to be +0", stray Chrome processes). The load average was 21. Run alone, that file passed: `Tests  5 passed (5)`.
  - `npm run test:system`: exit 0, `Test Files  10 passed | 1 skipped (11)`, `Tests  52 passed | 1 skipped (53)`.
  - `npm run check:battery`: `battery: 144 ok, 0 failed, 144 commands`.
  - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`:
    - `second-method PASS: git ls-files=856; git ls-tree=856; exact path sets equal`
    - `partition PASS: denominator=856; assigned=856; raw=809; other=47; unmatched=0; overlaps=0; campaigns=152`
- [Observed] `git diff --stat 3c879e36 7a7a52ee -- apps` is empty. [Inferred] The e2e failures do not come from this branch. They are browser-teardown flakes under host load. Even so, `check:all` was not green in any single invocation.
- [Observed] Probes:
  - One untracked vitest file, run under a scratch config with the `source` condition. It used `launch.testkit.ts` fixtures and synthetic Git repos under TMPDIR, with no real repository, no prompt to a person and no provider.
  - I moved the file out of the tree before any mutant ran, and it is now deleted.
  - Each probe and its outcome is under the findings below.
- [Observed] Rule 6:
  - Each mutant is an exact-once replacement, asserted to occur once.
  - Each ran the two commands its record names. For my own mutants I used slice D's commands.
  - Each file was restored, and its sha256 was asserted equal to the pre-mutation bytes.

| Mutant | Source | Unit | Integration | Outcome |
|---|---|---|---|---|
| CR1-transport-admitted (delete the `rest.startsWith(':')` refusal) | slice-C record | `Tests  5 failed \| 117 passed (122)` | `Tests  188 passed (188)` | killed, as recorded |
| DR14-F5 (waiting path drops `stageStatement`) | slice-D record | `Tests  117 passed (117)` | `Tests  1 failed \| 485 passed (486)` | killed, as recorded |
| DR21-F7 (drop `!underCopies &&` from the legacy arm) | slice-D record | `Tests  1 failed \| 116 passed (117)` | `Tests  1 failed \| 485 passed (486)` | killed, as recorded |
| X1-F7: legacy arm becomes `!(Date.parse(pinnedAt) >= Date.parse(SINCE))`, so an unparseable pinnedAt counts as legacy | mine (F7 fail-closed) | `Tests  117 passed (117)` | `Tests  486 passed (486)` | **survived**, equivalent through the real callers (Finding 4) |
| X2-F1: the `fetch-failed` arm says "the pinned commit" instead of `${fetched}` | mine (F1 named identifier) | `Tests  1 failed \| 116 passed (117)` | `Tests  3 failed \| 483 passed (486)` | killed |

- The CR1 integration denominator is 188 here and 184 in the record at 4c64ca0b. [Inferred] Tests were added after that commit.

## Round-1 findings

### C-1 (round 1 reviewed f970825c)

- F1, the `<transport>::<address>` forms: **resolved.**
  - [Observed] Probe P9 refuses each of these with the transport rule, for operator and remote alike: `ext::x/a/b`, `fd::3/a/b`, `persistent-https::h/a/b`, `testgit::/a/b`, `git@ext::x/a/b`, `ext::ssh://h/a/b`, `h:::a/b`, `a.b::c/d`.
  - [Observed] Tests and mutant CR1 are in place. I re-ran CR1: killed.
- F2, the leading empty segment: **resolved.**
  - [Observed] P9 refuses `https://h//a/b`, `ssh://git@h:22//a/b`, `git://h//a/b` and `http://h///a/b` with the path rule, the same rule as `https://h/a//b`.
  - [Observed] `git@h:/a/b` and `h:/a` are still admitted, and `git@h://a/b` is still refused by the scp rule.
  - [Observed] `https://h/a/b//` is refused: one trailing `/` is removed, and the empty segment left is refused. That is consistent with 046's "one trailing /".
- F3, an interrupt outside the question: **resolved.**
  - [Observed] The watch is armed just before `makeCopy`. It is checked after the copy step, before the question, before the record write, and in `init` before the run directory. It is disarmed in `init`'s `finally`. CR3 to CR8 are recorded killed.
  - [Inferred] Residual, note only: a SIGINT that arrives after `init`'s last check is held and never acted on, so the run completes with its copy kept and named. Nothing is left unnamed (Finding 7).
- F4 and F5, the narrower host, port and identity grammars: **disclosed, not widened, as the lead deferred.**
  - [Observed] Each refusal now says the rule is "narrower than REQ-polaris-generation-046 states". `--identity` refusals carry `IDENTITY_RULE`.
  - [Inferred] The deferral is safe because it fails closed and is disclosed.
- F6, a multi-URL identity remote: **resolved.**
  - [Observed] P10: an `origin` with two url lines, plus a `fork` remote, refuses without options and names `origin`. It never falls through to `fork`. See choice 1 for the run with options.
  - [Observed] `parseConfig` keeps such a remote with `url: null`. CR10 and CR11 are killed.
- F7, the preflight URL quoting: **resolved.**
  - [Observed] `quote()` single-quotes the URL. The preflight test re-splits the command as a shell would and runs it. CR15 is killed.

### D-1 (round 1 reviewed 3c879e36)

- F1, "the pinned commit" for runs never pinned: **resolved.**
  - [Observed] P1 (`--revision` naming a blob, refused because the checkout failed) and P1b (an annotated tag, which did not leave HEAD there) both state:
    - "a local fetch of the named identifier alone…"
    - "The commit was not pinned, and its committer date is Unknown."
  - [Observed] My X2, on the `fetch-failed` arm alone, is killed.
- F2, a false reason in the `'unread'` text: **resolved.**
  - [Observed] P3 (no-copy, `commitHead` refuses): the statements are "No copy was made: this is a no-copy run…" and "The pinned revision is …. Its committer date is Unknown: Syzygy could not read the commit object (probe refusal)." The text names no copy.
  - [Observed] P2 (the copy passed its form check, then `commitHead` refused) states "Syzygy could not read the commit object". There is no form-check claim.
  - [Observed] P6 is covered under F3.
  - Residual, note only: see Finding 5.
- F3, the committer date withheld at a reached stage: **resolved.**
  - [Observed] P6 (an extra object, so the store check fails after `inventory()`): "its committer date, as the commit object records it, is 1790812800 +0000".
  - [Observed] The date is read from the copy once `made.ok`. The pre-answer reads reuse it, so `commitHead` runs once. The existing test pins the call order `commitHead`, `inventory`, `listTree`.
- F4, a no-copy question without "no copy was made": **resolved.**
  - [Observed] P5: the no-copy question carries `QUESTION_NO_COPY` and no `COPY_METHOD`. DR8 and DR9 are killed.
- F5, the run record never states the brief stage: **resolved in substance, with a note (Finding 3).**
  - [Observed] P4's `launch.json` ends with `briefs:false`, the not-reached form. Each issued brief stores its reached form in `brief.json` or the inventory session's prompt record. DR10 to DR14 are killed. I re-ran DR14: killed.
- F6, the user-information statement: **partly resolved. See Finding 1.**
  - [Observed] P4 (a covered copy-class `init` whose origin carries user information): the `init` report now holds "The URL of the clone's remote origin carried user information; …". No user name or password appears in the output, the report or `launch.json`.
  - [Observed] P7: the statement is still lost when the identity proposal refuses after reading such a URL.
- F7, briefs fail open on an absent `launch.json`: **resolved.**
  - [Observed] P8: with `launch.json` absent:
    - a clone outside `copies` pinned at `2026-11-12T23:59:59Z` → `ok copy=null`;
    - pinned at `2026-11-13T00:00:00Z` → refused;
    - pinned at `garbage` → refused;
    - a clone under `copies` pinned at `2026-01-01` → refused, naming the copy-class reason.
  - [Observed] DR21 to DR26 are recorded killed. I re-ran DR21: killed. See choice 2 and Finding 4.
- F8: deferred to the owner (spec-inherited wording). [Inferred] Safe to defer: it misdescribes no read and no copy.
- F9: skipped as the lead noted. [Inferred] Not unsafe: the id carries stage, class and reached.
- F10, the page's brief statement taken from `launch.json`: **resolved.**
  - [Observed] `render.ts` reads each brief record's stored `stageStatement` through `storedBriefItem`. A record with none, or one that is unreadable, renders Unknown. DR16 and DR17 are killed.

## Choices

1. C F6 (`--identity` and `--upstream` given; the identity remote has several url lines): **conforms.**
   - [Observed] P10 with options proceeds to the question. The printed lines include "The clone's remote origin has no one URL to read, so it derives nothing: it has 2 url lines… Syzygy does not print, store or record its URLs."
   - [Observed] The URL is taken "from the operator's --upstream option". Neither the other url line nor the `fork` remote is printed.
   - [Inferred] 046 line 15: where the remote derives nothing, the operator gives both options. That is this path.
   - Residual: see Finding 6.
2. D F7 (an absent `launch.json` counts as legacy only if pinnedAt is before `LAUNCH_DISCLOSURE_SINCE`; a clone under `<stateRoot>/copies` is always copy-class): **conforms, with a note.**
   - [Observed] The rule fails closed in every arm I probed.
   - [Observed] `run-record.ts:172` refuses a pinnedAt that is not a UTC instant before `briefCopyOf` runs. X1's survival is therefore equivalent through the real callers.
   - [Inferred] `run.json` lies within the agent sessions' write reach. A session that rewrote both `clone.path` and `pinnedAt` and deleted `launch.json` would pass as legacy. That is the general Inferred posture of these files, not new.
   - See Finding 4 for the cutoff's stated basis.
3. D F2 (the pre-answer reason replaces the early one): **conforms.**
   - [Observed] In P2 the final text is "Syzygy could not read the commit object (probe refusal)" after the copy's own read failed the same way.
   - [Inferred] Both reasons are true of the run, and the later one names the read that ended it.
4. D F3 (the copy's commit object is read as soon as the checkout pins it): **conforms.**
   - [Observed] 047 line 244: "commit pinned … which in a copy-class run is when the copy holds the commit".
   - [Observed] The read is Syzygy's own re-hashing reader on Syzygy's own copy. It reads one commit object and no blob, before the form check.
   - [Inferred] 046 permits the read from that stage on. The 047 falsifier ("once the commit is pinned, they lack its committer date") makes stating the date the safer arm.

## Findings

**Finding 1 — the user-information statement is still lost when the identity proposal refuses after reading the remote URL** (revise)

- [Observed] P7, origin `https://bob:<password>@git.example.org/onlyone.git`:
  - the launch refuses at `identity`: "the normalised URL git.example.org/onlyone has fewer than two path segments…";
  - `refusal.locatorStatements` is absent;
  - nothing printed says "user information";
  - `init`'s refusal `disclosures` carry no such line.
- [Observed] The same holds for `https://bob:<password>@git.example.org/_a/_b.git`, refused with "no identity derives from the normalised URL git.example.org/_a/_b…".
- [Observed] The password and the user name appear nowhere in the output.
- [Observed] Cause:
  - `proposeIdentity` builds `locatorStatements` but returns them only on its `ok: true` branches.
  - Four refusal branches come after the URL is read and drop them (`launch-identity.ts:242`, `:247`, `:248-249`, `:252`): an invalid `--identity`, the two-segment floor, several carried identities, and a derived null.
  - `launch.ts:347` sets `locatorStatements` only after `proposal.ok`.
- [Observed] 046 line 17: "Where a remote URL carried user information, the launch output SHALL say so."
- [Inferred] These refusals print a URL derived from a credential-bearing remote and do not say it carried user information. That is the remaining arm of D-1 F6, whose repair commit says "on every path".
- Repair:
  - Return `locatorStatements` on every refusal after the remote is read.
  - Carry them into `refusal.locatorStatements`.
  - Add a test with origin user information and a one-segment path, plus a mutant that drops it.

**Finding 2 — a refused launch's output never states the brief stage's not-reached form, which the "Clone with an alternate" scenario requires** (revise)

- [Observed] P11 (an `objects/info/alternates` file, copy-class `init`): the refusal's statements are `named-identifier:true, copy:false, pinned-commit:false, question:false`, and the whole refusal JSON does not contain "issued no brief".
- [Observed] 047's scenario "Clone with an alternate", line 353: "the launch output and the run record state that no copy was made, that no question was asked, and that Syzygy issued no brief and delivered no packet".
- [Observed] `BRIEFS_NOT_REACHED` is appended only in `init.ts`'s `launchDisclosure`, which only a completed `init` reaches. `stageStatements`, which feeds every refusal and the launch's own output, never emits it.
- [Inferred] The stage rule says "for each such stage the run did not reach, the run SHALL state … that Syzygy issued no brief and delivered no packet". Every refused launch reaches no brief stage, so every refusal's launch output lacks a required not-reached statement. D-1's table listed this statement for the run record and pages only, so round 1 did not catch it.
- Repair:
  - Emit the not-reached brief form in the launch's refusal statements, for example by appending it in `refuse`.
  - Pin the alternates scenario's full list.

**Finding 3 — `launch.json` keeps "Syzygy issued no brief and delivered no packet" after a brief is issued** (note)

- [Observed] P4's `launch.json` holds `briefs: reached false`. It is written once and never updated. The reached form lives in `brief.json` and in the inventory prompt records, and pages substitute it.
- [Inferred] Taken alone, `launch.json` then states a not-reached stage the run has reached. It is consistent only if "the run record" (046 line 37) is read as the run directory's records together, which is the implementer's reading.
- Suggest: say in the statement, or in the file's format, that it is `init`'s form as of the run's creation. Or put the reading to the owner with the F8 question.

**Finding 4 — `LAUNCH_DISCLOSURE_SINCE`'s stated basis is true of this branch, not of `main`** (note)

- [Observed] The doc comment says "The first instant at which `init` writes a launch disclosure for every run it creates".
- [Observed] `launch.json` first appears in d19a11bd (2026-11-13T15:05Z) on this unmerged branch. `main` (head 5be0fce2) writes none.
- [Inferred] A no-copy run that `main`'s `init` creates between 2026-11-13 and the merge would be refused at `brief` after the upgrade. That fails closed, but the cutoff names the wrong population.
- Suggest:
  - Correct the comment.
  - Add a `briefCopyOf` unit case for an unparseable pinnedAt, so X1 is killed in the unit tier as well as by the run-record decoder.

**Finding 5 — an unreachable no-copy text would be false if reached** (note)

- [Observed] `launch.ts` sets the no-copy pinned state to `{ unknown: 'Syzygy has not read its commit object' }` after `checkNoCopyPin`.
- [Observed] `checkNoCopyPin`'s `isCommit` has already called `reader.tree()`, which parses the commit object (`git-object-reader.ts:179`, `walk.rootTree()`).
- [Inferred] Nothing between that assignment and the `commitHead` call refuses, so the text is never emitted. Replace it with a true text, or drop the intermediate state.

**Finding 6 — a multi-URL remote whose url lines carry user information gets no user-information statement** (note)

- [Observed] In P10, one of `origin`'s two url lines carried user information. The output says only that the remote "has no one URL to read" and that Syzygy "does not print, store or record its URLs".
- [Inferred] The identity rule reads neither URL, so whether 046 line 17's "a remote URL carried user information" reaches this case is a reading question. Nothing is leaked. Name it with the owner questions, or say so in the statement.

**Finding 7 — a SIGINT after `init`'s last interrupt check is held and dropped** (note)

- [Observed] After `ports.launch?.interrupt?.check()` in `init` come only the synchronous `createRunDirectory` and the return. The `finally` disarms the watch with `hit` possibly set.
- [Inferred] The operator's Ctrl-C then has no effect, and the run completes with its copy kept and named. Nothing is left unnamed, so this is not unsafe. Mentioning it in the launch output, or acting on it after the outcome, would be more honest.

**Stage×class sweep** (summary)

- [Observed] Sweep scope: every statement emitter in `launch-statements.ts` (`stageStatements`, `copyStatements`, `questionCopyStatements`, `BRIEFS_NOT_REACHED`, `issuedBriefStatement`) and every consumer outside tests: `launch.ts:176`, `:179`, `:353`, `:411`; `init.ts:282`, `:302`, `:308`; `brief.ts:320`; `inventory.ts:188`; `render.ts:833-839`.
- [Observed] Probes P1 to P6 and P11 found no statement made for a stage the run did not reach, and no class-specific statement in a run of the other class.
- [Observed] `copy-beyond-consent`'s "Syzygy fetched the pinned commit" arm cannot occur with an unpinned commit: `beyondConsent` is set only at `launch.ts:365`, after the copy is formed.
- [Observed] The omissions are the not-reached brief form in refusals (Finding 2) and the user-information statement (Finding 1).

[Observed] Expected values in the new tests are literals: statement texts, rule texts, refusal strings and identities. None is imported from the module under test.
