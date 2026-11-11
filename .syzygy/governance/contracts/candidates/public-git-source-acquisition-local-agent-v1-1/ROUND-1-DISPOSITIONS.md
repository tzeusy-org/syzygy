# Review round 1 dispositions — public-git-source-acquisition-local-agent v1.1

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md

> **Candidate — binds nothing.** The raw (`REVISE`, over `5c939150`, three
> revise findings and seven notes) is not edited. The three revise findings
> are repaired at their root, which changes the subject's bytes and retires
> the round-1 review (rule 10); round 2 reviews the repaired bytes
> (`REVIEW-BRIEF.md`). The notes are taken where the raw asked for a cheap
> change, and the notes for the owner are carried to `OWNER-SIGNOFF.md`,
> "Before you sign". The package stays bound to PR #812 at `de9c1ba8`.

1. **Finding 1** (revise): "no-copy run" and "copy-class run" were defined
   only by #812, so if this version were signed without v1.2 the v1.0
   guarantees it keeps would hang on undefined terms, the redis run's
   clone-form reads would fall outside the closed list, and the E3 list
   admitted reads #812's D9 lists as "The reads v1.2 adds in the same
   class".
   **Repaired.**
   - `fetch` now opens "none, save in a copy-class run" and defines both
     classes in the entry's own words: a copy-class run is one "a version
     in force of REQ-polaris-generation-047 requires to run on a copy of
     the operator's clone; every other run is a no-copy run, and while no
     version in force requires a copy every run is a no-copy run". The
     other moved fields point back to it with "(fetch)".
   - The no-copy form-check sentence now reads "In every no-copy run
     (fetch), launch-consented or not", so it admits the redis run's
     clone-form reads whether or not v1.2 is signed.
   - The five launch reads are bounded to "only those the launch-consent
     requirements in force name", so the reads only v1.2 asks for are not
     admitted while v1.2 is unsigned.
   - `SEMANTIC-DELTA.md`: the terms section, E2, E3 (now says exactly what
     the list admits beyond v1.0's reading, in place of "not a widening"),
     E4 and "Dependency on launch-consent v1.2" are rewritten to match.
     The builder checks the definition (selftest "a fetch whose run classes
     rest on #812's words alone refused").
2. **Finding 2** (revise): the recorder would write into the v1.1 record
   the fixed lines "Scope: ... nothing wider", "supersedes nothing" and
   "widens no egress, write or execution", which are false for v1.1.
   **Repaired.** `record_versioned_signoff.py` gains four `Package` fields
   (`record_scope`, `record_supersession`, `record_does_not`,
   `record_aggregate_scope`), `None` by default so that every record already
   written regenerates byte for byte (the battery's v1.0 line passes). Only
   the `@1.1` entry sets them: its scope names fetch, tags and
   state-directory writes; it supersedes version 1.0, whose record stays
   that version's record (consistent with v1.0's `--check` printing
   "superseded by a later version"); and it says that, against v1.0, it
   widens local execution and a local write in a copy-class run alone, and
   no network egress or write to an observed or external system. Two
   selftests pin the override and the real `@1.1` texts. The gate's record
   template in `package-reader.ts` spells the same fixed lines;
   `IMPACT-LEDGER.md` item 1 now says a v1.1 form needs a template that
   renders the v1.1 lines, in the signing commit.
3. **Finding 3** (revise): once v1.1 is recorded, the recorder's
   `--check --version 1.0` checked the v1.0 record's SHA-256 line only
   against itself (probe B: 64 zeros passed). **Repaired at the root.** A
   new `Package.replaced_bytes` names the bytes the later version takes as
   its base; for a replaced version `--check` refuses unless the record's
   line is their SHA-256, and fails closed when a replaced version names no
   such bytes. The v1.0 entry names the v1.1 builder's `BASE`. A selftest
   repeats probe B and now fails it. `IMPACT-LEDGER.md` item 2 also makes
   the v1.1 builder's `--check` a required battery line, and says why it is
   still needed.
4. **Finding 4** (note, for the owner): `subject.observedRepositories` and
   `authorizationModeDerivation` say nothing is read before consent, while
   the entry now lists pre-consent launch reads and a copy-class run adds a
   pre-consent object store. **Carried to the owner**: `OWNER-SIGNOFF.md`,
   "Before you sign", item 4, and `SEMANTIC-DELTA.md`, E6. The fields are
   not moved: moving them widens this package's scope, which is the
   owner's call.
5. **Finding 5** (note): the builder's predicates checked that phrases were
   present, so coherent widenings M1 to M5 passed. **Taken.** The builder
   now holds each moved declaration to its exact text, clause by clause
   (`FETCH_CLAUSES`, `RA_TAIL_CLAUSES`, `TAGS_TAIL_CLAUSES`, `SDW_CLAUSES`,
   `COPY_STEP_CLAUSES`), and names the first clause a departure touches, or
   "added text"; the proposed bytes are generated from the same clauses
   (`exact_entry`). The selftest carries M1 to M5 by name, plus an
   appended clause and a dropped bound, and the names that overstated now
   say what they catch ("a sixth launch read, by its literal '(6)'", "an
   unbounded copy directory, by its missing bound"). The binding guard is
   still the review over the digest; the builder adds depth.
6. **Finding 6** (note, editorial): `stateDirectoryWrites` said Syzygy
   writes the copy's directory "only through the Git processes fetch
   names", but Syzygy itself creates and removes it. **Taken.** It now says
   "Syzygy itself creates it, which starts the copy step, removes it with
   its contents where the run ends before its brief, and otherwise keeps it
   ..., and writes its contents only through the Git processes fetch
   names".
7. **Finding 7** (note): the ledger's sweep missed
   `gate-sources.ts:511` and `real-tree.test.ts:43-44`, which reach the
   v1.0 form through the constant. **Taken.** The ledger re-swept for the
   constant `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` (33 occurrences on 29
   lines in 10 tracked files under `packages/`, `apps/` and `scripts/`)
   and now names both, plus `gate-acts.test.ts:581/596/613` and the check
   key in `scripts/measure_consent_gate_recognition.mjs:142`, as items that
   must change in the signing commit (new item 1a).
8. **Finding 8** (note, for the owner): Q1, `tags` should move as drafted;
   Q2, the version strings need not move. **Carried to the owner**:
   `OWNER-SIGNOFF.md`, "Before you sign", item 2. No change.
9. **Finding 9** (note, for the owner): Q3, the `git-object-database`
   identity scheme is literally false for a copy-class run; moving it
   changes an identity the v1.0 builder pins. **Carried to the owner**:
   `OWNER-SIGNOFF.md`, "Before you sign", item 3, and `SEMANTIC-DELTA.md`,
   E6. The scheme is not moved.
10. **Finding 10** (note): the Scope A option is honest and exactness
    otherwise holds; two items are narrower than #812 ("no other process
    is started"; reftable refused only in `fetch`). **No action.** Both
    narrowings are kept: an entry may admit less than the spec requires,
    and an implementation that refuses reftable in every launch-consented
    run stays within it.
