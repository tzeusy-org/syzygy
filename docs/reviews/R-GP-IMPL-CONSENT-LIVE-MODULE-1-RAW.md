# R-GP-IMPL-CONSENT-LIVE-MODULE-1 — CC-REV-1 implementation review of syzygy-bpyt.8.19, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 59f04097
Subject: r1-review.diff sha256 6496aab116fb68950f2d269da970be609b4bfb1c14d055f4691f0b32e7929bd0

Reviewer: independent fresh-context CC-REV-1 reviewer (Claude Opus 5.5). I did not author this change. I changed none of
its bytes, pushed nothing, commented on nothing and ran no bd mutation. I read no observed-repository content and opened
no credential file. Every world the differentials read is Syzygy's own `.syzygy/governance/decisions/` tree with
in-memory or scratch overlays. The review ran 2026-10-22 to 2026-10-24 local time. It was interrupted once by a usage
limit and resumed. Nothing ran across the stop: the two runs in flight had already written complete outputs.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` gives
  `6496aab116fb68950f2d269da970be609b4bfb1c14d055f4691f0b32e7929bd0`. That matches the brief, re-derived at the start and
  again before writing this file.
- [Observed] In a fresh clone, `git diff 9a30237ed700e6579f3fcc1c6292e6c759861c3f 59f0409701b9a9291907d8acbd0d6559df7db1a4 | sha256sum`
  gives the same digest. `--stat` ends `25 files changed, 73216 insertions(+), 99 deletions(-)`.
- [Observed] `git merge-base --is-ancestor 9a30237e 59f04097` succeeds. The branch has three commits: `f065064c`
  (refactor), `8c711bbf` (tooling) and `59f04097` (evidence).
- [Observed] `gh pr view 517` returns head `59f0409701b9a9291907d8acbd0d6559df7db1a4`, state OPEN.
  `git ls-remote origin refs/heads/main` returns `ce322e1a65b7…`, which is main as the brief states.
- [Observed] Every evidence record names `8c711bbf1933e05575b50a204f1c334e1448c005` as the new tree.
  `git diff --stat 8c711bbf 59f04097` is `10 files changed, 72666 insertions(+)`, and all 10 files are under
  `docs/evidence/syzygy-bpyt-8-19/`. So the code the records measured is the reviewed code.
- [Observed] Main's later commit (#516) touches only `packages/polaris-dossier/src/launched.test.ts`, and that file is
  not among the 25 the subject changes.

## 2. Clauses relied on (quoted), and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:31-41`):
  - "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
    (VIS-7);"
  - "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend
    on;"
- **GP-Q0, Part 1** (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:51-55`): "Behavior-preserving refactors
  may proceed under the acts already in force." It defines "Behavior-preserving" as "none of the following changes: a
  rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security
  or retention decision."
- **GP-Q0, review rule** (`:62-66`): "**Which ones:** pull requests touching class 1 (authority boundaries), class 3
  (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint." The checks:
  "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- **The Q8 row** (`:81`): "| The parked provider island | **Kept parked.** Bead `8.1` decouples it. Deletion is
  revisited at the next audit |"
- **The stop clause** (`:95-96`): "Any change not listed here to what a gate accepts or refuses stops and returns to the
  owner."
- **AGENTS.md rule 6:** "Mutate the input and confirm the check fails, per predicate, before trusting it". **Rule 11:**
  "An evidence record names its subject and the subject's digest".

**Class ruling.** I rule on the classes independently.

- **Class 4: touched.** The moved code is the in-force rule for SEC-2 admission records (observation and egress consent).
  The change re-routes the dossier start gates' (`screen.ts`, `gate-sources.ts`) and the package reader's imports of it.
- **Class 1: touched.** `createPackageAdmissionRecordsPort` is the adapter authorization the dossier trigger uses: it
  says whether an observation read is consented. It now takes its in-force rule from a new module.
- **Class 6: touched additively.** It gains one subpath (`./live`) on a `"private": true` workspace package, and the
  census shows no removal. GP-Q0's extras attach to class 6 only for "pull requests that remove an endpoint", so class 6
  adds no checks here. Classes 1 and 4 trigger them anyway.
- **Class 3: not touched.** No snapshot composition or evaluation identity changes.
- **Classes 2, 5 and 7: not touched.**

**Authority ruling.** [Inferred from the evidence in §3 and §5] The change stays inside the Q8 row ("Bead 8.1 decouples
it"). It is behaviour-preserving in GP-Q0 Part 1's sense: no rendered byte, wire format, refusal string, exit code,
digest-bound artifact or consent decision changes. I found no input on which any gate accepts or refuses differently, so
the stop clause is not triggered.

- **The additive `./live` subpath.** It is the same decoupling device 8.1 used for core `./live`. It removes nothing, and
  every value it exports is the root's own object, so it changes no gate decision.
- **N5 (`prompts.ts` stays in core `./live`).** I agree with the lane's ruling. Moving `prompts.ts` into the island
  would remove names from a subpath that is already on main. That is a class-6 endpoint removal, and island membership
  is the next audit's question under Q8 ("Deletion is revisited at the next audit"), not this bead's. Keeping it changes
  nothing.
  - [Observed] The boundary test passes with `prompts.ts` reached, so it imports no island module.
  - [Observed] Its compiled form loads at runtime both before and after (`loads-*.json`).

## 3. What I ran, and the results

Environment:

- Clones under `…/scratchpad/rev-517/`: `clone` (59f04097), `base` (9a30237e), and `neg` (59f04097 plus negative-control
  edits). Each had its own `npm ci`.
- Private TMPDIRs: `/tmp/r517-1` to `/tmp/r517-7`.
- Node v24.6.0, vitest 3.2.7, esbuild 0.28.2. The one-minute load average ran from 8 to 42.
- No 5 s timeout of the syzygy-bpyt.4.13 class occurred in any run.

1. **Builds.** `npm run typecheck`: `exit=0` on `clone` and `exit=0` on `base`.
2. **Targeted tests.**
   - `npx vitest run packages/polaris-generation-core/src/island-boundary.test.ts`: "Test Files  1 passed (1)",
     "Tests  4 passed (4)".
   - The run over `consent-ports.test.ts`, `package-reader.test.ts`, `screen.test.ts` and `no-egress.test.ts`:
     "Tests  469 passed | 1 skipped (470)", `exit=0`. The per-file lines:
     - `consent-ports.test.ts (58 tests)`
     - `package-reader.test.ts (299 tests)`
     - `screen.test.ts (110 tests)`
     - `no-egress.test.ts (3 tests | 1 skipped)`
   - The no-egress proof ran under strace: "no-egress proof ran under strace: 14 network-class calls, traced calls from
     1 task(s), 0 Internet-family". The skipped case is the without-strace branch (`no-egress.test.ts:98`).
3. **`python3 scripts/check_governance.py`.** On `clone`: "32 OK, 21 WARN, 0 FAIL (53 checks)". On `base` the summary is
   identical. The only differing check line is CG-2a's file count (2057 → 2058).
4. **Verbatim move** (`tools/verbatim.py`, output `results-verbatim.txt`). It compares, by script, the non-blank lines
   `consent-ports.ts` loses against the non-blank body of `in-force.ts`.
   - [Observed] "removed non-blank lines from consent-ports.ts: 36" and "in-force.ts non-blank body lines (no import, no
     // header): 36".
   - [Observed] "positional pairs differing: 3 of 36" and "each differing pair differs only by a leading "export ":
     True". The three are `ref`, `Dead` and `effective`.
   - [Observed] Lines added to `consent-ports.ts`: exactly
     `import { effective, ref, type Dead } from './in-force.js';` and
     `export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';`.
   - [Observed] Compiled form (`results-consent-ports-js.diff`): `consent-ports.js` loses 38 non-blank lines and gains 2
     (the import and the re-export). Its 31 removed code lines equal `in-force.js`'s 31 code lines once the `export `
     prefix is stripped ("True").
   - [Observed] Across the consent `dist/` between base and head, these files are identical: `admission-record.js`,
     `recorder-template.js`, `citation-allowlist.js`, `index.js` and `testing.js`.
   - [Observed] The compiled files that differ, differ only in their one import line:
     - `package-reader.js`: `'./consent-ports.js'` → `'./in-force.js'`;
     - dossier `screen.js` and `gate-sources.js`: `'@syzygy/polaris-generation-consent'` →
       `'@syzygy/polaris-generation-consent/live'`.
5. **Module identity, dist form** (`tools/identity_probe.mjs`, output `results-identity-dist.txt`). This resolves the
   specifiers as the dossier's `dist/screen.js` resolves them.
   - "root resolves to packages/polaris-generation-consent/dist/index.js".
   - "live resolves to packages/polaris-generation-consent/dist/live.js".
   - "live values 25; root values 28; live values === root value: 25".
   - "root values not on live: [ 'UNCONSENTED', 'createConsentPorts', 'withConsent' ]".
   - "parseAdmissionRecords via live threw: AdmissionRecordError ; instanceof root.AdmissionRecordError: true ;
     instanceof live.AdmissionRecordError: true".
6. **Module identity, vitest source form** (`tools/zz-r517-identity.test.ts`). I copied it into the clone's
   `packages/polaris-dossier/src/`, ran it, deleted it, and confirmed `git status --porcelain` was empty.
   - "✓ |@syzygy/polaris-dossier| packages/polaris-dossier/src/zz-r517-identity.test.ts (3 tests)", "Tests  3 passed (3)".
   - It asserts, under the root `vitest.config.ts` aliases:
     - all 25 `./live` values are the root's objects;
     - `inForceRecords` and `notInForceRecords` are one object through root, `./live`, `consent-ports.ts` and
       `in-force.ts`;
     - an `AdmissionRecordError` thrown through `./live` is an instance of the root's class.
7. **Module identity, esbuild form** (`tools/esbuild_inputs.mjs`, outputs `results-esbuild-{head,base}.txt`). It bundles
   `screen.ts` and `gate-sources.ts` with `no-egress.test.ts`'s alias map, same keys and same order.
   - At head, `screen.ts` has 23 consent/core inputs, among them consent `src/live.ts` and `src/in-force.ts`. It has no
     consent `index.ts`, no `consent-ports.ts`, no core `index.ts` and none of the 7 core island modules.
   - At head, `gate-sources.ts` has 6 inputs, all consent live modules.
   - At base, both have 31 inputs, including consent `index.ts`, `consent-ports.ts`, core `index.ts` and all 7 core island
     modules.
   - So `package.json` `exports` (`./dist/live.js`, compiled from `src/live.ts`), the vitest alias and the esbuild alias
     all resolve `./live` to the same source module.
8. **Runtime loads** (`clone/scripts/measure_cli_island_loads.mjs` run on both trees; outputs `loads-base.json` and
   `loads-head.json`).
   - Base: "139 workspace modules loaded, island 7 of 20, consent-ports true".
   - Head: "131 workspace modules loaded, island 0 of 20, consent-ports false".
   - 10 modules are gone: consent `consent-ports.js` and `index.js`, core `index.js`, and the 7 core island modules.
   - 2 are new: consent `in-force.js` and `live.js`.
   - My lists equal the committed `cli-island-loads-before.json` and `-after.json` lists: "True" and "True".
9. **Boundary mutants.** I ran them with the 8.1 runner `docs/evidence/syzygy-bpyt-8-1/mutate.py`
   (sha256 `01d7daa5…`, matching the record's `runnerSha256`) on `clone` at 59f04097, against test-file sha256
   `a32d3ddc…`. Spec: `reviewer-boundary-spec.json`; output: `reviewer-boundary-mutants.json`, which holds each mutant's
   `old`/`new` fragment.

   | Mutant | Edit | Outcome |
   |---|---|---|
   | B1 (theirs) | `import { digestCanonicalJson } from '@syzygy/polaris-generation-core';` added to `in-force.ts` | killed: "reaches no island module from the CLI entry", "AssertionError: expected [ …(11) ] to deeply equal []" |
   | B4 (theirs) | `export { UNCONSENTED } from './consent-ports.js';` added to `live.ts` | killed, same line |
   | R1 (mine) | `export const loadCore = () => import('@syzygy/polaris-generation-core');` added to `in-force.ts` | killed, same line |
   | R2 (mine) | `export * from './consent-ports.js';` added to `live.ts` | killed, same line |
   | R3 (mine) | `const CORE = ['@syzygy', 'polaris-generation-core'].join('/'); export const loadCore = () => import(CORE);` in `in-force.ts` | **survived** (expected: the 8.1 review's N2 class) |
   | R4 (mine) | a `"node": "./dist/index.js"` condition ahead of `"import"` in consent `./live` | **survived** (expected: the N2(b) class) |
   | R5 (mine) | the vitest alias for consent `./live` pointed at `src/index.ts` | **survived** (see N6) |

   For R4, I applied the edit by hand and asked Node to resolve the specifier from the dossier's `dist/`: "R4 Node
   resolves ./live to file:///…/clone/packages/polaris-generation-consent/dist/index.js". After `git checkout`, the same
   probe gives "…/dist/live.js". So under R4 the test is green while Node would load the root and the island.
10. **Census.**
    - [Observed] I re-ran `clone/scripts/census_consent_exports.mjs` on `base` and on `clone --against` that output. My
      before and after `modules` blocks and the after `comparison` block equal the committed records: "True", "True" and
      "True".
    - Output: "4 modules: index.ts 57, live.ts 48, testing.ts 12, consent-ports.ts 12; unchanged against 9a30237e: true".
    - `subpathsAdded` holds only `./live`, with 48 names, `notRootNames: []`, `notRootOrigins: []` and
      `valuesNotRootObjects: []`. `subpathsRemoved: []`.
    - Origins moved, for root and `consent-ports.ts` alike: exactly `NotInForce`, `inForceRecords` and
      `notInForceRecords`, from `consent-ports.ts` to `in-force.ts`.
    - Their runner `run_consent_census_mutants.py` on `clone` gives "M0-unmutated survived", "C1 … C7 killed",
      "totals {'mutants': 8, 'asExpected': 8}" (output `census-mutants-rev.json`).
    - Two mutants of mine (`tools/census_reviewer_mutants.py`, output `census-reviewer-mutants.json`):
      - "R-C1-consent-ports-wraps-inForceRecords killed": `consent-ports.ts` exports a wrapper in place of the
        re-export. It is caught through `./live`'s `valuesNotRootObjects`.
      - "R-C2-NotInForce-shape-widened survived … buildExit 1": a type keeps its name and origin but changes shape. The
        census does not see it, and the build fails.
11. **Differential sample** (`clone/scripts/differential_consent_act_families.mjs --old base --new clone`). I scaled it
    down by kind: `--kinds base,base-reduced,record,artifact,pin,edited-between-reads,policy-bytes,named`, 4 workers. That
    keeps every `named` world, which carry the 8.10 `PROSE_ALTERATIONS` and `HEAD_FIELD_ALTERATION` prose corpus, and
    drops the `line`, `probe` and `real-file` kinds for time.
    - [Observed] `--count` over the full corpus gives `corpusSha256` `f889e4ca7f98…`, which is the committed
      `differential.json` digest. So the corpus I sampled is the corpus they ran.
    - Result: "518 worlds, 4019 answers compared, 0 mismatches, 138 distinct answer vectors, 64 distinct label vectors,
      materialization 0 of 1132 pairs differing", `exit=0`.
    - The new tree loads `dist/live.js`, with `liveResolvesInsideTree` True and `liveValuesAreRootObjects` True.
    - Per world, every one of my 518 answer vectors equals the committed `differential.json` vector for the same
      (kind, subject, operator, base): "same 518 different 0 not found 0 of 518".
    - The screen gave 517 answers and the in-force rules 519.
12. **Negative control, reproduced.** `neg` is 59f04097 with the two edits in `negative-control.json`'s `controlNote`,
    applied by script. I rebuilt it with `npx tsc -b packages/polaris-generation-consent packages/polaris-dossier`.
    - [Observed] The mutated `in-force.ts`, `screen.ts`, `in-force.js` and `screen.js` hash to the record's `c3bbadee…`,
      `593ee889…`, `37d9b61a…` and `bbe151b9…`.
    - Run with the recorded kinds, 3 workers: "65 worlds, 1164 answers compared, 151 mismatches … materialization 0 of
      236 pairs differing", `exit=0`.
    - By reader: screen 40, in-force-egress 33, in-force 39, consent-ports 39. That is identical to the record, and the
      mismatch set (world, reader, old, new) is equal: "True". The corpus digest is `50c879d56258f2a0` in both.
    - The `port` reader gave 14 answers and 0 mismatches (see N1).
13. **Reviewer extension: the gate sources' port-backed answers** (`tools/make_reviewer_differential.py` →
    `tools/differential_reviewer.mjs`). The extension:
    - adds a `gate-port` reader that calls, through `createPackageGateSources`, `repositoryIdsFor`, `consentAbsenceFor`,
      `consentedRevisionsFor`, `observationConsentFor` (both probe repositories) and `screeningPolicy`;
    - adds `port` and `gate-port` to the admission and class subjects' readers;
    - keeps only the worlds that run `gate-port`.

    Runs:
    - Base vs head, kinds `base,base-reduced,named,record,artifact,pin`: "243 worlds, 2765 answers compared, 0
      mismatches … materialization 0 of 252 pairs differing", `exit=0`. That is 218 `named` (altered-prose) worlds,
      with `port` 486 answers and `gate-port` 486 answers.
    - Base vs `neg` with the recorded in-force edit: 249 mismatches. `port` 1 (an egress v2 artifact world, where v1
      stays live), `gate-port` 0, in-force 110, consent-ports 110, screen 24, in-force-egress 4.
    - Base vs `neg` with a blunt in-force edit (`return effective(records, now).live;` → `return [];`), kinds
      `base,base-reduced,record,pin`: "15 worlds, 437 answers compared, 85 mismatches", with `gate-port` 25 of 30,
      `port` 26, in-force 26, in-force-egress 8. That shows the `gate-port` reader is wired to the moved rules.

## 4. Findings

There are no blocking findings (no F ids).

- I found no input on which a consent reader or start gate answers differently from the base.
- The move is verbatim apart from three `export` keywords.
- Each `./live` value is the root's own object in all three resolution forms.
- Nothing falls outside the Q8 authority.

### N1 — The committed differential never calls the gate sources' port-backed answers, and its records-port reader sees no altered prose

- **Severity:** note. The reviewer extension (§3 item 13) closes it for this change.
- **Evidence:**
  - [Observed] The script's gate readers are `gate-d9`, `gate-rfc7-20`, `gate-registry-entry`, `gate-drawer:*` and
    `gate-statements:*` (`scripts/differential_consent_act_families.mjs:169-173`). None calls `repositoryIdsFor`,
    `consentAbsenceFor`, `consentedRevisionsFor`, `observationConsentFor` or `screeningPolicy`.
  - [Observed] Those five are the gate-sources methods that reach the moved rules, through
    `createPackageAdmissionRecordsPort` (`gate-sources.ts:466,503-518`; `package-reader.ts:937-985` calls
    `inForceRecords` and `notInForceRecords`).
  - [Observed] The `port` reader that calls the same port directly runs only in base and policy-bytes worlds. It is
    filtered out of the `probe`, `real-file` and reduced-tree worlds (`:482,488,497`) and is not in `ADMISSION`
    (`:410`). In `differential.json` it gives 22 of 56,781 answers, none in an altered-prose world.
  - [Observed] `negative-control.json`'s `controlNote` says "Expected: mismatches in the in-force, port and
    consent-ports readers". Its `port` answers are 0 mismatches of 14, and I reproduced that exactly.
  - [Observed] With the reviewer extension: 486 `gate-port` and 486 `port` answers over 218 altered-prose worlds, 0
    mismatches. A blunt in-force mutant moves 25 of 30 `gate-port` answers.
  - [Observed] The recorded in-force mutant moves 0 `gate-port` answers. The corpus has no world where an observation
    record is superseded, and the gate sources expose observation consent only.
- **Failure scenario:** a later change to the in-force rules, or to how the gate sources obtain them, alters the start
  gate's observation-consent answer. The committed differential shows 0 mismatches because no reader asks the gate that
  question, and its negative control cannot show otherwise.
- **Proposed fix:**
  - Under syzygy-bpyt.8.26, fold the `gate-port` reader and `port` into the shared script's `ADMISSION` readers. The
    exact fragments are in `tools/make_reviewer_differential.py`.
  - Add one world where an observation record has a successor that took effect.
  - Make a negative control's `controlNote` expectation a checked predicate (per reader, mismatches > 0) rather than
    prose.
  - Retain this reviewer's `gp-diff.json`, `gp-nc1.json` and `gp-nc2.json` beside this raw as the AC3 evidence for the
    gate sources' port-backed answers.

### N2 — syzygy-bpyt.8.23 is not moot: only its N3 half is, and two of its N2 mutants still survive, one now on consent `./live`

- **Severity:** note, a disposition hazard.
- **Evidence:**
  - [Observed] The PR body says: "syzygy-bpyt.8.23 is moot: the exception it concerns is gone."
  - [Observed] 8.23's description has two parts. N2 covers computed `import()`, `createRequire`, Node condition order and
    a second entry. N3 covers the whole-module exception. Only N3 concerned the exception this PR deletes.
  - [Observed] My R3 (computed `import()` in `in-force.ts`) and R4 (a `node` condition ahead of `import` in consent
    `./live`) both survive `island-boundary.test.ts` at 59f04097. Under R4, Node resolves `./live` to `dist/index.js`
    (§3 item 9).
- **Failure scenario:** the coordinator closes 8.23 as moot on the strength of the PR body. Then a computed import or a
  condition-order edit in the new consent `./live` export re-opens the island path with the test green.
- **Proposed fix:**
  - Keep 8.23 open, retitled to its N2 half.
  - Add R4's consent-`./live` variant to its acceptance mutants. The fragments are in `reviewer-boundary-spec.json`.
  - Record in the dispositions that 8.19 resolves only 8.23's N3.

### N3 — `in-force.ts`'s header says the package reader only reports by the rules; its records port grants by them

- **Severity:** note. The text is a comment in a class-4 module, with no behaviour effect.
- **Evidence:**
  - [Observed] `packages/polaris-generation-consent/src/in-force.ts:3-4`: "one rule set for the consent ports, which grant
    by it, and the package reader, which reports by it."
  - [Observed] `package-reader.ts:979-985`: `check` decides `satisfied` for `observation-consent` and `egress-consent`
    from `live = inForceRecords(...)`.
  - [Observed] `repositoryIdsFor` and `consentedRevisionsFor` (`:937-967`) filter by it too. The dossier start gate's
    `observationConsentFor` is `port.check` (`gate-sources.ts:506-509`).
  - [Observed] Only `consentAbsenceFor` and `notInForceRecords` are reporting.
- **Failure scenario:** a later editor reads the header and treats an in-force change as reporting-only on the CLI path.
  In fact it moves the dossier's observation-consent grant.
- **Proposed fix:** reword the header. For example: "…for the consent ports and the package reader's records port, which
  both grant by it (the dossier start gates' observation consent), and for the reader's not-in-force reporting." Say in
  the PR or the dispositions that this is a comment-only change.

### N4 — The consent README's new "Entry points" heading now sits over the consent-ports rules

- **Severity:** note, documentation structure.
- **Evidence:**
  - [Observed] `packages/polaris-generation-consent/README.md:10` inserts `## Entry points` between the intro paragraph
    (lines 3-8) and its bullet list (lines 22-47, then "Not here: …" at 49-51).
  - [Observed] That list describes `consent-ports.ts` behaviour: `withConsent`, `unconsented-source-or-provider`, audits
    and `reserve`. The next heading is line 53.
- **Failure scenario:** a reader takes the consent-ports rules as part of the `./live` entry point that line 15 has just
  said excludes `consent-ports.ts`.
- **Proposed fix:** move the "Entry points" section to sit after line 51, before "## Reading the real admission
  records". Or put a `## Consent ports` heading above line 22.

### N5 — The boundary test's failure output does not name the edge that caused it

- **Severity:** note (test-rigor bar 7, "A failure names the defect").
- **Evidence:**
  - [Observed] Every killed boundary mutant fails with the same line, "AssertionError: expected [ …(11) ] to deeply equal
    []". That holds for the subject's B1–B9 (`boundary-mutants.json`) and for my B1, B4, R1 and R2.
  - [Observed] The 11 edges are the core root's re-exports of the island, not the CLI-side import that reached the root.
  - [Observed] The last test is named "reaches the island from the consent package root, which the CLI does not import",
    and it asserts only the first half.
- **Failure scenario:** a maintainer whose change re-adds a consent-root import in some dossier module gets a list of
  `polaris-generation-core/src/index.ts imports ./pipeline.js` edges. They have to trace back by hand to find their own
  line.
- **Proposed fix:**
  - In `reach`, keep a parent map, and report for each island edge the first path from `entry`.
  - Or assert in test 3 that `reach(ENTRY).reachable` contains neither
    `packages/polaris-generation-consent/src/index.ts` nor `…/consent-ports.ts`, each with its own message.
  - Either belongs in 8.23.

### N6 — Three hand-kept resolution maps for consent `./live`, and no test that they agree

- **Severity:** note, low.
- **Evidence:**
  - [Observed] `package.json` `exports`, `vitest.config.ts:9` and `no-egress.test.ts:38` all resolve `./live` to
    `src/live.ts` today (§3 item 7).
  - [Observed] My R5, the vitest alias pointed at `src/index.ts`, survives `island-boundary.test.ts`. The boundary test
    reads only `package.json`.
- **Failure scenario:** the aliases drift. The suite then exercises the root under the `./live` name, while the shipped
  CLI uses `dist/live.js`. Behaviour stays the same while the root is a superset, but a test of `./live` stops testing
  `./live`.
- **Proposed fix:** under 8.23, add a test that every `@syzygy/*` key in `vitest.config.ts`'s alias map resolves to the
  `src/` module its package's `exports` names, the same derivation the boundary test's `resolve` uses.

### N7 — Two records still to make: the N5 ruling, and GP-Q0's owner notice

- **Severity:** note. The clause makes the notice non-blocking.
- **Evidence:**
  - [Observed] The `prompts.ts` ruling exists only in the PR body ("N5 ruling (bead comment)"). The bead comment asked
    "decide here".
  - [Observed] `bd comments syzygy-bpyt.10` (read-only) has the 8.1 owner notice but no 8.19 notice yet. AC4 and GP-Q0
    `:66` require one.
- **Failure scenario:** the next audit, which Q8 assigns to revisit the island, does not see that `prompts.ts` was
  considered and left in `./live`. The owner is not told that 8.19 touched classes 1 and 4 and added `./live`.
- **Proposed fix:**
  - At merge, record the N5 ruling in 8.19's close reason, and as an input to the next audit's island list.
  - Post the 8.19 owner notice to `syzygy-bpyt.10`. It should name classes 1 and 4 (6 additive), the `./live` subpath,
    the 139 → 131 runtime module set, and N1–N6's follow-ups.

## 5. Every changed output, or the evidence that there is none

- **Rendered bytes, wire formats, refusal strings, exit codes, digest-bound artifacts, consent decisions: none found.**
  - [Observed] The committed differential has 0 mismatches over 56,781 answers. My sample has 0 over 4,019, and its 518
    per-world vectors equal the committed ones. My gate-port extension has 0 over 2,765.
  - [Observed] The compiled diff is the three import lines and the two new modules (§3 item 4).
  - Every refusal string comes from unchanged code, for example "throws AdmissionRecordError: invalid-records" and "no
    screening policy is in force: …".
- **Package surface:** one added subpath, `@syzygy/polaris-generation-consent/live` (48 names). The root (57), `./testing`
  (12) and `consent-ports.ts` (12) are unchanged by census. Three names moved declaration origin.
- **Runtime load set of the `syzygy` CLI:** 139 → 131 workspace modules, the 10 removed and 2 added listed in §3 item 8.
  This is the intended effect. It changes no output.
- **Governance:** `check_governance` gives the same 53 check results as base. The only difference is CG-2a's
  population count.
- **Docs:** the consent README gains a section (N4). The core README and AGENTS.md need no update. A sweep of non-evidence
  `*.md` files for "island" and "consent-ports" finds no sentence that this change makes false.

## 6. Verdict per acceptance criterion

- **AC1 — met.** The boundary test has no exception and passes ("Tests  4 passed (4)"). Recorded mutants B1 (an island
  import in the live module) and B4 (a consent-ports re-export in `./live`) fail it, and I reproduced both. 10 of 10 are
  recorded killed, with `old`/`new` fragments and commit. The surviving forms are N2's known class.
- **AC2 — met.** The census, re-derived, equals the record: `consent-ports.ts` keeps 12 names and the root 57, `./live`
  is additive (48 names, all root names of the same origin, all 25 values the root's objects), and nothing is removed.
  8 of 8 census mutants behave as recorded.
- **AC3 — met, with the reviewer's extension supplying part of the evidence.** The committed differential covers every
  consent reader and both start gates' act cross-checks, with 0 mismatches. My reproduction agrees world for world. The
  gate sources' port-backed answers were not in it (N1); my extension supplies them, 0 mismatches over 218
  altered-prose worlds.
- **AC4 — this raw is the independent class 1/4 review.** The owner notice is not yet posted (N7). It is the
  coordinator's at merge, and the clause makes it non-blocking.

## 7. Test quality

- **Net delta:** `+1 ~2 -1`, all in `island-boundary.test.ts`.
  - [Observed] The removed case was the 8.1 exception's lapse check, which is moot once the exception is gone.
  - [Observed] The added case is a positive control.
  - [Observed] The two changed cases now take an entry, and the second asserts `in-force.ts` is reached. That pins that
    the CLI path follows consent `./live` into the moved module.
  - Bar 10 is satisfied: there is no adds-only growth.
- **Bar 1 (behaviour, not implementation):** satisfied. The move is pinned by the existing `consent-ports.test.ts` (58)
  and `package-reader.test.ts` (299), which reach the rules through the re-export. My source-form identity probe shows
  that is the same object.
- **Bar 7 (failure names the defect):** see N5.
- **Rule 6 (a mutant per predicate):**
  - Boundary: 10 recorded, plus my 5. 2 are mine that survive (N2's class) and 1 is the alias drift (N6).
  - Census: 7 plus M0 recorded, plus my 2.
  - Differential: a negative control on in-force and the screen, plus my two on the gate path.
  - Gaps: the census sees names and origins, not type shapes. My R-C2 survives it, but the build fails (`buildExit 1`),
    so the typecheck covers that predicate. The negative control has no gate-sources mutant (N1).
- **The positive control is coupled to today's parking.** It passes because `consent-ports.ts` imports the core root
  (B10 shows it fails when the root drops the re-export). A later bead that decouples `consent-ports.ts` itself will
  fail it for a legitimate reason and must re-point it, for example to walking from `polaris-generation-core/src/index.ts`
  through a cross-package specifier. That is acceptable now, and worth naming in 8.23.
- **No flakiness observed:** no timeouts or retries in any run.

## 8. Cleanup

- I deleted the scratch clones `clone`, `base` and `neg`, my private TMPDIRs `/tmp/r517-1` to `/tmp/r517-7`, and a
  read-only tracker export, `bd-all.json`. I did this by path, after this file was written.
- No process of mine was left running: I checked the process list by path before the cleanup.
- Kept beside this raw, in `…/scratchpad/rev-517/`:
  - **Tools:** `tools/verbatim.py`, `tools/identity_probe.mjs`, `tools/zz-r517-identity.test.ts`,
    `tools/esbuild_inputs.mjs`, `tools/evidence_heads.py`, `tools/make_reviewer_differential.py`,
    `tools/differential_reviewer.mjs` and `tools/census_reviewer_mutants.py`.
  - **Results:**
    - `results-verbatim.txt`, `results-consent-ports-js.diff`, `results-identity-dist.txt`,
      `results-esbuild-head.txt`, `results-esbuild-base.txt` and `results-evidence-heads.txt`;
    - `loads-base.json` and `loads-head.json`;
    - `reviewer-boundary-spec.json`, `reviewer-boundary-mutants.json` and `reviewer-boundary.log`;
    - `census-before-rev.json`, `census-after-rev.json`, `census-mutants-rev.json`, `census-mutants-rev.log` and
      `census-reviewer-mutants.json`;
    - `diff-sample.json`, `diff-sample.log`, `nc-repro.json`, `nc-repro.log`, `gp-diff.json`, `gp-diff.log`,
      `gp-nc1.json`, `gp-nc1.log`, `gp-nc2.json` and `gp-nc2.log`;
    - `check-governance.log`, `check-governance-base.log`, `vitest-targeted.log`, `typecheck.log`,
      `typecheck-base.log` and the `npm-ci*.log` files.
