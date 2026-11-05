# Acceptance-act record

> **The record of performed owner acts** over the final pre-specification
> package, created at the first act per
> `contracts/candidates/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md`
> §2 step 4. Entries are appended, dated, and never edited. Each entry is
> an **owner-adopted bootstrap act** under RFC3-16(c)'s two-state model:
> a governance fact preserved as phrase + exact digest + commit/tag,
> **"owner-adopted (bootstrap, uncorrelated)" — never "verified"** — until
> the one-time correlation act (RFC3-16(b)) exists and is performed.

## Act A — Wave A accepted, 2026-08-17

**Phrase, exactly as written by the owner (in-interaction, 2026-08-17):**

```
ACCEPT FOUNDATIONAL WAVE A: 8972d9630b95f5d4266432dbb1b3602114576bbd6c0f29d6f9bd6f905b1f884a
```

| | |
|---|---|
| Argument | sha256 of `contracts/candidates/wave-manifests/WAVE-A-MANIFEST.txt`, verified equal to the phrase at the act |
| Accepts | the 19 modules of RFC 0001–0006 at the per-module digests in that manifest |
| Confirmation | RD-31b, `VERDICT: CONFIRM`, on this exact argument (2026-08-10; raw at `contracts/candidates/round-2026-08e/reviews/RD-31b-wave-a-RAW.md`) |
| Ceremony verification (step 2) | `sha256sum -c` — 19 of 19 rows OK from the candidates root; `build_active_manifest.py --check` — manifests match regeneration; manifest digest equals the phrase argument `[Observed, this act]` |
| Install (step 3, shape (M) per the P-33 ruling) | the 19 modules copied to `.syzygy/governance/contracts/rfcs/` with their package structure, **and nothing else** — no companions, neither manifest. Verified: `sha256sum -c candidates/wave-manifests/WAVE-A-MANIFEST.txt` run from `.syzygy/governance/contracts/`, 19 of 19 OK; the installed tree holds exactly 19 files |
| Disclosed at the act | the 88 dangling path strings across the installed waves resolve in the candidates tree, not beside the installed copies — the (M) ruling's disclosed property (`WAVE-A-INSTALL-SHAPE-DECISION.md`); §7's Wave-A riders ride in as recorded there |
| Commit / tag (step 5) | the commit carrying this entry and the installed tree; annotated tag `wave-a-accepted-2026-08-17` |

Effective status of the 19 modules for human governance: **accepted —
owner-adopted (bootstrap, uncorrelated)**. Constraints bind at full
strength; nothing consumed as an authorization-for-effect satisfies
RFC3-16(a) from this record alone.

## Act B — Wave B accepted, 2026-08-17

**Phrase, exactly as written by the owner (in-interaction, 2026-08-17,
after the Wave A act — the A → B ordering is satisfied):**

```
ACCEPT FOUNDATIONAL WAVE B: 193e3c1e15e4b1375f938d62c9e8c1a442984313e0794ada5965d2cdf9d7e3ed
```

| | |
|---|---|
| Argument | sha256 of `contracts/candidates/wave-manifests/WAVE-B-MANIFEST.txt`, verified equal to the phrase at the act |
| Accepts | the 11 modules of RFC 0007–0009 (Polaris, Trajectory, Orrery) at the per-module digests in that manifest |
| Confirmation | RD-32c, `VERDICT: CONFIRM`, on this exact argument (2026-08-10; raw at `contracts/candidates/round-2026-08e/reviews/RD-32c-wave-b-RAW.md`) |
| Ordering | performed **after** the Wave A act (Act A above), so every RFC 0001–0006 reliance in these modules resolves into **accepted** text — the acceptance record row B's performed-alone caveat never triggered |
| Ceremony verification (step 2) | `sha256sum -c` — 11 of 11 rows OK from the candidates root; `build_active_manifest.py --check` — manifests match regeneration; manifest digest equals the phrase argument `[Observed, this act]` |
| Install (step 3, shape (M) per the P-33 ruling) | the 11 modules copied to `.syzygy/governance/contracts/rfcs/` with their package structure, **and nothing else**. Verified: `sha256sum -c candidates/wave-manifests/WAVE-B-MANIFEST.txt` run from `.syzygy/governance/contracts/`, 11 of 11 OK; the installed tree holds exactly the 30 files of Waves A + B |
| Disclosed at the act | the (M) dangling-path property (Act A above) extends over these modules; the installed-tree class is reported by `check_governance.py` CG-1i |
| Commit / tag (step 5) | the commit carrying this entry and the installed modules; annotated tag `wave-b-accepted-2026-08-17` |

Effective status of the 11 modules for human governance: **accepted —
owner-adopted (bootstrap, uncorrelated)**. Constraints bind at full
strength; nothing consumed as an authorization-for-effect satisfies
RFC3-16(a) from this record alone.

## Acts 6 and 7 — the CC-SPEC and CC-IMPACT craft amendments confirmed, 2026-08-17

**Phrases, exactly as written by the owner (in-interaction, 2026-08-17,
one sitting — the two policies are one model and were offered jointly):**

```
CONFIRM CRAFT AMENDMENT: CC-SPEC@9889b7e311ad941eec84d01dc2c035c7e2502a57cf18e68a1028a76d5b814871
CONFIRM CRAFT AMENDMENT: CC-IMPACT@cd6ec838e701f0258889d0c3c2776fc91fe1686829379b789ae5b151b04c27c0
```

| | |
|---|---|
| Arguments | each policy file's own sha256, re-verified by script at the act and equal to its phrase — the exact bytes the confirming review examined |
| Confirms | **CC-SPEC-1…11** (the specification-acceptance standard) and **CC-IMPACT-1…7** (the shape-to-spec impact rule) as owner-confirmed craft policy, in force at those digests |
| Review chain | RD-51 `REVISE` → repair → RD-69 `REVISE` (one blocker, repaired same day) → **RD-70 `CONFIRM WITH EXCEPTIONS`** on these digests (raw + register: `contracts/candidates/round-2026-08i/reviews/`) |
| Disclosed at the act | the nine open non-blocking findings (RD-69 N1–N5, RD-70 N1–N4) travel into force, per the offering packets — the first post-act amendment's worklist |
| Recording | `policies/craft-and-care/INSTALL-RECORD.md` (the act-2 precedent); the files bind at their committed home, uncopied and unedited — an edit after the act retires it |
| What this changes | launch-gate **E5** and **E6** now have owner-confirmed, citable owners; the first specification, when the owner authorizes authoring, is judged under a standard in force |
| Commit / tag (step 5) | the commit carrying this entry; annotated tag `craft-acts-6-7-confirmed-2026-08-17` |

Effective status for human governance: **confirmed craft policy —
owner-adopted (bootstrap, uncorrelated)**.

## General trusted-bootstrap authorization transaction — performed 2026-09-01

**Phrase, exactly as written by the owner (in-interaction, 2026-09-01):**

```text
SIGN OFF GENERAL TRUSTED-BOOTSTRAP AUTHORIZATION TRANSACTION: 1885a323c659364f98e81cdf04479cebfecf5b22d350928d046ebb5b7c5268f6
```

**Performed nested row-5 act argument, bound by the outer transaction
ceremony:**

```text
CONFIRM CRAFT AMENDMENT: CC-SPEC@6093dbbe519dad6c35a5aaeeb31355d2e435d76ec4f0c2c9affb0d1e5b6b5621
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | sha256 of `contracts/candidates/general-trusted-bootstrap-authorization/TRANSACTION-MANIFEST.txt`, re-computed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Reviewed subject | `92cfbf3e3a644bff7ac738d2cf7084c06548381c` |
| Owner-packet head | `a5f2c4fe22f9ae3c50ee8902a0b7d78207f910a2`; it changed no transaction-bound subject after review |
| Review outcome | security `CONFIRM`; contract/fresh-reader and impact/transaction `CONFIRM WITH EXCEPTIONS`, no blockers |
| Ceremony verification | 7 of 7 top-level subjects, 30 of 30 contract rows and 5 of 5 PWB coverage rows verified at their recorded digests `[Observed, this act]` |
| Recording | `.syzygy/governance/decisions/GENERAL-TRUSTED-BOOTSTRAP-AUTHORIZATION-ACT.md`; annotated tag `general-trusted-bootstrap-authorized-2026-09-01` on the commit carrying these records |

All five rows below were performed together. Their wording is copied exactly
from the transaction-bound `ACT-SEMANTICS.md`.

| # | Act type | Stable subject identity | Exact digest(s) | Scope | Supersession / revocation |
|---|---|---|---|---|---|
| 1 | `accept-contract-amendment` | accepted RFC 0001-0009 contract set | contract-amendment manifest `480c06d79f237f3a8d18d40a3de97e772a2da70db6cf976578eeab5c177cc4b1` | Accept the generalized effective-owner-act model: valid state (1) and state (2) acts may satisfy existing owner gates, exact state always renders, invalid acts fail closed, and acts remain warrants rather than evidence | Supersedes the current bytes accepted through the historical Wave A/B acts; those acts, manifests and prior bytes remain immutable historical evidence |
| 2 | `sign-off-coverage-amendment` | Capability 1 change `project-registration-and-honest-shape-visibility`, `CONTRACT-COVERAGE.md` only | `15431d8ba1fe25a61e4dc2713c4d51fad1cf6d25ef7a9103cc616265102289c9` | Reconcile contract traceability to the amended RFC3-16 model; change no requirement, proposal, design or implementation authorization | Supersedes only that artifact's digest in the 2026-08-20 adoption; all other adopted digests remain |
| 3 | `sign-off-coverage-amendment` | signed change `three-surface-poc-experience`, `CONTRACT-COVERAGE.md` only | `f29a01f6a5725f4ac7085fa04a62de757fd16153d507ae5e415ae0b501fdc0a4` | Reconcile contract traceability to the amended RFC3-16 model; change no POC requirement, scope or implementation authority | Supersedes only that artifact's digest in the 2026-08-30 sign-off; all other signed digests remain |
| 4 | `sign-off-coverage-amendment` | signed change `polaris-project-wide-butlers-model`, contract-coverage bundle | PWB coverage manifest `5cda673c604f298cc45d05ca358b2cc410b6a74f1664c55f4f1056ce8c1f45ea` | Reconcile five signed coverage artifacts while leaving PWB-REQ-005 and PWB-REQ-022 deliberately stricter at state (2); change no requirement, proposal, design or implementation authority | Supersedes only the five artifact digests listed by the PWB coverage manifest; every other 2026-08-31 sign-off digest remains |
| 5 | `confirm-craft-amendment` | in-force policy `SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` (CC-SPEC-1..11) | `6093dbbe519dad6c35a5aaeeb31355d2e435d76ec4f0c2c9affb0d1e5b6b5621` | Amend CC-SPEC-8's reviewed-N/A owner-act gate to accept valid state (1) or state (2), render the exact state, and fail closed on absent or invalid acts; no other craft obligation changes | Supersedes the policy digest confirmed by craft act 6; that performed act, digest and prior bytes remain immutable historical evidence |

Effective status: the amended contract set, seven amended coverage artifacts
and CC-SPEC amendment are **owner-adopted (bootstrap, uncorrelated)** at the
exact scopes and digests above. State (1) is effective but never supports the
claim “independently verified”; owner acts remain warrants, not evidence.

Apart from row 5's CC-SPEC amendment, this transaction grants no
effect-specific consent or policy approval, registry adoption, observation,
write, egress, execution, deployment, release, recovery, implementation or
mission authority. It does not accept RFC 0010 or RFC 0011, amend doctrine,
sign Mission Control behavior, implement PWB or start automatic follow-on
work.

## PWB state-(1) amendment — performed 2026-09-02

**Phrase, exactly as written by the owner (in-interaction, 2026-09-02):**

```text
SIGN OFF PWB STATE-(1) AMENDMENT: 14a84abadf0ba96d968e99bd5b60302895e8a44e6e005b4d2fc76345e7863b1e
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `contracts/candidates/pwb-state1-amendment/PWB-AMENDMENT-MANIFEST.txt`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Reviewed subject | `8847feef1442bf55fd5276a73248d3c58409e4db` |
| Owner-packet / final evidence heads | `cc809f90f5cc0bacddad83adce19864a361dbc8b` / `5c2a792c7896f6cbfeb460adfb4d05276675cf8b` |
| Review outcome | final security, deterministic-oracle, transaction and hardened owner-packet reviews: `CONFIRM`, zero open findings |
| Ceremony verification | 11 of 11 manifest rows verified against the frozen subject; manifest digest equals the phrase `[Observed, this act]` |
| Recording | `.syzygy/governance/decisions/PWB-STATE1-AMENDMENT-ACT.md`; annotated tag `pwb-state1-amendment-signed-2026-09-02` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)**. Valid state (1) and state
(2) human acts may satisfy PWB-REQ-005 and PWB-REQ-022; only state (2) is
independently verified. Invalid acts fail closed and acts remain warrants, not
success evidence.

This act grants no effect-specific consent or policy approval, registry
adoption, repository-body read, write, egress, execution, deployment, release,
recovery, implementation or mission authority. Separate effect-specific acts
and separate PWB implementation authorization remain open.

## PWB effect act — consent-observation — performed 2026-09-02

**Phrase, exactly as written by the owner (in-interaction, 2026-09-02):**

```text
CONSENT TO BUTLERS PROJECT-SHAPE OBSERVATION: 5d705d75f993059d5ae5561b1a6f99d143462d9d2e5bcea8ecc9b0c258777841
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `consent-observation` / `.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase and the manifest row |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | none |
| Reviewed subject / owner-packet head | `48e0f5db645d1fb08e5e3a65c5e50dbcece40412` / `a322a60e9f2b166273a80e3fc145bc3a8193c962` |
| Review outcome | security, confirmation and owner-packet reviews: `CONFIRM` |
| Recording | `.syzygy/governance/decisions/PWB-BUTLERS-OBSERVATION-CONSENT-ACT.md`; annotated tag `pwb-consent-observation-signed-2026-09-02` on the commit carrying these records |

Effective status: this one artifact is **effective owner authority — owner-
adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only. The
other two effect acts and PWB implementation authorization remain separate;
no body read, write, egress, execution, deployment, release, recovery or
mission authority follows from this act.

## PWB effect act — approve-policy — performed 2026-09-02

**Phrase, exactly as written by the owner (in-interaction, 2026-09-02):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 513a3be75bbd417a06d475c46bb423393ac59013e307157357083f29781a2a61
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase and the manifest row |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | none |
| Reviewed subject / owner-packet head | `48e0f5db645d1fb08e5e3a65c5e50dbcece40412` / `a322a60e9f2b166273a80e3fc145bc3a8193c962` |
| Review outcome | security, confirmation and owner-packet reviews: `CONFIRM` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-ACT.md`; annotated tag `pwb-approve-policy-signed-2026-09-02` on the commit carrying these records |

Effective status: this one artifact is **effective owner authority — owner-
adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only. The
other two effect acts and PWB implementation authorization remain separate;
no body read, write, egress, execution, deployment, release, recovery or
mission authority follows from this act.

## PWB effect act — adopt-registry-entry — performed 2026-09-02

**Phrase, exactly as written by the owner (in-interaction, 2026-09-02):**

```text
ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY: d71eadb612cf657983d96ad44415b832054dc37e51ea674e569d9b8f655d05d7
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `adopt-registry-entry` / `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase and the manifest row |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | none |
| Reviewed subject / owner-packet head | `48e0f5db645d1fb08e5e3a65c5e50dbcece40412` / `a322a60e9f2b166273a80e3fc145bc3a8193c962` |
| Review outcome | security, confirmation and owner-packet reviews: `CONFIRM` |
| Recording | `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-ACT.md`; annotated tag `pwb-adopt-registry-entry-signed-2026-09-02` on the commit carrying these records |

Effective status: this one artifact is **effective owner authority — owner-
adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only. The
other two effect acts and PWB implementation authorization remain separate;
no body read, write, egress, execution, deployment, release, recovery or
mission authority follows from this act.

## PWB truth-and-readiness amendment — performed 2026-09-05

**Phrase, exactly as written by the owner (in-interaction, 2026-09-05):**

```text
SIGN OFF PWB TRUTH-AND-READINESS AMENDMENT: 97e3d8f833d3448efb5a35b8d7bd3419b2e17d790f170a5d19976a6e076d578a
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `contracts/candidates/pwb-truth-policy-amendment/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Reviewed subject | `4daea0868a0e15ea2f9407efc18f143dbabbd64b` |
| Owner-packet / final evidence heads | `875ef026f00b3b2a87b72f2977ab12380af5cc2a` / `62d3bb74b21e43b07a7b708f5c743e6ee27ac946` |
| Review outcome | final contract/oracle, security/public-interface, comprehension and owner-packet reviews: `CONFIRM`, zero open findings |
| Ceremony verification | 11 of 11 manifest rows verified against the frozen subject; manifest digest equals the phrase `[Observed, this act]` |
| Supersession | the eleven digests of the 2026-09-02 PWB state-(1) amendment; that act remains immutable history |
| Recording | `.syzygy/governance/decisions/PWB-TRUTH-READINESS-AMENDMENT-ACT.md`; annotated tag `pwb-truth-readiness-amendment-signed-2026-09-05` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)** at these bytes. The
closed fact/precedence grammar, inert-code admission, deterministic resource
envelope, transient verbatim baseline requirement and PWB-REQ-021 readiness
are now signed requirements; PWB-REQ-005's and PWB-REQ-022's denominators are
unchanged.

This act approves no policy, adopts no registry entry, widens no consent and
authorizes no implementation of the amended semantics. Decisions 2 and 3 of
the packet and a separate continuation of implementation authorization remain
open; no write, egress, execution, deployment, release, recovery or mission
authority follows from this act.

## PWB effect-act amendment — approve-policy — performed 2026-09-05

**Phrase, exactly as written by the owner (in-interaction, 2026-09-05):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: d148f0360841cfc30cdc9ecedbffe722e31044e4bb048cd33f83cc193ee88e75
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase and the effect-manifest row |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | the 2026-09-02 `approve-policy` act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-ACT.md`; that act, its digest and its tag remain immutable history |
| Reviewed subject | `4daea0868a0e15ea2f9407efc18f143dbabbd64b` |
| Owner-packet / final evidence heads | `875ef026f00b3b2a87b72f2977ab12380af5cc2a` / `62d3bb74b21e43b07a7b708f5c743e6ee27ac946` |
| Review outcome | final contract/oracle, security/public-interface, comprehension and owner-packet reviews: `CONFIRM`, zero open findings |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md`; annotated tag `pwb-approve-policy-signed-2026-09-05` on the commit carrying these records |

Effective status: this one amended artifact is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only.
The other effect authorities and the continuation of PWB implementation
authorization remain separate; no body read, write, egress, execution,
deployment, release, recovery or mission authority follows from this act.

## PWB effect-act amendment — adopt-registry-entry — performed 2026-09-05

**Phrase, exactly as written by the owner (in-interaction, 2026-09-05):**

```text
ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY: 0765f4d534afad9003463790113fd433d250550091df783c1ff372d227643e4f
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `adopt-registry-entry` / `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase and the effect-manifest row |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | the 2026-09-02 `adopt-registry-entry` act recorded at `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-ACT.md`; that act, its digest and its tag remain immutable history |
| Reviewed subject | `4daea0868a0e15ea2f9407efc18f143dbabbd64b` |
| Owner-packet / final evidence heads | `875ef026f00b3b2a87b72f2977ab12380af5cc2a` / `62d3bb74b21e43b07a7b708f5c743e6ee27ac946` |
| Review outcome | final contract/oracle, security/public-interface, comprehension and owner-packet reviews: `CONFIRM`, zero open findings |
| Recording | `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md`; annotated tag `pwb-adopt-registry-entry-signed-2026-09-05` on the commit carrying these records |

Effective status: this one amended artifact is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only.
The other effect authorities and the continuation of PWB implementation
authorization remain separate; no body read, write, egress, execution,
deployment, release, recovery or mission authority follows from this act.

<!-- POLARIS-GENERATOR-SPECIFICATION-ADOPTION:BEGIN -->
# Polaris generator specification-adoption owner act

Date: 2026-09-12

Act instant: 2026-09-12T09:27:55Z

Owner: Tzeusy

Project identity: project:syzygy

Artifact/package identity: package:syzygy:polaris-manifesto-generation

Act identity: act:syzygy:polaris-generator:specification-adoption:48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Act type: specification-adoption

Supersession relationship: none; new act, no predecessor.

Revocation relationship: none; this act revokes no prior act.

Provenance state: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

Exact offer SHA-256: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Scope references: the exact offer's /sources artifact-role manifest, /acts/SPECIFICATION-ADOPTION,
/project and /package identities, /governing baseline, /reviews evidence, and
/conditional_references selected-value digests. Applicability further binds the
APPLICABILITY-DECISIONS.md source row; implementation binds EXECUTION-PHASES.md.

Exact transaction phrase:

```text
ADOPT POLARIS GENERATOR SPECIFICATION, SCOPED APPLICABILITY AND IMPLEMENTATION: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd
```

The SHA-256 argument binds the complete immutable offer, including source, role,
governing baseline, review and conditional-reference digests. It asserts no
committed-source identity.

Adopt the exact specification-role artifacts in the bound offer.

This record does not claim independently verified authorship, review verdict,
successful effects or implementation completion.
<!-- POLARIS-GENERATOR-SPECIFICATION-ADOPTION:END -->

<!-- POLARIS-GENERATOR-APPLICABILITY:BEGIN -->
# Polaris generator applicability owner act

Date: 2026-09-12

Act instant: 2026-09-12T09:27:55Z

Owner: Tzeusy

Project identity: project:syzygy

Artifact/package identity: package:syzygy:polaris-manifesto-generation

Act identity: act:syzygy:polaris-generator:applicability:48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Act type: applicability

Supersession relationship: none; new act, no predecessor.

Revocation relationship: none; this act revokes no prior act.

Provenance state: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

Exact offer SHA-256: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Scope references: the exact offer's /sources artifact-role manifest, /acts/APPLICABILITY,
/project and /package identities, /governing baseline, /reviews evidence, and
/conditional_references selected-value digests. Applicability further binds the
APPLICABILITY-DECISIONS.md source row; implementation binds EXECUTION-PHASES.md.

Exact transaction phrase:

```text
ADOPT POLARIS GENERATOR SPECIFICATION, SCOPED APPLICABILITY AND IMPLEMENTATION: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd
```

The SHA-256 argument binds the complete immutable offer, including source, role,
governing baseline, review and conditional-reference digests. It asserts no
committed-source identity.

Adopt GNA-1, GNA-2 and GNA-3 only within APPLICABILITY-DECISIONS.md's exact scope, and the exact conditional coverage references in the bound offer. No blanket waiver; conditional obligations remain attached to future enablement.

This record does not claim independently verified authorship, review verdict,
successful effects or implementation completion.
<!-- POLARIS-GENERATOR-APPLICABILITY:END -->

<!-- POLARIS-GENERATOR-IMPLEMENTATION-AUTHORIZATION:BEGIN -->
# Polaris generator implementation-authorization owner act

Date: 2026-09-12

Act instant: 2026-09-12T09:27:55Z

Owner: Tzeusy

Project identity: project:syzygy

Artifact/package identity: package:syzygy:polaris-manifesto-generation

Act identity: act:syzygy:polaris-generator:implementation-authorization:48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Act type: implementation-authorization

Supersession relationship: none; new act, no predecessor.

Revocation relationship: none; this act revokes no prior act.

Provenance state: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

Exact offer SHA-256: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd

Scope references: the exact offer's /sources artifact-role manifest, /acts/IMPLEMENTATION-AUTHORIZATION,
/project and /package identities, /governing baseline, /reviews evidence, and
/conditional_references selected-value digests. Applicability further binds the
APPLICABILITY-DECISIONS.md source row; implementation binds EXECUTION-PHASES.md.

Exact transaction phrase:

```text
ADOPT POLARIS GENERATOR SPECIFICATION, SCOPED APPLICABILITY AND IMPLEMENTATION: 48216b0607b1b82fa21f2c5f5a3499d604541b7a0a9bf93c9fd5f7c8deab29dd
```

The SHA-256 argument binds the complete immutable offer, including source, role,
governing baseline, review and conditional-reference digests. It asserts no
committed-source identity.

Authorize the full EXECUTION-PHASES.md implementation goal, including protected effect host, complete owner experience, two-project and changed-source proof obligations. Phase A alone is not completion. Real-project reads, provider egress and destination writes remain separately admitted; no effect, production release, broad remote access or observed-project code execution is authorized by this act.

This record does not claim independently verified authorship, review verdict,
successful effects or implementation completion.
<!-- POLARIS-GENERATOR-IMPLEMENTATION-AUTHORIZATION:END -->

<!-- POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION:BEGIN -->
# Polaris understanding specification amendment adoption

Owner: Tzeusy

Act instant: 2026-09-13T01:58:26Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:polaris-generation:understanding-amendment

Act type: adopt specification amendment

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

Owner instruction, recorded verbatim: “Adopt it”

The instruction refers to the reviewed formal amendment offered immediately
before it. The manifest below binds its exact eight-file subject and retained
review/context hashes. This recorder-generated binding is not presented as a
longer phrase typed by the owner:

ADOPT POLARIS UNDERSTANDING AMENDMENT: 3f4b96956b85a268532521ee5d0b1212d28537af7fddf09f89c877bd54bbc40d

Manifest: docs/evidence/polaris-understanding-adoption-manifest-2026-09-13.json

Scope: adopt the specification amendment at the manifest's exact bytes.
REQ-polaris-generation-002, 004, 006, 009, 012, 014 and 019 take their full
amended clauses and preserved scenarios; 030 and 031 are added. The other 22
predecessor requirements remain unchanged. Effective composition is 31
requirements and 177 scenarios, not an implementation completion verdict.

Supersession relationship: partial specification amendment to the subject of
POLARIS-GENERATOR-SPECIFICATION-ADOPTION-ACT.md. Only the seven named requirement
blocks are superseded by their extended blocks; the predecessor remains in force
for its unchanged requirements and is preserved byte-for-byte.

Revocation relationship: none. Existing implementation and applicability acts
retain their own exact scopes. This act grants no implementation extension,
source/provider/content permission, write consent, deployment or release.

Adoption leaves the reviewed files and their candidate-era banners unchanged.
The act record determines effective status. This is bootstrap owner provenance,
not independent authorship verification, runtime evidence or product readiness.
<!-- POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION:END -->

<!-- CONTRACT-READABILITY-RESTYLE-ADOPTION:BEGIN -->
# Contract readability restyle adoption

Owner: Tzeusy

Act instant: 2026-09-28T01:42:56Z

Project identity: project:syzygy

Artifact identity: contract:syzygy:rfc-0001-0009:readability-restyle

Act type: adopt contract amendment (successor to the general trusted-bootstrap contract manifest)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
ADOPT CONTRACT READABILITY RESTYLE: 6e83675fd61bf72a1912152dbc3c6dda64303e892eeadcf1273ce6aebe6ab134
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/contract-readability-restyle/CONTRACT-AMENDMENT-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: docs/reviews/R-TREE-STYLE-CONTRACT-PACKAGE-1-RAW.md (sha256 3a6121085b8cc53f060d70c325412420c627aff92bf831d45bce32ad570a150d)

The manifest binds the exact post-restyle bytes of 29 of the 30 accepted
RFC 0001-0009 modules, every one except rfcs/RFC-0007/rendering-and-surface.md.

Scope: readability restyle only. Clause identities, clause leads, front
matter and headings are unchanged by construction (the package builder
verifies all three); the installed and candidate mirrors take the same bytes.

Supersession relationship: link 2 of the contract successor chain. For its 29
paths it supersedes the current-byte rows of the general trusted-bootstrap
contract manifest, and of any earlier performed chain link, which remain
preserved as act-time history. RFC-0007's rendering module stays bound where
it was.

Revocation relationship: none. This act grants no implementation, source,
provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- CONTRACT-READABILITY-RESTYLE-ADOPTION:END -->

<!-- SPEC-POLICY-READABILITY-RESTYLE-ADOPTION:BEGIN -->
# Specification-policy readability restyle adoption

Owner: Tzeusy

Act instant: 2026-09-28T15:33:29Z

Project identity: project:syzygy

Artifact identity: policy:syzygy:cc-spec-cc-impact:readability-restyle

Act type: confirm craft amendment (successor to acts 6 and 7 and to row 5 of the general trusted-bootstrap transaction)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
CONFIRM SPECIFICATION POLICY READABILITY RESTYLE: 0abd08981ae693720c33c339b9d53ac2a4c42c141d0ad23be2e83e90c5cd000e
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/spec-policy-readability-restyle/SPEC-POLICY-AMENDMENT-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: docs/reviews/R-TREE-STYLE-SPEC-POLICY-PACKAGE-1-RAW.md (sha256 078f8aa18fbb143e9fe357901000154847eef3c8180e67bf14fb74c04ce0408b)

The recorder derived one craft-amendment line per manifest row. They are not
words the owner typed; they name each policy's confirmed digest:

```text
CONFIRM CRAFT AMENDMENT: CC-IMPACT@e08270a2d2589aafaad59d9958683f094fb6170b38cfaa30e49f48c41645989c
CONFIRM CRAFT AMENDMENT: CC-SPEC@38c0e629efa6fb6acdb3c7d0f63b02518191d03221ae290a6bbc691fc697a90e
```

Scope: readability restyle of CC-SPEC-1…11 and CC-IMPACT-1…7, plus the
status-banner corrections disclosed in the package's decision packet. Clause
leads, headings and identifiers are unchanged by construction (the package
builder verifies all three). CC-IMPACT-7's fixture pin is unchanged.

Supersession relationship: each policy's current bytes are bound by its row
above. The act-6, act-7 and transaction-row digests remain preserved as
act-time history.

Revocation relationship: none. This act grants no implementation, source,
provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- SPEC-POLICY-READABILITY-RESTYLE-ADOPTION:END -->

<!-- THREE-SURFACE-POC-READABILITY-SUCCESSOR:BEGIN -->
# Three-Surface POC readability successor sign-off

Owner: Tzeusy

Act instant: 2026-09-29T18:11:35Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:three-surface-poc-experience:readability-successor

Act type: sign off specification successor (successor to THREE-SURFACE-POC-SPEC-SIGNOFF-ACT.md and to the coverage row of the general trusted-bootstrap transaction)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
SIGN OFF THREE-SURFACE POC READABILITY SUCCESSOR: 221f1ececa321bf0cc6cd5e01f401e9eada38466c3c00dde43095f8cb8a0cd4d
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/three-surface-poc-readability-successor/THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: docs/reviews/R-POC-READABILITY-SUCCESSOR-PACKAGE-1-RAW.md (sha256 8170554c25040cf87f8b5e40342e959d1d94bfed976d8d41ca662b85d5acb255)

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
| `openspec/changes/three-surface-poc-experience/.openspec.yaml` | `9187547d8cc17017ebd44132527d2d5e096d1ef9705de80cc4f1cf34531f6976` | `9187547d8cc17017ebd44132527d2d5e096d1ef9705de80cc4f1cf34531f6976` |
| `openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md` | `f29a01f6a5725f4ac7085fa04a62de757fd16153d507ae5e415ae0b501fdc0a4` | `f29a01f6a5725f4ac7085fa04a62de757fd16153d507ae5e415ae0b501fdc0a4` |
| `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md` | `4bdcf6c6dbd07aad7d44fb1d6fbb9ae37ea56bed2ed66532231cdc37a71c1da4` | `f8b66a710f9e3242f79b26b9c02eb4f44c55cd8368b517cd856da80b2ecbe1c5` |
| `openspec/changes/three-surface-poc-experience/design.md` | `0847bf5f78155712c13535a3de4a25be300ee6a726b5199e84e318103c28695c` | `6d39ea6f6111abaea32c74ce96c975ae53e077485f0ed8f7c97545e64d7ba295` |
| `openspec/changes/three-surface-poc-experience/proposal.md` | `6459f56cba26e0bc38c71a4a93ea571aa11eabdc847c96c81f8afcf30b72eddb` | `0650a6a3bc50158dc793802b9dcd40057b3199b3f7e9f8341a5bdc79cbea941a` |
| `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md` | `f0eda5b9ec8766e2b4b961fb2940c4ece7aa97b1c397e10d570abb04f5dd960e` | `bb9112a55a1cf2afdd6911815e80fa645f517f8a4e8b1b262ecf7381be515410` |

Scope: readability restyle of the six-file Three-Surface POC specification.
The 24 POC-REQ identities, their requirement words, scenarios and warrants
are unchanged; the package builder verifies them.

Supersession relationship: each subject is bound by its successor digest
above. The earlier sign-off act and its digests are preserved as act-time
history.

Revocation relationship: none. This act widens no implementation direction
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- THREE-SURFACE-POC-READABILITY-SUCCESSOR:END -->

<!-- CAPABILITY-1-READABILITY-SUCCESSOR:BEGIN -->
# Capability 1 readability successor sign-off

Owner: Tzeusy

Act instant: 2026-09-29T18:11:35Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:capability-1:readability-successor

Act type: sign off specification successor (successor to CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md and the CONTRACT-COVERAGE.md row of the general trusted-bootstrap transaction)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
SIGN OFF CAPABILITY 1 READABILITY SUCCESSOR: 10db138947497200ad7c788ce4719ba515c61832e3138f1af42201ec84a8870d
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/capability-1-readability-successor/SUCCESSOR-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the package pins.

Confirming review: docs/reviews/R-CAP1-READABILITY-SUCCESSOR-2-RAW.md (sha256 1197bab77bc53546d4c1da414ebccaa97359170b8e9296d12d29976bd25e0fd1)

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
| `openspec/changes/project-registration-and-honest-shape-visibility/.openspec.yaml` | `727fc3b35bb3eb09ccede6d08cbc829ea0044b031816d47842ec2573bff99290` | `727fc3b35bb3eb09ccede6d08cbc829ea0044b031816d47842ec2573bff99290` |
| `openspec/changes/project-registration-and-honest-shape-visibility/CAPABILITY-COVERAGE.md` | `2f6f4de4650b6800b968d243dd5887919ea7d4da550413db570d6928ac7646e9` | `2f6f4de4650b6800b968d243dd5887919ea7d4da550413db570d6928ac7646e9` |
| `openspec/changes/project-registration-and-honest-shape-visibility/CONTRACT-COVERAGE.md` | `15431d8ba1fe25a61e4dc2713c4d51fad1cf6d25ef7a9103cc616265102289c9` | `15431d8ba1fe25a61e4dc2713c4d51fad1cf6d25ef7a9103cc616265102289c9` |
| `openspec/changes/project-registration-and-honest-shape-visibility/GOVERNING-DEPENDENCIES.md` | `a00ccbf24f2e106ec3a396b8ae637097b4aaca9965548aab6d1cda0f37851c8e` | `a00ccbf24f2e106ec3a396b8ae637097b4aaca9965548aab6d1cda0f37851c8e` |
| `openspec/changes/project-registration-and-honest-shape-visibility/design.md` | `a7a90828ed51fd5e98d8cbc9f35f2aa88b5cdd75f6a53f905b816dcc11267652` | `12bb357f30c3f8a3107b507ddedaf2e715c974ca877db8f031699e6268a384ee` |
| `openspec/changes/project-registration-and-honest-shape-visibility/proposal.md` | `a9e170909acb672d7c46d02a6a8456511680feef4ef994ab5c297315961b735e` | `4cda00e0df635a853360e22f7c9d3dde68424782a115d1eadf2b7ddeab5c869a` |
| `openspec/changes/project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md` | `65b66c913cd2650881a9df8cb34a3c63b3f518041e83f45d2451980d9f1d0448` | `65b66c913cd2650881a9df8cb34a3c63b3f518041e83f45d2451980d9f1d0448` |

Scope: readability restyle of the Capability 1 proposal and design, including a present-tense status banner in place of the pre-adoption candidate banner. The specification, both coverage tables and the generated dependencies are unchanged. Every requirement, scenario and warrant block is
unchanged; the successor tool verifies that structure.

Supersession relationship: each subject is bound by its successor digest
above. Earlier acts and their digests are preserved as act-time history.

Revocation relationship: none. This act widens no implementation authority
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- CAPABILITY-1-READABILITY-SUCCESSOR:END -->

<!-- POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR:BEGIN -->
# Polaris generator base readability successor sign-off

Owner: Tzeusy

Act instant: 2026-09-29T18:11:35Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:polaris-generation:base-readability-successor

Act type: sign off specification successor (successor to the specification role of POLARIS-GENERATOR-SPECIFICATION-ADOPTION-ACT.md for proposal.md and design.md; the applicability and implementation acts keep their own scopes)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
SIGN OFF POLARIS GENERATOR BASE READABILITY SUCCESSOR: 6ab71229125b7fe6c718978185932395dd909bfbe60bfd86972c1d34f6effa59
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/polaris-generator-base-readability-successor/SUCCESSOR-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the package pins.

Confirming review: docs/reviews/R-POLARIS-BASE-READABILITY-SUCCESSOR-2-RAW.md (sha256 88139639bf9bd52eb6a61eb5e72086666100da42c0d63522e7ec1eba4cd71556)

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
| `docs/design/POLARIS-GENERATOR-DELIVERY.md` | `51f878fe4cb0dc90ca033ecef399a61d3fa2b825794bf69fdcb256dfc1e407bb` | `51f878fe4cb0dc90ca033ecef399a61d3fa2b825794bf69fdcb256dfc1e407bb` |
| `docs/design/POLARIS-GENERATOR-OWNER-PACKET.md` | `a26ef879ee068198cc702a6ad20ab241fbadb9ff8902104eb755d08506d9b760` | `a26ef879ee068198cc702a6ad20ab241fbadb9ff8902104eb755d08506d9b760` |
| `openspec/changes/polaris-manifesto-generation/.openspec.yaml` | `2f19e85bc27192bfcfbe4fcfb49c1e49b7569f6d840f97966b535a07da28bc59` | `2f19e85bc27192bfcfbe4fcfb49c1e49b7569f6d840f97966b535a07da28bc59` |
| `openspec/changes/polaris-manifesto-generation/ADAPTER-DECLARATIONS.md` | `3836b93909611fd59890450383e897f9635ee4ba4cd4b5a22ccd611d9ea33564` | `3836b93909611fd59890450383e897f9635ee4ba4cd4b5a22ccd611d9ea33564` |
| `openspec/changes/polaris-manifesto-generation/APPLICABILITY-DECISIONS.md` | `faeae75a1b265667db5969849dec52f8796da69af1407652b053b6554d26b23e` | `faeae75a1b265667db5969849dec52f8796da69af1407652b053b6554d26b23e` |
| `openspec/changes/polaris-manifesto-generation/ASSET-CONTRACT.md` | `0804b40250c7bfb284bac97567e0278cfd16e6c8b5a5d5c25db28e8e7efb60d9` | `0804b40250c7bfb284bac97567e0278cfd16e6c8b5a5d5c25db28e8e7efb60d9` |
| `openspec/changes/polaris-manifesto-generation/CAPABILITY-COVERAGE.md` | `4589e9ee4a5303fdc25d216a0a63e6d732c1185b5a1eb8bb23c7f1b8199b39e0` | `4589e9ee4a5303fdc25d216a0a63e6d732c1185b5a1eb8bb23c7f1b8199b39e0` |
| `openspec/changes/polaris-manifesto-generation/DESIGN-ACCEPTANCE.md` | `d2ff62db58995ef1fe44b3b6044917743ab5546b56827ba492f1b8ff8580f067` | `d2ff62db58995ef1fe44b3b6044917743ab5546b56827ba492f1b8ff8580f067` |
| `openspec/changes/polaris-manifesto-generation/EFFECT-HOST-DESIGN.md` | `11e5c16a9965774eba7e1743e3228fbb5a13c6857829ae79cd61fcc90c59d559` | `11e5c16a9965774eba7e1743e3228fbb5a13c6857829ae79cd61fcc90c59d559` |
| `openspec/changes/polaris-manifesto-generation/ENTRY-AND-WALKTHROUGH.md` | `b65cd0f69b7800d683ae2d2e3b3053dde1d7c0607f430f90b033eef5c6817f96` | `b65cd0f69b7800d683ae2d2e3b3053dde1d7c0607f430f90b033eef5c6817f96` |
| `openspec/changes/polaris-manifesto-generation/EXECUTION-PHASES.md` | `8e3e2c4494df964addb76a885a5b349051f5a0a543346ff4dc15f7c1598b1245` | `8e3e2c4494df964addb76a885a5b349051f5a0a543346ff4dc15f7c1598b1245` |
| `openspec/changes/polaris-manifesto-generation/GOVERNING-DEPENDENCIES.md` | `4edf4fe9744370fc61c250926d353890ee6283eb4898e83709ab76e2b627dfa3` | `4edf4fe9744370fc61c250926d353890ee6283eb4898e83709ab76e2b627dfa3` |
| `openspec/changes/polaris-manifesto-generation/INTERFACES.md` | `96e7e396c825d614503253ea45cd0c4317051516c5159e8f120d2786be7243dc` | `96e7e396c825d614503253ea45cd0c4317051516c5159e8f120d2786be7243dc` |
| `openspec/changes/polaris-manifesto-generation/NAVIGATION-CONTRACT.md` | `e30570230c93516adb8d44e30bb810dc4df5ccde3f7d9a32a215214af3cdc321` | `e30570230c93516adb8d44e30bb810dc4df5ccde3f7d9a32a215214af3cdc321` |
| `openspec/changes/polaris-manifesto-generation/OWNER-FLOW.md` | `414d845d91b52578c58474446d5feb6c7dc9f1185d8625e4c8ae794edc48c5a9` | `414d845d91b52578c58474446d5feb6c7dc9f1185d8625e4c8ae794edc48c5a9` |
| `openspec/changes/polaris-manifesto-generation/SCHEMA-CONTRACT.md` | `722eea7233cfb913f4f2e21060f359d721a86336efa1a3851e31ba113a857e8f` | `722eea7233cfb913f4f2e21060f359d721a86336efa1a3851e31ba113a857e8f` |
| `openspec/changes/polaris-manifesto-generation/SECURITY-CONTRACT.md` | `c6f2703a92a33d31fa5f0644cb4ce669048187d6aa72ce61a4c3aee90bdad6b5` | `c6f2703a92a33d31fa5f0644cb4ce669048187d6aa72ce61a4c3aee90bdad6b5` |
| `openspec/changes/polaris-manifesto-generation/SOURCE-POLICY.md` | `af26acc453396d8b8ddbad94d939bd56f3d87b30ef2a0d3a411c378c48fbba89` | `af26acc453396d8b8ddbad94d939bd56f3d87b30ef2a0d3a411c378c48fbba89` |
| `openspec/changes/polaris-manifesto-generation/WORK-STATE-CONTRACT.md` | `b86d0b944c395bbe66c4363d34be54531c55b6f72e76862626946851e199a986` | `b86d0b944c395bbe66c4363d34be54531c55b6f72e76862626946851e199a986` |
| `openspec/changes/polaris-manifesto-generation/design.md` | `236f9e015449b52fdcb8b75365d8600c0c1096f10784d0030abe56c55fce90ec` | `19d4c147c0ba83693c1406f08186efc68dcc046a0352c3845a54b0a4f3351103` |
| `openspec/changes/polaris-manifesto-generation/proposal.md` | `67970484f22a9882d09d896813d2b2b951cd87dd66ffb939a2001c092fc38651` | `ef7bc2a37a181bf6530493995ab47e78260989d2664f61e0165bcca852565f99` |
| `openspec/changes/polaris-manifesto-generation/specs/polaris-generation/spec.md` | `a8199646c3b7953e8c4101d70d0307813dd1b3927d0b403f76c22d280dd6a89b` | `a8199646c3b7953e8c4101d70d0307813dd1b3927d0b403f76c22d280dd6a89b` |
| `openspec/changes/polaris-manifesto-generation/tasks.md` | `d781a1b45fc0e4d216537f40a9e519d41df94eaf1ff252f3484c5f7fd5f794f6` | `d781a1b45fc0e4d216537f40a9e519d41df94eaf1ff252f3484c5f7fd5f794f6` |

Scope: readability restyle of the Polaris generator proposal and design, with present-tense status in place of pre-adoption candidate language. The specification, every contract document and the other bound sources are unchanged, and the understanding amendment's overlay is untouched. Every requirement, scenario and warrant block is
unchanged; the successor tool verifies that structure.

Supersession relationship: each subject is bound by its successor digest
above. Earlier acts and their digests are preserved as act-time history.

Revocation relationship: none. This act widens no implementation authority
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR:END -->

<!-- POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR:BEGIN -->
# Polaris understanding amendment readability successor sign-off

Owner: Tzeusy

Act instant: 2026-09-29T18:11:35Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:polaris-generation:understanding-readability-successor

Act type: sign off specification successor (successor to the specification role of POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md for the amendment's proposal.md and design.md; the tree-form amendment keeps its REQ-polaris-generation-004 bytes)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
SIGN OFF POLARIS UNDERSTANDING READABILITY SUCCESSOR: 2bd0892a2d6b7ca09cfc06dd4325a1bc3cd3706852a08963836b17bd2c5d3b98
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/polaris-understanding-readability-successor/SUCCESSOR-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the package pins.

Confirming review: docs/reviews/R-POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-2-RAW.md (sha256 5dae036a061f0493b10238b6b20277142cc41f4d08f1f8ef54340c79e5c83911)

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
| `openspec/changes/polaris-manifesto-understanding-amendment/.openspec.yaml` | `7e69d8445cf79fa4a5398138abf3cd1865bd0750cc53f44a98ef9904f1395f73` | `7e69d8445cf79fa4a5398138abf3cd1865bd0750cc53f44a98ef9904f1395f73` |
| `openspec/changes/polaris-manifesto-understanding-amendment/COVERAGE.md` | `a9506370bb972502a8cb37c6a66c6e14c787bf6dab878cae2e1b0d62018c1acf` | `a9506370bb972502a8cb37c6a66c6e14c787bf6dab878cae2e1b0d62018c1acf` |
| `openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md` | `315207c0be81915f2461c1d94a8468a39171b98f1a11deeddd78e8ee676ba32e` | `315207c0be81915f2461c1d94a8468a39171b98f1a11deeddd78e8ee676ba32e` |
| `openspec/changes/polaris-manifesto-understanding-amendment/SYNTHESIS-MAP.json` | `2d961976b315d64f69bb5675e30614866b42fee75450bc6ab929f69e32d13d75` | `2d961976b315d64f69bb5675e30614866b42fee75450bc6ab929f69e32d13d75` |
| `openspec/changes/polaris-manifesto-understanding-amendment/design.md` | `5b06017d100d635125b1b663be4d8ed766e41e9f66b0e85e218f3234eb51fd17` | `37a64e32d869414392a00a54c98a883ba9f8a5f575530998e5fd44d576f50fa8` |
| `openspec/changes/polaris-manifesto-understanding-amendment/proposal.md` | `284859db3e1c4c5b763f8349584c35ac89d19dceef7d8a3b45238cf5f7d01ffd` | `6378d83eeba81d0dfe96f579f6d98059721efb816c67e2cd155b04e6c03b6f39` |
| `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md` | `6841e63cda0ccdb81966a6fabbdfaf3721910df8ea04959711eb59843859ba58` | `6841e63cda0ccdb81966a6fabbdfaf3721910df8ea04959711eb59843859ba58` |
| `openspec/changes/polaris-manifesto-understanding-amendment/tasks.md` | `f0e78d5915f076af4117cb839dee0afb27303b2578eea488c952706e382df68c` | `f0e78d5915f076af4117cb839dee0afb27303b2578eea488c952706e382df68c` |

Scope: readability restyle of the Polaris understanding amendment's proposal and design, with present-tense status in place of pre-adoption candidate language. The amendment's specification, coverage, synthesis map, tasks and the base generator change are unchanged. Every requirement, scenario and warrant block is
unchanged; the successor tool verifies that structure.

Supersession relationship: each subject is bound by its successor digest
above. Earlier acts and their digests are preserved as act-time history.

Revocation relationship: none. This act widens no implementation authority
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR:END -->

## PWB effect-act amendment — adopt-registry-entry — currency and briefing — performed 2026-09-30

**Phrase, exactly as written by the owner (in-interaction, 2026-09-30):**

```text
ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY: 2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `adopt-registry-entry` / `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself, recomputed at recording and equal to the phrase, the effect-manifest row and the artifact on disk after the package's patch was applied |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | the 2026-09-05 `adopt-registry-entry` act recorded at `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md`; that act, its digest and its tag remain immutable history |
| Frozen subject / packet head | `4b59e39f501bae2a7ffbbe9dad5c76df2a8f85e5` / `4b59e39f501bae2a7ffbbe9dad5c76df2a8f85e5` |
| Effect manifest | `.syzygy/governance/contracts/candidates/pwb-registry-currency-briefing-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt`, SHA-256 `df174263c462db92001ea629116df9d51e2f7679db7676c3c5b29601081b4b13` |
| Review outcome | `docs/reviews/R-PWB-REGISTRY-CURRENCY-BRIEFING-DELTA-CONFIRMATION-3-RAW.md`: `CONFIRM`, its head bound to the argument (the manifest row) |
| Recording | `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md`; annotated tag `pwb-adopt-registry-entry-signed-2026-09-30` on the commit carrying these records |

Effective status: this one amended artifact is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only.
The other effect authorities, the plain continuation direction and the
machine-view sign-off remain separate; no body read, write, egress,
execution, deployment, release, recovery or mission authority follows from
this act.

## PWB behavior amendment — opening-band — performed 2026-10-01

**Phrase, exactly as written by the owner (in-interaction, 2026-10-01):**

```text
SIGN OFF PWB OPENING-BAND SCENARIO: 7f80cb05f644dd1e4f49e7b212d6972ee4754e40682450e59a6c3245546d5c46
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `.syzygy/governance/contracts/candidates/pwb-opening-band-scenario/PWB-OPENING-BAND-SCENARIO-MANIFEST.txt`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject / packet head | `3369410d1e08366b852422a457e473e5fec64f1c` / `3369410d1e08366b852422a457e473e5fec64f1c` |
| Review outcome | `docs/reviews/R-PWB-OPENING-BAND-SCENARIO-DELTA-CONFIRMATION-10-RAW.md`: `CONFIRM WITH EXCEPTIONS`, bound to this manifest digest; disposition: `.syzygy/governance/contracts/candidates/pwb-opening-band-scenario/ROUND-11-DISPOSITIONS.md` |
| Ceremony verification | 11 of 11 manifest rows verified against the tree after the package's patches were applied; manifest digest equals the phrase `[Observed, this act]` |
| Supersession | the latest link over the eleven-artifact PWB behavior population; every earlier act's rows remain immutable history |
| Recording | `.syzygy/governance/decisions/PWB-OPENING-BAND-SCENARIO-ACT.md`; annotated tag `pwb-opening-band-scenario-signed-2026-10-01` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)** at these bytes.

This act approves no policy, adopts no registry entry, widens no consent and
authorizes no implementation of the amended semantics; no write, egress,
execution, deployment, release, recovery or mission authority follows from
this act.

## PWB behavior amendment — render-mode — performed 2026-10-02

**Phrase, exactly as written by the owner (in-interaction, 2026-10-02):**

```text
SIGN OFF PWB EXACT-SOURCE RENDER-MODE AMENDMENT: 527be5ac3732619608355ae9658c92cee45341e831521bc526398481dd915785
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `.syzygy/governance/contracts/candidates/pwb-exact-source-render-mode-scenario/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject / packet head | `4b2f0df92676dfb89ca600c15f349070251d74bb` / `4b2f0df92676dfb89ca600c15f349070251d74bb` |
| Review outcome | `docs/reviews/R-PWB-EXACT-SOURCE-RENDER-MODE-DELTA-CONFIRMATION-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`, bound to this manifest digest; disposition: `.syzygy/governance/contracts/candidates/pwb-exact-source-render-mode-scenario/ROUND-3-DISPOSITIONS.md` |
| Ceremony verification | 11 of 11 manifest rows verified against the tree after the package's patches were applied; manifest digest equals the phrase `[Observed, this act]` |
| Supersession | the latest link over the eleven-artifact PWB behavior population; every earlier act's rows remain immutable history |
| Recording | `.syzygy/governance/decisions/PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md`; annotated tag `pwb-exact-source-render-mode-amendment-signed-2026-10-02` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)** at these bytes.

This act approves no policy, adopts no registry entry, widens no consent and
authorizes no implementation of the amended semantics; no write, egress,
execution, deployment, release, recovery or mission authority follows from
this act.

## PWB behavior amendment — machine-view — performed 2026-10-02

**Phrase, exactly as written by the owner (in-interaction, 2026-10-02):**

```text
SIGN OFF PWB MACHINE-VIEW AMENDMENT: acabc7915e4461186b5878ce40cc0c62ed7cf91eadd7eead1cb179c80f672e72
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `.syzygy/governance/contracts/candidates/pwb-machine-view-amendment/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject / packet head | `e58fd1cd1021734a6a617e87424ad3b531c3a61c` / `e58fd1cd1021734a6a617e87424ad3b531c3a61c` |
| Review outcome | `docs/reviews/R-PWB-MACHINE-VIEW-DELTA-CONFIRMATION-6-RAW.md`: `CONFIRM WITH EXCEPTIONS`, bound to this manifest digest; disposition: `.syzygy/governance/contracts/candidates/pwb-machine-view-amendment/ROUND-7-DISPOSITIONS.md` |
| Ceremony verification | 11 of 11 manifest rows verified against the tree after the package's patches were applied; manifest digest equals the phrase `[Observed, this act]` |
| Supersession | the latest link over the eleven-artifact PWB behavior population; every earlier act's rows remain immutable history |
| Recording | `.syzygy/governance/decisions/PWB-MACHINE-VIEW-AMENDMENT-ACT.md`; annotated tag `pwb-machine-view-amendment-signed-2026-10-02` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)** at these bytes.

This act approves no policy, adopts no registry entry, widens no consent and
authorizes no implementation of the amended semantics; no write, egress,
execution, deployment, release, recovery or mission authority follows from
this act.

<!-- versioned-signoff:pwb-missing-currency-disclosure-scenario:v1.0 -->
## Versioned sign-off — pwb-missing-currency-disclosure-scenario — v1.0 — recorded 2026-10-02

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-DELTA-CONFIRMATION-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-missing-currency-disclosure-scenario/ROUND-4-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-SIGNOFF-v1.0.md`; annotated tag `pwb-missing-currency-disclosure-scenario-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-missing-currency-disclosure-scenario:v1.0 -->

<!-- versioned-signoff:pwb-dismissal-expiry-amendment:v1.0 -->
## Versioned sign-off — pwb-dismissal-expiry-amendment — v1.0 — recorded 2026-10-02

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-DOV29-DISMISSAL-EXPIRY-DELTA-6-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-dismissal-expiry-amendment/ROUND-6-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-DISMISSAL-EXPIRY-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-dismissal-expiry-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-dismissal-expiry-amendment:v1.0 -->

<!-- versioned-signoff:pwb-container-shape-profile-amendment:v1.0 -->
## Versioned sign-off — pwb-container-shape-profile-amendment — v1.0 — recorded 2026-10-02

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-N8-CONTAINER-SHAPE-PROFILE-7-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-container-shape-profile-amendment/ROUND-7-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-CONTAINER-SHAPE-PROFILE-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-container-shape-profile-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-container-shape-profile-amendment:v1.0 -->

<!-- versioned-signoff:pwb-item-depth-amendment:v1.0 -->
## Versioned sign-off — pwb-item-depth-amendment — v1.0 — recorded 2026-10-02

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-ITEM-DEPTH-AMENDMENT-REVIEW-6-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-item-depth-amendment/ROUND-3-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-ITEM-DEPTH-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-item-depth-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-item-depth-amendment:v1.0 -->

<!-- versioned-signoff:pwb-readability-successor:v1.0 -->
## Versioned sign-off — pwb-readability-successor — v1.0 — recorded 2026-10-02

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-READABILITY-SUCCESSOR-1-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-readability-successor/ROUND-1-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md`; annotated tag `pwb-readability-successor-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-readability-successor:v1.0 -->

## PWB effect-act amendment — approve-policy — behaviour-contract re-pin — performed 2026-10-02

**Phrase the act takes (given 2026-10-02 by option selection, not typed; see the
dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 66cd41ee626efb11d666d19c0cd42c6d001ec4482837b71475c42f661f1d936c
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the policy row of the effect manifest, recomputed at recording and equal to the artifact on disk after the package's patch was applied |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | the 2026-09-05 `approve-policy` act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md`; that act, its digest and its tag remain immutable history |
| Frozen subject / packet head | `140874b7364266475dd8980be480e2783e0d8e72` / `140874b7364266475dd8980be480e2783e0d8e72` |
| Effect manifest | `.syzygy/governance/contracts/candidates/pwb-behavior-contract-repin/PWB-EFFECT-REPIN-MANIFEST.txt`, SHA-256 `036e49ee804126fbf56f77d593bc0d62c155e283f3535f6ef3952f60aec04fb8` |
| Review outcome | `docs/reviews/R-PWB-BEHAVIOR-CONTRACT-REPIN-RAW.md`: `CONFIRM WITH EXCEPTIONS`, notes only, its head bound to the effect manifest file |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md`; annotated tag `pwb-approve-policy-signed-2026-10-02` on the commit carrying these records |

Effective status: this one re-pinned artifact is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only.
The other effect authorities and the plain continuation direction remain
separate; no body read, write, egress, execution, deployment, release,
recovery or mission authority follows from this act.

## PWB effect-act amendment — adopt-registry-entry — behaviour-contract re-pin — performed 2026-10-02

**Phrase the act takes (given 2026-10-02 by option selection, not typed; see the
dedicated record):**

```text
ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY: ad9cd6769bffbb1a3ef94625c73226dec133fb7c9f1e0bc40186b09b15e165fa
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `adopt-registry-entry` / `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the registry row of the effect manifest, recomputed at recording and equal to the artifact on disk after the package's patch was applied |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Supersession | the 2026-09-30 `adopt-registry-entry` act recorded at `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md`; that act, its digest and its tag remain immutable history |
| Frozen subject / packet head | `140874b7364266475dd8980be480e2783e0d8e72` / `140874b7364266475dd8980be480e2783e0d8e72` |
| Effect manifest | `.syzygy/governance/contracts/candidates/pwb-behavior-contract-repin/PWB-EFFECT-REPIN-MANIFEST.txt`, SHA-256 `036e49ee804126fbf56f77d593bc0d62c155e283f3535f6ef3952f60aec04fb8` |
| Review outcome | `docs/reviews/R-PWB-BEHAVIOR-CONTRACT-REPIN-RAW.md`: `CONFIRM WITH EXCEPTIONS`, notes only, its head bound to the effect manifest file |
| Recording | `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md`; annotated tag `pwb-adopt-registry-entry-signed-2026-10-02` on the commit carrying these records |

Effective status: this one re-pinned artifact is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own PWB-REQ-005 role only.
The other effect authorities and the plain continuation direction remain
separate; no body read, write, egress, execution, deployment, release,
recovery or mission authority follows from this act.

<!-- POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR:BEGIN -->
# Polaris understanding amendment dependency-union successor sign-off

Owner: Tzeusy

Act instant: 2026-10-02T17:17:57Z

Project identity: project:syzygy

Artifact identity: specification:syzygy:polaris-generation:understanding-dependency-union-successor

Act type: sign off specification successor (successor to the specification role of POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-ACT.md for the amendment's generated GOVERNING-DEPENDENCIES.md only; every other amendment file keeps its bytes)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
SIGN OFF POLARIS UNDERSTANDING DEPENDENCY UNION SUCCESSOR: 9c01c82d482aa79a5342ec650e7c284e4c90a900e38ea8166c8f7708599b34c8
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/polaris-understanding-dependency-union-successor/SUCCESSOR-MANIFEST.txt. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the package pins.

Confirming review: docs/reviews/R-POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-1-RAW.md (sha256 335f0068b349535bc71a1e53a5d85d1d1fd94557ab8bcf73df255d9e1b316683)

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
| `openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md` | `315207c0be81915f2461c1d94a8468a39171b98f1a11deeddd78e8ee676ba32e` | `e6067cf6b9dcb901d06734b5f97667b81e258b4dff3f5667b80d70c5b8a6685d` |

Scope: regeneration of the Polaris understanding amendment's generated dependency union from its specification's warrants blocks, adding CC-REV-8 to the policies class as REQ-polaris-generation-004 already declares. The specification, proposal, design, coverage, synthesis map, tasks and the base generator change are unchanged. Every requirement, scenario and warrant block is
unchanged; the successor tool verifies that structure.

Supersession relationship: each subject is bound by its successor digest
above. Earlier acts and their digests are preserved as act-time history.

Revocation relationship: none. This act widens no implementation authority
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
<!-- POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR:END -->

<!-- versioned-signoff:pwb-tree-framing-amendment:v1.0 -->
## Versioned sign-off — pwb-tree-framing-amendment — v1.0 — recorded 2026-10-03

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-TREE-FRAMING-AMENDMENT-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-tree-framing-amendment/ROUND-2-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-tree-framing-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-tree-framing-amendment:v1.0 -->

<!-- versioned-signoff:polaris-dossier-local-agent-mode:v1.0 -->
## Versioned sign-off — polaris-dossier-local-agent-mode — v1.0 — recorded 2026-10-06

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification delta |
| Review outcome | `docs/reviews/R-POLARIS-DOSSIER-LOCAL-AGENT-MODE-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/POLARIS-DOSSIER-LOCAL-AGENT-MODE-REVIEW-NOTES.md` |
| Recording | `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`; annotated tag `polaris-dossier-local-agent-mode-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:polaris-dossier-local-agent-mode:v1.0 -->

<!-- versioned-signoff:polaris-dossier-local-agent-mode:v1.1 -->
## Versioned sign-off — polaris-dossier-local-agent-mode — v1.1 — recorded 2026-10-07

The owner signed off version 1.1 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification delta |
| Review outcome | `docs/reviews/R-POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-1-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-1-REVIEW-NOTES.md` |
| Recording | `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`; annotated tag `polaris-dossier-local-agent-mode-v1.1` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:polaris-dossier-local-agent-mode:v1.1 -->

## Public-source screening scope act — approve-policy — performed 2026-10-07

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: d42defcaf4dbb9b4e815f988ef8ba62be1dad081aa851d430b427b35c42f346b
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `02c37988264d77d7a3114895a49c34795aba45b7` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt`, SHA-256 `1cbf45a0da07a4cf769a17b6ac98960c6ae214c2d88a4f974e7b9d5026bc4f83` |
| Review outcome | `.syzygy/governance/contracts/candidates/public-source-screening-scope/reviews/R-PUBLIC-SOURCE-SCREENING-SCOPE-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:47:25Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gate is re-pointed by a separate change.

## RFC5-14 project-documentation amendment act — contract-amendment — performed 2026-10-07

Act instant: 2026-10-07T17:48:25Z

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
AMEND RFC5-14 WITH THE PROJECT-DOCUMENTATION CONTENT CLASS: a69a606cc7c14da5de03ec26aaec435af2fee3fa4c7bfb8a92fc30deefa40c91
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `contract-amendment` / `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md` |
| Argument | SHA-256 of the patched module: the one row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `dff2f0dc5cf6b8a876c4d4233cb0bef8e3e7dce4` |
| Manifest | `.syzygy/governance/contracts/candidates/rfc5-project-documentation-class/CONTRACT-AMENDMENT-MANIFEST.txt`, file SHA-256 `361d1948fb7c3e06a0fbb9cae71e5ecdaabfaefb45cb29531b8d4bfd2135cb6f` |
| Review outcome | `.syzygy/governance/contracts/candidates/rfc5-project-documentation-class/reviews/R-RFC5-PROJECT-DOCUMENTATION-CLASS-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recording | `.syzygy/governance/decisions/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`; annotated tag `rfc5-project-documentation-amendment-signed-2026-10-07` on the commit carrying these records |

Effective status: this record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only; the patch
takes effect in the change that installs it.

<!-- PWB-POLICY-SCOPE-V2:BEGIN -->
## Public-source screening scope version 2 act — approve-policy — performed 2026-10-07

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 98a87f818e0c60ca11f808f9122bbd4b1df1ad72a29f85eb81b879fd644d3f49
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the chosen row (variant `none`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `7327259c293263e64599988b9785e6c3ecd058a3` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v2/PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt`, SHA-256 `7757e70c4d0e8e65c19c77f4970853967456cdd7f225077feac1f91e16200e1e` |
| Review outcome | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v2/reviews/R-PUBLIC-SOURCE-SCREENING-SCOPE-V2-7-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:49:25Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-v2-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gate is re-pointed by a separate change.
<!-- PWB-POLICY-SCOPE-V2:END -->

## Public-repository admission act — consent-observation — redis-observation — performed 2026-10-07

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
CONSENT TO PUBLIC OBSERVATION OF REDIS-REDIS: a733220dcbc4276d396e32f51c39dcc4665e07579ecca3f0074e7e6e5a1916a4
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `consent-observation` / `.syzygy/governance/contracts/candidates/public-repo-admission/instances/redis/OBSERVATION-CONSENT.md` |
| Argument | SHA-256 of the artifact itself: its row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `7704b4a575acf29de93e3872ff549a856e6395ec` |
| Manifest | `.syzygy/governance/contracts/candidates/public-repo-admission/PUBLIC-REPO-ADMISSION-MANIFEST.txt`, SHA-256 `51f70c07ed1bb5ea081c08fc2c06dd61b865f0c6888ae3f0faf17e8bf50bc649` |
| Review outcome | `.syzygy/governance/contracts/candidates/public-repo-admission/reviews/R-PUBLIC-ADMISSION-7-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:50:25Z` |
| Recording | `.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`; annotated tag `public-admission-redis-observation-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. The package's
other records remain separate acts.

<!-- versioned-signoff:public-git-source-acquisition-local-agent:v1.0 -->
## Versioned sign-off — public-git-source-acquisition-local-agent — v1.0 — recorded 2026-10-07

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | registry entry |
| Review outcome | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/ROUND-3-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`; annotated tag `public-git-source-acquisition-local-agent-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off approves the registry entry its dedicated record names, at the
SHA-256 recorded there, under the Scope A extension the owner's selection
names. That is one of the separate acts a read needs. It gives no observation
consent, widens no write, egress or execution, authorizes no implementation,
and a later version of the package is signed separately.
<!-- /versioned-signoff:public-git-source-acquisition-local-agent:v1.0 -->

## Dossier local-agent act — consent-agent-provider — redis-agent-anthropic — performed 2026-10-07

Act instant: 2026-10-07T17:52:25Z

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS: fbbcd3c0e3d49aab3384a4ab18bf35816dbd8fb952e658d1edbac3d1c50e48a7
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `consent-agent-provider` / `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md` |
| Scope | operator-agent runs over this one repository with this one tool and provider |
| Argument | SHA-256 of the artifact itself: its row of the sitting manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `d19ec98bb3bfb9c83f48919715cb5b8c7710ede8` |
| Manifest | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt`, SHA-256 `ecf916c4f67c2ba8c8a33739653eef75a36874b925bd28e08852219243f1fb56` |
| Review outcome | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:52:25Z` |
| Recording | `.syzygy/governance/decisions/DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md`; annotated tag `dossier-local-agent-redis-agent-anthropic-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. The sitting's
other acts remain separate.

## Dossier local-agent act — bind-exact-bytes — d9-in-force — performed 2026-10-07

Act instant: 2026-10-07T17:53:25Z

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS: 41fdfaea8cbde4cd8220910113fb5b376c7834a470d8c2d9badd9ab0fec9ac66
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `bind-exact-bytes` / `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/in-force/D9-IN-FORCE-RECORD.md` |
| Scope | REQ-polaris-generation-033's execution rule only |
| Argument | SHA-256 of the artifact itself: its row of the sitting manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `d19ec98bb3bfb9c83f48919715cb5b8c7710ede8` |
| Manifest | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt`, SHA-256 `ecf916c4f67c2ba8c8a33739653eef75a36874b925bd28e08852219243f1fb56` |
| Review outcome | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:53:25Z` |
| Recording | `.syzygy/governance/decisions/DOSSIER-LOCAL-AGENT-D9-IN-FORCE-ACT.md`; annotated tag `dossier-local-agent-d9-in-force-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. The sitting's
other acts remain separate.

## Dossier local-agent act — bind-exact-bytes — rfc7-20-reading-in-force — performed 2026-10-07

Act instant: 2026-10-07T17:54:25Z

**Phrase the act takes (given 2026-10-07 by option selection, not typed; see the
dedicated record):**

```text
BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS: f0725a204b6e6ccbccb211441e26e139502ef42a6447d0f4a40df2d09062f3d9
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `bind-exact-bytes` / `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/instances/in-force/RFC7-20-READING-IN-FORCE-RECORD.md` |
| Scope | item 1 of the direction, for REQ-polaris-generation-033's draft-layer rule only |
| Argument | SHA-256 of the artifact itself: its row of the sitting manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `d19ec98bb3bfb9c83f48919715cb5b8c7710ede8` |
| Manifest | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt`, SHA-256 `ecf916c4f67c2ba8c8a33739653eef75a36874b925bd28e08852219243f1fb56` |
| Review outcome | `.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-07T17:54:25Z` |
| Recording | `.syzygy/governance/decisions/DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md`; annotated tag `dossier-local-agent-rfc7-20-reading-in-force-signed-2026-10-07` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. The sitting's
other acts remain separate.

<!-- PWB-POLICY-SCOPE-V3:BEGIN -->
## Public-source screening scope version 3 act — approve-policy — performed 2026-10-08

**Phrase the act takes (given 2026-10-08 by option selection, not typed; see the
dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: c13bd56c70698ccdf55fa2b0a81ed51f4b3f385848d5eccd97b8be3cfad48fce
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the chosen row (variant `all`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `5db1dd720338edd7963653f7e19ff727e1e99f32` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v3/PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt`, SHA-256 `e5328701c62fa567d9f8dcc4d11c80266638b28bc368212b264514052bcec9e3` |
| Review outcome | `docs/reviews/R-PUBLIC-SOURCE-SCREENING-SCOPE-V3-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-08T16:24:27Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-v3-signed-2026-10-08` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gates are re-pointed by a separate change.
<!-- PWB-POLICY-SCOPE-V3:END -->

<!-- DOSSIER-AGENT-PROVIDER-V2:BEGIN -->
## Agent-provider statement version 2 act — consent-agent-provider — redis-agent-anthropic-v2 — performed 2026-10-08

Act instant: 2026-10-08T16:24:27Z

**Phrase the act takes (given 2026-10-08 by option selection, not typed; see the
dedicated record):**

```text
CONSENT TO ANTHROPIC AGENT PROVIDER VERSION 2 FOR REDIS: b7a8d099ce108bfd70133b729327534f29806cb0118ee0b3e0f9ca077a946df3
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `consent-agent-provider` / `.syzygy/governance/contracts/candidates/dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md` |
| Scope | operator-agent runs over this one repository with this one tool and provider |
| Argument | SHA-256 of the artifact itself: the one row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `5db1dd720338edd7963653f7e19ff727e1e99f32` |
| Manifest | `.syzygy/governance/contracts/candidates/dossier-agent-provider-v2/DOSSIER-AGENT-PROVIDER-V2-MANIFEST.txt`, SHA-256 `62cd699a6fbc4ad07777509e17530948f68efc7978800f6c0e4db358c7d06af7` |
| Review outcome | `docs/reviews/R-DOSSIER-AGENT-PROVIDER-V2-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-08T16:24:27Z` |
| Recording | `.syzygy/governance/decisions/DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md`; annotated tag `dossier-agent-provider-v2-redis-anthropic-signed-2026-10-08` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It supersedes
the version-1 statement act prospectively; that act's record is unchanged.
<!-- DOSSIER-AGENT-PROVIDER-V2:END -->

<!-- versioned-signoff:polaris-dossier-local-agent-mode:v1.2 -->
## Versioned sign-off — polaris-dossier-local-agent-mode — v1.2 — recorded 2026-10-14

The owner signed off version 1.2 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification delta |
| Review outcome | `docs/reviews/R-PR408-WAITING-SESSIONS-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `docs/reviews/R-PR408-WAITING-SESSIONS-4-NOTES.md` |
| Recording | `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`; annotated tag `polaris-dossier-local-agent-mode-v1.2` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:polaris-dossier-local-agent-mode:v1.2 -->

<!-- versioned-signoff:pwb-anchor-resolution-amendment:v1.0 -->
## Versioned sign-off — pwb-anchor-resolution-amendment — v1.0 — recorded 2026-10-14

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-N9-MACHINE-CHANNEL-AMENDMENTS-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-anchor-resolution-amendment/ROUND-2-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-anchor-resolution-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-anchor-resolution-amendment:v1.0 -->

<!-- versioned-signoff:three-surface-poc-block-provenance-amendment:v1.0 -->
## Versioned sign-off — three-surface-poc-block-provenance-amendment — v1.0 — recorded 2026-10-14

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification amendment |
| Review outcome | `docs/reviews/R-N9-MACHINE-CHANNEL-AMENDMENTS-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-anchor-resolution-amendment/ROUND-2-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `three-surface-poc-block-provenance-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:three-surface-poc-block-provenance-amendment:v1.0 -->

<!-- versioned-signoff:pwb-class-granular-extraction-amendment:v1.0 -->
## Versioned sign-off — pwb-class-granular-extraction-amendment — v1.0 — recorded 2026-10-14

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-class-granular-extraction-amendment/ROUND-4-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-class-granular-extraction-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-class-granular-extraction-amendment:v1.0 -->

<!-- versioned-signoff:three-surface-poc-governing-intent-amendment:v1.0 -->
## Versioned sign-off — three-surface-poc-governing-intent-amendment — v1.0 — recorded 2026-10-14

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification amendment |
| Review outcome | `docs/reviews/R-N10-POC-GOVERNING-INTENT-3-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/three-surface-poc-governing-intent-amendment/ROUND-3-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `three-surface-poc-governing-intent-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:three-surface-poc-governing-intent-amendment:v1.0 -->

<!-- versioned-signoff:pwb-accessible-name-amendment:v1.0 -->
## Versioned sign-off — pwb-accessible-name-amendment — v1.0 — recorded 2026-10-15

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-ACCESSIBLE-NAME-AMENDMENT-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-accessible-name-amendment/ROUND-4-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-accessible-name-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-accessible-name-amendment:v1.0 -->

<!-- versioned-signoff:pwb-opening-index-amendment:v1.0 -->
## Versioned sign-off — pwb-opening-index-amendment — v1.0 — recorded 2026-10-15

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | behavior amendment |
| Review outcome | `docs/reviews/R-PWB-OPENING-INDEX-AMENDMENT-5-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/pwb-opening-index-amendment/ROUND-5-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `pwb-opening-index-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:pwb-opening-index-amendment:v1.0 -->

<!-- versioned-signoff:three-surface-poc-vocabulary-epistemic-amendment:v1.0 -->
## Versioned sign-off — three-surface-poc-vocabulary-epistemic-amendment — v1.0 — recorded 2026-10-15

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification amendment |
| Review outcome | `docs/reviews/R-M9-POC-VOCABULARY-EPISTEMIC-AMENDMENT-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/three-surface-poc-vocabulary-epistemic-amendment/ROUND-2-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `three-surface-poc-vocabulary-epistemic-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:three-surface-poc-vocabulary-epistemic-amendment:v1.0 -->

<!-- versioned-signoff:cap1-trusted-bootstrap-consent:v1.0 -->
## Versioned sign-off — cap1-trusted-bootstrap-consent — v1.0 — recorded 2026-10-15

The owner signed off version 1.0 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification adoption |
| Review outcome | `docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-DISPOSITION.md` |
| Recording | `.syzygy/governance/decisions/CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md`; annotated tag `cap1-trusted-bootstrap-consent-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:cap1-trusted-bootstrap-consent:v1.0 -->

<!-- PWB-POLICY-SCOPE-V4:BEGIN -->
## Public-source screening scope version 4 act — approve-policy — performed 2026-10-20

**Phrase the act takes (given 2026-10-20 by the owner's words, not typed as a
phrase; see the dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the chosen row (variant `span`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `65edb1cbbec97384afd7b71e9c069736c89d767c` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v4/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt`, SHA-256 `0621d646f91ef3b5572d882f4bb17f5bd0785d316b30516693e48884365157ec` |
| Review outcome | `docs/reviews/R-OLMR-SCREENING-SCOPE-V4-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Recorded at (UTC) | `2026-10-20T14:48:37Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-v4-signed-2026-10-20` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gates are re-pointed by a separate change.
<!-- PWB-POLICY-SCOPE-V4:END -->

## PWB registry machine-ceiling amendment — performed 2026-10-20

The owner selected `pwb-registry-machine-ceiling-amendment-v1.0` and its exact paired Ask 2 items 1–5
on 2026-10-20, replying `yes, approve both` in the attended Codex conversation
recorded at `.syzygy/governance/decisions/OWNER-DIRECTION-MACHINE-CEILING-INSTALL-2026-10-20.md`. The owner did not type this derived
phrase; its argument is the package manifest's single registry row:

```text
ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY: f2b3573cfe35169f449a9eed36b4c3330ef037d6668bab0548dd5d5939293556
```

| Field | Record |
|---|---|
| Subject | `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json` |
| Dedicated record | `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md` |
| Version tag | `pwb-registry-machine-ceiling-amendment-v1.0` on the main commit carrying the record |
| Review | `docs/reviews/R-PWB-REGISTRY-MACHINE-CEILING-AMENDMENT-2-RAW.md` — `CONFIRM WITH EXCEPTIONS`, notes 1–3 retained separately |
| Provenance | owner-adopted (bootstrap, uncorrelated), state (1); A1 explicitly absent; never independently verified |
| Supersession | registry role only, predecessor `.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md` unchanged |
| Recorded at (UTC) | 2026-10-20T17:57:09Z |

[Observed] The bounded owner selection is recorded. Implementation, gate
admission and private response measurement require their separate evidence.

<!-- versioned-signoff:three-surface-poc-governedby-reference-amendment:v1.0 -->
## Versioned sign-off — three-surface-poc-governedby-reference-amendment — v1.0 — recorded 2026-10-27

The owner signed off version 1.0 by selecting an option in a structured
question naming this package and version (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification amendment |
| Review outcome | `docs/reviews/R-P115-GOVERNEDBY-REFERENCE-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/ROUND-4-DISPOSITIONS.md` |
| Recording | `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `three-surface-poc-governedby-reference-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:three-surface-poc-governedby-reference-amendment:v1.0 -->

<!-- PWB-POLICY-SCOPE-V5:BEGIN -->
## Public-source screening scope version 5 act — approve-policy — performed 2026-11-03

**Phrase the act takes (given 2026-11-03 by the owner's words, not typed as a
phrase; see the dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the chosen row (variant `bcd`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `9daf9e0480b96d3cf09efebc7a357f6e21acda45` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt`, SHA-256 `b9fdbc164952af642bb50aa2b82a21481a0322cccbb65fd0b4be35b73190a80f` |
| Review outcome | `docs/reviews/R-HA5B-SCREENING-SCOPE-V5-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Owner's words given (UTC) | `2026-11-03T06:17:55Z` |
| Recorded at (UTC) | `2026-11-03T06:58:26Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-v5-signed-2026-11-03` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gates are re-pointed by a separate change.
<!-- PWB-POLICY-SCOPE-V5:END -->

<!-- versioned-signoff:polaris-dossier-local-agent-mode:v1.3 -->
## Versioned sign-off — polaris-dossier-local-agent-mode — v1.3 — recorded 2026-11-04

The owner signed off version 1.3 by selecting an option in the
Claude Code CLI (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification delta |
| Review outcome | `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md`: `CONFIRM WITH EXCEPTIONS`; disposition: `.syzygy/governance/contracts/candidates/POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-3-REVIEW-NOTES.md` |
| Recording | `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`; annotated tag `polaris-dossier-local-agent-mode-v1.3` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:polaris-dossier-local-agent-mode:v1.3 -->

<!-- PWB-POLICY-SCOPE-V6:BEGIN -->
## Public-source screening scope version 6 act — approve-policy — performed 2026-11-05

**Phrase the act takes (given 2026-11-05 by the owner's words, not typed as a
phrase; see the dedicated record):**

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: c44058c02c244e8460c1e33ab01f0343ed0612043d7bf53e0d36410c9f9ebfa2
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `approve-policy` / `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` |
| Argument | SHA-256 of the artifact itself: the one row (variant `p`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `b64c6769fd2fa928ae946dc27cdb729267f153fb` |
| Manifest | `.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/PUBLIC-SOURCE-SCREENING-SCOPE-V6-MANIFEST.txt`, SHA-256 `76b2b6b0ac9eb185d8816e6014f86bc8a66c13501a8727a83fa6f8b8c1a18986` |
| Review outcome | `docs/reviews/R-SCREENING-SCOPE-V6-b64c-4-RAW.md`: `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file |
| Owner's words given (UTC) | `2026-11-05T09:43:08Z` |
| Recorded at (UTC) | `2026-11-05T09:43:08Z` |
| Recording | `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md`; annotated tag `pwb-approve-policy-public-source-scope-v6-signed-2026-11-05` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress, and the read gates are re-pointed by a separate change.
<!-- PWB-POLICY-SCOPE-V6:END -->
