# Agent Instructions — Syzygy

Repository operating procedure for any agent session, in any harness. It is
**never citable as authority** and restates no digest, verdict, or act
history. What the project *is*: `README.md` and `.syzygy/intent/OVERVIEW.md`.
What state it is in: `PROJECT-STATUS.md`. Where they and this file disagree,
they win.

## Orientation

Syzygy is a specification-driven control plane: humans define what should be
true, evidence shows what is true, agents do bounded work to close the gap,
and the gap is always rendered honestly. Two planes:

- **Governed** — `.syzygy/**` (doctrine, decisions, policies, contracts) and
  `openspec/**` (specifications). Changes travel as reviewed semantic deltas
  and bind only by owner act.
- **Implementation** — `apps/**`, `packages/**`, `scripts/`, root manifests.
  Code goes here and only here.

Everything is stage-gated. Each authorization is a dated owner act or
direction under `.syzygy/governance/decisions/` (`ACCEPTANCE-ACT-RECORD.md`
owns acceptance and amendment transactions). `PROJECT-STATUS.md` says which
are in force. As of 2026-09-05: Capability 1 is implemented; a bounded,
non-release Three-Surface POC (Polaris, Trajectory, Orrery) runs against one
Butlers repository, whose PWB project-shape slice may read one consented
content class behind the P1 authority gate. Anything no act covers is
forbidden — before implementing, find the act.

## Where authority lives

| Question | Authority | Path | Status |
|---|---|---|---|
| Why — purpose, non-negotiables | Doctrine (VIS-1…7, SEC-1…5) | `.syzygy/governance/doctrine/` | Adopted, in force |
| Prior owner rulings | Decisions (SDR-1…37, acts, pending queue) | `.syzygy/governance/decisions/` | In force |
| Engineering and evidence bar | Craft-and-care (CC-*) | `.syzygy/governance/policies/craft-and-care/` | Owner-approved |
| The specification bar (CC-SPEC-1…11, CC-IMPACT-1…7) | Craft acts 6 and 7; CC-SPEC amended 2026-09-01 | `contracts/candidates/policy-candidates/` — **not** the craft-and-care directory | **In force.** Path, filenames and head banners all still say candidate; the acts bound those bytes and none may be corrected |
| Load-bearing how | Design contracts RFC 0001–0011 | `.syzygy/governance/contracts/` | 0001–0009 accepted; 0010–0011 candidate in `contracts/candidates/` |
| Intended placement | Topology bundle | `.syzygy/map/topology-candidates/` | Candidate |
| Public narrative | Overview | `.syzygy/intent/OVERVIEW.md` | Presentation, never authority |

`GOVERNANCE-SUBSTRATE-LOCK.yaml` is a record, never authority. **Cite by
identifier** (`VIS-2`, `SDR-9`, `RFC10-9`); identifiers are amended in place
or retired, never renumbered. `DIRECTIVE-REGISTER.md` (generated) says where
every identifier is defined, file and line, across all of these trees — use it
to find a clause, never to learn what one says. Candidate clauses, drafts, indexes, summaries,
and generated views are never authority.

## Task routing — context is compiled, never accumulated

Load the minimum for one correct decision; never "read everything."

| Your task | Start here |
|---|---|
| Current state, gates, next lawful step | `PROJECT-STATUS.md` |
| A doctrine question | the one doctrine file, via the `heart-and-soul` skill |
| An engineering-bar question | the one craft policy that owns it |
| A contract question | `contracts/candidates/TASK-ROUTER.md` (generated) |
| "May I implement X?" | the authorizing act in `decisions/`; plans: `docs/CAPABILITY-1-IMPLEMENTATION-PLAN.md`, `docs/PWB-IMPLEMENTATION-PLAN.md` |
| The Capability 1 specification | `openspec/changes/project-registration-and-honest-shape-visibility/` — adopted; amend only via CC-REV-2 |
| The Three-Surface POC specification | `openspec/changes/three-surface-poc-experience/` — signed off; amend only via CC-REV-2 |
| Authoring a new spec | `contracts/candidates/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md`; only owner sign-off binds it (VIS-4) |
| Which acts exist, their phrases and ceremony | `contracts/candidates/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md`; packets per `decisions/README.md` |
| Open owner questions | `decisions/PENDING-OWNER-DECISIONS.md` |
| Signing off a PWB delta, registry entry or queued contract successor | `decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`; `scripts/record_versioned_signoff.py` (version tag, no phrase or digest) |
| A launch-gate administration | structured JSON (`launch-gate-administration.schema.json`); the Markdown report is generated, never parsed |
| Mission or Context-selection work | `contracts/candidates/DEFERRED-WAVE-POSTURE.md` first |
| What a term means | `governance/doctrine/README.md` glossary, then `PROCESS-GLOSSARY.md` |
| Where a clause with a known identifier lives | `DIRECTIVE-REGISTER.md` (generated) |
| Avoiding a repeat mistake | `decisions/PROCESS-LESSONS.md` — not default context |

Historical material (`_bootstrap/`, `contracts/candidates/history/`,
`round-*`) is never on a default path and never authority. Superseded
offerings are banner-marked; retired phrases satisfy nothing — never route
an owner to a stale offering. For the eleven `round-*` directories, read
`contracts/candidates/ROUND-ESTATE.md` before opening any of them: it says
what each round settled and where that settlement lives now, and it names
the round files that running software still reads.

## Hard prohibitions

- No implementation code inside `openspec/**` or `.syzygy/**`.
- Nothing beyond the acts in force: no deferred waves (C1/C2/D1/D2), Mission
  Control, production deployment, release, broad remote access, multi-user
  support.
- Never read a repository body without per-repository consent and the
  applicable registry and policy acts (Butlers: the consented content class
  only, after the implementation's PWB-REQ-005 evaluation).
- The daemon never executes observed project code or test suites; separate
  operator commands do.
- Syzygy never writes implementation code or adopts intent autonomously.
- Never adopt doctrine, accept contracts, approve policy, or label anything
  accepted on the owner's behalf (VIS-4); never install candidate material
  into an accepted home.
- Never edit an artifact after an act has bound its digest.
- An OpenSpec change is one coherent category overlapping no other change,
  binding nothing until owner sign-off.
- An act's escalation triggers (doctrine or contract change, spec amendment,
  security/privacy/retention posture, scope) need a new owner act.
- No unattended agent coordination.

## Epistemic and change discipline

Label substantive claims `[Observed]`, `[Inferred]`, or `[Unknown]`. No
evidence yields Unknown — never green, never zero (VIS-2). An LLM assertion
is Inferred. Preserve the owner's trade-offs; never smooth them into
consensus language. Normative edits travel as semantic deltas
(`policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`); "editorial" is a
reviewable claim. Reviews run in fresh context with only the artifact, its
governing references, and the acceptance criteria; raw output is stored
verbatim and verdict words are copied exactly.

## Verification rules

Each paid for by an incident in `decisions/PROCESS-LESSONS.md`. Numbering
is stable; reviews cite rules by number.

1. `grep` here is ugrep; `[^]]`-style classes silently match nothing. Use
   `grep -F` or Python `re` for anything load-bearing.
2. No "zero / all / 100%" claim without running that exact sweep this
   session, confirmed by a second method. Enumerate remainders.
3. Digests are scripted, never transcribed; totals are computed.
4. Read a check's output, not its exit code, and check its denominator
   against the whole population.
5. A citation is not a reliance; a status banner is not a dependency edge.
6. Mutate the input and confirm the check fails, per predicate, before
   trusting it (`--selftest` holds the fixtures).
7. Run the battery in a clone before calling it green; the report is valid
   only for that commit.
8. Anchor a contract claim to a defined clause and quote it; nearby prose is
   not the clause.
9. A claim of absence needs a sweep with a denominator.
10. Freeze the bytes a review is bound to; any later edit retires the review.
11. An evidence record names its subject and the subject's digest; a record
    that names neither cannot be re-checked against the bytes it describes.

A generator that quotes prose has re-opened the door it closed.

## Validation

`PROJECT-STATUS.md` §"How to verify this page" owns the canonical battery;
run that block, never a copy. Everyday: `python3 scripts/check_governance.py`
(`--selftest` runs the fixtures). All read-only; run before claiming clean.

## Beads scope

`bd` tracks housekeeping, the Capability 1 backlog, and POC improvement
cycles (review → repair beads from recorded findings → confirmation, reported
to the owner before the next cycle). POC shared-model changes have WIP one.
Commits land at stable gates; never commit a normative artifact while its
adoption gate is unresolved.

## Notes to self

Durable lessons only; status and narrative belong in git log, `bd`, or
`PROJECT-STATUS.md`. Capability 1 status, the FROZEN-files rule, and the
tailscale `--set-path` finding live in `bd memories` — do not re-add them.
Last compacted 2026-09-05; C5 seams, recorder notes and the docs-estate
lessons added the same day; the second through fifth docs-pass lessons
added 2026-09-06; the ceiling, locator, extractor and regex lessons
added 2026-09-07; the CG-22 phrase, digest-bound review and run-form
sweep lessons added 2026-09-23; the raw-head digest lesson the same day.

### Architecture

- Polaris generation requirement lookup composes the original
  `openspec/changes/polaris-manifesto-generation/` with the explicit
  `polaris-manifesto-understanding-amendment/` overlay. Resolve adoption through
  the dedicated acts; preserve reviewed source banners and predecessor bytes.

- Polaris POC product goal: generalizable LLM-assisted manifesto generation across
  projects. Butlers is a proving case; carry improvements into reusable prompts,
  artifact/tool interfaces and authoring/validation guidance. The practical kit
  lives at `docs/polaris-generation/README.md`; its candidate guidance is not an
  adopted specification or permission for new source reads/provider egress.

- `packages/cap1-core/`: pure domain modules; one conformance file per
  CAP1-REQ in `packages/cap1-conformance/`. One `FactModel` feeds both
  channels; an independent oracle compares their outputs. The oracle and
  the REQ-061 reference model ship from `@syzygy/cap1-core/testing`, never
  the barrel; conformance fixtures build through
  `packages/cap1-conformance/src/fixtures/` (inputs only, expected values
  stay literals).
- `packages/support/` (`@syzygy/support`): the one `sha256`, the one
  `deepFreeze`, a shared strict `decodeUtf8` and the shared object test
  `isRecord` (non-null, not an array; it does not check the prototype)
  (the `isoOf` formatter stays in `polaris-dossier`: the support
  purity guard forbids `Date`), a leaf with no workspace
  dependency, imported by the PWB core, the Polaris generation packages,
  the dossier and the POC app. `decodeUtf8` is the one named helper, not
  the only strict decoder: 20 `fatal: true` `TextDecoder` constructions
  remain inline or as module constants, converted by no PR yet (the sites
  are listed in `docs/evidence/syzygy-bpyt-6-3/dc3-decode-and-canonical-json-2026-10-25.json`).
  The cap1 packages never import it (`cap1-system` is an independent oracle).
  Its own purity guard, `packages/support/src/support-purity.test.ts`, pins
  what every importer inherits: no module but `node:crypto` (`createHash`
  alone) and its own siblings, no identifier outside a literal list, no
  property write, no `import()`, no dependency and the one `"."` export. A
  helper that needs another global or module fails it until the list grows
  in the same change (`syzygy-bpyt.6.14`, `syzygy-bpyt.46`).
  After a merge that adds a workspace package, run `npm ci` in every checkout
  that builds or serves from it: until the `node_modules/@syzygy/` link
  exists, the package does not resolve.
- Three key-sorted JSON encoders are kept apart on purpose: `canonicalJson`
  (PWB identities) drops `undefined` members and flattens any object;
  `encodeCanonicalJson` (Polaris generation digests) refuses what it cannot
  spell and sorts every key by code unit; cap1's own `deterministicLayer`
  is left out of the divergence test (cap1 imports nothing shared), and
  only `canonical-json-probe.mjs` compares it. A merge makes one encoder
  refuse what another spells (an `undefined` member, a BigInt) or reorders
  array-index keys, so it changes an output or a refusal and goes to the
  owner (GP-Q0). `canonical-json-divergence.test.ts` pins the first two.
- Markdown fences are read by three rules, kept apart on purpose: the
  PWB-REQ-006 profile's recognizer (`recognizeCodeContexts` in
  `markdown-code-context.ts`, the only one a clause states), which the mask,
  the extractor's `parseDoc`, the manifest's `stripFences` (the link reader
  alone also reads its code spans) and the root-index pillar reader all use
  since `syzygy-bpyt.55`; the consent `outsideFences`; and the Polaris
  renderer. Read fences by the recognizer, never by the mask.
  `docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json` says which
  clause governed each of the five before that change, and
  `docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-addendum-2026-10-29.json`
  what moved; `fence-rules.test.ts` pins four of them (the consent reader
  through the probe and its own tests). Do not merge or "fix" the consent
  reader or the renderer without the owner, since that changes what a gate
  accepts. The profile ends a line at CRLF, CR and LF and keeps every
  terminator (`syzygy-bpyt.16`; the differential is in
  `docs/evidence/syzygy-bpyt-16/crlf-mask-2026-10-27.json`); the extractor
  and the link reader keep their LF-only line model and ask the recognizer
  whether a line's first offset is fenced, so a text with bare CRs stays a
  residual. Two stray single backticks around a list of links make those
  links a span, and they drop with no signal: the owner chose that
  (GP-B2 Q2, answer C, 2026-10-28), and `fence-rules.test.ts` pins it.
- Three-Surface POC: `packages/three-surface-poc-core/` (one shared
  `PocModel`) and `apps/three-surface-poc/` read the same instance — never
  split surface truth stores. Ignored build outputs are executable inputs, so
  `build` and `build:poc` run `scripts/clean_build.mjs`: it removes the dist of
  every project `tsc -b` will build, then builds (`syzygy-bpyt.4.2`).
  `tsc -b` alone keeps an altered output whose source is unchanged, and
  `--force` keeps an output whose source is gone.
- PWB pipeline (pure, injectable, in order): `body-read-authority` gates
  every Butlers read → observation → `git-object-reader` → classification
  (excluded content yields hash-not-body records) → extraction (literal
  grammar) → coverage (precedence only via a Butlers-declared
  `PrecedenceRule`, never "newest wins") → `PocModel.projectShape`.
  Since the 2026-09-05 amendment the precedence input is the root index's
  own seven-row `Precedence Order When Layers Disagree` table, admitted
  only when every row matches the registry literal grammar; a row decides
  a disagreement only when exactly one declaration lies under its home.
- Two render-time seams sit beside the shape, both pure and injectable:
  `walkthrough-readiness.ts` (core; PWB-REQ-021 nine answer identities,
  ten arms, never a verdict or score, never touches the PWB-REQ-022
  evaluator) and `verbatim-route.ts` (app; PWB-REQ-011 exact-requirement
  route, derived per render from the model, caches nothing). Phase B
  classifies baseline specs path-only, so the route runs the unchanged
  secret detectors and active-content scan on the transient body itself.

### Guardrails (keep even when old)

- When testing a launch-gate schema successor, distinguish the historical
  record-commit schema from the worktree-versus-HEAD drift comparison. Run
  the full selftests under both schema versions; synthetic base records must
  use their fixture schema version rather than a hard-coded predecessor.

- Contract amendment tooling reads both installed `contracts/rfcs/` and mirrored `contracts/candidates/rfcs/` bytes. Probe both locations in isolation: current indexes and budget fixtures derive from the candidate copies, while performed manifests remain immutable. Regenerating the active manifest does not establish successor authority.

- Polaris guide links open synchronously on click; ignore the matching queued
  hashchange so it cannot undo a later collapse. Browser tests must await the
  actual hashchange and cover same-fragment clicks and history traversal.
- Generator source requests may carry a full body and its identical full-file
  span. Canonically validate the untrusted record before inspecting it, then
  drop only that verified duplicate before budgeting the frozen request;
  keeping both made a 2 MB sufficient-budget run fail before any stage.
- For scope-hoisted epistemic tuples, inherited CSS custom properties carry
  color and symbol from the nearest scope. Competing ancestor descendant
  selectors let an outer Unknown treatment override an inner Observed scope.
- A served-HTML census misses elements created by Orrery's inline script;
  enumerate the post-script DOM in Chrome when claiming a full surface
  encoding population, and assert each runtime Unknown has its disclosure.
- Polaris reading selections are metadata-only offsets bound to the exact
  extracted declaration digest and an independent fidelity review. Source
  drift must render the full declaration; keyword-based omission can drop
  qualifications. Scope sticky styling to `.site-nav`, never all `nav` tags.
- Phase-A pillar indexes follow roots declared by the screened root index,
  not directory basenames. Reuse the screened root derivation in the
  manifest; repeating it is another registry-budgeted parse pass.
- Manifest tree rules supply only blobs. When a named source yields to a
  tree rule, keep missing/non-blob targets counted, and update literal
  mutation targets whenever the guarded source fragment changes.
- Fresh `git worktree`: run `npm ci` inside it first, or `NodeNext` silently
  resolves `@syzygy/*` to the main checkout's `node_modules`.
- `git ls-tree` needs `-z`, or quoted paths break the parser.
- Never hand a whole array to one call (`out.push(...lines)`): the argument
  list is bounded by the stack, so past roughly 100,000 to 125,000 elements at
  node's default stack (less the deeper the caller; half that at half the
  stack, four times it in a worker thread) it throws a `RangeError`. In the
  PWB reader nothing catches it before the daemon. Loop instead. A test that
  pins such a fix holds only at the stack it ran at; give it a canary that the
  one-call form still throws there.
- `npm run poc:pwb-*-mutation-*` rewrites sources in place (~35 min): never
  edit or commit while it runs.
- CDP headless: enable `Emulation.setFocusEmulationEnabled` or focus never
  moves; re-navigate before Tab/Enter when the fragment already matches the
  hash; `<summary>` needs its own `:focus-visible` rule. Chrome's IPC
  flooding protection silently drops same-document navigations past 200
  per ten seconds, so a fast keyboard sweep reads as a stuck hash from
  the first activation past the budget (index 200 on a tight loop; 600 on
  the live `/polaris` sweep, where pacing and re-navigations also
  count): `launchBrowser` passes
  `--disable-ipc-flooding-protection` (`syzygy-1z3.30`, 218 false
  violations).
- Never put a fragment target (an `id` some `href="#…"` names) inside a
  `<details>`: after navigating to it Chrome restarts Tab at the details'
  first focusable, stranding keyboard readers. Collapse populations, route
  the targets.
- A Python block matcher written `(?:- .*\n)+` under `re.S` swallows every
  following block (`.` eats the newline); use `[^\n]*` and no DOTALL, and
  assert the match ends where the next heading begins.
- The Write tool has emitted mixed NFC/NFD bytes; use Unicode escapes in
  fixtures when exact matching matters.
- A mutation that throws at describe time reports zero tests and scores as
  survived — build fixtures in `beforeAll`.
- A rule-6 evidence record must store each mutant's `old`/`new` fragment and
  the commit it ran at; ids and outcomes alone are not re-runnable, and a
  rebase-merge leaves the recorded commit reachable from no ref.
- A retained raw review's filename must end in `-RAW.md`: `check_governance`
  exempts only that suffix from CG-1b and CG-15, so a raw named
  `…-RAW-ADDENDUM.md` fails on the Butlers paths and truncated digests it
  quotes verbatim. A re-issued raw is a second `-RAW.md` file, never an
  overwrite of the digest-cited first.
- Fail-closed polarity: withdrawal defeats grant; future-dated evidence is
  stale; no evidence → Unknown.
- Conformance expected values are hard-coded literals, never imported from
  the module under test.
- Tests, the typecheck and the no-egress bundle load every `@syzygy/*`
  package by the `source` condition its `exports` lists first, never its
  `dist/` (`syzygy-bpyt.4.2`). Vitest takes it from `ssr.resolve.conditions`;
  a top-level `resolve.conditions` never reaches the test runner. A new
  export needs its `source` entry, or the tree's-own-exports row of
  `workspace-reach.test.ts` fails. Verify with every `dist/` absent.
- Butlers' pytest needs its own `.venv/bin/python`.
- Never wire `WORKER_CHANGE_SEAM` test-artifact evidence into the unrelated
  identity-resolution entities in `model.ts` — false "Verified" (reverted
  once already).
- Never quote a performed act's argument or a truncated signed digest in a
  new artifact unless it is in `ACT_DIGEST_COPY_FILES` (CG-7e/CG-15); cite
  the record by path. Never backtick a Butlers path in a packet (CG-1b).
- Capability 1 has no runtime governed-plane write guard: the daemon
  performs no governed write and CAP1-REQ-061's write oracle is external
  (`syzygy-bpyt.7.2` removed `write-guard.ts`). `authorizeWrite` survives
  only as test support (`@syzygy/cap1-core/testing`) and compares raw
  `startsWith`; a future write path must normalize first.
- `npm run typecheck` is one noEmit program over every workspace's `src/`,
  tests among them (the root `tsconfig.json`); it reads no `dist`
  declaration, so it needs no build first. Each package `tsconfig.json` is
  the product build and excludes its tests and test-support modules; it
  still emits two kits a reader takes from `dist` (`full-run.testkit.ts` for
  `scripts/dossier_scale_measure.mjs`, `recorder-fixtures.testkit.ts` for the
  consent package's `./testing` entry). TypeScript emits any module a built
  one imports, so no other built module may import a test or test support
  (`product-build.test.ts` lists the excludes per project and pins the one
  import edge into test support, the consent `testing.ts`).
- Ledger semantics: a refused read is not a counted pass; phase-B breaches
  are typed findings and do not set the degradation state; catalog
  extraction keys off the basename `v1.md`. The tailnet mount is detected
  by `Host`, never by path.
- Copy-oracle tests match by substring: a very short label (`None`) is
  "reached" by coincidence and proves nothing — give every label a
  distinctive string or drop it.
- A counterexample isolates a *scoping* change only if the same signal is
  genuinely elsewhere on the page: the preflight fixture (`TEXTS` in
  `walkthrough-preflight.test.ts`) already renders craft-and-care as
  `index-unavailable` with its route, so a page-wide substring check
  survives any case using a different reason (the phrase check catches
  it first). Give the mutated pillar the reason already on the page.
- PWB-REQ-020 parity is per tuple, never per id: a claim may render more
  than once (the current-authority citation repeats the baseline-spec
  item's tuple), so `tuples === distinct ids` is a false invariant; check
  every rendered tuple against its machine claim by id and both id sets.
- `poc:fresh-checkout-demo` names its evidence file by `--date` and
  overwrites silently: pass a suffixed `--date` (`2026-09-06-gen2`) when a
  same-day file exists. Rebase-merge re-hashes the recorded head; the
  surface version (sha256 over both `src` trees) is the stable anchor.
- **A response-ceiling breach serves nothing and logs nothing.** `routes.ts`'s
  `boundedResponse` answers HTTP 503 with a JSON body (`served: 'nothing'`,
  readiness false); no ledger, stderr line or status record sees it — the 503
  body of the breaching request is the only trace. The resource ledger is
  the input-side reader budget and never sees a response ceiling. Two
  governance records said "degrades honestly" / "the ledger reports the
  breach" for a day; both marked 2026-09-07. `/polaris` sat 44 KB under
  the 2 MB ceiling; the P-63 trim (`syzygy-1z3.27`) cut 434,960 bytes on
  both forms (`docs/evidence/pwb-p63-polaris-trim-measurement-2026-09-07.json`),
  leaving ~479 KB for the P-60/P-61 repairs' 418–443 KB.
- **Measuring `/polaris` needs a committed, clean tree.** The observer
  refuses uncommitted inputs, so commit first, then serve a private daemon
  (`--port 0 --state-dir <scratch>`) from the worktree root and curl the
  page twice: direct, and with `Host: tzeusy.parrot-hen.ts.net` (the mount
  prefix adds 15 bytes per internal link, 5,640 bytes at 376 links). Never
  measure through the loopback daemon on 7478.
- **Where a trimmed byte may not come from.** The parity sweep finds class
  tables by the literal `<tbody>` and the reachability test wants a region
  inner starting with `<table>`; an attribute hoisted onto either tag drops
  the family to a human count of 0 rather than failing loudly. Hoist roles
  onto the `tableRegion` div (its `attrs` parameter). A cite span needs only
  `data-anchor-id`; every other anchor field lives once in the frozen
  narrative JSON, and the source-route `href` is the single carrier of the
  exact-source identity (`sourceRouteIdentities(html)` reads it back).
- The daemon serves only the registered locator (`git-observation.ts`
  refuses any other `--repo`), so a repaired Butlers page cannot be measured
  on a private daemon from a scratch clone: measure per-item marginal cost
  on the retained capture instead, or wait for a real Butlers commit.
- The extractor stops at the first grammar failure, so a finding that names
  "one line" understates: re-run on a scratch copy after each fix until it
  parses (v1.md had five colon forms and four duplicate labels behind "one
  row uses a colon").
- The fresh-checkout demo exits by `fresh-checkout-verdict.ts` over every
  invariant it records (daemon stderr must be exactly its own three probe
  refusal lines, two 401s and one 403); the walkthrough
  preflight (`walkthrough-preflight.ts`) is mechanical readiness and
  never an owner verdict — keep readiness, execution record, owner
  judgment and act validity as four states.

### Governance prose and docs

- CAP1 keeps its adopted `CAP1-REQ-*` identities. The generic th-projects
  `spec-trace-check.py` expects `REQ-<spec>-NNN`; disclose that format
  mismatch and compare the exact predecessor IDs independently, never
  rename adopted requirements to satisfy the generic checker.

- **A page-level "may be stale" banner discharges CG-27 while a false
  sentence stands.** Three default-path pages carried inverted act claims for
  nineteen days behind such banners. Mark staleness **at the stale sentence**,
  keeping the superseded text quoted and dated; never rely on a page banner to
  cover a specific false claim.
- CG-27 keeps paragraph scope for prose but evaluates valid GFM tables
  **row-by-row**. A sibling row's historical, owner, or as-of token cannot
  exempt or satisfy the claim row. Its lightweight table recognizer preserves
  pipe-less data rows and one-column tables, ignores indented code and valid
  fences (a backtick fence info string cannot contain a backtick), and decides
  a trailing pipe from the parity of preceding backslashes.
- A page that restates state it does not own goes stale silently. Cite
  `PROJECT-STATUS.md` or the act record instead of repeating the row.
- **"Historical" never means "safe to relocate."** Sweep for citers first:
  `round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.json` is a live CI input of
  `.github/workflows/governance-docs.yml`, and rounds `h`–`k` are cited as
  evidence by acts in force.
- `docs/superpowers/**` is **path-pinned**:
  `scripts/build_general_trusted_bootstrap_impact_ledger.py` hard-codes the
  prefix to classify those paths as spent evidence, so moving a file out
  silently re-classifies it on the next regeneration. Do not move or rename.
- A prepared act package may still carry the pre-act "candidate, binds
  nothing" banner it was drafted with. **Read the act record, never the
  package banner.**
- **`bd search` reaches neither bead descriptions nor `close_reason`.**
  `bd search PWB-LIVE` returns "No issues found" while five beads name those
  identifiers in their descriptions, and `RTF-1` appears in exactly one place
  in the tracker — `syzygy-zal.9`'s close reason (1 hit over all 165 beads).
  Sweep the `.beads/issues.jsonl` export instead: one line per bead, every
  field, and its line count is the denominator.
- Identifiers in this corpus are written in **continuation form** — "Repair
  PWB-LIVE-02, 03, 05 and 15", `PWB-LIVE-02/03/05/15`, `PWB-LIVE-01..15`. A
  sweep matching the full identifier misses every continuation and produces a
  false absence (it produced one, on a page written the day before). An
  absence claim's denominator must cover the *forms* an identifier occurs in,
  not only the records searched (rule 9). A predicate published in words
  ("followed by a bare `010`") and run over one member returned 0 / 0 where
  the run form `PWB-REQ-001/002/003/004/005/010` returns six files, five
  with no literal at all (opening-band ledger, found 2026-09-23 one round
  after the same section's first false absence): publish the regex, with
  run length, separators and case, and re-run it at the stated commit.
- The two in-force craft policies inside `policy-candidates/` are in the
  authority table above; the trap that is not is CC-IMPACT-7, which mandates a
  blind run against `SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md` by path *and*
  digest — a fixture that fixture 3 superseded on 2026-08-30 because it left
  `topology[]` unexercised. Neither the clause nor fixture 2 may be edited to
  say so.
- A clause is found by identifier, not by directory. `DIRECTIVE-REGISTER.md`
  is generated from all five trees and carries file and line for every one; a
  scan of a directory you *expect* to own a family will miss the two above.
- A round directory's index date is its **first-commit** date and does not
  bound its contents: `round-2026-08g` took two files seventeen days after it
  closed. Many round file heads carry no status word at all — read the
  `round-*` path itself as the banner. Counts for that estate live in one
  place, `contracts/candidates/ROUND-ESTATE.md`, which derives them: four
  different figures for the same directories were in circulation, each right
  about a different population, and one of them was stale on publication
  because the page quoting it had itself become the missing citer.
  **Measuring last is not enough.** That page's own uncited count was exact
  when published and wrong three commits later, falsified by prose in the
  same pass that named two of the files it counted. An absence figure over a
  population the current pass is still editing has to be re-derived, never
  read — and it needs its citer predicate stated, because "cited by no other
  tracked file" and "cited by nothing outside its own round" differ by
  nineteen files over the same 237.
- **A word set published as "X, Y or similar" is not a predicate, and the
  figure resting on it cannot be re-derived.** The round estate's 96
  unbannered heads were published with four status words "or similar"; the
  four alone give 118, and the figure only comes back at 96 when
  *non-authoritative* and *not authority* are added — recovered by search,
  not from the page. Enumerate every literal, the window, and the case
  folding, or the number is a claim no reader can check. Test the denominator
  separately: that same figure is 96 over the round work files, over every
  `.md` under the eleven directories, and over the population as it stood
  before the READMEs landed, so naming one of the three was never load-bearing
  and only went stale.
- Where a file *sits* and whether its work is *finished* are different
  questions. The general trusted-bootstrap impact ledger classifies everything
  under `docs/superpowers/` as spent evidence, but
  `plans/2026-08-24-cap1-runtime-hardening-followups.md` is the open P1 epic
  `syzygy-u2a`'s approved implementation guidance. Check the `bd` issue.
- Before editing any governance prose, hash the file and grep the manifests —
  a file listed in a performed act's manifest is bound (`ACCEPTANCE-ACT-RECORD.md`
  names the argument). `openspec/changes/polaris-project-wide-butlers-model/`
  is bound this way: it cannot take a status banner at all.
- **A bound file's own banner can be wrong, and only an owner-signed
  successor may correct it.** An act binds the bytes that say "Candidate…
  binds nothing", so the sentence turns false and stays false until a
  readability successor (`scripts/readability_successor.py`) replaces the
  file; the Capability 1, POC and Polaris proposals were corrected that way
  on 2026-09-29. Until then, trust the act record and the routing table
  above; a package banner is evidence of what a drafter believed, never of
  what binds.
- **A package's own manifest is part of the digest-binding corpus.** A sweep
  that excludes the directory under audit will call its files unbound when the
  sibling `*-MANIFEST.txt` carries them as rows (rule 4). This is how
  `general-trusted-bootstrap-authorization/ACT-SEMANTICS.md` and its
  `IMPACT-LEDGER.md` read as free: both are rows of `TRANSACTION-MANIFEST.txt`
  in the same directory, so ACT-SEMANTICS.md permanently opens "Candidate —
  binds nothing" about a transaction performed 2026-09-01. The eight unbound
  prose files in the three PWB packages took dated **PERFORMED** heads instead
  (2026-09-06, `syzygy-bba`); the pre-act banner stays beneath, unedited.
  Membership in the package directory is neither necessary nor sufficient,
  so read the rows: of the 8 files in that one, 5 are digest-cited and 3
  (`CANDIDATE-TRANSACTION-REPORT.md`, `OWNER-SIGNOFF-PACKET.md`,
  `REVIEW-BRIEF.md`) are not.
- **An act's *preservation* language edit-locks files whose digest appears
  nowhere.** Both Capability 1 acts name `round-2026-08k` as their evidence
  chain and say it is preserved. In `decisions/`,
  `CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md` lines 7-9 name
  `REVIEW-BINDING.md`, reviews RS-1…RS-5 and the adoption PREPARED packet as
  "preserved unchanged"; `CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md`
  lines 6-8 name the implementation PREPARED packet "banner-marked performed,
  preserved". All 9 tracked files under that directory return **0** digest
  citers across every tracked file under `.syzygy/`, `openspec/`, `docs/` and
  `scripts/`, and the acceptance record never names the path — so the manifest
  grep, the digest grep and the record grep all read them as free. The lock is
  the act's own sentence. Route around the language; there is no hash to
  mismatch.
- **Zero digest citers does not mean never bound.** A raw review that quotes a
  digest freezes those *bytes*, not the path, so a file edited after its
  confirmation looks identical to one no review ever touched.
  `GENERAL-TRUSTED-BOOTSTRAP-AUTHORIZATION-SEMANTIC-DELTA.md`, in
  `contracts/candidates/`, has 0 citers for its current hash while
  `docs/reviews/R-GENERAL-TRUSTED-BOOTSTRAP-SEMANTIC-DELTA-6-RAW.md:3`
  confirms a digest the file stopped hashing to two commits later, before the
  diff that added RFC4-23, RFC8-16 and CC-SPEC-8 to its affected-ID set. That
  is rule 10 working: the review confirms history and the current bytes carry
  no confirmation. Before calling a governed file unreviewed, grep the raws
  for *any* digest cited against its path, not only its current one — and do
  not copy the stale prefix into your finding, which is CG-15's whole point.
- **An *unperformed* act's prepared argument is just as untouchable, and
  nothing in the file says so.** `.syzygy/intent/OVERVIEW.md` is the argument
  of act 4, `ADOPT PROJECT OVERVIEW`, which has never been performed — so its
  hash appears in no performed act's manifest and the manifest grep above
  returns clean, yet editing one word regenerates the argument and retires any
  confirmation bound to it. Grep
  `contracts/candidates/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` for
  the path too. An owner-directed edit is lawful: re-mint the act-4 row's
  digest in the same commit (CG-7c/7d/7e fail until you do).
- Every `round-*` directory now carries a `README.md` naming what the round
  settled, where that settlement lives now, and its live-input cautions;
  `contracts/candidates/ROUND-ESTATE.md` is the route across all eleven. The
  96 unbannered *file* heads inside them are unchanged — but **only 19 of the
  96 could ever be banner-marked**, and the other 77 are not an owner's to
  authorize: 74 are raw reviewer output under a round's `reviews/`
  subdirectory (CC-REV-6 stores raw output unchanged, which is not a question
  of authority), two are digest-bound, and one is regenerated and
  byte-compared by CI. A count of unbannered heads measures what a reader may
  open, never how much work is available; check what protects each file before
  costing a pass over a population.
- `docs/README.md`'s review-campaign table is one row per campaign over
  every file in `docs/reviews/`, each row carrying its last verdict of record
  and where the findings landed. It is re-derived, not maintained: the count
  moved 88 → 90 within a day of being written, and again the same day, so
  rerun `scripts/check_docs_review_campaign_partition.py` rather than
  trusting a row. A new `-RAW.md` whose basename matches no campaign
  pattern fails it as `unmatched`: add the pattern and the row in the same
  commit as the raw.
- **An index that routes by short name makes the files it routes read as
  orphans.** `contracts/candidates/reviews/DISPOSITIONS.md` sections are
  titled "rev10-boundary", "rev10-safety" — never the filename — so a sweep
  for a report by its own basename finds no citer and reports it unread
  (rule 9's false-absence class again, this time in the *citer's* form rather
  than the identifier's). It cannot be repaired at the site: the general
  trusted-bootstrap `IMPACT-LEDGER.md` classifies that file as raw-review
  evidence "never rewritten to current semantics", and the ledger is a row of
  its own package's transaction manifest, so the classification binds. Route
  from the nearest *unbound* index instead — the map from filename to verdict
  to disposition section now lives in `candidates/README.md`.
- **A citation wrapped across a line break is invisible to every basename
  sweep, so every absence figure in this corpus carries an unmeasured error
  term.** These pages are hard-wrapped at 78 columns, and a wrapper that
  breaks inside a code span leaves half a filename on each line:
  `docs/PWB-IMPLEMENTATION-PLAN.md` cited a mutation-run record as
  `…-2026-09-05.` + `json`, which is why one evidence file read as uncited by
  a full-basename sweep and as cited by a stem sweep — both were right. To
  measure it, take each non-fence line with an odd backtick count, join its
  tail to the next line's head, and test the join against the tracked
  basenames; a hit that neither half carries alone is a wrapped citation.
  Repaired 2026-09-06 in three places over 165,027 non-fence lines; the one
  remainder is in `round-2026-08/ROUND-DISPOSITIONS.md`, which is historical
  and not edited. Never let a reflow break a code span.
- **A home's README describing what it will hold goes false the moment it
  holds something, and a stored review may make the false sentence
  undeletable.** `decisions/launch-gate/README.md` said "Empty today,
  correctly: no formal administration has been run" for nineteen days after
  Administration 1 landed beside it, stated a filename convention
  (`ADMINISTRATION-<n>-<date>.md`) that the one record never followed, and
  named neither the canonical JSON nor the two other file classes present.
  `round-2026-08e/reviews/RD-28-spec-authoring-RAW.md` quotes that exact
  sentence verbatim as evidence of the project's epistemic discipline, so it
  was marked and dated in place, not removed — a review's referent may not be
  edited out from under it. Retain a validation transcript beside every future
  administration record: rule 7 makes a transcript valid only for the commit
  it names, and a JSON record with none is a record no later reader can
  confirm was checked.
- **Landing many packet branches that each append one register row.** Every
  branch conflicts pairwise on `PENDING-OWNER-DECISIONS.md`; merge them in
  ruling order with `git merge-file --union` (real temp files — process
  substitution feeds it nothing and the register comes back empty), then
  assert the row set equals the union of the inputs and is distinct
  (`^\| P-[0-9]+[^ |]*`, so `P-25(c)` stays its own row), and that every
  other file matches its branch blob. Each branch's header note counts the
  register as of its own branch alone ("22 open, 27 in all" thirteen times
  on 2026-09-21); add one dated note at merge time naming those sentences
  and giving the recount, never edit them.
- **The PWB-REQ-014 authority sweep reads evidence-record keys.** A JSON key
  named `source`, `provenance`, `evidence` or `anchor` whose value names the
  Polaris capture or route fails the fourth test in
  `polaris-authority-sweep.test.ts` on a combined tree even though each
  branch passed alone (M12's `claimPopulation.source`, M16's capture
  `provenance`); name the measured subject `measuredOn` / `capture`. Retained
  `docs/reviews/*-RAW.md` are skipped since 2026-09-21 (reviewer `Anchor:`
  lines, uneditable under CC-REV-6), the same population
  `check_governance._is_raw_review` exempts; any other `-RAW.md` still counts.
- **The `docs/README.md` partition count races between sessions.** A
  rebase-merge never re-runs CI against the other branch's count, so two raws
  landing minutes apart each pass at N+1 and leave main at N+1 with N+2 files
  (2026-09-22, repaired by #89). Rebase onto the latest main, re-run
  `check_docs_review_campaign_partition.py` immediately before merging, and
  again on main after; treat the count sentence like the CG-26 triple — one
  integration edit per batch of raws. A clean rebase proves nothing: two
  branches that each rewrote the count line to the same stale number merge
  with no conflict (both said 236 over 237 files on 2026-09-23), so
  re-derive after every rebase even when git reports success.
- **A repair that copies a reviewer's figure, commit or population inherits
  the reviewer's error, and rule 10 charges a round for each one.** Rounds
  5–9 of the P-71 opening-band review each faulted the previous round's
  repair: "fourteen" for a population of thirteen; a moved-pointer commit
  taken from the raw instead of `git show <commit>:scripts/check_governance.py`;
  "every cited source blob unchanged" without the raw's own restriction to
  eight files; "round-1 item 16" for a list the round-7 raw built from items
  11 and 16. Before a count, a commit or a population goes into a
  disposition, re-derive it from the file at the commit named and write the
  population beside it. Every prose repair retires the confirmation, so three
  consecutive CONFIRM WITH EXCEPTIONS with notes only (6, 2, 1 over
  `28086f6`, `815785a`, `80c4b52`) never reached a bare CONFIRM: agree a
  stopping rule (repair, dispatch nothing, ask the owner) before round 3,
  not after round 10.
- `gh pr checks --watch` exits at once when no checks are registered yet;
  poll until `gh pr checks` lists rows, then watch, then merge with
  `--match-head-commit`.
- A README row quoting a raw's verdict copies it from the raw file (line
  cited), never from the reviewing agent's summary message.
- Candidate-package prose files are not manifest rows: a prose repair keeps
  the act digest unchanged but still needs a review round.

### Known gaps

- syzygy-ydr: non-blocking S2/S5 review findings outstanding.
- Butlers data quirks, as of 2026-10-03: [Observed] a private-daemon run of
  the Three-Surface POC at Butlers `32f38feb` (Syzygy `b5c2bcdb`; record
  `docs/evidence/smooth-example-live-run-2026-10-03.json`) reads 285
  sources, 392 items, 416 facts, 0 contradicted and 9 withheld (8
  `active-content`, 1 `excluded-artifact`), and the 9 sources with an
  unknown item denominator are those withheld ones (equal per source by path
  hash and content digest, `unknownDenominatorWithheldComparison` in that
  record), so no source is Unknown
  for a grammar failure. The whole-shape claim is still Unknown, now for
  `excluded-content`. Earlier text here (as of `13d269b`, retired
  2026-10-03) named `v1.md`, the missing `openspec/` index and
  `components.md` as grammar Unknowns; Butlers PR #4066 carried those
  repairs (P-60/P-61/P-62) and merged 2026-09-07 [Inferred: from the bead
  record, not re-read from Butlers]. `frontend.md` and `butler.toml` files
  stay withheld as active content (TOML has no inert context). Do not relax
  the grammar or policy without an owner gate.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
### Governance recorders (digest-bound acts)

- Each digest-bound owner act has a dedicated recorder script that
  hard-codes the frozen subject and packet head, validates the owner's
  phrase against current bytes, writes a new dedicated record and appends
  one aggregate section to `ACCEPTANCE-ACT-RECORD.md`; `--check` must
  count exactly one copy of its block, never assume it is the file tail.
  A superseding act gets a new record; the superseded record is never
  edited, and its recorder fails `--check` by design.
- Register a new act phrase in `check_governance.py`'s `_act_subjects()`
  and its packet copies in `ACT_DIGEST_COPY_FILES` before the packet
  exists, or CG-7d cannot see them go stale; files that appear only after
  an act are registered from an existence-gated activation function.
- Plain owner directions (implementation authorization, continuation)
  bind no digest, add no acceptance-record row and register nothing.
- **Candidate packets register a phrase and a copy, never a chain link.**
  A `PWB_SUCCESSOR_CHAIN` entry asserts adoption *order*, which only the
  performing act decides; register `LABEL/DIR/SUBJECT/ACT`, the
  `ACT_DIGEST_COPY_FILES` row and an existence-gated activation at drafting
  time, and add the chain link with the act. A packet that quotes a bare
  digest (no `<PHRASE>: <digest>` form) is invisible to CG-7d. Until
  `syzygy-eau` CG-7e missed it too: it only asked whether the current digest
  appears *somewhere* in the file, so a stale bare `Manifest SHA-256:` copy
  passed beside a correct phrase-linked one. CG-7e now checks every bare
  digest *heading* — a line-start label ending `sha256`/`SHA-256` in any
  case, colon optional (`BARE_DIGEST_HEADING`: 29 copies in 22 files over
  12 spellings, only 4 the literal one; two review rounds each found the
  sweep narrower than claimed) — against that file's own declared digests;
  the two container-manifest headings are checked exemptions, hashed live.
  Unlabeled copies (act-identity URNs, table cells, checksum rows, owner
  phrases — 12 found live by a third review) are reached by a
  shape-independent near-miss pass (`STANDALONE_DIGEST`, `syzygy-wh1`): any
  standalone 64-hex token in a registered file that is not one of *that
  file's* allowed arguments but is exactly one character from one fails,
  whatever correct copies sit beside it. **Residual:** a copy corrupted in
  two or more characters, or swapped whole for another digest, still passes
  beside a correct copy; a digest cited inline that names a review raw or
  container (3 in `pwb-effect-acts/OWNER-SIGNOFF-PACKET.md`) is unchecked
  unless it lands one character from an argument. A rule-6 mutation
  must still rewrite *every* copy (`sed s///g`), not the first match — a
  `str.replace(..., 1)` hit an unregistered copy and reported a false pass.
- **CG-26 is one coupled triple: register it once, at merge.** Several
  packages each adding their builder to the PROJECT-STATUS battery, the
  hosted workflow and the count sentence conflict pairwise and each counts
  the battery as of its own branch. Draft packages leave all three alone;
  one integration commit adds every line, step and the new number word.
- Sibling packages patching the same CG-7h-bound tree (lane B and the three
  spec-touching gate packages) each hash post-apply bytes against the
  *current* tree: whichever act lands second must be regenerated with
  `--write` first, or its manifest is stale on arrival. Say so in the packet.
- A reviewer killed mid-write by a rate limit may already have a complete
  raw on disk: check the worktree before re-dispatching, and if the file is
  whole commit it verbatim (CC-REV-6) — a second reviewer run is a second
  `-RAW.md`, never a replacement. Two lead sessions dispatched the same
  confirmation review within minutes on 2026-09-23 and got different words
  (REVISE and CONFIRM WITH EXCEPTIONS) over the same bytes: before
  dispatching, read the gate bead's comments and `git ls-remote origin
  'review/*'`; if it already happened, retain both raws (the second under a
  distinct name) and let the disposition name both verdicts.
- A recorder binds a review by the manifest digest in the raw's four-line
  head, never by the raw's `Reviewed commit`: every review commit on a
  rebase-merged branch is unreachable from `main` (`git merge-base
  --is-ancestor` fails), so a commit pin would refuse forever. Cite the
  commit as provenance only.
- **Say which digest the raw's head must carry, in the brief and the
  recorder docstring.** "Manifest SHA-256" names two things when the act
  argument is the subject's digest rather than the manifest's: round 1 of
  the registry confirmation put the manifest *file's* sha there, rounds 2
  and 3 the manifest *row* (the proposed-bytes digest, which the reviewer
  re-derives by script), and the recorder, written to round 1, refused a
  CONFIRM over the row. Also a blank line after the title pushes `Verdict:`
  past a literal four-line head. The registry recorder now binds the
  argument over the first four non-blank lines (the sibling behaviour
  recorder's form, 2026-09-23, `syzygy-qxz`); a recorder's head contract
  is a predicate the brief must quote, never a convention reviewers infer.
- CG-22 accepts a status qualifier only as one of its exact listed phrases
  ("governance lifecycle", "state plane", …) within the whitespace-normalized
  window; the hyphenated adjective form ("governance-lifecycle") does not
  qualify. A recorder that renders a bare `status` code span into a record
  must carry the phrase in the same sentence.

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**MANDATORY — work is NOT complete until `git push` succeeds:**

1. **File issues** for remaining work; close finished issues, update
   in-progress ones
2. **Run quality gates** (if code changed)
3. **Push**: `git pull --rebase && git push`; `git status` must show
   "up to date with origin"
4. **Clean up** (stashes, stale branches) and **hand off** context for the
   next session

NEVER stop before pushing — that strands work locally. If push fails,
resolve and retry until it succeeds.
<!-- END BEADS INTEGRATION -->
