# Polaris dossier launch-time consent

## Patterns

- `R-POLARIS-LAUNCH-CONSENT.*\.md`

## What was under review

`syzygy-pdja.21`: the OpenSpec change `polaris-dossier-launch-consent` (REQ-polaris-generation-046 and 047), its owner packet and direction draft: consent asked once at launch for any repository whose source the owner holds, the revision defaulting to the trunk tip.

## Last verdict of record, and where the findings landed

`REVISE` (`R-POLARIS-LAUNCH-CONSENT-V1-2-3-RAW.md:4`), over `3ab7c949`, the third review of package `polaris-dossier-launch-consent` v1.2 (existing full clones and any https or ssh locator, owner direction `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`). It has three revise findings and three editorial notes, all in the full-clone reading design. Under the stopping rule the package went to the owner, who chose a redesign (Syzygy copies the trunk-tip commit from the operator's clone over Git's local file transport; the direction record's section of 2026-11-10). The six findings are disposed as superseded in `polaris-dossier-launch-consent-v1-2/ROUND-3-DISPOSITIONS.md`; the redesign awaits a fresh review, round 4.

Round 2 of v1.2 was `REVISE` (`R-POLARIS-LAUNCH-CONSENT-V1-2-2-RAW.md:4`), over `82399c9b`: three revise findings and three editorial notes, disposed in `ROUND-2-DISPOSITIONS.md`.

Round 1 of v1.2 was `REVISE` (`R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md:4`), over `bec95fd4`: three revise findings and nine notes, disposed in `ROUND-1-DISPOSITIONS.md`.

Version 1.1's review was `CONFIRM WITH EXCEPTIONS` (`R-POLARIS-LAUNCH-CONSENT-V1-1-1-RAW.md:4`), over `8ee0eec0`, the first review of package `polaris-dossier-launch-consent` v1.1 (the name-on-branch warning, owner answer `syzygy-pdja.23-confidence` C). It has six notes and none requires a change, so v1.1 may be offered for sign-off. The notes are carried unrepaired in `polaris-dossier-launch-consent-v1-1/ROUND-1-DISPOSITIONS.md`.

Version 1.0 was signed 2026-11-08 on `CONFIRM WITH EXCEPTIONS` (`R-POLARIS-LAUNCH-CONSENT-SIGNOFF-2-RAW.md:2`), over `46da209a`, notes only, carried in the v1.0 package's `ROUND-2-DISPOSITIONS.md`. Its earlier rounds:
- Sign-off round 1 (over `2e630f5a`) was `CONFIRM WITH EXCEPTIONS` with one revise, repaired.
- Spec rounds 4 and 3 were `CONFIRM WITH EXCEPTIONS` (over `8e5754b9`, `882d2297`).
- Spec round 2 was `CONFIRM WITH EXCEPTIONS` (over `3c00d2c8`).
- Spec round 1 was `REVISE` (over `51375c8c`).
