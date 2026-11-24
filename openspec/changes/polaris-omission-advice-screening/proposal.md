# Screen omission advice identifiers

> **Candidate.** The effective requirement is system-model version 2.24. This proposal records the reviewable change before version allocation.

[Observed] REQ-polaris-generation-034 emits draft-authored omission identifiers in three lists in the immediate check report. Its existing path screening accounts for withheld paths separately. The issue is recorded in syzygy-9xvm.

[Inferred] Apply the bound secret detector at the point where those three lists are emitted. Keep the remaining identifiers useful to the author and account for withheld values with a count per list. The [semantic delta](SEMANTIC-DELTA.md) binds the proposal to the effective source, and the [design](design.md) describes the report contract.
