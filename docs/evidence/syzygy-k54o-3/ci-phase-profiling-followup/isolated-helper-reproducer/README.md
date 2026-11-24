# Isolated profiling helper reproducer

[Observed] The retained harness extracts only `_profile_selftest_call` from the exact committed git blob. No project module is imported. Sixteen synthetic checks passed, and removing the final diagnostic guard was killed. Results retain source/harness digests and the exact mutant old/new fragments.

Run from this directory:

```sh
python3 check_profile_helper.py --repo /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w --commit 5d967d2626456d97ebf41065259fbd82910bab1e --output results.json
```

[Unknown] Real canonical selftest correctness/performance is outside this isolated check.
