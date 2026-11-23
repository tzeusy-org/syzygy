# Independent F1 recheck — Polaris provider claim ledger

Verdict: CONFIRM

Exact subject `e16f8f9fdc31c1fc8cb4c7d5b447f5e0e7ffbdee`, syzygy-u05.13. Spec SHA-256 `f03112ef1db5c68949b307ef099898e88ce88ddb8319255ac55660082154f4e4`. Prior review subject `41b4c599f0ba623e0e78293d6e0a745ad356f1af`. Reviewer `coordinator:codex-20261123-167df18c`.

[Observed] REQ-003 requires the ledger and assertion mapping on newly generated or revised provider bundles. REQ-019 independently requires the ledger at composition and the current interchange plus ledger before checked-draft or fidelity-review intake. The new scenario names both omit-the-whole-ledger and older-writer controls, with refusal in both intake paths. The earlier recorded-format scenario retains read compatibility and no migration. This closes F1's optional activation defect.

[Observed] I compared the complete diff between both subjects. The spec changes only the two passage insertions introduced in R1 and adds the sixth scenario. Existing source attribution and captured-state rules remain byte-identical to the reviewed draft. The remaining changes update F1 design, tasks, disposition and the review campaign. The R1 raw in the candidate is byte-for-byte equal to the retained exact-subject review. `git diff --check` passed. The proposal remains draft-only with implementation verification and binding adoption outside this review.
