# R-GP-IMPL-CRLF-MASK-3 — CC-REV-1 implementation review of syzygy-bpyt.16, round 3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 1ff3ed7d
Subject: r3-review.diff sha256 699f4b1c1f15a66a9a4d22bf1d712bb1d0fe81f3d8d50ce4fdc83a5d234db7ec

Reviewer: rev-544-r3, an independent fresh-context reviewer. I did not write this change, its round-1 or round-2 repairs, or any
pin in it, and I changed none of them. I did not push, comment, merge or dispatch anything. Every run below was made on
2026-10-28 between 10:05 and 11:20 local time, in scratch clones of the Syzygy repository, now deleted. I read no body of
Butlers or of any other observed repository; every text measured is synthetic. I opened no credential file and nothing under
`~/.claude/`, `~/.config/` or a Chrome configuration directory.

Why the verdict is CONFIRM WITH EXCEPTIONS: no finding is blocking under the brief's rule. No production byte changed in
`561e4f77..1ff3ed7d`, and no LF decision changed. MU22, MU23 and MU24 are each killed by the one pin they target, and by no other
test, with a real assertion. Each of those three pins stops killing when I weaken the part it pins (TX1, TX4, TX5). The
differential and its self-test re-run byte-identical, and the separator slice is the 10,131 texts the body names. Every figure in
the PR body's new text is true against my runs: 332 → 391, +62 −3, the slice counts, 7 of 7, 2,788, the battery's
`commands=114 nonzero=0`, the full suite's 5,558 / 5 / 0, and hosted `checks` and `node`. The six notes (N1–N6) are about pins
that list some code units and not others, a check in the evidence tooling that can no longer fail, one failure message, an LF
quirk older than this PR, and two routing and wording points. The most material is N1. The fence-position row and the U+2028
position pin each name a few code units. So a closer that tolerates a trailing VT or FF, and a `positionOf` that counts U+2029
or VT, survive the seven files. Only the differential sees them. None of these is the weakening its pin pins, and N1 gives two
general pins, which I verified.

## 1. Subject identity checks

Every digest here is computed by script (rule 3).

- [Observed] `r3-review.diff`: sha256 `699f4b1c1f15a66a9a4d22bf1d712bb1d0fe81f3d8d50ce4fdc83a5d234db7ec`, **as the brief says**.
  `git diff 561e4f77 1ff3ed7d` is byte-equal to it (`cmp`: equal). `--stat`: "12 files changed, 673 insertions(+), 178
  deletions(-)".
- [Observed] `git diff 561e4f77 1ff3ed7d -- apps packages scripts` hashes to
  `76e8af0b055f3339e3bdfaa61cda2c7bf87f340517133c475900bbb52d472ded`, **as the brief says**. It holds two paths,
  `packages/three-surface-poc-core/src/git-object-reader.test.ts` (+4) and
  `packages/three-surface-poc-core/src/markdown-code-context.test.ts` (+17). The other 10 paths are under
  `docs/evidence/syzygy-bpyt-16/`.
- [Observed] PR body (`gh pr view 544 -R Tzeusy/syzygy --json body --jq .body | sha256sum`): 17,050 bytes, sha256
  `13fadafa52999176aa8e4d67a617dd73167b9b4cb8498526fd25274990e1d8f9`. **It matches** the frozen body. PR #544 is OPEN with
  `headRefOid` `1ff3ed7dac9e7a615852cbd998b87174b62fe4a4`. The GitHub remote's `agent/syzygy-bpyt.16` is the same commit.
- [Observed] The round-1 raw hashes to `1a2010ae4d7fe2de19aac036545b0ade689d69dcca0ef5c9f15333a161302964` and the round-2 raw to
  `165b3f71212e914b8f3a36e642b8d440a36e74ed7176cbe938e4f26676c8647a`, as the brief says.
- [Observed] Commit graph: `1ff3ed7d` is the child of `497515ae`, which is the child of `561e4f77`. No merge is in the range. These
  are the commits the PR body names.
- [Observed] **Fidelity** (`tools/fidelity.py`, output `fidelity.txt`):
  - N1's pin is the round-2 raw's lines 325–335, de-indented by the two spaces of the list item. Lines 324 and 336 are its
    ```` ```ts ```` fence. It occurs once at `1ff3ed7d` and 0 times at `561e4f77`.
  - N2's fence-position row occurs once at `1ff3ed7d`. The raw gives only its shape (lines 361–362): for each of the three
    separators, `` ['```', 'x', '```' + separator].join('\n') `` gives `malformed()` = `{ reason: 'unclosed-fence', line: 1 }`. The row
    is that shape: it loops over `'\u2028', '\u2029', '\u0085'` with exactly that text and that expected value.
  - Take the `1ff3ed7d` file of `markdown-code-context.test.ts`. Remove the row and the pin, each with the one blank line after it.
    The result is the `561e4f77` file byte for byte: "markdown test: head minus row+pin == 561e4f77: True". The row and the pin
    sit right after the round-1 F1 pin, and right before the comment that begins `// This test compares a rendering with another`.
  - Removing the U+2028 position pin from `git-object-reader.test.ts` gives the `561e4f77` file: "git-object-reader test: head
    minus RW10 pin == 561e4f77: True 1". It is the last `it` of `describe('reported positions in CRLF and bare-CR texts'`.
  - The 21 added test lines hold 0 non-ASCII characters, 0 U+00A0 and 0 raw CR. Each separator is a `\u` escape in the source.
  - **So nothing in either test file changed beyond the three listed items.**
- [Observed] **Production bytes.** I took every tracked path under `apps/`, `packages/` and `scripts/` that is not a test, plus
  the root files: 437 paths. **0** differ between `561e4f77` and `1ff3ed7d`.
  - `markdown-code-context.ts` is `93b95f6d4eabc440344404d01040ba1f10bdceb65e69ab74c4ea59c1fa5831f7` at `6928b50a`, `561e4f77` and
    `1ff3ed7d`.
  - Between `6928b50a` and `561e4f77`, 10 of the 437 differ. One is `AGENTS.md`, which is not a production file. The other nine
    are production files, and each equals main `f7ea8584`'s blob at `561e4f77`. So the merge `c399eda9` brought all nine, and no
    repair changed any. `git-object-reader.ts` is one of them (the `decodeUtf8` import).
- [Observed] **Builds** (`tsc -b`, each in its own clone with `npm ci`). `dist/markdown-code-context.js` is `6e22d480…` at
  `1ff3ed7d`, and `27975814…` at both `f7ea8584` and `d621bfa2`. These are the record's `builtModule.code` and
  `builtModule.base`. `dist/git-object-reader.js` is `0aef7466…` at `1ff3ed7d` and `f7ea8584`, and `5c03313f…` at `d621bfa2`.
- [Observed] **The record** `crlf-mask-2026-10-27.json` at `1ff3ed7d` (`tools/record-verify.py`):
  - all 26 `files` rows verify, bytes and sha256. Of the 27 tracked files in the directory, the one not in the table is the
    record itself;
  - `subject.repair.changedFiles` verifies at both ends, `c399eda9` and `497515ae`;
  - `rule6.maskMutants.summary` equals the mutant output's summary;
  - `tests.line` is "Tests: +62 ~33 -3", with 332 → 391, `f7ea8584` → `497515ae`. `tests.roundOneMeasurement` is 332 → 388 at
    `224e8faa`;
  - `subject.repair.round2.range` is `561e4f77` → `497515ae`, and that range touches 11 paths, none outside the two test files
    and the evidence directory;
  - `subject.note` equals round 2's N4 sentence (raw lines 392–395) exactly: "subject.note == raw N4 sentence: True".
- [Observed] **Main moved** (`tools/import-closure.py`, output `main-changed-closure.txt`). Origin `main` is `b0d7753f`. PR #545
  is still OPEN.
  - Since `f7ea8584`, main took 65 commits. Its first-parent merges are #541, #543, #532, #546, #547 and #551 (`b0d7753f`). They
    changed 559 paths.
  - The PR has 36 paths against `f7ea8584`. **0** are shared with main's 559.
  - The import closure of the mask, `git-object-reader.ts` and the seven test files is 153 files, both at `1ff3ed7d` and at
    `b0d7753f`. It holds **0** of main's 559 paths.
  - Main changed 0 of the configuration files every run reads.
  - Second method: main changed 16 paths under `apps/`, `packages/` and `scripts/`. Their 14 basename stems searched as fixed
    strings in the nine roots match 2 stems:
    - `git-object-reader`, which is the roots' import of the poc-core reader, not main's
      `packages/polaris-dossier/src/git-object-reader.test.ts`;
    - `main`, a common word.

    Neither names a path main changed.
  - **So the list the brief asks for is empty.** No path main changed since `f7ea8584` is a PR path, or is read by the mask, the
    active-content scan or the seven test files.

## 2. Clauses relied on (quoted), and the class

**CC-REV-1**, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `1ff3ed7d`:
- Lines 13–14: "Independent review is preserved when a reviewer authors semantic changes."
- Lines 18–20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- Lines 24–27: "did not author the change; / does not share the authoring session's context; / receives the artifact, its
  governing doctrine/RFC references, and acceptance criteria — not the author's reasoning or a desired verdict."
- Lines 35–37: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Line 51: "**A reviewer or the owner** may reclassify at any time."
- Lines 57–58: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent
  review." This round exists under that clause: the round-2 reviewer wrote N1's pin and N2's row shape. I wrote none of the
  reviewed bytes.

**GP-Q0**, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
- Lines 52–55: "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an
  exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- Line 62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- Lines 64–66: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6
  mutant for each predicate; a non-blocking owner notice in the cycle report."
- Lines 95–96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**The owner's ruling** (`bd comments syzygy-bpyt.1.14`, "[owner ruling, recorded by coord-9297eba3 on 2026-10-27]"), "What this
authorizes": "inside maskMarkdownCodeContexts, a line ends at CRLF, CR or LF, and the split keeps every terminator and offset. …
every LF decision is unchanged. It authorizes nothing beyond that: no spec or policy byte change (the optional PWB-REQ-006
clarifying sentence was not chosen), no other reader (G2–G4 of PR #533 stay open), and no change to LF behaviour."

**AGENTS.md** at `1ff3ed7d`:
- Line 126, rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Line 133, rule 10: "Freeze the bytes a review is bound to; any later edit retires the review."
- Line 134, rule 11: "An evidence record names its subject and the subject's digest".

**The test-rigor bar**, `git show 1ff3ed7d:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
- Line 42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- Lines 66–67 (bar 4): "Expected values are literals or independently derived."
- Lines 82–84 (bar 7): "**A failure names the defect** — Test names state expected behavior ("rejects_expired_token");
  assertion messages make the diff readable. A maintainer should localize the bug from failure output alone."
- Lines 93–94 (bar 10): "A test is worth *adding* only if it catches a plausible bug no existing test catches".
- Lines 103–104 (workflow 2): "name a one-line bug in the code under test this test would *not* catch but should."

**The class: 3 and 4, unchanged.** No repair changes them, and nothing a gate accepts or refuses moves beyond the ruling.
- [Observed] `561e4f77..1ff3ed7d` changes no production byte (section 1), and both built modules hash as before.
- [Inferred] So the gate accepts and refuses exactly what it did at `561e4f77`, and at `c399eda9` before it. Rounds 1 and 2 found
  that inside the owner's ruling on every corpus they measured. GP-Q0's stop clause is not reached.
- [Observed] The local merge with current main leaves the mask at `93b95f6d…` and `git-object-reader.ts` at `76ac22aa…`, both
  as at `1ff3ed7d` (section 3, run 14).
- Classes 1 and 6 stay unclaimed: no authority table, endpoint or wire format is touched.
- GP-Q0's three checks:
  - the differential is present, and its slice is now wider (VT and FF);
  - "a rule-6 mutant for each predicate" holds for the three new pins (MU22–MU24), with N1 as the residual enumeration gap;
  - the owner notice is still to come.

## 3. What I ran, and the results

Each vitest run used its own TMPDIR, `/tmp/r544c-<n>`, and one ran at a time. The battery's Python commands and the node
differentials ran alongside vitest runs. No vitest run timed out. Every TMPDIR and clone is deleted.

| # | Run | Commit | loadavg (1-min, before → after) | Result (verbatim) |
|---|---|---|---|---|
| 1 | `npm ci`, then `npm run build` and `npm run typecheck` | `1ff3ed7d` | 19.26 → 20.51 | "build exit 0", "typecheck exit 0" |
| 2 | seven test files (`tools/run-seven.sh`) | `1ff3ed7d` | 20.51 → 21.49 | "tests 391 passed 391 failed 0 files 7" |
| 3 | `crlf-differential.mjs`: base build `f7ea8584`, then base build `d621bfa2`, each against the head build | `1ff3ed7d` | 23.27 → 23.27 | exit 0 both; output sha256 `1d0faa30…` both, **byte-identical to the committed output** |
| 4 | `crlf-differential-selftest.mjs` | `1ff3ed7d` | 22.48 → 22.04 | exit 0; output sha256 `a93430e4…`, **byte-identical**; 7 of 7 |
| 5 | `tools/slice-rebuild-r3.mjs` and `tools/slice-dump.py` | `1ff3ed7d` | | see below |
| 6 | `crlf-mask-mutants.py --only` MU17, MU18, MU19, MU22, MU23, MU24 (with CONTROL) | `497515ae` | 20.80 → 26.43 | "exit 0"; every row **equal to the committed row**; see below |
| 7 | `tools/diff-mutants-r3.mjs` (12 builds, two differentials) | | 24.57 → 27.08 | see below |
| 8 | `tools/mutants-r3.py`, my mutants PX1–PX6 and TX1–TX6 | `497515ae` | 19.55 → 28.17 over 12 runs | see section 4 and 7 |
| 9 | `tools/candidate-pins.py`, N1's two candidate pins | `497515ae` | 23.84 → 21.71 over 10 runs | see N1 |
| 10 | `tools/opener-probe.mjs`, `tools/px1-probe.mjs` | | | see N1 and N4 |
| 11 | full vitest suite, once | `1ff3ed7d` | 21.25 → 32.71 | "files 253 … tests 5563 passed 5558 failed 0 pending 5 todo 0 success True"; exit 0 |
| 12 | seven test files | `f7ea8584` | 24.71 → 22.79 | "tests 332 passed 332 failed 0 files 7" |
| 13 | test delta by (file, full name), `tools/name-delta.py` | | | `f7ea8584` → `1ff3ed7d`: "base tests 332 head tests 391 \| added 62 removed 3 \| check True"; `561e4f77` (round 2's report) → `1ff3ed7d`: 388 → 391, added 3, removed 0 |
| 14 | seven test files on a local merge `f353205d` = `1ff3ed7d` + origin/main `b0d7753f` (no conflict) | | 25.03 → 24.51 | "tests 391 passed 391 failed 0 files 7" |
| 15 | the canonical battery, `PROJECT-STATUS.md` §"How to verify this page", line by line in a fresh clone (`tools/battery-run.py`) | `1ff3ed7d` | 21.72 → 28.82 | "commit=1ff3ed7dac9e7a615852cbd998b87174b62fe4a4 commands=114 nonzero=0"; `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; `check_quotations.py`: "… 40 quotations examined in 21 of 979 .md files scanned …, 0 findings" |
| 16 | hosted checks, `gh pr checks 544 -R Tzeusy/syzygy` | `1ff3ed7d` | | "checks pass 17m8s", "node pass 3m9s"; runs 40610369849 (governance-docs) and 40610369894 (node-ci), both `headSha` `1ff3ed7d`, event `pull_request`, conclusion `success` |

Detail:
- [Observed] **Run 11.** The 253 files are 250 that pass and 3 whose every test is skipped (the three `*.live.test.ts`). The suite
  has 894 suites and 5,563 tests: 5,558 passed, 5 pending, 0 failed. These are the body's figures: "250 test files passed, 3
  skipped; 5,558 tests passed, 5 skipped, 0 failed". No file failed, so there was nothing to re-run alone.
- [Observed] **Run 3.** The two base builds hold the same mask module (`27975814…`) and differ in `git-object-reader.js`. Both
  give the committed output byte for byte. So the body's change of label, from "BASE main's `f7ea8584`" to "BASE `d621bfa2`",
  changes no figure. The output records the mask module's digest only, which round 1's N5 already routed to `syzygy-bpyt.41`.
- [Observed] **Run 4.** "S1 1 ['C1'] True True", "S2 1 ['C2', 'C3', 'C4'] True False", "S3 1 ['C2', 'C3', 'C4'] True False",
  "S4 1 ['C4'] True True", "S5 1 ['C1'] True True", "S6 1 ['C1'] True True", "S7 1 ['C1'] True True". **S7 fails exactly C1.**
- [Observed] **Run 5**, my rebuild of the separator slice. It is round 2's construction with VT and FF added; output
  `slice-rebuild-out.json`.
  - "texts": 10131, and "withCr": 0.
  - The differential's own slice, dumped by a patched copy, is the same set: "equalSets": true, sorted digest `8817670d…`.
  - "holdingEach": 2,026 for each of the five separators, and "holdingNone": 1. The one text with none is `a ``b ` c`` d`.
  - "excludedByHead": 8044.
  - Inside a fence / inside a span / outside every context / at a text the head calls malformed:
    - U+2028 and U+2029, each: 370 / 198 / 457 / 1,075;
    - U+0085, VT and FF, each: 572 / 123 / 368 / 982.

  So the slice is as the body and the record say: 10,131 texts, 10,130 holding a separator, 2,026 for each, at fence and span
  positions; one text holds none; 8,044 are excluded at head.
- [Observed] **Run 6.** CONTROL "{'unit': (44, 0), 'fenceRules': (69, 0), 'callSites': (278, 0)}". Every failing test, verbatim
  (a raw separator in a vitest label is shown as `<U+XXXX>`):
  - MU22: "unit 1", the general pin alone: "AssertionError: expected [ 'b', 'c' ] to deeply equal []".
  - MU23: "unit 1", the fence-position row alone: "Error: expected a malformed context" (N3).
  - MU24: "callSites 1", the U+2028 position pin alone: "AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]".
  - MU17: "unit 3", the F1 pin ("AssertionError: "<U+2028>": expected 'a   \u2028   d' to be 'a       d' // Object.is
    equality"), the fence row ("Error: expected a malformed context") and the general pin ("AssertionError: expected [ '2028' ]
    to deeply equal []").
  - MU18: "unit 3", the same three tests; the general pin gives "expected [ '85' ] to deeply equal []".
  - MU19: "unit 3", the same three tests; the general pin gives "expected [ '2028', '2029' ] to deeply equal []".

  Each failure is a thrown assertion or the test helper's own `Error`, not a timeout. The summary is
  `{"codeCommit": "497515ae38829439aa4faa01196d9e361bce8bd8", "baseCommit": "d621bfa2", "mutants": 6, "killed": 6,
  "survivedEquivalent": 0, "survived": [], "killedByExpectedKillerOnly": 6, "expectedKillerNotAlone": []}`. For the last field,
  see N2. Each row equals its row in the committed output, field for field, including `fileSha256`.
- [Observed] **Run 7.** Each build is the head build with one mutation. "Head" is the differential at `1ff3ed7d`, with five
  separators. "561e4f77" is the differential as committed there, sha256 `ce981fad…`, with three. Each cell gives the exit code,
  the failing checks and the failure count:

  | build | head | 561e4f77 |
  |---|---|---|
  | none | 0, [], 0 | 0, [], 0 |
  | S7 (VT and FF end a line) | 1, [C1], **2,788** | **0, [], 0** |
  | VT only | 1, [C1], 1,394 | 0, [], 0 |
  | FF only | 1, [C1], 1,394 | 0, [], 0 |
  | PX1 (closer tolerates a trailing VT or FF) | 1, [C1], 216 | 0, [], 0 |
  | PX2 (closer tolerates trailing `\s`) | 1, [C1], 944 | 1, [C1], 562 |
  | PX3 (U+001C to U+001E end a line) | **0, [], 0** | 0, [], 0 |
  | PX4 (`positionOf` counts U+2029) | 1, [C1], 261 | 1, [C1], 261 |
  | PX5 (`positionOf` counts VT) | 1, [C1], 205 | 0, [], 0 |
  | PX6 (opener regex gains the `s` flag) | 1, [C1], 772 | 1, [C1], 772 |
  | MU23 (RW5) | 1, [C1], 324 | 1, [C1], 324 |
  | MU24 (RW10) | 1, [C1], 261 | 1, [C1], 261 |

  So the `vt-ff-slice-necessity.json` record holds. The old tool, sha256 `ce981fad…` as the record says, exits 0 on S7. The new
  tool, `b71f3db9…`, exits 1 with 2,788 failures, all in C1. The non-slice LF forms are the same in both tools, and the old tool
  finds 0 failures, so all 2,788 are slice texts. VT and FF are each needed: 1,394 failures each. PX3 is the one widening
  outside the slice; the general pin kills it (section 4).

## 4. Findings

No blocking finding. Six notes.

### N1 — note. The fence-position row and the U+2028 position pin each name a few code units, so their siblings survive the seven files

- **Severity:** note. Each survivor is outside the weakening its pin claims to pin. The row's title is "U+2028, U+2029 and U+0085
  after a closing fence are line content: the fence stays unclosed". The position pin's title is "U+2028 is line content: an LF
  text reports its finding on line 1". The differential's C1 catches every survivor. This is the same structure as round 2's N1,
  which the general pin answered for `LINE_END`.
- **Evidence** (`mutants-r3-out.json`, the seven files at `497515ae`):
  - [Observed] **PX1**, the closer regex `/^ {0,3}(`{3,}|~{3,})[ \v\f]*$/` (a closer that tolerates a trailing VT or FF),
    **SURVIVED**: "391 0". The head differential fails it in C1, 216 times. The differential at `561e4f77` does not.
  - [Observed] It admits a script element that the head refuses (`px1-probe-out.json`). Take the LF text
    "```` ``` ````, `A`, ```` ``` ```` + VT, ```` ``` ````, `<script>x</script>`, ```` ``` ````". The head gives
    "malformed-code-context:unclosed-fence@6:1", and PX1 gives "admit".
  - [Observed] **PX4**, `positionOf` counting U+2029, **SURVIVED** ("391 0"); C1 fails it 261 times. **PX5**, `positionOf`
    counting VT, **SURVIVED** ("391 0"); C1 fails it 205 times, and only the five-separator slice sees it.
  - [Observed] The three pins are each load-bearing where they reach:
    - TX4 lets the fence row name U+0085 alone, and applies a closer that tolerates U+2028 and U+2029: it **SURVIVED**
      ("44 0");
    - TX5 lets the position pin accept line 1 or 2 and any column, and applies MU24: it **SURVIVED** ("81 0");
    - TX1 lets the general pin skip U+000B and U+000C, and applies MU22: it **SURVIVED** ("44 0").

    So each pin kills its mutant only through the units it names.
  - [Observed] Two plausible edits in the same area are killed:
    - PX2, a closer that tolerates trailing `\s`, is killed by 14 tests, the fence row among them;
    - PX3, `LINE_END` widened to U+001C to U+001E, is killed by the general pin alone: "AssertionError: expected [ '1c', '1d',
      '1e' ] to deeply equal []".
- **Failure scenario:** a maintainer lets a closing fence end with "trailing vertical whitespace", or makes `positionOf` "count the
  paragraph separator". An LF Markdown text that the head excludes is then admitted (PX1), or an LF finding moves to another line
  (PX4, PX5). The seven files, the full suite and hosted CI stay green. Only a manual run of `crlf-differential.mjs` fails, and no
  CI job runs it.
- **Proposed fix** (a follow-up bead; this round is the last). Add two general pins, siblings of the general pin, one in each
  test file. I verified them as `tools/candidate-pins.test.ts` (run 9, `candidate-pins-out.json`):

  ```ts
    // A closer followed by any code unit but a space or the fence character is a closer followed by text, so the fence stays
    // unclosed; the failure lists, in hex, each unit after which the mask closed the fence.
    it('no code unit but a space after a closing fence leaves it closed', () => {
      const closed: string[] = [];
      for (let unit = 0; unit <= 0xffff; unit += 1) {
        if (unit === 0x0a || unit === 0x0d || unit === 0x20 || unit === 0x60) continue;
        const mask = maskMarkdownCodeContexts(['```', 'x', '```' + String.fromCharCode(unit)].join('\n'));
        if (mask.kind !== 'malformed' || mask.reason !== 'unclosed-fence' || mask.line !== 1) closed.push(unit.toString(16));
      }
      expect(closed).toEqual([]);
    });

    // positionOf counts LF only, so a script element after one code unit that is not LF is reported on line 1, at column 3;
    // the failure lists, in hex, each unit that moved a finding.
    it('no code unit but LF moves a reported position to another line', () => {
      const moved: string[] = [];
      for (let unit = 0; unit <= 0xffff; unit += 1) {
        if (unit === 0x0a || unit === 0x60) continue;
        const findings = scanActiveContent('a' + String.fromCharCode(unit) + '<script>x</script>');
        const first = findings.find((f) => f.form === 'script-element');
        if (first === undefined || first.line !== 1 || first.column !== 3) moved.push(unit.toString(16));
      }
      expect(moved).toEqual([]);
    });
  ```

  [Observed] Both pass at head ("2 0"). The first fails under each of:
  - MU22: "expected [ 'b', 'c' ] to deeply equal []";
  - MU23: "expected [ '85', '2028', '2029' ] …";
  - PX1: "expected [ 'b', 'c' ] …";
  - PX2: "expected [ '9', 'b', 'c', 'a0', '1680', …(17) ] …";
  - PX3: "expected [ '1c', '1d', '1e' ] …".

  The second fails under each of:
  - MU24: "expected [ '2028' ] …";
  - PX4: "expected [ '2029' ] …";
  - PX5: "expected [ 'b' ] …".

  Neither catches PX6 (N4).

### N2 — note. `crlf-mask-mutants.py`'s `expectedKillerNotAlone` reads a key the rows no longer carry, so the script's own gate cannot fail

- **Severity:** note. `build-record.py` still enforces the property, so the record is sound. The script's docstring promises a
  gate that its code no longer applies.
- **Evidence:**
  - [Observed] At `1ff3ed7d`, line 199 stores `row['expectedKillers'] = KILLER[mid]` (plural). Line 219 computes
    `'expectedKillerNotAlone': [r['id'] for r in mutants if 'expectedKiller' in r and not r['killedByExpectedKillerOnly']]`
    (singular). Line 225 exits 1 only on `survived` or `expectedKillerNotAlone`.
  - [Observed] In the committed output, 0 of the 26 rows carry the key `expectedKiller`, and 8 carry `expectedKillers`. So
    `expectedKillerNotAlone` is `[]` whatever the rows say. The docstring says "the run exits 1 otherwise", meaning when a test
    outside the listed pins fails.
  - [Observed] `build-record.py` line 97 refuses unless `killedByExpectedKillerOnly` is exactly 8. Lines 101–103 refuse unless
    MU22, MU23 and MU24 each fail exactly one test, their own pin. Those checks still hold the property: the committed summary has
    `"killedByExpectedKillerOnly": 8`.
- **Failure scenario:** a later re-run in which a stray test also fails MU17 still exits 0. Only the builder refuses.
- **Proposed fix (follow-up):** at line 219, test `'expectedKillers' in r`. Then mutate a row and confirm the script exits 1
  (rule 6).

### N3 — note. The fence-position row's failure does not name the separator or what the mask returned

- **Severity:** note (bar 7).
- **Evidence:**
  - [Observed] Under MU23, MU17, MU18, MU19 and TX3, the row fails with "Error: expected a malformed context".
  - [Observed] The message comes from the file's `malformed()` helper (line 17), which throws before `expect` sees its
    `JSON.stringify(separator)` label. So the output names neither the separator nor the masked result.
  - [Observed] The test name does localize the defect to "after a closing fence". The loop also stops at the first separator.
  - [Observed] TX3 checks the reason only and still kills MU23. So the row's `line: 1` decides no mutant I tried: MU23 fails it
    by throwing.
- **Proposed fix (optional, with N1's first pin):** the first N1 candidate lists every unit after which the fence closed, so it
  answers this too. Otherwise, assert on `maskMarkdownCodeContexts(…)` with `toMatchObject({ kind: 'malformed', reason:
  'unclosed-fence', line: 1 })` and the separator label.

### N4 — note. U+2028 and U+2029 in an opener's info string make the line no opener, at base and head alike

- **Severity:** note. This is an LF reading older than the PR, and the PR does not change it. The ruling forbids changing it here
  ("no change to LF behaviour").
- **Evidence:**
  - [Observed] `FENCE_OPENER` is `/^ {0,3}(`{3,}|~{3,})(.*)$/`, without the `s` flag, so `.` matches neither U+2028 nor U+2029
    (`opener-probe-out.json`). Take the LF text "```` ``` ```` + separator + `info`, `<script>x</script>`, ```` ``` ````".
    - With U+2028 or U+2029: "malformed unclosed-inline-span@1" at both head and base.
    - With `x`, U+0085, VT, FF or U+FEFF: "masked fences=1 spans=0".
    - "equal": true for each.
  - [Observed] PX6 adds the `s` flag. It survives the seven files ("391 0"), and C1 fails it 772 times.
  - [Inferred] The general pin's comment ("Every other UTF-16 code unit is line content too") is about line ends, and it stays
    true. At the opener, U+2028 and U+2029 are neither line ends nor info-string content. The reading fails closed, since it
    excludes.
- **Proposed fix:** none in #544. Record it with the line-model questions (`syzygy-bpyt.1.19` / `.41`). Any change there is an LF
  change and goes to the owner.

### N5 — note. The body's round-2 paragraph describes F1 without the fact F1 found false

- **Severity:** note. Each clause of the sentence is true. It omits the point.
- **Evidence:** [Observed] The body reads: "returned **REVISE** on one finding, F1, a figure in this body's Tests line (it gave
  331 → 387 and "385 measured at the code commit plus the two pins" where `test-delta-output.json` measures 332 → 388 between
  `f7ea8584` and `224e8faa`)". Round 2's F1 is headed "A test count in the PR body is attached to a commit that does not hold it".
  Its evidence is that "332 → 388 at the merge commit" was false, because `c399eda9` holds 386. The landing owner notice copies
  this body.
- **Proposed fix (optional):** replace the parenthetical with "(it attached 332 → 388 to the merge commit `c399eda9`, which holds
  386; 388 is the round-1 repair commit `224e8faa`'s count)".

### N6 — note. `syzygy-bpyt.41` does not yet carry N3, which the body routes to it

- **Severity:** note. The fix is a tracker write, outside the reviewed bytes.
- **Evidence:**
  - [Observed] The body says: "Not taken here: N3 (a mixed-terminator row) goes to `syzygy-bpyt.41`".
  - [Observed] `bd show syzygy-bpyt.41`'s description has three items: round 1's N5, N6(a) and N6(b). `bd comments syzygy-bpyt.41`
    prints "No comments on syzygy-bpyt.41".
- **Proposed fix:** add round 2's N3 row to `syzygy-bpyt.41`, with its exact text: `malformed('a\n\r`x')` =
  `{ reason: 'unclosed-inline-span', line: 3 }`. Add this round's N1–N4 with it, before or at landing.

## 5. Every changed output, or the evidence that there is none

- [Observed] **No production byte changed** in `561e4f77..1ff3ed7d`, over 437 paths (section 1). Both built modules hash as at
  round 2.
- [Observed] The differential's output re-runs byte-identical (`1d0faa30…`), and so does the self-test's (`a93430e4…`).
  - C1: 0 failures over 1,825 LF forms and 10,131 slice texts. **0 LF decisions changed.**
  - C2: 0 over 11,054. C3: 0 over 8,345. C4: 0 over 1,822.
- [Observed] The output equals the one at `c399eda9` once the slice fields are deleted (`True`). So the body's accept/refuse
  table, its `changedOutputsByClass` figures and the vet's first three rows are the outputs round 1 reviewed. The repairs changed
  none of them.
- [Observed] Main does not move the result: on the local merge the seven files pass 391 of 391, with the same mask and reader.
- **So the change's outputs are the ones rounds 1 and 2 reviewed.** The repairs add three tests and wider evidence, and change no
  output.

## 6. Verdicts on the round-2 items taken

| Item | Verdict | Evidence |
|---|---|---|
| F1 (Tests line) | **met** | Round 2's old text, "331 → 387 (332 → 388 at the merge commit", is gone. The new text keeps round 2's wording and adds round 2's own counts. Every figure is true: 332 → 391 (runs 2, 12, 13); "the round-1 repair commit `224e8faa` held 388" (`tests.roundOneMeasurement`); "round 2 adds three tests" (run 13: +3, −0); 386 at `c399eda9` and 385 / 331 (round 2's runs, and the record's `previousMeasurement`); +62 −3 (run 13); ~33 (`changedGeneratedTests`: 33). |
| N1 (general pin, VT and FF, S7, MU22) | **met** | The pin is byte for byte from raw lines 325–335, right after the F1 pin. VT and FF are in `SEPARATORS`. S7 fails exactly C1, and the record shows that removing VT and FF (the `561e4f77` tool) lets S7 through. MU22 is killed by the general pin alone. N1 above is a residual of N2's row and pin, not of this item. |
| N2 (fence row, position pin, MU23, MU24) | **met** | Both are present as specified: the row in the shape of raw lines 361–362, and the pin with the `script-element@1:3` the repair list names, plus `1:12`. MU23 and MU24 are each killed by their pin alone. Each separator is a `\u` escape, and the added lines hold 0 U+00A0 and 0 U+FEFF. |
| N4 (record `subject.note`, body phrase) | **met** | `subject.note` equals raw lines 392–395 exactly. The body now reads "The measured mask is the code commit's", and "The measured subject is the code commit" is gone. |
| N5 (slice sentence) | **met** | The body has "10,130 of them hold U+2028, U+2029, U+0085, VT (U+000B) or FF (U+000C), 2,026 each, at fence and span positions; one holds none". Run 5 confirms each count, and the text with none is `a ``b ` c`` d`. |
| N7(b) (battery name) | **met** | The body has "`PROJECT-STATUS.md` §How to verify this page, line by line in a clean clone of the head `1ff3ed7d`", and `battery_clone.py` is gone. Run 15 reproduces `commands=114 nonzero=0` at that head. |

The other round-2 lines in the body are also true at `1ff3ed7d`:
- The Battery paragraph: the full suite, `npm run typecheck`, `check_governance.py`, `check_quotations.py` and hosted CI on
  `1ff3ed7d` (runs 1, 11, 15, 16).
- "7 of 7 mutants killed; S1, S4, S5, S6 and S7 isolate C1, C4, C1, C1 and C1" (run 4).
- "2,788 failures, all in C1" (run 7).
- "23 of 23 killed" (24 mutants, MU16 equivalent).
- "MU17 to MU24 are each killed only by their listed pins" (run 6, and the committed rows for MU20 and MU21).

## 7. Test quality

- **Bar 1 and bar 10.** Each new test catches a plausible bug that no other test in the seven files catches. MU22, MU23 and
  MU24 each fail only their own pin (run 6). The general pin also catches PX3, which neither the differential nor any other test
  sees.
- **Bar 4.** The expected values are literals: `'a       d'`, `{ reason: 'unclosed-fence', line: 1 }`, and
  `{ form: 'script-element', line: 1, column: 3 }` / `column: 12`. The general pin derives each case from the code unit, and its
  expected value is the literal empty list.
- **Bar 7.**
  - The general pin's failure lists every kept unit in hex ("expected [ 'b', 'c' ] to deeply equal []"), so it fixes round 2's
    N7(a).
  - The fence row's failure does not (N3).
  - The position pin's first failure line, "expected [ …(2) ] to deeply equal [ …(2) ]", is elided by vitest, but the full diff
    follows it, and the test name says "line 1".
- **Workflow 2, a one-line bug each new test misses but should catch:**
  - the fence row misses a closer that tolerates VT or FF (PX1);
  - the position pin misses `positionOf` counting U+2029 or VT (PX4, PX5);
  - the general pin covers the inline-span position only, so it catches neither (N1).
- **Weakening the pins (rule 6 over the tests).** TX1, TX4 and TX5 each survive, so the units and positions each pin names are
  what kills its mutant. TX2 is still killed, since the F1 pin and the fence row see U+2028 without the general pin. TX3 and TX6
  are still killed: the reason alone kills MU23, and the line alone kills MU24 ("AssertionError: expected [ 2, 2 ] to deeply
  equal [ 1, 1 ]").
- **Cost.** The general pin takes 97.9 ms of the unit file's run at head (`head-seven.json`). The candidate pins in N1 cost
  about the same each.

## 8. Cleanup

- Deleted: every scratch clone (the reviewed-commit clone, the clones at `f7ea8584`, `d621bfa2` and `497515ae`, the merge clone,
  and the battery clone) and every TMPDIR `/tmp/r544c-0` to `/tmp/r544c-10`, with all their logs. `ls -d /tmp/r544c-*` returns
  0 entries. I deleted nothing else in `/tmp`, and killed no process.
- Not kept: governance, quotation, typecheck and `npm ci` logs, and the PR body; their result lines are quoted above.
- One tool, `tools/fidelity.py`, had a typed `\ufeff` escape turned into a literal U+FEFF by the shell heredoc (the brief's
  warning). It counts the same character either way. I restored the escape after the run, so its hash below is of the fixed
  file. Every kept file now holds 0 U+00A0 and 0 U+FEFF.
- Kept, under `rev-544-r3/`, 28 files besides this raw (no file over 300 KB):

| path (relative to `rev-544-r3/`) | sha256 |
|---|---|
| `base-seven.json` | `6a4c20482119db1bfacc0f1445d7a24f186afe8a343be89edb075eff40f53637` |
| `candidate-pins-out.json` | `ba52f80dede326c1cf2e54abd894d3a7385cf28402a0676e7e3df3e92cbf32e5` |
| `diff-mutants-out.json` | `f09b525aaa44cfea85fec734cb06789d3a4bef33125832c7a5027a22e1dff363` |
| `fidelity.txt` | `cbd9fed11f6fcfd0821b44503d768fc7e3b07d98914226e4a54bce48b7dd40ab` |
| `full-suite-summary.json` | `d6825bc5467d61152c3894fbf6714425e936e660b2e0a2da1c3d9b31806cd966` |
| `head-seven.json` | `51c7eea0b27ba84e81b14820a54a0ac35ae8666433fe071ae126c1a3c1bf60f4` |
| `main-changed-closure.txt` | `389a98a8edd6bf6decd0f8c7d52461fc5beb6a4778d8310aac64dca0a13f675c` |
| `merge-seven.json` | `18460a06032c25b567344ddc481b0f1f1d4536bf49155b45457d5bf756c4dafe` |
| `mutants-r3-out.json` | `f20c19a5c8121d28c500337fbfc8af253721619f713b2f1169018e7e7fcd4c89` |
| `official-mutants-rerun.json` | `8995bc6fa6a49bb98aa4ae6cc1c783d56df681d49869b76cc7bb305bb83f6d7a` |
| `official-mutants-rerun.log` | `8de7403b43d2912c6a2d013722a5750538cbc8f13fa9c58eab73b33b0ef1c8fa` |
| `opener-probe-out.json` | `0f31221525b99edee0be2277575386fa09222c5903330b29403f1887447965ac` |
| `px1-probe-out.json` | `a7c14552c8934e3211cab3ffb89f83caef28baa0c394f267e6b4c7947c397c21` |
| `slice-rebuild-out.json` | `9bb3ca51bf59b5da0206a259825d7798e7a650e20ad9e4cba0de1e44fc1600a8` |
| `tools/battery-run.py` | `79b593f2817121a2796e2620909d2c619006763b6da1ed5d2cf5b88c7a58b119` |
| `tools/candidate-pins.py` | `79475ad9a06a939d9b0d9a4e13144a54d28542e13e45ad93b4ed6cdf96d68f1f` |
| `tools/candidate-pins.test.ts` | `a378b46ccb00af3e8e510c9138ae9e0582811988a364754ad067dcd59f21b0ac` |
| `tools/diff-mutants-r3.mjs` | `5250e75e519b253f6f324ba24d7722e51277308f4ad4f97b565fd8f54606982c` |
| `tools/fidelity.py` | `08161f273b79e45468757bc048bc18eba5f26d796b3df0351ddf44a900ba2841` |
| `tools/import-closure.py` | `1b10fe5c2851e8d998ec898af903cd8d519eece61d284419a94e3bd803439ea7` |
| `tools/mutants-r3.py` | `7c5842dfedcb1951c2d50bd705a1204b352ae8f1d3ef0f2af5e44f30a9631df9` |
| `tools/name-delta.py` | `b83af7dbff82199cdb6831c717370e1993aa4b1c2ec5d316911a1a12cfca5d28` |
| `tools/opener-probe.mjs` | `23fccfaf454d34e6fe47b47e44f9a3fa1fe497273020390e3bcc9616254aa6c6` |
| `tools/px1-probe.mjs` | `32b5e3f7ad4efcdc9c9181c99efd4a234b0a92abfb9b6dd613e71c530f6ab2d0` |
| `tools/record-verify.py` | `1ce0294cbfd93f04e7008de289f3ae5808df810e63fa366d7b62d90a0e20215c` |
| `tools/run-seven.sh` | `fe6c2df0ece8c931e1de652d85de54f743fb71bc45e669351efe651bef26c647` |
| `tools/slice-dump.py` | `50200646069090af6b7f6f0740418cecf76c9e54e729b4a20bcc245484e2b664` |
| `tools/slice-rebuild-r3.mjs` | `c85f61684e53378b6de1c8bee45b63aa460e2553666bf7c34357fed592c13b79` |
