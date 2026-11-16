Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-4
Reviewed commit: bb89b8cc252204fa976b5ccfe7f03a8f6deb9419
Manifest SHA-256: 88cbf6acb63b043797a2b347252cedce23fb291bd3d88befa46eb275185bbcc4
Verdict: REVISE

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

Subject: `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`. I computed the digest above with `sha256sum` at the reviewed commit. It equals `PROPOSED-SUBJECTS.json` and the builder's `--digests` output.

Governing text: PR #812 at `de9c1ba89746f380007446a26a03e2a96d9e4d80`.
- [Observed] `origin/agent/syzygy-pdja-clone-and-url-scope` resolves to `de9c1ba8`.
- [Observed] In a scratch directory I applied that commit's `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` (`98025a0a…`) to the v1.1 spec (`95172020…`). The result was `ff133775577b86aa377375ccdc6a605a187e30095bfd6ca73ac2a58debacd5c2`, which equals #812's `PROPOSED-SUBJECTS.json`.

Commands, run in a detached worktree of the reviewed commit. I ran no npm command, so I did not run `npm ci`.
- `build_public_git_source_acquisition_local_agent_v1_1.py --check`: "unapplied, verifies".
- `… --selftest`: "56 of 56 predicates held".
- `… --digests`: base `917aecc7…`, proposed `88cbf6ac…`, patch `c44191c5…`.
- `build_public_git_source_acquisition_local_agent.py --check`: "applied, verifies".
- `build_public_git_source_acquisition_local_agent.py --selftest`: "37 of 37 predicates held".
- `record_versioned_signoff.py --selftest`: "179 fixtures, 0 failing".
- `record_versioned_signoff.py --check public-git-source-acquisition-local-agent --version 1.0`: "regenerates exactly; applied tree verified".
- `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `check_docs_review_campaign_partition.py --check`: partition PASS, denominator 826, unmatched 0. The second method, `git ls-files` against `git ls-tree`, also gave 826.

Item 8, everything else byte-identical. It holds.
- [Observed] I flattened the installed v1.0 entry and the proposed entry to leaf paths and compared them.
  - Changed: `typedAuthority.readAuthority`, `.fetch`, `.tags` and `.stateDirectoryWrites`.
  - Added: `implementationCoverage.copyStep`. Removed: nothing.
  - The 142 common leaf paths keep their order.
- [Observed] `git apply` of the patch to a copy of the installed entry gives `88cbf6ac…`.
- [Observed] The five Proposed blocks in `SEMANTIC-DELTA.md` equal the five JSON values exactly.
- [Observed] Since round 3, the subject changed in one place only: the scoping phrase "Syzygy reads of the operator's clone and the copy only the following".

Rule 6. [Observed] The round-3 mutation record's `file_sha256_restored` equals the SHA-256 of both scripts at the reviewed commit. Each of its 4 mutants stores `old`/`new` and is killed, R3-F2's scoping fixture among them.

Round-3 findings, judged against the bytes:
- **F1, reads outside the closed list.** Repaired as named.
  - [Observed] Item 1b names `launch-clone.ts:100-125` and `launch-revision.ts:33`, `:59-61`.
  - [Observed] E3's closing paragraph, "Dependency on launch-consent v1.2", the owner page's "What changes" bullet and "Before you sign" item 1 now say that signing closes reads today's code makes, and that the code narrows to match.
  - [Inferred] Option 2 is put fairly: it states its cost, a redraft and another round, and its ceiling, never wider than v1.2.
  - The enumeration behind that repair misses one read class; see Finding 1.
- **F2, the scope.** Taken in the subject and pinned by a builder fixture. E3 still quotes the old wording; see Finding 4.
- **F3, the record texts.** Taken.
  - [Observed] The selftest at `record_versioned_signoff.py:3582-3610` pins all four `GIT_SOURCE_V11_*` texts in full as literals. They equal the constants at `:1139-1166`.
  - [Inferred] Each is true of v1.1. The scope names fetch, tags and state-directory writes. The supersession leaves the v1.0 record standing. The "does not" text and the aggregate now name reading the copy in place of the operator's clone. The "does not" text also names the closure of launch reads.
- **F4, item 1a.** Mostly taken; see Finding 3.
- **F5, E2's read list.** Taken. [Observed] It now matches `clone-shape.ts:154-239`.

Item 1, exactness. [Observed] The scoping now matches #812:
- REQ-047 "the reads Syzygy itself makes, in process, of the operator's clone";
- REQ-046 "These rules bind every read Syzygy itself makes, in process, of either clone".

[Inferred] Every other Proposed clause is as round 3 found it: equal to #812 at `de9c1ba8` or narrower. The entry claims nothing #812 does not say. The owner direction's "Redesign after review round 3" authorizes drafting only, and the package performs nothing. The scope is no wider than #812 and that selection.

Item 2, the enumeration, re-derived by my own reading of `init.ts`, `launch.ts`, `launch-clone.ts`, `launch-revision.ts`, `clone-head.ts`, `clone-shape.ts`, `state-directory.ts` and `git-object-reader.ts`. Product code is unchanged between `0f1a203d` and `bb89b8cc` (`git diff --stat` over `packages/` is empty).
- Rows 1-14 and 17-23 are correct as mapped.
  - [Observed] Row 9: `launch-clone.ts:120-125` reads every loose ref value.
  - [Observed] Row 14: `HEX_PREFIX` at `launch-revision.ts:33` matches a full identifier. Both are outside the entry, and item 1b names them.
  - [Inferred] Row 9's admission of each `refs/remotes/*/HEAD` value holds. `defaultRemote` (`launch-revision.ts:39-48`) is called unconditionally at `launch.ts:179` for the identity rule, and the trunk rule and the identity rule both name the remote's default.
- **Row 16 is sound.**
  - [Observed] The `lstat` of `objects/info/alternates` at `git-object-reader.ts:393` is in the reader from its first commit, `5955c397` (2026-10-06, line 196 there).
  - [Observed] That commit is an ancestor of the commit that installed and recorded v1.0 (`3409ef5a`, 2026-10-08), whose `implementationCoverage` cites that reader.
  - [Inferred] The owner signed v1.0's "no … alternates file … is read" over a reader that made this existence check and used it only in a refusal message. The words bound the file's content, as the row says. Under v1.2, read (4) names it in any case.
- **Row 15 is wrong for a candidate that is not a commit.** See Finding 1.
- The "not launch-consented" result is not exact; see Finding 4.

Item 3, item 1b's claim about #812.
- [Observed] Both quotations from #812's "Implementation impact" are exact at `de9c1ba8`.
- [Observed] `launch-clone`, `readCloneSnapshot`, `storedIds` and `storedIdentifiers` occur 0 times in #812's package files and in the owner direction at that commit.
- [Inferred] The claim that v1.2's implementation needs the same narrowing is labelled and true: REQ-047 closes a launch-consented run's reads of the operator's clone to the same five bullets.
- The timing claim conflicts with #812's ledger; see Finding 2.

Item 5, the record texts. They hold, as above.

## Findings

**Finding 1 — the enumeration misses that a launch reads, in full, the object a `--revision` or trunk reference names before knowing it is a commit. For a tag or a blob, that read is outside the entry. Row 15 maps it to the object-read words, item 1b omits it, and the owner page says "Syzygy still never reads a tag".** (revise)

[Observed] `launch-revision.ts:100` calls `ports.isCommit(commit)` on the resolved candidate before any HEAD check or answer. That port, `launch.ts:160`, opens the object reader on the candidate and calls `.tree()`.
- `.tree()` (`git-object-reader.ts:171`) goes to `Walk.readRoot`, which calls `store.verified(revision, 'commit')` (`:221`).
- `verified` (`:438-442`) calls `raw`. For a loose object, `raw` reads the whole stored file (`:466`) and inflates all of it (`:474`). For a packed object it inflates the whole entry (`inflateAt`).
- Only then does it compare the type (`:442`, "`${id} is a ${object.type}, not a ${type}`").

So the whole body is read in process whenever the named identifier is not a commit:
- `--revision v1` naming an annotated tag (the ref value is the tag object's identifier);
- `--revision <blob-id>`;
- a trunk reference that holds a non-commit identifier.

[Observed] For a launch-consented no-copy run, every run today, the entry admits no such read:
- `tags` (v1.0's words, kept by v1.1) says "never read";
- the object-read words admit "the pinned commit, its root tree and the trees and blobs reachable from it";
- the installed v1.1 spec's REQ-046 falsifier is "A blob is read … before a confirmed phrase or in-force records".

[Inferred] The words "a wrong type refuses that step" can be read to allow reading the object to learn its type. "Never read" for a tag cannot be read that way.

Package bytes that say otherwise:
- the owner page, "Before you sign" item 2, "Syzygy still never reads a tag";
- the claim that item 1b's two narrowings bring the code within the entry (Dependency section; owner item 1, "or every local-agent dossier read refuses or reads outside the entry").

The table that the ledger cites as the full enumeration (row 15) maps the read to an admitting clause.

[Inferred] v1.1 does not create this gap. v1.0 is in force with the same words, and the read exists today. But signing presents the code as matching the entry once 1b lands, so the owner would sign on an incomplete account. This is the recurring class ("the entry excludes reads the code makes today"), reached through the type test.

Repair, either way:
- add to item 1b, or to a named companion item, a type test that reads no body of the candidate. Correct row 15 and the owner page's sentence to match;
- or say plainly, in the ledger and the owner page, that this is a pre-existing gap against v1.0's `tags` and REQ-046 that v1.1 does not close. File it for its own repair, and drop "still never reads a tag".

[Inferred, for the owner] #812's "Syzygy tells these cases apart without reading the object itself" is hard to meet in a no-copy run, where REQ-047 has Syzygy "read it as a commit object". That is #812's to settle, not this package's.

**Finding 2 — item 1b says the narrowing must land in the same commit as the sign-off, and also that it "lands with the v1.2 implementation". #812's ledger places that implementation "After sign-off only, under a separate implementation direction".** (note, for the owner)

[Observed] Item 1b says "This change must travel with the sign-off", and Dependency says "the launch code must narrow to match in the same commit". The owner page says "if you sign the two together it lands with v1.2's implementation". #812's "Implementation impact" at `de9c1ba8` opens "[Inferred] After sign-off only, under a separate implementation direction".

[Inferred] Signed together, the two texts disagree on whether the narrowing is in the signing commit or follows it. If it follows, both entries are signed over code that reads outside them until the implementation lands. The owner should be told which.

**Finding 3 — item 1a is still short, and its sweep total names 7 files where the sweep finds 6** (note)

[Observed] Over the 819 tracked files under `packages/`, `apps/` and `scripts/`, the literal sweep for `local-agent-v1.0` and `LOCAL-AGENT-SIGNOFF-v1.0` gives 22 lines in 6 files. I checked it with `grep -c` and with a Python second method, which agree. The ledger says "22 lines in 7 files".

[Observed] Pins that use neither literal remain unnamed:
- `recorder-fixtures.testkit.ts:71` and `:74`, which call `vs.render_record(pkg, '1.0', …)` and `vs.record_rel(pkg, '1.0')`;
- its oracle test, `recorder-fixtures.testkit.test.ts:53` and `:56`, which do the same;
- `start-gates.test.ts:118-129` (`signoffOver`). It writes the v1.0 rendering at `REGISTRY_ACT`, the path the form names. Once the form moves, it writes a v1.0-shaped record at the v1.1 path.

[Inferred] "The testkit renderer" in item 1a covers the first two in spirit. The `start-gates.test.ts` fixture contradicts the table's "[Inferred] follows item 1" for `:114-115`. A sweep for the string `'1.0'` near `render_record` and `record_rel` finds all of them.

**Finding 4 — residual inaccuracies in the enumeration and E3** (note, editorial)

- [Observed] E3 (`SEMANTIC-DELTA.md:212-213`) still quotes the entry as "besides the object reads, Syzygy reads only the following". The phrase occurs 0 times in the subject, which now says "Syzygy reads of the operator's clone and the copy only the following".
- [Observed] The table says "A run that is not launch-consented makes rows 18 to 23 only". `init.ts:110-116` makes rows 1-4 before deciding the run class, whenever `--url` is given without `--revision`. A run whose HEAD another act's consent names is exactly such a run. The entry admits those reads by its HEAD-check sentence, so only the claim is short.
- [Observed] `init.ts:102` (`stateRootViolation`) and `:212` (`createRunDirectory`) resolve the clone's real path (`state-directory.ts:83-93`). No row lists them. [Inferred] They fall under rows 11 and 19's clause (1).
- [Inferred] Item 1b's "skipped for a full identifier" must judge "full" by the clone's hash. In a SHA-256 clone, a 40-hex `--revision` is an abbreviation, and read (5) admits its listing.

The reviewer edited nothing tracked, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external. The scratch worktree, the fixtures and the TMPDIR were removed.
