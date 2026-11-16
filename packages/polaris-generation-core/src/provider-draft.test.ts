import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diagramToMermaid, stageSchema, validateStage, reviewVerdict } from './provider-draft.js';

const sources = [{ sourceId: 's1', text: 'Purpose and architecture' }, { sourceId: 's2', text: 'A material qualification' }];
const inventory = { entries: [
  { id: 'i1', sourceIds: ['s1'], statement: 'Purpose', kind: 'purpose', disposition: { kind: 'produced', assetIds: ['intro'] } },
  { id: 'i2', sourceIds: ['s2'], statement: 'Qualification', kind: 'qualification', disposition: { kind: 'produced', assetIds: ['detail-body'] } },
] };
const plan = { sections: [{ id: 'section', title: 'How it works', reason: 'Explain relationships', sourceIds: ['s1', 's2'], disposition: { kind: 'produced', assetIds: ['section'] } }] };
const paragraph = (id: string) => ({ id, text: 'Supported explanation', sourceIds: [id === 'detail-body' ? 's2' : 's1'] });
const block = (id: string, text = 'Supported explanation') => ({ ...paragraph(id), text, children: [] as { id: string; text: string; sourceIds: string[] }[] });
const draft = { title: 'A manifesto', introduction: paragraph('intro'),
  sections: [{ id: 'section', title: 'How it works', paragraphs: [block('body', 'Input supplies the output.')], disposition: { kind: 'produced', assetIds: ['section'] } }],
  diagrams: [{ id: 'diagram', title: 'Architecture', sectionId: 'section', kind: 'flow', relationship: 'How input becomes output', nodes: [
    { id: 'n1', label: 'Input', sourceIds: ['s1'], epistemic: 'observed' }, { id: 'n2', label: 'Output', sourceIds: ['s1'], epistemic: 'observed' },
  ], edges: [{ id: 'e1', from: 'n1', to: 'n2', label: 'Supplies', sourceIds: ['s1'], epistemic: 'observed' }], disposition: { kind: 'produced', assetIds: ['diagram'] } }],
  deepDives: [{ id: 'detail', title: 'Why this choice?', sectionId: 'section', paragraphs: [block('detail-body')], disposition: { kind: 'produced', assetIds: ['detail'] } }],
  unresolved: [],
};
const review = { inventoryCoverage: [{ entryId: 'i1', disposition: 'represented', blockIds: ['intro'], reason: 'represented' }, { entryId: 'i2', disposition: 'represented', blockIds: ['detail-body'], reason: 'represented' }], blockSupport: ['intro', 'body', 'n1', 'n2', 'e1', 'detail-body'].map(blockId => ({ blockId, verdict: 'supported', sourceIds: [blockId === 'detail-body' ? 's2' : 's1'], reason: 'supported' })), findings: [] };
const requestedAssets = [{ id: 'section', kind: 'section', required: true }, { id: 'diagram', kind: 'diagram', required: true }, { id: 'detail', kind: 'deep-dive', required: false }];
const context = { sources, inventory, plan, draft, requestedAssets };

describe('provider-local intermediate validation', () => {
  it('accepts the complete staged path with serializable isolated schemas and outputs', () => {
    for (const [stage, value] of [['inventory', inventory], ['plan', plan], ['author', draft], ['edit', draft], ['repair', draft], ['fidelity', review]] as const) {
      expect(validateStage(stage, value, context)).toEqual(value);
      expect(validateStage(stage, value, context)).not.toBe(value);
      expect(JSON.parse(JSON.stringify(stageSchema(stage)))).toEqual(stageSchema(stage));
    }
    const schema = stageSchema('author');
    schema.schema = stageSchema('inventory').schema;
    expect(stageSchema('author')).not.toEqual(schema);
  });

  it('validates the checked-in synthetic inventory block as an isolated clone', () => {
    const example = JSON.parse(readFileSync(new URL('../../../docs/polaris-generation/example.json', import.meta.url), 'utf8')) as {
      synthetic: boolean;
      providerCallPerformed: boolean;
      validatedInventoryExample: {
        stage: 'inventory';
        context: { sources: { sourceId: string; text: string }[]; requestedAssets: unknown[] };
        payload: { entries: { id: string; sourceIds: string[]; statement: string; kind: string; disposition: { kind: string; reason: string; references: string[] } }[] };
      };
      illustrativeUnderstandingExample: { executable: boolean; schemaStatus: string };
    };
    const inventoryExample = example.validatedInventoryExample;
    const { context, payload } = inventoryExample;
    const inputSnapshot = structuredClone({ context, payload });

    expect(example.synthetic).toBe(true);
    expect(example.providerCallPerformed).toBe(false);
    expect(Object.keys(inventoryExample).sort()).toEqual(['context', 'payload', 'stage']);
    expect(inventoryExample.stage).toBe('inventory');
    expect(Object.keys(context).sort()).toEqual(['requestedAssets', 'sources']);
    expect(context.requestedAssets).toEqual([]);
    expect(context.sources.every(source => Object.keys(source).sort().join(',') === 'sourceId,text')).toBe(true);
    expect(example.illustrativeUnderstandingExample.executable).toBe(false);
    expect(example.illustrativeUnderstandingExample.schemaStatus).toBe('illustrative-not-registered');

    const first = validateStage('inventory', payload, context) as typeof payload;
    const second = validateStage('inventory', payload, context) as typeof payload;
    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(first).not.toBe(payload);
    expect(first.entries).not.toBe(payload.entries);
    expect(first.entries[0]).not.toBe(payload.entries[0]);
    expect(first.entries[0]!.disposition).not.toBe(payload.entries[0]!.disposition);
    expect(first.entries[0]!.disposition.references).not.toBe(payload.entries[0]!.disposition.references);
    expect(second).not.toBe(first);
    expect(second.entries).not.toBe(first.entries);
    expect(second.entries[0]!.disposition).not.toBe(first.entries[0]!.disposition);
    expect({ context, payload }).toEqual(inputSnapshot);

    first.entries[0]!.disposition.references[0] = 'changed only in the first validated clone';
    expect(second).toEqual(payload);
    expect({ context, payload }).toEqual(inputSnapshot);

    const { statement, ...entryMissingStatement } = payload.entries[0]!;
    expect(statement).toBeTypeOf('string');
    const invalidPayload = { ...payload, entries: [entryMissingStatement, ...payload.entries.slice(1)] };
    expect(() => validateStage('inventory', invalidPayload, context)).toThrow();
  });

  it('refuses missing admitted sources, unknown support and duplicate local identities', () => {
    expect(() => validateStage('inventory', { entries: inventory.entries.slice(0, 1) }, context)).toThrow('incomplete-coverage');
    expect(() => validateStage('inventory', { entries: [...inventory.entries, inventory.entries[0]] }, context)).toThrow('duplicate-handle');
    expect(() => validateStage('author', { ...draft, introduction: { ...draft.introduction, sourceIds: ['unknown'] } }, context)).toThrow('unknown-source');
  });

  it('refuses dangling diagram endpoints, deep-dive parents and duplicate draft handles', () => {
    const bad = structuredClone(draft);
    bad.diagrams[0]!.edges[0]!.to = 'missing';
    expect(() => validateStage('author', bad, context)).toThrow('unknown-node');
    bad.diagrams[0]!.edges[0]!.to = 'n2';
    bad.deepDives[0]!.sectionId = 'missing';
    expect(() => validateStage('author', bad, context)).toThrow('unknown-section');
    bad.deepDives[0]!.sectionId = 'section';
    bad.introduction.id = 'n1';
    expect(() => validateStage('author', bad, context)).toThrow('duplicate-handle');
  });

  it('requires declared review coverage of inventory and every claim-bearing block', () => {
    expect(() => validateStage('fidelity', { ...review, inventoryCoverage: review.inventoryCoverage.slice(0, 1) }, context)).toThrow('incomplete-coverage');
    for (const omitted of review.blockSupport) {
      expect(() => validateStage('fidelity', { ...review, blockSupport: review.blockSupport.filter(row => row.blockId !== omitted.blockId) }, context)).toThrow('incomplete-coverage');
    }
    expect(() => validateStage('fidelity', { ...review, findings: [{ severity: 'blocking', message: 'Bad', target: 'missing' }] }, context)).toThrow('unknown-finding-target');
    expect(reviewVerdict({ ...review, findings: [{ severity: 'blocking', message: 'Lost qualification', target: 'i2' }] }).blocking).toBe(true);
    expect(reviewVerdict(review).blocking).toBe(false); // Declared coverage, not semantic proof.
  });

  it('requires exact asset dispositions and refuses invented produced identities', () => {
    expect(() => validateStage('inventory', { entries: [{ ...inventory.entries[0]!, disposition: undefined }] }, context)).toThrow('invalid-disposition');
    expect(() => validateStage('plan', { sections: [{ ...plan.sections[0]!, disposition: { kind: 'unresolved', reason: 'missing capability', assetIds: ['invented'] } }] }, context)).toThrow('invalid-disposition');
    expect(() => validateStage('author', { ...draft, sections: [{ ...draft.sections[0]!, disposition: { kind: 'produced', assetIds: ['not-in-draft'] } }] }, context)).toThrow('unknown-asset');
  });

  it('renders unresolved dispositions as reviewable absence rather than output identity', () => {
    const unresolved = {
      ...draft,
      diagrams: [{ ...draft.diagrams[0]!, disposition: { kind: 'unresolved', reason: 'renderer unavailable', references: ['s2'] } }],
      unresolved: [{ question: 'How does the relationship work?', reason: 'renderer unavailable', references: ['s2'] }],
    };
    expect(() => validateStage('author', unresolved, context)).not.toThrow();
  });

  it('makes every negative coverage row block the fidelity verdict while all-positive rows proceed', () => {
    expect(reviewVerdict(review).blocking).toBe(false);
    expect(reviewVerdict({ ...review, inventoryCoverage: review.inventoryCoverage.map((row, index) => index === 0 ? { ...row, disposition: 'unsupported', reason: 'not supported' } : row) }).blocking).toBe(true);
    expect(reviewVerdict({ ...review, blockSupport: review.blockSupport.map((row, index) => index === 0 ? { ...row, verdict: 'unresolved', reason: 'not supported' } : row) }).blocking).toBe(true);
  });

  it('joins positive coverage to real blocks and each supported source to that block', () => {
    const coverage = (blockIds: string[]) => ({ ...review, inventoryCoverage: [{ ...review.inventoryCoverage[0]!, blockIds }, review.inventoryCoverage[1]!] });
    expect(() => validateStage('fidelity', coverage([]), context)).toThrow('missing-coverage-block');
    expect(() => validateStage('fidelity', coverage(['ghost']), context)).toThrow('invalid-coverage-block');
    expect(() => validateStage('fidelity', { ...review, inventoryCoverage: [review.inventoryCoverage[0]!, { ...review.inventoryCoverage[1]!, blockIds: ['intro'] }] }, context)).toThrow('invalid-coverage-block');
    expect(() => validateStage('fidelity', { ...review, blockSupport: [{ ...review.blockSupport[0]!, sourceIds: ['s2'] }, ...review.blockSupport.slice(1)] }, context)).toThrow('support-source-outside-block');
    expect(() => validateStage('fidelity', { ...review, blockSupport: [{ ...review.blockSupport[0]!, sourceIds: [] }, ...review.blockSupport.slice(1)] }, context)).toThrow('missing-support-source');
    expect(() => reviewVerdict({ ...review, blockSupport: [{ ...review.blockSupport[0]!, sourceIds: [] }, ...review.blockSupport.slice(1)] })).toThrow('missing-support-source');
  });

  it('joins produced assets and disposition references to admitted bundle identities', () => {
    const ghost = { ...inventory, entries: [{ ...inventory.entries[0]!, disposition: { kind: 'produced', assetIds: ['ghost'] } }, inventory.entries[1]!] };
    expect(() => validateStage('author', draft, { ...context, inventory: ghost })).toThrow('unknown-asset');
    const unknownReference = { entries: [{ ...inventory.entries[0]!, disposition: { kind: 'omitted', reason: 'No support', references: ['not-admitted'] } }, inventory.entries[1]!] };
    expect(() => validateStage('inventory', unknownReference, context)).toThrow('unknown-source');
    expect(() => validateStage('author', { ...draft, unresolved: [{ question: 'What is missing?', reason: 'No source', references: ['not-admitted'] }] }, context)).toThrow('unknown-source');
  });

  it('uses trusted request identity and requiredness for exact produced, omitted and unresolved dispositions', () => {
    expect(() => validateStage('plan', { sections: [{ ...plan.sections[0]!, disposition: { kind: 'omitted', reason: 'Unavailable', references: ['s1'] } }] }, context)).toThrow('required-asset-omitted');
    expect(() => validateStage('author', { ...draft, diagrams: [{ ...draft.diagrams[0]!, disposition: { kind: 'omitted', reason: 'Unavailable', references: ['s1'] } }] }, context)).toThrow('required-asset-omitted');
    expect(() => validateStage('author', { ...draft, diagrams: [{ ...draft.diagrams[0]!, disposition: { kind: 'produced', assetIds: ['section'] } }] }, context)).toThrow('requested-asset-output-mismatch');
    expect(() => validateStage('author', draft, { ...context, requestedAssets: [...requestedAssets, { id: 'missing', kind: 'diagram', required: true }] })).toThrow('missing-requested-asset');
    const mixed = {
      ...draft,
      diagrams: [{ ...draft.diagrams[0]!, disposition: { kind: 'unresolved', reason: 'Renderer unavailable', references: ['s1'] } }],
      deepDives: [{ ...draft.deepDives[0]!, disposition: { kind: 'omitted', reason: 'Optional depth', references: ['s2'] } }],
    };
    const mixedInventory = { entries: [inventory.entries[0]!, { ...inventory.entries[1]!, disposition: { kind: 'omitted', reason: 'Optional depth', references: ['s2'] } }] };
    const mixedContext = { ...context, inventory: mixedInventory, draft: mixed };
    expect(() => validateStage('author', mixed, mixedContext)).not.toThrow();
    expect(() => validateStage('fidelity', review, mixedContext)).toThrow('unresolved-required-asset');
    const blocked = { ...review, findings: [{ severity: 'blocking', message: 'Required visual unresolved', target: 'diagram' }] };
    expect(() => validateStage('fidelity', blocked, mixedContext)).not.toThrow();
    expect(reviewVerdict(blocked).blocking).toBe(true);
  });

  it.each(['<script>alert(1)</script>', 'https://outside.test', 'x < y > z'])('preserves inert text for escaped rendering', title => {
    expect(validateStage('author', { ...draft, title }, context)).toEqual({ ...draft, title });
  });

  it('rejects extras, accessors and sparse arrays without executing hooks', () => {
    expect(() => validateStage('author', { ...draft, approved: true }, context)).toThrow('invalid-fields');
    let called = false;
    const bad = { ...draft };
    Object.defineProperty(bad, 'title', { get() { called = true; return 'bad'; }, enumerable: true });
    expect(() => validateStage('author', bad, context)).toThrow('invalid-property');
    expect(called).toBe(false);
    expect(() => validateStage('inventory', { entries: new Array(2) }, context)).toThrow('invalid-array');
  });

  it('refuses an array with a plain object\'s prototype under a disposition as invalid-disposition, not a TypeError', () => {
    // R-GP-IMPL-CLOSED-SCHEMA-1 F1: its handles pass, so the repeat test throws inside the oneOf arm; the arm is a miss.
    const assetIds = Object.setPrototypeOf(['intro'], Object.prototype) as unknown;
    const entry = { id: 'i1', sourceIds: ['s1'], statement: 'Purpose', kind: 'purpose', disposition: { kind: 'produced', assetIds } };
    const outcome = (() => { try { validateStage('inventory', { entries: [entry] }, context); return 'ok'; } catch (error) { return `${(error as Error).constructor.name}: ${(error as Error).message}`; } })();
    expect(outcome).toBe('Error: invalid-disposition');
  });
  it('versions only the draft stages at v2', () => {
    expect(['inventory', 'plan', 'author', 'edit', 'repair', 'fidelity'].map(stage => stageSchema(stage as 'author').version)).toEqual([
      'polaris-provider-inventory-v1', 'polaris-provider-plan-v1', 'polaris-provider-author-v2',
      'polaris-provider-edit-v2', 'polaris-provider-repair-v2', 'polaris-provider-fidelity-v1',
    ]);
  });

  it('bounds tree blocks at one level of 0-12 children and closes the diagram vocabularies', () => {
    const withChildren = (count: number) => {
      const d = structuredClone(draft);
      d.sections[0]!.paragraphs[0]!.children = Array.from({ length: count }, (_, i) => ({ id: `c${i}`, text: 'Child detail', sourceIds: ['s1'] }));
      return d;
    };
    const review12 = { ...review, blockSupport: [...review.blockSupport, ...Array.from({ length: 12 }, (_, i) => ({ blockId: `c${i}`, verdict: 'supported', sourceIds: ['s1'], reason: 'supported' }))] };
    expect(() => validateStage('author', withChildren(12), context)).not.toThrow();
    expect(() => validateStage('fidelity', review12, { ...context, draft: withChildren(12) })).not.toThrow();
    expect(() => validateStage('author', withChildren(13), context)).toThrow('invalid-array');
    const nested = withChildren(1);
    (nested.sections[0]!.paragraphs[0]!.children[0] as Record<string, unknown>).children = [];
    expect(() => validateStage('author', nested, context)).toThrow('invalid-fields');
    const { children: _children, ...flat } = draft.sections[0]!.paragraphs[0]!;
    expect(() => validateStage('author', { ...draft, sections: [{ ...draft.sections[0]!, paragraphs: [flat] }] }, context)).toThrow('invalid-fields');
    expect(() => validateStage('author', { ...draft, introduction: { ...draft.introduction, children: [] } }, context)).toThrow('invalid-fields');
    const d = structuredClone(draft);
    d.diagrams[0]!.kind = 'decorative';
    expect(() => validateStage('author', d, context)).toThrow('invalid-string');
    const e = structuredClone(draft);
    e.diagrams[0]!.edges[0]!.epistemic = 'certain';
    expect(() => validateStage('author', e, context)).toThrow('invalid-string');
    const n = structuredClone(draft);
    delete (n.diagrams[0]!.nodes[0] as Record<string, unknown>).epistemic;
    expect(() => validateStage('author', n, context)).toThrow('invalid-fields');
    const r = structuredClone(draft);
    delete (r.diagrams[0] as Record<string, unknown>).relationship;
    expect(() => validateStage('author', r, context)).toThrow('invalid-fields');
    const noEdges = structuredClone(draft);
    noEdges.diagrams[0]!.edges = [];
    expect(() => validateStage('author', noEdges, context)).toThrow('invalid-array');
  });

  it('counts child blocks as blocks in handles, produced assets and fidelity coverage', () => {
    const d = structuredClone(draft);
    d.sections[0]!.paragraphs[0]!.children = [{ id: 'child', text: 'A qualified mechanism', sourceIds: ['s2'] }];
    d.sections[0]!.disposition = { kind: 'produced', assetIds: ['section', 'child'] };
    const withChild = { ...context, draft: d };
    const childSupport = { blockId: 'child', verdict: 'supported', sourceIds: ['s2'], reason: 'supported' };
    const covered = { ...review, blockSupport: [...review.blockSupport, childSupport] };
    expect(() => validateStage('author', d, context)).not.toThrow();
    expect(() => validateStage('fidelity', covered, withChild)).not.toThrow();
    expect(() => validateStage('fidelity', review, withChild)).toThrow('incomplete-coverage');
    const childCoverage = { ...covered, inventoryCoverage: [review.inventoryCoverage[0]!, { ...review.inventoryCoverage[1]!, blockIds: ['child'] }] };
    expect(() => validateStage('fidelity', childCoverage, withChild)).not.toThrow();
    expect(() => validateStage('fidelity', { ...covered, blockSupport: [...review.blockSupport, { ...childSupport, sourceIds: ['s1'] }] }, withChild)).toThrow('support-source-outside-block');
    expect(() => validateStage('fidelity', { ...covered, findings: [{ severity: 'advisory', message: 'Tighten', target: 'child' }] }, withChild)).not.toThrow();
    const clash = structuredClone(d);
    clash.sections[0]!.paragraphs[0]!.children[0]!.id = 'n1';
    expect(() => validateStage('author', clash, context)).toThrow('duplicate-handle');
    const unknownChild = structuredClone(d);
    unknownChild.sections[0]!.paragraphs[0]!.children[0]!.sourceIds = ['nowhere'];
    expect(() => validateStage('author', unknownChild, context)).toThrow('unknown-source');
    const deep = structuredClone(draft);
    deep.deepDives[0]!.paragraphs[0]!.children = [{ id: 'deep-child', text: 'Depth', sourceIds: ['s2'] }];
    deep.deepDives[0]!.disposition = { kind: 'produced', assetIds: ['detail', 'deep-child'] };
    expect(() => validateStage('author', deep, context)).not.toThrow();
    expect(() => validateStage('fidelity', review, { ...context, draft: deep })).toThrow('incomplete-coverage');
    const requested = { ...context, requestedAssets: [{ id: 'section', kind: 'section', required: true }] };
    const mismatch = structuredClone(draft);
    mismatch.sections[0]!.disposition = { kind: 'produced', assetIds: ['section', 'n1'] };
    expect(() => validateStage('author', mismatch, requested)).toThrow('requested-asset-output-mismatch');
    expect(() => validateStage('author', d, requested)).not.toThrow();
  });

  it('requires every produced diagram label in its own section text, children included', () => {
    const labelled = (sectionText: string, children: string[] = []) => {
      const d = structuredClone(draft);
      d.sections[0]!.paragraphs[0]!.text = sectionText;
      d.sections[0]!.paragraphs[0]!.children = children.map((text, i) => ({ id: `child-${i}`, text, sourceIds: ['s1'] }));
      return d;
    };
    expect(() => validateStage('author', labelled('Input supplies the output.'), context)).not.toThrow();
    expect(() => validateStage('author', labelled('It starts with input.', ['It ends with output.', 'Each stage supplies the next.']), context)).not.toThrow();
    expect(() => validateStage('author', labelled('  INPUT\n\tsupplies   OUTPUT  '), context)).not.toThrow();
    expect(() => validateStage('author', labelled('It starts with input and ends with output.'), context)).toThrow('diagram-label-not-in-text');
    expect(() => validateStage('author', labelled('Input supplies it.'), context)).toThrow('diagram-label-not-in-text');
    const spaced = labelled('Input supplies the output.');
    spaced.diagrams[0]!.edges[0]!.label = 'Supplies   the\noutput';
    expect(() => validateStage('author', spaced, context)).not.toThrow();
    const straddle = labelled('Input supplies the', ['output arrives.']);
    straddle.diagrams[0]!.edges[0]!.label = 'the output';
    expect(() => validateStage('author', straddle, context)).toThrow('diagram-label-not-in-text');
    const depthOnly = labelled('It starts with input and ends with output.');
    depthOnly.deepDives[0]!.paragraphs[0]!.text = 'Input supplies the output.';
    expect(() => validateStage('author', depthOnly, context)).toThrow('diagram-label-not-in-text');
    const unresolved = labelled('Nothing drawn here.');
    const unresolvedDraft = { ...unresolved, diagrams: [{ ...unresolved.diagrams[0]!, disposition: { kind: 'unresolved', reason: 'Renderer unavailable', references: ['s1'] } }] };
    expect(() => validateStage('author', unresolvedDraft, context)).not.toThrow();
    expect(() => validateStage('fidelity', review, { ...context, draft: labelled('Input only.') })).toThrow('diagram-label-not-in-text');
  });

  it('exports deterministic, escaped Mermaid from the structured diagram', () => {
    const diagram = {
      nodes: [
        { id: 'a.handle', label: 'Say "hi" [now]', sourceIds: ['s1'], epistemic: 'observed' as const },
        { id: 'b', label: 'Line one\nline two {x} (y) | z', sourceIds: ['s1'], epistemic: 'inferred' as const },
        { id: 'c', label: 'end', sourceIds: ['s1'], epistemic: 'unknown' as const },
      ],
      edges: [
        { id: 'e1', from: 'a.handle', to: 'b', label: 'feeds; then --> ends', sourceIds: ['s1'], epistemic: 'observed' as const },
        { id: 'e2', from: 'b', to: 'c', label: 'may <reach>', sourceIds: ['s1'], epistemic: 'inferred' as const },
        { id: 'e3', from: 'c', to: 'a.handle', label: 'loops #1', sourceIds: ['s1'], epistemic: 'unknown' as const },
      ],
    };
    const expected = [
      'flowchart LR',
      '  n0["Say #34;hi#34; #91;now#93;"]',
      '  n1["Line one line two #123;x#125; #40;y#41; #124; z"]',
      '  n2["end #40;unknown#41;"]',
      '  n0 -->|"feeds#59; then --#62; ends"| n1',
      '  n1 -.->|"may #60;reach#62;"| n2',
      '  n2 -.->|"loops #35;1 #40;unknown#41;"| n0',
      '  class n1 inferred',
      '  class n2 unknown',
      '  classDef inferred stroke-dasharray:6 4',
      '  classDef unknown stroke-dasharray:2 4',
      '',
    ].join('\n');
    expect(diagramToMermaid(diagram)).toBe(expected);
    expect(diagramToMermaid(structuredClone(diagram))).toBe(expected);
    // Each label stays one quoted token: no bare quote, bracket, pipe or newline escapes it.
    const lines = diagramToMermaid(diagram).split('\n');
    for (const line of lines.slice(1, 4)) expect(line).toMatch(/^  n\d+\["[^"\[\](){}|<>]*"\]$/u);
    for (const line of lines.slice(4, 7)) expect(line).toMatch(/^  n\d+ (?:-->|-\.->)\|"[^"\[\](){}|<>]*"\| n\d+$/u);
    expect(() => diagramToMermaid({ ...diagram, edges: [{ ...diagram.edges[0]!, to: 'missing' }] })).toThrow('unknown-node');
  });
});
