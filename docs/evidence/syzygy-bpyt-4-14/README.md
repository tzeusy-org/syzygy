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

The November-3 item-4 source merge hold applies to the helper and its tests.
Preparation and passing checks do not supply the owner's judgment or cycle
report. The issue remains open until its full outcome and landing gates hold.
