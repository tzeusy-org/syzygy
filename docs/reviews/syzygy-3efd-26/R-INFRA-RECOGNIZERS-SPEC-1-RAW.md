# R-INFRA-RECOGNIZERS-SPEC-1 — fresh-reader review of dossier infrastructure recognizers 2.12
Subject SHA-256: 1ffbab8270e2c7824af84cf449ba6988c422968d317097754ceecf9a1171a83f
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

- Subject: `openspec/changes/dossier-infrastructure-recognizers/proposed/polaris-generation/spec.md` in the worktree `.worktrees/parallel-agents/syzygy-3efd.26` (branch `agent/syzygy-3efd.26`, uncommitted, HEAD `06529d12cc78b99efd0950bb0a34544cd5922550`). [Observed] `sha256sum` gives `1ffbab8270e2c7824af84cf449ba6988c422968d317097754ceecf9a1171a83f`, the digest named in the brief and in `INFRA_SUBJECTS`.
- Also read: `proposal.md`, `design.md`, `SEMANTIC-DELTA.md`, `README.md`, `tasks.md`, `GOVERNING-DEPENDENCIES.json` of the package; the `INFRA_*`/`infra_*` wiring in `scripts/check_spec_reconciliation.py` and `scripts/count_polaris_effective_scenarios.py` (working-tree diff); `docs/evidence/syzygy-3efd-26/` (all three files).
- Predecessor: `openspec/changes/dossier-spec-corrections/proposed/polaris-generation/spec.md`, [Observed] SHA-256 `376f27c0261120d0238d0d4a6685fe08b19ff03a9d00fcb4a6702349f64834c3` (matches `CORR_SUBJECTS`).
- Code at HEAD read: `check.ts` (readSubject 417–426, freeze 272, reading difference 344, secret test 237, brief 399), `check-record-read.ts` (`readBoundedFile`), `review-packet.ts` (`latestPassedDraft`), `inventory.ts` (`authoringSessionIds` and its four callers, 289, 381), `rerender-measure.ts` (59–87), `run-advice.ts` (60–125), `polaris.ts` (236, 601, 685, 718–729, 754–755), `run-dir.ts` 76, `render.ts` 159 and 897, `close.ts` 180, `derive.ts` (`secretOrUnder`, `setApartPath`, `deriveTreeFacts`), `derived-record.ts` 35, `manifest-facts.ts` 28, 85, 100–160, `manifest-model.ts` 17, `manifest-yaml.ts` header and 455–462, `census.ts` 30, `run-config.ts` 123, `derive-rules.ts` set-apart lists, `dossier-site.ts` 1248; the two declared-source policy files (v1 SHA-256 `516cb1f2…aa499`, v2 `8c10531f…b11967`, both [Observed] equal to the design's).
- Method:
  1. Line-level `difflib` alignment of predecessor against subject, then a word-level diff of every predecessor line not carried verbatim, each paired with its successor line by hand where the automatic pairing was wrong. [Observed] 788 predecessor lines, 770 carried verbatim and in order; the 18 non-blank lines not carried are 1, 3, 58, 80, 82, 84, 86, 96, 98, 110, 539, 585, 601, 606, 772, 773, 774, 776, and every word change in each is listed in `SEMANTIC-DELTA.md` (title/preamble; reading difference; opening paragraph ×3; "of version 2.7"; dispositions ×4; member paragraph; label paragraph; computed maps ×2; four scenarios; four Form lines). The new lines not derived from a predecessor line are 84, 86, 88, 94, 100, 106, 116, 124 and the thirteen scenarios 786–859.
  2. `grep -c '^#### Scenario'`: [Observed] 110 in the predecessor, 123 in the subject; the thirteen added titles equal the delta's list.
  3. Re-ran `node docs/evidence/syzygy-3efd-26/manifest_member_bound.mjs` with the three recorded argument vectors on node v24.6.0: [Observed] 9,873,408, 15,629,421 and 12,741,921 bytes, identical to the record; script SHA-256 `5328e044…19f7f3` and probe output SHA-256 `e20c2f3e…43545` match the record.
  4. Re-derived the arithmetic of every added scenario by hand (below).
  5. Swept `readFileSync|readFile(|promises.readFile` over non-test `.ts` in `packages/polaris-dossier/src/` and `apps/three-surface-poc/src/polaris-generation/`: [Observed] 75 lines, as the design says.
  6. `python3 scripts/check_spec_reconciliation.py --check`: [Observed] 7 of 7 predicates without FAIL; R1 reports "infrastructure recognizers: one v2.12 row over effective v2.11, pending until recorded". `python3 scripts/count_polaris_effective_scenarios.py`: [Observed] 39 requirements, 423 scenarios (2.12 pending, so not composed). `--selftest`: see the closing note.

## Findings

### F1 — blocking — the carried Falsifier still falsifies the new member bound

Location: spec line 867, **Falsifier** Form line (carried from predecessor line 776).

Evidence [Observed]: the carried clause reads "the `manifestFacts` member at this version's caps takes 10,000,000 bytes or more;". The amended member paragraph (line 92) now says "At this version's caps the member ... takes fewer than 13,000,000 bytes whatever the tree holds (fewer than 10,000,000 before version 2.12)", and the evidence record measures the widest member at this version's caps as 12,741,921 bytes, which I reproduced. So an implementation that meets line 92 exactly is falsified by line 867: a test written from the Falsifier would fail a conforming member of 12.7 MB. The delta amended the scenario "Largest manifest facts read back with the check" (10,000,000 to 13,000,000) and appended eleven clauses to the Falsifier, but left this clause; `SEMANTIC-DELTA.md` says of the Form lines "none of its existing text changed", so the omission is not disclosed either.

Repair: change that clause to "takes 13,000,000 bytes or more" (or "fewer than 10,000,000 before version 2.12" style wording), list it under "Amended" in `SEMANTIC-DELTA.md`, and drop "none of its existing text changed" for the Falsifier. Sweep the subject once more for every other carried literal of the old caps (I found no other: [Observed] the only remaining `10,000,000` outside line 92's parenthesis is line 867; `250th` survives only in line 90, where it is amended, and line 863, the Case line, where "the 250th and 251st readable file" is still true of the version 2.7 recognizers and the appended Case sentence adds "read counts at and past 100").

### F2 — non-blocking — the delta miscounts the inserted paragraphs

Location: `SEMANTIC-DELTA.md`, "Carried unchanged" ("the insertions (seven paragraphs, thirteen scenarios)") and "Added" ("Seven paragraphs:").

Evidence [Observed]: the bullets under "Added" themselves enumerate three + one + one + one + one + one = eight paragraphs, and the subject has eight new paragraphs at lines 84, 86, 88, 94, 100, 106, 116 and 124.

Repair: "eight paragraphs" in both places (rule 3: compute the total).

### F3 — non-blocking — the remainder's `candidates` identity reads two ways

Location: spec line 94: "`candidates` the others that are a candidate of some recognizer, which is the sum over the recognizers of `candidates` less `secretPathsLeftOut`".

Evidence [Observed]: the sentence defines the remainder's own `secretPathsLeftOut` (every blob whose path or prefix a detector matches, candidate or not) immediately before. Read with that member, "sum of `candidates` less `secretPathsLeftOut`" is wrong whenever a secret-matching path is not a candidate (in the scenario "Coverage remainder sums to the tree": recognizer candidates sum to 5, the remainder's `secretPathsLeftOut` is 1, the stated `candidates` is 5, not 4). The intended identity is the sum over the recognizers of each entry's (`candidates` − `secretPathsLeftOut`), which holds because both use the same `secretOrUnder` test with the same predicate ([Observed] `manifest-facts.ts` 118/132 and `derive.ts` 204 with `secretPathOf`, `derived-record.ts` 35) and because no path is a candidate of two recognizers.

Repair: "which is the sum, over the recognizer entries, of each entry's `candidates` less that entry's `secretPathsLeftOut`".

### F4 — non-blocking — the re-render measurement sentence does not match the code it says it changes only by a bound

Location: spec line 100 ("and the stored-draft re-render measurement, which counts it as a revision it could not read"); `design.md` table row `rerender-measure.ts` 80.

Evidence [Observed]: `rerender-measure.ts` 73–76 classifies by `Dirent`: `if (match === null || !name.isFile()) { otherDraftFiles += 1; continue; }`. A FIFO, device, directory or symbolic link named `rev-<n>.json` is therefore counted in `otherDraftFiles` and never opened; it never becomes "a revision it could not read". Only a regular file past the bound (or one swapped after the listing) reaches the read. So the sentence, taken literally, requires a behaviour change (and a change in the record's population digest, `populationDigest`, 175–177) that neither the delta nor the design lists; the design also says "the instrument itself is under no requirement", which sits oddly with REQ-034 now stating its observable.

Repair: either drop the measurement from the normative sentence (keep it in the design as a code note, as the other instrument reads are), or say "counts a revision past the bound, or one that is not a regular file when opened, as a revision it could not read; a directory entry that is not a regular file stays counted among the other files of `drafts/`".

### F5 — non-blocking — the syzygy-3efd.76 scope line leaves a file of REQ-034 itself unbounded, and the bead cannot close on this package

Location: `design.md`, "The reader rule for three more files", the paragraph beginning "The same sweep shows further same-class reads".

Evidence [Observed]: the brief record `brief.json` is REQ-034's own file (the requirement is "Agent brief and mechanically checked draft"), lies in the agent-writable run tree, and is read with an unbounded `readFileSync` before parsing by `check.ts` 399, `reverify.ts` 62 and `credential-probe.ts` 202. The design defers it because "its bound needs a derivation from the brief writer's caps that this package did not make", yet all three readers already parse it under one and the same bound, 262,144 bytes (`BRIEF_JSON_LIMITS`, `check-model.ts` 27; `BRIEF_RECORD_LIMITS`, `reverify.ts` 55; the literal in `credential-probe.ts` 202), and for `run-advice.json` the package does exactly what it declines here: it states the code's existing bound with an [Inferred] note that it is not writer-derived. The acceptance criterion the brief quotes is "every remaining unbounded read from the agent-writable run tree uses the 2.10 reader rule ... with a stated bound per file"; only reads of *other* requirements' files are to be reported rather than specified. Separately, the bead's headline reads (`polaris.ts` 236, 601, 685/754–755, 720, 729) are all correctly attributed to other requirements [Observed: `REVIEW_CHECKS` verdicts are REQ-035; `run.json` is REQ-033; the supervisor state belongs to the candidate one-command run], so the package resolves none of the reads in the bead's title; the design says "A follow-up bead should carry them" but no bead is named.

Repair: add `brief.json` at 262,144 bytes (the bound all three readers already apply, labelled as the code's bound, as `run-advice.json`'s is) with the words each reader gives, or state in the design why its outcome words cannot be fixed at this version; and name (file) the follow-up bead for the reported reads, saying in `tasks.md` that syzygy-3efd.76 stays open until it lands.

### F6 — non-blocking — the makefile reader leaves rule-versus-assignment precedence and "recipe line" undefined

Location: spec line 84 (`makefile` rule definition) and line 86 (its faults).

Evidence [Observed]: a rule is "a logical line, outside a recipe and a `define` body, holding a `:` that is neither inside a variable reference ... nor part of an assignment operator". A line such as `A := b: c` holds an assignment operator and a further `:` outside it, so the text makes it a rule with targets `A`, `:=` and `b`, while GNU make reads it as an assignment of `b: c` to `A` (the first operator decides). Two code workers can differ and a test cannot tell which the text means. Likewise "a recipe line" and "outside a recipe" are used (and "a recipe line before the first rule" is a `syntax` fault) but never defined: whether a tab-led line after an assignment that follows a rule is a recipe line, and whether `.RECIPEPREFIX` is honoured, are open. The `terraform-configuration` reader likewise "has no `beyond-reader` fault" yet need only read blocks "nested at least 256 deep"; the fault a deeper nest gets is unstated.

Repair: state that a logical line whose first assignment operator precedes its first separator `:` is an assignment; define a recipe line as a line beginning with a tab that follows a rule or another recipe line (blank and comment lines between them kept), with `.RECIPEPREFIX` either read or `beyond-reader`; and state the Terraform reader's fault past its nesting limit (`syntax`, or allow `beyond-reader` there).

### F7 — non-blocking — non-mapping YAML under a Kubernetes directory becomes an Unknown Kubernetes manifest

Location: spec lines 84 and 86 (`kubernetes-manifest`: "a document root that is neither null nor a mapping ... `field-type`"); `design.md`, `kubernetes-manifest` bullet.

Evidence [Inferred]: the design rejects a wider path rule because it "would spend the read limit on configuration that is not Kubernetes" and keeps Helm `templates` out so as not to fill "the Unknown list with files that are not manifests", and treats a mapping lacking `apiVersion` or `kind` as "not a Kubernetes object" with zero facts. But a YAML file under `deploy/` whose root is a sequence (an Ansible playbook, a list of anything) or a scalar is `unparsed`/`field-type`, so it is listed Unknown on the infrastructure map as a manifest Syzygy could not read, which is the outcome the design set out to avoid. This is a design judgement, not a contradiction.

Repair: either treat any non-mapping, non-null document root as "not a Kubernetes object" (zero facts), consistent with the missing-`kind` rule, or say in the design why a sequence root is Unknown while a mapping without `kind` is not.

### F8 — non-blocking — a `compose-file` with a null root is stated two ways

Location: spec line 84 (`compose-file` reads "one document whose root is a mapping, as `github-actions-workflow` reads a workflow") and line 86 ("a document root that is neither null nor a mapping ... are `field-type`", in a sentence covering both YAML recognizers).

Evidence [Observed]: the line 86 phrase exempts a null root from `field-type` for both recognizers, while line 84 requires a mapping root for `compose-file` and points at the workflow rule, under which a root that is not a mapping is `field-type`. A comment-only `compose.yaml` (not empty, so not `syntax`) is either `field-type` or Inferred with zero facts depending on which sentence a worker follows.

Repair: scope "neither null nor a mapping" to `kubernetes-manifest` and say that a `compose-file` root that is not a mapping, null included, is `field-type`.

### F9 — non-blocking — four new scenarios do not name the bound policy their THEN depends on

Location: scenarios "Kubernetes objects across documents" (792), "Make targets" (804), "Malformed infrastructure file is Unknown, never empty" (816), "Infrastructure map rendered" (839).

Evidence [Observed]: the new scenario "CMake lists and other makefile names Unknown under the bound policy" itself states that "under 1.0.0 every named file of the five recognizers of version 2.12 is Unknown" (`unknown-extraction-class`). Under 1.0.0 the THEN of each of the four scenarios is false (no facts; no parse faults). The Compose and Terraform scenarios do name "declared-source policy 2.0.0". The 2.7 scenarios have the same gap, so this follows precedent, but the new CMake scenario makes the dependency explicit.

Repair: add "under declared-source policy 2.0.0" to each WHEN.

### F10 — non-blocking — the list of frozen-revision readers omits one call and enshrines a non-fail-closed rule without saying so

Location: spec line 100 ("Syzygy collecting the session identifiers the frozen revisions declare, for an inventory check and a review check, for which such a revision is counted as frozen and declares no identifier").

Evidence [Observed]: `authoringSessionIds` is also called by `inventory.ts` 381, Syzygy deciding whether an inventory counts (`inventoryOfRecord`), which the sentence does not name (the opening "every reader of one SHALL" covers it, so the gap is in where a reader sees the outcome). [Inferred] Stating normatively that an unreadable revision "declares no identifier" in the session-distinctness checks is the code's existing rule ("an unreadable revision declares nothing", `inventory.ts` 74) and opens no new path, since the authoring session can already rewrite its own frozen revision; but under the fail-closed polarity a revision that cannot be read leaves distinctness unestablished rather than established. The package should say that it states the existing polarity on purpose.

Repair: add "and Syzygy deciding whether an inventory counts" to the list, and one sentence in the design acknowledging the polarity choice.

## Checked and found sound

- [Observed] Byte-for-byte carry: every predecessor line not listed in `SEMANTIC-DELTA.md` is carried verbatim and in order (770 of 788 lines; method step 1), and every word-level change inside the 18 amended lines is among the delta's listed amendments, apart from F1's omission, which is an unchanged line that should have changed.
- [Observed] Scenario count 110 to 123; four amended scenarios (555, 601, 617, 622) as listed; the selftest case `infra_cases` asserts 110 → 123 for 034 only (`check_spec_reconciliation.py` ~6121 and ~6133).
- [Observed] Member bound: the three runs reproduce exactly; the widest-fact choice holds, since every 2.12 kind takes at most two body strings, no `section`, and kind and rule names no longer in total than `dependency` + `python-project-manifest` plus a `section` line; the composed `port` is itself a value-checked string (line 90), so it cannot exceed 256 code units.
- Scenario arithmetic, re-derived:
  - Compose, 8 facts: two `service`, one `service-image`, three `service-port`, two `service-depends-on`; `9001:9000` from a string `published` and an integer `target`.
  - Kubernetes: two objects, a null name for the Service without `metadata`; the `templates` path is no candidate.
  - Make: `build` and `test` only; `.PHONY`, `%.o`, `$(BIN)`, the target-specific assignment, the recipe line and the second `build` give no fact.
  - CMake: `unknown` 2 and `makefile` `unknown` 2 under both policies, matching the probe rows.
  - Malformed: the six faults follow the stated fault order.
  - Read limit: 100 read and listed, 10 Unknown `over-read-limit` counted unlisted, and the one 2.11 count item `10 files whose facts are Unknown are counted and not listed.`
  - Remainder: 10 = 1 + 5 + 4; places root (3,1), `.github` (1,0), `infra` (2,1), `src` (3,2) in code-unit order, summing to 9 and 4.
  - 260 directories: root plus 250 listed, 10/10/10 counted.
  - Infrastructure map: `compose.yaml: 8 facts.` and `Makefile: 1 fact.`
- [Observed] The remainder uses the structure record's secret test and blob modes (`deriveTreeFacts`: `BLOB_MODES`, `secretOrUnder`, `rootFiles`, per-unit counts), so a place's `files` equals the `tree-root`/`top-level-unit` count as stated, and it names no directory the derived record could not name (SEC-5 not weakened).
- [Observed] syzygy-3efd.79: `check.ts` 344 passes `'bounded'` whenever `!full`, whether or not the draft parsed, so the new sentence at line 58 states the code and contradicts no carried sentence (line 96 of the subject already gives the bounded words for a bounded record).
- [Observed] syzygy-3efd.76, the three in-scope reads:
  - `readSubject` does `statSync` then `readFileSync` (417–426) on `path.resolve(file)` (190), and its refusal precedes the freeze (191–192 against 272).
  - Check freezes exactly the bytes it read (272), so 4,194,304 is a writer-derived bound for frozen revisions.
  - `latestPassedDraft`'s reason passes unchanged into render (`nothing is rendered: …`), close (`… are not recorded: …`) and review (`stage: 'draft'`).
  - `readRunAdvice` has no production caller (only `writeRunAdvice` is used, `check.ts` 333).
  - `readBoundedFile` gives exactly the open/fstat/read-at-most-bound+1 rule the text restates.
  - The inventory refusal words quoted in the last scenario are the code's (`inventory.ts` 291).
- [Observed] Every line reference in `design.md` that I checked lands on the cited code: `check.ts` 237, 272, 344, 399, 417–426; `check-model.ts` 25; `inventory.ts` 50, 71; `run-advice.ts` 103, 111–113; `review-packet.ts` 44; `polaris.ts` 236, 601, 685, 720, 729, 754–755; `run-dir.ts` 76; `render.ts` 897; `derive.ts` 105; `derived-record.ts` 35; `census.ts` 30; `manifest-model.ts` 17; `manifest-facts.ts` 85; `dossier-site.ts` 1248; `run-config.ts` 123. `MANIFEST_FACTS_FORMAT` is compared only in `manifest-facts.ts` and tests; the literal `manifest-facts/1` also appears in `dossier-reading.testkit.ts`, which is test support, so the design's "only ... in tests" holds.
- [Observed] Admission:
  - The v2 policy lists `.tf` among `configurationExtensions` and `.tfvars`, `.tfvars.json`, `.tfstate`, `.tfstate.backup` among `deniedPathSuffixes`, consistent with the probe and with "never read".
  - Its `kubernetes-secret-kind` body detector means a manifest declaring a Secret is excluded whole, never parsed.
  - `redactionClasses.neverEmitted` holds `redacted-span`, as the design says.
- [Inferred] No owner-class decision:
  - No doctrine edit.
  - No screening-policy or detector change; every body is screened whole and every taken string is value-checked as in 2.7.
  - No foreign repository.
  - No exposure or release.
  - Labels stay Inferred, with no upgrade path taken.
- [Observed] `GOVERNING-DEPENDENCIES.json` is byte-identical to version 2.11's (`cmp`). The checker wiring keeps 2.12 pending until a seven-column row with the tag, the landed commit, a spec link at that commit and a matching revert, and it requires 2.11 effective before composing. `--check` is PASS on this tree.
- [Observed] No path from the Butlers repository appears in any package file.

Closing note on the selftest: [Observed] `python3 scripts/check_spec_reconciliation.py --selftest` on this tree printed `SELFTEST PASS: clean scratch copy and its signed- and adopted-addition variants pass; 363 of 363 mutants killed by their expected predicate; 65 of 65 controls held (commit 06529d12cc78)` and exited 0.
