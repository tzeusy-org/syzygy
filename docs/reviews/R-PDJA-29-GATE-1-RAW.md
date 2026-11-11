# R-PDJA-29-GATE-1 — sign-off gate moved to registry entry v1.1, implementation review, round 1
Reviewed commit: 58f890e8
Subject: branch agent/syzygy-pdja-29-gate-v1-1
Verdict: REVISE

## What I ran

- Setup [Observed]
  - Fetched the branch; `origin/agent/syzygy-pdja-29-gate-v1-1` = `58f890e84ba644bf2cdda942840494116f8ef113`.
  - Created worktree `/home/orca/.tmp/reviews/rvgate` at 58f890e8 and ran `npm ci`.
  - Set `TMPDIR=/home/orca/.tmp/reviews/tmpgate` throughout.
  - Diff `18120149..58f890e8`: 10 files, +180/−79.
- Real branch, no v1.1 record [Observed]
  - `npm run check` exited 0: `Test Files  183 passed (183)` / `Tests  4306 passed | 1 skipped (4307)`.
  - `npm run test:integration` exited 0: `Test Files  94 passed (94)` / `Tests  2834 passed | 4 skipped (2838)`.
  - `python3 scripts/check_governance.py` exited 0: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- Simulated sign-off in a throwaway clone of 58f890e8 under TMPDIR [Observed]
  - Ran the recorder with the exact arguments from the brief. Output:
    - `wrote .syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md`
    - `appended the public-git-source-acquisition-local-agent v1.1 block to .syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`
  - It modified the installed entry JSON; I committed it in the clone only (`d33232dc`).
  - The recorder's `--check` takes the package as its argument, so the form is `--check public-git-source-acquisition-local-agent --version <v>`. Results:
    - 1.0, rc 0: `recorded public-git-source-acquisition-local-agent v1.0 sign-off regenerates exactly; superseded by a later version`
    - 1.1, rc 0: `recorded public-git-source-acquisition-local-agent v1.1 sign-off regenerates exactly; applied tree verified`
  - `npm run check` exited 0: `Test Files  183 passed (183)` / `Tests  4306 passed | 1 skipped (4307)`.
  - `npm run test:integration` exited 0: `Test Files  94 passed (94)` / `Tests  2834 passed | 4 skipped (2838)`.
  - `check_governance.py` exited 0: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- Direct gate probe with `vite-node` and the `source` condition, `now` = 2026-11-12T00:00:00Z [Observed]
  - Clone with both records:
    - `v1.1 ok public-git-source-acquisition-local-agent-v1.1 1794358565000`
    - The v1.0 form reads `refused` because the v1.1 file names its act. Expected: v1.0 is no longer the gate.
  - Real worktree with only the v1.0 record:
    - `v1.1 absent no owner-act record .syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md exists`
- Masking probes on a scratch copy of the simulated decisions directory and installed entry [Observed]
  - Each case was applied to the v1.0 record, then the file was restored (`cmp` confirmed).
  - A: Owner-selection slot set to `The owner withdraws public-git-source-acquisition-local-agent-v1.1` → v1.1 `ok`.
  - B: Disposition slot set to `Withdrawn: public-git-source-acquisition-local-agent-v1.1` → v1.1 `ok`.
  - C: withdrawal line appended → v1.1 `refused`, named by the v1.0 file.
  - D: byte-identical v1.0 copy under another name → `refused`, named by the copy.
  - E: v1.0 record deleted → v1.1 `ok`.
  - F: 64-hex token in the v1.0 quote slot → v1.1 `ok`.
  - G: v1.0 verdict `CONFIRM` with a disposition named → v1.1 `ok`.
- Mutants (rule 6) on `package-reader.ts` in the worktree [Observed]
  - Targeted tests: `gate-acts.test.ts`, `start-gates.test.ts`, `real-tree.test.ts` (unit and integration projects).
  - Unmutated baseline: `Tests  247 passed (247)`.
  - The file was restored after each mutant and `cmp` matched the original. `git status` was clean afterwards.
  - M1, byte-exact comparison dropped:
    - old: `exempt.file === rel && templateFields(exempt.template, text) !== null`
    - new: `exempt.file === rel`
    - **Killed**, 5 failed / 242 passed. Includes `the registry entry's version-tagged sign-off > reads the v1.0 record past while it is the recorder's, and refuses it altered`.
  - M2, exemption scope (file name) dropped:
    - old: the same text as M1
    - new: `templateFields(exempt.template, text) !== null`
    - **Killed**, 1 failed / 246 passed. The only kill is the Anthropic v2 statement test `reads past version 1's exact render only at version 1's own file`. No sign-off test kills it.
  - M3, supersession not read (the v1.1 form's `exemptRecords:` line removed):
    - old: `exemptRecords: Object.freeze([Object.freeze({ file: LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM_V1_0.file, template: LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM_V1_0.template })]),`
    - new: (line removed)
    - **Killed**, 36 failed / 211 passed. Includes `real-tree.test.ts` `refuse nothing: no file in decisions/ trips a sweep`.
- Sweep with a denominator [Observed]
  - Population: Python `re` over all 819 tracked files under `packages/`, `apps/`, `scripts/`.
  - `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` (not `_V1_0`): 33 occurrences in 10 files. Same as the ledger's count.
  - `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM_V1_0`: 9 in 4 files.
  - v1.0 literals (`local-agent-v1\.0|LOCAL-AGENT-SIGNOFF-v1\.0|LOCAL_AGENT_V1\.0`, case-insensitive): 9 in 4 files.
  - Renderer pins (`render_record(pkg, '1.0'`, `record_rel(pkg, '1.0'`, `--version 1.0`): 5 in 3 files.
  - v1.1 literals: 20 in 6 files.
  - Every remaining hit was read; see Finding 4.
  - `grep -F` for the recorder's `--check … local-agent --version` lines in `PROJECT-STATUS.md` and `.github/workflows/` found one 1.0 line in each and no 1.1 line.
- Cleanup [Observed]
  - Removed the worktree and the clone; deleted TMPDIR.
  - Nothing tracked in the real repo was edited; the recorder never ran there.
  - No dossier run, no observed-repository body read, no provider call.

## Findings

**Finding 1 — the v1.0 exemption reads past any rendering of the v1.0 template, so a v1.1 withdrawal written into a slot is masked** (revise)

- [Observed] The exemption at `package-reader.ts:697` only tests `templateFields(exempt.template, text) !== null`.
  - The v1.0 template has free `SLOT.line` slots: `quote`, `review`, `disposition`. The `sha`, `date`, `verdict`, `commit` and `instant` slots are free too.
  - Any text in those slots that still renders back is read past, even when it names the act.
  - Probes A and B show it: `Withdraw…/Withdrawn: public-git-source-acquisition-local-agent-v1.1` in the Owner-selection or Disposition line leaves v1.1 `ok`.
  - The same text in any other decisions file refuses.
  - The exempt path also skips `fromTemplate`'s 64-hex refusal and the verdict/disposition pairing check (probes F and G).
- [Observed] This contradicts what the change claims:
  - The brief says "any other bytes refuse".
  - The `DigestBoundActForm.exemptRecords` docstring says "Any other bytes in that file, an edited copy included, are swept".
  - An edited copy whose edits fall inside slots is not swept.
- [Inferred] The v1.0 record is immutable by construction: the recorder never edits it, and `--check 1.0` regenerates it exactly. So this exemption could be held tighter at no cost, either:
  - by pinning the exempt file to its committed SHA-256 (the `pins` mechanism `findActRecords` already has), or
  - by running the act sweep over the slot values `templateFields` returns.
- [Observed] The same mechanism already serves the Anthropic v1/v2 statement exemptions in `gate-sources.ts:352,367`. The gap is not new to this commit, but this commit gives it a new subject.

**Finding 2 — no sign-off test pins the exemption to the v1.0 file name** (note)

- [Observed] M2, which drops `exempt.file === rel`, is killed only by an Anthropic-statement test.
- No `gate-acts.test.ts` sign-off case puts a v1.0 rendering at another decisions path.
- [Observed] Probe D shows the code refuses that case today.
- A sign-off test would keep this form's exemption pinned if the statement tests were ever moved.

**Finding 3 — the template matches the recorder byte for byte; supersession and the v1.0-only tree read as intended** (note)

- [Observed] Byte-for-byte match:
  - The recorder's own v1.1 record, written in the clone, reads `ok` through `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`.
  - Both `--check` runs regenerate exactly.
  - The `GIT_SOURCE_V11_SCOPE/SUPERSESSION/DOES_NOT` texts at `record_versioned_signoff.py:1139-1157` match the TS literals line for line.
  - The testkit oracle (`recorder-fixtures.testkit.test.ts`, 4 new v1.0 cases) compares the TS render against the Python `render_record` for both versions.
- [Observed] Supersession is read as the recorder writes it:
  - v1.0 stays beside v1.1 unedited; v1.1 is the record read (`found.records.at(-1)` with a single form).
  - The v1.1 record's own mention of the v1.0 file name is inside the form's record, so it is not swept.
- [Observed] A tree with only v1.0 reads `absent`, both on the real worktree and in the new test `reads a tree holding only the v1.0 sign-off as absent`.
- [Observed] A tag withdrawal of v1.1 or v1.0 in any other decisions file refuses: the `it.each` rows in `gate-acts.test.ts` and probe C.
- [Observed] Expected values in the changed tests are literals:
  - identity strings such as `'public-git-source-acquisition-local-agent-v1.1'`, plus file names and refusal texts;
  - template renders are compared against the independent Python recorder, never against the module under test.

**Finding 4 — remaining readers of the form and v1.0 path are covered or unaffected; the battery's v1.1 `--check` line belongs to the signing commit** (note)

- [Observed] The 33 occurrences of the constant are all accounted for:
  - `gate-sources.ts:511` follows the constant.
  - `scripts/differential_consent_act_families.mjs` and `scripts/differential_line_slot.mjs` read whatever form the constant names. They are evidence tools run by no battery, `package.json` script or workflow (`git grep` hits only `docs/evidence` and the v1-1 package).
    - [Inferred] `differential_line_slot.mjs:208` adds the form's file but not its `exemptRecords`, so a re-run would not render v1.0 as a subject. Harmless for the gate.
  - `measure_consent_gate_recognition.mjs:142` was updated.
- [Observed] v1.0 literals outside the diff:
  - `build_public_git_source_acquisition_local_agent.py` and `record_versioned_signoff.py`, both by design.
  - Renderer pins: `install_redis_local_agent_sitting.py:408,410` name `polaris-dossier-local-agent-mode --version 1.0`, a different package. Unrelated.
- [Observed] `PROJECT-STATUS.md:506` and `.github/workflows/governance-docs.yml:518` run `--check public-git-source-acquisition-local-agent --version 1.0` and have no 1.1 line.
  - [Inferred] The 1.1 line, its workflow step and the battery count sentence are one CG-26 triple. They belong to the commit that adds the record, not to this one; the brief for that commit should say so.
