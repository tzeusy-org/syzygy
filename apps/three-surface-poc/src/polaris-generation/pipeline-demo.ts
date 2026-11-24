import {
  admitSourcePopulation, admittedSources, digestCanonicalJson, runGenerationPipeline,
  stageSchema, validateStage, reviewVerdict,
  type PipelinePorts, type PipelineRequest,
} from '@syzygy/polaris-generation-core';
import { syntheticGenerationSource } from './synthetic-source.js';

/** Explicit synthetic provider fixture. This demonstrates orchestration and
 * rendering, never LLM quality, real source admission or production durability.
 */
interface SyntheticProject {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly mechanism: string;
  readonly qualification: string;
  readonly components: readonly [string, string];
}

export const syntheticProjects: readonly SyntheticProject[] = [
  {
    id: 'garden', title: 'A garden that asks for less remembering',
    purpose: 'Garden Notes helps a household remember the recurring care that keeps its plants healthy.',
    mechanism: 'Care observations feed a seasonal plan. The plan turns those observations into the next useful gardening task.',
    qualification: 'The household decides what to plant and when to act. A care plan offers guidance; it cannot observe a plant that nobody has checked.',
    components: ['Care observations', 'Seasonal plan'],
  },
  {
    id: 'archive', title: 'An archive worth finding again',
    purpose: 'Field Archive helps researchers recover the context behind their collected field observations.',
    mechanism: 'Field notes feed a subject index. The index connects related observations so a researcher can return to the original account.',
    qualification: 'An index can connect accounts, but it cannot settle disagreements between them. Conflicting observations remain visible.',
    components: ['Field notes', 'Subject index'],
  },
];

/** `budget` overrides parts of the fixture budget, e.g. to stop a run mid-way. */
export async function runSyntheticProject(project: SyntheticProject, budget: Partial<PipelineRequest['budget']> = {}) {
  // Admitted-input front door (packages/polaris-generation-core/src/admitted-input.ts,
  // N8 slice 3): this synthetic demo selects all three fixture sources and
  // excludes none, so the population's `selected` projection is exactly the
  // flat array this call site always built -- same objects, same order.
  const population = admitSourcePopulation([
    { sourceId: 'purpose', text: project.purpose },
    { sourceId: 'mechanism', text: project.mechanism },
    { sourceId: 'qualification', text: project.qualification },
  ]);
  const selected = admittedSources(population);
  const inventory = { entries: selected.map((source, i) => ({ id: `entry-${i}`, sourceIds: [source.sourceId], statement: source.text, kind: i === 0 ? 'purpose' : i === 1 ? 'capability' : 'qualification', disposition: { kind: 'produced', assetIds: ['opening', 'mechanism-text', 'qualification-text'].slice(i, i + 1) } })) };
  const plan = { sections: [
    { id: 'how', title: 'How the pieces connect', reason: 'Explain the central relationship.', sourceIds: ['mechanism'], disposition: { kind: 'produced', assetIds: ['how'] } },
    { id: 'judgment', title: 'Where judgment stays', reason: 'Keep the material limit visible.', sourceIds: ['qualification'], disposition: { kind: 'produced', assetIds: ['judgment'] } },
  ] };
  // Tree form: the section opens with the mechanism's first sentence as its
  // answer; any further sentences nest beneath it as child blocks.
  const [answer, ...details] = project.mechanism.split(/(?<=\.)\s+/u);
  const mechanismChildren = details.map((text, i) => ({ id: `mechanism-detail-${i}`, text, sourceIds: ['mechanism'] }));
  const draft = {
    title: project.title,
    introduction: { id: 'opening', text: project.purpose, sourceIds: ['purpose'] },
    sections: [
      { id: 'how', title: 'How the pieces connect', paragraphs: [{ id: 'mechanism-text', text: answer!, sourceIds: ['mechanism'], children: mechanismChildren }], disposition: { kind: 'produced', assetIds: ['how'] } },
      { id: 'judgment', title: 'Where judgment stays', paragraphs: [{ id: 'qualification-text', text: project.qualification, sourceIds: ['qualification'], children: [] }], disposition: { kind: 'produced', assetIds: ['judgment'] } },
    ],
    diagrams: [{ id: 'architecture', title: 'From observation to useful context', sectionId: 'how', kind: 'flow', relationship: `${project.components[0]} feed ${project.components[1].toLowerCase()}`,
      nodes: [{ id: 'left', label: project.components[0], sourceIds: ['mechanism'], epistemic: 'observed' }, { id: 'right', label: project.components[1], sourceIds: ['mechanism'], epistemic: 'observed' }],
      edges: [{ id: 'connection', from: 'left', to: 'right', label: 'feed', sourceIds: ['mechanism'], epistemic: 'observed' }], disposition: { kind: 'produced', assetIds: ['architecture'] },
    }],
    deepDives: [{ id: 'component-depth', title: `Inside ${project.components[1].toLowerCase()}`, sectionId: 'how', paragraphs: [{ id: 'depth-text', text: project.mechanism, sourceIds: ['mechanism'], children: [] }], disposition: { kind: 'produced', assetIds: ['component-depth'] } }],
    unresolved: [],
  };
  const review = { inventoryCoverage: inventory.entries.map(entry => ({ entryId: entry.id, disposition: 'represented', blockIds: entry.disposition.assetIds, reason: 'represented' })), blockSupport: ['opening', 'mechanism-text', ...mechanismChildren.map(child => child.id), 'qualification-text', 'left', 'right', 'connection', 'depth-text'].map(blockId => ({ blockId, verdict: 'supported', sourceIds: [blockId === 'opening' ? 'purpose' : blockId === 'qualification-text' ? 'qualification' : 'mechanism'], reason: 'supported' })), findings: [] };
  const edit = { draft, changes: review.blockSupport.map(({ blockId }) => ({ blockId, action: 'kept',
    reason: 'The scripted edit retains this block.', newBlockIds: [] })) };
  const responses = { inventory, plan, author: draft, edit, fidelity: review, repair: { ...edit, findingDispositions: [] } };
  const admitted = new Set<number>();
  const records: unknown[] = [];
  const snapshotDigest = digestCanonicalJson(selected, { maxBytes: 100_000, maxNodes: 1000, maxDepth: 10 }).digest;
  const sources = selected.map(source => syntheticGenerationSource(project.id, snapshotDigest, source.sourceId, source.text));
  const request: PipelineRequest = {
    requestId: `synthetic-${project.id}-${snapshotDigest}`, projectId: project.id, snapshotId: snapshotDigest,
    routes: { inventory: 'synthetic-fixture', plan: 'synthetic-fixture', author: 'synthetic-fixture', edit: 'synthetic-fixture', fidelity: 'synthetic-fixture', repair: 'synthetic-fixture' },
    startedAt: Date.now(),
    sources, readerQuestions: [{ id: 'why', topics: [], text: 'Why does it exist?' }, { id: 'connect', topics: [], text: 'How do the main pieces connect?' }, { id: 'judgment', topics: [], text: 'What remains a human judgment?' }],
    requestedAssets: [
      { id: 'how', kind: 'section', required: true },
      { id: 'architecture', kind: 'diagram', required: true },
      { id: 'component-depth', kind: 'deep-dive', required: false },
    ],
    budget: { maxCalls: 7, maxInputBytes: 500_000, maxOutputBytes: 100_000, maxUsageUnits: 100, maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'synthetic-unit-v1', ...budget },
  };
  const ports: PipelinePorts = {
    now: () => Date.now(), verifySources: async () => true,
    permissionIdentity: async () => 'synthetic-permission-v1',
    admit: async input => {
      if (admitted.has(input.ordinal)) return { kind: 'refused', reason: 'in-flight' };
      admitted.add(input.ordinal);
      return { kind: 'reserved', permit: { attemptId: `${request.requestId}:${input.ordinal}`, maxUsageUnits: 5, maxOutputBytes: 10_000 } };
    },
    permitted: async () => true, releaseUnsent: async () => undefined,
    responseSchema: stageSchema, validate: validateStage, fidelity: reviewVerdict,
    generate: async input => ({ body: JSON.stringify(responses[input.stage]), model: 'synthetic-scripted-response-v1', usageUnits: 1 }),
    record: async (permit, outcome) => { records.push({ attemptId: permit.attemptId, outcome }); },
    lateReceipt: async (permit, receipt) => { records.push({ attemptId: permit.attemptId, lateReceipt: receipt }); },
  };
  const result = await runGenerationPipeline(request, ports, new AbortController().signal);
  return { sources, result, records, requestedAssets: request.requestedAssets };
}
