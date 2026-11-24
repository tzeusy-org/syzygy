# Standalone reconciliation read consumers

[Observed] A-235 applies the existing invocation-local memo scope to check_generated and check_routes. Those standalone read-only calls previously derived bindings repeatedly; run already supplied the scope. Exactly two decorators change. Fixture bodies, predicate order, override bypass, defensive copies, restoration and parallel policy remain unchanged; canonical case growth is zero.

[Observed] Fresh source review returned PASS. Ten complete original/candidate/mutant consumer calls and two early-exception controls passed on a private real-input fixture. Full reports match, changed generated-source and route inputs still fail, restored inputs pass, removing either decorator restores repeated real D10 lookups, and the same exceptions/state identities are restored.

[Observed] check_generated: 3132.132ms original and 652.456ms candidate; actual D10 lookups 38 to 1. These are scoped local measurements, not hosted acceptance.

[Observed] check_routes: 2797.367ms original and 416.748ms candidate; actual D10 lookups 38 to 1. These are scoped local measurements, not hosted acceptance.

[Observed] The original full selftest with structured witnesses passed at exact clean commit 77be72c353eb031dcb03db0bae82b5e4bbf27faa in 227.051 seconds:566 expected-predicate mutants killed and113 controls held. The independently counted witness file has679 unique IDs and the same566/113 outcome split. The canonical-679 archive retains complete output, command, subject and re-runnable old/new witness fragments. This is the reconciliation selftest, not the full repository battery.

[Unknown] Exact final published hosted timing under420 seconds and the complete repository battery remain pending. The dominant prefix-mutant phase is unchanged. Frozen preparation records retain their original unexecuted labels; the separate executed result supplies the current verification state.
