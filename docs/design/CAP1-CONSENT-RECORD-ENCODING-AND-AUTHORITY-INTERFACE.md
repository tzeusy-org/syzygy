# CAP1 consent record encoding and authority-input interface (syzygy-u2a.2)

> Implementation convention, not conformance authority. This page freezes the
> exact on-disk consent-act encoding and the authority-input interface that
> `syzygy-u2a.2` builds, as
> `OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md` (bound "Record
> encoding and interface reviewed before code") requires. Behaviour authority
> is the adopted v1.0 text of CAP1-REQ-011 and CAP1-REQ-046 in
> `openspec/changes/cap1-trusted-bootstrap-consent/specs/`; where this page and
> that text disagree, the text wins and this page is the defect. RFC3-16(b) owns
> the nine bindings; this page spells them, it does not redefine them.

## 1. Consent artifact (unchanged)

- [Observed] Location and fields stay as `consent-loading.ts` loads them today:
  `<governance root>/.syzygy/governance/decisions/<reference>.yaml`, keys `id`,
  `project`, `repository`, `scope`, `attribution`, `grant_state`
  (`in-force` | `withdrawn`). The consent artifact is the RFC3-16(b) item-2
  artifact; `id` is its stable identity.
- **Artifact digest.** `sha256:` followed by 64 lowercase hex characters,
  computed over the artifact file's exact bytes as read. No newline, encoding
  or YAML normalization precedes hashing.
- A legacy artifact with no owner-act record (below) is a visible recorded
  fact that authorizes nothing (design.md "Compatibility").

## 2. Owner-act record encoding `cap1-owner-act/v1`

- **Location.** Exactly `<decisions home>/<reference>.act.yaml`, beside the
  artifact it acts on, derived from the same validated bare reference. No
  scan, no second candidate. The act record is a distinct file, so the
  artifact digest never hashes itself (design.md). A reference ending in
  `.act` is refused `reference-unresolvable` before any filesystem access,
  so no reference can name another reference's act file as its artifact.
- **Parser.** The core's pinned declaration dialect (`parseDeclarationSource`,
  `yaml@2.9.0`), as for the artifact.
- **Keys.** Closed set; every key is required; an unknown key is malformed.
  `null` is written explicitly where allowed; omission is never read as null.

| Key | RFC3-16(b) item | Value grammar |
|---|---|---|
| `schema` | — | exactly `cap1-owner-act/v1` |
| `act` | act identity | non-empty string |
| `project` | 1 project identity | non-empty string; compared to the declaration's project id |
| `artifact` | 2 artifact identity | non-empty string; compared to the reference |
| `artifact_digest` | 3 exact digest | `sha256:` + 64 lowercase hex |
| `act_type` | 4 act type | `consent` \| `revoke` |
| `owner` | 5 owner attribution | non-empty, not all-whitespace string |
| `instant` | 6 act instant | `YYYY-MM-DDTHH:MM:SSZ` or `YYYY-MM-DDTHH:MM:SS.sssZ`, a real calendar instant |
| `scope` | 7 scope | string; compared byte-for-byte to the artifact's `scope`, then read as the scope grammar below |
| `supersedes` | 8 supersession/revocation | `null` or an act identity string |
| `expires` | 8 declared expiry | `null` or an instant in the `instant` grammar |
| `actor` | human-act premise | `human` \| `machine` |
| `provenance` | state selection | `owner-adopted-bootstrap` (state 1) \| `syzygy-verified` (state 2) |
| `a1_audit_record` | 9 A1 identity or explicit absence | `null`, or a mapping with exactly `id` (non-empty string) and `digest` (`sha256:` + 64 hex) |

- **Scope grammar.** One or more tokens from the closed RFC3-7 set
  `observe`, `write`, `execute`, separated by single spaces, no token twice.
  Repository observation is admitted only when `observe` is a token. The
  current loader reads `scope` as a free string and nothing checks it; under
  this encoding a fixture that should admit uses `scope: observe`.
- **State-(1) evidence chain.** RFC3-16(c)(1) preserves the exact owner
  phrase, the content digest, the act record and the recording commit or
  tag. The phrase and the commit/tag live outside the act record (a commit
  cannot be inside the file it records); CAP1 neither evaluates nor renders
  them in this task, and they are not admission inputs.
- [Inferred] `actor: human` is the record's claim, not proof of attendance
  (RFC3-16(a) trust premise). `actor: machine` is the "known non-human act"
  case. A file that cannot state `human` cannot be admitted.
- No key, signature or credential is introduced. No fixture act is a real
  owner act; test fixtures carry `owner: fixture-owner (synthetic, not an
  owner act)`.

## 3. Act evaluation: ordered checks and closed diagnostics

One function evaluates one (artifact, act) pair at the explicit `asOf` and the
captured act set. The first failing check names the diagnostic; the order is
fixed so identical inputs give identical diagnostics.

| # | Check | Diagnostic | Spec case (CAP1-REQ-011 scenario) |
|---|---|---|---|
| 1 | artifact loads (existing loader kinds) | `reference-unresolvable` \| `record-unreadable` \| `record-malformed` \| `record-identity-mismatch` | missing record |
| 2 | artifact pair equals the entry pair (entry reference only) | `record-subject-mismatch` | wrong project (artifact side) |
| 3 | act file present | `owner-act-missing` | missing record; machine-only submission |
| 4 | act file readable | `owner-act-unreadable` | missing record |
| 5 | act bytes parse in the pinned dialect to a mapping | `owner-act-malformed` | malformed binding |
| 6 | `owner` key present, a string, not blank (absent, `null` or blank all fail) | `owner-attribution-missing` | missing owner |
| 7 | `instant` key present, a string, not blank (absent, `null` or blank all fail) | `act-instant-missing` | missing instant |
| 8 | `a1_audit_record` key present (`null` is explicit absence and passes) | `audit-identity-omitted` | omitted audit field |
| 9 | schema, closed key set, every value grammar in §2 | `owner-act-malformed` | malformed binding |
| 10 | no other captured act carries the same `act` identity | `act-identity-duplicate` | ambiguous competing acts |
| 11 | `actor` is `human` | `actor-non-human` | known non-human act |
| 12 | `artifact` equals the reference | `artifact-identity-mismatch` | wrong artifact identity |
| 13 | `artifact_digest` equals the artifact digest | `artifact-digest-mismatch` | digest mismatch |
| 14 | `project` equals the declaration project id | `project-mismatch` | wrong project |
| 15 | `act_type` is `consent` for `in-force`, `revoke` for `withdrawn` | `act-type-mismatch` | wrong act type |
| 16 | `scope` equals the artifact `scope` | `scope-mismatch` | wrong scope |
| 17 | `scope` follows the scope grammar and has the `observe` token | `scope-excludes-observation` | wrong scope |
| 18 | state 1 has `a1_audit_record: null`; state 2 has a mapping | `provenance-state-inconsistent` | explicit absence only for state (1) |
| 19 | `instant` is not after `asOf` | `act-instant-future` | future instant |
| 20 | `expires` is `null` or after `asOf` | `act-expired` | declared expiry |
| 21 | no applicable currency bound, or `asOf − instant` within it | `act-stale` | applicable-staleness breach |
| 22 | no captured act with `act_type: revoke` names this act in `supersedes` | `act-revoked` | revocation |
| 23 | no captured act with `act_type: consent` names this act in `supersedes` | `act-superseded` | supersession |
| 24 | state 2: correlation result is `correlated` and matches (§4) | `correlation-unavailable` \| `correlation-not-found` \| `correlation-mismatch` \| `correlation-indeterminate` | correlated consent; failed correlation does not downgrade |

- Check 15 applies to the artifact's own act; for a withdrawal artifact the
  act must be `revoke`. Check 17 is the "only that observation scope" limb:
  an act scoped `write` or `execute` alone admits nothing here.
- Checks 10, 22 and 23 count any captured act that passed check 5 and whose
  `act`, `act_type` and `supersedes` values are strings (or `null`), valid
  or not: a defeating act that is itself
  invalid still refuses (fail closed; "invalid or unresolvable referenced
  withdrawal evidence SHALL leave the pair refused").
- Check 21's bound is injected (`ConsentCurrencyBound`, §5). The daemon
  composition root declares none, so the check is not applicable there,
  the manifest records `none`, and no default bound is invented. RFC3-16(a)
  lists the currency-bound declaration (RFC2-9) as authorization-bearing:
  a production bound may only come from an owner-act-backed declaration,
  never from code or configuration; this task wires none.
- A caller flag (`verified: true`) or any extra artifact key is ignored for
  admission; an artifact with no act file stops at check 3.
- `asOf` grammar is the `instant` grammar. A malformed `asOf` stops capture
  before any read with `CaptureFailure` kind `as-of-invalid`.

## 4. Correlation boundary (state 2 and later upgrade)

```ts
// The validated act, every RFC3-16(b) item plus the repository and act-record digest.
export interface ConsentActBinding {
  readonly projectId: ProjectId;            // item 1
  readonly repositoryId: RepositoryId;
  readonly artifactId: string;              // item 2
  readonly artifactDigest: Sha256Digest;    // item 3
  readonly actType: 'consent' | 'revoke';   // item 4
  readonly owner: string;                   // item 5
  readonly instant: string;                 // item 6
  readonly scope: string;                   // item 7
  readonly supersedes: string | null;       // item 8
  readonly expires: string | null;          // item 8
  readonly a1AuditRecord: { readonly id: string; readonly digest: Sha256Digest } | null; // item 9
  readonly actId: string;
  readonly actor: 'human';
  readonly provenance: 'owner-adopted-bootstrap' | 'syzygy-verified';
  readonly actRecordDigest: Sha256Digest;
}

export type ConsentCorrelation =
  | { readonly state: 'correlated';
      readonly auditRecordId: string;
      readonly auditRecordDigest: Sha256Digest;
      readonly bindingDigest: Sha256Digest }  // over the canonical binding the audit record holds
  | { readonly state: 'not-found' | 'mismatch' | 'indeterminate' | 'unavailable' };

export interface ConsentCorrelationProvider {
  readonly id: string; // recorded in the snapshot versions
  correlate(input: {
    readonly binding: ConsentActBinding;
    readonly bindingDigest: Sha256Digest;   // canonical bytes (§6 encoder) of `binding`
  }): Promise<ConsentCorrelation>;
}
```

- The provider is optional and absent in the daemon (no provider is
  authorized). Absent provider: state 2 refuses `correlation-unavailable`;
  state 1 is unaffected.
- It is called at most once per act per capture, only for acts that passed
  checks 1–23, with no retry. A thrown or rejected call is `unavailable`.
  Its result is a captured snapshot input.
- `correlated` matches only when `bindingDigest` equals the digest Syzygy
  recomputes over the binding, and, for a state-2 claim, `auditRecordId` and
  `auditRecordDigest` equal the claimed `a1_audit_record`. Otherwise the
  result counts as `mismatch`. So all nine items are correlated, not only
  the audit identity.
- State 2 is admitted only on a matching `correlated`; any other result
  refuses. No result ever yields state 1.
- State 1 with a matching `correlated` result is an upgrade: that evaluation
  reports Syzygy-verified with the returned audit identity. Upgrade exists
  only in the newly captured evaluation; a prior evaluation is untouched.

## 5. Pair decision and interface

Core (`packages/cap1-core/src/consent-decision.ts`, pure, no I/O, no clock;
`packages/cap1-core/src/snapshot.ts` for digests and the manifest):

```ts
export type Sha256Digest = `sha256:${string}`;

export type ConsentDiagnostic = /* the closed set in §3, plus: */
  | 'withdrawn' | 'withdrawal-unresolved' | 'consent-evidence-unresolved';

export type ConsentProvenanceLabel =
  | 'owner-adopted (bootstrap, uncorrelated)'
  | 'Syzygy-verified';

export interface ConsentCurrencyBound {
  readonly maxAgeSeconds: number;  // positive integer
  readonly declaredBy: string;     // the declaring artifact's identity
}

export interface ConsentAuthorityInput {   // one per distinct declared reference
  readonly reference: string;
  readonly artifact:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly record: ConsentRecord }
    | { readonly state: 'failed'; readonly failure: ConsentReferenceFailureKind;
        readonly digest: Sha256Digest | null;
        readonly pair: { readonly projectId: ProjectId; readonly repositoryId: RepositoryId } | null };
  readonly act:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly document: unknown }
    | { readonly state: 'unparseable'; readonly digest: Sha256Digest }
    | { readonly state: 'missing' | 'unreadable' | 'not-read' };
  readonly correlation: ConsentCorrelation | 'not-attempted';
}

export interface AdmittedAct {
  readonly binding: ConsentActBinding;
  readonly correlation: Extract<ConsentCorrelation, { state: 'correlated' }> | null;
}

export interface UntrustedConsentRecordView {
  readonly trust: 'untrusted content';
  readonly recordId: string;
  readonly artifactDigest: Sha256Digest;
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly scope: string;
  readonly attribution: string;
  readonly grantState: GrantState;
}

export type PreObservationConsentDecision =
  | { readonly authorization: 'admitted';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly artifactDigest: Sha256Digest;
      readonly record: ConsentRecord;
      readonly act: AdmittedAct;
      readonly provenance: ConsentProvenanceLabel }
  | { readonly authorization: 'Unknown';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly reason: 'unconsented-source-or-provider';
      readonly diagnostic: ConsentDiagnostic;
      readonly diagnosticReference: string; // which reference's evidence failed
      readonly route: 'owner-adjudication';
      readonly untrustedRecord: UntrustedConsentRecordView | null };

export function evaluateConsentAct(/* one input, captured act set, project, asOf, bound */): ActEvaluation;
export function decideRepositoryConsent(
  projectId: ProjectId, entry: RepositoryEntry,
  inputs: readonly ConsentAuthorityInput[], asOf: string,
  bound: ConsentCurrencyBound | undefined,
): PreObservationConsentDecision;
```

Precedence, for entry pair P with entry reference R:

1. R's own evaluation fails → Unknown with R's diagnostic (primary).
2. R is a `withdrawn` artifact with a valid `revoke` act → Unknown,
   `withdrawn`.
3. R is a valid in-force grant, and some other captured artifact for P is
   `withdrawn`: valid → `withdrawn`; invalid → `withdrawal-unresolved`; the
   withdrawal reference is `diagnosticReference`.
4. A declared reference failed to load and its pair cannot be read from its
   bytes → every otherwise-admitted pair refuses
   `consent-evidence-unresolved` (an unreadable record may be a withdrawal of
   any pair). When its bytes parse to a mapping whose `project` and
   `repository` are non-empty strings, only that pair refuses,
   `withdrawal-unresolved`. [Inferred] Blast radius, disclosed: one broken
   reference whose pair is unreadable refuses every repository of the
   project, valid state-(1) grants included; the refusal names that
   reference so the owner can repair it. Narrowing this is an owner
   question.
5. Otherwise admitted, labelled state 1 or Syzygy-verified per §4.

- **Tie-breaks.** Among rules 3–4 candidates, `withdrawn` beats
  `withdrawal-unresolved` beats `consent-evidence-unresolved`; within one
  class the lowest reference by UTF-16 code-unit order is
  `diagnosticReference`. Input order never changes the decision or tuple.
- `untrustedRecord` is set whenever R's artifact loaded but the decision is
  Unknown; it is rendered, never honored.
- Other in-force grants for P named only in top-level `consents:` neither
  grant nor refuse; only the entry reference grants (RFC3-7: referenced, the
  entry names its consent). They stay in the manifest as captured inputs;
  serving them as disclosed non-granting facts is coverage projection,
  deferred to `syzygy-u2a.6`.
- The served tuple adds the evaluation id at serialization; the decision
  itself carries no snapshot (it precedes the digest).

Daemon (`packages/cap1-daemon/src/source-snapshot.ts`):

```ts
export interface CaptureDependencies {
  readonly asOf: string;                                   // explicit, injected
  readonly repositoryRoots?: Readonly<Record<string, string>>;
  readonly versions: CaptureVersions;
  readonly correlation?: ConsentCorrelationProvider;       // absent in the daemon
  readonly consentCurrencyBound?: ConsentCurrencyBound;    // absent in the daemon
  readonly reader?: CaptureReader;                         // fs by default; spied in tests
}

export interface CaptureVersions {
  readonly manifestSchema: 'cap1-source-snapshot/v1';
  readonly observer: string;
  readonly consentAdapter: string;
  readonly actEncoding: 'cap1-owner-act/v1';
  readonly yamlParser: 'yaml@2.9.0';
  readonly kernel: string;
  readonly evaluationEngine: string;
  readonly correlationProvider: string;  // provider id, or 'absent'
}

export interface CapturedRepositoryInput {
  readonly repositoryId: RepositoryId;
  readonly ordinal: number;
  readonly decision: PreObservationConsentDecision;
  readonly root:
    | { readonly state: 'captured'; readonly observation: ObservationOutcome; readonly digest: Sha256Digest }
    | { readonly state: 'not-read'; readonly reason: 'consent-not-admitted' | 'no-root' };
}

export interface CapturedProjectInputs {
  readonly asOf: string;
  readonly manifest: SourceSnapshotManifest;
  readonly snapshot: Sha256Digest;
  readonly declaration: DeclarationObservation;
  readonly consentInputs: readonly ConsentAuthorityInput[];
  readonly repositories: readonly CapturedRepositoryInput[];
  readonly entry:
    | { readonly state: 'captured'; readonly text: string; readonly digest: Sha256Digest }
    | { readonly state: 'missing' | 'unreadable'; readonly failureCode: string }
    | { readonly state: 'not-read'; readonly reason: 'unconsented-governance-root' };
}

export type CaptureFailure =
  | { readonly kind: 'source-changed-during-capture'; readonly changed: readonly SnapshotInputDescriptor[] }
  | { readonly kind: 'as-of-invalid' };

export function captureProjectInputs(root: string, deps: CaptureDependencies):
  Promise<CapturedProjectInputs | CaptureFailure>;
export function evaluateCapturedProject(captured: CapturedProjectInputs): ProjectEvaluation;
```

- Every value in `CapturedProjectInputs` is deep-frozen.
- `CaptureReader` has two operations, `readBytes(root, logicalPath)` and
  `listRoot(root)`, each returning a named result; tests count calls per path.
- `source-changed-during-capture` is returned with no retry; the daemon
  serves its named failure, never a partial snapshot.

## 6. Capture order and snapshot manifest

Order, fixed:

```text
declaration
→ union of entry and top-level consent references (first occurrence order)
→ artifact bytes and digests, act bytes and digests
→ correlation (provider present, act passed checks 1–23)
→ per-entry decision at asOf
→ admitted repository root listing and governance-root entry text only
→ re-read every captured byte input, compare digests
→ canonical manifest and digest
```

- Refused pairs cause zero repository-root and zero entry reads. The entry
  (`.syzygy/intent/OVERVIEW.md`) is read only when the governance-root
  repository is admitted; otherwise `{ state: 'not-read', reason:
  'unconsented-governance-root' }`.
- No README read is added: nothing in this task consumes it (`syzygy-u2a.7`
  adds it with discoverability).
- Manifest `cap1-source-snapshot/v1`: `schema`, `versions` (manifest schema,
  observer, consent adapter, act encoding `cap1-owner-act/v1`, `yaml@2.9.0`,
  kernel, evaluation engine, correlation provider id or `absent`),
  `configuration` (`digestAlgorithm: sha256`, `pathNormalization:
  relative-posix-v1`, currency bound or `none`), and `inputs`.
- Input kinds: `declaration`, `consent-artifact`, `owner-act`,
  `consent-correlation`, `repository-root`, `entry`. Each descriptor:
  `kind`, `subjectId`, `ordinal` (repository declaration order where one
  exists, else `null`), `logicalPath` (root-relative POSIX or `null`),
  `state` (`captured` | `missing` | `unreadable` | `not-read`), `digest` or
  `null`, `failureCode` or `null`. Rows sort by `(kind, subjectId)`.
- Byte inputs digest their exact bytes; the root listing and a correlation
  result digest the canonical JSON of the value.
- Canonical bytes: UTF-8 JSON, no insignificant whitespace, object keys sorted
  by UTF-16 code unit, `undefined` refused (every optional field is written as
  `null`). This is a fourth encoder kept apart from the three in AGENTS.md
  (cap1 imports nothing shared).
- `asOf` is excluded. The evaluation identity is `(snapshot, asOf)`. The
  digest is equal exactly when the captured input set (every descriptor and
  digest) is equal. Because the decision, and so which content is read,
  depends on `asOf`, two `asOf` values can give different input sets and
  so different digests; equal input sets with different decisions keep one
  digest and differ in the evaluation identity.

## 7. Served projection (both channels)

- Machine `/api/project` gains `consentDecisions[]`, one per declared
  repository in declaration order, each the decision tuple plus
  `evaluationId`. Human `/` gains the same tuples as rows in the existing
  "Why this answer?" disclosure, as text (no colour, position or hover), with
  the sentence "Consent authorizes observation only; it is not evidence that
  any effect succeeded."
- Admitted rows show the exact provenance label, artifact id and digest, act
  id and act-record digest, owner, instant, scope, and A1 identity or the
  words "explicitly absent". Refused rows show `Unknown`,
  `unconsented-source-or-provider`, the diagnostic, its reference, the route
  `owner-adjudication`, and any untrusted record view labelled untrusted.
- Coverage is fed only admitted records and the records behind `withdrawn`
  decisions, so a refused pair renders `unconsented` and never
  `capture-failed`. The coverage row keeps its existing route `record
  consent`; the decision tuple carries `owner-adjudication`. Which one the
  coverage row renders once it projects from decisions is `syzygy-u2a.6`'s
  to settle; this task does not change coverage wording.
- `/entry` renders the captured entry; the request-time reader is removed.

## 8. Reconciliation with plan Task 1

The 2026-08-24 plan (`docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md`)
stays byte-unchanged; this section records where Task 1 is executed
differently under the adopted v1.0 text.

| Plan Task 1 | Executed as | Why |
|---|---|---|
| mandatory-audit `OwnerActBinding`; `ConsentActVerification` verified/unverified | common `ConsentActBinding` + explicit provenance sum (§2, §4, §5) | design.md "Record and decision contract"; RFC3-16(b) item 9 |
| `VerifiedConsentRecord` for both states | `admitted` decision with an exact provenance label | design.md: do not reuse that name for both states |
| `ConsentProvenanceVerifier` required, verifies audit identity | optional `ConsentCorrelationProvider`, absent in the daemon, correlates the whole binding | owner direction: no provider; REQ-011 "correlates all required bindings" |
| `captureProjectInputs(root, deps)`; `evaluateCapturedProject(captured, asOf)` | `asOf` in `deps`; evaluation takes the capture | the pre-read decision needs `asOf` (future, expiry) |
| Step 4: same inputs with a different `asOf` retain the digest | digest equal exactly when the captured input set is equal (§6) | `asOf` decides which content is read |
| `resolvePreObservationConsent(projectId, entry, inputs)` | `decideRepositoryConsent(projectId, entry, inputs, asOf, bound)` | temporal checks and the declared-bound check |
| `ReferenceBoundConsentInput` | `ConsentAuthorityInput` (artifact, act, correlation per reference) | the act record is a second input per reference |
| Steps 6–7: a grant is defeated only by a *verified* same-pair withdrawal | an invalid or unresolvable withdrawal also refuses; rule 4 | REQ-011 v1.0 "invalid or unresolvable referenced withdrawal evidence SHALL leave the pair refused" |
| `UntrustedConsentRecordView.effectiveProvenance: 'Unknown'`, contradiction `owner-act-provenance-unverified` | refusal `authorization: 'Unknown'`, specific diagnostic, route `owner-adjudication`; view keeps `artifactDigest`, `projectId`, `repositoryId` | REQ-011/046 v1.0 name per-case diagnostics |
| scope unchecked (current code; plan silent) | closed scope grammar with `observe` required (check 17) | REQ-011 "only that observation scope" |
| core types in `snapshot.ts` / `consent.ts` | `snapshot.ts` (digest, manifest) and new `consent-decision.ts` | keeps the record-only `consent.ts` resolver intact for coverage |
| `captureProjectInputs` returns `CapturedProjectInputs` | returns `CapturedProjectInputs \| CaptureFailure` | mid-capture change and bad `asOf` are named values, not throws |
| `linkContexts` / `RepositoryLinkContext` in deps and repository input | not added | nothing in this task consumes them (`syzygy-u2a.7`) |
| README capture; `CaptureVersions.markdownParser` | not added; versions add `actEncoding` and `correlationProvider` | README unconsumed until `syzygy-u2a.7` |
| root `not-read` reasons `unverified-consent \| unconsented \| no-root` | `consent-not-admitted \| no-root`; the decision carries the specific reason | one reason source, the decision |
| canonicalization | as plan, plus `undefined` refused | determinism |

Downstream packets: `syzygy-u2a.6` projects coverage from
`PreObservationConsentDecision` and never re-evaluates acts; `syzygy-u2a.7`
reads README only for admitted repositories through the same decision and
`CaptureReader`; `syzygy-u2a.8`/`.9` report the scenario matrix in §3 as the
case denominator.

## 9. Review record

Round 1 (`docs/reviews/R-RT-U2A2-CONSENT-ENCODING-INTERFACE-RAW.md`,
verdict REVISE) raised ten findings; this revision repairs each: 1 §4
whole-binding correlation; 2 §2 scope grammar and check 17; 3 checks 5–9
and the `unparseable` arm; 4 §5 tie-breaks; 5 §2 evidence-chain note; 6 §6
digest property and §8 row; 7 §8 rows; 8 §5 shapes, `asOf` grammar, route
note in §7; 9 §2 `.act` refusal; 10 check 10. Its answers to the three
questions are adopted as written in §3 and §5.
