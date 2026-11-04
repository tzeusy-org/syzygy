# Polaris dossier local-agent mode

Exact behavioral delta, version 1.3. Version 1.0 was signed off by the owner on 2026-10-06 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`), version 1.1 on 2026-10-07 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`) and version 1.2 on 2026-10-14 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`); these bytes bind only by the owner's sign-off of version 1.3. This change applies to the existing polaris-generation capability. It adds four requirements that define a second authoring mode, the operator-agent mode, beside the provider mode that the adopted requirements describe. It edits no byte of any predecessor requirement or scenario, in the base change or in the understanding amendment as amended by the tree-form adoption. For a run in the operator-agent mode it displaces or reads the predecessor text that each requirement below names, and only that text; for a run in the provider mode every predecessor requirement and scenario keeps its bytes and its meaning. The provider mode is parked by the owner direction of 2026-10-05, not withdrawn. Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, this change could not be signed off until the owner had adopted, by the owner's own act, an amendment to SEC-3 that permits the operator's agent session to build and run the observed project on the host. The owner adopted it on 2026-10-06 as doctrine amendment D9, on SEC-3 and the owner's attended agent session, with its credential condition (`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, row D9); this change cites it as D9.

## ADDED Requirements

### Requirement: Operator-agent authoring mode

A generation run SHALL record exactly one authoring mode, `provider` or `operator-agent`, before any draft is admitted, and the mode SHALL NOT change within the run. In the operator-agent mode the draft, the independent inventory and the reviews are authored by coding-agent sessions that the human operator runs with the operator's own tools and account over a local clone of the subject, and Syzygy SHALL make no model-provider call for the run, resolve no provider route and transmit no project content to any service. The agent sessions' transmissions to their own provider are the operator's own act under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`: they are outside Syzygy's egress consent, no egress record is made for them, and Syzygy SHALL NOT present them as consented by, routed through or observed by Syzygy.

Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`, item 1, and the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 2, the operator-agent mode MAY be used on any repository for which the required consents are in force, governed projects included; SEC-2 is unchanged by those directions and governs as follows. A subject is governed when any one of four conditions holds: the admitted project input (REQ-polaris-generation-001) records that a kernel evidence drawer exists for the subject; or the source classes of the tree at the pinned revision, as Syzygy's own path listing of that tree exposes them (REQ-polaris-generation-030), include an `openspec/**` specification, a capability declaration or declared topology. Because a path listing cannot tell whether a declaration is adopted, every path under a `.syzygy/` governance tree, where Syzygy's capability declarations and topology are held, counts toward those last two conditions, adopted or not; this is never less strict than REQ-polaris-generation-032's "adopted capability declaration", and the two predicates are an overlap that whichever of the two changes is adopted second reconciles. A subject is non-governed only when the admitted project input states that no kernel evidence drawer exists for it and the tree holds none of the other three. For a non-governed subject the agent sessions' sends are the operator's own act as stated above and no statement is required. For a governed subject, and for a subject whose project input does not state whether a drawer exists, Syzygy SHALL refuse to issue a brief unless an in-force, recorded, per-project statement names the operator's agent provider and the content classes it may receive, and SHALL cite that statement in the run record; its withdrawal SHALL refuse further steps of any run that relies on it. The statement is a consent record: it is the "explicit, recorded, per-project consent" that SEC-2 requires before governed-project content reaches a model provider, held in its own separately revocable and renderable record, and it is not an egress record of any transmission and not evidence of what the agent sent. Neither the content classes the statement names nor the observing project's classification and screening policies (SEC-5) bind the agent sessions' own reads or sends: the agent reads the clone without restriction, and content those policies would exclude, secrets included, may reach the agent's provider. Classification and screening bind every read Syzygy makes and everything Syzygy stores or renders.

Before it issues a brief, Syzygy SHALL verify that the clone's checked-out HEAD commit equals a revision that the in-force observation consent for the repository names, and SHALL record that commit as the run's pinned revision. At every later check, review check and render, Syzygy SHALL verify again that the recorded pinned revision is a revision the in-force observation consent names, and SHALL refuse the step otherwise; withdrawal of the observation consent, the registry entry or a policy act refuses every later step of the run. Syzygy SHALL establish that the observation consent, the registry entry, each policy act, any per-project statement, D9 and the owner's reading of RFC7-20 are in force from the record of the owner's act that makes each effective (RFC3-16: "Effective status is read from the owner-act record, not from the stamp"), never from a status word or a file's presence. The brief, the draft, the inventory and every review packet SHALL name the pinned revision, and a draft, inventory or verdict that names another revision SHALL be refused. Which consented revision the run was pinned to rests on a stored record and SHALL be disclosed as Inferred under the records rule below; that the revision is consented, and every object read at it, is verified at each step. A HEAD that differs from a named revision, a revision the consent does not name, or an absent, withdrawn or ineffective observation consent, observer registry entry, classification policy act or screening policy act SHALL refuse the run with its reason in human and machine form. The operator's start of the run is the owner's request under REQ-polaris-generation-020; the run creates no scheduler work item, Proposal or materialization record, because it makes no provider dispatch and no scheduler effect, and Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path. The Execution Record's work item identity is therefore absent, with its reason stated, and the run is rendered as unattributed execution under RFC4-19, never dropped. The `syzygy dossier` commands are a local program the operator's sessions invoke as the operator's own user: they serve no route, accept no network request, hold no credential that authenticates to Syzygy and are outside REQ-polaris-generation-021's route inventory; the principal of every admission, denial and refusal they record is the operator, operator-declared, with its credential or session identity recorded as Unknown, never fabricated. Every read Syzygy makes for the run SHALL be a Git object read by object identifier at the pinned revision through the registered observer, never a read of the working tree, and every object SHALL be classified and screened under the observing project's effective policies (REQ-polaris-generation-025) before its content is used in a check or rendered. Because the clone's object store lies within the agent sessions' write reach, those reads SHALL honour no replacement objects, grafts, repository-local configuration, hooks or alternates; the hash algorithm is the one the consented revision's identifier is written in, never one the clone's configuration declares, and a clone whose objects do not hash under it SHALL be refused. Syzygy SHALL recompute the object identifier of every commit, tree and blob it reads on the path from the pinned commit to each blob it uses, from the bytes it read, at every step that uses the object. An object whose recomputed identifier differs from the identifier by which it was reached, or that cannot be read without an alternate or a replacement, SHALL refuse the step that needed it, with its reason in human and machine form, and none of its content SHALL be used, quoted, classified as admitted or rendered.

Syzygy SHALL execute no observed code, SHALL launch or schedule no process that does, and SHALL give no instruction to an agent (a brief, prompt, skill or work item) that tells it to, except in the one case D9 permits (SEC-3). The owner direction `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`, item 2, permits the agent session to build and run the observed project in the clone, and the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, made that permission depend on an owner-adopted amendment to SEC-3, which the owner adopted as D9 on 2026-10-06. The authoring session's brief SHALL say that the agent may build and run the observed project only when all of these hold: D9 is in force and its permitted case for the owner's attended agent session applies; the operator is the owner, and the authoring session is one the owner started on the owner's own host and attends, being present to see and stop what it does, never a session Syzygy started, one left running unattended, or one left under an automatic-approval or permission-bypass setting while the owner is away; the owner's execution choice for this run, recorded as stated below, was recorded before Syzygy issued the brief, and the brief cites it; and, where D9 as adopted carries its credential condition, the credential check below passed when the brief was issued. Otherwise the brief SHALL carry SEC-3's rule in this form: it SHALL quote SEC-3's head sentence as adopted, cite SEC-3, and state the rule as it applies to the agent, in its own words: do not build or run the observed project outside an explicit, opt-in execution profile; and it SHALL NOT invite the agent to build or run the observed project outside such a profile. As adopted, SEC-3's head sentence says what Syzygy runs, so a quotation alone does not tell the agent what the rule asks of it. Only the authoring session's brief may carry the permission: the inventory brief, every review packet and every session prompt Syzygy prints SHALL carry SEC-3's rule in that form. A brief that permits execution SHALL say that the permission lapses if the owner stops attending the session, including by leaving it under an automatic-approval or permission-bypass setting while away, and that the agent then runs no further observed code; whether the owner attended is the operator's declaration, labelled Inferred. Such a brief SHALL say that work the agent hands to its own subagents stays part of the session and under its rule, SHALL NOT ask for any process that outlives the session, and SHALL require the agent to stop, before its session ends, every process it started, including any it left running in the background; that the agent did so is its own report, labelled Inferred.

The owner's execution choice SHALL be a record for one run that names what the instruction covers: the run, its pinned revision, and building and running the observed project in the clone from that run's authoring session. Syzygy SHALL take the choice only from a dedicated command that the operator runs personally, in a new terminal or behind the agent tool's shell-escape prefix, never from the run configuration, an earlier run, or a standing or per-project record, and SHALL refuse a choice that names another run or revision, or none. The same command SHALL record the operator's declaration that the owner started the authoring session on the owner's own host and attends it; Syzygy SHALL issue no permitting brief without that declaration, and SHALL label it Inferred, attribute it to the operator and disclose it beside the choice. The choice SHALL NOT be read, stored or reported as an execution consent (RFC5-12; the base change's `SOURCE-POLICY.md`: "Execution consent is per project for an exact approved execution-profile version."), and it approves no execution profile. The skill and agent texts SHALL tell the agent never to run that command. The `/polaris-dossier` skill and the Codex instructions SHALL NOT grant execution themselves: they SHALL only defer to the execution rule in the run's `brief.md`, and absent that brief SHALL state that the observed project is not to be built or run outside an explicit, opt-in execution profile. Syzygy cannot observe who ran the command, or that the operator is the owner: the authoring agent, which runs the neighbouring commands, could run that command itself or write its record into the state directory, and only the skill and agent texts forbid it. Who ran it, that the operator is the owner, and the declaration rest on the operator's word, are labelled Inferred and are disclosed, and the record lies, like every record of the run, within the agent sessions' write reach. Syzygy SHALL NOT instruct a session to run observed code before the owner's choice for that run is recorded, or on a standing record, and SHALL NOT ask for the choice while D9 is not in force.

Where D9 as adopted carries its credential condition, Syzygy SHALL NOT, from the issue of a brief that permits execution, hold or write a typed-adapter credential where the operator's user can read it, and SHALL, before it issues such a brief and at every later step it takes for the run (each check, inventory check, review check and render, and close), attempt as the operator's user to read every credential that Syzygy holds for its typed adapters. Syzygy SHALL take the list of those credentials from a source the disclosure names, and SHALL disclose that the source lies within the agent sessions' write reach. If any is readable, Syzygy SHALL NOT issue a permitting brief, and after one is issued SHALL report the breach as a finding of that step, tell the agent to run no further observed code, and record the breach in the run record. An agent tool's permission or deny rule does not satisfy the check, which is a read at the operating-system level. The check observes what the operator's user could read at the instant it ran; that no process the session started, directly or not, could read a credential between checks, after close, through privilege escalation or by another route is Inferred and disclosed.

The run record SHALL name the execution rule the brief carried and, where execution was permitted, the owner's recorded choice, the operator's declaration that the owner started and attends the authoring session on the owner's own host, and the cost D9 states, quoted verbatim from SEC-3's bullet "What the permitted case costs" as adopted in `security.md`, never restated or abridged. Under either rule the brief SHALL require that every claim the agent rests on building or running the observed project be marked as resting on execution, labelled Inferred and name the commands it rests on, and that the draft list every command the agent reports having run, whether or not a claim rests on it. Syzygy SHALL disclose that whole list, as the session's own report, and each rendered claim that rests on execution SHALL show the commands it names beside it. Syzygy SHALL record that list in the run record as the agent's report, labelled Inferred; it cannot observe what the agent ran, and SHALL NOT present the list as complete or as Observed. Where execution was permitted, the brief SHALL ask the agent to report, for every command, the working directory it ran it in and whether it falls within the scope the owner's choice names, and the draft SHALL be admitted whether or not each command carries them; Syzygy SHALL flag, as a finding disclosed beside the command and labelled Inferred, each reported command whose reported working directory lies outside the clone, that has no reported working directory, or that the agent states falls outside that scope. A flag refuses no step and hides no command: under D9, SEC-3 governs what Syzygy does about the session, not what the session does, so a command outside the named scope is made visible, never forbidden.

The run configuration SHALL declare, before the brief is issued, the operator, the agent tool and its version, the agent's model provider, the model identity and, where the tool shows one, the model version, and these limits: a positive wall-clock deadline; at least one of a positive token budget or a positive turn budget for the agent sessions; and a repair-cycle limit and a clarification-question limit, each a nonnegative integer, 0 allowed. A configuration that lacks any of these, or that states an unlimited, negative or non-integer value, or zero for the deadline or for a stated token or turn budget, SHALL be refused; there is no default. Syzygy SHALL record each declared value as operator-declared and Inferred, and SHALL state that no provider-reported model version is available in this mode (REQ-polaris-generation-003). Syzygy SHALL enforce the limits that bind its own steps: it SHALL refuse a check or review check beyond the repair-cycle limit and any step after the deadline, measured on its own clock from the issue of the brief, and SHALL record the instants of its own steps. Syzygy cannot observe or enforce the agent sessions' usage. Agent usage SHALL be recorded only as the figure the operator declares, labelled Inferred and attributed to the operator, and where no figure is declared the run record SHALL say that the usage was not recorded and that Syzygy cannot observe it; it SHALL NOT be presented as Observed, as a provider receipt, or as zero.

Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`, Syzygy SHALL hold the run record and every record on which a check result, a limit or readiness rests in its own state directory for the run, outside the clone, and SHALL NOT claim that directory is outside the agent sessions' write reach; no separate operating-system user or sandbox is required. Syzygy SHALL NOT rest an Observed label on a record it stored. At render, and at each check, Syzygy SHALL re-derive from objects it verifies at that step: every rendered quotation, by locating the quotation again in the verified blob rather than trusting a recorded byte range; every check result; and every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names. Every value Syzygy shows that it cannot re-derive at that step SHALL be labelled Inferred, including the repair-cycle count, the instants of earlier steps, the run record's own history, which consented revision the run was pinned to, the brief's text and the execution rule it carried, the owner's execution choice and who entered it, the operator's declaration that the owner started and attends the authoring session on the owner's own host, the citation of a per-project statement, the declared session identifiers and launch forms, and the record of objects read in earlier steps. Syzygy SHALL issue no credential that authenticates to Syzygy for the run and SHALL place none in the clone, the brief, a review packet or the run's state directory.

The run record and every rendered page SHALL disclose, in human and machine form: the authoring mode; the agent tool, its version, its provider and the model identity and version, as operator-declared; that the agent read the clone without restriction, and that neither the consented content classes nor the screening policies bound what the agent read or sent; that the agent's account of what it read is self-reported and Inferred; the execution rule the brief carried, and whether the agent reported building or running the observed project, with every command it reported, labelled Inferred and marked as self-reported; that Syzygy made no provider call; that the records Syzygy read for its gates (the observation consent, the registry entry, the policy acts, any per-project statement, and the records that D9 and the owner's reading of RFC7-20 are in force), and where execution was permitted the source of the credential list, lie within the agent sessions' write reach; the pinned revision; that every rendered quotation was verified by Syzygy against the Git objects at that revision, with their identifiers recomputed; and that every value Syzygy shows from its stored records, rather than re-derives, is Inferred.

For a run in the operator-agent mode this requirement displaces exactly this predecessor text, quoted in the semantic delta: in REQ-polaris-generation-005, the sentence "A generation request SHALL identify positive finite limits for provider calls, input/output volume, charged usage and elapsed time, plus a finite nonnegative repair-cycle limit before dispatch.", replaced by the declared limits above, in its scenario "Invalid output or exhausted budget" the words "records actual usage", read as the instants of Syzygy's steps and the operator-declared usage, and in its scenario "Inspectable successful run" the words "with their actual inputs and outputs", read for source understanding and narrative construction as the pinned revision, the brief and the agent's self-reported account, labelled Inferred, and for Syzygy's own checks, packets and render as the objects and records Syzygy used; in REQ-polaris-generation-017, the clause "External authorities SHALL be accessed through their single registered adapter per project, never a competing direct route" and the scenario "Interface tries to bypass its adapter", as they apply to a provider operation, because the run has no provider route and Syzygy makes no provider operation (both continue to apply to Syzygy's Git object reads); in REQ-polaris-generation-018, the "final usage receipt" of the scenario "Interrupted run lacks optional evidence" and the "Captured usage" of the sentence on usage and cost, which in this mode are never captured and are replaced by the operator-declared figure above, and the words "immutable, identified, integrity-verifiable Execution Record in its governing work home", read as an identified Execution Record held in the run's state directory, whose immutability and integrity are Inferred; in REQ-polaris-generation-020, the Proposal, approval, scheduler-creation and materialization gates, read as stated above for a run that makes no provider dispatch and no scheduler effect; and in REQ-polaris-generation-022, the sentence "The trail SHALL reside outside the governed plane and untrusted actor write reach; work records or a same-user writable directory SHALL NOT substitute.", which a run on a host where the agent sessions share the operator's user cannot meet, so that the audit evidence of the run's admissions, denials and refusals is held in the run's state directory, labelled Inferred and disclosed; an agent session could alter or erase it, and no surface presents it as trustworthy recovery evidence. The Provider bullet and the "Budget and retry decisions" section of the base change's `INTERFACES.md` are read the same way: there is no provider adapter, and the operator, never the agent, declares the limits. The "Resolve warranted work" and "Materialize once, then execute" sections of the base change's `OWNER-FLOW.md` are read with REQ-polaris-generation-020 as stated above, and the paragraph of its `SECURITY-CONTRACT.md` that begins "The trail resides outside the governed plane" is read with REQ-polaris-generation-022's trail sentence. In REQ-polaris-generation-001, the sentence "For absent or withdrawn provider consent, the draft layer SHALL render Unknown (`unconsented-source-or-provider`) as a policy state in both channels, including when a prior draft remains retained." is read under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`, item 1, which reads RFC7-20's condition, "absent SEC-2 named-provider consent it is **not computed**", as governing drafts that Syzygy computes. A draft that the operator's own agent session computed SHALL be admitted to the draft layer, in the editorial-draft state, only when all three of that ruling's conditions hold: the run record and every page disclose how the draft was computed, as required above; the operator has declared the agent tool and provider and Syzygy has recorded them; and every rendered quotation is byte-verified against the pinned blobs (REQ-polaris-generation-034). The run record SHALL cite the ruling. Where a condition fails, or the ruling is withdrawn or ceases to be effective, the draft layer SHALL render Unknown (`unconsented-source-or-provider`) as a policy state in both channels, while the source pages of blobs Syzygy read and screened, and the disclosures, remain readable. A draft that Syzygy computes or dispatches, in either mode, remains governed by REQ-polaris-generation-001 and RFC7-20 without this reading. Every other sentence and scenario of REQ-polaris-generation-001, 003, 005, 017, 018, 020, 021, 022 and 025 is unchanged, including the egress check for every transmission Syzygy itself makes, the screening of every ingest, the rule that prompt and transcript bodies do not enter the Execution Record, and the rule that credentials authenticating to Syzygy are not injectable into observed-project execution.

ID: REQ-polaris-generation-033
Source: SEC-2; governing warrants below.
Scope: v1-mandatory

#### Scenario: Clone pinned to a consented revision

- **WHEN** the operator starts an operator-agent run over a local clone whose HEAD commit is a revision the in-force observation consent names
- **THEN** Syzygy records that commit as the pinned revision and reads every object for the run by object identifier at that commit
- **AND** an uncommitted change in the clone's working tree never reaches a check, a quotation or a source page

#### Scenario: Clone at an unconsented revision

- **WHEN** the clone's HEAD commit differs from every revision the observation consent names, or the consent, registry entry or a policy act is absent, withdrawn or ineffective
- **THEN** Syzygy refuses the run before issuing a brief and states the reason in human and machine form
- **AND** no object is read for the run

#### Scenario: Recorded revision altered

- **WHEN** after the brief, the pinned revision recorded in the run's state directory is changed to another commit present in the clone, or the observation consent stops naming the recorded revision
- **THEN** at the next check, review check or render Syzygy finds the recorded revision unnamed by the in-force consent, or finds that the draft, inventory or verdict names a different revision, and refuses the step with its reason
- **AND** no object at the other commit is read for a check, quoted or rendered

#### Scenario: Object store altered after pinning

- **WHEN** after the revision is pinned, a replacement ref substitutes another object for a blob, tree or commit on the path from the pinned commit, or the stored file of such an object is overwritten with the bytes of a different object
- **THEN** Syzygy ignores the replacement and reads the original object, or recomputes the overwritten object's identifier, finds it differs and refuses the step with its reason in human and machine form
- **AND** no substituted byte is quoted, classified as admitted, rendered on a source page or recorded as an Observed read

#### Scenario: No provider call and no egress record

- **WHEN** an operator-agent run completes
- **THEN** Syzygy's record shows no provider route resolved, no provider call made and no project content transmitted by Syzygy
- **AND** the run record and pages state that the agent sessions' sends to their provider were the operator's own act and are not covered by Syzygy's egress consent

#### Scenario: Limits declared by the operator

- **WHEN** the run configuration omits the deadline, omits both the token and the turn budget, omits the repair-cycle or question limit, states an unlimited, negative or non-integer value, or states zero for the deadline or a stated token or turn budget
- **THEN** Syzygy refuses to issue the brief and names the missing or invalid limit
- **AND** no default limit is chosen on the operator's or the agent's behalf

#### Scenario: Zero repair and question limits accepted

- **WHEN** the run configuration states a repair-cycle limit of zero or a clarification-question limit of zero, with every other limit valid
- **THEN** Syzygy issues the brief and records the zero limit as operator-declared
- **AND** the first resubmission, or the first recorded question, is refused or fails the check

#### Scenario: Agent usage is not observed

- **WHEN** the operator declares the agent sessions' token or turn usage at the end of a run, or declares none
- **THEN** the run record carries the declared figure as Inferred and attributed to the operator, or states that the usage was not recorded and that Syzygy cannot observe it
- **AND** no figure is labelled Observed, presented as a provider receipt or rendered as zero

#### Scenario: Syzygy's own limits enforced

- **WHEN** the agent submits a draft for checking after the repair-cycle limit is spent, or any step is requested after the deadline
- **THEN** Syzygy refuses the step, records the refusal and its instant, and the draft does not become ready
- **AND** the run's last checked state remains inspectable

#### Scenario: Stored record altered within the agent's reach

- **WHEN** a recorded byte range, check result, packet digest, repair-cycle count or step instant in the run's state directory is altered after Syzygy wrote it
- **THEN** at the next check and at render Syzygy re-locates every quotation in the verified blob, re-runs every check and rebuilds every review packet, so that no rendered Observed quotation, source page or counted verdict depends on the altered value
- **AND** the repair-cycle count, the earlier instants, the run record's history and every other value shown from a stored record are labelled Inferred

#### Scenario: Governed subject without a per-project provider statement

- **WHEN** the admitted project input records a kernel evidence drawer for the subject or does not state whether one exists, or the tree at the pinned revision holds an `openspec/**` specification, a capability declaration or declared topology, or any `.syzygy/` path, adopted or not, and no in-force per-project statement names the operator's agent provider
- **THEN** Syzygy refuses to issue a brief and states the missing statement in human and machine form
- **AND** no object is read for a check and no draft is admitted

#### Scenario: Governed subject with a per-project provider statement

- **WHEN** a governed subject's in-force per-project statement names the operator's agent provider and the content classes it may receive
- **THEN** the run proceeds, its record cites the statement as a consent record, and every page states that the named classes and the screening policies did not bind what the agent read or sent
- **AND** no egress record is made for the agent's sends

#### Scenario: Per-project statement withdrawn mid-run

- **WHEN** the per-project statement a governed run relies on is withdrawn after the brief
- **THEN** Syzygy refuses every later step of the run and states the withdrawal in human and machine form
- **AND** the run's last checked state remains inspectable

#### Scenario: Non-governed subject needs no statement

- **WHEN** the admitted project input states that no kernel evidence drawer exists and the pinned tree holds no `openspec/**` path and no `.syzygy/` path
- **THEN** Syzygy issues the brief without a per-project statement
- **AND** the run record and pages state that the agent's sends were the operator's own act

#### Scenario: Execution rule follows SEC-3

- **WHEN** Syzygy issues a brief while D9 is not in force, the operator is not the owner, no execution choice for that run is recorded, the choice was recorded without the operator's declaration that the owner started and attends the authoring session on the owner's own host, the only choice is in the run configuration, from an earlier run or a standing or per-project record, the choice names another run or revision, or the credential check D9 requires fails
- **THEN** the brief quotes SEC-3's head sentence as adopted, cites SEC-3, states in its own words that the agent is not to build or run the observed project outside an explicit, opt-in execution profile, and does not invite it to
- **AND** the run record names the execution rule the brief carried

#### Scenario: Execution permission stays with the authoring session

- **WHEN** execution is permitted for a run
- **THEN** the inventory brief, every review packet and every printed session prompt carry SEC-3's rule in the brief's form and carry no permission
- **AND** the authoring brief says the permission lapses if the owner stops attending, including by leaving the session under automatic approval or permission bypass while away

#### Scenario: Adapter credential readable

- **WHEN** D9 as adopted carries its credential condition and Syzygy, reading as the operator's user, can read a credential it holds for a typed adapter, before the brief or at any later check, inventory check, review check, render or close
- **THEN** Syzygy issues no permitting brief, or after one reports the breach as a finding of that step, tells the agent to run no further observed code and records the breach
- **AND** an agent tool's permission or deny rule does not pass the check, and the disclosure names the source of the credential list and states that readability between reads, after close and through privilege escalation is Inferred

#### Scenario: Execution permitted under the amendment

- **WHEN** D9 is in force, the operator is the owner attending the authoring session the owner started on the owner's host, the operator recorded, through the dedicated command before the brief, the owner's execution choice for that run and revision and the declaration that the owner started and attends the authoring session on the owner's own host, and any credential check D9 requires passed
- **THEN** the authoring brief says the agent may build and run the observed project, cites the recorded choice, keeps the agent's subagents under the same rule, asks for no process that outlives the session and requires every process the agent started to be stopped before its session ends
- **AND** the run record cites the owner's choice and the declaration, discloses that who entered them and that the operator is the owner are Inferred, and quotes the amendment's cost bullet as adopted
- **AND** the choice is not recorded or reported as an execution consent and approves no execution profile
- **AND** Syzygy itself runs nothing and launches nothing

#### Scenario: Permitting brief without the host and attendance declaration

- **WHEN** every other condition for a permitting brief holds but the dedicated command recorded no declaration that the owner started the authoring session on the owner's own host and attends it
- **THEN** Syzygy issues no permitting brief, and the brief carries SEC-3's rule in the brief's form
- **AND** the run record names the missing declaration

#### Scenario: Consent or policy record without its owner act

- **WHEN** an observation consent, registry entry, policy act or per-project statement that a step needs carries a status word or is present as a file, but no owner-act record makes it effective
- **THEN** Syzygy treats it as not in force and refuses that step, with its reason in human and machine form
- **AND** every page discloses that the records Syzygy read for its gates lie within the agent sessions' write reach

#### Scenario: D9 record without its owner act

- **WHEN** every other condition for a permitting brief holds, and a record says D9 is in force, but no owner-act record makes D9 effective
- **THEN** Syzygy issues no permitting brief, and the brief carries SEC-3's rule in the brief's form

#### Scenario: RFC7-20 reading record without its owner act

- **WHEN** an operator-computed draft layer would otherwise render under the owner's reading of RFC7-20, and a record says that reading is in force, but no owner-act record makes it effective
- **THEN** the draft layer renders Unknown (`unconsented-source-or-provider`)

#### Scenario: Every reported command disclosed

- **WHEN** the draft lists commands the agent reports having run, some of which no claim rests on
- **THEN** the run record and every page disclose the whole list as the session's own report, labelled Inferred
- **AND** each claim that rests on execution shows the commands it names beside it

#### Scenario: Reported command outside the named scope

- **WHEN** execution was permitted and the draft lists a command whose reported working directory lies outside the clone, has none, or that the agent states falls outside the scope the owner's choice names
- **THEN** Syzygy admits the draft and flags that command as a finding disclosed beside it, labelled Inferred
- **AND** no step is refused for it and no reported command is hidden

#### Scenario: Mode disclosed on every page

- **WHEN** an operator-agent run is rendered
- **THEN** every page and the machine manifest state the mode, the operator-declared agent tool, version, provider and model, the unrestricted reading and the classes and policies that did not bind it, the self-reported read account, the execution rule and the commands the agent reported with their self-reported marking, the absence of any Syzygy provider call, the pinned revision, Syzygy's verification of every rendered quotation, and that every value shown from its stored records is Inferred
- **AND** the human and machine disclosures carry the same values

#### Scenario: Operator-computed draft admitted under the owner's reading

- **WHEN** an operator-agent run is rendered with the computation disclosed, the agent tool and provider declared and recorded, and every rendered quotation byte-verified, while the owner's reading of RFC7-20 is effective
- **THEN** the draft layer renders in the editorial-draft state and the run record cites the ruling
- **AND** the draft layer carries the disclosure of how it was computed

#### Scenario: Provider-mode draft keeps the adopted rule

- **WHEN** a provider-mode run has no named-provider consent
- **THEN** its draft layer renders Unknown (`unconsented-source-or-provider`) as a policy state in both channels
- **AND** the owner's reading of RFC7-20 is not applied to it

#### Scenario: A condition of the owner's reading fails

- **WHEN** the disclosure is absent, the tool or provider is not recorded, or the owner's reading is withdrawn or no longer effective
- **THEN** the draft layer renders Unknown (`unconsented-source-or-provider`) as a policy state in both channels
- **AND** the source pages of blobs Syzygy read and screened, and the disclosures, remain readable

#### Scenario: Agent reports running the observed project

- **WHEN** the agent reports having built or run the observed project and marks a claim as resting on what it observed
- **THEN** the claim is labelled Inferred and renders with the commands it names beside it, and the run record lists every command the agent reported, labelled as the agent's report
- **AND** Syzygy executes none of them, and no surface presents the list as complete or as Observed

Form: event-response.

- **Case:** Run operator-agent starts against controlled clones, consent records, registry entries, policy acts, provider statements and run configurations, varying each independently, including clones whose object store carries a replacement ref or an overwritten object file after pinning, clones whose objects use another hash algorithm, state directories whose records, including the recorded pinned revision, are altered between steps, runs with and without D9 in force, with execution choices entered through the dedicated command with and without the host and attendance declaration, the run configuration, an earlier run or naming another revision, with adapter credentials readable and unreadable by the operator's user at each step after a permitting brief, and gate records carrying a status word or present as a file with and without the owner-act record that makes them effective; capture Syzygy's process network activity, object reads and writes.
- **Observable:** The run record, the refusal reasons, the recorded pinned revision, the objects read, how they were addressed and their recomputed identifiers, the recorded limits and usage, the issued brief's execution rule, captured network effects, the locations written, and the human and machine disclosures.
- **Oracle:** Expected refusals, pinned revisions, governed classifications and disclosures derived from the controlled inputs outside the generator; expected object bytes computed by an independent Git implementation from a pristine copy of the fixture; an independent capture of Syzygy's network effects and writes, not the generator's own record of them.
- **Oracle independence:** The consent, registry, policy, statement, configuration and tampering fixtures are prepared before the run and are not produced by the code under test.
- **Falsifier:** Syzygy makes a provider call or transmits project content; an object is read from the working tree or at another commit; a check, review check or render proceeds after the recorded pinned revision is altered or stops being consented; a draft, inventory or verdict naming another revision is accepted; the hash algorithm is taken from the clone's configuration; a replacement or overwritten object's bytes are quoted, admitted or rendered; a run starts at an unconsented revision or without a valid declared limit; a zero repair-cycle or question limit is refused; agent usage is labelled Observed, shown as a receipt or as zero; a governed subject under any of the four conditions proceeds without a statement; a brief invites execution outside an execution profile while D9 is not in force, the operator is not the owner, the owner's choice for that run is unrecorded, is taken from the run configuration, an earlier run or a standing record, or names another run or revision, or a credential D9's condition covers is readable by the operator's user; a permitting brief is issued without the operator's declaration that the owner started and attends the authoring session on the owner's own host, or omits the statement that the permission lapses when the owner stops attending; a credential read is skipped at a check, inventory check, review check, render or close after a permitting brief, or, from a permitting brief on, Syzygy holds or writes a typed-adapter credential the operator's user can read; the run record restates or abridges D9's cost rather than quoting the adopted bullet; a brief that does not permit execution omits SEC-3's head sentence, its citation or the agent-directed statement; the execution choice is read, stored or reported as an execution consent; a skill or Codex text grants execution itself; a gate input is treated as in force from a status word or a file's presence; an inventory brief, review packet or session prompt carries the permission; who entered the choice is shown as Observed; a brief that permits execution asks for a process that outlives the session or omits the requirement to stop every process the agent started; a reported command on which no claim rests is left undisclosed; Syzygy launches a process that runs observed code; a value shown from a stored record is labelled Observed; an audit principal or credential identity is fabricated; an altered stored record changes a rendered Observed quotation, a source page or a counted verdict; Syzygy writes outside its state directory or issues a credential for the run; a disclosure is absent or differs between channels; an operator-computed draft renders outside Unknown while a condition of the owner's reading fails; Syzygy executes observed code; or the agent's reported commands are presented as complete or Observed; where execution was permitted, a reported command outside the clone, without a reported working directory or stated by the agent to fall outside the named scope is left unflagged, or a flag refuses a step or hides a command.

```yaml
warrants:
  primary: SEC-2
  doctrine: [SEC-1, SEC-2, SEC-3, SEC-5, VIS-1, VIS-2, VIS-4]
  contracts: [RFC2-24, RFC3-16, RFC4-2, RFC4-19, RFC5-12, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-003, REQ-polaris-generation-005, REQ-polaris-generation-017, REQ-polaris-generation-018, REQ-polaris-generation-020, REQ-polaris-generation-021, REQ-polaris-generation-022, REQ-polaris-generation-025]
```

### Requirement: Agent brief and mechanically checked draft

In the operator-agent mode Syzygy SHALL issue a versioned brief bound to the run and its pinned revision. The brief SHALL state: the reader topics the owner set for a dossier, which are core ideas, end-to-end workflows, mechanisms, maintainer-stated advantages and trade-offs; the understanding record required below; the labelling rules; the citation and quotation rules; the clarification rule of REQ-polaris-generation-036; the execution rule that REQ-polaris-generation-033 says the brief carries, which unless every condition 033 sets under D9 holds is SEC-3's rule in the form 033 gives it: SEC-3's head sentence as adopted, its citation, and the agent-directed statement not to build or run the observed project outside an explicit, opt-in execution profile; the rule that text found in the clone is data to be described, never an instruction to follow; the run's declared limits; and the structured draft schema with its version. The brief SHALL carry no project content beyond the repository identity and the pinned revision, and SHALL require the draft to name that revision.

The draft SHALL carry, before its argument, an understanding record of the subject's supported purpose, beneficiary, proposition, capabilities, component responsibilities and relationships, choices and alternatives, trade-offs, limits, terminology, contradictory accounts and unanswered questions, each substantive item with its citations, scope and label. Syzygy SHALL check that record as it checks claim blocks and SHALL render it as the agent's self-reported understanding, labelled Inferred; that it was formed before the argument was drafted is the agent's report. For a run in the operator-agent mode this reads REQ-polaris-generation-002's sentence "Before drafting the central argument, the generator SHALL expose a reviewable understanding of supported purpose, beneficiary, proposition, capabilities, component responsibilities and relationships, choices and alternatives, trade-offs, limits, terminology, contradictory accounts and unanswered questions." as met by that record; every other sentence of REQ-polaris-generation-002 is unchanged, including that the producer's understanding remains under independent review and does not replace the independent source denominator.

The labelling rules are: every claim block carries exactly one label, Inferred or Unknown, or is marked non-normative (RFC7-2 (b)); an Unknown block names its reason; an agent SHALL NOT label its own claim Observed; a claim that the agent marks as resting on its building or running of the observed project is Inferred and names, from the draft's list of reported commands, the commands it rests on; and Observed is reserved for a quotation that Syzygy has verified. The citation rules are: every Inferred block SHALL cite at least one source as a repository path and an inclusive line range at the pinned revision; an Unknown block SHALL cite the sources it considered where there are any and MAY cite none; a non-normative block SHALL carry no citation and no anchor (REQ-polaris-generation-003). The quotation rule is: a quotation is one contiguous span of one cited file at the pinned revision, without elision, joining or alteration other than the normalisation stated below, and every quotation SHALL name the citation it is taken from.

Syzygy SHALL check each submitted draft and SHALL report every failure as a repair finding that names the block, the citation, the kind of failure and the location to repair. The checks are:

- the draft validates against its declared schema version, with unique identities and resolving internal references (REQ-polaris-generation-019), and names the pinned revision;
- every cited path names a blob at the pinned revision, and every cited line range lies within that blob;
- every quotation, after the normalisation that the generator's existing quote check applies to both the quotation and the source, is one contiguous run of the cited blob's text, beginning and ending on word boundaries, that lies within the cited line range, and Syzygy records the span's byte range in the blob; that normalisation drops comment leaders at line starts and a closing comment marker at a line end, keeps only the text of markdown links and images, decodes character entities, removes markdown backslash escapes, drops backticks, drops paired emphasis marks at word edges, straightens curly quotes, turns an ellipsis character into three full stops, and collapses each whitespace run to one space; an ellipsis in a quotation that the source does not carry is an elision and fails;
- every block carries a label the labelling rules permit and the citations the citation rules require, a non-normative block carries none, every Unknown block names a reason from RFC2-24's closed list, and every block the agent marks as resting on execution names at least one command present in the draft's list of reported commands. Syzygy can see only the marking; whether an unmarked claim rests on execution is the agent's report, and the page SHALL say so.

A blob that classification or screening excludes SHALL NOT be used to verify a quotation: the quotation is unverifiable, the block that relies on it SHALL render Unknown with `excluded-content` instead of the quotation, and its exclusion is not a repair finding. A repair finding SHALL carry no excluded bytes. Each resubmission is a new draft revision with its own identity; it counts against the repair-cycle limit, and it retires earlier check results and dependent review evidence (REQ-polaris-generation-006). A draft with an unresolved finding SHALL NOT proceed to review or become ready.

Syzygy SHALL render a checked draft through the existing multi-page dossier renderer. Every rendered quotation SHALL be the span Syzygy located, at render, in the blob it read and verified at the pinned revision, never the agent's copy of it and never a byte range taken on trust from a stored record. A source page SHALL be rendered only for a blob that Syzygy read and verified at the pinned revision and that screening admitted. Each anchor SHALL take RFC7-10's form: the target class is an evidence artifact identifier with integrity digest, whose identifier is the blob's object identifier as Syzygy recomputed it from the bytes it read, with its hash algorithm named, that algorithm being the one the consented revision's identifier is written in, serving as both the owning identifier and the integrity digest; the optional fragment is the byte range of the span; the target state is the pinned revision. The repository path is shown beside it as a label, never as its identity. Generated prose SHALL render in the editorial-draft state (RFC7-20), machine-marked with the operator-declared model identity and version as its inference provenance. Rendering obligations of REQ-polaris-generation-003, 004 and 012, and of REQ-polaris-generation-032 where it is adopted and applies, are unchanged.

A draft MAY present its argument with presentation elements (owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`), standing where a claim block may stand: a table, a callout, an ordered list of steps, a list of definitions, a set of cards, a collapsible section and a code excerpt. Every claim an element carries (a table cell, a block inside a callout or a collapsible section, a step, a definition, a card's body) SHALL be a claim block for every rule of this requirement and of REQ-polaris-generation-035: it carries its own identity, label, citations and quotations; Syzygy checks it and reports its findings as for any claim block; the fidelity verdict carries an entry for it; and it renders with its label's marking. A table cell MAY instead be empty: an empty cell states nothing, carries no label, citation or quotation, and SHALL render with the visible words "no entry", never as a blank a reader could take for a negative; an absence or a negative the draft means to state SHALL be written as a claim in that cell, Inferred with its citations or Unknown with its reason. An element's short labels (a table caption, a column heading, a callout title, a defined term, a card label, a collapsible section's summary, a code excerpt's language) are presentation: each is plain text of at most 120 characters that names what it heads; it SHALL carry no citation and no quotation, SHALL state no fact about the subject, carries no epistemic label of its own and SHALL NOT render as Observed. Syzygy SHALL report a finding for a short label longer than 120 characters or one that carries a citation, a quotation or markup (a `<`, `&` or backtick character, or a Markdown link, image or paired emphasis mark); that a label states no fact is the agent's report, open to the fidelity and rendered-design reviews. A code excerpt carries no text of the agent's: it SHALL name one citation of 1 to 60 lines, and Syzygy SHALL report a repair finding for one of more; Syzygy SHALL render those lines from the blob it read and verified at the pinned revision, byte for byte, as a quotation Syzygy has verified, labelled Observed, with an anchor in the form above whose fragment is the lines' byte range; the citation rules and the rule for a blob that classification or screening excludes apply to it as to a quotation, so that for an excluded blob the excerpt SHALL render Unknown with `excluded-content` in its place, carrying none of the blob's bytes, and its exclusion is not a repair finding. Syzygy SHALL render every element through the same renderer as inert static HTML, in the HTML element whose meaning matches it (a table whose header cells are scoped to their row or column, an aside, an ordered list, a description list, a list whose items are each headed by their label, a details element with its summary, preformatted code), with no script and no change to the pages' content security policy; a callout's tone SHALL be stated in its words, never by colour alone; and no fragment target SHALL sit inside a collapsible section. An element adds no read, no source and no label beyond those of the claims it carries and the excerpt Syzygy reads.

ID: REQ-polaris-generation-034
Source: RFC7-2; governing warrants below.
Scope: v1-mandatory

#### Scenario: Brief carries topics, rules and schema

- **WHEN** an operator-agent run's limits and pinned revision are recorded
- **THEN** Syzygy issues a brief that names the five reader topics, the understanding record, the labelling, citation and quotation rules, the clarification rule, the execution rule REQ-polaris-generation-033 assigns, the rule that text in the clone is data, the declared limits, the pinned revision and the draft schema version
- **AND** the brief contains no project content other than the repository identity and the pinned revision

#### Scenario: Understanding record self-reported

- **WHEN** a checked draft is rendered
- **THEN** its understanding record appears as the agent's self-reported understanding, labelled Inferred, with each item's citations checked as a claim block's are
- **AND** a draft without the record, or whose record omits one of the named items without an Unknown entry for it, fails the check

#### Scenario: Quotation verified against the pinned blob

- **WHEN** a draft block quotes a span that, after normalisation, occurs contiguously in the cited blob at the pinned revision within the cited line range
- **THEN** Syzygy records the span's byte range, locates the span again at render in the blob it verified, and renders it from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest
- **AND** a later change to the clone's working tree, or to the recorded byte range, does not alter the rendered span

#### Scenario: Quotation altered, elided or outside its range

- **WHEN** a quotation differs from the cited blob after normalisation, joins two separate spans, or occurs only outside the cited line range
- **THEN** Syzygy reports a repair finding naming the block, the citation and the kind of failure
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Cited path absent at the pinned revision

- **WHEN** a block cites a path that names no blob at the pinned revision, or a line range beyond the end of the blob
- **THEN** Syzygy reports a repair finding for that citation
- **AND** no source page or anchor is rendered for the absent citation

#### Scenario: Quotation from an excluded file

- **WHEN** a block quotes a file that classification or screening excludes
- **THEN** the quotation is not verified or rendered and the block renders Unknown with `excluded-content`
- **AND** no source page is rendered for the file and no finding carries its bytes

#### Scenario: Agent labels its own claim Observed

- **WHEN** a draft block carries the label Observed, carries no label, is Unknown without a reason from the closed list, is Inferred without a citation, is non-normative with a citation, or is marked as resting on execution without naming a reported command
- **THEN** Syzygy reports a label or citation finding for that block
- **AND** Observed appears on the page only on a quotation Syzygy verified, and an Unknown block with no source to cite passes

#### Scenario: Repair loop counted

- **WHEN** the agent resubmits a repaired draft
- **THEN** the resubmission is a new revision whose check counts against the repair-cycle limit, and earlier check results and dependent reviews are retired
- **AND** each finding, its repair and both revision identities remain traceable

#### Scenario: Claim inside a presentation element checked as a block

- **WHEN** a table cell, a block in a callout or a collapsible section, a step, a definition or a card's body is unlabelled, is Inferred without a citation, is Unknown without a reason from the closed list, or carries a quotation that fails
- **THEN** Syzygy reports the finding for that claim by its own identity, as for any claim block
- **AND** each claim that passes renders with its label's marking and has its own entry in the fidelity verdict

#### Scenario: Short label carries no claim

- **WHEN** an element's caption, column heading, title, term, card label, summary or language is longer than 120 characters, or carries a citation, a quotation or markup
- **THEN** Syzygy reports a finding for that element's label
- **AND** a label that passes renders as plain text with no label marking and no anchor

#### Scenario: Code excerpt rendered from Syzygy's read

- **WHEN** a draft carries a code excerpt whose citation names at most 60 lines of a blob that Syzygy read and verified at the pinned revision and screening admitted
- **THEN** Syzygy renders those lines from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest
- **AND** no text the agent supplied appears in the excerpt, and a later change to the clone's working tree does not alter it

#### Scenario: Code excerpt over its limit

- **WHEN** a code excerpt's citation names more than 60 lines, or lines beyond the end of the blob
- **THEN** Syzygy reports a repair finding for that excerpt's citation
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Code excerpt of an excluded file

- **WHEN** a code excerpt cites a blob that classification or screening excludes
- **THEN** the excerpt renders Unknown with `excluded-content` in its place and carries none of the blob's bytes
- **AND** its exclusion is not a repair finding

#### Scenario: Presentation element rendered inert

- **WHEN** a checked draft that uses presentation elements is rendered
- **THEN** each element renders as the HTML element whose meaning matches it, with header cells scoped, no script and the content security policy unchanged
- **AND** each callout states its tone in words, each empty table cell shows the words "no entry", and no fragment target lies inside a collapsible section

Form: event-response.

- **Case:** Submit controlled drafts against a fixture repository at a pinned commit, varying each quotation, citation, label, block kind, understanding item, execution marking and screening outcome independently, including exact, normalised, altered, elided, joined, out-of-range and excluded-file quotations, and altering recorded byte ranges between check and render; and with presentation elements, varying each claim an element carries, each short label's length, citations and markup, and each code excerpt's line count and screening outcome.
- **Observable:** The issued brief, the repair findings, the recorded byte ranges, the rendered quotations, anchors, understanding record and source pages, and the labels in human and machine output; the rendered elements, their HTML element names and header-cell scopes, the pages' scripts and content security policy, and the fidelity verdict's entries.
- **Oracle:** Expected findings and byte ranges computed from the fixture blobs outside the checker, by an independent byte search over the fixture's own normalised text; expected labels, citation outcomes and Unknown reasons fixed in the fixture; and for presentation elements the expected HTML element names, header-cell scopes, empty-cell text, short-label findings and the absence of any script or content security policy change fixed in the fixture, with each code excerpt's expected bytes read from the fixture blob outside the renderer.
- **Oracle independence:** The fixture's expected outcomes are written before the checker runs and are not derived from the checker's output.
- **Falsifier:** An altered, elided, joined or out-of-range quotation passes; a rendered quotation comes from the agent's text, the working tree or an altered stored range; an anchor names a class other than an evidence artifact identifier with integrity digest, or an identifier Syzygy did not recompute; a source page appears for an excluded or unread blob; a finding carries excluded bytes; an agent-labelled Observed claim renders as Observed; a non-normative block carries an anchor; a draft without its understanding record passes; a stale check or review survives a resubmission; a claim inside an element escapes a check a claim block meets, lacks its label marking or its entry in the fidelity verdict; an empty table cell renders as a blank, or with a label marking or an anchor; a short label over 120 characters, or carrying a citation, a quotation or markup, passes, or renders with a label marking or an anchor; a code excerpt renders the agent's text, more than 60 lines, or any byte of an excluded blob; an element renders a script, changes the content security policy, states a callout's tone by colour alone, or holds a fragment target inside a collapsible section.

```yaml
warrants:
  primary: RFC7-2
  doctrine: [SEC-3, SEC-5, VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-24, RFC7-2, RFC7-9, RFC7-10, RFC7-19, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05, OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04]
  topology: []
  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-006, REQ-polaris-generation-012, REQ-polaris-generation-019, REQ-polaris-generation-025, REQ-polaris-generation-033]
```

### Requirement: Fresh-context review in the operator-agent mode

In the operator-agent mode the independent inventory and the fidelity and rendered-design reviews that REQ-polaris-generation-006 requires SHALL each be produced in a separate top-level agent session that the operator starts (owner direction `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`, item 2); a session the operator starts in a new terminal, or by typing the command Syzygy printed behind the agent tool's shell-escape prefix (in Claude Code, `!`) in the authoring session's terminal, is a session the operator starts; a subagent spawned by the authoring session, a process the authoring session's agent launches, including a headless session it starts and whose output it reads, or any context whose instructions the authoring session wrote, SHALL NOT satisfy the inventory or a review. The inventory context SHALL start from Syzygy's inventory brief and SHALL NOT be given the draft; Syzygy SHALL check its quotations and citations as REQ-polaris-generation-034 checks a draft, and SHALL freeze it before the fidelity review. For each review Syzygy SHALL emit a review packet containing only the frozen subject (the draft with its understanding record, or for the rendered-design review the rendered pages excluding one named review-status region), the cited spans as Syzygy read them, the governing criteria, the verdict schema, the pinned revision and the packet's own digest, so that the review context can re-hash the packet before it reads it; the fidelity packet SHALL also carry the frozen inventory, as the criterion against which REQ-polaris-generation-006 measures coverage, and its cited spans SHALL be those cited by the draft and by the frozen inventory, screening-admitted only; the pages published after the rendered-design review SHALL be the reviewed pages with only the named review-status region changed, and a change outside that region is a revision of the subject; the packet SHALL NOT contain the brief's authoring exchange, any transcript or the agent's read account. The review context SHALL write a structured verdict that names the packet's digest and records inventory-to-draft coverage for every inventory entry, draft-to-source support for every claim block, the accuracy of every inventory entry against the cited spans in its packet, and every finding with its severity and its deficient subject (discovery, understanding, clarification, argument, prose, asset or rendering).

Syzygy SHALL validate the verdict before it counts: its schema; that the packet digest equals the digest of the packet Syzygy rebuilds, at validation and at render, from the current frozen subject; that every inventory entry and every claim block has an entry; that every quotation the verdict relies on verifies as in REQ-polaris-generation-034; and that a verdict with an unresolved blocking finding does not declare the subject ready. A verdict that fails validation SHALL be recorded and SHALL NOT count as a review. Any revision of the subject or the inventory retires the verdicts bound to it.

The run record SHALL record the agent tool, version and model of the authoring, inventory and review contexts as the operator declares them; each context's session identifier as that session declares it in its draft, inventory or verdict; and for each inventory and review context its launch form, which is a new terminal or the shell-escape prefix, as the operator declares it; each is labelled Inferred and attributed to whoever declared it. Syzygy SHALL refuse an inventory or verdict whose declared launch form is neither, and neither SHALL count until its launch form is declared. Syzygy SHALL refuse an inventory whose declared session identifier equals that of the authoring session, and a verdict whose declared session identifier equals that of the authoring session or of the inventory session it reviews. The record SHALL distinguish what Syzygy observed, which is the packet Syzygy built and rebuilt from the frozen subject, its digest, and that the verdict names that digest, from what remains Inferred, which is that the review context read the packet Syzygy emitted, unaltered, that each session was a top-level session the operator started, in the launch form declared, and not a subagent or process of the authoring session, that each context was fresh, that the review context saw nothing beyond its packet, that the inventory context did not see the draft, that each verdict and the inventory were written by the session declared for them, the session identifiers themselves, and the inventory's completeness over the clone and its preparation from the whole source population. The review page SHALL disclose that distinction.

An inventory or review session MAY be started before its input exists (owner direction `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`). At the start of a run Syzygy MAY write the inventory brief into the inventory session's directory, make a directory for each review session, and print for each session the command that starts it; the operator starts each such session as above, and neither Syzygy nor the authoring session starts, resumes or signals it. Because a waiting session holds its terminal for the whole run, Syzygy SHALL print its command for a new terminal only and SHALL refuse a shell-escape launch form declared for it. A waiting session SHALL obtain its input only through one Syzygy command named for its directory, which reads only the local file system and makes no network request; waits at most a bounded time, never past the run's declared deadline, and then tells the session to run it again; and before the session reads its input re-hashes it against the digest Syzygy recorded in the run's state directory when it wrote it, refusing on any mismatch. Syzygy SHALL deliver a review packet to a waiting session only by writing the packet and its digest into that session's directory as the next numbered round and recording the delivery, and only after the gates of REQ-polaris-generation-033, including the per-project provider statement for the waiting session's own declared agent tool, pass at that delivery; a delivery SHALL NOT change the session's declared agent tool, version or model. The command Syzygy prints for a waiting session SHALL pre-approve, where the agent tool offers rules that narrow, only read tools over the session's own directory (and, for the inventory session, the clone) and that one Syzygy command for that directory, and never a write or a general shell; where the agent tool offers no rules that narrow, Syzygy SHALL print no pre-approval and SHALL say so. Where the agent tool can limit which of its own tools a session has at all, the printed command SHALL also limit a waiting session to its read tools and the shell its one command runs in. A waiting session SHALL hand its inventory or verdict to that command, as content it passes to the command or as a file under its own directory that the command reads; every instruction Syzygy prints for passing content SHALL pass it so that the shell expands nothing in it, and SHALL say so. Syzygy writes the content into the session's directory under the role's own file name (the inventory, or the verdict of a round Syzygy delivered), and only there, and checks it as REQ-polaris-generation-034 and this requirement check an inventory or a verdict. A waiting session SHALL NOT carry the execution permission of REQ-polaris-generation-033. One waiting review session MAY receive the packet of each later revision of its subject as its next round, and a verdict it writes on that packet is validated and counted under the rules above. For every counted verdict the review page SHALL disclose whether its session had received an earlier round, or declares the session identifier of an earlier verdict of its kind, and where it had, that the reviewer has seen its own earlier verdict, which may anchor this one. The delivery records, the delivered files and the declared session identifiers lie within the agent sessions' write reach: that a waiting session read the packet Syzygy delivered, unaltered, that the operator used the printed command, that the agent tool applied the printed pre-approval as written, that no allow rule in a settings layer the operator keeps outside the printed command (the agent tool's user, project or local settings) widens what the session may run unattended, that the session started no subagent, which would act with the same pre-approval, that the printed limit on the agent tool's own tools leaves the session no other of them, and a reviewer's continuity or its absence are Inferred; whether a tool from outside the agent tool's own set, such as one connected through the operator's account, remains available to the session, and whether the agent tool's rule for the one command admits an output redirection, a write outside the role's own file, are Unknown; and no surface states any of them as Observed.

For a run in the operator-agent mode this requirement reads REQ-polaris-generation-006 as follows, and displaces only what it names: "Reviewers SHALL receive the artifact, governing references and acceptance criteria without the authoring conversation" is met by the packet rule above; the inventory "covering the entire admitted source population" is the inventory context's self-reported coverage of the clone at the pinned revision, labelled Inferred, and readiness SHALL NOT claim that coverage as verified; in "The fidelity reviewer SHALL verify inventory accuracy and completeness against the owning admitted sources rather than trusting preparation output.", accuracy is verified by the fidelity reviewer for each inventory entry against the cited spans in its packet, and completeness is the inventory context's self-report, labelled Inferred and never presented as verified, because the owner's ruling confines the reviewer to its packet; in "The bounded workflow SHALL prepare or validate the independent inventory and questions from admitted sources", the inventory is prepared by the inventory context from the clone it read without restriction, and Syzygy validates its quotations and citations against the blobs it read and verified at the pinned revision, while its preparation from the whole source population is the inventory context's self-report, labelled Inferred; and the words "accounting for those calls in its run budget" read as the operator-declared limits of REQ-polaris-generation-033, which cover the inventory and review contexts. Every other sentence and scenario of REQ-polaris-generation-006, including the rule that unresolved material omissions prevent readiness, the fresh-reader review of RFC7-25 and the rule that the generator does not classify its own wording change as immaterial, is unchanged.

ID: REQ-polaris-generation-035
Source: VIS-3; governing warrants below.
Scope: v1-mandatory

#### Scenario: Review packet without the authoring exchange

- **WHEN** Syzygy emits a fidelity review packet for a frozen draft
- **THEN** the packet holds the frozen draft with its understanding record, the spans cited by the draft and by the frozen inventory as Syzygy read them, the criteria with the frozen inventory, the verdict schema, the pinned revision and its own digest, and nothing else
- **AND** its digest is recorded in the run record

#### Scenario: Verdict bound to a stale packet

- **WHEN** a verdict names a packet digest other than the digest of the packet Syzygy rebuilds from the current frozen draft and inventory, including after the stored frozen draft is altered
- **THEN** Syzygy records the verdict and refuses to count it as a review
- **AND** readiness names the review still required

#### Scenario: Reviewer or inventory declared as the author

- **WHEN** the declared session identifier of a review session equals that of the authoring session or of the inventory session it reviews, the declared session identifier of the inventory session equals that of the authoring session, or a declared launch form is neither a new terminal nor the shell-escape prefix
- **THEN** Syzygy refuses the verdict or the inventory and records the refusal
- **AND** the page does not show the review or the inventory as independent

#### Scenario: Verdict incomplete or inconsistent

- **WHEN** a verdict omits an inventory entry or a claim block, omits the accuracy of an inventory entry, relies on a quotation that does not verify, or declares readiness with an unresolved blocking finding
- **THEN** validation fails, the verdict is recorded and does not count
- **AND** the draft does not become ready

#### Scenario: Independence and completeness disclosed as Inferred

- **WHEN** a validated verdict counts as the review of record
- **THEN** the review page states that the packet Syzygy built, its digest and the verdict's naming of that digest are Observed, and that the review context's reading of that packet unaltered, the freshness of each context, its declared launch form, the authorship of the verdict and the inventory, the session identifiers and the inventory's completeness are Inferred
- **AND** no surface states the review's independence or the inventory's completeness as Observed or verified

#### Scenario: Design review survives its status region

- **WHEN** a counted rendered-design review is followed by a render that changes only the named review-status region
- **THEN** the review stays counted and the published pages equal the reviewed pages outside that region
- **AND** a render that changes anything outside the region retires the review

#### Scenario: Inventory omission blocks readiness

- **WHEN** a validated verdict records a material inventory entry that the draft does not cover and that has no justified omission
- **THEN** the omission is a blocking finding and the draft does not become ready
- **AND** the finding names its deficient subject and reopens that artifact under REQ-polaris-generation-006

#### Scenario: Waiting session started before its packet

- **WHEN** the operator starts a review session, from the command Syzygy printed at the start of the run, before any packet of its kind exists
- **THEN** the session's one Syzygy command waits, reading only the local file system, for at most a bounded time never past the run's deadline, and then tells the session to run it again
- **AND** neither Syzygy nor the authoring session starts, resumes or signals the session

#### Scenario: Packet delivered to a waiting session

- **WHEN** a review is due and a session of its kind is waiting
- **THEN** Syzygy checks the gates and the per-project provider statement for the waiting session's declared agent tool, writes the packet and its digest into that session's directory as the next round, and records the delivery
- **AND** the waiting command re-hashes the delivered packet against the digest Syzygy recorded before the session reads it, and refuses on a mismatch

#### Scenario: Printed pre-approval for a waiting session

- **WHEN** Syzygy prints the start commands for waiting sessions
- **THEN** each command pre-approves only read tools over its session directory (and, for the inventory session, the clone) and its one Syzygy command, and never a write, or, where the agent tool offers no rules that narrow, pre-approves nothing and says so
- **AND** the session hands its inventory or verdict to that command, which Syzygy writes under the role's own file name in that directory, and no waiting session's prompt carries the execution permission

#### Scenario: Continuing reviewer disclosed

- **WHEN** a counted verdict was written by a session that had received an earlier round of its kind, or declares the session identifier of an earlier verdict of its kind
- **THEN** the review page discloses that its reviewer continued across revisions and has seen its own earlier verdict, labelled Inferred
- **AND** for a counted verdict with neither, the review page says so, labelled Inferred

Form: lifecycle transition.

- **Case:** Run the review step against controlled frozen drafts, inventories and verdict files, varying the packet digest, the stored frozen subject, the declared session identifiers and launch forms, verdict completeness, quotation validity and finding severity independently; and with sessions started to wait before their input exists, varying the delivered bytes and the recorded digests, the time waited against the run's deadline, the waiting session's agent tool and provider statement, and the rounds delivered to each session.
- **Observable:** The emitted packets and their digests, the recorded verdicts and inventories, validation outcomes, refusals, readiness state and the review page's disclosures; the printed start commands, the delivery records and the waiting command's outcomes.
- **Oracle:** Expected packet contents, validation outcomes and readiness derived from the controlled inputs outside the generator; the packet compared byte for byte against an independently assembled expected packet.
- **Oracle independence:** Expected outcomes are fixed before the step runs; the verdict and inventory fixtures are written outside the code under test.
- **Falsifier:** A packet carries an authoring exchange, transcript or read account, or omits a span the inventory cites; the reviewer's reading of the emitted packet is shown as Observed; a change outside the review-status region leaves a design review counted; a stale, self-reviewed, incomplete or inconsistent verdict counts; an inventory declared under the authoring session's identifier, or an inventory or verdict declaring a headless or other launch by the authoring session, is accepted; independence or inventory completeness is shown as Observed or verified; a revision or an altered stored subject leaves an old verdict in force; a waiting session reads delivered input that was not re-hashed, or that does not match the recorded digest; a wait passes the run's deadline or makes a network request; Syzygy or the authoring session starts, resumes or signals a waiting session; a printed start command pre-approves a write or a general shell; a printed start command for an agent tool that can limit its own tools leaves a waiting session any tool beyond its read tools and that shell; a shell-escape launch form is accepted for a waiting session; Syzygy writes a session's handed-over content anywhere but the role's own file in that session's directory; a printed instruction passes handed-over content so that the shell may expand it; a broader pre-approval is printed where the agent tool offers no rules that narrow; a waiting session's prompt carries the execution permission; a delivery changes the declared agent tool, version or model, or is made without the waiting session's provider statement in force; a counted verdict of a continuing reviewer is not disclosed as such, or a reviewer's continuity is shown as Observed.

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-2, VIS-3]
  contracts: [RFC7-9, RFC7-13, RFC7-25]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08]
  topology: []
  parent_requirements: [REQ-polaris-generation-006, REQ-polaris-generation-033, REQ-polaris-generation-034]
```

### Requirement: Self-reported discovery and in-session clarification

In the operator-agent mode the discovery account that REQ-polaris-generation-030 requires SHALL consist of two populations, kept distinct in human and machine form. The first is the agent's account of what it inspected and selected, with its reasons for material it excluded, could not resolve or deferred, and its stopping reason; Syzygy SHALL record and render it as self-reported and labelled Inferred, and SHALL NOT present it as complete, as verified, or as Observed. Syzygy SHALL report as findings the self-reported paths that name no blob at the pinned revision; a path that does exist does not make the account Observed. The second population is the set of Git objects that the render itself reads and verifies, each with its path, object identifier, pinned revision and classification and screening outcome, labelled Observed; which objects Syzygy read in earlier steps comes from a stored record and, where shown, is labelled Inferred. Syzygy SHALL NOT derive an Observed not-read figure or an Observed coverage claim from the agent's account. REQ-polaris-generation-030's obligations on scope, supported profile, stopping reason, partial findings and narrower scopes apply to the agent's account as self-reported content.

The consequential questions of REQ-polaris-generation-031 SHALL be asked of the human operator within the agent session. The draft SHALL record each question with the evidence considered, the consequence for the draft, the interpretations offered, and the operator's answer as free text, a selected interpretation, leave-unknown or defer, attributed to the operator. Because Syzygy does not observe the exchange, the record SHALL be labelled as the agent's report of it. The number of questions SHALL NOT exceed the declared clarification-question limit of REQ-polaris-generation-033. Every other obligation of REQ-polaris-generation-031 is unchanged: an answer does not prove implementation behavior or adopt intent, unchanged questions reuse prior answers, a purpose left unknown stays unknown, and answer changes invalidate dependent content and reviews.

For a run in the operator-agent mode this requirement displaces or reads exactly this predecessor text: in REQ-polaris-generation-030, the item "inspected and selected material" in the list the generator "SHALL expose" before claiming source coverage, read there as an account the generator itself produced, which becomes the two populations above; the sentence "The generator SHALL perform question-directed, bounded discovery for a selected project only after the applicable metadata-only start preparation, work/admission gates and effect permissions; investigation SHALL NOT read sources to authorize itself.", read as binding Syzygy, whose start gates of REQ-polaris-generation-033 all pass before it issues the brief or reads any object for a check, while the agent's own exploration of the clone, before or after the brief, is the operator's own act under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05` and is disclosed as such; the sentence "Body, code, history and other content reads SHALL remain individually covered by applicable consent and classification; no shell or observed-project execution is implied.", read as binding every read Syzygy makes, each of which is covered by the observation consent and classified and screened, while the agent's reads are the operator's own act, unclassified and disclosed as such, and the agent's building or running of the observed project is governed by the execution rule of REQ-polaris-generation-033, never implied by discovery; and in REQ-polaris-generation-031, "owner" as the person asked, which becomes the human operator of the run, whose answers are attributed to the operator. Every other sentence and scenario of REQ-polaris-generation-030 and 031 is unchanged.

ID: REQ-polaris-generation-036
Source: VIS-2; governing warrants below.
Scope: v1-mandatory

#### Scenario: Two read populations shown apart

- **WHEN** an operator-agent run is rendered
- **THEN** the discovery account shows the agent's self-reported inspected and selected material labelled Inferred, and the objects the render read and verified, with object identifiers and screening outcomes, labelled Observed
- **AND** no figure on the page merges the two populations

#### Scenario: Self-reported path absent at the pinned revision

- **WHEN** the agent's account names a path that is not a blob at the pinned revision
- **THEN** Syzygy reports a finding for that path
- **AND** the remaining account stays labelled Inferred, not upgraded by the paths that exist

#### Scenario: No Observed not-read claim

- **WHEN** the agent's account omits part of the repository
- **THEN** no surface states as Observed that the omitted part was not read
- **AND** any not-read statement is shown as part of the agent's self-report

#### Scenario: Syzygy's reads wait for its start gates

- **WHEN** the observation consent, a policy act or, for a governed subject, the per-project statement is absent when the operator asks for a brief or a check
- **THEN** Syzygy issues no brief and reads no object for a check
- **AND** the page states that any exploration the agent made of the clone was the operator's own act and was not classified by Syzygy

#### Scenario: Consequential question asked in-session

- **WHEN** the agent cannot establish the subject's purpose or another consequential premise from the clone
- **THEN** it asks the operator in-session and the draft records the question, the evidence, the consequence, the options and the operator's answer, attributed to the operator and labelled as the agent's report
- **AND** an answer neither proves implementation behavior nor adopts intent

#### Scenario: Question limit reached

- **WHEN** the declared clarification-question limit is reached with optional uncertainties remaining
- **THEN** the remaining questions are recorded as unasked and their facts stay explicit as unresolved in the affected reading
- **AND** a draft whose clarification record exceeds the limit fails the check

Form: event-response.

- **Case:** Submit controlled drafts whose discovery accounts and clarification records vary in existing and absent paths, omissions, answers, deferrals and question counts, against a fixture repository at a pinned commit, and request briefs and checks with each start gate absent in turn.
- **Observable:** The rendered discovery account, its two populations and their labels, the findings, the refusals and the objects read before them, the clarification records and their attributions, and the human and machine outputs.
- **Oracle:** Expected labels, findings, refusals and populations derived from the fixture and the controlled drafts outside the generator; Syzygy's object reads captured independently of its own record.
- **Oracle independence:** Expected outcomes are fixed before the run; the self-reported accounts are fixture inputs, never expected truth.
- **Falsifier:** The agent's account is labelled Observed or presented as complete; the two populations are merged; an Observed not-read or coverage figure is derived from the self-report; objects read in earlier steps are shown as Observed; Syzygy reads an object for a check before its start gates pass; the agent's reads are presented as classified by Syzygy; a clarification answer adopts intent; the question limit is exceeded without a finding.

```yaml
warrants:
  primary: VIS-2
  doctrine: [SEC-2, SEC-3, VIS-1, VIS-2, VIS-4]
  contracts: [RFC2-24, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-030, REQ-polaris-generation-031, REQ-polaris-generation-033]
```
