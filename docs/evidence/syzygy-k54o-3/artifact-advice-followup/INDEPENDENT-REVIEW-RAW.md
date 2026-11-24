# Independent source review — reader advice artifact correction
Verdict: PASS
Scope: Frozen r1 two-file correction; source review only.
Manifest SHA-256: ed9ff1f51e23d7bf1bbee9b280581253fbd74df961fc315760ac59ca9fa22efc

Reviewed subjects:
- `packages/polaris-dossier/src/url-run-artifacts.ts`: `ddfb0a233e864b1da14fa8f572c693f54d6e808fd7474c4aeee7e0a362233c87`
- `packages/polaris-dossier/src/url-run-artifacts.test.ts`: `e2153e505cbee0f9164c16b5f4a200127202f11d27bba55a770e0dfd80b0357e`
- `fix.patch`: `60cc7ea9105e1bb20fcb1a432da0bdcd4da86ac5f6c680d685d8b3d655e7e32d`

Producer references inspected:
- `packages/polaris-dossier/src/reader-advice.ts`: `5f4bace9f26c5393e51b4b99740078572c34ba02e4b60bd213d69c3fd1988a85`
- `packages/polaris-dossier/src/draft-schema.ts`: `582aa91a88874dc90d110184426f9bafc311c43dd198fc7b5ff808b5e84cb3fd`

[Observed] The two packet source hashes equal the manifest and the worktree source hashes. The current diff equals the frozen patch. The two predecessor files at working HEAD `026acc2477ac5450e6b26dd1884e8835f68cced8` equal those at manifest base `aac89d9fcf1a275974d12e7573173a1617bff455`. This verdict binds the digests above.

[Observed] At `url-run-artifacts.ts:482`, the sole runtime delta admits optional `readerAdvice.worthKnowing` using the existing strict `shape` mechanism. When present it must be a bounded array of objects with exactly `at`, `marked`, and `detail`; strings use the existing byte bound and `marked` uses the existing safe, nonnegative, bounded integer predicate. Required reader-advice members and their validators remain in place. The patch introduces no catch-all key allowance or permissive fallback.

[Observed] `reader-advice.ts:39-67,250-251` constructs the same array/item wire shape and omits the field when `hasWorthKnowingForm` is false. `draft-schema.ts:52-75` distinguishes v10 from the current v13 worth-knowing form. Optional absence therefore preserves the older producer output without relaxing the new field's structure.

[Observed] The test first checks the actual current producer's `[{ at: '$.sections', marked: 0, detail: string }]` output, adds malformed value, count, missing-member, and extra-key mutations, and retains the entire predecessor mutant block byte-for-byte as the new block's suffix. Diff inspection independently confirms the original negative cases were not removed. The mutant loop checks an initially empty reply queue, captures the actual helper return, checks its object identity against the seeded reply, and checks the emptied queue. This prevents rejection before helper consumption from satisfying those mutations. The original valid response is subsequently accepted. The schema-v10 revision checks actual omission of `worthKnowing`, is accepted, and is committed; the later current-schema revision retains its prior negative path. Test declarations are unchanged at 44 before and after, consistent with extending an existing test rather than adding suite entries.

[Inferred] The correction is narrowly aligned with the existing producer contract and preserves the surrounding admission defenses. The inspected code and regression changes satisfy this packet's strictness, wire-shape, seeded-reply, and legacy-absence criteria.

[Unknown] This independent review did not execute tests, typechecking, causal replay, or the native recovery workflow. Their outcomes and any native recovery completion remain outside this source verdict. The packet metadata still labels checks pending; separate execution evidence must establish those results.
