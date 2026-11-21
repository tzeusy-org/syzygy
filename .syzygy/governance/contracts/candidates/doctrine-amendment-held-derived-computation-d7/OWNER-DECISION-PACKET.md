# Doctrine amendment packet — D7 (proposed): held derived computation delegates no decision

**WITHDRAWN 2026-11-21 by the owner, as superseded by D10** (answer
recorded in `../../../decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`). P-101
and its questions Q1 to Q6 close unruled. The text below, including the
parked banner, is history.

**PARKED 2026-10-15 (owner answer "Park until RFC2 decided", recorded in
`../../../decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`).**
This packet is not reviewed again and not offered. An RFC2-18/19 contract
clarification draft is commissioned to fix which reading of the merge-fact
confinement binds (narrow, wide, or the broadest built from RFC4
`named-adapters.md` lines 420–421 and 492); D7 is then redrafted against it.
Round 4's findings stay open in `ROUND-4-DISPOSITIONS.md`. Register row
P-101 tracks it. The text below is as it stood at round 4 and is not edited.

**Status: DRAFT — not applied, not adopted; binds nothing.** Doctrine
amendment is an owner act (VIS-4). An agent session drafted this packet on
2026-10-03 for `syzygy-u05.14` (vision pursuit 2026-09-22, move N14,
"packet A, the molding half"). The packet edits no doctrine byte, opens no
gate, authorizes no implementation, installs nothing and runs nothing. A
commit, a merged pull request, a review, a closed bead or silence performs
nothing; only the owner's own words in the owner's own session do.

**Review status (2026-10-03).** One fresh-context round returned `REVISE`
(`docs/reviews/R-DOCTRINE-AMENDMENT-D7-1-RAW.md` line 4) over the bytes at
`fc46ec4`: six revise-level findings and eleven notes. Each was repaired
once, recorded in `ROUND-1-DISPOSITIONS.md` (this directory). Under the
stopping rule set before the round, no round 2 was dispatched: **these
repaired bytes are unconfirmed**, and the owner decides on them as such.
*(Marked 2026-10-14: "no round 2 was dispatched" is no longer true. On the
owner's direction of 2026-10-14
(`../../../decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`) a
round 2 read these bytes and returned `REVISE`, one revise finding and seven
notes (`docs/reviews/R-DOCTRINE-AMENDMENT-D7-2-RAW.md` line 4). The bytes
stay unconfirmed and go to the owner with those findings open;
`ROUND-2-DISPOSITIONS.md` beside this file classifies them.)*
*(Marked 2026-10-14, later the same day: "the bytes … go to the owner with
those findings open" is no longer true. On a further owner direction of
2026-10-14, given in the lead session and relayed to this repair lane [not
yet recorded under `decisions/`], every round-2 finding, notes included,
was repaired once; the mapping is `ROUND-2-DISPOSITIONS.md` §"Repairs,
2026-10-14 (cycle 2)".)* **Round-2 findings repaired once on 2026-10-14,
unconfirmed pending round 3.** One owner question was added by the repair
(Q5, section 8).
*(Marked 2026-10-14, round 3: "pending round 3" and "not yet recorded
under `decisions/`" are no longer true. The direction is recorded in
`../../../decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`.
Round 3 ran and returned `REVISE`
(`docs/reviews/R-DOCTRINE-AMENDMENT-D7-3-RAW.md` line 4): one revise-level
finding (Q5 states its arms' consequences inconsistently) and five notes,
all open in `ROUND-3-DISPOSITIONS.md`. Under the stopping rule the package
is not repaired again and the bytes stay unconfirmed; it comes to you with
those findings open.)*
*(Marked 2026-10-14, cycle 3: "the package is not repaired again" and
"comes to you with those findings open" are no longer true. On the owner's
cycle-3 direction of 2026-10-14 for P-101, given in the lead session —
"One more cycle": "Make Q5 consistent: state that choosing a reading of
accepted text is a contract act matter (Unknown otherwise), and align §4/§6
and the ledger. Then one fresh review." [Observed: as relayed by the lead
session to this repair lane; not yet recorded under `decisions/`] — every
round-3 finding, notes included, was repaired once; the mapping is
`ROUND-3-DISPOSITIONS.md` §"Repairs, 2026-10-14 (cycle 3)".)* **Round-3
findings repaired once on 2026-10-14, unconfirmed pending round 4.** Q5 was
restructured and one owner question was added (Q6, section 8).
*(Marked 2026-10-15, round 4: "unconfirmed pending round 4" is no longer
true. Round 4 returned `REVISE`
(`docs/reviews/R-DOCTRINE-AMENDMENT-D7-4-RAW.md` line 4): one revise-level
finding (the one-position rule is applied to the narrow and wide readings
but not to the broadest) and four notes, all open in
`ROUND-4-DISPOSITIONS.md`. "Not yet recorded under `decisions/`" is no
longer true either: the cycle-3 direction is recorded in
`../../../decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`.
After round 4 the owner answered "Park until RFC2 decided": the packet is
parked, an RFC2-18/19 contract clarification fixing which reading binds is
commissioned, and D7 is redrafted against it. The bytes stay unconfirmed.)*

**Identifier.** `D7` is the next unused number in
`../../../decisions/DOCTRINE-AMENDMENT-LOG.md` as of 2026-10-03 [Observed:
the log holds D1, D5 and D6; D3 is the candidate bounded-mission packet in
the parent directory, `contracts/candidates/`, and D4 is the ruling
`../../../decisions/D4-RULING-DECISION.md`]. The number is provisional: if
another doctrine packet is adopted first and takes D7, this one takes the
next free number on adoption. The `D1`–`D8` labels in
`docs/plans/2026-10-03-smooth-example-roadmap.md` are that page's own
decision labels and are unrelated.

**Companions in this directory.** `SEMANTIC-DELTA.md` (the delta in the
template's form), `IMPACT-LEDGER.md` (the blast-radius sweeps with their
predicates and denominators), `REVIEW-BRIEF.md` (the round-1 brief, with
a Round 3 section added 2026-10-14), `ROUND-1-DISPOSITIONS.md` (each
round-1 finding and its repair), `ROUND-2-DISPOSITIONS.md` (each round-2
finding and its cycle-2 repair), `ROUND-3-DISPOSITIONS.md` (each round-3
finding and its cycle-3 repair). `REVIEW-BRIEF.md` also carries a Round 4
section, added 2026-10-14.

---

## 0. The question in one paragraph

The owner's north-star sentence says the rest of a project "will
(eventually) mold itself to fit around that goal" (`vision.md`, "What
changes for the owner"). Doctrine today gives that half no lawful
mechanism: "**Not autonomous.** The loop is human-triggered" (`vision.md`)
and "someone specs a desired shape, then deliberately triggers a
propagate/sync pass" (`architecture.md`) admit only a computation the
owner explicitly asked for, and the owner's P-69 ruling adds "No timer or
background poller on any arm". So every move that wants Syzygy to notice a
change on its own — re-observing after the owner merges, rehearsing a
regeneration, keeping a "what changed" band current — has to argue the
boundary again inside its own slice [Observed: pursuit findings L11-F1 and
L11-F8, `docs/pursuits/2026-09-22-vision-pursuit-data.json`]. This packet
offers to name the boundary once, at the smallest width the pursuit could
find: a closed class of **held derived computation** that may run on a
human act that did not ask for it, and may never run on a clock or watcher
Syzygy owns.

**What it does and does not do on its own, stated up front.** D7 relaxes
no contract, and accepted contract RFC2 confines one kind of evaluation to
a deliberately triggered pass: the one that captures a merge fact (section
4). How far that reaches depends on how "merge fact" is read, and the
contract supports two readings (section 4.1):

- **Narrow:** the confinement sits under RFC2-18, whose scope is "Every
  materialized work item that reaches merge", so it reaches an evaluation
  that captures the merge of a materialized work item in the
  reconciliation chain.
- **Wide:** "merge fact" covers any merge a repository snapshot carries.

Section 4.1 also weighs a third, broadest reading a reader can build from
accepted RFC4's citations of RFC2-19, on which no unprompted
re-observation is lawful at all; this packet weighs it as unlikely
[Inferred], and shows it beside the other two.

**Choosing among them is a contract-act matter, and this packet chooses
none.** Which reading of accepted RFC2-18/RFC2-19 text binds is fixed
only by a contract act; until one fixes it, the reading is **[Unknown]**
(the owner's cycle-3 direction of 2026-10-14, quoted in the status note
above). That holds for every reading alike: a doctrine amendment, this
packet or a plain owner answer to Q5 fixes none of them. So arm A's reach
today is:

- **a repository whose history carries no merge at all:** unprompted
  re-observation is lawful at the doctrine level on a qualifying trigger,
  inside every other limit of section 2, on the narrow and wide readings
  ([Unknown] only if the broadest reading is a live one);
- **a repository with merges but no materialized merged work:** whether
  arm A makes it lawful is **[Unknown]** until a contract act fixes the
  reading (lawful on the narrow reading, unlawful on the wide). The
  pursuit's headline example — re-observing after the owner merges in a
  repository Syzygy dispatched no work into — sits in this row, so whether
  D7 alone lets it run is **[Unknown]** [whether a given repository
  carries merges or materialized merged work is a fact of its snapshot,
  which this packet does not establish for any repository: Unknown];
- **a repository with materialized merged work:** an unprompted evaluation
  that captures that merge stays unlawful, on every reading.

Implementation authority for any daemon behaviour stays separate on every
row (section 6). The owner's choice is Q5 (section 8): leave the reading to
a contract act, commission one, or narrow D7's own text. *(Repaired
2026-10-14, cycle 3, round-3 finding 1: this paragraph previously said the
packet "relies on the narrow reading" and that "which reading should bind"
was the owner's Q5, which treated a Q5 answer as fixing the reading of
accepted contract text. Earlier still, round-2 finding 1: it read the wide
reading silently and said it reached "most" repositories.)*

**Departure from the pursuit's wording, disclosed.** N14 asked for "one
amendment to VIS-4 and the 'Not autonomous' clause". This packet leaves
every byte of VIS-4 unchanged and amends the "Not autonomous" bullet and
the loop paragraph instead. Reason: VIS-4 governs who adopts shape; the
question here is what a trigger is, and the two passages that define the
trigger are the bullet and the loop paragraph. The new text cites VIS-4's
bounds rather than editing them [Inferred: the drafter's judgment].

## 1. What it amends

Two insertions. No rule is renumbered, retired or reworded; VIS-1 through
VIS-7 and SEC-1 through SEC-5 keep every current byte. Both anchors were
read on 2026-10-03 at the hashes given.

**Order of rulings.** Section 1's text states a reason for its
classification ("delegates no decision, and is for that reason inside
VIS-4's stated bounds"), in the reason-stating style the owner designated
for D3 when ruling P-24 (`decisions/D4-RULING-DECISION.md`). It is lawful
text **only after** the owner rules Q1 "inside". On "beyond", the heading
sentence would be false doctrine and section 1 may not be applied (Q1).

### 1.1 `vision.md` — "What Syzygy is not", the "Not autonomous" bullet

**Anchor (exact current text, `.syzygy/governance/doctrine/vision.md`
lines 105–107 at sha256
`93cc5fbbfe8ba07643d097007500f772c7b4ba1f3d5a1ac792c6e4bf74f0506d`):**

> - **Not autonomous.** The loop is human-triggered; autonomy beyond VIS-4's
>   stated bounds is licensed only through the mechanism VIS-4 names, never by
>   reinterpretation.

**Insertion point:** after the last line of that bullet (line 107 at the
hash above), as three sub-bullets of it, before the blank line that
precedes `## Non-negotiable rules`.

**Text to insert, verbatim (these exact bytes; two-space indent, matching
the sub-bullets of "Not an enforcement engine — outward"):**

```markdown
  - **Held derived computation delegates no decision, and is for that reason
    inside VIS-4's stated bounds rather than an exception to them.** Without a
    fresh request, Syzygy may observe, compute the difference from its last
    identified evaluation, stage a draft, and hold the result — nothing more —
    when the trigger is a human act, or a hook a human installed by hand that
    fires only on a human act.
  - **A clock or watcher Syzygy owns is never a trigger:** no timer, schedule,
    poller, file or event watcher, or wake Syzygy sets for itself.
  - **Unprompted, Syzygy never notifies anyone, dispatches or reprioritizes
    work, adopts, or sets its own next trigger.** A held result waits until a
    human next looks. It is a new identified evaluation of observed state, or
    data rebuildable from its inputs (VIS-6), and never model output; staging
    commits nothing to any governed tree; and it opens no read, write, egress,
    or execution path that is not separately authorized (VIS-5, SEC-2, SEC-3).
```

### 1.2 `architecture.md` — "Snapshots and the loop", the loop paragraph

**Anchor (exact current text, `.syzygy/governance/doctrine/architecture.md`
lines 329–334 at sha256
`d1987f7f630b82eee359e14e89e6422ab74374a2578c218f73d47c80eefcb565`):**

> **The loop:** intent → observation → gaps → reviewed work → fleet execution →
> verification. It has one upward arrow: verification and runtime evidence may
> open spec-indictment gaps that route to the owner. The loop is
> **human-triggered**: someone specs a desired shape, then deliberately triggers
> a propagate/sync pass. Work-to-code and code-to-deployment belong to the
> orchestration toolchain, outside Syzygy's body.

**Insertion point:** at the end of that paragraph, after "outside Syzygy's
body." and before the blank line that precedes the Mermaid block. This is
deliberately **not** the point candidate D3 inserts at (§1.3).

**Resulting paragraph, exactly (these are the bytes to apply; ten lines:
the first five are the anchor's lines 329–333 unchanged, the sixth begins
with the anchor's line 334 and is extended, and lines 7–10 are added):**

```markdown
**The loop:** intent → observation → gaps → reviewed work → fleet execution →
verification. It has one upward arrow: verification and runtime evidence may
open spec-indictment gaps that route to the owner. The loop is
**human-triggered**: someone specs a desired shape, then deliberately triggers
a propagate/sync pass. Work-to-code and code-to-deployment belong to the
orchestration toolchain, outside Syzygy's body. Held derived computation —
observe, compute the difference, stage, hold — may run outside a deliberate
pass only on the trigger `vision.md` states under "Not autonomous"; it
dispatches no work, adopts nothing, and relaxes no contract that requires a
deliberately triggered pass.
```

### 1.3 Composition with candidate D3 (bounded mission)

Candidate D3 rev1 (`../DOCTRINE-AMENDMENT-BOUNDED-MISSION-D3.md`, not
adopted as of 2026-10-03) touches both passages [Observed, read
2026-10-03]:

- **`architecture.md`:** D3 inserts after "…triggers a propagate/sync
  pass." and before "Work-to-code…"; D7 extends the paragraph after
  "…outside Syzygy's body." Different bytes, so they compose in either
  order, but whichever lands second sees a changed paragraph and therefore
  a changed anchor.
- **`vision.md`:** the text an act 5 would carry is not D3 rev1's §1.2
  parenthetical but the reviewer's reason-stating wording in D3 §6, which
  the owner designated when ruling P-24 (`decisions/D4-RULING-DECISION.md`:
  "the reviewer's reason-stating §1.2 wording is designated as the text act
  5 would carry"). That wording rewrites the bullet into separate sentences;
  D7 appends sub-bullets after the bullet's last line. Different bytes
  again, but the same bullet: if D3 lands first, the bullet's text and line
  numbers change.
- **Rule for the second adoption:** D7's insertion points are defined by
  position — "after the last line of the 'Not autonomous' bullet" and "at
  the end of the loop paragraph" — not by line number. If either anchor's
  bytes have moved since the sha256 above, applying D7 is still a
  mechanical append at the same position, but the changed anchor is a
  changed review subject: re-anchor through a fresh review (rule 10), never
  by applying judgment at the keyboard.
- **Meaning:** D3 governs passes and missions of the loop, each a
  deliberate human act. D7's class runs outside a deliberate pass and
  relaxes no contract that requires one, so the two do not compete
  [Inferred]. D3's own anchors predate the D5/D6 restyles (it quotes
  `vision.md` lines 72–74 at an older digest); that is D3's re-anchoring
  question and is not changed here.

## 2. The trigger test, the permitted list and the prohibitions

Stated here for review; section 1 is the text that would bind, and every
row below is meant to say what section 1 says, no more and no less.

| Element | Lawful | Unlawful |
|---|---|---|
| **Trigger** | a human act the computation was not itself requested by (a human opening a page, a human recording a security act; a commit a human makes, but only as relayed by a qualifying hook, since Syzygy otherwise learns of a commit only at its next lawful look); a hook a human installed by hand that fires only on a human act | a timer, schedule, poller, or file or event watcher Syzygy sets; any wake Syzygy sets for itself; a hook that also fires on agent or machine acts (Q3) |
| **Effects** | observe; compute the difference from the last identified evaluation; stage a draft; hold the result | notify anyone — any message, alert or interrupting badge pushed to a human; dispatch or reprioritize work; adopt, approve, sign or label accepted; set its own next trigger |
| **Where the result lives** | a new identified evaluation of observed state (RFC2's evaluation rules), or derived data in Syzygy's own state that is rebuildable from its inputs (VIS-6), shown when a human next looks | model output in any form; any commit to `openspec/**` or `.syzygy/**` (a commit stays a separately authorized effect); any write outside the two roots (VIS-5); a fact living only inside Syzygy that is neither rebuildable nor an evaluation of observed state (VIS-6) |
| **Paths it opens** | none | any read beyond what consent and the acts in force already admit; any write; egress (SEC-2); execution of observed code (SEC-3) — each stays under its own authorization |
| **Contracts** | — | relaxes none: any computation an accepted contract confines to a deliberately triggered pass stays confined (RFC2, section 4) |

**What "unprompted" means here.** A computation is unprompted when the human
act that triggered it was not a request for that computation. Opening the
page is a request to see the page; under D7 Syzygy may, on that act, also
compute and hold — but only what no contract confines to a deliberate pass.
Today that excludes any evaluation that captures RFC2's merge fact: on the
narrow reading, the merge of a materialized work item; on the wide reading,
any merge a repository's history carries. Which reading binds is a
contract-act matter and [Unknown] until a contract act fixes it (section
4.1). Clicking a re-observe route is a request and was never in question.

**Showing that a trigger was human — a named residual.** The text requires
"the trigger is a human act". A page opened by an agent (this repository's
own headless-Chrome sweeps open `/polaris`) or by a scheduled client someone
else runs is not a human act, so the text forbids held computation on it;
an external loop that hits the page on a cadence is a poller by proxy,
which P-69 and the "clock or watcher" sub-bullet aim at. Nothing in this
packet says how a page-open trigger shows it was human, and the daemon as
it stands has no such test [Inferred]. This is the same problem Q3 settles
for hooks, but the page-open burden does not come from Q3: it comes from
section 1's "when the trigger is a human act", whichever way Q3 is
answered. Section 1 states a condition, not a burden of proof: whether a
given trigger was human is a question of fact and evidence. **This packet's
reading, which does not travel with the doctrine bytes:** an implementation
that cannot show its page-open trigger was human has not shown that the
condition holds, so it should treat held computation on that page open as
not shown lawful, and showing it is an implementation obligation, to be
supplied with the implementation authority (section 6 item 7) [Inferred].
The packet drafts no test. *(Added 2026-10-14, round-2 finding 3.
Repaired 2026-10-14, cycle 3, round-3 note 3: this paragraph previously
said the packet "leaves held computation on a page open unlawful until an
implementation authority supplies" a test, a legal effect section 1 does
not carry.)*

## 3. Non-expansion: each permitted effect against the ruling that already allows it narrowly

Each row names the nearest precedent and states plainly what D7 adds. D7
is **Normative** (`SEMANTIC-DELTA.md`): the precedents license each
*effect* when requested; D7 adds the *trigger*, and in two rows also a
persistence the precedent did not have. It adds no new effect.

| Permitted effect | Nearest narrow licence | What D7 adds |
|---|---|---|
| **Observe** on a human act that did not ask for it | **RFC5-11** (accepted contract, owner decision B4): "Recording a revocation **triggers a new identified evaluation** rather than waiting for the next human-triggered one" (`contracts/rfcs/RFC-0005/admission-and-boundary.md` lines 321–323). A human security act already triggers an evaluation nobody requested. | Any human act, or a qualifying hook, may trigger it — not only revocation — subject to RFC2 (section 4). |
| **Compute the difference** from the last identified evaluation | **P-79 Q6** (ruled A, 2026-09-21): "the delta is a claim of the current evaluation about two evaluations, carrying both identities, never a freshness value"; the retention direction of 2026-09-23 (`decisions/POLARIS-RETAINED-EVALUATIONS-RETENTION-POSTURE-DIRECTION.md`) lets the retained record exist. | The difference may be computed on the trigger above instead of on request. Its form is unchanged: a claim of a new evaluation, never a freshness value (RFC2-10). |
| **Stage a draft** | **P-71 Q3**, arm (b) (ruled A, 2026-09-21): "a pure drafter that writes no file"; the M4 funnel's arm text: "the drafter is pure and emits packet *data* on request, writing no file at all; an operator command renders it". VIS-4: agents "may draft them, never adopt them". | The pure drafter's output may be computed without the request **and held** until a human next looks. Arm (b) wrote no file at all; D7's staged draft persists in Syzygy's own state. That persistence is **wider than arm (b)** and rests on VIS-6's projection rule (next row), not on P-71. D7 still commits nothing to any governed tree, so it does not reach arm (a)'s narrow-act effect. |
| **Hold** the result in Syzygy's own state | **VIS-6**'s general rule: "Syzygy's databases and views are projections". P-79 Q4 (ruled A) is a precedent for *where* such state lives — "in the daemon's own state directory, never in an observed repository" — not a licence: what it licenses is the owner's own unpromoted note under VIS-6(a). | The footing is VIS-6's projection rule: a held result must be rebuildable from its inputs, or be an identified evaluation of observed state. D7 does **not** stretch VIS-6(a), which stays the owner's own presentation state, and holds no model output. |

**The prohibitions against current rulings.** Every prohibited effect is
already prohibited or gated today; D7 restates them so that the new trigger
cannot be read as licensing them: notification has no licence anywhere
[Observed: sweep in `IMPACT-LEDGER.md` §2]; dispatch is "human-triggered"
(`THREE-SURFACE-POC-MODE-DIRECTION.md` line 31, `v1.md` "Human-triggered
propagation at full breadth"); adoption is VIS-4; a clock or watcher
trigger is P-69's "No timer or background poller on any arm", the M2
funnel's Q4 arm (b) ("a timer, poll or file watcher inside the daemon",
unauthorized), and RFC4-16's "never an autonomous trigger"
(`contracts/rfcs/RFC-0004/named-adapters.md` lines 432–435).

## 4. Blast radius over P-69 and the other trigger rulings

Full sweeps, predicates and denominators: `IMPACT-LEDGER.md`. The rulings
and clauses that bear on the trigger, each with its outcome under D7:

| Ruling or clause | Text (quoted) | Under D7 |
|---|---|---|
| **P-69** (ruled B, 2026-09-21) | "No timer or background poller on any arm." M2 funnel Q4's ground: "No act found that authorizes a background poller … the 2026-09-02 authorization's 'any scope beyond the signed change' trigger is the hook" | **Unchanged, and now doctrine-backed.** D7's "a clock or watcher Syzygy owns is never a trigger" is P-69's rule stated generally. D7 does not make anything lawful under the 2026-09-02 act; that act's scope still governs new daemon behaviour. |
| **RFC2-19** (accepted contract) | "reconciliation evaluations run inside a deliberately triggered propagate/sync or observation pass, never autonomously on merge events" (`contracts/rfcs/RFC-0002/reconciliation-chain.md` lines 245–247) | **Stays stricter than D7 wherever it reaches, for every D7 trigger, not only the hook.** It binds "reconciliation evaluations" — RFC2-17's post-merge evaluation of a merged change against the intent revision that warranted it — so its reach is the next row's (section 4.1). Accepted RFC4 cites RFC2-19 as governing "ordinary human-triggered observation passes" (`named-adapters.md` lines 420 and 492), which a reader can take for a third, broader reading (section 4.1). |
| **RFC2 merge chain** (accepted contract, same module) | "**reconciliation-pending** attaches automatically and deterministically at the first evaluation that captures the merge fact (inside RFC2-19's deliberately triggered passes — never on a live merge event)" (`reconciliation-chain.md` lines 155–157) | **Binds every unprompted evaluation that captures the merge fact; what that covers depends on the reading (section 4.1).** By section 2's own definition an unprompted computation is not a deliberately triggered pass, so an unprompted evaluation that captures the merge fact contradicts this clause, whether its trigger is a page open or a hook, and D7's "relaxes no contract that requires a deliberately triggered pass" leaves it unlawful under arm A. **Narrow reading:** that is an evaluation capturing the merge of a materialized work item (RFC2-18's scope); an unprompted re-observation of a repository with no materialized merged work is not reached. **Wide reading:** any merge a repository snapshot carries, so unprompted re-observation of any repository with merges stays unlawful, the headline example included. **Which reading binds is a contract-act matter:** until a contract act fixes it, whether arm A makes unprompted re-observation of a repository with merges but no materialized merged work lawful is **[Unknown]**; a repository with no merge at all is lawful at the doctrine level on both readings (section 4.1 weighs a third, broadest reading built from RFC4, on which it is not). Fixing the reading, or making lawful what stays unlawful on either reading, needs a contract act (an RFC2 amendment, or another contract act whose form is not drafted here), **in addition to** D7; neither D7 nor a plain owner answer to Q5 does it (section 8, Q5). [Inferred: reading of the clauses; a contradiction surfaced, not reconciled.] *(Repaired 2026-10-14, cycle 3, round-3 finding 1: this cell previously labelled the narrow reading "relied on" and offered "an explicit owner ruling on these two clauses" as an alternative to an RFC2 amendment.)* |
| **RFC4-16** inter-pass interval (accepted contract) | "the loop stays human-triggered (architecture.md), so the contract binds the declaration and the honest rendering when the declared interval was exceeded, never an autonomous trigger" | Unchanged: D7 admits no clock trigger. |
| **RFC5-11** (accepted contract) | quoted in §3 | Unchanged; it is D7's precedent. |
| **P-71 Q3, P-71-Q5** (ruled A, 2026-09-21) | Q3 arm (b) quoted in §3; Q5 "the return path's write into Butlers is foreclosed by the 2026-09-02 act" | Unchanged. D7 writes nothing into any repository. |
| **P-79 Q4, Q6** (ruled A, 2026-09-21) | quoted in §3 | Unchanged. |
| **Bounded-mission interpretation act** (2026-08-31) | "The approval is the human-trigger required by the doctrine; bounded execution inside that approved envelope is not autonomous vision steering." | Unchanged and orthogonal: missions execute inside an approved envelope; D7 holds and executes nothing. |
| **"Autonomous behavior" exclusions in acts in force** (10 files; `IMPACT-LEDGER.md` §1b) | e.g. `PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md` lines 134–135: "No production release, broad remote access, multi-user support, or autonomous behavior." | Not falsified, but **narrowed in reach**: by naming a class that "delegates no decision", D7 would let a reader argue that held derived computation is not "autonomous behavior" under those exclusions. The guard is that each of those acts also confines new behaviour to its signed scope, so D7 by itself authorizes no implementation under any of them; any D7 behaviour still needs its own implementation authority. |
| **Trusted-bootstrap observation direction** | "This relaxation applies only to read-only repository observation. It does not relax or authorize: - writes to Butlers or any other observed repository; … - autonomous owner acts" | Unchanged. Installing a hook in an observed checkout is a write there; D7 does not authorize it (section 6). |

### 4.1 Readings of RFC2's merge-fact confinement

*(Added 2026-10-14, repairing round-2 finding 1.)* Every quotation below
was read at `origin/main` `09c7a61d`, where
`contracts/rfcs/RFC-0002/reconciliation-chain.md` still hashes to the
sha256 in `SEMANTIC-DELTA.md` and `snapshot-and-evaluation-core.md` hashes
to `7f573ba19df09b00db90954d41e49cb352b67f4433eb34b57be1a37bfe2b3526`.

The confining words are in a bullet of RFC2-18: "**reconciliation-pending**
attaches automatically and deterministically at the first evaluation that
captures the merge fact (inside RFC2-19's deliberately triggered passes —
never on a live merge event)" (`reconciliation-chain.md` lines 155–157).
RFC2 does not define "merge fact" separately [Observed: the phrase occurs
at lines 61, 146, 156, 158, 225, 274 and 334 of that module and line 101
of `snapshot-and-evaluation-core.md`, `grep -F "merge fact"` over the
RFC-0002 directory; none is a definition].

- **Narrow reading.** The clause's subject is the chain, and RFC2-18
  states its scope: "Every materialized work item that reaches merge enters
  a first-class chain on its durable identity" (`reconciliation-chain.md`
  lines 141–142), where "**merged** is execution state: the change reached
  the integration branch" (153). "The merge fact" (with the definite
  article) is that work item's merge. RFC2-17 reserves "reconciliation" for
  "the post-merge evaluation of whether a merged change satisfies the
  intent revision that warranted it" (122–124), and RFC2-19 binds
  "reconciliation evaluations" (245–247). On this reading the confinement
  reaches an evaluation that captures the merge of a materialized work
  item, not every repository whose history carries a merge commit.
- **Wide reading.** RFC2-18 computes chain state from "the merge facts
  carried by RFC2-1 items 1 and 3" (`reconciliation-chain.md` lines
  145–146), and RFC2-1 item 1 is "every observed repository (governance
  root and each consented observed-source repository) and its declared
  working-tree state" (`snapshot-and-evaluation-core.md` lines 78–79). A
  reader can take any merge such a snapshot carries as a merge fact, so
  that every evaluation of a repository with merges in its history
  captures one.
- **What accepted RFC4 says about RFC2-19, weighed.** RFC4 cites RFC2-19
  twice as governing ordinary observation passes: "Capture runs inside
  ordinary human-triggered observation passes (RFC2-19)"
  (`contracts/rfcs/RFC-0004/named-adapters.md` lines 420–421) and, in its
  list of RFC 0002 dependencies, "ordinary human-triggered observation
  passes (RFC2-19)" (line 492). RFC2-19's own words, "reconciliation
  evaluations run inside a deliberately triggered propagate/sync or
  observation pass", presuppose that observation passes are deliberately
  triggered. A reader can build a third, **broadest reading** from these
  lines: any held re-observation is an observation pass, and RFC2-19 places
  every observation pass inside deliberate triggering, so arm A's "observe"
  effect would reach no unprompted re-observation at all, whatever the
  repository's merges. Against it: RFC4 says "human-triggered", not
  "deliberately", and a qualifying page open is human-triggered; and
  RFC2-19's grammatical subject is "reconciliation evaluations", so its
  confinement binds those evaluations and does not, by its words, require
  every observation pass to be deliberate. This packet weighs RFC4's lines
  as describing passes rather than confining them [Inferred], but it is
  evidence on the reading question, and the broadest reading is shown
  beside the other two below. *(Added 2026-10-14, cycle 3, round-3 note
  2.)*

**Choosing a reading is a contract-act matter.** All three are readings of
accepted contract text. Which one binds is fixed only by a contract act —
an RFC2 amendment, or another contract act whose form this packet does not
draft — and until one fixes it, the reading is **[Unknown]** (the owner's
cycle-3 direction of 2026-10-14, status note at the head of this packet).
This applies to every reading alike: neither this packet, nor a doctrine
amendment, nor a plain owner answer to Q5 chooses the narrow reading any
more than the wide one. Whether an act in the shape of the owner's RFC7-20
reading act (`../../../decisions/DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md`,
an exact-bytes act binding a reading of one accepted clause) would serve
for RFC2-18/RFC2-19 is **[Unknown]** and is not drafted here. *(Repaired
2026-10-14, cycle 3, round-3 finding 1: this section previously labelled
the narrow reading "relied on by this packet" and asked the owner, in Q5,
which reading "should bind", as if a plain answer could fix it.)*

**What arm A permits, on each reading.** Arm A's text is the same on every
reading; only its reach differs.

| Repository | Narrow reading | Wide reading | Broadest reading (built from RFC4's citations) | Until a contract act fixes the reading |
|---|---|---|---|---|
| history carries no merge | unprompted re-observation, difference, staging and hold are lawful at the doctrine level on a qualifying trigger, inside every other section 2 limit | lawful, the same | unprompted re-observation unlawful | lawful at the doctrine level on the narrow and wide readings; **[Unknown]** only if the broadest reading, which this packet weighs against, is a live one |
| carries merges, but no materialized merged work in the chain | lawful, as above | unlawful | unlawful | **[Unknown]** |
| carries materialized merged work | an unprompted evaluation that captures that merge is unlawful | unlawful | unlawful | unlawful |
| any | implementation authority, consent and the acts in force still govern any daemon behaviour (section 6) | the same | the same | the same |

Whether the one repository the POC observes carries any merge, or any
materialized merged work, is **[Unknown]** here: this packet reads no
Butlers byte and no snapshot. So whether D7 alone lets the pursuit's
headline example run is [Unknown]: if that repository carries merges but
no materialized merged work, it sits in the second row, which only a
contract act fixing the narrow reading would make lawful. The narrow
reading is still the widest reach arm A could have, so an owner who adopts
arm A should rule Q1 with that ceiling in view (section 7). Q5 (section 8)
asks how the reading is to be fixed, not which reading binds.

## 5. Entry criteria for the live fleet observability mandate

`vision.md` ("Eventual mandate: live fleet observability") binds every
roadmap to carry the mandate "with stated entry criteria", and `v1.md`'s
deferral row (line 103; the pursuit's citation `v1.md:82` predates the D6
restyle) says the mandate "keeps it named and sequenced, with entry
criteria, on every roadmap" without naming one [Observed, 2026-10-03].
Because the doctrine places the criteria **on the roadmap**, this packet
does not propose doctrine text for them; it offers them for the owner to
place on a roadmap (Q4). They hold whichever arm the owner takes.

| # | Entry criterion | Why it gates | Test |
|---|---|---|---|
| E1 | A re-observation verb exists: a human can obtain a new identified evaluation without restarting the daemon | Live views annotate observed truth; a truth that only refreshes on restart cannot be annotated live (L11-F1) | a human-triggered route yields a new evaluation identity and names the one it supersedes |
| E2 | The evaluation identity separates observed-project movement from observer movement | A live viewer must tell "the project moved" from "Syzygy moved" (L4-F2) | the two staleness limbs render as separate claims |
| E3 | *Withdrawn in the round-1 repair.* It read "the trigger boundary is on record". A human opening a live view requests what it shows, so watching fleets live needs no unprompted computation and no ruling on this packet. | — | — |
| E4 | Streamed process output can be captured as a durable, identified artifact | The mandate's own evidence rule: streamed output "is Observed only once captured as a durable, identified artifact" | a captured stream has an identity and digest, and is cited by one claim |
| E5 | No live view contributes to a status claim | The mandate's rule: "live views never contribute to status claims" | a parity or mutation check fails when a live-only value reaches a claim |
| E6 | At least one project's shape is observed with Observed claims at a named evaluation | v1.md's stated reason for waiting: "Meaningless without the observed truth it would annotate" | a retained evaluation record names the project, the evaluation and its Observed count |

E3 keeps its number so that no criterion is renumbered. Sequencing (where
on the roadmap) stays the owner's; the criteria above do not order
themselves.

## 6. What adoption would **not** make lawful

Each item below stays outside D7 and needs its own owner step. Nothing here
is run, installed or written by this packet.

1. **Any unprompted evaluation that captures RFC2's merge fact** — RFC2
   (section 4). On the narrow reading (section 4.1) that is an evaluation
   capturing the merge of a materialized work item; on the wide reading it
   is unprompted re-observation of any repository whose history carries a
   merge. Which reading binds is a contract-act matter and **[Unknown]**
   until a contract act fixes it. Fixing the reading, or making lawful
   what stays unlawful on the reading fixed, needs a contract act (an RFC2
   amendment, or another contract act whose form is not drafted here); a
   plain owner answer to Q5 does neither. **What adoption does make lawful
   here, whatever the reading:** unprompted re-observation of a repository
   whose history carries no merge at all, at the doctrine level only
   ([Unknown] only on section 4.1's broadest reading, which this packet
   weighs against). For a repository with merges but no materialized
   merged work, lawfulness stays **[Unknown]** until a contract act fixes
   the reading. On every row the daemon behaviour still needs its own
   implementation authority. *(Repaired 2026-10-14, cycle 3, round-3
   finding 1: this item previously offered "an owner ruling on those
   clauses" as an alternative to an RFC2 amendment, and stated what
   adoption makes lawful "on the narrow reading" this packet relied on.)*
2. **The Butlers-side push trigger (for N2, `syzygy-u05.2`).** A hook in the
   owner's Butlers checkout that calls a loopback re-observe route. Owner
   option only. Before it could run, all of these would be needed, in
   addition to D7:
   - an owner act naming the write, because installing a file under the
     checkout's hooks directory is a write to an observed repository, which
     the trusted-bootstrap observation direction does not authorize and
     P-71-Q5 treats as foreclosed by the 2026-09-02 act;
   - item 1's contract act, wherever item 1 reaches the re-observation the
     hook asks for (on the wide reading, always; until a contract act fixes
     the reading, whether it reaches a given repository with merges is
     [Unknown]);
   - an owner ruling that publishing the hook's text is a VIS-5 *proposal*
     artifact rather than materialized implementation code (pursuit move
     L4-M4 names this as a stretch of VIS-5);
   - a SEC-1 machine-client credential for the call, held under SEC-5 (no
     secret in the hook text or the observed repository);
   - a showing that the hook fires **only on a human act** (Q3): git hooks
     in a checkout are shared by every worktree of that repository, so a
     hook in a checkout agents also commit to fires on agent acts and fails
     D7's test.
   The cheaper answer the pursuit itself recorded stays available with no
   amendment: the human-triggered re-observe route N2 already designs.
3. **A regeneration rehearsal** (re-run generation against the current
   corpus, compute the difference from the last adopted output, hold).
   Packet obligation only, for the feature-request funnel after adoption:
   - generation through a model provider is egress; D7 opens none, so the
     rehearsal's provider step stays under SEC-2 and the generator act in
     force, and runs only when that act's consent covers it;
   - D7's held result may never be model output, so a generated draft may
     not be held as Syzygy-only state at all: it must be committed out by a
     separately authorized effect, or only its deterministic parts (input
     corpus digest, difference from the adopted output's inputs) may be
     held;
   - the variant in pursuit move L10-M6 (a fixed question set scored
     against the extracted shape, no provider call) has no egress and fits
     D7 as written once its question set is owner-authored (VIS-4), subject
     to item 1 if it re-observes.
4. **Any timer, poller, watcher or scheduled cadence** — P-69 and D7 both
   forbid it.
5. **Any notification** — forbidden by D7; a future notifying surface needs
   its own doctrine amendment.
6. **Autonomous spec adoption** — VIS-4's mechanism, untouched.
7. **Held computation on a page open that is not shown to be human**
   (section 2, "Showing that a trigger was human"). The text admits only a
   human act; an agent's or a scheduled client's page open is not one.
   Section 1 states that condition and no burden of proof; that an
   implementation must show the condition holds before relying on it is
   this packet's reading, an implementation obligation to be supplied with
   the implementation authority, and does not travel with the doctrine
   bytes [Inferred]. It holds whichever way Q3 is answered. This packet
   drafts no test. *(Added 2026-10-14, round-2 finding 3. Repaired
   2026-10-14, cycle 3, round-3 note 3: the obligation is now labelled as
   the packet's reading, not as a legal effect of section 1.)*

## 7. Why this is not self-licensing under VIS-4 (the D4 question)

VIS-4's two-part mechanism (an accepted adjudication RFC plus the owner's
doctrine amendment) governs "autonomy beyond VIS-4's stated bounds". D3's
packet reads that phrase as delegation of an always-human decision class
(`../DOCTRINE-AMENDMENT-BOUNDED-MISSION-D3.md` lines 37–39), and the owner
ruled on that reading for bounded missions only, finding them inside the
bounds (P-24, `decisions/D4-RULING-DECISION.md`). Held derived computation
delegates no decision: it adopts, approves, dispatches and notifies
nothing, and every result waits for a human.

**The weight this puts on "not autonomous".** `vision.md`'s section intro
(lines 86–87, "…and not autonomous.") stays true after arm A only on this
section's classification (`IMPACT-LEDGER.md` §3). If a contract act ever
fixes the narrow RFC2 reading (section 4.1), D7 licenses more unprompted
computation than the round-1 text described — unprompted re-observation
of any repository with no materialized merged work — so that intro, and
the Q1 "inside" ruling it rests on, carry correspondingly more weight. Q1
should be ruled with that ceiling in view, since a Q1 ruling cannot know
which reading a later contract act will fix. *(Added 2026-10-14, round-2
finding 7. Repaired 2026-10-14, cycle 3, round-3 finding 1: this paragraph
previously spoke of the narrow reading "the packet relies on".)*

**This packet's position, which the owner may overrule (Q1):** D7 is a
**Normative** change — it adds a trigger the current text does not admit —
and the class it adds delegates no decision, so it sits **inside** VIS-4's
stated bounds. "Inside the bounds" answers only whether VIS-4's
autonomy-beyond-bounds mechanism is needed; it does not make the change
Clarifying. So a doctrine amendment alone (this packet, an owner act)
suffices, and section 1's text says why in its own words.

**If the owner rules "beyond":** VIS-4's own terms apply — such autonomy
"is licensed only through the mechanism VIS-4 names, never by
reinterpretation". Arm A then needs an accepted adjudication RFC first and
its text must be redrafted, because the heading sentence would be false.
Arm B is unavailable outright, since it is an interpretation and not the
named mechanism. Whether any adjudication RFC could serve: VIS-4 defines
that RFC for the spec-adoption gate ("what makes adversarial judgment
independent, how the ambiguity determination is recorded, and how each
adopted change stays individually revertable"), so whether such an RFC can
answer a trigger question at all is itself **[Unknown]** and would be the
first thing to rule.

## 8. The owner's questions

Six questions, to be answered in the order Q1, Q5, Q2, Q3, Q4, Q6. Q5
was added by the cycle-2 repair and restructured by the cycle-3 repair,
and Q6 was added by the cycle-3 repair; each is numbered after the others
so that earlier questions keep their numbers. Q5 is answered second
because it states how far arm A could reach, and Q6 last because it
arises only if arm A is applied. "Recommended" is this packet's view and
binds nothing. *(Repaired 2026-10-14, cycle 3: this paragraph previously
said five questions, and that Q5 "fixes what arm A would license", which a
plain answer to Q5 cannot do; see Q5.)*

**Q1 — Inside or beyond VIS-4's stated bounds?** *Recommended:* inside
(section 7). "Inside" makes arms A, B and C all available. "Beyond" leaves
arm A only after an accepted adjudication RFC and a redraft, removes arm B,
and leaves arm C.

**Q2 — Which arm?**

- **A — Adopt D7 as drafted** (both insertions, section 1), after Q1
  "inside". *Recommended:* the pursuit's point is that the boundary should
  be stated once, in doctrine, where every later slice can cite it; and the
  change is Normative, which is what an amendment is for.
- **B — Rule by interpretation, no doctrine byte.** A dated owner act in the
  shape of `decisions/BOUNDED-MISSION-DOCTRINE-INTERPRETATION-ACT.md`
  (2026-08-31), recording that existing doctrine already admits the section
  2 class. **Choosing B is the owner ruling the change Clarifying, contrary
  to this packet's classification**: an interpretation records what the
  text already means, and the packet's position is that today's text does
  not admit the class. If the packet is right, B misrecords existing
  meaning: it records a Normative change as if it were Clarifying. (The
  bullet's bar on "reinterpretation" reaches only autonomy beyond VIS-4's
  stated bounds; B is available only after a Q1 "inside" ruling, so that
  bar is not what B offends — repaired 2026-10-14, round-2 finding 6.) B is
  offered because the classification is the owner's to make, not the
  drafter's, and the owner has taken the interpretation route before; this
  packet recommends against it. Cheaper and reversible; leaves `vision.md`
  silent, so a reader of the doctrine alone cannot find the boundary.
- **C — No change (decline).** Lawful, and nothing breaks today.
  Consequences, stated plainly: every unprompted computation stays
  unlawful; re-observation stays a request (N2's route, which needs no
  amendment); the hook trigger stays unavailable on every path; the
  regeneration rehearsal runs only on request; each later cadence slice
  keeps arguing the boundary in its own packet; the molding half of the
  north star keeps no named mechanism. The entry criteria (Q4) do not
  depend on this packet and can still be placed on a roadmap.

**Q3 — How strict is the hook test?**

- **Strict** (as drafted): the hook must fire only on a human act.
  *Recommended:* it is what the pursuit asked for and the only reading that
  keeps "human act" true of every trigger. On this arm an implementation
  must show that a hook fires only on human acts, and this packet drafts
  no test for that.
- *Not an arm — page opens, on either arm:* the page-open condition does
  not depend on Q3. It comes from section 1's "when the trigger is a human
  act", whichever way Q3 is answered, and the obligation to show it is
  this packet's reading, not a legal effect of section 1 (section 2,
  "Showing that a trigger was human"; section 6 item 7). *(Repaired 2026-10-14,
  cycle 3, round-3 note 3: the strict arm previously tied the page-open
  burden to itself, "for a hook and for a page open alike".)*
- **Installation authorizes:** a hand-installed hook is a sufficient human
  act whatever event fires it. Wider; would let agent commits trigger held
  computation in a shared checkout. Choosing it changes "fires only on a
  human act" to "fires on events in a checkout the human chose", and the
  text would need a redraft and a fresh review.

**Q4 — Where do the entry criteria live?** *Recommended:* on the roadmap,
as section 5 offers them, because doctrine says each roadmap carries them.
The alternative is a sentence in `v1.md`'s deferral row naming them, which
would be a second doctrine edit and is not drafted here.

**Q5 — How is the reading of RFC2's merge-fact confinement to be fixed?**
(Section 4.1; added 2026-10-14, round-2 finding 1; restructured 2026-10-14,
cycle 3, round-3 finding 1.) D7's text "relaxes no contract", so the
reading of accepted RFC2-18/RFC2-19 decides how much unprompted
re-observation arm A makes lawful. **Choosing a reading of accepted text is
a contract-act matter, [Unknown] until a contract act fixes it** (the
owner's cycle-3 direction, status note at the head). That applies to the
narrow reading exactly as to the wide one, so the round-2 arms "N, adopt
against the narrow reading" and "W, adopt against the wide reading"
**collapse**: neither is something a plain answer to Q5 can do. What the
owner can decide here is only whether to leave the reading to a contract
act, commission one, or take the question out of D7's reach:

- **U — Leave the reading to a contract act; fix none here.**
  *Recommended.* Consequence: arm A, if adopted, makes unprompted
  re-observation of a repository whose history carries no merge lawful at
  the doctrine level; for a repository with merges but no materialized
  merged work, lawfulness stays **[Unknown]**, so no implementation
  authority could rest on it being lawful [Inferred]; for a repository
  with materialized merged work it stays unlawful (section 4.1's table).
  Whether the pursuit's headline example may run stays [Unknown]. Further
  step: none for D7 itself; deciding the middle row needs a contract act,
  which nothing here drafts. Reason for recommending it: it states the
  Unknown instead of resolving it by a ruling the owner has said is a
  contract-act matter, and it leaves D7's text unchanged.
- **K — Commission a contract act fixing the reading.** The owner names
  which reading the act should carry (narrow, wide or broadest); the act
  itself — an RFC2 amendment, or another contract act whose form is
  **[Unknown]** and not drafted here — is drafted, reviewed and performed
  separately, and only on its performance does the reading bind. May be
  taken together with U, and is not a substitute for it: until that act is
  performed, U's consequences hold. Consequence: a separate drafting and
  review cycle and an owner act; nothing in D7 changes.
- **Narrow D7 instead:** add to D7's own text a bar on unprompted
  re-observation of a repository whose history carries any merge. The
  question then never decides D7's reach, because D7 itself forbids the
  middle row, and no contract act is needed for D7. Consequence: section
  1's bytes change, which needs a redraft and a fresh review; arm A then
  reaches only repositories with no merge in their history.

*(The round-2 arms, kept for the record: "N — the narrow reading …
Recommended … No further step" and "W — the wide reading … whether a plain
owner ruling suffices for that, or a contract act is needed, is
[Unknown]". Round 3 found the two inconsistent, finding 1.)*

On arm B the same question decides what the interpretation act would
admit, and the same contract-act matter applies; on arm C it does not
arise.

**Q6 — How is the Polaris understanding adoption recorder's gate resolved
if arm A is applied?** (Added 2026-10-14, cycle 3; the ledger's §4
correction.) Applying section 1.1 changes `vision.md`, which
`scripts/record_polaris_understanding_adoption.py` binds as a frozen input
of its confirmed C1 reconciliation review outside its history set, so its
`--check` fails, "review retired by changed input:
.syzygy/governance/doctrine/vision.md", and its `--selftest` fails,
"candidate input drift" on the same path [Observed: probe, `IMPACT-LEDGER.md`
§4]. This is a gate, not a regeneration. Arms:

- **Reconcile:** a fresh reconciliation review over the amended
  `vision.md`, recorded the way the recorder requires;
- **Move to history:** a reviewed recorder change moving `vision.md` into
  its history set, so that later doctrine edits stop retiring the review;
- **Decline arm A**, or apply nothing until one of the above is ready.

*Recommended:* none; the owner's call. Candidate D8's Q-A1
(`../doctrine-amendment-inferred-first-class-d8/OWNER-DECISION-PACKET.md`
§7) asks the same question for D8's `vision.md` insertion, so one answer
can serve both packets if both are adopted [Inferred]. Arms B and C do not
raise it.

## 9. How adoption would be recorded

Doctrine amendments carry no magic phrase (D3, D5 and D6 precedent). If the
owner rules Q1 "inside" and adopts arm A, in the owner's own words:

1. apply section 1's two insertions as the exact bytes shown, checking each
   anchor against the sha256 above first — if either file has moved, stop
   and re-anchor through a fresh review rather than applying by judgment;
2. add one row `D7` to `../../../decisions/DOCTRINE-AMENDMENT-LOG.md` with
   the owner's words and a link to this packet;
3. regenerate the derived indexes the ledger names (`IMPACT-LEDGER.md` §4)
   and run the canonical battery; nothing else is propagated. Step 1 waits
   for Q6's answer: the Polaris understanding adoption recorder's `--check`
   fails on any `vision.md` change, and that is resolved by a review or a
   reviewed recorder change, not by regeneration (added 2026-10-14, cycle
   3).

Arm B is recorded as its own decision file; arm C as one register row
closing P-101 with the decline. No arm edits this packet.
