# Omission advice screening semantic delta

> **Candidate.** Proposed semantic change to REQ-polaris-generation-034.

[Observed] The [effective spec](../dossier-system-model/proposed/polaris-generation/spec.md#requirement-agent-brief-and-mechanically-checked-draft) at protected commit `e785433bfca9e2dc83f5c80f9c083c82812b6438` carries system-model version 2.24. The file SHA-256 is `f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54`, and the complete owning requirement SHA-256 is `5513164de3a74d234ed22ca32971f76edd7920dfcc754b884e219289e9cfd50c`.

The [proposed patch](proposed/polaris-generation/spec.md.patch) quotes the exact current and replacement text as removed and added lines. It changes the compared advice schema and applicable omission-list disclosure, then adds scenarios for per-list accounting and an unavailable screening decision. The matched case includes each form of the existing combined detector decision, plus a denial without a secret match.

[Observed] The pinned patch projection gives SHA-256 `4abc55910c7b1a5bae6171c8f459fe3c1c0865c37be020c3f6178c970f5d3c84`. REQ-polaris-generation-034 has 207 scenario headings before and 209 in the proposed projection. A full requirement-block comparison finds a change only in REQ-polaris-generation-034. Reversing the patch reproduces the complete pinned file.

From a fresh checkout, export the pinned effective spec bytes to a file named `spec.md` in a scratch directory, verify their SHA-256 above, and run `git apply --check --unidiff-zero` against the linked patch in that directory. Apply it with `git apply --unidiff-zero`, verify the resulting SHA-256 above, then reverse it with `git apply --reverse --unidiff-zero` and verify the original digest.

[Inferred] At version allocation, re-read the actual effective predecessor and compose this rule with any intervening successor. Reconcile the computed census and the runtime report contract at activation.

[Observed] The [first review](../../../docs/reviews/syzygy-9xvm/9XVM-OMISSION-ADVICE-R1-RAW.md) recorded REVISE. The revised text binds the existing combined path-or-text decision and defines the fixed Unknown report when screening cannot establish a required result.
