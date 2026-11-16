> **Candidate — binds nothing.** This semantic delta is drafted under bead
> `syzygy-pdja.21` and CC-REV-2. It performs no act, amends no signed byte and
> authorizes no implementation. Version 1.0 of
> `polaris-dossier-launch-consent` stays in force until the owner signs off
> version 1.1 after a fresh independent review of these exact bytes.

# Semantic delta DOSSIER-LAUNCH-CONSENT-1.1 — the name-on-branch warning

Version 1.1 adds one warning to the launch question of
REQ-polaris-generation-046, and nothing else. When the operator does not
declare the repository public, the question states, before the owner's
answer is asked for, that a confirmed answer records the repository's name
and URL on the dedicated records branch in Syzygy's own repository, which
Syzygy never pushes and which one push would publish. The question asks for
no confirmation of the warning.

**Artifact(s):** the signed change
`openspec/changes/polaris-dossier-launch-consent/`, at its v1.0 bytes on
`main` (merge `329b6c75`, tag `polaris-dossier-launch-consent-v1.0`). One
file moves, by the one patch under `proposed/`:

- `specs/polaris-generation/spec.md` (`spec.md.patch`).

`GOVERNING-DEPENDENCIES.md` is regenerated on install
(`check_spec_reconciliation.py --regenerate`) and gains one decision,
`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2`. `design.md`,
`proposal.md`, `tasks.md` and every other file of the change are unchanged.

**Stable IDs affected:** REQ-polaris-generation-046, amended in place: one
sentence group added to its second paragraph, one scenario added, the
falsifier gains one arm, the case widens one variable, and the warrant
block's decisions gain one entry. REQ-polaris-generation-047 is unchanged.
No identifier is minted, retired, renamed or renumbered, and no requirement
title changes.

**Change class:** **Normative.** An implementation that conforms to v1.0 may
ask a non-public repository's owner for the phrase without saying where the
repository's identity and URL are written or that a push would publish them.
That fails v1.1.

**Author:** agent drafting for bead `syzygy-pdja.21`.

**Date:** 2026-11-08, drafted over v1.0 as signed (merge `329b6c75`), and
measured over `main` at `ed186d54`, after PR #797 landed screening scope v8
and the owner's held selection.

## Sources

- The owner's answer: `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md`,
  item `syzygy-pdja.23-confidence`, answer C, picked as "C. Only the
  name-on-branch warning". The record says: "for a repository not declared
  public, the launch question states that its name and URL are recorded on
  a branch one push would publish. It asks for no disclosure confirmation."
  It also says where the warning goes: "a launch-consent spec version 1.1,
  drafted, reviewed and offered for sign-off", and the hold it carries:
  "screening scope version 8 does not take effect before launch-consent spec
  1.1 is signed".
- The question the owner answered is item 2 of the v8 owner decision packet,
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/OWNER-DECISION-PACKET.md`
  (on `main` since PR #797, merge `ed186d54`). That item says "Each launch record also writes the repository's
  name, URL and commit into Syzygy's own repository, on a branch Syzygy never
  pushes."
- The answer was not the recommendation (A, a warning and a disclosure
  confirmation). The confirmation is the half the owner declined; v1.1 does
  not carry it.

## Current meaning

At v1.0, REQ-polaris-generation-046:

- has the question state, "before the answer is asked for", a list of items
  that includes "the operator's declaration whether the repository is
  public, asked for in the question", but nothing about where the
  repository's identity and URL are written;
- records "the declared identity, how it was proposed, the normalised URL as
  a locator hint, the operator's declaration whether the repository is
  public, and their Inferred labels" in the observation consent record, and
  commits the records "on one dedicated reference of the governance home
  that the write consent names (a branch under `refs/heads/` …)";
- says "Syzygy SHALL NOT push or otherwise publish the dedicated reference;
  publication is the operator's act."
- refuses "A repository that the operator does not declare public … before
  any record is written while no effective policy admits non-public
  sources", and says a screening-policy successor "that asks more of the
  record or the question (another field, consent class or disclosure) needs
  this requirement amended alongside it."

So the facts the warning states are already true at v1.0. What v1.0 does not
do is tell the owner, at the moment of the answer, that they hold for this
repository.

## Proposed meaning

1. **The warning.** After the list of statements the question carries, v1.1
   adds: "Where the operator does not declare the repository public, whether
   the declaration is that it is not public or no declaration is given, the
   question SHALL also state, before the answer is asked for, that a
   confirmed answer records the repository identity and its normalised URL
   in the launch consent records, which Syzygy commits on the dedicated
   reference below, in the observing project's own repository; that Syzygy
   never pushes that reference; and that one push of it would publish them."
   - "Name and URL" in the owner's words are the spec's "repository identity"
     and "normalised URL", the two values the record carries.
   - The "branch" in the owner's record, which the v8 packet puts "into
     Syzygy's own repository", is the spec's "dedicated reference" of the
     governance home, "in the observing project's own repository" (the write
     consent's repository, RFC5-12; SEC-4).
   - "whether the declaration is that it is not public or no declaration is
     given" covers a silent launch question as well as a "no": the warning
     turns on the absence of a yes, not on a no. That matches
     v8's default, under which a repository "counts as public only when
     every consent record it has says so". v1.0's falsifier still forbids
     creating a record with no declaration; the warning is stated whether or
     not a record then follows.
2. **Ask nothing extra.** "That statement is a warning only: the question
   SHALL ask for no confirmation of it, and it adds no answer, phrase or
   record field to those this requirement lists." The phrase, the records
   and their fields are as at v1.0. The question's full text is already
   recorded as each record's ceremony ("the question in full"), so the
   warning is recorded with no new field.
3. **Before the answer.** The warning is stated "before the answer is asked
   for", the same ordering v1.0 uses for every other statement.
4. **Scenario.** "Name and URL warning for a repository not declared
   public": WHEN the operator declines to declare the repository public, or
   gives no declaration, and an effective policy admits non-public sources;
   THEN, before the answer is asked for, the question states the warning;
   AND the question asks for no confirmation, and the phrase is the phrase
   the requirement names, with nothing added. The WHEN names an admitting
   policy because, without one, v1.0's refusal stands and the question
   leads to no record.
5. **Falsifier and case.** The falsifier gains one arm: for a repository the
   operator does not declare public, the answer is asked for before the
   question states the warning, or the question asks for a confirmation of
   it or adds an answer, phrase or record field for it. The case's answer
   variable "public declared or not" becomes "public declared, declined or
   not given", so the oracle covers the silent case.
6. **Warrant.** The decisions list gains
   `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2`.

### Not carried

- **The v1.0 review notes.** Round 4's I2 to I6 and round 2's G5 to G9, as
  `OWNER-SIGNOFF.md` of the v1.0 package lists them, are carried unchanged.
  The owner did not ask for their repair, and v1.1 repairs none of them.
  G8 is next to this change: it says the dedicated branch lies within the
  agent sessions' write reach, so deleting or force-moving it hides every
  launch consent record. v1.1 says what a push of that branch publishes; it
  does not touch who can move it.
- **A disclosure confirmation** (answer A's second half). Declined by the
  owner.
- **The v1.0 banner residues.** The spec's head still opens "Candidate exact
  behavioral delta; not adopted, binds nothing", and `design.md` and
  `proposal.md` still open "Candidate — binds nothing". v1.1 leaves them, as
  the owner asked for nothing beyond the warning. The local-agent mode's
  v1.1 corrected the same kind of sentence as its item E1; here that would
  be a second change, and it is not drafted.

## What explicitly does NOT change

- REQ-polaris-generation-047, and every requirement outside this change.
- The refusal of a repository not declared public while no effective policy
  admits non-public sources. v1.1 does not lift it; the screening-policy
  successor (v8) would, and the owner holds v8 until v1.1 is signed.
- What is recorded, where, by whom and when; the phrase; the records'
  fields; the rule that Syzygy never pushes the dedicated reference.
- The question for a repository declared public. v1.1 neither requires nor
  forbids the warning there.
- No doctrine, contract or policy text, and no implementation code.

## Warrant

- **The owner's answer** above, for every item.
- **VIS-1, VIS-2**: the owner sees, before acting, the effect the act has.
- **SEC-2, SEC-4**: the records are written under the write consent into the
  observing project's own repository; the warning names that repository.
- **RFC5-12**: the record class and the write consent are unchanged.
- **CC-REV-2** (an amendment of a signed specification travels as a new
  version with its own review) and the owner's direction
  `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02`, under which v1.0
  was signed.

## Evidence or decision basis

- [Observed, this session, over `ed186d54`] the patch applies to the v1.0
  bytes with `git apply`; reversing it restores bytes that hash to the
  `Manifest SHA-256` of `docs/reviews/R-POLARIS-LAUNCH-CONSENT-SIGNOFF-2-RAW.md`,
  the review the v1.0 record names.
- [Observed, in a scratch worktree of `ed186d54`] after `apply()` and
  `check_spec_reconciliation.py --regenerate`:
  `openspec validate polaris-dossier-launch-consent --strict` (OpenSpec
  1.9.0) reports the change valid; the effective Polaris composition is 38
  requirements and 298 scenarios, against 38 and 297 at v1.0
  (`scripts/count_polaris_effective_scenarios.py`); the reconciliation
  check reports "7 of 7 predicates without FAIL".
- [Observed] `design.md` records that "Syzygy's own repository is public
  (`gh repo view`, 2026-11-08)", so a push of the dedicated branch to that
  repository's remote makes it public. [Inferred] An operator who pushes it
  to a private remote publishes it only to that remote's readers; the
  warning's "would publish" is the owner's wording and is not narrowed.

## Terms introduced / retired

- **The name-on-branch warning**: introduced, as a statement of the
  question. It is not a record, a field or an answer.
- Nothing retired.

## Downstream impact

See `IMPACT-LEDGER.md`. In short: one file of one change moves, one
generated file and the reconciliation census are regenerated, the status
page's two figures each gain one scenario, and no implementation code cites
REQ-polaris-generation-046 yet.

## Migration / supersession plan

- The v1.1 sign-off is recorded the way the local-agent mode's v1.1 was: the
  recorder (`record_versioned_signoff.py --record polaris-dossier-launch-consent
  --version 1.1`) applies the patch through
  `scripts/build_polaris_dossier_launch_consent_v1_1.py`, writes a v1.1
  record and aggregate block, and `--regenerate` refreshes the union and the
  census. The v1.0 record is never edited.
- The builder's `signed_findings()` tells v1.0's signed bytes from v1.1's,
  and the v1.0 builder's `--check` runs it, so the battery fails on v1.1
  bytes that no v1.1 record covers.
- At sign-off, one integration commit registers the builder's `--check` and
  `--selftest` lines and the recorder's `--check ... --version 1.1` line in
  the `PROJECT-STATUS.md` battery, in `.github/workflows/governance-docs.yml`
  and in the count sentence (CG-26). This package does not.
- v8: the owner's held selection signing screening scope v8 is recorded only
  after v1.1 is signed (the v8 selection record says its recorder "must
  refuse … if launch-consent spec version 1.1 is not signed").

## Review

Fresh-context review rounds on the default model under `REVIEW-BRIEF.md`.
Raws are stored verbatim under `docs/reviews/` as
R-POLARIS-LAUNCH-CONSENT-V1-1-*n*-RAW.md.
