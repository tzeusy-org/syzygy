# @syzygy/polaris-dossier

The Polaris dossier command drivers and the run machinery behind them.

## Entry points

The package barrel (`.`, `src/index.ts`) exports exactly two values, the command-line drivers the daemon dispatches to:

- `runDossierCli`: `syzygy dossier ...` (`src/cli.ts`)
- `runPolarisCli`: `syzygy polaris ...` (`src/polaris.ts`)

Anything else is reached by a named subpath. Each subpath lists a `source` condition first in `package.json` `exports`, so tests and the
typecheck load the TypeScript source and never `dist/`.

## Subpaths

| Subpath | Module | Used by |
|---|---|---|
| `./argv` | `src/argv.ts` | the daemon entry (`apps/syzygy/src/main.ts`) |
| `./state-directory` | `src/state-directory.ts` | the daemon entry |
| `./check` | `src/check.ts` | `scripts/redis_screening_remeasure.mjs` (by `dist/`) |
| `./cli` | `src/cli.ts` | `scripts/dossier_scale_measure.mjs` (by `dist/`) |
| `./clone-shape` | `src/clone-shape.ts` | `scripts/dossier_scale_measure.mjs` |
| `./full-run.testkit` | `src/full-run.testkit.ts` | `scripts/dossier_scale_measure.mjs` |
| `./gate-sources` | `src/gate-sources.ts` | the `scripts/differential_*`, `measure_*` and `redis_*` measurement scripts |
| `./git-object-reader` | `src/git-object-reader.ts` | the same scripts |
| `./init` | `src/init.ts` | `scripts/dossier_scale_measure.mjs` |
| `./inventory` | `src/inventory.ts` | `scripts/redis_screening_remeasure.mjs` |
| `./review` | `src/review.ts` | `scripts/redis_screening_remeasure.mjs` |
| `./screen` | `src/screen.ts` | the `scripts/differential_consent_act_families.mjs` and `redis_*` scripts |

The scripts name the built files by path (`packages/polaris-dossier/dist/<module>.js`); the subpath is the same module by package name.

## Module layout of the split files

Cited paths stay: each split module keeps its old path and re-exports what moved out, so an importer and a citation of the old path
still resolve.

- `check.ts`: the check driver (`checkSubject`, `checkDraft`); `check-model.ts` holds its formats and types, `check-derive.ts` the
  derivation (`deriveFindings`, the draft rules, `collectBlocks`, `collectCitations`).
- `review.ts`: `reviewPacket`, `reviewCheck` and the reviews of record; `review-model.ts` holds formats, naming and types,
  `review-packet.ts` the packet builders, `review-verdict.ts` `validateVerdict`.
- `inventory.ts`: the inventory brief, check and record; `run-dir.ts` holds the run-opening code (`openRun`, `logStep`, `readRecord`,
  `errno`) and the sessions root paths.
