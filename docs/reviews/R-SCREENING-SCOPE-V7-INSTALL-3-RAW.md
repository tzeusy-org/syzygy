# Review, round 3 — screening scope version 7, repair of the page reader's fixed opening
Reviewed commit: f182fc91cbd1fcedf4ec08f1d37a782d9b56cf6e
Subject: repair of the page reader's fixed opening, policy row prefix 626be0ca
Verdict: CONFIRM WITH EXCEPTIONS

- Summary
  - I found no page that the reader and `pageSinkUnconfirmed` confirm while Chrome decodes anything but UTF-8, loses the policy or runs a script.
  - Both routes from round 2 and their variants are refused.
  - All real renderers confirm.
  - The mutants file matches the code.
  - There are no blocking or revise findings.
  - The exceptions are six notes, mainly a stale code comment and an unstated consequence: nothing now bounds how far into the file the charset sits (finding 2).

## Findings

1. **note: question 1, finding 1's routes are closed, with no break found**
   - Anchor: `packages/polaris-generation-core/src/page-sink.ts:92`, `:116`
   - Population A, the round 2 routes: 17 hostile openings with the script hidden in the policy meta's stray attribute.
     - [Observed] All 17 were refused by the reader, on both Chrome versions.
     - [Observed] On Chrome 120, 14 of them decode ISO-2022-JP, lose the policy and run the script. That shows the probes are live.
     - [Observed] They include `CHARSET=`, a triple attribute, `charset=""`, `lang` plus a duplicate, and `windows-1251`.
     - [Observed] They include the decoy forms: `</x>` plus a comment, `</x a="<meta">`, `<html a=`, `<head a=`.
     - [Observed] They include an ignored end tag in each gap followed by 1,100 spaces.
   - Population B, what the pattern lets through plus what follows the meta: 156 named pages (`v7r3-probe/probe.ts`).
     - [Observed] 109 confirmed and 0 were bad, on both Chrome 120.0.6099.224 and Chromium 148.0.7778.96.
     - Bad means not UTF-8, policy meta count not 1, a script in the DOM, the script ran, or quirks mode.
     - Whitespace confirmed:
       - each of space, tab, LF, FF, CR and CRLF in all four gaps;
       - 1,100 of a character;
       - 70,000 spaces;
       - 5,000,000 spaces.
     - `lang` values confirmed: empty, `-`, `iso-jp`, `charset`, and `x` repeated 1,100 and 70,000 times.
     - Mixed case of every token also confirmed.
     - After the charset, confirmed and inert:
       - a charset meta in a comment, title, style, noscript comment or textarea;
       - `charset=` inside viewport or policy attribute values;
       - duplicate attributes, slash separators, entity spellings;
       - a re-opened `<html>` or `<head>`.
     - A real second `charset` attribute on a later meta is refused.
   - Near-misses, 35 rows, all refused.
     - U+017F, U+212A and U+0131 do not case-fold through the pattern. It has no `u` flag.
     - Also refused: VT, NBSP, NUL, a BOM, U+2028, U+0085, a first line of junk, an `<?xml encoding=…?>` declaration, unquoted and self-closed metas.
   - Population C, a grammar fuzz with a sound generator.
     - [Observed] Chrome 120: 2,000 distinct pages, all 2,000 confirmed, 0 bad.
     - [Observed] Chromium 148: 800 distinct pages, all 800 confirmed, 0 bad.
     - My first fuzz (1,200 and 300 pages, 0 bad) used a weak generator, so I discarded it as evidence.
   - [Inferred] The reason it holds: the first meta Chrome's prescan sees is the exact charset element, and nothing before it can make the prescan stop.
   - [Observed] Chromium 148 narrows round 2's `<select>` [Unknown]. The `<select>` forms I tried diverged only in the fail-closed direction: parse5 sees a script, the reader refuses, and 148 holds none. Examples are `<style>`, `<title>` and `<xmp>` in a `<select>`.
   - [Observed] The `<svg><textarea>` form in a `<select>` holds no script on 148.
   - [Unknown] This was a sample of `<select>` forms, not a proof.

2. **note: the prescan bound is gone, and the record does not say so plainly**
   - Anchors: `page-sink.ts:89-92`, `page-sink.test.ts:123`, `docs/evidence/screening-scope-v7-install-dispositions-2026-11-07.md:7`, `:24`
   - [Observed] A page with its charset past byte 1,024 now confirms, whether by whitespace or a long `lang`. Round 1's 512 bound refused such pages.
   - [Observed] No failure results in the browsers I ran.
     - Chrome 120 and Chromium 148 decode UTF-8 and keep the policy.
     - Firefox 157 reports UTF-8 on the same padded openings with no policy, with ISO-2022-JP escapes in the body (leading padding of 1,100 and 5,000, `lang` of 1,100 and 70,000, gap of 1,100).
     - With the hiding payload and a policy, seven padded pages sent no beacon. Three controls behaved as expected, including one Firefox hit on a declared ISO-2022-JP page.
   - [Unknown] Safari and other engines.
   - [Inferred] A browser that stops its prescan at 1,024 bytes would not reach the charset. A short cap on the opening's length would remove the question and refuses nothing the shipped renderers write.
   - The F1 sentence's "inside the prescan" stays in the file by stated choice. The round 2 section says the distance check was replaced, but not that no distance is now enforced.
   - The test row named "a charset past the prescan" is refused for its `title` attribute, not its distance. Its name implies a rule the code no longer has.

3. **note: a stale comment was left behind**
   - Anchor: `page-sink.ts:89`
   - [Observed] "How far into a page's bytes the charset must start. The browser's prescan reads 1024; this leaves room for the element itself." described `CHARSET_PRESCAN_BOUND`, which was removed. It now sits above `FIXED_OPENING` and is false.
   - The comment at `:90`, "Nothing a browser's prescan could read differently", holds for the Chromes and for Firefox as tested in finding 2. It is not established for a prescan limited to 1,024 bytes.

4. **note: test coverage of the fixed opening has two gaps; the code itself refuses these pages**
   - Anchors: `page-sink.ts:92`, `page-sink.test.ts:125-126`, `apps/three-surface-poc/src/polaris-generation/page-sink-csp.browser.test.ts`, `hiding` and `closing`
   - [Observed] Changing the gap after `<head>` to accept anything survives `page-sink.test.ts`, `public-source-exemption.test.ts` and `page-sink-unconfirmed.test.ts`. I did not run `render.test.ts` for this mutant.
     - No fixture places an ignored end tag there. Round 2 named a variant around that position.
     - [Observed] The real pattern refuses `<head></x>` plus 1,100 spaces, and Chrome 120 is live on that page.
   - [Observed] The Chrome fixtures' script sits outside the hiding attribute, so parse5 sees it.
     - They assert only `pageSinkCspFinding`, and they are not the "hidden from parse5" form round 2 reported.
     - `pageSinkUnconfirmed` would refuse these fixture pages through the script check even with no opening rule.
     - [Observed] My probes with the script hidden in the attribute are refused by the opening rule, so the code holds.
   - [Observed] Neither route's fixture has a UTF-8 control beside it.

5. **note: question 2, the renderers still confirm, and lawful forms narrowed by rule**
   - Anchors: `dossier-site.ts:174`, `draft-preview.ts:123`
   - [Observed] `pageSinkUnconfirmed` returned null for `renderDossier` and `renderLocalDossier`. Both reader functions returned null for `renderDraftPreview`.
     - Runs covered synthetic sources and a hostile canary, 28 pages in all: `renderDossier` 9 and 9, `renderLocalDossier` 8, `renderDraftPreview` 1 and 1.
     - The canary held ESC sequences, a charset meta, `</x a="<meta`, CDATA, NUL, a mid-body BOM, CRLF and a script. Titles carried it where the input allows.
   - [Observed] Every one of those pages in Chrome 120: UTF-8, 1 policy meta, 0 scripts, not run.
   - [Observed] The source layer rejects a lone surrogate (`body-mismatch`), so that canary form never reached a renderer.
   - [Observed] Nothing the shipped renderers write is refused. All open `<!doctype html><html lang="en"><head><meta charset="utf-8">`.
   - [Observed] The pattern refuses forms an injected renderer might lawfully write:
     - `lang="es-419"` (digits);
     - single-quoted or unquoted attributes;
     - `<meta charset="utf-8"/>`;
     - any other `<html>` attribute.
     - This fails closed, and the disposition states the fixed head. Only the `lang` digits are not visible from its wording.

6. **note: questions 3 and 4, the mutants file and dispositions**
   - Anchors: `docs/evidence/screening-scope-v7-install-mutants-2026-11-07.json`, the dispositions' "Round 2" section
   - Mutants
     - [Observed] `git diff 15dfa758 f182fc91 --name-only` lists only the dispositions file and the mutants file. `15dfa758` is an ancestor of the commit, so the code is the file's named commit.
     - [Observed] All 51 `old` strings occur exactly once, with 51 distinct ids, population 51 and 51 `killed`.
     - [Observed] I re-ran ids 24 to 33, which include the six fixed-opening mutants, ids 28 to 33. All were killed, and each failure count equals the recorded one.
     - [Observed] I did not re-run the other 41.
   - True, each checked
     - The opening rule and its replacement of the prescan-distance check: the diff at `3f434f23`.
     - "Chrome fixtures hold both routes", subject to finding 4.
     - Finding 4's two corrections.
     - "A fixture confirms the opening in upper case": `page-sink.test.ts:106-109`.
     - The reachability sentence: [Observed] on the shipped heads and the canary.
   - Loose, not false: "kills the two surviving case mutants"
     - [Observed] Dropping `.toLowerCase()` from the charset comparison now fails 1 test.
     - [Observed] The other survivor's code, the case-insensitive `<meta` search, no longer exists. Its nearest analogue, dropping the pattern's `i` flag (id 30), is killed.
     - The test is what round 2's Finding 6 asked for, so this is a wording issue only.
   - Cannot be checked from tracked bytes: [Unknown] "with a baseline guard" and "a run over a failing baseline was discarded"
     - The file records neither. No baseline field exists.
   - [Observed] `git diff d88188a4 3f434f23` removes no line from the dispositions file, so the F1 sentence stays as written, as stated.

## What I ran

- `npm ci`
- `npm run check`: 172 files, 3,948 of 3,948 tests
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL
- `scripts/check_docs_review_campaign_partition.py --check`: partition PASS, unmatched 0
- `page-sink-csp.browser.test.ts` (8 of 8), plus `page-sink.test.ts` and `page-sink-unconfirmed.test.ts` in the same run
- `page-sink-csp.browser.test.ts` with `draft-preview.browser.test.ts`: 9 of 9
- The evidence file's four runner test files: 238 of 238
- Chrome 120 and Chromium 148 through `cdp-browser.ts` over `file://`
- Firefox 157 run directly from its snap directory, headless with content sandboxing disabled, using a loopback beacon
  - Encoding was read only on no-policy pages.
- Throwaway harnesses swapped temporarily into the browser test's path, then restored
- Mutants as listed, each restored
- Worktree clean at `f182fc91` at the end
- Harnesses kept in `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/v7r3-probe/`

## What I did not run

- `npm run check:all`, `test:integration`, the full `test:e2e` and `test:system`, or the battery
- The other 41 recorded mutants
- The recorder's `--selftest` and `--check`, and the Butlers gate on the real tree
- Safari or any other engine: [Unknown]
- Any re-check of round 2's findings 2, 3, 5 and 7 to 12, which were out of scope
- Any observed repository body, dossier run or provider call
- No push, commit, secret read or change to another checkout
