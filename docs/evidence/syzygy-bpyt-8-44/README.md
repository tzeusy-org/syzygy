# M5 Greenfield parity reconciliation, generation 2

[Observed] Audited Syzygy at `74e01e140a9a10322a00e9f1ea8dc015ac5598b3`, after the four prerequisite G2, G4, G5 and G6 repairs landed. This reconciles `syzygy-bpyt.8.44` against the six M5 targets in the [October audit](../../plans/2026-10-21-greenfield-parity-audit.md#6-findings-and-beads) and the [generation-1 record](../syzygy-bpyt-8-7/reconciliation-gen1.json). The active target is the local-agent dossier with the provider path parked under the signed local-agent specification. GP-Q0 preserves existing output and gate decisions across simplification. The current record includes three formerly partial targets and carries the other three dispositions forward as evidence.

| Finding | Generation 2 disposition | Current source and retained proof |
| --- | --- | --- |
| PD-1 | [Observed] Local entry isolation and finite reverse closure verified. [Unknown] Arbitrary loader closure and whole-island deletion. | The retained generation-1 independent resolver reaches 221 modules from the CLI and one from the broker, with no unresolved imports or island or named parked origins in either set. The current AST guard's nine cases passed. Its reverse-closure population corresponds to 336 tracked app/package JS and TS source origins, 24 listed island members and six named parked origins. Its finite alias checks and explicit exception origins are part of the boundary. [G2's landed evidence](../syzygy-bpyt-8-40/original-outcome-disposition.json) preserves the wider R7 residual. `syzygy-qkea.19` carries renderer separation, and `syzygy-bpyt.10` carries the cross-epic audit. |
| PD-2 | [Observed] Shared CLI table, parser, context and report outcome verified. | `DOSSIER_COMMANDS`, `readArgv` and `commandContext` remain the owners. `polaris.ts`'s command-specific `parseArgs` delegates to `readArgv`. The broker remains an argv forwarder. The current AST scan finds just `outcome.ts:2` in 163 production TS files out of 324 across the five roots. The landed [G6 CLI evidence](../syzygy-bpyt-8-43/outcome-command-parity-2026-11-23.json) checks all 1,633 raw stdout, stderr and exit rows against the earlier source. The current CLI and step suites passed as enumerated below. |
| PD-3 | [Observed] Existing gate justified and strict UTC-day correction retained. | The [G1 reconciliation](../syzygy-bpyt-1-26/G1-RECONCILIATION.md) records the actual direction and system effects. `waitModeStatus` still takes a finite captured clock and exact versioned record. Same UTC-day eligibility and named future, invalid or missing-date refusals remain covered by the waiting-session suite. Its time granularity is one UTC day and each operation evaluates it at entry. |
| PD-4 | [Observed] Existing form-family consolidation retained. | `polaris-generation-consent/src/package-reader.ts` retains one `parseActRecord` and one `findActRecords` used by the admission, policy and class families. The `package-reader.test.ts` suite passed. The wait-mode versioned-record reader remains distinct. Former follow-ons `syzygy-bpyt.8.21` and `.8.26` are closed. `.8.25`, `.8.28` and `.8.29` are still blocked in their own scope. |
| PD-5 | [Observed] Single schema module and G5 object-test removal verified. G3/G4 reader distinctions explicitly retained. | `closed-schema.ts` owns `check` and `checkShape`. `draft-schema.ts` wraps the schema; `iso-of.ts` owns the sole local `isoOf`. The present sweep finds no match for G5's object/type/non-null/non-array spelling in the 163 production TS files, and the current `polaris.ts` uses the imported `isRecord` at the affected record boundaries. Replaying the [G4 decoder probe](../syzygy-bpyt-8-41/entity-decoder-probe.ts) gave the same 239 divergences over 751 inputs. The [G3 quotation record](../syzygy-bpyt-1-27/quotation-domains-2026-11-05.json) distinguishes the local rendering and broad-check grammars and their retained differences. `syzygy-wrih` owns the remaining list/text helper copies. |
| PD-6 | [Observed] Barrel and documented subpaths retained. One historical size target has drifted. | Current manifest and README agree on all 12 subpaths. The barrel still exports only `runDossierCli` and `runPolarisCli`. The generation-1 split-file check had 12 files below 500 lines. Today 11 are below the same threshold and `check-derive.ts` is 992 lines. It was 366 in generation 1. Current rule, subtitle, subsection, relation and overview work changed this file after that audit. [Inferred] The size difference warrants a current separation assessment in the next cross-epic audit. That assessment must consider the current rules and their governing requirements. |

## Landed inputs

[Observed] All six generation-1 gap dispositions were checked against actual Git history and the current tracker. G1 and G3 are separate records, and the generation-2 bead's four hard dependencies are closed.

| Gap | Landed change | Carried disposition |
| --- | --- | --- |
| G1 | [#753](https://github.com/tzeusy-org/syzygy/pull/753) `f0d195c5` | `syzygy-bpyt.1.26` implements the UTC-day rule under the recorded direction. |
| G2 | [#759](https://github.com/tzeusy-org/syzygy/pull/759) `e0588b84` | `syzygy-bpyt.8.40` enumerates the finite reverse-closure guard and named exceptions. |
| G3 | [#758](https://github.com/tzeusy-org/syzygy/pull/758) `a5afce5c` | `syzygy-bpyt.1.27` records the distinct admitted quotation domains and qualifying review. |
| G4 | [#725](https://github.com/tzeusy-org/syzygy/pull/725) `f5640845` | `syzygy-bpyt.8.41` retains both decoders with the difference pinned. |
| G5 | [#724](https://github.com/tzeusy-org/syzygy/pull/724) `37c7ece2` | `syzygy-bpyt.8.42` removes the two inline object tests, using existing `isRecord` seams. |
| G6 | [#928](https://github.com/tzeusy-org/syzygy/pull/928) `d1deb47f` | `syzygy-bpyt.8.43` moves complete refusals into their existing producer steps. |

## Reproduce the census

[Observed] [The machine census](current-source-census.json) binds input artifacts by SHA-256 and records each source population. From a clean, locked-dependency checkout whose audited app and package contents are still identical, run the retained independent resolver through the census and compare the raw report.

```sh
node docs/evidence/syzygy-bpyt-8-44/current-source-census.mjs 74e01e140a9a10322a00e9f1ea8dc015ac5598b3 |
  diff -u docs/evidence/syzygy-bpyt-8-44/current-source-census.json -
```

[Observed] The 10 current unit/integration files for island reach, closed schema, quotation fidelity, consent parser, CLI and CLI table, launch guidance, preflight, status and waiting-session behavior passed 877 of 877 tests at the audited commit. The current quotation-locator and decoder-divergence gates passed 29 of 29, and the exact entity differential was replayed under the current lockfile. The historical larger CLI and quotation evidence is carried by digest rather than asserted to be a fresh generation-2 corpus run.

[Observed] Tracker changes for this reconciliation are limited to its own delivery and review records. Scope includes the six prior PD targets; the carried PD-6 size drift, G2 loader limitation, existing reader work and whole-project convergence continue as described above. The M5 parent and previously closed original findings retain their own acceptance and lifecycle.
