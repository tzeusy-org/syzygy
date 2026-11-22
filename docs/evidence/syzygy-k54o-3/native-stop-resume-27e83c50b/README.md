# Uninstrumented public Stop and Resume at 27e83c50b source bytes

[Observed] The selected fixture exited 1 after 251.836 seconds, with one failed and three skipped. It retained the initial cut and passed the four recorded public resume controls. The initial design audit confirms stopped/SIGTERM with view and group termination and settled tools, zero pending calls. The supervised run used its existing PT2H deadline and the test's 540-second watchdog.

[Observed] The fresh design audit recorded declaration, launch-attempt, launch-history, Round 2 delivery at site 1, and one `inference-forward` machine-peer effect at 14:44:05.647 UTC. The last screen transition was `role-ended` at 14:44:27 UTC, after the screen had reported `prepared design round 2` at 14:44:00 UTC. The fresh audit ends at the machine-peer effect. It has no relay, ordered or launch-terminal record. The fixture recorded zero design provider forwards and no Execution Record. The fresh child exit or inspection outcome and the first failing predicate remain [Unknown].

[Observed] The checkout started clean and detached at `27e83c50b66723f2b87c54e7ea254c7f401507a7` at 14:40:36 UTC. Its native runtime manifest was written at 14:40:42.290 UTC, and the initial cut was written at 14:41:52.217 UTC. The worktree HEAD advanced during the public resume at 14:42:14 UTC to `db7dbbd88db2bfc50dd4e8bfd36e4fae5f28de28`. The only changed file is a separate integration test, `packages/polaris-dossier/src/session-launch.test.ts`, outside the selected fixture and runtime manifest. All 286 tracked manifest inputs match the starting commit blobs. The 94 dependency inputs match the manifest by digest. All eight runtime outputs match the built manifest. The seven explicitly checked selected fixture/runtime source files match both commits and the disk bytes. The result is bound to those runtime and fixture bytes with the mid-run checkout HEAD transition disclosed.

The projection carries closed evidence and digests. The original fixture log and cut/failure files remain in the owned scratch namespace. Reproduce the projection there with the original artifact prefix and observed exit status.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 project.py "<original artifact prefix>" 1 | cmp - run-binding.json
```
