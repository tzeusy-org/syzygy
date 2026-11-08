# Polaris dossier launch-time consent

Candidate exact behavioral delta; not adopted, binds nothing. This change applies to the existing polaris-generation capability. It adds two requirements to the operator-agent mode of REQ-polaris-generation-033 to 036: the consents and statements a run needs are asked for, answered by the owner and recorded when the run starts (046), and a run that no existing consent covers pins the repository's trunk tip (047). It edits no byte of any predecessor requirement or scenario. For a launch-consented run, meaning a run whose observation consent is a launch consent record, it reads, and in one place displaces, the predecessor text each requirement names, and only that text. A run whose clone's HEAD is a revision that an in-force observation consent made by any other act names keeps every predecessor requirement's bytes and meaning. It grants no consent itself: every consent and statement it describes is the owner's answer, recorded as its own act.

## ADDED Requirements

### Requirement: Launch-time consent

In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent and statement REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing ones at that moment, before it reads any blob of the repository and before it issues a brief. Before the answer Syzygy SHALL read only what the question needs, and SHALL read it as Git objects by object identifier: the clone's references; the pinned commit object, of which it SHALL use only the root tree identifier, the parent identifiers and the committer date, never the message or any author or committer identity; and the tree objects reachable from that root tree, of which it SHALL use only entry names, modes and object identifiers. It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and, after a confirmed answer, the launch consent records. From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path listing exposes, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the effective classification policy's classification as it would apply once an observation consent admits the repository, computed while the policy's public-source scope admits no repository for it. The question, the launch output and every record that names them SHALL label them a preview, and a confirmed answer SHALL NOT be read as the policy having admitted the repository before the answer.

Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent.

The question, and every skill and agent text Syzygy ships, SHALL say that only the owner answers it, in person. Syzygy cannot observe who typed the answer. An answer typed by an agent is not an owner act: under RFC3-16's trust premise for state (1), an implementation that accepts it produces an unauthorized effect and a trust-floor violation, which disclosure makes visible and does not cure. Syzygy SHALL record who answered as the operator's declaration that the owner answered in person, label it Inferred, and disclose it in the record and on every rendered page; the `/polaris-dossier` skill and the agent instructions SHALL tell the agent never to run a command that asks for consent and never to answer one.

The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments (`x/sub/name` and `y/sub/name`) derive one identity and, absent another match, share its records.

A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, held in the operator's own clone, with no fetch by Syzygy; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator's declaration whether the repository is public, and their Inferred labels. Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) and preserving the exact owner phrase. While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelated)` with its A1 audit-record identity explicitly absent; once one is in force, the question SHALL ask the owner to select the state explicitly (RFC3-16(c)(1)), and Syzygy SHALL refuse to record without a selection. Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the operator's declaration above.

The question SHALL ask the owner whether a kernel evidence drawer exists for the subject, with the answers that none exists, that one exists, or that the owner does not know. An answer that none exists SHALL create a drawer statement: a launch consent record of its own, for the subject and not for any revision, which the admitted project input (REQ-polaris-generation-001) carries exactly as it carries a drawer statement made by any other owner act, and which is reused by every later run on the same subject until revoked. The other two answers create no record, and the subject is then governed under REQ-polaris-generation-033. A subject is non-governed under a launch drawer statement only when the tree at the pinned revision also meets REQ-polaris-generation-033's other conditions.

For a subject that is governed under REQ-polaris-generation-033, or whose drawer status is unknown, the answer SHALL also create, unless one is already in force and covers it, the per-project statement that REQ-polaris-generation-033 requires and SEC-2 calls "explicit, recorded, per-project consent": one statement per pair of subject and agent provider, not scoped to any revision, naming the provider and the content classes the question stated. An in-force statement for the same subject and provider whose classes include every class the path classification assigns at the pinned revision SHALL be reused and named, and nothing asked about it. Where it does not include them, the question SHALL offer a new statement naming the wider set, whose record names the statement it supersedes; the earlier statement becomes superseded by that recorded act. Where the owner declines a needed statement, Syzygy SHALL record the other confirmed records and refuse to issue a brief exactly as REQ-polaris-generation-033 does. A statement SHALL NOT be created for a non-governed subject. The observation consent, the drawer statement and the provider statement are separate records, each separately revocable and rendered, and none SHALL be read as another.

A launch consent record is in force from its own owner-act record and from the recording commit that contains it, and SHALL be established as in force exactly as REQ-polaris-generation-033 requires for every consent, from those and never from a status word or a file's presence. Syzygy SHALL make that recording commit itself, on one dedicated reference of the governance home that the write consent names, which SHALL NOT be the trunk, the current branch or any reference a run may pin; it SHALL create the record files and the commit without changing any working tree, index or other reference, and the commit's tree on that reference SHALL hold the records under `.syzygy/governance/decisions/`. Syzygy SHALL read launch consent records only from that reference's commits, as Git objects. Because the dedicated reference never becomes the trunk, recording a launch consent never moves the trunk tip and never becomes part of a revision the trunk default pins, the observing project's own included. A record stays in force until a later owner act revokes or supersedes it; it does not expire when the run closes. Revocation is unchanged (RFC5-13): a revoked launch consent record refuses every later step of every run that relies on it. Where in-force records already hold every consent and statement the run needs, Syzygy SHALL use them, name them, and ask nothing. Where a matching record has been revoked or withdrawn, the question SHALL name it and its state; a new answer is a new grant and never reverses the earlier revocation.

Syzygy SHALL read launch consent records of every repository through one generic form, with no per-repository code, phrase, form or registry entry, and SHALL read them only as REQ-polaris-generation-033 permits. Launch consent adds no readers beyond that form, no egress and no execution. Syzygy SHALL read the repository's blobs only as REQ-polaris-generation-033 permits, under the observing project's effective classification and screening policies (REQ-polaris-generation-025). Their public-source scope admits a repository by its observation consent record, without a per-repository admission entry. Its owner placements, which place named paths of one repository at one commit, are per repository and per commit and optional: a run at a revision no placement names runs without placements, and every file a placement would have placed is withheld and renders Unknown, never dropped. A repository that the operator does not declare public SHALL be refused before any record is written while no effective policy admits non-public sources, and the refusal SHALL name the screening-policy successor that is missing. The owner intends launch consent to reach private repositories too; that needs a screening-policy successor, performed as its own owner act. A successor that admits non-public sources through this same observation consent record lifts the refusal for the sources it admits with no change to this requirement; one that asks more of the record or the question (another field, consent class or disclosure) needs this requirement amended alongside it. The execution choice and its rules (REQ-polaris-generation-033, SEC-3, D9) are unchanged: a launch consent is never an execution choice, never asks for one and never records one.

Observing the observing project's own repository is permitted. Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL refuse the run before asking, and SHALL print the one command that makes a separate clone with its own Git directory, checked out at the pinned revision.

Syzygy SHALL write launch consent records only under an in-force write consent for the observing project's own repository (RFC5-12; SEC-4) whose scope names this record class, the dedicated reference and the location in its tree. Absent that consent, Syzygy SHALL ask nothing, refuse, and name the consent that is missing. Every recording commit adds new files only, never edits or removes one, and is attributed to Syzygy and the operator; it is revertable by a revocation act, and before it is relied on by removing the commit from the dedicated reference. Syzygy SHALL NOT push or otherwise publish the dedicated reference; publication is the operator's act.

For a launch-consented run, this requirement displaces exactly this predecessor text: in REQ-polaris-generation-033, the words "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path", read as permitting, besides the run's state directory, the launch consent records and their recording commit on the dedicated reference, and only those, written before the run's state directory is created; the rest of that sentence, and the prohibition on writing to a location derived from the clone's path, are unchanged. It reads, and does not change: REQ-polaris-generation-033's requirement that the clone's HEAD equal a revision the in-force observation consent names, which a launch consent record meets by naming the pinned revision; its per-project statement and its drawer condition, which launch consent records provide; and its rule that every record Syzygy reads for its gates lies within the agent sessions' write reach and is disclosed so, which applies to the launch consent records as to every other.

The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity and its recording commit; the repository identity, its normalised URL, their source and their Inferred label; the operator's declaration whether the repository is public, labelled Inferred; how the identity was proposed and the identity residuals above; the pinned revision and how it was chosen; the drawer statement relied on, if any; that who answered rests on the operator's declaration, labelled Inferred; and, for the provider statement, the citation REQ-polaris-generation-033 requires, not restated.

ID: REQ-polaris-generation-046
Source: RFC5-12; governing warrants below.
Scope: v1-mandatory

#### Scenario: First run on a repository asks once and records the consent

- **WHEN** the owner starts a run from a terminal on a repository declared public that no record names, whose tree at the pinned revision holds no `openspec/**` path and no `.syzygy/` path, the write consent is in force, and the owner states that no drawer exists
- **THEN** before reading any blob Syzygy asks the question, proposing the derived identity as Inferred, the pinned revision and what each record permits
- **AND** on the exact phrase it commits, on the dedicated reference, one observation consent record naming that revision and one drawer statement, and no provider statement, and the run proceeds under REQ-polaris-generation-033 as non-governed

#### Scenario: Governed subject records separate consents

- **WHEN** the tree at the pinned revision holds an `openspec/**` path, and the owner gives the phrase for the observation consent and the provider statement
- **THEN** Syzygy commits an observation consent record and a provider statement naming the declared provider and the stated classes, each binding its own digest
- **AND** revoking the statement alone refuses later steps of the run while the observation consent stays in force

#### Scenario: Drawer unknown

- **WHEN** the tree meets every non-governed condition but the owner answers that they do not know whether a drawer exists
- **THEN** no drawer statement is recorded and the subject is treated as governed
- **AND** the question asks for the provider statement

#### Scenario: Statement reused across revisions

- **WHEN** a governed subject already has an in-force provider statement for the declared provider whose classes include every class assigned at a new pinned revision
- **THEN** the question asks only for the observation consent at the new revision and names the reused statement
- **AND** no second statement for that subject and provider is created

#### Scenario: Statement widened

- **WHEN** the in-force statement's classes do not include a class assigned at the new pinned revision, and the owner gives the phrase for a wider statement
- **THEN** Syzygy commits a new statement naming the wider set and the statement it supersedes
- **AND** the earlier statement is rendered as superseded

#### Scenario: Statement declined for a governed subject

- **WHEN** the subject is governed and the owner confirms the observation consent but declines the statement
- **THEN** Syzygy records the observation consent alone
- **AND** refuses to issue a brief, naming the missing statement, exactly as REQ-polaris-generation-033 does

#### Scenario: No terminal or no phrase

- **WHEN** the command is started with standard input not a terminal, or the operator gives no answer, or text other than the exact phrase
- **THEN** Syzygy refuses before reading any blob or writing any record, naming the missing consents and the command to run
- **AND** no launch consent record exists afterwards

#### Scenario: Not declared public

- **WHEN** the operator declines to declare the repository public and no effective policy admits non-public sources
- **THEN** Syzygy refuses before writing any record, naming the screening-policy successor that is missing

#### Scenario: Records already in force

- **WHEN** in-force records already hold the observation consent at the pinned revision and every statement the subject needs
- **THEN** Syzygy asks nothing, writes nothing, and names the records the run rests on
- **AND** the run record cites them as REQ-polaris-generation-033 requires

#### Scenario: Earlier consent revoked

- **WHEN** a record for the same derived identity has been revoked, and the owner starts a run at a new revision
- **THEN** the question names the revoked record and its state before asking
- **AND** a confirmed answer creates a new record, and the revoked record stays revoked

#### Scenario: Re-identified clone

- **WHEN** a clone of a repository with a revoked record carries another remote URL, and the pinned commit and its parents are named by no record
- **THEN** the question names no earlier record and states the re-identification residual, labelled Inferred
- **AND** the record and every page disclose the derived identity and URL as Inferred

#### Scenario: A changed URL keeps the recorded identity

- **WHEN** the clone's remote URL derives a new identity, and the records matching the run by revision or parent all carry one earlier identity
- **THEN** the question proposes that earlier identity, states it was taken from those records, and names the URL as a locator hint
- **AND** a confirmed phrase records the new consent under that earlier identity

#### Scenario: Matching records disagree on identity

- **WHEN** one record matches the run by URL and another by a parent commit, they carry different identities, and the operator gives no identity option
- **THEN** Syzygy refuses before asking, naming both records, their identities and how each matched, and the identity option
- **AND** writes no record

#### Scenario: Pre-answer classes shown as a preview

- **WHEN** the question names the content classes a provider statement would cover
- **THEN** it labels them a preview of the policy's classification once the repository is admitted

#### Scenario: Write consent absent

- **WHEN** no in-force write consent for the observing project's own repository names launch consent records, the dedicated reference and their location
- **THEN** Syzygy asks nothing and refuses, naming the missing write consent
- **AND** writes nothing outside the run's state directory

#### Scenario: Self-observation keeps the trunk tip stable

- **WHEN** the owner runs Polaris on the observing project's own repository from a separate clone, gives the phrase, and later starts a second run with the trunk unchanged
- **THEN** the first run's records are committed on the dedicated reference and the trunk tip is unchanged
- **AND** the second run pins the same trunk tip, finds the in-force record and asks nothing

#### Scenario: Self-observation from the governance home

- **WHEN** the clone's working tree, Git directory or common Git directory is the governance home's
- **THEN** Syzygy refuses before asking and prints the one command that makes a separate clone at the pinned revision

#### Scenario: Owner placements absent at the pinned revision

- **WHEN** a launch-consented run's pinned revision is named by no owner placement
- **THEN** the run proceeds, and every file a placement would have placed is withheld and renders Unknown

#### Scenario: Agent instructions forbid answering

- **WHEN** a brief, packet, skill or agent instruction text that Syzygy ships is inspected
- **THEN** each that mentions consent tells the agent never to run a consent-asking command and never to answer one
- **AND** every rendered page discloses that who answered rests on the operator's declaration, labelled Inferred

#### Scenario: Launch consent never permits execution

- **WHEN** a run's consents were recorded at launch and no execution choice has been recorded for the run
- **THEN** the brief carries SEC-3's rule in the form REQ-polaris-generation-033 gives it
- **AND** no launch consent record names, implies or records an execution choice

Form: event-response.

- **Case:** Start operator-agent runs against controlled clones and fixture governance homes, varying independently: whether standard input is a terminal; the answer (exact phrase, other text, none, each record accepted or declined, each drawer answer, public declared or not); the tree's governed conditions and assigned classes; the clone's remotes and URLs; the identity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying one identity or several, including an in-force statement with and without covering classes; the write consent's presence, effect, reference and location; an A1 mechanism present or absent; whether the clone's working tree, Git directory or common Git directory is the governance home's; owner placements at and away from the pinned revision; and whether an execution choice was recorded.
- **Observable:** The question text, the phrase asked for, refusals and their reasons, the objects read before and after the answer, the commits on the dedicated reference and their trees, every other reference, working tree and index of the governance home before and after, each record's fields and bound digest, the brief's execution rule, withheld files, and the human and machine disclosures.
- **Oracle:** Expected questions, phrases, refusals, identities, record sets, field values and withheld files derived from the fixture homes, clones and placements by an independent `git` reading, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test. Object reads are captured by an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read, never by Syzygy's own record. Commits, references, working trees and indexes are compared by an independent listing before and after.
- **Falsifier:** A blob is read, or any commit field other than the root tree, parents and committer date is used, before a confirmed phrase or in-force records; anything from a pre-answer read is stored outside the question, launch output and records; the question omits any statement this requirement lists, including that only the owner may answer and the existing records with their states; a record is created without the exact phrase, without a terminal, without the write consent, without a declaration whether the repository is public, or, once an A1 mechanism is in force, without a state selection; one record carries two of observation consent, drawer statement and provider statement; a provider statement is created for a non-governed subject, or a second one for a subject and provider whose in-force statement covers the classes; a drawer statement is created on any answer but that none exists; a record names more than the pinned revision; a file is edited or removed, a working tree, index or reference other than the dedicated one changes, or the trunk tip moves; Syzygy pushes the dedicated reference; the proposed identity differs from the proposal rule, or is presented as Observed; a launch whose matching records carry more than one identity, with no identity option, is not refused before asking; the URL is recorded or rendered as the identity; the pre-answer classes are not labelled a preview; a matching revoked record is not named; a run on the governance home's working tree or Git directory is not refused; an in-force record set is not reused; a disclosure this requirement lists is missing from the run record or a page; a file a placement would have placed renders other than Unknown; an execution choice is asked for or recorded; or who answered is presented as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4]
  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033]
```

### Requirement: Trunk-tip revision pinned at launch

In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.

Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator's clone holds at launch, and whether it is the upstream's latest commit is Inferred. The launch output and the run record SHALL state the pinned revision in full, the reference it came from, the commit's committer date as the commit object records it, and that Syzygy did not fetch; they SHALL print the operator's own command to update the clone before a later run.

Syzygy SHALL NOT change the clone's checkout. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.

ID: REQ-polaris-generation-047
Source: REQ-polaris-generation-033; governing warrants below.
Scope: v1-mandatory

#### Scenario: Existing consent at HEAD keeps today's behaviour

- **WHEN** the clone's HEAD is a revision an in-force observation consent made by an earlier act names, the trunk tip is another commit, and no `--revision` is given
- **THEN** Syzygy pins HEAD exactly as REQ-polaris-generation-033 states, asks nothing, and does not refuse for the trunk tip

#### Scenario: Fork remote at a consented commit

- **WHEN** the clone's HEAD is a revision an in-force observation consent names, and the clone's remote URL derives an identity other than that consent's subject
- **THEN** Syzygy still pins HEAD exactly as REQ-polaris-generation-033 states and does not pin the trunk tip or refuse for it

#### Scenario: Default to the trunk tip

- **WHEN** the operator starts a run with no `--revision` on a clone whose HEAD no in-force consent names, whose remote default branch is `main` and whose HEAD is the tip of `main`
- **THEN** Syzygy pins the commit `main` points to, and states it in full with its reference and committer date
- **AND** states that it did not fetch and prints the command to update the clone

#### Scenario: Trunk named master

- **WHEN** the clone records no remote default branch, has no `main` branch and has a `master` branch, and no in-force consent names HEAD
- **THEN** Syzygy pins the commit `master` points to

#### Scenario: No trunk

- **WHEN** no in-force consent names HEAD, the clone records no remote default branch and has neither `main` nor `master`, and no `--revision` is given
- **THEN** Syzygy refuses before asking for consent, naming `--revision`

#### Scenario: Explicit revision

- **WHEN** the operator gives `--revision` naming a commit the clone holds
- **THEN** Syzygy pins that commit's full identifier, and any question names it

#### Scenario: HEAD elsewhere

- **WHEN** the pinned revision is the trunk tip and the clone's HEAD is another commit that no in-force consent names
- **THEN** Syzygy refuses before asking for consent, changes nothing in the clone, and prints the command that checks out the pinned revision

Form: event-response.

- **Case:** Start runs against controlled clones and fixture consent records, varying the remote default reference, the presence of `main` and `master`, HEAD, whether an in-force consent names HEAD, whether the clone's remote derives that consent's subject identity or another (a fork or mirror remote), and `--revision` (full, abbreviated, ambiguous, unknown, a reference), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, the did-not-fetch statement and update command, refusals and the point at which each is made, the clone's references and working tree before and after, and captured network effects.
- **Oracle:** Expected pins, statements and refusals derived by an independent `git` reading of each fixture clone and the fixture records, prepared before the run.
- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; network effects come from an independent capture.
- **Falsifier:** A run pins a commit other than the rule's; a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; a HEAD mismatch is not refused, or is refused only after the question; the launch output or run record lacks the full revision, its reference, the committer date, the did-not-fetch statement or the update command; Syzygy fetches, contacts a host, or changes the clone's checkout or references; or the trunk tip is presented as the upstream's latest as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [VIS-2, SEC-3]
  contracts: [RFC5-12]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08]
  topology: []
  parent_requirements: [REQ-polaris-generation-033]
```
