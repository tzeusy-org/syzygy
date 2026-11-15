# Review round 4 dispositions — public-git-source-acquisition-local-agent v1.1

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-4-RAW.md

> **Candidate — binds nothing.** The raw (`REVISE`, over `bb89b8cc`, one
> revise finding and three notes) is not edited. This repair changes no
> byte of the subject: the proposed entry, its patch and
> `PROPOSED-SUBJECTS.json` are as round 4 read them. It changes the
> package's prose (`SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`,
> `OWNER-SIGNOFF.md`, `REVIEW-BRIEF.md`), which retires the round-4 review
> of those bytes (rule 10).
>
> **These bytes are an unreviewed repair, and no round 5 is dispatched.**
> The same class of finding (reads the code makes against reads the entry
> names) came up in all four rounds, and PR #812, to which this package
> is bound at `de9c1ba8`, is stopped awaiting the owner. The owner orders
> a round 5 alongside #812's round 11 if they want one; `REVIEW-BRIEF.md`
> is set up for it.

1. **Finding 1** (revise): the launch reads, in full, the object a
   `--revision` or trunk reference names before knowing it is a commit;
   for a tag or a blob that read is outside the entry. Round 3's row 15
   mapped it to the object-read words, item 1b omitted it, and the owner
   page said "Syzygy still never reads a tag". **Repaired by the
   reviewer's second option**, on the coordinator's direction:
   - IMPACT-LEDGER gains item 1c. It states the read
     (`launch-revision.ts:100` → `launch.ts:160` → `git-object-reader.ts`
     `verified`/`raw`, `:221`, `:437-443`) and says plainly that it is a
     gap against v1.0's `tags` ("never read") and the installed REQ-046,
     present today under v1.0 in force, which v1.1 does not create and
     does not close, and which item 1b does not cover. The code repair is
     filed for its own repair as `syzygy-pdja.30`. The table gains a row
     for it.
   - SEMANTIC-DELTA E3 gains a paragraph saying the same, and the
     "Dependency on launch-consent v1.2" bullet names the third read.
   - The owner page's "Before you sign" item 2 drops "Syzygy still never
     reads a tag" and says the code does not keep `tags` "never read"
     today, under v1.0 or v1.1, citing `syzygy-pdja.30`. Its "What changes"
     bullet names the third read.
   - The reviewer's remark for the owner, that #812's "Syzygy tells these
     cases apart without reading the object itself" is hard to meet in a
     no-copy run where, in #812's words, "Syzygy reads it as a commit
     object" (the reviewer's paraphrase was "read it as a commit object"), is
     carried into "Before you sign" item 2 as #812's to settle, not this
     package's.
   - **Row 15, corrected here** (the round-3 file is not edited):

     | # | Where | Read | Clause |
     |---|---|---|---|
     | 15 | `launch-revision.ts:100` → `launch.ts:160` (`isCommit`) → `git-object-reader.ts:221`, `:437-443` (`verified`, `raw`) | the candidate object's whole body, read and inflated before its type is compared; then, for a commit, its root tree | for a commit: the object-read words. **For a non-commit candidate (an annotated tag, a blob): outside the entry**, against `tags` "never read" and REQ-046; a pre-existing gap, item 1c, `syzygy-pdja.30` |

     The round-3 "Result" ("Two reads lie outside the entry") becomes
     three: row 9's other refs' contents and row 14's full-identifier
     listing (item 1b), and row 15 for a non-commit candidate (item 1c).

2. **Finding 2** (note, for the owner): item 1b said the narrowing lands
   in the same commit as the sign-off and also with the v1.2
   implementation, which #812 places "After sign-off only, under a
   separate implementation direction". **Taken.** The ledger (item 1b,
   "When it lands"), E3's closing paragraph, the Dependency bullet and the
   owner page ("Before you sign" item 1, "When the narrowing lands") now
   say one thing: the narrowing is implementation, under the separate
   implementation direction #812 names; it is not in the sign-off commit;
   until it lands the code reads outside both entries.
   - The coordinator's recommended last clause, "no launch-consented run is
     made until it lands", was checked against the code at `bb89b8cc` and
     is **not true unconditionally** [Inferred, from the code]:
     - a copy-class run: none can be made; no code makes a copy
       (`implementationCoverage.copyStep`);
     - a launch-consented no-copy run: one can be made as soon as the gate
       code (IMPACT-LEDGER item 1) accepts v1.1. `init.ts:117-123` checks
       only the registry entry's sign-off and the screening policy before
       `launchConsent`, and the launch code is unnarrowed, so that run
       reads outside the entry (rows 9 and 14, and row 15 for a non-commit
       candidate);
     - while item 1 has not landed: none; a recorded v1.1 makes the v1.0
       form refuse ([Observed] `package-reader.ts:870-874`), so every
       local-agent run refuses, the redis run included.
   - So the clause holds only if item 1 lands with the narrowing, not with
     the sign-off. The ledger and the owner page state that answer,
     labelled, and put it to the owner as a choice: move the gate at
     sign-off and accept out-of-entry reads until the implementation lands,
     or hold it and accept that every local-agent run refuses until then.
     In the second case the real-tree pins of item 1a must change in the
     sign-off commit to expect the refusal.

3. **Finding 3** (note): item 1a was short, and its sweep total named 7
   files. **Taken.**
   - The sweep was re-derived by script over the 819 tracked files under
     `packages/`, `apps/` and `scripts/`: 22 lines in 6 files. The ledger
     now says 6 and records the correction.
   - A fourth sweep, for `render_record(pkg, '1.0'` and
     `record_rel(pkg, '1.0'`, gives 4 lines in 2 files:
     `recorder-fixtures.testkit.ts:71`, `:74` and
     `recorder-fixtures.testkit.test.ts:53`, `:56`. Item 1a names them,
     with `start-gates.test.ts:118-129` (`signoffOver`), which writes the
     v1.0 rendering at the form's path. The table's `start-gates.test.ts`
     row now spans `:114-129` and says it must change with item 1; the
     "[Inferred] follows item 1" wording is gone.

4. **Finding 4** (note, editorial): residual inaccuracies. **Taken.**
   - E3's quotation of the closed list now reads "besides the object
     reads, Syzygy reads of the operator's clone and the copy only the
     following", the subject's words.
   - **"A run that is not launch-consented makes rows 18 to 23 only" is
     corrected here**: [Observed] `init.ts:110-116` makes rows 1 to 4
     before the run class is decided, whenever `--url` is given without
     `--revision`; a run whose HEAD another act's consent names is such a
     run, so it makes rows 1 to 4 and then rows 18 to 23. The entry admits
     rows 1 to 4 by its HEAD-check sentence, so no read is outside it; only
     the claim was short.
   - **Two real-path reads are added here**, rows 11a and 19a:

     | # | Where | Read | Clause |
     |---|---|---|---|
     | 11a | `init.ts:102` (`stateRootViolation`) → `state-directory.ts:83-93` | real path of the clone (and of the state root) | (1) [Inferred], as rows 11 and 19 |
     | 19a | `init.ts:212` (`createRunDirectory`) → `state-directory.ts:111` → `:83-93` | real path of the clone, again | (1) [Inferred], as rows 11 and 19 |

   - Item 1b's "skipped for a full identifier" now judges "full" by the
     clone's hash: 40 hex digits in a SHA-1 clone, 64 in a SHA-256 clone,
     where a 40-digit `--revision` is an abbreviation and read (5) admits
     its listing.

**What is left for the owner.** The gate timing (Finding 2), the
pre-existing type-test gap and its bead (Finding 1), and #812's "without
reading the object itself" sentence, which is #812's to settle. Whether to
order a round 5 alongside #812's round 11.
