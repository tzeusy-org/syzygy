# R-GP-IMPL-SOURCE-RESOLUTION-3 — CC-REV-1 implementation review of syzygy-bpyt.4.2, round 3
Verdict: REVISE
Reviewed commit: a607bb62
Subject: body-r2-to-r3.diff sha256 57d593cef8eb9d5ed221ba865aac07dd6db23854a240d082f46b69c7f322bfb3

Reviewer: independent, fresh context, under brief `lead/b42pr/brief-r3.md`. Date: 2026-10-28 (runs about 04:50–05:03Z). I fetched
no content from any target repository. I opened no credential file and nothing under `~/.claude/` or `~/.config/`. I changed no
tracked byte of the subject, pushed nothing, commented on nothing, and dispatched nothing.

Summary: all five round-2 replacements are present verbatim and every old text is gone. The only other changes are the declared
round-2 paragraph and one trailing blank line. F2's, F3's and F4's replacement sentences are true at a607bb62, and so is most of
F1's. **REVISE comes from two small false clauses.** The first is round 2's own F1 text: "its `sourcesOnly` plugin refuses any
resolution outside `packages/*/src` and `apps/*/src`" (body line 20). The plugin only intercepts `@syzygy/*` specifiers. 73 of the
bundle's 198 inputs lie outside those directories, and it refuses none of them. The second is the new paragraph's count, "four
PR-body sentences" (line 9): F1–F4 replaced five passages, about ten sentences in all. Each has exact replacement text in §4.
Neither needs a code change.

Body line numbers below are `cat -n` lines of the served body at the head (`body-r3.txt`).

---

## 1. Subject identity checks

| Check | Result |
|---|---|
| PR head | [Observed] `gh pr view 549 --json headRefOid` gives `a607bb62cbd1574125ad62f1b92ddbe0ec985655`, state `OPEN`, `MERGEABLE`. My clone's `git rev-parse HEAD` after checkout: the same. **Unchanged since round 2.** |
| Served body | [Observed] `gh pr view 549 -R Tzeusy/syzygy --json body --jq .body \| sha256sum` gives `4d370a6a7b9ec1dfc49adeb620ee41765144c5ea8333e6f941395df98a7cf0a7`, which equals `body-r3.txt`. **The served body matches the frozen one.** |
| body-r2.txt | [Observed] `0881d54d7a6bc80475fb2ccd4de8c98178977488d615164dc4ba6f2c3c4f9caf`, as the brief says. |
| Subject diff | [Observed] `diff body-r2.txt body-r3.txt \| sha256sum` gives `57d593cef8eb9d5ed221ba865aac07dd6db23854a240d082f46b69c7f322bfb3`. That equals the frozen `body-r2-to-r3.diff`, which hashes the same. |
| Round-2 raw | [Observed] `3c02336d308a6478008c2d683c82145f6f2d07639b93224c05f9e35b78a2e95f`. Its head reads `Verdict: REVISE` and `Reviewed commit: a607bb62`. |
| Apply tool | [Observed] `lane-b/apply_r2.py` is `4801982f377e1ee1617adde6844eb5398499e77f457331c716c01d9b386657b7`. I read it but did not use it. My check (`tools/check_body.py`) finds the quotes by scanning section 4 for blockquotes, not by fixed line numbers. |
| U+00A0 / U+FEFF | [Observed] 0 and 0 in body-r3 (`check_body.py`), and 0 and 0 in this raw (§6). |

## 2. Clauses relied on (quoted)

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md:16-…`, at a607bb62:
  - "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the
    change never finally decides which classes it touches."
  - "**Class membership is contested by default and is never finally determined by the agent performing the change**"
  - "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation after
    the fact."
  - The class 4 and class 6 sentences in body lines 97–98 are that change record's candidates, so a false clause there is a defect
    in the record that CC-REV-1 relies on.
- `AGENTS.md` at a607bb62, verification rules:
  - 2: "No "zero / all / 100%" claim without running that exact sweep this session, confirmed by a second method." This applies to
    F3's "no tracked module has one" and to F4's "every tree it still accepts".
  - 4: "Read a check's output, not its exit code, and check its denominator against the whole population." This applies to the
    sourcesOnly scope (§3.2) and to the X9 re-check (§3.5).
  - 8: "Anchor a contract claim to a defined clause and quote it; nearby prose is not the clause."
  - 9: "A claim of absence needs a sweep with a denominator." This applies to F3's sweep.
- The brief's verdict rule: "**REVISE** if a replacement is missing or not verbatim, or any body sentence is false at `a607bb62`".

## 3. What I ran, and the results

I worked in a clean clone of `/home/tze/GitHub/syzygy` at a607bb62, with `npm ci` and no dist present. Private TMPDIRs were
`/tmp/r549c-1`…`4`. I made one vitest process at a time, with two files per run.

### 3.1 Replacements (`tools/check_body.py` → `body-check.txt`)

- [Observed] Section 4 of the round-2 raw holds exactly 5 blockquotes, at raw lines 253, 257–258, 273, 289 and 304. Those are
  F1 (line 18), F1 (lines 95–96), F2, F3 and F4.
- [Observed] Per quote, the result lines read:
  - `F1a: raw lines 253-253; old in r2=1 old in r3=0 new in r2=0 new in r3=1`
  - `F1b: raw lines 257-258; old in r2=1 old in r3=0 new in r2=0 new in r3=1`
  - `F2: raw lines 273-273; old in r2=1 old in r3=0 new in r2=0 new in r3=1`
  - `F3: raw lines 289-289; old in r2=1 old in r3=0 new in r2=0 new in r3=1`
  - `F4: raw lines 304-304; old in r2=1 old in r3=0 new in r2=0 new in r3=1`
- [Observed] I applied those five replacements to body-r2 and diffed the result against body-r3. Exactly two insertions remain:
  - `insert exp 7 7 [] | r3 7 9 ['', "**Review round 2 and its repair.** …"]`, the declared paragraph.
  - `insert exp 143 143 [] | r3 145 146 ['']`, one extra trailing blank line. The served body now ends `\n\n` where it ended `\n`,
    which does not render (N2).
  - Nothing else in the body changed.

### 3.2 F1: no-egress and the class 4 and class 6 candidates

- [Observed] `git rev-parse a1b9bde2:packages/polaris-dossier/src/no-egress.test.ts a607bb62:…` gives
  `4448b9ad19950c1e2c0a2e9b187cb9cea9662e25` twice, so the file is main's.
- [Observed] It bundles by `bundleDriver` with `alias: aliases, plugins: [sourcesOnly(SOURCE_ROOT)]`
  (`no-egress.test.ts:66-73`). `workspaceAliases()` calls `resolve` from `../../polaris-generation-core/src/workspace-reach.testkit.js`
  (`:6`, `:28-41`).
- [Observed] `git diff a1b9bde2 a607bb62 -- …/workspace-reach.testkit.ts` changes only `targetOf`. It now drops `source` from the
  agreeing conditions and requires `source` to equal the target's `./src/X.ts` form when present. So "which now reads each entry's
  `source` condition" is true.
- [Observed] `git show e7250716 -- no-egress.test.ts` removes exactly 10 `'@syzygy/…': src(…)` alias lines and adds
  `conditions: ['source'],`. So "Before the merge, `e7250716` had replaced its 10-entry alias list with `conditions: ['source']`" is
  true.
- **The sourcesOnly scope** (`tools/s10_scope_probe.mjs` → `s10-scope-probe.txt`). The probe builds the driver exactly as
  `no-egress.test.ts` does at the head: aliases derived through the testkit's `resolve`, with `sourcesOnly` copied from `:47-63`
  plus one line that records each refusal, and a metafile. Results:
  - [Observed] `aliases 18`
  - [Observed] `bundle sha256 18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340 bytes 935757`. That is the class 4
    digest the body cites, so I reproduced the head side. The main side and the b10e4da9 side rest on the round-2 raw's line 59 and
    the round-1 raw's line 79 (`{"form":"base","sha256":"18172eb2…`). [Inferred] Those raws are true as records of what was run.
  - [Observed] `inputs 198 outside packages/*/src and apps/*/src 73`. Of those, `node_modules inputs 72` are `node_modules/yaml/dist/…`,
    and the 73rd is `packages/polaris-dossier/test-support/no-egress-driver.ts`, the entry point itself.
  - [Observed] `sourcesOnly refusals recorded 0`.
  - [Observed] A second build under the same plugin bundles a relative import of a workspace dist module,
    `./packages/support/dist/probe-r549c.js`: `relative dist import: build succeeded, errors 0`.
  - [Observed] The code says why: `bundler.onResolve({ filter: /^@syzygy\// }, …)` (`no-egress.test.ts:51`). Its own doc comment
    reads "Fails the bundle when an `@syzygy/` specifier resolves outside every workspace package's `src`" (`:44`).
  - **So "refuses any resolution outside `packages/*/src` and `apps/*/src`" is false. This is F1 below.**
- **Class 6** (`tools/exports_census.py`, comparing a1b9bde2 with a607bb62 → `exports-census.txt`):
  - [Observed] `workspaces base 12 head 12 same set True`.
  - [Observed] `head workspaces with exports 9`. The three without are `apps/syzygy`, cap1-conformance and cap1-system.
  - [Observed] `entries 17 with source first and otherwise unchanged (or bare->object same target) 17`.
  - [Observed] The app's three entries were bare strings at main and are `{"source": …, "default": <same dist path>}` here.
  - [Observed] No `ENTRY SET DIFFERS` line, so no entry is added or removed. The class 6 sentence is true.

### 3.3 F3: the emit model (`tools/tripleslash_sweep.py` → `tripleslash-sweep.txt`)

- [Observed] `emitted()` (`apps/three-surface-poc/src/product-build.test.ts:62-75`) starts from `parsed.fileNames`. It follows
  `importsOf`, which is `ts.preProcessFile(…).importedFiles` (`:59`), and admits a target only if it `startsWith(`${project}/src/`)`.
  It never reads `referencedFiles`. So "the files each tsconfig names, plus every module of the project they import, transitively;
  a triple-slash `reference path` is not followed" is true.
- [Observed] Method 1, Python `re` `^\s*///\s*<reference\b` over `git show` of every tracked file, gives: `562 tracked
  .ts/.mts/.cts/.tsx files; 0 reference directives in 0 files`.
- [Observed] Method 2, `git grep -F '<reference'` over the same suffixes, gives 5 hits in 3 files. None is a directive:
  - `docs/evidence/argv-table-review-2026-10-25/tools/guard-probe-tail.ts:18` holds the text inside a string literal (`"/// <reference
    path=…"`), in an evidence tool that is not a project module.
  - The other 4 hits are the prose `<decisionsDir>/<reference>.yaml`, in `consent-record-convention.conformance.test.ts` (3) and
    `cap1-daemon/src/consent-loading.ts` (1).
  - "no tracked module has one" is true.

### 3.4 F4: the clean build (`tools/clean_build_parity.py` → `clean-build-parity.jsonl`; `tools/refusal_parity.py` → `refusal-parity.jsonl`)

- [Observed] Reading the scripts:
  - At a607bb62, `scripts/clean_build.mjs:23`, `:25`, `:26`, `:28` and `:30` are every throw after the usage check (`:17`). All of them precede the only `rmSync`
    (`:40`) and the `tsc -b` spawn (`:42`).
  - At `2f249d2c`, the throws after the usage check (`:14`) are `:20`, a `JSON.parse` that throws at `:21`, and `:23`.
  - The head adds three refusals: the cycle (`:23`), the outside-checkout check (`:26`), and `declarationDir`/`outFile` (`:30`).
  - The parenthetical names exactly those three. The not-plain-JSON refusal is only a reworded message, because `2f249d2c` also threw
    there, so leaving it out is right.
- [Observed] Parity probe. Each tree was run with its own `build:poc` and `build` lists, a stub tsc that records its argv, and a
  marker in every project's dist. Every line reads `same removed set: True same tsc argv: True both exit 0: True`, for
  `8322df4f build:poc`, `8322df4f build`, `a607bb62 build:poc` and `a607bb62 build`. 8322df4f is the commit the stale-dist record
  names (`"commit": "8322df4f49280b989d8a959f8a9a4348750cd254"`, with the same `buildPocScript`). So "the stale-dist tree is one" is
  true.
- [Observed] Refusal probe, each case run under both scripts:

  | case | 2f249d2c | a607bb62 |
  |---|---|---|
  | `cycle` | `"exit": 0, … "removed": ["packages/a", "packages/b"], "tscRan": true` | `"exit": 1, "refusal": ["Error: packages/a -> packages/b -> packages/a: project references form a cycle"], "removed": [], "tscRan": false` |
  | `declarationDir` | exit 0, both removed, tsc ran | `"exit": 1, … "removed": [], "tscRan": false` |
  | `outFile` | exit 0, both removed, tsc ran | `"exit": 1, … "removed": [], "tscRan": false` |
  | `outside` (a symlinked project dir) | exit 0, both removed, tsc ran | `"refusal": ["Error: packages/b: resolves outside the checkout"], "removed": [], "tscRan": false` |

  "has nothing removed and no `tsc -b` run" is true. [Inferred] "For every tree it still accepts, it removes the same set" holds in
  general, not only for the two trees probed. For any tree the head accepts, `visit` reaches the same project set (post-order
  instead of pre-order), and the spawn argv is unchanged. That matches the kept sentence "Only the removal order changes".

### 3.5 F2: the plugin row (`tools/x9_recheck.py` → `x9-recheck-*.txt`)

- [Observed] The row "load, under the suite, each entry from its source module" is
  `packages/polaris-generation-core/src/workspace-reach.test.ts:173-185`, and that file falls under the
  `@syzygy/polaris-generation-core` project's include (`vitest.config.ts:26-27`). It does three things:
  - It drops `apps/three-surface-poc/src/main.ts` (`:179`, `expect(entries.length - imported.length).toBe(1)`).
  - It asserts `expect(await import(specifier), specifier).toBe(await import(pathToFileURL(join(ROOT, source)).href))` (`:183`).
  - [Observed] Over `vitest.config.ts`, `extends: true` occurs 9 times for 9 project names, and `plugins` keys occur 0 times.
  - So the first sentence is true.
- [Observed] X9 re-check, with a plugin declared inside the POC app's project entry that sends `@syzygy/support` to a nonexistent
  dist path:
  - **Plugin `name` double-quoted** (round 2's form): `exit 0`, `Test Files  2 passed (2)`, `Tests  67 passed (67)`, config
    restored. Neither the row nor the text check sees it, which reproduces round 2.
  - **Plugin `name` single-quoted** (the repository's own string style): `Tests  1 failed | 66 passed (67)`, with `Error:
    vitest.config.ts: 10 projects but 9 recognized single-glob includes`. The text check's `PROJECT_NAME = /\bname:\s*'/g`
    (`sync-child-process-guard.test.ts:22`) counts the plugin's `name:` as a tenth project, and its shape check fails closed.
  - That is an incidental refusal, not detection of a plugin: the message is about project counts, and the double-quoted form passes.
  - [Inferred] The sentence "is seen by neither this row nor the text check" is true as a statement of what each check looks for,
    and it errs toward understating coverage. See N1.

### 3.6 Hosted checks at a607bb62

- [Observed] `gh pr checks 549 -R Tzeusy/syzygy`:
  - `checks	pass	17m6s	…/runs/40625243948/job/122608484884`
  - `node	pass	4m19s	…/runs/40625243606/job/122608483793`
- [Observed] `gh run view` reports both runs at `headSha a607bb62cbd1574125ad62f1b92ddbe0ec985655`, `pull_request`, `success`
  (`governance-docs`, `node-ci`).
- [Observed] node-ci log: `Test Files 251 passed | 3 skipped (254)`, `Tests 5564 passed | 5 skipped (5569)`, then `Test Files 10
  passed (10)`, `Tests 51 passed (51)`.
- Those figures match body lines 92 and 135.

### 3.7 Other body sentences against the replacements

- [Observed] Line 122, "`no-egress.test.ts` takes #545's bundle setup and so matches main", agrees with the F1 text and the blob
  equality.
- [Observed] Line 22, "That is a text check, and it does not see a resolver plugin", agrees with F2.
- [Observed] Line 34, "An option inherited through `extends` is not read", agrees with F4.
- [Observed] Line 12, "Each workspace export lists a `source` condition first", is true: 17 of 17 (§3.2).
- [Inferred] Line 3, "Tests and the typecheck now load every `@syzygy/*` package from source through an export condition", stays
  consistent with F1's alias-map account. `targetOf` admits an entry only when its `source` names the module the alias then points
  at, so the bundle reads what the condition names.
- [Observed] Line 107, "its derived alias map still sends every specifier to src, and `sourcesOnly` refuses any other resolution",
  repeats F1's over-broad scope in a softer form. The alias map's specifiers are all `@syzygy/*`, so it is readable as scoped. See
  N3.
- [Observed] The round-2 paragraph (line 9) is checked against the raw's head and section 4: "raw sha256 `3c02336d…`" is true,
  "was REVISE over `a607bb62`" is true, "each finding's replacement text is applied verbatim" is true (§3.1), and "the head stays
  `a607bb62`" is true (§1). "on four PR-body sentences (F1-F4)" is not: F2 below.

## 4. Findings

### F1 — The F1 replacement on body line 20 says `sourcesOnly` refuses any resolution outside the workspace sources; it refuses only `@syzygy/*` specifiers (low, blocking: a false clause in the PR body)

**Evidence.**
- [Observed] Line 20 now reads "…and its `sourcesOnly` plugin refuses any resolution outside `packages/*/src` and `apps/*/src`."
- The plugin registers `onResolve({ filter: /^@syzygy\// }, …)` (`no-egress.test.ts:51`), and its doc comment scopes it to "an
  `@syzygy/` specifier" (`:44`).
- At the head the driver bundle has 198 inputs, 73 of them outside both globs (72 `node_modules/yaml/dist/…` and the
  `test-support/` entry), with 0 refusals.
- A relative import of `packages/support/dist/…` bundles under the plugin with 0 errors (§3.2).
- This is round 2's own replacement text, applied verbatim as instructed. The lane did nothing wrong; the text was over-broad when
  written. It is the same class as round 1's F5 and round 2's F2: a guard sentence broader than its check.

**Failure scenario.** A later class 4 reader trusts that the S10 bundle cannot read a workspace dist by any route. A relative
`../../<pkg>/dist/…` import in a driver-reachable source file would then read a dist unrefused, while the body says it cannot.

**Exact fix (PR body, line 20).** Replace "and its `sourcesOnly` plugin refuses any resolution outside `packages/*/src` and
`apps/*/src`." with:

> and its `sourcesOnly` plugin refuses any `@syzygy/*` specifier that resolves outside `packages/*/src` and `apps/*/src` (a relative import, or a third-party module, is not checked).

### F2 — The new round-2 paragraph (body line 9) says round 2 was REVISE "on four PR-body sentences"; F1–F4 replaced five passages, about ten sentences (low, blocking under the brief's rule: a false count)

**Evidence.**
- [Observed] The round-2 raw's summary says "four sentence groups are false at a607bb62 (F1–F4)", and its section 4 has five
  replacement blockquotes (§3.1).
- F1 alone covers line 18 and the two bullets at lines 95–96, three sentences. F2's line 21 had four sentences. F4 covered two.

**Failure scenario.** Minor. A reader re-deriving the repair from the paragraph expects four sentence edits and finds five passages.
AGENTS rule 3 says totals are computed.

**Exact fix (PR body, line 9).** Replace "on four PR-body sentences (F1-F4)" with:

> on four findings (F1-F4) over five passages of the PR body

### N1 — A single-quoted plugin `name` trips the text check by accident (note)

[Observed] §3.5: in the app's project entry, a plugin named with single quotes fails `sync-child-process-guard.test.ts` with
`10 projects but 9 recognized single-glob includes`, and a double-quoted one passes 67/67. The body's "seen by neither" is true of
what the checks look for. The accidental refusal is not coverage and should not be cited as such. Fix: none in the body. Round 2's
optional follow-up still stands: refuse `/\bplugins\s*:/` in that check, with X9 as its mutant, in both quote forms.

### N2 — One trailing blank line was added (note)

[Observed] The served body now ends `\n\n` (diff hunk `141a144`). It does not render, and apply_r2.py does not explain it.
[Inferred] It comes from writing the body back through `gh`. Fix: none needed. A later re-hash should expect it.

### N3 — Line 107's "every specifier … any other resolution" (note, unchanged text)

[Observed] This text is unchanged since round 2, and round 2 did not flag it. It is readable as scoped to the alias map's `@syzygy/*`
specifiers. If F1 is repaired, aligning it avoids two scopes for one guard. Optional replacement for "its derived alias map still sends every
specifier to src, and `sourcesOnly` refuses any other resolution":

> its derived alias map still sends every `@syzygy/*` specifier to src, and `sourcesOnly` refuses any other resolution of one

## 5. Verdict on each of round 2's F1–F4

| Round-2 finding | Old text gone | Replacement verbatim | Replacement true at a607bb62 | Verdict |
|---|---|---|---|---|
| F1 (line 18 → body line 20; lines 95–96 → 97–98) | yes, both | yes, both | the class 4 and class 6 bullets, the `e7250716` sentence and the resolver clause are true; the `sourcesOnly` clause is false (F1 above) | **met** as specified; the specified text needs the F1 fix |
| F2 (line 21 → 23) | yes | yes | true (§3.5; N1) | **met** |
| F3 (line 16 → 18) | yes | yes | true (§3.3: 0 directives over 562 files, two methods) | **met** |
| F4 (line 76 → 78) | yes | yes | true (§3.4: parity on both trees, four refusals with nothing removed) | **met** |

## 6. Cleanup

- [Observed] I deleted the clone and `/tmp/r549c-1`…`4`. `ls -d /tmp/r549c-*` gives `No such file or directory`.
- No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched. My clone's `vitest.config.ts` was restored, by digest,
  after each X9 run.
- No kept file is over 300 KB, and none holds a copy of the PR body. `body-check.txt` quotes the one inserted paragraph.
- This raw has 0 U+00A0 and 0 U+FEFF. It was written as `raw-draft.md` and renamed last.

| `body-check.txt` | `a8eb0198faf8a358f578e32e4affbfd898eb7fc0c2ca574ddfdcaffcc966ba27` |
| `clean-build-parity.jsonl` | `f444b00243e95521abb33c0f326a621c5e2e58e839abf595843ee53e52737876` |
| `exports-census.txt` | `3f2ce47df0cd24ace8a6e0f4f2e0374b348376fcfb4821c162316fa0383e86e3` |
| `refusal-parity.jsonl` | `d88f9d762f27d91c7041d8d439f8e24503707079f0680bfd1655360437c53e13` |
| `s10-scope-probe.txt` | `274f04315425e4f1e2a5d247e127b0f82c2c4b601b29cae84c9b500b59942a15` |
| `tripleslash-sweep.txt` | `9ba12007ea58e998b6f725c116e712069431e6da8ccf748354fc4171527d55b7` |
| `x9-recheck-double-quoted.txt` | `d92ea5baa2e7f9828df90f01ebbf587199a9706e41c7d9e8dccfa6f386862a59` |
| `x9-recheck-single-quoted.txt` | `5030cd56395f1f526828ed8a9e5ec3ebc4a83ca3f277005ad4ac03945f58d9d6` |
| `tools/check_body.py` | `9c4fbf6ba2dc213003ded47cc19ecfc3b3190b5d4a9fad94c042e9cb0c75fbe5` |
| `tools/clean_build_parity.py` | `e91bc63e523b413ceb3dd6e3ade98c580b3519b9615de5480fb89af6637846f2` |
| `tools/exports_census.py` | `68e72383289a87902045cd24a1b9d97a422e5fd7b4752b54e5d879ef224bef45` |
| `tools/refusal_parity.py` | `c2924662919b5bd1ee335912b01f2544f0830ce1e9b00bde436c0640efd6ae73` |
| `tools/s10_scope_probe.mjs` | `7bff8ef8ef85472ef356608bac8a030b13ab7053070324635df1842382242174` |
| `tools/tripleslash_sweep.py` | `401a15dc379d6ff9f2479caa838c1c47a83eb39ee88c0dbf0a0dca3f40ca9733` |
| `tools/x9_recheck.py` | `eda347b27073310e09dc746577876a904f1dea33fcfdd7cfe5398974828bef69` |

`x9-recheck-single-quoted.txt` came from an earlier form of `x9_recheck.py` whose mutation was the single-quoted one. The kept tool
reproduces it with `python3 -I x9_recheck.py CHECKOUT TMPDIR single`, and gives the double-quoted run with `double`.
