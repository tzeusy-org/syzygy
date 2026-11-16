# Fence-rule finding: review dispositions, rounds 1 and 2

[Observed] This record dispositions the two CC-REV-1 review rounds of
`syzygy-bpyt.6.3` stack 3 (pull request #533). The change carries the bead's
fourth acceptance criterion, "Fence-rule finding recorded (spec citation per
rule)":
- five one-line comments, one at each of the five Markdown fence readers, each
  naming that reader's rule;
- `apps/three-surface-poc/src/fence-rules.test.ts`, which pins what the
  readers do today, with `GAP` rows for the departures G1-G3;
- consent-reader pins in
  `packages/polaris-generation-consent/src/package-reader.test.ts`;
- one `AGENTS.md` bullet.

It fixes no departure. G1 (the CRLF reading) is ruled by the owner
(`syzygy-bpyt.1.14`) and fixed in `syzygy-bpyt.16`. G2 and G3 are the open owner
question `syzygy-bpyt.1.15`. The lane's evidence is under
`docs/evidence/syzygy-bpyt-6-3/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-FENCE-RULES-1-RAW.md` | `REVISE` | `9d9c98a6` | `r1-review.diff` sha256 `399413b4fe6d0226c12cd295661cb4971ab2348d22a0640d9fe3c1416ebc397f` |
| 2 | `docs/reviews/R-GP-IMPL-FENCE-RULES-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `815d93bb` | `r2-review.diff` sha256 `50d388a75a5339893ec2ae225b2833d6aafe18eec16e16ebedb2e25111bc246f` |

Round 2 was narrow. Its subject equals `git diff
af534d6eae36554b21fb386f6da8525fd8b3026b
815d93bb2315bf535ae4a7244eac2efd229fc025`: 18 files. `af534d6e` is the merge
of main `f7477f52` into round 1's reviewed head. Round 2 confirmed that it is
git's own merge, path for path. The whole PR, `git diff f7477f52 815d93bb`, is
32 files and hashes to
`93a98321d52803de6a0dba2a522555da5cec359f6b3ac19f7e1b2536b2b062ae`.

At landing the branch took two merges of main:
- `d38d7a3c`, before the landing commit. Round 2 had observed that none of the
  238 paths main changed since `f7477f52` is a PR path. [Observed] After this
  merge, `git diff origin/main HEAD | sha256sum` printed the whole-PR digest
  above.
- `eb8fb6cb` (#539), after it. #539 touched none of the PR's 32 paths.
  [Observed] After this merge, the diff from main over the PR's 32 paths
  printed the same digest. The only other paths that differ from main are
  this record, the two raws, the retained review evidence and
  `docs/README.md`.

Hosted `checks` and `node` passed at `815d93bb`. The battery ran on the final
landing commit (rule 7), and hosted CI on that commit was checked before the
merge.

Round 2 found round 1's two blocking findings repaired, and every routed note
repaired or routed. It added seven notes and no blocking finding. Under the
owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 3 and 4, by both reviewers' rulings (round 1 raw section 2; round 2
raw section 2):
- **Class 4.** The comment sits in the active-content gate's mask
  (`markdown-code-context.ts`), and the new test pins that gate.
- **Class 3.** `project-shape-extraction.ts` and `project-shape-manifest.ts`
  compose the observed shape.
- **Class 1.** `package-reader.ts` decides whether owner consent acts are in
  force.
- **Class 6: not touched.** Nothing is exported, renamed or added. The new
  tests use only exports that exist at `f7477f52`.

All five production edits are comments. Both rounds checked this by two
methods: the edits are emit-equal 5 of 5 and comment-only line by line 5 of 5.
The repair in round 2 changed no production file: the five blobs are equal at
`9d9c98a6`, `af534d6e`, `ba7fce36` and `815d93bb`.

GP-Q0's checks for classes 1, 3 and 4:
- **Differential.** The fence probe built at `f7477f52` and at `815d93bb` gives
  66 cases, with 0 differing, 0 of 8 inline rows differing and the consent
  function's text equal. Round 2 reproduced it.
- **Rule-6 mutants.** The lane's 26 record mutants: every one is killed by a
  committed test, and none by the probe alone. Round 2 re-ran all 26 from their
  `old`/`new` fragments (`"allAgree": true`). Round 1 added its own mutants and
  round 2 added 20 more: 14 against the readers and tests, and 6 against the
  new tool. Survivors are named under the notes below.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

GP-Q0's stop clause (`:95-96`) is not reached. No gate accepts or refuses
anything differently, because no production code changed. It will be reached
by any fix of G1-G3, which each `GAP` row is built to fail.

## Round 1: two blocking findings and eleven notes

| id | Round 1 asked | Round 2's reading at `815d93bb` | Disposition |
|---|---|---|---|
| F1 (blocking) | State G2 truly. The extractor's closer departures can drop declared items under a known denominator, which is not fail-closed. Pin an extraction row with items after such a fence | G2 restated in the record and the PR body. `GAP G2` (4 tests) pins the partial set with literal values. Round 1's reproducer still reproduces, as it must, since nothing is fixed | **Repaired** |
| F2 (blocking) | Add G3's multi-line-span and hide directions, correct its tab direction, and replace the PR body's cause for the span cases | G3 carries five directions. `GAP G3` (6 tests) pins them | **Repaired** (round 2 N5 adds evidence) |
| N1 | Restate G4's mechanism. Optionally commit both CRLF refusals | Restated. Two CRLF refusals are committed tests | **Repaired** (round 2 N4 on wording) |
| N2, N3, RV10 | The CRLF class and the bare-CR and mixed-terminator cases | Listed in the record's `notRepairedHere`. RV10 still survives, as routed | **Routed to `syzygy-bpyt.16`** |
| N4 | Kill K1 and K2 with a committed test, and add no export | Two public-reader tests. K1 and K2 each fail one test | **Repaired** |
| N5 | The `AGENTS.md` bullet's reach, and its reason clause | Bullet edited (`AGENTS.md:196-199`) | **Repaired** (round 2 N6 on status) |
| N6 | Rename "comment-only", or add a line-level check | Claim renamed "emit-equal (runtime-equal)". `line-level-check.mjs` added, with negative controls | **Repaired** (round 2 N1-N3 on the new tool) |
| N7 | A reason column on `CASES`, and a tab-indented renderer pin | `whole`/`wholeCrlf` on 33 rows, and the renderer pin. RV7 and RV11 are now killed | **Repaired** |
| N8 | Record rows: inline differing cases, named scratch commits, uncapped `failed` lists, a tracked expected output | All four | **Repaired** |
| N9 | "On the 25 fence-only cases" | Rewritten | **Repaired** |
| N10 | Drop the literal count | `toHaveLength(14)` removed | **Repaired** |
| N11 | The PR's GitHub base | #530 merged before round 2 | **Moot** |

Round 2 also checked that the restatement implies neither a fix nor a ruling.
The record's `decision` fields end "Not changed here; a fix flips the GAP G2
rows." and the same for G3. Every fix mutant flips the `GAP` rows of its own
direction and no others: FX1 to FX4, and the lane's E4, L5 and L6. Every
"worse" mutant is caught by a vector, inline or `GAP` row: WS1 to WS5.

## Round 2: seven notes

- **N1** (`line-level-check.mjs` and `comment-only.mjs` misread a range that
  holds a rename, then pass it). Both read `--name-status -z` two tokens at a
  time. The PR's own ranges hold no rename: round 2 counted the tokens over all
  five ranges. Follow-up: `syzygy-bpyt.29` item 1.
- **N2** (`line-level-check.mjs` run through a symlink or a path with a space
  does nothing and exits 0). Follow-up: `syzygy-bpyt.29` item 2.
- **N3** (the tool's selftest does not pin each predicate). T2, T3, T4 and T6
  survive "12 of 12". The tool's result over the PR's range stands on the
  emit-equal method too. Follow-up: `syzygy-bpyt.29` item 3.
- **N4** (two sentences say the consent pins cover more than they do).
  `fence-rules.test.ts:9` says the CR-blindness is pinned, and KC3 survives.
  The PR body's and the record's "those checks" include the heading check, and
  KC4 survives it. KC4 opens nothing: a CRLF egress instance is still refused.
  Corrected here: the committed tests pin the title and table checks' refusal
  of CRLF records, not the heading check and not the mechanism. The test
  comment is reworded in `syzygy-bpyt.29` item 4.
- **N5** (for the `syzygy-bpyt.1.15` owner packet). G3's manifest-level
  `[Unknown]` can be stated as Observed. A hidden link leaves the pillar
  `"state": "discovered"` with `"namedSources": 1` and `"ignoredLinks": []`, so
  the manifest reports the shrunk population as complete. The fixture is
  `docs/evidence/fence-rules-review-2026-10-27/r2/g3-manifest-probe.json`, and
  the note is carried to the decision bead as a comment. `[Unknown]` remains
  only for consumers beyond the manifest.
- **N6** (the `AGENTS.md` bullet restates bead status it does not own).
  `AGENTS.md:198-199` says G1 is ruled and fixed in `syzygy-bpyt.16`, and that
  G2 and G3 are open owner questions. Both go false on events outside this PR.
  Routed: `syzygy-bpyt.16`, and whichever bead implements the
  `syzygy-bpyt.1.15` ruling, edit that bullet when they land. Both beads carry
  a comment saying so.
- **N7** (four wording slips, none in a figure). Corrected here:
  - (a) The record's `roundOneRepair.items[N5].what`
    (`dc3-fence-rules-2026-10-25.json:4047`) says the bullet "pins four of the
    gaps". It means four of the five readers.
  - (b) The PR body pairs the two tracked probe outputs' digests with the
    wrong commits. The first digest it lists is the head output's
    (`7e58cd1f`), and the second the base output's (`fe3855a1`). Round 2's
    section 3, item 8, gives both.
  - (c) The PR body names main as `bb05df7e`. At landing it was `d38d7a3c`.
  - (d) `fence-rules.test.ts:195-196` says "two rows". The describe holds three
    non-control rows, and they flip separately. Reworded in `syzygy-bpyt.29`
    item 5.

  The PR body's landing note repeats (b) and (c).

## Retained review evidence

Both reviewers' tools and results are kept under
`docs/evidence/fence-rules-review-2026-10-27/`, 98 files:
- `r1/` (35 files): round 1's tools and results;
- `r2/` (63 files): round 2's tools and results.

Each round's copy of the PR body as that reviewer read it is kept as
`pr533-body.txt`. The reviewer saved it as `pr533-body.md`, and its bytes are
unchanged.

At landing a script checked every kept file against the sha256 its raw lists
in its cleanup section: round 1 38 of 38, and round 2 72 of 72, with no kept
file unlisted. The retained files are copies of those. Not retained, though
each raw quotes the result line of each:
- round 1's governance, quotation and typecheck logs (3 files);
- round 2's two governance logs, two quotation logs, two typecheck logs and
  three `npm ci` logs (9 files).

## Acceptance criterion 4 of `syzygy-bpyt.6.3`

**Met** for stack 3. Each of the five readers has a stated rule. Each has a
quoted governing clause or a verified "none states the rule". The pins and the
probe reproduce. G2 and G3 now state their reach truly, including that each
can report a partial set as complete.

The bead stays open for stack 2 (pull request #534, `decodeUtf8` and the
canonical JSON record). `Tests: +15 ~34 -0` for the repair. Round 2 ran the
full suite with raised timeouts at `815d93bb` ("Tests  5418 passed | 5 skipped
(5423)") and on a local merge with `d38d7a3c` ("Tests  5435 passed | 5 skipped
(5440)"). Every default-timeout failure was a timeout in a file the PR does not
touch, and each passed when rerun.
