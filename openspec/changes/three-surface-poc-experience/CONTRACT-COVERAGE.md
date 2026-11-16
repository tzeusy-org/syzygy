# Contract coverage — three-surface-poc-experience

> **Candidate.** Ships with the candidate specification and binds
> nothing until owner sign-off. **CC-SPEC-8 coverage matrix.** Rows are
> **per observable consequence, not per clause** (the unit RFC1-33 and
> RFC6-28 fix). Consequence phrasings are row labels for mapping only —
> the clause text is the authority, and nothing here restates a clause
> normatively.
>
> **No N/A is minted on the author's authority.** Under CC-SPEC-8 a
> reviewed N/A judgment is a recorded **owner** judgment homed in
> `decisions/`, honored only through an effective owner act under
> RFC3-16(a). Valid state (1) and state (2) acts are both effective and
> their exact state is disclosed; a missing or invalid act maps nothing
> and leaves the consequence Unknown. The act is a warrant, never evidence
> that the consequence is satisfied. **No such judgment exists for any
> clause today**, so every consequence not covered by a requirement renders
> **Unknown pending owner-reviewed N/A** — never covered, never silently
> omitted (VIS-2). "Believed not applicable" (Part B2) is the author's
> application of CC-SPEC-8's applicability test, offered to the owner; it
> settles nothing.

## Population and denominator

`[Observed]` The accepted clause population is the Wave A/B install:
**324 defined clause identifiers across the 30 modules at
`contracts/rfcs/`** (RFC 0001–0009). Counted this session by two
methods that agree exactly per family: (1) a Python `re` sweep over the
30 module files for clause-definition headers; (2) the clause rows of
the generated `05-CONTRACT-INDEX.yaml`, excluding its RFC10/RFC11 rows
(deferred candidates, not accepted, outside this population).

Every clause was judged exactly once and lands in exactly one part:

- **Part A** — clauses at least one of whose consequences a
  requirement's oracle observes (the `contracts[]` union).
- **Part B1** — clauses the author judged applicable to the POC's scope
  but which **no requirement covers**. Every row is Unknown pending
  owner-reviewed N/A. These are the spec's real gaps, surfaced for the
  sign-off decision rather than folded away.
- **Part B2** — clauses the author believes not applicable under
  CC-SPEC-8's test, per-clause, offered to the owner.

| Family | Accepted clauses | Part A (mapped) | Part B1 (applicable, uncovered) | Part B2 (believed not applicable) |
|---|---|---|---|---|
| RFC1 | 39 | 12 | 4 | 23 |
| RFC2 | 27 | 8 | 0 | 19 |
| RFC3 | 38 | 0 | 0 | 38 |
| RFC4 | 32 | 10 | 1 | 21 |
| RFC5 | 27 | 1 | 15 | 11 |
| RFC6 | 28 | 10 | 1 | 17 |
| RFC7 | 41 | 12 | 4 | 25 |
| RFC8 | 32 | 8 | 1 | 23 |
| RFC9 | 60 | 17 | 2 | 41 |
| **Total** | **324** | **78** | **28** | **218** |

The Part A clause set is exactly the `contracts[]` union in the
generated `GOVERNING-DEPENDENCIES.md` (verified below).

## Part A — mapped clauses, per observable consequence

Disposition vocabulary: **covered** (the named requirements' oracles
observe the consequence) or **Unknown** (a consequence limb of a mapped
clause that no requirement covers and no owner-reviewed N/A settles).

**Row method.** `[Inferred]` One row per normatively distinct
obligation limb the capability touches, judged by the author from the
accepted bytes; folds are disclosed in the disposition notes rather
than hidden. No method demonstrates that every clause's limb set was
exhausted — a reviewer who finds an unlisted limb has found a real gap.

| Clause | Observable consequence (row label) | Disposition | Requirements |
|---|---|---|---|
| RFC1-5 | Source-snapshot entity (content-derived, closed input set) | covered — Structure bound to exact git revision, deterministic per revision | POC-REQ-001, POC-REQ-004 |
| RFC1-5 | Work-item entity (scheduler-issued, mirrored never minted) | covered — Beads Dolt DB is the mirror source; JSONL barred as source | POC-REQ-010, POC-REQ-012 |
| RFC1-5 | Code-element entity (source-adapter-defined) | covered — Metadata/sizes/languages/hashes are Code-element facts | POC-REQ-001, POC-REQ-002 |
| RFC1-7 | `presentation` extension profile (narrative composition) | covered — Polaris's multi-page long-form narrative is exactly this profile's vocabulary | POC-REQ-030, POC-REQ-031, POC-REQ-032 |
| RFC1-9 | Work-item identity mirrored from scheduler; kernel never mints/owns it | covered — Dolt DB sole source; JSONL-as-source prohibition enforces non-minting | POC-REQ-010, POC-REQ-012 |
| RFC1-14 | Code mapping to no declared capability renders Unknown, never silently inferred | covered — Direct match: Orrery's unmapped-code Unknown region | POC-REQ-051 |
| RFC1-14 | Capability identity/anchoring restricted to declared (adopted) artifacts | **Unknown** — Polaris/Orrery project "declared"/"intent" entities but no requirement tests exclusion of drafted/unadopted capabilities | — |
| RFC1-16 | Declared implementation mapping (class i) is the mapping source rendered | covered — Orrery's "declared mappings" are RFC1-16 class (i) | POC-REQ-050 |
| RFC1-16 | Four capability↔code classes never conflated; no fabricated edge | covered — Direct match | POC-REQ-052 |
| RFC1-19 | No evidence ⇒ Unknown never success; narrative/activity substituting for a badge is judged as a badge | covered — Fold disclosed: Polaris's narrative-gap rule and Trajectory's activity-as-satisfaction rule are the same consequence | POC-REQ-032, POC-REQ-043 |
| RFC1-22 | Execution-plane facts may never satisfy a desired-state claim | covered — Trajectory's work-item activity must not render as satisfaction | POC-REQ-043 |
| RFC1-23 | Act-assignment: work/execution acts stay Execution-plane, never promoted to Observed-plane verification without a retained gate artifact | covered — Consistent with the scope Context disclosing the work-item/test-evidence/runtime relationship as Unknown | POC-REQ-043 |
| RFC1-24 | Positive status flows only through a challengeable Claim with resolvable provenance; no evidence-to-status backdoor | covered | POC-REQ-031, POC-REQ-043 |
| RFC1-25 | Only relations the model actually holds are rendered; no fabricated adjacency/grouping | covered | POC-REQ-050, POC-REQ-052 |
| RFC1-25 | A relationship named from the closed table is emitted in a role pair the table assigns it, read through a declared kind-to-class correspondence, and every other relationship is flagged outside the table | covered — Amendment row (vocabulary and record shape); the oracle observes naming-or-flag, not closure | POC-REQ-055 |
| RFC1-25 | The declared kind-to-class correspondence matches RFC 0001's class definitions | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-055 reads role pairs through the declaration, the slice that emits the relationships also writes it, and no requirement decides whether each mapping is true | — |
| RFC1-25 | A closed-name relationship honours its row's semantic class and rule | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-055 decides name and mapped role pair only | — |
| RFC1-26 | Every rendered edge/citation resolves to an identified target (trust-floor link rule) | covered | POC-REQ-031, POC-REQ-053 |
| RFC1-26 | Relations outside the closed table don't exist; no prose-widening | covered | POC-REQ-052 |
| RFC1-26 | Every emitted relationship outside the closed table, by kind or by role pair as read through the declared kind-to-class correspondence, is disclosed as outside it, with a reason, in the machine answer and in every rendered element that marks it with a declared relationship marker, never presented as a closed-table relation | covered — Amendment row (vocabulary and record shape); the disclosure the ruling chose as the repair for the preserved row above (see the amendment disclosure below this table) | POC-REQ-055 |
| RFC1-26 | A flagged relationship rendered in an element that carries no declared relationship marker shows its flag and reason there | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-055's sweep reaches the declared relationship-marker population only, and no requirement makes every rendering of a relationship carry a marker | — |
| RFC1-26 | No relation is re-typed | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-055 decides name and mapped role pair only, not whether an emitted relationship was re-typed to fit the table | — |
| RFC1-26 | No relation outside the closed table is emitted at all | **Unknown** — Amendment row (vocabulary and record shape); ruling P-75 Q3 chose disclosure, not removal, as the repair, and none of the nine relationships emitted at drafting is admitted by the table | — |
| RFC1-31 | Work items: scheduler-owned lifecycle, mirrored with labeled staleness when adapter degrades, never invisibly | covered — Direct match | POC-REQ-013 |
| RFC1-31 | Observed classes: appear in snapshot / absence is a fact / failed observation renders Unknown with named reason | covered | POC-REQ-003 |
| RFC2-1 | Observed inputs (repo, Dolt DB) identified by revision/hash, not by description | covered — Only the revision-identification limb of the 11-item list is touched; challenge/evidence/act-record items (4,6,9,11) are unbuilt | POC-REQ-001, POC-REQ-004, POC-REQ-010 |
| RFC2-2 | Uncaptured/unreachable source never silently influences a claim; affected claims → Unknown with reason | covered — Direct instance of the closed-snapshot rule for structure and Dolt observation | POC-REQ-003, POC-REQ-013 |
| RFC2-3 | Facts deterministic given an identical revision (identity test) | covered — Only the determinism consequence is touched, not the full evaluation/as-of/kind apparatus | POC-REQ-004 |
| RFC2-3 | Time-sensitive rendering computed from recorded instants, never ambient wall-clock | covered — Matches "as-of instant explicit, never ambient wall-clock" near-verbatim | POC-REQ-041 |
| RFC2-6 | Coverage record for an executed mapping/oracle, with reconciling counts | covered — Thin/partial touch — only the coverage-record sub-item of the full immutable observation-record artifact is instanced; no persisted record, claim instances, tiers, evidence links, or challenge sets exist | POC-REQ-042, POC-REQ-051 |
| RFC2-20 | Scheduler closure/merge/activity never rendered as reconciled/satisfied | covered — Near-verbatim match to the closure-fallacy prohibition, applied to Trajectory | POC-REQ-043 |
| RFC2-23 | Observer-failed / source-unreachable → Unknown with named reason, never invisible failure | covered — Two of six degradation states touched; Consent-withdrawn, Excluded-content, Missing-quantity are not (no consent revocation, no partial-content capture, no absent-measure rendering in POC) | POC-REQ-003, POC-REQ-013 |
| RFC2-23 | Partial/failed observation never presented as complete | covered — "never partial-as-complete" is near-verbatim to the Partial-snapshot rendering obligation | POC-REQ-003 |
| RFC2-24 | Unknown claim carries reason #10 `source-uncaptured-or-unreachable` | covered — Inferred reuse of the Cap1 closed reason vocabulary via the shared runtime spine; exact reason string not directly quoted in the digest. Amendment: POC-REQ-014's oracle reads this exact reason, and its RFC2-24 route, on every served item's governing-intent claim | POC-REQ-003, POC-REQ-013, POC-REQ-014 |
| RFC2-24 | Reason #5 `mapping-coverage-absent` — absence/Unknown regions justified by a coverage record, never a silent gap | covered — Empty-plot-rule pattern; borderline since digest doesn't name the reason explicitly | POC-REQ-051 |
| RFC2-24 | Every Unknown epistemic record on an entity or relationship in the machine answer carries exactly one primary reason from the closed twelve, with its resolution route | covered — Amendment row (vocabulary and record shape) | POC-REQ-060 |
| RFC2-24 | Secondary annotations, where present, are drawn from the same closed twelve and travel marked as secondary | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's record shape names the primary reason only | — |
| RFC2-25 | A rendering tier, where a record carries one, is one of the closed six and sits inside its parent label | covered — Amendment row (vocabulary and record shape) | POC-REQ-060 |
| RFC2-25 | An `asserted-by-worker` claim sits inside its parent label, Inferred, and is "never green": it renders with the declared table's Inferred entry, which differs from its Observed entry, in every rendered element that marks it with a declared record marker | covered — Amendment row (vocabulary and record shape); exercised by a fixture while no agent asserts anything; `[Inferred]` the covered reading of "never green" is "rendered unlike Observed": RFC2-25's `gate-backed` row lists "green" among positive status claims, and on the reading "never rendered as a positive status" this limb is the Unknown positive-status row below | POC-REQ-060 |
| RFC2-25 | An `asserted-by-worker` claim is "never a status input" in the two computations the POC performs: it counts toward no Observed total (every count the machine answer serves, except one it declares to be of Inferred records), and it clears no Unknown among the machine answer's entity and relationship records | covered — Amendment row (vocabulary and record shape); exercised by a fixture while no agent asserts anything; any other status input is an Unknown row below | POC-REQ-060 |
| RFC2-25 | An `asserted-by-worker` claim renders unlike Observed in a rendering that carries no declared record marker | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's Inferred encoding limb reaches the declared record-marker population only | — |
| RFC2-25 | An `asserted-by-worker` claim clears no Unknown outside the machine answer's entity and relationship lists | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's recount compares the entity and relationship records only | — |
| RFC2-25 | An `asserted-by-worker` claim is "never a status input" to a positive status (Aligned, Converged, reconciled, green) | **Unknown** — Amendment row (vocabulary and record shape); the POC computes no such status for the oracle to observe | — |
| RFC2-25 | An `asserted-by-worker` claim is "Visible": it is rendered where its subject is rendered | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060 fixes the encoding wherever an Inferred record appears, and no requirement requires one to appear | — |
| RFC2-25 | An `asserted-by-worker` claim is "challengeable" | **Unknown** — Amendment row (vocabulary and record shape); the POC has no challenge mechanism for the oracle to observe | — |
| RFC2-25 | An `asserted-by-worker` claim arises from "An LLM worker's assertion of an outcome with no retained artifact" | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's oracle checks that an Inferred record names an agent assertion, not that the record arose from one | — |
| RFC2-25 | A record carries a tier only where that tier's Semantics column holds: `gate-backed` only with a retained, resolvable gate artifact bound to the exact revision; `report-fact` only for a fact about a report; `reduced-fidelity` only at a declared coarse granularity; `declared-only` only for a declaration whose satisfaction is unverified; `suspended` only for an Unknown whose basis is under an open challenge or contradiction | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's oracle validates tier membership and nesting only, so a record tagged `gate-backed` with no gate artifact, or `suspended` with no open challenge or contradiction, passes it; the `asserted-by-worker` Semantics limb is its own row above | — |
| RFC2-25 | Each tier keeps its authority: only `gate-backed` supports a positive status; `report-fact` speaks of the report only; `reduced-fidelity` renders as such; `declared-only` renders both halves; `suspended` never erases its basis | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's oracle validates tier membership and nesting only | — |
| RFC2-25 | The three sibling surface states (`dismissed-by-decision`, `unadopted-draft`, `editorial-draft`) render as siblings, never as tiers | **Unknown** — Amendment row (vocabulary and record shape); the POC renders none of the three and no requirement observes them | — |
| RFC4-2 | Output determinism class declared/exhibited (derivation-deterministic) | covered — "structure facts deterministic per revision" is item 5's determinism-class vocabulary | POC-REQ-004 |
| RFC4-2 | Failure states named + mapped to rendering | covered — item 6's failure-state mapping duty | POC-REQ-003, POC-REQ-013 |
| RFC4-2 | Authority boundary: write surface empty unless authorized | **Unknown** — scope bars writes to the observed project, but no enumerated requirement's oracle checks an empty write surface | — |
| RFC4-3 | Emitted structure facts carry capture/revision + relocatable provenance | covered — exact-git-revision binding is the capture/provenance obligation for structure facts | POC-REQ-001 |
| RFC4-3 | Emitted work items carry capture/revision + relocatable provenance | covered — Dolt-revision-stamped provenance is the same obligation applied to work items | POC-REQ-010 |
| RFC4-3 | Capturing observer identity + version stamped on emissions | **Unknown** — no digest requirement enumerates an observer identity/version field | — |
| RFC4-4 | Observer failure renders Unknown-with-reason, never invisible or partial-as-complete | covered — direct match | POC-REQ-003, POC-REQ-013 |
| RFC4-5 | Inward limb: external work-item projection stamped with the revision that read it | covered — Dolt-revision stamping satisfies "stamped with the identified evaluation" | POC-REQ-010 |
| RFC4-5 | Inward limb: that projection never presented as editable, discarded/re-derived rather than merged | **Unknown** — Trajectory's read-only nature is architectural; no digest requirement's oracle tests non-editability | — |
| RFC4-6 | Substrate status vocabulary translated into surface (Trajectory column) vocabulary on read | covered — "declared closed status-vocabulary mapping" is exactly this translation | POC-REQ-040 |
| RFC4-6 | Substrate-native identifiers (bead id / bead-prefix) carried as qualified alias, never primary key | **Unknown** — POC-REQ-011 checks prefix membership but no requirement confirms bead_id isn't used as primary identity elsewhere | — |
| RFC4-11 | Code-structure observation bound to a specific repository-identity → revision map entry | covered — "exact git revision" binding is RFC4-11's revision-map read applied here | POC-REQ-001 |
| RFC4-12 | File inventory restricted to structure/metadata only, never contents; static-parsing-only boundary | covered — "metadata, sizes, languages, hashes — never indexed contents" matches this observer's structure-only boundary; structural-relations/code-element-identity limbs untouched (never reads contents), omitted | POC-REQ-001, POC-REQ-002 |
| RFC4-12 | Observer failure/unreadable path rendering | covered — code-structure-specific instance of the general degrade-to-Unknown duty | POC-REQ-003 |
| RFC4-15 | Work-item identity + status vocabulary faithfully, capture-stamped transmitted as substrate declares (never hardcoded) | covered — direct match | POC-REQ-010 |
| RFC4-15 | Reads only the live/authoritative substrate, never a derived passive export, as a work-item source | covered — export-mutation oracle is exactly this authority-boundary check | POC-REQ-012 |
| RFC4-15 | Degraded mode: substrate unreadable renders Unknown-with-reason, distinct from a genuinely empty result | covered — matches "export unavailable → last-good marked stale," applied as Unknown-vs-empty distinction | POC-REQ-013 |
| RFC4-15 | Authority is work lifecycle state, never intent: the work-item title, the only free text the POC reads, is never read as a work item's governing intent | covered — Amendment row; the fixture-title counterexample observes it | POC-REQ-014 |
| RFC4-26 | Capability/entity↔code mappings are declared-only, inferred mappings excluded | covered — Orrery's declared-mappings-only design is exactly class (i) with class (ii) excluded, matching the scope's "no inferred mappings or edges" | POC-REQ-050, POC-REQ-052 |
| RFC4-27 | Unmapped/absence claim requires an executed coverage record with reconciling counts, never silent absence | covered — "unmapped code a visible Unknown region with reconciling counts" is this clause's coverage-record duty applied to Orrery | POC-REQ-051 |
| RFC5-16 | (a) Observation-capture ingest screening for Butlers repo structure | covered — POC-REQ-002's "never indexed contents" sentinel sweep structurally avoids most of the screening concern for code bodies, but doesn't test the secret-detection-policy mechanism itself | POC-REQ-002 (partial) |
| RFC5-16 | (b) Beads/Dolt work-item ingest screening | **Unknown** — POC-REQ-010/013 test provenance and Unknown-on-failure, not secret screening of ingested work-item text | — |
| RFC6-13 | Machine endpoint answers from the same fact set surfaces render; no endpoint-only or UI-only facts | covered — POC's `/api/poc` + client/no-script parity is exactly SDR-27's bidirectional obligation this clause states | POC-REQ-020, POC-REQ-022 |
| RFC6-14 | Machine answer never silently omits or folds Unknown/epistemic state into a total | covered — Fold: full RFC2-25 tier / secondary-annotation / sibling-surface-state / challenge-pending limbs dropped — POC carries no such vocabulary | POC-REQ-020, POC-REQ-042, POC-REQ-051 |
| RFC6-14 | Every entity and relationship in the machine answer carries exactly one epistemic record: its label, its tier where it carries one, and its primary Unknown reason verbatim from the RFC 0002 vocabulary | covered — Amendment row (vocabulary and record shape); POC-REQ-060's denominator is every element of the machine answer's entity and relationship lists, not the records that exist | POC-REQ-060 |
| RFC6-14 | Every claim instance, and every other epistemic value the machine answer serves outside its entity and relationship lists, carries the same record | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's record-shape population is the entity and relationship lists only | — |
| RFC6-14 | Secondary Unknown annotations travel with the primary, verbatim and marked as secondary | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's record shape names the primary reason only | — |
| RFC6-14 | The freshness state travels with every entity and claim instance | **Unknown** — Amendment row (vocabulary and record shape); POC-REQ-060's record shape does not include freshness | — |
| RFC6-15 | Every answer names the revision/evaluation it was computed at; same input ⇒ same answer | covered — "Filters" limb not present (no query filter surface in POC-REQ list) — folded to revision-stamping + determinism only | POC-REQ-001, POC-REQ-004, POC-REQ-010 |
| RFC6-16 | An answer declares its scope and never presents a filtered/partial result as full coverage | covered — Bead-prefix scoping (011) and Trajectory's selection-rule/reconciling-counts disclosure (042) are declared-scope instances | POC-REQ-011, POC-REQ-042 |
| RFC6-17 | An aggregate discloses its membership count/composition rather than a bare total | covered — Fold: only basic count-disclosure limb; full RFC6-22-tuple composition (tier/sibling/challenge/chain-state counts) not built | POC-REQ-042, POC-REQ-051 |
| RFC6-18 | Two surfaces must not differ in which facts/labels exist for one underlying selection — divergence is a model defect, not UI variance | covered — Fold: the dedicated "evidence drawer" container / "Why this answer?" naming is not built; only the general non-divergence principle applies | POC-REQ-020, POC-REQ-060 |
| RFC6-19 | Evidence content travels as resolvable links carrying source/provenance | covered — Fold to class 3/4 (evidence+provenance) only; classes 1,2,5,6,7,8 (lifecycle, warrant, challenge, policy/consent, work-state) explicitly Unknown/out of scope this slice | POC-REQ-031 |
| RFC6-20 | Every internal link in the rendered fact set resolves to its identified target; kernel/model never emits an unresolvable reference | covered — Trust-floor (VIS-7) limb applies independent of the drawer wrapper; Polaris citations and Orrery→table routes are the POC's instances | POC-REQ-031, POC-REQ-053 |
| RFC6-22 | Two renderings are equivalent only if they share evaluation identity, declared filters, graph, and epistemic states for every presented element | covered — Fold: sibling-surface-state, challenge-pending, chain-state, normalized-work-state, and scenario-context limbs excluded — none exist in POC | POC-REQ-020, POC-REQ-041, POC-REQ-042, POC-REQ-060 |
| RFC6-23 | No two renderings may disagree on an entity's existence, a count, or a freshness state over one declared scope; finer detail must be disclosed, not silent | covered — Marker-sweep and reconciling-count oracles are direct instances of this no-disagreement rule | POC-REQ-020, POC-REQ-041, POC-REQ-042, POC-REQ-051 |
| RFC7-2 | Every load-bearing claim anchored to its owning artifact | covered — limb (a) | POC-REQ-031 |
| RFC7-2 | Framing/motivational prose marked non-normative | **Unknown** — limb (b); no POC-REQ distinguishes non-factual framing prose | — |
| RFC7-2 | Gaps rendered as epistemically labeled, never asserted | covered — limb (c) | POC-REQ-032 |
| RFC7-5 | Narrative/Section/Claim-block/citation-graph entity model | covered — entity-model limb only; `.syzygy/intent/**` residence, presentation-profile bootstrap, editorial-draft and curated-diagram entities not built (fold disclosed) | POC-REQ-030, POC-REQ-031 |
| RFC7-6 | One primary narrative renders, never absent | covered | POC-REQ-030 |
| RFC7-6 | Thin narrative on sparse evidence is still correct output | **Unknown** — borderline — populated Butlers repo may not exercise this path | — |
| RFC7-9 | Anchor set covers each claim; reader can tell which anchor supports it | covered — limb (a) | POC-REQ-030, POC-REQ-031 |
| RFC7-9 | No surplus/unused anchors in a block | **Unknown** — limb (b) | — |
| RFC7-9 | Blocks bounded so claim-to-anchor attribution stays recoverable | **Unknown** — limb (c) | — |
| RFC7-10 | Anchors are typed, durable identifiers, never labels/paths | covered | POC-REQ-031 |
| RFC7-10 | Target-state recorded at authorship, never rewritten on later read | **Unknown** — fixed-single-revision model gives no re-read/drift window | — |
| RFC7-11 | Broken/unresolvable anchor renders Unknown with reason, never silently dropped or auto-redirected | covered — failure-side view of the same "zero dangling citations" invariant | POC-REQ-031 |
| RFC7-13 | Progressive multi-page disclosure, each page an honest self-sufficient read | covered | POC-REQ-030, POC-REQ-032 |
| RFC7-13 | Every narrative descends to a verbatim leaf | **Unknown** — tension with POC-REQ-002's content exclusion; V0 altitude vocabulary (thesis/manifesto/etc.) not built | — |
| RFC7-18 | Reality-band facts come from the one shared model, never a second Polaris-side computation | covered | POC-REQ-020 |
| RFC7-19 | Empty content collapses to one honest line, never a blank/scaffold section | covered | POC-REQ-032 |
| RFC7-29 | Narrative/claim blocks/citation graph are Polaris's own composition; every other fact class stays authoritative elsewhere | covered | POC-REQ-031, POC-REQ-032 |
| RFC7-33 | Every rendered distinction served identically machine vs human | covered | POC-REQ-020, POC-REQ-022 |
| RFC7-33 | `non-citable`/`presentation-artifact` attribute carried on every rendering | **Unknown** | — |
| RFC7-33 | Narrative claim-block type name kept distinct from kernel Claim entity | **Unknown** | — |
| RFC7-34 | Every distinction recoverable without colour/position/layout; legended encodings | covered | POC-REQ-061 |
| RFC7-34 | Disclosure paths operable without a pointing device | covered | POC-REQ-061, POC-REQ-022 |
| RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly; limb (a) [no editable store — POC never writes] and limb (c) [fleet-change/cost/authority accounting] aren't touched by POC scope, so only (b) rows here | POC-REQ-043 |
| RFC8-12 | Kanban state field renders only a declared, closed set of status values — no minted/free-form values | covered — POC's "declared closed status-vocabulary mapping" exercises the closed-vocabulary/no-minting invariant; the specific 13-value partition, chain-state field separation, and `reconciled` carve-out aren't adopted since Trajectory renders no reconciliation chain state | POC-REQ-040 |
| RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly | POC-REQ-043 |
| RFC8-22 | The unestablished first link of the chain, work item to warrant, renders Unknown with its RFC2-24 reason, never silently skipped | covered — Amendment row | POC-REQ-014 |
| RFC8-22 | A join is never reconstructed by similarity, interpolation or inference | covered — Amendment row; the fixture-title counterexample observes the title case | POC-REQ-014 |
| RFC8-22 | Everything downstream of a broken link renders with provenance degraded accordingly | **Unknown** — Amendment row; the POC renders no link downstream of the work item, and no requirement observes degraded downstream provenance | — |
| RFC8-23 | A work item with no traceable warrant renders Unknown-provenance: counted over the served set, filterable within Trajectory's rendered selection, never green, its route resolvable by supplying a warrant stated beside the count | covered — Amendment row; the oracle decides the count, the narrowed board over the rendered selection, the Unknown encoding against POC-REQ-060's table, and the resolution statement by literal match | POC-REQ-014 |
| RFC8-23 | Unknown-provenance items outside Trajectory's rendered selection are filterable | **Unknown** — Amendment row; POC-REQ-042 lets Trajectory render a selection, so items outside it are counted on Trajectory but not rendered, and no requirement observes filtering them | — |
| RFC8-23 | Unknown-provenance work is never silently pooled into warranted work | **Unknown** — Amendment row; no served item is warranted, so the oracle has no warranted population to keep it apart from | — |
| RFC8-23 | Unknown-provenance is never an ingest rejection | **Unknown** — Amendment row; POC-REQ-014's denominator is the served set, so an item dropped before serving is invisible to its oracle | — |
| RFC8-23 | A substrate-side warrant-field edit is an annotation, not a competing warrant | **Unknown** — Amendment row; the POC reads no warrant field | — |
| RFC8-23 | Unknown-provenance never absorbs orphaned work: where an item is both, the orphaned-work Contradiction governs | **Unknown** — Amendment row; the POC detects no orphaned work, and POC-REQ-014's Scope leaves this limb to the amendment that specifies orphaned-work detection, so no requirement observes the Contradiction governing | — |
| RFC8-24 | Trajectory renders `source-uncaptured-or-unreachable` on a claim with its route visible | covered — Amendment row; the governing-intent claim on every work item | POC-REQ-014 |
| RFC8-24 | The other reasons Trajectory renders (`missing-evidence`, `no-currency-bound-declared`, `stale-beyond-currency-bound`, `missing-declaration`), and a retention loss rendered citing the retention event | **Unknown** — Amendment row; no requirement observes them on Trajectory's claims | — |
| RFC8-24 | Unknown aggregation follows RFC2-24's rendering rule: the governing-intent Unknowns aggregate to one count, disclose their reason count, and expand to their members within Trajectory's rendered selection | covered — Amendment row; one reason, so the served count is that reason's count; the narrowed board is the expansion over the rendered selection | POC-REQ-014 |
| RFC8-24 | The rest of the aggregation rule: expansion to members outside Trajectory's rendered selection, and the full RFC6-17 disclosure the rendering rule cites (per-label, per-tier, per-freshness counts, the equivalence tuple) for this aggregate | **Unknown** — Amendment row; no requirement observes either for the governing-intent count | — |
| RFC8-24 | These are claim reasons only: the normalized state's four absence values take no reason, are counted separately, and are never absorbed by an aggregate of Unknowns | **Unknown** — Amendment row; Trajectory renders no RFC8-12 normalized state with absence values, so no requirement observes the separation | — |
| RFC8-30 | No aggregate, badge, progress bar, or prose sentence renders closed work as done/complete/satisfied absent verification evidence | covered — Same closure-fallacy prohibition restated at module-3 level; disclosed fold — RFC8-2(b), RFC8-15, and RFC8-30 all map to the same one POC requirement from three angles | POC-REQ-043 |
| RFC8-31 | Every rendered state/cause/absence value recoverable by text alone (no colour/position-only encoding); every traversal keyboard-operable | covered — Non-visual-parity limb matches the design-token/epistemic-encoding and accessibility-floor requirements directly; the RFC 0006 selection/drawer/scenario-context conformance bundle this clause also invokes is not touched (no drawer/selection UX in the POC-REQ list), so that limb is omitted rather than rowed | POC-REQ-060, POC-REQ-061 |
| RFC9-1 | Map surface is a non-authoritative projection of the shared fact model | covered — POC's Orrery projects the same shared fact model that parity (020) enforces; intended/proposed/historical planes and RFC2/RFC6 vocabulary limbs not touched | POC-REQ-020 |
| RFC9-3 | Every rendered encoding traceable to an identified/declared artifact, reachable from the element | covered — No relationship/encoding beyond declared mappings; the surface-local "shared drawer" mechanism itself isn't built | POC-REQ-050, POC-REQ-052, POC-REQ-053 |
| RFC9-4 | Position bound to declared structure, never to a measurement | covered — POC's directory/declared-mapping hierarchy substitutes for the capability-district hierarchy but the anchoring principle is used | POC-REQ-050 |
| RFC9-5 | Declared mappings anchor position | covered — Positive anchoring limb | POC-REQ-050 |
| RFC9-5 | Inferred mappings never anchor geography | **Unknown** — POC scope excludes inferred mappings/edges outright, but no requirement exercises the prohibition (structural absence, never tested) | — |
| RFC9-5 | File paths are attributes, never identity; confined to unmapped district | covered — Matches unmapped-district treatment | POC-REQ-051 |
| RFC9-7 | Code mapping to no declared entity renders Unknown, never silently inferred, and lives in the unmapped district | covered — Direct match | POC-REQ-051 |
| RFC9-9 | Declared containment expressed positionally (nesting = declared membership) | covered — Directory nesting is POC's containment reading; declared-relatedness (edges) not built — POC has no declared-dependency concept | POC-REQ-050 |
| RFC9-14 | The projection is a deterministic function of declared facts at the observed revision | covered — Baseline/version-tuple incremental-regeneration machinery not built; POC recomputes fresh per revision | POC-REQ-004, POC-REQ-050 |
| RFC9-17 | Position changes only for a declared reason; an unchanged snapshot/preserving refactor must not move anything | covered — Reservation-policy/footprint-band limb not applicable — no lens bands in POC | POC-REQ-004, POC-REQ-050 |
| RFC9-24 | Unknown is a reserved, mandatory, distinct treatment — never silently omitted or shown as a positive state | covered — The richer sibling-state palette (Contradicted/Dismissed/Proposed/Unadopted/Editorial-draft) has no POC analog | POC-REQ-003, POC-REQ-013, POC-REQ-022, POC-REQ-032, POC-REQ-051 |
| RFC9-27 | Unknown never renders as zero, absent, or a positive/green reading | covered — Direct match, per-element and per-region | POC-REQ-003, POC-REQ-013, POC-REQ-051 |
| RFC9-27 | An aggregated/regional view carries its Unknown contribution rather than presenting only known members | covered — Aggregate-scale form of the same rule | POC-REQ-051 |
| RFC9-29 | Text/labels state only what identified artifacts state; an Unknown entity carries an explicit label, never omitted | covered — Secret-exclusion granularity-bound limb is moot — POC never indexes content at all (POC-REQ-002) | POC-REQ-003, POC-REQ-051 |
| RFC9-38 | The rendered scene is bound to and identifies the exact evaluation (git revision) it reflects, not an ambient state | covered — Single fixed-revision observation only; non-default-snapshot marker and time-travel-between-evaluations limbs not built | POC-REQ-001 |
| RFC9-42 | An Unknown/unresolved region renders as an aggregate in a reserved treatment, never fabricated detail | covered — Zoom/LOD-specific mechanics aren't established in the digest; the non-fabrication principle for unknown regions is | POC-REQ-051 |
| RFC9-43 | An aggregate discloses its membership count and reconciles to a known total, rather than silently absorbing unknowns | covered — Richer per-tier/freshness/chain-state composition disclosure has no POC analog (no tiers/freshness/chain-state vocabulary in POC) | POC-REQ-051 |
| RFC9-44 | Unmapped/undeclared code is aggregated and visible by default, with count and reasons, and never disappears | covered — Direct match; the adapter-minted stable-identity/selection-reference-survival limb (RFC1-5/RFC6-1/RFC6-9) not applicable — no drawer or persistent selection refs in POC | POC-REQ-051 |
| RFC9-46 | The spatial (Orrery) view and a non-spatial/tabular or machine view present equivalent facts for the same scope | covered — Declared-dependency positional-expression-state / backlog-partition-count additions not applicable — no such edges in POC | POC-REQ-020, POC-REQ-053 |
| RFC9-48 | Full keyboard navigation, textual epistemic labels, reduced motion honored, text contrast maintained | covered — Direct match | POC-REQ-061 |
| RFC9-48 | A tabular/non-3D equivalent serves as the screen-reader-accessible surface | covered — Every Orrery entity links to its exact-table route; parity keeps that route truthful | POC-REQ-053, POC-REQ-020 |

| RFC6-14 | Every served work item's effective governing-intent state remains explicit after one local expansion; sharing a value never merges subjects or pools entity/relationship records | covered — Amendment row (observation-local governedBy wire value); only POC-REQ-014's exact three-field value, not full RFC6-14 record/freshness limbs | POC-REQ-014 |
| RFC6-15 | A reference resolves only within its identified observation and evaluation; repeated identical inputs preserve effective facts and ordered membership | covered — Amendment row (observation-local governedBy wire value); existing evaluation/revision identity, not new query filters | POC-REQ-014 |
| RFC6-18 | Human facts and the expanded machine facts consume one logical work-item fact set, with distinct per-item claims and unchanged complete served set | covered — Amendment row (observation-local governedBy wire value); no evidence-drawer or new surface | POC-REQ-014 |
| RFC6-22 | Wire sharing preserves effective state, observation/evaluation, identities and rendered/served populations | covered — Amendment row (observation-local governedBy wire value); other excluded tuple limbs remain as recorded above | POC-REQ-014 |
| RFC6-23 | Expanded machine counts, reasons and per-item states equal human counts and states for the same evaluation and selection | covered — Amendment row (observation-local governedBy wire value); complete served and rendered denominators independently enumerated | POC-REQ-014 |
| RFC8-22 | An invalid local representation is an explicit bounded failure, never a silently skipped join, guessed value or smaller successful answer | covered — Amendment row (observation-local governedBy wire value); no governing-intent link or source-to-claim join is admitted | POC-REQ-014 |
| RFC8-23 | Equal Unknown values stay separate countable/filterable work-item claims; sharing neither clears Unknown nor invents warrants | covered — Amendment row (observation-local governedBy wire value); existing unresolved orphaned-work and other limbs remain Unknown | POC-REQ-014 |

Part A totals `[Observed, computed by the sweep in "Verifying this
table"]`: **154 consequence rows over 78 clauses — 112 covered,
42 Unknown.**

**Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
The signed RFC1-26 row whose consequence reads "Relations outside the closed
table don't exist; no prose-widening", covered by POC-REQ-052, is preserved
byte for byte from the matrix as signed, and it is counted above as the
matrix records it. On the owner's ruling of 2026-09-21 (P-75 Q3, recorded in
`.syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md`)
that mapping does not carry the closure consequence: POC-REQ-052 forbids
rendering a relationship the shared model does not hold, which is
anti-fabrication, not vocabulary closure. When this amendment was drafted the
POC emitted nine relationships over eight kinds. Seven of the kinds sit
outside RFC1-25's closed table. The eighth, `contains`, links a project to a
capability, a role pair the `contains` row does not assign. The ruling chose
a repair of disclosure, not removal: POC-REQ-055 requires each relationship
outside the table, by kind or by role pair, to carry a flag and a reason, in
the amendment row beneath the preserved one. A role pair is read through a
declared kind-to-class correspondence whose truth no requirement decides, so
that limb has its own Unknown amendment row. Closure itself — that no
relation outside the table is emitted at all — is observed by no requirement
and has its own Unknown amendment row. Read those two rows, not the preserved
one, for what this matrix covers. The preserved row is not corrected at its
site.

**Amendment disclosure — the RFC6-14 fold note.** The signed RFC6-14 row's
fold note says the tier, secondary-annotation, sibling-surface-state and
challenge-pending limbs were dropped because the POC carried no such
vocabulary. It is preserved as signed. Since this amendment, the tier limb
is covered by POC-REQ-060 for the machine answer's entities and
relationships, in the amendment row beneath it. The secondary-annotation
limb, and every epistemic value outside the entity and relationship lists,
have their own Unknown amendment rows, and the other limbs stay as the
signed row records them.

Every row marked "Amendment row (vocabulary and record shape)" was added by
the amendment that minted POC-REQ-055 and amended POC-REQ-060 in place.

**Amendment disclosure — observation-local governedBy wire value.** The
seven rows marked with that name observe only POC-REQ-014's lossless wire
representation. Existing P-100 rows reading each item's value now read its
effective value after the specified local expansion. Those rows and all
previous Unknown rows are preserved. In particular the broader RFC6-14
claim/other-value record, freshness and secondary-annotation limbs remain
Unknown; a shared three-field value is not the full POC-REQ-060 record shape.

## Part B1 — applicable clauses no requirement covers

`[Inferred]` The author judges these clauses applicable — the POC uses
what they govern — yet **no requirement's oracle observes any of their
consequences**. Every row renders **Unknown pending owner-reviewed
N/A**. The largest block is RFC5: the POC reuses Capability 1's
authenticated runtime spine, so authentication, exposure-mode, secret
screening for work-item text, and audit-record obligations are in play
without POC-specific requirements. The sign-off decision should either
accept these as disclosed Unknowns for a bounded non-release POC, or
direct requirement additions.

| Clause | Observable consequence (row label) | Disposition | Requirements |
|---|---|---|---|
| RFC1-3 | Observed-source repository is read-only; no writes emitted to Butlers | **Unknown** — Borderline: out-of-scope bars "writes to the observed project," matching RFC1-3's read-only default, but no POC-REQ's oracle tests absence of writes; consent-record specifics have no matching requirement | — |
| RFC1-6 | VCS objects (git revision) not reified as first-class nodes, enter only as identifier/evidence | **Unknown** — POC stamps facts with "exact git revision"; no requirement's oracle checks it isn't reified as a separate Commit node | — |
| RFC1-17 | Multi-capability code-element mapping counted identity-based, once per query subject | **Unknown** — Orrery's reconciling-counts req (051) doesn't explicitly test non-duplication under multi-capability mapping | — |
| RFC1-33 | No implementation work for RFC1's observable consequences may be scheduled without an approved OpenSpec requirement/scenario mapping or reviewed N/A | **Unknown** — Discharge is structural (this requirement set + the coverage matrix), not tested by any single POC-REQ's runtime oracle | — |
| RFC4-1 | Each external authority (git repo, Beads Dolt DB) reached through exactly one mediating reader | **Unknown** — POC's single shared fact-model design ("do not split surface truth stores") implies single-path mediation, but no digest requirement's oracle tests it | — |
| RFC5-1 | Every authenticated act (GET /api/poc, human page) binds to exactly one principal | **Unknown** — Scope's Context names an authenticated machine endpoint + human surfaces; no POC-REQ tests principal binding | — |
| RFC5-2 | Session (browser) and machine credential (GET /api/poc) stay distinct, non-transferable | **Unknown** — POC serves both client classes per Context; no POC-REQ addresses this | — |
| RFC5-3 | Requests classified machine-vs-browser by credential, not location, across both POC channels | **Unknown** — Underlies the human/machine parity requirement (020) but 020 tests content equality, not classification | — |
| RFC5-4 | (a) session requirement / session-identity-only / declared lifetime + revocation | **Unknown** — Reused Cap1 browser-surface discipline; folded 3 sub-bullets into one row, disclosed | — |
| RFC5-4 | (b) anti-CSRF proof + Host/DNS-rebinding validation on POC human surface | **Unknown** — Folded 2 sub-bullets, disclosed | — |
| RFC5-5 | GET /api/poc admits only via machine credential; no anonymous portfolio access | **Unknown** — Explicit in scope Context ("authenticated machine endpoint") | — |
| RFC5-6 | Machine-credential contract shape (identity/issuance/scoping/rotation/revocation/storage) as used by GET /api/poc's credential | **Unknown** — Reused Cap1 mechanism; all six sub-bullets folded, disclosed; no POC-REQ touches credential lifecycle | — |
| RFC5-7 | POC's reused bearer-token mechanism is one of the enumerated classes | **Unknown** — Borderline — this is a V0 design-choice clause, but POC runtime concretely uses class (a); no POC-REQ tests mechanism | — |
| RFC5-8 | POC mounts routes under tailnet exposure mode (per recent commits) and origin-checks against it | **Unknown** — Directly used — POC added tailnet-serve-prefix mounting and tailnet-host origin allowance; no POC-REQ covers exposure-mode discipline | — |
| RFC5-9 | Tailnet-mode transport/device-restriction/Syzygy-auth obligations for POC's mounted routes | **Unknown** — Same tailnet usage as RFC5-8; no POC-REQ covers per-mode obligations | — |
| RFC5-10 | Fresh POC install/daemon serves loopback only absent the exposure-mode act | **Unknown** — Reused Cap1 daemon default; no POC-REQ tests this | — |
| RFC5-12 | Observation-consent gates the one configured Butlers repository's observation | **Unknown** — Only the observation-consent limb touches POC (write/egress/execution-consent limbs don't apply — no writes, no external egress, no execution in scope); folded to this one limb, disclosed | — |
| RFC5-17 | No secret reproduced in any POC surface (Polaris/Trajectory/Orrery/machine endpoint) | **Unknown** — Trust-floor limb; work-item content (010-013) has no corresponding protection named (POC-REQ-002 partial for structure only) | — |
| RFC5-24 | Credentials (if any) Syzygy holds to reach the Dolt-hosted Beads DB as an external authority, stored under SEC-5, never visible to observed code | **Unknown** — Borderline — unclear whether Dolt access is authenticated/remote or purely local; kept applicable per conservative rule. Injection-prohibition limb NOT touched (POC has no execution profiles) | — |
| RFC5-25 | Every authenticated POC act (admission, denial) emits an attributable audit record | **Unknown** — Applies to GET /api/poc and human-page admission; no POC-REQ addresses audit trail | — |
| RFC5-26 | Credential/session revocation for POC's admitted requests takes effect at the next act, is renderable | **Unknown** — Request-admission layer (not the immutable content model); no POC-REQ covers revocation rendering | — |
| RFC6-28 | Every other clause's observable consequences must map to an OpenSpec requirement or a reviewed N/A before implementation | **Unknown** — Meta/process clause — discharged by this coverage-matrix sweep itself, not by any runtime POC-REQ oracle; flagged, never silently dropped | — |
| RFC7-1 | Polaris renders as a non-authoritative projection, never itself a fact source | **Unknown** — POC builds Polaris over the shared model, but no POC-REQ oracle observes downstream non-citation of it | — |
| RFC7-3 | No other component/citation resolves to a Polaris rendering as authority | **Unknown** — applicable since Polaris is built and Cap1 runtime is reused, but no POC-REQ oracle checks cross-component citation | — |
| RFC7-12 | Adjudicative source material (e.g. work-item text) rendered as owned text, never paraphrased in normative position | **Unknown** — applicable to any quoted work-item/structure fact; no POC-REQ tests verbatim-vs-paraphrase | — |
| RFC7-16 | Status renders minimal (label+tier+reason+freshness), no composite maturity number/metric walls | **Unknown** — reuses Cap1 epistemic vocabulary; no POC-REQ tests the no-composite-score prohibition | — |
| RFC8-21 | Trajectory walks the warrant→plan→materialization→work-item→run→PR→merge→reconciliation chain in both directions, each link with its declared basis, thinness rendered as thinness | **Unknown** — Amendment row, moved from Part B2: POC-REQ-014 renders the chain's first link, work item to warrant, as Unknown (RFC8-22), so the POC now renders part of the chain this clause governs; no requirement walks the chain or renders any other link | — |
| RFC9-15 | Adding an entity must not perturb existing declared entities' coordinates across re-observations | **Unknown** — Borderline: POC's digest doesn't say whether coordinates are stable across repeated observations of an evolving repo one way or the other | — |
| RFC9-26 | Channel/encoding meaning is declared once and stays consistent, never repurposed or unlegended | **Unknown** — POC-REQ-060's one-token-set requirement is adjacent, but no requirement tests a fail-closed unregistered-channel behavior or a formal registry | — |

Part B1 totals `[Observed, computed]`: **29 consequence rows over
28 clauses — all Unknown.**

## Part B2 — clauses believed not applicable (author's reading, non-binding)

`[Inferred]` The author applied CC-SPEC-8's applicability test — *does
the POC use the entity, behavior, authority boundary, state vocabulary,
or interface the clause governs?* — and believes each clause below
governs machinery the POC neither renders, stores, transitions,
queries, nor crosses. **A belief is not a reviewed N/A**; until the
owner records N/A judgments in `decisions/`, these clauses' consequences
also render Unknown pending owner-reviewed N/A. The per-clause readings
are listed so the owner can review or contest each one directly.

| Clause | Chiefly governs (author's reading, non-binding) |
|---|---|
| RFC1-1 | Project entity's single-governance-root invariant and zero/two-root handling; POC has one fixed configured repo, no Project/governance-root declaration modeled |
| RFC1-2 | Repository role vocabulary (governance-root vs observed-source) and declared-identity-not-URL/path scheme; POC's `--repo` path isn't modeled as a Repository entity with role/rename-stable identity |
| RFC1-4 | The two-authority split (declaration owns role/membership, VCS adapter owns content); POC has no project-declaration role/membership layer |
| RFC1-8 | The frozen-noun mapping (warrant/aligned/converged/genome-complete/genome); POC computes no alignment, convergence, or genome-completeness claims |
| RFC1-10 | Identifier opacity/no-reuse/no-renumbering for declared classes; POC renders no rename/renumbering behavior for any declared identifier |
| RFC1-11 | Split/merge successor-minting and retirement-as-rendered-event; POC has no split/merge of any entity |
| RFC1-12 | Judgment (dismissal/challenge) survival across identity change; POC computes no dismissals or challenges |
| RFC1-13 | Capability-anchored map geography per the deferred RFC 0009 map contract; Orrery's directory+declared-mapping projection uses no topology/map-district placement |
| RFC1-15 | Requirement/Scenario reference resolution to the OpenSpec artifact contract; POC's scope never renders Requirement/Scenario references |
| RFC1-18 | Claim/Gap two-level (durable + evaluation-instance) identity computation; POC computes no Claim/Gap entities, only discloses Unknowns in place |
| RFC1-18(a) | Declared-scope typed-reference construction for durable claim/gap derivation; no claims/gaps computed by POC |
| RFC1-18(b) | Contradiction two-level identity and membership-drift succession; POC computes no contradictions |
| RFC1-20 | The two non-interchangeable gap-exit paths (factual resolution vs. Decision dismissal); POC implements no gap-dismissal machinery |
| RFC1-21 | Contradiction rendering/adjudication routing and derived-gap-to-warrant confirmation; POC neither computes contradictions nor mints work warrants |
| RFC1-25(a) | The owner-minted `declared-dependency`/`placed_in` relations; POC renders neither (no dependency graph, no topology placement) |
| RFC1-25(b) | The four-sense dependency anti-conflation invariant; POC renders no dependency relation of any of the four senses |
| RFC1-25(c) | `placed_in` cardinality/no-primacy; POC uses no `placed_in` edges |
| RFC1-25(d) | Typed-relation-identity-vs-spelling and its anti-conflation fixtures; contingent on the dependency senses of (b)/(c), neither rendered by POC |
| RFC1-27 | Proposal entity and exclusivity-group rendering; POC renders no Proposals |
| RFC1-28 | The approved-but-unmaterialized plan-item lifecycle state; POC observes Butlers's Beads work items, not Syzygy's own plan items |
| RFC1-29 | Materialization-record one-way-door and orphaned-work-contradiction; POC never materializes proposals into work items |
| RFC1-30 | Execution-intent Proposal decomposition/approval inheritance; POC renders no Proposal decomposition |
| RFC1-32 | The no-Feature-entity rule and "feature" workflow vocabulary; POC's scope/requirements never introduce Feature/feature-request vocabulary |
| RFC2-4 | Degradation-only claims across repeated evaluations of an unchanged snapshot; POC computes facts once with no live re-evaluation loop to degrade |
| RFC2-5 | Two-level durable claim identity joining history/reconciliation chain across evaluations; POC persists no claim history |
| RFC2-7 | Deterministic-base-graph vs inference-overlay seam; POC builds no inference overlays (inferred mappings/edges explicitly out of scope) |
| RFC2-8 | Inference-overlay authority ceiling and conservative suspension via challenge; no overlays or challenges exist in POC |
| RFC2-9 | Currency-bound declaration mechanism gating evidence staleness; POC judges no evidence currency (test-evidence relationship stays Unknown) |
| RFC2-10 | Closed fresh/stale/broken/superseded freshness vocabulary across multiple evaluations; POC is one-shot with no persisted supersession history |
| RFC2-11 | Evidence-revision binding for report/CI artifacts; POC's test-evidence relationship is explicitly kept Unknown/unbuilt this slice |
| RFC2-12 | Challenge admissibility floor; no challenge mechanism exists in the POC |
| RFC2-13 | Challenge states, admission split, resolution, expiry, sweep policy; same — no challenge lifecycle in POC |
| RFC2-14 | Suspension-not-erasure for challenge-suspended claims; no suspension/challenge concept in POC |
| RFC2-15 | Contradiction and gap as formal entities with adjudication/dismissal exits tied to intent-revision tracking; POC's "evidence gaps" wording (POC-REQ-032) is an informal, unrelated usage |
| RFC2-16 | Aligned/Converged as formal claim predicates requiring gate-backed evaluation machinery; POC never computes or renders either |
| RFC2-17 | Word reservation of "reconciliation"/"unsatisfied"/"contradiction-raised" against scheduler-substrate terms; Trajectory only maps status vocabulary to columns, never these reserved words |
| RFC2-18 | The post-merge reconciliation chain state machine; not rendered anywhere in the POC |
| RFC2-19 | Reconciliation trigger and V0/V1 staging of that chain; the chain itself is unbuilt |
| RFC2-19(a) | Chain-state-local exemption for the reconciliation-pending Unknown; no such chain state exists to exempt |
| RFC2-21 | Composite "no gap at E" semantics requiring Aligned/challenge/reconciled tracking; none of that machinery exists in POC |
| RFC2-22 | Fixed-point idempotence across repeated evaluations of an unchanged no-gap snapshot; POC is one-shot, not a repeated-evaluation loop |
| RFC2-26 | The RFC-vs-OpenSpec implementation-scheduling authority boundary and coverage-matrix obligation — a meta/process rule, not a product entity/state/interface in the CC-SPEC-1 scope statement |
| RFC3-1 | project.yaml file identity and YAML-dialect conformance — POC never parses project.yaml |
| RFC3-2 | Manifest-field write-authority classes — POC's model isn't built from governed manifest fields |
| RFC3-3 | Manifest fields authorizing direct writes — POC has no configurable manifest fields |
| RFC3-4 | project.yaml location-as-designation — POC doesn't designate Butlers as a governance root |
| RFC3-5 | project.yaml closed top-level field set — not used |
| RFC3-6 | repositories[] consent-reference resolution — POC's configured project isn't a repositories[] entry |
| RFC3-7 | Consent records in decisions/ — POC observes per the 2026-08-29 owner direction, not via consent records |
| RFC3-8 | Consent revocation effect — no consent record exists to revoke |
| RFC3-9 | Drafting/repair of project.yaml — not used |
| RFC3-10 | Workspace manifest classification — POC has no workspace manifest |
| RFC3-11 | Workspace manifest closed field set — not used |
| RFC3-12 | Workspace manifest never authoritative — not used |
| RFC3-13 | Workspace manifest project-identity references — not used |
| RFC3-14 | Cross-project relation rendering — POC is bounded to exactly one project |
| RFC3-15 | Five constitutional governance/ categories — POC renders/writes no governance-home categories |
| RFC3-15(a) | Why records/ exists — POC mints no kernel records |
| RFC3-16 | Self-declared vs effective lifecycle status — POC renders no adoption-status content |
| RFC3-16(a) | Effective-owner-act gate — valid state (1) and state (2) acts take effect with exact state disclosed; missing or invalid acts fail closed; POC checks no artifact act at runtime |
| RFC3-16(b) | What an owner act binds — not exercised |
| RFC3-16(c) | Two effective provenance states, owner-adopted bootstrap/uncorrelated and Syzygy-verified; correlation upgrades state without changing earlier owner-trusted effects — not exercised |
| RFC3-17 | declarations/ category artifacts — POC reads/writes none |
| RFC3-17(a) | Challenge submission/admission record homes — POC has no challenge mechanism |
| RFC3-18 | intent/, work/, map/ namespace class — POC's "intent entities" are shared-model vocabulary, not these namespaces |
| RFC3-19 | .syzygy/work/** execution-intent authority — not used |
| RFC3-20 | .syzygy/cache/ rebuildable-projection invariant — POC's state dir is its own storage, not this home |
| RFC3-21 | .syzygy/local/ personal presentation state — not used |
| RFC3-22 | Plane schema-version stamps — POC has no schema-versioned plane |
| RFC3-23 | Identity-preserving migration — POC performs no migrations |
| RFC3-24 | Migration as explicit reviewed act — not used |
| RFC3-25 | Forward/backward version-mismatch behavior — not used |
| RFC3-26 | openspec/** outside migration authority — POC doesn't migrate openspec/** |
| RFC3-27 | What Syzygy reads from openspec/** — spec never cites openspec/** content (verified by grep) |
| RFC3-28 | Spec anchors into openspec/** — not used |
| RFC3-29 | One .syzygy/ plane per repository — POC creates no plane |
| RFC3-30 | Dual governance-root/observed-source roles — POC's single repo has no dual role |
| RFC3-31 | Nesting/subproject composition — scope excludes any project beyond the one configured repository |
| RFC3-32 | Parent-project limits over child internals — no parent/child projects exist |
| RFC3-33 | RFC3's own binding-phase rule — contingent on RFC3 consequences being implemented; none are |
| RFC4-7 | Per-project versioned adapter registry + RFC3-16(a) admission gating; POC has one hardcoded observer, no registry to admit against |
| RFC4-8 | Version-skew handling across adapter/contract versions; POC's single immutable implementation has no version history to skew |
| RFC4-9 | Implementation substitution as a registry event; POC substitutes nothing — fixed git/Dolt readers |
| RFC4-10 | The OpenSpec adapter's requirement/scenario reading and spec-anchor resolution; POC's two declared sources are git and Beads Dolt only |
| RFC4-13 | The four-route `gate-backed` provenance predicate for test/CI evidence; POC explicitly leaves the test-evidence relationship Unknown this slice |
| RFC4-13(a) | The external-confirmation capture artifact for route 2 gate evidence; same test/CI machinery POC doesn't render |
| RFC4-13(b) | The governed-checker route 4 for gate certification; no gate/certification rendering exists in POC |
| RFC4-14 | Runtime dataset/trace/incident ingestion; POC explicitly leaves the live-runtime relationship Unknown this slice |
| RFC4-16 | Capture-before-horizon duty protecting durable Syzygy-owned records from scheduler-history loss; POC holds no durable Execution/observation records, reading the live Dolt DB directly |
| RFC4-17 | The warrant-pointer write at materialization into the substrate's provenance field; POC performs no writes to the observed project |
| RFC4-18 | Execution Record's classification as an Evidence kind; POC builds no Execution Records — the work-item/test-evidence relationship stays Unknown |
| RFC4-19 | The minimum durable run envelope's fields; no Execution Records exist in POC |
| RFC4-20 | Enrichment-optionality and derivation-collision handling for run records; no run records exist to collide |
| RFC4-21 | Model/timing/token/cost semantics on run records; no cost/token/run accounting in POC scope |
| RFC4-22 | The change-accounting chain's join bases (work item↔branch↔commit↔PR↔merge↔gate); Trajectory reads raw work items only, no branch/commit/PR correlation |
| RFC4-23 | Worker-liveness rendering from progress signals and a staleness bound carrying an effective state-(1) or state-(2) owner act, never the act itself as liveness evidence; Trajectory renders item status/instants, not live worker liveness — live-runtime relationship stays Unknown |
| RFC4-24 | The reduced-fidelity granularity/cause labeling schema (RFC2-25 tiers); POC renders binary Observed/Unknown, not tiered reduced-fidelity facts |
| RFC4-25 | Per-observer degradation-state registry declarations and cross-evaluation staleness rendering; no registry, no multi-evaluation staleness in the single-snapshot POC |
| RFC4-28 | The derivation-first invariant's specific derivable-fact list (branch/commit/PR joins, lead time, run boundaries); keyed to change-accounting infrastructure the raw work-item kanban doesn't build |
| RFC4-29 | The named future enrichment roadmap for run/dispatch/gate/token records; no run records exist in POC to enrich |
| RFC4-30 | The OpenSpec implementation-scheduling authority boundary for the RFC4 package itself — a process rule on how Syzygy schedules implementation work, not a runtime behavior/state the POC capability renders |
| RFC5-11 | Revocation-triggered re-evaluation reconciliation with RFC2-4; POC's model is a fixed, one-shot immutable Butlers graph with no live re-evaluation cycle |
| RFC5-13 | Consent-revocation's prospective rendering across evaluations over time; same immutable-single-snapshot reasoning — no ongoing evaluation to carry a withdrawal label into |
| RFC5-14 | Egress consent naming a provider + content class for content leaving to model providers; POC has no external-provider egress, only local/tailnet rendering to the owner |
| RFC5-15 | The egress choke point for network transmission to providers; same — no such transmission exists in POC scope |
| RFC5-18 | The five-part gate for launching observed-project code; POC never executes Butlers code, only observes it |
| RFC5-19 | Trust distinction / evidence-tier capping for externally-produced execution artifacts; POC explicitly leaves the test-run/live-runtime relationship Unknown rather than rendering any tier |
| RFC5-20 | Execution-profile contents (isolation class, fs/credential/network scope, resource limits); no execution profile exists for the POC |
| RFC5-21 | Isolation mechanism classes and the run-violation floor; no execution occurs |
| RFC5-22 | Destructive-operation gates for effects outlasting a sandboxed run; POC performs no writes and no execution |
| RFC5-23 | Execution-profile versioning/approval lifecycle; no execution profile exists |
| RFC5-27 | The RFC5-to-OpenSpec scheduling/binding-phase meta-rule; a process discipline for spec authoring itself, not a runtime entity/behavior/interface the POC capability renders, stores, transitions, queries, or crosses |
| RFC6-1 | RFC1-qualified selection-reference identity scheme (entity kind + durable identity + evaluation/scenario qualifiers); POC builds no cross-surface selection/identity system |
| RFC6-2 | Universal selectability of every V0-core/extension-profile entity via kernel reference; POC has a fixed non-selectable entity pair, no selection interface |
| RFC6-3 | Live cross-surface selection sync with stale-adapter skew disclosure; POC has no navigable selection system or adapters to go stale |
| RFC6-4 | Evaluation-qualifier defaulting for an unqualified selection; POC has no selection-with-evaluation-qualifier concept |
| RFC6-5 | Nine-value typed selection-resolution outcome set for navigable references; POC's failure-Unknowns are simple event-responses, not this vocabulary |
| RFC6-6 | Non-conflation of navigation outcomes with Unknown reasons; depends on RFC6-5's outcome set, absent here |
| RFC6-7 | Determinism of selection-resolution outcome+fact set specifically; POC's per-revision determinism is a distinct, non-selection concern |
| RFC6-8 | URL-identity scheme (project+selection+evaluation+scenario+presentation hints); POC has one project, one revision, no URL-pinning system |
| RFC6-9 | Rename-stability of URLs across capability renames over time; POC observes one fixed revision per run, no multi-revision comparison possible |
| RFC6-10 | Evaluation-pinned vs unpinned URL temporalities; POC has no multi-evaluation URL system |
| RFC6-11 | Retired/merged-identity rendering and redirect prohibition; POC has no retirement/succession lifecycle |
| RFC6-12 | URL surface-independence (same URL opens in any surface); POC has no shared URL-selection system across surfaces |
| RFC6-21 | Minimal-by-default disclosure depth vs. endpoint full-set serving; POC's no-script fallback is a different (robustness) mechanism, no disclosure-depth toggle in scope |
| RFC6-24 | Explicit Base/Proposed/Historical scenario context; POC renders exactly one fixed observed revision, no proposal overlay or historical access |
| RFC6-25 | Context traveling with selection across surfaces/URLs/queries; depends on RFC6-24's construct, absent here |
| RFC6-26 | Per-fact "unconsented-source-or-provider" Unknown rendering; POC's one repo is pre-authorized as a whole, no per-fact consent-state surface |
| RFC6-27 | SEC-5 secret-detection exclusion rendered with a count; POC's "never indexed contents" is a non-collection design choice, not a detect-and-exclude policy |
| RFC7-4 | Non-authority holding across multiple narrative states (draft/adopted-after-review/historical); POC's rendered narrative has only one state |
| RFC7-7 | Versioned/attributed git-write discipline for authored, human-edited narrative prose; POC's narrative is generated, not edited content |
| RFC7-8 | Storage/authority classification of a persisted authored narrative artifact; POC has no such persisted artifact |
| RFC7-11(a) | Drift detection when a resolved anchor's target changed since authorship, across re-evaluations; POC is fixed to one exact git revision |
| RFC7-14 | Verbatim rendering of `openspec/**` requirement/scenario text plus proposed-scenario-delta adjacency; POC narrates Butlers structure/work items, not openspec text, and has no proposed-scenario reading |
| RFC7-15 | Capability-catalog honesty (declared capability identities, drafted-capability unadopted state); POC projects Butlers work items/structure, not a Syzygy capability catalog |
| RFC7-17 | Capability deep-dive band composition (argument/contract/reality bands); POC's narrative isn't organized into these authored bands |
| RFC7-20 | Generated editorial-draft prose and its consent-gated non-citable state; POC performs no narrative generation/inference (out of scope: "inferred mappings or edges") |
| RFC7-21 | Human adoption act turning a draft into curated narrative; no draft/adoption workflow exists in POC |
| RFC7-22 | Rejected-draft handling on Trajectory's drafting queue; no drafting queue exists in POC |
| RFC7-23 | Authoring acts and gates (edit prose/structure, adopt draft, adopt intent artifacts); POC narrative isn't manually edited through governed acts |
| RFC7-24 | The Trajectory/Polaris seam for a drafting queue and adoption experience; POC's Trajectory is a kanban-with-time view of work items, not a drafting queue |
| RFC7-25 | Materiality classification and fresh-reader review of narrative edits; no editable/reviewable narrative-change workflow in POC |
| RFC7-26 | Base-vs-Proposed reading-mode toggle over kernel scenario contexts; POC has no proposal/scenario machinery |
| RFC7-27 | Rendering of competing, non-mergeable proposals; no proposals concept in POC |
| RFC7-28 | Hand-composed curated diagrams; POC's narrative is fact-generated, not manually composed |
| RFC7-30 | The cold-open comprehension-walkthrough acceptance test tied to release milestones; POC is explicitly non-release |
| RFC7-31 | Verdict-recording discipline (verdict-unlawful) for the comprehension test; same non-release/no-verdict-process reasoning |
| RFC7-32 | Scheduling comprehension-test runs at material changes/release milestones; no release-milestone process in POC |
| RFC7-35 | Multi-project workspace-manifest navigation; POC is scoped to exactly one configured Butlers repository |
| RFC7-36 | Owner-local portfolio narrative across a multi-project workspace; same single-project exclusion |
| RFC7-37 | Parent/child subproject relation rendering; no subproject relations exist in a single fixed-repo POC |
| RFC7-38 | The RFC-to-OpenSpec coverage-matrix phase-boundary rule for scheduling implementation; governs the spec-authoring process, not a runtime entity the capability renders or crosses |
| RFC7-39 | The fixed `.syzygy/intent/OVERVIEW.md` human entry point for a Syzygy-governed project; POC's Polaris entry is an app route projecting the observed Butlers repository, not a file in Syzygy's own governed intent tree |
| RFC7-40 | Repository-front-door discoverability (README-links-to-entry finding); not part of the POC's 21 requirements or its named honest gaps |
| RFC8-1 | Multi-plane (desired/execution/observed) rendering with plane-impersonation guard; POC's Trajectory renders only execution-plane work items, no intent/merge/verification/reconciliation planes |
| RFC8-3 | Rebuildable-projection-over-kernel/typed-adapter mutation-sync discipline; POC offers no mutations and isn't built atop Syzygy's kernel/adapter machinery for the external Butlers project |
| RFC8-4 | RFC1-5 kernel-entity-projection ontology (Proposal/materialization/execution-run/review/verification/reconciliation/warrant bindings); POC observes Beads work items directly, not as a kernel-grounded ontology, and builds none of the other entities |
| RFC8-5 | Non-reification of idea/milestone/no-Feature/contradiction/dismissal; POC renders none of these concepts |
| RFC8-6 | Compaction-record schema and retention-fact discipline; POC performs no compaction |
| RFC8-7 | Pre-materialization Proposal lifecycle (drafted→…→materialized) and post-materialization scheduler-state read discipline; POC renders raw Beads status only, no Proposal lifecycle |
| RFC8-8 | "What remains?" three-plane enumeration, orphaned-work Contradiction, exclusivity/candidate-futures; POC has no approved-intent/materialization enumeration or exclusivity groups |
| RFC8-9 | SDR-18 Trajectory-vs-Polaris drafting-queue ownership boundary; POC's Polaris/Trajectory split has no drafting-queue concept |
| RFC8-10 | Materialization-record one-way-door join (proposal identity, work-item-set, pinned revision); POC builds no materialization records — the relationship is left Unknown by design |
| RFC8-11 | Divergence-rendering for substrate-side warrant-pointer edits; no warrant pointers exist in POC's Trajectory |
| RFC8-13 | Per-value derivation logic (dispatch-eligibility queries, PR-lane facts, VCS merge facts, liveness); POC's kanban columns derive from Beads' own status field only |
| RFC8-14 | Raw-status-visibility/`state-undetermined` resolution routed through the RFC3-16(a)-authorized governance-plane derivation mapping; POC's status mapping isn't a `.syzygy/governance/**` authorization-bearing artifact |
| RFC8-16 | `active`/`stale-or-dead` liveness classification against a staleness bound with an effective state-(1) or state-(2) owner act and fail-closed missing/invalid behavior; POC's time visualization displays recorded instants, not a claim-liveness state machine |
| RFC8-17 | Closed blocked-cause taxonomy; POC's kanban has no `blocked`-cause rendering |
| RFC8-18 | Independent cost measures, no composite "effort" score; POC scope excludes cost accounting |
| RFC8-19 | Absent-cost-means-Unknown-never-zero aggregation; same cost-machinery exclusion as RFC8-18 |
| RFC8-20 | Execution-Record-sourced telemetry staging; POC has no Execution Records or telemetry |
| RFC8-25 | Inherited-mutation sub-entry accounting and warrant-coverage test; no diff/mutation attribution in POC |
| RFC8-26 | Compaction preservation set (what survives compaction); no compaction machinery in POC |
| RFC8-27 | Expired-detail tier rendering after compaction/retention events; no compaction/retention machinery in POC |
| RFC8-28 | Six-value RFC2-18 reconciliation chain-state field rendered beside normalized state; POC renders no such field — the relationship stays wholesale Unknown |
| RFC8-29 | V0 per-item "reconciliation evidence absent/Unknown" rendering; POC doesn't attempt per-item reconciliation-evidence checks at all |
| RFC8-32 | The RFC→OpenSpec phase-boundary/coverage-matrix authoring obligation; a process rule governing this sweep itself, not a capability-rendered entity or behavior |
| RFC9-2 | This RFC's own semantics-vs-rendering-technology scope boundary — a self-referential meta-rule, not an entity/behavior POC renders |
| RFC9-6 | Capability rename/split/merge/retirement identity-continuity and RFC6-11 retired-selection resolution; POC has no capability lifecycle |
| RFC9-8 | Multi-project portfolio arrangement; POC is bounded to one Butlers repository |
| RFC9-8(a) | Workspace-scope portfolio layout-version governance machinery; no portfolio in POC |
| RFC9-9(a) | Residual-adjacency legend line built on incremental append/baseline-delta and declared-relatedness edges, absent in POC |
| RFC9-9(b) | The honored/not-honored channel for declared-dependency edges; no such edges in POC |
| RFC9-10 | Analytical-plane projections bound to a declared metric/relation; POC has no lens/analytical-plane architecture |
| RFC9-11 | Analytical-plane-vs-home masquerade boundary; no analytical planes in POC |
| RFC9-12 | Lens re-skinning within home geography; POC has no lenses |
| RFC9-13 | Personal presentation state (camera/filters/bookmarks/lens selections) in `.syzygy/local/`; POC has none of this |
| RFC9-13(a) | Layout-version stamping of saved coordinate-bearing personal state; depends on RFC9-13/RFC9-16(d), neither present |
| RFC9-14(a) | Layout-baseline-as-governed-artifact / incremental-regeneration input; POC recomputes fresh per revision with no baseline/version registry |
| RFC9-15(b) | Fixed-locations/manual-refresh regime and refresh-clearable backlog; rests on declared-relatedness edges and owner-gated relayout |
| RFC9-16 | The closed relocation-trigger set for capability/topology lifecycle events; POC's entities have no such lifecycle |
| RFC9-16(d) | Owner-gated layout-version-change act; no layout versioning in POC |
| RFC9-18 | Layout-version governed artifacts under `.syzygy/map/**` with RFC3-16(a) provenance; POC's code lives outside the governed plane |
| RFC9-19 | Multi-capability shared-component placement mechanisms; no multi-capability sharing concept in POC |
| RFC9-20 | Contradiction handling for over-declared/co-unsatisfiable placements; no such conflicts exist in POC's model |
| RFC9-21 | Double-counting prevention for a component shared across multiple districts; no shared-identity scenario in POC |
| RFC9-22 | Multi-repository overlay and unconsented-repository rendering; POC observes exactly one configured repository |
| RFC9-23 | Authority/trust-boundary and secret-exclusion-zone overlay; POC never indexes content at all |
| RFC9-25 | Lens-invariant reserved-channel (freshness/saturation) reservation; no lens architecture or staleness concept in POC |
| RFC9-28 | Per-lens height-metric semantics; no lens system in POC |
| RFC9-30 | Inferred-contribution rendering, challenge-suspension, consent-gated inference degradation; POC never computes inferred data |
| RFC9-31 | The lens contract (channel binding, one-active-lens rule); POC has no lenses |
| RFC9-32 | V0 lens/overlay set (Architecture, Verification, work/construction, freshness); lens-specific, not built |
| RFC9-33 | Post-V0 lens roadmap (Change/churn, Risk, Runtime); lens-specific |
| RFC9-34 | Lens non-fabrication/non-narrowing rule; lens-specific (general principle already covered under RFC9-27/42) |
| RFC9-35 | Lens-addition contract-act obligations; no lens catalog in POC |
| RFC9-36 | City/Factory scene-profile architecture; POC has one deterministic view, not multiple named profiles |
| RFC9-37 | Factory's capture-window/live-motion honesty obligations; Factory profile not built |
| RFC9-39 | Approved-intent (desired-state) scene comparison; POC has no declared-intent plane |
| RFC9-40 | Proposed-scene handling and multi-proposal comparison; no proposal concept in POC |
| RFC9-41 | Historical/superseded-evaluation rendering and drawer access; POC is a single fixed-revision snapshot |
| RFC9-45 | The comprehension-walkthrough release gate and its governance-record/decision/policy artifacts; POC is explicitly non-release |
| RFC9-47 | The release-gate checklist itself (Syzygy's own release process); POC is explicitly non-release |
| RFC9-47(a) | Self-maintenance of the release-gate registry; release-process meta-clause, non-release POC |
| RFC9-49 | Declared performance-budget degradation-by-scope-narrowing; no performance-budget behavior declared in POC |
| RFC9-50 | Ambient-motion prohibition for an interactive/animated scene; POC's scope establishes no motion/transition behavior |
| RFC9-51 | Illumination/highlight as non-truth-bearing interaction state; no highlighting feature established in POC scope |
| RFC9-52 | The RFC-prose-to-OpenSpec authority boundary and coverage-matrix obligation; this non-binding sweep doesn't cite RFC9 as binding authority for the POC spec |

Part B2 total `[Observed, computed]`: **218 clauses.**

## Verifying this table

- Denominator: re-run the two counting methods named above; both must
  return 324 for RFC1–9, and 78 + 28 + 218 = 324.
- Mapped set: `python3 scripts/build_three_surface_poc_spec_dependencies.py
  --check` — Part A's clause column must equal the generated
  `contracts[]` union (78 identifiers).
- Totals: count rows and dispositions in this file's tables (e.g.
  Python over the `| RFC` rows); the printed totals must match the
  count — they were computed that way, not transcribed.
