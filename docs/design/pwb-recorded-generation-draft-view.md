# Recorded generation draft view

[Inferred] Proposed later-route amendment for syzygy-dov.7.2 under CC-REV-2. The change class is behavioral. The member's fields, relationship to recorded evidence and dedicated response ceiling need independent review and adoption. The current route remains unserved. This packet implements no endpoint, registers no ceiling, adds no run writer and allocates no version.

## Effective predecessor

[Observed] The protected subject is `a9fe89c0d20dab58de29483d1a3c7a717b79fb6e`. The [effective PWB-REQ-020](../../openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md#requirement-pwb-req-020--project-wide-facts-remain-identical-across-human-and-machine-views) contains the following exact member and adjacent ceiling rule. The full specification SHA-256 is `44f4ad77e62525595be5839883ac491d26bdd6859f353f91edc1d48903011ed2` and this excerpt including its terminal LF is `864543163201c8442fd833dd1cc625dbe102db6cd11a37b5197c6b684d6e4a23`.

```text
- **Generated editorial draft view.** A **generated editorial draft view**
  composes only the recorded bytes of one identified generation run over
  sources that run was already admitted to read, mints no project fact, writes
  nothing, sends no source or draft byte outside the observing project, and is
  served only to machine-credentialed clients in every mount form.
  - It carries no project-shape identity, statement, source anchor, coverage
    state, denominator or contradiction, and so contributes to neither
    multiset compared below.
  - The member of this category is the generation draft view,
    `GET /polaris/draft/<runId>`.

- **Membership.** A member served under a byte ceiling of its own SHALL NOT be
  served before the adapter-registry entry's resource envelope declares that
  ceiling.
```

[Observed] The [machine-view act](../../.syzygy/governance/decisions/PWB-MACHINE-VIEW-AMENDMENT-ACT.md#what-this-act-does-not-authorize) reserves the record fields and exact-source relationship to a later route amendment. The [signed implementation direction](../../.syzygy/governance/decisions/OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-20.md) at lines 367–379 requires this amendment and any required registry ceiling before a lane can proceed. This proposal takes the later amendment path. Under [VIS-4](../../.syzygy/governance/doctrine/vision.md), an agent can adopt the specification and bounded registry amendment. Exposure, deployment and any weakening of SEC-5 remain owner decisions.

## Proposed PWB-REQ-020 text

[Inferred] Insert the following only after the existing editorial member and before Membership. Preserve every current paragraph, other route, and the complete human and machine parity multiset.

```text
  - The generation draft member SHALL serve a closed UTF-8 JSON editorial text
    projection. Its fields SHALL be `format` (value
    `polaris-recorded-generation-draft/1`), `state` (value `editorial-draft`),
    `runId` (the selected opaque `run-<32 lower-case hex>`), `draftSha256`
    (the exact recorded draft artifact's lower-case hexadecimal SHA-256),
    and `text`. Each member of
    `text` SHALL contain exactly `kind` and `text`. The ordered kinds SHALL be
    `title`, `introduction`, then each eligible recorded section in order
    as its `section-title`, each `paragraph` and its immediate
    `child-paragraph` lines in their original order. A section SHALL be
    eligible only when its validated disposition is `produced`. The view
    SHALL omit the complete heading and body of an `omitted` or
    `unresolved` section, use neither its source references nor its reasons
    as eligible input, and refuse if no produced section remains. It SHALL
    refuse an invalid or unavailable disposition. All selected strings SHALL
    copy the respective recorded field verbatim. Outside these five fields
    and their prescribed row members there SHALL be no metadata. The view SHALL supply no heading,
    paragraph or source identifier, path or anchor field, link target,
    quotation carrier, HTML, provider receipt, budget or raw run data. A
    string copied from the editorial artifact SHALL remain inert JSON text.
    It SHALL NOT be interpreted as an anchor, file selector or HTML. The
    member SHALL NOT separately include any source excerpt bytes.
  - Before selecting any text the member SHALL independently verify that the
    selected immutable final draft bytes, the run's terminal
    `awaiting-rendered-review` result and its recorded source-admission
    binding describe this exact run, project, revision and artifact digest.
    A completed stage alone is insufficient. Every selected paragraph's
    recorded source references SHALL resolve uniquely within that run's
    admitted source set. Forbidden, unresolved, ambiguous, cross-run,
    unclassified or withheld
    source dependencies SHALL refuse the projection. Editorial headings SHALL
    bind to the same verified draft. Eligibility SHALL use only the recorded
    authoritative admission and draft bytes, with the applicable existing
    screening policy. The route SHALL open no source object. It SHALL NOT
    reconstruct or serve an exact-source anchor. It SHALL refuse a changed,
    missing, legacy-unbound or unsupported artifact, a selected paragraph with
    a retained unresolved quotation finding, or a projection whose declared
    screening policy cannot be established or applied. The final selected
    text and complete composed response SHALL pass the existing SEC-5
    boundary before any body is sent, with no detector weakening.
  - This view SHALL use only its own declared `maxGenerationDraftResponseBytes`
    registry ceiling of 65,536 bytes, applied inclusively to the final encoded
    UTF-8 JSON body. Missing, invalid or mismatched registry binding SHALL
    leave the member unservable. After machine authorization, a failed
    record, admission or screening check SHALL return status 503 with exactly
    `format: "polaris-recorded-generation-draft-refusal/1"`,
    `served: "nothing"` and `reason: "draft-record-unavailable"`. A body
    past the ceiling SHALL return status 503 with the same format and served
    value and `reason: "draft-response-limit-breached"`. The bounded refusal
    is an editorial route outcome. It SHALL carry no partial draft, source,
    private metadata, evaluation identity or project-shape populations. It
    SHALL NOT record an evaluation response breach or change project-shape
    readiness. The same observing project and existing machine credential
    SHALL bind admission in every served mount
    form. The view adds no alternative HTML, human-open, cross-project, write
    or provider path.
```

## Evaluation ceiling and registry changes

[Observed] Effective PWB-REQ-006 lines 841–849 and 886–893 read as follows. These are the only existing companion PWB-REQ-006 spans a later adoption would modify. The independent editorial scenario below is the sole addition to the scenario population. PWB-REQ-021 lines 2402–2409 require readiness false after a PWB-REQ-006 resource breach. Its exact words need no change. The three bound evaluation responses each retain their existing ceiling and readiness effect.

```text
- **Ceilings and breaches.** Final encoded human HTML and machine JSON SHALL
  each have an explicit byte ceiling.
  - A source or input breach SHALL keep the complete source population counted
    and every dependent fact Unknown.
  - A final-output breach SHALL return only a bounded typed failure envelope
    carrying evaluation identity, limit identity, declared value, observed
    value and population counts; it SHALL NOT truncate or emit a
    success-shaped model.
  - Every breach SHALL make PWB-REQ-021 readiness false.

#### Scenario: Resource breach is bounded and explicit

- **WHEN** any evaluation-wide input, deterministic parse-work or final-output
  ceiling is exceeded
- **THEN** the evaluation names the exact limit and counts the affected
  population as Unknown without emitting a partial success-shaped answer
- **AND** human and machine responses stay within their own declared encoded-
  byte ceilings and cold-open readiness is false
```

[Inferred] Replace those two spans at their separate positions and insert the independent editorial scenario immediately after the existing resource-breach scenario. Readiness exclusion applies only to the new recorded-generation route. It leaves the existing source, input, parse-work, human, full machine and briefing cases in force.

```text
- **Ceilings and breaches.** Final encoded human HTML and machine JSON that
  serve the evaluation SHALL each have an explicit byte ceiling. This
  includes the Polaris human view, full machine answer and the derived
  agent briefing view.
  - A source or input breach SHALL keep the complete source population counted
    and every dependent fact Unknown.
  - A final-output breach of an evaluation response SHALL return only a bounded
    typed failure envelope carrying evaluation identity, limit identity,
    declared value, observed value and population counts. It SHALL NOT truncate
    or emit a success-shaped model.
  - Every breach of the evaluation resource envelope SHALL make
    PWB-REQ-021 readiness false.
  - The separately identified recorded generation draft member in
    PWB-REQ-020 uses its own encoded response ceiling outside that
    evaluation envelope. Its bounded editorial refusal SHALL NOT record
    an evaluation resource breach or change PWB-REQ-021 readiness.

#### Scenario: Resource breach is bounded and explicit

- **WHEN** any evaluation-wide input, deterministic parse-work or final-output
  ceiling for the evaluation is exceeded
- **THEN** the evaluation names the exact limit and counts the affected
  population as Unknown without emitting a partial success-shaped answer
- **AND** human and machine responses stay within their own declared encoded-
  byte ceilings and cold-open readiness is false

#### Scenario: Recorded editorial overflow leaves a ready evaluation unchanged

- **WHEN** a complete project-shape evaluation is ready and only the recorded
  generation draft member's independently declared ceiling is exceeded by its
  final encoded response
- **THEN** that member returns only its bounded editorial refusal under
  PWB-REQ-020 without any draft bytes or evaluation response event
- **AND** the same evaluation's state and readiness remain byte-identical
```

[Observed] The current registry's `entries[0].resourceLimitSemantics.breachResult` is:

```text
source and input breaches retain the complete population and make dependent facts Unknown; final-output breaches emit only a bounded typed failure carrying evaluation identity, limit identity, declared value, observed value and population counts; no truncated or success-shaped model is emitted; PWB-REQ-021 readiness is false
```

[Inferred] Preserve that exact evaluation meaning by inserting “of an evaluation response” after “final-output breaches” in that property and appending this sentence: “A recorded generation draft response breach is governed by PWB-REQ-020 and does not count as a project-shape evaluation breach.” Add `entries[0].resourceLimits.maxGenerationDraftResponseBytes` with value 65536 and the same key under `resourceLimitSemantics` describing final encoded UTF-8 JSON and the separate bounded editorial refusal. In `entries[0].resourceLimitSemantics.maxMachineResponseBytes`, replace the exact “the final encoded HTTP body for each authenticated Polaris machine JSON response” with “the final encoded HTTP body for the authenticated full Polaris project-shape machine answer at one evaluation”. Keep the separate briefing descriptor verbatim. Current declared human, machine and briefing values stay 2,097,152, 16,777,216 and 20,480. Each records an evaluation response breach and can make readiness false at the same evaluation.

[Observed] Current reconciliation R6 reports Unknown for the registry and screening policy cross-pins against the effective PWB spec. A later delivery has to establish the effective contract and policy binding without detector or classification changes before even a well-formed stored draft becomes eligible. The candidate grants no route permission and authenticates no stored run.

## What becomes eligible

[Inferred] This defines a preview of the recorded title, introduction and ordinary section text for the existing observing-project machine audience. It excludes deep dives, diagrams, unresolved sidecars and suppressed section headings and bodies by construction. A route consumer cannot use the preview as a complete dossier, a readiness signal, a statement of fidelity or source authority, or a new way to get source text by anchor. In particular, an edited or generated narrative string can resemble source prose and still requires SEC-5 screening. Omitting the anchor fields is insufficient on its own.

[Observed] The [M7 funnel's initial sketch](POLARIS-M7-GENERATION-LOOP-FUNNEL.md#slice-4--a-route-and-one-owner-action-that-is-a-drafted-act-large-q3-and-q4) would send preview HTML, receipts and spending. The [current preview](../../apps/three-surface-poc/src/polaris-generation/draft-preview.ts) includes exact source spans and path labels at lines 117–125. The [generation draft schema](../../packages/polaris-generation-core/src/draft-model.ts) at lines 12–35 distinguishes the ordinary fields from reference lists, diagrams and other assets. The current preview body also requires a `produced` disposition at lines 103–112. The new closed machine projection omits the non-produced heading as well as its body and resolves no source for that section. Copying the complete preview or returning a digest/count-only header would leave, respectively, the drafted delivery's authority ambiguous or its editorial purpose unserved. The adopted [RFC6-21](../../.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md) limit applies to the project-fact set. The preview contributes neither a replacement nor a second fact population.

[Observed] The [observer registry](../../.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json) at the pinned base, SHA-256 `f2b3573cfe35169f449a9eed36b4c3330ef037d6668bab0548dd5d5939293556`, has independent human, machine and briefing caps. It declares no editorial cap. The proposed 65,536 bytes is a finite per-response policy choice for a short editorial preview. It provides no measured production fit. At the next decision, a separately reviewed registry delta must define the exact field, its final UTF-8 boundary and refusal. Preserve existing ceiling values and reject reuse of the briefing or machine ceiling.

[Observed] The [durable lifecycle](../../apps/three-surface-poc/src/polaris-generation/durable-lifecycle.ts) can retain a completed, validated stage outcome. The [generation pipeline](../../packages/polaris-generation-core/src/pipeline.ts) can stop after that stage. The stage response digest does not by itself bind the final selected editorial draft artifact.

[Unknown] No supported durable generation record tying the terminal editorial result's exact final draft JSON to the precise admitted source set has been established for this endpoint. The existing demo's saved HTML, completed-stage receipt or aggregate JSON alone does not establish that authority. A later delivery must demonstrate the record using existing admitted state or review a separate state-record producer. The endpoint itself remains read-only. M7's separately bounded pure drafted-act output and any acceptance of this original remain open.

## Independent verification for adoption

| Change one input on an invented stored run | Independently expected observation |
| --- | --- |
| Valid recorded title, introduction and two sections. One parent has two child rows. The draft also has a diagram and a deep dive. | A literal closed JSON oracle gives exactly the title, intro, headings, parents and children in recorded order. Every character and the draft digest match. Unknown or newly added fields refuse the record unless separately admitted. Neither source lookups nor per-source metadata appear in the response. |
| With one other produced section fixed, vary only the tested section's valid disposition from produced to omitted or unresolved. Keep its recorded heading, parent and child bytes identical and bind each fixture to its exact record. Repeat with only non-produced sections. | The original produced heading, parent and children are eligible. Omitted and unresolved versions emit none of them and no accompanying source access or lookup. With no produced section remaining, the whole route refuses. |
| Replace only the selected draft bytes, its run ID, pinned revision, terminal result binding or bound screen identity. Keep the same completed early edit receipt while changing the selected run to stopped. | Each change independently refuses before projection. Neither a completed stage, another valid run record nor current worktree state can fill in the required binding. |
| Replace a selected paragraph's source reference with one from a different run, two competing admitted references, or one closed withheld reference. Change a separate selected paragraph's retained quotation finding. Insert an artificial secret-policy match in an otherwise admitted string. | Each change independently refuses and the response emits only the closed reason. Retained reasons or identifiers cannot become part of an error echo. |
| Independently mutate one allowed mount's credential or observing-project identity, then attempt the same subject in every mounted form wired for the new member. | Invalid or wrong-project admission refuses before state access. Credentialed forms use the one verified record. No form adds a human-open route. |
| Construct one complete final UTF-8 JSON body exactly 65,536 bytes and another exactly 65,537 by using literal multi-byte text. Then change only the registered cap or substitute the existing machine ceiling. | The exact-limit body serves. The first over-limit case serves no draft bytes. Missing or wrong-cap identity leaves the member unservable. The dedicated ceiling applies only to the editorial member. The full machine answer uses its inherited ceiling while the briefing declaration stays byte-identical. |
| Hold a complete observed evaluation that is ready. Breach each existing human, full-machine and derived briefing ceiling separately. Restore the fixture and breach only the editorial cap for one recorded generation run. | The three evaluation breaches separately return the original evaluation envelope and flip that same evaluation's readiness to false. The editorial 503 has only its own format, served and reason, emits no evaluation response event and leaves the complete evaluation state and readiness byte-identical. A helper that counts the editorial breach in the shared recorder fails the latter control. |
| Change one of the existing compared human/machine position facts; then repeat with only a screened draft text field changed. | An independent literal parity oracle still detects the former and reports the same denominators for the latter. An independent call census finds no writes, source reads or provider calls for the successful new read. |

[Inferred] Before adoption, re-evaluate the named PWB-REQ-020 authority, registry schema and descriptor, one stored generation subject, machine routing and all mount forms, response budget and readiness diagnostics, and the [adopted boundary register](../BOUNDARY-REGISTER.md) source inventory. No implementation is asserted by this blast-radius list. Give a fresh reviewer the exact before/after source, these controls, the scope limits and the proposed eligibility decision. Effective application requires the reviewed specification and registry adoption with literal inverses, applicable tags and exact implementation checks in the later delivery.
