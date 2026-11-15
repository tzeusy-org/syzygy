Review: R-POLARIS-LAUNCH-CONSENT-V1-2-5
Reviewed commit: e004db0040a080b29a722a28ac0162950f98e825
Manifest SHA-256: aa2054a28ce5020bff810e86f7771b0647c51612b5d92f8fdd68ca1051edb42c
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh context, read-only. I worked in a scratch worktree of the reviewed commit and applied `proposed/spec.md.patch` with `git apply`. Line numbers below refer to the post-apply spec unless a package file is named. Scratch fixtures were built under the brief's TMPDIR with no network, then deleted along with the worktree.

## What held

- [Observed] Digests, computed by `sha256sum`, match `PROPOSED-SUBJECTS.json`:
  - v1.1 spec: `95172020…`;
  - patch: `b0a22d1b…`;
  - post-apply spec: the digest above.
- [Observed] The tooling holds on the clean tree:
  - `--check` passes for the v1.0, v1.1 and v1.2 builders.
  - `--selftest` passes for the same builders: 25, 30 and 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest` passes: 175 fixtures, 0 failing.
  - With the patch applied to the tree, the v1.2 `--check` fails as designed ("the tree carries the v1.2 patch, which no sign-off record covers").
- [Observed] The exact blocks in SEMANTIC-DELTA.md match the bytes:
  - all 10 "Current" blocks are substrings of the v1.1 bytes;
  - all 11 "Proposed" blocks are substrings of the post-apply bytes;
  - replacing each Current block with its Proposed block, and inserting Change 5, rebuilds the post-apply spec byte for byte (checked by script).
- [Observed] The rule-9 sweep reproduces at `715c59c4`. I used Python `re`, case-insensitive, with the seven stated forms over `git ls-tree -r -z`. Results: specs 9/1, decisions 217/13, policies 12/3, declarations 2/1, equal to the delta's table.
- [Observed] Quotations checked by script after whitespace normalisation all match their sources:
  - the owner's words, including the trunk-default sentence in `POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md:27`;
  - the registry entry's `fetch`, `readAuthority` (elided with "…"), `stateDirectoryWrites` and `tags`;
  - the redis Scope sentence.
- [Observed] The delta still says plainly (lines 97–100, 494) that the redesign supersedes the in-place design and ruling 2 "Disclose only", and that the owner declined the copy on 2026-11-09.
- [Observed] Round 4's findings 1–8 are each answered in the bytes:
  - Finding 1: the blob arm now reads "Syzygy itself reads a blob"; both oracle-independence lines attribute reads by process; line 9 says the copy's Git processes are not Syzygy's reads.
  - Finding 2: the preamble (line 3) keys both classes on the pinned revision, keeps "neither relies on nor records", and puts a run that ends in a refusal or decline among launch-consented runs. The `--revision` scenario is added (line 313).
  - Finding 3: D9's table names `stateDirectoryWrites` and `tags`, and separates the carried reference and URL reads.
  - Findings 4 and 5: the owner page and the ledger now place the copy outside the state directory, and the governance-home check is a path comparison.
  - Finding 6: the alternates scenario now ends "in a run that makes a copy".
  - Findings 7 and 8: "Before you sign" items 4 and 5, plus line 242's v1.1-scope exception.
- [Observed] Classes and populations agree in the spec:
  - The exempt class (another act's consent plus non-launch records holding everything) is a subset of the no-copy population at line 242.
  - Every copy-making run is launch-consented.
  - REQ-047's list (line 246) binds "every launch-consented run".

## Findings

**Finding 1 — REQ-046 still holds three write and removal absolutes that a conforming copy run breaks** (revise)

- [Observed] Line 35 now permits the copy as a write "in a directory Syzygy creates for it and removes as that requirement states". Line 244 requires Syzygy to make the copy "Before the question" and to "remove the copy" when the run ends before its brief.
- [Observed] REQ-046's falsifier (line 223) keeps the arm "a file is edited or removed". Round 4's repair excepted the copy only in the next clause ("a working tree, index or reference other than the dedicated one and those of the copy … changes").
  - [Inferred] Removing the copy, which line 244 requires on every refusal or decline, removes files. A conforming run therefore trips this arm.
  - This is round 4 finding 1's class (a falsifier that a conforming run trips), moved one clause over.
- [Observed] The scenario "Records already in force" (lines 96–100) reads "THEN Syzygy asks nothing, writes nothing, and names the records the run rests on". Two sibling scenarios describe the same run and say it writes the copy:
  - REQ-047's "Repeat run at a launch-consented HEAD" (line 311): "Syzygy pins that HEAD, makes the copy, and asks nothing".
  - "Revision with launch records while HEAD is at another act's revision" (line 316): "makes the copy, asks nothing".
  - [Inferred] Whenever in-force launch records of this version's scope cover the run, the two requirements' scenarios contradict each other.
- [Observed] The scenario "Write consent absent" (lines 183–187) ends "AND writes nothing outside the run's state directory".
  - Line 33 says "Absent that consent, Syzygy SHALL ask nothing, refuse". Nothing orders that check before the copy.
  - Line 244's removal rule ("Where the run ends before its brief, by a refusal …") presumes a copy can exist at a refusal.
  - [Inferred] A conforming implementation that makes the copy, then refuses for the missing write consent and removes the copy, has written outside the state directory, so this scenario fails.
- Repair I would accept, either of these:
  - Scope the arm to "a file of the governance home is edited or removed". Change "writes nothing" to "writes no record" (or "writes nothing but the copy REQ-polaris-generation-047 makes"). Either require the write-consent check before the copy, or except the copy in the "Write consent absent" AND.
  - Or state once, in REQ-046, that the copy's creation and removal are outside every "writes nothing" or "removed" statement of this requirement.

**Finding 2 — The pre-answer read of the type of the object `--revision` names is a blob read when that object is a blob** (revise)

- [Observed] Line 9 allows, before the answer, "the type of the object `--revision` names" in the copy, then says "It SHALL read no blob".
- [Observed] Line 238 requires a non-commit to be refused "once the copy shows that object's type".
- [Observed] The blob arm (line 223) is "Syzygy itself reads a blob … before a confirmed phrase". Its oracle (line 222) "records each object identifier and type read".
- [Observed] Scratch fixture, with the stated environment (`env -i`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file`, `GIT_NO_LAZY_FETCH=1`, `git init --template=`, then `fetch --depth=1 --no-tags --no-recurse-submodules file://… <blob-oid>`):
  - the fetch exits 0;
  - the copy then holds that blob alone, as a loose object `objects/45/b983be…`;
  - `checkout --detach <blob-oid>` fails with "unable to read tree" (exit 128).
- [Inferred] Reading a loose object's type means inflating that object's own zlib stream. So with a blob identifier, the required type read is a read of a blob before the answer, and the oracle logs it as one. A conforming run trips the blob arm.
- [Inferred] The same fixture shows a second gap: for a blob or tree identifier, the copy step's own detached checkout fails first. The spec does not say which refusal applies, the copy-failure one or the "naming `--revision`" one.
- No scenario covers a blob or tree identifier; only the annotated-tag case (line 348) is pinned, and a tag object is not a blob.
- Repair I would accept, either of these:
  - Refuse a non-commit `--revision` from the failed checkout or the copy's form check, naming `--revision`, without reading the object.
  - Or state that reading the type from the object header of that one object is not a blob read under this requirement, and say so in the blob arm and the oracle.
  - With either, add a scenario for a blob identifier.

**Finding 3 — "the form check above" is ambiguous for a no-copy run under another act's consent that states a form, and the read-list arm is wider than the list** (note, editorial)

- [Observed] Line 246 adds, "for a run that makes no copy, … the files of its Git directory that the form check above reads". The only form *check* stated above is line 242's check for a run "only such a launch observation consent covers". For a run under another act's consent, line 242 says only that its stated form "binds it".
- [Observed] Today `init.ts:178–186` runs `cloneGitDirShape` and `cloneStoreShape` on every run, the redis runs included. Those read:
  - the whole `config`, to refuse non-`[core]` keys;
  - `HEAD`, `FETCH_HEAD`, `logs/HEAD` and `shallow`;
  - every directory listing, and the pack indexes.
- [Inferred] A launch-consented, no-copy redis run (for example, one relying on a launch provider statement) needs those reads. Only a broad reading of "the form check above" lists them. Line 250 separately limits `config` to "read as text only for its remotes' names and URLs".
- [Observed] REQ-047's falsifier arm "Syzygy itself, in process, reads of the operator's clone anything this requirement does not list" (line 374) is not scoped to launch-consented runs. The list it refers to is (line 246).
- Repair: name both form checks (the consent-stated form and the v1.1-scope form) in line 246's addendum, say that the `config` limit yields to them, and scope the arm "for a launch-consented run".

**Finding 4 — The question's removal statement is narrower than the removal rule** (note, editorial)

- [Observed] The question states the copy "is removed if the answer confirms nothing" (line 11).
- [Observed] Line 244 removes it "Where the run ends before its brief, by a refusal or an answer that confirms nothing". That includes a governed subject whose observation consent is confirmed and whose statement is declined (line 25 records the confirmed consent, then refuses a brief).
- [Observed] Line 37 makes the run record and every page repeat "the copy statements the question gives". For a run that asks no question but completes, that includes a removal statement about an answer that never happened. Line 244 says the copy is kept.
- Repair: have the question say "removed if the run ends before its brief", and have the run record state the copy's actual fate.

**Finding 5 — The delta's "One change" section and line 35 still describe a copy-making run outside the launch-consented class** (note, editorial)

- [Observed] SEMANTIC-DELTA.md lines 241–250 name "two stated reaches beyond launch-consented runs". One is "a run REQ-047 pins that records nothing, by a refusal or a decline, still makes and removes the copy".
- [Observed] Spec line 35 reads "For every run that makes the copy …, whether or not it is launch-consented".
- [Inferred] After round 4's repair, the preamble (line 3) makes every run that ends in a refusal or decline a launch-consented run. Every copy-making run is launch-consented, since the exempt class is pinned at another act's revision and makes no copy. Both texts are therefore stale, and line 35's "whether or not" clause is vacuous.
- Repair: update the delta paragraph, and drop or explain the clause.

**Finding 6 — D9's "field by field" table omits four `typedAuthority` fields without saying why** (note, editorial)

- [Observed] SEMANTIC-DELTA.md lines 690–694 cover `fetch`, `readAuthority`, `stateDirectoryWrites`, `tags`, `networkAccess`, `executeObservedCode`, `workingTreeRead` and `submodules`. The entry also carries `authorityType`, `questions`, `databaseAccess` and `writeSurface` (`[]`).
- [Inferred] `writeSurface: []` bears on a Syzygy-made repository written before the state directory, at least as plainly as `workingTreeRead`. The table neither names it nor says it is not contradicted. IMPACT-LEDGER.md line 124 cites D9 as "field by field".
- Repair: add the four fields to the table, with a one-line reason for each.

**Finding 7 — REQ-046's Case does not vary whether the run makes a copy** (note, editorial)

- [Observed] Line 223 adds "for a run that makes a copy, the question, the run record or a page omits a copy statement", and line 222 attributes the copy's Git processes. Yet the Case (line 219) varies neither copy against no-copy (for example, another act's consent naming the pinned revision while a statement is asked) nor the operator's clone's form.
- Repair: add "whether the run makes a copy" to the Case.

**Finding 8 — The owner page says the copy check is "the same check it makes on the clones it makes today"** (note, editorial)

- [Observed] OWNER-SIGNOFF.md lines 31–33: "Syzygy checks that the copy holds one commit and nothing else, the same check it makes on the clones it makes today."
- [Observed] Syzygy makes no clone today. `clone-shape.ts` checks the clone the operator makes, and the registry entry's `fetch` reads "The operator prepares the clone with their own tools".
- Repair: "the same check it makes today on one-commit clones the operator prepares".

**Finding 9 — Earlier concerns: rounds 1 to 4 are answered, except where Finding 1 reopens round 4 finding 1's class** (note)

- [Observed] Round 4 findings 2–8 are answered in the bytes, as "What held" lists.
- [Inferred] Round 4 finding 1 is answered for reads. Its class reappears for writes and removal (Finding 1) and in one read case, the type of a blob (Finding 2).
- [Observed] The URL half shows no surviving round 1 or round 2 concern:
  - REQ-046's derivation sentence is unchanged from v1.1;
  - the credential and non-locator rules hold;
  - the `Upstream:` match stays additive, and the same-named-on-another-host scenario bounds it.
