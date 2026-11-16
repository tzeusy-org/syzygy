# Owner direction — shared mutation runner

Date: 2026-10-29
Owner: Tzeusy
Decision ID: `OWNER-DIRECTION-SHARED-MUTATION-RUNNER-2026-10-29`

## Owner answer and exact scope

[Observed] In the authenticated attended owner conversation on 2026-10-29,
the owner answered, verbatim: **A**. This selects **A — Authorize the bounded
runner change (Recommended)** for `SHARED-MUTATION-RUNNER-20261028-R1`.
Recording time (UTC): `2026-10-29T00:21:57.283256+00:00`. The source supplies no separate
message timestamp; this instant records transcription, not the owner's message time.

The actual question was:

> Authorize the reviewed shared mutation test-runner change: faithful test-project replay, preserved baseline checks, explicit failed/incomplete evidence, nonzero failure exits and scratch-copy execution? A also authorizes recording the direction and updating its existing Beads handoff; current ownership and verification gates remain. I recommend A; the extra preflight costs runtime and refuses the selected run if any initial test group is invalid.

The other offered option was **B — Keep current behavior**. This answer
includes recording this direction and updating the existing Beads handoff.
It is separate from the earlier P115 answer and does not answer P111's
dossier CLI decisions.

The selected scope is the exact R2 proposed direction, composed with the
corrected source/consumer addendum and final offered questionnaire. Selected
original bytes and manifests are retained in
`docs/evidence/shared-mutation-runner-authorization-2026-10-29/`;
its `RETENTION.json` identifies them. Historical draft/pending banners are
preserved unchanged and do not state current authority. The final framing's
independent review, `docs/reviews/R-SHARED-MUTATION-RUNNER-QUESTIONNAIRE-RAW.md`,
records **Scope verdict: Pass** and **Recommendation verdict: Pass**;
its supporting scope and corrected-refresh reviews are retained alongside it.

This plain direction adds only the exception below to GP-Q0 of
`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`. Its stop clause says:
"Any change not listed here to what a gate accepts or refuses stops and returns
to the owner." Sections 1–7 below preserve the approved proposed direction's
substantive wording. This is an implementation-plane authorization, not
adoption of a product specification, doctrine, contract, consent or signed
evidence artifact. No version tag or aggregate acceptance-act entry is created.
A change requiring one of those acts still needs its governing amendment gate.

The approved addendum preserves the legacy generation plan/guard as an
independent old boundary; it does not prove the new engine's effective
command mapping. The four newly identified non-runner scripts remain outside
migration; the prompt runner stays in the existing section 5 scope.
The separate historical-runner restoration and additional reviewerBlocking
mutant findings remain separate, not implicitly implemented or closed.
The addendum changes no output, baseline, exit, schedule, access or retention
scope. Current source and ownership must be refreshed under section 7;
old PR snapshots in the retained preparation are historical.

## 1. Exact outcome

Authorize `syzygy-bpyt.4.6` to implement one serial mutation runner and migrate the named plans and consumers below, including the original outcomes tracked by `syzygy-bpyt.11` and `.11.1`. Permit the new evidence/replay/baseline/refusal/exit semantics in sections2–6 only. No finding closes from this authorization alone.

The producer may use the proposed Python-standard-library implementation under `tools/mutate/`, its tests/plan data and documentation. Language or private helper layout is engineering judgment; that choice cannot change the outcomes authorized here. Existing npm command names and supported selection flags remain available through thin wiring to the new engine; original runner and plan files remain unchanged where cited or frozen.

## 2. Faithful replay and new evidence

New runs write a separately versioned evidence record, `schema: "syzygy-mutation-evidence/v1"`, under a new non-overwriting `docs/evidence/mutation-v1-<unique-run-id>.json` filename, or an explicitly chosen new output path. Existing files are never overwritten. The record identifies the source commit and source/test digests, runner/plan identities, selected case population, start/end state, actual controls, every attempted case, all edits and original fragments, restoration state and final run outcome. Rejected/incomplete runs say so and never present unexecuted work as passed.

Every case records its **effective** test project, exact test/selector command, optional note, full edit list, must-fail/must-pass predicates, declared expected outcome and observed result. Expected survival is allowed only for an explicitly identified negative/equivalent control in the reviewed source plan; it is not inferred from a newly failing test or used to excuse an unexpected survivor. Identity controls are recorded as controls, with an explicit old-to-new identity map, rather than silently included in the killed-mutant denominator. Explicit per-case overrides survive output-to-input replay; no path-based or nearest-project inference replaces them. Missing information in old output is not reconstructed by guesswork: replay requires the original complete spec or refuses with an explicit reason.

The new envelope uses top-level `cases`, not the legacy top-level `project`/`mutants` shape. This intentional distinction prevents new evidence from masquerading as a legacy replay input. The two unchanged legacy replay tools named in section6 remain for their legacy records. Their rejection of a new record must be verified to occur before a source write; do not claim a structured refusal message from those unchanged tools.

Historical evidence, raw reviews, source identifiers, hashes and verdicts remain unchanged. A comparison against an old record identifies the old schema and exact subject, and reports discrepancies. It never edits the historical result to manufacture parity.

## 3. Controls before scoring

Before any source mutation, run and record an unmutated identity control for **every distinct effective project/test-command/selector group** selected by the plan. A control succeeds only when the test process completes successfully, its report is readable and consistent, the intended test population is nonzero and the relevant tests pass.

Preserve every migrated plan's existing stronger control timing. M7, M9, M13 and the prompt plan retain a fresh baseline immediately before each mutant. PWB sweep retains its per-group baseline before that group executes. The generation and PWB authority plans retain their initial checks. The new all-groups preflight is additional where those checks are stronger or differently placed; a cached result does not discharge a per-mutant or per-group obligation. Any later optimization that weakens those timings needs separate authority.

If initial preflight fails, refuse the run before any mutation and score no mutant. If a required later per-mutant/per-group baseline fails, stop before that next mutation, preserve earlier genuine results, mark the overall run incomplete and leave remaining cases unexecuted. Do not erase prior evidence or score the blocked case as killed. Failure, timeout, malformed/missing report, missing intended tests or zero collection is not evidence of a killed mutant.

After a passing required control, a mutant is killed only if its actual behavioral failure satisfies the plan's must-fail predicates and any must-pass controls remain satisfied. Preserve existing named-predicate matching semantics during migration. Loading/collection/process/report failures remain execution errors rather than kills. A test timeout cannot be counted as a behavioral kill merely because it is a failing assertion. Any ambiguity remains an error/incomplete run until the diagnostic evidence resolves it.

## 4. Isolation, result and exit behavior

Use owned scratch copies for mutation. The caller's tracked source and foreign files/processes are not mutated or cleaned. Each scratch copy gets its own dependency installation when needed; source and test identities are verified against the run's subject. The runner remains serial; no new parallel job facility is authorized. Preserve the existing restoration checks even though the mutation now occurs outside the caller tree.

The new engine uses these exit meanings, which its evidence also records:

| Exit | Meaning |
|---|---|
| 0 | Selected nonempty plan completed; all required controls passed, every mutation case was killed by its named behavioral predicate, any explicitly declared negative/equivalent control met its reviewed expectation, restoration/caller identity checks passed and evidence was successfully written. |
| 1 | A completed valid run contains an unexpected surviving mutant or an unmet declared predicate/control; it is not a successful gate. |
| 2 | Invocation/spec/selection/output precondition refused before mutation, including an empty selection, unknown project or existing output destination. |
| 3 | An initial or required later baseline is invalid; record whether zero cases ran or a valid prefix preceded the failure, and stop. |
| 4 | Execution/report/restoration/caller-identity/evidence-write error; run incomplete. Do not report a success if a receipt cannot be written. |

When several failures coexist, integrity/evidence errors take precedence (4), then invalid baseline (3), invocation refusal (2), then completed surviving result (1). Signals/interruption are non-successful and retain only demonstrably written evidence; do not promise a receipt after an uncatchable termination. Diagnostic stdout/stderr may change to report these states. The workflow continues to treat **every nonzero exit as failed**, never `continue-on-error` or an exit-code whitelist.

These exits intentionally change the generic Python runner and the prompt runner, which can currently finish with exit0 after recording survivors. They preserve the existing binary pass/fail meaning of the generation/PWB/m-family gates while distinguishing failures more precisely. No existing valid baseline guard is relaxed.

## 5. Exact migration scope

Migrate the existing plan obligations from:

- `scripts/rule6_mutation_runner.py` generic spec execution;
- `scripts/run_m7_literal_mutations.mjs`, `run_m9_literal_mutations.mjs`, **`run_m10_conditional_mutations.mjs`** and `run_m13_literal_mutations.mjs`;
- PWB authority plan/runner (`apps/three-surface-poc/src/pwb-mutation.ts` and `pwb-mutation-run-main.ts`);
- PWB sweep plan/runner (`pwb-mutation-sweep.ts` and `pwb-mutation-sweep-main.ts`);
- generation plan/runner (`apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` and `generation-mutation-run-main.ts`);
- `scripts/polaris_prompt_mutants.py`.

Transfer plan cases, all edits, predicates, selections, denominators and existing control timing. No case is silently dropped, renamed or weakened to fit a common schema. Literal drift and invalid historical evidence are explicit migration failures, not permission to alter a tested product's behavior. The original .4.6 requirement to compare a real PWB plan and an m-plan remains; additionally exercise each migrated command's selection/refusal/wiring without running unsupported live repositories.

The actual M10 path above corrects the stale `.4.6` shorthand; no `run_m10_literal_mutations.mjs` exists at the inspected subject.

## 6. Consumers that may change

1. Root `package.json`: retarget only `poc:pwb-mutation-run`, `poc:pwb-mutation-sweep` and `poc:generation-mutation-run` to the new engine/plan data, preserving their supported selection intent. Do not rename unrelated commands.
2. `.github/workflows/generation-mutation-gate.yml`: switch its runner wiring and evidence artifact path to the new schema outputs. Keep the current schedule/manual triggers, read-only token permissions, source-integrity check and failure-on-nonzero behavior. Continue always attempting artifact upload. An initial baseline failure now has a refusal record when the destination is writable; it no longer silently lacks runner evidence merely because mutation never started. This authorization permits normal CI verification of the changed workflow, not a new schedule or remote workload class.
3. `scripts/check_evidence_currency.py`: add explicit recognition of the new schema and all nested case edits/digest subjects. Preserve its existing report result for each legacy input. For new records, separately report the logical case count and edit-fragment denominator so multi-edit cases are not undercounted; no malformed/empty/incomplete new record is treated as a successful mutation proof. This remains a currency/fragment report, not authority to adopt or execute anything. Validate the new schema path through its existing selftest mechanism and retained legacy controls. If its actual source is edit-locked by a performed act/review, use the repository's authorized successor route rather than edit bound bytes.
4. New evidence is replayed only by the new runner's validated input route. `scripts/rerun_rule6_mutants_selected_tests.py` and `scripts/rule6_timeout_rerun.py`, and retained evidence-specific scripts, stay unchanged and retain their old inputs. They are not implicitly migrated, and new-format records must not be routed through them as compatible records. A further live consumer found before implementation needs a reviewed disposition; one requiring changed behavior outside these named consumers returns for a bounded extension.

No removal/relocation of an old runner or evidence body is covered. `.4.37` and the owner's retention conditions remain separate. No JSON-field oracle (`.4.38`), parallel `--jobs` (`.4.39`), consent-census runner migration, new test service, provider call, observed-project code execution, product runtime change, deployment or release is authorized here.

## 7. Handoff conditions and stop rules

Before implementation, record the actual owner selection of this exact reviewed direction through the repository's owning decision workflow. Preparation, semantic review, tracker closure or another approval cannot substitute. Refresh source/consumer identities and actual active owners/PRs; PR543/`syzygy-kpbq`'s generation-plan repair must land or be explicitly reconciled by its owner before the migration takes that surface. The owner-held `syzygy-u05.11` record is not overwritten.

The implementation packet must name actual case/consumer mappings, all changed output/refusal outcomes and exact behavioral verification. Preserve plan-specific baselines in those mappings. Verify the real CLI in synthetic owned Git fixtures, project override replay, failed initial and later baseline, malformed/zero-test reports, execution error, survivor, restored killed result, output collision and integrity/evidence-write failure. Expected results are independent literals; test the actual process/file boundary, not source text. Rule-6 witnesses retain old/new fragments and subject commit.

Use one coherent implementation/rollback path for engine, plan data and consumer wiring. Run the repository's required exact-head review and canonical gates. Keep historical bytes and old tools usable for their historical records. Report any new consumer, changed product/consent/security behavior, dropped plan obligation or bound-byte conflict before proceeding beyond the scope above.

After landing, root checks actual evidence before closing `.11`, `.11.1` or `.4.6`. This direction alone proves no implementation, restored source, valid mutation score or completed V1 milestone. Withdrawal defeats grant.
