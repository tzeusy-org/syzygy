# Review — screening scope version 7, recorder and install
Reviewed commit: b3cd3a434cdc4c9b6e95d06ee7a69dea57c5c6fb
Subject: recorder and install, policy row prefix 626be0ca
Verdict: CONFIRM WITH EXCEPTIONS

- Summary
  - No blocking finding, on the grading in F1
  - The page reader still confirms pages where Chrome runs an unpinned script with no policy (F1, F2)
    - Only a renderer can write those pages
    - No shipped renderer does, and no body can
  - The record is truthful where it can be checked; two instants cannot be checked (F6)
  - The act chain is complete; the battery and `npm run check` pass
  - The recording tag does not exist yet, and version 6's never landed (F5)

## Findings

1. **F1, note (the most serious; fix before any pin): the reader parses text, the browser decodes bytes and picks a parser**
   - Anchors
     - `packages/polaris-generation-core/src/page-sink.ts:87`, `:104`
     - `packages/polaris-dossier/src/render.ts:69`
   - [Observed] Encoding: the reader confirms, Chrome runs an unpinned script
     - Both checks ran: `pageSinkCspFinding`, then `pageSinkScriptFinding` with the empty pinned set
     - Page: `<meta charset="iso-2022-jp">`, ISO-2022-JP escapes in the viewport `content`, and a stray attribute on the policy meta
       - `file://`: `characterSet` ISO-2022-JP, 0 policy metas in Chrome's DOM, script ran
     - Same bytes with no charset meta: Chrome auto-detected ISO-2022-JP, script ran
     - Encoding named by a later `Content-Type` meta: script ran over `file://` and loopback
     - Control, same bytes under `<meta charset="utf-8">`: 1 policy meta, script did not run
   - [Observed] XML: the reader confirms, Chrome runs an unpinned script
     - Page: uppercase `<!DOCTYPE html>`, un-namespaced `html`, the policy meta, and an SVG-namespace `<script>` inside `<title>`
     - Named `x.svg` or `x.xml`: script ran; the meta sits in no namespace and enforces nothing
     - Named `x.xhtml` with the XHTML namespace: policy enforced, script did not run
     - Same bytes as `x.html`: 0 scripts, did not run
     - So reading every file as HTML does not read an SVG page as a browser does
       - The comment at `render.ts:64` implies that it does
       - Genuine SVG is refused (no doctype, no meta); only a polyglot passes
   - [Observed] `pageSinkScriptFinding` under the empty set
     - It holds for everything parse5 can see
     - It does not hold for these pages, because parse5 never sees the script
   - [Inferred] Why this is a note
     - Each page needs a renderer to write a non-UTF-8 charset or a non-HTML file name
     - `renderDossier` and `renderLocalDossier` each drew 11 files, only `.html` and `.json`, and the draft preview also passed the reader
     - Page heads are templates, so body bytes do not reach the charset or the file name
     - Under `utf-8`, a body's ESC bytes did nothing (control above)
     - The install does not widen this: the version-6 check skipped SVG and also read no bytes
     - R-SCREENING-SCOPE-V7-3 E1 graded the same reachability as non-blocking
   - [Inferred] Why it is the closest call
     - `page-sink.ts:6-9` gives the same outcome as its reason for replacing the regex
     - A stricter reading of "real defect in security behaviour" gives REVISE; the lead may overrule
   - Repair, small
     - Require exactly one first `<meta charset="utf-8">`, compared case-insensitively
     - Refuse any `Content-Type` meta
     - Refuse any non-`.json` file not named `.html`, until an XML reader exists
     - Add the pages above as Chrome fixtures

2. **F2, note: the comment at `page-sink.ts:11` is false, and pinned scripts can hide**
   - Claim: scripts-off parsing is "a superset of what either browser mode builds"
   - [Observed] Scripts-on Chrome reads `<noscript>` as raw text, so these differ:
     - `<noscript><p title="</noscript><script>…</script>">`
     - `<noscript><!-- </noscript><script>…</script> --></noscript>`
     - Reader: no script, confirms. Chrome: 1 script
   - [Observed] Under the empty set the policy blocks it: script did not run
   - [Observed] With a pinned hash, passed as the `pinned` argument:
     - Hidden `<script src=ext.js integrity=sha256-…>` over loopback: `GET /ext.js` reached my listener and the script ran
     - The visible form is refused with "external reference"
     - The hidden inline copy also ran
   - [Inferred] So the no-external-reference limb can be evaded once any hash is pinned
   - [Observed] Evidence mutant 13 pins `scriptingEnabled: false`, so tests hold the wrong side
   - Repair: parse in both modes, and require both to pass

3. **F3, note: pin-needs-a-raw is nominal**
   - Anchors: `page-sink.ts:27`, `page-sink.test.ts:177`
   - [Observed] I pinned a hash to a new `docs/reviews/R-ZZ-FAKE-RAW.md`
     - The file said only `Verdict: REVISE` and "Do not pin" plus the hash
     - The pin test passed
     - Only `defaults to the pinned set, which holds nothing yet` failed, and the first real pin must edit that test anyway
   - [Observed] The test checks a path shape and a substring
     - It reads no verdict, reviewed commit or head
   - [Observed] The repository has no `.github/CODEOWNERS`
   - [Inferred] The carried bullet "Require a review" is met as a presence check only
     - It is honest as a tripwire and false if read as a review gate
   - Repair: require a `CONFIRM` or `CONFIRM WITH EXCEPTIONS` head line naming the hash

4. **F4, note: carried exceptions, bullet by bullet ("The install owes")**
   - Read the CSP meta with the same parser; both fixtures with a Chrome check: **discharged as written**
     - [Observed] `page-sink-csp.browser.test.ts`: 5 of 5 passed
     - The E1 class remains open by other routes (F1, F2)
     - `page-sink.test.ts:120` names a file that does not exist; the test is `page-sink-csp.browser.test.ts`
   - Extend `package-reader.ts` and its testkit: **discharged**
     - [Observed] Seventh form, `v7` field and chain tests; my mutants killed
   - Choose the parser: **discharged**, parse5 8.1.0 exact (F9)
   - Hash after newline normalisation: **discharged**
     - [Observed] Unit test, plus Chrome running the LF hash and refusing the raw CRLF hash
   - Require a review for a pin change: **nominally discharged** (F3)
   - Change the dossier spec's CSP text: **left, honestly**
     - [Observed] Not in this subject; PR branch `agent/syzygy-pdja.2-voice` at `e265d0e2` proposes it
       - `polaris-dossier-local-agent-mode-v1-5/proposed/spec.md.patch:78`
     - [Observed] The act record and the status row both say a script needs a signed spec version
   - Storage test, `window.open` gesture test: **left, honestly but untracked here**
     - [Observed] No script exists to test
     - [Observed] Both are named only in the carried-exceptions file and the raw at this commit
     - [Observed] Commit messages and the PR body do not disposition them
     - [Unknown] Whether a bead holds them: `bd show syzygy-pdja.5` returned "not found" in this worktree
     - Add a disposition line or a bead, since the file's heading says the install owes them

5. **F5, note: the recording tag is a landing step, and version 6's was missed**
   - Anchors
     - `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-ACT.md:78`
     - `packages/three-surface-poc-core/src/body-read-authority.ts:558`
   - [Observed] `git ls-remote` on origin lists scope tags v2 to v5, and neither v6 nor v7
     - The v6 record states its tag sits on the commit carrying the record; that is false today
   - [Observed] `resolveRecordingTag` returns unresolved without the tag, and the evaluator returns `recording-tag-mismatched`
   - [Inferred] Butlers body reads are refused on `main` now, and stay refused after this landing until the tag exists
     - I did not run the gate on the real tree
     - It fails closed
   - Repair: push the v7 tag on the landed commit, after the rebase-merge re-hashes it

6. **F6, note: the performed record is truthful where checkable; it did not exceed the selection**
   - Record: the V7-ACT.md file above; direction: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06-2.md`
   - [Observed] These match the direction
     - The words, option A, the row
     - "It adds no script", and no consent, read or egress
     - The operator is marked [Inferred]; whether the packet was opened is marked [Unknown]
   - [Observed] The owner's earlier quotation appears in `OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06.md:24`
   - [Observed] The patch changes two values, as the effect paragraph says
   - [Unknown] Words instant
     - The record says 14:04:40Z, "as the form recorded it"; the direction says submitted 14:04:42
     - The form file is outside the repository
     - They may be two distinct events; no tracked byte supports :40 but this session's own
   - [Unknown] Recorded instant
     - The record says 14:11:19Z; PR #779 was opened at 14:07:49Z
     - The first commit holding the recorder or the record is dated 15:49:23Z
     - `--instant` accepts any value after the words on the act's date
     - `--check` re-renders from the record's own instant, so it cannot detect a chosen one
   - [Observed] `7f98407d` is on no remote branch, as rebase-merging leaves it
     - Binding is by digest, as the record says

7. **F7, note: `scripts/record_public_source_screening_scope_v7_act.py` fails closed on what it reads, with three gaps**
   - [Observed] `--selftest`: 91 of 91; `--check`: passes
   - [Inferred] From reading: argument, row, frozen digests, review head and finding grades are all refused before any write
   - Gaps
     - [Observed] It never reads the direction it cites (`:74`); a missing direction would not stop it
     - [Observed] `--words-at` is bound only to date and order (`:438-445`)
     - [Observed] `do_record` writes three files with no rollback (`:472-474`), the same as version 6
   - [Observed] The raw is not in `frozen_rels()`; the no-blockers test uses `any()`, so an added line would not refuse

8. **F8, note: act chain complete; some text and one script are stale**
   - [Observed] Sweep over `b3cd3a43`, 9,084 tracked files
     - Scope: 774 files under `packages/`, `apps/`, `scripts/`, `.github/`, plus `PROJECT-STATUS.md`
     - Run by `git grep`, then again by Python `re` over `git ls-tree -z`
   - [Observed] Results, version 6 as anything but history: 0 outside the items listed in this finding
     - Version literal: 6 hits in 4 files; all chain fixtures or the v6 recorder
     - Act file name: 19 hits in 8 files
       - Superseded pointer, chain forms, pins, the v6 recorder
       - `render_act` test comment
     - Tag: 2 hits, v6 recorder
     - Identity: 4 hits, chain and v6 recorder
     - Digest: 2 hits, chain pins
     - v7 literal: 11 files, matching the ledger's 11
   - [Observed] Narrative sweep over a further 6,935 files: no current-version-6 claim, with raws and evidence excluded
     - One regex; a near-word phrasing could escape it
   - [Observed] `check_governance.py`, `install_redis_sitting.py`, `governance-inputs.ts`, `package-reader.ts`: correct by reading and by their selftests
   - [Observed] Stale or broken remainders
     - `scripts/redis_screening_v6_measure.py:80` calls `v6.base_bytes`, which now raises; not in CI
     - `build_public_source_screening_scope_v6.py --check` fails the same way; not in the battery
     - The commit message discloses the v7 builder's limit, not these
     - `render.ts:201-202`, `dossier-render.ts:101`, `dossier-site.ts:633` still say "version 3" for the condition
     - `PROJECT-STATUS.md:238` has 2 cells where neighbours have 3

9. **F9, note: parse5 fits, with one guard gap**
   - [Observed] Imports only `entities/decode` and `entities/escape`
     - No `node:` import, `fetch`, `process`, `eval` or `Function` in `parse5/dist`
     - The `entities` package was not grepped the same way; its bare imports came back empty
   - [Observed] esbuild metafile
     - `apps/syzygy/src/main.ts`: 14 parse5 and 5 entities modules, dynamic imports included
     - `packages/polaris-dossier/src/cli.ts`: the same
     - `apps/three-surface-poc/src/main.ts`: 0
   - [Observed] Exported from `live.ts` only, not the barrel
   - [Observed] Passing
     - `no-egress.test.ts`, under strace: 0 Internet-family sockets
     - `workspace-reach`, `island-boundary`, `support-purity`, `subpath-imports`, `product-build`
     - `npm run build`, `npm run test:tiers`
   - [Observed] Engines fit: `entities` needs node 20.19 or later, the root requires 22.15
   - [Observed] Guard gap: with `node_modules/parse5` hidden
     - `scripts/check_generator_install.mjs` exits 0
     - `syzygy dossier --help` dies on `ERR_MODULE_NOT_FOUND`
     - That guard exists to refuse this with an instruction
     - Repair: add parse5 to the guard and its test
   - [Observed] Two parses of a 2.47 MB page: 479 ms; minor

10. **F10, note: `pageSinkUnconfirmed` reading every non-`.json` file as a page is right, and the renderers still work**
    - [Observed] `.json` over `file://`: `application/json`, 0 scripts, nothing ran
    - [Observed] `.JSON` is read as a page and refused; fail closed
    - [Observed] With a temporary edit, `pageSinkUnconfirmed` returned null for `renderDossier` and `renderLocalDossier`
    - [Observed] The draft preview returned null from both reader functions
    - [Observed] `render.test.ts:450` already renders `renderLocalDossier` through `renderRun`
    - Only the XML reading is wrong (F1)

11. **F11, note: tests did not weaken; some predicates have no mutant**
    - [Observed] Changed tests, by reading the diffs
      - `screen-scope-v5`, `screen-scope-v6`: same fixtures and oracle, older bytes now reached by reversing the patch, with an assert
      - `public-source-exemption`: `img-src data:` left the fixture because the closed set refuses it; every refusal row stays, reasons updated
      - `governance-inputs`: pointers move; the census moves 69/55/50 to 70/56/51, a characterization of one more line
    - [Observed] Evidence file: 36 of 36 killed, at `652cf241`, covering `page-sink.ts` and `render.ts` only
      - I did not re-run those 36
    - [Observed] My 16 further mutants, over 9 test files: 8 killed, 8 survived
      - Killed: lowercase of `http-equiv`, HTML-namespace-only scripts, each `renderCondition` digest, superseded pointer back to v5, `v7` field, v7 identity
    - [Observed] Survivors with behaviour, so these predicates have no test
      - `page-sink.ts:105`: viewport attribute count, name and content (3 mutants)
        - e.g. a `<meta http-equiv=refresh content=…>` could then precede the policy
      - `page-sink.ts:103`: the `tagName === 'meta'` limb
      - `scriptSource`: joining only direct text children
    - [Inferred] Equivalent survivors: `top[0]`, `top[1]`, `attr.prefix`, `isBlankText`
    - [Observed] Builder oracle: 70 of 70 rows agree on allow or refuse
      - 4 reasons differ, all the ledger's non-ASCII-first rule
    - [Observed] 20,000 mutated policies, TS against Python `csp_finding`: 0 disagreements, 314 accepted

12. **F12, note: outcomes the reader holds, and one it does not attempt**
    - [Observed] Refused or inert as expected in Chrome 120
      - Duplicate `content`, smuggled meta, duplicate `http-equiv`, trailing space in `http-equiv`
      - Script in template, declarative shadow root, MathML, iframe raw text
      - `img onerror` and `iframe srcdoc`: confirmed by the reader and blocked by the policy
    - [Observed] A visible `<meta http-equiv=refresh>` is confirmed and navigates (`GET /elsewhere`)
      - The clause's navigation limb governs scripts, and the reader does not claim this
      - It is another renderer-only path

## What I ran

- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL
- `check_governance.py --selftest`: 433 fixtures, 0 failing
- Recorder `--selftest` and `--check`; `install_redis_sitting.py --selftest`: 171 of 171
- `npm run check:battery`: 121 ok, 0 failed
- `npm run check`
  - First run: 1 failed of 3,923, `island-boundary.test.ts`, a 5,000 ms timeout while my Chrome probes ran
  - Second run, with no probes: 3,923 of 3,923; alone, that test took 2,633 ms
  - [Inferred] Load, not this change
- `npm ci`, `npm run build`, `npm run test:tiers`
- The named reach, purity, no-egress and browser tests
- Chrome 120.0.6099.224 headless through `cdp-browser.ts`, over `file://` and one loopback origin
- Probes and harness, in `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/v7inst`
- Throwaway source and test mutations in my worktree, each restored; tree clean at the end

## What I did not run

- `npm run test:integration`, the full `test:e2e` and `test:system`
- The 36 recorded mutants
- The Butlers gate on the real tree
- Any other browser or Chrome version: [Unknown]
- Any observed repository body, dossier run or provider call
- No push, commit or change to another checkout; no secret read
