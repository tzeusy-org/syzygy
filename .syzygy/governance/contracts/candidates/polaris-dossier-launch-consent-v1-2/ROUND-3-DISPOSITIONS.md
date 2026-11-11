# Round 3 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 3
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-3-RAW.md`) read commit
> `3ab7c949` and returned `REVISE` (line 4): three revise findings and three
> editorial notes, all in the full-clone reading design. Round 3 was the last
> before the stopping rule, so the package went to the owner, who chose a
> redesign on 2026-11-10 (the direction record
> `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`, section "Redesign after
> review round 3"). In the redesign, Syzygy copies the pinned commit from the
> operator's clone into a one-commit clone of its own over Git's local file
> transport, and the signed read rules apply to the copy.
>
> Every finding is therefore **superseded by the redesign**, not repaired in
> place. Each section says where its concern lands in the redesigned text.
> Line numbers are those of the post-apply spec of the commit that carries
> this page. Nothing here is a review or a verdict; round 4, a fresh review
> of the redesign, decides that.

## 1 — The objects bullet, the falsifier and the full-clone scenario carve out only the type read

**Superseded.** The objects bullet, the pack-storage allowance and the
type-read item are gone. Syzygy reads no object of the operator's clone in a
run that makes a copy, so it reads no delta base. Git reads delta bases when
it serves the copy, and that is disclosed, not carved out (line 246):

> To make the copy, Git reads the operator's clone: its configuration, which Git's serving side honours, its references, and its object store, the stored bytes of delta bases outside the pinned commit's objects included. Syzygy uses nothing Git read but the copy it produced.

The scenario "Existing full clone at the trunk tip" now says that Syzygy
"reads no object of the operator's clone". The sign-off page no longer
claims Syzygy never reads a parent commit; it says Git reads the object
store to build the copy.

## 2 — "and bind no other run" takes refused and declined launches outside the rules

**Superseded.** The binding population is no longer "launch-consented run",
which is known only from the outcome. It is fixed at launch:

- the copy step binds every run REQ-047 pins, unless another act's consent
  names its pinned revision (line 242);
- Syzygy's list of reads of the operator's clone binds every run save the
  one whose HEAD another act's consent names and for which no question is
  asked, a condition the preamble now uses too (lines 3 and 246);
- the reftable refusal sits in that list and applies before any Git process
  starts (line 249), and the alternates refusal applies wherever a copy is
  made (line 251).

So a run that ends in a refusal or a decline was bound by these rules while
it ran, and the refusals no longer defeat themselves.

## 3 — REQ-046's pre-answer list is closed to clone reads only, yet the question needs governance-home reads

**Superseded, taking the reviewer's first repair.** The list is now scoped
to the clones (line 9):

> Before the answer Syzygy SHALL read of the clones only what the question needs, and only these:

The falsifier arm is scoped the same way (line 223): "before the answer
Syzygy reads anything of a clone that the pre-answer list does not name".
Reads of the governance home, the write consent and the policies stay as
REQ-033 and REQ-046 already permit them.

## 4 — The pack-storage allowance names one base, and its reads are not by object identifier

**Superseded.** The pack-storage allowance is gone. Syzygy reads no packed
object of the operator's clone in a run that makes a copy; Git rebuilds
objects from their delta chains when it serves the copy, and the copy's
objects are then read by identifier under REQ-033 unchanged.

## 5 — The question's statement of what Syzygy reads omits two reads REQ-047 permits

**Superseded.** The statement no longer enumerates read classes. It names
Syzygy's reads of the operator's clone as "the references, remote names and
URLs and other files REQ-polaris-generation-047 lists", and separately what
Git read (line 11). The base-chain header read is gone. The other values in
`packed-refs` are read with the references REQ-047 lists, and REQ-047 says
they are used for nothing (line 249).

## 6 — "nothing in the working tree" and the Git-directory locator file

**Superseded.** The "nothing in the working tree" sentence is gone. The
first item of REQ-047's list names "the `.git` file or directory and the
files that locate the Git directory and the common Git directory" (line
248), which covers the gitfile of a linked worktree or a separate Git
directory.
