import { describe, expect, it } from 'vitest';
import { checkDraftShape, draftSchemaDocument, localDraftSchema } from './draft-schema.js';

// syzygy-qkea.6 (S5): the local-agent draft schema (design "The local-agent draft schema"). A hand-built valid draft passes; each
// mutation below breaks one labelling, citation, revision or limit rule and must be refused at the path named. Expected paths and
// messages are literals.

const REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const SCHEMA = localDraftSchema({ pinnedRevision: REV, maxQuestions: 1 });
const cite = (id: string) => ({ id, path: 'docs/guide.md', startLine: 3, endLine: 9 });
const inferred = (id: string) => ({ id, label: 'inferred', basis: 'source', text: 'The tool renders pages.', citations: [cite(`${id}-c`)], quotations: [] });
const item = (id: string) => ({ id, label: 'inferred', statement: 'A statement.', scope: 'The whole tool.', citations: [cite(`${id}-c`)] });
const UNDERSTANDING = ['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions'];

const valid = (): Record<string, unknown> => ({
  schemaVersion: 'polaris-dossier-local-draft-v2',
  pinnedRevision: REV,
  sessionId: 'authoring-session-1',
  title: 'A tool',
  introduction: inferred('intro'),
  understanding: Object.fromEntries(UNDERSTANDING.map((key) => [key, [item(`u-${key}`)]])),
  sections: [{
    id: 'core-ideas', title: 'Core ideas',
    paragraphs: [{ ...inferred('p1'), quotations: ['p1-c'], text: 'The project states: "renders pages"', children: [
      { id: 'p1a', label: 'unknown', reason: 'missing-evidence', text: 'No source says how.', citations: [] },
      { id: 'p1b', label: 'non-normative', text: 'Read on.' },
      { id: 'p1c', label: 'inferred', basis: 'execution', executionIds: ['e1'], text: 'The build passes.', citations: [cite('p1c-c')], quotations: [] },
    ] }],
    disposition: { kind: 'produced', assetIds: ['core-ideas'] },
  }],
  diagrams: [],
  deepDives: [],
  unresolved: [{ id: 'q1', question: 'Why?', reason: 'Not stated.', citations: [] }],
  discovery: { inspected: ['README.md'], selected: [{ path: 'README.md', reason: 'Overview.' }], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Topics answered.' },
  clarifications: [{ id: 'c1', question: 'Audience?', evidence: [], consequence: 'Tone.', options: ['Operators'], answer: 'Operators', answerKind: 'selected-interpretation', attribution: 'operator' }],
  executions: [{ id: 'e1', command: 'make', workingDirectory: '.', purpose: 'Build.' }],
});

type Draft = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const mutate = (change: (draft: Draft) => void): Draft => { const draft = structuredClone(valid()) as Draft; change(draft); return draft; };

describe('local-agent draft schema', () => {
  it('admits a draft that follows every rule', () => {
    expect(checkDraftShape(SCHEMA, valid())).toEqual([]);
  });

  it('admits a v3 draft carrying every rich element kind (syzygy-mea.10.5)', () => {
    const draft = mutate((d) => {
      d.schemaVersion = 'polaris-dossier-local-draft-v3';
      const z = (id: string) => ({ id, label: 'non-normative', text: 'Words.' });
      d.sections[0].paragraphs.push(
        { kind: 'table', id: 't1', caption: 'C', columns: ['A', 'B'], rowHeaders: true, rows: [{ id: 'r1', cells: [z('t1a'), { kind: 'empty' }] }] },
        { kind: 'callout', id: 'k1', tone: 'tip', title: 'T', children: [{ ...z('k1a'), children: [z('k1b')] }] },
        { kind: 'steps', id: 's1', items: [z('s1a'), z('s1b')] },
        { kind: 'definitions', id: 'd1', entries: [{ term: 'T', definition: z('d1a') }] },
        { kind: 'cards', id: 'g1', items: [{ label: 'L', body: z('g1a') }, { label: 'M', body: z('g1b') }] },
        { kind: 'details', id: 'x1', summary: 'S', elements: [{ kind: 'steps', id: 'x1s', items: [z('x1a'), z('x1b')] }, { kind: 'code', id: 'x1c', citation: cite('x1cc') }] },
        { kind: 'code', id: 'c1', language: 'C', citation: cite('c1c') },
      );
    });
    expect(checkDraftShape(SCHEMA, draft)).toEqual([]);
  });

  it.each<[string, (draft: Draft) => void, { path: string; detail: string }]>([
    ['an agent labels its claim observed', (d) => { d.introduction.label = 'observed'; },
      { path: '$.introduction', detail: 'matches none of the permitted forms (label inferred, basis source; label inferred, basis execution; label unknown; label non-normative)' }],
    ['an inferred block cites nothing', (d) => { d.introduction.citations = []; }, { path: '$.introduction.citations', detail: 'must hold 1 to 50 items; holds 0' }],
    ['an unknown block names no reason', (d) => { delete d.sections[0].paragraphs[0].children[0].reason; }, { path: '$.sections[0].paragraphs[0].children[0].reason', detail: 'is required' }],
    ['an unknown reason outside RFC2-24', (d) => { d.sections[0].paragraphs[0].children[0].reason = 'agent-unsure'; },
      { path: '$.sections[0].paragraphs[0].children[0].reason', detail: 'must be one of missing-declaration, missing-evidence, no-currency-bound-declared, stale-beyond-currency-bound, mapping-coverage-absent, unconsented-source-or-provider, excluded-content, contradicted-pending-adjudication, challenge-suspended, source-uncaptured-or-unreachable, reference-unresolvable, execution-blocked' }],
    ['a non-normative block carries a citation', (d) => { d.sections[0].paragraphs[0].children[1].citations = [cite('x')]; }, { path: '$.sections[0].paragraphs[0].children[1].citations', detail: 'is not a field of this form' }],
    ['an execution-based claim names no execution', (d) => { d.sections[0].paragraphs[0].children[2].executionIds = []; }, { path: '$.sections[0].paragraphs[0].children[2].executionIds', detail: 'must hold 1 to 20 items; holds 0' }],
    ['the draft names another revision', (d) => { d.pinnedRevision = 'a'.repeat(40); }, { path: '$.pinnedRevision', detail: `must be one of ${REV}` }],
    ['the draft names another schema version', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v0'; }, { path: '$.schemaVersion', detail: 'must be one of polaris-dossier-local-draft-v2, polaris-dossier-local-draft-v3' }],
    ['the understanding record omits an item', (d) => { delete d.understanding.tradeOffs; }, { path: '$.understanding.tradeOffs', detail: 'is required' }],
    ['an understanding item is left empty rather than Unknown', (d) => { d.understanding.limits = []; }, { path: '$.understanding.limits', detail: 'must hold 1 to 100 items; holds 0' }],
    ['the draft has no understanding record', (d) => { delete d.understanding; }, { path: '$.understanding', detail: 'is required' }],
    ['more clarifications than the declared limit', (d) => { d.clarifications.push({ ...d.clarifications[0], id: 'c2' }); }, { path: '$.clarifications', detail: 'must hold 0 to 1 items; holds 2' }],
    ['a clarification attributed to the agent', (d) => { d.clarifications[0].attribution = 'agent'; }, { path: '$.clarifications[0].attribution', detail: 'must be one of operator' }],
    ['a line number that is not a positive integer', (d) => { d.introduction.citations[0].startLine = 1.5; }, { path: '$.introduction.citations[0].startLine', detail: 'must be an integer from 1 to 10000000' }],
    ['a citation by source id', (d) => { d.introduction.sourceIds = ['s1']; }, { path: '$.introduction.sourceIds', detail: 'is not a field of this form' }],
    ['an absolute citation path', (d) => { d.introduction.citations[0].path = '/etc/passwd'; }, { path: '$.introduction.citations[0].path', detail: 'must match ^[^/\\u0000][^\\u0000]*$' }],
    ['a diagram node marked observed', (d) => { d.diagrams.push({ id: 'd1', title: 'Flow', sectionId: 'core-ideas', kind: 'flow', relationship: 'Order.', nodes: [{ id: 'n1', label: 'A', epistemic: 'observed', citations: [cite('n1c')] }], edges: [{ id: 'x1', from: 'n1', to: 'n1', label: 'A', epistemic: 'inferred', citations: [cite('x1c')] }], disposition: { kind: 'produced', assetIds: ['d1'] } }); },
      { path: '$.diagrams[0].nodes[0].epistemic', detail: 'must be one of inferred, unknown' }],
    ['a table caption longer than a label', (d) => { d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'x'.repeat(121), columns: ['A'], rowHeaders: false, rows: [{ id: 'r1', cells: [{ id: 'z1', label: 'non-normative', text: 'Words.' }] }] }); },
      { path: '$.sections[0].paragraphs[1].caption', detail: 'must be 1 to 120 characters; is 121' }],
    ['a callout tone outside the four', (d) => { d.sections[0].paragraphs.push({ kind: 'callout', id: 'k1', tone: 'danger', title: 'T', children: [{ ...{ id: 'z1', label: 'non-normative', text: 'Words.' }, children: [] }] }); },
      { path: '$.sections[0].paragraphs[1].tone', detail: 'must be one of note, tip, caution, important' }],
    ['steps with one item', (d) => { d.sections[0].paragraphs.push({ kind: 'steps', id: 's1', items: [{ id: 'z1', label: 'non-normative', text: 'Words.' }] }); },
      { path: '$.sections[0].paragraphs[1].items', detail: 'must hold 2 to 20 items; holds 1' }],
    ['a details element nested in another', (d) => { d.sections[0].paragraphs.push({ kind: 'details', id: 'x1', summary: 'S', elements: [{ kind: 'details', id: 'x2', summary: 'S', elements: [{ ...{ id: 'z1', label: 'non-normative', text: 'Words.' }, children: [] }] }] }); },
      { path: '$.sections[0].paragraphs[1].elements[0]', detail: 'matches none of the permitted forms (unnamed; kind table; kind callout; kind steps; kind definitions; kind cards; kind code)' }],
    ['a table cell that is a label, not a claim', (d) => { d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'C', columns: ['A'], rowHeaders: false, rows: [{ id: 'r1', cells: ['bare text'] }] }); },
      { path: '$.sections[0].paragraphs[1].rows[0].cells[0]', detail: 'matches none of the permitted forms (unnamed; kind empty)' }],
    ['a code excerpt with text of its own', (d) => { d.sections[0].paragraphs.push({ kind: 'code', id: 'c1', text: 'int x;', citation: cite('c1c') }); },
      { path: '$.sections[0].paragraphs[1].text', detail: 'is not a field of this form' }],
    ['a code excerpt with no citation', (d) => { d.sections[0].paragraphs.push({ kind: 'code', id: 'c1' }); },
      { path: '$.sections[0].paragraphs[1].citation', detail: 'is required' }],
    ['a label of 121 code points', (d) => { d.sections[0].paragraphs.push({ kind: 'callout', id: 'k1', tone: 'note', title: '\u{1F600}'.repeat(121), children: [{ id: 'z1', label: 'non-normative', text: 'Words.', children: [] }] }); },
      { path: '$.sections[0].paragraphs[1].title', detail: 'must be 1 to 120 characters; is 121' }],
    ['no discovery stopping reason', (d) => { delete d.discovery.stoppingReason; }, { path: '$.discovery.stoppingReason', detail: 'is required' }],
  ])('refuses a draft where %s', (_name, change, error) => {
    expect(checkDraftShape(SCHEMA, mutate(change))).toContainEqual(error);
  });

  it('refuses a proxy and an accessor', () => {
    expect(checkDraftShape(SCHEMA, new Proxy(valid(), {}))).toEqual([{ path: '$', detail: 'must be an object' }]);
    const draft = valid();
    Object.defineProperty(draft, 'title', { get: () => 'A tool', enumerable: true });
    expect(checkDraftShape(SCHEMA, draft)).toEqual([{ path: '$', detail: 'carries a symbol key or an accessor' }]);
  });

  it('allows zero clarifications when the limit is zero', () => {
    const none = localDraftSchema({ pinnedRevision: REV, maxQuestions: 0 });
    expect(checkDraftShape(none, mutate((d) => { d.clarifications = []; }))).toEqual([]);
    expect(checkDraftShape(none, valid())).toEqual([{ path: '$.clarifications', detail: 'must hold 0 to 0 items; holds 1' }]);
  });

  it('refuses a pinned revision that is not a commit identifier and a negative question limit', () => {
    expect(() => localDraftSchema({ pinnedRevision: 'HEAD', maxQuestions: 1 })).toThrow('draft-schema: the pinned revision is not a commit identifier');
    expect(() => localDraftSchema({ pinnedRevision: REV, maxQuestions: -1 })).toThrow('draft-schema: the question limit is not a nonnegative integer');
  });
});

describe('draft.schema.json', () => {
  const document = draftSchemaDocument({ pinnedRevision: REV, maxQuestions: 1 });
  const refs = (value: unknown): string[] => (value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => (key === '$ref' ? [child as string] : refs(child))) : []);

  it('is a JSON Schema 2020-12 document carrying the version, the revision and closed objects', () => {
    expect(document['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(document['$id']).toBe('urn:syzygy:polaris-dossier:polaris-dossier-local-draft-v3');
    expect(document['additionalProperties']).toBe(false);
    expect((document['properties'] as Record<string, unknown>)['pinnedRevision']).toMatchObject({ enum: [REV] });
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('resolves every $ref to a definition it carries, and uses them all', () => {
    const defs = Object.keys(document['$defs'] as object).sort();
    const used = [...new Set(refs(document).map((ref) => ref.replace('#/$defs/', '')))].sort();
    expect(used).toEqual(defs);
    expect(defs).toEqual(['block', 'callout', 'cards', 'citation', 'code', 'content', 'definitions', 'detailContent', 'details', 'disposition', 'paragraph', 'pathReason', 'steps', 'table', 'understandingItem', 'unknownReason']);
  });

  it('nowhere offers an observed label', () => {
    expect(JSON.stringify(document).includes('"observed"')).toBe(false);
  });
});
