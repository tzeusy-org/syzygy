import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PAGE_SINK_CONTRACT, PAGE_SINK_SCRIPT_CONTRACT } from '@syzygy/polaris-generation-core';

import { pageSinkUnconfirmed, type DossierRenderer } from './render.js';

// syzygy-pdja.5: the drawn site under screening scope version 7. Every file but a machine view must be a page named `.html`; any other name is refused.
const POLICY = 'default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;';
const page = (policy = POLICY, body = '<p>x</p>'): string => `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>t</title></head><body>${body}</body></html>`;
const renderer = (contract?: string): DossierRenderer => Object.assign(() => ({ files: new Map<string, string>() }), contract === undefined ? {} : { pageSinkContract: contract });
const files = (entries: Record<string, string>): ReadonlyMap<string, string> => new Map(Object.entries(entries));

describe('pageSinkUnconfirmed', () => {
  it('confirms script-free pages and passes a machine view unread', () => {
    expect(pageSinkUnconfirmed(renderer(PAGE_SINK_CONTRACT), files({ 'index.html': page(), 'machine.json': '{"a":"<script>"}' }))).toBeNull();
  });
  it('accepts either contract and refuses none', () => {
    expect(pageSinkUnconfirmed(renderer(PAGE_SINK_SCRIPT_CONTRACT), files({ 'index.html': page() }))).toBeNull();
    expect(pageSinkUnconfirmed(renderer(), files({ 'index.html': page() }))).toBe('the injected renderer does not declare that it writes every source byte as entity-encoded text');
  });
  it('refuses a file of any other extension, whatever it holds', () => {
    for (const name of ['diagram.svg', 'page.htm', 'page.xhtml', 'notes.txt']) {
      expect(pageSinkUnconfirmed(renderer(PAGE_SINK_CONTRACT), files({ [name]: page() })), name)
        .toBe(`${name}: a page must be named .html, since a browser reads any other name with another parser`);
    }
  });
  it('refuses a script-free page whose policy is outside the closed set', () => {
    expect(pageSinkUnconfirmed(renderer(PAGE_SINK_CONTRACT), files({ 'a.html': page(`${POLICY}; img-src data:`) }))).toBe('a.html: the page\'s Content-Security-Policy carries img-src');
  });
  it('names the page whose script is out of the pinned set', () => {
    const script = 'x';
    const hash = `&#39;sha256-${createHash('sha256').update(script).digest('base64')}&#39;`;
    const scripted = page(`default-src &#39;none&#39;; script-src ${hash}; require-trusted-types-for &#39;script&#39;; trusted-types &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;`, `<script>${script}</script>`);
    expect(pageSinkUnconfirmed(renderer(PAGE_SINK_CONTRACT), files({ 'a.html': scripted }))).toBe('a.html: the page carries a script or a script-src, and the injected renderer does not declare the script half');
    expect(pageSinkUnconfirmed(renderer(PAGE_SINK_SCRIPT_CONTRACT), files({ 'a.html': scripted }))).toContain('a.html: the page carries a script outside the pinned set');
  });
});
