# @syzygy/polaris-dossier

The Polaris dossier command drivers and the run machinery behind them.

The URL runtime build (`scripts/build_dossier_runtime.mjs`, also invoked by the
product build) requires Linux and a C11 compiler at `/usr/bin/cc`. It compiles
the first-party `session-peer.c` into a host-only `host/session-peer` executable,
outside the role-visible `support/` mount. The manifest binds its source and
output bytes; the host rechecks the helper before querying a connected Unix
socket's kernel peer numbers. Those numbers alone establish neither a client's
authorization nor its process lifetime or revocation state. Building these
artifacts does not activate a URL run.

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

## Change checklist: brief, draft schema, renderer

Before a change to `src/brief.ts` (or `BRIEF_VERSION`), `src/draft-schema.ts` or `src/render.ts` is merged:

- [ ] The pull request reports the comprehension regression's reader share before and after, overall and per question kind, on at
      least one stored run rendered again or one new run. Commands: `docs/evidence/pursuit-2026-11-21b/pilot/README.md`.
- [ ] A drop of more than five points (0.05 of share), overall or in any kind, is explained in the change or repaired.
- [ ] No result is called a regression on one run: five points is inside this instrument's noise on one repository (the same
      answers regraded moved a kind's share by up to 8 points), so a drop is confirmed on two runs or under a second key first.
      No result is reported as a win.
- [ ] No question or required fact of the regression key is in the brief, a packet or an agent text: `src/regression-hold-out.test.ts`
      (unit; the 24 question texts and 81 required facts, by any eight consecutive words) and the rendered-brief case in
      `src/brief.test.ts` (integration; the question texts only) pass. The key itself is a tracked file of this repository, so it
      sits in the checkout an operator session starts from: never hand an authoring session this checkout.

The rule and its reasons are in `CONTRIBUTING.md` ("Changing the dossier brief, draft schema or renderer"). It is review
practice adopted by agents (`.syzygy/governance/decisions/AGENT-ADOPTIONS.md`). The reporting rule gates no merge; the hold-out
test and the seven checks fail CI like any other check.

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
