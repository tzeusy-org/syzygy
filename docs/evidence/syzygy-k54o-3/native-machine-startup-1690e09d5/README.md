# F3 machine startup on exact 1690e09d5

[Observed] The uninstrumented owned public stop-resume on `1690e09d56566637979451af67cfe0a179b36ea3` failed in 207.092 seconds with `launch-unavailable`. The public fixture verified the initial cut, acquired the exact claim, and observed the policy and claim withdrawal refusals. The four new role audits each contain one declaration. No fresh launch or Execution Record was retained.

[Observed] The sealed machine cut lists eight terminal clients. The protected state after failure contains those eight and one new `never-issued` slot. The persistent empty store lock was created at 13:35:39.825 UTC, before the new state file was created and written at 13:35:41.653 and 13:35:41.948 UTC. This orders the retained lock before the first fresh slot publication. The previous terminal population was seven `revoked` and one `never-issued`.

[Inferred] On the bound source the returned store and all eight resumed terminal checks precede allocation. The first resumed allocation crossed its protected state rename, then failed under its held lock. The duplicate-check, timeout and private readback internals remain unknown for the uninstrumented run.

[Observed] The first replay attempt stopped in owned namespace preparation, before an initial cut or diagnostic row. The second attempt used the same frozen overlay and passed namespace preparation, initial stop, and the public verify, claim and withdrawal controls. It ended in 196.991 seconds with the generic checked controller or supervised stage failure. Its fresh audit files were all empty, with the design file's final write at 13:45:13.251 UTC and failure manifest at 13:45:13.815 UTC. The machine trace never entered resumed creation. The store retained the eight sealed clients, with no extra slot or lock. The 38 raw trace rows cover the initial ordered attempt and its design sampling only.

[Inferred] The second replay refused during fresh audit creation, before the first declaration was written. The exact source shares one 5000 ms audit deadline across fresh parent checks, segment opens and stats, directory sync, identity inspection and the four declarations. The uninstrumented first allocation failure and the replay's earlier audit setup refusal are distinct observations. The detailed machine trace had no resumed store operation to time.

[Unknown] The precise refusal predicate in either native playback and end-to-end public interrupted recovery remain unverified. The overlay preserves the 540-second fixture watchdog, 5000 ms machine operation and audit bounds, 1000 ms design sampling bound, authorization predicates, and runtime profile. The overlay adds diagnostic I/O.

## Verification

The files bind the original test log, cuts, failure manifests and protected records by digest. Raw JSON lines carry closed phase labels, roles, counters and monotonic times. The projector validates the trace before grouping it.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
