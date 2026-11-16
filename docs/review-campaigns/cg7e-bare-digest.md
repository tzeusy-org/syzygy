# CG-7e bare digest headings

## Patterns

- `R-CG7E-BARE-DIGEST-.*\.md`

## What was under review

`check_governance.py` CG-7e checks each bare `<qualifier> SHA-256:` heading in a registered act-copy file against that file's own declared digests, `syzygy-eau` (PR #130)

## Last verdict of record, and where the findings landed

`REVISE` (`R-CG7E-BARE-DIGEST-REVIEW-RAW.md:1`): the first fix matched only the literal `Manifest SHA-256:` spelling and left 15 qualified bare copies (three live bypasses) unchecked; repaired by generalizing to every `SHA-256:` heading with two checked container exemptions; confirmation `CONFIRM WITH EXCEPTIONS` (`R-CG7E-BARE-DIGEST-CONFIRMATION-RAW.md:1`) with one revise-severity finding (4: lowercase `sha256` and colon-less headings, four more live bypasses), repaired by a case-insensitive, colon-optional heading pattern; second confirmation `REVISE` (`R-CG7E-BARE-DIGEST-CONFIRMATION-2-RAW.md:1`): 12 unlabeled copies of act arguments (act-identity lines, table cells, a checksum row, one owner phrase) still masked by a correct copy elsewhere in the same file.
