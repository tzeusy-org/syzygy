# Marker population evidence semantic delta

Class is behavior-changing for the conformance oracle. Both proposed
MODIFIED blocks carry the complete current P-108 requirements, including
their existing scenarios and each warrant. The source of record for both
blocks is the adopted [Three-Surface POC specification](../three-surface-poc-experience/specs/three-surface-poc-experience/spec.md).

| Requirement | Proposed obligation |
| --- | --- |
| POC-REQ-055 | A checked-in relationship marker scope and independently declared nonempty fixed-fixture occurrences bound the rendering sweep. An undeclared or empty population yields Unknown for the rendering limb. The existing machine-side relation checks keep their own disposition. VIS-2 and RFC2-24 join its existing warrants. |
| POC-REQ-060 | The same evidence rule applies to the Inferred-record rendering limb. A fixed fixture exercises its declared token encoding on a marked occurrence. The token, record-shape, count and Unknown-set checks keep their separate disposition. |

## Same logical change at adoption

- Reconcile the affected marked-only RFC1-26 and RFC2-25 rows in [contract coverage](../three-surface-poc-experience/CONTRACT-COVERAGE.md) against the revised oracle evidence limit. Keep the existing unmarked-rendering dispositions distinct.
- Regenerate [governing dependencies](../three-surface-poc-experience/GOVERNING-DEPENDENCIES.md) with the POC-REQ-055 VIS-2 and RFC2-24 links. Review the [current proposal](../three-surface-poc-experience/proposal.md) and current specification routing for any reliance on the superseded oracle wording.
- Carry the marker declaration, independent fixture expectations and evidenced oracle behavior through the same logical change, subject to the governing implementation and review rules at adoption. Record the effective composition and version under VIS-4 and CC-SPEC-10. Preserve the signed P-108 record and separately authorized delivery scope.

The scope above governs a future adoption. The current package freezes
proposed bytes for independent review under CC-REV-4.

## Independent review disposition

R1 issued REVISE on `d3987aa4`. F1 asked for a substantive rendering
failure after the fixed nonempty occurrence comparison passed. The two
added cases keep exact marker membership and remove a flagged reason or
alter the Inferred encoding.
[Raw independent review](../../../docs/reviews/syzygy-nw3o/NW3O-MARKERS-R1-RAW.md).
