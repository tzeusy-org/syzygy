# The launch type test reads an object's header, never its body

## Patterns

- `R-PDJA-30-.*\.md`

## What was under review

`syzygy-pdja.30`, in PR #816:
- `storedType` in `git-object-reader.ts` answers an object's type from its header alone, for a loose object, a pack entry and a delta's base chain;
- `isCommit` in `launch.ts` uses it, so a `--revision` naming a tag or a blob is refused without its body being read.

## Last verdict of record, and where the findings landed

Round 1 returned `REVISE` (`R-PDJA-30-1-RAW.md:4`) over `69d96fcf`.

- **Finding 1 (revise):** the REF_DELTA header path was never exercised. Tests now cover three REF bases, each with its bodies made unreadable:
  - a reference delta in git's own pack;
  - a base in a second, hand-built pack;
  - a loose base.

  The reviewer's mutants R1, R3 and R6 are killed, and the test name no longer claims "both delta forms".
- **Finding 2:** the guards are now tested, killing R2, R4 and R5:
  - a REF cycle refuses at the chain depth;
  - a loose stream with no header end within 1024 stored bytes refuses;
  - a loose stream that inflates past 32 bytes with no NUL refuses.
- **Finding 3:** the launch read log now records what `storedType` resolved to, so a header answer can be told apart from a refused full read.
- **Findings 4 and 5:** disclosed in the PR body as an owner residual.
- **Findings 6–9:** need no change.

All 13 mutants were killed at `902d38cd`. The record is `docs/evidence/syzygy-pdja-30/pdja-30-mutants-2026-11-10.json`.
