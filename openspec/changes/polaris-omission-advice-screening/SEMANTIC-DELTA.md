# Omission advice screening semantic delta

> **Candidate.** Proposed semantic change to REQ-polaris-generation-034.

[Observed] The [effective spec](../dossier-system-model/proposed/polaris-generation/spec.md#requirement-agent-brief-and-mechanically-checked-draft) at protected commit `e785433bfca9e2dc83f5c80f9c083c82812b6438` carries system-model version 2.24. The file SHA-256 is `f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54`, and the complete owning requirement SHA-256 is `5513164de3a74d234ed22ca32971f76edd7920dfcc754b884e219289e9cfd50c`.

The [proposed patch](proposed/polaris-generation/spec.md.patch) quotes the exact current and replacement text as removed and added lines. It changes the compared advice schema and applicable omission-list disclosure, then adds the per-list accounting scenario. The matched-case expected result includes one count per list and preserves the comparator's order for emitted values.

[Observed] The pinned patch projection gives SHA-256 `bb5e1c8e1cd9073674dfcd6fa394836958073a8b65c9fa0b51c92afb60f10576`. REQ-polaris-generation-034 has 207 scenario headings before and 208 in the proposed projection. A full requirement-block comparison finds a change only in REQ-polaris-generation-034. Reversing the patch reproduces the complete pinned file.

[Inferred] At version allocation, re-read the actual effective predecessor and compose this rule with any intervening successor. Reconcile the computed census and the runtime report contract at activation.
