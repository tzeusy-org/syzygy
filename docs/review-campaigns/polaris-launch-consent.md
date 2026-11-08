# Polaris dossier launch-time consent

## Patterns

- `R-POLARIS-LAUNCH-CONSENT.*\.md`

## What was under review

`syzygy-pdja.21`: the OpenSpec change `polaris-dossier-launch-consent` (REQ-polaris-generation-046 and 047), its owner packet and direction draft: consent asked once at launch for any repository whose source the owner holds, the revision defaulting to the trunk tip.

## Last verdict of record, and where the findings landed

`REVISE` (`R-POLARIS-LAUNCH-CONSENT-1-RAW.md:2`), over `51375c8c`. One blocking finding (the no-read-before-answer rule contradicts the reads the trunk default, the governed check and the content-class answer need), seven revise and five notes; all go to the drafting session's round-1 repair.
