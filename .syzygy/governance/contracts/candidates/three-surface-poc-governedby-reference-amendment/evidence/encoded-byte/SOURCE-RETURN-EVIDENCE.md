# P115 encoded-byte impact: source-return corroboration

[Observed] Independent read-only engineering evidence, not a new semantic review/verdict or candidate repair. Subject C3 `abd3f6ca2e8e99ad59327fdfc7b38d8bf41b07b5`; source `eba011dfbe254c09a88ccc374b3efe5ff5df1762`. All writes are in this new own cache. No repository/core/raw/act/Beads/tooling bytes were changed. No product/test, daemon, observed project code or provider was executed.

## Literal byte witness

[Observed] Both methods independently read the same exact C3 JSON fixtures: Python `json.loads`/compact `json.dumps` then UTF-8 `len`; Node `JSON.parse`/`JSON.stringify` and `Buffer.byteLength`. Both emitted identical compact UTF-8 files and hashes. They import no Syzygy code and do not read one another's counts. Compact files have no trailing newline. The raw fixtures are synthetic bounded projections, not complete production PocModel instances.

| C3 input | Raw file bytes | Compact UTF-8 bytes | Exact input SHA256 |
| --- | ---: | ---: | --- |
| inline-body-A.json | 4996 | 3553 | `6648e7c17ea5b8f0317d4905d72292b8594e7800fc648154c42dfde28565b39b` |
| reference-body-A.json | 4646 | 3365 | `281cdf84ceda4b30e3418eb478b62ce64b71d9151732e1a36a34120d3751ceb9` |

[Observed] Difference: **188 bytes**. The compact workItems subobjects alone are 1,086 versus 898 bytes. Compact whole-body SHA256 values are `b04439af1711cb1d35a76332f979878b67274a8f92ff1809571ebe1bd0a97b5a` and `06579bc5f5abb28028615f2e2f698c289a30cfa6c0efb1e13097821d44735fd9` respectively. Full machine-readable counts/output are `PYTHON-COUNTS.json` and `NODE-COUNTS.json`; both original measurement scripts are retained.

[Observed] The source predicate is final encoded length **<=** declared ceiling. The separating interval is **3,365 through 3,552 inclusive**; L=3,365 is one witness. The following is mathematical/source-branch eligibility, not an observed HTTP response or live admission result.

| Declared L | Inline 3,553 bytes | Reference 3,365 bytes |
| ---: | --- | --- |
| 3364 | breach | breach |
| 3365 | breach | fits |
| 3366 | breach | fits |
| 3552 | breach | fits |
| 3553 | fits | fits |
| 3554 | fits | fits |

[Observed] Source constants at eba are maxHumanResponseBytes=2,097,152 and maxMachineResponseBytes=16,777,216. Both small literal examples fit those constants. [Unknown] Actual final human/machine encoded sizes, actual HTTP statuses/headers, response-ceiling behavior on a complete model and runtime admission were not measured. A fit only makes that byte predicate eligible; it does not prove authority, readiness or success. The threshold witness demonstrates consumption even when both examples fit a nominal constant.

## Physical size can move in either direction

[Observed] The two methods also independently derived and measured N=0 and N=1 from the exact named C3 seeds. Full outputs are `SMALL-N-PYTHON.json` and `SMALL-N-NODE.json`; their four compact-byte outputs match exactly across methods. The exact derived JSON inputs are retained in `derived-inputs/`. These are derived synthetic byte-only pairs, not captured runtime bodies or fresh human/machine conformance fixtures.

[Observed] Derived N=0 (empty): C3 reference-empty is unchanged; inline peer differs only by deletion of workItems.governedBy. Seed SHA256 `2a17732c3692730fd04f9df0a21ed2282a1eca77bc11d620af798c18d24bb074`. Inline **1692** bytes (`71f2cf4ae3fc6e979912f956efe5f8e82e9ad67d8fb8cf2750bd8fc3c0eb2d45`); reference **1950** bytes (`cf27c5bb70d0e3f9fe90c9a189c10a06d77ce41af76ed8edd4a58a00935a302c`). Reference minus inline: **+258** bytes. Separating interval: [1692, 1949].

| L | Inline | Reference |
| ---: | --- | --- |
| 1691 | breach | breach |
| 1692 | fits | breach |
| 1693 | fits | breach |
| 1949 | fits | breach |
| 1950 | fits | fits |
| 1951 | fits | fits |

[Observed] Derived N=1 (one-item): Both derived from C3 reference-body-A: retain fixture-a, count=1, rendered fixture-a only, retain its governing-intent subject plus region subject. Inline peer replaces that one reference by the complete shared value and removes the shared carrier. Seed SHA256 `281cdf84ceda4b30e3418eb478b62ce64b71d9151732e1a36a34120d3751ceb9`. Inline **2612** bytes (`6f6b2c57eb278e62328aac56242cca3b82618ec959ae9337dc3f0f91c5f97df0`); reference **2647** bytes (`36d6b9a6396766f33886de54421622a18574636f4764a2bb4550ca133170e364`). Reference minus inline: **+35** bytes. Separating interval: [2612, 2646].

| L | Inline | Reference |
| ---: | --- | --- |
| 2611 | breach | breach |
| 2612 | fits | breach |
| 2613 | fits | breach |
| 2646 | fits | breach |
| 2647 | fits | fits |
| 2648 | fits | fits |


[Inferred] Once-per-observation sharing can add fixed overhead for small populations. These examples show both smaller and larger final outputs. There is no all-N savings claim, no new inline fallback or empty-observation exception, and no proposed ceiling change. The existing final-byte rule governs both directions; at the listed separating limits the reference can introduce a breach that the inline representation does not have. [Unknown] No actual runtime request/readiness/ETag result follows from this arithmetic.

## Governing block and method

[Observed] `GOVERNING-BLOCKS.json` retains nine complete requirement blocks, complete CC-IMPACT-3 and two relevant contract clauses by file/block digest and line range. The **complete** PWB-REQ-006 block is lines 788–905, SHA256 `b5ad25343860d2052bed14cdfb25885f95c524927cde59151960e044992ef3a8`. Its containment/content/context/resource-envelope limbs, ceilings/breaches, verification oracle/falsifiers and scenarios are all retained. The two quoted limbs below do not substitute for that whole block.

> Final encoded human HTML and machine JSON SHALL each have an explicit byte ceiling.

> a separately accumulated resource ledger and exact final encoded-byte counts decide.

[Observed] CC-IMPACT-3 defines affected as “those a declaration or a consumption ties to the change”; explicitly unaffected means “those examined and found untied” with both “the reason AND the method that established untiedness.” The complete clause's SHA256 is `498b6f34643dd7a1de980df03bec72105ae21c80c020162b27e6886c9eef9def`. It explicitly distinguishes an observation about undeclared identities from a method establishing untiedness.

[Inferred] Equal effective facts, an unchanged ceiling or a compatible requirement is insufficient to prove no consumption edge. The byte witness changes an explicit PWB-006 oracle input and can change its comparison outcome. Classifying an affected consumer is distinct from finding its normative text invalidated. Its limit and refusal obligations can remain in force while the impact set includes the representation consumer. No different ceiling/exception is requested by this evidence.

## Named source owners and complete limbs

[Observed] `BOUNDARY-MAP.json` binds exact owning functions, fields, call sites and downstream decisions. The static census parsed 483 tracked JS/TS-family blobs out of 2,934 tracked paths, with zero parse diagnostics. For boundedResponse it finds 12 named references and ten direct calls: three production calls, all in routes.ts (222, 233, 255), plus seven tests. Ten named owner symbols were examined. Independent text signals and their comment/string-only remainders are retained in `OWNER-CENSUS.json`; no zero/all claim over dynamic or external consumers follows from this census.

- [Observed] **Final body:** routes.ts `boundedResponse` measures `Buffer.byteLength(body, 'utf8')`, reads the named ceiling and returns either the complete body or the typed failure with exact evaluation, limit, declared/observed values, population and readiness false. The human helper bounds home, exact-source and surface handlers in their declared mount forms. The main `/api/poc` model and separate Polaris presentation envelope use the machine ceiling.
- [Observed] **Served breach/readiness:** boundedResponse -> ServedResponseRecorder.record -> withServedReadiness -> withServedResourceBreaches. The recorder is keyed by evaluation snapshot/asOf and stores count/latest metadata without body retention. Evaluated readiness is forced false with the existing resource-breach finding. `statusFor` exposes served counts/latest breach to the human status rendering. A zero count does not establish readiness true, and the retained PWB-022 judgment is unchanged.
- [Observed] **Identity:** core `responseIdentityPreimage` clones the complete model, removes only contentKey and 25 declared capture-time exclusions, then canonicalizes for SHA256. The complete exclusion population is retained; it removes workItems.capturedAt while retaining both proposed governedBy carriers. [Inferred] Serialization layout therefore reaches this owner when the projected wire model is hashed; preserving evaluation/semantic identities alone does not prove a stable response key. [Unknown] No production ETag/contentKey was computed in this task.
- [Observed] **Conditional cache:** main machineHandle computes the full answer and applies boundedResponse **before** If-None-Match. A non-200 failure returns before ETag/304 handling. A fitting answer receives the weak content key and private/no-cache metadata; a valid matching condition yields an empty 304. The generic server writes revalidation headers only when the handler supplies them. [Inferred] The threshold witness can alter whether this branch is reached; an unchanged cache policy is not untiedness evidence.
- [Observed] **Refusal:** generic server machine-credential admission precedes route.handle. Credential verification takes expected token and presented credential, not model facts or body bytes. Browser-origin checks likewise precede getModel. Complete CAP1-REQ-015 and RFC5-3 are retained as the actual governing admission/query limbs; a nearby server comment's CAP1-REQ-012 name is not used as authority. [Inferred] This is positive separation for the credential limb, not a whole-block unaffected judgment about the other coverage/query limbs.

[Inferred] **PWB-REQ-021 is another concrete derived consumer missed by the C3 reason.** Its full readiness limb says false for “any PWB-REQ-006 resource breach.” Current code carries the byte decision to that arm. C3's unaffected entry instead reasons from unchanged prompts/answers and quotes only the mandatory-prompt limb. Those observations do not settle the complete block's readiness dependency. This finding identifies a source-method edge, not a new semantic verdict and not a claim that the reference encoding makes any actual run ready.

[Observed] **PWB-REQ-020 has distinct machine-answer, derived-view/ceiling, membership and recoverability limbs**, not only the final projectShape parity multiset. C3 selected dispositions are retained unchanged in `C3-SELECTED-DISPOSITIONS.json`. [Inferred] The source return must assess those complete limbs against answer availability and derivability, rather than treating unchanged tuple membership as proof about every limb. [Unknown] This bounded corroboration does not establish a fresh whole-block classification or a complete consumer inventory for that requirement.

[Observed] POC-010/020/022/060, PWB-012 and the complete CAP1-015 block are retained to keep the scope distinctions checkable. RFC6-22 semantic equivalence does not remove PWB-006's separate final-byte oracle. [Unknown] No new classification of those other blocks or acceptance of a revised sweep is recorded here.

## Required next source decision

[Inferred] Before another candidate freeze, replace the semantics/constant/outcome shortcut with a **limb-by-limb consumption method**. For every occurrence in the existing 130-occurrence population, identify its owned scope and inputs, including final encoded representations and derived limit/readiness/identity/cache decisions. Retain each positive edge or a reason **plus the method proving untiedness**. Unsettled edges remain undecidable. Reassess the whole population under that method; these bounded results cannot be added to the old totals to manufacture a new complete sweep.

[Inferred] The source design must explicitly account for the proposed carrier at validation, response-identity preimage, final serialization/encoded-byte measurement, conditional-cache decisions and served-readiness projection. It must not silently add semantic normalization to an existing complete-body identity, invent canonical identities or assume an unchanged ETag for a changed preimage. Which lawful implementation seam realizes the declared behavior is later engineering; no implementation was performed here.

[Observed] This is a CC-REV-4 source return. It does not authorize a third prose-polishing semantic round, amend a bound spec, materialize permissions or infer a new owner choice. Runtime compatibility and a fresh confirmed impact method remain **Unknown**.

## Retention

[Observed] Cache: `/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/encoded-byte-impact-source/`. Exact source/fixture snapshots and hashes are in `FROZEN-INPUTS.json`; the scripts and both outputs are retained beside this report. `SHA256SUMS`/`INVENTORY.json` seal this own directory only, excluding those two inventory files themselves. Replays run only the measurement/parser scripts; no production or observed code is needed.
