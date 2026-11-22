# Design: declared manifest facts

One MODIFIED REQ-polaris-generation-034, version 2.7, for bead syzygy-3efd.25 (pursuit 2026-11-21 Q2 slice 2). It builds on version 2.5 (row A-21), the effective REQ-034 text. Version 2.4's code (schema v6, brief v11) is landing separately and 2.5's (schema v7, brief v12) is not written; this version changes neither the draft schema nor the brief, because nothing in it is handed to the author or read from a draft.

## The version label

[Observed] Each REQ-034 amendment and the REQ-046 amendment share one numbering in their tags (`polaris-dossier-figure-homes-and-fit-v2.2`, `-derived-observed-facts-v2.3`, `-ledger-packs-thesis-v2.4`, `-figure-kinds-v2.5`, `-declared-source-reach-v2.6`), and `scripts/check_spec_reconciliation.py` names each by its tag constant and its `vX.Y` in its findings and retirement text. 2.6 is taken by the REQ-046 amendment, so this is 2.7, composed after 2.5 for REQ-034 (2.6 does not touch REQ-034). Tag `polaris-dossier-manifest-recognizers-v2.7`.

## Where the facts are stored

[Observed] Two records exist today. The structure record (`derive.ts`, `deriveStructure`; syzygy-3efd.16) is advice on check's report and is "never written into the check record"; the derived-structure record (`derived-record.ts`, `derived/rev-<n>.json`, version 2.3) is stored once per draft revision, published byte for byte by every render as `derived-structure.json`, read back by a strict reader that refuses any member it does not rebuild (`readDerivedRecord`), and re-derived by the render from the tree listing.

[Inferred] The bead asks that the structure record gain the manifest facts and that check store them. Three homes were weighed:

- the derived-structure record (rejected): adding a member changes its format, its strict reader, the bytes of every published `derived-structure.json` and the region's `data-derived-record` digest on every operator-agent `index.html`, and a render that "never trusts the stored facts unchecked" would have to re-read every manifest blob. That is a render change, which this slice is not;
- a new file in the run directory (rejected): a second write-once artifact with its own planted-file refusal and layout entry, for no reader at this version;
- the draft check record, as member `manifestFacts` (chosen): the precedent of `figureFit` (2.2) and `readingLedger` (2.4), write-once with the check record, absent from inventory check records, format identifier unchanged. Check's report carries it once, with the rest of the check record; the report's `structureRecord` keeps its members, so nothing on the report is duplicated.

So the facts the bead adds to "the structure record" are, at this version, a separate record stored beside it in the check record: they are not among the structure record's members, which stay path-only advice, and no trait or pack rule reads them (review finding F2). A later version that draws figures from these facts decides whether they move into the published record.

## Admission under the policy a run binds

[Observed] Probed with `buildDossierScreen` over the committed policy bytes (a throwaway test, deleted), for both visibilities, at this branch's base `e9b477a7`:

| Path | policy 1.0.0 | policy 2.0.0 |
|---|---|---|
| package.json at the root, under packages/a, apps/web and docs | `unknown-extraction-class` | `code-content`, stage 2 |
| Cargo.toml at the root and under crates/x | `unknown-extraction-class` | `code-content`, stage 2 |
| pyproject.toml at the root and under sub | `unknown-extraction-class` | `code-content`, stage 2 |
| ci.yml and release.yaml under .github/workflows | `unknown-extraction-class` | `code-content`, stage 2 |
| go.mod at the root and under cmd/x | `unknown-extraction-class` | `unknown-extraction-class` |
| package.json under node_modules/x and governance, go.mod under vendor/x, Cargo.toml under policy, pyproject.toml under security | `unknown-extraction-class` | `unknown-extraction-class` |

[Inferred] So under 2.0.0 four of the five recognizers read files, and `go-module-manifest` reads none: every `go.mod` is Unknown (`unknown-extraction-class`). The requirement states that and states the recognizer anyway, so a later policy that admits `go.mod` changes which files are read and nothing in this text. Under 1.0.0 every listed file is Unknown. Admitting `go.mod` needs a screening-policy successor; it is not done here (see the owner question below).

## Reading, and refusing

[Inferred] Every body is read as a cited blob is, through a pinned object reader on the same clone with its object bound set to 1 MiB (so an oversized blob is refused before it is inflated, as `too-large`): one call per file (so one refused read makes one file Unknown, not the check), re-hashed from the pinned commit, then the screen's whole-body screen (`screenTargetBody`); a body excluded or retained with lines withheld is never parsed. The value checks (length, control characters, a detector over each string) are a second screen over what a fact would carry, never a weakening: a body that passed the whole-body screen loses nothing by them except a fact they refuse, which is counted.

[Inferred] Parsing: package.json is JSON; a position-aware reader is needed for line spans and duplicate keys. The workspace has `yaml` 2.9.0 (`packages/cap1-core`) and no TOML parser. The requirement states the minimum each reader reads and lets it refuse anything beyond as `beyond-reader`, so a small literal reader satisfies it, and a refusal is Unknown, never partial facts (bead design). A new dependency goes through the craft policy's dependency check.

[Inferred] Set apart: the four package recognizers skip vendored, generated and test paths by the structure record's own rules version 1, as `manifest-names` does; a fixture `package.json` under `test/` is not the project's package. The tests-path rule is not applied to workflow paths, because its basename prefix `test_` would set apart a workflow named `test_e2e.yml`.

[Inferred] Read limit: 250 files a recognizer (the census's listing limit), each at most 1 MiB, so a monorepo costs at most 1,250 bounded reads. Listing caps: 250 file entries a recognizer, the files read first, so every file read is listed; 1,000 facts; counts are always whole. A path over 512 code units or with a control character is never read (`path-not-citable`), so every path a fact carries is a citable raw path.

## The label

[Inferred] Every manifest fact is Inferred at this version, with no exception for a recognizer that already has fixtures and a mutation run. The upgrade path is a later version naming, per rule and version, the mutation-run record by path and SHA-256, the way the currency policy names its bounds (2.3); the bead's acceptance asks for fixtures and a mutation run for all five, which the implementation delivers, and syzygy-3efd.28 is where an upgrade is decided. This keeps "an agent never labels its own claim Observed" mechanical: the label is a constant in Syzygy's code at this version, and a later one can only be computed from a named, digest-bound record.

## Names fixed

Rules (each version 1): `npm-package-manifest`, `cargo-manifest`, `python-project-manifest`, `go-module-manifest`, `github-actions-workflow`. Fact kinds and members: `package` {`name`}, `module` {`name`}, `workspace-member` {`pattern`}, `dependency` {`name`, `section`, `group`}, `workflow` {`name`}, `workflow-trigger` {`event`}, `job` {`job`}, `job-needs` {`from`, `to`}; every fact `{"id", "fact", "rule", "ruleVersion", "path", "lines", ...members, "epistemic": "inferred"}`, ids `_manifest-<k>`. Sections: `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`; `dependencies`, `dev-dependencies`, `build-dependencies`, `workspace.dependencies`, `target.dependencies`, `target.dev-dependencies`, `target.build-dependencies`; `project.dependencies`, `project.optional-dependencies`, `dependency-groups`; `require`, `require-indirect`. Check-record member `manifestFacts`, format `polaris-dossier-manifest-facts/1`; recognizer entry members `rule`, `ruleVersion`, `label`, `candidates`, `secretPathsLeftOut`, `setApart`, `inferred`, `unknown`, `valuesLeftOut`, `facts`, `files`, `filesNotListed`; file entry members `path`, `epistemic`, `unknownReason`, `parseFault`, `facts`, `valuesLeftOut`. Unknown reasons: `path-not-citable`, `symbolic-link`, `denied-path`, `unknown-extraction-class`, `class-not-consented`, `over-read-limit`, `object-read-refused`, `not-utf8-text`, `too-large`, `secret-detector-match`, `active-content`, `redacted-body`, `unparsed`; parse faults `syntax`, `duplicate-key`, `field-type`, `beyond-reader`. Limits: 250 files read and 250 file entries listed a recognizer, 1,048,576 bytes a blob (the reader's object bound), 512 code units a path, 256 code units a body-taken value, 1,000 facts listed. A file that is not a secret-matching or set-apart candidate is a "named file".

## Owner question

[Inferred] `go.mod` is placed by no rule of declared-source policy 2.0.0, so `go-module-manifest` yields nothing until a policy admits it. Admitting a path the policy cannot classify today was recorded as owner-reserved in the 2.0.0 successor (its `successor.ownerDecision.ownerClass`, RFC5-14), while D10 gives agents "screening policy within SEC-5". This package does not decide which applies: treated as owner-class, the question is whether a policy successor may add `go.mod` (and `go.work`) to the stage-2 `code-content` rule.

## Not changed, and why

[Inferred] Pages, `machine.json`, `derived-structure.json`, the brief and draft schema, findings, review, readiness, the screening policy and the provider mode: nothing in this slice is rendered, handed to an agent as instruction, or read back. Infrastructure formats are syzygy-3efd.26; relation types and any label upgrade are syzygy-3efd.28.

## Implementation pointers (not normative)

- One module per recognizer beside `derive.ts` (`manifest-npm.ts`, ...), each `(path, text) => { facts } | { parseFault }`, pure; a driver that takes the tree listing, the screen, the reader and the content classes and returns the member.
- `check.ts`: derive it in the `plan.command === 'check'` block beside `deriveTreeFacts`, after the listing; on a listing refusal, the `unknown` form. Append it after `figureFit` (and `readingLedger`) when building `stored`.
- Rule ids beside the others in `derive-rules.ts`; they are not trait rules and do not join `DERIVE_RULES`, so the structure record's `rules` list keeps its bytes.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-25/R-MANIFEST-RECOGNIZERS-SPEC-1-RAW.md`, read the first draft (spec SHA-256 `8351807390db1070d71b9abfdc83ab0dbb4d0300aa21f2f4d6595a528678f069`) and records `Verdict: CONFIRM WITH EXCEPTIONS` at its line 3: thirteen findings, none blocking. It reproduced the semantic delta by script and found it exact, and confirmed the policy-admission sentence against the real screen. Every finding was repaired or answered as below in the bytes this package now carries; none was overruled. Under D10 the review gates nothing and no confirmation round was run, so the repairs themselves are unreviewed.

- F1 (which strings the value checks cover): repaired. The checks apply to the strings a fact takes from the body (`name`, `pattern`, `group`, `event`, `job`, `from`, `to`), never `path`, `rule` or `section`, with the detectors the screen runs over text given with no path; paths are bounded separately: a path over 512 code units or with a control character is Unknown `path-not-citable`, never read, and shown in the census form.
- F2 (facts as "part of the structure record"): repaired. The paragraph says they are a separate record stored in the check record, not among the structure record's members, and read by no trait or pack rule; this design says the same.
- F3 (span ends): repaired. A span ends at the last line holding a character of the value's own text (for a table, of its last key and value), never a following blank or comment-only line.
- F4 ("as written" for quoted keys): repaired. Every key, name, pattern, event and job is the decoded string, not case-folded or normalised.
- F5 (parse-fault precedence and uncovered forms): repaired. Faults are taken in the order `duplicate-key`, `syntax`, `field-type`, `beyond-reader`; a leading U+FEFF is `syntax`; a non-string key a member is taken from and a `dependency-groups` element that is neither a string nor a table are `field-type`.
- F6 (read limit against listing cap; "listed" in two senses): repaired. The disposition is now a "named file"; `inferred` and `unknown` count every named file; `files` lists the files read first, so every file read is listed; a twelfth scenario, "Unread files sorting first do not hide read ones", exercises it, and a Falsifier clause refuses a read file that is not listed.
- F7 (determinism inputs; refused reads): repaired. The inputs name the screen the run loads (policy bytes, placement subject, visibility), and byte identity is claimed for checks in which no read is refused; the scenario says the same.
- F8 (size limit after a whole read): repaired. Manifests are read through a reader whose object bound is 1,048,576 bytes; a blob over it is refused before inflation and is `too-large`.
- F9 (redacted-body unreachable under a bound policy): repaired. The paragraph says no body of these kinds is retained under 1.0.0 or 2.0.0, so that arm runs under a screen double; the scenario and the Oracle line say so.
- F10 (qualification gaps): repaired. The golden minimum is stated per recognizer (package recognizers; `go-module-manifest`; `github-actions-workflow`), the set of forms a reader refuses is part of its rule (a change is a new rule version), and the mutation record names any parser package and version.
- F11 (two scenarios): repaired. The workspace scenario fixes the run's content classes (no statement, or one listing `code-content`), and the unchanged-pages scenario compares with the predecessor composition (2.5's REQ-034 with 2.6 in force) for the same run.
- F12 (falsifier weaker than its rule): repaired. The missing-member clause covers the `unknown` form when the tree could not be listed.
- F13 (tasks ticked before the review): answered. The item is ticked in the install commit, which retains the raw and these dispositions (as version 2.5's F8 was answered).

[Observed] The repairs also moved repository-looking fixture paths out of code spans in the scenarios and this design (CG-1b of `scripts/check_governance.py` resolves every code-span path against the tree), with no change to what they say. The repaired spec has 82 scenarios (70 carried, 12 added).
