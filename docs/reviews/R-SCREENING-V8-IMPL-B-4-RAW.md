# R-SCREENING-V8-IMPL-B-4 — screening scope v8 reading code and recorder, implementation review, round 4
Reviewed commit: 6f5ef978
Subject: PR #807
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer, 2026-11-09. Scope: `git diff
origin/main...6f5ef978` (41 files, +2798/−48). I read the round-3 repair
(`aa658177..6f5ef978`, 8 files, of which 5 are code or test: `launch-record.ts`,
`launch-record.test.ts`, `source-visibility-gate.ts`,
`source-visibility-gate.test.ts`, `scripts/screening_v8_mutations.py`) closely and
the whole diff afresh. I read it against the v8 package, the owner direction
`OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md` (from
`origin/agent/syzygy-pdja-v1-6-delta-packet`), part 3 of the launch-consent
implementation direction, and `AGENTS.md`. I judged round 3's Finding 1 against
the bytes, not the PR body.

I worked in a detached worktree at `6f5ef978` under `/home/orca/.tmp/reviews/r807d`,
with `TMPDIR=/home/orca/.tmp/reviews/tmp807d`, after `npm ci`. I did not run
`--record`. I read no observed repository body or dossier output, made no dossier
run, ran no `syzygy polaris`, and made no provider call. I edited no tracked source
file. My three mutants were temporary, each restored with `git checkout`, and
`git status --porcelain` was empty afterwards and after the runner.

## What I ran

- `npm ci`: exit 0.
- `npm run check`: exit 0. Test Files 183 passed (183); Tests 4265 passed (4265).
- Integration tier over the touched packages (`npx vitest run --project integration packages/polaris-dossier packages/polaris-generation-consent packages/polaris-generation-core packages/test-kit apps/three-surface-poc/src/polaris-generation apps/three-surface-poc/src/product-build.test.ts`): exit 0. Test Files 41 passed (41); Tests 2031 passed (2031).
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted".
- `python3 scripts/record_public_source_screening_scope_v8_act.py --selftest`: "selftest: 88 of 88 predicates held".
- `python3 scripts/build_public_source_screening_scope_v8.py --check`: "public-source-screening-scope-v8: patch and manifest current".
- `python3 scripts/check_docs_review_campaign_partition.py --check`: "partition PASS: denominator=806; assigned=806; raw=765; other=41; unmatched=0; overlaps=0; campaigns=145".
- The recorder is frozen and has not been run:
  - `git diff --quiet 0fb18104 6f5ef978 -- scripts/record_public_source_screening_scope_v8_act.py` exits 0. `git diff --quiet 72528d19 6f5ef978 -- scripts/check_governance.py` exits 0.
  - `git diff --quiet f5bfaed7 6f5ef978` over the v8 package directory, the builder and `.syzygy/governance/policies` exits 0, so the policy is not hand-applied.
  - I parsed the 12 `FROZEN_FILE_DIGESTS` entries (recorder lines 75 onward) by script. All 12 equal the sha256 of the current bytes.
  - `REVIEWED_MANIFEST_SHA` (`3da45020…`, line 74) equals the sha256 of `PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` and appears in the first five lines of `docs/reviews/R-SCREENING-SCOPE-V8-6-RAW.md`.
  - No file in `decisions/` matches `PUBLIC-SOURCE-SCOPE-V8-ACT` (0). `git grep -l PUBLIC-SOURCE-SCOPE-V8-ACT` returns the three retained raws, `package-reader.ts`, `check_governance.py` and the recorder.
- The mutation record:
  - `docs/evidence/syzygy-pdja-21/screening-v8-mutations-2026-11-09.json` names commit `faf3ec2c9c0e4500e9260a44b9a4754a0f0176ef`. It has 43 results, and every outcome is `killed`.
  - `git merge-base --is-ancestor faf3ec2c 6f5ef978` succeeds. `faf3ec2c..6f5ef978` changes only the record (1 file).
- `python3 scripts/screening_v8_mutations.py --out <scratch>` at `6f5ef978`: commit `6f5ef978…`, 43 mutants, 43 killed, survived `[]`. The three round-3 mutants: "gate: a grant instant must name a real calendar instant" killed; "record: an instant reads only as the instant it names" killed (7 failed, 29 passed); "record: the parser refuses a rolled-over instant" killed (5 failed, 31 passed). The tree was clean afterwards.
- My own 3 mutants of `instantIsReadable` (`launch-record.ts:51-54`), each run against `launch-record.test.ts` and `source-visibility-gate.test.ts`:
  - M1, drop `!Number.isNaN(ms) &&`: killed (5 failed | 74 passed (79)). `toISOString` throws on NaN.
  - M2, drop the shape regex: survived (79 passed). See Note 1.
  - M3, compare only the date part (`toISOString().slice(0, 10) === text.slice(0, 10)`): survived (79 passed). See Note 1.
- Fetch and egress sweep (Python `re`, over `git show 6f5ef978:<path>`):
  - Population: tracked `apps/`, `packages/` and `scripts/` files ending `.ts|.mts|.js|.mjs|.cjs|.py|.sh`, which gives **788**. Excluding `.test.`, `.testkit.`, `/test-kit/`, `testing`, `fixtures` and `.d.ts` leaves **461**.
  - Predicate: a quoted `fetch|clone|ls-remote|pull|remote|archive|submodule|lfs`, `git\s+(fetch|clone|ls-remote|pull|archive)`, `\bfetch\(`, `https?\.(request|get)\(`, `undici`, `new WebSocket`, `net\.connect`, `tls\.connect`, `\bcurl\b` or `\bwget\b`.
  - Result: **32 files hit**, the same 32 as round 3. The round-4 diff touches none of them.
  - Git argument lists that reach an observed repository's host: `packages/polaris-dossier/src/polaris.ts:353`, after `fetchRefusal` at line 349 (null only for a pair read public), and `apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:232`, behind `visibilityStop`. The trigger's `ls-remote` at line 44 reads metadata only and is disclosed.
  - The other hits are strings or field names (`init.ts:132`, `polaris.ts:466`), local daemon or CDP HTTP, or `scripts/` acting on Syzygy's own checkout or on a synthetic origin.
  - Second method: `polaris.ts` and `dossier-trigger.ts` are unchanged between `aa658177` and `6f5ef978` (absent from `git diff --stat aa658177 6f5ef978`), so round 3's `child_process` sweep (28 files) still describes these bytes.
  - I found no path that fetches a pair not decided public.

## Earlier required findings, judged against the bytes

| Round / finding | Status at 6f5ef978 | Evidence |
|---|---|---|
| R1-1: the supervisor fetches a private repository | **Resolved** (unchanged since round 3) | [Observed] `polaris.ts:349` `fetchRefusal` precedes `init`/`fetch` at 353. Its runner mutants are killed (reproduced), and my sweep finds no other host fetch. |
| R1-2: the act-forms refusal untested | **Resolved** (unchanged) | [Observed] Its runner mutants are killed (reproduced). |
| R1-3: provider-mode malformed `sourceVisibility` untested, fall-through fail-open | **Resolved** (unchanged) | [Observed] Its runner mutants are killed (reproduced). |
| R2-1: an unreadable grant instant refused only its own pair | **Resolved** | [Observed] `source-visibility-gate.ts:66` sweeps every active observation record whatever its pair. The runner mutant narrowing it to the subject pair is killed. |
| R3-1: a calendar-invalid grant instant is read as a real one | **Resolved** | [Observed] `instantIsReadable` (`launch-record.ts:51-54`) requires that `Date.parse` is not NaN, the exact `YYYY-MM-DDTHH:MM:SSZ` shape, and that `new Date(ms).toISOString()` equals the text with `.000` before `Z`. So a rollover (`2026-11-31`, `2026-02-30T10:00:00Z`, `2025-02-29`) and `T24:00:00Z` are refused, as the owner chose. Two sites apply it. The parser (`launch-record.ts:147`) refuses the record, and `readLaunchRecords` (`launch-store.ts:203-204`) then refuses the whole store, naming the file. The gate's sweep (`source-visibility-gate.ts:66`) catches injected stores. Tests with literal messages: `source-visibility-gate.test.ts:53` covers `2026-11-31T00:00:00Z`, `2026-02-30T10:00:00Z` and `2026-11-09T24:00:00Z` on the subject pair; `:61` covers another pair's not-public record dated 31 November, naming `L9.md`; `:65` checks that real instants still read, including 28 Feb 23:59:59 and 2024-02-29. In `launch-record.test.ts:80-91`, the parser refuses each bad instant even with a consistent ID and digest. Three runner mutants are killed (reproduced), and my M1 is killed. The writer stamps `isoOf(now)` with the milliseconds stripped (`launch.ts:273`), so the strict check never refuses Syzygy's own records. [Inferred] Every downstream `Date.parse(grantInstant)` in `launch.ts:119/126/154` and `launch-sources.ts:21` now reads only round-tripped instants, because the parser gates them. The change is confined to the owner's scope (5 code or test files, plus the record, the raw and the campaign). |
| R3-2: redundant bytes-equal recheck survives (note) | Unchanged, as the PR body states | Left as a note by the owner's scoping. |
| R3-3: test timeouts under load (note) | Not reproduced | Both tiers passed this round at load averages of 12 to 40. |

## New findings

**Finding 1 — Two clauses of `instantIsReadable` are equivalent mutants under V8** (note)

- [Observed] Dropping the shape regex (M2) or narrowing the round trip to the date part (M3) leaves all 79 tests passing (`launch-record.ts:53`).
- [Inferred] Neither changes behaviour.
  - Without the regex, a `.000Z` or `+00:00` text still fails the round trip, and the parser's grammar (`launch-record.ts:138`) admits only the exact shape anyway.
  - Within that shape, V8's `Date.parse` already yields NaN for hour 25, minute 60 or second 60. So only a day rollover or `T24` can parse to another instant, and either changes the date part.
- No test can kill them, so nothing needs to change. The full round trip is the stricter, self-evident form.

**Finding 2 — One expected message is built from the test parameter** (note)

- [Observed] `launch-record.test.ts:83` expects `` `its grant instant ${instant} is not a real calendar instant` ``. That message is interpolated from the `it.each` parameter, which is itself a literal.
- The gate tests interpolate the same way (`source-visibility-gate.test.ts:53`). Their other-pair case at `:61` is fully literal.
- [Inferred] No value is imported from the module under test, so this meets the literal-expected-values rule.

## Criterion summary

- v8 read exactly as held, failing closed, store-wide refusals included: **met**. Round 3's Finding 1 is resolved at both the parser and the gate.
- Nothing fetched for a pair not decided public: **met** over the 461-file sweep (32 hits, each classified).
- Public pairs screen identically under v7 and v8: **met**. `screen-scope-v8.test.ts` and the runner's screen mutants are killed, and the round-4 diff does not touch screening.
- Recorder frozen to the reviewed bytes, refusing otherwise, and not run: **met**. The recorder is unchanged since `0fb18104`, the 12 of 12 frozen digests match, the manifest sha matches, the selftest gives 88 of 88, and no act record exists.
- Every load-bearing predicate has a killing test: **met**. 43 of 43 runner mutants are killed (reproduced at `6f5ef978`), and the record's commit `faf3ec2c` is an ancestor. My M1 is killed. M2 and M3 are equivalent mutants (Finding 1). Round 3's Note 2 stands as accepted.
- Literal expected values: **met** (Finding 2).
- Scoped-down parts disclosed: **met**. The PR body names 6b, 6c, the trigger's `ls-remote`, the unwired trigger `visibility` port, reuse of an existing clone, the post-record install checklist, and that round 3's Notes 2 and 3 are left as they are.
