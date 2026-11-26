import { isRecord } from '@syzygy/support';
import { READER_STANDARDS_VERSION } from './reader-standards.js';
import { NO_LAYOUT, type FigureFitEntry } from './figure-fit.js';
import { WORTH_KNOWING_CEILING, WORTH_KNOWING_FIELD, WORTH_KNOWING_NONE_FIELD, hasFigureKindForm, hasSubsectionForm, hasWorthKnowingForm } from './draft-schema.js';

/** The counted reader standards (`reader-standards.ts`, syzygy-pdja.17): what `syzygy dossier check` can measure of RS-13, RS-14, RS-16,
 * RS-17 (an edge's locality, syzygy-3efd.17) and RS-19 in a draft, reported to the author as advice. Advice is never a finding: it sets no outcome, is on the check's report only
 * (never the stored check record, like the screen census, which since version 2.4 keeps only its counts per page in `readingLedger`), and the rendered-design review still judges every page. Pure. */

export type ReaderStandardId = 'RS-13' | 'RS-14' | 'RS-16' | 'RS-17' | 'RS-19';

export interface ReaderAdvisory {
  readonly standard: ReaderStandardId;
  /** A JSON path into the draft. */
  readonly at: string;
  readonly detail: string;
}

export interface ReaderAdvice {
  readonly standards: typeof READER_STANDARDS_VERSION;
  readonly note: string;
  readonly advisories: readonly ReaderAdvisory[];
  /** The worth-knowing count advice (version 2.26): on a schema-v13 draft only, so an earlier draft's advice keeps its bytes. */
  readonly worthKnowing?: readonly WorthKnowingAdvisory[];
  /** The choice floor (version 2.33): on a schema-v13 draft only, like `worthKnowing`. */
  readonly choiceFloor?: readonly ChoiceFloorAdvisory[];
}

/** One item of the choice floor (REQ-polaris-generation-034 version 2.33, syzygy-5dhm.43): a Pole (or, in a draft with no Poles, the
 * draft) with fewer than `CHOICE_FLOOR` choices or trade-offs on record. Advice like the rest: it sets no outcome. */
export interface ChoiceFloorAdvisory {
  /** A JSON path into the draft: the Pole, or `$.sections` for a draft with no Poles. */
  readonly at: string;
  /** The Inferred items of the understanding record's `choices` and `tradeOffs` counted for this Pole. */
  readonly onRecord: number;
  readonly detail: string;
}

/** A Pole with fewer than this many choices or trade-offs on record is advised (version 2.33). */
export const CHOICE_FLOOR = 3;

/** The groups the per-Pole counts run over: each Pole with the sections it names, each section in the first Pole naming it; or, for a
 * draft that declares no Poles, the whole draft at `$.sections`. */
function poleGroups(doc: Readonly<Record<string, unknown>>, sectionIds: readonly string[]): { at: string; sections: readonly string[]; pole: Readonly<Record<string, unknown>> | undefined; name: string }[] {
  const counted = new Set<string>();
  return Array.isArray(doc['poles'])
    ? doc['poles'].flatMap((pole, i) => (isRecord(pole) ? [{
      at: `$.poles[${i}]`, pole, name: `the Pole ${JSON.stringify(text(pole['label']) ?? '')}`,
      sections: list(pole['sections']).filter((id): id is string => typeof id === 'string' && !counted.has(id) && (counted.add(id), true)),
    }] : []))
    : [{ at: '$.sections', sections: sectionIds, pole: undefined, name: 'the draft' }];
}

/** Every path a citation names anywhere inside `value`: a claim's `citations` and a code excerpt's `citation`. */
function citedPathsIn(value: unknown, into: Set<string>): Set<string> {
  if (Array.isArray(value)) { for (const entry of value) citedPathsIn(entry, into); return into; }
  if (!isRecord(value)) return into;
  for (const [key, member] of Object.entries(value)) {
    if (key === 'citations') for (const citation of list(member)) { const path = isRecord(citation) ? text(citation['path']) : undefined; if (path !== undefined) into.add(path); }
    else if (key === 'citation' && isRecord(member)) { const path = text(member['path']); if (path !== undefined) into.add(path); }
    else citedPathsIn(member, into);
  }
  return into;
}

/** The choice floor (REQ-polaris-generation-034 version 2.33, rule `choice-floor` version 1). On record are the items of the understanding
 * record's `choices` and `tradeOffs` labelled Inferred. An item is on record for a Pole when a file it cites is a file some claim, element
 * or excerpt of the Pole's sections cites (each section counted in the first Pole naming it); for a draft with no Poles every such item is
 * on record for the draft. A Pole with fewer than `CHOICE_FLOOR` is one advisory. Undefined for a draft before v13. */
export function choiceFloorAdvice(doc: Readonly<Record<string, unknown>>): readonly ChoiceFloorAdvisory[] | undefined {
  if (!hasWorthKnowingForm(doc['schemaVersion'])) return undefined;
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  const items = (['choices', 'tradeOffs'] as const).flatMap((item) => list(understanding[item]))
    .filter((entry): entry is Readonly<Record<string, unknown>> => isRecord(entry) && entry['label'] === 'inferred')
    .map((entry) => citedPathsIn(entry['citations'] === undefined ? [] : { citations: entry['citations'] }, new Set()));
  const sections = new Map<string, unknown>();
  for (const section of list(doc['sections'])) if (isRecord(section) && text(section['id']) !== undefined && !sections.has(text(section['id'])!)) sections.set(text(section['id'])!, section);
  const out: ChoiceFloorAdvisory[] = [];
  for (const group of poleGroups(doc, [...sections.keys()])) {
    const cited = new Set<string>();
    if (group.pole !== undefined) for (const id of group.sections) citedPathsIn(sections.get(id), cited);
    const onRecord = group.pole === undefined ? items.length : items.filter((paths) => [...paths].some((path) => cited.has(path))).length;
    if (onRecord >= CHOICE_FLOOR) continue;
    out.push({ at: group.at, onRecord, detail: `${group.name} has ${onRecord} ${onRecord === 1 ? 'choice or trade-off' : 'choices or trade-offs'} on record, fewer than ${CHOICE_FLOOR}: where its source shows a decision this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record's \`choices\` or \`tradeOffs\`${group.pole === undefined ? '' : ' citing a file its sections cite'}; never record one its source does not show` });
  }
  return out;
}

/** One item of the worth-knowing count advice: a Pole (or, in a draft with no Poles, the draft) with no marked block and no reason why, or
 * with more marked blocks than the brief asks for. Advice like the rest: it sets no outcome. */
export interface WorthKnowingAdvisory {
  /** A JSON path into the draft: the Pole, or `$.sections` for a draft with no Poles. */
  readonly at: string;
  readonly marked: number;
  readonly detail: string;
}

/** The count advice for the worth-knowing mark (REQ-polaris-generation-034 version 2.26). Counts the blocks marked `worthKnowing: true`
 * among the section paragraphs of each Pole (each section counted in the first Pole naming it), or of the whole draft where it declares no
 * Poles: none, where the Pole gives no `worthKnowingNone`, and more than the ceiling are each one advisory. Undefined for a draft before v13. */
export function worthKnowingAdvice(doc: Readonly<Record<string, unknown>>): readonly WorthKnowingAdvisory[] | undefined {
  if (!hasWorthKnowingForm(doc['schemaVersion'])) return undefined;
  const marks = new Map<string, number>();
  list(doc['sections']).forEach((section) => {
    if (!isRecord(section) || text(section['id']) === undefined) return;
    marks.set(text(section['id'])!, list(section['paragraphs']).filter((entry) => isRecord(entry) && entry[WORTH_KNOWING_FIELD] === true).length);
  });
  const groups: { at: string; sections: readonly string[]; none: boolean; name: string }[] = Array.isArray(doc['poles'])
    ? doc['poles'].flatMap((pole, i) => (isRecord(pole) ? [{
      at: `$.poles[${i}]`, sections: list(pole['sections']).filter((id): id is string => typeof id === 'string'),
      none: text(pole[WORTH_KNOWING_NONE_FIELD]) !== undefined, name: `the Pole ${JSON.stringify(text(pole['label']) ?? '')}`,
    }] : []))
    : [{ at: '$.sections', sections: [...marks.keys()], none: false, name: 'the draft' }];
  const counted = new Set<string>();
  const out: WorthKnowingAdvisory[] = [];
  for (const group of groups) {
    const marked = group.sections.reduce((sum, id) => { if (counted.has(id)) return sum; counted.add(id); return sum + (marks.get(id) ?? 0); }, 0);
    if (marked === 0 && !group.none) {
      // A draft with no Poles has nowhere to say why it marks none, so its advice names no such member (version 2.26).
      out.push({ at: group.at, marked, detail: group.at === '$.sections'
        ? `${group.name} marks no block worth knowing: mark one to ${WORTH_KNOWING_CEILING} cited facts a newcomer would not guess from the kind of project this is, where any meets that test; a draft with no Poles has no place to say why none does, so this advice stands until one is marked`
        : `${group.name} marks no block worth knowing: mark one to ${WORTH_KNOWING_CEILING} cited facts a newcomer would not guess from the kind of project this is, or, where none meets that test, say why in its \`${WORTH_KNOWING_NONE_FIELD}\`` });
    } else if (marked > WORTH_KNOWING_CEILING) {
      out.push({ at: group.at, marked, detail: `${group.name} marks ${marked} blocks worth knowing, past ${WORTH_KNOWING_CEILING}: keep the ones a newcomer would least guess and drop the mark from the rest` });
    }
  }
  return out;
}

/** The class of an item of check's advice to the author (REQ-polaris-generation-034 version 2.9, syzygy-3efd.64): `author` where a change to
 * the draft can clear it; `mechanism` where no change to the content of the draft's figures can, and the remedy lies in Syzygy's renderer,
 * layout, stylesheet or schema. */
export type AdviceClass = 'author' | 'mechanism';

/** The rules by which a figure-fit entry is `mechanism`, each at version 1. */
export const MECHANISM_RULES = [{ id: 'no-figure-layout', version: 1 }, { id: 'graph-without-narrow-form', version: 1 }] as const;
export type MechanismRuleId = (typeof MECHANISM_RULES)[number]['id'];

/** The width of a drawing the readable layout lays out in two columns: the least it gives a figure with an arrow whose ends lie in two
 * columns, so no change confined to the figure's graph members draws such a figure in a narrower column. */
export const TWO_COLUMN_WIDTH_PX = 648;

/** Every reader advisory is `author` at this version: each is cleared by retitling, cutting, drawing, citing or merging in the draft. */
export const readerAdvisoryClass = (_advisory: ReaderAdvisory): AdviceClass => 'author';

/** The `mechanism` rule a figure-fit entry falls under, or null where it is `author`. A function of the entry alone: only a graph figure's
 * entry carries numbers, since a figure of the other v7 kinds is drawn at the column's width and never fails. */
export function mechanismRuleOf(entry: FigureFitEntry): MechanismRuleId | null {
  if ('unknown' in entry) return entry.unknown === NO_LAYOUT ? 'no-figure-layout' : null;
  return entry.columnPx < TWO_COLUMN_WIDTH_PX && entry.laidOutPx >= TWO_COLUMN_WIDTH_PX ? 'graph-without-narrow-form' : null;
}

export const figureFitClass = (entry: FigureFitEntry): AdviceClass => (mechanismRuleOf(entry) === null ? 'author' : 'mechanism');

/** RS-14: at most this many deep dives. */
export const DEEP_DIVE_LIMIT = 3;
/** RS-19: about this many words of a section's own prose, outside its diagrams and elements. */
export const SECTION_WORD_LIMIT = 300;

const NOTE = `Advice from the counted reader standards (${READER_STANDARDS_VERSION}): it sets no outcome, and the check record keeps only how many advisories of each standard fall on each page (its readingLedger), never an advisory itself; the design review still judges every page.`;

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const SOURCE_FILE = /\b[\w-]+\.(?:c|h|cc|cpp|hpp|rs|go|py|rb|java|kt|js|mjs|ts|tsx|jsx|cs|swift|php|lua|sh|json|ya?ml|toml|md|ini|conf|cfg)\b/giu;

/** Product and project names written as two or more capitalised parts, which the PascalCase shape would otherwise flag (syzygy-pdja.25).
 * An explicit list: a name not on it is flagged, and the advice's detail already tells the author a product or proper name may stay. */
const PRODUCT_NAMES: ReadonlySet<string> = new Set([
  'GitHub', 'GitLab', 'BitBucket', 'JavaScript', 'TypeScript', 'CoffeeScript', 'ActionScript', 'PowerShell', 'WebAssembly', 'WebKit',
  'WebSocket', 'WebSockets', 'YouTube', 'WordPress', 'LinkedIn', 'PayPal', 'DigitalOcean', 'CloudFront', 'CloudWatch', 'CloudFormation',
  'EventBridge', 'BigQuery', 'ClickHouse', 'OpenStack', 'OpenShift', 'OpenTelemetry', 'OpenSearch', 'OpenTofu', 'LibreOffice',
  'TensorFlow', 'PyTorch', 'NumPy', 'SciPy', 'SymPy', 'PyPy', 'LangChain', 'HashiCorp', 'JetBrains', 'WebStorm', 'PhpStorm', 'PyCharm',
  'ReSharper', 'NuGet', 'SonarQube', 'PagerDuty', 'PlanetScale', 'MkDocs', 'DevOps', 'GitOps', 'MacBook', 'AirPods', 'FaceTime',
  'PlayStation', 'SharePoint', 'OneDrive', 'VirtualBox', 'WireGuard', 'BitTorrent', 'SpriteKit', 'AppKit', 'MicroPython',
  'CircuitPython', 'DeepMind', 'HuggingFace', 'SoundCloud', 'NeoVim', 'MacPorts', 'RedisInsight', 'CouchBase', 'DragonFly',
]);

/** A two-part capitalised surname (McCarthy, MacArthur): a proper name, never code. */
const SURNAME = /^Ma?c[A-Z][a-z]+$/u;

/** camelCase product names that end in an initialism run (macOS), the reason the pdja.18 narrowing stopped flagging that shape. */
const INITIALISM_PRODUCT_NAMES: ReadonlySet<string> = new Set(['macOS', 'tvOS', 'watchOS', 'visionOS', 'bridgeOS', 'openSUSE', 'phpBB', 'cuDNN', 'cuBLAS']);

/** JavaScript projects that name themselves as a lowercase `.js` file; a capitalised one (Node.js, Next.js) is read by its stem. */
const LOWERCASE_JS_PROJECTS: ReadonlySet<string> = new Set(['d3.js', 'three.js', 'p5.js', 'ml5.js', 'pixi.js', 'tone.js', 'anime.js', 'paper.js', 'two.js', 'matter.js']);

/** Conventional capitalised stems of a JavaScript source file (App.js, Server.js, Index.js), none of them a JavaScript project's name. */
const JS_FILE_STEMS: ReadonlySet<string> = new Set([
  'App', 'Index', 'Main', 'Server', 'Client', 'Router', 'Routes', 'Store', 'Config', 'Utils', 'Helpers', 'Home', 'Layout', 'Header',
  'Footer', 'Root', 'Page', 'Component', 'Components', 'Api', 'Constants', 'Types', 'Model', 'Models', 'Controller', 'Service', 'Worker',
]);

/** A path written with one slash that starts at a conventional source directory or a Go standard-library root (src/server, net/http,
 * lib/utils). Lowercase heads only, so the prose pairs the pdja.18 narrowing silenced (read/write, I/O, TCP/IP, client/server) stay
 * unflagged. */
const PATH_HEAD = /(?<![\w./-])(?:src|lib|libs|pkg|cmd|internal|include|vendor|deps|tests|bin|scripts|packages|apps|crates|modules|examples|net|os|io)\/[\w.-]/u;

/** A word that starts with two or more capitalised parts (RedisModule, HttpServer), and a camelCase word whose inner capital starts an
 * initialism run (toJSON, getID, innerHTML); each match is the whole word, so a listed name is matched exactly. */
const PASCAL_WORD = /\b(?:[A-Z][a-z0-9]+){2,}\w*/gu;
const INITIALISM_WORD = /\b[a-z]{2,}[A-Z]{2,}\w*/gu;

/** Whether a source-file-shaped name is a JavaScript project's name rather than a file's: a listed lowercase project, or a capitalised
 * `.js` name whose stem is neither a conventional file stem nor an unlisted word of two or more capitalised parts. */
function javaScriptProjectName(name: string): boolean {
  if (LOWERCASE_JS_PROJECTS.has(name)) return true;
  const stem = /^([A-Z][A-Za-z0-9]*)\.js$/u.exec(name)?.[1];
  if (stem === undefined || JS_FILE_STEMS.has(stem)) return false;
  return !/^(?:[A-Z][a-z0-9]+){2,}/u.test(stem) || PRODUCT_NAMES.has(stem);
}

/** Why a title may name a code symbol rather than what it explains, or undefined: a code span, a call, a path, a source file name, or an
 * identifier written in camelCase, PascalCase, snake_case or SCREAMING_CASE.
 *
 * Each shape is narrowed to where prose and product names do not write it (R-PDJA-17-STANDARDS-1 note 2), and widened again where a
 * named list, not the shape, tells the two apart (syzygy-pdja.25, R-PDJA-P3-NOTES-1 finding 1):
 * - a path has a leading or trailing separator, or two, or starts at a conventional source directory (src/server, net/http): any other
 *   single slash between two words is how prose writes a pair (read/write, I/O, TCP/IP, client/server);
 * - a file name is not a JavaScript project's name: a capitalised `.js` name (Node.js, Next.js) whose stem is not a conventional file
 *   stem (App.js, Server.js) or an unlisted two-part PascalCase word (UserList.js), or a listed lowercase one (d3.js, three.js);
 * - a camelCase identifier starts with two or more lowercase letters and has a lowercase letter after its inner capital, where a brand
 *   starts with one (iPhone, gRPC, eBPF), or its inner capital starts an initialism run (toJSON, getID) and it is not a listed product
 *   (macOS, openSUSE);
 * - a PascalCase identifier has two or more capitalised parts and is not a listed product (GitHub, JavaScript) or a surname (McCarthy);
 *   a capital run is an initialism, never a part (PostgreSQL). */
export function codeSymbolInTitle(title: string): string | undefined {
  if (title.includes('`')) return 'it holds a code span';
  if (/\w\(/u.test(title)) return 'it names a call';
  if (/(?:^|\s)\.{0,2}\/[\w.-]|[\w.-]\/[\w.-]+\/|[\w.-]\/(?=$|[\s),.;:!?])/u.test(title) || PATH_HEAD.test(title)) return 'it names a path';
  if ([...title.matchAll(SOURCE_FILE)].some(([name]) => !javaScriptProjectName(name))) return 'it names a file';
  if (/\b[a-z]{2,}[A-Z][a-z0-9]/u.test(title)) return 'it holds a camelCase identifier';
  if ([...title.matchAll(INITIALISM_WORD)].some(([word]) => !INITIALISM_PRODUCT_NAMES.has(word))) return 'it holds a camelCase identifier';
  if ([...title.matchAll(PASCAL_WORD)].some(([word]) => !PRODUCT_NAMES.has(word) && !SURNAME.test(word))) return 'it holds a PascalCase identifier';
  if (/\b[A-Za-z0-9]+_[A-Za-z0-9_]+\b/u.test(title)) return 'it holds a snake_case identifier';
  return undefined;
}

/** The words of an entry's own prose: a plain block's text and its children's; a presentation element (an entry with a `kind`) counts
 * none, since RS-19 counts prose outside the elements. */
export function proseWords(entry: unknown): number {
  if (!isRecord(entry) || entry['kind'] !== undefined) return 0;
  const words = (value: unknown): number => (text(value)?.split(/\s+/u).filter((word) => word !== '').length ?? 0);
  return words(entry['text']) + list(entry['children']).reduce<number>((sum, child) => sum + (isRecord(child) ? words(child['text']) : 0), 0);
}

/** A section's or deep dive's own prose words, as RS-19 counts them: its paragraphs and, in a schema-v8 draft only, each of a section's
 * subsections' answer and plain blocks (version 2.16). The reading ledger counts a container by the same words. */
export function containerProseWords(doc: Readonly<Record<string, unknown>>, container: Readonly<Record<string, unknown>>, part: 'sections' | 'deepDives'): number {
  const own = list(container['paragraphs']).reduce<number>((sum, entry) => sum + proseWords(entry), 0);
  if (part !== 'sections' || !hasSubsectionForm(doc['schemaVersion'])) return own;
  return list(container['subsections']).reduce<number>((sum, subsection) => (isRecord(subsection)
    ? sum + proseWords(subsection['answer']) + list(subsection['paragraphs']).reduce<number>((inner, entry) => inner + proseWords(entry), 0) : sum), own);
}

/** The advice for one parsed draft; a draft that is not an object yields none. */
export function readerAdvice(doc: unknown): ReaderAdvice {
  const advisories: ReaderAdvisory[] = [];
  if (isRecord(doc)) {
    const add = (standard: ReaderStandardId, at: string, detail: string): void => { advisories.push({ standard, at, detail }); };
    const deepDives = list(doc['deepDives']);
    for (const part of ['sections', 'deepDives'] as const) {
      list(doc[part]).forEach((container, i) => {
        if (!isRecord(container)) return;
        const at = `$.${part}[${i}]`;
        const title = text(container['title']);
        const why = title === undefined ? undefined : codeSymbolInTitle(title);
        if (why !== undefined) add('RS-13', `${at}.title`, `the title may name a code symbol (${why}); title it by what it explains to the reader, unless the word is a product or proper name`);
        const words = containerProseWords(doc, container, part);
        if (words > SECTION_WORD_LIMIT) {
          add('RS-19', `${at}.paragraphs`, `${words} words of its own prose, past about ${SECTION_WORD_LIMIT}: move enumerations, comparisons and steps into elements or a diagram, depth a newcomer may skip into details, and cut the rest`);
        }
      });
    }
    if (deepDives.length > DEEP_DIVE_LIMIT) add('RS-14', '$.deepDives', `${deepDives.length} deep dives, past ${DEEP_DIVE_LIMIT}: keep those that answer a question their section cannot, and merge two that serve one question`);
    // A section is drawn by a diagram whose page it is: `sectionId` up to v4, a section `home` from v5 (syzygy-3efd.18).
    const sectionOf = (diagram: Readonly<Record<string, unknown>>): string | undefined => (isRecord(diagram['home'])
      ? (diagram['home']['kind'] === 'section' ? text(diagram['home']['target']) : undefined) : text(diagram['sectionId']));
    const drawn = new Set(list(doc['diagrams']).flatMap((diagram) => (isRecord(diagram) && sectionOf(diagram) !== undefined ? [sectionOf(diagram)!] : [])));
    list(doc['sections']).forEach((section, i) => {
      const id = isRecord(section) ? text(section['id']) : undefined;
      if (id !== undefined && !drawn.has(id)) add('RS-16', `$.sections[${i}]`, `no diagram is drawn for the section ${JSON.stringify(id)}: draw any workflow, mechanism or set of components that talk to each other it explains`);
    });
    // RS-17, locality (syzygy-3efd.17): an edge none of whose cited files is cited by either of its endpoint nodes. Files are compared by
    // path alone, never by line range, so an advisory means the edge's support shares no file with what it connects.
    list(doc['diagrams']).forEach((diagram, i) => {
      if (!isRecord(diagram)) return;
      const citedPaths = (element: unknown): Set<string> =>
        new Set(isRecord(element) ? list(element['citations']).flatMap((c) => (isRecord(c) && text(c['path']) !== undefined ? [text(c['path'])!] : [])) : []);
      const nodes = new Map(list(diagram['nodes']).flatMap((node) => (isRecord(node) && text(node['id']) !== undefined ? [[text(node['id'])!, citedPaths(node)] as const] : [])));
      list(diagram['edges']).forEach((edge, j) => {
        if (!isRecord(edge)) return;
        const from = nodes.get(text(edge['from']) ?? ''), to = nodes.get(text(edge['to']) ?? '');
        const own = citedPaths(edge);
        if (from === undefined || to === undefined || own.size === 0) return;
        if ([...own].some((p) => from.has(p) || to.has(p))) return;
        add('RS-17', `$.diagrams[${i}].edges[${j}]`, `the edge ${JSON.stringify(text(edge['id']) ?? '')} cites no file that its node ${JSON.stringify(text(edge['from']))} or its node ${JSON.stringify(text(edge['to']))} cites: cite where the source shows these two connect, or check that the edge joins the right nodes (polaris-reader-standards-v1 does not yet mark RS-17 counted; this is its locality alone)`);
      });
      // A v7 sequence's message takes an edge's rule, its sender and receiver a node's (version 2.5).
      if (diagram['kind'] !== 'sequence' || !hasFigureKindForm(doc['schemaVersion'])) return;
      const participants = new Map(list(diagram['participants']).flatMap((node) => (isRecord(node) && text(node['id']) !== undefined ? [[text(node['id'])!, citedPaths(node)] as const] : [])));
      list(diagram['messages']).forEach((message, j) => {
        if (!isRecord(message)) return;
        const from = participants.get(text(message['from']) ?? ''), to = participants.get(text(message['to']) ?? '');
        const own = citedPaths(message);
        if (from === undefined || to === undefined || own.size === 0) return;
        if ([...own].some((p) => from.has(p) || to.has(p))) return;
        add('RS-17', `$.diagrams[${i}].messages[${j}]`, `the message ${JSON.stringify(text(message['id']) ?? '')} cites no file that its sender ${JSON.stringify(text(message['from']))} or its receiver ${JSON.stringify(text(message['to']))} cites: cite where the source shows this exchange, or check that the message names the right participants (polaris-reader-standards-v1 does not yet mark RS-17 counted; this is its locality alone)`);
      });
    });
  }
  const worthKnowing = isRecord(doc) ? worthKnowingAdvice(doc) : undefined;
  const choiceFloor = isRecord(doc) ? choiceFloorAdvice(doc) : undefined;
  return { standards: READER_STANDARDS_VERSION, note: NOTE, advisories, ...(worthKnowing === undefined ? {} : { worthKnowing }),
    ...(choiceFloor === undefined ? {} : { choiceFloor }) };
}
