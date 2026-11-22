# Raw-read disclosure 2.18 semantic delta

[Inferred] Normative corrective change. SEC-2 and SEC-5 as amended by D11 own the raw-read exception. This version applies its required disclosure in the dossier specification and aligns the declared-source policy's description of its boundary.

## Specification

[Observed] Successor specification SHA-256 is `0459aba9e9f4098d0aa188b0be4acbca27df8dbe1aa6d401b8ca3244832c1712`. The predecessor of each requirement is its effective modification below. The same three requirement identities compose after the preceding dossier versions. The old version's proposed specification, design and delta remain its historical record.

## REQ-polaris-generation-033

[Observed] Version 2.1 from [dossier-url-declared-source-run](../dossier-url-declared-source-run/proposed/polaris-generation/spec.md) has SHA-256 `e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865`. Its scenario count goes from 6 to 9.

### Replace predecessor lines 29–29, successor lines 29–31

```json
{
  "before": [
    "The run record and the dossier's appendix SHALL disclose in human form, and every rendered page in machine form: the authoring mode; the agent tool, its version, its provider and the model identity and version, with actual operator/agent/default selection attribution and Inferred declaration status; that SEC-2 and SEC-5 bind the agent's own reads and sends, with operator-started tool transmissions Unknown, and URL captured relay attempts/sends/receipts separately scoped and attributed without claiming uncaptured transmission completeness; that the agent's account of what it read is self-reported and Inferred; the execution rule the brief carried, and whether the agent reported building or running the observed project, with every command it reported, labelled Inferred and marked as self-reported; for operator-started runs that Syzygy made no provider call, and for URL-supervised runs that Syzygy launched its declared CLI which generates provider requests forwarded by Syzygy's checked HTTP transport relay, with no provider SDK or independent inference engine; that compatible core declarations/history and any retained operator-started credential-list source are writable history, while URL host receipts/audit have separately enforced write protection; neither stored category by itself is current object verification or proof of a claim; no retired consent, registry act, policy act or statement was verified; the pinned revision; that every rendered quotation was verified by Syzygy against the Git objects at that revision, with their identifiers recomputed; that every value Syzygy shows from its stored records, rather than re-derives, is Inferred; and the counts of uncited judgement blocks and of withheld items, excerpts and inventory entries. Machine form means the page's machine attributes and the machine narrative of REQ-polaris-generation-003, read together; machine view and machine manifest name the same thing. Every rendered page SHALL state in one sentence of human text that it is a draft written by the named agent tool and model with no human review recorded, with the dossier's count of open questions and Unknowns where there are any, and link to that appendix. The appendix is the last page of the reading order, is reachable from every page without a pointing device, and holds the open questions. Wherever this change says a page states, says or discloses a thing this paragraph lists, that page's machine form and its one sentence with the link discharge it, and the appendix carries the human words; an open question or Unknown that affects a passage also stays explicit at that passage (REQ-polaris-generation-004)."
  ],
  "after": [
    "The run record and the dossier's appendix SHALL disclose in human form, and every rendered page in machine form: the authoring mode; the agent tool, its version, its provider and the model identity and version, with actual operator/agent/default selection attribution and Inferred declaration status; the D11 disclosure that the dossier authoring session read the raw clone unscreened and that a secret in it may have reached the run's declared provider, with operator-started tool transmissions Unknown and URL captured relay attempts/sends/receipts separately scoped and attributed without claiming uncaptured transmission completeness; that the agent's account of what it read is self-reported and Inferred; the execution rule the brief carried, and whether the agent reported building or running the observed project, with every command it reported, labelled Inferred and marked as self-reported; for operator-started runs that Syzygy made no provider call, and for URL-supervised runs that Syzygy launched its declared CLI which generates provider requests forwarded by Syzygy's checked HTTP transport relay, with no provider SDK or independent inference engine; that compatible core declarations/history and any retained operator-started credential-list source are writable history, while URL host receipts/audit have separately enforced write protection; neither stored category by itself is current object verification or proof of a claim; no retired consent, registry act, policy act or statement was verified; the pinned revision; that every rendered quotation was verified by Syzygy against the Git objects at that revision, with their identifiers recomputed; that every value Syzygy shows from its stored records, rather than re-derives, is Inferred; and the counts of uncited judgement blocks and of withheld items, excerpts and inventory entries. Machine form means the page's machine attributes and the machine narrative of REQ-polaris-generation-003, read together; machine view and machine manifest name the same thing. Every rendered page SHALL state in one sentence of human text that it is a draft written by the named agent tool and model with no human review recorded, with the dossier's count of open questions and Unknowns where there are any, and link to that appendix. The appendix is the last page of the reading order, is reachable from every page without a pointing device, and holds the open questions. Wherever this change says a page states, says or discloses a thing this paragraph lists, that page's machine form and its one sentence with the link discharge it, and the appendix carries the human words; an open question or Unknown that affects a passage also stays explicit at that passage (REQ-polaris-generation-004).",
    "",
    "Syzygy SHALL put the D11 disclosure in the run record even if the run stops, refuses a dependent step or otherwise renders no page. The disclosure SHALL state the channel and its risk without claiming observed completeness, an actual secret transmission or verification of the agent's account. An uncaptured value remains Unknown. A captured relay request remains a Syzygy transmission under REQ-polaris-generation-025 and REQ-polaris-generation-048 and SHALL still pass their checks. The D11 disclosure SHALL also be carried in each projection of the authoring disclosure named by this requirement. Provider-mode rendering has no dossier authoring session and its disclosures retain their existing contract."
  ]
}
```


### Replace predecessor lines 49–49, successor lines 51–51

```json
{
  "before": [
    "For URL-supervised mode only, this requirement explicitly qualifies036's sentence \"Syzygy cannot observe the agent tool's own transmissions or attest compliance\":025/048 mediate source delivery and capture only the actual independently identified relay population.036's separate self-reported agent discovery account remains Inferred and cannot yield verified whole-source coverage, an Observed not-read figure, execution permission or a completeness claim. The render's presently rehashed-object population stays distinct; stored broker/relay history is an additional scoped historical fact, never a replacement for either discovery population. Corresponding retained INTERFACES.md and SECURITY-CONTRACT.md readings of no listening route/no direct provider traffic and same-user audit apply to operator-started entry; the URL bridge/checked transport/protected audit boundary is exactly025/048, with no public ingress or SDK inference engine. The OWNER-FLOW.md reading introduces no ceremony: declarations, typed questions and boundary refusals are run configuration and evidence, not owner consent."
  ],
  "after": [
    "For URL-supervised mode,025/048 mediate Syzygy source delivery and capture only the actual independently identified relay population.036's D11 disclosure concerns the dossier session's own raw-clone reads outside Syzygy's checked channels, and records no uncaptured transmission as Observed.036's separate self-reported agent discovery account remains Inferred and cannot yield verified whole-source coverage, an Observed not-read figure, execution permission or a completeness claim. The render's presently rehashed-object population stays distinct; stored broker/relay history is an additional scoped historical fact, never a replacement for either discovery population. Corresponding retained INTERFACES.md and SECURITY-CONTRACT.md readings of no listening route/no direct provider traffic and same-user audit apply to operator-started entry; the URL bridge/checked transport/protected audit boundary is exactly025/048, with no public ingress or SDK inference engine. The OWNER-FLOW.md reading introduces no ceremony: declarations, typed questions and boundary refusals are run configuration and evidence, not owner consent."
  ]
}
```


### Insert predecessor lines 90–89, successor lines 92–109

```json
{
  "before": [],
  "after": [
    "#### Scenario: Raw-read disclosure across a rendered dossier",
    "",
    "- **WHEN** an operator-agent dossier renders more than one page and has a declared provider",
    "- **THEN** the run record and human appendix state that the authoring session read the raw clone unscreened and a secret in it may have reached that declared provider",
    "- **AND** every rendered page's machine form carries that disclosure, including pages that show no author-written claims",
    "- **AND** the wording states the risk without identifying a secret or claiming an actual secret transmission",
    "",
    "#### Scenario: Raw-read disclosure when there is no site",
    "",
    "- **WHEN** an operator-agent run is recorded and stops without rendering a page",
    "- **THEN** the run record still carries the unscreened raw-clone and declared-provider risk disclosure",
    "",
    "#### Scenario: Checked relay evidence does not stand for raw-read traffic",
    "",
    "- **WHEN** a URL-supervised run has captured relay attempts and the session's own transmissions are uncaptured",
    "- **THEN** the run discloses the separate capture population, keeps uncaptured transmission facts Unknown and carries the D11 disclosure",
    "- **AND** a detector match or unclassifiable content in a captured relay request refuses that request under the same rules as before this amendment",
    ""
  ]
}
```


### Replace predecessor lines 93–93, successor lines 113–113

```json
{
  "before": [
    "- **Observable:** Command reports, state-file byte differences, process/network capture, rendered pages and machine disclosures."
  ],
  "after": [
    "- **Observable:** Command reports, state-file byte differences, process/network capture, rendered pages and machine disclosures. For D11, read the run record of a run that produced no site as well as the appendix and machine form of every page in a multi-page run, and compare captured relay refusals against an independent fixture."
  ]
}
```


## REQ-polaris-generation-036

[Observed] Version 2.0 from [dossier-declared-source-model](../dossier-declared-source-model/proposed/polaris-generation/spec.md) has SHA-256 `d17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040`. Its scenario count goes from 6 to 7.

### Replace predecessor lines 7–7, successor lines 7–7

```json
{
  "before": [
    "For a run in the operator-agent mode this requirement displaces or reads exactly this predecessor text: REQ-polaris-generation-030's \"inspected and selected material\" becomes the two populations above. Its metadata/start/effect gates apply to Syzygy through current033: declared source and provider, pinned verified objects and committed screening policy, without consent, statement or act prerequisites. Every Syzygy content read remains classified and screened. SEC-2 and SEC-5 also bind the agent's own reads and sends: the brief SHALL require that the agent preserve the run's screening, exclusion and private metadata rules, never send secrets or unclassifiable content, and send only to its declared provider. Syzygy cannot observe the agent tool's own transmissions or attest compliance; the agent read account remains a separate self-report labelled Inferred. Neither population implies observed-code execution, which current033 and SEC-3 govern. In REQ-polaris-generation-031, \"owner\" as the person asked becomes the human operator of the run, whose answers remain attributed. Every other sentence and scenario of030 and031 is unchanged."
  ],
  "after": [
    "For a run in the operator-agent mode this requirement displaces or reads exactly this predecessor text: REQ-polaris-generation-030's \"inspected and selected material\" becomes the two populations above. Its metadata/start/effect gates apply to Syzygy through current033: declared source and provider, pinned verified objects and committed screening policy, without consent, statement or act prerequisites. Every Syzygy content read remains classified and screened. Under SEC-2 and SEC-5 as adopted in D11, the dossier authoring session's own reads use the raw clone unscreened. The session's provider SHALL be declared for the run, and current033 requires the raw-read and secret-exposure disclosure. The raw clone can include tracked, untracked or ignored files and Git metadata and can contain classes outside Syzygy's eligible artifact classes. Those classes continue to bound Syzygy's artifact admission. Syzygy cannot observe the agent tool's own transmissions outside checked channels. The agent read account remains a separate self-report labelled Inferred. Syzygy SHALL still screen and exclude material the session writes back into a Syzygy surface or store. Neither population implies observed-code execution, which current033 and SEC-3 govern. In REQ-polaris-generation-031, \"owner\" as the person asked becomes the human operator of the run, whose answers remain attributed. Every other sentence and scenario of030 and031 is unchanged."
  ]
}
```


### Insert predecessor lines 49–48, successor lines 49–54

```json
{
  "before": [],
  "after": [
    "#### Scenario: Raw-reading disclosure does not admit prohibited source",
    "",
    "- **WHEN** a session reports an ignored path and submits a draft quoting content that the run's policy would exclude",
    "- **THEN** the read account stays self-reported and Inferred, and Syzygy refuses the affected draft under the bound policy",
    "- **AND** neither the raw-read disclosure nor the reported read admits the excluded content to a Syzygy surface or store",
    ""
  ]
}
```


## REQ-polaris-generation-046

[Observed] Version 2.13 from [dossier-declared-source-readmission](../dossier-declared-source-readmission/proposed/polaris-generation/spec.md) has SHA-256 `494dcd81b3bb8d0638c5a517e9fa1005720cac8b39cba34751f5f6ee62eeb018`. Its scenario count goes from 13 to 14.

### Replace predecessor lines 13–13, successor lines 13–13

```json
{
  "before": [
    "From version 2.13, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/3.0.0`) under REQ-polaris-generation-033's policy-capture rule: its path, identity, version and the SHA-256 of its exact committed bytes, with any missing, malformed, uncommitted or changed policy refused before content is used. The predecessor `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` (version `dossier-declared-source/1.0.0`) and version 2.6's binding `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (version `dossier-declared-source/2.0.0`) SHALL stay committed and unedited. Each remains the binding of every run whose record names it: no step SHALL re-screen such a run under another version or silently move it to another version. A step of a run bound to either that can no longer read that policy as its binding SHALL refuse with a restart explanation that names the run's policy version and version 3.0.0, and SHALL change none of the run's files. In this requirement \"the predecessor\" names version 1.0.0, as in version 2.6's text. Version 3.0.0 is version 2.0.0 with entries appended to six second-stage lists (`successor.readmission`) and its version and `successor` record restated; every other field, every rule text, list, detector, denied path and exemption is version 2.0.0's, so what this requirement says of version 2.0.0's rules holds for version 3.0.0 unchanged."
  ],
  "after": [
    "From version 2.18, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/4.0.0`) under REQ-polaris-generation-033's policy-capture rule. It SHALL bind its path, identity, version and SHA-256 of its exact committed bytes and refuse a missing, malformed or drifted binding. Versions 1.0.0, 2.0.0 and 3.0.0 remain the exact bindings for runs that recorded them. Syzygy SHALL NOT silently re-screen or migrate an existing run. A dependent step that cannot verify its original binding SHALL refuse, name that binding and explain how to start a new run under version 4.0.0. The D11 disclosure in033 applies regardless of the screening policy version recorded for the run."
  ]
}
```


### Replace predecessor lines 15–15, successor lines 15–15

```json
{
  "before": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 3.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 3.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest."
  ],
  "after": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over version 4.0.0 for runs that bind it. Version 4.0.0 has the exact classification and screening predicates of version 3.0.0. The overlay's `basePolicy.reviewedSha256` still identifies the predecessor bytes reviewed with the overlay, and this paragraph explicitly states the new base. Its sentences about admitting no new path, type or object describe the overlay's own effect. Every other overlay rule applies unchanged. The run record SHALL name both bindings, including the base's path, version and digest."
  ]
}
```


### Replace predecessor lines 21–21, successor lines 21–21

```json
{
  "before": [
    "The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class the policy the run binds decides (version 1.0.0, 2.0.0 or 3.0.0)."
  ],
  "after": [
    "The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class the policy the run binds decides (version 1.0.0, 2.0.0, 3.0.0 or 4.0.0). Version 4.0.0 retains the exact classification and screening predicates, eligible artifact classes, private metadata rules, and storage, render and checked transmission boundaries of version 3.0.0."
  ]
}
```


### Replace predecessor lines 47–47, successor lines 47–47

```json
{
  "before": [
    "- **THEN** each of the first six is admitted as `governance-text` by `governance-text-by-name`, may be cited, and reaches the declared provider only as `governance-text`"
  ],
  "after": [
    "- **THEN** each of the first six is admitted as `governance-text` by `governance-text-by-name`, may be cited, and Syzygy sends it to the declared provider only as `governance-text`"
  ]
}
```


### Replace predecessor lines 54–54, successor lines 54–54

```json
{
  "before": [
    "- **THEN** each is indeterminate, excluded as an unknown extraction class, and its body is never read, cited or sent"
  ],
  "after": [
    "- **THEN** each is indeterminate, excluded as an unknown extraction class, and Syzygy never reads, cites or sends its body"
  ]
}
```


### Replace predecessor lines 74–74, successor lines 74–74

```json
{
  "before": [
    "- **AND** each of the last seven stays indeterminate, excluded as an unknown extraction class, and its body is never read"
  ],
  "after": [
    "- **AND** each of the last seven stays indeterminate, excluded as an unknown extraction class, and Syzygy never reads its body"
  ]
}
```


### Replace predecessor lines 85–85, successor lines 85–85

```json
{
  "before": [
    "- **THEN** each is a denied path whose blob is never read, and every path the predecessor denies is still denied"
  ],
  "after": [
    "- **THEN** each is a denied path whose blob Syzygy never reads, and every path the predecessor denies is still denied"
  ]
}
```


### Replace predecessor lines 100–101, successor lines 100–107

```json
{
  "before": [
    "- **WHEN** a step is asked of a run whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json`, and of another whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json`, and neither policy can any longer be read as that run's binding",
    "- **THEN** each step refuses with a restart explanation naming its run's policy version and version 3.0.0, and no file of either run changes"
  ],
  "after": [
    "- **WHEN** a step is asked of a run whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json`, of another whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json`, and of a third whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json`, and none of those policies can any longer be read as that run's binding",
    "- **THEN** each step refuses with a restart explanation naming its run's policy version and version 4.0.0, and no file of those runs changes",
    "",
    "#### Scenario: Policy successor preserves screening outcomes",
    "",
    "- **WHEN** one controlled tree, draft and checked relay traffic are screened under versions 3.0.0 and 4.0.0",
    "- **THEN** classifications, denied paths, detector matches, exclusions, redactions and private-metadata restrictions agree",
    "- **AND** a new run binds the exact version 4.0.0 policy bytes and its record carries the D11 disclosure required by REQ-polaris-generation-033"
  ]
}
```


## Declared-source policy

[Observed] Version 3.0.0 SHA-256 is `1b9726884376922805fc8ebd973bdb4dc25ff54464264cdb995662806117a16e`. Version 4.0.0 SHA-256 is `d3abcb31c98bfd303c2bf477cc461787cacf26811cb640d925da1de347246da9`. The differences below are extracted from the two parsed objects. The scope's classifier, detectors, disposition rules and delivery boundaries are identical.

### `/policyVersion`

```json
{
  "before": "dossier-declared-source/3.0.0",
  "after": "dossier-declared-source/4.0.0"
}
```


### `/successor/predecessor/path`

```json
{
  "before": ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json",
  "after": ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json"
}
```


### `/successor/predecessor/sha256`

```json
{
  "before": "8c10531f57d129ad5d402e53d7d9fdc741387f6eaab701bbdb46419181b11967",
  "after": "1b9726884376922805fc8ebd973bdb4dc25ff54464264cdb995662806117a16e"
}
```


### `/successor/predecessor/policyVersion`

```json
{
  "before": "dossier-declared-source/2.0.0",
  "after": "dossier-declared-source/3.0.0"
}
```


### `/successor/predecessor/relation`

```json
{
  "before": "this file is a new version beside the predecessor, which is not edited, and is built from its bytes: every field is the predecessor's except this predecessor record, policyVersion, readmission and the first entry of notAdoptedFromTheOption, and entries appended to six Stage-2 lists. The predecessor stays the binding of every run whose record binds it, as POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json stays the binding of every run whose record binds that; which file a run binds is stated by REQ-polaris-generation-046 from specification version 2.13, never by this field",
  "after": "Version 4.0.0 follows adopted SEC-2 and SEC-5 (D11) in the dossier session and raw-body rules. REQ-polaris-generation-046 determines which policy a run binds. The preceding files remain the exact policy bytes for runs that bound them. The owner decision, reversal and readmission entries below retain version 3.0.0's classification provenance."
}
```


### `/publicSourceScope/sourceVisibility/agentSessions`

```json
{
  "before": "SEC-2 and SEC-5 bind agents as well as Syzygy: only the declared provider may receive content, and secrets never leave. Briefs require agents to preserve screening and exclusion rules in their own reads and sends. Syzygy screens the content it reads, stores, renders and delivers; it cannot observe or attest an agent tool own transmissions or compliance, which are never presented as Observed",
  "after": "Under SEC-2 and SEC-5 as adopted in D11, a Polaris dossier authoring session's own reads use the raw clone unscreened. The provider must be declared for the run. The run record, the dossier appendix and every rendered page's machine form disclose the unscreened reads and that a secret in the clone may have reached that provider. The run record carries the disclosure even when the run renders no page. Syzygy cannot observe the session's own traffic outside its checked channels. The session's read account is self-reported and Inferred. Content Syzygy reads, builds, stores, renders or transmits, including a checked relay payload and material the session writes back into Syzygy, remains subject to classification, screening, exclusion and private-metadata protection."
}
```


### `/publicSourceScope/rawBodyHandling/rule`

```json
{
  "before": "storage is permitted only inside the local run directory outside git; no raw body logging or machine response; rendering is an editorial draft only. Content delivered to a provider must be classified and screened and the provider declared under SEC-2. Secrets never leave. Excluded or withheld private object identifiers and sizes are never rendered or sent and remain only in permitted local check records and review packets",
  "after": "Syzygy may store classified, screened source only inside the local run directory outside git. Raw bodies are never logged or included in machine responses; rendering is limited to context-encoded quoted spans in an editorial draft. Syzygy delivers classified and screened content only to the declared provider, and excludes secrets and unclassifiable content. The session's own raw-clone reads and provider traffic have the disclosed D11 boundary in agentSessions. Excluded or withheld private object identifiers and sizes are never rendered or sent and remain only in permitted local check records and review packets."
}
```
