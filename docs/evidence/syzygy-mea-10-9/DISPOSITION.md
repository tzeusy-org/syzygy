# P115 later-signed-input review-note disposition

[Observed] Execution/preparation for `syzygy-mea.10.9`, 2026-11-05, retains the
whole five-item original scope. This is an engineering disposition, not an
independent review, owner act, sign-off or closure. The original bead remains
open because the authority and original-source outcomes below remain open.

[Observed] Sources are P115 round 1,
[CONFIRM WITH EXCEPTIONS](../../reviews/R-P115-LATER-SIGNED-6678-1-RAW.md),
and v1.3 round 2 [finding 13](../../reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md).
The latter's pre-record inference is checked separately from ongoing binding.
The additive [supplement](review-note-supplement-2026-11-05.json) contains the
source commits, subject digests, exact mutation fragments, outcomes, executable
probe source and captured-command identities. The historical raw reviews and
original mutation record remain unchanged.

| Original description item | Exact review source | Current finding and action/evidence | Remaining gate |
|---|---|---|---|
| Snapshot list omits design/proposal | P115 finding 1 | [Observed] `later_signed_inputs` now takes every supported layer's `TARGETS` from the v1.1/v1.2/v1.3 builders. The replacement fixture copies `validation_inputs` alone to a Git-free snapshot and compares signed-positive and four missing/edited design/proposal cases with its full source fixture. Both snapshot-omission mutants fail that behavior row. | Independent review and landing of this correction. |
| Recorder binds only the spec digest | P115 finding 3; v1.3 round-2 finding 13 | [Observed] Real normal `record()` probes refuse edited design and proposal patches through existing `verify_reviewed`/`package_unchanged`, leaving installed targets/records untouched. Separate post-record probes coordinate each patch and installed target: the current builder, recorder `check()` and P115 seam pass with unchanged spec digest. This exposes the ongoing binding residual rather than claiming the pre-record refusal resolves it. | Open: explicit applicable owner authority and review for a permissible successor before changing authority acceptance; an attributed owner disposition is required to settle this original outcome. |
| Historical mutant record lacks subject digest | P115 finding 4 | [Observed] The supplement binds the unchanged original record, its full original source commit and a scripted SHA-256 of that commit's subject. Its ten historical outcomes are preserved (nine killed, one equivalent); those ten were not rerun. New runs name their exact commit and subject digests. | Independent review and landing of the additive evidence. |
| T17 change lacks a mutant | P115 finding 4 | [Observed] Two new negative rows reject an unlisted or missing required package in either population. Four equality-relaxation mutants each fail the corresponding negative row; two snapshot-omission mutants also fail. The positive renderer still compares 38 historical argument cases, 76 complete record/aggregate outputs. The live later-package set still names only v1.3. | Independent review and landing of these controls/evidence. |
| Nov-4 original structured Q&A is not retained | P115 finding 5 | [Unknown] No original structured-question source was supplied. The tracked direction records the decision and accepted cost; it cannot independently verify verbatim questions, options or selections. No transcript was reconstructed and no new owner answer was requested. | Open: an actually supplied authorized original capture, or an actual newly dated attributed owner disposition. The original source's fidelity remains Unknown. |

[Observed] P115 finding 2's absent v1.3 record and finding 3's absent battery
line describe the earlier reviewed snapshot. The execution source now has the
actual v1.3 sign-off, installed targets and canonical per-version recorder
`--check` line; `current_signed_state` in the supplement binds those files and
the observed clean chain. They were not recreated. The owner's already
recorded cost stands: nobody re-confirms P115's explicitly-unaffected reading
of amended REQ-034. Adding a full-recorder gate would itself change what the
exception accepts; these probes grant no such authority.

[Observed] Current enrollment notes grant this worker serialized ownership of
the P115 snapshot/T17 tooling. PR #740 is merged and `syzygy-mea.10.7` is closed;
PR #745 remains the frozen v1.4 candidate at its bootstrap receipt's exact
head, awaiting a real v1.4 selection. Its builders, recorder and candidate are
preserved; this change admits no unsigned v1.4 census entry. Rich-elements
product files stay with the separate `syzygy-mea.10.8` lane. No app/core-source
file or performed act is changed here.

[Observed] Fixture delta: two new T17 rows; one snapshot row replaced; no new
product Vitest suite. The focused later-signed gate has 20 rows. Captured
recorder selftest has 170 fixtures; dossier v1.1/v1.2/v1.3 selftests have
32/39/26 fixtures respectively. Exact commands, outputs and hashes are in the
supplement and owned terminal evidence. The first dirty-tree snapshot attempt
failed on its synthetic frozen-digest mismatch; the first mutation attempt
then exposed a missing-target unlink in the fixture. Both attempts remain in
the evidence history. The latter was corrected so omitted inputs produce a
failed behavior row rather than a setup exception.

[Observed] All fixture commands use the new owned namespace, private home,
cache and temp root. Python startup pins `tempfile.tempdir`; Git fixtures and
symlink targets remain within that boundary. Public cache seeding uses the
exact lockfile tarball set, then offline `npm ci` precedes preflight. The full
P115 selftest's historical replay carries the supported chain tools it now
imports. Final clean-clone `check:all`, reconciliation, recorder and governance
results are emitted separately at the final subject commit, under the shared
suite lock. A worker report cannot close either remaining owner/source gate.
