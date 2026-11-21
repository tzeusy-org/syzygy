# 04 — Authority and Write Boundaries

> **Reviewed draft — grounded in proposed foundational contracts (currency note, not an ordering precondition: this bundle's own gate is §2 act 3 of the acceptance record and does not wait on the RFC act).** Reviewed fresh-context (reviews 5–7, dispositions recorded); updated at the rev7 rework for the corrected contracts (D1 historical scope, five governance categories, walkthrough three-way split, captured external confirmation, `Base` scenario context). Becomes canonical only by its **own owner act** — `ACCEPT TOPOLOGY: <bundle-manifest-digest>`, binding the exact digest of every file in the bundle — never implicitly on the RFC gate (RFC3-16: this stamp is a self-declaration; effective status lives in the owner-act record).
>
> Rendering: Mermaid is the durable, renderable fallback chosen for this phase; an Excalidraw + SVG upgrade is a tracked follow-up.

> Restyled 2026-09-28 for readability (no change of meaning); reviews 5–7 reviewed the prior bytes, and this restyle's review is recorded in [the topology restyle packet](../../governance/decisions/TOPOLOGY-TREE-RESTYLE.md).

## What this shows

Syzygy may write directly into exactly two namespaces; everything else is
read-only, and every external authority is reached only through a typed,
explicitly authorized adapter.

- **The write universe:** exactly two directly writable namespaces,
  everything else read-only.
- **External effects:** every external authority reached only through a
  typed, explicitly authorized adapter.
- **Also here:** the typed authority map and the no-second-store rule.

```mermaid
flowchart LR
    subgraph Syzygy["Syzygy [target]"]
        Kernel["Kernel + surfaces"]
        Adapters["Typed adapters —<br/>registered, versioned, authorized effect set<br/>declared per adapter (RFC4-2/7)"]
    end

    subgraph Governed["Governed repository tree — SEC-4 consent boundary"]
        Two["openspec/** + .syzygy/**<br/>the ONLY direct-write namespaces (VIS-5);<br/>no manifest may extend this universe (RFC3-3)"]
        Rest["All other project content<br/>(src, docs, config, ...)<br/>READ-ONLY to Syzygy, forever"]
    end

    subgraph Externals["External typed authorities — never Syzygy-owned content namespaces"]
        VCS["Version control / forge<br/>authority: version history"]
        Sched["Work scheduler (Beads)<br/>authority: work lifecycle,<br/>after materialization only (SDR-7)"]
        CIE["CI systems<br/>authority: verification reports"]
        RT["Runtime systems<br/>authority: runtime observations"]
    end

    Kernel -->|"direct writes: attributed, atomic, individually revertable (SEC-4); OpenSpec-compatible form in openspec/** (schema-ownership split)"| Two
    Kernel -->|"reads declared implementation + evidence sources, secret-screened (SEC-5); never creates, modifies, moves, deletes"| Rest
    Kernel -->|"every external effect routed through, explicitly authorized, audited (VIS-5; RFC5-24/25)"| Adapters
    Adapters -->|"commit-out of Syzygy-authored artifacts into the two namespaces only (VIS-6)"| VCS
    Adapters -->|"work-item creation at materialization; commanded lifecycle mutations — synchronous, attributed, re-read after write (RFC4-15)"| Sched
    Adapters -->|"read-only report consumption; Syzygy never runs CI (RFC4-13; SEC-3)"| CIE
    Adapters -->|"ingest of externally produced datasets only; collection requiring code execution blocked until profile approved (SEC-3; RFC5-18)"| RT
```

## The typed authority map [Observed: architecture.md]

Each question has one typed authority, and there is no single universal
source of truth.

| Question | Authority |
|---|---|
| Why does the project exist; what principles govern it? | Doctrine in `.syzygy/governance/` |
| How do load-bearing contracts work? | Accepted RFCs in `.syzygy/governance/` |
| What observable behavior is required? | `openspec/**` (OpenSpec artifact contract) |
| Where do intended components sit? | Declared topology in `.syzygy/governance/` |
| What quality/evidence standards apply? | Policies in `.syzygy/governance/` |
| What currently exists? | Code, tests, CI, runtime observations |
| What work is scheduled, in what state? | The scheduler (Beads) — via its typed adapter |
| What does Syzygy display? | A rebuildable projection of all the above (VIS-6) |

- A contradiction between typed authorities routes to adjudication — an
  agent's recorded adoption, or the owner in an owner class (VIS-4) — never
  precedence.

## Governance categories and write-authority classes *(added at the rev7 rework)*

`.syzygy/governance/` has five constitutional categories plus a reserved
`declarations/` category whose standing is OPEN, and four write-authority
classes; the table gives each path's typical write authority.

- **Five constitutional categories** (RFC3-15).
- **The reserved `declarations/` category** is a **drafted default only**:
  **whether `declarations/` stands as a sixth category is OPEN at RFC 0003
  §8 q4.**
  - B19 ruled on challenges, not on this.
  - The drafted default holds until the owner rules, reversible by
    amendment.
- **Four write-authority classes** (RFC3-2).

| Path | Holds | Install gate | Typical write authority |
|---|---|---|---|
| `governance/doctrine/` | Adopted doctrine | Owner adoption | owner-adopted |
| `governance/contracts/` | Accepted RFCs / load-bearing contracts | Owner acceptance | owner-adopted |
| `governance/policies/` | Quality/evidence/security policies, incl. the craft-and-care cluster and the walkthrough **release policy** (RFC9-45) | Owner approval; honored under RFC3-16(a) | owner-adopted / Syzygy-drafted |
| `governance/decisions/` | Recorded owner decisions — adoptions, dismissals, adjudications, consents, walkthrough **judgments** (RFC7-31, RFC9-45) | Owner recording; a decision is a warrant, never evidence | owner-adopted |
| `governance/records/` | Kernel-authored durable facts on non-owner submissions (the only minting trigger — RFC3-2; kernel-computed expiry derives, mints nothing) — challenge admission/rejection records, submitted withdrawals, walkthrough **execution records** | None — recorded facts, never authorizations, never adoptable | kernel-recorded |
| `governance/declarations/` *(drafted default — §8 q4 OPEN)* | Declaration artifacts (capabilities, topology, regions, mappings) | Owner sign-off (RFC3-17) | owner-adopted / Syzygy-drafted |

- **There is no `governance/challenges/`**: challenge artifacts live in
  `records/` (RFC3-17(a) as rewritten under B19).
- **The comprehension walkthrough routes across three of these rows**, never
  from a stored verdict alone:
  - **fact** → `records/`;
  - **judgment** → `decisions/`;
  - **release authority** → the adopted policy in `policies/`.

```mermaid
flowchart LR
    W["Comprehension walkthrough"] -->|"fact"| R["governance/records/"]
    W -->|"judgment"| D["governance/decisions/"]
    W -->|"release authority"| P["adopted policy in<br/>governance/policies/"]
```

## The no-second-store rule [Observed: RFC4-5, two limbs]

For every mutable field of an externally owned record exactly one store is
writable and it is not Syzygy; Syzygy's own facts leave only as re-derivable
pointers.

```mermaid
flowchart LR
    subgraph In["Inward limb"]
        Ext["External store —<br/>the one writable store for the field"] -->|"current value, as evaluation-stamped,<br/>non-editable, discard-and-re-derive projection"| SyzP["Syzygy projection"]
    end
    subgraph Out["Outward limb"]
        SyzR[".syzygy/** record —<br/>stays authoritative"] -->|"derived, re-derivable pointer<br/>(e.g. warrant pointer in spec_id)"| ExtP["External store"]
    end
```

- **Inward:** for every mutable field of an externally owned record, exactly
  one store is writable and it is not Syzygy.
  - Of that field's **current value** Syzygy holds only evaluation-stamped,
    non-editable, discard-and-re-derive projections.
  - The limb governs projections of current state; it does **not** govern
    captured evidence about the past.
  - An immutable, evaluation-stamped record that a transition *occurred* is
    a historical fact about the external store, not a second source of
    truth for the field.
  - Where a durable Syzygy record depends on such a fact, RFC4-16
    *requires* its capture before the substrate's retention horizon.
- **Outward:** Syzygy-owned facts enter external stores only as derived,
  re-derivable pointers (e.g. the warrant pointer in the scheduler's
  `spec_id`, RFC4-17).
  - The `.syzygy/**` record stays authoritative.
  - Divergence is re-asserted and annotated, never merged, never
    adjudicated.
- **Schema ownership splits** [Observed: architecture.md]: the two
  namespaces have different schema owners.
  - `.syzygy/**` is Syzygy's native schema-versioned namespace
    (identity-preserving migrations only, RFC3-23).
  - `openspec/**` is written only in OpenSpec-compatible form and is outside
    Syzygy's migration authority (RFC3-26).

## [target] vs already true

All enforcement is target; the two-namespace rule and typed-authority table
are already adopted doctrine.

- **[target]:** all enforcement — the write containment, adapter
  authorization, audit trail, and migration machinery are draft contracts.
- **[Observed] today:** the two-namespace rule and typed-authority table are
  adopted doctrine (VIS-5; architecture.md) binding on any future
  implementation.
  - The boundary already governs bootstrap conduct in this repository.
- **[Inferred]:** no violation-detection tooling exists yet.
  - Until an implementation lands, the boundary is upheld by process, not
    mechanism.
