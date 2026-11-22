# Context-selection fixture 4 — security/execution-profile change

## Task

**Objective.** A governed work item: amend an execution profile (tighten
an isolation class, add a destructive-operation gate) and prepare the
owner-approval ceremony for the amendment. Risk class: security surface,
authorization-bearing (RFC5-18(c) approval; RFC5-23 lifecycle).

**Warrant.** The named execution profile; the isolation class tightened and
the destructive-operation gate added; the owner-approval ceremony being
prepared. Declared change class: security-surface, authorization-bearing.
The task prepares — does not perform — the owner act, and authors no
OpenSpec requirement.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).** Warrant names
the profile → RFC-0005 `execution-profiles` + package README
(RFC5-18..23). Profile amendment approval is an owner act → RFC-0003
`governance-homes-and-owner-acts` + README (RFC3-16(a)/(b)/(c) — under
the two-state model the approval is an owner-adopted bootstrap act until
correlation, and the packet says so). Doctrine floor → `security.md`
(SEC-3 and the execution posture). Craft duty → `security-and-secrets.md`
(secret handling in profile definitions).

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0005 and
RFC-0003 each declare `implementation_boundary: requires-openspec` (naming
RFC5-27 and RFC3-33); the declarations travel in the two loaded package
READMEs and are recorded here. The task amends a governed artifact and
prepares a ceremony — it does not sit on the OpenSpec seam — so the
boundary rule forces neither defining module (`admission-and-boundary`,
`manifests-and-namespace`).

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0005/README.md \
  rfcs/RFC-0005/execution-profiles.md rfcs/RFC-0003/README.md \
  rfcs/RFC-0003/governance-homes-and-owner-acts.md doctrine:security.md \
  craft:security-and-secrets.md
```

Measured: **15,145 words ≈ 20,446 estimated tokens.** Band position is
owned by `CONTEXT-BUDGET-REPORT.md` §1, computed from this anchored figure;
this fixture's prose makes no band claim of its own.

## Omitted applicable candidates, with reasons

- RFC-0005 `admission-and-boundary` — client admission is untouched; the
  audit-trail clause RFC5-25 that RFC3-16(b) item 9 binds is quoted at
  binding strength inside the governance-homes module the packet carries,
  and the boundary rule does not force the module for this off-seam task
  (applied rule above). `consent-egress-secrets` — no consent class or
  egress route changes.
- RFC-0008 — dispatch consumes profiles by identity; the gate text
  (RFC5-18) travels in the packet; work-surface obligations bind
  elsewhere.
- RFC-0003 `manifests-and-namespace`, RFC-0001/0002/0004/0006/0007/0009 —
  not cited by the warrant's clause set.
- RFC-0010/0011 — no mission context; a profile amendment under a
  mission's envelope would add RFC-0010 via the envelope input rule
  (RFC11-1).

## Why no applicable constraint was lost

The closed isolation and destructive-operation vocabularies (RFC5-21/22),
the profile-contents floor (RFC5-20), the approval gate (RFC5-18(c)) and
lifecycle (RFC5-23), the owner-act binding set (RFC3-16(b), nine items),
and the honest two-state render (RFC3-16(c)) are all mandatory-loaded;
both selected contracts' implementation-boundary declarations travel in
their loaded READMEs (applied rule above), and the craft security bar
rides along for the definition hygiene. Nothing in the omitted set is
cited by these clauses at binding strength.

## Suggested inferred additions (provenance: index adjacency)

RFC-0005 `admission-and-boundary` (if the ceremony's session/credential
context is in scope); RFC-0002 `rendering-vocabularies`
(`execution-blocked` reason #12 rendering downstream).

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`2994e9e995c88c9e…`.

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
The `Compiler: context_load.py, selection rules rev10-fixtures` line this
fixture used to carry was removed 2026-08-06: there is no compiler, and
`rev10-fixtures` resolved to nothing anywhere in the repository.

*Re-measured 2026-08-05 (refactor round): figures and packet digest refreshed after this round's recorded corrections to RFC-0003 governance-homes (P-6, +13 w) and the craft banners (P-7, security policy +26 w); selection unchanged. Prior figures/digest are in git history.*

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 10,893 words, digest `a56fb116fa588b9b…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; phase-boundary rule applied under amended
RFC11-4/RFC11-13; transcribed measurements removed — the anchored
`Measured:` field and the packet digest are the only measurements this
fixture states.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 11,374 words, digest `504fe65a0ea9b1c0…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*
