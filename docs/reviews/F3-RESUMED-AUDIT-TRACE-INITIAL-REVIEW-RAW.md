# BLOCK

[Observed] Reviewed commit `9d830473bcfeba185e506762c4e02c923a5fc379` against `08a089b2c7427009fe6ef6593ccc676b4bd8f6c6`. The diff changes `packages/polaris-dossier/src/session-launch.test.ts` and `packages/polaris-dossier/src/url-run-composed.test.ts`. `git diff --check` passed.

## Directory-open retry · PASS

[Inferred] The fixture waits until the genuine native tool reaches the host’s `beforeTool` gate, changes the work directory, and advances only the interval clock. The sample keeps its real monotonic clock, inspection deadline, filesystem operations, and launch authority. Each case asserts one sample and exact root-open and child-removal counts. The successful retry also checks that the retained entry was inspected on the second open. The `finally` blocks release the tool, stop the child, and restore the timers. `session-launch.test.ts:1184–1249`

[Observed] The targeted integration run passed four cases: one disappearing child, two disappearing children, simulated root `ENOENT`, and replacement of an enumerated directory by a regular file. Twenty-seven other tests were skipped.

## Resumed audit setup trace · BLOCK

[Inferred] The trace starts after the withdrawal controls, returns the original authority value or promise, and reports a fixed set of counts, timings, and outcomes. The cutoff is late on a fulfilled audit result. The `.catch` forwards fulfillment to another promise before the `await` continuation runs, and the continuation then calls `actual.summary()` before recording settlement. A callback that outlives a refused setup can settle in that gap and change the reported authority counts and duration. The audit already supports returning a refusal while a callback is pending. `url-run-composed.test.ts:953–986`, `url-session-audit.ts:425–434,1440–1442`, `url-session-audit.test.ts:747–752`

[Observed] A standalone Node promise-ordering probe counted authority after the audit promise settled with the current `.catch` and `await` sequence. A direct settlement handler avoided that ordering in the same probe. The composed native `stop-resume` scenario was outside this review’s runtime verification.

[Inferred] Attach settlement handlers directly to the audit promise and set the settlement timestamp and outcome before reading the summary. Forward the original audit result or rejection and keep returning the original authority promise.
