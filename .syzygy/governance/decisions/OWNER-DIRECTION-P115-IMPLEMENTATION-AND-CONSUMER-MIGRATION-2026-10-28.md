# Owner direction — P115 implementation and owned machine-consumer migration

Date: 2026-10-28
Owner: Tzeusy
Decision ID: OWNER-DIRECTION-P115-IMPLEMENTATION-AND-CONSUMER-MIGRATION-2026-10-28

## Owner selection and source

[Observed] In the authenticated attended owner conversation on 2026-10-28,
the owner answered, verbatim: **A**. This selects
**A — Authorize the reviewed packet (Recommended)** for decision
`P115-IMPLEMENTATION-20261027-R1`. Recording time (UTC):
`2026-10-28T00:08:15.555202+00:00`. A separate message timestamp was not supplied;
this instant records transcription, not the time of the owner's message.

The actual question was:

> Authorize the reviewed P115 implementation packet: one protected PR updating the machine response, four owned readers and verification, preserving the signed specification and 16 MiB ceiling? A also authorizes recording the direction and preparing the implementation handoff; live probes, restarts and deployment remain excluded. The existing P115 sign-off explicitly grants no implementation authority, so this is a separate decision.

The other offered options were B — Defer implementation and C — Revise the scope.
The selected packet is `p115-implementation-packet-2026-10-27-r1`.
Its exact packet, owned files, test plan, questionnaires, original manifest,
and actual answer are retained under
`docs/evidence/p115-implementation-authorization-2026-10-28/`.
The independent raw review is `docs/reviews/R-P115-IMPLEMENTATION-OWNER-OFFERING-RAW.md`.
`RETENTION.json` identifies the selected copies; historical prepared banners
remain unchanged. The fresh owner-offering review's verdicts are
**Scope verdict: Pass** and **Recommendation verdict: Pass**.
This is a plain implementation direction: no new specification signature,
version tag or aggregate acceptance-act entry. It does not reuse the earlier
P115 specification-signoff selection. The dedicated v1.0 sign-off record
continues to own the specification binding.

## Bounded authorization

I authorize implementation of exactly the signed
three-surface-poc-governedby-reference-amendment-v1.0 specification,
including the applied POC-REQ-014 wire contract, and the atomic migration
of the owned source consumers in the named packet. The implementation
uses one logical PocModel and a machine-only closed representation:
one complete governing-intent Unknown at workItems.governedBy and each
served item's governedBy exactly {"ref":"observation"}. Each reference
resolves one local hop in the same body and observation. Complete item
populations/order, separate claim/entity/relationship records, identities,
Unknown reasons/routes/action fields and human N/R/outside rendering are
preserved. No inline compatibility fallback or cross-body/default/cache
resolution is authorized.

The producer validates before 200 or 304, computes response/cache identity
over the actual wire representation, and applies the existing final
encoded UTF-8 ceiling. Invalid forms use the exact bounded POC-REQ-014
503 failure; owned consumers reject them with the explicit fault before
deriving any claims or totals. Observed empty and Unknown observation
remain distinct. The current 16 MiB machine ceiling and all other limits,
credential admission and cause-correct refusal semantics remain in force.

I authorize the attended coordinator to create one cohesive implementation
bead from the complete draft under syzygy-rrrd after refreshing canonical
dedupe/dependencies/ownership, and one implementation lane/PR for the
named owned files. Shared-model WIP remains one. The approved work may
perform fixture-only focused tests, required exact-head CI, documentation
updates and the ordinary independent review/protected merge workflow.
The direction must be on main before the implementation lane starts.
Additional owned paths require an explained reviewed scope refresh;
any specification, doctrine, contract, consent, policy, registry,
privacy/retention, read or egress change requires a new owner act.

## Exclusions and completion

This authorizes no signed-byte edit, package regeneration, recorder act,
new version tag, intent adoption, new observation column/content class,
title/description/design read, warrant edge/orphan detection, reference
framework, second truth store, readiness-arm or verdict change, external
consumer modification, provider call, unattended coordination, private
runtime/body read, live 7478 probe, service restart, deployment or release.
Historical captures and bound evidence are preserved unchanged. Source
rollback is complete/attended and discloses any restored specification
gap; it is not an automatic runtime downgrade or conformance claim.

The fixture-only outcome closes when the exact-head protected change and
owned-consumer migration land with the named independent behavior/cache/
ceiling/parity tests and operator documentation. Runtime conformance,
actual payload savings, active service state and external consumer
compatibility remain Unknown until separately authorized verification.

## Withdrawal

A later owner direction may narrow or withdraw this authorization;
withdrawal defeats grant. B or C grants no implementation authority.
