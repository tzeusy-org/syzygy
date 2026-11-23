# Polaris dossier motivation bases and external comparisons

Candidate addition to the existing polaris-generation capability. The
November 3 split covers these two requirements for an already admitted
operator-agent run. REQ-038 retains the existing pinned-tree citation
boundary. REQ-039 carries the 10b refusal and the design for a conditional
external report. The two requirements have independent predicates.

## ADDED Requirements

### Requirement: Reconstructed motivations, trade-offs and position

In an operator-agent run admitted under its existing rules, including a Redis run, every definite project claim block that states why the subject is built as it is (a motivation), what it gives up for what it gains (a trade-off), what it offers over alternatives (an advantage), or where it stands among alternatives (a position) SHALL declare exactly one basis, `maintainer-stated` or `reconstructed`. The agent marks the kind and the basis; Syzygy's mechanical checks see only the marking, and the fidelity review, below, classifies every Inferred block whether or not it is marked. An Unknown statement that discloses missing motivation or evidence makes no definite project claim.

A `maintainer-stated` block SHALL carry at least one quotation, verified under REQ-polaris-generation-034, from a maintainer source. A source at the pinned revision is a maintainer source unless it lies in the third-party path class below, or carries a generated-file marker of the run's frozen profile where one is recorded (REQ-polaris-generation-032 (a)). The third-party path class holds, in the pinned tree: (i) every path with a directory segment, at any depth, that after case folding equals `vendor`, `vendored`, `third_party`, `third-party`, `thirdparty`, `3rdparty`, `deps`, `external`, `extern` or `node_modules`; (ii) the path of every submodule entry; (iii) every path that a `.gitattributes` file at the pinned revision marks with the attribute `linguist-vendored`; and (iv) every path named by a third-party rule of the run's frozen profile, where an applicable profile fixed and recorded before discovery already supplies one. Every path outside the class is outside it: source code and its comments, tests, and every source that REQ-polaris-generation-032 counts as authored documentation or manifest and that lies outside the class remain maintainer sources, so this rule withdraws no maintainer-stated advantage except one quoted from third-party text. The class is a heuristic: that a path inside it is third-party, and that a path outside it is the maintainers' own, are both Inferred, and the quotation's label SHALL say so. Text in the third-party class is not maintainer-stated; it MAY serve as a premise of a reconstructed block. Whether the quoted span is maintainer text and whether it states that motivation, trade-off, advantage or position are checked by the fidelity review, never by Syzygy.

A `reconstructed` block SHALL cite its premises and carry an evidence trail. Each premise is a citation that REQ-polaris-generation-034 checks: a repository path and line range at the pinned revision (code structure, tests, design comments, documentation, third-party text). The trail states, in the agent's words, the step from the premises to the claim. Syzygy SHALL render a reconstructed block Inferred, with a marker in human and machine form stating that it is reconstructed from the repository and is not the authors' stated intent, and with its trail and premises one step away. A reconstructed block SHALL NOT state an advantage over, or a position relative to, a named other project unless a verified maintainer-stated quotation names it. No block, of any kind or basis, marked or unmarked, SHALL be written in the first person as the authors, SHALL attribute an intention, wish or decision to the authors as their statement unless it is a maintainer-stated block whose quotation states it, or SHALL place quotation marks around text that is not a verified quotation. A motive about persons, organisations or their circumstances, rather than about the design, without a maintainer-stated basis SHALL remain absent or Unknown.

Where a maintainer-stated block and a reconstructed block address the same point and disagree, both SHALL render, the disagreement SHALL enter the understanding record's contradictory accounts, and the reconstruction SHALL NOT displace the statement. Under ruling 10b of the owner direction `REDIS-LOCAL-AGENT-SITTING-2026-10-07`, an advantage is maintainer-stated only: a block of the advantage kind with a `reconstructed` basis fails the check while that ruling stands unreversed, established from the record of the owner's act or direction (RFC3-16).

Syzygy SHALL report as repair findings: a marked block of the four kinds without exactly one basis; a maintainer-stated block without a verified quotation from a maintainer source as defined above; a reconstructed block with no premise, an unverifiable premise, no trail, or a named comparison the rules above forbid; and a commit-message citation outside the pinned-tree citation scope. The fidelity verdict (REQ-polaris-generation-035) SHALL classify every Inferred block of the draft, marked or not, as stating or not stating a motivation, trade-off, advantage or position. A block it classifies as one of the four kinds that carries no basis, or a block that attributes an intention to the authors without a maintainer-stated quotation that states it, is a blocking finding whose deficient subject is the marking. For every block of the four kinds the verdict SHALL also record whether a maintainer-stated quotation is maintainer text and states what the block claims, or whether a reconstructed block's trail supports it from its premises; an unsupported block is a blocking finding whose deficient subject is the argument.

For an operator-agent run this requirement reads exactly this predecessor text: in REQ-polaris-generation-032, the sentence "A source counts as maintainer-written and not generated only when it lies under a path class the frozen profile declares as authored documentation or manifest, and carries none of the generated-file markers the frozen profile lists (a generated-file header, a build-output location or a code-extraction marker); a source the frozen profile cannot place on either side is not a declaration source and is reported as a source the profile did not cover" as governing, unchanged, which sources are declaration sources for the catalog, and not which sources are maintainer sources for this requirement, which the rule above decides; and the sentence "The frozen profile, its declaration forms and its path and marker rules SHALL be fixed by the operator, the owner or the evaluation harness outside the producer that drafts the catalog, and recorded before discovery began" as also covering the profile's optional third-party rule (iv), which is fixed and recorded in the same way. A run that records no frozen profile, a governed run included, applies (i) to (iii) only and makes no claim based on a profile-specific generated-file marker. In REQ-polaris-generation-034, the reader topic "maintainer-stated advantages and trade-offs", read as maintainer-stated advantages together with motivations, trade-offs and position, each maintainer-stated or reconstructed under this requirement, and the citation rule "every Inferred block SHALL cite at least one source as a repository path and an inclusive line range at the pinned revision", which remains a repository path and an inclusive line range at the pinned revision; in REQ-polaris-generation-035, the verdict's contents, which gain the classification and findings above; and in REQ-polaris-generation-002, "Motives, history, definitions and relationships without sufficient source premises SHALL remain absent or Unknown", where the sufficient premises of a reconstructed motive are its checked premises together with a counted fidelity verdict that its trail supports it. For Redis's runs, this narrows how ruling 10b and REQ-polaris-generation-034's "maintainer-stated advantages and trade-offs" apply: Redis's motivations and trade-offs may be reconstructed under this requirement, while its advantages stay governed by ruling 10b. Every other sentence and scenario of REQ-polaris-generation-002, 004, 034 and 035 is unchanged, including "an Inferred label alone SHALL NOT make speculation eligible" and the rule that generated prose SHALL NOT impersonate an author.

ID: REQ-polaris-generation-038
Source: VIS-2; governing warrants below.
Scope: v1-mandatory

#### Scenario: Maintainer text anchors the motivation

- **WHEN** a source comment under `src/`, or a design note, at the pinned revision, outside the third-party path class and carrying no generated-file marker, states why a mechanism exists, and the draft quotes it under a maintainer-stated block
- **THEN** the block renders with the verified quotation as its Observed anchor, the claim Inferred, and the quotation's maintainer authorship labelled Inferred from its location
- **AND** the fidelity verdict records that the span is maintainer text and states the motivation

#### Scenario: Bundled dependency text is not maintainer-stated

- **WHEN** the pinned tree holds a root `README.md` and a `deps/<library>/README`, each stating an advantage of its own code, and the draft quotes each under a maintainer-stated advantage block
- **THEN** the block quoting the root `README.md` passes, and Syzygy reports a repair finding for the block quoting `deps/<library>/README`, because that path lies in the third-party path class
- **AND** the `deps/` text cited as a premise of a reconstructed block of another kind passes the check, and both quotations' authorship labels say Inferred

#### Scenario: Motivation reconstructed from code and tests

- **WHEN** no maintainer text states why a mechanism exists, and the draft carries a reconstructed block citing the code paths and tests it rests on, with a trail
- **THEN** the block renders Inferred with the marker that it is reconstructed and is not the authors' stated intent, and its trail and premises one step away
- **AND** no surface presents it as the authors' statement or as Observed

#### Scenario: Unmarked motivation

- **WHEN** an Inferred block that the agent did not mark as one of the four kinds states that the authors chose a design to avoid a cost
- **THEN** the fidelity verdict classifies it as a motivation without a basis and records a blocking finding whose deficient subject is the marking
- **AND** the draft does not become ready until a revision marks it with a basis that passes the check and the review

#### Scenario: Missing motivation disclosed as Unknown

- **WHEN** a draft says that the motivation is Unknown and names the missing evidence, without stating a motive
- **THEN** the disclosure retains its Unknown reason without a missing-basis finding
- **AND** relabelling a definite unsupported motivation Unknown does not make it eligible

#### Scenario: Reconstruction without premises or trail

- **WHEN** a reconstructed block cites no premise, cites a path absent at the pinned revision, or carries no trail
- **THEN** Syzygy reports a repair finding naming the block and what is missing
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Statement and reconstruction disagree

- **WHEN** a maintainer-stated block and a reconstructed block about the same design point disagree
- **THEN** both render, and the understanding record lists the disagreement among its contradictory accounts
- **AND** the reconstruction does not replace or soften the maintainers' statement

#### Scenario: Reconstructed advantage while ruling 10b stands

- **WHEN** ruling 10b is in force unreversed and a draft block of the advantage kind has a reconstructed basis, or a reconstructed block claims an advantage over a named other project that no verified maintainer-stated quotation names
- **THEN** Syzygy reports a repair finding for that block
- **AND** a maintainer-stated advantage with a verified quotation passes

#### Scenario: Motive about people stays Unknown

- **WHEN** a block attributes a motive to the authors' circumstances, employer or commercial aims and has no maintainer-stated basis
- **THEN** the fidelity verdict records a blocking finding and the claim renders absent or Unknown
- **AND** an Inferred label alone does not make it eligible

#### Scenario: Commit-message premise outside pinned-tree scope

- **WHEN** a reconstructed block presents even the pinned commit's own commit-message lines as a quotation or premise
- **THEN** Syzygy reports a repair finding for that citation
- **AND** Syzygy reads no commit-message text for the block and the draft does not proceed to review

#### Scenario: Prior verdict after the trail changes

- **WHEN** the premises or trail change after an independent verdict on a previous draft revision
- **THEN** the earlier verdict does not count for the changed draft
- **AND** readiness waits for a verdict bound to the current review packet under REQ-polaris-generation-035

#### Scenario: Unsupported trail blocks readiness

- **WHEN** a validated fidelity verdict records that a reconstructed block's trail does not support its claim from its premises
- **THEN** the finding is blocking and the draft does not become ready
- **AND** the finding names the argument as its deficient subject

Form: event-response.

- **Case:** Submit controlled drafts against a fixture repository at a pinned commit, varying each block's kind, marking, basis, quotations and their paths (source code, authored documentation, generated, each arm of the third-party path class, with and without a recorded frozen profile), premises, trail, named comparisons and commit-message citations, with only the pinned tree admitted, a missing-evidence disclosure, ruling 10b reversed and not, and current or stale fidelity verdicts that classify, support and do not support each block, marked and unmarked.
- **Observable:** The repair findings, the rendered blocks with their labels, markers, trails and anchors in human and machine form, the understanding record, the verdict validation and the readiness state.
- **Oracle:** Expected findings, labels, markers and readiness fixed in the fixture before the run, from the fixture blobs read by an independent Git implementation.
- **Oracle independence:** The drafts and verdicts are fixture inputs written outside the code under test; the expected outcomes are not derived from the checker's output.
- **Falsifier:** A reconstructed block renders without its marker, trail or premises, or as Observed or as the authors' statement; a marked block of the four kinds passes without exactly one basis; an unmarked block the verdict classifies as one of the four kinds leaves the draft ready; any block attributes an intention to the authors without a maintainer-stated quotation that states it and the draft becomes ready; a maintainer-stated block passes on a source in the third-party path class or a generated source, a maintainer-stated block fails on a source outside the class that carries no generated-file marker, or a quotation's maintainer authorship is shown as Observed; a reconstructed advantage passes while ruling 10b stands unreversed; a motive about people renders as a claim without a maintainer-stated basis; a commit-message citation passes; a disagreement between statement and reconstruction is hidden; a correctly qualified Unknown disclosure receives a missing-basis finding; or a draft becomes ready with an unsupported reconstruction or a stale verdict.

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-24, RFC7-2, RFC7-10, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [REDIS-LOCAL-AGENT-SITTING-2026-10-07]
  topology: []
  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-004, REQ-polaris-generation-032, REQ-polaris-generation-033, REQ-polaris-generation-034, REQ-polaris-generation-035]
```

### Requirement: External comparisons as the agent's unverified report

This proposed requirement applies only to an already admitted operator-agent run. A future, separately recorded reversal of ruling 10b of the owner direction `REDIS-LOCAL-AGENT-SITTING-2026-10-07` is required before any external-comparison block can pass. Syzygy establishes whether the reversal is in force from its governing record (RFC3-16). While no reversal is in force, including after withdrawal or when the record cannot establish it, a draft block marked as resting on an external source SHALL fail the check as a repair finding and advantages remain maintainer-stated only. A fidelity verdict that finds an unmarked block resting on an external source records a blocking finding.

While the reversal is in force, a draft MAY carry external-comparison blocks: claims about the subject relative to named other projects that rest on sources outside the clone, such as web pages, papers or other repositories, that the agent reports having read. Syzygy SHALL NOT fetch, read or verify any external source, and SHALL NOT render any external text as a quotation. Each external-comparison block SHALL be labelled Inferred, SHALL carry a marker in human and machine form stating that it is the agent's unverified report of external sources, and SHALL list each source as the agent reports it (a title, an address and the date the agent reports reading it) as presentation labels under SEC-5, never as an anchor, an evidence identifier or a source page. These blocks SHALL render together in one section of the dossier, apart from the claims anchored in the clone, and SHALL NOT appear in the opening or the concise account or discharge any reading-depth obligation of REQ-polaris-generation-004. The fidelity verdict SHALL record each such block as unverifiable from its packet and SHALL NOT count it as supported. The run record and the section SHALL disclose that the agent's reads of external sources, and any transmission they involved, were the operator's own act, outside Syzygy's consent records and not observed by Syzygy.

ID: REQ-polaris-generation-039
Source: VIS-2; governing warrants below.
Scope: v1-mandatory refusal while ruling 10b stands. Presentation is conditional on a separate recorded reversal.

#### Scenario: External comparison while 10b is reversed

- **WHEN** the owner's reversal of ruling 10b is in force and a draft block, marked as resting on an external source, compares the subject with a named other project, citing a web page the agent reports reading
- **THEN** the block renders Inferred in the external-comparison section with the unverified-report marker and the source as a label
- **AND** no anchor, source page or Observed quotation is rendered for the external source, and Syzygy made no request for it

#### Scenario: External comparison while 10b stands

- **WHEN** a draft block is marked as resting on a source outside the clone and a reversal of ruling 10b is absent, withdrawn or unverifiable
- **THEN** Syzygy reports a repair finding for that block
- **AND** the draft does not proceed to review until a resubmitted revision passes

#### Scenario: Unmarked external source

- **WHEN** a block rests on a source outside the clone but the agent did not mark it so
- **THEN** Syzygy's check does not detect it, and the fidelity verdict records a blocking finding
- **AND** the draft does not become ready

#### Scenario: External comparison kept out of the primary reading

- **WHEN** a draft places an external-comparison block in the opening or the concise account, or presents it as a maintainer-stated advantage
- **THEN** Syzygy reports a repair finding
- **AND** the reading-depth obligations are judged without that block

Form: event-response.

- **Case:** Submit controlled drafts with and without external-comparison blocks, marked and unmarked, placed in and out of their section, with the owner's reversal of ruling 10b in force, absent, withdrawn and unverifiable, and capture Syzygy's network activity independently.
- **Observable:** The repair findings, the rendered section, labels, markers and source labels, the verdict records, captured network effects and the disclosures.
- **Oracle:** Expected findings and renderings fixed in the fixture before the run; network effects from an independent capture.
- **Oracle independence:** Drafts, rulings and expected outcomes are fixture inputs written outside the code under test.
- **Falsifier:** A marked external-comparison block passes while 10b stands; an unmarked one leaves the draft ready after a counted fidelity verdict; Syzygy requests an external source; an external source renders as an anchor, a source page, a quotation or Observed; a block appears in the opening or concise account or discharges a reading-depth obligation; a verdict counts an external block as supported; or the operator's-own-act disclosure is absent.

```yaml
warrants:
  primary: VIS-2
  doctrine: [SEC-2, VIS-1, VIS-2, VIS-4]
  contracts: [RFC3-16, RFC7-10, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [REDIS-LOCAL-AGENT-SITTING-2026-10-07]
  topology: []
  parent_requirements: [REQ-polaris-generation-004, REQ-polaris-generation-034, REQ-polaris-generation-035, REQ-polaris-generation-038]
```
