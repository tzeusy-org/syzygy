import { Buffer } from 'node:buffer';
import {
  BoundedJsonError, decodeHtmlText, isDossierPagePath, PAGE_SINK_CONTRACT,
  pageSinkCspFinding, pageSinkScriptFinding, parseBoundedJson,
} from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import type { DossierScreen } from './screen.js';

const MAX_FILES = 4096;
const MAX_BYTES = 2_097_152;
const MAX_JSON_NODES = 65_536;
const MAX_JSON_DEPTH = 32;
type Failure = 'path' | 'limits' | 'utf8' | 'secret' | 'json' | 'sink';

export type UrlRenderedSiteScreen =
  | { readonly ok: true; readonly files: number; readonly pages: number; readonly bytes: number }
  | { readonly ok: false; readonly code: Failure };

class SiteScreenRefusal extends Error {
  constructor(readonly code: Failure) { super(`url-rendered-site-screen:${code}`); }
}
const refuse = (code: Failure): never => { throw new SiteScreenRefusal(code); };

function requireRepresentableText(text: string): void {
  // With the Unicode flag a valid surrogate pair is one code point. Only a
  // lone surrogate matches this range and would change when written as UTF-8.
  if (/[\u0000\uD800-\uDFFF]/u.test(text)) refuse('utf8');
}

/** Pre-storage screening of a complete in-memory site. The caller owns the
 * renderer and source-context proof and separately checks the original packet. */
export function screenUrlRenderedSite(files: ReadonlyMap<string, string>, screen: Pick<DossierScreen, 'screenSecrets'>): UrlRenderedSiteScreen {
  try {
    if (files.size > MAX_FILES) return refuse('limits');
    let bytes = 0, pages = 0;
    const paths = new Set<string>();
    const ordered: { readonly path: string; readonly body: string; readonly html: boolean }[] = [];
    for (const [path, body] of files) {
      if (ordered.length >= MAX_FILES || typeof body !== 'string' || body.length > MAX_BYTES - bytes) return refuse('limits');
      if (!isDossierPagePath(path) || /[\u0000-\u001F\u007F]/u.test(path) || !/\.(?:html|json)$/u.test(path) || paths.has(path)) return refuse('path');
      bytes += Buffer.byteLength(body);
      if (bytes > MAX_BYTES) return refuse('limits');
      const html = path.endsWith('.html');
      if (html) pages++;
      paths.add(path);
      ordered.push({ path, body, html });
    }
    if (!paths.has('machine.json') || pages === 0) return refuse('path');
    ordered.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

    const screened = new Set<string>();
    const inspect = (value: string): void => {
      if (screened.has(value)) return;
      requireRepresentableText(value);
      let finding: ReturnType<DossierScreen['screenSecrets']>;
      try { finding = screen.screenSecrets(value); } catch { return refuse('secret'); }
      if (finding !== undefined) refuse('secret');
      screened.add(value);
    };
    const compose = (values: readonly string[]): void => {
      let size = 0;
      for (const value of values) {
        size += Buffer.byteLength(value);
        if (size > MAX_BYTES) refuse('limits');
      }
      inspect(values.join(''));
    };
    const allValues: string[] = [], allFields: string[] = [];
    let remainingNodes = MAX_JSON_NODES;
    for (const { path, body, html } of ordered) {
      for (let slash = path.indexOf('/'); slash !== -1; slash = path.indexOf('/', slash + 1)) {
        if (paths.has(path.slice(0, slash))) return refuse('path');
      }
      inspect(path);
      if (body.startsWith('\uFEFF')) return refuse('utf8');
      inspect(body);
      if (html) {
        if (pageSinkCspFinding(body) !== null || pageSinkScriptFinding(body, PAGE_SINK_CONTRACT, []) !== null) return refuse('sink');
        // Add the renderer's one-pass character references to the secret
        // population. The underlying markup remains in this projection.
        const decoded = body.replace(/&(?:amp|lt|gt|quot|#39|#13);/gu, decodeHtmlText);
        if (decoded !== body) inspect(decoded);
        allValues.push(decoded);
        allFields.push(decoded);
        continue;
      }

      if (remainingNodes === 0) return refuse('limits');
      let value: unknown;
      try { value = parseBoundedJson(body, { maxBytes: MAX_BYTES, maxNodes: remainingNodes, maxDepth: MAX_JSON_DEPTH }); }
      catch (cause) {
        if (cause instanceof BoundedJsonError && ['byte-limit', 'node-limit', 'depth-limit'].includes(cause.code)) return refuse('limits');
        return refuse('json');
      }
      if (path === 'machine.json' && !isRecord(value)) return refuse('json');
      const values: string[] = [], fields: string[] = [];
      const visit = (item: unknown): void => {
        remainingNodes--;
        if (typeof item === 'string') {
          inspect(item);
          values.push(item);
          fields.push(item);
        } else if (Array.isArray(item)) {
          for (const child of item) visit(child);
        } else if (isRecord(item)) {
          for (const [key, child] of Object.entries(item)) {
            inspect(key);
            fields.push(key);
            visit(child);
          }
        }
      };
      visit(value);
      compose(values);
      compose(fields);
      for (const content of values) allValues.push(content);
      for (const content of fields) allFields.push(content);
    }
    compose(ordered.map(file => file.body));
    compose(allValues);
    compose(allFields);
    return { ok: true, files: ordered.length, pages, bytes };
  } catch (cause) {
    if (cause instanceof SiteScreenRefusal) return { ok: false, code: cause.code };
    throw cause;
  }
}
