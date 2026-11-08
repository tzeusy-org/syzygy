# R-POLARIS-LAUNCH-CONSENT-SIGNOFF-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 2e630f5a6834e4dc159d320d81d2a3b758c09ebc
Manifest SHA-256: 149aa74464af1fe68dd62ab4652223651025c125a42fc1259623e06b494417cd

Package: polaris-dossier-launch-consent, version 1.0.

Reviewer: independent fresh-context sign-off confirmation reviewer,
2026-11-08, per
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/REVIEW-BRIEF-SIGNOFF.md`.
`git rev-parse HEAD` in the worktree equals the commit above, and the worktree
was clean before this raw was written. The `Manifest SHA-256` line is the
SHA-256 of the subject
`openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`,
as the brief directs (the package has no manifest file). It was computed by
two methods: `git show <commit>:<path> | sha256sum` and Python
`hashlib.sha256` over the working-tree file; both gave the digest above.
Read: the package (`OWNER-SIGNOFF.md`, `REVIEW-BRIEF-SIGNOFF.md`), the change
directory, the four earlier raws, `ROUND-1-DISPOSITIONS.md`,
`ROUND-3-DISPOSITIONS.md`, the owner's answers
(`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`),
the recorder's docstring and its subject-binding code, and the builder
`scripts/build_polaris_dossier_launch_consent.py`. No observed-repository
body, dossier output or credential was read; no dossier command was run.
`apply()` was run only in a scratch clone outside this worktree.

## Summary

The spec bytes are the bytes rounds 3 and 4 confirmed, and nothing in the
change directory has changed a meaning since `8e5754b9`. The builder checks
and installs as its docstring says, and the two downstream checks pass after
install. The spec is confirmed. One finding is not a note: the owner-facing
`OWNER-SIGNOFF.md` restates round 2's G6 with its polarity inverted, so the
owner would read a forbidden behaviour as a duty of the spec. The recorder
will refuse these bytes until that one sentence is repaired (and a further
confirmation of the package bytes runs, since step 5 compares the package
directory with the reviewed commit). The other findings are notes.

## Findings

**Finding 1 — OWNER-SIGNOFF.md states G6's uncovered violations as "duties"** (revise)

File and line: `.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md:67-70`.
Clause quoted: "G6: four duties have no falsifier: asking before refusing when
the write consent is absent; refusing a self-observation after asking;
reading records from any other reference; and per-repository code."

Round 2's G6 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-2-RAW.md:142-153`) lists
behaviours the spec forbids but the falsifier does not name: asking when the
write consent is absent, refusing a self-observation only after asking,
reading records from another reference, per-repository code. The spec's
duties are the opposite. spec.md:29: "Absent that consent, Syzygy SHALL ask
nothing, refuse, and name the consent that is missing." spec.md:27: "Syzygy
SHALL refuse the run before asking". Calling the four "duties" tells the owner
the spec requires asking before refusing, which spec.md:29 forbids. The brief
(question 3) asks for every open note to be carried accurately and without
softening; this one is carried inverted.
Repair I would accept: "G6: four forbidden behaviours have no falsifier:
asking when the write consent is absent (the spec says ask nothing and
refuse); refusing a self-observation after asking rather than before;
reading records from any reference but the dedicated one; and per-repository
code. The last needs a structural test."

**Finding 2 — Round 2's G9 is neither dispositioned nor carried, and the package repeats the term it names** (note)

File and line: `docs/reviews/R-POLARIS-LAUNCH-CONSENT-2-RAW.md:177-183`;
`openspec/changes/polaris-dossier-launch-consent/design.md:63`, `:103`;
`openspec/changes/polaris-dossier-launch-consent/IMPACT-LEDGER.md:51`, `:72`;
`.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md:62-63`, `:76`.
Clauses quoted: G9, "Four occurrences of the shorthand 'launch records'
remain in design and ledger prose". design.md:63 "form or registry entry for
launch records (slice 2)"; design.md:103 "If launch records were committed
to Syzygy's trunk"; IMPACT-LEDGER.md:51 "not the launch records";
IMPACT-LEDGER.md:72 "per-repository registration for launch records".
OWNER-SIGNOFF.md:76 "deleting or force-moving it hides every launch record".

The round-3 raw's H8 (`R-POLARIS-LAUNCH-CONSENT-3-RAW.md:164-171`) gives the
status of G4 to G8 only; `ROUND-3-DISPOSITIONS.md:17` disposes "G5 to G8";
no file in the change or candidate directory names G9 (sweep: `grep -rn G9`
over both directories, the round-3 raw and the campaign file, 0 hits). The
four occurrences remain at the lines above, so G9 is still open.
`OWNER-SIGNOFF.md` lists G5 to G8 under round 2 (lines 62-78) and omits G9,
and its own G8 summary at :76 uses "launch record", the REQ-040 term the
change renamed away from (`ROUND-1-DISPOSITIONS.md:20`, F9). Editorial; no
spec byte is affected (the spec is clean of the shorthand).
Repair I would accept: add a G9 line to OWNER-SIGNOFF.md (editorial: the
shorthand "launch records" remains in design and impact-ledger prose) and say
"launch consent record" at :76. Editing design.md and IMPACT-LEDGER.md is
optional and would be a package-byte change needing its own confirmation.

**Finding 3 — The I3 summary drops "nor records"** (note)

File and line: `.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent/OWNER-SIGNOFF.md:51-53`.
Clause quoted: "I3: a run that relies on no launch consent record keeps every
predecessor meaning, as the header says". The round-4 raw
(`R-POLARIS-LAUNCH-CONSENT-4-RAW.md:83-86`) and spec.md:3 say a run "that
neither relies on nor records a launch consent record". A run that records
one without relying on it is launch-consented, so the packet's shorter form
describes a wider set than the header promises to. The I4 line (:54-57) also
drops the raw's condition "once that run relies on a launch-recorded drawer
or provider statement" (raw :114-116). Neither changes what the owner signs.
Repair I would accept: "a run that neither relies on nor records a launch
consent record" at :51-52.

**Finding 4 — After install, the status page's "without" figure silently includes this addition** (note)

File and line: `scripts/build_polaris_dossier_launch_consent.py:35-37`,
`:211-215`; `PROJECT-STATUS.md:51`, `:59` (as rewritten by `apply()` in the
scratch clone).
Clause quoted (builder docstring): "the 'without' figure is the composition
without the local-agent addition, which now includes this one". After
`apply()`, PROJECT-STATUS.md:51 reads "34 requirements and 221 scenarios
without the signed-off [dossier local-agent addition]" (it read 32 and 194),
and :59 reads "38 requirements and 297 scenarios in the effective composition
with it and with the signed-off [launch-consent addition]". The page sentence
does not say the first figure already counts the launch-consent addition, so
a reader may take 34/221 as the base composition. The docstring discloses it;
the page does not. The figures are correct by the recount
(`count_polaris_effective_scenarios.py`: 38 requirements, 297 scenarios).
Repair I would accept (a later builder change, not a package-byte change):
name the launch-consent addition in the "without" sentence, or say that
figure includes it.

## Question-by-question

1. **Subject digest and spec bytes.** Yes. The SHA-256 of the subject at
   `2e630f5a` is the digest above, equal to round 4's head
   (`R-POLARIS-LAUNCH-CONSENT-4-RAW.md:4`) by string comparison. Round 3's
   head (`R-POLARIS-LAUNCH-CONSENT-3-RAW.md:4`) carries a different digest
   over `882d2297`; round 4 confirmed the round-3 repairs over `8e5754b9`, so
   the digest both rounds' chain ends on is round 4's. `git diff --stat
   8e5754b9 2e630f5a -- openspec/changes/polaris-dossier-launch-consent/proposed/`
   printed nothing.
2. **Edits to the change directory since `8e5754b9`.** `git diff 8e5754b9
   2e630f5a -- openspec/` touches exactly three files: `OWNER-PACKET.md`
   (:241-242, the identity residual now "at a commit that no record names,
   and whose parents no record names", matching spec.md:16), `SEMANTIC-DELTA.md`
   (:19, "a branch under `refs/heads/`", matching spec.md:23) and `tasks.md`
   (round 4 ticked). These are round 4's I1 repairs and the tick, and nothing
   else. Neither changes a meaning: each brings the companion file into line
   with spec bytes rounds 3 and 4 already confirmed. Outside the change
   directory the same diff adds the two package files, the builder, a
   `real_packages()` entry in the recorder and the round-4 raw and campaign
   line; none is a spec byte.
3. **OWNER-SIGNOFF.md.** The question (:15-18), the version (1.0) and the
   option label (:20, "Sign launch-consent spec version 1.0") are stated
   exactly and consistently with the recorder's tag form
   (`polaris-dossier-launch-consent-v1.0`). The "does not" list (:31-39)
   grants nothing beyond the owner's answers: the answers record grants no
   write consent (item 5), performs no screening-policy successor (item 2)
   and authorizes no implementation code, and the packet says each of these
   stays separate. The open notes are carried: I2, I4, I5 and I6 accurately;
   I3 with a narrowing (Finding 3); H8 by its content; G5, G7 and G8
   accurately; G6 inverted (Finding 1). Round 2's G9 is open and not carried
   (Finding 2).
4. **Builder.** In this worktree `--check` prints "OK: the package verifies
   (unapplied)" (exit 0); `--selftest` prints "25 fixtures, 0 failing";
   `count_polaris_effective_scenarios.py` reports 36 requirements and 270
   scenarios, equal to the page; `build_polaris_dossier_local_agent_mode.py
   --check` prints "OK: the package verifies (applied)";
   `record_versioned_signoff.py --check polaris-dossier-launch-consent
   --version 1.0` prints "not performed" (exit 0). In a scratch clone at
   `2e630f5a`, `apply()` returned 0 and printed "installed
   `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`;
   PROJECT-STATUS.md now reads 38 requirements and 297 scenarios". `git
   status` there showed the spec moved from `proposed/` to `specs/`, the
   `proposed/` directory gone, `PROJECT-STATUS.md` rewritten (both figures and
   the new link to the v1.0 record), `REVIEW-BRIEF-SIGNOFF.md` rewritten with
   the note keeping the path the review read, and the short span unquoted in
   `REVIEW-BRIEF.md`, `design.md` and `proposal.md`. This matches the
   docstring and `tasks.md`. After apply, the builder `--check` printed "OK:
   the package verifies (applied)", the recount printed 38 requirements and
   297 scenarios, equal to the page, and the local-agent builder `--check`
   printed "OK: the package verifies (applied)"; all exited 0. The one
   presentational residue is Finding 4.
