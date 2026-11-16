## Verification pass: mcs4 and mea.9 now pass on both scope and recommendation

I applied the same read-only rules: `diff packet-round3.md packet.md` checked against the run 3 metadata and the `8c1832ca` draft. I read no Redis body, statement, span or page, and edited nothing. Every material correction I listed in round 3 was made correctly. The edits introduce no new material defect.

### 1. `syzygy-mcs4`

**Each correction checked:**
- **Trade-off count:** the text now reads "10 of the 15 trade-off blocks and two advantage blocks". That matches the 12 `excludedContent` blocks in `checks/rev-0.json`: `to-1`…`to-10`, `ad-10` and `ad-13`. [Observed]
- **Detector-only option:** added as B. Its rationale is right. `8c1832ca`'s SEMANTIC-DELTA says v4 redaction needs a `:` or `=`, and that the builder's D counterexamples let `TLS.md` `requirepass` and `tls-key-file-pass` lines reach the reviewer under bd and bcd. Run 3's revision 3 cites `TLS.md` 12 times. [Observed]
- **Numeric hold trigger:** D now reads "5 or more blocks citing only withheld files". It can be measured from draft citations. Its con, "Run 3 already had 12", is accurate: the blocks citing only `redis.conf` are those same 12. [Observed]
- **Smaller fixes:** "one of them cited once" for X is correct, and so is the `run.json` audience line. [Observed]
- **Relabelling:** the options are consistently relabelled: "includes B's tightening", "C remains the route", and the boundary sentence "A, B or C". The cross-reference in mea.9 uses the new letters correctly. [Observed]

**Decline folded into the reject control:** this is acceptable. Hold (D) is the legitimate status-quo option and is present. Decline differs from hold only by closing the bead. The recommendation says plainly that decline is reached through reject, so no choice is hidden, and the item stays within the bar's 2–4 options. [Inferred]

**Non-material notes:**
- B's cons omit the cost A lists: "matching code bodies withheld whole". It applies to B equally, and how many Redis code bodies that would be is still Unknown. Consider adding it to B.
- The `TLS.md` claim describes policy behaviour shown by the builder's synthetic counterexample. Whether `TLS.md` at `498ecd0d` actually contains such a line is Unknown, and the wording ("lets a … line … reach") does not claim it does.

**Result:**
- **Scope verdict:** Pass. Already passed in round 3, and the edits leave the scope unchanged.
- **Recommendation verdict:** Pass. The options are complete and distinct (placement plus detector, detector only, generic class, numeric hold, with decline through reject). A's rationale now rests on correct counts. No authority leaks: drafting and review only, and a v6 binds only by the policy act.
- **Material corrections:** None.
- **Evidence freshness:** `540c2cdd`, `8c1832ca`, and run 3 metadata re-read 2026-11-05. Not inspected: run 3 statements and pages, Redis bodies (prohibited), the provenance of 6f1r's owner request, the count of code bodies the detector would withhold, and the live tracker after this read.

### 2. `syzygy-mea.9`

**Each correction checked:**
- **Exact trigger:** D now reads "a counted fidelity verdict marks an inventory row unresolved or a block unsupported whose cited spans are all withheld". It can be measured from verdict rows against packet span outcomes. [Observed]
- **Run 3 against the trigger:** run 3 correctly does not meet it. [Observed]
  - In every run 3 packet, the only withheld spans are the two `redis.conf` spans cited by the draft (`to-7`). Verdicts 0–2 mark `to-7` supported.
  - Verdict 0's two unresolved inventory rows cite only admitted spans.
- **Run 3 assessed:** the text gives the draft side honestly ("12 draft blocks citing only `redis.conf`, … re-sourced before review"), which matches the citation counts. [Observed]
- **Dependency on item 1:** stated with the new lettering ("if you choose B, C or D there … B here becomes the stronger choice"). [Observed]
- **Non-material fixes:** made correctly. The enforcing code cited is `review-verdict.ts:19-24`, the spec text now covers quotations and code excerpts, REQ-035 is named, and option C's overlap with mea.6 is disclosed. [Observed]

**Non-material note:** the trigger says "unsupported", but the verdict schema's non-support value is `anchor-does-not-support` (anything other than `supported` blocks). Optionally say "not supported" to match the code.

**Result:**
- **Scope verdict:** Pass. Unchanged from round 3.
- **Recommendation verdict:** Pass. The trigger is exact and measurable, run 3 is correctly assessed against it, the draft-side re-sourcing cost is disclosed, and the coupling to item 1 is explicit with B named as the fallback.
- **Material corrections:** None.
- **Evidence freshness:** `540c2cdd` and run 3 metadata (verdict row states, packet span outcomes, draft citations) re-read 2026-11-05. Not inspected: verdict reason text, run 3 statements and pages, run 2 artifacts directly (findings log and bead only), and the live tracker after this read.

zwja.1's added inventory and launched-versus-manual note is accurate: run 3's inventory used 2 of 6 cycles, at revisions 1 and 2. I did not re-open its verdict.
