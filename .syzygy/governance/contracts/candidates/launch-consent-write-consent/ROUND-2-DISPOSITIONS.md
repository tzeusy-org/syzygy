# Round 2 dispositions — write consent for launch consent records

> **Candidate — binds nothing.** These are the drafter's dispositions of the
> round-2 notes. Round 2 returned `CONFIRM WITH EXCEPTIONS` with notes only,
> which meets the offer condition. The owner signed the package bytes the
> review read, so no note is taken here: taking one would edit the signed
> bytes. Each note is carried for a later version of the record or of its
> builder.

Reviewed record: docs/reviews/R-LAUNCH-WRITE-CONSENT-2-RAW.md

Reviewed commit `3ea65c53`; verdict `CONFIRM WITH EXCEPTIONS`; four findings,
all graded note.

### 1 — the packet's cost bullet says of every commit what holds only for Syzygy's

Carried. The record constrains only recording commits, and is right. The
packet's own "Agents can write there too" bullet and its closing sentence
already scope it. A later packet would begin the two sentences with
"Syzygy's".

### 2 — the SD states the identity condition as necessary; it is only sufficient

Carried. Any remote URL whose last two path segments are
`tzeusy-org/syzygy` derives the same identity. "Only when" should read
"when". No consent depends on it.

### 3 — load-bearing clauses that `--check` does not guard

Carried, for the builder of any later version: an add-only literal, the
parent rule's full tail, and a stricter Git branch-name check. Each would
get one mutant. The signed record's bytes satisfy every clause the note
names. The recorder freezes the template, so the guarded text cannot drift
under this act.

### 4 — the new registration leaves a phrase-less stale digest unchecked

Carried. No dispositions record in this package quotes a digest or the act
phrase, this one included. A later dispositions record that names the phrase
must carry the current argument.
