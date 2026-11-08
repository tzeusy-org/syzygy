# Review brief — Polaris on any repository, consent asked at launch, round 1

> **Candidate — binds nothing.** Brief for one independent, fresh-context
> reviewer. The drafting session dispatches no review; the lead does.

## Your role

You are an independent reviewer. You did not write these bytes. Read only the
artifact, its governing references and the acceptance criteria below. Do not
read observed-repository bodies or dossier outputs, and do not edit anything.

## Subject

Every file under `openspec/changes/polaris-dossier-launch-consent/`, and
`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md`,
at the commit the lead names when dispatching. Record that commit and the
SHA-256 of proposed/polaris-generation/spec.md at it, computed by script,
in your head.

## Governing references

- Doctrine: SEC-2, SEC-3 (with D9), SEC-4, VIS-2, VIS-4 in
  `.syzygy/governance/doctrine/security.md` and `vision.md`.
- Contracts: RFC5-12 and RFC5-13
  (`contracts/rfcs/RFC-0005/consent-egress-secrets.md`), RFC3-7
  (`RFC-0003/manifests-and-namespace.md`), RFC3-16
  (`RFC-0003/governance-homes-and-owner-acts.md`), RFC1-3.
- Spec bar: CC-SPEC-1 to 11 and CC-IMPACT-1 to 7 in
  `contracts/candidates/policy-candidates/` (in force despite the path).
- Predecessor: REQ-polaris-generation-033 in
  `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`.
- Neighbours that must not overlap: `openspec/changes/polaris-dossier-one-command-run/`
  (REQ-040 to 045) and `openspec/changes/polaris-dossier-arbitrary-public-repo/`
  (REQ-037 to 039).
- Policy: `publicSourceScope` in
  `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`.

## Questions to answer

1. **Clause sufficiency.** Does each clause in `design.md` §1 permit launch
   consent as drafted, without amendment? Test especially SEC-2's
   "Onboarding consent must name the providers…" bullet, RFC3-7's
   "referenced — never embedded — from the declaration", and whether writing
   into Syzygy's own `decisions/` is a SEC-4 write that the proposed write
   consent (packet Q3) covers. Name any clause that needs an amendment.
2. **Displacement exactness.** Is the quoted REQ-033 text exact, and does
   REQ-046 displace only it? Is anything else in REQ-033 silently changed?
3. **Overlap.** Does the change overlap REQ-037 to 045 in any requirement or
   scenario?
4. **Testability.** Does each scenario have an observable outcome and an
   oracle independent of the code under test (CC-SPEC-4)? Is each falsifier
   complete for its requirement?
5. **Honesty.** Is anything Syzygy cannot observe (who answered, the
   repository's public status, upstream's latest commit) labelled Inferred
   and disclosed wherever it is shown?
6. **Packet.** Are the owner questions genuine (each answer changes the
   bytes), are the trade-offs stated without steering, and is any decision
   the owner must make missing?
7. **Impact ledger.** Re-run one sweep of your choice and compare its count;
   report the population you used.

## Output

Write your raw output to a new file under `docs/reviews/` named
`R-POLARIS-LAUNCH-CONSENT-1-RAW.md`, starting with these four
non-blank lines:

```text
# R-POLARIS-LAUNCH-CONSENT-1
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
Reviewed commit: <full commit id>
Spec SHA-256: <64 hex of proposed/polaris-generation/spec.md>
```

Then each finding with severity (blocking, revise, note), the file and line,
the clause quoted, and the repair you would accept. Do not repair anything.
