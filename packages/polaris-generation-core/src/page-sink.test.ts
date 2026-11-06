import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';

import { PAGE_SINK_CONTRACT, PAGE_SINK_SCRIPT_CONTRACT, pageSinkCspFinding, pageSinkPolicyFinding, pageSinkScriptFinding, PINNED_PAGE_SCRIPT_REVIEWS } from './page-sink.js';

// syzygy-pdja.5: the page half of screening scope version 7. One row per row of `CSP_TABLE` in
// scripts/build_public_source_screening_scope_v7.py, written out here so the expected values are literals, never computed by the module.
const CSP_ROWS: readonly (readonly [string, string, string | null])[] = [
  ["today's page, no script", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["one hash", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["two hashes", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["a directive name in upper case", "DEFAULT-SRC 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries DEFAULT-SRC"],
  ["'NONE' in upper case", "default-src 'NONE'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "default-src is not exactly 'none'"],
  ["'SCRIPT', which Chrome drops as invalid", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'SCRIPT'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for is not exactly 'script'"],
  ["'Script'", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'Script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for is not exactly 'script'"],
  ["'script' twice", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script' 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for is not exactly 'script'"],
  ["trusted-types naming a policy", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types x; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "trusted-types is not exactly 'none'"],
  ["trusted-types absent", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "trusted-types is not exactly 'none'"],
  ["a trailing semicolon", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none';", null],
  ["tab separators", "default-src\t'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["line feed separators", "default-src\n'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["form feed separators", "default-src\f'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["carriage return separators", "default-src\r'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", null],
  ["base64url in a hash", "default-src 'none'; script-src 'sha256--------------------------------------------='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'sha256--------------------------------------------='"],
  ["a hash with no padding", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'"],
  ["a hash with an upper-case algorithm", "default-src 'none'; script-src 'SHA256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'SHA256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='"],
  ["a leading non-breaking space", "\u00a0default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "holds a non-ASCII byte"],
  ["a leading byte-order mark", "\ufeffdefault-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "holds a non-ASCII byte"],
  ["a trailing ideographic space", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\u3000", "holds a non-ASCII byte"],
  ["unsafe-inline beside a hash", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'unsafe-inline'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'unsafe-inline'"],
  ["unsafe-eval", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'unsafe-eval'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'unsafe-eval'"],
  ["unsafe-hashes", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'unsafe-hashes'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'unsafe-hashes'"],
  ["wasm-unsafe-eval", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'wasm-unsafe-eval'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'wasm-unsafe-eval'"],
  ["strict-dynamic", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'strict-dynamic'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'strict-dynamic'"],
  ["self", "default-src 'none'; script-src 'self'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'self'"],
  ["script-src none", "default-src 'none'; script-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'none'"],
  ["a nonce", "default-src 'none'; script-src 'nonce-abc'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'nonce-abc'"],
  ["a host", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' https://example.test; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries https://example.test"],
  ["a scheme", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' https:; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries https:"],
  ["a data scheme", "default-src 'none'; script-src data:; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries data:"],
  ["a short hash", "default-src 'none'; script-src 'sha256-AAAA'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'sha256-AAAA'"],
  ["a hash with a trailing source glued on", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='x; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='x"],
  ["a sha512 hash", "default-src 'none'; script-src 'sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src carries 'sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='"],
  ["no source at all", "default-src 'none'; script-src; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "script-src has no source"],
  ["two script-src directives", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; script-src 'sha256-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "repeats script-src"],
  ["script-src with no trusted types", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for is not exactly 'script'"],
  ["trusted types with no script-src", "default-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for without script-src"],
  ["trusted-types alone with no script-src", "default-src 'none'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "trusted-types without script-src"],
  ["trusted types for something else", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'none'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "require-trusted-types-for is not exactly 'script'"],
  ["default-src not none", "default-src 'self'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "default-src is not exactly 'none'"],
  ["default-src absent", "script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "default-src is absent"],
  ["default-src with a second source", "default-src 'none' https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "default-src is not exactly 'none'"],
  ["default-src with no source", "default-src; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "default-src is not exactly 'none'"],
  ["two default-src directives", "default-src 'none'; default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "repeats default-src"],
  ["a non-breaking space, which a browser does not split", "default-src\u00a0'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "holds a non-ASCII byte"],
  ["a vertical tab, outside CSP's ASCII whitespace, though Chrome 120 splits it", "default-src\u000b'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries default-src\u000b'none'"],
  ["style-src absent", "default-src 'none'; base-uri 'none'; form-action 'none'", "style-src is absent"],
  ["base-uri absent", "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'", "base-uri is absent"],
  ["form-action absent", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'", "form-action is absent"],
  ["style-src with a host", "default-src 'none'; style-src 'unsafe-inline' https://example.test; base-uri 'none'; form-action 'none'", "style-src is not exactly 'unsafe-inline'"],
  ["base-uri open", "default-src 'none'; style-src 'unsafe-inline'; base-uri *; form-action 'none'", "base-uri is not exactly 'none'"],
  ["form-action open", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action *", "form-action is not exactly 'none'"],
  ["script-src-elem", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; script-src-elem *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries script-src-elem"],
  ["script-src-attr", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; script-src-attr *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries script-src-attr"],
  ["object-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; object-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries object-src"],
  ["connect-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; connect-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries connect-src"],
  ["worker-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; worker-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries worker-src"],
  ["child-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; child-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries child-src"],
  ["frame-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; frame-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries frame-src"],
  ["navigate-to", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; navigate-to *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries navigate-to"],
  ["img-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; img-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries img-src"],
  ["font-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; font-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries font-src"],
  ["media-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; media-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries media-src"],
  ["manifest-src", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; manifest-src *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries manifest-src"],
  ["report-uri", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; report-uri *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries report-uri"],
  ["report-to", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; report-to *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries report-to"],
  ["sandbox", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; sandbox *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries sandbox"],
  ["upgrade-insecure-requests", "default-src 'none'; script-src 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; require-trusted-types-for 'script'; trusted-types 'none'; upgrade-insecure-requests *; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'", "carries upgrade-insecure-requests"],
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY = 'default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'';
const hashOf = (text: string): string => `'sha256-${Buffer.from(sha256(text), 'hex').toString('base64')}'`;
const withScript = (...hashes: string[]): string => `default-src 'none'; script-src ${hashes.join(' ')}; require-trusted-types-for 'script'; trusted-types 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`;
const attr = (policy: string): string => policy.replaceAll('\'', '&#39;');
const page = (policy: string, body = '<p>x</p>'): string => `<!doctype html><html lang="en"><head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width">\n<meta http-equiv="Content-Security-Policy" content="${attr(policy)}">\n<title>t</title></head><body>${body}</body></html>`;

describe('the closed directive set', () => {
  it('carries the builder\'s 70 rows', () => { expect(CSP_ROWS.length).toBe(70); });
  it.each(CSP_ROWS)('%s', (_name, content, why) => { expect(pageSinkPolicyFinding(content)).toBe(why); });
});

describe('reading the policy from a page', () => {
  const notFirst = 'the page\'s Content-Security-Policy is not delivered first in <head>, before every other element but the charset and viewport metas';
  it('confirms a lawful page, with single-quoted or encoded attribute values', () => {
    expect(pageSinkCspFinding(page(POLICY))).toBeNull();
    expect(pageSinkCspFinding(page(POLICY).replace(`content="${attr(POLICY)}"`, `content='${POLICY.replaceAll('\'', '&apos;')}'`))).toBeNull();
  });
  it.each([
    ['a stray comment before the policy', page(POLICY).replace('<meta charset', '<!-- x --><meta charset'), notFirst],
    ['a comment before the doctype', `<!-- x -->${page(POLICY)}`, notFirst],
    ['no doctype', page(POLICY).replace('<!doctype html>', ''), notFirst],
    ['a legacy doctype that leaves quirks mode', page(POLICY).replace('<!doctype html>', '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">'), notFirst],
    ['a comment after the document', `${page(POLICY)}<!-- x -->`, notFirst],
    ['the policy in the body, with only lawful metas in the head', `<!doctype html><html><head><meta charset="utf-8"></head><body><meta http-equiv="Content-Security-Policy" content="${attr(POLICY)}"></body></html>`, notFirst],
    ['a charset meta with another attribute', page(POLICY).replace('<meta charset="utf-8">', '<meta charset="utf-8" id="x">'), notFirst],
    ['a near-spelling of the name', page(POLICY).replace('http-equiv="Content-Security-Policy"', 'http-equiv="X-Content-Security-Policy"'), notFirst],
    ['the name beside a near-spelling', page(POLICY).replace('<title>', '<meta http-equiv="x-content-security-policy" content="y"><title>'), 'the page carries 2 Content-Security-Policy meta elements, not exactly one'],
    ['a policy meta in a noscript', page(POLICY).replace('<title>', `<noscript><meta http-equiv="Content-Security-Policy" content="${attr(POLICY)}"></noscript><title>`), 'the page carries 2 Content-Security-Policy meta elements, not exactly one'],
    ['a policy meta in a template', page(POLICY, `<template><meta http-equiv="Content-Security-Policy" content="x"></template>`), 'the page carries 2 Content-Security-Policy meta elements, not exactly one'],
    ['no content attribute', page(POLICY).replace(` content="${attr(POLICY)}"`, ''), 'the page\'s Content-Security-Policy meta carries no content attribute'],
    ['a policy the closed set refuses', page(`${POLICY}; img-src data:`), 'the page\'s Content-Security-Policy carries img-src'],
  ])('refuses %s', (_name, html, why) => { expect(pageSinkCspFinding(html)).toBe(why); });

  // E1 of R-SCREENING-SCOPE-V7-3-RAW.md. Both pages passed the regex this reader replaced while Chrome enforced no such policy;
  // page-sink.browser.test.ts holds what Chrome does with them.
  it('reads a duplicate content attribute as the browser does: the first wins', () => {
    const html = page(POLICY).replace(`content="${attr(POLICY)}"`, `content='default-src * ; script-src &#39;unsafe-inline&#39;' content="${attr(POLICY)}"`);
    expect(pageSinkCspFinding(html)).toBe('the page\'s Content-Security-Policy default-src is not exactly \'none\'');
  });
  it('finds no policy in a meta smuggled inside another attribute\'s value', () => {
    const html = page(POLICY).replace(`<meta http-equiv="Content-Security-Policy" content="${attr(POLICY)}">`, `<meta name='a http-equiv="Content-Security-Policy" content="${attr(POLICY)}"'>`);
    expect(pageSinkCspFinding(html)).toBe('the page carries 0 Content-Security-Policy meta elements, not exactly one');
  });
});

describe('the scripts on a page', () => {
  const SCRIPT = 'document.documentElement.dataset.ran = "1";';
  const H = hashOf(SCRIPT);
  const scripted = page(withScript(H), `<script>${SCRIPT}</script>`);
  const pinned = [H];
  it('passes a page with no script under either contract', () => {
    expect(pageSinkScriptFinding(page(POLICY), PAGE_SINK_CONTRACT, [])).toBeNull();
    expect(pageSinkScriptFinding(page(POLICY), PAGE_SINK_SCRIPT_CONTRACT, [])).toBeNull();
  });
  it('passes a pinned script allowed by the page under the script contract', () => {
    expect(pageSinkCspFinding(scripted)).toBeNull();
    expect(pageSinkScriptFinding(scripted, PAGE_SINK_SCRIPT_CONTRACT, pinned)).toBeNull();
  });
  it('hashes a CRLF script by its LF form, as the browser does', () => {
    const crlf = page(withScript(hashOf('a;\nb;')), '<script>a;\r\nb;</script>');
    expect(pageSinkScriptFinding(crlf, PAGE_SINK_SCRIPT_CONTRACT, [hashOf('a;\nb;')])).toBeNull();
  });
  it('finds a script under the unchanged contract, and a script-src with no script', () => {
    const why = 'the page carries a script or a script-src, and the injected renderer does not declare the script half';
    expect(pageSinkScriptFinding(scripted, PAGE_SINK_CONTRACT, pinned)).toBe(why);
    expect(pageSinkScriptFinding(scripted, undefined, pinned)).toBe(why);
    expect(pageSinkScriptFinding(page(withScript(H)), PAGE_SINK_CONTRACT, pinned)).toBe(why);
    expect(pageSinkScriptFinding(page(POLICY, '<script></script>'), PAGE_SINK_CONTRACT, pinned)).toBe(why);
  });
  it('finds a script in svg, in a template and in a noscript', () => {
    for (const body of [`<svg><script>x</script></svg>`, `<template><script>x</script></template>`, `<noscript><script>x</script></noscript>`]) {
      expect(pageSinkScriptFinding(page(POLICY, body), PAGE_SINK_SCRIPT_CONTRACT, pinned), body).toBe(`the page carries a script outside the pinned set (${hashOf('x')})`);
    }
  });
  it.each([
    ['a src', `<script src="x.js">${SCRIPT}</script>`],
    ['an svg href', `<svg><script href="x.js">${SCRIPT}</script></svg>`],
    ['an svg xlink:href', `<svg><script xlink:href="x.js">${SCRIPT}</script></svg>`],
  ])('refuses a pinned script with %s', (_name, body) => {
    expect(pageSinkScriptFinding(page(withScript(H), body), PAGE_SINK_SCRIPT_CONTRACT, pinned)).toBe('the page carries a script with an external reference');
  });
  it('checks both ways: a script out of the set, a script its page does not allow, a hash out of the set', () => {
    expect(pageSinkScriptFinding(scripted, PAGE_SINK_SCRIPT_CONTRACT, [])).toBe(`the page carries a script outside the pinned set (${H})`);
    const other = hashOf('other');
    expect(pageSinkScriptFinding(page(withScript(other), `<script>${SCRIPT}</script>`), PAGE_SINK_SCRIPT_CONTRACT, [H, other])).toBe(`the page's script-src does not allow its script (${H})`);
    expect(pageSinkScriptFinding(page(withScript(H, other), `<script>${SCRIPT}</script>`), PAGE_SINK_SCRIPT_CONTRACT, [H])).toBe(`the page's script-src carries a hash outside the pinned set (${other})`);
  });
  it('defaults to the pinned set, which holds nothing yet', () => {
    expect(Object.keys(PINNED_PAGE_SCRIPT_REVIEWS)).toEqual([]);
    expect(pageSinkScriptFinding(scripted, PAGE_SINK_SCRIPT_CONTRACT)).toBe(`the page carries a script outside the pinned set (${H})`);
  });
  it('requires each pin to name a retained raw review that quotes its hash', async () => {
    for (const [hash, raw] of Object.entries(PINNED_PAGE_SCRIPT_REVIEWS)) {
      expect(raw, hash).toMatch(/^docs\/reviews\/[^/]+-RAW\.md$/);
      expect(await readFile(path.join(ROOT, raw), 'utf8'), raw).toContain(hash);
    }
  });
});
