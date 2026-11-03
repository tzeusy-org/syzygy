# Specification readability reconciliation — 2026-10-02

> **Technical record, never authority.** It performs no owner act, adopts
> nothing and grants no permission. Every fact it states is owned by the act
> or sign-off record it names; where they disagree, the record named wins.
> Bead `syzygy-73e.5.6`, terminal child of `syzygy-73e.5`. Base: `main` at
> `bd47409` (the PWB readability sign-off commit). Re-derive with
> `python3 scripts/check_spec_reconciliation.py --check`.
>
> **Re-derived 2026-10-02** after the Polaris understanding
> dependency-union successor act; see §9. Sentences below that the
> re-derivation changed are marked where they stand.
>
> **Re-derived again 2026-10-03** after the PWB tree-framing sign-off
> v1.0; see §10. Sentences that re-derivation changed are marked the same
> way.

**All five readability successors ended in a terminal owner outcome, each
still binds the exact bytes on disk, and as of 2026-10-02 the four
requirement populations re-derive identically by two independent methods:
114 requirements and 297 scenarios.** [Observed] [superseded 2026-10-03: 114 requirements and 304
scenarios, PWB-REQ-014 having gained seven, §10; the current figures are
[`census.json`](census.json), regenerated at every addition install, §2] Two stale generated or pinned digests sit inside
bound bytes and need their own owner acts; this pass names them and repairs
neither.

## 1. Terminal outcomes

Every child has an adopted outcome; none was declined, and no merely merged
candidate is counted.

| Child | Subject | Outcome | Record |
|---|---|---|---|
| `syzygy-73e.5.1` | Capability 1 | Digest act, 2026-09-29 | `.syzygy/governance/decisions/CAPABILITY-1-READABILITY-SUCCESSOR-ACT.md` |
| `syzygy-73e.5.2` | Three-Surface POC | Digest act, 2026-09-29 | `.syzygy/governance/decisions/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md` |
| `syzygy-73e.5.3` | Polaris generator base | Digest act, 2026-09-29 | `.syzygy/governance/decisions/POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR-ACT.md` |
| `syzygy-73e.5.4` | Polaris understanding amendment | Digest act, 2026-09-29; for `GOVERNING-DEPENDENCIES.md`, the later successor act of 2026-10-02 (§9) | `.syzygy/governance/decisions/POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-ACT.md`; `.syzygy/governance/decisions/POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-ACT.md` |
| `syzygy-73e.5.5` | PWB | Version-tagged sign-off v1.0, 2026-10-02; for five files, the later tree-framing sign-off v1.0 of 2026-10-03 (§10) | `.syzygy/governance/decisions/PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md`; `.syzygy/governance/decisions/PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md` |

- **How each binding was checked** [Observed, R1 and R2]:
  - For the four digest acts, the phrase argument in each record equals the
    sha256 of its package manifest, the same phrase is in
    `.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`, the record's
    successor column equals the manifest rows, and every signed subject
    hashes to its row.
  - For PWB, the record names package, version and tag, the aggregate act
    record carries its sign-off block exactly once, and the 11 manifest rows
    equal the subjects on disk. Checked once by hand as well: the same 11
    rows equal the bytes at the annotated tag `pwb-readability-successor-v1.0`,
    whose commit `bd47409` is an ancestor of `main`.
  - As of 2026-10-02, 55 signed subjects in all (7 + 6 + 23 + 8 + 11).
- **How the owner gave the four digest acts** [Observed]: by selecting an
  option, not by typing the phrase. The act records' "by writing exactly"
  is template wording;
  `.syzygy/governance/decisions/OWNER-INSTRUCTIONS-2026-09-29-30-READABILITY-AND-REGISTRY.md`
  is the account to read beside them. The PWB sign-off is a selection by
  design, under
  `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`.

## 2. Effective composition

Each change is read from the act chain, never from a file's head.

| Change directory | Effective bytes bound by | Read with | Not bound |
|---|---|---|---|
| `openspec/changes/project-registration-and-honest-shape-visibility/` | The Capability 1 readability act (all 7 files) | — | `tasks.md` |
| `openspec/changes/three-surface-poc-experience/` | The POC readability act (all 6 files) | — | `tasks.md` |
| `openspec/changes/polaris-project-wide-butlers-model/` | The PWB readability sign-off v1.0 (all 11 behavioral files), the last link of the PWB successor chain [superseded 2026-10-03: the tree-framing sign-off v1.0 is now the last link and binds five of the 11, §10] | — | `tasks.md`, `contract-coverage-parts/` |
| `openspec/changes/polaris-manifesto-generation/` | The base readability act (23 files, two of them under `docs/design/`) | The understanding overlay | none of its tracked files |
| `openspec/changes/polaris-manifesto-understanding-amendment/` | The understanding readability act (8 files), whose `spec.md` row is the tree-form REQ-004 bytes adopted 2026-09-28 | The base change | none of its tracked files |

- **The Polaris composition** [Observed]: the base declares 29 requirements
  and 154 scenarios; the overlay MODIFIES seven (002, 004, 006, 009, 012,
  014, 019), replacing their 33 base scenarios with 54, and ADDS 030 and 031
  with 7. As of 2026-10-02 the effective composition is 31 requirements and
  182 scenarios; the current figure is `census.json`'s (next item).
- **Current figures** [Observed: the checker's own `--regenerate`]: a later
  Polaris addition, signed by a version-tagged sign-off or adopted by a
  declared adoption record, joins the composition when it is installed, and
  the install regenerates [`census.json`](census.json) and
  `PROJECT-STATUS.md`'s figure. The figures on this page are each as of the
  date they carry; `census.json` is the current population, and
  `python3 scripts/check_spec_reconciliation.py --check` keeps it in step.
- **The PWB chain** is the order `PWB_SUCCESSOR_CHAIN` in
  `scripts/check_governance.py` derives from the acts; this pass reads its
  last link only and changes nothing in it. [superseded 2026-10-03: the
  checker now follows one later version-tagged link, the tree-framing
  sign-off, from the readability row, §10]

## 3. Populations, two methods and a third

The populations as of 2026-10-02, with the dated changes since marked in
their cells; the current populations are [`census.json`](census.json) (§2).

| Family | Requirements | Scenarios | Identities |
|---|---|---|---|
| CAP1-REQ | 42 | 47 [57 since 2026-11-04, the consent overlay composed, §13] | 001–006, 010–016, 020–023, 030–038, 040–046, 050–053, 060–064 |
| POC-REQ | 24 | 24 | 001–004, 010–013, 020–022, 030–032, 040–043, 050–053, 060–061 |
| PWB-REQ | 17 | 44 [51 since 2026-10-03, §10] | 001–007, 010–016, 020–022 |
| REQ-polaris-generation (effective) | 31 [as of 2026-10-02] | 182 [as of 2026-10-02] | 001–031 [as of 2026-10-02] |
| **Total** | **114** [as of 2026-10-02] | **297** [as of 2026-10-02; 304 as of 2026-10-03, §10] | |

- **Method A** parses headings with regular expressions; **method B** is a
  line state machine with no regular expressions. For Polaris, A composes
  base and overlay by each block's `ID:` line and B by normalized requirement
  name, attaching IDs only at the end. Both agree member for member,
  including every requirement name and scenario title, and every identity is
  unique [Observed, R3].
- **The census is frozen twice:** as hard-coded per-requirement literals in
  the checker, and in full (names and scenario titles) in
  [`census.json`](census.json), which `--check` regenerates byte for byte.
- **Third method** [Observed, run once at `bd47409`, not in the battery]:
  OpenSpec 1.9.0 `openspec show <change> --json --deltas-only` reports CAP1
  42/47, PWB 17/44, base 29 ADDED/154 and overlay 7 MODIFIED + 2 ADDED/61.
  For the POC it refuses, because the restyled proposal has no
  `What Changes` section; on a scratch copy with a stub proposal it reports
  24/24. `python3 scripts/count_polaris_effective_scenarios.py --check`, a
  separately written name-keyed composer, also reports 31/182.
  `openspec validate --strict --all` passes all tracked changes.
- **Remainders:** none. Every requirement and scenario heading in the five
  `spec.md` files is in the census; the identity gaps above are the
  specifications' own deliberate numbering.

## 4. Routes and generated rows

The checker verifies every default spec route and generated row; three
default-path pages were stale and are corrected here.

**Checked** [Observed, R4 and R5]:

- **Generated dependencies:** the CAP1, POC and PWB `GOVERNING-DEPENDENCIES.md`
  each name the current `spec.md` digest and the census's requirement count.
- **Coverage:** the CAP1 and PWB `CAPABILITY-COVERAGE.md` tables cover their
  whole population.
- **Every identifier mention resolves:** as of 2026-10-02, 1,917 mentions (the
  current count is `--check`'s R4 line) in full and
  continuation forms (`PWB-REQ-005/022`, `001–004`, `…`, `and`) over 63
  files — every tracked file of the five change directories plus
  `PROJECT-STATUS.md`, `openspec/README.md`, `README.md` and `AGENTS.md`.
  Bare numbers with no prefix (`030; 001 source integrity` in the
  understanding `COVERAGE.md`) are outside this pattern and were not swept.
- **Routes:** `openspec/README.md` has exactly one row per tracked change
  directory, naming its terminal record; `PROJECT-STATUS.md` cites all five
  terminal records and states the Polaris composition the census computes.

**Corrected here, all in unbound homes** (each file's digest is cited by no
act manifest):

| Page | What was stale | Now |
|---|---|---|
| `openspec/README.md` | "The three changes": no row for either Polaris generator change; PWB "amended twice since"; "Two of the three proposals open with a … binds nothing banner" | Five rows, each naming its first act and latest binding outcome; the banner paragraph names the three `spec.md` files that still carry one |
| `README.md` | "Adopted for Capability 1 — the one change …; only its coverage digest was superseded" | Five changes adopted or signed off, routed to `openspec/README.md` and `PROJECT-STATUS.md` |
| `PROJECT-STATUS.md` | The OpenSpec row said the 2026-09-01 transaction superseded "only" `CONTRACT-COVERAGE.md`, "leaving the other six adopted digests"; two Polaris sentences said the candidate banners remained | The row names the 2026-09-29 successor's proposal and design digests and the four other changes; the Polaris sentences say only `spec.md` keeps its banner |

`openspec/README.md` was approved by the owner on 2026-09-08 (P-57); this
pass changes its table and one paragraph for currency under the 2026-09-28
tree-style direction's route-page arm, and the review of this pass covers it.
Its old digest sits in the governing list of
`docs/evidence/polaris-generator-approval-offer-2026-09-12.json`, a review
baseline whose `polaris_generator_approval.py --check` was already failing
off-battery on baseline drift before this pass.

## 5. Stale items left, and why

| Item | Where | Why it stays | Tracked |
|---|---|---|---|
| The observer registry entry and the secret-classification policy pin `governingBehaviorContract.version` to the PWB `spec.md` row of the 2026-09-05 truth-and-readiness act, and `signedBy` still calls that act pending | `.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json`; `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` | Each file is an effect act's argument; an edit changes the argument, so the repair is a superseding registry act and policy act. Re-adopting the registry entry once already made the daemon's read gate fail closed (see the owner-instructions record above), so that packet must carry the gate consequence | `syzygy-jloi` (filed by this pass; no earlier bead tracked it — sweep of all 365 beads for the digest prefix, `governingBehaviorContract` and pin wording). Checker R6 |
| The understanding amendment's generated `GOVERNING-DEPENDENCIES.md` lacks `CC-REV-8`, which the tree-form amendment added to REQ-004's warrants | `openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md` | A signed subject of the understanding readability act; no regeneration builder exists for either Polaris union (the base union matches the base warrants exactly) | `syzygy-c51h` (filed by this pass). Checker R7 [superseded 2026-10-02: regenerated by the dependency-union successor act; R7 reports 0, §9] |
| Three `spec.md` heads still say candidate or "binds nothing" | the POC, Polaris base and understanding `spec.md` | Bound bytes; only a signed successor can replace a banner | Disclosed in `openspec/README.md`; no bead |
| The POC contract coverage calls the POC's requirements "21" | `openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md` (RFC7-40 row) | Bound bytes, unchanged by the readability act | Disclosed here |
| The Polaris capability coverage maps MG-01…MG-17 to 001–016 only | `openspec/changes/polaris-manifesto-generation/CAPABILITY-COVERAGE.md` | An informative mapping that names itself the first formal set; bound | Disclosed here |
| The decisions index table stops at its 2026-09-05 enumeration | `.syzygy/governance/decisions/README.md` | It says so and asks to be re-enumerated; it routes to acts, not to specifications | Out of this pass |
| The page's As-of line predates many later edits | `PROJECT-STATUS.md` head | Restating it claims the whole page current; this pass reconciled the specification rows only | Out of this pass |

Dated counts in the M-series funnel design notes under `docs/design/` (for
example "17 requirements, 31 scenarios" for PWB) are session observations
dated where they stand; none is a default route.

## 6. Implementation impact

**Adopted behaviour and implementation authority are separate questions.**
No readability successor changed a requirement, so none creates
implementation work, and none grants any. [Observed from each record's own
scope and revocation lines.]

| Change | Adopted behaviour in force | Implementation authority in force | Readability successor's impact |
|---|---|---|---|
| Capability 1 | 42 requirements, adopted 2026-08-20 | Authorized 2026-08-21, Capability 1 only (`.syzygy/governance/decisions/CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md`); implemented | Proposal and design restyled; nothing to implement; no authority added |
| Three-Surface POC | 24 requirements, signed 2026-08-30 | Bounded, non-release POC direction of 2026-08-29 and improvement cycles of 2026-08-30 | Requirement layout restyled, words, scenarios and warrants unchanged; dependencies regenerated; nothing to implement |
| Polaris generator base + understanding | 31 requirements / 182 scenarios effective, as of 2026-10-02 (current: `census.json`, §2) | Base implementation authorized 2026-09-12 with no provider or effect authority; the understanding adoption of 2026-09-13 added no implementation permission; the tree-form adoption of 2026-09-28 authorized its own generator slice (draft schema, prompts, validation, draft preview) | Proposals and designs restyled; nothing to implement |
| PWB | 17 requirements / 44 scenarios at the v1.0 readability bytes | Tasks §2–§5 authorized 2026-09-02 and continued 2026-09-05 for that amendment's semantics; the 2026-09-30 read-gate direction re-points the registry act only | Restyle; "changes no requirement"; nothing to implement |

Adopted PWB behaviour that **no implementation authority covers yet**
[Observed from each record]: the opening-band aggregate scenario
(2026-10-01; slice 3 needs a separate authorization), the exact-source
render modes (2026-10-02; the M14 slices need one), the machine-view
categories (2026-10-02), and the four v1.0 sign-offs of 2026-10-02 —
missing-currency disclosure, dismissal with expiry, container-shape
profiles and item depth [and, since 2026-10-03, the tree-framing v1.0
sign-off, whose implementation authorization `syzygy-73e.20` tracks, §10].
The registry entry's 2026-09-30 currency and
briefing fields stay unread until `syzygy-dov.19`. Nothing here infers code
or effect permission from adoption.

## 7. The checker and its fixtures

`scripts/check_spec_reconciliation.py` is stdlib-only and read-only:

- `--check` runs R1–R7; R1–R5 fail closed, and R6 and R7 report bound-byte
  staleness as Unknown, never green.
- `--selftest` copies every input into a scratch tree, confirms the copy
  passes, then runs 23 rule-6 mutants [30 since the 2026-10-02
  re-derivation, §9; 39 since 2026-10-03, §10]. Among them:
  - stale act — the record's phrase flipped, the aggregate's flipped, both
    flipped together, and a manifest row changed;
  - stale digest — a POC subject and a PWB subject edited;
  - missing child — the PWB and understanding records deleted;
  - census breaks — a scenario renamed, a duplicate ID, a dangling MODIFIED
    ID, a heading only one method parses, a renamed MODIFIED requirement,
    and `census.json` drift;
  - route and figure breaks, dangling coverage and continuation IDs;
  - for R6 and R7, a mutant that must change what they report.
- [`selftest-witnesses.json`](selftest-witnesses.json) stores each mutant's
  path, old and new fragment, the predicates that failed, and the commit it
  ran at (`5a0df90`, the commit that added the checker; no checker input
  changed after it) [superseded 2026-10-02: regenerated at the
  re-derivation commit, §9].
  [superseded 2026-11-04, `syzygy-hgkq`: the file now names `5ee1c1a1`, an
  ancestor of `main`, with `scripts/check_spec_reconciliation.py` at blob
  `0c0a6fb11c7d84b85cf8c8208a9ee600830182b9`; the same 102 of 102 mutants
  were killed. The first run, which named the pre-rebase `0bc07cc4` (reached
  by no ref, same checker blob), is kept unchanged as
  [`selftest-witnesses-first-run-0bc07cc4.json`](selftest-witnesses-first-run-0bc07cc4.json).
  The two files differ in one row, `addition-aggregate-block`, whose
  old and new fragments carry tree-derived text.]
- **Battery:** `--check` and `--selftest` joined the canonical battery in one
  CG-26 edit — the `PROJECT-STATUS.md` block, the hosted workflow
  `.github/workflows/governance-docs.yml` and the count sentence
  (fifty-seven to fifty-nine) together.
- **By design**, a later act over any of the 55 subjects fails R2: the
  reconciliation is then re-derived, never carried forward.

## 8. What this pass did not do

It edited no act record, manifest, raw review or signed subject, performed
no act, and dispatched no review. Acceptance criterion 7 — an independent
exact-head review of semantic, act and denominator parity — remains, and
only after it may `syzygy-73e.5.6` and `syzygy-73e.5` close.

## 9. Re-derivation after the dependency-union successor — 2026-10-02

The first later act over one of the 55 subjects, re-derived here as §7
requires, not carried forward.

- **The act** [Observed]: the owner signed off the Polaris understanding
  dependency-union successor (`syzygy-c51h`). It installs the regenerated
  `openspec/changes/polaris-manifesto-understanding-amendment/GOVERNING-DEPENDENCIES.md`
  (policies gain `CC-REV-8`) and supersedes the understanding readability
  act for that file only. Record:
  `.syzygy/governance/decisions/POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-ACT.md`;
  how it was given:
  `.syzygy/governance/decisions/OWNER-INSTRUCTIONS-2026-10-02-POLARIS-UNDERSTANDING-DEPENDENCY-UNION.md`.
- **What the checker now does** [Observed]: the understanding child names
  that act as a later successor. R1 checks it like any digest act (phrase
  equals its manifest's sha256 and is in the aggregate), so six terminal
  records are examined for five children. R2 composes the chain: the later
  act's instant must be strictly later, its predecessor column must name
  the row the chain reached, and its successor row becomes the row the file
  must hash to. Still 55 signed subjects; the union moved row, not count.
  R5 requires both the `openspec/README.md` understanding row and
  `PROJECT-STATUS.md` to name the new record.
- **Results** [Observed, `--check` at the re-derivation commit]: R1–R5
  pass, R6 and R7 report 0 findings. The census is unchanged:
  `--census` regenerates [`census.json`](census.json) byte for byte, since
  no `spec.md` moved.
- **Selftest**: 30 mutants, all killed. `union-after-successor-act` now
  requires every predicate to pass (it required R2 to fail before the act);
  five new mutants cover the chain — successor record deleted, its
  aggregate phrase flipped, its predecessor column moved, its instant moved
  before the readability act, and its route-row name removed.
  [`selftest-witnesses.json`](selftest-witnesses.json) was regenerated at
  the commit it names.
- **Battery**: `scripts/build_polaris_dependency_unions.py --check` and
  `--selftest` joined the battery, the hosted workflow and the CG-26 count
  in one edit. Its selftest now replays the pre-act state by reversing the
  installed union and requiring it to hash to the package's recorded
  predecessor.

## 10. Re-derivation after the PWB tree-framing sign-off — 2026-10-03

The second later outcome over the 55 subjects, and the first over the PWB
child, re-derived as §7 requires.

- **The outcome** [Observed]: the owner signed off
  `pwb-tree-framing-amendment` v1.0 (`syzygy-73e.9`, PWB-REQ-014 tree
  framing), a version-tagged sign-off under the 2026-10-02 Scope A
  direction. Record: `.syzygy/governance/decisions/PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md`. Its patches moved five of the PWB
  child's 11 subjects: `spec.md`, `design.md`, `proposal.md`,
  `CAPABILITY-COVERAGE.md` and `GOVERNING-DEPENDENCIES.md`.
- **What the checker now does** [Observed]: the PWB child names the
  sign-off as a later version-tagged successor. R1 checks it like the
  child's own record (package, version and tag lines; exactly one aggregate
  block), so seven terminal records are examined for five children. R2
  composes the chain: a versioned record has no act instant and no
  predecessor column, so its aggregate block must follow the readability
  block in the append-only aggregate record (its `Date:` on or after), and
  the package's own `proposed/` patches stand in for the predecessor
  column — each moved row has exactly one patch, and reversing it over the
  bytes at the successor row must yield exactly the readability row. A row
  with no patch must not move, and no patch may target a path outside the
  manifest. Still 55 signed subjects. R5 requires the `openspec/README.md`
  PWB row and `PROJECT-STATUS.md` to name the new record; the README row
  now does.
- **Census** [Observed]: re-derived by `--census`, never by hand.
  PWB-REQ-014 went from 1 to 8 scenarios, so PWB is 17 requirements and 51
  scenarios and, as of 2026-10-03, the four families total 114 and 304
  (current: `census.json`, §2). The checker's
  hard-coded literal was updated to match (014: 8; PWB totals 17 / 51), and
  [`census.json`](census.json) was regenerated at that commit, as it is at
  every addition install since (§2). Third
  method, run once here and not in the battery: OpenSpec 1.9.0
  `openspec show polaris-project-wide-butlers-model --json --deltas-only`
  reports 17 / 51, and `openspec validate polaris-project-wide-butlers-model
  --strict` passes. The previous `census.json` bytes are the ones the
  round-1 reconciliation review confirmed; that confirmation stays history
  (rule 10), and these bytes carry none of their own.
- **Results** [Observed, `--check` at the re-derivation commit]: R1–R5 and
  R7 pass. R6 reports 2: both behaviour-contract pins name the
  readability-row `spec.md`, which the sign-off moved. That is Unknown,
  never green, and needs its own re-pin act; this pass repairs neither.
- **Selftest**: 39 mutants, all killed. Nine new ones cover the versioned
  link: its record deleted, its tag line and aggregate block changed, its
  block moved before the readability block, its date moved earlier, a
  removed line of its `spec.md` patch altered (the patch still reverses,
  to the wrong bytes), its `design.md` patch deleted, its `proposal.md`
  patch retargeted outside the manifest, and its route-row name removed.
  The last four leave every subject hashing to its row, so only the chain
  sees them. `pins-after-repin-acts` now also replays `spec.md` at the
  pinned row (the re-pin builder's `spec_at_pin` reverses every later
  signed `spec.md` patch): R6 must read zero over that tree, and R2, R3 and
  R4, which then see bytes no act binds, must fail exactly.
  [`selftest-witnesses.json`](selftest-witnesses.json) was regenerated at
  the commit it names.
- **The re-pin builder** (`scripts/build_pwb_behavior_contract_repin.py`):
  its selftest replayed the pre-act tree from the current `spec.md`, which
  the sign-off moved past the pin. It now lists later `spec.md` sign-offs
  (`LATER_SPEC_SIGNOFFS`) and replays the pinned bytes by reversing their
  patches, refusing a move no later sign-off explains; four fixtures cover
  the replay (33 in all). Its `--check` was already unaffected.
- **Builders left as they are**: the candidate builders of the five
  earlier PWB packages and of tree-framing itself
  (`scripts/build_pwb_*_amendment.py`, `…_readability_successor.py`,
  `…_missing_currency_disclosure_scenario.py`) verify a package before its
  sign-off and fail once a later patch moves their subjects. None is in the
  battery; after sign-off each package is checked by
  `scripts/record_versioned_signoff.py --check`, whose `VERSIONED_LATER`
  history already names the tree-framing manifest.

## 11. The dossier local-agent sign-off — 2026-10-06

The first signed Polaris addition, re-derived in the sign-off's recording
commit by `--regenerate`, never by hand.

- **The outcome** [Observed]: the owner signed off
  `polaris-dossier-local-agent-mode` v1.0, a version-tagged sign-off.
  Record: `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`.
  Its builder moved the change's `spec.md` from `proposed/` to `specs/`,
  which makes the change a signed Polaris addition: ADDED-only, and
  composed after the overlay by both methods.
- **What the checker does** [Observed]: R1 checks the sign-off record like
  a child's own (package, version and tag lines; one aggregate block). The
  addition has no R2 row. R3's expected Polaris population is derived: the
  base-and-overlay literal plus what the addition ADDs, read by both block
  parsers from the addition alone. R4 requires the addition's generated
  `GOVERNING-DEPENDENCIES.md` to equal its warrants, and R5 requires the
  `openspec/README.md` row and `PROJECT-STATUS.md` to cite the record.
- **Figures**: the addition ADDS REQ-polaris-generation-033 to 036. The
  populations at that commit and since are [`census.json`](census.json)
  (§2); CAP1, POC and PWB and the checker's literals are unchanged. Third
  method: not run [Unknown].
- **Results** [Observed, `--check` at the recording commit]: R1 to R5 and
  R7 pass; R6 reports the two PWB pins of §10, unchanged.

## 12. The dossier local-agent v1.1 sign-off — 2026-10-07

The first signed successor of a Polaris addition, re-derived in the
sign-off's recording commit by `--regenerate`, never by hand.

- **The outcome** [Observed]: the owner signed off
  `polaris-dossier-local-agent-mode` v1.1, a version-tagged sign-off.
  Record: `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`.
  Its builder applied the v1.1 patches to the signed v1.0 bytes of the
  change's `spec.md`, `design.md` and `proposal.md`, with the options the
  record names. REQ-polaris-generation-033 and 034 are amended in place;
  no identifier is added or retired.
- **What the checker does** [Observed]: as §11. R1 checks the v1.1 record
  beside v1.0's; R4 requires the regenerated `GOVERNING-DEPENDENCIES.md`
  (RFC5-12 added to 033's warrants) to equal its warrants; R5 requires the
  `openspec/README.md` row to cite the v1.1 record.
- **Figures**: 033 gains scenarios; the populations at that commit and
  since are [`census.json`](census.json) (§2). CAP1, POC and PWB are
  unchanged. Third method: not run [Unknown].
- **Results** [Observed, `--check` at the recording commit]: R1 to R5 and
  R7 pass; R6 reports the two PWB pins of §10, unchanged.

## 13. The CAP1 consent overlay composed — 2026-11-04

Not a new outcome: the composition of an outcome recorded 2026-10-15,
which the census had not yet read (`syzygy-5oqc`).

- **The outcome** [Observed]: `cap1-trusted-bootstrap-consent` v1.0,
  adopted by version tag 2026-10-15. Record:
  `.syzygy/governance/decisions/CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md`.
  Its `spec.md` fully replaces CAP1-REQ-011 and CAP1-REQ-046 in the bound
  Capability 1 file, which stays unedited.
- **What the checker does** [Observed]: R3 composes the CAP1 population
  only when that record (package, version 1.0 and its tag line) terminates
  the overlay; otherwise it counts the bound file alone and fails. Method A
  parses both files by regular expression and replaces by identifier;
  method B splices the overlay's blocks into the bound text line by line
  and parses the result with the line state machine, and the spliced bytes
  must hash to the `composed_spec_sha256` the adoption builder recorded in
  the change's `GOVERNING-DEPENDENCIES.json`. Both refuse an overlay that
  replaces anything but exactly those two identifiers, names one the bound
  file lacks, carries any level-2 heading but `## MODIFIED Requirements` or
  any other delta heading, a U+FEFF, a carriage return, or a non-canonical
  or fenced requirement header. The literal census is 011: 8 and 046: 4
  scenarios, totals 42 / 57. R4 requires that JSON record's
  `requirement_count` and source digests and the `ADOPTION.md` figure to
  agree with the composed census, and scans the change's directory for
  identifier mentions; R5 requires its `openspec/README.md` row and
  `PROJECT-STATUS.md` to cite the record.
- **Figures**: CAP1 42 requirements / 57 scenarios (47 in the bound file
  alone); [`census.json`](census.json) regenerated. POC, PWB and Polaris
  unchanged. Third method: the adoption builder's own figure in
  `ADOPTION.md`, a separate program, agrees (R4).
- **Known residue**: `ADOPTION.md` still says the checker "still counts
  the bound file alone for CAP1"; it is generated and tag-bound, so it is
  read as of 2026-10-15 and not edited.
- **Results** [Observed, `--check` at the recording commit]: R1 to R5 and
  R7 pass; R6 reports the two PWB pins of §10, unchanged. Mutants: the
  `cap1-overlay-*` rows of
  [`selftest-witnesses.json`](selftest-witnesses.json).
