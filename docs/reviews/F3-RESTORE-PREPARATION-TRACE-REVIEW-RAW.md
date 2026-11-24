# F3 restoration preparation trace source review
Verdict: PASS
Reviewed commit: 0977e6cc65d3a268edaedfcd62079dae02974222
Base commit: 2446c64edb7bb9e0c89169bddd129efca36cad65
Combined binary delta SHA-256: 1ddcf71777fb1179eef2aa6c89f25c910766cac50ff2b2e92b0b91019062d080
Reviewed test file SHA-256: 330cb8d3a8104ffc42682e1971e9dc0abb9deaeb4bf074bdd3991ff5529ae651

[Observed] The binding was recomputed from `git diff --binary <base> <subject>` without a path filter. Its digest matches the supplied value. The changed-file population contains one path: `packages/polaris-dossier/src/url-run-composed.test.ts`. The worktree HEAD equals the reviewed commit, and the reviewed test and two governing source files have no worktree delta from that commit.

[Inferred] PASS applies to the bounded, test-only restoration preparation observer delta. I identified no review finding requiring a change within the supplied acceptance criteria. This is a source review with an isolated wrapper exercise; it is not native acceptance.

## Scope and acceptance assessment

[Observed] I read the artifact and its complete delta, the relevant preparation/verification/probe/one-use paths in `session-launch.ts` and `session-url-view.ts`, repository operating instructions, and the engineering-bar skill. I did not use prior review verdicts or native-run evidence. The engineering-bar criteria applied here are explicit control flow, diagnosable failure paths, independent review, and risk-scaled verification.

- [Inferred] Bounded traces: `restorePreparationStep` retains at most twelve steps per retained role; `observeRestorePreparation` retains at most four role entries. Further calls increment omission counts and still invoke the original operation. The phases and outcomes are closed unions. The new field contains role names, phase names, outcome names, numeric timing/count metadata, and an explicitly allow-listed refusal code.
- [Inferred] Preparation semantics remain with the original implementation. The wrapper delegates once and returns the original preparation promise. Its current callback invokes the original callback once, returns its original boolean or promise, observes settlement separately, and rethrows the same synchronous error. Verification/probe spies forward the original argument tuple, return the original promise, preserve values and rejections, and retain only the allowed code. The original directory checks, trusted-file verification, namespace probe, cleanup, capability registration, expiry/repreparation, and one-use consumption remain in the unchanged source.
- [Inferred] Scope is preserved through the two AsyncLocalStorage contexts. Outside a restoration trace, the preparation wrapper passes through the original input. Outside a role context, verification/probe wrappers invoke the original operation without retaining a step. A retained current callback called later outside the role context passes through. The caps likewise leave the delegated operation active.
- [Inferred] Future resumed Design observation is preserved. The phase spies are installed before the scenario runs; they do not replace the preparation spy after the later `observeDesignRun` call. `observeRoleLaunches` composes the restoration observer around its selected `prepareWithTrace` callback, so the later Design inspection-authority observer and `remember` callback remain in that route.
- [Inferred] Output discipline holds for the added `resumePreparations` field at its compact and retained output sites. It does not copy paths, input bodies, support digests, probe facts, error objects, or error messages. Existing surrounding diagnostics already carry other fields; this review does not claim the complete pre-existing manifests contain metadata only.
- [Observed] Existing expect-rooted call-expression source text is identical in sequence between base and subject: 223 expressions. An independent line-based comparison found 109 lines containing `expect(` in each version, with the same SHA-256, `37b1e8af50c04426c9a8cb086695ca8644a9db89c3acbda7da8cd496317d665e`. The reviewed delta leaves the existing assertions, scenario population, and test timeouts in place.

## Verification and limits

[Observed] A one-off Node harness extracted and transpiled the exact new helper block plus the pre-existing `observe` helper from the subject commit. It exercised outside-scope input/promise identity; synchronous true/false and asynchronous true/false current callbacks; original synchronous throw and asynchronous rejection identity; verification/probe argument and promise identity; accepted/refused/rejected phase outcomes; unknown refusal-code exclusion; four retained roles with two omitted roles; twelve retained steps with three omitted steps per role; and finite timestamps in those samples. Those checks passed. The harness used synthetic callbacks and module-spy stand-ins, not actual native preparation or a Vitest module graph.

[Observed] Source binding for the unchanged governing files was independently recomputed at both commits:

- `session-launch.ts`: `ba7e95f7271aa26ac41b22ccf92ad1dc0e2e8b5c4829238872cb936c38e946f8`.
- `session-url-view.ts`: `b9a4d86ca39b84c7787aa30846bd14f66e24e43f01c858243ac37fb89fd3d99b`.

[Unknown] Native success, actual restore timing under load, and the actual Vitest import/spy graph were not exercised by this review. No broad tests, typecheck, governance battery, native role processes, provider calls, or full composed scenario were run. The trace is phase-level observation, not an exhaustive timeline of directory checks, file hashing, cleanup, or the probe's internal lexical verification call. Observer callbacks add timing overhead and do not suspend the original deadlines.

[Observed] Review changes are limited to this new raw file. Semantic source and existing raw reviews were not edited. The unrelated untracked native-interruption evidence file present on entry was left untouched.

## Patterns

[Inferred] Returning the original promise while attaching observation separately avoids replacing preparation authority with a diagnostic result. AsyncLocalStorage provides an explicit restoration boundary without reinstalling a global preparation observer after Design setup. Bounded retained arrays plus omission counts keep diagnostic size controlled while preserving the original operations. A closed refusal-code allow-list keeps useful failure distinctions without retaining arbitrary failure text.
