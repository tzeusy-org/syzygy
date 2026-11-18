# D10 F-1 independent policy and recognition review

Verdict: CONFIRM

[Inferred] The frozen successor preserves the predecessor's secret-screening predicates and the distinct public/private protections within this bounded policy/recognition review. Its changed admission, declaration and provider provenance is an ordinary agent-adoptable change under the supplied SEC-2, SEC-5 and VIS-4 clauses. I found no difference in the 19 changed policy leaves requiring a real owner secret/weakening decision. This is not adoption, approval of a run, or an overall source-readiness verdict.

## Subject and integrity binding

[Observed] Subject: D10 F-1 dossier-only screening policy successor and its recognition. Manifest baseCommit: `26b2ef360431ab71c02dcde47643665dc153b8c7`; manifest state: `uncommitted candidate, not adopted`. The manifest is the review's declaration of that base; repository state and commit reachability were not independently inspected.

[Observed] Frozen manifest: `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f1-policy-review-1/manifest.json`; SHA-256 `62c4ac1a3393a352b8bb45ee083b8196bd456d6dd122d1517b42eb134d633a6d`. Each of its six snapshots was read and its actual byte length and SHA-256 recomputed and matched against the manifest:

- `predecessor.json`: 55578 bytes; SHA-256 `44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8`; source `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`.
- `successor.json`: 51011 bytes; SHA-256 `516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499`; source `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json`.
- `source-visibility.ts`: 5660 bytes; SHA-256 `e676a7eedf036e5bc57006fa7eadff49ea72e7782d2b1b8b7ec4c26212f0436d`; source `packages/polaris-generation-core/src/source-visibility.ts`.
- `screen.ts`: 20276 bytes; SHA-256 `8f350e7ae37644602e7fe8e08703fe486a4a5d948628d5019cfce50f4cf91116`; source `packages/polaris-dossier/src/screen.ts`.
- `security.md`: 9313 bytes; SHA-256 `9d3f46528e37143ae1d63c755c7a50c6a5b139d28bef5c9de45d62b5c1ac71bf`; source `.syzygy/governance/doctrine/security.md`.
- `vision.md`: 19969 bytes; SHA-256 `fc222427c85c6ce39f02cb2b595b75fec23f6890c013d249f0b43baa52788bc3`; source `.syzygy/governance/doctrine/vision.md`.

[Observed] Inputs were limited to those six frozen snapshots, the manifest and the applicable heart-and-soul skill; the parent supplied the repository AGENTS instructions. No author conversation, other implementation drafts, owner-act bodies, external repository bodies, credential material, provider operation or actual consent command was read or used. Only this new raw review file was written. The evidence below describes the frozen bytes, not subsequent edits.

## Governing clauses and classification

[Observed] Exact defined SEC-2, security.md lines 49–53: "Portfolio data leaves owner-controlled infrastructure only for a declared provider. Secrets never leave. Repository content, or anything derived from it, is sent to a store or service the owner does not control only when that service is a provider declared for the run. No per-project or per-repository consent is needed." Its lines 61–63 add: "A provider not declared for the run receives nothing" and "content that matches the secret-detection policy, or cannot be classified, is never sent, whatever is declared."

[Observed] Exact defined SEC-5, security.md lines 146–155: "Secrets are never indexed. Anything that matches the declared secret-detection policy, or cannot be classified, is excluded; a matching exclusion is rendered." Its owner boundary is: "Weakening it is the owner's decision (VIS-4): a change that makes the policy detect less, admits unclassifiable content, or lets a secret be indexed, rendered or sent waits for the owner. Any other change to the screening or classification policy is an agent adoption." Lines 156–157 require "Matching content is excluded" and "Unclassifiable content is excluded too: classification fails closed."

[Observed] Exact defined VIS-4, vision.md: "The owner adopts doctrine and decides four classes of change; agents decide everything else, record it and report it, and the owner may veto any of it afterwards." Its Secrets class is "anything that would weaken secret detection or SEC-5's fail-closed rule, or let a secret be indexed, rendered or sent" (plus observed-code execution outside a sandbox). Its agent list explicitly includes "screening and classification policy within SEC-5" and "which repositories Syzygy reads and which provider receives their content (SEC-2)." The controlling lower-rule clause says: "A lower rule that asks for consent, a statement or a record before a repository is read, or before its content goes to a declared provider, needs nothing at all: not an adoption row, not a per-repository record."

[Inferred] Those clauses distinguish admission/provenance changes from secret weakening. Removing separate observation, registry, class, policy or provider-statement acts and replacing egress-consent provenance with a declared provider does not by itself weaken a detector, classify an unknown body, or allow a detected secret. The successor still needs the ordinary VIS-4 adoption process for the policy/specification change; no performed adoption or default-branch landing is established by these snapshots. The removal of the per-repository question itself is not a new owner gate or a substitute per-repository adoption requirement. Public visibility remains a declaration labelled Inferred, as before; changing its carrier to the exact run repository/commit is explicitly provenance, with private as the missing/ambiguous default. A future change that classifies an unmatched/unknown body by assertion, relaxes a detector or private protection, or grants a secret an egress exception would need a different analysis and may fall in the owner class; these bytes do not make such a change.

## Exhaustive policy comparison

[Observed] First method: flatten both parsed JSON documents to RFC-6901-style paths, preserving array indices and treating empty containers as terminal leaves, then compare the union. Second method: independently recurse over paired typed nodes, check all object key sets and array lengths and compare terminal values. Both methods found 406 terminal leaves in each policy and exactly 19 changed leaves; the path union is 406, with 387 unchanged, no added paths and no removed paths. The only empty container is the unchanged `/publicSourceScope/contentClassification/evidenceContentPaths` array. If "leaf" means scalar JSON values only, the denominator is 405, with the same 19 changed values and 386 unchanged scalar values, plus that unchanged empty-array guard. Appendix A enumerates every changed leaf with exact predecessor and successor values; it is generated from the frozen bytes rather than transcribed.

[Observed] Unchanged executable-policy input groups (terminal-leaf denominators): base `detectors` 17; base `sourceAdmission` 22 (including the denied basenames, prefixes, suffixes and scope); `activeContentClassification` 28; `matchAction` 8; `unclassifiableExclusion` 9; `redactionClasses` 5; `classificationOrder` 7; `classificationSuccess` 1. Unchanged scope groups: `contentClassification` 129; `scopeDetectors` 18; `activeContent` 36; `secretRedaction` 19; `detectors` 1; `targetMetadataRule` 10; `ingestBoundaryRule` 1; `ingestBoundaries` 4; `instructionTextRule` 7; `runProfileRule` 7; `selfReferenceRule` 1. Equality was checked directly on parsed subtrees as well as by the exhaustive leaf diff.

[Inferred] The 19 changes divide into policy version identity (Appendix 1), local admission/declaration/provider provenance and classification activation (Appendix 2–13), and the six visibility explanatory texts (Appendix 14–19). They preserve screening while replacing now-unnecessary authority ceremonies. Admission of project-documentation without a separate class act changes when its already-defined rule runs, not the rule's path grammar or its detector treatment: malformed or unknown class rules still refuse. No added path class, extension, placement, regex pattern, regex flag, literal secret fragment, withheld-line rule or active-content exemption appears in the diff.

## Screening and private/public protections

[Observed] The eight detectors (four base plus four scope), literal fragments, regular expressions, flags, every-offset redaction requirement, whole-artifact detector list, whole-artifact line/fragment guards, one-line guards and retained-text re-screen are unchanged policy values. The final-path denied-name/prefix/suffix lists are unchanged. Classification remains exactly-one-rule and fail-closed for indeterminate content; the extension list and repository/commit-bound placement input are unchanged. Strict UTF-8, NUL, parse/resource-failure exclusions remain in the unchanged inherited base rules. Activating project-documentation removes a classification-authority gate, not its classification predicate or its refusal on unreadable rules.

[Observed] Public partial redaction remains limited to `project-documentation` under `secretRedaction.appliesTo`; every other class is whole-body excluded on any detector match. Private bodies remain whole-body excluded for every class on any detector match. All active-content predicates, Markdown inert-context grammar, unsafe URL schemes, malformed-context exclusion, code/documentation exemptions and their render conditions are unchanged. Both exemption texts still require every secret detector and safe destination encoding; no new exemption is introduced.

[Observed] `contentClassification.rules[1].rule` still excludes the object id and size of every private excluded or withheld blob from code-structure, rendering and egress, on any exclusion ground. Its `indeterminate` counterpart is unchanged too. `sourceVisibility.privateSourceRules`, `consequence` and `rawBodyHandling.rule` restate those protections; none narrows them to detector matches only. Private identifiers and sizes may remain only in the permitted local check records and review packets. The unchanged `targetMetadataRule` carries no body, content digest, policy detail or excluded-source path and requires opaque excluded source identifiers. The declared-source text retains the known commit-id confirmation residual and imperfect-detector residual; it does not claim to close them.

[Observed] Frozen `screen.ts` applies the same input channels in its executable composition: denied rules are read from base `sourceAdmission` (lines 145–147, 176); classification and all exemption readers must succeed (148–166); base and scope detectors are combined (167–179); path screening runs denied-path, then secret detector, then known-class checks (181–185). Body screening checks detectors before the active-content predicate (210–211). Target body screening calls `redactBody` with `redactionFor(redaction, visibility)` over the complete body, rejects excluded secret results and still scans the original complete body for active content where no exemption applies (191–197). Agent text without a path receives no exemption (186–189). These source snapshots do not supply predecessor source; preservation of input predicates is established by the exhaustive policy equality and current source composition, not by an invented predecessor-code comparison.

[Observed] The build-time visibility default is private whenever either complete pinned visibility vocabulary is present: `given ?? (visibilityRead.declared ? 'private' : 'public')` (screen.ts 139–144). The production loader explicitly passes `subject?.visibility ?? 'private'` (222–228); absent visibility cannot select public there. A policy with no visibility vocabulary cannot admit a private screen (144). `screenLoaderOf` refuses a supplied screen whose policy hash or visibility differs from the run subject when those bindings are supplied (107–116), and the production loader separately refuses a policy hash mismatch (225–227). `placementSubjectOf` forwards the declared visibility and policy hash (119–126). No historical consent visibility carrier is consulted by this loader. Historical `pairVisibility` remains exported in the other snapshot but is neither imported nor called by `screen.ts`.

[Inferred] These are preserved private defaults and composition safeguards within the two provided source snapshots. The `given` argument is TypeScript-typed `SourceVisibility`; validation of external declarations happens outside these snapshots and was not assumed proven here. Optional direct builder/injected-loader arguments are not evidence of complete run-entry validation.

## Pinned vocabulary recognition

[Observed] `source-visibility.ts` lines 50–67 require exactly eight ordered keys, `values` and `admitted` exactly `[public, private]`, and six exact text hashes from one complete bank. The successor `rule` hash selects the successor bank; otherwise the historical bank must match in full. The historical bank additionally names the two pinned act paths. Both complete banks are intentionally recognized; absent `sourceVisibility` means public-only, not private admission. The function does not compare the outer policyVersion label or pin the whole policy; run digest binding is a separate screen-loader concern. This review's no-mixing conclusion concerns the six visibility texts, not a claim that arbitrary outer-policy hybrids are impossible.

[Observed] All 12 stored digest pins were recomputed independently from the six predecessor and six successor strings and matched. Each complete vocabulary also passed the frozen recognition function after only removing TypeScript syntax and substituting its `sha256` and `isRecord` leaf helpers with standard equivalent local definitions. Every one of the 64 choices of old/new text across the six fields was executed: only masks 0 (complete predecessor) and 63 (complete successor) passed; 62 mixed versions refused. A second independent Python hash-bank enumeration produced exactly the same two accepted masks. As counterexamples, 12 individual appended-space text mutations and eight shape/value mutations (two banks times reversed values, narrowed admission, extra key, reversed field order) all refused: 20 mutations over 20 attempted predicates. These are bounded recognition probes, not the project's source/test readiness suite. Absent visibility returned public-only; a null visibility object refused.

| Visibility text | Predecessor SHA-256 | Successor SHA-256 |
|---|---|---|
| `rule` | `711a354a18ccd9d11535a0c863df1476e35e3222899ac2ea2b6811c1ef8c4eea` | `63927dfe2369afeebbe79cd0f74acfb876febcad87f87fdde18c6cd9ffd8eade` |
| `privateSourceRules` | `d811d43797850343f99feb4b533b462ae4bbe51b468ff09e4eba21119b7ef6b8` | `c8137223612a5de18f625930e58326c3e4eef90e993cda360b458417eebafe7a` |
| `unchanged` | `aba6543f4bee4b829d12b1800d65ed6f5287bd50fdd84ebdf9ea4183592383b0` | `36f7a6826646cd19239956141833751c32660ab41b8c3b048d641f689aa585bd` |
| `agentSessions` | `03e92169bfabfa2836d3193f711a415d57d3eab34aa8a3cbba171e29c1e3c4d0` | `25be77db84eb54e9944dba3bb9ed488c385624b9e8ced6149867db821a62113d` |
| `consequence` | `736dcc8867a30c1017ff5ba3c0a91f65b4020ec245463348ad6ac5142120c23b` | `9b77a15373d15cfa6bbd14c01e4dca1cd6a2d098ba9b315f354527cf05b0f088` |
| `consentRecordMetadata` | `ea60ad52e8817300c9a4800283a4237afccbe61cc1f3463844e78697c13c004c` | `4e7baf6e615604d2a6958f59af07e7c454ab9474deb5f2e90f36bdc0d9b1aa84` |

## Findings and limits

[Inferred] No blocking policy or recognition finding within the stated scope. CONFIRM means the frozen changes retain the relevant policy predicates and the shown private defaults under the supplied doctrine; it does not mean adopted, released, operationally verified or universally free of secrets.

[Observed] The successor leaves lower policy prose referring to historical consent acts or records (for example the unchanged governance-text rule, owner-placement prose and classificationBasis). VIS-4's quoted lower-rule clause controls their old admission/egress authority meaning; they do not create a new owner question or relax a secret rule. Some source comments also retain historical version/act descriptions. These historical terms should not be used as evidence that a new consent ceremony is necessary.

[Unknown] The implementation of imported secret/classification/redaction/active-content helpers, rendering/egress suppression of private identifiers and sizes, `readCommittedPolicy`'s worktree/HEAD drift checks, external visibility parsing and whole-source readiness were not supplied and were not independently checked. `screen.ts` exposes visibility and invokes the relevant helpers; it does not itself implement every protection. No claim of end-to-end metadata suppression, production declaration validation, finite reader-bound enforcement or actual provider-transmission compliance follows from these snapshots. The policy's strengthened agent-session text honestly treats agent tool transmissions/compliance as unobserved; a provider declaration is not observed delivery. This bounded review is not a substitute for separate source readiness, test review or execution, and does not require those unrelated gates to be invented as owner decisions.

## Appendix A: exhaustive JSON terminal-leaf differences

[Observed] Exact values below use JSON string notation. All paths exist in both frozen policies. Numbering is lexical JSON-pointer order and covers every one of the 19 changed terminal leaves out of the 406-path union.

### 1. `/policyVersion`

Predecessor:

```json
"1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv"
```

Successor:

```json
"dossier-declared-source/1.0.0"
```

### 2. `/publicSourceScope/accessBoundary/networkEgressRoutes/0`

Predecessor:

```json
"the shallow by-commit fetch from the target's upstream that the observation consent describes, for a repository whose visibility is public (sourceVisibility) only; for a private repository Syzygy fetches nothing, reads only Git objects already present in a clone the operator holds, and holds, reads, requests and uses no credential for the repository's host"
```

Successor:

```json
"no network acquisition in the declared local-clone entry; private sources use no repository-host credential"
```

### 3. `/publicSourceScope/accessBoundary/networkEgressRoutes/1`

Predecessor:

```json
"the registered provider route through the single egress check"
```

Successor:

```json
"classified and screened content only to the declared provider under SEC-2; no secrets"
```

### 4. `/publicSourceScope/authorizationModes/0`

Predecessor:

```json
"owner-trusted-bootstrap"
```

Successor:

```json
"declared-source"
```

### 5. `/publicSourceScope/inheritedRules`

Predecessor:

```json
"every other rule in this policy applies to this scope unchanged: detectors, matchAction and redactionClasses (except that secretRedaction retains a body of an admitted snapshot as redacted-span where its rule says so, and for such a body reads the detector condition of classificationSuccess as no detector matching its retained text), unclassifiableExclusion, activeContentClassification (except that, for a body activeContent.codeContentExemption or activeContent.projectDocumentationExemption exempts, its active-content forms are not scanned for and malformedContextAction does not apply; its renderRule binds every body) and the strict-UTF-8 and NUL rules. 'Every other rule' means the policy's rules outside any named scope object; the rules inside the base scope object, and inside any sibling scope object another act adds, do not govern this scope, and the other way round: the routes, boundaries, rawBodyHandling and rules written inside this object govern only the repositories in observedRepositories and never the base scope or a sibling scope. The base classificationOrder and classificationSuccess name the signed PWB grammar; under this scope they read: membership in the admitted snapshot replaces membership in a PWB phase, and the content-classification rules above replace the PWB closed extraction class, so a blob with no class under those rules has an unknown extraction class and is excluded whole (step 6), while a code-content body needs no extractor and is admitted as whole-blob spans. No approved requirement names this reading, so it is this policy's own and binds only through the act that approves it"
```

Successor:

```json
"every other rule in this policy applies to this scope unchanged: detectors, matchAction and redactionClasses (except that secretRedaction retains a body of an admitted snapshot as redacted-span where its rule says so, and for such a body reads the detector condition of classificationSuccess as no detector matching its retained text), unclassifiableExclusion, activeContentClassification (except that, for a body activeContent.codeContentExemption or activeContent.projectDocumentationExemption exempts, its active-content forms are not scanned for and malformedContextAction does not apply; its renderRule binds every body) and the strict-UTF-8 and NUL rules. 'Every other rule' means the policy's rules outside any named scope object; the rules inside the base scope object, and inside any sibling scope object another act adds, do not govern this scope, and the other way round: the routes, boundaries, rawBodyHandling and rules written inside this object govern only the repositories in observedRepositories and never the base scope or a sibling scope. The base classificationOrder and classificationSuccess name the signed PWB grammar; under this scope they read: membership in the admitted snapshot replaces membership in a PWB phase, and the content-classification rules above replace the PWB closed extraction class, so a blob with no class under those rules has an unknown extraction class and is excluded whole (step 6), while a code-content body needs no extractor and is admitted as whole-blob spans. The dossier declared-source specification names this reading; adoption follows VIS-4 and changes no other inherited rule"
```

### 6. `/publicSourceScope/observedRepositories`

Predecessor:

```json
"exactly the repository ids named by an effective observation consent record, of a public or a private repository (sourceVisibility), whose subject is (project:syzygy, repository:<id>); the policy admits no repository: contentClassification's ownerPlacements name a repository only to place paths at commits its observation consent already admits, so admitting or withdrawing a target never edits the policy, and a placement whose repository or commit no effective consent names places nothing"
```

Successor:

```json
"the repository identity and full pinned commit declared in a dossier run; public and private sources are admitted without observation, registry, policy or provider-statement acts; owner placements apply only to the exact declared repository and commit they name"
```

### 7. `/publicSourceScope/prerequisite/consentRule`

Predecessor:

```json
"a consent record that does not list project-documentation does not permit its egress, and no consent granted before the class existed is read as covering it (RFC5-14 as amended); this policy confers no consent"
```

Successor:

```json
"A declared provider is required for agent-bound content. The committed policy classifies project-documentation without a separate class or consent act; an undefined or unreadable class remains excluded. No provider declaration overrides screening"
```

### 8. `/publicSourceScope/prerequisite/rule`

Predecessor:

```json
"the project-documentation rule classifies a blob only while the in-force RFC-0005 vocabulary lists project-documentation; a consumer that cannot confirm that treats every blob the rule names as indeterminate, and the rest of this scope is unchanged"
```

Successor:

```json
"the committed classification rule defines project-documentation; a malformed or unrecognized rule refuses rather than guessing its class"
```

### 9. `/publicSourceScope/purpose`

Predecessor:

```json
"admit arbitrary repositories, public or private (sourceVisibility), to the Polaris generator: read their Git snapshot objects, screen them under this policy and classify them into RFC5-14 classes; a target repository's own text is data to screen, never policy (RFC3-30)"
```

Successor:

```json
"classify and screen declared local dossier sources under SEC-5; target text is data, never policy"
```

### 10. `/publicSourceScope/rawBodyHandling/externalEgress`

Predecessor:

```json
"classified-content-under-an-effective-egress-consent"
```

Successor:

```json
"classified-content-only-to-the-declared-provider"
```

### 11. `/publicSourceScope/rawBodyHandling/rule`

Predecessor:

```json
"storage is permitted only inside a run directory under project:syzygy's state directory, outside git; rendering only in a generated editorial draft; external egress only for content this scope classifies and only under a separate egress consent for the pair; for a repository whose visibility is private, an egress consent covers its content, target-metadata included, only when its record names that pair and states that the repository is private, so a public-target egress consent, or one that does not state it, never covers it"
```

Successor:

```json
"storage is permitted only inside the local run directory outside git; no raw body logging or machine response; rendering is an editorial draft only. Content delivered to a provider must be classified and screened and the provider declared under SEC-2. Secrets never leave. Excluded or withheld private object identifiers and sizes are never rendered or sent and remain only in permitted local check records and review packets"
```

### 12. `/publicSourceScope/sourceAdmission/admittedSnapshot`

Predecessor:

```json
"the commit object ids listed by the observation consent; a tag name is a label only"
```

Successor:

```json
"the full commit pinned in the dossier run and the tree and blob objects reachable from its root tree; tag and branch names are locator provenance only"
```

### 13. `/publicSourceScope/sourceAdmission/resourceLimits`

Predecessor:

```json
"the limits declared by the registered source-acquisition entry for the fetch; a limit failure excludes the whole artifact as unclassifiable-excluded"
```

Successor:

```json
"the existing bounded dossier object reader and declared finite run limits; removing a registry act changes no configured bound or breach result"
```

### 14. `/publicSourceScope/sourceVisibility/agentSessions`

Predecessor:

```json
"[Observed] REQ-polaris-generation-033 says that neither the content classes a per-project statement names nor the observing project's classification and screening policies bind the operator-agent mode's agent sessions' own reads or sends: the agent reads the clone without restriction, and content those policies would exclude, secrets included, may reach the agent's provider. This policy binds what Syzygy reads, stores, renders and sends; it cannot keep a private repository's content, or a secret in it, from the agent's provider. Whether a private subject that REQ-polaris-generation-033 calls non-governed needs a per-project statement before a brief is issued is the specification's to decide, not this policy's"
```

Successor:

```json
"SEC-2 and SEC-5 bind agents as well as Syzygy: only the declared provider may receive content, and secrets never leave. Briefs require agents to preserve screening and exclusion rules in their own reads and sends. Syzygy screens the content it reads, stores, renders and delivers; it cannot observe or attest an agent tool own transmissions or compliance, which are never presented as Observed"
```

### 15. `/publicSourceScope/sourceVisibility/consentRecordMetadata`

Predecessor:

```json
"[Inferred] a launch consent record carries the repository's declared identity and normalised URL and is committed into the observing project's own governance repository, on a dedicated reference Syzygy never pushes (REQ-polaris-generation-046); for a private repository that makes its name, host path and commit ids tracked objects of Syzygy's repository, one push by the operator from its remote. This scope does not govern those records and cannot change it; the specification does"
```

Successor:

```json
"No launch consent record, dedicated recording reference or governance write is made for source admission. Repository identity, normalized locator, visibility and pinned revision are stored as Inferred run declarations in the local state directory, within the agent sessions write reach; they are not authorization records"
```

### 16. `/publicSourceScope/sourceVisibility/consequence`

Predecessor:

```json
"[Inferred] a run on a repository whose record does not state public is no longer refused for want of a policy admitting it, and runs under the stricter rules above: its project-documentation bodies with a detector match are withheld whole where a public repository's keep every line outside the withheld ones, so its dossier can withhold more files and render more Unknown; Syzygy reads it only from a clone the operator already holds; and no request Syzygy makes carries its content until an egress consent stating it private is in force. The reason for the redaction rule: a retained redacted-span body shows every line but the withheld ones, and the whole body's content digest and Git object id stay recorded (RFC5-17), so a guess at a short withheld line can be confirmed against them offline; for a public repository the body is published already and this adds nothing, for a private one it would. Whole exclusion does not close the guess either: the content digest, and the Git object id, which is itself a digest of the whole body, are a confirmation oracle wherever a guesser knows the rest of the body (a private fork of a public upstream whose file differs by one secret line, a template, earlier public history), and the size narrows the secret's length. For a public repository the object id and size are code-structure, rendered on the dossier's pages and carried by an egress consent that lists code-structure. For a private repository this version withholds them for every blob excluded or withheld on any ground, a denied path, an indeterminate blob and a detector match among them: they are kept, if at all, only in the run directory's check records and its local review packets, and are never rendered or sent. What is left: the run directory itself and the operator's clone, which holds every object id, so whoever can read either can still confirm a guess; the pinned commit id, rendered on every discovery row and recorded in the launch record, which is a digest of the commit header and the root tree and so of every object id in it, the withheld blob's included, a narrower confirmation oracle open only to a guesser who also knows the commit header (its author, dates, message and parent) and the rest of the tree, and one this scope cannot withhold; and a secret no detector matches in a body this scope admits, which is admitted and rendered under either visibility (SEC-5's general residual, unchanged here). A pair that a private fork's record joins, or that holds a record stating nothing or unreadable, becomes private, so its public upstream's runs get the stricter rules too, its public-target egress consent among them. Launch consent records lie within the agent sessions' write reach, so one malformed or unreadable file written there refuses every read under this scope, every public repository's included, until it is read or revoked: a cost to availability, never to exposure"
```

Successor:

```json
"A private or undeclared-visibility local source is admitted with stricter whole-body exclusion and private withheld metadata protection; it may therefore yield more Unknown items. No provider transmission is observed merely because a provider is declared. The reason for the redaction rule: a retained redacted-span body shows every line but the withheld ones, and the whole body's content digest and Git object id stay recorded (RFC5-17), so a guess at a short withheld line can be confirmed against them offline; for a public repository the body is published already and this adds nothing, for a private one it would. Whole exclusion does not close the guess either: the content digest, and the Git object id, which is itself a digest of the whole body, are a confirmation oracle wherever a guesser knows the rest of the body (a private fork of a public upstream whose file differs by one secret line, a template, earlier public history), and the size narrows the secret's length. For a public repository the object id and size are code-structure, rendered on the dossier's pages and eligible as classified content for the declared provider. For a private repository this version withholds them for every blob excluded or withheld on any ground, a denied path, an indeterminate blob and a detector match among them: they are kept, if at all, only in the run directory's check records and its local review packets, and are never rendered or sent. What is left: the run directory itself and the operator's clone, which holds every object id, so whoever can read either can still confirm a guess; the pinned commit id, rendered on every discovery row and recorded in the run record, which is a digest of the commit header and the root tree and so of every object id in it, the withheld blob's included, a narrower confirmation oracle open only to a guesser who also knows the commit header (its author, dates, message and parent) and the rest of the tree, and one this scope cannot withhold; and a secret no detector matches in a body this scope admits, which is admitted and rendered under either visibility (SEC-5's general residual, unchanged here)."
```

### 17. `/publicSourceScope/sourceVisibility/privateSourceRules`

Predecessor:

```json
"a private repository is admitted under the same observation consent as a public one, and every rule of this scope applies to it as to a public one, except at four sites, each stricter: accessBoundary.networkEgressRoutes (Syzygy fetches nothing and uses no credential for the repository's host); secretRedaction.appliesTo (no body is retained as redacted-span: a detector match excludes the whole body in every class); rawBodyHandling.rule (an egress consent covers the repository's content only when its record names the pair and states that the repository is private); and contentClassification's code-structure rule, which indeterminate follows (the object id and size of a blob excluded or withheld on any ground are not code-structure, are never rendered and never leave the run directory). No rule of this scope is relaxed for a private repository. No rule for a public repository changes, except in two ways, both fail closed: a public repository reads private while any other effective record of its pair states private, states nothing or cannot be read, and a file that could be a record of any pair (its kind, effectiveness or pair unread) refuses every read under this scope, public repositories included"
```

Successor:

```json
"a private repository is admitted as a declared local source under the same rules as a public one, except at three stricter sites: accessBoundary.networkEgressRoutes (no repository fetch and no host credential); secretRedaction.appliesTo (no redacted-span body: any detector match excludes the whole body in every class); and contentClassification code-structure and indeterminate rules (an excluded or withheld blob object id and size are never rendered or sent and remain only in permitted local check records and review packets). No detector, exclusion or private metadata rule is relaxed. A declared provider is required for content delivery under SEC-2; no separate egress consent is required"
```

### 18. `/publicSourceScope/sourceVisibility/rule`

Predecessor:

```json
"visibility is decided for each commit Syzygy reads, from the effective observation consent record that admits that commit (the record of that pair naming that revision), and it is public only when that record states public through its carrier and every other effective observation consent record of the same pair states public through its carrier too; in every other case, including a record that states private, states nothing, or cannot be read, the repository is private for every rule of this scope at every commit. A fork or mirror that a record places in an upstream's pair is part of that pair, so its record stating private makes the whole pair private. The carriers, and the only ones: for a launch consent record, the operator's declaration whether the repository is public that REQ-polaris-generation-046 requires the record to carry, which states public only when it is the affirmative answer, read by the generic launch form as one of exactly two values; for a record made by the owner act recorded at .syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md or at .syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md, and by no other act, that act's form itself, which states public; a further act states public by its form only when a later version of this policy names it, never because a code list of act forms grows. No other text of a record, its title or prose included, is a carrier. Every file at a location where observation consent records are read counts as a possible one: for launch consent records, every file that a recording commit on the dedicated reference added at the launch records' location (a recording commit adds new files only), a drawer or provider statement included, and no file the reference holds that no recording commit added; for the act forms, each act file named above. Any such file not shown to be revoked or superseded whose kind cannot be read, or that reads as an observation consent record whose effectiveness or pair cannot be read, including one that cannot be read at all, could be a record of any pair, so while one exists every read under this scope is refused, with that file named, until it is read or revoked; this scope does not instead ignore it, guess its kind or pair or turn every pair private. The statement is the operator's or the owner's declaration and is labelled Inferred wherever it is shown: Syzygy makes no network request and uses no credential to learn or verify it. admitted lists the visibilities this scope admits; a repository of a visibility it does not list is not in observedRepositories"
```

Successor:

```json
"visibility is declared for the exact repository and pinned commit in the dossier run, with its source attributed and labelled Inferred. Only an explicit public declaration gets public treatment. Private, missing or ambiguous declarations get private treatment; malformed declarations refuse. Syzygy makes no network request and uses no credential to verify visibility, and never infers it from a host, scheme, user name or credential use. No consent or act record supplies or overrides this declaration"
```

### 19. `/publicSourceScope/sourceVisibility/unchanged`

Predecessor:

```json
"every detector and scopeDetectors, matchAction, unclassifiableExclusion, sourceAdmission and its denied paths, contentClassification and its owner placements (except the code-structure rule and indeterminate's last sentence, above), instructionTextRule, targetMetadataRule, runProfileRule, activeContent and both of its exemptions, ingestBoundaries and ingestBoundaryRule, rawBodyHandling's storage (run-directory-only), logging (never), rendering (a generated editorial draft, never published) and machineResponse (never), inheritedRules, selfReferenceRule and prerequisite apply to a private repository exactly as to a public one. This scope states no retention period for a run directory under either visibility, and this version adds none. This policy confers no consent"
```

Successor:

```json
"every detector and scopeDetectors, matchAction, unclassifiableExclusion, sourceAdmission and its denied paths, contentClassification and its owner placements (except the code-structure rule and indeterminate's last sentence, above), instructionTextRule, targetMetadataRule, runProfileRule, activeContent and both of its exemptions, ingestBoundaries and ingestBoundaryRule, rawBodyHandling's storage (run-directory-only), logging (never), rendering (a generated editorial draft, never published) and machineResponse (never), inheritedRules, selfReferenceRule and prerequisite apply to a private repository exactly as to a public one. This scope states no retention period for a run directory under either visibility, and this version adds none. This policy declares screening rules, never observed provider transmission"
```

