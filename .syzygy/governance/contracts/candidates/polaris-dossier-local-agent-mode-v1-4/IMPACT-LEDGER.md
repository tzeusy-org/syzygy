# Impact ledger — Polaris dossier local-agent mode, version 1.4

> **Candidate — binds nothing.** [Observed] Baseline is commit
> `e30412efc94f4ee40d213f5df6ac8d1aac445119`, the merged PR734/v1.3 layer.
> [Inferred] Proposed outcomes below require fresh review, the owner's actual
> version selection and recording; this is not an installation report.

## Subjects and patch evidence

[Observed] `PATCH-VALIDATION.json` records each current/proposed subject
and patch's SHA-256, forward application, an independent unified-patch
reader, exact reversal, unchanged requirement identities, two REQ-034
scenario counts and negative probes for a stale predecessor and missing
patch. It also records the preserved predecessor package, records, raws,
installed subjects and v1.3 annotated tag identities. Neither this file nor
the JSON is an act or a substitute for the installed-commit verification.

[Inferred] The three targets are the installed local-agent addition's
`specs/polaris-generation/spec.md`, `design.md` and `proposal.md`; only
REQ-polaris-generation-034's requirement body/scenarios change. REQ-033,
035 and 036 keep their bytes. Three scenarios are added: “Empty table cell
states nothing”, “Path-excluded code excerpt left unread” and “Collapsed
section discloses Unknown claims”. IDs are never renamed. `SOURCE-RECEIPTS.json`
holds the effective-composition recount, which must be refreshed if its
source baseline changes; no figures in the installed status page are edited
by drafting these patches.

## Dependency sweep and its limits

[Observed] `DEPENDENCY-SWEEP.json` scans 8,699 tracked baseline paths from
`git ls-tree -rz` at the baseline commit; validation compares that set to
`git ls-files -z` before staging this candidate. Bytes come from `git archive`
of that baseline, so working-tree tooling edits cannot contaminate the sweep.
It searches each UTF-8-decodable file, including text files
containing NUL fixture data. The eleven non-UTF-8 paths are named in its
`population.skipped` field: four PNGs and seven compressed trace files.
They are the explicit remainder, not silently counted as text examined.
This candidate's untracked files are excluded from the baseline population.

[Observed] Exact case-sensitive predicates, the REQ run-form regex and every
matching file/line/hash are stored in the JSON. The run regex admits slash,
comma, `and`, `or`, `through`, `to`, `..`, en-dash and hyphen continuations;
ranges are included when 034 lies between their endpoints. It does not
claim to parse arbitrary English references such as “that check”. The
fixed-string hit sets for `no entry`, `120 characters` and `Code excerpt
over its limit` are independently compared with `git grep -F` at the same
commit. The broader version-chain predicate deliberately includes false
positives; a mention alone is not a reliance (verification rule 5).

| Changed clause/topic | Swept evidence | Disposition |
|---|---|---|
| Empty marker and negative-claim distinction | `empty_cell`; REQ run forms; signed v1.3 subjects and patches | Three candidate subject patches. Preserve predecessors/reviews. Renderer/test pins wait for actual adoption; no runtime `-` change here. |
| Path/body-end scope and UTF-8 | `range_scenario`; REQ run forms; PR740 round-3 raw | Code-only no-read exception plus read-then-excluded checks. Preserve ordinary-block obligation and `.10.7` ownership; `.10.8` owns runtime follow-up. |
| Labels, code-point length, collapsed count, context, language, placement | `length_unit`, `draft_schemas`, REQ run forms; notes 1–10 | Subject patches plus scenario/falsifier changes. Existing schema identities remain; no compatibility renaming. |
| Version and governing warrant | `version_chain`, `later_signed_inputs` | Extend the actual version chain; regenerate derived views only with installation; P115's settled rule and cost remain. |

## Real install chain and current dependents

[Observed] Reading the matched active consumers and their import/call edges
identifies the chain below; the sweep supplies locators, not inferred
authority. Every remaining historical/candidate/evidence match stays as a
reference to its own subject and is not mass-rewritten.

1. `scripts/build_polaris_dossier_local_agent_mode.py`, `_v1_1.py`,
   `_v1_2.py` and `_v1_3.py` form the real layered check/apply chain. A
   successor builder must apply/reverse the v1.4 patches, expose subject
   bytes, preserve the signed v1.3 layer and distinguish unsigned, applied
   and latest-signed versions. The v1.3 layer needs peeling/delegation in
   the same logical tooling change; never repin a predecessor record.
2. At the baseline, `scripts/record_versioned_signoff.py` registers versions through 1.3
   and uses `verify_reviewed` then `package_unchanged` before recording.
   Minimal v1.4 registration must retain the existing drift checks and
   spec-only review binding. `.10.9` separately owns any broader snapshot
   or recorder-binding correction; serialize shared edits with its owner.
3. The recorder applies the reviewed targets and emits the new record and
   aggregate block. The annotated v1.4 tag belongs on that recording/applied
   commit, never on this authoring commit. Actual owner-selection evidence
   is required; a recording failure is reconciled before any retry.
4. `scripts/prepare_three_surface_poc_governedby_reference_recording.py`
   calls the dossier chain through its existing `later_signed_input`
   allowance. Its frozen-input glob already covers future candidate
   versions. A v1.4 extension must reach the chain it calls; no P115
   re-sign, frozen-manifest edit or classification re-confirmation is
   proposed. The accepted lack of re-confirmation remains disclosed.
5. `scripts/build_polaris_dependency_unions.py`,
   `scripts/check_spec_reconciliation.py` and
   `scripts/count_polaris_effective_scenarios.py` derive the local-agent
   dependency union and census from the installed spec. Add the new owner
   direction warrant through regeneration; preserve unrelated signed
   unions. Refresh the reconciliation README/census and default routes at
   install, not by claiming a candidate is signed.
6. `PROJECT-STATUS.md`, `openspec/README.md` and
   `.syzygy/governance/decisions/README.md` route current versions and acts.
   The future install adds the new record links and computed figures in
   one logical change. The canonical battery lives in PROJECT-STATUS;
   `scripts/run_status_battery.py` reads it rather than a copied list.
7. Existing installed pin/copy consumers include
   `packages/polaris-dossier/src/brief.ts`, `doctrine-quote.ts`, `draft-schema.ts`,
   `check.ts`, `render.ts`, their matched tests and
   `packages/polaris-generation-core/src/draft-model.ts`. Other signed
   additions cite 034 in arbitrary-public-repo and one-command-run changes
   as parents/constraints; they do not replace its text. Recheck effective
   composition and exact text/version pins during install. No new product
   tests or product implementation are part of this draft.

## Install invariants and existing test mechanisms

[Observed] This candidate adds
`scripts/build_polaris_dossier_local_agent_mode_v1_4.py`, minimal v1.3
peeling/delegation and the recorder's v1.4 registration. P115's closed
historical-formatter package census gains that registered version; its
formatter and signed-input semantics remain unchanged. The canonical
status battery and hosted workflow both gain the v1.4 check/selftest.
`TOOLING-VALIDATION.json` records the exact source digests and scoped
verification; no record, tag or installed subject is created by this wiring.

[Inferred] Test growth is 26 version-specific Python builder fixtures and
one behavioral registration fixture within the existing recorder selftest;
the v1.3 unknown-version fixture advances to 1.5 to remain unknown. No new
product test is added. A new version needs its own signed-layer fixtures
because a passing predecessor test does not exercise the new patch/record
layer; no new test runner or recording predicate is introduced.

[Inferred] Reuse the current builder/recorder selftest mechanisms, one
mutation fixture for each new recording predicate. Preserve unsigned versus
signed, stale reviewed/package bytes, absent/bad review or signoff record,
bad/missing tag, applied-byte drift and repeat-recording refusal/recovery
coverage. Package-drift fixtures must exercise the actual existing guards;
do not invent a speculative three-subject gate for this version. The
successor-layer fixture should show predecessor checks and P115's signed
later-input check still reject an unrecorded or corrupted successor.

[Unknown] Those install-time invariants have not been demonstrated for an
actual v1.4 recording, since the owner has not selected v1.4. The candidate
patch proof is narrower. No isolated pass after a failure establishes a
cause, and failed attempts stay in the worker's retained logs.

## Sequencing and full original outcome

[Observed] PR740 was open at the source receipt, with its current head
identified there. The Nov-3 questionnaire item-4 source merge hold remains
in force in the dispatch. [Inferred] Candidate-only drafting does not waive
it; any later pin edit under held app/core paths waits for actual owner
judgment and cycle report. Do not silently rebase if main changes.

[Inferred] The outcome stays open through exact-commit independent review,
notes disposition outside frozen bytes, actual structured owner selection
of package/version 1.4, recorder-generated record/aggregate, annotated tag,
exact applied subjects, derived-view refresh and clean-clone installed-
commit checks. Defer/decline leaves v1.3 effective and the entire unresolved
scope open. Before a PR, CONTRIBUTING's applicable `check:all` rule still
applies; use the coordinator's full-suite lock and a home-owned temporary
root. Run the current canonical battery through its runner in that clean
clone before claiming clean. No real-project read/run or provider call is
needed. Rollback before selection abandons the candidate; after a performed
version, corrections require a later version rather than edited history.
