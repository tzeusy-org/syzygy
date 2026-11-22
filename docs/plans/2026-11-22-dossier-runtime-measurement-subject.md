# Measurement provenance in the dossier runtime move

The runtime relocation tracked by `syzygy-qkea.19` includes the synthetic
Redis-shaped discovery measurement. Its JSON report identifies the source
modules that build or send an excerpt by repository-relative path and SHA-256.
The source path must follow the measured implementation into its new package.

## Scope delta

For new reports from `npm run poc:redis-shaped-discovery`, replace this
one key under `codeSubjects.sha256`.

| Before | After |
|---|---|
| `apps/three-surface-poc/src/polaris-generation/redis-shaped-measure.ts` | `packages/polaris-generation-runtime/src/redis-shaped-measure.ts` |

The value continues to be the SHA-256 of the bytes at the named path. Keep
the report's commit attribution and the two generation-core entries. Preserve
earlier reports with the paths and digests they recorded at their own commits.
A compatibility launcher at the old location, if required by a caller, must
still report the location of the implementation the command runs.

The exception covers this one provenance key and the digest of its actual
source bytes. The command name, arguments, measurement fields, output
formatting, refusals and exit codes retain the existing behavior. The rest of
the runtime move still follows GP-Q0's byte-preservation criteria.

## Verification in the relocation

Run the command against its synthetic fixture before and after the move.
Compare both reports with the JSON key substitution and the independently
recomputed commit and source digests recorded as the expected differences.
Check that the old and new subject paths each resolve at the commit named
by their report. Exercise stdout, file output and existing refusal cases
through the current command entry point.

This scope decision resolves `syzygy-35lq` under VIS-4. Track the code,
compatibility checks and final review on `syzygy-qkea.19`.
