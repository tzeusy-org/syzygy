PASS

[Observed] Reviewed `0a189288a90b404dce58f836b971233fd3aae0a4..e8e4578399ecfc06f237dba98b21b25099525f61`. Diff SHA-256 `16162bd5a6c5ada14bac406423bf199524f8c5712c31c6ec7e04ab63d0bc1cbc`. `git diff --check` passed.

[Observed] The revised guard checks for a failed close and an expired sample after acquiring the anchor and before opening the iterator. Cleanup still closes that anchor. The census retains the existing descriptor, depth, entry, and time bounds. Iteration and submitted stats settle before their anchor closes. All closes settle before publishing a count or retrying a disappearance. `packages/polaris-dossier/src/session-launch.ts:278–394`.

[Observed] Both controls observe the second real descriptor close and allow a poll turn while the first close remains held. They then check that the sample has published no result or authority confirmation. The negative control also observes a real `ENOENT` and requires refusal with no retry or sampled bytes after the injected close failure. `packages/polaris-dossier/src/session-launch.test.ts:1086–1156`.

[Unknown] Native execution and timing on this revision. This review was source-only.
