# Round 3 dispositions — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`).

Reviewed record: docs/reviews/R-SCREENING-SCOPE-V6-d942-3-RAW.md

Round 3, the last under the stopping rule, returned `CONFIRM WITH
EXCEPTIONS` over `d942888a` with four notes and no revise or blocking
finding, so it clears the package. The manifest file and its one row are
unchanged by everything below.

One file changed after the review, for note 1 only: `SEMANTIC-DELTA.md`, by
a whitespace-only re-wrap inside its fenced display of the pattern (one line
broken in two). [Observed] With all whitespace removed, the file at
`d942888a` and the file after the repair are equal; every other file the
review read is byte-identical. Strictly, rule 10 retires the review for that
one file's bytes; the recorder freezes the repaired bytes, and this paragraph
is the disclosure. Notes 2 to 4 are not repaired in the reviewed files, so
that no further edit outruns the review; each is carried as stated.

## 1 — The round-2 repair made `check_governance.py` fail (CG-1a) (note)

Repaired as the raw proposed: the displayed pattern breaks between `[#!]`
and `(?=`, so CG-1a no longer reads a link there; the block already says the
bytes are one line. `check_governance.py`: 0 FAIL after the repair.

## 2 — The ledger omits a test that pins the live policy's placement list (note)

Carried to the install (`syzygy-n5jm`): `public-source-classification.test.ts`
in `packages/polaris-generation-core/src/` asserts the live policy's
`ownerPlacements` paths (line 41) and fails after the act until the install
adds `redis.conf`. The ledger's `ownerPlacements` sweep covered non-test
files only.

## 3 — The directive arm also matches ordinary text (note)

Carried as a named cost, to the owner with this package: a Markdown heading
or a code comment that opens with one of the four directive words and any
further word (`## Requirepass and ACLs`, `# masterauth is needed …`) is
withheld, with its guard lines in documentation and whole in code. The ACL
arm's trigger is a blank or a quote before `<` or `>`, or `#`/`!` with 64 hex
digits, not only a blank. Nothing leaks; more is withheld. The clause is in
the signed bytes, so its wording is not changed after the confirming review.

## 4 — The delta's "Changed from the draft" paragraphs omit one clause difference (note)

Carried here: besides the widenings listed, the clause's "keeps a body of any
other class whole" became "withholds a body of any other class whole" (round
1, finding 6), its list of uncaught shapes grew from three to seven, and the
value class excludes vertical tab and form feed.
