# Directive register — every governing identifier and where it is defined

> **Generated navigation, never authority.** Written by
> `scripts/build_directive_register.py`; regenerate with it, never hand-edit.
> It answers one question — *where is this identifier defined?* — and refuses
> every other. The title column copies only what the corpus marks up at the
> definition site; it is never a clause body and never a paraphrase, and an
> em dash means the corpus marks no title there. To know what a rule **says**,
> open the file and line named here. Where this page and a clause disagree,
> the clause wins.
>
> Which acts are in force is owned by
> [`ACCEPTANCE-ACT-RECORD.md`](.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md)
> and summarised in [`PROJECT-STATUS.md`](PROJECT-STATUS.md). The status line
> under each heading below is a pointer to those, not a second copy of them.

[`PROCESS-GLOSSARY.md`](PROCESS-GLOSSARY.md) defines the identifier *forms* —
what `P-nn`, `RD-nn`, `CG-nn` and the rest mean. This page lists the
*instances*, which that page deliberately does not. Together they answer
"what kind of thing is this?" and "where does it live?"; neither answers
"what does it say?", because only the clause does.

**814 identifiers, 8 families**, recomputed from the files named
in each section every time the generator runs. A family whose files stop
defining its identifiers renders an empty table rather than a stale one.

## Vision doctrine — `VIS`

**Adopted, in force** since 2026-07-30. 7 identifiers, defined across 1 files.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `VIS-1` | Comprehensible truth first; never comprehensible fiction | `.syzygy/governance/doctrine/vision.md`:118 |
| `VIS-2` | No evidence means Unknown, not success | `.syzygy/governance/doctrine/vision.md`:136 |
| `VIS-3` | Human interpretability is a core tenet | `.syzygy/governance/doctrine/vision.md`:152 |
| `VIS-4` | Humans steer the vision; agents shape within it | `.syzygy/governance/doctrine/vision.md`:170 |
| `VIS-5` | Syzygy never writes code; direct writes are confined to two namespaces | `.syzygy/governance/doctrine/vision.md`:221 |
| `VIS-6` | Syzygy is derived, with two closed exceptions | `.syzygy/governance/doctrine/vision.md`:257 |
| `VIS-7` | The observatory itself must be trustworthy | `.syzygy/governance/doctrine/vision.md`:288 |

## Security doctrine — `SEC`

**Adopted, in force** since 2026-07-30. 5 identifiers, defined across 1 files.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `SEC-1` | Authenticated by default | `.syzygy/governance/doctrine/security.md`:15 |
| `SEC-2` | Portfolio data leaves owner-controlled infrastructure only for a declared provider | `.syzygy/governance/doctrine/security.md`:49 |
| `SEC-3` | Observed code is untrusted, everywhere | `.syzygy/governance/doctrine/security.md`:74 |
| `SEC-4` | Writes are consented, attributed, and revertable | `.syzygy/governance/doctrine/security.md`:124 |
| `SEC-5` | Secrets are never indexed | `.syzygy/governance/doctrine/security.md`:146 |

## Craft-and-care policy — `CC`

Owner-approved craft. 55 identifiers, defined across 8 files.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `CC-BAR-1` | Canonical bar adopted; precedence fixed | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:12 |
| `CC-BAR-2` | Syzygy definition of done | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:45 |
| `CC-BAR-3` | Comprehensible truth is a merge constraint | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:74 |
| `CC-BAR-4` | No green without current evidence is a release constraint | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:97 |
| `CC-BAR-5` | Risk floors no implementing agent may downgrade | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:119 |
| `CC-BAR-6` | Evidence and review scale with declared risk, floors excepted | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:159 |
| `CC-BAR-7` | Changes stay reviewable | `.syzygy/governance/policies/craft-and-care/engineering-bar.md`:182 |
| `CC-DEP-1` | Liberal experimentation, disciplined promotion | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:16 |
| `CC-DEP-2` | Stable identities anchor everything | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:68 |
| `CC-DEP-3` | .syzygy/ is schema-versioned; migrations are identity-preserving | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:91 |
| `CC-DEP-4` | External effects only through typed, explicitly authorized adapters | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:114 |
| `CC-DEP-5` | Public interfaces are contracts with a compatibility story | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:136 |
| `CC-DEP-6` | One kernel; surfaces never fork semantics | `.syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md`:159 |
| `CC-OBS-1` | Observation is deterministic; freshness is identity-bearing | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:17 |
| `CC-OBS-2` | Inference is never rendered as observed fact | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:43 |
| `CC-OBS-3` | Degradation is labelled; fidelity is never invented | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:62 |
| `CC-OBS-4` | Operational failures leave durable, identified traces | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:82 |
| `CC-OBS-5` | Authoritative effects are idempotent | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:99 |
| `CC-OBS-6` | Syzygy's own operations meet the evidence bar it renders | `.syzygy/governance/policies/craft-and-care/observability-and-operations.md`:114 |
| `CC-PERF-1` | The only legal currency for performance is declared scope | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:19 |
| `CC-PERF-2` | Derived conveniences are sacrificial; correctness of caches is not optional | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:36 |
| `CC-PERF-3` | Performance claims carry measurement evidence | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:48 |
| `CC-PROV-1` | Execution records are evidence artifacts | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:24 |
| `CC-PROV-2` | Every run leaves a structured summary; the preserved set is closed | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:45 |
| `CC-PROV-3` | Transcript retention is bounded; provenance retention is not | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:71 |
| `CC-PROV-4` | Report facts are not the facts they report | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:88 |
| `CC-PROV-5` | Missing cost renders Unknown, never zero | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:113 |
| `CC-PROV-6` | Materialization is an immutable one-way mapping | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:128 |
| `CC-PROV-7` | Inherited mutations are accounted in the parent run summary | `.syzygy/governance/policies/craft-and-care/agent-provenance-and-execution-evidence.md`:152 |
| `CC-REV-1` | Mandatory independent review classes | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:16 |
| `CC-REV-2` | The same-logical-change rule | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:71 |
| `CC-REV-3` | No hidden duplicate authority | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:115 |
| `CC-REV-4` | Fresh-reader review for normative artifacts | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:134 |
| `CC-REV-5` | Epistemic labels in documentation | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:155 |
| `CC-REV-6` | Review findings are dispositioned, never dropped | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:171 |
| `CC-REV-7` | Identifiers are stable; retire, never renumber | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:187 |
| `CC-REV-8` | Documents are abstraction trees, with diagrams where structure beats prose | `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:199 |
| `CC-SEC-1` | Default-deny is the born state of every surface | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:28 |
| `CC-SEC-2` | Egress is checked in code, at every path | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:46 |
| `CC-SEC-3` | Observed code runs only in a sandbox, or by the owner's choice | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:69 |
| `CC-SEC-4` | Writes are attributed, atomic, revertable; consented outside the owner's repositories | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:102 |
| `CC-SEC-5` | Secrets fail closed at every boundary | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:123 |
| `CC-SEC-6` | Provenance retains hashes, never secret-bearing bodies | `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`:150 |
| `CC-TEST-1` | Every defect fix ships a reproducing test; exceptions are rare and recorded | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:15 |
| `CC-TEST-2` | Gate claims require retained, resolvable gate artifacts | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:31 |
| `CC-TEST-3` | Determinism is verified, not assumed | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:75 |
| `CC-TEST-4` | Deterministic or quarantined; a flaky gate poisons evidence | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:97 |
| `CC-TEST-5` | Verification scope is declared; tests-as-spec is an explicit designation | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:136 |
| `CC-TEST-6` | Unknown and absence paths are first-class test targets | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:156 |
| `CC-TEST-7` | Re-check record: canonical bars 9 and 10 admitted without conflict | `.syzygy/governance/policies/craft-and-care/testing-and-verification.md`:175 |
| `CC-VIZ-1` | Every encoding declares source, units, legend, Unknown behavior, and freshness | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:69 |
| `CC-VIZ-2` | No decorative element may silently misstate project truth | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:89 |
| `CC-VIZ-3` | Unknowns are visible, aggregated honestly, never disappeared | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:104 |
| `CC-VIZ-4` | Non-3D paths are co-equal and semantically equivalent | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:128 |
| `CC-VIZ-5` | Layout is reproducible; geography is stable; analytical planes are labelled | `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`:143 |

## Specification-acceptance standard — `CC-SPEC`

**In force.** Confirmed by craft act 6 on 2026-08-17 and amended at CC-SPEC-8 on 2026-09-01, whose act superseded the earlier digest. 11 identifiers, defined across 1 files.

**Read this before citing them.** Defined at a path named `policy-candidates/`, in a file named `…-CANDIDATE.md`, under a head banner that still says it binds nothing. All three are wrong and **none may be corrected**: the act bound these exact bytes. Read the act record, never the package banner (`AGENTS.md`, Governance prose and docs).

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `CC-SPEC-1` | Capability and scope are clear | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:80 |
| `CC-SPEC-2` | Every requirement names all its material governing warrants | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:100 |
| `CC-SPEC-3` | Every requirement has a stable identity | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:166 |
| `CC-SPEC-4` | Every requirement is falsifiable in a named form | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:179 |
| `CC-SPEC-5` | Non-goals and Unknowns are explicit | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:246 |
| `CC-SPEC-6` | No unresolved shape decision is silently selected | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:251 |
| `CC-SPEC-7` | Implementation detail appears only when it is required behavior | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:269 |
| `CC-SPEC-8` | Applicable contract clauses are covered or lawfully N/A | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:274 |
| `CC-SPEC-9` | A fresh technical reader can restate it | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:343 |
| `CC-SPEC-10` | Lawful adoption is recorded at the adopting commit | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:355 |
| `CC-SPEC-11` | The requirement set covers the capability, and the coverage is demonstrated | `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md`:380 |

## Shape-to-spec impact rule — `CC-IMPACT`

**In force** by craft act 7, 2026-08-17. 7 identifiers, defined across 1 files.

**Read this before citing them.** Same home and the same three-way mislabelling as `CC-SPEC`. CC-IMPACT-7 additionally names `SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md` by path and digest; fixture 3 was added on 2026-08-30 because fixture 2 left `topology[]` unexercised, and neither the clause nor the fixture may be edited to say so.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `CC-IMPACT-1` | Every accepted specification declares what governs it, and the declaration is generated | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:81 |
| `CC-IMPACT-2` | A shape delta performs a reverse-reference sweep, and the trigger set is the warrant set | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:125 |
| `CC-IMPACT-3` | The sweep records four sets, with its denominator and its method | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:152 |
| `CC-IMPACT-4` | Undecidable impact renders as Unknown or contradiction, never as unaffected | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:188 |
| `CC-IMPACT-5` | Every required amendment names its actor, and the sweep names one too | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:195 |
| `CC-IMPACT-6` | Affected specs move in the same logical change, or the lag is recorded | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:214 |
| `CC-IMPACT-7` | Retired by GOVERNANCE-SIMPLIFICATION-D10 | `.syzygy/governance/contracts/candidates/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`:243 |

## Recorded owner decisions — `SDR`

**Recorded** — binding, not digest-bound. 37 identifiers, defined across 1 files.

**Read this before citing them.** These carry no title. The corpus marks each with the review finding or pending question it answers (`(R-12)`, `(P-40)`), which is what the title column shows. A ⚑ flag on that tag means the owner decided narrower or wider than the review recommended — open the entry to see which way.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `SDR-1` | (R-1 ⚑) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:64 |
| `SDR-2` | (R-12) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:68 |
| `SDR-3` | (R-13) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:71 |
| `SDR-4` | (R-13 declaration site) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:76 |
| `SDR-5` | (R-2) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:82 |
| `SDR-6` | (R-2/R-11 corollary) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:84 |
| `SDR-7` | (R-5, option (a) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:86 |
| `SDR-8` | (R-10 ⚑) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:89 |
| `SDR-9` | (R-11) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:92 |
| `SDR-10` | (R-6) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:96 |
| `SDR-11` | (R-16) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:100 |
| `SDR-12` | (R-15) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:102 |
| `SDR-13` | (R-3 ⚑) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:108 |
| `SDR-14` | (R-3/VIS-3 scope) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:113 |
| `SDR-15` | (R-17) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:115 |
| `SDR-16` | (P-I1 refinement) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:118 |
| `SDR-17` | (R-18) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:120 |
| `SDR-18` | (R-19) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:122 |
| `SDR-19` | (R-7) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:127 |
| `SDR-20` | (R-4) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:129 |
| `SDR-21` | (new) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:132 |
| `SDR-22` | (R-20a ⚑) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:137 |
| `SDR-23` | (R-20b) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:141 |
| `SDR-24` | (R-20c ⚑) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:142 |
| `SDR-25` | (R-20d) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:145 |
| `SDR-26` | (R-20e) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:147 |
| `SDR-27` | (R-20f) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:149 |
| `SDR-28` | (R-9) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:156 |
| `SDR-29` | (R-9 refinement) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:157 |
| `SDR-30` | (R-9/OQ-010) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:161 |
| `SDR-31` | (R-14a) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:167 |
| `SDR-32` | (R-14b) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:169 |
| `SDR-33` | (R-14c) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:171 |
| `SDR-34` | (P-31) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:183 |
| `SDR-35` | (P-36) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:187 |
| `SDR-36` | (P-37) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:189 |
| `SDR-37` | (P-40) | `.syzygy/governance/decisions/SURFACE-DECISION-RECORD.md`:195 |

## Design contract clauses — `RFC-accepted`

**Accepted** — Waves A and B, 2026-08-17. 325 identifiers, defined across 24 files.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `RFC1-1` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:139 |
| `RFC1-2` | Repository | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:170 |
| `RFC1-3` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:179 |
| `RFC1-4` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:189 |
| `RFC1-5` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:196 |
| `RFC1-6` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:228 |
| `RFC1-7` | Extension profiles | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:245 |
| `RFC1-8` | Frozen-noun mapping | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:284 |
| `RFC1-9` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:301 |
| `RFC1-10` | Identifiers are opaque; names are labels | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:332 |
| `RFC1-11` | Split and merge mint successors, never mutations | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:338 |
| `RFC1-12` | Judgments do not silently survive identity change | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:347 |
| `RFC1-13` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:355 |
| `RFC1-14` | Capability | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:362 |
| `RFC1-15` | Requirement and Scenario are references, not owned content | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:371 |
| `RFC1-16` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:379 |
| `RFC1-17` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:393 |
| `RFC1-18` | Claim and Gap identity has two levels | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:400 |
| `RFC1-18(a)` | Declared scope is a typed reference, never a string | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:416 |
| `RFC1-18(b)` | Contradiction identity, two levels | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:435 |
| `RFC1-19` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:456 |
| `RFC1-20` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:462 |
| `RFC1-21` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:472 |
| `RFC1-22` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:484 |
| `RFC1-23` | Act-assignment rule | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:544 |
| `RFC1-24` | All positive status flows through Claims | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:559 |
| `RFC1-25` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:565 |
| `RFC1-25(a)` | Two relations minted by owner decision | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:625 |
| `RFC1-25(b)` | The dependency anti-conflation invariant | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:633 |
| `RFC1-25(c)` | Cardinality of placed_in | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:662 |
| `RFC1-25(d)` | Typed relation identity: the spelling is never the identity | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:686 |
| `RFC1-26` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:738 |
| `RFC1-27` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:748 |
| `RFC1-28` | The approved-but-unmaterialized plan item is a lifecycle state of the Proposal entity | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:765 |
| `RFC1-29` | Materialization is a one-way door | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:774 |
| `RFC1-30` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:838 |
| `RFC1-31` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:846 |
| `RFC1-32` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:885 |
| `RFC1-33` | — | `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`:895 |
| `RFC2-1` | The closed rule, restated as binding | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:72 |
| `RFC2-2` | Uncaptured means uninfluential | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:112 |
| `RFC2-3` | Evaluation identity | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:122 |
| `RFC2-4` | Degradation-only over an unchanged snapshot | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:134 |
| `RFC2-5` | Two-level claim identity (SDR-2) | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:157 |
| `RFC2-6` | Contents and immutability | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:166 |
| `RFC2-7` | The seam | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:182 |
| `RFC2-8` | Authority ceiling | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:192 |
| `RFC2-9` | The declaration mechanism | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:213 |
| `RFC2-10` | Identity-bearing freshness | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:235 |
| `RFC2-11` | Evidence–revision binding | `.syzygy/governance/contracts/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:258 |
| `RFC2-12` | Admissibility (doctrine floor, made operational) | `.syzygy/governance/contracts/rfcs/RFC-0002/challenge-lifecycle.md`:73 |
| `RFC2-13` | States, admission, resolution, expiry | `.syzygy/governance/contracts/rfcs/RFC-0002/challenge-lifecycle.md`:81 |
| `RFC2-14` | Suspension is not erasure | `.syzygy/governance/contracts/rfcs/RFC-0002/challenge-lifecycle.md`:278 |
| `RFC2-15` | Definitions and exits | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:79 |
| `RFC2-16` | As claim predicates | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:108 |
| `RFC2-17` | Reservation of the words | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:123 |
| `RFC2-18` | The chain | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:142 |
| `RFC2-19` | Trigger and staging | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:246 |
| `RFC2-19(a)` | What that Unknown carries, and does not | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:255 |
| `RFC2-20` | The closure fallacy, forbidden | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:290 |
| `RFC2-21` | What "no gap at evaluation E" means | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:301 |
| `RFC2-22` | Fixed point (idempotence) | `.syzygy/governance/contracts/rfcs/RFC-0002/reconciliation-chain.md`:312 |
| `RFC2-23` | Six degradation states, closed, each with its rendering obligation | `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md`:78 |
| `RFC2-24` | Twelve reasons, closed | `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md`:103 |
| `RFC2-25` | Six tiers, closed, each inside exactly one parent label | `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md`:168 |
| `RFC2-26` | — | `.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md`:211 |
| `RFC3-1` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:112 |
| `RFC3-2` | Every manifest field names exactly one write authority | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:127 |
| `RFC3-3` | Direct-write containment | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:214 |
| `RFC3-4` | (location, not any field value, designates the governance root) | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:56 |
| `RFC3-5` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:245 |
| `RFC3-6` | Repository entries | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:268 |
| `RFC3-7` | Consent records | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:278 |
| `RFC3-8` | Revocation and withdrawal | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:303 |
| `RFC3-9` | Drafting and repair | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:324 |
| `RFC3-10` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:338 |
| `RFC3-11` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:347 |
| `RFC3-12` | Never authoritative for project-internal truth (SDR-30) | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:354 |
| `RFC3-13` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:362 |
| `RFC3-14` | Asymmetric relation semantics | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:367 |
| `RFC3-15` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:83 |
| `RFC3-15(a)` | Why records/ exists | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:105 |
| `RFC3-16` | Lifecycle status: a self-declaration inside content, an effective status outside it | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:117 |
| `RFC3-16(a)` | The owner-act provenance predicate | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:189 |
| `RFC3-16(b)` | What an adoption record binds | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:258 |
| `RFC3-16(c)` | Owner-adopted bootstrap act versus Syzygy-verified act | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:315 |
| `RFC3-16(d)` | Bounded mechanically instantiated URL-dossier local machine-credential data | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:390 |
| `RFC3-17` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:406 |
| `RFC3-17(a)` | Where challenges and their admission records live | `.syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:415 |
| `RFC3-18` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:419 |
| `RFC3-19` | .syzygy/work/ | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:426 |
| `RFC3-20` | .syzygy/cache/ is rebuildable projection, nothing else | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:439 |
| `RFC3-21` | .syzygy/local/ is personal presentation state | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:452 |
| `RFC3-22` | Version stamps | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:465 |
| `RFC3-23` | Migrations are identity-preserving | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:472 |
| `RFC3-24` | Migration is an explicit, reviewed, revertable act | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:481 |
| `RFC3-25` | Forward and backward behavior | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:493 |
| `RFC3-26` | openspec/ | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:504 |
| `RFC3-27` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:512 |
| `RFC3-28` | Spec anchors (SDR-32) | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:524 |
| `RFC3-29` | One plane per repository; one root per Project — upheld | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:537 |
| `RFC3-30` | Dual roles are lawful and per-pair | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:542 |
| `RFC3-31` | Nesting is composition by declaration | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:598 |
| `RFC3-32` | What a parent may never do | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:610 |
| `RFC3-33` | — | `.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`:634 |
| `RFC4-1` | Two roles, one discipline | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:69 |
| `RFC4-2` | Mandatory declaration set | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:77 |
| `RFC4-3` | Emission obligations | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:100 |
| `RFC4-4` | Failure is rendered, never invisible | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:113 |
| `RFC4-5` | The two-limb anti-duplication invariant | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:120 |
| `RFC4-6` | Substrate-term translation | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:169 |
| `RFC4-7` | The registry | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:181 |
| `RFC4-8` | Version skew | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:200 |
| `RFC4-9` | Substitution | `.syzygy/governance/contracts/rfcs/RFC-0004/general-contract.md`:231 |
| `RFC4-10` | OpenSpec adapter | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:79 |
| `RFC4-11` | Git/VCS adapter (with hosting sub-adapter) | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:103 |
| `RFC4-12` | Code-structure observer | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:130 |
| `RFC4-13` | Test, CI, and gate observers | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:157 |
| `RFC4-13(a)` | The external-confirmation capture artifact | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:264 |
| `RFC4-13(b)` | The governed checker | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:298 |
| `RFC4-14` | Runtime observer | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:352 |
| `RFC4-15` | Beads adapter: the read contract | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:365 |
| `RFC4-16` | Capture-before-horizon | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:398 |
| `RFC4-17` | The warrant pointer (outward limb applied) | `.syzygy/governance/contracts/rfcs/RFC-0004/named-adapters.md`:442 |
| `RFC4-18` | Classification (SDR-8) | `.syzygy/governance/contracts/rfcs/RFC-0004/execution-record.md`:73 |
| `RFC4-19` | The minimum durable run envelope | `.syzygy/governance/contracts/rfcs/RFC-0004/execution-record.md`:86 |
| `RFC4-20` | Enrichment is explicitly non-required | `.syzygy/governance/contracts/rfcs/RFC-0004/execution-record.md`:117 |
| `RFC4-21` | Model, timing, token, and cost semantics | `.syzygy/governance/contracts/rfcs/RFC-0004/execution-record.md`:158 |
| `RFC4-22` | Declared join bases | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:77 |
| `RFC4-23` | Worker liveness honesty | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:91 |
| `RFC4-24` | The labeling schema (SDR-33; delegated by RFC2) | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:123 |
| `RFC4-25` | Degradation mapping | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:147 |
| `RFC4-26` | Declaration sites (SDR-3/4) | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:154 |
| `RFC4-27` | Executed coverage behind every absence claim | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:193 |
| `RFC4-28` | The invariant | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:210 |
| `RFC4-29` | The enrichment roadmap, named but never required | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:224 |
| `RFC4-30` | — | `.syzygy/governance/contracts/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:250 |
| `RFC5-1` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:93 |
| `RFC5-2` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:114 |
| `RFC5-3` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:126 |
| `RFC5-4` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:161 |
| `RFC5-5` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:200 |
| `RFC5-6` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:228 |
| `RFC5-7` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:253 |
| `RFC5-8` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:269 |
| `RFC5-9` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:285 |
| `RFC5-10` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:293 |
| `RFC5-11` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:300 |
| `RFC5-12` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:97 |
| `RFC5-13` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:119 |
| `RFC5-14` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:141 |
| `RFC5-15` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:205 |
| `RFC5-16` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:244 |
| `RFC5-17` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`:292 |
| `RFC5-18` | The gate | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:91 |
| `RFC5-19` | The trust distinction | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:130 |
| `RFC5-20` | Profile contents | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:165 |
| `RFC5-21` | Isolation mechanism classes | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:192 |
| `RFC5-22` | Destructive-operation gates | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:227 |
| `RFC5-23` | Profile lifecycle | `.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`:242 |
| `RFC5-24` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:355 |
| `RFC5-25` | Every authenticated act is attributable | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:384 |
| `RFC5-26` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:430 |
| `RFC5-27` | — | `.syzygy/governance/contracts/rfcs/RFC-0005/admission-and-boundary.md`:441 |
| `RFC6-1` | One selection identity space | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:108 |
| `RFC6-2` | Everything selectable, one way | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:120 |
| `RFC6-3` | Cross-surface synchronization | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:135 |
| `RFC6-4` | Evaluation defaulting is stamped, never silent | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:142 |
| `RFC6-5` | Total resolution | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:152 |
| `RFC6-6` | Outcomes are not Unknown reasons | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:216 |
| `RFC6-7` | Resolution is deterministic per evaluation | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:223 |
| `RFC6-8` | What a URL pins | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:230 |
| `RFC6-9` | Rename-stability | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:240 |
| `RFC6-10` | Two URL temporalities | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:246 |
| `RFC6-11` | Retired and merged identities | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:254 |
| `RFC6-12` | URLs are surface-independent | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:263 |
| `RFC6-13` | One truth, two consumers | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:271 |
| `RFC6-14` | Label parity | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:279 |
| `RFC6-15` | Every answer is evaluation-stamped | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:312 |
| `RFC6-16` | Filters are declared scope | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:318 |
| `RFC6-17` | Aggregation discloses | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:324 |
| `RFC6-18` | One drawer, one fact set | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:361 |
| `RFC6-19` | Drawer content classes | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:378 |
| `RFC6-20` | Drawer links obey the floor | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:438 |
| `RFC6-21` | Minimal display never subtracts facts | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:447 |
| `RFC6-22` | The equivalence definition | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:455 |
| `RFC6-23` | Finer detail is allowed; contradiction is not | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:469 |
| `RFC6-24` | Scenario context is explicit and singular | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:481 |
| `RFC6-25` | Context travels with the selection | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:527 |
| `RFC6-26` | Unconsented renders as policy, never as error | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:535 |
| `RFC6-27` | Excluded is a rendered state | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:544 |
| `RFC6-28` | This contract schedules nothing | `.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:552 |
| `RFC7-1` | What Polaris is | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:80 |
| `RFC7-2` | Composition, never custody | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:87 |
| `RFC7-3` | Nothing cites the rendering | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:111 |
| `RFC7-4` | Non-authority is total | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:122 |
| `RFC7-5` | Entities | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:128 |
| `RFC7-6` | One primary narrative | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:160 |
| `RFC7-7` | The governed-presentation-artifact class (SDR-13) | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:172 |
| `RFC7-8` | Neither cache nor governance authority | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:181 |
| `RFC7-9` | Granularity, covering, minimality, bounding | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:190 |
| `RFC7-10` | Anchor form | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:217 |
| `RFC7-11` | Broken anchors render Unknown, never silent | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:243 |
| `RFC7-11(a)` | Resolving anchors whose target changed render as drifted, never as current | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:259 |
| `RFC7-12` | Restatement discipline | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:297 |
| `RFC7-13` | Progressive disclosure: the obligation, and a V0 default path | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:306 |
| `RFC7-14` | The verbatim leaf | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:324 |
| `RFC7-15` | Capability catalog honesty | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:340 |
| `RFC7-16` | Status in the narrative: minimal by default (SDR-17) | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:348 |
| `RFC7-17` | Bands, machine-distinct; three authority classes, closed | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:376 |
| `RFC7-18` | Never a second computation, never a second copy | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:401 |
| `RFC7-19` | Empty is honest | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:409 |
| `RFC7-20` | The draft state | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:416 |
| `RFC7-21` | Adoption is a human act | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:432 |
| `RFC7-22` | Rejection and the queue | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:456 |
| `RFC7-23` | Acts and gates | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:478 |
| `RFC7-24` | The SDR-18 seam | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:487 |
| `RFC7-25` | Materiality and review (SDR-14) | `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md`:496 |
| `RFC7-26` | Two reading modes, named in the kernel's vocabulary | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:78 |
| `RFC7-27` | No fictitious consensus | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:93 |
| `RFC7-28` | Curated diagrams | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:101 |
| `RFC7-29` | The boundary table | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:113 |
| `RFC7-30` | The criterion | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:134 |
| `RFC7-31` | Verdict discipline | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:162 |
| `RFC7-32` | When it runs (SDR-14) | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:196 |
| `RFC7-33` | Every distinction, machine-readable | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:205 |
| `RFC7-34` | Non-visual recoverability | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:241 |
| `RFC7-35` | Multi-project entry | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:261 |
| `RFC7-36` | Portfolio narrative is owner-local, never project truth | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:268 |
| `RFC7-37` | Subprojects render as declared relations | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:304 |
| `RFC7-38` | This contract schedules nothing | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:323 |
| `RFC7-39` | The fixed human entry point | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:374 |
| `RFC7-40` | Repository-front-door discoverability is a per-repository finding | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:416 |
| `RFC8-1` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:81 |
| `RFC8-2` | The anti-thesis is binding | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:88 |
| `RFC8-3` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:98 |
| `RFC8-4` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:106 |
| `RFC8-5` | Deliberate non-reifications | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:121 |
| `RFC8-6` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:134 |
| `RFC8-7` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:142 |
| `RFC8-8` | "What remains?" enumerates three planes, each labeled | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:212 |
| `RFC8-9` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:273 |
| `RFC8-10` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:289 |
| `RFC8-11` | Divergence renders; Trajectory never adjudicates it | `.syzygy/governance/contracts/rfcs/RFC-0008/identity-authority-materialization.md`:327 |
| `RFC8-12` | (this paragraph restates it for orientation) | `.syzygy/governance/contracts/rfcs/RFC-0008/README.md`:216 |
| `RFC8-13` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:212 |
| `RFC8-14` | Raw provider status stays visible and queryable | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:241 |
| `RFC8-15` | Closure is not a normalized "done." | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:256 |
| `RFC8-16` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:268 |
| `RFC8-17` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:306 |
| `RFC8-18` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:336 |
| `RFC8-19` | Absent means Unknown, never zero | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:372 |
| `RFC8-20` | V1 | `.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`:382 |
| `RFC8-21` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:94 |
| `RFC8-22` | A broken join renders; it is never silently skipped | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:124 |
| `RFC8-23` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:135 |
| `RFC8-24` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:164 |
| `RFC8-25` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:190 |
| `RFC8-26` | The preservation set is binding | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:252 |
| `RFC8-27` | Expired-detail rendering | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:260 |
| `RFC8-28` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:291 |
| `RFC8-29` | V0 renders the absence honestly | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:335 |
| `RFC8-30` | The closure fallacy is forbidden | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:344 |
| `RFC8-31` | — | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:356 |
| `RFC8-32` | This contract schedules nothing | `.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:404 |
| `RFC9-1` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:76 |
| `RFC9-2` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:87 |
| `RFC9-3` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:91 |
| `RFC9-4` | The anchoring rule | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:110 |
| `RFC9-5` | What may anchor geography | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:130 |
| `RFC9-6` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:152 |
| `RFC9-7` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:162 |
| `RFC9-8` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:166 |
| `RFC9-8(a)` | The portfolio carries the machinery its obligation requires | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:186 |
| `RFC9-9` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:254 |
| `RFC9-9(a)` | Residual adjacency: the legend has three lines, not two | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:297 |
| `RFC9-9(b)` | The honored / not-honored state is a channel, and is registered as one | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:371 |
| `RFC9-10` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:476 |
| `RFC9-11` | The mode boundary is a contract: an analytical layout may never masquerade as home | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:494 |
| `RFC9-12` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:502 |
| `RFC9-13` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:507 |
| `RFC9-13(a)` | Coordinate-bearing personal state is stamped with the layout version, and never restores silently across one | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:512 |
| `RFC9-14` | Two-tier layout contract | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:542 |
| `RFC9-14(a)` | The three inputs, defined | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:552 |
| `RFC9-15` | Append-stability | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:578 |
| `RFC9-15(b)` | Fixed locations, manually refreshed | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:629 |
| `RFC9-16` | The closed relocation-trigger set | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:586 |
| `RFC9-17` | Forbidden churn | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:701 |
| `RFC9-18` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:715 |
| `RFC9-19` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:736 |
| `RFC9-20` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:755 |
| `RFC9-21` | Identity-based counting, never double-counting | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:804 |
| `RFC9-22` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:823 |
| `RFC9-23` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:831 |
| `RFC9-24` | The reserved state palette | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:67 |
| `RFC9-25` | Reserved channels | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:107 |
| `RFC9-26` | The channel declaration contract | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:118 |
| `RFC9-27` | Unknown is never invisible | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:160 |
| `RFC9-28` | Height (SDR-24) | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:191 |
| `RFC9-29` | Text is a channel | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:200 |
| `RFC9-30` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:218 |
| `RFC9-31` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:230 |
| `RFC9-32` | V0 ships | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:247 |
| `RFC9-33` | Staging | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:302 |
| `RFC9-34` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:311 |
| `RFC9-35` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:316 |
| `RFC9-36` | City is the required V0 scene profile | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:337 |
| `RFC9-37` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:344 |
| `RFC9-38` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:354 |
| `RFC9-39` | Base and intended | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:376 |
| `RFC9-40` | Proposed | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:412 |
| `RFC9-41` | Historical | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:430 |
| `RFC9-42` | LOD epistemic invariance | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:468 |
| `RFC9-43` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:478 |
| `RFC9-44` | The unmapped district (SDR-25) | `.syzygy/governance/contracts/rfcs/RFC-0009/visual-grammar-and-lenses.md`:546 |
| `RFC9-45` | — | `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:520 |
| `RFC9-46` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:63 |
| `RFC9-47` | The equivalence gate is a release check | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:122 |
| `RFC9-47(a)` | The registry maintains itself or it is wrong | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:250 |
| `RFC9-48` | Non-visual parity | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:279 |
| `RFC9-49` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:298 |
| `RFC9-50` | No ambient motion at V0 | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:334 |
| `RFC9-51` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:340 |
| `RFC9-52` | This contract schedules nothing | `.syzygy/governance/contracts/rfcs/RFC-0009/interaction-parity-and-release.md`:349 |
| `RFC10-15` | — | `.syzygy/governance/contracts/rfcs/RFC-0009/semantic-geography.md`:232 |

**Cited here, defined elsewhere or nowhere (16).** These appear
in this family's own files but at no definition site in them: `RFC4-8(c)`, `RFC5-7(d)`, `RFC5-18(a)`, `RFC5-18(c)`, `RFC5-18(e)`, `RFC7-2(a)`, `RFC7-9(a)`, `RFC8-2(a)`, `RFC8-8(a)`, `RFC9-10(c)`, `RFC9-16(a)`, `RFC9-16(d)`, `RFC9-19(b)`, `RFC9-19(c)`, `RFC10-16`, `RFC11-12`.

## Design contract clauses (candidate) — `RFC-candidate`

Candidate — **binds nothing.** RFC-0010 and RFC-0011, plus the candidate copies of the accepted modules. 367 identifiers, defined across 31 files.

**Read this before citing them.** A clause number appearing in both this family and the accepted one is the same clause in two homes. The accepted copy governs.

| Identifier | Title, as the corpus marks it | Defined at |
|---|---|---|
| `RFC1-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:139 |
| `RFC1-2` | Repository | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:170 |
| `RFC1-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:179 |
| `RFC1-4` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:189 |
| `RFC1-5` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:196 |
| `RFC1-6` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:228 |
| `RFC1-7` | Extension profiles | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:245 |
| `RFC1-8` | Frozen-noun mapping | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:284 |
| `RFC1-9` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:301 |
| `RFC1-10` | Identifiers are opaque; names are labels | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:332 |
| `RFC1-11` | Split and merge mint successors, never mutations | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:338 |
| `RFC1-12` | Judgments do not silently survive identity change | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:347 |
| `RFC1-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:355 |
| `RFC1-14` | Capability | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:362 |
| `RFC1-15` | Requirement and Scenario are references, not owned content | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:371 |
| `RFC1-16` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:379 |
| `RFC1-17` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:393 |
| `RFC1-18` | Claim and Gap identity has two levels | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:400 |
| `RFC1-18(a)` | Declared scope is a typed reference, never a string | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:416 |
| `RFC1-18(b)` | Contradiction identity, two levels | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:435 |
| `RFC1-19` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:456 |
| `RFC1-20` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:462 |
| `RFC1-21` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:472 |
| `RFC1-22` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:484 |
| `RFC1-23` | Act-assignment rule | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:544 |
| `RFC1-24` | All positive status flows through Claims | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:559 |
| `RFC1-25` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:565 |
| `RFC1-25(a)` | Two relations minted by owner decision | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:625 |
| `RFC1-25(b)` | The dependency anti-conflation invariant | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:633 |
| `RFC1-25(c)` | Cardinality of placed_in | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:662 |
| `RFC1-25(d)` | Typed relation identity: the spelling is never the identity | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:686 |
| `RFC1-26` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:738 |
| `RFC1-27` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:748 |
| `RFC1-28` | The approved-but-unmaterialized plan item is a lifecycle state of the Proposal entity | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:765 |
| `RFC1-29` | Materialization is a one-way door | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:774 |
| `RFC1-30` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:838 |
| `RFC1-31` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:846 |
| `RFC1-32` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:885 |
| `RFC1-33` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0001-project-graph-identity-state-planes.md`:895 |
| `RFC2-1` | The closed rule, restated as binding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:72 |
| `RFC2-2` | Uncaptured means uninfluential | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:112 |
| `RFC2-3` | Evaluation identity | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:122 |
| `RFC2-4` | Degradation-only over an unchanged snapshot | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:134 |
| `RFC2-5` | Two-level claim identity (SDR-2) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:157 |
| `RFC2-6` | Contents and immutability | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:166 |
| `RFC2-7` | The seam | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:182 |
| `RFC2-8` | Authority ceiling | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:192 |
| `RFC2-9` | The declaration mechanism | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:213 |
| `RFC2-10` | Identity-bearing freshness | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:235 |
| `RFC2-11` | Evidence–revision binding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/snapshot-and-evaluation-core.md`:258 |
| `RFC2-12` | Admissibility (doctrine floor, made operational) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/challenge-lifecycle.md`:73 |
| `RFC2-13` | States, admission, resolution, expiry | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/challenge-lifecycle.md`:81 |
| `RFC2-14` | Suspension is not erasure | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/challenge-lifecycle.md`:278 |
| `RFC2-15` | Definitions and exits | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:79 |
| `RFC2-16` | As claim predicates | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:108 |
| `RFC2-17` | Reservation of the words | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:123 |
| `RFC2-18` | The chain | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:142 |
| `RFC2-19` | Trigger and staging | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:246 |
| `RFC2-19(a)` | What that Unknown carries, and does not | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:255 |
| `RFC2-20` | The closure fallacy, forbidden | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:290 |
| `RFC2-21` | What "no gap at evaluation E" means | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:301 |
| `RFC2-22` | Fixed point (idempotence) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/reconciliation-chain.md`:312 |
| `RFC2-23` | Six degradation states, closed, each with its rendering obligation | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/rendering-vocabularies.md`:78 |
| `RFC2-24` | Twelve reasons, closed | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/rendering-vocabularies.md`:103 |
| `RFC2-25` | Six tiers, closed, each inside exactly one parent label | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/rendering-vocabularies.md`:168 |
| `RFC2-26` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0002/rendering-vocabularies.md`:211 |
| `RFC3-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:112 |
| `RFC3-2` | Every manifest field names exactly one write authority | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:127 |
| `RFC3-3` | Direct-write containment | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:214 |
| `RFC3-4` | (location, not any field value, designates the governance root) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:56 |
| `RFC3-5` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:245 |
| `RFC3-6` | Repository entries | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:268 |
| `RFC3-7` | Consent records | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:278 |
| `RFC3-8` | Revocation and withdrawal | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:303 |
| `RFC3-9` | Drafting and repair | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:324 |
| `RFC3-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:338 |
| `RFC3-11` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:347 |
| `RFC3-12` | Never authoritative for project-internal truth (SDR-30) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:354 |
| `RFC3-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:362 |
| `RFC3-14` | Asymmetric relation semantics | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:367 |
| `RFC3-15` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:83 |
| `RFC3-15(a)` | Why records/ exists | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:105 |
| `RFC3-16` | Lifecycle status: a self-declaration inside content, an effective status outside it | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:117 |
| `RFC3-16(a)` | The owner-act provenance predicate | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:189 |
| `RFC3-16(b)` | What an adoption record binds | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:258 |
| `RFC3-16(c)` | Owner-adopted bootstrap act versus Syzygy-verified act | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:315 |
| `RFC3-16(d)` | Bounded mechanically instantiated URL-dossier local machine-credential data | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:390 |
| `RFC3-17` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:406 |
| `RFC3-17(a)` | Where challenges and their admission records live | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/governance-homes-and-owner-acts.md`:415 |
| `RFC3-18` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:419 |
| `RFC3-19` | .syzygy/work/ | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:426 |
| `RFC3-20` | .syzygy/cache/ is rebuildable projection, nothing else | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:439 |
| `RFC3-21` | .syzygy/local/ is personal presentation state | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:452 |
| `RFC3-22` | Version stamps | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:465 |
| `RFC3-23` | Migrations are identity-preserving | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:472 |
| `RFC3-24` | Migration is an explicit, reviewed, revertable act | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:481 |
| `RFC3-25` | Forward and backward behavior | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:493 |
| `RFC3-26` | openspec/ | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:504 |
| `RFC3-27` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:512 |
| `RFC3-28` | Spec anchors (SDR-32) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:524 |
| `RFC3-29` | One plane per repository; one root per Project — upheld | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:537 |
| `RFC3-30` | Dual roles are lawful and per-pair | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:542 |
| `RFC3-31` | Nesting is composition by declaration | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:598 |
| `RFC3-32` | What a parent may never do | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:610 |
| `RFC3-33` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0003/manifests-and-namespace.md`:634 |
| `RFC4-1` | Two roles, one discipline | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:69 |
| `RFC4-2` | Mandatory declaration set | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:77 |
| `RFC4-3` | Emission obligations | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:100 |
| `RFC4-4` | Failure is rendered, never invisible | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:113 |
| `RFC4-5` | The two-limb anti-duplication invariant | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:120 |
| `RFC4-6` | Substrate-term translation | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:169 |
| `RFC4-7` | The registry | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:181 |
| `RFC4-8` | Version skew | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:200 |
| `RFC4-9` | Substitution | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/general-contract.md`:231 |
| `RFC4-10` | OpenSpec adapter | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:79 |
| `RFC4-11` | Git/VCS adapter (with hosting sub-adapter) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:103 |
| `RFC4-12` | Code-structure observer | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:130 |
| `RFC4-13` | Test, CI, and gate observers | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:157 |
| `RFC4-13(a)` | The external-confirmation capture artifact | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:264 |
| `RFC4-13(b)` | The governed checker | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:298 |
| `RFC4-14` | Runtime observer | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:352 |
| `RFC4-15` | Beads adapter: the read contract | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:365 |
| `RFC4-16` | Capture-before-horizon | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:398 |
| `RFC4-17` | The warrant pointer (outward limb applied) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/named-adapters.md`:442 |
| `RFC4-18` | Classification (SDR-8) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/execution-record.md`:73 |
| `RFC4-19` | The minimum durable run envelope | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/execution-record.md`:86 |
| `RFC4-20` | Enrichment is explicitly non-required | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/execution-record.md`:117 |
| `RFC4-21` | Model, timing, token, and cost semantics | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/execution-record.md`:158 |
| `RFC4-22` | Declared join bases | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:77 |
| `RFC4-23` | Worker liveness honesty | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:91 |
| `RFC4-24` | The labeling schema (SDR-33; delegated by RFC2) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:123 |
| `RFC4-25` | Degradation mapping | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:147 |
| `RFC4-26` | Declaration sites (SDR-3/4) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:154 |
| `RFC4-27` | Executed coverage behind every absence claim | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:193 |
| `RFC4-28` | The invariant | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:210 |
| `RFC4-29` | The enrichment roadmap, named but never required | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:224 |
| `RFC4-30` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0004/fidelity-joins-and-mappings.md`:250 |
| `RFC5-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:93 |
| `RFC5-2` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:114 |
| `RFC5-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:126 |
| `RFC5-4` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:161 |
| `RFC5-5` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:200 |
| `RFC5-6` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:228 |
| `RFC5-7` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:253 |
| `RFC5-8` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:269 |
| `RFC5-9` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:285 |
| `RFC5-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:293 |
| `RFC5-11` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:300 |
| `RFC5-12` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:97 |
| `RFC5-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:119 |
| `RFC5-14` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:141 |
| `RFC5-15` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:205 |
| `RFC5-16` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:244 |
| `RFC5-17` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/consent-egress-secrets.md`:292 |
| `RFC5-18` | The gate | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:91 |
| `RFC5-19` | The trust distinction | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:130 |
| `RFC5-20` | Profile contents | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:165 |
| `RFC5-21` | Isolation mechanism classes | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:192 |
| `RFC5-22` | Destructive-operation gates | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:227 |
| `RFC5-23` | Profile lifecycle | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/execution-profiles.md`:242 |
| `RFC5-24` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:355 |
| `RFC5-25` | Every authenticated act is attributable | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:384 |
| `RFC5-26` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:430 |
| `RFC5-27` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0005/admission-and-boundary.md`:441 |
| `RFC6-1` | One selection identity space | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:108 |
| `RFC6-2` | Everything selectable, one way | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:120 |
| `RFC6-3` | Cross-surface synchronization | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:135 |
| `RFC6-4` | Evaluation defaulting is stamped, never silent | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:142 |
| `RFC6-5` | Total resolution | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:152 |
| `RFC6-6` | Outcomes are not Unknown reasons | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:216 |
| `RFC6-7` | Resolution is deterministic per evaluation | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:223 |
| `RFC6-8` | What a URL pins | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:230 |
| `RFC6-9` | Rename-stability | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:240 |
| `RFC6-10` | Two URL temporalities | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:246 |
| `RFC6-11` | Retired and merged identities | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:254 |
| `RFC6-12` | URLs are surface-independent | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:263 |
| `RFC6-13` | One truth, two consumers | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:271 |
| `RFC6-14` | Label parity | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:279 |
| `RFC6-15` | Every answer is evaluation-stamped | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:312 |
| `RFC6-16` | Filters are declared scope | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:318 |
| `RFC6-17` | Aggregation discloses | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:324 |
| `RFC6-18` | One drawer, one fact set | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:361 |
| `RFC6-19` | Drawer content classes | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:378 |
| `RFC6-20` | Drawer links obey the floor | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:438 |
| `RFC6-21` | Minimal display never subtracts facts | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:447 |
| `RFC6-22` | The equivalence definition | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:455 |
| `RFC6-23` | Finer detail is allowed; contradiction is not | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:469 |
| `RFC6-24` | Scenario context is explicit and singular | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:481 |
| `RFC6-25` | Context travels with the selection | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:527 |
| `RFC6-26` | Unconsented renders as policy, never as error | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:535 |
| `RFC6-27` | Excluded is a rendered state | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:544 |
| `RFC6-28` | This contract schedules nothing | `.syzygy/governance/contracts/candidates/rfcs/RFC-0006-cross-surface-selection-query-drawer.md`:552 |
| `RFC7-1` | What Polaris is | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:80 |
| `RFC7-2` | Composition, never custody | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:87 |
| `RFC7-3` | Nothing cites the rendering | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:111 |
| `RFC7-4` | Non-authority is total | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:122 |
| `RFC7-5` | Entities | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:128 |
| `RFC7-6` | One primary narrative | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:160 |
| `RFC7-7` | The governed-presentation-artifact class (SDR-13) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:172 |
| `RFC7-8` | Neither cache nor governance authority | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:181 |
| `RFC7-9` | Granularity, covering, minimality, bounding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:190 |
| `RFC7-10` | Anchor form | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:217 |
| `RFC7-11` | Broken anchors render Unknown, never silent | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:243 |
| `RFC7-11(a)` | Resolving anchors whose target changed render as drifted, never as current | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:259 |
| `RFC7-12` | Restatement discipline | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:297 |
| `RFC7-13` | Progressive disclosure: the obligation, and a V0 default path | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:306 |
| `RFC7-14` | The verbatim leaf | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:324 |
| `RFC7-15` | Capability catalog honesty | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:340 |
| `RFC7-16` | Status in the narrative: minimal by default (SDR-17) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:348 |
| `RFC7-17` | Bands, machine-distinct; three authority classes, closed | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:376 |
| `RFC7-18` | Never a second computation, never a second copy | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:401 |
| `RFC7-19` | Empty is honest | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:409 |
| `RFC7-20` | The draft state | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:416 |
| `RFC7-21` | Adoption is a human act | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:432 |
| `RFC7-22` | Rejection and the queue | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:456 |
| `RFC7-23` | Acts and gates | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:478 |
| `RFC7-24` | The SDR-18 seam | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:487 |
| `RFC7-25` | Materiality and review (SDR-14) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/narrative-contract.md`:496 |
| `RFC7-26` | Two reading modes, named in the kernel's vocabulary | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:78 |
| `RFC7-27` | No fictitious consensus | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:93 |
| `RFC7-28` | Curated diagrams | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:101 |
| `RFC7-29` | The boundary table | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:113 |
| `RFC7-30` | The criterion | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:134 |
| `RFC7-31` | Verdict discipline | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:162 |
| `RFC7-32` | When it runs (SDR-14) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:196 |
| `RFC7-33` | Every distinction, machine-readable | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:205 |
| `RFC7-34` | Non-visual recoverability | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:241 |
| `RFC7-35` | Multi-project entry | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:261 |
| `RFC7-36` | Portfolio narrative is owner-local, never project truth | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:268 |
| `RFC7-37` | Subprojects render as declared relations | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:304 |
| `RFC7-38` | This contract schedules nothing | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:323 |
| `RFC7-39` | The fixed human entry point | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:374 |
| `RFC7-40` | Repository-front-door discoverability is a per-repository finding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:416 |
| `RFC8-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:81 |
| `RFC8-2` | The anti-thesis is binding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:88 |
| `RFC8-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:98 |
| `RFC8-4` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:106 |
| `RFC8-5` | Deliberate non-reifications | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:121 |
| `RFC8-6` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:134 |
| `RFC8-7` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:142 |
| `RFC8-8` | "What remains?" enumerates three planes, each labeled | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:212 |
| `RFC8-9` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:273 |
| `RFC8-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:289 |
| `RFC8-11` | Divergence renders; Trajectory never adjudicates it | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/identity-authority-materialization.md`:327 |
| `RFC8-12` | (this paragraph restates it for orientation) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/README.md`:216 |
| `RFC8-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:212 |
| `RFC8-14` | Raw provider status stays visible and queryable | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:241 |
| `RFC8-15` | Closure is not a normalized "done." | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:256 |
| `RFC8-16` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:268 |
| `RFC8-17` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:306 |
| `RFC8-18` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:336 |
| `RFC8-19` | Absent means Unknown, never zero | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:372 |
| `RFC8-20` | V1 | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/state-vocabulary-and-cost.md`:382 |
| `RFC8-21` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:94 |
| `RFC8-22` | A broken join renders; it is never silently skipped | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:124 |
| `RFC8-23` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:135 |
| `RFC8-24` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:164 |
| `RFC8-25` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:190 |
| `RFC8-26` | The preservation set is binding | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:252 |
| `RFC8-27` | Expired-detail rendering | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:260 |
| `RFC8-28` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:291 |
| `RFC8-29` | V0 renders the absence honestly | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:335 |
| `RFC8-30` | The closure fallacy is forbidden | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:344 |
| `RFC8-31` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:356 |
| `RFC8-32` | This contract schedules nothing | `.syzygy/governance/contracts/candidates/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:404 |
| `RFC9-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:76 |
| `RFC9-2` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:87 |
| `RFC9-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:91 |
| `RFC9-4` | The anchoring rule | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:110 |
| `RFC9-5` | What may anchor geography | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:130 |
| `RFC9-6` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:152 |
| `RFC9-7` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:162 |
| `RFC9-8` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:166 |
| `RFC9-8(a)` | The portfolio carries the machinery its obligation requires | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:186 |
| `RFC9-9` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:254 |
| `RFC9-9(a)` | Residual adjacency: the legend has three lines, not two | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:297 |
| `RFC9-9(b)` | The honored / not-honored state is a channel, and is registered as one | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:371 |
| `RFC9-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:476 |
| `RFC9-11` | The mode boundary is a contract: an analytical layout may never masquerade as home | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:494 |
| `RFC9-12` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:502 |
| `RFC9-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:507 |
| `RFC9-13(a)` | Coordinate-bearing personal state is stamped with the layout version, and never restores silently across one | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:512 |
| `RFC9-14` | Two-tier layout contract | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:542 |
| `RFC9-14(a)` | The three inputs, defined | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:552 |
| `RFC9-15` | Append-stability | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:578 |
| `RFC9-15(b)` | Fixed locations, manually refreshed | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:629 |
| `RFC9-16` | The closed relocation-trigger set | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:586 |
| `RFC9-17` | Forbidden churn | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:701 |
| `RFC9-18` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:715 |
| `RFC9-19` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:736 |
| `RFC9-20` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:755 |
| `RFC9-21` | Identity-based counting, never double-counting | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:804 |
| `RFC9-22` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:823 |
| `RFC9-23` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:831 |
| `RFC9-24` | The reserved state palette | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:67 |
| `RFC9-25` | Reserved channels | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:107 |
| `RFC9-26` | The channel declaration contract | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:118 |
| `RFC9-27` | Unknown is never invisible | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:160 |
| `RFC9-28` | Height (SDR-24) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:191 |
| `RFC9-29` | Text is a channel | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:200 |
| `RFC9-30` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:218 |
| `RFC9-31` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:230 |
| `RFC9-32` | V0 ships | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:247 |
| `RFC9-33` | Staging | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:302 |
| `RFC9-34` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:311 |
| `RFC9-35` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:316 |
| `RFC9-36` | City is the required V0 scene profile | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:337 |
| `RFC9-37` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:344 |
| `RFC9-38` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:354 |
| `RFC9-39` | Base and intended | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:376 |
| `RFC9-40` | Proposed | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:412 |
| `RFC9-41` | Historical | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:430 |
| `RFC9-42` | LOD epistemic invariance | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:468 |
| `RFC9-43` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:478 |
| `RFC9-44` | The unmapped district (SDR-25) | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/visual-grammar-and-lenses.md`:546 |
| `RFC9-45` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0007/rendering-and-surface.md`:520 |
| `RFC9-46` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:63 |
| `RFC9-47` | The equivalence gate is a release check | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:122 |
| `RFC9-47(a)` | The registry maintains itself or it is wrong | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:250 |
| `RFC9-48` | Non-visual parity | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:279 |
| `RFC9-49` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:298 |
| `RFC9-50` | No ambient motion at V0 | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:334 |
| `RFC9-51` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:340 |
| `RFC9-52` | This contract schedules nothing | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/interaction-parity-and-release.md`:349 |
| `RFC10-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:58 |
| `RFC10-2` | Service-and-client boundary | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:67 |
| `RFC10-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:81 |
| `RFC10-4` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:114 |
| `RFC10-5` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:135 |
| `RFC10-6` | A mission is not work, and work is never proof | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:231 |
| `RFC10-7` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:59 |
| `RFC10-8` | No self-widening — the load-bearing rule | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:139 |
| `RFC10-9` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:204 |
| `RFC10-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:226 |
| `RFC10-11` | Bound exhaustion never self-extends | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:279 |
| `RFC10-12` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:292 |
| `RFC10-13` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:315 |
| `RFC10-14` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:263 |
| `RFC10-15` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0009/semantic-geography.md`:232 |
| `RFC10-16` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:293 |
| `RFC10-17` | Budget is reserved, and reservation is enforcement, never accounting alone | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/budget-reservation.md`:52 |
| `RFC10-17(a)` | Every reservation has a stated release point | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/budget-reservation.md`:159 |
| `RFC10-18` | Completion is reported by the executor and established by another | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:60 |
| `RFC10-18(a)` | Whether effects were applied is established, not asserted | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:106 |
| `RFC10-19` | Effects are classified before they are authorized | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:192 |
| `RFC10-19(a)` | Sibling disposition after a partial failure is a declared policy input, never an inference | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:276 |
| `RFC10-20` | What stop guarantees | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:313 |
| `RFC10-21` | Cross-project composites carry every embedded project's consent requirement | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/portfolio-and-cross-project-consent.md`:68 |
| `RFC10-22` | The attention queue is bounded | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/prevention-envelope-and-attention.md`:331 |
| `RFC10-23` | Effect dimensions are recorded separately, and no single predicate collapses them | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/effects-recovery-and-stop.md`:374 |
| `RFC10-24` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md`:323 |
| `RFC11-1` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:59 |
| `RFC11-2` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:86 |
| `RFC11-3` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:93 |
| `RFC11-4` | Mandatory context is selected deterministically | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:58 |
| `RFC11-5` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:102 |
| `RFC11-6` | Incomplete is Unknown, and Unknown blocks when policy says complete | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:107 |
| `RFC11-7` | No second truth store | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:137 |
| `RFC11-8` | Raw chat history is not canonical project memory | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:145 |
| `RFC11-9` | Retention and privacy boundaries | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:160 |
| `RFC11-10` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:174 |
| `RFC11-11` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:188 |
| `RFC11-12` | — | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/packet-identity-provenance-and-memory.md`:201 |
| `RFC11-13` | Every active contract declares its implementation boundary | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:99 |
| `RFC11-14` | Dependency traversal is defined, bounded, and recorded | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:141 |
| `RFC11-15` | Doctrine and craft rule ownership is declared, not judged | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:168 |
| `RFC11-16` | constrains is consumed clause-first | `.syzygy/governance/contracts/candidates/rfcs/RFC-0011/deterministic-selection-and-budget.md`:180 |

**Cited here, defined elsewhere or nowhere (17).** These appear
in this family's own files but at no definition site in them: `RFC4-8(c)`, `RFC5-7(d)`, `RFC5-18(a)`, `RFC5-18(c)`, `RFC5-18(e)`, `RFC7-2(a)`, `RFC7-9(a)`, `RFC8-2(a)`, `RFC8-8(a)`, `RFC9-10(c)`, `RFC9-16(a)`, `RFC9-16(d)`, `RFC9-19(b)`, `RFC9-19(c)`, `RFC10-20(b)`, `RFC10-20(c)`, `RFC10-20(d)`.

## Cited without a definition site

Every identifier above was found at a **heading or a leading bold run** —
the two places this corpus marks a definition. The identifiers below appear
in their family's own files but never at such a site. Three different things
produce that, and the register does not guess which:

- a **cross-family citation** — an RFC-0003 clause naming an RFC-0001 clause
  is a citation, and the definition sits in the other module (verification
  rule 5: a citation is not a reliance);
- a clause defined in **running prose** rather than at a marked-up site,
  which is a markup gap, not a missing rule;
- a genuine **dangling reference** to a clause that no longer exists.

Resolving one means opening the citing line, not trusting this table.

| Identifier | Family it was cited in |
|---|---|
| `RFC4-8(c)` | Design contract clauses |
| `RFC5-7(d)` | Design contract clauses |
| `RFC5-18(a)` | Design contract clauses |
| `RFC5-18(c)` | Design contract clauses |
| `RFC5-18(e)` | Design contract clauses |
| `RFC7-2(a)` | Design contract clauses |
| `RFC7-9(a)` | Design contract clauses |
| `RFC8-2(a)` | Design contract clauses |
| `RFC8-8(a)` | Design contract clauses |
| `RFC9-10(c)` | Design contract clauses |
| `RFC9-16(a)` | Design contract clauses |
| `RFC9-16(d)` | Design contract clauses |
| `RFC9-19(b)` | Design contract clauses |
| `RFC9-19(c)` | Design contract clauses |
| `RFC10-16` | Design contract clauses |
| `RFC11-12` | Design contract clauses |
| `RFC4-8(c)` | Design contract clauses (candidate) |
| `RFC5-7(d)` | Design contract clauses (candidate) |
| `RFC5-18(a)` | Design contract clauses (candidate) |
| `RFC5-18(c)` | Design contract clauses (candidate) |
| `RFC5-18(e)` | Design contract clauses (candidate) |
| `RFC7-2(a)` | Design contract clauses (candidate) |
| `RFC7-9(a)` | Design contract clauses (candidate) |
| `RFC8-2(a)` | Design contract clauses (candidate) |
| `RFC8-8(a)` | Design contract clauses (candidate) |
| `RFC9-10(c)` | Design contract clauses (candidate) |
| `RFC9-16(a)` | Design contract clauses (candidate) |
| `RFC9-16(d)` | Design contract clauses (candidate) |
| `RFC9-19(b)` | Design contract clauses (candidate) |
| `RFC9-19(c)` | Design contract clauses (candidate) |
| `RFC10-20(b)` | Design contract clauses (candidate) |
| `RFC10-20(c)` | Design contract clauses (candidate) |
| `RFC10-20(d)` | Design contract clauses (candidate) |

## What this page will not tell you

It does not say what any clause requires — that is the clause's job, and
keeping the body out of this page is the whole reason it is safe to generate.
It does not say which identifiers a task must load;
`.syzygy/governance/contracts/candidates/TASK-ROUTER.md` routes by task. It
does not define the identifier forms; `PROCESS-GLOSSARY.md` does. It does not
say what is in force beyond naming each family's home and status;
`PROJECT-STATUS.md` and the act record own that. And it resolves no
disagreement between two homes: it shows you both and leaves the
contradiction visible, which is what CC-REV-3 asks for.

