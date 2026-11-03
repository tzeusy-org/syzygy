# Screening scope v5 (bcd) install

## Patterns

- `R-PR599-V5-INSTALL-.*-RAW\.md`

## What was under review

The install of public-source screening scope version 5, variant `bcd`, in PR #599 (`syzygy-mea.4`), at the merge head `19ca2221`; implementation under the performed v5 policy act, binds nothing

## Last verdict of record, and where the findings landed

Code and security review at `19ca2221` is `CONFIRM WITH EXCEPTIONS` (`R-PR599-V5-INSTALL-19CA-1-RAW.md:2`), with no blocking finding. F1–F3 are filed as `syzygy-mea.8`; F4 (the install's mutation record names the pre-merge commit `70a45c78`) and F5 (the app reader's exemption has no class gate, pre-existing, no production caller) are kept on record. The raw is the reviewing subagent's final message, taken from its transcript because its own file write was cut off.
