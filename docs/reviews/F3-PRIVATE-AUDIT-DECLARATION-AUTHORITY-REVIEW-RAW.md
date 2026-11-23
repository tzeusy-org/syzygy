PASS `8e98a3764b3bbc67d1bab8b11eb72d7aef84dfa7`

[Observed] The private declaration path retains live authority checks before the write, before the file sync, and after both syncs and the complete tail read. It rechecks names and the original setup cutoff before updating counters. Runtime appends retain their prior authority checks. Audit screening, byte limits, and refusal behavior remain intact under SEC-5 and REQ-polaris-generation-025/048.

[Observed] The regression withdraws authority during the first nonempty prefix read. It requires both declaration syncs to have run, zero counted declarations, an Unknown tail, and no bytes in the next role’s file. The caller aborts dependent setup when audit creation refuses.

Reviewed the exact two-file diff and ran `git diff --check`. Test execution was outside this source-only review.
