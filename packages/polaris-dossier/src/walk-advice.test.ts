import { describe, expect, it } from 'vitest';
import type { BaseMaps } from './derived-base.js';
import { adviceWords, restates, walkAdvice, type WalkAdviceScreen } from './walk-advice.js';

// Rule `walk-step-restates-label` version 1 (REQ-polaris-generation-034 version 2.51, syzygy-3efd.35). Every expected value is a literal,
// written from the requirement's text and from the reference reading `docs/evidence/syzygy-3efd-35/restates_reference.py` before this
// module ran; nothing here is computed by the module under test.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('the reference reading\'s 19 cases (restates_reference.py)', () => {
  const CASES: readonly [string, string, boolean][] = [
    ['The request router.', 'Request router', true],
    ['Each client opens one connection per request.', 'Client', false],
    ['The handler maps a path prefix to one controller.', 'Handler', false],
    ['The Request-Router, shown here!', 'Request router', true],
    ['Request routers.', 'Request router', true],
    ['This is the step shown here.', 'Request router', true],
    ['The request router. It is the router.', 'Request router', true],
    ['Router: the requests', 'Request router', true],
    ['Request routes.', 'Request router', false],
    ['The request router retries.', 'Request router', false],
    ['The request router, 2 of them.', 'Request router', false],
    ['The request router calls the handler.', 'Request router', false],
    ['The request router, 2.', 'Request router', false],
    ['The request router and the handler.', 'Request router', false],
    ['The.', '\u2014', true],
    ['Router.', '\u2014', false],
    ['', 'Router', true],
    ['src: 12 files.', 'src/ (12 files)', true],
    ['The src directory holds the sources.', 'src/ (12 files)', false],
  ];
  it.each(CASES)('%j restating %j is %s', (paragraph, label, expected) => {
    expect(restates(paragraph, label)).toBe(expected);
  });
});

describe('the words of a text (version 2.51)', () => {
  it('lowercases A to Z alone, keeps every other letter and number, and splits at every other code point', () => {
    expect(adviceWords('The Request-Router, shown here!')).toEqual(['the', 'request', 'router', 'shown', 'here']);
    expect(adviceWords('\u00c9COLE \u00e9cole 12\u00bd')).toEqual(['\u00c9cole', '\u00e9cole', '12\u00bd']);
    expect(adviceWords('caf\u00e9 cafe\u0301')).toEqual(['caf\u00e9', 'cafe']);
    expect(adviceWords('a\ud835\udc00b x\ud800y')).toEqual(['a\ud835\udc00b', 'x', 'y']);
    expect(adviceWords('Zone ZIP AZ')).toEqual(['zone', 'zip', 'az']);
    expect(adviceWords('  \t\n ')).toEqual([]);
  });

  it('matches a plural in s or es either way, and nothing nearer', () => {
    expect([restates('boxes', 'box'), restates('box', 'boxes'), restates('routers', 'router'), restates('router', 'routers')]).toEqual([true, true, true, true]);
    expect([restates('routes', 'router'), restates('boxess', 'box'), restates('route', 'router')]).toEqual([false, false, false]);
  });

  it('treats each of the 30 filler words as no word, and no other', () => {
    const FILLER = 'a an and are as at be by for from here in is it its of on or see shown shows step that the then these this those to with';
    expect(restates(FILLER, '\u2014')).toBe(true);
    for (const near of ['was', 'into', 'shows.it', 'steps', 'than', 'thus']) expect(restates(`${FILLER} ${near}`, '\u2014'), near).toBe(near === 'shows.it');
  });
});

const NO_SCREEN: WalkAdviceScreen = { admit: () => 'admitted', hidden: () => false, deniesBelow: () => false };
const V15 = 'polaris-dossier-local-draft-v15', V16 = 'polaris-dossier-local-draft-v16';
const block = (id: string, text: string, children: string[] = []): Doc => ({ id, label: 'inferred', basis: 'source', text, citations: [{ id: `c-${id}` }],
  quotations: [], children: children.map((child, k) => ({ id: `${id}-${k}`, label: 'inferred', text: child })) });
const element = (id: string, label: string): Doc => ({ id, label, type: 'service', epistemic: 'inferred', citations: [{ id: `c-${id}` }] });
const steps = (...pairs: [unknown, string][]): Doc[] => pairs.map(([element, b]) => ({ element, block: b }));
/** The first scenario's draft: a section walking `routing` through `client`, `router` and `handler`. */
const ROUTING = (router = 'The request router.', children: string[] = []): Doc => ({
  schemaVersion: V16,
  model: { elements: [element('client', 'Client'), element('router', 'Request router'), element('handler', 'Handler')], relationships: [] },
  diagrams: [{ id: 'routing', kind: 'flow', home: { kind: 'section', target: 's1' }, view: { elements: ['client', 'router', 'handler'], relationships: [] } }],
  sections: [{ id: 's1', paragraphs: [block('b-client', 'Each client opens one connection per request.'), block('b-router', router, children),
    block('b-handler', 'The handler maps a path prefix to one controller.')],
  walk: { figure: 'routing', steps: steps(['client', 'b-client'], ['router', 'b-router'], ['handler', 'b-handler']) } }],
  deepDives: [],
});
const RULES = [{ id: 'walk-step-restates-label', version: 1 }];
const ROUTER_ADVISORY = { rule: 'walk-step-restates-label', at: '$.sections[0].walk.steps[1]',
  detail: 'routing step 2: paragraph b-router adds no word to its element\'s label; say what a reader learns about that element at this step' };

describe('walk advice over a draft (version 2.51)', () => {
  it('advises on the one step whose paragraph restates its element\'s label', () => {
    expect(walkAdvice(ROUTING(), [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 3, advisories: [ROUTER_ADVISORY] });
  });

  it('case, punctuation, plurals, filler and a restating child draw it; one new word, a number or another label stops it', () => {
    for (const text of ['The Request-Router, shown here!', 'Request routers.', 'This is the step shown here.', 'Router: the requests']) {
      expect(walkAdvice(ROUTING(text), [], {}, NO_SCREEN)?.advisories, text).toEqual([ROUTER_ADVISORY]);
    }
    expect(walkAdvice(ROUTING('The request router.', ['It is the router.']), [], {}, NO_SCREEN)?.advisories).toEqual([ROUTER_ADVISORY]);
    for (const text of ['Request routes.', 'The request router retries.', 'The request router, 2.', 'The request router and the handler.']) {
      expect(walkAdvice(ROUTING(text), [], {}, NO_SCREEN), text).toEqual({ rules: RULES, examined: 3, advisories: [] });
    }
    // A child that explains clears the step: the paragraph is the block's text and its children's, joined by one space.
    expect(walkAdvice(ROUTING('The request router.', ['It retries.']), [], {}, NO_SCREEN)?.advisories).toEqual([]);
    // The join is one space, so the block's last word and a child's first word stay two words.
    expect(walkAdvice(ROUTING('Request', ['router']), [], {}, NO_SCREEN)?.advisories).toEqual([ROUTER_ADVISORY]);
  });

  it('puts a deep dive\'s walk after the sections\', and reads two steps naming one block each', () => {
    const doc = ROUTING();
    doc['diagrams'].push({ id: 'inside', kind: 'boundary', home: { kind: 'deep-dive', target: 'd1' }, view: { elements: ['router', 'handler'], relationships: [] } });
    doc['deepDives'] = [{ id: 'd1', paragraphs: [block('b-d', 'The handler.')], walk: { figure: 'inside', steps: steps(['handler', 'b-d'], ['router', 'b-d']) } }];
    expect(walkAdvice(doc, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 5, advisories: [ROUTER_ADVISORY, { rule: 'walk-step-restates-label',
      at: '$.deepDives[0].walk.steps[0]', detail: 'inside step 1: paragraph b-d adds no word to its element\'s label; say what a reader learns about that element at this step' }] });
  });

  it('is absent for a v15 draft and under a schema finding; reads no walk with a finding at or below its path', () => {
    expect(walkAdvice({ ...ROUTING(), schemaVersion: V15 }, [], {}, NO_SCREEN)).toBeUndefined();
    expect(walkAdvice(ROUTING(), [{ kind: 'schema', at: '$.title', detail: 'x' }], {}, NO_SCREEN)).toBeUndefined();
    expect(walkAdvice(ROUTING(), [{ kind: 'walk', at: '$.sections[0].walk.steps[1].block', detail: 'x' }], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 0, advisories: [] });
    expect(walkAdvice(ROUTING(), [{ kind: 'walk', at: '$.sections[0].walk', detail: 'x' }], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 0, advisories: [] });
    expect(walkAdvice(ROUTING(), [{ kind: 'walk', at: '$.sections[0].walk[0]', detail: 'x' }], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 0, advisories: [] });
    // A finding elsewhere, and one at a path that only shares the walk's prefix, leave the walk read.
    expect(walkAdvice(ROUTING(), [{ kind: 'walk', at: '$.sections[0].walker', detail: 'x' }, { kind: 'view-shape', at: '$.diagrams[0]', detail: 'x' }], {}, NO_SCREEN)?.examined).toBe(3);
    const none = ROUTING();
    delete none['sections'][0]['walk'];
    expect(walkAdvice(none, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 0, advisories: [] });
  });

  it('labels a node of a diagram that carries no view by its own label', () => {
    const doc = ROUTING();
    doc['diagrams'][0] = { id: 'routing', kind: 'flow', home: { kind: 'section', target: 's1' },
      nodes: [{ id: 'client', label: 'Client' }, { id: 'router', label: 'Front door' }, { id: 'handler', label: 'Handler' }] };
    expect(walkAdvice(doc, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 3, advisories: [] });
    doc['sections'][0]['paragraphs'][1]['text'] = 'The front door.';
    expect(walkAdvice(doc, [], {}, NO_SCREEN)?.advisories).toEqual([ROUTER_ADVISORY]);
  });
});

describe('walk advice called directly, with no finding to skip a walk by (review R35, note 4)', () => {
  const NONE = { rules: RULES, examined: 0, advisories: [] };
  it('skips a walk whose figure is of no graph kind, missing, or whose walk is malformed, and counts it nowhere', () => {
    const sequence = ROUTING();
    sequence['diagrams'][0]['kind'] = 'sequence';
    expect(walkAdvice(sequence, [], {}, NO_SCREEN)).toEqual(NONE);
    const missing = ROUTING();
    missing['sections'][0]['walk']['figure'] = 'elsewhere';
    expect(walkAdvice(missing, [], {}, NO_SCREEN)).toEqual(NONE);
    const malformed = ROUTING();
    malformed['sections'][0]['walk']['steps'] = 'steps';
    expect(walkAdvice(malformed, [], {}, NO_SCREEN)).toEqual(NONE);
  });

  it('skips a step whose block or node it cannot find, and reads the walk\'s other steps', () => {
    const noBlock = ROUTING();
    noBlock['sections'][0]['walk']['steps'][1]['block'] = 'b-gone';
    expect(walkAdvice(noBlock, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 2, advisories: [] });
    const noNode = ROUTING();
    noNode['diagrams'][0] = { id: 'routing', kind: 'flow', home: { kind: 'section', target: 's1' },
      nodes: [{ id: 'client', label: 'Client' }, { id: 'handler', label: 'Handler' }] };
    expect(walkAdvice(noNode, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 2, advisories: [] });
  });

  it('labels by the figure\'s own node where a view kind carries no view, never by the model element of that id', () => {
    const doc = ROUTING();
    doc['diagrams'][0] = { id: 'routing', kind: 'boundary', home: { kind: 'section', target: 's1' },
      nodes: [{ id: 'client', label: 'Client' }, { id: 'router', label: 'Front door' }, { id: 'handler', label: 'Handler' }] };
    expect(walkAdvice(doc, [], {}, NO_SCREEN)).toEqual({ rules: RULES, examined: 3, advisories: [] });
    doc['sections'][0]['paragraphs'][1]['text'] = 'The front door.';
    expect(walkAdvice(doc, [], {}, NO_SCREEN)?.advisories).toEqual([ROUTER_ADVISORY]);
  });
});

describe('a base element\'s step (version 2.51)', () => {
  const unit = (manifest: string, name: string) => ({ path: `${manifest}#1`, factId: `_manifest-${name}`, label: name, name, compared: name,
    epistemic: 'inferred' as const, unknownReason: null, unit: { kind: 'package-manifest' as const, path: manifest }, manifest });
  const MAPS: BaseMaps = { units: { map: 'units', elements: [unit('api/package.json', 'api'), unit('web/package.json', 'web')], contains: [],
    notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 } } };
  /** A view of the unit map showing both packages, named `Interface` by a display name, walked from `api` to `runtime`. */
  const doc = (text: string): Doc => ({
    schemaVersion: V16,
    model: { elements: [element('runtime', 'Runtime')], relationships: [] },
    diagrams: [{ id: 'pkgs', kind: 'boundary', home: { kind: 'section', target: 's1' }, view: { elements: ['runtime'], relationships: [],
      base: { map: 'units', select: ['api/package.json', 'web/package.json'], restReason: 'Rest', names: [{ path: 'api/package.json', label: 'Interface', epistemic: 'inferred', citations: [] }] } } }],
    sections: [{ id: 's1', paragraphs: [block('b-api', text), block('b-run', 'Runs everything.')],
      walk: { figure: 'pkgs', steps: steps([{ map: 'units', path: 'api/package.json' }, 'b-api'], ['runtime', 'b-run']) } }],
    deepDives: [],
  });
  const ADVISED = { rules: RULES, examined: 2, advisories: [{ rule: 'walk-step-restates-label', at: '$.sections[0].walk.steps[0]',
    detail: 'pkgs step 1: paragraph b-api adds no word to its element\'s label; say what a reader learns about that element at this step' }] };

  it('reads Syzygy\'s label, never the display name, and names no path or label in the detail', () => {
    expect(walkAdvice(doc('The api.'), [], MAPS, NO_SCREEN)).toEqual(ADVISED);
    expect(walkAdvice(doc('The interface.'), [], MAPS, NO_SCREEN)).toEqual({ rules: RULES, examined: 2, advisories: [] });
  });

  it('does not read or count the step where the map is not established, or the element is hidden, withheld or Unknown in screening', () => {
    const notRead = { rules: RULES, examined: 1, advisories: [] };
    expect(walkAdvice(doc('The api.'), [], {}, NO_SCREEN)).toEqual(notRead);
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, hidden: (p) => p === 'api/package.json' })).toEqual(notRead);
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, admit: (v) => (v === 'api/package.json' ? 'withheld' : 'admitted') })).toEqual(notRead);
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, admit: (v) => (v === 'api' ? 'withheld' : 'admitted') })).toEqual(notRead);
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, admit: (v) => (v === 'api' ? 'unavailable' : 'admitted') })).toEqual(notRead);
    // Another element's screening does not reach this step.
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, hidden: (p) => p === 'web/package.json' })).toEqual(ADVISED);
  });

  it('asks of a directory, never of a unit\'s manifest path, whether a denied-directory rule names it (version 2.51 as 2.55 reads it)', () => {
    // A unit's manifest path is a file path: a denied-directory answer for it does not withhold the step.
    expect(walkAdvice(doc('The api.'), [], MAPS, { ...NO_SCREEN, deniesBelow: (p) => p === 'api/package.json' })).toEqual(ADVISED);
    const directory = (path: string) => ({ path, factId: `_derived-${path}`, label: `${path}/ (1 file)`, name: `${path}/`, compared: path,
      epistemic: 'observed' as const, unknownReason: null, unit: { kind: 'top-level-directory' as const, path } });
    const DIRS: BaseMaps = { directories: { map: 'directories', elements: [directory('src'), directory('.kube')], contains: [],
      notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 } } };
    const walked: Doc = {
      schemaVersion: V16,
      model: { elements: [element('runtime', 'Runtime')], relationships: [] },
      diagrams: [{ id: 'dirs', kind: 'boundary', home: { kind: 'section', target: 's1' }, view: { elements: ['runtime'], relationships: [],
        base: { map: 'directories', select: ['src', '.kube'], restReason: 'Rest', names: [] } } }],
      sections: [{ id: 's1', paragraphs: [block('b-kube', 'The kube.'), block('b-run', 'Runs everything.')],
        walk: { figure: 'dirs', steps: steps([{ map: 'directories', path: '.kube' }, 'b-kube'], ['runtime', 'b-run']) } }],
      deepDives: [],
    };
    expect(walkAdvice(walked, [], DIRS, NO_SCREEN)).toEqual({ rules: RULES, examined: 2, advisories: [{ rule: 'walk-step-restates-label',
      at: '$.sections[0].walk.steps[0]', detail: 'dirs step 1: paragraph b-kube adds no word to its element\'s label; say what a reader learns about that element at this step' }] });
    expect(walkAdvice(walked, [], DIRS, { ...NO_SCREEN, deniesBelow: (p) => p === '.kube' })).toEqual({ rules: RULES, examined: 1, advisories: [] });
    expect(walkAdvice(walked, [], DIRS, { ...NO_SCREEN, deniesBelow: (p) => p === 'src' })?.examined).toBe(2);
  });
});
