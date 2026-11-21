# R-MANIFEST-RECOGNIZERS-SPEC-1 — fresh-reader review of dossier manifest recognizers 2.7
Subject SHA-256: 8351807390db1070d71b9abfdc83ab0dbb4d0300aa21f2f4d6595a528678f069
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context agent, 2026-11-22

## Subject

- [Observed] `sha256sum` of `openspec/changes/dossier-manifest-recognizers/proposed/polaris-generation/spec.md` gives `8351807390db1070d71b9abfdc83ab0dbb4d0300aa21f2f4d6595a528678f069`, which matches the expected digest. The predecessor `openspec/changes/dossier-figure-kinds/proposed/polaris-generation/spec.md` gives `a949eebfae9492c70b36e703955449cbef9d4b5e6d65bc6151dbe6716ac37a2c`, as SEMANTIC-DELTA.md says.
- [Observed] I reproduced SEMANTIC-DELTA.md by script. A line-level `difflib` comparison of the predecessor and the subject finds:
  - replaced lines 1 and 3 (the title and the preamble);
  - replaced line 44, which equals the predecessor line with the delta's one `old`→`new` substitution applied;
  - an insertion at subject lines 79–88 (the five paragraphs, on lines 80, 82, 84, 86 and 88);
  - an insertion at subject lines 512–573 (the eleven scenarios);
  - four replaced Form lines (Case, Observable, Oracle, Falsifier). Each keeps the predecessor line as an exact prefix, and each appended suffix equals the delta's `new` string.

  No other line differs, so the delta is exact.
- [Observed] Scenario counts: 70 in the predecessor and 81 in the subject. NFC-normalised, no U+00A0. `GOVERNING-DEPENDENCIES.json` is byte-identical (`cmp`) to version 2.5's.
- [Observed] `python3 scripts/check_spec_reconciliation.py --check` gives R1–R4 and R7 OK. R1 reports "manifest recognizers: one v2.7 row over effective v2.5, pending until recorded". R5 FAILs with exactly one finding: "`openspec/README.md`: row for untracked `dossier-manifest-recognizers`". The cause is that the package is uncommitted, and [Inferred] the failure clears once it is tracked. R6 gives two pre-existing WARNs (syzygy-2g0d). `count_polaris_effective_scenarios.py` gives 39 requirements and 383 scenarios, equal to what PROJECT-STATUS.md asserts, so 2.7 is not counted while pending.
- [Observed] I checked the policy-admission claims by importing the actual `buildDossierScreen` from `packages/polaris-dossier/src/screen.ts`. I ran it out-of-tree from the scratchpad (a node resolve hook with `--conditions=source --experimental-transform-types`) over the committed policy bytes, with visibility `private`, and wrote nothing to the repository. Results:
  - Under 1.0.0, every probed `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod` and `.github/workflows/*.yml|yaml` path gives `unknown-extraction-class`.
  - Under 2.0.0, `package.json`, `packages/a/package.json`, `apps/web/package.json`, `tests/fixtures/package.json`, `Cargo.toml`, `crates/x/Cargo.toml`, `pyproject.toml` and `.github/workflows/{ci,release,deploy,codeql}.y*ml` are admitted as `code-content`, stage 2.
  - Under 2.0.0, `go.mod`, `cmd/x/go.mod`, `node_modules/x/package.json`, `PACKAGE.JSON` and `.github/workflows/{security,audit,test-results,output}.yml` give `unknown-extraction-class`.

  The spec's sentence on line 84 about 1.0.0 and 2.0.0 is therefore true for the paths probed.
- [Observed] Code read:
  - `census.ts`: `CENSUS_LISTED_LIMIT = 250`, the denied-path secret-as-text rule, and `CENSUS_PATH_LIMIT = 512`.
  - `class-gate.ts`: `unconsentedClass` passes code-content when `consented === null`.
  - `screen.ts`: the outcome words, and `screenTargetBody`, which excludes a Stage-2 body whole on any detector match.
  - `check.ts`: the check record is written with `JSON.stringify(stored)`, the report spreads `...stored`, and the listing/census/structure block runs regardless of `parseFault`.
  - `check-derive.ts`: cited blobs are read in one `readBlobs` call and screened by `screenTargetBody`.
  - `git-object-reader.ts`: `readBlobs` refuses the whole call on one refusal, and `maxObjectBytes` defaults to 2^30.
  - `derive-rules.ts`: `VENDORED_PATH`, `GENERATED_PATH` and `TESTS_PATH` are at version 1, and segments are compared exactly in `derive.ts`.
  - `quote-locate.ts` `lineBounds`/`lineCount`: LF, CR and CRLF terminate lines, and a final terminator opens no line.
- [Observed] `readingLedger` (2.4) has no implementation under `packages/` or `apps/`; it appears only in the spec. The ordering clause on line 80 ("after `figureFit` and `readingLedger` where present") is still well defined.
- [Unknown] I did not run `npm run check` and did not exercise any recognizer, because none exists yet.

## Findings

**F1 (non-blocking) — It is unclear which strings the value checks cover.** Spec line 84 says "each string it would carry is checked".
- Problem: a fact carries `path`, `rule`, `section` and `group` as well as its declared values. If `path` is included, every fact of a file whose path is over 256 code units, or contains a control character (git allows `\n` in a path), is dropped into `valuesLeftOut`. That same path is still named, uncapped, in the file's `files` entry. If `path` is excluded, the fact names an unbounded raw path. Either reading is defensible, so an implementer must guess.
- Repair: state that the checks apply to the members a fact takes from the body (`name`, `pattern`, `group`, `event`, `job`, `from`, `to`), not to `path`, `rule` or `section`. Separately bound paths in `files` and facts, as the census does (`CENSUS_PATH_LIMIT`, 512 code units, cut with a count). Also name which detector set the value check uses: [Inferred] the Stage-2 set including `configurationDetectors`, as `screenBody` uses for text with no path.

**F2 (non-blocking) — Calling the facts "part of the structure record" conflicts with the carried definition.** Line 80 says "the manifest facts are the part of the structure record that check stores".
- Conflict: carried line 62 defines the structure record as "derived from the paths and modes of the tree", and pack selection reads "the traits of the structure record". `derive-rules.ts` states that "A rule matches path text only: it never reads a blob".
- Risk: the phrase invites a reader to treat body-derived facts as structure-record content that traits or packs could read. That would contradict "enters no … brief".
- Repair: say that `manifestFacts` is a separate record stored beside the structure record, that it is not among the structure record's members, and that no trait or pack rule reads it.

**F3 (non-blocking) — Line spans have ambiguous ends.** Line 86.
- "the last line of its value" for a YAML `job` or `workflow-trigger` mapping, and "the last line of that table" for a `[dependencies.serde]` header, do not say whether trailing blank or comment lines belong to the value or table.
- Two conforming implementations would write different `lines`, so the bytes differ.
- Repair: define the end as the last line holding a character of the value's own text (or of the table's last key/value), never a following blank or comment-only line.

**F4 (non-blocking) — "As written" is ambiguous for quoted keys.** Lines 82 and 86.
- `cargo-manifest` group "the `&lt;spec&gt;` key as written" (`[target.'cfg(unix)'.dependencies]`), the workflow event "as written", a TOML dependency key `"serde_json"`, and YAML keys `'push'` could each mean the raw source text with quotes or the decoded key. `go.mod` alone says "unquoted where it is quoted".
- Repair: state "the decoded key string" (or the raw spelling) uniformly for every key-derived member.

**F5 (non-blocking) — Parse-fault precedence is unstated.** Line 84.
- In TOML v1.0.0 a repeated key is itself invalid TOML, so it is both `syntax` and `duplicate-key`. A redefined table header (`[dependencies]` twice) is the same.
- Some forms are not covered:
  - YAML job or `on` keys that are not strings under the core schema (an integer key);
  - a `dependency-groups` element that is neither a string nor a table;
  - a UTF-8 BOM before a `package.json` (RFC 8259 lets a parser ignore it or not, and check's decoder keeps it).
- Repair: give an order. For example, `duplicate-key` when the repeated name is in a table or mapping the recognizer reads, otherwise `syntax`; a non-string key where a string member is derived is `field-type`; any other `dependency-groups` element is `field-type`; a leading U+FEFF is (say) `syntax`.

**F6 (non-blocking) — The read limit and the listing cap select different populations.** Lines 84 and 86.
- `over-read-limit` counts only files "that none of these reasons reaches", while `files` lists the first 250 listed files of every disposition in path order.
- With early-sorting Unknown files (symlinks, denied paths), some files that were read and are Inferred land in `filesNotListed` and are invisible, while some Unknowns are listed.
- The term "listed file" also means two things: a disposition (not secret, not set apart) and "an entry in `files`". `inferred` and `unknown` count the former.
- The "More manifests" scenario (line 563) exercises only the case where every file is readable.
- Repair: rename the disposition (for example "an admitted-path candidate") and say plainly that `inferred` and `unknown` count all of them, including those in `filesNotListed`. Either accept and state the divergence, or list the read files first. Add a scenario with a symlink sorting before the 250th readable file.

**F7 (non-blocking) — The determinism inputs are incomplete.** Line 86 and line 553.
- The paragraph says the member is "a function of the pinned tree, the bytes of the blobs read, the bound policy's bytes and the run's content classes".
- The screen also depends on the placement subject (version-5 owner placements by repository) and the visibility (`screenTargetBody` redacts or excludes by visibility for Stage-1 bodies). [Inferred] Neither changes outcomes for the five kinds under 2.0.0, since all are Stage 2 and excluded whole. They would matter under "a later policy that admits more", which line 84 anticipates.
- A transient `object-read-refused` (for example a filesystem error code) also changes the member between two checks of one run, which the falsifier ("two checks of one run write different `manifestFacts` bytes") then reports as a defect.
- Repair: name "the screen the run loads (policy bytes, placement subject, visibility)" as the input, and exempt or qualify a check in which a read was refused.

**F8 (non-blocking) — The order of the size limit and the object reader is unstated.** Line 84.
- The spec says a body over 1,048,576 bytes is `too-large` "then", after the read. [Observed] The reader's default `maxObjectBytes` is 2^30, so a hostile 1 GiB `package.json` is inflated whole before being refused.
- [Observed] If an implementer bounds the reader instead (`maxObjectBytes`), the refusal surfaces as `corrupt-object`, which reads as `object-read-refused` and not `too-large`.
- Repair: state that the reader is opened with a 1,048,576-byte object bound and that this refusal is reported as `too-large`.

**F9 (non-blocking) — The redacted-body arm cannot be reached under a real bound policy.** Line 84 and line 541 ("retained with lines withheld … `redacted-body`").
- [Observed] Under 2.0.0 all four readable kinds are Stage 2, which `screenTargetBody` excludes whole and never redacts. Under 1.0.0 none is read.
- The scenario's `redacted-body` case can therefore only be produced with a screen double. The text does not say so, and the Oracle line says screen outcomes are fixed "by running the bound policy's screen".
- Repair: say that the `redacted-body` case runs under a screen double (or a fixture policy), and keep the bound-policy oracle for the other arms.

**F10 (non-blocking) — The qualification gate for an upgrade has two gaps.** Line 88.
- The minimum golden set "a workspace, a single package, a malformed file and an empty file" does not apply to `github-actions-workflow`, and to `go-module-manifest` only partly.
- The record binds "the SHA-256 of the recognizer's source", but the reader may rely on a third-party parser (design.md names `yaml` 2.9.0). Line 84 lets the reader "MAY refuse" aliases, anchors and similar forms. So the set of refused forms, and with it the facts, can change without a source-hash or rule-version change.
- Repair:
  - give a per-recognizer minimum (for workflows, a multi-job file with `needs`, a malformed file and an empty file);
  - state that the set of forms a reader refuses is part of the rule, so changing it is a new rule version;
  - have the record also name the parser package and version, or its lockfile entry digest.

**F11 (non-blocking) — Two scenarios are under-specified.**
- "Workspace manifests read into the check record" (line 512) does not fix the run's content classes. Under a statement that omits `code-content`, every file is `class-not-consented` and the THEN fails. Repair: add "with a run relying on no statement, or one listing `code-content`".
- "Pages and provider unchanged by manifest facts" (line 569) compares with "those version 2.5 renders". Between the two, 2.6 changed the policy a run binds, so "the same input" under 2.5 is ill-defined for a run bound to 2.0.0. Repair: compare with "the predecessor composition (2.5 for REQ-034, with 2.6 in force)", or with this version rendering the same run with `manifestFacts` removed.

**F12 (non-blocking) — One falsifier clause is weaker than its rule.** Line 580.
- The clause says the member "is missing from a draft check record of this version whose tree was listed".
- Line 86 requires the `state: "unknown"` form when the tree cannot be listed, so its absence there is also a defect.
- Repair: drop "whose tree was listed", or add "or lacks the `unknown` form when the tree was not listed".

**F13 (non-blocking) — tasks.md overstates the delivery state.**
- [Observed] `tasks.md` line 5 already marks "[x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned". README.md says `design.md` holds "the review's dispositions", which it does not yet.
- Repair: leave the box unticked until this raw is committed and dispositioned.

## What holds

- [Observed] The semantic delta is exact. Every changed line is either the delta's one substitution or a prefix-preserving Form-line append. The 70 predecessor scenarios and the warrants and dependency union are carried byte for byte.
- [Observed] The policy-admission sentence is true against the real screen for both bound policies, including that `go.mod` is never placed. It is also true that a workflow name carrying a withheld word (`security.yml`, `audit.yml`) stays unknown, which the "unless the policy withholds it on another ground" clause covers.
- [Inferred] Secret screening is not weakened:
  - secret-matching paths and prefixes are counted and never named;
  - set-apart paths are never named or read;
  - path outcomes, the class gate, and the symlink and over-limit cases are decided before any read;
  - each read is a separate pinned, re-hashed reader call;
  - only a body admitted whole is parsed, so an excluded or redacted body is never parsed or used;
  - extracted values get a second detector pass;
  - nothing enters a page, `machine.json`, brief, review packet or published file.

  The class gate matches `census.ts`'s (`unconsentedClass` over the run's statement).
- [Inferred] No label path to Observed exists at this version. Facts and recognizer entries are constant Inferred. An upgrade needs a later spec version naming a digest-bound evidence record. No draft, model, agent session or run-directory file can set a label, and stored check records are explicitly not read back.
- [Observed] The design fits the code: the listing/census block runs for unparsed drafts, the check record carries the member and the report spreads the record once, inventory records are excluded, `check.ts` already uses the `structureUnknown` form when the tree cannot be listed, and `lineBounds` gives a well-defined `[first, last]` range for the path-and-range check.
- [Inferred] The bead's acceptance points are all stated:
  - rule id, rule version and exact fields for all five recognizers;
  - the fact id form and members;
  - per-recognizer coverage with Unknown-never-empty;
  - caps with counts;
  - determinism;
  - the exclusions (no infrastructure formats, imports, run-time claims or version requirements);
  - a failing reader double;
  - byte-identical provider, page and derived goldens.

  The findings above are repairs to precision, not to scope.
