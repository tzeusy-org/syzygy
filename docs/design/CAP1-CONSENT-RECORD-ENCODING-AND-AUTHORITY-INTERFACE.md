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
  artifact digest never hashes itself (design.md).
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
| `scope` | 7 scope | string; compared byte-for-byte to the artifact's `scope` |
| `supersedes` | 8 supersession/revocation | `null` or an act identity string |
| `expires` | 8 declared expiry | `null` or an instant in the `instant` grammar |
| `actor` | human-act premise | `human` \| `machine` |
| `provenance` | state selection | `owner-adopted-bootstrap` (state 1) \| `syzygy-verified` (state 2) |
| `a1_audit_record` | 9 A1 identity or explicit absence | `null`, or a mapping with exactly `id` (non-empty string) and `digest` (`sha256:` + 64 hex) |

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
| 5 | `owner` key present and non-blank | `owner-attribution-missing` | missing owner |
| 6 | `instant` key present and non-blank | `act-instant-missing` | missing instant |
| 7 | `a1_audit_record` key present | `audit-identity-omitted` | omitted audit field |
| 8 | mapping, schema, closed key set, every value grammar | `owner-act-malformed` | malformed binding |
| 9 | `actor` is `human` | `actor-non-human` | known non-human act |
| 10 | `artifact` equals the reference | `artifact-identity-mismatch` | wrong artifact identity |
| 11 | `artifact_digest` equals the artifact digest | `artifact-digest-mismatch` | digest mismatch |
| 12 | `project` equals the declaration project id | `project-mismatch` | wrong project |
| 13 | `act_type` is `consent` for `in-force`, `revoke` for `withdrawn` | `act-type-mismatch` | wrong act type |
| 14 | `scope` equals the artifact `scope` | `scope-mismatch` | wrong scope |
| 15 | state 1 has `a1_audit_record: null`; state 2 has a mapping | `provenance-state-inconsistent` | explicit absence only for state (1) |
| 16 | `instant` is not after `asOf` | `act-instant-future` | future instant |
| 17 | `expires` is `null` or after `asOf` | `act-expired` | declared expiry |
| 18 | no applicable currency bound, or `asOf − instant` within it | `act-stale` | applicable-staleness breach |
| 19 | no captured act with `act_type: revoke` names this act in `supersedes` | `act-revoked` | revocation |
| 20 | no captured act with `act_type: consent` names this act in `supersedes` | `act-superseded` | supersession |
| 21 | state 2: correlation result is `correlated` | `correlation-unavailable` \| `correlation-not-found` \| `correlation-mismatch` \| `correlation-indeterminate` | correlated consent; failed correlation does not downgrade |

- Checks 19–20 count any captured act whose keys parse far enough to read
  `act_type` and `supersedes`, valid or not: a defeating act that is itself
  invalid still refuses (fail closed; "invalid or unresolvable referenced
  withdrawal evidence SHALL leave the pair refused").
- Check 18's bound is injected (`consentCurrencyBound`, §5). The daemon
  composition root declares none, so the check is not applicable there and
  renders nothing; no default bound is invented.
- A caller flag (`verified: true`) or any extra artifact key is ignored for
  admission; an artifact with no act file stops at check 3.

## 4. Correlation boundary (state 2 and later upgrade)

```ts
export type ConsentCorrelation =
  | { readonly state: 'correlated'; readonly auditRecordId: string;
      readonly auditRecordDigest: Sha256Digest }
  | { readonly state: 'not-found' | 'mismatch' | 'indeterminate' | 'unavailable' };

export interface ConsentCorrelationProvider {
  readonly id: string; // recorded in the snapshot versions
  correlate(input: {
    readonly projectId: ProjectId;
    readonly actId: string;
    readonly artifactDigest: Sha256Digest;
    readonly claimedAuditRecord: { readonly id: string; readonly digest: Sha256Digest } | null;
  }): Promise<ConsentCorrelation>;
}
```

- The provider is optional and absent in the daemon (no provider is
  authorized). Absent provider: state 2 refuses `correlation-unavailable`;
  state 1 is unaffected.
- The provider is called only for acts that passed checks 1–18 (no I/O on
  behalf of an act already refused). Its result is a captured snapshot input.
- State 2 is admitted only on `correlated` whose identity equals the claimed
  `a1_audit_record`; any other result refuses. No result ever yields state 1.
- State 1 with a `correlated` result is an upgrade: that evaluation reports
  Syzygy-verified. Upgrade exists only in the newly captured evaluation.

## 5. Pair decision and interface

Core (`packages/cap1-core/src/consent-decision.ts`, pure, no I/O, no clock):

```ts
export type Sha256Digest = `sha256:${string}`;

export type ConsentDiagnostic = /* the closed set in §3, plus: */
  | 'withdrawn' | 'withdrawal-unresolved' | 'consent-evidence-unresolved';

export type ConsentProvenanceLabel =
  | 'owner-adopted (bootstrap, uncorrelated)'
  | 'Syzygy-verified';

export interface ConsentAuthorityInput {   // one per distinct declared reference
  readonly reference: string;
  readonly artifact:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly record: ConsentRecord }
    | { readonly state: 'failed'; readonly failure: ConsentReferenceFailureKind;
        readonly pair: { projectId: ProjectId; repositoryId: RepositoryId } | undefined };
  readonly act:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly fields: unknown }
    | { readonly state: 'missing' | 'unreadable' | 'not-read' };
  readonly correlation: ConsentCorrelation | 'not-attempted';
}

export type PreObservationConsentDecision =
  | { readonly authorization: 'admitted';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly artifactDigest: Sha256Digest;
      readonly record: ConsentRecord;
      readonly act: AdmittedAct;            // act id, act-record digest, owner, instant, scope, a1
      readonly provenance: ConsentProvenanceLabel }
  | { readonly authorization: 'Unknown';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly reason: 'unconsented-source-or-provider';
      readonly diagnostic: ConsentDiagnostic;
      readonly diagnosticReference: string; // which reference's evidence failed
      readonly route: 'owner-adjudication';
      readonly untrustedRecord: UntrustedConsentRecordView | undefined };

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
   withdrawal reference is `diagnosticReference`. Input order never matters.
4. A declared reference failed to load and its pair cannot be read from its
   bytes → every otherwise-admitted pair refuses
   `consent-evidence-unresolved` (an unreadable record may be a withdrawal of
   any pair). When its bytes parse far enough to give `project` and
   `repository`, only that pair refuses, `withdrawal-unresolved`.
5. Otherwise admitted, labelled state 1 or Syzygy-verified per §4.

- `UntrustedConsentRecordView` carries the loaded artifact's `id`, `scope`,
  `attribution`, `grant_state` as untrusted content beside the refusal; it is
  rendered, never honored.
- Other in-force grants for P named only in top-level `consents:` neither
  grant nor refuse; only the entry reference grants.
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
export function captureProjectInputs(root: string, deps: CaptureDependencies):
  Promise<CapturedProjectInputs | CaptureFailure>;
export function evaluateCapturedProject(captured: CapturedProjectInputs): ProjectEvaluation;
```

- `CaptureReader` has two operations, `readText(root, logicalPath)` and
  `listRoot(root)`, each returning a named result; tests count calls per path.
- `CaptureFailure` is `{ kind: 'source-changed-during-capture'; changed:
  readonly SnapshotInputDescriptor[] }`. There is no retry.

## 6. Capture order and snapshot manifest

Order, fixed:

```text
declaration
→ union of entry and top-level consent references (first occurrence order)
→ artifact bytes and digests, act bytes and digests
→ correlation (provider present, act passed checks 1–18)
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
- `asOf` is excluded. The evaluation identity is `(snapshot, asOf)`. Because
  the decision (and therefore which content is read) depends on `asOf`, two
  `asOf` values give one digest exactly when they give the same decisions.

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
  `capture-failed`. The full coverage projection from decisions is
  `syzygy-u2a.6`.
- `/entry` renders the captured entry; the request-time reader is removed.

## 8. Reconciliation with plan Task 1

The 2026-08-24 plan (`docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md`)
stays byte-unchanged; this section records where Task 1 is executed
differently under the adopted v1.0 text.

| Plan Task 1 | Executed as | Why |
|---|---|---|
| mandatory-audit `OwnerActBinding`; `ConsentActVerification` verified/unverified | common binding + explicit provenance sum (§2, §5) | design.md "Record and decision contract"; RFC3-16(b) item 9 |
| `VerifiedConsentRecord` for both states | `admitted` decision with an exact provenance label | design.md: do not reuse that name for both states |
| `ConsentProvenanceVerifier` required | optional `ConsentCorrelationProvider`, absent in the daemon | owner direction: no provider |
| `captureProjectInputs(root, deps)`; `evaluateCapturedProject(captured, asOf)` | `asOf` in `deps`; evaluation takes the capture | the pre-read decision needs `asOf` (future, expiry) |
| `UntrustedConsentRecordView.effectiveProvenance: 'Unknown'`, contradiction `owner-act-provenance-unverified` | refusal `authorization: 'Unknown'`, specific diagnostic, route `owner-adjudication` | REQ-011/046 v1.0 name per-case diagnostics |
| README capture | not added | not consumed until `syzygy-u2a.7` |
| canonicalization | as plan, plus `undefined` refused | determinism |

Downstream packets: `syzygy-u2a.6` projects coverage from
`PreObservationConsentDecision` and never re-evaluates acts; `syzygy-u2a.7`
reads README only for admitted repositories through the same decision and
`CaptureReader`; `syzygy-u2a.8`/`.9` report the scenario matrix in §3 as the
case denominator.

## 9. Questions put to the reviewer

1. Is §5 rule 4 (an unreadable reference refuses every pair) the right
   fail-closed reading, or too broad?
2. Is the injected currency bound (check 18) an acceptable reading of
   "stale under an applicable declared bound" given no CAP1 bound exists?
3. Is limiting grants to the entry reference (§5) consistent with design.md
   "Ambiguous competing acts refuse until owner resolution"?
