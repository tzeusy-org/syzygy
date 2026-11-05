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

## Waiting-session authorization

[Observed, implementation of the 2026-11-05 owner direction]
`session-prompt <run> all`, delivery to an existing waiting review session,
and both forms of `await` check the local-agent sign-off at operation entry.
The date-only record must match the installed reviewed subject and contain
one recorder-position `Date: YYYY-MM-DD`, a real calendar day no later than
the UTC day of that operation's captured finite representable clock value.
The same UTC day is eligible; this cannot establish the exact signing time.
The direction is
[OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05](../../.syzygy/governance/decisions/OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05.md).

[Observed] A temporal refusal retains `outcome: refused`, `stage: unsigned`
and exit 1, with a precise future, missing/invalid Date or invalid evaluation
reason. It happens before prompts, packets, submission files, step logs or
stdin consumption. Any matching in-force eligible candidate opens the gate;
otherwise matching candidates' reasons take precedence in this order:
future, invalid Date, missing Date; only then drifted subject or absence.
The existing manual v1.1 hand-off remains available.

[Observed] Every invocation re-reads the trusted checkout. Separate record,
aggregate, review and specification reads are not an atomic snapshot; an
already-running await slice retains its entry authorization. There is no
forgery defense or continuous revocation watcher. Genuine revocation follows
the explicit owner-act/direction route (RFC3-16, Scope A direction 6);
arbitrary appended `Withdrawn:` prose is no new record dialect. The registry
reader independently requires its exact template and same-day whole-second
`Recorded at (UTC)` instant; this local-agent rule supplies no fallback there.
