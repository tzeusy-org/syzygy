# Syzygy

**A specification-driven control plane for software projects: humans define
what should be true, evidence shows what is true, and agent fleets do bounded
work to close the difference — with the difference always rendered honestly.**

> **Current stage: bounded Three-Surface POC mode (non-release).**
> Capability 1 and its local runtime are implemented groundwork. On
> 2026-08-29 the owner directly authorized a deliberately bounded product
> experiment across Polaris, Trajectory, and Orrery, using Butlers as the
> first external proving project. For this experiment only, that direction
> supersedes the prior Capability-1-only and no-external-onboarding limits;
> it does not authorize production release or deployment, autonomous intent
> adoption, Syzygy-authored implementation code, broad remote access, or
> changes to adopted doctrine or accepted contracts. See the concise
> [owner-direction record](.syzygy/governance/decisions/THREE-SURFACE-POC-MODE-DIRECTION.md)
> and [`PROJECT-STATUS.md`](PROJECT-STATUS.md).

New here? Read [`.syzygy/intent/OVERVIEW.md`](.syzygy/intent/OVERVIEW.md) for
the argument, [`PROJECT-STATUS.md`](PROJECT-STATUS.md) for the exact current
state, and [Start here](#start-here) to run the POC or find a source.

## What exists today

Today Syzygy is a local daemon plus a bounded, non-release POC; the complete
loop below is not current capability.

- **Runtime:** a TypeScript/Node local daemon, a server-rendered human view,
  and an authenticated machine endpoint for Capability 1.
- **The POC's question:** can one shared project model make one real
  capability substantially easier to understand and operate through all
  three surfaces?
- **Three operator-facing paths, runnable against Butlers:**
  - an explicit human-triggered action that creates or reuses one bounded
    Bead;
  - Git observation of worker changes associated with that item;
  - a separately invoked file-backed JUnit capture, ingestion and
    verification path.
  - The implementation does not assert that any of those facts is present
    or current on a given run; the surfaces render the actual record state,
    including absent, Unknown and not-verified outcomes.
- **The 2026-09-01 trusted-bootstrap amendment:** the owner separately
  performed an indivisible five-row amendment transaction.
  - RFC 0001–0009 remain accepted and are bound at the current 30-module
    amendment manifest; seven signed contract-coverage artifacts and
    CC-SPEC-8 are also amended.
  - Valid exact-scope human acts may be effective in state (1), owner-adopted
    but uncorrelated, or state (2), Syzygy-verified; only state (2) is
    independently verified.
  - It granted no consent, observation, write, egress, execution, deployment,
    release, recovery, mission, or implementation authority.
  - Record:
    [`GENERAL-TRUSTED-BOOTSTRAP-AUTHORIZATION-ACT.md`](.syzygy/governance/decisions/GENERAL-TRUSTED-BOOTSTRAP-AUTHORIZATION-ACT.md).

## Why it exists

Agent-fleet work too often outruns any coherent account of intent, so Syzygy
keeps three kinds of state apart and renders the difference honestly.

- **The problem:**
  - A day of agent-fleet work too often ends with oversized diffs, scattered
    completions, and no coherent account of what changed or whether it
    matched intent.
  - Underspecification surfaces at the most expensive moment — after
    deployment.
  - Project knowledge lives in READMEs and ad-hoc investigation.
- **The answer: three kinds of state stay semantically distinct,** and the
  difference between them is legible, truthful, and navigable for both the
  owner and the agents doing the work.
  - **Desired state** — human-guided doctrine and specifications.
  - **Observed state** — code, tests, CI, runtime evidence.
  - **Execution state** — work-scheduler records.
  - Scheduled or merged work is never treated as proof that intent was
    satisfied.
- **Two rules everything else follows from:**
  1. **Comprehensible truth, never comprehensible fiction** (doctrine VIS-1).
     A simpler presentation is never bought with a less true one.
  2. **No evidence means Unknown** (VIS-2) — never green, never zero.

```mermaid
flowchart LR
    D[Desired state<br/>doctrine · specs] --> G[Difference<br/>legible · truthful · navigable]
    O[Observed state<br/>code · tests · CI · runtime] --> G
    E[Execution state<br/>work-scheduler records<br/>never proof intent was satisfied] --> G
```

*(Terms of art — the adopted glossary is
[`.syzygy/governance/doctrine/README.md`](.syzygy/governance/doctrine/README.md#glossary-read-first);
this page defines nothing itself.)*

## The four experiences

Three surfaces are views over one shared project model; Mission Control is a
workspace-level operator domain that is still candidate.

| Name | Literal subtitle | Answers |
|---|---|---|
| **Polaris** | the intent surface | What is this project supposed to be? |
| **Trajectory** | the work surface | **What remains, what is running, what changed, what it cost, and whether the result has been verified against intent.** Five questions, and the fifth is the one no issue tracker answers: a merged change is not a satisfied intent |
| **Orrery** | the map surface | Where does everything live, and in what state? |
| **Mission Control** | workspace-level operator domain — **not a fourth project-specific truth surface** | What bounded, delegated missions are running across projects? |

- **Polaris, Trajectory, and Orrery** are **views over one shared project
  model** (called the *kernel* in the technical contracts), never
  independent truth stores.
- **Mission Control** sits at the level of a **portfolio workspace** — the
  set of projects one operator runs, above any single project. It is defined
  by candidate contract RFC-0010 and a pending doctrine amendment (D3),
  neither yet accepted.
- All four names are working codenames only.

## The core loop

Code, tests, CI and runtime are observed against intent, the difference
becomes reviewed work, and verification feeds back — human-triggered, and the
complete loop is not current capability.

```mermaid
flowchart LR
    I[Intent<br/>doctrine · specs] --> O[Observation<br/>code · tests · CI · runtime]
    O --> G[Difference<br/>gaps · contradictions · Unknowns]
    G --> W[Reviewed work<br/>scheduled via adapters]
    W --> F[Fleet execution<br/>human-approved missions]
    F --> V[Verification<br/>evidence]
    V --> O
    V -.->|evidence may indict the spec| I
```

- **Built so far:** Capability 1 implements trusted observation groundwork,
  but the complete loop shown here is not current capability. The
  Three-Surface POC is the first bounded attempt to exercise one end-to-end
  slice. The loop remains human-triggered.
- **Write boundary (VIS-5):** Syzygy writes project content directly only
  under `openspec/**` and `.syzygy/**`; it never writes implementation code,
  and it reaches every other system through typed, explicitly authorized
  adapters.

## What is authoritative here

Authority is **typed** — each question has one owning home. Generated
indexes, summaries, and this README are presentation — they cite authority
and are never themselves authoritative.

| Question | Authority | Authority state |
|---|---|---|
| Why; non-negotiable rules | [`.syzygy/governance/doctrine/`](.syzygy/governance/doctrine/) (VIS-1…7, SEC-1…5) | **Adopted** 2026-07-30 |
| Prior owner rulings | [`.syzygy/governance/decisions/`](.syzygy/governance/decisions/) | **Recorded** |
| Engineering and evidence bar | [`.syzygy/governance/policies/craft-and-care/`](.syzygy/governance/policies/craft-and-care/) | **Owner-approved** (D2); CC-SPEC and CC-IMPACT are in force, with CC-SPEC-8 amended by the 2026-09-01 transaction |
| Load-bearing technical contracts | [`.syzygy/governance/contracts/`](.syzygy/governance/contracts/) | **RFC 0001–0009 accepted** — originally through the 2026-08-17 Wave A/B acts and amended at the current 30-module manifest by the 2026-09-01 transaction ([`PROJECT-STATUS.md`](PROJECT-STATUS.md) owns this state); RFC 0010–0011 remain **candidate** in `contracts/candidates/` |
| Intended placement | [`.syzygy/map/topology-candidates/`](.syzygy/map/topology-candidates/) | **Candidate** |
| Required observable behavior | [`openspec/`](openspec/README.md) | **Five changes adopted or signed off** — Capability 1, the Three-Surface POC, the PWB slice of Polaris, and the Polaris generator with its understanding amendment; [`openspec/README.md`](openspec/README.md) names each change's acts and [`PROJECT-STATUS.md`](PROJECT-STATUS.md) owns their state. The POC is explicitly experimental, not a new conformance claim |
| What currently exists | Code, tests, CI, runtime | Capability 1 domain/runtime implementation and its evidence; Three-Surface POC implementation is in progress |

## Start here

Run the bounded POC with one command, or follow the source map below in
order.

### Run the bounded Three-Surface POC

From a fresh Syzygy checkout, one command installs dependencies, builds the
bounded POC, and starts it against the local Butlers proving repository:

```sh
npm ci && npm run poc -- --repo /home/tze/GitHub/butlers
```

- The daemon binds only to loopback and prints the human URL plus the
  authenticated machine endpoint and credential-file location.
- [`docs/THREE-SURFACE-POC.md`](docs/THREE-SURFACE-POC.md) has the
  ten-minute walkthrough, the implemented materialization/observation/evidence
  paths, and the relationships that remain deliberately absent.

### Check a change

After `npm ci`, `npm run check` (typecheck plus the hermetic unit tests) is the
quick answer to "is my change green"; `npm run check:all` adds the integration
and e2e tiers and the governance battery. [`CONTRIBUTING.md`](CONTRIBUTING.md)
("Checking a change") defines the tiers.

### Project source map

Pick a glossary by the kind of word, then read nine sources in order.

**Unfamiliar word?** Which glossary depends on what kind of word it is:

| Kind of word | Where |
|---|---|
| An adopted product term | [`doctrine/README.md`](.syzygy/governance/doctrine/README.md#glossary-read-first) — the glossary doctrine means when it says "README glossary" (seven entries; *this* file has none) |
| A wider working product term | [`TERM-REGISTRY.md`](.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md) — candidate, approved by no act |
| A **process** word — *act*, *argument*, *wave*, *offer*, `P-nn`, `RD-nn`, *candidate* vs *confirmed* vs *accepted* | [`PROCESS-GLOSSARY.md`](PROCESS-GLOSSARY.md) |

Read these in order:

1. [`.syzygy/intent/OVERVIEW.md`](.syzygy/intent/OVERVIEW.md) — the project
   argument, 30 seconds to full depth (draft; adoption pending).
2. [`.syzygy/governance/doctrine/vision.md`](.syzygy/governance/doctrine/vision.md)
   — the thesis and the non-negotiables.
3. [`.syzygy/governance/doctrine/v1.md`](.syzygy/governance/doctrine/v1.md)
   — **what the software would actually do at V0 and V1.** The one adopted
   file that states scope in terms of behavior rather than principle; read it
   if `vision.md` leaves you asking "yes, but what does it *do*?"
4. [`PROJECT-STATUS.md`](PROJECT-STATUS.md) — exact current gate state.
5. [`.syzygy/governance/contracts/`](.syzygy/governance/contracts/)
   — the contract corpus: accepted modules at `rfcs/` (RFC 0001–0009,
   originally accepted by the 2026-08-17 Wave A/B acts and amended at the
   2026-09-01 30-module manifest), the deferred RFC 0010/0011 candidates and
   the acceptance record under `candidates/`.
6. [`.syzygy/governance/policies/craft-and-care/`](.syzygy/governance/policies/craft-and-care/)
   — the engineering bar.
7. [`.syzygy/governance/decisions/`](.syzygy/governance/decisions/README.md)
   — what the owner has decided, what is pending, and what acts exist.
   Start at its [`README.md`](.syzygy/governance/decisions/README.md); the
   queue itself is
   [`PENDING-OWNER-DECISIONS.md`](.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md).
8. [`CONTRIBUTING.md`](CONTRIBUTING.md) — posture and change discipline.
9. [`SECURITY.md`](SECURITY.md) — committed security posture and reporting.

**Two things in the repository root are process instruments, not project
content**, and are named here so they are not mistaken for either *(added
2026-08-13, RD-50 f10 — both were unmentioned by this page)*:

- [`launch-gate-pre-specifications.md`](launch-gate-pre-specifications.md)
  — the question set used to judge whether this repository is ready for
  anyone to author its first specification. **Owner-approved process policy
  at v2.4** (P-34, ruled 2026-08-16 with disclosed residuals —
  `decisions/LAUNCH-GATE-AUTHORITY-DECISION.md`), and a `READY` verdict
  from it would authorize nothing.
- [`FORMAL-CAPABILITY-1-LAUNCH-PACKET/`](FORMAL-CAPABILITY-1-LAUNCH-PACKET/)
  — **historical and retired after Administration 1 was performed under it
  on 2026-08-18.** Its purpose is discharged; the canonical structured record
  is
  [`.syzygy/governance/decisions/launch-gate/ADMINISTRATION-2026-08-18-CAPABILITY-1.json`](.syzygy/governance/decisions/launch-gate/ADMINISTRATION-2026-08-18-CAPABILITY-1.json),
  with verdict `NOT READY`.

Agents: read [`AGENTS.md`](AGENTS.md) — operating procedure, not project
truth.

## What is not implemented

Nothing here is a released product or a general service; without current
evidence, the listed relationships stay Unknown (VIS-2).

- **Absent:** a released Three-Surface product, generalized project graph,
  production deployment, remote or multi-user service, general Beads
  adapter, general spatial-layout engine, or broad project onboarding.
- **Implemented, and bounded:** the POC's one human-triggered Beads
  materialization action, a bounded worker-change observer, and file-backed
  test-artifact capture, ingestion and verification.
  - The running daemon never executes the test suite automatically; the
    separate operator command does.
  - Those mechanisms do not dispatch a worker, let Syzygy change
    implementation code, supply deployment or live-runtime observation, or
    make absent and mismatched evidence positive.
- **No positive claim:** No claim of alignment, convergence, regeneration,
  deployment health, conformance, or release is intended; without current
  evidence those relationships remain Unknown (VIS-2).
- **PWB provenance:** the PWB behavioral amendment signs state (1) or state
  (2) as valid provenance for PWB-REQ-005 and PWB-REQ-022, with exact state
  visible and only state (2) called independently verified.
  - That behavioral sign-off does not itself create an effect: an effect
    needs its own consent, policy and registry acts, and implementation
    needs its own authorization.
  - **Whether those have been performed is not stated here** —
    `PROJECT-STATUS.md` owns that row, and the acts themselves are recorded
    in
    [`.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`](.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md).
    Read one of those, not this paragraph.
  - *Superseded, dated:* until 2026-09-05 this paragraph ended
    "Effect-specific consent, policy and registry acts are still required
    before any new repository-body read, and separate authorization is
    required before PWB implementation can resume." That was written on
    2026-09-02 and was already false by the end of that day — the three
    effect acts and the implementation authorization were performed hours
    later, and a further amendment and continuation followed on 2026-09-05.
    It stood because this page restated a status it does not own instead of
    citing the page that does.

## License

**MIT** — ruled by the owner 2026-08-18 (P-14), granted by the root
[`LICENSE`](LICENSE) file.

- Decision record:
  [`.syzygy/governance/decisions/LICENSE-CHOICE-DECISION.md`](.syzygy/governance/decisions/LICENSE-CHOICE-DECISION.md).
- A license grant does not broaden the bounded POC authorization:
  contribution posture stays governed by [`CONTRIBUTING.md`](CONTRIBUTING.md)
  and the current lifecycle boundary recorded in
  [`PROJECT-STATUS.md`](PROJECT-STATUS.md).
