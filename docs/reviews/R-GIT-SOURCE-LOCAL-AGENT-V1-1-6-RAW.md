Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-6
Reviewed commit: a0017b579ca3ee4174b03ff0159ac609aeae6803
Manifest SHA-256: 384f7b603d49ab953a71deb526cdf43e7e65f6e9a7160c3893500b6bd6385f00
Verdict: CONFIRM WITH EXCEPTIONS

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

This review is scoped, as the brief's round-6 mode sets. It covers the changed blocks S1 to S4, P1 to P8, C1, R1, E1 and E2 against round 5's raw, the owner's ruling "Allow and disclose" and #812 at `155f9c49`.

## Inputs and commands

- [Observed] Subject digest.
  - I computed it with `sha256sum` in a detached worktree of the reviewed commit.
  - It equals `proposed_sha256` in `PROPOSED-SUBJECTS.json` and the builder's `--digests` line.
- [Observed] #812 at `155f9c49`.
  - I applied `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` to the v1.1 spec of that commit in a scratch repository.
  - The pre-apply digest is `95172020…` and the post-apply digest is `21caa658…`. Both equal that package's `PROPOSED-SUBJECTS.json`.
  - I did the same at `054a4f11`. The post-apply digest is `4c8b2772…`, which equals that commit's `PROPOSED-SUBJECTS.json`.
- [Observed] Every command in the brief exited 0 at the reviewed commit.
  - v1.1 builder `--check`: "unapplied, verifies".
  - v1.1 builder `--selftest`: 56 of 56 predicates held.
  - v1.1 builder `--digests`: `917aecc7…` base, `384f7b60…` subject, `b7653b06…` patch.
  - v1.0 builder `--check`: "applied, verifies". v1.0 builder `--selftest`: 37 of 37.
  - Recorder `--selftest`: 179 fixtures, 0 failing.
  - Recorder `--check … --version 1.0`: the record regenerates exactly.
  - `check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
  - Campaign partition `--check`: denominator 830, unmatched 0.
- [Observed] Rule 6 re-run.
  - I re-applied each of E2's 7 mutants (`old` → `new`) in a second scratch worktree of the reviewed commit. Each `old` occurs exactly once.
  - Each mutant made the builder's `--check` exit 1, and each file was restored.
  - The scratch worktree ended clean.

## Decision items

1. **S1 to S4: exactness and byte-identity.**
   - [Observed] Byte-identity.
     - A structural JSON diff of the subject at `135dac73` against the reviewed commit changes exactly three paths: `typedAuthority/fetch`, `typedAuthority/readAuthority` and `typedAuthority/stateDirectoryWrites`.
     - Within them, a sentence-level diff shows only the S1 to S4 hunks. Every other clause is byte-identical. The builder's `--check` agrees.
   - [Observed] S1 and S2, the placement.
     - `fetch` and `stateDirectoryWrites` carry #812's REQ-047 placement word for word: "never inside any working tree of the governance home's repository, its linked worktrees included, nor inside its Git directory or common Git directory, and never inside the operator's clone's working tree, Git directory or common Git directory, or any working tree of its repository, its linked worktrees included".
     - `fetch` carries the refusal "before its copy step starts". It leaves out #812's "naming the reason", which narrows a duty and widens no authority.
   - [Observed] S1, the object-format exception.
     - `fetch` carries "except that an object format Git does not support fails the copy's init, which refuses as every failure of a Git process for the copy does".
     - #812 says "fails the copy's `init`, and the run is refused as every failure of a Git process for the copy is refused below". The entry's wording is no wider.
   - [Observed] S3, the kept copy. "or, where that removal fails, keeps it, the launch output naming its location and the removal's failure" is a subset of #812's kept-copy sentence and adds no write.
   - [Observed] S4, reads (1) and (3).
     - Read (1) adds "the files of its common Git directory that locate its linked worktrees".
     - Read (3) adds "and, to locate its repository's working trees, core.bare and core.worktree". Both match #812's list items 1 and 3.
     - Under v1.1 alone, the bound "only what the launch-consent requirements in force name" keeps both reads out.
   - [Observed] The builder's `FETCH_TERMS`, `FETCH_CLAUSES`, `RA_TAIL_CLAUSES` and `SDW_CLAUSES` match the subject. Selftest mutant F5 M1 re-targets the new read (3) text.
2. **The disclosure (P1, P2, P4 to P7).**
   - [Observed] "Copy-class" is kept apart from "makes a copy" in all four places: the ledger's first section, E3 ("The disclosure, as ruled"), the Dependency bullet "Both signed, v1.2's copy step not yet implemented", and the owner page bullet "Copy-class runs without a copy".
   - [Observed] All four state that every run v1.2 makes copy-class is made by today's code without a copy, and reads the operator's clone's commit, trees, form and blobs outside the entry.
   - [Observed] All four say the window ends with v1.2's implementation, "not with items 1b and 1c".
   - [Observed] The ruling is recorded as "Allow and disclose", dated 2026-11-10, with its provenance labelled.
   - [Observed] I re-derived the code path.
     - `launch.ts:161-168`: `isCommit` calls `storedType()`, then `tree()` for a commit only.
     - `launch.ts:176-180`: `commitHead` and the tree listing on `snapshot.gitDir`, before the answer.
     - `init.ts:165-187`: `resolveCloneHead`, `cloneGitDirShape`, `inventory` and `listTree` on the operator's clone.
     - No code is gated on the launch-consent version in force. The disclosure is true of this code.
   - One read is named in the ledger only (Finding 1).
3. **Item 1c (P3).** [Observed] The account matches `git-object-reader.ts` at the reviewed commit.
   - `looseHeaderType` reads 64 stored bytes at a time up to `HEADER_STORED_BYTES = 1024`, and inflates prefix by prefix with `maxOutputLength: HEADER_STEP_OUTPUT` (64 KiB).
   - `packedHeaderType` reads the entry header a byte at a time and recurses down OFS and REF delta bases. A REF base can fall back to `looseHeaderType`.
   - The `tags` reading is labelled [Inferred] as the round-5 reviewer's, in the ledger, in E1 "On `tags`" and on the owner page (item 2).
4. **"Today's code" (C1, P7).**
   - [Observed] The merge of `a41aa223` brings #816's `git-object-reader.ts` and `launch.ts` into the branch.
   - The ledger defines "today's code" as this branch's head. The owner page scopes its sentences "at this package's branch head", and the whole-body sentences are scoped `[Observed, at bb89b8cc, before #816]`.
   - Two leftover present-tense sentences contradict that scoping (Finding 2).
   - One unchanged option text in the touched owner-page item conflicts with the ruled timing (Finding 3).
5. **The rebinds (P8, R1).**
   - [Observed] Quotations.
     - I swept every double-quoted span of 25 characters or more in `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and `ROUND-5-DISPOSITIONS.md`.
     - Sources: the post-apply spec at `155f9c49`; #812's delta, ledger, owner page and direction at `155f9c49`; both entry versions; the installed v1.1 spec; the cited code; round 5's raw; and the package's own prior text.
     - Every #812 quotation is found. The remaining hits are text between quotation marks, or references to the package's own headings.
     - The "there SHALL be refused" wording that `ROUND-5-DISPOSITIONS.md` quotes is found at `054a4f11`, in the section scoped to that commit.
   - [Observed] The judgements in `ROUND-5-DISPOSITIONS.md` hold against the post-apply text.
     - At `054a4f11`, the placement moves the entry. The brief-only rule, the width rule in read (5) and pages in the storage list read, fetch or write nothing new.
     - At `155f9c49`, the wider placement, reads (1) and (3), the kept copy and the object-format exception move the entry. The partial-copy statements, the per-brief rule, the storage list's artifacts and the write falsifier's exception do not.
   - [Observed] The claim that today's code makes neither new read of the operator's clone.
     - Over the 68 non-test `.ts` files in `packages/polaris-dossier/src`, `core.bare`, `core.worktree`, `worktrees` and `commondir` hit only `clone-shape.ts` and `launch-store.ts`.
     - `launch-store.ts:236` lists the governance home's worktrees.
     - `launch-clone.ts` reads `HEAD`, `packed-refs`, loose refs and `config` for remote URLs only.
     - The claim holds for worktree-locating reads. A predicate caveat is in Finding 4.

**Round-5 findings, judged against the bytes.**
- Finding 1: resolved, as ruled.
  - The four places now distinguish the class from the copy.
  - They name the copy-class window and its end.
  - The item 1b answer and the owner page's removed sentence are corrected.
- Finding 2: resolved. Item 1c and owner-page item 2 give what the type test reads from the code, and give the `tags` reading labelled.
- Finding 3: resolved by the merge of `a41aa223` and the scoping, with the residue in Finding 2.

## Findings

**Finding 1 — In the copy-class window, the type test's read of the operator's clone is named only in the ledger** (note, for the owner)

[Observed] In a run v1.2 makes copy-class, today's code runs `isCommit` on the operator's clone (`launch.ts:161-168`).
- `storedType()` reads the candidate's header: a loose object's first stored bytes, or a pack entry's header and its delta bases' headers.
- It reads that header whatever the candidate's type, including a tag or a blob, before any refusal.

[Inferred] That read is outside the entry's copy-class words: "In a copy-class run (fetch) it reads no object of the operator's clone, tells whether the named identifier is a commit only from where the copy's detached checkout leaves the copy's HEAD, never by reading that object".

[Observed] Where the read is named:
- The ledger's first section names it: "after the type test (`isCommit`, which reads the type header)".
- E3's disclosure paragraph, the Dependency bullet and the owner page list only "commit and trees before the answer, its form and its blobs".

For a named commit, the header read is part of the commit read. For a named tag or blob it is not, so three of the four places leave this read out. It is narrow, it ends in a refusal, and it falls under the same ruling. Adding "the named object's type header" to the three lists would make them complete.

**Finding 2 — Two leftover sentences still say the whole-body read "exists today"** (note, editorial)

[Observed] Two sentences survived the rescoping:
- `IMPACT-LEDGER.md` item 1c: "It exists today, under v1.0 in force; v1.1 does not create it and does not close it".
- `SEMANTIC-DELTA.md`, "A gap the narrowing did not close, since repaired": "It exists today under v1.0; this version does not create it and does not close it".

Both sit in paragraphs labelled `[Observed, at bb89b8cc, before #816]`, under headings that say "since repaired". At the reviewed commit, which carries #816, the whole-body read no longer exists. Both sentences are carried over unchanged from `135dac73`. Each needs "at `bb89b8cc`" or the past tense.

**Finding 3 — The owner page's Option 1 text conflicts with the ruled timing of the narrowing** (note, editorial)

[Observed] Under "Your choice on that closed list", Option 1 still says "today's broader reads end with the signing commit" (`OWNER-SIGNOFF.md:186-187`, unchanged since `135dac73`).
- Two bullets above it, in the same item, the repaired text says "until the launch-code narrowing (item 1b) lands, a launch may read outside the signed entry".
- The ledger says the narrowing is implementation under its own direction, not part of the sign-off commit.

The bold disclosure is correct, so the owner is not misled overall. The option text should say "end when item 1b lands".

**Finding 4 — The worktree-read sweep's predicate misses the form check's reading of `core.bare`** (note, editorial)

[Observed] E3's "The worktree-locating reads" supports "today's code makes neither read of the operator's clone" with a sweep for the literals `core.bare`, `core.worktree`, `worktrees` and `commondir`.
- `clone-shape.ts:57` reads the `[core]` key `bare` under the name `'bare'`, and the form check reads the whole configuration file.
- The sweep cannot reach either.

[Inferred] The claim still holds as written: those are form-check reads, not reads made "to locate its repository's working trees".
- In a no-copy run they are admitted by the form-check clause, "the whole configuration file and the pack indexes included, to which (3) yields".
- In the copy-class window they fall under "its form", which is disclosed.

The evidence sentence should name the form check's `bare` key, so that a reader of the predicate does not take it for an absence over all reads of that key.
