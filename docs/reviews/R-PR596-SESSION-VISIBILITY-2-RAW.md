# R-PR596-SESSION-VISIBILITY-2
Verdict: REVISE
Reviewed commit: 7e2e1c29ba58b785b9cc738aa8433aa372febf5a

1. **Revise.** The census names a path that a secret detector matches whenever a denied-path rule also covers that path. This breaks "Secret-path matches are counted, never named". The defect dates from the original census commit (`43b63728`), not from the round-1 repairs, and round 1 did not report it.
   - `screen.ts:108-109`: `screenPath` checks denied-path rules before the secret detectors: `deniedPathReason(repositoryPath, denied) !== undefined ? 'denied-path' : detectSecrets(detectors, repositoryPath) !== undefined ? 'secret-detector-match' : …`.
   - `census.ts:58-59` puts every `denied-path` outcome into the named list: `case 'denied-path': deniedPath.push(entry.path); break; case 'secret-detector-match': secretPath++; break;`. A token-bearing path under a denied rule is therefore written out by name, in two places:
     - the inventory brief (`census.ts:171-172`), a file stored in the session directory;
     - `check`'s `screenCensus` (`census.ts:135`), every listed path, whether cited or not.
   - The census's own promises are then false: "A path a secret detector matches is counted and never named" (`census.ts:15`), and in the brief, "such a path is never named" (`census.ts:175`).
   - [Observed] I ran a scratch test in my clone, with the live policy's detectors and `sourceAdmission`:
     - `.env.token=SECRETVALUE99` and `keys/ghp_ABCDEFGHIJKLMNOPQRSTUVWX.pem` both gave `screenPath` = `denied-path`.
     - `withheldCensus` gave `secretPath 0`.
     - Both `censusSection` and `JSON.stringify(screenCensusReport(...))` contained `SECRETVALUE99` and `ghp_ABCD`.
     - The first path matches the denied prefix `.env.` and the `credential-assignment` detector. The second matches the suffix `.pem` and `known-token-formats`.
   - The existing test cannot catch this. `census.test.ts:49-53` checks only `src/token=abcdefghij.c`, a path that no denied rule covers.
   - The same precedence already names a *cited* denied-and-secret path in the stored `citedBlobs` (`check.ts:171`, `pathSecret` requires `screenPath(cited) === 'secret-detector-match'`) and in `reviewVisibility`. That behaviour predates this PR. The census widens it to every uncited path in the tree.
   - Fix:
     - In `withheldCensus`, test each `denied-path` entry against the detectors as well. `screen.screenBody(entry.path, entry.path) === 'secret-detector-match'` works without touching `screen.ts`, because `screenBody` runs the detectors first.
     - Count such a path in `secretPath`, or in a separate "denied, name withheld" count, and never push it to `deniedPath`.
     - Fix the wording at `census.ts:175` and in the note at `:201` to match.
     - Add a literal test with a denied-and-secret path such as `.env.token=abcdefghij`, assert it is absent from both outputs, and record a rule-6 mutant for it.
     - Decide separately, and say in the PR, whether `check.ts:171` should get the same treatment. Changing it changes the stored record.

2. **Note.** Round-1 finding 1 is resolved. I verified it in the code, not from the disposition text.
   - `check.ts:432-433`: `checkSubject` attaches `reviewVisibility` to the report for every caller, so the `await --submit` path gets it too (`waiting-sessions.ts:455-462`, `check: result.report`).
   - `cli.ts:322-323` no longer adds it separately.
   - The stored record is unchanged: `...record` is written at `check.ts:428` before the report spread.
   - The new test (`waiting-sessions.test.ts:520-542`) uses literal `withheld` and `note` values. It asserts `rev-0.json` does not contain `reviewVisibility`, and that a clean inventory gives no such property.
   - Round-1 notes 2–8 are also resolved in the code:
     - Note 2, per-group cap: `census.ts:131-139`.
     - Note 3, human-mode escaping: `cli.ts:484-500`, `humanLeaf`. Multi-line text the operator copies is unaffected: `inventory-brief` prints `brief` outside `renderHuman` (`cli.ts:370-371`), and the session prompts are single-line.
     - Note 4, per-path cap: `census.ts:124-128`, `shownPath`.
     - Note 5, wording chosen by `consented === null`: `census.ts:147-152`. This matches `class-gate.ts:32-35`.
     - Note 6, `redactedExtent`: `render.ts:373-375`. A fully withheld body is possible: `redactBody` can withhold every line and still return `redacted`, and `retainedLines.length` equals the line count.
     - Note 7, the population sentence: `class-gate.ts:17-19`.
     - Note 8, readability: the notes now start in uppercase and "Otherwise:" is gone; the unused arms are removed; one `BLOB_MODES` lives at `git-object-reader.ts:80`, and a `'100755'` sweep over `packages/polaris-dossier/src` and `apps/syzygy/src` finds no other blob-mode set; the `never` arm is at `census.ts:68`.

3. **Note.** `reviewVisibility` leaves out cited files that the class gate withholds from review.
   - `check.ts:93`: `citedBlobs.flatMap((blob) => (blob.outcome === 'admitted' ? [] : …))`. A cited file that screening admits but the class gate withholds (`review.ts:217`, `unconsentedClass(screen.contentClass(span.path), opened.contentClasses)`) has the outcome `admitted`, so it is not listed.
   - Its doc comment says "The cited files the review session will not see" (`check.ts:86`). For a governed run whose statement leaves out a class, an inventory row citing only such files still blocks readiness, and `inventory-check` says nothing about it.
   - The census does list these files under `class-not-consented`, so the session can find out, but only from the path-level list. The gap predates this PR (`syzygy-olmr`), but it falls inside direction item 1's "review-visibility warning".
   - Fix: pass `checked.contentClasses` and `screen.contentClass` into `reviewVisibility`, and add class-gated cited files with outcome `class-not-consented`. Or narrow the doc comment and the brief's sentence at `census.ts:163` to "screening withholds".

4. **Note.** The per-path cap is stated as "characters", but it counts something else.
   - `shownPath` (`census.ts:126-127`) cuts at 512 UTF-16 code units *before* escaping. The note (`census.ts:201`) says "at most 512 characters of each".
   - A path made of C0 controls (the reader accepts them) grows 6× under `JSON.stringify`, to about 3,072 written characters.
   - A cut can split a surrogate pair. The half pair is then written as `\udXXX`, which is still inert.
   - "(N more characters)" also counts code units.
   - The output is still bounded, at most about 750 × 3.1 KB, so this is a wording issue and not a safety one.
   - Fix: say "512 UTF-16 code units of each path, before escaping", or apply the cap after `censusPath`.

5. **Note.** The note's wording when no consent statement applies (the null branch) is hard to read. `reviewGets(null)` (`census.ts:148`) ends with a "…, so …" clause, and `reportNote` (`census.ts:192`) adds another "so" after it. The check note becomes "…that file is code-content: the run relies on no per-project statement, so no consent record lists any other class, so a block that cites only withheld files cannot be confirmed…" (pinned verbatim in `check.test.ts`). Also, "at most 250 are listed per group, and at most 512 characters of each, and the rest counted" (`census.ts:201`) chains three "and"s.
   - Fix: end the `reviewGets` clause with a full stop in `reportNote` and start a new sentence, for example "A block that cites only withheld files therefore cannot be confirmed…". Rephrase the cap sentence along the lines of note 4.

6. **Note.** Scope is held, as far as I could see.
   - `git diff 85c54814...7e2e1c29 --name-only` shows no `screen.ts`, `secret-redaction.ts`, policy JSON or readiness file. The only governed file is the direction record.
   - Detector ids come out in policy order: `matcher.all` iterates `each` in detector order, and `redactBody` de-duplicates them in the order found.
   - Leak paths I checked other than finding 1:
     - The step log (`log({ outcome, revision, findings })`) carries no census.
     - The `redaction` provenance holds only detector ids and line numbers.
     - The render's `redactionDetails` adds no matched text.
     - The brief, the check output and the await output carry no body or span.
   - VIS-2: the census is `unknown` with a reason when the screen cannot load (`census.ts:99`) or the tree cannot be listed (`census.ts:104`, `check.ts:396-398`). That case is tested (`check.test.ts`, "says the census is Unknown…").
   - Other errors, including the `census.ts:67-68` invariant guards, propagate and refuse the whole step. That is defensible for an impossible outcome.

7. **Note.** Verification, run in a fresh `--shared` clone at `7e2e1c29` after `npm ci`. I ran nothing in the shared worktree.
   - `npm run typecheck`: exit 0.
   - `npx vitest run packages/polaris-dossier`: 34 files, 1415 passed, 1 skipped, 0 failed. This matches the PR body.
   - `git diff --stat 2423e9e9 7e2e1c29` changes only the evidence JSON, so the code is the same as at `2423e9e9`.
   - Run-4 record (`docs/evidence/syzygy-mea-3-session-visibility-mutation-2026-11-03.json`):
     - Commit `2423e9e97d201fb1bce6e2eca3dddbdd624e4253`. All 10 subject sha256 values match `git show 2423e9e9:<path>`.
     - All 13 mutants store `old` and `new`, and every `old` occurs exactly once in its file at that commit.
     - The denominator is 13/13 killed.
   - Spot checks, each applied in my clone and run with the record's named tests:
     - `subject-report-carries-review-visibility`: 3 failed, 227 passed (230). This matches the record. The failures are in check, inventory and the await-submit test.
     - `render-every-line-withheld`: 1 failed, 43 passed (44). This matches the record.
   - The new tests use literal expectations, including the full `screenCensus` object and its note, the `redaction` objects, and the `redactedExtent`, `redactionDetails` and `renderHuman` strings.
   - No run-4 mutant covers finding 1 above, since that case has no test.
   - I read no body of Redis or any other observed repository, started no dossier run and made no provider call. The scratch probe for finding 1 used synthetic path strings only and has been deleted.