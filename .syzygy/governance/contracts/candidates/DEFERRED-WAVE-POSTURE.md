# Deferred-wave posture — Waves C1, C2, D1, D2

> **Current statement, owner-directed (launch-closure pass, 2026-08-10).**
> The launch target is **Capability 1 — Project registration and honest
> shape visibility**, whose contract prerequisite is **Waves A + B only**.
> The four waves below are **visibly deferred**: candidate, not accepted,
> not used by the launch target, excluded from default task routing except
> where a route explicitly inspects these candidates. Deferral is a
> disclosed posture, never a quiet one — this file is the disclosure.
> Nothing here retires, rejects, or diminishes any wave; every deferral
> ends by owner decision.

## The posture, per wave

Each wave is deferred because Capability 1 does not need it; each carries
disclosed `REVISE` findings, and each repair waits on a named owner decision
or on launch-scope priority alone.

| | Why deferred | What remains defective (disclosed, not hidden) | Owner decision gating repair |
|---|---|---|---|
| **C1** — Context Packet identity/provenance (RFC-0011 module 1 + index) | Capability 1 does not compile context packets; Capability 2 does | RD-11/RD-22 `REVISE` findings undisposed-in-bytes: RFC11-12's stale coverage range (blocking), inferred layer inside the single digest, "mandatory context" defined only across the C2 seam, interval posture carried by README prose | none — repairs draftable now; deferred by launch-scope priority only |
| **C2** — deterministic Context selection (RFC-0011 module 2) | Same; selection policy is Capability 2's prerequisite | RD-12/RD-23 `REVISE` findings: the module's own acceptance criterion exists nowhere (101-file sweep), fixtures outside every manifest, goldens contradicting three of six clauses, RFC11-15 metadata 0-of-66 satisfiable | **P-29** (reproduction standard) and **P-32** (ownership metadata) |
| **D1** — Mission prevention plane (RFC-0010 modules 1/2/3/5 + index) | Capability 1 registers projects and renders shape; it runs no missions | RD-13/RD-20 `REVISE` findings: stop/completion guarantees stranded on the D2 side, cap-lift not conditioned on the correction plane, `failed` without an in-wave producer | **P-30** (form of the stop/containment repair — shapes the whole batch) |
| **D2** — Mission effects/recovery (RFC-0010 module 4) | Same | RD-14/RD-21 `REVISE` findings: RFC10-20's trigger closed to human acts while the plane's own machinery mints `failed`, reservation released in full on failure | **P-30** (one design across D1+D2) |

Also deferred from Capability 1, by the same direction:

- the **P-29** C2 reproduction criterion;
- **P-30** Mission stop/containment form;
- **P-32** context ownership metadata;
- the **D3/D4** Mission doctrine questions *(marked 2026-11-21: D3 is
  withdrawn by the owner as superseded by D10, `decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`)*;
- Mission effect/recovery semantics;
- deterministic Context selection as a capability.

## What the deferred waves may not influence

The deferred waves may not shape accepted meaning, default navigation, or
the launch-gate evidence.

1. **Accepted semantics.** No accepted Wave A/B clause may silently
   depend on C/D text.
   - Wave A's references into RFC-0010/0011 are explicitly staged (they
     name the wave that must bind first).
   - Wave B's former clause-level reliance (RFC9-8(a) → RFC10-15) is
     redrafted at round-2026-08e to a Wave-A-grounded governance store with
     a staged successor note.
   - A staged reference is dormant, not governing.
2. **Default navigation.** No default reading or task route ends in a
   C/D candidate.
   - The one lawful exception: a route whose *question is* a deferred-wave
     candidate (e.g. "change what counts as a completed Mission") routes to
     the candidate **explicitly labelled deferred** — singular, current, and
     explicit, never implicit.
3. **The launch-gate evidence.** Under the launch-gate instrument's §8
   launch scope (version per the instrument's own `effective_version:`
   header — no version is quoted here, so a bump cannot strand this
   sentence; RD34-05), a defect living only in these candidates blocks the
   Capability 1 verdict only if it escapes this containment:
   - default route;
   - required-wave meaning;
   - launch-target dependency;
   - current-truth misstatement;
   - owner comprehension.

   Escapes are findings against *this file's* claims — report them, never
   absorb them.

## Which future capability requires them

Capability 2 needs C1 and C2; Mission specification needs D1, and
effect-bearing Mission operation needs D2.

| Wave | First capability that needs it |
|---|---|
| C1 + C2 | Capability 2 — deterministic context packet generation |
| D1 | Mission specification (post-sequence; V0 propose-only per packet 3) |
| D2 | Mission effect-bearing operation (V1 per packet 3) |

## Which current routes must avoid them

Every route except the deferred-labelled ones avoids them.

- **The generated task router (`TASK-ROUTER.md`)** is the single routing
  authority-of-navigation.
  - Its Mission and context-selection task classes route to these
    candidates with the `deferred` label; no other route reaches them.
- **The reader-map roles for Capability 1 work** cite Waves A/B material
  only.

## Standing rule

**No C/D wave act is offered while this posture stands.**

- **The record stays frozen:** these waves' raw reviews, dispositions, and
  manifests remain exactly as recorded (verification rule 10).
- **Repairs come later:** they land in a later pass under the P-29/P-30
  rulings, each followed by scripted regeneration and a fresh confirming
  review, exactly as Waves A/B in this pass.
