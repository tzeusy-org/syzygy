# Design — dossier declared-source re-admission 2.13

[Inferred] The decisions bead syzygy-3efd.69 left to the specification worker, the evidence behind them, the blast radius, and what the code change must do. Normative text lives only in `proposed/polaris-generation/spec.md` and the policy file; this page explains them and binds nothing.

## Authority

[Observed] Version 2.6's D7 gate (`openspec/changes/dossier-declared-source-reach/design.md`, D7) removed, before adoption, every Stage-2 admitting entry that reached no path in five public repositories, and stated: "Re-admitting a removed format needs a later successor backed by a measurement in which it reaches a path; syzygy-3efd.69 re-measures every entry, the owner-named classes included, on a broader sample." The removal was an agent narrowing of what the owner's decision `pursuit-2026-11-21-source-reach` (option A, recorded 2026-11-21T03:53:55+00:00 on bead syzygy-3efd.24) admits; the bead records that the option covers "configuration and infrastructure formats (YAML, TOML, JSON, HCL, Dockerfile, Makefile, CMake, proto, notebook text cells) and more languages" and "documentation at any depth and under any docs root, in Markdown, MDX, RST, AsciiDoc and text".

[Inferred] So re-admitting a removed entry undoes an agent narrowing inside the owner's decision; it lets no content reach a provider that the owner has not already decided may, and it is an agent adoption (VIS-4 as amended by D10). The owner's authorization boundary is kept: no secret detector, active-content rule or fail-closed rule is weakened (D6), no dossier run is started, and no repository's file body is read (the census reads tree metadata only).

[Unknown] The decision packet is not in the repository (the policy's `ownerDecision.recordedOn`), and "more languages" is open-ended: the 31 language extensions re-admitted are the list version 2.6's agent drafted as its reading of those words, not a list the owner wrote, and applying MDX and AsciiDoc to governance-text composes two clauses of the option. Whether the owner pictured `.ps1`, `.pl` or `.m` cannot be checked here. The adoption row says so, and the owner may veto any entry (VIS-4).

## Decisions

**D1 — Measure what was removed, by the screen.** [Observed] The removed entries are those `zeroPathEntries` of `docs/evidence/syzygy-3efd-24/citable-share-v2-2026-11-22.json` (SHA-256 `781db97f…45e9`) names in an admitting list and that version 2.0.0 (SHA-256 `8c10531f57d129ad5d402e53d7d9fdc741387f6eaab701bbdb46419181b11967`, as bound by A-27) no longer carries: 55 entries in seven lists (3 governance-text extensions, 2 prose extensions, 3 docs roots, 7 configuration extensions, 35 language extensions, 4 source file names, 1 prefix). `scripts/citable_share_census.mjs --readmit-from` appends each to the Stage-2 list that held it in an in-memory copy of version 2.0.0's bytes (a probe, never a policy file) and runs `buildDossierScreen` over it: the screen pins every rule text and reads every list from the bytes, so the probe is decided by the code that decides version 2.0.0 today, not by a re-implementation. Control (retained as `docs/evidence/syzygy-3efd-69/citable-share-v3-control-2026-11-22.json`, the same script over the five syzygy-3efd.15 commits): the probe equals version 2.0.0 (1,346 of 1,996 citable) and every removed entry reaches 0 paths, as the D7 record says.

**D2 — The sample.** [Observed] Thirty public GitHub repositories, named with the reason for each in `docs/evidence/syzygy-3efd-69/sample-2026-11-22.json`, committed (`ba6cc33d`) before the census script that measures it was committed and run (`3bbad85e`; record committed in `fd4e7a6a`), which is what the commits show of the order: one or two well-known projects per removed language or format and per format the bead names, a Swift repository as a control (Swift is already Stage 1), and an ADR repository for the owner-named governance-text words. No repository was replaced or dropped after measuring. Each was fetched blobless at depth 1 at its HEAD of 2026-11-22 and listed with `git ls-tree -r -z`; every scratch clone held 0 blob objects afterwards, and the scratch directory was deleted. [Inferred] The sample is not random: it is chosen to give each removed format a chance to occur, so a share here is that format's share of this sample, not of public repositories at large; an entry reaching paths here shows the format occurs in real repositories, which is the question D7 asked.

**D3 — The bar: at least one path the screen places.** [Observed] D7 removed an entry whose count was 0 in every measured repository; the converse bar re-admits an entry the screen places at least one path by. 44 entries meet it. Their paths sum to 38,107, which equals the probe's citable count less version 2.0.0's (100,203 less 62,096 of 131,125 blob paths), so no path is counted for two entries. Per entry (`reach` in the record; share of all 131,125 blob paths):

| List | Entry | Paths | Repositories | Share | Re-admitted |
|---|---|---:|---:|---:|---|
| `governanceTextExtensions` | `.mdx` | 25 | 2 | 0.019% | yes |
| `governanceTextExtensions` | `.adoc` | 12 | 1 | 0.009% | yes |
| `governanceTextExtensions` | `.asciidoc` | 2 | 1 | 0.002% | yes |
| `proseExtensions` | `.adoc` | 386 | 4 | 0.294% | yes |
| `proseExtensions` | `.asciidoc` | 151 | 3 | 0.115% | yes |
| `docTreeRootsAnyDepth` | `docs` | 2 (upper bound) | 2 | 0.002% | no (D4) |
| `docTreeRootsAnyDepth` | `doc` | 0 | 0 | 0.000% | no |
| `docTreeRootsAnyDepth` | `documentation` | 0 | 0 | 0.000% | no |
| `configurationExtensions` | `.hcl` | 2,075 | 1 | 1.582% | yes |
| `configurationExtensions` | `.proto` | 623 | 4 | 0.475% | yes |
| `configurationExtensions` | `.cmake` | 54 | 6 | 0.041% | yes |
| `configurationExtensions` | `.mk` | 46 | 3 | 0.035% | yes |
| `configurationExtensions` | `.mak` | 0 | 0 | 0.000% | no |
| `configurationExtensions` | `.dockerfile` | 0 | 0 | 0.000% | no |
| `configurationExtensions` | `.Dockerfile` | 7 | 2 | 0.005% | yes |
| `languageExtensions` | `.cxx` | 1 | 1 | 0.001% | yes |
| `languageExtensions` | `.hxx` | 2 | 1 | 0.002% | yes |
| `languageExtensions` | `.hh` | 0 | 0 | 0.000% | no |
| `languageExtensions` | `.cts` | 0 | 0 | 0.000% | no |
| `languageExtensions` | `.scala` | 19,108 | 1 | 14.572% | yes |
| `languageExtensions` | `.sc` | 13 | 1 | 0.010% | yes |
| `languageExtensions` | `.kts` | 103 | 4 | 0.079% | yes |
| `languageExtensions` | `.groovy` | 25 | 2 | 0.019% | yes |
| `languageExtensions` | `.gradle` | 729 | 4 | 0.556% | yes |
| `languageExtensions` | `.clj` | 77 | 1 | 0.059% | yes |
| `languageExtensions` | `.cljs` | 177 | 1 | 0.135% | yes |
| `languageExtensions` | `.cljc` | 30 | 1 | 0.023% | yes |
| `languageExtensions` | `.ex` | 376 | 2 | 0.287% | yes |
| `languageExtensions` | `.exs` | 396 | 2 | 0.302% | yes |
| `languageExtensions` | `.erl` | 233 | 2 | 0.178% | yes |
| `languageExtensions` | `.hrl` | 4 | 2 | 0.003% | yes |
| `languageExtensions` | `.hs` | 497 | 2 | 0.379% | yes |
| `languageExtensions` | `.ml` | 1,774 | 2 | 1.353% | yes |
| `languageExtensions` | `.mli` | 845 | 1 | 0.644% | yes |
| `languageExtensions` | `.fs` | 45 | 1 | 0.034% | yes |
| `languageExtensions` | `.fsx` | 3 | 1 | 0.002% | yes |
| `languageExtensions` | `.dart` | 613 | 2 | 0.467% | yes |
| `languageExtensions` | `.r` | 0 | 0 | 0.000% | no |
| `languageExtensions` | `.R` | 360 | 1 | 0.275% | yes |
| `languageExtensions` | `.jl` | 948 | 1 | 0.723% | yes |
| `languageExtensions` | `.m` | 273 | 4 | 0.208% | yes |
| `languageExtensions` | `.mm` | 41 | 2 | 0.031% | yes |
| `languageExtensions` | `.pl` | 13 | 2 | 0.010% | yes |
| `languageExtensions` | `.pm` | 149 | 1 | 0.114% | yes |
| `languageExtensions` | `.ps1` | 479 | 9 | 0.365% | yes |
| `languageExtensions` | `.psm1` | 27 | 1 | 0.021% | yes |
| `languageExtensions` | `.zig` | 2,910 | 1 | 2.219% | yes |
| `languageExtensions` | `.nim` | 4,382 | 1 | 3.342% | yes |
| `languageExtensions` | `.vb` | 0 | 0 | 0.000% | no |
| `languageExtensions` | `.elm` | 8 | 1 | 0.006% | yes |
| `sourceFileNames` | `Containerfile` | 8 | 1 | 0.006% | yes |
| `sourceFileNames` | `makefile` | 0 | 0 | 0.000% | no |
| `sourceFileNames` | `GNUmakefile` | 0 | 0 | 0.000% | no |
| `sourceFileNames` | `CMakeLists.txt` | 70 | 5 | 0.053% | yes |
| `sourceFileNamePrefixes` | `Containerfile.` | 7 | 1 | 0.005% | yes |

[Inferred] No share floor is set: D7's gate was "no path", and a floor would need a number the bead did not ask for and the sample (chosen per format, not at random) could not justify. Several entries reach one repository only (`.scala`, `.hcl`, `.zig`, `.nim`, `.jl`): in each the repository is that format's own flagship project, which is what the sample was chosen to reach. Per repository (blob paths, citable under 2.0.0, citable under the probe; the probe's lists are 3.0.0's plus the eight left-out entries that place no path, so its counts are 3.0.0's, which the `--policy-version 2,3` run of `tasks.md` measures directly): scala/scala3 26,907, 1,720, 20,843; jgm/pandoc 3,014, 1,471, 1,842; phoenixframework/phoenix 513, 109, 316; elixir-lang/elixir 781, 85, 701; ninenines/cowboy 425, 20, 358; felangel/bloc 1,933, 641, 1,270; JuliaLang/julia 2,067, 687, 1,678; square/okhttp 846, 716, 760; Alamofire/Alamofire 571, 151, 151; SDWebImage/SDWebImage 436, 221, 325; nlohmann/json 1,678, 1,155, 1,194; fmtlib/fmt 148, 106, 120; grpc/grpc 10,844, 8,886, 9,202; protocolbuffers/protobuf 3,795, 2,569, 3,158; gruntwork-io/terragrunt 6,972, 3,950, 6,033; containers/podman 10,631, 8,415, 8,439; facebook/docusaurus 4,400, 3,350, 3,363; spring-projects/spring-boot 12,004, 9,631, 10,660; asciidoctor/asciidoctor 358, 102, 279; sphinx-doc/sphinx 2,059, 1,441, 1,441; tidyverse/ggplot2 1,169, 123, 483; mojolicious/mojo 409, 32, 192; PowerShell/PowerShell 4,565, 1,558, 2,038; ocaml/dune 8,410, 568, 3,190; clojure/clojurescript 414, 47, 333; elm/compiler 254, 62, 203; giraffe-fsharp/Giraffe 93, 23, 71; nim-lang/Nim 4,792, 149, 4,531; ziglang/zig 20,545, 14,071, 16,992; npryce/adr-tools 92, 37, 37.

[Observed] The owner-named governance-text words D7 kept regardless of the sample are re-measured too (`entries.probe` per repository): `spec` 149 paths in 3 repositories, `design` 43 in 8, `architecture` 33 in 4, `specification` 12 in 1, `adr` 8 in 1, `specs` 2 in 2; `adrs`, `rfc`, `rfcs`, `specifications`, `designs`, `architectures`, `manifesto` and `manifestos` 0. They stay, as D7 kept them: they implement a class the owner named. Governance-text admitted overall: 219 paths under 2.0.0, 258 under 3.0.0 (the 39 MDX and AsciiDoc design and architecture documents).

**D4 — `docTreeRootsAnyDepth` stays out.** [Observed] Its path rule (`docs-tree-text`: a `.txt` file below a docs, doc or documentation directory at any depth) was removed with it, and the screen no longer implements that rule's text, so no probe can decide its reach. The census attributes it by path geometry instead, without the Stage-2 stem, word and token refusals: an upper bound of 2 paths under `docs` and 0 under `doc` and `documentation`. [Inferred] Re-admitting it would restore a rule text the screen must pin again and change `project-documentation-extended`'s rule text and path rules, for at most 2 of 131,125 paths; the bar of D3 asks for a path the screen places, and this one has none. It stays in `notAdoptedFromTheOption` with its figure.

**D5 — Ten entries stay out.** [Observed] `.mak`, `.dockerfile`, `.hh`, `.cts`, `.r`, `.vb`, `makefile`, `GNUmakefile`, and the `doc` and `documentation` roots reach 0 paths in the thirty repositories. `.vb` was not targeted (sample `method`). [Inferred] `makefile` and `GNUmakefile` matter to REQ-034's candidate infrastructure recognizers (D8), whose `makefile` recognizer names them: under 3.0.0 they stay indeterminate, so that recognizer reads none of those two names (D8).

**D6 — Nothing is weakened.** [Observed] `SEMANTIC-DELTA.md` lists every difference between the two policy files, found by a recursive walk of both parsed values (14): entries appended to six lists of the three Stage-2 rules, `policyVersion`, and seven values in three members of `successor` (four of `predecessor`, two of the first `notAdoptedFromTheOption` entry, and the added `readmission`). No rule text, `classDecision`, refusal list (`withheldTokens`, `withheldStems`, `evidenceWords`, `codeEvidenceWords`, `governanceStems`, `vendoredDirectoryNames`, `prefixExcludedExtensions`), denied path, detector, exemption, redaction or visibility text changes, and Stage 1 is unchanged. Every re-admitted body is a Stage-2 body, so version 2.6's rule applies to it unchanged: every detector and the six `configurationDetectors` run over it, any match excludes it whole under either visibility, and the active-content scan runs with no exemption. [Observed] Probed with `buildDossierScreen` over the v2 and v3 bytes under the current code (a scratch script, not retained; the review reproduced every one of these claims with its own probe, `R-SOURCE-REACH-V3-SPEC-1-RAW.md`, and the code half pins them as tests): v3 builds under both visibilities; every path the new and amended scenarios name has the class and stage the scenarios state; infra/backend.hcl with a `variable "db_password"` default and app/build.gradle with `password = "hunter2hunter2"` are excluded whole for a secret-detector match. [Observed] An appended entry could move a path version 2.0.0 places only by making a second rule match it. A sweep over every pair of an appended entry (44) and an entry of version 2.0.0's other Stage-2 rules or of Stage 1's `sourceExtensions`, testing whether either is a case-folded suffix of the other, finds one pair: `.mdx` in `governance-text-by-name` and in `project-documentation-extended`; against version 3.0.0's own lists `.adoc` and `.asciidoc` also sit in both, appended to both. Each such pair is disjoint by `classDecision`'s construction (one needs a word of `governanceTextTokens`, the other refuses every word of `docExcludedTokens`). The `Containerfile.` prefix is void on every governance-text and prose extension (`prefixExcludedExtensions`). So no path version 2.0.0 places changes class or stage, which the code half's preservation test is to confirm on a fixture tree. [Inferred] Because the screen reads lists from the bytes and pins only texts, the current screen already decides 3.0.0 as the specification says; the code change is the binding, not the classifier (see below).

**D7 — Paths, not screened bodies.** [Inferred] The census counts paths the screen admits before any body is read. A re-admitted body may still be excluded: Stage-2 code-content is not in the code-content exemption's `exemptExtensions`, so the active-content scan reads it. [Observed] (the review's probe of `scanActiveContent`) What it flags is an identifier directly inside angle brackets (`<T>`, `<void>`, `<String>`); comparisons (`a < b`), Scala's square-bracket generics and Haskell operators such as `<$>` pass. [Inferred] So Kotlin scripts (`.kts`), Dart, Groovy and Gradle bodies with type arguments, and AsciiDoc or MDX documents with inline HTML, will often be excluded as active content, as version 2.6 disclosed for `.mts` and MDX (its review finding F8); for the other languages the rate is [Unknown]. How many of the 38,107 paths survive the body screen is [Unknown]: measuring it reads bodies, which the bead excludes. No exemption is added (it would weaken D6).

**D8 — Interaction with the REQ-034 infrastructure-recognizer candidate.** [Observed] Another session (bead syzygy-3efd.26, change `dossier-infrastructure-recognizers`, not yet on `main`) is writing a REQ-polaris-generation-034 version, drafted as 2.12, whose new recognizers read Compose, Kubernetes, Terraform, makefile and CMake files where the bound policy admits them. Its worker reports: the `cmake-lists` recognizer names `CMakeLists.txt` exactly and reads what the bound policy admits, none under 2.0.0; `.cmake`, `.hcl` and `Containerfile` are candidates of no recognizer of that version and only enter its coverage remainder, which counts every blob regardless of admission; `makefile` and `GNUmakefile` are named by its `makefile` recognizer. [Inferred] So under 3.0.0 `cmake-lists` reads every admitted `CMakeLists.txt` with no change to that version's text; Compose, Kubernetes YAML, `.tf` and `Makefile` were already admitted by 2.0.0 and are unchanged; `makefile` and `GNUmakefile` stay unread (D5). The two versions replace different requirements (034 and 046) and compose independently; neither edits the other's text. This change does not edit REQ-034.

**D9 — Runs bound to an earlier policy.** [Inferred] As version 2.6 did for the predecessor (its D9): a run binds its policy by path, identity, version and digest (REQ-033), so a run bound to 1.0.0 or 2.0.0 is never re-screened under 3.0.0; a step that can no longer read the run's own policy as its binding refuses with a restart explanation naming that version and 3.0.0, and writes nothing.

**D10 — The URL overlay.** [Observed] `POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json` names version 1.0.0 as `basePolicy.reviewedSha256`; version 2.6 stated that the overlay is read over 2.0.0. The same paragraph now names 3.0.0, whose detectors and denied paths equal 2.0.0's. Nothing else changes.

**D11 — Version number and change name.** [Observed] At drafting, 2.11 was the last dossier specification version on `main` (A-36), and the parallel REQ-034 change was drafted as 2.12 (D8). [Observed] Before adoption `main` gained version 2.12 as the coverage pre-check (`dossier-coverage-precheck`, A-40), which replaces REQ-034 only; this change keeps 2.13, and the infrastructure-recognizer change's number is its own session's to settle. This change takes 2.13 and replaces 2.6's REQ-046; it composes after 2.6 and does not depend on the REQ-034 train. A new change directory (`dossier-declared-source-readmission`) rather than an edit of `dossier-declared-source-reach`, whose spec and policy A-27 binds by digest.

## Blast radius

Method: every tracked file (`git ls-files`, 10,124 at drafting) searched for the version-2.0.0 policy's path stem `POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2` or its digest by a Python byte search, and the stem alone by `git grep -lF` (26 files both ways). [Observed] Disposition:

- Live code that binds version 2.0.0: `packages/polaris-dossier/src/policy-snapshot.ts` (`DOSSIER_POLICY_PATH`, `DOSSIER_POLICY_VERSION`, `DOSSIER_POLICY_PATHS`, `restartExplanation`) and its users `run-record.ts`, `reverify.ts`, `screen.ts`, `gate-sources.ts` (reads the bound policy by path, gated by `DOSSIER_POLICY_PATHS`) and `full-run.testkit.ts`: changed or tested by the code half (`tasks.md`). Found by importers (`git grep -lE "policy-snapshot|DOSSIER_POLICY_|DOSSIER_PREDECESSOR_POLICY|restartExplanation"`), which the stem and digest sweep below cannot see; `derived-record.ts` imports only `readCommittedBytes` and is unaffected.
- Tests that name 2.0.0 (`check.test.ts`, `inventory.test.ts`, `manifest-facts.test.ts`, `render.test.ts`, `review.test.ts`, `screen-source-reach-v2.test.ts`, `start-gates.test.ts`, `configuration-detectors.test.ts`, `public-source-two-stage.test.ts`): unchanged here; the code half keeps the 2.0.0 tests (runs bound to it remain) and adds 3.0.0 ones.
- `scripts/citable_share_census.mjs` (already measures version 3 by path) and `scripts/check_spec_reconciliation.py` (binds 2.0.0's digest for A-27): the checker gains this change's subjects; A-27's binding is unchanged and correct, because 2.0.0 is not edited.
- History, never edited: `AGENT-ADOPTIONS.md` row A-27, the syzygy-3efd-24 evidence (five files), its raw review and campaign file, `dossier-declared-source-reach/` (README, semantic delta, spec), and the census record of this bead.
- Routes: `PROJECT-STATUS.md` and `openspec/README.md` gain this change's lines at adoption; their 2.6 lines are not rewritten.

[Observed] No file an act manifest lists is edited: the governed files this change edits (`openspec/README.md`, and at adoption `PROJECT-STATUS.md` and `AGENT-ADOPTIONS.md`) carry no performed act's digest (D10: an act's digest no longer locks a file in any case).

## What the code change must do

The screen already decides version 3.0.0 as specified (D6); the code half binds it:

1. `policy-snapshot.ts`: `DOSSIER_POLICY_PATH` and `DOSSIER_POLICY_VERSION` name 3.0.0 for new runs; `DOSSIER_POLICY_PATHS` lists 1.0.0, 2.0.0 and 3.0.0; `restartExplanation` names the run's bound version and 3.0.0.
2. `run-record.ts`, `reverify.ts`, `screen.ts` and `gate-sources.ts`: a run bound to 1.0.0 or 2.0.0 (not only 1.0.0) keeps its binding, and a step that can no longer read it refuses with that explanation and writes nothing.
3. Tests (bead acceptance): a fixture per re-admitted entry (admitted, with a refused stem or word, below a vendored directory), per entry left out (indeterminate), and per configuration detector in each re-admitted configuration format as the spec's Case defines it (each entry appended to `configurationExtensions`, `sourceFileNames` and `sourceFileNamePrefixes`: `.hcl`, `.proto`, `.cmake`, `.mk`, `.Dockerfile`, Containerfile, CMakeLists.txt and `Containerfile.`; and `.gradle` and `.kts`); a 2.0.0-to-3.0.0 outcome-preservation test over one fixture tree with both versions' expected outcomes written as literals and cross-checked against the version-2.0.0 screen; a run bound to 2.0.0 continuing and refusing; a recorded mutation run (each mutant's old and new fragment and its commit) over the new fixtures; no existing detector test changed or removed; the provider golden byte-identical.
4. `scripts/citable_share_census.mjs --policy-version 2,3 --readmit-from …` re-run at the adopted commit over the same thirty commits (`--commits-from`), confirming 3.0.0's citable count equals the probe's.

## Review

One fresh-context review, `docs/reviews/syzygy-3efd-69/R-SOURCE-REACH-V3-SPEC-1-RAW.md`, verdict `CONFIRM WITH EXCEPTIONS` (line 3), bound to the draft's policy digest `4641f474…10aa` and spec digest `67c33f8d…4feb`; twelve findings, none blocking. Every finding was repaired or noted in the bytes now bound by `scripts/check_spec_reconciliation.py`; none was overruled. Under D10 a review is one round: no confirmation round was run, so the repaired bytes carry no reviewer verdict of their own. The repairs changed the policy (F11) and the spec (F7, F8, F12), so both digests differ from the reviewed ones.

| Finding | Severity | Disposition |
|---|---|---|
| F1 "four amended" scenarios; there are three | non-blocking | Repaired: proposal.md says two added and three amended, one renamed. |
| F2 38,107 "of 131,125 … indeterminate" | non-blocking | Repaired: proposal.md says 38,107 of the 68,604 paths 2.0.0 leaves indeterminate, of 131,125 in all. |
| F3 active-content forecast names the wrong languages | non-blocking | Repaired: D7 names the trigger the review observed (an identifier inside angle brackets), lists Kotlin scripts, Dart, Groovy and Gradle, and marks the rest [Unknown]. |
| F4 D1 control and D6 probe not retained | non-blocking | Repaired: the control is retained as `citable-share-v3-control-2026-11-22.json` (same script, `fd4e7a6a`, 1,346 of 1,996 under both, no removed entry reaching a path) and cited in D1; D6 cites the review's independent reproduction and the code half's tests. |
| F5 wrong reason probe equals 3.0.0 | non-blocking | Repaired: D3 says the probe's lists are 3.0.0's plus eight zero-path entries, and that the `--policy-version 2,3` run measures 3.0.0 directly. |
| F6 pair sweep population and field count | non-blocking | Repaired: D6 states the sweep is against 2.0.0's lists, adds the `.adoc`/`.asciidoc` pairs in 3.0.0's own lists (disjoint by the same construction), and gives the walk's count (14; seven values in three members of `successor`). |
| F7 "each re-admitted configuration format" undefined | non-blocking | Repaired: the spec's Case defines it (entries appended to `configurationExtensions`, `sourceFileNames` and `sourceFileNamePrefixes`, and `.gradle` and `.kts`); "What the code change must do" item 3 lists the same set. |
| F8 2.0.0 baseline computed by the code under test | note | Repaired: the Oracle asks for 2.0.0's expected outcomes as literals from its text too, cross-checked against the 2.0.0 screen; item 3 says so. |
| F9 "more languages" is the agent's reading | note | Repaired: an [Unknown] paragraph under Authority, and the adoption row's reason says the language list is the agent's reading, open to the owner's veto. |
| F10 `gate-sources.ts` missing from the blast radius | note | Repaired: listed with the importer sweep that finds it, and named in item 2. |
| F11 policy drops "owner-named entries kept" | note | Repaired: v3's `notAdoptedFromTheOption[0].why` restates it, so the policy explains its zero-path governance-text words. |
| F12 editorial accuracy | note | Repaired: the spec says "its version and `successor` record restated"; SEMANTIC-DELTA states its line-count convention; D9 carries [Inferred]; D2 says what the commits show of the order. |
