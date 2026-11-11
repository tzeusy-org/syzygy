# Vision pursuit — Polaris dossier generation — 2026-11-09

This file is for planning only. It is not authority and not a review verdict. No bead filed
from it can run until the owner closes the gate bead named under "Gated epic". Claims carry the
labels `[Observed]`, `[Inferred]` or `[Unknown]` that the lanes gave them. Where the
orchestrator re-derived a claim, it says so. Every finding and move, with its full evidence,
is in `docs/pursuits/2026-11-09-vision-pursuit-data.json`:

> *Updated 2026-11-09, after the run:* "No bead filed from it can run until the owner closes the gate bead" no longer holds.
> The owner released five beads that do not depend on the gate, and later decisions moved parts
> of P8 and P13. The beads under epic `syzygy-fnry` are the current plan; this file records the
> run. See "Owner decisions after the run".

```sh
jq '.units[] | select(.lane=="design" and .unit=="first-screen")' docs/pursuits/2026-11-09-vision-pursuit-data.json
jq '.ranked_moves[] | {id, title, owner_value, build_cost, prereq}' docs/pursuits/2026-11-09-vision-pursuit-data.json
```

## Scope and provenance

| Item | Value |
|---|---|
| Run | Third Polaris pursuit, and the first scoped to **dossier generation**: `syzygy dossier` / `syzygy polaris`, `packages/polaris-dossier`, the live part of `packages/polaris-generation-core`, the dossier-site renderer and the `polaris-dossier` skill. The earlier pursuits tiered the Butlers `/polaris` page, so this board has no tier baseline (see Tier board). |
| Owner's questions | "What major feature adds should we consider in our auto-generation mechanism, to make Polaris able to generate a beautiful and intuitive manifesto for any generalized codebase?" and "Is the current state of the Polaris codebase one that you would be proud of? Does it uphold /th-engineering and /th-design standards?" |
| Syzygy | Audited at `fd08ea62` (the local main checkout). `origin/main` reached `256a41b9` during the run (launch-time consent pdja.21, fidelity cost pdja.19, P3 notes). The orchestrator checked that drift: `close.ts` is unchanged, and `brief.ts` still never states the declared audience, so no finding below is retired by it. |
| Subject output | Redis 8.10.2 dossier, run `run-ffe579c7…` (closed 2026-11-08). It was compared with `run-2ecdcab0…` (2026-11-07) and `run-d9411d26…` (the run the owner reviewed on 2026-11-06, epic `syzygy-pdja`). The run directories were read only. |
| Lanes | Three long-lived lanes, each with a checkpoint file per unit and at most three in flight: engineering audit (6 units, `/th-engineering`), design audit (6 units, `/th-design`, headless-Chrome screenshots at 1440×900 and 390×844, light and dark), and ideation (7 lenses plus a synthesis). There were 0 lane errors. |
| Orchestrator checks | The orchestrator re-derived these from disk: render at draft revision 5 only; revision 6 fidelity `not-ready`; the audience absent from `brief.md`; 20 credential copies (paths and modes only); a glossary with 1 entry; 0 `judgement` marks in the latest draft; 0 of 45 pages with a script; a 64-hex digest on `index.html`; `renderDossierSite` at 563 lines. |

## North star (quoted)

The doctrine (`.syzygy/governance/doctrine/vision.md`) begins: "Showing the truth is the soul
of the product." VIS-1 sets the order: truth, then comprehension ("comprehension is achieved by
simplifying presentation, never content"), then momentum. VIS-2: no evidence means Unknown.
VIS-3: digestible by a human unfamiliar with the project. VIS-4: humans steer; agents draft.
VIS-7: every encoding means what its legend says. The product goal (2026-09-12) is
generalizable LLM-assisted manifesto generation, with Redis and Butlers as proving cases. The
owner's target experience (2026-11-06) is "an opinionated, approachable account of why a
project exists and how it works, with evidence one step away rather than inline, split across
navigable pages. It stays a fully functional static site."

## Answer to "would you be proud of it?"

**I am proud of the integrity core. I am not yet proud of the product built around it, and
neither the code nor the output meets the `/th-engineering` or `/th-design` bar today.**

- **What is world-class [Observed].** Every citation and quotation is re-derived from Git
  objects at the pinned revision. `Observed` is reserved for quotations Syzygy verifies
  itself. Each agent session runs in its own bubblewrap view, behind a broker that admits only
  that session's commands. All 1,923 internal links across the 45 pages resolve. Test tiers
  are enforced mechanically, and rule-6 mutation evidence is kept per change (eng `test-rigor`:
  solid).
- **Where the engineering falls short [Observed].**
  - The run that is actually used, `syzygy polaris`, is still labelled "prototype". It parses
    its own stdout back as JSON and reaches sessions by typing into their terminals with
    `tmux send-keys`. Its state machine has no test.
  - The renderer is one 563-line closure that builds HTML by string concatenation.
  - The live renderer still carries the parked provider mode.
  - The live path is about 19.1k lines, roughly 1.4–2× a greenfield sketch. The excess is in
    its shape, not its bulk.
  - The check measures safety rigorously and quality barely: about 29 structural finding kinds,
    against 4 unstored advisory counters.
- **Where the output falls short of the design bar [Observed].** The output is a careful,
  legible draft, and real progress since 2026-11-06 is measured:
  - The overview went from 30.7 screens to 4.6.
  - Words before the thesis went from 544 to 141.
  - Stock meta-language ("The project states", "the agent", "Unknown") went from 53/8/23 to
    5/0/0.
  - There were 0 contrast failures over 532 text nodes.

  It is not yet a beautiful manifesto:
  - On a phone, all 45 pages scroll sideways, and no page title is on the first screen.
  - Two of the five diagrams overflow their column on a laptop.
  - The glossary has one entry, titled `u-term`.
  - All 263 citations land at the top of a source page that has no line numbers (`redis.conf`
    is 55.6 screens long).
  - There are 0 judgements in 136 claims, and all 24 quotes open "The project states:".
  - There is no code or CLI example anywhere.
- **The deepest problem is the loop, not a page.** The site the owner opens is draft revision
  5, which the design reviewer had already judged `not-ready` (2 blocking findings). The
  author's revision 6 was then blocked by fidelity. `close` sealed the run with both final
  verdicts not-ready. Every page still says "Rendered-design review: none counts [Unknown]".
  Readiness does not yet measure what the owner reviews: the design reviewer reads 3.4 MB of
  HTML and never sees a rendered page.

## Tier board

This is the first run over these surfaces, so it claims no tier movement. Measured change
against `run-d9411d26` is quoted where a lane measured it [Observed].

| Lane | Surface | Tier | One-line gap |
|---|---|---|---|
| eng | Run lifecycle (`polaris.ts`, `close.ts`, sessions, broker) | functional | Sound step commands under a "prototype" supervisor: stdout parsed back, `tmux send-keys`, no state-machine test. `close` neither refuses nor discloses an unrendered or not-ready final revision. |
| eng | Check and schema | functional | Near world-class at integrity, barely measures quality. Fidelity and design share one repair budget, with design last. |
| eng | Renderer (`dossier-site.ts`) | functional | All links resolve and the SVG is inert. One 563-line string-concatenating closure with 88 manual `escape()` calls. The provider mode is still live. |
| eng | Generation core | functional | 18 of 27 modules are live and careful. The other 9 (2,097 lines) form a parked island that still shapes the live draft model. |
| eng | Test rigor | solid | Enforced tiers, literal expectations, kept mutation records. The supervisor has no test. 12 of 2,846 tests timed out under load (157 s wall time). |
| eng | Greenfield parity | functional | About 1.4–2× the sketch. Authority reads are scattered, the supervisor parses strings, and the renderer is not componentized. |
| design | First screen | functional | A correct one-line "what", but only after 141 words of apparatus (544 before). On a phone the first screen holds no thesis. |
| design | Poles and navigation | weak | One page became 5 (index 30.7 → 4.6 screens). The Poles are the brief's generic questions, not Redis's own categories. No current-page mark, no previous/next links, and a glossary that cannot be used. |
| design | Diagrams and visuals | functional | Sound accessible scaffolding and a static fallback, but 5 boxes-and-arrows flowcharts with one layout. No sequence, state or layered view, and none on the deep dive. |
| design | Deep dives and reference | functional | Evidence pops on hover, but each citation lands at the top of an unnumbered source page. Apparatus is still on the reading path (168 words per page). |
| design | Voice and prose | solid | Biggest mover: meta-language down from 53/8/23 to 5/0/0, mean sentence 19–24 words, and every mechanism paired with its cost. Not yet opinionated (0 judgements). |
| design | Craft sweep | functional | AA contrast clean, one h1, skip link, a 67 KB entry page. Sideways scroll on 45 of 45 pages at 390 px, an unfinished type scale, no print style. |

## Systemic themes

1. **Readiness measures safety, not quality, so the owner is the only quality gate.** Fidelity
   and design reached "ready" on the run the owner then faulted 16 ways (pdja framing). The
   design reviewer reads HTML source and never sees pixels. Reader-quality counts are advice
   that is not stored. The reader-test engine (`runReaderTest`, `evaluateDossier`) exists, but
   only the scripted harness calls it. Exemplars: E2-F1, D6 gap, I4-F1, E4-F2.
2. **The loop seals what it has not shown.** Render happens only on a ready fidelity verdict
   (`polaris.ts:712`). Design comes last and draws on the same draft-count budget
   (`check.ts:172-173`, `polaris.ts:547-551/671/699`). `close.ts:55` has no site or review
   stage. `record.json` mixes revisions: commands come from revision 6, the site from revision
   5. Exemplars: E1-F2, E1-F8, D2-F1, I7-F1 (corrected below).
3. **The reader and the argument are implicit.** `polaris.ts:165-169` requires the declared
   audience and `run-record.ts:81` stores it, but the brief never states it. The schema has no
   thesis, no spine and no decision record. Zero judgement marks appear across all 7 Redis
   draft revisions, although the owner allowed judgements (pdja point 16). The brief pastes
   pipeline rules and then overrides them (`brief.ts:61/70` against `:193`). Exemplars: I5-F1,
   I2-F1, D5-F1.
4. **One template for every repository.** There are four fixed owner topics in a fixed order,
   a seven-dimension technology table shaped for servers, one layered left-to-right layout for
   all six diagram kinds, and Poles that echo the brief instead of the project. Only Redis has
   ever run live, so generality remains unmeasured (L8 persists). Exemplars: I1-F1, D2-F2,
   I3-F1.
5. **Show-then-tell is unbuilt.** The `code` element exists and was used 0 times. There is no
   hero example after the thesis, and the deep dive has no figure. The owner's own bar
   (requests: thesis, then an eight-line session) is not reachable through the schema's
   defaults. Exemplars: I3-F2, D1-F2.
6. **A prototype's shape is carrying a product's load.** The supervisor round-trips stdout,
   dormant arms stay in the live build, the renderer has two modes, authority reads are
   scattered, and record sentences do not depend on the launch mode. One of those sentences is
   false and leaves credential copies behind (theme 7). Exemplars: E1-F3, E3-F1, E4-F1, E6-F1.
7. **The run record's credential sentence is false.** The Execution Record says Syzygy wrote no
   credential to the state directory. Launched runs copy `~/.claude/.credentials.json` into
   each session's agent home. 20 copies persist across 5 runs, 16 of them at mode 777. The
   state root is 777. `~/.local` is 700, which bounds the exposure. The orchestrator
   re-derived the paths and modes only, never the contents. Exemplar: E1-F1.

## Ranked moves

Ranking rule: owner value first, in VIS-1 order (truth, then comprehension, then momentum),
then the inverse of build cost, then prerequisite class (none, then spec amendment, then owner
act), then how many lanes converged. Ids are P1…P15, so they cannot be confused with M1…M16
(2026-09-13) or N1…N15 (2026-09-22). Every move was deduped against the 70-row known ledger.
Where a move continues an open bead, it says so. Full slices, merged agent moves and evidence
are under `.ranked_moves[]`.

**P1 — Honest close and a review loop on every revision (truth; 5/2; spec amendment, sequenced after dossier spec v1.6).**
- Render each checked revision; rendering is deterministic and cheap.
- Run a mechanical design pre-pass before the fidelity repairs are spent.
- Give fidelity and design separate repair budgets.
- Make `close` record each review kind's final standing, the site of record, the revision each
  record field comes from, and how the run ended. `close` refuses, or labels as such, a run
  whose latest passed draft is newer than its site.
- Re-stamp the review-status region of every page.
- Merges E1-M1, E1-M6, D2-M1, I7-M1 and S-M1. Relates to `syzygy-1z8m`.
- It amends the same spec as v1.6 (`syzygy-pdja.26`, PR #808), so it follows that sign-off or folds into it. Overlapping OpenSpec changes are prohibited.
  *Updated 2026-11-09, after the run:* the owner signed v1.6 and PR #808 merged, so P1 follows it, in the
  v1.7 delta that `syzygy-fnry.19` drafts.
- It travels with P3 and P5 as one coordinated delta.

**P2 — The record tells the truth about credentials (truth, security; 5/2; slice 1 none, slice 2 waits on P-117 Q1).**
- Choose record sentences by launch mode.
- Delete every agent-home credential copy at stop and close, or hand the credential over
  through the broker.
- Refuse a state root wider than 0700.
- Merges E1-M2.
- Slice 2's remedy, deletion or broker hand-over, is the question already open as P-117 Q1 (`syzygy-bpyt.8.15`).
- Cleaning up the existing files is owner item `creds`.

**P3 — Thesis-first landing and a spine (comprehension; 5/2; spec amendment).**
- The renderer owns the landing order: title, then a one-sentence thesis (what, for whom, why),
  then the hero artifact (P5), with no apparatus above it.
- The schema gains `thesis` and 3–5 `pillars`. Each pillar names its cost and the Pole that
  substantiates it, and `check` requires every pillar to be served.
- The draft notice, legend and review status (168 words on each page) become a one-line
  ribbon.
- The brief stops pasting rules and then reversing them.
- Merges D1-M1, I2-M1, I2-M5, D4-M2 and S-M3.
- It changes signed clauses: the landing composition (local-agent-mode spec line 259) and the legend (line 247).
- It travels with P1 and P5 as one coordinated delta.

**P4 — Make the reader explicit (comprehension; 5/2; none).**
- Put the declared audience into the brief and into RS-2. This first slice is bug-sized.
- The landing page gets 3–5 reader-intent routes ("I want to use it", "I run it in production",
  "I want to change it", "Is it right for me?").
- Add a skim view (headings, opening sentences, diagrams).
- Optional persona lenses over the same content.
- Merges I5-M1, I5-M2, I5-M3 and S-M2.

**P5 — Show, then tell (comprehension; 5/2; spec amendment).**
- A `hero` slot: a verified, screened excerpt of code, a CLI session or a usage transcript,
  byte-checked like a quote, placed right after the thesis.
- Annotated code walks: Syzygy renders the cited lines, and the author writes cited margin
  notes.
- `check` advises when a dossier has no hero artifact.
- Merges D1-M2, I3-M3 and the S-M7 hero half.
- The hero slot changes the signed landing and quotation clauses, so it travels with P1 and P3.

**P6 — Rendered reader probe: give readiness pixels (comprehension, truth; 5/3; spec
amendment).**
- After render, headless Chrome (the existing cdp-browser) runs at 1440×900 and 390×844, in
  light and dark.
- It asserts no horizontal scroll, the thesis and h1 on the first screen, no diagram overflow,
  and a word budget.
- It stores the screenshots and gives them to the design reviewer.
- Reader metrics are stored with each run and diffed run over run. They are advice, never an
  oracle.
- A render-regression script re-renders every stored draft after each renderer change.
- Merges E2-M1, D6-M1, E2-M2 and I4-M2.

**P7 — Comprehension probe as a readiness input (comprehension; 5/3; spec amendment).**
- A fresh "newcomer reader" session sees only the rendered site.
- It answers the frozen questions (TARGETS' seven) through the existing `ReaderAnswerPort`.
- Answers are graded against the understanding record and kept with the page locations used.
- The result shows on the review page and feeds readiness.
- Merges E4-M1, I4-M1 and S-M4. The scored cross-target corpus (I4-M3, an owner act) is slice 4.

**P8 — Opinion with receipts (comprehension; 5/3; spec amendment for quotation syntax).**
- One labelled Polaris judgement per Pole, with cited premises, counted by `check`.
- Decision records, rendered as cards beside their mechanism and gathered into a "Choices and
  costs" index: context, choice, the alternatives the sources name, what it buys, what it costs
  and its basis.
- Quotation syntax is freed: any lead-in, or a pull quote, with comment markers stripped from
  the displayed text and the raw bytes kept in the evidence view.
  *Updated 2026-11-09, after the run:* the comment-marker display moved to P13 (`syzygy-fnry.13`) under
  owner decision `fnry-19-p13-scope`. P8 keeps the free lead-in.
- A maintainers'-voice strip.
- Merges D5-M1, I2-M2, D5-M2, I2-M4 and S-M8. Coordinate with `syzygy-cnwp` (REQ-038/039).

**P9 — Archetype awareness (breadth; 5/3; spec amendment, corpus admission is an owner act).**
- Syzygy fingerprints the repository's shape from the tree listing it already reads (manifests,
  bins, workspaces, docs-site configs). The author confirms the archetype.
- The archetype selects question packs, preferred elements, technology-table dimensions and
  page templates (library: hello-world plus API map; CLI: command surface plus pipeline;
  monorepo: subsystem atlas).
- The maintainers' own information architecture (mkdocs nav, Sphinx toctree, SUMMARY.md) seeds
  the Poles, which are named in the project's vocabulary.
- Merges I1-M1, I1-M2, I1-M3, D2-M4 and S-M6. I1-M4, an archetype-diverse corpus, rides
  `syzygy-mea.2`.

**P10 — Hierarchical exploration with a coverage map (breadth; 5/3; none).**
- Syzygy partitions the pinned tree into subsystems.
- Scout sessions return cited subsystem cards.
- `check` requires a card or a `deferred-by-budget` entry for every subsystem.
- The cards render as a subsystem atlas.
- This is what makes a Sentry-sized monorepo tractable. Merges I6-M1 and S-M9.

**P11 — Owner steering, end to end (VIS-4; 5/3; spec amendment for annotations).**
- An owner steering record beside the run config: audience, thesis hunch, must-cover topics,
  paths to ignore, preferred Pole names and glossary seeds.
- An outline sitting before drafting: thesis, archetype, Poles, routes and the riskiest
  interpretations, in one bundled question.
- Annotate-and-rerender: owner notes on claims come back as structured repair input.
- Merges I7-M2, I7-M3, I7-M4 and S-M10.

**P12 — A diagram grammar that matches the question (comprehension; 5/4; spec amendment for
required diagrams).**
- Kinds with their own layouts: sequence (participants over time), layers and containment,
  state machine, timeline and data layout.
- Responsive layout: left-to-right and top-to-bottom variants switched by a container query,
  with long chains wrapped.
- Epistemic state encoded per diagram, with only the exceptions dashed.
- The hash-allowed progressive-enhancement script for zoom, pan and step sync, with the static
  fallback unchanged.
- Merges I3-M1, D3-M1…M4, I3-M5 and the S-M7 diagram half.

**P13 — Wayfinding and line-precise evidence (comprehension; 4/1; none, subject to a check that it touches no signed clause).**
- Source pages with line numbers and a per-line id. Citations link to `#L<a>-L<b>` with a
  `:target` highlight, and no script.
- A sticky sidebar with `aria-current`, plus previous and next links on every page.
- A real glossary: display terms, first-use `<dfn>` and a native popover.
- The mobile fix: the digest moves off the per-page aside, plus `overflow-wrap`.
- Quotes from Markdown sources are shown as clean text.
- Merges D4-M1, D2-M2, D2-M3, D6-M2 and D1-M3.
- *Updated 2026-11-09, after the run:* P13 was split in three, and its quotation part is not clause-free.
  - The sidebar, previous and next links, glossary and mobile fix are released as `syzygy-fnry.18`.
  - Line-linked citations are released as `syzygy-fnry.20`. The link sits beside the RFC7-10
    anchor and leaves it unchanged, so no signed clause changes.
  - Clean-text display changes the signed clause "SHALL be the span Syzygy located" (local-agent-mode
    spec line 247). The owner chose to widen it from Markdown sources to every quotation: each one
    displays the normalised run the quote check matched, and the evidence view keeps the raw span.
    It goes in the v1.7 delta (`syzygy-fnry.19`) and is built by `syzygy-fnry.13`.

**P14 — Engine foundation (momentum; 4/3; none; the E1-M5 retirement of the operator mode is
an owner act).**
- A typed `RunEngine` with an explicit state machine replaces the stdout-parsing supervisor.
  Its transitions get table-driven tests.
- Messages travel through the broker as acknowledged rounds, retiring `tmux send-keys`.
- The renderer is rebuilt as a typed `SiteModel` feeding components.
- The live renderer gets one mode. The provider-mode copy is parked beside its golden file.
- One `Authority` snapshot port.
- A ratcheting size budget.
- Merges E1-M3, E1-M4, E5-M1, E3-M1, E3-M2, E6-M1, E6-M3, E2-M3 and E4-M2. It overlaps
  `syzygy-bpyt.8` and `syzygy-bpyt.5.2`: file it under or beside them, not as a competitor.

**P15 — Regeneration and a dossier diff (truth over time; 4/4; none).**
- `init --from <sealed run>` pins a new revision and re-locates every prior citation as moved,
  stale or broken.
- It repairs only what changed.
- A claim-level diff page between two sealed runs, proven on the Redis licence trio (7.2.4,
  7.4.0, 8.0.0).
- Merges I6-M2, I6-M3 and S-M11. Measured cost per stage (I6-M5) is slice 4.

**Answer to "what major features should we add?"** For a beautiful and intuitive manifesto from
any codebase, the major additions are P3, P5, P8, P9, P10 and P12. They supply a thesis and a
spine, show-then-tell, opinion with receipts, archetype awareness, hierarchical coverage, and a
diagram grammar. P6 and P7 are what let anyone know that those additions worked. P1 and P2 come
first because the system that would ship them currently seals unreviewed output and a false
record sentence.

### Retained, not ranked

These are in `.units[]`:
- I3-M2, parser-derived `Observed` structure: needs an RFC 0007 label amendment.
- I7-M5, publishing into the observed repository: needs a new write-consent class.
- I2-M3, consented history mining: an owner act under REQ-038.
- I6-M4, an understanding cache.
- I4-M5, per-archetype reader budgets: should follow P6's first measurements.
- D6-M3 and D6-M4, the type scale and print style: travel with P13, overlapping
  `syzygy-dov.16.6`.

## Corrections applied by the orchestrator

- **Revision 6 did not pass fidelity.** The ideation and design lanes said it did.
  The run's sixth fidelity check record (under its `reviews/checks/` directory, outside this
  repository) is `validated` with readiness `not-ready`,
  `blocking: true`. So keeping the revision-5 site was the supervisor working as written
  (`polaris.ts:712`). The defect is that nothing says so, and that design's one repair was
  spent and then blocked by the shared budget (E1-F8).
- **The renderer closure is 563 lines** by brace count
  (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts:238-800`). The lane said
  565.
- **The 12 test timeouts were measured on a host at load 26–34 on 12 cores.** An isolated
  re-run of the four affected files still timed out twice, so this is real but load-sensitive.
  Log: the lane's scratch `eng-vitest.log`, which was not retained in the tree.

## Owner gates this run

There is one packet with two items. It was reviewed by an independent subagent before it was
served. (*Updated 2026-11-09, after the run:* a second packet followed; see "Owner decisions after the run".) The packet lives at `~/.tmp/user-questionnaire/syzygy-2026-11-09-pursuit/packet.md`.

- `pursuit-2026-11-09-release`: the release scope for the gated epic.
- `pursuit-2026-11-09-creds`: what to do with the 20 credential copies that already exist (P2
  fixes the code going forward).

An independent reviewer returned Revise on both items in rounds 1 and 2, and Pass/Pass in round
3. The corrections are applied in the packet:
- Closing the gate releases all fifteen moves, so a partial release means ungated slice beads.
- P1, P3 and P5 amend the spec v1.6 is amending.
- P2's remedy, and the credential question as a whole, already sit with P-117 Q1.
- The cleanup population includes session `.key` files.

The spec amendments that P1, P3, P5, P6, P7, P8, P11 and P12 carry are not questions here. They
enter the feature-request funnel after release and reach the owner as CC-REV-2 deltas.
*Updated 2026-11-09, after the run:* the owner's choice A had P1, P3 and P5, with P13's clause-bound part,
drafted now as one v1.7 delta (`syzygy-fnry.19`), ahead of release. The other moves' deltas queue
behind it.

## Owner decisions after the run

The beads are the current plan. These decisions changed it after the report above was written.

| Decision | Choice | What changed |
|---|---|---|
| `pursuit-2026-11-09-release` (packet 1) | A, 2026-11-09 | The gate `syzygy-fj2q` stays open. Released without it: `syzygy-fnry.16` (P2 slice 1), `.17` (P4 slice 1), `.18` (P13 wayfinding) and later `.20` (P13 line links). `.19` drafts one v1.7 delta for P1, P3, P5 and P13's clause-bound part. |
| `pursuit-2026-11-09-creds` (packet 1) | A, 2026-11-09 | The 20 existing credential copies, their session keys, shell snapshots and session environments were removed from closed runs' agent homes. P-117 Q1 is still open. |
| `fnry-19-p13-scope` (packet 2) | B, 2026-11-09 | v1.7 lets every quotation display the normalised run the check matched, with the raw span in the evidence view. `.13` is widened to all quotations; `.8` drops its comment-marker display. |

Settled without an owner question during the bead passes, and recorded on the beads:

- Line-linked citations need no spec change, so they were released as `syzygy-fnry.20` under
  choice A.
- A counted glossary check, which would be a version 2 of the reader standards, is "not now".
  The decision and the condition for asking again are on `syzygy-fnry.18`.
- How P1 reaches the one-command run (the candidate `polaris-dossier-one-command-run` change)
  is asked when v1.7 is offered. Its options are on `syzygy-fnry.19`.

Packets: `~/.tmp/user-questionnaire/syzygy-2026-11-09-pursuit/packet.md` and
`~/.tmp/user-questionnaire/syzygy-2026-11-09-beads/packet.md`. Neither is in the repository.
Each decision record is copied onto the beads it changed.

## Gated epic

The epic and gate ids are recorded on the epic bead. Each child depends on the `[HOLD]` gate,
and the epic is assigned to the owner so it stays off `bd ready`. **Closing the gate is the
owner's move, and it releases the children.**
*Updated 2026-11-09, after the run:* "each child" means the move beads `syzygy-fnry.1` to `.15`. The
released slices `.16` to `.20` do not depend on the gate.

## Known ledger and deviations

- **Deduped against** 70 open or in-flight Polaris rows (`syzygy-pdja`, `-mea`, `-u05`,
  `-1z8m`, `-bpyt.5`/`.8` and others), LEARNING-LOG L1–L13 and the Redis gap list. L8, which
  says generality is unmeasured, persists.
- **Retention deviation.** The deliverables rule keeps only the two newest data files.
  `2026-09-13-vision-pursuit-data.json` has live citers under `docs/evidence/` (9 files), so it
  was not pruned. The cap is exceeded by one file, deliberately.
- **No harvest file is committed.** The raw lane checkpoints stayed in the session scratchpad.
  The data file holds every unit's structured output verbatim.
