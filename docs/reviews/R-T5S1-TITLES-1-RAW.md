# Review R-T5S1-TITLES-1
Verdict: REVISE
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit 42029464c

## Bytes bound

- Commit `42029464c05bc5cd0d90cc546f0e3197d9717462` (branch `agent/syzygy-t3jk.23`), reviewed as `git diff 42029464c~1 42029464c` (26 files, +619/-159).
- `spec.md` at the subject: sha256 `9979574e298bb60282b2901a8970f1ded6c93898915bf892da76ae34b25505b7` (scripted; equals the GOVERNING-DEPENDENCIES.md source line).
- `packages/three-surface-poc-core/src/work-item-titles.ts` at the subject: sha256 `d5c434ac0b9c7e5961206560eeb02a6917848326945a485d580d20d22b873ce8`.
- The worktree was clean before and after every mutation (`git status --short` empty).

## Findings

1. **must-fix — the spec-reconciliation check goes from green to FAIL at this commit.** [Observed] In a scratch `--shared` clone, `python3 scripts/check_spec_reconciliation.py --check` at `42029464c~1` reports R1–R5 and R7 OK (0 findings). At `42029464c` (same clone, same 13 `three-surface-poc-*` tags) it reports R1 FAIL (1 finding: "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md: incomplete or invalid exact P115 sign-off transaction"), R2 FAIL (16 findings, "broken chain — reversing `…/proposed/spec.md.patch` over the successor row … does not yield the row the chain reached", across the block-provenance, governing-intent and vocabulary-epistemic packages) and R3 FAIL ("POC: 30 requirements / 56 scenarios, expected 26 / 28"; per-requirement census differs at 014, 040, 042). [Inferred] The subject edits `spec.md`, `CONTRACT-COVERAGE.md` and `GOVERNING-DEPENDENCIES.md` without the amendment package the chain checker walks (the bead's procedure names `.syzygy/governance/contracts/candidates/three-surface-poc-<slug>-amendment/SEMANTIC-DELTA.md`, and the earlier amendments carry `proposed/*.patch`). No such package, no `AGENT-ADOPTIONS.md` row and no `three-surface-poc-titles-amendment-v1.0` tag exist at these bytes, while `POC_SCENARIO_AMENDMENTS` already names that tag and the policy JSON's `warrant` already says "adopted by an AGENT-ADOPTIONS.md row". Repair: land the titles amendment package (semantic delta and proposed patches over the three governed files, in the form the predecessor packages use), the adoption row and the post-merge tag, and re-run `--check` on the branch head until R1–R3 return to 0 findings; read the output, not the exit code (rule 4).

2. **should-fix — the lone low-surrogate predicate is unpinned (mutant survived).** [Observed] Mutating `UNCLASSIFIABLE_TEXT` in `packages/three-surface-poc-core/src/work-item-titles.ts:51` to drop the alternative `|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]` leaves `work-item-titles.test.ts` and `work-items.test.ts` at 34/34 passed. The only surrogate fixture is a lone *high* surrogate (`'lone \uD800 qz9d'`, `work-items.test.ts`, the "withholds a title it cannot screen" case). POC-REQ-063's Case names "a lone surrogate" and the admission rule forbids any lone surrogate. Repair: add a lone low-surrogate fixture (`'lone \uDC00 qzXX'`, written as an escape) to the unscreenable list and its marker sweep.

3. **should-fix — POC-REQ-063's Case and Oracle-independence text overstates what the tests do.** [Observed] (a) spec.md (POC-REQ-063, "Oracle independence") says "the detector strings are read from the policy file, never from the module under test"; the tests type every detector-matching string as a literal (`work-item-titles.test.ts`, "withholds on each detector…"; `work-items.test.ts`, "withholds a title any secret detector matches"); nothing reads strings from the policy file. The policy-file test compares detector *ids* with `PWB_SECRET_POLICY`. (b) The Case says "each active-content form the scan names". `ACTIVE_CONTENT_FORMS` (`git-object-reader.ts:179-188`) names eight forms; the fixtures cover html-tag, html-comment, script-element, svg-element, event-handler (inside `<svg onload=x>`) and unsafe-url-scheme, but not `obfuscated-link-destination` or `malformed-code-context`. Repair: either add one fixture per missing form, or reword the Case to the forms actually supplied; reword Oracle independence to "detector-matching strings are the checker's own literals; the detector id list is compared with the declared policy file".

4. **should-fix — the code-span mask admits titles that carry markup inside backticks; the board copy says otherwise.** [Observed] A probe (`screenWorkItemTitle`, scratch test file, removed afterwards) returns `{text: "Fix `<script>alert(1)</script>`"}`: the active-content scan masks Markdown code spans before matching (`git-object-reader.ts:286-294`), so a backticked tag is no finding. Also `'<svg/onload=x>'` is admitted (the test pins this as the scan's known gap, syzygy-ls34). The page escapes it (`trajectory.ts` `itemTitle`), and the only HTML-embedded JSON island escapes `<` (`orrery.ts:191`), so [Inferred] no injection on the served page. But the withheld-basis sentence says "a title that … carries active content … is never served" and the notice says titles are screened by "its scan for markup and scripts", while such titles are served verbatim on the JSON channel to any consumer. Nothing is loosened (the scan is used unchanged, as the owner's boundary requires). Repair: state in POC-REQ-063 and the policy JSON that the scan reads the title as Markdown (code spans are inert), and that admitted titles are safe only when rendered escaped; optionally (a tightening, an agent adoption) withhold any `<` … `>` tag shape regardless of code context for this content class.

5. **should-fix — bidirectional and invisible format characters are admitted and rendered without isolation.** [Observed] The probe admits `'rlo ‮ evil'` and `'zw​sp'`. `UNCLASSIFIABLE_TEXT` covers C0/C1 and lone surrogates only. The title renders in a plain `<span class="wi-name">` (`trajectory.ts` `itemTitle`), so [Inferred] an unterminated RLO can visually reorder the status and facts that follow on the same card (a display-honesty issue under VIS-2/VIS-3, not a secret leak). Repair: render the title in `<bdi>` or give `.wi-name` `unicode-bidi: isolate`; or withhold titles holding U+202A–U+202E / U+2066–U+2069 as unclassifiable (a tightening).

6. **note — the page-size test's worst case is not the worst case.** [Observed] The test comment (`trajectory.test.ts`, "keeps a full page of longest, most-escaped titles…") says `'"&'.repeat(250)` escapes "to the most bytes"; it escapes to 2,750 bytes, while `'"'.repeat(500)` escapes to 3,000 (`&quot;` is 6 bytes). Measured: 1,128,267 of 2,097,152 bytes (53.8%) for 250 cards. [Inferred] the true worst case is about 62,500 bytes more (~56.8%), still under the 60% bound. [Unknown] whether a grouped page in which items render under two parents (`trajectory.ts:453`, "renders twice") can carry more than 250 title-bearing cards; the fixture rows have no parents. Repair: use `'"'.repeat(500)` and add a measurement with multi-parent rows on the default grouped view, or state the bound per card.

7. **note — hashing short, secret-bearing titles.** [Inferred] The withheld record carries SHA-256 of the whole title (`work-item-titles.ts` `withhold`). For a short, low-entropy title (`"Set password: hunter2hunter2"`), an unsalted digest lets anyone with a guess confirm it offline. RFC5-17 asks for this: "an excluded item is recorded as (content digest, location reference, policy version, redaction class) — never the content itself". So the design is conformant, and file-level exclusions already do the same. But a title is much shorter than a file, so the guessing risk is materially higher. Repair (optional): state the risk in the policy JSON; consider a keyed digest (HMAC with a per-instance key) for the `secret-matched` class, adopted as its own row. A related point: the digest of a title with a lone surrogate is taken over a string that has no strict UTF-8 encoding. The probe returned digest `30004e2b…` for `'lone \uDC00 x'`, so `sha256` encoded it somehow (presumably with U+FFFD). "SHA-256 of the title's UTF-8 bytes" is therefore underdefined for the unclassifiable class. Say so, or use null there.

8. **note — the RFC5-17 tuple is split across the served answer.** [Observed] The per-item record is `{withheld, redactionClass, digest}`. The location reference is the sibling `id`, and the policy version is on `workItems.titles.policyVersion`. The `WithheldTitle` doc comment says so. [Inferred] This satisfies "(content digest, location reference, policy version, redaction class)" for the answer as a whole, but a consumer who copies `title` alone loses two of the four fields. Acceptable; the spec could name where each part lives.

9. **note — wording drift across requirements.** [Observed] POC-REQ-062 (amended) says the statement "retains … the seven non-free-text columns and, since POC-REQ-063, `title`". POC-REQ-063's Oracle says "exactly the eight of POC-REQ-010's statement and `title`", and the test calls them "the eight earlier columns" (revision plus seven). POC-REQ-044 (spec.md ~line 1305) still reads "SEC-5 excludes titles, messages, committers and other free text". That stays true of its own `dolt_diff` statements, but SEC-5 now admits screened titles. Repair: use one count ("the revision witness and seven columns") in both requirements. In POC-REQ-044, write "these statements read no title (titles enter only under POC-REQ-063), no message, committer or other free text".

10. **note — a leftover no-op in a fixture.** [Observed] `work-items.test.ts`, "admits a clean title verbatim": `'Wire the Trajectory outline to <parent> ids & counts'.replace('<parent>', 'parent')` builds a literal that never carries `<parent>`. Repair: write the literal directly.

## What I checked

- **Q1, leakage and loosening.**
  - [Observed] `content-classification.ts` and `git-object-reader.ts` are untouched by the diff (`git diff --stat` empty for both). The title path calls `compileDetectors(PWB_SECRET_POLICY)`, `detectSecrets` (every detector runs; first match is named) and `scanActiveContent` (the uncharged wrapper over the unchanged `scanActiveContentCharged`).
  - [Observed] Any throw inside screening becomes `unclassifiable`. A non-string, an empty string, more than 500 units, a C0/C1 control or a lone high surrogate is withheld before screening (a lone low surrogate too, though no test pins it: finding 2).
  - [Observed] A withheld record holds no text. Every `reason` string in `observeWorkItems` is a fixed literal, so row content cannot reach a log through the unknown path.
  - [Observed] The marker sweeps in `trajectory.test.ts` search the page HTML and `JSON.stringify` of the served answer for `qz5hunter2qz5`, `qz6x` and `password:`. They pass, and fail under mutation 1.
  - [Inferred] Nothing sends `PocModel` or `workItems` to a model provider: a grep of the POC core and app finds provider wording only in consent and refusal vocabulary. A full egress proof was not run.
  - [Observed] The title is not used in `inputsDigest` or the evaluation identity. The policy is code-declared, so the observer revision covers its version [Inferred].
- **Q2, escaping and size.**
  - [Observed] An admitted title is rendered in exactly one place: `itemTitle`, through `escapeHtml`, in element content only. `escapeHtml` handles `&`, `"` and `'`; the test pins `Tom &amp; Jerry say &quot;hi&quot; it&#39;s fine`. Mutation 2 (no escape) fails two tests.
  - Page size: 1,128,267 bytes, printed by the test.
- **Q3, the withheld record.** RFC5-16 and RFC5-17 quoted above. The digests were re-derived by `sha256sum`: `1576ee2d…`, `a5e12542…` and `3b6e0670…` all match the test literals.
- **Q4, the spec and the coverage table.**
  - Both scenarios map to tests: clean titles → the first `trajectory.test.ts` POC-REQ-063 case; secret, script and absent → the second.
  - Part A totals, counted two ways [Observed]. A Python row parser over Part A gives 178/127/51 at the parent and 179/129/50 at the subject, over 88 distinct clauses. `grep -c '^| RFC'` and `grep -cF '| covered'` over lines 60–301 give 179 and 129. The table's totals match.
  - `build_three_surface_poc_spec_dependencies.py --check` matches (30 requirements, 112 authorities). `check_spec_reconciliation.py --check` fails at the subject (finding 1).
- **Q5, mutations.** Each was restored with `git checkout -- <file>`, and `git status` was clean afterwards.
  - (1) Drop the active-content line: 4 failed / 97.
  - (2) Remove `escapeHtml` on the title: 2 failed / 63.
  - (3) Narrow the C1 range to `\u007f`: 1 failed / 34.
  - (4) Force `digest` to null: 2 failed / 97.
  - (5) Drop the lone low-surrogate alternative: 0 failed / 34 (**survived**, finding 2).
- **Q6, other surfaces and stale text.**
  - A sweep for `workItemTitlesWithheld`, `withheld (SEC-5)`, `titles-withheld`, "never reads them" and "title is never read" over `apps`, `packages`, `scripts`, `docs/THREE-SURFACE-POC.md`, `PROJECT-STATUS.md` and `openspec` finds no stale use; the remaining hits are unrelated.
  - Spec title mentions were reviewed (finding 9). The outline, blocked and changed lists stay T5 S2, per the bead.
- **Runs at the subject** [Observed]:
  - `npx vitest run` on the three narrow files: 97/97.
  - The sweeps, `surface-routes`, `trajectory-view` and all of `packages/three-surface-poc-core/src`: 1517 passed, 2 skipped.
  - `npm run typecheck`: clean.
  - `python3 scripts/check_governance.py`: 22 OK, 17 WARN, 0 FAIL.
  - `npm run check:all` was not run [Unknown].
- **References read:**
  - The owner answer: pursuit doc lines 284–293, "Answered 2026-11-21T12:21:41Z, choice C … no title goes to a model provider, no other free-text field is admitted, no detector is loosened".
  - SEC-5: `security.md:172-174`, "Anything that matches the declared secret-detection policy, or cannot be classified, is excluded; a matching exclusion is rendered."
  - RFC5-16 and RFC5-17 (`consent-egress-secrets.md` §3.8).
  - The bead's acceptance criteria 1–6 (`bd --readonly show syzygy-t3jk.23`). AC 5's delta, raw review, row and tag are absent at these bytes (finding 1).
