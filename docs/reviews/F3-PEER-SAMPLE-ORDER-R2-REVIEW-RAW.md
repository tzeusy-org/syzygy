**PASS** for A138 revision 2. [Observed] The patch SHA-256 `c87d6fdedef93f83cc5cc2facdbbac9dc251e1f1e9084850c7b835796f4fc74d`, base, and both blobs match.

[Observed] The caller still checks full effect authority immediately before scheduling the verifier. The verifier joins the already pending, bounded launcher sample, then checks current authority before and after supervisor revalidation. This adds no wait dependency. Kernel, store, publication, and deadline checks retain their order. [Source](/home/orca/.tmp/f3-peer-sample-order.6rGMa3ga/w/packages/polaris-dossier/src/url-run-machine.ts:269)

[Observed] The paused-socket test distinguishes two authority checks during the held sample from the predecessor’s three. Withdrawal refuses admission and leaves no canonical client record. The added reverify witness detects a missing post-wait guard when the sample completes successfully. An independent sample failure could mask that specific fault. [Test](/home/orca/.tmp/f3-peer-sample-order.6rGMa3ga/w/packages/polaris-dossier/src/url-run-machine.test.ts:267)

[Unknown] Native latency improvement remains unverified. I made no edits and ran no tests.
