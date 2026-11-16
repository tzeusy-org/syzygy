# Review brief — Polaris on any repository, consent asked at launch, round 3 (confirmation of the narrowing)

> **Candidate — binds nothing.** Brief for one independent, fresh-context
> confirmation reviewer, dispatched by the lead. The owner answered the packet
> on 2026-11-08 and left this review in place by not writing "no review". It
> checks only what changed since round 2: the narrowing to the owner's answers
> and the repairs for round 2's G1 to G3. Whatever it returns goes to the owner
> with the sign-off package.

## Your role

You are an independent reviewer. You did not write these bytes. Read only the
artifact, its governing references, the two earlier raws and the owner's
answers. Do not read observed-repository bodies or dossier outputs, and do not
edit anything except your own raw.

## Subject

Every file under `openspec/changes/polaris-dossier-launch-consent/` and
`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`
at the commit the lead names. Compare against the round-2 subject with
`git diff 3c00d2c8 <commit> -- openspec/changes/polaris-dossier-launch-consent/`.
Governing references are those of `REVIEW-BRIEF-ROUND-2.md`, plus RFC1-2
(`contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`) and RFC3-6
(`contracts/rfcs/RFC-0003/manifests-and-namespace.md`). The round-2 raw is
`docs/reviews/R-POLARIS-LAUNCH-CONSENT-2-RAW.md`.

## Questions

1. Is each repair true of the bytes, and would you accept it?
   - G1: REQ-046 says the phrase declares the identity and Syzygy only
     proposes it, preferring the one identity matching records carry, and
     refusing before asking when they carry several. Design §1 has RFC1-2 and
     RFC3-6 rows. The residuals are disclosed.
   - G2: REQ-047's first branch, the change header and the scenarios agree on
     what an existing consent covers, including a fork or mirror remote.
   - G3: the pre-answer classes are labelled a preview in REQ-046 and design §1.
2. Does the change match each of the owner's answers in the direction record,
   without granting more than an answer grants? In particular, Q2 B: is it
   true that a successor admitting non-public sources through the same record
   would need no change to REQ-046, and is the claim labelled Inferred?
3. Did the narrowing introduce a new defect: a contradiction between REQ-046
   and REQ-047, a change to REQ-033 beyond the one displacement, a falsifier
   the requirement cannot satisfy, or an unlabelled claim Syzygy cannot
   observe?
4. Is the identity tie-break (refuse before asking, name each matching record
   and the identity option) sound, or does it leave a launch that can never
   proceed?

## Output

Write your raw output to a new file under `docs/reviews/` named
`R-POLARIS-LAUNCH-CONSENT-3-RAW.md`, starting with these four non-blank
lines:

```text
# R-POLARIS-LAUNCH-CONSENT-3
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
Reviewed commit: <full commit id>
Spec SHA-256: <64 hex of proposed/polaris-generation/spec.md>
```

Then each finding with severity (blocking, revise, note), the file and line,
the clause quoted, and the repair you would accept.
