# R-DERIVED-OBSERVED-SPEC-1 — fresh-reader review of dossier derived observed facts 2.3
Subject SHA-256: 96b603c6f1acc203f8da2e9c436a429463a3d3e4c3742cf16b30ce2144b34ea5
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-21

## Subject

- `openspec/changes/dossier-derived-observed-facts/proposed/polaris-generation/spec.md`, SHA-256 `96b603c6f1acc203f8da2e9c436a429463a3d3e4c3742cf16b30ce2144b34ea5` (measured by `sha256sum`; it equals the expected digest).
- Policy `.syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json`, SHA-256 `ac623bec75ee30b46f2554dd90618c4c25586d453b47eaf45b7c2eae1006a49b` (measured; it equals the expected digest).
- Predecessor `openspec/changes/dossier-figure-homes-and-fit/proposed/polaris-generation/spec.md`, SHA-256 `32bef7ddf28d36b3bc4e5d31a30caf1e82e509ab4779263ceb1c39f29f10632e` (measured; it equals the digest SEMANTIC-DELTA.md states).
- Package files read: README.md, proposal.md, design.md, SEMANTIC-DELTA.md, GOVERNING-DEPENDENCIES.json, tasks.md, .openspec.yaml.
- Worktree HEAD: `89432e8df5f02d601a25b0e3ee9f5d7d12e3f4e0`. The package and policy are untracked, and `scripts/check_spec_reconciliation.py`, `scripts/count_polaris_effective_scenarios.py` and `openspec/README.md` are modified. This review is bound to the subject digest above, not to that commit.

## Owner-class check

[Inferred] The package decides no owner class. It edits no doctrine; it rests on the owner's decision `pursuit-2026-11-21-observed-derived` for how doctrine is read. It does not weaken secret detection or SEC-5: secret-matching paths are left out of every fact and counted only. It writes no foreign repository, and it changes no exposure or release. RFC3-15's table puts a currency-bound declaration in `policies/` with the install gate "Agent adoption, as for `contracts/`" (RFC-0003 governance-homes-and-owner-acts.md:101). The agent-adoption route the package names is therefore the correct one.

## A1 — carry-over check (by script)

Method: a Python `difflib.SequenceMatcher` (autojunk off) compared the requirement text (from `### Requirement:` to the end of the file) of the predecessor with that of the subject. Each replaced line was then checked against the JSON array in SEMANTIC-DELTA.md. When `old` is non-empty, the test is `old` occurs in the predecessor line and `line.replace(old, new) == subject line`. When `old` is empty, the test is `subject line == predecessor line + " " + new`. Each `old` was also counted in the predecessor file and each `new` in the subject file.

[Observed] Results:
- Requirement text: 288 predecessor lines and 360 subject lines. Opcodes: 6 `replace` blocks covering 9 lines, each replaced one for one, and 2 `insert` blocks. The first insert is 10 lines (the five new paragraphs with their blank lines) after the figure-fit paragraph. The second is 62 lines (the 11 new scenarios) after "Figure fit stored and deterministic".
- 9 predecessor lines are absent verbatim from the subject, and the delta explains all 9. Each of the 9 SEMANTIC-DELTA entries is used once. Each non-empty `old` occurs exactly once in the predecessor, and each `new` occurs exactly once in the subject. The quoted strings are byte-exact.
- Scenarios: 38 in the predecessor and 49 in the subject. All 38 predecessor headings occur exactly once each, in their original order. The 11 added headings equal the 11 names in SEMANTIC-DELTA.md's "Added" list.
- Outside the requirement, only the title and the candidate banner line differ, as expected.
- The subject is NFC. It contains no U+00A0. Its only non-ASCII character is `†`, 3 times in the subject and 3 times in the predecessor.

A1 passes: the delta is fully and exactly declared.

## Findings

### F1 — blocking — a per-render `capturedAt` makes the rendered pages differ at every render, so no rendered-design review can count

Location: subject line 44 (`capturedAt`, "the instant this render listed the tree"; "Two renders of the same revision under the same policies write records that differ only in `capturedAt`"). Also line 48 (`data-derived-record="sha256:<hex>"` on the figure and on every entry, and the digest in every entry's evidence text) and the scenario "Derived structure deterministic" (lines ~333-336).

Evidence:
- [Observed] The record's identity is the SHA-256 of its exact bytes, and those bytes include `capturedAt`, which changes at every render. So the digest changes at every render. The digest is written into `index.html` (the figure attribute, each entry's attribute and each entry's evidence text), into the `derivedStructure` member and into `derived-structure.json` itself.
- [Observed] The carried text says that for the rendered-design review the frozen subject is "the rendered pages excluding one named review-status region". The verdict counts only while "the packet digest equals the digest of the packet Syzygy rebuilds, at validation and at render, from the current frozen subject" (effective REQ-035 text, e.g. `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md:263`).
- [Observed] The code does exactly that. `packages/polaris-dossier/src/design-review.ts` `outsideRegion` puts every site file into the packet: each HTML page without its region, `machine.json` without `reviewStatus`, and "every other file as written". The packet states that the region is "the only part a later render may change without retiring this review". `packages/polaris-dossier/src/render.ts:191-204` decides the design review of record from the pages this render draws.
- [Inferred] Every re-render therefore changes `index.html` and `derived-structure.json` outside the region, so the packet digest changes too. The normal flow is render, then design review, then `review-check`, then render again. In that flow the verdict names the digest of an earlier packet and never counts, so an operator-agent dossier can never become ready. The new paragraphs contradict the carried review-binding sentences, and the scenario "Derived structure deterministic" checks only the drawing and the visible text, so it hides the problem.

Repair: make the record's bytes stable for a given run and revision. For example, define `capturedAt` as the instant the run first listed the tree at that revision. Record it once in the run's state; each render re-derives the facts and confirms they equal the recorded ones. Then state in the deterministic scenario that two renders of one revision under the same draft, policies and run give byte-identical `derived-structure.json` and `index.html` outside the review-status region. A second option is to keep the capture instant, or anything derived from it, only inside the review-status region and the machine view's region member, but that has to be argued against trust-and-evidence.md:17-18, because evidence must carry its capture time. Add a scenario: "A rendered-design review survives a re-render that changes nothing."

### F2 — revise — `dossier.json` is not the operator-agent machine form, and its format is closed

Location: subject line 44 ("The machine form, `dossier.json`, SHALL carry a member `derivedStructure`"). The same name recurs in the v4 sentence (line 40), the scenario "Schema-v4 draft unchanged", "Derived tree figure renders Observed", "No size or object id…", and the Observable and Falsifier form lines.

Evidence:
- [Observed] `dossier.json` is the dossier manifest, `polaris-dossier-v1`. It is written through `parseDossierManifest` (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts:765-766`), and that parser refuses any key other than `format`, `title`, `entryPage` and `pages` (`packages/polaris-generation-core/src/dossier-manifest.ts:40`). The provider mode and the dossier evaluator share it.
- [Observed] The operator-agent machine view is `machine.json` (`LOCAL_MACHINE_VIEW`, `dossier-render-local.ts:10`; `dossier-site.ts:61` says it holds "every claim it rendered with its label"). The design-review criteria tell reviewers to check that every label "agrees with machine.json".
- [Observed] The predecessor never names `dossier.json`. The subject introduces the identification "the machine form, `dossier.json`", and that identification is wrong.

Repair: carry `derivedStructure` in `machine.json`. Decide whether it falls inside or outside the review region; per F1 it must not churn. If the manifest really is the intended home, state the change to the manifest format: a new format identifier, or a parser change that keeps the provider mode's bytes. Then rename every occurrence consistently, including in design.md and the README.

### F3 — revise — how the currency policy is bound at runtime is unspecified, as is whether its adoption is effective

Location: subject line 46 ("Syzygy SHALL apply exactly that policy's declarations"). Also line 44 (`currencyPolicy`: "the SHA-256 of its file") and the scenario "Rule without a declared currency bound renders Unknown".

Evidence:
- [Observed] RFC2-9: the declaration "is a snapshot input (RFC2-1 item 7)", and "A currency bound present in the tree without an effective owner act does not unblock its class: the claims continue to render Unknown". RFC-0003:101 replaces "owner act" with an agent adoption row after D10.
- [Inferred] `syzygy dossier render` runs against a clone of another repository. The policy file lives in Syzygy's own tree. The spec does not say how the render obtains that file: compiled-in bytes, a path relative to the binary, or a run input. It does not say which digest it must match. It does not say what happens before the A-19 row exists or after a veto. design.md's implementation pointer ("mirror the policy's declarations as data with a test … and the policy's SHA-256") is non-normative, so code could ship a mirrored declaration that is honoured whatever its adoption state. The "no bound" scenario also needs a named injection point for the policy, which the requirement does not give.

Repair: state normatively that the render applies the policy bytes whose SHA-256 is `ac623bec…49b` (the file named, at version 1.0.0). State where those bytes come from at run time. State that different, missing or unparseable policy bytes give `no-currency-bound-declared` for every fact. Name the input the "no bound" scenario varies.

### F4 — revise — "each path shown as the census shows a path" quotes and truncates the path, which breaks labels, ordering and uniqueness

Location: subject line 44 ("At most 250 directories are listed, each path shown as the census shows a path") and the visible-text templates at line 48 (`<path>/ (<count> files)`, `<path>/: <n> files.`, `Repository root contains <path>/.`).

Evidence:
- [Observed] The census shows a path with `shownPath`, which is `censusPath` = `JSON.stringify(path)` plus escapes. Paths over 512 code units are truncated with a ` (<n> more code units)` suffix (`packages/polaris-dossier/src/census.ts:120-137`; `derive.ts:114` applies it to `units`).
- [Inferred] A record `path` in shown form carries literal quote characters. The box label would then read `"src"/ (3 files)`, and so would `data-derived-path`. Two long directory names sharing a 512-unit prefix with equal overflow would show the same path. The spec also does not say whether "ordered by path in code-unit order" means the raw path or the shown one.

Repair: make the record's `path` the raw first path segment, JSON-escaped only by serialisation, and HTML-escaped on the page as all text is. Order by the raw segment. If a length cap is wanted, give the exact display form and keep a unique identity (`_tree-unit-<k>` already is one).

### F5 — revise — RFC7-28's "inherit the map surface's obligations" is left Unknown while the spec asserts conformance, and RFC9-38 is visibly unmet

Location: subject line 48, last sentence ("As an embedded computed visual (RFC7-28) the figure is deterministic"); design.md "Residuals", first bullet.

Evidence:
- [Observed] RFC7-28: "embedded computed visuals inherit the map surface's obligations; curated/computed provenance is a machine-readable attribute on every visual."
- [Observed] RFC9-38 (RFC-0009 visual-grammar-and-lenses.md:354): "Every scene names its evaluation — (source snapshot, as-of instant) — on the surface, not in a menu". The figure's note names the revision but not the as-of instant, which the policy defines as the record's `capturedAt`.
- [Inferred] The package records that obligation set as [Unknown] and adopts the visual anyway, and the warrants cite RFC7-28 as satisfied. At least one inherited obligation is plainly unmet.

Repair: enumerate the RFC 0009 clauses that reach a static two-level figure, or state for each why it does not apply. At minimum, either render the as-of instant (stable per F1) or record a reasoned reading of why RFC9-38 does not reach this figure. Leaving the residual Unknown with no stated reading is not enough for a clause the warrants cite.

### F6 — revise — the v4 byte-identity exception misses the size report

Location: subject line 40 (the "except for the additions of version 2.3" clause) and the scenario "Schema-v4 draft unchanged", THEN line (which lists exactly four additions).

Evidence:
- [Observed] `dossier-site.ts:767-770` measures every operator-agent page (without its review-status region) for `size-report.json` and `size-report.html`, which is itself a rendered page.
- [Inferred] Adding the `derived-structure` region to `index.html` changes that page's measured size, so the size report's bytes change too. The scenario's literal list then fails against a correct implementation. The same is true of `machine.json` if F2 is repaired there.

Repair: add the size report's change (and `machine.json`'s, if used) to the exception, in both the paragraph and the scenario. Alternatively, have the size report exclude the derived region and say so.

### F7 — revise — the Unknown region's text and the `derivedStructure` value domains are not fixed

Location: subject line 46 ("the region renders Unknown with `source-uncaptured-or-unreachable` in Syzygy's words and no figure"); line 44 (`"epistemic", "unknownReason"`); the record's `why`.

Evidence: [Observed] The acceptance criteria require exact strings and names. For this region the spec gives no heading, sentence or `why` text. It also gives no value set for `epistemic` and `unknownReason`, for example `observed`/`unknown`, and `null` when Observed.

Repair: give the exact region text, for example the existing heading plus a fixed sentence. Give the `why` text or its closed set. Give the value domains of the two machine members.

### F8 — note — plural forms in the fixed strings

Location: line 48: `<n> more top-level directories are listed below and not drawn.`, `<m> more top-level directories are counted and not listed.`, and the tally `<b> boxes and <a> arrows`.

Evidence:
- [Observed] Those three templates have no singular form, while other templates in the same paragraph give "`file` for one".
- [Observed] The existing `figureLegend` writes `1 box` / `1 arrow` (`dossier-site.ts:855`), and design.md says to reuse it, so the spec's literal and the planned code disagree for one box or one arrow.
- [Inferred] With 13 directories the first template reads "1 more top-level directories".

Repair: state the singular forms.

### F9 — note — the stale-record scenario needs a stated input

Location: the scenario "Derived record of another revision renders Unknown".

Evidence: [Inferred] The requirement makes every render derive the record afresh at its pinned revision, so in production this outcome happens only through a fault or an injected record. The test can be stated only at the renderer port.

Repair: say that the renderer checks the record it is given (its revision and its derivation by this render) and renders Unknown on a mismatch. Name that port as the scenario's input.

### F10 — note — design.md overstates what declared-source policy line 89 says about withheld paths

Location: design.md "The other conditions", condition 6 ("Counting a withheld blob's path toward its directory's file count is a path fact, which that line treats as code-structure"). Related: subject line 42 (withheld and denied blobs counted toward directory counts; a directory made only of denied, non-secret paths is named).

Evidence:
- [Observed] Line 89 makes code-structure "normalized repository-relative paths, object ids and sizes of admitted snapshot entries". Its private-repository exception speaks only of object ids and sizes.
- [Observed] Line 89 does not make a withheld blob's path code-structure.
- [Inferred] Condition 6 as stated (no size- or object-id-derived fact) is met by construction, which is correct. The justification for naming and counting withheld paths belongs elsewhere: the carried REQ-034 text allows "each withheld path the policy permits naming", and the census already names denied paths.

Repair: correct the design sentence. Optionally, add a phrase to the requirement saying that a directory whose files are all withheld by a non-secret rule is still a fact.

### F11 — note — the acceptance outcome's "solid box or line marked 'Derived by Syzygy'" is met at figure level, not per element

Location: line 48.

Evidence: [Observed] The heading, caption, note and every list entry say "Derived by Syzygy". The drawn boxes themselves carry only `<path>/ (<count> files)`.

Note: [Inferred] This is a reasonable reading. Drawn elements carry no rule or version attributes; those are on the list entries. A test of "solid with rule and version" will have to join a drawn box to its entry. Consider adding `data-derived-id` to each drawn element so the join is mechanical.

### F12 — note — process

Location: tasks.md.

Evidence: [Observed] tasks.md ticks "One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned" before this review existed. design.md "Review" says the verdict will be recorded "below once the review has run".

Repair: untick the item until the dispositions are written.

## Checked and found sound

- [Observed] The labelling change is limited to the operator-agent mode and to facts "which no draft can label, place or alter". The draft schema offers only `inferred`/`unknown` for diagram nodes and edges (`packages/polaris-dossier/src/draft-schema.ts:113,166-167`). Draft identities must match `^[A-Za-z0-9]…`, so a `_tree-…` identity cannot collide with one. Draft pages must end in `.html`, so `derived-structure.json` cannot be taken by a page.
- [Observed] Condition 2: the Unknown reasons `no-currency-bound-declared`, `stale-beyond-currency-bound` and `source-uncaptured-or-unreachable` are in RFC2-24's table (rendering-vocabularies.md:132-139). The class declares its bound in `policies/` as RFC3-15 requires.
- [Observed] Condition 5: rule `top-level-unit` v1 matches what `deriveStructure` already computes (`derive.ts:75-116`): blob modes, submodules left out, secret paths and secret prefixes left out and counted. The fact kinds restate path segments and counts.
- [Observed] Condition 3, curated side: every operator-agent draft figure gains `data-visual-provenance="curated"`, and no draft element can be solid. The provider-mode figures without the attribute are a disclosed residual, forced by the pinned provider bytes.
- [Observed] Condition 4 / exclusions: no authored element is upgraded, and the scenario "Authored element stays dashed" pins this.
- [Observed] The seven tests the bead asks for each map to a stateable scenario, apart from the gaps in F1, F3 and F9.
