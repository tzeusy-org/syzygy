# Combined measured reconciliation dispatcher candidate

Base: `aac89d9fcf1a275974d12e7573173a1617bff455` (one-LF ledger repair committed; script bytes equal published f043). This directory is outside the primary checkout. `candidate.patch` changes only the reconciliation script. It maps 17 whole entry fixtures and 19 unchanged edition families through the existing fork/worker/fallback policy, using two sequential pool lifetimes and one shared ordered-result join. All per-tree checks stay coupled. There are no new filters, schedules, fixture skips, limits or gate changes.

[Observed] Static proof preserves the real entry bodies except extraction and replacing immediate skip print/continue with buffered message/return. Edition bodies are byte-identical. The complete original module AST is restored by reversing only declared dispatch edits; existing FIFO writer, CLI/no-write/exception checks,30s/1GiB child bounds and final witness denominator computation remain. The 33-case extracted-code harness passes with two actual fork workers and synchronous fallbacks, synthetic fixtures and fake effect dependencies. It covers deterministic witnesses/failures/skips, failing workers and state cleanup, missing/duplicate/reordered/out-of-range/non-integer indices, actual existing class/filename/no-refusal guards, skip guards, FIFO stop, CLI ROOT restoration and no-write detection. Removing the exact index guard is killed; old/new mutation bytes are retained.

Rerun the lightweight checks from this directory:

```sh
python3 check_static_candidate.py --repo /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w --base-commit aac89d9fcf1a275974d12e7573173a1617bff455 --candidate check_spec_reconciliation.py --output static-proof.json
python3 check_isolated_dispatch.py --base-commit aac89d9fcf1a275974d12e7573173a1617bff455 --source check_spec_reconciliation.py --output isolated-results.json
```

`build_candidate.py` reproducibly constructs the same candidate from the named base blob. The results bind each harness and source digest. No project module, real fixture tree, child CLI, canonical selftest, build or native scenario has run here. No primary checkout/index edit or adoption was made.

[Unknown] Actual repaired canonical witness equality, success and timing. The measured predecessor failed326fixtures due to the ledger boundary; its697.094s total,293.919s entry phase and112.519s editions identify targets without establishing repaired performance. A fresh source review and adoption must precede a clean-clone canonical selftest, which must pass before completion. Ordered serial/parallel real witness equality and both hosted seven-minute clocks still require execution evidence. This candidate makes no timing guarantee.
