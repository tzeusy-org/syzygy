# Round 4 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 4
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-4-RAW.md`) read commit
> `35015c5e` and returned `REVISE` (line 4): three revise findings and six
> notes. It was the first review of the owner's redesign. The coordinating
> session treats the redesign as a fresh sequence, so round 4 is its first
> round, and after two more `REVISE` verdicts the package goes to the owner.
> This page says how each finding was disposed. Line numbers are those of
> the post-apply spec of the commit that carries this page. Nothing here is
> a review or a verdict on the repairs; round 5 decides that.

After the repairs, every sentence, scenario and falsifier arm of the
post-apply spec that names the copy, Syzygy's reads, the preamble's classes
or a no-copy run was re-read in context, so that the lists, scenarios and
falsifiers name the same populations.

## 1 — REQ-046's blob falsifier and read-logging oracle catch the copy step's Git processes

**Repaired at the root, as the reviewer proposed.** REQ-046 now says whose
reads its rules bind (line 9):

> These rules bind every read Syzygy itself makes, in process, of either clone. The reads made by the Git processes that REQ-polaris-generation-047 starts to make the copy, in the operator's clone and in the copy, are not Syzygy's reads under this requirement: REQ-polaris-generation-047's copy rules alone govern them, and Syzygy SHALL use nothing they read but the copy they produce.

- The blob arm now opens "Syzygy itself reads a blob" (line 223), and the
  pre-answer arm reads "before the answer Syzygy itself reads anything of a
  clone".
- The arm "a working tree, index or reference other than the dedicated one
  … changes" now also excepts those of the copy, which the copy step
  creates; that arm had the same conflict.
- REQ-046's oracle independence attributes reads by process (line 222): the
  read-logging layer records Syzygy's in-process reads, and an independent
  process capture records the copy's Git processes, checked only against
  REQ-047's copy rules. REQ-047's oracle independence says the same
  (line 373).
- The scenario "Existing full clone at the trunk tip" now says "Syzygy
  itself reads no object of the operator's clone" (line 305), and REQ-047's
  read-list arm reads "Syzygy itself, in process, reads".

What Syzygy itself may read before the answer is unchanged: the list, the
blob rule and the storage rule are the same words.

## 2 — The exempt run is keyed on HEAD, the copy rule on the pinned revision, and the classes overlap

**Repaired, taking the reviewer's repair with one difference.** The preamble
now partitions the runs on conditions known at launch, both keyed on the
pinned revision (line 3):

> Runs in that mode fall into two classes, decided at launch. A run whose pinned revision an in-force observation consent made by any other act names, and for which the in-force records other than launch consent records already hold every consent and statement REQ-polaris-generation-033 requires, so that it asks no question and neither relies on nor records a launch consent record (an observation consent, a drawer statement or a provider statement recorded at launch), keeps every predecessor requirement's bytes and meaning. Every other run is a launch-consented run, whether it then relies on or records a launch consent record or ends before either; for it, this change reads, and in one place displaces, the predecessor text each requirement names, and only that text.

- The reviewer's restored clause "neither relies on nor records a launch
  consent record" is there, made decidable at launch by "the in-force
  records other than launch consent records already hold every consent and
  statement".
- The difference: "launch-consented run" now names every other run,
  including one that ends in a refusal or a decline, so the two classes
  cover every run with no overlap. Round 3 finding 2 asked for exactly that
  binding.
- REQ-047's read list now binds "every launch-consented run" (line 246), so
  its exemption is the preamble's class, not a second wording.
- The copy rule keeps the pinned-revision condition (line 242), so every
  exempt run makes no copy.
- The reviewer's `--revision` case is a new scenario, "Revision with launch
  records while HEAD is at another act's revision" (line 313): a
  launch-consented run that copies and reads only what REQ-047 lists.

## 3 — D9 and the owner page leave a contradicted registry field unnamed, and present v1.1's reads as new

**Repaired.** D9 now reads the entry's `typedAuthority` field by field, in
a table:

- `fetch`, `readAuthority` and `stateDirectoryWrites` are contradicted;
- `tags` is arguably contradicted;
- `networkAccess`, `executeObservedCode`, `workingTreeRead` and
  `submodules` are not.

It names the successor's scope against each contradicted field. The
reference and remote-URL reads are now stated as carried from v1.1. They
are launch reads that v1.0 and v1.1 already make, read as outside the
adapter's object reads, and v1.2 neither withdraws nor widens that reading
in kind. The earlier draft's withdrawal of that reading is reversed, and
the reads v1.2 adds in the same class are listed. The impact ledger and
"Before you sign" item 1 name the same four fields and say the reference
reads are not new.

## 4 — The owner page and the ledger place the copy in "Syzygy's state directory"

**Repaired, in the spec and the pages.** The spec now says where a
completed run's copy goes (line 244): "Otherwise the copy is the run's clone
for the rest of the run and is kept after it, outside the run's state
directory, until the operator removes it; the launch output SHALL name its
location and say so." The REQ-047 falsifier gains the matching arm. The
owner page and the ledger now say "a directory of Syzygy's own, outside the
run's state directory". D9 names this write under `stateDirectoryWrites`.

## 5 — D3 and the owner page say the governance-home check is read from the copy

**Repaired.** The governance-home check is a comparison of the operator's
clone's paths with the governance home's, as the spec says. D3 now says so,
and that the object reads the question needs (the commit object and the tree
listing) are made in the copy. The owner page now says the question needs
"the commit's date and its file list".

## 6 — The scenario "Clone with an alternate" drops "where the run makes a copy"

**Repaired as proposed.** The WHEN now ends "in a run that makes a copy"
(line 338 ff.).

## 7 — A SHA-256 clone cannot be copied into the required form (for the owner)

**Carried to the owner, and disclosed.** "Before you sign" item 4 states it
plainly: a SHA-256 clone fails the copy and the launch is refused, which
narrows what the signed entry admits. The owner may accept that, or ask for
the copy to take the clone's object format, which would also change the
one-commit check and need a review round. D2's refusals and the ledger's
"Behaviour that changes" list it. The spec is not changed. Its form rule
already makes the refusal, and stating an object format would be the owner's
second option.

## 8 — A launch consent recorded under v1.1 says "no fetch by Syzygy", while v1.2 copies every repeat run (for the owner)

**Repaired in the spec, so that such runs stay in the operator's clone, and
carried to the owner.** A local copy is a fetch, so copying under a consent
whose recorded scope says "with no fetch by Syzygy" would exceed it. The
copy rule now excepts a run whose pinned revision is named by "an in-force
launch observation consent whose recorded scope holds that revision in the
operator's own clone with no fetch by Syzygy, the scope version 1.1 of this
change recorded" (line 242). Such a run works in the operator's clone, as
under v1.1.

- Where only such a consent covers the run, the clone must be in the
  one-commit form, checked before asking, and a full clone is refused,
  naming the reason. In-place reads of a full clone, the class rounds 1 to 3
  found unsound, therefore never return.
- A scenario pins this: "Repeat run under a launch consent recorded by
  version 1.1" (line 318).
- The repeat-run scenario for this version's records now names their scope.
- REQ-047's Case and falsifier cover both scopes.
- "Before you sign" item 5 states the consequence plainly.

[Observed, local refs only] As the reviewer found, no such record exists in
this checkout.

## 9 — Earlier concerns: rounds 1 to 3 answered or superseded, except the two reopened above

**Noted; nothing further to repair.** The two reopened classes are findings
1 and 2 above, repaired at the root. The URL half is unchanged.
