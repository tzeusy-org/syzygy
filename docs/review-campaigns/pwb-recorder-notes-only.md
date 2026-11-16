# Recorder notes-only verdict

## Patterns

- `R-PWB-RECORDER-NOTES-ONLY-.*\.md`

## What was under review

`record_pwb_behavior_amendment_acts.py` accepts a notes-only `CONFIRM WITH EXCEPTIONS` bound to a disposition record, per the 2026-09-26 gate-sitting direction §1 (PR #118), then hardened (PR #125)

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PWB-RECORDER-NOTES-ONLY-REVIEW-RAW.md:1`), notes only; notes 7 and 8 went to `syzygy-qqt`, repaired by PR #125. PR #125: `CONFIRM WITH EXCEPTIONS` (`R-PWB-RECORDER-NOTES-ONLY-HARDENING-REVIEW-RAW.md:1`), notes only; notes 5 (fence corner case) and 9 (whole-document finding scan) are dispositioned to `syzygy-4yr` before any package is wired. Opening-band wiring (PR #166): `REVISE` (`R-PWB-RECORDER-NOTES-ONLY-OPENING-BAND-WIRING-REVIEW-RAW.md:4`), one revise finding (a digest heading inside a code fence), repaired; confirmation `CONFIRM WITH EXCEPTIONS` (`R-PWB-RECORDER-NOTES-ONLY-OPENING-BAND-WIRING-REVIEW-2-RAW.md:4`), notes only, left in place on the cleared bytes.
