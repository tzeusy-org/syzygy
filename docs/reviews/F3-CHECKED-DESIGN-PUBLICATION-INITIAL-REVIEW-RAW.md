REVISE

[Inferred] The replacement render lease can expire before publication. The renewal path checks the replacement at `url-run-ordered-attempt.ts:151`, then runs the machine and effect guards at `:152`. Those guards check the original run deadline at `:116–118`. If the shorter render lease expires during those checks, the path still assigns the replacement and closes the previous proof at `:153–157`. The caller’s check at `:162` prevents immediate release, but the shared state already holds the expired replacement. Sample the replacement lease again after the final guards and before assignment.

[Observed] The focused tests cover genuine expiry, competing refusal, and byte accounting for the original launch and delivery receipt. They do not exercise expiry between the final machine guard and publication. See `url-design-product.test.ts:149–204` and `url-launch-history.test.ts:399–420`.

Source-only review of `77ad941589725882a2327ccb78309d51acbd2aa2` against `8b25a6f9b9275d40450ed0d61e34e98a8a8d9018`. No tests executed.
