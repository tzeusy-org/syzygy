# R-GP-IMPL-ARGV-FAIL-CLOSED-1 — CC-REV-1 implementation review of syzygy-bpyt.8.36, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: aa331269
Subject: r1-review.diff sha256 6f5b19924040907b6d6efb2415aab535d0e252d1c9565586e8f260ad1957e626

Reviewer: rev-528, fresh context, independent of the lane. PR #528, branch `agent/syzygy-bpyt.8.36`. Code head
`1447b6bbd3954a271a1716d7866266e0fb908cfb`, evidence commit `aa3312691d815d09239958c2dec4116cfb1d9cbe`, base (merge base)
`a088f1caf061c1a2062527ce8521c9b64c3c7fd1`. No target-repository content was fetched or read. All runs were in scratch clones under
`rev-528/`, each with a private TMPDIR, all since deleted (section 8).

The verdict, in one paragraph. Both guards now fail closed on every form the bead names. I reproduced R-X6, R-X6b, R-X9, R-X6i, R-Y6
and R-Y7 from the #524 reviewer's own specs with its own `mut.py`: each survives at base and is killed at head, on the rows the PR
names. I wrote 31 base-side and 44 head-side mutants of my own. Twenty tree forms of the N1 class are killed at head, 12 of which
survive at base. Six N2 forms are killed at head, all six surviving at base. The tree is faithful: 0 of 10 manifests declare
`imports`, 12 of 12 multi-condition entries name one target, and 0 of 495 source modules carry a `#`, absolute or URL specifier. The
island walk and the resolver give byte-equal answers old against new (246/246 walks, 2,608/2,608 answers), and so does the #524
reviewer's original tool. The record checks out against the git objects. No product byte changes. Five notes follow; none must change
the bytes before merge:
- seven of the new predicates have no killing row: six of them can be pinned by rows I checked; the seventh (`Array.isArray`) is
  equivalent;
- one unnamed residual, a dependency alias;
- one unnamed population consequence, `.mts` callers;
- the owner notice is still pending;
- one load flake, outside the subject.

## 1. Subject identity checks

All [Observed], scripted:
1. `sha256sum r1-review.diff` gives `6f5b19924040907b6d6efb2415aab535d0e252d1c9565586e8f260ad1957e626`. `git diff a088f1ca aa331269 |
   sha256sum` gives the same digest. **Match.**
2. `git diff a088f1ca 1447b6bb | sha256sum` gives `6ccd0b36eec5bdee9765102902da4361645b5f463b59e3742e6d9d5be5e1f19e`. That equals
   `summary.json`'s `subject.sha256`, read by script in `check-record.json`. **Match.**
3. `git diff --shortstat a088f1ca aa331269` gives "20 files changed, 10530 insertions(+), 13 deletions(-)": 3 test files and 17 files
   under `docs/evidence/syzygy-bpyt-8-36/`.
   - `git diff --name-only 1447b6bb aa331269` gives 17 paths, 0 outside `docs/evidence/syzygy-bpyt-8-36/`. So the evidence commit
     changes no code byte.
   - `7f4e01ea..1447b6bb` changes only `workspace-reach.test.ts` (+4/−1, a row title).
4. GitHub: `headRefOid` is `aa3312691d815d09239958c2dec4116cfb1d9cbe` and the PR is OPEN, with commits `7f4e01ea`, `1447b6bb` and
   `aa331269`. `git ls-remote` on the operator checkout's origin gives the same head. Hosted `checks` and `node` both pass on
   `head_sha aa3312691d81…`, `event pull_request` (`gh api …/actions/runs/40130465925` and `…/40130465953`).
5. Main moved twice during the review. The merge base is `a088f1ca` throughout.
   - **First check.** Main was `9b539e5f64241ed4ccb119753e9f4786a15be2f7` (#525). `git diff --name-only a088f1ca 9b539e5f` lists
     84 paths:
     - `docs/README.md`;
     - 79 under `docs/evidence/runsync-root-skip-*` and `docs/evidence/syzygy-bpyt-4-22/`;
     - 2 raws under `docs/reviews/`;
     - `packages/cap1-system/src/daemon-entry-unchanged.system.test.ts` and `packages/cap1-system/src/state-dir.system.test.ts`.

     `git merge-tree --write-tree 9b539e5f aa331269` merges cleanly, to tree `60d362d4`.
   - **At writing.** `git ls-remote origin` gives main `ef467d4a5ea353ead34f5e332abc270958620a6e`, after #526 (8.35) and #520
     (4.13) landed. The PR head is still `aa331269`.
     - `git diff --name-only a088f1ca ef467d4a` lists 864 paths. Six of them are outside `docs/`: the two `cap1-system` tests above,
       `packages/polaris-dossier/src/launched.test.ts`, `packages/polaris-generation-consent/src/package-reader.test.ts`,
       `scripts/measure_vitest_test_durations.py` and `scripts/size_vitest_test_timeouts.py`.
     - **0 of the 864 is one of the 20 subject paths** (a Python set intersection over both `--name-only` lists).
     - `git merge-tree --write-tree ef467d4a aa331269` merges cleanly, to tree `e7e66f22`.
     - The specifier sweep on `e7e66f22` gives the same counts over the walked population: 495 source modules, 2,608 preprocessor
       specifiers and 8 odd specifiers, all of them the `docs` type probes (`spec-sweep-merge-ef467d4a.json`). Only the `docs`-wide
       totals differ, from 3 new `.mjs` evidence tools (603 → 606 files).
6. `mut.py` at `docs/evidence/argv-guards-review-2026-10-25/tools/mut.py` hashes to
   `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5`, which equals `summary.json`'s `mutRunnerSha256`. The copy I
   ran from `rev-528/tools/` has the same digest.
7. `island_diff.py` (lane) is `131206846b06…`, `record.py` is `3616a2de77…` and `summary.json` is `2e969055d2…`, each as the PR body
   states. Full digests are in `check-record.json`.

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `aa331269`:
- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31`: "1. **authority boundaries** — write-universe, typed-authority table," (continuing ":32 adapter authorization (VIS-5,
    VIS-6);")
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40`: "6. **public interface** — machine-queryable endpoints, adapter contracts," (continuing "anything an external consumer can
    depend on;")
  - `:49`: "**The change record states** which classes the change touches, or "none,""
  - `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:53`: "a rendered byte, a wire format, a refusal string or an exit code;"
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6
    mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns" / "to the owner."
- `AGENTS.md` at `aa331269`:
  - rule 2, `:120`: "No "zero / all / 100%" claim without running that exact sweep this"
  - rule 4, `:123`: "Read a check's output, not its exit code, and check its denominator"
  - rule 6, `:126`: "Mutate the input and confirm the check fails, per predicate, before"
  - rule 9, `:132`: "A claim of absence needs a sweep with a denominator."
  - rule 11, `:134`: "An evidence record names its subject and the subject's digest; a record"
  - guardrail `:263`: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and"
- The ruling this change re-evidences, `docs/reviews/R-GP-IMPL-ARGV-GUARDS-1-RAW.md` §2. Its class ruling: "classes 1 and 4 (through
  the island guard), and class 6 with no endpoint removed". On gates: "No product byte changes, so nothing any gate accepts or
  refuses changes, and nothing here returns to the owner under `:95-96`."
- The test-rigor bar. The brief's reference 4 names the copy under `~/.claude/skills/` (see §8 on that path). The quotes below are
  anchored to the copy tracked in this repository, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `aa331269`, so a
  reader can check them by `git show`. Each phrase was located there with `grep -n -F`:
  - bar 3, `:60`: "3. **Edge and failure paths are first-class** — Empty inputs, boundaries,";
  - bar 4, `:64` and `:66-67`: "4. **No tautologies** —" … "Expected values are literals or" / "independently derived.";
  - bar 6, `:78-79`: "6. **Deterministic or quarantined** — A test that fails intermittently is" / "worse than no test: it trains
    people to ignore red.";
  - bar 10, `:93-96`: "10. **Growth is governed** — A test is worth *adding* only if it catches a" / "plausible bug no existing test
    catches" … "adds-only growth in a mature area is a finding".

**Class ruling: classes 1, 4 and 6, with no endpoint removed. Classes 2, 3, 5 and 7 are not touched.** The PR declares 1, 4 and 6.
I agree, and the #524 ruling holds here.
- **Classes 1 and 4, touched.** [Inferred, from the code and the #524 ruling]
  - `workspace-reach.testkit.ts` is the island guard's resolver. The island guard is the rule-6 kill evidence for the 8.1 ruling's
    class-4 claim (provider egress code is unreachable from the CLI) and for its class-1 claim (the CLI injects the operator-agent
    renderer adapter).
  - This change rewrites that resolver's handling of `#`, absolute, `file:` and condition-object specifiers. So it changes the
    mechanism of the class 1/4 evidence, though no product byte moves.
  - Its kill power rises and nowhere falls. 0 weaker. Nine reviewer mutants are stronger, among them 8.1's `island:R4` and 8.23's
    `consen:R4`, both now killed.
- **Class 6, touched; no endpoint removed.** [Observed]
  - The census and the daemon-path guard pin the `./argv` subpath the daemon imports, which is an `exports` entry.
  - No `package.json` is in the diff (0 of 11 tracked manifests).
  - `@syzygy/polaris-generation-core` still exports only `.` and `./live`, so the testkit's new exports (`resolveIn`, `Manifest`,
    `Workspace`) are not an endpoint.
  - Only three files import the testkit, all tests: `workspace-reach.test.ts`, `island-boundary.test.ts` and
    `subpath-imports.test.ts` (`grep -rln workspace-reach.testkit` over `apps packages scripts`).
- **GP-Q0's three checks apply (classes 1 and 4):**
  - **Differential.** It is degenerate for the product, since no product byte changes. The stand-in is non-degenerate and
    reproduced: old and new resolver over one tree (§3 item 4).
  - **A rule-6 mutant per predicate.** Mostly met. Seven predicates have no killing row: six are listed in N1, and RV-P8 is
    equivalent.
  - **Owner notice.** Pending (N4).
- **Gate changes.** No product gate changes, because no product byte changes. Nothing returns to the owner under `:95-96`, by the same
  reasoning as the #524 ruling. [Observed] The guards' answers on today's tree are byte-equal old against new (§3 item 4).
  - Prospectively, the guard refuses slightly more than the bead's literal list. The bead names "(node, import, require, default)";
    the head compares every condition except `types`.
  - That covers `module-sync`. [Observed: Node v24.6.0 resolves a `module-sync` target ahead of `import`, `node-probe.jsonl`.] So
    comparing it is required for fidelity, not a widening.
  - It also covers conditions Node takes only under `--conditions`, such as `browser`.
  - It also refuses `#` targets the resolver cannot follow: patterns, fallback arrays, nested conditions, and `./` targets outside
    `./dist/`.
  - Every one of these is a fail-closed refusal in a test guard, it changes no answer in the tree, and the PR names it ("Unlisted
    conditions", "Patterns and fallbacks"). I rule it within the bead's fix direction, not a gate change under `:95-96`. The owner
    notice should name it (N4).

## 3. What I ran, and the results

1. **The six bead-named mutants, rerun from the #524 reviewer's own specs with its own `mut.py`.** [Observed]
   - `tools/build_named.py` lifts the specs straight from `docs/evidence/argv-guards-review-2026-10-25/tools/own-specs.json` and
     `x9-specs.json`, unchanged, plus the R-X6j control. It does not use the lane's `reviewer-specs.json`.
   - Results are in `named-base.json` / `named-head.json`:

   | Mutant | Base `a088f1ca` | Head `aa331269`, failing rows |
   |---|---|---|
   | R-X6 | survives, "Tests  27 passed (27)" | killed, "Tests  1 failed \| 26 passed (27)": "reaches this package through argv.ts and state-directory.ts alone" |
   | R-X6b | survives, 27/27 | killed, the same row |
   | R-X9 | survives, 27/27 | killed, "Tests  2 failed \| 25 passed (27)": that row and "resolves every workspace specifier on it, and reaches past the entry's own imports" |
   | R-X6i | survives, "Tests  4 passed (4)" | killed, "Tests  1 failed \| 3 passed (4)": "reaches no island module from the CLI entry" |
   | R-Y6 | survives, "Tests  74 passed (74)" | killed, "Tests  1 failed \| 80 passed (81)": "names readArgv only where the lift reads it: its declaration, an import or export of it, and the callee of a call" |
   | R-Y7 | survives, 74/74 | killed, the same row |
   | R-X6j (control, the same edge by name) | killed | killed |

   - Every run left a clean tree, and each `old` occurred once (`oldCount` 1).
   - The failing rows equal the lane's, row for row (`check-record.json`: "targets agreeing with rev-528 at base": 6, "at head": 6).
2. **My own mutants.** Every result is [Observed]. The `expect` fields in my specs are predictions; the five base-side mispredictions
   are listed below. Head runs are at `aa331269`, base runs at `a088f1ca`, every tree is clean after, and every `old` occurs once.
   - **N1 tree forms (daemon path unless marked island):**

     | id | form | base | head |
     |---|---|---|---|
     | RV-T1 | `"#d/*": "@syzygy/polaris-dossier"`, `import '#d/barrel'` in main.ts | survives | killed ("resolves every…") |
     | RV-T1b | the same, from an intermediate `bridge.ts` | survives | killed ("resolves every…") |
     | RV-T2 | `"#c/*"` to the consent root, from dossier-site.ts (island) | survives | killed ("resolves every workspace import the CLI reaches…") |
     | RV-T3 | `"node": { "import": "./dist/index.js", … }` ahead of `import` in `./argv` | survives | killed (2 rows) |
     | RV-T4 | `"import": { "node": "./dist/index.js", "default": "./dist/argv.js" }` | killed (3 rows) | killed (3 rows) |
     | RV-T5 | `"require": "./dist/index.js"` ahead of `import` | survives | killed (2 rows) |
     | RV-T6 | `"import": ["./dist/index.js", "./dist/argv.js"]` | killed (3) | killed (3) |
     | RV-T7 | `"#dossier": ["@syzygy/polaris-dossier"]` (an `imports` fallback array) | survives | killed ("resolves every…") |
     | RV-T8 / T9 | main.ts imports `./bridge.mjs` / `./bridge.cjs`, a `.mts` / `.cts` re-exporting the barrel | killed | killed ("resolves every…") |
     | RV-T10 | main.ts imports `'.'`, whose new `index.ts` re-exports the barrel | killed | killed ("reaches this package…") |
     | RV-T11 | `#dossier` declared, ``void import(`#dossier`)`` outside the branches | survives | killed ("reaches this package…") |
     | RV-T12 | `#dossier` declared, `import(hashName)` | killed | killed ("no import() or require of a computed name") |
     | RV-T13 | `#consent` declared, ``void import(`#consent`)`` in dossier-site.ts (island) | survives | killed ("reaches no island module…") |
     | RV-T14 / T15 | main.ts imports the barrel by absolute path / by `File://` URL | killed (entry row only) | killed (entry row and "resolves every…") |
     | RV-T14b / T15b | the same two from an intermediate `bridge.ts` | survives | killed ("resolves every…") |
     | RV-T16 | main.ts imports `#dossier`, declared only by apps/three-surface-poc | survives | killed ("resolves every…") |
     | RV-T17 | `"#bridge": "./dist/bridge.js"`, `src/bridge.ts` re-exports the barrel | survives | killed ("reaches this package…") |
     | RV-T18 | dependency `"dossier": "file:../../packages/polaris-dossier"`, `import 'dossier'` | survives | **survives** (N2) |
     | RV-T19 | `bridge.ts` re-exports `../../../node_modules/@syzygy/polaris-dossier/src/index.js` | survives | **survives** (not loadable; §4 N2) |

   - **N2 forms in `cli.ts` (`argv.test.ts`, 74 rows at base, 81 at head):**

     | id | form | base | head |
     |---|---|---|---|
     | RV-C1 | `const { readArgv: readArgs } = argvNs;` and a call through it | survives | killed (census row) |
     | RV-C2 | `export { readArgv as readArgs } from './argv.js';` | survives | killed (census row) |
     | RV-C3 | `Reflect.apply(Reflect.get(argvNs, 'readArgv'), undefined, [rest, …])` | survives | killed (census row) |
     | RV-C4 | `argvNs['readArgv'](rest, …)` | survives | killed (census row) |
     | RV-C5 | `argvNs['read' + 'Argv'](rest, …)` | survives | **survives**: the named residual "a reference that never spells the name" |
     | RV-C6 | a new `extra-reader.mts` calling `readArgv` with its own spec | survives | **survives** (N3) |
     | RV-C7 | `void [rest].map(readArgv);` | survives | killed (census row) |
     | RV-C8 | `void readArgv?.(rest, …);` | killed (calls row) | killed (calls row) |
     | RV-C9 | `void readArgv.apply(undefined, [rest, …]);` | survives | killed (census row) |

   - **Mispredictions (base).** RV-T11 was predicted killed and survives: TypeScript's preprocessor reports a no-substitution template
     literal, so base reads `#dossier` as outside. RV-T14 and RV-T15 were predicted to survive and are killed by the entry row, whose
     `includes('polaris-dossier')` filter sees the path. That is why I added T14b and T15b.
   - **Predicate mutants of the new code, head only.** Each ran with `workspace-reach.test.ts`, `island-boundary.test.ts` and
     `subpath-imports.test.ts` (52 rows), or with `argv.test.ts` (81 rows):

     | id | mutation | outcome |
     |---|---|---|
     | RV-P1 | the absolute/`file:` branch returns `null` | killed, 4 rows |
     | RV-P2 | the `#` guard returns `null` | killed, 6 rows |
     | RV-P3 | `moduleIn` returns `null` for a target outside `./dist/` (`testkit.ts:46`) | **survives** (N1) |
     | RV-P4 | `moduleIn` returns `null` when `src/X.ts` is no file (`:48`) | **survives** (N1) |
     | RV-P5 | the `@syzygy` branch returns `null` when no one target (`:71`) | killed, 5 rows |
     | RV-P6 | the `#` branch drops `target.startsWith('../')` (`:62`) | **survives** (N1) |
     | RV-P7 | the agreement check's `targets.every(…)` becomes `true` (`:41`) | killed, 5 rows |
     | RV-P8 | `targetOf` drops `Array.isArray(entry)` (`:38`) | survives, **equivalent**: see below |
     | RV-P9 | the agreement check also compares `types` (`:39`) | killed, 8 rows, including both guards' tree rows |
     | RV-P10 | `typeof first === 'string'` dropped (`:41`) | killed, 1 row (nested conditions) |
     | RV-Q1 | the census allows `readArgv` anywhere inside a call (`argv.test.ts:173`) | **survives** (N1) |
     | RV-Q2 | the census allows a `readArgv` declaration in any module (`:171`) | **survives** (N1) |
     | RV-Q3 | `readArgvCallers` never adds the census (`:203`) | **survives** (N1) |

     RV-P8 is equivalent with respect to the guard's property. Without the guard, an array resolves only when every element is one
     string, and Node takes an array's first valid target, so the answer can never be a module Node would not load first. No row is
     needed.
   - **The rows I propose in N1, checked before proposing them** (`fix-head.json`):
     - The rows alone pass: "Tests  107 passed (107)".
     - Each kills one survivor, with "Tests  1 failed | 106 passed (107)": RV-P6, RV-P3, RV-P4, RV-Q1 and RV-Q2, on the row
       written for it.
3. **A faithful tree: the sweep, with denominators.** [Observed]
   - **Manifests.** `manifest_sweep.py`, from git objects at `1447b6bb` and again at the merge tree `60d362d4`, gives identical
     counts:
     - 10 workspace manifests (11 tracked `package.json` with the root); **0 declare `imports`**, the root included;
     - 15 `exports` entries: 3 strings, 12 condition objects;
     - **12 of 12 objects carry two runtime conditions, `import` and `default`, and all 12 name the same target**;
     - 0 arrays, 0 nested conditions, 0 `*` patterns, 0 `null`s, 0 non-object `exports`;
     - all 10 names match `@syzygy/*`;
     - 0 of 11 manifests have a dependency whose version starts with `file:`, `link:`, `npm:`, `workspace:`, `.`, `/`, `git` or
       `http`.
   - **Source modules.** `spec_sweep.mjs`, over every tracked `.ts/.mts/.cts/.tsx/.js/.mjs/.cjs/.jsx` at `1447b6bb`, from git
     objects:
     - 602 files (517 `.ts`, 85 `.mjs`);
     - TypeScript's preprocessor gives 2,972 specifiers, 2,608 of them in the 495 non-`docs` `apps|packages/*/src/**.ts` modules the
       walks and the differential read;
     - the only URL scheme is `node:` (1,134);
     - **0 of the 2,608 is a `#`, absolute or non-`node:` URL specifier**;
     - outside that population, 8 absolute specifiers sit in 8 `docs/evidence/argv-table-review-2026-10-25/type-probe/*.ts` files.
       They are type probes naming a `/tmp` clone, and no walk or census reads them.
     - A second method, a regex over the same texts, gives 3,126 matches. Its two hits inside the 495 are comment prose
       (`generation-mutation-run-main.ts:10`, `pwb-mutation-sweep.ts:15`), not specifiers.
     - The merge trees `60d362d4` and `e7e66f22` (§1 item 5) give the same 495 / 2,608 and the same 0. The PR's "a regex sweep finds none" is true of the
       specifiers; my looser regex also matched those two comments.
   - **Repeats.** `repeat-runs.json`, under load1 33.8–59.3:
     - **The four guard files, 5 of 5 runs:** "Tests  133 passed (133)", "Test Files  4 passed (4)".
     - **Both projects whole** (`@syzygy/polaris-dossier` and `@syzygy/polaris-generation-core`):
       - runs 1, 3, 4 and 5: "Tests  2132 passed | 1 skipped (2133)";
       - **run 2: "Tests  1 failed | 2131 passed | 1 skipped (2133)"**, at load1 44.7, failing
         `start-gates.test.ts > init: the clone holds the consented commit alone (syzygy-qkea.24) > refuses config naming a remote, a
         promisor, an include or a command the agent's git would…`.
       - Three more whole-project runs (`projects-extra-head.json`, load1 21.7–28.8) passed 3 of 3, so 7 of 8 whole-project runs
         passed.
     - **`start-gates.test.ts` alone:** 5 of 5 pass, "Tests  104 passed (104)" (`start-gates-head.json`). That test is the slowest in
       its file, 2,956 ms alone at load1 24.7 (`start-gates-durations.json`), and `vitest.config.ts` sets no `testTimeout`.
     - The file is outside the subject and imports neither the testkit nor anything changed. N5.
4. **The island walk, old against new.** [Observed]
   - **The lane's adapted `island_diff.py`** (`tools/lane_island_diff.py`, sha256 `131206846b06…`, byte-equal to the committed tool),
     in a clean clone at `aa331269`, gives `island-diff-lane.json`:
     - walks: **246/246 equal**; 20 entries with edges into the island; 0 with unresolved specifiers; `apps/syzygy/src/main.ts`
       reaches 137 modules with 0 into the island; the consent root reaches 32 with 11 into the island;
     - walk answers sha256: **`e297b289a9f722bdfe5840064f27e1454df131795eecb5b6c1546f30a1cae777`**;
     - resolves: **2,608/2,608 equal** over 495 files, `{"module": 1546, "null": 1062, "undefined": 0}`, answers sha256
       `7102ef1bdb999d6576e62f9c9b915cd11bfd01d286e662994ed5c5f511622834`. All of this is what the lane recorded.
   - **The #524 reviewer's original `island_diff.py`** (`tools/orig_island_diff.py`, sha256 `9a4f053ecd6d…`) gives
     `island-diff-orig.json`: 246/246 equal and head answers sha256 `e297b289…`.
     - As a differential at this head it is degenerate: both of its preludes import the tree's one testkit, which is why the lane
       adapted it.
     - Its value here is the head-side digest. It equals the #524 reviewer's own record of the 8.34 walk,
       `results/island-diff-all-entries.json` (base `3ec69299`, head `43ae35fe`, `answersSha256` `e297b289…`). So the walk answers
       over every non-test entry are unchanged from 8.34 to 8.36.
   - **The selftest, and my mutations of its input:**
     - The lane's `--selftest` (drop the `.js`→`.ts` candidate) gives 60/246 walks equal (**186 differ**) and 1,323/2,608 answers
       equal (**1,285 differ**), as recorded.
     - Variant `v-types` (`filter(() => true)`, so `types` is compared too) gives **118 walks and 259 answers differ**.
     - Variant `v-hash` (every `#` reads as outside again) gives 0 walks and 0 answers differ. That is right: the tree has no `#`
       specifier, so a mutation the tree cannot exercise must show no difference.
     - So the tool sees a real change and does not report one where none can occur. Outputs: `selftest-*.json`; the tools are
       `make_selftest_variants.py` and the two `island_diff_v-*.py`.
5. **The record, by script against the git objects.** [Observed] `tools/check_record.py` reads only `git show aa331269:…`, and
   `check-record.json` gives "problems": []:
   - **Specs.** 79 of 79 gathered reviewer specs equal their rows in the retained tools file each names in `from`, at `1447b6bb`.
   - **`reviewer-base.json`.** It ran at `a088f1ca`: 79 results, 81 of 81 `old` fragments occur exactly once at `a088f1ca`, and 7
     `create` paths are absent there.
   - **`reviewer-head.json`.** It ran at `1447b6bb`: 79 results, 81 of 81 fragments once, and 7 creates absent.
   - **`own-head.json`.** It ran at `1447b6bb`: 14 results, 14 of 14 fragments once.
   - **Outcomes.** Every outcome agrees with its exit code and failed rows, and every run is clean after.
   - **Tallies.** Base: killed 58, survives 21, error 0. Head: killed 66, survives 13, error 0. Own: killed 14 of 14.
   - **The split.** Weaker []; stronger: the nine the PR names; unchanged 70. The 13 head survivors are exactly the PR's list, and
     since none is weaker, each survived at base too.
   - **The lane's tools.** `record.py --check` gives "summary.json matches ; problems: 0", exit 0. `record.py --selftest` gives
     "selftest: 12/12 mutations make a check fail", exit 0. On "a spec whose fragment the tree lacks", the first problem it prints is
     the edits-differ check; the fragment-once check is reached too, by my checker above.
   - **Raw outputs.** The lane's handoff raws (`lane-a/b836/out/*.json`, `*.log`) hash to exactly the six committed
     `reviewer-*`/`own-head` files.
   - **Rules 6 and 11.** Every mutant result stores its edits (old/new) and its commit, and `summary.json` names its subject and the
     subject's digest.
6. **The PR body's claims, against the record and my runs.** [Observed] Each holds:
   - outcome and mechanism (§3 items 1–2);
   - "0 of the 10 workspace manifests declare `imports`" (item 3);
   - "246/246", "2,608/2,608", `e297b289…`, "1,546 modules, 1,062 outside the workspace and 0 unresolved", and "186 walks and 1,285
     answers differ" (item 4);
   - the mutant table and "base: 58 killed and 21 survive; head: 66 killed and 13 survive … 9 stronger … 70 unchanged" (item 5);
   - the own-mutant failed-row counts, from P1 "11 of 21" to Q4 "1": `own-head.json` gives P1 11, P2 2, P3 2, P3b 1, P4 5, P5 2, P6
     1, P7 4, P8 1, P9 1, Q1 2, Q2 1, Q3 1, Q4 1;
   - "133/133 in 5/5 runs, at load1 30.0–31.4. The slowest test took 0.48 s": its `repeat-runs.json` load1 is
     `[30.1, 30.0, 31.4, 31.2, 31.2]` and the slowest is 482.5 ms;
   - "105 titles at base and 133 at head, 28 added, 0 removed, 0 duplicated". My rerun of `titles.py` gives a `titles.json`
     byte-identical to the committed one, sha256 `b17c9e77d4bc…`;
   - "20 of 3,994 tracked files differ": `git ls-files | wc -l` gives 3994 at `aa331269`. The PR's `git diff --quiet … ':(exclude)…'`
     command exits 0, and `island-boundary.test.ts` and `subpath-imports.test.ts` are byte-unchanged (`git diff --quiet`, exit 0);
   - "[Observed] Node v24.6.0 took a `module-sync` target ahead of `import`": reproduced in `node-probe.jsonl`;
   - "Owner notice … still to post": `bd comments syzygy-bpyt.10` (read-only) holds 27 comments, none naming 8.36 or #528.
   - The battery line `commands=110 nonzero=0` is [Observed only in the lane's `battery.log`]; I did not rerun the battery.
7. **Node's own resolution of four forms** (`tools/node_probe.mjs`, Node v24.6.0, throwaway packages). [Observed]
   - `module-sync` ahead of `import` resolves to `sync.js`.
   - An `imports` target `../outside.js` gives `ERR_INVALID_PACKAGE_TARGET`.
   - An `imports` pattern `#pat/*` resolves.
   - A dependency alias `dossier` (a `node_modules` symlink to `packages/polaris-dossier`) resolves to
     `…/packages/polaris-dossier/dist/index.js`, the barrel.
   - [Observed] `packages/polaris-dossier/src/index.js` does not exist, so RV-T19's specifier names no file Node can load.
8. **The rest of the battery the brief asks for.** [Observed] All in a clean clone at `aa331269`:
   - `npm run typecheck` exits 0 (`typecheck.log`);
   - `python3 scripts/check_governance.py` gives "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0;
   - `python3 scripts/check_quotations.py` exits 0 (`check-quotations.log`).
   - The build emits `dist/workspace-reach.test.{js,d.ts}` and their maps, gitignored (`.gitignore:22: dist/`), as it does for the
     96 other test-named files already in that `dist/`. No `exports` entry reaches them.
9. **One incident of my own.** [Observed] A read-only `bd show` that I ran with the scratch clone as its working directory created an
   empty, untracked `.beads.gate.lock` there (04:51:44). My first head-side run of my own mutants then refused to start ("tree not
   clean before"). I deleted the file and reran from a clean tree. No result was taken from a dirty tree.

## 4. Findings

There is no blocking finding (no F). There are five notes.

### N1 — Seven of the new predicates have no killing row: six need one, the seventh is equivalent (low)

- **Evidence.** [Observed] §3 item 2. These mutants of the head code pass every row of the four guard files:
  - **RV-P6**, `workspace-reach.testkit.ts:62` without `|| target.startsWith('../')`. The row "reads a # alias whose target leaves
    its package as naming no module" (`workspace-reach.test.ts:52`, target `'../lib/dist/index.js'`) still passes. It passes for an
    incidental reason: joined to the importer's directory, the target names no file in the two-package workspace either way.
  - **RV-P3 and RV-P4**, `moduleIn` (`:46` and `:48`) returning `null` (outside) instead of `undefined`, for a target outside
    `./dist/` and for a `./dist/X.js` with no `src/X.ts`. These two predicates moved from the base's inline code into the function
    that the new `#` branch also uses. No row exercises either, so neither the PR's rows nor any tree row pins the sentinel.
  - **RV-Q1**, `argv.test.ts:173` reduced to `ts.isCallExpression(parent)`. No self row puts `readArgv` inside a call but not as its
    callee. My tree mutants RV-C3 (`Reflect.get(argvNs, 'readArgv')`) and RV-C7 (`[rest].map(readArgv)`) are killed by the head
    code, but nothing in CI would catch the conjunct being dropped.
  - **RV-Q2**, `:171` without `&& module === 'packages/polaris-dossier/src/argv.ts'`. No row declares a `readArgv` function
    elsewhere.
  - **RV-Q3**, `:203` without `unlifted.push(...unliftedOf(module, source))`. The tree row `readArgvCallers().unlifted` toEqual `[]`
    (`:220-222`) cannot tell "ran and found nothing" from "never ran". Only out-of-tree mutants (R-Y6, R-Y7) show the integration
    works.
  - RV-P8 (`Array.isArray` dropped) also survives, but it is equivalent for the guard's property (§3 item 2) and needs no row.
  - The PR's "Rule-6 mutant per predicate: 14 mutants of the new checks, each killed" is true of those 14. It is not the whole
    predicate set: GP-Q0 `:65` asks for "a rule-6 mutant for each predicate", and rule 6 says "per predicate".
- **Failure scenario.** A later tidy of the testkit or the census, such as 8.5's import tidying, which this bead precedes:
  - it collapses `moduleIn`'s two `undefined`s into the `null` of "outside";
  - or it simplifies the census callee test to `ts.isCallExpression(parent)`;
  - or it drops the `push` while restructuring `readArgvCallers`.
  
  CI stays green. Then a `#` alias or export to `./build/index.js` reads as outside and the walk stops there, or
  `arr.map(readArgv)` / `Reflect.apply(readArgv, …)` passes a spec the lift never sees.
- **Proposed fix.** These rows were checked in `fix-head.json`: they pass at head together ("Tests  107 passed (107)"), and each kills
  its survivor alone.
  - In `workspace-reach.test.ts`'s "reads a # alias %s as naming no module" table:
    - `['whose target leaves its package for a module that exists', { '#lib': '../../../packages/lib/src/index.js' },
      'apps/app/src/main.ts', '#lib']` kills RV-P6;
    - `['whose target is a module of its own package outside dist', { '#lib': './src/local.js' }, …]` kills RV-P3;
    - `['whose target names no source module', { '#lib': './dist/missing.js' }, …]` kills RV-P4.
  - In `argv.test.ts`'s census self rows:
    - `"import { readArgv } from './argv.js';\nvoid [[]].map(readArgv);"` → `['module.ts:2 [[]].map(readArgv)']` kills RV-Q1;
    - `"export function readArgv(): void {}"` → `['module.ts:1 export function readArgv(): void {}']` kills RV-Q2.
  - For RV-Q3, let `readArgvCallers` take its sources as an argument (defaulting to the tree), and add one self row. That row feeds
    it a two-module map holding an `argvNs.readArgv` and expects that reference in `unlifted`.
  - Record RV-P8 as equivalent in the dispositions.

### N2 — Unnamed residual: a workspace package imported under another name reads as outside the workspace (low)

- **Evidence.** [Observed]
  - RV-T18: `apps/syzygy/package.json` gains the dependency `"dossier": "file:../../packages/polaris-dossier"`, and `main.ts` gains
    `import 'dossier';`. The result is "Tests  27 passed (27)" at base and at head.
  - `workspace-reach.testkit.ts:65-66` still returns `null` for any bare specifier that is not `@syzygy/<name>…`.
  - Node v24.6.0 resolves such an alias to `packages/polaris-dossier/dist/index.js`, the barrel (`node-probe.jsonl`).
  - The #524 N1 named the general premise (`R-GP-IMPL-ARGV-GUARDS-1-RAW.md:245-246`): "returns `null` ("outside the workspace")
    for every specifier that is neither relative nor" / "`@syzygy/<name>…`". The bead's fix enumerates three forms (`#`, absolute, `file:`). The PR's residuals name loads with no
    import edge, census population, patterns and fallbacks, but not this form, which has an edge.
  - Today 0 of 11 manifests carry a `file:`, `link:`, `npm:` or `workspace:` dependency, and every workspace name is `@syzygy/*`
    (§3 item 3).
  - Related, and not a hidden reach: RV-T19 (`../../../node_modules/@syzygy/polaris-dossier/src/index.js` from an intermediate
    module) also passes at base and head. The relative branch, which the bead did not touch, follows the `node_modules` symlink to a
    path outside `packages/`, so "reaches this package…" does not match it. But `src/index.js` does not exist, so Node cannot load
    it. The `dist/` spelling of the same path is refused (it names no `src` module).
- **Failure scenario.** A later change adds a local alias dependency for a build or packaging reason and imports through it on the
  daemon path, or from a module the island walk reaches. The daemon then loads the whole dossier barrel, or the island, with both
  guards green.
- **Proposed fix.** Either:
  - in the testkit, return `undefined` for a bare specifier whose package name is a dependency declared with a `file:`, `link:`,
    `workspace:` or `npm:` version in any workspace manifest (more strictly: for any bare name no manifest declares), with one row
    per form; or
  - name the form in the residuals of the dispositions record and of 8.5's brief.

### N3 — The census and the lift skip `.mts`, `.cts` and `.tsx` modules, which the build compiles (low)

- **Evidence.** [Observed]
  - RV-C6: a new `packages/polaris-dossier/src/extra-reader.mts` calls `readArgv(args, { valued: ['--drift'], dashValue: 'take',
    repeat: 'last', positionals: true })`. It passes "Tests  81 passed (81)" at head and 74 of 74 at base.
  - The population filter `module.endsWith('.ts') && !module.endsWith('.test.ts')` (`argv.test.ts:187`) excludes it.
  - `packages/polaris-dossier/tsconfig.json` and `apps/syzygy/tsconfig.json` have `"include": ["src"]`, so such a module compiles
    and ships.
  - The PR's residual names the population ("the non-test `.ts` modules under `apps/*/src` and `packages/*/src`"), but not this
    consequence. It is pre-existing: the lift has always had the same population.
  - The walks fail closed on the import edge to such a module (RV-T8 and RV-T9 are killed). The census does not.
- **Failure scenario.** 8.5 or a later change moves a reader into an `.mts` module with its own unpinned spec. Its accepted and
  refused forms then change with CI green.
- **Proposed fix.** Widen the filter to `/\.[cm]?tsx?$/u`, excluding `/\.test\.[cm]?tsx?$/u`, and add an `.mts` self row; or state
  the consequence in the residuals.

### N4 — Process: the GP-Q0 owner notice for 8.36 is not yet posted (process)

- **Evidence.** [Observed] `bd comments syzygy-bpyt.10` (read-only): 27 comments, none naming 8.36 or #528. The PR says so itself.
- **Failure scenario.** The cycle report omits a class 1 and 4 mechanism change to the island guard.
- **Proposed fix.** At landing, post a notice to `syzygy-bpyt.10` naming:
  - classes 1, 4 and 6, with no endpoint removed;
  - no product byte;
  - the differential: 246/246 walks, answers `e297b289…` (as at 8.34), and 2,608/2,608 resolver answers;
  - the six named mutants killed, and 8.1's `island:R4` and 8.23's `consen:R4` now killed too;
  - the guard's refusals beyond the bead's literal condition list: every non-`types` condition (including `module-sync`, which Node
    24 takes first), plus `#` patterns, fallback arrays and non-`./dist/` targets. These are prospective, and 0 answers change today;
  - the residuals: R-X8's no-edge loads, concatenated names, and N2 and N3 here.

### N5 — Outside the subject: `start-gates.test.ts:482` failed once in 8 whole-project runs under load (low)

- **Evidence.** [Observed] §3 item 3.
  - It failed once, in run 2 of 5, at load1 44.7. It passed in the other 7 whole-project runs, and in 5 of 5 runs alone.
  - It is the slowest test in its file: 2,956 ms alone at load1 24.7. It runs 16 clone-and-init cases in one test, and
    `vitest.config.ts` sets no `testTimeout`.
  - [Unknown] The failure message: my repeat tool kept only the FAIL row. [Inferred] The 5 s default timeout.
  - The file is not in the subject and does not import anything the subject changes.
  - #520, now on main, sized explicit timeouts for two test files only, `launched.test.ts` and `package-reader.test.ts`. It does
    not touch `start-gates.test.ts` (`git diff --name-only 9b539e5f ef467d4a`, §1 item 5).
- **Failure scenario.** CI on a loaded runner goes red for no defect (test-rigor bar 6).
- **Proposed fix.** File a bead: capture the message under load, then give that test an explicit timeout or split its 16 cases into
  an `it.each`.

## 5. Every changed output, or the evidence that there is none

None. [Observed]
- **No product byte changes.** The 20 changed paths are three test files (`argv.test.ts`, `workspace-reach.test.ts`,
  `workspace-reach.testkit.ts`) and 17 evidence files. The PR's `git diff --quiet a088f1ca aa331269 -- . ':(exclude)…'` exits 0. No
  `package.json`, no `exports` entry and no non-test module changes. Only tests import the testkit (3 importers).
- **The guards' answers on today's tree are byte-equal old against new:**
  - 246/246 walks, digest `e297b289…`, equal to the #524 record;
  - 2,608/2,608 resolver answers, digest `7102ef1b…`;
  - the same population on the merge tree with main (§3 item 3).
- **The two guard test files are byte-unchanged.** No existing test title or body changed: 0 removed, 0 duplicated. In
  `argv.test.ts`, the only removed lines are `readArgvCallers`'s signature and its `return`.
- **Build output.** The only build-output difference is the gitignored `dist/` emission for the new test file and the changed testkit
  (§3 item 8), which no `exports` entry reaches.
- **The dossier golden** was not rerun. With no product byte changed, it is equal by construction. [Inferred]

## 6. Verdict per acceptance criterion

- **AC1: met.** [Observed]
  - R-X6, R-X6b, R-X9 and R-X6i survive at base and are killed at head (§3 item 1).
  - Each is recorded with its old/new fragments (`edits`), its commit (`head`) and the subject digest (`summary.json`
    `subject.sha256`, which equals `git diff a088f1ca 1447b6bb`).
  - The island walk's answers over every non-test workspace entry are unchanged (246/246; the original tool's head digest equals the
    #524 record).
- **AC2: met.** [Observed] R-Y6 and R-Y7 are killed at head. N2 is not moot, because 8.5 has not landed.
- **AC3: met, except the owner notice, which is a landing action (N4).**
  - No product byte changes (§5).
  - Titles are unchanged: 105 → 133, 0 removed.
  - The PR states "Tests: +28 ~0 -0" and classes 1, 4 and 6.
  - This is the independent review.

## 7. Test quality

Against the test-rigor bar:
- **Bar 1 (behavior), met.** The 21 `workspace-reach.test.ts` rows assert `resolveIn`'s return value, the observable sentinel
  (module, `null` or `undefined`), over a two-package workspace the test writes, plus five answers over the real tree. The census rows
  assert the exact references found.
- **Bar 2 (regression), met.** The rows fail on the pre-fix logic: the lane's P4 (8.34's `import ?? default`) fails 5 rows, and P1
  (`#` read as outside) fails 11. The tree-level regressions are the six named mutants.
- **Bar 3 (edge paths), mostly met.** Gaps:
  - the `../`, outside-`./dist/` and missing-file paths of the `#` branch (N1);
  - the call-argument and foreign-declaration paths of the census (N1);
  - no row for an `exports` or `imports` fallback array or a `*` pattern, though both are refused. The PR states this as a residual,
    and RV-T6 and RV-T7 show the walks refuse both at head.
- **Bar 4 (no tautologies), met.** Expected values are literal paths and literal census strings. `BARREL` is a literal constant, and
  `join(ROOT, BARREL)` builds an input, not an expected value.
- **Bar 6 (deterministic), met for the subject.** The four guard files passed 5 of 5 under load1 33.8–46.0. One whole-project flake
  falls outside the subject (N5).
- **Bar 7 (names), met.** Titles state behavior ("reads a # alias whose target is another alias as naming no module"). The
  `%s`-titled rows keep machine paths out of the titles, so the titles are stable across checkouts.
- **Bar 8 (maintained code), met.** One `workspace()` helper builds every synthetic workspace, and `resolveIn` takes the workspace as
  data, which is what makes those rows possible without touching the tree.
- **Bar 10 (growth), met.** +28 rows, adds-only. Bar 10 makes adds-only growth a finding "in a mature area". This area is not mature
  [Observed, `git log --diff-filter=A`]:
  - `island-boundary.test.ts` was added 2026-10-22 (`c61d8b7f`), and so was `subpath-imports.test.ts` (`78853844`);
  - `argv.test.ts` was added 2026-10-24 (`adc57243`);
  - the testkit was added 2026-10-25 (`2b39c5d8`).

  The nearest existing tests are the two guards' tree rows, and those assert walk outcomes over the real tree, which holds none of
  the forms. Extending them could not pin a form. Each new row maps to a form the bead names or to a sentinel, and the bead asks for
  "one row per form". One row is weaker than its title: the `../` row passes for a reason other than its predicate (N1).

## 8. Cleanup

- **Deleted.** The scratch clones `rev-528/base` (at `a088f1ca`), `rev-528/clone` and `rev-528/d` (both at `aa331269`), the Node
  probe directory `rev-528/probe`, and every private TMPDIR (`/tmp/r528-b`, `/tmp/r528-h`, `/tmp/r528-d`, `/tmp/r528-qx`,
  `/tmp/r528-qy`, `/tmp/r528-qz`). `ls -d /tmp/r528-*` finds none.
- **Not done.** I edited no worktree under `/home/tze/GitHub/syzygy/.worktrees/`, ran no `bd` mutation (only `bd show` and
  `bd comments`), pushed nothing, commented on nothing and merged nothing. One late `bd show` ran with the lane worktree as its
  working directory. `ls` afterwards shows that no `.beads.gate.lock` exists there; the only one is the main checkout's, dated
  Oct 8, which predates this review.
- **A conflict in the brief, disclosed.**
  - The brief's constraint line reads "Never open a real credential file: nothing under `~/.claude/`, `~/.config/` or any token
    store." Its reference 4 says "The test-rigor bar: `/home/tze/.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`. Read
    it and apply it."
  - [Inferred, from my working notes] Before compacting my context, I opened that one skill file as reference 4 directs. It is a
    skill text, not a credential.
  - After compaction I opened nothing under `~/.claude/`, and I re-anchored every test-rigor quote to the copy tracked in the
    repository (§2). The coordinator should resolve the conflict in later briefs.
- **Deleted as duplicates.** Five `.log` files that were byte-equal to their `.json` plus a newline (the island-diff and selftest
  runs).
- **Kept.** 58 files, none over 300 KB: the largest, `selftest-lane_island_diff.json`, is 201,073 bytes (`find -printf '%s'`). The paths below are relative to
  `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-528/`.

Results:

| sha256 | file |
|---|---|
| `43384dab7ea43c7f6cbea33b5d3f460149a737842f4272edad7abc11a4b32ddb` | `check-governance.log` |
| `e15ea08dc603f427665fa899aef5adcaca1bea8119176a394da15869bb83dde2` | `check-quotations.log` |
| `ef58a21d76e28895fdf984549d3ac53ebba73057a4856a6f51508b393d722411` | `check-record.json` |
| `21f368db8f99dea3d34e024158850c1691ac31d7dab735501ff344c9619bb6e0` | `fix-head.json` |
| `e9568e57657f82bbebdd274ac134b9bdf5cac7edcd3c1c98b5a7f7fee0dd8fd1` | `fix-head.log` |
| `03888ff443aa2bbd994fd4039533a1049b3db6ffc76011c4a2fdc7d3c98fa237` | `island-diff-lane.json` |
| `56f972d8f3ee972b4c65d8c962d6640849d82396684092e26144fbf04812753f` | `island-diff-orig.json` |
| `5f953fd8b6381f4175f0d2145332ad7c4532f76245cc7952f535375af76637d0` | `manifest-sweep-head.json` |
| `5887c813c40726b706ed7239606a1fbd746a9d492948e5937f23435fa99e6690` | `named-base.json` |
| `2e34a6b956ae2c14d30f6aa0f1829c47320494c40178d86a21729ea338f5d5f8` | `named-base.log` |
| `acd4e151cede663da60bb918e60c0e3def9f2aa77d21b977dedf4e68dd0a20d2` | `named-head.json` |
| `a704ce0688edfb8fba50efebdaf5087840034f666ba566221833b098cc85203d` | `named-head.log` |
| `90daebe47e18d94d611dfafaf2e169689f10f8399b9ba6916760e174f6b48040` | `node-probe.jsonl` |
| `85a6233ca4b883a450e2a405898625ff80c066dae39a1eea61babb42ee3c8a98` | `own-base.json` |
| `7bba310e726794e45e3e176bf25a72d534f90a8780326bf519f3b7861752e028` | `own-base.log` |
| `60edc9cbeb239b31e672b0a25dca6023a83f537d962526dbd0b2bef0f0967fac` | `own-extra-base.json` |
| `e2490c8261ab1cb4fb2462239c3a280fbb0ea3bd5af551ae91ce60ea844b344a` | `own-extra-base.log` |
| `a9d2d21344c1dfdf3e716cabdd05ac5b1120e1da5840f18e51bd94933a11bb04` | `own-extra-head.json` |
| `4c0156708049f7bae1f15b06180946e059a94c171910eb3d65c7787a354ee76e` | `own-extra-head.log` |
| `64786b0e89816066461430b76654e078648e3bb71b9cbf8a0cbfa72056ff971c` | `own-head.json` |
| `8c8e5ac07a27f08780a73bee93e7f345bdf3f5c60d52842861af66017b8b751a` | `own-head.log` |
| `a8bf56a7503d4a2b0bce31d14ce3e7546ac5d99fba52e7dfe4bc57f1bba0f6f1` | `projects-extra-head.json` |
| `0d55c9c70f8263c759b0abbba552f50aff0dc3c31ae2eeaae79f52c282a383fb` | `projects-extra-head.log` |
| `26d9779cf9ee38d1a5ec43cc2b10ad973f722e58e7502cd564572d77e5561d4e` | `repeat-runs.json` |
| `5d5a8f914d6eab064e20bb2044472e8604158a14cca3afb973955e54b483681d` | `repeat-runs.log` |
| `acddf52f55e3eca5ae0defce42ecc2e785a27302f0a92bfe12a65ddca5d933bf` | `selftest-island_diff_v-hash.json` |
| `b5680d0dad98d321db08d0bcfab2bf7d9009f78a36fc9dc57840a58a7a7fb02f` | `selftest-island_diff_v-types.json` |
| `30c9871d9c80ea43f8155d969b43cf53a58e1e43b719c5c42caf0e780edeb9a6` | `selftest-lane_island_diff.json` |
| `14ae15dcb6f12d55a9d8b87b6eabc44761965f5710955d6b7dd6ea4040b17e40` | `spec-sweep-head.json` |
| `68be2b807288823448675e88d053742adf018f2897b7d72b5c4e72bc7558a52b` | `spec-sweep-merge.json` (merge tree `60d362d4`) |
| `178810022ed151ad524531bb7b936a8e312607179c310e21199391f2fe170242` | `spec-sweep-merge-ef467d4a.json` (merge tree `e7e66f22`) |
| `5795ddbbe88260ea62d6e43b776e3b27abc9d834e9ce410049a43f03a615181d` | `start-gates-durations.json` |
| `a0b0691fefd47d0e47dba0f04c330490c631d06671c23bdd04d58ba621523b95` | `start-gates-head.json` |
| `b17c9e77d4bc8618c91b85c290695c3f080e34599e10fa52bd45ff1eeb15c235` | `titles.json` (byte-identical to the committed one) |
| `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` | `typecheck.log` |

Tools (`tools/`):

| sha256 | file |
|---|---|
| `fc5384c53c9d957ab31f38f167d7ad45bb34fe9b79b624d3ffa6782d4cdca424` | `tools/build_named.py` |
| `f0f888a72f9086ed1cd3d59f75340d0f5390bcffd20c1b30f1671914f9c81ad4` | `tools/check_record.py` |
| `86dc20d5102f482fba2313564feebb6c5dd9220a23fc88fe87165349bdd0c7a3` | `tools/fix-specs.json` |
| `3ab049429e513c4484086beb95f76a0b3eadf43311b14bf711be47008563eff9` | `tools/fix_specs.py` |
| `60f39876ff37ee30ccea1e4989b4369bc76d2c0d3655a5b35772cf66a60184f6` | `tools/island_diff_v-hash.py` |
| `3a86c34ec36ede00edfbda057e02098e07991354ac872b7533a9045f9f0f3ed8` | `tools/island_diff_v-types.py` |
| `131206846b062bc60ba7efeb67bf6ecf81802a54921d94979f2bc7428b8afc04` | `tools/lane_island_diff.py` (the lane's, unchanged) |
| `f93af94f73fc70a5e9de768b146cca579c73eb8663e3285d574c8ad7193697e5` | `tools/lane_titles.py` (the lane's, unchanged) |
| `73f760d9f31b871dd828fb9532435ed1430964bd156fc6791f13fa8885af0c6e` | `tools/make_selftest_variants.py` |
| `d0e16530c24dee263f44ea9040405b6003e684f86218be4e2bbfd433f72ab284` | `tools/manifest_sweep.py` |
| `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5` | `tools/mut.py` (the #524 reviewer's, unchanged) |
| `526dcd1348ac53ba763e5be5d9f545a18bc2a5cc5e76004a118f142d45f42b21` | `tools/named-specs.json` |
| `90abf942fa9e617d80eae984ab4f82b173392e383f9c214ae6e265038afe4d74` | `tools/node_probe.mjs` |
| `9a4f053ecd6dd3f383416d1b1da7f26d0d1d8f50a1e9460d776ee2fa15a8fc7c` | `tools/orig_island_diff.py` (the #524 reviewer's, unchanged) |
| `a8fc7243bbf873acfbab205db91e7a4ea9041cbe83c0a4dd80f0b0af75ab750d` | `tools/own-specs-base.json` |
| `e4caee282002a856d4335604745ce3424b9c11175869934a37dc118ff54832b0` | `tools/own-specs-extra-base.json` |
| `0e4d8ac07c857234f8948cf8405afd74324a7595852edaa278fad3c5b9186241` | `tools/own-specs-extra-head.json` |
| `6b6f159716a21d1c1b08e01a22b2701cbc41155bf1cbcacecf39f489066a5e09` | `tools/own-specs-head.json` |
| `841fa4c84329c6b6489ecc5ea47eaa699fe66f2ae3d222601bc62bb409dddc59` | `tools/own_specs.py` |
| `2155f16c8c0bc49fb9b17ed4cbbe6a6f0d8ba829d64c1b4710fc985c01fbffa5` | `tools/own_specs_extra.py` |
| `ff0894f4c3e9be5301e42133673709ae420b834b7eb558fd029f93e276f1effa` | `tools/repeat.py` |
| `6cfcb22d2a199aef38a1a079798931777be3b42170dea608ce6e1cca2ec9696e` | `tools/run_file.py` |
| `46f2dcd219d2ade02fc5d0b3347e77645c7d15a95e58baaffcdf1d0c82a5628d` | `tools/spec_sweep.mjs` |

That is 35 result files and 23 tool files, 58 in all. This raw is the 59th file in the directory, and is not listed.
