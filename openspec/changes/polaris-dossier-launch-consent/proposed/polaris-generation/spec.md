# Polaris dossier launch-time consent

Candidate exact behavioral delta; not adopted, binds nothing. This change applies to the existing polaris-generation capability. It adds two requirements to the operator-agent mode of REQ-polaris-generation-033 to 036: the consents a run needs are asked for, answered by the owner and recorded when the run starts (046), and the run's revision defaults to the repository's trunk tip and is pinned for the run (047). It edits no byte of any predecessor requirement or scenario. For a run whose consent was recorded at launch it reads, and in one place displaces, the predecessor text each requirement names, and only that text; every other run keeps every predecessor requirement's bytes and meaning. It grants no consent itself: every consent it describes is the owner's answer, recorded as its own act.

## ADDED Requirements

### Requirement: Launch-time consent

In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing consents at that moment, before it reads any object of the repository and before it issues a brief. It SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact confirmation the question names. The question SHALL state, before the answer is asked for: the repository identity and the source of that identity; the pinned revision in full and how it was chosen; that the consent covers that one revision only; what the observation consent permits Syzygy to read; for a governed subject, the agent provider and content classes the statement below would name, and that the agent sessions read the clone without restriction whatever classes the statement names; that each consent is the owner's own act, revocable only by a later owner act naming it; and that an agent must never answer it.

The question, and every skill and agent text Syzygy ships, SHALL say that only the owner answers it, in person. Syzygy cannot observe who typed the answer: an agent session that holds a terminal could type it. Syzygy SHALL record who answered as the operator's declaration that the owner answered in person, label it Inferred, and disclose it in the record and on every rendered page; the `/polaris-dossier` skill and the agent instructions SHALL tell the agent never to run a command that asks for consent and never to answer one.

A confirmed answer SHALL create, in the observing project's `.syzygy/governance/decisions/` home and in the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. The record SHALL be an owner-act record binding the exact digest of its consent content (RFC3-16), with provenance state `owner-adopted (bootstrap, uncorrelated)` and its A1 audit-record identity explicitly absent, and SHALL record the ceremony: the question asked, in full, the answer, the terminal it came from, and the operator's declaration above.

For a subject that REQ-polaris-generation-033 counts as governed, or whose project input does not state whether a kernel evidence drawer exists, the same answer SHALL also create a second, separate record: the per-project statement that REQ-polaris-generation-033 requires and SEC-2 calls "explicit, recorded, per-project consent", naming the run's declared agent provider and the content classes the question stated. The statement is its own owner-act record, binding its own digest, separately revocable and separately rendered. It SHALL NOT be created for a non-governed subject, and the observation consent SHALL NOT be read as a statement or a statement as an observation consent. Where the owner declines the statement but gives the observation consent, Syzygy SHALL record the observation consent alone and refuse the run for a governed subject exactly as REQ-polaris-generation-033 does.

A record created at launch is in force from its own owner-act record and is established as in force exactly as REQ-polaris-generation-033 requires for every consent, from that record and never from a status word or a file's presence. It stays in force until a later owner act revokes or supersedes it; it does not expire when the run closes. Revocation is unchanged (RFC5-13): a revoked launch record refuses every later step of every run that relies on it. Where an in-force record already names the repository and the pinned revision, Syzygy SHALL use it, name it, and ask nothing. Where any record for the same repository identity has been revoked or withdrawn, the question SHALL name that record and its state before asking; a new answer is a new grant and never reverses the earlier revocation.

Launch consent adds no readers, no egress and no execution. Syzygy SHALL read the repository only as REQ-polaris-generation-033 permits, under the observing project's effective classification and screening policies (REQ-polaris-generation-025), whose public-source scope admits the repository by its consent record and holds no per-repository entry; a repository that scope does not admit is refused with its reason. The question SHALL ask the operator to declare whether the repository is public; the record SHALL carry that declaration, labelled Inferred and attributed to the operator, and a repository not declared public SHALL be refused before any record is written while no effective policy admits non-public sources. The execution choice and its rules (REQ-polaris-generation-033, SEC-3, D9) are unchanged: a launch consent is never an execution choice, never asks for one and never records one.

Observing the observing project's own repository is permitted. Where the clone's working tree is the same working tree as the observing project's governance home, Syzygy SHALL refuse the run before asking, and SHALL print the one command that makes a separate checkout of the pinned revision, because the run's agent sessions would otherwise work in the tree that holds the run's own consent records.

Syzygy SHALL write the launch records only through a write the owner's write consent permits: an in-force write consent for the observing project's own repository (RFC5-12; SEC-4) whose scope names this record class and this location. Absent that consent, Syzygy SHALL refuse to record, ask nothing, and name the consent that is missing. Every launch record is one new file, attributed to Syzygy and the operator, written atomically, and never overwrites or edits an existing file; it is revertable by removing that file before it is relied on, and by a revocation act after. Syzygy SHALL NOT commit, push or otherwise publish the record; whether and when it is committed is the operator's act.

For a run whose consent was recorded at launch, this requirement displaces exactly this predecessor text: in REQ-polaris-generation-033, the words "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path", read as permitting, besides the run's state directory, the launch records above in the location the write consent names, and only those, written before the run's state directory is created; the rest of that sentence, and the prohibition on writing to a location derived from the clone's path, are unchanged. It reads, and does not change: REQ-polaris-generation-033's requirement that the clone's HEAD equal a revision the in-force observation consent names, which a launch record meets by naming the pinned revision; its per-project statement, which a launch record provides; and its rule that every record Syzygy reads for its gates lies within the agent sessions' write reach and is disclosed so, which applies to the launch records as to every other.

The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity; the repository identity and its source; the pinned revision and how it was chosen; that who answered rests on the operator's declaration, labelled Inferred; whether a statement was recorded, with its provider and classes; and whether the launch records were committed when the run closed, as Syzygy observed it then.

ID: REQ-polaris-generation-046
Source: RFC5-12; governing warrants below.
Scope: v1-mandatory

#### Scenario: First run on a repository asks once and records the consent

- **WHEN** the owner starts a run on a non-governed public repository that no consent record names, from a terminal, and the write consent for the observing project's own repository is in force
- **THEN** Syzygy asks the question, naming the repository identity, the pinned revision and what the consent permits, before reading any object
- **AND** on the exact confirmation it writes one observation consent record naming that revision, and no statement, and the run proceeds under REQ-polaris-generation-033

#### Scenario: Governed subject records two separate consents

- **WHEN** the tree at the pinned revision holds an `openspec/**` specification, and the owner confirms both the observation consent and the statement
- **THEN** Syzygy writes two records, an observation consent and a per-project statement naming the declared provider and the stated classes, each binding its own digest
- **AND** revoking the statement alone refuses later steps of the run while the observation consent stays in force

#### Scenario: Statement declined for a governed subject

- **WHEN** the subject is governed and the owner confirms the observation consent but declines the statement
- **THEN** Syzygy records the observation consent alone
- **AND** refuses to issue a brief, naming the missing statement, exactly as REQ-polaris-generation-033 does

#### Scenario: No terminal or no answer

- **WHEN** the command is started with standard input not a terminal, or the operator gives no answer, or an answer other than the exact confirmation
- **THEN** Syzygy refuses before reading any object or writing any record, naming the missing consents and the command to run
- **AND** no consent record exists afterwards

#### Scenario: Revision already consented

- **WHEN** an in-force observation consent already names the repository and the pinned revision, and any statement the subject needs is in force
- **THEN** Syzygy asks nothing and writes nothing, and names the records the run rests on
- **AND** the run record cites them as REQ-polaris-generation-033 requires

#### Scenario: Earlier consent revoked

- **WHEN** a consent record for the same repository identity has been revoked, and the owner starts a run at a new revision
- **THEN** the question names the revoked record and its state before asking
- **AND** a confirmed answer creates a new record, and the revoked record stays revoked

#### Scenario: Write consent absent

- **WHEN** no in-force write consent for the observing project's own repository names launch records and their location
- **THEN** Syzygy asks nothing and refuses, naming the missing write consent
- **AND** writes nothing outside the run's state directory

#### Scenario: Self-observation from the governance home

- **WHEN** the owner starts a run on the observing project's own repository with the clone being the working tree that holds its governance home
- **THEN** Syzygy refuses before asking and prints the one command that makes a separate checkout of the pinned revision
- **AND** the same run from that separate checkout asks the question and proceeds like any other repository

#### Scenario: Agent instructions forbid answering

- **WHEN** a brief, packet, skill or agent instruction text that Syzygy ships is inspected
- **THEN** each that mentions consent tells the agent never to run a consent-asking command and never to answer one
- **AND** every rendered page discloses that who answered rests on the operator's declaration, labelled Inferred

#### Scenario: Launch consent never permits execution

- **WHEN** a run's consents were recorded at launch and no execution choice has been recorded for the run
- **THEN** the brief carries SEC-3's rule in the form REQ-polaris-generation-033 gives it
- **AND** no launch record names, implies or records an execution choice

Form: event-response.

- **Case:** Start operator-agent runs against controlled clones and fixture decision homes, varying independently: whether standard input is a terminal; the answer (exact confirmation, other text, none, observation only); the subject's governed status under REQ-polaris-generation-033's predicate; existing records for the repository identity in each state (none, in force at the pinned revision, in force at another revision, revoked, withdrawn); the write consent's presence, effect and named location; whether the clone is the governance home's own working tree; and whether an execution choice was recorded.
- **Observable:** The question text, refusals and their reasons, the files created and their bytes, each record's fields and bound digest, the objects read before and after the answer, the brief's execution rule, and the human and machine disclosures.
- **Oracle:** Expected questions, refusals, record sets and field values derived from the fixture homes and clones, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test; file creation is observed by an independent listing of the decision home before and after, never by Syzygy's own record.
- **Falsifier:** An object is read before a confirmed answer or an in-force record; a record is created without the exact confirmation, without a terminal, or without the write consent; one record carries both an observation consent and a statement; a statement is created for a non-governed subject; a record names more than the pinned revision; an existing file is edited or overwritten; a record is committed or pushed by Syzygy; a revoked record is reversed; an execution choice is asked for or recorded; or who answered is presented as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4]
  contracts: [RFC1-3, RFC3-7, RFC3-16, RFC5-12, RFC5-13]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-025, REQ-polaris-generation-033]
```

### Requirement: Trunk-tip revision pinned at launch

In the operator-agent mode a run SHALL pin exactly one revision at launch, before the consent question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, the pinned revision SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.

Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator's clone holds at launch, and whether it is the upstream's latest commit is Inferred. The launch output and the run record SHALL state the pinned revision in full, the reference it came from, the commit's committer date as the clone records it, and that Syzygy did not fetch; they SHALL print the operator's own command to update the clone before a later run.

Syzygy SHALL NOT change the clone's checkout. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.

ID: REQ-polaris-generation-047
Source: REQ-polaris-generation-033; governing warrants below.
Scope: v1-mandatory

#### Scenario: Default to the trunk tip

- **WHEN** the operator starts a run with no `--revision` on a clone whose remote default branch is `main` and whose HEAD is the tip of `main`
- **THEN** Syzygy pins the commit `main` points to, and states it in full with its reference and committer date
- **AND** states that it did not fetch and prints the command to update the clone

#### Scenario: Trunk named master

- **WHEN** the clone records no remote default branch, has no `main` branch and has a `master` branch
- **THEN** Syzygy pins the commit `master` points to

#### Scenario: No trunk

- **WHEN** the clone records no remote default branch and has neither `main` nor `master`, and no `--revision` is given
- **THEN** Syzygy refuses before asking for consent, naming `--revision`

#### Scenario: Explicit revision

- **WHEN** the operator gives `--revision` naming a commit the clone holds
- **THEN** Syzygy pins that commit's full identifier, and the consent question names it

#### Scenario: HEAD elsewhere

- **WHEN** the pinned revision is the trunk tip and the clone's HEAD is another commit
- **THEN** Syzygy refuses before asking for consent, changes nothing in the clone, and prints the command that checks out the pinned revision

Form: event-response.

- **Case:** Start runs against controlled clones varying the remote default reference, the presence of `main` and `master`, HEAD, and `--revision` (full, abbreviated, ambiguous, unknown, a reference), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, refusals, the clone's references and working tree before and after, and captured network effects.
- **Oracle:** Expected pins and refusals derived by an independent `git` reading of each fixture clone, prepared before the run.
- **Oracle independence:** Fixture clones and expected pins are built outside the code under test; network effects come from an independent capture.
- **Falsifier:** A run pins a commit other than the rule's; the pin changes within a run; Syzygy fetches, contacts a host, or changes the clone's checkout or references; or the trunk tip is presented as the upstream's latest as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [VIS-2, SEC-3]
  contracts: [RFC5-12]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08]
  topology: []
  parent_requirements: [REQ-polaris-generation-033]
```
