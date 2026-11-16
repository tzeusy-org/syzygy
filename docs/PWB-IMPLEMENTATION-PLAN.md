# Polaris project-wide Butlers model — implementation plan

> **Implementation guidance, never behavioral authority.** Required behavior
> is owned by the signed change
> `openspec/changes/polaris-project-wide-butlers-model/` (eleven artifacts
> bound by `decisions/PWB-STATE1-AMENDMENT-ACT.md`). Implementation is
> authorized by `decisions/PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md`
> (2026-09-02). The three effect acts of 2026-09-02 are warrants only; the
> implementation must evaluate them itself before the first body read
> (PWB-REQ-005). Scope: one configured Butlers repository, content class
> `declared-project-shape-text`, read-only, local demonstration; no
> write, egress, execution, deployment, release, recovery or mission effect.
> Bead epic `syzygy-1z3`; plan bead `syzygy-1z3.1`.

Every substantive statement below is `[Inferred]` planning unless marked
`[Observed]`; the spec's own oracles decide, never this plan.

The PWB change is built inside the existing POC packages as a pure,
injectable pipeline — authority gate, read guard, classification,
extraction, coverage — feeding one shared model, in eight slices P1–P8
whose first slice is the body-read gate.

- **§1–§2:** stack and module layout; §2 also carries the dated per-slice
  build notes.
- **§3–§5:** the body-read gate, the containment pipeline, and the model and
  surfaces.
- **§6–§8:** verification denominators, slice order, and review classes.
- **§9–§10:** known gaps, and when to return to the owner.

## 1. Stack and packaging

**No new language, package, runtime dependency or route.**

- `[Observed]` The adopted registry entry names the implementation module as
  `packages/three-surface-poc-core/src/project-shape-observer.ts` inside the
  existing `three-surface-poc-core` package, so no `tsc -b` project list or
  Vitest project entry changes. TypeScript on Node ≥22.15, Vitest,
  `tsc -b --force` for `build:poc`, exactly as today. (Stale since
  2026-10-28, `syzygy-bpyt.4.2`: `build:poc` now runs
  `scripts/clean_build.mjs`, which removes every dist it builds and then runs
  `tsc -b`, with no `--force`.)

- **Markdown and TOML are parsed by small, inert, purpose-built line
  parsers** in this repository rather than a third-party Markdown library.
  - The extraction grammar (spec "Reader definitions") is literal: H2/H3
    headings, top-level list items, table body rows, a leading bold or code
    span, one `[butler].name` key.
  - A general Markdown parser would both widen the attack surface (raw HTML,
    link resolution) and make the grammar harder to falsify.
  - The parser never produces HTML; it produces typed items and
    NFC-normalized strings.
- **Git objects only.** Bodies are read through `git cat-file --batch` /
  `git ls-tree -r -l <revision>` against the configured repository's
  resolved Git common directory, never through the working tree, and only
  for paths admitted by the read guard (§4).
  - `[Observed]` `code-structure.ts` already uses `ls-tree` metadata this
    way with an injectable `runGit`.
- **One shared model, parity by construction.** `PocModel` gains additive
  fields (§5); `GET /api/poc` stays `JSON.stringify(model)`; all Polaris
  HTML renders from that object.

## 2. Module layout

Core owns the pure pipeline modules and the model; the app owns loading
governance inputs, the mutation tooling and Polaris rendering. The dated
notes after the tree are the slice-by-slice build record — deviations,
measurements, repairs, reconciliation reviews and cycle reports — and are
kept as written.

```text
packages/three-surface-poc-core/src/
  owner-act-record.ts          parse a decisions/ act record into the nine RFC3-16(b)
                               items (+ state, phrase, recording tag, A1 absence);
                               parse failures are typed, never coerced to "absent"
  authority-artifact-fields.ts extract the authority-specific fields from the
                               consent record (Markdown) and the policy / registry
                               JSON as present | missing; no validity
  body-read-authority.ts       PWB-REQ-005: evaluate consent / policy / registry
                               triples; closed 195-case invalid vocabulary; 8 valid
                               triples; failed state-(2) never downgrades; append-only
                               evaluation history
  authority-disclosure.ts      the one renderer for per-authority state text and the
                               exact state-(1) sentence (in core, not the app, so
                               `/api/poc`'s verbatim model JSON carries the same strings)
  git-tree.ts                  `ls-tree -r -z` parser, tree index, POSIX path
                               normalization; shared by the manifest and the reader
  project-shape-manifest.ts    PWB-REQ-001 phase A discovery: root index → pillar
                               indexes → Git-tree baseline specs + roster; emits the
                               revision-bound manifest (paths, extraction classes,
                               discovery version, sha256)
  project-shape-observation.ts PWB-REQ-001 phase A observer: injectable Git runner,
                               exact commit, committer instant as source-claimed time,
                               admitted + ledgered seed reads, observer identity /
                               versions / capture-instant stamps, capture-independent
                               observation digest, registry failure states
  git-object-reader.ts         PWB-REQ-006 read guard + exact-object reader with
                               declared resource limits; injectable runGit/read spy
  content-classification.ts    PWB-REQ-003: the adopted secret policy's six-step
                               classificationOrder over transient bytes; emits
                               hash-not-body exclusions only
  project-shape-extraction.ts  PWB-REQ-002: the nine item classes' literal grammar;
                               malformed source → whole-source Unknown, never partial
  project-shape-coverage.ts    PWB-REQ-002/004: per-class denominators, modeled /
                               Unknown / contradicted states, documented precedence
  project-shape-observer.ts    the registry-named adapter: composes the above in the
                               design.md data-flow order; zero body reads unless the
                               authority evaluation admits
  walkthrough-judgment.ts      PWB-REQ-022: run record + owner judgment act evaluation
                               (84 present-invalid + 2 absent cases)
  model.ts                     additive PocModel fields; buildButlersPocModel wires
                               the observer and the two authority evaluations
apps/three-surface-poc/src/
  governance-inputs.ts         locate and load the act-bound artifacts and act records
                               from the observing checkout's .syzygy/governance tree
                               (fail closed; unreadable ≠ absent); hard-codes the
                               controlled expectations; classifies a missing record as
                               git-ref-only / tree-attribution-only / absent
  pwb-mutation.ts              the PWB-REQ-005 mutation plan (pure): marked predicate
  pwb-mutation-run-main.ts     sites + literal mutations; runner writes docs/evidence
  polaris.ts                   project-level entry: Overview, Boundaries, Architecture,
                               V1, Project catalog, Capability detail, Evidence and gaps
  polaris-copy.ts              the closed copy roles and the owner-visible string table
  capability-detail.ts         argument / contract / reality bands; WhatsApp slice moves here
```

P1 deviation, recorded 2026-09-03: `authority-disclosure.ts` landed in
`packages/three-surface-poc-core/` rather than the app so the machine channel
inherits the strings by construction, and the field extraction split out into
`authority-artifact-fields.ts`.

P2.1 note, recorded 2026-09-03: `git-tree.ts` was split out because the
manifest (2.1) and the exact-object reader (2.3) share tree metadata. The
manifest's index-link grammar is a closed rule under
`pwb-discovery-v1-candidate.3`: inline links and reference definitions
outside fenced blocks and code spans; a pillar root is a root-index link
whose directory basename is one of the five pillar keys; a pillar index
names only files under its own root; images, external, escaping, directory
and self links are recorded as ignored. Extraction classes are assigned by
(rule, pillar, path within root). `[Unknown]` whether the real Butlers
indexes fit this grammar — §9 already routes that to the first P4 live run.

P2.2 note, recorded 2026-09-03: the phase A observer landed as its own
module, `project-shape-observation.ts`, rather than inside the registry-named
`project-shape-observer.ts`, so the P1 gate file (and its 86-site mutation
denominator) stays byte-stable; the gate composes it through `read`, and the
test proves a non-admitting authority issues zero Git calls. The observer
resolves the revision to an exact commit, takes the committer instant from
Git metadata as the source-claimed instant PWB-REQ-001 wants kept distinct
from capture, and admits every seed read against the tree before it happens
(root index or pillar `README.md` only, tree-matching object id, regular blob
mode; symlinks and submodules are refused, over-limit seeds are not opened).
Returned bytes are verified against Git's own blob identity before use. The
production `gitRunnerFor` binding exists but nothing in `main.ts` calls it:
no Butlers read happens before P4.

P2.3 note, recorded 2026-09-04: `git-object-reader.ts` is the phase B
read guard and reader. It never reuses phase A's `readSeed` (the phase A
seed allowlist is narrower and already act-tested), but both share
`git-tree.ts` metadata and the P2.2 `GitRunner`, `gitBlobObjectId` and
`ResourceLimitBreach` shapes. Decisions: (a) the caller's path must already
be normalized — a traversal-shaped path that would resolve inside the tree
is refused as `path-not-normalized`, never silently rewritten; (b) the only
Git command the reader issues is `cat-file blob <object-id>` taken from the
tree entry, never a path-addressed read; (c) the policy's denied
basename/prefix/suffix rules are compared case-insensitively on the final
segment (strictly more refusals); (d) active content is scanned with the
2026-09-05 policy amendment's Markdown code-context mask
(`markdown-code-context.ts`, profile `closed-pwb-code-context-v1`): bytes
wholly inside a closed inline code span or fenced code block are inert for
active-form detection only — secret detectors always scan the raw text — and
one finding outside those contexts, or a malformed context (unclosed fence
or span, backtick fence with a backtick in its info string, reported as the
form `malformed-code-context`), excludes the whole source with a body-free
finding (form, line, column); (e) `evaluateLimit` is the one comparison for all six
registry limits, so index depth (observer), parse time (2.5) and rendered
bytes (2.7/3.x) breach in the same shape as source count and bytes; (f)
`readManifestSources` returns one result per manifest source in manifest
order and hands each body only to the caller's `consume` callback, so no
record this module returns can carry a body. Still no Butlers read: the
reader is constructed by nothing before P4.

P2.4 note, recorded 2026-09-04. Rule-6 evidence:
`docs/evidence/pwb-p2-4-classification-mutation-run-2026-09-04.json` — 25
mutations, 25 killed, 25 restored, against `content-classification.test.ts`;
the run record names the source digest it verified the restore against, and
that digest is read from the record, never copied here. One further planned
mutation (`population-guard-off`) was withdrawn rather than counted, because removing
that guard was equivalent to removing dead code and would have scored a kill
it did not earn.

`content-classification.ts` is the policy's
six-step `classificationOrder` executed over the P2.3 reader's transient
body. Decisions: (a) the policy is a parameter — `PWB_SECRET_POLICY` is the
hard-coded copy proven byte-equal to the act-bound JSON, detectors are
compiled from the policy document's own strings (an uncompilable policy
throws rather than screening nothing), and every exclusion names the
policy version it ran under; (b) every detector runs over each body and the
first match in policy order is the one named, so a later detector's failure
cannot hide behind an earlier match; (c) three outcomes, all body-free:
`classified` (text handed to the extractor's callback only),
`excluded` (an RFC5-17 hash-not-body record in one of the two emitted
redaction classes) and `unavailable` (missing, non-blob, unreadable — the
policy never saw a body, so it is not an exclusion but stays counted with the
registry's `source-uncaptured-or-unreachable`); (d) a denied path is an
`excluded-artifact` exclusion with reason `denied-path` and no content digest,
because the body was never read; (e) a resource-limit breach is the policy's
`unclassifiable-excluded` exclusion, but its Unknown reason follows the
registry's `someSourcesUncapturedOrOverLimit` mapping (`Partial snapshot`,
`source-uncaptured-or-unreachable`) rather than the policy's blanket
`excluded-content` — the two act-bound artifacts differ here and the
registry is the adapter's declared error mapping (RFC4-2 item 6), so it wins
for the reason while the policy wins for the exclusion record; (f) parse
failure (step 5) is exposed as `parseFailureExclusion` for the extractor to
call, since only 2.5 knows when a parse failed. Still no Butlers read.

Authority-boundary repair, recorded 2026-09-05: the launcher now rejects any
resolved locator other than the consent record's configured Butlers locator,
and rejects a Git common directory other than that locator's exact object
database, before constructing the shared model. Governance inputs and
lifecycle records are loaded from the already-observed exact Syzygy commit;
recording tags resolve only when their act-record blob is byte-equal to that
current-tree record, and lifecycle enumeration/read/decode failures abort the
loader rather than producing an empty lifecycle. Phase-A root and pillar
indexes run the approved secret detectors and active-content screen before
their text reaches link parsing; an excluded seed remains counted Unknown and
derives no child paths. These changes repair PWB-LIVE-01/08/09 without changing
the consent, policy vocabulary, signed behavior, or state-(1) disclosure.

P2.5 note, recorded 2026-09-04: `project-shape-extraction.ts` implements the
spec's "Reader definitions" literally, one function per item class, over the
classified text 2.4 hands to its consumer. Decisions: (a) the parsers are
inert line parsers of the plan's own making — ATX headings, column-0 list
items, pipe tables with a required delimiter row, a leading bold or code
span, a Markdown link, and one `[butler].name` key — fenced code blocks are
masked, CRLF is tolerated, and nothing is rendered or resolved; (b) identity
is `(class, key)` with the path and 1-based line as anchor state, keys and
statements are NFC-normalized and nothing else (heading text, levels,
top-level depth, column counts and label positions are matched exactly);
(c) the six `project-account-section` keys are `purpose`, `promises`,
`refusals` (vision.md), `architecture` (every H2 of architecture.md
concatenated) and `v1-scope`, `v1-success` (v1.md); success criteria are
keyed `vision:<n>` / `v1:<n>`; topology components `<H2 ordinal>:<label>`;
catalog entries by their leading bold/code label, which must be followed by
a dash; craft policies by the File-column link target's basename; baseline
specs and roster identities by their tree directory; (d) any grammar
failure — closed vocabulary `unsupported-source`, `missing-heading`,
`malformed-list`, `malformed-row`, `malformed-toml`, `duplicate-key`,
`ambiguous-leading-label` — makes the whole source Unknown (no items, no
denominators), and a duplicate key within one source is such a failure
while cross-source duplicates are left for 2.6's contradiction handling;
(e) a source whose classes all succeed carries per-class item counts as its
denominators, which 2.6/2.7 sum into the per-class D. The REQ-002 oracle is
a regex-only second extractor inside the test file; 35 rule-6 mutations
killed with digest-verified restore
(`docs/evidence/pwb-p2-5-extraction-mutation-run-2026-09-04.json`). Still no
Butlers read: extraction is called by nothing before P4.

P2.6 note, recorded 2026-09-04: `project-shape-coverage.ts` is coverage as
data over the classified-and-extracted population. Decisions: (a) the
source population is the input list unchanged and in order; each source
carries a known item denominator or an Unknown one with the classifier's
fixed reason, and a grammar failure becomes the policy's `parse-failure`
exclusion (hash kept, failure named, `excluded-content`); (b) facts are
reconciled from declarations — `item:<class>:<key>` for identities (a
second declaration of one identity is a conflict whatever its statement
says, per the spec's duplicate-key rule), `count:<class>` derived from the
admitted items, and stated declarations supplied from outside the grammar
(fixtures now; empty in production until Butlers is observed to declare a
summary that the model may read); (c) a conflict is resolved only by a
`PrecedenceRule` whose anchor path is in the admitted population and whose
two selectors each match exactly one declaration; rules with disagreeing
winners, out-of-scope facts or unmatched sides decide nothing and the fact
is Unknown with RFC2-24's `contradicted-pending-adjudication`, every
declaration retained and every considered rule's outcome recorded; (d) a
count over a class with any Unknown-denominator source is itself Unknown
with that source's reason, whatever a summary states; (e) item states are
modeled or contradicted, `unknown` is reachable only through count facts,
and per class modeled + unknown + contradicted equals the declared count
while D is known only when every source of the class was readable.
`[Unknown]` still whether Butlers declares any precedence rule — the first
live run (P4's second half) answers it; the eight-versus-nine domain-butler
conflict is the first fixture either way. 27 rule-6 mutations killed
(`docs/evidence/pwb-p2-6-coverage-mutation-run-2026-09-04.json`). Still no
Butlers read.

C4 note, recorded 2026-09-05 (bead syzygy-1z3.24.4; effective acts: the
truth-and-readiness amendment's PWB-REQ-004 and the registry-entry
amendment's `observationGrammar`): stated counts and precedence rules are
no longer injected from outside the grammar. The root index is charged one
`fact-and-precedence-extraction` pass and read for exactly two closed
grammars — the `Key Architectural Facts` H2's one `<decimal> daemons` item
whose cardinal form `<n> staffers ... + <n> domain butlers` mints
`catalog-count:Staffers` and `catalog-count:Butlers` as `stated-summary`
declarations, and the `Precedence Order When Layers Disagree` H3's one
table, admitted only when all seven registry rows match after the registry
cell syntax (trim, unwrap complete code spans, one bold Layer span). Fact
families are the registry's four (`item`, `count`, `catalog-count`,
`project-account`), each family row-mapped; a row decides only when its
anchor is in the population, it owns the fact's family, its home is not
inert (row 7), the home is applied (row 6 expands only to declared roster
keys), and exactly one declaration lies under the home — otherwise it
decides nothing and RFC2-24's Unknown stands with every declaration kept.
`ProjectShape` now discloses `precedence` and `rootSummary` (admitted /
emitted, absent with the grammar reason and line, or unknown) and Polaris
renders them with every decided disagreement's effective and superseded
sides in a `shape:root-index` section. The eight-versus-nine fixture is
the model and coverage test (`with the table: nine is effective by row 1,
eight is superseded ...`). 23 rule-6 mutations killed
(`docs/evidence/pwb-c4-fact-precedence-grammar-mutation-run-2026-09-05.json`).
First live observation at Butlers d684c5776: the table is admitted (seven
rows, root lines 44–50) and the summary emits 3 and 8 (root line 105), but
`v1.md` is still whole-source Unknown (`ambiguous-leading-label`, line 95),
so both catalog counts are Unknown with `excluded-content`, the stated
values retained and anchored, no rule applied — the lawful outcome; no
number is shown over an Unknown denominator.

C5 note, recorded 2026-09-05 (bead syzygy-1z3.24.4; effective acts: the
truth-and-readiness amendment's PWB-REQ-021 and PWB-REQ-011 as amended, the
registry-entry amendment, and the implementation-authorization continuation
direction): two seams, both pure and injectable.

(a) PWB-REQ-021 readiness. `walkthrough-readiness.ts` (core) owns the nine
answer identities (`why`, `promises`, `refusals-and-rule`,
`capabilities-and-fit`, `exact-requirement`, `unknown-or-contradiction`,
`claim-strength`, `architecture-and-groups`, `v1-success`) and the ten
readiness arms (`answer-missing`, `answer-empty`, `answer-duplicate`,
`answer-unrecognized`, `anchor-unresolved`, `surface-mismatch`,
`evaluation-mismatch`, `path-outside-polaris`, `resource-breach`,
`authority-unresolvable`). It reads the run record's `## Answers` section
(`### <identity>` subsections; `Sources:` backticked `path:line` anchors;
`Authority:` one backticked path; every other non-empty line is the reader's
own words, retained verbatim and never scored), sweeps every arm (no first-
failure stop), and reports `ready` only when no arm fired. Anchors resolve
against the same evaluation's complete source population (an Unknown source
is still a source); a cited authority resolves only to an admitted source.
Traversed paths must be Polaris or its same-evaluation exact-source route
(`/polaris`, the tailnet mount, or either with the
`#polaris-source-<slug>` fragment of a population source — the predicate is
injected from the app, `pwbReadinessTraversal()`). Any PWB-REQ-006 breach in
the evaluation makes readiness false. The judgment evaluator is untouched
and its `section()` never sees `## Answers`, so readiness cannot change a
PWB-REQ-022 outcome (tested both ways: ready-and-unlawful, not-ready-and-
lawful); readiness never mints `verdict-unlawful`, a verdict or a score.
`PocModel.walkthroughReadiness` is `not-evaluated` (no judgment inputs or no
traversal), or `evaluated` with `no-run-record` / `evaluated` readiness;
Polaris renders it as the `walkthrough-readiness` section (state, findings,
each answer's own words, anchors and authority with resolution flags), all
disclosure-role copy, machine form by construction.
`[Inferred]` tension to resolve in P8: the exact-source fragment route is a
lawful readiness traversal but lies outside `PWB_WALKTHROUGH_SCHEDULE`'s
route population, so a record that traverses it is ready yet judged
`traversed-paths-wrong` under PWB-REQ-022 — the 84 + 2 denominator is
unchanged here; whether the schedule should name the fragment routes is an
owner question, not an implementation call.

(b) PWB-REQ-011 exact-requirement route. `verbatim-route.ts` (app) is the
transient route: `verbatimRouteReader(model, readBlob)` is derived per
render from the model being rendered (routes pass it through
`pocRoutes(getModel, limits, polarisInputs)`; `main.ts` binds
`gitBlobReaderFor(repoRoot)`), stores and caches nothing, and per leaf
requires, in order: the leaf's path is a source of this evaluation's
population under the `baseline-spec-tree` rule; the leaf's revision and
identity are this evaluation's; the source was not excluded; the anchor is a
blob and the path is not policy-denied; the bytes Git serves hash to the
exact object id; the body fits `maxBytesPerSource`; it is NUL-free UTF-8;
the approved secret detectors find nothing; the active-content scan (with
the inert Markdown code-context mask) finds nothing. Then `resolveVerbatim`
re-checks the identity and selects only `### Requirement:` blocks (each with
its `#### Scenario:` children, ended by the next h1–h3 heading, trailing
blank lines trimmed); the h1 title, `## Purpose` prose and inter-block text
are never encoded; a spec with no requirement heading is
`reference-unresolvable`. Every failed gate is a typed refusal naming the
detector or form, never bytes. `[Observed]` Phase B classifies every
baseline spec path-only (the directory name is the item identity; the body
is deliberately not read), so the evaluation holds no whole-body verdict for
them and the route runs the unchanged detectors and scan itself before any
block may be encoded — the reading of "the existing … gates all admit it"
applied here; no new consent, content class or population rule. Polaris
renders one `<pre data-verbatim-text data-verbatim-requirement="<title>">`
per selected block; the machine form carries the titles, never the text.
The P3.8 note's `[Unknown]` on live rendering is now answered below.

Evidence: core 27 + app 10 readiness tests, 13 route tests, capability-
detail suite updated to the selected-block grammar; 38 rule-6 mutations
killed (17 readiness arms, 4 population/traversal, 12 route gates, 5
selection/resolution), sources restored byte-for-byte
(`docs/evidence/pwb-c5-readiness-verbatim-mutation-run-2026-09-05.json`).
Live at Butlers d684c5776: 185 baseline specs, all classified path-only;
the route renders 175 (1,669 requirement blocks selected) and refuses 10 —
nine for active content (`html-tag` ×8, `html-comment-or-declaration` ×1)
and one (`healing-anonymizer`) on the `known-token-formats` detector — each
named by form or detector only. The Polaris page renders the current
leaf (`switchboard-identity`, six blocks) verbatim; readiness is
`no-run-record` because `PWB-WALKTHROUGH-001.md` does not exist yet (P8).

C6 note, recorded 2026-09-05 (bead syzygy-1z3.24.5; PWB-LIVE-06, 11, 13;
effective acts: PWB-REQ-010/011/014/020 as amended and the implementation-
authorization continuation direction): presentation only — no truth model,
consent, population rule or policy changed.

(a) First reading (PWB-REQ-010). The page opens as `Butlers` with the
overview group first, then one native `<details id="polaris-claim-states">`
that explains every tuple field once (label, the seven RFC2-25 tier words,
the four freshness words, challenge) and the only strengthening routes;
every tuple is `aria-describedby` that explanation. The depth list follows
it. (b) Progressive disclosure (PWB-REQ-011). Each catalog class's items and
the exclusions sit complete inside `<details class="population">` whose
summary names the count; nothing is hidden by style. `[Observed]` the
sources table is *routed*, not collapsed: after fragment navigation to a
target inside a closed `<details>`, Chrome restarts sequential focus at the
details' first focusable (the table region), so a reader who followed a
citation could not continue past the row — the browser suite's new
disclosure step and re-open-after-navigate found it. Rule: no fragment
target inside a `<details>`. (c) Cause-correct routes (PWB-REQ-020). Each
Unknown's route names the recorded cause (`<path> matched the <detector>
detector: rotate and remove …; or an owner policy change to that detector`;
`does not parse under the declared grammar: repair the row …; or an owner
gate amending the grammar. No policy change is involved`; `carries active
content (N marker(s)): remove it …`; resource limit, denied path, non-UTF-8,
unknown extraction class, uncaptured) beside the claim; the gaps and reason-
count entries keep the generic table route and add `By cause:` beneath it.
(d) Exact-source route (PWB-REQ-011). `GET /polaris/source?identity=<repo@
rev:path#oid>` (and the tailnet mount) is human-open like `/polaris` —
browser-origin refusal, mount-aware links, `maxHumanResponseBytes` — and
"authenticated" by revision and digest rather than bearer: the identity is
resolved only against the evaluation's signed population and handed to the
unchanged `verbatimRouteReader`, so an identity outside the population, an
empty identity, an unobserved shape, forged bytes, an unreadable object or
a policy hit each render an Unknown with its reason and no bytes. The page
links `Exact text` from every admitted baseline spec's source row and item
rows, from the current-authority citation and from the depth list's last
level; `exactSourceIdentities` admits only `baseline-spec-tree` sources that
are classified blobs. (e) Machine presentation (PWB-REQ-014). `GET
/api/poc/polaris` (machine-credentialed, `maxMachineResponseBytes`) serves
`{ kind: 'polaris-presentation', version: 1, presentation, citable: false,
evaluation, project.revision, narrative }` where `narrative` is the very
registry the human page's script carries — one render, two forms — and
`/api/poc` is unchanged.

Evidence: +14 tests (5 source route incl. HTTP, 2 presentation envelope, 7
first-reading/cause/disclosure); the project-shape secret test now asserts
the detector wording; the reachability nav-order rule and the copy sweep
(baseline-spec variant, source-route pages) amended in place; browser suite
9/9 with the disclosure step; 26 rule-6 mutations killed, sources restored
byte-for-byte
(`docs/evidence/pwb-c6-polaris-parity-mutation-run-2026-09-05.json`).
Live at Butlers ff52900a3 (Syzygy 951084c): 185 admitted baseline specs,
372 route links on the page, 175 route pages rendered (1,669 blocks; page
block count equals the resolver's for every one), 10 refused
`excluded-content` with no bytes; 11 exclusions (2 parse-failure, 8
active-content, 1 `credential-assignment` detector) each routed by cause,
`By cause:` at 7 entries; 529 tuples, all described; 521 narrative blocks
and 713 anchors in the envelope (496 KB). `[Observed]` the human page is
2,044,047 bytes against the 2,097,152 ceiling — 97.5 % — so any further
growth (P8's readiness section on a real run record, or more Butlers
sources) will fail closed with a 503; raising the ceiling is a registry
amendment act, and trimming is a presentation choice: an owner question for
the 1z3.25 packet. Open `[Inferred]` question carried from C5: the
`/polaris/source` route is not a lawful PWB-REQ-021 traversal
(`isExactSourceRoute` admits only `/polaris#polaris-source-<slug>`), so a
walkthrough that opens it is judged `traversed-paths-wrong`; the 84 + 2
denominator is untouched here.

C7 note, recorded 2026-09-05 (bead syzygy-1z3.24.6; PWB-LIVE-12, 14;
effective acts: PWB-REQ-016/020/021/022 as amended and the implementation-
authorization continuation direction): mechanical gates only — no consent,
population rule, PWB-REQ-022 case or the 84 + 2 denominator changed.

(a) Exact binding (PWB-REQ-021). The schedule carries no placeholder
surface or evaluation value. A record must name the surface
`polaris@<first 12 hex of the tree oid of apps/three-surface-poc/src at the
observer revision>` (`polaris@unresolved` when Git cannot resolve it) and
the evaluation `pwb-eval-<first 24 hex of a digest over the shape's
deterministic inputs>`: repository and revision, manifest digest,
discovery/observer/implementation versions, resource limits, and the
consent, policy and registry acts the authority evaluation rested on —
never the authority's per-run evaluation id or a capture instant.
`[Observed]` the first cut used the observation digest, and two daemon
starts on the same commits named two evaluations, because that digest
carries the per-run `evaluation:pwb-body-read:<instant>` id; the
deterministic-inputs digest names the same evaluation on both starts
(checked twice against the built daemon and once more in the fresh clone).
An unobserved shape yields `pwb-unobserved-<kind>`, which no record can
lawfully name. `[Inferred]` gap: a core code change that bumps no declared
observer/implementation version leaves the identity unchanged; the surface
version covers the app tree only. `model.ts`
hands that identity to the judgment loader through a callback and fails
closed to `not-evaluated` (with the loader's message) when loading throws.
Polaris prints the expected binding beside any record, and beneath the
"no run record" state, so the reader knows what to write. (b) Polaris-only
routes (PWB-REQ-021/022). `surfaceRoutes` is `/polaris`, its tailnet
mount, and `/polaris/source` on both mounts; the traversal predicate admits
`#polaris-source-<slug>` fragments on the two Polaris routes and the source
route bare or with an identity whose path is in the evaluation's
population — a Polaris fragment on another surface, a query on `/polaris`,
or an identity outside the population is not a route. The C5/C6 open
question is thereby closed in code; whether the record guidance should
list the query form is an owner wording question (1z3.25). (c) Preflight
(`walkthrough-preflight.ts`, pure). Eight limbs over the served page, the
machine answer, the exact-source route's answer per linked identity and
the browser check: six source-backed Observed account statements each
rendered once; principles, success criteria, catalog and topology nonempty
and reconciling to a known denominator with every item row rendered once;
one reachable verbatim current requirement on the page and on the route;
at least one visible Unknown, matching the machine count, each with a
primary reason and a route; one glossary explaining every tier and
freshness word the page uses with every tuple described by it; every
linked source path reachable and every internal link resolving; a browser
check of the serving commit with no violation. Findings name the limb and
the offending row; `ready` is `findings.length === 0` and nothing else.
It is mechanical readiness — the four states (preflight, execution record,
owner judgment, act validity) stay separate; a failed preflight fails the
demo and invites nobody. (d) Exit (`fresh-checkout-verdict.ts`, pure).
Sixteen named invariants, each recorded and each moving the exit: clone
head equals source head; install, build, test exit 0; machine answer
refused exactly 401 without and served 200 with the credential; every
human route 200; every linked exact-source route 200; daemon's observed
Butlers revision is a hex revision equal to the model's; shape observed;
authority admits; parity; zero limit breaches; preflight ready; daemon
exit 0 with empty stderr; evidence written. Parity is per tuple, not per
id: every rendered tuple must equal its machine claim's label, tier,
reasons and freshness, the presented population must be rendered, both id
sets equal — a claim may lawfully render more than once (the current-
authority citation repeats the baseline-spec item's tuple), so the
2026-09-04 record's `tuples === distinct ids` was coincidence, not a rule.

Evidence: +74 tests (verdict 29 with one counterexample per invariant and
an all-at-once case; preflight 31 with one pre-fix-failing counterexample
per limb, `also` naming limbs a mutation legitimately co-trips; binding,
surface version and traversal 8; core identity — restart-stable, changed
by each deterministic input, unobserved named — and `expected` 5; model
seam 1; page expected-binding parity incl. a record naming another
surface); 46 rule-6 mutations killed, seven of them only after a second
round added the test each survivor exposed (a 403 refusal, an Inferred
account statement, an unchecked and a not-rendered current-requirement
route, a Polaris fragment on `/trajectory`, a fixed seam identity, the
record's surface shown as the expected one), sources restored
byte-for-byte
(`docs/evidence/pwb-c7-fresh-demo-readiness-mutation-run-2026-09-05.json`).
Live fresh clone of 28ff68d against Butlers ff52900a3
(`docs/evidence/pwb-p4-5-fresh-checkout-demo-2026-09-05.json`, artifacts
retained outside the repository): 1,501 tests green in the clone; binding
`polaris@dea2b82f3ef5` / `pwb-eval-0c3baa9fb21e88afce06602f`; 529 tuples
over 528 ids, 0 mismatching, both absences 0; 185 exact-source identities
fetched, 175 rendered (1,669 requirements), 10 not rendered with reason
`excluded-content`; browser check 6 variants, 0 violations, at the
serving commit; daemon exit 0, stderr empty; 0 limit breaches. `[Observed]`
the exit is 1 on `preflight-ready` alone: account statements `v1-scope`
and `v1-success` are Unknown with no statement and no anchor, and
`catalog-entry` and `topology-component` have 0 modeled with an
`excluded-content` denominator (`success-criterion` reconciles 5 modeled
but its denominator is Unknown for the same cause) — the Butlers data
quirks already recorded (`v1.md` whole-source Unknown; excluded index).
No Syzygy change can make that ready: repairing the Butlers rows or an
owner gate amending the grammar or the exclusion are owner decisions for
the 1z3.25 packet, and until one of them lands the owner walkthrough is
correctly not ready and no owner attention is requested. `[Observed]` the
Polaris page is 2,045,086 bytes (97.5 % of the ceiling; +1,039 bytes for
the expected-binding line) — the C6 ceiling question stands.

Reconciliation gen-1 note, recorded 2026-09-06 (bead syzygy-1z3.24.7):
one independent fresh-context review re-opened the whole recovery at
`d92910c` against the amended specification and the 2026-09-05 acts
(`docs/reviews/2026-09-06-pwb-recovery-reconciliation-packet.md`, raw
`docs/reviews/R-PWB-RECOVERY-RECONCILIATION-GEN1-RAW.md`). Verdict
**CONFIRM WITH EXCEPTIONS**: PWB-LIVE-01..15 all `repaired`, each to one
child, code location and one gate; 11/11 amended digests, policy and
registry match their acts; a clone run reproduces the C7 result
(`preflight-ready` alone fails, same three limbs) at Butlers `2891522f`.
Exceptions PWB-RECON-01..09: the human page renders no state-(1)
same-tree-forgeability sentence (PWB-REQ-005 "both surfaces"; High,
pre-existing at `cd6c952`), the whole-shape Unknown cause (Spec and Spine
home has no index) never reaches the page, and the binding is blind to
core-package changes — a gen-2 implementation pass, then a gen-2
reconciliation, before any owner walkthrough. Readiness blockers on the
Butlers side are wider than the C7 note recorded (roster TOML and one Lay
and Land page withheld as active content; topology table fails the
grammar): owner items collected in the packet for 1z3.25.

Gen-2 repair note, recorded 2026-09-06 (bead syzygy-1z3.24.8): the
implementation-only repairs of PWB-RECON-01/02/03, plus the optional 06
and 07. PWB-RECON-01: `authorityLine` now renders each authority's
disclosure sentence beside its state as an `authority-disclosure` parity
marker (state (1) verbatim: "Owner-trusted only; same-tree forgeable from
Syzygy's perspective. Digest detects drift, not authorship or
attendance."), served identically on the direct and tailnet-Host mounts;
preflight limb nine, `authority-disclosure-missing`, requires exactly one
marker per authority whose text equals the evaluation's and, for state
(1), the PWB-REQ-005 sentence on both sides. PWB-RECON-02: the observed
`ProjectShape` carries Phase A's per-pillar `discovery`; the page renders
each pillar's state, an Unknown pillar's reason and a cause-correct route
(the index-missing case names the home and index path, then "add that
index in Butlers, then a new snapshot; or an owner gate amending the
discovery rule"), and the degradation state or an explicit
no-degradation sentence; preflight limb ten, `discovery-undisclosed`,
holds page and model to each other (ten limbs now). PWB-RECON-03: the
surface version is `polaris@` plus the first twelve hex digits of
sha256 over the two source tree ids (`apps/three-surface-poc/src`, then
`packages/three-surface-poc-core/src`), `polaris@unresolved` if either
fails — a core-only change moves the binding. PWB-RECON-06: a decision
record the lifecycle enumeration listed but the read cannot find aborts
the loader (counterexample through the injected reader). PWB-RECON-07:
the fresh demo probes the tailnet Host mount (served, every internal link
mount-prefixed, the same disclosure count as the direct page), the
presentation envelope (401 without the credential; 200
`polaris-presentation`, `citable: false` with it) and a foreign-Origin
refusal (403 `browser-origin-refused`), as three new verdict invariants
(nineteen). The parity sweep gained the `observed-excluded` and
`observed-undiscovered` shape states (seven) and four marker families.

Reconciliation gen-2 note, recorded 2026-09-06 (bead syzygy-1z3.24.9):
one independent fresh-context review re-opened the gen-2 repairs at
`9b28663` against the gen-1 findings, the amended specification and a live
clone run (`docs/reviews/2026-09-06-pwb-recovery-reconciliation-gen2-packet.md`,
raw `docs/reviews/R-PWB-RECOVERY-RECONCILIATION-GEN2-RAW.md`). Verdict
**CONFIRM WITH EXCEPTIONS**, gen-3 not needed: PWB-RECON-01, the page half
of 02, 03, 06 and 07 `repaired` (each confirmed by reverting the
implementation hunks, by the reviewer's own mutants — 16 of 19 killed — and
by live observation on both mounts at Butlers `ec8b1f6`); 08 `open` (live
discovery test still pins `a3dd1fe`, bead syzygy-1z3.24.11); 04, 05 and 09
owner items, unchanged. The reviewer's clone run reproduces the retained
gen-2 demo value for value (surface version `polaris@e64a10980701`,
`preflight-ready` alone fails on the same three Butlers-data limbs). New
findings PWB-RECON-10..12 are Low test-rigor gaps on the new discovery gates
(three surviving mutants; bead syzygy-1z3.24.10) and PWB-RECON-13 notes the
retained gen-2 mutation record stores no fragments. Owner items for 1z3.25
now number seven: the six gen-1 items (item 6 repaired) plus whether to
close epic syzygy-1z3.24 with the test-rigor beads outstanding.

Gate repair note, recorded 2026-09-06 (beads syzygy-1z3.24.10 and
syzygy-1z3.24.11): PWB-RECON-10..12 and 08 are `repaired`. The page test now
asserts the exact cause-correct route for each of the seven Unknown
reasons; the preflight `discovery-undisclosed` limb checks the route inside
the Unknown pillar's own entry against its reason's phrase, never
page-wide, with two isolating counterexamples; the core model test asserts
the Unknown pillar stays in `shape.discovery`. Evidence
`docs/evidence/pwb-recon-gen2-gate-mutation-run-2026-09-06.json` re-applies
the reviewer's three surviving mutants by exact fragment plus three on the
new scoping: 6 of 6 killed at `d747c75`, each by its intended test, every
fragment retained (PWB-RECON-13's shape). The live discovery test pins
Butlers `ec8b1f6` with populations hand-typed from `git ls-tree` and the
retained gen-2 demo record (Lay and Land is discovered again at that
head); it passes there and skips without the repository. P-65's two arms
now converge: the residue it weighed has closed with rule-6 evidence.

Cycle report note, recorded 2026-09-06 (bead syzygy-1z3.25): task 5.3
asks for the cycle report after the owner walkthrough (4.6), which has not
been performed (aborted 2026-09-05 on the pre-repair head; Unknown). The
report as far as it can be written before the walkthrough, with every
owner decision the cycle accumulated gathered in one packet, is
`.syzygy/governance/decisions/PWB-CYCLE-REPORT-DECISION-PACKET.md`
(register rows P-60…P-65): the V1 colon line and the withheld roster and
unparsed topology are the two items keeping readiness not ready; the Spec
and Spine index, the byte headroom, the exact-source wording and whether
to close epic syzygy-1z3.24 now are the rest; the state-(1) sentence needs
no decision since gen-2. The confirmed code head is `9b28663` at Butlers
`ec8b1f6`. Task 5.3 and bead syzygy-1z3.25 stay open until the walkthrough
outcome can be added.

Ruled 2026-09-07: the owner chose the recommended arm on all six
(`.syzygy/governance/decisions/PWB-CYCLE-OWNER-RULINGS-DECISION.md`). Repair
epic syzygy-1z3.24 is closed; the page trim is bead syzygy-1z3.27 and
precedes the Butlers merges; the Butlers edits sit on a branch made by a
dispatched agent, merge the owner's. Note the packet's own "None depends on
another" was wrong: P-63 gates P-60/P-61.

Evidence: every new test failed before its repair; rule-6 runs
`docs/evidence/pwb-recon-gen2-repair-mutation-run-2026-09-06.json` (12/12
killed, four preflight mutants only after a second round added one
isolating counterexample each), the parity-markers sweep
`pwb-p4-2-mutation-sweep-2026-09-06-parity-markers.json` (32/32, six new
literals), and nine verdict/lifecycle mutants killed in-session; fresh
demo `pwb-p4-5-fresh-checkout-demo-2026-09-06-gen2.json` at branch head
`1ad69cc` (rebased before merge; the two source trees are unchanged, so
the surface version `polaris@e64a10980701` binds the same code): clone
suite 1540 tests, 0 failures; Butlers now `ec8b1f6` (moved from
`2891522f`); preflight fails only the same three Butlers-side limbs as
before (`account-statement-unbacked`, `population-empty`,
`population-unreconciled`), the two new limbs and all three probes pass;
Spec and Spine still `index-missing-at-revision` (its home openspec in
Butlers carries no README index).
The gen-2 reconciliation (bead syzygy-1z3.24.9) reviews this head.

P2.7 note, recorded 2026-09-04: `project-shape-model.ts` composes P1–P2.6
into the one `ProjectShape` value that `model.ts` places on `PocModel`;
`GET /api/poc` is still `JSON.stringify(model)`, so the machine answer is
extended by construction. Decisions: (a) the gate runs first — a
non-admitting evaluation issues zero Git commands and the shape is
`not-admitted` with the gate's reasons; no evaluation at all is
`not-evaluated` with the loader's failure text, Unknown as
`unconsented-source-or-provider`; (b) every claim is a full PWB-REQ-007
tuple — stable claim id, the PWB-REQ-005 evaluation id, cap1-core's
`EpistemicState` (label, tier, one primary and deduplicated secondary
reasons, freshness), a resolution route per reason from a twelve-entry
table keyed by RFC2-24's vocabulary, challenge `unchallenged` (no challenge
channel exists yet), and support anchors (path, line, content digest,
source identity); (c) Observed claims are `report-fact` ("the source
declares X") and `fresh` (bound to the evaluated revision); contradictions
are `suspended`; an excluded, uncaptured or absent source is Unknown with
the classifier's reason; (d) the whole-shape claim derives from its members
(sources and reconciled facts): the first Unknown member's reason is
primary, the rest secondary, and observer degradation is disclosed beside
it as data because the population never shrinks; (e) class aggregates
carry label, tier, freshness and primary/secondary reason counts over
members and declaring sources, never a headline; (f) phase B re-lists the
tree at the resolved commit rather than reusing phase A's listing, so the
reader is bound to the same object ids the manifest recorded; (g) the
daemon evaluates the authority from its own working directory's governance
tree at every model build and fails closed to `not-evaluated` if the
inputs cannot be loaded; (h) `walkthroughJudgment` is deferred to 4.6 and
no live Butlers observation was run — the model is exercised only through
an in-memory Git runner over a Butlers-shaped fixture. Item-level
contradiction and item-level `unknown` are unreachable through the P2.5
grammar (each identity has one declaring source; a duplicate key inside a
source is a grammar failure), so those branches are tested at the exported
`itemClaim` seam. 38 rule-6 mutations killed
(`docs/evidence/pwb-p2-7-model-mutation-run-2026-09-04.json`). Still no
Butlers read.

P3.1 note, recorded 2026-09-04: `apps/three-surface-poc/src/polaris.ts`
now opens with the seven project-level groups in the task's order —
Overview, Boundaries, Architecture, V1, Project catalog, Capability detail,
Evidence and gaps — rendered exactly once each from `PocModel.projectShape`
(PWB-REQ-010; RFC7-1, RFC7-13). Decisions: (a) the movement scaffolding and
the "three movements" tally are gone; the WhatsApp slice renders unchanged
under "Capability detail" behind a scope instruction naming it one
capability within the complete catalog; (b) group membership is fixed:
Overview = purpose and promises plus the project-account class aggregate;
Boundaries = refusals plus principles; Architecture = the architecture
statement plus topology components; V1 = V1 scope, V1 success and success
criteria; Project catalog = declared projects, roster identities, design
contracts, baseline specs and craft policies, each class as its own block
with declared/modeled/Unknown/contradicted counts and a denominator that
is Unknown when a source was unreadable; (c) an unobserved shape
(`not-evaluated`, `not-admitted`, `observation-failed`) renders every
project group as Unknown in place with the shape claim's reason, its route
and the kind-specific detail — never an empty group (RFC7-15); (d) every
rendered project-shape claim carries a `claim-tuple` span with claim id,
label, tier, freshness and evaluation id, and Observed leaves cite
path:line plus the exact content digest, linked to a source row in
"Evidence and gaps" that carries the source digest, rule, outcome and
denominator (PWB-REQ-011; RFC7-16); reconciled facts that agree are not
rendered as separate claims (their counts are the class blocks),
contradicted facts are, with every declaration kept; (e) exclusions render
as hash-not-body (path, redaction class, detector or reason, digest,
policy) and an Unknown-by-reason list closes the group with
`missing-declaration` and `unconsented-source-or-provider` foremost; (f)
the copy for the new groups already meets PWB-REQ-012's bounds (headings
≤ 6 words, ledes ≤ 20, no prohibited vocabulary), tested for the group
headings, ledes, notice and shell lede only — the exhaustive `polaris-copy.ts`
role table and independent extractor remain task 3.3; (g) surface tests
reach an `observed` shape through `test-project-shape-fixture.ts`, an
in-memory Butlers-shaped Git runner plus admitting/rejecting authority
evaluations (a copy of the core fixture texts, kept in the app so the
core's test module stays private). Five hand rule-6 mutations: four killed
(group reorder, excluded-body leak, empty unobserved groups, omitted
route); the fifth (hard-coding freshness to `fresh`) is equivalent because
the model stamps every claim `fresh` — a freshness-varying claim does not
exist yet, so no test can distinguish it. Still no Butlers read.

P3.2 note, recorded 2026-09-04: the slice's move below the catalog was
made by 3.1; 3.2 adds the proof that the move changed position only. The
test renders both an unevaluated and an observed shape and checks, per
entity, that its section sits inside "Capability detail", carries exactly
the model's provenance sources and revisions in order, and exactly the
model's label and reason; per relationship, the one marker the model's
label implies; and that the slice's bytes are identical across the two
shapes. Three hand mutations (an added citation, an Unknown entity
relabeled Observed, slice copy varying with the shape) are killed.

**P3.3 note (task 3.3, syzygy-1z3.11, 2026-09-04).** Every fixed Polaris
string now lives in one table, `apps/three-surface-poc/src/polaris-copy.ts`,
each row carrying exactly one PWB-REQ-012 role (`project-fact`,
`epistemic-disclosure`, `action-label`, `scope-instruction`) and a kind
(heading, lede, notice, sentence, label). The renderer takes text only from
that table or from the shared model and marks the element carrying it with
`data-copy-role`; the shared shell (`page-shell.ts`, `design-tokens.ts`)
marks the nav, skip link, eyebrow, title, lede, legend and footer the same
way, so the role is machine-readable in the served HTML. Decisions: (a) the
seven group ledes from 3.1 were removed — each group header is one heading
and nothing else, since a lede saying what the group is about was connective
prose about the surface; (b) the relationships lede is the table sentence
"Each claim above stands alone; the links below say how far the evidence
reaches between them." (project-fact); (c) the capability scope instruction
is the one POC-bound entry (`data-scope="poc-bound"`) and the shell lede is
a second scope-instruction without the bound, so "at most one entry stating
the POC bound" is checked as a count of that attribute; (d) a string's role
is its innermost declaring ancestor, so a tuple inside a project-fact row
keeps `epistemic-disclosure` because the tuple span declares it itself — the
oracle additionally requires every `claim-tuple`/`unknown-disclosure`
element to declare that role directly; (e) templated sentences (counts,
reasons, paths) are not table rows, so the oracle sweeps rendered text, not
the table. The oracle (`polaris-copy.test.ts`) is a plain stack extractor
over the served HTML with its own word counter, role set, word limits
(headings ≤6, ledes ≤20) and prohibited regex, run over five fixtures
reaching all four shape arms (`not-evaluated`, `not-admitted`,
`observation-failed`, `observed` with and without an excluded body). Its
falsifiers are exercised by a meta-narration counterexample that must
trigger every rule (unclassified, unknown role, multiply classified,
heading/lede over limit, prohibited term, second POC-bound entry, POC-bound
with the wrong role, two action labels on one control, tuple without the
disclosure role). The table check restates by hand the six rows the fixtures
cannot reach (deferred, limit-breaches, no-route, missing-statement,
declarations-kept, no-body-read) and fails if one becomes reachable. Eight
hand mutations of the renderer and shell (dropping a role from the tuple,
the Unknown disclosure, a statement and the nav; a prohibited word in a
heading; a second POC-bound entry; a group lede; a role outside the set)
are all killed. The 3.1 copy-bounds test is superseded and removed.

**P3.4 note (task 3.4, syzygy-1z3.12, 2026-09-04).** The one OpenSpec change
the POC follows is now a distinct machine type on the shared model,
`PocModel.proposedWork` (`packages/three-surface-poc-core/src/proposed-work.ts`),
never an entity, a project-account statement or a catalog item. It carries
the change id and amended spec directory parsed from the delta path, the
proposal and delta artifacts (path, revision, digest), a lifecycle state read
from the exact tree listing already on the model (`active` when
`openspec/changes/<id>/` is present and no archived copy is, `archived` when
only an archive copy is, Unknown when both, neither, or no tree), and the
current authority it would amend: the project shape's own `baseline-spec`
item for that directory (identity and tuple preserved, PWB-REQ-011) or
Unknown with the shape's reason and route (`unconsented-source-or-provider`
when the shape was not evaluated, `missing-declaration` when the observed
shape has no such spec). Polaris renders it exactly once, inside the
capability-detail group after the entity sections, as a labeled section
("Proposed change — not current authority.") whose current-authority part
comes first and whose proposal part follows, adjacent. The capability's
relationships list moved from the evidence group into capability detail, so
no proposed identity is rendered outside that group; the 3.2 byte-identity
guarantee now covers the entity sections, the proposal part and the
relationships separately, with only the current-authority part allowed to
follow the shape. The oracle (`polaris-proposed-work.test.ts`) restates the
proposed identities by hand from the fixture repository's OpenSpec artifacts
and checks, over unevaluated, observed-without-baseline and
observed-with-baseline shapes, that none appears in the project-level or
evidence slices, that the section appears once with lifecycle and label,
that the current authority shares the catalog item's claim id and rendered
tuple, and that the machine answer carries the same identities. Eleven hand
mutations (proposal rendered in the overview, before the entities or in the
evidence group; label dropped; parts swapped; Unknown authority rendered as
Observed; archived read as active; contradiction ignored; prefix matching a
longer change id; any baseline spec accepted; wrong Unknown reason) are all
killed. No Butlers body is read: lifecycle uses tree paths and the
artifacts were already hashed by the proving slice.

**P3.5 note (task 3.5, syzygy-1z3.13, 2026-09-04).** Every Polaris claim
tuple now renders the complete PWB-REQ-007 set — label, tier, one primary
reason, closed secondary reasons, freshness, challenge state and evaluation
id — as data attributes plus visible text (`Label (primary; secondary) ·
tier · freshness · challenge`). Every Unknown reason is rendered beside its
route. Aggregates (the nine classes and the whole shape) disclose their own
tuple, then primary and secondary member Unknown-reason counts in two
separate lists, each row routed; the class statement names the declaring
sources instead of a count wall, and coverage counts (declared, modeled,
Unknown, contradicted, unreadable sources) sit only inside a `<details>`
element opened on demand. No headline status, maturity, success rate,
percentage or trend appears anywhere on the page.
`polaris-epistemic-tuples.test.ts` is the oracle with hand-typed
vocabularies (three labels, six tiers plus `unstated`, twelve reasons, four
freshness states plus `unstated`, `unchallenged`): every tuple is in
vocabulary and equal to the machine claim, every reason has a route, every
reason-count list equals the machine's separate primary/secondary maps, the
three coverage states reconcile to the known denominator, and a status
vocabulary regex matches nothing in the page text. Item-level Unknown and
secondary reasons are unreachable through the fixtures, so
`denominatorText` and `reasonCountsBlock` are exported and tested at the
seam. Rule-6 evidence:
`docs/evidence/pwb-p3-5-tuple-mutation-run-2026-09-04.json` (10/10 killed,
digest-verified restore).

**P3.6 note (task 3.6, syzygy-1z3.14, 2026-09-04).** Every owner-visible
narrative unit on Polaris (every element carrying a copy role, shell chrome
included) now carries exactly one claim role — `anchored-project-fact`,
`non-normative-framing` or `epistemic-claim` — plus `data-presentation-artifact`
and `data-non-citable`. Anchored blocks are registered during the render by
`apps/three-surface-poc/src/polaris-narrative.ts` (`NarrativeRegistry`): a
block names its claims and a deduplicated anchor set, each anchor typed by the
closed class set (doctrine, contract, requirement, decision, evidence, work),
bound to a revision, carrying a durable target identity (the registry's
git-tree-entry identity, a content digest, a tree or Dolt revision — never a
bare path, label or coordinate), the claims it supports, and the target's
captured label/tier/reason, cloned and deep-frozen at registration. Anchor
rules: entity/relationship provenance → class by provenance kind; shape claims
→ their support anchors as evidence (the baseline spec beside the proposal is
cited as requirement); the whole shape → the one evaluated tree; code
structure → the tree; work items → the Dolt revision; the proposal → its
proposal (work) and delta (requirement) digests. The machine form is an
`application/json` script placed before the first group (`polaris-narrative`),
distinct from the kernel claim tuple and from `/api/poc`, which is unchanged by
construction. **Superseded 2026-09-13** (bead `syzygy-dov.1`, the P-67 lane A
trim): the sentence before this one describes the page as it was until that
date; the in-page script is no longer emitted. The machine form is returned by
`renderPolarisPresentation` beside the HTML of the same render and served only
at the authenticated presentation route. Personal view state (`PolarisViewState.openCoverageCounts`) is a
render parameter that only toggles `<details open>`.
`polaris-narrative.test.ts` is the oracle (hand-typed roles and classes, an
independent claim-to-anchor re-derivation from the model JSON checking exact
covering and no surplus, ≤6 anchors per block, rendered cite per anchor,
captured-state equality, frozen registration, view state outside truth).
`polaris-authority-sweep.test.ts` is the downstream sweep over three
populations with denominators: every machine reference on the model and its
anchors; every OpenSpec warrant entry (all in hand-typed id families;
`POLARIS-DIR-*` entries are owner decisions); and every source/authority/
provenance-shaped line in the governance, spec, code and docs trees — zero
Polaris-surface targets. `[Unknown]` The Butlers-side reference population:
no Butlers body read is lawful for that purpose, so the Butlers half of the
sweep stays Unknown until a live run under the consented class provides it.
Rule-6 evidence: `docs/evidence/pwb-p3-6-narrative-mutation-run-2026-09-04.json`
(17/17 killed, digest-verified restore).

P3.7 implemented 2026-09-04 (task 3.7, PWB-REQ-015, `syzygy-1z3.15`).
`capability-detail.ts` owns the data side of the deep dive: the closed band
vocabulary (`argument` / `contract` / `reality`) with one authority class each
(`authored-non-normative` / `referenced-verbatim` / `kernel-computed`),
`deriveCapabilityDeepDives(model)` (one dive per capability entity; adoption
read from the observed tree — `adopted` when the shape holds the baseline
spec, `draft` when it does not, Unknown otherwise; proposals from
`proposedWork`; exclusivity `not-captured` because the model captures no
OpenSpec exclusivity declaration, so every proposal is its own future),
`resolveVerbatim` and the `DeepDiveLedger`. `polaris.ts` composes the HTML:
every `<section>` inside the dive carries exactly one `data-band` plus its
class and is recorded in the ledger; the machine form (`deepDives` on the
PWB-REQ-014 narrative script) lists the band population, the intent leaf and
verbatim state, and each proposal as `anchorable:false, statusBearing:false`.
Base is the only mode (`data-reading-mode="Base"`, reality band always
rendered); the proposed-scenario mode (RFC7-26) is outside this change.
Verbatim requirement text: the plan said "loaded from the owning artifact at
render, never stored". The leaf is the baseline spec at the shape's revision,
which lies outside the consented `declared-project-shape-text` class, so
production passes no reader and the contract band discloses
`unconsented-source-or-provider` beside the leaf's captured identity
(`PolarisRenderInputs.verbatim` is the render-time seam; bytes are rendered
only when they hash to the captured git object id / sha256, are NUL-free
UTF-8, and appear once on the page, never in the machine form or the model).
`[Unknown]` The live rendering of real Butlers requirement text stays Unknown
until an act extends consent to that class. (Superseded 2026-09-05 by the
C5 note: the truth-and-readiness amendment's PWB-REQ-011 authorizes the
transient selected-requirement route over the already-consented population;
live rendering is now Observed.) Doctrine and non-goal parts are
Unknown `missing-declaration` (the consented grammar declares no capability →
doctrine/non-goal link) or the shape's own reason when the shape is not
observed. Proposals moved from an anchored block to a non-anchored,
non-status-bearing block (RFC1-22): no `data-anchor-*`, no narrative block, no
tuple; artifacts cited by digest as `data-proposal-artifact`; each proposal is
a `data-candidate-future` with `data-exclusive-with` from declared groups.
`polaris-capability-detail.test.ts` is the oracle (hand-typed bands and
classes, a stack walk over every `<section>` for one-band-per-block and
enclosure, machine-form population equality, byte-equality of rendered text to
the fixture repository's own baseline bytes, fail-closed forged/unreadable/
binary readers, draft vs adopted from the model's own lookup, proposal
non-anchorability against the whole anchor population, the two-incompatible-
proposals sweep case through the exported `renderCapabilityDeepDive` seam,
and a static-source sweep over every non-test `.ts` under `apps/` and
`packages/` for requirement/scenario/doctrine/non-goal grammar in string
literals — zero offenders). Rule-6 evidence:
`docs/evidence/pwb-p3-7-bands-mutation-run-2026-09-04.json` (18/18 killed,
digest-verified restore).

P3.8 implemented 2026-09-04 (task 3.8, PWB-REQ-011/016/020, `syzygy-1z3.16`).
Polaris now opens with a depth list (`<nav class="depth-nav">`, labelled by
its own visible line) of native links in document order: summary (the four
account groups), catalog (the catalog group and each of its five class
sections), detail (the capability group and each deep dive, which now carries
`id="polaris-deep-dive-<capability>"`), exact source (evidence group, sources,
exclusions, contradictions, gaps — a level lists only what that shape state
renders). Every gaps-list entry carries `id="polaris-gap-<reason>"`, and every
other mention of an enumerated reason (`unknownRoutes`, `reasonCountsBlock`,
the deep dive's Unknown lines) links to it; a reason the page does not
enumerate stays text, never a link to nothing. Contradiction entries carry
`id="polaris-fact-<claim>"` and each kept declaration's anchor links to its
source row when the page carries that source. Wide tables render inside a
`role="region" tabindex="0" aria-labelledby=<heading id>` container so a
keyboard-only reader can scroll them. The page's link targets are module
state (`activeTargets`) computed once per render from the shape population
and cleared with the registry. (Superseded 2026-09-05 by the C4 note: the
`rules`/`statedDeclarations` injection seam is removed; the reachability
test reaches the contradiction path through a fixture root whose stated
staffer count has no admitted table to decide it.) `polaris-reachability.test.ts` is the
oracle with its own tag scanner and CSS sweep: no dangling internal link and
no duplicate id in four shape states; the four depths in document order over
the exact target population; the PWB-REQ-011 category sweep from depth list to
class section to item row to the source row whose identity and claim id equal
the machine answer (path count equals the model's Observed leaf count); gaps
and contradiction multisets equal the oracle's own count from the serialized
model, with every reason mention linked and every declaration anchor linked;
no `on*` handler, no button, tabindex only `0`, every scroll region named by
a rendered heading, `:focus-visible` outline present, and no `outline: none`,
`display: none`, `visibility: hidden`, absolute/fixed positioning, float,
`order`, or reversed flex outside the skip link; every element of each
colour-bearing class (`unknown-disclosure`, `proposal`, `band`, `claim-tuple`)
names its state in text. `[Unknown]` stayed as §9 recorded until P4.4 (below)
added the browser-driven focus-order and accessibility-tree traces; the
keyboard-only cold-open walkthrough remains manual evidence (PWB-REQ-016's
record). Rule-6
evidence: `docs/evidence/pwb-p3-8-reachability-mutation-run-2026-09-04.json`
(19/19 killed, digest-verified restore).

P4.1 implemented 2026-09-04 (task 4.1, PWB-REQ-022 plus the per-requirement
behavior-test sweep, `syzygy-1z3.17`). `walkthrough-judgment.ts` is the
PWB-REQ-022 evaluator over the pair (execution record under
`.syzygy/governance/records/`, owner judgment under
`.syzygy/governance/decisions/`): outcome `absent` (2 cases: no run record,
no judgment — a judgment without an owner act counts as no judgment),
`unlawful` (the closed 84-case population: 2 governance-home, 15 run-record
field, 12 judgment field, 55 common act cases restated from PWB-REQ-005 in
the same predicate order, recording exactly `verdict-unlawful`, Unknown
never met, no verdict, an RFC3-16(a) contradiction) or `lawful` (the owner's
verdict carried as `recorded-human-judgment` with exact state label, the
state-(1) sentence from `authority-disclosure.ts`, and
`independentlyVerified` true only for state (2)). Design readings recorded
here: the judgment's exact run-record reference is `<identity>@<sha256>`,
which transitively binds the surface version and evaluation identity the
record names; the verdict field is `<criterion>=met|not-met`, so "wrong
but present" is a verdict on another criterion; a rationale is "wrong" when
it reasons about a different walkthrough-record identity; traversed paths
are "wrong" when one lies outside the controlled route population. The 55
common predicates are deliberately duplicated rather than shared with
`body-read-authority.ts`, so the body-read risk floor and its act-bound
mutation evidence stay byte-identical. State (2) stays unreachable in
production (`JUDGMENT_CORRELATION_UNAVAILABLE`); history is append-only
(`appendJudgmentEvaluation`). The test hand-types all 84 + 2 cases and the
two state labels/disclosure, never importing the vocabulary, and reads the
evaluator source as text to prove one predicate per case. Behavior-test
sweep: every PWB-REQ id in the spec (17) now names at least one test file;
PWB-REQ-021's comprehension oracle is the owner's, so its code-side test is
the PWB-REQ-022 pair evaluator and its evidence is the P8 record. Not wired
into the model or Polaris yet (4.6/4.3 own that). Rule-6 evidence:
`docs/evidence/pwb-p4-1-judgment-mutation-run-2026-09-04.json`.

P4.2 implemented 2026-09-04 (task 4.2, the consolidated rule-6 mutation
sweep, `syzygy-1z3.18`). `apps/three-surface-poc/src/pwb-mutation-sweep.ts`
is one re-runnable plan over the nine mutation classes the task names, each
a group with its own subject files, independent test files and mutations:
source denominator (PWB-REQ-001: a named-but-absent file, an unreadable
pillar index and a non-blob source dropped from the manifest/observer
population), coverage partition (PWB-REQ-002: the contradicted partition
zeroed, a class denominator numbered over an Unknown source, a count fact
modeled over an Unknown denominator), precedence guard (PWB-REQ-004: the
anchor-population check removed, "last declaration wins" without a rule,
disagreeing rules letting the first decide), secret sentinel (PWB-REQ-003:
no detector matching, `lastIndex` not reset), capability-first regression
(PWB-REQ-010: the one-capability scope marker dropped, the retired framing
marker restored, capability detail rendered above the catalog), meta-copy
prohibition (PWB-REQ-012: a heading naming the page, the epistemic notice
misroled), every admission invalid case with exact state, exact
disclosure, no fallback and append-only history (PWB-REQ-005: task 2.5's
86 predicate sites and 11 literals reused verbatim), every judgment invalid
case with the same four properties (PWB-REQ-022: 84 case predicates, the
history guard and 13 literals) and parity markers (PWB-REQ-020: markers
renamed or dropped on Polaris, Trajectory, Orrery and the home tables).
`pwb-mutation-sweep-main.ts` (`npm run poc:pwb-mutation-sweep`, `--group`
/ `--only` to narrow) runs each group's baseline green, applies one
mutation at a time, runs only that group's tests, restores and
digest-verifies the subject, and records the failing test names beside the
must-fail names; `pwb-mutation-sweep.test.ts` keeps the plan applicable
(every fragment occurs exactly once, every class has one group, the
predicate subjects still expose 86 and 85 sites). The first full run found
four survivors: two were wrong must-fail names (the coverage suite killed
the mutation through another test), two were real oracle gaps, repaired
in the tests rather than waived — the copy oracle's disclosure-role rule
did not cover the page notice, and no test compared the anchor digest
shown beside a citation with the source's exact digest in the machine
answer. Evidence: `docs/evidence/pwb-p4-2-mutation-sweep-2026-09-04.json`
(per-class denominators, per-mutation failing tests, digests before and
after).

P4.3 implemented 2026-09-04 (task 4.3, exhaustive Polaris parity with the
authority and judgment states, `syzygy-1z3.19`). The one `PocModel` now
carries `walkthroughJudgment`: either `not-evaluated` with a stated detail
(what the daemon serves until 4.6 records a run/judgment pair) or the
PWB-REQ-022 evaluation of an injected pair, computed inside
`buildButlersPocModel` so `/api/poc` grows by construction. Polaris renders
the body-read authority line (one `authority-state` marker per authority,
the mode, the evaluation id) beside every shape state that carries one, and
a walkthrough-judgment section whose every field — kind, verdict, judging
party, evidence kind, state label, independent-verification flag, the
state disclosure sentence, act identity and instant, both digests, run
record identity/mode/surface version/evaluation identity, every traversed
path with repeats kept, rationale, or the absent/unlawful case and
contradiction — is a leaf parity marker. The new
`polaris-parity-sweep.test.ts` is the independent oracle PWB-REQ-020 asks
for: it parses the rendered page back with its own extractor (no
production vocabulary or rendering import), projects the machine answer
itself, and compares every marker family as a multiset, reporting both
denominators, across a 5 × 6 matrix (not-evaluated, not-admitted,
observation-failed, observed and a degraded observed variant in which one
phase-B body read fails, so Unknown sources, reason counts and gaps are
exercised; times six judgment states including a fixture-only state (2)).
Two honest scoping rules are written into the oracle: the presented claim
population omits the reconciled facts (their content reaches the reader
through item rows and class aggregates; only contradictions are presented
as facts) and the project-account-section items (presented once as the
account's own section claims), and the two capability-slice region cites
(`git-ls-tree`, `beads-dolt`) are admitted only while the machine's
region is observed. The mutation sweep's parity-markers group gains four
classes × five kinds (fact, authority-state, judgment-state, disclosure ×
missing, duplicated, changed, collapsed, wrong-evaluation) as exact-fragment
mutations of `polaris.ts`, each named to the matrix cell that must fail.
The first run left two survivors: an equivalent authority-state mutation
(rewritten so it always changes the text) and a collapsed Unknown
relationship disclosure that the one-directional disclosure check could
not see — repaired in the oracle, which now also compares the machine's
Unknown relationships and entities against the rendered disclosures as
multisets. Evidence (26/26 killed):
`docs/evidence/pwb-p4-2-mutation-sweep-2026-09-04-parity-markers.json`.

P4.4 implemented 2026-09-04 (task 4.4, keyboard/non-visual navigation and
WCAG AA contrast measured in a real browser, `syzygy-1z3.20`). The §9
"needs a browser driver" gap is closed without a new dependency:
`apps/three-surface-poc/src/cdp-browser.ts` launches a locally installed
Chrome/Chromium headless (`SYZYGY_POC_BROWSER`, else the first of
`google-chrome`/`google-chrome-stable`/`chromium`/`chromium-browser` on
PATH; nothing is downloaded) and speaks the DevTools protocol over Node's
own WebSocket. `polaris-accessibility.ts` is the PWB-REQ-016 oracle outside
the renderer: it enumerates the focusable population from the live DOM
(links, disclosure summaries and `tabindex="0"` regions only — any other
focusable or any `button` role in the accessibility tree is a violation),
presses real Tab keys until the sequence wraps and requires the trace to
equal the population in document order with no trap, mirrors it with
Shift+Tab, requires a visible focus outline with a 3:1 indicator on every
stop, activates every fragment link with a real Enter press (target must
exist, become `:target`, and the next Tab must land on the first focusable
after it — or lawfully wrap when none follows), reads the browser's own
accessibility tree (every link, heading, region and navigation named; link
count equal to the DOM's), and measures WCAG AA contrast for every rendered
text element plus every targeted row against the composited backdrop
(ancestor background colours with alpha, forking at gradients and judging
against the worst candidate; 4.5:1, or 3:1 for large text). Every check
reports its denominator. `polaris-accessibility-variants.ts` renders six
Polaris pages from the in-memory fixtures (observed; observed with a lawful
state-(1) judgment; degraded with an unlawful judgment; not-admitted;
observation-failed; not-evaluated) and names every rendered group and deep
dive as a required target; `polaris-accessibility.browser.test.ts` is
`describe.skipIf`-gated on a browser (skipped is never reported as
passed) and `npm run poc:accessibility-check` writes the evidence
(`docs/evidence/pwb-p4-4-accessibility-browser-run-2026-09-04.json`:
browser identity, commit, per-variant traces, activations, tree counts,
contrast minima). The first measured run found one genuine defect: the
coverage-counts `<summary>` disclosure was focusable but outside the
`:focus-visible` rule, so its default outline measured 1.01:1 on the dark
ground; `design-tokens.ts` now styles `summary:focus-visible` with the same
3px focus outline. The daemon never imports the driver or the checker;
no Butlers repository is read. Rule-6 evidence:
`docs/evidence/pwb-p4-4-accessibility-mutation-run-2026-09-04.json`
(ten mutations of `design-tokens.ts`/`polaris.ts` — the summary fix
reverted, `outline: none`, low-contrast focus/muted/lede colours, a
renamed skip-link target, an unfocusable scroll region, a broken source
link target, a link given `role="button"`, a dropped depth-nav group
link — each run against the browser check with digest-verified restore).
Hosted CI's runner ships Chrome, so the gated suite runs there; the
keyboard-only cold-open walkthrough record (PWB-REQ-022) remains the
owner's manual evidence and is untouched by this automation.

P4.5 implemented 2026-09-04 (task 4.5, the fresh-checkout demonstration,
`syzygy-1z3.21`). `apps/three-surface-poc/src/fresh-checkout-demo-main.ts`
(`npm run poc:fresh-checkout-demo -- --repo <butlers>`) is a separate,
manually invoked binary — the daemon never imports it — that clones this
repository's `HEAD` into a temporary directory (tags included, so the P1
gate can see the `pwb-*-signed-*` recording tags), runs `npm ci`, `npm run
build` and the whole Vitest suite with a JUnit reporter, starts the
clone's own built daemon against the one configured Butlers repository
with a throwaway state directory, and fetches `/`, `/polaris`,
`/trajectory`, `/orrery` and `/api/poc` (once without a credential, once
with the minted bearer token). It then compares the Polaris claim tuples
with the machine answer's presented claim population under the 4.3
oracle's rule (reconciled facts and project-account-section items are
folded into their account statements; contradictions render as their own
claims). The committed evidence
(`docs/evidence/pwb-p4-5-fresh-checkout-demo-2026-09-04.json`) carries
commits, timings, exit codes, test totals read from the JUnit root tag
only, route statuses and byte sizes, the parity counts, and a body-free
summary of the project shape (authority verdict without act digests,
counts, class denominators, source paths with label and reason,
exclusions counted by reason). The full route bodies and the JUnit file
are retained only on the recording machine under
`~/.local/state/syzygy/pwb-p4-5-fresh-checkout-demo-2026-09-04/`
because they carry the act arguments (CG-7e) and Butlers text (the
consent excludes egress; this repository is pushed to GitHub). The
Butlers pytest capture was deliberately not run: the demo's test
artifact is the clone's own suite, and `testArtifactVerification` stays
Unknown.

Live findings from the measured run, `[Observed]` against Butlers `HEAD`
at the recorded revision from a clone of `7de2f68`: install, build and
the suite (1212 tests, no failures) exit 0; the daemon exits 0 with an
empty stderr; all five routes answer 200 and the machine route answers
401 without a credential. The P1 gate admits in `owner-trusted-bootstrap`
mode with all three authorities in state (1) — the shape is `observed`.
Of 256 sources, 122 are Observed and 134 Unknown, every Unknown with
reason `excluded-content`: 132 sources are excluded as `active-content`
under the act-bound policy and one by the `known-token-formats` detector.
The excluded set includes the lay-and-land pillar index, so that pillar's
named files are Unknown and the observation is degraded as a partial
snapshot; the heart-and-soul pillar's index is also unknown. Design
contracts (29) and craft policies (7) have fully known denominators;
baseline specs have 76 modelled items over an Unknown denominator (107
excluded sources), roster identities 5 over 7 excluded, and the one
topology-component source is excluded. All six project-account statements
are Unknown with `missing-declaration`, so the whole-shape claim is
Unknown. 126 facts reconcile with no contradiction and no precedence rule
was needed. Parity: 389 Polaris claim tuples over 389 presented machine
claim ids, no human-only and no machine-only id; the 126 reconciled facts
are the whole omitted-by-design count. These answer §9's grammar
question as recorded findings for the 5.x review/repair cycle, not as
defects fixed here: the active-content rule is the act-bound policy's and
changes only by a new act; whether the pillar-index grammar mismatch is a
grammar question or an expected exclusion is for the review to say.

P4.6 prepared 2026-09-04 (task 4.6, the owner cold-open walkthrough,
`syzygy-1z3.22`; the walkthrough and judgment themselves are the owner's and
remain pending). The agent-side deliverables: `apps/three-surface-poc/src/
walkthrough-inputs.ts` is the daemon's loader for the PWB-REQ-022 pair,
mirroring `governance-inputs.ts` (same artifact, act-record, recording-tag
and lifecycle classification — those helpers are now exported from the
body-read loader rather than duplicated). Its controlled expectations are
the `PWB_WALKTHROUGH_SCHEDULE` table: serial identities
(`PWB-WALKTHROUGH-001`, act `PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-001`, tag
`pwb-adopt-walkthrough-judgment-signed-001`, phrase prefix `ADOPT POLARIS
COLD-OPEN WALKTHROUGH JUDGMENT`), the criterion
`polaris-cold-open-comprehension`, keyboard-only mode, the five human
routes as the surface population, both governance homes, and an
`evaluationIdentity` the recording session fixes when it writes the run
record (the daemon's own evaluation id carries colons and is not a
run-record identity, so the record names a slug for the run the owner
read). `main.ts` now evaluates the pair on every model build; an absent
record evaluates as `absent` (Unknown, never met) and only a loader throw
leaves `not-evaluated` with the failure named. The real-tree test pins the
current state — no run record exists — and refuses to pass by accident
once one does. Rule-6 evidence:
`docs/evidence/pwb-p4-6-walkthrough-inputs-mutation-run-2026-09-04.json`
(7/7 killed: run record read from the wrong home, act text ignored, tag
assumed resolved, A1 expected present, lifecycle ignored, judgment home
moved, mode changed). The state and invalid-arm sweep the task names is
`walkthrough-judgment.test.ts` (84 + 2 cases, both valid states, state-(2)
no-fallback, verified this session) and the 4.3 parity matrix's five
judgment states. The owner packet is
`.syzygy/governance/contracts/candidates/pwb-walkthrough/OWNER-WALKTHROUGH-PACKET.md`:
the nine prompts (RFC7-30's six plus PWB-REQ-021's two additions and the
strength prompt), the keyboard-only rule, what to send back, and the five
recording steps. Recording-session steps still to do once the owner
replies: write the run record and set the evaluation slug; draft the
judgment from the owner's words; register the act phrase and its packet
copies in `check_governance.py` (`_act_subjects`, `ACT_DIGEST_COPY_FILES`)
before the finalized packet quotes a digest; record the act, tag and
aggregate row after the owner performs it; re-pin the real-tree test.

Nothing lands in `openspec/**` or `.syzygy/**`. The walkthrough execution
record (PWB-REQ-022) is a governance record written by the recording
session, not by the daemon; the owner judgment is an owner act prepared as a
packet, the same way task 1.7 was.

## 3. The body-read gate

This is the risk-floor of the change: no body is read unless a pure
evaluation of the three act-bound artifacts and their act records admits it.
Design so the spec's falsifier "any body is read before all three acts are
effective" is structurally hard to violate:

```mermaid
flowchart LR
    G["governance-inputs.ts<br/>three artifacts + three act records<br/>present | missing | unreadable | malformed"] --> P["owner-act-record.ts<br/>fields present | missing | malformed"]
    P --> E{"evaluateBodyReadAuthority<br/>pure; first failing predicate names the case"}
    E -->|admits false| U["project-shape Unknown<br/>zero reads"]
    E -->|admits true| O["project-shape-observer.ts<br/>reader may run"]
    E --> D["authority-disclosure.ts<br/>one renderer for state text"]
```

1. **Inputs are files, not flags.** `governance-inputs.ts` resolves the
   observing checkout root (the same root `pocObserverInputsAreClean`
   already inspects), then reads exactly:
   - the three act-bound artifacts (consent record, policy JSON, registry
     entry);
   - their three dedicated act records under `decisions/`.

   Each read yields `{kind:'present', bytes, sha256}` or a typed failure
   (`missing`, `unreadable`, `malformed`). A `repoRoot` option plus
   injectable `readFile` / `listDirectory` / `runGit` serve hermetic tests
   (replacing the planned `--governance-dir` flag).
2. **The act record is parsed, never trusted.** `owner-act-record.ts`
   extracts the labelled fields the 2026-09-02 records carry: act identity,
   act type, project identity, artifact identity, exact digest, provenance
   state, supersession/revocation, A1 identity or explicit absence, owner,
   date, ceremony phrase, recording tag.
   - Each field is `present | missing | malformed`; the parser owns no
     notion of validity.
3. **Evaluation is a pure function.** `evaluateBodyReadAuthority(inputs) →
   { admits: boolean; consent: AuthorityState; policy: AuthorityState;
   registry: AuthorityState; contradiction?: … }` where `AuthorityState` is
   `valid(state-1 | state-2) | invalid(caseId) | absent(artifact-missing |
   artifact-unreadable | act-record-absent)`; `absent` is a non-admitting
   outcome outside the 195 present-invalid cases. Per authority it checks,
   in order:
   1. false substitutes first (a record that is only a tag, commit,
      sign-off, machine submission or agent assertion has no fields to
      judge);
   2. then the nine RFC3-16(b) items (RFC3-16(b) item 3 by recomputing the artifact's
      SHA-256 from the bytes just read and comparing to the act argument, so
      an edited artifact is "wrong but present digest");
   3. the association (act record names this artifact);
   4. the provenance-state input;
   5. lifecycle (stale, expired, superseded, revoked);
   6. state mechanics (state (1) explicitly selected; A1 explicitly absent
      for state (1); claimed state (2) needs successful correlation);
   7. state-(1) record semantics (phrase and recording tag present,
      well-formed and matching);
   8. then the authority-specific fields (consent subject pair and content
      class; policy-owning project and version; registry home, project,
      repository, read-only authority and empty write surface).

   The first failing predicate names the case; every predicate is
   independently reachable. `[Observed]` 2026-09-03: 85 predicate sites — 55
   common ones shared by the three authorities (× 3 = 165 instances) plus 30
   authority-specific — carry the 195 case instances; there is no bucket.
4. **State (2) is unavailable in this repository.** `[Observed]` No RFC5-25
   audit trail exists.
   - Correlation is an injected function whose production value returns
     `unavailable`; any record claiming state (2) is therefore invalid today
     and never falls back to state (1).
   - Tests inject a `succeeded` correlator to exercise the four
     state-(2)-bearing valid triples and a `failed` one for the no-fallback
     scenarios.
5. **Zero reads unless admitted.** `project-shape-observer.ts` receives the
   authority result and the reader; its first statement returns a
   project-shape Unknown (reason from the registry's
   `admissionFailureMapping`, the RFC3-16(a) contradiction attached) when
   `admits` is false.
   - The reader is an injected spy in every test; the read count is asserted
     zero in each of the 195 cases.
6. **Exact state everywhere.** `authority-disclosure.ts` is the only place
   the per-authority state text and the exact state-(1) sentence are
   rendered; Polaris, the home page and `/api/poc` carry the same strings.
   - State (1) renders exactly the sentence PWB-REQ-005 quotes; nothing may
     say "verified" for it.
   - Evaluation history is append-only per evaluation: a later correlation
     produces a new evaluation and never rewrites an earlier one's recorded
     state.

## 4. Containment, classification and extraction

Each admitted path passes a read guard, then classification, then literal
extraction, then coverage; a failure leaves the source counted and Unknown,
or excluded whole — never a partial item set.

```mermaid
flowchart LR
    RG["Read guard<br/>git-object-reader.ts"] --> CL["Classification<br/>content-classification.ts"]
    CL -->|any failure| EX["Whole-artifact exclusion<br/>hash, never body"]
    CL -->|admitted| XT["Extraction<br/>project-shape-extraction.ts"]
    XT --> CV["Coverage and precedence<br/>project-shape-coverage.ts"]
    CV --> M["PocModel.projectShape (§5)"]
    RG -->|resource-limit breach| UK["Counted, Unknown<br/>source-uncaptured-or-unreachable"]
```

- **Read guard** (`git-object-reader.ts`): a path is admitted only if it
  - is relative, NUL-free, and contains no `.`/`..` segments after POSIX
    normalization;
  - resolves to a `blob` entry (mode `100644`/`100755`) in the exact
    revision's tree — so symlinks (`120000`) and submodules (`160000`) are
    rejected by mode, without touching the working tree;
  - and its normalized final segment passes the policy's denied basename,
    prefix and suffix rules.

  The registry's `resourceLimits` block is an evaluation input: source
  count, per-source and total bytes, index depth, parse time and rendered
  bytes; a breach leaves the source counted and Unknown with reason
  `source-uncaptured-or-unreachable`.
- **Classification** (`content-classification.ts`) follows the policy's
  `classificationOrder` literally over transient bytes: membership in phase
  A seed or phase B manifest → denied path / strict UTF-8 / NUL → every
  detector (the detectors are executed from the policy document's own
  strings, so the policy version is the input) → extraction class assigned
  by the manifest → whole-artifact exclusion on any failure → admit parsed
  facts only.
  - Exclusions carry
    `{contentDigest, repositoryRelativePath, policyId, policyVersion, detectorId | exclusionReason}`
    with redaction class
    `excluded-artifact` or `unclassifiable-excluded`; `redacted-span` is
    never emitted.
  - Raw bodies are never stored, logged, rendered or served.
- **Extraction** (`project-shape-extraction.ts`): one function per item
  class implementing the spec grammar exactly; keys are literal after NFC.
  - Any missing heading, malformed row/list/TOML, duplicate key or ambiguous
    leading label makes that source's item denominator Unknown (no partial
    set).
  - Identity is `(item class, declared key)`; path and digest are anchor
    state.
- **Coverage and precedence** (`project-shape-coverage.ts`):
  - **Denominators:** the source-path denominator comes from Git and phase A
    and never shrinks; the item denominator per admitted source; states
    modeled / Unknown / contradicted summing to D per class.
  - **Conflicts:** a conflict between two admitted declarations is resolved
    only by a precedence rule that Butlers itself declares and the model can
    cite by source anchor; otherwise both anchors are retained and the fact
    is Unknown with reason `contradicted-pending-adjudication`.
  - `[Unknown]` Whether Butlers declares any such rule; the first live run
    answers this and the design's known eight-versus-nine domain-butlers
    conflict is the first fixture either way.

## 5. Model and surfaces

The shared `PocModel` gains the project-shape and walkthrough fields, and
Polaris renders only from it, with every owner-visible string in one copy
table.

- `PocModel` gains `projectShape` (authority evaluation with per-authority
  state and disclosure, manifest identity, source coverage, items,
  contradictions, exclusions, per-class counts, project-account statements
  with their epistemic tuples) and `walkthroughJudgment`.
  - Epistemic tuples reuse cap1-core's `EpistemicState` and six rendering
    tiers rather than a new vocabulary; Unknown reasons are RFC2-24 strings
    verbatim.
- New provenance kinds: `project-shape-source` (path at revision, blob
  digest) and `owner-act` (record identity, artifact digest, state).
- Polaris renders the seven project-level groups in RFC7 order, then
  capability detail with the existing WhatsApp slice under it (argument /
  contract / reality bands, verbatim requirement text loaded from the
  owning artifact at render, never stored).
  - Every owner-visible string is a row in `polaris-copy.ts` with exactly
    one role; headings ≤ 6 words, ledes ≤ 20, prohibited words rejected at
    test time by an independent extractor.
  - The existing "movement" scaffolding is removed from Polaris entirely.
- Every project-shape fact, authority state, judgment state and disclosure
  carries a `data-parity-field` marker so the sweep in §6 can count both
  channels.

## 6. Verification design and denominators

Every denominator is checked by a test built independently of the code it
checks, every authority predicate has a mutation proof, and every claim
rests on a retained record.

| Denominator | Where | How it is made independent |
|---|---|---|
| 8 valid authority triples | `body-read-authority.test.ts` | hard-coded expected table; fixtures are hand-written act records; the test never imports the validator's case vocabulary |
| 195 invalid admission cases | same file, one `it` per case id | fixture generator mutates one field of a valid triple per case; expected outcome and read-spy count 0 hard-coded; case ids are the spec table rows, not implementation names |
| 84 present-invalid + 2 absent judgment cases | `walkthrough-judgment.test.ts` | same pattern; `verdict-unlawful` literal hard-coded |
| Source denominator and two-extractor agreement (REQ-001/002) | `project-shape-extraction.test.ts` (fixtures) and `project-shape-observer.live.test.ts` (real Butlers, `SYZYGY_POC_BUTLERS_REPO`-gated) | the second extractor is a regex-based implementation written inside the test; Git tree listing is obtained by the test's own `git` call |
| Fault sweep (REQ-003/006) | `content-classification.test.ts`, `git-object-reader.test.ts` | injected faults, sentinel strings, sink scans over model JSON, HTML, logs and state dir |
| Copy oracle (REQ-012) | `polaris-copy.test.ts` | plain text extraction from rendered HTML with an independent word counter and prohibited-term set |
| Parity sweep (REQ-020) | extend `routes.test.ts` into a multiplicity-preserving comparator over every marker class, reporting both channel counts | comparator imports no production vocabulary |
| Anchor covering and non-citability (REQ-014) | `polaris.test.ts` + a static-source sweep for downstream citations of Polaris | expected spans from captured artifacts |

**Mutation proofs** (rule 6; REQ-005/020/022 demand one per case). Each
predicate in the two authority evaluators and each parity marker class
carries a `// mutation-point: <case-id>` comment.

- **The REQ-005 tool:** `apps/three-surface-poc/src/pwb-mutation.ts` (pure
  plan) plus `pwb-mutation-run-main.ts` (`npm run poc:pwb-mutation-run`;
  tooling, not shipped behavior).
- **Per mutation, it:**
  1. rewrites one predicate's condition to `false && (…)` (or applies one
     hand-listed literal mutation: exact-state collapse/inflation,
     failed-correlation downgrade, admits-always, contradiction
     suppression, history rewrite, duplicate append, forced "independently
     verified", altered state-(1) sentence);
  2. runs the two independent test files;
  3. requires every named case-instance test to fail;
  4. restores the bytes, and verifies the restore by digest;
  5. writes one record
     `{id, mustFail, observed, mustFailMissing, killed, restored}` per
     mutation with source digests before/after and the commit to
     `docs/evidence/pwb-mutation-run-<date>.json`.
- **Validity:** a run is valid only at a named commit and is retained as
  review evidence; it is never run against a dirty tree.
- **The recorded run:** the run that pattern names is
  `docs/evidence/pwb-mutation-run-2026-09-03.json`, at commit `c5f59361`: 97
  mutations planned — 86 predicate sites and 11 literals — 97 killed, 0
  survived, 0 restore failures, over `body-read-authority.test.ts` and
  `governance-inputs.test.ts`.
  - Those are the same 86 and 11 §"task 2.5" cites above; until 2026-09-05
    the figures travelled in this page's prose while the file holding them
    was named only by the `<date>` pattern, so a reader could not reach the
    record without guessing its name.

**Retained evidence** per slice: commit, `vitest run` transcript summary,
the three denominators reported separately, mutation-run file. Claims
without a resolvable record are not made.

## 7. Slices, order and bead mapping

Eight slices run in order, P1 to P8; the first real Butlers body read
happens in P4, only after P1's evaluator admits.

| Slice | Content | Beads | Requirements |
|---|---|---|---|
| P1 | act-record parser, body-read authority evaluator, governance-inputs loader, authority disclosure; 8 + 195 cases with mutation runner | syzygy-1z3.26 (gate every later slice depends on) | PWB-REQ-005 |
| P2 | read guard, exact-object reader, resource limits; phase A manifest | 1z3.2, 1z3.3, 1z3.4 | PWB-REQ-001, 006 |
| P3 | content classification and exclusions | 1z3.5 | PWB-REQ-003 |
| P4 | extraction grammar, coverage, precedence; live Butlers run (the first lawful body read) | 1z3.6, 1z3.7 | PWB-REQ-002, 004 |
| P5 | model extension, `/api/poc`, epistemic tuples | 1z3.8 | PWB-REQ-001…007, 020 |
| P6 | Polaris project account, copy table, capability detail bands, proposal subordination, anchors, keyboard reachability | 1z3.9…1z3.16 | PWB-REQ-010…016 |
| P7 | verification sweep: parity comparator, mutation runs, contrast/keyboard checks, fresh-checkout demo; walkthrough judgment evaluator | 1z3.17…1z3.21 | PWB-REQ-020, 022 |
| P8 | owner cold-open walkthrough (record + judgment packet), independent review, repair, confirmation, owner report | 1z3.22…1z3.25 | PWB-REQ-021, 022 |

Order P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8.

- **The first real Butlers body read happens in P4 and only after P1's
  evaluator, run against the real governance tree, reports an all-valid
  triple.** Until then every live test runs with the read spy and asserts
  zero reads.
- **Shared-model changes keep WIP one.**
- **Each slice lands with** its tests, its mutation evidence where the spec
  demands it, and a review at the classes below.

```mermaid
flowchart LR
    P1["P1 body-read gate"] --> P2["P2 read guard,<br/>phase A manifest"] --> P3["P3 classification"] --> P4["P4 extraction, coverage;<br/>first body read"] --> P5["P5 model"] --> P6["P6 Polaris"] --> P7["P7 verification sweep"] --> P8["P8 walkthrough,<br/>review, report"]
```

## 8. Risk classes and review bar

Risk-floor code — the read gate, the read guard, classification, the
judgment evaluator and the parity comparator — gets independent review on
frozen bytes with mutation evidence attached.

| Class | What falls in it | Review bar |
|---|---|---|
| Risk-floor | body-read authority evaluator and loader (REQ-005), read guard and reader (REQ-006), content classification (REQ-003), judgment evaluator (REQ-022), parity comparator (REQ-020) | independent fresh-context review on frozen bytes before merge; mutation evidence attached |
| Ordinary | extraction grammar, coverage, Polaris rendering, copy table | standard review; fixtures pin each grammar class |
| Trivial | tooling, tokens, non-semantic refactors | author-verified |

## 9. Known gaps and assumptions, stated now

Four observed items and one inferred assumption, each labelled.

- `[Observed]` (closed by P4.4, 2026-09-04) Automated keyboard traversal and
  WCAG AA contrast run in a locally installed Chrome/Chromium through the
  DevTools protocol with no new dependency and no download; where no
  browser is installed the suite is skipped and reported as skipped, and
  `docs/evidence/pwb-p4-4-accessibility-browser-run-2026-09-04.json`
  records the run that was measured. The keyboard-only cold-open
  walkthrough remains the owner's manual evidence.
- `[Observed]` (measured by P4.5, 2026-09-04) At the observed Butlers
  revision the root index and two pillar indexes match the literal grammar;
  the lay-and-land index and 131 other sources are excluded as
  `active-content` under the act-bound policy, and the heart-and-soul index
  is unknown, so the baseline-spec, roster and topology denominators are
  Unknown. The finding is recorded for the 5.x review; it does not license
  grammar or policy changes (those are spec and act amendments).
- `[Observed]` `.syzygy/governance/records/` does not exist yet; it is
  created by the recording session when the first walkthrough record is
  written, per RFC3-15's records category.
- `[Observed]` (2026-09-04) The walkthrough pair is absent: the daemon
  evaluates it as `absent` / Unknown-never-met until the owner performs the
  walkthrough and judgment offered in the P4.6 packet.
- `[Inferred]` The registry entry's `implementationVersion` is `1.0.0`; the
  observer reports that string and the entry's `discoveryVersion` as its
  identities so PWB-REQ-001's deterministic-input stamps match the adopted
  entry byte-for-byte.

## 10. Escalation back to the owner (from the act, restated)

Stop and return to the owner before:

- any doctrine or contract change;
- any amendment to the signed PWB artifacts (including the extraction
  grammar or the case tables);
- any change to security, privacy or retention posture beyond the adopted
  policy;
- any change to the registry entry's constraints or limits;
- any read outside the consented repository or content class;
- any scope beyond the signed change.

Everything else in stack and layout is settled by this plan and its ordinary
revisions.
