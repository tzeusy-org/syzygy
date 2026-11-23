# Dossier credential refusal evidence

## Patterns

- `syzygy-bpyt-8-15/CREDENTIAL-REFUSAL-R[12]-RAW\.md`

## What was under review

`syzygy-bpyt.8.15` restores the required adapter-credential open attempts and reports configuration refusal, indeterminate readability, and confirmed readability according to their evidence.

## Last verdict of record, and where the findings landed

[Observed] R1 issued `REVISE` for `b854cd2a` after three synthetic controls reproduced the missing configured-path fallback and combined refusal reasons (`syzygy-bpyt-8-15/CREDENTIAL-REFUSAL-R1-RAW.md:3`). R2 issued `CONFIRM` for `448ca31d` after those controls passed and an independent 154-case replay verified the revised attempt set and the pass and refusal decisions (`syzygy-bpyt-8-15/CREDENTIAL-REFUSAL-R2-RAW.md:3`).
