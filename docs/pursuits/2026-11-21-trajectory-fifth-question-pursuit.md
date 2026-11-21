# Trajectory pursuit, run 2: the fifth question

**Date:** 2026-11-21. **Scope:** how Trajectory could ever answer "has the result been
verified against intent", and the half of its contract (RFC 0008) that run 1 did not plan.
**Predecessor:** `docs/pursuits/2026-11-21-trajectory-vision-pursuit.md` (moves T1 to T13).
**Data:** `2026-11-21-trajectory-fifth-question-pursuit-data.json` (every finding with its
file and line under `.units`, every move under `.ranked_moves`).
**Status:** a plan. Nothing here is built, adopted or released. It is not authority.

Labels follow the repository rule: `[Observed]` was read or measured this run, `[Inferred]`
is a judgement from what was read, `[Unknown]` was not readable.

## Why a second run

Run 1 found that Trajectory answers about one and a half of its five questions and planned
thirteen moves. Fully built, those moves answer four. The fifth stays empty: governing
intent is Unknown for 10,971 of 10,971 work items, and run 1 expected one item to gain an
intent through its move T7. The README calls the fifth question "the one no issue tracker
answers: a merged change is not a satisfied intent." This run asks what it would take.

## What was measured

- Syzygy sources at `9ebf12476`; main at `c813f041c` `[Observed]`.
- Syzygy's own tracker, 1,370 items, by counts and column names only; no title, description
  or note was read `[Observed]`.
- The last 500 commit subjects on main, 200 merged pull requests, and the hosted check runs
  on one merge commit `[Observed]`.
- The proving project (Butlers) was not readable from the session. Everything about its
  tracker, conventions and continuous integration is `[Unknown]`.

## Five findings

**1. The intent is a constant in the code, not a record.** Every work item's governing
intent is set to Unknown when it is observed, whatever Syzygy has recorded
(`packages/three-surface-poc-core/src/work-items.ts:265`). The record written when Syzygy
creates a work item stores the item id, an external reference, a path, an instant and an
attribution; it stores no requirement and no pinned revision (`materialization.ts:110-121`).
The contract requires "proposal identity, work-item identity set, and the pinned warranted
intent revision", all three (RFC8-10). **So run 1's T7 would not have given its item an
intent**; this corrects run 1. `[Observed]`

**2. The one demonstrated loop names two different intents.** The dispatch packet cites
`REQ-switchboard-identity-001` (`materialization.ts:15`). The verification badge reads a
separate seed constant, `REQ-connector-base-spec-001` (`poc-seeds.ts:115`). A run of the
loop would bind its evidence to an intent the item was never created for. The repository
already records one false "Verified" from constants sitting side by side. `[Observed]`

**3. The contract has one hole, and every item sits in it.** RFC8-8 says "A scheduler work
item matching no materialization record is an orphaned-work Contradiction". RFC8-23 says a
pre-Syzygy backlog item is Unknown-provenance, "not orphaned work". No clause says how to
tell the two apart. Read literally, the first real record turns the other 10,970 items into
Contradictions. `[Inferred]` from the two clauses.

**4. The verdict vocabulary is built and nothing produces it.** `packages/cap1-core` defines
the reconciliation facts and the chain state `reconciled@E`, with conformance tests. No
non-test file computes one: 0 of 310, checked two ways. `[Observed]`

**5. The tracker links work to work, never work to intent.** `[Observed]` on Syzygy's own
tracker and history:

| Link | Measure |
|---|---|
| Item to pull request, written by an actor | 192 of 1,370 items carry `gh-pr:N` |
| Item to commit, by naming convention | 365 of the last 500 subjects carry an item id |
| Item to requirement | 0 items; `spec_id` is set on 26, none a requirement id |
| Commit to requirement | 1 of the last 500 subjects |
| Requirement to check | 42 CAP1 requirements, 42 conformance files, one to one |
| Merge commit to hosted checks | 9 check runs on the one commit inspected |

The execution half of the chain is recoverable at scale. The intent half is close to
empty, and the contract forbids reading it out of execution-side prose (RFC8-25).

One consequence reaches work already released. The wave-1 slice `syzygy-t3jk.16` asked
for a fifth row reading "verified = Unknown for N of N". Only materialized work that reached
merge enters the reconciliation chain (RFC2-18), so that denominator is wrong. The slice was
corrected before any code was written (move U1).

## Tier board

First run on this scope, so there is no movement to report.

| Surface | Tier |
|---|---|
| Contract for this half (RFC 0008 modules 1 and 3, RFC2-17 to 20) | solid |
| Test-artifact verification (report-fact cap, fail-closed) | solid |
| Syzygy tracker and history as item to pull request to merge substrate | solid |
| Governing-intent observation | weak |
| Materialization record | weak |
| Reconciliation verdict machinery | weak |
| Syzygy tracker as a source of intent links | weak |
| Intent binding of the demonstrated loop | broken |
| Pre-work plane: approved intent not yet turned into work | absent |
| Orphaned-work detection | absent |
| Review lanes, pull-request and merge facts | absent |
| Retention of the records the chain depends on | absent |

## Themes

- **The warrant is a constant, not a record.** Nothing persisted names an intent.
- **Built vocabulary, no producer.** The verdict types exist; nothing feeds them.
- **One hole in the contract.** Orphaned work and Unknown-provenance have no dividing rule.
- **Work links to work, never to intent.**
- **Independence is the scarce resource.** Since D10 an agent row can warrant work,
  adjudicate a Contradiction and adopt a check, and the check lives in the repository the
  worker edits. The fifth answer is worth having only if who warrants, who verifies and
  what checks are kept apart by a mechanical rule.
- **Durability before coverage.** The one record lives in a private state directory; the
  contract wants such records Syzygy-owned and preserved (RFC4-16, RFC8-26).

## Moves

Eleven, ranked by doctrine's order (truth, then comprehension, then momentum), then by what
each enables, then by cost. Value and cost are 1 to 5. Full text, slices and finding ids
are in the data file.

**U1. Three counts in the fifth row, never "verified N of N" (5/1).** Unknown-provenance
n of N with reason and route; the reconciliation chain as its own observed count, each
member "reconciliation evidence absent"; orphaned work Unknown until U2. Never summed.
Applied to `syzygy-t3jk.16`.

**U2. State the orphan predicate (5/2).** Amend RFC1-29, RFC8-8 and RFC8-23 with a
decidable rule: an unrecorded item is orphan-eligible only if it carries a pointer Syzygy
wrote, or was created inside a declared Syzygy-governed scope after a declared onset
instant. Every other unrecorded item is Unknown-provenance. Then detect it.

**U3. One intent per loop (4/2).** Delete the second seed constant. The badge and any
later verdict read the intent from the item's own record. Move the bounded mapping out of
code into a governance mapping artifact (SDR-4 names those "the primary declaration site").

**U4. A durable materialization ledger, joined into governing intent (5/3).** Append-only
records under the observed project's `.syzygy/work/` with the three things RFC8-10 requires.
The work-item observation reads the tracker's external reference under a closed grammar,
only to join a record, and shows a joined item's intent as Observed. This is the move that
makes T7 mean something. Butlers is on the owner's owned list since 2026-11-21, so the
write there is not an owner class.

**U5. Declare retention for chain records (3/1).** The tracker's retention bound and the
longest gap between observation passes, adopted by row (RFC4-16). No compaction has run on
Syzygy's tracker yet, so it costs little now.

**U6. The pre-work plane, shown as absence (4/2).** Every identified requirement across
every observed change, against the work that carries a warrant: requirements with no work,
work with no requirement, proposals queued. RFC8-8 calls this "absence surfacing, not gap
computation" at V0. 64 of 151 requirement headings carry no identifier and are counted as
such.

**U7. The first true `reconciled@E` (5/4).** One CAP1 requirement, Syzygy observing
Syzygy. A mapping from requirement to conformance check that pins both files; a per-test
report uploaded by the merge-queue run; a capture of the hosted check run for the merge
commit; one evaluation that produces the existing verdict types. A changed check or a
changed requirement renders as drift, not as green. This is V1 work (RFC8-29: "V1 computes
the reconciliation evaluation"); starting it is an agent decision, reported.

**U8. Fleet work enters through materialization (5/3).** An operator command that takes an
approved requirement or decision and writes the ledger record and the tracker item together.
It is the only intent source that scales forward, and it matches the owner's earlier choice
that intent links come from "Syzygy's own creation records only" (P-100, question 1).

**U9. Review lanes and merge facts by recorded identity (4/3).** Read `gh-pr:N` references
under a closed grammar and fetch pull-request facts from the hosting adapter: head commit,
review state, check conclusions, merge commit. It ranks above run 1's T10, which joins by
naming convention. It widens the P-100 choice: reading the external reference was that
question's second option.

**U10. Declared warrants for existing work, with separation of duty (4/3).** A mapping
artifact of intent-to-item rows, proposed in batches from recorded evidence, never from
titles or similarity. A batch binds only by an adoption row whose adopter claimed none of
its items, and each link is shown as declared before or after the work.

**U11. The post-merge account (4/2).** For a window the reader chooses, merged items split
into the four answers the contract says "must never share a rendering" (RFC8-28), plus
Unknown-provenance and orphaned work, each with its denominator and its next action.

## Order

- **Wave 1, truth and declarations, no new reads:** U1, U2 (the amendment), U5.
- **Wave 2, the join:** U4, U3, U6 for Syzygy's own tree.
- **Wave 3, coverage:** U8, U9, U10.
- **Wave 4, the verdict:** U7, U11.

U4 and U7 depend on run 1: U4's first real record needs T7 and `syzygy-mxas`; showing U7 or
U9 on the page needs T12 (Syzygy's own tracker as a second project). Run 1's waves are
unchanged, except that T12 now gates more and should be pulled forward when wave 2 of run 1
is released.

## What this run asks of the owner

Nothing is gated. No move falls in the four owner classes of VIS-4: none changes doctrine,
weakens secret screening, writes into a repository the owner does not own, or exposes
anything beyond the tailnet.

One judgement is recorded for veto instead of being asked. RFC8-8 routes orphaned work "to
owner adjudication as its only lawful exit". VIS-4 as amended says that where a contract
"requires an owner act, sign-off, consent or ruling for something this rule leaves to
agents, this rule governs and an agent adoption satisfies it". So agents may now adjudicate
orphaned work and declare warrants. This plan lets them, under U10's separation rule, with
every adjudication reported. The owner vetoes by saying so.

Five moves change earlier practice or an earlier ruling and say so in their beads: U2
(contract amendment), U7 (begins V1 work), U8 (how the fleet files work), U9 (widens P-100
question 1), U10 (agents declare warrants).

## Objections

- **U7 is V1 work while the V0 page is weak.** True. It is ranked last, and it is the only
  move that makes the fifth answer non-empty for anything.
- **A contract amendment for a proof of concept.** Without U2 the first real record puts
  one item in a recorded state and the rest, read literally, into Contradiction.
- **U8 adds friction to filing work.** Yes. That is the price of intent links that are
  records and not guesses.
- **Syzygy grading Syzygy.** The check run is confirmed by the host, the check file is
  pinned, and the evidence carries mutants. What remains is the separation question above.

## Not verified

- Anything about Butlers.
- The V1 readiness drive's plans (`syzygy-rrrd`, `syzygy-qd2t`, `syzygy-oq3x`); its files
  are not in the repository, and U7 may overlap it.
- That merge-queue commits equal main's commits in general; seen on one commit.
- RFC4-13(a) and (b) and RFC3-16(a) were read in part.
- Whether `syzygy-a4ry` or `syzygy-nosn` already settles which merge fact U9 binds to.

## Planned epic

REVIEW_AND_EPIC_PLACEHOLDER
