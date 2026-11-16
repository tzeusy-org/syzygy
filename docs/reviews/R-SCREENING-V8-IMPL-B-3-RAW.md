# R-SCREENING-V8-IMPL-B-3 — screening scope v8 reading code and recorder, implementation review, round 3
Reviewed commit: aa658177
Subject: PR #807
Verdict: REVISE

Reviewer: fresh-context independent reviewer, 2026-11-09. Scope:
`git diff origin/main...aa658177` (38 files, +2605/−47). I read the round-2
repairs (`72528d19..b5e3d02f`, 7 files) closely and the whole diff afresh. I
read it against the v8 package (`SEMANTIC-DELTA.md`, the manifest, the frozen
table), part 3 of `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`,
and `AGENTS.md`. I judged the earlier findings against the bytes, not against
the PR body.

I worked in a detached worktree at `aa658177` under `/home/orca/.tmp/reviews/`
with `TMPDIR` set there, after `npm ci`. I did not run `--record`. I read no
observed repository body or dossier output, made no dossier run, ran no
`syzygy polaris` and made no provider call. I edited no tracked source file.
My mutants and one probe test were temporary, each restored or deleted, and
`git status --porcelain` was empty after each pass.

## What I ran

- `npm ci`: exit 0.
- `npm run check`: exit 1. Test Files 1 failed | 182 passed (183); Tests 1 failed | 4244 passed (4245).
  - The failure was `island-boundary.test.ts`: "Test timed out in 5000ms", at load average about 20.
  - Run alone, `island-boundary.test.ts` gives 9 passed (9). This PR does not touch it.
- Integration tier over the touched packages (`npx vitest run --project integration packages/polaris-dossier packages/polaris-generation-consent packages/polaris-generation-core packages/test-kit apps/three-surface-poc/src/polaris-generation apps/three-surface-poc/src/product-build.test.ts`): exit 1. Test Files 2 failed | 39 passed (41); Tests 3 failed | 2028 passed (2031).
  - All three failures were "Test timed out in 5000ms", at load average about 27: one in `render.test.ts` and two in `review.test.ts`.
  - The two files alone, with `--testTimeout=60000`: Test Files 2 passed (2); Tests 155 passed (155).
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/record_public_source_screening_scope_v8_act.py --selftest`: "selftest: 88 of 88 predicates held".
- `python3 scripts/build_public_source_screening_scope_v8.py --check`: "public-source-screening-scope-v8: patch and manifest current".
- `python3 scripts/check_docs_review_campaign_partition.py --check`: "partition PASS: denominator=805; … unmatched=0".
- The recorder is frozen and has not been run:
  - `git diff --quiet 0fb18104 aa658177 -- scripts/record_public_source_screening_scope_v8_act.py` exits 0, and so does the same diff of the recorder plus `check_governance.py` from `72528d19`.
  - `git diff --quiet f5bfaed7 aa658177` over the v8 package directory, the builder and `.syzygy/governance/policies` exits 0. So the policy is not hand-applied.
  - I parsed the 12 `FROZEN_FILE_DIGESTS` entries by script. All 12 equal the sha256 of the current bytes and of `git show f5bfaed7:<path>`.
  - `git ls-tree` gives 11 package files; with the builder that is 12.
  - `REVIEWED_MANIFEST_SHA` (`3da45020…`) equals the manifest file's sha256 and appears in the head of `R-SCREENING-SCOPE-V8-6-RAW.md`.
  - No `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-ACT.md` exists. `git grep -l PUBLIC-SOURCE-SCOPE-V8-ACT` returns only the two retained raws, `package-reader.ts`, `check_governance.py` and the recorder.
- The mutation record:
  - `docs/evidence/syzygy-pdja-21/screening-v8-mutations-2026-11-09.json` names commit `b5e3d02f6b7eef742d82eeee0143696055971a01`.
  - `git merge-base --is-ancestor b5e3d02f aa658177` succeeds, and `b5e3d02f..aa658177` changes only the record.
  - Each result stores its predicate, file, `old`, `new`, test, counts and outcome.
- `python3 scripts/screening_v8_mutations.py --out <scratch>` at `aa658177`: 40 mutants, 40 killed, survived `[]`. The tree was clean afterwards.
- My own 7 mutants, one at a time, each restored. 6 were killed and 1 survived:
  - A survived: drop `launch-cli.ts:48`, the bytes-equal-argument recheck (Finding 2).
  - B killed: `declaresSourceVisibility` always false.
  - C killed: the discovery row without its excluded-outcome arm.
  - D killed: the discovery row without its withheld-class arm.
  - E killed: future-dated records count as launched.
  - F killed: the unparsed check narrowed back to the subject pair, reproducing the round-2 mutant.
  - G killed: `supervisorClone` ignores `fetchRefusal`.
- My own probe, a temporary unit test file, deleted afterwards. It called `pairVisibilityAt` with one public record of `repository:o-r` and a second record of that pair, `not-public`, with a calendar-invalid grant instant. Result lines:
  - `2026-11-31T00:00:00Z {"ok":true,"visibility":"public","carriers":[{"record":"L1","carrier":"public"}]}`
  - `2026-02-30T10:00:00Z {"ok":true,"visibility":"private",…{"record":"L2","carrier":"private"}]}`
  - `2026-11-10T24:00:00Z {"ok":true,"visibility":"public",…}`
  - `node -e` shows `Date.parse` rolls each over: `2026-02-30T00:00:00Z` gives 1772409600000 (2 March), and `2026-04-31` gives a number. `…T10:00:60Z` gives NaN.
- My own fetch and egress sweep:
  - Population: tracked `apps/`, `packages/` and `scripts/` files ending `.ts|.mts|.js|.mjs|.cjs|.py|.sh`, which gives **788**. Excluding `.test.`, `.testkit.`, `/test-kit/`, `testing`, `fixtures` and `.d.ts` leaves **461**.
  - Predicate (Python `re`): a quoted `fetch|clone|ls-remote|pull|remote|archive|submodule|lfs`, `git\s+(fetch|clone|ls-remote|pull|archive)`, `\bfetch\(`, `https?\.(request|get)\(`, `undici`, `new WebSocket`, `net.connect`, `tls.connect`, `curl` or `wget`.
  - Result: **32 files hit**. Three sites reach an observed repository's host:
    - `packages/polaris-dossier/src/polaris.ts:353`, behind `fetchRefusal`;
    - `apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:232`, behind `visibilityStop`;
    - the trigger's `ls-remote` at `dossier-trigger.ts:44`, which reads metadata only and is disclosed.
  - The other 29 are message, stage or field strings (`launch.ts`, `launch-revision.ts`, `git-object-reader.ts`, `init.ts`, `run-dir.ts`, `run-record.ts`, `clone-shape.ts`, `pipeline-demo.ts`, `polaris.ts:466`), local-daemon or CDP HTTP, or `scripts/` acting on Syzygy's own checkout or remote or a synthetic origin.
  - Second method: `git grep -l child_process` over non-test `apps/` and `packages/` gives 28 files. The only `['fetch'…]`, `'clone'` or `'ls-remote'` git argument lists among them are the two guarded sites above, plus `fresh-checkout-demo-main.ts:363`, which clones Syzygy's own source root.
  - I found no other path that fetches a pair not decided public.

## Earlier required findings, judged against the bytes

| Round / finding | Status at aa658177 | Evidence |
|---|---|---|
| R1-1: the supervisor fetches a private repository (requires change) | **Resolved** | [Observed] `polaris.ts:340-358`: `supervisorClone` runs `fetchRefusal` before `init` and `fetch`, and only `visibility === 'public'` returns null (`source-visibility-gate.ts`). Its runner mutants and my mutant G are killed, and my sweep finds no other host fetch. |
| R1-2: the act-forms refusal untested (requires change) | **Resolved** | [Observed] `actFormsMatchPolicy` is tested for six mismatches plus the reverse case. Its three runner mutants are killed (reproduced). |
| R1-3: the provider-mode malformed `sourceVisibility` untested, and the fall-through fail-open (requires change) | **Resolved** | [Observed] `public-source-screening.ts:184` fails closed on its own. Its runner mutants are killed (reproduced). |
| R1 notes 4, 5, 6a–d, 7 | Resolved or disclosed, unchanged since round 2 | [Observed] The default is private under v8 (`screen.ts:153`, mutant killed). The record is an ancestor. 6c is disclosed in the PR body. 6d loops (`unified-patch.ts`). The recorder is unchanged. |
| R2-1: an unreadable grant instant refused only its own pair (requires change) | **Resolved as stated; a residual of the same predicate remains, see Finding 1** | [Observed] `source-visibility-gate.ts:60-65` now looks over every active `observation-consent` record whatever its identity, and names `unparsed.file`. The new test (another pair, `2026-13-01T00:00:00Z`) refuses with the exact literal message, and the revoked and non-observation exclusions are tested. The runner mutant and my F are killed. |
| R2-2: two survivors (note) | **Resolved** | [Observed] `polaris-clone.test.ts` now covers a clone at another commit, and `unified-patch.test.ts` covers the `Math.min` guard. Both runner mutants are killed (reproduced). |
| R2-3: residuals (note) | Unchanged, disclosed | The trigger's `visibility` port is unwired in production (fail-closed), the `ls-remote` is metadata only, and a clone already at the commit is reused. |

## New findings

**Finding 1 — A calendar-invalid grant instant is read as a real one, so a private record can drop out and its pair read public** (requires change)

- [Observed] The record grammar admits any two digits per field: `launch-record.ts:130`, `/^Grant instant: \`(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\` /`.
- [Observed] The "effectiveness cannot be read" test is `Number.isNaN(Date.parse(…))` (`source-visibility-gate.ts:65`). V8's `Date.parse` rejects month 13, hour 25 and second 60. It **rolls over** day 29–31 in a shorter month and hour 24: `2026-02-30T00:00:00Z` becomes 2 March, and `2026-11-31` becomes 1 December.
- [Observed] My probe gave a `not-public` record of `repository:o-r` the instant `2026-11-31T00:00:00Z`, with `now` at 10 November 2026. The pair read **`public`**, with that record absent from the carriers, because line 68 treats it as effective on 1 December.
  - The held text says such a record refuses every read: "reads as an observation consent record whose effectiveness or pair cannot be read … While one exists, every read under the scope is refused, with that file named" (`SEMANTIC-DELTA.md`, edit 3, `rule`).
  - So the code reads a non-existent date as effective at another instant. Until that instant, the pair gets the public rules: the fetch, partial redaction and rendered object ids. That is the exposure direction, not only an availability difference.
- [Observed] The tests do not catch it. The case labelled "February 30" is `2026-02-30T25:00:00Z` (`source-visibility-gate.test.ts:52`), which fails on hour 25, not on the day.
  - The PR body's disposition of R1-6a says "Tested with a month 13, February 30 hour 25", which is accurate. But "February 30" alone, at a valid hour, parses.
- [Inferred] Syzygy's own writer stamps its clock, so it never writes such an instant. But the held text names hand-written or malformed files in the agents' write reach as the case this rule exists for. `recordIdFor` takes the instant string as given, so a hand-made record can carry a consistent id.
- Required:
  - Treat an instant as unreadable unless it names a real calendar instant. For example, require `new Date(t).toISOString()` to equal the text with `.000` inserted, or validate the fields.
  - Add killing tests, with literal expected messages, for `2026-11-31T00:00:00Z`, `2026-02-30T10:00:00Z` and another pair's record with one of them.
  - Decide and state whether `T24:00:00Z` counts as readable. Note: ISO 8601 has allowed 24:00 as end of day, and the rollover then gives the right instant.
  - Add the mutant to the rule-6 runner.

**Finding 2 — `policyAdmitsNonPublic`'s bytes-equal-argument recheck survives deletion** (note)

- [Observed] Deleting `launch-cli.ts:48` (`if (sha256(bytes) !== chain.final.digest) return none;`) survives `screen-scope-v8.test.ts` (11 passed).
- [Inferred] `readPolicyActChain` already refuses unless the on-disk bytes match the act. So the line only guards a change between the two reads, which no test simulates. It is fail-closed redundancy; `loadDossierScreen` has the same guard. Pinning it is optional.

**Finding 3 — Test-tier timeouts under load** (note)

- [Observed] Under load averages of 20 to 27, `npm run check` and the integration tier each failed only on 5000 ms timeouts, in files this PR does not change (`island-boundary`), or in files it extends (`render.test.ts`, `review.test.ts`).
- All pass alone, the latter two with `--testTimeout=60000`. [Inferred] This is host load, not this change.

## Criterion summary

- v8 read exactly as held, failing closed, store-wide refusals included: **not met, for Finding 1 only**. The round-2 widening is correct.
- Nothing fetched for a pair not decided public: met over the 461-file sweep and its second method.
- Public pairs screen identically under v7 and v8: met (`screen-scope-v8.test.ts`, the runner's screen mutants).
- Recorder frozen to the reviewed bytes, refusing otherwise, and not run: met.
- Killing tests:
  - met for the runner's 40 predicates (40 of 40 reproduced), and the record's commit is an ancestor;
  - Finding 1's widened predicate needs its own;
  - one redundant guard survives (Finding 2).
- Literal expected values: met in the added tests. The v7/v8 identity test is a differential, and it is paired with literal `withheld: [4, 5, 6]` and version strings.
- Scoped-down parts disclosed: met. These are 6b, 6c, the trigger's `ls-remote`, the unwired trigger `visibility` port, reuse of an existing clone, and the post-record install checklist.
