# Proposed consent refusal contract-coverage overlay

One consent-only CC-SPEC-8 consequence supplements the
[adopted P-109 overlay](../cap1-trusted-bootstrap-consent/CONTRACT-COVERAGE.md).
Its current invalid-act row continues to own blocking the effect, returning
authorization Unknown and routing the contradiction.

| Clause | Observable consequence | Requirement and oracle | Candidate disposition |
| --- | --- | --- | --- |
| RFC3-16(a) | Refusal preserves the consent artifact's safely known identity, digest and record state in both channels. It preserves the refused entry and reports unavailable evidence Unknown when SEC-5 or missing evidence prevents identifying the pair. | CAP1-REQ-011 per-scope refusal and CAP1-REQ-046 refusal disclosure oracle | Specified in this candidate. Implementation and verified runtime evidence are pending. |

This mapping leaves the general non-consent RFC3-16(a) disposition Unknown.
SEC-5 constrains projection for this particular consequence.
