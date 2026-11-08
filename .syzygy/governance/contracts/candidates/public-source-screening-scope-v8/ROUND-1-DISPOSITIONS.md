# Round-1 dispositions — public-source screening scope, version 8

> **Candidate — binds nothing.** Dispositions of
> `docs/reviews/R-SCREENING-SCOPE-V8-1-RAW.md` (verdict `REVISE`, line 4,
> over `e9f8cf42`). The raw is retained verbatim and is not edited. Each
> repair below changes the package; the round-1 review is retired by them
> (rule 10) and a round-2 review runs over the repaired bytes.

| # | Finding (raw) | Disposition | Where |
|---|---|---|---|
| 1 | Visibility keyed to "the pair's own record", while launch records are per revision and a fork at an upstream commit joins the upstream's pair (raw lines 41–75) | **Repaired.** Visibility is decided per commit read, from the record admitting that commit. It is public only when that record and every other effective observation record of the same pair state public through a carrier. Otherwise the repository is private at every commit, and a private fork's record makes the whole pair private. Pinned in `--check` by three required phrases | builder `SOURCE_VISIBILITY["rule"]`, `semantic_findings`; SEMANTIC-DELTA item 3 and the "Who says" row; packet "Private is the default" |
| 2 | No defined carrier; the existing public records say "public" only in prose, so a fail-closed install would turn them private (raw lines 77–113) | **Repaired.** The carriers are named, and only these count. A launch record states it by the operator's declaration whether the repository is public, which REQ-046 already requires the record to carry, read as one of exactly two values. A record from an act form that `ADMISSION_ACT_FORMS` types `consent-observation` (today the requests and redis acts) states public by form identity. No title or prose is a carrier, so requests and redis stay public with no prose parsed. On REQ-046's "another field" clause, the ledger states the honest position: [Inferred] fixing the encoding of an item the record already carries is not another field, but a reader who counts it as one would need REQ-046 amended alongside. That is recorded, not settled | builder rule text; IMPACT-LEDGER "Visibility" bullet and the line-25 entry; SEMANTIC-DELTA "What this keeps" |
| 3 | The delta claimed the whole-body digest residual was disclosed in `consequence`, and it was not; whole exclusion does not close the oracle when the rest of the body is known (raw lines 115–142) | **Repaired.** `sourceVisibility.consequence` now states the residual in the signed bytes: the content digest and path stay recorded, the object id is in the clone, and a known remainder (a private fork, a template, public history) makes the digest an offline oracle. The digests stay in the run directory only, and who else reads them is not stated. The delta row is corrected and labels that last point [Unknown]. The packet adds a plain-words cost | builder `consequence`; SEMANTIC-DELTA digest row; packet "Withholding a whole file" |
| 4 | "Open question 4" cited but absent (raw lines 144–150) | **Repaired.** The reference is removed. The carrier question is decided in the package (finding 2), not passed to the owner | SEMANTIC-DELTA "Mechanical and judged halves" |
| 5 | The packet said "nothing gets looser for anyone", did not say whether public runs stop, and omitted public-target egress coverage on mis-declaration (raw lines 152–170) | **Repaired.** The packet now says admission is itself a loosening and that no screening rule gets looser. It says the signature is recorded in the same change as the install, that public runs keep working under version 7 until then, and that an act without the install would refuse every run. The ledger gains a matching "When it lands" bullet, verified against the version-7 recording commit `bbc5f117`, which carried the read-gate change. Mis-declaration now names public-target egress coverage | packet "What this is", "Recommended", "When it takes effect", "The label is your word"; IMPACT-LEDGER "When it lands" |
| 6 | Selftest gaps: three edits and four key texts never mutated; nothing pinned the number of edits (raw lines 172–194) | **Repaired.** `--check` now pins `EDIT_COUNT = 6` and `CHANGED_PATHS` (the scope paths the change may touch), independently of `EDITS`. The selftest reverts each of the six edits, guts each of the seven texts of the key (`values`, `rule`, `privateSourceRules`, `unchanged`, `agentSessions`, `consequence`, `consentRecordMetadata`), and appends a seventh edit that relaxes `detectors` while keeping "public visibility exempts nothing": it fails both by count and by path. 34 of 34 pass | builder `EDIT_COUNT`, `CHANGED_PATHS`, `changed_paths`, `selftest` |
| 7 | A private repository's identity and URL get committed into Syzygy's governance repository (raw lines 196–206) | **Repaired.** Added as the policy key `sourceVisibility.consentRecordMetadata` ([Inferred]; this policy cannot govern it). Added as a row of the delta's table and to the packet's open question 2 | builder; SEMANTIC-DELTA table; packet open question 2 |

Notes:

- **N1, N2:** taken. The ledger now reads the launch-consent change at
  `913c6b7d` and re-derives its line numbers there. It adds line 15 (the fork
  identity rule) and the local-agent-mode spec's line 257 ("version 7 or a
  successor"), which reads the same.
- **N3, N4, N7:** no change.
- **N5** (forbid credentials on the public fetch route too): not taken. It
  would change a public rule, which is outside this package's scope. It is
  left for the owner and is not added to the packet's questions, because
  version 7's public route is unchanged.
- **N6** (review packets as "sends"): the delta's review-packet row now
  states the reading. [Inferred] A packet Syzygy writes for the operator's
  agent session is not an external egress Syzygy makes, so the stated-private
  condition does not reach it. Open question 1 covers it.
