# Version 2.13 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and every difference listed below was extracted from the bytes by script (a line diff of the requirement block and a recursive walk of both policy files), not transcribed.

## Change class

Normative, two homes changed together: the specification (one MODIFIED requirement) and the screening policy it binds (a new versioned file). Neither is editorial. Classified before review so a reviewer can contradict it:

- **Agent class.** Every re-admitted entry is a format the owner's decision `pursuit-2026-11-21-source-reach` (option A) names, which version 2.0.0's agent narrowing (version 2.6's D7) left out for reaching no path in a five-repository sample. Re-admitting it on a measurement in which it reaches a path is what that narrowing's own text requires, and lets nothing reach a provider that the owner's decision does not already admit. No detector, active-content rule or fail-closed rule changes (SEC-5).
- **Not in this delta** (each would need its own decision): `docTreeRootsAnyDepth` and its path rule, the ten entries reaching no path, any word of `withheldTokens`, any path the stem and evidence lists refuse, notebooks, vendored paths, any format version 2.0.0's narrowing did not remove, and any narrowing of a detector, active-content rule or fail-closed rule.

## Subjects

| Subject | Path | SHA-256 |
|---|---|---|
| Predecessor policy 1.0.0 (unchanged) | `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` | `516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499` |
| Predecessor policy 2.0.0 (unchanged) | `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` | `8c10531f57d129ad5d402e53d7d9fdc741387f6eaab701bbdb46419181b11967` |
| Successor policy 3.0.0 (new file) | `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json` | `1b9726884376922805fc8ebd973bdb4dc25ff54464264cdb995662806117a16e` |
| Predecessor REQ-046 text, version 2.6 (unchanged) | `openspec/changes/dossier-declared-source-reach/proposed/polaris-generation/spec.md` | `73047a45f1ee296e52fcdbe898ef14fb386b78cf13ce5b6c1fc097d1f12b6072` |
| Successor REQ-046 text, version 2.13 | `openspec/changes/dossier-declared-source-readmission/proposed/polaris-generation/spec.md` | `494dcd81b3bb8d0638c5a517e9fa1005720cac8b39cba34751f5f6ee62eeb018` |
| Census the re-admission rests on | `docs/evidence/syzygy-3efd-69/citable-share-v3-probe-2026-11-22.json` | `14557d84d103bff6a9bebcf8f912165030555084226fdc689a6ec6ed3d8f76a3` |

## Composition

[Observed] The effective REQ-polaris-generation-046 is the MODIFIED text of version 2.6 (row A-27, tag `polaris-dossier-declared-source-reach-v2.6`); versions 2.7 to 2.12 replace REQ-034 only (2.12 is the coverage pre-check, A-40), and the candidate infrastructure recognizers (syzygy-3efd.26) replace REQ-034 only. [Inferred] Once adopted, this version's complete MODIFIED REQ-046 replaces version 2.6's text, composed after 2.6 only; it does not depend on the REQ-034 train. Its ID, Source line, Scope line, name and warrants are unchanged; it goes from 11 to 13 scenarios; no other requirement changes.

## Specification

[Observed] The new requirement block was built from version 2.6's bytes by a script that replaces only at anchors it asserts occur exactly once (18 anchors); the line diff below is computed from the two files. The file's title and header paragraph (before `## MODIFIED Requirements`) are new and carry no requirement text.

### Line diff of the REQ-046 block (from `### Requirement:` to the end)

[Observed] 108 lines in 2.6's block, 121 in 2.13's (counted as split on newline from `### Requirement:` to the end of the file, so the empty string after the final newline is one line); 18 replaced or removed, 31 replacing or added; every other line is byte for byte.

#### replace: 2.6 lines 13-13 -> 2.13 lines 13-13

```json
{
  "2.6": [
    "From version 2.6, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/2.0.0`) under REQ-polaris-generation-033's policy-capture rule: its path, identity, version and the SHA-256 of its exact committed bytes, with any missing, malformed, uncommitted or changed policy refused before content is used. The predecessor `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` (version `dossier-declared-source/1.0.0`) SHALL stay committed and unedited. It remains the binding of every run whose record names it: no step SHALL re-screen such a run under version 2.0.0 or silently move it to that version. A step of a run bound to the predecessor that can no longer read the predecessor as its binding SHALL refuse with a restart explanation that names both policy versions, and SHALL change none of the run's files."
  ],
  "2.13": [
    "From version 2.13, initialization SHALL bind, for every run it creates, the committed screening policy `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json` (policy identity `polaris-butlers-project-shape-secrets`, version `dossier-declared-source/3.0.0`) under REQ-polaris-generation-033's policy-capture rule: its path, identity, version and the SHA-256 of its exact committed bytes, with any missing, malformed, uncommitted or changed policy refused before content is used. The predecessor `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` (version `dossier-declared-source/1.0.0`) and version 2.6's binding `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` (version `dossier-declared-source/2.0.0`) SHALL stay committed and unedited. Each remains the binding of every run whose record names it: no step SHALL re-screen such a run under another version or silently move it to another version. A step of a run bound to either that can no longer read that policy as its binding SHALL refuse with a restart explanation that names the run's policy version and version 3.0.0, and SHALL change none of the run's files. In this requirement \"the predecessor\" names version 1.0.0, as in version 2.6's text. Version 3.0.0 is version 2.0.0 with entries appended to six second-stage lists (`successor.readmission`) and its version and `successor` record restated; every other field, every rule text, list, detector, denied path and exemption is version 2.0.0's, so what this requirement says of version 2.0.0's rules holds for version 3.0.0 unchanged."
  ]
}
```

#### replace: 2.6 lines 15-15 -> 2.13 lines 15-15

```json
{
  "2.6": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 2.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 2.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest."
  ],
  "2.13": [
    "In the URL-supervised form of REQ-polaris-generation-048, the bound URL origin/species policy (`POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1`) SHALL be read over the screening policy this requirement binds as its base. That overlay's `basePolicy.reviewedSha256` names the predecessor bytes it was reviewed with, and its binding text forbids using different detector bytes silently; this paragraph is the explicit statement that the base is version 3.0.0, whose detectors and denied paths are the predecessor's with entries only added and whose admission widens by its second classification stage. URL mode therefore admits a body the second stage places, screened as this requirement states; the overlay's own sentences that no new path, file type or object is admitted are read as describing what the overlay itself adds to its base, which is nothing. Every other overlay rule applies over version 3.0.0 unchanged, and the run record SHALL name both bindings, the base by its own path, version and digest."
  ]
}
```

#### replace: 2.6 lines 17-17 -> 2.13 lines 17-17

```json
{
  "2.6": [
    "Version 2.0.0 classifies a path in two stages (the policy's `classDecision`). The first stage is the predecessor's classification, unchanged. Every path the predecessor places in a class SHALL keep that class, and every body the predecessor admits, retains as `redacted-span` or excludes SHALL keep that outcome, with one exception: a path a new denied basename, suffix or directory names is denied and never read, and its exclusion reason becomes the denied path. A path the predecessor admits changes outcome only through a directory named in the policy's `deniedDirectoryNames` (`.ssh`, `.gnupg`, `.aws`, `.kube`, `.docker`, `.terraform`); the added basenames and suffixes name only paths the predecessor already left indeterminate. The second stage reads only a path the first leaves without a class and without two classes, and places nothing in a path one of whose directories is named in `vendoredDirectoryNames`. Three rules with ids place the rest: `governance-text-by-name` places in `governance-text` a Markdown or reStructuredText document whose path carries a word of `governanceTextTokens` (adr, rfc, spec, specification, design, architecture and manifesto, each with its plural: the classes the owner's decision names, kept whatever a sample reaches) and no word of `withheldTokens` (decision, governance, policy, security, conduct, doctrine, principle, with the plurals); `project-documentation-extended` places in `project-documentation` a Markdown, MDX or reStructuredText document at any depth and a root document's name with a non-empty document suffix (README.md, CHANGELOG.rst and the policy's other root stems) below the root, when no word of its path is in either list and no segment contains a stem of `governanceStems` (design, architecture, specification, manifesto) run on into other characters; every second-stage rule, the configuration and code rule included, refuses a path any segment of which contains a stem of `withheldStems` (governance, polic, security, conduct, doctrine, principle, decision, report, benchmark) or has a word of `evidenceWords` (result, log, audit, output, with the plurals; for the configuration and code rule its own `codeEvidenceWords`, the same words less outputs, so a Terraform module's conventional outputs.tf is code) or of `withheldTokens`, so a run-on or camel-case name such as SecurityPolicy.md, a report, a log or an audit stays indeterminate in any format; and `code-content-extended` places in `code-content` the YAML, TOML, JSON and Terraform (`.tf`) extensions, the files named Dockerfile and Makefile or beginning `Dockerfile.` (a name beginning so that ends in a documentation extension of `prefixExcludedExtensions`, such as Dockerfile.md, is never placed by the prefix), and the policy's `languageExtensions` (`.mts`, `.bash`, `.zsh`, `.fish`). Every admitting format entry that reached no path in the measured five-repository sample is left out (the policy's `notAdoptedFromTheOption`), and re-admitting one needs a later successor backed by a measurement in which it reaches a path; an entry that implements a class the owner's decision names explicitly is kept regardless of the sample. A path two of those rules match, a notebook (`.ipynb`) and a path a second-stage rule refuses SHALL stay indeterminate, excluded under the unclassifiable exclusion as before."
  ],
  "2.13": [
    "Version 3.0.0 classifies a path in two stages (the policy's `classDecision`, version 2.0.0's text). The first stage is the predecessor's classification, unchanged. Every path the predecessor places in a class SHALL keep that class, and every body the predecessor admits, retains as `redacted-span` or excludes SHALL keep that outcome, with one exception: a path a new denied basename, suffix or directory names is denied and never read, and its exclusion reason becomes the denied path. A path the predecessor admits changes outcome only through a directory named in the policy's `deniedDirectoryNames` (`.ssh`, `.gnupg`, `.aws`, `.kube`, `.docker`, `.terraform`); the added basenames and suffixes name only paths the predecessor already left indeterminate. The second stage reads only a path the first leaves without a class and without two classes, and places nothing in a path one of whose directories is named in `vendoredDirectoryNames`. Three rules with ids place the rest: `governance-text-by-name` places in `governance-text` a Markdown, reStructuredText, MDX or AsciiDoc (`.adoc`, `.asciidoc`) document whose path carries a word of `governanceTextTokens` (adr, rfc, spec, specification, design, architecture and manifesto, each with its plural: the classes the owner's decision names, kept whatever a sample reaches) and no word of `withheldTokens` (decision, governance, policy, security, conduct, doctrine, principle, with the plurals); `project-documentation-extended` places in `project-documentation` a Markdown, MDX, reStructuredText or AsciiDoc document at any depth and a root document's name with a non-empty document suffix (README.md, CHANGELOG.rst and the policy's other root stems) below the root, when no word of its path is in either list and no segment contains a stem of `governanceStems` (design, architecture, specification, manifesto) run on into other characters; every second-stage rule, the configuration and code rule included, refuses a path any segment of which contains a stem of `withheldStems` (governance, polic, security, conduct, doctrine, principle, decision, report, benchmark) or has a word of `evidenceWords` (result, log, audit, output, with the plurals; for the configuration and code rule its own `codeEvidenceWords`, the same words less outputs, so a Terraform module's conventional outputs.tf is code) or of `withheldTokens`, so a run-on or camel-case name such as SecurityPolicy.md, a report, a log or an audit stays indeterminate in any format; and `code-content-extended` places in `code-content` the YAML, TOML, JSON, Terraform (`.tf`), HCL (`.hcl`), protocol buffer (`.proto`), CMake (`.cmake`), make include (`.mk`) and `.Dockerfile` extensions, the files named Dockerfile, Makefile, Containerfile and CMakeLists.txt or beginning `Dockerfile.` or `Containerfile.` (a name beginning so that ends in a documentation extension of `prefixExcludedExtensions`, such as Dockerfile.md or Containerfile.md, is never placed by the prefix), and the policy's `languageExtensions` (`.mts`, `.bash`, `.zsh`, `.fish`, and `.cxx`, `.hxx`, `.scala`, `.sc`, `.kts`, `.groovy`, `.gradle`, `.clj`, `.cljs`, `.cljc`, `.ex`, `.exs`, `.erl`, `.hrl`, `.hs`, `.ml`, `.mli`, `.fs`, `.fsx`, `.dart`, `.R`, `.jl`, `.m`, `.mm`, `.pl`, `.pm`, `.ps1`, `.psm1`, `.zig`, `.nim`, `.elm`), extensions and names compared case-sensitively. Version 2.0.0 left out every admitting format entry that reached no path in a measured five-repository sample; version 3.0.0 re-admits each such entry by which the screen places at least one path in a tree-metadata census of thirty named public repositories (the policy's `successor.readmission`), and every entry still placing none there, with `docTreeRootsAnyDepth`, whose path rule no screen implements, stays left out (the policy's `notAdoptedFromTheOption`); re-admitting one needs a later successor backed by a measurement in which it reaches a path. An entry that implements a class the owner's decision names explicitly is kept regardless of any sample. A path two of those rules match, a notebook (`.ipynb`) and a path a second-stage rule refuses SHALL stay indeterminate, excluded under the unclassifiable exclusion as before."
  ]
}
```

#### replace: 2.6 lines 19-19 -> 2.13 lines 19-19

```json
{
  "2.6": [
    "A body the second stage places SHALL be screened at least as strictly as any body the predecessor admits: every predecessor detector and scope detector runs over it; the policy's `configurationDetectors` run over it as well; any detector match excludes it whole under either visibility, so it is never retained as `redacted-span`; and the active-content scan runs over it with no exemption. The `configurationDetectors` SHALL also run over every cited span of such a body and over every text an agent session writes wherever the policy's detectors screen that text, and a match there refuses the text as a match of the policy's detectors does. No predecessor detector, scope detector, denied path, active-content rule, unclassifiable exclusion, strict-UTF-8, NUL or resource-limit rule, or private-object identifier and size rule is removed or narrowed by version 2.0.0; the private rule applies to every blob excluded or withheld on any ground, the new grounds included."
  ],
  "2.13": [
    "A body the second stage places SHALL be screened at least as strictly as any body the predecessor admits: every predecessor detector and scope detector runs over it; the policy's `configurationDetectors` run over it as well; any detector match excludes it whole under either visibility, so it is never retained as `redacted-span`; and the active-content scan runs over it with no exemption. The `configurationDetectors` SHALL also run over every cited span of such a body and over every text an agent session writes wherever the policy's detectors screen that text, and a match there refuses the text as a match of the policy's detectors does. No predecessor detector, scope detector, denied path, active-content rule, unclassifiable exclusion, strict-UTF-8, NUL or resource-limit rule, or private-object identifier and size rule is removed or narrowed by version 2.0.0 or version 3.0.0; the private rule applies to every blob excluded or withheld on any ground, the new grounds included."
  ]
}
```

#### replace: 2.6 lines 21-21 -> 2.13 lines 21-21

```json
{
  "2.6": [
    "The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class version 2.0.0 decides for the policy the run binds."
  ],
  "2.13": [
    "The run record SHALL keep naming the eligible classes `code-content`, `project-documentation` and `governance-text`. A document `governance-text-by-name` places SHALL reach the declared provider only as `governance-text`, never as `project-documentation`, and its text is data, never policy for project:syzygy (RFC3-30). Wherever Syzygy states the class of an admitted path, it SHALL state the class the policy the run binds decides (version 1.0.0, 2.0.0 or 3.0.0)."
  ]
}
```

#### replace: 2.6 lines 23-23 -> 2.13 lines 23-23

```json
{
  "2.6": [
    "Letting content that the predecessor cannot classify reach a provider is the owner's decision under RFC5-14. The owner made it: decision `pursuit-2026-11-21-source-reach`, option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24 with its authorization boundary, which this requirement keeps (no secret detector, active-content rule or fail-closed rule is weakened; no dossier run is started and no repository is read by the decision; nothing is exposed beyond the tailnet). For the words in `governanceTextTokens` only, that decision reverses the owner's screening-scope-v2 choice of variant `none` (act `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07`), which stays history. Every other part of version 2.0.0 is an agent adoption. This requirement admits no word of `withheldTokens` and no path the stem or evidence lists refuse, no notebook, no vendored path and no other format, and narrows no detector, active-content rule or fail-closed rule; any such change needs its own decision in the class RFC5-14 assigns it."
  ],
  "2.13": [
    "Letting content that the predecessor cannot classify reach a provider is the owner's decision under RFC5-14. The owner made it: decision `pursuit-2026-11-21-source-reach`, option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24 with its authorization boundary, which this requirement keeps (no secret detector, active-content rule or fail-closed rule is weakened; no dossier run is started and no repository is read by the decision; nothing is exposed beyond the tailnet). For the words in `governanceTextTokens` only, that decision reverses the owner's screening-scope-v2 choice of variant `none` (act `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-07`), which stays history. Every other part of versions 2.0.0 and 3.0.0 is an agent adoption, version 3.0.0's re-admissions among them: each re-admitted entry is a language, configuration or infrastructure format, or MDX or AsciiDoc documentation, that the owner's option names and version 2.0.0's narrowing had left out. This requirement admits no word of `withheldTokens` and no path the stem or evidence lists refuse, no notebook, no vendored path and no other format, and narrows no detector, active-content rule or fail-closed rule; any such change needs its own decision in the class RFC5-14 assigns it."
  ]
}
```

#### replace: 2.6 lines 46-47 -> 2.13 lines 46-47

```json
{
  "2.6": [
    "- **WHEN** version 2.0.0 is bound and the pinned tree holds docs/adr/0001-use-postgres.md, `ARCHITECTURE.md`, rfcs/0001-thing.md and docs/design.rst, none matched by a detector or holding active content, and docs/design.adoc",
    "- **THEN** each of the first four is admitted as `governance-text` by `governance-text-by-name`, may be cited, and reaches the declared provider only as `governance-text`"
  ],
  "2.13": [
    "- **WHEN** version 3.0.0 is bound and the pinned tree holds docs/adr/0001-use-postgres.md, `ARCHITECTURE.md`, rfcs/0001-thing.md, docs/design.rst, docs/design.adoc and site/docs/architecture.mdx, none matched by a detector or holding active content, and docs/notes/design.txt",
    "- **THEN** each of the first six is admitted as `governance-text` by `governance-text-by-name`, may be cited, and reaches the declared provider only as `governance-text`"
  ]
}
```

#### replace: 2.6 lines 49-49 -> 2.13 lines 49-49

```json
{
  "2.6": [
    "- **AND** the AsciiDoc document stays indeterminate: AsciiDoc is a format this version does not admit"
  ],
  "2.13": [
    "- **AND** the text file stays indeterminate: `.txt` is not a governance-text extension"
  ]
}
```

#### replace: 2.6 lines 58-59 -> 2.13 lines 58-59

```json
{
  "2.6": [
    "- **WHEN** the pinned tree holds packages/api/README.md with an HTML badge, packages/api/docs/guide.md with none, packages/api/docs/guide.adoc, and a root `README.md` with the same badge",
    "- **THEN** both nested paths are `project-documentation` by `project-documentation-extended`, the guide is admitted and the nested README is excluded whole as active content"
  ],
  "2.13": [
    "- **WHEN** the pinned tree holds packages/api/README.md with an HTML badge, packages/api/docs/guide.md and packages/api/docs/setup.adoc with none, packages/api/docs/notes.txt, and a root `README.md` with the same badge",
    "- **THEN** the README and both guides are `project-documentation` by `project-documentation-extended`, both guides are admitted and the nested README is excluded whole as active content"
  ]
}
```

#### replace: 2.6 lines 61-61 -> 2.13 lines 61-61

```json
{
  "2.6": [
    "- **AND** the AsciiDoc guide stays indeterminate"
  ],
  "2.13": [
    "- **AND** the nested text file stays indeterminate: `docTreeRootsAnyDepth` is left out"
  ]
}
```

#### insert: 2.6 lines 68-67 -> 2.13 lines 68-80

```json
{
  "2.6": [],
  "2.13": [
    "",
    "#### Scenario: Re-admitted formats placed as code-content and screened",
    "",
    "- **WHEN** version 3.0.0 is bound and the pinned tree holds CMakeLists.txt, cmake/FindFoo.cmake, terragrunt.hcl, api/v1/service.proto, build.gradle.kts, src/main/scala/App.scala, lib/app.ex, R/plot.R, src/main.zig, erlang.mk, Containerfile and Containerfile.fedora, none matched by a detector or holding active content; infra/backend.hcl holding `variable \"db_password\" {` with `default = \"hunter2hunter2\"` on its next line; app/build.gradle holding `password = \"hunter2hunter2\"`; and build.mak, src/App.vb, R/plot.r, makefile, GNUmakefile, vendor/x/main.hcl and reports/results.scala",
    "- **THEN** each of the first twelve is admitted as `code-content` by `code-content-extended`, screened as a second-stage body",
    "- **AND** infra/backend.hcl and app/build.gradle are excluded whole for a secret match under either visibility, never retained as `redacted-span`",
    "- **AND** each of the last seven stays indeterminate, excluded as an unknown extraction class, and its body is never read",
    "",
    "#### Scenario: Version 2.0.0 outcomes preserved",
    "",
    "- **WHEN** one controlled tree and its bodies are screened under version 2.0.0 and under version 3.0.0",
    "- **THEN** every path version 2.0.0 places keeps its class and stage, every body keeps its outcome, and every path it denies stays denied",
    "- **AND** a path version 2.0.0 leaves indeterminate either keeps that outcome or is placed by the second stage through an entry version 3.0.0 appends"
  ]
}
```

#### replace: 2.6 lines 85-85 -> 2.13 lines 98-98

```json
{
  "2.6": [
    "#### Scenario: Run bound to the predecessor not migrated"
  ],
  "2.13": [
    "#### Scenario: Run bound to an earlier policy not migrated"
  ]
}
```

#### replace: 2.6 lines 87-88 -> 2.13 lines 100-101

```json
{
  "2.6": [
    "- **WHEN** a step is asked of a run whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` and the predecessor can no longer be read as its binding",
    "- **THEN** the step refuses with a restart explanation naming both policy versions, and no file of the run changes"
  ],
  "2.13": [
    "- **WHEN** a step is asked of a run whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json`, and of another whose record binds `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json`, and neither policy can any longer be read as that run's binding",
    "- **THEN** each step refuses with a restart explanation naming its run's policy version and version 3.0.0, and no file of either run changes"
  ]
}
```

#### replace: 2.6 lines 92-92 -> 2.13 lines 105-105

```json
{
  "2.6": [
    "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor."
  ],
  "2.13": [
    "- **Case:** Controlled clones and valid declarations, with non-terminal stdin, missing legacy records, malformed locators and overlapping state roots. Independently vary host/earlier segments, port, case and hyphen collisions with derived and explicit identities; inspect every page and machine form for attributed provenance, write reach and surviving collision disclosures. Include a subject with governance-root material and assert one unchanged repository identity with the declared observed-source role in its run, brief and pages. Under version 2.0.0, vary for each stage-two rule a matching path, a path one word short of it, a path with a word of each token list, a vendored directory at each depth, a path two rules match, each new denied basename, suffix and directory and its letter case, a notebook, a run-on or camel-case name carrying a stem of each stem list, a configuration or code path carrying a refused stem or word, an extensionless root stem below the root, and a path the predecessor already places; plant each configuration detector's form in each configuration format, in a cited span and in agent text, with and without a reference or template value, and time each detector over a long run of its keyword; vary visibility; and continue a run bound to the predecessor. Under version 3.0.0, vary for each re-admitted entry a matching path, the same path with a refused stem or word and below a vendored directory, and for each entry still left out a matching path; plant each configuration detector's form in each re-admitted configuration format (each entry appended to `configurationExtensions`, `sourceFileNames` and `sourceFileNamePrefixes`, and the `.gradle` and `.kts` language extensions); and continue a run bound to version 2.0.0."
  ]
}
```

#### replace: 2.6 lines 94-94 -> 2.13 lines 107-107

```json
{
  "2.6": [
    "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built."
  ],
  "2.13": [
    "- **Oracle:** Independently prepared locator cases and realpath relationships, literal expected identity/pin and read/write counts, plus independently enumerated locator normalization collisions and literal required per-page disclosure fields; a fixture literal observed-source role and one repository identity shared by its ordinary and governance-root material. For version 2.0.0, expected classes and outcomes written as fixture literals from the policy text, path by path, never computed by the screen under test; the predecessor's expected outcomes fixed from a run of the predecessor screen over the same fixture before version 2.0.0 is built. For version 3.0.0, the same, with version 2.0.0's expected outcomes also written as fixture literals from version 2.0.0's text, path by path, and cross-checked against a run of the version-2.0.0 screen before version 3.0.0 is built."
  ]
}
```

#### replace: 2.6 lines 96-96 -> 2.13 lines 109-109

```json
{
  "2.6": [
    "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal."
  ],
  "2.13": [
    "- **Falsifier:** A consent question or retired record read/write, credential-bearing locator output, unexpected network access or clone mutation; a surviving collision, attribution, configuration write reach or human/machine disclosure is omitted or treated as identity verification; the observed-source role is absent or mislabeled, or governance-root material creates a second repository entity or identity. A path the predecessor places changes class, or a body the predecessor screens changes outcome, other than by a new denied directory, or a path the predecessor leaves indeterminate changes other than by a new denial or the second stage; a stage-two body is retained as `redacted-span`, skips the active-content scan or escapes a detector; a document with a word of `withheldTokens`, a path the stem or evidence lists refuse, a notebook or a vendored path is admitted; a governance-text-by-name document is sent as `project-documentation`; a new denied path is read; a configuration detector match is admitted, quoted or rendered; a run bound to the predecessor is re-screened or migrated without refusal. Under version 3.0.0: a path version 2.0.0 places changes class, stage or outcome, or a path it denies is read; an entry `notAdoptedFromTheOption` names places a path; a re-admitted body skips a detector, the active-content scan or the configuration detectors, or is retained as `redacted-span`; a run bound to version 2.0.0 is re-screened or migrated without refusal."
  ]
}
```


## Policy: every difference between version 2.0.0 and version 3.0.0

[Observed] 14 differences, found by a recursive walk of both files' parsed values; every other value is equal.

### changed: `policyVersion`

```json
{
  "2.0.0": "dossier-declared-source/2.0.0",
  "3.0.0": "dossier-declared-source/3.0.0"
}
```

### changed: `successor.predecessor.path`

```json
{
  "2.0.0": ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json",
  "3.0.0": ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json"
}
```

### changed: `successor.predecessor.sha256`

```json
{
  "2.0.0": "516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499",
  "3.0.0": "8c10531f57d129ad5d402e53d7d9fdc741387f6eaab701bbdb46419181b11967"
}
```

### changed: `successor.predecessor.policyVersion`

```json
{
  "2.0.0": "dossier-declared-source/1.0.0",
  "3.0.0": "dossier-declared-source/2.0.0"
}
```

### changed: `successor.predecessor.relation`

```json
{
  "2.0.0": "this file is a new version beside the predecessor, which is not edited. The predecessor stays the binding of every run whose record binds it, and the base the URL origin/species policy v1 names by its reviewedSha256; which file a run binds is stated by REQ-polaris-generation-046 from specification version 2.6, never by this field",
  "3.0.0": "this file is a new version beside the predecessor, which is not edited, and is built from its bytes: every field is the predecessor's except this predecessor record, policyVersion, readmission and the first entry of notAdoptedFromTheOption, and entries appended to six Stage-2 lists. The predecessor stays the binding of every run whose record binds it, as POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json stays the binding of every run whose record binds that; which file a run binds is stated by REQ-polaris-generation-046 from specification version 2.13, never by this field"
}
```

### changed: `successor.notAdoptedFromTheOption.0.what`

```json
{
  "2.0.0": "every admitting entry with no path in the measured sample: the census of the five public repositories (docs/evidence/syzygy-3efd-24/citable-share-v2-2026-11-22.json, its zeroPathEntries) found no path for them, so they are left out rather than widened for no gain; among them MDX and AsciiDoc as governance-text extensions, AsciiDoc prose, .txt files in nested docs trees, HCL, protocol buffers, CMake and most added languages. Entries that implement a class the owner's decision names explicitly (Markdown and reStructuredText design, architecture, ADR, RFC, specification and manifesto documents) are kept whatever the sample",
  "3.0.0": "every admitting entry the predecessor's D7 narrowing removed that still reaches no path, or whose reach no screen decides: in the census of thirty public repositories (docs/evidence/syzygy-3efd-69/citable-share-v3-probe-2026-11-22.json) .mak, .dockerfile, .hh, .cts, .r, .vb, makefile and GNUmakefile place no path; and docTreeRootsAnyDepth (.txt files below a docs, doc or documentation directory at any depth), whose docs-tree-text path rule was removed with it, reaches at most 2 paths under the docs root and none under the others by path geometry alone, since no screen implements that rule's text"
}
```

### changed: `successor.notAdoptedFromTheOption.0.why`

```json
{
  "2.0.0": "the bead's rule: a format that contributes almost nothing is left out; the rule removes formats, never a class the owner named. Re-admitting any of them needs a later successor backed by a measurement in which it reaches a path",
  "3.0.0": "the predecessor's rule, kept: a format that reaches no path is left out rather than widened for no gain, and an entry is re-admitted only on a measurement in which the screen places a path by it; re-admitting docTreeRootsAnyDepth would also restore a rule text no screen implements, for an upper bound of 2 paths in 131,125. Re-admitting any of them needs a later successor backed by such a measurement. Entries that implement a class the owner's decision names explicitly (governanceTextTokens and .md in governanceTextExtensions: Markdown design, architecture, ADR, RFC, specification and manifesto documents) are kept whatever the sample, as in the predecessor, so a word of governanceTextTokens that places no path in the census stays"
}
```

### added: `successor.readmission`

```json
{
  "2.0.0": null,
  "3.0.0": {
    "census": "docs/evidence/syzygy-3efd-69/citable-share-v3-probe-2026-11-22.json",
    "censusSha256": "14557d84d103bff6a9bebcf8f912165030555084226fdc689a6ec6ed3d8f76a3",
    "rule": "an admitting entry the predecessor's D7 narrowing removed (the zeroPathEntries of docs/evidence/syzygy-3efd-24/citable-share-v2-2026-11-22.json less what the predecessor carries) is appended to the Stage-2 list that held it when the screen, run over the census's thirty named public repositories from tree metadata only, places at least one path by it; each such entry is within the owner's decision named in ownerDecision (option A names more languages, configuration and infrastructure formats, and documentation in MDX and AsciiDoc), so re-admitting it is an agent adoption, and no detector, denied path, refusal list, rule text or exemption changes",
    "readmitted": "governanceTextExtensions .mdx, .adoc, .asciidoc; proseExtensions .adoc, .asciidoc; configurationExtensions .hcl, .proto, .cmake, .mk, .Dockerfile; languageExtensions .cxx, .hxx, .scala, .sc, .kts, .groovy, .gradle, .clj, .cljs, .cljc, .ex, .exs, .erl, .hrl, .hs, .ml, .mli, .fs, .fsx, .dart, .R, .jl, .m, .mm, .pl, .pm, .ps1, .psm1, .zig, .nim, .elm; sourceFileNames Containerfile, CMakeLists.txt; sourceFileNamePrefixes Containerfile. (44 entries; each one's paths, repositories and share are in the census's reach)"
  }
}
```

### appended: `publicSourceScope.contentClassification.rules.5.governanceTextExtensions`

```json
{
  "appended": [
    ".mdx",
    ".adoc",
    ".asciidoc"
  ]
}
```

### appended: `publicSourceScope.contentClassification.rules.6.proseExtensions`

```json
{
  "appended": [
    ".adoc",
    ".asciidoc"
  ]
}
```

### appended: `publicSourceScope.contentClassification.rules.7.configurationExtensions`

```json
{
  "appended": [
    ".hcl",
    ".proto",
    ".cmake",
    ".mk",
    ".Dockerfile"
  ]
}
```

### appended: `publicSourceScope.contentClassification.rules.7.languageExtensions`

```json
{
  "appended": [
    ".cxx",
    ".hxx",
    ".scala",
    ".sc",
    ".kts",
    ".groovy",
    ".gradle",
    ".clj",
    ".cljs",
    ".cljc",
    ".ex",
    ".exs",
    ".erl",
    ".hrl",
    ".hs",
    ".ml",
    ".mli",
    ".fs",
    ".fsx",
    ".dart",
    ".R",
    ".jl",
    ".m",
    ".mm",
    ".pl",
    ".pm",
    ".ps1",
    ".psm1",
    ".zig",
    ".nim",
    ".elm"
  ]
}
```

### appended: `publicSourceScope.contentClassification.rules.7.sourceFileNames`

```json
{
  "appended": [
    "Containerfile",
    "CMakeLists.txt"
  ]
}
```

### appended: `publicSourceScope.contentClassification.rules.7.sourceFileNamePrefixes`

```json
{
  "appended": [
    "Containerfile."
  ]
}
```


## Why nothing is weakened

[Inferred] Each version-2.0.0 outcome is kept:

1. Stage 1 and every rule text, refusal list, denied path, detector, exemption, redaction and visibility text are byte-equal in value (the walk above lists every difference); so every path version 2.0.0 places keeps its class and stage, every body keeps its outcome, and every denied path stays denied.
2. Appending to a Stage-2 admitting list can only move a path version 2.0.0 leaves indeterminate into the class of the rule that holds the list; a path two rules match stays indeterminate, so an appended entry can also only keep a path indeterminate, never move a placed one.
3. A re-admitted body is a Stage-2 body: every predecessor detector and scope detector and the six configuration detectors run over it, any match excludes it whole under either visibility, and the active-content scan runs with no exemption (version 2.6's rule, carried unchanged).
4. What is newly admitted is what the owner's option names and version 2.0.0's narrowing removed, restricted to the entries a measurement shows the screen placing a path by; it reaches the declared provider only under SEC-2, as its RFC5-14 class.
