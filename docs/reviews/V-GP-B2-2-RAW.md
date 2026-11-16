# V-GP-B2-2 — independent vet of owner packet GP-B2, draft 2
Verdict: READY WITH EDITS
Packet: PACKET-DRAFT-2.md sha256 2eab33611519f0c82587e9d71d45eea550bb4364034addc038625961a7046406
Items: Q1 EDIT, Q2 PASS, Q3 PASS, Q4 PASS, Q5 PASS, Q6 PASS, Q7 PASS

Vetter: the V-GP-B2-1 vetter, on a narrow second pass, 2026-10-28. I changed no byte of the packet. Line numbers below are lines of
draft 2's frozen bytes unless "draft 1" is named.

## 0. Subject and method

- [Observed: `sha256sum`] Draft 2 hashes to `2eab33611519f0c82587e9d71d45eea550bb4364034addc038625961a7046406` and draft 1 still to
  `5c50ba0f37a27862803124f4180c7e2e58192930cb814c78bcabf2590fe46dda`. Draft 2 holds no U+00A0.
- [Observed: `tools/vet2_diff.py`, Python `difflib.unified_diff` with no context lines, output `out/diff-d1-d2.txt`] 54 hunks, 121
  lines removed, 204 added. The same script checks each labelled replacement block of the V-GP-B2-1 raw against draft 2, as
  whitespace-collapsed text (`out/edit-landing.json`). I read the draft-1 text and the hunk it was replaced by for every hunk.
- [Observed: V-GP-B2-1's `check_evidence_digests.py`, output `out/evidence-digest-check-draft2.txt`] 85 listed evidence files, 85
  match, 0 mismatch, 0 missing, 85 on disk, 0 unlisted. That is draft 1's 71 plus the 14 the evidence section names (5 tools, 9
  outputs); the two vetter tools copied in hash to V-GP-B2-1's values, and `vet-q1-sibling-spread-rerun-95c87a52.json` is
  byte-identical to my `vet-q1-sibling-spread-main.json`.
- Re-runs: one scratch clone of `main` at `95c87a52` (`npm ci` and `npm run build:poc`, exit 0), Node v24.6.0, private TMPDIR
  `/tmp/vgpb2-2`. Inputs were synthetic or tracked Syzygy files. No body of Butlers or of any other observed repository was read,
  and no daemon was pointed at one. No bd command ran in this pass. The clone and TMPDIR are deleted (section 5).

## 1. Were the V-GP-B2-1 edits applied faithfully?

All were applied. 23 of the 31 labelled blocks landed verbatim. The other 8 landed with additions of the drafter's own, and each one
is either checked in section 2 or is wording only:

| Edit | Where in draft 2 | Verbatim | What differs |
|---|---|---|---|
| E1.1 | 76-78 | yes | |
| E1.2 | 80-87 | no | "in an LF file" became "in an LF or CRLF file": a new observation, confirmed (2.3) |
| E1.3 | 96 | yes | |
| E1.4 | 112-116 | no | adds the drafter's re-run at `95c87a52`; my "[Unknown] with CRLF or CR" is replaced by the observed rows at 117-122 (confirmed, 2.3), and my Butlers Unknown moves to 134-136 |
| E1.5 | 139-144 | no | adds the 503 sentence (2.4) |
| E1.6 | 153 | yes | |
| E1.7 | 164-173 | no | "the agents also file" became "the coordinator also files"; "other 30" became "other 31", with the sweep counts (2.5) |
| E1.8 | 175-176 | no | "LF files" became "LF and CRLF files" (2.3) |
| E2.1-E2.5 | 209-210, 211-213, 229-239, 249-250, 269-270 | yes | |
| E3.1, E3.2 | 312-319, 333-335 | yes | |
| E4.1 | 350-354 | no | adds "the **testkit** below", which defines a term I had listed as undefined |
| E4.2-E4.5 | 379-381, 395-400, 404-407, 28 | yes | |
| E5.1-E5.4 | 413-415, 431-432, 462-465, 472-473 | yes | |
| E7.1 | 563-565 | yes | |
| E8.1 | the Q8 section | applied | see section 3 |
| E8.2 | 585-590 | no | adds "(or alone, if Q7 is not answered A)", which is correct: the change is agent work either way |
| E9.1, E9.2 | 576-577, 582-583 | yes | |
| W1 | 51-54 | yes | |
| W2 (all nine bullets) | 1, 25, 26, 28, 33-34, 36-37, 60, 63; the Q8 row is gone | yes | |
| W3 | 594-607 | no | my line on the extractor's CRLF and CR behaviour is dropped, now that it is observed (117-122); "the other 30" became "31" (2.5); the drafter's own list threshold is added |

Unlabelled items from V-GP-B2-1 were applied too:
- the vet-gp path note: 243-244, 256-258, 328-329, 376;
- the undefined "dossier screen": defined at 102;
- "malformed decisions": rewritten at 261;
- the link-hide residual: renamed at 266.

**One correction of my own raw.** V-GP-B2-1 counted the spread sweep by line, 32, and called those lines "calls". Draft 2's 33
calls on 32 lines is right (2.5). So "the other 30" in my E1.7 and W3 was wrong, and draft 2's "31" is the correct figure.

## 2. New or changed facts in the diff

**2.1 Snapshot lines 13-18.**
- [Observed: `git ls-remote origin`, `gh pr list --state all`] `main` is `95c87a52`. PR #544 is OPEN at `561e4f77`, and PR #545 is
  OPEN at `12d70cf0`; neither has merged.
- [Observed: `git diff --name-only ecea355b 12d70cf0`] Outside `docs/evidence/syzygy-bpyt-6-14/`, PR #545 changed only
  `packages/support/src/support-purity.test.ts`.
- [Observed: `git diff --name-only b10e4da9 95c87a52`, and the diff of the two code files] Outside `docs/`, three files changed:
  - `generation-mutation.ts`: a two-line comment;
  - `generation-mutation.test.ts`: the test;
  - `workspace-reach.testkit.ts`: one hunk inside a doc comment (`-58,15 +58,15`), which ends with unchanged context at `:72`. So the
    cited `:72-78` keep their lines and their text.

  All three claims hold.

**2.2 Q1, the dossier screen gloss (line 102).** [Observed, by reading `polaris-dossier/src/check.ts:343-357` and `screen.ts:105-133`
at `95c87a52`] `check.ts` loads the screen and hands it to `deriveFindings` over the pinned object reader. `screenBody` runs the
secret detectors and then the active-content scan. The gloss is accurate.

**2.3 Q1, the list rows (lines 86, 117-122, 176).** I re-ran them with my own probe, `tools/vet2-q1-list.mjs`, at `95c87a52`. It
uses a different text from both earlier runs: 130,000 distinct bullets `- <base-36 counter>`, 862,209 bytes with LF, under the
1,048,576-byte read limit. Output: `out/vet2-q1-list-unpatched-95c87a52.json`.
- [Observed] `extractSource` throws `RangeError` at the extractor's push (`dist/project-shape-extraction.js:554`, the built line of
  `:647`) with LF and with CRLF (992,226 bytes). With bare CR it returns `unknown`, `missing-heading` "What Success Looks Like", and
  `buildProjectShape` excludes the source as `parse-failure`. A 1,000-item list extracts the same items, by digest, with LF and with
  CRLF.
- [Observed] The smallest LF list that throws, called from the top of the stack, is 125,515 items (830,814 bytes). Draft 2's figure
  is 125,490 items (502,228 bytes) on its constant text. Both are "about 125,000" and both depend on the harness, as line 598 says.
- [Observed] `buildProjectShape` throws with LF and CRLF. In `main()` with injected dependencies (the app's fixture model with my
  project-shape input), start exits 1 with stderr
  `syzygy POC: observation failed (unexpected observation failure (RangeError))`. A re-observation that meets the list answers 502
  "Unknown — Maximum call stack size exceeded. The prior complete evaluation remains served.", and `/polaris` stays 200.

  Lines 86, 117-122 and 176 hold.
- My first run used the bullet text `- item <counter>` (1,512,209 bytes). That run was over the read limit, so the shape excluded
  it as `resource-limit` before extraction. I fixed the text and re-ran, and the kept output is the second run's.

**2.4 Q1, option A on the list and the 503 (lines 123-129, 141-142).** [Observed: `tools/vet2_extractor_loop.py` applied my own loop
text, `for (let i = 0; i < result.items.length; i += 1) all.push(result.items[i]);`, to the built extractor. Its sha256 went from
`ff4c5754…` (the value the drafter's output records for the unpatched file) to `ca5df23c…`. The same probe then ran
(`out/vet2-q1-list-loopfix-95c87a52.json`), and the revert restored `ff4c5754…`.]
- Extraction:
  - all 130,000 items are extracted with LF and with CRLF, with the same item digest for both;
  - a 1,000-item list gives the unpatched digest;
  - CR still fails as before;
  - no list up to 130,000 items throws.
- The shape is observed, with `vision.md` `classified`/`Observed`.
- The daemon starts. `/polaris` answers 503 `response-limit-breached`, `served: nothing`, against `maxHumanResponseBytes`
  2,097,152, for a 169,214,311-byte page (draft 2: 169,834,159 on its text). The ceiling's value is
  `project-shape-observation.ts:82`.

  So draft 2's rows hold. Three facts are missing:
  1. **Re-observe changes visibly.** [Observed in my run, and in draft 2's own `extractor-list-spread-main-95c87a52-loopfix.json`:
     `reobserveRoute` 200, then `polarisAfter` 503] Under A, a re-observation that meets such a list answers 200 and replaces the
     served evaluation, so `/polaris` goes from 200 to 503. Today's crash answers 502 and keeps the prior evaluation served. That is
     an owner-visible change in what A does, and draft 2 does not state it.
  2. **The other pages serve.** [Observed in my run] Under A, `/`, `/trajectory`, `/orrery` and `/polaris/source` answer 200.
     `/api/poc` answers 503 against its machine ceiling (16,777,216 bytes here). So A's start is strictly more served than today's
     exit 1.
  3. **Where the ceiling starts.** [Observed in my run, unpatched and patched alike] In this fixture the page ceiling is first
     breached between 1,400 items (a 1,974,945-byte page, served) and 1,500 (2,104,045 bytes, 503). At 20,000 items, unpatched, the
     page is 26,057,589 bytes and `/polaris` answers 503 at start and after a re-observation, which confirms line 128's "already
     refuses long lists today".

     This bears on B and C. For a list, B would keep `/polaris` serving with that one source Unknown, but only above about 125,000
     items, while a shorter list that already breaches the ceiling keeps the 503; under C it depends where the limit is declared
     [Inferred]. Draft 2's "B, C and D apply to the extractor's list the same way" hides that trade. It does not change the
     recommendation, because A is the one option whose list answer does not jump at a stack-dependent length, but the owner should
     see it.

**2.5 Q1, the spread sweep (lines 169-172, 599).** [Observed: `tools/vet2_spread_count.py` at `95c87a52`, over `git ls-tree` and
`git show`, output `out/vet2-spread-count-95c87a52.txt`] Over 256 files: 33 matches on 32 lines. The one line with two is
`polaris-generation-core/src/discovery.ts:283`, with two `Math.max(...)`. The two observation read-path sites are
`markdown-code-context.ts:91` and `project-shape-extraction.ts:647`. Draft 2's `spread-sweep-95c87a52.json` agrees (256, 33,
literal count 33).

**2.6 Q1, the Butlers record (lines 134-136).** [Observed: `git show 95c87a52:docs/evidence/smooth-example-live-run-2026-10-03.json`,
keys `butlersRevision` and `projectShape.counts`] `32f38feb…`, 392 items, 285 sources, 276 with a known item denominator. That is a
Syzygy record of counts, not a Butlers body. Since the push is made per source and class, a total of 392 bounds every push. The
claim holds.

**2.7 Q1 and Q5, CC-OBS-1 as analogy (lines 157-159, 468-469).** [Observed, by reading
`observability-and-operations.md:17-41` at `95c87a52`] The list names "wall-clock reads, environment lookups, unsnapshotted files,
or network state". It names neither stack depth nor the engine, so both "by analogy" sentences are accurate. Bias 4 reads "Prefer
durable fixes over expedient patches" (`SKILL.md:67-70`), and line 160's two-site reading of it is the one V-GP-B2-1 asked for.

**2.8 Q4, N5's source (lines 357-358).** [Observed, by reading `12d70cf0:docs/evidence/syzygy-bpyt-6-14/tools/residuals.py:9-12`]
"The PR 545 round-1 review (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1) observed four more … Z7 (its N5: an unscoped workspace with no entry,
which the guard's `@syzygy/` filter never reads)". The review raw itself is not committed at `12d70cf0`, so the attribution rests on
that file. It holds.

**2.9 Q2, Q3 and Q4, the vet-gp citations.** [Observed, by grep]
- `VET-GP-FOLLOWUPS-3.md` holds option D's `{principle: 1}` evidence (`:52`, `:73`) at `973965a8`.
- `VET-GP-FOLLOWUPS-4.md:13-15` gives 1.15, 1.16 and 1.17 Pass and Pass.

The citations hold.

## 3. Q8 and numbering

- [Observed: `tools/vet2_diff.py`] Draft 2's `## ` headings are Summary, Why these come to you, Words used throughout, Q1 … Q7,
  Also found, What this packet did not establish, Evidence files. Q8's heading and section are gone; Q1 to Q7 keep their numbers and
  beads (1.18, 1.15, 1.16, 1.17, 50, 1.21, 1.19), and only Q1's title grew ("…, and a very long list crashes the extractor").
- `Q8` occurs on two lines: 5 (the header) and 36 ("The former Q8"). The summary has seven rows. The cross-references stay true:
  - "Q5's refusal class … Q1's trace";
  - "the observer-gate test of Q3";
  - "Q3's derived test walks imports with the resolver Q4 is about";
  - Q7's "see 'Also found'".
- The removal leaves one blank line between Q7's closing rule (571) and the "Also found" heading (573).

Q8 moved out cleanly, and nothing else was renumbered.

## 4. Per item

- **Q1 EDIT.** Every row draft 2 adds holds on my own text and harness. The edits add the three missing facts of 2.4: the
  re-observe change, the other pages, and the ceiling onset with its bearing on B and C. They change no recommendation, need no new
  option, and use only facts observed in my run and in draft 2's own output, so no new evidence is needed.
- **Q2 PASS.** E2.1-E2.5 are verbatim and the new citations hold. One optional wording note (N1 below).
- **Q3 PASS.** E3.1 and E3.2 are verbatim, and so is the citation.
- **Q4 PASS.** E4.1-E4.5 are applied. The testkit definition and N5's source hold (2.8), and the snapshot shows the cited testkit
  lines unchanged (2.1).
- **Q5 PASS.** E5.1-E5.4 are verbatim, and the new CC-OBS-1 analogy sentence is accurate (2.7).
- **Q6 PASS.** It is unchanged from draft 1; the diff has no hunk between draft 1's lines 394 and 482.
- **Q7 PASS.** E7.1 is verbatim.
- **Packet: one EDIT.** The "Also found" timings now set my 4,737 ms beside the drafter's 5,169 ms for the same 2,000-space line
  with no attribution, so a reader sees two figures for one measurement. EW1 attributes them.

**Replacement texts.**

E1.9 — replace lines 123–129 with:
~~~text
- [Observed: the same probe with option A's loop applied to the built extractor by `apply_extractor_loop_fix.py`; output
  `extractor-list-spread-main-95c87a52-loopfix.json`] All 130,000 items are extracted, in LF and CRLF, and a 1,000-item list
  extracts exactly as before (the same items, by digest). The project shape is observed and the daemon starts, but `/polaris`
  answers HTTP 503 `response-limit-breached` and serves nothing: the page would be 169,834,159 bytes against the 2,097,152-byte
  ceiling for a human page (`maxHumanResponseBytes`). A re-observation that meets such a list answers 200 and replaces the served
  evaluation, so `/polaris` goes from 200 to 503, where today's crash answers 502 and keeps the prior evaluation served. That
  ceiling already refuses long lists today: on unpatched `main` a 20,000-item list (80,268 bytes) makes a 26,184,119-byte page and
  gets the same 503, at start and after a re-observation (`extractor-list-spread-main-95c87a52-20000.json`), about 1,300 bytes of
  page per item. So for a list, A turns a crash into the answer a shorter long list already gets.
- [Observed by the vetter, V-GP-B2-2 `vet2-q1-list.mjs` at `95c87a52`, on a third text: 130,000 distinct bullets, 862,209 bytes]
  The same rows, with the loop and without it. With the loop, the other pages (`/`, `/trajectory`, `/orrery`, `/polaris/source`)
  answer 200, while `/polaris` and `/api/poc` answer 503, each against its own ceiling. In that fixture the page ceiling is first
  breached between 1,400 items (a 1,974,945-byte page, served) and 1,500 (2,104,045 bytes, 503), with the loop and without it.
~~~

E1.10 — replace lines 139–144 with:
~~~text
- **A. Read it by the profile.** Replace the one call with a loop that pushes one blanked line at a time, and do the same at the
  extractor's identical call (`project-shape-extraction.ts:647`). *Changes:* a closed fence of any length is masked and a list of
  any length is extracted; the daemon starts and the dossier runs. A list long enough to crash today then meets the existing page
  ceiling, so `/polaris` answers 503 and serves nothing, as it already does for 20,000 items, while the other pages serve; a
  re-observation that meets such a list replaces the served evaluation rather than keeping the prior one. *Costs:* two lines, plus
  a 200,000-line fence test in LF, CRLF and CR and a long-list test under the read limit. *Accepts* texts that crash today, with
  the decision a shorter fence or list would get. *Refuses* nothing new.
~~~

E1.11 — replace line 153 with:
~~~text
B, C and D apply to the extractor's list the same way. For a list, B would keep `/polaris` serving, with that one source Unknown,
but only above about 125,000 items, while a shorter list that already breaches the page ceiling (from about 1,500 items in the
fixture) keeps today's 503; under C it depends where the limit is declared [Inferred]. A is the one option whose answer for a list
does not jump at a length that depends on stack depth.
~~~

EW1 — replace lines 577–579 with:
~~~text
per doubling: 40, 182, 948 and 4,737 ms for 250, 500, 1,000 and 2,000 spaces in the vetter's re-run). In my run, one line of
`a =`, 2,000 spaces and `b` (2,004 bytes) took 5,169 ms, and the same with a 2,000-character code span 5,525 ms, because the mask
turns the span into spaces. Syzygy's own `apps/three-surface-poc/src/orrery.ts` (11,207 bytes) took 35,411 ms in that one pattern
(29,771 ms in the vetter's re-run). A
~~~

N1 (optional, wording only) — lines 249–251 say twice that B turns correct readings into Unknown. Replace lines 249–251 with:
~~~text
C does not fail closed on one shape, the stray-backtick drop in its costs; it is recommended anyway because that shape occurs in no
file I could check, while B would turn every disagreement, including the correct G2 reading, into Unknown, and likely needs a
specification amendment. C reads the mask clauses
~~~

Note, not an edit: line 6 ("it has not been vetted again") goes stale with this raw. The coordinator updates it when cutting the
next draft, naming this raw and its digest.

**Verdict reasoning.** Every problem is fixed by the exact texts above. The facts they add are observed in my run, and the
re-observe change is also in draft 2's own output; the one [Inferred] sentence is labelled. No recommendation changes and no option
is added. Hence READY WITH EDITS.

## 5. Cleanup

Deleted: the clone `vet-2/main-clone` and the private TMPDIR `/tmp/vgpb2-2`. The probe removed the fixture model's temporary
directories before exit, and the TMPDIR was empty when I removed it. The extractor patch was reverted inside the clone before it
was deleted (sha256 back to `ff4c5754…`, `out/vet2-extractor-loop-revert.log`). Nothing else in `/tmp` was touched, and no process
outside my own was signalled. Every kept file is under 300 KB and holds no U+00A0 (checked by `vet_check_raw.py`).

Kept, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/lead/owner-batch-2/vet-2/`:

- `out/build-main.log` sha256 `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2`
- `out/diff-d1-d2.txt` sha256 `b50d33ce3f5b81da01993d23ce59e001c0831783f1fb34313c6e5e3ff0f1e647`
- `out/edit-landing.json` sha256 `00eb86fdf46820060a3a8e8603b10bb78d5e379c7a7df64cc5f9feba4ef658ea`
- `out/evidence-digest-check-draft2.txt` sha256 `7ce63999c8f8a465d292b573f7b6dd4b0369c9f3eb9847e191b5e3cfc0abf08e`
- `out/npm-ci-main.log` sha256 `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b`
- `out/vet2-extractor-loop-apply.log` sha256 `805d018131347933847318b0315cc801d36928fc3f15b6c449d7d66091e21825`
- `out/vet2-extractor-loop-revert.log` sha256 `93d2f42f63c2904b245a9a7fb4281aa5f2da466fae8d04c60dd6c05bf12cf32c`
- `out/vet2-q1-list-loopfix-95c87a52.json` sha256 `32ee4992d6769363771ff107fab27d1a13b9dc8a84f248a6da4e15300cd374e0`
- `out/vet2-q1-list-unpatched-95c87a52.json` sha256 `e599850552e8244730d343959e266d2880c621d1237af1196e56ccae87ebe2fb` (the second run, after the text fix in 2.3)
- `out/vet2-spread-count-95c87a52.txt` sha256 `e9ef4ed51ae5f1c1c86d6bb270e16abb44c5de54ce71d6677ec6cc60dcea65cf`
- `tools/vet2-q1-list.mjs` sha256 `5a1e3a39334834b649aad45168ecfab46606cd548ccd6ece98a6889cac082b3f`
- `tools/vet2_diff.py` sha256 `57630db73b6c6d52bc09d4789ab74f5a52999ac276e3f55d6dcce246e9acfb09`
- `tools/vet2_extractor_loop.py` sha256 `a5289eb9291282cf744e337ab3677eb67bfcc2836e13d4acaa89adf99f222a21`
- `tools/vet2_spread_count.py` sha256 `9a80843074631bc0e1c41543babb8719e025a56dba386d908d0565f2183ac517`
- `tools/vet2_summarize_list.py` sha256 `c6800cb8a84819bf849df5883366930b725f0119c1563368dfac2a8baec13cc6`

Reused unchanged from `vet-1/tools/`: `check_evidence_digests.py` (sha256
`acfe03d55ecaa08d2eb790dc464ccc4e4a4deae14e021840fb508de8d9163ef0`) and `vet_check_raw.py` (sha256
`30d31434b52fc5cf8e214c454f659d6872e99e46ddae412e0171e3591b3f6108`).
