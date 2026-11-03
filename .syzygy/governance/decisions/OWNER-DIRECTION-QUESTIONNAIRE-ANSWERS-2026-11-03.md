# Owner direction — answers to the owner questionnaire of 2026-11-03

Date: 2026-11-03

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs nothing, adopts nothing, performs no consent and edits no signed
  byte.
- It starts no run, no body read and no provider egress. A run happens only
  when the owner starts or attends it.

Where an answer below needs a consent, a sign-off or a digest act, that act is
still performed later, through its own recorder, over its own reviewed bytes.

## How the answers were given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire over `origin/main` at `7268edcc` and the live Beads tracker on
2026-11-03, served it as a token-gated web form at a tailnet address, and ingested
the owner's submission.

- Submitted: 2026-11-03T04:50:49Z, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all eight items, each by picking one presented option,
  and answered the form's separate final question, whether to apply the
  answers now, with yes.
- The packet is a scratch file outside this repository and is not authority;
  this record is self-contained. After ingestion the packet's sha256 is
  `5b0dd71e0c012c808335a2440eecdba9823a966680b586dd22320c8628180d5b`. The
  bytes the owner read differ from it only in the owner-decision fields the
  ingest wrote; their own digest was not retained [Unknown].

Every item passed an independent adversarial review of its problem scope and
its recommendation before it was offered. The raw output of every round is
retained verbatim in `docs/reviews/`; each file is the reviewing subagent's
final message, byte for byte (sha256 of source and copy compared this session).

| Raw | Covers | Verdict lines |
|---|---|---|
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-03-1A-RAW.md` | Round 1, first five draft items | e.g. `next-focus` "Scope verdict: **Reject**." (`:13`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-03-1B-RAW.md` | Round 1, last six draft items | e.g. `exact-source-render-mode` "**Scope verdict: Revise.**" (`:68`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-03-2-RAW.md` | Round 2, fresh reviewer, nine revised items | e.g. `p98-details-target` "Scope verdict: Revise — the premise is contradicted by the repository's own tests." (`:50`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-03-3-RAW.md` | Round 3, same reviewer, eight items | five items pass both verdicts (`:16-17`, `:25-26`, `:50-51`, `:61-62`, `:69-70`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-03-4-RAW.md` | Round 4, the three corrected items | all pass both verdicts (`:4-5`, `:10-11`, `:16-17`) |
| `docs/reviews/V-OWNER-QUESTIONNAIRE-RECORD-1-RAW.md` | Fidelity check of this record against the packet and the submission | "Verdict: FAITHFUL WITH EDITS" (`:2`); its five edits are applied, and its notes 6, 7 and 11 too |

[Observed] The packet bytes each round read were not frozen, so no raw names a
packet digest (verification rule 10). Each raw is evidence of the round's
findings, not a confirmation of the bytes the owner later answered.

## The answers

Each item gives the decision as offered, the option the owner picked in the
words presented, and the scope that answer records.

### 1. `second-project` — answer A

Decision: which form of the psf/requests observation consent agents bring to
the owner to perform.

Picked: "A. Offer the cleared `v2.34.2` consent now (after the peeled-commit
check); a later consent version adds a revision for regeneration".

Scope: agents re-verify the `v2.34.2` peeled commit and offer the round-7
cleared requests observation consent
(`contracts/candidates/public-repo-admission/instances/requests/OBSERVATION-CONSENT.md`)
for the owner's act, with a drafted and reviewed Anthropic agent-provider
statement; a revision-adding consent successor is prepared later. Excluded: no
consent or statement is performed by this record; no clone, body read or run;
no run route is chosen (it is asked once the consent is in force).

### 2. `redis-next-step` — answer C

Decision: the next step for Redis, now that screening scope v4 leaves most of
the spans withheld in the 2026-10-14 run still withheld.

Picked: "C. Hold Redis runs until requests has run; agents may draft B
meanwhile". Option B was "Commission a screening-policy `governance-text` rule
for root `SECURITY`/`MANIFESTO`, then rerun".

Scope: no Redis run is offered or started until a requests run has happened;
agents may draft a candidate screening-policy package for option B, which
binds nothing until its own act. Excluded: no run, no change to screening,
consent or provider statements.

Owner revision, same day: after the submission, the owner wrote in the lead
session, verbatim: "Witholding redis till requests runs isn't a strict rule,
actually I would slightly prefer to finish redis before we look at requests".
So the hold above is lifted, and the order is reversed as a preference, not a
rule: Redis work toward a run that reaches fidelity-review ready comes first,
and the requests work under item 1 follows it. The candidate rule draft for
option B now serves that Redis run. Unchanged: the draft binds nothing until its
own act, and no run starts unless the owner starts or attends it. This
paragraph postdates the fidelity check below (`V-OWNER-QUESTIONNAIRE-RECORD-1`).

### 3. `arbitrary-public-repo` — answer C

Decision: how the `polaris-dossier-arbitrary-public-repo` change proceeds.

Picked: "C. Split: REQ-038/039 proceed as their own change; park the standing
permission".

Scope: agents prepare REQ-038 (reconstructed motivations) and REQ-039
(external comparisons) as their own change, redrafted to stand alone; the
standing permission and its doctrine and contract amendments are parked.
Excluded: Q0–Q8 of that change are not answered; no doctrine, contract or
specification is adopted.

### 4. `pwb-walkthrough` — answer B, with the owner's date

Decision: when, and under what merge freeze, the owner performs the PWB
cold-open walkthrough (task 4.6).

Picked: "B. Open the freeze window after the first requests run, or by
2026-12-01 (edit the date), whichever comes first", with the owner's note,
verbatim: "'or by date' should be 2026-11-05. Don't wait so long."

Scope, with the note applied: the walkthrough window opens after the first
requests run or on 2026-11-05, whichever comes first. When it opens, no merge
may touch `apps/three-surface-poc/src` or `packages/three-surface-poc-core/src`
until the owner's judgment and the cycle report are recorded. Agents prepare
the `syzygy-1z3.22` invitation criteria so that they hold at the exact head the
freeze pins; that preparation is lead work, not part of the option selected.
[Inferred] A requests run before 2026-11-05 is unlikely: its consent, its
provider statement (still to be drafted and reviewed) and its run route are all
outstanding, so the window is expected to open on 2026-11-05. [Observed] The
packet's ingested record for this item reads "Owner edits: None" and leaves the
authorization boundary "unchanged by the owner", while recording the note
above; the option itself invited the edit ("(edit the date)"), and this record
applies the note. Excluded: the met or not met judgment and its adoption phrase
are separate acts at the sitting.

### 5. `pwb-release-label` — answer A

Decision: whether the PWB release-label feature (P-85) continues, parks or is
declined.

Picked: "A. Park on Butlers; carry a rendered tag label onto the general
dossier page as a later feature request".

Scope: P-85 is parked: no further repair or review rounds and no registry
package. A rendered tag label on the general dossier page enters later as its
own feature request. Excluded: P-85's Q1–Q6 are not answered; nothing is signed
or declined.

### 6. `consent-withdrawal-knobs` — answer A

Decision: which consent act-family differences ("knobs") to align, given that
each alignment makes a gate refuse something it accepts today.

Picked: "A. Align every knob toward refusal wherever one family refuses a world
another accepts; stop and return if any family's verdict over the current
`decisions/` tree changes".

Scope: one class-4 implementation bead aligns the act-family knobs in
`packages/polaris-generation-consent/` toward refusal under that rule, with the
GP-Q0 part 1 checks (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`);
it stops and returns to the owner if any family's verdict over the current
`decisions/` tree would change. Under the GP-Q0 stop clause this is now a listed
change for that work only. Excluded: no act record is edited;
`syzygy-bpyt.1.8` is unchanged and keeps its own condition.

### 7. `wire-unknown-typing` — answer A

Decision: whether and how `/api/poc` Unknowns that carry only prose, or prose
mixed with a closed word, gain a separate closed reason.

Picked: "A. Plain owner direction: add `closedReason` (RFC2-24 values) to all
nine, prose unchanged, after `syzygy-1poh` merges".

Scope: this record is that plain direction. It authorizes an additive
`closedReason` on the seven prose-only Unknown arms and the two mixed fields
listed on `syzygy-bpyt.1.23`, implemented after `syzygy-1poh` merges, with
consumer tests updated and a census confirming no other served prose-only
Unknown remains; any further one found returns to the owner. Excluded: existing
strings unchanged; no other wire field changed.

### 8. `foundational-acts` — answer A

Decision: what to do with foundational acts 2–5 (CC-TEST-2, topology bundle,
project overview, D3 bounded missions) and the P-12 knowledge-hygiene policy.

Picked: "A. Knowingly hold all five".

Scope: all five are held knowingly; this records hold status only. Checks
CG-20, CG-21 and CG-27, which P-12 would give an authoritative home, stay
advisory. Excluded: no act is performed or declined.

## Items withdrawn before the owner saw them

On the reviews' findings, four drafted items were withdrawn by the
coordinating session, each finding recorded in the raws above:
`next-focus` (priority ordering is not an owner gate; the owner's 2026-10-14
ranking stands), `exact-source-render-mode` (explicitly excluded by the owner
on 2026-10-21), `pwb-pin-structure` (drafting the fix is lead work) and
`p98-details-target` (the browser test
`apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:373-408` shows
keyboard readers are not stranded at that target). This record decides none of
them.

## Routing

[Observed 2026-11-03] Each answer was routed to these beads when this record
was written; the tracker, not this record, holds their current state.

| Item | Answer | Beads |
|---|---|---|
| `second-project` | A | `syzygy-mea.2` (consent offering and provider statement), under `syzygy-mea` |
| `redis-next-step` | C, then revised: Redis first | `syzygy-ha5b` (candidate rule draft, raised to P1); order noted on `syzygy-1z8m` and `syzygy-mea.2` |
| `arbitrary-public-repo` | C | `syzygy-cnwp` (REQ-038/039 change); park noted on `syzygy-mzge` |
| `pwb-walkthrough` | B, 2026-11-05 | `syzygy-1z3.33` (readiness, due 2026-11-05), blocking `syzygy-1z3.22`; freeze noted on `.22` and `syzygy-1z3.25` |
| `pwb-release-label` | A | P-85 marked parked; `syzygy-7yad` (later feature request); noted on `syzygy-l362` |
| `consent-withdrawal-knobs` | A | `syzygy-bpyt.1.24`, blocking `syzygy-bpyt.1.8`; `syzygy-bpyt.1.12` closed |
| `wire-unknown-typing` | A | `syzygy-bpyt.1.25`, blocked by `syzygy-1poh`; `syzygy-bpyt.1.23` closed |
| `foundational-acts` | A | P-2…P-5 and P-12 marked knowingly held in `PENDING-OWNER-DECISIONS.md` |
