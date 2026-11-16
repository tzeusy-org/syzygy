# R-GP-IMPL-UNSAFE-URL-LINEAR-1 — CC-REV-1 implementation review of syzygy-bpyt.52, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c70d2900912fa239c0c764eaeb05f37c0c774e02
Subject: PR #638

Reviewer: w-rev-638 (review bead `syzygy-01mw`), fresh context, independent of the lane. PR #638, branch
`agent/syzygy-bpyt.52`, head `c70d2900912fa239c0c764eaeb05f37c0c774e02` (commits `821cac13`, `c70d2900` over
`origin/main`). All runs were in a scratch detached worktree at the head under `/tmp/r638` after `npm ci`, Node
v24.6.0, every command in the foreground. No target-repository content was fetched or read.

## Scope

The PR replaces `UNSAFE_URL` in `packages/three-surface-poc-core/src/git-object-reader.ts`:

- old: `(?:\]\(\s*<?|\]:\s*<?|=\s*["']?\s*|<)\s*SCHEME`, flags `gi`
- new: `(?:\]\(\s*(?:<\s*)?|\]:\s*(?:<\s*)?|=\s*(?:["']\s*)?|<\s*)SCHEME`, flags `gi`

`UNSAFE_SCHEME` is byte-unchanged by the diff. A new exported seam `unsafeUrlMatches(text)` returns
`[...text.matchAll(UNSAFE_URL)]` as `{index, value}` and `scanActiveContentCharged` now iterates it instead of
`text.matchAll(UNSAFE_URL)`. This is an active-content gate, so GP-Q0 requires the match set (index and text, in
order) to be identical for every input.

## Equivalence: held

[Observed] No input was found on which the two patterns differ. [Inferred] They cannot differ, by the argument
below.

### Proof sketch (my own)

1. Same language per branch. With `W` = one `\s` char:
   - `](`: old `](W*<?W*S`, new `](W*(<W*)?S`. Without `<`, old's `W*W*` is `W*`; with `<`, both are `](W*<W*S`.
   - `]:`: identical argument.
   - `=`: old `=W*["']?W*W*S`, new `=W*(["']W*)?S`. Without a quote both are `=W*S`; with one both are `=W*qW*S`.
   - `<`: old `<W*S` (the trailing shared `\s*`), new `<W*S`.
   So the union languages are equal.
2. At most one match end per start. Every character a prefix can consume (`]`, `(`, `:`, `=`, `<`, `"`, `'`, `\s`)
   is a non-letter, and `S` begins with one of `j v d f` (case-insensitive, ASCII only). So the scheme begins at
   the first letter after the opener's prefix, that letter fixes the scheme alternative (the four first letters
   are distinct), its letters interleaved with `\s*` are deterministic, and the match must end at the first `:`
   after the last letter's trailing `\s*`. The opener is fixed by the start character (`](` and `]:` are
   exclusive on the second character). Hence from any start index there is at most one possible match string.
3. `matchAll` equality follows. Both regexes are `g` (not `y`) with `i` and no `u`; `matchAll` clones the regex,
   so no shared `lastIndex` leaks. From a given `lastIndex` each engine returns the least start index that has a
   match; by (1) the set of matching starts is the same, and by (2) the match at that start has one possible text,
   so index and text are equal and `lastIndex` advances to the same end. No match is empty, so the empty-match
   advance rule never fires. Induction over iterations gives identical sequences.
4. Unicode `\s` and case folding. Both use the same `\s` (I enumerated the BMP: the 25 code points `\s` matches are
   exactly my hand scanner's set; `U+0085`, `U+180E`, `U+200B` are not `\s`). Under `i` without `u`, no BMP code
   point at or above `U+0080` matches `[a-z]` (enumerated), so `ſ`, `ı`, `İ`, `K` (U+212A) cannot reach a scheme
   letter in either pattern. The argument does not depend on which characters `\s` contains, only that `\s`
   contains no letter, `<`, quote or `:`, which holds.
5. The `<` alternative overlapping `](<`: at a `](<` start the `](` branch matches first (lower index). If it
   fails (e.g. `](<x`), the scan reaches the `<` start, which is the same `<W*S` test in both patterns. An empty
   `\s` run between `<` and the scheme is `W*` with zero iterations in both.
6. SCHEME interpolation: the new template ends `|<\\s*)${UNSAFE_SCHEME}`; `UNSAFE_SCHEME` is a single
   non-capturing group, so no alternation precedence changes. I confirmed the shipped seam behaves exactly as
   `new RegExp(<expected new source>, 'gi')` on a probe string.

### Differentials I ran (my own generators, scratch test files deleted afterwards)

| Population | Inputs | Old matched | Differ |
|---|---|---|---|
| xorshift random over all 25 `\s` code points, 6 non-`\s` near misses (incl. lone surrogates, NUL), openers, quotes, mixed-case scheme letters, `ſ ı İ K é`, schemes with in-letter separators | 400,000 | 57,658 | 0 |
| Exhaustive over a 14-symbol alphabet (`' '`, `U+3000`, `]`, `(`, `:`, `=`, `<`, `"`, `'`, `d`, `a`, `t`, `x`, `U+0085`), every string of length 0 to 5, each with tails `data:`, `d a t a :`, `` | 1,737,585 | 222,868 | 0 |
| Hand overlap and lastIndex cases (`](<data:](<data:`, `<](<data:`, `](<<data:`, `=<"data:`, `="<data:`, `<<<<data:`, `]:(data:`, `=  "　data﻿:`, `=\u0085data:`, `<᠎data:`, `=""data:`, `='"data:`, ...) | 21 | n/a | 0 |
| A third oracle: a regex-free hand scanner of the old language, validated against the old regex on a separate 300,000-string LCG corpus (8,757 matching, 0 differ), then compared with the shipped matcher on every tracked file at the head, raw and masked | 8,542 tracked files, 11 not UTF-8 skipped, 16,747 forms | 84 shipped matches | 0 |

The third-oracle sweep includes the one form the author left uncompared: masked
`apps/three-surface-poc/src/polaris.ts` (138,173 chars) has 0 matches under both the hand scanner and the shipped
matcher. [Inferred] That discharges the PR's [Unknown] only through the hand scanner's agreement with the old
regex on random input plus the proof above; the old regex itself was not run to completion on that form.

### Linearity

[Observed] The shipped matcher on 1,000,000- and 10,000,000-character whitespace runs after `=`, `](`+`<`, `="`
and inside `<j...`: 1.4 to 2.7 ms and 13.7 to 29.4 ms respectively, no throw. Opener floods (`<` x200k, `=`
x200k, `](` x100k, `](<` x70k, `= ` x100k): 0.9 to 1.5 ms in `unsafeUrlMatches`.

## Exceptions

E1. The evidence record's subject digest is not the head's file. `docs/evidence/syzygy-bpyt-52/unsafe-url-equivalence-2026-11-04.json`
`subject.sha256` is `ecd15f1031178da2f33e5ac79bdb2e37177c4c2bda5bfcbd2104793a1a016f7d`, and `subject.note` says
"git-object-reader.ts is byte-identical at the PR head (sha256 above)". At `c70d2900` the file hashes to
`d88a1e71ab9a1e7ea5671c6e4184d6640f1b92b626f2229e1123a01d36df617d`; `ecd15f10...` is the file at `sweepCommit`.
The one differing hunk is `PWB_POLICY_IDENTITY.policyVersion` (`1.5.0-...redact-span` at the sweep commit,
`1.6.0-...redact-span.v5-bcd` at the head, from the rebase onto main), outside `UNSAFE_URL`, so the result
transfers, but the sentence is false and the record names bytes that are not the subject (rule 11).

E2. `sweepCommit` `30c5da16f425e42323eb8a1813f08a4eed5b3089` is reachable from no ref: `git for-each-ref --contains`
prints nothing and `git ls-remote origin` does not list it; it exists only as a loose object in the shared local
store (a pre-rebase commit, parent `cef26f7b`). A third party cannot check out the commit the sweep and mutants
ran at. The mutant fragments (`old`/`new`) are recorded and `tools/mutants.py`'s anchor string occurs exactly once
in the head file (checked), so the mutants are re-runnable at the head; the record should name a reachable commit
(the head, or `821cac13`) and correct E1's digest.

E3. The new source comment at `git-object-reader.ts:216` says the old form "is the oracle in
`git-object-reader.test.ts`"; the oracle is in `unsafe-url-equivalence.test.ts`.

## Notes (no change required for this PR)

N1. Timing rows will not flake on a loaded host, by construction and margin. They measure thread CPU time
(`process.threadCpuUsage`, present on Node 24), which excludes time the thread spends descheduled; observed
head cost is at most 3 ms against 200 ms (2 KB) and 1,000 ms (20 KB) bounds, a 66x to 200x margin. Residual
risk is a GC pause on the same thread inside the measured window, which is not plausible at these heap sizes.
The 2 KB row kills the old pattern (2,360 ms recorded).

N2. Discovered, out of scope: `OBFUSCATED_DESTINATION`
(`/\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g`, same file) is quadratic on `](`
floods: `"](".repeat(n)` took 1,557 ms at n=25,000, 6,956 ms at 50,000, 30,667 ms at 100,000 (node, regex alone);
`scanActiveContent` on `](` x100k took 29,678 ms and on `](<` x70k 38,203 ms, while `unsafeUrlMatches` took
under 2 ms on both. Same daemon-stall class as syzygy-bpyt.52; a separate bead, under the same GP-Q0 identical-match
rule.

N3. The PR is a pure pattern rewrite plus a read-only seam export; the seam is used by the scan itself, so it is
not a test-only export.

## Gates at the head (scratch worktree)

- `npm run typecheck`: exit 0.
- `npm test`: 166 files, 3,629 tests passed.
- `npx vitest run --project integration packages/three-surface-poc-core`: 6 files, 73 tests passed.
- `npm run test:tiers`: "ok: every test file is in exactly one tier".
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 638` at review time: `node`, `node (unit)`, `node (integration)`, `node (e2e)` pass; `checks`
  (governance-docs) pending. 0 review threads.
