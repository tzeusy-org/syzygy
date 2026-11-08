# Polaris dossier launch-time consent

## Patterns

- `R-POLARIS-LAUNCH-CONSENT.*\.md`

## What was under review

`syzygy-pdja.21`: the OpenSpec change `polaris-dossier-launch-consent` (REQ-polaris-generation-046 and 047), its owner packet and direction draft: consent asked once at launch for any repository whose source the owner holds, the revision defaulting to the trunk tip.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-POLARIS-LAUNCH-CONSENT-2-RAW.md:2`), over `3c00d2c8`, the confirmation round after the round-1 repair; by a stopping rule agreed before round 2, the packet went to the owner with what remained. The owner's answers of 2026-11-08 (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`) left one round-3 confirmation of the narrowed change in place, and the three revise findings below are repaired for it. No blocking finding. Three revise findings remain: the repository identity is re-derived from the remote URL at each launch (RFC1-2, RFC3-6) and can collide; the trunk-default branch matches a consent by derived identity more narrowly than REQ-046; and the classes shown before the answer are a preview the packet does not put to the owner. Six notes. Round 1 (`R-POLARIS-LAUNCH-CONSENT-1-RAW.md`, over `51375c8c`) was `REVISE`; its thirteen findings are dispositioned in the change's `ROUND-1-DISPOSITIONS.md`.
