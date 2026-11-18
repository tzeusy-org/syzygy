# Independent specification review — dossier-declared-source-model 2.0, round 3

VERDICT: REVISE

[Observed] Subject: the frozen 37-input packet `d10-f1-spec-review-3/manifest.json`, SHA256 `9953ae7c0ce0f08a57cab73a0043a641ff0e96ccb8127121227432ccb8df4487`. The candidate remains unadopted. This report judges specification text and its coverage claims; it records no implementation PASS, adoption, effective N/A judgment, source-read permission or provider operation.

[Inferred] A fresh engineer can restate the capability: generate a checked, independently reviewed, static editorial dossier from a supplied pinned local clone, using a declared tool/provider and committed screening policy, without the retired read/egress consent and statement ceremonies. The command retains read-only object verification, exclusions, private metadata protection, finite bounds, evidence/provenance distinctions and packet invalidation. URL acquisition/copy and clone-shape changes, new execution orchestration, the reader build-identity correction and generic machinery retirement remain outside this change.

## Review boundary and governing reading

[Observed] I used the packet's current `vision.md` and `security.md`, including D10's VIS-4 lower-rules sentence and current SEC-2/3/5, rather than the older summaries in the heart-and-soul skill or lower predecessor gates. The heart-and-soul and engineering-bar skill instructions were read as requested. No live implementation, tracker, previous raw review or repository body outside the allowed skill files and frozen subject was inspected. Only this new scratch report was written.

[Observed] Review covered the five complete candidate requirement sections, semantic delta, design/proposal/tasks, all three coverage records and warrant union; the 22 supplied contract definitions; the actual doctrine/specification/review policies; supplied product directions and reader descriptor; the complete predecessor 033/046 normative sections, the retained 034–036 sections and their declared replacement fragments, and material parent requirement bodies. The two predecessor scenario populations were independently enumerated over their full texts. Unchanged parent sections were read for scope and retained obligations; unrelated kernel/live/provider obligations were not treated as delivered local behavior merely because a parent text contains them.

[Inferred] There are three required corrections below. None calls for reinstating a consent/adoption-record admission gate for reading a repository or sending content to a declared provider.

## Required corrections

### F1 — The permitted-script scenario still has a retired, now undefined act condition

[Observed] Candidate `openspec/changes/dossier-declared-source-model/specs/polaris-generation/spec.md:174` replaces script admission with the recognized bound committed-policy renderCondition and explicitly says “without an owner-act gate.” However, the scenario “Permitted script adds behaviour only” at lines 265–268 still begins: “WHEN such an act is in force and a page carries a script that scope describes.” In the new preceding scenario at lines 260–263 there is no act to which “such an act” refers. `SCENARIO-COVERAGE.json` treats this predecessor scenario as retained; the semantic-delta replacement lists do not replace that condition.

[Inferred] This is an operative scenario with a dangling retired prerequisite, not a historical quotation. It leaves the script-on/off behavior specified by reference to the old screening act while the normative body has deliberately replaced that condition. It can misdirect the scenario fixture and a fresh implementer back to an act-conditioned branch. I do not claim that a runtime act gate exists; no implementation was examined.

[Observed] Governing basis: VIS-4, frozen `vision.md:206–212`, says a lower rule requiring a record before a repository read or declared-provider send “needs nothing at all”; the candidate's own declared semantic delta at `SEMANTIC-DELTA.md:9` and `:94–119` retires the screening-act prerequisite. CC-SPEC-1 and CC-SPEC-4 require a clear, producible condition and observable oracle; the undefined antecedent does not supply that condition for the new policy model.

[Inferred] Required repair: make this scenario's WHEN refer to the recognized, exactly bound committed-policy condition, add that exact fragment replacement to the semantic delta, and update the scenario disposition accordingly. Preserve its script-on/off equality/navigation consequence. A suitable independent case selects an allowed script with a recognized policy and no screening-act record, then compares the carried text/claims/markings/links and navigation with scripts on and off. It must not need a retired act to reach that case.

### F2 — Material VIS-7 warrants are still absent from the requirement declarations

[Observed] The complete doctrine lists for 033 (`spec.md:91`) and 034 (`spec.md:365`) omit VIS-7. The generated union (`GOVERNING-DEPENDENCIES.json:4–14`) therefore omits it too. This is not a union-generation error: I independently regenerated the six-class union and it matches the supplied file.

[Observed] These requirements directly serve VIS-7. In particular, 033 requires rederived object integrity, quotations, checks and packet bindings (`spec.md:11`, `:21`, `:27`), and 034 requires an anchor with recomputed integrity identity and pinned target state, faithful human/machine distinctions, a precisely prescribed legend and keyboard/nonvisual recovery (`spec.md:164`, `:172`, `:239–244`, `:358–360`). Frozen `vision.md:288–303`, VIS-7, requires a trustworthy observatory and names deterministic observation, resolving identified targets, faithful legends and absence of secret material. The retained parent presentation requirement is itself sourced to VIS-7 (`polaris-manifesto-understanding-amendment/.../spec.md:362–368`). The corresponding RFC7-34 definition also explicitly grounds faithful legends in VIS-7 (`defined-contract-clauses.md:899–905`).

[Inferred] This is precisely CC-SPEC-2's all-material-warrants rule, not a demand to copy every ancestor identity indiscriminately: the requirement is materially implementing these doctrine obligations, and citing a more specific contract or parent requirement does not excuse hiding the governing doctrine. CC-SPEC-2 states “none may be hidden merely because another is more specific” (`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md:100–105`).

[Inferred] Required repair: add VIS-7 to the per-requirement declarations where these directly governed obligations are specified, review the other requirement declarations against their actual retained consequences using the same materiality rule, and regenerate the union from the corrected declarations. A mechanically exact union of incomplete declarations does not demonstrate CC-SPEC-2 completeness.

### F3 — Several RFC3-16 coverage rows are not grounded in the requirements they name

[Observed] `CONTRACT-COVERAGE.json:122` claims that 033 and 046 cover “Default-branch agent adoption identifies commit/change/reason/revert and effective status is distinct from candidate banner.” The row at `:131` claims they cover new adoption after semantic edits, and `:158` claims they cover the candidate and applicability judgment remaining unadopted until an adoption row exists. All three are labeled “covered in candidate requirement set.”

[Observed] The complete 033 and 046 bodies do not specify those change-adoption/status consequences. 046 (`spec.md:101–105`) specifies locator/identity declaration, initialization, state separation and disclosures. 033's closest text is the snapshot-input mapping of “effective descriptor/policy adoption provenance” (`spec.md:47`), which does not state those candidate/specification/judgment lifecycle requirements, their status rendering, or who adopted. `proposal.md:3` and the applicability judgment `:3` do state the candidate/adoption boundary correctly, but they are not the named requirements that the matrix says satisfy it.

[Observed] RFC3-16's supplied definition explicitly requires effective status to be read from the adoption record and distinguished from a content stamp (`defined-contract-clauses.md:187–214`); later edits are governed by a new adoption (`:204–206`). Its effect rule keeps an artifact without adoption unadopted, and its diagram requires who adopted to be rendered (`:211–214`, `:324–327`, `:351–356`). CC-SPEC-8 requires coverage by requirements per observable consequence (`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md:274–293`). A citation in a warrant list is not a requirement stating the mapped consequence.

[Inferred] The surrounding candidate/adoption prose is honest, so this is not a finding that an N/A waiver is already effective or that the author adopted the candidate. It is a narrower coverage-proof defect: the matrix counts process/adoption consequences as requirement-covered without the actual named requirement stating them. The 133 covered-row total consequently cannot be independently confirmed as published.

[Inferred] Required repair: ground these rows in actual normative requirements, or accurately delimit and account for their process-level applicability and adoption handling rather than counting them as implemented by 033/046. Recheck the matrix's other edges by the same rule. Keep the distinction between adoption of a specification/policy/judgment and repository-read admission: do not fix this by adding an act-chain, per-repository record, or statement gate to the local command. Where status/provenance is emitted, make the exact applicable rendering consequences explicit; where an entity or transition is outside the static capability, use the proper separately unresolved applicability treatment.

## Independently confirmed portions

[Observed] Integrity: Python `hashlib.sha256` plus byte lengths verified the manifest's 37 inputs; an independent `sha256sum` plus filesystem-size pass verified the same 37 named inputs. The manifest itself matches the supplied SHA256. No mismatch was found in those two complete named-input passes.

[Observed] Retained 034–036 text: I parsed each predecessor requirement section, applied every JSON old/new fragment in `SEMANTIC-DELTA.md` to the designated section (and the additional general replacements), and compared the entire candidate body through its scenario/form/oracle/falsifier section, excluding only its updated YAML warrants and surrounding whitespace. All three comparisons are byte-equal. Thus the quoted delta truthfully describes those replacements; F1 is a retained defect in that declared replacement set, not evidence of an undeclared body edit.

[Observed] Predecessor scenario census: a requirement-section regular-expression parser and a separate line/state-machine parser independently recover 135 scenario identities across the two predecessor specifications. Each matches `SCENARIO-COVERAGE.json` by source path, owning requirement and full scenario heading, with no missing or extra tuple. The map has 73 retained, 24 F-3 acquisition, 19 retired admission/record-ceremony, 12 replaced-admission, three F-3 execution-arm, and one each of metadata allowance, policy binding, declaration binding and normalization-disclosure dispositions. These are scenario-accounting results, not proof that each disposition is semantically correct or implemented.

[Observed] Contract/capability accounting: the contract matrix has 137 rows spanning all 22 supplied definitions, with 133 marked candidate-covered and four separately unresolved candidate N/A rows. The capability table has 39 unique obligation identities, partitioned into 32 candidate-covered and seven explicitly out-of-scope obligations. Both figures were recomputed from the data, not accepted as completeness targets. The six warrant-class union has 9 doctrine, 22 contract, 4 policy, 16 decision, 0 topology and 18 parent-requirement identities, exactly matching the supplied generated record. F2 and F3 explain why those counts are not semantic completeness evidence.

[Inferred] Against the stated static scope I independently recover the capability partition's principal obligations: local locator/identity and real read location; fixed full pin; read-only verified objects; state separation; strict new records and nonmutating /1 restart refusal; exact committed policy binding and conservative visibility; declared provider/classes and unobserved transmissions; classification/screening/exclusions/private metadata; finite limits and Unknown usage; principal/unattributed work/no credentials; no new execution; conditional retained safety disclosures; brief/schema/understanding; quotations and inert accessible rendering; independent inventory/full-packet review/session handover; discovery/clarification; disclosures, close record and reader descriptor. The seven out-of-scope categories correspond to the proposal's F-3/F-4/F-5 and three named non-goals. I found no additional concrete capability-population omission in that bounded comparison. This confirmation does not cure the separate governing-warrant and contract-edge findings.

[Inferred] The new 033/046 text preserves the material nonretired finite-limit, Inferred-history, rederived-evidence, principal/unattributed-work, no-provider-dispatch, per-page/appendix, locator-normalization/collision and configuration-write-reach obligations reviewed here. The new record boundary explicitly refuses /1 continuation with restart guidance and preserves files (`spec.md:25`, `:70–73`; proposal `:11`). Fixed pin/policy/provider mismatches remain real predicates; retired consent, statement and act absence do not become fabricated successful checks.

[Inferred] Candidate requirements expressly preserve SEC-5 exclusions, private whole-body matching and private metadata suppression; the agent's own reads/sends are bound to SEC-2/5 and actual compliance remains unobserved. F-1 grants no execution instruction: `spec.md:17` and `:33` preserve the no-execution arm, while future sandbox/outside-sandbox choices remain separately governed by current SEC-3. I identify no secret-weakening or execution-activation permission in this specification text.

[Inferred] The five requirements name producible controlled fixture cases, observable artifacts/process captures, independent literal/byte-based oracles and falsifiers. The new policy-capture cases include writerless FIFO/symlink refusal, bounded UTF-8/JSON and unchanged-policy/different-commit behavior. The retained 034–036 oracle bodies remain complete. These are reviewable test obligations, not evidence that any fixture or implementation check ran here.

[Observed] All four candidate N/A consequences remain explicitly unresolved: rolling last-good observer fallback, kernel challenge/overlay lifecycle, curated adoption/freezing machinery, and live endpoint/drawer/band transitions. Their exact candidate judgment home is supplied, it says it binds nothing before actual adoption, and the matrix calls them unresolved. I treat them as unresolved engineering prerequisites to effective N/A, not as already discharged clauses or a present waiver. Their scope arguments are plausible for the static capability; actual adoption remains Unknown in this frozen review.

## Evidence limits

[Unknown] No implementation behavior, source/provider run, actual policy leaf-diff result, hosted check, clean-clone battery, actual default-branch landing, version tag or adoption row was independently observed. The packet's references to a policy review and a 406-leaf security delta are assertions/evidence pointers; those underlying review/diff artifacts and the successor policy bytes are not among these 37 inputs, so this review does not independently confirm that leaf-diff claim. No real source or provider operation was performed.

[Observed] All file/line references above are relative to the frozen snapshot root. They name the reviewed bytes, not mutable live repository paths. The following manifest-derived inventory identifies every reviewed packet input; integrity checks were performed independently before generating this report.

## Frozen input inventory

| Input | Bytes | SHA256 |
|---|---:|---|
| `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` | 23156 | `98342d0a85e9cdb3bf80567bf37c8ddc1845901066500bb5a9bcc12323200857` |
| `.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md` | 2504 | `a698de216484ee2f221988142e70de3b661c9fb095b0e3eb3cf10390517588d1` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md` | 10220 | `c52d712046011399a4fa18de3a0570ab51cacc7e2db4d6ee99fa246b30073d8c` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md` | 3652 | `5feab8de6b2bb33860c0e068bbad2ff2546789297cf8628fc3da2a3994a159fd` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06.md` | 1868 | `d716f486c4705914e658aba77bb43808617eaa1c1c79ca26c532280ea731906c` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` | 2818 | `bd4a94a46234dc855e52d73cfc606ba61c1576c827cfa92a642098b48eab5e69` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04.md` | 4175 | `96928fbd20bf8f89b90c6b5fc62b441c0112eac3cc4367015854c70290aed08d` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06.md` | 3194 | `943f96e72b1fc9efb03d5cd2f2d37f527f555a1b2270c43516eca3fa752cb3c1` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md` | 4064 | `6084ead9f0f4285893302d1dd97d3fd2d39c509442185b57d7de9dee01efcbf0` |
| `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md` | 6945 | `c1c355dd3927bedb0d672862c7bd89b70247fcc752997d81bde81784522367f5` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md` | 2583 | `811bf3c0abfae508878b90dd9043a7626848e0c1b2095d2429ec519dee26c70f` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md` | 5130 | `9ac262d71901cdda85d0fd9e9048062d1fd5808b3b72567806e843b02a0a7640` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md` | 1866 | `4ac92f9f903abaf0f095e918c6939216ff3dda6dc3a0af40d4cf75b083d45c6f` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md` | 4375 | `07cfed95b9bf7652027051a93b58074cc65a48eda2a479908258d8bfdf77b5bd` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md` | 3170 | `1cd4639a49cf97ef19f9fb7f34a29e373c864ecad88a375ec4c611cdf60d509b` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md` | 3439 | `2e01b12660961fc5bc715cb620887d01607269fa6d4ab079841218961fdbcd13` |
| `.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md` | 6755 | `a209325dac89eaacd13f6e0ecd07e4d501e9b5a869aa20664a760c7a13073d87` |
| `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json` | 22912 | `384f7b603d49ab953a71deb526cdf43e7e65f6e9a7160c3893500b6bd6385f00` |
| `.syzygy/governance/doctrine/security.md` | 9313 | `9d3f46528e37143ae1d63c755c7a50c6a5b139d28bef5c9de45d62b5c1ac71bf` |
| `.syzygy/governance/doctrine/vision.md` | 19969 | `fc222427c85c6ce39f02cb2b595b75fec23f6890c013d249f0b43baa52788bc3` |
| `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` | 11479 | `a7fb4418c6903626121b97b869036501fac07e45e86c6533455336e4c6a82184` |
| `defined-contract-clauses.md` | 57590 | `cfa855d32e81f9f7f1df05f1aaefeaf7a0e0e993a09dc741d955462d19f443a1` |
| `openspec/changes/dossier-declared-source-model/.openspec.yaml` | 40 | `277c3c07d7ab9927f15fff0d9c08afbbb9cc808d563ada95016a72a464a761e0` |
| `openspec/changes/dossier-declared-source-model/CAPABILITY-COVERAGE.json` | 11066 | `59946295569dc71f4123850434b997fcc648f84c5c0f31d114fcae1e71323afc` |
| `openspec/changes/dossier-declared-source-model/CONTRACT-COVERAGE.json` | 45316 | `5b8c87e9bc6c64352507cbf7392f89fbe5a369e6c3f12c3696cc579cdb346d3e` |
| `openspec/changes/dossier-declared-source-model/GOVERNING-DEPENDENCIES.json` | 2413 | `39495b3e9b572612901d8cedcf9903a1de761ba79d32b69e1d4ad17e4cf50cc8` |
| `openspec/changes/dossier-declared-source-model/README.md` | 210 | `44365726757698c945d8f0bf45d90e5ae66be1b11a7eb9e5582ba9421ba09933` |
| `openspec/changes/dossier-declared-source-model/SCENARIO-COVERAGE.json` | 72673 | `53ccacc41acaabf567789224c243e309265e3a409e173649aff187e946a2fbc9` |
| `openspec/changes/dossier-declared-source-model/SEMANTIC-DELTA.md` | 16214 | `6cd32e97ab2dc0367f4f26c20d40bd6289a4269bf9a4e1a1bdd7f3b9f802696c` |
| `openspec/changes/dossier-declared-source-model/design.md` | 12911 | `f752be8ecdc2d152ca4c77f72edd024477fcd1f48bda4da9ff8113a54d3e8c67` |
| `openspec/changes/dossier-declared-source-model/proposal.md` | 2789 | `b2a3fae4f4dcb8ef53358480ef6352e49676d71f2e6dd096dd188a95ec7ed63b` |
| `openspec/changes/dossier-declared-source-model/specs/polaris-generation/spec.md` | 110853 | `54e7d46ee5399029328646c8805c46807c8b1845ce7b340befab4669a61a0804` |
| `openspec/changes/dossier-declared-source-model/tasks.md` | 688 | `9eee9c154e751e5bf7a6dfdc655f3723618f341a42836786dd658478e5ea5e26` |
| `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md` | 80208 | `21caa65841e76784bbab015320cd0348ebeb092465e135f040901cefcf6e1c84` |
| `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md` | 128180 | `2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e` |
| `openspec/changes/polaris-manifesto-generation/specs/polaris-generation/spec.md` | 146216 | `a8199646c3b7953e8c4101d70d0307813dd1b3927d0b403f76c22d280dd6a89b` |
| `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md` | 59815 | `6841e63cda0ccdb81966a6fabbdfaf3721910df8ea04959711eb59843859ba58` |
