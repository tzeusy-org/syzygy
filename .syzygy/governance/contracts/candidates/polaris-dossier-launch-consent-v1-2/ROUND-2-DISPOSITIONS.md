# Round 2 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 2 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-2-RAW.md`) read commit
> `82399c9b` and returned `REVISE` (line 4): three revise findings and three
> editorial notes. This page says how each was disposed. Every quotation
> below is copied by script from the post-apply spec of the commit that
> carries this page; the line numbers are that file's. Nothing here is a
> review or a verdict on the repairs; round 3 decides that.

After each repair, every sentence of the post-apply spec naming the changed
clause was re-read by a script that prints each occurrence of "read none",
"reads none", "reads nothing", "type read", "nothing else", "neither relies",
"states the clone's form" and "pack indexes" in context, and both falsifiers
were re-read whole. Two follow-on gaps found that way were repaired in the
same pass and are named under findings 2 and 3.

## 1 — "Changes nothing else for it" exempts repeat launch runs, and the mixed run's rules conflict

**Disposed: repaired as the reviewer proposed, taking the first way for the
mixed case.** REQ-047's first branch is narrowed to the pin, and the rules
that follow are bound to every launch-consented run and to no other
(line 238):

> SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else in how the revision of such a run is pinned. The rules below on the clone's form, on Syzygy's reads of the clone and on the statements they require bind every launch-consented run, whichever of these branches pinned its revision, and bind no other run.

For the mixed case, a run relying on another act's consent that states the
clone's form, that form binds whether or not the run also relies on or
records a launch consent record
(line 244):

> form between, save that where the run relies on an observation consent made by another act whose record states the clone's form, that stated form binds the run, whether or not the run also relies on or records a launch consent record. Except as such a stated form requires, Syzygy SHALL NOT refuse the clone for holding commits, objects or references beyond the pinned revision; it SHALL NOT fetch, prune, repack or otherwise change it.

The paragraph's closing sentence matches the preamble's population
(line 253):

> A run that neither relies on nor records a launch consent record is bound by none of these rules on the clone's form, Syzygy's reads and the statements, and whatever form its observation consent record states for the clone still binds it.

[Inferred] The other way the reviewer offered, letting a stated form yield
once a launch record exists, would reach a performed act's stated scope, so
it is the owner's alone and is not drafted (`SEMANTIC-DELTA.md` D1). Aligned
in the same pass:

- the scenario "A consent that states the clone's form" now says "whether
  or not it also relies on or records a launch consent record";
- the falsifier's last arms add the same words and a new arm, "a
  launch-consented run whose HEAD an in-force consent names lacks a read
  limit or a statement this requirement sets for launch-consented runs";
- the falsifier's clone-refusal arm is limited to "a launch-consented run
  that relies on no consent stating the clone's form", so a refusal the
  stated form requires no longer trips it;
- the owner page now says the redis consent's rule holds "for every run
  made under it, including one that also records a launch statement", and
  D1 says the same.

The reviewer's requested scenario is added
(line 341):

> - **WHEN** a run with no `--revision` starts on a full clone whose HEAD is a revision an in-force launch observation consent names
> - **THEN** Syzygy pins that HEAD and asks nothing, and its reads of the clone are only those this requirement lists
> - **AND** the launch output, the run record and every page carry the delta-base and working-tree statements, and every brief and packet issued to an agent session carries the history instruction

## 2 — "Syzygy reads none of it" is false under the closed list

**Disposed: repaired as the reviewer proposed.** The question's statement
is bounded to content and lists what Syzygy does read beyond the pinned
tree
(line 11):

> that no consent covers what the clone holds beyond the pinned revision as content, and that Syzygy reads none of it as content: beyond the pinned commit and the trees and blobs reachable from its root tree, Syzygy reads only the reference names and values, the loose object file names and pack indexes, the configuration lines and the Git-directory files that REQ-polaris-generation-047 lists, the type of an object a `--revision` name resolves to, and delta-base bytes inflated only to rebuild objects of the pinned tree;

The run record and pages give the same statement
(line 37):

> which no consent covers as content and of which Syzygy read none as content, with the statement the question gives of what Syzygy reads beyond the pinned tree;

"No consent covers … as content" now agrees with the recorded scope's
delta-base allowance, which allows inflation only to rebuild, never a read
as content. REQ-046's falsifier gains the accuracy arm
(line 223):

> the question, the run record or a page states that Syzygy reads nothing beyond the pinned revision, or its statement of what Syzygy reads beyond the pinned tree omits a read REQ-polaris-generation-047 permits;

The owner page and D5 are corrected the same way. **Follow-on gap,
repaired:** the re-read showed that the listing of stored object names
(loose object file names and pack indexes) that resolves a `--revision`
abbreviation was in neither the pre-answer list nor the question's
statement. Both now name it, and REQ-047's lead-in classes it as a launch
read
(line 244):

> The reference, configuration, Git-directory and type reads, and the listing of stored object names in the loose object files and pack indexes that resolves a `--revision` name, are launch reads, not observer object reads

## 3 — The `--revision` refusal read is in neither closed list

**Disposed: repaired as the reviewer proposed.** REQ-047's closed list
names the type read, header-only, base-chain headers included, for an
identifier as well as a reference
(line 249):

> - type: where a `--revision` identifier or reference resolves to one stored object that is not a commit, an annotated tag included, that one object's type, read from its header and, where a pack stores it as a delta, from the headers of the entries of its base chain, inflating no more of any of them than its header, used for nothing but the refusal, and never classified, stored, quoted, recorded, rendered or sent;

The pre-answer list names it too
(line 9):

> and the type read that requirement permits for a `--revision` name that resolves to an object other than a commit;

The refusal sentence now says "a name that resolves", not only "a
reference", and points to the list
(line 238):

> A name that resolves to one stored object other than a commit, a reference naming an annotated tag included, SHALL be refused, naming `--revision`, after Syzygy makes at most the type read listed below, and SHALL NOT be followed to the object it names.

The objects item opens its prohibition with "save the type read below",
and both falsifier arms carve the read out: REQ-046's arm covers it because
the pre-answer list now names it, and REQ-047's two arms read "other than by
the type read this requirement lists" and "more of it or its base chain is
read than the type read this requirement lists". The scenario "Revision
naming an annotated tag" now says "having read no more of that object than
the type read lists". The registry point goes to the owner in "Before you
sign" item 3, which now names this read, and in the ledger.

## 4 — The scp-form clause reads ambiguously

**Disposed: repaired with the reviewer's wording**
(line 17):

> or the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`.

## 5 — "Values only of" cannot hold for `packed-refs` read as file data

**Disposed: repaired as the reviewer proposed**, in the delta-base form
(line 248):

> where reading `packed-refs` also reads the bytes of other references' values, which Syzygy SHALL use for nothing;

## 6 — "What does not change" claims something new for runs the preamble says keep every meaning

**Disposed: repaired.** `SEMANTIC-DELTA.md` "What does not change" now has
two bullets. A run that neither relies on nor records a launch consent
record keeps every predecessor requirement's bytes and meaning, as the
preamble says. The new `Upstream:` URL match is bounded to "a run that
asks REQ-046's question".
