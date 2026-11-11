# Round 8 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 8
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-8-RAW.md`) read commit
> `f242299f` and returned `REVISE` (line 4). It raised one revise finding,
> which is wording in a single falsifier arm, and four notes. The loop
> continues while rounds converge, per the owner's 2026-11-10 instruction
> relayed by the coordinating session. This page:
>
> - disposes each finding;
> - re-runs the occurrence sweep, adding a pronoun pass;
> - corrects the stage sweep.
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict; round 9 decides that.

## 1 — One REQ-047 arm still stated the class rule without the defined terms

**Repaired.** In line 386, "or a run that neither such a consent nor a
launch observation consent recorded with the operator's-own-clone scope
covers runs without one" now reads:

> or a pinned run that neither such a consent nor a launch observation
> consent recorded with the operator's-own-clone scope covers is a no-copy
> run

This mirrors the sibling arm, "is a copy-class run or starts a copy step".
The arm now trips on the class, which is decided at launch, and never on
whether a copy exists. Two refused runs that were affected:

- **Alternates (stage C0).** A copy-class run refused for an alternates
  file is not a no-copy run, so the arm does not trip.
- **Unpinned (stage U).** A run refused before any pin is not a pinned run,
  so it is in neither class.

**Pronoun pass.** [Observed] The pass ran over every falsifier arm and every
scenario THEN and AND line of REQ-046 and REQ-047. That is 80 lines, matched
with `\b(one|it|its|that run|such a run|them|they)\b`, and gave 68 hits. The
table at the end of this page gives each hit and what it refers to.

- Over the post-apply spec of this commit, 0 hits state the class rule.
- To check the pass catches the defect, the same script was run over the
  round-7 spec, rebuilt to the digest in the round-8 raw's head. It gave 65
  hits, with 1 class-rule hit: "covers runs without one" at line 386.
- The pass also changed one scenario AND line that named a copy in the
  retired form. Line 187 read "save a copy REQ-polaris-generation-047
  makes, which it removes". It now reads "save the copy of a copy-class run
  whose copy step started, which it removes".
- [Inferred] Of the 68 hits, 16 sit next to a copy term (table rows marked
  "names the copy with the defined terms"). Each was read by hand. Each
  pronoun refers to a run's brief, a commit, a tree, a form, a reason or
  Syzygy, never to a copy or to the class.

**Occurrence sweep, re-run.** [Observed] There are 169 occurrences of
`\bcop(y|ies|ied)\b`, case folded, in lines 7 to 398. The round-7 sweep found
156. The 13 new ones come from:

- the copy-statements definition (finding 2);
- the new launch-output arm (finding 2);
- the two arm and scenario rewordings above.

| Term | Occurrences |
|---|---|
| the copy (object; exists only once the copy step started), all forms | 65 |
| copy-class run (launch class), the definition and its rule included | 33 |
| run whose copy step started, "a copy exists only" included | 20 |
| no-copy run (launch class) | 11 |
| copy step (the Git processes) | 10 |
| copy statements | 9 |
| no copy was made, or no copy | 9 |
| the copy, as made by the copy step | 7 |
| copy rules (REQ-047) | 3 |
| "anything of a copy" | 2 |
| **Total** | **169** |

The full list is not repeated here. `ROUND-7-DISPOSITIONS.md` carries the
round-7 list, and the script assigns the same terms by the same rules.
Eight labels are now placed by context rather than by row number.

[Observed] The prose sweep found three phrasings in the semantic delta and
one in the impact ledger that use the retired terms. Each now uses the
defined terms:

- **Delta.** "for every run that makes one" (D4) now reads "copy-class run
  whose copy step started".
- **Delta.** "of a run with a copy" (D5) now reads "of a copy-class run".
- **Delta.** "a launch-consented run that copies" now reads "a
  launch-consented copy-class run".
- **Ledger.** "for every run that 047 says makes one" now reads "for every
  copy-class run".

That covers finding 4.

## 2 — Line 244's launch-output copy statements had no falsifier arm

**Repaired, both ways.**

- **Definition.** REQ-047 (line 242) now defines the population: "The copy
  statements are the statements about the copy that
  REQ-polaris-generation-046 requires of the question, the run record and
  every page, and the launch output's statements below that the copy was
  removed, that it is kept and where, or that no copy was made."
- **Arm.** REQ-047's falsifier (line 386) adds: "the launch output of a
  copy-class run that ends before its brief does not say that the copy was
  removed, where its copy step started, or that no copy was made, where it
  never started, or the launch output of a completed copy-class run does not
  say that the copy is kept and name its location".

## 3 — Stage-sweep cells, the no-terminal run, and line 240's last sentence

**Repaired.**

- **Line 240's last sentence** now reads: "Of this paragraph's statements, a
  run refused before any revision is pinned states the refusal alone;
  statements other requirements make on their own conditions, such as a
  remote URL's user information, are unaffected."
- **Stage sweep.** The corrected table below takes the P cell to "Unknown
  unless read". It splits the no-terminal refusal into its own stage, Q0, at
  which no question is shown. It gives the U cells for line 17 and the
  local-branch statement as "on their own conditions".

## 4 — SEMANTIC-DELTA.md used the retired run terms

**Repaired.** See the prose sweep under finding 1.

## 5 — Earlier concerns: rounds 1 to 7 answered, except finding 1

**Noted.** Finding 1 is repaired above.

## Stage sweep, round 8 (corrected)

[Inferred, the drafter's own judgments. The stages are as in round 7, with
the no-terminal refusal split out.]

| Stage | Runs refused there |
|---|---|
| U | before any revision is pinned |
| N | a no-copy run, before the question |
| C0 | a copy-class run, before its copy step started |
| D | a copy-class run, during its copy step |
| P | a copy-class run, after its copy step and before the question |
| Q0 | standard input is not a terminal, so no question is shown |
| Q | after the question: no answer, a wrong phrase, a statement declined, or not declared public |

| Statement (source) | U | N | C0 | D | P | Q0 | Q |
|---|---|---|---|---|---|---|---|
| Pinned revision, reference, no network request, update command (line 240) | none: the refusal alone | stated | stated | stated | stated | stated | stated |
| Committer date (line 240) | none: the refusal alone | Unknown unless read | Unknown | Unknown unless read | non-commit: Unknown; otherwise Unknown unless read | Unknown unless read | Unknown unless read |
| Remote carried user information (line 17); local branch differs | on their own conditions | true | true | true | true | true | true |
| Launch output: removed, kept and where, or no copy made (line 244; arm, line 386) | no copy statement | no copy statement | "no copy was made" | removed | removed | removed where the copy step started, else "no copy was made" | removed |
| Copy statements in the question (line 11) | no question | no question | no question | no question | no question | no question | stated before the answer |
| Run record copy disclosures (line 37) | none | none | "no copy was made", nothing else | made, read, removed | made, read, removed | as D or P where the copy step started, else as C0 | made, read, removed |
| Run record: Git-programs residual (line 254) | none | none | none | stated | stated | where the copy step started | stated |
| Preview label | not shown | not shown | not shown | not shown | where shown | not shown | shown |
| Who answered, Inferred | no answer | no answer | no answer | no answer | no answer | no answer | where recorded |
| Records recorded at launch | none | none | none | none | none | none | only where confirmed |

[Inferred] Notes on the table:

- A completed run, which is not refused, keeps the copy, and its launch
  output names the location.
- Nothing orders the terminal check against the copy step. So a Q0 run
  states what a P run states where its copy step started, and what a C0 run
  states where it never started. Its date is Unknown unless read.

## Pronoun pass: every hit in a falsifier arm or scenario THEN/AND line

| # | Line | Kind | Word | Reading | Context |
|---|---|---|---|---|---|
| 1 | 47 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **AND** on the exact phrase it commits, on the dedicated reference, on… |
| 2 | 47 | AND | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …on the exact phrase it commits, on the dedicated reference, one observation consent record naming that … |
| 3 | 47 | AND | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ce, one observation consent record naming that revision and one drawer statement, and no provider state… |
| 4 | 52 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | … the declared provider and the stated classes, each binding its own digest… |
| 5 | 70 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …mits a new statement naming the wider set and the statement it supersedes… |
| 6 | 93 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …that a confirmed answer records the repository identity and its normalised URL on the dedicated referen… |
| 7 | 93 | THEN | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …pository, that Syzygy never pushes that reference, and that one push of it would publish them… |
| 8 | 93 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …at Syzygy never pushes that reference, and that one push of it would publish them… |
| 9 | 93 | THEN | them | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ushes that reference, and that one push of it would publish them… |
| 10 | 94 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | … asks for no confirmation of that statement, and the phrase it asks for is the phrase this requirement… |
| 11 | 100 | AND | them | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **AND** the run record cites them as REQ-polaris-generation-033 requires… |
| 12 | 105 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** the question names the revoked record and its state before asking… |
| 13 | 117 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …*THEN** the question proposes that earlier identity, states it was taken from those records, and names… |
| 14 | 130 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …hat normalised URL, and the run record and every page carry it… |
| 15 | 141 | AND | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …m:` is `github.com/a/b` does not match by URL, though where its subject identity is `repository:a-b` it… |
| 16 | 141 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | … URL, though where its subject identity is `repository:a-b` it matches by identity and is named so… |
| 17 | 146 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** that consent matches by URL, the question names it with how it matched and proposes `repos… |
| 18 | 146 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …that consent matches by URL, the question names it with how it matched and proposes `repository:c-d`, … |
| 19 | 161 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ys the remote URL carried user information without printing it, and it appears in no record or page… |
| 20 | 161 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …emote URL carried user information without printing it, and it appears in no record or page… |
| 21 | 171 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** it derives nothing, the launch output name… |
| 22 | 171 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …es nothing, the launch output names the remote and the rule its URL fails, and the URL appears in no ou… |
| 23 | 181 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** it labels them a preview of the policy's c… |
| 24 | 181 | THEN | them | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** it labels them a preview of the policy's classificatio… |
| 25 | 187 | AND | it | it = Syzygy; the copy named with the defined terms | …the copy of a copy-class run whose copy step started, which it removes… |
| 26 | 198 | THEN | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** Syzygy refuses before asking and prints the one command that makes a separate clone at … |
| 27 | 208 | THEN | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …t never to run a consent-asking command and never to answer one… |
| 28 | 214 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …s SEC-3's rule in the form REQ-polaris-generation-033 gives it… |
| 29 | 223 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …s a copy statement, or, for a copy-class run refused before its copy step started, the run record or a … |
| 30 | 223 | arm | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …nce an A1 mechanism is in force, without a state selection; one record carries two of observation conse… |
| 31 | 223 | arm | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …tatement is created for a non-governed subject, or a second one for a subject and provider whose in-for… |
| 32 | 223 | arm | one | names the copy with the defined terms; pronoun refers elsewhere | …a working tree, index or reference other than the dedicated one and those of a copy that a copy step ma… |
| 33 | 223 | arm | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …s Observed; a launch whose matching records carry more than one identity, with no identity option, is n… |
| 34 | 223 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …locator derives anything, or a URL carrying credentials, or its user information, is printed, stored or… |
| 35 | 223 | arm | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …s a network request for a locator or applies a rewriting of it; a remote URL that is not a remote loca… |
| 36 | 223 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …on consent made by another act matches by URL other than by its normalised `Upstream:` URL equalling th… |
| 37 | 223 | arm | they | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …eam:` URL equalling the derived URL, or does not match when they are equal, or the URL match prevents a … |
| 38 | 223 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …before the question states that the repository identity and its normalised URL are recorded on the dedi… |
| 39 | 223 | arm | one | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ing project's own repository, which Syzygy never pushes and one push of which would publish them, or th… |
| 40 | 223 | arm | them | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ich Syzygy never pushes and one push of which would publish them, or the question asks for a confirmatio… |
| 41 | 223 | arm | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …hat statement or adds an answer, phrase or record field for it; an execution choice is asked for or re… |
| 42 | 268 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ion-033 states and does not pin the trunk tip or refuse for it… |
| 43 | 273 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …*THEN** Syzygy pins the commit `main` points to, and states it in full with its reference and committe… |
| 44 | 273 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ins the commit `main` points to, and states it in full with its reference and committer date… |
| 45 | 274 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **AND** states that it made no network request and prints the … |
| 46 | 289 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | … pins that commit's full identifier, and any question names it… |
| 47 | 304 | THEN | one | names the copy with the defined terms; pronoun refers elsewhere | …y-class run, and Syzygy makes the copy before the question, one commit fetched at depth one over the lo… |
| 48 | 304 | THEN | one | names the copy with the defined terms; pronoun refers elsewhere | …s the copy before the question, one commit fetched at depth one over the local file transport, and does… |
| 49 | 304 | THEN | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …ile transport, and does not refuse the operator's clone for its history… |
| 50 | 305 | AND | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …reads no object of the operator's clone, changes nothing in it, and makes no network request… |
| 51 | 336 | THEN | its | names the copy with the defined terms; pronoun refers elsewhere | …- **THEN** the copy fails, Syzygy refuses with its reason, makes no network request, and r… |
| 52 | 342 | AND | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …** the launch output states the pinned revision in full and its reference, and the committer date as Un… |
| 53 | 353 | THEN | it | names the copy with the defined terms; pronoun refers elsewhere | … naming `--revision`, does not follow the tag to the commit it names, and removes the copy… |
| 54 | 363 | THEN | it | names the copy with the defined terms; pronoun refers elsewhere | …ng that the object was not shown to be a commit, never that it is not a commit, and removes the copy… |
| 55 | 368 | THEN | it | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …- **THEN** Syzygy refuses it as ambiguous before any Git process sta… |
| 56 | 386 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or … |
| 57 | 386 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …d, the launch output or run record lacks the full revision, its reference, the no-network statement or … |
| 58 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …lthough the copy holds more than the pinned commit and what its root tree reaches or departs from its f… |
| 59 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …inned commit and what its root tree reaches or departs from its form; a Git process for the copy runs w… |
| 60 | 386 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | …s clone anything this requirement does not list, or honours its configuration; a run that only a launch… |
| 61 | 386 | arm | one | names the copy with the defined terms; pronoun refers elsewhere | …tarts a copy step, or runs on a clone that departs from the one-commit form unrefused; a completed run'… |
| 62 | 386 | arm | its | refers to a record, statement, URL, identity, revision, object or Syzygy; no class rule | … a completed run's copy is removed without the operator, or its location is not named; a non-commit `--… |
| 63 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …e copy step started is not removed when the run ends before its brief; the launch output of a copy-clas… |
| 64 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …ief; the launch output of a copy-class run that ends before its brief does not say that the copy was re… |
| 65 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | …ore its brief does not say that the copy was removed, where its copy step started, or that no copy was … |
| 66 | 386 | arm | it | names the copy with the defined terms; pronoun refers elsewhere | …here its copy step started, or that no copy was made, where it never started, or the launch output of … |
| 67 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | … copy-class run does not say that the copy is kept and name its location; a brief or packet does not na… |
| 68 | 386 | arm | its | names the copy with the defined terms; pronoun refers elsewhere | … statements are missing, or a copy-class run refused before its copy step started states anything of a … |
