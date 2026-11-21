# Semantic delta U2 — which unrecorded work is orphaned, and who adjudicates a Contradiction

**Artifact(s):** the seven installed contract files below and their identical
mirrors under `contracts/candidates/rfcs/`; topology candidate
`04-authority-write-boundaries.md`; the T-18 (Challenge) cross-reference to T-19 in the
candidate `TERM-REGISTRY.md`.
**Stable IDs affected:** RFC1-21, RFC1-29, RFC2-15, RFC2-24 (reason 8's
route), RFC8-8, RFC8-10, RFC8-23, RFC8-28 (its prose naming the
`contradiction-raised` route, and its no-colour limb), RFC8-31's non-visual parity paragraph, RFC9's
chain-state limb, RFC 0008 violation case 11, the RFC 0008 README and
module summaries, and the RFC 0001 summary table row for Contradiction. No
identifier is added, retired or renumbered.
**Change class:** Normative.
**Author:** agent session, Trajectory pursuit run 2, move U2 (`syzygy-659o.2`).
**Date:** 2026-11-22

## Current meaning

Two things, both quoted exactly in the diff under "Exact text".

1. **Every unrecorded scheduler item is an orphaned-work Contradiction.**
   RFC1-29 reads "Scheduler work items matching no materialization record are
   an **orphaned-work contradiction**", and RFC8-8 and RFC8-10 repeat it with
   no condition. RFC8-23 meanwhile says "An Unknown-provenance item may be
   legitimate untraceable work — a pre-Syzygy backlog item, an import" and
   "Unknown-provenance is not orphaned work". Nothing states what makes an
   item pre-Syzygy, so the two readings cannot both be applied: read by
   RFC1-29, every one of the proving project's 10,971 tracker items (none has
   a materialization record) is an unfilterable Contradiction; read by
   RFC8-23, all are Unknown-provenance [Observed: pursuit finding B2-F3,
   `docs/pursuits/2026-11-21-trajectory-fifth-question-pursuit-data.json`].
2. **A Contradiction leaves only by owner adjudication** (RFC1-21, RFC2-15,
   RFC8-8, RFC8-23, RFC2-24 reason 8, and the summary prose in RFC 0001,
   RFC 0008 and RFC 0009).

## Proposed meaning

1. **Orphaned work is unrecorded work Syzygy created.** A scheduler work item
   matching no materialization record is an orphaned-work Contradiction when,
   and only when, it is *Syzygy-created*: the scheduler's own history
   attributes its creation to the identity Syzygy's adapter writes under
   (RFC4-17). The test reads who created the item, never what its fields
   hold, so a human-typed warrant reference cannot make an item orphaned and
   a partial materialization failure (item created, record or reference
   never written) cannot escape. An unrecorded item created by any other
   writer (pre-Syzygy backlog, an import, work filed directly in the
   scheduler) is Unknown-provenance, however old or numerous. Where the
   history names no creator, the orphan check is itself Unknown: the item
   renders Unknown-provenance with the undecided check disclosed and counted
   apart (VIS-2).
   An orphan leaves by a new materialization record citing and superseding
   the finding, or by a recorded adjudication disposing of it; after the
   latter the item renders as the adjudication says and is not minted again.
2. **A Contradiction routes to adjudication**: by an agent's recorded
   adoption, reported and open to the owner's veto, or by the owner when it
   falls in an owner class (VIS-4). These are the words doctrine uses since
   D12 (`architecture.md`, the Contradiction bullet).
3. **Separation of duties for orphans** (RFC1-29, cross-referenced from
   RFC8-8): an agent assigned to an affected item, or one that worked it,
   never adjudicates it. Marked [Inferred] in the clause; its basis is
   pursuit finding B2-F14 (the agent that did the work should not rule on
   what the work was for).

## What explicitly does NOT change

- A Contradiction still renders the affected conclusion Unknown
  (`contradicted-pending-adjudication`, `suspended` tier), is never resolved
  by precedence, and is never auto-scheduled into work.
- An orphaned-work Contradiction is still minted, rendered, exempt from
  filtering (§8 q4), never silently adopted into a record, never silently
  deleted, never read as evidence of materialization; re-materialization
  still cites and supersedes the orphan finding.
- Unknown-provenance is still counted, never green, never pooled with
  warranted work, never an ingest rejection; where an item is both, the
  Contradiction still governs.
- RFC1-29's one-way door, the constitutive record, and RFC8-10's three
  required record parts are unchanged.
- RFC4-17 is unchanged: a substrate-side edit of the warrant reference on a
  recorded item is still an annotation, not a contradiction. The new
  predicate reads the reference only on an item no record matches.
- RFC3-16's "for an owner-class artifact it also routes to the owner"
  (`RFC-0003/governance-homes-and-owner-acts.md`) is correct as is: an
  owner-class artifact is the owner's.
- RFC2-24's other eleven routes are unchanged, including the pre-D10
  wording of rows 1 and 7 (out of scope; see follow-ons).
- RFC7's walkthrough judgment ("an owner adjudication recorded in
  decisions/") is not a Contradiction route and is unchanged.
- RFC3-31's hierarchy-cycle route to the owner is unchanged (not a
  Contradiction clause).
- Candidate RFC 0010 (Mission, a deferred wave) is not edited; its one
  "owner adjudication" sentence follows when the wave is taken up.

## Warrant

- Doctrine as amended by D12 (2026-11-21, the owner's words; merged to
  main in PR 850 before this change, so RFC2-15's "[Observed —
  architecture.md]" tag holds): a contradiction
  "routes to adjudication: by an agent's recorded adoption, reported and open
  to the owner's veto, or by the owner when it falls in an owner class
  (VIS-4)". VIS-4 ("Lower rules follow this one") makes the contract's
  owner-only exit an agent adoption outside the four owner classes.
- The orphan predicate resolves an internal contradiction between RFC1-29 /
  RFC8-8 and RFC8-23 (pursuit finding B2-F3). Resolving it is a contract
  change outside the owner classes: an agent adoption.

## Evidence or decision basis

- `.syzygy/governance/doctrine/architecture.md` (Contradiction bullet, D12)
  and `.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md` row D12.
- `docs/pursuits/2026-11-21-trajectory-fifth-question-pursuit.md`, move U2,
  findings B2-F3 and B2-F14.
- RFC4-17 (`RFC-0004/named-adapters.md`), which defines the warrant
  reference the predicate reads.

## Terms introduced / retired

None. "Unknown-provenance", "orphaned-work Contradiction", "warrant
reference" and "adjudication" are existing terms; "claims" is used in its
plain sense and defined in place by RFC1-29.

## Downstream impact

Method: `git grep -n -i -E` for `owner[ -]adjudicat`, `adjudicat[a-z]* by
the owner` and `routes? (it )?to (the )?owner` over `.syzygy/` and
`openspec/` (excluding `history/`, `round-*`, `_bootstrap/`, `-RAW.md`), and
over `apps/`, `packages/`, `scripts/`; then reading each hit. Results:

- **Edited here:** every Contradiction-route hit in installed RFC 0001,
  0002, 0008 (README included), 0009 and their mirrors, topology `04`, and
  the T-18 entry's cross-reference in the candidate term registry. The first
  sweep was line-based and missed two phrases split across lines (review
  finding 3); the re-sweep is a Python `re` search over whole files with
  `\s+` between words, over `contracts/rfcs/`, `contracts/candidates/rfcs/`,
  `map/topology-candidates/` and `TERM-REGISTRY.md`. Its remaining hits are
  the three listed under "does NOT change" (RFC3-16, RFC3-31, RFC7) and
  candidate RFC 0010.
- **Generated, regenerated in this change:** `DIRECTIVE-REGISTER.md`,
  `05-CONTRACT-INDEX.yaml`, the CG-18 context fixtures that load these files
  and `CONTEXT-BUDGET-REPORT.md`.
- **Lagging, recorded and filed** (CC-REV-2's recorded-lag exception,
  CC-IMPACT-6 as amended by D10):
  - specifications that say a Contradiction "leaves only by owner
    adjudication": Capability 1 (`spec.md` scenario on served
    contradictions), the project-wide Butlers model, Polaris generation
    (orphaned-work scenarios and their design notes), and the Three-Surface
    POC limb on RFC8-23 (its `CONTRACT-COVERAGE.md` row 192), which is also
    blocked by `syzygy-k54o.5.1`;
  - code: `UNKNOWN_REASON_ROUTES['contradicted-pending-adjudication']` in
    `packages/three-surface-poc-core/src/project-shape-model.ts` still renders
    "Owner adjudication", pinned by two tests, and the contradiction
    resolution record there still carries `actor: 'owner'`;
  - follow-up item for all of the above: bead `syzygy-659o.13`;
  - Capability 1's consent route `owner-adjudication` is a consent decision,
    an owner class (SEC-2/SEC-4 consents that remain), and is correct as is.
- **Not edited (history or evidence):** candidate packages, restyle patches,
  retained reviews and round material that quote the old words.

## Migration / supersession plan

The installed files and their candidate mirrors change together (they were
byte-identical before and are after). Derived files regenerate in the same
pull request. Detection (a detector over observed items plus U4's ledger
reader) and the unfilterable rendering are later slices of U2; they
implement this text and are not part of it. No digest-bound artifact is
touched in the pre-D10 sense: an act's digest is history, not a lock
(RFC3-16 as amended).

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating, CC-REV-4 as amended).
**Reviewer:** fresh-context reviewer subagent, independent of the author
session; raw retained verbatim at `docs/reviews/R-U2-ORPHAN-PREDICATE-1-RAW.md`
(campaign `docs/review-campaigns/u2-orphan-predicate.md`). It reviewed the
first draft of this delta, sha256 `556caa1a825f5e3a…`.
**Verdict:** `REVISE` (raw, line 2): 3 blocking, 6 should-fix, 4 notes.

### Dispositions (one round; repaired once, no confirmation round)

1. *Writer-unknown rule makes human-typed references Contradictions* —
   fixed: the predicate reads creation attribution in the scheduler's
   history, never fields; a reference on another writer's item is an
   annotation; an unnamed creator makes the check Unknown, disclosed.
2. *Open, circular list of claiming records* — fixed: records are no longer
   part of the predicate; RFC1-29 "How an orphan leaves" states both exits
   and that a disposed orphan is not minted again.
3. *Missed sites* — fixed: violation case 11, the RFC 0008 module summary,
   the RFC 0008 README and RFC8-28's no-colour limb; whole-file re-sweep
   stated above.
4. *Partial failure could escape* — fixed by 1: creation attribution exists
   whether or not the reference or record was written.
5. *"Agrees with"* — fixed: "matches" throughout.
6. *D12 not on main* — resolved: PR 850 merged before this change; noted
   under Warrant.
7. *Derived files not regenerated* — fixed in the same pull request
   (register, contract index, CG-18 fixtures, budget report).
8. *"Claims" collides with Claim* — fixed: the term is "Syzygy-created",
   defined in RFC1-29.
9. *Separation rule unwarranted and in RFC8-8 only* — fixed: moved to
   RFC1-29 with an [Inferred] basis, cross-referenced from RFC8-8.
10. *Lag tracking* — fixed: bead named, `actor: 'owner'` added, T-19
    cross-reference in T-18 edited.
11. *CC-REV-2's doctrine route is correct* — agreed; unchanged.
12. *Short forms drop "reported and open to veto"* — accepted as is: each
    short form sits beside a clause (RFC1-21, RFC2-15, RFC8-8) that states
    it in full; no line labels anything owner-adopted.
13. *Passing checks* — no action.

## Exact text

The diff below is against `origin/main` at drafting time; `-` lines are
the current text, `+` lines the proposed text.

````diff
diff --git a/.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md b/.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md
index 7359fd780..c9e2c7993 100644
--- a/.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md
+++ b/.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md
@@ -1096,5 +1096,6 @@ a challenge.
 
 **Related but distinct.** Contradiction (T-19 — between authoritative claims,
-exits only by owner adjudication); Gap (T-20); Inferred state (T-10).
+exits only by adjudication: an agent's recorded adoption, or the owner in an
+owner class); Gap (T-20); Inferred state (T-10).
 
 **Example.** An inference process challenges one Aligned claim, citing a
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md b/.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md
index 2903d3b20..f81091933 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md
@@ -74,6 +74,7 @@ deliberate non-reification.
   way at acceptance (`declared-dependency` A6, `placed_in` A7).
 - **Conflicts surface, never resolve themselves.** Two governance roots, two
-  placements, orphaned work: contradictions for owner adjudication, never
-  silently repaired.
+  placements, orphaned work: contradictions for adjudication (an agent's
+  recorded adoption, or the owner in an owner class), never silently
+  repaired.
 
 **Also fixed here:**
@@ -215,5 +216,5 @@ profile (RFC1-7) or an amendment to this RFC.
 | | Claim | Kernel (derived, two-level — §3.5) | The only carrier of status |
 | | Gap | Kernel (derived, two-level — §3.5) | V0 surfaces absence; V1 computes gaps |
-| | Contradiction | Kernel (derived, two-level — §3.5): declared scope + canonically ordered durable identities of the cited claims | Owner-adjudicated only; RFC1-18(b) |
+| | Contradiction | Kernel (derived, two-level — §3.5): declared scope + canonically ordered durable identities of the cited claims | Adjudicated only (an agent's adoption row, or the owner in an owner class — VIS-4); RFC1-18(b) |
 | | Challenge | The declared inference process, **or an attributed human via the governance plane** (RFC2-12); identity bound to one exact claim | V0 carries the admissibility floor only |
 | Proposal / work | Proposal | Author (owner, agent, worker); the authority-scoped, collision-free scheme is a named **RFC 0003 obligation** (RFC1-9) | Kinds incl. **execution intent** (the plan item, §3.8) |
@@ -470,7 +471,8 @@ renders the gap again — expiry acts only through a new identified evaluation
 
 **RFC1-21.** A **Contradiction** (co-unsatisfiable authoritative claims in one
-declared scope) renders the affected conclusion Unknown, routes to owner
-adjudication, is never resolved by precedence, and is **never auto-scheduled
-into work**. A **derived gap is not a work warrant**: it motivates work only
+declared scope) renders the affected conclusion Unknown, routes to
+adjudication — by an agent's recorded adoption, reported and open to the
+owner's veto, or by the owner when it falls in an owner class (VIS-4) — is
+never resolved by precedence, and is **never auto-scheduled into work**. A **derived gap is not a work warrant**: it motivates work only
 through a confirmation act — a Decision or a declared deterministic Policy —
 because doctrine's warrant list admits a *confirmed* finding and
@@ -790,10 +792,32 @@ instant is fixed at the record, not at the issuance: **until the record
 exists, materialization has not occurred**, and the approved Proposal remains
 the sole authority for the state of the planned work, whatever the scheduler
-already holds. Scheduler work items matching no
-materialization record are an **orphaned-work contradiction** (§3.5) — two
-stores answering one question, no pinned intent revision for RFC2-18 to bind
-to, no warrant traceable through `materializes` — routed to owner adjudication
-and **rendered**, never silently adopted into a record, never silently
-deleted, and never read as evidence that materialization happened.
+already holds.
+
+**Which unrecorded work is orphaned.** A scheduler work item matching no
+materialization record is an **orphaned-work contradiction** (§3.5) **when,
+and only when, it is Syzygy-created**: the scheduler's own history
+attributes the item's creation to the identity under which Syzygy's adapter
+writes (RFC4-17). Such an item is two stores answering one question, with no
+pinned intent revision for RFC2-18 to bind to and no warrant traceable
+through `materializes`. It is routed to adjudication (RFC1-21) and
+**rendered**, never silently adopted into a record, never silently deleted,
+and never read as evidence that materialization happened. A work item the
+scheduler's history attributes to any other writer — pre-Syzygy backlog, an
+import, work filed directly in the scheduler — is **Unknown-provenance**
+(RFC8-23), not orphaned work, however old or numerous it is, and whatever
+its fields hold: a warrant reference on such an item is a substrate
+annotation (RFC4-17), never a claim of materialization. Where the history
+names no creator for an item, whether it is orphaned is itself Unknown: it
+renders Unknown-provenance with that undecided check disclosed and counted
+apart, never green.
+
+**How an orphan leaves.** Adjudication ends the contradiction in one of two
+ways: a new materialization record that cites and supersedes the orphan
+finding, or a recorded adjudication that disposes of the item otherwise.
+In the second case the item renders as that adjudication says and cites it,
+and is not minted as a new contradiction at the next evaluation. An agent
+assigned to an affected item, or one that worked it, never adjudicates it
+[Inferred: it keeps the agent that did the work from ruling on what the
+work was for].
 Re-materialization after a partial failure must **cite and supersede the
 orphan finding** in the new materialization record, so a retry is traceable
@@ -808,5 +832,6 @@ flowchart LR
     P -->|"Materialization record written:<br/>proposal identity, work-item identities,<br/>pinned intent revision"| M["Proposal: materialized (terminal)"]
     M --> S["Scheduler, through its typed adapter<br/>(authority for work lifecycle state)"]
-    O["Scheduler work items matching<br/>no materialization record"] --> C["Orphaned-work contradiction:<br/>rendered, routed to owner adjudication"]
+    O["Syzygy-created scheduler work item<br/>(creation attributed to the adapter),<br/>matching no materialization record"] --> C["Orphaned-work contradiction:<br/>rendered, routed to adjudication"]
+    U["Scheduler work item created by any other writer,<br/>matching no materialization record"] --> K["Unknown-provenance (RFC8-23):<br/>counted, never green"]
 ```
 
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md b/.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md
index df9b8ecc0..fb7f09949 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md
@@ -81,6 +81,7 @@ authoritative claims in one declared scope that cannot simultaneously be
 satisfied (across or within typed authorities): it renders the affected
 conclusion Unknown (reason `contradicted-pending-adjudication`, `suspended`
-tier), routes to owner adjudication, is never resolved by precedence, never
-auto-scheduled into work. A **gap** is compatible desired state not yet
+tier), routes to adjudication — by an agent's recorded adoption, reported and
+open to the owner's veto, or by the owner when it falls in an owner class
+(VIS-4) — is never resolved by precedence, never auto-scheduled into work. A **gap** is compatible desired state not yet
 realized in observed state. [Observed — architecture.md.] A gap leaves a
 surface in exactly two non-interchangeable ways: **factual resolution or
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md b/.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md
index 763274ddc..10efba78f 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md
@@ -135,5 +135,5 @@ requirement.]
 | 6 | `unconsented-source-or-provider` | SEC-2/SEC-4 consent absent or withdrawn for a needed repository or model provider | Record consent |
 | 7 | `excluded-content` | Secret-detection policy excluded the content, or it was unclassifiable (fails closed, SEC-5) | Policy change by the owner, or accept the exclusion |
-| 8 | `contradicted-pending-adjudication` | An unresolved contradiction touches the conclusion | Owner adjudication |
+| 8 | `contradicted-pending-adjudication` | An unresolved contradiction touches the conclusion | Adjudication: an agent's recorded adoption, or the owner in an owner class (VIS-4) |
 | 9 | `challenge-suspended` | An open admitted challenge conservatively suspends the claim (RFC2-8) | Challenge resolution (RFC2-13) |
 | 10 | `source-uncaptured-or-unreachable` | A deterministic input capable of affecting the claim was not captured in the snapshot (RFC2-2), including observer failure and unreachable sources | Repair the observer/source; new snapshot |
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0008/README.md b/.syzygy/governance/contracts/rfcs/RFC-0008/README.md
index 1c1894d51..42a808f51 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0008/README.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0008/README.md
@@ -107,6 +107,6 @@ package.
     - a board that cannot answer "what did the fleet change, at what cost,
       under whose authority" for a past window.
-  - **A scheduler work item with no materialization record is a
-    Contradiction, not a badge**, whose only lawful exit is owner
+  - **A Syzygy-created scheduler work item with no materialization record
+    is a Contradiction, not a badge**, whose only lawful exit is
     adjudication (module 1, RFC8-8/8-10).
   - **Work renders through a closed thirteen-value normalized state
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md b/.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md
index 0e33b6383..89f1fc424 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md
@@ -145,9 +145,15 @@ ingest rejection (RFC4-10).
 
 - An Unknown-provenance item may be legitimate untraceable work — a
-  pre-Syzygy backlog item, an import — and its route is *surface it*:
-  counted, never green, resolvable by supplying a warrant.
-- An **orphaned work item** is two stores answering one question (RFC8-8;
-  RFC1-29), and its **only** lawful exit is owner adjudication (RFC1-21;
-  RFC2-15).
+  pre-Syzygy backlog item, an import, any unrecorded work item created by a
+  writer other than Syzygy's adapter (RFC1-29) — and its route is *surface it*: counted, never green,
+  resolvable by supplying a warrant.
+- An **orphaned work item** is a Syzygy-created one that no materialization
+  record matches: two stores answering one question (RFC8-8; RFC1-29).
+  Its **only** lawful exit is adjudication (RFC1-21; RFC2-15; RFC8-8).
+- **What separates them is who created the item, never its age, its
+  fields or the backlog's size** (RFC1-29). An unrecorded item the
+  scheduler's history attributes to another writer is Unknown-provenance
+  however many such items there are, even when it carries a warrant
+  reference; supplying a warrant resolves it.
 - Rendering one as Unknown-provenance mis-routes it, skips minting the
   Contradiction, and skips RFC2-15's Unknown rendering of the affected
@@ -293,5 +299,5 @@ different answers and **must never share a rendering**.
   scheduler-state repair never shares a field, count, or UI string with it —
   and the same reservation binds `unsatisfied` (a gap) against
-  `contradiction-raised` (a Contradiction, owner adjudication only), which
+  `contradiction-raised` (a Contradiction, adjudication only), which
   Trajectory must never merge into one count or one badge (RFC2-17; RFC4-6).
 
@@ -313,5 +319,5 @@ mark, a mark's colour, a count, or a legend entry**.
   only colour carries is not a distinction under RFC6-22/23's parity test.
 - Two differently-coloured badges do not discharge this clause: the reader on
-  the surface that routes a gap to work and a Contradiction to owner
+  the surface that routes a gap to work and a Contradiction to
   adjudication alone must be able to tell them apart **without colour**, by
   label, text, or structure.
@@ -372,5 +378,5 @@ still lacks reconciliation") are endpoint-answerable at a named evaluation.
 left to the sibling surfaces.** Polaris binds it at RFC7-33/34; no doctrine
 clause distinguishes surfaces, and this surface's distinctions are the ones
-routing a reader to work or to owner adjudication. Two limbs, both binding:
+routing a reader to work or to adjudication. Two limbs, both binding:
 
 - **Recoverable without colour, position, or layout.** Every normalized work
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md b/.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md
index 2af055f37..0cf6547fa 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md
@@ -39,6 +39,6 @@ This module decides what work exists, under whose authority, and which store
 is allowed to say so. Two rules carry most of the weight: **Trajectory never
 holds a second editable store of a scheduler-owned field** (RFC8-2(a),
-RFC8-7, RFC8-11), and **a scheduler work item with no materialization record
-is a Contradiction, not a badge** (RFC8-8, RFC8-10).
+RFC8-7, RFC8-11), and **a Syzygy-created scheduler work item with no
+materialization record is a Contradiction, not a badge** (RFC8-8, RFC8-10).
 
 - **What it owns:** what Trajectory is, what it may never become, what it is
@@ -60,6 +60,8 @@ is a Contradiction, not a badge** (RFC8-8, RFC8-10).
     read at the answering evaluation and re-derived, never merged; capturing
     that a transition *occurred* is a different, permitted act.
-  - **Orphaned work is a Contradiction.** It is routed to owner adjudication
-    as its only lawful exit, never filtered, never absorbed as ordinary work.
+  - **Orphaned work is a Contradiction.** Syzygy-created work that no
+    materialization record matches is routed to adjudication as its only
+    lawful exit, never filtered, never absorbed as ordinary work; unrecorded
+    work created by any other writer is Unknown-provenance (RFC8-23).
 - **Neighbours in the package:**
   - The normalized work-state vocabulary this module's enumerations feed is
@@ -223,9 +225,14 @@ state) — enumerable, never counted among approved intent, never anchoring any
 remaining-work total.
 
-**Orphaned work is a Contradiction, not a badge.** A scheduler work item
-matching **no materialization record** is an **orphaned-work Contradiction**
-(RFC1-29, final paragraph): two stores answering one question, no pinned
-intent revision for RFC2-18 to bind to, no warrant traceable through
-`materializes`.
+**Orphaned work is a Contradiction, not a badge.** A **Syzygy-created**
+scheduler work item (its creation attributed, in the scheduler's own history,
+to the identity Syzygy's adapter writes under — RFC4-17) matching **no
+materialization record** is an **orphaned-work Contradiction** (RFC1-29,
+"Which unrecorded work is orphaned"): two stores answering one question, no
+pinned intent revision for RFC2-18 to bind to, no warrant traceable through
+`materializes`. An unrecorded item created by any other writer is
+Unknown-provenance (RFC8-23), never this Contradiction; one whose creator the
+history does not name renders Unknown-provenance with the orphan check
+disclosed as undecided.
 
 - Trajectory is the only surface enumerating scheduler work items, so the
@@ -233,6 +240,9 @@ intent revision for RFC2-18 to bind to, no warrant traceable through
   - perform the check;
   - mint the Contradiction (RFC1-5/RFC1-18(b));
-  - route it to **owner adjudication as its only lawful exit** (RFC1-21;
-    RFC2-15);
+  - route it to **adjudication as its only lawful exit** (RFC1-21;
+    RFC2-15): an agent's recorded adoption, reported and open to the
+    owner's veto, or the owner's decision when it falls in an owner class
+    (VIS-4), by an agent neither assigned to nor working any affected item
+    (RFC1-29, "How an orphan leaves");
   - render the affected conclusion Unknown (reason #8
     `contradicted-pending-adjudication`, `suspended` tier);
@@ -292,8 +302,9 @@ directions.
   `.syzygy/work/**` plan state is never rendered as current for a
   materialized item.
-- **A missing record is a finding, not a silent skip:** a scheduler work item
-  matching no materialization record is the orphaned-work Contradiction,
-  handled per RFC8-8 — never absorbed as ordinary work, never treated as
-  evidence that materialization occurred.
+- **A missing record is a finding, not a silent skip:** a Syzygy-created
+  scheduler work item no materialization record matches is the orphaned-work
+  Contradiction, handled per RFC8-8; one created by any other writer is
+  Unknown-provenance (RFC8-23). Neither is ever absorbed as ordinary work or
+  treated as evidence that materialization occurred.
 - Until the record exists, materialization has not occurred, whatever the
   scheduler holds (RFC1-29).
@@ -310,5 +321,6 @@ flowchart LR
   P <--> R
   R <--> W
-  X["Scheduler work item matching<br/>no materialization record"] --> C["Orphaned-work Contradiction<br/>owner adjudication only (RFC8-8)"]
+  X["Syzygy-created scheduler work item,<br/>matching no materialization record"] --> C["Orphaned-work Contradiction<br/>adjudication only (RFC8-8)"]
+  Y["Scheduler work item created by another writer,<br/>matching no materialization record"] --> K["Unknown-provenance<br/>(RFC8-23)"]
 ```
 
@@ -341,8 +353,10 @@ and are never renumbered. Cases 4 and 12 span modules and are held in
 3. *(RFC8-8)* "What remains" counts drafted proposals among approved intent,
    or omits items whose plane could not be determined.
-11. *(RFC8-8/10)* A work item with no materialization record rendered as
-    ordinary open work, or as an Unknown-provenance badge filtered off the
-    board with only a count disclosed — no Contradiction minted, no
-    adjudication route, the affected conclusion never rendered Unknown.
+11. *(RFC8-8/10)* A Syzygy-created work item with no materialization
+    record rendered as ordinary open work, or as an Unknown-provenance badge
+    filtered off the board with only a count disclosed — no Contradiction
+    minted, no adjudication route, the affected conclusion never rendered
+    Unknown. *(Amended by U2: an unrecorded item created by another writer is
+    Unknown-provenance, and rendering it so is not this violation.)*
 
 ---
diff --git a/.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md b/.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md
index 1b25efb35..c1ba78c8e 100644
--- a/.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md
+++ b/.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md
@@ -282,5 +282,5 @@ other. The overlay consumes and renders both:
     mark, a mark's color, a count, or a legend entry** (RFC8-28); an
     `unsatisfied` mark and a `contradiction-raised` mark are never merged into
-    one, since one routes to a gap and the other to owner adjudication alone.
+    one, since one routes to a gap and the other to adjudication alone.
   - A district rendering normalized `merged` while dropping the chain state has
     shown scaffolding removed and concealed that nothing was reconciled — the
diff --git a/.syzygy/map/topology-candidates/04-authority-write-boundaries.md b/.syzygy/map/topology-candidates/04-authority-write-boundaries.md
index 966bfd637..c50708499 100644
--- a/.syzygy/map/topology-candidates/04-authority-write-boundaries.md
+++ b/.syzygy/map/topology-candidates/04-authority-write-boundaries.md
@@ -63,6 +63,7 @@ source of truth.
 | What does Syzygy display? | A rebuildable projection of all the above (VIS-6) |
 
-- A contradiction between typed authorities routes to owner adjudication,
-  never precedence.
+- A contradiction between typed authorities routes to adjudication — an
+  agent's recorded adoption, or the owner in an owner class (VIS-4) — never
+  precedence.
 
 ## Governance categories and write-authority classes *(added at the rev7 rework)*
````
