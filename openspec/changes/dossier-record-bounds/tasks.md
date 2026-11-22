## Delivery

- [x] Measure the check record's worst case from the stated caps (`docs/evidence/syzygy-3efd-73/record-bounds-measurement-2026-11-22.json`).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 and its semantic delta.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases.
- [x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned.
- [x] Append the agent-adoption row naming the installing commit (A-31).
- [ ] Create the version tag `polaris-dossier-record-bounds-v2.10` at the installing commit once it is on the default branch.
- [ ] syzygy-3efd.73 (a): the bounded form in `check.ts` for both subjects, the finding kind, `findingsLeftOut`; tests at and past the byte bound, the value and depth arms through an injected measure, with findings, and goldens of records within the bound unchanged.
- [ ] syzygy-3efd.74: every check record read by one open, regular-file and size check before any byte, and at most bound + 1 bytes, under `CHECK_RECORD_LIMITS` by `inventoryOfRecord` and the supervisor; `readUnbounded` removed; tests at 262,145 bytes and 4,097 values (now counting) and at 16,777,217 bytes (refused before any byte is read), a link to `/dev/zero`, a FIFO, a directory and a growing file refused without blocking, the supervisor neither proceeding nor stopping.
- [ ] syzygy-3efd.73 (b): `unusable` in `derivedStructureAt`, `LocalDerivedStructure`, the region's words by state, `machine.json` and `computedMaps`; tests for a record refused under a changed screen, removed, a directory, FIFO or device at its path, and an unexaminable path; the provider golden unchanged.
