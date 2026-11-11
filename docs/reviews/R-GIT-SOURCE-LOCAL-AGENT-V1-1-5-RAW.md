Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-5
Reviewed commit: 135dac733a8c8a9f79e7da4156f74d71bf203e55
Manifest SHA-256: 6bf87131dd5a9b12663575b0482ac56ea3671a334b4725ab38e49c0b288126ee
Verdict: REVISE

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

Subject: `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`. [Observed] I computed the digest above with `sha256sum` in a detached worktree of the reviewed commit. It equals `proposed_sha256` in `PROPOSED-SUBJECTS.json` and the builder's `--digests` line.

## Inputs and commands

- [Observed] PR #812 at `736d9fcd`: I applied `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` to the v1.1 spec of that commit in a scratch repository.
  - Pre-apply digest: `95172020…`. Post-apply digest: `088d8978…`.
  - Both equal that package's `PROPOSED-SUBJECTS.json`.
  - I read REQ-046 and REQ-047 sentence by sentence from the post-apply text.
  - I also read #812's `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md` ("Implementation impact") and the owner direction, including the section "Rulings after review round 10, 2026-11-10".
- [Observed] Every command in the brief ran at the reviewed commit and exited 0:
  - v1.1 builder `--check`: "unapplied, verifies".
  - v1.1 builder `--selftest`: 56 of 56 predicates.
  - v1.1 builder `--digests`: 917aecc7… v1.0 base, 6bf87131… subject, 36827eb9… patch.
  - v1.0 builder `--check`: "applied, verifies". v1.0 builder `--selftest`: 37 of 37.
  - Recorder `--selftest`: 179 fixtures, 0 failing.
  - Recorder `--check … --version 1.0`: regenerates exactly.
  - `check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
  - Campaign partition `--check`: denominator 827, unmatched 0.
- [Observed] The branch and main differ under `packages/` and `apps/` only by #816: `git diff 135dac73 a41aa223` touches `git-object-reader.ts`, `launch.ts` and their two tests. Merge base: `98a158fb`.

## Decision items

1. **Exactness against #812.** [Observed] Each Proposed block restates REQ-046 and REQ-047 at `736d9fcd` and goes no wider:
   - The copy's object format: "with the object format the operator's clone's configuration records, SHA-1 where it records none", and "a clone is never refused for its object format". This matches sentence 37.
   - The copy's form settings: "the repository format version and object-format setting that format needs". This matches sentence 42.
   - Read (3): "as text, for its remotes' names and URLs and its object format (extensions.objectFormat) alone". This matches the third item of the five-read list, with no run-class qualifier, as #812's has none.
   - Reads (1), (2), (4) and (5) match the other four list items. The entry's bound "of what they list only what the launch-consent requirements in force name" only narrows.
   - Copy-class definition: the entry says "a version in force of REQ-polaris-generation-047 requires" the copy. With v1.2 in force this makes runs under v1.1-scoped launch consents copy-class, through sentences 22–24 ("runs on a copy too").
   - The no-copy form clause, "in a run only a launch observation consent covers, the form one commit fetched alone into an empty repository and checked out detached leaves":
     - [Inferred] With v1.2 in force it binds no run, because sentence 22 makes every such run copy-class.
     - [Observed] With v1.1 alone it names what `clone-shape.ts` checks: the form left by `git init`, `fetch --depth=1` and `checkout --detach FETCH_HEAD`. `init.ts:178` applies that check to every run.
   - The entry claims nothing #812 does not say. Its narrower placements need no admission: the reftable refusal sits inside the copy-class sentence, and the copy's directory is "outside the operator's clone".
2. **Quotations.** [Observed] I swept every double-quoted span of 25 characters or more in `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md` and `ROUND-5-REDRAFT.md`.
   - Sources: the post-apply spec, #812's delta, ledger, owner page and direction at `736d9fcd`, the installed v1.1 spec, both entry versions, and the cited code.
   - Every #812 quotation is found there.
   - The spans not found are text between quotation marks, or prior wording that is quoted as prior, such as "for its remotes' names and URLs alone".
   - No `de9c1ba8` wording is quoted as current.
3. **Enumeration.** I re-derived the reads independently from `init.ts`, `launch.ts`, `launch-clone.ts`, `launch-revision.ts`, `clone-head.ts`, `clone-shape.ts`, `git-object-reader.ts`, `state-directory.ts` and `launch-cli.ts` (`previewClasses` uses paths only).
   - [Observed] Rows 1–23, with 11a and 19a, cover the reads a run makes when no launch-consent version in force requires a copy. The row 15 correction and the re-mapping of rows 20–22 hold.
   - [Observed] `reader.inventory()` reads no blob. `reachable()` walks trees only.
   - The table's premise fails once v1.2 is in force (Finding 1).
4. **Gate timing.** [Observed] The ledger, E3, the Dependency bullet and the owner page each record "Land with sign-off" as ruled, not open. The labelled account of which runs can be made in the window is not true of the code with v1.2 in force (Finding 1).
5. **Item 1c.**
   - [Observed] The gap is stated plainly.
   - [Observed] #816's merge state is labelled and true: `a41aa223` is on `origin/main`.
   - [Observed] No sentence says the code never reads a tag. A search for "never reads a tag" and "reads a tag" finds none.
   - Residual precision: Findings 2 and 3.
6. **Record texts.** [Observed] All four `GIT_SOURCE_V11_*` texts are true of the subject. Each is pinned as a full literal in the recorder's selftest (lines 1143–1164 and their mirror at 3587–3608).
7. **Item 1a.** [Observed] I re-ran the sweeps over the 819 tracked files under `packages/`, `apps/` and `scripts/`:

   | Sweep | Occurrences | Lines | Files |
   |---|---|---|---|
   | `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` | 33 | 29 | 10 |
   | the two v1.0 literals | 22 | 22 | 6 |
   | the two `'1.0'` render calls | 4 | 4 | 2 |

   - All three totals equal the ledger's.
   - As a second method, I ran `git grep` for the package key. It finds no other site that pins v1.0's installed bytes outside the fixture family the ledger names. `gate-acts.test.ts:62` writes the v1.0 proposed bytes inside the same `world` fixture as `:63`.
8. **Byte-identity.** [Observed] A structural JSON diff of the installed v1.0 entry (`917aecc7…`) against the subject changes exactly five paths:
   - `implementationCoverage/copyStep`
   - `typedAuthority/fetch`
   - `typedAuthority/readAuthority`
   - `typedAuthority/stateDirectoryWrites`
   - `typedAuthority/tags`

   The builder's `--check` agrees.

**Round-4 findings, judged against the bytes.**
- Finding 1: resolved, by item 1c, the row 15 correction and the owner page's dropped sentence.
- Finding 2: resolved. The narrowing's timing is one statement in all four places.
- Finding 3: resolved. The sweep totals re-derive.
- Finding 4: resolved. E3 quotes the subject's words; rows 11a and 19a were added; "full" is judged by the clone's hash.

## Findings

**Finding 1 — With v1.2 in force, the account of the window misstates which runs can be made, and when the window ends. Today's code makes copy-class runs without a copy, and they read the operator's clone outside the entry.** (revise)

The owner page says: "Sign this together with launch-consent v1.2, or not at all". #812's ledger says its implementation comes "After sign-off only, under a separate implementation direction", and that "No product code changes with this package".

[Observed] No code is gated on the launch-consent version in force. I swept the 71 non-test source files of `polaris-dossier/src` and `polaris-generation-consent/src` for `v1.2`, `'1.2'`, `copy-class`, `copyClass` and `specVersion`. Every hit concerns the local-agent-mode spec (`waiting-sessions.ts`) or rendering. None concerns launch consent.

So, once both are signed and item 1 has landed, take any run that v1.2 makes copy-class:
- the owner's "Copy anyway" runs on consents recorded under v1.1;
- any new launch-only consent.

[Observed] `launch.ts` and `init.ts` make that run as a no-copy run:
- `pinLaunchRevision` with `launchNamesHead`;
- then `commitHead` and `listTree` on `snapshot.gitDir`, at `launch.ts:169-173`, before the answer;
- then `isCommit`, which on main reads the type header;
- then `init.ts:165-187`: the HEAD check, `cloneGitDirShape` and `inventory` on the operator's clone;
- then the blob reads.

[Inferred] Each of these is outside the entry's copy-class words:
- "In a copy-class run (fetch) it reads no object of the operator's clone".
- Objects are read "of the .git directory … of the operator's clone, or, in a copy-class run (fetch), of the copy".
- The form-check reads of the operator's clone are admitted "In every no-copy run" only.

Against this, the ledger's labelled account (item 1b, "Can a launch-consented run be made before it lands?") says "a copy-class run, no: no code makes a copy". The owner page says "A copy-class run cannot be made in that window: no code makes a copy". Both treat "copy-class" as "makes a copy". The entry defines the class by what a version in force requires, not by what the code does.

The headline disclosure, "until items 1b and 1c land, a launch may read outside the signed entry", repeated in E3, the Dependency bullet and the owner page, therefore has two faults:
- It names the wrong end of the window. With v1.2 in force the window lasts until the copy step is implemented, not until 1b and 1c land.
- It leaves out the largest class of out-of-entry reads: every object read and form-check read of the operator's clone in a copy-class run.

This is the recurring class: the entry excludes reads the code makes today, and the disclosure does not say so.

Repair, in prose only; the subject need not move. State, labelled, that while v1.2 is in force and its copy step is unimplemented:
- every run v1.2 makes copy-class is made by today's code without a copy;
- such a run reads the operator's clone's commit and trees before the answer, its form and its blobs, all outside the entry;
- the window ends with v1.2's implementation.

Alternatively, record that the gate (item 1), or another change, refuses launch-consented runs in that state. Either is the owner's call under the "Land with sign-off" ruling. The disclosure has to be true before it is signed.

**Finding 2 — #816's type test reads more than "only the object's header", and what that means for `tags` "never read" is left open** (note, for the owner)

The ledger's labelled claim [Inferred, from that PR's title] is that with #816 "the type test reads only the object's header". Against the code on main (`a41aa223`):

- [Observed] A loose candidate's stored bytes are read in 64-byte chunks, up to 1024 bytes, and inflated prefix by prefix. Each inflate step may produce up to 64 KiB. The code's own comment says "The bytes the last stored byte inflates to past the header are discarded unread". So some compressed body bytes are read from disk, and some inflated body bytes exist in memory, before they are discarded.
- [Observed] For a deltified pack entry, `packedHeaderType` reads the entry headers of each delta base down the chain. Those bases are other objects, and they may lie outside the pinned tree.
  - [Inferred] This is narrower than the delta-base reads the commit path has always made through `raw()` under v1.0, and the entry has never named those either.
- [Inferred] My reading: the entry's own `tags` sentence ("the pinned identifier must name a commit object, and any other type refuses") and v1.0's "a wrong type refuses that step" both presuppose a type test, and a header read is the least a type test can read. So a header read with discarded spill-over sits within `tags`, but only by that reading. #812's "Syzygy tells these cases apart without reading the object itself" is not met by it in a no-copy run. That sentence remains #812's to settle, as the owner page already says.

**Finding 3 — Two passages describe "today's code" as it is on this branch, but since `a41aa223` it is not so on main** (note, editorial)

- [Observed] The owner page's gate-timing bullet says the launch code reads "the whole body of a named object that is not a commit [Inferred, from the code; no product code changed since round 4]".
  - #816 changed `launch.ts` and `git-object-reader.ts` on main after round 4.
  - The sign-off commit will be cut from main.
- [Observed] The ledger's headline ("today's launch code reads … the whole body of a named object that is not a commit (item 1c)") has the same scope problem, and so does "until items 1b and 1c land", although 1c has landed on main.
- [Observed] Item 1c and the owner page's item 2 do say "This package's branch predates it", so this disclosure errs toward saying too much, not too little.
- To repair: scope each such sentence to "at this branch's head", or say that 1c has landed on main.
