# The round estate — what eleven work rounds settled, and where it lives now

> **Navigation, never authority.** This page adopts nothing, accepts nothing
> and may not be cited as a rule. It routes a reader through
> `round-2026-08` … `round-2026-08k` — the tracked files that no index
> covered; "How many files are in here" below derives the count and
> reconciles the four different figures other pages quote. Where this page and an owning record disagree, **the owning record
> wins and this page is stale.** Current state is `PROJECT-STATUS.md`; what is
> accepted is `decisions/ACCEPTANCE-ACT-RECORD.md`.
>
> Written 2026-09-06. Before it, ten of the eleven round directories had no
> index of any kind — only `round-2026-08/` carried a `README.md` [Observed —
> `ls` over all eleven, 2026-09-06; `round-2026-08g/CAPABILITY-1-OWNER-DECISION-INDEX.md`
> indexes a decision set, not the directory]. A reader asking "what did round
> 08e settle, and does any of it still bind?" had to open 53 files. Later the
> same day all eleven directories gained a `README.md`; this page is the route
> across them, each round's own README the route within it.

## How to read a round

A round is one work pass with its own reviews and reports. **A round directory
is never authority and never on a default reading path.** Three facts about
them are easy to get wrong:

- **The directory's index date is its first-commit date and does not bound its
  contents.** `round-2026-08g` took two files seventeen days after it closed.
- **"Historical" never means "safe to relocate."** Two round files are live
  inputs to running software; both are named below.
- **96 Markdown round files carry no status word at their head.**
  - **The predicate:** none of *historical*, *superseded*, *candidate*,
    *never authority*, *non-authoritative* or *not authority* anywhere in
    their first fifteen lines, matched case-insensitively.
    - Those six literals and that window are the whole predicate; a sweep
      using a different window, or that word set minus its last two, gets a
      different number — dropping them gives 118.
  - **The denominator does not matter here,** which is why the headline no
    longer carries one: the figure is 96 over the 234 Markdown round work
    files, 96 over the 245 `.md` files under the eleven directories, and 96
    over the 235 that existed before the ten new READMEs, because every one
    of the eleven READMEs carries a status word [Observed — re-swept
    2026-09-06 at commit `9ca96c2` over all three populations].
  - Every round directory now has a `README.md` saying the round is closed,
    but those 96 file heads are unchanged. Read the `round-*` path itself as
    the banner.

**The 96 is not a to-do list, and it is mostly not actionable by anyone**
[Observed — swept 2026-09-06 under the predicate above, then each of the 22
non-review files hashed and its digest searched across all tracked
`.syzygy/**` and `openspec/**`]. Only 19 of the 96 are files a head-banner
act could lawfully reach.

- **74 of the 96** sit inside a round's `reviews/` subdirectory and are raw
  reviewer output, which CC-REV-6 stores unchanged — no owner authorization
  reaches them, because the rule that protects them is not about authority.
- **Two more are digest-bound:**
  - `round-2026-08/OWNER-ROUND-CHARTER.md`, whose digest its own round
    README and `round-2026-08/SEMANTIC-DELTAS-THIS-ROUND.md` both carry;
  - `round-2026-08g/SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md`, which in-force
    **CC-IMPACT-7** pins by path *and* digest for a blind exercise.
- **One more is byte-checked by CI:**
  `round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.md` is regenerated from its
  sibling JSON and compared, so a banner in it fails
  `.github/workflows/governance-docs.yml`.
- **That leaves 19** files that a head-banner act could lawfully reach, out
  of a figure reading 96.
  - Anyone weighing that act should weigh 19 edits against eleven directory
    READMEs that already exist — which is why `syzygy-3zi` closed on arm
    (a).

```mermaid
flowchart LR
    U["96 unbannered<br/>Markdown heads"] --> R["74 raw reviewer output<br/>under reviews/ — CC-REV-6"]
    U --> B["2 digest-bound"]
    U --> CI["1 byte-checked by CI"]
    U --> L["19 a head-banner act<br/>could lawfully reach"]
```

## The eleven rounds

The table names where each round's settlement lives now, and says
**Nowhere current** or **Still open** where that is the answer.

| Round | Span | Files | What it settled | Where that settlement lives now |
|---|---|---|---|---|
| `round-2026-08` | 08-05 → 08-07 | 26 | The first human-clarity refactor: the original five-act owner offering, the SD-1…12 semantic-delta classification, term migration | **Nowhere current.** Its acceptance record opens `SUPERSEDED`; acts 1 and 4 were retired. Its one durable export is this repository's process-lessons file, moved out to `decisions/PROCESS-LESSONS.md` |
| `round-2026-08b` | 08-05 → 08-10 | 28 | A repair pass over stale derived word-counts; CG-21 gained its "pass B" | The CG-21 logic is now native to `scripts/check_governance.py` — the script, not this directory, is the home. The round's own acceptance record is superseded twice over |
| `round-2026-08c` | 08-07 → 08-10 | 31 | The `depends_on` / `constrains` / `cites` contract-relation model, and twelve pre-specification criteria | **Still open as P-21.** The Wave A and B acts of 2026-08-17 ratified the relation's *presence*; sub-question (a) is unruled, and `decisions/PENDING-OWNER-DECISIONS.md` row P-21 cites this round's `CONTRACT-RELATION-CLOSURE-REPORT.md` as its evidence |
| `round-2026-08d` | 08-09 → 08-10 | 26 | The six-wave acceptance structure (A, B, C1, C2, D1, D2) that replaced one all-in-one act. Fifteen reviews — nine by dimension, six by wave — and **fifteen `REVISE` verdicts, zero `CONFIRM`** (`reviews/DELIVERY-AND-VERDICT-REGISTER.md`) | `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` and `wave-manifests/` — the wave partition is the live shape. Waves A and B are accepted; C1/C2/D1/D2 remain deferred and unauthorized |
| `round-2026-08e` | 08-10 → 08-13 | 53 | Waves A and B confirmed (`VERDICT: CONFIRM`) but withheld from offer by the P-33 ruling; the launch-gate instrument versioned v1.4 → v1.18 | The Wave A and B acts, performed 2026-08-17. The instrument's v1.x content is folded cumulatively into `launch-gate-pre-specifications.md` (now v2.4) — the versioned file, not the per-version raw reviews |
| `round-2026-08f` | 08-11 → 08-17 | 20 | Launch gate v2.0; the first Capability 1 owner decision packet; a dry-run administration fixture | **Carries a live CI input** (below). The decision packet was superseded 2026-08-13 by 08g's index; the P-33 analysis likewise |
| `round-2026-08g` | 08-13 → **08-30** | 20 | P-33 re-derived and ruled; CC-SPEC and CC-IMPACT repaired as one model | `decisions/WAVE-A-INSTALL-SHAPE-DECISION.md`, and the two craft policies in `policy-candidates/` that are **in force** despite their directory's name. **Carries a live fixture** (below) |
| `round-2026-08h` | 08-16 | 11 | A pure review round: eight raw reviews (RD-61…RD-68) over launch-gate v2.2, v2.3 and v2.4 and the P-41/P-42 owner packets, plus the v2.3 and v2.4 deltas | The two deltas fold into `launch-gate-pre-specifications.md`; **the round produced no artifact of its own that anything outside it now depends on** — its eight RAW reviews and disposition register stay here as the evidence behind that fold |
| `round-2026-08i` | 08-17 | 9 | The convergence pass: Wave A and B acts performed, CC-SPEC/CC-IMPACT consolidated and adversarially reviewed, craft acts 6 and 7 minted | Craft acts 6 and 7 — the in-force craft-policy acceptance. `SPEC-ACCEPTANCE-AND-IMPACT-SEMANTIC-DELTA-2.md` is the change record behind them |
| `round-2026-08j` | 08-18 | 6 | The repair pass after launch-gate Administration 1 returned `NOT READY`; three Unknown verdicts (B5, C2, D3) settled by dedicated measurement rather than prose | The three reports and their two sweep scripts are the settlements of record, tied together by `ADMINISTRATION-1-DISPOSITION-REGISTER.md` over `decisions/launch-gate/ADMINISTRATION-2026-08-18-CAPABILITY-1.json` |
| `round-2026-08k` | 08-20 → 08-21 | 8 | The Capability 1 specification adoption and implementation-authorization acts, prepared and bound; five fresh-context reviews | `decisions/CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md` and `decisions/CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md`, both in force. The two `*-PREPARED.md` files here are literally the packets those acts performed from |

## One finding that outlived the packet it was routed to

One round-08c finding — intra- versus inter-facet rollup — lost its route
when its packet was struck, and no record says it was answered.

Round `2026-08c` recorded its own sharpest unrepaired finding — facets permit
**intra**-facet rollup and forbid **inter**-facet rollup, with no stated
principle distinguishing them (B-4/B-6, `HUMAN-CLARITY-CLOSURE-REPORT.md:154`
over `reviews/RD-2-human-clarity-RAW.md:346`) — and routed it to owner
**packet 6**. Packet 6 was later struck as stale
(`round-2026-08d/OWNER-DECISION-PACKETS.md:21`, "Do not act from packet 6
below"), and no row in `decisions/PENDING-OWNER-DECISIONS.md` inherited the
question [Observed — 2026-09-06, `intra-facet` and `rollup` swept as literals
across `.syzygy/`, `openspec/`, `docs/` and the root pages; the only hits for
the finding are the two round files above].

The adopted Capability 1 specification now speaks to both halves:
**CAP1-REQ-030** defines each facet as a question plus its constituent facts,
and **CAP1-REQ-031** prohibits any composite over the answers. `[Inferred]`
that is the distinction the finding asked for — a facet's own aggregation is
definitional, a cross-facet one is derived — but neither clause states it as a
principle, and no record says B-6 was answered. Read the two clauses before
concluding either way; do not treat this paragraph as the disposition.

## The two round files that running software reads

Two round files are read by running software, so neither may be moved,
renamed or deleted without breaking something.

- **`round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.json`** — a live CI input.
  `.github/workflows/governance-docs.yml` invokes
  `validate_launch_administration.py` against it at line 127 and
  `render_launch_administration.py --check` against it at line 130, both by
  full path [Observed — read from the workflow, 2026-09-06].
- **`round-2026-08g/SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md`** and its
  answer key — named **by path and by SHA-256** inside CC-IMPACT-7, an
  in-force craft clause
  (`policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md`, the fenced
  block under the clause head).
  - **The trap:** fixture **3** exists in the same directory and supersedes
    fixture 2 on the merits — fixture 2 left `topology[]` unexercised — but
    the clause names fixture 2, and neither the clause nor the fixture may be
    edited to say otherwise.

**Beyond those two:**

- Rounds `h` through `k` are additionally cited as evidence by acts in force.
- Before treating any round file as inert, sweep for citers by filename
  across `git ls-files` — not by directory name, and not by the word
  "historical".

## How many files are in here

Four figures for this one population are in circulation, and all four are
right about different things; the table derives each, so no page has to
guess.

| Figure | What it counts |
|---|---|
| **249** | Every file ever added under a `round-*` path |
| **248** | Present on disk now. The one that left was the first round's own PROCESS-LESSONS.md — no code span, because a path that no longer resolves may not carry one (CG-1b) — moved out to [`decisions/PROCESS-LESSONS.md`](../../decisions/PROCESS-LESSONS.md) as the rounds' one durable export |
| **239** | Present before 2026-09-06, plus that departed file — the population `HISTORICAL-INDEX.md` swept with `git log --diff-filter=A` |
| **238** | Present before 2026-09-06: the 248 less the ten directory `README.md` files added that day (`round-2026-08/` already had one) |
| **235** | Of those 238, the Markdown ones. The three that are not: `round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.json` and `round-2026-08j/`'s two `sweep_*.py` |
| **237** | On disk now, less all eleven directory READMEs — the round *work*, which is what a citation sweep should measure |

[Observed — 2026-09-06: `git ls-files` for what is present, `git log
--diff-filter=A --name-only` for what was ever added, both over all eleven
directories; the two lists differ by exactly the one file named above.]

A figure quoted anywhere else is a copy and may have gone stale — including
the two in the next section, which were re-derived here today and were already
wrong by four when first published, for the reason that section gives.

## What no longer has a reader

The uncited figure below is a sweep result at a named commit, not a fact
about the estate; nothing here may be deleted or relocated by an agent.

**82 of the 237 round work files are named by no other non-round tracked
file** [Observed — re-swept 2026-09-06 at commit `2342724`: every non-README
round file's basename searched as a literal substring across the decoded bytes
of all 753 tracked non-round files; `git ls-files` is the denominator for both
populations]. By round: 08→9, 08b→8, 08c→13, 08d→8, 08e→18, 08f→8,
08g→5, 08h→4, 08i→2, 08j→4, 08k→3.

> **Superseded 2026-09-06; marked here the same day.** The paragraph above
> read "**84 of the 237 round work files are named by no other tracked
> file**", over "all 751 tracked non-round files", with `08e→19, 08f→9`.
> That was exact when it was published, and three commits later it was not.
> `round-2026-08e/reviews/RD-28-spec-authoring-RAW.md` gained citers at
> `decisions/launch-gate/README.md:25` and `AGENTS.md:385`, and
> `round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.md` gained them at
> `HISTORICAL-INDEX.md:30` and at line 49 of this page — all four written by
> the same pass that published the 84 [Observed — the uncited set recomputed
> over both trees with `git ls-tree -r`; the two sets differ by exactly those
> two files, in one direction].
>
> The paragraph below already warns that an index which names files changes
> the absence figure it reports. That warning is not sufficient, and this is
> the proof: measuring last only protects a figure until the *next* edit, and
> a page that goes on being written after its own sweep falsifies its own
> number. Re-derive this paragraph rather than reading it, and treat a
> quoted count of this population anywhere — including here — as a claim
> about a tree that has since moved.

*This figure read 88 of 238 when the page was first written, hours earlier.*
Four of those 88 have a citer now, and the citer is **this page**: writing the
round table named `round-2026-08c/HUMAN-CLARITY-CLOSURE-REPORT.md`,
`round-2026-08c/reviews/RD-2-human-clarity-RAW.md`,
`round-2026-08g/CAPABILITY-1-OWNER-DECISION-INDEX.md` and
`round-2026-08j/ADMINISTRATION-1-DISPOSITION-REGISTER.md`, and no other
tracked file names any of them. An index that names files changes the absence
figure it reports, so the sweep has to run *after* the prose is written, not
before — measure last, or the number is stale on publication.

**"No other tracked file" is a choice, and it is the strictest of three.**
Whether one round file may vouch for another changes the answer, so all three
predicates are stated here rather than left to the reader [Observed — swept
2026-09-06 at commit `2342724`, one tree, one matching primitive: literal
substring containment of the basename over each candidate citer decoded as
UTF-8, no word boundary]:

| Citers counted | Uncited |
|---|---|
| Non-round tracked files only — the figure above | **82** of 237 |
| … plus the eleven round `README.md` files | 75 of 237 |
| Every tracked file outside the target round's own directory | 63 of 237 |

The first is the honest one for "has this been carried forward", because the
other two let the estate vouch for itself: a round README naming its own
round's files is the index written to retire them, not evidence that anything
outside still reads them.

The third predicate was also swept independently, in a separate session,
against the tree as it stood before this page and the ten new READMEs existed.
It returned **67 of 237** — and re-running that predicate here over that same
tree reproduces 67 with a per-round split identical on all eleven rounds. The
four-file gap to today's 63 is entirely files that acquired a citer afterwards:
`RD-28-spec-authoring-RAW.md`, `RD-33-instrument-v15-RAW.md`,
`DRY-RUN-ADMINISTRATION.md` and `ADMINISTRATION-1-DISPOSITION-REGISTER.md`
[Observed — 2026-09-06; both sweeps recomputed over the two trees and compared
round by round]. Two implementations, written without sight of each other,
agree exactly once the tree is held fixed — which is the second method rule 2
asks for, and is the reason the figure above is stated as a sweep and not as a
fact about the estate.

Two cautions on that figure, in both directions:

- **It counts filename citation only,** so a file whose findings were
  absorbed into a successor's prose counts as uncited while its content lives
  on — which is what happened to most of 08e's nineteen, the
  per-instrument-version raw reviews that the closure reports summarise
  without ever naming.
- **It says nothing about whether a file *should* have a reader:** a raw
  reviewer file is stored verbatim precisely so that nobody has to cite it
  for it to remain evidence (CC-REV-6).

[Observed; marked 2026-11-05] **The packet pointer in the preserved paragraph
below is stale.** That packet held P-54…P-59 and P-66, ruled on 2026-09-07
in [`DOCUMENTATION-ESTATE-OWNER-RULINGS-DECISION.md`](../../decisions/DOCUMENTATION-ESTATE-OWNER-RULINGS-DECISION.md);
it never held the round-disposal question. GP-Q0 part 2 of the
[2026-10-21 owner answers](../../decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md)
keeps this estate in place and permits exclusion from agent routing only,
never from citer, reliance or digest sweeps. The superseded pointer remains
verbatim below as history:

**Nothing here may be deleted or relocated by an agent.** These files sit in
the governed plane; disposing of them is an owner decision, and the open
question is queued in `decisions/DOCUMENTATION-ESTATE-DECISION-PACKET.md`.

## Where the durable lessons went

Every round's transferable lesson lives in `decisions/PROCESS-LESSONS.md`;
open a round only to check what paid for a lesson.

Rounds discover rules; rules outlive rounds. Every round's transferable
lesson — the thing that changes how the *next* piece of work is done — belongs
in `decisions/PROCESS-LESSONS.md`, which now carries a section for every one
of the eleven — the first round's under `## Added at the round close`, since
that file *was* round `2026-08`'s lessons file before it was moved to its
durable home [Observed — 2026-09-06; the sections for 08d, 08e, 08f, 08j and
08k were written that day from the rounds' own registers, closing a gap of
113 files whose lessons had never been promoted anywhere]. `AGENTS.md` keeps the ten
compressed verification rules and points there for the incidents behind them.

If you are reading a round directory to learn a rule, you are in the wrong
file. Read the lesson; open the round only to check what paid for it.
