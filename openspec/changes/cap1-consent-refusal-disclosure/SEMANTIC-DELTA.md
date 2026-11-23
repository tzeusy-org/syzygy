# Consent refusal disclosure semantic delta

This behavior-changing candidate proposes one complete MODIFIED block for
CAP1-REQ-046. It composes over the
[P-109 v1.0 adoption](../cap1-trusted-bootstrap-consent/ADOPTION.md) at
actual main commit `fd485fcc22f376413d2ac02bd5b81f546723486b`. The adopted
[effective overlay specification](../cap1-trusted-bootstrap-consent/specs/project-registration-and-honest-shape-visibility/spec.md)
has SHA-256 `359ff741742902f0b07bbf1b4ec9aa997d17145cd56805fb49d6e683a12776e7`.

| Subject | Current predecessor | Candidate |
| --- | --- | --- |
| CAP1-REQ-046 refusal | Requires the specific refusal and authorization Unknown, with artifact identity and digest optional for that branch | Keeps the refused entry in both channels at the exact evaluation. Requires the exact pair when safe independent evidence supplies it. Otherwise reports Unknown with a safe reason and route. |
| RFC3-16(a) consent coverage | Refusal blocks dependent effect, leaves authorization Unknown and supplies an owner route | Adds the scoped consequence of continued refusal and safely evidenced artifact visibility. |
| Warrant | CAP1-REQ-046 grounds consent projection in RFC3-16(a/b/c), VIS-2, VIS-4 and SEC-4 among its existing references | Adds SEC-5 to the projection obligations. |

The four existing CAP1-REQ-046 scenarios and their obligations continue.
CAP1-REQ-011 and all other Capability 1 requirements are outside the change.
The adopted P-109 record, sign-off and reviewed v1.0 artifacts retain their
historical custody. This candidate does not bind a tag or alter that
composition.

At adoption, recompose effective CAP1-REQ-046 by identity, add the linked
coverage row, recompute governing-dependency and scenario counts, and
propagate the access and parity obligations to affected conformance and
implementation documentation. Adopt only an independently reviewed exact
successor as governed by VIS-4 and CC-SPEC-10. No adoption or runtime action
is taken by drafting this package.

Basis: [round 4 finding 2](../../../docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-RAW.md)
and its [recorded disposition](../../../docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-DISPOSITION.md).
