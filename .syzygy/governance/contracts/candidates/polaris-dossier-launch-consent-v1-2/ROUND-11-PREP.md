# Round 11 preparation — the owner's rulings of 2026-11-10 applied

> **Candidate — binds nothing.** This note records how the owner's rulings
> after review round 10 were applied to the round-10 repair. It is not a
> review and carries no verdict. The rulings are quoted in
> `.syzygy/governance/decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`,
> section "Rulings after review round 10, 2026-11-10". Line numbers are
> those of the post-apply spec (`subject_bytes()`), not of the patch.

## The rulings and where each lands

| Ruling (owner's label, quoted) | Effect | Where |
|---|---|---|
| "Final review rounds (Recommended)" | Round 11 of this package is ordered | `REVIEW-BRIEF.md` |
| "Keep http/git URLs" | Typed `http://` and `git://` URLs stay accepted, as drafted; no spec byte changes | D6; `OWNER-SIGNOFF.md` "Ruled" |
| "Port/case merge" | Accepted as drafted; disclosed as a fourth residual, the identity rule's bytes unchanged | spec line 15; D7; ledger; owner page |
| "Refuse SHA-256 clones", left unticked | The copy takes the operator's clone's object format; no clone is refused for it | spec lines 248, 254, 396; scenario "SHA-256 clone"; D2; ledger; owner page |
| "Copy anyway (Recommended)" | A run that only a launch observation consent recorded with version 1.1's scope covers is a copy-class run; its run record states that the copy goes beyond that consent's "no fetch by Syzygy" wording; the one-commit requirement and refusal for that case are removed | spec lines 223, 242, 246, 250, 396; scenario "Repeat run under a launch consent recorded by version 1.1"; D1; ledger; owner page |

[Inferred] That the person answering is the owner. The option labels are
quoted from the coordinating session's relay; the full option descriptions
were not relayed and are [Unknown].

## Changed blocks since the round-10 repair

[Observed] The round-10 spec was rebuilt by the same drafting pipeline
without this round's step and hashed to the digest round 10's repair
recorded in commit `de9c1ba8`'s `PROPOSED-SUBJECTS.json`. A line diff against the current
build gives nine changed blocks and no other difference:

| # | Round-10 line | Now | Requirement | Change |
|---|---|---|---|---|
| 1 | 15 | 15 | 046, residuals | "Three" becomes "Four"; the port-and-case residual appended |
| 2 | 223 | 223 | 046, falsifier | arm added: a run that only a v1.1-scoped launch consent covers is refused for its clone's form or history, or its run record omits that the copy goes beyond that consent's wording |
| 3 | 242 | 242 | 047, class rule | the v1.1-scoped launch consent no longer makes a no-copy run; such a run runs on a copy and its run record states the copy goes beyond that consent's wording |
| 4 | 246 | 246 | 047 | the one-commit requirement on the operator's clone and its refusal deleted; "REQ-polaris-generation-033's rules for the pinned revision apply unchanged." kept |
| 5 | 248 | 248 | 047, copy step | the copy's empty repository takes the operator's clone's object format, SHA-1 where none is recorded; no clone refused for its format; the copy's form check names that format's settings |
| 6 | 250 | 250 | 047, Git's reads | "or the one-commit form check above" removed |
| 7 | 254 | 254 | 047, Syzygy's reads | the configuration's `extensions.objectFormat` read as text, in a copy-class run only |
| 8 | 325 | 325–331 | 047, scenarios | the v1.1-consent scenario's THEN now copies and adds the run-record AND; new scenario "SHA-256 clone" |
| 9 | 390 | 396 | 047, falsifier | the v1.1-scoped consent arm reversed; object-format arm added |

The exact replacement bytes are in `proposed/spec.md.patch` and the delta's
exact blocks. Scenario count: 54 before, 55 now (`grep -c '^#### Scenario:'`).

## Each new or changed statement under the stage-and-class rule

REQ-047's stage rule governs statements of the question, the launch output,
the run record and the pages. Blocks that change behaviour rather than a
statement are listed too, with the class they apply to.

| Block | Statement or rule | Stage | Class | Other class's form |
|---|---|---|---|---|
| 1 | Fourth residual, disclosed beside the record list | question asked (with the record list) | both | — (unreached: the stage rule's "no question was asked") |
| 2, 9 | Falsifier arms | (falsifier, not a statement) | copy-class (v1.1 arm); both (format arm) | — |
| 3 | The run record states that the copy goes beyond that consent's "no fetch by Syzygy" wording | copy step started | copy-class | no-copy: states no such thing; a no-copy run is covered by another act's consent |
| 3 | Such a run runs on a copy | (class rule, not a statement) | decides copy-class | — |
| 4 | One-commit requirement deleted | (deletion) | — | — |
| 5 | Copy made in the clone's object format; never refused for it | copy step started (a rule of the copy step) | copy-class | no-copy: no copy is made; the form another act's consent states binds |
| 5 | Copy's form check includes the format's settings | before the question (or before the brief) | copy-class | no-copy: the check of the form another act's consent states |
| 6 | Git's reads: the other act's form check only | (read rule) | both | — |
| 7 | `extensions.objectFormat` read as text | copy step started, before the copy's repository is made (a read, not a statement) | copy-class | no-copy: not read |
| 8 | Scenario THEN and AND | copy step started | copy-class | — (scenario) |
| 8 | Scenario "SHA-256 clone" | copy step started; commit pinned at checkout | copy-class | — (scenario) |

## Class-qualifier sweep, re-run over these bytes

[Observed] The round-10 sweep script, re-run unchanged on the current build:
26 clauses (25 in round 10; the new one is row 16), 0 unplaced. Of the 26,
8 are not statements (rows 1, 2, 9, 17, 18, 19, 20 and 21: read rules, the
stage rule itself, definitions and the copy-step rule), and every one of the
18 statements carries a class. Companion sweeps on the same bytes: 196
occurrences of "copy", each labelled; 85 of "pin"; the pronoun pass, 90 hits
on 82 lines, none stating the class rule.

| # | Line | Clause (opening) | Stage | Class | Other-class form |
|---|---|---|---|---|---|
| 1 | 9 | of the copy that a copy-class run's copy step makes, as REQ-polaris-generation-047 defines those terms, the files of it… | (a read rule of the pre-answer list, not a statement) | — | — |
| 2 | 9 | and, as Git objects by object identifier in the run's clone, which in a copy-class run is the copy once its copy step h… | (a read rule of the pre-answer list, not a statement) | — | — |
| 3 | 11 | the pinned revision in full and how it was chosen | question asked (after commit pinned) | both | — |
| 4 | 11 | for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement … | question asked | both | — |
| 5 | 11 | for a copy-class run, whose copy is made before the question, that the run's clone is a copy of the pinned commit alone… | question asked (follows copy step and pin) | copy-class | no-copy: the question carries no copy statement (rule: no copy was made) |
| 6 | 11 | and that the copy, its checked-out files included, was made before the answer, that Syzygy has read none of its blobs, … | question asked (copy-class clause of the question) | copy-class | no-copy: the question carries no copy statement |
| 7 | 17 | it is then a matching record for the identity proposal and the record list, named in the question with how it matched, … | question asked | both | — |
| 8 | 31 | Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL re… | identifier named | both | unreached: names `--revision` |
| 9 | 37 | under REQ-polaris-generation-047's stage rule, each with the stage it needs and the run class that requires it: for bot… | (governs the list below) | both | — |
| 10 | 37 | for a copy-class run, once its copy step started, how the copy was made and what Git and Syzygy read of the operator's … | copy step started | copy-class | no-copy: that no copy was made |
| 11 | 37 | for a copy-class run, once a brief or packet was delivered, that the agent sessions were directed to work in the copy, … | brief or packet delivered | copy-class | no-copy: directed to the operator's clone, no copy made |
| 12 | 37 | for both classes, once an identifier was named, the named identifier and how it was chosen, and, once the commit was pi… | identifier named; commit pinned | both | — |
| 13 | 240 | Once an identifier is named (stage: identifier named; both classes), they SHALL state the named identifier in full, the… | identifier named | both | — |
| 14 | 240 | Once the commit is pinned (stage: commit pinned; both classes), they SHALL state its committer date as the commit objec… | commit pinned | both | — |
| 15 | 240 | a run that did not reach that stage states that the commit was not pinned and that its committer date is Unknown, never… | commit pinned (unreached form) | both | — |
| 16 | 242 | A run whose named identifier only an in-force launch observation consent names whose recorded scope holds that revision… | copy step started | copy-class | no-copy: states no such thing (a no-copy run is covered by another act's consent) |
| 17 | 244 | Every statement this change requires of the question, the launch output, the run record or a page about the named ident… | (the stage rule itself) | — | — |
| 18 | 244 | For each such stage the run did not reach, the run SHALL state, as what Syzygy did, that it was not reached: that no id… | (the stage rule itself) | — | — |
| 19 | 246 | The copy statements are the statements about the copy that REQ-polaris-generation-046 requires of the question, the run… | (definition) | copy-class | no-copy: no copy was made |
| 20 | 248 | In a copy-class run, before the question, or before the brief where no question is asked, Syzygy SHALL make the copy as… | (the copy-step rule, not a statement) | — | — |
| 21 | 248 | the creation of the copy's directory and the Git processes it starts to do so are the copy step. | (definition) | — | — |
| 22 | 248 | Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy, its… | copy step started | copy-class | no-copy: no copy was made |
| 23 | 248 | Otherwise the copy is the run's clone for the rest of the run and is kept after it, outside the run's state directory, … | brief or packet delivered (completed run) | copy-class | no-copy: no copy was made |
| 24 | 258 | Once a copy-class run's copy step started (stage: copy step started; copy-class), the run record SHALL state, labelled … | copy step started | copy-class | no-copy: no copy was made |
| 25 | 258 | Once a copy-class run's brief or packet was delivered, the run record SHALL state, labelled Inferred, that whether a se… | brief or packet delivered | copy-class | no-copy: sessions worked in the operator's clone, no copy made |
| 26 | 258 | for a no-copy run, it states that the sessions worked in the operator's clone and that no copy was made. | brief or packet delivered | no-copy | (this is the no-copy form) |

The fourth residual (block 1) is not a row: the sweep's population is the
stage-rule clauses, and the residual is disclosed with the record list for
both classes, as the three before it are.

## The SHA-256 fixture

[Observed] Git 2.53.0, run in a scratch directory under the session's
temporary directory with `env -i`, system and global configuration off,
`GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1`; the directory was
removed afterwards.

- Source: `git init --object-format=sha256`, two commits; object names 64
  hex digits; `rev-parse --show-object-format` printed `sha256`; its
  configuration had `extensions.objectformat=sha256`.
- Copy made with `git init --template= --object-format=sha256`, then
  `fetch --depth=1 --no-tags --no-recurse-submodules file://<source>
  <64-hex tip>` and `checkout --detach <tip>`: fetch exit 0, checkout exit
  0, HEAD equal to the named identifier, object format `sha256`,
  `core.repositoryformatversion=1`, `extensions.objectformat=sha256`, one
  commit held, one line in `.git/shallow`.
- Control, the same into a copy made with `--object-format=sha1`: fetch
  exit 128 ("couldn't find remote ref" naming the 64-hex identifier),
  checkout exit 128, HEAD unborn.

[Inferred] So a copy of the clone's own format is what lets a SHA-256 clone
pass, and the form check must admit `core.repositoryformatversion=1` and
`extensions.objectformat=sha256` for such a copy. `clone-shape.ts` is
product code and is not changed by this package.
