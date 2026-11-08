# Review brief — Polaris on any repository, consent asked at launch, round 2 (confirmation)

> **Candidate — binds nothing.** Brief for one independent, fresh-context
> confirmation reviewer, dispatched by the lead. This is the last round:
> whatever it returns, the packet goes to the owner with any remaining
> findings listed.

## Your role

You are an independent reviewer. You did not write these bytes. Read only the
artifact, its governing references, the round-1 raw and the dispositions. Do
not read observed-repository bodies or dossier outputs, and do not edit
anything.

## Subject

Every file under `openspec/changes/polaris-dossier-launch-consent/` and
`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md` at
the commit the lead names. Governing references and neighbours are those of
`REVIEW-BRIEF.md`; add RFC3-16(a) and (c) in
`contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md`.

## Questions

1. For each of F1 to F13 in the round-1 raw, is the disposition in
   `ROUND-1-DISPOSITIONS.md` true of the bytes: repaired, accepted, or not?
2. Did any repair introduce a new defect: a contradiction between REQ-046
   and REQ-047, a silent change to REQ-033 beyond the one displacement, a
   falsifier that the requirement cannot satisfy, or a claim not labelled
   Inferred that Syzygy cannot observe?
3. The dedicated-reference design (F12): does recording on a non-trunk
   reference meet RFC3-7's "stored in `.syzygy/governance/decisions/`" and
   RFC3-16(c)(1)'s "recording commit/tag"? Say which reading you accept.
4. Are Q1 to Q10 genuine, and is Q10 drafted without a recommendation?

## Output

Write your raw output to a new file under `docs/reviews/` named
`R-POLARIS-LAUNCH-CONSENT-2-RAW.md`, starting with these four non-blank
lines:

```text
# R-POLARIS-LAUNCH-CONSENT-2
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
Reviewed commit: <full commit id>
Spec SHA-256: <64 hex of proposed/polaris-generation/spec.md>
```

Then each finding with severity (blocking, revise, note), the file and line,
the clause quoted, and the repair you would accept.
