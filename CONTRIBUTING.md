# Contributing

Syzygy is MIT-licensed but does not accept external code contributions yet;
issues and discussion are welcome, and documentation or governance proposals
follow the disciplines below.

## Current posture: licensed, but not accepting code contributions

Reuse rights are granted; code contributions wait on an owner decision that
has not been recorded or queued.

- **Licence:** **MIT** (owner ruling P-14, 2026-08-18 — see the root
  `LICENSE` and `.syzygy/governance/decisions/LICENSE-CHOICE-DECISION.md`).
- **Why code is refused:** contributor-agreement posture is an unrecorded
  owner-held fact — not because the project has no code.
  - `LICENSE-CHOICE-DECISION.md` names it: "Whether a hosted offering is
    intended, and contributor-agreement posture, remain unrecorded
    owner-held facts — the latter is its own future decision and is **not**
    settled by this ruling."
  - It is not queued in `PENDING-OWNER-DECISIONS.md` either [Observed — zero
    case-insensitive matches for "contributor" across that file's 125 lines,
    swept 2026-09-06], so no record anywhere carries a date by which it will
    be answered.
- **What is welcome:** issues and discussion; documentation and governance
  proposals follow the disciplines below.

*Superseded, dated:* until 2026-09-05 this section opened "Syzygy is in
**final pre-specification**" and gave the reason for refusing code as "there
is no application code and the no-implementation boundary below binds
everyone." Both were true when written on 2026-08-19 and stopped being true on
2026-08-21, when Capability 1 implementation was authorized. What is
implemented today, and under which act, is `PROJECT-STATUS.md`'s row, not
this page's.

## The implementation boundary

Code may be added only where a **named owner act** authorizes it; anything no
act covers is forbidden.

- **Find the act before writing code.**
  - `AGENTS.md` ("Where authority lives") routes to it.
  - `PROJECT-STATUS.md` says which acts are in force.
- **Who it binds:** the project's own agents today, and it would bind
  contributors later.

*Superseded, dated:* this section was headed "The no-implementation boundary"
and read "Nothing in this repository may add application or library code,
choose a stack, create behavioral-specification changesets, or build an
implementation backlog until the foundational contracts are accepted and
specification authoring formally opens" until 2026-09-05. That described the
pre-specification stage correctly and was overtaken by the acts that opened
specification authoring and then authorized implementation. The gate did not
disappear; it moved from "none at all" to "only what an act names.

## Authority layers

Authority is typed, and each question has one owning home (see the README's
authority table); what a change may do depends on which layer it touches.

- **Adopted/approved** — doctrine, decisions, craft-and-care policies.
  Changing these is an owner-gated amendment, always.
- **Candidate** — design contracts, topology, overview, policy additions.
  These may be revised by agents *as drafts*, but only the owner accepts
  them, and never implicitly.
- **Derived** — indexes, summaries, status pages, this file. Regenerate
  freely; they are never authority and never cited as such.

**A rule about writes, often misread:** VIS-5 is a product rule, not a
contributor rule.

- Doctrine VIS-5 confines **Syzygy the system's** direct project-content
  writes to `openspec/**` and `.syzygy/**`.
- People and agents working on this repository edit the front door, CI, and
  skills too.
- The contributor rule is simpler: documentation and governance artifacts
  only, through the disciplines below.

## How to propose a documentation or contract change

Edit the one owning artifact, describe any normative change as a semantic
delta, and expect a fresh-context review.

1. **Find the owning artifact** — one authoritative home per fact; edit the
   owner, cite it everywhere else.
2. **Write a semantic delta** for any normative change:
   `.syzygy/governance/contracts/candidates/policy-candidates/SEMANTIC-DELTA-TEMPLATE.md`
   - It records current meaning, proposed meaning, change class (Editorial /
     Clarifying / Normative / Structural), warrant, impact, and what
     explicitly does not change.
   - "Editorial" and "no semantic change" are reviewable claims, not
     exemptions.
   - Whole-file rewrites are exceptional and require justification plus a
     mapping.
3. **Preserve stable IDs** — clause and rule identifiers are amended in
   place or retired, never renumbered.
4. **Expect fresh-context review** — material normative changes are reviewed
   by a session given only the artifact, its governing references, and
   acceptance criteria; never the authoring conversation.
   - Raw reviewer output is stored verbatim; verdict words are copied
     exactly.
5. **Never edit a digest-bound artifact after its act** — it voids the act.
   Propose a re-offer instead.

## Checking a change

Tests run in tiers so that "is my change green" has a quick answer and a
complete one. Run `npm ci` once; every command below runs from the repository
root.

See [repository scripts](scripts/README.md) for the Python governance tools.

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | one complete **unit** run in a fresh private TMPDIR, with a post-run leak check | node, python3 with pidfd support, Linux `/proc` |
| `npm run check` | `npm run typecheck`, then `npm test` | node, python3 with pidfd support, Linux `/proc` |
| `npm run test:integration` | bounded TMPDIR-driver selftests, then the **integration** tier | git, python3 with pidfd support, Linux `/proc` |
| `npm run test:e2e` | the **e2e** tier, then the system tests (`npm run test:system`, which builds first) | Chrome or Chromium, strace, git, npm |
| `npm run check:all` | `check`, `test:tiers`, `test:integration`, `test:e2e`, then the governance battery (`npm run check:battery`) | all of the above |
| `npm run test:live` | the **live** tier: operator-run, skips unless `SYZYGY_POC_BUTLERS_REPO` names a real repository | a Butlers checkout |
| `npm run test:tiers` | every test file is in exactly one tier (two methods, with a count) | node only |

- **Unit** is hermetic. The unit setup (`vitest.unit-guard.setup.ts`) refuses
  a child process (git, node, python, a browser), a socket and a server at the
  call, and fails the file even where a test caught the error. A test that
  needs one belongs in a higher tier.
- **Run cleanup.** `npm test` prints the unit project, selected files and contributing
  workspaces, reconciles discovery and executed-file reports, and lists escaped
  leftover names/types before removing only its own TMPDIR. A private Linux
  subreaper waits for kernel-confirmed descendant completion, including children
  that change process group or session; signals use verified child pidfds. Missing
  lifetime proof refuses census/removal and leaves a named failed remainder. Only an exact real
  `node-compile-cache` directory is exempt. A failed child, incomplete denominator,
  scan error or incomplete cleanup fails the check even when no leak remains.
  Driver controls run separately under `test:integration`; this is a unit-run
  cleanliness gate. Focused development runs use `npx --no-install vitest run
  --project <tier> <file>` directly.
- **Integration** may use git, a real tree, loopback servers, python recorders
  and other child processes.
- **e2e** drives a browser, builds or installs in a clone, traces with strace
  or runs the compiled daemon (the `*.system.test.ts` files under
  `packages/cap1-system`, which keep their own config).
  `npm run test:e2e` first runs `cdp-browser.browser.test.ts` alone: its
  process-lifetime cases exercise the private guardian's fixed cleanup budget.
  The remaining e2e files then run together, followed by the system tier.
  `test:tiers` checks that these phases discover every e2e file exactly once.
- **Live** never runs in a workflow.
- **Where a test goes.** A new test file is a unit test until
  `vitest.tiers.ts` lists it under `INTEGRATION_TESTS`, `E2E_TESTS` or
  `LIVE_TESTS`; list it under the lowest tier that holds what it uses. The
  unit setup names the file and the call when a unit test reaches for a
  process or a socket. Vitest refuses to start when a list names a file that
  does not exist or a file is in two tiers.
- **Hosted CI** (`.github/workflows/node-ci.yml`) runs the unit job first,
  then the integration and e2e jobs in parallel; the job named `node` (the
  required check) passes only when all three passed.
- **What `check:all` leaves to CI:** the node-segment-rules pin and the egress
  and Redis-observation builders, which `node-ci` runs in its unit job, and
  `governance-docs.yml`, whose battery `check:battery` reads from
  `PROJECT-STATUS.md` ("How to verify this page") and never copies.

### CI time budget

Hosted CI must be green within **7 minutes** of a push to a pull request, and
the merge queue within the same budget for each tree it tests (`syzygy-j5m0`).
The clock is the slowest job of a workflow, not the sum of its steps.

- **Where checks run.** Both workflows run on `pull_request` and
  `merge_group` only. There is no `push` run on `main`: `main` moves only
  through the merge queue, which already tested the exact tree that lands.
- **How each workflow stays inside it.** `node-ci.yml` runs its integration
  and e2e tiers in parallel after the unit job. `governance-docs.yml` runs
  the governance battery in one job and three slow selftests
  (`check_spec_reconciliation --selftest`,
  `prepare_three_surface_poc_governedby_reference_recording --selftest`,
  `build_three_surface_poc_readability_successor --selftest`) in a job
  each; the aggregate job
  `checks` is the required check. The first two selftests run their
  independent cases in forked workers and report in case order
  (`SELFTEST_WORKERS` overrides the worker count; `1` runs
  them serially).
- **A check that would break the budget** gets its own job, or its cases run
  in parallel, before it lands. It is never dropped from the pull-request run
  or moved to a schedule without an owner decision, and a selftest that
  mutates governed inputs is never path-filtered.
- **Measure, then place.** Step durations come from the run's job record
  (`gh api repos/<owner>/<repo>/actions/jobs/<id>`); cite them when moving a
  check between jobs.

## Changing the dossier brief, draft schema or renderer

Review practice, adopted by agents under VIS-4 (the row is in
`.syzygy/governance/decisions/AGENT-ADOPTIONS.md`). The reporting rule gates
no merge; the hold-out test and the seven checks fail CI like any other
check.

A change to what a Polaris dossier author is told, may write or is rendered
as reports the comprehension regression in its pull request. That is a change
to `packages/polaris-dossier/src/brief.ts` (and the brief version), to
`packages/polaris-dossier/src/draft-schema.ts`, or to a renderer:
`packages/polaris-dossier/src/render.ts` and the `dossier-render*.ts` files
under `apps/three-surface-poc/src/polaris-generation/`.

1. **Report the reader's share before and after.** On at least one stored run
   rendered again, or one new run, give the share of required facts a fresh
   reader recovers from the dossier, overall and for each of the six question
   kinds (purpose, structure, mechanism, rationale, change, limits), before
   the change and after it. The steps and commands are in
   `docs/evidence/pursuit-2026-11-21b/pilot/README.md`; the kept arms there
   are the "before" for a stored run.
2. **Explain a drop beyond the instrument's noise.** A point is 0.01 of
   share. If the overall share falls by more than five points, or any kind's
   share falls by more than one required fact (a kind has 13 to 15 facts, so
   one fact is 6.7 to 7.7 points; a grade moves in half facts), or three or
   more kinds each fall by a full fact, the change says why, or is repaired.
   The last clause catches many one-fact drops in one direction, which can
   otherwise stay under five points overall.
3. **Do not call one result a regression, and never call one a win.**
   [Observed] Over one repository
   (`docs/evidence/syzygy-5dhm-127/stored-run-measures.json`,
   `scripts/dossier_stored_run_measures.py --check`): the same stored answers
   graded again (arms D and P four times, E three times) moved the overall
   share by up to 3.7 points (arm D, 0.302 to 0.340) and a kind's share by up
   to 7.7 points, one fact; a second reader of the same stored site moved the
   overall share by 1.2 and 0.6 points (arms D and Y, E and Z) and a kind's by
   up to 3.8; every measurement of one site together, readers and gradings,
   spans 4.9 points overall. So five points overall sits at the edge of the
   measured noise, and a kind moves by a whole fact without any change.
   [Inferred] Treating facts as independent, one standard error is about five
   points overall and about thirteen in a kind (error over the choice of
   questions, not the repeat noise of a before/after on this key). So a drop is reported and
   explained as a drop, and is called a regression only after it holds on two
   runs or under a second key. The pilot is uncalibrated (one repository,
   model readers, a model grader), so a rise is reported as a number and
   never as evidence that a change is better.
4. **The key stays held out.** The regression's questions and key are never
   put in a brief, a packet or any other text an authoring session is given.
   `packages/polaris-dossier/src/regression-hold-out.test.ts` fails if any
   eight consecutive words of one of the key's 24 question texts or 81
   required facts appear in the brief's sources, the installed agent texts or
   the authoring kit, and `brief.test.ts` checks a rendered brief for the 24
   question texts only. [Observed] The required facts were added to the
   search on 2026-11-22 because they gave no hit in those files that day;
   none is shorter than eight words. The test does not search for the model
   answers, and a paraphrase passes it. It also cannot keep the key from a
   session: `docs/evidence/pursuit-2026-11-21b/pilot/key.json` is a tracked
   file, so it sits in the checkout an operator session starts from. An
   authoring session works in the observed repository's clone or copy; an
   operator does not hand it this checkout.

## Public-clone validation is part of done

Any governance change must leave a fresh `git clone` able to reconstruct the
project's current shape.

- Run the validation commands in `PROJECT-STATUS.md` ("How to verify this
  page") plus `python3 scripts/check_governance.py`.
- Confirm no active artifact depends on the git-excluded `_bootstrap/**` tree
  for essential meaning: citing it as unavailable history is fine; needing it
  is not.

## Vendored external material

`.claude/skills/th-engineering/` and `.codex/skills/th-engineering/` are
vendored tooling configuration: do not edit them to satisfy a local checker
or to add Syzygy-specific rules; overrides belong in `craft-and-care/`.

- **What they are:** a byte-identical, MIT-licensed vendored copy of the
  `engineering-bar`, `test-rigor`, and `dependency-hygiene` subskills that
  `.syzygy/governance/policies/craft-and-care/` adopts by reference (owner
  override, 2026-08-06).
- **What they are not:** application or library code, or authored here.
- **Rule:** do not edit it to satisfy a local checker or to add
  Syzygy-specific rules; overrides belong in `craft-and-care/` instead.
- **Provenance, exact commit, and recomputable digests:**
  `.syzygy/governance/policies/GOVERNANCE-SUBSTRATE-LOCK.yaml`
  (`th_engineering`).

## Where Beads applies

`bd` (Beads) tracks process housekeeping, the implementation backlog, and the
POC improvement cycles — see `AGENTS.md`, "Beads scope", which owns this rule.

- Unknowns still go to the pending-decision queue, not the tracker: an open
  question for the owner is not a task.

*Superseded, dated:* until 2026-09-05 this section read "It is **not** used
for product work: no implementation issues, epics, or backlog exist, and none
may be created before specification authoring opens." True when written on
2026-08-19; false from the first implementation epic onward.

## Reporting a problem in the governance material

Contradictions between artifacts are **surfaced, never silently
reconciled**.

- If two documents disagree, report both readings rather than choosing one.
- A contradiction renders the affected conclusion Unknown and routes to the
  owner.
