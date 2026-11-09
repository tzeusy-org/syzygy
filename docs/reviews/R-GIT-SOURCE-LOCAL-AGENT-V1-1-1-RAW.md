Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-1
Reviewed commit: 5c9391502a15d18e88ffb031645afd94c70fe652
Manifest SHA-256: d7bac9a99ac761ea7eb7eae65230968a0d0d5b6a812144b388683568f3a5af8c
Verdict: REVISE

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

Subject: `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`. Its digest above was computed by `sha256sum` at the reviewed commit.

Governing text: PR #812 at `de9c1ba89746f380007446a26a03e2a96d9e4d80`.
- I applied `proposed/spec.md.patch` to the v1.1 spec in a scratch worktree of that commit. [Observed] Before: `95172020…`. After: `ff133775577b86aa377375ccdc6a605a187e30095bfd6ca73ac2a58debacd5c2`. This matches #812's `PROPOSED-SUBJECTS.json`.
- [Observed] The owner direction `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md` has the same bytes at `de9c1ba8` and at `origin/agent/syzygy-pdja-clone-and-url-scope`. Both hash to `758feff4…`, and both branch heads are `de9c1ba8`.

Commands run in a detached worktree of the reviewed commit (no `npm ci`, since no npm check was run):
- `build_public_git_source_acquisition_local_agent_v1_1.py --check`: "unapplied, verifies", exit 0.
- `build_public_git_source_acquisition_local_agent_v1_1.py --selftest`: "44 of 44 predicates held".
- `build_public_git_source_acquisition_local_agent_v1_1.py --digests`: base `917aecc7…`, proposed `d7bac9a9…`, patch `bebaa294…`. These equal `PROPOSED-SUBJECTS.json` and my own `sha256sum`.
- `build_public_git_source_acquisition_local_agent.py --check`: "applied, verifies".
- `build_public_git_source_acquisition_local_agent.py --selftest`: "37 of 37 predicates held".
- `record_versioned_signoff.py --selftest`: "176 fixtures, 0 failing".
- `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".

Independent structural diff of the v1.0 base against the proposed entry, flattened to leaf paths:
- [Observed] Changed: `typedAuthority.readAuthority`, `.fetch`, `.tags` and `.stateDirectoryWrites`.
- [Observed] Added: `implementationCoverage.copyStep`. Removed: nothing.
- [Observed] Key order is otherwise preserved.
- [Observed] The installed entry equals the v1.0 base byte for byte.
- Criterion 4 holds.

## Findings

**Finding 1 — "no-copy run" is a term only #812 defines, so the v1.0 guarantees this version keeps hang on it, and the dependency statement is wrong** (revise)

[Observed] The installed launch-consent spec (v1.1, sha `95172020…`, at the reviewed commit) uses neither "no-copy" nor "copy-class" (0 occurrences of each). Both terms come only from REQ-polaris-generation-047 at `de9c1ba8`: "A run that this rule requires to run on a copy is a copy-class run, and every other run with a named identifier is a no-copy run".

[Observed] The proposed entry ties v1.0's protections to the term:
- `fetch` opens "none in a no-copy run: Syzygy fetches nothing".
- The no-copy run's form-check reads in `readAuthority` are admitted only "In a no-copy run".
- `readAuthority` also makes the launch-reads list closed: "Besides them Syzygy reads, as data and never honoured, only the following".

[Inferred] Suppose this version is signed and v1.2 is not (SEMANTIC-DELTA, "Dependency on launch-consent v1.2"). Then neither class is defined, so the no-copy clauses are as termless as the copy clauses:
- `fetch` no longer says "none" of any run.
- The redis run is not launch-consented (#812's preamble: it "keeps every predecessor requirement's bytes and meaning"). The closed list's only admission of its clone-form reads is the no-copy sentence. Those reads, by `clone-shape.ts`, are of HEAD, `config`, `shallow`, `logs/HEAD` and the pack indexes. So the closed list would exclude reads that v1.0 admitted by reading.

The package claims this case leaves "the copy clauses … inert" and the E3 sentence "a narrowing in words of what v1.1 already does". E2 claims "The redis consent's run is a no-copy run; this version changes nothing it may do". Neither holds unless v1.2 is in force.

[Inferred] The E3 list also admits more than v1.1 does. It includes `packed-refs`, the existence of the alternates file and the pack indexes for an abbreviation, which #812's D9 itself calls "the reads v1.2 adds". So "not a widening" is also inexact for that case.

Repair: either
- define the classes in the entry's own words, for example "a no-copy run, that is, every run that is not a copy-class run", or "none, save in a copy-class run"; or
- correct the Dependency section and E2/E4 to say what this version means when signed alone.

**Finding 2 — the recorder would write a v1.1 record whose fixed lines are false for this version** (revise)

[Observed] `scripts/record_versioned_signoff.py`'s `installed_lines()` (around line 2064) and `does_not()` (around line 2083) render the same text into every registry-entry record. It includes three lines:
- "Scope: the entry's own subject and read authority, nothing wider"
- "Supersession / revocation: supersedes nothing"
- "It … widens no egress, write or execution"

This version's own bytes contradict those lines:
- [Observed] `stateDirectoryWrites` adds the copy's directory, a write outside the run's state directory that is kept after the run.
- [Observed] `readAuthority` admits Git processes ("save, in a copy-class run, the Git processes fetch names") where v1.0 said "no process is started".
- [Observed] `check()` for v1.0 now prints "; superseded by a later version", while the v1.1 record would say "supersedes nothing".

[Inferred] The scope line and "widens no write or execution" would be false in the signed record, and the supersession lines of the two records would disagree.

The package changes `installed_lines()` but leaves these lines as they are. Neither the ledger nor the brief mentions them.

Repair: make the scope, supersession and widening lines carry this version's truth. The package may need to supply that text. Otherwise, state in the ledger and the owner page why these lines remain accurate.

**Finding 3 — after v1.1 is recorded, the battery's v1.0 `--check` stops guarding the v1.0 record's SHA-256 line** (revise)

[Observed] For a version a later version replaced, `check()` now reads `replaced_sha` from the record's own "Installed entry SHA-256:" line and regenerates the record with it. That line is therefore checked only against itself.

Rule 6, run in a scratch copy of the scripts:
- Mutant A: `installed_sha=replaced_sha` changed to `installed_sha=None`. Result: the new fixture fails ("176 fixtures, 1 failing"). The selftest catches the reverted change, as the ledger says.
- Probe B: after recording v1.0 and then v1.1 in the selftest fixture, I rewrote the v1.0 record's SHA line to 64 zeros and ran `check(tmp, reg, "1.0")`. Exit was 0. The forged line passes.

[Observed] The only guard is the v1.1 builder's `check()`, which hashes the v1.0 base against the v1.0 record (directly, or through the v1.0 builder's deferral to `signed_findings()`). Neither builder's `--check` is in the battery:
- `PROJECT-STATUS.md:506` and `governance-docs.yml:517-518` carry only the recorder's `--check … --version 1.0`.
- IMPACT-LEDGER item 2 adds the v1.1 builder's `--check` only "if the owner wants the base check in the battery".

Brief question 7 asks whether anything is lost. Something is: a signed record's binding line becomes unguarded by default, and the ledger does not say so.

Repair: either
- make the builder `--check` line required in the signing commit and say why; or
- have the recorder's `--check` of a replaced version compare the record's SHA with that version's base bytes, through the later builder.

**Finding 4 — `subject.observedRepositories` and `authorizationModeDerivation` are left alone, yet the E3 sentence now admits, in words, reads they forbid** (note, for the owner)

[Observed] Two unchanged fields say:
- `subject.observedRepositories`: "a repository or revision no effective consent covers is not read".
- `authorizationModeDerivation`: "every read needs this entry in force, the pair's effective observation consent naming the pinned revision … every other combination refuses before any object is read".

[Observed] The new `readAuthority` admits reads of the operator's clone "In a launch-consented run", which happen before any consent covers the revision. It also points copy-class object reads at the copy. REQ-046 at `de9c1ba8` reads the commit and tree objects of the run's clone before the answer, and in a copy-class run that clone is the copy.

[Inferred] This tension already existed under v1.0 together with signed launch-consent v1.1. #812's D9 table lists neither field, and E1 does not examine them. Two things are new:
- The entry now states the pre-consent reads explicitly.
- There is a new pre-consent object store, the copy.

E3 says the sentence "states the reading they already rest on". It does so only for the "no ref … is read" list.

Whether to move these two fields or to disclose them as residuals in E6 is a scope question for the owner.

**Finding 5 — the builder's semantic predicates check that phrases are present, so a coherent widening passes** (note)

[Observed] Rule 6, run in a scratch copy. For each mutant I changed one string in the proposed entry, then regenerated the patch and `PROPOSED-SUBJECTS.json` so they stayed coherent, and ran `--check`.

| Mutant | Change | `--check` result |
|---|---|---|
| Control | drop "no tags" from `fetch` | 1 finding |
| M1 | widen launch read (3) to "names, URLs and include paths" | verifies |
| M2 | widen launch read (5) to "object identifiers and object headers" | verifies |
| M3 | copy directory "anywhere on the host" | verifies |
| M4 | `fetch` source "the operator's clone or its remotes" | verifies |
| M5 | "the values of every reference" | verifies |

[Inferred] The docstring's claim that each moved declaration "names every part of the copy" is accurate. However, several selftest names overstate what their predicates catch:
- "a sixth launch read refused" is caught only by the literal `(6)`.
- "an unbounded copy directory refused" is caught only by removing one phrase.

The binding guard is the review over the digest plus the recorder's check that the package is unchanged since the review. The builder adds depth, not proof. The selftest names should say what each predicate actually catches.

**Finding 6 — `stateDirectoryWrites` says Syzygy writes the copy's directory "only through the Git processes fetch names", but Syzygy itself creates and removes it** (note, editorial)

[Observed] The same value says the directory's "creation starts the copy step" and that Syzygy "removes [it] with its contents". `fetch` says "Syzygy creates an empty directory of its own". Creating and removing the directory are Syzygy's own writes, not Git's.

Suggested wording: "whose contents Syzygy writes only through the Git processes fetch names", or name creation and removal as the two direct writes.

**Finding 7 — the ledger's "Who else reads the entry" sweep missed the production gate and one test** (note)

[Observed] Two consumers reach the v1.0 form through the constant `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`, never through the literal file names:
- `packages/polaris-dossier/src/gate-sources.ts:511`, the production start gate, reads the form.
- `packages/polaris-generation-consent/src/real-tree.test.ts:43-44` expects identity `public-git-source-acquisition-local-agent-v1.0` whenever the v1.0 record exists.

The ledger's sweep searched for "the installed file name and the v1.0 record name", so it missed both (rule 9, the form an identifier occurs in).

[Inferred] Item 1, changing the form, covers `gate-sources.ts` by construction. `real-tree.test.ts` must change in the same commit too.

Otherwise the dependency on `package-reader.ts` is disclosed honestly:
- [Observed] The comment at `package-reader.ts:870-874` matches the ledger's quotation.
- [Observed] The owner page says the gate change needs its own authorization.

**Finding 8 — answers to Q1 and Q2** (note, for the owner)

Q1: `tags` should move, as drafted.
- [Inferred] v1.0's "never read" stays true of Syzygy at `de9c1ba8`.
- Git writing a non-commit object into a clone Syzygy made is new.
- The appended clause keeps v1.0's words as a prefix (builder-checked) and matches REQ-047: "SHALL NOT follow that object … or use it beyond the copy step and that refusal".

Q2: the version strings need not move.
- [Observed] The identity scheme `observer-id-plus-version-plus-content-digest-plus-provenance-state` separates the two versions by digest.
- [Inferred] `implementationStatus` already says that changing the reader file is "a new implementation version and a new version of this entry". Implementing the copy step will therefore force a later version in any case.

**Finding 9 — Q3: the `git-object-database` identity scheme is inaccurate for a copy-class run** (note, for the owner)

[Observed] The scheme is `repository-id-plus-operator-declared-clone-git-dir`, but in a copy-class run the object database is the copy's Git directory. Syzygy creates that directory; the operator does not declare it.

[Inferred] Under REQ-047 "the copy is the clone that REQ-polaris-generation-033 to 036 name", so one reading stretches "operator-declared clone" to cover it. E6 names the residual honestly.

Moving the scheme changes an identity the v1.0 builder pins. Leaving it means a scheme name that is literally false for copy-class runs. That trade-off is the owner's to decide.

**Finding 10 — the Scope A extension option is honest; exactness otherwise holds** (note)

[Observed] The Scope A direction (item 1) names "the observer registry entry". The v1.0 record's selection "Extend Scope A to this entry and sign v1.0" was the extension, and the recorder requires the words "Extend Scope A". The option "Extend Scope A and sign source-acquisition entry v1.1" extends exactly to this version and says why the words are needed. It claims nothing wider.

[Observed] I checked each Proposed block against REQ-047 at `de9c1ba8`. Each of the following matches it, or is narrower:
- the run classes and the named identifier;
- the five launch reads, which follow REQ-047's bullets one to one;
- the Git environment;
- the fetch: by full identifier, depth one, no tags or submodules, `file://` only, detached checkout;
- the commit test from the copy's HEAD, "never … from reference data";
- object reads moving to the copy;
- the no-copy form-check reads, "to which (3) yields";
- the copy's directory, its removal before the brief and its keeping with a named location;
- the refusals for reftable, for an alternates file before the copy step, and for a Git process failure "as Git reported it";
- the Inferred hook and configuration residual;
- "not a locator".

[Inferred] I found no claim wider than #812 and the owner's rulings, apart from Findings 1 and 4. Two items are narrower than #812:
- "no other process is started";
- reftable refused only in `fetch`, whereas #812 refuses it in every launch-consented run.

[Observed] `networkAccess`, `executeObservedCode`, `workingTreeRead` and `submodules` agree with REQ-047. `writeSurface` stays `[]`, with the reason now given in `stateDirectoryWrites`, as D9 asked.

The reviewer edited nothing tracked, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external.
