BLOCK `712458421a932229ce8987260ecff65f6a876081`

[Observed] The machine wrapper now awaits `.finally()` on the observed promise. This introduces a derived promise and delays fulfillment and rejection relative to the original direct `await`. Await the promise returned by `observeBootstrap` inside `try` and restore the store spy in the corresponding `finally` block. [url-run-composed.test.ts:1319](/home/orca/orca/projects/syzygy/packages/polaris-dossier/src/url-run-composed.test.ts:1319)

[Observed] The stage order matches the native resume call path. The store spy is installed inside live machine creation, after the cold history reader and claim have completed. Both resume cases use the stage assertions and retain their terminal checks. The eligible case’s bounded watchdog and the final evidence include the trace. This review was source-only.
