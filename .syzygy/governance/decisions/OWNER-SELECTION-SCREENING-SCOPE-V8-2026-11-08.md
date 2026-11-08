# Owner selection — sign screening scope version 8, variant pv (held, not yet recorded as an act)

Date: 2026-11-08

Owner: Tzeusy

Decision ID: `OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08`

This is a plain record of an owner selection. It performs no act.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It binds no digest, and it registers nothing in
  `scripts/check_governance.py`.
- It changes no policy byte. The screening policy stays at version 7.
- It records no consent for any repository, and it grants no write consent.
- It starts no run, no body read and no provider egress, and it authorizes
  no implementation code.

## What the owner selected

[Observed by the coordinating session.] On 2026-11-08 a Claude Code session
offered the package
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/`
to the owner as a structured question.
- The round-6 review read the package at commit `f5bfaed7`.
- A later rebase onto `main` changed no byte of the package or of its builder
  (`git diff f5bfaed7 HEAD` over both is empty), and the manifest file still
  hashes to the digest that review's head names.

The owner picked the option labelled exactly:

> Sign screening scope version 8, variant pv

The question named the package's one variant, `pv`, and its manifest row by
its first eight hex characters. It summarised what signing does and costs,
and when it takes effect. It offered "Not yet" and "Decline" as the other
answers.

- [Inferred] That the person answering is the owner.
- The offer followed the owner's condition of 2026-11-08 (round 5, then round
  6): the package is offered only on `CONFIRM`, or on a `CONFIRM WITH
  EXCEPTIONS` whose exceptions are all notes.
  - Round 6 (`docs/reviews/R-SCREENING-SCOPE-V8-6-RAW.md`) returned
    `CONFIRM WITH EXCEPTIONS`, and its four exceptions are all notes.

## Why it is held, not recorded

The package's own packet says the signature is recorded in the same change as
the code that reads the policy, because a policy byte changed without that code
would refuse every run. The owner direction
`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md` (item
`syzygy-pdja.23-confidence`, answer C) also holds version 8 until
launch-consent spec version 1.1 is signed.

So the act phrase `APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY`, with
the manifest row as its argument, is recorded only by a dedicated recorder in
that later change. The recorder must refuse:
- if the package bytes differ from the bytes the round-6 review read;
- if launch-consent spec version 1.1 is not signed.

If the package changes before then, this selection does not carry over, and
the package is offered again.
