// syzygy-pdja.5, E1 and E4 of R-SCREENING-SCOPE-V7-3-RAW.md: what Chrome does with the pages the screening scope's page reader must get
// right, over file://, which is how a dossier is opened. The reader's own answers are beside each, so a disagreement between the two
// fails here. Without a browser the suite is skipped, never passed.
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pageSinkCspFinding } from '@syzygy/polaris-generation-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';

const executable = findBrowserExecutable();
const STRICT = '&#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;';
const SCRIPT = '<script>document.documentElement.dataset.ran = "1";</script>';
const document_ = (meta: string, script = SCRIPT): string => `<!doctype html><html><head>\n<meta charset="utf-8">\n${meta}\n<title>t</title></head><body><p>x</p>${script}</body></html>`;
const source = (text: string): string => `&#39;sha256-${createHash('sha256').update(text).digest('base64')}&#39;`;
const scripted = (hash: string): string => `<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src ${hash}; require-trusted-types-for &#39;script&#39;; trusted-types &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">`;

describe.skipIf(executable === undefined)('the page reader against Chrome', () => {
  let browser: Browser;
  let dir: string;
  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
    dir = mkdtempSync(join(tmpdir(), 'page-sink-csp-'));
  });
  afterAll(async () => {
    await browser?.close();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  });
  const ran = async (html: string): Promise<boolean> => {
    const file = join(dir, `${createHash('sha256').update(html).digest('hex')}.html`);
    writeFileSync(file, html);
    const page = await browser.newPage();
    try {
      await page.navigate(pathToFileURL(file).href);
      return await page.evaluate<boolean>(`document.documentElement.dataset.ran === '1'`);
    } finally {
      await page.close();
    }
  };

  it('the control: under the strict policy an unhashed script does not run, and the reader confirms the page', async () => {
    const html = document_(`<meta http-equiv="Content-Security-Policy" content="default-src ${STRICT}">`);
    expect(await ran(html)).toBe(false);
    expect(pageSinkCspFinding(html)).toBeNull();
  });
  it('a duplicate content attribute: Chrome enforces the first, the script runs, and the reader refuses the page', async () => {
    const html = document_(`<meta http-equiv="Content-Security-Policy" content='default-src * ; script-src &#39;unsafe-inline&#39;' content="default-src ${STRICT}">`);
    expect(await ran(html)).toBe(true);
    expect(pageSinkCspFinding(html)).not.toBeNull();
  });
  it('a meta smuggled in an attribute: Chrome enforces nothing, the script runs, and the reader refuses the page', async () => {
    const html = document_(`<meta name='a http-equiv="Content-Security-Policy" content="default-src ${STRICT}"'>`);
    expect(await ran(html)).toBe(true);
    expect(pageSinkCspFinding(html)).not.toBeNull();
  });
  it('a hash-allowed inline script runs under the trusted-types pair, and the reader confirms the page', async () => {
    const text = 'document.documentElement.dataset.ran = "1";';
    const html = document_(scripted(source(text)));
    expect(await ran(html)).toBe(true);
    expect(pageSinkCspFinding(html)).toBeNull();
  });
  it('a CRLF script runs under the hash of its LF form and not of its raw bytes', async () => {
    const lf = 'var a = 1;\ndocument.documentElement.dataset.ran = "1";';
    const crlf = lf.replace('\n', '\r\n');
    expect(await ran(document_(scripted(source(lf)), `<script>${crlf}</script>`))).toBe(true);
    expect(await ran(document_(scripted(source(crlf)), `<script>${crlf}</script>`))).toBe(false);
  });
});
