# Polaris generation amendment for edit and repair accounting

> **Candidate.** Proposed replacement for REQ-polaris-generation-006. The
> current project-understanding amendment remains in force. An agent
> adoption and versioned specification composition are required before
> this proposed replacement can bind.

## MODIFIED Requirements

### Requirement: Independent review and repair

A draft SHALL become ready for owner review only after independent fidelity and rendered-design reviews confirm the frozen bundle and all blocking findings have dispositions verified against that same bundle. Fidelity review SHALL use an independently prepared, frozen inventory of material source claims, qualifications, conflicts and trade-offs, covering the entire admitted source population. The fidelity reviewer SHALL verify inventory accuracy and completeness against the owning admitted sources rather than trusting preparation output. It SHALL record both inventory-to-draft coverage and draft-to-source support, including justified omissions; unresolved material omissions SHALL prevent readiness. The candidate-authoring stage SHALL NOT define or narrow its own review denominator. The bounded workflow SHALL prepare or validate the independent inventory and questions from admitted sources, accounting for those calls in its run budget; it SHALL NOT require the owner to hand-author project-specific editorial preparation before starting. Reviewers SHALL receive the artifact, governing references and acceptance criteria without the authoring conversation. A revision SHALL retire dependent review evidence. Every candidate that changes the reading order, section set, anchor targets or manifesto/thesis, and every target-changed block, SHALL receive the fresh-reader review required by RFC7-25 before becoming ready; failed review remains recorded and visible. The generator SHALL not classify its own wording change as immaterial. Findings SHALL identify the deficient subject as discovery, understanding, clarification, argument, prose, asset or rendering. Research or inventory findings SHALL reopen the deficient artifact for repair and independent source review, invalidating dependent plans, drafts, assets and reviews. Editing prose against an unchanged defective inventory SHALL NOT close an inventory finding. The original finding, repair, dispositions and input/output identities SHALL remain traceable. Further acquisition SHALL use its required new admitted input identity and consume remaining original bounds or a separately authorized new run; repair SHALL NOT broaden permission, erase spent usage or replay an uncertain effect.

Every generator edit or repair stage SHALL account for each block in its own
input draft exactly once with an action and a reason. A retained block is
kept or rewritten. An input identity that is absent from the output SHALL
be accounted for as removed or as split into two or more distinct blocks
present in the output and identified in its account. A repair stage SHALL
give each finding it received a disposition, including findings it cannot
repair. An unrepairable finding remains visible and retains its effect on
readiness under this requirement.

ID: REQ-polaris-generation-006
Source: VIS-3; governing warrants below.
Scope: v1-mandatory


#### Scenario: Meaningful rendered review

- **WHEN** the draft is reviewed after rendering
- **THEN** the retained review assesses its argument, capability explanation, visual hierarchy, navigation and source fidelity using actual artifacts
- **AND** heading presence, anchor counts or accessibility results alone do not establish confirmation

#### Scenario: Revision after confirmation

- **WHEN** any reviewed block, anchor set, reading order or asset is changed
- **THEN** the affected confirmation is retired and readiness identifies the remaining review
- **AND** the old raw review remains preserved against its original subject

#### Scenario: Source trade-off omitted entirely

- **WHEN** all generated claims have anchors but an independently inventoried material trade-off is absent from the account
- **THEN** source-to-draft coverage records the omission as a blocking finding
- **AND** an author-generated outline or claim list cannot replace the independent source inventory

#### Scenario: Omitted material qualification

- **WHEN** independent source review finds a material admitted qualification that
  both inventory and draft omitted
- **THEN** the inventory is repaired and re-reviewed against the source population;
  dependent argument, draft and asset reviews become stale
- **AND** the finding remains open if only its wording is inserted into a paragraph
  while the source-understanding defect and affected artifacts remain unchanged.

#### Scenario: New evidence outside the current budget or authority

- **WHEN** a finding requires acquisition the existing permission or remaining
  budget cannot support
- **THEN** the run records the unresolved dependency and affected readiness
- **AND** no repair loop expands access, erases spent usage or disguises a new run
  as a resumed old one.

#### Scenario: Edit or repair drops a prior block without account

- **WHEN** an edit or repair stage returns a draft whose blocks omit one or
  more identities present in that stage's own input draft
- **THEN** the output is invalid if any omitted identity lacks an account
  with a reason for removal or a split into identified output blocks
- **AND** the same check refuses an absent input identity accounted for as
  kept or rewritten, or a split whose identified blocks are missing from
  the output
- **AND** an unchanged repair output that accounts for every input block as
  kept and every supplied finding as unrepairable is valid as a repair
  output, with the unrepaired findings and unchanged draft recorded

Form: lifecycle transition.

- **Case:** Run the named scenarios using controlled input snapshots, provider outcomes and lifecycle events.
- **Observable:** Inspect human/machine state, recorded artifacts and independently captured dispatch/write effects.
- **Oracle:** Compare each scenario's observations with its explicit required outcomes; missing evidence is unproven. Where a requirement calls for human review, verify the bound review record and verdict, not an automated claim of understanding.
- **Oracle independence:** Expected outcomes, source facts and injected events are defined outside the generator under test.
- **Falsifier:** A prohibited effect occurs, a required disclosure is absent, or a state advances without its required evidence.

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-3]
  contracts: [RFC7-9, RFC7-13, RFC7-25]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: []
  topology: []
  parent_requirements: []
```
