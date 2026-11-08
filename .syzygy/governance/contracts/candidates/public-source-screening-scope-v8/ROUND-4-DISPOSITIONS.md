# Round-4 dispositions — public-source screening scope, version 8

> **Candidate — binds nothing.** Dispositions of
> `docs/reviews/R-SCREENING-SCOPE-V8-4-RAW.md` (verdict
> `CONFIRM WITH EXCEPTIONS`, line 4, over `0f2767d2`). The raw is retained
> verbatim and is not edited. Four of its exceptions (E1 to E4) require a
> change, so the round fails the owner's offer condition: this package is
> not offered for signature and goes back to the owner. The repairs below
> are unreviewed. No review brief for a round 5 is written; whether one runs
> is the owner's decision.
> *Owner answer, 2026-11-08, in the Claude Code session: "Round 5, scoped
> (Recommended)", one more review over these repairs and what they touch,
> offered only on `CONFIRM` or notes-only; the round-5 brief is now
> `REVIEW-BRIEF.md`, and the sentence above was true when written.*

| # | Finding (raw) | Disposition | Where |
|---|---|---|---|
| E1 | The refusal did not say which files count as records, so an unreadable file of unknown kind could be ignored (raw lines 68–98) | **Repaired.** The rule now names the population: every file at a location where observation consent records are read counts as a possible one. For launch records that is every file at the launch records' location on the dedicated reference, a drawer or provider statement included; for the act forms, each named act file. Such a file, not shown revoked or superseded, whose kind cannot be read, or that reads as an observation consent record whose effectiveness or pair cannot be read, refuses every read, with that file named. A drawer or provider statement that reads as its own kind does not refuse. Three new pinned phrases ("a drawer or provider statement included", "whose kind cannot be read", "with that file named"), each with its own selftest mutation | builder `sourceVisibility.rule`, `privateSourceRules`, `consequence` (last sentence), `RULE_PHRASES`; SEMANTIC-DELTA `rule` bullet; IMPACT-LEDGER "Visibility" and its fixtures; packet "One broken consent record" |
| E2 | "They stay only in that blob's exclusion record (RFC5-17)" is untrue: RFC5-17 and the retained fields of `matchAction` and `unclassifiableExclusion` hold no object id or size; the check record and the review packet do (raw lines 100–126) | **Repaired by naming the places, not by moving the values.** The text now says they are kept only in the run directory's check records and its local review packets, and are never rendered or carried in any egress; the RFC5-17 attribution is gone. Reason: moving them into the exclusion records would add fields to two retained-field lists that `unchanged` keeps exactly, and a denied-path blob is never read, so it has no content digest to anchor such a record. The check record (`check.ts:115`) and the review packet (`review-packet.ts:133`, `:150`) already hold them | builder edit 7 and `consequence`; SEMANTIC-DELTA item 7 and the digests row; IMPACT-LEDGER "Object ids and sizes"; packet headline bullet |
| E3 | The ledger's install list missed the class-gate withholding (`render.ts:392`, `:395`, `:679`; `review-packet.ts:133`) and the review packet's excluded spans (`review-packet.ts:150`, fixture `review.test.ts:206`) (raw lines 128–151) | **Repaired (ledger prose; no digest moved by this item).** The bullet names the class-gate ground (`body-not-retained-for-generation`), the three render sites as install sites, and the two review-packet sites as the stated place the values are kept, with the reason (the packet goes to the operator's agent session, which already reads the clone). Fixtures added: a private class-gate-withheld blob renders no object id or size; the review packet keeps the object id for both visibilities, the `.env` fixture unchanged | IMPACT-LEDGER "Object ids and sizes" |
| E4 | The residual omitted the pinned commit id, rendered on every discovery row and recorded, which digests the whole tree (raw lines 153–181) | **Repaired.** The residual list now names the pinned commit id, rendered on every discovery row and recorded in the launch record, as a narrower confirmation oracle open only to a guesser who also knows the commit header (author, dates, message, parent) and the rest of the tree, and one the scope cannot withhold | builder `consequence`; SEMANTIC-DELTA digests row; packet "Withholding a whole file" |
| N1 | Stale "(eighth)" comment beside the extra-edit selftest case | **Repaired:** "(ninth)" | builder selftest |
| N2 | ROUND-3-DISPOSITIONS.md lines 7–8, "No review brief for a round 4 is written", false since `0f2767d2` | **Repaired** by a dated correction at that sentence; the sentence is kept | ROUND-3-DISPOSITIONS.md |
| N3 | The packet paraphrased two answers: retention lost its item id and "revisit after the first private runs"; the confidence warning covers the name and URL | **Repaired.** Both answers now quote the record's words with their item ids, the warning names the name and URL, and the record is cited as .syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md (plain text; it lands with PR #798) | packet "Questions you have answered" |
| N4 | The ledger read as if private were an unreadable record's whole outcome | **Repaired:** it now says an unreadable record also refuses every read, so in practice it is refused | IMPACT-LEDGER "Visibility" |
| N5 | "Except at four sites" folds edit 8 into the code-structure site; five scope paths change | **No change.** The raw calls it accurate as written; the site list already says "which indeterminate follows" | — |

Selftest: 50 of 50 (4 controls, 46 mutations). New cases: drop each of the
three new rule phrases.
