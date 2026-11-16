# R-GP-IMPL-FENCE-RULES-1 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 3, round 1
Verdict: REVISE
Reviewed commit: 9d9c98a6
Subject: r1-review.diff sha256 399413b4fe6d0226c12cd295661cb4971ab2348d22a0640d9fe3c1416ebc397f

Reviewer: an independent, fresh-context reviewer that did not author the change. Scope: this PR's own delta over PR #530,
`git diff a5ab2b28 9d9c98a6`. No target repository content was fetched or read. Every input I fed a reader is a synthetic
fixture written in my tools, or a file of the Syzygy repository at the reviewed commit. Scratch root: `rev-533/`, which is
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-533/`. I ran everything in
scratch clones of the repository, which are now deleted.

Verdict reason, in one line: two of the four departures (G2 and G3) state their reach wrongly or only in part. An owner
question is still to be built on them, so the verdict rule's "a misstated departure or reach that an owner question would
rest on" applies (F1, F2). Everything else is notes.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` gives `399413b4fe6d0226c12cd295661cb4971ab2348d22a0640d9fe3c1416ebc397f`, the digest
  the brief names. `git diff a5ab2b28 9d9c98a6 | sha256sum` gives the same digest. `git diff --shortstat` prints
  "18 files changed, 7583 insertions(+), 5 deletions(-)". **Match.**
- [Observed] Branch heads fetched from `https://github.com/Tzeusy/syzygy.git`:
  - `agent/syzygy-bpyt.6.3-fence` = `9d9c98a6f265393fcb46dae6e1484eea097aad20`
  - `agent/syzygy-bpyt.6.3` = `a5ab2b287266e9be6b8e96b381d014cb8e73d9d4`
  - `agent/syzygy-bpyt.6.3-utf8` = `2d3f93759a28d35e7b04facb5aaebbcc29697d09`
  - `main` = `e5080f4dcdcc208127ae5dc0b915acf413df9764`

  `git merge-base --is-ancestor a5ab2b28 9d9c98a6` succeeds. `gh pr view 533` gives headRefOid `9d9c98a6…` and
  baseRefName `main` (see N11).
- [Observed] The five edited production files have the same bytes at `a5ab2b28` as at `fe3855a1` (the record's
  `baseCommit`), and the same bytes at `9d9c98a6` as at `7e58cd1f` (the record's `codeCommit`). Their sha256 values equal
  the record's `sourceSha256Base` and `sourceSha256Head` rows, so the record's comment-only rows apply to this delta.
- [Observed] The PR's own first-parent non-merge commits after `7e58cd1f` are `bf4216ce`, `55db7ab2`, `d21e8526`, `f10d345a`
  and `9d9c98a6`. They touch only `docs/evidence/syzygy-bpyt-6-3/`.
- [Observed] The PR body's stack claim holds. `git diff --name-only a5ab2b28 8883d856` lists 18 paths, all of them among the
  96 paths of `git diff fe3855a1 f10d345a`. Each has the same blob except `AGENTS.md`.
- [Observed] **The sibling PR #534.** `git merge-tree --write-tree --name-only 9d9c98a6 2d3f9375…` exits 1 with
  "CONFLICT (content): Merge conflict in AGENTS.md" and "Auto-merging packages/three-surface-poc-core/src/project-shape-manifest.ts".
  - `project-shape-manifest.ts`: the two PRs change different lines. #533 changes line 175 (the `stripFences` signature
    comment) and #534 changes line 332 (the `canonicalJson` comment). The file auto-merges.
  - `AGENTS.md`: the two PRs touch the same place. #533 inserts 7 lines after line 190 (`@@ -190,0 +191,7`). #534 inserts
    5 lines at the same point (`@@ -190,0 +192,5`) and also rewrites lines 184-187. The result is a textual conflict. The
    second landing must keep both bullets and then re-run `check_governance.py`.
- [Observed] **Main since `546f1ff0`.** `git diff --name-only 546f1ff0 e5080f4d` lists 204 paths: 201 under `docs/` and 3
  outside it (`packages/polaris-dossier/src/argv.test.ts`, `packages/polaris-generation-core/src/workspace-reach.test.ts`,
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`). `comm -12` against the 18 subject paths finds 0 in
  common. **No overlap.**
- [Observed] **Registry-bound files.** Both are absent from the diff, and their sha256 values are equal at `a5ab2b28` and
  `9d9c98a6`: `packages/polaris-dossier/src/git-object-reader.ts` is `9f33e5fb…` and
  `packages/three-surface-poc-core/src/project-shape-observer.ts` is `9ff21517…`.
- [Observed] **Hosted checks at `9d9c98a6`.** `gh api …/commits/9d9c98a6…/check-runs` gives `checks completed success` and
  `node completed success`.

## 2. Clauses relied on, and the class ruling

CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `9d9c98a6`:
- :18-19 "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- :31 "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- :35 "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37 "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40 "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :51 "**A reviewer or the owner** may reclassify at any time."

GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, at `9d9c98a6`:
- :52-55 "\"Behavior-preserving\" means none of the following changes: a rendered byte, a wire format, a refusal string or an
  exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- :62 "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- :95-96 "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

The clauses the record quotes: I checked all 14 quoted blocks by script (`tools/check_record.py`). Each equals its cited
lines at its `readAtCommit` and at `9d9c98a6`, 28 of 28 comparisons. The ones I rely on:
- PWB model spec `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md`, :810-813:
  "**Code-context profile.** Code contexts SHALL use this exact UTF-8 line-oriented profile. - A fenced opener is zero to
  three spaces followed by at least three identical backticks or tildes; a closer is zero to three spaces, the same character
  repeated at least the opener length, then spaces only."
- The same spec, :142-143: "a heading is an ATX heading written at column 0 outside fenced code".
- `docs/PWB-IMPLEMENTATION-PLAN.md` :130-132: "The manifest's index-link grammar is a closed rule under
  `pwb-discovery-v1-candidate.3`: inline links and reference definitions outside fenced blocks and code spans".
- Not a clause, but the extraction module's own stated invariant, `packages/three-surface-poc-core/src/project-shape-extraction.ts:14-17`:
  "Any grammar failure — a missing heading, a malformed row/list/TOML, a duplicate key within the source, an ambiguous leading
  label — makes the whole source's item denominator Unknown. A source never yields a partial item set."

A wider governed sweep of my own (`tools/governed_sweep.py`) covered the lane's population of 835 files at `9d9c98a6`, with 0
unreadable. Its regex was `CRLF|carriage|line[- ]ending|line terminator|\\r\\n|code span|inline code|inline span`. It
found 57 files with a hit. [Observed] None of them states a line-terminator rule for the profile, or a fence or code-span
rule for the link, extraction or consent readers, beyond the clauses the record already quotes. That supports the record's
"none states the rule" verdicts.

**Class ruling (mine).**
- Classes 1, 3 and 4 are touched, and I agree with the author.
  - Class 4: the edits sit in the active-content gate's mask (`markdown-code-context.ts`), and the new test pins that gate.
  - Class 3: `project-shape-extraction.ts` and `project-shape-manifest.ts` compose the observed shape.
  - Class 1: `package-reader.ts` decides whether owner consent acts are in force, which is adapter authorization.
  - All five production edits are comment-only, by two methods (section 5).
- Class 6: none. Nothing is exported, renamed or added to an interface. The AGENTS.md bullet is not an interface.
- Classes 2, 5 and 7: none.
- **GP-Q0.** [Observed] Nothing a gate accepts or refuses changes. The edits are emit-equal 5 of 5 and comment-only 5 of 5
  line by line. The probe at the base and at the head is byte-identical apart from the probe-independent fields, with 0 of 66
  cases and 0 of 8 inline rows differing. The stop clause (:95-96) is not engaged by this PR. It is engaged by G1's fix,
  which the owner has ruled.

## 3. What I ran, and the results

All in scratch clones at `9d9c98a6` (and at `a5ab2b28` for the base probe), after `npm ci`, with a private TMPDIR.

1. **Identity checks** (section 1).
2. **`fence-rules.test.ts`, 5 runs.** Each printed "Test Files  1 passed (1)" and "Tests  46 passed (46)".
3. **`npm run typecheck`**: exit 0.
4. **`python3 scripts/check_governance.py`**: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted".
5. **`python3 scripts/check_quotations.py`**: exit 0 (last notes kept in `check-quotations.log`).
6. **Vector re-derivation by reading the code.** I traced, by hand, each reader's code over the inserted-probe texts. The
   cases traced were `backtick-indent1`, `backtick-indent2`, `backtick-indent3`, `backtick-indent4`, `backtick-tab`,
   `tilde-col0`, `tilde-indent3`, `tilde-indent4`, `opener-four-closer-three`, `closer-longer`, `closer-indent1`,
   `closer-indent3`, `closer-indent4`, `closer-trailing-space`, `closer-trailing-tab`, `closer-trailing-tab-then-closer`,
   `closer-with-info`, `closer-longer-with-info`, `closer-with-text`, `closer-other-char`, `tilde-fence-backtick-line`,
   `tilde-opener-four-closer-three`, `info-string`, `backtick-info-with-backtick`, `tilde-info-with-backtick`, `unclosed`,
   `empty-fence`, `two-backticks`, `blockquote`, `list-item` and `two-fences`, together with 5 inline rows
   (`inside-double-span`, `unclosed-span`, `double-span-with-inner-backtick-before-link`,
   `double-span-with-inner-backtick-around-link`, `backslash-before-delimiters`).
   - Across these cases I covered all four readers, LF and CRLF, and the gate. That includes every case the record calls a
     departure: G1's 3 fail-open cases and its fail-closed tilde cases, G2's 7 cases, and G3's 4 cases and 2 inline rows.
   - [Observed] Every vector I derived equals the test's literal. **No pin disagrees with the code.**
   - The mechanisms the literals rest on:
     - CRLF `"```\r"` fails `FENCE_OPENER`, because `.` does not match CR and `$` has no `m` flag, so the inline-span rule
       reads the line.
     - `stripFences` admits a tab (`\s{0,3}`) and closes on any opener-shaped line.
     - `parseDoc` recognises a fence only at column 0, and its closer is `trimEnd() === fence` or a backtick/tilde-only line.
     - The renderer normalises `\r\n?` and closes on `\s*$`.
7. **G1's figures.** Summed by hand from the derived vectors, then confirmed by the probe: CRLF admits what LF excludes at 6
   positions (`closer-trailing-tab@1,2`, `backtick-info-with-backtick@1,2`, `list-item@1,2`), and LF admits what CRLF
   excludes at 34 (2+2+2+4+4+4+4+4+4+2+2). 14 of the 33 `profileCrlf` vectors differ from `profile`. **All three figures
   reproduce.**
8. **`fence-probe.mjs`, at the head and at the base.**
   - At the head, my output is byte-identical to the committed `fence-probe-output.json` (`95ed7f66…`).
   - At `a5ab2b28`, after a fresh build, it is byte-identical to the committed `fence-probe-output-base.json` (`08cb1074…`).
   - `compare-fence-probe.py base head` exits 0 with "casesThatDiffer": 0, "inlineCasesThatDiffer": [] and
     "consentFunctionTextDiffers": false.
   - Tool digests: `fence-probe.mjs` is `10b6d88b…` and `compare-fence-probe.py` is `eb498c1a…`, equal to the digests
     recorded in `fence-probe-base-vs-head.json`. The record's `consentFunction.cutSha256` (`d43b89ad…`), its summary and its
     inline rows equal my output.
9. **Comment-only.**
   - `comment-only.mjs . a5ab2b28 9d9c98a6` prints "production files changed 5, comment-only 5, not 0" and exits 0; its rows
     equal the record's.
   - The recorded range `fe3855a1 7e58cd1f` gives the same result. Its output equals the record's section except that the
     record holds full commit ids.
   - Negative control `a088f1ca 9029e1cf`: "production files changed 59, comment-only 0, not 59", exit 1, and its JSON equals
     the committed file.
   - **Mutation of an edited file's code.** I changed `FENCE_OPENER`'s `(.*)` to `([^\n]*)` in `markdown-code-context.ts`
     and committed it on `9d9c98a6`. The tool printed "production files changed 5, comment-only 4, not 1", exit 1, naming
     `markdown-code-context.ts`. **The check fails as it should.**
   - A type-only mutant also passed it (N6).
   - My line-level check (`tools/line_check.py`) gives the five edits as `trailing-line-comment` ×4 and
     `inside-block-comment` ×1, exit 0. It refuses the type-only mutant (`"kind": "CODE"`, exit 1).
10. **The five comments, read.** Each is true:
    - `markdown-code-context.ts:60` "the PWB-REQ-006 profile; one of five fence rules"
    - `polaris-markdown.ts:99`, `project-shape-extraction.ts:157` and `project-shape-manifest.ts:175` "not the PWB-REQ-006
      profile; one of five fence rules"
    - `package-reader.ts:61` "(One of five fence readers, each with its own rule: …)"

    Each is descriptive and points at an evidence record. None states a rule, a permission or an authority. The
    pre-existing JSDoc beside the consent comment ("Fences follow CommonMark") is not this PR's text. The record's G4 already
    notes its CR exception.
11. **Sweep.**
    - My script re-ran the lane's predicate. At `7e58cd1f` it gives 501 files (249 non-test), 39 with a hit, 296 line hits
      and 15 production files. The production file set and per-file counts equal the record's.
    - A second method, `git grep -c -i -F -e '```' -e '~~~' -e fenc` at `9d9c98a6`, gives 39 files and 296 hits.
    - At `9d9c98a6` the population is 510 files (254 non-test), and the 15 production files are unchanged.
    - **My wider predicate** adds a backtick or tilde before a `{3` quantifier, `\x60`, ```, `.repeat`, "code block",
      "code span", "backtick", "tilde" and "info string". It finds 53 files and 21 production files. I read every hit line
      of the 6 files it adds: `polaris-dossier/src/brief.ts`, `polaris-generation-core/src/prompts.ts`, `quote-fidelity.ts`,
      `quote-locate.ts`, `three-surface-poc-core/src/walkthrough-judgment.ts` and `walkthrough-readiness.ts`. [Observed]
      None is a fence recognizer: they hold prompt text, quote normalization that drops backticks, and backticked-field
      parsers.
    - The only non-`.ts` source, `apps/three-surface-poc/src/test-fixtures/restart-listener.mjs`, has no hit.
    - **The 15 production files are confirmed.**
12. **Record checks by script** (`tools/check_record.py` and `tools/check_mutants.py`).
    - All quotes match (28/28).
    - Every reader's `definitions[]` sits on its stated line.
    - All 13 call sites name their function. Two sites, `project-shape-manifest.ts:370` and `:449`, call `indexLinkTargets`,
      which wraps `stripFences`; the record's `via` says so.
    - `baseCommit`, `codeCommit` and `codeCommitFull` resolve.
    - Every mutant's `old` occurs exactly once in its file at `7e58cd1f`.
    - The tallies are probe 17, new test 15, existing 6, which equal the PR body's. The kinds are `rule` 15 and
      `closes-a-gap` 4. Every verdict string names exactly the detectors whose `killed` is true, and every summary line's
      failed count equals `failedCount`.
    - Exceptions are in N8.
13. **`digest-citers.py`.** Re-run with population `9d9c98a6`: "edited 5 files, 20 needles, 5085 files scanned, cited 0,
    methods agree True", exit 0. `--selftest` gives `"pass": true`.
14. **11 mutants of my own** (`tools/own_mutants.py`). Each was applied on `9d9c98a6`, run against the new test, the reader's
    existing test files and the probe (rebuilt each time), then restored. The tree was clean afterwards
    (`"treeCleanAfter": true`).

    | id | mutation | new test | existing | probe | verdict |
    |---|---|---|---|---|---|
    | RV1 | profile closer accepts trailing text (` *$` → `.*$`) | 5 failed | 1 failed | 5 cases | killed |
    | RV2 | link opener accepts four-space indent (`\s{0,3}` → `\s{0,4}`) | 4 failed | 24 passed | 6 cases | killed by new test and probe only |
    | RV3 | profile: a tilde fence closed by backticks (closer ignores the character) | 2 failed | 2 failed | 2 cases | killed |
    | RV4 | CR stripped from each line before the profile reads | 15 failed | 89 passed | 28 cases | killed by new test and probe only |
    | RV5 | inline span closed by a shorter run (`===` → `<=`) | 5 failed | 2 failed | 2 cases + 2 inline | killed |
    | RV6 | extraction recognises backtick fences only | 6 failed | 119 passed | 10 cases | killed by new test and probe only |
    | RV7 | renderer `fenceStart` accepts a leading tab | 46 passed | 20 passed | 0 | **SURVIVED all three** |
    | RV8 | consent closer of any fence character | 46 passed | 1 failed | 2 cases | killed by existing and probe |
    | RV9 | link inline strip pairs equal runs (`(`+)[^`]*?\1`) | 1 failed | 24 passed | 1 inline | killed by new test and probe only |
    | RV10 | profile closer tolerates a trailing CR (`[ \r]*$`) | 46 passed | 89 passed | 0 | **SURVIVED all three** |
    | RV11 | a fence opener inside an open span drops the span instead of malformed | 46 passed | 1 failed | 1 case | killed by existing and probe; **survives the new test** |

    Survivors and near-survivors are in N3 and N7. RV2, RV4, RV6 and RV9 are killed by the new test and by no existing test.
15. **K1/K2 through the public API.** `tools/zz-rev533-consent.test.ts` was copied into a scratch clone only, and
    `tools/k_pin_mutants.py` applied the record's own K1 and K2 fragments. Both were killed (N4).
16. **G4 through the public reader.** The same test reads a CRLF act record and a CRLF instance (N1).
17. **A prototype of the ruled G1 fix.** `tools/simulate_fix.py` makes a line end at CRLF, CR or LF inside
    `maskMarkdownCodeContexts` and keeps every terminator. It printed "Tests  15 failed | 120 passed (135)" over
    `fence-rules.test.ts`, `markdown-code-context.test.ts` and `git-object-reader.test.ts`. The 15 are the 14 cases whose
    `profileCrlf` differs from `profile`, plus the `GAP:` test. Each case's first error shows `profileCrlf` taking the LF
    value, for example "backtick-info-with-backtick profileCrlf: expected 'MMMM' to be 'VHHV'". The file was restored
    afterwards.
18. **Extra shapes.** `tools/extra-probe.mjs`, run on a build of `9d9c98a6`, covered the cases behind F1, F2, N1, N2 and N3.
    `extractSource` for F1 printed `" ```" extracted {"principle":1} [ 'First.' ]` against `"```" extracted {"principle":3}`.

## 4. Findings

### F1 — blocking: G2 states the extractor's closer departures as fail-closed. They can silently drop declared items under a known denominator.

- **Severity.** Blocking. The verdict rule names "a misstated departure or reach that an owner question would rest on", and
  G2 is still to go to the owner ("whether 'fenced code' in the heading rule is the profile's fenced block").
- **Evidence.**
  - The record, `dc3-fence-rules-2026-10-25.json:788`: `"closerIndentedOneToThreeSpaces": "does not close: everything after
    is hidden, which fails closed (missing heading, so the source is Unknown)"`. At `:789`: `"closerWithTrailingTab":
    "closes where the profile calls the source malformed"`.
  - The PR body, G2 bullet: "a closer indented 1-3 spaces never closes (fails closed: a missing heading makes the source
    Unknown); a tab closer closes where the profile calls the source malformed."
  - [Observed] **Indented closer** (`extra-probe-out.json` `g2IndentedCloserReach`). I used `vision.md` with
    `## Non-Negotiable Rules`, three decimal items, and between items 1 and 2 a column-0 fence closed by `` ```` `` indented
    one space.
    - The profile reads it as well formed (`"masked"`): the fence closes, as in CommonMark.
    - `extractClass('principle', 'vision.md', …)` returns `{"kind": "items", "keys": ["First."]}`. With a column-0 closer it
      returns `["First.", "Second.", "Third."]`.
    - `extractSource` returns kind `extracted` with `denominators` `{"principle":1}` against `{"principle":3}`
      (`g2-extract-source.txt`).
    - The code path: the closer test at `project-shape-extraction.ts:173` fails for the indented line, so the fence never
      closes; everything after it is `fenced`; and `:648` sets `denominators[cls] = result.items.length`. That contradicts the
      module's own invariant at `:16-17`, "A source never yields a partial item set".
    - [Inferred] The model renders a known item denominator as an Observed claim (`project-shape-model.ts:411`
      `if (coverage.itemDenominator.kind === 'known') return observedClaim(input);`).
  - [Observed] **Tab-terminated closer-shaped line, on the population it is counted in.** G2's 7 cases are "the cases that no
    inline span touches (25 LF cases the profile reads as well formed)". `closer-trailing-tab-then-closer` is one of them,
    and the profile reads it as well formed (vector `VHHHHV`, whole case well-formed). So on the counted case the profile
    does not call the source malformed.
    - The extractor closes at the tab line, which mints: positions 3-4 are `V` where the profile has `H`.
    - The next plain closer then opens a fence to the end of the text, which hides: position 5 is `H`.
    - The same vision fixture with `` ``` ``, code, `` ```\t ``, more code, `` ``` `` gives a profile reading of `"masked"`
      and an extraction of `{"kind": "items", "keys": ["First."]}` (`g2TabCloserReach`).
    - The one-closer case `closer-trailing-tab` is malformed under the profile, and the gate excludes it before any
      extraction (`git-object-reader.ts:368` returns `active-content` on `malformed-code-context`) [Inferred from the call
      order].
  - [Observed] The mint direction the record states is right: an opener indented one space lets the extractor mint
    `"Fenced."` from text the profile hides (`g2IndentedOpenerMints`).
- **Failure scenario.** The owner is asked whether the extractor may keep its own fence rule, as P-112's candidate sentence
  would allow. They are told the indented-closer departure fails closed. In fact, a heart-and-soul `vision.md` whose fence
  closer is indented one space would yield 1 of 3 declared principles with a known denominator. That is a partial set shown
  as complete, the opposite of the module's invariant and of VIS-2's "never green" posture. The owner keeps the rule
  believing it cannot under-report.
- **Proposed fix.** In the record's G2 (`directions`, `decision`) and in the PR body's G2 bullet, say the following.
  - (a) A closer indented 1-3 spaces never closes, and everything after it is hidden. The result is either a missing-heading
    failure (Unknown), when a required heading follows, or a silent partial item set with a known denominator, when the
    hidden text holds items, rows or H2s of a section headed before the fence. Give the example above.
  - (b) On the well-formed case, a tab-terminated closer-shaped line makes the extractor close early, so it reads as
    structure text the profile keeps fenced. The next plain closer then hides the rest, with the same partial-set outcome.
    The malformed one-closer case never reaches the extractor.
  - Add one extraction row with items after such a fence to the test or the probe, so the owner question carries a pinned
    example.
  - The changed record bytes need a re-review.

### F2 — blocking: G3 omits two directions of the link reader's departure, and the PR body gives the wrong cause for the three span-case differences.

- **Severity.** Blocking, for the same reason as F1: G3 is an open owner question.
- **Evidence.**
  - The record, `:798`, lists the 4 fence-only cases and the 2 single-line inline rows. The directions at `:800-802` are:
    - `"closerShapedLineWithInfoOrText": "closes the fence early (the profile: not a closer), so links after it are indexed"`
    - `"closerWithTrailingTab": "closes where the profile calls the source malformed"`
    - `"doubleBacktickSpan": "a link inside a span written with two backticks is indexed (the inline rule pairs single
      backticks and ignores run length)"`
  - The PR body, G3 bullet: "and in 3 of 4 span cases: a link inside a span written with two backticks is indexed, because
    the inline rule ignores run length."
  - (a) **Multi-line spans are missing.**
    - [Observed] The probe's `inlineSpanCasesWhereTheRecognizerDisagrees.links` is `["backtick-indent4", "two-backticks",
      "blockquote"]`. Only `two-backticks` uses two backticks; the other two use runs of three.
    - In all three, the profile's span opens on one line and closes on a later one. `stripFences` strips inline code per line
      (`project-shape-manifest.ts:190`, ``line.replace(/`[^`]*`/g, '')``), so a link on a line in between is kept. A
      run-length-correct per-line rule would still index it.
    - [Observed] Three non-heading shapes from `g3MultiLineSpan`: `` `` `` / `[p](probe.md)` / `` `` ``, then a
      single-backtick span across lines, then `` see `a `` / link / `` b` end ``. Each gives profile `H` and links `V`, and the
      renderer shows the link text inside `<code>`.
    - The vector corpus cannot show the CommonMark-relevant form. Its probe line is an ATX heading, and a heading interrupts a
      CommonMark paragraph, so in CommonMark that line is never inside a span.
  - (b) **The hide direction is missing.**
    - [Observed] The index `` ``` `` / `x` / `` ```js `` / `y` / `` ``` `` / `` / `[a](a.md)` (`g3CloserShapedLineHides`)
      gives profile `V`: it is well formed and the fence closes at the last line. `indexLinkTargets` returns `[]`, because the
      reader closes at `` ```js `` and the plain closer opens a fence that runs to the end. The probe vector for
      `closer-with-info` shows the same thing: links `VHHVVH` against profile `VHHHHV`, and position 5 is the hide.
    - [Observed by reading] Pillar-named-file sources are minted only from index links (`project-shape-manifest.ts:449-470`:
      `for (const target of indexLinkTargets(read.text))` … `namedPaths.add(resolved.path)`). A hidden link therefore removes
      that file from the manifest population. [Unknown] Whether anything downstream then reports the file as missing.
  - (c) `closerWithTrailingTab` has the same population error as F1. The counted case, `closer-trailing-tab-then-closer`, is
    well formed under the profile. The malformed one is excluded before link parsing, because
    `content-classification.ts:195` runs `scanActiveContent` before the links are read.
- **Failure scenario.** The G2/G3 owner row is filed from this record. The owner learns that the link reader's departures
  add links after an early close, mishandle double-backtick spans on one line, and close on a tab line "where the profile
  calls the source malformed". The owner does not learn two things:
  - A link inside an ordinary multi-line code span is indexed, so a source is minted from code.
  - An early close can hide every later link of a pillar index, so named files leave the population.

  The ruling is then made on half the reach.
- **Proposed fix.** In the record's G3, add (a) and (b) as directions, with the shapes above. Correct (c). Replace the PR
  body's "because the inline rule ignores run length" for the three span cases with the multi-line cause. Add a
  multi-line-span row with a non-heading link line to the inline table. The changed record bytes need a re-review.

### N1 — note: G4 reaches the right conclusion (fail-closed) by the wrong mechanism.

- **Evidence.**
  - The record, `:812`: "[Inferred] A field quoted inside a fence of a CRLF act record is then counted as prose, so the field
    count differs from the fence-blind count and the reader refuses; fail-closed by the existing repeat check."
  - [Observed] `g4OneRule`, using `outsideFences` cut from the built module and the rule `all === 1 && prose === 1` from
    `package-reader.ts:74-77`:
    - A field only inside a fence: LF gives `{all 1, prose 0, accepted false}`, CRLF gives `{all 1, prose 1, accepted true}`.
    - A field in prose and in a fence: LF gives `{2, 1, false}`, CRLF gives `{2, 2, false}`.

    So on CRLF the prose count equals the fence-blind count, and a field wholly inside a fence passes `one()`.
  - [Observed] `zz-rev533-consent.test.ts`, through `createPackageAdmissionReader`:
    - baseline: `"observation:redis-redis:in-force"`
    - CRLF act record: `"refused:AdmissionRecordError"`
    - CRLF instance, bound by its own digest: `"refused:AdmissionRecordError"`
  - [Inferred from the code] The refusals come from LF-exact checks:
    - for act records, `package-reader.ts:700` ``if (!text.startsWith(`${form.title}\n`)) refuse();``;
    - for instances, `:188-189` (`indexOf('| Label | Commit object id |')`, `'|---|---|'`) and `:153` (`line === heading`);
    - for the versioned sign-off, the template equality (`recorder-template.ts:34`).
- **Failure scenario.** Someone later makes the title or table check CRLF-tolerant by normalising only those lines. The
  field-inside-a-fence path then opens silently, because the record says the fence guard itself fails closed on CRLF.
- **Proposed fix.** Restate `G4.reading` as follows: on CRLF, `outsideFences` recognizes no fence, so `one()` sees
  prose = all and a field wholly inside a fence passes it; the record is refused anyway by the LF-exact title, table and
  heading checks (`:700`, `:188-189`, `:153`), as observed through the public reader on a CRLF act record and a CRLF
  instance. Optionally add both CRLF refusals as committed tests.

### N2 — note (for syzygy-bpyt.16): G1's fail-open class is wider than the corpus's three shapes.

- **Evidence.** [Observed] (`g1WellFormedLfFailOpen`, `g1ClosingShapedLineAtEnd`):
  - The lines `~~~`, `` ``` ``, `~~~`, `<script>x</script>`, `~~~`, `` ``` ``, `~~~` read as well formed under LF
    (`"masked"`). The gate under LF gives `["script-element","script-element"]`, so the text is excluded. Under CRLF it gives
    `[]`, so the text is admitted. Under CRLF the tildes are plain text and the two backtick lines pair as one inline span
    around the script.
  - `` ``` ``, `<script>x</script>`, `` ``` text ``: LF is malformed; CRLF is admitted.

  The decision bead's title, "fail-open on CRLF line ends in 3 cases", and the PR body's "(3 cases …)" are counts over the
  corpus; the record does not claim the list is complete. The owner's ruling is on the mechanism ("a CRLF or CR text gets
  exactly the decision its LF form gets"), so it covers both shapes. Nothing in this PR must change.
- **Failure scenario.** syzygy-bpyt.16 tests only the three listed shapes. A partial fix that special-cases LF-malformed
  sources passes them while the LF-well-formed shape stays fail-open.
- **Proposed fix.** Carry both shapes into syzygy-bpyt.16's corpus. The fail-open class is "CRLF reads backtick-fence lines
  as inline-span delimiters", not "LF-malformed sources".

### N3 — note (for syzygy-bpyt.16): the corpus has no bare-CR case and no mixed terminators, and nothing pins terminator preservation.

- **Evidence.**
  - [Observed] There is **no bare-CR case**: `fence-rules.test.ts:117-123` uses `'\n'` and `'\r\n'` only, and
    `fence-probe.mjs:120` has `for (const eol of ['\n', '\r\n'])`.
  - [Observed] Today, a bare-CR text is one line for the profile (`"crLinesSeenByProfile": 1`). The `` ```a`b `` case is
    admitted under CR where LF excludes it, and the tilde case is excluded.
  - [Observed] The extraction and link readers also read a bare-CR text as one line: extraction gives `missing-heading` and
    the links are `[]` (`bare-cr-readers.txt`). The ruling changes only the mask, so after bpyt.16 the gate and these readers
    will split a bare-CR text differently.
  - [Observed] RV10 (a closer tolerating a trailing CR) survives the new test, the existing tests and the probe. No case
    anywhere has mixed terminators, such as an LF opener with a CRLF closer.
  - [Observed] **Terminator preservation is not pinned.** `atLine` (`fence-rules.test.ts:91`, `fence-probe.mjs:65`) strips
    one trailing CR before comparing. Today's `blank()` (`markdown-code-context.ts:70-72`) already turns a CR inside a closed
    context into a space. RV4 (strip CR before reading) fails only on the CRLF vectors, which bpyt.16 must rewrite anyway;
    the existing tests give 89/89 under RV4.
  - [Observed] Under my prototype of the ruled fix (section 3, item 17), the `GAP:` test flips, as do all 14 CRLF-differing
    rows. Nothing else in the file passes silently. The `toHaveLength(14)` line keeps passing until the literals are edited.

  So this PR's pins do force the fix to show itself. Once the literals are rewritten, though, they would not tell a
  terminator-keeping fix from a terminator-dropping one.
- **Failure scenario.** bpyt.16 normalizes CRLF to LF before masking, which drops the CRs. It passes every updated vector.
  The ruled "every terminator and offset kept" goes unpinned, and positions reported in masked text drift from the raw text.
- **Proposed fix (for bpyt.16).**
  - Add a CR column, with the helpers splitting on CR too, and add mixed-terminator rows.
  - Assert, per case, that the CRLF vector, the CR vector and the LF vector are equal, rather than keeping literal CRLF
    columns.
  - Pin `masked.length === text.length` and each terminator byte at its offset.
  - Record the bare-CR split difference against the extraction and link readers as part of G2/G3.

### N4 — note: a committed test can kill the two probe-only consent mutants, and it needs no export.

- **Evidence.**
  - [Observed] `zz-rev533-consent.test.ts` reuses the `package-reader.test.ts` builders. Through `createPackageAdmissionReader`
    and a memory fs, it reads two act records:
    - one with a `` ```` `` line indented four spaces after the title;
    - one with a closed example fence (`` ``` ``, `example`, `` ``` ``).

    Both read as `"observation:redis-redis:in-force"` at `9d9c98a6`.
  - [Observed] Under the record's own K1 fragment, the first becomes `"refused:AdmissionRecordError"`. Under K2, the second
    does (`k-pin-mutants.json`: both `"killed": true`).
  - The PR body's "exporting the function to test it would be a class 6 change, not made here" is true, but an export is not
    the only route.
- **Should a committed test kill them?** Yes. `outsideFences` is the reason `one()` exists ("a field that is partly or wholly
  inside a fence is not a field", `package-reader.ts:72-73`), and it lives in a class-1 owner-act reader. This needs no
  export, so no class-6 change.
- **Failure scenario.** A later edit to `outsideFences`'s opener indent or closer length ships green in CI, because only an
  evidence tool notices.
- **Proposed fix.** Add the two cases to `package-reader.test.ts`, here or in a follow-up bead.

### N5 — note: the AGENTS.md bullet says the test pins all five readers, and its reason clause predates the G1 ruling.

- **Evidence.** `AGENTS.md:191-197` at `9d9c98a6`: "Markdown fences are read by five separate rules, kept apart on purpose:
  … `fence-rules.test.ts` pins them. Do not merge or \"fix\" one without the owner: the profile reads a CRLF text
  differently from an LF text, and that changes what a gate accepts."
  - (a) The test pins four readers. Its own header says so (`fence-rules.test.ts:8`: the fifth "is private"), and so does the
    PR body ("pins four of the five").
  - (b) At the reviewed commit, the owner has already ruled the CRLF difference fixed. The record's `G1.ownerDecision.ruling`
    and the closed bead `syzygy-bpyt.1.14` say so; its `close_reason` reads "Owner ruled arm (a) widened to bare CR (comment
    of 2026-10-27); implementation filed as syzygy-bpyt.16". The bullet does not mention this, and its reason clause becomes
    false when bpyt.16 lands.
  - It does **not** misstate the decision: "without the owner" stays true, since the ruling is the owner's.
  - It does **not** read as authority. It routes to an evidence record and a test and cites no clause as binding. Its
    imperative restates GP-Q0's stop clause (:95-96) and the bead's "Do NOT merge the literal-grammar parsers". "Kept apart
    on purpose" describes not merging (the bead's instruction); it does not claim the differences are intended.
  - The `GAP:` test comment (`fence-rules.test.ts:163`, "it needs the owner (GP-Q0) and this test changes with the
    decision") is likewise now ruled.
- **Failure scenario.** A later session reads the bullet as an open owner gate and stalls bpyt.16, or reads a stale reason
  after it lands.
- **Proposed fix.**
  - Change "pins them" to "pins four of them (the consent reader through the probe and its own tests)".
  - Either name the ruling ("G1, the CRLF reading, is ruled; syzygy-bpyt.16 fixes it") or leave the reason to the record.
  - bpyt.16 edits the bullet and the `GAP:` comment in its own commit.

### N6 — note: "comment-only" as the record names it is emit equality, which type-only edits also pass.

- **Evidence.** [Observed] I committed a type-only mutant on `9d9c98a6`, changing the `stripFences` return type from
  `readonly string[]` to `string[]`. `comment-only.mjs` printed "production files changed 5, comment-only 5, not 0", exit 0
  (`comment-only-mutant-typeonly.json`). `tools/line_check.py` refuses it. For this PR the edits are comment-only by both
  methods.
- **Failure scenario.** A later PR reuses `comment-only.mjs` as proof that an edit is comment-only, and a type-level edit
  passes as a comment.
- **Proposed fix.** Rename the record's claim to "emit-equal (runtime-equal)", or add the line-level check beside it.

### N7 — note: two of my mutants survive everything, and one survives the new test.

- **Evidence.** [Observed] (`own-mutants.json`)
  - **RV7.** The renderer's `fenceStart` accepting a leading tab survives the new test (46/46), `polaris-markdown.test.ts`
    (20/20) and the probe (0 differ). Its effect is that a tab-indented fence line ends a paragraph, through the paragraph
    continuation test at `polaris-markdown.ts:235`. This is presentation only; the PR's residuals disclose that the renderer
    is pinned on two shapes.
  - **RV10** is covered under N3.
  - **RV11** (a fence opener inside an open span drops the span) is killed by `markdown-code-context.test.ts` and the probe,
    but survives the new test. The letter `M` does not carry the reason: on `list-item` it changes from
    `unclosed-inline-span` to `unclosed-fence`. The probe records `profileOnTheWholeCase`; the test does not.
- **Failure scenario.** A malformation-reason regression in the profile passes the characterization test that claims to pin
  the profile.
- **Proposed fix.** Add a reason column (the probe's `profileOnTheWholeCase`) to `CASES`, and a tab-indented renderer pin.

### N8 — note: the record's mutant rows have gaps against rules 6 and 11.

- **Evidence.** [Observed]
  - (a) L4's probe row reads `"killed": true` beside `"casesThatDiffer": 0`, `"consentFunctionTextDiffers": false` and
    `"firstDifferingCases": []`. The kill came from inline rows: the compare tool exits 1 on `inlineCasesThatDiffer`, and
    `fence-mutants.py:104` records no inline field.
  - (b) Each mutant's own `commit` resolves in neither my clone nor the main checkout. For `71325c81`, `a27cd5bf` and
    `df14e0d4`, `git cat-file` reports "Not a valid object name". The rows stay re-runnable from `old`/`new` and
    `codeCommitFull` `7e58cd1f`: all 19 `old` fragments occur exactly once there.
  - (c) The `failed` lists stop at 6 entries (`fence-mutants.py:71` `[:6]`), while `failedCount` goes up to 28 (R2).
  - (d) `expectedProbeOutput` is `/tmp/lc63pr/fence-head.json`, which was not retained.
- **Failure scenario.** A later reader re-checking L4 sees a kill with no recorded evidence, or tries to check out a
  mutant's commit.
- **Proposed fix.** Record `inlineCasesThatDiffer` in each probe row. Say that the per-mutant commit is a discarded scratch
  commit. Name the expected output by its tracked path and digest (`fence-probe-output.json`, `95ed7f66…`).

### N9 — note: the renderer reading's population is narrower than stated.

- **Evidence.** The record, `:653`, and the PR body: "differs from the profile in the tab-closer case only (CommonMark allows
  it), on the cases tried". [Observed] That holds on the 25 fence-only cases (the probe finds the renderer differing in 1 of
  25). It does not hold over the 33 cases tried: the renderer also differs on all 4 span cases, and it reads `` ```a`b `` as
  an opener (`backtick-info-with-backtick` renderer `VHHV`), which the profile does not. Presentation only.
- **Failure scenario.** A reader takes the renderer as profile-equal outside the tab closer.
- **Proposed fix.** Say "on the 25 fence-only cases".

### N10 — note: one assertion counts literals.

- **Evidence.** `fence-rules.test.ts:141` asserts that 14 literal rows have `profileCrlf !== profile`. No code mutation can
  fail it (test-rigor bar 4, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md:66-67`: "Expected values are
  literals or independently derived"). It restates the record's figure, which is harmless.
- **Failure scenario.** None beyond false comfort.
- **Proposed fix.** Drop it, or derive the count from the code (the readers' CRLF and LF vectors).

### N11 — note for the coordinator: PR #533's GitHub base is `main`.

- **Evidence.** `gh pr view 533 --json baseRefName` gives `main`, so the hosted diff includes PR #530, which is under its own
  round-2 review. The PR body says "Merge #530 first".
- **Failure scenario.** Merging #533 first lands #530's commits without #530's verdict.
- **Proposed fix.** Keep the stated order, or retarget #533's base to `agent/syzygy-bpyt.6.3` until #530 lands.

## 5. Every changed output, or the evidence that there is none

[Observed] None changes.
- **Production code.** The 5 edits are comment-only by two methods: emit-equal 5 of 5 under TypeScript 5.9.3, and
  line-level 5 of 5 (four trailing line comments, one line inside a JSDoc block).
- **Reader behaviour.** At `a5ab2b28` and `9d9c98a6` the probe gives byte-identical outputs, equal to the committed ones: 66
  cases, 8 inline rows and the consent function's cut text, with 0 differing.
- **Rendered bytes.** [Inferred from emit equality] None change, since `polaris-markdown.ts` emits the same JavaScript.
- **Governance.** `check_governance.py` gives 0 FAIL and `check_quotations.py` exits 0.
- **Additions.** `AGENTS.md` gains one bullet, `fence-rules.test.ts` adds 46 tests (Tests: +46 ~0 -0), and 13 evidence files
  are added under `docs/evidence/syzygy-bpyt-6-3/`.
- **Bound files.** No digest-bound or registry-bound file is touched, and no tracked file cites a base or head digest of an
  edited file (0 of 20 needles over 5,085 files).

## 6. Verdict on the bead's fourth acceptance criterion, and on G1-G4 as stated

**Acceptance criterion 4** reads "Fence-rule finding recorded (spec citation per rule)". It is met in structure:
- Each of the five readers has a stated rule.
- Each has a quoted governing clause, or a verified "none states the rule" (28/28 quotes match, and my wider governed sweep
  agrees).
- The pins and the probe reproduce.

It is **not yet met as stated**: the G2 and G3 entries the owner question will rest on misstate or omit reach (F1, F2).

| Gap | Departure against the clause | Figures | Reach as stated | Ruling |
|---|---|---|---|---|
| G1 | Correct, anchored to spec :812-813: the opener clause makes no terminator exception, and the code departs under either reading of CR | 6 / 34 / 14-of-33 reproduced | Correct for the corpus; the class is wider (N2); the bare-CR and mixed-terminator gaps are in N3 | Stated correctly. The ruling covers the mechanism |
| G2 | Correct as a departure from "outside fenced code" (spec :142-143) if that means the profile's block | 7 of 25 reproduced | **Misstated**: "fails closed" is false for the hidden-items case, and the tab-closer direction contradicts its own population (F1) | Revise |
| G3 | Correct against the plan's "outside fenced blocks and code spans" (:130-132) | 4 of 25, 3 of 4 span cases and 2 inline rows reproduced | **Incomplete**: the multi-line-span and hide directions are missing, the tab-closer direction is wrong, and the PR body's cause for the span cases is wrong (F2) | Revise |
| G4 | No clause; the own-comment "CommonMark" departs on CR | 28 of 33 reproduced | The conclusion (fail-closed) holds and the mechanism is wrong (N1) | Note |

## 7. Test quality

Measured against `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `9d9c98a6`:
- **:42-45** "A test is worth keeping only if some plausible bug makes it fail." Met. Of my 11 mutants, 4 (RV2, RV4, RV6,
  RV9) are killed by this file and by no existing test. Of the record's 19, this file kills 15.
- **:52-54** "Tests pin observable outcomes … A pure refactor should not break tests; a behavior change must." Met. The test
  calls the public exports `maskMarkdownCodeContexts`, `indexLinkTargets`, `extractClass`, `scanActiveContent` and
  `renderPolarisMarkdown` (`fence-rules.test.ts:21-22`) and compares visible outcomes. The 5 comment-only edits pass it; my
  rule-changing mutants fail it.
- **:64-67** "Expected values are literals or independently derived." Met for every vector, all of which are literals that
  I re-derived from the code. The exception is `:141` (N10).
- **:60-63** "Edge and failure paths are first-class." Mostly met: unclosed fences, malformed openers, near-miss closers and
  containers are all covered. The gaps are bare CR, mixed terminators and terminator preservation (N3), the malformation
  reason (N7), the renderer's tab case (N7), the extractor's partial-set outcome (F1) and multi-line spans with a
  non-heading line (F2).
- **:78-81** Deterministic. Met: 5 of 5 runs gave 46/46.
- **:82-84** "A failure names the defect." Met. Each assertion is labelled `${c.id} ${key}`, and the letter legend is at
  `:15-19`.
- **:93-96** Growth. The net delta is +46. The file is new because no existing test spans readers. It follows bar 10: it
  catches four bugs no existing test catches.
- **The consent reader** is pinned only by the probe and by its own tests. A public-API pin is feasible (N4).

## 8. Cleanup

**Deleted.**
- Both scratch clones (`rev-533/clone`, `rev-533/clone2`), including every temporary mutant branch and commit in them.
- My TMPDIRs `/tmp/r533-1` and `/tmp/r533-2`. [Observed] `ls` gives "No such file or directory" for both.
- The scratch copies of the lane's tools and of the governing references, and the build and `npm ci` logs.

Nothing was edited under `/home/tze/GitHub/syzygy` or any of its worktrees. No push, PR comment, merge or bd mutation was
made; the only bd commands were two `bd show`. No process was killed.

**Kept, under `rev-533/`.** No file is over 300 KB.

| path | sha256 |
|---|---|
| `bare-cr-readers.txt` | `8f673740a38a3ba24423f2be6db4e78c61e952dde6542ec1fb33e44d7327ef3c` |
| `check-governance.log` | `aaea0b120d6350af249fc3252b4b5a8651d85c4ef0578363a60d6b3213a98471` |
| `check-mutants.json` | `ecb073d084d986fe40087488be68f59992e269edfd8701bf5603cd08df46f25e` |
| `check-quotations.log` | `a3dfcf00412b4592d95b8bf26a7e6d133955b6df112513710d52d7f9d5e81f2d` |
| `check-record.json` | `8d6b5c1a1bbdd56d819681001d3d9fdaa6a2f4b89da76feda28f298337a89bcc` |
| `comment-only-delta.json` | `3070e45e6308b20357b7ab49171b4ece7dff7d49d1e754e0c1df071d3877cb98` |
| `comment-only-mutant-code.json` | `adf770a85a98a04f4e118f5285c6c3762febfc988daf16801c3aec9f8d6c225e` |
| `comment-only-mutant-typeonly.json` | `7baff7d8b55b2b8414d0b3120110916f3402fac8ee9f6ef4b650c29c90fabc86` |
| `comment-only-record-range.json` | `f303d919de27423412d338e82f4fea65202eddf5d2b47f8b5ee736c63d173ee1` |
| `digest-citers-9d9c98a6.json` | `83e949e17c75676bce2dda11687053de09f00eab87436842537775446a360754` |
| `extra-probe-out.json` | `55c57626daa2f1eb5fe37dab0b261bbd097c3116062a75ae09dfae8370c77671` |
| `g2-extract-source.txt` | `9012c565099872861bdb530b3ff226d093fd075ef4a5ba59e834dc34b1d5e729` |
| `governed-sweep.json` | `9615364920b08889f817480a4fe58bc624b70079d72f8a7a580bb0f5bb363d60` |
| `k-mutants.jsonl` | `d4ae74ea81e10b2e180b22c67c1da1a4e22931f382ce47cf6b3abb43e0a0c91c` |
| `k-pin-mutants.json` | `553463965d4e5bd7c5c78685013bd7e603378eb701d283dcc76975cad16dcef0` |
| `line-check-delta.jsonl` | `e54e1eb10e3c4e83f6e2d4fd35275d0ee0f77e578fc4c40d5d8023f9540f84fa` |
| `main-since-546f1ff0.txt` | `6bb4719c80e6a27fc1c48326e5ae3ff26916b999c938b9389f34fe936b2d3489` |
| `negctl.json` | `8d32e7c72f4357fb6c2edb9e79e6ec40fb8e9a829492f5675ae2ba49e9d8103b` |
| `own-mutants.json` | `c10ff39450b963e2db7a0cb318f2f4caf04b9a90b58351763948293efa4a16e9` |
| `own-mutants.log` | `5d5bce7dee923c069877058de485234725a4dad8cf8b97106bd9c78a85de560d` |
| `pr533-body.md` | `319d66362118b9fbde3025a2488fdc43f95a75611d1996c06650fb22cf29dbff` |
| `probe-base.json` | `08cb10741da79a033248c04e49e1582d414e135a7e6b3054d3d8c1afbd52821c` |
| `probe-head.json` | `95ed7f664f202d723b151842acbb9906ed4978e20c1f70971a8bf07ac5c30902` |
| `simulate-fix.json` | `4726cfdeac29c5fad516f2e7e9f23cc7e35ee5c280aa85478336a7579333fd1b` |
| `subject-paths.txt` | `df8aadbacb656c04da501c6033f937a3061c8cd509712c8aae680fb5fcfdc436` |
| `sweep-7e58cd1f.json` | `bc42dc75b3056aa49046ba7f4cf89f4ce4dac1a005864feee22cc221e6ad3a38` |
| `sweep-9d9c98a6.json` | `7f833ef93e2c0a814dbe376b30eda55001467cb6f3094df4195f9fdba162fd11` |
| `tools/check_mutants.py` | `bace08ebe73e89271c82b5f087888e9ec7df90920a51c7f4a5bf5c48d44b3c99` |
| `tools/check_record.py` | `1ded9a9d7c2b5479e849defcd90474dbafd091355c03df17a4a621f494d56314` |
| `tools/extra-probe.mjs` | `00ca59a11ce7cb2d7d5c00ecf654e44ba1c38e8f1619e91da091166df9a290e1` |
| `tools/governed_sweep.py` | `53dafd6d8518502bddcb14370edffe53ed9afd0469a03a878613e5d0a3a37739` |
| `tools/k_pin_mutants.py` | `8eaefdd7d13bd6c5bb0b65fdd8fc04782b208b15234a4e5b718d3acff51b15ed` |
| `tools/line_check.py` | `b38a5d488f19801c8e53c92e93ac3d559950ac85e9ec4cd1cd376b1a18c68e04` |
| `tools/own_mutants.py` | `64e0cd5f5e581e6acd8f67aeeb1bfd2907dd639d46d9608766d3f4848b2dd046` |
| `tools/simulate_fix.py` | `6995a6ddf1ffbcdba7596d7cac63054c3124a7fec0c5b07aed48ccaa1387a3ca` |
| `tools/sweep.py` | `7376b92780f9c7dade34833f8cb64b39c0a612a515a3633579967efdf59f4328` |
| `tools/zz-rev533-consent.test.ts` | `85c8440081dce16647ac30a21583ba049c04634d6070e169d3eb5ae99afa7a20` |
| `typecheck.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |

`check-record.json` holds two `fails` entries, for the call sites at `project-shape-manifest.ts:370` and `:449`. Both are my
checker's strictness: they call `indexLinkTargets`, the wrapper the record's `via` names. `check-mutants.json` holds nine
`fails` entries, all reviewed in section 3 item 12 and N8:
- four are `failed` lists capped at 6 (PR3, PR5, L3, R2);
- three are `new` fragments that are substrings of `old` (L2, E3, K3) and one a literal `true` (K4);
- one is the unrecorded inline kill (L4).
