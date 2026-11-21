# Design: reading ledger, shape packs and thesis basis

Three bead outcomes in one MODIFIED REQ-polaris-generation-034, because each changes what that one requirement says `check`, the brief or the draft schema does, and three successive versions of one requirement would each have to restate the other two's changes.

## A. Reading ledger (syzygy-3efd.21)

### What a page is at check time

[Inferred] `check` holds the draft, not a rendered site, so the ledger's pages are the narrative pages the renderer lays the draft out on, computed from the draft alone as though its draft layer renders. [Observed] The layout rules are those `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` applies: sections on `index.html` when a draft has no Poles (`sectionPage`, line 283), the why section on `index.html` and every other section on `poles/<index+1>.html` with a Pole holding only the why section getting no page (line 272: `pole.sections.every(id => id === poleSpec.whySection) ? null`, which is also null for an empty Pole), and deep dives on `deep-dives/<id>.html` with every character outside `[A-Za-z0-9_.-]` replaced by `_` (`deepDivePath`, line 92). The requirement states those rules itself, so the ledger depends on the requirement, not on the renderer's code. Alternatives considered: one entry per draft unit (section, deep dive) with no page — rejected, because the bead's outcome is per page and pages are what a reader meets; measuring the rendered site — rejected, `check` has no render and the bead excludes new metrics.

[Inferred] Placement follows version 2.2's rendering rules exactly: a figure homed on a deep dive with no page is placed where its section's figures render, a section that is not produced (and its own prose and figures) is on no page, and deep dives whose sanitised names collide (which the renderer refuses, `page-path-collision`) share one entry. Every advisory, figure, figure-fit entry and produced unit's words count once in `draft`, whether or not a page holds them, so the totals never depend on placement.

[Inferred] The withheld draft layer is a render-time outcome `check` cannot know, so the ledger states the draft's layout, never what a reader received; that is said in the requirement ("as though its draft layer renders").

### The numbers, and why no new metric

- `proseWords`: the RS-19 count `reader-advice.ts` already takes (`proseWords`: a plain block's `text` and its children's, split at white-space runs, elements count none), summed over a page's units, the introduction counted the same way. [Inferred] Counting element text would be a new metric; the member name says what it counts.
- `readingMinutes`: `ceil(proseWords / 200)`. 200 words a minute is a round, stated constant carried in the member (`wordsPerMinute`) so a reader can recompute it; it is a conversion of the word count, not a new measurement.
- `figures`: produced diagrams placed on the page by home (v5 and later) or `sectionId`. The Syzygy-derived figure (2.3) is not the author's and is left out.
- `advisories`: counts per counted standard (RS-13, RS-14, RS-16, RS-17, RS-19), located by the advisory's JSON path. [Observed] The bead says "four advisory counters"; since A-16 (syzygy-3efd.17) `reader-advice.ts` emits a fifth, RS-17 locality, so all five are counted.
- `figureFit`: counts of the stored `figureFit` entries (version 2.2) per viewport and Unknown, for the page's figures.

### Where it is stored and where the predecessor is found

[Inferred] The bead says to store it where syzygy-3efd.20's delta keeps its numbers: the check record, beside `figureFit`, format unchanged. It depends only on the draft bytes, so a second check of the same draft writes an identical member (acceptance 3), which is why the difference is never stored: a stored difference would depend on the state root's other runs.

[Inferred] Acceptance 3 ("a second check of the same draft writes identical bytes") is read as the `readingLedger` member: a whole check record cannot be identical across two checks, since it carries its revision and `checkedAt`, as the figure-fit paragraph already says of `figureFit`.

[Observed] Run directories are named `run-<32 hex>` at random (`state-directory.ts`, `RUN_ID`), and `run.json` carries `subject.repository.repositoryId` (`run-record.ts`). The predecessor is found among sibling run directories in the state root by that identity, compared exactly, and ordered by the `checkedAt` of each run's latest ledger-bearing check record; ties go to the greatest run identity, so the choice is deterministic. A run's candidate is its latest ledger earlier than this check, so a concurrent run's later check does not hide its earlier ledger. Run directories and check records that cannot be read are counted in `unreadableRuns` and `unreadableCheckRecords` beside the result, so an Unknown difference never claims an absence over what was not read. Nothing is matched by directory name or URL (the bead's rule). [Inferred] A predecessor's records lie within the agent sessions' write reach, so the difference is Inferred, like every stored record read back.

### Names fixed

`readingLedger` (`format` `polaris-dossier-reading-ledger/1`, `wordsPerMinute`, `pages[]` of `page`, `units`, `proseWords`, `readingMinutes`, `figures`, `advisories{RS-13,RS-14,RS-16,RS-17,RS-19}`, `figureFit{notFittingAt1440,notFittingAt390,unknown}`, and `draft` with the same plus `unplacedUnits`); unit names `introduction`, `section:<id>`, `deep-dive:<id>`; `readingDifference` (`unreadableRuns`, `unreadableCheckRecords`, and `state` `compared` with `against{runId,revision,pinnedRevision,checkedAt}`, `pages[]` of `page`, `change` (`unchanged`, `changed`, `added`, `removed`), `before`, `after`, `delta`, and `draft{before,after,delta}`; or `state` `unknown` with `why`, one of three fixed sentences). No key is named `source`, `evidence`, `provenance`, `anchor` or `cites` (the PWB-REQ-014 sweep).

## B. Shape packs (syzygy-3efd.43)

### What moves into packs, and what does not

[Observed] The bead names three places: `brief.ts` near lines 47-57 (`BRIEF_TOPICS` and `VOICE_RULES`), `reader-standards.ts` near lines 105-137 (RS-11's seven dimensions) and `dossier-profile.ts` near lines 31-39 (`DOSSIER_REQUESTED_ASSETS`).

- RS-11's dimensions move into packs: they are the server assumption (networking, state and persistence, concurrency, and an architecture phrased as deployment with "server and clients").
- The reader topics stay: REQ-034's first paragraph states them as the topics the owner set, in order, so a pack may not vary them. They name no server dimension.
- `DOSSIER_REQUESTED_ASSETS` stays: the provider pipeline shares it (`dossier-trigger.ts`, `repo-corpus.ts`), provider mode is unaffected by this version, and the brief uses only its two optional assets (a workflow diagram and a mechanism deep dive), which suit any shape.
- The worked examples (caches, replicas) in the voice rules, RS-3, RS-13 and the readability guidance stay for syzygy-3efd.44 (CLI and library packs, with page-plan modules), named as a residual: the bead's acceptance asks only that the default brief name no server-only dimension.

### The selecting trait

[Observed] The structure record's trait vocabulary (`derive.ts`) is `docsTree`, `tests` and `packages` (no manifest, single package, workspace); none marks a server. So this version adds a seventh path rule, `server-entry` version 1, to `derive-rules.ts`: a fixed list of basenames (`server.<ext>` for thirteen languages, `Procfile`, and OpenAPI/Swagger documents), outside vendored, generated, test and example paths. [Observed] The Redis-shaped fixture holds `src/server.c` (`redis-shaped-fixture.ts:18`), so a Redis run selects the server pack. [Inferred] It is a heuristic over names, like every structure rule: it states what matched and never that the project is a server. Over-selection costs a library three dimensions it may answer "does not apply" to (the state before this version); under-selection loses three for a server. `Dockerfile` and compose files are left out because command-line tools ship them too.

### Byte identity, and the brief version

[Inferred] The server pack's dimensions are v1's bullets byte for byte and the default pack contributes v1's other three, so the selection `default@1`, `server@1` composes exactly v1's RS-11, and the carried standards, heading and `readerStandards` are v1's: the pack mechanism changes no brief byte (acceptance 1). The brief still moves to `polaris-dossier-brief-v11`, but only for the thesis basis (C): schema v6 changes the draft-schema line and adds one paragraph, and the requirement lists exactly those lines, so the server-pack test compares with the brief-v10 golden with those lines changed. A default-only brief differs further in its standards section and in the one sentence before it, which for a composed text names its packs and the composed text's digest instead of claiming the skill reference file's digest; the composed text goes through version 1's transform (version line dropped, headings down a level), and the design packet carries it whole, extended version line included, under an introducing sentence that names the packs and digest. A recomposition that fails at the design packet refuses the packet rather than fall back to version 1, which would show a reviewer standards the author never had. [Inferred] The standards' own rule "a version moves only with its bytes" is kept by not reusing v1's version line for different bytes: the composed text's version line names its packs.

[Observed] Within the brief, the strings `server and` and `deployed` alone are not server-only markers: the Poles paragraph says "such as a server and a client" (`brief.ts:148`). The default-brief test strings are therefore `Networking:`, `State and persistence:`, `Concurrency:`, `deployed and divided` and `(server and`, each of which, swept over `packages/polaris-dossier/src/*.ts` and the security doctrine the brief quotes, occurs only in `reader-standards.ts`.

### Names fixed

Pack format `polaris-dossier-shape-pack/1`, members `format`, `id`, `version`, `selectedBy` (null or `{trait}`), `dimensions[]` of `id`, `order`, `lines`; packs `default@1` (`language-and-runtime` 10, `architecture` 20, `interfaces` 60, `platforms-and-dependencies` 70) and `server@1` (`architecture` 20, `networking` 30, `state-and-persistence` 40, `concurrency` 50); trait rule `server-entry` version 1 (structure-record member `serverEntry`); brief-record `readerStandards` gaining `packs` only when composed (`version` names the base text, `sha256` the composed one); design-packet refusal words `the reader standards the brief carried cannot be recomposed (<pack identity> is not shipped)` and `(the recomposed digest differs from the brief record's)`; check's structure record gains `traits.serverEntry` (`rule` `server-entry@1`, `holds`, `listed`, `notListed`) and `server-entry@1` in `rules`; brief-record member `shapePacks` with `traits` (`state`, `serverEntry{rule,ruleVersion,holds,paths,pathsNotListed}`) and `selected[]` of `id`, `version`, `sha256`, `because` (`always selected`, `trait server-entry holds`).

[Inferred] Packs are implementation data under `packages/`, not a governed policy: they carry guidance text (the reader standards are "working guidance, never authority", REQ-polaris-generation-014) and declare no currency bound or screening rule, so unlike 2.3's currency policy nothing is installed under `.syzygy/governance/policies/`. The requirement fixes their schema, the two packs' contents by reference to v1's bytes plus two literal lines, and the selection rule.

## C. Thesis basis (syzygy-3efd.56, that rule only)

[Observed] The local draft has no member called thesis; its `introduction` is the opening the dossier guidance asks to "say what the project is and how its central workflow runs" (`brief.ts`, `DOSSIER_GUIDANCE`). [Inferred] So the introduction is the thesis, and the draft field qualifies it rather than adding a second opening block.

- Field: `thesisBasis`, required in schema `polaris-dossier-local-draft-v6`, one of `stated`, `code-reading`, `none` (pursuit move I3-M4's three thesis states). v5 and earlier check and render as version 2.3 does; `thesisBasis` there is a `field-version` finding.
- Finding: kind `thesis-basis`, at `$.thesisBasis`, for each value whose introduction does not fit it.
- "Entry points", checkably: two citations of two different paths that the existing structure-record rules classify as program code (a language-by-extension match other than the documentation, data, markup, stylesheet, header and schema languages: Markdown, reStructuredText, AsciiDoc, Plain text, JSON, YAML, TOML, XML, INI, HTML, CSS, SCSS, C or C++ header, SQL, Protocol Buffers, GraphQL) and that are not vendored, generated, test, documentation-tree or example paths. Whether they are truly where a user enters, and whether the repository states no purpose, Syzygy does not check; the fidelity review judges the introduction against its cited spans as for any block. Whether they are where a user enters is a review judgement. [Inferred] This uses only rules that already exist and read no body; a stricter test (manifest `bin` fields, `main` functions) would need a body read or new rules.
- A code-reading thesis may not quote (an empty or absent `quotations` list and no lead-in in `text`): a quotation is the project's own words, which is what `stated` means.
- `none` accepts an Unknown or a non-normative introduction, and brief v11 says both.
- Rendered line (Syzygy's words, outside the block, both views): `The authoring session found no maintainer statement of purpose, so this summary is Polaris's reading of the code, not the maintainers' words.` [Inferred] It attributes the finding to the authoring session because whether a repository states a purpose is the agent's report; Syzygy does not observe it. It carries no label token, so the reading view's rule for claim blocks is untouched.
- `machine.json`: `thesisBasis{value, declaredBy, label, lineRendered}`, only for a v6 draft, so a v5 draft's machine form keeps its bytes.

## Not changed, and why

[Inferred] Figure-fit advice, the 2.3 derived structure, the fidelity and design reviews' rules, readiness, secret screening and the screening policy are unchanged. The structure record stays advice on check's report; its new `serverEntry` trait is also read at brief time for pack selection, which hands the author no structure fact, only the composed dimensions.

## Implementation pointers (not normative)

- `reader-advice.ts`: keep `proseWords`; add a pure `readingLedger(doc, figureFit, advice)` and `readingDifference(ledger, predecessor)`; `check.ts` writes `readingLedger` into `DRAFT_PLAN.record` and computes the difference on the report from `path.dirname(run)`.
- `derive-rules.ts`: `SERVER_ENTRY = { id: 'server-entry', version: 1, basenames: [...], exampleSegments: [...] }`; `derive.ts`: `traits.serverEntry`.
- `shape-packs/`: `default.json`, `server.json`, a loader that validates the schema and computes digests, and `composeReaderStandards(selected)` in `reader-standards.ts`; `brief.ts` and `design-review.ts` take the composed text.
- `draft-schema.ts`: v6 with `thesisBasis`; `check-derive.ts`: the `thesis-basis` finding; `dossier-site.ts`: the line and `machine.json` member.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-21/R-LEDGER-PACKS-THESIS-SPEC-1-RAW.md`, read the first draft (spec SHA-256 `e8c45bc26b6e80c229b6826be2c35bea8360980d10dd9233b013ebf34a0703f5`) and records `Verdict: REVISE` at its line 3: two blocking findings, eleven non-blocking. Every finding was repaired as below in the bytes this package now carries; none was overruled. Under D10 the review gates nothing and no confirmation round was run, so the repairs themselves are unreviewed.

- F1 (blocking; placement of a figure homed on a deep dive with no page): repaired. "On no page and counts nowhere" is gone; a section not produced is on no page, a deep dive not produced has no page, and a figure homed on one is placed on its section's page as version 2.2 renders it. The first ledger scenario now holds that case, an unplaced section and RS-14's advisory.
- F2 (blocking; a composed brief would claim the reference file's digest): repaired. The brief's sentence naming the skill file's digest is replaced, for a composed text, by fixed words naming the packs and the composed digest; the composed text takes version 1's transform; the design packet's introducing sentence names the packs and digest. The default-pack scenario gains an AND line for these.
- F3 (counting on no page): repaired with one rule: every unit's words, figure, advisory and figure-fit entry counts once in `draft`, and on a page only if its home is on that page.
- F4 (`readerStandards` pairs version 1's name with composed bytes): repaired. `readerStandards` gains `packs` when composed; `version` names the base text and `sha256` the composed one.
- F5 (recomposition failure at the design packet): repaired. The packet is refused with two fixed reasons and never falls back to version 1.
- F6 (an absence over unread runs): repaired. `unreadableRuns` and `unreadableCheckRecords` are carried in both states, an unlistable state root has its own `why`, and a run's candidate ledger is its latest earlier than this check.
- F7 (secret-only match): repaired with an AND line: `serverEntry.holds` false and only `default@1` selected.
- F8 (trait in check's structure record): repaired. Check's structure record gains `traits.serverEntry` and the rule in `rules`; the Observable line names it.
- F9 (loose entry-point test; no carrier for the judgement): repaired. Markup, stylesheet, header, SQL, schema and query languages and example, sample and demo segments are excluded; "no quotation" is defined as an empty or absent `quotations` list and no lead-in; the sentence now says Syzygy does not check entry-ness or the absence of a purpose statement, and that the fidelity review judges the introduction against its spans.
- F10 (deviations from the bead acceptance): disclosure only, carried in this file: the server-pack brief differs from v10 by the version line, the draft-schema line and the thesis paragraph, because schema v6 moves the brief to v11; the pack mechanism changes no brief byte.
- F11 (SEMANTIC-DELTA's diff claim): repaired: "besides the file's title and preamble".
- F12 (`none` in brief and check): repaired. The brief's `none` line now names a `non-normative` introduction that makes no claim, as the check accepts.
- F13 (colliding ledger page keys): repaired. Deep dives whose names give one path share one page entry with their units listed together; the renderer refuses such a draft (`page-path-collision`), so the ledger never claims a page it renders.
