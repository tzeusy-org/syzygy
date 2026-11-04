# `openspec/` — where this project's specifications live

> **Navigation only. Never authority, and nothing here binds.** This page
> says which change is in force and under which owner act; it restates no
> requirement, no digest and no verdict. Where it and the act record
> disagree, the act record wins. Current state is
> [`PROJECT-STATUS.md`](../PROJECT-STATUS.md); the acts themselves are in
> [`.syzygy/governance/decisions/`](../.syzygy/governance/decisions/).
>
> Written 2026-09-07 on the owner's P-57 ruling, arm (a), which authorized
> an agent to add a navigation page here and reserved the owner's review of
> its text — see
> [`DOCUMENTATION-ESTATE-OWNER-RULINGS-DECISION.md`](../.syzygy/governance/decisions/DOCUMENTATION-ESTATE-OWNER-RULINGS-DECISION.md).
> It is the governed plane's only agent-authored page and it holds no
> obligations, by design. **The owner approved this text 2026-09-08**; the
> reservation is discharged and this banner is not edited further to say so
> again.

## The five changes, and what state each is in

Five changes are in force by act; a Polaris addition bound later by a
sign-off or an owner direction is in force beside them and is not one of
the five. Each row names the act or record that adopted it and the
latest act or sign-off that binds its current bytes. Every change lives
under `changes/`, and none of the directory names says which is which, so
this table does — one row per directory, each act named, never quoted.
The dossier local-agent and narrative-profile rows below are additions to
the Polaris generator composition, bound by a version-tagged sign-off and
an owner direction respectively rather than by an act; the effective
composition is the base read with the understanding amendment and each
addition. Neither is one of the five.

| Directory | What it specifies | State | First act · latest binding outcome |
|---|---|---|---|
| [`project-registration-and-honest-shape-visibility`](changes/project-registration-and-honest-shape-visibility) | Capability 1 — project registration and honest shape visibility | **Adopted 2026-08-20, and implemented.** Amend only through CC-REV-2. *(Marked 2026-10-15: CAP1-REQ-011 and CAP1-REQ-046 are fully replaced by the adopted overlay `cap1-trusted-bootstrap-consent` v1.0, row below; their amended text is not yet implemented.)* | [`CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md`](../.syzygy/governance/decisions/CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md) · [`CAPABILITY-1-READABILITY-SUCCESSOR-ACT.md`](../.syzygy/governance/decisions/CAPABILITY-1-READABILITY-SUCCESSOR-ACT.md) (2026-09-29) |
| [`three-surface-poc-experience`](changes/three-surface-poc-experience) | The bounded, non-release Three-Surface POC (Polaris, Trajectory, Orrery) | **Signed off 2026-08-30.** A bounded experiment, never a release | [`THREE-SURFACE-POC-SPEC-SIGNOFF-ACT.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-SPEC-SIGNOFF-ACT.md) · [`THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md) (2026-09-29) · [`THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-14) · [`THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-14) · [`THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-15) · [`THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-27) |
| [`polaris-project-wide-butlers-model`](changes/polaris-project-wide-butlers-model) | The project-wide Butlers slice of Polaris — one consented content class, behind the authority gate | **Signed off 2026-08-31, amended since by a chain of acts and version-tagged sign-offs.** Every byte is bound at an exact digest | [`POLARIS-PROJECT-WIDE-SPEC-SIGNOFF-ACT.md`](../.syzygy/governance/decisions/POLARIS-PROJECT-WIDE-SPEC-SIGNOFF-ACT.md) · [`PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md) (2026-10-02) · [`PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-03) · [`PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-14) · [`PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-14) · [`PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-15) · [`PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md) (2026-10-15) |
| [`polaris-manifesto-generation`](changes/polaris-manifesto-generation) | The generalized Polaris manifesto generator (base requirements) | **Adopted 2026-09-12.** Read only together with the understanding amendment below | [`POLARIS-GENERATOR-SPECIFICATION-ADOPTION-ACT.md`](../.syzygy/governance/decisions/POLARIS-GENERATOR-SPECIFICATION-ADOPTION-ACT.md) · [`POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR-ACT.md`](../.syzygy/governance/decisions/POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR-ACT.md) (2026-09-29) |
| [`polaris-manifesto-understanding-amendment`](changes/polaris-manifesto-understanding-amendment) | The overlay that modifies seven generator requirements and adds two | **Adopted 2026-09-13; requirement 004 replaced 2026-09-28** by the tree-form amendment ([`POLARIS-TREE-FORM-AMENDMENT-ADOPTION.md`](../.syzygy/governance/decisions/POLARIS-TREE-FORM-AMENDMENT-ADOPTION.md)) | [`POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md`](../.syzygy/governance/decisions/POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md) · [`POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-ACT.md`](../.syzygy/governance/decisions/POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-ACT.md) (2026-09-29) · [`POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-ACT.md`](../.syzygy/governance/decisions/POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-ACT.md) (2026-10-02, `GOVERNING-DEPENDENCIES.md` only) |
| [`polaris-non-governed-narrative-profile`](changes/polaris-non-governed-narrative-profile) | A Polaris generator requirement for narrating an observed repository that has no Syzygy declarations | **Adopted 2026-10-07 by owner direction** (requirement 032). An addition to the generator composition; amend only through CC-REV-2 | [`POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md`](../.syzygy/governance/decisions/POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md) (2026-10-07) |
| [`polaris-dossier-local-agent-mode`](changes/polaris-dossier-local-agent-mode) | The operator-agent authoring mode for the Polaris generator: the operator's own coding-agent session writes a dossier, Syzygy pins, checks and renders it | **Signed off v1.3 2026-11-04, version-tagged** (`polaris-dossier-local-agent-mode-v1.3`: presentation elements), amending v1.2 of 2026-10-14 (`polaris-dossier-local-agent-mode-v1.2`: pre-started waiting sessions), v1.1 of 2026-10-07 (`polaris-dossier-local-agent-mode-v1.1`) and v1.0 of 2026-10-06 (`polaris-dossier-local-agent-mode-v1.0`). Four requirements added to the generator composition; amend only through CC-REV-2 | [`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`](../.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md) (2026-11-04); v1.2: [`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`](../.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md) (2026-10-14); v1.1: [`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`](../.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md) (2026-10-07); v1.0: [`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md) (2026-10-06) |
| [`polaris-dossier-arbitrary-public-repo`](changes/polaris-dossier-arbitrary-public-repo) | A standing admission for any public repository in the operator-agent mode, a tree-based governed rule, and reconstructed motivations (candidate requirements 037 to 039, held in `proposed/`) | **Candidate, drafted 2026-10-08; no act binds it.** Not part of the generator composition in force | None |
| [`cap1-trusted-bootstrap-consent`](changes/cap1-trusted-bootstrap-consent) | A Capability 1 amendment that fully replaces CAP1-REQ-011 and CAP1-REQ-046. An explicit owner state-(1) act may admit repository-observation consent without an audit service, every invalid act state fails closed, and both channels disclose the provenance (register row P-109) | **Adopted v1.0 2026-10-15** by version tag (`cap1-trusted-bootstrap-consent-v1.0`), as an overlay: the bound Capability 1 bytes are unedited and its `ADOPTION.md` states the effective composition and the superseded coverage surfaces. Bounded implementation authorized the same day | [`CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md`](../.syzygy/governance/decisions/CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md) (2026-10-15) · [`OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md`](../.syzygy/governance/decisions/OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md) |
| [`polaris-dossier-one-command-run`](changes/polaris-dossier-one-command-run) | One command for a whole operator-agent run: Syzygy launches and isolates the authoring, inventory and review sessions in one attended view (candidate requirements 040 to 044, held in `proposed/`) | **Candidate, drafted 2026-10-14; no act binds it.** Not part of the generator composition in force | None |

The PWB chain between its first and latest outcome, and every other bound
digest, is listed in
[`ACCEPTANCE-ACT-RECORD.md`](../.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md).
The 2026-10-02 reconciliation of all five is
[`docs/evidence/spec-readability-reconciliation-2026-10-02/`](../docs/evidence/spec-readability-reconciliation-2026-10-02/README.md),
and `scripts/check_spec_reconciliation.py --check` re-derives it.

**Read the act column, never a file's head.** Since the readability
successors no proposal carries a pre-adoption candidate banner (the POC's
carries no status line at all), but three `spec.md` files still open with
the candidate banner they were signed with: the POC's, the generator base's
and the understanding amendment's. The banner is not a
mistake anyone may repair in place, because the act bound the bytes that
carry it; only a signed successor can replace it.

## The two empty directories

`specs/` and `changes/archive/` are the OpenSpec convention's homes for
settled material. This project does not use either step, on the owner's
P-55 ruling of 2026-09-07, arm (b): a change stays where it was authored,
and "what is specified today" is answered by
[`PROJECT-STATUS.md`](../PROJECT-STATUS.md) and the governed plane. Each
directory carries a one-line README saying so, so its emptiness stops
reading as an omission. Archiving an adopted change would relocate bytes
bound by digest, which is an act — not a tidying step.

## Adding a change

The bar and the ceremony are elsewhere, and this page does not summarize
them: see
[`HOW-TO-AUTHOR-A-SYZYGY-SPEC.md`](../.syzygy/governance/contracts/candidates/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md).
One coherent category per change, overlapping no other change. Only the
owner's sign-off binds it (VIS-4); until then it binds nothing, whatever
its head says.

`config.yaml` holds one live setting, `schema: spec-driven`. Its `context:`
block is deliberately absent — an authoring agent's standing instruction
lives in [`AGENTS.md`](../AGENTS.md), not in tool config (owner's P-54
ruling, 2026-09-07, arm (b)).
