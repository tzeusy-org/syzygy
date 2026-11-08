# Owner sign-off — Polaris dossier launch-time consent, version 1.0

> **Candidate — binds nothing.** Drafted 2026-11-08 under the owner directions
> `POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08` and
> `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08`. It performs no act and
> carries no digest. Effect comes only from your version-tagged sign-off,
> recorded by `scripts/record_versioned_signoff.py` under
> `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, after the
> sign-off confirmation (`REVIEW-BRIEF-SIGNOFF.md`) returns `CONFIRM` or a
> notes-only `CONFIRM WITH EXCEPTIONS`. A commit, a review or a merged pull
> request performs no act.

## The question you answer

> Sign off version 1.0 of the package `polaris-dossier-launch-consent`: the
> OpenSpec change `openspec/changes/polaris-dossier-launch-consent/`, which
> adds REQ-polaris-generation-046 (launch-time consent) and 047 (trunk-tip
> revision pinned at launch), narrowed to your answers of 2026-11-08?

- **Option to select:** "Sign launch-consent spec version 1.0".
- **Other answer:** "Not yet", with what to change; nothing is recorded.

## What signing does

- The recorder checks the review, then installs the spec: it moves from the
  change's `proposed/` directory to `specs/polaris-generation/spec.md`, where
  it joins the Polaris effective composition, and rewrites the two figures on
  `PROJECT-STATUS.md`. It writes the record
  decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.0.md and the tag
  `polaris-dossier-launch-consent-v1.0` to create.
- [Inferred] The record binds the spec as a specification only. It does not:
  - grant the write consent for launch consent records (`syzygy-pdja.22`,
    drafted and offered separately);
  - perform the screening-policy successor admitting private repositories
    (`syzygy-pdja.23`); until you perform one, a repository you do not declare
    public is refused;
  - record any consent for any repository;
  - authorize implementation code. That needs its own direction, as the
    local-agent mode's did.

## What four review rounds left open

Every finding below is a note; none blocks. Each would be a later version
(1.1) if you want it repaired, never an edit to the signed bytes.

- **Round 4 (`R-POLARIS-LAUNCH-CONSENT-4-RAW.md`), notes I2 to I6:**
  - I2: the sentence saying the HEAD check is met by "a launch consent record
    naming the pinned revision" now describes only the common case. A run
    whose observation consent came from another act meets it by that
    consent. The sentence stays true; an optional rewording would name both.
  - I3: a run that relies on no launch consent record keeps every
    predecessor meaning, as the header says, but REQ-046 may still ask it for
    a missing statement. An optional clause would say so.
  - I4 [Unknown]: the wider "launch-consented run" also widens the
    no-placement scenario to runs whose consent another act made. Whether the
    placement meaning of REQ-polaris-generation-025 is unchanged for those
    runs was outside the round's reading set and was not checked.
  - I5: "any reference a run may pin", where the records may not live, can
    read as conflicting with `--revision` accepting "a reference the clone
    holds". An optional narrowing would remove it.
  - I6: carries round 3's H8 and round 2's G5 to G8 unchanged (below).
- **Round 2 (`R-POLARIS-LAUNCH-CONSENT-2-RAW.md`), notes G5 to G8, carried
  through round 3 (its H8):**
  - G5: the run record must state the commit date, but the rule on what
    pre-answer reads may store does not list the run record, so a test cannot
    tell which read a stored date came from.
  - G6: four duties have no falsifier: asking before refusing when the write
    consent is absent; refusing a self-observation after asking; reading
    records from any other reference; and per-repository code. The last needs
    a structural test.
  - G7: "every file a placement would have placed is withheld" is vacuous for
    a repository with no placement at all. A better wording is "every file
    the screening withholds for want of a placement".
  - G8: "any reference a run may pin" is vacuous for every repository but
    Syzygy's own. The dedicated branch also lies in agent sessions' write
    reach: deleting or force-moving it hides every launch record, after which
    a revoked record goes unnamed. That residual is disclosed for the
    identity but not for the branch.

## After the sign-off (for the lead, not the owner)

In the recording commit, run
`python3 scripts/check_spec_reconciliation.py --regenerate` to write the
change's generated dependency union, as for every installed addition. Then
register the recorder `--check` line and the builder `--check` and
`--selftest` lines together: in the `PROJECT-STATUS.md` battery, in
`.github/workflows/governance-docs.yml` and in the count sentence (CG-26, one
integration commit).
