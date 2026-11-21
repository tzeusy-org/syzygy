---
name: heart-and-soul
description: >
  CRITICAL — Load Syzygy's adopted doctrine before making architectural decisions,
  drafting RFCs or specs, proposing features, or rendering any project truth. Doctrine
  lives at .syzygy/governance/doctrine/ (NOT about/ — this repo uses the .syzygy canon):
  rules VIS-1..VIS-7 and SEC-1..SEC-5, the three-state thesis, the evidence and temporal
  model, and the V0/V1 boundary. Selectively load ONLY the documents relevant to the
  current task. Use proactively at the start of substantive work and whenever a claim,
  status, write boundary, or scope question arises.
---

# Syzygy Doctrine — Heart and Soul

Adopted project doctrine lives at **`.syzygy/governance/doctrine/`** (owner
adoption 2026-07-30, tag `doctrine-adopted-2026-07-30`). It is constitutional:
every RFC, spec, topology decision, and work plan must serve it. This repo
deliberately has **no `about/` tree** — never scaffold or mirror one.

**Do NOT load all files at once.** Select only what the task requires.

## Document Index

| File | Read when... | Key content |
|------|-------------|-------------|
| `.syzygy/governance/doctrine/README.md` | First contact; vocabulary questions | Glossary (governance root, two-namespace plane, codenames), rule namespaces, reading order |
| `.syzygy/governance/doctrine/vision.md` | Scope/identity questions; any "should Syzygy do X" | Owner transformation, three-state thesis ("work is never proof"), is/is-not, **VIS-1..VIS-7**, north star, fleet mandate, falsifier |
| `.syzygy/governance/doctrine/v1.md` | Scoping anything V0/V1; deferral questions | V0 increments, V0/V1 gap boundary, deferrals, platform, success tests |
| `.syzygy/governance/doctrine/architecture.md` | Namespace/write/authority questions; graph, snapshot, or freshness semantics | Governance-root invariant, two-namespace plane, `.syzygy/` layout + reserved categories, typed authority, closed snapshot + temporal model, kernel + three surfaces, frozen vocabulary |
| `.syzygy/governance/doctrine/trust-and-evidence.md` | Any status, evidence, label, or link question | Evidence definition, Observed/Inferred/Unknown, gap exits, inference-as-challenge, staleness, trust floor incl. the internal-link rule |
| `.syzygy/governance/doctrine/security.md` | Auth, exposure, egress, writes, secrets, execution | SEC-1..SEC-5 (browser vs machine clients; egress only to a declared provider; observed code untrusted; writes into others' repositories need the owner's consent; secrets fail closed) |

## Adjacent authoritative layers

- Owner decisions: `.syzygy/governance/decisions/` — start with
  `SURFACE-DECISION-RECORD.md` (SDR-1..33, surface charter, V0-core
  vocabulary). Cite `SDR-n`.
- Accepted design contracts (once accepted): `.syzygy/governance/contracts/`.
- `_bootstrap/**` is historical, non-authoritative process material — never
  cite it as doctrine.

## Non-Negotiable Rules (cite by identifier; full text in vision.md/security.md)

1. VIS-1 comprehensible truth, never comprehensible fiction.
2. VIS-2 no evidence → Unknown (never green, never zero).
3. VIS-3 human interpretability; fresh-reader review.
4. VIS-4 (as amended by D10) the owner decides doctrine and four owner classes (secrets, writes into others' repositories, exposure beyond the tailnet or release); agents adopt everything else with a row in `decisions/AGENT-ADOPTIONS.md`, open to veto.
5. VIS-5 direct writes only in `openspec/**` + `.syzygy/**`; adapters elsewhere.
6. VIS-6 derived with two closed exceptions; dismissals carry reason + expiry.
7. VIS-7 trustworthy observatory — deterministic identity, faithful legends, resolvable links.
8. SEC-1..SEC-5 authenticated by default; content leaves only for a declared provider; observed code untrusted (sandboxed); writes attributed and revertable, consented by the owner only for repositories the owner does not own; secrets fail closed.
