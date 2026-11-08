# Review brief — Polaris dossier launch-time consent, sign-off confirmation

> **Candidate — binds nothing.** Brief for one independent, fresh-context
> reviewer, dispatched by the lead. Package key: `polaris-dossier-launch-consent`,
> version 1.0. Rounds 1 to 4 reviewed the change itself; their raws
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-1-RAW.md` to `-4-RAW.md`) carry a
> `Spec SHA-256` head that the sign-off recorder
> (`scripts/record_versioned_signoff.py`) cannot bind. This round binds the
> reviewed bytes to the package in the recorder's form. It judges no new
> design question.

## Your role

You are an independent reviewer. You did not write these bytes. Read only the
package, the change, the four earlier raws, the change's round dispositions,
the owner's answers
(`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`)
and the recorder's docstring. Do not read observed-repository bodies or
dossier outputs, and do not edit anything except your own raw.

## Subject

- The reviewed subject is `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`,
  hashed from the tree at the commit the lead names.
- The package bytes are every file under
  `.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/`
  and `openspec/changes/polaris-dossier-launch-consent/` at that commit; the
  recorder refuses if either directory differs at signing.
- The install step is `scripts/build_polaris_dossier_launch_consent.py`
  (`apply()`): it moves the spec to `specs/`, rewrites the citations and both
  figures on `PROJECT-STATUS.md`.

## Questions

1. Is the subject's SHA-256, recomputed by script, the digest rounds 3 and 4
   confirmed: round 4's head (`R-POLARIS-LAUNCH-CONSENT-4-RAW.md:4`)? Has no
   spec byte changed since commit `8e5754b9`
   (`git diff 8e5754b9 <commit> -- openspec/changes/polaris-dossier-launch-consent/proposed/`
   prints nothing)?
2. Did any edit to the change directory since `8e5754b9` change a meaning?
   Expected: the round-4 I1 repairs to `SEMANTIC-DELTA.md` and
   `OWNER-PACKET.md`, the ticked task, and nothing else.
3. Does `OWNER-SIGNOFF.md` in the package carry, accurately and without
   softening, every note still open: round 4's I2 to I6, round 3's H8 and
   round 2's G5 to G8? Does it state the owner's question, the version and the
   option label exactly, and grant nothing beyond the owner's answers?
4. Does the builder's `--check` pass on the unapplied package, and does its
   `apply()`, run on a scratch clone (never this worktree), install the spec
   as `tasks.md` and the docstring describe, leaving
   `python3 scripts/count_polaris_effective_scenarios.py` and
   `python3 scripts/build_polaris_dossier_local_agent_mode.py --check`
   passing?

## Output

Write your raw output to a new file under `docs/reviews/` named
`R-POLARIS-LAUNCH-CONSENT-SIGNOFF-1-RAW.md`. The recorder reads it
mechanically, so follow its contract exactly (from the recorder's
docstring, step 3 and step 4):

- "the review raw's first four non-blank lines carry exactly one
  `Reviewed commit: <40 hex>`, one `Manifest SHA-256: <64 hex>` and one
  `Verdict:` line, which is `CONFIRM` or `CONFIRM WITH EXCEPTIONS`".
  `Manifest SHA-256` here is the SHA-256 of the subject file above, not of
  any manifest file: this package has none, and the recorder hashes the
  subject. Start with exactly these four non-blank lines:

```text
# R-POLARIS-LAUNCH-CONSENT-SIGNOFF-1
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
Reviewed commit: <full 40-hex commit id>
Manifest SHA-256: <64 hex of proposed/polaris-generation/spec.md>
```

- "The raw must also name the package's key": write
  polaris-dossier-launch-consent as a whole token on a line outside any
  fenced block.
- For `CONFIRM WITH EXCEPTIONS`, "the raw's `## Findings` section numbers its
  findings continuously as `**Finding N — title** (blocking|revise|note)`";
  the recorder clears the bytes only when every finding is a `note`. Open
  every finding with that exact form, and use no other heading, bullet or
  label to open one inside `## Findings`.

Then, for each finding, give its file and line, the clause quoted, and the
repair you would accept.
