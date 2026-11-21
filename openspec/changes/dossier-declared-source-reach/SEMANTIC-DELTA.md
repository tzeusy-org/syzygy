# Version 2.6 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4, carrying one owner-class element the owner decided (below). No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text below was extracted from the bytes by script, not transcribed.

## Change class

Normative, two homes changed together: the specification (one MODIFIED requirement) and the screening policy it binds (a new versioned file). Neither is editorial. Classified before review so a reviewer can contradict it:

- **Owner class, decided.** Letting content the predecessor policy cannot classify reach a provider is the owner's under RFC5-14 ("A change that would let content the secret-detection policy matches, or cannot classify, reach a provider is the owner's decision (SEC-5)"). The owner decided it: decision `pursuit-2026-11-21-source-reach`, option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24, authorization boundary quoted verbatim in the policy's `successor.ownerDecision.authorizationBoundary`. [Observed] The decision packet the bead names (a file under the operator's home directory, outside the repository) is not present on this host, so the option's own label text is not reproduced here; the bead's outcome and boundary are the record used.
- **Agent class, adopted by a row.** Everything else: which formats and words the owner's option covers, the precise rules, the added denied paths and detectors, the stricter screening of the newly admitted bodies, and the specification text.
- **Not in this delta** (each would need its own decision): any word of `withheldTokens` (decision records other than ADRs among them), any path the stem and evidence lists refuse, notebooks, vendored paths, any other format, and any narrowing of a detector, active-content rule or fail-closed rule.

## Subjects

| Subject | Path | SHA-256 |
|---|---|---|
| Predecessor policy (unchanged) | `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` | `516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499` |
| Successor policy (new file) | `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` | `19b274a6ef3a83b6690bd33ada30ce0048887fa1c61cefe7501ac902020c4fef` |
| Predecessor REQ-046 text (unchanged) | `openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md` | `d17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040` |
| Successor REQ-046 text | `openspec/changes/dossier-declared-source-reach/proposed/polaris-generation/spec.md` | `0d1eacddabc398def8c7ebc9f2fb19d46a21f98cc12c05faf1ea22c5ee6f8d6a` |

## Composition

[Observed] The effective REQ-polaris-generation-046 ("Declared local-source admission") is the MODIFIED text in the predecessor file above (declared-source model version 2.0, row A-4, tag `polaris-dossier-declared-source-model-v2.0`); no later version touched it (versions 2.1 to 2.4 replace 025, 033, 035, 047, 034 and add 048). [Inferred] Once adopted, this version's complete MODIFIED REQ-046 replaces that text, composed after version 2.0 only; it does not depend on the REQ-034 train (2.2 to 2.4). Its ID, Source line, Scope line and name are unchanged; it goes from 3 to 11 scenarios; no other requirement changes.

## Specification: carried unchanged

[Observed] Every line of the predecessor's REQ-046 block appears in the new block, in order, in one of three forms: byte for byte; as the prefix of a line that appends text (the Case, Observable, Oracle and Falsifier lines); or, for the three `warrants` lines (`contracts`, `decisions`, `parent_requirements`), with entries inserted before the closing bracket. The last two forms are listed under Modified. The predecessor block's trailing blank line, which separated it from the next requirement, is not carried because no requirement follows in this file. The new block was built from the predecessor bytes by a script that inserts only at anchors it asserts occur exactly once.

## Specification: added

- Six paragraphs before the `ID:` line: (1) From version 2 …; (2) In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1 …; (3) Version 2 …; (4) A body the second stage places SHALL be screened at least as strictly as any body the predecessor admits: every predecessor detector and sco …; (5) The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text` …; (6) Letting content that the predecessor cannot classify reach a provider is the owner's decision under RFC5-14 ….
- Eight scenarios after "Clone and state remain separated": Design and decision documents sent as governance-text; Withheld words, notebooks and vendored paths stay withheld; Nested documentation admitted and scanned; Configuration admitted and screened by the configuration detectors; Credential paths denied before any read; Predecessor outcomes preserved; Agent text quoting a configuration secret refused; Run bound to the predecessor not migrated.

The six paragraphs, exactly:

```json
[
  "From version 2.6, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/2.0.0`) under REQ-polaris-generation-033's policy-capture rule: its path, identity, version and the SHA-256 of its exact committed bytes, with any missing, malformed, uncommitted or changed policy refused before content is used. The predecessor `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` (version `dossier-declared-source/1.0.0`) SHALL stay committed and unedited. It remains the binding of every run whose record names it: no step SHALL re-screen such a run under version 2.0.0 or silently move it to that version. A step of a run bound to the predecessor that can no longer read the predecessor as its binding SHALL refuse with a restart explanation that names both policy versions, and SHALL change none of the run's files.",
  "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 2.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 2.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest.",
  "Version 2.0.0 classifies a path in two stages (the policy's `classDecision`). The first stage is the predecessor's classification, unchanged. Every path the predecessor places in a class SHALL keep that class, and every body the predecessor admits, retains as `redacted-span` or excludes SHALL keep that outcome, with one exception: a path a new denied basename, suffix or directory names is denied and never read, and its exclusion reason becomes the denied path. A path the predecessor admits changes outcome only through a directory named in the policy's `deniedDirectoryNames` (`.ssh`, `.gnupg`, `.aws`, `.kube`, `.docker`, `.terraform`); the added basenames and suffixes name only paths the predecessor already left indeterminate. The second stage reads only a path the first leaves without a class and without two classes, and places nothing in a path one of whose directories is named in `vendoredDirectoryNames`. Three rules with ids place the rest: `governance-text-by-name` places in `governance-text` a reStructuredText document whose path carries the word design (`governanceTextExtensions` and `governanceTextTokens` as narrowed to what the measured sample reaches) and no word of `withheldTokens` (decision, governance, policy, security, conduct, doctrine, principle, with the plurals); `project-documentation-extended` places in `project-documentation` a Markdown, MDX or reStructuredText document at any depth and a root document's name with a non-empty document suffix (README.md, CHANGELOG.rst and the policy's other root stems) below the root, when no word of its path is in either list and no segment contains a stem of `governanceStems` (design, architecture, specification, manifesto) run on into other characters; every second-stage rule, the configuration and code rule included, refuses a path any segment of which contains a stem of `withheldStems` (governance, polic, security, conduct, doctrine, principle, decision, report, benchmark) or has a word of `evidenceWords` (result, log, audit, output, with the plurals) or of `withheldTokens`, so a run-on or camel-case name such as SecurityPolicy.md, a report, a log or an audit stays indeterminate in any format; and `code-content-extended` places in `code-content` the YAML, TOML, JSON and Terraform (`.tf`) extensions, the files named Dockerfile and Makefile or beginning `Dockerfile.`, and the policy's `languageExtensions` (`.mts`, `.bash`, `.zsh`, `.fish`). Every admitting entry of the option that reached no path in the measured five-repository sample is left out (the policy's `notAdoptedFromTheOption`), and re-admitting one needs a later successor backed by a measurement in which it reaches a path. A path two of those rules match, a notebook (`.ipynb`) and a path a second-stage rule refuses SHALL stay indeterminate, excluded under the unclassifiable exclusion as before.",
  "A body the second stage places SHALL be screened at least as strictly as any body the predecessor admits: every predecessor detector and scope detector runs over it; the policy's `configurationDetectors` run over it as well; any detector match excludes it whole under either visibility, so it is never retained as `redacted-span`; and the active-content scan runs over it with no exemption. The `configurationDetectors` SHALL also run over every cited span of such a body and over every text an agent session writes wherever the policy's detectors screen that text, and a match there refuses the text as a match of the policy's detectors does. No predecessor detector, scope detector, denied path, active-content rule, unclassifiable exclusion, strict-UTF-8, NUL or resource-limit rule, or private-object identifier and size rule is removed or narrowed by version 2.0.0; the private rule applies to every blob excluded or withheld on any ground, the new grounds included.",
  "The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class version 2.0.0 decides for the policy the run binds.",
  "Letting content that the predecessor cannot classify reach a provider is the owner's decision under RFC5-14. The owner made it: decision `pursuit-2026-11-21-source-reach`, option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24 with its authorization boundary, which this requirement keeps (no secret detector, active-content rule or fail-closed rule is weakened; no dossier run is started and no repository is read by the decision; nothing is exposed beyond the tailnet). For the words in `governanceTextTokens` only, that decision reverses the owner's screening-scope-v2 choice of variant `none` (act `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07`), which stays history. Every other part of version 2.0.0 is an agent adoption. This requirement admits no word of `withheldTokens` and no path the stem or evidence lists refuse, no notebook, no vendored path and no other format, and narrows no detector, active-content rule or fail-closed rule; any such change needs its own decision in the class RFC5-14 assigns it."
]
```

## Specification: modified

```json
[
  {
    "where": "line kept as a prefix, text appended",
    "old": "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages.",
    "new": "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor."
  },
  {
    "where": "line kept as a prefix, text appended",
    "old": "- **Observable:** Human/machine reports, stdin read count, governance/ref writes and before/after file capture.",
    "new": "- **Observable:** Human/machine reports, stdin read count, governance/ref writes and before/after file capture. Each path's class or exclusion reason under both policy versions, each body's outcome, every reader and provider request population, the run record's bound policy and classes, and every refusal's reason text."
  },
  {
    "where": "line kept as a prefix, text appended",
    "old": "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material.",
    "new": "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built."
  },
  {
    "where": "line kept as a prefix, text appended",
    "old": "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity.",
    "new": "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal."
  },
  {
    "where": "warrants line, entries appended before its closing bracket",
    "old": "  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13, RFC4-19, RFC5-14, RFC5-17]",
    "new": "  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13, RFC4-19, RFC5-14, RFC5-17, RFC5-15, RFC5-16, RFC3-30]"
  },
  {
    "where": "warrants line, entries appended before its closing bracket",
    "old": "  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2, OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, GOVERNANCE-SIMPLIFICATION-D10]",
    "new": "  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2, OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, GOVERNANCE-SIMPLIFICATION-D10, PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07, pursuit-2026-11-21-source-reach]"
  },
  {
    "where": "warrants line, entries appended before its closing bracket",
    "old": "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033]",
    "new": "  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033, REQ-polaris-generation-034, REQ-polaris-generation-048]"
  }
]
```

## Policy: changed fields

[Observed] The successor was built from the predecessor bytes by script; no predecessor field is removed, no list entry is removed or reordered, and the five predecessor content-classification rules keep every field except the project-documentation rule's descriptive `notMapped`. Detector lists (`detectors`, `scopeDetectors.detectors`), `matchAction`, `unclassifiableExclusion`, `activeContentClassification`, every `codeContentExemption` field, every `projectDocumentationExemption` field but `appliesTo`, every `secretRedaction` field but `appliesTo`, `accessBoundary`, `rawBodyHandling`, `classificationOrder` and `classificationSuccess` are byte-identical in value.

Text fields whose value changed, old and new:

```json
[
  {
    "field": "policyVersion",
    "old": "dossier-declared-source/1.0.0",
    "new": "dossier-declared-source/2.0.0"
  },
  {
    "field": "status",
    "old": "candidate-amendment-no-effect-until-owner-act",
    "new": "binds only with its agent adoption row in decisions/AGENT-ADOPTIONS.md (VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10); read that ledger, never this field"
  },
  {
    "field": "publicSourceScope.sourceVisibility.unchanged",
    "old": "every detector and scopeDetectors, matchAction, unclassifiableExclusion, sourceAdmission and its denied paths, contentClassification and its owner placements (except the code-structure rule and indeterminate's last sentence, above), instructionTextRule, targetMetadataRule, runProfileRule, activeContent and both of its exemptions, ingestBoundaries and ingestBoundaryRule, rawBodyHandling's storage (run-directory-only), logging (never), rendering (a generated editorial draft, never published) and machineResponse (never), inheritedRules, selfReferenceRule and prerequisite apply to a private repository exactly as to a public one. This scope states no retention period for a run directory under either visibility, and this version adds none. This policy declares screening rules, never observed provider transmission",
    "new": "every detector, scopeDetectors and configurationDetectors, matchAction, unclassifiableExclusion, sourceAdmission and its denied paths, contentClassification and its owner placements (except the code-structure rule and indeterminate's last sentence, above), instructionTextRule, targetMetadataRule, runProfileRule, activeContent and both of its exemptions, ingestBoundaries and ingestBoundaryRule, rawBodyHandling's storage (run-directory-only), logging (never), rendering (a generated editorial draft, never published) and machineResponse (never), inheritedRules, selfReferenceRule and prerequisite apply to a private repository exactly as to a public one. This scope states no retention period for a run directory under either visibility, and this version adds none. This policy declares screening rules, never observed provider transmission"
  },
  {
    "field": "publicSourceScope.sourceAdmission.deniedPaths",
    "old": "the base policy's sourceAdmission.deniedPathBasenames, deniedPathPrefixes, deniedPathSuffixes and pathRuleScope apply unchanged",
    "new": "the base policy's sourceAdmission.deniedPathBasenames, deniedPathPrefixes, deniedPathSuffixes, deniedDirectoryNames and pathRuleScope apply, as this version extends them: every predecessor entry is kept and entries are only added"
  },
  {
    "field": "publicSourceScope.contentClassification.rules[3].notMapped",
    "old": "nested and vendored documentation (a README below the root outside docs-tree and licenses-tree, unless an ownerPlacements entry names its path); root files named design, governance, security or code of conduct; docs-tree and licenses-tree paths whose directory or file name has a word in docExcludedTokens (decision, specification, design, governance, policy, security and conduct records, and the opt-in words unless the variant adds them); build and tooling .txt files named in docTxtExcludedNames or docTxtExcludedPrefixes; committed reports; and any other prose that no ownerPlacements entry names. The class is decided by these names alone: a governance document under docs whose path carries none of those words is mapped",
    "new": "by these four path rules: nested and vendored documentation (a README below the root outside docs-tree and licenses-tree, unless an ownerPlacements entry names its path); root files named design, governance, security or code of conduct; docs-tree and licenses-tree paths whose directory or file name has a word in docExcludedTokens; build and tooling .txt files named in docTxtExcludedNames or docTxtExcludedPrefixes; committed reports and logs; and any other prose that no ownerPlacements entry names. Of these, classDecision's second stage places non-vendored nested documentation by the project-documentation-extended rule and the documents with a word in governanceTextTokens by the governance-text-by-name rule; vendored documentation, documents with a word in withheldTokens or evidenceWords or a stem of withheldStems (reports and logs among them), nested documents with a stem of governanceStems in a run-on word, and the excluded .txt files stay unplaced"
  },
  {
    "field": "publicSourceScope.contentClassification.indeterminate",
    "old": "every other admitted blob, including documentation outside the project-documentation rule's paths (for example src/README.md), documents whose path carries a word of the rule's docExcludedTokens (decision, specification, design, governance, policy, security and conduct records) other than a root file the governance-text rule classifies, committed reports, and configuration or data in an extension outside sourceExtensions, is indeterminate and is treated as unclassifiable under unclassifiableExclusion: excluded from reading and from egress (fail closed), recorded hash-not-body, and never stored or rendered. Its path, object id and size remain code-structure, except that, for a repository whose visibility is private (sourceVisibility), its object id and size do not, under the code-structure rule",
    "new": "every other admitted blob, including vendored documentation (a path with a directory in vendoredDirectoryNames that Stage 1 does not place), documents whose path carries a word of withheldTokens (decision, governance, policy, security, conduct, doctrine and principle records), any path a second-stage rule refuses by withheldTokens, withheldStems or evidenceWords (configuration and code included: a report, log, audit or security-policy file in a configuration format stays indeterminate) and nested documentation it refuses by governanceStems, other than a root file the governance-text rule classifies, .txt files outside the docs-tree rule (and the excluded build and tooling names), notebooks (.ipynb), committed reports, symbolic-link entries the reader lists, and configuration or data in an extension or name none of sourceExtensions, configurationExtensions, languageExtensions, sourceFileNames or sourceFileNamePrefixes lists, is indeterminate and is treated as unclassifiable under unclassifiableExclusion: excluded from reading and from egress (fail closed), recorded hash-not-body, and never stored or rendered. Its path, object id and size remain code-structure, except that, for a repository whose visibility is private (sourceVisibility), its object id and size do not, under the code-structure rule"
  },
  {
    "field": "publicSourceScope.detectors",
    "old": "every detector in this policy, and every detector in scopeDetectors, applies unchanged to every body under this scope, including inert code contexts; public visibility exempts nothing, and a match excludes the whole artifact with hash-not-body provenance (matchAction, RFC5-17), except where secretRedaction retains a body as redacted-span; every detector still runs over the complete body first",
    "new": "every detector in this policy, and every detector in scopeDetectors, applies unchanged to every body under this scope, including inert code contexts; public visibility exempts nothing, and a match excludes the whole artifact with hash-not-body provenance (matchAction, RFC5-17), except where secretRedaction retains a body as redacted-span; every detector still runs over the complete body first. configurationDetectors run in addition, over the bodies, cited spans and agent text their rule names, and a match of one of them excludes the whole body"
  },
  {
    "field": "publicSourceScope.activeContent.projectDocumentationExemption.appliesTo",
    "old": "a body this scope classifies project-documentation, under any of its path rules",
    "new": "a body this scope classifies project-documentation under one of the four path rules of the contentClassification rule whose class is project-documentation and which has no id (root-document, docs-tree, licenses-tree, owner-placement); a body the project-documentation-extended rule places is not exempted and is scanned as before"
  },
  {
    "field": "publicSourceScope.secretRedaction.appliesTo",
    "old": "a body of an admitted snapshot of a repository whose visibility is public (sourceVisibility), whose path this scope classifies in one of redactedClasses, after the denied-path, strict-UTF-8, NUL and resource-limit rules pass. A body of any other class, code-content included, is excluded whole on any detector match exactly as before, and so is a body of a private repository in every class: it is never retained as redacted-span. Text an agent session writes (a draft, an inventory, a verdict, a finding) is not such a body and is screened as before",
    "new": "a body of an admitted snapshot of a repository whose visibility is public (sourceVisibility), whose path this scope classifies in one of redactedClasses, after the denied-path, strict-UTF-8, NUL and resource-limit rules pass. A body of any other class, code-content included, is excluded whole on any detector match exactly as before, and so is a body of a private repository in every class: it is never retained as redacted-span. Text an agent session writes (a draft, an inventory, a verdict, a finding) is not such a body and is screened as before. A project-documentation body is in redactedClasses here only when classDecision's Stage 1 places it (one of the four path rules); a body any Stage 2 rule places is excluded whole on any detector match, in every class and under either visibility. Agent text is also screened by configurationDetectors, and a match refuses it"
  },
  {
    "field": "sourceAdmission.pathRuleScope",
    "old": "apply basename and prefix rules to the final segment, and suffix rules to the complete final segment, of each normalized repository-relative path",
    "new": "apply basename and prefix rules to the final segment, and suffix rules to the complete final segment, of each normalized repository-relative path; and apply directory-name rules to every segment of the path except the final one, so a path any of whose directories is named in deniedDirectoryNames is denied wherever that directory sits. Every rule compares case-insensitively, as the predecessor's rules are compared, and a denied path is never read"
  }
]
```

## Policy: list entries appended (none removed)

```json
[
  {
    "field": "sourceAdmission.deniedPathBasenames",
    "kept": 7,
    "added": [
      ".npmrc",
      ".netrc",
      "_netrc",
      ".pypirc",
      ".git-credentials",
      ".dockercfg",
      ".dockerconfigjson",
      ".pgpass",
      ".htpasswd",
      ".s3cfg",
      ".boto",
      "kubeconfig",
      "kubeconfig.yaml",
      "kubeconfig.yml",
      "kubeconfig.json",
      "id_dsa",
      "id_ecdsa",
      "id_ecdsa_sk",
      "id_ed25519_sk",
      "secrets.yml",
      "secrets.yaml",
      "secrets.toml",
      "secrets.json",
      "credentials.yml",
      "credentials.yaml",
      "credentials.toml",
      "credentials.json"
    ]
  },
  {
    "field": "sourceAdmission.deniedPathSuffixes",
    "kept": 4,
    "added": [
      ".tfstate",
      ".tfstate.backup",
      ".tfvars",
      ".tfvars.json",
      ".kubeconfig",
      ".ppk",
      ".jks",
      ".keystore"
    ]
  }
]
```

## Policy: fields added

```json
[
  {
    "field": "publicSourceScope.contentClassification.rules[5]",
    "new": {
      "id": "governance-text-by-name",
      "class": "governance-text",
      "rule": "the body of an admitted blob, after every screening step, whose final path segment ends with one of governanceTextExtensions and is longer than it, such that a word of some directory segment, or of the final segment with that extension removed, is in governanceTextTokens, and no word of any directory segment or of the final segment with that extension removed is in withheldTokens. A path with an empty, '.' or '..' segment, a backslash or a leading or trailing '/' matches nothing. Matching compares a copy of the path with its ASCII letters A-Z folded to a-z and nothing else folded, normalized or decoded, and words are split as the docs-tree rule splits them (at each character in docTokenSeparators); the path is carried as admitted. No extractor runs: the class is by path and the body is admitted as whole-blob spans. The rule is read only in classDecision's second stage. Besides word matching, the rule refuses a path any directory segment of which, or whose final segment with the matched extension or suffix removed, contains one of withheldStems as a substring of its folded copy, or has a word in evidenceWords: a run-on or camel-case name (SecurityPolicy.md, CodeOfConduct.md, audit-report.md) stays indeterminate. Such a body is a target's design text, which RFC5-14 places in governance-text and never in project-documentation; it is data and never governing policy for project:syzygy (RFC5-16, RFC3-30, selfReferenceRule). It is not redacted (secretRedaction.appliesTo), so any detector match, configurationDetectors included, excludes it whole, and no active-content exemption names it, so it is scanned as before",
      "governanceTextExtensions": [
        ".rst"
      ],
      "governanceTextTokens": [
        "design"
      ]
    }
  },
  {
    "field": "publicSourceScope.contentClassification.rules[6]",
    "new": {
      "id": "project-documentation-extended",
      "class": "project-documentation",
      "rule": "the body of an admitted blob, after every screening step, whose path is matched by at least one of the two path rules below and in which no word of any directory segment, and no word of the final segment with its matched extension or suffix removed, is in the four-rule project-documentation rule's docExcludedTokens, and no such segment contains one of governanceStems as a substring of its folded copy (DesignDoc.md and ArchitectureOverview.md stay indeterminate rather than misclassified). A path with an empty, '.' or '..' segment, a backslash or a leading or trailing '/' matches nothing. Matching compares a copy of the path with its ASCII letters A-Z folded to a-z and nothing else folded, normalized or decoded, and words are split as the docs-tree rule splits them (at each character in docTokenSeparators); the path is carried as admitted. No extractor runs: the class is by path and the body is admitted as whole-blob spans. The rule is read only in classDecision's second stage. Besides word matching, the rule refuses a path any directory segment of which, or whose final segment with the matched extension or suffix removed, contains one of withheldStems as a substring of its folded copy, or has a word in evidenceWords: a run-on or camel-case name (SecurityPolicy.md, CodeOfConduct.md, audit-report.md) stays indeterminate. The class is decided by these paths alone: a file's own claim about itself places nothing (RFC5-14). It is not redacted (secretRedaction.appliesTo), so any detector match, configurationDetectors included, excludes it whole, and activeContent.projectDocumentationExemption does not name it, so it is scanned as before",
      "pathRules": [
        {
          "id": "prose-document",
          "rule": "a path of any number of segments whose final segment ends with one of proseExtensions and is longer than it"
        },
        {
          "id": "nested-root-document",
          "rule": "a path of two or more segments whose final segment, read as the root-document rule reads a one-segment path (its rootStemNumericPrefix, documentSuffixes and rootStems), is a root document by a documentSuffixes entry other than the empty one: an extensionless name below the root (bin/changes, src/app/history) matches nothing"
        }
      ],
      "proseExtensions": [
        ".md",
        ".mdx",
        ".rst"
      ]
    }
  },
  {
    "field": "publicSourceScope.contentClassification.rules[7]",
    "new": {
      "id": "code-content-extended",
      "class": "code-content",
      "rule": "the body of an admitted blob, after every screening step, whose final path segment ends with one of configurationExtensions or languageExtensions, equals one of sourceFileNames, or begins with one of sourceFileNamePrefixes, each compared case-sensitively as ASCII as sourceExtensions are. Configuration (YAML, TOML, JSON, Terraform, Dockerfiles and Makefiles) is code-content, as configuration in a predecessor extension already is; it is source the project builds or runs from, never prose. No extractor runs: the class is by name and the body is admitted as whole-blob spans. The rule is read only in classDecision's second stage. It is not redacted (secretRedaction.appliesTo names no code-content body), so any detector match, configurationDetectors included, excludes it whole; activeContent.codeContentExemption names none of these extensions or names, so the body is scanned for active content as before. The rule refuses a path any directory segment of which, or whose final segment with the matched extension removed (or, for a sourceFileNames or sourceFileNamePrefixes match, the whole final segment), has a word in withheldTokens or evidenceWords or contains one of withheldStems as a substring of its folded copy, words being split and the copy folded as the documentation rules do: reports/benchmark-results.json, test-output.json, audit-log.yaml, security-policy.yaml, governance/decisions.json and SECURITY.yml stay indeterminate. Every Stage 2 rule applies these three refusals",
      "configurationExtensions": [
        ".yml",
        ".yaml",
        ".toml",
        ".json",
        ".tf"
      ],
      "languageExtensions": [
        ".mts",
        ".bash",
        ".zsh",
        ".fish"
      ],
      "sourceFileNames": [
        "Dockerfile",
        "Makefile"
      ],
      "sourceFileNamePrefixes": [
        "Dockerfile."
      ]
    }
  },
  {
    "field": "publicSourceScope.contentClassification.withheldTokens",
    "new": [
      "decision",
      "decisions",
      "governance",
      "policy",
      "policies",
      "security",
      "conduct",
      "doctrine",
      "doctrines",
      "principle",
      "principles"
    ]
  },
  {
    "field": "publicSourceScope.contentClassification.vendoredDirectoryNames",
    "new": [
      "node_modules",
      "bower_components",
      "jspm_packages",
      "vendor",
      "vendored",
      "third_party",
      "third-party",
      "thirdparty",
      "external",
      "externals",
      "extern"
    ]
  },
  {
    "field": "publicSourceScope.contentClassification.withheldStems",
    "new": [
      "governance",
      "polic",
      "security",
      "conduct",
      "doctrine",
      "principle",
      "decision",
      "report",
      "benchmark"
    ]
  },
  {
    "field": "publicSourceScope.contentClassification.evidenceWords",
    "new": [
      "result",
      "results",
      "log",
      "logs",
      "audit",
      "audits",
      "output",
      "outputs"
    ]
  },
  {
    "field": "publicSourceScope.contentClassification.governanceStems",
    "new": [
      "design",
      "architecture",
      "specification",
      "manifesto"
    ]
  },
  {
    "field": "publicSourceScope.contentClassification.classDecision",
    "new": "a path's class is decided in two stages, after the denied-path rules and the detectors run over the path. Stage 1 is the predecessor's decision, unchanged: the five rules without an id (governance-text by governanceTextPaths, code-structure, code-content by sourceExtensions, project-documentation by exactly one of its four path rules, derived-composites) give a path at most one class, and a path they give two classes is indeterminate, exactly as before. A path Stage 1 places keeps that class and Stage 2 never reads it. Stage 2 reads only a path Stage 1 places in no class and does not find two classes for: if any directory segment of the path, after the fold, is one of vendoredDirectoryNames, the path is indeterminate; otherwise each of the three rules with an id (governance-text-by-name, project-documentation-extended, code-content-extended) is tried, and the path takes the class of the one that matches. A path two of them match is indeterminate (by construction governance-text-by-name and project-documentation-extended never both match: one requires a word of governanceTextTokens, the other forbids every word of docExcludedTokens). A path no rule places is indeterminate"
  },
  {
    "field": "publicSourceScope.configurationDetectors",
    "new": {
      "rule": "these detectors are added for this scope and run in addition to every detector in this policy and in scopeDetectors, which still run everywhere they ran. They run over the complete body of every blob classDecision's Stage 2 places (governance-text-by-name, project-documentation-extended and code-content-extended alike), including inert code contexts and comments, before any other step uses it; over every cited span of such a body; and over every text an agent session writes (a draft, an inventory, a verdict, a finding), wherever the policy's detectors screen it. They do not run over a body Stage 1 places, so no predecessor outcome for such a body changes. Each is read as the policy's detectors are (id, kind, pattern, flags, every match from every offset), and a match excludes the whole body or refuses the agent text (matchAction): a body these rules reach is never retained as redacted-span",
      "detectors": [
        {
          "id": "config-credential-key",
          "kind": "regular-expression",
          "pattern": "(?:password|passwd|pwd|passphrase|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|credentials?|auth[_-]?token|auth)[A-Za-z0-9_.-]{0,64}[\"']?[ \\t]*(?:[:?+]?=|:)[ \\t]*[\"']?(?![$<{])[^\\s\"']{8,}",
          "flags": "gi"
        },
        {
          "id": "kubernetes-secret-kind",
          "kind": "regular-expression",
          "pattern": "[\"']?kind[\"']?[ \\t]*:[ \\t]*[\"']?Secret[\"']?(?=[ \\t]*(?:[,}#\\r\\n]|$))",
          "flags": "g"
        },
        {
          "id": "hcl-secret-variable-default",
          "kind": "regular-expression",
          "pattern": "variable[ \\t]+\"(?=[^\"\\r\\n]*?(?:password|passwd|secret|token|key|credential))[^\"\\r\\n]*\"[ \\t]*\\{[^}]*?default[ \\t]*=[ \\t]*\"[^\"$\\r\\n]{8,}\"",
          "flags": "gi"
        },
        {
          "id": "dockerfile-secret-env",
          "kind": "regular-expression",
          "pattern": "(?<![^\\r\\n])[ \\t]*(?:ENV|ARG)[ \\t]+[A-Za-z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY)[A-Za-z0-9_]*[ \\t]+[^\\s\"'<>$=]{8,}",
          "flags": "gi"
        },
        {
          "id": "netrc-machine-password",
          "kind": "regular-expression",
          "pattern": "machine[ \\t]+[^\\s]+[ \\t]+(?:login[ \\t]+[^\\s]+[ \\t]+)?password[ \\t]+[^\\s]+",
          "flags": "gi"
        },
        {
          "id": "authorization-header-credential",
          "kind": "regular-expression",
          "pattern": "authorization[\"']?[ \\t]*[:=][ \\t]*[\"']?(?:basic|bearer|token)[ \\t]+[A-Za-z0-9+/=._~-]{8,}",
          "flags": "gi"
        }
      ],
      "consequence": "[Inferred] a configuration body holding a password, secret, token or key under a quoted or unquoted key (JSON, YAML, TOML, HCL, Makefile and Dockerfile assignment forms; the keyword may sit anywhere in the key, so secret_key, SECRET_KEY_BASE, db_password_prod and a Docker auths entry's auth are matched; the predecessor's credential-assignment form reads neither a quoted JSON key nor such compound keys), a Kubernetes Secret manifest (whose base64 values no other detector reads), a Terraform variable whose name names a secret and which carries a default, a Dockerfile ENV or ARG naming a secret with a value, a netrc machine line, or an Authorization header value, is excluded whole. Residuals: a secret under a key that contains none of the keywords (for example a bare value in a list, or a key named only pass or pw), a value of fewer than eight characters or one containing whitespace or a quote, a value that opens with $, < or { (read as a reference or template), an encoded, encrypted (an Ansible Vault body) or split value, and a secret whose key and value sit on different lines are not matched. Keywords match inside longer words, so an author, tokenizer or passwordless key with a long value is matched and withholds its body (fail closed). No pattern nests an ambiguous quantifier: each bounds its quantifiers before its value run, and hcl-secret-variable-default finds its keyword by a lazy look-ahead and then reads the quoted name once (a name holds no quote, so the look-ahead form matches exactly the text the two-unbounded-runs form would, without trying every split of the name); matching from one offset is linear in the body length"
    }
  },
  {
    "field": "sourceAdmission.deniedDirectoryNames",
    "new": [
      ".ssh",
      ".gnupg",
      ".aws",
      ".kube",
      ".docker",
      ".terraform"
    ]
  },
  {
    "field": "successor",
    "new": {
      "predecessor": {
        "path": ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json",
        "sha256": "516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499",
        "policyVersion": "dossier-declared-source/1.0.0",
        "relation": "this file is a new version beside the predecessor, which is not edited. The predecessor stays the binding of every run whose record binds it, and the base the URL origin/species policy v1 names by its reviewedSha256; which file a run binds is stated by REQ-polaris-generation-046 from specification version 2.6, never by this field"
      },
      "ownerDecision": {
        "id": "pursuit-2026-11-21-source-reach",
        "option": "A",
        "recordedAt": "2026-11-21T03:53:55+00:00",
        "recordedOn": "bead syzygy-3efd.24 (description, 'Owner decision'); the decision packet it names is not in the repository",
        "authorizationBoundary": "no secret detector, active-content rule or fail-closed rule is weakened; no dossier run is started; no repository is read by this decision; nothing is exposed beyond the tailnet; the choice does not itself change the policy file, which changes only by a reviewed successor recorded as an agent adoption with its revert command.",
        "ownerClass": "RFC5-14's last owner-reserved change: content the secret-detection policy cannot classify today (configuration formats, nested documentation and the documents withheld by name) is admitted to the declared provider; the owner decided it. Everything else in this file is the agent's, adopted by an AGENT-ADOPTIONS.md row"
      },
      "reverses": {
        "act": ".syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md",
        "what": "the signed screening-scope-v2 choice of variant none (that act's line 'Chosen variant: none'), under which every docs-tree and licenses-tree path whose directory or file name has a word in docExcludedTokens is withheld, for the words in governanceTextTokens only: such a document is now classified governance-text by the governance-text-by-name rule and may be sent as that class. The words in withheldTokens keep variant none's treatment: still indeterminate",
        "authority": "ownerDecision above; the act record stays history and is not edited"
      },
      "notAdoptedFromTheOption": [
        {
          "what": "every admitting entry with no path in the measured sample: the census of the five public repositories (docs/evidence/syzygy-3efd-24/citable-share-v2-2026-11-22.json, its zeroPathEntries) found no path for them, so they are left out rather than widened for no gain; among them Markdown, MDX and AsciiDoc design, architecture, ADR, RFC, specification and manifesto documents, AsciiDoc prose, .txt files in nested docs trees, HCL, protocol buffers, CMake and most added languages",
          "why": "the bead's rule: a format that contributes almost nothing is left out. Re-admitting any of them needs a later successor backed by a measurement in which it reaches a path"
        },
        {
          "what": "notebook text cells (.ipynb)",
          "why": "a text cell is a JSON string inside the notebook blob, so admitting it needs an extractor and a quotation rule that locates a cited span in the decoded cell rather than in the blob's bytes (REQ-polaris-generation-034 verifies every quotation against the pinned blob); the whole notebook body, outputs included, is not what the option admits. A .ipynb path stays indeterminate until a later successor states that extractor"
        },
        {
          "what": "documents whose path carries a word in withheldTokens",
          "why": "the option names design, architecture, ADR, RFC, spec and manifesto documents; governance, policy, security, conduct, doctrine and principle records are not named, so they stay indeterminate, and admitting them is asked of the owner. Decision records other than ADRs (the words decision and decisions) are held back with them until the owner says whether option A covers them; an ADR is admitted by the words adr and adrs"
        },
        {
          "what": "run-on and camel-case names carrying a withheld, report or governance word",
          "why": "a file such as SecurityPolicy.md, CodeOfConduct.md or DesignDoc.md folds to one word that is in no token list, so word matching alone would place it in project-documentation; the second stage therefore also refuses a path (documentation, configuration or code alike) any of whose segments contains a stem of withheldStems as a substring or has a word of evidenceWords or withheldTokens, and project-documentation-extended refuses a segment containing a stem of governanceStems, so such paths stay indeterminate"
        }
      ]
    }
  }
]
```

## Why nothing is weakened

[Inferred] Each predecessor outcome is kept or made stricter:

1. Stage 1 is the predecessor's classification, read only from the predecessor's five rules, whose rule texts, lists and pinned prose are unchanged; a Stage-1 path never reaches Stage 2. So a path the predecessor places keeps its class, and a body keeps its outcome (admitted, redacted-span or excluded), except where a new denied directory now denies the path before any read.
2. Every predecessor detector and scope detector still runs everywhere it ran; `configurationDetectors` only add matches, and they run over no Stage-1 body (so they cannot change a Stage-1 outcome) but do run over agent text, where they can only add refusals.
3. The two exemptions and the redaction that lift a predecessor rule for some bodies are narrowed in their new texts so that they name no Stage-2 body: such a body is scanned for active content and excluded whole on any detector match, under either visibility. The predecessor bodies they named are named exactly as before (the four path rules of the predecessor project-documentation rule; code-content bodies in `exemptExtensions`, which this version does not extend).
4. Denied-path lists only gain entries, and one rule kind is added; an unclassifiable blob (no rule places it, or two do) stays excluded from reading and egress; the private object-id and size rule is unchanged and applies to every new exclusion ground.
5. What is newly admitted is what the owner's option names, minus notebooks, the `withheldTokens` words and every admitting entry that reached no path in the measured five-repository sample (`docs/evidence/syzygy-3efd-24/citable-share-v2-2026-11-22.json`, `zeroPathEntries`); it reaches the declared provider only under SEC-2, as its true RFC5-14 class.

## Displaced texts

[Observed] The predecessor `projectDocumentationExemption.appliesTo` and `secretRedaction.appliesTo` texts are pinned by digest in `packages/polaris-generation-core/src/public-source-classification.ts` (`DOCUMENTATION_EXEMPTION_TEXTS.appliesTo`) and `packages/polaris-generation-core/src/secret-redaction.ts` (`APPLIES_TO_V8`); the screen therefore refuses version 2.0.0 until its implementation pins the new texts. That refusal is the fail-closed behaviour the pins exist for; the implementation is the follow-on code change in `tasks.md`.
