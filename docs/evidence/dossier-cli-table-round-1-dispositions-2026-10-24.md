# Dossier CLI table: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.2`
(pull request #518). The change does four things:
- One `node:util` `parseArgs` wrapper, `readArgv` in
  `packages/polaris-dossier/src/argv.ts`, replaces three hand-written argv
  loops: the daemon's `parseCli`, the dossier `parseOptions` and
  `syzygy polaris`'s `parseArgs`. Each caller passes its old policy as data.
- One command table, `DOSSIER_COMMANDS`, and one context builder replace the
  15-command if-chain in `cli.ts`.
- One `Outcome<R, F>` type replaces 17 result unions.
- The daemon imports the state directory's `resolvePathIntent` instead of
  keeping its own copy, through two new subpath exports, `./argv` and
  `./state-directory`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-DOSSIER-CLI-TABLE-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `c2ae58e4` | `r1-review.diff` sha256 `02f6c462fa9cf401341fd376caa54bd516a23ec04b1f31bb035964486b89770f` |

The subject equals `git diff ce322e1a65b784c6304d51b05fb347351912a926
c2ae58e4cbf39a90717a1e051292258c6baaa619`. At landing the branch took one
merge of main `19c80e90` (#509 and #517). [Observed] No file that main
changed between `ce322e1a` and `19c80e90` is in the subject. After the merge,
`git diff origin/main HEAD | sha256sum` printed the same digest as the subject.

The reviewer found "There is no blocking finding (no F)." (section 4), with
eight notes. Under the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/dossier-cli-table-review-2026-10-24/`, 49 files:
- `tools/` (12 files): the argv corpus generator, the TypeScript-AST lifter,
  the parse, dossier and built-entry harnesses, the `resolvePathIntent`
  census, the two sweeps, the committed-suite mutant runner and the resolve
  hooks;
- `corpus/` (3 files): the reviewer's daemon, polaris and dossier argv corpora;
- `mutants/` (4 files): the M1, M2, GM1 and GM3 specs, each with its `old`
  and `new` fragment;
- `results/` (30 files): every result file and log the raw quotes, except
  the ten below.

Not retained:
- the three dossier in-process outputs, `dossier-base.jsonl`,
  `dossier-head.jsonl` and `dossier-head-node22.jsonl`, 13,749,135 bytes each.
  All three hash to sha256
  `54983601a3d783ee442719858e6e1d5fecad9f6589c170d71969b7a4e1a4762b`, which is
  the raw's "0 differ" over 1,696 rows. They are re-derived by
  `tools/dossier_run.mjs` over `corpus/dossier.json`;
- the two `check_governance` transcripts, which name the reviewer's scratch
  paths, and the `npm ci`, build and typecheck logs. The raw quotes the
  result line of each (section 3).

## Class

Classes 1 and 6, by the reviewer's ruling (section 2). The PR declared "none in
the code; class 1 possible". The reviewer's reasons:
- **Class 1.** `governedPlaneViolation` (`apps/syzygy/src/main.ts:140-163`) is
  the daemon's RTF-1 write-universe containment. The change replaces the
  function it decides with.
- **Class 6.** The `syzygy`, `syzygy dossier` and `syzygy polaris` argv
  surface is re-implemented, with no endpoint removed.
- Classes 2, 3, 4, 5 and 7 are not touched.

GP-Q0's three class-1 checks:
- **Differential: met.** Base against head, 0 rows differ over each of these:
  - the reviewer's 1,696 dossier argv, on Node 24 and Node 22;
  - 1,450 lifted parse rows;
  - the lane's 1,026 parse rows;
  - 510 built-entry runs, 16 of them RTF-1 containment cases;
  - 376 census paths, on `resolved`, `realPath`, `reason` and `detail`.

  The inputs are mutated paths and argv. No prose record is read by this code,
  so "records with altered prose" has no literal counterpart.
- **A rule-6 mutant per predicate: met for `resolvePathIntent`.** 12 of the
  lane's 13 mutants are killed, and P7 is argued equivalent, which the
  reviewer finds sound. The reviewer's M1 and M2 are killed. For the argv
  reader, see N1.
- **Owner notice:** posted on `syzygy-bpyt.10` at landing (N7).

The stop clause is not triggered: no accepted or refused argv form, path or
exit code changes on any corpus the reviewer ran.

## N1: six of the ten argv-reader predicates are pinned only by the evidence goldens

[Observed by the reviewer] R1, R2b, R3, R7, R8 and R10 leave all 591
`runDossierCli` tests and all 15 daemon-entry system tests green. Only the
goldens under `docs/evidence/syzygy-bpyt-8-2/` kill them, and no CI step runs
those goldens. `syzygy polaris`'s `parseArgs` has no committed test.

**Disposition:** filed as `syzygy-bpyt.8.32` (P2), a literal `argv.test.ts`
table per caller policy that kills R1–R10. It is a precondition of
`syzygy-bpyt.8.5`, which moves `argv.ts`, and is recorded as that bead's
dependency.

## N2: the subpath guard misses an export-from and a `createRequire`

[Observed by the reviewer] GM1, a static `export … from
'@syzygy/polaris-dossier'` in `main.ts`, and GM3, a `createRequire` call in
`argv.ts`, both pass `subpath-imports.test.ts`. Under GM1 the daemon's `--help`
path loads 147 modules instead of 38.

**Disposition:** in `syzygy-bpyt.8.32`, with GM1 and GM3 as recorded mutants.

## N3: the daemon-entry system test hangs on an admitted argv

[Observed by the reviewer] Under R5 and R9 the test's `spawnSync` waits on a
daemon that never exits, and the mutant daemon binds 127.0.0.1:7477. The file is
outside this PR.

**Disposition:** filed as `syzygy-bpyt.4.22`: a `spawnSync` timeout and
`SYZYGY_PORT: '0'` in the test's environment.

## N4: `ReviewPacketResult` is wider under `Outcome`

[Observed by the reviewer] At base it had two `ok: true` variants. At the head
it has one, whose `report` is a union, so the new type is strictly wider. No
consumer depends on the difference, and the emitted JavaScript is identical.

**Correction:** the PR body's "The step result types … are structurally the
same types" has an exception the reviewer found: `ReviewPacketResult` is now a
supertype of its old form. Whether to restore the pairing is in
`syzygy-bpyt.8.32`.

## N5: `readArgv` cannot read a single-dash valued option

[Observed by the reviewer] `argv.ts:42` keys options by `name.slice(2)`. No
current caller declares a single-dash valued or boolean name.

**Disposition:** in `syzygy-bpyt.8.32`, as a programming-error guard or a
documented constraint.

## N6: hand-written argv reads that are not loops

[Observed by the reviewer] AC1, "no hand-rolled argv loop", holds. These sites
read argv by hand without a loop, and the lane's sweep did not report them:
- `broker-client.ts:13-15`;
- `broker.ts:25` and `:35`;
- `cli.ts:437`, `:440` and `:442`.

**Correction:** the AC1 statement's "3 hits at head" counts loops only, and the
sites above are the rest of the hand-written argv handling. The broker rules
must keep agreeing with `runDossierCli`'s reading. That is posted on
`syzygy-bpyt.8.5`, which moves `argv.ts`.

## N7: the classes and the owner notice

**Disposition:** the classes are recorded above. The owner notice is posted on
`syzygy-bpyt.10` at landing.

## N8: the new EACCES row fails under root

[Observed by the reviewer] `state-directory.test.ts:119-129` relies on
`chmod 0o000` blocking `lstat`. CI runs as a non-root user.

**Disposition:** in `syzygy-bpyt.8.32`, with the repository's `isRoot` skip
idiom.

## The coordinator's ruling on `cli.test.ts:124`

The reviewer agrees with the coordinator's ratification (section 6, AC2). The
test pins the population that its own no-network sweep runs over, so a new
source file is added there.

## Acceptance criteria (raw section 6)

- AC1 met. `readArgv` is the one reader and `DOSSIER_COMMANDS` the one table.
  The lane's sweep reproduces, and the reviewer's own sweep finds no argv loop
  (N6).
- AC2 met. Every CLI test passes, and `cli-table.test.ts` enumerates all 15
  synopses as literals.
- AC3 met. The goldens differ on 0 rows, and the reviewer's independent
  corpora and built-entry runs differ on 0.
