# Heart and Soul — Doctrine

> **Status:** Adopted project doctrine — owner adoption `ADOPT DOCTRINE`,
> 2026-07-30. Amendments are recorded in
> [`../decisions/DOCTRINE-AMENDMENT-LOG.md`](../decisions/DOCTRINE-AMENDMENT-LOG.md).

This folder says **why** Syzygy exists, what it believes, what it refuses to
be, and which constraints bind every later decision. It is constitutional, not
aspirational: every rule is written so that a violation is recognizable.

## Glossary (read first)

- **Syzygy** — provisional codename for the project. The word means the
  astronomical alignment of three bodies; here, vision, specification, and
  code. Syzygy, Polaris, Trajectory, and Orrery are **working codenames
  only**; final product naming is a later owner decision (architecture.md,
  Vocabulary).
- **Owner** — the single human accountable for a governed project's intent.
  Wherever doctrine says "human sign-off" or "consent," it means the owner.
  (Multi-user operation is deferred; see v1.md.)
- **Owner classes** — the four kinds of change only the owner decides
  (vision.md VIS-4): doctrine; secrets; writes into repositories the owner
  does not own; and network exposure beyond the tailnet, release, deployment
  and multi-user operation.
- **Agent adoption** — a change an agent adopts under vision.md VIS-4: landed
  on the default branch with one row in `decisions/AGENT-ADOPTIONS.md`
  (commit, what changed, why, revert command), reported to the owner, and
  undone by the owner's veto.
- **Governed project** — one or more repositories with one owner and exactly
  one **designated governance root**: the repository that holds the project's
  single `openspec/**` + `.syzygy/**` plane. It is explicitly brought under
  Syzygy observation. Other repositories are declared observed-source
  repositories, read-only to Syzygy unless separately onboarded. Reading a
  repository needs no consent; writing into one the owner does not own does
  (architecture.md; security.md SEC-2, SEC-4).
- **Observed-only project** — a governed project whose governance root Syzygy
  may read but may not write: no write into it is allowed or adopted, and
  Syzygy writes nothing there until one is (architecture.md).
- **Attributed owner answer** — the owner's answer to a question about
  intent, attributed, dated and individually withdrawable. It is neither
  evidence nor a warrant: it renders Observed only as a fact about the record,
  never as adopted intent unless adopted under VIS-4, and never in place of an
  Unknown (trust-and-evidence.md).
- **Self-observation** — Syzygy's observation pipeline evaluating Syzygy's own
  governance root as its subject. Its records never evidence a claim of
  Syzygy's own alignment, convergence or genome-completeness
  (trust-and-evidence.md).
- **`.syzygy/` and `openspec/`** — the only two in-tree namespaces Syzygy
  writes directly in a governed project (vision.md VIS-5). architecture.md
  defines the `.syzygy/` layout: `governance/`, `intent/`, `work/`, `map/`,
  `cache/`, `local/`. Everything else Syzygy only reads, or affects through
  typed adapters.
- **Polaris / Trajectory / Orrery** — provisional codenames for Syzygy's three
  surfaces: intent and comprehension; gaps, work, and convergence; and the
  observed/projected system twin (architecture.md).
- **Substrates** — the designated initial tools for each role, all
  substitutable (architecture.md); nothing here claims an integration already
  exists:
  - **OpenSpec** — behavioral specifications in `openspec/`;
  - **Beads** — work scheduling (issues, dependencies);
  - **the `/th-*` skills and claude/codex CLIs** — the agent toolchain for
    workers and actuators. The skills are published as the public
    **ai-bootstrap toolchain** that v1.md names as the initial substrate.
- **Actuator / actuator toolchain** — an **actuator** is whatever performs the
  work Syzygy's answers generate: an agent worker, a fleet of them, or a human
  working by hand. The **actuator toolchain** is the existing, external
  agent-execution toolchain Syzygy harnesses rather than replaces — initially
  the `/th-*` skills and claude/codex CLIs above, working over the designated
  work scheduler. "Agent toolchain" and "actuator toolchain" name the same
  role. Syzygy shows the difference between desired and observed state; the
  actuator toolchain closes it (vision.md, Thesis). Syzygy is not itself an
  actuator: it writes no implementation code (VIS-5), and its effects
  reach code only through dispatched work (architecture.md).
- **Rule identifiers** — vision.md's rules are `VIS-1`–`VIS-7`; security.md's
  are `SEC-1`–`SEC-5`. They are deliberately distinct from the release stages
  `V0`/`V1` (v1.md), so a rule citation never reads as a stage. Identifiers
  are stable after adoption: text is amended in place, and a rule is retired
  rather than renumbered.

## Reading order

1. **[vision.md](vision.md)** — the owner's problem, the thesis, what Syzygy
   is and is not, rules VIS-1–VIS-7, the regeneration north star, the fleet
   observability mandate, and what success and failure mean.
2. **[v1.md](v1.md)** — scope: what V0 ships and in what increments, what V1
   adds, deferrals and why, platform and audience, and the stage-labeled
   success tests with their evidence.
3. **[architecture.md](architecture.md)** — constitutional structure: governed
   projects and the orthogonal plane, typed authority, contradictions vs gaps,
   the Project Genome and convergence, snapshots and the loop, one kernel and
   three surfaces, and the frozen vocabulary.
4. **[trust-and-evidence.md](trust-and-evidence.md)** — claims, evidence,
   warrants, staleness, the deterministic/inferred seam, and the normative
   trust floor.
5. **[security.md](security.md)** — the trust model: rules SEC-1–SEC-5 on
   exposure, data egress, executing observed code, write blast radius, and
   secrets.

## Scope boundary

Doctrine does not hold:

- engineering standards, review discipline, testing rules, or provenance
  formats — those are the quality and evidence policy in
  `.syzygy/governance/`;
- technical contracts (graph schemas, adjudication and certificate semantics,
  execution profiles, deeper `.syzygy/**` schemas) — those are accepted RFCs
  in `.syzygy/governance/`;
- required observable behavior (`openspec/`) or component placement (declared
  topology in `.syzygy/governance/`).

Doctrine is slow to change. The owner adopts every amendment, and downstream
artifacts must be re-checked for alignment when it changes.
