# R-PR596-SESSION-VISIBILITY-1
Verdict: REVISE
Reviewed commit: 034b76ecd1fba1459c4c2ae8b2f4f4278e3af6ea

1. **Revise.** The inventory session in the waiting / launched flow never receives `reviewVisibility`, but its brief says it will.
   - `packages/polaris-dossier/src/cli.ts:383-384` attaches `reviewVisibility` only inside the CLI `inventory-check` command. `checkInventory` (`inventory.ts:382-384`) returns `checkSubject`'s report without it.
   - The waiting inventory session submits through `await --submit`. That path, `waiting-sessions.ts:455-462`, returns `check: result.report` straight from `checkInventory`, so it carries no `reviewVisibility`. [Observed, code read at 034b76ec]
   - This is the path used by `startSessions` / `syzygy polaris`, the one-shot flow the owner wants for Redis. The `await` hand-over text (`waiting-sessions.ts:494`) tells the session that Syzygy "runs the same check".
   - Yet the brief the session reads (`census.ts:119`, `const after = …`) says: "`syzygy dossier ${checkCommand}` names every cited file screening withholds, under `reviewVisibility`". For that session the sentence is false, and direction item 1's "review-visibility warning on `inventory-check`" never reaches it.
   - No test covers `await --submit`. The `inventory.test.ts` case only drives the CLI command.
   - Fix: compute `reviewVisibility` inside `checkInventory`, or in one shared wrapper that both `cli.ts` and `waiting-sessions.ts` call, and keep it out of the stored record. Add an `await --submit --stdin` test with a withheld cited file that asserts `check.reviewVisibility` against a literal. Record a rule-6 mutant for it.

2. **Note.** The check-output census has no cap. The brief's census does.
   - `census.ts:154-161`: `screenCensusReport` puts every withheld path into `withheld`, while the brief caps each group at `CENSUS_LISTED_LIMIT` (250).
   - The report is printed to the authoring agent on every check. On a large tree (Redis has many `unknown-extraction-class` paths) that repeats a long list into the agent's context each round.
   - Fix: apply the same per-group cap with a counted remainder, and state the cap in `note`. The live worktree has an uncommitted `census.ts` edit that appears to do this; it is not part of 034b76ec.

3. **Note.** Paths from the clone reach human-mode `check` output unescaped.
   - The brief escapes paths (`censusPath`, `census.ts:101`). But `authorPrompt` (`polaris.ts:319`) tells the author to run `syzygy dossier check` without `--json`, and `renderHuman` (`cli.ts:495`) prints `String(value)` raw.
   - A tracked path containing `\n` (the reader accepts one: `git-object-reader.ts` refuses only empty, `/`, `.`/`..`, `.git` and non-UTF-8 names) can therefore start a line of its own, such as `next: …`, in the author's output.
   - Before this PR only paths the author had cited reached that output. Now every withheld path in the tree does.
   - The author reads the clone anyway, so the exposure is small. Still, the `census.ts` header promises inertness for the brief only.
   - Fix: write `withheld[].path` through `censusPath` in human mode, or make `renderHuman` JSON-escape string leaves.

4. **Note.** Path length is not capped (`census.ts:105-108`, `listed`).
   - The number of names per group is capped, but a single path is bounded only by 4,096 segments (`MAX_TREE_DEPTH`) and the size of the tree objects.
   - A crafted clone could make the inventory brief arbitrarily large while staying inert.
   - Fix: cap each listed path, for example at 512 code units with an "(N more characters)" suffix, or cap the section's total bytes and count the overflow.

5. **Note.** The section's wording is wrong for a non-governed run (`census.ts:116`, `:131`).
   - It says the review gets a span "only when … the per-project statement the run relies on lists that file's class", and it labels the group "admitted by screening under a class the per-project statement does not list".
   - With `consented === null` there is no statement: `code-content` still reaches the review and `project-documentation` is withheld (`class-gate.ts`, `unconsentedClass`). The sentence describes a statement that does not exist.
   - Fix: pick the wording from `consented === null`, as `unconsentedText` already does.

6. **Note.** The "partially retained" wording can be wrong (`render.ts:472`).
   - `redactBody` (`secret-redaction.ts`) can return `redacted` with every line withheld, if the emptied body no longer matches a detector.
   - The row would then read "partially retained … 5 of its 5 line(s) withheld".
   - Fix: say "retained with every line withheld" when the two counts are equal, and add a literal test for it.

7. **Note.** A sweep comment is now stale (rule 9). `class-gate.ts:13` says "The population, swept over every consumer of the screen's `screenPath` and `screenBody` in this package: …".
   - `census.ts` and the new census block in `check.ts` (around lines 389-396) now call `screenPath` / `contentClass` and send the results, as paths, to agent sessions. The list does not name them.
   - Fix: add `census.ts` (paths only, no spans) to that population sentence.

8. **Note.** Readability:
   - **Lowercase join:** `REPORT_NOTE` (`census.ts:149`) starts in lowercase and is joined after a full stop, so the output reads "…for the files you cite. the review session is given…" (it appears verbatim in `check.test.ts`).
   - **"Otherwise:":** the Unknown note (`census.ts:152`) says "Unknown at this check. Otherwise: …", which reads oddly.
   - **Unused arms:** after ruling (b), the `'check'` and `'block'` arms of `censusSection` (`census.ts:112`) are used only by tests.
   - **Third copy:** `BLOB_MODES` (`census.ts:28`) is a third copy of the set in `check.ts:49` and `review.ts:60`.
   - **No exhaustiveness check:** `withheldCensus` silently drops any `screenPath` outcome it does not know.
   - Fix: capitalise and rephrase the two notes, drop the unused arms or wire them, export one `BLOB_MODES`, and add an exhaustive `never` check.

9. **Note.** On the REQ-034 substitution, I judge it lawful, and the scope criteria are met.
   - **Authoring brief:** untouched, which respects "The brief SHALL carry no project content beyond the repository identity and the pinned revision".
   - **`screenCensus`:** it is on `check`'s report, not the brief, and not in the stored record (killed mutant `check-census-not-in-record`). No clause of REQ-034 or REQ-035 forbids path-level advice on check output.
   - **Inventory brief:** REQ-035 requires only that it "SHALL NOT be given the draft".
   - **Disclosure:** the deviation is disclosed in the PR body. The direction record still says "in the authoring and inventory briefs", correctly unedited, so the owner should be shown the ruling.
   - **Scope:**
     - `screen.ts`, `secret-redaction.ts` and the policy JSON have no diff.
     - No readiness code changed.
     - The only governed file changed is the direction record.
     - The new `redaction` provenance (detector ids, withheld line ranges) matches the v4 policy's `secretRedaction.provenance`: "the id of each detector that matched, and the numbers of the withheld lines".
     - Detector ids come out in policy order (`matcher.all` iterates detectors in order).

10. **Note.** Verification, all run in a fresh `--shared` clone checked out at 034b76ec after `npm ci`:
    - **Worktree drift:** the shared worktree's HEAD was 034b76ec, but another session had an uncommitted `census.ts` edit there during this review. I reviewed through `git show` / `git diff` and ran nothing in that worktree.
    - **Typecheck:** `npm run typecheck` exited 0.
    - **Vitest:** `npx vitest run packages/polaris-dossier` gave 34 files, 1407 passed, 1 skipped, 0 failed. An earlier attempt in a `git archive` copy failed 5 times (all of `screen.test.ts`, which shells out to `git ls-files`, plus 4 tests in `run-evidence.test.ts`). The cause was the copy having no `.git`, not the PR. I did not reproduce the author's under-load failures.
    - **Rule-6 records:**
      - Both records name ancestor commits: `43b63728` (17 mutants) and `6570912d` (8 mutants).
      - All 14 subject sha256 values match `git show <commit>:<path>`.
      - Every `old` fragment occurs exactly once at its commit.
    - **Mutant spot-check:** applied at 034b76ec and all killed.
      - `inventory-check-review-visibility`: 1 failed, 46 passed (47), matching the record.
      - `check-census-not-in-record`: 1 failed, 64 passed (65), matching the record.
      - `census-path-backtick-escape`: 1 failed, 13 passed (14). The record says 12 tests because it was taken at an earlier commit.