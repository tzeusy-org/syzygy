# Independent review of retained dossier step measures R2

**Verdict CONFIRM**

[Observed] This confirmation is scoped to R1 finding F1 for exact R2 leaf `9fba199ed978dc5480fbf90a34d30aeecab974d4`, tree `6bf1d03539a26f7997b74b3deee0bc3cbf9cad83`, and parent R1 `d41250048efd4448e25da51f972152183ceb4369`. It binds candidate spec SHA-256 `f7ff5706c26b937d991e24183d5dcb29091fefe580b066ccbfc32540fde7ea05` and independent R1 raw SHA-256 `2bb9249978e385c4c1de7dc702afdeeb1f5308aa464149172cdcedfb30101e31`.

[Observed] Replayed the independently prepared R1 normal-close fixture in exact R2’s isolated checkout without changing its input or expected bound. The original writer produced 16,777,157 bytes and reported 41 declared tokens. R2 produced 16,773,798 bytes and the stock status reader still reported 41 declared tokens. Its output remained within 16,777,216 bytes. The one-test replay passed, with raw log SHA-256 `27315d6c8f27d73ced217c7389dfe3e4b54f4a54a459e7f0a33f5eaf61cbf0de`.

[Observed] The integration close suite with the independent replay passed 27 of 27 collected tests. The precise threshold fixture exercises both full and capacity-limited records at 16,777,216 bytes, reads the same usage for both through status, and verifies that one more UTF-8 byte yields the typed refusal with no successful record. Log SHA-256 `71d2d1e9ea41170a0a3a07a357aafb567e75fba37521624ed2f280ab8dbee1f3`. Both logs are retained in `/home/orca/.tmp/syzygy-four-lanes.xTvnrE/root-timing-r2.5bgFA7`.

[Observed] The exact successor retains the 21 effective v2.30 scenario bodies and the warrant block. It extends one of R1’s four timing scenarios to cover the aggregate reader bound and adds the matching boundary oracle. Independent parity SHA-256 `e3f0a8ddc8f7e4269b9c82c87bc48b4f0aa6108d41b64268b40c698a86fd249d`.

[Unknown] Whole-package publication, the current peer close-admission composition and protected checks remain unverified by this scoped confirmation. This confirmation covers the demonstrated close boundary and incumbent usage behavior.
