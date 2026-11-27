import { describe, expect, it } from 'vitest';
import { figureAdvice, figurePlanFindings, labelKey, withoutFigurePlan } from './figure-plan.js';

// The figure plan and the figure advice (REQ-polaris-generation-034 version 2.33, schema v14, syzygy-3efd.84), each over a draft built
// here. Every expected finding, path, detail and advisory is a literal written from the requirement's text and its scenarios before the
// module ran, never imported from it. Check's wiring (order, gating, the report member, the rendered bytes) is in system-model.test.ts.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const V13 = 'polaris-dossier-local-draft-v13', V14 = 'polaris-dossier-local-draft-v14';
const OVERVIEW = { kind: 'overview' };
const section = (target: string) => ({ kind: 'section', target });
const dive = (target: string) => ({ kind: 'deep-dive', target });
const planned = (home: Doc, kind: string, figure: unknown, question = 'What are the main parts?'): Doc => ({ home, question, kind, figure });
const omitted = (home: Doc, why = 'Two steps read better as one sentence.'): Doc => ({ home, omitted: why });
const diagram = (id: string, kind: string, home: Doc, disposition = 'produced'): Doc => ({ id, kind, home, disposition: { kind: disposition } });
const draft = (plan: unknown, over: Doc = {}): Doc => ({
  schemaVersion: V14,
  sections: [{ id: 'a' }, { id: 'b' }],
  deepDives: [],
  diagrams: [],
  ...(plan === undefined ? {} : { figurePlan: plan }),
  ...over,
});
const findings = (doc: Doc) => figurePlanFindings(doc).map(({ kind, at, detail }) => ({ kind, at, detail }));

describe('figure plan: the places', () => {
  it('passes a plan naming each place once, the scenario\'s three entries', () => {
    const doc = draft([
      planned(OVERVIEW, 'boundary', 'system', 'What are the main parts and what surrounds them?'),
      planned(section('write-path'), 'sequence', 'writes'),
      omitted(dive('replication')),
    ], {
      sections: [{ id: 'write-path' }], deepDives: [{ id: 'replication' }],
      diagrams: [diagram('system', 'boundary', OVERVIEW), diagram('writes', 'sequence', section('write-path'))],
    });
    expect(findings(doc)).toEqual([]);
  });

  it('refuses a draft with no plan, and a plan that is not a list, with one finding each', () => {
    expect(findings(draft(undefined))).toEqual([
      { kind: 'figure-plan', at: '$.figurePlan', detail: 'a v14 draft plans its figures: one `figurePlan` entry for the overview, each section and each deep dive' }]);
    expect(findings(draft({ overview: 'x' }))).toEqual([{ kind: 'figure-plan', at: '$.figurePlan', detail: '`figurePlan` is a list of plan entries' }]);
  });

  it('names a second entry for a place and a place no entry names, entries first', () => {
    expect(findings(draft([omitted(OVERVIEW), omitted(section('a')), omitted(section('a'))]))).toEqual([
      { kind: 'figure-plan', at: '$.figurePlan[2].home', detail: 'section a: a second plan entry for this place' },
      { kind: 'figure-plan', at: '$.figurePlan', detail: 'section b: no plan entry for this place' },
    ]);
  });

  it('reports an unresolved target once per entry, never as a second entry, and still reports the place it was meant for', () => {
    expect(findings(draft([omitted(OVERVIEW), omitted(section('a')), omitted(section('c')), omitted(section('c'))]))).toEqual([
      { kind: 'unresolved-reference', at: '$.figurePlan[2].home.target', detail: 'no section or deep dive has the identity named by `figurePlan[2].home.target`' },
      { kind: 'unresolved-reference', at: '$.figurePlan[3].home.target', detail: 'no section or deep dive has the identity named by `figurePlan[3].home.target`' },
      { kind: 'figure-plan', at: '$.figurePlan', detail: 'section b: no plan entry for this place' },
    ]);
  });

  it('compares no home for a planned figure in an entry whose target is unresolved, and still compares its kind', () => {
    const doc = draft([omitted(OVERVIEW), omitted(section('a')), omitted(section('b')), planned(section('c'), 'flow', 'f')], { diagrams: [diagram('f', 'boundary', section('a'))] });
    expect(findings(doc)).toEqual([
      { kind: 'unresolved-reference', at: '$.figurePlan[3].home.target', detail: 'no section or deep dive has the identity named by `figurePlan[3].home.target`' },
      { kind: 'figure-plan', at: '$.figurePlan[3].figure', detail: 'f: a planned figure is of the kind its plan entry names' },
    ]);
  });

  it('resolves a deep dive\'s target among the deep dives alone, and a section\'s among the sections', () => {
    expect(findings(draft([omitted(OVERVIEW), omitted(section('a')), omitted(section('b')), omitted(dive('a')), omitted(section('d'))], { deepDives: [{ id: 'd' }] }))).toEqual([
      { kind: 'unresolved-reference', at: '$.figurePlan[3].home.target', detail: 'no section or deep dive has the identity named by `figurePlan[3].home.target`' },
      { kind: 'unresolved-reference', at: '$.figurePlan[4].home.target', detail: 'no section or deep dive has the identity named by `figurePlan[4].home.target`' },
      { kind: 'figure-plan', at: '$.figurePlan', detail: 'deep dive d: no plan entry for this place' },
    ]);
  });

  it('names an unplanned overview first, then the sections and then the deep dives, each in draft order', () => {
    expect(findings(draft([], { deepDives: [{ id: 'd1' }, { id: 'd2' }] })).map(({ detail }) => detail)).toEqual([
      'overview: no plan entry for this place', 'section a: no plan entry for this place', 'section b: no plan entry for this place',
      'deep dive d1: no plan entry for this place', 'deep dive d2: no plan entry for this place']);
  });

  it('reads two places as one only where kind and target are the same code units', () => {
    expect(findings(draft([omitted(OVERVIEW), omitted(section('a')), omitted(section('b'))], { sections: [{ id: 'a' }, { id: 'b' }], deepDives: [{ id: 'a' }] }))).toEqual([
      { kind: 'figure-plan', at: '$.figurePlan', detail: 'deep dive a: no plan entry for this place' }]);
  });
});

describe('figure plan: a malformed entry', () => {
  const MALFORMED = { kind: 'figure-plan', at: '$.figurePlan[1]', detail: 'a plan entry is {"home", "question", "kind", "figure"} or {"home", "omitted"}' };
  const cases: [string, unknown][] = [
    ['both figure and omitted', { ...planned(section('a'), 'flow', 'f'), omitted: 'No.' }],
    ['neither', { home: section('a'), question: 'Why?', kind: 'flow' }],
    ['a further member', { ...omitted(section('a')), note: 'x' }],
    ['a kind of pie', planned(section('a'), 'pie', 'f')],
    ['an empty question', planned(section('a'), 'flow', 'f', '')],
    ['a question of 301 code points', planned(section('a'), 'flow', 'f', '\u{1F600}'.repeat(301))],
    ['a question of white space alone', planned(section('a'), 'flow', 'f', ' \t\n\r\u000b\u000c')],
    ['an omission of white space alone', omitted(section('a'), '   ')],
    ['a home of kind pole', omitted({ kind: 'pole', target: 'a' })],
    ['a target that is not a string', omitted({ kind: 'section', target: 7 })],
    ['an overview home naming a target', omitted({ kind: 'overview', target: 'a' })],
    ['a section home naming no target', omitted({ kind: 'section' })],
    ['a string', 'section a'],
    ['an array', [omitted(section('a'))]],
  ];
  it.each(cases)('refuses %s at the entry alone, and reports its place unplanned', (_name, entry) => {
    expect(findings(draft([omitted(OVERVIEW), entry, omitted(section('b'))], { diagrams: [diagram('f', 'flow', section('a'))] }))).toEqual([
      MALFORMED, { kind: 'figure-plan', at: '$.figurePlan', detail: 'section a: no plan entry for this place' }]);
  });

  it('admits a question of 300 code points holding one that is not white space, a no-break space being one, and the containment kind', () => {
    const doc = draft([omitted(OVERVIEW), planned(section('a'), 'containment', 'k', `${'\u{1F600}'.repeat(299)} `), omitted(section('b'), '\u00a0')],
      { diagrams: [diagram('k', 'containment', section('a'))] });
    expect(findings(doc)).toEqual([]);
  });

  it('admits each of the nine figure kinds', () => {
    const kinds = ['flow', 'lifecycle', 'state-machine', 'boundary', 'dependency', 'placement', 'sequence', 'swimlane', 'containment'];
    for (const kind of kinds) {
      expect(findings(draft([omitted(OVERVIEW), planned(section('a'), kind, 'f'), omitted(section('b'))], { diagrams: [diagram('f', kind, section('a'))] })), kind).toEqual([]);
    }
  });
});

describe('figure plan: the planned figure', () => {
  const plan = (figure: unknown, kind: string): Doc[] => [omitted(OVERVIEW), omitted(section('b')), omitted(dive('d')), planned(section('a'), kind, figure)];
  const DIAGRAMS = [diagram('f', 'flow', section('b')), diagram('s', 'sequence', section('a')), diagram('s2', 'sequence', section('b')), diagram('o', 'flow', section('a'), 'omitted')];
  const fourth = (figure: unknown, kind: string) => findings(draft(plan(figure, kind), { deepDives: [{ id: 'd' }], diagrams: DIAGRAMS }));

  it('names a figure no diagram is, a figure homed elsewhere, one of another kind, and both, the home first', () => {
    expect(fourth('missing', 'flow')).toEqual([
      { kind: 'unresolved-reference', at: '$.figurePlan[3].figure', detail: 'no diagram has the identity named by `figurePlan[3].figure`' }]);
    expect(fourth('f', 'flow')).toEqual([{ kind: 'figure-plan', at: '$.figurePlan[3].figure', detail: 'f: a planned figure is homed at its plan entry\'s place' }]);
    expect(fourth('s', 'swimlane')).toEqual([{ kind: 'figure-plan', at: '$.figurePlan[3].figure', detail: 's: a planned figure is of the kind its plan entry names' }]);
    expect(fourth('s2', 'flow')).toEqual([
      { kind: 'figure-plan', at: '$.figurePlan[3].figure', detail: 's2: a planned figure is homed at its plan entry\'s place' },
      { kind: 'figure-plan', at: '$.figurePlan[3].figure', detail: 's2: a planned figure is of the kind its plan entry names' },
    ]);
  });

  it('names a figure that is not a string as no diagram', () => {
    expect(fourth(7, 'flow')).toEqual([
      { kind: 'unresolved-reference', at: '$.figurePlan[3].figure', detail: 'no diagram has the identity named by `figurePlan[3].figure`' }]);
  });

  it('raises nothing for a figure at its place and of its kind whose disposition is omitted, and the overview compares with no target', () => {
    expect(fourth('o', 'flow')).toEqual([]);
    expect(findings(draft([planned(OVERVIEW, 'boundary', 'h'), omitted(section('a')), omitted(section('b'))], { diagrams: [diagram('h', 'boundary', OVERVIEW)] }))).toEqual([]);
  });
});

describe('figure plan: other schemas, and the draft every other reader sees', () => {
  it('reads no plan in a draft of schema v13 or earlier', () => {
    expect(findings({ ...draft('x'), schemaVersion: V13 })).toEqual([]);
    expect(findings({ ...draft(undefined), schemaVersion: 'polaris-dossier-local-draft-v12' })).toEqual([]);
  });

  it('hands every other reader a v14 draft without its plan, and any other draft unchanged', () => {
    const v14 = draft([omitted(OVERVIEW)]);
    expect(withoutFigurePlan(v14)).toEqual({ schemaVersion: V14, sections: [{ id: 'a' }, { id: 'b' }], deepDives: [], diagrams: [] });
    const v13 = { ...v14, schemaVersion: V13 };
    expect(withoutFigurePlan(v13)).toBe(v13);
  });
});

// ---- Figure advice -------------------------------------------------------------------------------------------------------------------

const RULES = [{ id: 'figure-information-floor', version: 1 }, { id: 'figure-duplicate', version: 1 }, { id: 'figure-mixed-levels', version: 1 }];
const el = (id: string, label = id, over: Doc = {}): Doc => ({ id, label, type: 'module', epistemic: 'inferred', citations: [], ...over });
const rel = (id: string, from: string, to: string, relation = 'calls', label = 'calls'): Doc => ({ id, from, to, relation, label, epistemic: 'inferred', citations: [] });
const derived = (id: string, from: string, to: string): Doc => ({ id, from, to, relation: 'contains', basis: 'derived' });
const gview = (id: string, elements: string[], relationships: string[], kind = 'flow', disposition = 'produced'): Doc =>
  ({ id, kind, home: section('a'), disposition: { kind: disposition }, view: { elements, relationships } });
const cview = (id: string, elements: string[]): Doc => ({ id, kind: 'containment', home: section('a'), disposition: { kind: 'produced' }, view: { elements } });
const lanes = (id: string, steps: number): Doc => ({ id, kind: 'swimlane', home: section('a'), disposition: { kind: 'produced' },
  lanes: [{ id: `${id}-l`, label: 'Lane' }], steps: Array.from({ length: steps }, (_, k) => ({ id: `${id}-s${k}`, lane: `${id}-l`, label: `Step ${k}` })) });
const messages = (id: string, pairs: [string, string, string][]): Doc => ({ id, kind: 'sequence', home: section('a'), disposition: { kind: 'produced' },
  participants: [...new Set(pairs.flatMap(([from, to]) => [from, to]))].map((name) => ({ id: `${id}-${name}`, label: name })),
  messages: pairs.map(([from, to, label], k) => ({ id: `${id}-m${k}`, from: `${id}-${from}`, to: `${id}-${to}`, label })) });
const advised = (elements: Doc[], relationships: Doc[], diagrams: Doc[]): Doc => ({ schemaVersion: V14, model: { elements, relationships }, diagrams });
const rule = (doc: Doc, id: string) => figureAdvice(doc)!.advisories.filter((advisory) => advisory.rule === id).map(({ diagram, at, detail }) => ({ diagram, at, detail }));

describe('figure advice: the information floor', () => {
  it('advises on the scenario\'s first, second, fifth, seventh and ninth figures, and examines no omitted figure', () => {
    const doc = advised(
      ['a', 'b', 'c', 'd', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x'].map((id) => el(id))
        .map((element) => (element.id === 'q' ? { ...element, parent: 'p' } : element.id === 'r' ? { ...element, parent: 'q' }
          : ['t', 'u', 'v'].includes(element.id) ? { ...element, parent: 's' } : element)),
      [rel('ab', 'a', 'b'), rel('bc', 'b', 'c'), rel('ac', 'a', 'c'), rel('cd', 'c', 'd'), rel('ca', 'c', 'a'), rel('ba', 'b', 'a')],
      [
        gview('chain3', ['a', 'b', 'c'], ['ab', 'bc']),
        gview('fan3', ['a', 'b', 'c'], ['ab', 'ac'], 'boundary'),
        gview('chain4', ['a', 'b', 'c', 'd'], ['ab', 'bc', 'cd']),
        gview('dense3', ['a', 'b', 'c'], ['ab', 'bc', 'ca'], 'dependency'),
        lanes('lane3', 3), lanes('lane4', 4),
        messages('seq2', [['x', 'y', 'one'], ['y', 'x', 'two']]), messages('seq3', [['x', 'y', 'one'], ['y', 'x', 'two'], ['x', 'y', 'three']]),
        cview('nest3', ['p', 'q', 'r']), cview('four', ['s', 't', 'u', 'v']),
        gview('omitted', ['a', 'b', 'c'], ['ab', 'bc'], 'flow', 'omitted'),
      ]);
    const advice = figureAdvice(doc)!;
    expect(advice.rules).toEqual(RULES);
    expect(advice.examined).toBe(10);
    const detail = (id: string) => `${id}: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold`;
    expect(rule(doc, 'figure-information-floor')).toEqual([
      { diagram: 'chain3', at: '$.diagrams[0]', detail: detail('chain3') },
      { diagram: 'fan3', at: '$.diagrams[1]', detail: detail('fan3') },
      { diagram: 'lane3', at: '$.diagrams[4]', detail: detail('lane3') },
      { diagram: 'seq2', at: '$.diagrams[6]', detail: detail('seq2') },
      { diagram: 'nest3', at: '$.diagrams[8]', detail: detail('nest3') },
    ]);
  });
});

describe('figure advice: duplicates', () => {
  const A = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const B = ['b1', 'b2', 'b3', 'b4', 'b5'];
  const LABELS: Record<string, string> = { a1: 'Gateway', a2: 'Auth Service', a3: 'Store', a4: 'Queue', a5: 'Worker', b1: '  GATEWAY ', b2: 'auth\t\tservice', b3: 'store', b4: 'QUEUE', b5: 'worker' };
  const doc = advised(
    [...A, ...B, 'extra', 'ws', 'api', 'web', 'ws2', 'api2'].map((id) => el(id, LABELS[id] ?? id))
      .map((element) => (element.id === 'ws' ? { ...element, label: 'Workspace' } : element.id === 'api' ? { ...element, label: 'api', parent: 'ws' }
        : element.id === 'web' ? { ...element, label: 'web', parent: 'ws' } : element.id === 'ws2' ? { ...element, label: 'workspace' }
          : element.id === 'api2' ? { ...element, label: 'API', parent: 'ws2' } : element)),
    [rel('r1', 'a1', 'a2'), rel('r2', 'a2', 'a3'), rel('r3', 'a3', 'a4'), rel('r4', 'a4', 'a5'), rel('rx', 'a5', 'extra'),
      rel('s1', 'b1', 'b2', 'calls', 'own one'), rel('s2', 'b2', 'b3', 'calls', 'own two'), rel('s3', 'b3', 'b4', 'calls', 'own three'), rel('s4', 'b4', 'b5', 'calls', 'own four'),
      rel('back', 'a4', 'a3')],
    [
      gview('a', A, ['r1', 'r2', 'r3', 'r4']),
      gview('b', B, ['s1', 's2', 's3', 's4'], 'dependency'),
      gview('c', ['a1', 'a2', 'a3', 'a4'], ['r1', 'r2', 'r3']),
      gview('d', [...A, 'extra'], ['r1', 'r2', 'r3', 'r4']),
      gview('e', A, ['r1', 'r2', 'back', 'r4']),
      messages('seq', [['Gateway', 'Auth Service', 'm1'], ['Auth Service', 'Store', 'm2'], ['Store', 'Queue', 'm3'], ['Queue', 'Worker', 'm4']]),
      cview('k1', ['ws', 'api', 'web']),
      cview('k2', ['ws2', 'api2']),
      messages('q1', [['x', 'y', 'ping'], ['y', 'x', 'pong']]),
      messages('q2', [['y', 'x', 'pong'], ['x', 'y', 'ping']]),
      gview('g', [...A, 'extra'], ['r1', 'r2', 'r3', 'r4']),
    ]);
  const detail = (id: string, other: string) => `${id}: everything it draws is drawn by ${other}; keep one figure, or draw what the other does not`;

  it('advises on a, b, c, k2, q2 and g, each naming the scenario\'s other figure, and on none of d, e, the sequence, k1 or q1', () => {
    expect(rule(doc, 'figure-duplicate')).toEqual([
      { diagram: 'a', at: '$.diagrams[0]', detail: detail('a', 'd') },
      { diagram: 'b', at: '$.diagrams[1]', detail: detail('b', 'a') },
      { diagram: 'c', at: '$.diagrams[2]', detail: detail('c', 'a') },
      { diagram: 'k2', at: '$.diagrams[7]', detail: detail('k2', 'k1') },
      { diagram: 'q2', at: '$.diagrams[9]', detail: detail('q2', 'q1') },
      { diagram: 'g', at: '$.diagrams[10]', detail: detail('g', 'd') },
    ]);
  });

  it('compares swimlanes by their lanes and steps', () => {
    const swim = advised([], [], [lanes('l1', 4), lanes('l2', 4)]);
    expect(rule(swim, 'figure-duplicate')).toEqual([{ diagram: 'l2', at: '$.diagrams[1]', detail: detail('l2', 'l1') }]);
  });

  it('never advises on a figure that draws boxes alone', () => {
    const boxes = advised([el('x'), el('y')], [], [gview('one', ['x', 'y'], []), gview('two', ['x', 'y'], [])]);
    expect(rule(boxes, 'figure-duplicate')).toEqual([]);
  });

  it('keys a label by trimming the six white-space characters, folding their runs and lowercasing A to Z alone', () => {
    expect(labelKey(' \t Auth\n\r Service\u000b ')).toBe('auth service');
    expect(labelKey('\u00a0\u00c9COLE \u00c0B\u00a0')).toBe('\u00a0\u00c9cole \u00c0b\u00a0');
  });
});

describe('figure advice: mixed levels', () => {
  const ROOT = { kind: 'repository-root' };
  const tld = (p: string) => ({ kind: 'top-level-directory', path: p });
  const ELEMENTS = [
    el('root', 'root', { unit: ROOT }), el('src', 'src', { parent: 'root', unit: tld('src') }), el('lib', 'lib', { unit: tld('lib') }), el('app', 'app', { parent: 'lib' }),
    el('pkgs', 'pkgs', { unit: tld('packages') }), el('pack', 'pack', { unit: tld('pack') }), el('core', 'core', { unit: { kind: 'package-manifest', path: 'packages/core/package.json' } }),
    el('svc', 'svc', { type: 'service' }), el('mod', 'mod', { parent: 'svc' }), el('x'), el('y'),
  ];
  const RELS = [rel('lib-root', 'lib', 'root'), derived('root-lib', 'root', 'lib'), rel('root-pkgs', 'root', 'pkgs', 'contains', 'holds'), rel('pkgs-core', 'pkgs', 'core', 'contains', 'holds'),
    rel('svc-mod', 'svc', 'mod'), rel('svc-mod-c', 'svc', 'mod', 'contains', 'holds')];
  const doc = advised(ELEMENTS, RELS, [
    gview('f1', ['lib', 'root'], ['lib-root']), gview('f2', ['lib', 'root'], ['root-lib']), gview('f3', ['pkgs', 'core'], []), gview('f4', ['pack', 'core'], []),
    gview('f5', ['x', 'y'], []), cview('f6', ['root', 'src']), cview('f7', ['root', 'lib', 'app']), gview('f8', ['root', 'pkgs', 'core'], ['root-pkgs', 'pkgs-core']),
    gview('f9', ['svc', 'mod'], ['svc-mod']), gview('f10', ['svc', 'mod'], ['svc-mod-c']), cview('f11', ['root', 'app']),
  ]);
  const detail = (id: string, x: string, y: string) => `${id}: ${x} and ${y} stand for a part and a part within it, and the figure does not show that one holds the other; draw one level, or show the containment`;

  it('advises on f1, f3, f7 and f9, and on none of f2, f4, f5, f6, f8, f10 or f11', () => {
    expect(rule(doc, 'figure-mixed-levels')).toEqual([
      { diagram: 'f1', at: '$.diagrams[0]', detail: detail('f1', 'root', 'lib') },
      { diagram: 'f3', at: '$.diagrams[2]', detail: detail('f3', 'pkgs', 'core') },
      { diagram: 'f7', at: '$.diagrams[6]', detail: detail('f7', 'root', 'lib') },
      { diagram: 'f9', at: '$.diagrams[8]', detail: detail('f9', 'svc', 'mod') },
    ]);
  });

  it('ends a parent walk at an element already reached and at a parent naming no element', () => {
    const looped = advised([el('p', 'p', { parent: 'q' }), el('q', 'q', { parent: 'p' }), el('r', 'r', { parent: 'ghost' })], [], [gview('loop', ['p', 'q', 'r'], [])]);
    expect(rule(looped, 'figure-mixed-levels')).toEqual([{ diagram: 'loop', at: '$.diagrams[0]', detail: detail('loop', 'p', 'q') }]);
  });

  it('reads no repository root as enclosing another root or a dependency name, and a directory only its own path\'s manifests, jobs and services', () => {
    const units = advised([
      el('r1', 'r1', { unit: ROOT }), el('r2', 'r2', { unit: ROOT }), el('dep', 'dep', { unit: { kind: 'dependency-name', ecosystem: 'npm', name: 'left-pad' } }),
      el('d', 'd', { unit: tld('web') }), el('job', 'job', { unit: { kind: 'workflow-job', path: 'webx/ci.yml', job: 'build' } }),
    ], [], [gview('u', ['r1', 'r2', 'dep'], []), gview('v', ['d', 'job'], [])]);
    expect(rule(units, 'figure-mixed-levels')).toEqual([]);
  });
});

describe('figure advice: other drafts', () => {
  it('is computed for a v14 draft alone', () => {
    expect(figureAdvice({ schemaVersion: V13, diagrams: [] })).toBeUndefined();
    expect(figureAdvice({ schemaVersion: V14, diagrams: [] })).toEqual({ rules: RULES, examined: 0, advisories: [] });
  });
});
