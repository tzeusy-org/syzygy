# Private browser guardian scan reads (syzygy-pmy0)

## Patterns

- `R-PMY0-GUARDIAN-SCAN-READ-\d+-RAW\.md`

## What was under review

PR #821 (`syzygy-pmy0`): the test-only private browser guardian `scripts/poc_browser_lifetime.py` reads `/proc` stat bodies with raw `os.open`/`os.read`, decoded with the same codec, and lists `/proc` with `os.scandir`, with the 3 s deadline, per-signal family scans, refusals, two empty scans and the acknowledgement unchanged; plus its lifetime-test fixture, the e2e lifetime phase and the retained evidence and tools; test tooling, binds nothing

## Last verdict of record, and where the findings landed

Round 2 `CONFIRM WITH EXCEPTIONS` (`R-PMY0-GUARDIAN-SCAN-READ-2-RAW.md:2`) over `8d9ab2d8`: round 1's F1-F6 (`R-PMY0-GUARDIAN-SCAN-READ-1-RAW.md:2`, `CONFIRM WITH EXCEPTIONS` over `7060b9f6`) all hold, F3 restored to the predecessor's scan rows. G1 (the 4.03 s margin figure is a refusal time on another case, so it gives no completion estimate) is repaired in wording in the PR body and `docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json`. G2 (the committed race differential is close to a tautology against af485ea3; its F3 sensitivity rests on the aligned mutant control) and G3 (unit-tier 5 s timeouts in two untouched files under load) are notes, left open.
