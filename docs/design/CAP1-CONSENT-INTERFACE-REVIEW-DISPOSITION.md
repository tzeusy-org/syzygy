# CAP1 consent interface review disposition (syzygy-u2a.2)

> Implementation convention, not conformance authority. This page records how
> the round-2 notes on the frozen interface are applied, so the reviewed bytes
> stay unedited (verification rule 10).

- **Subject.** `docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md`,
  the bytes round 2 names by digest in its four-line head.
- **Reviews.** Round 1 `REVISE`
  (`docs/reviews/R-RT-U2A2-CONSENT-ENCODING-INTERFACE-RAW.md:4`), ten
  findings, each repaired in the subject (its §9). Round 2 `CONFIRM WITH
  EXCEPTIONS` (`docs/reviews/R-RT-U2A2-CONSENT-ENCODING-INTERFACE-2-RAW.md:4`),
  every round-1 finding repaired, four non-blocking notes.
- **Stopping rule.** The four notes are applied below as implementation
  conventions that narrow the subject without contradicting it; no third
  review round is dispatched for them. The implementation's exact-head
  review covers them with the code.

| Round-2 note | Applied as |
|---|---|
| 1 binding digest is a hash fixed point | `bindingDigest` is computed over the canonical `ConsentActBinding` with `a1AuditRecord` and `actRecordDigest` omitted. Item 9 is correlated only through the separate `auditRecordId`/`auditRecordDigest` comparison (state 2). A state-1 upgrade sends the same digest form; its binding carries `a1AuditRecord: null` and provenance `owner-adopted-bootstrap`. |
| 2 scope has two possible diagnostics | Check 9 requires only that `scope` is a non-empty string. The token grammar is enforced only at check 17, so `read-repository` and `observe observe` both report `scope-excludes-observation`. |
| 3 currency-bound boundary | Check 21 passes when `asOf − instant`, in milliseconds, is at most `maxAgeSeconds × 1000`; one millisecond more is `act-stale`. |
| 4 act read when its artifact fails | Every act whose reference passes the reference-form check is read, whatever its artifact outcome; an act is `not-read` only when the reference form is refused. Acts so read join the check 10/22/23 population. |
