# Trajectory default outline semantic delta T8 S2

Change class **Normative**. This amendment changes the default selection and its declared controls under POC-REQ-042. Version tag `three-surface-poc-grouped-default-amendment-v1.0`. Authoring bead `syzygy-t3jk.22`. The protected predecessor is `ee8668797514cdea9b33435b56b71d3068734819`.

POC-REQ-042 owns the selection. VIS-2 and RFC2-6 warrant the explicit denominator. Existing RFC8-15 and RFC8-30 keep the parents' recorded statuses distinct from an assessment of their children's work. The checkbox references POC-REQ-014. POC-REQ-062 remains the authority for same-revision dependency evidence.

The default takes the first 250 positions of the non-closed population grouped by parent. The human and machine answers feed from the same selection in the captured model. The same item can occur under several parents while contributing once to the page's rendered item count. Governing-intent narrowing applies to all displayed positions, and the count continues to describe distinct items. Recent work stays available through `selection=recent` with the same recency limits and timestamp ordering.

## Propagation and evidence

The tracked exact-identifier sweep found 82 files under its scanned roots, counted as 30 governance, 4 app, 38 docs, 5 specification and 5 package files. A second source sweep followed the projection and rendering members, including callers that carry selection values without naming the requirement. Historical records remain predecessor evidence. The active implementation, route and machine oracles, browser controls, operator guide, governing dependency union, contract coverage and reconciliation census travel together. The governed block below is the exact authored change bound for independent review.

The acceptance checks recompute group order and placement from fixture facts, reconcile unique rendered plus excluded with the full served count, verify the mounted routes and keyboard controls, and check the owner-scale synthetic response sizes against the existing ceiling. The 9,194-item fixture follows the retained owner census size and uses generated identifiers and parent rows.

## Predecessor POC-REQ-042

> ### Requirement: POC-REQ-042 — Trajectory declares its scope and denominator
>
> Group: Trajectory. Form: **invariant**.
>
> **Required behavior.** Trajectory SHALL visibly declare which work-item
> population it renders (its selection rule) and the counts inside and outside
> that selection, so an excluded-item population is never silently invisible.
> Every served item SHALL be reachable: the route SHALL accept a closed
> parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
> `governing-intent=unknown` (the items carrying POC-REQ-014's governing-intent
> Unknown), `group=parent` and `page` (a positive integer), and any of them SHALL give a view
> of the matching items in ascending item id (with `group=parent`, in the
> grouped order below), one page of a declared fixed size, whose scope
> statement names the page, the page count and the matching count. No parameter SHALL give the default selection. The set also holds
> `changed` (one of POC-REQ-044's change windows, `day`, `week` or
> `since-last`), which selects the window the changed answer shows and
> nothing else: alone it SHALL keep the default selection, and with another
> parameter it SHALL ride that view. Any other name, a
> repeated name, a value outside its set, a page that is not a positive
> integer, or a page past the last SHALL be refused with HTTP 400 naming the
> parameter, the reason and the allowed set, never ignored. When the
> work-item population is Unknown, a well-formed view SHALL render the
> Unknown board, since no served item gives a view or a last page. Every page SHALL
> link, by real anchors outside any collapsed element and reachable by
> keyboard, to the default selection, every item by id, each status, the
> governing-intent Unknown and the grouped view with their whole-population
> counts, and the current view's previous and next page. The machine answer
> SHALL take no parameter and SHALL declare the parameter set, the default
> change window, the page size,
> the order, and the grouped order and its page unit, `position`
> (`trajectory.narrowing`), so any page is recomputable from
> `workItems.items` and `trajectory.outline`.
>
> **Grouped by parent.** `group=parent` SHALL group the matching items by
> parent, where the matching items are the non-closed served items unless
> `status` names a status, closed included. An item's parents are the
> `depends_on_issue_id` of its `parent-child` rows, read by POC-REQ-062's
> same-revision dependency read and its identifier rules. The machine answer
> SHALL carry them once, as `trajectory.outline`: each served item's served
> parents, the items whose parent row names an external item, a wisp or
> another prefix, the items whose in-prefix parent is not served, and every
> set of served items whose parent links form a cycle; or, when that read is
> Unknown, the read's reason. An item SHALL sit under each served parent it
> has, once per parent; under "parent outside this tracker" for a parent row
> that names an external item, a wisp, another prefix or no target, and under
> "parent not served" for an in-prefix parent the observation did not serve; under "no parent recorded" when it has none of
> these; and, when the read is Unknown, every item SHALL sit under one
> "parent Unknown" group that states the reason. A parent outside the tracker
> or not served SHALL be counted and never named. Parent groups SHALL come
> first in ascending parent id, then those four groups in that order, and
> items in ascending id within a group; the page size counts positions, so
> an item under two parents takes two, and the view SHALL state the position
> total and that an item with several parents sits under each. A group's
> heading SHALL name its parent with the parent's tracker status as recorded,
> link to the parent's card and to the groups the parent itself sits under
> (to that parent's card on its all-items page when it has no group in this
> view),
> state the group's whole count and its count on this page, and mark a group
> split across pages at both ends with a link to the other page. A cycle
> SHALL be stated once, with its members, in the group of its first member in
> the grouped order; each other member's group SHALL link to that statement,
> and the cycle SHALL NOT be followed. Element ids of parent groups and of the
> four classes SHALL NOT collide, whatever an item's identifier. A closed parent with non-closed items, or the reverse, SHALL be
> shown as recorded: no group states completion, progress or a percentage of
> its parent (RFC8-15, RFC8-30). An item rendered twice on one page SHALL
> carry its fragment target once. The default selection is unchanged by this
> parameter; making the grouped view the default is a further amendment.
>
> - **Scope.** the rendered scope statement against the full observed item
>   set; the route's parameters, refusals and view links; the grouped view and
>   `trajectory.outline`.
>
> - **Case**: a checker loads Trajectory over a database whose total item
>   count exceeds the rendered selection; then, over 640 items (three pages),
>   loads every page of the unnarrowed view, every status view and the
>   governing-intent view, a page recomputed from the machine answer, five
>   refused requests, and the view links on the direct and the tailnet path.
> - **Observable**: the surface states the selection rule, the rendered
>   count, and the excluded count; each view's cards and counts; each
>   refusal's status and reason; the links and their keyboard reach.
> - **Oracle**: rendered count + excluded count equals the total count
>   read directly from Dolt at the served revision; every served item appears
>   on exactly one page of the unnarrowed view and of its status view, and the
>   governing-intent pages hold exactly the items carrying that Unknown; a
>   page's cards and counts equal the checker's own slice of
>   `workItems.items` (filter, ascending id, page size); `type=bug`,
>   `status=done`, `page=0`, `page=1.5` and a page past the last each return
>   400 with that reason; the links equal the expected list on both paths and
>   Tab reaches each. Arithmetic and equality decide.
> - **Oracle independence**: the total comes from a direct database
>   count; expected pages are the checker's own slices of the machine answer.
> - **Falsifier**: a board whose counts do not reconcile with the
>   database total, or no visible scope statement; a served item on no page
>   or on two of an ungrouped view; a parameter outside the set ignored rather than refused; a
>   view link missing, inside a collapsed element or unreachable by keyboard;
>   or a page the machine answer cannot reproduce; in the grouped view, a
>   non-closed item missing from a parent it has, a parent outside the tracker
>   named, a cycle followed past its members, a group stating its parent's
>   completion, a cycle stated twice, two elements sharing an id, or a split
>   group unmarked.
>
> #### Scenario: Bounded board over a large history
>
> - **WHEN** the database holds 6,964 items and Trajectory renders a
>   selection of 192
> - **THEN** the surface states the selection rule and that 6,772 items
>   are outside it, and the three numbers reconcile
>
> #### Scenario: Items grouped under their parents
>
> - **WHEN** a closed parent has two open items, one of them also sits under
>   a second parent, two items are each other's parent, one item's parent is
>   in another tracker and the reader opens `group=parent`
> - **THEN** the shared item appears under both parents with one fragment
>   target, the closed parent is shown closed with its items' own statuses,
>   the two-item cycle is stated once and not followed, the other tracker's
>   parent is counted under "parent outside this tracker" and never named,
>   and the groups' items equal the checker's own grouping of the machine
>   answer
>
> #### Scenario: Every item reachable by state and page
>
> - **WHEN** 640 items are served and the reader follows the view links
> - **THEN** each item appears on exactly one page of the unnarrowed view
>   and of its status view, every page states its scope and counts, and a
>   parameter outside the declared set is refused with 400 and its reason
>
> ```yaml
> warrants:
>   primary: VIS-2
>   doctrine: [VIS-1, VIS-2, VIS-3]
>   contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-15, RFC8-23, RFC8-30]
>   policies: []
>   decisions: [POC-DIR-2026-08-30]
>   topology: []
>   parent_requirements: [POC-REQ-062]
> ```

## Predecessor RFC2-6 coverage row

> | RFC2-6 | Coverage record for an executed mapping/oracle, with reconciling counts | covered — Thin/partial touch — only the coverage-record sub-item of the full immutable observation-record artifact is instanced; no persisted record, claim instances, tiers, evidence links, or challenge sets exist | POC-REQ-042, POC-REQ-051 |

## Proposed POC-REQ-042

> ### Requirement: POC-REQ-042 — Trajectory declares its scope and denominator
>
> Group: Trajectory. Form: **invariant**.
>
> **Required behavior.** Trajectory SHALL visibly declare which work-item
> population it renders (its selection rule) and the counts inside and outside
> that selection, so an excluded-item population is never silently invisible.
> Every served item SHALL be reachable: the route SHALL accept a closed
> parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
> `governing-intent=unknown` (the items carrying POC-REQ-014's governing-intent
> Unknown), `group=parent` and `page` (a positive integer). These parameters SHALL give a view
> of the matching items in ascending item id (with `group=parent`, in the
> grouped order below), one page of a declared fixed size, whose scope
> statement names the page, the page count and the matching count. When no
> parameter is supplied, the default SHALL be the first page of the
> non-closed work-item population grouped by parent. The machine answer
> SHALL give the same default selection. The set also holds
> `changed` (one of POC-REQ-044's change windows, `day`, `week` or
> `since-last`), which selects the window the changed answer shows and
> nothing else: alone it SHALL keep the default selection, and with another
> parameter it SHALL ride that view. `selection=recent` SHALL give a
> single status board with up to 200 most recently updated non-closed items
> and up to 50 most recently closed items. It SHALL put missing, invalid or
> timezone-less times last, break timestamp ties by ascending item id and
> order cards by ascending item id within each status column. It accepts
> `changed` and optional `page=1`. Any other name, a repeated name, a value
> outside its set, an incompatible selection parameter, a page that is not
> a positive integer, or a page past the last SHALL be refused with HTTP 400 naming the
> parameter, the reason and the allowed set, never ignored. When the
> work-item population is Unknown, a well-formed view SHALL render the
> Unknown board. Recent work SHALL still refuse a page after its fixed first
> page. Other view limits depend on the served population. Every page SHALL
> link, by real anchors outside any collapsed element and reachable by
> keyboard, to the default outline, recent work, every item by id, each
> status, the governing-intent Unknown with their whole-population counts,
> and the current view's previous and next page. The machine answer SHALL
> take no parameter and SHALL declare the parameter set, the default
> selection, the recency limits, the default change window, the page size,
> the order, and the grouped order and its page unit, `position`
> (`trajectory.narrowing`), so any page is recomputable from
> `workItems.items` and `trajectory.outline`.
>
> **Grouped by parent.** The default and `group=parent` SHALL group the matching items by
> parent, where the matching items are the non-closed served items unless
> `status` names a status, closed included. An item's parents are the
> `depends_on_issue_id` of its `parent-child` rows, read by POC-REQ-062's
> same-revision dependency read and its identifier rules. The machine answer
> SHALL carry them once, as `trajectory.outline`: each served item's served
> parents, the items whose parent row names an external item, a wisp or
> another prefix, the items whose in-prefix parent is not served, and every
> set of served items whose parent links form a cycle; or, when that read is
> Unknown, the read's reason. An item SHALL sit under each served parent it
> has, once per parent; under "parent outside this tracker" for a parent row
> that names an external item, a wisp, another prefix or no target, and under
> "parent not served" for an in-prefix parent the observation did not serve; under "no parent recorded" when it has none of
> these; and, when the read is Unknown, every item SHALL sit under one
> "parent Unknown" group that states the reason. A parent outside the tracker
> or not served SHALL be counted and never named. Parent groups SHALL come
> first in ascending parent id, then those four groups in that order, and
> items in ascending id within a group; the page size counts positions, so
> an item under two parents takes two, and the view SHALL state the position
> total and that an item with several parents sits under each. A group's
> heading SHALL name its parent with the parent's tracker status as recorded,
> link to the parent's card and to the groups the parent itself sits under
> (to that parent's card on its all-items page when it has no group in this
> view),
> state the group's whole count and its count on this page, and mark a group
> split across pages at both ends with a link to the other page. A cycle
> SHALL be stated once, with its members, in the group of its first member in
> the grouped order; each other member's group SHALL link to that statement,
> and the cycle SHALL NOT be followed. Element ids of parent groups and of the
> four classes SHALL NOT collide, whatever an item's identifier. A closed parent with non-closed items, or the reverse, SHALL be
> shown as recorded: no group states completion, progress or a percentage of
> its parent (RFC8-15, RFC8-30). An item rendered twice on one page SHALL
> carry its fragment target once. The rendered count SHALL count each item
> once on the page. The governing-intent checkbox in POC-REQ-014 SHALL
> narrow the visible cards of the default outline.
>
> - **Scope.** the rendered scope statement against the full observed item
>   set; the route's parameters, refusals and view links; the grouped view and
>   `trajectory.outline`.
>
> - **Case**: a checker loads Trajectory over a database whose total item
>   count exceeds the rendered selection; then, over 640 items (three pages),
>   loads the query-free outline, every page of the unnarrowed view, every
>   status view, the governing-intent and recent-work views, a page
>   recomputed from the machine answer, refused requests, and the links on
>   the direct and the tailnet path.
> - **Observable**: the surface states the selection rule, the rendered
>   count, and the excluded count; each view's cards and counts; each
>   refusal's status and reason; the links and their keyboard reach.
> - **Oracle**: rendered count + excluded count equals the total count
>   read directly from Dolt at the served revision; every served item appears
>   on exactly one page of the unnarrowed view and of its status view, and the
>   governing-intent pages hold exactly the items carrying that Unknown; a
>   page's cards and counts equal the checker's own slice of
>   `workItems.items` (filter, ascending id, page size); `type=bug`,
>   `status=done`, `page=0`, `page=1.5` and a page past the last each return
>   400 with that reason; the links equal the expected list on both paths and
>   Tab reaches each. Arithmetic and equality decide.
> - **Oracle independence**: the total comes from a direct database
>   count; expected pages are the checker's own slices of the machine answer.
> - **Falsifier**: a board whose counts do not reconcile with the
>   database total, or no visible scope statement; a served item on no page
>   or on two of an ungrouped view; a parameter outside the set ignored rather than refused; a
>   view link missing, inside a collapsed element or unreachable by keyboard;
>   or a page the machine answer cannot reproduce; in the grouped view, a
>   non-closed item missing from a parent it has, a parent outside the tracker
>   named, a cycle followed past its members, a group stating its parent's
>   completion, a cycle stated twice, two elements sharing an id, or a split
>   group unmarked.
>
> #### Scenario: Bounded board over a large history
>
> - **WHEN** the database holds 6,964 items and Trajectory renders a
>   selection of 192
> - **THEN** the surface states the selection rule and that 6,772 items
>   are outside it, and the three numbers reconcile
>
> #### Scenario: Items grouped under their parents
>
> - **WHEN** a closed parent has two open items, one of them also sits under
>   a second parent, two items are each other's parent, one item's parent is
>   in another tracker and the reader opens Trajectory without parameters
> - **THEN** the shared item appears under both parents with one fragment
>   target, the closed parent is shown closed with its items' own statuses,
>   the two-item cycle is stated once and not followed, the other tracker's
>   parent is counted under "parent outside this tracker" and never named,
>   and the groups' items equal the checker's own grouping of the machine
>   answer. The explicit `group=parent&page=1` view gives the same groups
>   and counts.
>
> #### Scenario: Recent work remains reachable
>
> - **WHEN** the reader follows the recent-work link from the outline
> - **THEN** the recency rule selects the capped populations by their
>   recorded instants in the same evaluation, and the linked default
>   outline remains reachable by keyboard
>
> #### Scenario: Every item reachable by state and page
>
> - **WHEN** 640 items are served and the reader follows the view links
> - **THEN** each item appears on exactly one page of the unnarrowed view
>   and of its status view, every page states its scope and counts, and a
>   parameter outside the declared set is refused with 400 and its reason
>
> ```yaml
> warrants:
>   primary: VIS-2
>   doctrine: [VIS-1, VIS-2, VIS-3]
>   contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-15, RFC8-23, RFC8-30]
>   policies: []
>   decisions: [POC-DIR-2026-08-30]
>   topology: []
>   parent_requirements: [POC-REQ-014, POC-REQ-062]
> ```

## Proposed RFC2-6 coverage row

> | RFC2-6 | Coverage record for an executed mapping/oracle, with reconciling counts | covered — Thin/partial touch — only the coverage-record sub-item of the full immutable observation-record artifact is instanced; no persisted record, claim instances, tiers, evidence links, or challenge sets exist. The Trajectory default gives a reconciling count of distinct items and a separate count of positions in the parent outline (POC-REQ-042). | POC-REQ-042, POC-REQ-051 |
