# Trajectory dependency eligibility

## Patterns

- `T3JK19-TRAJECTORY-DEPENDENCY-DELTA-R1-RAW\.md`
- `T3JK19-TRAJECTORY-DEPENDENCY-DELTA-DISPOSITION-RAW\.md`
- `T3JK19-TRAJECTORY-DEPENDENCY-RUNTIME-R1-RAW\.md`

## What was under review

[Observed] Independent semantic review of the Trajectory POC-REQ-062 candidate on the fixed `640c0626567c7904398adf8ffc8961fed382f1ac` subject. The added obligation derives eligibility from revision-bound dependency metadata and keeps the shared work-item observation and view grammar.

## Last verdict of record, and where the findings landed

[Observed] R1 returned `REVISE` (`T3JK19-TRAJECTORY-DEPENDENCY-DELTA-R1-RAW.md:3`). The semantic delta's two numbered dispositions require a source-resolved witness for the empty case and preserve known blockers when a distinct edge leaves whole eligibility undetermined.

[Observed] The exact follow-up on the two dispositions returned `CONFIRM` at `409044a94c25059579e17598b243390f9cbea646` (`T3JK19-TRAJECTORY-DEPENDENCY-DELTA-DISPOSITION-RAW.md:3`).

[Observed] Implementation R1 returned `REVISE` at `04dfaa80cac19164d01c1b6ccdb0b688cad8d7dd` (`T3JK19-TRAJECTORY-DEPENDENCY-RUNTIME-R1-RAW.md:3`). The work-item reader now requires a valid Dolt commit hash and the same-statement revision witness before constructing observed provenance. Tests independently exercise a nonempty result with no witness, a malformed matching revision, duplicate witnesses and witness/row revision disagreement. All four cases skip the dependency statement.
