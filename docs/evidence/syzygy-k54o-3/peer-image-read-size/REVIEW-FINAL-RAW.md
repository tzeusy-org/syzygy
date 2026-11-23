PASS

[Observed] Reviewed `d3ac90ba8440dff33ad9e51721aae99854ef18c9..d44c8a6b65bd7b9c755e93b12331522d26e4b7c2`. The frozen peer source SHA-256 is `44696cec6494cfa84ad167242a2323e85ac61b2c4b5eac7c6d0503e0ac2af368`.

- [Observed] The change preserves A-75 and A-114. One held descriptor is read asynchronously, with at most 4 MiB hashed after each awaited read. The private guard runs before each read and around final verification. Exact SHA-256, held and named inode checks, full effect authority before and after hashing, and the existing five-second setup bound remain in place. Final kernel reattestation still precedes peer issuance, as required by A-14 and REQ-polaris-generation-048. See `packages/polaris-dossier/src/url-machine-peer.ts` lines 17–18, 112–138, 295–309, and 329–394.
- [Observed] The native test checks every requested length using the actual bytes returned by preceding reads, checks the total against the installed image size, and requires a final zero-byte read. This covers short reads and detects a return to 1 MiB requests after the first read. The existing withdrawal control still requires one read and a refused capture. See `packages/polaris-dossier/src/url-machine-peer.test.ts` lines 172–238.
- [Observed] Independently recomputing the parsed TypeScript fingerprint produced the stored value `c508172540cc64d06bff0debd78a81bd937c6f676b6bed59643d931ca1aa3f9b`. The sole `/usr/bin/prlimit` call in the module is byte-identical to the predecessor and retains its parsed invocation fingerprint. See `apps/three-surface-poc/src/sync-child-process-guard.test.ts` lines 91–93, 111–113, and 229–254.

[Unknown] Actual sampler cadence and capture latency under composed native Resume load require runtime evidence.
