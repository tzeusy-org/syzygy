> **Candidate — binds nothing. Draft only, 2026-11-04.** No owner sign-off,
> policy installation, execution permission or implementation change is recorded.

# Review subject — CC-SEC-3 attended-session amendment

## Artifact and scope

The subject is the exact candidate package identified by SHA256SUMS and the
P-117 addition in PENDING-OWNER-DECISIONS.md at the review commit. SUBJECT.json
identifies the baseline, proposed policy digest and governing inputs. The
manifest omits itself; hash it independently. No other candidate or installed
artifact is proposed for modification. Any subsequent subject edit retires
this review; notes and dispositions are retained in sibling records outside
the frozen package.

Proposed CC-REV-1 membership: class 4 security and class 1 authority boundary,
subject to the independent reviewer or owner. CC-REV-4 also applies.

## Governing references

- `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, GP-Q7 and GP-Q0.
- `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-SIMPLIFICATION-2026-10-20.md`, as confirmed/narrowed by GP-Q0.
- `.syzygy/governance/doctrine/security.md`, SEC-3; `.syzygy/governance/doctrine/vision.md`, VIS-4.
- `.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, D9; `.syzygy/governance/contracts/candidates/DOCTRINE-AMENDMENT-D9-REVIEW-NOTES.md`, N2 and Q3/Q4 routing.
- `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`, CC-SEC-3 and neighbouring obligations.
- `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, CC-REV-1…6.
- `.syzygy/governance/contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md` and SEMANTIC-DELTA-TEMPLATE.md, candidate drafting form.
- `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`, REQ-polaris-generation-033.
- `docs/reviews/R-GP-IMPL-ADAPTER-CREDENTIALS-1-RAW.md`, N1/N2/N3/N5/N6; `docs/evidence/adapter-credentials-round-1-dispositions-2026-10-22.md`.
- `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`, RFC5-12; `admission-and-boundary.md` beside it, RFC5-24.
- `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`; active acceptance record and craft INSTALL-RECORD.md for act routing.

Read only the artifact, its governing references and these acceptance criteria.
No author conversation or desired verdict is part of the review subject.
Fetch no target repository content. Open no credential file, make no provider
call, and make no choice or sign-off on the owner's behalf.

## Acceptance criteria

1. The delta quotes current and proposed text in full, classifies the change,
   retains stable IDs, and names migration and impact methods.
2. The packet states all five required disclosures: signing clears the arm's
   policy gate but flip follows verified REQ-033 disclosure and class-4 review;
   SEC-3 credential condition and N2 standing cost; unverified operator choice
   and attendance, permission-bypass/lapse cost; .8.8 landed; RFC5-12 Q3(c)
   queued and non-blocking under D9 Q3(a).
3. N3 login classification is an explicit owner choice with both arms and
   their consequences. .8.15 and its needed output listing or a signed
   alternative reading remain visible pre-flip gates; N5 completeness and N6
   disabled reason are disclosed. No reading or listing is silently adopted.
4. P-117 names this packet. No frozen predecessor, installed policy,
   implementation, flag, credential or target body is changed/read by drafting.
5. check_governance and the canonical PROJECT-STATUS battery pass on the
   subject commit in a clean clone; Tests: +0 ~0 -0.

## Retention and stopping rule

The coordinator assigns a fresh reviewer separately. Retain the raw output
verbatim in a `-RAW.md` file and route it under a review-campaign file. Copy
verdict words exactly, disposition every finding, and freeze each new subject.
A notes-only confirming round leaves reviewed bytes untouched; notes go in a
sibling record under the owner's notes-only rule. Two failed rounds on the
same material return upstream ambiguity to the owner (CC-REV-4), with no
third polishing loop inferred. The author does not self-review or adopt.
