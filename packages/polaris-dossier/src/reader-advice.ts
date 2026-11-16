import { isRecord } from '@syzygy/support';
import { READER_STANDARDS_VERSION } from './reader-standards.js';

/** The counted reader standards (`reader-standards.ts`, syzygy-pdja.17): what `syzygy dossier check` can measure of RS-13, RS-14, RS-16
 * and RS-19 in a draft, reported to the author as advice. Advice is never a finding: it sets no outcome, is on the check's report only
 * (never the stored check record, like the screen census), and the rendered-design review still judges every page. Pure. */

export type ReaderStandardId = 'RS-13' | 'RS-14' | 'RS-16' | 'RS-19';

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
}

/** RS-14: at most this many deep dives. */
export const DEEP_DIVE_LIMIT = 3;
/** RS-19: about this many words of a section's own prose, outside its diagrams and elements. */
export const SECTION_WORD_LIMIT = 300;

const NOTE = `Advice from the counted reader standards (${READER_STANDARDS_VERSION}): it sets no outcome and is not stored in the check record; the design review still judges every page.`;

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
function proseWords(entry: unknown): number {
  if (!isRecord(entry) || entry['kind'] !== undefined) return 0;
  const words = (value: unknown): number => (text(value)?.split(/\s+/u).filter((word) => word !== '').length ?? 0);
  return words(entry['text']) + list(entry['children']).reduce<number>((sum, child) => sum + (isRecord(child) ? words(child['text']) : 0), 0);
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
        const words = list(container['paragraphs']).reduce<number>((sum, entry) => sum + proseWords(entry), 0);
        if (words > SECTION_WORD_LIMIT) {
          add('RS-19', `${at}.paragraphs`, `${words} words of its own prose, past about ${SECTION_WORD_LIMIT}: move enumerations, comparisons and steps into elements or a diagram, depth a newcomer may skip into details, and cut the rest`);
        }
      });
    }
    if (deepDives.length > DEEP_DIVE_LIMIT) add('RS-14', '$.deepDives', `${deepDives.length} deep dives, past ${DEEP_DIVE_LIMIT}: keep those that answer a question their section cannot, and merge two that serve one question`);
    const drawn = new Set(list(doc['diagrams']).flatMap((diagram) => (isRecord(diagram) && text(diagram['sectionId']) !== undefined ? [text(diagram['sectionId'])!] : [])));
    list(doc['sections']).forEach((section, i) => {
      const id = isRecord(section) ? text(section['id']) : undefined;
      if (id !== undefined && !drawn.has(id)) add('RS-16', `$.sections[${i}]`, `no diagram is drawn for the section ${JSON.stringify(id)}: draw any workflow, mechanism or set of components that talk to each other it explains`);
    });
  }
  return { standards: READER_STANDARDS_VERSION, note: NOTE, advisories };
}
