# Owner direction — answers to the GP-B2 greenfield-parity follow-up packet

Date: 2026-10-28

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`, in the
same family as `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`
(GP-Q0), whose stop clause sent these seven questions to the owner.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs nothing, adopts nothing and edits no signed byte.

The stop clause, as GP-Q0 states it
(`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:95-96`): "Any change
not listed here to what a gate accepts or refuses stops and returns to the
owner." Below it is called **the stop clause**. Each answer here is now a
listed change for the work it describes, and for nothing wider.

## How the answers were given

[Observed by the coordinating session: the owner's selections in a Claude
Code session on 2026-10-28 at about 00:06 UTC, made with the session's
question tool. The session is not in this repository.]

The questions came from owner packet GP-B2, draft 3, sha256
`fef096a992e316d625bd7f9b15286d4a99fcb785f7e6720f7550401f33ed9316`. The
packet was a scratch file in the coordinating session and is not authority;
this record is self-contained. Each selection below is the option label
exactly as it was presented to the owner.

Draft 1 and draft 2 were each vetted by an independent subagent in fresh
context. Draft 3 applies the second vet's five exact texts (E1.9, E1.10,
E1.11, EW1 and N1) and nothing else; no packet vet names draft 3's digest
[Observed: `grep -l` for its first eight hex characters over the seven
packet-vet raws returns no file]. The record's own fidelity check, the last
row below, read draft 3 as its source and was not a vet of the packet. For Q2, Q3 and Q4 the packet also relied on
an earlier four-round vet, of 2026-10-27, over a predecessor packet that held
those three questions as items `syzygy-bpyt.1.15`, `.1.16` and `.1.17`. The
raw output of every round is retained verbatim in `docs/reviews/`:

| Raw | Covers | Verdict, in the raw's own words |
|---|---|---|
| `docs/reviews/V-GP-B2-1-RAW.md` | Vet of GP-B2 draft 1 | "Verdict: READY WITH EDITS" (`docs/reviews/V-GP-B2-1-RAW.md:2`); "Items: Q1 EDIT, Q2 EDIT, Q3 EDIT, Q4 EDIT, Q5 EDIT, Q6 PASS, Q7 EDIT, Q8 REMOVE" (`docs/reviews/V-GP-B2-1-RAW.md:4`) |
| `docs/reviews/V-GP-B2-2-RAW.md` | Vet of GP-B2 draft 2 | "Verdict: READY WITH EDITS" (`docs/reviews/V-GP-B2-2-RAW.md:2`); "Items: Q1 EDIT, Q2 PASS, Q3 PASS, Q4 PASS, Q5 PASS, Q6 PASS, Q7 PASS" (`docs/reviews/V-GP-B2-2-RAW.md:4`) |
| `docs/reviews/V-GP-B2-2-ADDENDUM-RAW.md` | The same vet, over the drafter's diff and named deviations in draft 2 | "Verdict: READY WITH EDITS" (`docs/reviews/V-GP-B2-2-ADDENDUM-RAW.md:2`), unchanged from the vet it adds to |
| `docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md` | Round 1 over the predecessor packet | `.1.15` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:36`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:45`); `.1.16` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:195`), "Recommendation verdict: Reject" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:201`); `.1.17` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:318`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:328`) |
| `docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md` | Round 2 | `.1.15` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:19`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:23`); `.1.16` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:129`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:138`); `.1.17` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:228`), "Recommendation verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:243`) |
| `docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md` | Round 3 | `.1.15` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:35`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:45`); `.1.16` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:136`), "Recommendation verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:147`); `.1.17` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:180`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:190`) |
| `docs/reviews/VET-GP-FOLLOWUPS-4-RAW.md` | Round 4, the applied corrections only | "1.15. Scope: Pass. Recommendation: Pass." (`docs/reviews/VET-GP-FOLLOWUPS-4-RAW.md:52`), the same for `.1.16` and `.1.17` (`:53`, `:54`); "All three items pass both verdicts, so under the stopping rule they go to the owner." (`docs/reviews/VET-GP-FOLLOWUPS-4-RAW.md:56`) |
| `docs/reviews/V-GP-B2-RECORD-1-RAW.md` | This record's own fidelity check, over its first version at PR #552 commit `4dbe653e`, against the packet, the selections and the raws above; its edits E1 to E5 and notes N1 to N3 are applied here, N4 and N5 left as notes | "Verdict: FAITHFUL WITH EDITS" (`docs/reviews/V-GP-B2-RECORD-1-RAW.md:2`) |

Each raw was copied byte for byte from the vetting session's scratch file;
only the name gained `-RAW`. The source and the copy hash the same
[Observed: `sha256sum` over both, this session]:

| Raw | sha256 (source and copy) |
|---|---|
| `V-GP-B2-1-RAW.md` | `2d71d4821a98c2ec34c3e2b6ec75404aa3d76e3e503897d4fc030ed0b3441490` |
| `V-GP-B2-2-RAW.md` | `8e15819a3b797c3e84f3d2cc4878256a0eed813b4145c5443ad7467981f4eb59` |
| `V-GP-B2-2-ADDENDUM-RAW.md` | `27f13953ec0bb90098ae7c7faebfc8cd75fe0447ed49412d0a2610455934ccb1` |
| `VET-GP-FOLLOWUPS-1-RAW.md` | `bb29a17ba85049e2bf445f3d111036a3a6b21355c4ae1e0883a29972f3c2b189` |
| `VET-GP-FOLLOWUPS-2-RAW.md` | `91a9683c0b45d3aa45694ab2445867e0ce3c085324a98c3e7571796050849203` |
| `VET-GP-FOLLOWUPS-3-RAW.md` | `35f629a568e5dab5fa4e239c37ce4055a9d8d71e5f9a0eafb920b99dc0b68d41` |
| `VET-GP-FOLLOWUPS-4-RAW.md` | `9f22d77ff53353940789c14e6f57b240925db6f5c7722fe7ddd14f5c6935312f` |
| `V-GP-B2-RECORD-1-RAW.md` | `80d1464c5f634cda00d63146126025d188e764e076b07871f93e0c63589d4747` |

Every answer was the recommended option. Line numbers below are at `main`
`95c87a52` unless a pull request is named.

## The review every answer carries

Each answer below is carried out by its own pull request. Each pull request
states its CC-REV-1 classes and gets an independent CC-REV-1 review from a
fresh-context reviewer, and, for classes 1, 3 and 4, GP-Q0's three further
checks (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:59-66`):
- an old-versus-new differential;
- a rule-6 mutant for each predicate;
- a non-blocking owner notice in the cycle report bead `syzygy-bpyt.10`.

The class named in each section is the floor; the reviewer may add a class
where the section says so.

## Q1 — a very long closed fence, or a very long list, crashes the reader

Bead: `syzygy-bpyt.1.18`. Selected: **"A: read it (Recommended)"**.

Two places hand a whole sequence to one JavaScript call at once: the
active-content mask pushes every line of a closed fence
(`packages/three-surface-poc-core/src/markdown-code-context.ts:91`; `:119` on
PR #544), and the project-shape extractor pushes every item of a source
(`packages/three-surface-poc-core/src/project-shape-extraction.ts:647`). Past
roughly 100,000 to 125,000 lines or items, depending on how deep the caller
is, the call overflows the stack and throws, so the outcome depends on stack
depth, an input that is not in the text. The owner
directs that such texts be read like any shorter text, at both sites.

What the agents will do: step 2 of `syzygy-bpyt.1.18`, as its own pull
request right after PR #544 merges. It holds:
- a loop in place of the one-call push at both sites;
- 200,000-line fence tests in LF, CRLF and CR, and a long-list test under the
  per-source read limit;
- a mutation per site that restores the old call and must make its test fail;
- the differential re-run at the pull request's head.

A text that crashes today gets the decision a shorter fence or list would
get; nothing new is refused. For a list that long, `/polaris` and
`/api/poc` then answer 503, each under its own existing ceiling, as
`/polaris` already does for 20,000 items, while the other pages serve. A
re-observation that meets such a list answers 200 and replaces the served
evaluation, so `/polaris` goes from 200 to 503, where today's crash answers
502 and keeps the prior evaluation served. Option A, as presented, named
both.

Review: CC-REV-1 class 4 (security); the reviewer may add class 3
(deterministic observation).

The other 31 argument-spread calls in shipped code are checked under
`syzygy-bpyt.54` for inputs that grow with an observed repository. Any fix
there that turns a crash into a decision is not covered by this answer and
comes back to the owner under the stop clause.

## Q1 follow-up — does PR #544 wait for the Q1 fix?

Selected: **"Land #544 first (Recommended)"**.

PR #544 (`syzygy-bpyt.16`, the owner's CRLF ruling) lands when its own review
clears, and the Q1 fix follows as its own pull request. The owner accepts
the window this opens: between the two merges, a very long closed fence in a
CRLF or CR file crashes on `main` as an LF one already does.

## Q2 — which fence and span rules the extractor and the two index readers use

Bead: `syzygy-bpyt.1.15` (fence departures G2 and G3). Selected:
**"C (Recommended)"**.

The project-shape extractor and the index-link reader can each hide part of
a file and report a partial set as complete (G2 and G3). The owner directs
that the extractor, the index-link reader and the root-index reader
recognize fences by the PWB-REQ-006 profile, and that the link reader alone
also recognize the profile's code spans. Each uses the profile's recognizer
(the code that finds where each fence and span starts and ends), never its
mask.

What the agents will do, under `syzygy-bpyt.55`, after PR #544 lands, in one
pull request:
- expose the profile's recognizer in
  `packages/three-surface-poc-core/src/markdown-code-context.ts` beside the
  mask, with a differential showing the mask, and the texts it excludes as
  malformed, byte for byte unchanged;
- move the three readers onto it (the extractor; the link reader,
  `stripFences` in `packages/three-surface-poc-core/src/project-shape-manifest.ts:175`;
  the root-index reader);
- flip the `GAP G2` and `GAP G3` rows in
  `apps/three-surface-poc/src/fence-rules.test.ts` (`:197`, `:230`);
- add a dated addendum beside
  `docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json`, never an
  edit of it;
- update the `AGENTS.md` fence bullet, and mark P-112's register row with
  this ruling;
- state the stray-backtick drop as a residual.

Extraction, the manifest and phase-A admissions change on the affected
shapes, and so which files phase B reads, always within the existing read
authority. P-112 is not performed at its current bytes.

Review: CC-REV-1 class 3 at least; the reviewer may add class 1, since phase
A's allowlist is a read gate.

**What the owner did not select.** The packet offered "C, and signal the
stray span". The owner chose the plain C. Under C, two stray single
backticks around a list of links make those links code, and they drop with
no signal; that drop is a named residual. Signalling it would need a new
failure reason, a specification amendment, which comes back to the owner as
its own packet under the stop clause.

**The reading C proceeds on.** C reads the mask clauses of PWB-REQ-006 and of
the secret-classification policy as limiting the mask, not the recognizer.
The packet asked the owner to say so if they read those clauses as also
forbidding a shared recognizer; the answer stated no such reading.

## Q3 — which packages the POC observer-input gate protects

Bead: `syzygy-bpyt.1.16`. Selected: **"B: all compiled (Recommended)"**.

The observer-input gate (`pocObserverInputsAreClean`,
`apps/three-surface-poc/src/git-observation.ts:176-195`) refuses to start or
re-observe on uncommitted changes under six folders, but `build:poc`
compiles eight projects, and two of them can write into another package's
built output unprotected. The owner directs that the gate protect every
project the daemon's start compiles or loads, with a derived test that keeps
the list right as the build changes.

What the agents will do, under `syzygy-bpyt.56`:
- add `packages/polaris-generation-core/` and
  `packages/polaris-generation-consent/` to the gate, and keep
  `packages/cap1-daemon/` while `build:poc` builds it;
- replace the list test with a derived equality test in
  `apps/three-surface-poc/src/git-observation.test.ts` (the projects of the
  build step the `poc` script runs, every project their tsconfig references
  reach, and the import closure);
- record both observed edits as mutation rows.

`build:poc`, the tsconfig references and the three root files stay as they
are. The gate refuses more and accepts nothing new. `syzygy-bpyt.28`
(dropping `cap1-daemon` from the build) stays its own question for the owner;
because the list must equal the derived set, answering it also moves the
list.

Review: CC-REV-1 class 3.

Residual: `npm run poc:restart` builds nothing, so a weakened build left in a
clean tree could be served on restart [Inferred; the restart was not run].
It is `syzygy-bpyt.57`. Any fix that makes a restart refuse comes back to the
owner under the stop clause before it is built.

## Q4 — local packages that are not `@syzygy/`-named

Bead: `syzygy-bpyt.1.17`, with note N5 of PR #545's first review. Selected:
**"A: precondition test (Recommended)"**.

The shared import resolver
(`packages/polaris-generation-core/src/workspace-reach.testkit.ts`) and the
no-egress bundle guard (check S10) read only `@syzygy/` names as local, so a
local package under any other name could leave either guard green on a tree
that breaks what it promises. The owner directs one precondition test that
refuses such a tree up front, leaving both reviewed guards exactly as
reviewed.

What the agents will do, under `syzygy-bpyt.58`: one test beside the testkit.
- Every workspace npm sees is `@syzygy/`-named.
- Every spec in `dependencies`, `devDependencies`, `peerDependencies` and
  `optionalDependencies`, and every string in `overrides`, is an exact
  `X.Y.Z` or a `^` or `~` range: no `file:`, `link:`, `workspace:`, `npm:`
  alias, path, tarball, git spec, URL or tag.
- Mutation rows for an unscoped workspace, a `file:` dependency, a bare
  directory dependency and a path in `overrides`, each of which must fail it.
- The testkit's two residual comments (`:72-78`) are updated to name the
  test, and PR #545's N5 residual line (or a follow-up, if #545 has landed)
  points at it.

This closes both of the testkit's named residuals, including the bare
directory dependency left open by `syzygy-bpyt.8.38`. The packet found
today's tree fits it (28 of 28 dependency entries).
It is narrower than the version vetted on 2026-10-27, which admitted the
resolver's local forms; one answer for both guards has to refuse them. A
package of any of these forms wanted later means changing this test, with its
own review.

Review: the change is test-only, but the guards it backs are the evidence for
two egress boundaries, so the pull request states CC-REV-1 class 4 (the
reviewer may drop it if no security evidence moves).

## Q5 — refusal messages that carry the JavaScript engine's wording

Bead: `syzygy-bpyt.50`. Selected: **"A: governed 3 (Recommended)"**.

When the dossier's screening policy cannot be compiled, the refusal quotes
the engine's own error text, so the same digest-bound policy bytes refuse
with different words on a different Node version. The owner directs that the
three governed sites take fixed words at their source, and that the other 44
product sites be pinned by a census test rather than changed.

What the agents will do, under `syzygy-bpyt.50`:
- `compileDetectors`
  (`packages/three-surface-poc-core/src/content-classification.ts:157`) names
  the failing detector by position and id and says which check failed, in
  fixed words, never the engine's; both refusal wrappers
  (`packages/polaris-dossier/src/screen.ts:107`,
  `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts:173`)
  keep their own words;
- fixed messages for a non-object detector and for an uncompilable pattern,
  tested through both wrappers, with a mutant per new check;
- a census test that lists the 47 product sites by class (3 governed, 21
  catch-all, 23 environment) and fails when an unlisted one appears.

The 21 catch-all and 23 environment texts do not change. For the
environment sites, the operating system's and git's words are often the
only clue to what failed.

**What the owner did not select.** The packet offered D, under which each
of the 21 catch-all handlers, among them the re-observe 502 page and the
HTTP 500 body, would name only its stage and the error's class. The owner
chose A, so a bug's own engine wording still reaches those pages.

Review: CC-REV-1 class 4 (the screening policy).

## Q6 — owner-act dates that are not on the calendar

Bead: `syzygy-bpyt.1.21`. Selected: **"A: refuse (Recommended)"**.

The body-read gate (PWB-REQ-005) and the walkthrough-judgment evaluator
(PWB-REQ-022) check an act's `Date:` and `Expires:` with `isIsoDate`
(`packages/three-surface-poc-core/src/act-fields.ts:39-41`), which accepts
2026-02-29, 02-30, 02-31 and 04-31 because the engine rolls them into the
next month. The owner directs that such dates be refused by read-back, as the
consent package reader already does
(`packages/polaris-generation-consent/src/package-reader.ts:112`). The packet
found no tracked act record with such a date.

What the agents will do, under `syzygy-bpyt.59`: the read-back check in
`isIsoDate`, refusing with today's reasons for an unreadable date
(`act-instant-malformed` or `expired`); tests for the seven dates the packet
measured (those four, and 2026-02-32, 2026-13-01 and 2026-00-10, which are
refused already); a differential over the act-record fixtures; and a mutant.

Review: CC-REV-1 class 1 (authority boundaries).

## Q7 — a line-separator character in a fence's first line

Bead: `syzygy-bpyt.1.19`, low priority. Selected:
**"A: follow profile (Recommended)"**.

The fence-opener pattern (`FENCE_OPENER`,
`packages/three-surface-poc-core/src/markdown-code-context.ts:60`; `:66` on
PR #544) ends with JavaScript's `.`, which does not match U+2028 or U+2029,
so such a first line is not read as a fence opener: one constructed shape is
admitted where the profile would exclude it, and another excluded where the
profile would admit it. The owner directs that the gate read these lines as
the profile does.

What the agents will do, under `syzygy-bpyt.60`, after PR #544 and in one
pull request beside the finding-position change of `syzygy-bpyt.1.20`: give
the pattern the `s` flag; pin the PR #544 reviewer's probe rows as tests;
re-run the mask differential (0 of 6,640 tracked Syzygy text files were
expected to change); and add a mutant.

Review: CC-REV-1 class 4.

## Also found — information, not owner questions

These change no decision any page, record, refusal string or exit code
shows, so they are behavior-preserving under GP-Q0
(`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`) and are
agent work. The owner was told of them and answered nothing about them.

| Item | Bead |
|---|---|
| The active-content gate's unsafe-link pattern (`UNSAFE_URL` in `packages/three-surface-poc-core/src/git-object-reader.ts`) slows faster than the square of a run of spaces after `=`; one Syzygy source took about 30 to 35 seconds in that pattern. A rewrite that matches exactly the same text, proven by a differential. The one consumer that reads elapsed time is a dossier run's declared deadline, which a stall can use up | `syzygy-bpyt.52` |
| Finding positions in bare-CR texts (the former Q8): after PR #544 a malformed-code finding counts CR, CRLF and LF as line ends while other findings count LF only, and no output shows a position. The mask's rule for every finding, beside Q7 (or alone if Q7 had not been answered A), with the pin test flipped, a mutant and an independent review | `syzygy-bpyt.1.20` |
| The other 31 argument-spread calls in shipped code, checked for inputs that grow with an observed repository (Q1 above; a fix that turns a crash into a decision comes back under the stop clause) | `syzygy-bpyt.54` |

## What this does not do

- It signs, adopts or accepts nothing (VIS-4).
- It amends no doctrine, contract, policy, registry or specification, and
  edits no digest-bound file. Where an answer would need one, the work
  stops and comes back to the owner first.
- It does not perform P-112 or answer `syzygy-bpyt.28`.
- It lifts no standing prohibition in `AGENTS.md`.
- It releases no deployment, release, provider call or egress.
- It approves no change to what a gate accepts or refuses beyond the work
  each section describes; anything further falls under the stop clause.

## Withdrawal

A later direction may narrow or withdraw this one; withdrawal defeats grant.
Withdrawal reaches only beads not yet merged.
