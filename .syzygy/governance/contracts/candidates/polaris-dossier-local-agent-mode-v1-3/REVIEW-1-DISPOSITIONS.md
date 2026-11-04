> **Candidate — binds nothing.** Dispositions of review round 1 of the v1.3
> package, `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-ffc2-1-RAW.md` (verdict
> line 4: `Verdict: REVISE`, over
> `ffc2e0fed44ab2138bb8fdb71308a54aca8c56fe`). The raw is retained verbatim.
> Every finding, the note-level ones included, is repaired once; the repair
> retires the round-1 review of those bytes (rule 10), and round 2 reads the
> repaired bytes.

# Review round 1 — dispositions

| Finding | Severity | Disposition |
|---|---|---|
| 1 — empty table cell is an unnamed position | revise | Repaired in the spec: an empty cell "states nothing, carries no label, citation or quotation, and SHALL render with the visible words "no entry""; an absence or a negative is written as a claim. The inert-rendering scenario and the falsifier gain the empty cell; the design and the delta's table copy say the same. |
| 2 — "claim form" omits execution identifiers | note | Repaired in the design: "claim form" is every field of the existing block except `children`, the execution identifiers named. |
| 3 — cards have no named HTML element | note | Repaired in the spec's rendering list: "a list whose items are each headed by their label"; the design row says the same. |
| 4 — oracle not extended | note | Repaired: the oracle fixes the expected element names, header scopes, empty-cell text, short-label findings and the absence of script or policy change in the fixture, and reads each excerpt's expected bytes from the fixture blob outside the renderer. |
| 5 — "markup" undefined | note | Repaired: markup is "a `<`, `&` or backtick character, or a Markdown link, image or paired emphasis mark", in the spec and the design. |
| 6 — 60-line limit not a SHALL | note | Repaired: a code excerpt "SHALL name one citation of 1 to 60 lines, and Syzygy SHALL report a repair finding for one of more". |
| 7 — scenario 3 carries three cases | note | Repaired: split into "Code excerpt rendered from Syzygy's read", "Code excerpt over its limit" and "Code excerpt of an excluded file". The effective count moves from 252 to 254 scenarios; the ledger and the delta say so. |
| 8 — the v1.2 design names no schema version | note | Repaired in the delta's "Current meaning": the design describes the schema without naming it; the implementation calls it `polaris-dossier-local-draft-v2`. |
| 9 — recording is the install | note | Repaired in the owner packet: choosing 1.3 may come first, but recording installs the bytes and waits on question 2; option 2(c) states its cost. |
| 10 — packet more certain than the delta | note | Repaired: the packet carries the delta's hedge and says the effect of numbered markers and inline code on signed text is Unknown until built. |
| 11 — no review criterion names labels | note | Not changed in the subject. The spec states the residual as open to review, which the reviewer found honest; asking the fidelity reviewer about labels belongs to the implementation's review criteria (bead `syzygy-mea.10.5`), not to REQ-polaris-generation-035, which this version does not amend. |
