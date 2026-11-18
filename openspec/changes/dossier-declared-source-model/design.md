# D10 F-1 design and acceptance contract

[Inferred] Working design, not adopted. Baseline frozen4e526b704f613310c866746cfffb73049f664158; implementation base will be main after PR823 lands. F-1 owner coordinator:codex-20261114-54ebc9f1. Independent scope diagnostic R-D10-F1-SCOPE-1-RAW.md incorporated; final spec/source review remains separate.

## Funnel decisions

- G0 baseline: existing operator-agent 033–036, launch 046–047, installed source-acquisition registry and screening policy; predecessor bytes remain historical. D10 FOLLOW-ON F-1 is the scope, installed VIS-4/SEC-2/SEC-3/SEC-5 the constraints. Parent integration still pending.
- G1 problem: a local-clone dossier run requires consent records and statements D10 has retired. Success is a bounded local run from declared repository/pin/provider and committed screening policy, with no consent, statement, registry-act or terminal-answer branch.
- G2 alignment: agent-decided specification/implementation under VIS-4; only declared provider receives content under SEC-2; unchanged secret and unclassifiable exclusions under SEC-5. Outside-sandbox execution remains owner-class under SEC-3. No observed-body read/provider call is needed to implement or verify this change.
- G3 placement: existing dossier orchestration, consent package policy-byte interface, core policy recognizers and affected disclosures. No new package, external service or dependency. Preserve provider-wrapper private refusal and leave generic historical readers to F-5.
- G4 design: declared local subject -> pinned Git-object verification -> committed policy parsing/screening -> brief/session binding -> checked packets/render/close. Stored declarations are Inferred; current rederived checks remain Observed. Failure names the missing real input or violated predicate, not retired consent.
- G5 specification: one coherent replacement version for 033/046 and acquisition entry, with explicit amendments to cross-references in 034–036 and retained 047 local pin semantics. Keep existing requirement IDs and predecessor provenance. URL acquisition/default selection is F-3; do not present its implementation as delivered. PR817 remains unadopted; its superseded ceremony package does not imply its independent feature outcomes were delivered.
- G6 engineering: strict bounded decoders, preserved object rehashing and resource bounds, isolated policy parsing, one shared run subject, no fabricated successful gate results, focused behavioral fixtures and independent final review. Retain required exact-head complete gate and queue evidence.

## Record and policy decisions

[Inferred] New runs write polaris-dossier-run/2. Its strict subject carries repository locator/identity, clone path, full pinned commit and pin provenance, declared visibility with attribution, committed screening-policy identity/digest, and absent scheduler work-item reason. Provider remains an explicit required run configuration value. No consentRecord/startGates/providerStatement is written.

[Inferred] Legacy /1 continuation is refused with a specific restart explanation. No silent conversion, mutation, consent revalidation or adoption is performed. Existing state directories/artifacts are retained. Read-only archival access is not promised by this delivery; ordinary file access remains available. Explicitly test legacy refusal, unknown formats, exact-key validation, byte/node/depth bounds and legacy URL normalization for supported /2 input. This deliberate compatibility break limits the chance of presenting historical consent as a current fact.

[Inferred] Screening loads committed policy bytes from this Syzygy checkout at a captured commit, validates them, and binds their digest in the run. A policy version/digest change within a run refuses until a new run is created. Missing/malformed policy or a changed byte between capture and application refuses. No owner-act traversal is used. A committed successor policy version updates consent-carrier prose to declared-source provenance while leaving detector/exclusion/rendering predicates unchanged. Its recognizers retain exact historical v8 recognition and accept only the separately pinned successor text, never arbitrary wording.

[Inferred] Visibility is an explicit attributed declaration, labelled Inferred. No host, transport, URL shape or credential-use inference. Missing visibility takes private treatment; malformed visibility refuses. Public uses the existing public effective-redaction rule. Private/unknown keeps whole-body exclusion on any detector match and suppresses excluded/withheld blob identifiers and sizes. No network request verifies visibility. This replaces authorization-carrier lookup, not the security distinction.

[Inferred] The new local entry pins the clone's checked-out full commit, or verifies an explicit full commit equals it; it does not choose a remote tip or fetch. Existing object-reader and clone-form security checks remain until F-3 addresses acquisition/shape. A reverify step reads only objects from the pinned commit through the independently rehashing reader; it does not move the pin to current HEAD. Subject/pin changes retire brief/review binding; provider/tool mismatches refuse.

[Inferred] Content-class eligibility comes from the screening policy, not a provider statement. An undefined class stays excluded. Every body and agent-authored artifact retains detector/active-content screening and context encoding. Session delivery checks declared provider/tool and exact packet bindings; a missing or changed declared provider refuses. A declared provider is not evidence of observed transmission.

[Inferred] Execution orchestration remains F-3. F-1 neither enables PERMITTING_ARM_ENABLED nor invokes any owner-choice command. Briefs must accurately state the current SEC-3 restriction and explain that no executable profile has been established by this run. A future sandbox choice may be agent-decided and recorded; outside-sandbox execution still requires the actual owner conditions. Neither a consent-free launch nor a declaration alone implies execution.

## Observable scenario matrix

| Case | WHEN | THEN |
|---|---|---|
| Local admission | A screened fixture clone, full HEAD, declared provider and bounded configuration are supplied with no consent/statement/act records | Init records /2 and succeeds without a terminal question or governance write |
| Governed subject | The same clone has openspec or governance paths | No drawer/provider statement is required; screening still applies |
| Private subject | Visibility is private or absent | Run is admitted under conservative private screening, with no public inference |
| Public declaration | Visibility is explicitly public | Declaration/provenance remains Inferred; public redaction behavior matches predecessor |
| Bad declaration | Visibility is another value or provider is absent | Refusal names the invalid declaration before content is used |
| Policy missing | Committed policy cannot be read or decoded | No content is admitted; reason is explicit in both channels |
| Policy changed | Current policy identity/digest differs from the run's binding | Later step refuses; it does not upgrade the running policy silently |
| Pin corrupted | An object does not rehash to the reached commit/tree/blob identifier | Existing typed refusal; no object content is used or rendered |
| Pin changed | Recorded pin/subject no longer matches the brief/packet binding | Step refuses or dependent verdict is retired, never reused |
| Provider changed | Run/session provider or tool differs from its bound declaration | Brief/delivery/check refuses without consulting a provider statement |
| Undefined class | Classification cannot assign an allowed class | Existing whole-artifact exclusion, no fabricated class grant |
| Secret in public | A line-redactable documentation fixture matches a detector | Matched/guard lines withheld exactly as predecessor; no secret bytes escape |
| Secret in private | The identical private fixture matches a detector | Whole body excluded; excluded/withheld digest and size suppressed |
| Unknown visibility | Visibility evidence is missing | It never obtains public partial-redaction or metadata treatment |
| Provider wrapper | The existing provider acquisition wrapper sees private input | Existing private refusal remains; dossier/provider differences are preserved |
| Session artifact | A documentation/governance artifact is policy-classified and screened | No retired consent-class gate withholds it; undefined/secret content stays excluded |
| Historical run | A command receives a /1 record | Clear legacy-format/restart refusal, original files unchanged |
| New format invalid | /2 has missing/extra keys, malformed URL, invalid bounds or unknown fields | Bounded strict decoder refuses without emitting untrusted locator secrets |
| New packet bytes | A frozen subject or packet changes | Previous verdict no longer counts for the changed digest |
| Execution | A consent-free run has no execution profile | Brief grants no execution; outside-sandbox owner conditions remain explicit |
| Disclosure | A /2 run renders or closes | It reports declared provider, pinned verification and policy binding, never consent verification that did not occur |
| F-3 boundary | URL supervisor remains on its old acquisition path | F-1 does not claim end-to-end URL delivery or close F-3/pdja.36 |

## Acceptance evidence to collect

1. Adoptable coherent spec/acquisition/policy delta with retained/retired obligation map, stable IDs and independent review; default-main adoption row and specification tag at actual landing.
2. Synthetic local-clone init through brief/check/inventory/review/render/close without retired records or terminal access; actual no-read/no-write probes for removed ceremony boundaries.
3. New/legacy record strictness and unchanged-file refusal matrix; provider/pin/policy drift invalidation.
4. Differential public/private/unknown visibility and every retained detector/class path; mutated-policy prose and per-predicate failure probes. No secret fixture values outside synthetic fixtures.
5. Existing independent object-integrity, budget, quotation, withheld-content and verdict-binding coverage remains effective; no copy-oracle expectations from implementation helpers.
6. Provider-wrapper private behavior and retained generic D10 fallback exercised independently; no new orchestration dependency cycle.
7. Scoped source/type checks and required full clean-clone gate on the reviewed final subject; hosted queue checks for the actual combined tree.
8. Honest completion partition: only F-1 closed; F-3/F-4/F-5/pdja.36/PR817 feature outcomes retained unless independently satisfied.

## Initial implementation interfaces

[Inferred] Add a narrow policy-snapshot port that returns committed policy bytes plus Syzygy commit/path/digest. The package GateSources factory supplies it from the actual Syzygy checkout; a missing port refuses the new run rather than invoking old act gates. Keep legacy GateSources methods/exported act readers alive for remaining F-3/F-5/provider-wrapper callers. This is transitional interface coexistence, not a fabricated gate success.

[Inferred] New RunSubject is the single source of declared repository/pin/visibility/policy facts. Avoid adding a new orchestration import into model/type leaves. Informational governed-path classification may remain, but its result never gates a provider statement or requires a drawer declaration. Class eligibility uses screening's known class; any unknown classification remains withheld. Session-context declarations are checked and attributed, while the proof of actual provider transmission remains Unknown.

[Inferred] Successor policy prose and reader pins must change together for retired consent and act provenance. Preserve exact historical v8 recognizers for fixtures/retained consumers. Policy changes confined to declaration/adoption provenance do not modify detector patterns, match actions, resource bounds, active-content conditions, private metadata suppression or the public/private effective-redaction decision. A scripted semantic JSON diff will enumerate every changed leaf and refuse unrelated security-rule changes.

## Final local binding

[Inferred] The policy is a separate dossier-only committed file, never a mutation of the PWB/provider policy. /2 binds repository, real clone, full commit, policy path/commit/id/version/SHA256, the three exact eligible artifact classes and attributed visibility. An unrelated Syzygy commit with identical policy bytes does not invalidate a run. A changed policy, brief pin or declared provider/tool refuses; a provider declaration is never observed transmission. Agent briefs explicitly preserve SEC-2/SEC-5 for their own reads and sends. /1 is refused without mutation rather than silently migrated.
