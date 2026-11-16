# Observer input gate and `packages/support`: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.6.15`
(pull request #540). The bead is a P1 regression from pull request #530, which
moved the shared `sha256` and `deepFreeze` into `packages/support/`. The POC's
observer input gate (`pocObserverInputsAreClean`,
`apps/three-surface-poc/src/git-observation.ts`) had no prefix for that
directory, so a dirty `packages/support/src/sha256.ts` read as clean. The PR
#535 review found it (`docs/reviews/R-GP-IMPL-HOST-PINS-1-RAW.md`, N9). The
change does three things:
- it adds `'packages/support/'` to the gate's prefixes;
- it adds a table row: for each of the six prefixes, `src/x.ts`,
  `package.json` and `tsconfig.json` each read as dirty;
- it adds a drift guard. The guard walks the daemon entry
  `apps/three-surface-poc/src/main.ts` with the shared `workspace-reach`
  testkit, and asserts that every reached module is refused, together with each
  reached package's `package.json` and `tsconfig.json`.

The lane's evidence is under `docs/evidence/syzygy-bpyt-6-15/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-OBSERVER-SUPPORT-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `6ef18990` | `r1-review.diff` sha256 `c6cd844feec49fb585f2235de362b18728020276ab690e5c432b6c55ffa6b393` |

The subject equals `git diff bb05df7e 6ef18990`: 27 files. Two are code
(`git-observation.ts` and `git-observation.test.ts`), and the rest are under
the lane's evidence directory. The code-only diff `git diff bb05df7e f207d758`
hashes to `a527579c89d53a6c38af519261fd4f6d918dbb1a27fdb9420db61dba3dd082fa`.

Main moved to `d38d7a3c` (#487) before the review, and the reviewer ran the
suite on a trial merge with it. At landing the branch took two merges of main:
`eb8fb6cb` (after #539), then `41932c3b` (after #533). [Observed] Main changed
346 paths from `bb05df7e` to `41932c3b`, and none of them is one of the PR's 27.
After each merge, `git diff origin/main HEAD | sha256sum` printed the subject
digest above. Hosted `checks` and `node` passed at
`6ef18990`. The battery ran on the landing commit (rule 7), and hosted CI on
the landing commit was checked before the merge.

The round found seven notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 3 and 4 are touched, and class 1 indirectly, by the reviewer's ruling
(raw section 2). The lane declared 1, 3 and 4.
- **Class 3.** The gate decides whether the evaluation snapshot's
  `observer:` component honestly names the code the daemon runs.
- **Class 4.** The protected inputs include the code that enforces consent and
  the P1 body-read authority gate, and the host's credential handling.
- **Class 1, indirectly.** The gate guards the integrity of the authority
  gate's bytes.
- **Classes 2, 5, 6 and 7: not touched.** No route, method or envelope changes.

GP-Q0's checks for classes 1, 3 and 4:
- **Differential.** Reproduced by the reviewer. Over 5,598 paths, exactly 9
  decisions differ, all under `packages/support/`, all accepted → refused, and
  refusals go from 319 to 328. The reviewer mutated the head gate three ways
  (D1 to D3), and each one fails the differential. Against the gate as it
  stood before #530 (`e5080f4d`), no decision on any path tracked then changes.
- **Rule-6 mutants.** The lane's 12 rows reproduce exactly. The reviewer added
  32 runs of their own: 15 killed and 17 surviving, every survivor named
  (raw section 6).
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing. It names both
  refusal arms (N4) and the landed surface version (N5).

**GP-Q0's stop clause** (`:95-96`) is not reached. The change is not
behaviour-preserving in Part 1's sense, and bead 6.15 is not in Part 3's table.
It is lawful as the coordinator's restoration ruling, whose premise the
reviewer confirmed in full (raw section 2):
- Before #530, the daemon closure was 103 modules in 4 packages, and 0 of its
  111 inputs lay outside the five prefixes of that time.
- #530 moved implementation lines out of 16 of the 18 closure modules it
  changed, all under a prefix of that time.
- The head gate decides every path tracked at `e5080f4d` exactly as the gate
  at `e5080f4d` does.

The reviewer also ruled that the daemon entry's import graph is the right
population for the guard (raw section 3.5). The daemon process loads 106
workspace modules in five packages, by Node's own loader and by esbuild. Those
modules contain no computed `import(`, no `createRequire` and no `require(`.
Deriving the population from `build:poc`'s list instead would have added
prefixes for `polaris-generation-core` and `polaris-generation-consent`, which
have never had one: that would be an unlisted tightening under the stop
clause. Whether to change the prefix list in either direction is the owner
question `syzygy-bpyt.1.16`.

## What changes for an operator

With any `packages/support/` path dirty, both arms of the gate now refuse, as
they did for a dirty hashing byte before #530 (N4, corrected here):
- **Startup** exits 1 and prints
  `syzygy POC: POC runtime inputs have uncommitted changes` on stderr
  (`poc-main.ts:154-157`, `startup-detail.ts:28`).
- **Re-observation** answers 502 "Re-observation unavailable", with
  `data-reobserve-reason="POC runtime inputs are dirty; re-observation was refused"`
  (`reobserve-action.ts:29-33`). The watch-mode console prints "Re-observation
  unavailable: Unknown — POC runtime inputs are dirty; re-observation was
  refused. The prior complete evaluation remains served." At base it answered
  200 "Re-observed".

The gate's decisions are Observed. The two responses are Inferred from the code
path, because no daemon was run against Butlers in the review. The PR body's
"No served byte changes" is not true for a dirty support path.

The POC surface version moves, because it is a digest over both source trees
(N5). The PR body names `polaris@3f91047d44cf`, which is the value at the PR
head, not on main. The owner notice gives the value computed on main after the
merge. No bound record carries any of these values.

## Notes

- **N1** (the guard follows only literal specifiers). A computed `import()` or
  a `createRequire` load of an unprefixed package passes it: the reviewer's E8
  and E9 survive. Today's tree has none of these forms: over 513 tracked source
  files under `apps/` and `packages/`, non-test files hold 0. A census row over
  the guard's reachable modules: `syzygy-bpyt.6.16` item 1.
- **N2** (the root build inputs are neither derived nor pinned). G3 and G4,
  which drop `package-lock.json` and `tsconfig.base.json` from `exactInputs`,
  survive at head and at base. Pre-existing. Deriving the `extends` chain and
  the root manifest and lockfile into the guard's inputs: `syzygy-bpyt.6.16` item
  2. It changes no gate decision, since these files are already refused.
- **N3** (no row pins the prefix boundary). `'packages/support'` without its
  trailing slash passes every test (G1), and so did `'packages/http-host'`
  before this PR (G6). It is equivalent on today's tree: 0 of 5,619 tracked
  paths sit under a sibling name of a prefix. A sibling-accepted row:
  `syzygy-bpyt.6.16` item 3.
- **N4** (the PR body's "Every changed output" omits re-observation).
  Corrected in the section above. The owner notice names both arms.
- **N5** (the landed surface version). Corrected in the section above. The
  owner notice gives the landed value.
- **N6** (the bead's rule-6 requirement is met in its import form). Restated
  here: a new import edge from the daemon entry's closure to an unprefixed
  workspace package must fail the guard, and it does. The killing mutants are
  O3, O4 and E1 to E7: static, type-only, re-export, transitive, subpath,
  relative, non-package and template dynamic edges. A manifest-only dependency
  with no import (E11) survives by design. The guard's population excludes
  packages named only by `build:poc` or by tsconfig `references`: today
  `cap1-daemon`, `polaris-generation-core` and `polaris-generation-consent`.
- **N7** (only out-of-suite evidence pins the guard's edge handling). A guard
  that drops type-only edges (T9) or dynamic edges (T10) survives in the suite.
  A fixture row over the guard's `specifiersOf`: `syzygy-bpyt.6.16` item 4.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/observer-support-review-2026-10-27/`, 62 files. The raw's
section 8 lists 72 kept files with their sha256. At landing a script checked
all 72 against the reviewer's directory: 72 matched, 0 failed, and no kept file
was unlisted. The retained 62 are copies of those, and the reviewer's copy of
the PR body is kept as `pr-body.txt`, with its bytes unchanged. Not retained,
though the raw quotes each one's result line (raw section 3): 10 files, namely
the three governance logs (`gov-base.txt`, `gov-head.txt`, `gov-merge.txt`),
the two quotation logs (`quot-head.txt`, `quot-merge.txt`), the two typecheck
logs and the three `npm ci` logs. A governance log quotes the retired phrases
it reports, so a tracked copy would fail CG-2a.

## Acceptance criteria (raw section 6)

- The restoration premise: **met**.
- The derivation: **met**. The daemon import graph is the right population,
  with N6 for the record.
- Rule 6 for the guard: **met** in its import form. The manifest-only form
  survives by design.
- The table row and the guard: **met**. V12, V14, V15 and O1 to O6 reproduce.
- The differential: **met**, and each of D1 to D3 fails it.
- The remaining divergence is unchanged: `cap1-daemon` is still refused, and
  no generation prefix is added.
- The record, checked against git objects: **met**.
- The PR body's claims: **met**, except "No served byte changes" (N4) and the
  surface version (N5), both corrected here.
- The full suite: host-load timeouts only, in files byte-identical to base,
  each passing alone. Hosted `node` passed. `Tests: +2 ~0 -0`.
