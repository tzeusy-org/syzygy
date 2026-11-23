// Test support: only the dossier reading tests import this.
import { generationAnchorId, gitBlobObjectId, type EvidenceAnchor, type GenerationSource, type LocalRenderInput } from '@syzygy/polaris-generation-core';
import type { LocalDerivedStructure, LocalManifestFact, LocalManifestRecognizerEntry } from '@syzygy/polaris-generation-core/live';

const REVISION = 'c'.repeat(40);
const anchor = (source: GenerationSource): EvidenceAnchor => ({ targetClass: 'evidence-artifact-identifier-with-integrity-digest',
  identifier: source.objectId!, algorithm: 'sha1', fragment: null, targetState: REVISION, pathLabel: source.path });
const claim = (text: string) => ({ marking: 'inferred' as const, unknownReason: null, basis: 'fixture', executions: [], segments: [{ kind: 'prose' as const, text }] });
const term = (name: string, text: string) => ({ id: `glossary/${name}`, marking: 'inferred' as const, unknownReason: null, title: name, text, details: [], sourceIds: [] });

const BODY = 'The event loop reads each replica.\n';
const BASE = { repositoryId: 'synthetic:reading', revision: REVISION, path: 'docs/reading.md', objectId: gitBlobObjectId(BODY) };
export const READING_SOURCE: GenerationSource = { ...BASE, sourceId: 'src-0123456789abcdef01234567', evaluationId: 'synthetic-evaluation:reading',
  classificationBasis: 'body', exclusion: { excluded: false }, body: BODY,
  spans: [{ anchorId: generationAnchorId(BASE, 0, Buffer.byteLength(BODY)), start: 0, end: Buffer.byteLength(BODY), text: BODY }] };
export const READING_QUOTE = 'The event loop reads each replica.';

const section = (id: string, title: string, paragraphs: readonly unknown[]) => ({ id, title, disposition: { kind: 'produced', assetIds: [] }, paragraphs });

/** An operator-agent dossier: one section per glossary behaviour, a long-chain diagram with long edge labels, an open question and a run
 * page. Each section's expected links are literal in the tests, so no section may share a term's first use with another's purpose. */
export function readingInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const source = READING_SOURCE;
  const paragraph = (id: string) => ({ id, text: 'x', sourceIds: [source.sourceId], children: [] });
  const chain = ['a', 'b', 'c', 'd', 'e'];
  const proseBlocks: Record<string, string> = {
    introduction: 'intro',
    // First uses in a hyphen-free form and a repeat of an earlier term; a second use links nothing.
    forms: 'Each replica copies the event loop, and each replica reads it.',
    // A new section links again: plural, capitalised and upper-case forms.
    plural: 'Replicas read the AOF. Several event-loops run.',
    // Regex characters and an entity in a term, which match as written.
    literal: 'Written in C++ at R&D.',
    // Only near-matches: inline code, longer words and a file name.
    near: 'Only `replica` as code, then subreplica, replicated and replica.conf.',
    // A term marked Unknown never links, and a non-normative block carries no entry.
    unknown: 'The mystery stays plain.',
    aside: 'A replica in an aside.',
    // A collapsed first use does not use up the visible one that follows it.
    hidden: 'Hidden replica.',
    shown: 'Visible replica.',
    // A term late in a long line, whose entry must still stay on the page.
    late: 'A long sentence of plain words runs along so that the replica.',
    // A table links no term.
    cell: 'A replica in a cell.',
  };
  const paragraphs = (...ids: string[]) => ids.map(paragraph);
  const blocks = new Map<string, unknown>(Object.entries(proseBlocks).map(([id, text]) => [id, claim(text)]));
  blocks.set('aside', { ...claim(proseBlocks['aside']!), marking: 'non-normative' });
  // The quotation is the section's only use of two terms.
  blocks.set('quoted', { marking: 'inferred', unknownReason: null, basis: 'fixture', executions: [], segments: [
    { kind: 'quotation', sourceId: source.sourceId, start: 0, end: Buffer.byteLength(READING_QUOTE), text: READING_QUOTE, anchor: anchor(source) },
  ] });
  return {
    sources: [source],
    local: {
      // The lines the introduction cites, as the render adapter records them: its citation mark shows them on focus and hover.
      citationLines: new Map([['introduction', new Map([[source.sourceId, 'lines 1\u20133']])]]),
      draft: {
        title: 'Reading dossier', introduction: { id: 'introduction', text: 'intro', sourceIds: [source.sourceId] },
        sections: [
          section('one', 'One', paragraphs('forms')), section('two', 'Two', paragraphs('plural')), section('three', 'Three', paragraphs('literal')),
          section('four', 'Four', paragraphs('near')), section('five', 'Five', paragraphs('quoted')), section('six', 'Six', paragraphs('unknown', 'aside')),
          section('seven', 'Seven', [{ ...paragraph('collapse'), element: { kind: 'details', summary: 'More', elements: [paragraph('hidden')] } }, paragraph('shown')]),
          section('nine', 'Nine', paragraphs('late')),
          section('eight', 'Eight', [{ ...paragraph('grid'), element: { kind: 'table', caption: 'Grid', columns: ['Only'], rowHeaders: false, rows: [{ id: 'r', cells: [paragraph('cell')] }] } }]),
        ],
        diagrams: [{
          id: 'flow', sectionId: 'one', kind: 'flow', title: 'Flow', relationship: 'how it runs', disposition: { kind: 'produced', assetIds: [] },
          nodes: chain.map(id => ({ id, label: `Node ${id}`, epistemic: 'inferred', sourceIds: [source.sourceId] })),
          edges: chain.slice(1).map((id, i) => ({ id: `edge-${id}`, from: chain[i]!, to: id, label: 'hands the parsed command onward to the next stage for processing', epistemic: 'inferred', sourceIds: [source.sourceId] })),
        }, {
          // A loop wider than three columns is stacked top to bottom, one node to a row, so it fits a column at every width (syzygy-3efd.19).
          id: 'loop', sectionId: 'two', kind: 'flow', title: 'Loop', relationship: 'how it repeats', disposition: { kind: 'produced', assetIds: [] },
          nodes: chain.map(id => ({ id: `loop-${id}`, label: `Step ${id}`, epistemic: 'inferred', sourceIds: [source.sourceId] })),
          edges: [...chain.slice(1).map((id, i) => ({ id: `loop-edge-${id}`, from: `loop-${chain[i]!}`, to: `loop-${id}`, label: 'next step', epistemic: 'inferred', sourceIds: [source.sourceId] })),
            { id: 'loop-edge-parallel', from: `loop-${chain[0]!}`, to: `loop-${chain[1]!}`, label: 'also next', epistemic: 'inferred', sourceIds: [source.sourceId] },
            { id: 'loop-back', from: 'loop-e', to: 'loop-a', label: 'starts again', epistemic: 'inferred', sourceIds: [source.sourceId] }],
        }, {
          // Two layers, left to right: the parallel edge's label cannot stay where its edge puts it, so it keeps a leader.
          id: 'pair', sectionId: 'two', kind: 'flow', title: 'Pair', relationship: 'how it hands over', disposition: { kind: 'produced', assetIds: [] },
          nodes: ['x', 'y'].map(id => ({ id: `pair-${id}`, label: `Stage ${id}`, epistemic: 'inferred', sourceIds: [source.sourceId] })),
          edges: [{ id: 'pair-edge', from: 'pair-x', to: 'pair-y', label: 'hands over', epistemic: 'inferred', sourceIds: [source.sourceId] },
            { id: 'pair-edge-parallel', from: 'pair-x', to: 'pair-y', label: 'also hands over', epistemic: 'inferred', sourceIds: [source.sourceId] }],
        }],
        deepDives: [],
        unresolved: [{ question: 'What is unanswered?', reason: 'Nothing says.', references: [source.sourceId] }],
      } as unknown as LocalRenderInput['draft'],
      withheldTitle: 'Reading dossier, withheld',
      draftLayer: { state: 'editorial-draft', ruling: 'fixture-ruling', inferenceProvenance: { modelIdentity: 'fixture-model', modelVersion: null, declaredBy: 'operator', label: 'Inferred' } },
      blocks: blocks as LocalRenderInput['blocks'],
      glossary: [term('replica', 'A server that copies another.'), term('event-loop', 'The loop that serves `clients`.'), term('aof', 'The append-only file.'), term('C++', 'A language.'), term('R&D', 'Research.'),
        { ...term('mystery', 'Unsettled.'), marking: 'unknown', unknownReason: 'missing-evidence' }],
      disclosure: [{ id: 'disclosure/fixture', text: 'How it was made.', label: null }],
      sourceAnchors: new Map([[source.sourceId, anchor(source)]]),
      pages: [{ path: 'understanding.html', title: 'Understanding', intro: 'What the agent understood.', groups: [{ id: 'purpose', heading: 'Purpose', note: 'Inferred.', empty: 'None.', items: [{ id: 'understanding/purpose', marking: 'inferred', unknownReason: null, title: 'Purpose', text: 'A purpose.', details: [], sourceIds: [source.sourceId] }] }] }],
      reviewStatus: [{ id: 'review-status/fixture', text: 'Unreviewed.', label: 'Unknown' }],
    },
  };
}

/** Figure kinds (REQ-polaris-generation-034 version 2.5, syzygy-3efd.30): the reading dossier with its graph figures replaced by a
 * sequence of three participants and four messages on section one (592 x 392) and a swimlane of three lanes and five steps on section
 * two (592 x 536). One message is to its own sender, one message and one step are Unknown, and one label is long enough to wrap. */
export function figureKindsInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = readingInput();
  const sourceIds = [READING_SOURCE.sourceId];
  const el = (id: string, label: string, epistemic = 'inferred') => ({ id, label, sourceIds, epistemic });
  const produced = { kind: 'produced', assetIds: [] };
  const draft = local.draft as unknown as Record<string, unknown>;
  return { sources, local: { ...local, draft: { ...draft, diagrams: [{
    id: 'handshake', sectionId: 'one', kind: 'sequence', title: 'Handshake', relationship: 'who asks whom', disposition: produced, nodes: [], edges: [],
    figure: { kind: 'sequence', participants: [el('client', 'Client'), el('server', 'Server'), el('store', 'Store <disk>')],
      messages: [{ ...el('m1', 'opens a connection'), from: 'client', to: 'server' }, { ...el('m2', 'reads the stored record for the key it was asked about'), from: 'server', to: 'store' },
        { ...el('m3', 'checks its cache', 'unknown'), from: 'server', to: 'server' }, { ...el('m4', 'replies'), from: 'server', to: 'client' }] },
  }, {
    id: 'release', sectionId: 'two', kind: 'swimlane', title: 'Release', relationship: 'who does each step', disposition: produced, nodes: [], edges: [],
    figure: { kind: 'swimlane', lanes: [el('dev', 'Developer'), el('ci', 'CI'), el('ops', 'Operator')],
      steps: [{ ...el('s1', 'writes the change'), lane: 'dev' }, { ...el('s2', 'opens a pull request'), lane: 'dev' }, { ...el('s3', 'runs the tests'), lane: 'ci' },
        { ...el('s4', 'tags a release', 'unknown'), lane: 'ops' }, { ...el('s5', 'watches the rollout'), lane: 'ops' }] },
  }] } as unknown as LocalRenderInput['draft'] } };
}

/** The computed map pages (REQ-polaris-generation-034 version 2.9, syzygy-3efd.70): the reading dossier with a derived structure of one
 * top-level directory and manifest facts of one package and one workflow, so `maps/directories.html`, `maps/units.html` and `maps/ci.html`
 * each draw one figure (the CI map: `test` needs `build`). */
export function computedMapsInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = readingInput();
  const revision = 'e'.repeat(40);
  const base = { rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null } as const;
  const derivedStructure: LocalDerivedStructure = {
    state: 'derived', revision, recordRevision: revision, capturedAt: '2026-11-22T08:00:00.000Z', recordText: '{}\n', sha256: 'f'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
    facts: [
      { id: '_tree-root', fact: 'tree-root', ...base, path: '.', count: 2, to: null },
      { id: '_tree-unit-1', fact: 'top-level-unit', ...base, path: 'src', count: 9, to: null },
      { id: '_tree-contains-1', fact: 'contains', ...base, path: 'src', count: null, to: '_tree-unit-1' },
    ],
    tree: { files: 11, rootFiles: 2, unitsListed: 1, unitFiles: 9, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
  };
  const WF = 'github-actions-workflow', NPM = 'npm-package-manifest';
  const recognizer = (rule: string, counts: Partial<LocalManifestRecognizerEntry> = {}): LocalManifestRecognizerEntry => ({
    rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, files: [], filesNotListed: 0, ...counts,
  });
  const fact = (k: number, kind: string, rule: string, path: string, members: Record<string, string | null>): LocalManifestFact => ({
    id: `_manifest-${k}`, fact: kind, rule, ruleVersion: 1, path, lines: [k, k], ...members, epistemic: 'inferred',
  });
  const file = (path: string, facts: number) => ({ path, epistemic: 'inferred' as const, unknownReason: null, parseFault: null, facts, valuesLeftOut: 0 });
  const ci = '.github/workflows/ci.yml';
  const manifestFacts: LocalRenderInput['manifestFacts'] = {
    format: 'polaris-dossier-manifest-facts/2', state: 'derived', screeningPolicy: { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) }, factsNotListed: 0,
    facts: [
      fact(1, 'workflow', WF, ci, { name: 'CI' }), fact(2, 'job', WF, ci, { job: 'build' }), fact(3, 'job', WF, ci, { job: 'test' }),
      fact(4, 'job-needs', WF, ci, { from: 'test', to: 'build' }), fact(5, 'package', NPM, 'src/package.json', { name: 'app' }),
    ],
    recognizers: [
      recognizer(NPM, { candidates: 1, inferred: 1, facts: 1, files: [file('src/package.json', 1)] }),
      recognizer('cargo-manifest'), recognizer('python-project-manifest'), recognizer('go-module-manifest'),
      recognizer(WF, { candidates: 1, inferred: 1, facts: 4, files: [file(ci, 4)] }),
      recognizer('compose-file'), recognizer('kubernetes-manifest'), recognizer('terraform-configuration'), recognizer('makefile'), recognizer('cmake-lists'),
    ],
    remainder: {
      files: 11, secretPathsLeftOut: 0, candidates: 2, notCandidates: 9,
      places: [{ place: null, files: 2, notCandidates: 2 }, { place: 'src', files: 9, notCandidates: 7 }],
      placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
    },
  };
  return { sources, local: { ...local, derivedStructure, manifestFacts } };
}
