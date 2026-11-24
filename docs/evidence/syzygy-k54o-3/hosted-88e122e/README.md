# Hosted F3 results for 88e122e

Subject: `88e122e108e66418196f24d471417bd19cf6dd96`, tree `03525a5911216977e088b947d1c54149e4a66da6`.

[Observed] [Node run 45466219510](https://github.com/tzeusy-org/syzygy/actions/runs/45466219510) failed. Its 10 jobs completed in 573 seconds from run creation; the slowest job took 393 seconds. Core-3 failed the five-second parent-authority timer assertion (4999.476812000001 ms observed); stop-resume failed after a resumed runtime-authority refusal; eligible-stop-resume failed during ledger restoration. The required node aggregate failed at “every tier passed” and skipped receipt validation. Unit results were 6400 passed, 1 skipped of 6401 tests across 256 passed files, with the driver reporting 256 expected/collected/executed and no missing, extra or unexecuted files.

[Observed] [Governance run 45466219373](https://github.com/tzeusy-org/syzygy/actions/runs/45466219373) passed its 5 jobs. Run elapsed was 920 seconds; reconciliation took 908 seconds, governance 436 seconds, readability 193 seconds, P115 215 seconds, and the required aggregate 5 seconds. Reconciliation reports 549 of 549 mutants killed and 108 of 108 controls held. The 420-second budget is breached under both slowest-job and run-elapsed clocks; passing the checks does not satisfy that timing requirement.

[Observed] Four actual success receipts exist: core-1, core-2, complete and delivery-stop. Their downloaded ZIP bytes match the artifact API SHA256 digests. Each receipt binds tested PR merge `2b70df707652831d024e2ce084a693ede8e4a577`; its parents include the exact published head, and its tree equals the head tree. Missing core-3, stop-resume and eligible-stop-resume receipts leave the mandatory set incomplete (4/7).

The terminal API snapshot and derived final summary are deterministic gzip files (`mtime=0`). The snapshot retains timestamps and every step for all 15 jobs. Bounded log excerpts preserve original selected lines; native JSON files are timing projections rather than complete raw logs. No full raw-log digest or complete structured unit result is claimed. `source-binding.json` records frozen source digests and provenance limits; `manifest.json` binds every retained evidence file. No proposed source or workflow patch is part of this record.

[Unknown] The native refusal causes and a passing seven-minute result remain unestablished. These observations concern this exact published tree only.
