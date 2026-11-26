# CONFIRM

Subject `f6a0c866e28d539d8404479af704c59eeb14f8b8`, tree `5850002e5dfdf27a04c2ef25e247698bb856f4a9`. Independent scoped package review for `syzygy-7g2j`.

[Observed] The private package starts from official #973 stage `2f3d6b78d2c71cbed9a8d111833c5fbf7f7849ec`. Its first archive parent `2683f99b03d888e7784b7039983255cf99476607` installs no checker source. Its source-only merge `5e72a22a39ba207cc5b52d19b6dc95186702f44a` uses this archive first and exact R8 `73d199b13180473281ac9aae11d341577c9b6d7c` second. Direct Git reads reconcile four exact R8 source blobs and eleven archive paths. All eight raw files match their original immutable copies byte for byte. The original 96-entry record SHA-256 `039e696c5b2cc63030aa0eec58efb4a03a1a0fc0cfa863eb1904c5a82cda5746` matches its historical Git blob. The supplemental record SHA-256 `3ef24bffc63c6277375319c97df71b43b134398a5d5bf459f590d1214d73dadd` names exact R7 and R8 test-source digests, nine scoped R7 negative inputs and two separately evaluated R8 authority controls.

[Observed] In a detached clone, the ordinary generated-file check returned 98 entries, all 40 scoped selftest cases passed, and the campaign matched the identical 1,005-file Git index and tree path sets. The census counted 957 raw and 48 other paths, with none unmatched or assigned twice.

[Observed] Executed `git revert --no-commit -m 1 5e72a22a39ba207cc5b52d19b6dc95186702f44a` in the independent clone. Its tree `427f4494eb013e8488621cf194244b6405054c32` restores exactly four source paths to the official stage and leaves the exact eleven archive paths plus the full predecessor ledger in place. Independent proof SHA-256 `8570589e4bbe8be71b222005d5b9a0cd9517982e3817f500e1e8a269503a968a`.

[Observed] This review covers source and archive composition on the named official stage. Any adoption row or actual-prefix successor needs its own exact qualification.
