// The PWB pipeline's shared leaf vocabulary: the Git runner every stage
// reads through and the registry's resource envelope with its breach shape.
//
// It imports nothing, so the observer, the exact object reader, the
// resource ledger, the classifier and the extractor can all name these
// without importing one another (the type-only cycle through
// `project-shape-observation.ts` is gone, syzygy-bpyt.6.5).

// Runs one git command against the configured repository's object database
// and returns raw stdout bytes; throws when git fails. Every tree listing a
// PWB stage takes through it is `ls-tree -r -z -l`. Injected in every test;
// `gitRunnerFor` (project-shape-observation.ts) is the production binding.
export type GitRunner = (args: readonly string[]) => Uint8Array;

// The 2026-09-05 registry entry's deterministic envelope: every limit is a
// count of bytes, sources, depth, parse passes or encoded response bytes —
// wall-clock time is not an input. Its values, `PWB_RESOURCE_LIMITS`, stay
// in `project-shape-observation.ts` with the other registry-bound copies,
// where the amendment builders read them. `maxTotalBytes` is one cumulative ledger
// across phase A and phase B (each path+object body counted once); the two
// response ceilings apply to the final encoded HTTP bodies.
export interface PwbResourceLimits {
  readonly maxSources: number;
  readonly maxBytesPerSource: number;
  readonly maxTotalBytes: number;
  readonly maxIndexDepth: number;
  readonly maxParsePassesPerSource: number;
  readonly maxHumanResponseBytes: number;
  readonly maxMachineResponseBytes: number;
}

export interface ResourceLimitBreach {
  readonly limit: keyof PwbResourceLimits;
  readonly declared: number;
  readonly observed: number;
  // The source the breach left counted-and-Unknown, when it is one source.
  readonly path?: string;
}
