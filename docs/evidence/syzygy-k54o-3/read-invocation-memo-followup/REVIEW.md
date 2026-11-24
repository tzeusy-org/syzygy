# Invocation-local memo candidate

[Observed] Subject base: a303bc56e86f65e252aa13663827d46bdcc104f2, scripts/check_spec_reconciliation.py SHA-256 b0886d00ab1d17251a9bc0b0fc7cfa0485125a1d0b9768c0fab38fe90eb0dd67. Primary unchanged by this task; all candidate bytes and evidence are external.

[Observed] Existing signoff-entry-socket consumers were called separately exactly once, in the original four-consumer order, in one scratch fixture: run 3.685193s, census 0.000366s, check_outcomes 65.292818s, check_census 0.000533s. Each existing exact OSError+filename assertion held. JSON and raw progress-log populations independently agree on four consumers with one invocation each. This was a cold reverse-cache scope; order and shared reverse cache can affect costs. These are not interchangeable clean-baseline benchmarks and do not establish candidate benefit. No candidate real checker call was executed.

[Inferred] The measured socket hotspot is standalone check_outcomes, which repeatedly derives bindings without run's memo. A census-only patch would miss it. The candidate therefore factors run's cache policy into one reentrant context manager and decorates the existing run/check_outcomes/census/check_census entry points. check_census owns the scope around both census and its subsequent binding calls. Nested calls keep the same dictionaries and D10 wrapper; the outer call discards them before the caller can mutate a fixture. Factoring the existing policy avoids competing implementations of cache setup, D10 wrapping, and finally restoration.

[Observed] _per_run is byte-for-byte unchanged: resolved-root/function key, deepcopy per answer, override/kwargs/arity bypass remain. Source AST proof preserves all 253 other old function bodies after removing only three added decorators; run's report/check/return statements retain exact order. All canonical selftest fixtures, controls, guards, CLI arguments, skip metadata and witness joins are unchanged. No canonical case was added. There was no existing cache-boundary fixture identified by the scoped cache-boundary searches; the retained external harness supplies narrow boundary verification without growing the real population.

[Observed] Isolated extracted-helper harness: 16/16 synthetic cases pass, and three exact mutants are killed (remove nested-owner guard; remove override bypass; retain stale memos). It executes no project import, fixture, subprocess or full selftest. The retained script is rerunnable and binds the candidate bytes. verify_static.py independently checks old/new AST, patch identity and measurement denominator against raw log. Syntax warning in measurement log is retained verbatim.

Fresh review criteria:
- Verify new decorators execute only after module initialization and helper resolves later-defined globals safely.
- Verify outer scope restores exact previous signed/run memo objects and D10 function on normal return, body exception and wrapper-setup exception; nested scope never clears owner state.
- Verify overrides bypass memo reads and writes; deepcopy and resolved-root separation are unchanged; no invocation survives fixture mutation.
- Verify every canonical body/assertion/argument is unchanged, with run's original check order retained.
- After review/adoption, execute bounded real original-vs-candidate consumer comparison followed by the complete canonical selftest in a clean clone, compare full ordered witness population, and collect hosted timing. Do not treat this packet as those checks.

[Unknown] Candidate wall-time effect, effect on prefix-mutants, repaired serial baseline, full canonical success, and satisfaction of the 420-second hosted job/run requirements. Actual a303 hosted reconciliation passed functionally but took 631 seconds job / 616.302 seconds profile total; prefix 183.296 seconds and entries 149.619 seconds. This patch has no timing guarantee.
