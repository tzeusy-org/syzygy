# Owner direction — third answer to the owner questionnaires of 2026-11-07

Date: 2026-11-07

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-07-3`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing, changes no screening policy, performs no consent and edits
  no signed byte.
- It starts no run, no body read and no provider egress.

Item 2 is the owner's selection to sign dossier spec version 1.5. The signature
itself is recorded by `scripts/record_versioned_signoff.py` in
`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.5.md`, which carries the selection
quote; this direction records the other four answers and the context of all five.

## How the answer was given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire of five items. Items 1 to 4 were over commit `a2cb6f72` of branch
`agent/syzygy-pdja.2-voice`. Item 5 was over commit `170b306e` of branch
`agent/syzygy-pdja.8`. Independent reviewers vetted items 1 to 4 over three rounds
and item 5 over three rounds. The session served the packet as a token-gated web
form at a tailnet address and ingested the owner's submission.

- Submitted: 2026-11-07T09:40:13+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all five items by picking one presented option each with no
  edits or notes, and answered yes to applying them now.
- [Inferred] That the operator of that form is the owner.
- The packet is a scratch file outside this repository and is not authority; its
  sha256 after its records were filled is `a1e3e610061f86747fc0a958e2320129e0b7c80e09a0e0706845964b16371660`.
- The owner then wrote in the session: "Done".
- Each pick was the form's recommendation.

## The answers

### `syzygy-pdja.2-round-7` — answer A

Picked: "A. Keep all three repairs as written and take the offer in item 2 on these
bytes. I add both gaps to `syzygy-pdja.3` as owed tests".

- What it records: round 7's repairs 2, 4 and 6 stand as written, and round 7's
  findings 1 and 2 become tests `syzygy-pdja.3` owes. Those are the mixed block that
  quotes its admitted span, and the legend's sentences compared exactly.
- Excluded: no finding is overruled or regraded.

### `syzygy-pdja.2-signature` — answer A

The selection to sign version 1.5. The signature record carries its words.

### `syzygy-pdja.2-secret-mark` — answer A

Picked: "A. The mark says \"Withheld file\", with no path and no line, on hover and on
focus".

- What it records: in `syzygy-pdja.3`, a citation mark in a mixed block that cites a
  file whose path a secret detector matches shows the words `Withheld file`, with no
  path and no line, on hover and on focus.
- The reading it carries: version 1.5's sentence that a citation mark "shows its file
  and line on hover and on focus" does not reach this mark. The test of the scenario
  "Reading view keeps every marking" carves this case out.
- Excluded: any change to the spec's text, to screening or to the secret detectors.

### `syzygy-pdja.2-excluded-citation` — answer A

Picked: "A. Yes. The ruling covers it: the block keeps its text and states the count
in the evidence view, as version 1.5 already says. A block that quotes the excluded
file is still a withheld item".

- What it records: the fourth ruling of version 1.5 also reaches a block that cites
  both an admitted span and a whole excluded file. Such a block keeps its text under
  the mixed rule, and states its withheld count in its evidence view and machine form.
- The residual it accepts: dependence beyond "all cited spans withheld" is left to the
  fidelity review, which can miss.
- Excluded: any change to screening or to RFC5-17.

### `syzygy-pdja.8-landing` — answer B

Picked: "B. One more narrow round over the repair. Whatever it says, I land it unless a
finding is blocking. Any revise finding goes into a tracked bead for you to judge after
you see real diagrams. A blocking finding comes back to you".

- What it records: PR #784 gets one more narrow review over the repair at `170b306e`.
  It then lands unless a finding is blocking. Each revise finding is filed as a bead for
  the owner to dispose of, with a recorded rationale, after the owner sees real
  diagrams.
- A revise finding landing this way is neither fixed nor overruled until the owner
  disposes of it.
- Excluded: any change to a spec or contract; regrading a finding; any general change
  to the review rule.

## A question left unanswered

Item 5 disclosed that one vetting subagent went beyond its brief. To find the last
Redis run's diagrams, it parsed every JSON file in that run's directory and searched
its site HTML. It printed only key names, counts and file paths. The packet invited a
ruling on that read; the owner gave none. Nothing here rules on it.
