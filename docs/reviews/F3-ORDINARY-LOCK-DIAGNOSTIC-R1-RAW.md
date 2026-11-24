REVISE

[Observed] The `mkdir` spy records raw arguments and Promise results for every process-wide invocation before the async scope and lock-path filters run. Replace it with a direct test-only wrapper that observes only scoped lock calls, returns the original Promise, and restores and resynchronizes the original export during cleanup. [Composed test](/home/orca/.tmp/f3-store-candidate.nyfuTgOD/w/packages/polaris-dossier/src/url-run-composed.test.ts:392) · [Spy implementation](/home/orca/.tmp/f3-store-candidate.nyfuTgOD/w/node_modules/tinyspy/dist/index.js:33)

[Observed] The mediation observer continues after `send-attempt` and can report a later response failure as the first initial-send refusal. Keep the attempt active through settlement of its `send-attempt` mediation, then exclude response-phase failures from that summary. [Composed test](/home/orca/.tmp/f3-store-candidate.nyfuTgOD/w/packages/polaris-dossier/src/url-run-composed.test.ts:435)

[Observed] The original lease, guard calls, and Promise returns are preserved. The frozen parent and binary delta SHA-256 matched. No files changed and no tests ran.
