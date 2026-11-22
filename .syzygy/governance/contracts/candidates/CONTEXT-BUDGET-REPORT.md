# Context budget report — generated, non-authoritative

> **Generated file. Do not edit by hand, and do not copy a figure out
> of it.** Regenerate with the command in §5. Every number here is a
> measurement of the repository *as it currently stands*; it is stale
> the moment any measured file changes, which is why it is the only
> place a measurement lives. Prose that needs a figure links here.
>
> This report accepts nothing, waives nothing, and grants nothing. The
> threshold every disposition below is measured against — the
> 20,000-token decomposition trigger proposed as `CC-BUDGET-1` — is
> **installed nowhere**: it lives in a candidate policy with no owner
> act, and no `CC-BUDGET-*` identifier resolves to a governed artifact
> today. A waiver against a rule that does not bind is a different
> object from a waiver against one that does (review RC-12 §5), and
> every row below says `candidate budget exception`, never `waiver`.

**No as-of line.** The report names no commit and no working-tree
state: those described the machine that generated it, not the bytes it
measures, and `--check` could not verify them (review RD-6 B3). The
report is current exactly when `build_budget_report.py --check` passes
over the tree it sits in.

This file is regenerated in the *same change* that moves any measured
file. Two independent currency tests exist:
`build_budget_report.py --check` recomputes the fixture anchors and
this report byte for byte, and `check_governance.py` CG-18 recomputes
the anchors again from separate code.

## 1. Context fixtures — hand-authored selections, mechanically measured

Every selection below was **chosen by a human**. There is no context
compiler in this repository. `scripts/context_load.py` resolves a path
list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, or a dependency edge. What is mechanical here is
the *measurement*, never the *selection*.

| Fixture | Files | Words | Est. tokens (×1.35) | Disposition vs the proposed trigger | Packet digest |
|---|---:|---:|---:|---|---|
| `context-selection-1-polaris-narrative.md` | 5 | 16,585 | 22,390 | **above the proposed trigger** by 11.9% | `592e3064733290e3…` |
| `context-selection-10-trajectory-lifecycle.md` | 12 | 43,645 | 58,921 | **above the proposed trigger** by 194.6% | `f117cd851f00de86…` |
| `context-selection-2-trajectory-adapter.md` | 8 | 23,496 | 31,720 | **above the proposed trigger** by 58.6% | `56971c0f767fba23…` |
| `context-selection-3-orrery-lens.md` | 5 | 17,024 | 22,982 | **above the proposed trigger** by 14.9% | `962f42f56516c492…` |
| `context-selection-4-execution-profile.md` | 6 | 15,145 | 20,446 | **above the proposed trigger** by 2.2% | `2994e9e995c88c9e…` |
| `context-selection-5-cross-project-mission.md` | 11 | 26,320 | 35,532 | **above the proposed trigger** by 77.7% | `06b28623848bf613…` |
| `context-selection-6-doctrine-amendment.md` | 6 | 15,239 | 20,573 | **above the proposed trigger** by 2.9% | `733fd2dde0a619a9…` |
| `context-selection-7-kernel-identity.md` | 5 | 18,867 | 25,470 | **above the proposed trigger** by 27.4% | `b2b03d02242465b2…` |
| `context-selection-8-openspec-authoring.md` | 6 | 27,275 | 36,821 | **above the proposed trigger** by 84.1% | `cec797f611026625…` |
| `context-selection-9-evidence-adapter.md` | 12 | 30,654 | 41,383 | **above the proposed trigger** by 106.9% | `ff1b175a2944a54d…` |

**10 of 10 fixtures are above the proposed 20,000-token trigger.**

## 2. Candidate budget exceptions — one row per breaching fixture

Fields are read out of each fixture's own declaration. A missing field
renders `[Unknown]`, never blank and never `none`: an unrecorded
reviewer is not the same fact as no reviewer being required.

**How dense the redactions are is itself the finding.** Review RD-5
(2026-08-08) found that most measurement-shaped figures inside these
fields were transcriptions checked by nothing, and that several
contradicted their own fixture's headline. A disposition argued
against an unchecked number is a disposition argued against nothing.
Reading the 10 fixture(s) measured above with the
figures removed shows how much of each argument was resting on one.

**Measurement figures inside these transcribed fields are redacted and
routed to §3**, which measures the files rather than quoting a
fixture. An earlier revision transcribed them, and two fixtures'
*"RFC-0001 is indivisible"* parenthetical disagreed with this file's
own computed table thirty lines below — a stale figure reaching the
generated report through the one door left open (review RD-5). The
current measurement of that module is the §3 row for it, and this
sentence deliberately does not repeat it. The count of redactions is
printed at the foot of §5.

### `context-selection-1-polaris-narrative.md`

- **Measured:** 16,585 words ≈ 22,390 estimated tokens — 11.9% above the proposed trigger.
- **Reason:** [Unknown] — not declared in the fixture
- **Scope:** [Unknown] — not declared in the fixture
- **Reviewer:** [Unknown] — not declared in the fixture
- **Expiry / revisit trigger:** [Unknown] — not declared in the fixture
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-10-trajectory-lifecycle.md`

- **Measured:** 43,645 words ≈ 58,921 estimated tokens — 194.6% above the proposed trigger.
- **Reason:** The undivided lifecycle warrant spans kernel work identity (RFC-0001, indivisible), all three planes of the work surface (RFC-0008 in full), the mission-side reservation/release seam (RFC-0010 module 3), the state vocabularies and record envelope the chain joins on, and the surface-selection contract every rendering obeys. Every file answers a clause the warrant's own text names. The size is a property of the warrant's breadth, not of padding
- **Scope:** Amendments spanning the **whole** work-item lifecycle seam — identity + dispatch + materialization + accounting + release together, for mission-spawned work. A warrant touching only one segment takes the matching shard below instead
- **Reviewer:** **Unassigned.** This fixture is new at round-2026-08d; independent review is owed at the round's review pass, and this row says so rather than borrowing a signature from a review that never saw it
- **Expiry / revisit trigger:** The **earlier** of (a) the first real lifecycle-seam work item, or (b) the first owner acceptance act that binds the digest of any RFC module in this set
- **Decomposition reviewed:** The class shards along its own seam (each shard re-measurable from the load command; per-module words: `CONTEXT-BUDGET-REPORT.md` §3). **Shard A — accounting and release**: `state-vocabulary-and-cost` + `accounting-reconciliation-and-release` + RFC-0008 README + RFC-0010 README + `budget-reservation` + `rendering-vocabularies` + RFC-0002 README + `execution-record` + `vision.md` — drops the kernel and the surface-selection contract, lawful when work identity and materialization semantics are untouched. **Shard B — identity and materialization**: RFC-0001 + `identity-authority-materialization` + RFC-0008 README + `vision.md` — the fixture-7 genre, floored by the kernel's indivisibility. Whether the undivided form is ever a lawful single packet is an owner trade under RFC11-11; the sharded pair is this fixture's recommended default

### `context-selection-2-trajectory-adapter.md`

- **Measured:** 23,496 words ≈ 31,720 estimated tokens — 58.6% above the proposed trigger.
- **Reason:** An authorization-bearing derivation-mapping edit cannot shed (i) the act contract that makes the edited artifact honored — RFC3-16(a)/(b)/(c), whose smallest load unit is one module (word cost in `CONTEXT-BUDGET-REPORT.md` §3); (ii) the consuming state vocabulary the mapping projects into (RFC8-12/13, tables read verbatim); (iii) the adapter contract bounding what the adapter may write; or (iv) the SEC-3 premise that makes (i) necessary. The only measured configuration under the trigger is reached by dropping (i), which RFC11-5 forbids and which this fixture's own reasoning refuses
- **Scope:** Work-provider adapter changes that edit an **RFC3-16(a) authorization-bearing** derivation mapping. Does **not** cover: the approval ceremony for such a mapping (a separate, smaller packet); mapping edits that are not authorization-bearing; adapter changes touching execution-record capture or fidelity joins, which is fixture 9's class
- **Reviewer:** **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed
- **Expiry / revisit trigger:** The **earlier** of (a) the first real work-provider adapter mapping change, or (b) the first owner acceptance act that binds the digest of any RFC module in this set. Re-review is mandatory at expiry; this waiver does not auto-renew
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-3-orrery-lens.md`

- **Measured:** 17,024 words ≈ 22,982 estimated tokens — 14.9% above the proposed trigger.
- **Reason:** [Unknown] — not declared in the fixture
- **Scope:** [Unknown] — not declared in the fixture
- **Reviewer:** [Unknown] — not declared in the fixture
- **Expiry / revisit trigger:** [Unknown] — not declared in the fixture
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-4-execution-profile.md`

- **Measured:** 15,145 words ≈ 20,446 estimated tokens — 2.2% above the proposed trigger.
- **Reason:** [Unknown] — not declared in the fixture
- **Scope:** [Unknown] — not declared in the fixture
- **Reviewer:** [Unknown] — not declared in the fixture
- **Expiry / revisit trigger:** [Unknown] — not declared in the fixture
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-5-cross-project-mission.md`

- **Measured:** 26,320 words ≈ 35,532 estimated tokens — 77.7% above the proposed trigger.
- **Reason:** A mission draft must state, in the artifact itself, every dimension the RFC-0010 package defines — identity and pinned inputs (module 1), the envelope and its attention posture (module 2), budget reservation under the six-quantity model (module 3), stop conditions and effect/recovery duties (module 4), and the two-project consent plane (module 5). Dropping a module drops the defining text of a section the drafter must write. The packet-provenance module and the act machinery are what make the draft's obligations and its approval honorable
- **Scope:** Drafting a cross-project mission and its envelope for owner approval. Does **not** cover: the approval ceremony itself; single-project missions (module 5 may then be omitted and the packet re-measured); mission *operation* tasks, which are inadmissible until the D3 precondition clears (RFC10-24)
- **Reviewer:** **Unassigned.** This selection was re-derived 2026-08-08 after the owner-ordered RFC-0010/0011 package split; the RC-12 waiver review covered other fixtures and never this one. Independent review is owed at the round's review pass and this row says so rather than borrowing a signature
- **Expiry / revisit trigger:** The **earlier** of (a) the first real mission-drafting work item, or (b) the first owner acceptance act that binds the digest of any RFC module in this set. Re-review is mandatory at expiry
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-6-doctrine-amendment.md`

- **Measured:** 15,239 words ≈ 20,573 estimated tokens — 2.9% above the proposed trigger.
- **Reason:** [Unknown] — not declared in the fixture
- **Scope:** [Unknown] — not declared in the fixture
- **Reviewer:** [Unknown] — not declared in the fixture
- **Expiry / revisit trigger:** [Unknown] — not declared in the fixture
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-7-kernel-identity.md`

- **Measured:** 18,867 words ≈ 25,470 estimated tokens — 27.4% above the proposed trigger.
- **Reason:** RFC-0001 is indivisible (its justified oversize is recorded in `03-ACTIVE-CONTRACT-COMPACTION-REPORT.md` and in the verifier's justification table, *not* in RFC-0001 itself, which records no waiver), and an identity change genuinely needs the minting/continuity scheme (RFC1-11), the evaluation identity a claim resolves against, the constitutional temporal model, and the floor text it may not weaken
- **Scope:** Kernel identity and continuity changes — minting, successor edges, split/merge, and the continuity links recorded across them — **where CC-BAR-5 floor 7 is the declared classifier**. Does **not** cover: the adoption ceremony for such a change (RFC-0003 stays deferred to that packet, as this fixture already rules); `.syzygy/**` schema migrations that do not alter minting; changes to challenge, reconciliation or rendering semantics, which pull further RFC-0002 modules and must be re-measured (scope tightened by RC-12)
- **Reviewer:** **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed
- **Expiry / revisit trigger:** The **earlier** of (a) the first real kernel identity work item, or (b) **any change that makes RFC-0001 divisible** — a package split, or the focused decomposition review §11.4 already calls for and CG-8 already reports. RC-12 holds (b) to be the operative condition: the kernel file dominates this packet, so if it becomes divisible the justification is void rather than weakened. Mandatory re-review at expiry; this waiver does not auto-renew. Also reversible by one owner ruling — see the alternative below
- **Decomposition reviewed:** Two splits examined, each re-measurable from the load command minus one file (per-module words: `CONTEXT-BUDGET-REPORT.md` §3). (a) Drop `craft:engineering-bar.md` if the owner rules that a floor cited to *classify* a change is not text the implementer must hold — measured under the trigger. (b) Drop `RFC-0002/README.md` (an index) — also measured under the trigger. Neither is proposed as the default — (a) removes the only statement of the obligation the change can violate, and (b) removes the deterministic clause-lookup rule that makes a cited `RFC2-n` resolvable without search

### `context-selection-8-openspec-authoring.md`

- **Measured:** 27,275 words ≈ 36,821 estimated tokens — 84.1% above the proposed trigger.
- **Reason:** RFC-0001 is indivisible (its justified oversize is recorded in `03-ACTIVE-CONTRACT-COMPACTION-REPORT.md`, *not* in RFC-0001 itself, which records no waiver) and requirement authoring genuinely needs the capability/requirement identity model (RFC1-14/RFC1-15), both modules of the surface contract that makes the behaviour observable (RFC-0007 — including the module carrying its phase rule RFC7-38, forced by the on-seam rule, which dictates the clause-to-requirement coverage matrix the author must produce), the adoption gate the delta must pass (VIS-3/VIS-4), and the verification bar the requirement must be testable against
- **Scope:** OpenSpec requirement authoring against an adopted capability **whose surface contract is RFC-0007 (Polaris)**. It does **not** stretch to another surface contract: this fixture names "a capability whose surface contract is smaller" as the narrowing that retires the waiver, so applying it there applies it to the case that voids it. Does not cover review of the authored delta, which pulls `craft:review-and-documentation.md` instead (scope tightened by RC-12)
- **Reviewer:** **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed
- **Expiry / revisit trigger:** The **earlier** of (a) the first real OpenSpec authoring task, or (b) **unconditionally at the creation of `openspec/**`**. RC-12 added (b): this packet renders the absent house conventions as an RFC11-6 Unknown and proceeds, so the moment conventions exist they become mandatory context, the measured floor changes, and the waiver was computed against a corpus that no longer describes the task. If decomposition proves possible at (a) — authoring against a smaller surface contract — the waiver retires instead
- **Decomposition reviewed:** [Unknown] — not declared in the fixture

### `context-selection-9-evidence-adapter.md`

- **Measured:** 30,654 words ≈ 41,383 estimated tokens — 106.9% above the proposed trigger.
- **Reason:** The evidence plane is the corpus's widest authorization surface. RFC-0004 gates six clauses across three of its modules under RFC3-16(a) (see `RFC-0004/README.md`), so an authorization-bearing change here needs the whole four-module package, the tier vocabulary it emits into, the profile contract that defines its one self-sufficient route, and the act machinery that makes any of it honored
- **Scope:** Evidence-adapter changes touching gate provenance (RFC4-13 routes), capture cadence or retention (RFC4-16), or fidelity labels (RFC4-24/25), **where the warrant spans the retention × cause coupling** — i.e. where a `reduced-fidelity` cause depends on a retention-horizon fact. A warrant touching **labels only**, with no RFC4-16 dependency, is **out of scope** and takes the smaller shard instead. Does not cover changes that also touch work-state rendering (fixture 2's class), or that add prose fields to a record, which pulls `RFC-0005/consent-egress-secrets` (scope tightened by RC-12)
- **Reviewer:** **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed
- **Expiry / revisit trigger:** The **earlier** of (a) the first real evidence-adapter work item, or (b) **owner act 2**. RC-12 holds (b) mandatory rather than optional: CC-TEST-2 is in this packet and is act 2's subject, so every conclusion the packet supports from CC-TEST-2 is provisional until the act lands. Also retired by the two-shard split below if the owner accepts it as the default shape
- **Decomposition reviewed:** Five alternatives measured (each re-measurable from the load command with the named files removed or added; per-module words: `CONTEXT-BUDGET-REPORT.md` §3). Shard 1 — fidelity/labeling only (modules 1 + 4, tier registry, trust floor) — **lands inside the proposed default band**: a genuine self-contained task covering declared join bases, the closed cause list, the degradation mapping. Shard 2 — tiering and records (modules 1–3, tier registry, profiles, act machinery, doctrine, craft) — still over; its floor is irreducible without dropping the four-route predicate's inputs. Dropping `RFC-0003/governance-homes-and-owner-acts.md` — still over **and** sheds the contract that makes the edited registry entry honored, the shape fixture 2 refuses for the same reason. Dropping `RFC-0002/README.md` — still over, and removes the lookup rule that makes nine cited `RFC2-n` identities resolvable without search. Adding `RFC-0001` to close its dependency edge at module granularity — far above the trigger, for clause citations whose disposition is recorded below

## 3. Contract modules — the corpus this budget is spent on

**39 modules, 132,306 words.** The ~7,000-word per-module
ceiling and the 35–50k corpus target band are the compaction charter's,
recorded in `03-ACTIVE-CONTRACT-COMPACTION-REPORT.md`; both are
candidate figures under the same non-installed policy as §1's trigger.
The ceiling is approximate in its sources; the column below marks a
module over it when it counts more than 7,000 words.

| Module | Words | Over the ~7,000 ceiling |
|---|---:|---|
| `rfcs/RFC-0001-project-graph-identity-state-planes.md` | 9,826 | **yes** |
| `rfcs/RFC-0002/README.md` | 2,415 | — |
| `rfcs/RFC-0002/challenge-lifecycle.md` | 2,414 | — |
| `rfcs/RFC-0002/reconciliation-chain.md` | 3,098 | — |
| `rfcs/RFC-0002/rendering-vocabularies.md` | 2,913 | — |
| `rfcs/RFC-0002/snapshot-and-evaluation-core.md` | 2,261 | — |
| `rfcs/RFC-0003/README.md` | 1,217 | — |
| `rfcs/RFC-0003/governance-homes-and-owner-acts.md` | 5,957 | — |
| `rfcs/RFC-0003/manifests-and-namespace.md` | 6,072 | — |
| `rfcs/RFC-0004/README.md` | 1,997 | — |
| `rfcs/RFC-0004/execution-record.md` | 1,958 | — |
| `rfcs/RFC-0004/fidelity-joins-and-mappings.md` | 2,291 | — |
| `rfcs/RFC-0004/general-contract.md` | 1,933 | — |
| `rfcs/RFC-0004/named-adapters.md` | 3,930 | — |
| `rfcs/RFC-0005/README.md` | 2,371 | — |
| `rfcs/RFC-0005/admission-and-boundary.md` | 4,483 | — |
| `rfcs/RFC-0005/consent-egress-secrets.md` | 3,191 | — |
| `rfcs/RFC-0005/execution-profiles.md` | 2,506 | — |
| `rfcs/RFC-0006-cross-surface-selection-query-drawer.md` | 5,748 | — |
| `rfcs/RFC-0007/README.md` | 2,669 | — |
| `rfcs/RFC-0007/narrative-contract.md` | 5,574 | — |
| `rfcs/RFC-0007/rendering-and-surface.md` | 4,663 | — |
| `rfcs/RFC-0008/README.md` | 2,310 | — |
| `rfcs/RFC-0008/accounting-reconciliation-and-release.md` | 4,314 | — |
| `rfcs/RFC-0008/identity-authority-materialization.md` | 3,173 | — |
| `rfcs/RFC-0008/state-vocabulary-and-cost.md` | 4,400 | — |
| `rfcs/RFC-0009/README.md` | 2,341 | — |
| `rfcs/RFC-0009/interaction-parity-and-release.md` | 3,795 | — |
| `rfcs/RFC-0009/semantic-geography.md` | 8,362 | **yes** |
| `rfcs/RFC-0009/visual-grammar-and-lenses.md` | 6,471 | — |
| `rfcs/RFC-0010/README.md` | 1,733 | — |
| `rfcs/RFC-0010/budget-reservation.md` | 1,841 | — |
| `rfcs/RFC-0010/effects-recovery-and-stop.md` | 3,291 | — |
| `rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md` | 2,285 | — |
| `rfcs/RFC-0010/portfolio-and-cross-project-consent.md` | 869 | — |
| `rfcs/RFC-0010/prevention-envelope-and-attention.md` | 2,944 | — |
| `rfcs/RFC-0011/README.md` | 1,576 | — |
| `rfcs/RFC-0011/deterministic-selection-and-budget.md` | 1,521 | — |
| `rfcs/RFC-0011/packet-identity-provenance-and-memory.md` | 1,593 | — |

## 4. What this report deliberately does not contain

- **No check counts, fixture counts, or coverage denominators.** Those
  are printed by `check_governance.py` on every run, with each check's
  own denominator. Copying them here would recreate the class this
  report exists to end, one register further out.
- **No act digests.** Those belong to the acceptance record and are
  verified by CG-7a…d against their subject artifacts.
- **No verdict on whether any figure is acceptable.** A budget
  disposition is a measurement against a proposed line. Whether the
  line binds is owner item **P-12**.

## 5. Regeneration

```sh
python3 .syzygy/governance/contracts/candidates/scripts/build_budget_report.py
python3 .syzygy/governance/contracts/candidates/scripts/build_budget_report.py --check
python3 scripts/check_governance.py   # CG-18 verifies the anchors independently
```

**Redacted transcriptions:** 0. Every measurement figure
a fixture stated inside a §2 field was replaced with a pointer to
§3 rather than copied. The redacted strings, verbatim, so the
redaction is auditable rather than a silent deletion:


**Re-parented relative paths:** 4. A fixture lives one
level below this report, so a `../x` correct in a fixture is broken
here. One leading `../` is stripped; anything deeper is left to fail
the link check loudly rather than guessed at. Rewritten, verbatim —
printed without code spans, because an earlier revision printed the
*original* path in a backtick span and the audit trail became the
broken reference it was auditing:

- ../round-2026-08b/reviews/RC-12-budget-waiver-RAW.md → round-2026-08b/reviews/RC-12-budget-waiver-RAW.md

