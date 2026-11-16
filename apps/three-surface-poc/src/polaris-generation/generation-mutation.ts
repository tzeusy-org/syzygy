// polaris-generation-core mutation plan — pure source transformations for the
// bead syzygy-u05.11 slice-2 mutation gate (rule 6: mutate the input and
// confirm the check fails, per predicate, before trusting it).
//
// One mutation shape is used here (`literal`, following the `LiteralMutation`
// shape already established by `apps/three-surface-poc/src/pwb-mutation.ts`):
// a named, hand-listed replacement of one exact source fragment that disables
// a single fail-closed invariant. Every fragment is checked at plan time to
// occur exactly once in its file, so the mutation is unambiguous.
//
// This module never touches the filesystem; the runner
// (`generation-mutation-run-main.ts`) reads, mutates, tests and restores.
// Every mutation targets `packages/polaris-generation-core/src/**`, never
// `apps/three-surface-poc/src/model.ts`, `polaris.ts` or `routes.ts`.

export interface LiteralMutation {
  readonly kind: 'literal';
  readonly id: string;
  readonly file: string;
  readonly description: string;
  readonly from: string;
  readonly to: string;
  // Substrings of test titles (as the plan test reads them; the runner
  // matches them against full names) that MUST be among the failures.
  readonly mustFail: readonly string[];
}

const CANONICAL_JSON_SOURCE = 'packages/polaris-generation-core/src/canonical-json.ts';
const PARSE_JSON_SOURCE = 'packages/polaris-generation-core/src/parse-json.ts';
const PIPELINE_SOURCE = 'packages/polaris-generation-core/src/pipeline.ts';
const PROVIDER_DRAFT_SOURCE = 'packages/polaris-generation-core/src/provider-draft.ts';
const DRAFT_MODEL_SOURCE = 'packages/polaris-generation-core/src/draft-model.ts';

export function applyLiteralMutation(source: string, mutation: LiteralMutation): string {
  const occurrences = source.split(mutation.from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${mutation.id}: expected exactly one occurrence of the fragment, found ${occurrences}`);
  }
  return source.replace(mutation.from, mutation.to);
}

// Hand-listed semantic mutations, grouped by the file they target, each
// disabling one fail-closed guard the existing test suites already exercise.
export const GENERATION_LITERAL_MUTATIONS: readonly LiteralMutation[] = [
  // canonical-json.ts
  {
    kind: 'literal',
    id: 'canonical-json-sorted-keys-disabled',
    file: CANONICAL_JSON_SOURCE,
    description: 'object keys are encoded in insertion order instead of sorted, breaking canonical-form equality',
    from: 'const sorted = (keys as string[]).sort();',
    to: 'const sorted = (keys as string[]);',
    mustFail: ['binds sorted object keys but preserves list order, Unicode and primitive spelling'],
  },
  {
    kind: 'literal',
    id: 'canonical-json-cycle-check-disabled',
    file: CANONICAL_JSON_SOURCE,
    description: 'the cyclic-reference guard is disabled, so a self-referential structure recurses instead of being rejected',
    from: "if (ancestors.has(object)) reject('cycle');",
    to: "if (false) reject('cycle');",
    mustFail: ['accepts shared data but rejects cyclic data'],
  },
  {
    kind: 'literal',
    id: 'canonical-json-proxy-check-disabled',
    file: CANONICAL_JSON_SOURCE,
    description: 'the Proxy guard is disabled, so a Proxy is encoded and its traps run instead of being rejected untouched',
    from: "if (types.isProxy(object)) reject('unsupported-object');",
    to: "if (false) reject('unsupported-object');",
    mustFail: ['refuses custom objects, accessors and proxies without running their hooks'],
  },
  // parse-json.ts
  {
    kind: 'literal',
    id: 'parse-json-duplicate-key-check-disabled',
    file: PARSE_JSON_SOURCE,
    description: 'a duplicate decoded object key silently overwrites the first instead of being rejected',
    from: "if (Object.hasOwn(object, key)) reject('duplicate-key');",
    to: "if (false) reject('duplicate-key');",
    mustFail: ['rejects duplicate decoded keys'],
  },
  {
    kind: 'literal',
    id: 'parse-json-pollution-key-check-disabled',
    file: PARSE_JSON_SOURCE,
    description: 'a prototype-pollution key (`__proto__`/`prototype`/`constructor`) is admitted instead of rejected',
    from: "if (['__proto__', 'prototype', 'constructor'].includes(key)) reject('unsupported-property');",
    to: "if (false) reject('unsupported-property');",
    mustFail: ['rejects pollution keys'],
  },
  {
    kind: 'literal',
    id: 'parse-json-byte-limit-check-disabled',
    file: PARSE_JSON_SOURCE,
    description: 'the input byte-limit precheck is disabled, so an oversized input is parsed instead of refused up front',
    from: "if (text.length > limits.maxBytes || Buffer.byteLength(text, 'utf8') > limits.maxBytes) reject('byte-limit');",
    to: "if (false) reject('byte-limit');",
    mustFail: ['counts exact UTF-8 input bytes including whitespace and escape spelling'],
  },
  // pipeline.ts
  {
    kind: 'literal',
    id: 'pipeline-max-calls-disabled',
    file: PIPELINE_SOURCE,
    description: 'the per-request call budget is never enforced, so a run keeps dispatching stages past maxCalls',
    from: "if (calls >= budget.maxCalls) stop('budget-exhausted');",
    to: "if (false) stop('budget-exhausted');",
    mustFail: ['stops when calls or repairs are exhausted and when usage is unknown'],
  },
  {
    kind: 'literal',
    id: 'pipeline-repair-cycle-cap-disabled',
    file: PIPELINE_SOURCE,
    description: 'the repair-cycle cap is never enforced, so a persistently blocking review repairs forever instead of stopping',
    from: "if (repairs >= budget.maxRepairCycles) {\n        if (verdict.reviewerBlocking) stop('repair-exhausted');",
    to: "if (false) {\n        if (verdict.reviewerBlocking) stop('repair-exhausted');",
    mustFail: ['stops when calls or repairs are exhausted and when usage is unknown'],
  },
  {
    kind: 'literal',
    id: 'pipeline-late-receipt-suppressed',
    file: PIPELINE_SOURCE,
    description: 'an interrupted dispatch never resolves its late usage receipt, leaking an unreconciled reservation',
    from: "if (interrupted) void pending.then(r => ports.lateReceipt(permit, { model: r.model, usageUnits: r.usageUnits }), () => undefined).catch(() => undefined);",
    to: "if (false) void pending.then(r => ports.lateReceipt(permit, { model: r.model, usageUnits: r.usageUnits }), () => undefined).catch(() => undefined);",
    mustFail: ['retains late usage capture even when recording the interruption fails'],
  },
  // provider-draft.ts. Its `unique()` handle check moved verbatim to
  // draft-model.ts in 69995614 and provider-draft.ts still calls it, so the
  // first mutant keeps its id and must-fail tests and targets the new home.
  {
    kind: 'literal',
    id: 'provider-draft-duplicate-handle-check-disabled',
    file: DRAFT_MODEL_SOURCE,
    description: 'a duplicate local handle (inventory entry id, draft block id, …) is accepted instead of rejected',
    from: "if (set.size !== values.length) throw new Error('duplicate-handle');",
    to: "if (false) throw new Error('duplicate-handle');",
    mustFail: [
      'refuses missing admitted sources, unknown support and duplicate local identities',
      'refuses dangling diagram endpoints, deep-dive parents and duplicate draft handles',
    ],
  },
  {
    kind: 'literal',
    id: 'provider-draft-unknown-source-check-disabled',
    file: PROVIDER_DRAFT_SOURCE,
    description: 'a sourceIds reference to an unadmitted source id is accepted instead of rejected',
    from: "if (Array.isArray(record.sourceIds) && record.sourceIds.some(id => !sources.has(id))) throw new Error('unknown-source');",
    to: "if (false) throw new Error('unknown-source');",
    mustFail: ['refuses missing admitted sources, unknown support and duplicate local identities'],
  },
  {
    kind: 'literal',
    id: 'provider-draft-unknown-finding-target-check-disabled',
    file: PROVIDER_DRAFT_SOURCE,
    description: 'a fidelity finding whose target names no source, block or inventory entry is accepted instead of rejected',
    from: "if (data.findings.some((finding) => !targets.has(finding.target))) throw new Error('unknown-finding-target');",
    to: "if (false) throw new Error('unknown-finding-target');",
    mustFail: ['requires declared review coverage of inventory and every claim-bearing block'],
  },
];
