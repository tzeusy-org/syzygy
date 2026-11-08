# Review — P115 later-signed governing inputs (round 1)
Reviewed commit: 66787eb0a0a2f877c6ac44cd80104b8516c852b9
Subject: OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04 and the P115 checker change 00ddfd91..66787eb0
Verdict: CONFIRM WITH EXCEPTIONS

## Method

[Observed] `git rev-parse HEAD` printed `66787eb0a0a2f877c6ac44cd80104b8516c852b9`, and the
worktree was clean. I read the direction in full,
`git diff 00ddfd91 66787eb0` (four files: the direction, one decisions
README row, the mutant record and the P115 preparation script), the chain
builders' `recorded_versions`, `review_digest`, `signed_findings` and
`signed_v1x_findings` (v1.1, v1.2, v1.3), the v1.3 owner packet's question
2, and round 2's Finding 14 in
`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md`.

Probes, all read-only or in owned temporary directories:
- `later_signed_selftest()` at HEAD: 20 of 20 fixtures pass.
- At the live tree, the frozen dossier digest equals the v1.2 record's
  reviewed digest. It equals neither v1.0's nor v1.1's. The live chain
  `signed_findings` is empty, and v1.3 is not yet recorded (records v1.0,
  v1.1 and v1.2 only).
- `record_versioned_signoff.real_packages()` includes
  `polaris-dossier-local-agent-mode@1.3`.
- The snapshot probe is described in Finding 1.
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53
  checks).

I did not run the full `--selftest`, and I did not run the ten mutants
again. [Unknown] Whether the T17 census passes at HEAD is unknown, because
only the full selftest reaches it.

## Criteria

A. **Met.** [Observed] `later_signed_input` (script lines 363-388) checks
four things:
- the path is in `LATER_SIGNED_INPUTS`;
- `frozen` is in the reviewed digests of `versions[:-1]`, so an empty or
  single-version chain fails;
- the current bytes hash to the latest record's reviewed digest;
- `chain.signed_findings(root)` is empty.

Any `Exception` returns False. The only call site is the
`governing_input_findings` byte-mismatch branch (line 431). The
`proposed_poc` row for the POC subject is not in the mapping, so it is
unaffected. Core, manifest, review and chain checks in `binding_findings`
are untouched. The chain fails closed past v1.3: its v1.3
`signed_findings` returns a finding for any later version with no builder.
Finding 3 is a scope note on what "signed" means here.

B. **Met, with Finding 4.** [Observed] Each predicate has a fixture:
- a real-chain fixture, and a stub fixture that isolates the predicate
  while the chain passes;
- integration fixtures through `governing_input_findings`.

The equivalence claim for `earlier-any-version` is correct. The mutant
differs only when `frozen` equals the latest reviewed digest. The next
check then needs the current bytes to hash to the frozen digest, and
`governing_input_findings` calls `later_signed_input` only when they do
not.

C. **Met in practice; the function is not self-sufficient** (Finding 1).

D. **Met.** [Observed] At lines 2522-2525 `keys` is a literal tuple. The
predicate requires `set(keys) == set(historical_packages) - {KEY}` and
`set(packages) - {KEY} == set(keys) | {"polaris-dossier-local-agent-mode@1.3"}`.
Both are equalities, so any other new package, or a missing one, still
fails.

E. **Mostly met** (Findings 2 and 5). The cost section matches round-2
Finding 14 in substance, and the direction labels the reviewer's reading
`[Inferred]`. "What it does not do" is accurate against the diff: no
sign-off record, manifest, binding or review was edited, and
`check_governance.py` and `ACCEPTANCE-ACT-RECORD.md` are unchanged.

## Findings

1. **note — Criterion C: `validation_inputs` and `later_signed_inputs`
   leave out two files the chain's signed check reads.**

   Evidence:
   - [Observed] Every chain layer's `state()` runs `forward`/`backward`
     over its `TARGETS`, which are the spec, `CHANGE/design.md` and
     `CHANGE/proposal.md` (`scripts/build_polaris_dossier_local_agent_mode_v1_3.py:73-77`;
     likewise v1.1 and v1.2).
   - `LATER_SIGNED_INPUT_GLOBS` (script lines 357-360) names only the
     sign-off records and the candidate packages. `validation_inputs` adds
     only the eight governing spec files. At the live tree,
     `openspec/changes/polaris-dossier-local-agent-mode/design.md` and
     `proposal.md` are not in `validation_inputs(ROOT)`.
   - [Observed] Probe on the v1.3 builder fixture (v1.3 applied and
     recorded):
     - `later_signed_input` is True on the tree;
     - it is False on a copy holding only `later_signed_inputs(root)` plus
       the spec, where the chain reports "found neither" at every layer;
     - it is True again once design.md and proposal.md are added.

   So the docstring "The files `later_signed_input` reads" (line 392) is
   false, and the line 2648 fixture is tautological, since
   `validation_inputs` unions `later_signed_inputs` by construction. It
   does not prove snapshot equivalence.

   Why this is a note and not blocking: [Observed]
   `check_spec_reconciliation.inputs()` also carries
   `tracked(root, "openspec/changes")`
   (`scripts/check_spec_reconciliation.py:1696`), so the reconciliation
   snapshot does hold both files. The other consumer is P115 recording
   (`scripts/record_versioned_signoff.py:840`), which refuses once the P115
   transaction is present. [Inferred] Today nothing diverges, but the
   guarantee rests on an unrelated term in another script.

   Fix:
   - Add each chain layer's `TARGETS` to `later_signed_inputs`, preferably
     derived from the chain modules rather than restated.
   - Replace the line 2648 fixture with a snapshot-equivalence fixture:
     copy `validation_inputs` alone from the v1.3 fixture tree and assert
     that `later_signed_input` agrees.

2. **note — Criterion E: the direction states as done a record that does
   not exist at the reviewed commit.**

   Evidence:
   - [Observed] The title (line 1) says "dossier v1.3 signed".
   - The head bullet says "The dossier v1.3 sign-off it reports is recorded
     by its own version-tagged record,
     `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`".
   - At 66787eb0, `.syzygy/governance/decisions/` holds only v1.0, v1.1
     and v1.2 dossier sign-off records.
   - Item 2 ("is recorded … and installed") reads as a directive, which is
     fine.

   Under Scope A the owner's selection is the sign-off, so "signed" in the
   title is defensible. The present-tense claim about the record is not.

   Fix: say "will be recorded by", or land the direction in the same commit
   as the record.

3. **note — Criterion A, scope: P115 now inherits the chain's notion of
   "signed".**

   Evidence: [Observed] The chain's `signed_findings` establishes four
   things:
   - a `…-SIGNOFF-vX.Y.md` file exists;
   - its first `Review:` line names a file whose first four non-blank lines
     carry exactly one `Manifest SHA-256`;
   - the patches layer;
   - the bytes match.

   It does not read the record's verdict, date, quote or aggregate block,
   and it does not run `record_versioned_signoff.py --check`. A hand-made
   record plus a review head therefore satisfies P115's new branch.

   This matches the direction's wording ("the input's builders' signed
   check reports …"), so it does not fail A. [Inferred] Elsewhere in the
   battery, the per-version recorder `--check` lines in `PROJECT-STATUS.md`
   catch such a record once a v1.3 line is added. [Unknown] No v1.3
   `--check` line is in the battery at this commit.

   Fix (optional): have `later_signed_input` also require the recorder's
   `check(root, pkg, version)` for the latest version. At minimum, make
   sure the v1.3 battery line lands with the record.

4. **note — Criteria B and rule 11: the mutant record does not identify
   its subject bytes, and the T17 change has no mutant.**

   Evidence:
   - [Observed] `docs/evidence/syzygy-mea-10-3/p115-later-signed-mutants-2026-11-04.json`
     names commit `20c5b1b5` and stores `old`/`new` fragments, but no
     subject digest (AGENTS.md rule 11).
   - Between `20c5b1b5` and `66787eb0`, the script diff touches only the
     T17 lines, so the recorded fragments still apply to the reviewed
     function.
   - The T17 census predicate change landed in the commit titled "…;
     rule-6 record", but the record has no T17 mutant. For example,
     relaxing either equality to `>=`/`<=` would show whether the census
     fixture catches a widened list.
   - The `..`/absolute guard and the `values[:1]` choice in
     `later_signed_inputs` are also unmutated.

   Fix: add the subject's sha256 at the recorded commit, and add one T17
   mutant, or say why the full-selftest cost excludes it.

5. **note — Criterion E: the owner's selections are not re-checkable from
   repository bytes.**

   Evidence: [Observed] The direction says the answers were given by
   AskUserQuestion "at about 13:35Z". It quotes three option labels and the
   option text for question 2. Nothing tracked retains that exchange. The
   packet's question 2(a) wording (`OWNER-DECISION-PACKET.md:83-88`)
   differs from the quoted option text, which is consistent with the
   direction's claim that a separate structured question was put.
   [Unknown] Whether the quotes are verbatim cannot be checked.

   Fix (optional): retain the structured-question transcript beside the
   direction, as `OWNER-DIRECTION-SHARED-MUTATION-RUNNER-2026-10-29.md`
   does with its timestamp supplement.
