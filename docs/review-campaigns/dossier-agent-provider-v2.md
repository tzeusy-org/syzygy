# Agent-provider statement version 2

## Patterns

- `R-DOSSIER-AGENT-PROVIDER-V2-.*\.md`

## What was under review

Candidate consent successor `contracts/candidates/dossier-agent-provider-v2/` and `scripts/build_dossier_agent_provider_v2.py` (PR #404) for Redis, Claude Code with Anthropic; binds nothing

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-DOSSIER-AGENT-PROVIDER-V2-1-RAW.md:4`) over `897910fc`, confirming the record bytes at the manifest row. The two revise findings concern the install list, not the act's argument: the `--tool` override (now `syzygy-up98`, named as a prerequisite) and the reverse-direction sweep collision. These and notes 3–6 are taken in the delta. The builder's 64-hex sweep is now recursive, with a mutant (13 of 13). The record and the manifest are unchanged. Round 2 `CONFIRM WITH EXCEPTIONS` (`R-DOSSIER-AGENT-PROVIDER-V2-2-RAW.md:4`) over `5db1dd72`: every round-1 finding repaired; three notes, no revise, which clears the package at its manifest under the notes-only rule. Note 1 (the `--tool` prerequisite has landed) is taken in the delta: it is met by #406, merged at `ff9a19b6`. Notes 2 (the aggregate record does not name version 2) and 3 (an install requirement: version 2's own act prose and stems must not close other gates) are dispositioned in the package's `ROUND-2-DISPOSITIONS.md`
