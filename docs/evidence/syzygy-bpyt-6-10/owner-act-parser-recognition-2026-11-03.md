# Owner-act parser recognition: what the PWB body-read gate sees of an altered act record

Evidence report for bead `syzygy-bpyt.6.10` (follow-up of `syzygy-bpyt.8.10`, PR #500). It measures
and proposes; it changes nothing about what the parser accepts and nothing about what counts as a
performed act. It is not authority and binds nothing.

- Record: `docs/evidence/syzygy-bpyt-6-10/owner-act-parser-recognition-2026-11-03.json`, generated
  by `scripts/measure_owner_act_parser_recognition.mjs` (build first with `npx tsc -b
  packages/three-surface-poc-core apps/three-surface-poc packages/polaris-generation-consent`). It
  names its measured commit, the script digest and the digests of the four source files read. The
  three records measured are those in `PWB_ACT_RECORDS`, cited by path in the JSON; no act argument
  is quoted here.
- Pinned by: the `owner-act records under altered prose (characterization, syzygy-bpyt.6.10)`
  block in `apps/three-surface-poc/src/governance-inputs.test.ts`, with literal expected values.

## Outcome

- [Observed] Over the 3 current act records (169 non-blank lines), with the recording tag held
  resolved (`parser-isolated`: the parser's and evaluator's verdict alone), 127 lines ignore an
  appended ` [altered]` suffix (consent 42/56, policy 47/61, registry 38/52) and 109 ignore
  outright deletion (37, 42, 30). Ignored means the authority's verdict stays `valid`.
- [Observed] Ignored lines: the title; the whole `## Effect` section except what the substring
  scope anchors need (consent 15/15 lines on append, 13 on delete; policy 3/3 and 1; registry 12/12
  and 7); every `## Ceremony` line except the phrase fence and the `- recording tag:` line's first
  backticked token (the narrative about the owner's words and the frozen provenance); the whole
  limits section; the continuation lines of the Supersession paragraph past its matched prefix; and
  `Recorded at (UTC):` in the policy and registry records. Appending to the recording-tag line is
  ignored (the pattern has no end anchor).
- [Observed] Verdicts on the PROSE_ALTERATIONS corpus, parser-isolated: `limits-removed`,
  `withdrawal-appended` and an added `effect-appended-grant` leave all three acts `valid`
  (FAIL-OPEN at the parser; `limits-removed` did not apply to the registry record, which has no
  limits section; `selection-replaced` did not apply to the consent record). `effect-widened` is
  refused (`scope-wrong`) on all three, but only because the replacement paragraph drops the
  scope anchors that `scope-wrong` tests by substring; a grant that keeps the anchors passes.
- [Observed] Loader-faithful (the tag's blob must equal the current record bytes): 0 of 169 lines
  are ignored on either operator, and every alteration that took is refused
  (`recording-tag-mismatched`). In production the defense is that byte-identity check, not the
  parser.
- [Inferred] That defense holds only while the recording tag exists in the checkout and still
  names the recorded commit. A tag is a mutable local ref; moving it to a commit carrying altered
  bytes would admit them, and the parser would not object. This report did not test a moved tag.
- [Observed] Control: appending to the `Date:` head field changes the verdict in every record
  (`act-instant-malformed`), so the census can see a parsed line.

## Owner question (GP-Q0), not implemented

- Should the gate read more of an act record than its head fields, phrase and tag? Options a
  tightening could take, each changing what counts as an act: (a) none, keep the recording-tag
  byte check as the sole guard of prose (the status quo); (b) pin each current record's digest in
  the loader, as the consent readers do for their digest-pinned records; (c) anchor the tag line
  and the Supersession paragraph and reject trailing text; (d) refuse a record carrying an unread
  section such as a withdrawal. A withdrawal of an act is today recognised only through a later
  record's Supersession field (`supersessionTargetsOf`), never by text appended to the act itself.
