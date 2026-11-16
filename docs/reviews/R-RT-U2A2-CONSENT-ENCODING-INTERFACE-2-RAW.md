# R-RT-U2A2 consent encoding and interface review — round 2 RAW
Subject: docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md
Subject SHA-256: e502e11f0e148d458e90507f839e4f8b021f490352356251760ffcec31e8c1b1
Verdict: CONFIRM WITH EXCEPTIONS

Reviewed commit: `2687a6b655a785dfb5307a465fa8f40c6ea25fe5` (worktree `syzygy-u2a.2`). [Observed] `git rev-parse HEAD` returns that commit. `sha256sum` of the subject matches the brief's digest. The subject has 454 lines. The only untracked file is `.beads.gate.lock`.

Sources read: the round-1 raw; the subject in full; adopted CAP1-REQ-011 and CAP1-REQ-046 in the `cap1-trusted-bootstrap-consent` spec delta; RFC3-16(b) and (c) in `governance-homes-and-owner-acts.md`; RFC3-7 in `manifests-and-namespace.md:261`. I relied on round 1's reading of the code and plan for the reconciliation rows. I did not re-open the code files.

## Round-1 findings

| # | Round-1 finding | Status | Evidence |
|---|---|---|---|
| 1 | Correlation cannot correlate all bindings (BLOCKING) | Repaired | [Observed] §4 L129–160: `ConsentActBinding` carries items 1–9 plus actor, provenance, repository id and act-record digest. `correlate` receives the binding and its `bindingDigest`. The `correlated` arm returns a `bindingDigest`, and Syzygy recomputes and compares it (L169–173). The call is made at most once, with no retry; a thrown call counts as `unavailable` (L166–167). See new finding 1 for a feasibility problem. |
| 2 | Scope never matched to observation (BLOCKING) | Repaired | [Observed] L56–60 freeze a closed scope grammar, `observe`/`write`/`execute`. Check 17 adds `scope-excludes-observation` (L97), and L107–108 cover `write`/`execute`-only. The §8 row at L432 discloses that the current code does not check scope. The fixture spelling `observe` is fixed at L59–60. |
| 3 | Check order mislabels unparseable acts; no parse arm | Repaired | [Observed] Check 5 (parse to a mapping) now runs before checks 6–8, and check 9 (schema and grammars) runs after them (L85–89). An `unparseable` arm is added (L209). Checks 6 and 7 state that a `null` value fails. |
| 4 | Tie-breaks unstated | Repaired | [Observed] L275–278: `withdrawn` beats `withdrawal-unresolved`, which beats `consent-evidence-unresolved`. Within a class, the lowest reference by UTF-16 code-unit order wins. |
| 5 | State-(1) evidence chain not carried | Repaired | [Observed] L61–65: the phrase and commit/tag live outside the act record, are not admission inputs, and are not evaluated. The page also says a commit cannot be inside the file it records. |
| 6 | asOf/digest claim inexact; Step 4 deviation unrecorded | Repaired | [Observed] §6 L387–392 restate the property over the captured input set. The §8 row at L427 records the Step 4 change and its reason. |
| 7 | Reconciliation incomplete (a–i) | Repaired | [Observed] Each item has a row: (a) L430, (b) L428, (c) L429, (d) L435, (e) L436, (f) L433, (g) L434, (h) L431, (i) L437. |
| 8 | Interface not fully frozen | Repaired | [Observed] `CapturedProjectInputs` is defined at L321–332, `AdmittedAct` at L214–217 and `ConsentCurrencyBound` at L195–198. The `asOf` grammar and `as-of-invalid` are at L122–123 and L336. The two-route question is named and deferred to `syzygy-u2a.6` (L409–412). |
| 9 | `.act` reference namespace collision | Repaired | [Observed] L31–33: such a reference is refused `reference-unresolvable` before any filesystem access. |
| 10 | Duplicate act identities | Repaired | [Observed] Check 10, `act-identity-duplicate` (L90). Its counting population is stated at L109–113. |

Acceptance criteria 1–7: [Observed] met in the current bytes, subject to new finding 1 under criterion 1 and new findings 2–4 under criterion 2. The provider and the bound remain optional and absent in the daemon. The page adds no credentials, persistence, egress or governed write, so criterion 6 holds.

## New findings

1. **Non-blocking — §4 L151 and L169–173: as written, a real audit record cannot satisfy the binding digest.**
   - **Clause.** L151: `bindingDigest` is "over the canonical binding the audit record holds". L140 puts `a1AuditRecord` (`id`, `digest`) in the binding, and L144 puts `actRecordDigest` there. L170–171 require `auditRecordDigest` to equal the claimed `a1_audit_record`.
   - **Defect.** [Inferred] For a state-2 act, the binding would contain the audit record's own digest. It also contains the act-record digest, and the act record itself contains the audit digest. If the audit record's digested bytes "hold" that binding, each digest has to be inside the bytes it hashes. That is a hash fixed point, and no real provider can produce one.
   - **Effect.** The failure is fail-closed: every real state-2 attempt reports `mismatch`. A conformance fake that echoes the digest still passes. But the adopted "Correlated consent" scenario becomes unreachable outside fakes.
   - **Repair.** Define the correlated binding digest over items 1–8 plus act id, actor, provenance and repository id. Leave out `a1AuditRecord` and `actRecordDigest`, and keep item 9 correlated through the separate `auditRecordId`/`auditRecordDigest` comparison. Alternatively, say explicitly that the audit record holds the binding outside the bytes `auditRecordDigest` covers. Either way, say which fields the state-1 upgrade binding carries (`a1AuditRecord: null`, provenance bootstrap).

2. **Non-blocking — §3 checks 9 and 17: a scope that breaks the grammar has two possible diagnostics.**
   - **Clause.** Check 9 covers "every value grammar in §2". The §2 table gives `scope` the grammar "string … then read as the scope grammar below". Check 17 says "`scope` follows the scope grammar and has the `observe` token".
   - **Defect.** [Inferred] Take `scope: read-repository` or `observe observe`. One implementation can report `owner-act-malformed` at check 9, another `scope-excludes-observation` at check 17. The REQ-046 diagnostic must be identical on both channels, and the conformance literal would differ between the two.
   - **Repair.** State that check 9 requires only a non-empty string for `scope`, and that the token grammar is enforced only at check 17.

3. **Non-blocking — §3 check 21: the boundary is unstated.**
   - **Clause.** "`asOf − instant` within it".
   - **Defect.** [Inferred] The page does not say whether a difference exactly equal to `maxAgeSeconds` passes. It also does not say how millisecond instants are compared against a whole-second bound. The decision at that boundary is therefore not frozen.
   - **Repair.** State "≤ `maxAgeSeconds` × 1000 ms passes". This parallels checks 19 and 20, which state their boundaries.

4. **Non-blocking — §5/§6: whether an act is read when its artifact fails is unstated.**
   - **Clause.** The capture order reads "artifact bytes and digests, act bytes and digests". The `act` arm includes `not-read`.
   - **Defect.** [Inferred] The page does not say when `not-read` applies, for example when an artifact fails at check 1. Whether that act joins the check-10/22/23 population therefore depends on the implementation. The outcome stays fail-closed, but the input set, and so the digest, can differ.
   - **Repair.** State the rule. Either read every act whose reference is valid, whatever its artifact outcome, or read none when the artifact fails at check 1 and record that act `not-read`.
