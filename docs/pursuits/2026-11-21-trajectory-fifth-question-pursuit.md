# Trajectory pursuit, run 2: the fifth question

**Date:** 2026-11-21. **Scope:** how Trajectory could ever answer "has the result been
verified against intent", and the half of its contract (RFC 0008) that run 1 did not plan.
**Predecessor:** `docs/pursuits/2026-11-21-trajectory-vision-pursuit.md` (moves T1 to T13).
**Data:** `2026-11-21-trajectory-fifth-question-pursuit-data.json` (every finding with its
file and line under `.units`, every move under `.ranked_moves`).
**Status:** a plan. Nothing here is built, adopted or released. It is not authority.

Terms used below. A **warrant** is the approved intent a piece of work exists to serve: a
requirement, or a recorded decision. A **materialization record** is what Syzygy writes when
it turns approved intent into a tracker item. The **chain** is the contract's path from
warrant to plan item to that record to the work item, its runs, its commits, the merge and
finally a reconciliation verdict (RFC8-21). **D10** is the 2026-11-18 doctrine amendment
that left the owner four classes of decision and gave agents the rest. **P-100** is an
earlier owner ruling on where intent links may come from. T-numbers are run 1's moves.

Labels follow the repository rule: `[Observed]` was read or measured this run, `[Inferred]`
is a judgement from what was read, `[Unknown]` was not readable.

## Why a second run

Run 1 found that Trajectory answers about one and a half of its five questions and planned
thirteen moves. Fully built, those moves answer four. The fifth stays empty: governing
intent is Unknown for 10,971 of 10,971 work items, and run 1 expected one item to gain an
intent through its move T7. The README calls the fifth question "the one no issue tracker
answers: a merged change is not a satisfied intent." This run asks what it would take.

## What was measured

- Syzygy sources at `9ebf12476` (the product sources equal main `c62d4cf79`); history and
  hosted checks on main at `c813f041c` `[Observed]`.
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
creates a work item stores the item id, an external reference, a path, an instant, the
tracker revision, an attribution and whether the item was created or reused; it stores no
intent and no intent revision (`materialization.ts:110-121`).
The contract requires "proposal identity, work-item identity set, and the pinned warranted
intent revision", all three (RFC8-10). **So run 1's T7 would not have given its item an
intent**; this corrects run 1. `[Observed]`

**2. The one demonstrated loop names two different intents.** The dispatch packet cites
`REQ-switchboard-identity-001` (`materialization.ts:15`). The verification badge reads a
separate seed constant, `REQ-connector-base-spec-001` (`poc-seeds.ts:115`). A run of the
loop would put its report beside an intent the item was never created for. The badge
renders Unknown on every arm today, so nothing false is shown yet; the repository already
records one false "Verified" from constants sitting side by side. `[Observed]`

**3. The contract gives no decidable rule for orphaned work, and every item depends on it.**
RFC8-8 says "A scheduler work item matching no materialization record is an orphaned-work
Contradiction", unconditionally. RFC8-23 says an item with no traceable warrant is
Unknown-provenance, which "may be" a pre-Syzygy backlog item and is "not orphaned work"; where
an item is both, "the orphaned-work Contradiction governs". Read literally, all 10,971 items
are both. The contract's own reason for the Contradiction is "two stores answering one
question", which implies a rule it never states: an item is orphaned only when a Syzygy
record or pointer claims it and the two disagree. `[Inferred]`; an independent reviewer
tried to find a clause that supplies the rule and could not.

**4. The verdict vocabulary is built and nothing produces it.** `packages/cap1-core` defines
the reconciliation facts and the chain state `reconciled@E`, with conformance tests. No
non-test file computes one: of 311 non-test TypeScript files under `packages/*/src` and
`apps/*/src`, only the defining file `facets.ts` names the three symbols. `[Observed]`

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
merge enters the reconciliation chain (RFC2-18), so that denominator is wrong. The slice's
text was corrected on 2026-11-21, before any code was written (move U1). Which reading of
RFC2-18 and RFC2-19 binds is itself parked on the open bead `syzygy-a4ry`; U1 follows the
literal text and that bead may refine it.

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

Twelve, ranked by doctrine's order (truth, then comprehension, then momentum), then by what
each enables, then by cost. Value and cost are 1 to 5. Full text, slices and finding ids
are in the data file.

**U1. Three counts in the fifth row, never "verified N of N" (5/1).** Unknown-provenance
n of N with reason and route; the reconciliation chain as its own observed count, each
member "reconciliation evidence absent"; orphaned work stated as not checked, never 0.
Never summed. Applied to `syzygy-t3jk.16`.

**U2. State the orphan rule (5/2).** Amend RFC1-29, RFC8-8 and RFC8-23 so that an item is
an orphaned-work Contradiction only when a Syzygy record or a pointer Syzygy wrote claims
it and no matching record agrees; every other unrecorded item is Unknown-provenance. Then
detect it, render it where it cannot be filtered away, and route it to the owner. Who may
adjudicate one is the question this run asks (below).

**U12. The smallest approved plan item (4/2).** RFC1-29 materializes "an approved
execution-intent Proposal", and RFC8-10 requires its identity in the record. No Proposal
lifecycle exists. Define the minimal one under `.syzygy/work/` (RFC8-7): a file naming the
warrant at a pinned revision, approved by an adoption row. Without it U4's records would
fail the same three-part test that today's record fails. Added on review.

**U3. One intent per loop (4/2).** Delete the second seed constant. The badge and any
later verdict read the intent from the item's own record; until U4 lands, from the packet.
Move the bounded mapping out of code into a governance mapping artifact (SDR-4 names those
the "primary declaration site").

**U4. A durable materialization ledger, joined into governing intent (5/3).** Append-only
records under the observed project's `.syzygy/work/` holding the three things RFC8-10
requires. The join uses the work-item ids the record itself holds, so no new tracker field
is read and P-100 is not widened. A joined item's intent shows as Observed. This is the
move that makes T7 mean something. It lands on Syzygy's own tree first. The write into the
proving project is not an owner class, since Butlers is on the owned list since 2026-11-21,
but whether that project has a `.syzygy/` tree and how new files change its observed shape
are `[Unknown]`.

**U5. Declare retention for chain records (3/1).** The tracker's retention bound and the
longest gap between observation passes, adopted by row (RFC4-16). No compaction has run on
Syzygy's tracker yet, so it costs little now.

**U6. The pre-work plane, shown as absence (4/2).** Every identified requirement across
every observed change, against the work that carries a warrant: requirements with no work,
work with no requirement, plan items queued. RFC8-8 calls this "absence surfacing, not gap
computation" at V0. 64 of 151 requirement headings carry no identifier and are counted as
such.

**U7. The first true `reconciled@E` (5/4).** One CAP1 requirement, Syzygy observing
Syzygy. A mapping from requirement to conformance check that pins both files; a per-test
report uploaded by the continuous-integration run that the merge queue triggers; a capture
of the hosted check run for the merge commit; one evaluation that produces the existing
verdict types. A changed check or a changed requirement renders as drift, not as green.
It proves the machinery and nothing more: doctrine says "Observing the Syzygy repository
itself is not the credibility test" (`v1.md`), so the same verdict on a Butlers requirement
is the follow-on that counts. This is V1 work (RFC8-29: "V1 computes the reconciliation
evaluation"); starting it is an agent decision, reported. It also waits on `syzygy-a4ry`.

**U8. Fleet work enters through materialization (5/3).** An operator command that takes an
approved plan item and writes the ledger record and the tracker item together. It is the
only intent source that scales forward, and it matches the owner's P-100 choice that intent
links come from "Syzygy's own creation records only".

**U9. Review lanes and merge facts by recorded identity (4/3).** Read `gh-pr:N` references
under a closed grammar and fetch pull-request facts from the hosting adapter: head commit,
review state, check conclusions, merge commit. It ranks above run 1's T10, which joins by
naming convention. It widens the P-100 choice: reading the external reference was that
question's second option. Flagged for veto.

**U10. Declared warrants for existing work, with separation of duty (4/3).** A mapping
artifact of intent-to-item rows, proposed in batches from recorded evidence, never from
titles or similarity. A batch binds only by an adoption row whose adopter claimed none of
its items, and each link is shown as declared before or after the work. Declaring a warrant
is an agent decision; adjudicating a Contradiction is not (below).

**U11. The post-merge account (4/2).** For a window the reader chooses, merged items split
into the four answers the contract says "must never share a rendering" (RFC8-28), plus
Unknown-provenance and orphaned work, each with its denominator and its next action.

## Order

- **Wave 1, truth and declarations, no new reads:** U1, U2 (the amendment), U5.
- **Wave 2, the join:** U12, U4, then U3 (it reads the record U4 introduces), U6 for
  Syzygy's own tree.
- **Wave 3, coverage:** U8, U9, U10.
- **Wave 4, the verdict:** U7, U11.

U4 and U7 depend on run 1: U4's first real record needs T7 (run the one dispatch loop) and
`syzygy-mxas`; showing U7 or U9 on the page needs T12 (Syzygy's own tracker as a second
project). Run 1's waves are unchanged, except that T12 now gates more and should be pulled
forward when run 1's wave 2 is released.

## What this run asks of the owner

One question. The first draft of this report said nothing was gated; the independent review
showed that was wrong.

**Who adjudicates an orphaned-work Contradiction?** Doctrine says a contradiction "renders
the affected conclusion Unknown and routes to adjudication by the owner"
(`.syzygy/governance/doctrine/architecture.md`). VIS-4 lets an agent adoption stand in for
an owner act that "a contract, policy, specification, decision or direction requires"; that
list does not include doctrine, and D10 left the architecture sentence as it was. So an
agent may not adjudicate one, and only the owner can change that, by amending doctrine.
Until the answer, U2 detects, renders and routes to the owner, and adjudicates nothing. The
question is `pursuit-2026-11-21-trajectory-orphan-adjudication` in the owner packet; the
plan-hold bead carries its path.

No other move falls in an owner class: none changes doctrine, weakens secret screening,
writes into a repository the owner does not own, or exposes anything beyond the tailnet.
Five moves change earlier practice or an earlier ruling and say so in their beads, open to
veto: U2 (contract amendment), U7 (begins V1 work), U8 (how the fleet files work), U9
(widens P-100 question 1), U10 (agents declare warrants).

## Objections

- **U7 is V1 work while the V0 page is weak.** True. It is ranked last, and it is the only
  move that makes the fifth answer non-empty for anything.
- **A contract amendment for a proof of concept.** Without U2 the first real record puts
  one item in a recorded state and the rest, read literally, into Contradiction.
- **U8 adds friction to filing work.** Yes. That is the price of intent links that are
  records and not guesses.
- **Syzygy grading Syzygy.** The check run is confirmed by the host, the check file is
  pinned, and the evidence carries mutants. Doctrine still says it is not the credibility
  test; U7 says so and names the Butlers follow-on.

## Not verified

- Anything about Butlers.
- The V1 readiness drive's plans (`syzygy-rrrd`, `syzygy-qd2t`, `syzygy-oq3x`); its files
  are not in the repository, and U7 may overlap it.
- That merge-queue commits equal main's commits in general; seen on one commit.
- RFC4-13(a) and (b) and RFC3-16(a) were read in part.
- Whether `syzygy-a4ry` or `syzygy-nosn` already settles which merge fact U9 binds to.
- Pull-request and check-run counts were not re-derived by the reviewer.
- The tracker grew during the run: 1,370 items when measured, 1,374 at review.

## Corrections after independent review

One fresh-context review at `8360c84c1` returned REVISE. Every finding was repaired once; no
confirmation round was run.

- "Nothing is gated" was wrong: doctrine routes contradictions to the owner. One question
  is now asked.
- Finding 3 overclaimed "no clause says how to tell the two apart"; it now quotes RFC8-23's
  tie-break and states what is actually missing. U2 lost a limb that would have made every
  new raw tracker item a Contradiction.
- The plan skipped the approved plan item the contract requires; U12 added.
- U4 no longer reads the tracker's external reference, so it no longer widens P-100.
- U7 now carries doctrine's sentence on self-observation and its Butlers follow-on.
- U1 and U7 cite the parked bead `syzygy-a4ry`.
- Smaller: the record's fields, the badge's present behaviour, the predicate behind "none
  of 311 files", the two measured commits, and a glossary.

## Planned epic

Epic and plan-hold ids are in the data file under `.epic`.
