# Owner sign-off — Polaris dossier launch-time consent, version 1.1

> **Candidate — binds nothing.** Drafted 2026-11-08 from your answer C to
> `syzygy-pdja.23-confidence`
> (`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md`).
> It performs no act and carries no digest. Effect comes only from your
> version-tagged sign-off, recorded by `scripts/record_versioned_signoff.py`
> under `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, after an
> independent review (`REVIEW-BRIEF.md`) returns `CONFIRM` or a notes-only
> `CONFIRM WITH EXCEPTIONS`. A commit, a review or a merged pull request
> performs no act. It is not offered to you until that review has returned.

## The question you answer

> Sign off version 1.1 of the package `polaris-dossier-launch-consent`: one
> warning added to REQ-polaris-generation-046, so that for a repository you
> do not declare public the launch question says its name and URL go onto
> the dedicated records branch in Syzygy's own repository, which one push
> would publish, and asks you to confirm nothing?

- **Option to select:** "Sign launch-consent spec version 1.1".
- **Other answer:** "Not yet", with what to change; nothing is recorded.

## What changes, in plain words

- When you launch a run on a repository and do not answer yes to "is it
  public?" (you answer no, or give no answer to that part), the question
  now also tells you, before you type the phrase:
  - that your answer writes the repository's name and URL into the consent
    records;
  - that those records are committed on the dedicated branch in Syzygy's
    own repository;
  - that Syzygy never pushes that branch, and one push of it would publish
    them.
- You are not asked to confirm it. The phrase you type is the same as
  before, and the records hold the same fields. The warning is kept in the
  record as part of "the question in full", as every question already is.
- Nothing else in the spec changes. One scenario is added and the falsifier
  gains one arm, so a test can catch an implementation that asks for the
  phrase first or asks for a confirmation.

## What signing does

- The recorder checks the review, applies the one patch to the installed
  spec, rewrites both figures on `PROJECT-STATUS.md` (each gains one
  scenario: 297 becomes 298) and names the v1.1 record beside v1.0's. It
  writes the record decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md
  and the tag `polaris-dossier-launch-consent-v1.1` to create.
- [Inferred] The record binds the spec as a specification only. It does not:
  - perform screening scope version 8. Your held selection signing v8
    (`OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md`) is recorded only by
    its own recorder, in the change that brings the code that reads the
    policy. Signing v1.1 removes one of the two things v8 waits for; the
    other still holds. Until v8 is in force, a repository you do not declare
    public is still refused, so the warning is not shown in practice yet;
  - grant the write consent for launch consent records;
  - record any consent for any repository;
  - authorize implementation code.

## What it does not cover

- **No disclosure confirmation.** You chose C over A. The question warns and
  does not ask whether you may disclose the repository's name; that stays
  your judgement at each launch.
- **"Would publish" is your wording.** [Observed in the change's
  `design.md`] Syzygy's own repository is public, so pushing the branch to
  its usual remote publishes the names. [Inferred] Pushed to a private
  remote, they reach only that remote's readers; the warning does not draw
  that distinction.
- **Who can move the branch** is not changed (round 2's G8, below).

## Notes carried unchanged from version 1.0

Version 1.1 repairs none of these; you did not ask for their repair. Their
full text is in the v1.0 package's `OWNER-SIGNOFF.md`
(`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md`),
"What four review rounds left open":

- round 4 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-4-RAW.md`): I2, I3, I4
  [Unknown], I5 and I6;
- round 2 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-2-RAW.md`), carried through
  round 3 as H8: G5, G6, G7, G8 and G9;
- the status-page note that the figure "without the signed-off dossier
  local-agent addition" counts this addition too.

G8 is the one next to this change: the dedicated branch lies in the agent
sessions' write reach, so deleting or force-moving it hides every launch
consent record. v1.1 says what a push of the branch publishes and leaves
that residual as it was.

## After the sign-off (for the lead, not the owner)

In the recording commit, run
`python3 scripts/check_spec_reconciliation.py --regenerate` to rewrite the
change's generated dependency union and the census. Then register, in one
integration commit (CG-26), the recorder line
`record_versioned_signoff.py --check polaris-dossier-launch-consent --version 1.1`
and the builder lines
`build_polaris_dossier_launch_consent_v1_1.py --check` and `--selftest`: in
the `PROJECT-STATUS.md` battery, in `.github/workflows/governance-docs.yml`
and in the count sentence.
