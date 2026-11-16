# Browser test parent lifetime

The current reproduction and acceptance records belong to syzygy-bpyt.4.14.
PR509 N4's historical eight-PID count is not a current census. The later
retained October record has an empty marker list and a failed fresh suite;
neither result establishes complete process cleanup.

Vitest browser launches use `scripts/poc_browser_lifetime.py` as the private
Chrome parent. It adopts crashpad children that leave Chrome's session,
watches the worker's private pipe, escalates stopped descendants and reaps
them. The worker verifies the parent's private group before allowing Chrome
to start. A separate acknowledgement confirms completed descendant cleanup;
an unacknowledged exit retains the profile and fails cleanup. Operator
commands keep their direct launch path and existing dependencies.

The two parent-death cases extend the existing browser teardown suite. Their
observer reaps adopted dead children as an init process would; it records
survivors before its separate failure recovery and preserves a live decoy.
Existing real close/singleton and hermetic failure checks remain exercised.
Python is already a documented prerequisite of integration and e2e checks.

This is bounded test-fixture lifetime work traced to N4 under GP-Q0 and the
POC improvement-cycle direction. Proposed mandatory-review class: CC-REV-1
class 4 (signal ownership); final classification belongs to independent
review. Evidence, sign-off and security floors apply. No product permission,
security flag, observed-project execution or normative artifact changes.

[Observed] Historical wording; its freeze start was superseded on 2026-11-06:

> The November-3 item-4 source merge hold applies to the helper and its tests.

[Observed] [November-6 item 1](../../../.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06.md)
starts the freeze when a candidate head's readiness run begins and releases it
if that head is NOT READY. It retains the [November-3 item-4 paths and
judgment/report end](../../../.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md).
The candidate and active state are recorded in
[scripts/surface-merge-freeze.json](../../../scripts/surface-merge-freeze.json).
Preparation and passing checks do not supply the owner's judgment or cycle
report. The issue remains open until its full outcome and landing gates hold.

## Additive namespace-lineage correction

[Observed] `namespace-lineage-correction-2026-11-06.json` records the correction
following independent review of PR763's predecessor head. Both scanners select
lineage before namespace access; unreadable owned targets still refuse. Real
original/changed controls, six final predicate counterexamples and both current
kill-then-one-fresh-app runs are retained in the correction packet. That file
retains source subjects, two-method process denominators and named directory
remainders. Earlier process records and raw review/attempts remain unchanged.

[Observed] Historical wording; its freeze start was superseded on 2026-11-06:

> [Observed] The original eight criteria, required independent review/hosted and
> merge-group checks, and actual owner judgment AND cycle-report MERGE HOLD remain.

[Observed] The original eight criteria and applicable review/landing checks remain.
[November-6 item 1](../../../.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06.md)
replaces the freeze start with a candidate head's readiness run, releases it if
that head is NOT READY, and preserves the [November-3 paths and judgment/report
end](../../../.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md).
Consult [the recorded conditional-freeze state](../../../scripts/surface-merge-freeze.json)
for the candidate and active state. Neither the syzygy-1z3.22 owner judgment nor
the syzygy-1z3.25 cycle report is performed or waived by this correction.
The full outcome remains open pending its actual gates and legitimate landing.
This evidence authorizes no promotion, queue, merge or closure; PR763 stays DRAFT.
