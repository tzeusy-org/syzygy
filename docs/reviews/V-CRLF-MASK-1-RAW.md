# V-CRLF-MASK-1 — independent vet of owner decision syzygy-bpyt.1.14
Verdict: REPRODUCED
Commit: 8ff50172

Full commit: `8ff50172b127cba676ff32ce62c12c91b2b0d924`. Vetter: vet-crlf, fresh context, 2026-10-25.
Every input to the scanner was a synthetic string the vetter wrote. No observed-repository body was read, and no
credential file was opened. No tracked file of the repository was changed. Two experiments edited the scratch clone's
copy of `markdown-code-context.ts` and were reverted: the arm prototype, and a probe of the lane's `.` to `[^\n]`
candidate. After both, `git status` was clean and the baseline corpus run came back byte-identical.

Subject bytes at `8ff50172` (sha256):

| File | sha256 |
|---|---|
| `packages/three-surface-poc-core/src/markdown-code-context.ts` | `dc888664f2392a4abd55b68627226e6734ecb7e35a1d22cfa74eaaca76c52a2f` |
| `packages/three-surface-poc-core/src/git-object-reader.ts` | `9d43268faf48b9099f4ffc626be368bd0daf04159b240fa6d7d915e0de7f1abb` |
| `openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md` | `44f4ad77e62525595be5839883ac491d26bdd6859f353f91edc1d48903011ed2` |
| `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` | `319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd` |

## Summary

- [Observed] The lane's mechanism holds, and it is wider than the bead says. `markdown-code-context.ts` splits lines at
  LF only. Both of its line regexes then fail on any line that holds a CR: the opener (`.` does not match `\r`) and the
  closer (` *$` does not match `\r`). Under CRLF, no line that ends in CR is ever a fence opener or closer. Backtick
  fences then survive only through the inline-span rule, and tilde fences vanish.
- [Observed] Over my own corpus, 336 payload positions in 36 cases, each rendered LF and CRLF:
  - 32 positions in 7 cases are admitted under CRLF and excluded under LF (fail-open);
  - 48 positions in 11 cases are excluded under CRLF and admitted under LF (fail-closed).
  - The lane's three fail-open cases and its tilde fail-closed case all reproduce.
  - 3 of the 32 are a genuine `script-element` outside every LF-valid context, not only a malformed-context exclusion
    escaping (case K16).
- [Observed] A bare CR behaves exactly like CRLF: 32 fail-open and 44 fail-closed over the same 336 positions.
  Normalizing only CRLF leaves all 32 bare-CR fail-open positions in place.
- [Observed] There are 5 call-site modules with 6 call expressions, by two sweeps. Every one hands the scanner the
  decoded blob with no line-end normalization. Every reader returns raw object bytes. A CR committed to a blob reaches
  the scanner whatever the repository's `.gitattributes` now says.
- [Observed] PWB-REQ-006 defines no line terminator, and the code deviates under both readings. The same pipeline
  already reads CRLF as a line end elsewhere (the extractor, the renderer, the policy's own redaction rule).
- Recommendation: **arm (a), widened to bare CR.** A line ends at CRLF, CR or LF inside the mask, splitting in place so
  that length and offsets are kept. A prototype matches the CR-as-terminator oracle on 904 of 904 corpus rows, keeps
  every LF decision (904 of 904), and passes the 261 existing scanner-path tests. Seven pin tests kill all 6 rule-6
  mutants, and today's file fails all 7 pins.
- Severity: **Medium as a gate-conformance defect, Low as exploitable risk.** Every HTML sink I traced still
  entity-encodes. Whether any observed source is CRLF or carries a bare CR is [Unknown].

## 1. What I ran

- Clone: `git clone /home/tze/GitHub/syzygy` into the vet-crlf scratch directory, then checkout of `8ff50172`, then
  `npm ci` (115 packages) and `npx tsc -b packages/three-surface-poc-core`. Node v24.6.0, git 2.53.0. Private TMPDIR
  `/tmp/vcrlf-1`.
- The real scanner was loaded from the built `dist/` (`git-object-reader.js`, `markdown-code-context.js`,
  `project-shape-extraction.js`). The baseline dist was rebuilt after each experiment and checked: `FENCE_OPENER` is
  back to `(.*)$`, and the corpus results are byte-identical to the first run.
- Tools and outputs (all under the vet-crlf scratch directory; none over 300 KB):

| File | sha256 | What it is |
|---|---|---|
| `tools/corpus.mjs` | `6a3f990fc85006ba3387d68f31e8160987343f58855c6b318eba2648f180af62` | 36 cases, 15 explicit-terminator variants |
| `tools/run.mjs` | `0a262ba1b60dabcc506e9f83f1f1b42c3fc814e0fd8465a49e83770082a463ab` | runner: today, arms, two independent oracles |
| `tools/chain.mjs` | `e114e528dff2140655f8f659203389eb41139fd5e0ebedfe0eba3e58f1d9a8c0` | scanner-to-extractor chain probe |
| `tools/proto-arm-a-cr.diff` | `180fa087e8a60d4a8584a70af485f54529c1de7c6fa22999862893121485c6e1` | prototype of the recommended arm, against `8ff50172` |
| `tools/crlf-pin.test.ts` | `81f5db2fe5c7d85f284d68b2868c47b2dcacdf1f13baa5cbd1d373cdf62a0b1f` | 7 pin tests P1–P7 |
| `tools/mutants.mjs` | `defd071a708a47167d9cf15f689196d0dc6ceab11f412d260cac1461660b9a8e` | rule-6 mutant driver |
| `results.json` | `4b057edeebb5a1aea58364b4ed4a8bb36b9d8631e3bacdf9775c8ebb2e6cd163` | 904 rows, baseline `8ff50172` |
| `summary.json` | `0d3ea87957e0c03370392f7561523dfc7e7f165d1ed93d5d9afefce0342600f3` | baseline tallies |
| `results-proto.json` | `b855436a7a6e09de63d5ad64831508656939eecc9cf2b81e19e415388f48d868` | 904 rows, prototype |
| `summary-proto.json` | `c34e83bb8bab17a819175ee07acc8d0e0eb98c860b2cb7f7d418daac45f2cb47` | prototype tallies |
| `mutants.json` | `64322aa22ea2a0e16b9104a1cf08c5b9599b3c402ef57e109c2840dd12ef9f3f` | each mutant's old/new fragment and the pins it failed |
| `chain.jsonl` | `5410845147ddfcc30ba98a34330ac3f44ce2dc800ed645a8c54b99d1ad349967` | chain probe output |
| `git-cat-file-probe.txt` | `3452fe44e3f30c2c305b44ca49769389d7895f6543bda6069e2e8def17222a00` | synthetic-repo `cat-file` probe output |

- Commands:
  - `node tools/run.mjs <dist> results.json`;
  - `node tools/chain.mjs <dist>`;
  - `node tools/mutants.mjs <clone> <8ff50172 mask file> mutants.json`;
  - `npx vitest run` over the 5 scanner-path test files, before and after the prototype.

### The corpus (independent of the lane's)

- The payload is `<script>x</script>`. For a case of n lines, the positions are:
  - a payload line in each of the n+1 gaps;
  - the payload appended to each of the n lines;
  - one no-payload **control** per case.
- Each case is rendered with uniform LF, uniform CRLF and uniform bare CR. Each also has a final terminator, except
  K34 and K35, which have none. On top of these come 15 explicit-terminator variants:
  - M1–M7, mixed `\r\n` and `\n`;
  - R1–R4, bare CR;
  - T1–T4, a trailing `\r` on the last line, and CRLF with no final line end.
- Denominators: 36 cases, so 336 payload positions and 36 controls per uniform rendering; 145 payload positions and 15
  controls over the variants. In all, 817 payload positions, 87 controls, 904 rows.
- Cases (the full text is in `corpus.mjs`):
  - K01–K02: plain and info-string backtick fences.
  - **K03**: a backtick info string holding a backtick (lane 1).
  - **K04**: a closer with a trailing tab (lane 2).
  - **K05**: a fence in a list item (lane 3).
  - **K06**: a tilde fence (the lane's fail-closed case).
  - K07: a tilde fence with an info string.
  - K08–K09: three- and four-space indents.
  - K10: a closer indented four spaces.
  - K11: a closer followed by text.
  - K12: a closer with trailing spaces.
  - K13: a closer longer than its opener.
  - K14: four backticks nesting three.
  - K15: tilde nesting backtick.
  - K16: two tilde fences, each showing a lone backtick-fence line.
  - K17: an inline span left open across a fence.
  - K18–K19: unclosed backtick and tilde fences.
  - K20–K22: inline spans.
  - K23: no context at all.
  - K24: a tilde info string holding a backtick.
  - K25: a fence holding a blank line and inline code.
  - K26: consecutive fences.
  - K27: an indented opener with a flush closer.
  - K28: a blockquote.
  - K29: a four-space ordered-list fence.
  - K30: fence content holding an inline run of three backticks.
  - K31: five tildes nesting three.
  - K32: an opener with trailing spaces.
  - K33: a closer shorter than its opener.
  - K34–K35: a closer on the last line with no final line end.
  - K36: mixed backtick and tilde fences.
- Two oracles, written from the PWB-REQ-006 bullets and not from `markdown-code-context.ts`:
  - **O-term**: LF, CRLF and bare CR all end a line (CommonMark's line ending).
  - **O-content**: only LF ends a line, and a CR is a character of the line.
  - Each oracle masks the text itself. It then neutralizes stray backticks and tildes, which take part in no active
    form, and runs the production active-form regexes over the result.
  - It asserts that the production mask is an identity on that text (1542 checks; none failed).
  - On every LF rendering, O-term equals the code (0 disagreements in 904 rows). That is the second method behind every
    "LF reference" count below.

## 2. Reproduction

### Mechanism (file:line at `8ff50172`)

- `markdown-code-context.ts:60` `FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/`. There is no `m` flag, and `.` excludes
  `\r`.
- `markdown-code-context.ts:63` closer `/^ {0,3}(`{3,}|~{3,}) *$/`, where ` *$` excludes `\r`.
- `markdown-code-context.ts:71` `blank()` replaces `[^\n]`, so a CR inside a context becomes a space.
- `markdown-code-context.ts:75` `text.split('\n')`, the only line split.
- `markdown-code-context.ts:119-139` is the inline scan. A CR is an ordinary character there, and a span continues
  across lines.
- `markdown-code-context.ts:145` `out.join('\n')`.
- `git-object-reader.ts:191-218` `scanActiveContent`:
  - it calls the mask once (`:193`);
  - it then runs `HTML_TAG` (`:164`), `HTML_DECLARATION` (`:165`), `EVENT_HANDLER` (`:166`), `UNSAFE_URL`
    (`:171-172`) and `OBFUSCATED_DESTINATION` (`:173`) over the whole masked string, with no line split;
  - those forms use `\s` or `[^<>]`, which match CR and LF alike, so they are terminator-agnostic. [Observed: regex
    text] [Inferred: no form-level CR effect; consistent with every corpus row]
  - `positionOf` (`:175-185`) counts only `\n` (charCode 10).
- Direct regex probe [Observed]:

| Line | Opener | Closer |
|---|---|---|
| "```" | yes | yes |
| "```\r" | no | no |
| "~~~ js\r" | no | no |
| "```a\rb" | no | no |

### Counts, uniform CRLF against LF (336 payload positions, 36 controls) [Observed]

| | Positions | Cases |
|---|---|---|
| Admitted under CRLF, excluded under LF (**fail-open**) | **32** | 7: K03 4/11, K04 4/9, K05 4/11, K10 4/9, K11 4/9, K16 4/15, K17 8/11 |
| …of which LF found a genuine `script-element` (not a malformed context) | 3 | K16 (payload line before line 4, before line 5, appended to line 4) |
| Excluded under CRLF, admitted under LF (**fail-closed**) | **48** | 11: K06, K07, K13, K15, K16, K24, K30, K34, K35, K36 (4 each); K31 (8) |
| Same decision | 256 | |
| Controls admitted under CRLF, excluded under LF | 7 | K03, K04, K05, K10, K11, K17, K19 |
| Controls excluded under CRLF, admitted under LF | 5 | K13, K24, K30, K34, K35 |

### Bare CR and the variants [Observed]

- **Uniform bare CR against LF** (336 positions): 32 fail-open in the same 7 cases, including the same 3 genuine K16
  positions; 44 fail-closed in 10 cases. Controls: 7 fail-open, 3 fail-closed. Bare-CR decisions equal CRLF decisions
  on 366 of 372 rows; the 6 that differ are K34 and K35, the cases with no final terminator.
- **Variants** (145 positions):
  - 4 fail-open: R3, bare CR with a backtick info string;
  - 44 fail-closed in 11 variants: M1, M2, M3, M4, M7, R2, R4, T1, T2, T3, T4, 4 each;
  - M5, M6 and R1 do not diverge;
  - controls: 1 fail-open (R3), 9 fail-closed.
  - Notable: a mostly-LF file whose closer alone carries CRLF (M1), or whose last line ends in a stray CR (T1), is
    excluded whole as malformed.
- Whole corpus: **68 of 817 payload positions fail open and 136 fail closed**. Controls: 15 of 87 fail open and 17
  fail closed.

### The lane's claims, one by one

| Claim | Finding |
|---|---|
| Mechanism (opener regex; CR falls through to the inline rule) | [Observed] Confirmed. The closer regex has the same property, which the bead names only in its fix |
| Three fail-open cases (backtick info, trailing-tab closer, list item) | [Observed] All three reproduce (K03, K04, K05) |
| Tilde opener fail-closed | [Observed] Reproduces (K06, K07, K31, K36 and others) |
| "6 positions in 3 cases" / "34 fail-closed" | [Observed] Not comparable: the counts are corpus-relative, and the brief forbade reusing the lane's corpus. Mine are 32 in 7 and 48 in 11. "3 cases" understates the class: K10, K11, K16 and K17 also fail open |
| Fail-open is only malformed-context escape | [Observed] No. K16 admits a genuine `script-element` that lies outside every context under LF |
| 5 call sites, no CRLF normalization | [Observed] Confirmed (§3) |
| PWB-REQ-006 defines no line terminator | [Observed] Confirmed (§4) |
| Secret detectors scan raw text; sinks context-encode | [Observed] Detectors get raw text at each site. HTML sinks entity-encode; machine JSON is `JSON.stringify` (§3) |
| Butlers CRLF status | [Unknown], as the lane says |

## 3. Reach

### The sweep [Observed]

- Method 1: `grep -F scanActiveContent` over the 698 tracked files outside `docs/`, `.syzygy/` and `openspec/`.
- Method 2: Python `re` `scanActiveContent\s*\(` over all 5013 tracked files, of which 5009 decode as UTF-8.
- Both find 1 definition (`git-object-reader.ts:191`) and **6 call expressions in 5 modules**, outside tests and docs.
- `maskMarkdownCodeContexts` has one production caller (`git-object-reader.ts:193`).
- No call site normalizes line ends before the scan. Every decoder is `TextDecoder('utf-8', { fatal: true })`, with or
  without `ignoreBOM`.
- Probe: the decoders keep CR ("a\r\nb\rc" decodes with both CRs, under both options).

### Git attributes [Observed, synthetic repo `git-cat-file-probe.txt`]

- In a synthetic repo, a file committed with CRLF before `* text=auto eol=lf` was added keeps its 3 CR bytes under both
  `git cat-file blob` and `cat-file --batch`.
- A file committed after the attribute was added is stored LF.
- So the reader-side attribute does nothing to `cat-file`: a CR reaches the scanner exactly when the committed blob
  carries it. `ISOLATED_GIT_FLAGS` (`isolated-git.ts:7`) does not touch attributes or `core.autocrlf`.
- The dossier's object reader spawns no git process at all (`packages/polaris-dossier/src/git-object-reader.ts:11`).

### Per call site

| # | Call site | Text source; can it carry `\r`? | What a fail-open admits, to which sink | Sink encoding |
|---|---|---|---|---|
| 1 | `git-object-reader.ts:368` (phase-B reader) | `runGit(['cat-file','blob',oid])` `:338`, `decodeUtf8` `:277-285`. **Yes** | `{kind:'text'}` goes to classification and the extractor (`project-shape-extraction.ts:160` strips a trailing CR, so CRLF *is* a line end there). Extracted statements go into `PocModel.projectShape` (`project-shape-model.ts:470`), then Polaris HTML and machine JSON | HTML: `renderPolarisMarkdown` escapes every character (`polaris-markdown.ts:4-8`, the per-character escape in `inline`). Machine JSON: `JSON.stringify(model)` served `application/json` (`routes.ts:239`); `<` is **not** escaped |
| 2 | `content-classification.ts:195` (`classifyPhaseASeed`) | Phase-A seeds: `project-shape-observation.ts:420` (`cat-file blob`), `:449` decode, `:455` classify. **Yes** | Admitted seeds feed link discovery and the pillar roots (`:478-488`), and the root index's precedence table. Phase B reuses the held body without re-scanning (`git-object-reader.ts:318-323`) | Same model sinks as row 1 |
| 3 | `verbatim-route.ts:125` | `execFileSync('git',['cat-file','blob',oid])` `:47`, decode `:117`. **Yes** | Bytes go to `resolveVerbatim`, then `selectRequirementSections` (`capability-detail.ts:186` splits `/\r?\n/`), then requirement text in `<pre>`. This route is the *only* active-content gate for baseline specs, which phase B reads path-only (`verbatim-route.ts:16-20`) | `escapeHtml` (`routes-human.ts:110-117`) at `polaris-source.ts:124` and `polaris.ts:1273`. The machine form carries titles only (`capability-detail.ts:349`) |
| 4 | `public-source-screening.ts:181` (via `screenTargetBody` `:182-187` and `screenBody` `:196-197`) | `repo-corpus.ts:235` (`cat-file --batch`, `git-blob-batch.ts:26`; `TextDecoder` fatal, `ignoreBOM`). **Yes**. Reach is project-documentation bodies only: every `sourceExtensions` entry is also an `exemptExtensions` entry (policy `publicSourceScope.activeContent.codeContentExemption`) | Body goes into the `RepoCorpus`, the generation sources and the dossier pages. The file's own comment says this reader "has no production caller that hands its corpus on" (`:50-51`) [Observed: comment, not re-verified] | `dossier-site.ts:209,357-368`: `escape(...)` plus `\r`→`&#13;`, under `DRAFT_PREVIEW_CSP_META` |
| 5 | `packages/polaris-dossier/src/screen.ts:115` (`screenTargetBody` `:117-121`) and `:132` (`screenBody` `:131-132`) | In-process object reader, then `TextDecoder` fatal `ignoreBOM` (`check.ts:595-600`, `review.ts:195-200`). **Yes** | Admitted blobs verify quotations and become generation sources (`render.ts:300-305`), drawn on the dossier pages. Agent-bound artifacts are class-gated (`class-gate.ts`). `render.ts:205` re-scans with the same scanner | `pageSinkUnconfirmed` (`render.ts:65-73`) requires `PAGE_SINK_CONTRACT` (entity-encoding) plus the CSP on every page |

### Chain probe [Observed, `chain.jsonl`]

- A synthetic `vision.md` puts `<script>x</script>` in the "What Butlers Is" section, between two tilde fences that each
  show a lone backtick-fence line (the K16 shape).
- LF: the scanner gives `exclude(script-element)`.
- CRLF: the scanner gives `admit`.
- The real `extractClass('project-account-section', 'vision.md', …)` returns the `purpose` statement *with* the payload.
  `JSON.stringify` of it still contains the literal `<script>x</script>`.
- [Inferred] In the live pipeline, such a source's statement would reach Polaris HTML encoded, and machine JSON as a
  JSON string holding the raw sentinel bytes. That is the kind of output PWB-REQ-006's Observable ("no active sentinel
  reaches a sink", `spec.md:859-860`) and its complete sink-byte scans are built to catch.
- [Unknown] I did not run the live pipeline or its sink-byte scan.

## 4. The spec

Found by sweep, not by register. [Observed] `DIRECTIVE-REGISTER.md` (891 lines, "765 identifiers, 8 families") has no
`PWB-REQ` family: 0 of its lines contain `PWB-REQ`. `PWB-REQ-006` is defined at
`openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md:788`. That file
is the signed PWB `spec.md`. A sweep of every tracked `openspec/` file finds 9 files that name the identifier; this is
the only definition.

Quoted (`spec.md:798-817`):

> - **Inert code contexts.** Inline code spans and fenced code blocks SHALL be
>   inert Markdown contexts: markup-like examples inside them SHALL NOT alone
>   cause active-content exclusion and SHALL never be interpreted as markup or a
>   link.
>   - Secret detectors SHALL scan the complete transient source bytes, including
>     those contexts, before parsing.
>
> - **Active content.** Outside inert-code contexts, an HTML element, comment or
>   declaration; SVG; script; event-handler attribute; or an unsafe
>   `javascript:`, `vbscript:`, `data:` or `file:` scheme in a Markdown
>   destination, autolink or HTML attribute SHALL exclude the whole source.
>
> - **Code-context profile.** Code contexts SHALL use this exact UTF-8
>   line-oriented profile.
>   - A fenced opener is zero to three spaces followed by at least three
>     identical backticks or tildes; a closer is zero to three spaces, the same
>     character repeated at least the opener length, then spaces only.
>   - A backtick opener's trailing info text SHALL contain no backtick.
>   - The first qualifying closer ends the fence; an unclosed fence or invalid
>     backtick info string is malformed and excludes the source.

Also `spec.md:859-860`: "**Observable**: no request escapes the Git object reader, no active sentinel reaches a sink,
and every rejected/limited source stays visible as Unknown."

[Observed] The adopted text has no definition of a line, a line ending or CR. "line-oriented" (`:811`) is the only
reference. The act-bound policy's `activeContentClassification.markdownProfile` (policy JSON lines 430-444) is silent
too.

Clauses in the same corpus that do define lines [Observed]:

- The same policy's `publicSourceScope.secretRedaction.rule` (policy JSON line 315): "Lines are split at LF, CRLF or CR,
  as the generator counts lines".
- The extractor (`project-shape-extraction.ts:160`) and `docs/PWB-IMPLEMENTATION-PLAN.md:226-232` (P2.5, 2026-09-04):
  "fenced code blocks are masked, CRLF is tolerated".
- The Polaris renderer `renderPolarisMarkdown`: `text.replace(/\r\n?/g, '\n')` (`polaris-markdown.ts:246`).
- The dossier line counter splits at `\r\n|\r|\n` (`packages/polaris-dossier/src/render.ts:326-328`).
- The mask is the one PWB component that reads CR as content.

| Reading | Spec decision under CRLF | Code against it (whole corpus, 817 positions / 87 controls) |
|---|---|---|
| **CR is a terminator** (CommonMark; the policy's redaction rule) | Same as LF | Deviates both ways: admits 68 the reading excludes, excludes 136 it admits; controls 15 / 17 |
| **CR is content** (a line is everything up to LF) | "```\r" *is* an opener: only backticks are forbidden in the info text. "```\r" is *never* a closer: "then spaces only". So every CRLF fence is unclosed and malformed | Deviates both ways: admits 168 the reading excludes, excludes 24 it admits; controls 44 / 6. Under this reading the spec itself would exclude 27 of 36 benign CRLF controls |

So the code matches neither reading [Observed]. The CR-as-content reading is the literal one. It is also unworkable:
every Windows-authored document with a fence would be excluded [Inferred].

## 5. The arms

What each arm accepts and refuses differently from today, over the corpus [Observed, `summary.json`]. "Oracle" is
O-term. Each cell is newly refused / newly accepted.

| Arm | CRLF set (336 / 36 controls) | Bare-CR set (336 / 36) | Variants (145 / 15) | Residual against the oracle, whole corpus |
|---|---|---|---|---|
| (a) normalize CRLF→LF at entry | refuses 32 / accepts 48; controls 7 / 5 | **no change** | refuses 0 / accepts 28; controls 0 / 6 | 36 fail-open, 60 fail-closed (bare-CR and trailing-CR rows) |
| (a) widened: CRLF and bare CR end a line | refuses 32 / accepts 48; controls 7 / 5 | refuses 32 / accepts 44; controls 7 / 3 | refuses 4 / accepts 44; controls 1 / 9 | **0 / 0 on all 904 rows** |
| (b) tighten only, CRLF | refuses 32 / accepts 0; controls 7 / 0 | **no change** | no change | 36 fail-open, 136 fail-closed |
| (b) tighten only, CRLF and CR | refuses 32 / accepts 0 | refuses 32 / accepts 0 | refuses 4 / accepts 0 | 0 fail-open, 136 fail-closed; controls 0 / 17 |
| (c) leave as is | — | — | — | 68 fail-open, 136 fail-closed; controls 15 / 17 |

What the arms mean in practice:

- **(a), widened.** The newly accepted bytes are exactly those the LF reading already masks inside a valid closed
  context, for example a tilde fence. PWB-REQ-006 says those "SHALL NOT alone cause active-content exclusion". The arm
  also accepts 17 benign controls that today's CRLF reading falsely calls malformed, for example K34: a fence closing on
  the last line of a CRLF file with no final newline.
- **(b), either form.** It keeps those 136 false exclusions. A CRLF repository would show more Unknowns with a
  misattributed `malformed-code-context` reason (honest but wrong).
  - [Inferred] Implemented as two mask runs, (b) repeats the named pass `markdown-code-context-mask`, and "repeating a
    pass counts again" against `maxParsePassesPerSource` 16 (registry JSON lines 269, 279). That changes ledger counts
    and needs either a single-pass formulation or a registry change.
- **(c).** A residual sentence alone would leave a deterministic fail-open in an exclusion gate, including a genuine
  active form (K16).
- **Trap in the bead's candidate fix.** Changing `.` to `[^\n]` without also treating CR as a terminator implements the
  CR-as-content reading. [Observed, scratch probe, reverted] That one-line change equals O-content on 904 of 904 rows.
  It excludes 27 of 36 benign CRLF controls, where LF excludes 9.

### Does a bare CR need its own rule?

Yes. [Observed] Bare CR reproduces the CRLF fail-open exactly (32 positions, same 7 cases, same 3 genuine). Arm (a) as
worded, and arm (b) as worded, leave it all in place. I recommend counting CR as a line end, as CommonMark does.
Excluding any bare CR as malformed is the stricter alternative. The policy's own redaction rule, the renderer and the
dossier line counter already split at CR.

### Recommendation: arm (a), widened to bare CR

1. **Why.** It is the only arm that makes the gate's decision independent of the line-end convention: 0 deviations from
   the oracle on 904 rows. It closes every fail-open, the K16 genuine admission included. It removes the false
   malformed exclusions. It accepts nothing the LF reading does not already accept. And it brings the mask into the
   line model the same pipeline already uses: the extractor, the renderer, the policy's redaction rule, the PWB plan's
   "CRLF is tolerated".
2. **How.** Split inside `maskMarkdownCodeContexts` at `\r\n|\r|\n`, keeping each terminator and blanking line bodies
   only. This is `tools/proto-arm-a-cr.diff`, 15 changed lines. Length and every offset are kept, so `positionOf` and the
   reported finding positions do not change, and no new traversal or pass is added. [Inferred: one pass, same charge]
   Literal normalization at entry also gives the same decisions, but it would renumber findings in bare-CR files.
3. **Prototype results.** [Observed]
   - Decisions equal the arm-(a)-widened column above, exact strings, on 904 of 904 rows. They equal O-term on 904 of
     904, and LF decisions are unchanged on 904 of 904.
   - The 5 scanner-path test files pass, 261 of 261, before and after: the mask, reader, classification, dossier screen
     and public-source screen tests. None of the mask, reader or classification tests holds a CR today. A sweep of the
     6 test files that name the scanner or the screens finds `\r` only in 3 redaction lines of
     `public-source-screening.test.ts`.
4. **Pin tests** (`tools/crlf-pin.test.ts`; hand-typed literals):

| Pin | What it checks |
|---|---|
| P1 | A CRLF backtick-info opener is malformed `backtick-fence-with-backtick-in-info-string` at line 2 |
| P2 | CRLF K16 shape gives `script-element` |
| P3 | A CRLF tilde fence holding the payload is admitted |
| P4 | The same as P1 and P3 with bare CR |
| P5 | CRLF with no final line end: a fence closed on the last line is admitted |
| P6 | The exact masked string for a mixed CRLF/CR/LF text keeps length and every CR/LF offset |
| P7 | LF, CRLF and CR give one decision for 8 cases |

5. **Rule-6 mutants** (`mutants.json`). Base: `8ff50172` plus `proto-arm-a-cr.diff` (sha256 above); every copy of the
   fragment rewritten:

| Mutant | Change | Result |
|---|---|---|
| TODAY | the whole `8ff50172` file | fails P1–P7 |
| MU1 | `LINE_END` → `/\n/g` | killed, P1–P7 |
| MU2 | → `/\r?\n/g` (arm (a) as worded) | killed, P4 P6 P7 |
| MU3 | → `/\r|\n/g` (CRLF counted as two line ends) | killed, P1 |
| MU4 | → `/\r\n|\n/g` | killed, P4 P6 P7 |
| MU5 | join with `'\n'` | killed, P6 |
| MU6 | CR terminator re-emitted as LF | killed, P6 |

   6 of 6 killed. MU3 is killed only by P1's line number; a real patch should add a second line-number pin.
6. **Further tests a real patch should add.**
   - A per-call-site CRLF fixture at each of the 5 modules (reader outcome; phase-A exclusion; verbatim refusal; both
     screens).
   - An extractor-equals-mask line-model test.
   - The rule-6 sweep run against the committed patch, with each mutant's commit recorded.
7. **Governance.** Every arm except (c) changes what a gate accepts or refuses. Under GP-Q0's stop clause
   (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:95-96`) it returns to the owner, as the bead says. Arm (a)
   needs no spec or policy byte change, because the spec is silent. A clarifying sentence ("a line ends at LF, CRLF or
   CR") in PWB-REQ-006 or the policy's `markdownProfile` would be an amendment to bound bytes, so it needs its own owner
   act. Recommend that as optional and separate.

## 6. Severity

**Medium as a gate-conformance defect, Low as exploitable risk.**

- Why not lower:
  - [Observed] The scanner is deterministic and it fails open: a crafted file admits active content by line ends
    alone.
  - [Observed] At least one shape (K16) admits a genuine `<script>` that lies outside every valid context.
  - [Observed] The admitted text reaches model statements (chain probe) and machine JSON as raw bytes.
  - SEC-3 treats observed content as untrusted everywhere, and PWB-REQ-006's Observable forbids the sentinel in any
    sink.
- Why not higher: [Observed] Every HTML sink I traced entity-encodes, and dossier pages also carry the CSP. Machine
  JSON is `application/json`. No traced path interprets admitted text as markup. [Inferred] None of the traced sinks
  executes it.
- The fail-closed side is availability and honesty, not safety. Benign CRLF documents become Unknown with a false
  `malformed-code-context` reason.

### What is [Unknown]

- Whether any Butlers blob, or any other observed repository's blob, is CRLF, has bare CR, or ends with a stray CR. No
  repository body was read.
- Whether a K16-like structure occurs in any real source.
- The lane's own corpus, and why its counts differ from mine. I did not see it.
- Whether a sink exists beyond the ones traced here. I followed the call sites to their named renderers and did not run
  a full sink sweep.
- Whether the live PWB sink-byte scan would flag the raw JSON sentinel.

## 7. Limitations

- The arms were measured on a synthetic corpus of 36 cases and 15 variants, with one payload form (`script-element`).
  The active-form regexes are terminator-agnostic, so the result should carry to the other forms. [Inferred]
- The prototype and the mutants ran only in the scratch clone and were reverted. No tracked file was changed.
- The 5 test files cover the scanner path, not the whole battery.
- The clone and `/tmp/vcrlf-1` are deleted after this file is written. The tools and results stay under the vet-crlf
  scratch directory.
