# Round 6 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 6
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-6-RAW.md`) read commit
> `083ad8c5` and returned `REVISE` (line 4): two revise findings, both edge
> cases, and two notes. The loop continues while rounds converge, per the
> owner's 2026-11-10 instruction relayed by the coordinating session. This
> page disposes each finding and records the extended self-review. Line
> numbers are those of the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict; round 7 decides that.

## 1 — A failed detached checkout is declared to mean "not a commit", and a real commit can fail it

**Repaired by separating the two causes** (line 238):

- A detached checkout that succeeds but leaves the copy's `HEAD` at an
  object other than the pinned identifier means the pinned object is not a
  commit. Syzygy refuses, naming `--revision` or the reference.
- A failed checkout is refused naming the pinned identifier and the
  checkout's failure, "stating that the object was not shown to be a
  commit: it is either not a commit or a commit that could not be checked
  out, and the refusal SHALL NOT say which".
- Either refusal takes the place of the form check's.

Fixture evidence (Git 2.53.0, run with the stated environment on scratch
fixtures that were then deleted):

- [Observed, this round] A commit whose root tree holds one entry named
  `.GIT` (`cat-file -t` gives `commit`): the depth-1 fetch exited 0, the
  detached checkout exited 1 with "error: invalid path '.GIT'", and `HEAD`
  did not resolve.
- [Observed, round 5 fixture] A tree or a blob failed its checkout with exit
  128; an annotated tag's checkout succeeded with `HEAD` at the tag's
  commit.

So a failed checkout cannot tell a commit from a non-commit without an
object read. The spec does not try: the refusal names the failure and does
not claim a cause. The exit codes differ (1 against 128), but the spec does
not rely on them, since nothing makes that difference a Git contract.

- **Scenario.** "Commit whose checkout fails" is added (line 359). The blob
  scenario now expects "not shown to be a commit".
- **Falsifier.** An arm is added: "a run whose checkout failed is refused as
  not a commit, or as a commit" (line 385).
- **The same class elsewhere.** The refusal sweep below found it in the
  copy-failure refusal too. A failed fetch need not mean a missing object
  (a full disk or a permission error also fail it). REQ-047 now says
  (line 254): "Every failure of a Git process for the copy SHALL be
  refused, naming that process and its failure as Git reported it; a
  refusal SHALL NOT state a cause, a missing object or a non-commit among
  them, that Syzygy has not observed."

## 2 — The committer-date statement cannot be met by a copy run refused before its copy holds the commit

**Repaired by scoping** (line 240):

- The revision, its reference, the no-network statement and the update
  command are stated "Once a revision is pinned".
- The committer date is stated "where Syzygy has read that object as
  REQ-polaris-generation-046 permits, and otherwise … that the date is
  Unknown, never a guess". This covers a run refused before its clone shows
  the pinned commit: a failed or departing copy, an alternates file or a
  non-commit.
- "A run refused before any revision is pinned states the refusal alone."
  These are no trunk, several remote defaults, an ambiguous abbreviation
  and reftable.
- The falsifier arm is scoped the same way, and also trips on a date that
  Syzygy did not read.
- The alternates scenario gains an AND stating the date as Unknown
  (line 342).

## 3 — The self-review table's labels and columns are not what its method says

**Repaired in a new table below; round 5's table is left as the review
read it.** Eleven rows that describe a refusal or the end of a run are
now judged per run instead of "independent of the copy":

- the reviewer's six: A46.11, A46.25, A46.32, S46.12, S46.35 and S46.37;
- five more the same pass found: A46.63, A46.70, S46.4, S46.11 and F46.14.

The REQ-047 falsifier arms now carry a judgment per run. A row still
marked "independent of the copy" concerns identity, locators, visibility,
the preview label, the ceremony, record fields, the drawer or provider
statements, or revocation. It reads and writes nothing the copy changes,
and it ends no run.

## 4 — Earlier concerns: rounds 1 to 5 answered, except where findings 1 and 2 reopen a class

**Noted.** Both are repaired above. The stage and refusal sweeps below
target the class directly: a statement or refusal that a conforming run
cannot truthfully make.

## Stage sweep: every statement the launch output, run record or pages carry, by the stage at which a run is refused

[Inferred, the drafter's own judgments; method: each statement REQ-046 and
REQ-047 require of the launch output, the run record or a page, read
against a conforming copy run refused at each stage. Whether a refused run
writes a run record is not stated by these requirements; each row holds
whether or not it does.]

Stages:

- **B** refused before the copy, before any Git process starts. Without a
  pin: no trunk, several remote defaults, ambiguous abbreviation, reftable.
  With a pin: an alternates file, or a full clone under a v1.1-scoped
  consent.
- **D** refused during the copy: a fetch or checkout failure.
- **P** refused after the copy, before the question:
  - a non-commit after a successful checkout;
  - a departing copy;
  - several identities;
  - a URL not admitted;
  - the governance home;
  - not declared public;
  - the write consent absent.
- **Q** refused after the question: no terminal, no answer or a wrong
  phrase, or a statement declined.

| Statement (source) | B | D | P | Q | Repair |
|---|---|---|---|---|---|
| Pinned revision in full, its reference (A47.13) | pinned: stated; unpinned: refusal alone | stated | stated | stated | scoped "once a revision is pinned" (finding 2) |
| No network request (A47.13) | true where pinned | true | true | true | none |
| Update command (A47.13) | printable where pinned | printable | printable | printable | none |
| Committer date (A47.14) | Unknown | Unknown | Unknown for a non-commit or departing copy, unless read; read otherwise | read | scoped; Unknown otherwise (finding 2) |
| Local branch differs from the remote default (A47.6) | from reference data, true where read | true | true | true | none |
| Remote carried user information; remote not a locator (A46.33, A46.34) | from configuration text, true where read | true | true | true | none |
| Copy removed (A47 removal rule) | no copy: "if it made one" | true | true | true | "if it made one" (round 5) |
| Copy location and kept (A47.25) | not reached | not reached | not reached | not reached | completed runs only |
| Copy statements in the question (A46.13) | no question | no question | no question | stated before the answer; its removal clause predicts "removed if the run ends before its brief" | round 5 |
| Run record copy disclosures (A46.84) | no copy | made, read, removed | made, read, removed | made, read, removed | "whether the copy was kept … or removed" (this round) |
| Git-programs residual (A47.35) | no copy | true | true | true | none |
| Identity, URL and residuals, labelled Inferred (A46.23, A46.28) | true where derived | true | true | true | none |
| Preview label (A46.10) | not shown | not shown | where shown | shown | none |
| Who answered, Inferred (A46.18) | no answer | no answer | no answer | where recorded | none |
| Records recorded at launch (A46.84) | none recorded | none | none | only where confirmed (statement declined: consent recorded) | none |

## Refusal sweep: every refusal, and the statement it can truthfully make

| Refusal (source) | Stage | What it names | Truthful in every conforming case? |
|---|---|---|---|
| No terminal, no answer, wrong phrase (A46.11) | Q | the missing consents and the command | yes |
| Several identities (A46.25) | P | each record, its identity, how it matched, the option | yes |
| URL not admitted (A46.32) | B or P | the rule it fails; never the URL | yes |
| Not declared public, no policy (A46.70) | P | the missing successor | yes |
| Governance home (A46.73) | P | the command for a separate clone | yes |
| Write consent absent (A46.75) | P | the missing consent | yes |
| Statement declined (A46.55) | Q | the missing statement, as REQ-033 | yes |
| Revoked record (A46.63) | later steps | the revocation | yes |
| No trunk (A47.4) | B | `--revision` | yes |
| Several remote defaults (A47.5) | B | `--revision` | yes |
| No commit, or several, for a name (A47.7) | B, or D for an unknown full identifier | the name; a fetch failure is named as Git reported it | yes, since this round's Git-failure rule |
| Annotated tag: HEAD elsewhere after a successful checkout (A47.9) | P | `--revision` or the reference, "not a commit" | yes [Observed: only a peeled tag lands HEAD elsewhere; Inferred for other Git versions] |
| Failed checkout (A47.10) | D | the identifier and the failure, "not shown to be a commit" | yes, since this round (finding 1) |
| Any other Git failure for the copy (A47.36) | D | the process and Git's report; no unobserved cause | yes, added this round |
| Missing object, partial clone (A47 copy failure) | D | Git's failure | yes |
| HEAD mismatch, no copy (A47 no-copy rule) | B | the checkout command | yes |
| v1.1-scoped consent, full clone (A47 one-commit rule) | B | that the consent holds the revision in the operator's clone and the clone holds more | yes; the form check observes it |
| Departing copy (A47 form check) | P | the departure the form check observed | yes |
| Reftable (A47 list) | B | the reason | yes; the backend is observed from files |
| Alternates (A47 list) | B | the reason | yes; the file's existence is observed |
| Ambiguous abbreviation (A47 list) | B | ambiguity | yes; from names |

## Self-review, round 6: every absolute, falsifier arm and scenario THEN of REQ-046 and REQ-047

[Observed] The method is as in round 5: the same enumerating script over
the post-apply spec of this commit, 250 items:

| Population | REQ-046 | REQ-047 |
|---|---|---|
| absolutes | 84 | 39 |
| arms | 30 | 20 |
| scenario lines | 50 | 27 |

Each item is judged per run. Items unchanged since round 5 carry round 5's
judgment, except the eleven relabelled under finding 3. Items new or
changed this round, and every REQ-047 arm, carry new judgments.
[Inferred] The judgments are the drafter's own.

| Item | Line | Clause (opening) | Copy run | No-copy run | Refusal run | Result |
|---|---|---|---|---|---|---|
| A46.1 | 9 | In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-… | Syzygy reads no blob before asking; the copy step's Git reads are not Syzygy's (A46.5) | object reads only, as v1.1 | refused before any blob read | holds |
| A46.2 | 9 | Before the answer Syzygy SHALL read of the clones only what the question needs, and only these: of the operat… | operator's clone: REQ-047 list; copy: form-check files (incl. HEAD, used for the non-commit refusal); objects in the copy | operator's clone: REQ-047 list incl. form-check files; objects in the operator's clone | a refusal reads no more than the list | holds; repaired in round 5 (type read removed, finding 2) |
| A46.3 | 9 | It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and… | Syzygy reads no blob; Git's are excluded (A46.5) | as v1.1 | holds | holds |
| A46.4 | 9 | These rules bind every read Syzygy itself makes, in process, of either clone. | binds Syzygy's in-process reads of both clones | binds reads of the operator's clone | holds | holds |
| A46.5 | 9 | The reads made by the Git processes that REQ-polaris-generation-047 starts to make the copy, in the operator'… | the copy's Git processes are excluded from REQ-046's read rules | n/a | a copy made then refused: same | holds |
| A46.6 | 9 | REQ-polaris-generation-047's copy rules alone govern them, and Syzygy SHALL use nothing they read but the cop… | Syzygy uses only the copy | n/a | the copy is removed | holds |
| A46.7 | 9 | From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.8 | 9 | Those classes are a preview: the effective classification policy's classification as it would apply once an o… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.9 | 9 | The preview label describes only how the classes were computed before the answer; it does not make the owner'… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.10 | 9 | The question, the launch output and every record that names them SHALL label them a preview, and a confirmed … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.11 | 11 | Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the … | refusal; the copy, if made, is removed (A47 removal rule): no terminal, no answer or a wrong phrase: refused naming the missing consents | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| A46.12 | 11 | The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pin… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.13 | 11 | The question SHALL state, before the answer is asked for: the proposed repository identity, how it was propos… | copy statements present; removal statement now matches A47.24-25 | copy statements absent, as A46.13 scopes them | a refused copy run that asks no question states nothing | holds; repaired (note 4) |
| A46.14 | 11 | Where the operator does not declare the repository public, whether the declaration is that it is not public o… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.15 | 11 | That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, ph… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.16 | 13 | The question, and every skill and agent text Syzygy ships, SHALL say that only the owner answers it, in perso… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.17 | 13 | An answer typed by an agent is not an owner act: under RFC3-16's trust premise for state (1), an implementati… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.18 | 13 | Syzygy SHALL record who answered as the operator's declaration that the owner answered in person, label it In… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.19 | 15 | Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.20 | 15 | The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generati… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.21 | 15 | Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.22 | 15 | The rule takes the last two path segments for every host, so the host and every earlier path segment (a group… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.23 | 15 | The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with th… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.24 | 15 | The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where e… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.25 | 15 | Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none an… | refusal; the copy, if made, is removed (A47 removal rule): several identities: refused before asking, naming each record | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| A46.26 | 15 | Where the operator gives an identity that a matching record does not carry, the question SHALL name every suc… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.27 | 15 | The URL, recorded and derived, is a locator hint and never the identity. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.28 | 15 | Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified unde… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.29 | 17 | A URL the operator gives as a locator (`--url` or the upstream option) SHALL be in one of the admitted locato… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.30 | 17 | An operator-given URL carries no credentials: an `https://`, `http://` or `git://` URL carrying any user info… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.31 | 17 | A URL carrying a query or a fragment, or a percent-encoded character in its user information or host, a URL o… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.32 | 17 | Syzygy SHALL refuse an operator-given URL that is not admitted, naming the rule it fails, and SHALL NOT print… | refusal; the copy, if made, is removed (A47 removal rule): URL not admitted: refused naming the rule, URL never printed | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| A46.33 | 17 | A remote URL that is not a remote locator derives nothing, as for a clone with no remote, and Syzygy SHALL NO… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.34 | 17 | Where a remote URL carried user information, the launch output SHALL say so, and Syzygy SHALL NOT print, stor… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.35 | 17 | Syzygy SHALL make no network request to resolve, check or reach a locator, and SHALL apply no rewriting of it… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.36 | 17 | The normalised URL is the locator every launch consent record, the run record and every page carry, for every… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.37 | 17 | An observation consent made by any other act, which records no normalised URL, also matches the run by URL, a… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.38 | 17 | This match adds to the matching above and never restricts it, nor the revision branch of REQ-polaris-generati… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.39 | 17 | By URL alone, a consent is never matched for a same-named repository on another host or under another group. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.40 | 19 | Whether the repository is public is the operator's declaration alone, for every host and form. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.41 | 19 | Syzygy SHALL NOT infer it from the host, the scheme, a user name or whether the operator's clone needed a cre… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.42 | 19 | A repository that the operator does not declare public is not public under the effective screening policy, wh… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.43 | 21 | A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write… | scope: held in the copy | a no-copy run never records an observation consent: its revision is already covered (A46.37, A47.14) | no record | holds |
| A46.44 | 21 | It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.45 | 21 | Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) an… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.46 | 21 | While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelate… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.47 | 21 | Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the op… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.48 | 23 | The question SHALL ask the owner whether a kernel evidence drawer exists for the subject, with the answers th… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.49 | 23 | An answer that none exists SHALL create a drawer statement: a launch consent record of its own, for the subje… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.50 | 23 | The other two answers create no record, and the subject is then governed under REQ-polaris-generation-033. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.51 | 23 | A subject is non-governed under a launch drawer statement only when the tree at the pinned revision also meet… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.52 | 25 | For a subject that is governed under REQ-polaris-generation-033, or whose drawer status is unknown, the answe… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.53 | 25 | An in-force statement for the same subject and provider whose classes include every class the path classifica… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.54 | 25 | Where it does not include them, the question SHALL offer a new statement naming the wider set, whose record n… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.55 | 25 | Where the owner declines a needed statement, Syzygy SHALL record the other confirmed records and refuse to is… | copy kept? no: run ends before its brief, so A47.24 removes it | no copy | holds | holds |
| A46.56 | 25 | A statement SHALL NOT be created for a non-governed subject. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.57 | 25 | The observation consent, the drawer statement and the provider statement are separate records, each separatel… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.58 | 27 | A launch consent record is in force from its own owner-act record and from the recording commit that contains… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.59 | 27 | Syzygy SHALL make that recording commit itself, on one dedicated reference of the governance home that the wr… | the recording commit changes no working tree; the copy's own changes are excluded by A46.80 | as v1.1 | no commit | holds; A46.80 widened in the self-review |
| A46.60 | 27 | Syzygy SHALL read launch consent records only from that reference's commits, as Git objects. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.61 | 27 | Because the dedicated reference never becomes the trunk, recording a launch consent never moves the trunk tip… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.62 | 27 | A record stays in force until a later owner act revokes or supersedes it; it does not expire when the run clo… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.63 | 27 | Revocation is unchanged (RFC5-13): a revoked launch consent record refuses every later step of every run that… | a revocation refuses later steps; before the brief the copy is removed, after it the copy is kept | same, no copy | this is a refusal | holds; relabelled (round 6 finding 3) |
| A46.64 | 27 | Where in-force records already hold every consent and statement the run needs, Syzygy SHALL use them, name th… | asks nothing; makes the copy (S47.13) | asks nothing, no copy | n/a | holds |
| A46.65 | 27 | Where a matching record has been revoked or withdrawn, the question SHALL name it and its state; a new answer… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.66 | 29 | Syzygy SHALL read launch consent records of every repository through one generic form, with no per-repository… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.67 | 29 | Launch consent adds no readers beyond that form, no egress and no execution. | Git processes execute nothing of the observed repository and are not an execution choice (A47.20) | no process | holds | holds; A47.20 sentence added in the self-review |
| A46.68 | 29 | Syzygy SHALL read the repository's blobs only as REQ-polaris-generation-033 permits, under the observing proj… | Syzygy reads the copy's blobs after the answer under REQ-033; Git's copy-step reads are not Syzygy's (A46.5) | as v1.1 | no blob read | holds |
| A46.69 | 29 | Its owner placements, which place named paths of one repository at one commit, are per repository and per com… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.70 | 29 | A repository that the operator does not declare public SHALL be refused before any record is written while no… | refusal; the copy, if made, is removed (A47 removal rule): not declared public: refused before any record, naming the successor | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| A46.71 | 29 | A successor that admits non-public sources through this same observation consent record lifts the refusal for… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A46.72 | 29 | The execution choice and its rules (REQ-polaris-generation-033, SEC-3, D9) are unchanged: a launch consent is… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
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
| A46.84 | 37 | The run record and every rendered page SHALL disclose, in human and machine form: that the consents were reco… | discloses how the copy was made, the reads, the agents' direction, location, and whether kept or removed | copy items absent | a refused copy run's record says the copy was removed | holds; repaired in the stage sweep |
| S46.1 | 46 | [First run on a repository asks once and records the consent] - **THEN** before reading any blob Syzygy asks … | asks before Syzygy reads any blob; the copy, made first, holds blobs Syzygy has not read | n/a | n/a | holds |
| S46.2 | 47 | [First run on a repository asks once and records the consent] - **AND** on the exact phrase it commits, on th… | records then proceeds on the copy | n/a | n/a | holds |
| S46.3 | 52 | [Governed subject records separate consents] - **THEN** Syzygy commits an observation consent record and a pr… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.4 | 53 | [Governed subject records separate consents] - **AND** revoking the statement alone refuses later steps of th… | as A46.63 | as A46.63 | this is a refusal of later steps | holds; relabelled (round 6 finding 3) |
| S46.5 | 58 | [Drawer unknown] - **THEN** no drawer statement is recorded and the subject is treated as governed | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.6 | 59 | [Drawer unknown] - **AND** the question asks for the provider statement | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.7 | 64 | [Statement reused across revisions] - **THEN** the question asks only for the observation consent at the new … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.8 | 65 | [Statement reused across revisions] - **AND** no second statement for that subject and provider is created | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.9 | 70 | [Statement widened] - **THEN** Syzygy commits a new statement naming the wider set and the statement it super… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.10 | 71 | [Statement widened] - **AND** the earlier statement is rendered as superseded | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.11 | 76 | [Statement declined for a governed subject] - **THEN** Syzygy records the observation consent alone | refusal; the copy, if made, is removed (A47 removal rule): statement declined: the run ends before its brief | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| S46.12 | 77 | [Statement declined for a governed subject] - **AND** refuses to issue a brief, naming the missing statement,… | refusal; the copy, if made, is removed (A47 removal rule): statement declined: brief refused, observation consent recorded | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| S46.13 | 82 | [No terminal or no phrase] - **THEN** Syzygy refuses before reading any blob or writing any record, naming th… | refuses before Syzygy reads a blob or writes a record; a copy, if made, is removed | same | this is a refusal run | holds |
| S46.14 | 83 | [No terminal or no phrase] - **AND** no launch consent record exists afterwards | no record | no record | no record | holds |
| S46.15 | 88 | [Not declared public] - **THEN** Syzygy refuses before writing any record, naming the screening-policy succes… | refuses before any record; copy removed | same | refusal | holds |
| S46.16 | 93 | [Name and URL warning for a repository not declared public] - **THEN** before the answer is asked for, the qu… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.17 | 94 | [Name and URL warning for a repository not declared public] - **AND** the question asks for no confirmation o… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.18 | 99 | [Records already in force] - **THEN** Syzygy asks nothing, writes no record, and names the records the run re… | asks nothing, writes no record, makes the copy | asks nothing, writes no record, no copy | n/a | holds; repaired (finding 1): was 'writes nothing' |
| S46.19 | 100 | [Records already in force] - **AND** the run record cites them as REQ-polaris-generation-033 requires | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.20 | 105 | [Earlier consent revoked] - **THEN** the question names the revoked record and its state before asking | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.21 | 106 | [Earlier consent revoked] - **AND** a confirmed answer creates a new record, and the revoked record stays rev… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.22 | 111 | [Re-identified clone] - **THEN** the question names no earlier record and states the re-identification residu… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.23 | 112 | [Re-identified clone] - **AND** the record and every page disclose the derived identity and URL as Inferred | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.24 | 117 | [A changed URL keeps the recorded identity] - **THEN** the question proposes that earlier identity, states it… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.25 | 118 | [A changed URL keeps the recorded identity] - **AND** a confirmed phrase records the new consent under that e… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.26 | 123 | [Matching records disagree on identity] - **THEN** Syzygy refuses before asking, naming both records, their i… | refuses before asking; copy removed | same | refusal | holds |
| S46.27 | 124 | [Matching records disagree on identity] - **AND** writes no record | writes no record | same | same | holds |
| S46.28 | 129 | [Locator on another host over ssh] - **THEN** the question proposes the identity `repository:sub-tool` and th… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.29 | 130 | [Locator on another host over ssh] - **AND** a confirmed answer records that normalised URL, and the run reco… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.30 | 135 | [GitHub identities keep their form] - **THEN** the proposed identity is `repository:redis-redis` and the norm… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.31 | 140 | [Same-named repository on two hosts] - **THEN** the question proposes `repository:a-b`, names that record as … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.32 | 141 | [Same-named repository on two hosts] - **AND** an observation consent made by another act whose `Upstream:` i… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.33 | 146 | [Consent found by its upstream URL] - **THEN** that consent matches by URL, the question names it with how it… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.34 | 151 | [Remote or given URL over http or git] - **THEN** the question proposes `repository:a-b` and the normalised U… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.35 | 156 | [Credentials in a given URL] - **THEN** Syzygy refuses before asking, naming the rule the URL fails, and the … | refusal; the copy, if made, is removed (A47 removal rule): credentials in a given URL: refused before asking | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| S46.36 | 161 | [Credentials in a remote URL] - **THEN** the user information is removed before the identity and URL are deri… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.37 | 166 | [Locator not admitted] - **THEN** Syzygy refuses before asking, naming the rule the URL fails, and makes no n… | refusal; the copy, if made, is removed (A47 removal rule): locator not admitted: refused before asking, no network request | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| S46.38 | 171 | [Remote URL that is not a locator] - **THEN** it derives nothing, the launch output names the remote and the … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.39 | 176 | [Visibility on another host] - **THEN** the question suggests no answer, Syzygy makes no request to learn the… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.40 | 181 | [Pre-answer classes shown as a preview] - **THEN** it labels them a preview of the policy's classification on… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.41 | 186 | [Write consent absent] - **THEN** Syzygy asks nothing and refuses, naming the missing write consent | asks nothing and refuses | same | refusal | holds |
| S46.42 | 187 | [Write consent absent] - **AND** writes nothing outside the run's state directory, save a copy REQ-polaris-ge… | writes nothing outside the state directory save the copy, which it removes | writes nothing outside it | refusal | holds; repaired (finding 1) |
| S46.43 | 192 | [Self-observation keeps the trunk tip stable] - **THEN** the first run's records are committed on the dedicat… | records on the dedicated reference; the copy changes no trunk | same | n/a | holds |
| S46.44 | 193 | [Self-observation keeps the trunk tip stable] - **AND** the second run pins the same trunk tip, finds the in-… | the second run pins the same tip and asks nothing; it makes a copy (S47.13) | n/a | n/a | holds |
| S46.45 | 198 | [Self-observation from the governance home] - **THEN** Syzygy refuses before asking and prints the one comman… | the operator's clone is the governance home: refused before asking | same | refusal | holds |
| S46.46 | 203 | [Owner placements absent at the pinned revision] - **THEN** the run proceeds, and every file a placement woul… | withheld files render Unknown | same | n/a | holds |
| S46.47 | 208 | [Agent instructions forbid answering] - **THEN** each that mentions consent tells the agent never to run a co… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.48 | 209 | [Agent instructions forbid answering] - **AND** every rendered page discloses that who answered rests on the … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.49 | 214 | [Launch consent never permits execution] - **THEN** the brief carries SEC-3's rule in the form REQ-polaris-ge… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| S46.50 | 215 | [Launch consent never permits execution] - **AND** no launch consent record names, implies or records an exec… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.1 | 223 | Syzygy itself reads a blob, or uses any commit field other than the root tree, parents and committer date, be… | Syzygy itself reads no blob before the answer; Git's reads excluded | as v1.1 | holds | holds; repaired in round 4 |
| F46.2 | 223 | anything from a read Syzygy itself makes before the answer is stored outside the question, launch output and … | Syzygy's own pre-answer reads only; the copy is Git's product | same | same | holds; scoped in the self-review |
| F46.3 | 223 | before the answer Syzygy itself reads anything of a clone that the pre-answer list does not name | Syzygy's reads only; no type read remains (finding 2) | same | same | holds; repaired (finding 2) |
| F46.4 | 223 | for a run that makes a copy, the question, the run record or a page omits a copy statement | copy statements present | n/a | a refusal states none | holds |
| F46.5 | 223 | the question omits any statement this requirement lists, including that only the owner may answer and the exi… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.6 | 223 | a record is created without the exact phrase, without a terminal, without the write consent, without a declar… | holds; independent of the copy | holds; independent of the copy | holds, or not reached | holds |
| F46.7 | 223 | one record carries two of observation consent, drawer statement and provider statement | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.8 | 223 | a provider statement is created for a non-governed subject, or a second one for a subject and provider whose … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.9 | 223 | a drawer statement is created on any answer but that none exists | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.10 | 223 | a record names more than the pinned revision | a record names the pinned revision only | same | no record | holds |
| F46.11 | 223 | a file of the governance home or of the operator's clone is edited or removed, a working tree, index or refer… | files of the governance home and the operator's clone unchanged; the copy's own changes excepted | same | the copy's removal excepted | holds; repaired (finding 1) |
| F46.12 | 223 | Syzygy pushes the dedicated reference | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.13 | 223 | the proposed identity differs from the proposal rule, or is presented as Observed | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.14 | 223 | a launch whose matching records carry more than one identity, with no identity option, is not refused before … | refusal; the copy, if made, is removed (A47 removal rule): several identities: refused before asking | same, no copy | this is the refusal | holds; relabelled (round 6 finding 3) |
| F46.15 | 223 | the URL is recorded or rendered as the identity | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.16 | 223 | an operator-given URL not in an admitted form is admitted, a remote URL that is not a remote locator derives … | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.17 | 223 | an identity is derived other than from the last two path segments, or from a path of fewer than two | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.18 | 223 | Syzygy makes a network request for a locator or applies a rewriting of it | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.19 | 223 | a remote URL that is not a remote locator is printed, stored or recorded | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.20 | 223 | an observation consent made by another act matches by URL other than by its normalised `Upstream:` URL equall… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.21 | 223 | visibility is inferred from the host, scheme, a user name or a credential, or the question suggests an answer | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.22 | 223 | the pre-answer classes are not labelled a preview | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.23 | 223 | a matching revoked record is not named | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.24 | 223 | a run on the governance home's working tree or Git directory is not refused | the operator's clone is checked | same | refusal | holds |
| F46.25 | 223 | an in-force record set is not reused | records reused; copy made | records reused | n/a | holds |
| F46.26 | 223 | a disclosure this requirement lists is missing from the run record or a page | copy disclosures listed in A46.84 | none for the copy | no run record | holds |
| F46.27 | 223 | a file a placement would have placed renders other than Unknown | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.28 | 223 | for a repository the operator does not declare public, the answer is asked for before the question states tha… | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.29 | 223 | an execution choice is asked for or recorded | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| F46.30 | 223 | who answered is presented as Observed. | holds; independent of the copy | holds; independent of the copy | holds; independent of the copy | holds |
| A47.1 | 238 | In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-fo… | a launch-consented HEAD pins HEAD and copies (A47.14) | another act's HEAD pins HEAD, no copy | holds | holds |
| A47.2 | 238 | Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 i… | one pin, before the question | same | a pin refusal precedes the question | holds |
| A47.3 | 238 | Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the bra… | trunk read as reference file data | same | no trunk: refused | holds |
| A47.4 | 238 | Where none of these exists, Syzygy SHALL refuse, naming `--revision`. | holds | holds | refusal | holds |
| A47.5 | 238 | The remote's default is the commit that the remote-tracking branch named by the symbolic reference `refs/remo… | holds | holds | several defaults: refusal | holds |
| A47.6 | 238 | While a remote default is recorded, no local branch is consulted for the pin: where a local branch of the sam… | holds | holds | n/a | holds |
| A47.7 | 238 | With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous… | a full id resolves without reading; an abbreviation from names (A47.31) | same | no or several: refused | holds |
| A47.8 | 238 | Where `--revision` names an object that is not a commit, an annotated tag included, Syzygy SHALL refuse, nami… | refused naming --revision; never pinned, used or followed | consents name commits only, so not reached | refusal | holds; repaired (finding 2) |
| A47.9 | 238 | Where the copy's detached checkout succeeds and leaves the copy's `HEAD` at an object other than the pinned i… | a successful checkout leaving HEAD elsewhere: a tag, so not a commit [Observed: only tags] | n/a | refusal naming --revision or the reference; copy removed | holds; repaired (finding 1) |
| A47.10 | 238 | Where the detached checkout fails, Syzygy SHALL refuse, naming the pinned identifier and the checkout's failu… | n/a | n/a | failed checkout: refused naming the id and the failure, 'not shown to be a commit' [Observed: a real commit with a `.GIT` entry fails with exit 1] | holds; repaired (finding 1) |
| A47.11 | 238 | What Git reads of that object to make or check out the copy is the copy step's, not Syzygy's. | Git's reads of the object are the copy step's | n/a | same | holds |
| A47.12 | 240 | Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator'… | no network: local file transport only | no network | holds | holds |
| A47.13 | 240 | Once a revision is pinned, the launch output and the run record SHALL state the pinned revision in full, the … | revision, reference, no-network, update command | same | stated once pinned; a refusal before a pin states the refusal alone | holds; repaired (finding 2) |
| A47.14 | 240 | They SHALL state the commit's committer date as the commit object records it where Syzygy has read that objec… | date read from the copy's commit object | date read from the operator's clone as REQ-046 permits | refused before the clone shows the commit: date Unknown | holds; repaired (finding 2) |
| A47.15 | 240 | A run refused before any revision is pinned states the refusal alone. | n/a | n/a | no trunk, several defaults, ambiguity, reftable: the refusal alone | holds; added (finding 2) |
| A47.16 | 242 | Syzygy SHALL NOT change the operator's clone: it SHALL NOT fetch into, prune, repack, check out in or write t… | the copy fetches from it; nothing written to it [Inferred: upload-pack writes nothing] | nothing written | same | holds |
| A47.17 | 242 | Every run this requirement pins, the run its first sentence pins included, SHALL run on a copy unless its pin… | copy unless another act's or a v1.1-scoped launch consent names the pin | the exception | refusals of either class | holds |
| A47.18 | 242 | A run that such a consent covers makes no copy: its clone is the operator's own, as REQ-polaris-generation-03… | n/a | operator's clone; HEAD mismatch refused before asking | refusal | holds |
| A47.19 | 242 | Where only such a launch observation consent covers the run, the operator's clone SHALL hold the pinned commi… | n/a | v1.1-scoped consent alone: one-commit form checked before asking | full clone refused (S47.15) | holds |
| A47.20 | 244 | Before the question, or before the brief where no question is asked, Syzygy SHALL make the copy as follows an… | before the question, or before the brief where none is asked | n/a | a refusal before the copy makes none | holds; reworded in the self-review |
| A47.21 | 244 | It SHALL create an empty directory of its own for the copy, never derived from the operator's clone's path, a… | Syzygy's own empty directory and repository | n/a | removed on refusal | holds |
| A47.22 | 244 | It SHALL fetch into that repository, from the operator's clone over Git's local file transport, the pinned co… | fetch by full id, depth one, no tags or submodules, detached checkout | n/a | a failed fetch or checkout refuses (A47.9, A47.32) | holds |
| A47.23 | 244 | Every Git process it starts for the copy SHALL run with the system and global Git configuration disabled, wit… | environment fixed; no hook runs [Observed, round 4 fixture]; processes execute nothing observed | n/a | same | holds; one sentence added in the self-review |
| A47.24 | 244 | The file URL of the operator's clone is not a locator, and is never recorded or rendered as one. | file URL never a locator | n/a | same | holds |
| A47.25 | 244 | The operator's HEAD need not be the pinned revision, and the copy's HEAD is the pinned revision. | the copy's HEAD is the pinned commit | the operator's HEAD must be it | a non-commit refused (A47.9) | holds |
| A47.26 | 244 | The copy SHALL hold the pinned commit and the trees and blobs reachable from its root tree alone, in the form… | form checked before the question | n/a | a departing copy refused; a tag's extra object refused through A47.9 | holds |
| A47.27 | 244 | Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the… | n/a | n/a | the copy, if made, removed and said | holds; 'if it made one' added in the self-review |
| A47.28 | 244 | Otherwise the copy is the run's clone for the rest of the run and is kept after it, outside the run's state d… | kept after the run, located | n/a | n/a | holds; added in round 4 |
| A47.29 | 246 | Syzygy uses nothing Git read but the copy it produced. | only the copy is used | n/a | same | holds |
| A47.30 | 246 | For every launch-consented run, the reads Syzygy itself makes, in process, of the operator's clone SHALL be o… | the list binds Syzygy's in-process reads | the list plus object reads and the binding form check's reads, the whole config included | same lists | holds; repaired (note 3) |
| A47.31 | 249 | - the names of its references, and the values of `HEAD` and the reference it names, of the references the tru… | references as file data; reftable refused before any Git process | same | reftable refusal | holds |
| A47.32 | 250 | - its configuration file, read as text only for its remotes' names and URLs and never honoured; | remote names and URLs only | yields to the form check (A47.27) | same | holds; repaired (note 3) |
| A47.33 | 251 | - whether `objects/info/alternates` exists, and, where the run makes a copy, a clone where it does SHALL be r… | alternates refused before any Git process | existence read only | refusal | holds |
| A47.34 | 252 | - for an abbreviated `--revision` alone, the object identifiers its loose object file names and pack indexes … | names only | same | ambiguity refused before any Git process | holds |
| A47.35 | 254 | A clone that lacks the pinned commit or an object reachable from it, a partial clone's missing object include… | a missing object fails the copy; nothing fetched elsewhere | REQ-033's missing-object refusal | refusal; copy removed | holds |
| A47.36 | 254 | Every failure of a Git process for the copy SHALL be refused, naming that process and its failure as Git repo… | no failure | n/a | any fetch or checkout failure refused naming the process and Git's report; no unobserved cause stated | holds; added in the refusal sweep |
| A47.37 | 254 | From the copy on, the copy is the clone that REQ-polaris-generation-033 to 036 name and the run's clone REQ-p… | REQ-033 to 036 apply to the copy | apply to the operator's clone | holds | holds |
| A47.38 | 254 | Every brief and packet Syzygy issues to an agent session of a run with a copy SHALL name the copy as the clon… | briefs name the copy | n/a | no brief | holds |
| A47.39 | 254 | For a run with a copy, the run record SHALL state, labelled Inferred, that Syzygy relies on Git starting no p… | residual stated for a run with a copy | n/a | no run record | holds; scoped in the self-review |
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
| S47.20 | 342 | [Clone with an alternate] - **AND** the launch output states the pinned revision in full and its reference, a… | n/a | n/a | alternates: revision and reference stated, date Unknown | holds; added (finding 2) |
| S47.21 | 347 | [Configuration and hooks of the operator's clone] - **THEN** the copy is made and none of those commands or h… | copy made, no hook or command runs [Observed fixture] | n/a | n/a | holds |
| S47.22 | 352 | [Revision naming an annotated tag] - **THEN** Syzygy refuses before asking for consent, naming `--revision`, … | n/a | n/a | refused from HEAD; not followed; removed | holds; mechanism repaired (finding 2) |
| S47.23 | 357 | [Revision naming a blob] - **THEN** the copy's detached checkout fails, Syzygy refuses before asking for cons… | n/a | n/a | blob: checkout fails, 'not shown to be a commit', no blob read by Syzygy, copy removed | holds; repaired (finding 1) |
| S47.24 | 362 | [Commit whose checkout fails] - **THEN** Syzygy refuses before asking for consent, naming the identifier and … | n/a | n/a | real commit, checkout fails: 'not shown to be a commit', never 'not a commit' | holds; added (finding 1) |
| S47.25 | 367 | [Ambiguous abbreviation] - **THEN** Syzygy refuses it as ambiguous before any Git process starts | n/a | n/a | refused before any Git process | holds |
| S47.26 | 372 | [References in the reftable backend] - **THEN** Syzygy refuses before any Git process starts, naming the reas… | n/a | n/a | refused before any Git process | holds |
| S47.27 | 377 | [A consent that states the clone's form] - **THEN** Syzygy makes no copy, and that stated form binds the run | n/a | no copy; stated form binds | n/a | holds |
| F47.1 | 385 | A run pins a commit other than the rule's | trunk rule from reference data | HEAD pin or trunk rule | no pin, or the pin it refused | holds |
| F47.2 | 385 | a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or … | n/a (a launch consent's HEAD copies, pinned at HEAD) | pinned at HEAD | not refused for the trunk tip | holds |
| F47.3 | 385 | the pin changes within a run | one pin | one pin | one pin, or none | holds |
| F47.4 | 385 | for a run that makes no copy, a HEAD mismatch is not refused, or is refused only after the question | n/a | refused before the question | this is that refusal | holds |
| F47.5 | 385 | a run that makes a copy is refused for the operator's HEAD | never refused for it | n/a | other refusals only | holds |
| F47.6 | 385 | once a revision is pinned, the launch output or run record lacks the full revision, its reference, the no-net… | all statements; date read from the copy | all; date read from the operator's clone | pinned: revision, reference, no-network, update; date Unknown unless read; unpinned: refusal alone | holds; repaired (finding 2) |
| F47.7 | 385 | Syzygy makes a network request, fetches from anywhere but the operator's clone into the copy, or changes the … | file transport only; operator's clone unchanged | no fetch | no fetch elsewhere | holds |
| F47.8 | 385 | a run that an observation consent made by another act covers makes a copy, or a run that neither such a conse… | copies only outside the exception | no copy | either class | holds |
| F47.9 | 385 | the copy is made other than as this requirement states, or the run goes on although the copy holds more than … | made as stated | n/a | a departing or over-full copy is refused, so the run does not go on | holds |
| F47.10 | 385 | a Git process for the copy runs with the system or global configuration, another transport, lazy fetching or … | fixed environment; no hook ran [Observed, round 4 fixture] | n/a | same until refusal | holds |
| F47.11 | 385 | a reftable clone or a clone with an alternates file is not refused before any Git process starts, or a failed… | refused before any Git process | reftable refused; alternates not refused (no copy) | these are the refusals | holds |
| F47.12 | 385 | for a launch-consented run, Syzygy itself, in process, reads of the operator's clone anything this requiremen… | the list | the list plus object and form-check reads | same lists | holds |
| F47.13 | 385 | a run that only a launch observation consent recorded with the operator's-own-clone scope covers makes a copy… | n/a | no copy, one-commit form | full clone refused | holds |
| F47.14 | 385 | a completed run's copy is removed without the operator, or its location is not named | kept and located | n/a | n/a (removed) | holds |
| F47.15 | 385 | a non-commit `--revision` is followed, pinned or used, or is told from a commit by Syzygy reading the object … | n/a | n/a (consents name commits) | tag refused from HEAD; failed checkout refused without claiming which | holds; repaired (finding 1) |
| F47.16 | 385 | a run whose checkout failed is refused as not a commit, or as a commit | n/a | n/a | the failed-checkout refusal says 'not shown to be a commit' | holds; added (finding 1) |
| F47.17 | 385 | the copy is not removed when the run ends before its brief | n/a | n/a | removed, if made | holds |
| F47.18 | 385 | a brief or packet does not name the copy | named | n/a | no brief | holds |
| F47.19 | 385 | the copy statements are missing | present | n/a | a refused run asks no question; its record says the copy was removed | holds |
| F47.20 | 385 | the trunk tip is presented as the upstream's latest as Observed. | Inferred | Inferred | Inferred, where stated | holds |
