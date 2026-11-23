# Artifacts and generation tools

Candidate handoff conventions, not a complete registered runtime schema or
implemented API.

- The generation core does expose a provider-local inventory validator; it
  does not register the kit's full interchange format.
- Use the [run contract](README.md) and [authoring prompts](AUTHORING.md).
- The example is intentionally small; a production interchange must
  additionally satisfy the adopted narrative, provenance, security and
  lifecycle contracts.

## Per-stage envelope

Each stage is specified to run inside an identified, bounded request and to
return an identified outcome; authorization is verified outside the LLM.

This kit grants no source access, provider egress, authorship adoption or release.
A real provider requires recorded per-project, provider and content
consent under SEC-2.

**Request.** A request identifies:

- `runId`, `stageId`, `attempt`, project and audience;
- the frozen input bundle and the allowed source/claim/asset IDs;
- prompt version and accepted output kind/version;
- authorized provider route, tool allowlist and explicit budgets.
- The source bundle includes revision/evaluation identities, source digests,
  source spans, claim states, exclusions and unresolved inputs.
- Authorization is verified outside the LLM; putting a grant-shaped string in
  JSON grants nothing.

**Result.** A result repeats its request/input identities and returns
`complete`, `partial`, `failed` or `cancelled`.

- It also carries produced artifact references/digests, usage, unresolved
  items and concise findings.
- Unknown fields must not become executable extensions.
- A malformed result is a failed attempt, not an empty successful bundle.
- These are stage outcomes, not project-health or adoption states.

**Provider metadata.** Record actual provider/model metadata and outcome only
when an authorized call occurred.

- A synthetic handoff carries neither a fabricated provider response nor a
  paid-run success record.
- In [example.json](example.json), only `validatedInventoryExample` is passed
  to today's provider-local `validateStage("inventory", payload, context)`
  seam.
- `illustrativeUnderstandingExample` is marked `executable: false` and
  `schemaStatus: "illustrative-not-registered"`; no stage validator consumes
  it.
- The file is synthetic and records `providerCallPerformed: false`.

## The artifact set

Eight artifacts carry a run from admitted sources to review and audit; each
has required content and a named consumer.

| Artifact | Required content | Consumer |
|---|---|---|
| Source bundle | Project/snapshot/evaluation identity; admitted source IDs and digests; source references; exclusions and conflicts | Understanding pass; validators |
| Claim ledger | Claim ID; statement; supporting spans; evidence state; intended meaning; qualifications; conflicting/unknown inputs | Every authoring pass and fidelity reviewer |
| Argument plan | Audience/questions; section order and purpose; claim IDs; requested asset/deep-dive dispositions | Author; independent coverage reviewer |
| Draft bundle | Identified prose/list blocks; claim IDs; editorial-draft state; asset references and reading order | Trusted renderer and reviewers |
| Diagram asset | Reader question; named nodes; typed/directed edges; support for each factual node/edge; qualifications; legend; structured text equivalent; placement | Trusted diagram renderer |
| Deep-dive asset | Parent identity; focused question; supported explanation; relationships and limits; return/evidence links; disposition | Optional reader route |
| Review record | Frozen subject/input digests; criteria; independent reviewer identity; actual methods/viewports/paths; findings and unresolved checks | Repair; human review |
| Run manifest | Stage/attempt identities, tool/prompt/model versions, artifact hashes, outcomes, dependencies and invalidated reviews | Recovery and audit |

**Shared derivation.** Narrative, diagrams, glossary and optional depth
consume the same claim ledger.

- Contents are derived from existing section/asset identities.
- Glossary entries are shared by inline definitions and glossary routes.
- Tables contain real comparisons with supported cells and explicit missing
  values.
- Every requested asset has a produced, unnecessary-with-reason or unresolved
  disposition.
  - Reviewers check omissions against the source inventory, not just the
    generated output.

**Immutability.** Keep bundles and their manifests immutable once reviewed.

- A repair produces new artifact versions and invalidates affected reviews.
- Do not cache away a changed qualification, hidden broken edge, failed stage
  or withdrawn source permission.

## Tools available today

[Observed] The POC has the following primitives. They are not a complete
generator.

| Existing surface | Actual capability and current limit |
|---|---|
| `polaris-reading.ts`: `applyReadingPlan` | Validates digest-bound excerpt/figure/chapter selectors; drift falls back to the complete declaration. It cannot synthesize new prose or infer a plan. |
| `polaris-markdown.ts`: `renderPolarisMarkdown` | Renders admitted bounded Markdown and explicit data-only flow/relationship forms. Unsupported diagrams remain literal text. It is not a general graph-layout engine. |
| `polaris.ts`: `renderProjectReading` and `renderPolarisPage` | Render existing reading/model types with source links, navigation and figures. They do not ingest the proposed draft-bundle format above. |
| POC body-read/observation pipeline | Acquires the currently configured consented source class. It is not a general repository crawler or permission grant for another project. |
| Narrative, parity, reading and browser tests | Validate existing helper/model behavior. Passing them does not establish generated-prose quality or cross-project generality. |

**Cold start.** From a clean Syzygy checkout with its dependencies installed,
a cold-start operator can exercise the checked-in inventory block and inspect
the example:

```sh
npm run test:polaris-generation
python3 -m json.tool docs/polaris-generation/example.json
npx vitest run apps/three-surface-poc/src/polaris-reading.test.ts apps/three-surface-poc/src/polaris-markdown.test.ts
npx vitest run apps/three-surface-poc/src/polaris-accessibility.browser.test.ts
```

**What these commands prove.** None of these commands generates a manifesto
from the example.

- The `provider-draft.test.ts` behavior test reads `validatedInventoryExample`
  and passes its `payload` and `context` to `validateStage("inventory", ...)`.
  - That checks the provider-local closed schema and source coverage.
- The `illustrativeUnderstandingExample` is never passed to a stage
  validator.
- `python3 -m json.tool` proves JSON syntax only; parsing alone does not
  validate schema or establish a generator run.
- The existing `poc:fresh-checkout-demo` requires the configured repository's
  actual read gates and remains a separate live proving-case check.

## Project-shape profile

[Inferred] This version 1 coordination descriptor gives the observer and the
generator one vocabulary for project-shaped inputs. The registry owns
project grammar. The effective consent and policy still determine what the
observer can read. The signed PWB-REQ-002 amendment defines the loaded
extraction grammar and its refusal behavior.

| Field | Writer and consumer | Current proving-case reference |
|---|---|---|
| `profileVersion`, `observingProjectId`, `repositoryId`, `contentClass` | The registry identifies the subject. The observer and generator carry these identities through their records. | `project:syzygy`, `repository:butlers-configured-poc`, `declared-project-shape-text`. The effective consent supplies the physical locator as configuration. |
| `rootIndex`, `indexDepth`, `layers`, `pillars` | The registry specifies discovery vocabulary. The observer derives the manifest from the pinned tree and admitted index bytes. | The proving case's about/README.md, depth 3, and the five pillar keys and labels in [the manifest](../../packages/three-surface-poc-core/src/project-shape-manifest.ts). |
| `sourceRules`, `extractionClasses`, `grammarRows` | The registry names source-selection rules, the class vocabulary and per-source bindings. Policy supplies admission and screening constraints. | Five source rules and nine extraction classes in [the manifest](../../packages/three-surface-poc-core/src/project-shape-manifest.ts). The adopted grammar fixes the nine container shapes and eight item key forms. |
| `projectAccountKeys`, `catalogKeys`, `precedence` | The observer interprets selected declarations with the registered key vocabulary. The screened root index supplies the declared precedence rows. | The six account keys are `purpose`, `promises`, `refusals`, `architecture`, `v1-scope` and `v1-success`. Use the current catalog and precedence vocabulary from [extraction](../../packages/three-surface-poc-core/src/project-shape-extraction.ts) and [coverage](../../packages/three-surface-poc-core/src/project-shape-coverage.ts). |
| `profileDigest`, `revision`, `evaluationId` | The future loader derives one SHA-256 identity over the versioned canonical profile. Each capture binds that identity to its own revision and evaluation. | The profile digest will accompany the existing manifest digest and observation identity when the loaded-profile slice implements it. |
| `selectedSources`, `excludedSources` | The observer retains the population at the pinned revision with its disposition and existing screening rules. The generator consumes the admitted population and the associated safe exclusion evidence. | The manifest records selected source identities and population gaps. The generator's current admitted input is [`SourcePopulation`](../../packages/polaris-generation-core/src/admitted-input.ts). |

[`PocSeedInput`](../../packages/three-surface-poc-core/src/poc-seeds.ts) holds
POC seed entities. Audience, provider, budget and requested assets belong to
the generator run envelope. This coordination descriptor is documentation for
the registry-backed profile work.

### Synthetic second-corpus measurement design

[Inferred] Build a fabricated tree with ordinary material that uses
Syzygy-shaped filenames and different headings and ontology from the proving
case. Inject the tree listing, blob reader, clock and authority outcomes. Run
against that in-memory fixture with provider dispatch and real repository
operations wired to fail if reached.

Freeze the selected and excluded path sets before evaluating. One proposed
fixture has five selected paths (governance/INDEX.md,
governance/intent/README.md, governance/intent/vision.md,
specs/service/spec.md, and map/service.md) and three excluded paths
(private/fixture.txt, notes/unclassified.txt, and
scratch/untracked.md). Give each path one explicit reason or admitted
rule. In an additional input, remove the root index bytes while retaining its
expected ID in the denominator.

| Stage | Measure against the frozen fixture |
|---|---|
| Admission and discovery | Record whether the stage crashed, returned Unknown with a reason, or produced a supported result. Count all eight input dispositions and compare the exact IDs against the fixture's expected sets. With a refused grant, count repository operations and require none. |
| Screening and extraction | Preserve each excluded disposition and each failed expected source in the per-stage population. Verify that attributed claims recover the same-revision fabricated span and digest. |
| Model and presentation | Trace each emitted claim to the fixture or record a proving-case copy leak. Include unsupported framing in the sweep even when it contains no proper nouns. Compare human and machine claim identities where both surfaces render a supported result. |

The first measurement begins Unknown and records actual stage outcomes
before assigning expectations to later regression runs. A synthetic result
exercises the profile boundary. Real portability evidence requires a
separately admitted observation and its own retained inputs.

## Tool interfaces to build for the vertical slice

These names describe proposed operations, **not commands that exist**.
Implement and admit them through the applicable specification/implementation
gates.

| Operation | Input → output | Boundary |
|---|---|---|
| Prepare sources | Admitted snapshot and project adapter → bounded source bundle | No ambient crawling or policy bypass; exclusions remain visible |
| Run authoring pass | Validated stage envelope → structured draft result and usage | Provider/content admission before dispatch; explicit bounds, cancellation and checkpoints |
| Validate bundle | Frozen bundle, source ledger and output contract → identified structural/fidelity failures | Check IDs, span/digest integrity, coverage, state, edge support and references; return per-predicate failures |
| Render preview | Validated draft bundle → local human page and corresponding machine presentation | Trusted renderers own markup/styles; no provider HTML or implicit network requests |
| Inspect reading | Frozen preview and reader criteria → layout/navigation evidence and independent findings | Test full page, disclosure/return routes, keyboard, mobile and source access |
| Revise bundle | Findings and prior artifacts → bounded replacements and invalidation manifest | Preserve prior evidence; review is not automatic adoption |

**Deliver these as one usable slice** before adding a generalized scheduler or
a new queue.

- Reuse the existing authorized lifecycle where applicable.
- The first slice should let an operator follow a source-backed draft from
  input through preview and repair.
- It must not require manually editing application code to make the second
  project render.

## Validation and failure exercise

Trust no predicate until a counterexample makes it fail, and never let
mechanical validation stand in for fidelity or reader review.

**Counterexamples first.** Before relying on a predicate, exercise a
counterexample and confirm the corresponding explicit failure or partial
outcome:

- remove a source span; change a source digest;
- introduce a dangling deep-dive link; add an unsupported edge;
- hide a material qualifier; insert active content;
- exceed the output budget; interrupt a pass.
- Do not count a crash before validation as a successful rejection test.

**Mechanical validation has a ceiling.** It cannot establish that a
conclusion follows from its cited source or that a page reads well.

- Retain independent fidelity and actual-reader reviews alongside structural
  results.
- The portability and changed-source recipe in [README](README.md) is the
  completion test for the broader generator.
