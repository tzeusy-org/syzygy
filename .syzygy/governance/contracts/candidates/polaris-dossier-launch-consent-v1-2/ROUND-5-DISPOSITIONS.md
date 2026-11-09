# Round 5 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 5
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-5-RAW.md`) read commit
> `e004db00` and returned `REVISE` (line 4): two revise findings and seven
> notes. It found round 4's findings answered. Per the owner's 2026-11-10
> instruction, relayed by the coordinating session, the loop continues past
> the stopping rule while rounds converge. This page says how each finding
> was disposed, and records the self-review pass made before pushing. Line
> numbers are those of the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict on the repairs; round 6
> decides that.

## 1 — Three write and removal absolutes in REQ-046 that a conforming copy run breaks

**Repaired at the root, and swept wider than the three named.** REQ-046
now states once, beside the write reading that permits the copy (line 35):

> That copy, its making, its keeping and its removal lie outside every statement of this requirement that Syzygy writes nothing, writes nothing outside the run's state directory, edits or removes no file, or changes no working tree, index or reference; REQ-polaris-generation-047 alone governs them.

The three sites the review names also say it in their own words:

- the falsifier arm now reads "a file of the governance home or of the
  operator's clone is edited or removed" (line 223);
- "Records already in force" now reads "writes no record" (line 99);
- "Write consent absent" now ends "save a copy REQ-polaris-generation-047
  makes, which it removes" (line 187).

The sweep of every absolute in REQ-046 and REQ-047 about writes, removal
and files is the table below. It found two more:

- "it SHALL create the record files and the commit without changing any
  working tree, index or other reference" (line 27). It is covered by the
  root sentence's "changes no working tree, index or reference".
- REQ-047's removal rule now applies only "if it made one", since several
  refusals come before any Git process.

## 2 — The pre-answer type read of a `--revision` object is a blob read when the object is a blob

**Repaired by removing the read.** The pre-answer list no longer names the
type of the object `--revision` names (line 9). REQ-047 now refuses a
non-commit from the copy's own result, without Syzygy reading the object
(line 238):

> Syzygy tells a non-commit without reading the object itself: where the copy's detached checkout fails, or leaves the copy's `HEAD` at an object other than the pinned identifier, the pinned object is not a commit, and Syzygy SHALL refuse, naming `--revision` where one was given and otherwise the reference the pin came from; this refusal takes the place of the form check's refusal below for the same copy.

- `HEAD` is a file of the copy's Git directory that the form check already
  reads, so the refusal needs no object read by Syzygy.
- What Git reads of the object to fetch or check it out is the copy step's,
  which REQ-046 already excludes from Syzygy's reads.
- [Observed, 2026-11-10, Git 2.53.0, scratch fixture with the stated
  environment, deleted afterwards] The four identifier kinds behave as
  follows:

  | Identifier | Fetch | Checkout | `HEAD` |
  |---|---|---|---|
  | commit | exit 0 | exit 0 | at the named id |
  | tree | exit 0 | exit 128 ("Cannot switch branch to a non-commit") | — |
  | blob | exit 0 | exit 128 ("unable to read tree") | — |
  | annotated tag | exit 0 | exit 0 | at the tag's commit, not the named id |

- The reviewer's second gap, which refusal applies, is settled: the
  `--revision` refusal takes the place of the form check's for that copy.
- The scenario "Revision naming a blob" is added (line 353). REQ-047's Case
  varies blob, tree and tag identifiers. The falsifier arm now reads "a
  non-commit `--revision` is followed, pinned or used, or is told from a
  commit by Syzygy reading the object itself".

So the answer to "does that count as Syzygy reading a blob" is that no
type read remains: Syzygy reads no object to tell a non-commit.

## 3 — "the form check above" is ambiguous, and the read-list arm is wider than the list

**Repaired as proposed.** Line 246 now names "the form check binding it":

- the check of the form another act's consent states, or the one-commit form
  check;
- each reading what its form needs, the whole configuration file and the
  pack indexes included;
- with "the configuration limit below" yielding to it.

The falsifier arm is scoped "for a launch-consented run" (line 379).

## 4 — The question's removal statement is narrower than the removal rule

**Repaired.** The question now says the copy "is removed if the run ends
before its brief and is otherwise kept after the run, at a location the
launch output names, until the operator removes it" (line 11). The run
record no longer repeats the question's statements wholesale (line 37). It
states, "whether or not a question was asked":

- how the copy was made;
- what Git and Syzygy read of the operator's clone;
- that agents were directed to the copy;
- its location;
- that it is kept.

The question's "Syzygy has read none of its blobs" is therefore never
restated after the run has read them.

## 5 — "One change" and line 35 still describe a copy run outside the launch-consented class

**Repaired.** Line 35 now reads "every one of which is launch-consented".
The delta's "One change, not a split" now names one reach beyond
launch-consented runs, and says why the earlier second reach is gone.

## 6 — D9's table omits four `typedAuthority` fields

**Repaired.** D9's table now reads every field of the entry's
`typedAuthority`:

- `writeSurface` is arguably contradicted, with `stateDirectoryWrites`, and
  the successor should say which;
- `authorityType`, `questions` and `databaseAccess` are not contradicted.

The ledger and "Before you sign" item 1 name `writeSurface` too.

## 7 — REQ-046's Case does not vary whether the run makes a copy

**Repaired as proposed** (line 219): "whether the run makes a copy, and the
operator's clone's form".

## 8 — The owner page says "the same check it makes on the clones it makes today"

**Repaired as proposed:** "the same check it makes today on one-commit
clones the operator prepares".

## 9 — Earlier concerns: rounds 1 to 4 answered, except where findings 1 and 2 reopen a class

**Noted.** Both reopened classes are repaired at the root above. The
self-review below was made to stop the class recurring.

## Self-review: every absolute, falsifier arm and scenario THEN of REQ-046 and REQ-047

[Observed] Method:

- A script (`enumerate.py`, a drafting aid outside the repository) split
  the post-apply spec's REQ-046 and REQ-047 into three populations:
  - every sentence of a requirement paragraph containing SHALL, never, no,
    nothing, only, every, none, alone or not;
  - every falsifier arm (split at `; `);
  - every scenario THEN and AND line.
- That gave 243 items:

  | Population | REQ-046 | REQ-047 |
  |---|---|---|
  | absolutes | 84 | 35 |
  | arms | 30 | 19 |
  | scenario lines | 50 | 25 |

- Each item was read and checked against three conforming runs:
  - a copy run: a full clone at the trunk tip, the question asked;
  - a no-copy run: a launch-consented run at a revision another act's
    consent names, or under a v1.1-scoped launch consent;
  - a refusal run: a run refused before its brief, after the copy where a
    copy is made.

[Inferred] The judgments are the drafter's own. Rows marked "independent
of the copy" are about identity, locators, visibility, the preview label,
the ceremony, record fields, revocation, or the drawer and provider
statements. They read and write nothing that the copy changes.

The pass found and repaired these, beyond the review's findings:

- **A46.59.** The recording-commit sentence's "without changing any working
  tree, index or other reference" is covered by widening the root
  sentence.
- **A46.84.** The run record no longer repeats "Syzygy has read none of its
  blobs".
- **F46.2.** The arm is scoped to Syzygy's own pre-answer reads.
- **A46.67 and A47.20.** REQ-047 now says the copy's Git processes execute
  nothing of the observed repository and are not an execution choice.
- **A47.17.** The copy is made before the question "or before the brief
  where no question is asked".
- **A47.24.** "if it made one".
- **A47.9.** The non-commit refusal takes the place of the form-check
  refusal.
- **A47.35.** Scoped to a run with a copy.
- **S47.13.** Its WHEN now states that every statement the subject needs is
  in force, since its THEN asks nothing.
- **F47.9.** Reworded so that a refused tag copy, which transiently holds the
  tag object, does not trip it.

| Item | Line | Clause (opening) | Copy run | No-copy run | Refusal run | Result |
|---|---|---|---|---|---|---|
| A46.1 | 9 | In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-… | Syzygy reads no blob before asking; the copy step's Git reads are not Syzygy's (A46.5) | object reads only, as v1.1 | refused before any blob read | holds |
| A46.2 | 9 | Before the answer Syzygy SHALL read of the clones only what the question needs, and only these: of the operat… | operator's clone: REQ-047 list; copy: form-check files (incl. HEAD, used for the non-commit refusal); objects in the copy | operator's clone: REQ-047 list incl. form-check files; objects in the operator's clone | a refusal reads no more than the list | holds; repaired in round 5 (type read removed, finding 2) |
| A46.3 | 9 | It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and… | Syzygy reads no blob; Git's are excluded (A46.5) | as v1.1 | holds | holds |
| A46.4 | 9 | These rules bind every read Syzygy itself makes, in process, of either clone. | binds Syzygy's in-process reads of both clones | binds reads of the operator's clone | holds | holds |
| A46.5 | 9 | The reads made by the Git processes that REQ-polaris-generation-047 starts to make the copy, in the operator'… | the copy's Git processes are excluded from REQ-046's read rules | n/a | a copy made then refused: same | holds |
| A46.6 | 9 | REQ-polaris-generation-047's copy rules alone govern them, and Syzygy SHALL use nothing they read but the cop… | Syzygy uses only the copy | n/a | the copy is removed | holds |
| A46.7 | 9 | From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.8 | 9 | Those classes are a preview: the effective classification policy's classification as it would apply once an o… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.9 | 9 | The preview label describes only how the classes were computed before the answer; it does not make the owner'… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.10 | 9 | The question, the launch output and every record that names them SHALL label them a preview, and a confirmed … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.11 | 11 | Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.12 | 11 | The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pin… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.13 | 11 | The question SHALL state, before the answer is asked for: the proposed repository identity, how it was propos… | copy statements present; removal statement now matches A47.24-25 | copy statements absent, as A46.13 scopes them | a refused copy run that asks no question states nothing | holds; repaired (note 4) |
| A46.14 | 11 | Where the operator does not declare the repository public, whether the declaration is that it is not public o… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.15 | 11 | That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, ph… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.16 | 13 | The question, and every skill and agent text Syzygy ships, SHALL say that only the owner answers it, in perso… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.17 | 13 | An answer typed by an agent is not an owner act: under RFC3-16's trust premise for state (1), an implementati… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.18 | 13 | Syzygy SHALL record who answered as the operator's declaration that the owner answered in person, label it In… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.19 | 15 | Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.20 | 15 | The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generati… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.21 | 15 | Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.22 | 15 | The rule takes the last two path segments for every host, so the host and every earlier path segment (a group… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.23 | 15 | The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with th… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.24 | 15 | The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where e… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.25 | 15 | Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none an… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.26 | 15 | Where the operator gives an identity that a matching record does not carry, the question SHALL name every suc… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.27 | 15 | The URL, recorded and derived, is a locator hint and never the identity. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.28 | 15 | Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified unde… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.29 | 17 | A URL the operator gives as a locator (`--url` or the upstream option) SHALL be in one of the admitted locato… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.30 | 17 | An operator-given URL carries no credentials: an `https://`, `http://` or `git://` URL carrying any user info… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.31 | 17 | A URL carrying a query or a fragment, or a percent-encoded character in its user information or host, a URL o… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.32 | 17 | Syzygy SHALL refuse an operator-given URL that is not admitted, naming the rule it fails, and SHALL NOT print… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.33 | 17 | A remote URL that is not a remote locator derives nothing, as for a clone with no remote, and Syzygy SHALL NO… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.34 | 17 | Where a remote URL carried user information, the launch output SHALL say so, and Syzygy SHALL NOT print, stor… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.35 | 17 | Syzygy SHALL make no network request to resolve, check or reach a locator, and SHALL apply no rewriting of it… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.36 | 17 | The normalised URL is the locator every launch consent record, the run record and every page carry, for every… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.37 | 17 | An observation consent made by any other act, which records no normalised URL, also matches the run by URL, a… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.38 | 17 | This match adds to the matching above and never restricts it, nor the revision branch of REQ-polaris-generati… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.39 | 17 | By URL alone, a consent is never matched for a same-named repository on another host or under another group. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.40 | 19 | Whether the repository is public is the operator's declaration alone, for every host and form. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.41 | 19 | Syzygy SHALL NOT infer it from the host, the scheme, a user name or whether the operator's clone needed a cre… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.42 | 19 | A repository that the operator does not declare public is not public under the effective screening policy, wh… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.43 | 21 | A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write… | scope: held in the copy | a no-copy run never records an observation consent: its revision is already covered (A46.37, A47.14) | no record | holds |
| A46.44 | 21 | It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.45 | 21 | Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) an… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.46 | 21 | While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelate… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.47 | 21 | Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the op… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.48 | 23 | The question SHALL ask the owner whether a kernel evidence drawer exists for the subject, with the answers th… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.49 | 23 | An answer that none exists SHALL create a drawer statement: a launch consent record of its own, for the subje… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.50 | 23 | The other two answers create no record, and the subject is then governed under REQ-polaris-generation-033. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.51 | 23 | A subject is non-governed under a launch drawer statement only when the tree at the pinned revision also meet… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.52 | 25 | For a subject that is governed under REQ-polaris-generation-033, or whose drawer status is unknown, the answe… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.53 | 25 | An in-force statement for the same subject and provider whose classes include every class the path classifica… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.54 | 25 | Where it does not include them, the question SHALL offer a new statement naming the wider set, whose record n… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.55 | 25 | Where the owner declines a needed statement, Syzygy SHALL record the other confirmed records and refuse to is… | copy kept? no: run ends before its brief, so A47.24 removes it | no copy | holds | holds |
| A46.56 | 25 | A statement SHALL NOT be created for a non-governed subject. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.57 | 25 | The observation consent, the drawer statement and the provider statement are separate records, each separatel… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.58 | 27 | A launch consent record is in force from its own owner-act record and from the recording commit that contains… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.59 | 27 | Syzygy SHALL make that recording commit itself, on one dedicated reference of the governance home that the wr… | the recording commit changes no working tree; the copy's own changes are excluded by A46.80 | as v1.1 | no commit | holds; A46.80 widened in the self-review |
| A46.60 | 27 | Syzygy SHALL read launch consent records only from that reference's commits, as Git objects. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.61 | 27 | Because the dedicated reference never becomes the trunk, recording a launch consent never moves the trunk tip… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.62 | 27 | A record stays in force until a later owner act revokes or supersedes it; it does not expire when the run clo… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.63 | 27 | Revocation is unchanged (RFC5-13): a revoked launch consent record refuses every later step of every run that… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.64 | 27 | Where in-force records already hold every consent and statement the run needs, Syzygy SHALL use them, name th… | asks nothing; makes the copy (S47.13) | asks nothing, no copy | n/a | holds |
| A46.65 | 27 | Where a matching record has been revoked or withdrawn, the question SHALL name it and its state; a new answer… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.66 | 29 | Syzygy SHALL read launch consent records of every repository through one generic form, with no per-repository… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.67 | 29 | Launch consent adds no readers beyond that form, no egress and no execution. | Git processes execute nothing of the observed repository and are not an execution choice (A47.20) | no process | holds | holds; A47.20 sentence added in the self-review |
| A46.68 | 29 | Syzygy SHALL read the repository's blobs only as REQ-polaris-generation-033 permits, under the observing proj… | Syzygy reads the copy's blobs after the answer under REQ-033; Git's copy-step reads are not Syzygy's (A46.5) | as v1.1 | no blob read | holds |
| A46.69 | 29 | Its owner placements, which place named paths of one repository at one commit, are per repository and per com… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.70 | 29 | A repository that the operator does not declare public SHALL be refused before any record is written while no… | refused before any record; a copy made first is removed | refused before any record | holds | holds |
| A46.71 | 29 | A successor that admits non-public sources through this same observation consent record lifts the refusal for… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.72 | 29 | The execution choice and its rules (REQ-polaris-generation-033, SEC-3, D9) are unchanged: a launch consent is… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.73 | 31 | Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzyg… | the check concerns the operator's clone (A47.33); the copy is never the governance home | as v1.1 | refused before asking; any copy removed | holds |
| A46.74 | 33 | Syzygy SHALL write launch consent records only under an in-force write consent for the observing project's ow… | no record without the write consent | same | same | holds |
| A46.75 | 33 | Absent that consent, Syzygy SHALL ask nothing, refuse, and name the consent that is missing. | asks nothing and refuses; a copy made first is removed (A47.24); S46.42 says so | same, no copy | holds | holds; repaired (finding 1) |
| A46.76 | 33 | Every recording commit adds new files only, never edits or removes one, and is attributed to Syzygy and the o… | about recording commits only | same | no commit | holds |
| A46.77 | 33 | Syzygy SHALL NOT push or otherwise publish the dedicated reference; publication is the operator's act. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.78 | 35 | For a launch-consented run, this requirement displaces exactly this predecessor text: in REQ-polaris-generati… | the state directory and records; the copy is permitted by A46.79 | as v1.1 | holds | holds |
| A46.79 | 35 | For a run that makes the copy that REQ-polaris-generation-047 states, every one of which is launch-consented,… | the copy permitted, kept or removed as REQ-047 states; every copy run is launch-consented | n/a | copy removed | holds; repaired (finding 5) |
| A46.80 | 35 | That copy, its making, its keeping and its removal lie outside every statement of this requirement that Syzyg… | the copy is outside every writes-nothing, edits/removes-no-file and changes-no-working-tree statement of REQ-046 | n/a | removal of the copy is outside them | holds; repaired (finding 1), widened in the self-review |
| A46.81 | 35 | REQ-polaris-generation-047 alone governs them. | REQ-047 governs the copy | n/a | same | holds |
| A46.82 | 35 | It reads, and does not change: | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A46.83 | 35 | REQ-polaris-generation-033's requirement that the clone's HEAD equal a revision the in-force observation cons… | the copy's HEAD equals the pinned revision | the operator's HEAD must equal it (A47.15) | a HEAD mismatch refuses | holds |
| A46.84 | 37 | The run record and every rendered page SHALL disclose, in human and machine form: that the consents were reco… | discloses how the copy was made, Git's and Syzygy's reads, the agents' direction, location, kept; no stale 'before the answer' claim | copy items absent | no run record | holds; repaired (note 4) and reworded in the self-review |
| S46.1 | 46 | [First run on a repository asks once and records the consent] - **THEN** before reading any blob Syzygy asks … | asks before Syzygy reads any blob; the copy, made first, holds blobs Syzygy has not read | n/a | n/a | holds |
| S46.2 | 47 | [First run on a repository asks once and records the consent] - **AND** on the exact phrase it commits, on th… | records then proceeds on the copy | n/a | n/a | holds |
| S46.3 | 52 | [Governed subject records separate consents] - **THEN** Syzygy commits an observation consent record and a pr… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.4 | 53 | [Governed subject records separate consents] - **AND** revoking the statement alone refuses later steps of th… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.5 | 58 | [Drawer unknown] - **THEN** no drawer statement is recorded and the subject is treated as governed | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.6 | 59 | [Drawer unknown] - **AND** the question asks for the provider statement | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.7 | 64 | [Statement reused across revisions] - **THEN** the question asks only for the observation consent at the new … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.8 | 65 | [Statement reused across revisions] - **AND** no second statement for that subject and provider is created | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.9 | 70 | [Statement widened] - **THEN** Syzygy commits a new statement naming the wider set and the statement it super… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.10 | 71 | [Statement widened] - **AND** the earlier statement is rendered as superseded | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.11 | 76 | [Statement declined for a governed subject] - **THEN** Syzygy records the observation consent alone | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.12 | 77 | [Statement declined for a governed subject] - **AND** refuses to issue a brief, naming the missing statement,… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.13 | 82 | [No terminal or no phrase] - **THEN** Syzygy refuses before reading any blob or writing any record, naming th… | refuses before Syzygy reads a blob or writes a record; a copy, if made, is removed | same | this is a refusal run | holds |
| S46.14 | 83 | [No terminal or no phrase] - **AND** no launch consent record exists afterwards | no record | no record | no record | holds |
| S46.15 | 88 | [Not declared public] - **THEN** Syzygy refuses before writing any record, naming the screening-policy succes… | refuses before any record; copy removed | same | refusal | holds |
| S46.16 | 93 | [Name and URL warning for a repository not declared public] - **THEN** before the answer is asked for, the qu… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.17 | 94 | [Name and URL warning for a repository not declared public] - **AND** the question asks for no confirmation o… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.18 | 99 | [Records already in force] - **THEN** Syzygy asks nothing, writes no record, and names the records the run re… | asks nothing, writes no record, makes the copy | asks nothing, writes no record, no copy | n/a | holds; repaired (finding 1): was 'writes nothing' |
| S46.19 | 100 | [Records already in force] - **AND** the run record cites them as REQ-polaris-generation-033 requires | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.20 | 105 | [Earlier consent revoked] - **THEN** the question names the revoked record and its state before asking | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.21 | 106 | [Earlier consent revoked] - **AND** a confirmed answer creates a new record, and the revoked record stays rev… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.22 | 111 | [Re-identified clone] - **THEN** the question names no earlier record and states the re-identification residu… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.23 | 112 | [Re-identified clone] - **AND** the record and every page disclose the derived identity and URL as Inferred | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.24 | 117 | [A changed URL keeps the recorded identity] - **THEN** the question proposes that earlier identity, states it… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.25 | 118 | [A changed URL keeps the recorded identity] - **AND** a confirmed phrase records the new consent under that e… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.26 | 123 | [Matching records disagree on identity] - **THEN** Syzygy refuses before asking, naming both records, their i… | refuses before asking; copy removed | same | refusal | holds |
| S46.27 | 124 | [Matching records disagree on identity] - **AND** writes no record | writes no record | same | same | holds |
| S46.28 | 129 | [Locator on another host over ssh] - **THEN** the question proposes the identity `repository:sub-tool` and th… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.29 | 130 | [Locator on another host over ssh] - **AND** a confirmed answer records that normalised URL, and the run reco… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.30 | 135 | [GitHub identities keep their form] - **THEN** the proposed identity is `repository:redis-redis` and the norm… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.31 | 140 | [Same-named repository on two hosts] - **THEN** the question proposes `repository:a-b`, names that record as … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.32 | 141 | [Same-named repository on two hosts] - **AND** an observation consent made by another act whose `Upstream:` i… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.33 | 146 | [Consent found by its upstream URL] - **THEN** that consent matches by URL, the question names it with how it… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.34 | 151 | [Remote or given URL over http or git] - **THEN** the question proposes `repository:a-b` and the normalised U… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.35 | 156 | [Credentials in a given URL] - **THEN** Syzygy refuses before asking, naming the rule the URL fails, and the … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.36 | 161 | [Credentials in a remote URL] - **THEN** the user information is removed before the identity and URL are deri… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.37 | 166 | [Locator not admitted] - **THEN** Syzygy refuses before asking, naming the rule the URL fails, and makes no n… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.38 | 171 | [Remote URL that is not a locator] - **THEN** it derives nothing, the launch output names the remote and the … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.39 | 176 | [Visibility on another host] - **THEN** the question suggests no answer, Syzygy makes no request to learn the… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.40 | 181 | [Pre-answer classes shown as a preview] - **THEN** it labels them a preview of the policy's classification on… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.41 | 186 | [Write consent absent] - **THEN** Syzygy asks nothing and refuses, naming the missing write consent | asks nothing and refuses | same | refusal | holds |
| S46.42 | 187 | [Write consent absent] - **AND** writes nothing outside the run's state directory, save a copy REQ-polaris-ge… | writes nothing outside the state directory save the copy, which it removes | writes nothing outside it | refusal | holds; repaired (finding 1) |
| S46.43 | 192 | [Self-observation keeps the trunk tip stable] - **THEN** the first run's records are committed on the dedicat… | records on the dedicated reference; the copy changes no trunk | same | n/a | holds |
| S46.44 | 193 | [Self-observation keeps the trunk tip stable] - **AND** the second run pins the same trunk tip, finds the in-… | the second run pins the same tip and asks nothing; it makes a copy (S47.13) | n/a | n/a | holds |
| S46.45 | 198 | [Self-observation from the governance home] - **THEN** Syzygy refuses before asking and prints the one comman… | the operator's clone is the governance home: refused before asking | same | refusal | holds |
| S46.46 | 203 | [Owner placements absent at the pinned revision] - **THEN** the run proceeds, and every file a placement woul… | withheld files render Unknown | same | n/a | holds |
| S46.47 | 208 | [Agent instructions forbid answering] - **THEN** each that mentions consent tells the agent never to run a co… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.48 | 209 | [Agent instructions forbid answering] - **AND** every rendered page discloses that who answered rests on the … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.49 | 214 | [Launch consent never permits execution] - **THEN** the brief carries SEC-3's rule in the form REQ-polaris-ge… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| S46.50 | 215 | [Launch consent never permits execution] - **AND** no launch consent record names, implies or records an exec… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.1 | 223 | Syzygy itself reads a blob, or uses any commit field other than the root tree, parents and committer date, be… | Syzygy itself reads no blob before the answer; Git's reads excluded | as v1.1 | holds | holds; repaired in round 4 |
| F46.2 | 223 | anything from a read Syzygy itself makes before the answer is stored outside the question, launch output and … | Syzygy's own pre-answer reads only; the copy is Git's product | same | same | holds; scoped in the self-review |
| F46.3 | 223 | before the answer Syzygy itself reads anything of a clone that the pre-answer list does not name | Syzygy's reads only; no type read remains (finding 2) | same | same | holds; repaired (finding 2) |
| F46.4 | 223 | for a run that makes a copy, the question, the run record or a page omits a copy statement | copy statements present | n/a | a refusal states none | holds |
| F46.5 | 223 | the question omits any statement this requirement lists, including that only the owner may answer and the exi… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.6 | 223 | a record is created without the exact phrase, without a terminal, without the write consent, without a declar… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.7 | 223 | one record carries two of observation consent, drawer statement and provider statement | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.8 | 223 | a provider statement is created for a non-governed subject, or a second one for a subject and provider whose … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.9 | 223 | a drawer statement is created on any answer but that none exists | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.10 | 223 | a record names more than the pinned revision | a record names the pinned revision only | same | no record | holds |
| F46.11 | 223 | a file of the governance home or of the operator's clone is edited or removed, a working tree, index or refer… | files of the governance home and the operator's clone unchanged; the copy's own changes excepted | same | the copy's removal excepted | holds; repaired (finding 1) |
| F46.12 | 223 | Syzygy pushes the dedicated reference | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.13 | 223 | the proposed identity differs from the proposal rule, or is presented as Observed | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.14 | 223 | a launch whose matching records carry more than one identity, with no identity option, is not refused before … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.15 | 223 | the URL is recorded or rendered as the identity | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.16 | 223 | an operator-given URL not in an admitted form is admitted, a remote URL that is not a remote locator derives … | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.17 | 223 | an identity is derived other than from the last two path segments, or from a path of fewer than two | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.18 | 223 | Syzygy makes a network request for a locator or applies a rewriting of it | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.19 | 223 | a remote URL that is not a remote locator is printed, stored or recorded | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.20 | 223 | an observation consent made by another act matches by URL other than by its normalised `Upstream:` URL equall… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.21 | 223 | visibility is inferred from the host, scheme, a user name or a credential, or the question suggests an answer | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.22 | 223 | the pre-answer classes are not labelled a preview | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.23 | 223 | a matching revoked record is not named | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.24 | 223 | a run on the governance home's working tree or Git directory is not refused | the operator's clone is checked | same | refusal | holds |
| F46.25 | 223 | an in-force record set is not reused | records reused; copy made | records reused | n/a | holds |
| F46.26 | 223 | a disclosure this requirement lists is missing from the run record or a page | copy disclosures listed in A46.84 | none for the copy | no run record | holds |
| F46.27 | 223 | a file a placement would have placed renders other than Unknown | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.28 | 223 | for a repository the operator does not declare public, the answer is asked for before the question states tha… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.29 | 223 | an execution choice is asked for or recorded | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.30 | 223 | who answered is presented as Observed. | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| A47.1 | 238 | In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-fo… | a launch-consented HEAD pins HEAD and copies (A47.14) | another act's HEAD pins HEAD, no copy | holds | holds |
| A47.2 | 238 | Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 i… | one pin, before the question | same | a pin refusal precedes the question | holds |
| A47.3 | 238 | Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the bra… | trunk read as reference file data | same | no trunk: refused | holds |
| A47.4 | 238 | Where none of these exists, Syzygy SHALL refuse, naming `--revision`. | holds | holds | refusal | holds |
| A47.5 | 238 | The remote's default is the commit that the remote-tracking branch named by the symbolic reference `refs/remo… | holds | holds | several defaults: refusal | holds |
| A47.6 | 238 | While a remote default is recorded, no local branch is consulted for the pin: where a local branch of the sam… | holds | holds | n/a | holds |
| A47.7 | 238 | With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous… | a full id resolves without reading; an abbreviation from names (A47.31) | same | no or several: refused | holds |
| A47.8 | 238 | Where `--revision` names an object that is not a commit, an annotated tag included, Syzygy SHALL refuse, nami… | refused naming --revision; never pinned, used or followed | consents name commits only, so not reached | refusal | holds; repaired (finding 2) |
| A47.9 | 238 | Syzygy tells a non-commit without reading the object itself: where the copy's detached checkout fails, or lea… | told from the failed checkout or HEAD (observed fixture: tree and blob checkout exit 128; tag HEAD at the commit); takes the place of the form-check refusal | n/a | refusal; copy removed | holds; repaired (finding 2) |
| A47.10 | 238 | What Git reads of that object to make or check out the copy is the copy step's, not Syzygy's. | Git's reads of the object are the copy step's | n/a | same | holds |
| A47.11 | 240 | Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator'… | no network: local file transport only | no network | holds | holds |
| A47.12 | 240 | The launch output and the run record SHALL state the pinned revision in full, the reference it came from, the… | date from the copy's commit object | date from the operator's clone, as v1.1 | a refusal has no run record | holds |
| A47.13 | 242 | Syzygy SHALL NOT change the operator's clone: it SHALL NOT fetch into, prune, repack, check out in or write t… | the copy fetches from it; nothing written to it [Inferred: upload-pack writes nothing] | nothing written | same | holds |
| A47.14 | 242 | Every run this requirement pins, the run its first sentence pins included, SHALL run on a copy unless its pin… | copy unless another act's or a v1.1-scoped launch consent names the pin | the exception | refusals of either class | holds |
| A47.15 | 242 | A run that such a consent covers makes no copy: its clone is the operator's own, as REQ-polaris-generation-03… | n/a | operator's clone; HEAD mismatch refused before asking | refusal | holds |
| A47.16 | 242 | Where only such a launch observation consent covers the run, the operator's clone SHALL hold the pinned commi… | n/a | v1.1-scoped consent alone: one-commit form checked before asking | full clone refused (S47.15) | holds |
| A47.17 | 244 | Before the question, or before the brief where no question is asked, Syzygy SHALL make the copy as follows an… | before the question, or before the brief where none is asked | n/a | a refusal before the copy makes none | holds; reworded in the self-review |
| A47.18 | 244 | It SHALL create an empty directory of its own for the copy, never derived from the operator's clone's path, a… | Syzygy's own empty directory and repository | n/a | removed on refusal | holds |
| A47.19 | 244 | It SHALL fetch into that repository, from the operator's clone over Git's local file transport, the pinned co… | fetch by full id, depth one, no tags or submodules, detached checkout | n/a | a failed fetch or checkout refuses (A47.9, A47.32) | holds |
| A47.20 | 244 | Every Git process it starts for the copy SHALL run with the system and global Git configuration disabled, wit… | environment fixed; no hook runs [Observed, round 4 fixture]; processes execute nothing observed | n/a | same | holds; one sentence added in the self-review |
| A47.21 | 244 | The file URL of the operator's clone is not a locator, and is never recorded or rendered as one. | file URL never a locator | n/a | same | holds |
| A47.22 | 244 | The operator's HEAD need not be the pinned revision, and the copy's HEAD is the pinned revision. | the copy's HEAD is the pinned commit | the operator's HEAD must be it | a non-commit refused (A47.9) | holds |
| A47.23 | 244 | The copy SHALL hold the pinned commit and the trees and blobs reachable from its root tree alone, in the form… | form checked before the question | n/a | a departing copy refused; a tag's extra object refused through A47.9 | holds |
| A47.24 | 244 | Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the… | n/a | n/a | the copy, if made, removed and said | holds; 'if it made one' added in the self-review |
| A47.25 | 244 | Otherwise the copy is the run's clone for the rest of the run and is kept after it, outside the run's state d… | kept after the run, located | n/a | n/a | holds; added in round 4 |
| A47.26 | 246 | Syzygy uses nothing Git read but the copy it produced. | only the copy is used | n/a | same | holds |
| A47.27 | 246 | For every launch-consented run, the reads Syzygy itself makes, in process, of the operator's clone SHALL be o… | the list binds Syzygy's in-process reads | the list plus object reads and the binding form check's reads, the whole config included | same lists | holds; repaired (note 3) |
| A47.28 | 249 | - the names of its references, and the values of `HEAD` and the reference it names, of the references the tru… | references as file data; reftable refused before any Git process | same | reftable refusal | holds |
| A47.29 | 250 | - its configuration file, read as text only for its remotes' names and URLs and never honoured; | remote names and URLs only | yields to the form check (A47.27) | same | holds; repaired (note 3) |
| A47.30 | 251 | - whether `objects/info/alternates` exists, and, where the run makes a copy, a clone where it does SHALL be r… | alternates refused before any Git process | existence read only | refusal | holds |
| A47.31 | 252 | - for an abbreviated `--revision` alone, the object identifiers its loose object file names and pack indexes … | names only | same | ambiguity refused before any Git process | holds |
| A47.32 | 254 | A clone that lacks the pinned commit or an object reachable from it, a partial clone's missing object include… | a missing object fails the copy; nothing fetched elsewhere | REQ-033's missing-object refusal | refusal; copy removed | holds |
| A47.33 | 254 | From the copy on, the copy is the clone that REQ-polaris-generation-033 to 036 name and the run's clone REQ-p… | REQ-033 to 036 apply to the copy | apply to the operator's clone | holds | holds |
| A47.34 | 254 | Every brief and packet Syzygy issues to an agent session of a run with a copy SHALL name the copy as the clon… | briefs name the copy | n/a | no brief | holds |
| A47.35 | 254 | For a run with a copy, the run record SHALL state, labelled Inferred, that Syzygy relies on Git starting no p… | residual stated for a run with a copy | n/a | no run record | holds; scoped in the self-review |
| S47.1 | 263 | [Existing consent at HEAD keeps today's behaviour] - **THEN** Syzygy pins HEAD exactly as REQ-polaris-generat… | n/a | pins HEAD, no copy, asks nothing | n/a | holds |
| S47.2 | 268 | [Fork remote at a consented commit] - **THEN** Syzygy still pins HEAD exactly as REQ-polaris-generation-033 s… | n/a | pins HEAD, as v1.1 | n/a | holds |
| S47.3 | 273 | [Default to the trunk tip] - **THEN** Syzygy pins the commit `main` points to, and states it in full with its… | pins main's commit and copies; date from the copy | n/a | n/a | holds |
| S47.4 | 274 | [Default to the trunk tip] - **AND** states that it made no network request and prints the command to update … | no-network statement | n/a | n/a | holds |
| S47.5 | 279 | [Trunk named master] - **THEN** Syzygy pins the commit `master` points to | pins master's commit | n/a | n/a | holds |
| S47.6 | 284 | [No trunk] - **THEN** Syzygy refuses before asking for consent, naming `--revision` | n/a | n/a | refused before asking | holds |
| S47.7 | 289 | [Explicit revision] - **THEN** Syzygy pins that commit's full identifier, and any question names it | pins the full id; the copy holds it | n/a | n/a | holds |
| S47.8 | 294 | [HEAD elsewhere] - **THEN** Syzygy makes the copy at the pinned revision and does not refuse, and the operato… | copies; operator's checkout untouched | n/a | n/a | holds |
| S47.9 | 299 | [HEAD elsewhere with no copy] - **THEN** Syzygy makes no copy, refuses before asking for consent, changes not… | n/a | refused before asking, no copy | refusal | holds |
| S47.10 | 304 | [Existing full clone at the trunk tip] - **THEN** Syzygy pins the commit `refs/remotes/origin/main` points to… | copy before the question | n/a | n/a | holds |
| S47.11 | 305 | [Existing full clone at the trunk tip] - **AND** Syzygy itself reads no object of the operator's clone, chang… | Syzygy itself reads no object of the operator's clone | n/a | n/a | holds; repaired in round 4 |
| S47.12 | 306 | [Existing full clone at the trunk tip] - **AND** the question, the run record and every page state the copy s… | copy statements; briefs name the copy | n/a | n/a | holds |
| S47.13 | 311 | [Repeat run at a launch-consented HEAD] - **THEN** Syzygy pins that HEAD, makes the copy, and asks nothing, a… | copies, asks nothing (statements in force now stated in the WHEN) | n/a | n/a | holds; WHEN completed in the self-review |
| S47.14 | 316 | [Revision with launch records while HEAD is at another act's revision] - **THEN** the run is a launch-consent… | copies; reads only the list | n/a | n/a | holds |
| S47.15 | 321 | [Repeat run under a launch consent recorded by version 1.1] - **THEN** Syzygy makes no copy and refuses befor… | n/a | no copy; full clone refused | refusal | holds |
| S47.16 | 326 | [Several remote defaults] - **THEN** Syzygy refuses before asking for consent, naming `--revision` | n/a | n/a | refused before asking | holds |
| S47.17 | 331 | [Local branch ahead of the remote default] - **THEN** Syzygy pins the commit `refs/remotes/origin/main` point… | pins the remote-tracking commit; states both | n/a | n/a | holds |
| S47.18 | 336 | [Partial clone missing an object] - **THEN** the copy fails, Syzygy refuses with its reason, makes no network… | n/a | n/a | copy fails, refused, removed | holds |
| S47.19 | 341 | [Clone with an alternate] - **THEN** Syzygy refuses before any Git process starts, naming the reason | n/a | n/a | refused before any Git process | holds; scoped in round 4 |
| S47.20 | 346 | [Configuration and hooks of the operator's clone] - **THEN** the copy is made and none of those commands or h… | copy made, no hook or command runs [Observed fixture] | n/a | n/a | holds |
| S47.21 | 351 | [Revision naming an annotated tag] - **THEN** Syzygy refuses before asking for consent, naming `--revision`, … | n/a | n/a | refused from HEAD; not followed; removed | holds; mechanism repaired (finding 2) |
| S47.22 | 356 | [Revision naming a blob] - **THEN** the copy's detached checkout fails, Syzygy refuses before asking for cons… | n/a | n/a | checkout fails [Observed fixture]; refused; no blob read by Syzygy; removed | holds; added (finding 2) |
| S47.23 | 361 | [Ambiguous abbreviation] - **THEN** Syzygy refuses it as ambiguous before any Git process starts | n/a | n/a | refused before any Git process | holds |
| S47.24 | 366 | [References in the reftable backend] - **THEN** Syzygy refuses before any Git process starts, naming the reas… | n/a | n/a | refused before any Git process | holds |
| S47.25 | 371 | [A consent that states the clone's form] - **THEN** Syzygy makes no copy, and that stated form binds the run | n/a | no copy; stated form binds | n/a | holds |
| F47.1 | 379 | A run pins a commit other than the rule's | pin rule; holds in all three | pin rule; holds in all three | pin rule; holds in all three | holds |
| F47.2 | 379 | a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or … | consented HEAD pinned in both copy and no-copy runs | consented HEAD pinned in both copy and no-copy runs | consented HEAD pinned in both copy and no-copy runs | holds |
| F47.3 | 379 | the pin changes within a run | one pin per run | one pin per run | one pin per run | holds |
| F47.4 | 379 | for a run that makes no copy, a HEAD mismatch is not refused, or is refused only after the question | no-copy HEAD mismatch refused before the question | no-copy HEAD mismatch refused before the question | no-copy HEAD mismatch refused before the question | holds |
| F47.5 | 379 | a run that makes a copy is refused for the operator's HEAD | copy runs never refused for the operator's HEAD | copy runs never refused for the operator's HEAD | copy runs never refused for the operator's HEAD | holds |
| F47.6 | 379 | the launch output or run record lacks the full revision, its reference, the committer date, the no-network st… | statements on launch output and run record; a refusal has none | statements on launch output and run record; a refusal has none | statements on launch output and run record; a refusal has none | holds |
| F47.7 | 379 | Syzygy makes a network request, fetches from anywhere but the operator's clone into the copy, or changes the … | no network; fetch only from the operator's clone; it is unchanged | no network; fetch only from the operator's clone; it is unchanged | no network; fetch only from the operator's clone; it is unchanged | holds |
| F47.8 | 379 | a run that an observation consent made by another act covers makes a copy, or a run that neither such a conse… | copy population matches A47.14 | copy population matches A47.14 | copy population matches A47.14 | holds |
| F47.9 | 379 | the copy is made other than as this requirement states, or the run goes on although the copy holds more than … | reworded in the self-review: a run that goes on with an over-full or departing copy trips it; a refused tag copy does not | reworded in the self-review: a run that goes on with an over-full or departing copy trips it; a refused tag copy does not | reworded in the self-review: a run that goes on with an over-full or departing copy trips it; a refused tag copy does not | holds |
| F47.10 | 379 | a Git process for the copy runs with the system or global configuration, another transport, lazy fetching or … | Git environment; no hook or configured command runs | Git environment; no hook or configured command runs | Git environment; no hook or configured command runs | holds |
| F47.11 | 379 | a reftable clone or a clone with an alternates file is not refused before any Git process starts, or a failed… | reftable and alternates before any Git process; failed copy refused | reftable and alternates before any Git process; failed copy refused | reftable and alternates before any Git process; failed copy refused | holds |
| F47.12 | 379 | for a launch-consented run, Syzygy itself, in process, reads of the operator's clone anything this requiremen… | scoped to launch-consented runs (note 3) | scoped to launch-consented runs (note 3) | scoped to launch-consented runs (note 3) | holds |
| F47.13 | 379 | a run that only a launch observation consent recorded with the operator's-own-clone scope covers makes a copy… | v1.1-scoped consent: no copy, one-commit form | v1.1-scoped consent: no copy, one-commit form | v1.1-scoped consent: no copy, one-commit form | holds |
| F47.14 | 379 | a completed run's copy is removed without the operator, or its location is not named | completed copy kept and located | completed copy kept and located | completed copy kept and located | holds |
| F47.15 | 379 | a non-commit `--revision` is followed, pinned or used, or is told from a commit by Syzygy reading the object … | non-commit never followed, pinned or used, nor told by Syzygy reading it (finding 2) | non-commit never followed, pinned or used, nor told by Syzygy reading it (finding 2) | non-commit never followed, pinned or used, nor told by Syzygy reading it (finding 2) | holds |
| F47.16 | 379 | the copy is not removed when the run ends before its brief | copy removed when the run ends before its brief | copy removed when the run ends before its brief | copy removed when the run ends before its brief | holds |
| F47.17 | 379 | a brief or packet does not name the copy | briefs name the copy | briefs name the copy | briefs name the copy | holds |
| F47.18 | 379 | the copy statements are missing | copy statements present | copy statements present | copy statements present | holds |
| F47.19 | 379 | the trunk tip is presented as the upstream's latest as Observed. | Inferred label on the tip | Inferred label on the tip | Inferred label on the tip | holds |
