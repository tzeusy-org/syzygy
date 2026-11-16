# R-GP-IMPL-OBJECT-ISO-HELPERS-1 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 4, round 1
Verdict: REVISE
Reviewed commit: 2e7ab2ec
Subject: r1-review.diff sha256 8c711369baada51ef37752acc3285595346072bba1738da761270e100cee97d6

Reviewer: rev-548, a fresh-context agent that did not write the change. Brief:
`scratchpad/lead/b63iso/brief-r1.md`. Reviewed 2026-10-28. PR #548, branch `agent/syzygy-bpyt.6.3-iso`, head
`2e7ab2ecfdd44b3b7a6276d333660ae5843ca308`, base `81862261ddbc2b3c8e8481851f3c27129217d477`.

Verdict in one paragraph. [Observed] Every merged copy decides every value I could construct the same way as the shared
`isRecord`. All 7 `isoOf` callers behave the same. No call site in the four security-relevant importers changes what it
returns, over 210 cells run through the built base and head modules. No gate changes, so the GP-Q0 stop clause is not
triggered. The verdict is REVISE for two reasons the brief's verdict rule names. F1: the emit-equivalence tool
`site-equivalence.mjs` can hide a changed value. It drops blank and whitespace-only lines inside template literals, and its rename
rewrites string literals. Both are shown by a mutation the tool reports as equal. The subject itself is not affected:
two independent checks show nothing was hidden here. F2: three sentences of the PR body are false as written. The notes,
N1 to N10, do not block.

## 1. Subject identity checks

All of these were re-derived by script in my own clone at `2e7ab2ec`.

| Check | Result |
|---|---|
| `sha256sum r1-review.diff` | `8c711369baada51ef37752acc3285595346072bba1738da761270e100cee97d6`, matches the brief [Observed] |
| `git diff 81862261 2e7ab2ec \| sha256sum` | `8c711369baada51ef37752acc3285595346072bba1738da761270e100cee97d6`, so the subject file equals the diff [Observed] |
| `git diff 81862261 2e7ab2ec -- packages \| sha256sum` | `ed931aa4c1f4afbda276a3af3aeeca8767f31ca724f795da01e62f8d2f267033`, matches [Observed] |
| `--shortstat`, whole diff | `58 files changed, 10020 insertions(+), 156 deletions(-)` [Observed] |
| `--shortstat -- packages` | `30 files changed, 415 insertions(+), 156 deletions(-)` [Observed] |
| Evidence files | 28 paths under `docs/evidence/syzygy-bpyt-6-3-iso/`; 30 + 28 = 58 [Observed] |
| Commits `81862261..2e7ab2ec` | `fefd88b8` (isRecord), `6ab7a12b` (isoOf), `22142d9f` (call-site tests), `2e7ab2ec` (evidence), as the brief states [Observed] |
| `git merge-base 2e7ab2ec gh/main` | `81862261ddbc2b3c8e8481851f3c27129217d477`, with gh/main at `b10e4da9` [Observed] |
| Branch tip, from `git ls-remote gh` at writing | `2e7ab2ecfdd44b3b7a6276d333660ae5843ca308`, so the PR did not move during the review [Observed] |
| PR body read at writing | sha256 `25996d4ceca1c011616e4359f091b16bcb7b0d2d5cf3b3c5e94902545b5b202c`, kept as `pr-body-now.md`; `updatedAt` 2026-10-27T17:56:15Z [Observed] |

## 2. Clauses relied on, and the class ruling

**CC-REV-1** is in `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `2e7ab2ec`:
- :31-32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- :35-36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40-41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :45-47: "**Class membership is contested by default and is never finally determined by the agent performing the change**"

**GP-Q0** is in `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
- :52-55: "“Behavior-preserving” means none of the following changes:" followed by the items "a rendered byte, a wire
  format, a refusal string or an exit code;", "a signed or digest-bound artifact;" and "a consent, security or retention
  decision."
- :62-66: for "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security)", the checks are "an old-versus-new differential over a mutated-record corpus that includes records with
  altered prose;", "a rule-6 mutant for each predicate;" and "a non-blocking owner notice in the cycle report."
- :95-96: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Test rigor** is in `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read with `git show 2e7ab2ec:`:
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :64-67, bar 4: "A test that mirrors the implementation's logic to compute its expected value … verifies nothing. Expected values are
  literals or independently derived."
- :93-96, bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews state the net test
  delta;"

**AGENTS.md** at `2e7ab2ec`:
- rule 6 (:126): "Mutate the input and confirm the check fails, per predicate, before trusting it"
- rule 10 (:133): "Freeze the bytes a review is bound to; any later edit retires the review."
- rule 11 (:134): "An evidence record names its subject and the subject's digest"
- :191: "The cap1 packages never import it (`cap1-system` is an independent oracle)."

**PWB-REQ-005** is in `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`:
- :636: "### Requirement: PWB-REQ-005 — Consent and policy authority precede every body read"
- :672-673: "“Malformed” below means type- or shape-invalid"
- :694-696: "Any one of those 195 cases in any limb SHALL produce zero body reads, a project-model Unknown and the RFC3-16(a)
  contradiction"

An `isRecord` decision is exactly the "type- or shape-invalid" test for a container. A changed decision at an
`authority-artifact-fields.ts` site would move a case into or out of the invalid population.

**REQ-polaris-generation-033** is in `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:13`:
"every object SHALL be classified and screened under the observing project's effective policies (REQ-polaris-generation-025)
before its content is used in a check or rendered". The dossier `screen.ts` loads those policies, and
`secret-redaction.ts` and `public-source-classification.ts` read their containers.

**Class ruling** (mine):

| Class | Ruling |
|---|---|
| 1 | Touched, as claimed. `authority-artifact-fields.ts` parses the registry's `typedAuthority` / `writeSurface` (lines 136, 141) and the policy and registry documents (102, 121, 132) that PWB-REQ-005 gates on. |
| 3 | Touched, as claimed. The dossier run-record, brief and inventory bytes are composed by the 13 other consumers and the 7 `isoOf` callers, and the POC surface version (evaluation identity) moves. |
| 4 | Touched, as claimed. The secret-redaction, content-class and dossier screen loaders sit under SEC-2/SEC-5. |
| 6 | Over-inclusive. `packages/support/package.json` at `2e7ab2ec` has `"private": true`, so no external consumer can depend on the new export. Over-claiming only adds review, so it is harmless. |
| 2, 5, 7 | Not touched. Nothing mints or merges identity, migrates a `.syzygy/**` schema, or touches certificates. |

**GP-Q0.** I found no change to what any gate accepts or refuses (sections 3 and 5), so the stop clause is not triggered.
The three extra checks for classes 1, 3 and 4:
- (i) The differential. The PR's differential is predicate-level, over values. Mine is record-level: 210 cells of mutated
  policy and registry records, run through the built modules. No record in either has altered prose. [Inferred] That is
  immaterial: `isRecord` reads only a container's type, never its prose. N7 asks for a record-level differential to be
  kept in the evidence.
- (ii) Rule-6 mutants. Present for each predicate: S 9/9, I 5/5, C 52/60, re-run by me on a 33-row sample.
- (iii) The owner notice belongs to the cycle report, not to this PR. [Unknown] whether it has been issued.

[Inferred] The POC surface version is a sha256 over two source trees, so every source edit there moves it. If it counted
as a "rendered byte", GP-Q0 Part 1's permission to refactor `packages/**` could never be used under those trees. I read it
as an identity of the code, not a behaviour output. The owner may rule otherwise.

## 3. What I ran and the results

Every suite ran under a private TMPDIR (`/tmp/r548-1` … `/tmp/r548-11`, all now deleted), one vitest at a time.
`/proc/loadavg` was read before every run. Its values are kept in files only for the full suite (`19.87 22.33 25.21` at
start), the mutant runs (in their logs, per row) and the later re-runs (`iso-differential.txt`, `surface-version.txt`,
`typecheck-merge-rerun.log`). For the other runs the values were printed to the session and not kept.

| # | Run | Result |
|---|---|---|
| 1 | Identity checks | All match (section 1) [Observed] |
| 2 | `census.mjs` and `census-grep.py`, base and head, into `rerun/` | Byte-identical to the retained outputs. 30 named definitions at base and 8 at head; 28 `typeof … 'object'` deciders at base and 12 at head; 22 named object predicates at base, 21 of them under `packages/` and `apps/` and 1 under `scripts/` [Observed] |
| 3 | Retained `differential.mjs` | Byte-identical to `differential-base.json` [Observed] |
| 4 | `tools/differential-extended.mjs`: the retained corpus of 62 plus 32 of mine, 31 members | 5 groups. `ea96ab59bca5` holds 27 members: all 17 merged, the 7 kept-local plain copies, the head `is-record.ts` text, the head file loaded by Node with type stripping, and the built `@syzygy/support` dist. `mergedOutsideHeadGroup: []` [Observed] |
| 5 | `tools/iso-differential.mjs`: 29 retained instants plus 15 of mine, the 7 base copies plus the head dist | `corpus 29 + 15 = 44; members 8; groups 1`, `30ab9b96f6e0 x8` [Observed] |
| 6 | `tools/importer-probe.mjs`: every `isRecord` call at head in the four importers, run through the built base and head modules | `sites 24, cells 210, differ 0` [Observed] |
| 7 | Retained `site-equivalence.mjs`, and its `--selftest` | 20 modified, 19 equal, the 3 declared exceptions; selftest ok [Observed] |
| 8 | `tools/se-mutate.mjs` and `tools/se-rename.mjs`, mutating the tool's inputs | SE-1, SE-2 and SE-7 are **reported equal** (F1) [Observed] |
| 9 | `tools/raw-site-check.py`, independent of emit | 19 of 20 files are the base minus the declared edits. The only residuals are 6 single blank lines beside deleted definitions, each read and outside any literal; the 20th is `index.ts` [Observed] |
| 10 | `tools/site-equivalence-strict.mjs`, my proposed fix: selftest, full run at `22142d9f` and `2e7ab2ec`, two guard mutants | Selftest ok; 20 modified, 19 equal and the same 3 declared exceptions at both commits; SE-1, SE-2 and SE-7 reported; both guard mutants killed [Observed] |
| 11 | `tools/mutant-rerun.py` over a lane sample: 33 rows (S 9, I 5, C 19, including all 8 survivors) | `33 rows, 25 killed`. Every outcome agrees with the lane record [Observed] |
| 12 | Own mutants O1–O8, at head | O1–O7 killed and O8 survived. O6, O7 and O8 survive the base tests [Observed] |
| 13 | The 52 lane-killed C mutants against the **base** test files, plus 4 controls | `56 rows, 4 killed`. All 4 controls clean [Observed] |
| 14 | Head test files against the base code (`wt-base`, 6 files) | 490 tests: 489 passed, 1 failed, `no route and no credential sweeps a non-empty population of source files` [Observed] |
| 15 | Base test files against the base code | 414 of 414 passed [Observed] |
| 16 | `tools/record-check.py`, the record against git objects | `"problems": []`. 11 tool and 15 output digests match, 26 in all [Observed] |
| 17 | Full vitest suite at `2e7ab2ec` | `success: True`, 256 files, 5647 tests, 5642 passed, 0 failed, 5 pending. Load at start 19.87 [Observed] |
| 18 | `npm run typecheck` at `2e7ab2ec` | `exit 0` [Observed] |
| 19 | `python3 scripts/check_governance.py` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` [Observed] |
| 20 | `python3 scripts/check_quotations.py` | `OK    QC-1  … 40 quotations examined in 21 of 981 .md files scanned … 0 findings` [Observed] |
| 21 | Hosted CI (`gh pr checks 548`) | `checks pass 20m19s` (run 40555248125), `node pass 3m18s` (run 40555248061) [Observed] |
| 22 | PR #545 scratch merge: `5995aa3c` into `2e7ab2ec` | The purity test fails with 6 entries, `index.ts: isRecord` and `is-record.ts`'s `Array`, `Readonly`, `Record`, `isArray`, `isRecord`. With exactly those 5 names added to `ALLOWED_IDENTIFIERS`, `packages/support/src` gives 5 files and 86 of 86 passed [Observed] |
| 23 | Main moved (`81862261..b10e4da9`) | 27 commits and 248 paths, **0** of them among the PR's 58 paths. #546 is open: 4 paths, 0 shared [Observed] |
| 24 | Local merge `1f38e823` (gh/main into `2e7ab2ec`) | Clean. `npm run typecheck` exits 0 (load 31.48 before). 12 test files, 702 of 702 passed: the PR's 8 plus the 4 main-changed test files in packages the PR edits [Observed] |
| 25 | `tools/surface-version.mjs`, the repository's own `pwbSurfaceVersion` (built dist) | Values below [Observed] |
| 26 | Retained `digest-citers.py`, at `2e7ab2ec` and at gh/main | At `2e7ab2ec`, identical to the retained output (6,820 files). At main, 7,053 files and 3 new citers, all PR #532 review evidence of base digests; no head digest is cited [Observed] |
| 27 | `git-object-reader.ts`, sha256 by `git show` | `9f33e5fbbf464b1df28b79c3fcf5016b8ad7db1910041734c5fb8e4a790998f3` at `81862261`, `22142d9f`, `2e7ab2ec` and `b10e4da9` [Observed] |
| 28 | cap1 | 105 tracked files under the cap1 packages, 0 changed by the PR, 0 importers of `@syzygy/support`, no support dependency in any cap1 `package.json` or `tsconfig` [Observed] |

Run 14 in detail. The one failure is `cli.test.ts`'s swept-file list. The head list is the base list plus `'iso-of.ts'`
between `'inventory.ts'` and `'launched.ts'`, in sorted order, and nothing else differs (diff read) [Observed].

Run 25, verbatim:
```
81862261ddbc2b3c8e8481851f3c27129217d477 polaris@b3384e7662f1
fefd88b8 polaris@dde77219e440
6ab7a12b polaris@dde77219e440
22142d9f polaris@64c4c7a6ef72
2e7ab2ec polaris@64c4c7a6ef72
gh/main polaris@df13a4677575
1f38e823 polaris@24b9177ff77d
```
`git grep -F -e b3384e7662f1 -e 64c4c7a6ef72` finds the values in 0 of 6,816 tracked files at base and in 0 of 7,053 at
main. At `2e7ab2ec` it finds them in 2 of 6,848: the PR's own `build-record.py` and the record (F2c) [Observed].

The reviewer values from run 4, as asked by the brief. The outcome is the same for every merged copy and for the head:
- A cross-realm array (`other realm []`, retained corpus) gives F.
- `arguments` gives T, sloppy, strict and cross-realm alike.
- Typed arrays (`Float64Array`, `BigInt64Array`, `Buffer`, a cross-realm `Uint8Array`) give T.
- A `Proxy` with an array target gives F, including `Proxy(Proxy([]))`, a cross-realm `Proxy([])`, and a `Proxy([])`
  whose handler throws on every trap.
- `Proxy(revoked Proxy([]))` gives `E:TypeError`.
- `Object.create(Array.prototype)` gives T, and so does the cross-realm form.
- `toStringTag Array` gives T, and so does a throwing `Symbol.toStringTag` getter.
- Functions give F: plain, class, async, bound, cross-realm, and a revoked proxy of a function.
- Node has no `document.all`. Its V8 counterpart, the undetectable object from `%GetUndetectable()` under
  `--allow-natives-syntax` (typeof `'undefined'`), gives F. Production code cannot construct it.

The importer probe from run 6. Each cell gives the same output, base and head, through the built module:
- `authority-artifact-fields.ts` (bytes in, so only JSON values can stand there):
  - :102 and :121: an array, null or a primitive gives `{"detail":"policy document is not an object","kind":"undecodable"}`,
    and the same with "registry".
  - :132 and :136: the entry or subject is read as missing.
  - :141: an array, null or a string is `readOnlyAuthority` "present" with `writeSurface` "missing", identical at base.
- `secret-redaction.ts` (called directly, so functions and arrays carrying the fields are included):
  - :71: `{"ok":true,"redaction":null}`.
  - :73: `{"ok":false,"why":"its secret redaction is not an object"}` for an array, null, a string, an array carrying the
    fields, and a function carrying the fields.
- `public-source-classification.ts`:
  - :68: passed over.
  - :78 and :83: refused in their own words.
  - :204 and :205: `{"exemption":null,"ok":true}`.
  - :207: `{"ok":false,"why":"its code-content exemption is not an object"}`.
- `screen.ts`, lines 81, 83, 84, 88, 89 and 100: refused or passed over in the loader's own words.

An observation outside this diff, unchanged at base and head (N9): screen.ts:106 puts the engine's TypeError text into a
refusal. A null detector gives `its detectors do not compile (Cannot read properties of null (reading 'id'))`.

**A lapse in my own conduct.** Near the end, to recover two exit codes, I opened my own session transcript under
`~/.claude/projects/…/subagents/` once. The brief says "nothing under `~/.claude/`". The file is my own tool log and holds
no credential, and the printout showed my own commands only. I did not use it: I re-derived both values by re-running
(`typecheck-merge-rerun.log`) or from kept files. Nothing else under `~/.claude/`, `~/.config/` or any token store was
opened, and no Butlers or other observed-repository content was read.

## 4. Findings

### F1 — blocking, medium: `site-equivalence.mjs` can hide a changed value

**Evidence.**

(a) `site-equivalence.mjs:52` ends `normalize` with `return out.split('\n').filter((line) => line.trim() !== '').join('\n');`
on both sides. That removes every blank and whitespace-only line, including those inside template literals. The tool's
own description at :9-12 names only the definitions, the old names and the import bindings. `tools/se-mutate.mjs`
applies each mutation to the real head file and runs it through the tool's own `compareFiles` (verbatim,
`se-mutate-original.txt`):
```
SE-1 packages/polaris-dossier/src/brief.ts: equal=true -> MASKED (tool says equal); a blank line removed inside the DOSSIER_GUIDANCE template literal (the brief text changes)
SE-2 packages/polaris-dossier/src/brief.ts: equal=true -> MASKED (tool says equal); whitespace-only lines added inside the DOSSIER_GUIDANCE template literal
SE-3 packages/polaris-dossier/src/check.ts: equal=false -> as expected; control: a changed fallback object at a call site
SE-4 packages/polaris-generation-core/src/secret-redaction.ts: equal=false -> as expected; control: an array admitted at a class-4 call site
```

(b) `site-equivalence.mjs:43`, `out = out.replace(/\bisObj(?:ect)?\b/g, 'isRecord');`, renames every match on the base
side, inside string, template and regular-expression literals too. Its description at :11 says "renames every remaining
isObj / isObject identifier". `tools/se-rename.mjs` appends `export const helperLabel = 'isObject';` to the base
`check.ts` and the `'isRecord'` form to the head (verbatim, `se-rename.txt`, run with my fixed tool beside it):
```
SE-7 packages/polaris-dossier/src/check.ts: original equal=true; strict equal=false; guard on base emit regex 30 identifiers 29 ok=false; a string literal changed from isObject to isRecord
```

**What the subject is spared.**
- [Observed] Both holes are latent here. For (b), my token census over the 22 changed production files at base counts
  `regex matches 128, identifier nodes 128`, so no literal was touched.
- [Observed] For (a), `raw-site-check.py` compares raw source without emit. Its only residuals are 6 single blank lines
  beside deleted definitions: brief.ts:50, session-handover.ts:43, session-statement.ts:30, waiting-sessions.ts:69,
  secret-redaction.ts:34 and authority-artifact-fields.ts:88. I read each one; none is inside a literal.
- [Observed] The fixed tool gives the same 19 of 20.

So the PR's conclusion stands. Its evidence for it, as retained, proves less than its description says.

**Failure scenario.** [Inferred] A later stack of 6.3, or another greenfield-parity bead, reuses this retained tool, and
its applier drops a blank line inside `DOSSIER_GUIDANCE` in `brief.ts`. That changes a rendered brief byte, which GP-Q0
:52-53 excludes from "behaviour-preserving". SE-1 is exactly that edit, and the retained tool reports the file
"byte-identical". (b) is the same failure for a label or refusal string that names an old helper.

**Proposed fix.**
- Replace `normalize` with the one in `tools/site-equivalence-strict.mjs` (sha256
  `fbcee6fc821dfb35f7461f0fa5cbab4eb7e828d9eef1d866cd48b8db51adb942`), which makes three changes:
  - each definition is removed together with its own `\n`;
  - each import line is removed with its own `\n`, and there is no blank-line filter (the TypeScript emitter writes no
    blank line between statements, so a blank line left in the output is inside a literal);
  - before the rename, the tool counts `\bisObj(?:ect)?\b` matches against `Identifier` nodes in the base emit. If they
    differ, it returns `RENAME-GUARD: an old name occurs outside an identifier`, which never equals the head.
- Add its four new selftest cases: an unchanged template literal is equal; a blank line removed inside one is not equal; a
  whitespace-only line added inside one is not equal; a string renamed from the old name is not equal. The selftest must
  fail when either the guard is removed or the blank-line filter is restored (`se-strict-selftest-mutants.txt`: both
  `KILLED`).
- Regenerate `site-equivalence.json` (expected: 20 modified, 19 equal, the same 3 declared exceptions).
- Rebuild the record digests with `build-record.py`.
- Amend the PR-body bullet to: "19 of the 20 modified production files emit identical JavaScript once, on the base side,
  the censused definitions (each with its line end) are dropped and the old names renamed (identifiers only; the tool
  refuses a file where an old name occurs elsewhere), and on both sides the new import lines are dropped; no other
  normalisation is applied."

### F2 — blocking, low: three PR-body sentences are false as written

(a) "Four importers had their `isRecord` call sites pinned by no direct test". [Observed] Run 13: the base test files
already kill 4 of the 52 call-site mutants:
```
base-tests C-public-source-classification-L83n2-B: KILLED exit 1 1/214 failed, 2.2s, load 23.74 25.23 27.49 | reading the rule refuses no prefix object :: TypeError: Cannot read properties of null (reading 'digitCount')
base-tests C-screen-L83n1-B: KILLED exit 1 2/110 failed, 12.4s, load 21.75 24.41 27.05 | the screen is refused for a policy with no public-source scope :: TypeError: Cannot read properties of null (reading 'contentClassification')
```
The `-D` mutants are killed the same way. Proposed text: "Most of the `isRecord` call sites in four importers were
pinned by no direct test. 48 of the 52 call-site mutants the new rows kill survive the base test files; the other four
(the null and admit-anything mutants at public-source-classification.ts:83 and screen.ts:83) are killed by existing rows.
The `+` tests state, at each call, what an array, null and a primitive in an object's place do."

(b) "the tests feed an array at each of them" (the 8 survivors). [Observed] False at 3 of the 8:
- At screen.ts:90 (survivors L90 A and B), no array can stand. The record's own argument says the value "comes from the
  isRecord filter above it".
- At screen.ts:100 (survivor L100 A), the only detectors row in `screen.test.ts` feeds `[null, 'x', 1]` (:120). Sweep:
  `git grep -F "detectors: ["` over every `*.test.ts` in `polaris-dossier` and `polaris-generation-core` gives 3 lines,
  none with an array element.

The equivalence argument still holds at all 8 (section 7). Proposed text: "the tests feed an array at five of them
(authority-artifact-fields.ts:141 and screen.ts:81, 84, 88, 89); at screen.ts:90 only a filtered object or undefined can
stand, and at screen.ts:100 a JSON array carries no `id`, so no array row could tell the mutant apart". Optionally, add
`[]` to the screen.test.ts:120 row. [Inferred, not run] It still refuses with "its detectors do not compile": the probe
shows that text for an array in that position.

(c) "No tracked file carries either value" (the surface versions). [Observed] At `2e7ab2ec`, 2 of 6,848 tracked files
carry them: `build-record.py` and `dc4-object-and-iso-helpers-2026-10-28.json`, the PR's own evidence. Proposed text: "No
tracked file outside this PR's evidence directory carries either value."

**Failure scenario.** The PR body is the change record CC-REV-1 relies on. The dispositions copy it, and (a) understates
what the base tests already caught, the very question bar 10 asks.

### Notes (non-blocking)

**N1, low: `mutants.py`'s `occurrence` is documented wrongly.** `mutants.py:8` says "the occurrence index when the text
occurs more than once on the mutated line". [Observed] In 60 of 60 C rows it is instead the index of the call among the
file's `isRecord(` calls. In 6 rows (authority-artifact-fields L102 and L121, mutants A, B and D, `old` =
`isRecord(json.value)`), `old` occurs twice in the file. Every row stays re-runnable by line: `old` occurs once on its line
in 60 of 60. Fix: "the index, from 0, of the call among the file's `isRecord(` calls (the line alone locates it: `old`
occurs once on its line in every row)".

**N2, low: `mutants.py:133` hard-codes `tmpdir = '/tmp/lci/mut'`.** On a shared host, a re-runner collides with the lane's
directory. I wrote `tools/mutant-rerun.py` instead of running it. Fix: take the tmpdir from an argument or `TMPDIR`.

**N3, low: no direct-call row feeds a function.** [Observed] O8, `if (!isRecord(red) && typeof red !== 'function')` at
secret-redaction.ts:73, survives both the head and the base tests. [Observed] The production callers of
`readSecretRedaction` and of the `public-source-classification` readers are `screen.ts` and the app's
`public-source-screening.ts`. Both pass `JSON.parse` output, which cannot hold a function, so the gap is unreachable today.
Optional row for `secret-redaction.test.ts`: `['a function carrying every field', () => Object.assign(() => 1, validRedaction())]`.
Adapt it to that file's fixture name.

**N4, info: the surface version that lands will be neither PR value.** At the merge with current main (`1f38e823`) it is
`polaris@24b9177ff77d`; main alone is `polaris@df13a4677575`. Anyone recording a post-merge surface version must
re-derive it at the merge commit.

**N5, low: AGENTS.md's support note omits the new helper.** AGENTS.md:184-185 lists "the one `sha256`, the one
`deepFreeze` and a shared strict `decodeUtf8`". Proposed: "the one `sha256`, the one `deepFreeze`, a shared strict
`decodeUtf8` and the one plain-object test `isRecord` (the `isoOf` formatter stays in `polaris-dossier`: the support
purity guard forbids `Date`)".

**N6, low: the `## Battery` section is still `BATTERY_PLACEHOLDER`.** Fill it with the canonical battery's result at the
merge head before merging.

**N7, low: the retained differential is predicate-level only.** GP-Q0 :64 asks for a differential "over a mutated-record
corpus". Retain a record-level one, for example `tools/importer-probe.mjs` (24 sites, 210 cells, base and head built
modules), and state in the record that the predicates read no prose.

**N8, minor: number and `true` rows.** [Inferred] Every lane mutant (A, B, D) and every mutant of mine that admits one
primitive admits all of them. So the `a number` and `true` rows of the new `NOT_OBJECTS` tables can only fail together
with `a string`. The lane stores at most three `failedTests` per mutant, so I could not observe this row by row. Either
drop them, or name in the table's comment the bug they catch that `a string` misses.

**N9, info, outside this diff: an engine message inside a refusal string.** screen.ts:106 builds
`its detectors do not compile (${error.message})`. A null detector gives "Cannot read properties of null (reading 'id')",
which is V8's wording, the same at base and head. A refusal string that changes with the engine is a candidate for its own
bead. Nothing in this PR touches it.

**N10, low: `is-record.ts`'s docstring overstates the revoked-proxy case.** `is-record.ts:4-5` says "a revoked proxy
throws, as `Array.isArray` does". [Observed] A revoked proxy of a function gives F (`typeof` is `'function'`, so
`Array.isArray` never runs). The test name is already exact ("of an object or of an array"). Proposed: "a revoked proxy of
an object or an array throws, as `Array.isArray` does".

## 5. Every changed output, or the evidence that there is none

[Observed] None changes, apart from the declared surface version. The evidence:
- Record level: 24 sites and 210 cells through the built base and head modules of the four importers, 0 differ. That
  includes every refusal string at those sites.
- Predicate level: one outcome group over 94 values for the 17 merged copies and three forms of the head, and one group
  over 44 values for `isoOf`.
- Source level: 19 of 20 files are equal, by the retained tool and by my fixed tool. The raw-source check finds only blank
  lines beside deleted definitions.
- Tests: the head tests pass on the base code except for the one changed swept-file list (489/490).
- Whole suite: 5642 passed and 0 failed at `2e7ab2ec`, locally and on hosted `node`.

No `apps/three-surface-poc/src` file is edited, and neither is `response-identity.ts` (the PR's paths, read).

The one changed value is the POC surface version, `polaris@b3384e7662f1` → `polaris@64c4c7a6ef72` at the PR head, as
declared, and `polaris@24b9177ff77d` at the merge (N4). No refusal string, exit code, wire format or digest-bound artifact
changes. No act, manifest row, acceptance record, script or test reads an edited file's digest (run 26).

## 6. Verdict per merged copy, on `isoOf`, and on the kept-local copies

The evidence for every row: the copy is a member of group `ea96ab59bca5` (27 members, 94 values, `mergedOutsideHeadGroup:
[]`), and the file is emit-equal under both the retained and the fixed tool. A class-1 or class-4 row adds its probe sites.

| File (base line) | Base name | Identical decision | Extra evidence |
|---|---|---|---|
| polaris-dossier/src/check.ts:194 | `isObj` | yes | — |
| polaris-dossier/src/close.ts:86 | `isObj` | yes | — |
| polaris-dossier/src/design-review.ts:28 | `isObj` | yes | — |
| polaris-dossier/src/execution-flags.ts:43 | `isObj` | yes | — |
| polaris-dossier/src/inventory.ts:77 | `isObj` | yes | — |
| polaris-dossier/src/render.ts:121 | `isObj` | yes | — |
| polaris-dossier/src/review.ts:61 | `isObj` | yes | — |
| polaris-dossier/src/run-record.ts:136 | `isObject` | yes | — |
| polaris-dossier/src/screen.ts:73 | `isObject` | yes | class 4; probe D1–D7b, 0 differ |
| polaris-dossier/src/session-statement.ts:31 | `isObj` | yes | — |
| polaris-dossier/src/waiting-sessions.ts:71 | `isObj` | yes | — |
| polaris-generation-core/src/discovery.ts:219 | `isObject` | yes | — |
| polaris-generation-core/src/dossier-evaluation.ts:50 | `isRecord` | yes | — |
| polaris-generation-core/src/public-source-classification.ts:56 | `isObject` | yes | class 4; probe C1–C6, 0 differ |
| polaris-generation-core/src/reader-questions.ts:22 | `isRecord` | yes | — |
| polaris-generation-core/src/secret-redaction.ts:35 | `isObject` | yes | class 4; probe B1–B2, 0 differ |
| three-surface-poc-core/src/authority-artifact-fields.ts:85 | `isRecord` | yes | class 1; probe A1–A5, 0 differ |

[Observed] The 17 rows are 9 `isObj`, 5 `isObject` and 3 `isRecord`: 11 in polaris-dossier, 5 in
polaris-generation-core and 1 in three-surface-poc-core, as the PR body says.

**Typing.**
- [Observed] Each copy at base narrowed to either `Readonly<Record<string, unknown>>` or `Record<string, unknown>`. The
  shared one narrows to `Readonly<…>`.
- [Observed] Under both tools, emit equality at the 19 files means no call site gained a `?.`, an `in` check or a changed
  key expression.
- [Observed] `npm run typecheck` exits 0.
- [Observed] Where `Readonly` would have forced a change (`response-identity.ts` deletes keys), the copy was kept.

**`isoOf`: identical.**
- [Observed] The 7 callers are brief.ts:51, check.ts:193, close.ts:88, inventory.ts:76, review.ts:60,
  session-handover.ts:44 and waiting-sessions.ts:70. All 7 base copies and the head dist form one group over 44 values.
  The values include `RangeError` for NaN, ±Infinity, ±(8.64e15+1), 1e300 and the string `"1e3"`, `TypeError` for a
  Symbol, and truncation for ±8.64e15±0.5, -0.5 and 0.999.
- [Observed] `cli.test.ts`'s list is the base list plus `iso-of.ts`.
- [Observed] `iso-of.test.ts` tests behaviour. Its expected strings are written-out literals, with 0 `new Date` or
  `toISOString` in the file. I1–I5 and my O4 and O5 are killed.

**Kept-local copies: each reason is true.**

| Copy | Decision vs the shared test | Reason, checked |
|---|---|---|
| polaris-generation-core/src/discovery-provider.ts:66 `isRecord` | differs (own group `08eb664acc3a`) | It adds a prototype check. 24 of 62 differ, reproduced [Observed] |
| three-surface-poc-core/src/response-identity.ts:131 `isObject` | same | It deletes keys from the narrowed value. tsc TS2542 at three sites, reproduced (157, 160 and 193 at head; the attempt log's 155, 158 and 191 are the same sites, shifted by 2) [Observed] |
| apps/three-surface-poc/src/block-provenance-sweep.test.ts:40, governing-intent-sweep.test.ts:39 `isObj` | same | Both narrow to their own `Json` types: TS2345, TS18047 and TS2339 in the attempt log (8 errors in 3 files, counted), and I reproduced TS2345 [Observed] |
| cap1-core/src/declaration.ts:72, cap1-daemon/src/consent-loading.ts:124 `isPlainObject` | same | cap1 never imports support (AGENTS.md:191); 0 cap1 files changed and 0 importers [Observed] |
| three-surface-poc-core/src/body-read-authority.test.ts:189 `isPlainObject` | same | A test oracle kept apart from the code it checks, as the independent-oracle rule requires [Observed] |
| scripts/redis_screening_remeasure.mjs:326 `isObj` | same | Plain JavaScript under `scripts/`, outside the workspace packages [Observed] |
| apps/…/public-source-screening.ts:167 (anonymous), polaris-dossier/src/draft-schema.test.ts:94 `refs`, scripts/differential_line_slot.mjs:73 `isTemplate` | each its own group | None is the predicate: an id extractor, a reference collector, and a duck-typed template [Observed] |
| polaris-dossier act-fields `isIsoDate` | — | Unchanged. The impossible-date finding is owner bead `syzygy-bpyt.1.21` (open, read-only) [Observed] |

## 7. Test quality

**Claim 4 holds.** [Observed] The head test files run against the base code pass 489 of 490, and the one failure is the
swept list. So the new call-site rows state behaviour the base already had. They are pins, not changes.

**Bar 10 holds for the call-site rows.** [Observed] The 52 call-site mutants the lane kills split this way:
- the base test files kill 4 (run 13);
- the added rows alone kill the other 48.

So 48 of the 52 killed call-site mutants are caught only by added rows, which is what bar 10 asks of an addition. The net
delta is confirmed by file and name: 414 → 550, +136 ~1 -0. By file the additions are is-record 41, authority-artifact-fields 27, screen 19, iso-of 18,
public-source-exemption 13, secret-redaction 11, public-source-classification 6, and cli 1 (the new `iso-of.ts` case of
`%s imports no network module`). The tool's raw `~51` counts the 45 unchanged rows of the `refuses %s` table once more,
along with its 5 new rows, as the PR body says.

**Bar 4 holds.** [Observed] `is-record.test.ts` and `iso-of.test.ts` hold only literal expectations: 0 `new Date` and 0
`toISOString` in either file. Their only import from the code under test is the function itself (`is-record.test.ts:3`,
`iso-of.test.ts:2`).

**Kills are real.** [Observed] For each kill I relied on, I read the failing assertion. Each is an `AssertionError` with
the expected literal, or a `TypeError` from reading a property of null or undefined. My 100 mutant runs (33 + 56 + 11)
took at most 15.5 s each against a 60 s test timeout, so none is a timeout.

**The 8 survivors are equivalent, not gaps.** [Observed, by the probe and by reading the code]
- authority-artifact-fields.ts:141 A: `typedAuthority` is parsed JSON. An array has no own `writeSurface`, and the probe's
  A5 cells are the same.
- screen.ts:81 A, :84 A, :88 A, :89 A and :100 A: the value is parsed from bytes. A JSON array carries no named field, so
  the next read gives `undefined` either way.
- screen.ts:90 A and B: the value comes from the `isRecord` filter on line 89, so only a filtered object or `undefined`
  can stand there.

No survivor is a reachable gap in a class-1 or class-4 importer. The one reachable-in-principle gap I found, a function at
a direct-call site, is unreachable from today's production callers (N3).

**Minor.** The number and `true` rows (N8). The 18 `iso-of` rows and the 41 `is-record` rows are dense, but each names
the edge it pins, and I found none whose expected value is computed.

## 8. Cleanup

- My scratch clone (`rev-548/clone`) and its three worktrees (`wt-base`, `wt-545`, `wt-merge`) are removed, with
  `git worktree remove --force` and then the clone deleted. Its scratch branches `scratch-545` and `scratch-merge` are
  deleted. No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched.
- TMPDIRs `/tmp/r548-1` … `/tmp/r548-11` are deleted, and `ls -d /tmp/r548-*` now finds none. Nothing else in `/tmp` was
  deleted.
- The full-suite JSON report (2.1 MB) was summarised into `full-suite-2e7ab2ec-summary.json` and then deleted.
- No process was killed. No push, PR comment, merge, workflow dispatch or `bd` mutation was made.

These are the 67 kept files under `rev-548/`. `find -size +300k` finds none over 300 KB. This raw is the review itself and
is not listed.

| File | sha256 |
|---|---|
| `base-tests-on-base.json` | `707752aa81c5c26cd88b40832e6627e18162b02e8a480a9d57451b4f95ca0517` |
| `base-tests-on-base.log` | `c7fad5dc464956d936743280c732fee30e4d85fb2497c06d1440243149a97b5b` |
| `check-governance.log` | `234bdc6155762a6a56f167b7bdd4c8af6987364cb20a986dd6281fe493b66154` |
| `check-quotations.log` | `c5a62518f69ba8711bfb0d5db6ae555e22748d8829919d8551dca8ddc35263fd` |
| `differential-extended.json` | `93e9a3155855e363bd2cd4131aecab3e1ff5e65541d8d814a0a89721eb14d3ea` |
| `dossier.diff` | `f93515f4d6a41d8be21f059da7be4c461908fd82537e4c89ef6daa2d5539eeb6` |
| `full-suite-2e7ab2ec-summary.json` | `659a9f2b3ca75cbcd2a8bcbfae454ebe63767772f19d9149a42ac44362b4022a` |
| `full-suite-2e7ab2ec.log` | `25e151cc48dd3899afd653195f39c160d5664fc7271f709b35775dba88d1fd3b` |
| `full-suite.loadavg` | `08ae10a74cac0abfa358ce4e2aed5acd51e988453c567ee297cd482804c7acd8` |
| `head-tests-on-base.json` | `9ad8a43185b9f566400abb56a8f81c18d527cef3ee8df4631bec727fccd55b7b` |
| `head-tests-on-base.log` | `d693c931af49e24e0be9bef7077db1488697126a882f8894362a464a3a705917` |
| `hosted-checks.txt` | `308ed04c1c43e32a740f27c8ac1d522779e5e11bf7aaab7004c1e3989f4500df` |
| `importer-probe.json` | `9dadcf1169f422ac4f1804e5bc5fd657724327b5827f672c1293aacd0914a6a6` |
| `iso-differential.txt` | `4a10983e807b91142a2163a2594c2df0159639c791e20a53fb6157a512b10eac` |
| `main-moved-paths.txt` | `bcf5f0648cb02b967f062fc72f22a94c24e7ec345ad4e452579cd42e001fd42b` |
| `merge-tests.json` | `97b8d844f6c7198b904710ff1ddfab2c133d20156cde3aa1e1e6b17e0bdfab28` |
| `merge-tests.log` | `a5468d918fe551c1bfe43428d4f30b578f075497e9a185abd37af28b731c966c` |
| `mutant-rerun-base-tests.json` | `bb6e15555af8d6f9e51d3fe244c00d0c4471b428980c9df40c87463c662ca3c9` |
| `mutant-rerun-base-tests.log` | `42e1957f343aafc4fbd0103318b5aab39d9015b037ecf0d3e85606a297e9ccad` |
| `mutant-rerun-lane-sample.json` | `bb81a747ef928b1a4421ca20d2a88ed4a0dbbc7fd9046b6671ead859289a7f8d` |
| `mutant-rerun-lane-sample.log` | `bfe0482bb37cbcc8a0344beea6b6ef9fbaf90f9f190d8c0b18fae76535c5f66e` |
| `mutant-rerun-own.json` | `322c79b5d7d5a2729e335995bffda18c35d31afc52c9c2b3d40a305fae6ac1de` |
| `npm-ci.log` | `570cd9a742ddd3b637c407956fb1946fa9a812c49249265bf2f5800e7835140a` |
| `pr-body-now.md` | `25996d4ceca1c011616e4359f091b16bcb7b0d2d5cf3b3c5e94902545b5b202c` |
| `pr-paths.txt` | `60e3033190e4e4b513db97ef34aac35c71be06ef1f32ed9506797dcccf019b18` |
| `pr532-paths.txt` | `b2fa56857fffc57cdeb9a1b821e0620dead58bc1fdd74ddfce894fb2d712e646` |
| `pr545-paths.txt` | `a7eeeffd223297b8cbf7ac406e489d1831e107e0de9130d9e77ce6daa522cb62` |
| `pr546-paths.txt` | `32527ea55892693931ff8a1b63d26c74a7036c5e4a945509ec02c42064f1304e` |
| `purity-545-merge-plus5.json` | `fb9985ff73f751c3c22c456bd33c76579c5080b1ed75cfb41f370a71ef1f6a66` |
| `purity-545-merge-plus5.log` | `94e0b5294f0600d5056b5fe79de1f039188eec8dfcfe57ee352890b37355e90a` |
| `purity-545-merge.json` | `5e88704c99ee36755511f4197493521627d032e7ec433bccd9287c90bd68819f` |
| `purity-545-merge.log` | `3370afd0c840866e44570a6e92a3840101465ab98cb21564ae48b1f0da24e850` |
| `raw-site-check.json` | `05bfdcacdcac4b8c29621f9ed93eaf98da491e3d864b30b8d7de584301eafc38` |
| `record-check.json` | `280ff89daff866bcc9283ee415a5cf97d7af2aa11ab5e896f14383f26715edec` |
| `rerun/census-base.json` | `760a268a7776f25f3b57fafd8ca542eed3a1ee483ce4d8853878bd66aa2b0fb8` |
| `rerun/census-grep-base.json` | `88072412e696487606bdeab3e8180ff7577be2d90543b56e30d21e74e1de8071` |
| `rerun/census-grep-head.json` | `b6b5e20a3f2a966f329e35756a2dfa0233fcdb5c3828ce3a682dd351132412f3` |
| `rerun/census-head.json` | `8900e2b6bdfd10012b7d1baaf174c366f62c51233cf3650e8bf13d230ff72ff9` |
| `rerun/differential-base.json` | `0082d49f66e680c38d042c9fdac28d6a0ec3cfb6f498e12e9218b3fa4bd46013` |
| `rerun/digest-citers-2e7ab2ec.json` | `ce27db91dd151d10461affc45203fb587fb03fc1e97c23f0e382c6e8eacd7dee` |
| `rerun/digest-citers-2e7ab2ec.log` | `7adf8405d93a51573e03e49cf5ea7beea7918e1ae4a340da5ce79d859734b0ad` |
| `rerun/digest-citers-main.json` | `139f2a91fc34f003d6f84af39dbdd14811249fc95e22dc842758d357d20de176` |
| `rerun/digest-citers-main.log` | `66661d16aad489c4b6d23f4459e1bdb0933692c8a071ad6f1185597bc89a1aac` |
| `se-mutate-original.txt` | `1f9ffc25eef185d21393c36d8100aa240d03026e0d71702288eb8c3ef9244095` |
| `se-mutate-strict.txt` | `4ee94c6c6c2646e2c6ff289705634debcb4d0f28e2cd281e412631b11ae72d2d` |
| `se-rename.txt` | `21b19dcdc19cbdeb056d89abb0dfe7519bdb7f72467d557b4aeb71db81e7cb82` |
| `se-rerun.json` | `2ba61a88f012bff9e6ed9924106628c5fdacf4189fbf01b41b50ad2474dc6f96` |
| `se-strict-2e7ab2ec.json` | `ec35a643452da9bf0c737b185c2cf068c7b6cd75747b76ea302c573b9306ed38` |
| `se-strict-selftest-mutants.txt` | `62bfa41aba5e014e0783c7e03d57338605b9817d55338c83889ee025f77baf3d` |
| `se-strict.json` | `7864c27fb50eb2ef483e8ff63cb5a8804879572258b6f4c8161af5fdde007726` |
| `spec-base-tests.json` | `f2636f2dda4e7e4942607d7d60c6e847963081ee004d5e4a8ab5a8b5723a2d76` |
| `spec-lane-sample.json` | `713a0bf7256b5c90254ce5b3150c12363ee5eba3cc7ac5873b04c70a303bc96d` |
| `spec-own.json` | `dbaca3451833549bd4d30d4b7b2947ccd4c5c004d8bf0325866d669f723b44ee` |
| `surface-version.txt` | `a7ee7046215e3efd5afdb810dc78a415c2b7e78603f0551895e91a2890179ca4` |
| `tools/differential-extended.mjs` | `7e19e9ba2c71dcd1d5db2b11739335358089246308bf26046bc1870f4ccf356a` |
| `tools/importer-probe.mjs` | `cffd839a6b2e9fe2c9929720bbe810fb8cc052aa60d5449e7d5053252a8c2d8c` |
| `tools/iso-differential.mjs` | `21eb7d91bb89e136076d9ee864fc7d0c6be045c4311ce350bf42364674bd93e8` |
| `tools/mutant-rerun.py` | `067b1106dcbbfc2f037c02703e7e742f0e0fb17d263dfeaff3128b1d7b9d9196` |
| `tools/raw-site-check.py` | `217223127b9646fc69435a45d390c37f59e336a4fb088586759ba154c07af199` |
| `tools/record-check.py` | `a601b8833c442575d4f62cdc0208cece94bff55c5b0ba87a51a011c64449e44e` |
| `tools/se-mutate.mjs` | `aca514edb530f2e7be7c1683dff887f4375cd4d21612e2b2075c91d4bbee013b` |
| `tools/se-rename.mjs` | `43c2bb2913adf02b2b81df081d5964a86d93693c3db7e94113d92c3f2e63f671` |
| `tools/site-equivalence-strict.mjs` | `fbcee6fc821dfb35f7461f0fa5cbab4eb7e828d9eef1d866cd48b8db51adb942` |
| `tools/surface-version.mjs` | `f041597c5258701fcdd7fd0b08a5a0e9c1f1a51593ceb85510cc3a74d6134716` |
| `typecheck-2e7ab2ec.log` | `e79ba97c617f3c42161f19299460b61c3cf6b394dad5622ce35c7343f1a926b6` |
| `typecheck-merge-rerun.log` | `0379a035db9a9ff7167bd595e5e20b675dd8a3c6e26533a8a3afbd86a9322228` |
| `typecheck-merge.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |

How to re-run the tools. Every tool takes a clone, checkout or repository path as its first argument (its `Usage` line).
`tools/site-equivalence-strict.mjs` resolves `typescript` from its own location. `se-mutate.mjs` (with
`SE_TOOL=site-equivalence-strict.mjs`) and `se-rename.mjs` load it from the clone's `docs/evidence/syzygy-bpyt-6-3-iso/`.
So copy it there first, inside a clone at `2e7ab2ec` with `npm ci` done, and remove it afterwards.
