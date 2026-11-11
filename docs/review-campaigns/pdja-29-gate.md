# Source-acquisition sign-off gate moved to v1.1

## Patterns

- `R-PDJA-29-GATE-.*\.md`

## What was under review

`syzygy-pdja.29`, items 1 and 1a of the `public-git-source-acquisition-local-agent-v1-1` impact ledger: the code the signing commit of registry entry v1.1 needs. `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` moves to the v1.1 record and the tests pinning v1.0 follow. The work is on branch `agent/syzygy-pdja-29-gate-v1-1`, which has no pull request.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-29-GATE-1-RAW.md:4`), over `58f890e8`, round 1. It has one revise finding and three notes:
- Finding 1 (an exempt record read past at any rendering of its template) is repaired at the root:
  - the v1.0 record is pinned to its recorded SHA-256;
  - every remaining template exemption (the Anthropic v1/v2 statements) has its slot values swept and its owner-selection slots refused on a 64-hex token.
- Finding 2 (no sign-off test pins the exemption to its file) is repaired by tests that put the v1.0 record, and a fresh rendering of it, at another decisions path.
- Findings 3 and 4 need no change. The battery's v1.1 `--check` line belongs to the signing commit.

The rule-6 record is `docs/evidence/syzygy-pdja-29/gate-v1-1-r1-repair-mutation-2026-11-11.json`.
