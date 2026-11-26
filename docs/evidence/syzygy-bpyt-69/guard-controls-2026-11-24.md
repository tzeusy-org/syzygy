# npm probe guard evidence follow-up

[Observed] The supplemental controls cover N3, N4 and N5 from the second [independent guard-pins review](../../reviews/R-GP-IMPL-GUARD-PINS-NOTES-2-RAW.md). Verification uses protected Syzygy commit `2c4cf99c4726a1dd16ac95bc65cdcf26b53dbf23`. The two probe blobs and summary verifier match the review's pinned tool subject `e8cd624ecb58e24f763c35276eb7764373f5746e`. The [replay record](guard-controls-2026-11-24.json) binds their SHA-256 digests, mutation fragments and per-case outcomes. The earlier [N1/N2/N7 disposition](../guard-pins-notes-round-2-dispositions-2026-10-28.md) and the N6 merge-history disposition retain their scope.

## N3 ancestor depth

[Observed] Each probe's entry guard refused four private marker fixtures. The added great-grandparent fixture was the only case to reach the end of the guard under the two-level mutant for either probe. The four remaining variants per probe preserved their expected outcomes over the full four-case fixture set. These are 40 guard-entry observations across two probes and five variants. The replay ends at the guard boundary.

## N4 hook placement

[Observed] The current hook removes its own injected evidence path and reports the independently injected foreign path as an unexpected late change. The before-filter and after-filter variants both report that foreign path. With the original post-filter placement restored, the own-path control reported the same late-change diagnostic and the retained selftest still passed 77/77. The verification script checks the full summary for equality when the current hook filters the own path. It expects one diagnostic for each deliberate rejection.

## N5 trace routing

[Observed] The [guarded trace](../syzygy-bpyt-49/npmrc-trace-lane-probe-guarded.json) identifies the current [npm alias probe](../syzygy-bpyt-8-39/npm_alias_probe.py) at SHA-256 `d0681b01b953b0dcff793cb4c6331245ee3c0c101d0977909df30cd0c6444812`. The [earlier trace](../syzygy-bpyt-39/npmrc-trace-lane-probe-after.json) identifies the pre-guard probe at SHA-256 `677b0fe2a670d02c2e279144d58a1cb33a2e829538e08b73555850ca6a56d0c6`. Both traces reference the same retained alias result record.

The first [independent replay review](../../reviews/R-BPYT69-N3N5-OUTCOME-R1-RAW.md) found that a locally edited archive could affect the N4 replay while its report named the requested commit. N4 now runs in a disposable local checkout at the exact requested revision. Its reported tree binds the archive inputs. A deliberate change to the caller's reported test total from 5,385 to 5,386 made the prior command exit 1. The repaired command exits 0 with the exact pinned result and preserves the caller's edited bytes.

Run the optional replay from the repository root. It verifies the pinned source bytes before running the scratch controls.

```sh
python3 -B scripts/check_npm_probe_evidence.py \
  --revision 2c4cf99c4726a1dd16ac95bc65cdcf26b53dbf23
```
