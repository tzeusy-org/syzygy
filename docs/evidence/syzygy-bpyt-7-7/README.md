# syzygy-bpyt.7.7: audit of the test-only cap1-core domain functions

Read-only audit; nothing was deleted or changed in production code.

- Subject: Syzygy commit `0285819da45684e6299e81402d6ad1b7e4032eab` (main when
  the sweep ran). `evidence.json` records the blob digest of every file the
  verdicts cite, read from that commit and not from the worktree.
- Population: the 15 functions named by the bead, plus `authorizeWrite`
  (added by the bead's 2026-10-22 note). 16 rows.
- Result: 10 test support (9 of the 15), 4 gaps already filed (`syzygy-u2a.13`
  for 2, `syzygy-u2a.7` for 2), 2 new gap candidates (`isLocatorShaped`,
  `renderSuperseded`). Per-function requirement quote, conformance file,
  production anchors (file:line) and a label of `Observed` or `Inferred`
  are in `evidence.json`; the table below is a reading aid.

| Function | CAP1-REQ | Verdict | Production path or gap |
|---|---|---|---|
| authorizeObservation | 016 | test support | decideRepositoryConsent (consent-decision.ts:576) via computeCoverage |
| deriveEffectiveStatus | 046 | gap, `syzygy-u2a.13` | main.ts:235 passes no authority source |
| artifactInForce | 046 | gap, `syzygy-u2a.13` | same |
| isComplete | 014 | test support | degraded-partial state and coverageBoundary (coverage.ts:278, :312) |
| proposeEntryLink | 053 | test support (MAY limb) | empty OPEN_PROPOSALS (routes-machine.ts:187); no write path |
| computeDiscoverabilityWithProposal | 053 | gap, `syzygy-u2a.7` | getDiscoverability never supplied |
| extractDiscoverabilityDistinctions | 064 | gap, `syzygy-u2a.7` | sweep fed empty planes (routes-machine.ts:246) |
| epistemicMarking | 045 | test support | extractDistinctions (distinction.ts:35) |
| citeBasis | 045 | test support (prohibition limb) | positive limb follows `syzygy-u2a.13` |
| queryKey, answersAgree | 042 | test support | one evaluation served and stamped (main.ts:229) |
| presentProject, presentRepository | 060 | test support | identity-field enumerations (routes-machine.ts:211) |
| isLocatorShaped | 060 | new gap | admission accepts URL-shaped ids (probe in evidence.json) |
| renderSuperseded | 062 | new gap (low) | no producer of superseded or stale states |
| authorizeWrite | 061 | test support | governedPlaneViolation (main.ts:140); oracle is the system test |

## Re-run

```
python3 docs/evidence/syzygy-bpyt-7-7/audit_sweep.py --selftest
python3 docs/evidence/syzygy-bpyt-7-7/audit_sweep.py <repo-root> --check docs/evidence/syzygy-bpyt-7-7/evidence.json
```

`--selftest` mutates fixtures (a production caller appears, an anchor or a
definition or the conformance file or the spec heading disappears, a comment
mention, an absence anchor) and requires each to be detected. `--check`
recomputes everything but `probes` and `notes` against HEAD and fails on any
difference, which is the cue to re-audit that row. The runtime probe for
REQ-060 is `probe-req060.test.ts.txt` (copy into `packages/cap1-conformance/src/`,
run with vitest, delete the copy).
