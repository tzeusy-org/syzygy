# Machine peer synchronous guard binding

[Observed] Source commit `6dcfa2e73c08e8de14271b5807373037786a77f5` refreshes only the full-module TypeScript-printer fingerprint after A-236. The complete `runNative` declaration and exact synchronous call remain identical to the predecessor; the fixed image, CPU, timeout, output and capacity restrictions and every admission predicate remain.

[Inferred] Fresh independent source review verdict: PASS. The archive retains the verbatim raw and exact original/candidate/context bytes.

[Observed] On a clean d8e base with the exact one-line overlay, the entire existing guard file passes11/11 cases, including its native-call mutation controls. Restoring the old pin makes the intended source-census assertion fail:1 failed,10 excluded. No tests added or removed. The archived JSON retains actual names and errors; the scoped runner retains commands and exact mutation/restoration.

[Unknown] This proves no native recovery, full canonical result or hosted readiness. Profile9 is outside this guard-only execution scope.

Archive SHA256: `f93d4d8d745f1deb8b0c8933e8af18eb5f83d2199556c4a06f29092560be4df1`; 51519bytes. `MANIFEST.json` binds each retained payload; extract the archive outside the repository for review.
