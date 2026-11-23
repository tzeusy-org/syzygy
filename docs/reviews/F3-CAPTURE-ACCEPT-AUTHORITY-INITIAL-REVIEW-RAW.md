REVISE

[Observed] The patch and both file blobs match the supplied hashes. The interval between the retained entry guard and the removed guard includes a real kernel observation. `listenerCurrent()` calls `serverIdentity()`, which uses `fs.fstatSync()` to verify the listener socket’s device and inode. The patch therefore crosses the requested read boundary, even though that interval has no `await`. [Capture entry](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-machine-peer.ts:337) · [Listener identity](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-machine-peer.ts:201)

[Observed] Entry denial still precedes socket validation and reservation. Fresh parent and effect checks still gate both native peer helpers, and the other helper callers retain their original order. The focused test catches a repeated entry guard and confirms that either denial prevents native peer dispatch. It does not exercise withdrawal during the listener descriptor observation. [Helper callers](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-machine-peer.ts:305) · [Focused test](/home/orca/.tmp/f3-capture-entry.TFdNmXbY/w/packages/polaris-dossier/src/url-machine-peer.test.ts:181)

[Unknown] The effect on native Resume remains unverified. This was a source-only review.
