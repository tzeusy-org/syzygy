# Design: a figure plan before the prose, and three advisory figure rules

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.40, drafted on `main` at `e329883b` over the adopted version 2.22 text (`dossier-readers-edition`, row A-56). At that commit the code's draft schema is v9 and its brief v15 (`packages/polaris-dossier/src/draft-schema.ts`, `brief.ts`): the code of version 2.20 (schema v10, brief v16) has not landed, so every code site named in D8 is re-located on the base the implementation starts from.

## D1. The version label, the schema and brief numbers, and the concurrent candidate

- [Observed] On `origin/main` at `e329883b` the tags of this line run to `polaris-dossier-readers-edition-v2.22` (row A-56), the latest REQ-034 version; 2.21 (`dossier-verify-text`, A-55) moves REQ-033 alone.
- [Observed] One unlanded agent branch holds another REQ-034 candidate: `origin/agent/syzygy-3efd.31`, `dossier-containment-figure`. Its package was drafted as 2.21 and the lead's brief for this lane names it 2.23; it takes schema v11 and brief v17, and adds a ninth figure kind, `containment`. Reader's edition 2.22 (`origin/agent/syzygy-5dhm.136`) was unlanded when this lane was briefed and has since landed as A-56, so this text composes over it.
- [Inferred] So this package writes its version as the placeholder `2.NN` in the spec, the checker's tag and status prefix, and the index row. The label is chosen at adoption, after a fresh check of tags and agent branches, and the relabel is mechanical: the spec's bytes change (and its digest with them), so the adoption row names the relabelled digest and the review's bound digest is noted beside it.
- [Inferred] Schema and brief numbers follow `main`'s: schema v11 and brief v17, one past v10 and v16. These collide with the containment candidate's. Whichever of the two lands second recomposes over the other: it renumbers its schema and brief (v12 and v18), takes the other's text as its predecessor, and reconciles these three points:
  - the plan's `kind` list (eight kinds here) gains `containment` if containment lands first;
  - each advice rule states how it treats a containment figure (here none reads one, since it is in no family and carries no graph nodes);
  - `figure-mixed-levels` is the advice a containment figure answers, so a containment figure is a natural home for a figure the rule advises on, and the brief paragraph may say so.

## D2. Places, not pages

- [Observed] The bead asks for a plan "for each page". At version 2.22 a draft's page division depends on Poles: without Poles each section is a page; with Poles a Pole page holds several sections, and a Pole holding only the why section has no page (version 1.x Pole paragraph). A deep dive has its page only when produced.
- [Inferred] The plan is keyed instead by the places a figure can be homed (version 2.2): the overview, each section, each deep dive, written exactly as a diagram's `home`. That keeps the plan a function of the draft alone, independent of Poles and dispositions, and makes the match to a figure one comparison: the figure's `home` equals the entry's place. A Pole page then holds the plans of its sections, and the landing page the overview's plan.

## D3. The plan's form

- [Inferred] Two forms, not one with optional members. A planned figure has a question, a kind and a figure; an omission has a reason. A place where no picture answers better than text has no question to write, so forcing `question` and `kind` onto every entry would invite filler.
- [Inferred] Every place must be planned, once. The bead's "for each page" and its acceptance "each planned figure is matched to a figure or a reasoned omission" are both met by requiring an entry per place, each either matched or omitted with a reason. An unplanned diagram is allowed: a place may hold more figures than its one planned answer, and the duplicate rule (D6) catches the common waste.
- [Inferred] The plan's text is plain text, not a claim block, and renders nowhere. This departs from version 2.20's hero omission, whose reason is a claim block because it renders on the landing page. The plan is the author's working record: its question names what a reader would ask, which is no fact about the subject, and nothing of it reaches a reader, so it needs neither label nor citation nor fidelity entry. Rendering it would add text that restates figures (RS-20) and an unreviewed reader-facing surface.
- [Inferred] A planned figure whose diagram is not `produced` raises no finding, as a hero whose diagram is not produced raises none (2.20 D5): the disposition already records why it was not drawn.
- [Inferred] The v11 schema document admits any value at `figurePlan`, so every failure of the plan's form is a `figure-plan` finding with a literal detail, the pattern 2.20 used for `hero` at `$.hero`. One detail covers every malformed entry, so the author reads one instruction for one entry, and an entry that is not well formed is read by no other plan finding, so a malformed entry does not also report a duplicate place or a misplaced figure.

## D4. The plan gates; the advice does not

- [Observed] The bead's exclusion reads "advice in this slice, no gate"; its first acceptance criterion reads "A draft's figure plan validates and each planned figure is matched to a figure or a reasoned omission".
- [Inferred] This version reads the exclusion as governing the three figure advisories, and the acceptance as asking for a validated plan, so plan findings are repair findings like every other form finding, and the advice gates nothing. The plan's findings are all about the plan's own form and its match to the draft; none judges a figure's content, so none can make an author draw a figure that would not be true: an omission with a reason always clears a place.
- [Inferred] The alternative, an optional plan whose failures are advice, was rejected: a plan the author may skip silently is not written "before the prose", and an unchecked match would let a plan name figures that are not there. This reading is the one a reviewer should test first; if the owner or a reviewer reads the exclusion as covering the plan, the change is local: make `figurePlan` optional and move the plan findings into `figureAdvice`.

## D5. Advice as a report member, not a counted reader standard

- [Observed] The bead's design suggests "a new figure-policy module called from `reader-advice.ts`" and notes that "a counted rule needs its text in `reader-standards.ts` first". At 2.22, reader advisories are counted by the reading ledger under exactly the five keys `RS-13`, `RS-14`, `RS-16`, `RS-17` and `RS-19`, and the ledger is written into every draft check record, whatever the schema. `polaris-reader-standards-v1` is carried in the brief and the design packet and shipped as the skill's reference file, and "a version moves only with its bytes" (`reader-standards.ts`).
- [Inferred] Making the three rules counted standards would move the reading ledger's bytes for every draft of every schema and need a reader-standards v2 that moves every brief's bytes. So this version keeps them out of the reader standards and out of the ledger: a member `figureAdvice` on check's report alone, beside the `author`-class advice and without a class member, as the inventory-coverage advice of version 2.12 is. The implementation may still compute it in a figure-policy module called beside `readerAdvice`; what the spec fixes is where it is reported.
- [Inferred] Each rule carries an id and a version, as the mechanism rules of version 2.9 do, so a later change to a predicate is a new rule version stated by a later version of this requirement.

## D6. The three predicates

- [Inferred] Each predicate reads the draft's produced diagrams alone, so it is a pure function of the draft's bytes and decidable by a literal fixture. Each fires at most once per figure, naming the first witness, so a figure's advice is one line.
- Information floor. [Inferred] The bead's measure, "a chain of three or fewer is a sentence", is read as three boxes joined by two arrows. For a graph: at most three nodes and at most `nodes − 1` edges, which takes in a chain, a fan and a disconnected pair; a triangle of three edges, which carries a cycle a sentence states badly, is the near miss. A swimlane's steps are its boxes, chained by the arrows Syzygy draws (version 2.5), so at most three steps; a sequence's messages are its arrows, so at most two messages. The near misses are a fourth node, a third edge among three nodes, a fourth step and a third message.
- Duplicate. [Inferred] Two figures duplicate when one draws nothing the other does not: every box and arrow of one is among the other's. Identities cannot be compared (they are unique), so boxes and arrows are compared by their labels, normalised by trimming, collapsing white space and folding ASCII case only, a fold every implementation spells the same way. An arrow is keyed by its ends' labels, not its own label, since two figures drawing one connection may word it differently. Families keep a sequence (an order of events) from duplicating a graph that draws the same pairs. Containment, not only equality, is advised on, because a smaller figure repeating part of a larger one is the common case; of two equal figures only the later is advised on, so the author is told once. A figure needs an arrow or step to be advised on, so two figures sharing one lone box are not.
- Mixed levels. [Inferred] "Level" is decided only where the draft says what a box stands for: the `unit` a v9 node may carry. Enclosure is defined for the two units whose extent is a region of the tree: the repository root encloses every unit with a place in the tree (all but `dependency-name`), and a top-level directory encloses a package manifest, workflow job or compose service whose path lies under it. A figure that draws the enclosing and the enclosed unit side by side, with no `contains` arrow between them, mixes levels; with that arrow it shows the containment on purpose, which is what a containment or boundary figure does. The near misses are the `contains` arrow, two top-level directories, and a directory name that is only a prefix of a path (the directory `pack` beside a fixture manifest whose path begins packages/).
- [Inferred] Limits, stated so no reader takes silence for a pass: a node without `unit` is never compared, so the mixed-levels rule says nothing about most drafts until authors name units; labels that differ in more than case and white space are not duplicates; nesting among package manifests is not compared at this version.

## D7. Bytes that move

[Inferred] For a schema-v11 draft: check's findings on the plan, and check's report's `figureAdvice` member. Nothing else moves:
- No page, `machine.json`, `dossier.json` or size report carries the plan or the advice; a v11 draft renders as the same draft would as v10 without `figurePlan`, apart from any byte naming the schema or digest.
- No check record, `run-advice.json`, reading ledger or reading difference carries or counts the advice.
- A draft of schema v10 or earlier keeps every finding and byte version 2.22 gives it, but for a `field-version` finding at `$.figurePlan` in place of the `schema` finding there.
- The provider mode and its golden do not change, and no script is added.

## D8. What the code change must do

[Inferred] For the implementing session, on a base where schema v10 and brief v16 (version 2.20) have landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema v11 with `figurePlan` admitted as any value, a version predicate after v10's.
- `packages/polaris-dossier/src/check-derive.ts` (or a module it calls): the plan findings in the stated order, after the 2.20 `hero` findings, and the `field-version` finding.
- A new figure-policy module (for example `figure-policy.ts`) computing the three rules, called where `readerAdvice` is, and the report's `figureAdvice` member; nothing written to the check record.
- `packages/polaris-dossier/src/brief.ts`: brief v17, with the one paragraph after the hero paragraph.
- Tests: every scenario with literal expected values, each advisory's fixture and its near misses, stored drafts of v10 and earlier checked and rendered byte-identical, the provider golden unchanged, and a rule-6 mutation run over the new predicates.

## D9. Residuals

- [Inferred] The page-type table, and which view a page of each type needs, is syzygy-3efd.41.
- [Inferred] Whether planning before the prose, or the three advisories, improves a dossier is for a later review of rendered dossiers; no gain is claimed.
- [Inferred] The plan's questions are never shown to the rendered-design reviewer by this version; a later version may give them to the review packet.
- [Inferred] The containment reconciliation in D1 is left to whichever candidate lands second.

## Review

[Inferred] Not yet reviewed. An independent review in fresh context is to read the spec bytes named in the lead's dispatch; its raw is retained verbatim and its findings dispositioned here.
