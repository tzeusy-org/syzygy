# Fidelity review cost per round: a design note

Bead `syzygy-pdja.19`. A design note, not a specification: it binds
nothing, proposes no requirement text and needs an owner decision before
any part of it beyond what is already lawful is drafted. Authority is the
signed specification
`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`
(v1.5) and the predecessor requirements it names; where this note and that
text disagree, the text wins.

## The problem

[Observed, from the bead's record of the Redis run `run-ffe579c7`, measured
from the agent homes' transcript usage fields] the run spent 38.9M agent
tokens against a declared 30M budget. The fidelity session alone spent
23.3M over 6 rounds and 88 model calls, 22.6M of them cache reads; fresh
tokens across the run were about 1.4M.

[Inferred] Almost all of the cost is the same context read again: each
round delivers the whole packet, a continuing session keeps every earlier
round in its context, and every model call reads that whole context again.
Cost per round therefore grows with the round number, not only with the
packet's size.

## What governs the packet and a confirmation

REQ-polaris-generation-035 (packet contents): "For each review Syzygy SHALL
emit a review packet containing only the frozen subject (the draft with its
understanding record, ...), the cited spans as Syzygy read them, the
governing criteria, the verdict schema, the pinned revision and the
packet's own digest". Its scenario "Review packet without the authoring
exchange" adds "and nothing else".

REQ-polaris-generation-035 (completeness): Syzygy validates "that every
inventory entry and every claim block has an entry", and "Any revision of
the subject or the inventory retires the verdicts bound to it."

REQ-polaris-generation-035 (continuity): "One waiting review session MAY
receive the packet of each later revision of its subject as its next
round, and a verdict it writes on that packet is validated and counted
under the rules above."

REQ-polaris-generation-033 (re-derivation): at render and each check,
Syzygy re-derives "every verdict's binding, by rebuilding the review packet
from the frozen subject and comparing its digest to the one the verdict
names."

REQ-polaris-generation-033 (usage): "Agent usage SHALL be recorded only as
the figure the operator declares, labelled Inferred and attributed to the
operator ... it SHALL NOT be presented as Observed, as a provider receipt,
or as zero."

REQ-polaris-generation-034 (repairs): "Each resubmission is a new draft
revision with its own identity; it counts against the repair-cycle limit,
and it retires earlier check results and dependent review evidence".

REQ-polaris-generation-006, as the amendment overlay states it: "A draft
SHALL become ready for owner review only after independent fidelity and
rendered-design reviews confirm the frozen bundle and all blocking findings
have dispositions verified against that same bundle." and "A revision
SHALL retire dependent review evidence." REQ-035 displaces neither.

## The options

| Option | Lawful now? | Clauses it would change | Expected saving [Inferred] | Risk to what a confirmation means |
|---|---|---|---|---|
| A. Per-round usage note to the operator | Yes; implemented | None: the note goes to the session that ran `session-prompt`, never into the packet | None by itself; it makes the cost visible per round so the next two options get used | None. It labels the packet's bytes Observed (Syzygy built and wrote them at that step), the earlier rounds' bytes Inferred (from delivery records within the agent sessions' write reach) and an unreadable or unsized record Unknown, and gives no token figure |
| B. Batch repairs: every finding of a verdict in one revision | Yes; skill guidance | None: REQ-034 counts each resubmission; nothing requires one per finding | Fewer rounds. In a continuing session the packets read grow as 1+2+...+n, so six rounds (21 packet-reads) cut to two or three (3 to 6) is a cut of about 70-85%, not half | None. Each round is still a whole-packet review |
| C. A fresh session for a later round (`--fresh`) | Yes; already built | None: REQ-035 lets one session continue ("MAY"), never requires it | The context holds one packet, not every earlier one; for round n the saving approaches (n-1)/n of the carried context | Lowers one: a fresh reviewer has not seen its own earlier verdict, which REQ-035 says "may anchor this one". It costs the operator a new terminal per round, so the run stops being walk-away |
| D. Delta packet carrying confirmed rows forward | No | REQ-035 packet contents and "nothing else"; its completeness rule; "Any revision ... retires the verdicts bound to it"; REQ-033's rebuild-and-compare binding; REQ-006's "confirm the frozen bundle" and "A revision SHALL retire dependent review evidence" (needs its own displacement sentence); REQ-034's retirement of "dependent review evidence" | Largest per round when repairs are local: a packet of the changed blocks, their spans and the inventory entries they touch | High; see below |

A and B are in this branch. C exists (`session-prompt ... --fresh`) and the
usage note now names it each round.

## Why option D needs the owner

A carried-forward entry is a confirmation of bytes no reviewer read in the
round that counts. Under the current text a counted verdict is one whose
packet Syzygy can rebuild from the current frozen subject, with an entry
for every block, written by a session that read that packet. Option D
would make a counted verdict a composite of entries from several packets,
so each of these would need a new rule:

1. **Context dependence.** A block's meaning is not its bytes alone.
   REQ-034 has the reviewer judge "a table cell's claim as read with its row
   and column labels", and a callout's tone and the order of steps "with the
   claims as presented". A neighbour's repair can change what an unchanged
   block asserts. "Unchanged" would need a scope: the block, its element, its
   section, or the page.
2. **Coverage is global.** Inventory-to-draft coverage and material
   omissions are judged over the whole draft. A repair that moves or removes
   a claim can uncover an omission in an inventory entry whose own bytes
   never changed, so coverage could not be carried forward entry by entry.
3. **Binding.** REQ-033 re-derives a verdict's binding by rebuilding one
   packet. A composite verdict needs a chain: each round's packet, the delta
   rule that admitted each carried entry, and a rebuild of all of them at
   render.
4. **The generator's own judgement.** REQ-006 forbids the generator from
   classifying its own wording change as immaterial. Byte equality is not
   that classification, but any rule looser than exact equality of the
   block, its cited spans and its context would be.
5. **Anchoring.** A delta reviewer sees only what changed and is told the
   rest stood. That is the anchoring REQ-035 already makes the review page
   disclose for a continuing reviewer, made structural.

A smaller delta, if the owner wants one, would keep the whole packet and
only add a Syzygy-written list of the block identities whose bytes or cited
spans changed since the previous round, with every entry still required.
That changes "nothing else" and still needs a CC-REV-2 amendment, but keeps
every confirmation meaning what it means now; its saving is reviewer
effort, not tokens read, so it does not answer this bead's measurement.

## Recommendation

Use A, B and C now and measure one more launched run before deciding D:
[Inferred] B and C attack the growth that dominated `run-ffe579c7`: B cuts
the number of rounds, C stops a session carrying earlier rounds. D shrinks
every packet after the first, and in a continuing session that shrinks the
carried context as well, so D also cuts the growing term; with C in use its
saving is the size of each later packet. Measuring B and C first shows how
much is left for D to save. If the owner still wants D, it
is a CC-REV-2 change to REQ-polaris-generation-035 and the REQ-006 reading,
drafted as a v1-6 candidate package, reviewed and signed before any code.

## Open owner questions

1. Is the fresh-session default worth the lost walk-away property, or
   should the skill keep continuing sessions by default and offer `--fresh`
   only when the usage note shows a large carried context?
2. Is any form of option D wanted, given the risks above?
