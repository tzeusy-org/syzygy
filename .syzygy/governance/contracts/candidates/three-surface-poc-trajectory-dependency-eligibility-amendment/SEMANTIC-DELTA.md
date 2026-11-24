# Semantic delta T4 S1 — Trajectory dependency eligibility

**Change class:** Normative. The POC specification gains a dependency observation, a derived eligibility result and corresponding reader oracles.
**Anchor:** `syzygy-t3jk.19`, the first released Wave 2 dependency slice.
**Exact predecessor:** protected `1563daf84a7e64499cb76b6eb88eab0e4ea30f81`.
**Proposal status:** Candidate pending independent semantic review and agent adoption.

## Current meaning and authority

[Observed] POC-REQ-040 places each card by the substrate status. POC-REQ-042 defines the view, its complete served population, and real links to every item. POC-REQ-010, POC-REQ-012 and POC-REQ-013 govern the observation revision, Dolt source and Unknown versus observed-empty distinction. POC-REQ-020 requires equal machine facts at the same evaluation. The predecessor's coverage table records RFC8-13 and RFC8-17 outside the POC obligations. There is no dependency observation in the active model.

[Observed] RFC4-15 includes “dependency edges with their types” in the scheduler read and gives normalized state mapping to RFC 0008. RFC8-13 derives ready “over snapshot inputs only” and uses `eligibility-undetermined` when the dependency feed is uncaptured. RFC8-17 defines a closed set of causes and derives `dependency` from “unmet work-item dependency edges.” An existing blocked status does not establish a resolving cause.

[Observed] `OWNER-DIRECTION-P115-IMPLEMENTATION-AND-CONSUMER-MIGRATION-2026-10-28`, lines 68–73 at the exact predecessor, excluded a “new observation column/content class” from its authorized implementation. That limitation remains in the historical act. VIS-4 as amended by D10 supplies present agent authority for the specified non-free-text metadata read and specification version. SEC-5 controls the read and disclosure. The proposal reads neither an external-reference value nor a wisp identifier and requires no execution of observed project code.

## Exact proposed addition to the POC specification

The following is one new complete block at the end of the specification. The existing blocks and their warrants retain their exact bytes.

<!-- BEGIN POC-REQ-062 -->
### Requirement: POC-REQ-062 — Trajectory derives eligibility from revision-bound dependencies

Group: Trajectory. Form: **state projection/query**.

**Required behavior.** The POC SHALL observe the work items' dependency metadata at the exact Dolt revision of its work-item observation and use that same evaluation to derive Trajectory eligibility. One read-only statement SHALL bind `dependencies AS OF` to the captured revision and restrict the dependent `issue_id` to the observed bead prefix. It SHALL select `issue_id`, `depends_on_issue_id`, `type`, and only null-presence booleans for `depends_on_external` and `depends_on_wisp_id`. A derived revision identity for the read SHALL agree with the work-item revision. An invalid revision, an unreadable response, unexpected result shape, or mismatched revision makes the dependency observation unavailable. A successfully read empty dependency set is observed empty. The work-item observation and its substrate statuses retain their own epistemic states.

The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact in this slice. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, titles, descriptions, notes, metadata values and external-reference text never enter either channel.

For an observed dependency feed, a known blocker is the served target of a `blocks` edge whose observed tracker status is other than `closed`. Deduplicate blocker identifiers. An unlisted edge type, external or wisp blocker, out-of-prefix blocker, or absent blocker status makes the applicable item's eligibility undetermined. Use a fixed reason for each applicable failure class and stable reason ordering if several apply. Count these rows even where their targets or raw types are withheld. A row with an unidentifiable dependent or a malformed input that prevents reliable row accounting makes the feed unavailable. No malformed record can create an observed-empty or ready result.

Apply this table in row order. “Undetermined” is the exact state `eligibility-undetermined`.

| Dependency observation | Observed tracker status | Derived eligibility |
|---|---|---|
| Any | `closed` | Absent |
| Feed unavailable | `open`, `blocked`, `deferred`, `in_progress`, `pinned`, `hooked` | Undetermined with a fixed feed reason, with the observed tracker status still shown |
| Feed observed | `in_progress`, `pinned`, `hooked` | Absent |
| Feed observed with unresolved item-local edge | `open`, `blocked`, `deferred` | Undetermined with the applicable fixed row reasons, with the observed tracker status still shown |
| Feed observed with settled item-local edges | `deferred` | `planned`, with the tracker-deferred reason |
| Feed observed with settled item-local edges | `blocked` | `blocked`, with the cause set below |
| Feed observed with settled item-local edges | `open` | `blocked` if the known blocker set is nonempty, otherwise `ready` |

For a derived `blocked` result, the resolved cause set contains `dependency` exactly when the known blocker set is nonempty. The empty set has the explicit cause-Unknown display. The other RFC8-17 causes have no derivation in this slice. Neither a raw tracker status nor an epistemic absence licenses an inferred dependency. No status derives a recommendation or numeric score.

On Trajectory, each card SHALL show the derived eligibility where present, and any fixed reason. A card with a derived blocked result SHALL show its cause set or cause-Unknown, and each known blocker identifier SHALL link to its existing work-item card via the paging rules of POC-REQ-042. Links SHALL work without client script from the default and narrowed views on the direct and tailnet paths. Trajectory SHALL declare the served non-closed denominator, each of the four eligibility counts, and the count of records with absent eligibility so those figures reconcile. It SHALL likewise disclose dependency rows observed, each recognized type's count, unlisted type rows, and external, wisp, and out-of-prefix target counts. One dependency row may contribute to more than one target-withholding count. When the feed is unavailable the edge counts SHALL be unavailable with the fixed reason, preserving the observed work-item denominator. The machine answer SHALL carry the same facts and link identities from the one shared model.

- **Scope.** An identified work-item evaluation and its same-revision dependency metadata, every served item's state, and the displayed totals and links over that exact population. No live tracker readiness call, source-body read, parent grouping, changed trajectory selection parameter, or derivation of PR, external-event or decision causes enters this slice.
- **Case (fixture, counterexamples and sweep).** An independent checker supplies fixed work statuses and dependency rows at a captured revision A. A distinct revision B carries different rows. The checker exercises the complete table, zero rows, unsupported types, missing/foreign targets, dependency read failure and mismatched revision. The checker reads both channels, including a blocker on another page, and sweeps every relevant card and board count.
- **Observable.** Fixed-column query, captured revision, classified edge totals, four eligibility counts and absent count, item-local reasons, blocked-cause set, exact blocker card targets, and unchanged epistemic status for the work-item observation.
- **Oracle.** Literal fixture expectations independently classify every included row and every served status, compare the complete wire counts and card outcomes, follow every blocker link, and check query shape and one exact revision. A changed-only revision B may not affect results from A. Captured metadata values not admitted by the output alternatives are absent from both wire forms.
- **Oracle independence.** The fixture fixes expected status, reason, count, blocker and link-case literals without importing the derivation or rendering implementation. It separately holds the refused-reader calls, inactive shared-model output shape, and expected fixture identities.
- **Falsifier.** A derived ready result without trustworthy same-revision input, any exported undisclosed raw target or type, wrong membership, an assumed blocked cause, wrong state or card link, drift between channels, or a denominator that does not reconcile.

#### Scenario: Complete revision with a known blocker and a ready item

- **WHEN** captured revision A has one open dependent with an open served blocker, one with only a closed target, and another revision B changes both edges
- **THEN** A's first item is blocked with only the dependency cause and the open target's link, the second is ready, and B's rows do not change the A output

#### Scenario: Observed empty and unavailable dependencies

- **WHEN** an observed work-item revision has no dependency rows, and in a separate evaluation an equivalent item set has an unreadable or mismatched dependency response
- **THEN** the first has observed zero edges and a ready open item, while the second preserves observed tracker status, gives every non-closed item eligibility-undetermined with a fixed feed reason and withholds edge totals

#### Scenario: Unsettled edge metadata is counted without disclosing input strings

- **WHEN** known items have unlisted edge types or blocking rows whose targets are external, wisps, out of the observed prefix or absent from the work-item observation
- **THEN** the board and machine count the classified rows, show eligibility-undetermined with fixed reasons on the applicable items, and disclose none of those source strings or false blocker links

#### Scenario: Planned, blocked without cause, and statuses outside derived eligibility

- **WHEN** a complete settled feed includes a deferred item, a tracker-blocked item without a known unfinished target, and in-progress, pinned, hooked and closed items
- **THEN** the deferred item is planned with its tracker reason, the blocked item has an empty cause set with visible cause-Unknown, and the in-progress, pinned, hooked and closed items have no derived eligibility

#### Scenario: Blocker reaches its card across pages

- **WHEN** the blocked item and its known blocker are served on different pages and a reader follows the blocker link with scripts disabled
- **THEN** the direct and tailnet forms both reach the exact blocker card outside a collapsed element, and the machine carries the equal blocker identity and target page

```yaml
warrants:
  primary: RFC8-13
  doctrine: [VIS-2, VIS-4, SEC-5]
  contracts: [RFC2-2, RFC4-15, RFC6-18, RFC8-13, RFC8-17]
  policies: []
  decisions: []
  topology: []
  parent_requirements: [POC-REQ-010, POC-REQ-012, POC-REQ-013, POC-REQ-020, POC-REQ-040, POC-REQ-042]
```
<!-- END POC-REQ-062 -->

## Coverage and same-boundary propagation

[Observed] Current coverage rows in `CONTRACT-COVERAGE.md` outside Part A read:

> RFC8-13 — Per-value derivation logic (dispatch-eligibility queries, PR-lane facts, VCS merge facts, liveness); POC's kanban columns derive from Beads' own status field only.
>
> RFC8-17 — Closed blocked-cause taxonomy; POC's kanban has no `blocked`-cause rendering.

[Inferred] Add one RFC4-15 Part A row for the revision-bound named dependency feed, one RFC8-13 Part A row for the four eligibility outcomes and honest absence, and one RFC8-17 Part A row for the dependency cause and empty-set case. Each names POC-REQ-062. Replace the two outside-coverage row descriptions with the residual full-vocabulary, PR/VCS/liveness and other cause derivations. Recount membership and regenerate only the affected POC dependency union and scenario census after the adoption composition. The existing statuses, view parameter set and earlier requirement text are preserved.

[Inferred] The authored seams are `work-items.ts`, `model.ts`, `model-slices.ts`, `trajectory-projection.ts`, `trajectory.ts`, `THREE-SURFACE-POC.md`, and their existing parity, route, paging, rendering and reader tests where needed. The POC scenario amendment table and generated POC dependency and census artifacts depend on the new requirement. Establish the final exact dependent list with a current tracked identifier and entry-point sweep, then repeat by walking the import and generated-artifact edges. No active document claims an implemented feature before the change lands.

## Review, adoption and falsifiable consequences

[Inferred] Review the exact normative block against the named read, the four outcome derivations and existing scope. The released packet gives nonempty known blockers a derived blocked result. Here deferred items with otherwise settled edges remain planned, while an unavailable feed or locally unsettled applicable edge takes the conservative precedence in the table. This choice keeps the tracked source status distinct from the derived state and requires exact review.

[Inferred] Preserve the independent raw verdict verbatim and disposition every finding. Commit the fully reviewed normative implementation and generated records as one logical change, then append one agent adoption row in a separate commit using the live next distinct allocation. The reviewed specification version tag is `three-surface-poc-trajectory-dependency-eligibility-amendment-v1.0`; the change commit named by the adoption receives it after actual protected merge. The revert is the exact protected merge revert. The announcement and adoption name the new closed metadata read and the current VIS-4 classification. No live proving observation is authorized by this candidate draft.
