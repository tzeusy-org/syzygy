# syzygy-bpyt.7.12: export census repair and core un-export

Implementation-plane evidence for bead `syzygy-bpyt.7.12`, which consolidates
`syzygy-bpyt.7.10`. Authority: the owner direction on greenfield parity
simplification of 2026-10-20 and GP-Q0 in the answers of 2026-10-21. It binds
no digest and adds no act. CC-REV-1 classes touched: none (export visibility
only; no rendered byte, wire format, refusal string, exit code, signed
artifact, or consent, security or retention decision changes).

Base `0285819d` (main at the start of the bead); head `695bf136` (the tree every
`-695bf136` record names). A record is valid only for the commit it names
(verification rule 7). Tools live in `docs/evidence/poc-core-hygiene-2026-10-22/`;
the records of the earlier bead (`syzygy-bpyt.7.6`) there are unchanged.

## Result

- The census (`export_gate.py`, lexer version of `export_census.py`) read 607
  exports declared in 39 files of `packages/three-surface-poc-core/src/` at the
  base: 1 dead, 230 self-only, 88 test-only, 128 internal, 160 public.
  No figure of the earlier 233 is claimed for this head.
- 185 of the 231 self-only or dead exports have no citer in any non-code file
  outside the machine records (below) and lost the `export` keyword. 46 stay
  exported, each with the files that cite it (`exceptions` in
  `export-gate-head-695bf136.json`, `FACT_FAMILIES` among them). At the head the
  census reads 422 exports (1 dead, 45 self-only, 88 test-only, 128 internal,
  160 public) and the gate reports 0 violations.
- The 185 names and files are `unexported-names-695bf136.json`; the 46 kept
  are the gate record's `exceptions`. Of the 46, 24 are kept only because a
  retained raw review in `docs/reviews/` names them: a citation is not a
  reliance (AGENTS.md rule 5), so whether a raw review keeps an export public
  is a judgment this change took the conservative side of. The bead says a
  name cited in docs, candidate packets or evidence gets a note, not a
  deletion.
- 64 of the 185 are cited only by machine records (`docs/evidence` tool output
  and tool source, `docs/pursuits` data), which list names because a tool
  enumerated them. Counting those too would keep 110 instead of 46
  (`withMachineRecordsCounted`).

## Denominators (rule 9)

- Tracked files: 8368 at the base, 8377 at the head; non-code files read for
  citers: 7525 at the base, 7518 at the head after 12 binary files skipped
  (`export-gate-*.json`, `denominators`).
- Tracked code files cross-checked, lexer against the TypeScript printer:
  843 of 843 agree at the base, 847 of 847 at the head
  (`lexer-vs-printer-*.json`). Numeric-literal tails (`1_000_000n`) are dropped
  from both sides first; nothing else is.
- Census population against the TypeScript parse tree: the (file, name) sets
  are equal, 607 at the base and 422 at the head (`parseTreeCrossCheck`).
- Non-code citers by two methods, a Python token scan and `git grep -w -o -F`:
  they agree (`citerMethodsAgree`).

## Served output unchanged

- Route capture, `route-capture.mjs` over the app's own fixtures, base and
  head built from their own trees: 5 fixtures, 19 routes each, 230 responses
  (rederived, not copied from the earlier record), the 5 fixtures give 5
  distinct outputs, 30 of 46 request keys vary across fixtures; head
  `variants` bytes equal the base's, 0 responses differ
  (`route-capture-comparison-695bf136.json`).
- Emitted code, `dist_code_diff.py`, base and head dist of the ten `tsc -b`
  projects, TypeScript prints with comments removed: 484 files compared, 54
  differ, all 54 in `three-surface-poc-core/dist` (21 `.js`, 33 `.d.ts`), 0
  files in only one tree, and all 54 explained at the statement level
  (`emitted-code-diff-695bf136.json`): the head export set of each module is the
  base's minus the removed names; every head statement is a base statement with
  or without its `export `; every base statement without a head counterpart is,
  in a `.d.ts`, a declaration TypeScript dropped because nothing public refers
  to it, or an import it pruned. The same run without the list of removed
  names explains 0 of 54 (the control).
- `scripts/check_quotations.py` output, base and head: identical (9 lines).
- Test lists, `npx vitest list` at each tree: 6031 lines each, `Tests: +0 ~0 -0`
  (`test-lists-695bf136.json`).

## Tool repairs and rule 6

- N9 (census lexer): two selftest cases and two mutants added; the selftest
  has 30 cases; `mutate_census.py` kills 26 of 26 mutants
  (`mutants-export-census-695bf136.json`). `predecessor-blind-spots-695bf136.json`
  runs the two new mutants on the predecessor's tool: both survived its 28-case
  selftest and both fail the repaired one. The docstring now says the lexer's
  limits can under-count or over-count.
- N8 (comment-only check): `comment_only_check.py` and `dist_code_diff.py`
  compare TypeScript prints with comments removed. `mutate_comment_only.py`: 7
  mutants killed of 7, plus 1 negative control reported apart (it passes by
  staying silent), 2 controls absent because no `--merge-with` was given
  (`mutants-comment-only-check-695bf136.json`). Of the 3 template-literal
  mutants (trailing space, blank line, indent) the predecessor's check missed 2
  and the repaired check catches all 3.
- New gate, `export_gate.py`: selftest 13 cases (`selftest-export-gate-695bf136.txt`);
  13 tool mutants killed of 13; 35 tree mutants killed of 35: the `export`
  keyword put back on one of the removed names per declaring file plus the first
  of each declaration kind (const, function, interface, type), the gate failing
  and naming that declaration each time (`mutants-export-gate-695bf136.json`,
  old and new fragment of every mutant). The kinds the 185 names cover are
  interface 74, type 55, const 43, function 13.

## Obligation map

- Source 7.12: N9 (census selftest and mutants, docstring); N8 (comment-only
  oracle, mutant count without the negative control); the un-export sweep with
  every kept export carrying its reason; route capture byte-identical; the
  lexer cross-check over every tracked code file (the earlier 495 of 495 at
  `1d6731bb` is a different population).
- Source 7.10: criteria 1 to 7 are the Result, Served output and Tool repairs
  sections above, in that order of evidence; the planned product delta
  `Tests: +0 ~0 -0` holds, and the selftest cases are not counted as tests
  because the existing tool selftest received them, not a second gate.

## Reproduce

From a checkout at the head with `npm ci` and `npm run build` done:

    T=docs/evidence/poc-core-hygiene-2026-10-22
    python3 $T/export_gate.py . --prefix packages/three-surface-poc-core/src/ \
      --barrel packages/three-surface-poc-core/src/index.ts
    python3 $T/lexer_vs_printer.py . /tmp/out.json
    python3 $T/export_gate.py --selftest

The gate exits 1 when any self-only or dead export lacks a non-code citer.
It is not wired into CI or the test suite: no test was added (the bead plans
`Tests: +0 ~0 -0`), so a later change that re-exports a name is caught only by
running it.
