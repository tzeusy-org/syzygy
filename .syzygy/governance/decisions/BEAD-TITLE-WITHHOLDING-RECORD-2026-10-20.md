# Work-item title withholding — 2026-10-20 owner answer

[Observed] Historical record of choice A for `jytt-bead-title-admission`.
Tzeusy recorded the answer on `syzygy-jytt` at
`2026-10-20T14:06:18Z`. Tracker comment ID
`f08c6d66-6a44-51db-b536-b1b38d0c54c3`. SHA-256 of the exact UTF-8 comment
text `10966803202ed141094c6d7062a2d03bbc2d9106e00a036d210cb8531c9a3bf3`.

> Owner questionnaire 2026-10-20 (item jytt-bead-title-admission): owner chose A — bead titles are NOT admitted; exclude them (SEC-5 fail-closed). Implement as a bounded code+test change in packages/three-surface-poc-core/src/work-items.ts (title SELECT near line 144; note line 207 refuses non-string titles). Premise check required first: no signed requirement or test oracle may need a served title; touch no other field. Admission (B) would need its own act.

[Observed] [PR #493](https://github.com/tzeusy-org/syzygy/pull/493) delivered
the withholding on `main` at `32c16625e3a14e6db995adff81379cf32baf49c3` on
2026-10-21. The [frozen verification record](../../../docs/evidence/jytt-bead-title-exclusion-2026-10-21.json)
and its [main reconciliation](../../../docs/evidence/jytt-bead-title-exclusion-rebase-2026-10-21.json) retain the
original source and evidence digests.

[Observed] The [2026-11-21 decision record](../../../docs/pursuits/2026-11-21-trajectory-vision-pursuit.md#owner-gates-this-run) reports choice C for
`pursuit-2026-11-21-trajectory-titles`, answered at `2026-11-21T12:21:41Z`.
It supersedes the October answer for titles only, allowing screened titles
from observed trackers when the declared policy is in place. It retains
the prohibition on provider egress for titles and leaves other free-text
fields and detector behavior outside that decision. The separately
sequenced move is `syzygy-t3jk.5`.

[Observed] At `fd485fcc22f376413d2ac02bd5b81f546723486b`, the work-item reader
still excludes titles and emits their omission disclosure. [SEC-5](../doctrine/security.md)
remains the governing rule for classification and withholding.
