PASS

Independent source review of F3 renderer fixture isolation and public recovery audit protection

[Observed] I reviewed the exact two-file patch from e10a56f763c3e1dac7961e59a17d523900b518c1 to be75f5a91dadb1b188561bc7600c45d61a1def9a, consisting of fixture corrections 5cc2efcf1eb9d922872a4fea469a59fdcac69bac and be75f5a91dadb1b188561bc7600c45d61a1def9a. The worktree matched the bound Git bytes. The source verdict covers F3-TIMER-ISOLATION-1 from the predecessor review and the recovery fixture's reproduction of the production audit root.

## F3-TIMER-ISOLATION-1

[Observed] The three renderer timing cases use one installation promise in render.test.ts:268–276. That promise creates a unique empty directory via the shared tempDir helper, which removes it at file teardown (packages/test-kit/src/temp-dir.ts:8–20 and vitest.setup.ts:16–24). The isolated fixture copies the current first-party inputs and locally installed dependencies into that directory, preserving relative workspace links and excluding workspace dist directories and Vitest caches (url-run-composed.testkit.ts:83–106). The normal builder anchors its output to its own script checkout and exclusively creates the runtime files and manifest there (scripts/build_dossier_runtime.mjs:14,132–149). The timing test checks the worker path is under its scratch checkout before obtaining the nominal renderer from loadUrlDossierRenderer. That loader verifies the specified installation before and after importing the verified renderer bytes (url-runtime.ts:141–198,212–225).

[Observed] The public composed fixture still builds at the actual CLI checkout (url-run-composed.test.ts:111 and url-run-composed.testkit.ts:77–80). Both files remain integration cases under the configured worker concurrency (vitest.tiers.ts:106,139 and vitest.config.ts:27–40). Their timed behavior assertions and public entry points are unchanged by the patch.

[Inferred] The independent output roots remove the reported shared-path race while the timing cases retain a real, verified renderer. The test still exercises lease and admission behavior under the original context. This addresses the reproducibility concern under CC-TEST-1 and test-rigor rule 6.

## Public stop and resume fixture

[Observed] The fixture previously protected only the first audit's attempt directory. Public resume restores the saved role view and creates a fresh sibling audit under the host root (polaris.ts:555–582 and url-role-plan.ts:244–254). The original launch-history acceptance predicate requires a protected path to contain the audit parent and separately rejects parents inside the run or its sessions directory (url-session-audit.ts:893–907). In the retained failure projection the actual predecessor launch record was written. The first audit included launch history and design delivery. The fresh audit had declaration, launch attempt and terminal events. I matched the stopped boundary, both audits and the resumed launch record to their SHA-256 values directly. Recomputing path containment over the projection's 16 retained design protection paths found one containing the first audit and none containing the resumed audit. The fixture host root contains both.

[Observed] On a recovery case, the revised fixture protects the exact host root installed by the test's URL_HOST_ROOT seam and passed to prepareComposedRun (url-run-composed.test.ts:25–34,243,451 and url-run-composed.testkit.ts:140–155). Production builds its initial role plans with URL_HOST_ROOT protected (polaris.ts:837–842). The ordinary composed fixture continues to protect its dedicated hidden directory. The replacement remains in test setup. The canaries, production role restoration, launch-history checks and public resume result assertions are exercised along their existing paths.

[Inferred] The fixture now supplies the same containment relationship as production and addresses the necessary predicate that refused the predecessor's retained audit path. The projection does not establish whether later production checks succeed.

## Authority and scope

[Observed] VIS-4 delegates decisions outside the four reserved owner classes. D10 adoption A-14 binds URL dossier 2.1 and its governing amendment at ab94bcdc7e4a0e1fdb4488e5f2a642fec0dcf118. CC-TEST-1 says a defect fix includes a test that fails on the pre-fix behavior and passes on the fixed behavior. [Inferred] These two fixture changes fit the adopted behavior and its reproducibility bar. They change no production source, doctrine, detectors, egress, repository permissions or deployment. This fresh source review adds no approval requirement.

[Unknown] I did not run the successor tests, mutate sources, or run the governance battery. The current combined integration result and any further runtime findings depend on the separate verification run. This verdict records the scope of this reviewed patch.

## Scripted SHA-256 binding

```json
{
  "subject": "be75f5a91dadb1b188561bc7600c45d61a1def9a",
  "predecessor": "e10a56f763c3e1dac7961e59a17d523900b518c1",
  "patchSha256": "5fdafdc131dedff92cd10385e88dc57483d7402b224ded9c23daa8ee4a795faa",
  "files": {
    "packages/polaris-dossier/src/render.test.ts": {
      "bytes": 221561,
      "sha256": "1e99e7b28e32bd8f129fc056530d98579c5c928b9df284c7225c60e3c68c15cc",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/url-run-composed.testkit.ts": {
      "bytes": 18288,
      "sha256": "d07ae21e3a524ba3a3d728f30cdf026227d38dc653077f47c8fc19eb05e7238d",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/polaris.ts": {
      "bytes": 116908,
      "sha256": "2e1de984243f73736efa4b954a26bba541c6a332ca195c2559a3243ccb763e01",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/render.ts": {
      "bytes": 97257,
      "sha256": "53cd99c6cc5613a8739cf48ed64548cbd68c0f3183b88c0f04b9ca669f0b1e1b",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/url-role-plan.ts": {
      "bytes": 25462,
      "sha256": "f2bf8b8cc669749d7c3c18efb8ac2bc332b778bf8707547a74bf5ad8998c3e47",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/url-run-composed.test.ts": {
      "bytes": 39847,
      "sha256": "2c7f712b30d0f146bf18ba3e31ed964db8446ead8079b91fd58ff75e75560682",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/url-runtime.ts": {
      "bytes": 17611,
      "sha256": "9faf6710e6f0fe71e72446d6cafbb8068df6de859ba2a138b29f65d490e4d64f",
      "worktreeMatch": true
    },
    "packages/polaris-dossier/src/url-session-audit.ts": {
      "bytes": 96364,
      "sha256": "d0a3e3be202e413f1a1873980b9bc9e6d8687575060c5dd3c5029bd7b060218f",
      "worktreeMatch": true
    },
    "packages/test-kit/src/temp-dir.ts": {
      "bytes": 1150,
      "sha256": "5d221d33706a41be85d3adcdde3fcdabb7decb46c29ce6d79b7c6a76f0ee541d",
      "worktreeMatch": true
    },
    "scripts/build_dossier_runtime.mjs": {
      "bytes": 12022,
      "sha256": "b3ce22917a82f107687f98c9f73ecf6fc5e96fa5eb7032184d114bb7ceac4093",
      "worktreeMatch": true
    },
    "vitest.config.ts": {
      "bytes": 2589,
      "sha256": "3b677756d41400ea04e50816c4b834d07a96593bef097b67c7d1934d5ca9de22",
      "worktreeMatch": true
    },
    "vitest.setup.ts": {
      "bytes": 1509,
      "sha256": "038306b28cc5eb1212f8a44e4c2e347c31f46720be464e642143c38d945f3732",
      "worktreeMatch": true
    },
    "vitest.tiers.ts": {
      "bytes": 15423,
      "sha256": "aa73dd2ee4429bda9571ea79311d35f0372decbc84fb229b73c49d1407f76e57",
      "worktreeMatch": true
    },
    ".syzygy/governance/decisions/AGENT-ADOPTIONS.md": {
      "bytes": 75766,
      "sha256": "9d75e503140a65632249e49decc5a6b6ef4d015b2d5aec535361269c973aa226",
      "worktreeMatch": true
    },
    ".syzygy/governance/doctrine/vision.md": {
      "bytes": 20380,
      "sha256": "733ae1c7e1bcc11649cd0304f29346a6a5a557e23fb69c0f52f8c4c62e287583",
      "worktreeMatch": true
    },
    ".syzygy/governance/policies/craft-and-care/testing-and-verification.md": {
      "bytes": 10937,
      "sha256": "8157c0c63ff27341365c9c29e0f620bd7eb7b986fd40432e9c5a30891d3e0782",
      "worktreeMatch": true
    }
  },
  "retainedEvidence": {
    "f3-assembled-timers-review-RAW.md": {
      "bytes": 19276,
      "sha256": "7077531ab3d1354365fe04da351228bb7304769ad4e8f2eb5c28ead81ac73f19"
    },
    "f3-e10-stop-projection.json": {
      "bytes": 5308,
      "sha256": "c58b87cb9ef88c75764f9a8f3c2254dc542a87afa8fb3f092b3647363fa23a08"
    },
    "stopped boundary": {
      "sha256": "24bb8637e41a8f97f275f2b60604e8e30388b82fc3cdd125cd56e378108c1d21"
    },
    "resumed launch record": {
      "sha256": "30d717d645af47e6b7cad444f94a432238d13003c572bcb8a5661afc8d5671b6"
    },
    "audit attempt-5iWu03": {
      "sha256": "3ffdfa4d3a62f041bcd94c6eb60e72d6515df3d03343054de5a6bedc77d4d6c8"
    },
    "audit attempt-9xYL33": {
      "sha256": "3d6a246243b2746a5f66fc3886b6ea96d226cca8f3030906308804874afda945"
    }
  }
}
```
