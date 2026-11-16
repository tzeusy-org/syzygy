# V-GP-B2-2 addendum — the drafter's diff and named deviations, draft 2
Verdict: READY WITH EDITS (unchanged from V-GP-B2-2-RAW.md sha256 8e15819a3b797c3e84f3d2cc4878256a0eed813b4145c5443ad7467981f4eb59)
Packet: PACKET-DRAFT-2.md sha256 2eab33611519f0c82587e9d71d45eea550bb4364034addc038625961a7046406
Items: change items 13 CONFIRM, 16 CONFIRM (incomplete: E1.9), 18 CONFIRM (incomplete: E1.10, E1.11), 21 CONFIRM, 22 CONFIRM, 43 CONFIRM, 45 CONFIRM

This addendum answers the coordinator's follow-up of 2026-10-28. V-GP-B2-2-RAW.md stays as written; nothing here changes its
verdict, its item lines or its replacement texts.

## 1. The drafter's diff against mine

- [Observed: `sha256sum`] `work/draft1-to-draft2.diff` hashes to `e10def2a623a1c4fc3c3df8c93c969d635182165651bf94fc20544c11c52578f`,
  the coordinator's value.
- [Observed: GNU `patch -o`, applied to a copy of draft 1 (sha256 `5c50ba0f…`)] The result hashes to
  `2eab33611519f0c82587e9d71d45eea550bb4364034addc038625961a7046406`, which is draft 2 byte for byte. So the drafter's diff is a
  complete record of draft 1 to draft 2. I deleted both copies after hashing.
- [Observed: `tools/vet2_diff_compare.py`] Second method: the drafter's diff has 20 hunks with context, removing 115 lines and adding
  198. Mine (`out/diff-d1-d2.txt`) has 54 hunks with no context, removing 121 and adding 204. The net removed and net added line
  multisets are equal, so the 6-line difference is alignment only.
- [Observed: the same comparison over the evidence rows] Draft 2 lists 85 evidence files. 14 are new (5 tools, 9 outputs), none is
  gone, and none of draft 1's 71 changed digest. All 85 match on disk (V-GP-B2-2 section 0).

## 2. The named deviations

I do not have the drafter's numbered change list. I mapped the coordinator's descriptions onto the labelled edits in
`work/build_draft2.py` (sha256 `06b2be17a5d0a0bb90f07008204e80eadff89bc6bd41ba2dfabd15cda8625d64`). `tools/vet2_ops_list.py` lists
those edits statically, without running the script: 52 calls, numbered in source order. The coordinator's numbers fit them as
item n = call n+2 for items 13 to 22, and call n+6 for items 43 and 45 [Inferred: the drafter's list leaves out two calls before
item 13 and four between items 22 and 43]. Each mapped call's label names the deviation the coordinator describes, so the mapping
is unambiguous.

| Item | Script call and label | Draft 2 lines | Deviation from my text | Ruling |
|---|---|---|---|---|
| 13 | 15, `E1.2 (and "or CRLF")` | 86 | "in an LF file" becomes "in an LF or CRLF file" | **Confirm.** [Observed, V-GP-B2-2 2.3] A 130,000-item list throws with CRLF (992,226 bytes) as with LF; bare CR fails as `missing-heading` and the source is excluded as `parse-failure` |
| 16 | 18, `E1.4 (re-run, plus my CRLF/CR, daemon and loop-fix rows)` | 112-129 | the re-run citation; the new probe's rows; the loop-fix 503 rows | **Confirm**, every row true on my own text and harness (2.3, 2.4). Incomplete: the loop-fix row omits the re-observe change, the other pages and the ceiling onset; E1.9 adds them |
| 18 | 20, `E1.5 (plus the page-ceiling sentence)` | 139-144 | option A's *Changes* gains the 503 sentence | **Confirm**, true (2.4). Incomplete for the same reason; E1.10 adds the re-observe change, and E1.11 the B/C trade at line 153 |
| 21 | 23, `E1.7 (coordinator files the bead; 31 calls; sweep named)` | 164-173 | "the other 31", not 30; "33 such calls on 32 lines in 256 files"; the coordinator files the bead | **Confirm.** [Observed, `vet2_spread_count.py` at `95c87a52`] 256 files, 33 matches, 32 lines. `polaris-generation-core/src/discovery.ts:283` holds two `Math.max(...)`. My V-GP-B2-1 text counted lines and called them calls; "30" was my error |
| 22 | 24, `E1.8 (and "and CRLF")` | 175-176 | "LF files" becomes "LF and CRLF files" | **Confirm**, as item 13 |
| 43 | 49, `E9.2 and E8.2 (plus "or alone")` | 582-590 | "(or alone, if Q7 is not answered A)" | **Confirm.** The position change is behavior-preserving agent work (GP-Q0 `:52-55`) whatever Q7's answer, so it cannot depend on Q7 being answered A |
| 45 | 51, `W3 bullets (Q1 bullet narrowed to what draft 2 did not run)` | 594-607 | my five bullets placed in item order among draft 1's, instead of as one block after Q6; Q1's bullet drops my CRLF/CR and after-throw Unknowns and adds the list threshold; "30" becomes "31" | **Confirm** (details below) |

**Item 45 details.**
- [Observed: the diff hunks `-540,2 +594,2`, `-542,0 +597,4`, `-543,0 +602,2`, `-545,0 +606,2`] Draft 1's bullets at 541-545
  are unchanged. Line 540 takes only my W3 substitution, and the new bullets are inserted between draft 1's.
- All five of my bullets survive in substance: Q1 thresholds and spreads, Q2, Q4, Q7, and the unsafe-link bead.
- Both dropped Unknowns are now observed:
  - the extractor's CRLF and CR behaviour (item 13);
  - what follows the list throw: start exits 1 and re-observe answers 502, observed by the drafter and by me.
- [Observed: `git grep -F 'extractSource('` over shipped `packages/*/src` and `apps/*/src` at `95c87a52`] The project shape is the
  extractor's only caller (`project-shape-model.ts:568`). So no other surface is left unexamined, and dropping that Unknown loses
  nothing.

## 3. Kept files added by this addendum

Under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/lead/owner-batch-2/vet-2/`:

- `tools/vet2_diff_compare.py` sha256 `53b010c24ebd478640d6fb9b3de6717237535c7e4f78844d25e0b5327a83cf3a`
- `tools/vet2_ops_list.py` sha256 `3f1eedbfd35557c858e4684f1573c3311700b541b5dc26ae9cf1541ad8efd34d`

V-GP-B2-2-RAW.md is unchanged (sha256 `8e15819a3b797c3e84f3d2cc4878256a0eed813b4145c5443ad7467981f4eb59`), as are the 15 kept files
it lists. No clone or TMPDIR was made for this addendum.
