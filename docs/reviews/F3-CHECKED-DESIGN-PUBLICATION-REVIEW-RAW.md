PASS

[Observed] At `382820f9f4bae705521407d3eedbedeff6639f95`, the renewal path checks the complete replacement delivery, then checks machine and effect authority, then samples the replacement’s registered lease before assigning shared state. A failed sample closes the unpublished candidate. `url-run-ordered-attempt.ts:92–96` and `:153–165`, `url-design-product.ts:178–179` and `:313–316`.

[Observed] Each joining caller runs the same guard after awaiting the shared renewal, so it checks its own effect scope and the current product lease. The focused test uses a validated product and advances the clock to its deadline inside the authority callback. `url-run-ordered-attempt.ts:167–168`, `session-machine-transport.ts:55–60`, `url-design-product.test.ts:149–158`.

Source-only follow-up. The earlier REVISE applies to `77ad941589725882a2327ccb78309d51acbd2aa2`.
