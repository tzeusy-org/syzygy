# Dossier declared-source reach

Candidate version 2.6; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED requirement, REQ-polaris-generation-046, whose complete text below replaces the effective text that declared-source model version 2.0 gave it. It binds the screening-policy successor `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (version `dossier-declared-source/2.0.0`), which admits, on the owner's decision `pursuit-2026-11-21-source-reach` (option A), Markdown and reStructuredText design, architecture, ADR, RFC, specification and manifesto documents as governance-text, and, narrowed to the formats a measured sample reaches, nested Markdown, MDX and reStructuredText documentation as project-documentation, and YAML, TOML, JSON, Terraform, Dockerfiles, Makefiles and four shell and TypeScript-module extensions as code-content, and which adds denied paths and configuration-format detectors. Every other sentence and scenario of the predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. Under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10 the adopting agent records the adoption; no owner adoption is claimed beyond the owner's recorded decision.

## MODIFIED Requirements

### Requirement: Declared local-source admission

The local init command SHALL accept a normalized credential-free locator and declared repository identity, or derive the identity by the existing locator derivation rule when unambiguous without consulting consent records. Locator parsing, credential suppression and identity grammar remain unchanged. Invalid locators SHALL refuse without printing or storing the submitted secret-bearing URL. The local command SHALL record its inputs and pin as Inferred provenance, make no network request, and leave the supplied clone unchanged.

The admitted subject SHALL be one Repository entity with the declared role `observed-source`, recorded in the run and disclosed as Inferred in the brief and every page's human and machine form. Governance-root material in that repository SHALL retain the same repository identity: `governance-root` is a role of a Repository, never a second entity or identity created from a governance directory. This local observation mode declares only its subject's observed-source role; it instantiates no separate governance-root entity or graph subsystem.

Initialization SHALL validate the run configuration and state-root separation before using content, verify the selected commit through the pinned reader, and bind the committed screening policy before issuing a brief. It SHALL never ask a consent question or read/write an observation consent, provider/drawer statement, launch recording reference or write-consent record. A valid public or private local source requires no such record. Existing state-directory separation and interrupted-write safety continue to apply. URL acquisition and automatic trunk selection remain a separate F-3 delivery and are not reported as successful by this local command.

The run record and every rendered page SHALL disclose in human and machine form the normalized credential-free locator and repository identity, their attributed Inferred source, whether the identity was operator-supplied or derived by the retained last-two-segments rule, and that the clone configuration is writable by the agent sessions. Locator hints are never repository identity. Surviving normalization residuals SHALL be explicit: hosts and earlier path segments do not distinguish derived identities; replacement/joining with hyphens can collide; dropping ports and case folding can merge distinct locators. An explicit identity can distinguish subjects, but a declaration is not observed identity proof. Record matching, reliance on another subject's consent/statement, record-list warnings, terminal phrases and recording-reference publication warnings retire because no such records are read or written. These retirements do not erase the normalization collisions. Per-page033's sentence/appendix/machine arrangement carries these human disclosures without a terminal question.

For this replacement's change-adoption/status consequences,046 SHALL use033's change-status contract: effective default-branch adoption and its adopter/record are distinct from candidate stamps, semantic successors require new adoption, and candidate N/A judgments map nothing before actual adoption. This is specification/policy/judgment provenance, never a per-repository record lookup or a read/provider admission prerequisite.

From version 2.6, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/2.0.0`) under REQ-polaris-generation-033's policy-capture rule: its path, identity, version and the SHA-256 of its exact committed bytes, with any missing, malformed, uncommitted or changed policy refused before content is used. The predecessor `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` (version `dossier-declared-source/1.0.0`) SHALL stay committed and unedited. It remains the binding of every run whose record names it: no step SHALL re-screen such a run under version 2.0.0 or silently move it to that version. A step of a run bound to the predecessor that can no longer read the predecessor as its binding SHALL refuse with a restart explanation that names both policy versions, and SHALL change none of the run's files.

In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 2.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 2.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest.

Version 2.0.0 classifies a path in two stages (the policy's `classDecision`). The first stage is the predecessor's classification, unchanged. Every path the predecessor places in a class SHALL keep that class, and every body the predecessor admits, retains as `redacted-span` or excludes SHALL keep that outcome, with one exception: a path a new denied basename, suffix or directory names is denied and never read, and its exclusion reason becomes the denied path. A path the predecessor admits changes outcome only through a directory named in the policy's `deniedDirectoryNames` (`.ssh`, `.gnupg`, `.aws`, `.kube`, `.docker`, `.terraform`); the added basenames and suffixes name only paths the predecessor already left indeterminate. The second stage reads only a path the first leaves without a class and without two classes, and places nothing in a path one of whose directories is named in `vendoredDirectoryNames`. Three rules with ids place the rest: `governance-text-by-name` places in `governance-text` a Markdown or reStructuredText document whose path carries a word of `governanceTextTokens` (adr, rfc, spec, specification, design, architecture and manifesto, each with its plural: the classes the owner's decision names, kept whatever a sample reaches) and no word of `withheldTokens` (decision, governance, policy, security, conduct, doctrine, principle, with the plurals); `project-documentation-extended` places in `project-documentation` a Markdown, MDX or reStructuredText document at any depth and a root document's name with a non-empty document suffix (README.md, CHANGELOG.rst and the policy's other root stems) below the root, when no word of its path is in either list and no segment contains a stem of `governanceStems` (design, architecture, specification, manifesto) run on into other characters; every second-stage rule, the configuration and code rule included, refuses a path any segment of which contains a stem of `withheldStems` (governance, polic, security, conduct, doctrine, principle, decision, report, benchmark) or has a word of `evidenceWords` (result, log, audit, output, with the plurals; for the configuration and code rule its own `codeEvidenceWords`, the same words less outputs, so a Terraform module's conventional outputs.tf is code) or of `withheldTokens`, so a run-on or camel-case name such as SecurityPolicy.md, a report, a log or an audit stays indeterminate in any format; and `code-content-extended` places in `code-content` the YAML, TOML, JSON and Terraform (`.tf`) extensions, the files named Dockerfile and Makefile or beginning `Dockerfile.` (a name beginning so that ends in a documentation extension of `prefixExcludedExtensions`, such as Dockerfile.md, is never placed by the prefix), and the policy's `languageExtensions` (`.mts`, `.bash`, `.zsh`, `.fish`). Every admitting format entry that reached no path in the measured five-repository sample is left out (the policy's `notAdoptedFromTheOption`), and re-admitting one needs a later successor backed by a measurement in which it reaches a path; an entry that implements a class the owner's decision names explicitly is kept regardless of the sample. A path two of those rules match, a notebook (`.ipynb`) and a path a second-stage rule refuses SHALL stay indeterminate, excluded under the unclassifiable exclusion as before.

A body the second stage places SHALL be screened at least as strictly as any body the predecessor admits: every predecessor detector and scope detector runs over it; the policy's `configurationDetectors` run over it as well; any detector match excludes it whole under either visibility, so it is never retained as `redacted-span`; and the active-content scan runs over it with no exemption. The `configurationDetectors` SHALL also run over every cited span of such a body and over every text an agent session writes wherever the policy's detectors screen that text, and a match there refuses the text as a match of the policy's detectors does. No predecessor detector, scope detector, denied path, active-content rule, unclassifiable exclusion, strict-UTF-8, NUL or resource-limit rule, or private-object identifier and size rule is removed or narrowed by version 2.0.0; the private rule applies to every blob excluded or withheld on any ground, the new grounds included.

The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class version 2.0.0 decides for the policy the run binds.

Letting content that the predecessor cannot classify reach a provider is the owner's decision under RFC5-14. The owner made it: decision `pursuit-2026-11-21-source-reach`, option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24 with its authorization boundary, which this requirement keeps (no secret detector, active-content rule or fail-closed rule is weakened; no dossier run is started and no repository is read by the decision; nothing is exposed beyond the tailnet). For the words in `governanceTextTokens` only, that decision reverses the owner's screening-scope-v2 choice of variant `none` (act `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07`), which stays history. Every other part of version 2.0.0 is an agent adoption. This requirement admits no word of `withheldTokens` and no path the stem or evidence lists refuse, no notebook, no vendored path and no other format, and narrows no detector, active-content rule or fail-closed rule; any such change needs its own decision in the class RFC5-14 assigns it.

ID: REQ-polaris-generation-046
Source: VIS-2; VIS-4; SEC-2; SEC-5; GOVERNANCE-SIMPLIFICATION-D10.
Scope: v1-mandatory

#### Scenario: No terminal is required

- **WHEN** valid local-source declarations are supplied with non-terminal stdin and no launch records
- **THEN** initialization succeeds without reading stdin or writing governance records

#### Scenario: Credential-bearing locator is refused

- **WHEN** the supplied locator violates the retained credential or locator grammar
- **THEN** initialization names the violated rule and emits neither the locator nor its credential bytes

#### Scenario: Clone and state remain separated

- **WHEN** the state root resolves inside or around the clone, or a selected commit differs from local HEAD
- **THEN** initialization refuses before creating the run, with no change to the clone

#### Scenario: Design and decision documents sent as governance-text

- **WHEN** version 2.0.0 is bound and the pinned tree holds docs/adr/0001-use-postgres.md, `ARCHITECTURE.md`, rfcs/0001-thing.md and docs/design.rst, none matched by a detector or holding active content, and docs/design.adoc
- **THEN** each of the first four is admitted as `governance-text` by `governance-text-by-name`, may be cited, and reaches the declared provider only as `governance-text`
- **AND** the run record names `governance-text` among its eligible classes
- **AND** the AsciiDoc document stays indeterminate: AsciiDoc is a format this version does not admit

#### Scenario: Withheld words, notebooks and vendored paths stay withheld

- **WHEN** the pinned tree holds docs/security/policy.md, `GOVERNANCE.md`, `CODE_OF_CONDUCT.md`, `SecurityPolicy.md`, pkg/CodeOfConduct.md, docs/decisions/0001-x.md, reports/q3-audit.md, notebooks/intro.ipynb, node_modules/x/README.md, vendor/k8s/deploy.yaml, reports/benchmark-results.json, `test-output.json`, `audit-log.yaml`, `security-policy.yaml`, governance/decisions.json and `SECURITY.yml`
- **THEN** each is indeterminate, excluded as an unknown extraction class, and its body is never read, cited or sent

#### Scenario: Nested documentation admitted and scanned

- **WHEN** the pinned tree holds packages/api/README.md with an HTML badge, packages/api/docs/guide.md with none, packages/api/docs/guide.adoc, and a root `README.md` with the same badge
- **THEN** both nested paths are `project-documentation` by `project-documentation-extended`, the guide is admitted and the nested README is excluded whole as active content
- **AND** the root README is admitted under the project-documentation exemption exactly as under the predecessor
- **AND** the AsciiDoc guide stays indeterminate

#### Scenario: Configuration admitted and screened by the configuration detectors

- **WHEN** config/app.json holds `"password": "hunter2hunter2"`, config/app.yml holds `SECRET_KEY_BASE: abcdef0123456789`, deploy/secret.yaml holds a manifest with `kind: Secret`, and `Cargo.toml`, `outputs.tf`, modules/x/outputs.tf and design/Dockerfile.md hold none of them, in a public and then in a private repository
- **THEN** the first three are excluded whole for a secret match, `Cargo.toml` and both `outputs.tf` files are admitted as `code-content`, and design/Dockerfile.md is admitted as `governance-text` by `governance-text-by-name`, never as `code-content`, under both visibilities
- **AND** none of the three is retained as `redacted-span`, and the private repository's excluded object ids and sizes appear on no page

#### Scenario: Credential paths denied before any read

- **WHEN** the pinned tree holds `terraform.tfstate`, env/prod.tfvars, `.npmrc`, `.netrc`, `kubeconfig`, config/secrets.yml, .kube/config, deploy/.docker/config.json and .ssh/deploy.sh
- **THEN** each is a denied path whose blob is never read, and every path the predecessor denies is still denied

#### Scenario: Predecessor outcomes preserved

- **WHEN** one controlled tree and its bodies are screened under the predecessor and under version 2.0.0
- **THEN** every path the predecessor places keeps its class and every body keeps its outcome, except the paths below a directory in `deniedDirectoryNames`, which become denied
- **AND** a path the predecessor leaves indeterminate either keeps that outcome, becomes denied by a new denied basename, suffix or directory, or is placed by the second stage

#### Scenario: Agent text quoting a configuration secret refused

- **WHEN** an agent draft quotes the line `aws_secret_access_key = AbCdEfGhIjKlMn`
- **THEN** the draft is refused for a secret match and the quoted value appears in no record, report or page

#### Scenario: Run bound to the predecessor not migrated

- **WHEN** a step is asked of a run whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` and the predecessor can no longer be read as its binding
- **THEN** the step refuses with a restart explanation naming both policy versions, and no file of the run changes

Form: event-response.

- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor.
- **Observable:** Human/machine reports, stdin read count, governance/ref writes and before/after file capture. Each path's class or exclusion reason under both policy versions, each body's outcome, every reader and provider request population, the run record's bound policy and classes, and every refusal's reason text.
- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built.
- **Oracle independence:** Expected outcomes use fixture literals and independent filesystem/process capture, never admission helpers.
- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal.

```yaml
warrants:
  primary: SEC-5
  doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4, VIS-7]
  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13, RFC4-19, RFC5-14, RFC5-17, RFC5-15, RFC5-16, RFC3-30]
  policies: [CC-SPEC-2, CC-SPEC-4, CC-SPEC-3, CC-REV-2, CC-SPEC-8, CC-SPEC-10]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2, OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, GOVERNANCE-SIMPLIFICATION-D10, PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07, pursuit-2026-11-21-source-reach]
  topology: []
  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033, REQ-polaris-generation-034, REQ-polaris-generation-048]
```
