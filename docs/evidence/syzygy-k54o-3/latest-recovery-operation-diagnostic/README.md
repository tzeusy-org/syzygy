[Observed] Test-only source `9acab4c48f06e59f562ff0f80928b264bbe6045d` extends the existing bounded native recovery observer with latest-call timing, first refused-call timing and the genuine controller work snapshot. The product, assertions and deadlines are unchanged. Fresh source review: **PASS**.

Clean-clone owning checks pass: typecheck, three observer cases (four native scenarios explicitly skipped), and the full trusted build. The exact reviewed after-source bytes match the commit.

The preceding published ff651 hosted run passes governance six of six jobs (maximum 395 seconds against 420), and eight of ten Node jobs. Interrupted recovery reaches 36 inference steps and stages its verdict before broker poisoning causes transport refusal at 533.61 test seconds; this run does not hit the 600-second test deadline. Six mandatory success receipts bind tested merge d412b5d94378f1f9bd264b18110c33b71179d0d2. The failed recovery receipt is absent. Raw log and exact diagnostic are retained.

[Inferred] Broker poisoning precedes inspection-confirmation and audit refusal. Ordered tool wall/CPU bounds remain candidate originating predicates. A snapshot reason of `retired` alone does not prove a timer.

[Unknown] The new genuine recovery run, a production performance cure and final full-suite/hosted acceptance. The original 600-second test deadline and product resource caps remain.

`payload.tar.gz` contains inert source patches, verbatim review, raw hosted evidence and owning-check outputs; `manifest.json` binds each member. No archived code is executable.
