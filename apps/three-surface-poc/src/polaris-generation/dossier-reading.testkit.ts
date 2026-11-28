// Test support: only the dossier reading tests import this.
import { generationAnchorId, gitBlobObjectId, type EvidenceAnchor, type GenerationSource, type LocalRenderInput } from '@syzygy/polaris-generation-core';
import { generationSourcesForBody, type LocalDerivedStructure, type LocalManifestFact, type LocalManifestRecognizerEntry } from '@syzygy/polaris-generation-core/live';

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
      citationLines: new Map([['introduction', new Map([[source.sourceId, [{ start: 1, end: 3 }]]])]]),
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

/** A figure walk (REQ-polaris-generation-034 version 2.40, syzygy-3efd.88) over the reading dossier's flow on section one: the five-node chain
 * `a` to `e`, its node `b` citing lines 1 to 1 of the reading source and `d` withheld, walked in three steps, `b`, `e` and `d`, each with the
 * section's one paragraph `forms`. */
export function walkInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = readingInput();
  return { sources, local: { ...local,
    citationLines: new Map([...(local.citationLines ?? new Map()), ['b', new Map([[READING_SOURCE.sourceId, [{ start: 1, end: 1 }]]])]]),
    withheldElements: new Map([['d', { sources: 1, named: [] }]]),
    walks: new Map([['flow', [{ node: 'b', block: 'forms' }, { node: 'e', block: 'forms' }, { node: 'd', block: 'forms' }]]]),
  } };
}

/** A containment (REQ-polaris-generation-034 version 2.23, syzygy-3efd.31) on the reading dossier's first section: two top-level groups, the
 * first holding two (one of them holding one more, Unknown), so its drawing is 408 px wide and three levels deep. */
export function containmentInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = readingInput();
  const sourceIds = [READING_SOURCE.sourceId];
  const g = (id: string, label: string, children: unknown[] = [], epistemic = 'inferred') => ({ id, label, sourceIds, epistemic, children });
  const draft = local.draft as unknown as Record<string, unknown>;
  return { sources, local: { ...local, draft: { ...draft, diagrams: [{
    id: 'workspace', sectionId: 'one', kind: 'containment', title: 'Workspace', relationship: 'what sits inside what', disposition: { kind: 'produced', assetIds: [] }, nodes: [], edges: [],
    figure: { kind: 'containment', groups: [g('apps', 'Applications', [g('web', 'Web front end', [g('router', 'Router', [], 'unknown')]), g('cli', 'Command line')]), g('packages', 'Packages')] },
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

/** One deep dive for a why-only Pole, another for a Pole with its own page, and the computed map routes. */
export function navigationInput(): ReturnType<typeof readingInput> {
  const { local, sources } = computedMapsInput();
  const draft = local.draft as unknown as Record<string, unknown>;
  const blocks = new Map(local.blocks);
  const deepDives = [
    { id: 'why-detail', sectionId: 'one', title: 'Purpose detail' },
    { id: 'words-detail', sectionId: 'two', title: 'Words detail' },
  ].map(dive => {
    const paragraph = `${dive.id}-paragraph`;
    blocks.set(paragraph, claim(dive.title));
    return { ...dive, paragraphs: [{ id: paragraph, text: dive.title, sourceIds: [READING_SOURCE.sourceId], children: [] }], disposition: { kind: 'produced', assetIds: [] } };
  });
  return { sources, local: {
    ...local, blocks, draft: { ...draft, deepDives } as unknown as LocalRenderInput['draft'],
    poles: { whySection: 'one', poles: [
      { label: 'Why it exists', sections: ['one'] },
      { label: 'Words', sections: ['two', 'three', 'four'] },
      { label: 'The rest', sections: ['five', 'six', 'seven', 'nine', 'eight'] },
    ] },
  } };
}

/** Pole hue as identity (syzygy-5dhm.56): the navigation dossier with a set of three cards in the why section (Pole 1, drawn on the
 * landing page), in section two (Pole 2's page) and in the deep dive on section two, a figure homed on that deep dive, and a figure
 * homed on the overview, which belongs to no Pole. */
export function poleHueInput(): ReturnType<typeof readingInput> {
  const { local, sources } = navigationInput();
  const draft = local.draft as unknown as { sections: { id: string; paragraphs: unknown[] }[]; deepDives: { id: string; paragraphs: unknown[] }[]; diagrams: unknown[] };
  const blocks = new Map(local.blocks);
  const cards = (at: string) => {
    const items = ['first', 'second', 'third'].map(n => {
      blocks.set(`${at}-card-${n}`, claim(`Card ${n} of ${at}.`));
      return { label: `${at} ${n}`, body: { id: `${at}-card-${n}`, text: 'x', sourceIds: [READING_SOURCE.sourceId], children: [] } };
    });
    blocks.set(`${at}-cards`, claim(`The cards of ${at}.`));
    return { id: `${at}-cards`, text: 'x', sourceIds: [READING_SOURCE.sourceId], children: [], element: { kind: 'cards', items } };
  };
  const figure = (id: string, sectionId: string, home: unknown) => ({
    id, sectionId, home, kind: 'flow', title: `Figure ${id}`, relationship: 'how it goes', disposition: { kind: 'produced', assetIds: [] },
    nodes: ['p', 'q'].map(n => ({ id: `${id}-${n}`, label: `Node ${n}`, epistemic: 'inferred', sourceIds: [READING_SOURCE.sourceId] })),
    edges: [{ id: `${id}-edge`, from: `${id}-p`, to: `${id}-q`, label: 'then', epistemic: 'inferred', sourceIds: [READING_SOURCE.sourceId] }],
  });
  return { sources, local: { ...local, blocks, draft: {
    ...draft,
    sections: draft.sections.map(s => s.id === 'one' || s.id === 'two' ? { ...s, paragraphs: [...s.paragraphs, cards(s.id)] } : s),
    deepDives: draft.deepDives.map(d => d.id === 'words-detail' ? { ...d, paragraphs: [...d.paragraphs, cards(d.id)] } : d),
    diagrams: [...draft.diagrams, figure('dive-figure', 'two', { kind: 'deep-dive', id: 'words-detail' }), figure('overview-figure', '', { kind: 'overview' })],
  } as unknown as LocalRenderInput['draft'] } };
}

function lineCitationFixture(body: string, introduction: readonly { start: number; end: number }[], forms: readonly { start: number; end: number }[]) {
  const input = readingInput();
  const { repositoryId, revision, evaluationId } = READING_SOURCE;
  const pieces = generationSourcesForBody({ repositoryId, revision, evaluationId, sourceId: 'src-9876543210fedcba98765432',
    objectId: gitBlobObjectId(body), path: 'docs/settings.conf', body });
  const first = pieces[0]!;
  const sourceAnchors = new Map(input.local.sourceAnchors);
  for (const piece of pieces) sourceAnchors.set(piece.sourceId, anchor(piece));
  const citationLines = new Map(input.local.citationLines);
  citationLines.set('introduction', new Map([[first.sourceId, introduction]]));
  citationLines.set('forms', new Map([[first.sourceId, forms]]));
  const draft = { ...input.local.draft,
    introduction: { ...input.local.draft.introduction, sourceIds: [first.sourceId] },
    sections: input.local.draft.sections.map(entry => ({ ...entry, paragraphs: entry.paragraphs.map(p => p.id === 'forms' ? { ...p, sourceIds: [first.sourceId] } : p) })),
  };
  return { local: { ...input.local, draft, sourceAnchors, citationLines }, sources: [...input.sources, ...pieces] };
}

/** Long plain text with distinguishable LF, CRLF, and bare CR line ends. Every line is synthetic. */
export function lineCitationInput() {
  const body = Array.from({ length: 2100 }, (_, index) => {
    const ending = index % 3 === 0 ? '\r\n' : index % 3 === 1 ? '\r' : '\n';
    return `# synthetic option ${index + 1}: local documentation${ending}`;
  }).join('');
  return lineCitationFixture(body, [{ start: 1200, end: 1202 }, { start: 1207, end: 1208 }], [{ start: 1204, end: 1205 }]);
}

/** 100 UTF-8 bytes per line, so the production source-piece boundary lies exactly after line 1000. */
export function splitLineCitationInput() {
  const body = Array.from({ length: 1200 }, (_, index) => `# synthetic setting ${index + 1}`.padEnd(99, ' ') + '\n').join('');
  return lineCitationFixture(body, [{ start: 999, end: 1002 }], [{ start: 998, end: 1004 }]);
}

/** View levels and zoom links (REQ-polaris-generation-034 version 2.50, syzygy-3efd.39) over the reading dossier: its flow on section one
 * becomes a context view about node `b`, and a deep dive `runtime` of section one draws `parts`, a container view about `b`, so `b`'s zoom
 * target is `parts` on `deep-dives/runtime.html`. With `walked`, the flow also carries the walk of `walkInput`. */
export function zoomInput(walked = false): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = walked ? walkInput() : readingInput();
  const sourceIds = [READING_SOURCE.sourceId];
  const draft = local.draft as unknown as Record<string, unknown>;
  const parts = { id: 'parts', sectionId: 'one', home: { kind: 'deep-dive', id: 'runtime' }, kind: 'boundary', title: 'Parts of <b>', relationship: 'what b is built of',
    disposition: { kind: 'produced', assetIds: [] },
    nodes: [{ id: 'p1', label: 'Part one', epistemic: 'inferred', sourceIds }, { id: 'p2', label: 'Part two', epistemic: 'inferred', sourceIds }],
    edges: [{ id: 'p-edge', from: 'p1', to: 'p2', label: 'feeds', epistemic: 'inferred', sourceIds }] };
  const dive = { id: 'runtime', title: 'Runtime', sectionId: 'one', disposition: { kind: 'produced', assetIds: [] }, paragraphs: [{ id: 'dive-p', text: 'x', sourceIds, children: [] }] };
  const blocks = new Map(local.blocks as ReadonlyMap<string, unknown>);
  blocks.set('dive-p', { marking: 'inferred', unknownReason: null, basis: 'fixture', executions: [], segments: [{ kind: 'prose', text: 'The runtime holds two parts.' }] });
  return { sources, local: { ...local, blocks: blocks as LocalRenderInput['blocks'],
    draft: { ...draft, diagrams: [...(draft['diagrams'] as unknown[]), parts], deepDives: [dive] } as unknown as LocalRenderInput['draft'],
    viewLevels: new Map([['flow', { level: 'context', scope: 'b' }], ['parts', { level: 'container', scope: 'b' }]]) } };
}

/** A containment's layer (version 2.50): `containmentInput`'s workspace with `web` the scope of a component view `inside-web` on section
 * two, so the containment's box for `web` links to `#figure-inside-web` on that section's page. */
export function zoomContainmentInput(): { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } {
  const { local, sources } = containmentInput();
  const sourceIds = [READING_SOURCE.sourceId];
  const draft = local.draft as unknown as Record<string, unknown>;
  const inside = { id: 'inside-web', sectionId: 'two', kind: 'boundary', title: 'Inside the web front end', relationship: 'what web holds', disposition: { kind: 'produced', assetIds: [] },
    nodes: [{ id: 'm1', label: 'Module one', epistemic: 'inferred', sourceIds }, { id: 'm2', label: 'Module two', epistemic: 'inferred', sourceIds }],
    edges: [{ id: 'm-edge', from: 'm1', to: 'm2', label: 'imports', epistemic: 'inferred', sourceIds }] };
  return { sources, local: { ...local, draft: { ...draft, diagrams: [...(draft['diagrams'] as unknown[]), inside] } as unknown as LocalRenderInput['draft'],
    viewLevels: new Map([['inside-web', { level: 'component', scope: 'web' }]]) } };
}
