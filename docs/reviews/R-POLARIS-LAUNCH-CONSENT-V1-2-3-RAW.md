Review: R-POLARIS-LAUNCH-CONSENT-V1-2-3
Reviewed commit: 3ab7c949f252af33783898df2f073f684f2d6bb8
Manifest SHA-256: 8637c7a53283f0e265d4af28ca49332b99171b9b80c31fd830b33d8d7be38b2d
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh-context reviewer, read-only. I worked on a detached worktree of the reviewed commit at `/home/orca/.tmp/reviews/rv812c`, with TMPDIR set to `/home/orca/.tmp/reviews/tmp812c`. I edited no tracked file, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external. I rebuilt the round-2 post-apply bytes in a scratch `git init` repository under that TMPDIR. Afterwards I removed the worktree and the temp directory. `git worktree list` shows no `rv812c`.

Subject. [Observed] I ran `sha256sum` and got these values:
- installed v1.1 spec: `95172020…`;
- `proposed/spec.md.patch`: `92d0b169…`;
- post-apply spec (computed in Python): the digest in the head above.

All three equal `PROPOSED-SUBJECTS.json`. `git diff --stat`: 1 file, 138 insertions, 16 deletions. Line numbers below are those of the post-apply spec, which has 367 lines.

## Summary of what holds

- [Observed] Criterion 13.
  - Before apply, `--check` passes:
    - v1.0 (`build_polaris_dossier_launch_consent.py`): "applied";
    - v1.1: "applied";
    - v1.2: "unapplied".
  - `--selftest` passes for v1.0 (25 fixtures), v1.1 (30) and v1.2 (31), each with 0 failing.
  - `record_versioned_signoff.py --selftest` passes 175 fixtures, 0 failing.
  - After apply, all three builders' `--check` fail with "the tree carries the v1.2 patch, which no sign-off record covers".
  - `check_governance.py` on the applied tree gives 32 OK, 21 WARN, 0 FAIL (53 checks).
- [Observed] Criterion 9. I re-ran the seven published forms in Python `re`, IGNORECASE, OR'd together, over `git ls-tree -r -z` at `715c59c4`. Five of the six populations reproduce:
  - specs: 9 files, 1 with a hit;
  - decisions: 217 / 13;
  - policies: 12 / 3;
  - declarations: 2 / 1;
  - design and proposal of the two dossier changes: 4 / 2.
  - I did not re-run the v8 and write-consent population.
  - The sweep section is unchanged in substance since round 2.
- [Observed] Criterion 15, quotation presence. Every quotation in `ROUND-2-DISPOSITIONS.md` occurs in the post-apply spec, at the line the page gives or as a multi-line block starting at that line.
  - `ROUND-1-DISPOSITIONS.md` quotes the bytes of `82399c9b` and says so (lines 6–9). Six of its sixteen quotations no longer occur verbatim after round 2's repairs. That is disclosed and is not a defect.
- [Observed] Round-2 findings, judged against the bytes.
  - Finding 1 is resolved on its own terms.
    - Line 238 now reads "changes nothing else in how the revision of such a run is pinned".
    - The mixed case is decided at line 244 ("whether or not the run also relies on or records a launch consent record").
    - The same choice appears in the scenario (lines 345–348), in the falsifier and on the owner page.
    - The repeat-run scenario is added (lines 339–343).
    - Finding 2 below is the gap that the new "and bind no other run" opens.
  - Finding 2 is resolved: line 11 says "reads none of it as content", line 37 says "read none as content", and the accuracy arm is at line 223.
  - Finding 3 is resolved. The type read is named:
    - at line 249 (base-chain headers included);
    - at line 9 (pre-answer);
    - at line 238, as "A name that resolves";
    - and both 047 falsifier arms carve it out.
    - Finding 1 below is the sibling gap: the falsifier carves out the type read but not the delta-base read.
  - Findings 4, 5 and 6 are resolved, at lines 17 and 248 and in `SEMANTIC-DELTA.md` "What does not change".
- [Inferred] I did not re-test criteria 2, 4, 8 and 11 beyond round 2's results. The hunks touched since `82399c9b` do not change the derivation sentence, the ruling text or the change class.

## Findings

**Finding 1 — The objects bullet, the falsifier and the full-clone scenario carve out only the type read, so a conforming delta-base reconstruction breaks all three** (revise)

- [Observed] Line 246 (objects): "save the type read below, Syzygy SHALL read no parent commit object and no object reached only from another commit, a branch, a tag, the stash, a reflog or a note".
- [Observed] Line 247 (pack storage) permits the opposite: "Syzygy MAY read the stored bytes of the delta's base, whichever object they belong to, solely to reconstruct that object".
- [Observed] REQ-047's falsifier (line 356) carves out the type read alone: "Syzygy reads a parent commit object, an object reached only from another commit or reference other than by the type read this requirement lists".
- [Observed] The scenario "Existing full clone at the trunk tip" (line 299) says: "the objects read are the pinned commit, its root tree and the trees and blobs reachable from it, with no parent commit object".
  - The Case (line 352) includes clones "packed with deltas whose bases lie outside the pinned tree".
  - REQ-046's oracle independence (line 222) logs "each object identifier and type read".
- [Inferred] In a real full clone, a tree or blob of the pinned tree is commonly stored as a delta against a version reachable only from an older commit. Commits can be deltified too, so the base may be a parent commit object.
  - A conforming implementation that uses line 247's allowance reads those bases.
  - The read log then records an object outside the scope.
  - That fails the scenario's THEN and the falsifier arm, and it breaks line 246's "SHALL".
- [Inferred] This is the same pattern as round-2 Finding 3. The repair carved the type read out of the arms and the objects bullet but not the pack-storage allowance that the same list grants.
- [Observed] The owner page has the same gap. `OWNER-SIGNOFF.md:28` says "It never reads a parent commit".
- Repair I would accept:
  - Line 246: "save the type read and the pack-storage allowance below".
  - The line-356 arm: "other than by the type read or the pack-storage allowance this requirement lists".
  - Line 299: "the objects read as content are …".
  - Owner page: "never reads a parent commit as content".

**Finding 2 — "and bind no other run" takes every launch that ends in a refusal or a decline outside REQ-047's clone-form and read rules, including the refusals those rules themselves require** (revise)

- [Observed] Line 238 (new): "The rules below on the clone's form, on Syzygy's reads of the clone and on the statements they require bind every launch-consented run, whichever of these branches pinned its revision, and bind no other run."
- [Observed] Line 253 says: "A run that neither relies on nor records a launch consent record is bound by none of these rules".
- [Observed] Line 3 defines a launch-consented run as one "that relies on or records any launch consent record". That is an outcome of the run, and it is not known while the reads happen.
- [Inferred] The runs left out are those that go through REQ-047's trunk branch, or ask REQ-046's question, and then record nothing:
  - the phrase is wrong or missing;
  - every record is declined;
  - the write consent is absent;
  - the repository is not declared public;
  - the identities disagree;
  - the run is refused before asking.
- [Inferred] For those runs, these rules bind nothing:
  - "SHALL start no process that reads or acts on the clone" (line 251);
  - "SHALL NOT fetch, prune, repack or otherwise change it" (line 244; fetch alone is still barred elsewhere, at lines 17 and 240);
  - the reftable refusal, "SHALL be refused before asking for consent, naming the reason" (line 248);
  - the missing-object refusal (line 253).
- [Inferred] The two refusal rules defeat themselves.
  - Any run they make refuse records nothing, so by line 253 it is a run they do not bind.
  - So an implementation that refuses a reftable clone for some other reason (for example "no trunk", naming `--revision`) breaks no rule that binds that run.
  - The scenario "References in the reftable backend" (lines 334–337) therefore tests a rule that binds no run inside it.
  - The owner page states the refusal without that condition (`OWNER-SIGNOFF.md:30`).
- [Observed] REQ-046's pre-answer list (line 9) and its falsifier (line 223) still limit what such a run reads before the answer. They do not reach process start, prune or repack, or the reason a refusal gives.
- Repair I would accept:
  - Bind the clone-form, read and statement rules to every launch-consented run and to every run that REQ-047's trunk branch pins or REQ-046 asks or refuses before asking.
  - Keep "no other run" for a run at a HEAD another act's consent names that neither relies on nor records a launch consent record.
  - Align line 253, the falsifier's last arm, `SEMANTIC-DELTA.md:250-256` and the IMPACT-LEDGER REQ-047 row.

**Finding 3 — REQ-046's pre-answer list is closed to clone reads only, yet the question it serves needs governance-home reads, and the falsifier forbids them** (revise)

- [Observed] Line 9 (closed by this change; v1.1 read "read only what the question needs, and SHALL read it as Git objects by object identifier:"): "Before the answer Syzygy SHALL read only what the question needs, and only these:". It is followed only by reads of the clone.
- [Observed] The falsifier arm added by this change (line 223): "before the answer Syzygy reads anything the pre-answer list does not name".
- [Observed] The same requirement needs, before the answer, reads the list does not name:
  - "every existing record for the same repository identity, its state and its act" (line 11). These are launch consent records read "only from that reference's commits" of the governance home (line 27), and other acts' observation consents.
  - the `Upstream:` URL of an observation consent made by another act (line 17);
  - the write consent, since "Absent that consent, Syzygy SHALL ask nothing" (line 33);
  - the effective classification policy that computes the preview classes (line 9).
- [Inferred] A conforming implementation therefore breaks line 9's SHALL. The arm at line 223 does not fire in practice only because the oracle logs reads of the clone alone (line 222). That is an accident of the oracle, not a scope the text states.
  - This is the "absolute statement contradicted by the spec's own lists" class, introduced by the round-1 Finding 1 repair.
- Repair I would accept:
  - Scope both sentences to the clone: "Of the clone, before the answer Syzygy SHALL read only …" and "before the answer Syzygy reads anything of the clone the pre-answer list does not name".
  - Or add the governance-home reads (the records, the write consent and the policies, read as REQ-033 permits) to the list.

**Finding 4 — The pack-storage allowance names one base, and its reads are not by object identifier** (note, editorial)

- [Observed] Line 247 says "the stored bytes of the delta's base", singular. The type item (line 249) names "the headers of the entries of its base chain".
- [Observed] Line 244 says "The object reads are Git object reads by object identifier". An OFS_DELTA base is located by pack offset.
- [Inferred] A reader may take the contrast to exclude bases beyond depth one, which are routine in packed history. Rebuilding then reads stored bytes that no clause names.
- Repair I would accept:
  - "the stored bytes of each base in the delta's chain, located by offset or identifier".
  - Carry the same words into line 21's recorded scope and line 9's "each rebuilt from a delta base".

**Finding 5 — The question's statement of what Syzygy reads omits two reads REQ-047 permits, which the accuracy arm counts** (note, editorial)

- [Observed] The statement (line 11) lists "the reference names and values, the loose object file names and pack indexes, the configuration lines and the Git-directory files that REQ-polaris-generation-047 lists, the type of an object a `--revision` name resolves to, and delta-base bytes".
- [Observed] REQ-047 also permits two reads the statement does not name:
  - "the bytes of other references' values" read with `packed-refs` (line 248);
  - the base-chain entry headers of the type read (line 249).
- [Observed] The accuracy arm (line 223) trips when "its statement of what Syzygy reads beyond the pinned tree omits a read REQ-polaris-generation-047 permits".
- [Inferred] Read strictly, the statement the requirement mandates trips the arm.
- Repair I would accept: add "the other values stored in `packed-refs`, used for nothing" and "the headers of a non-commit's base chain" to the statement, or bound the arm to reads used for something.

**Finding 6 — "nothing in the working tree" and the Git-directory locator file** (note, editorial)

- [Observed] Line 250 permits "the files that locate the Git directory and the common Git directory". Line 251 says "nothing in the working tree".
- [Inferred] For a linked worktree or a clone with a separate Git directory, the locating file is the `.git` gitfile at the working tree's root.
- Repair I would accept: "nothing else in the working tree, save the `.git` file that locates the Git directory".
