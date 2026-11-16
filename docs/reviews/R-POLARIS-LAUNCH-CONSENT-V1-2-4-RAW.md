Review: R-POLARIS-LAUNCH-CONSENT-V1-2-4
Reviewed commit: 35015c5e368d18a31a364498c894c406b0496ea6
Manifest SHA-256: 97975877f34773eb7b1580effcf5d3cd06430c9d9556388845113e2e816fea50
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh context, read-only. Scratch worktree of the reviewed commit; `proposed/spec.md.patch` (sha256 `c24b3e47…`, as `PROPOSED-SUBJECTS.json` states) applied with `git apply`. The v1.1 spec hashed to `95172020…` and the post-apply spec to the digest above, both by `sha256sum`, and both match `PROPOSED-SUBJECTS.json`. Line numbers below are those of the post-apply spec unless a package file is named. Scratch fixtures were built under the brief's TMPDIR with Git 2.53.0 and no network, then deleted.

## What held

- [Observed] The tooling holds. These all exit 0 on the clean tree:
  - `--check` of the v1.0, v1.1 and v1.2 builders;
  - `--selftest` of the same builders (25, 30 and 31 fixtures, 0 failing);
  - `record_versioned_signoff.py --selftest` (175 fixtures, 0 failing).
- [Observed] Every "Current" exact block in SEMANTIC-DELTA.md is a substring of the v1.1 bytes, and every "Proposed" block is a substring of the post-apply bytes (11 blocks, checked by script).
- [Observed] These quotations match their sources after whitespace normalisation:
  - the owner's selections and rulings (direction record);
  - the registry entry's `fetch` and `readAuthority` (D9, IMPACT-LEDGER, OWNER-SIGNOFF);
  - the redis consent's scope sentence;
  - the screening-v8 sentence "It is public only when that answer is affirmative".
- [Observed] The rule-9 sweep reproduces at `715c59c4`. I ran Python `re` (case-insensitive) with the seven stated forms over `git ls-tree -r -z`. The populations give 9/1, 4/2, 217/13, 12/3, 2/1 and 20/8, equal to the delta's table. The one pinning declaration is the source-acquisition registry entry.
- [Observed] The D2 fixture evidence reproduces. I used the stated environment (`env -i`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file`, `GIT_NO_LAZY_FETCH=1`) and `git init --template=` followed by `fetch --depth=1 --no-tags --no-recurse-submodules file://… <oid>`.
  - The source clone set `core.hooksPath` to a directory of executable hooks and also held hooks in `.git/hooks`. Its own configuration set `core.fsmonitor` and `uploadpack.packObjectsHook` to commands.
  - None of those hooks or commands ran.
  - An unadvertised non-tip commit was fetched with `allowReachableSHA1InWant=false`.
  - The copy's `.git` held only `config` (`[core]` with four `git init` keys), `FETCH_HEAD`, `HEAD`, `index`, `logs/HEAD`, `shallow`, loose objects and empty `refs/` directories. Every entry is inside `clone-shape.ts`'s `GIT_DIR` allowlist.
  - Mutation control: with `GIT_CONFIG_GLOBAL` pointing at a file that sets `uploadpack.packObjectsHook`, the hook did run. Global configuration reaches the serving process, so disabling it is load-bearing and effective.
  - A blobless partial source failed the fetch ("bad pack header"), and its object store was unchanged afterwards, even with `GIT_NO_LAZY_FETCH` removed (upload-pack disables lazy fetching itself at 2.53).
- [Inferred] Upload-pack runs no hook, and `core.fsmonitor` is never consulted by the serving side. So the stated residual is right, and it is correctly labelled Inferred.
- [Observed] A `--revision` naming an annotated tag object fetches the tag together with its commit, tree and blobs. The copy then shows type `tag`, so "refused once the copy shows that object's type" is implementable. A blob identifier fetches the blob alone, with type `blob`.
- [Observed] REQ-046's derivation sentence is byte-identical to v1.1. The floor and the every-host reading are added sentences. `repository:redis-redis`, `repository:psf-requests` and `repository:tzeusy-org-syzygy` still derive. The trunk rule matches `launch-revision.ts`: `origin` first, the several-remotes refusal, `main`, then `master`.
- [Observed] The delta states plainly, in its Warrant and D5, that the redesign supersedes the in-place design and ruling 2 "Disclose only", and that the owner chose the copy after declining it on 2026-11-09. D6's typed http/git reading is labelled Inferred, attributed to the coordinating session, and put to the owner as "Before you sign" item 2.
- [Inferred] The drafter's registry claim is right. `fetch` says "none: Syzygy fetches nothing. The operator prepares the clone with their own tools", and `readAuthority` ends "no process is started". No reading admits a Syzygy-run `git fetch`. The conclusion that a signed successor is needed comes first on the owner page ("Before you sign", item 1). Finding 3 covers what it leaves unnamed.

## Findings

**Finding 1 — REQ-046's unchanged blob falsifier and its read-logging oracle catch the Git processes that the copy step itself requires, so every conforming copy run fails** (revise)

- [Observed] REQ-046's falsifier (line 223) keeps v1.1's first arm without a subject: "A blob is read, or any commit field other than the root tree, parents and committer date is used, before a confirmed phrase or in-force records".
- [Observed] Its oracle independence (line 222) captures object reads by "an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read".
- [Observed] REQ-047 (line 244) requires, before the question, a fetch and a detached checkout.
  - In the operator's clone, Git's `pack-objects` reads every blob of the pinned tree, plus any delta bases. Line 246 states this.
  - In the copy, `index-pack` inflates and hashes every blob, and `checkout` reads every blob to write the working tree.
  - All of this happens before any phrase.
- [Inferred] So a read-logging layer under either clone records blob reads before the answer in every conforming run that makes a copy, and the arm trips.
- [Observed] The same conflict appears in three other places:
  - the new arm "before the answer Syzygy reads anything of a clone that the pre-answer list does not name" (line 223);
  - the scenario "Existing full clone at the trunk tip", "Syzygy reads no object of the operator's clone" (line 301 ff.);
  - REQ-047's oracle independence (line 363), which takes "Syzygy's reads of the operator's clone" from "a read-logging layer outside the code under test".
- [Inferred] No clause says the reads of the Git processes Syzygy starts for the copy are not Syzygy's reads, and no oracle says how a read-logging layer separates the two.
  - REQ-047 says only "Syzygy uses nothing Git read but the copy it produced", which is a use rule, not a read rule.
  - The question's "Syzygy has read none of its blobs" relies on that same unstated distinction.
- This is round 3 finding 1's class (a falsifier that a conforming implementation trips), reopened in a new place by the redesign.
- Repair I would accept:
  - In REQ-046, state that reads made by the Git processes REQ-047 starts to make the copy are not Syzygy's reads for the pre-answer list and the blob arm.
  - Scope the blob arm and the new pre-answer arm to Syzygy's own reads.
  - State in both oracle-independence lines that reads are attributed by process. For example, the read-logging layer records Syzygy's in-process reads, and the independent process capture records the copy's Git processes, whose reads are checked only against REQ-047's copy rules.

**Finding 2 — The run that keeps every predecessor meaning is keyed on HEAD, the copy rule is keyed on the pinned revision, and the preamble's two classes now overlap** (revise)

- [Observed] The preamble (line 3) and REQ-047's read-list exemption (line 246) both exempt a run "whose clone's HEAD is a revision that an in-force observation consent made by any other act names, and for which the in-force records already hold every consent and statement … so that no question is asked".
- [Observed] The copy rule (line 242) is keyed differently: "Every run this requirement pins … SHALL run on a copy unless an in-force observation consent made by another act names its pinned revision".
- First divergence, with `--revision`. Take a full redis clone whose HEAD is at a commit the redis consent names, run with `--revision X`, where X is a trunk tip whose launch observation consent, drawer statement and provider statement are all in force.
  - No question is asked.
  - The preamble says the run "keeps every predecessor requirement's bytes and meaning".
  - REQ-047 exempts it from the closed list of reads of the operator's clone.
  - Yet the copy rule makes it copy, and it relies on launch records.
  - [Inferred] A copy run with no read limit on the operator's clone is exactly what the closed list exists to prevent.
- Second divergence, with no `--revision`. v1.1's preamble excluded runs "that neither relies on nor records a launch consent record"; v1.2 drops that clause.
  - Take a run at a redis-consented HEAD that relies on a launch-recorded provider or drawer statement from an earlier trunk-tip launch. No question is asked.
  - That run is now both "a launch-consented run, meaning a run that relies on or records any launch consent record" (same paragraph) and a run that "keeps every predecessor requirement's bytes and meaning".
  - [Inferred] It is then unclear whether, for example, REQ-046's disclosure "that the consents were recorded at launch, with each record's identity and its recording commit" (line 37) binds it. D1's rationale ("relies on or records … is only known after the question") does not hold for a run that asks no question: what it relies on is read from in-force records at launch.
- Round 2 finding 1's concern (a consented-HEAD exemption swallowing launch runs) survives here in a narrower form.
- Repair I would accept: key the exempt run on the pinned revision, the copy rule's own condition, in the preamble and in line 246. Restore "and that neither relies on nor records a launch consent record", which is decidable at launch for a run that asks no question. Then add a scenario for the `--revision` case.

**Finding 3 — D9 and the owner page leave a contradicted registry field unnamed, and present v1.1's reference and URL reads as new conflicts** (revise)

- [Observed] The entry's `typedAuthority.stateDirectoryWrites` reads: "Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; nothing is written to the clone, the observed repository, its forks or its tracker".
- [Observed] Under v1.2 the copy is created before the run's state directory exists:
  - launch records are "written before the run's state directory is created" (line 35), and the copy precedes the question (line 244);
  - the copy goes in "a directory Syzygy creates for it" (line 35);
  - from then on it is "the clone that REQ-polaris-generation-033 to 036 name" (line 254), which Syzygy fetches into, checks out and removes.
- [Inferred] That contradicts both halves of `stateDirectoryWrites`. Neither D9 (SEMANTIC-DELTA.md lines 622–650) nor "Before you sign" item 1 (OWNER-SIGNOFF.md lines 112–121) names it. D9's successor scope ("admits the copy step, its environment and the pre-copy reads D3 lists") does not clearly include the write.
- [Observed] `tags` reads "never read; the pinned identifier must name a commit object". The annotated-tag path now brings a tag object into the copy and reads its type there. That is arguably a contradiction too, and it is also unnamed.
- [Observed] D9 lists "Syzygy reads references and remote URLs of the operator's clone" as a conflict of the redesign. OWNER-SIGNOFF.md line 116 says "The redesign … reads your references and remote URLs".
  - v1.1, as signed, already read "the clone's references" before the answer and derived the identity from the remote URL. v1.0's design §5 reconciled that with the entry only for the fetch form.
  - D9 also withdraws the reading that "no ref" covers only object reads, yet says §5's fetch-form reading "still governs the run that makes no copy", which still makes those reads (line 246).
  - [Inferred] Either those reads conflicted with the entry before v1.2 (so the conflict predates this version and is unstated), or they do not conflict (so they should not be listed as the redesign's).
- Repair I would accept:
  - Name `stateDirectoryWrites` (and `tags`, or say why it is not contradicted) in D9, IMPACT-LEDGER and "Before you sign" item 1.
  - Say whether the reference and remote-URL reads are new to v1.2 or carried from v1.1. If they are carried, say how the entry treats them for v1.1 runs and for the no-copy run.

**Finding 4 — The owner page and the ledger place the copy in "Syzygy's state directory" and imply it persists, which the spec neither says nor orders** (note, editorial)

- [Observed] OWNER-SIGNOFF.md line 108 says "Each run keeps one commit's files in Syzygy's state directory". IMPACT-LEDGER.md lines 165–166 say the copy is written "to Syzygy's state directory".
- [Observed] The spec puts the copy in "a directory Syzygy creates for it" (line 35), made before the question and so before the run's state directory (line 35). It states removal only "Where the run ends before its brief" (line 244), and says nothing of the copy after a completed run.
- Repair: say where the copy lives and when, if ever, a completed run's copy is removed, or align the two pages with the spec's wording.

**Finding 5 — D3 and the owner page say the governance-home check is read from the copy; the spec says it concerns the operator's clone** (note, editorial)

- [Observed] SEMANTIC-DELTA.md line 388: "Every object read, including the pinned commit object and the governance-home check REQ-046 makes before the answer, is made in the copy".
- [Observed] OWNER-SIGNOFF.md lines 96–97: "The question needs the commit's date and the governance home, which Syzygy reads from the copy".
- [Observed] Line 254 of the spec: "REQ-polaris-generation-046's identity rule, its check of the governance home and its statement about the clone's configuration concern the operator's clone". The check at line 31 is a path comparison of the working tree, Git directory and common Git directory, not an object read.
- Repair: correct both sentences, or say which governance-home read (if any) is made in the copy.

**Finding 6 — The scenario "Clone with an alternate" drops the list's "where the run makes a copy"** (note, editorial)

- [Observed] Line 251 refuses an alternates file "where the run makes a copy". The scenario at line 328 refuses for any run "WHEN the operator's clone has an `objects/info/alternates` file".
- [Inferred] A no-copy run (another act's consent) is bound by its consent's form and REQ-033 instead, so the scenario as written over-asserts.
- Repair: add "in a run that makes a copy" to the WHEN.

**Finding 7 — A SHA-256 clone cannot be copied into the required form, and the narrowing is undisclosed** (note, for the owner)

- [Observed] Fixture: fetching a SHA-256 commit from a SHA-256 source into a default `git init --template=` copy fails with "couldn't find remote ref".
- [Observed] A SHA-256 copy would need `repositoryformatversion = 1` and an `extensions` key. `clone-shape.ts` (`CORE_KEYS`: `repositoryformatversion` `/^0$/`; no other section) refuses both, and the copy must take "the form that one commit fetched alone into an empty repository and checked out detached leaves" (line 244).
- [Observed] The signed entry's `readAuthority` admits SHA-256 ("64 SHA-256"). IMPACT-LEDGER's "Behaviour that changes" does not list SHA-256 clones as refused.
- Repair: disclose the refusal in the ledger and on the owner page, or state the object format of the copy's empty repository.

**Finding 8 — A launch observation consent recorded under v1.1 says its objects are "held in the operator's own clone, with no fetch by Syzygy", while v1.2 makes every repeat run at that revision copy** (note, for the owner)

- [Observed] v1.1's record scope (SEMANTIC-DELTA Change 6, "Current") says "held in the operator's own clone, with no fetch by Syzygy".
- [Observed] Line 242 makes "the run its first sentence pins included" run on a copy unless another act's consent names the revision. The scenario at line 308 makes a repeat run at a launch-consented HEAD copy.
- [Observed, local refs only] No `launch-consent-records` reference exists in this checkout, so no such record is known today.
- [Inferred] If v1.1 is used before v1.2 is signed, a v1.2 repeat run would rely on a consent whose recorded scope names a different holding and no fetch. Nothing in the package says the v1.2 scope reading reaches those records.
- Repair: one sentence in D1 or the ledger saying how a v1.1-scoped launch consent is read under v1.2.

**Finding 9 — Earlier concerns: rounds 1–3 are answered or superseded, except the two that the redesign reopens above** (note)

- [Observed] Round 3 findings 2 to 6 are answered by the redesigned text, as ROUND-3-DISPOSITIONS.md says:
  - the binding population is set at launch;
  - the pre-answer list is scoped to the clones;
  - the pack-storage allowance and the base-chain read are gone;
  - the gitfile and common-directory locator files are listed.
- [Inferred] Round 3 finding 1's class reappears as Finding 1, and round 2 finding 1's class as Finding 2.
- [Observed] The URL half shows no surviving round-1 or round-2 concern:
  - the scp form, `packed-refs` and credential rules hold;
  - the `Upstream:` match effect is stated;
  - the port-and-case merge is put to the owner.
