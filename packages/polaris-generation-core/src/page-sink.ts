import { Buffer } from 'node:buffer';

import { sha256 } from '@syzygy/support';
import { parse, type DefaultTreeAdapterTypes as Tree } from 'parse5';

/** The page half of the screening scope's `codeContentExemption.renderCondition` (version 7, owner act of 2026-11-06). Every page is read
 * by a real HTML parser (`parse5`, the WHATWG algorithm), because the regex this replaced accepted pages a browser reads differently: a
 * duplicate `content` attribute, and a CSP meta smuggled inside another attribute's value. On such a page a pinned script would run with
 * no policy while the page still confirmed.
 *
 * Scripting is off for the parse, so `<noscript>` content reads as elements: a superset of what either browser mode builds. */

/** What a page renderer declares (as its `pageSinkContract` property) when it writes every byte of a source body or span it puts on a
 * page as text, each of `& < > " '` as a character reference, never parsed as Markdown or HTML and never minting a link, element,
 * attribute, script or handler: the encoding half of `renderCondition`. The declaration is the renderer's; its own tests must fail if a
 * page path stops encoding. A consumer reads it together with `pageSinkCspFinding` on every page drawn. A page under this contract
 * carries no script and no `script-src`. */
export const PAGE_SINK_CONTRACT = 'polaris/page-sink/escaped-text-under-csp/1';

/** `PAGE_SINK_CONTRACT`, plus the script half: the renderer writes only inline scripts whose bytes it fixes, derived from no body, under
 * the conduct the clause states. Bytes are checked (`pageSinkScriptFinding`); what those bytes do rests on their tests and on review. */
export const PAGE_SINK_SCRIPT_CONTRACT = 'polaris/page-sink/escaped-text-under-csp-with-pinned-scripts/1';

/** Every script hash a page may carry, as its CSP source (`'sha256-<base64>'`), mapped to the retained raw review that quotes it. It sits
 * here and not in the injected renderer, so a script and its pin do not change together unseen: `page-sink.test.ts` requires each entry's
 * raw to exist and to quote its hash. Empty: no signed specification version has added a script yet. */
export const PINNED_PAGE_SCRIPT_REVIEWS: Readonly<Record<string, string>> = Object.freeze({});

const CSP_NAME = 'content-security-policy';
const FIXED: readonly (readonly [string, string])[] = [['default-src', '\'none\''], ['style-src', '\'unsafe-inline\''], ['base-uri', '\'none\''], ['form-action', '\'none\'']];
const SCRIPT_FIXED: readonly (readonly [string, string])[] = [['require-trusted-types-for', '\'script\''], ['trusted-types', '\'none\'']];
const LAWFUL = new Set([...FIXED, ...SCRIPT_FIXED].map(([name]) => name).concat('script-src'));
const HASH_SOURCE = /^'sha256-[A-Za-z0-9+/]{43}='$/;
const ASCII_WHITESPACE = /[\t\n\f\r ]+/;
const NON_ASCII = /[^\0-\x7f]/;

/** Why a policy string is not the closed set the clause states, or null when it is. Every token compares exactly, in lower case; a
 * non-ASCII byte fails first, and only ASCII whitespace separates, because Unicode whitespace is not a separator to the browser. */
export function pageSinkPolicyFinding(content: string): string | null {
  if (NON_ASCII.test(content)) return 'holds a non-ASCII byte';
  const directives = content.split(';').map(part => part.split(ASCII_WHITESPACE).filter(token => token !== '')).filter(tokens => tokens.length > 0);
  const names = directives.map(tokens => tokens[0]!);
  for (const name of names) {
    if (!LAWFUL.has(name)) return `carries ${name}`;
    if (names.indexOf(name) !== names.lastIndexOf(name)) return `repeats ${name}`;
  }
  const sources = new Map(directives.map(tokens => [tokens[0]!, tokens.slice(1)]));
  const exactly = (name: string, source: string): boolean => { const found = sources.get(name); return found !== undefined && found.length === 1 && found[0] === source; };
  for (const [name, source] of FIXED) {
    if (!sources.has(name)) return `${name} is absent`;
    if (!exactly(name, source)) return `${name} is not exactly ${source}`;
  }
  const scriptSources = sources.get('script-src');
  if (scriptSources === undefined) {
    const extra = SCRIPT_FIXED.find(([name]) => sources.has(name));
    return extra === undefined ? null : `${extra[0]} without script-src`;
  }
  for (const [name, source] of SCRIPT_FIXED) if (!exactly(name, source)) return `${name} is not exactly ${source}`;
  if (scriptSources.length === 0) return 'script-src has no source';
  for (const source of scriptSources) if (!HASH_SOURCE.test(source)) return `script-src carries ${source}`;
  return null;
}

const isElement = (node: Tree.ChildNode): node is Tree.Element => 'tagName' in node;
const isBlankText = (node: Tree.ChildNode): boolean => node.nodeName === '#text' && !/[^\t\n\f\r ]/.test((node as Tree.TextNode).value);
const attribute = (element: Tree.Element, name: string): string | undefined => element.attrs.find(attr => attr.name === name && attr.prefix === undefined)?.value;

/** Every element, template contents included, with an explicit stack: a page's depth is the renderer's, and recursion is bounded by it. */
function elementsOf(root: Tree.Document): readonly Tree.Element[] {
  const out: Tree.Element[] = [];
  const stack: Tree.ChildNode[] = [...root.childNodes].reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (!isElement(node)) continue;
    out.push(node);
    for (let i = node.childNodes.length - 1; i >= 0; i--) stack.push(node.childNodes[i]!);
    if (node.tagName === 'template' && 'content' in node) for (const child of (node as Tree.Template).content.childNodes) stack.push(child);
  }
  return out;
}

interface ReadPage { readonly elements: readonly Tree.Element[]; readonly policy: string }

/** A page's one enforced policy, delivered first in `<head>`, or why there is none. Any `http-equiv` naming the policy counts, so a
 * near-spelling cannot sit beside the real one unread. */
function readPage(html: string): ReadPage | string {
  const document = parse(html, { scriptingEnabled: false });
  const elements = elementsOf(document);
  const metas = elements.filter(element => element.tagName === 'meta' && (attribute(element, 'http-equiv') ?? '').toLowerCase().includes(CSP_NAME));
  if (metas.length !== 1) return `the page carries ${metas.length} Content-Security-Policy meta elements, not exactly one`;
  const meta = metas[0]!;
  const equiv = attribute(meta, 'http-equiv')!.toLowerCase();
  if (equiv.includes('report-only')) return 'the page\'s Content-Security-Policy is Report-Only, which enforces nothing';
  const notFirst = 'the page\'s Content-Security-Policy is not delivered first in <head>, before every other element but the charset and viewport metas';
  if (equiv !== CSP_NAME) return notFirst;
  const top = document.childNodes;
  if (document.mode !== 'no-quirks' || top.length !== 2 || top[0]!.nodeName !== '#documentType' || top[1]!.nodeName !== 'html') return notFirst;
  const head = (top[1] as Tree.Element).childNodes.find(node => node.nodeName === 'head') as Tree.Element | undefined;
  if (head === undefined || meta.parentNode !== head) return notFirst;
  for (const node of head.childNodes) {
    if (node === meta) break;
    if (isBlankText(node)) continue;
    const allowed = isElement(node) && node.tagName === 'meta' && (
      (node.attrs.length === 1 && attribute(node, 'charset') !== undefined)
      || (node.attrs.length === 2 && attribute(node, 'name') === 'viewport' && attribute(node, 'content') !== undefined));
    if (!allowed) return notFirst;
  }
  const policy = attribute(meta, 'content');
  if (policy === undefined) return 'the page\'s Content-Security-Policy meta carries no content attribute';
  return { elements, policy };
}

/** Why an HTML page does not meet the policy half of `renderCondition`, or null when it does: exactly one enforced policy meta, first in
 * `<head>`, whose text is the closed set. The encoding half is the renderer's, confirmed by its own tests. */
export function pageSinkCspFinding(html: string): string | null {
  const page = readPage(html);
  if (typeof page === 'string') return page;
  const finding = pageSinkPolicyFinding(page.policy);
  return finding === null ? null : `the page's Content-Security-Policy ${finding}`;
}

/** A script's CSP source: the SHA-256 of its text as the parser delivers it, UTF-8. The parser normalises newlines as the browser does
 * before hashing, so a CRLF script hashes by its LF form. */
function scriptSource(script: Tree.Element): string {
  const text = script.childNodes.map(node => (node.nodeName === '#text' ? (node as Tree.TextNode).value : '')).join('');
  return `'sha256-${Buffer.from(sha256(text), 'hex').toString('base64')}'`;
}

/** Why a page's scripts are not lawful under the renderer's declared contract, or null when they are. A page with no script needs
 * neither. With one, the renderer must declare the script half, every script must carry no external reference and hash into `pinned`,
 * every `script-src` hash must be in `pinned`, and the page's policy must allow every script it carries. */
export function pageSinkScriptFinding(html: string, contract: string | undefined, pinned: readonly string[] = Object.keys(PINNED_PAGE_SCRIPT_REVIEWS)): string | null {
  const page = readPage(html);
  if (typeof page === 'string') return page;
  const scripts = page.elements.filter(element => element.tagName === 'script');
  const directive = page.policy.split(';').map(part => part.split(ASCII_WHITESPACE).filter(token => token !== '')).find(tokens => tokens[0] === 'script-src');
  const allowed = directive?.slice(1) ?? [];
  if (scripts.length === 0 && directive === undefined) return null;
  if (contract !== PAGE_SINK_SCRIPT_CONTRACT) return 'the page carries a script or a script-src, and the injected renderer does not declare the script half';
  for (const script of scripts) {
    if (script.attrs.some(attr => attr.name === 'src' || attr.name === 'href')) return 'the page carries a script with an external reference';
    const source = scriptSource(script);
    if (!pinned.includes(source)) return `the page carries a script outside the pinned set (${source})`;
    if (!allowed.includes(source)) return `the page's script-src does not allow its script (${source})`;
  }
  for (const source of allowed) if (!pinned.includes(source)) return `the page's script-src carries a hash outside the pinned set (${source})`;
  return null;
}
