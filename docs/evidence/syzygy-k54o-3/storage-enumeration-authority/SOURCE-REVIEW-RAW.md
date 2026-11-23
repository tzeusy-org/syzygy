**PASS.** The revised test observes native `lstat` submission during directory enumeration and verifies the four-read cap. The one-entry iterator fault exercises the partial-batch cleanup path and verifies the original descriptor is still held at shutdown before releasing the pending stat. `packages/polaris-dossier/src/session-launch.test.ts:84`, `:1029`, `:1044`.

Source review confirms the descriptor closes after the pending stat settles. The fixture verifies retention at shutdown and leaves post-release closure to source inspection. No determinism or cleanup blocker found. `packages/polaris-dossier/src/session-launch.ts:347`.

Reviewed exact commit `06513cbd9` without edits or test runs.
