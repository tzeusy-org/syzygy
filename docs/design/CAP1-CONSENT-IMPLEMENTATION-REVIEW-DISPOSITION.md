# CAP1 consent implementation review: disposition

Implementation convention record for `syzygy-u2a.2`, never authority. It
dispositions the exact-head implementation review stored verbatim at
`docs/reviews/R-RT-U2A2-IMPLEMENTATION-EXACT-HEAD-RAW.md` (verdict `REVISE`,
line 4, reviewed commit `28554d4b`). Behaviour authority stays the adopted
CAP1-REQ-011 and CAP1-REQ-046 v1.0 text; the frozen interface stays
`docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md` as
narrowed by `docs/design/CAP1-CONSENT-INTERFACE-REVIEW-DISPOSITION.md`.

| # | Severity | Disposition |
|---|---|---|
| 1 | blocking | Repaired. The §3 check 22/23 defeater population now includes the act under evaluation, so an act naming itself in `supersedes` refuses `act-superseded`. New REQ-011 matrix case `self-supersession` (24 cases). |
| 2 | non-blocking | Repaired. `captureProjectInputs` throws a `TypeError` before any read when `maxAgeSeconds` is not a positive safe integer (five values tested, zero reads). The stale test now uses `maxAgeSeconds: 1` and an act 1001 ms old. |
| 3 | non-blocking | Repaired. A `correlated` answer needs a non-empty `auditRecordId` and `sha256:<64 hex>` audit and binding digests; otherwise it is `unavailable` (three REQ-011 cases). |
| 4 | non-blocking | Deferred. The provider may be called for an act whose pair fails check 2; no such result is ever honored and the daemon wires no provider. Recorded as a follow-up for the coordinator. |
| 5 | non-blocking | Repaired. One REQ-011 case has the provider answer with a digest it hashes from a hand-encoded canonical literal (no `a1AuditRecord`, no `actRecordDigest`) and never echoes the digest it is handed. |
| 6 | non-blocking | Deferred. The entry read follows the admitted governance-root decision but reads from the observed root, not the root mapping. Consent is honored; recorded as a follow-up. |
| 7 | non-blocking | Deferred. A consent-refused entry renders `data-entry-state="unreadable"` with the correct visible reason `unconsented-source-or-provider`. A distinct state is a route-wording change that belongs with `syzygy-u2a.6`. |
| 8 | non-blocking | Repaired. `CapturedProjectInputs.manifest.inputs` is stored sorted by `(kind, subjectId)`; the manifest test asserts the sorted literal order. |
| 9 | non-blocking | Recorded. Frozen §5's `evaluateConsentAct` is implemented as `evaluateConsentActBeforeCorrelation` (checks 3–23) plus `applyCorrelation` (check 24), so a provider is called only after checks 3–23; `relationsOf` is the act-relation projection the checks read. Behaviour is unchanged by the split. |
| 10 | informational | No change. The rule-4 breadth stays an owner question. |

Each repair has a rule-6 mutant in
`docs/evidence/syzygy-u2a-2/review-repair-mutations-2026-11-02.json`.
