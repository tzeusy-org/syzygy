import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { generationAnchorId, generationSourcesForBody, gitBlobObjectId, runGenerationPipeline, stageSchema, validateGenerationSources,
  validateStage, reviewVerdict, type GenerationSource, type PipelineRequest, type PipelineResult, type ProviderDraft } from '@syzygy/polaris-generation-core';
import { sha256 } from '@syzygy/support';

import { readGitBlobsBatch, type ReadGitBlobs } from '../git-blob-batch.js';
import { createDurableScriptedLifecycle } from './durable-lifecycle.js';
import { renderDraftPreview } from './draft-preview.js';

const roots = ['.syzygy/governance/doctrine', '.syzygy/governance/decisions', '.syzygy/governance/contracts/rfcs'] as const;
const profile = 'syzygy-self-governance-markdown-v1';
const git = (repoRoot: string, args: readonly string[]): Buffer => execFileSync('git', ['-C', repoRoot, ...args], { maxBuffer: 12_000_000 });

function inProfile(path: string): boolean {
  return /^\.syzygy\/governance\/doctrine\/[^/]+\.md$/u.test(path)
    || /^\.syzygy\/governance\/decisions\/.+\.md$/u.test(path)
    || /^\.syzygy\/governance\/contracts\/rfcs\/RFC-[^/]+\/[^/]+\.md$/u.test(path);
}

interface SelfCorpus {
  readonly profile: typeof profile;
  readonly revision: string;
  readonly sources: readonly GenerationSource[];
  readonly count: { readonly trackedUnderRoots: number; readonly markdownUnderRoots: number; readonly selected: number; readonly excludedMarkdown: number };
  readonly excludedPaths: readonly string[];
  readonly rawBytes: number;
  readonly characters: number;
  readonly largestCharacters: number;
  readonly over100000Characters: number;
  readonly identityDigest: string;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Only the named blobs at the pinned commit are read: never the working
 * tree, untracked files, another project, or a provider. */
export function readSelfCorpus(repoRoot: string, revision: string, readBlobs: ReadGitBlobs = readGitBlobsBatch): SelfCorpus {
  if (!/^[0-9a-f]{40}$/u.test(revision) || git(repoRoot, ['cat-file', '-t', revision]).toString('utf8').trim() !== 'commit') throw new Error('invalid-pinned-commit');
  const listing = git(repoRoot, ['ls-tree', '-r', '-z', '--full-tree', revision, '--', ...roots]);
  const records = listing.toString('utf8').split('\0').filter(Boolean).map(row => {
    const match = /^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\t(.+)$/u.exec(row);
    if (!match) throw new Error('invalid-git-tree-record');
    return { mode: match[1]!, type: match[2]!, objectId: match[3]!, path: match[4]! };
  });
  const markdown = records.filter(record => record.path.endsWith('.md'));
  const selected = markdown.filter(record => inProfile(record.path)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const excludedPaths = markdown.filter(record => !inProfile(record.path)).map(record => record.path).sort();
  let rawBytes = 0, characters = 0, largestCharacters = 0, over100000Characters = 0;
  // One batched read of exactly the selected blobs (syzygy-svoj); a missing
  // or non-blob answer fails the read of that record, as a single read did.
  const blobs = readBlobs(repoRoot, selected.filter(record => record.type === 'blob').map(record => record.objectId));
  const sources = selected.flatMap(record => {
    if (record.type !== 'blob') throw new Error('self-corpus-nonblob');
    const bytes = blobs.get(record.objectId);
    if (!(bytes instanceof Uint8Array)) throw bytes ?? new Error('self-corpus-blob-unread');
    const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (gitBlobObjectId(body) !== record.objectId) throw new Error('self-corpus-object-mismatch');
    rawBytes += bytes.length;
    characters += [...body].length;
    largestCharacters = Math.max(largestCharacters, [...body].length);
    if ([...body].length > 100_000) over100000Characters++;
    return generationSourcesForBody({ repositoryId: 'project:syzygy', revision, path: record.path, objectId: record.objectId,
      sourceId: `s-${sha256(record.path).slice(0, 24)}`, evaluationId: `self:${revision}`, body });
  });
  validateGenerationSources(sources);
  return { profile, revision, sources, count: { trackedUnderRoots: records.length, markdownUnderRoots: markdown.length,
    selected: selected.length, excludedMarkdown: excludedPaths.length }, excludedPaths, rawBytes, characters,
    largestCharacters, over100000Characters, identityDigest: sha256(sources.map(source => `${source.path}\0${source.objectId}`).join('\n')) };
}

type ScriptedStage = 'inventory' | 'plan' | 'author' | 'edit' | 'fidelity' | 'repair';

/** This responder derives every record from the envelope it actually gets.
 * It is an interface exercise, never an LLM or a fidelity judgment. */
function scriptedResponse(stage: ScriptedStage, encoded: string): unknown {
  const inputs = (JSON.parse(encoded) as { inputs: Record<string, unknown> }).inputs;
  const sources = inputs.sources as { sourceId: string; text?: string; anchorId?: string }[];
  const excerpt = (text: string): string => text.split(/\r?\n/u).map(line => line.trim()).find(line => line.length > 12)?.slice(0, 180) ?? text.slice(0, 180);
  if (stage === 'inventory') return { entries: sources.map((source, i) => ({ id: `entry-${i}`, sourceIds: [source.sourceId],
    statement: excerpt(source.text ?? ''), kind: 'other', disposition: i < 2
      ? { kind: 'produced', assetIds: [i === 0 ? 'intro' : 'account-paragraph'] }
      : { kind: 'omitted', reason: 'Scripted scope limit; real source fidelity unproven.', references: [source.sourceId] } })) };
  if (stage === 'plan') {
    const entries = (inputs.inventory as { entries: { sourceIds: string[] }[] }).entries;
    return { sections: [{ id: 'account', title: 'A bounded account', reason: 'Exercise a supported reading path.',
      sourceIds: [entries[0]!.sourceIds[0]!, entries[1]!.sourceIds[0]!], disposition: { kind: 'produced', assetIds: ['account'] } }] };
  }
  if (stage === 'author') {
    const first = sources[0]!, second = sources[1]!;
    return { title: 'Synthetic Syzygy corpus exercise', introduction: { id: 'intro', text: excerpt(first.text ?? ''), sourceIds: [first.sourceId] },
      sections: [{ id: 'account', title: 'A bounded account', paragraphs: [{ id: 'account-paragraph', text: excerpt(second.text ?? ''), sourceIds: [second.sourceId], children: [] }],
        disposition: { kind: 'produced', assetIds: ['account'] } }], diagrams: [], deepDives: [], unresolved: [] };
  }
  if (stage === 'edit' || stage === 'repair') return inputs.draft;
  if (Object.hasOwn(inputs, 'plan')) throw new Error('fidelity-plan-leak');
  const inventory = inputs.inventory as { entries: { id: string; sourceIds: string[] }[] };
  const draft = inputs.draft as ProviderDraft;
  return { inventoryCoverage: inventory.entries.map((entry, i) => ({ entryId: entry.id,
    disposition: i < 2 ? 'represented' : 'justified-omission',
    blockIds: i < 2 ? [i === 0 ? 'intro' : 'account-paragraph'] : [],
    reason: i < 2 ? 'Scripted reference match only.' : 'Scripted omission; real quality unproven.' })),
    blockSupport: [draft.introduction, ...draft.sections.flatMap(section => section.paragraphs.flatMap(block => [block, ...block.children]))].map(block => ({
      blockId: block.id, verdict: 'supported', sourceIds: block.sourceIds, reason: 'Scripted reference match only.' })), findings: [] };
}

interface SelfCorpusRun {
  readonly status: PipelineResult['status'];
  readonly reason?: string;
  readonly stageInputs: readonly { readonly stage: string; readonly inputBytes: number; readonly route: string }[];
  readonly scriptedCalls: number;
  readonly realProviderCalls: 0;
  readonly networkCalls: 0;
  readonly draft?: ProviderDraft;
  readonly preview?: string;
}

async function runScripted(corpus: SelfCorpus, maxInputBytes: number): Promise<SelfCorpusRun> {
  const stateDir = mkdtempSync(join(tmpdir(), 'syzygy-self-corpus-run-'));
  const inputs: { stage: string; inputBytes: number; route: string }[] = [];
  let scriptedCalls = 0;
  try {
    const request: PipelineRequest = {
      requestId: `self-${corpus.identityDigest}`, projectId: 'project:syzygy', snapshotId: corpus.identityDigest,
      routes: { inventory: 'scripted-inventory', plan: 'scripted-plan', author: 'scripted-author', edit: 'scripted-edit', fidelity: 'scripted-independent-review', repair: 'scripted-repair' },
      startedAt: Date.now(), sources: corpus.sources, readerQuestions: [{ id: 'purpose', topics: [], text: 'What purpose is supported?' }, { id: 'boundaries', topics: [], text: 'Which boundaries remain?' }],
      requestedAssets: [{ id: 'account', kind: 'section', required: true }],
      budget: { maxCalls: 7, maxInputBytes, maxOutputBytes: 1_000_000, maxUsageUnits: 100, maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'scripted-units-v1' },
    };
    const ports = createDurableScriptedLifecycle({ stateDir, permissionIdentity: async () => 'self-tree-zero-egress-v1',
      verifySources: async () => true, permitted: async () => true, responseSchema: stageSchema,
      validate: validateStage, fidelity: reviewVerdict, maxAttemptOutputBytes: 100_000,
      scriptedGenerate: async input => { scriptedCalls++; return { body: JSON.stringify(scriptedResponse(input.stage, input.input)), model: 'scripted-self-corpus-v1', usageUnits: 1 }; } });
    const admit = ports.admit;
    const result = await runGenerationPipeline(request, { ...ports, admit: async input => { inputs.push({ stage: input.stage, inputBytes: input.inputBytes, route: input.providerRoute }); return admit(input); } }, new AbortController().signal);
    return { status: result.status, ...(result.status === 'stopped' ? { reason: result.reason } : {}), stageInputs: inputs,
      scriptedCalls, realProviderCalls: 0, networkCalls: 0,
      ...(result.status === 'awaiting-rendered-review' ? { draft: result.draft as ProviderDraft,
        preview: renderDraftPreview(result.draft as ProviderDraft, corpus.sources) } : {}) };
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
}

/** The perturbation is synthetic in memory, never a claimed Git commit. */
function perturbed(corpus: SelfCorpus): SelfCorpus {
  // A piece of an oversize blob cannot be re-hashed alone: perturb a whole source.
  const at = corpus.sources.findIndex(source => source.segment === undefined && source.body !== undefined);
  if (at < 0) throw new Error('no-whole-source-to-perturb');
  const first = corpus.sources[at]!;
  const body = `Synthetic successor qualification.\n${first.body!}`;
  const revision = 'f'.repeat(40);
  const base = { repositoryId: first.repositoryId, revision, path: first.path, objectId: gitBlobObjectId(body) };
  const next: GenerationSource = { ...first, ...base, evaluationId: `synthetic-successor:${revision}`, body,
    spans: [{ anchorId: generationAnchorId(base, 0, Buffer.byteLength(body)), start: 0, end: Buffer.byteLength(body), text: body }] };
  const sources = corpus.sources.map((source, i) => i === at ? next : source);
  validateGenerationSources(sources);
  return { ...corpus, sources, identityDigest: sha256(sources.map(source => `${source.path}\0${source.objectId}`).join('\n')) };
}

export async function proveSelfCorpus(repoRoot: string, revision: string) {
  const corpus = readSelfCorpus(repoRoot, revision);
  const exhausted = await runScripted(corpus, 1_000_000);
  const sufficient = await runScripted(corpus, 2_000_000);
  const successor = await runScripted(perturbed(corpus), 2_000_000);
  if (exhausted.status !== 'stopped' || exhausted.reason !== 'budget-exhausted' || exhausted.scriptedCalls !== 0) throw new Error('budget-probe-failed');
  if (sufficient.status !== 'awaiting-rendered-review' || successor.status !== 'awaiting-rendered-review') {
    throw new Error(`scripted-proof-incomplete:${sufficient.reason ?? sufficient.status}:${sufficient.stageInputs.map(item => item.stage).join(',')}:${successor.reason ?? successor.status}:${successor.stageInputs.map(item => item.stage).join(',')}`);
  }
  const first = sufficient.draft!, changed = successor.draft!;
  const citationHrefs = (html: string): readonly string[] => [...html.matchAll(/class="sources">\s*<a href="([^"]+)"/gu)].map(match => match[1]!);
  const beforeHrefs = citationHrefs(sufficient.preview!), afterHrefs = citationHrefs(successor.preview!);
  if (beforeHrefs.length !== 2 || afterHrefs.length !== 2 || beforeHrefs[0] === afterHrefs[0] || beforeHrefs[1] !== afterHrefs[1]
    || first.introduction.text === changed.introduction.text || first.sections[0]!.paragraphs[0]!.text !== changed.sections[0]!.paragraphs[0]!.text) throw new Error('perturbation-not-local');
  return { kind: 'synthetic-self-corpus-proof', corpus: { profile: corpus.profile, revision, count: corpus.count,
    excludedPaths: corpus.excludedPaths, rawBytes: corpus.rawBytes, characters: corpus.characters,
    largestCharacters: corpus.largestCharacters, over100000Characters: corpus.over100000Characters,
    identityDigest: corpus.identityDigest },
    budgetExhausted: { status: exhausted.status, reason: exhausted.reason, stageInputs: exhausted.stageInputs, scriptedCalls: exhausted.scriptedCalls },
    sufficient: { status: sufficient.status, stageInputs: sufficient.stageInputs, scriptedCalls: sufficient.scriptedCalls },
    perturbation: { kind: 'synthetic-in-memory-successor', changedSourcePath: corpus.sources[0]!.path,
      changedBlockIds: ['intro'], unchangedBlockIds: ['account-paragraph'], changedCitationCount: 1, unchangedCitationCount: 1,
      stageInputs: successor.stageInputs, scriptedCalls: successor.scriptedCalls },
    realProviderCalls: 0, networkCalls: 0, realProjectProof: false,
    unmetReq014: ['two separately admitted real projects', 'actual model generation', 'real changed-source regeneration', 'independent full-source fidelity', 'cold-reader comprehension and visual judgment'] };
}
