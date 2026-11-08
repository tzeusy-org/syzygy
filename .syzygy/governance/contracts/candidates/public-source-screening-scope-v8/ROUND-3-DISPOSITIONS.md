# Round-3 dispositions — public-source screening scope, version 8

> **Candidate — binds nothing.** Dispositions of
> `docs/reviews/R-SCREENING-SCOPE-V8-3-RAW.md` (verdict `REVISE`, line 4,
> over `fa258a05`). The raw is retained verbatim and is not edited. Round 3
> was the last round under the stopping rule set before it, so these repairs
> are unreviewed. The coordinator will ask the owner whether a round 4 runs.
> No review brief for a round 4 is written.

| # | Finding (raw) | Disposition | Where |
|---|---|---|---|
| 1 | Edit 7 withheld the object id and size only for detector-matched private blobs. Denied-path and indeterminate blobs never meet a detector, and their object ids are still rendered and egressable, so the signed residual was false (raw lines 58–121) | **Repaired by widening.** Edit 7 now covers every private blob that is excluded or withheld on any ground: a denied path, an indeterminate or unclassifiable blob, a detector match on path or body, active content, and a strict-UTF-8, NUL or resource-limit failure. A new edit 8 amends `indeterminate`'s last sentence so it no longer says a private blob's object id and size remain code-structure. `consequence` now states what remains: the run directory, the operator's clone, and SEC-5's general residual (a secret no detector matches in an admitted body), which is unchanged under either visibility. The packet headline and body, the delta row, item 7 and new item 8, and the ledger's install sites are updated. [Observed] `check-derive.ts` nulls the object id only for a path detector match, and `screen.ts` returns `denied-path` before any detector runs | builder `EDITS[6]`, `EDITS[7]`, `EDITS_PER_PATH`, `privateSourceRules`, `unchanged`, `consequence`; SEMANTIC-DELTA items 7–8 and the digests row; packet bullets; IMPACT-LEDGER "Object ids and sizes" |
| 2 | `privateSourceRules` said "no rule for a public repository changes", beside two fail-closed exceptions; the four-site list had two "and"s (raw lines 123–137) | **Repaired.** The sentence now names both exceptions. A public repository reads private while any other effective record of its pair states private, states nothing or cannot be read. A record whose effectiveness or pair cannot be read refuses every read, public repositories included. The site list is now punctuated as four items | builder `privateSourceRules`; SEMANTIC-DELTA "What this keeps" |
| 3 | "Every … class rule" was said to be kept at two sites, though edit 7 changes one (raw lines 139–147) | **Repaired.** Both sites now except the code-structure rule and `indeterminate`'s last sentence (edits 7 and 8), which change for private repositories only | SEMANTIC-DELTA "What this keeps"; IMPACT-LEDGER "Not affected" |
| 4 | "Effective-looking" was undefined, and a record unreadable as a whole could be ignored, failing open (raw lines 149–174) | **Repaired.** The rule now says "a record whose effectiveness or pair cannot be read, meaning any record not shown to be revoked or superseded whose pair is not read, including one that cannot be read at all". The scope "does not instead ignore it". Two new pinned phrases carry this, each with its own selftest mutation. The cost is disclosed in `consequence`, the delta and the packet: launch records lie within agent write reach, so one malformed record stops every run, redis included. That costs availability, never exposure | builder rule, `RULE_PHRASES`, `consequence`; SEMANTIC-DELTA `rule` bullet; packet "One broken consent record"; IMPACT-LEDGER "Visibility" |

Selftest: 47 of 47 (4 controls, 43 mutations). New cases: revert edit 8,
narrow edit 7 back to detector matches, and drop each of the two new rule
phrases.

Notes:

- **N1, N2:** no change. `ROUND-1-DISPOSITIONS.md` row 2 is history. The
  current carrier is in `ROUND-2-DISPOSITIONS.md` row 2 and in the rule.
- **N3:** acknowledged here rather than by editing round 1's record a
  second time. Round 2 also dropped one phrase pin (`ADMISSION_ACT_FORMS`),
  and round 3 adds two, so nine phrases are pinned now.
