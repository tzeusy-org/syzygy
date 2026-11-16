# R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2 — CC-REV-1 implementation review of syzygy-bpyt.46, round 2
Verdict: REVISE
Reviewed commit: 330dd894
Subject: r2-review.diff sha256 872b63c7003d7e978213e2326aef58898cadf5cc777bf53c0321ddd70139d7ae

Reviewer: a fresh-context agent that did not author the change or its round-1 review. PR https://github.com/Tzeusy/syzygy/pull/554,
branch `agent/syzygy-bpyt.46`, head `330dd89458801e7a150134efa15f3d4af8215304`, merge base `a15b6a04`. Every path below named
`rev-554-r2/…` is under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-554-r2/`.

Summary: the code is sound. Every applied fix file is the round-1 reviewer's, byte for byte. Every lane row kills what it says, by
an assertion or the entry reader's own error, in both dist states. The ruling that #549 supersedes item 3's oracle holds: #549's guard and load row refuse every
wrong alias and every resolution that leaves the `source` condition, which is what the oracle protected. No product, config or
workflow byte changes, and the built dist is byte-identical to the merge base's (990 of 990 files).

One finding blocks, and it is body text only (F1). #549 gave every export a `source` condition. Since then:
- E4, the body's example of item 5's new refusal, no longer has conditions that all agree, so main `a15b6a04` already refuses it.
  It fails `no-egress.test.ts` and four other rows there.
- So the refusal list, the E4 rule-6 line and one residual are still written against `1a8864d9`. Two of those sentences, the one
  naming E4 as the newly refused entry and the residual, are false at `330dd894`.
- One clause about N6 is also false: the build no longer emits the testkit.

I give exact replacement text, checked by script against the body. Notes N1-N5 do not block.

## 1. Subject identity checks

| Check | Result |
|---|---|
| `git diff a15b6a04 330dd894`, re-derived by script in `rev-554-r2/clone` | sha256 `872b63c7003d7e978213e2326aef58898cadf5cc777bf53c0321ddd70139d7ae`, **matches** the subject file [Observed: `sha256sum` printed the same digest for both] |
| Files in the diff | 15: `AGENTS.md`, 8 under `docs/evidence/syzygy-bpyt-46/`, 6 test or test-support modules under `packages/` [Observed, `git diff --name-only`] |
| Merge base of `330dd894` and main | `a15b6a04da2cda0c5871a05c538b72943b1d660c` [Observed, `git merge-base`] |
| PR head | `gh pr view 554` gives `headRefOid 330dd89458801e7a150134efa15f3d4af8215304`, state OPEN, MERGEABLE [Observed] |
| Commits since round 1's `2f48eefa` | `00da9d5f`, `497cf1db`, `5963322e`, `ecb1afb4`, `affd777c`, `e2077444`, `330dd894`, in that order, with the parents and subjects the body's line 11 gives [Observed, `git log --first-parent`] |
| PR body, as `gh pr view 554 -R Tzeusy/syzygy --json body --jq .body` writes it | sha256 `e18f296b76a991a40baaea6706cae6f693c4e24665a3550419fc65190b7eeb33`, **matches** the coordinator's frozen digest, and is byte-identical to `lead/b46/body-r2.md` (`cmp` silent) [Observed] |
| The lane's `2a655567…` | is **not** the gh bytes less the trailing newline `--jq` adds: that gives `f1ae1cc7…`. Two newlines give `2b340502…`, CRLF gives `6d569c13…`, and the body without its footer gives `06603adb…` or `5e18a170…` [Observed]. So the lane's draft file differs from the PR body by something other than the trailing newline. What that is, is [Unknown]; I read only the frozen body |
| Hosted checks at the head | `checks	pass	18m8s` and `node	pass	4m11s` (`gh pr checks 554`). `gh api …/actions/runs/40661979198` gives `head_sha 330dd894…`, `governance-docs`, `success`. Run `40661979094` gives `330dd894…`, `node-ci`, `success` [Observed] |
| Round-1 raw | `rev-554/R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1-RAW.md` hashes to `821c3264…4770b10a`, as the brief and body say [Observed] |

**Main since the merge base.**
- When I started, main was `b87e7a40` (PR #553). It changes none of the 15 PR paths [Observed, `static-checks.json` `mainChangedPrPaths`].
- Before my merge run, `git ls-remote` gave main `29db2b11153990f465c0b86fb3341865ae6459ac` (PR #548, `syzygy-bpyt.6.3-iso`). From
  `a15b6a04` it changes 178 paths. Two of them are PR paths:
  - `AGENTS.md`: the `packages/support` bullet gains `isRecord`;
  - `support-purity.test.ts`: `ALLOWED_IDENTIFIERS` gains `Array`, `Readonly`, `Record`, `isArray` and `isRecord`, beside a new
    `is-record.ts`.
- Neither touches a line this PR changes, and both auto-merge [Observed]. No `package.json`, lockfile, `vitest.config.ts`,
  `tsconfig.json` or workflow is among the 178 [Observed].

**Merge run.** The merge is `56966815` = `330dd894` + `29db2b11`, after `npm ci` ("added 117 packages"), with every dist absent and load1
23.60 → 27.32. I ran 10 files: the 4 changed test files, the 5 other importers of the two testkits, and main's new
`is-record.test.ts`. **10 files passed of 10; 231 passed, 0 failed, 1 skipped, 232 in all** [Observed, `merge-changed-tests.json`].
The skip is the strace counterpart row of `no-egress.test.ts`, which skips when strace is present.

## 2. Clauses relied on, and the class ruling

- CC-REV-1, `review-and-documentation.md:18-19`: "Changes touching any of seven classes require review by an independent,
  fresh-context reviewer, and the agent performing the change never finally decides which classes it touches."
- CC-REV-1 class 4, `:37`: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- CC-REV-1, `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:53`: behaviour-preserving means none of these changes:
  "a rendered byte, a wire format, a refusal string or an exit code;"
- GP-Q0, `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- GP-Q0's checks, `:65-66`: "a rule-6 mutant for each predicate;" and "a non-blocking owner notice in the cycle report."
- GP-Q0 stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- AGENTS.md at `330dd894`:
  - rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it";
  - rule 9: "A claim of absence needs a sweep with a denominator."
- The test-rigor bar (`git show 330dd894:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
  - `:60-63`: "**Edge and failure paths are first-class** … Happy-path-only coverage of a failure-prone component is a finding."
  - `:66-67`: "Expected values are literals or independently derived."
  - `:82-84`: "**A failure names the defect** … A maintainer should localize the bug from failure output alone."
  - `:103-104`: "apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not* catch but should."

**My ruling: class 4 (security), and no other**, the same as round 1 [Inferred, from the clauses and the diff].
- Every changed module guards an egress or purity property: the S10 no-egress bundle's entry derivation, `@syzygy/support`'s purity
  guard, and the owner-act drafter's identifier allowlist. That is "egress paths" through their test guards.
- Not class 1: no write-universe, authority table or adapter authorization changes.
- Not class 3: the POC surface version moves (§3), but `git grep -F` finds neither `9b6b1620ccc4` nor `82c041c8c559` in any of the
  7,637 tracked files at `330dd894` (exit 1, no match) [Observed], so no walkthrough record binds either.
- Not class 6: no endpoint, contract or export changes, and the built dist is byte-identical to the base's (§3).

So GP-Q0's three checks apply:
- the differential is §3, the dist comparison over every emitted file;
- the rule-6 mutants are §3 and §6;
- the owner notice is the coordinator's.

**The stop clause.** No product gate changes. What changes is what node-ci's `npm test` step refuses. I follow round 1 and the
#546 precedent: "a test guard that refuses more takes an owner notice on syzygy-bpyt.10, not an owner question". That holds only
if the notice lists exactly what the guards newly refuse against the base the PR merges into. The body's item 5 does not do that
today (F1), so the notice cannot yet be written from it.

## 3. What I ran, and the results

Setup:
- Clones under `rev-554-r2/`, each with `npm ci` ("added 117 packages"):
  - `clone` at `330dd894`;
  - `base`, used at `a15b6a04`, at `ecb1afb4`, and for the merge `56966815`;
  - `gov` at `330dd894`, for the battery only.
- Private TMPDIRs `/tmp/r554b-1` to `/tmp/r554b-19`, each deleted after use.
- One vitest process at a time.
- Node v24.6.0, vitest 3.2.7.
- `load1` is from `/proc/loadavg`, recorded beside every run in the `*.loadavg` files and in each row of the probe records.

| Run | State | load1 | Result |
|---|---|---|---|
| Whole suite, `npx vitest run --reporter=json`, `clone` at `330dd894` | every dist absent (0 dirs) | 20.77 → 37.06 | **254 files passed of 254; 5,644 passed, 0 failed, 5 skipped, 5,649 in all**; `success: true` [Observed, `suite-head-absent.json`]. All 21 added titles present and passed. No file failed, so none needed a run alone |
| Lane `mutants.py`, unchanged | absent | 22.55 → 24.25 | `summary {'rows': 34, 'asExpected': 34, 'unexpected': []} status after '' leftovers []` [Observed] |
| Lane `mutants.py`, unchanged | the 10 dists `npm run build` emits (exit 0) | 20.60 → 26.47 | `summary {'rows': 34, 'asExpected': 34, 'unexpected': []} status after '' leftovers []` [Observed] |
| Both re-runs against the lane's committed records (`tools/compare_lane_records.py`) | both | — | `'differing': []` in each state: same failing set, exit, passed and failed counts for all 34 rows [Observed, `lane-compare-*.txt`] |
| The lane's 34 rows with each failure message kept (`tools/lane_rows_with_messages.py`, round 1's, with the dist check following the build script) | both | 20.23–29.80 | 34 of 34 as expected in each state. Of the 32 messages in each state, 31 are `AssertionError`s. The other is the entry reader's own `@syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses`. 0 mention a timeout [Observed] |
| My rows (`tools/rev_probes.py`): H-, M- and S-rows at the head | absent; present | 22.02–34.96 | 19 rows, the same exit and failing set in both states [Observed, `rev-probes-head-*.json`]; §4, §5, §6 |
| My B-rows on `base` at `a15b6a04` | absent | 25.68–27.66 | which item-5 forms main already refuses (F1) [Observed, `rev-probes-base-*.json`] |
| Refusals 1-4 at `a15b6a04` (`tools/base_refusals.py`), fragments read by id from the committed records | absent | — | V7, V9, Y5b, Y5c, R2, U4 and U5 pass `support-purity.test.ts` 33 of 33. D2 and D5 pass the drafter test 3 of 3. Each is new against the merge base [Observed, `base-refusals.json`] |
| Round 1's probe `rev-554/tools/alias-shadow-probe.test.ts.txt` (sha256 `bd7f18d7…`), copied in verbatim, run and deleted | absent; present | 21.09; 29.69 | in both states: `@syzygy/polaris-dossier/argv`: `loaded: isArgvFault,readArgv`; `/state-directory`: `loaded: REVIEW_PACKET_DIR,…,within` (9 names); `@syzygy/polaris-generation-core/live`: 94 exports. Equal to the lane's `alias-shadow-probe.json` in each state; clone clean after [Observed, `alias-probe.json`] |
| `ecb1afb4` (round-1 repairs + main `a15b6a04`), the 5 touched test files | absent | 25.49 | `root-vitest-aliases.test.ts` failed at file level, `Cannot read properties of undefined (reading 'alias')`. The four others: 125 tests, 124 passed, 1 skipped [Observed, `ecb1afb4-merge-check.json`]. The body's "124 tests, 1 skipped" counts the passed ones |
| `npx vitest list --json`, the four files, `a15b6a04` vs head | — | — | 103 → 124 titles, +21 −0, the same 21 as the lane's `titles.json` [Observed, `titles-check.json`] |
| `npm run build`, `npm run typecheck` on `clone` | — | 19.67; 29.52 | both exit 0 [Observed] |
| Dist comparison (`tools/dist_hashes.py`): `npm run build` at `a15b6a04` and at `330dd894`, every file under every dist | — | — | 990 files each; 0 added, 0 removed, 0 changed [Observed, `dist-compare.json`] |
| `python3 scripts/check_governance.py` on `gov` | — | — | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0 [Observed] |
| `python3 scripts/check_quotations.py` on `gov` | — | — | exit 0 [Observed] |
| Canonical battery, `tools/battery.py` (round 1's) on `gov` | — | 21.03 → 32.77; 26.24 → 23.21 | The first run passed commands 1-96, each exit 0. Then `check_spec_reconciliation.py --selftest` overran `battery.py`'s 1800 s per-command limit and the tool stopped with `subprocess.TimeoutExpired`. Round 1 timed that command at 1,611.9 s. `tools/battery_resume.py` (the same tool, with a start index and a 14,400 s limit) re-ran commands 97-114. That selftest then exited 0 in 1,694.1 s, and the run ended `commit=330dd89458801e7a150134efa15f3d4af8215304 commands=18 nonzero=0 cleanAfter=True`. **114 commands, 0 non-zero** [Observed, `battery-combined.json`, `battery-resume.json`], matching the body's line 125. The failure was the tool's limit under load, not the command |

**Static checks** (`tools/static_checks.py`, `static-checks.json`):
- **The round-1 fix files, byte for byte.** Each of the five occurs exactly once in its target at `330dd894`, whole, with its
  trailing newline. No U+00A0 is in any fix file or target [Observed]:

  | Fix file (`rev-554/tools/`) | sha256 | Target | Occurrences |
  |---|---|---|---|
  | `fix-f2-object-entry-row.ts.txt` | `5a70742a…` | `workspace-reach.test.ts` | 1 |
  | `fix-n-write-rows.ts.txt` | `2238a3ee…` | `support-purity.test.ts` | 1 |
  | `fix-n-import-reader.ts.txt` | `9affefce…` | `support-purity.test.ts` | 1 |
  | `fix-n-import-row.ts.txt` | `bec4d557…` | `support-purity.test.ts` | 1 |
  | `fix-n-import-reader-rows.ts.txt` | `3b755d69…` | `support-purity.test.ts` | 1 |

  Each digest equals round 1's kept-files table. `root-vitest-aliases.test.ts` at `497cf1db` and at `ecb1afb4` hashes to
  `a10cf20a…`, round 1's `fix-f3-root-vitest-aliases.test.ts.txt`, so F3 was applied whole before it was dropped [Observed].
- **F1's five replaced texts.** Each occurs once in round 1's body (`lead/b46/body.txt`) and 0 times in this body:
  - (a) `8 test or test-support files`;
  - (b) old line 48;
  - (c) old line 56;
  - (d) old line 63;
  - (e) `and lists the six entries the config leaves to their built dist:`.
  F1(b)'s replacement, taken from the raw's line 169, occurs once. F1(c)'s raw text occurs 0 times, as the body says it was
  adapted [Observed].
- **Importers of the two testkits**, swept over all 780 code or config files outside `docs/` among the 7,637 tracked at
  `330dd894`:
  - `purity.testkit` is imported by 2;
  - `workspace-reach.testkit` is imported by 7;
  - that is 9 distinct files, every one a `*.test.ts`, and 0 that are not tests [Observed]. The body's "All 9 importers" is true.
- **POC surface version**, by `pwbSurfaceVersion`'s rule (sha256 over the two `src` tree ids):
  - `a15b6a04` gives `polaris@9b6b1620ccc4`; `330dd894` gives `polaris@82c041c8c559`, as the body says [Observed];
  - `b87e7a40` also gives `polaris@9b6b1620ccc4`;
  - the merge with `29db2b11` gives `polaris@5e39299adacf`, which is #548's move together with this PR's [Observed].
- **Changed paths:**
  - 0 outside `docs/evidence/syzygy-bpyt-46/`, `AGENTS.md`, `*.test.ts` and `*.testkit.ts`;
  - 0 `package.json`, `tsconfig.json`, `vitest.config.ts` or `.github/` paths [Observed].
  - Neither testkit is a built kit: `product-build.test.ts:31-34` names only `full-run.testkit.ts` and `recorder-fixtures.testkit.ts`.
    After `npm run build`, `packages/support/dist` holds `decode-utf8`, `deep-freeze`, `index` and `sha256` only [Observed].

## 4. Findings

### F1 — blocking (PR body). Item 5's refusal, E4's rule-6 line, one residual and the N6 clause describe main before #549

- **Severity:** low in effect. It is blocking under the verdict rule ("a false sentence in the PR body"), and because the owner
  notice is written from the refusal list.
- **Evidence.**
  - Since #549, every export carries `source` (`packages/polaris-dossier/package.json:20`, `"source": "./src/state-directory.ts"`).
    `targetOf` names a target only when `source` is that target's `src` counterpart:
    `return source === first.replace(/^\.\/dist\//u, './src/').replace(/\.js$/u, '.ts') ? first : undefined;`
    (`workspace-reach.testkit.ts:54`).
  - E4 (`mutants.py:104-106`) rewrites `import` and `default` only. So at `a15b6a04` its `source` disagrees, and the lane's E4 edit
    is already refused there (`B-E4-lane`: exit 1, 123 passed, 4 failed):
    - `no-egress.test.ts` fails at file level with
      `@syzygy/polaris-dossier/state-directory: its entry is not a ./dist/X.js whose src/X.ts exists`;
    - so do "the tree's own exports put a source condition first in every entry, naming the module the built target is read as",
      the island-boundary row "resolves every workspace import the CLI reaches, dynamic ones included", and two `subpath-imports`
      rows [Observed].
  - At the head with the `/../` check dropped (**M1** = E1 + E4), `no-egress.test.ts` still fails at file level, with that same
    unreadable-entry message [Observed].
  - The forms that are new against `a15b6a04` each pass all seven importers of the workspace-reach testkit there (exit 0, 133
    passed). At the head, each fails `no-egress.test.ts` at file level with the `/../` message, and the other six files pass (130
    passed, 0 failed) [Observed]:

    | Form | Base row | Head row |
    |---|---|---|
    | `source`, `import` and `default` all naming the `/../` form | `B-E4S-all-but-types` | `H-E4S-all-but-types` |
    | `types` alone with `/../` | `B-types-only` | `H-types-only` |
    | `apps/syzygy`'s `main` with `/../` | `B-main` | `H-main` |

    A string export with `/../` is already refused at `a15b6a04`, by three rows, two of them #549's source-condition rows
    (`B-string-export`) [Observed].
    By reading `targetOf` and the source-first row, those three forms are the only `exports`/`main` forms with `/../` that
    `a15b6a04` accepts [Inferred].
  - With the check dropped, the `source`-uniform form passes the S10 file, and only E1's own fixture row fails (**M2**: 135
    passed, 1 failed, over the seven files) [Observed].
  - After `npm run build` at the head, `packages/support/dist` holds no `purity.testkit.js`. `product-build.test.ts:99-102` pins
    that the build "emits no test and no test-support module, but the two kits a reader takes from dist" [Observed].
- **Sentences that are false or misattributed at `330dd894`** (line numbers are the body as `gh` returns it):
  - (a) line 56, "node-ci's `npm test` step now refuses forms it accepted at `1a8864d9`". This is true as worded. But
    `1a8864d9` is no longer the base this PR merges into, and for item 5 the difference matters.
  - (b) line 73, "E4, below, is that entry … at `1a8864d9` it passed". **False** at this head: E4 is not an entry whose conditions all agree,
    and the merge base already refuses it. The section is headed "Refusals this adds (for the owner notice)", so an owner notice
    taken from it credits this PR with #549's refusal and omits that `source` is in scope.
  - (c) line 74, "With the uniform edit". The edit is not uniform since #549.
  - (d) line 101, "E4, a uniform `/../` entry". As (c), and the line reads as though E4 pins item 5's check, which M1 shows it
    does not.
  - (e) line 111, "With the `/../` check dropped, a uniform `/../` entry passes the S10 file". **False** for the form the body calls
    uniform (M1 fails). True only for the `source`-uniform form (M2).
  - (f) line 52, "N6 (the testkit's test-only dist module imports `typescript`)". **False** at `330dd894`: the build emits no
    such module.
- **Failure scenario:** the coordinator writes the owner notice from "Refusals this adds". It tells the owner E4 is newly refused
  by this PR, which #549 already did. It does not say that a `/../` in `source` is now in scope. And it records a residual about a
  form that is in fact refused.
- **Exact fix (body only; no reviewed code byte changes).** `rev-554-r2/tools/f1_body_edits.py` holds six old/new pairs. Run on the
  frozen body, it prints `old occurs 1 new occurs 0 nbsp 0` for each, then `all edits apply: True` [Observed]. Given an output
  path, it writes the edited body. The new texts, verbatim:
  - **F1(a), line 56:**
    > node-ci's `npm test` step now refuses forms that main `a15b6a04`, this PR's merge base, accepts, in the five items below; the forms of items 1 to 4 were accepted at `1a8864d9` too. Today's sources pass every row.
  - **F1(b), line 73, replace the whole item:**
    > 5. A workspace package whose `exports` or `main` target contains `/../` now throws, in any condition, `types` and `source` included. Against main `a15b6a04` this refuses three forms that pass there in all seven test files that import the workspace-reach testkit, and that fail `no-egress.test.ts` at file level here with `…: its entry has a /../ segment, which Node refuses` (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, rows B-/H-E4S-all-but-types, B-/H-types-only and B-/H-main): an entry whose `source`, `import` and `default` all name the `/../` form (`./src/x/../state-directory.ts`, `./dist/x/../state-directory.js`); a `types` condition alone with `/../`; and a `main` with `/../` (`apps/syzygy`). E4, below, changes `import` and `default` and leaves `source` as `./src/state-directory.ts`, so since #549 its conditions disagree and `a15b6a04` already refuses it: `no-egress.test.ts` fails there with `…: its entry is not a ./dist/X.js whose src/X.ts exists`, and so do four rows of `island-boundary.test.ts`, `subpath-imports.test.ts` and `workspace-reach.test.ts`. A string target with `/../` is refused there too, by #549's source-condition rows. At `1a8864d9`, before the `source` condition, E4's edit passed `no-egress.test.ts` (round 1's `B-uniform-dotdot-entry`).
  - **F1(c), line 74, its first sentence:**
    > With E4's edit, the whole S10 file `no-egress.test.ts` fails before any row runs, with the message `@syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses` (E4). With the `/../` check also dropped, it still fails, with `…: its entry is not a ./dist/X.js whose src/X.ts exists`.

    The sentence about the round-1 head's E4 stays.
  - **F1(d), line 101:**
    > E4, a `/../` entry in `packages/polaris-dossier/package.json` (`import` and `default`; its `source` condition unchanged), fails `no-egress.test.ts` at file level with the `/../` message. It does not pin the check: since #549 its `source` condition disagrees with its targets, so with the check dropped it fails by the unreadable-entry throw (review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, M1). E1 and E5 pin the check.
  - **F1(e), line 111, its bold sentence and the parenthesis after it:**
    > **With the `/../` check dropped, an entry whose `source`, `import` and `default` all name the `/../` form passes the S10 file** (round 1's X2e, in its form since #549: review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2, M2).

    The sentence "The entry reader's own rows pin the check (E1 and E5)." stays.
  - **F1(f), line 52, the N6 clause:**
    > and N6 (at `2f48eefa` the build emitted the testkit, which imports `typescript`; since #549 `npm run build` emits no test-support module, so N6 is moot at this head).
- If the lane takes N1 below (E4 rewritten to the `source`-uniform edit), F1(c)'s added sentence and F1(d) change with it. That
  is N1's own text. With E4 as it is, the six texts above are true at `330dd894`.

### N1 — note. E4 no longer exercises item 5's predicate: round 1's N2, undone by #549

- **Evidence:**
  - Round 1's N2 asked for E4 to be uniform, so that only the `/../` check could kill it. The lane applied that edit. It was
    uniform at `1a8864d9`, which had no `source` condition, but it is not uniform at `a15b6a04`.
  - M1 shows E4 is killed with or without the check. So E1 and E5, through the fixture rows, are again the only pins on the
    predicate. That satisfies rule 6 ("per predicate"), and is why this is a note.
- **Proposed fix (for a follow-up, or this revision if the lane prefers):**
  - In `mutants.py`, define `E4S` as my `rev_probes.py` edit does: match the `source`, `types`, `import` and `default` lines, and
    rewrite `source` and both targets to the `/../` form. Use it for E4.
  - Its expected failing set is unchanged: `['file: @syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses']`
    (H-E4S, over the seven files).
  - Add a row `E1E4S-dotdot-check-dropped-under-a-source-uniform-entry` on `no-egress.test.ts` expecting `[]`, the disclosed
    residual. M2 passes `no-egress.test.ts`, and fails only E1's fixture row over the seven files.
  - Then F1(d) becomes: "E4, an entry in `packages/polaris-dossier/package.json` whose `source`, `import` and `default` all name the
    `/../` form, fails `no-egress.test.ts` at file level with the `/../` message, and with the check dropped it passes (E1E4S, the
    residual below)". F1(c)'s added sentence is then dropped.

### N2 — note. The write reader's object-rest arm has no reader row (round 1's N1, one arm on)

- **Severity:** low (workflow step 2, `SKILL.md:103-104`). The four N1 fix files pin the object-pattern, parenthesis and array-spread
  arms (W1-W3). The fifth arm, `ts.isSpreadAssignment(property) ? targets(property.expression)`, has no row.
- **Evidence** (each in both dist states):
  - **M5**, that arm replaced by `[]`, passes `support-purity.test.ts` 50 of 50.
  - **M5b**, M5 plus `({ ...Object.freeze } = {});` in `sha256.ts`, passes 50 of 50. That is a property write the no-write row's
    title says it refuses, and the body's refusal 3 ("spreads") lists.
  - **M5c**, the same write without M5, is killed by the no-write row alone: `AssertionError: expected [ Array(1) ] to deeply equal []`
    [Observed].
- **Proposed fix (verified, `fix-check.json`).** Insert the content of `rev-554-r2/tools/fix-n2-object-rest-row.ts.txt` before the
  `'let a = 1; a += 1; [a] = [2];'` case of the property-write reader:

  ```ts
      ['({ ...Object.freeze } = {});', ['{ ...Object.freeze } = {}']],
  ```

  - FX0, unmutated, passes 51 of 51.
  - FX-M5 and FX-M5b are each killed by the new row alone:
    `AssertionError: expected [] to deeply equal [ '{ ...Object.freeze } = {}' ]`.
  - FX-M5c is killed by the no-write row alone.
  - The clone was clean after.

  This adds 1 title.

### N3 — note. "`types` included" is a listed refusal that no row pins

- **M4** skips `types` when serializing the entry. **M4b** is M4 plus a `types`-only `/../` in the dossier manifest. Both pass
  `workspace-reach.test.ts` and `no-egress.test.ts`, 70 of 70, in both states [Observed]. The body's refusal 5 lists "`types`
  included".
- **Why not blocking:** round 1's N3, now `syzygy-bpyt.70` item 2, found that refusal false in its message, because Node never
  reads `types` (`node-targets.json` in `rev-554/`). A row pinning it would cement a message that round called false. M4 is the
  narrowing N3 recommends.
- **Proposed disposition:** `syzygy-bpyt.70` item 2 decides whether to narrow the check, and so the refusal, or keep it with a
  corrected message. Whichever it decides, it adds the matching row:
  - `expect(() => entryModulesIn(workspace({}, { types: './dist/x/../index.d.ts', import: './dist/index.js', default: './dist/index.js' })))`
    with `.toThrow(…)` or `.not.toThrow()`;
  - and changes refusal 5's "`types` and `source` included" in the owner notice in the same change.

### N4 — information. #549's alias guard reads the config as text, and misses a shorthand `alias`

- **S2** declares `const alias = { '@syzygy/polaris-dossier/argv': <src/index.ts> };` and adds `resolve: { alias },`. That passes
  `ALIAS_KEY = /\balias\s*:/` (`sync-child-process-guard.test.ts:26`). The wrong target is still refused, by #549's load row alone:
  `AssertionError: @syzygy/polaris-dossier/argv: expected { …(182), …(1) } to be { …(2), …(1) }`.
- **S3**, the same shorthand alias with the right target, passes every row of both files [Observed].
- So no wrong alias goes unrefused. What is gone with item 3's oracle is round 1's F4 refusal of a *right* alias, which is harmless.
  This is a note on #549's guard (`syzygy-bpyt.4.2`), not on this PR. Its text check could read the loaded config, as the dropped
  oracle did.

### N5 — note. `syzygy-bpyt.70` items 1 and 4 are moot at this head

- `bd show syzygy-bpyt.70`, item 1: "Alias the two subpaths ahead of the bare alias". There is no alias map now, and both subpaths
  load under vitest in both dist states (§3).
- Item 4: "packages/support/dist/purity.testkit.js imports typescript". The build no longer emits it (§3).
- **Proposed disposition:** record both as answered by #549 on the bead, leaving items 2 and 3, so no one re-opens a config change
  for a problem that no longer exists.

M7 (the write reader's default arm dropped) passes 50 of 50, as round 1's X5 found: a default is itself an assignment the visitor
reads. Round 1 recorded it as redundant, so it is no new finding.

## 5. Verdict on each round-1 finding, and on the supersession

| Round-1 finding | Verdict | Basis |
|---|---|---|
| F1(a), the file count | **met, as adapted** | "6 test or test-support files" is true at `330dd894`: 6 modules outside `docs/evidence/` and `AGENTS.md`. The raw's "7" would be false now, since `root-vitest-aliases.test.ts` is gone |
| F1(b), refusal 3 | **met** | The raw's text occurs once, byte for byte. U4 and U5 pass at `a15b6a04` (`base-refusals.json`), so they are still new against the merge base. #549 changed only the exports row of `support-purity.test.ts`, so the default form's base status carries from `1a8864d9` [Inferred] |
| F1(c), refusal 5 | **partly met** | Adapted clause 1, "the whole S10 file now fails on it", is true (H-E4S). The raw's "both root-alias rows and" would be false, since the file is gone. Adapted clause 2, "E4 … is that entry … at `1a8864d9` it passed", is true of `1a8864d9` but wrong about the merge base (F1). The raw's clause, "E4 changes the `import` condition alone", would be false of the edit. Its conclusion, that E4 "shows the new message, not a new refusal", is true again at `a15b6a04`, through the `source` condition |
| F1(d), F1(e) | **superseded** | Both texts went with the oracle and occur 0 times |
| F2, the object-entry row | **met** | Byte for byte. E5 (X2) is killed by the `/../` row alone in both states. My M3, the check reading only the first condition, is killed by the same row (`AssertionError: expected [Function] to throw an error`) |
| F3, the oracle's alias model | **superseded, soundly** | Below |
| F4, the correct-alias refusal | **superseded** | It went with the oracle. A literal `alias:` key is now refused whatever its target, by #549's guard. A shorthand right alias passes (N4); that is harmless |
| N1, reader rows | **met** | Four fix files byte for byte. W1, W2, W3, I1 and I2 are each killed by exactly the rows stated, in both states. My M6b (the `import()` reader not descending into an arrow body) is killed by the arrow-body reader row alone. One arm remains unpinned (N2) |
| N2, E4 exercising item 5's predicate | **not met in effect** | Applied as worded, but undone by #549 (N1, M1) |
| N5, item 4 | **met** | The new `AGENTS.md` sentence names `support-purity.test.ts` and lists six pins. Each is a row at `330dd894`: the specifier row (`:93-98`) and the createHash row (`:104-109`), the identifier row (`:100-102`), the no-write row (`:111-113`), the `import()` row (`:115-117`), the dependency row (`:126-131`) and the exports row (`:133-136`) [Observed] |
| N3, N4, N6 | **to `syzygy-bpyt.70`**, lawfully | Not in this PR, as the brief says. N6 is now moot (N5); N3 bears on this round's N3 |

**The supersession.** The coordinator's ruling is sound at `330dd894` [Observed, unless marked].

Item 3's oracle pinned three things:
- each alias's target to the module its entry names;
- the unaliased entries as a list;
- (with F3) Vite's first-match order.

#549 refuses the forms behind all three:
- The guard: `sync-child-process-guard.test.ts:25-26`,
  `const SOURCE_CONDITION = /\bssr:\s*\{\s*resolve:\s*\{\s*conditions:\s*\[\s*'source'\s*,/;` and `const ALIAS_KEY = /\balias\s*:/;`,
  and `:73`,
  ``if (!SOURCE_CONDITION.test(config) || ALIAS_KEY.test(config)) throw new Error(`${VITEST_CONFIG}: workspace packages do not load by their source condition alone`);``
- The behavioural row: `workspace-reach.test.ts:173`, `it('load, under the suite, each entry from its source module', …`, with
  `:183`, `expect(await import(specifier), specifier).toBe(await import(pathToFileURL(join(ROOT, source)).href));`
- The manifest row: `:158`, `it('put a source condition first in every entry, naming the module the built target is read as', …`,
  with `:165`, `|| resolveIn(WORKSPACE, `${manifest.dir}/src/index.ts`, specifier) !== posix.join(manifest.dir, entry['source']);`

My mutants against them, each in both dist states:

| Row | Edit | Result |
|---|---|---|
| **S1** | a literal `alias:` key with a wrong target | killed by the guard row (`Error: vitest.config.ts: workspace packages do not load by their source condition alone`) and by the load row |
| **S2** | the shorthand form with a wrong target | killed by the load row alone (N4) |
| **S4** | `'source'` dropped from the conditions | killed by the guard row and the load row: with dist absent `Error: Cannot find package '@syzygy/three-surface-poc-app/dossier-render' …`, with dist present `AssertionError: @syzygy/three-surface-poc-app/dossier-render: expected { …(3), …(1) } to be { …(3), …(1) }`, the built module |

What these mean:
- A test resolution that leaves the `source` condition is refused.
- A `source` condition that names a module other than its built target's counterpart is refused, by `:158-165` and by `targetOf`.
- There is no alias map, so nothing can shadow a subpath and no order needs pinning. Round 1's probe now loads both dossier
  subpaths in both states, as the lane reports.

**No protection is lost** [Inferred from S1-S4 and the probe]. The one refusal that does not carry over is F4's, of a right alias
(S3), and it is harmless.

## 6. Test quality, the refusal list, and rule 6

**The refusal list.** I held the five items against `a15b6a04`, the merge base, and against my runs [Observed, unless marked]:

| Refusal | Holds at head? | New against `a15b6a04`? |
|---|---|---|
| 1, V7 | yes (FN-V7) | yes (passes at base) |
| 2, V9, Y5b, Y5c, R2 | yes | yes (all four pass at base) |
| 3, U4, U5, parentheses, spreads, nested patterns | yes, for each listed form | yes for U4 and U5 at base; the rest by round 1's base probe, carried [Inferred] |
| 4, D2, D5, any unlisted name | yes | yes (D2 and D5 pass at base) |
| 5 | yes | not as worded: E4 is refused at base. The three new forms are named in F1(b) |

The code refuses nothing the body does not list:
- The `import()` reader reads `CallExpression`s with `ImportKeyword` only, so an `import('x')` *type* is not refused.
- The write reader adds only destructuring, parenthesis and spread targets, plus object rest, which falls under "spreads".
- The entry reader adds only the `/../` throw. Its other paths equal the old `workspaceAliases`: `Object.entries` for
  `Object.keys`, and `resolveIn(workspace, …)` for `resolve(…)`.
- The drafter row is item 4.

No listed refusal refuses a form today's sources use: the suite is green at the head and on the merge.

**Rule 6.**
- **The lane's rows.** Each stores its edits verbatim, the commit it ran at, and its expected failing set, written before the run.
  My re-runs match the committed records row for row in both states, and every kill is an assertion or the reader's own error,
  never a timeout (§3).
- **The rows the brief names:**
  - E4's re-pointing at `no-egress.test.ts` is real: its failing set is the file-level `/../` message. But it does not pin the
    check (N1).
  - E5 pins F2.
  - W1-W3 and I1-I2 pin N1's arms.
  - A5 is not present at `330dd894`: it went with the oracle, as did A0-A6 and E1E4 [Observed, by comparing `mutants.py` at
    `ecb1afb4` and `affd777c`].
- **My own rows against the repaired code:**
  - killed as predicted: M3 (F2's row) and M6b (N1's reader);
  - surviving, as N2 and N3: M5 and M5b, M4 and M4b;
  - M6 was ill-formed. It read `node.parent`, which `createSourceFile(…, false)` does not set, so its "kill" is a `TypeError` in
    three reader rows, not an assertion. I do not count it, and replaced it with M6b.

**Failure messages (bar 7).** Every new assertion names what failed:
- the support rows print `<file>: <text>`, e.g. `expected [ 'sha256.ts: import (value)' ] to deeply equal []`;
- the drafter row prints the stray names, `expected [ 'HOME', 'globalThis' ] to deeply equal []`;
- the entry reader's throws name the specifier and the reason;
- the `/../` row's first line is `expected [Function] to throw an error`, which its title localizes.

**Expected values (bar 4).** Every expectation is a literal: the drafter's 63 names, the reader cases, and the fixture entry map.
The S10 alias row's expectation derives from the manifests, independently of the code under test.

**Edge paths (bar 3).** N2 (object rest) and N3 (`types`) are the one-line bugs the repaired rows still miss.

**Determinism.** No row depends on time or order, and no retry or sleep was added.

**Net test delta:** +21 titles against `a15b6a04` (17 support, 1 drafter, 3 entry reader), 0 removed. N2's fix would add 1.

## 7. Cleanup

Deleted:
- the clones `rev-554-r2/clone`, `base` and `gov`;
- the TMPDIRs `/tmp/r554b-1` to `/tmp/r554b-19`;
- my copy of the PR body (`/tmp/r554b-body.md`).

Not kept: the 2.2 MB suite report (its summary and digest are in `suite-head-absent.json`); the two battery logs (their per-command
results are in `battery-combined.json` and `battery-resume.json`); and the build, typecheck, governance, quotations and `npm ci` logs. Every kept file is under 300 KB.

46 kept files, plus this raw:

| Kept file | sha256 |
|---|---|
| `tools/base_refusals.py` | `da69f3040700131d6bde6efcb51343b1b4efa9a4dd4eb4f08fa2a01781947a31` |
| `tools/battery.py` | `4a30a3b6fbe065a125da5f7b7bfe2500242da6996d70541f5fe83d9786c0ac14` |
| `tools/battery_resume.py` | `f201a3883c84f46bec6a678426f42ee665be1f36fea960209da58e6091c700a7` |
| `tools/compare_lane_records.py` | `c99c14612819cd7cf52c94badf3697f431537e75a997df4b3c310a42fd7f3d1f` |
| `tools/dist_hashes.py` | `f1fea0b710b760dddf42ad132d4f241f89c8bb7e7c063aca7d4f36c067da5522` |
| `tools/f1_body_edits.py` | `dbd797318f8e40fb86f92c0c7531330e876bad5f76df40e08bc3f1acae50effa` |
| `tools/fix-n2-object-rest-row.ts.txt` | `73fcffaec45f49fbd589c95c4512a5796235fcd56958b36dc02344cf7e0916f6` |
| `tools/fix_check.py` | `192d72c796b278fcfe3ceb046a202ee08a3758a5bfc34d4377eb671c390b1e58` |
| `tools/lane_rows_with_messages.py` | `eebc4e45ee2c63fd8e65cc6b89f85003929420410e92453166d0e79d16b4e47d` |
| `tools/rev_probes.py` | `296cb3b6e5ad6bbb259bdfd19d153349bf972efb0dc55a7d9af83df9bd101d36` |
| `tools/static_checks.py` | `40d0d948a8eaa0d71137970effc031e1496aeadea6fc6e1ed531801da6f15540` |
| `alias-probe.json` | `1703c17d1853a0ac2746f35a1b462934cbefb5ad628798edac16f102cf876d67` |
| `base-refusals.json` | `259ae355532f8fed19e3a2d6cbb61d1f0eefd88296aed5eca902ad9285941fbb` |
| `base-refusals.log` | `0a7acc14a5b09487b479a7590afabdc6a72a787e8d947a06c9751cde7ab8051e` |
| `battery-combined.json` | `36c0c24a116781570c5b343d8ec3dece2a40446d64425e97d1680d0d1a9669ab` |
| `battery-head.loadavg` | `ad184e129f13306ca732dec66de0e89ed4b1eb35923900e6a75a9000e1399860` |
| `battery-resume.json` | `285dd1bf7dfbc6cc634b170803d0808b4e069808c6bd96134060faaf68777042` |
| `battery-resume.loadavg` | `c1e6feef3b07c9433d5ad37b8e8cc9cb579afcf3755fce94c49d70a8ac42e3da` |
| `dist-compare.json` | `843888ded2563b3269b5313211eeb153c9ebcefff6a63fbcb9f29b55134ab9b6` |
| `ecb1afb4-merge-check.json` | `45f5ce656a76a7c89a4ebc9b3e66aeeef352f5803671262feee1feeb5c2d5893` |
| `fix-check.json` | `b194fdd14c4477d0e37358457bb7a61b07b6127abac182ed14efe8419c4f7eb1` |
| `lane-compare-absent.txt` | `69b2b435c42131b7a7b53804f56c8fd082051538dc9e47e7f1df786d1eeb52e7` |
| `lane-compare-present.txt` | `69b2b435c42131b7a7b53804f56c8fd082051538dc9e47e7f1df786d1eeb52e7` |
| `lane-mutants-absent.json` | `59b5431dff7a1530ea85ee2713ec7afc372c3a3c95981693b092120ee6bac2af` |
| `lane-mutants-absent.loadavg` | `44f1e93187c97a31b25ef417047bab9a42185e485df140b51a9dc6f448adf70c` |
| `lane-mutants-absent.log` | `7fea270088f0caf2f398514bf1dd7c5eea632b6474d8474ab66809c70182290b` |
| `lane-mutants-present.json` | `53a676b0a3691fb839fb12b31d0d9055cbceadbf310e7fa6857f6f8faded27a5` |
| `lane-mutants-present.log` | `7fea270088f0caf2f398514bf1dd7c5eea632b6474d8474ab66809c70182290b` |
| `lane-rows-messages-absent.json` | `681ceb74edcbed944907685f5e7334ab8eab37a2e8fbddfb3e11a1197ad04717` |
| `lane-rows-messages-absent.log` | `a883e8a840b9ac9caae69eb5384f6685ff0a3f5e39c96526d6c64135972f2a6d` |
| `lane-rows-messages-present.json` | `51cb409d6b4cca40332916eff36f30f4b2ce138aabaed04fa89890156dbbdedd` |
| `lane-rows-messages-present.log` | `e7edff2085d8606740e7b7fc35d11c4542d9689e3004f1b64807d5d88c583fd4` |
| `merge-changed-tests.json` | `daa588def94518e87ae7e463293ef708972ca4d020ae1a4b67325948bc0daf93` |
| `present-runs.loadavg` | `c99cef84fc9acc19222854536e4558018580167d6e16cfb37e52415eba5e9521` |
| `rev-probes-base-absent.json` | `06892c48ee5a40f6d22f8c5d73e6d374ad3e5ae5b79256c5dadd8fe678c030f2` |
| `rev-probes-base-absent.log` | `2e22f269b3653f821147028d24d6e69b49f6feb84741a8dc97f88e9e0ea3911b` |
| `rev-probes-base-string.json` | `ab765629e3992b05c7f48ed34867deb3dd9ac6bed6a1a742648e3b8e2b2da207` |
| `rev-probes-head-absent.json` | `c6f473b43c896057da24e699ed75e5025dba9ea7dee42d7696605ade34b34740` |
| `rev-probes-head-absent.log` | `2e8fb15508c7345cd49fdea286b114b8e89541ad76d5b0f3b5058f3ff83a1837` |
| `rev-probes-head-m6b.json` | `af0b54b3ca13f48ba808d5970e54e13c425b49952f1a00d4dcab3a9188835d87` |
| `rev-probes-head-present.json` | `19822983ea7f8befe4f0bbdcdb3880b510dfe3a84e75bff4733d4058aae78e4b` |
| `rev-probes-head-present.log` | `3b7b1a55687026ae31d15d806519514c64db4e39a9c480c587cda034618f385c` |
| `static-checks.json` | `f0e90098cbba944ee25dbbd6d5d439169f80d80d8503bf9f33dfdd14a09afc4b` |
| `suite-head-absent.json` | `69ed4bf3b54f6c7f823f01d7aeaa337c86abcb6399b7c1f7c6262f36900eab70` |
| `suite-head.loadavg` | `9d1f4d0626b742909dd9ad2f92b85efb964dfd442ac9200df072cc4b7278eeb0` |
| `titles-check.json` | `f353f4e31857e9f907c78d7c0a2d9e12c182c1cc00673f52e7d79e521f71fbf3` |
