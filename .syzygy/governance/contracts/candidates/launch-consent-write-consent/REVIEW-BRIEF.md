# Review brief — write consent for launch consent records, round 1

> **Candidate — binds nothing.** Not a review; carries no verdict.

**Offer condition.** The package is offered to the owner for signing only on
`CONFIRM`, or on `CONFIRM WITH EXCEPTIONS` whose exceptions are all notes,
none requiring a change. Any other verdict goes back to the owner with the
raw, not straight to another round.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. Read no secret, read or clone no target repository, make no
dossier run and no provider call, and create no branch or commit in any
repository.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/launch-consent-write-consent/`
(`OWNER-DECISION-PACKET.md`, `SEMANTIC-DELTA.md`, this brief,
`LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt`, `templates/` and
`instances/syzygy/`), `scripts/build_launch_consent_write_consent.py`, and
the `LAUNCH_WRITE_CONSENT` registration in `scripts/check_governance.py`.

**References:**
- SEC-4 in `.syzygy/governance/doctrine/security.md`; VIS-4.
- RFC5-12 and RFC5-13
  (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`),
  RFC3-7 and RFC3-16
  (`.syzygy/governance/contracts/rfcs/RFC-0003/`), each at its defining
  clause; `DIRECTIVE-REGISTER.md` locates them.
- REQ-polaris-generation-046 and 047 in
  `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`,
  and the v1.1 bytes on PR #800 (branch
  `agent/syzygy-pdja.21-launch-consent-v1-1`).
- The owner's answer: item `syzygy-pdja.21-records` in
  `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`.
- Screening scope version 8's record population:
  `../public-source-screening-scope-v8/SEMANTIC-DELTA.md` and its
  `IMPACT-LEDGER.md`.
- The consent-instance precedents: `../public-repo-admission/` and
  `../dossier-agent-provider-v2/`.

## Acceptance criteria

Each is a yes/no question; quote the clause that settles it (rule 8).

1. **Does the record carry exactly the owner's answer?** Only launch
   consent records, only as new files, only on one dedicated non-trunk
   branch; no write outside launch consent records; no commit to the trunk
   or to the current branch. Is anything wider permitted, or anything the
   answer granted withheld?
2. **Does it meet REQ-polaris-generation-046's precondition?** Its scope
   must name "this record class, the dedicated reference and the location
   in its tree". Is the reference a branch under `refs/heads/` that is not
   "the trunk, the current branch or any reference a run may pin"
   (REQ-polaris-generation-047's `--revision` accepts "a reference the clone
   holds": is that a defect of the record, or of nothing the record can
   fix)? Is `.syzygy/governance/decisions/launch-consent/` "under
   `.syzygy/governance/decisions/`"?
3. **Is the write population closed?** The scope lists Git objects, one
   reference move and its log entry. Does any write REQ-polaris-generation-046
   needs fall outside it, so the implementation could not comply, or does
   the scope permit any write the falsifier forbids ("a working tree, index
   or reference other than the dedicated one changes, or the trunk tip
   moves; Syzygy pushes the dedicated reference")?
4. **Is it add-only in the sense screening scope 8 relies on?** Does
   "differs from its parent's tree … only by files it adds at paths under"
   the location make every recording commit add new files only at one
   location? Is leaving the first commit's parent open sound?
5. **Is it a sound RFC5-12 record?** Class, subject, scope, granting
   principal, grant instant, revocation state; subject a (Project,
   repository) pair per RFC3-7; revocation prospective per RFC5-13. Is the
   identity `repository:tzeusy-org-syzygy`, derived by the launch rule,
   acceptable as an unrecorded identity's first declaration?
6. **Is the packet honest?** Plain words, the one question, the exact owner
   words, the costs the owner accepted and what the act does not do. Does any
   sentence overstate the protection, or understate a cost?
7. **Rule 6.** Run `--check` and `--selftest`. Does each selftest mutant
   fail for the reason it names? Name any predicate the docstring claims
   that no mutant exercises.
8. **Registration.** Does `check_governance.py` watch the manifest and any
   round dispositions record as copies of the argument, gated on the
   manifest's existence, with no chain link, no performed record and no
   recorder? Run `python3 scripts/check_governance.py` and report its
   summary line.
9. **Authority.** No file labels anything signed, granted, accepted or in
   force; no 64-hex digest appears in package Markdown outside `instances/`
   and `reviews/`.

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <the manifest file's sha256>` and
`Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. The Manifest SHA-256
is the sha256 of the manifest **file**
`LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt`, as
`python3 scripts/build_launch_consent_write_consent.py --manifest-digest`
prints it, never the manifest row's digest: the row is the act's argument,
and a raw's head binds the container. Findings go under a `## Findings`
heading as `**Finding N — title** (requires change|note)`, each with
file:line and a concrete failure, labelled `[Observed]`, `[Inferred]` or
`[Unknown]`; grade every exception, because the offer condition depends on
it. Store the raw verbatim as R-LAUNCH-WRITE-CONSENT-1-RAW.md under
docs/reviews/ and, in the same commit, add a campaign file
launch-write-consent.md under docs/review-campaigns/ with the pattern
`R-LAUNCH-WRITE-CONSENT.*\.md`, or
`check_docs_review_campaign_partition.py --check` fails as `unmatched`.
