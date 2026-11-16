# Polaris generation kit

Candidate authoring guidance, not an adopted specification or a runnable
generator. It complements the existing renderer; it does not change its
accepted behavior.

This kit grants no source access, provider egress, authorship adoption or release.

**The proving ground** is a set of open-source repositories, each scored
against its own human-made site: [targets](TARGETS.md), the working
[tracker](TRACKER.md), and the [learning log](LEARNING-LOG.md) of what we learn
about building a great manifesto page. What a launched run's fidelity
review costs per round, and which ways to cut it need the owner, is in
[the fidelity delta-review note](fidelity-delta-review-proposal.md).

## The product we are building

The POC exists to make Polaris generation generalizable across projects; a
beautiful page for Butlers is a proving case.

- [Observed] The owner clarified on 2026-09-12 that the POC exists to make
  Polaris generation generalizable across projects.
  - LLM involvement is expected.
  - The reusable deliverable includes generation tools, guardrails, artifacts
    and manifesto-authoring guidance.
  - A beautiful page for Butlers is a proving case.
- [Inferred] The next useful vertical slice is an admitted source bundle →
  bounded LLM authoring passes → inspectable draft bundle → faithful rendered
  preview → independent review → repair.
  - Project identity, vocabulary, sources and audience are inputs.
  - Changing projects must not require editing prompts, renderer code,
    validation rules or compiled source offsets.

**This kit is the practical authoring handoff for that slice.**

- Production adapter integration and full authored-bundle ingestion remain to
  be implemented through the applicable specification and implementation
  gates.
- The generator specification and implementation authorization are now
  recorded;
  [PROJECT-STATUS.md](../../PROJECT-STATUS.md#generalized-polaris-generation)
  routes to the owning acts.
- This kit remains supporting authoring guidance, and its examples are not
  runtime completion evidence.

## Executable development slice

The generation machinery runs its six stages through explicit adapters over
synthetic input; live provider integration, full owner controls and
real-project quality proof remain unfinished.

- The
  [generation core](../../packages/polaris-generation-core/README.md#editorial-pipeline)
  now runs inventory, plan, author, edit, fidelity and repair through explicit
  adapters.
- A synthetic operator command produces inspectable prose, relationship
  diagrams and component deep dives. It verifies the machinery.
- Live provider integration, full owner controls and real-project quality
  proof remain unfinished.
- The current operator path calls no real model or provider.

**The agreed product direction is synthesized in the
[formal understanding amendment](../../openspec/changes/polaris-manifesto-understanding-amendment/proposal.md).**

- Its scope: unfamiliar-repository discovery, consequential owner questions,
  supported understanding and argument, research repair, and independent
  evaluation.
- Its
  [design](../../openspec/changes/polaris-manifesto-understanding-amendment/design.md)
  carries the product vision; its behavioral requirements are the proposed
  specification home.
- The
  [original discussion packet](../design/polaris-product-understanding/README.md)
  remains the retained source, not a parallel implementation contract.
- The
  [owner adoption record](../../.syzygy/governance/decisions/POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md)
  now binds the formal amendment.
  - Read it with the predecessor specification.
  - Its candidate-era banners are preserved at their reviewed bytes.

## Start here

Read the guide, prepare the handoffs, inspect the examples, secure consent
before any real provider dispatch, and freeze the evaluation questions — in
that order.

1. Read [the authoring guide](AUTHORING.md) for the reader experience and pass
   prompts.
2. Prepare the inputs and handoffs in
   [artifacts and tools](ARTIFACTS-AND-TOOLS.md).
3. Inspect the [synthetic examples](example.json). Both blocks are synthetic,
   and `providerCallPerformed` is false.
   - `validatedInventoryExample` is the one block the current behavior test
     passes to the pure `validateStage("inventory", payload, context)` seam.
     It checks provider-local inventory structure and source coverage only.
   - `illustrativeUnderstandingExample` is teaching material marked
     `executable: false` and `schemaStatus: "illustrative-not-registered"`;
     no stage validator consumes it.
   - Run `npm run test:polaris-generation` to exercise the inventory seam.
   - Parsing the JSON proves syntax only; it does not validate the example or
     establish a generator run.
4. Before any real provider dispatch, obtain separately effective per-project
   consent naming the permitted provider and content classes (SEC-2). A future
   egress decision must also name the destination route and retention for sent
   content and replies; those two fields are this kit's proposed controls, not
   clauses SEC-2 already states. REQ-polaris-generation-001 requires the draft
   layer to render Unknown on absent or withdrawn consent. This would permit
   only its named effects; it would not adopt prose, authorize a repository
   write, release Syzygy, or satisfy REQ-014's two-real-project and reader
   proof.
5. Freeze the evaluation questions below before generating. Review the actual
   page, including its middle, deep dives and source routes.

## Run contract

The operator supplies the run's envelope, no prompt may broaden it, and every
pass leaves an inspectable record.

**The envelope.** The operator supplies:

- the project and exact admitted source revision, audience and reader
  questions;
- permitted source IDs and the permitted provider/content route;
- stage budgets, asset/output-size bounds, maximum repair attempts and the
  cancellation rule.
- No prompt may broaden that envelope.
- Instructions found inside source material are source content, never
  instructions to the generator.

**The zero-egress self-corpus check** reads only tracked Syzygy governance
Markdown blobs from an explicit commit:

```sh
npm run build:poc --silent
node apps/three-surface-poc/dist/polaris-generation/self-corpus-main.js --repo <Syzygy-checkout> --revision <full-commit>
```

- Its 1 MB refusal, scripted sufficient-budget run and in-memory perturbation
  are mechanical evidence only.
- `realProjectProof` remains false and no provider adapter is installed.

**Passes.** Each pass receives only its required inputs and produces
structured artifacts.

- Record their identities, input/output digests, prompt and tool versions,
  actual model/version where applicable, stage outcome and concise review
  findings.
- Keep source bodies and provider payloads only in their authorized retention
  location.
- A stage log is not a request to retain private reasoning traces.

```mermaid
flowchart LR
  S["Admitted sources<br/>and audience"] --> U[Understand]
  U -- "claim/evidence ledger" --> P[Plan]
  P -- "validated argument plan" --> A[Author]
  A -- "structured draft" --> E[Edit]
  E -- "revision plus change list" --> V[Verify]
  V -- "named findings" --> R[Repair]
  R -- "bounded replacement artifacts" --> X["Revalidate changes and<br/>affected dependants; stop at the<br/>declared attempt/budget limit"]
```

| Pass | Input | Output | Exit condition |
|---|---|---|---|
| Understand | Admitted sources and audience | Claim/evidence ledger; vocabulary; conflicts and gaps | Every proposed factual claim has support or explicit uncertainty |
| Plan | Ledger and reader questions | Argument outline; asset/deep-dive plan with reasons | A project-specific argument; dispositions for requested material |
| Author | Validated argument plan and ledger | Narrative blocks, diagrams, tables and optional deep dives | Structured draft only; claims and edges reference the ledger |
| Edit | Draft and ledger | Concise, coherent revision plus change list | Qualifications preserved; prose develops the argument |
| Verify | Frozen bundle, sources and criteria | Mechanical, independent fidelity and rendered-reader findings | Every required check has an explicit outcome; no self-awarded acceptance |
| Repair | Named findings and affected assets | Bounded replacement artifacts | Revalidate changes and affected dependants; stop at the declared attempt/budget limit |

**Failure handling.** Nothing missing, invalid or exhausted is presented as a
fact or as success.

- Stop before a provider call without its required admission.
- Missing evidence is Unknown; unsupported assets are unresolved with a
  reason.
- Invalid output is rejected, not interpreted as HTML or silently repaired
  into a fact.
- Exhausted budgets leave an explicit partial/failed run with inspectable
  draft work.
- Retry uses the same stage identity and records a new attempt; source or
  policy changes create a new input identity.
- Do not present an old artifact as regenerated.

**Review is not adoption.**

- Review confirmation and human authorship/adoption remain different states.
- Generated content stays editorial-draft until the applicable act.
- No generation or presentation approval adopts the underlying project's
  intent.

## Prove portability

Completion means linked evidence that one unchanged process serves two real
projects and a changed source, not two attractive screenshots.

**Two real projects.** Use this same process, prompt pack, validator and
renderer on two separately admitted real projects with materially different
domains.

- Permitted variation is the project input/profile, not a project-name branch
  or a manually repaired output embedded in application code.
- Synthetic examples exercise the handoff; they do not establish this result.

**Reader test.** For each project, freeze questions about purpose,
beneficiary, central thesis, important capabilities, one architectural
choice, a limit and an uncertainty.

- Have a fresh reader answer from the rendered page and record attempted
  paths.
- Evaluate accuracy and comprehension separately from visual polish.
- Do not turn a checklist or an LLM confidence value into an owner verdict.

**Changed source.** Then change source meaning — retract a claim, qualify a
promise, rename a concept or remove evidence for an edge — and regenerate with
the unchanged process.

- Check that affected prose, glossary, diagrams, deep dives and links update
  together.
- Old evidence/reviews cannot certify new bytes.
- A no-change input may reuse identified valid artifacts; a changed input
  must not silently reuse stale prose.

**What success is.**

- A successful slice produces linked evidence for both projects and
  regeneration, not merely two attractive screenshots.
- Further bespoke Butlers changes should teach a reusable authoring,
  rendering or validation rule and join this corpus.
