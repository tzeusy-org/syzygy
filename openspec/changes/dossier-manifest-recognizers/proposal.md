# Dossier manifest recognizers — version 2.7

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit, no change to secret detection or SEC-5's fail-closed rule (every body is screened as a cited blob is, and the screening policy is not changed), no foreign repository, no exposure, release or multi-user use.

## Why

- [Observed] What Syzygy derives about a pinned tree today comes from paths and modes alone: the structure record on check's report (`packages/polaris-dossier/src/derive.ts`, `deriveStructure`, rules in `derive-rules.ts`) and the stored derived-structure record of rule `top-level-unit` (`derived-record.ts`, `derived/rev-<n>.json`). The `manifest-names` rule version 1 says only whether a directory holds a file named `package.json` or `Cargo.toml`; nothing states which packages a workspace declares or what they depend on.
- [Observed] Under declared-source policy 2.0.0 (version 2.6, row A-27) a `package.json`, `Cargo.toml`, `pyproject.toml` or workflow file is admitted as `code-content` (probed with the screen built from the committed policy bytes, see `design.md`), so Syzygy may read those bodies through the screened reader.
- [Inferred] A fact Syzygy reads from a manifest, with its rule, version, path and lines, is a claim whose source Syzygy itself can show; later slices can draw figure arrows from such facts (syzygy-3efd.28, .47) instead of from an agent's reading.

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Five recognizers at version 1, each reading a stated set of fields: `npm-package-manifest`, `cargo-manifest`, `python-project-manifest`, `go-module-manifest`, `github-actions-workflow`.
- Eight fact kinds: `package`, `module`, `workspace-member`, `dependency`, `workflow`, `workflow-trigger`, `job`, `job-needs`, each `{"id", "fact", "rule", "ruleVersion", "path", "lines", ...members, "epistemic": "inferred"}`.
- A disposition per candidate file: secret-matching paths counted and never named, vendored, generated and test paths set apart, withheld paths Unknown and never read, read bodies screened whole, and a body that does not parse Unknown with a parse fault, never an empty fact list.
- Stored as the draft check record's member `manifestFacts` (format `polaris-dossier-manifest-facts/1`), with per-recognizer coverage and listing caps (250 files a recognizer, 1,000 facts).
- Every manifest fact Inferred at this version; the qualification a later version needs before any upgrade (golden fixtures and a recorded mutation run, named by path and digest) is stated, and no draft, model or agent can set a label.

Every other sentence and scenario of REQ-034 is carried unchanged except one 2.3 sentence qualified in place (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No infrastructure formats (compose, Kubernetes, Terraform, Makefile, CMake: syzygy-3efd.26); no import scanning; no run-time claims (a declaration is never said to take effect, run or resolve); no version requirements, lock files, glob expansion of workspace patterns or resolution of a dependency to a workspace member (relation types are syzygy-3efd.28); no `tool.poetry`, `go.work`, `setup.py` or other manifest; no rendering, machine form, brief or published-file change; no draft schema or brief version change; no change to the screening policy, so `go.mod` stays unread under policies 1.0.0 and 2.0.0.
