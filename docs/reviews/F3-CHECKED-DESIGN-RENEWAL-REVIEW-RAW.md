PASS `77ad941589725882a2327ccb78309d51acbd2aa2`

[Observed] Renewal verifies the original committed launch and durable receipt before reproduction. Both audit events, any managed prefix reads, and all three launch-file reads pass through the byte observer and recheck processing authority. Full same-delivery validation still precedes publication. [Renewal](/home/orca/.tmp/f3-renewal-charged/packages/polaris-dossier/src/url-run-ordered-attempt.ts:139) · [Receipt verification](/home/orca/.tmp/f3-renewal-charged/packages/polaris-dossier/src/url-session-audit.ts:1348) · [Launch-file reads](/home/orca/.tmp/f3-renewal-charged/packages/polaris-dossier/src/url-launch-history.ts:205)

[Observed] The focused test source asserts exact byte charges and refusal after first-read revocation. Review was source-only. [Focused test](/home/orca/.tmp/f3-renewal-charged/packages/polaris-dossier/src/url-launch-history.test.ts:403)
