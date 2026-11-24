# Specification reconciliation memoization

## Patterns

- `syzygy-v0b5/V0B5-MEMO-TECHNICAL-R1-RAW\.md`
- `syzygy-v0b5/V0B5-MEMO-TECHNICAL-R2-RAW\.md`
- `syzygy-v0b5/V0B5-MEMO-TECHNICAL-R3-RAW\.md`

## What was under review

[Observed] The reconciliation checker repeats the D10 state and versioned binding lookups during a run and applies the same reverse patches across the selftest cases. The review examined the recovered performance change against protected main.

## Last verdict of record, and where the findings landed

[Observed] The technical review records `REVISE` (`syzygy-v0b5/V0B5-MEMO-TECHNICAL-R1-RAW.md:1`). The repaired checker sends Git the same patch bytes it hashes and bounds retained reverse results within one check or selftest. Binding registration stays within functions defined by the checker module. The [focused controls](../evidence/syzygy-v0b5/cache-protection-controls-2026-11-24.json) bind those bytes and record the intentionally broken cases.

[Observed] The second review confirmed the first repairs and recorded `REVISE` for the exception raised when a discovered patch became unavailable (`syzygy-v0b5/V0B5-MEMO-TECHNICAL-R2-RAW.md:1`). The checker again refuses the reversal when it cannot read the patch. The third review records `CONFIRM` after exercising both normal callers with missing and unreadable patches and with cold and warmed caches (`syzygy-v0b5/V0B5-MEMO-TECHNICAL-R3-RAW.md:1`).
