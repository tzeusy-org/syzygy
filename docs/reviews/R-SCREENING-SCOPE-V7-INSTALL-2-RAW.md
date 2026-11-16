# Review, round 2 — screening scope version 7, recorder and install
Reviewed commit: d88188a4ada24c2efab90b92485abbab1a85488d
Subject: repair of the page reader, policy row prefix 626be0ca
Verdict: REVISE

- Summary
  - Two page forms pass both reader functions while Chrome decodes ISO-2022-JP, loses the policy and runs an unpinned script (finding 1).
  - Only a renderer can write these pages.
    - No shipped renderer does, and no source body can.
  - REVISE rests on one limb only, the false record.
    - The F1 disposition says the rule holds, and on these pages it does not.
    - If "false record" is meant more narrowly than a disposition sentence, this grade becomes CONFIRM WITH EXCEPTIONS. The lead may overrule.
  - F2, F3, F8, F9, F11 and F12 did what the file says.
  - The real renderers still confirm.
  - The mutants file matches its commit.

## Findings

1. **blocking (false record): F1 is not repaired as stated, because the same outcome returns by two new routes**
   - Anchors
     - `docs/evidence/screening-scope-v7-install-dispositions-2026-11-07.md:7`
     - `packages/polaris-generation-core/src/page-sink.ts:11-12`, `:101`, `:110`, `:111-112`
     - `packages/polaris-dossier/src/render.ts:72`
   - The false sentence: "inside the prescan, with no other encoding statement"
   - Payload shared by both routes, placed after the charset meta (`\x1b` is ESC)
     - `<meta name="viewport" content="\x1b$B">`
     - then the lawful policy meta with one stray attribute: `x='\x1b(B"><script>…</script>'`
     - parse5 reads the script as the value of `x`.
     - In ISO-2022-JP the quotes are consumed as kanji pairs, so the script is live.
   - Route A: a duplicate attribute, with no padding
     - `<meta charset="utf-8" charset="iso-2022-jp">`
     - [Observed] `pageSinkCspFinding`, `pageSinkScriptFinding` with `[]` and `pageSinkUnconfirmed` on `x.html` all returned null.
     - [Observed] Chrome: `characterSet` ISO-2022-JP, 0 policy metas, 1 script, script ran, policy not enforced.
     - [Observed] The same result with `CHARSET=`, a triple form, and `charset=""` as the last value (autodetected).
     - [Observed] A renderer-shaped head (`<html lang="en">`) gives the same result.
     - [Observed] `charset="utf-8" charset="windows-1251"` confirms and decodes as windows-1251, with no payload.
     - [Inferred] parse5 keeps the first duplicate and Chrome's prescan keeps the last.
       - The reversed order is refused by the reader, and Chrome reads it as UTF-8.
     - `:110` checks `first.attrs.length === 1`, and parse5 has already dropped the duplicate.
   - Route B: a decoy `<meta`, past the prescan
     - `<!doctype html><html></x><!-- <meta xxx…1100 bytes --><head><meta charset="utf-8">…`
     - [Observed] Confirmed by all three. Chrome: ISO-2022-JP, 0 policy metas, script ran.
     - [Observed] These variants also hit:
       - `</x a="<meta …">`
       - `<html a="<meta"></x><!-- pad -->`
       - `<head a="<meta"></head><!-- pad -->`
       - `</x a="<meta">` followed by 1100 spaces after `<head>`
     - [Observed] Controls
       - No decoy: refused by the bound.
       - 700 bytes of padding: reader confirms, Chrome UTF-8, inert.
       - Padding with no end tag or `</head>` before it: reader confirms, Chrome UTF-8, inert.
     - `:111` measures to the first `<meta` in the raw string, not to the element it checked at `:110`.
     - [Inferred] An ignored end tag ends Chrome's in-head scanning, so it stops at 1024 bytes and then autodetects.
   - [Observed] What the script could do, over `file://` with a loopback listener
     - Both routes: `GET /iso-script-fetch` and `GET /iso-script-nav` reached the listener.
   - Reachability
     - Source body: **not reachable**. [Observed] A hostile canary went through `renderDossier`, `renderLocalDossier` and `renderDraftPreview`, and all confirmed.
       - It held ESC sequences, a charset meta, `</x a="<meta`, CDATA, NUL, a BOM and CRLF.
     - Renderer: reachable by any injected renderer that writes such a head.
     - [Observed] The shipped heads are fixed templates (`dossier-site.ts:174`, `draft-preview.ts:123`), with the first meta at offset 37.
     - Round 1 graded this same reachability as a note, and the lead repaired it as a security defect.
   - Repair, small
     - Anchor the raw string with a case-insensitive pattern: optional ASCII whitespace, `<!doctype html>`, `<html` with at most a `lang` attribute, `<head>`, then exactly `<meta charset="utf-8">`.
     - This closes both routes, and the real heads already match it.
     - Add both routes to `page-sink-csp.browser.test.ts`.
     - Correct the disposition.
   - [Observed] The Chrome fixture named in the disposition exists and passes. It holds only the single-attribute charset page.

2. **note: question 1, F2 holds**
   - Anchor: `page-sink.ts:127`, `:147`
   - [Observed] With a pinned hash, the hidden `<script src=ext.js integrity=…>` form is refused as an external reference.
   - [Observed] The hidden inline copy of a pinned script still confirms and runs. That is the pinned script itself, not one outside the pin.
   - [Observed] With the empty set, `pageSinkUnconfirmed` refuses both hiding forms. The false comment is gone.

3. **note: question 1, F3 holds as a tripwire, as disclosed**
   - Anchor: `page-sink.test.ts`, `pinHeadOk`
   - [Observed] Temporary pin to `docs/reviews/R-ZZ-FAKE-RAW.md`, with each raw's result:
     - `Verdict: REVISE`: the pin test fails.
     - Wrong hash: the pin test fails.
     - Hash only in the body: the pin test fails.
     - A made-up raw with `Verdict: CONFIRM` and the hash: the pin test passes.
   - [Inferred] The file and the code comment say this is not a review gate, so that last result is not a false record.

4. **note: question 1, F8 is true for what the raw named; other text is stale**
   - [Observed] Fixed: `render.ts:205`, `dossier-render.ts:101`, `dossier-site.ts:633`, and `PROJECT-STATUS.md:238` (now 3 cells).
   - [Observed] Neither version 6 script appears in `.github`, `package.json` or the `PROJECT-STATUS.md` battery by name.
   - [Observed] `build_public_source_screening_scope_v6.py --check` fails, as disclosed.
   - [Observed] `redis_screening_v6_measure.py --help` runs. I did not run its measure path.
   - [Observed] Still stale, not named by the raw
     - `apps/three-surface-poc/src/polaris-generation/page-sink.test.ts:63`: describe title "version-3 renderCondition"
     - `packages/polaris-dossier/src/page-sink-unconfirmed.test.ts:9`: "Every file but a machine view is a page, whatever its extension". The code now refuses such a file.

5. **note: question 1, F9 holds**
   - Anchor: `scripts/check_generator_install.mjs:7`
   - [Observed] With `node_modules/parse5` hidden: exit 1 and the instruction. Restored: exit 0.
   - [Observed] The test has a `parse5` row.

6. **note: question 1, F11 holds, and some predicates still have no killing test**
   - Anchor: `page-sink.test.ts`, the text-child test; `page-sink.ts:139`, `:111`, `:110`
   - [Observed] Mutants 30 to 33 (viewport attributes and the `meta` limb) are killed.
   - [Observed] My further mutants, over the evidence file's four test files
     - Killed: `CHARSET_PRESCAN_BOUND` set to 1023, and set to 1000000.
     - Survived: `scriptSource` using the first child only.
       - This is the disclosed near-equivalent. The test title "hashes every text child" overclaims.
     - Survived: `<meta` search made case-sensitive.
     - Survived: `.toLowerCase()` dropped from the charset comparison.
   - [Inferred] Neither of the last two has a fixture, for example `<META CHARSET=UTF-8>`.

7. **note: question 1, F12 holds for refresh metas the parser can see**
   - Anchor: `page-sink.ts:100`
   - [Observed] Refused: a visible refresh in head or body, one in `<noscript>`, one in a template or declarative shadow root. All outcomes below were re-run.
   - [Observed] Refused: duplicate `content`, smuggled meta, duplicate `http-equiv`, trailing space in `http-equiv`.
   - [Observed] Inert in Chrome: a refresh in iframe raw text.
   - [Observed] `<iframe srcdoc>` holding a refresh: confirmed by the reader, and no request reached the listener.
   - [Observed] Frame, `@import`, stylesheet link and `img` to loopback: confirmed, and no request.

8. **note: question 2, the rest of the probe set found no other gap**
   - Population
     - 245 named probes in one run, 39 in a second, 9 with a listener.
     - A grammar fuzz of 7,784 confirmed pages, 0 bad. Bad means Chrome differs on charset, policy, script count, refresh or run.
     - The hits are in finding 1: only `charset dup attr` and `prescan: end-tag attrs` were bad in the 245.
     - Pages the reader refuses were not counted in the fuzz.
   - Each row: [Observed] Chrome 120, `file://`.
   - BOM
     - U+FEFF first, U+FFFE, mojibake EF BB BF, after the doctype, between html and head, in head before the charset: all refused.
     - Strings as `writeFileSync` writes them.
   - Charset label
     - Refused: `UTF8`, `utf8`, `utf-8 `, ` utf-8`, `utf-8\t`, `unicode-1-1-utf-8`, `utf-16`, `utf-16le`, `x-user-defined`, labels with NUL.
     - Confirmed, Chrome UTF-8, inert: `UTF-8`, `Utf-8`, `utf&#45;8`, `&#117;tf-8`, unquoted, upper-case attribute name, FF and CR separators, self-closed.
     - [Unknown] Other browsers. The spec's prescan does not decode a character reference, so `utf&#45;8` may differ there.
   - `<base>`
     - After the policy or in the body: confirmed, and Chrome keeps the policy enforced. Before the policy: refused.
   - Policy after `<noscript>` in head: refused.
   - `<noscript>` after the policy with a style or title trick: refused.
   - Nested parsers and foreign content: no divergence.
     - `</p>`, `</br>`, `<p>` and `<font color>` break-outs; `mglyph`, `malignmark`, `annotation-xml`, form mXSS, template in SVG.
     - Each is refused where Chrome has a script, and inert where the reader confirms.
   - CDATA in an integration point
     - [Observed] parse5 reads it as a bogus comment (`tokenizer/index.js:1976`, `parser/index.js:196`).
     - I expected Chrome to read CDATA there and expose a hidden script.
     - [Observed] Chrome 120 had 0 scripts across `title`, `desc`, `foreignObject`, `mi`, `mtext`, `annotation-xml`. No divergence.
   - `<frameset>`: 11 forms. Handlers and frames were blocked, and no script appeared where the reader confirmed.
   - Raw text
     - `xmp`, `noembed`, `noframes`, `textarea`, `title`, `iframe`, `style`: 12 boundary forms each.
     - `plaintext`: 5 forms.
     - No confirmed page had a live script.
   - NUL, VT, FF, CR, CRLF, U+2028, U+0085, lone surrogates, comment-end variants, depth 600: no divergence.
     - NUL before the policy is refused while Chrome keeps it. That fails closed.
   - `.json`
     - A file holding a script, or the polyglot: `application/json`, 0 scripts.
   - `.svg`, `.xml`
     - [Observed] The reader alone confirms the polyglot and Chrome runs it.
     - [Observed] `pageSinkUnconfirmed` refuses it by name, so the F1 name rule holds.
   - To disk
     - [Observed] `render.ts:216` and `:254` write the same map entries the check read, as UTF-8.
     - [Inferred] A lone surrogate becomes U+FFFD and changes no token boundary. Probes agreed.
     - The check runs only when an exempt body is cited (`render.ts:214`). It is the same in the old code, and that is the clause's scope.

9. **note: question 3, no real renderer broke**
   - [Observed] `pageSinkUnconfirmed` returned null for `renderDossier` and for `renderLocalDossier`: 11 files, `.html` and `.json` only.
   - [Observed] `renderDraftPreview` returned null from both reader functions.
   - [Observed] Their tests hold less than this.
     - `page-sink.test.ts` in the app calls only `pageSinkCspFinding`.
     - Only `renderLocalDossier` reaches `pageSinkUnconfirmed`, through `render.test.ts:450`.
     - I checked the rest with a throwaway test, since removed.

10. **note: question 4, other dispositions and weakening**
    - [Observed] Nothing the earlier reader refused is now accepted.
      - The reader only gained refusals.
      - `public-source-exemption.test.ts` keeps every row and adds the charset to its fixtures.
      - The `.svg` test now refuses by name and holds a stricter case.
    - [Unknown] F4's beads
      - `bd show syzygy-pdja.3` returned "not found" in this worktree, and `.2` printed only warnings in the lines I read.
      - `.beads/issues.jsonl` is absent here. I did not query another checkout.
    - [Observed] F5 is still ahead: `git ls-remote` shows no v6 or v7 tag. It is a declared landing step.
      - The raw's fail-closed reading of Butlers reads still applies until the tags are pushed.
    - [Unknown] F6's instants: the form file is outside the repository. Unchanged from round 1.

11. **note: question 4, the mutants file matches**
    - Anchor: `docs/evidence/screening-scope-v7-install-mutants-2026-11-07.json`
    - [Observed] It names `3ef6023b`, and `d88188a4` changes only this file, so the code is the same.
    - [Observed] All 47 re-run from the stored `old` and `new`: each `old` occurs exactly once, 47 killed, and each failure line equals the recorded one.
    - [Observed] Population 47, all killed, as the file says.
    - [Inferred] Rebase-merge will leave the named commit unreachable. The stored fragments keep it re-runnable.
    - [Observed] Passing all 47 says nothing about finding 1: no test or mutant covers a duplicate charset or a decoy.

12. **note: landing**
    - [Observed] `main` at `b1d03434` is the merge base, and the merge is clean.
    - [Observed] The commands asked for pass (listed below).

## What I ran

- `npm ci`
- `npm run check`: 172 files, 3,940 of 3,940 tests
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL
- `npx vitest run apps/three-surface-poc/src/polaris-generation/page-sink-csp.browser.test.ts`: 6 of 6
- `draft-preview.browser.test.ts`, `svg-inert.test.ts`, `dossier-reading.test.ts`: 48 of 48
- `scripts/check_docs_review_campaign_partition.py --check`: PASS, unmatched 0
- Chrome 120.0.6099.224 headless through `cdp-browser.ts`, over `file://`, with one loopback listener
- Probe harnesses, kept in `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/r2/`
- All 47 recorded mutants, 5 of my own, and 4 temporary pin cases; each restored
- Hiding `parse5` for the guard, then restoring it
- `git merge-tree` against `main`
- Worktree clean at `d88188a4` at the end, apart from ignored `bd` files in `.beads/`

## What I did not run

- `npm run check:all`, `test:integration`, the full `test:e2e` and `test:system`, or the battery
- The recorder `--selftest` and `--check`. The repair does not touch the recorder.
- `redis_screening_v6_measure.py` beyond `--help`
- Any other browser or Chrome version: [Unknown]. A newer Chrome's `<select>` parsing may differ from parse5's, and I did not test it.
- The Butlers gate on the real tree
- Any observed repository body, dossier run or provider call
- No push, commit, secret read or change to another checkout
