Subject: openspec/changes/dossier-derived-base-views/proposed/polaris-generation/spec.md (REQ-polaris-generation-034 version 2.NN over 2.24)
Spec sha256: a203e6b7c1d31276ec0b9bb0c5db81390526f2fd76085276f1cba5617ae58448
Verdict: REVISE
Reviewed commit: 7760aede (origin/agent/syzygy-3efd.38)

# R-DERIVED-BASE-VIEWS-SPEC-1 — fresh-context specification review

Reviewer: independent fresh-context agent (r38spec), 2026-11-24. Read-only.
Scratch worktree `.worktrees/review/r38spec` detached at 7760aede.

## Bytes verified

- [Observed] `sha256sum` of the subject at 7760aede: `a203e6b7c1d31276ec0b9bb0c5db81390526f2fd76085276f1cba5617ae58448` — matches the brief.
- [Observed] Predecessor `openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md` hashes `f06e830d…8c54` both on origin/main and in the worktree, matching SEMANTIC-DELTA and `MODEL_SUBJECTS`.
- [Observed] `GOVERNING-DEPENDENCIES.json` is byte-identical to version 2.24's (`cmp` exit 0).
- [Observed] The branch touches no file under `apps/` or `packages/` (0 paths). It adds no script to any rendered page: the chip, hidden items and notice are plain HTML.

## Governing references read

- RFC7-28, `.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:101–108, located through DIRECTIVE-REGISTER.md:423. Quoted: "A hand-composed diagram is narrative content under every rule in this package: each named element carries an anchor or a non-normative/proposed marking; speculated structure never looks like existing structure [Observed: trust-and-evidence.md]; every encoding means what its legend says (VIS-7); a text equivalent exists (RFC7-34). Curated diagrams claim no reproducibility-from-snapshot and must not imitate the computed map; embedded computed visuals inherit the map surface's obligations; curated/computed provenance is a machine-readable attribute on every visual."
- trust-and-evidence.md:156–159: "Rendering may blend the layers, provided provenance is available where the claim is consumed (hover, query, API field) and inferred structure stays visually distinct from observed structure. A speculated future component must never look like an existing one."
- VIS-2 (vision.md:136): "No evidence means Unknown, not success." VIS-7 (vision.md:294): "The observatory itself must be trustworthy."
- RFC9-38 (visual-grammar-and-lenses.md:354): every scene names its evaluation on the surface. RFC9-44 (:546): unmapped code "never disappears: no filter default, LOD step, lens, or profile may drop it".
- The bead syzygy-3efd.38 (outcome and exclusions), design.md, proposal.md, SEMANTIC-DELTA.md.
- `scripts/check_governance.py` CG-1b (`CODE_PATH`, line 439; loop at 765–787).

## Summary

[Inferred] The idea fits RFC7-28. A view that embeds the directory map's or the unit map's elements in a curated figure, tagged `computed`, is the "embedded computed visual" the clause names. Making the chip, hidden items and note computed is the right way to keep the map's denominator. Read-only access to the map is stated well (spec.md:156), and the carried text is byte-faithful (finding 12).

As written, though, the text does not secure three things the exception depends on:
- it does not keep authored and derived visually distinct in the drawing (finding 5);
- its operations contradict each other or the predecessor in four places (findings 1–4);
- its counts and machine form are underspecified or wrong for the unit map (findings 6–8).

None of these needs a doctrine amendment. All are repairable in the specification, so the verdict is REVISE, not a doctrine block.

## Findings

### 1. `select` and `group` cannot both be used. Blocking.

[Observed] At spec.md:150, `base-conflict` fires "at the second and each later place a base path takes in one view's `select`, `hide` and `group` together, and at a `names` entry or `group` path naming an element the view leaves out".

- A path in `select` and also in `group` is a second place, so it is a conflict.
- A `group` path that is not in `select` names an element the view leaves out, so it is also a conflict.

So no `group` path is legal in a view with `select`. The brief paragraph (spec.md:158) and D4 present `group` as freely combinable. The unit map can exceed 40 elements, and D7 says `select` is how such a map is reduced, so for that map `group` is unusable exactly where it is needed.

Repair: count only `select`/`hide` co-occurrence and `hide`/`group` co-occurrence as conflicts. A `group` path must be shown (in `select` where `select` is present). Add a scenario of `select` plus `group`.

### 2. The containment expansion contradicts 2.24, and its bounds are left open. Blocking.

[Observed] 2.24 (spec.md:140, carried) says: "the top-level groups are the selected elements whose `parent` is absent or not selected", and a group's children are the selected elements whose `parent` is that element. The new render paragraph (spec.md:152) says a containment view's figure "holds, as top-level groups, each element of the model the view selects". That flattens the parent nesting 2.24 requires. Both texts govern a v13 containment view with a `base`, and they disagree.

[Observed] spec.md:148 relaxes "the one-to-40 bound of its `elements` list". The containment bound at spec.md:134 is "two to 40 elements", which is not one-to-40. So whether a containment base view may select zero or one model element is undecided. Yet the `units` layout depends on it ("each shown base element no `group` entry names as a top-level group of its own").

[Inferred] 2.24 (spec.md:136) withholds `containment-depth` "because [it] cannot arise there: the `element-parent` bound keeps every expansion within three levels". A `group` that places base elements inside a third-level model element makes a fourth level. No finding covers it.

Repair:
- Base the expansion on 2.24's parent expansion, with base elements added as children of their `group` element and the root's contents under the root.
- State the containment base view's element bound explicitly (zero to 40, or one to 40).
- Either bound depth with `containment-depth` over the expansion, or forbid `group` into an element that has a selected parent.

### 3. A containment view of the directory map can leave the root out. Blocking.

[Observed] `base-root` (spec.md:150) fires only "at a `group` path or `hide` path that names `.`". A containment view whose `select` omits `.` leaves the root out through `restReason`, with no finding. The layout then places "each shown top-level directory no `group` entry names" "inside the repository root", which is not drawn. D4's stated invariant, "the root frames it and is not hidden or grouped", is bypassed.

Repair: extend `base-root` to a containment `select` of the directory map that does not name `.`, or have the root always shown in a directories containment view whatever `select` says. Add the scenario.

### 4. A unit-map path can name several elements; `names`, base ends and `group` assume one. Blocking.

[Observed] spec.md:148 says that for `units` a base path is "a manifest file's path, naming every listed `package` and `module` fact of that file". But:
- `names` gives "the draft's display name for one base element";
- a base end names "a base element", and the arrow "is drawn at that base element's box" (spec.md:152);
- `base-conflict` speaks of "a base element".

Where one manifest yields two listed facts, the text cannot say which box the name or the arrow attaches to.

Repair: either key a unit base element by `(path, kind, name)` or by the fact's position within its file, or state that `names` and base ends require a path naming exactly one listed fact, with a `base-reference` (or new) finding otherwise. Add the scenario.

### 5. The drawing does not keep authored and derived distinct. Blocking under RFC7-28 and trust-and-evidence, repairable in this spec.

(a) [Observed] A display name is the draft's claim, "labelled Inferred or Unknown" (spec.md:148). Yet it is drawn inside the base element's single box, which carries Syzygy's mark: "its box reads `<Syzygy's label> · <name>`" (spec.md:152). The scenario at spec.md:1456–1460 makes this explicit: the box reads `src/ · Server code` and "is drawn solid as Observed by the fact", while the name is "labelled Inferred". An Inferred or Unknown claim of the draft is thus drawn in Observed solid line, and its marking appears only in the list item.

Consequences:
- trust-and-evidence's requirement that "inferred structure stays visually distinct from observed structure" is not met in the drawing, which is where the box text is read.
- This is the bead's exclusion, "cannot be relabelled as authored or the reverse", in its reverse direction: authored text acquires derived marking.

(b) [Observed] Unit base elements are "labelled `<name>`, Inferred" and drawn dashed (spec.md:152; the unit map scenario at spec.md:~1430 has "dashed and Inferred"). A draft's own Inferred element is also dashed. The spec gives a base element no visible distinction in the drawing; `data-visual-provenance="computed"` is an attribute only. No finding forbids a model element, or a display name, whose label equals a shown base element's label.

So a draft can place an authored element `api`, Inferred, beside the derived package box `api`, Inferred. The two are indistinguishable in the drawing. That is a curated element imitating the computed one inside the same figure (RFC7-28: "must not imitate the computed map"), and a possibly speculated component looking like an existing one (trust-and-evidence:159). The page's legend says nothing about computed provenance, so RFC7-28's "every encoding means what its legend says" offers no help.

(c) [Observed] A grouped base element sits box-in-box inside a model element (the draft's claim, Unknown today). The root's directories sit box-in-box inside the root (the record's `contains`, Observed). The drawing shows the two nestings identically. Provenance is in the list and in `machine.json`, which trust-and-evidence's "hover, query, API field" allows. This part is a note, not blocking.

Repair:
- Draw a display name outside the base box's mark: as a second line or caption carrying the name's own line style and marking, or in the list item only, never in the box.
- Give base elements a visible computed treatment in the drawing, with a legend entry such as "Computed by Syzygy from the <map>".
- Add a finding, for example `base-conflict` or `base-label`, when a model element selected by the view, or a display name, equals a shown base element's Syzygy label.
- Add a scenario for each.

### 6. The chip's remainder and note do not match the map pages. Blocking.

(a) [Observed] For `units` the chip uses "the member's `factsNotListed`" (spec.md:154). `factsNotListed` counts the facts of all ten recognizers past the first 1,000 (spec.md:174: "the first 1,000 facts are listed and the rest counted in `factsNotListed`"). Those include dependencies, workflows, jobs, services, resources and targets, not only `package` and `module` facts. So "The map counts <m> more and does not list them", after "packages and modules", states a false count. The unit map's own sentence (spec.md:~200) is "<k> facts of the manifest files are counted and not listed, so a figure or list may lack them".

(b) [Observed] The directory map's coverage line (spec.md:196) carries, besides the unlisted directories, "<S> left out and not named, because a secret detector matches their path; and <G> submodules, not followed". The chip carries only `unitsNotListed`. A base figure can therefore read "Showing 13 of 13 …; none hidden." over a tree holding secret-matched or submodule top-level directories. That drops an unmapped district from the figure's denominator, against RFC9-44's "never disappears" and RFC7-28's "embedded computed visuals inherit the map surface's obligations".

(c) [Observed] The figure note is "the map's own note sentence, `Computed by Syzygy at this render …`, as that map's page carries it" (spec.md:154). The directory map's note is "the region's note" (spec.md:196), which does not begin with that literal. The literal fits only the manifest maps (spec.md:~200). Taken literally the two halves of the sentence conflict for `directories`.

(d) [Observed] The noun clause reads "Showing 13 of 13 top-level directories and the repository root" (spec.md:1496), where 13 is 12 directories plus the root. A reader will take it as 13 directories plus the root. And `1 top-level directory` "for one" is wrong when t = 1, because then the one element is the root.

Repair:
- For `units`, count only unlisted `package`/`module` facts. Either derive that count, or carry the unit map's own sentence verbatim and drop the per-noun claim.
- For `directories`, carry the coverage line's S and G counts in the chip, as counts and never as names.
- Write the note as "the map page's note" with no literal prefix, or give each map's literal.
- Reword the noun, for example "the repository root and <t−1> top-level directories", and fix the singular case.

### 7. Scenario "Chip links from a deeper page" cannot be built. Blocking for testability.

[Observed] spec.md:1494–1497 has a record that "lists 12 top-level directories, the record counting 3 more not listed". The record's rule (spec.md:46) is "At most 250 directories are listed, the first 250 in that order; the rest are counted in `unitsNotListed`". With 12 listed, `unitsNotListed` is 0. No fixture tree satisfies the WHEN, so the scenario's Oracle cannot be fixed "from the fixture's tree … by hand" as the amended Form line requires.

Repair: use 250 listed plus 3 counted. That tree also trips `base-size` unless `select` is used, so add `select` to the scenario. Alternatively, test the remainder clause on the unit map once finding 6(a) is repaired.

### 8. `hide` with `select`, and `machine.json` `base`, are underspecified. Blocking.

(a) [Observed] `hide` and `select` may both appear. A `hide` path that `select` already leaves out is in neither conflict clause (spec.md:150). The hidden list then holds one item per `hide` entry "then one for `restReason`" (spec.md:154). Their `data-hidden-count` values would sum past `<h>` = `<t>` − `<s>`, and the reason shown for that element is undecidable.

Repair: make `hide` and `select` mutually exclusive (a `schema` finding), or define `restReason`'s count as the elements `select` leaves out less those `hide` names, and state that the item counts sum to `<h>`.

(b) [Observed] `machine.json` `base` (spec.md:154) carries `hides: [{"paths","reason","count"}]` but no `select`/`restReason`. The page's `restReason` item therefore has no machine counterpart, and the page and machine form disagree. It does not say whether `elements` lists the shown elements or all of them. `name` is "the display name's claim identity", but the spec defines no identity form for a `names` entry: a node has an `id`, a `names` entry has none. It does not say what `base` holds when the base is not established at the render: `shown`, `total`, `hides` and `elements` are unspecified when `established` is false.

(c) [Inferred] Where check could not establish the base, the paths "are left unresolved" and no finding blocks review (spec.md:150). If the render then establishes the base, `hides.paths` echoes the draft's own path strings, which may include a path a secret detector matches. D6 assumes check and render always agree, but the object reader can refuse transiently. If the render also fails, the content of `hides.paths` is unspecified. Either way the text does not guarantee that a secret-matched path is never named in the published machine form.

Repair:
- Add `select` and `restReason` with its count.
- State that `elements` lists the shown elements, in figure order.
- Define a display name's identity, for example `<diagram>:name:<k>` or a required `id` member on each `names` entry.
- State that `hides[].paths` carries only paths the render resolves to listed elements, and that where `established` is false `base` is `{"map","established": false, "reason"}` alone.

### 9. Smaller ambiguities. Note.

- spec.md:152 draws directories "as the directory map draws it: labelled `Repository root` or `<path>/`". The map draws `<path>/ (<count> files)` (spec.md:~48). Say "labelled … rather than the map's `(<count> files)` form", or keep the count.
- The tally: a base element "enters none of the draft's counts". The graph tally ("as marked: O observed, I inferred, U unknown") counts drawn elements. Say whether base elements, the chip and contains arrows count in the tally, and add a scenario.
- A hidden item's `<noun>` for `directories` reads "top-level directories and the repository root" even when the root is not among them. Give its own noun rule.
- "Not established at the render" is defined only for check (`unknown` state). Say whether a stale or not-current record, whose elements render Unknown but listed, counts as established. `<words>` in the notice: name the exact span of the map's sentence it copies.
- A reason or `restReason` of whitespace only satisfies "one to 200 characters". A `restReason` without `select` has no finding stated.
- spec.md:1468–1471 ("Cited arrow joins two base elements"): fix in the WHEN that no dependency fact joins `web` and `api`. A `depends-on` between two `package-manifest` units may otherwise be witnessed and render in Syzygy's words, contradicting the THEN.
- A v11 draft carrying `view.base`: 2.24 already reports `field-version` at `view`. Say whether `view.base` gets a second one.
- A `base-reference` detail echoes the author's path. That is the author's own text in a check finding, and it does not distinguish a secret-matched path from an absent one [Observed: same detail], so it leaks nothing. Acceptable.
- Two views over one base: decidable. Each figure has its own chip, and `names` is keyed per view, so two names are two claims. D8's "anchor once" rule for repeated display names is in design.md only, not in the spec. Either drop it from the design or state it.

## Adversarial drafts decided by the text alone

| Draft | Outcome by the text | Decidable? |
|---|---|---|
| Hide every element | Graph view with model elements: chip "Showing 0 of t …; t hidden". With none: `base-size` (no box). Directories containment: `base-root` blocks hiding `.` | Yes |
| Hide the root | Containment of directories: `base-root`. Graph view: allowed, counted | Yes; the `select` bypass is finding 3 |
| Hide without a reason | `schema` at that member (spec.md:148; scenario 1451) | Yes; whitespace reason, finding 9 |
| Select an unlisted path | `base-reference` (spec.md:150; scenario 1473) | Yes |
| Secret-matched or hidden path | Not in the record or member, so `base-reference`, same detail as absent; no oracle | Yes at check; render echo risk, finding 8(c) |
| Grouping against real nesting | Allowed as the draft's claim, Unknown via `relation-witness`; drawn box-in-box like the derived nesting | Decidable; visual concern 5(c); depth, finding 2 |
| Display name equal to another label | Allowed; no finding | Decidable but unsafe, finding 5(b) |
| Unknown or partial base | Unknown: notice, no findings at check. Partial: chip remainder | Unknown decidable; partial remainder wrong, finding 6 |
| s/t/h with hide and select | Undefined when `hide` names an unselected path | No, finding 8(a) |
| v12 draft with `base` | `field-version` in place of `schema` (spec.md:150, 160; scenario 1499) | Yes |
| Two views over one base | Independent chips; per-view names | Yes |
| `select` plus `group` | Every `group` path is a `base-conflict` | Decidable but self-defeating, finding 1 |
| Units manifest with two facts, named | Undecidable target box | No, finding 4 |

## 10. Authority. Note.

[Inferred] The exception fits RFC7-28 as written in its structure:
- it is an embedded computed visual;
- every base element, arrow, list item and the chip carry `data-visual-provenance="computed"` with their fact identity;
- the figure stays `curated`;
- `machine.json` carries `provenance` per element, so the clause's machine-readable attribute requirement is met.

It does not cross VIS-2: an unknown base renders a notice, never a figure (spec.md:154; scenario 1488). It is not a doctrine-class change.

The gaps are the visual-distinctness and obligation-inheritance gaps in findings 5 and 6. They are failures to meet RFC7-28 and trust-and-evidence in this text, not a need to amend them. The amended predecessor sentence at spec.md:52 ("Apart from that read-only reading, a draft cannot name, place, …") is consistent: `group` places a base element in the draft's figure, never in the derived figure or record.

## 11. CG-1b handling. Note, compliant.

[Observed] CG-1b (`check_governance.py`:439, 779–787) requires every code span whose whole content matches `CODE_PATH`, `` `[A-Za-z0-9_.\-/]+\.(md|py|sh|ya?ml|json|txt)` ``, to resolve in this repository. The paths now inside JSON spans are `api/package.json`, `worker/package.json` and `web/package.json` (spec.md:1464, 1470). The whole span does not match the pattern, so CG-1b does not examine them.

[Inferred] These are synthetic fixture names for scenarios, not Butlers paths. The Butlers note ("Never backtick a Butlers path in a packet (CG-1b)") concerns packets naming the observed repository's files, and this is a specification, not a packet. CG-1b's purpose is that a backticked path is a reference claim about this repository. A scenario's draft member written as its literal JSON is not such a claim, and the JSON form is the more exact rendering of the member. The predecessor's own scenario writes fixture paths unbackticked (`packages/a/package.json`, spec.md:~1430).

So the move complies with CG-1b's intent and does not evade it. [Unknown] The pre-move form was not reviewed; only 7760aede is in scope.

[Observed] `python3 scripts/check_governance.py` at 7760aede reports "21 OK, 17 WARN, 0 FAIL (38 checks)".

## 12. Carried text and bookkeeping. Note, verified.

- [Observed] Word diff of predecessor against subject, by `difflib` over lines and then words. Changed requirement lines are 15, 40, 52, 333→347, 491→505, 1433–1435→1512–1514 and 1437→1516: 9 lines. There are two insertions: 14 lines after 147 (7 paragraphs) and 65 lines after 1430 (12 scenarios). Lines 1 and 3 are the file head. Every displaced and inserted fragment matches SEMANTIC-DELTA's "Amended in place" list. The predecessor requirement spans lines 7–1448 (1442 lines), and 1433 are carried, as SEMANTIC-DELTA states.
- [Observed] Scenario count: 207 in the predecessor and 219 in the subject. `check_spec_reconciliation.py` asserts "v2.NN replaces exactly 034 (207 to 219 scenarios)" (lines 9047–9063).
- [Observed] Wiring: `VBASE_*` constants pin the subject digest, and `vbase_binding` is pending until a seven-column row. It is added to `check_outcomes`, `census`, `count_polaris_effective_scenarios.py` and `openspec/README.md` (status "Candidate 2.NN … not in the effective composition until its row"). `check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS". `count_polaris_effective_scenarios.py` reports "TOTAL: 39 requirements, 538 scenarios", equal to PROJECT-STATUS.md's assertion, because the change is pending.
- [Observed] Older drafts: spec.md:160 holds v12 and earlier to 2.24's bytes, with the `field-version` exception only. The provider closed schema gains no member. Map pages, `computedMaps` and the derived-structure region are pinned byte for byte "with no draft" (spec.md:154).
- [Observed] There is no script in any rendered page. No new source read: base resolution uses the record and member check and render already derive (spec.md:150, 152). There is no SEC-5 change: the screening policy is not touched. The residual risk to secret-matched path names is finding 8(c).
- Note: the selftest of `check_spec_reconciliation.py` was not run, by instruction.

## Repair order suggested

5 (visual distinctness), 6 and 7 (chip and remainder), then 1–4 (operation rules), then 8 (machine form), then the notes. Every repair is in the spec text and its scenarios. The digest pins in `check_spec_reconciliation.py` (`VBASE_SUBJECTS`) and SEMANTIC-DELTA must follow the new bytes.
