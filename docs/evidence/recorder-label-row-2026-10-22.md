# The recorder label row, read once (syzygy-bpyt.8.21)

Evidence report, not authority. It records why the consent gate's recorder
templates now read their `| "{label}" | "{description}" |` row in one pass,
why no verdict and no captured value changes below the engine's
backtrack-stack limit, and what was run to check that. CC-REV-1 class 4
(availability on the consent gate), under GP-Q0 part 1 of
`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`.
It answers notes N1 and N2 of
`docs/reviews/R-GP-IMPL-RECORDER-LINE-SLOT-1-RAW.md` (the syzygy-bpyt.8.17
review).

## The change

The one production change is in
`packages/polaris-generation-consent/src/recorder-template.ts`; the rest
is tests, two measuring scripts and these records. `recorderTemplate`
compiles a template into one anchored regular
expression: literal text, a named group per slot, and a `\k<name>`
backreference where the template repeats a slot. A pair of slots
`{x}B{y}` now compiles differently when all four of these hold
(`lineReadOnce`):

1. x and y both take `SLOT.line`;
2. neither occurs anywhere else in the template;
3. B, the literal between them, holds no CR or LF;
4. the literal after y holds an LF, or ends the template.

TAIL is that literal up to and including its first LF, or all of it
followed by the end of input. The pair then compiles to

    (?=[^\r\n]*TAIL)(?=(?<x>LINE)B(?<y>LINE)TAIL)\k<x>B\k<y>

in place of `(?<x>LINE)B(?<y>LINE)`, where LINE is `SLOT.line`.

[Observed] The pair occurs once in each of 7 of the 8 templates the
consent and dossier packages export. In every case it is the label row:

- the five local-agent sitting acts (D9, RFC7-20, the Redis no-evidence
  drawer, and the Anthropic and OpenAI statements);
- the provider statement version 2 act;
- version 1 of that statement, as version 2's form reads past it.

The timing records find these 7 by rendering every exported template with
marker values (`templates.withRowKeys`). The eighth template, the
local-agent source-acquisition sign-off, has one slot per line, so none of
its slots qualifies. `package-reader.ts` and `gate-sources.ts` are not
touched. No rendered byte or wire format changes. Below the engine's
backtrack-stack limit no verdict changes; at that limit the reads differ
(see "Why the answers cannot change below the engine's limit").

[Observed] Before the change, a sitting-form record that failed after a
label holding `" | "` k times cost about k times its line. The 8.17
reviewer measured such reads at about 104 KB, failing at the last byte,
at 1-minute load 23 to 29:

- 16,079 ms for the provider statement version 2 act;
- 17,449 ms for D9.

That is the old `recorder-template.ts` this change replaces: the same
bytes as at main `9a30237e`.

After the change, a failing read of that row at about 124 KB takes at
most 7.34 ms of CPU time. That covers the last byte changed, the closing
mark changed, or a CR in the description, over two runs at 1-minute load
55.8 to 93.0 (acceptance 1, below). Its wall time is under 160 ms in all
but one of 126 samples at that load. The worst sample is 316 ms at load
57.4, with 4.84 ms of CPU.

[Inferred] So the old read costs about two thousand times the new one, or
more: 16 to 17 s of wall time at load 23 to 29, against under 8 ms of CPU
time. The two figures are not the same measure, and the old one was taken
at a lower load.

In the timing runs below, every old read of a 124 KB failing record was
still running at its 60 s cap. Those samples are recorded as capped, and
no ratio is taken from a cap.

## Why the answers cannot change below the engine's limit

The argument is written beside `lineReadOnce` in the source, so that a
reader can check it without this page.

Fix where x starts. Three facts follow:

- **y always ends at the same offset.** y holds no line break, and TAIL
  ends at the line's LF or at the end of input. So whatever the split, y
  ends at that same offset, and the template after the line starts there.
- **What follows does not depend on the split.** That template never names
  x or y.
- **The plain read keeps the first split that reaches TAIL.** It tries the
  splits in order, the longest x first, and keeps the first one the rest
  of the template accepts. When the rest matches, that is the first split
  to reach TAIL. When it does not, no split is kept, and the regex
  backtracks into the slots before x.

ECMAScript lookaheads keep the first way they match, never backtrack into
it, and keep their captures. ECMA-262 2025, 22.2.2.4 (Runtime Semantics:
CompileAssertion), note 3: "there is no backtracking into a (?= form". The
note shows this with `/(?=(a+))/` and `/(?=(a+))a*b\1/`, whose capture
inside the lookahead is read by the backreference.

So the second lookahead keeps that same first split, and the
backreferences consume exactly its text. A failure after the line
backtracks into the slots before x, as before.

The first lookahead holds for any text the line matches, because x, B and
y hold no CR or LF. So it refuses nothing the plain read accepts.

Below the engine's backtrack-stack limit, the two reads therefore accept
the same records and capture the same values in every slot.

[Inferred] That is an argument over the regex structure, not a
measurement. The checks below test it.

At that limit they differ, by the round-1 review's measurement
(docs/reviews/R-GP-IMPL-RECORDER-LABEL-ROW-1-RAW.md §3.7, finding F1)
[Observed, by the reviewer]. In a band of label lengths at that limit, a
well-formed record throws `RangeError: Maximum call stack size exceeded`
from `RegExp.exec` in the old read, and reads in the new one. On Node
v24.6.0, each of the 7 row templates has such a band, and its place
depends on the template. With round 1's marker values it is
8,388,232–8,388,442 characters of label on six of them, D9 among them,
and 8,388,118–8,388,338 on the provider statement version 2 act
(R-GP-IMPL-RECORDER-LABEL-ROW-2 §3.4) [Observed, by the round-2
reviewer]. Through the gate,
`readDigestBoundActState` over the real D9 record with an 8,388,100- or
8,388,200-character label throws in `9a30237e` and returns `ok` in
`8b143272`. That band is with the owner (the 2026-10-22 packet, the item
for syzygy-bpyt.8.21). Above about 8.39 MB both reads throw; that
pre-existing crash is syzygy-bpyt.8.29.

## Why it is linear

[Inferred] The first lookahead settles in one pass whether the line ends
with TAIL. If it does, the second lookahead tries the ends of x from the
right, each followed by B. A y fails only when no non-space lies between
its B and TAIL.

A B that holds a non-space, as `" | "` does, can be followed by such a
blank only in three places:

- when it starts within its own length of the line's last non-space
  before TAIL;
- when it starts within its own length of TAIL;
- when it starts inside TAIL.

So at most twice B's length plus TAIL's of the y's fail, and each scans at
most the rest of the line.

Below the engine's limit, a B made only of spaces (`{a} {b}`) keeps the
same answers, but without that bound. No recorder template has one.

## What was run

The host is shared with other lanes and has 12 cores. Its 1-minute load
average stayed between about 35 and 130 throughout this work, and no idle
window came. Every time below is wall time under that load unless it is
marked as CPU time.

### Same answers: the tests

The new tests are in
`packages/polaris-generation-consent/src/recorder-template.test.ts`, under
`a line of two line slots, read once (syzygy-bpyt.8.21)`. Each compares the
new read with the plain one, which the test writes out itself. It compares
the raw slots, and `templateFields`, which keeps slots only when they
render back to the text. The plain read, the oracle, is written out in
the test; the test imports `SLOT`, `recorderTemplate` and `templateFields`
from the module under test.

- **Literal cases.** The expected values are hard-coded literals:
  - a label holding the separator once and twice (the longest label
    wins);
  - a blank description, which moves the split left;
  - slots that start with a space or an ideographic space;
  - blank, space-only and CR-holding slots, and a row with no closing
    mark, all refused.
- **Exhaustive rows.** Each row is read on a line followed by more
  template, and as the last line:
  - every row of up to seven characters drawn from a non-space, a space,
    `"`, `|`, CR and LF: 335,923 rows;
  - every row of up to six tokens drawn from a non-space, a space, CR, LF,
    the separator `" | "` and the closing mark `" |`: 55,987 rows.

  These run as 14 tests of at most 55,987 rows each. A further test checks
  that the parts sum to those two totals.
- **Random templates.** Ten templates, 3,000 seeded records each, half of
  them edited once or twice. Each template must yield more than 100 records
  read and more than 100 refused.
  - Read once: the row then a repeated earlier slot; the row as the last
    line; a slot before the pair; a slot after it, which pairs with the
    second.
  - Not read once: a repeated label; a repeated description; a date beside
    a line slot; a slot whose pattern admits breaks; slots split by an LF;
    slots split by a CR.

[Observed] All pass. Each of these tests has an explicit 30 s timeout, so
none can be one of syzygy-bpyt.4.13's 5 s timeouts. Their run times, from
vitest's JSON reporter:

| Run | 1-minute load | Slowest test |
|---|---|---|
| before the split, `a9f3364a` | 61.1 to 77.0 | the six-token rows, 2,303 ms; the random templates, 2,018 ms |
| after the split, `de01d484` | 93.8 at the end | the seven-character rows starting `x`, 737 ms; every random-template part 92 ms or less |

The first run took over 2 s at load. That is the coordinator's threshold
for splitting, so the tests were split into the parts above. No idle run
was possible (see the host note above).

### The timing-bounded tests

The real templates live in the dossier package, which the consent tests
cannot import. So the real-template test is its own file,
`packages/polaris-dossier/src/gate-label-row.test.ts`.

- **Each of the 7 templates.** The record its real recorder renders, with
  the label replaced by `q" | "` 20,000 times then `z` (more than 120 KB),
  must read back. Three failing forms must each be refused inside a
  1,000 ms `node:vm` timeout:
  - its last byte changed;
  - the row's closing mark changed;
  - a CR in the description.
- **The same 120 KB row in a synthetic consent template**, under the same
  bound.
- **A long line whose closing mark comes before its separators**: a
  closing mark found earlier on the line must not let every split be tried
  again.

V8 interrupts a backtracking regular expression when the `vm` timeout
expires. A quadratic read therefore fails with `Script execution timed out
after 1000ms`, not with vitest's own timeout.

### Rule 6

`scripts/rule6_mutation_runner.py` ran at `de01d484`. Each spec put the M0
identity control first: its fragment is replaced by itself, so M0 shows
that the unmutated tests pass under the same command and load. There were
two runs, one per test project:

- `docs/evidence/recorder-label-row-mutants-consent-2026-10-22.json`, over
  `recorder-template.test.ts`, 42 tests;
- `docs/evidence/recorder-label-row-mutants-dossier-2026-10-22.json`, over
  `gate-label-row.test.ts`, 1 test.

Each record holds every mutant's `old` and `new` fragment, the commit, and
the sha256 of the mutated file and of each test file at that commit.
`recorder-template.ts` and both test files hash the same at the PR head.

[Observed]

| Mutant | What it does | Consent | Dossier |
|---|---|---|---|
| M0 | identity control | survived, 0 of 42 failed | survived, 0 of 1 |
| M1 | restores the plain read (the quadratic one) | killed: both timing tests, `Script execution timed out after 1000ms` | killed: `Script execution timed out after 1000ms` |
| M2 | drops the guard | killed: both timing tests time out | killed: times out |
| M2b | the guard asks only for a line break | killed: 12 tests (rows as the last line, timing) | killed: times out |
| M3 | keeps the guard, drops the committed lookahead | killed: the 120 KB timing test times out | killed: times out |
| M4 | the committed split takes the shortest label | killed: 13 tests, among them `expected { a: 'a', b: 'b" \| "c' } to deeply equal { a: 'a" \| "b', b: 'c' }` | killed: the long label reads back split elsewhere |
| M5 | the committed description accepts a blank | killed: 16 tests | survived |
| M6a | a pair whose first slot is repeated is read once | killed: the repeated-label template | survived |
| M6b | a pair whose second slot is repeated is read once | killed: the repeated-description template | survived |
| M7 | a pair followed by more slots on its line is read once | killed: 3 tests | survived |
| M8 | a pair with other patterns is read once, as line slots | killed: 3 tests | survived |
| M9 | a pair split by a CR or LF is read once | killed: both break templates | survived |
| M10 | TAIL stops before the line break | killed: the early-closing-mark timing test times out | survived |

Every mutant is killed by at least one project. The dossier test kills M1,
the restored quadratic read: that is acceptance 2's mutant.

M5 to M10 survive the dossier test alone, as expected. On the real
templates no other pair qualifies, and B (`" | "`) itself holds TAIL's
`" |`. A guard that only looks for the closing mark somewhere on the line
(M10) is therefore still satisfied, and still fast, on those records. The
consent tests reach each of these predicates.

### Acceptance 1: the timing records

**How acceptance 1 is judged.** The coordinator ruled on 2026-10-22 that
acceptance 1 is judged on CPU time. Every failing read of at least 100 KB
must take under 100 ms of CPU time in every sample, for every template
carrying the row. Old and new reads are interleaved, each in a fresh
process.

Wall time is recorded beside the CPU time, with each sample's 1-minute
load. On a host loaded past its cores, the wall time counts the waits for
a core, so it is a figure for host contention, not for the read. Old
samples capped at 60 s are recorded as capped, and no ratio is taken
from a cap.

**The tool.** `scripts/measure_label_row_reads.mjs`:

- **The templates.** It finds them by walking the dossier gate's exports
  and rendering each one with marker values. It finds the 7 named above,
  and it asserts that they are those 7.
- **The records.** Each template renders a record whose label is
  `q" | "` 20,000 times then `z`: 120,001 characters. With the rest of the
  record that is 123,647 to 124,294 bytes.
- **The four kinds of record.** Each is read with `templateFields`:
  - as rendered;
  - its last byte changed;
  - the row's closing `" |` changed to `" ;`;
  - a CR added to the description.
- **The samples.** Each is one read in a fresh Node process, and only the
  read is timed. The new tree takes 3 rounds. The old tree takes 1,
  interleaved with the first round and capped at 60 s.
- **What each sample records.** The wall time; the process's CPU time
  (user plus system) over the read; and the load averages as it started.
  The CPU time is the whole process's, V8's helper threads included, so
  it can exceed the wall time.

**The two runs.**

- **Run 2** (`docs/evidence/recorder-label-row-timing-run-2-2026-10-22.json`)
  is the record of the tool as committed. It judges each failing sample on
  CPU time and lists every wall sample at or over 100 ms with its load.
  - New tree: `8c024867`, the PR head's code.
  - Old tree: main `9a30237e`.
- **Run 1** (`docs/evidence/recorder-label-row-timing-2026-10-22.json`)
  is the lower-load of the two runs.
  - New tree: `433561f2`, with the same `recorder-template.ts`.
  - Old tree: `a0406967`, with the same old file.
  - It ran an earlier version of the tool, which judged on wall time, so
    its own `failingReadsUnderLimit: false` is that earlier predicate.
    Its samples carry the same fields.

No idle window came for a third run.

[Observed] Over the 63 failing reads of each run (7 templates, 3 failing
kinds, 3 rounds):

| | Run 1, load1 55.8 to 85.2 | Run 2, load1 69.4 to 93.0 |
|---|---|---|
| CPU time, slowest sample | 5.66 ms | 7.34 ms |
| **Acceptance 1, judged on CPU time** | **met: 63 of 63 under 100 ms, all refused** | **met: 63 of 63 under 100 ms, all refused** |
| Wall time, median | 10.92 ms | 12.61 ms |
| Wall samples at or over 100 ms | 4 of 63 | 2 of 63 |
| Old tree, the 21 failing reads | every one still running at the 60 s cap | every one still running at the 60 s cap |

On the records as rendered, both trees read the same slots in both runs.

The wall time does break 100 ms under load, on these samples:

| Run | Template | Kind | Round | Wall | CPU | load1 |
|---|---|---|---|---|---|---|
| 1 | STATEMENT_FORMS.redis-redis.0 | CR in the description | 2 | 316.41 ms | 4.84 ms | 57.4 |
| 1 | STATEMENT_FORMS.redis-redis.0 | CR in the description | 1 | 152.56 ms | 4.68 ms | 72.2 |
| 1 | PROVIDER_V2_FORM.exemptRecords.0 | no closing mark | 2 | 150.51 ms | 4.83 ms | 55.8 |
| 1 | DRAWER_FORMS.redis-redis | last byte changed | 3 | 104.22 ms | 4.15 ms | 56.8 |
| 2 | DRAWER_FORMS.redis-redis | no closing mark | 1 | 157.68 ms | 5.33 ms | 82.1 |
| 2 | STATEMENT_FORMS.redis-redis.1 | CR in the description | 2 | 118.98 ms | 4.98 ms | 85.1 |

[Inferred] Each of these spent under 5.4 ms of CPU. The rest of its wall
time was waiting for a core, on a host whose 1-minute load stood at 4.6
to 7.1 times its 12 cores. [Unknown] What the wall times would be on an
idle host: no idle window came.

### The GP-Q0 differential (acceptance 3)

`scripts/differential_line_slot.mjs`, extended in place with
`--change label-row`. The default `line-slot` mode is unchanged.

It refuses a pair of trees unless all of these hold:

- both load the same unambiguous `SLOT.line`;
- their `recorder-template.ts` differ;
- each dossier build resolves its own consent build.

[Observed] The record is
`docs/evidence/recorder-label-row-differential-2026-10-22.json`.

- **The trees.** The old tree is main `9a30237e`. The new tree is
  `f7668cf4`, the merge of that main into this branch: the PR head before
  the commit that adds these records, which changes only
  `docs/evidence/`. Both are clean, and the new tree's
  `recorder-template.ts` hashes the same as at the PR head. Main had
  moved (PR #512) after the rule-6 and timing runs, so the differential
  was run after the merge. `recorder-template.ts` did not change in that
  move.
- **The decisions records.** The corpus is every file in
  `.syzygy/governance/decisions/` at the old commit: 184 tracked, 184
  walked. The recorders render two more, the Redis no-evidence drawer act
  and the OpenAI statement act, which are not on main yet. Seven records
  are read by a template with a line slot. They are the subjects of the
  line and slot alterations.
- **The answers.** Every exported recorder template answers every input.
  That is the 8 templates, the 7 with the row and the sign-off. In each
  reader world, every reader that applies a template answers too: 12
  readers at 2 instants. An answer is read or refused, and when read, the
  sha256 of the captured values.

The inputs by kind:

| Input | Kind | Inputs |
|---|---|---|
| a whole file | as recorded | 186 |
| | selection replaced | 132 |
| | withdrawal appended | 186 |
| | last line altered | 186 |
| | date field altered | 112 |
| | effect widened | 45 |
| | limits removed | 58 |
| one line of a subject | a mark appended | 373 |
| | the line deleted | 373 |
| one line slot of a subject: 22 slots over the 7 subjects (`opening`, `label`, `description`, `quote`, `review`, `disposition`); a variant that renders a record already in the corpus is skipped | a separator inside | 22 |
| | three separators | 22 |
| | a separator first | 16 |
| | a separator last | 22 |
| | a closing mark inside | 22 |
| | a space first | 22 |
| | a tab first | 22 |
| | an ideographic space first | 22 |
| | blank | 22 |
| | spaces only | 22 |
| | a space last | 22 |
| | a CR inside | 22 |
| a reader world (the checkout with one file replaced) | the checkout unchanged | 1 |
| | a rendered record added | 2 |
| | each of the 6 named file alterations, on each of the 7 subjects | 42 |
| | `label` or `description` of each of the 6 sitting-form subjects: separator inside, three separators, space first, blank | 48 |
| **total** | | **2,002** |

Three of the slot variants are the ones acceptance 3 names. A label
holding `" | "` is "a separator inside". A slot starting with a blank is
"a space first", "a tab first" and "an ideographic space first". A blank
slot is "blank" and "spaces only".

**What was cut, and why.** The slot reader worlds cover only the row's
two slots, `label` and `description`, with four of the twelve variants.
That leaves out the other 4 line slots and 8 variants: 210 slot worlds of
the 258 slot inputs. Three reasons:

- the label row is what changed;
- each reader world cost about 90 s per tree under load (1-minute load
  about 60 to 111 by the lane's notes, which are not recorded);
- the template answers above still cover every slot variant on every
  subject.

The coordinator accepted this bound for acceptance 3. The base worlds, 45
of them, are not cut.

[Observed] The result: 2,002 inputs and 17,504 answers compared (1,909 ×
8 template answers, plus 93 × 24 reader answers), **0 mismatches**. That
is 0 verdict changes and 0 captured-value changes. 209 of the 1,909
template inputs are read by at least one template, and there are 262
distinct answer vectors. The run took 4,336 s with 4 workers. Its
1-minute load is not in the record [Unknown: not recorded]; the lane's
notes give 92.6 at the start, 65.2 at the end, and about 60 to 111 at
the checks taken while it ran.

### The negative controls

N2 of the 8.17 review found that the earlier corpus could not tell the
slot changes that matter here apart. So the same corpus was run, templates
only, against two trees that each carry one rule-6 mutant. Each tree is
`a9f3364a` with the mutant applied. The old tree is `a0406967`, whose
`recorder-template.ts` hashes the same as at `9a30237e`. Both runs exit 3,
which is how the tool reports mismatches when a mutant is applied.

[Observed]

| Control | Record | Mismatches | Where |
|---|---|---|---|
| M4, the committed split takes the shortest label | `docs/evidence/recorder-label-row-negative-control-M4-2026-10-22.json` | **35** of 15,272 answers, over 30 inputs | read in both trees, other captured values: a separator inside, three separators and a separator last in `label`; a separator inside and three separators in `description`; on each of the 7 row templates |
| M5, the committed description accepts a blank | `docs/evidence/recorder-label-row-negative-control-M5-2026-10-22.json` | **21** of 15,272 answers, over 18 inputs | refused in the old tree, read in the new: blank and spaces only in `description`; read in both, other values: a separator last in `description`; on each of the 7 row templates |

[Observed] Every mismatch in both controls is a slot input. The file and
line alterations, which were the whole of 8.17's corpus, give 0
mismatches under both mutants. So the slot inputs are what lets this
differential see these two failures.

## Residuals

1. [Inferred] Linearity is argued for a separator that holds a non-space.
   Below the engine's limit, a pair split by spaces only (`{a} {b}`)
   keeps the same answers, but it is not shown to be linear. No recorder
   template has one.
2. [Inferred] A line of three or more line slots qualifies at most one
   pair, and the slot before that pair can still end at many places. No
   recorder template has such a line.
3. [Observed] Every old read of a 124 KB failing record was still running
   at its 60 s cap. So the timing records hold no completed old failing
   time, and no ratio is taken from the cap. The ratio above rests on the
   8.17 review's 104 KB figures.
4. [Observed] The negative-control trees are the commit `a9f3364a` with
   the mutant applied and committed in a scratch clone. Those commits
   (`39cb5329` for M4, `c1d7ebfc` for M5) are reachable from no shared
   ref. Each record carries the mutant's `old` and `new` fragments, so the
   tree can be rebuilt. `recorder-template.ts` is byte-identical at
   `a9f3364a` and at the PR head, apart from the mutant.
5. [Observed] Three of the checks ran before main moved, on trees that
   predate PR #512:
   - rule 6 ran at `de01d484`;
   - timing run 1 ran at `433561f2`;
   - the controls ran against `a0406967`.

   Timing run 2 and the differential ran after the merge.

   PR #512 changed `package-reader.ts` and did not change
   `recorder-template.ts`:
   - the new `recorder-template.ts` and the two test files hash the same
     at `de01d484`, at `433561f2`, at `8c024867` and at the PR head;
   - the old `recorder-template.ts` hashes the same at `a0406967` and at
     `9a30237e`.

   [Inferred] The merge does not move those results. The timing runs
   and the consent tests call `templateFields` directly. The dossier test
   first renders each record with the real recorder, through the consent
   package's testing renderers, then does the same.

   A first differential, `a0406967` against `433561f2`, is superseded. It
   ran at 4 workers. By the lane's notes, which are not recorded, its
   reader worlds were taking about 2.4 times as long as on the merged
   trees, and at about 15:08 +08:00 its `timeout` wrapper was SIGSTOPped,
   so that it could not kill the run at 9,000 s. Once main moved, the run
   was stopped at 1,500 of its 2,002 inputs. No verdict was taken from
   it, and its partial output is dropped.
6. [Inferred] The bound on the slot reader worlds rests on this: a reader
   that applies a template can answer differently only where the template
   does. That holds if the readers apply only the exported templates,
   which the template answers cover on every slot variant.

## Re-running

```sh
(in each tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
node scripts/differential_line_slot.mjs --old <base tree> --new <this tree> --change label-row --out <file.json>
node scripts/differential_line_slot.mjs --old <base tree> --new <mutant tree> --change label-row --mutant <mutant.json> --templates-only --out <file.json>
node scripts/measure_label_row_reads.mjs <this tree> --old <base tree> --out <file.json>
python3 scripts/rule6_mutation_runner.py <spec.json> <out.json>   # a previous out.json is a valid spec
npx vitest run packages/polaris-generation-consent/src/recorder-template.test.ts packages/polaris-dossier/src/gate-label-row.test.ts -t syzygy-bpyt.8.21
```
