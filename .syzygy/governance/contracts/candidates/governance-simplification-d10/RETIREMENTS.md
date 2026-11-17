# D10 — retirements and supersessions

Every lower-level clause, act, direction or decision that requires an owner
act for something D10 makes agent-decided, with its fate. This file is bound
by the package manifest, so the owner's act adopts it as the register of what
D10 retires.

Fates:

- **Amended** or **retired** — the clause keeps its identifier and takes new
  text, or reads "Retired by GOVERNANCE-SIMPLIFICATION-D10", in a successor
  file under `proposed/` that the act installs.
- **Superseded** — from adoption, VIS-4's sentence "Lower rules follow this
  one" governs: an agent adoption satisfies the clause's owner act. The text
  is not edited here; the follow-on item named in `FOLLOW-ON.md` (F-n)
  rewrites it as ordinary agent work.
- **History** — a performed act record stays as it is. The gate it satisfied
  is no longer required, and the bytes it bound are not edited by D10.

"Bound" means the file's current sha256 is a row of a performed act's
manifest. [Observed: a Python scan of the 63 tracked `*MANIFEST*.txt` files
for each file's current sha256 and path, at the commit this package was built
on.] Under RFC3-16 as amended, a performed act's digest is history, not a
lock, so a superseded bound file may be rewritten by a later agent adoption.

## Why these five successor files, and no others

A successor is needed where bound text *defines* who adopts what or the
consent classes, because those clauses would otherwise contradict VIS-4 on
the day of adoption and RFC3-16 is itself the rule that locks bound bytes.
Five files carry a defining clause. Every other bound clause that *uses* an
owner act, a sign-off or a consent is read through the reading rule the
RFC3-16 successor adds ("How other clauses read this one"), from adoption
day, and its text is rewritten by follow-on work; the sweep below lists
every one.

| Successor (installed at the same path) | Bound by | Needed because |
|---|---|---|
| `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`, and its mirror under `contracts/candidates/rfcs/` | `ACTIVE-CONTRACT-MANIFEST.txt`; `contract-readability-restyle/CONTRACT-AMENDMENT-MANIFEST.txt` | RFC3-16 is the digest-bound act rule and the bound-bytes lock; it must change in the same act that ends it |
| `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`, and its mirror | `ACTIVE-CONTRACT-MANIFEST.txt`; `contract-readability-restyle/CONTRACT-AMENDMENT-MANIFEST.txt` | RFC3-6 and RFC3-7 define the declaration's consent records (observation, egress, execution and write consent) that VIS-4, SEC-2 and SEC-4 now reduce to write consent for repositories the owner does not own (review finding R-1) |
| `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`, and its mirror | `ACTIVE-CONTRACT-MANIFEST.txt`; `rfc5-project-documentation-class/CONTRACT-AMENDMENT-MANIFEST.txt` | RFC5-12 to RFC5-16 define the per-repository observation, per-provider egress and execution consent classes that SEC-2 and SEC-3 now drop |
| `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` | `spec-policy-readability-restyle/SPEC-POLICY-AMENDMENT-MANIFEST.txt` | CC-SPEC-10 is the rule that specs are adopted by the owner at an exact digest |
| `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md` | the same manifest | CC-IMPACT-6 routes any lag to an owner act, and CC-IMPACT-7 pins a fixture by digest that "may not be edited" |

Behavioral specifications (PWB-REQ-005, REQ-polaris-generation-033 and -046,
CAP1-REQ-011) are left to follow-on work: they implement the consent model
but do not say who decides, and after D10 an agent may amend them.

## Every bound clause that still asks for an owner act, consent or sign-off

Review finding R-1 asked whether any bound clause outside the successor files
still demands an owner act, consent, sign-off or record for something outside
the four owner classes. [Observed: a Python sweep at the commit this package
was built on; it hashes every tracked file and looks for the hash among the
manifest rows, so a file is in the population only while its current bytes
are bound.]

- Population: every tracked file whose current sha256 is a row of one of the 63 tracked `*MANIFEST*.txt` files, performed or only prepared (this package's own manifest excluded; a prepared manifest only widens the population): 157 files, 51,627 lines.
- Predicate, case-insensitive: `owner[- ]acts?\b|sign-?off|signs? off|signed off|consent|owner decision|owner-adopted|owner adopts|owner's (?:decision|act|choice|ruling)|approved? by the owner|owner approv|owner ruling`.
- Result: 2,005 matching lines in 136 files; 21 files have none.

| Category | Files | With a hit | Matching lines | Fate |
|---|---|---|---|---|
| S — D10 successor files | 8 | 8 | 411 | Amended in place: the act installs the successor (§A) |
| C — Other contract modules and package READMEs (both copies) | 63 | 63 | 909 | Superseded at adoption by RFC3-16's reading rule in the successor ("How other clauses read this one"): an "effective owner act", owner decision, ruling or sign-off reads as an adoption record; an observation or egress consent reads as RFC3-7 and RFC5-12 as amended. Text rewritten by F-6 |
| P — Behavioral specifications, their change packages, and signed successor copies of them | 60 | 40 | 420 | Superseded at adoption by VIS-4 ("Lower rules follow this one"; reading needs no record). Text rewritten by F-1 and F-2; the code keeps enforcing it until then |
| I — Consent, statement and in-force records that performed acts bound | 11 | 11 | 108 | History. The classes they instance are retired (observation, egress statement, D9 and RFC7-20 binds, own-repository write consent); write consent for other people's repositories stays (SEC-4) |
| J — Registry entries and the screening policy (JSON) | 6 | 6 | 90 | Registry entries: superseded, reader identity becomes a build fact (F-4). Screening policy: unchanged; agent-maintained, weakening it is the owner's (SEC-5) |
| H — Decisions, act packages, owner packets and manifests | 9 | 8 | 67 | History. Owner rulings stay in force as decided; a later change to what they decided is an agent adoption, or the owner's in an owner class |
| Total | 157 | 136 | 2005 | |

Contract clauses with a matching line (installed copy where one exists; the candidate mirror is byte-identical), each superseded by the reading rule unless it is in §A:

- `RFC-0010/budget-reservation.md (candidate only)`: RFC10-17 (1), RFC10-17(a) (1).
- `RFC-0010/effects-recovery-and-stop.md (candidate only)`: RFC10-18 (2), RFC10-18(a) (5), RFC10-19 (1), RFC10-23 (2).
- `RFC-0010/mission-identity-approval-and-lifecycle.md (candidate only)`: RFC10-3 (1), RFC10-4 (1), RFC10-6 (1), RFC10-24 (3).
- `RFC-0010/portfolio-and-cross-project-consent.md (candidate only)`: RFC10-21 (7).
- `RFC-0010/prevention-envelope-and-attention.md (candidate only)`: RFC10-7 (8), RFC10-8 (4), RFC10-9 (3).
- `RFC-0011/deterministic-selection-and-budget.md (candidate only)`: RFC11-11 (1).
- `RFC-0011/packet-identity-provenance-and-memory.md (candidate only)`: RFC11-8 (1), RFC11-9 (1), RFC11-10 (1).
- `RFC-0001-project-graph-identity-state-planes.md`: RFC1-2 (2), RFC1-3 (5), RFC1-5 (1), RFC1-12 (1), RFC1-18(b) (1), RFC1-22 (1), RFC1-25 (4), RFC1-25(a) (2), RFC1-25(b) (1), RFC1-25(d) (1), RFC1-26 (1), RFC1-31 (1), RFC1-33 (3).
- `RFC-0002/challenge-lifecycle.md`: RFC2-13 (7), RFC2-14 (1).
- `RFC-0002/reconciliation-chain.md`: RFC2-18 (1), RFC2-19(a) (3).
- `RFC-0002/rendering-vocabularies.md`: RFC2-23 (1), RFC2-24 (4), RFC2-25 (2), RFC2-26 (4).
- `RFC-0002/snapshot-and-evaluation-core.md`: RFC2-1 (2), RFC2-7 (2), RFC2-8 (1), RFC2-9 (2), RFC2-11 (1).
- `RFC-0004/execution-record.md`: RFC4-20 (1), RFC4-21 (1).
- `RFC-0004/fidelity-joins-and-mappings.md`: RFC4-23 (1), RFC4-26 (2), RFC4-30 (2).
- `RFC-0004/general-contract.md`: RFC4-7 (1), RFC4-8 (1), RFC4-9 (1).
- `RFC-0004/named-adapters.md`: RFC4-12 (2), RFC4-13 (3), RFC4-13(b) (1).
- `RFC-0005/admission-and-boundary.md`: RFC5-1 (2), RFC5-4 (1), RFC5-8 (1), RFC5-10 (1), RFC5-11 (3), RFC5-25 (4), RFC5-26 (1), RFC5-27 (3).
- `RFC-0005/execution-profiles.md`: RFC5-18 (2), RFC5-23 (7).
- `RFC-0006-cross-surface-selection-query-drawer.md`: RFC6-5 (5), RFC6-19 (1), RFC6-25 (1), RFC6-26 (6), RFC6-28 (6).
- `RFC-0007/narrative-contract.md`: RFC7-3 (1), RFC7-5 (4), RFC7-13 (1), RFC7-14 (1), RFC7-20 (3), RFC7-21 (2), RFC7-22 (3), RFC7-23 (1), RFC7-25 (8).
- `RFC-0007/rendering-and-surface.md`: RFC7-29 (1), RFC7-31 (2), RFC7-38 (1), RFC7-39 (1), RFC7-40 (7).
- `RFC-0008/README.md`: RFC8-12 (4).
- `RFC-0008/accounting-reconciliation-and-release.md`: RFC8-25 (1), RFC8-32 (5).
- `RFC-0008/state-vocabulary-and-cost.md`: RFC8-12 (3), RFC8-14 (1), RFC8-16 (2), RFC8-17 (1), RFC8-18 (1), RFC8-20 (3).
- `RFC-0009/README.md`: RFC3-16(a) (1), RFC9-52 (1).
- `RFC-0009/interaction-parity-and-release.md`: RFC9-52 (4).
- `RFC-0009/semantic-geography.md`: RFC9-8(a) (3), RFC9-9 (1), RFC9-9(b) (3), RFC1-25 (1), RFC9-16(d) (1), RFC9-15(b) (5), RFC9-18 (1), RFC9-22 (1), RFC9-23 (11).
- `RFC-0009/visual-grammar-and-lenses.md`: RFC9-26 (2), RFC9-30 (2), RFC9-35 (1), RFC9-38 (1), RFC9-39 (1), RFC9-41 (1), RFC9-44 (1), RFC9-45 (11).

### Appendix — the bound files, one row each

| File | Lines | Matching lines | Category |
|---|---|---|---|
| `.syzygy/governance/contracts/candidates/capability-1-readability-successor/proposed/openspec/changes/project-registration-and-honest-shape-visibility/design.md.proposed` | 105 | 2 | P |
| `.syzygy/governance/contracts/candidates/capability-1-readability-successor/proposed/openspec/changes/project-registration-and-honest-shape-visibility/proposal.md.proposed` | 134 | 6 | P |
| `.syzygy/governance/contracts/candidates/dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md` | 71 | 7 | I |
| `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/in-force/D9-IN-FORCE-RECORD.md` | 68 | 4 | I |
| `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/in-force/RFC7-20-READING-IN-FORCE-RECORD.md` | 67 | 5 | I |
| `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md` | 70 | 7 | I |
| `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/redis/AGENT-PROVIDER-STATEMENT-OPENAI.md` | 70 | 7 | I |
| `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/redis/NO-EVIDENCE-DRAWER-STATEMENT.md` | 59 | 5 | I |
| `.syzygy/governance/contracts/candidates/general-trusted-bootstrap-authorization/ACT-SEMANTICS.md` | 31 | 8 | H |
| `.syzygy/governance/contracts/candidates/general-trusted-bootstrap-authorization/CONTRACT-AMENDMENT-MANIFEST.txt` | 35 | 2 | H |
| `.syzygy/governance/contracts/candidates/general-trusted-bootstrap-authorization/IMPACT-LEDGER.md` | 244 | 26 | H |
| `.syzygy/governance/contracts/candidates/general-trusted-bootstrap-authorization/PWB-COVERAGE-AMENDMENT-MANIFEST.txt` | 8 | 0 | H |
| `.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md` | 123 | 32 | I |
| `.syzygy/governance/contracts/candidates/polaris-generator-base-readability-successor/proposed/openspec/changes/polaris-manifesto-generation/design.md.proposed` | 220 | 5 | P |
| `.syzygy/governance/contracts/candidates/polaris-generator-base-readability-successor/proposed/openspec/changes/polaris-manifesto-generation/proposal.md.proposed` | 92 | 1 | P |
| `.syzygy/governance/contracts/candidates/polaris-understanding-dependency-union-successor/proposed/openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md.proposed` | 33 | 0 | P |
| `.syzygy/governance/contracts/candidates/polaris-understanding-readability-successor/proposed/openspec/changes/polaris-manifesto-understanding-amendment/design.md.proposed` | 136 | 1 | P |
| `.syzygy/governance/contracts/candidates/polaris-understanding-readability-successor/proposed/openspec/changes/polaris-manifesto-understanding-amendment/proposal.md.proposed` | 101 | 0 | P |
| `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md` | 328 | 3 | S |
| `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` | 432 | 6 | S |
| `.syzygy/governance/contracts/candidates/provider-route-messages-api-entry/proposed/POLARIS-PROVIDER-ROUTE-ANTHROPIC-MESSAGES-API-CANDIDATE.json` | 440 | 14 | J |
| `.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PROVIDER-ROUTE-ANTHROPIC-AGENT-SDK-CANDIDATE.json` | 329 | 12 | J |
| `.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json` | 185 | 17 | J |
| `.syzygy/governance/contracts/candidates/public-egress-v2/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md` | 209 | 10 | I |
| `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json` | 221 | 19 | J |
| `.syzygy/governance/contracts/candidates/public-repo-admission/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md` | 139 | 11 | I |
| `.syzygy/governance/contracts/candidates/public-repo-admission/instances/redis/OBSERVATION-CONSENT.md` | 69 | 10 | I |
| `.syzygy/governance/contracts/candidates/public-repo-admission/instances/requests/OBSERVATION-CONSENT.md` | 66 | 10 | I |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md` | 1043 | 31 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/README.md` | 348 | 9 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/challenge-lifecycle.md` | 329 | 16 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md` | 385 | 7 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/rendering-vocabularies.md` | 314 | 15 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md` | 307 | 12 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/README.md` | 175 | 21 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md` | 603 | 61 | S |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md` | 783 | 75 | S |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/README.md` | 300 | 7 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/execution-record.md` | 227 | 6 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md` | 351 | 9 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md` | 285 | 7 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md` | 536 | 11 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/README.md` | 336 | 30 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md` | 599 | 21 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md` | 420 | 65 | S |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md` | 348 | 14 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md` | 724 | 25 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/README.md` | 356 | 14 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md` | 670 | 27 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md` | 536 | 17 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/README.md` | 334 | 8 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md` | 588 | 11 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md` | 447 | 4 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md` | 521 | 17 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/README.md` | 322 | 8 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md` | 487 | 7 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md` | 997 | 31 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md` | 793 | 23 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/README.md` | 259 | 13 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/budget-reservation.md` | 209 | 5 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md` | 413 | 13 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md` | 356 | 10 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/portfolio-and-cross-project-consent.md` | 123 | 17 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md` | 405 | 18 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/README.md` | 229 | 7 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md` | 220 | 4 | C |
| `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md` | 244 | 6 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md` | 1043 | 31 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0002/README.md` | 348 | 9 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0002/challenge-lifecycle.md` | 329 | 16 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md` | 385 | 7 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md` | 314 | 15 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md` | 307 | 12 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0003/README.md` | 175 | 21 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md` | 603 | 61 | S |
| `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md` | 783 | 75 | S |
| `.syzygy/governance/contracts/rfcs/RFC-0004/README.md` | 300 | 7 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0004/execution-record.md` | 227 | 6 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md` | 351 | 9 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md` | 285 | 7 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md` | 536 | 11 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0005/README.md` | 336 | 30 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md` | 599 | 21 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md` | 420 | 65 | S |
| `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md` | 348 | 14 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md` | 724 | 25 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0007/README.md` | 356 | 14 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md` | 670 | 27 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md` | 536 | 17 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0008/README.md` | 334 | 8 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md` | 588 | 11 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md` | 447 | 4 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md` | 521 | 17 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0009/README.md` | 322 | 8 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md` | 487 | 7 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md` | 997 | 31 | C |
| `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md` | 793 | 23 | C |
| `.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md` | 74 | 10 | H |
| `.syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md` | 102 | 17 | H |
| `.syzygy/governance/decisions/POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md` | 45 | 2 | H |
| `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` | 398 | 10 | J |
| `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` | 598 | 18 | J |
| `docs/design/POLARIS-GENERATOR-DELIVERY.md` | 128 | 1 | H |
| `docs/design/POLARIS-GENERATOR-OWNER-PACKET.md` | 91 | 1 | H |
| `openspec/changes/polaris-manifesto-generation/.openspec.yaml` | 2 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/ADAPTER-DECLARATIONS.md` | 117 | 6 | P |
| `openspec/changes/polaris-manifesto-generation/APPLICABILITY-DECISIONS.md` | 60 | 2 | P |
| `openspec/changes/polaris-manifesto-generation/ASSET-CONTRACT.md` | 114 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/CAPABILITY-COVERAGE.md` | 65 | 1 | P |
| `openspec/changes/polaris-manifesto-generation/DESIGN-ACCEPTANCE.md` | 67 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/EFFECT-HOST-DESIGN.md` | 150 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/ENTRY-AND-WALKTHROUGH.md` | 126 | 4 | P |
| `openspec/changes/polaris-manifesto-generation/EXECUTION-PHASES.md` | 81 | 1 | P |
| `openspec/changes/polaris-manifesto-generation/GOVERNING-DEPENDENCIES.md` | 187 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/INTERFACES.md` | 329 | 15 | P |
| `openspec/changes/polaris-manifesto-generation/NAVIGATION-CONTRACT.md` | 117 | 6 | P |
| `openspec/changes/polaris-manifesto-generation/OWNER-FLOW.md` | 104 | 2 | P |
| `openspec/changes/polaris-manifesto-generation/SCHEMA-CONTRACT.md` | 152 | 2 | P |
| `openspec/changes/polaris-manifesto-generation/SECURITY-CONTRACT.md` | 165 | 11 | P |
| `openspec/changes/polaris-manifesto-generation/SOURCE-POLICY.md` | 98 | 13 | P |
| `openspec/changes/polaris-manifesto-generation/WORK-STATE-CONTRACT.md` | 129 | 0 | P |
| `openspec/changes/polaris-manifesto-generation/design.md` | 220 | 5 | P |
| `openspec/changes/polaris-manifesto-generation/proposal.md` | 92 | 1 | P |
| `openspec/changes/polaris-manifesto-generation/specs/polaris-generation/spec.md` | 1719 | 36 | P |
| `openspec/changes/polaris-manifesto-generation/tasks.md` | 51 | 2 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/.openspec.yaml` | 2 | 0 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/COVERAGE.md` | 58 | 2 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md` | 33 | 0 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/SYNTHESIS-MAP.json` | 62 | 0 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/design.md` | 136 | 1 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/proposal.md` | 101 | 0 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md` | 692 | 4 | P |
| `openspec/changes/polaris-manifesto-understanding-amendment/tasks.md` | 22 | 1 | P |
| `openspec/changes/polaris-project-wide-butlers-model/.openspec.yaml` | 2 | 0 | P |
| `openspec/changes/polaris-project-wide-butlers-model/CAPABILITY-COVERAGE.md` | 46 | 3 | P |
| `openspec/changes/polaris-project-wide-butlers-model/CONTRACT-COVERAGE-REPAIR-DELTA.md` | 126 | 12 | P |
| `openspec/changes/polaris-project-wide-butlers-model/CONTRACT-COVERAGE.md` | 41 | 0 | P |
| `openspec/changes/polaris-project-wide-butlers-model/GOVERNING-DEPENDENCIES.md` | 141 | 0 | P |
| `openspec/changes/polaris-project-wide-butlers-model/contract-coverage-matrix/RFC-0001-0003.md` | 233 | 35 | P |
| `openspec/changes/polaris-project-wide-butlers-model/contract-coverage-matrix/RFC-0004-0006.md` | 255 | 39 | P |
| `openspec/changes/polaris-project-wide-butlers-model/contract-coverage-matrix/RFC-0007-0009.md` | 219 | 14 | P |
| `openspec/changes/polaris-project-wide-butlers-model/design.md` | 634 | 15 | P |
| `openspec/changes/polaris-project-wide-butlers-model/proposal.md` | 189 | 8 | P |
| `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md` | 2610 | 35 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/.openspec.yaml` | 2 | 0 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/CAPABILITY-COVERAGE.md` | 75 | 3 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/CONTRACT-COVERAGE.md` | 178 | 12 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/GOVERNING-DEPENDENCIES.md` | 88 | 0 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/design.md` | 105 | 2 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/proposal.md` | 134 | 6 | P |
| `openspec/changes/project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md` | 1974 | 77 | P |
| `openspec/changes/three-surface-poc-experience/.openspec.yaml` | 2 | 0 | P |
| `openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md` | 567 | 23 | P |
| `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md` | 129 | 0 | P |
| `openspec/changes/three-surface-poc-experience/design.md` | 102 | 0 | P |
| `openspec/changes/three-surface-poc-experience/proposal.md` | 155 | 4 | P |
| `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md` | 1462 | 2 | P |

How to read the result:

- Every matching line is in one of the six categories, and the categories'
  fates leave none standing as a gate on adoption day: the successor files
  are rewritten; every contract clause is read through the RFC3-16 reading
  rule; behavioral specifications follow VIS-4's "Lower rules follow this
  one", which says a read or a send to a declared provider needs no record
  at all; the rest are records of acts already performed.
- A matching line is not always a gate. Many are in owner classes that stay
  (doctrine, secret-policy weakening, writes into other people's
  repositories, exposure and release), and many only describe an act's
  history; they are counted, not excused one by one.
- The code still enforces several of these clauses until the follow-on
  items land (`FOLLOW-ON.md`). Where adopting D10 would otherwise make the
  code refuse (a performed act whose bound bytes D10 replaces), the package
  carries the change; see "Code that keeps working on adoption day" below.

## Code that keeps working on adoption day

Two readers in the dossier pipeline require a performed act's digest to
equal the installed bytes it bound, and D10 replaces those bytes:

- `packages/polaris-generation-consent/src/package-reader.ts`,
  `readClassAct`: the RFC5-14 content-class act binds
  `RFC-0005/consent-egress-secrets.md`.
- The same file's `boundMismatch`, used for the D9 bind act, which binds
  `doctrine/security.md` and `doctrine/v1.md`.

Both now also accept the bound file when the D10 record is present, the
record's one phrase line names the manifest's current digest, and the
manifest's `[base]` row for that file equals the digest the earlier act
bound (`supersededByD10`). Without the D10 record nothing changes; with it,
behaviour is the same as before adoption: the same class, the same D9
reading. Two tests pin it, and a mutant that disables the function fails
both. [Observed: a read-only probe of 17 gate reads the dossier makes
(policy chain, class act, in-force egress, registry and sign-off states, the
D9, RFC7-20, provider and drawer acts, and the package gate sources), run
against a scratch install with the three decisions files the recorder would
write computed in memory and nothing written, returned the same state as the
unmodified tree for all 17. Without the record, the class act and the D9
act refuse, as they should: the recorder installs and records in one
transaction.] The text-level rewrite of these readers is follow-on work
(`FOLLOW-ON.md`, F-1).

The governance battery likewise stops running the checks that hold a
performed act to bytes D10 replaced, once D10 is in effect
(`scripts/d10_supersession.py`): they print one `SUPERSEDED` line, or
`check_governance.py` reports them in one WARN row, instead of failing on
every later run. The package ships the derived files that D10's successors
change (the active contract manifest, contract index, budget report, its
ten context-selection fixtures and the directive register), regenerated by
their own builders, so the installed tree passes the builders' `--check`.
One battery line runs a recorder whose own bytes a review binds
(`record_polaris_understanding_adoption.py --check`, which holds
`vision.md` to its reviewed digest), so the gate cannot go inside it; the
act installs `PROJECT-STATUS.md` and `.github/workflows/governance-docs.yml`
with that one line wrapped by `d10_supersession.py --unless-in-effect`. If
either file changes on the default branch before the act, the recorder
refuses until the package is rebuilt.

## A. Amended or retired by the successor files

| Identifier | Where (today) | Bound | Fate |
|---|---|---|---|
| RFC3-15 install gates (`contracts/`, `policies/`, `decisions/` rows) | `RFC-0003/governance-homes-and-owner-acts.md`:78 | yes (above) | Amended: agent adoption; weakening the secret policy stays the owner's; the doctrine row is unchanged |
| RFC3-16 | same file:112 | yes | Amended: effective status is read from an adoption record (owner decision for an owner class, agent row otherwise) naming a commit; earlier acts and digests are history, not locks |
| RFC3-16(a) predicate and premise | same file | yes | Amended: honored at bytes with an adoption record; trust premise restated; the A1 state-(2) mechanism stays optional |
| RFC3-16(b) | same file | yes | Amended: binds a commit, not a typed phrase and digest; item 9 (A1 identity or its absence) retired |
| RFC3-16(c) | same file | yes | Amended by a note: the two provenance states describe acts before D10; later adoptions render `owner-decided` or `agent-adopted` |
| RFC3-16 reading rule ("How other clauses read this one") | same file, new bullet in RFC3-16 | yes | Added: an "effective owner act under RFC3-16(a)", owner-act record, owner decision, ruling or sign-off in any other clause reads as an adoption record under RFC3-16 as amended; an observation or egress consent reads as RFC3-7 and RFC5-12 as amended. This is what supersedes every clause in the sweep below from adoption day |
| RFC3-5 | `RFC-0003/manifests-and-namespace.md`:233 | yes (above) | Amended by a note: a field's authority column that names an owner act reads through RFC3-16 as amended |
| RFC3-6 | same file:249 | yes | Amended: a declared repository entry is observed with no consent record; `unconsented-source-or-provider` remains only for a provider not declared for the run |
| RFC3-7 | same file:256 | yes | Amended: consent records hold write consent only, for repositories not on `decisions/OWNED-REPOSITORIES.md`; observation and egress consent retired; execution follows SEC-3 (sandbox: agent; outside a sandbox: the owner's recorded choice for the run) |
| RFC3-8 | same file:281 | yes | Amended by a note: revocation governs write consent and a run's declared provider |
| RFC3-9 | same file:298 | yes | Amended: a drafted declaration is adopted like any other change (RFC3-16 as amended), not by an owner act |
| RFC5-12 | `RFC-0005/consent-egress-secrets.md`:95 | yes (above) | Amended: write consent only, for repositories the owner does not own; observation, egress and execution consent retired |
| RFC5-13 | same file:115 | yes | Amended by a note: governs revoking write consent and withdrawing a run's declared provider |
| RFC5-14 | same file:134 | yes | Amended: content leaves only for a provider declared for the run; the classification policy is agent-maintained, and letting matched or unclassifiable content out is the owner's |
| RFC5-15 | same file:199 | yes | Amended: a two-part choke point (declared provider; determinable and screened); the third part, a consent record carrying an owner act, retired |
| RFC5-16 | same file:249 | yes | Amended: the secret policy's owner-act requirement becomes "weakening is the owner's decision, other changes are agent adoptions"; a missing policy still blocks ingest |
| CC-SPEC-8 | `SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:266 | yes (above) | Amended: a reviewed N/A judgment is an agent adoption, or the owner's in an owner class |
| CC-SPEC-10 | same file:346 | yes | Amended: specs and spec versions are agent-adopted (log row and tag); owner only in the four classes |
| CC-IMPACT-1 to CC-IMPACT-4 | `SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:74, 118, 145, 181 | yes (above) | Unchanged; agent-maintained under VIS-4 |
| CC-IMPACT-5 | same file:188 | yes | Amended: waits on the owner only in the four classes |
| CC-IMPACT-6 | same file:206 | yes | Amended: a spec may lag its shape change when the adoption row records it; no owner act or P-44 amendment needed |
| CC-IMPACT-7 | same file:242 | yes | Retired (the digest-pinned blind fixture run) |

## B. Superseded at adoption; text rewritten in follow-on work

| Identifier or record | Where | Bound | Fate |
|---|---|---|---|
| RFC5-18 and RFC5-18(c) (execution consent: an owner Decision approving a profile version) | `RFC-0005/execution-profiles.md`:91, :272 | yes (`ACTIVE-CONTRACT-MANIFEST.txt`) | Superseded: the profile is the agent's choice, recorded in the run's record (F-6) |
| Phase rules' owner N/A judgment: RFC1-33, RFC2-26, RFC3-33, RFC4-30, RFC5-27, RFC6-28, RFC7-38, RFC8-32, RFC9-52 | each RFC module, per `DIRECTIVE-REGISTER.md` | yes (`ACTIVE-CONTRACT-MANIFEST.txt`) | Superseded: an agent adoption records the judgment (CC-SPEC-8 as amended) (F-6) |
| RFC4-3 (observer identity and version are snapshot inputs) | `RFC-0004/general-contract.md`:100 | yes | Unchanged. It never required an owner act; the registry entry's owner act came from RFC3-16(a), now amended. The build records the reader's identity and version |
| CC-REV-1 (mandatory independent review classes) | `policies/craft-and-care/review-and-documentation.md`:16 | no | Kept as an engineering norm; "review before offering to the owner" has no owner to offer to outside the four classes (F-7) |
| CC-REV-2 owner route ("stops, routes to the owner") | same file:71, :75, :82 | no | Superseded: the agent resolves the contradiction and records it, except in an owner class. The doctrine carve-out (:99-103) stays (F-7) |
| CC-REV-4 ("Two failed review rounds … return to the owner") | same file:129, :139 | no | Superseded: no owner arbitration and no stopping rule; one independent review, fixes applied, the agent decides (F-7) |
| CC-REV-6 owner overrule | same file:161, :169-170 | no | Superseded: findings are still dispositioned; the owner overrules only in an owner class (F-7) |
| CC-SEC-2 (egress checked against the per-project consent record) | `policies/craft-and-care/security-and-secrets.md`:46 | no | Superseded: the code checks the run's declared provider and secret screening (F-7) |
| CC-SEC-3 (no execution outside an accepted profile) | same file:63 | no | Superseded by SEC-3 as amended: a sandbox run is the agent's decision; a run outside a sandbox keeps the owner's recorded choice for that run, in the owner's attended session (secrets class); P-117's conforming amendment is folded into F-7 |
| CC-SEC-4 (per-repository write consent before the first write) | same file:84 | no | Superseded: consent only for repositories the owner does not own (F-7) |
| NORMATIVE-CHANGE-WORKFLOW steps 3–5 and "An artifact edited after its act is, for the record, an artifact with no act" | `policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`:73-104, :54-55 | no | Superseded: review is a norm, adoption is an agent row, a later edit is a new adoption (F-7) |
| SDR-37 (one coherent capability per OpenSpec change) | `decisions/SURFACE-DECISION-RECORD.md`:195; `SPECIFICATION-GRANULARITY-DECISION.md`:13, :86; `OPENSPEC-MULTI-CHANGE-DIRECTION.md`:20 | no | Superseded as an owner rule: change granularity is the agent's call (CC-SPEC-1's citation of it stays as guidance) |
| Scope A versioned sign-off, and its extensions | `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`:27-46; `OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md`; `OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md` | no | Superseded: an agent adoption row replaces the owner's selection; version tags continue. The 27 sign-off records since 2026-10-01 are history |
| Review stopping rule | `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md` | no | Retired: "One review, not gating" (owner, 2026-11-17) |
| GP-Q0's owner route ("Behavior-preserving" means no change to a rendered byte, wire format, refusal string, exit code, signed artifact, or consent, security or retention decision) | `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:44-55 | no | Superseded: the agent fixes and reports behaviour changes; only a change that weakens secret detection or widens writes into other people's repositories or exposure stays with the owner. The PR review rule in the same direction stays as a norm |
| Separate drafting and implementation directions ("find the act") | `AGENTS.md`:27-28; e.g. `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`:42, :103, :143 and `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md` | no | Superseded: an adoption authorizes its implementation; drafting needs no direction (F-8) |
| Implementation-authorization acts | `CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md`, `PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md`, `PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md`, `POLARIS-GENERATOR-IMPLEMENTATION-AUTHORIZATION-ACT.md` | digest acts | History; no future implementation needs one |
| No unattended agent coordination | `AGENTS.md`:103; `OWNER-DIRECTION-2026-10-03-OVERNIGHT-BEADS-LOOP.md`:31-34 ("this run only") | no | Retired: unattended loops are allowed; they report after (F-8) |
| CC-REV-2 lagging-specification exception decision (P-44) | `CC-REV-2-LAGGING-SPEC-EXCEPTION-DECISION.md` | no | Superseded by CC-IMPACT-6 as amended |

## C. Performed acts whose gate is no longer required (history)

All rows below are performed, digest-bound act records; D10 edits none of
them and none of the bytes they bound. [Observed: section headings in
`decisions/ACCEPTANCE-ACT-RECORD.md`, lines as cited.]

| Act class | Records | Fate |
|---|---|---|
| Screening-policy per-version chain (approve-policy) | `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md` and `-V2-` to `-V8-ACT.md` (record :1211, :1265, :1427, :1648, :1718, :1765, :1812, :1944); the Butlers policy acts `PWB-SECRET-CLASSIFICATION-POLICY-ACT.md`, `-AMENDMENT-ACT.md`, `-BEHAVIOR-CONTRACT-REPIN-ACT.md` | The chain ends. The policy at its current bytes is the adopted policy; later changes are agent adoptions unless they weaken detection or fail-closed classification (owner, SEC-5) |
| Observer registry acts (adopt-registry-entry) | `PWB-OBSERVER-REGISTRY-ENTRY-ACT.md`, `-ENTRY-AMENDMENT-`, `-CURRENCY-BRIEFING-AMENDMENT-`, `-BEHAVIOR-CONTRACT-REPIN-`, `-MACHINE-CEILING-ACT.md` (record :216, :303, :852, :1082, :1675); the public-git-source registry sign-offs v1.0 and v1.1 | No registry act is needed again; reader identity and version are engineering facts (RFC4-3). PWB-REQ-005 and REQ-033 follow in F-2 and F-4 |
| Observation consent | `PWB-BUTLERS-OBSERVATION-CONSENT-ACT.md` (:164); `PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md` (:1292) | Class retired (RFC5-12) |
| Agent-provider statements | `DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md` (:1339); `DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md` (:1455) | Class retired; the run declares its provider (SEC-2, RFC5-14) |
| "In force" bind acts | `DOSSIER-LOCAL-AGENT-D9-IN-FORCE-ACT.md` (:1368); `DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md` (:1397) | No longer needed: an adoption is in force when committed (RFC3-16 as amended). D9 and the RFC7-20 reading stay in force as adopted |
| Launch-record write consent | `LAUNCH-CONSENT-WRITE-CONSENT-ACT.md` (:1895) | Class retired for Syzygy's own repository (SEC-4) |
| Contract and craft amendment acts | Waves A and B, acts 6 and 7, the general trusted-bootstrap transaction, the readability restyles, `RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md` | History; later contract and craft changes are agent adoptions |

Prepared but unperformed offerings are withdrawn, not performed: the
no-evidence drawer statement for redis-redis and the OpenAI provider
statement (`check_governance.py` registers their phrases; no act record
exists among the 48 `*-ACT.md` files in `decisions/` [Observed]), and the
unperformed candidate packages `public-admission-registry-entries/`,
`provider-route-messages-api-entry/` and `public-egress-v2/` [Observed: 0
mentions of the three directory names in `ACCEPTANCE-ACT-RECORD.md`]. Of the foundational
acts never performed (`FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md`
rows 2–5), CC-TEST-2, topology and the project overview become agent
adoptions; D3 (bounded mission) amends doctrine and stays with the owner.

## D. Behavioral specifications (follow-on agent adoptions)

Not digest-bound unless stated; each is version-signed or adopted. Their
owner-act requirements are superseded at adoption by VIS-4; the code keeps
enforcing them until the follow-on changes land.

| Requirement | Where | Bound | What goes | Follow-on |
|---|---|---|---|---|
| REQ-polaris-generation-033 (operator-agent mode) | `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`:7 (rules :9-13) | no | HEAD must equal a consented revision; registry entry, policy and provider-statement acts; drawer statement; D9 and RFC7-20 bind acts | F-1 |
| REQ-polaris-generation-046 (launch-time consent) | `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`:7 | no | TTY-only typed phrase per record; per-revision consent; the write-consent act; refusal of non-public repositories | F-1 |
| Public-git-source acquisition (registry entry, local-agent) | `contracts/candidates/public-git-source-acquisition-local-agent-v1-1/` | no | Registry sign-off as the source-acquisition gate | F-1 |
| PWB-REQ-005 (consent and policy authority precede every body read) | `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`:636 | yes (`pwb-opening-index-amendment` manifest) | The three owner acts (consent, policy, registry) | F-2 |
| CAP1-REQ-011 (consent is a visible recorded fact) | `openspec/changes/project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md`:359 | yes (`capability-1-readability-successor` manifest) | Observation consent as a registration precondition; write consent stays | F-2 |

## E. AGENTS.md (follow-on F-8)

`AGENTS.md` is not bound, and it is never citable as authority (its own
first paragraph). Its text is rewritten by F-8 as ordinary agent work; from
adoption day, where it disagrees with doctrine, doctrine wins (its own
rule). [Observed: a Python sweep of every line of `AGENTS.md` at the commit
this package was built on (review finding R-6).]

- Denominator: 835 lines.
- Predicate, case-insensitive: `owner act|owner's behalf|consent|sign-?off|signs? off|signed off|acts? in force|find the act|autonom|unattended|adoption gate|owner gate|to the owner|reported to the owner|approve|accept contracts|binds? nothing until|never edit an artifact after|escalation|only the owner|one coherent category|stopping rule|GP-Q0|without the owner|goes to the owner|owner verdict|\bowner\b`.
- Result: 53 matching lines, every one in the table below, grouped by
  passage. A passage that is superseded or retired, wholly or in part, is
  rewritten by F-8; "Kept" means descriptive, history, or an owner class
  that stays.

| Lines | Passage | Fate |
|---|---|---|
| 17 | Governed changes "bind only by owner act" | Superseded: they bind by an adoption record (an agent's row, or the owner's decision in an owner class) |
| 21 | "Each authorization is a dated owner act or direction" | Superseded: an adoption authorizes its own implementation |
| 26 | The POC "may read one consented content class behind the P1 authority gate" | Superseded as a rule (reading needs no consent, SEC-2); true as a description of the code until F-1 and F-2 |
| 28 | "before implementing, find the act" | Superseded: find the adoption row, or adopt |
| 35, 36 | Authority table: "Prior owner rulings … In force"; craft-and-care "Owner-approved" | Kept: status history. Rulings stay in force as decided; later changes are adoptions |
| 61, 62 | The POC spec "signed off; amend only via CC-REV-2"; "only owner sign-off binds" a new spec | Superseded: specs and their amendments are agent adoptions (CC-SPEC-10 as amended) |
| 64 | Open owner questions in `PENDING-OWNER-DECISIONS.md` | Kept as a route; an open question outside the owner classes may be closed by an agent adoption (F-8) |
| 65 | Signing off a PWB delta, registry entry or contract successor (Scope A) | Superseded: an agent adoption row replaces the sign-off; version tags continue |
| 75 | Never route an owner to a stale offering | Kept: still true for owner-class offerings |
| 83 | "Nothing beyond the acts in force", then the list of what is out of scope | Partly kept: deferred waves and Mission Control are doctrine (D3) and production deployment, release, broad remote access and multi-user support are owner class 4; "acts in force" becomes "adoptions" |
| 86, 87 | Never read a repository body without per-repository consent and registry and policy acts | Retired (SEC-2, RFC3-7 and RFC5-12 as amended); secret screening stays |
| 91, 92, 93 | Never run or answer a consent command; only the owner gives consent, in person (REQ-polaris-generation-046) | Kept for the consents that remain (write consent for other people's repositories; a run outside a sandbox): an agent never types an owner phrase. Retired for reading and for the launch-time read consent (F-1) |
| 94 | "Syzygy never writes implementation code or adopts intent autonomously" | Kept for doctrine (owner class 1) and for the product (Syzygy itself never starts work); superseded for specifications, which agents adopt |
| 95, 96 (passage 95-97) | Never adopt doctrine, accept contracts, approve policy, or label anything accepted on the owner's behalf; never install candidate material into an accepted home | Doctrine kept (owner class 1), and an agent never labels anything *owner*-adopted. Contracts, policy and installs: superseded, they are agent adoptions recorded as such |
| 98 | Never edit an artifact after an act has bound its digest | Retired (RFC3-16 as amended: a later edit is a new adoption) |
| 99, 100 | One coherent category per OpenSpec change, "binding nothing until owner sign-off" | Superseded: granularity is the agent's call (SDR-37 as guidance) and adoption binds |
| 101, 102 | An act's escalation triggers need a new owner act | Superseded, except a change in an owner class (doctrine; secret-policy weakening; writes into other people's repositories; exposure or release) |
| 103 | No unattended agent coordination | Retired: unattended loops report afterwards |
| 156, 158 (passage 154-158) | POC cycles "reported to the owner before the next cycle"; never commit a normative artifact while its adoption gate is unresolved | Superseded: cycles report after, without waiting; the adoption is the commit |
| 109 | Preserve the owner's trade-offs | Kept |
| 219 | Behaviour-changing encoder merges "go to the owner (GP-Q0)" | Superseded: agent decides and reports; owner only in an owner class |
| 225, 230 | The consent package's `outsideFences` reader | Kept: names code |
| 231, 232 | Do not change the consent reader or the renderer "without the owner, since that changes what a gate accepts" | Superseded: an agent adoption, unless the change weakens secret screening (SEC-5) |
| 242 | "the owner chose that (GP-B2 Q2 …)" | Kept: history |
| 373, 376 | The consent package's `./testing` entry | Kept: names code |
| 441 | Walkthrough preflight is "never an owner verdict"; four states | Kept: an epistemic rule (readiness is not judgment) |
| 457 | CG-27 sibling-row tokens | Kept: describes a check |
| 467 | Rounds h–k "cited as evidence by acts in force" | Kept: history |
| 531 | `syzygy-u2a`'s "approved implementation guidance" | Kept: history |
| 536 | Only an owner-signed successor may correct a bound file's banner | Superseded: a later edit is a new adoption (RFC3-16 as amended) |
| 555, 756 | `OWNER-SIGNOFF-PACKET.md` file names | Kept: names files |
| 589 | An owner-directed edit of the act-4 overview is lawful with a re-minted digest | Superseded: the overview becomes an agent adoption (act 4 withdrawn, §C) |
| 595 | 77 raw review heads "not an owner's to authorize" | Kept: CC-REV-6 storage, not a gate |
| 648 | Merging `PENDING-OWNER-DECISIONS.md` rows | Kept: describes a merge procedure |
| 688 | Agree a stopping rule "(… ask the owner) before round 3" | Retired: "One review, not gating" |
| 716 | "Do not relax the grammar or policy without an owner gate" | Superseded: agent adoption; weakening secret detection stays the owner's (SEC-5) |
| 721, 722, 732, 748 | Recorder notes: digest-bound owner acts, the owner's phrase, plain owner directions | Kept: they describe performed acts and the recorders that remain for owner-class acts |
