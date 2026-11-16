# R-GP-IMPL-CRLF-MASK-1 — CC-REV-1 implementation review of syzygy-bpyt.16, round 1
Verdict: REVISE
Reviewed commit: c399eda9
Subject: r1-review.diff sha256 35771aae39a2c8426c1c340bded03db50a4957c22ff9340890a6d083b2b38aee

Reviewer: rev-544, an independent fresh-context reviewer. I did not write this change and did not change it. Every run below
was made on 2026-10-27 between 15:28Z and 16:18Z, in a scratch clone of the Syzygy repository. I read no body of Butlers or of
any other observed repository. Every text measured is synthetic.

Why the verdict is REVISE: one blocking finding, F1. A mutant that widens the predicate this PR adds, `LINE_END`, survives the
whole test suite and the PR's own differential, and it changes LF decisions. Among them is a script element that the head
refuses and the mutant admits. The ruling says "no change to LF behaviour", and GP-Q0 asks for "a rule-6 mutant for each
predicate". So this is a real gap. It is closed by one pin, which I verified, and three rows in the lane's mutant script.
Everything else is a note (N1–N7). On every corpus I measured, the change stays inside the owner's ruling: no LF decision
changed, and every CRLF, CR or mixed text decides exactly as its LF form.

## 1. Subject identity checks

Every digest in this section is computed by script (rule 3).

- [Observed] Subject file: 512,083 bytes, sha256 `35771aae39a2c8426c1c340bded03db50a4957c22ff9340890a6d083b2b38aee`. This
  matches the brief. `git diff f7ea8584 c399eda9` hashes to the same digest, and its bytes are equal (`equal True`).
- [Observed] The nine-file diff, `git diff f7ea8584 c399eda9 -- . ':(exclude)docs/evidence'`, has sha256
  `2d94016e2bb1f2e9c1772e62de7439d6b0ff1441c03c915fb193f4a504fd8b57`. This matches the brief.
- [Observed] `--shortstat`: "35 files changed, 12553 insertions(+), 73 deletions(-)". For the nine: "9 files changed, 397
  insertions(+), 73 deletions(-)". The nine files are the ones the brief names. Of the 35 paths, 0 are under `.syzygy/` or
  `openspec/`. The other 26 are all under `docs/evidence/syzygy-bpyt-16/`, the only evidence directory the diff touches.
  Nothing under `docs/evidence/syzygy-bpyt-6-3/` changes.
- [Observed] The production file `packages/three-surface-poc-core/src/markdown-code-context.ts`:
  - at `f7ea8584`: 6,084 bytes, sha256 `a02c105a483d11a9e90d27aade01ef5ddee6b60b9e165a9a7193c5baaa21f8fe`, the same as at
    `d621bfa2`;
  - at `6928b50a` and at `c399eda9`: 7,465 bytes, sha256 `93b95f6d4eabc440344404d01040ba1f10bdceb65e69ab74c4ea59c1fa5831f7`.

  These equal the record's `subject.productionFile`.
- [Observed] Built `dist/markdown-code-context.js`: base `27975814d7f8310f68c6937eebf6c4db60c8cbf2fe2d0f1e6db72f62f31df00c`,
  head `6e22d480bcbf855ecc174c1a8fe4c1701806ab7adfa0aee97b01ddf61af8a38a`. These equal the record's `subject.builtModule`.
  `dist/git-object-reader.js` is byte-identical in my two builds
  (`0aef74669d3d7dec89caea2fe370ffb91ce9c584102faae1342dfaea3e8a1002`).
- [Observed] Between `6928b50a` and `c399eda9`, the mask is unchanged. `git-object-reader.ts` changes by "1 insertion(+), 11
  deletions(-)", which is main's `decodeUtf8` import. The bodies of `positionOf` (`git-object-reader.ts:175-185`, counting
  `charCodeAt(i) === 10` only) and of `scanActiveContent` are unchanged.
- [Observed] On origin, `agent/syzygy-bpyt.16` was `c399eda908a3d549e051f45499557e82356af9ab` at 16:17Z, and the PR is OPEN.
- [Observed] The record's `files` table: all 25 rows verify (bytes and sha256), and the `changedFiles` digests verify.
  `vet-v-crlf-mask-1/` is byte-identical to the vet's directory, 13 of 13 files. The vet's raw (`V-CRLF-MASK-1-RAW.md`) is
  not in the tree, as the PR says.
- [Observed] **Main moved.** At 16:17Z, origin `main` was `a403b902`, the merge of PR #541's head `d15d6bb5` into `f7ea8584`.
  Main changed 164 paths since `f7ea8584` (`main-changed.txt`). The PR has 35 paths (`pr-paths.txt`). They share 0 paths.
  PR #543's head `bcd0c034` (`pr543-paths.txt`) shares none either. PR #543 is not on main yet.

## 2. Clauses relied on (quoted), and the class ruling

**The authority.** `bd comments syzygy-bpyt.1.14`, the comment headed "[owner ruling, recorded by coord-9297eba3 on
2026-10-27]", paragraph "What this authorizes":

> inside maskMarkdownCodeContexts, a line ends at CRLF, CR or LF, and the split keeps every terminator and offset. Over the
> vet's corpus this changes what the gate accepts and refuses exactly as follows: CRLF and bare-CR texts get the LF decision
> (fail-open positions excluded, false fail-closed exclusions admitted), and every LF decision is unchanged. It authorizes
> nothing beyond that: no spec or policy byte change (the optional PWB-REQ-006 clarifying sentence was not chosen), no other
> reader (G2–G4 of PR #533 stay open), and no change to LF behaviour.

**The bead** (`bd show syzygy-bpyt.16`), scope item 1: "Implement the split in maskMarkdownCodeContexts so that length and
every offset are kept (positionOf and the reported finding positions unchanged). Do not normalize at the scanner's entry,
which would renumber findings in bare-CR files." Scope item 5: "Rule-6: run MU1–MU6 and every new predicate's mutant against
the committed patch, recording each mutant's old/new fragment and commit."

**PWB-REQ-006.** [Observed] `DIRECTIVE-REGISTER.md` has no `PWB-REQ` row: 0 hits over its 891 lines. I found the clause by
its identifier in
`openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`. The heading is at
line 788. Lines 794-796:

> It SHALL NOT follow absolute paths, traversal, NUL-bearing paths, working-tree symlinks or submodules; execute observed
> content; or emit active HTML, SVG, scripts, event handlers or unsafe URL schemes.

Lines 805-808: "Outside inert-code contexts, an HTML element, comment or declaration; SVG; script; event-handler attribute;
or an unsafe `javascript:`, `vbscript:`, `data:` or `file:` scheme in a Markdown destination, autolink or HTML attribute
SHALL exclude the whole source." Lines 810-817:

> **Code-context profile.** Code contexts SHALL use this exact UTF-8 line-oriented profile.
> - A fenced opener is zero to three spaces followed by at least three identical backticks or tildes; a closer is zero to
>   three spaces, the same character repeated at least the opener length, then spaces only.
> - A backtick opener's trailing info text SHALL contain no backtick.
> - The first qualifying closer ends the fence; an unclosed fence or invalid backtick info string is malformed and excludes
>   the source.

**SEC-3**, `.syzygy/governance/doctrine/security.md:61-62`: "**SEC-3 — Observed code is untrusted, everywhere.** Syzygy runs
observed-project code only inside an explicit, opt-in execution profile."

**CC-REV-1**, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
- Lines 18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- Lines 31-32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- Lines 35-36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);"
- Line 37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Lines 40-41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- Lines 45-46: "**Class membership is contested by default and is never finally determined by the agent performing the
  change**"
- Line 51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0**, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
- Lines 52-55:

  > - "Behavior-preserving" means none of the following changes:
  >   - a rendered byte, a wire format, a refusal string or an exit code;
  >   - a signed or digest-bound artifact;
  >   - a consent, security or retention decision.

- Lines 62-66:

  >   - **Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint.
  >   - **The checks:**
  >     - an old-versus-new differential over a mutated-record corpus that includes records with altered prose;
  >     - a rule-6 mutant for each predicate;
  >     - a non-blocking owner notice in the cycle report.

- Lines 95-96: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md** verification rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it". Rule
11: "An evidence record names its subject and the subject's digest".

**The test-rigor bar**, `git show c399eda9:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
- Lines 42-45: "**A test is worth keeping only if some plausible bug makes it fail.**"
- Lines 58-59 (bar 2): "**Every bugfix ships a regression test** — Written to fail on pre-fix code."
- Lines 60-63 (bar 3): "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error
  branches … get tests proportional to blast radius."
- Lines 64-67 (bar 4): "Expected values are literals or independently derived."
- Lines 93-97 (bar 10): "A test is worth *adding* only if it catches a plausible bug no existing test catches"
- Lines 103-105 (workflow 2): "apply the mutation thought-experiment: name a one-line bug in the code under test this test
  would *not* catch but should."

**Class ruling (mine): classes 3 and 4. Not 1, not 6.**
- [Inferred] **Class 4.** The mask decides which bytes the PWB-REQ-006 active-content scan reads. That scan is the gate that
  keeps the POC from emitting active HTML, SVG and scripts from observed content (spec.md:794-796, under SEC-3's "untrusted,
  everywhere"). A wrong mask is a fail-open of that gate. That is a security decision, "anything under SEC-1…SEC-5".
- [Inferred] **Class 3.** Which sources are admitted and which are withheld is part of the snapshot's composition. The fix
  makes one set of bytes give one decision whatever its line terminators.
- [Inferred] **Not class 1.** No write-universe, typed-authority table or adapter authorization changes, and
  `body-read-authority` is untouched.
- [Inferred] **Not class 6.** No endpoint, route, schema or wire format changes shape. Values change for CR-bearing inputs,
  and that is the class 3 and 4 content. Nothing is removed.

The PR states classes 4 and 3, which is right. So GP-Q0's three checks apply:
- The differential is present (see section 3, and N5).
- "A rule-6 mutant for each predicate" is not met for the widening direction of `LINE_END` (F1).
- The owner notice is still to come. N7 says what it must hold.

The stop clause was honoured: the change went to the owner and came back as the ruling quoted above.

## 3. What I ran, and the results

Each vitest run used its own TMPDIR (`/tmp/r544-<n>`), and only one ran at a time. Every TMPDIR and both clones are deleted.

| # | Run | Commit | loadavg (1-min, before → after) | Result (verbatim) |
|---|---|---|---|---|
| 1 | seven test files | `c399eda9` | 27.91 → 29.49 | "tests 386 passed 386 failed 0 files 7" |
| 2 | seven test files | base `f7ea8584` | 29.52 → 28.63 | "tests 332 passed 332 failed 0 files 7" |
| 3 | head's seven test files over the base production file | `c399eda9` tree | 28.73 → 31.43 | "tests 386 passed 347 failed 39 files 7" |
| 4 | seven files on a local merge with PR #541 `d15d6bb5` and PR #543 `bcd0c034` (merge `c88603d3`) | | 30.17 → 30.24 | "tests 386 passed 386 failed 0 files 7" |
| 5 | seven files on a local merge with current main `a403b902` (merge `25b6fe05`) | | 31.75 → 34.25 | "tests 386 passed 386 failed 0 files 7" |
| 6 | full vitest suite, once | `c399eda9` | 34.19 → 37.83 | "files 253 suites 893 tests 5558 passed 5553 failed 0 pending 5 todo 0 success True" / "non-passed files 0" |
| 7 | `npm run typecheck`, after `tsc -b` | `c399eda9` | | exit 0 |
| 8 | `python3 scripts/check_governance.py` | `c399eda9` and `f7ea8584` | | both: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted" |
| 9 | `python3 scripts/check_quotations.py` | `c399eda9` | | "OK    QC-1  a quotation beside a path:line locator was said by that file — 40 quotations examined in 21 of 979 .md files scanned (loc-paren-quote 3, loc-colon-quote 26, quote-paren-loc 11), 0 findings"; exit 0 |
| 10 | hosted checks, read at 16:17Z | `c399eda9` | | "checks pass 24m38s", "node pass 3m48s" |

- [Observed] Run 1 against the PR's 385: the base `f7ea8584` has 332 tests in the seven files, not the PR's 331. The extra
  one is main's BOM test. So the head has 386 = 332 + 57 − 3. In the full suite (run 6), every file passed, so no file needed
  a re-run on its own. The 5 pending tests are skipped live or browser tests.
- [Observed] Run 3: all 39 failures are tests this PR adds, matched by full name. By file: screen 2,
  content-classification 2, git-object-reader 4, markdown-code-context 17, fence-rules 10, verbatim-route 2,
  public-source-screening 2. The CRLF and the CR fixture fail at each of the five call-site modules. Quoted:
  - "verbatim route gates CRLF: the spec body is refused or served as its LF form is | Error: expected a refusal, got bytes"
  - "the project-documentation class (syzygy-2coz) CR: … | AssertionError: expected undefined to be 'active-content'"
- [Observed] **The lane's mutants** (`crlf-mask-mutants.py`, re-run at the code commit `6928b50a`, 15:37-15:43Z, load 21.51
  → 40.52). The output is identical to the committed `crlf-mask-mutants-output.json`:

  ```json
  {"codeCommit": "6928b50a49b8a06b405892de0580d7c421c52f5e", "baseCommit": "d621bfa2", "mutants": 16, "killed": 15, "survivedEquivalent": 1, "survived": []}
  ```

  Each per-mutant split (unit / fenceRules / callSites) equals the committed one.
  For example, "MU3-crlf-as-two-line-ends killed {'unit': 3, 'fenceRules': 0, 'callSites': 1}".
  - I also ran the same 16 fragments at `c399eda9` through my own runner (`reviewer-mutants-3.py`, which lists every failing
    test). The kills are the same, with 0 timeouts (`lane-mutants-at-head-full.json`).
  - MU16 is equivalent: a line can no longer hold CR or LF, because both are split points. I agree.
- [Observed] **My mutants**, RM1–RM12, at `c399eda9`, one vitest run over the seven files per mutant, then the file restored.
  The fragments and the mutated file's sha256 are in `reviewer-mutants-out.json` and `reviewer-mutants-2-out.json`. Every
  run had 386 tests.

| id | file | change | outcome | failing tests / timeouts | a failing assertion I read |
|---|---|---|---|---|---|
| RM1 | mask | the closer regex alone sees the CR of a CRLF | killed | 15 / 0 | content-classification "CRLF: a seed is excluded or kept safe as its LF form is": "expected { kind: 'excluded', …(2) } to deeply equal { kind: 'safe' }" |
| RM2 | mask | the final terminator is dropped | killed | 45 / 0 | "expected '   \n   \n   \nafter' to be '   \n   \n   \nafter\n'" |
| RM3 | mask | the opener regex alone sees a bare CR | killed | 21 / 0 | screen "CR: … withheld as active content or admitted as its LF form is": "expected undefined to be 'active-content'" |
| RM4 | mask | every CR becomes a space (length kept) | killed | 16 / 0 | "expected '   \n    \n    \nafter' to be '   \n   \r\n   \r\nafter'" |
| RM5 | mask | an inline span is reset at a bare CR | killed | 8 / 0 | "CR: the reported line counts each line end once \| Error: expected a malformed context" |
| RM6 | mask | the malformed line counts LF-bearing ends only | killed | 4 / 0 | "CR: a backtick opener whose info string holds a backtick is malformed at its own line": deep-equal failure |
| RM7 | mask | `LINE_END` also splits at U+2028 | **SURVIVED** | 0 / 0 | none |
| RM8 | reader | `positionOf` counts a bare CR | **SURVIVED** | 0 / 0 | none |
| RM9 | mask | a CRLF comes back as LF CR | killed | 11 / 0 | "expected '   \n   \n\r   \n\rafter' to be '   \n   \r\n   \r\nafter'" |
| RM10 | reader | `positionOf` counts every CR | **SURVIVED** | 0 / 0 | none |
| RM11 | mask | `LINE_END` also splits at U+0085 | **SURVIVED** | 0 / 0 | none |
| RM12 | mask | `LINE_END` = `/\r\n\|[\r\n\u2028\u2029]/g` (JavaScript's line terminators) | **SURVIVED** | 0 / 0 | none |

  The brief suggested four mutants. Each is covered, by RM1, RM2, MU2/MU4 (`\r?\n` only) and MU5 (join with `\n`).
- [Observed] **The differential re-run.** I ran `crlf-differential.mjs` over my base and head builds. Its output is
  byte-identical to the committed `crlf-differential-output.json`: both are sha256
  `32096a4be4dae8958754204a11d39f79118a1812e99b505b268c238a4da60532`. Under RM12, the differential exits 0, with C1 at 0
  failures.
- [Observed] **The vet's runner** (`vet-v-crlf-mask-1/tools/run.mjs`, unchanged).
  - Over the head build, its `summary` and `oracleDisagreeLf` equal the committed `vet-run-at-head-summary.json`.
  - Over the base build, its `summary` equals the vet's own `summary.json`. For example: CRLF payload 336, same 256,
    todayAdmits_lfExcludes 32, todayExcludes_lfAdmits 48.
- [Observed] **My recount of the delta** (`delta-recount.mjs`). The placements, renderings and tally are my own code. Only
  the 33 fence cases are read from `fence-probe.mjs`, and the 6 N2 cases are retyped from the PR's description. Output:

  ```json
  {"fenceCases":33,"fence":{"texts":8050,"refuses":202,"accepts":2705,"sameDecisionOtherFindings":945,"unchanged":4198},"n2Cases":6,"n2":{"texts":2100,"refuses":142,"accepts":449,"sameDecisionOtherFindings":867,"unchanged":642}}
  ```

  This equals the PR's table. `delta-recount-nocr.mjs` adds one tally: 1,735 of the 8,050 fence texts and 450 of the 2,100 N2
  texts hold no CR, and all of them fall in `unchanged`.
- [Observed] **My fuzz** (`fuzz.mjs`): base build against head build. The LF form of each text is computed by a
  character scanner of my own, not by a regex split. Four seeds: 544 (20,000 iterations), and 1, 2 and 3 (300,000 each),
  giving 1,230,663 texts in all. Of these, 786,600 hold no CR and 444,063 hold one; 96,554 are uniform CRLF. The pools
  include lone surrogates, U+00A0 in a fence line, and U+2028 and U+2029 as line content. The hypotheses:
  - H1: an LF text is read identically at base and head, mask and findings, positions included.
  - H2: the head mask of T equals the head mask of its LF form L, with T's own terminators put back.
  - H3: T's head findings equal L's, by form, context and malformed line.
  - H4: a uniform-CRLF text's findings deep-equal L's.
  - H5: the head mask keeps the length and every CR and LF at its offset, and every other unit is its own or a space.

  Result: `"H1fail": 0, "H2fail": 0, "H3fail": 0, "H4fail": 0, "H5fail": 0` in all four seeds. The fuzz's own rule 6
  (`fuzz-selftest.mjs`) kills 8 of 8 tool mutants, among them F6 (U+2028 as a line end, "H1fail": 4811) and F8
  (`positionOf` counts CR, "H4fail": 75).
- [Observed] **Probes** (`probe-outputs.txt`):
  - Every edge the brief lists keeps its length at head: `""`, `"\r"`, `"\n"`, `"\r\n"`, `"\r\r\n"`, `"\n\r"`, `"\r\r"`,
    `"a\r"`, a lone `\ud800`, `` "\udc00`\ud800`\r" `` and `` "`\ud800\r\udc00`" ``. Each prints `lengthKept=true`, and the
    terminators come back at their offsets. For example, ``"```\rx\r```\r" -> "   \r \r   \r"``.
  - Also run: positions (see N2), the U+2028 opener probe (N3), the widening probe (F1), the big-fence probes (N1), the
    18-id derivation by two methods, the digest-citer sweep and the separator sweep.

## 4. Findings

### F1 — blocking. Widening `LINE_END` changes LF decisions, and nothing fails

- **Severity:** blocking. It is a rule-6 gap on the one predicate this PR adds (bead scope item 5; GP-Q0 "a rule-6 mutant for
  each predicate"; AGENTS.md rule 6). The property it leaves unguarded is the ruling's own limit, "no change to LF
  behaviour", and the failure it allows is a PWB-REQ-006 / SEC-3 fail-open on LF text.
- **Evidence:**
  - [Observed] RM7 (`|\u2028`), RM11 (`|\x85`) and RM12 (`/\r\n|[\r\n\u2028\u2029]/g`) each survive, at 386 tests with 0
    failed and 0 timeouts. Load was 33.06 → 36.95, 27.40 → 27.60 and 27.60 → 29.06.
  - [Observed] `widening-probe.mjs` shows the LF decisions they change. Take an LF text with a tilde fence around a script
    element, where U+2028 separates the fence lines: the head refuses it with "script-element,script-element", and RM7 and
    RM12 admit it. With U+0085 as the separator: the head refuses it with "malformed-code-context:unclosed-fence", and RM11
    admits it.
  - [Observed] Under RM12, the PR's differential exits 0 with C1 at 0 failures, because none of its corpora holds U+2028,
    U+2029 or U+0085.
  - [Observed] `separator-sweep.py` covers 549 tracked files under `packages/` and `apps/` at `c399eda9`. 4 hold such a
    character literally or as an escape: `canonical-json-divergence.test.ts`, `recorder-template.test.ts`,
    `dossier-profile.test.ts` and `quote-locate.test.ts`. None of them puts one through the mask.
  - [Inferred] So no test in the repository can see this class.
- **Failure scenario:** a maintainer "completes" the line-end set to JavaScript's or Unicode's line terminators. That is a
  natural edit, since `.` and `$` under the `m` flag already treat U+2028 and U+2029 as line ends. From then on, an LF
  Markdown file with a U+2028 or U+0085 between fence lines changes decision. This includes admitting a script element that
  the head refuses. The seven files, the full suite, hosted CI and `crlf-differential.mjs` all stay green.
- **Proposed fix:**
  1. Add this test to `packages/three-surface-poc-core/src/markdown-code-context.test.ts`, inside
     `describe('closed-pwb-code-context-v1 — CRLF, CR and LF each end one line', …)`, immediately before the comment line
     that begins `// This test compares a rendering with another, so it proves equality, not correctness` (line 170):

     ```ts
       // Only CR and LF end a line, which leaves every LF reading as it was (syzygy-bpyt.1.14): U+2028, U+2029 and U+0085 are line
       // content, blanked inside a span like any other character. A line end widened to them would keep them in the mask.
       it('U+2028, U+2029 and U+0085 are line content, not line ends', () => {
         for (const separator of ['\u2028', '\u2029', '\u0085']) expect(masked(`a \`b${separator}c\` d`), JSON.stringify(separator)).toBe('a       d');
       });
     ```

     [Observed] (`pins-verify.txt`) With the pin inserted, the two files pass at head with "tests 122 failed 0". Under RM7,
     RM11 and RM12, each run has "tests 122 failed 1", and the failure is this test. For example: "AssertionError: " ":
     expected 'a   \u2028   d' to be 'a       d'". The source holds `\u` escapes, with 0 U+00A0 and 0 raw CR. Check the
     bytes after the Edit.
  2. Add three rows to `MUTANTS` in `docs/evidence/syzygy-bpyt-16/crlf-mask-mutants.py`, after MU16. Re-run it, and
     regenerate the output and the record:

     ```python
         ('MU17-u2028-is-a-line-end', [(LINE_END, 'const LINE_END = /\\r\\n|\\r|\\n|\\u2028/g;')], 'U+2028 ends a line: changes LF texts that hold one'),
         ('MU18-nel-is-a-line-end', [(LINE_END, 'const LINE_END = /\\r\\n|\\r|\\n|\\x85/g;')], 'U+0085 ends a line: changes LF texts that hold one'),
         ('MU19-js-line-terminators', [(LINE_END, 'const LINE_END = /\\r\\n|[\\r\\n\\u2028\\u2029]/g;')], 'the JavaScript line-terminator set'),
     ```
  3. Give C1 of the differential an LF slice that holds these characters (N5).

### N1 — note. The huge-fence `RangeError` now also reaches CRLF and CR texts

- **Severity:** note. The crash already exists for LF texts at base and at head. CRLF and CR texts now behave as their LF
  form does, which is the ruling's terms, but the owner has not been shown it.
- **Evidence:**
  - [Observed] `markdown-code-context.ts:119` reads `out.push(...pending.map(blank));`. It passes one argument per pending
    fence line.
  - [Observed] `big-fence-probe.mjs`: a closed backtick fence of 100,000 lines masks in every rendering at both builds. At
    150,000 lines:

    | rendering | base | head |
    |---|---|---|
    | LF | "THROWS RangeError: Maximum call stack size exceeded" | "THROWS RangeError: Maximum call stack size exceeded" |
    | CRLF | "masked fences=0 lengthKept=true" | "THROWS RangeError: Maximum call stack size exceeded" |
    | CR | "masked fences=0 lengthKept=true" | "THROWS RangeError: Maximum call stack size exceeded" |

  - [Observed] `big-fence-reader-probe.mjs` reads a 450,017-byte CRLF blob, under `maxBytesPerSource` 1,048,576, through
    `createExactObjectReader`. Base gives "text read"; head gives "THROWS RangeError: Maximum call stack size exceeded".
  - [Observed] `git-object-reader.ts:363-365` catches only `ParsePassBudgetExceeded` and rethrows everything else.
  - [Unknown] What the observation pipeline does with that throw. I did not trace it. The exact threshold depends on the
    engine's stack [Inferred].
- **Failure scenario:** a consented repository holds a CRLF or CR Markdown file with a closed fence of about 150,000 lines,
  for example a pasted log. At base it was read. At head, reading it throws out of the reader.
- **Proposed fix:** not in this PR. Open a follow-up bead: replace line 119 with
  `for (const pendingLine of pending) out.push(blank(pendingLine));`, and add a test at 200,000 lines in LF, CRLF and CR.
  The fix changes LF outcomes from a throw to a decision, so it needs an owner question under GP-Q0's stop clause (lines
  95-96). The landing notice names the reach (N7).

### N2 — note. One `line` field, two line models; scope item 1's parenthetical; the residual is misrouted

- **Severity:** note. This is the consequence of the ruling, not a deviation from it. The malformed line is computed inside
  the mask, and the ruling says that "inside maskMarkdownCodeContexts, a line ends at CRLF, CR or LF". That departs from the
  bead's gloss in scope item 1, "the reported finding positions unchanged", for one finding kind in one text class. The
  bead's stated reason (normalizing "would renumber findings in a bare-CR file") targets `positionOf`, which is unchanged.
- **Evidence:**
  - [Observed] Against the base, only the malformed finding's line moves. In the fuzz, position-only changes are 106,167 of
    the 444,063 CR-bearing texts, and in every seed `rowsMalformedLineDiffFromBase` equals `positionOnly` (34,818, 34,671,
    34,408, 2,270). Non-malformed positions never change against the base. [Inferred] Only texts that hold a bare CR are
    affected, because the base mask counted LF and so already counted a CRLF once.
  - [Observed] Against the LF form, the malformed line equals the LF form's (H3 includes it, 0 failures). A text whose
    terminators are only LF and CRLF reports the LF form's positions: 84,512 such texts, 0 differ
    (`mixed-crlf-positions.mjs`), and H4 holds over 96,554 uniform-CRLF texts. In a text holding a bare CR, a non-malformed
    finding keeps `positionOf`'s LF-only line and column: 6,070 fuzz rows, and 532 in the lane's differential.
  - [Observed] `positions-print.mjs`, for one text in each class:

    | text | base | head | LF form |
    |---|---|---|---|
    | `"a\r<script>x</script>"` | 1:3 | 1:3 | 2:1 |
    | `` "a\rb\r`x" `` (malformed) | 1:1 | 3:1 | 3:1 |

    So in a bare-CR text, the head reports a script element and a malformed context on different line models.
  - [Observed] No production caller reads a finding's line or column. The callers read `.length`, the forms
    (verbatim-route) and the count (`content-classification.ts:393`). [Inferred] So no rendered page shows the line.
  - [Observed] RM8 and RM10, mutants of `positionOf` that renumber every finding in CR or CRLF texts, survive the whole suite.
- **Failure scenario:** a later consumer shows finding lines, such as a refusal detail or a dossier. In a bare-CR file it
  then prints a script element at line 1 column 12 beside a malformed context at line 3. Or a later edit to `positionOf`
  renumbers every CRLF finding, which the PR body calls unchanged, and no test fails.
- **Proposed fix:**
  - (a) Pin the current reading as a GAP in `packages/three-surface-poc-core/src/git-object-reader.test.ts`, immediately
    before `describe('declared resource limits are evaluation inputs', () => {` (line 461). [Observed] Verified: it passes at
    head, and it fails under RM8 and RM10 ("expected [ …(2) ] to deeply equal [ …(2) ]").

    ```ts
    // GAP, for the line-model follow-up of syzygy-bpyt.16: positionOf counts LF only, so a CRLF text reports its LF form's positions and
    // a bare-CR text reports line 1 with the offset as column, while a malformed finding takes the mask's line, which counts every line end.
    describe('reported positions in CRLF and bare-CR texts', () => {
      it('CRLF as LF; a bare CR counted by the malformed line only', () => {
        expect(scanActiveContent('a\r\n<script>x</script>')).toEqual([{ form: 'script-element', line: 2, column: 1 }, { form: 'script-element', line: 2, column: 10 }]);
        expect(scanActiveContent('a\r<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);
        expect(scanActiveContent('a\rb\r`x')).toEqual([{ form: 'malformed-code-context', line: 3, column: 1, context: 'unclosed-inline-span' }]);
      });
    });
    ```
  - (b) In the PR body's Residuals, replace "[Observed] `positionOf` counts LF only and is unchanged (the ruling). A
    non-malformed finding in a bare-CR or mixed text keeps its LF-only line and column (532 rows in the differential); a
    malformed finding takes the mask's line, which now counts CR and CRLF as line ends. For G2 and G3." with: "[Observed]
    `positionOf` counts LF only and is unchanged (the ruling). In a text that holds a bare CR, a non-malformed finding keeps
    its LF-only line and column (532 rows in the differential), while a malformed finding takes the mask's line, which counts
    every CR, CRLF and LF; a text whose terminators are only LF and CRLF reports the LF form's positions. No production path
    reads a finding's line or column. A follow-up bead holds the line-model question; it is not G2 or G3." G2 and G3 concern the extractor and the link
    reader, not `positionOf`. The record's first `residuals` entry is not misrouted, but it also says "a bare-CR or mixed
    text". When the record is regenerated for F1, `build-record.py` should write "a text that holds a bare CR" there.
  - (c) Open a follow-up bead with an owner question: one line model for reported positions in bare-CR texts. Unifying the
    two changes reported positions.

### N3 — note. U+2028 or U+2029 in a backtick opener line departs from the profile on LF text (this predates the PR)

- **Severity:** note. The behaviour is the same at base and head, it is LF behaviour, and the ruling forbids changing it
  here. In one direction it fails open.
- **Evidence:**
  - [Observed] `` FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/ `` (`markdown-code-context.ts:66`). Its `.` matches neither U+2028
    nor U+2029; it does match U+0085.
  - [Observed] `u2028-probe.mjs`, with base and head equal in every row:
    - the one-line text ``"```" + U+2028 + "<script>x</script>```"`` is admitted (`[]`);
    - the same line without the U+2028 is "malformed-code-context:backtick-fence-with-backtick-in-info-string";
    - a tilde opener whose info string holds U+2028, followed by a script and a closer, gives "unclosed-fence". [Inferred]
      By the profile, that text is a closed tilde fence, so the profile would admit it.
  - [Inferred] By spec.md:812-815, the first line is "zero to three spaces followed by at least three identical backticks"
    whose info text holds a backtick, so the profile calls it malformed and it excludes the source. The implementation reads
    it as an inline span instead.
- **Failure scenario:** an LF Markdown file puts U+2028 right after a backtick run and a script element on the same line. It
  is admitted where the profile excludes it.
- **Proposed fix:** a new owner question and bead, since any fix changes LF decisions. One candidate is to give
  `FENCE_OPENER` the `s` flag, which is safe now that a line holds no CR or LF. Pin the three probe rows when that is done.

### N4 — note. PR body wording (the owner notice will copy it)

- **Severity:** note. Correct it in the same revision as F1.
- **Evidence and fixes:**
  - (a) [Observed] The "## Battery" section reads `BATTERY_PLACEHOLDER`. Replace it with the battery's result lines at the
    revised head, or delete the section.
  - (b) [Observed] The digest-citer sentence says "6,064 tracked files" but not that the population excludes
    `docs/evidence/syzygy-bpyt-6-3/`. The record does say so (`population`: "6064 tracked files at the population commit,
    excluding docs/evidence/syzygy-bpyt-6-3/"). At `6928b50a` there are 6,103 tracked files, 39 of them in that directory.
    At `c399eda9`, the base digest has 22 citers over 6,652 tracked files, and two methods agree:
    - 8 under `fence-rules-review-2026-10-27/`;
    - 9 under `syzygy-bpyt-6-3/`;
    - 4 under `utf8-canonical-review-2026-10-27/`, which came with main;
    - 3 in this PR.

    None is an act, a manifest, an acceptance record, or a `.syzygy/**` or `openspec/**` file. Replace the bullet's text
    after the file name with: "(`digest-citers.py` of `syzygy-bpyt-6-3`, 6,064 tracked files at the code commit excluding
    `docs/evidence/syzygy-bpyt-6-3/`, two methods agree): the new digest of the edited file is cited nowhere; the base
    digest by 8 retained fence-rule review measurement records under `docs/evidence/fence-rules-review-2026-10-27/` (and,
    outside that population, by 9 `syzygy-bpyt-6-3` evidence records), and by no act, manifest, acceptance record,
    `.syzygy/**` or `openspec/**` file."
  - (c) [Observed] The test counts "331 → 385" are true at the code commit. At the reviewed merge commit, the seven files
    hold 332 → 386 (main added one). Append: "(332 → 386 at the merge commit, the extra test being main's)."

### N5 — note. The differential tool

- **Severity:** note.
- **Evidence:**
  - [Observed] It takes two `dist` paths, not commits. It records the digests of `markdown-code-context.js` only
    (`baseDistModule`, `headDistModule`), not of `git-object-reader.js`, which holds `scanActiveContent` and `positionOf`.
    `positionOf` is C4's subject. So by rule 11, the record cannot be re-checked against the reader bytes it measured. In
    this case those bytes did not change between the commits it names [Observed, section 1].
  - [Observed] Its selftest has one mutant per check (S1–S4). By its own header, only S1 and S4 isolate their predicate.
  - [Observed] No mutant and no oracle cover the delta tallies (refuses, accepts, other finding, unchanged), which the owner
    notice will quote. My independent recount (section 3) matches them.
  - [Observed] It passes under RM12, so it can pass with a wrong mask.
- **Proposed fix (follow-up bead):**
  - record both modules' digests;
  - add an LF slice whose lines hold U+2028, U+2029 and U+0085, at fence and span positions, so C1 sees a widened split;
  - add a selftest mutant over the tally (for example, swap refuses and accepts) with expected literal totals.

### N6 — note. Test-quality details

- **Severity:** note.
- **Evidence:**
  - (a) [Observed] `fence-rules.test.ts:199`, "the extractor and the profile hold one line model…". Its 18 ids are right: I
    derived them by two methods (`eighteen-ids.py` and `eighteen-ids.mjs`), and both give the same 18. But the test is
    entailed by other tests:
    - for those 18 cases, `extraction === profile` holds as LF literals;
    - "links, extraction and the renderer read CRLF exactly as they read LF" pins extraction under CRLF to the literal;
    - the equality describe pins profile under CRLF to the same literal.

    At base it fails only through the shared `readers.profile` skeleton check ("AssertionError: the mask keeps the le…").
    What it adds is the pinned id list.
  - (b) [Observed] The equality describe ("the profile and the gate read every rendering as the LF text is read") runs all
    33 cases inside one test per rendering, so a failure names only the first case (bar 7).
- **Proposed fix:**
  - (a) Under bar 10, keep the test as a population pin, and say in its comment that it is one, or drop it.
  - (b) Use `expect.soft` in the loop, or `it.each` over rendering × case.

### N7 — note. What the landing owner notice must state (GP-Q0 lines 62-66)

- **Severity:** note.
- **Evidence:** GP-Q0 lines 52-55 count "a refusal string" and "a consent, security or retention decision" as behaviour.
- **Proposed content:** besides the PR's accept/refuse table, the notice should state:
  1. [Observed] 2,046 corpus rows stay refused with another finding set. The verbatim refusal and the phase-A detail change
     for them. [Inferred] 218 of them keep the same malformed form and differ only in its line: 214 are
     `unclosed-fence → unclosed-fence` and 4 are `unclosed-inline-span → unclosed-inline-span`.
  2. In bare-CR texts, the malformed finding's line is renumbered, and only that finding's (N2).
  3. The huge-fence `RangeError` now reaches CRLF and CR texts (N1).
  4. All figures are over synthetic corpora. The effect on real sources is [Unknown].

## 5. Every changed output: the measured accept/refuse delta against the PR's table

- [Observed] The PR's table is exact over its corpora. Per row:
  - Vet: the head run of the vet's runner equals the committed summary, and the base run equals the vet's summary, so the
    rows vet CRLF (32 refuses / 48 accepts, controls 7 / 5), vet CR (32 / 44, 7 / 3) and the variants (4 / 44, 1 / 9)
    stand as the vet measured them.
  - Fence and N2: my own recount equals 202 / 2,705 / 945 / 4,198 and 142 / 449 / 867 / 642 (refuses / accepts / other
    finding / unchanged).
  - Totals, computed: refuses 83 + 202 + 142 = 427; accepts 153 + 2,705 + 449 = 3,307; other finding 234 + 945 + 867 =
    2,046; unchanged 434 + 4,198 + 642 = 5,274. These sum to 11,054, the differential's population.
  - The record's `changedOutputsByClass` has 17 rows, and they sum by kind to refuses 427, accepts 3,307 and
    sameDecisionOtherFindings 2,046. These equal the PR body's per-class figures (86 + 193 + 94 + 54 and 1,303 + 1,775 +
    229).
- [Observed] Over the 1,230,663 fuzz texts, every change is a CR-bearing text moving to its LF form's decision (H3, 0
  failures). The base-to-head kinds over the 444,063 CR-bearing texts are: refuses 24,969, accepts 5,024, same decision with
  other findings 89,709, position only 106,167, unchanged 218,194. Over the 786,600 LF texts, 0 changed (H1).
- [Inferred] The PR's figures describe its synthetic corpora, not a population of real sources. The PR says so ("[Unknown]
  How many real sources the exclusions change").

## 6. Verdicts on the six scope items, and on the ruling

1. **The split: met.**
   - [Observed] `splitLines` returns each line without its terminator, plus the terminator beside it, and the join is
     `line + (terminators[index] ?? '')`. Length and every offset are kept: H5 held over all 1,230,663 texts, and every
     listed edge passed.
   - [Observed] `blank()` is `' '.repeat(segment.length)`, which is correct now that a segment never holds a terminator.
     MU16 is equivalent.
   - [Observed] The inline-span logic sees the same line sequence as the LF form (H2, 0 failures over 444,063 CR texts).
   - [Observed] Nothing is normalized at the scanner entry, and `positionOf` is unchanged.
   - The malformed-line renumbering in bare-CR texts is N2.
2. **Pins: met.**
   - [Observed] The vet's P1–P7 map to the new describe: the opener malformed at its own line, the two tilde fences, the
     closed tilde fence, the CR variants, the fence closed on the last line, the mask skeleton, and the comparison over every
     case. All 17 of the describe's CRLF, CR and mixed tests fail at base, and all 7 LF variants pass there.
   - [Observed] The second line-number pin, "the reported line counts each line end once", fails at base for CRLF and for
     CR. It is one of the line-pinning tests that kill MU3 and MU15.
3. **Call-site fixtures: met.**
   - [Observed] There is a CRLF and a CR fixture at each of the five modules: screen, content-classification,
     git-object-reader (two pairs), verbatim-route and public-source-screening. Each fails at base (run 3).
4. **Extractor-equals-mask: met, weak.**
   - [Observed] The 18 ids are confirmed by two methods.
   - [Observed] The test is real, in that it fails at base, but it fails there through the shared reader, and it is entailed
     by other tests (N6a).
5. **Rule 6: not met in full.**
   - [Observed] MU1–MU16 re-run identical, and every kill I rely on is a real assertion, with 0 timeouts in every run.
   - The widening direction of `LINE_END` has no killing test (F1).
   - `positionOf` is not this PR's predicate, but its CRLF and CR readings are unpinned (N2).
6. **Differential: met over its corpora.**
   - [Observed] C1–C4 have 0 failures, and the re-run is byte-identical. No LF row changed, and every CRLF and CR row
     equals its LF row.
   - Its corpora cannot see F1's class (N5).

**The ruling: inside it.**
- [Observed] Every changed decision I measured moves a CRLF, CR or mixed text to exactly its LF form's decision.
- [Observed] 0 LF decisions changed, over three populations:
  - 786,600 fuzz LF texts;
  - the lane's 1,825 distinct LF forms;
  - the LF variants in the seven test files, where the 33 `$id` rows' LF columns are unchanged.
- [Observed] No spec, policy, `.syzygy/**` or `openspec/**` byte changed. The only production file is the mask, so the
  extractor, the link reader and the consent reader are unchanged. The GAP G2/G3 rows at head measure them as before: links
  30, extraction 33.
- [Inferred] Mixed texts fall within "a line ends at CRLF, CR or LF", which is a rule about each line end, not about uniform
  texts. The vet's corpus already held 145 mixed and trailing-CR rows. [Observed] Their decisions equal the LF form's: C2
  over 11,054 texts, and H3 over 444,063.
- [Observed] `AGENTS.md`: the edited fence bullet is true at head. It says "The profile's mask ends a line at CRLF, CR and
  LF and keeps every terminator", and that "the extractor and the link reader split at LF only, which G2 and G3 (open owner
  questions) decide". G2 and G3 are open by the ruling's "G2–G4 of PR #533 stay open". It cites a record that exists.
  - (The extractor also drops one trailing CR. The bullet omits that, but it is not false.)
  - The `fence-rules.test.ts` header no longer calls G1 open.

## 7. Test quality

- [Observed] The delta: +57 −3 by full name, with 33 changed `$id` rows.
- [Observed] Bar 2 is met: 39 of the 57 added tests fail at base.
- [Observed] 52 of the 57 fail at the base or under at least one of 28 mutants (MU1–MU16, RM1–RM12). That is
  `kill-matrix-full.py`; the 5 tests whose 140-character key is shared were resolved by full name in the base run.
- [Observed] 5 added tests never fail:
  - the population test;
  - "links, extraction and the renderer read CRLF exactly as they read LF";
  - the three GAP G2/G3 tests.

  They pin readers this PR does not change, and they would fail on a G2 or G3 fix. So they pass the core rule as change
  detectors.
- [Observed] Expected values are hand-typed literals (bar 4). The one comparative test says that it proves equality only.
- [Observed] Bar 3 is met for the final terminator, a mix of terminators, and both directions of the fence change. It is not
  met for the line-terminator characters outside CR and LF (F1), or for positions in CR texts (N2).
- The three removed tests:
  - [Observed] "GAP: a CRLF source is admitted where the same LF source is excluded…" asserted the LF text
    `['malformed-code-context']` and the CRLF text `[]`. It **flips**, not vanishes, into "G1, fixed: a CRLF or CR source is
    excluded as a malformed code context, as the same LF source is". The new test asserts the full finding,
    `{ form: 'malformed-code-context', line: 1, column: 1, context: 'backtick-fence-with-backtick-in-info-string' }`, for
    LF, CRLF and CR. It also adds two "G1, fixed" tests for the admit direction and the N2 shapes. This is right.
  - [Observed] "links, extraction and the renderer read CRLF exactly as they read LF; only the profile does not" becomes the
    same body under a name without the clause that went false. This is right.
  - [Observed] "the cases cover the population this file claims: 33 cases, 152 insertion places per reader" becomes "…,
    seven renderings". It adds `expect(Object.keys(RENDERINGS)).toHaveLength(7)` and drops the length checks of the two
    removed columns. This is right.
- The 33 changed `$id` rows:
  - [Observed] Before, each row asserted nine literals: profile, links, extraction, renderer, profileCrlf, gate, gateCrlf,
    whole and wholeCrlf. Now it asserts the six LF ones. The LF columns are byte-identical at base and head: 33 rows, 0
    differences.
  - [Observed] At base, 15 rows had a CRLF literal different from their LF literal (profileCrlf 14, gateCrlf 14, wholeCrlf
    11). These pinned the defect.
  - [Observed] They are replaced by the equality describe, which requires each of the six non-LF renderings to equal the LF
    literal for profile, gate and whole. All six of those tests fail at base. This strengthens the rows; nothing is lost.

## 8. Cleanup

- [Observed] Deleted: both scratch clones (`rev-544/clone` at `c399eda9`, and `rev-544/code` at `f7ea8584`, with their
  `node_modules` and the base and head `dist` copies). Also deleted: every TMPDIR I made (`/tmp/r544-1` to `/tmp/r544-10`
  and `/tmp/r544-12` to `/tmp/r544-17`; `/tmp/r544-11` was absent when I cleaned up), and every log I was told not to keep (governance,
  quotations, typecheck, `npm ci`, stderr captures). `differential-rerun.json` is deleted too: its sha256 equals the
  committed output, as stated above.
- [Observed] No copy of the PR body is kept. Nothing in `/tmp` outside my own TMPDIRs was touched.
- [Observed] No kept file is over 300 KB; the largest is 210,313 bytes. Every tool has 0 U+00A0. The non-ASCII characters
  are an em dash in `run-seven.sh`'s comment, and the needle characters U+2028 and U+2029, which `separator-sweep.py` holds
  on purpose.
- This raw is not listed in the table below, since its own digest is reported with it.

| `<path relative to rev-544/>` | `<sha256>` |
|---|---|
| `base-prod-head-tests.json` | `e4bd3c4a4261a29921554ff87366566cec82d2682acf77fc9da36e9d141977d4` |
| `base-prod-head-tests.txt` | `23fd77361f2a24b593a0b832c458125820935b9e54a2a8d3a582423915c40fbf` |
| `base-seven.json` | `38cfbc5fedcb14688d90a5cafa9a97984c20b3661ba3fb5dd2d7d8476df728fd` |
| `full-suite.log` | `6212adf5ab6b7fcbaf091a8abc6ea724f5cbf64dd8953a40a35a16d68a30cfff` |
| `fuzz-out-544.json` | `fe005843f4ebe04a3ff587686610b6874720a304030713e8f045ec66489ad162` |
| `fuzz-out-seed1.json` | `8a6de953286de24d5f0b74cc66caaeb91f96ad8b666baf55559a528460875977` |
| `fuzz-out-seed2.json` | `74dda9e7a82120a3274ac126dadb1f7a100d6863ce1928f1a0f13d1d4766e192` |
| `fuzz-out-seed3.json` | `c567e5aa06bf239fcdc600afa8bb4c93f92597d11c09f4c47aa1d823e2e5ab6f` |
| `fuzz-selftest-out.json` | `e45ddc3ef523dd739b911f7045319bf422fdca02adf5dea9cd46b85d71dca538` |
| `head-seven.json` | `6114417467e2ff13cd41dfba618b6bbc13bd78310963f8bb089f62d28c95c50c` |
| `lane-mutants-at-head-full.json` | `6761bf60caba47df959b41b8d17e1c80a6dbf4d509582fda0ce75f9cf5349f8d` |
| `lane-mutants-rerun.json` | `14096fe41c6182672da5e161543dd0586a38c9d20203085ac2ab3025085fa411` |
| `lane-mutants-rerun.log` | `44744148b6402ad670225bb223b863945cc4ed81ba6c589a6b35a9cc78caa250` |
| `main-changed.txt` | `185e563f91d7c9257a1d5297b42452ed64df937d950c0fed4739ee04c15d1ed0` |
| `merge-main-seven.json` | `07e759ee0b1e9ba7f5967ba14fde5b5d4b35c4820eecc104c319767970453043` |
| `merge-seven.json` | `f37442dc791c86b16316b15fb3447978f9aeb93dc07ca870724986bfc9a920fb` |
| `pins-verify.txt` | `af22238cf86823d36dec3047f242bc7babe94628e096e217c039b418210fd91d` |
| `pr-paths.txt` | `e973fe4d1d269571c1eb082379bd2e7170e5ea3e3a6cfb33ba35d4072df6d712` |
| `pr541-paths.txt` | `185e563f91d7c9257a1d5297b42452ed64df937d950c0fed4739ee04c15d1ed0` |
| `pr543-paths.txt` | `f38380b273b5e855c1127103fb4fd805e7ab81641f23bbb534d73d4a9299af91` |
| `probe-outputs.txt` | `b8f47c3c9bdf5b8e0ebfbdf4eb7605bdc80b57bcf58ede361da693b849526c9d` |
| `reviewer-mutants-2-out.json` | `36d5f55b157d4f4c8752c8ebcc0ff0b221ed424176a51ebcf5753bff0808836f` |
| `reviewer-mutants-out.json` | `faa1ac13669a92ad4cd88ca60685317104ef6177523001c873084fee4a84e4a0` |
| `reviewer-mutants.log` | `a2879d8e1d4a4354e471763a6c23a940a728f90210690cbe5cf45efec4ef728f` |
| `tools/big-fence-probe.mjs` | `a687a404dd43fed2159d45616f30e1e84aa9fc290a858f5c8718b0785e2ec3f8` |
| `tools/big-fence-reader-probe.mjs` | `c07f05817b018afba57ece4fade7ab6f0aed6a79bd5c0427bd5e695d0648f185` |
| `tools/delta-recount-nocr.mjs` | `dbdd6d775847340f0fa6ca29f46153c4ea926f6161baf94f536782294057764f` |
| `tools/delta-recount.mjs` | `90dc52317896c1b45fa69d3b4aab21fb4179972232018ee2c320a653f90413a2` |
| `tools/digest-sweep.py` | `eeea148746935d30fbb43c6925137e81ff1396539f114164395ddc3ee51b1fd2` |
| `tools/edge-print.mjs` | `5123c41bc292d1a484c9e04618b5a4bffd8c619915daece618d35891a8921f71` |
| `tools/eighteen-ids.mjs` | `b6db9ba53c7614d58d3420c04cf301a006e8f3adbf898b3c7d917a2180998675` |
| `tools/eighteen-ids.py` | `6c97ba640262ed4735fa536ab7fa793ee2277df22f18562f16374b49022e6a90` |
| `tools/fuzz-selftest.mjs` | `3b8c9344e3a22b8e319b676d40a84764a2c423ab1e2d2b7017078df4f8372c3e` |
| `tools/fuzz.mjs` | `3394d6f9f4481c061ff62f775e79cb9c237a444ee03e6eca0fcf07e430748aa0` |
| `tools/kill-matrix-full.py` | `5e0e8340004c36b8907159c3025fa139b2e6a37fd86fcb34fa5ca88dad90a890` |
| `tools/kill-matrix.py` | `6dbc00fb5adc55a2910154510511b2cf978bc76b379e61854dd7fb8d1c53e88d` |
| `tools/mixed-crlf-positions.mjs` | `7c6c5cef1de166a025bc3a6db058be2b768af79278b8d2d7a409e5393e530fbe` |
| `tools/positions-print.mjs` | `d331555e761eac18b8673e76a78f0108a555799b7abc59d0835b68edcfdedc27` |
| `tools/proposed-pin-check.mjs` | `294509a4beb35ef40a604d137837b03136eeb319c5c958cdd579b88d2d4953a5` |
| `tools/reviewer-mutants-2.py` | `3bb00593ea4f24372fc3f1820cd954d662ed0dcd2b518990a1de7e5d3694f2c2` |
| `tools/reviewer-mutants-3.py` | `eb63ee876b9e99692f9d30279cb5de498c293d5685acdf765866a2f053c5a6b6` |
| `tools/reviewer-mutants.py` | `12d2458edd309a0fd203e5b31da1a6a7526caf17cf74c6d7463c18839360afbd` |
| `tools/run-seven.sh` | `fe6c2df0ece8c931e1de652d85de54f743fb71bc45e669351efe651bef26c647` |
| `tools/separator-sweep.py` | `1dd1f4396f8a2040fb95bfb1981d463f85877bb0107e97f4e955e040da1c972e` |
| `tools/u2028-probe.mjs` | `dc5400f78ba5f9605bd636a80951f3ca6e8df21a8e233c4337398251af72b2ee` |
| `tools/verify-proposed-pins.py` | `46e0adcf7e674f623a256ed3933e64f2a7facd7ba74acbe4c30c44db2205ead1` |
| `tools/widening-probe.mjs` | `72714482d0497e019cf712b96acbc3ec12b1b044f0eccc0f863e2df29f1dde6b` |
| `vet-run-base.json` | `4b057edeebb5a1aea58364b4ed4a8bb36b9d8631e3bacdf9775c8ebb2e6cd163` |
| `vet-run-head.json` | `b855436a7a6e09de63d5ad64831508656939eecc9cf2b81e19e415388f48d868` |
