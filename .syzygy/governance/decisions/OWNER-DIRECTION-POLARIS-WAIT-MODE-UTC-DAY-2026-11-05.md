# Owner direction — UTC-day eligibility of local-agent wait-mode sign-offs

Date: 2026-11-05

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05`

This is a plain owner direction under GP-Q0. It binds no artifact digest,
adds no row to `ACCEPTANCE-ACT-RECORD.md` and registers no performed tag.
It signs or adopts no package and edits no predecessor byte.

## Actual owner answer

[Observed] The coordinator received the actual user message at
2026-11-05T04:14:46.587872+00:00 (UTC). Attribution: Actual user message in this coordinator session.
The exact message was:

> `- A: UTC day — implement and verify the bounded change (Recommended)`

[Observed] This selected A in the reviewed offering for `syzygy-bpyt.1.26`.
The offering's review returned CONFIRM WITH EXCEPTIONS, notes only. Its
review concerned the proposal, not the resulting implementation. The exact
selected direction and its bounded output changes are recorded below so
this record does not depend on the temporary offering's availability.

## Selected direction A

For syzygy-bpyt.1.26 under GP-Q0, authorize the local-agent wait gate to treat the one recorder-position Date: YYYY-MM-DD as a real UTC effective day. Retain existing head/aggregate/applied-subject and version checks. Require exactly one Date field in the record at the second nonblank line; missing, duplicate, malformed, impossible or future Date cannot authorize wait mode. Use each operation's one captured finite, representable evaluation instant, shared across candidates, with UTC-day equality allowed. Do not enforce an unavailable exact selection time or infer a registry instant. Preserve any matching in-force eligible candidate and existing trust/entry-check residuals. Keep the four affected public flows' refused/unsigned/exit-1 envelope and valid existing facts/messages. Add only the precise date/evaluation reasons below. Preserve both record dialects and predecessor bytes. After fresh shared-write clearance, implement, verify, independently review and document exactly this bounded change with the full original thirteen criteria; this direction signs/adopts no package and grants no other consent/execution/egress/security/retention authority.

The authorized new refusal reasons, verbatim from the selected offering:

- **future:** wait mode cannot be authorized by the matching local-agent sign-off because its Date is later than this operation's UTC day; it is not in force yet for wait mode; hand each session over with session-prompt as signed in v1.1
- **missing:** wait mode cannot be authorized by the local-agent sign-off because its recorder-position Date is missing; hand each session over with session-prompt as signed in v1.1
- **invalid:** wait mode cannot be authorized by the local-agent sign-off because its Date is duplicate, misplaced, malformed or not a real calendar day; hand each session over with session-prompt as signed in v1.1
- **invalid_evaluation:** wait mode cannot be evaluated because this operation has no finite, representable evaluation instant; hand each session over with session-prompt as signed in v1.1

An eligible matching in-force candidate wins. Non-temporal absent/head/aggregate/drift checks retain honest existing facts. Where no candidate can authorize, choose the accurate temporal reason only from the candidate(s) actually established; mixed-candidate reason precedence is an engineering detail to document/test, never permission to misstate drift or no human act. Invalid evaluation time refuses before candidate reads/effects.

## Authority and limits

[Observed] GP-Q0 part 3 in
`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` says:
“Any change not listed here to what a gate accepts or refuses stops and returns
to the owner.” This actual answer authorizes the bounded change described
above. Scope A, directions 1–3 and 5 in
`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, preserves owner
package/version selection, version binding, fresh review and predecessor
bytes. This direction changes no producer metadata or sign-off ceremony.

[Observed] Item 3 of `POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md` says:
“The code may merge only once version 1.2 is signed off”. The v1.2 and v1.3
local-agent sign-off records remain intact; this direction defines the extra
operational UTC-day eligibility predicate over matching eligible records.
RFC3-16(a) requires an act to be “current, attributable, scope-matched”;
RFC3-16(b) item 6 names “the act instant”, and item 8 says “Revocation is itself
an explicit act”. Scope A and the existing date-only dialect remain the
applicable record form; no missing instant is manufactured.

[Observed] A is day-granularity authorization, including same-day eligibility
before an unavailable exact selection time. It evaluates the trusted Syzygy
checkout once at operation entry, using its one captured finite representable
instant. Record, aggregate, review and installed specification are separate
reads: no atomic cross-file snapshot, forgery protection, mid-slice watcher or
continuous revocation enforcement is promised. An already-running await slice
keeps its entry decision. A new invocation re-reads the files and reevaluates
against its captured UTC day. This is an operational permission check, not an
upgrade of persisted evidence status.

[Observed] Genuine later revocation follows an explicit owner direction/act
under RFC3-16 and Scope A direction 6; withdrawal defeats grant. Appending
arbitrary `Withdrawn:` prose is not a new revocation dialect. The registry
entry reader retains its separate exact-template, same-day whole-second
`Recorded at (UTC)` instant contract. Candidate v1.4 is not signed here.

[Observed] Implementation, verification, independent exact-head review and
documentation are bounded to the full original thirteen acceptance criteria.
The proposal review classified classes 1, 4 and 6, floors 1–6, moderate technical
complexity and high authorization impact; final independent review may
reclassify. GP-Q0's mutated-record differential (including altered prose),
predicate mutants and non-blocking cycle notice remain required.

This grants no new consent, observed-repository read/execution, provider,
egress, security, retention, release or other pending outcome permission.
Reverting the implementation would restore future-Date acceptance and needs
the applicable owner direction; it does not require rewriting run history or
re-signing predecessor bytes.

## Provenance

[Observed] The actual-answer source, reviewed offering, frozen direction text
and review bindings are retained by the coordinator outside the repository.
Their scripted subject/digest receipt is retained with this change's execution
evidence. No temporary artifact is itself an owner act or final code review.
