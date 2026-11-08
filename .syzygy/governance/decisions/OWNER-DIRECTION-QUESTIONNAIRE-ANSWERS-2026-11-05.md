# Owner direction — answers to the owner questionnaire of 2026-11-05

Date: 2026-11-05

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs nothing, adopts nothing, changes no screening policy, performs no
  consent and edits no signed byte.
- It starts no run, no body read and no provider egress.

Where an answer below needs a policy act or a sign-off, that act is still
performed later, through its own recorder, over its own reviewed bytes.

## How the answers were given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire over `origin/main` at `540c2cdd`, the live Beads tracker and the
metadata of Redis dossier run 3 (`run-4465d22f5ce1829ca49059a5b8451bb0`) on
2026-11-05. It served the questionnaire as a token-gated web form at a tailnet
address and ingested the owner's submission.

- Submitted: 2026-11-05T02:33:24+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all three items, each by picking one presented option
  with no note. The owner answered the form's separate final question, whether
  to apply the answers now, with yes.
- The packet is a scratch file outside this repository and is not authority;
  this record is self-contained. After ingestion the packet's sha256 is
  `ba645ee90f28da44a12fe7299e4fe9b4c90228c0682c09a86386083072c3f386`.

Before each item was offered, an independent adversarial review passed both its
problem scope and its recommendation. The raw output of every round is
retained verbatim in `docs/reviews/`; each file is the reviewing subagent's
final message, byte for byte.

| Raw | Covers | Verdict lines |
|---|---|---|
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-05-1-RAW.md` | Round 1, all three items | e.g. `syzygy-mcs4` "**Scope verdict: Revise.**" (`:14`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-05-2-RAW.md` | Round 2, fresh reviewer, all three items | e.g. `syzygy-zwja.1` "- Scope verdict: Pass." (`:96`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-05-3-RAW.md` | Round 3, fresh reviewer, all three items | `syzygy-zwja.1` passes both verdicts (`:96-97`) |
| `docs/reviews/VET-OWNER-QUESTIONNAIRE-2026-11-05-4-RAW.md` | Round 4, same reviewer, verification of `syzygy-mcs4` and `syzygy-mea.9` | both pass both verdicts (`:21-22`, `:40-41`) |

[Observed] The packet bytes each round read were not frozen, so no raw names a
packet digest (verification rule 10). Each raw is evidence of the round's
findings, not a confirmation of the bytes the owner later answered.

## The answers

### 1. `syzygy-mcs4` — admit Redis's `redis.conf` to dossier review

- Decision offered: whether agents should rebase the unreviewed `redis.conf`
  screening draft into a reviewed screening-scope version 6 candidate for a
  later policy act, fold it into the generic config-class work, or hold it.
- Picked: "A. Rebase P (placement + detector) onto v5 as v6, review, offer for
  your act".
- What it records: agents rebase variant P of the screening draft (branch
  `agent/screening-redis-conf-followup`, `8c1832ca`) onto the installed
  version 5 as a version 6 candidate. Variant P places `redis.conf` as project
  documentation pinned to one repository and commit, with the
  `config-secret-directive` detector. Agents re-derive its span figures, review
  it independently and offer it for one policy act. Variant X stays out.
- Excluded: no screening policy binds and no run starts. Version 6 binds only
  by the owner's separate policy act.
- Evidence the owner read: run 3's draft revision 0 cited `redis.conf` 34
  times out of 180, across 30 objects (18 citing only it). The check marked 12
  quoting blocks `excluded-content`: 10 of the 15 trade-off blocks and two
  advantage blocks. Revision 1 re-sourced them. The draft lists five residuals
  that still reach the reviewer, and the detector withholds whole any code body
  with a matching line.

### 2. `syzygy-mea.9` — option E, rows citing only withheld files

- Decision offered: how a statement that only a screening-withheld file
  supports should be handled (option E, a REQ-polaris-generation-035 change),
  or hold the question.
- Picked: "D. Hold; re-ask when a counted fidelity verdict marks an inventory
  row unresolved or a block not supported whose cited spans are all withheld".
- What it records: option E is not prepared now. `syzygy-mea.9` is deferred
  with that trigger, which a run's metadata can show. Run 3 did not meet it.
  The packet stated that this answer depends on item 1. If `redis.conf` is not
  admitted, Redis drafts keep re-sourcing away from it, and E for both inventory
  rows and draft blocks becomes the stronger choice.
- Excluded: no spec or brief text changes.

### 3. `syzygy-zwja.1` — how repair cycles are counted in the one-command run

- Decision offered: the direction for the unsigned one-command-run spec on how
  draft resubmissions count against the repair-cycle limit, or keep the rule.
- Picked: "C. Keep the rule; the operator chooses the limit when asked".
- What it records: no delta to the one-command-run candidate on counting.
  `syzygy-zwja.1` closes. The re-ask trigger is noted on `syzygy-zwja`: a run
  ends blocked with most cycles spent repairing check failures.
- Excluded: no spec text changes. `syzygy-1z8m.7` is fixed separately against
  the governing texts. It covers the prototype's silent default of 6 cycles,
  recorded as operator-declared, where the signed local-agent spec says "there
  is no default" and the candidate asks one question.
