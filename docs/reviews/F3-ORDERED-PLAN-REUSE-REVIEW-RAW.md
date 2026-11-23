PASS

[Observed] The corrected patch keeps the plan and recovery entry private until the final launch, site, audit event, and lease checks succeed. Expiry leaves the durable audit event visible and withholds the view, plan, and stopped-round history.

[Observed] Plan lookup rehashes the issued view, checks audit ownership and the exact expected inputs, and checks the lease before returning the plan. The added tests cover both earlier findings. The patch digest matched and `git show --check` passed. Runtime tests were outside this source review.
