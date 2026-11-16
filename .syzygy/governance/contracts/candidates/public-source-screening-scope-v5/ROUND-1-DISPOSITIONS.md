# Round 1 dispositions — public-source screening scope, version 5

> **Candidate — binds nothing.** It maps the round-1 findings to their one
> repair. The raw is `docs/reviews/R-HA5B-SCREENING-SCOPE-V5-1-RAW.md`
> (verdict `REVISE`, line 5, over `db1fcd37`), retained verbatim. Under the
> stopping rule agreed before round 1, this is the one repair, and round 2 is
> the last round before the owner.

| Finding | Severity | Repair |
|---|---|---|
| 1 — C changes the secret posture of documentation | revise | The policy's `projectDocumentationExemption.consequence` now names the residual. The delta's C cost bullet is rewritten ("the secret residuals reach more documentation"). The packet has a new C bullet, and the register row names it. Two counterexamples are added: "README: HTML element, then a secret no detector matches" and "README: HTML badge token on line 1, unmatched secret on line 3". |
| 2 — un-folded placement paths | revise | Placement paths are listed folded (tls.md and modules/modules.md). The rule text says each is "listed already folded, so it is compared as given". The builder checks that every placed path is folded (mutant "an un-folded placement path caught"), and the oracle no longer folds the listed side. The ledger states the reader's refusal of an unmatchable entry. |
| 3 — quadratic userinfo in `credential-url-any-scheme` | revise | The user part excludes `:`: `[a-z][a-z0-9+.-]{0,31}://[^/@\s:]*:[^/@\s]+@`. Re-measured: every offset over `a://` and 8,000 colons takes 0.002 s in Python, and 32,000 colons take 2 ms in node. The delta sentence is corrected. The ledger requires a timing or step-count pin in both screens and names the version-4 linear recognizer it sits beside. The builder has a mutant for the ambiguous form. |
| 4 — `indeterminate` stale under B | revise | In B variants, the `indeterminate` docExcludedTokens clause gains "other than a root file the governance-text rule classifies". In D variants, `notMapped` ends "any other prose that no ownerPlacements entry names". Both are in the delta's change table and checked by the builder, with a mutant each. |
| 5 — provenance labels and attributions | note | The trial commit is now labelled Observed, citing `docs/evidence/redis-screening-v4-remeasure-2026-10-21.json` (`measuredOn.pinnedCommit`). The "lawful route" quotation is attributed to the version-4 semantic delta's declined table, which the packet paraphrased. The packet's self-corpus figure names its commit, `85c54814`. Re-run with the repaired patterns at `85c54814`, it is unchanged: 13 (5), 9 (1), 1 (0). |
| 6 — "Version 4 dealt with the README's 41" | note | The packet now says version 4 *addressed* the 41, with the outcome Unknown, and that C may decide the README. |
| 7 — residual lists differ; Redis forms omitted | note | The packet's residual list now matches the delta's six shapes, and both add `AUTH <password>`, `redis-cli -a` / `--pass` and an ACL `><password>` [Inferred]. A counterexample "TLS.md: AUTH and redis-cli -a passwords" scores them. |
| 8 — detector edge cases and dialects | note | The legacy `PGP SECRET KEY BLOCK` armour is now caught (`(?:PRIVATE\|SECRET) KEY`), with a counterexample and a mutant. The ledger names the `i`-flag folding and the U+FEFF and U+001C–U+001F differences beside `\s`. A JSON-escaped URL (`:\/\/`), a header split across string literals, and a digit-run scheme stay residuals: the first two are the generic encoded-or-split residual that `screen.ts` already states, and the third is no real scheme. |
| 9 — C's `renderCondition` incorporates "egress governs it" | note | `projectDocumentationExemption.renderCondition` adds: "Where that condition says egress governs every other place, it is this exemption's egress that governs, never codeContentExemption.egress". |

After the repair:

- `--check` is current.
- `--selftest` holds 52 of 52 predicates (47 before).
- `--score` covers 24 counterexamples (20 before).

Every manifest row moved, so round 1's re-derivation of the rows does not carry
over.
