# Vision pursuit — Polaris dossier generation, run 4 — 2026-11-21

This file is for planning only. It is not authority and not a review verdict. Every move bead
filed from it depends on the plan-hold bead named under "Planned epic". Claims carry the
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
| Orchestrator checks | Re-derived from the files: the doctrine sentences at `trust-and-evidence.md:17-18`, `:26-32`, `:105` and `:122`; the spec clause at line 159 of the adopted dossier spec; RFC7-28 and RFC5-14's text; the source policy's extension list, excluded words and line 257; the state of every `syzygy-fnry` bead. |
| Independent review | A fresh reviewer challenged the owner packet and Q1 to Q3 before publication. It returned Revise on both items and found six factual errors in the first draft of this report; all are corrected here (see "Corrections after independent review"). |
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
   writing starts.** The source policy every dossier run uses withholds, by name, any docs
   path with one of 25 words in it (design, architecture, ADR, RFC, spec, decision, manifesto
   and others), admits docs only as a root document, under a top-level `docs/` or `doc/`, or
   under a licences folder, and admits code in 25 extensions with no YAML, TOML, JSON,
   Terraform, Dockerfile or notebook; every other file is "excluded from reading and from
   egress" `[Observed]`. Withholding those words was the owner's signed choice when the scope
   was set, to keep possible governance text away from a provider, so widening it is asked,
   not assumed (Q1).
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
3's "needs a label amendment" was wrong `[Inferred: a reading of quoted clauses, which the
independent reviewer found survives the rest of doctrine and RFC 0007 with four conditions,
stated under Q3; put to the owner below]`.

**What a reader would get** `[Inferred]`: for a small Rust CLI, six pages opening on a thesis
and a hero figure whose crates are solid, derived boxes linking to their manifest lines, with
the caption "5 relationships: 3 derived by Syzygy, 2 cited readings". For a 300-package
monorepo, a landing figure of nine derived domains ("showing 9 groups of 300 packages, full
map"), zoom into each, and coverage stated in first-party bytes.

## Movement since run 3

**None of the reading-experience mechanism has moved in twelve days `[Observed]`.** The site
renderer (`dossier-site.ts`), the layout and the draft schema have 1, 0 and 0 commits since
2026-11-09, and every renderer-determined figure is identical on both sites. (The run-side
`render.ts` has 8 commits; one adds a launch disclosure to every page, which is reader-visible
apparatus. The newest run also predates the source-policy bytes adopted on 2026-11-18.) The
identical figures: 141 words of apparatus before the thesis, sideways scroll at
390 px on every page, no current-page mark, no previous or next links, no line anchors. What
differs is author variance under a near-identical brief: the glossary went from 1 entry to 10,
reading words from 3,963 to 2,281, diagrams from 5 to 3, and the overview lost its figure.

- Of the 22 child beads of `syzygy-fnry`, 1 is closed: `.17`, the declared audience in the brief. It
  landed after the newest run's brief was issued, so it is in the code and in no output yet.
- The newest run did close honestly (both reviews ready, the site of record is the final
  revision). That is the old supervisor on a run that converged, not P1.
- The twelve days went to launch consent, the governance simplification D10 (performed
  2026-11-18) and source binding. D10 matters here: under the amended VIS-4, specifications,
  screening policy within SEC-5 and "when implementation starts" are decided by agents and
  open to owner veto, so most prerequisites below no longer wait on an owner act.
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
| Generality: source reach | weak | new row | The source policy withholds design, architecture and decision documents by name and cannot read most configuration formats. |
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
   (`syzygy-fnry.22`) would today measure the source policy and the server templates.
   Exemplars: A4-F6.
7. **The legend states an encoding that cannot occur.** Every figure's legend offers a solid
   "observed" line that no figure can draw. It gives no drawn mark a false meaning, so it is a
   comprehension defect, not a breach of the VIS-7 floor. Exemplar: I2-F3.

## Ranked moves

Ranking rule: owner value first, in VIS-1 order; then enabling order (a substrate before what
depends on it); then the inverse of build cost. Scores are value/cost on 1–5. Ids are Q1…Q14,
distinct from M (2026-09-13), N (2026-09-22) and P (2026-11-09). Each was deduplicated against
P1–P15 and the open Polaris beads. Slices, merged lane moves and evidence are under
`.ranked_moves[]`. None touches doctrine.

**Q1 — Widen what a dossier may read and cite (generalizable; 5/2; new; owner answer first).**
Docs at any depth and under any docs root, package READMEs, and configuration, infrastructure
and notebook formats; and, as the part the owner chooses, the documents now withheld by name
because they may be governance text (design, architecture, ADR, RFC, spec, manifesto), each
classified by rule and sent under its true class per RFC5-14. The same policy successor adds
denied paths and detectors for the newly readable configuration formats; nothing existing is
weakened. It is first because no other move recovers a fact a dossier may not cite, Q2's
manifest recognizers cannot read a manifest without it, and the generality probe is confounded
before it. It reverses the owner's signed screening-scope-v2 choice and enlarges the set of
bodies that can carry an undetected secret, so it is asked (owner item below).

**Q2 — A structure record of the pinned tree (generalizable, visual; 5/3; sharpens P9, P10).**
A deterministic derive stage: path-only facts first (sizes, languages, vendored code set aside,
citable or not), then manifest and configuration recognizers, later import graphs. Each fact
carries its rule, version, path and lines, and states only what the rule matched, never an
interpretation. For a private repository nothing is derived from the size or object id of a
withheld blob. From it come a trait profile (has a CLI, a library API, a service,
infrastructure, a docs site, a size class) and a coverage map. Slice 1 reads no file body and
is itself the cheapest generality measurement. Slices 2 and 3 need Q1.

**Q3 — Arrows with receipts (visual, truth; 5/2; new; owner answer before slice 2).** Widen one
spec clause so a fact Syzygy derived by a declared rule renders Observed; an agent still labels
nothing Observed. The reading carries conditions: the structure record is an evidence artifact,
its fact class declares a currency bound, mixed figures carry machine-readable provenance and
never imitate a computed map, a derived fact states only what its rule matched, and an
authored arrow is upgraded only by a derived fact of the identical relation type (a manifest's
"declares a dependency" does not witness "calls"). It is staged: tree-metadata facts first, a
recognizer's facts only once that recognizer has fixtures and a mutation run.
Generate each legend from the encodings the figure uses, and print a tally under every figure
("14 relationships: 9 derived by Syzygy, 5 cited readings"). Slice 1 (legend and tally) needs
nothing else and repairs theme 7.

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

- **Wave 1, cheap, independent, and needing no owner answer:** Q1 slice 1 (measurement only);
  Q2 slice 1; Q3 slice 1; Q4 slice 1; Q6 slice 1; Q11 slices 1–3; Q13 slice 1. Together they
  fix the overflow and the untrue legend, put figures on any page, make movement measurable,
  measure how much of real repositories the policy can cite, and start measuring generality
  with no model call and no dossier run.
- **After the owner's two answers:** Q1 slice 2 (the wider policy), then Q2 slices 2–3 and Q3
  slices 2–3.
- **Then the visual transformation:** Q4 slice 2, Q5, Q7, Q6 slices 2–3, Q12.
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
| `syzygy-fnry.22` generality probe | Sequence after Q1, or record the source policy as its known confound. |
| Retained "parser-derived Observed structure" | Replaced by Q2 and Q3; its stated prerequisite does not hold. |

### Retained, not ranked

In `.units[]`: full-history views (churn, age), which need a new acquisition form; a
tag-and-changelog timeline that does not (I1-M5); tree-sitter-class parsing; an image element
for screenshots; optional zoom and pan script for very large computed maps.

## Strongest objections

- **This builds generality machinery before any non-Redis run exists.** Answer: Q2 slice 1 and
  Q13 slice 1 are themselves the measurement, call no model and read no file body. The live
  probe follows Q1.
- **A structure record could grow into a code-intelligence product.** Answer: recognizers are
  capped at three structured formats and line-oriented files; computed maps stay on reference
  pages.
- **One system model may raise repair cycles** (18 of 23 fidelity verdicts across five runs
  were not ready). Answer: seed the model from derived units, and ship the hero on today's
  schema first to measure whether one picture helps.
- **Fourteen more moves on top of fifteen unbuilt ones.** This is the real risk. The wave-1
  list is deliberately small, and the disposition table removes or folds four of run 3's moves.

## Owner gates this run

One packet, two items, reviewed by an independent subagent before it was served. The packet
path and decision ids are recorded on the plan-hold bead. Both are asked under VIS-4's rule
"when unsure, it treats the change as owner-class and asks".

- `pursuit-2026-11-21-source-reach` (Q1): how far to widen what a dossier may read and send to
  the declared provider, and whether documents withheld as possible governance text are
  included. RFC5-14 reserves to the owner "a change that would let content the
  secret-detection policy matches, or cannot classify, reach a provider"; Q1 admits
  configuration formats that are unclassifiable today, which is the owner-class core. The
  documents withheld by name are asked about only because admitting them reverses a signed
  owner choice.
- `pursuit-2026-11-21-observed-derived` (Q3): whether doctrine's definition of Observed covers
  a fact Syzygy derives by a declared deterministic rule. The spec clause is agent-decidable;
  the reading of doctrine is what is asked.

Release is not asked. Under VIS-4, when implementation starts is an agent decision, reported
and open to veto. The first draft of this run asked it; the independent reviewer rejected that
item's scope, correctly.

## Planned epic

Epic `syzygy-3efd` (moves `.1` to `.14`, in Q order), plan-hold `syzygy-8f2t`. Each move bead
depends on the plan-hold, which is an ordinary sequencing bead, not an owner gate: this run was asked what to
consider, so it files a plan and starts nothing. A lead session releases wave 1 by filing its
slices as ready beads and reporting them; the owner may veto any of it. Slices that wait on an
owner answer say so in their bead. Run 3's gate `syzygy-fj2q` still says "closed only by the
owner"; D10's follow-on F-10 (`syzygy-k54o.10`) names it for unblocking, and this run leaves
that to F-10.

## Corrections after independent review

Three review rounds; the raw texts are kept beside the owner packet. Corrected in this report:

- The source policy was called "derived for the Butlers repository"; its excluded words (25,
  not two) were the owner's signed choice in screening scope v2.
- Q2's manifest recognizers were said to need nothing; they need Q1.
- The Observed clause was cited to the predecessor spec, not the adopted one.
- "A VIS-7 defect" overstated the legend problem; "no reader-visible change" ignored a launch
  disclosure added to every page; wave 1 listed a Redis re-run, and this plan starts no run.
- Added: Q1 hardens screening for configuration formats in the same successor; a derived fact
  states only what its rule matched; nothing is derived from a withheld private blob's size.

## Known ledger and deviations

- **Deduplicated against** P1–P15 and the 22 child beads of `syzygy-fnry`, the open Polaris and dossier
  beads (`syzygy-pdja`, `-mea`, `-k54o`, `-1z8m`, `-bpyt.8`, `-cnwp`), and LEARNING-LOG.
- **Retention deviation.** The deliverables rule keeps only the two newest data files. Both
  older data files have live citers under `docs/evidence/` and `.syzygy/`, so neither was
  pruned.
- **Lane structure.** Each lane ran its full unit list in one dispatch, checkpointing per unit.
  No engineering audit lane ran; run 3's engineering findings were not re-verified `[Unknown]`.
- **No harvest file is committed.** The data file holds every unit's structured output.
