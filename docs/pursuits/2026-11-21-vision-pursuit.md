# Vision pursuit — Polaris dossier generation, run 4 — 2026-11-21

This file is for planning only. It is not authority and not a review verdict. No bead filed
from it can run until the owner closes the gate bead named under "Gated epic". Claims carry the
labels `[Observed]`, `[Inferred]` or `[Unknown]` that the lanes gave them; where the
orchestrator re-derived a claim, it says so. Every finding and move, with its full evidence,
is in `docs/pursuits/2026-11-21-vision-pursuit-data.json`:

```sh
jq '.ranked_moves[] | {id, title, owner_value, build_cost, prereq}' docs/pursuits/2026-11-21-vision-pursuit-data.json
jq '.units[] | select(.lane=="audit" and .unit=="visual-vocabulary")' docs/pursuits/2026-11-21-vision-pursuit-data.json
```

## Scope and provenance

| Item | Value |
|---|---|
| Run | Fourth Polaris pursuit, and the second scoped to dossier generation. It chains from `docs/pursuits/2026-11-09-vision-pursuit.md` (run 3, moves P1–P15, epic `syzygy-fnry`). |
| Owner's question | "What major feature adds should we consider in our auto-generation mechanism, to make Polaris able to generate a beautiful and intuitive manifesto for any generalized codebase? Priorities: generalizable, extremely readable, visually rich (diagrams, flowcharts, architectures)." |
| Syzygy | Read at `origin/main` `c5e40bfe2`. |
| Subject output | The newest real dossier: Redis 8.10.2, the dossier run closed 2026-11-15 (its full run id is `.subject_output` in the data file), final rendered site. It was compared with run 3's subject, the run closed 2026-11-08. Run directories were read only. |
| Lanes | Two long-lived lanes, one checkpoint file per unit: an audit lane (6 units: movement, rendered visuals, visual vocabulary, generality, readability mechanism, sweep; screenshots at 1440×900 and 390×844) and an ideation lane (6 lenses and a synthesis; the outward lens used generic web searches and read summaries only, so every external claim is `[Inferred]`). |
| Orchestrator checks | Re-derived from the files: the doctrine sentence at `trust-and-evidence.md:105`; the spec clause at line 236 of the local-agent-mode dossier spec; RFC7-28's text; the source policy's identifier and its excluded words `design` and `architecture`; the state of every `syzygy-fnry` bead. |
| Limit | All six real runs on disk are of redis/redis. Every statement here about another kind of repository is `[Inferred]`. |

## North star (quoted)

"Showing the truth is the soul of the product." VIS-1 sets the order: truth, then comprehension
("comprehension is achieved by simplifying presentation, never content"), then momentum. VIS-2:
no evidence means Unknown. VIS-3: digestible by a human unfamiliar with the project. VIS-7:
every encoding means what its legend says. The owner's target (2026-11-06): "an opinionated,
approachable account of why a project exists and how it works, with evidence one step away
rather than inline, split across navigable pages. It stays a fully functional static site."

## The answer in brief

**The feature to add is not a better author. It is a Syzygy that observes more, so the author
writes less and draws almost nothing from memory.** Run 3's moves all asked the authoring
session to do more: a thesis, opinions, better diagrams. This run finds three structural limits
that no prompt reaches, and one idea that addresses all three priorities at once.

1. **Generalizable is bounded by what a dossier may cite and by what Syzygy knows before
   writing starts.** The source policy every dossier run uses was derived for the Butlers
   repository. It refuses, as project documentation, any docs path with the word `design` or
   `architecture` in it, admits docs only under a top-level `docs/` or `doc/`, and admits code
   in 25 extensions with no YAML, TOML, JSON, Terraform, Dockerfile or notebook `[Observed]`.
   The reader topics and the technology table describe a networked server. The newest author
   inspected 22 of Redis's 1,861 files and nothing measured that `[Observed]`.
2. **Visually rich is bounded by one drawing.** The diagram kind never reaches the layout, so a
   state machine, a boundary and a flow are the same left-to-right boxes. A deep dive cannot
   hold a figure. One fan-out disables wrapping, so the newest run's 8-box flow is 2,248 px wide
   in a 981 px column. The legend offers "Solid: observed" while the schema lets no diagram
   element be Observed, so every figure is fully dashed. No figure element links to its source
   `[Observed]`.
3. **Extremely readable is bounded by page shape, not by sentences.** Sentences are plain and
   short (run 3's biggest improvement held). The reading path has no third-level heading, about
   200 words of apparatus sit on every reading page, and the only readability gate reads HTML
   source and never sees a layout `[Observed]`.

**The unifying move is a structure record (Q2).** Syzygy derives, deterministically, what the
pinned tree declares about itself: packages and their dependencies, binaries, CI jobs,
deployment topology. That one record is the scaffold for figures, the witness that confirms or
challenges each arrow an author draws (Q3), the denominator for coverage, and the profile that
chooses the page plan (Q9, Q10). Doctrine already calls such a fact Observed: "a deterministic
claim with a resolvable evidence link". Only one dossier spec clause stands in the way, so run
3's "needs a label amendment" was wrong `[Inferred: a reading of quoted clauses, put to the
owner below]`.

**What a reader would get** `[Inferred]`: for a small Rust CLI, a six-page dossier whose first
screen is a thesis and a hero figure in which the workspace crates are solid, derived boxes
that link to their manifest lines, a four-lane "how a search runs" that collapses to a stepper
on a phone, and a caption reading "5 relationships: 3 derived by Syzygy, 2 cited readings". For
a 300-package monorepo, a landing figure of nine derived domains ("showing 9 groups of 300
packages, full map"), zoom into each, deep prose for the most central packages and derived
cards for the rest, with coverage stated in first-party bytes.

## Movement since run 3

**No reader-visible mechanism has moved in twelve days `[Observed]`.** The renderer, the layout
and the draft schema have 1, 0 and 0 commits since 2026-11-09, and every renderer-determined
figure is identical on both sites: 141 words of apparatus before the thesis, sideways scroll at
390 px on every page, no current-page mark, no previous or next links, no line anchors. What
differs is author variance under a near-identical brief: the glossary went from 1 entry to 10,
reading words from 3,963 to 2,281, diagrams from 5 to 3, and the overview lost its figure.

- Of the 22 child beads of `syzygy-fnry`, 1 is closed: `.17`, the declared audience in the brief. It
  landed after the newest run's brief was issued, so it is in the code and in no output yet.
- The newest run did close honestly (both reviews ready, the site of record is the final
  revision). That is the old supervisor on a run that converged, not P1.
- The twelve days went to launch consent, the governance simplification D10 (performed
  2026-11-18) and source binding. D10 matters here: spec changes are now agent-decidable, so
  most prerequisites below no longer wait on an owner act.
- Correction to run 3: its finding that the left navigation is not sticky does not reproduce;
  the desktop panel computes `position: sticky` on run 3's own site.

**So the first answer to "what should we add" is: run 3's reader-facing moves, which are
still unbuilt.** The moves below sit under or beside them and say which to split or re-order.

## Tier board

Movement is against the run-3 row each surface corresponds to. Only measured change counts.

| Surface | Tier | Movement | One-line gap |
|---|---|---|---|
| First screen | functional | unchanged, identical pixel positions | About 470 px of apparatus and a legend for marks the site never uses, before the title. |
| Diagrams as rendered | weak | down from functional (5 → 3 figures; author variance) | Three all-dashed graphs, none showing what a list could not; one overflows 2.3× its column. |
| Visual vocabulary | weak | none; newly measured | One layout under six kind labels; no nesting, lanes, time or order; deep dives barred from figures. |
| Generality: source reach | weak | new row | A Butlers-derived policy excludes design and architecture documents and most configuration formats. |
| Generality: templates and exploration | weak | unchanged | Four fixed topics, seven server dimensions, at most three deep dives, 1.2% of files inspected, no coverage measure. |
| Readability: sentences and voice | solid | unchanged | Plain and cost-paired; still 0 judgements and every quote opens the same way. |
| Readability: page structure and wayfinding | weak | unchanged | No subheadings, heavy apparatus, citations land at the top of unnumbered files. |
| Quality enforcement (check and design review) | weak | unchanged | A reviewer blind to layout passed an overflowing figure; counters are unstored. |

## Systemic themes

1. **What may be cited bounds every priority.** Exemplars: A4-F1, A4-F2.
2. **One picture, labelled six ways.** Kind is a label, figures attach only to sections, the
   wrap fails on the commonest flow shape, and the one visual Syzygy verifies itself (the code
   excerpt) has been used 0 times. Exemplars: A3-F1, A3-F2, A3-F3, A3-F6.
3. **The author is asked to draw what Syzygy could derive.** 20 of 1,861 paths are cited, and
   every box and arrow is the author's recollection. Exemplars: I1-F1, I7-F2.
4. **Readable sentences, unreadable shape.** Exemplars: A5-F1, A5-F2.
5. **The gates cannot see what they judge, and movement is invisible.** The design reviewer's
   27 findings mention overflow, scroll, mobile, width or pixels 0 times; nothing stores a
   metric from one run to the next. Exemplars: A5-F3, A1-F1.
6. **Generality cannot be measured before it is enabled.** The planned probe
   (`syzygy-fnry.22`) would today measure the Butlers policy and the server templates.
   Exemplars: A4-F6.
7. **The legend states an encoding that cannot occur.** A VIS-7 defect in every figure today.
   Exemplar: I2-F3.

## Ranked moves

Ranking rule: owner value first, in VIS-1 order; then enabling order (a substrate before what
depends on it); then the inverse of build cost. Scores are value/cost on 1–5. Ids are Q1…Q14,
distinct from M (2026-09-13), N (2026-09-22) and P (2026-11-09). Each was deduplicated against
P1–P15 and the open Polaris beads. Slices, merged lane moves and evidence are under
`.ranked_moves[]`. None touches doctrine.

**Q1 — A dossier-own source policy (generalizable; 5/2; new).** Replace the Butlers-derived
classification for dossier runs: docs at any depth and under any docs root, design and
architecture documents admitted, package READMEs, and configuration, infrastructure and
notebook formats. Secret and active-content screening stay unchanged. It is first because no
other move can recover a fact a dossier may not cite, and because the generality probe is
meaningless before it. Coordinate with the held policy successor, `syzygy-pdja.23`.

**Q2 — A structure record of the pinned tree (generalizable, visual; 5/3; sharpens P9, P10).**
A deterministic derive stage: path-only facts first (sizes, languages, vendored code set aside,
citable or not), then manifest and configuration recognizers, later import graphs. Each fact
carries its rule, version, path and lines. From it come a trait profile (has a CLI, a library
API, a service, infrastructure, a docs site, a size class) and a coverage map. Slice 1 reads no
file body and is itself the cheapest generality measurement.

**Q3 — Arrows with receipts (visual, truth; 5/2; new).** Widen one spec clause so a fact Syzygy
derived by a declared rule renders Observed; an agent still labels nothing Observed. Give every
edge a relation type; check upgrades an edge the structure record witnesses and challenges one
it should have witnessed. Generate each legend from the encodings the figure uses, and print a
tally under every figure ("14 relationships: 9 derived by Syzygy, 5 cited readings"). Slice 1
(legend and tally) needs nothing else and repairs theme 7.

**Q4 — A picture on the first page (visual, readable; 5/2; sharpens P3, P12).** Let a figure
attach to any page, deep dives and the overview included (a cost-1 change that removes a
structural bar). Require a hero "system at a glance" figure after the thesis, whose regions
link to the Poles that cover them, with an honest "omitted, with reason". Rides the v1.7
landing clause (`syzygy-fnry.19`).

**Q5 — Figures that explain themselves (readable, visual; 5/2; sharpens P5, P12, P13).** A
section may declare a walk: numbered prose steps bound to figure elements. Choosing a step
highlights its box by CSS alone; each box and arrow label links to its cited lines through an
HTML layer over the inert SVG. The walk is the figure's text alternative. The code excerpt
gains line numbers, highlights and cited margin notes, and the brief asks for one wherever a
mechanism is explained. This retires P12's planned script for step sync.

**Q6 — Typed figure kinds (visual; 5/4; sharpens P12).** A union of figure records, each with
its own fields and layout: sequence, swimlane (a stepper on a phone), containment, state, and
four that render as HTML: record layout, stack, timeline and comparison matrix. Each figure
states the question it answers. Slice 1 is bug-sized: wrap or stack any directed graph, which
fixes the 2,248 px flow.

**Q7 — One system model, many views (visual, generalizable; 5/3; sharpens P12).** The draft
carries one model; figures are views of it at context, container or component level, so
pictures cannot contradict each other and a box with its own view carries a zoom link. Syzygy
also renders computed map pages straight from the structure record, and an author's view may
start from one, then group, hide with a reason and add cited runtime arrows. A pruned view
prints what it omits.

**Q8 — Pages with a shape (readable; 5/3; sharpens P4, P7, P13).** A Pole becomes subsections
that each open with a one-sentence answer; the renderer adds subheadings, an on-page contents
list and a takeaways strip. A block's level is its reading depth (30 seconds, 5 minutes,
everything), switched by CSS, with a qualifying Unknown promoted to the depth of the claim it
qualifies. Glossary terms record where they are introduced, and check advises on use before
introduction.

**Q9 — Shape packs as data (generalizable; 5/3; sharpens P9).** The constants that assume a
server (reader topics, technology dimensions, requested assets, worked examples) move into
versioned pack files keyed by trait, composed for every trait a repository has. Packs may
declare simple recognizers that yield derived reference tables (commands, routes, configuration
keys), harvest the repository's own decision records, and read its docs navigation to name
Poles in its own vocabulary. A new kind of repository costs a file and a fixture.

**Q10 — A scale ladder (generalizable; 5/3; sharpens P10).** Size picks the strategy: read
everything; partition with scouts; deep-read the most central units and give the rest
derived-only cards; add atlas pages per domain. Coverage is shown in first-party bytes as
deep-read, derived-only and withheld. It supplies the partition rule and the ranking that P10
left open.

**Q11 — Instruments that see layout (visual, readable; 4/2; sharpens P6, P7).** Layout is a
pure function, so check can report an overflowing or list-shaped figure with no browser. Store
per-page reading metrics and show the difference from the previous run. Re-render the roughly
25 stored drafts after every renderer change. Route advisories the author cannot act on to the
run record. Later, a fresh reader transcribes each figure's screenshot and is graded by set
comparison against the figure's own model. The pixel-free half should not wait for P6's
headless browser.

**Q12 — A figure policy (visual; 4/2; sharpens P12).** The author writes a figure plan before
prose: per page, the question a picture answers better than text, and its kind. A versioned
table maps page types to required views, each with an honest omission. A chain of three or
fewer is a sentence; duplicates are flagged; a view's level constrains what may appear in it.

**Q13 — Generality you can prove (generalizable; 4/2; sharpens `syzygy-fnry.22`).** Synthetic
repositories of nine shapes run through derive, profile, page plan and render on every change,
with no model call. A small live corpus keeps a scorecard. Where a repository states no
purpose, the thesis is marked as Polaris's reading of the code and says no maintainer statement
was found.

**Q14 — Concrete anchors (readable; 4/2; new).** One running example whose premise cites the
project's own tests or documentation, threaded as a guided tour across pages, and an analogy
element that must cite where the analogy stops holding.

### What to build first

- **Wave 1, cheap and independent:** Q1; Q2 slice 1; Q3 slice 1; Q4 slice 1; Q6 slice 1;
  Q11 slices 1–3; Q13 slice 1. Together they remove the source bar, fix the overflow and the
  untrue legend, put figures on any page, make movement measurable and start measuring
  generality with no model call.
- **Then the visual transformation:** Q3 slices 2–3, Q4 slice 2, Q5, Q7, Q6 slices 2–3, Q12.
- **Then breadth:** Q9, Q10, Q8, Q14, and the live probe.

### What this does to run 3's moves

| Run-3 move | Disposition |
|---|---|
| P9 archetypes (`.9`) | Split: detection becomes Q2's computed traits; policy becomes Q9's packs. |
| P10 hierarchical exploration (`.10`) | Keep; Q10 supplies its partition, ranking and derived-only cards. |
| P12 diagram grammar (`.12`) | Split four ways: kinds Q6, model and views Q7, interaction Q5, required figures Q12. Drop its step-sync script. |
| P6 reader probe (`.6`) | Split: the pixel-free half (Q11 slices 1–3) ships first. |
| P7 comprehension probe (`.7`) | Sharpen: per-depth questions (Q8) and the exactly graded figure probe (Q11). |
| P3, P4, P5, P8, P13 | Unchanged and still wanted; Q3's tally fills P3's ribbon, Q5 absorbs P5's code walks, Q8 is P4's skim view. P8 needs a schema slot: a second run produced 0 judgements. |
| P14 engine foundation (`.14`) | Re-rank up: its componentized renderer should precede Q6 slice 2 and Q7. |
| `syzygy-fnry.22` generality probe | Sequence after Q1, or record the Butlers policy as its known confound. |
| Retained "parser-derived Observed structure" | Replaced by Q2 and Q3; its stated prerequisite does not hold. |

### Retained, not ranked

In `.units[]`: full-history views (churn, age), which need a new acquisition form and a privacy
decision; a tag-and-changelog timeline that needs neither (I1-M5); tree-sitter-class parsing,
deferred behind the three cheaper tiers; an image element for screenshots (A4 assumptions);
optional zoom and pan script for very large computed maps.

## Strongest objections

- **This builds generality machinery before any non-Redis run exists.** Answer: Q2 slice 1 and
  Q13 slice 1 are themselves the measurement, call no model and read no file body. The live
  probe follows Q1.
- **A structure record could grow into a code-intelligence product, and a rich one pulls the
  dossier toward a catalogue.** Answer: recognizers are capped at three structured formats and
  line-oriented files; computed maps live on reference pages, one step from the argument.
- **One system model may raise repair cycles** (18 of 23 fidelity verdicts across five runs
  were not ready). Answer: seed the model from derived units, and ship the hero on today's
  schema first to measure whether one picture helps.
- **Fourteen more moves on top of fifteen unbuilt ones.** This is the real risk. The wave-1
  list is deliberately small, and the disposition table removes or folds four of run 3's moves.

## Owner gates this run

One packet, two items, reviewed by an independent subagent before it was served. The packet
path and decision ids are recorded on the gate bead.

- `pursuit-2026-11-21-release`: the release scope for the gated epic.
- `pursuit-2026-11-21-observed-derived`: whether a fact Syzygy derives by a declared
  deterministic rule may render as Observed. It is a spec clause and agent-decidable under D10,
  but it is a reading of the doctrine's definition of Observed, so it is asked.

Q1 changes a screening policy. D10 makes that agent-decidable; it is named in the release item
so the owner can veto it there.

## Gated epic

The epic and gate ids are recorded on the epic bead. Each move bead depends on the `[HOLD]`
gate, and the epic is assigned to the owner so it stays off `bd ready`. **Closing the gate is
the owner's move, and it releases the children.**

## Known ledger and deviations

- **Deduplicated against** P1–P15 and the 22 child beads of `syzygy-fnry`, the open Polaris and dossier
  beads (`syzygy-pdja`, `-mea`, `-k54o`, `-1z8m`, `-bpyt.8`, `-cnwp`), and LEARNING-LOG.
- **Retention deviation.** The deliverables rule keeps only the two newest data files. Both
  older data files have live citers under `docs/evidence/` and `.syzygy/`, so neither was
  pruned.
- **Lane structure.** The lanes ran their full unit lists in one dispatch each, checkpointing
  per unit, not one turn per unit. No engineering audit lane ran: the question was about
  features, and run 3's engineering findings stand unverified by this run `[Unknown]`.
- **No harvest file is committed.** The data file holds every unit's structured output.
