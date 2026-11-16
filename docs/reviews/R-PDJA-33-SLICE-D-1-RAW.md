# R-PDJA-33-SLICE-D-1 — launch, record, page and brief statements, implementation review, round 1
Reviewed commit: 3c879e36
Subject: branch agent/syzygy-pdja-33-impl, slice D (f970825c..3c879e36)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl` resolved to `3c879e36cc807e698dbff32f893a149f2810bd45`.
  - Then `git worktree add --detach /home/orca/.tmp/reviews/rvD 3c879e36` and `npm ci` (exit 0), with `TMPDIR=/home/orca/.tmp/reviews/tmpD`.
  - The worktree and TMPDIR are now removed. No tracked file was edited except during the mutants: each mutant was restored with `git checkout --`, and `git status --porcelain` showed only my untracked probe files, which I then deleted.
- [Observed] Authority read:
  - spec.md lines 7-39 (REQ-046) and 236-262 (REQ-047), including both falsifiers (lines 223 and 393).
  - `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md`.
  - IMPACT-LEDGER.md §"Implementation impact".
- [Observed] `npm run check`: exit 0.
  - `Test Files  188 passed (188)`
  - `Tests  4415 passed | 1 skipped (4416)`
- [Observed] `npm run test:integration`: exit 0.
  - The real tier reported `Test Files  94 passed (94)` and `Tests  2904 passed | 4 skipped (2908)`.
  - The `|fixture|` "Failed Tests 1" blocks in the log are the tmpdir selftest's intended failures.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`:
  - `second-method PASS: git ls-files=854; git ls-tree=854; exact path sets equal`
  - `partition PASS: denominator=854; assigned=854; raw=807; other=47; unmatched=0; overlaps=0; campaigns=152`
- [Observed] Synthetic falsifier probes:
  - Each probe ran as an untracked vitest file under a scratch config. It used the repo's `launch.testkit.ts` fixtures and synthetic `git` repos under TMPDIR, with no real repository and no provider.
  - P1: `--revision` names a blob.
  - P1b: `--revision` names an annotated tag.
  - P2: the copy passes its form check, then `commitHead` refuses.
  - P3: a no-copy run whose `commitHead` refuses.
  - P4: a covered copy-class `init` whose remote URL carries user information.
  - P5: a no-copy run that asks a question.
  - P6: an extra object in the copy, so the store check fails after `inventory()`.
- [Observed] Rule 6, using the recorded unit and integration commands from the mutation record:

  | Mutant | Source | unit | integration | Outcome |
  |---|---|---|---|---|
  | D14 (`=== 'operator-clone'` → `!== 'copy'`) | recorded | `Tests  112 passed (112)` | `Tests  344 passed (344)` | survived, as recorded |
  | D1 (`if (s.named.localElsewhere !== null)` → `if (false)`) | recorded | `Tests  1 failed \| 111 passed (112)` | `Tests  1 failed \| 343 passed (344)` | killed, as recorded |
  | D3 (no-copy `'no-copy'` → `'both'`) | recorded | `Tests  2 failed \| 110 passed (112)` | `Tests  1 failed \| 343 passed (344)` | killed, as recorded |
  | R1: drop the `copy-reliance` push in `copyStatements` | mine (drop one statement) | `Tests  2 failed \| 110 passed (112)` | `Tests  3 failed \| 341 passed (344)` | killed |
  | R2: `out.push(s.questionAsked` → `out.push(true`, so "A question was asked" is stated for an unreached stage | mine (wrong stage) | `Tests  3 failed \| 109 passed (112)` | `Tests  4 failed \| 340 passed (344)` | killed |

## Statement table

Places: Q = question, LO = launch output, RR = run record (`launch.json`), PG = pages, BR = briefs. All observations come from the code and the probes at 3c879e36.

| Statement (stage; class) | Required places | Implemented places | Gap |
|---|---|---|---|
| Copy method, Git's reads of the operator's clone, Syzygy's own reads (question asked; copy-class) | Q | Q (`questionCopyStatements`) | none |
| Sessions directed to the copy by their briefs; staying there is their own report (question asked; copy-class) | Q | Q | none |
| Copy made before the answer, none of its blobs read, removed or kept, location (question asked; copy-class) | Q | Q | none |
| No-copy form "no copy was made" of the Q copy statements (question asked; no-copy) | Q | **absent** (P5) | Finding 4 |
| Named identifier in full, its reference or `--revision`, no network request, update command (identifier named; both) | LO, RR | LO, RR, PG | none |
| Local branch elsewhere: both identifiers, local commit is not the trunk default (identifier named) | LO | LO, RR, PG | extra places, harmless |
| How the copy was made (copy step started; copy-class) | RR, PG | LO, RR, PG | the not-pinned variants say "pinned commit" (Finding 1) |
| Ended before the fetch / fetch failed / ended before the form check (copy step started; copy-class) | RR, PG | LO, RR, PG | as above |
| Copy removed / not removed / kept and where; no copy made (copy-class; LO is 047's) | LO, RR, PG | LO, RR, PG | none |
| Inferred reliance on Git starting no configured program (copy step started; copy-class) | RR | LO, RR, PG | none |
| Copy goes beyond the v1.1 consent, or fetch failed, or no fetch (copy step started; copy-class) | RR | LO, RR, PG, for covered and recorded runs | none in RR (refusals write no RR) |
| No-copy form "no copy was made" (no-copy) | RR, PG | LO, RR, PG | none |
| Committer date as the commit object records it, else not pinned and Unknown (commit pinned; both) | LO, RR | LO, RR, PG | false reasons and a missing date (Findings 2, 3) |
| A question was asked / was not (question asked; both) | RR, PG | LO, RR, PG | none |
| Each issued brief directed its session to the copy, and staying is the session's own report [Inferred] (brief/packet delivered; copy-class) | RR, PG | PG only, derived at render | RR absent (Finding 5) |
| No-copy brief-stage form (brief/packet delivered; no-copy) | RR, PG | PG only | RR absent (Finding 5) |
| "Syzygy issued no brief and delivered no packet" (not reached) | RR, PG | neither at init, PG never reaches it | RR absent (Finding 5) |
| Consents recorded at launch, with ids and recording commit, or none | RR, PG | RR, PG, init report | none |
| Identity, URL, source, Inferred; public declaration or none; how proposed; residuals | RR, PG | RR, PG | none |
| Drawer statement relied on | RR, PG | RR, PG | none |
| Who answered rests on the operator's declaration [Inferred] | RR, PG | PG and init report (`launch/answered`, derived) | none |
| Remote URL carried user information (046 l.17; not stage-governed) | LO | the terminal before a question; `outcome.output` is never surfaced | covered runs lose it (Finding 6) |
| Brief names the copy and says not to read the operator's clone (copy-class) | authoring and inventory BR | BR while `launch.json` reads ok | fails open when absent (Finding 7) |
| Review packets unchanged | packets | `review*.ts`, `review-packet.ts` and `design-review.ts` untouched; they read no brief file | none [Inferred from the empty diff and the grep] |

## The implementer's choices

1. **v1.2 record scope.** Accepted.
   - [Observed] 046 line 21 fixes the scope wording "held in the copy that REQ-polaris-generation-047 makes…".
   - [Observed] The direction authorizes "REQ-polaris-generation-046 and 047 as signed".
   - [Observed] The v1.1 tail reads back as `operator-clone`, and an unknown tail is refused (`parseLaunchRecord`).
   - [Inferred] The ledger's silence does not narrow the signed text.
2. **`beyondConsent` only once known.** Accepted.
   - [Observed] A refused launch writes no run record (`init.ts`; `launch.json` is written only by `createRunDirectory` on success).
   - [Observed] 047 requires the beyond-consent statement of the run record alone.
3. **Copy that failed its form check reports the pinned commit's date as Unknown.** Not accepted. See Findings 2 and 3.
   - [Observed] The stage is reached: the checkout left HEAD at the named identifier.
   - [Observed] 046 permits reading the commit "in a copy-class run only once the commit is pinned".
   - [Observed] The 047 falsifier arm "once the commit is pinned, they lack its committer date" fires.
4. **Every label Inferred.** Accepted.
   - [Observed] Neither 046 nor 047 requires any of these statements labelled Observed.
   - [Observed] Several are required Inferred: who answered, the session's own report, the reliance statement.
   - [Inferred] `launch.json` lies within the agent sessions' write reach, so Inferred is the correct read-back label.
5. **Brief stage derived at render.** Accepted for pages, not for the run record. See Finding 5.
6. **No-copy brief text does not name the briefs.** Accepted.
   - [Observed] The no-copy form in 046 l.37 and 047 names no brief.
7. **User-information statement only in the launch output.** Placement accepted.
   - [Observed] On a covered run the statement never reaches the operator. See Finding 6.
   - [Observed] The extra places for local-not-trunk violate no rule.
8. **Separate `launch.json`; legacy renders "launch/unknown".** Accepted for pages.
   - [Observed] Pages label it Unknown, which satisfies VIS-2.
   - [Observed] Briefs treat an absent file as no-copy. See Finding 7.
9. **D14 and D29c equivalent.**
   - D14: accepted. [Observed] `parseLaunchRecord` refuses any scope tail but the two, and my re-run reproduced the survival.
   - D29c: accepted. [Inferred] `not-given` is refused before any record while no successor admits non-public sources. I did not re-run D29c.

## Findings

**Finding 1 — the copy statement says "the pinned commit" for runs whose commit was never pinned** (revise)
- [Observed] P1 (blob `--revision`) and P1b (annotated tag) each emit both of these in one statement list:
  - `copy`: "The copy step used the method a copy is made by: a local fetch of the pinned commit alone from the operator's clone…"
  - `pinned-commit`: "The commit was not pinned, and its committer date is Unknown."
- [Observed] For P1b the named object is not a commit at all.
- [Observed] The slice's own test "a failed fetch…" (`launch.test.ts`) pins this contradictory text as expected output.
- [Observed] 047 says: "a rule that acts before it is shown acts on the named identifier".
- [Observed] The 046 and 047 falsifiers say: "stated for a stage it did not reach".
- [Inferred] This is the recurring defect class.
- Fix: for the `fetch-failed` and `fetched` variants, say "the named identifier" until the commit is pinned (`launch-statements.ts` `copyStatements`).

**Finding 2 — the `'unread'` pinned-commit text gives a false reason, and in a no-copy run names a copy** (revise)
- [Observed] The text is fixed: "the copy's detached checkout left the copy's HEAD there… the copy did not pass its form check, so Syzygy read none of its objects". It is false in three reachable cases:
  - (a) P3, a no-copy run whose `commitHead` refuses. The list has `copy`/`no-copy`: "No copy was made…" beside this copy-class text. That is the falsifier arm "stated… for a run class that does not require it".
  - (b) P2, a copy that passed its form check. The `copy` statement is `COPY_METHOD`, yet the pinned text says the form check failed.
  - (c) P6, the store check fails after `inventory()` was called. That call reads the commit's parents and walks the reachable trees (`git-object-reader.ts:186-191`), so "read none of its objects" is false.
- [Observed] Cause: `launch.ts` sets `pinnedState = { committerDate: 'unread' }` both after `made.ok` and after `checkNoCopyPin`, and before the reader runs.

**Finding 3 — a reached commit-pinned stage omits the committer date it could read** (revise)
- [Observed] Where the copy's checkout left HEAD at the named identifier and the form or store check then fails, the stage is reached and the date is withheld as Unknown.
- [Observed] 047 says: "Once the commit is pinned… they SHALL state its committer date as the commit object records it".
- [Observed] 046 permits that read once the commit is pinned.
- [Observed] In case (c) of Finding 2, `inventory()` had already read the commit object.
- Fix: either read the date for these refusals, or bring the trade-off (not trusting a malformed copy) to the owner as a ruling. As written it meets a falsifier arm.

**Finding 4 — a no-copy run's question omits "no copy was made"** (revise)
- [Observed] P5: a no-copy run, whose named identifier another act's consent names, asked a question. The printed opening carries no copy statement and no "no copy" form.
- [Observed] `questionOpening` adds copy lines only when `copy !== null`.
- [Observed] 047 says the copy statements include those "REQ-polaris-generation-046 requires of the question", and "a no-copy run's form of every copy statement is that no copy was made".
- [Observed] The 046 falsifier arm "missing from the question… for a stage the run reached" applies.

**Finding 5 — the run record never states the brief-or-packet stage, in either form** (revise)
- [Observed] P4: `launch.json` holds `named-identifier`, `copy`, `copy-location`, `copy-reliance`, `pinned-commit` and `question`, and nothing for "brief or packet delivered".
- [Observed] `init` passes `briefs: null`, so neither the not-reached form ("Syzygy issued no brief and delivered no packet") nor the reached form is stored.
- [Observed] Only pages derive the reached form at render.
- [Observed] Both of these name "the run record":
  - 046 l.37: "once a brief or packet was delivered, that each brief Syzygy issued… directed its session to work in the copy".
  - 047: "the run record SHALL state, labelled Inferred, that whether a session stayed in the copy is its own report".
- [Observed] The stage rule requires the not-reached form wherever the stage is unreached.
- [Inferred] `brief.json`'s new `copy` field records the fact, not the statement.

**Finding 6 — on a covered run the user-information statement never reaches the operator** (revise)
- [Observed] P4: a covered copy-class `init` with origin `https://bob:hunter2@…` produced:
  - an `init` report whose disclosures do not contain "carried user information";
  - nothing printed on the terminal.
- [Observed] `outcome.output` and `outcome.locatorStatements` are built and never read by `init` or `cli.ts` (grep for consumers).
- [Observed] On recorded runs the line is printed only because `say()` runs before the question.
- [Observed] 046 l.17 says: "Where a remote URL carried user information, the launch output SHALL say so".
- [Inferred] The gap may predate slice D. Slice D rewired `init`'s launch output to `launchDisclosureItems`, so it owns the gap now.

**Finding 7 — briefs fail open when `launch.json` is absent** (revise)
- [Observed] `briefCopyOf` maps `absent` to `copy: null`. A copy-class run whose `launch.json` was removed therefore gets:
  - an inventory brief that names the copy "as the operator gave it at init (operator-declared)", which is false;
  - an authoring brief with no clone line;
  - in both, no instruction not to read the operator's clone.
- [Observed] The file lies within the agent sessions' write reach, and the inventory brief is rendered after the authoring session has run.
- [Observed] 047 says: "Every brief Syzygy issues to an agent session of a copy-class run… SHALL name the copy… and tell the session not to read the operator's clone".
- [Inferred] Fail-closed polarity would refuse, or decide copy-class from the run record itself (for example, a clone path under the state root's copy directory), and leave `absent`-as-legacy to runs the record shows were initialised before the disclosure existed.

**Finding 8 — a no-copy run asking an observation consent says the scope is "held in the copy"** (note)
- [Observed] P5's first, inconsistent fixture showed this: `observationConsentNaming` was satisfied and `observationConsentFor` was not. The run was no-copy, the question offered an observation consent "held in the copy that REQ-polaris-generation-047 makes", and the run's record would carry the `copy` scope.
- [Inferred] It is reachable when the operator's `--identity` differs from the other act's consent identity.
- [Inferred] The wording is fixed by 046 l.21, so this is spec-inherited. Name it to the owner rather than repair it here.

**Finding 9 — the pages' machine form carries stage, class and reached only inside the item id** (note)
- [Observed] `machine.json` disclosure items are `{id, text, label}`. Stage, class and reached are encoded in `launch/<stage>/<class>/<reached>/<id>`.
- [Inferred] This is acceptable machine form, but a structured field would not depend on id parsing.

**Finding 10 — the page's brief-stage statement comes from `launch.json`, not from what each brief said** (note)
- [Observed] `render.ts` calls `briefStageStatement(launch.disclosure.runClass, …)`, ignoring `brief.json`'s recorded `copy`.
- [Inferred] If `launch.json` was absent or different when a brief was issued (Finding 7), the page can say a brief directed its session to the copy when it did not.
