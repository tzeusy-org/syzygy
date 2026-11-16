# R-RT-U2A2 consent encoding and interface review — RAW
Subject: docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md
Subject SHA-256: 1b158e6b93806343595f1540a8c8809d6a15cf94ab420870a41425046e7cf5f2
Verdict: REVISE

Reviewed commit: `4c1720b572649215f4e4ded2e5c3c5eed77f8fe4` (worktree `syzygy-u2a.2`). [Observed] I re-derived the digest with `sha256sum`, and it matches the brief. The subject has 314 lines.

Sources read: the adopted v1.0 delta `openspec/changes/cap1-trusted-bootstrap-consent/specs/project-registration-and-honest-shape-visibility/spec.md`, that change's `design.md` and `APPLYING.md`, RFC-0003 `governance-homes-and-owner-acts.md` lines 112–420 (RFC3-16, (a), (b), (c)), RFC3-7 in `manifests-and-namespace.md` lines 256–275, the owner direction, `consent.ts`, `consent-loading.ts`, `pipeline.ts`, `coverage.ts`, `declaration.ts` (the consent fields), and plan lines 109–607.

## Findings

### 1. BLOCKING — §4: the correlation interface cannot correlate "all required bindings"

- **Clause.** REQ-011 scenario "Correlated consent": "**WHEN** a consent act claims state (2) and its independently kept audit record successfully correlates all required bindings". RFC3-16(c)(2): "Both paths bind RFC3-16(b)'s nine items."
- **Defect.** [Observed] `ConsentCorrelationProvider.correlate` receives only `projectId`, `actId`, `artifactDigest` and `claimedAuditRecord`. A `correlated` result returns only `auditRecordId` and `auditRecordDigest`. Syzygy then checks only that the identity equals the claimed `a1_audit_record`.
- **Effect.** [Inferred] Nothing compares items 4 (act type), 5 (owner), 6 (instant), 7 (scope) or 8 (supersedes/expires) against the audit record. The artifact digest does not cover them either: it hashes the artifact, not the act record. State (2) would be admitted with five of the nine bindings never correlated. That is the adopted scenario implemented fail-open.
- **Context.** The daemon wires no provider, so the risk is not live today. But this interface is the frozen one that conformance fakes and any later provider build on.
- **Repair.** Pass the full validated binding to `correlate`: all nine items, `actor`, `provenance`, the repository id and the act-record digest. Then do one of these:
  - require the `correlated` arm to return the correlated binding set, which Syzygy compares field by field (a mismatch on any field becomes `correlation-mismatch`); or
  - require the arm to return a digest over the canonical binding set, which Syzygy recomputes and compares.
- **Also.** State that the provider is called at most once per act, with no retry (scenario: "no bootstrap fallback or automatic retry").

### 2. BLOCKING — §2 / §3 check 14: scope is never matched to the observation being authorized

- **Clauses.**
  - REQ-011: "SHALL admit its in-force, scope-matched consent".
  - Scenario: "the consent gate admits only that observation scope".
  - RFC3-16(a): "current, attributable, scope-matched".
  - RFC3-7: "scope enumerates what is consented — observe, write (governance-root plane only), and … execute".
- **Defect.** [Observed] `scope` has the grammar "string". Check 14 compares only the act's scope to the artifact's scope. No check asks whether that scope covers repository observation. [Observed] Current fixtures use at least two spellings: `observe` and `read-repository` (`observation.test.ts:309`).
- **Effect.** [Inferred] An artifact and act that both say `scope: write`, or `execute`, or anything else, pass all 21 checks. They would admit root-listing and entry reads. That is wider than "only that observation scope", so it fails open.
- **Repair.** Freeze a scope grammar: either a closed token set from RFC3-7 or a list of tokens. Add a check after check 14 that the scope contains the observation token, with a diagnostic such as `scope-excludes-observation` mapped to "wrong scope". Then:
  - use one spelling (`observe`) and update the fixture that uses the other;
  - disclose in §8 that the current code ignores scope entirely.

### 3. Non-blocking — §3 checks 5–8: the order mislabels unparseable acts, and parse failure has no input arm

- **Clause.** REQ-011 requires that "its specific failure … [is] available". The artifact itself requires "identical inputs give identical diagnostics".
- **Defect.** [Observed] Checks 5–7 ("key present") run before check 8 ("mapping, schema, closed key set"). [Inferred] A YAML parse failure, a sequence, or a scalar document reports `owner-attribution-missing` instead of `owner-act-malformed`. [Observed] `ConsentAuthorityInput.act` has no arm for "read but did not parse". Its arms are `loaded`, `missing`, `unreadable` and `not-read`.
- **Effect.** The order is still fail-closed and deterministic, but the diagnostic is wrong.
- **Repair.**
  - Split check 8: run "parses and is a mapping" before check 5, and "schema, closed key set, every value grammar" after check 7.
  - Add an `act: { state: 'unparseable' }` arm, or define `fields` for a parse failure.
  - Say what a present-but-`null` `owner` or `instant` maps to.

### 4. Non-blocking — §5 precedence rules 3 and 4: tie-breaks unstated

- **Defect.** [Observed] The page says "Input order never matters" but names no tie-break for these cases:
  - several withdrawn artifacts for P, some valid and some invalid: which diagnostic, and which `diagnosticReference`;
  - several failed references under rule 4: which one is named.
- **Context.** [Inferred] Both outcomes refuse, so this is not fail-open. But the diagnostic tuple that both channels must show identically would depend on input order.
- **Repair.** Specify the tie-break: `withdrawn` beats `withdrawal-unresolved` beats `consent-evidence-unresolved`, and within a class the lowest reference by UTF-16 code-unit order wins.

### 5. Non-blocking — §2 / RFC3-16(c): the state-(1) evidence chain is not carried

- **Clause.** RFC3-16(c)(1): state (1) is "preserved as the **exact owner phrase**, **exact content digest**, act record and **recording commit/tag**". `design.md`: "The exact owner phrase, act record and recording commit/tag remain the state-(1) evidence chain".
- **Defect.** [Observed] The closed key set has no owner-phrase field, and the page never says where the phrase and the commit or tag live, or that CAP1 does not evaluate them.
- **Repair.** Either add an `owner_phrase` key (non-empty string, rendered with the admitted act basis), or state explicitly that the phrase and the commit/tag live outside the act record and are not admission inputs. The recording commit cannot be inside the file it records, so say that too.

### 6. Non-blocking — §6 and §8: the asOf/digest claim is inexact, and a plan deviation is unrecorded

- **Defect.** [Observed] The page says: "two `asOf` values give one digest exactly when they give the same decisions". [Inferred] That is false. The manifest records which inputs were read, plus correlation rows gated on checks 1–18, so the digest tracks the read set, not the decisions. Two asOf values can give different refusals (for example `act-future` and `act-expired`) with the same read set and therefore the same digest.
- **Plan conflict.** [Observed] Plan Task 1 Step 4 says "Same inputs with a different `asOf` must retain the source digest". The artifact departs from this, and §8 does not record it.
- **Repair.**
  - Restate the claim as: "the digest is equal exactly when the captured input set (descriptors and digests) is equal".
  - Add a §8 row for the Step 4 change and its reason: the pre-read decision depends on asOf.

### 7. Non-blocking — §8: the reconciliation table is accurate per row but incomplete

[Observed] Each of its seven rows matches plan Task 1. These deviations are missing:

- (a) Plan Step 6 / Step 7: the plan defeats a grant only by a *verified* same-pair withdrawal. The artifact refuses on invalid or unresolvable withdrawals, and adds rule 4. v1.0 requires this, but it should be recorded.
- (b) `resolvePreObservationConsent(projectId, entry, inputs)` becomes `decideRepositoryConsent(…, asOf, bound)`.
- (c) `ReferenceBoundConsentInput` becomes `ConsentAuthorityInput`.
- (d) The plan's `linkContexts` / `RepositoryLinkContext` are dropped from `CaptureDependencies` and `CapturedRepositoryInput`.
- (e) `CaptureVersions` drops `markdownParser` and adds the act encoding and the provider id.
- (f) The plan puts core types in `snapshot.ts` / `consent.ts`. The artifact uses the new `consent-decision.ts`.
- (g) The plan's `captureProjectInputs` returns `CapturedProjectInputs`. The artifact returns `| CaptureFailure`.
- (h) The plan's `UntrustedConsentRecordView` carries `artifactDigest`, `projectId` and `repositoryId`. The §5 view omits them.
- (i) The plan's root `not-read` reasons (`unverified-consent | unconsented | no-root`) are left unspecified.

**Repair.** Add these rows.

### 8. Non-blocking — §5 / §6: the interface is not fully frozen

[Observed] These are named but never defined:

- `CapturedProjectInputs`: it must at least carry `asOf`, the per-entry decisions, every `ConsentAuthorityInput` and the manifest, because `evaluateCapturedProject(captured)` takes no asOf.
- `AdmittedAct`: described by a comment only.
- `ConsentCurrencyBound`: its unit and grammar enter the manifest.
- The `asOf` grammar, and the refusal used when asOf is malformed.

Also: [Observed] the §7 coverage route stays `record consent` (`coverage.ts:28`), while the decision route is `owner-adjudication`. A refused pair would show two routes. Name which one `syzygy-u2a.6` renders.

**Repair.** Freeze these shapes in §5, or defer them explicitly with the bead that owns each.

### 9. Non-blocking — §2: the reference namespace collides

- **Defect.** [Observed] The artifact lives at `<ref>.yaml` and its act at `<ref>.act.yaml`. So reference `X.act` resolves its artifact to `X`'s act file.
- **Context.** [Inferred] This is not fail-open. The closed act key set forbids `id` and `grant_state`, so the load fails. But under rule 4 the bytes carry `project` and no `repository`, so the pair cannot be read and every pair is refused.
- **Repair.** Refuse references ending in `.act` as `reference-unresolvable`, before any filesystem access.

### 10. Non-blocking — §3 checks 19–20: duplicate act identities

- **Defect.** [Observed] Nothing requires `act` ids to be unique across captured acts. [Inferred] A revoke that names id X defeats every act with id X. That is fail-closed, but it is an unstated "ambiguous competing acts" case.
- **Repair.** Refuse the affected acts when two captured acts share an `act` id, with a diagnostic such as `act-identity-duplicate`.

## Acceptance criteria

1. Nine bindings, item 9 omitted vs absent, state (2) never becoming state (1): **met**, apart from findings 2 (scope semantics) and 5 (evidence chain). [Observed] Checks 7 and 15 keep omission and explicit absence apart. Check 21 has no fallback to state (1).
2. Distinct named refusals before any read: **met**, with ordering defects (finding 3) and tie-break gaps (finding 4). [Observed] Every case in the REQ-011 "Invalid binding" scenario maps to a named diagnostic. `owner-act-missing` and `actor-non-human` are distinct. The four correlation failures are distinct. Decisions precede every root and entry read.
3. Fail-closed precedence: **met**. Invalid defeating acts still refuse; a valid withdrawal defeats the grant.
4. Immutability and the asOf-free digest: **met in design**, but the stated property is wrong (finding 6).
5. Both channels, exact labels: **met**.
6. Nothing beyond the text or the direction's bounds: **met**. The provider and bound are optional, absent in the daemon, add no persistence, and add no governed write.
7. Reconciliation table: **incomplete** (finding 7).

## Answers to §9

**Q1. Is rule 4 (an unreadable reference refuses every pair) right, or too broad?**
[Inferred] It is the right fail-closed reading. A reference whose pair cannot be read may be "referenced withdrawal evidence" for any pair. REQ-011 says such evidence "SHALL leave the pair refused rather than revive a grant", and it cannot be ruled out for any particular pair.

The blast radius should be disclosed, though. One broken entry or top-level reference refuses every repository in the project, including valid state-(1) grants that REQ-011 says "SHALL admit". Render `consent-evidence-unresolved` with the failing reference so the owner can repair it. Narrowing the rule (for example, exempting references whose bytes are readable but malformed elsewhere) would be an owner question, not an implementation choice.

**Q2. Is the injected currency bound (check 18) acceptable, given no CAP1 bound exists?**
[Inferred] Yes, as a test seam. "Applicable declared bound" presupposes a declaration, and none exists. So in the daemon the check is honestly not applicable, recorded as `none` in the manifest, with no default invented.

Two conditions:
- RFC3-16(a) lists "the currency-bound declaration (RFC2-9)" as authorization-bearing. Wiring a bound in production must therefore come from an owner-act-backed declaration, never from code or configuration. Say so in §3.
- Freeze `ConsentCurrencyBound`'s encoding (finding 8).

**Q3. Is limiting grants to the entry reference consistent with design.md "Ambiguous competing acts refuse until owner resolution"?**
[Inferred] Yes. The declaration's per-entry `consent` reference is the exact selection (RFC3-7: "referenced, never embedded"), so a second in-force grant named only in `consents:` is not an ambiguity about which act governs the pair. Real competition is already covered: supersession (check 20) and withdrawal (rules 3 and 4) refuse.

What stays ambiguous and unrefused are duplicate `act` identities (finding 10). Close that. Also render non-entry grants for P as captured, non-granting facts, so they are disclosed rather than silently ignored.
