PASS

[Observed] The patch matches the specified digest and base commit. Fixed receipt lookup retains full currentness and exact byte-count and digest checks. The four role receipts retain their bytes, parents, class comparisons, and declaration aliases. Existing batch inspection checks full currentness before and after inspecting those receipts. The source, renderer, and ledger release checks are unchanged.

[Observed] Existing tests cover exact batch subjects, foreign receipts, withdrawal during inspection, and role declaration aliases. The added test covers a single fixed lookup check, same-length altered bytes, and withdrawn authority. This was a source review. [Unknown] Hosted runtime effect.
