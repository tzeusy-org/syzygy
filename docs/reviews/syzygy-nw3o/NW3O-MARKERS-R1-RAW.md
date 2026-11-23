REVISE

# Independent CC-REV-2 and CC-REV-4 review, P-108 marker-population candidate

[Observed] Exact candidate `d3987aa494cdb3fd4f9d318fbae4e5197df69f2a` over `74e01e140a9a10322a00e9f1ea8dc015ac5598b3`. I reviewed a clean detached checkout. The candidate specification in `openspec/changes/poc-marker-population-evidence/proposed/three-surface-poc-experience/spec.md` has SHA-256 `a00d00bb0982a7e13aa36c7b9f21192fee510841d01b1f25081bcad64e76b30c`. The seven changes are six candidate files and one candidate index row. The signed predecessor, adoption ledger, and implementation files are outside the exact diff. Governance reports 21 OK, 17 WARN, 0 FAIL. `git diff --check` passed.

## F1 — The candidate lacks a negative control for substantive failure with the exact nonempty marker population (blocking)

[Observed] Tracker acceptance criterion 4 requires that a nonempty checked fixture can still fail a substantive marker predicate. For POC-REQ-055, candidate lines 113–120 assume that every occurrence satisfies the predicate and describe the pass case. Lines 122–130 exercise only occurrence mismatch. The POC-REQ-060 scenario pair at lines 285–302 makes the same assumptions. The normative falsifiers at lines 80–87 and 240–250 require failure for a bad reason or encoding, but both sets of acceptance scenarios leave that predicate unexercised once the occurrence comparison agrees.

[Inferred] A checker that tests scope, nonempty cardinality, and exact occurrence identity but never looks at a reason or token would meet these new positive and population-drift scenarios. That false pass defeats the breach-detection obligation the proposal preserves.

For each requirement add a scenario at a complete, nonempty fixed fixture with exact expected region, attribute, identifier, and multiplicity. Keep every marker unchanged. Strip the flagged reason from one marked relationship for 055, and give one marked Inferred record a different token encoding for 060. The occurrence comparison still agrees and the respective rendering predicate fails. Keep the absent-evidence Unknown scenarios and separate machine-side outcomes.

## Remaining acceptance

- [Observed] Both complete candidate blocks preserve the signed P-108 behavior paragraphs at 055 lines 11–23 and 060 lines 147–162, the three predecessor scenarios at lines 89–96 and 252–268, and the warrant sets except the explicit VIS-2 and RFC2-24 additions for 055. The closed relation/role/flag checks remain at 055 lines 48–73. The independent encoding, record, assertion, count and Unknown-set requirements remain at 060 lines 184–239.
- [Observed] Lines 25–43 and 164–182 make the checked-in scope independent of the renderer and extraction, exhaust the declared regions and attributes, and compare a literal occurrence multiset. Existing per-row marker attributes are included, matching the prior direction's item at lines 111–127. Lines 98–111 and 270–283 distinguish undeclared scope from a complete zero observation, report each Unknown with the corresponding reason and resolution route, and keep other limbs independent. That preserves VIS-2's evidence requirement and RFC2-24's distinction between missing declaration and missing evidence. An observed zero is a population measurement.
- [Observed] Both fixed fixtures cover full marker deletion, same-count membership substitution, and positive complete agreement. F1 supplies the missing substantive negative control. The proposal and semantic delta explicitly route same-change coverage, dependency and implementation reconciliation to any later adoption. The P-108 signed acceptance for `syzygy-dov.9.3` remains distinct and the draft claims no shared-model execution slot.
