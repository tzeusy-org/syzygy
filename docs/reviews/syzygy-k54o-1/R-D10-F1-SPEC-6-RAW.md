# Independent frozen specification review: D10 F-1, review 6

VERDICT: REVISE

[Inferred] The declared-source amendment is coherent and preserves the central security, evidence and product boundaries examined below, but one claimed contract-consequence coverage edge is not grounded in its named requirement. The candidate is not ready for confirmation under CC-SPEC-8 until finding F1 is resolved.

## Subject, integrity and independence

[Observed] Review input is exclusively the frozen packet at `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f1-spec-review-6/`. Its `manifest.json` SHA256 is `61652f3ef014a0eaa7e428cd3f8e59f3cb0de975d612f367af4e13729e0d2a99`. The manifest declares 37 inputs. I independently checked their byte lengths and SHA256 values with Python, then checked the complete 37-file checksum population again with the separate `sha256sum` program. Both methods matched the manifest. Immediately before writing this review, the manifest and each input were rechecked against their recorded hashes.

[Observed] Principal reviewed subjects and SHA256 identities:

- `openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md`: `2fa8c9acf986a656998b5f2464506cb82f57f3a3737fc6740eb77d4a29b89009`.
- `openspec/changes/dossier-declared-source-model/SEMANTIC-DELTA.md`: `104de7557bd018c50f2d216e7216a4aeba47f26f4a8b2f2ef5c150c1c3b0943c`.
- `openspec/changes/dossier-declared-source-model/CONTRACT-COVERAGE.json`: `b76c22676b182ccb7ae9f116160072c989addeddf767054ee7349bde6e49077e`.
- `openspec/changes/dossier-declared-source-model/CAPABILITY-COVERAGE.json`: `85d262423d2b6a774ca517beb8de2f488087280b5814c9ee46ae1e35a8f7f345`.
- `openspec/changes/dossier-declared-source-model/GOVERNING-DEPENDENCIES.json`: `457f8ff8ceeee19331bc60dc91612f9e1a133a4ff25d231676b750931f0cc486`.
- `openspec/changes/dossier-declared-source-model/SCENARIO-COVERAGE.json`: `cf36630e92e068a79f595f0557cdf9044b9bd814462004728154531ff5b8bf5b`.
- `defined-contract-clauses.md`: `cfa855d32e81f9f7f1df05f1aaefeaf7a0e0e993a09dc741d955462d19f443a1`.
- `.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md`: `a698de216484ee2f221988142e70de3b661c9fb095b0e3eb3cf10390517588d1`.

[Observed] This reviewer did not author the candidate. No prior raw review, live implementation, live tracker, observed repository body outside the supplied packet, or source/provider operation was consulted. The heart-and-soul and engineering-bar skill instructions were read for review conduct; the supplied current doctrine and policies controlled the review where older skill summaries differed. No adoption, consent interaction, repository edit or tracker change was performed.

## Fresh-reader restatement

[Inferred] Version 2.0 replaces local operator-agent admission ceremonies with a declared repository identity/locator, a fixed full commit, a declared provider/tool, finite configuration and committed screening policy. Syzygy verifies reachable objects independently, screens content, checks quotations and packet bindings, and renders an explicitly non-citable editorial draft. Agent exploration and transmission remain self-reported or unobserved; stored same-user state does not earn an Observed label. This local version enables no execution instruction. New records use strict bounded `/2`; `/1` continuation is refused with a restart explanation while retaining its files. Published specification/policy/judgment adoption status is a separate obligation and must never become a per-repository read/provider gate.

[Inferred] F-3 URL/default-branch acquisition, copying/clone-shape changes and execution orchestration, F-4 build identity and F-5 generic ceremony machinery remain excluded. The four proposed N/A judgments are scoped candidate judgments, not effective waivers before adoption.

## Findings

### F1 — REVISE: the repository-role consequence is asserted covered without a requirement that covers it

[Observed] `CONTRACT-COVERAGE.json:17-22` contains this second RFC1-2 row:

> A repository remains one entity with declared observed-source role; no duplicate governance-root entity

It names only `REQ-polaris-generation-046` and gives the disposition `covered in candidate requirement set`.

[Observed] The actual supplied RFC1-2 definition (`defined-contract-clauses.md:3-5`) says:

> **Repository** is one entity class carrying a declared **role**: `governance-root` or `observed-source`. Governance root is a role, not a separate entity

[Observed] The named 046 body (`proposed/polaris-generation/spec.md:101-109`) requires a normalized locator, declared or derived identity, pin/policy/state checks, identity/locator provenance and collision disclosures, and published change-status behavior. It does not require declaring a Repository role, or preserving the one-entity/role distinction when the subject has a governance root. Its cases, oracle and falsifier (`:131-136`) likewise examine locator identity, state separation, writes and disclosure fields rather than the role consequence. The new 033 body does not supply that missing obligation through 046's use of 033 either. The acquisition registry's `role: adapter` is the adapter role, not the subject Repository entity's role.

[Observed] A bounded corroborating sweep inspected all five supplied specification files, 4,058 lines in total, for `observed-source`, `governance-root`, and repository/role combinations. Python regular-expression enumeration found no matches. A second independent `rg` sweep of the same five files for the two literal role names also returned no matches. This lexical result is corroboration; the finding rests on the actual 046 body and the row's claimed consequence, not on token absence alone.

[Inferred] A producer could satisfy the requirements currently named by this row while emitting a subject identity/locator with no declared Repository role, and no role-specific case/oracle would reject it. Thus the row does not establish the contract consequence it claims. The first RFC1-2 row's identity/locator coverage cannot discharge the distinct entity/role consequence. This matters under CC-SPEC-8's explicit rule that rows are per observable consequence and that mapping one requirement to a clause with multiple consequences does not establish coverage.

[Inferred] Resolve this narrowly: either give the row a real requirement edge that specifies the applicable single-entity/declared-role behavior and a bounded independent check, or, if this static capability never instantiates that entity/role behavior, record the scoped reviewed applicability judgment and leave that consequence unresolved until its actual adoption. Do not label the current 046 identity-only behavior as covering the additional consequence. This finding asks for no new kernel or graph subsystem and does not require a new repository-read/provider gate.

## Other acceptance evidence

[Observed] The declared old/new fragment transformations in `SEMANTIC-DELTA.md` were independently applied in memory to complete predecessor requirement sections 034, 035 and 036. For each, the transformed body, scenarios and oracle text match the complete candidate section exactly after removing the separately reviewed warrant blocks and outer whitespace. Thus the declared changes are not hiding an additional omitted paragraph, scenario or oracle in those three retained sections.

[Observed] The six per-requirement warrant classes are present for each of the five candidate requirements. Independently rebuilt unions match `GOVERNING-DEPENDENCIES.json`: 10 doctrine IDs, 22 contract IDs, 6 policy IDs, 16 decision IDs and 18 parent-requirement IDs; the topology declarations are empty. This is a structural union check, not a substitute for warrant applicability. I examined the material warrant links against the current supplied doctrine, defined contracts, product directions and retained parents, including CC-SPEC-8/10 on the published change-status duties of 033/046. I raise no additional material warrant finding in this review.

[Observed] An independent enumeration of scenario headings from the complete local-agent and launch-consent predecessor sections yields the same 135 distinct source/requirement/scenario tuples as `SCENARIO-COVERAGE.json`. Retention/admission/F-3 dispositions were assessed against the amendment's actual scope; the enumeration is not execution evidence.

[Inferred] Rewritten 033 preserves positive finite deadline and token-or-turn declarations, nonnegative repair/question limits, enforcement of Syzygy's own steps, Unknown usage rather than zero, rederived quotations/checks/verdict bindings, same-user write-reach disclosures, screened ingests, unattributed execution, and the human sentence/appendix/per-page machine disclosure arrangement. Its policy capture specifies regular-file checks, bounded bytes/UTF-8/JSON, path/id/version/digest binding and unchanged bytes at later unrelated commits. Source-object read/rehash and the registry's finite resource limits remain explicit inherited obligations.

[Inferred] Rewritten 046 retains credential suppression, admitted locator normalization, explicit versus derived identity provenance, state separation/interrupted-write safety, configuration write reach and the surviving host/path/hyphen/port/case collision disclosures. Retired record-match/statement reliance and terminal carriers are named as retired; their removal does not erase the surviving identity residuals.

[Inferred] Current SEC-2/SEC-5 bind the agent's own reads/sends as instructions while actual compliance/transmission stays unobserved. Private/absent visibility remains conservative; unknown classes, whole exclusions, span-dependent Unknown and surviving-span support remain distinct. The packet does not claim a detector weakening or a new execution permission. Conditional retained credential probes and command/breach disclosures are not used to enable an F-1 permitting arm.

[Observed] The contract matrix has 139 rows across the exact 22 supplied definitions: 135 proposed covered rows and four explicitly unresolved candidate N/A rows. I inspected the consequence groups, including closed degradation/Unknown vocabularies, reader descriptor inputs, run envelope, composite origins, exclusion provenance, draft non-citability, source/claim/review bindings and machine/nonvisual disclosure. F1 prevents confirming the proposed covered population as semantically complete.

[Inferred] The revised adoption/status branches are materially separated from read/provider admission: 033 expressly distinguishes candidate stamps, default-branch adoption, adopter/record links, semantic successors, veto restoration of a preceding adoption and invalid/reverted sole records leaving applicability Unknown with retained provenance. The named A/B/veto and sole-record/mismatch fixtures, literal predecessor-effective versus Unknown expectations and falsifiers are producible without adopting the candidate or reading a real source. The four proposed N/A rows cite the candidate decisions-home judgment and explicitly map nothing until actual adoption; their scoped exclusions do not waive the retained local consequences of the same clauses.

[Observed] I independently enumerated the capability obligations from the declared local-run scope and compared them with `CAPABILITY-COVERAGE.json`. Its 40 distinct entries partition as 33 candidate-covered obligations and seven named non-goals, matching the declared totals and excluding F-3/F-4/F-5 and kernel/curated/live behaviors. This confirms the declared-scope capability table independently of its author; it does not validate implementation or cure F1 in the different contract-consequence table.

[Inferred] The candidate's event-response cases are producible with controlled local clones, independently prepared policy/declaration/record mutations and file/process captures. Their expected pins, redaction outcomes, refusals, metadata fields and packet hashes can be fixed independently of production helpers. The unchanged 034-036 cases retain independent fixture oracles and concrete falsifiers. F1 is the remaining demonstrated gap in making every claimed contract consequence independently checkable.

## Limits

[Unknown] Implementation satisfaction, actual source readiness, provider transmission, agent compliance, hosted checks and actual adoption are not established by this specification review. No such operation was performed. The candidate remains unadopted, and no proposed N/A judgment is made effective by this review. The verdict applies only to the manifest-bound bytes listed above; a later semantic edit requires a fresh review of the resulting subject.
