# Version 2.14 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-coverage-precheck/proposed/polaris-generation/spec.md` (coverage pre-check version 2.12, row A-40, tag `polaris-dossier-coverage-precheck-v2.12`; that file's SHA-256 is `995c2ec47619567a86a5899eacbe3b1cf96a652686af4bfa7cd51e0ea1841287`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.12 (and therefore after every version of REQ-034 before it that is in force). Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 117 to 135 scenarios; no other requirement changes. Its warrants block is unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is byte for byte version 2.12's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement (its paragraphs, its 117 scenarios, its `Oracle independence` line and its warrants block) appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a line diff against the predecessor shows, besides the file's title and preamble, exactly the changed lines listed below and the two insertions.

## Added

- 6 paragraphs after the predecessor's last paragraph, before the `ID:` line: the `taskRoutes` member, the route step's one form and its findings; brief v13 and its task-routes section quoted whole; the fragment identities; the find-by-task page; the index's five kinds and their matching rules; and the index's order, markup, link rule, the two `machine.json` members, the reading ledger and the provider mode.
- 18 scenarios after the predecessor's last: Task routes checked as claim blocks; Route step with an unverifiable citation refused; Route step without a citation or with another label refused; Route count outside its bounds refused; Route step naming an unknown section refused; Task routes in an earlier schema; Draft without task routes still validates and renders; Find-by-task page renders the routes; Withheld route step; Generated index lists every name; Every index link resolves; Index built at render without a model; Unknown draft layer shows no agent names; Brief asks for task routes; Block a secret detector matches names nothing; Much-cited file listed once with a count; Route step covers an inventory entry; Provider mode unchanged by the finding pages.

## Modified

[Observed] 22 changes inside existing lines. Where a Form line is named with "kept as a prefix", the predecessor line is kept and the text is appended after it; otherwise the quoted span is replaced. Old and new, quoted exactly (generated from the build script's own change list):

```json
[
  {
    "where": "Schema-v5 paragraph, the byte-identity sentence for schema v4 or earlier",
    "old": "the `derivedStructure` member of `machine.json`, and the size report's measures of the pages so changed; ",
    "new": "the `derivedStructure` member of `machine.json`, and the size report's measures of the pages so changed; and except for the additions of version 2.14 that the finding-pages paragraphs below state, which every operator-agent rendering likewise carries whatever its draft's schema, and the `field-version` finding they state for a `taskRoutes` member; "
  },
  {
    "where": "Schema-v5 paragraph, the byte-identity sentence for schema v5",
    "old": "except for those same two additions of version 2.4 and that addition of version 2.5, and except that from version 2.12 it MAY carry the `inventoryOmissions` member the omission-record paragraph below states; without that member its findings and rendered bytes are those of version 2.11.",
    "new": "except for those same two additions of version 2.4, that addition of version 2.5 and those additions of version 2.14, and except that from version 2.12 it MAY carry the `inventoryOmissions` member the omission-record paragraph below states and from version 2.14 `taskRoutes` as the task-routes paragraph below states; without the `inventoryOmissions` member its findings and rendered bytes are those of version 2.11 apart from the additions of version 2.14."
  },
  {
    "where": "Coverage-advice paragraph, the rule the advice names",
    "old": "\"rule\": {\"id\": \"overlap-or-path-named\", \"version\": 1}, \"inventory\": {\"revision\"",
    "new": "\"rule\": {\"id\": \"overlap-or-path-named\", \"version\": 2}, \"inventory\": {\"revision\""
  },
  {
    "where": "Coverage-rule paragraph, the rule's version",
    "old": "Rule `overlap-or-path-named` version 1 decides,",
    "new": "Rule `overlap-or-path-named` version 2 decides,"
  },
  {
    "where": "Coverage-rule paragraph, the reading content",
    "old": "The draft's reading content is every citation under its `introduction`, `sections`, `diagrams`, `deepDives` and `unresolved` members, a code excerpt's one citation among them;",
    "new": "The draft's reading content is every citation under its `introduction`, `sections`, `diagrams`, `deepDives` and `unresolved` members and, from version 2.14, its `taskRoutes` member, a code excerpt's one citation among them;"
  },
  {
    "where": "Coverage-rule paragraph, the claim blocks",
    "old": "and every claim a presentation element carries; an understanding item is not one,",
    "new": "every claim a presentation element carries and, from version 2.14, every step of a task route; an understanding item is not one,"
  },
  {
    "where": "Coverage-rule paragraph, its last sentence",
    "old": "and those three sum to `entries`.",
    "new": "and those three sum to `entries`. Version 2 of the rule is version 1, which version 2.12 stated, with the citations under `taskRoutes` added to the reading content and a route step added to the claim blocks: a route step is shown to the reader and reviewed as any claim block is. For a draft without `taskRoutes` the two versions decide every entry alike."
  },
  {
    "where": "Scenario \"Advice names its rule, its inventory and its counts\", the rule's version",
    "old": "- **THEN** the advice carries `rule` `{\"id\": \"overlap-or-path-named\", \"version\": 1}`,",
    "new": "- **THEN** the advice carries `rule` `{\"id\": \"overlap-or-path-named\", \"version\": 2}`,"
  },
  {
    "where": "Curated-provenance paragraph, the sentence on what a figure carries",
    "old": "SHALL carry `data-visual-provenance=\"curated\"` on its `<figure>` element, and nothing else in it changes.",
    "new": "SHALL carry `data-visual-provenance=\"curated\"` on its `<figure>` element, and nothing else in it changes at that version; from version 2.14 it also carries its fragment identity, as the finding-pages paragraphs below state."
  },
  {
    "where": "Figure-kinds findings paragraph, the byte-identity sentence for schema v6",
    "old": "the same findings and the same bytes of every page and of `machine.json`, except that those `field-version` findings stand in place of the `schema` findings at their paths; ",
    "new": "the same findings and the same bytes of every page and of `machine.json`, except that those `field-version` findings stand in place of the `schema` findings at their paths, and except for the additions of version 2.14 below; "
  },
  {
    "where": "Scenario \"Schema-v4 draft unchanged\", its THEN line",
    "old": "which the readable layout stacks, and the size report's measures of the pages holding one\n- **AND** a diagram of such a draft that carries `home`,",
    "new": "which the readable layout stacks, and the size report's measures of the pages holding one; and the additions of version 2.14: the fragment identities, the two finding pages, the links to them in each page's navigation and on the contents page, their entries in the `pages` lists of `dossier.json` and `machine.json` and in the size report, and the `taskRoutes` and `nameIndex` members of `machine.json`\n- **AND** a diagram of such a draft that carries `home`,"
  },
  {
    "where": "Scenario on a v5 draft with and without `thesisBasis`, its THEN line",
    "old": "equal those version 2.3 produces for the same draft, and with it, it carries a `field-version` repair finding",
    "new": "equal those version 2.3 produces for the same draft apart from the additions of version 2.14, and with it, it carries a `field-version` repair finding"
  },
  {
    "where": "Scenario \"Figure kinds in an earlier schema\", its AND line",
    "old": "equal those version 2.4 produces for the same draft\n",
    "new": "equal those version 2.4 produces for the same draft apart from the additions of version 2.14\n"
  },
  {
    "where": "Scenario on the server shape pack, its AND line on the brief",
    "old": "except its version line, its draft-schema line and the one thesis-basis paragraph\n",
    "new": "except its version line, its draft-schema line, the one thesis-basis paragraph and, from version 2.14, the task-routes section\n"
  },
  {
    "where": "Scenario \"Brief v12 states the figure kinds\", its THEN line",
    "old": "- **THEN** the brief is `polaris-dossier-brief-v12`, issuing schema `polaris-dossier-local-draft-v7`, and equals brief v11 for the same run except",
    "new": "- **THEN** the brief is `polaris-dossier-brief-v12`, from version 2.14 `polaris-dossier-brief-v13` with its task-routes section, issuing schema `polaris-dossier-local-draft-v7`, and, that section and its version line apart, equals brief v11 for the same run except"
  },
  {
    "where": "Form line Falsifier, a carried clause on schema v4 or earlier replaced in place",
    "old": "other than the `field-version` findings versions 2.4 and 2.5 state;",
    "new": "other than the `field-version` findings versions 2.4, 2.5 and 2.14 state and the additions of version 2.14;"
  },
  {
    "where": "Form line Falsifier, a carried clause on figure-kind bytes replaced in place",
    "old": "a graph-kind figure, a page holding no figure of these kinds, a draft of schema v6 or earlier, or its `machine.json` changes a byte;",
    "new": "a graph-kind figure, a page holding no figure of these kinds, a draft of schema v6 or earlier, or its `machine.json` changes a byte other than by the additions of version 2.14;"
  },
  {
    "where": "Figure-kinds style-rules sentence, its consequence clause on page bytes",
    "old": "so a page without such a figure keeps its bytes.",
    "new": "so a page without such a figure keeps its bytes apart from the additions of version 2.14."
  },
  {
    "where": "Form line Case: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " With task routes and the index, vary whether the draft carries `taskRoutes`; the number of routes at, below and past 8 and 15 and of steps at, below and past 1 and 8; each step's label, basis, citation count, cited path, cited range and quotation, each as for any block; each `see` naming a section, a deep dive with and without a page of its own, and nothing; a task with markup, with a quotation, and over only withheld steps; the schema version from v2 to the latest; blocks inside and outside a collapsible section; a term, path, directory, identifier and figure title each named by no block, by one and by several, in other cases, as part of a longer word or path, and in a quotation; a withheld item, a path a secret detector matches and a withheld draft layer; whether the derived structure is established; and the mode."
  },
  {
    "where": "Form line Observable: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " Each finding under `$.taskRoutes` and its location; `find-by-task.html` and `name-index.html` whole; every `id` on every page and whether it lies inside a collapsible section; every link of the two pages and whether an element with that `id` is on the page it names; each page's navigation and the contents page; `dossier.json`'s pages; `machine.json`'s `taskRoutes`, `nameIndex` and claims; the brief's version line and task-routes section; the calls a render makes; and the provider mode's pages."
  },
  {
    "where": "Form line Oracle: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " For task routes and the index, the expected findings fixed in the fixture; the expected index of a fixture dossier written out by hand as literals from the fixture's own text, name by name with each home and each block, never read from the renderer; the expected find-by-task page of a fixture with routes and of one without, as literal markup for every element, attribute and sentence this requirement states; link resolution decided by an independent search of the rendered pages for each `id`, with the number of links examined stated; and for unchanged bytes, the provider golden rendered before this version."
  },
  {
    "where": "Form line Falsifier: the predecessor line is kept as a prefix and this text appended",
    "old": "",
    "new": " A draft passes check with a route step whose citation names no blob at the pinned revision, whose range lies outside the blob, whose quotation is not the cited text, that cites nothing or that is not labelled Inferred, or with fewer than 8 or more than 15 routes, or a `see` naming nothing; a route step is reviewed, withheld or counted otherwise than a claim block is; a draft without `taskRoutes` gets a finding for its absence, fails to render, or renders a route; Syzygy writes, completes or reorders a route, or calls a model to build either page; a glossary term of the rendered glossary or a top-level directory of the established derived structure is missing from the index; an entry omits a block that names it by these rules or lists one that does not; a link of either page names an `id` its page does not hold, or a fragment identity lies inside a collapsible section, or a page holds one `id` twice; a withheld step shows a file or a dossier link beside it; the index shows a name the site shows on no other page, the agent's text of a withheld item, a path or span a secret detector matches, or any agent name while the draft layer is Unknown; two renders of one input differ in either page; either page carries a script, a claim or a label of its own; brief v13 differs from brief v12 beyond its version line, the schema digest in its draft-schema line and the task-routes section; an operator-agent page of a draft without task routes changes a byte other than by the stated identities and links, or a page other than the two finding pages carries their style rules; a provider-mode byte changes."
  }
]
```

The changes to the schema paragraphs, and the change to the figure-kinds style-rules sentence, qualify the predecessor's byte-identity sentences. Versions 2.2 to 2.12 each promised that an earlier-schema draft renders the same bytes as before, apart from named additions; version 2.14 adds fragment identities and navigation links to every operator-agent page and two members to `machine.json`, so each such sentence, and the three scenario lines that restate one, now names version 2.14's additions as a further exception. The curated-provenance sentence said nothing else in a `<figure>` element changes; it now says that was true at that version and that the figure also carries its fragment identity. The two brief scenario lines say that the brief compared carries the task-routes section and, for brief v12, that from this version the brief issued is v13. One added sentence, after the fragment identities, excepts this version's additions wherever the requirement states that a render, brief or schema equals an earlier version's, as version 2.9's own sentence does for the computed maps; it covers the byte-identity sentences of versions 2.7 to 2.12, which are not rewritten. The two carried Falsifier clauses are qualified in the same way, so they do not count this version's stated additions as a broken promise.

## Removed

None. No sentence of the predecessor is deleted.

## Not changed, and why

[Inferred] The draft schema's version (the member is optional and additive, so `polaris-dossier-local-draft-v5`, v6 and v7 each admit it and none is renumbered); the labelling, citation, quotation, withheld-item and review rules, which a route step takes unchanged; the glossary, the source pages and the derived structure, which the index links to and does not alter; figure fit, the reading ledger, shape packs, thesis basis, figure kinds, manifest facts, computed maps, record bounds and corrections of versions 2.2 to 2.12; secret screening and the screening policy; the readability guidance `polaris-dossier-readability-v5`; the check record's format identifier; and the provider mode.
