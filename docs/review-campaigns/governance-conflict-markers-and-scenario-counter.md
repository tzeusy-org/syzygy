# Committed conflict delimiters and Polaris counter selftest

## Patterns

- `syzygy-vkw6-governance-checks/VKW6-COMMITTED-CONFLICT-DELIMITERS-R1-RAW\.md`
- `syzygy-vkw6-governance-checks/VKW6-COMMITTED-CONFLICT-DELIMITERS-R2-RAW\.md`
- `syzygy-vkw6-governance-checks/BSX9-COUNTER-SELFTEST-WIRING-R1-RAW\.md`

## What was under review

[Observed] Syzygy-vkw6 adds a check of committed conflict delimiters and its selftest. Syzygy-bsx9 connects the existing Polaris scenario counter selftest to the same local and hosted governance checks. Both change the published battery count.

## Last verdict of record, and where the findings landed

[Observed] The conflict scanner's first review recorded `REVISE` (`syzygy-vkw6-governance-checks/VKW6-COMMITTED-CONFLICT-DELIMITERS-R1-RAW.md:3`). It showed that a local Git replacement could hide markers under the original commit ID and that a nested file without the exact raw review suffix needed a negative control.

[Observed] The second review recorded `CONFIRM` after the checker disabled replacement objects and the fixture refused a matching nested non-review file (`syzygy-vkw6-governance-checks/VKW6-COMMITTED-CONFLICT-DELIMITERS-R2-RAW.md:3`). That review also reproduced the original three delimiters at `openspec/README.md` lines 69, 71, and 74 in the historical commit.

[Observed] The independent counter wiring review recorded `ACCEPT` (`syzygy-vkw6-governance-checks/BSX9-COUNTER-SELFTEST-WIRING-R1-RAW.md:3`). It verified both existing entry points and refused a stale historical fixture count through the required aggregate.
