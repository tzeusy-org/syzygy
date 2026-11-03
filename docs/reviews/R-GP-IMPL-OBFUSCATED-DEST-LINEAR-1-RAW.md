# R-GP-IMPL-OBFUSCATED-DEST-LINEAR-1 — CC-REV-1 implementation review of syzygy-rmax (PR #643), round 1
Verdict: CONFIRM
Reviewed commit: 3f4725d518225a73a8211e76f6fb6ee1c83e3c3f
Subject: PR #643

Subject bytes: `git diff a332ff69...3f4725d5` (merge base `a332ff69f14868128a1667b685b258b9add36953`, the #638
merge commit on `origin/main`), sha256 `3577cdbb7273e490588fc480193d58c9b4df378d89b3a6f942328ee1e3013be6`,
49992 bytes. Seven files: `packages/three-surface-poc-core/src/git-object-reader.ts` (+26 -2),
`packages/three-surface-poc-core/src/obfuscated-destination-equivalence.test.ts` (new, 13 tests), the new
`docs/evidence/syzygy-rmax/` record and three tools, and the re-derived
`docs/evidence/syzygy-bpyt-52/unsafe-url-equivalence-2026-11-04.json`.

Governing references: bead `syzygy-rmax` (linear rewrite, exact match-set equivalence under GP-Q0, differential
against the hard-coded old pattern, tracked-file sweep, timing rows, and #638 exceptions E1, E2, E3); AGENTS.md
verification rules 4, 6, 9 and 11.

## Verdict basis

The equivalence claim held under an independent proof and an independent generator. No input was found on which
the surviving matches differ from the old pattern's in index or text. Linearity holds on every flood tried,
measured in thread CPU time, with a margin of about 75x under the test bound. Both evidence records name
reachable commits and the head's file digests. All local gates pass, and hosted node-ci is green. I found no
exception. One note follows.

## Proof sketch (reviewer's own)

Let the old pattern be `O = \](\s*<?[^)\s]*E` where `E = &(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);`. For
a `](` at position p, let R(p) be the maximal `[^)\s]*` run after `](` and its maximal `\s*`.

1. O matches at p if and only if some substring of R(p) matches E. Every character of E is in `[^)\s]`, and no
   backtrack of `\s*` or `<?` admits a match that the greedy choice refuses: a shorter `\s*` leaves a whitespace
   character where E needs `&`, and `<` is itself in the run class. When O matches, it ends at the end of the
   rightmost-starting E in R(p). E's body has no `&`, so no E overlaps that end.
2. The new pattern tries branch 1 (O's tail, unchanged) at the same greedy `\s*`. By point 1, branch 1 matches
   exactly when O does, with the same text. Branch 2 always matches, so `\s*` never backtracks into a state that
   O would have reached differently.
3. A branch-2 match at p (the case where O fails at p) consumes `](`, the whitespace, and then characters of R(p)
   until a `)`, whitespace, the end of the string, or a `]` followed by `(\s`. Take any `](` at q, with p < q and
   q+1 inside the consumed span. Its `]` was consumed, so q+2 is not whitespace, and R(q) is a suffix of R(p).
   R(p) contains no E, so neither does R(q), and O fails at q. No position in the span other than a `](` can
   start O. So the dropped match hides no old match. This answers "can branch 2 swallow a later old start":
   no.
4. The stop position s (a `](` followed by whitespace) is where the next attempt begins. O also reaches s,
   because every position before it fails. After a branch-1 match, both engines resume at the same end. No match
   is empty, so `matchAll` never forces an advance. By induction on attempts, the reported sequences are equal.
   This covers the `lastIndex` question.
5. `\s` (no `u` flag) is the same class in O's `[^)\s]`, in branch 2's `[^)\s\]]`, and in the lookahead
   `(?!\(\s)`. So Unicode whitespace (NBSP, U+2028, U+3000, BOM and the rest) cannot split the classes. U+180E
   and U+200B are in none of them.
6. Linearity: branch 2 consumes to the end of R(p), or to its trailing `](`, whose destination is the next run.
   So each run takes at most two branch-1 scans: one from its head, and one from the first `](` after a
   branch-1 match's end. Each scan is O(|R|).

## Independent differential (reviewer's own generator, `/tmp/r643/fuzz/fuzz.mjs`, deleted after the run)

The oracle is the old pattern, typed independently. The subject is `obfuscatedDestinationMatches` from the head's
built `dist`. Each comparison is JSON over `[index, text]` pairs.

| Population | Inputs | Old matches (inputs) | Differ |
|---|---|---|---|
| Exhaustive characters, length 0–7, over `] ( ) space NBSP U+2028 < & # 1 ;` | 21,435,888 | 34 | 0 |
| Exhaustive characters, length 0–6, over `] ( ) \t & # x F g a ; < U+FEFF` | 5,229,043 | 172 | 0 |
| Exhaustive tokens, length 0–5, over 17 tokens including `](` followed by space, U+3000, U+180E and U+200B | 1,508,598 | 310,295 | 0 |
| Random xorshift, 2,000,000 strings of 1–40 tokens over all 17 JS `\s` members, non-whitespace near-misses, lone surrogates and entities | 2,000,000 | 265,272 | 0 |
| Overlap compositions `(a+b+c)×{1,3}+d+e` over 11 parts, nested and overlapping `](` runs | 322,102 | 192,406 | 0 |

Self-check (rule 6), run over 300,000 random strings:
- Dropping the stop rule (`\]` always consumed) gives 5,744 differing inputs.
- Narrowing the lookahead to an ASCII space only gives 4,362 differing inputs.
- Two mutants are match-equivalent, as the proof predicts. Stopping at every `](` (the PR's m2) gives 0. Moving
  `\s*` into branch 1 gives 0.
- m2 is quadratic: 225 ms of thread CPU at 10,000 `](` and 1,991 ms at 30,000. The 100,000-unit timing row
  (bound 1,000 ms) therefore kills it, as the record says.

Tracked-file sweep (reviewer's own, `sweep2.mjs`, in process, no cap):
- Covers all 8,551 files of `git ls-files -z` at the head, raw and masked.
- NUL-bearing files that decode as strict UTF-8 are included; 11 files are not UTF-8.
- Result: 16,764 forms, 0 differ, 77 old matches. This agrees with the record's 16,760 forms and 77 matches; the
  record skips the NUL-bearing files.

## Timing (thread CPU, `process.threadCpuUsage`, node v24.6.0)

The head matcher and the full scan were measured on 100,000-unit floods:
- Units `](`, `](<`, `](&`, `](&a`, `](&#1`, `](&a;`, `](]`, `](a](`, `]( ` and `](` followed by NBSP: 1.0–9.8 ms
  for the matcher and 2.7–13.0 ms for `scanActiveContent`.
- `](` repeated 100,000 times, ending in `&amp;`: 1.3 ms for the matcher.
- `](&amp;` followed by 100,000 `](a`: 6.0 ms for the scan.
- 50,000 runs that each match: 1.0 ms.

The test's timing rows use `process.threadCpuUsage`. It exists on node v24.6.0, so the `process.cpuUsage`
fallback is not taken here. The bound of 1,000 ms sits about 75x above the worst row measured and about 25x below
the old pattern's 25–28 s, so the rows discriminate and are not tight.

## Evidence records (rule 11, reachability)

`docs/evidence/syzygy-rmax/obfuscated-destination-equivalence-2026-11-04.json`:
- `subject.sha256` `c8d51daa…` equals `git-object-reader.ts` at the head, at `5ec1358a` and at `d9f1498f`.
- `subject.test.sha256` `aef94e2e…` equals the head's test file.
- `baseCommit` `a332ff69` is an ancestor of `origin/main`.
- The `branchFiles` digests for the bpyt-52 record, the three tools, the reader and the test equal the head's
  bytes.
- `provenanceCommit` and `mutants.ranAt` are `5ec1358a`, which is reachable from the PR head. Its reader digest
  equals the head's.

`docs/evidence/syzygy-bpyt-52/unsafe-url-equivalence-2026-11-04.json`:
- `subject.sha256` `d88a1e71…` equals the reader at `a332ff69` and at the #638 head `c70d2900`.
- `testSha256` `9fc33808…` equals both test files.
- `sweepCommit` `a332ff69` is an ancestor of `origin/main`. Its `trackedFiles` of 8,546 equals `git ls-tree -r`
  at `a332ff69`.
- `firstRun` `30c5da16` is an ancestor of no ref on `origin/main`. Its reader digest `ecd15f10…` differs from the
  head's, as the retirement note says. E1 and E2 are discharged.
- E3: the UNSAFE_URL comment now names `unsafe-url-equivalence.test.ts`, which exists at the head.

## Notes

N1 (no repair required). `sweptTree.note` in the rmax record says the record "is the one tracked file the sweep
did not read". Yet `branchFiles[1]` lists a digest for the record, `17660cda…`, which is its bytes at `5ec1358a`.
`trackedFiles` is 8,551, which includes the record, so the sweep enumerated some version of it. That version
cannot be `17660cda`, because `17660cda` contains the sweep's own results. The listed digest therefore does not
describe the bytes swept, and the note's "did not read" is loose. The subject digest and every other branch file
are exact, and the record's text carries no entity in a destination. No match result can turn on this. The head's
own bytes for the record are `cabbe1fc…`.

## Gates (scratch detached worktree at `3f4725d5`, `npm ci`, `TMPDIR=/tmp/r643`)

- `npm run build`: exit 0.
- `npm run typecheck`: exit 0.
- `npm test`: 167 files and 3,642 tests passed.
- `npx vitest run --project integration packages/three-surface-poc-core`: 6 files and 73 tests passed.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 643` at review time: node, node (unit), node (integration) and node (e2e) pass. The
  governance-docs `checks` job was still pending, so this review does not report it.
