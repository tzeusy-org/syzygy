# R-PR596-SESSION-VISIBILITY-3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 16e93c94049e4c8d66ab639a06129ea09c00efdc

1. **Note.** Round-2 finding 1 is resolved. I checked this in the code, not from the disposition.
   - `census.ts:61`: `case 'denied-path': if (screen.screenBody(entry.path, entry.path) === 'secret-detector-match') secretPath++; else deniedPath.push(entry.path); break;`.
   - [Observed] `screen.ts:130`'s `screenBody` starts with `detectSecrets(detectors, body)`. That is the same compiled `detectors` that `screenPath` uses at `screen.ts:109`. So the extra pass matches exactly the detector test that `denied-path` precedence hides.
   - [Observed] No other census group can name a path that a detector matches:
     - `unknown-extraction-class` is reached only after `detectSecrets` fails (`screen.ts:109-110`).
     - `class-not-consented` comes only from `screenPath === undefined` (`census.ts:64-66`).
   - The wording now matches the code at three places: `census.ts:15-16`, the brief line ("whether or not a denied-path rule also names it: N. Such a path is never named."), and the check note at `census.ts:204`.
   - The literal tests forge `.env.token=abcdefghij` and a `.pem` path that carries a `ghp_` token. They assert neither reaches:
     - the census JSON, the section or the report (`census.test.ts:56-79`);
     - the inventory brief built end to end (`inventory.test.ts`, "never names a path both…");
     - `check --json` stdout (`check.test.ts`, "never names a path both…", `secretDetectorPathMatches: 3`).
   - `.env.<b>x` pins that only a detector match, not any body outcome, withholds a denied name. The run-5 `earlierAttempt` entry honestly records the `!== undefined` mutant that survived before this test was added.

2. **Note.** Round-2 notes 3, 4 and 5 are resolved.
   - **Note 3:**
     - `check.ts:99-104` lists an admitted cited blob whose class `unconsentedClass` withholds, as `{ outcome: 'class-not-consented', missingClass }`.
     - `checkSubject` passes `screen.contentClass, checked.contentClasses` (`check.ts:451`).
     - This mirrors `review.ts:217`, which applies the gate only when `raw !== undefined`, so only to admitted or redacted bodies. Those are exactly check's `'admitted'` blobs.
     - `blob.path === null` cannot happen for an admitted blob. The guard is defensive only.
     - The record is unchanged: `check.test.ts:605-613` asserts `rev-0.json` does not contain `reviewVisibility`.
   - **Note 4:** `census.ts:30-31` and `:130`, and the note at `:204`, now say "UTF-16 code units… before escaping" and "(N more code units)".
   - **Note 5:** `reviewGets(null)` (`census.ts:150-152`) ends with a full stop. `reportNote` (`:195`) starts "A block that cites only withheld files therefore…". The sentence about the caps reads cleanly.

3. **Note.** The run-5 tests cannot tell `checked.contentClasses` apart from `null` at `check.ts:451`.
   - [Observed] I applied `reviewVisibility(citedBlobs, screen.contentClass, null)` in my clone and ran `check.test.ts`, `inventory.test.ts` and `waiting-sessions.test.ts`: "Tests 234 passed (234)". The mutant survived.
   - Cause: every check fixture relies on no per-project statement, so `checked.contentClasses` is already `null`.
   - The recorded mutant `review-visibility-consent-wiring` replaces the argument with `['code-content', 'project-documentation']`, so it is killed. A dropped wiring would still pass.
   - The code is correct. Only the evidence is narrower than "consent wiring" suggests.
   - Fix: add one end-to-end `check` (or `inventory-check`) case whose run relies on a statement. For example, one listing `['code-content']` with a cited `project-documentation` file, or `[]` with a cited `.c` file. Assert the literal `reviewVisibility`, then record the `null` mutant as killed.
   - The census call `withheldCensus(…, checked.contentClasses)` at `check.ts:406` has the same gap. The inventory-brief census is covered by `listsCode`.

4. **Note.** Excluded item `syzygy-mea.5`: the PR does not make it materially worse.
   - The PR does widen it by one place. `reviewVisibility` is now on `inventory-check` and `await --submit` output, where on `main` it was only on `check` output (`up/main:cli.ts:322`). A cited path that is both denied and secret-matching is therefore named in one more field of those outputs.
   - [Observed] Those outputs already name the path. On `main`, the `inventory-check` report spreads its record, which carries `citedBlobs` (`up/main:inventory.ts:363`), and `await` returns that report whole (`waiting-sessions.ts:459`). So no new channel or reader is added.
   - The uncited, tree-wide exposure that round 2 found is closed by finding 1 above.
   - One reading hazard remains. In the same `check` output, the census note says such a path is "never named, whether or not a denied-path rule also names it" (`census.ts:204`), while `reviewVisibility` and `citedBlobs` may name a cited one.
   - Fix: when `syzygy-mea.5` lands, re-check that sentence against the whole report. Until then, optionally scope it: "…never named in this census".

5. **Note.** The brief's sentence at `census.ts:166` now says "`syzygy dossier inventory-check` names every cited file the review will not see". That is broader than what `reviewVisibility` does.
   - A cited span that touches a redacted line of an admitted, `redacted-span` file is withheld from review (`review.ts`, `spanTouchesWithheld`). `reviewVisibility` does not list it, because the blob's outcome is `admitted`.
   - The session can learn this only from `citedBlobs[].redaction.withheldLineRanges` or, for quotations only, from `excludedContent` (`check.ts:696-698`).
   - This sentence comes right after "withholds a cited span that touches a line it redacts", which makes the overreach easy to miss.
   - Fix: narrow it to "names every cited file screening or the class gate withholds whole; a cited span that touches a redacted line shows under `citedBlobs[].redaction.withheldLineRanges`". Or add a `redacted-span` arm to `reviewVisibility` for spans touching withheld lines.

6. **Note.** Readability of the delta. Behaviour is unaffected.
   - `census.ts:17-18`: the doc comment has a broken reflow ("It changes nothing screening admits, withholds" / " * or redacts…").
   - `check.ts:91`: one 230-column doc-comment line among lines wrapped near 140.
   - `census.ts:61`: an `if`/`else` packed into one `case` line.
   - Fix: re-wrap both comments, and put the `denied-path` arm on separate lines.

7. **Note.** Scope, leak safety, Unknown-on-failure (VIS-2) and verification.
   - **Scope.** [Observed] `git diff 8ec03f2d...16e93c94 --stat` touches no `screen.ts`, no `secret-redaction.ts`, no policy JSON and no readiness file. The only governed file is the direction record.
   - **Leak sweep of the delta.**
     - No body, span or matched text is added to any output.
     - The new `class-not-consented` entries name only paths that `screenPath` admits, so no detector matches them.
     - `screenCensus` and `reviewVisibility` stay on the report, not the record (`check.ts:451-452`, tests assert `rev-0.json`).
     - The step log is unchanged.
     - Escaping and caps are unchanged: `censusPath`, `shownPath`, `CENSUS_LISTED_LIMIT`, and `humanLeaf` for human mode.
   - **VIS-2.** It is unchanged. A screen that cannot load, or a tree that cannot be listed, gives `unknown` with a reason (`census.ts:100-110`, `check.ts:404-410`).
   - **Clone.** A fresh `--shared` clone at `16e93c94`, after `npm ci`. I ran nothing in `.worktrees/redis-screening-a`.
     - `git diff --stat 3f94e73f 16e93c94` shows that only the evidence JSON changed, so the code is the same as at `3f94e73f`.
   - **Checks.**
     - `npm run typecheck`: exit 0.
     - `npx vitest run packages/polaris-dossier`: 34 files, 1420 passed, 1 skipped, 0 failed. That is 5 more tests than at round 2, matching the 5 added.
   - **Run-5 record.**
     - All 6 subject sha256 values match `git show 3f94e73f:<path>`.
     - All 7 mutants store `old` and `new`, and each `old` occurs exactly once at `3f94e73f`.
     - The record's denominator is 7 of 7 killed.
   - **Spot checks** (applied to the recorded files, run with the recorded tests, then reverted, with the clean tree confirmed):
     - `census-denied-secret-detector-only`: "1 failed | 135 passed (136)", the same as recorded.
     - `review-visibility-consent-wiring`: "1 failed | 233 passed (234)", the same as recorded.
   - I read no body of Redis or any other observed repository, started no dossier run and made no provider call.