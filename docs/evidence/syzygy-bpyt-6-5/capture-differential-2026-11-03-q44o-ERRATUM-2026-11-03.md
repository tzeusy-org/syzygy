# Erratum, 2026-11-03: `capture-differential-2026-11-03-q44o.json`

Subject: `docs/evidence/syzygy-bpyt-6-5/capture-differential-2026-11-03-q44o.json`,
sha256 `2e0f062bf83531add7a5724c237ba0618014b4acacbe586ff74f0455a29d5adb`
(bytes unchanged; this file corrects what the record says it establishes and
edits nothing in it). Source: findings E1 to E5 of
R-GP-IMPL-PWB-ONE-BLOB-READER-CAPTURE-1-RAW.md under docs/reviews/ (PR #609,
branch agent/syzygy-8s06, not yet on main; verdict CONFIRM WITH EXCEPTIONS); tracked as `syzygy-i5fv`.

## Corrections (E1)

1. **AC 3 of `syzygy-bpyt.6.5` is NOT met in its capture half.** AC 3 reads
   "Ledger counts, breach findings, degradation state and all rendered/machine
   bytes identical on fixtures and a capture." The record's `capture.liveMode`
   says AC 3's "capture" "remains met by the object-database stand-in only".
   That sentence is withdrawn. An object database the harness builds from the
   PR's own fixture text is a fixture, not a capture. What the record does
   establish [Observed]: a differential over a real Git object database read
   through the production `gitRunnerFor`, on fixtures. The capture half stays
   open until the owner runs the live mode over the registered checkout behind
   the real P1 gate and `compare_capture_v2.py` (below) exits 0.
2. **The `scale` scenario is not "sized as the retained Butlers capture".**
   `capture.used` says it is. It reads 226 sources and 205 items; the retained
   capture `docs/evidence/smooth-example-live-run-2026-10-03.json` reads 285
   sources, 392 items and 416 facts. That is about four-fifths of the sources
   (79%) and about half the items (52%). Read "sized as" as "smaller than".

## Additions for E3 (done in this change)

- Comparator hardening: `compare_capture_v2.py` reports a missing `mode`,
  `shapes` or `gitCalls` section as a finding (exit 1) where
  `compare_capture.py` died with `KeyError`. `compare_capture.py` is kept
  byte-for-byte (sha256 `9fa7b974b57b51480dd36e461a2ab6c8c5f75b177b16d6ed97e0c3c9535a5f9b`)
  because the record cites that digest; the v2 logic is otherwise identical.
- Rule-6 record with old/new fragments: `capture-rule6-mutants-2026-11-03-i5fv.json`,
  produced by `run_capture_mutants.py` over regenerated capture outputs at the
  record's base and head commits (output digests equal the record's
  `outputs.cap-base` and `outputs.cap-head`). 12 cases (one no-op control, 11
  mutants). Original comparator: all 11 killed (exit 1) but three
  section-absent mutants end in a traceback. v2: all 11 killed, no traceback,
  control exit 0. This supersedes the record's `rule6.results` (counts only).

## Still open (not addressed here)

- E2: no `limitBreaches` path is exercised through a real object database
  (all 11 scenarios record `limitBreaches: []`); the breach half of AC 3 is
  covered in memory only, by the v1 differential.
- E4: the as-run bytes of the capture harness (sha256
  `86079f35e247271e37dc3f23e4808e7b41a0bc440259bb346f8dd9ef45c749f3`) are
  retained nowhere; "no code line changed" cannot be re-checked. The reviewer
  and this change reproduced the recorded output digests with the retained
  bytes, which is the evidence to rest on.
- E5: live mode is not bound to the registered repository; the base and head
  runs are gated at different governance revisions; neither comparator reads
  `admits`.
