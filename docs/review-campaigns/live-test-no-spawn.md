# Live test no-spawn

## Patterns

- `R-LIVE-TEST-NO-SPAWN-.*\.md`

## What was under review

Pre-merge review of the live verification test reading an operator-reported JUnit file instead of running pytest, its import-closure source check, and the `syzygy-z774` repairs (PR #386, `syzygy-hjuz`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-LIVE-TEST-NO-SPAWN-1-RAW.md:2`) over `1d053f12`: two revise findings (a TypeScript `import x = require(…)` escaped the closure check and started `sh`; a literal `git` command still runs a shell through `-c alias.…`) and four notes (a re-export from the process module; git reads the checkout's own config; the printed command is unquoted; the docs sentence is broader than the code), repaired in the same PR. Round 2 `REVISE` (`R-LIVE-TEST-NO-SPAWN-2-RAW.md:2`) over `5a50f004`: round-1 findings repaired; two revise findings (git still starts a program through literal arguments and a call's `env` option; `vi.importActual` loads the process module by a run-time name) and three notes (survivor records carry no reason; `cd` reads a leading `-` as an option; the capture tool has no new route), repaired in the same PR: an `env` key and every vitest import but a named allow-list are refused, and the residual is restated as git's whole class. Round 3 `REVISE` (`R-LIVE-TEST-NO-SPAWN-3-RAW.md:2`) over `c74214e1`, the final round: round-2 findings repaired; two revise findings (the runner's `shell` option runs the joined line under `/bin/sh`; `import.meta.glob` loads a refused package through Vite's transform) and three notes (the capture tool's printed `cd` lacks `--`; two whole-file mutants record placeholders and a moving ref; the git residual is honest as bounded). Under the stopping rule the lead decided the repairs with no fourth round: a git or bd call's options are limited to `encoding`, `maxBuffer` and `stdio`, `import.meta` is refused in the closure, the capture tool prints `cd --`, and the whole-file mutants are pinned to a SHA
