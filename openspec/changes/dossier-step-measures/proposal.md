# Proposal

[Observed] REQ-polaris-generation-033 version 2.30 and the existing close command retain bounded step instants. The Execution Record carries only operator-declared token or turn totals when they are supplied. Neither file gives reliable stage timings or completed review-round counts.

[Inferred] Add a step-derived measurement to the ordinary Execution Record. Preserve earlier records and the existing step projection. Count completed numbered revisions and reviewer prompt/check pairs using literal local observations. Keep incomplete evidence Unknown. The new fields do not change grading, stage budgets, provider choice or launch behavior.

[Inferred] This delivery adopts the specification and updates the effective REQ-polaris-generation-033 composition. The implementation remains tracked in syzygy-5dhm.25, including its writer and status-reader verification and the protected close-admission composition.
