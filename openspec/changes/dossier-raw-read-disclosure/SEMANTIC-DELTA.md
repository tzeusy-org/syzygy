# Raw-read disclosure 2.17 semantic delta

[Inferred] Normative corrective change. SEC-2 and SEC-5 as amended by D11 own the raw-read exception. This version applies its required disclosure in the dossier specification and aligns the declared-source policy's description of its boundary.

## Specification

[Observed] Successor specification SHA-256 is `a53432d787d857185b76193aa614c47d42eca39b3f9c22857935b61127ff5517`. The predecessor of each requirement is its effective modification below. The same three requirement identities compose after the preceding dossier versions. The old version's proposed specification, design and delta remain its historical record.

## REQ-polaris-generation-033

[Observed] Version 2.1 from [dossier-url-declared-source-run](../dossier-url-declared-source-run/proposed/polaris-generation/spec.md) has SHA-256 `e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865`. Its scenario count goes from 6 to 9.

### Replace predecessor lines 29–29, successor lines 29–33

```json
{
  "before": [
    "The run record and the dossier's appendix SHALL disclose in human form, and every rendered page in machine form: the authoring mode; the agent tool, its version, its provider and the model identity and version, with actual operator/agent/default selection attribution and Inferred declaration status; that SEC-2 and SEC-5 bind the agent's own reads and sends, with operator-started tool transmissions Unknown, and URL captured relay attempts/sends/receipts separately scoped and attributed without claiming uncaptured transmission completeness; that the agent's account of what it read is self-reported and Inferred; the execution rule the brief carried, and whether the agent reported building or running the observed project, with every command it reported, labelled Inferred and marked as self-reported; for operator-started runs that Syzygy made no provider call, and for URL-supervised runs that Syzygy launched its declared CLI which generates provider requests forwarded by Syzygy's checked HTTP transport relay, with no provider SDK or independent inference engine; that compatible core declarations/history and any retained operator-started credential-list source are writable history, while URL host receipts/audit have separately enforced write protection; neither stored category by itself is current object verification or proof of a claim; no retired consent, registry act, policy act or statement was verified; the pinned revision; that every rendered quotation was verified by Syzygy against the Git objects at that revision, with their identifiers recomputed; that every value Syzygy shows from its stored records, rather than re-derives, is Inferred; and the counts of uncited judgement blocks and of withheld items, excerpts and inventory entries. Machine form means the page's machine attributes and the machine narrative of REQ-polaris-generation-003, read together; machine view and machine manifest name the same thing. Every rendered page SHALL state in one sentence of human text that it is a draft written by the named agent tool and model with no human review recorded, with the dossier's count of open questions and Unknowns where there are any, and link to that appendix. The appendix is the last page of the reading order, is reachable from every page without a pointing device, and holds the open questions. Wherever this change says a page states, says or discloses a thing this paragraph lists, that page's machine form and its one sentence with the link discharge it, and the appendix carries the human words; an open question or Unknown that affects a passage also stays explicit at that passage (REQ-polaris-generation-004)."
  ],
  "after": [
    "The run record and the dossier's appendix SHALL disclose in human form, and every rendered page in machine form: the authoring mode; the agent tool, its version, its provider and the model identity and version, with actual operator/agent/default selection attribution and Inferred declaration status; the D11 disclosure that the dossier authoring session read the raw clone unscreened and that a secret in it may have reached the run's declared provider, with operator-started tool transmissions Unknown and URL captured relay attempts/sends/receipts separately scoped and attributed without claiming uncaptured transmission completeness; that the agent's account of what it read is self-reported and Inferred; the execution rule the brief carried, and whether the agent reported building or running the observed project, with every command it reported, labelled Inferred and marked as self-reported; for operator-started runs that Syzygy made no provider call, and for URL-supervised runs that Syzygy launched its declared CLI which generates provider requests forwarded by Syzygy's checked HTTP transport relay, with no provider SDK or independent inference engine; that compatible core declarations/history and any retained operator-started credential-list source are writable history, while URL host receipts/audit have separately enforced write protection; neither stored category by itself is current object verification or proof of a claim; no retired consent, registry act, policy act or statement was verified; the pinned revision; that every rendered quotation was verified by Syzygy against the Git objects at that revision, with their identifiers recomputed; that every value Syzygy shows from its stored records, rather than re-derives, is Inferred; and the counts of uncited judgement blocks and of withheld items, excerpts and inventory entries. Machine form means the page's machine attributes and the machine narrative of REQ-polaris-generation-003, read together; machine view and machine manifest name the same thing. Every rendered page SHALL state in one sentence of human text that it is a draft written by the named agent tool and model with no human review recorded, with the dossier's count of open questions and Unknowns where there are any, and link to that appendix. The appendix is the last page of the reading order, is reachable from every page without a pointing device, and holds the open questions. Wherever this change says a page states, says or discloses a thing this paragraph lists, that page's machine form and its one sentence with the link discharge it, and the appendix carries the human words; an open question or Unknown that affects a passage also stays explicit at that passage (REQ-polaris-generation-004).",
    "",
    "Syzygy SHALL put the D11 disclosure in the run record even if the run stops, refuses a dependent step or otherwise renders no page. If the run stops before launching or handing over to the authoring session, its disclosure SHALL describe the channel and risk that apply to such a session and record that the session was not reached. If the run cannot establish whether it reached the session, it SHALL record that status as Unknown and state the same risk. The disclosure SHALL make no claim of observed read completeness, an actual secret transmission or verification of the agent's account. An uncaptured value remains Unknown. A captured relay request remains a Syzygy transmission under REQ-polaris-generation-025 and REQ-polaris-generation-048 and SHALL still pass their checks. The D11 disclosure SHALL also be carried in each projection of the authoring disclosure named by this requirement. Provider-mode rendering has no dossier authoring session and its disclosures retain their existing contract.",
    "",
    "The stored operator-agent run record SHALL include a bounded disclosure companion beside its polaris-dossier-run/2 core. Its exact required fields SHALL be schemaVersion with value polaris-dossier-raw-read-disclosure/1, runId and declaredProvider matching the run's validated declarations, and authorHandoff with value not-reached, reached or unknown. The schema version carries the fixed raw-clone risk statement above, with no inspected path, history, credential or secret value. Syzygy SHALL record the companion at initialization and update authorHandoff at an explicit run transition, before rendering. A historical /2 without the companion remains readable under its historical format. Read-only inspection SHALL report the recorded disclosure as Unknown, explain the D11 channel and risk as current policy, and leave the stored bytes intact. For every stored run, a missing, malformed or mismatched companion SHALL refuse any new authoring handoff or site render without editing the retained files. The refusal SHALL name the disclosure requirement and explain how to start a new run. A run with a valid companion keeps its original screening policy on resume."
  ]
}
```


### Replace predecessor lines 49–49, successor lines 53–53

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


### Insert predecessor lines 90–89, successor lines 94–113

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
    "- **AND** if the run stopped before author handoff it records that the authoring session was not reached, and if handoff cannot be established it records Unknown, with neither case claiming that an actual read occurred",
    "- **AND** a /2 with no companion preserves its bytes on inspection, while absence, a mismatched run identity or a mismatched provider refuses a new handoff or site render and gives a restart explanation",
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


### Replace predecessor lines 92–94, successor lines 116–118

```json
{
  "before": [
    "- **Case:** Controlled public/private/unstated fixture repositories and bounded configurations, with absent legacy records; independently mutate one object, pin, provider, policy, record field or class at a time. Include regular, symlink and writerless-FIFO policy entries; invalid UTF-8, over-bound JSON/bytes and dirty policy; a policy-byte change versus an unrelated commit with identical bytes; composite origin/class loss; whole versus removed-span versus surviving-span support; provider withdrawal and missing-provider fallback; primary/secondary/aggregate reason and envelope conditional branches. For published change status, vary candidate stamps, missing adoption, actual default-branch commit/row/tag and later semantic edits independently; include an adopted A, later adopted B, and B veto/revert with B history retained, plus a reverted sole adoption, a mismatched record and no predecessor; compare status/adopter/record links with literal expected outcomes without creating a per-repository admission gate.",
    "- **Observable:** Command reports, state-file byte differences, process/network capture, rendered pages and machine disclosures.",
    "- **Oracle:** Literal expected pins, refusal codes and redacted/withheld outcomes prepared independently from fixture bytes; independently recompute object identifiers and compare retained legacy files. Use literal expected policy bindings/bounds and child-process timeout capture; independently prepared composite origins, exclusion tuples/counts, Unknown reasons/routes, withdrawal labels, report-fact ceilings and change-status/adopter/adoption-record bindings, independently literal expected predecessor-effective versus Unknown/no-effective-applicability results after veto/revert; do not import policy capture or rendering helpers."
  ],
  "after": [
    "- **Case:** Controlled public/private/unstated fixture repositories and bounded configurations, with absent legacy records; independently mutate one object, pin, provider, policy, record field or class at a time. Include regular, symlink and writerless-FIFO policy entries; invalid UTF-8, over-bound JSON/bytes and dirty policy; a policy-byte change versus an unrelated commit with identical bytes; composite origin/class loss; whole versus removed-span versus surviving-span support; provider withdrawal and missing-provider fallback; primary/secondary/aggregate reason and envelope conditional branches. For published change status, vary candidate stamps, missing adoption, actual default-branch commit/row/tag and later semantic edits independently; include an adopted A, later adopted B, and B veto/revert with B history retained, plus a reverted sole adoption, a mismatched record and no predecessor; compare status/adopter/record links with literal expected outcomes without creating a per-repository admission gate. Include a no-site refusal before author handoff, an unconfirmed operator-started handoff, a valid historical /2, an invalid disclosure companion, generated pages and a checked relay refusal.",
    "- **Observable:** Command reports, state-file byte differences, process/network capture, rendered pages and machine disclosures. For D11, read the run record of a run that produced no site as well as the appendix and machine form of every page in a multi-page run, and compare captured relay refusals against an independent fixture.",
    "- **Oracle:** Literal expected pins, refusal codes and redacted/withheld outcomes prepared independently from fixture bytes; independently recompute object identifiers and compare retained legacy files. Use literal expected policy bindings/bounds and child-process timeout capture; independently prepared composite origins, exclusion tuples/counts, Unknown reasons/routes, withdrawal labels, report-fact ceilings and change-status/adopter/adoption-record bindings, independently literal expected predecessor-effective versus Unknown/no-effective-applicability results after veto/revert; do not import policy capture or rendering helpers. Independently enumerate every render output. Use fixture literals for the declared-provider risk wording, handoff status, binding refusal and expected relay outcome."
  ]
}
```


### Replace predecessor lines 96–96, successor lines 120–120

```json
{
  "before": [
    "- **Falsifier:** A retired gate is called, a retired-record terminal question or unauthorized governance write occurs, invalid content is admitted, a private exclusion leaks metadata, a changed packet reuses a verdict, or a stored declaration is presented as observed transmission; a special policy file blocks, invalid policy bytes enter use, unchanged policy bytes are refused only for a different commit, a composite launders origin/class, surviving support is blanket-degraded, a withdrawal is hidden, a reason is invented, or an editorial draft becomes evidence/green; a candidate stamp or unadopted N/A maps as effective, or change-adoption status is mistaken for a per-repository admission prerequisite; a vetoed B stays effective, a reverted sole record still honors an N/A, or the effective predecessor/absence and retained veto provenance are hidden."
  ],
  "after": [
    "- **Falsifier:** A retired gate is called, a retired-record terminal question or unauthorized governance write occurs, invalid content is admitted, a private exclusion leaks metadata, a changed packet reuses a verdict, or a stored declaration is presented as observed transmission; a special policy file blocks, invalid policy bytes enter use, unchanged policy bytes are refused only for a different commit, a composite launders origin/class, surviving support is blanket-degraded, a withdrawal is hidden, a reason is invented, or an editorial draft becomes evidence/green; a candidate stamp or unadopted N/A maps as effective, or change-adoption status is mistaken for a per-repository admission prerequisite; a vetoed B stays effective, a reverted sole record still honors an N/A, or the effective predecessor/absence and retained veto provenance are hidden. A recorded run, appendix or generated machine page lacks the risk disclosure, a refusal before handoff claims a read, a historical read rewrites state, or a disclosure bypasses a checked relay refusal."
  ]
}
```


### Replace predecessor lines 106–106, successor lines 130–130

```json
{
  "before": [
    "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-005, REQ-polaris-generation-017, REQ-polaris-generation-018, REQ-polaris-generation-020, REQ-polaris-generation-021, REQ-polaris-generation-022, REQ-polaris-generation-025]"
  ],
  "after": [
    "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-005, REQ-polaris-generation-017, REQ-polaris-generation-018, REQ-polaris-generation-020, REQ-polaris-generation-021, REQ-polaris-generation-022, REQ-polaris-generation-025, REQ-polaris-generation-048]"
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
    "From version 2.17, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/4.0.0`) under REQ-polaris-generation-033's policy-capture rule. It SHALL bind its path, identity, version and SHA-256 of its exact committed bytes and refuse a missing, malformed or drifted binding. The committed policy bytes of versions 1.0.0, 2.0.0 and 3.0.0 stay unedited and remain the exact bindings for runs that recorded them. Syzygy SHALL NOT silently re-screen or migrate an existing run. A dependent step that cannot verify its original binding SHALL refuse, name that binding and explain how to start a new run under version 4.0.0, without changing the original run's files. The D11 disclosure in033 applies regardless of the screening policy version recorded for the run."
  ]
}
```


### Replace predecessor lines 15–15, successor lines 15–17

```json
{
  "before": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 3.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 3.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest."
  ],
  "after": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over version 4.0.0 for runs that bind it. Version 4.0.0 has the exact classification and screening predicates of version 3.0.0. The overlay's `basePolicy.reviewedSha256` still identifies the predecessor bytes reviewed with the overlay, and this paragraph explicitly states the new base. Its sentences about admitting no new path, type or object describe the overlay's own effect. Every other overlay rule applies unchanged. The run record SHALL name both bindings, including the base's path, version and digest. A supported continuation with a previously bound base and overlay SHALL keep both exact bindings.",
    "",
    "The admission, classification, exclusion and delivery duties below govern Syzygy, including the source it supplies to a session and checked provider traffic. The separately disclosed raw-clone activity of a dossier authoring session follows REQ-polaris-generation-033 and REQ-polaris-generation-036. REQ-polaris-generation-047 continues to govern Syzygy's owned acquisition, and REQ-polaris-generation-025 and REQ-polaris-generation-048 govern its transport routes."
  ]
}
```


### Replace predecessor lines 21–21, successor lines 23–23

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


### Replace predecessor lines 47–47, successor lines 49–49

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


### Replace predecessor lines 54–54, successor lines 56–56

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


### Replace predecessor lines 74–74, successor lines 76–76

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


### Replace predecessor lines 85–85, successor lines 87–87

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


### Replace predecessor lines 100–101, successor lines 102–109

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


### Replace predecessor lines 105–107, successor lines 113–115

```json
{
  "before": [
    "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor. Under version 3.0.0, vary for each re-admitted entry a matching path, the same path with a refused stem or word and below a vendored directory, and for each entry still left out a matching path; plant each configuration detector's form in each re-admitted configuration format (each entry appended to `configurationExtensions`, `sourceFileNames` and `sourceFileNamePrefixes`, and the `.gradle` and `.kts` language extensions); and continue a run bound to version 2.0.0.",
    "- **Observable:** Human/machine reports, stdin read count, governance/ref writes and before/after file capture. Each path's class or exclusion reason under both policy versions, each body's outcome, every reader and provider request population, the run record's bound policy and classes, and every refusal's reason text.",
    "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built. For version 3.0.0, the same, with version 2.0.0's expected outcomes also written as fixture literals from version 2.0.0's text, path by path, and cross-checked against a run of the version-2.0.0 screen before version 3.0.0 is built."
  ],
  "after": [
    "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor. Under version 3.0.0, vary for each re-admitted entry a matching path, the same path with a refused stem or word and below a vendored directory, and for each entry still left out a matching path; plant each configuration detector's form in each re-admitted configuration format (each entry appended to `configurationExtensions`, `sourceFileNames` and `sourceFileNamePrefixes`, and the `.gradle` and `.kts` language extensions); and continue a run bound to version 2.0.0. Compare v3 and v4 on the same synthetic tree, returned artifacts and checked relay payloads, including denied paths, matching and unclassifiable content, and private metadata.",
    "- **Observable:** Human/machine reports, stdin read count, governance/ref writes and before/after file capture. Each path's class or exclusion reason under both policy versions, each body's outcome, every reader and provider request population, the run record's bound policy and classes, and every refusal's reason text. Capture both policy runs' classifications, refusals, stored and rendered text, and checked delivery outcomes.",
    "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built. For version 3.0.0, the same, with version 2.0.0's expected outcomes also written as fixture literals from version 2.0.0's text, path by path, and cross-checked against a run of the version-2.0.0 screen before version 3.0.0 is built. Prepare the expected allowed output and exact refusals from fixture literals before observing either policy run."
  ]
}
```


### Replace predecessor lines 109–109, successor lines 117–117

```json
{
  "before": [
    "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal. Under version 3.0.0: a path version 2.0.0 places changes class, stage or outcome, or a path it denies is read; an entry `notAdoptedFromTheOption` names places a path; a re-admitted body skips a detector, the active-content scan or the configuration detectors, or is retained as `redacted-span`; a run bound to version 2.0.0 is re-screened or migrated without refusal."
  ],
  "after": [
    "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal. Under version 3.0.0: a path version 2.0.0 places changes class, stage or outcome, or a path it denies is read; an entry `notAdoptedFromTheOption` names places a path; a re-admitted body skips a detector, the active-content scan or the configuration detectors, or is retained as `redacted-span`; a run bound to version 2.0.0 is re-screened or migrated without refusal. Versions 3.0.0 and 4.0.0 differ in a screening outcome or protected metadata; a missing original policy binding changes a run file; or raw-read disclosure is treated as permission for a separate Syzygy send."
  ]
}
```


### Replace predecessor lines 119–119, successor lines 127–127

```json
{
  "before": [
    "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033, REQ-polaris-generation-034, REQ-polaris-generation-048]"
  ],
  "after": [
    "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033, REQ-polaris-generation-034, REQ-polaris-generation-048, REQ-polaris-generation-047]"
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
