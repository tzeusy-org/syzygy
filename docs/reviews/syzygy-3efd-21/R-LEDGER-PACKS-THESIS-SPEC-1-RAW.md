# R-LEDGER-PACKS-THESIS-SPEC-1 — fresh-reader review of dossier ledger, packs and thesis 2.4
Subject SHA-256: e8c45bc26b6e80c229b6826be2c35bea8360980d10dd9233b013ebf34a0703f5
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-21

## Subject

- [Observed] `sha256sum openspec/changes/dossier-ledger-packs-thesis/proposed/polaris-generation/spec.md` gives `e8c45bc26b6e80c229b6826be2c35bea8360980d10dd9233b013ebf34a0703f5`. This **matches** the expected digest. The worktree was at `4e2b3120`.
- [Observed] The predecessor `openspec/changes/dossier-derived-observed-facts/proposed/polaris-generation/spec.md` hashes to `6c663a807817f825a7a3c6f1f9ff39864745e57ae6c3bb6a8498d98c90fad461`. That equals the digest SEMANTIC-DELTA.md cites.
- [Observed] I ran a line diff (Python `difflib`, 366 → 443 lines). It finds:
  - two header lines changed (title, preamble);
  - one block of 16 inserted lines (8 paragraphs) after the 2.3 derived-structure paragraphs;
  - one block of 61 inserted lines (11 scenarios) after "Provider mode unchanged by derived structure";
  - 8 modified lines.

  I parsed SEMANTIC-DELTA.md's JSON and applied each entry to its predecessor line. All 8 modified lines are reproduced exactly: replacement for the schema-v5 paragraph, the figure-fit paragraph, the scenario AND line and `parent_requirements`; prefix-plus-appended text for the Case, Observable, Oracle and Falsifier lines. The scenario count goes from 49 to 60. Every other line of the requirement is byte-identical.
- [Observed] `python3 scripts/check_spec_reconciliation.py --check` reports "7 of 7 predicates without FAIL; PASS". The only WARN is R6, which concerns unrelated PWB pins.
- Implementation read for this review: `reader-advice.ts`, `derive.ts`, `derive-rules.ts`, `reader-standards.ts`, `brief.ts`, `check.ts`, `state-directory.ts`, `run-record.ts`, `draft-schema.ts`, `design-review.ts` and `dossier-site.ts`.

## Findings

**F1 — blocking. The new ledger text contradicts itself about figures homed on a deep dive that has no page.**

- Location (ledger pages paragraph). One sentence says: "A section or deep dive whose disposition is not `produced`, and any figure in one, is on no page and counts nowhere". Two sentences later: "it is on the page of its home in a draft of schema v5 or later (for a deep dive with no page, the page of that deep dive's section)".
- Problem: the ledger is computed "as though its draft layer renders". Under that assumption, the only deep dive without a page is one whose disposition is not `produced`. [Observed] `dossier-site.ts:265` builds pages only for produced deep dives. So the parenthesis applies only to exactly the case the earlier sentence says counts nowhere. The carried 2.2 text agrees with the parenthesis: a figure homed on a deep dive with no page renders "where a figure of that deep dive's section renders instead".
- The two readings give different `figures` and `figureFit` counts. The oracle "computed by hand … by the stated rules" therefore has no single answer.
- Repair: limit the "counts nowhere" sentence to sections ("A section whose disposition is not `produced`, and any figure in one, …"). Then say explicitly that a figure homed on a non-produced deep dive is counted on its deep dive's section's page, as 2.2 renders it. Add that case to the "Reading ledger stored with the check" scenario.

**F2 — blocking. A default-pack brief would state something false, and the brief-v11 sentence forbids fixing it.**

- Location: "it is brief v10 changed only in its version line, its draft-schema line, … the reader standards as the shape-pack paragraphs above compose them, and one paragraph".
- Problem: [Observed] `brief.ts:219`, the paragraph just before the carried standards, says: "The heading below names the digest of the skill's `references/reader-standards.md`; the text under it is that file without its version line and with every heading one level down, so it does not itself hash to that digest." [Inferred] brief v10 carries this paragraph too; 2.2 and 2.3 do not change it.
- For any selection other than `default@1`, `server@1`, the 2.4 heading instead names "sha256 of the composed text". The text under it is no longer the skill's reference file. So every brief issued for a non-server repository would carry a false Syzygy-written sentence (VIS-2), and "changed only in" leaves no room to change it.
- Related ambiguity: "The brief carries that text under the heading version 1's section takes". This does not say whether the composed text goes through `readerStandardsSection`'s transform (version line dropped, headings moved down a level), or whether the extended version line survives. If the transform applies, the "version line extended … by a suffix" is never seen in the brief and affects only the digest.
- The same gap exists in the design packet. [Observed] `design-review.ts:83` names `${READER_STANDARDS_VERSION}, sha256 ${READER_STANDARDS_SHA256}` in the sentence that introduces the standards, and the spec does not say what that sentence names for composed standards.
- Repair:
  - Add the line-219 paragraph to brief v11's list of changed text, and give exact replacement wording for the composed case. Keep the v1 wording when the composition is identical, so the server-pack byte identity still holds.
  - State that the composed text is carried through the same transform as v1.
  - State what the design packet's introducing sentence names (version, pack identities, composed digest).

**F3 — non-blocking. Counting units, figures and advisories that sit on no page is underspecified.**

- Location: "A section or deep dive whose disposition is not `produced` … counts nowhere"; also "plus what lies on no page (unplaced units' words and advisories, and advisories located on no page, such as RS-14's at `$.deepDives`)".
- Problem: [Observed] `reader-advice.ts` emits RS-13 and RS-16 for every section and RS-13 and RS-19 for every deep dive, whatever their disposition. It emits RS-17 for every diagram, produced or not. Three cases have no stated rule:
  - An RS-16 advisory at `$.sections[i]` for a non-produced section is "located at that section", and that section "counts nowhere". It is also an "advisory located on no page", which is summed into `draft`.
  - A produced figure homed in an unplaced section (one no Pole lists) has no page. The `draft.figures` sum lists only words and advisories as off-page contributions.
  - An RS-17 advisory on a non-produced diagram has no rule either.
- Repair: give one rule. For example: every advisory is counted in `draft.advisories` exactly once, and on a page only when its unit or figure is on that page. Every produced figure whose home is placed on no page is counted in `draft.figures` only. Add a scenario that pins these totals.

**F4 — non-blocking. The record's `readerStandards` pairs a version name with bytes of another version.**

- Location: "the brief record's `readerStandards` is `{"version": "polaris-reader-standards-v1", "sha256": <that digest>}`".
- Problem: [Observed] `reader-standards.ts` states "A version moves only with its bytes". Design.md keeps that rule inside the composed text by extending its version line, but the record member still says `polaris-reader-standards-v1` next to a digest that is not v1's. A reader who checks version against digest sees a mismatch. The packs that explain it are only in `shapePacks`.
- Repair: add a member such as `"packs": ["default@1"]` or `"composed": true` to `readerStandards` when composed. Alternatively, state in the requirement that `version` names the base text and `sha256` the composed text.

**F5 — non-blocking. Failure handling for recomposing the design packet's standards is not stated.**

- Location: "recomposed from the packs the brief record names and confirmed against that digest".
- Problem: the requirement does not say what happens when a named pack identity no longer exists, or when the recomposed digest does not match. Both can happen after a Syzygy upgrade between the brief and the rendered-design review, or because the brief record is within agent write reach.
- Repair: state the outcome. Fail-closed refusal of the packet, with a named reason, fits VIS-2 better than a silent fallback to v1.

**F6 — non-blocking. `readingDifference` may claim an absence it did not establish.**

- Location: the `why` words "no earlier run of this repository in the state root holds a reading ledger"; the candidate set is defined by "whose `run.json` reads back as a valid run record"; and "the one whose latest ledger's check record has the latest `checkedAt` earlier than this check's".
- Problem 1: the rule silently skips run directories whose `run.json` is unreadable or invalid, or whose check records do not parse. The state root may also fail to list. In these cases the stated words assert an absence that was never established.
- Problem 2: a sibling run whose *latest* ledger is later than this check (concurrent runs) is dropped, even when an earlier ledger in that run would qualify.
- Repair:
  - Add a third `why` for an unreadable state root, or count skipped directories ("… ; <n> run directories could not be read").
  - Define a run's candidate ledger as its latest ledger earlier than this check's `checkedAt`, or state the current choice as deliberate.

**F7 — non-blocking. The secret-path scenario does not pin whether the trait holds.**

- Location: scenario "Pack selection recorded and deterministic": "the secret-matching path is neither listed nor counted".
- Problem: a mutant that sets `holds: true` from a secret-only match, and then selects `server@1`, still passes. That leaks one bit about a secret path.
- Repair: make the fixture's only `server-entry` match the secret path. Add: "**AND** `serverEntry.holds` is false and only `default@1` is selected."

**F8 — non-blocking. The spec does not say whether the server-entry trait appears in check's structure record.**

- Location: "This version adds one trait rule, `server-entry`, version 1".
- Problem: [Observed] design.md names a "structure-record member `serverEntry`" and says the "new `serverEntry` trait is also read at brief time". The requirement does not say whether check's report structure record (`traits`, `rules`) gains it.
- [Observed] The 2.3 derived record lists only "rules whose facts it holds", so adding the trait does not break the v5 byte promise. It is still an observable the Form lines do not cover.
- Repair: state it one way or the other, and add it to Observable.

**F9 — non-blocking. The entry-point test is loose, and the "review judgement" it relies on has no carrier.**

- Location: "a cited path that the language-by-extension rule matches with a language other than Markdown, …, INI"; also "Whether those files are where a user or a program enters the project, and whether the repository truly states no purpose, are review judgements."
- Problem 1: [Observed] the `LANGUAGE_BY_EXTENSION` table also maps `.css`, `.scss`, `.html`, `.h` ("C or C++ header"), `.sql`, `.proto`, `.graphql`, `.tf` and `.nix`. Two stylesheets therefore satisfy the check.
- Problem 2: unlike `server-entry`, the test does not exclude example or demo paths.
- Problem 3: SEMANTIC-DELTA "Not changed" says the review is unchanged. Nothing tells the fidelity or design review to make these judgements, so the sentence names a check that no reviewer is asked to perform.
- Problem 4: "carries no quotation" does not say whether it means an empty `quotations` list, `text` without the lead-in, or both.
- Repair:
  - Exclude stylesheet, markup, header and schema languages, plus the example-segment rule.
  - Either add a sentence to the review packet's criteria naming the judgement, or reword it as "not checked by Syzygy".
  - Define "no quotation" as an empty `quotations` list and no lead-in in `text`.

**F10 — non-blocking. Deviations from the bead acceptance, all disclosed and justified.**

- B(1) asks that "with the server pack the brief is byte-identical to today's". The spec gives byte identity to brief v10 "except its version line, its draft-schema line and the one thesis-basis paragraph". Today's code issues brief v9 (`brief.ts:38`). design.md, "Byte identity, and the brief version", discloses this and justifies it by the shared v11 bump for C. The pack mechanism alone changes no byte. Acceptable.
- A(3) asks that "a second check of the same draft writes identical bytes". The spec narrows this to the `readingLedger` member. A whole check record cannot be identical across checks (it carries `revision` and `checkedAt`). design.md states the narrowing as acceptance 3. Acceptable; it could also be said in the delta.
- B: under-selection costs a server that the basename heuristic misses (for example one with no `server.*` file) the three server dimensions it is asked about today. design.md discloses this. Acceptable.

**F11 — non-blocking. One claim in SEMANTIC-DELTA is inexact.**

- Location: "a line diff against the predecessor shows exactly the changed lines listed below and the insertions".
- Problem: [Observed] the diff also changes line 1 (the title) and line 3 (the candidate preamble). Both are outside the requirement, but the sentence claims the whole diff.
- Repair: add "besides the file's title and preamble".

**F12 — non-blocking. The brief and the check disagree on what `none` allows.**

- The brief paragraph says, for `none`: "make the introduction an `unknown` block".
- The finding rule accepts "an Unknown or non-normative block".
- Repair: align them, or say in the brief that a non-normative introduction is also accepted.

**F13 — non-blocking. Ledger page keys can collide.**

- Problem: two produced deep dives whose identities sanitise to the same `deep-dives/<name>.html` produce two ledger entries with one `page`. [Observed] The renderer refuses this case (`page-path-collision`). The ledger is still computed, and `readingDifference` keys entries by page path.
- Repair: state that colliding paths share one entry, or that the difference marks them, or key entries by unit.

## What holds

- [Observed] The 2.3 text is carried byte for byte apart from the 8 listed edits. The scenario count is 49 → 60, `REQ-polaris-generation-014` is added to the warrants and to `GOVERNING-DEPENDENCIES.json`, and the reconciliation checker passes.
- [Observed] The ledger's layout rules match the renderer:
  - `poles/<index+1>.html`;
  - a Pole holding only the why section gets no page;
  - the why section is on `index.html`;
  - the `deepDivePath` sanitiser;
  - the first-listing Pole wins.

  The RS-19 word count and the five advisory standards match `reader-advice.ts`. The previous run is found through `subject.repository.repositoryId` and the `run-<32 hex>` form (`RUN_ID`), never by directory name or URL. A missing predecessor is Unknown, never zero. The difference is never stored. No key is named `source`, `evidence`, `provenance`, `anchor` or `cites`.
- [Observed] The pack composition `default@1` + `server@1` reproduces RS-11's seven v1 bullets in their original order. Both splice anchors (`  - Language and runtime:` and `  - Check: every dimension has a row`) occur exactly once. A sweep of `packages/polaris-dossier/src` and the doctrine for the five server-only strings finds them only in `reader-standards.ts`, so the default-brief oracle is sound.
- Secret-path handling reuses the structure record's prefix rule. Provider mode is untouched.
- Thesis basis meets bead C:
  - Syzygy-written line text; no label token; placed outside the block;
  - suppressed for a withheld introduction;
  - `machine.json` attributes the claim to the authoring session (Inferred);
  - v5-and-earlier drafts keep their 2.3 bytes apart from the stated `readingLedger` and `field-version` additions.
- No owner class is touched: no doctrine edit, no weakening of secret detection or SEC-5, no foreign-repository write, no exposure.
