# Semantic delta T5 S1 — Trajectory shows work-item titles under a declared, screened title policy

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated
`openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`; new
policy declaration `.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json`.
**Stable IDs affected:** POC-REQ-063 (new: titles under the declared,
screened title policy, two Scenarios); POC-REQ-014 (the "A title names a
requirement" Scenario's parenthesis: the title is now served as the title,
never parsed for an identifier); POC-REQ-062 (the sentence naming the
work-item statement's columns now names `title`, and the dependency feed's
exclusion sentence now says no title enters through that feed).
CONTRACT-COVERAGE: RFC5-16(b) "Beads/Dolt work-item ingest screening" moves
from Unknown to covered by POC-REQ-063; one RFC2-24 row is added for the
withheld-title Unknown. Part A goes from 178 rows (127 covered, 51 Unknown)
to 179 (129, 50) over the same 88 clauses.
**Change class:** Normative (a new requirement, a new read of one free-text
column, and a new screening policy declaration).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.23` (Trajectory pursuit move T5, slice S1).
**Date:** 2026-11-26

## Current meaning

No work-item title is read. The observation's `titles` is one Unknown,
`excluded-content`, with the basis "Work-item titles are withheld under
SEC-5: a title is free text, the only declared secret-classification policy
covers declared-project-shape-text and none covers work-item titles, so the
observation never reads them." Every Trajectory card carries a "Title:
withheld (SEC-5)" mark, and the board states the Unknown once.
CONTRACT-COVERAGE records RFC5-16(b) as Unknown: "POC-REQ-010/013 test
provenance and Unknown-on-failure, not secret screening of ingested
work-item text".

## Proposed meaning

A new content class, `work-item-title`, is declared with its policy, and
titles are read and screened under it before they enter the model.

- **Read.** The work-item statement selects `title` after its seven earlier
  columns, pinned to the revision it identifies. No other free-text column
  is selected.
- **Screen.** Every title runs through, in order:
  1. a classifiability gate: text of 1 to 500 UTF-16 code units, with no C0
     or C1 control character and no lone surrogate;
  2. every detector of the project-shape secret policy, unchanged;
  3. the active-content scan every observed body passes, unchanged.
  A failure of the gate or of screening itself withholds the title as
  `unclassifiable`; a detector match withholds it as `secret-matched`; a
  scan finding withholds it as `active-content`.
- **Serve.** An admitted title is the item's `title.text`, rendered escaped
  in a bidirectionally isolated `<bdi>` on its card wherever the card
  renders. The scan reads a title as Markdown, so markup inside a backtick
  code span is inert to it and such a title is admitted; it is safe because
  it is rendered escaped. A withheld title is served as its
  RFC5-17 record: the reason, the redaction class (`excluded-artifact`, or
  `unclassifiable-excluded` for the third reason) and the SHA-256 of its
  UTF-8 bytes (null when the tracker held no text). The text is never
  served.
- **State once.** The observation's `titles` states the policy identity and
  version, the admitted and withheld counts, and the withheld count per
  reason. While any title is withheld, the board states one
  `excluded-content` Unknown with its route and the counts, and each card
  with a withheld title carries a mark naming its reason that refers to it.
  When every title is admitted there is no title Unknown, and the board's
  titles notice states the policy and the admitted count.

## What explicitly does NOT change

- No detector, pattern or active-content form is changed or loosened
  (SEC-5's fail-closed rule; the owner's boundary).
- No other free-text column (description, notes, design, acceptance
  criteria, close reason, metadata, assignee, external reference) is read.
- No title goes to a model provider. The observed model reaches no provider
  path: `.workItems` is read only by `model.ts`, `trajectory-projection.ts`,
  `reevaluation.ts` (revision only), `trajectory.ts`, `polaris.ts` (the
  count and revision only) and `fresh-checkout-demo-main.ts` (the result
  kind only) [Observed: `git grep -n "\.workItems\b"` over `apps/` and
  `packages/`, product sources].
- POC-REQ-014: a title is never parsed for an identifier; `governedBy` is
  unchanged.
- Titles on the outline, blocked-by, ready and what-changed lists: T5 S2
  (`syzygy-t3jk.24`).

## Choices the review may contest

1. **The detectors are referenced, not copied.** The title policy names the
   project-shape policy's identity and detector ids, and the code compiles
   `PWB_SECRET_POLICY` itself. A test asserts the JSON declaration and the
   code agree on identity, version, bound, detector ids and redaction
   classes.
2. **500 code units.** A longer title is withheld as unclassifiable. The
   worst page (250 cards of 500-unit titles that escape to the most bytes)
   (500 `"` each, 3,000 bytes escaped) is 1,190,306 bytes of the
   2,097,152-byte human ceiling (57%); the test bounds it at 60%.
3. **A control character withholds, a line break included.** A title is one
   line; the scan's code-context rules are line-based.
4. **Digest of a short title.** RFC5-17 asks for a content digest. A digest
   of a short secret-bearing title could be brute-forced if the secret is
   low-entropy; the digest is what RFC5-17 asks and what the project-shape
   exclusions already retain.
5. **The scan's gap is inherited.** `<svg/onload=x>` is not an
   active-content finding, so such a title is admitted and rendered escaped
   [Observed: `work-item-titles.test.ts`]. Tightening the scan is filed as
   `syzygy-ls34`, not done here, because the scan guards project-shape
   bodies too.

## Machine-answer change

Each `workItems.items[]` member gains `title`: `{text}` or `{withheld,
redactionClass, digest}`. `workItems.titles` changes from `{label: 'Unknown',
closedReason: 'excluded-content', resolutionRoutes}` to `{policyId:
'work-item-title', policyVersion: '1.0.0', admitted, withheld,
withheldByReason}`. The `region:work-item-titles` unknown subject is present
only while some title is withheld, and its basis names the counts.

## Warrant

- The owner's answer to `pursuit-2026-11-21-trajectory-titles`, choice C,
  2026-11-21T12:21:41Z: "admit titles for every observed tracker under the
  declared, screened policy. The owner's words: 'Not extremely concerned
  about leakage; Don't be over-paranoid here, prefer development
  velocity.' The boundary stands: no title goes to a model provider, no
  other free-text field is admitted, no detector is loosened."
  (`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md`, "Owner gates this
  run").
- RFC5-16, quoted: "The declared secret-detection policy (SEC-5,
  `.syzygy/governance/policies/`) is applied at **every ingest boundary** —
  *before* content enters any Syzygy store, surface, or endpoint", and
  "Screening is fail-closed: content matching the policy is excluded;
  content that **cannot be classified is excluded, not indexed**." Its
  amended "who may change the policy" limb: "a change that detects less,
  admits unclassifiable content, or lets a secret be indexed, rendered or
  sent is the owner's decision (SEC-5; VIS-4); any other change is an agent
  adoption."
- RFC5-17, quoted: "an excluded item is recorded as (content digest,
  location reference, policy version, redaction class) — never the content
  itself".
- VIS-3: identifiers alone do not make the board legible.

The title class is new content admitted on the owner's own answer, under a
policy that detects no less than the declared one and excludes what it
cannot classify; this adoption is the agent's under VIS-4 as amended by
D10.

## Evidence or decision basis

- `work-item-titles.test.ts` (new, 4 tests): the policy literal; each of the
  four detectors, three active-content forms and six unscreenable inputs
  withhold; the inherited `<svg/onload=x>` gap; ordinary text with brackets,
  ampersands, quotes and non-ASCII admitted; the code's identity, bound,
  detector ids and redaction classes equal the JSON declaration.
- `work-items.test.ts`, the POC-REQ-063 block (8 tests): the exact nine
  columns and no other free-text column; clean titles admitted up to 500;
  five secret titles, seven active-content titles (every scan form but the
  event handler outside an SVG, which the SVG fixture carries) and eleven
  unscreenable inputs (both lone surrogates among them) withheld, with distinctive markers absent from the whole
  observation; the counts by reason; the disclosure literal with its basis
  and null when all are admitted; the RFC5-17 record with a literal digest;
  a witness carrying a title refused.
- `trajectory.test.ts`: cards show admitted titles and the board states
  the policy once with no title Unknown; a mixed fixture withholds three
  titles on both channels (markers absent from page and machine answer),
  escapes `& " '`, routes the withheld count once, and serves literal
  records; the 250-card worst page measured.
- Sweeps updated: `governing-intent-sweep.test.ts` (the titled item's
  identifier appears once, as its title, never as governing intent),
  `unknown-route-sweep.test.ts` (denominators: plain and observed-shape
  Trajectory 6 → 5, references 10 → 7; the worker-change board keeps a
  withheld title and its disclosure), `block-provenance-sweep.test.ts` (the
  sampled item gains its title).
- Rule 6: eight mutants, each failing a test: the title column dropped; the
  detectors skipped; the scan skipped; control characters admitted; the
  length bound dropped; the title rendered unescaped; the withheld
  disclosure dropped; and, after review finding 2, the lone low surrogate
  admitted.
- `npm run check`: 224 test files, 5,661 tests passed, 1 skipped.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`workItemTitlesWithheld`, `titles-withheld`, `region:work-item-titles`,
`WORK_ITEM_TITLES_REGION_ID`, `title` in work-item fixtures, and
`.workItems`.

- `work-item-titles.ts`: new; the policy and the screen.
- `work-items.ts`: the column, the record on each item, the counts, the
  disclosure.
- `model.ts`: the titles subject only while some title is withheld.
- `index.ts`: exports.
- `trajectory.ts`: the card's title and the titles notice.
- Test fixtures: every hand-built `WorkItemFact` gains a title, and every
  revision witness row gains `title: null`.
- `docs/THREE-SURFACE-POC.md`: the card paragraph.
- R3 reads two new POC-REQ-063 scenarios from this adoption row;
  `census.json` was regenerated.
- The N6 boundary register pins POC requirement sections by line; the spec
  edit keeps every earlier line where it was, and
  `build_boundary_register.py --check` verifies 98 entries.

## Migration / supersession plan

1. One pull request.
2. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit, naming the
   change commit.
3. After merge, the tag `three-surface-poc-titles-amendment-v1.0`.

The 2026-10-20 withholding record
(`.syzygy/governance/decisions/BEAD-TITLE-WITHHOLDING-RECORD-2026-10-20.md`)
is history; the owner's 2026-11-21 answer superseded it for titles only.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

The diff of the governed files against this branch's base (`origin/main` at `dba7a40f6`):

````diff
diff --git a/.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json b/.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json
new file mode 100644
index 000000000..1d1dd3b6a
--- /dev/null
+++ b/.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json
@@ -0,0 +1,50 @@
+{
+  "schemaVersion": 1,
+  "policyId": "work-item-title",
+  "policyVersion": "1.0.0",
+  "contentClass": "work-item-title",
+  "governingRequirement": "POC-REQ-063 (openspec/changes/three-surface-poc-experience)",
+  "warrant": "Owner answer to pursuit-2026-11-21-trajectory-titles, choice C, 2026-11-21T12:21:41Z (docs/pursuits/2026-11-21-trajectory-vision-pursuit.md, Owner gates this run); adopted by an AGENT-ADOPTIONS.md row (syzygy-t3jk.23).",
+  "source": "The title column of the observed tracker's issues table, read with the work-item statement and pinned to its revision.",
+  "detectorPolicy": {
+    "policyId": "polaris-butlers-project-shape-secrets",
+    "policyVersion": "1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv",
+    "path": ".syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json",
+    "detectors": [
+      "private-key-material",
+      "known-token-formats",
+      "credential-assignment",
+      "credential-bearing-url"
+    ],
+    "use": "every detector, unchanged, over the whole title"
+  },
+  "activeContent": "the observed-body active-content scan, unchanged, with its Markdown code-context rule (markup inside a backtick code span is inert to it); any finding withholds the title",
+  "classificationOrder": [
+    "withhold as unclassifiable a value that is not text, is empty, exceeds maxLength UTF-16 code units, or holds a C0 or C1 control character or a lone surrogate",
+    "run every detector; any match withholds the title as secret-matched",
+    "run the active-content scan; any finding withholds the title as active-content",
+    "withhold as unclassifiable a title whose screening fails",
+    "admit the title's text, served as is and rendered escaped in a bidirectionally isolated element"
+  ],
+  "maxLength": 500,
+  "withheldRecord": {
+    "fields": [
+      "withheld",
+      "redactionClass",
+      "digest"
+    ],
+    "redactionClasses": {
+      "secret-matched": "excluded-artifact",
+      "active-content": "excluded-artifact",
+      "unclassifiable": "unclassifiable-excluded"
+    },
+    "digest": "SHA-256 of the title's UTF-8 bytes (a lone surrogate is encoded as U+FFFD, as Node's UTF-8 encoder does), or null when the tracker held no text",
+    "retainBody": false,
+    "digestRisk": "The digest is unsalted, as RFC5-17's content digest is: anyone who can read the machine answer and guesses a short, low-entropy secret title can confirm the guess offline."
+  },
+  "boundaries": [
+    "No title is sent to a model provider.",
+    "No other free-text field of a work item is admitted by this policy.",
+    "No detector or scan is loosened by this policy."
+  ]
+}
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index d777d0e96..f1405d17c 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -142,7 +142,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC4-26 | Capability/entity↔code mappings are declared-only, inferred mappings excluded | covered — Orrery's declared-mappings-only design is exactly class (i) with class (ii) excluded, matching the scope's "no inferred mappings or edges" | POC-REQ-050, POC-REQ-052 |
 | RFC4-27 | Unmapped/absence claim requires an executed coverage record with reconciling counts, never silent absence | covered — "unmapped code a visible Unknown region with reconciling counts" is this clause's coverage-record duty applied to Orrery | POC-REQ-051 |
 | RFC5-16 | (a) Observation-capture ingest screening for Butlers repo structure | covered — POC-REQ-002's "never indexed contents" sentinel sweep structurally avoids most of the screening concern for code bodies, but doesn't test the secret-detection-policy mechanism itself | POC-REQ-002 (partial) |
-| RFC5-16 | (b) Beads/Dolt work-item ingest screening | **Unknown** — POC-REQ-010/013 test provenance and Unknown-on-failure, not secret screening of ingested work-item text | — |
+| RFC5-16 | (b) Beads/Dolt work-item ingest screening | covered — Amendment row (titles, syzygy-t3jk.23): the one free-text column read, `title`, is screened under the declared work-item-title policy before it enters the model, fail-closed; every other free-text column stays unread | POC-REQ-063 |
 | RFC6-13 | Machine endpoint answers from the same fact set surfaces render; no endpoint-only or UI-only facts | covered — POC's `/api/poc` + client/no-script parity is exactly SDR-27's bidirectional obligation this clause states | POC-REQ-020, POC-REQ-022 |
 | RFC6-14 | Machine answer never silently omits or folds Unknown/epistemic state into a total | covered — Fold: full RFC2-25 tier / secondary-annotation / sibling-surface-state / challenge-pending limbs dropped — POC carries no such vocabulary | POC-REQ-020, POC-REQ-042, POC-REQ-051 |
 | RFC6-14 | Every entity and relationship in the machine answer carries exactly one epistemic record: its label, its tier where it carries one, and its primary Unknown reason verbatim from the RFC 0002 vocabulary | covered — Amendment row (vocabulary and record shape); POC-REQ-060's denominator is every element of the machine answer's entity and relationship lists, not the records that exist | POC-REQ-060 |
@@ -230,6 +230,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-22 | An invalid local representation is an explicit bounded failure, never a silently skipped join, guessed value or smaller successful answer | covered — Amendment row (observation-local governedBy wire value); no governing-intent link or source-to-claim join is admitted | POC-REQ-014 |
 | RFC8-23 | Equal Unknown values stay separate countable/filterable work-item claims; sharing neither clears Unknown nor invents warrants | covered — Amendment row (observation-local governedBy wire value); existing unresolved orphaned-work and other limbs remain Unknown | POC-REQ-014 |
 | RFC2-24 | Each of Trajectory's five answers, or part of one, that is Unknown carries one closed reason and its route, with a machine twin under its id | covered — Amendment row (five answers, syzygy-t3jk.16) | POC-REQ-044 |
+| RFC2-24 | Withheld work-item titles render once as Unknown `excluded-content` with its route and the withheld count, with a machine twin; each withheld card refers to it | covered — Amendment row (titles, syzygy-t3jk.23) | POC-REQ-063 |
 | RFC2-19(a) | Merged-but-unreconciled work renders "reconciliation evidence absent / Unknown" as a fact of the render, counted in its own right and routed to running a reconciliation evaluation, never stamped with or counted among RFC2-24 reasons | covered — Amendment row (five answers); the oracle reads the chain count and its statement and finds no RFC2-24 reason on it. Moved from Part B2 | POC-REQ-044 |
 | RFC2-19(a) | That rendering carries the member's durable identity, its merge fact and the intent revision | **Unknown** — Amendment row (five answers); the answer gives a count and one statement, naming no member, commit or revision | — |
 | RFC8-28 | The merged, not yet evaluated chain state renders as its own counted answer, never sharing a rendering with another state | covered — Amendment row (five answers); the count of materialized work on the default branch, with its own wording. Moved from Part B2 | POC-REQ-044 |
@@ -252,8 +253,8 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-17 | Derivations of `pr-wait`, `external` and `decision` blocked causes | **Unknown** — Amendment row (eligibility); those input families remain unread | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **178 consequence rows over 88 clauses — 127 covered,
-51 Unknown.**
+table"]`: **179 consequence rows over 88 clauses — 129 covered,
+50 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
 The signed RFC1-26 row whose consequence reads "Relations outside the closed
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index c1735f08f..88c646f1f 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -664,8 +664,8 @@ warranted, green or complete state.
 #### Scenario: A title names a requirement
 
 - **WHEN** the tracker holds an item whose title reads "Implement
-  POC-REQ-010" (the POC withholds titles, SEC-5, so the title is never read
-  into the model)
+  POC-REQ-010" (served as its title under POC-REQ-063, never parsed for
+  an identifier)
 - **THEN** that item's `governedBy` is the same Unknown, and nothing served
   for it names POC-REQ-010 as its governing intent
 
@@ -1302,8 +1302,8 @@ equal values (`trajectory.answers`). Today:
   through the same read-only runner as the work items, by two statements
   naming only commit hash and date (`dolt_log`), commit hash and parent
   index (`dolt_commit_ancestors`), and item id, status and diff type
-  (`dolt_diff` over `issues`). SEC-5 excludes titles, messages, committers
-  and other free text. For an observed window the answer SHALL
+  (`dolt_diff` over `issues`). The history read selects no title, message,
+  committer or other free text. For an observed window the answer SHALL
   state both revisions with their recorded instants and count each changed
   item, ascending id, as exactly one of: added (a row the window start did
   not hold), closed (a status other than `closed` became `closed`),
@@ -1936,11 +1936,11 @@ warrants:
 
 Group: Trajectory. Form: **state projection/query**.
 
-**Required behavior.** The POC SHALL observe the work items' dependency metadata at the exact Dolt revision of its work-item observation and use that same evaluation to derive Trajectory eligibility. The work-item statement SHALL read from the same committed revision it identifies, including when the selected work-item set is empty. It retains the seven existing observation columns. With no valid observed work-item revision, the POC SHALL skip the dependency statement. One read-only statement SHALL bind `dependencies AS OF` to the captured revision and restrict the dependent `issue_id` to the observed bead prefix. Its dependency data columns SHALL be `issue_id`, `depends_on_issue_id`, `type`, and only null-presence booleans for `depends_on_external` and `depends_on_wisp_id`.
+**Required behavior.** The POC SHALL observe the work items' dependency metadata at the exact Dolt revision of its work-item observation and use that same evaluation to derive Trajectory eligibility. The work-item statement SHALL read from the same committed revision it identifies, including when the selected work-item set is empty. It retains the observation columns of POC-REQ-010's statement, the seven non-free-text columns and, since POC-REQ-063, `title`. With no valid observed work-item revision, the POC SHALL skip the dependency statement. One read-only statement SHALL bind `dependencies AS OF` to the captured revision and restrict the dependent `issue_id` to the observed bead prefix. Its dependency data columns SHALL be `issue_id`, `depends_on_issue_id`, `type`, and only null-presence booleans for `depends_on_external` and `depends_on_wisp_id`.
 
 The dependency statement SHALL return exactly one distinguishable revision witness from Dolt resolving the same immutable revision as the table read, including when there are no dependency rows. The reader SHALL verify the witness before accepting the data. A request value echoed by the caller, a missing, extra or invalid witness, a mismatched revision, an unreadable response or an unexpected result shape makes the dependency observation unavailable. A valid witness with no edge rows makes the dependency set observed empty. The work-item observation and its substrate statuses retain their own epistemic states and their one served provenance record under POC-REQ-010.
 
-The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact; `parent-child` rows derive only the parent facts POC-REQ-042's grouped view reads, under the same identifier rules. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, titles, descriptions, notes, metadata values and external-reference text never enter either channel.
+The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact; `parent-child` rows derive only the parent facts POC-REQ-042's grouped view reads, under the same identifier rules. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, descriptions, notes, metadata values and external-reference text never enter either channel, and no title enters through the dependency feed (a title enters only under POC-REQ-063).
 
 For an observed dependency feed, a known blocker is the served target of a `blocks` edge whose observed tracker status is other than `closed`, where the row has neither the external nor the wisp flag. Deduplicate blocker identifiers. An unlisted edge type, external or wisp blocker, out-of-prefix blocker, or absent blocker status makes the applicable item's eligibility undetermined. Use a fixed reason for each applicable failure class and stable reason ordering if several apply. Count these rows even where their targets or raw types are withheld. A row with an unidentifiable dependent or a malformed input that prevents reliable row accounting makes the feed unavailable. No malformed record can create an observed-empty or ready result.
 
@@ -2012,3 +2012,102 @@ warrants:
   topology: []
   parent_requirements: [POC-REQ-010, POC-REQ-012, POC-REQ-013, POC-REQ-020, POC-REQ-040, POC-REQ-042]
 ```
+
+### Requirement: POC-REQ-063 — Work-item titles render under the declared, screened title policy
+
+Group: Work-item observation. Form: **state projection/query**.
+
+**Required behavior.** The POC SHALL read each observed work item's title
+only through the work-item statement of POC-REQ-010, pinned to the revision
+it identifies, and SHALL screen every title under the declared work-item-title
+policy (`.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json`,
+policy `work-item-title` 1.0.0) before the title enters the model. The policy
+runs, over the whole title and unchanged, every detector of the project-shape
+secret policy and the active-content scan every observed body passes.
+
+- **Admission.** A title is admitted only when it is text of 1 to 500 UTF-16
+  code units with no C0 or C1 control character and no lone surrogate, no
+  detector matches it, and the scan finds nothing. The scan keeps its
+  Markdown code-context rule: markup inside a backtick code span is inert to
+  it, so such a title is admitted. An admitted title is served as the
+  item's `title.text` and rendered escaped, in a bidirectionally isolated
+  element, on the item's card, wherever the card renders.
+- **Withholding.** Any other title is withheld, fail-closed (RFC5-16). The
+  item serves the RFC5-17 hash-not-body record instead: the reason
+  (`secret-matched`, `active-content` or `unclassifiable`), the redaction
+  class (`excluded-artifact` for the first two, `unclassifiable-excluded` for
+  the third) and the SHA-256 digest of the title's UTF-8 bytes, or null when
+  the tracker held no text. The record's location is the item it sits on and
+  its policy version is the observation's, so the four RFC5-17 parts are
+  served together. The withheld text appears in neither channel.
+- **One statement.** The observation states the policy identity and version
+  once, with the admitted count, the withheld count and the withheld count
+  per reason. While any title is withheld the board states the withheld
+  count once as an Unknown with primary reason `excluded-content` and its
+  RFC2-24 route, and each card with a withheld title carries a mark naming its
+  reason that refers to that one disclosure. When every title is admitted no
+  title Unknown exists and the board states the policy and the admitted count.
+- **Boundaries.** No title is sent to a model provider. No other free-text
+  column of a work item is read. No detector or scan is loosened. A title is
+  never parsed for an identifier: POC-REQ-014's governing intent is unchanged.
+
+- **Scope.** The work-item statement's selected columns; every served item's
+  `title`; the observation's `titles`; every Trajectory card; the titles
+  notice; the machine answer.
+- **Case (fixture, counterexamples and sweep).** An independent checker
+  supplies, at one revision, items whose titles are: clean text with
+  characters HTML escapes; a match for each of the four detectors; an HTML
+  tag, a comment, a script element, an SVG element with a handler, an unsafe
+  URL scheme, an entity inside a link destination and an unclosed code fence;
+  and every unscreenable input (absent, not text, empty, over 500 code
+  units, a line break, a control character, a lone high and a lone low
+  surrogate).
+  Each withheld title carries a distinctive marker. The checker sweeps both
+  channels' bytes for every marker, every card's title, and the board's
+  notice.
+- **Observable**: the admitted titles on the cards and in the machine
+  answer; the withheld records; the observation's counts; the notice; the
+  statement's selected columns.
+- **Oracle**: literal expected values typed by the checker: the selected
+  columns are exactly POC-REQ-010's revision witness and seven item columns
+  and `title`; each
+  admitted title equals its fixture text and renders escaped; each withheld
+  record equals its literal reason, class and digest; the counts equal the
+  fixture's; no marker occurs in either channel; with every title admitted
+  no title Unknown subject exists.
+- **Oracle independence**: the fixture titles, markers, digests and
+  expected records are literals the checker types; a separate check compares
+  the module's policy identity, bound, detector ids and redaction classes
+  with the declaration file.
+- **Falsifier**: a withheld title's text, or any marker, in either channel; a
+  title admitted that a detector matches or the scan flags; an admitted title
+  rendered unescaped; a withheld title without its reason, class or digest;
+  counts that disagree with the served items; a second free-text column in
+  the statement; or a title Unknown while every title is admitted.
+
+#### Scenario: Clean titles are shown
+
+- **WHEN** every observed item's title is clean text
+- **THEN** each card shows its title, escaped, the machine answer serves the
+  same text for each item, and the board states the policy and that every
+  title is shown, with no title Unknown
+
+#### Scenario: A title that fails screening is withheld
+
+- **WHEN** one title matches a secret detector, one carries a script element
+  and one is absent
+- **THEN** none of their text is served on either channel; each item serves
+  its reason, redaction class and digest (null for the absent one); each card
+  marks its reason; and the board states 3 withheld once, with
+  `excluded-content` and its route
+
+```yaml
+warrants:
+  primary: SEC-5
+  doctrine: [VIS-2, VIS-3, SEC-5]
+  contracts: [RFC2-24, RFC5-16]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: [POC-REQ-010, POC-REQ-014, POC-REQ-020]
+```
````

## Dispositions

Review `R-T5S1-TITLES-1` (`docs/reviews/R-T5S1-TITLES-1-RAW.md`), verdict
`REVISE` over `42029464c`: one must-fix, four should-fix, five notes. Each
is repaired or answered below; the review gates nothing and no
confirmation round follows (D10).

1. **must-fix: `check_spec_reconciliation.py --check` fails at the change
   commit.** Answered, by design of the two-commit adoption. The change
   commit carries the spec, coverage and generated dependency edits, and
   the checker's chain resolves those bytes only through the adoption row
   the second commit appends (the same order as `.19`–`.22`). This
   delta is now in the package home the bead names. The row is in the next
   commit, and `--check` is read at the branch head, after the row, with
   R1, R2 and R3 at 0 findings (pull request body). The tag follows the
   merge. The predecessor POC amendments since D10 (`.14`–`.22`) carry no
   `proposed/*.patch`; the delta's "Exact text" is the diff.
2. **should-fix: the lone low surrogate is unpinned.** Repaired.
   `work-items.test.ts` now supplies a lone low surrogate and a swapped
   pair (low then high); the reviewer's mutant (the low-surrogate
   alternative dropped) now fails that test.
3. **should-fix: POC-REQ-063's Case and Oracle independence overstate the
   tests.** Repaired both ways. The Case now lists the forms supplied, and
   the fixtures gained the two missing forms: an entity inside a link
   destination (`[x](&#106;avascript:x)`) and an unclosed code fence. Each
   is withheld as `active-content`. Oracle independence now says what the
   checker does: the titles, markers, digests and records are literals, and
   a separate check compares the module's identity, bound, detector ids and
   redaction classes with the declaration file.
4. **should-fix: markup inside backticks is admitted while the copy says
   active content is never served.** Repaired in the text, and the
   behaviour kept. POC-REQ-063 and the policy JSON now say the scan reads a
   title as Markdown, so markup inside a backtick code span is inert to it.
   They also say an admitted title is rendered escaped. The withheld basis
   now reads "carries active content the scan finds". Withholding every tag
   shape regardless of code context would be a tightening for this class
   alone; it is not taken here, and the scan's own gap is `syzygy-ls34`.
5. **should-fix: bidirectional and invisible characters render without
   isolation.** Repaired. The card renders the title in `<bdi
   class="wi-name">`, and `.wi-name` sets `unicode-bidi: isolate`, so a
   title's own controls cannot reorder the card. Format characters stay
   admitted: they are not secrets, and the isolation removes the reordering.
6. **note: the size test's worst case.** Repaired. The fixture is now 500
   `"` per title, 3,000 bytes escaped, the most any admitted title can
   reach. The page is 1,190,306 of 2,097,152 bytes (57%), under the 60%
   bound. A grouped page that renders an item under two parents repeats a
   card, but the page holds at most `TRAJECTORY_PAGE_SIZE` (250) items, so
   this answer [Inferred] does not bound the repeat: it is left as the
   reviewer's [Unknown], to measure with T5 S2 (`syzygy-t3jk.24`), whose
   lists add titles elsewhere on the page.
7. **note: an unsalted digest of a short title.** Answered, and the risk is
   stated. The policy JSON's `withheldRecord.digestRisk` says anyone who
   reads the machine answer and guesses a short, low-entropy secret title
   can confirm it offline. RFC5-17 asks for the content digest, and a keyed
   digest would be a separate adoption. The digest of a title with a lone
   surrogate is now defined: Node's UTF-8 encoder writes U+FFFD for it, and
   the policy says so.
8. **note: the RFC5-17 tuple is split across the answer.** Repaired in the
   text. POC-REQ-063 now says the record's location is the item it sits on
   and its policy version is the observation's.
9. **note: wording drift.** Repaired. POC-REQ-063's Oracle now names "the
   revision witness and seven item columns and `title`", matching
   POC-REQ-062. POC-REQ-044 now reads "The history read selects no title,
   message, committer or other free text", keeping its line count.
10. **note: a no-op `.replace` in a fixture.** Repaired: the literal is
    written directly.
