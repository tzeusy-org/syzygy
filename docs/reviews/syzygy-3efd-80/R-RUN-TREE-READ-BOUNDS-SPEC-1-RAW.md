Subject: openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md (version 2.18; MODIFIED REQ-polaris-generation-033, -035, -048)
Spec sha256: a9e859c596cbd4bbda2d9a9259fea0dbbbfa9eb2cc2160fa4754f82643d82d51
Verdict: REVISE
Reviewed commit: 852cd7e2b29ffd9b702c84f99ccd013ad5dbb790

Reviewer: fresh-context specification reviewer (r80spec), read-only, 2026-11-23. Code cited at c900e871 (852cd7e2's only parent; 852cd7e2 changes no code).

## Checks run

- [Observed] The subject's sha256, taken with `git show 852cd7e2:<spec> | sha256sum`, is a9e859c5…2d51. It matches the brief.
- [Observed] Carried bytes (criterion 3). I split each requirement block from the predecessors: 033 from dossier-raw-read-disclosure, and 035 and 048 from dossier-url-declared-source-run. I compared each against the subject with difflib.
  - For each requirement, the changes are exactly:
    - one inserted paragraph;
    - one inserted run of scenarios;
    - Case, Observable and Oracle each extended, with the old line kept as a full prefix;
    - Falsifier extended, with the old line minus its final period kept as a prefix.
  - Nothing else changed apart from two trailing blank lines at the end of the 035 block, which sit at a file boundary and are not normative.
  - Scenario counts: 033 goes 9→11, 035 goes 37→40 and 048 goes 27→28, a total of +6 as declared.
  - No predecessor composition was skipped. The only other package that modifies 035 or 048 is dossier-declared-source-model, at 2.0, which is earlier.
- [Observed] Sweep (criterion 1). Population: `git ls-files` of the two directories, less `*.test.ts` and `*.testkit.ts`, giving 119 files.
  - Method 1: Python `re` per line over a wider predicate that also catches openSync, readSync, createReadStream, readdirSync, opendirSync and readlinkSync. It found 137 hits. The package's five call names account for 93 of them, and 4 of those are definitions (check-record-read.ts 26 and 32, run-dir.ts 88, rerender-measure.ts 271), leaving 89.
  - Method 2: `grep -o -E` over the concatenated files, without import lines, gives 93 − 4 = 89.
  - Both equal the sweep's 89 sites, and its four classes sum to 89.
  - All 11 `readRecord` callers read prompt, launch-form, delivery or review check records, as classified.
  - The 8 openSync and 7 readSync hits outside the helper are the loops the design names, plus durable-lifecycle (writes) and credential-probe 44.
  - A repository-wide search for run-tree filenames outside the two directories finds only `scripts/` instruments (for example dossier_run_evidence.mjs, dossier_scale_measure.mjs) and unrelated names.
- [Observed] Bounds against the code: the following constants match their cited lines:
  - RECORD_JSON_LIMITS in run-record.ts 104 (65,536) and run-dir.ts 42 (262,144);
  - DELIVERY_JSON_LIMITS in waiting-sessions.ts 69 (65,536);
  - VERDICT_MAX_BYTES in review-model.ts 34;
  - SITE_MAX_BYTES in design-review.ts 31;
  - LIST_MAX_BYTES (65,536), execution-choice (8,192) and status record.json (16 MiB).
  - packet.sha256 is 64 + 2 + 11 + 1 = 78 bytes.
  - Existing words match the code: review.ts 137–138, credential-probe.ts 70–71, design-review.ts 60 and 64, reverify.ts 92, status.ts 76.
- [Observed] Checker (criterion 5): `scripts/check_spec_reconciliation.py --selftest` at 852cd7e2 printed "SELFTEST PASS … 440 of 440 mutants killed … 86 of 86 controls held". The run-tree-read-bounds mutants all printed `killed`. `--check` printed "7 of 7 predicates without FAIL; PASS". `count_polaris_effective_scenarios.py` printed 39 requirements and 478 scenarios, matching while the change is pending.
- [Observed] Version: origin/main at c900e871 has tags only up to `polaris-dossier-raw-read-disclosure-v2.17` (A-51). No origin/agent/* branch other than 3efd.80 has "version 2.18" or "-v2.18" under openspec/. Open PR #902 (dossier-verify-text, also modifying REQ-033) still labels itself 2.17.

## Findings

1. **[blocking] An unreadable breach log or step log is now specified as an empty one, which is a zero standing in for missing evidence (VIS-2; criterion 2).**
   - Where: spec.md:23. The REQ-033 paragraph says "close carries no instants from such a step log and no entries from such a breach log, as for a log it cannot read".
   - What the code does today [Observed]: `close.ts` 225–227 `breachLog` returns `[]` on any read error, and close.ts 148 records it as `credential.breaches`. `stepInstants` (close.ts 212) records `entries: []` and `unreadable: 0`.
   - The effect [Inferred]: a FIFO, a link to a device, a directory, or a breach log past its bound comes out in the Execution Record identical to "no breach recorded". That is a past-bound or non-regular outcome that reads as a pass. Version 2.18 is the first text that makes this normative, and none of the new scenarios or falsifier clauses can catch it.
   - The design's polarity argument (design.md, "Polarity") does not change what the record shows: the probe re-runs, the record is Inferred, and agents can already delete the file. A missing file (ENOENT) can honestly mean no breaches; a file that is present but unreadable cannot.
   - Repair: state that close records a step or breach log that is present but not a regular file, or past its bound, as unreadable. For example, `breaches` carries one entry `{unreadable: true, why: "credential-breaches.jsonl cannot be read (not a regular file)"}` or `(larger than 16777216 bytes)`, and `stepInstants` counts the log as unreadable with the same words. ENOENT stays as it is. Then:
     - add a scenario, for example "Breach log that cannot be read is not recorded as none";
     - add a falsifier clause: "close records a breach log that is not a regular file or is past its bound as holding no breaches";
     - list the change in "Bytes this version changes": it affects close-record bytes only for those paths.

2. **[note] The packet.json bound has an ambiguous referent and is set by agent-writable data; the residual understates this.**
   - Where: spec.md:164 ("under the `packetBytes` that the delivery record Syzygy wrote for that round states, or under its own size where that record cannot be read or states none").
   - Which record [Observed]: `packetBytes` exists only in the run-directory record `reviews/<deliveryRecordName>` (waiting-sessions.ts 330–332, 340, read at 651). The round's own `delivery.json`, which the same paragraph also calls something Syzygy wrote, has no `packetBytes` (waiting-sessions.ts 343). A reader can take the wrong record and fall back to "own size".
   - The bound is attacker-settable [Inferred]: that record lies in the run directory, within the agent sessions' write reach, so an agent can raise `packetBytes` or remove it. A large regular packet is then read whole.
   - The fallback read is pointless [Observed]: where the record cannot be read, the command already refuses with the mismatch words (waiting-sessions.ts 653, `record === undefined`), so reading the packet first gains nothing.
   - Repair:
     - name the record by path (`reviews/<kind>-delivery-<session>-<round>` or however it is spelled);
     - where it cannot be read, refuse with the existing mismatch words without reading the packet;
     - keep "own size" only for a readable legacy record with no `packetBytes`;
     - widen the design residual to say that the bound comes from an agent-writable record.

3. **[note] The "not the run tree" reason for `clone-head.ts:31` is inaccurate.**
   - Where: run-tree-read-sweep-2026-11-23.json, row `clone-head.ts:31`, whose reason is "the clone reader bounds them".
   - What the code does [Observed]: `readSmall` (clone-head.ts 21–34) does an `lstat` and then a whole `readFileSync`. That is the stat-then-whole-read pattern this bead removes, and the module's own header says "HEAD and the refs it names lie within the agent sessions' write reach".
   - Related [Observed]: `launch-clone.ts` 83 opens with `O_NOFOLLOW` but without `O_NONBLOCK`, after an `lstat`. A FIFO swapped in between would block the open. The design's "open without blocking or bound their reads" covers this only through its "or".
   - The scope boundary (the clone is not the run tree) is defensible [Inferred].
   - Repair: correct the reason to something like "outside the run tree; stat-then-read on agent-writable clone refs, not covered by this version". Record clone-head.ts 31 (and launch-clone.ts 83) as residuals with a follow-on bead.

4. **[note] Taking an unreadable supervisor state as no earlier state does not fail closed.**
   - Where: spec.md:506 ("a supervisor started for that run takes it as having no earlier state").
   - What happens next [Observed]: `supervise` (polaris.ts 290) then builds a fresh state, and `saveState` (polaris.ts 238–239) opens the same path for writing, following links. A FIFO there blocks that write [Inferred], so the run still blocks even though no reader does.
   - Separate race [Observed]: `--resume` reads the state twice (polaris.ts 155 and 174, the second with `!`). A file swapped between the two reads throws instead of refusing.
   - Repair:
     - a supervisor started for a run whose state path exists but cannot be read refuses with the resume words;
     - the state is read once per command.

5. **[note] The inventory brief is bounded "under its own size" even though Syzygy writes it.**
   - Where: spec.md:164.
   - [Observed] Syzygy writes the brief (session-handover.ts 229 and 408) and records only its digest (215). The residual is disclosed in design.md under "Residuals".
   - Repair (optional): record the brief's byte length beside its digest, as `packetBytes` does, so a later version can state a writer-derived bound. Or keep the residual and name this as the reason no writer cap exists.

6. **[note] Some outcome wording is garbled or leaves a placeholder undefined (criterion 2).**
   - spec.md:164 says "The verdict `syzygy dossier review-check` is given". The scenario at spec.md:430 says "stands at the verdict review check is given". Repair: "the verdict file given to `syzygy dossier review-check`".
   - The site words "`<path> in site <n> is not a regular file`" leave `<path>` undefined. The code uses the path relative to the site (design-review.ts 56 and 60). Repair: "`<path>` being the file's path within the site".

7. **[note] REQ-033's warrants do not declare REQ-034 (CC-SPEC-2).**
   - Where: spec.md:144 (the 033 warrants block).
   - [Observed] Version 2.18 has 033 read files "by the reader rule of REQ-polaris-generation-034 version 2.10", but 033's `parent_requirements` does not list 034. Meanwhile 035 and 048 do, and 034 lists 033 as a parent, so adding it would create a cycle.
   - [Inferred] The paragraph restates the rule in full, so the dependency is a citation only.
   - Repair: say this in SEMANTIC-DELTA "Composition". Alternatively, drop "of REQ-polaris-generation-034 version 2.10" from 033 and keep the restated rule.

8. **[note] REQ-048's reason for distrusting the state file does not follow.**
   - Where: spec.md:506 ("The state root holds the run directory, which lies within the agent sessions' write reach, so the supervisor trusts neither the kind nor the size…").
   - [Inferred] `<run id>.supervisor.json` is a sibling of the run directory, not inside it, so the stated reason does not establish that agents can write it.
   - Repair: state the reason directly, for example "the supervisor trusts neither the kind nor the size of what stands at a path it does not hold open".

9. **[note] The sweep's population is not stated as excluding operator instruments.**
   - [Observed] `scripts/dossier_run_evidence.mjs`, `dossier_scale_measure.mjs`, `dossier_rerender_measure.mjs` and `dossier_coverage_precheck_replay.mjs` read run-tree files but sit outside the swept population.
   - Repair: in design.md "The sweep and its denominator", say that `scripts/` operator instruments are out of scope, and why.

10. **[note] Bookkeeping.**
    - README.md says design.md holds "the review's dispositions", but design.md has no "Review" section yet. tasks.md shows this as unchecked, so it is pending, not wrong.
    - The 2.18 label is free today [Observed], but PR #902 also modifies REQ-033 and will need renumbering. The design discloses this.
    - Repair: re-verify the label against origin/main immediately before the adoption commit, as the design already says.

## Criteria summary

1. Completeness: met for the run tree. The count of 89 is reproduced by two methods. Notes 3 and 9 cover classification wording and scope.
2. Unambiguous, fail-closed: **not met**. Finding 1 is blocking; findings 2, 4 and 6 are notes.
3. Carried bytes: met.
4. Secret screening and SEC-5: met [Inferred]. No detector, policy or screening path is touched, every new bound only refuses, and provider-mode files are untouched.
5. Bookkeeping: met. The checker and census pass, the scenario count rises by 6, and 2.18 is free; note 10 covers the rest.
