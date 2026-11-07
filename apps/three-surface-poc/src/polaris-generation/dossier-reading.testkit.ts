// Test support: only the dossier reading tests import this.
import { generationAnchorId, gitBlobObjectId, type EvidenceAnchor, type GenerationSource, type LocalRenderInput } from '@syzygy/polaris-generation-core';

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
          // A loop keeps one band, so this one is wider than a column at every width.
          id: 'loop', sectionId: 'two', kind: 'flow', title: 'Loop', relationship: 'how it repeats', disposition: { kind: 'produced', assetIds: [] },
          nodes: chain.map(id => ({ id: `loop-${id}`, label: `Step ${id}`, epistemic: 'inferred', sourceIds: [source.sourceId] })),
          edges: [...chain.slice(1).map((id, i) => ({ id: `loop-edge-${id}`, from: `loop-${chain[i]!}`, to: `loop-${id}`, label: 'next step', epistemic: 'inferred', sourceIds: [source.sourceId] })),
            { id: 'loop-back', from: 'loop-e', to: 'loop-a', label: 'starts again', epistemic: 'inferred', sourceIds: [source.sourceId] }],
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
