import { Buffer } from 'node:buffer';
import { describe, expect, it, vi } from 'vitest';
import { screenUrlRenderedSite } from './url-rendered-site-screen.js';

const CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
const page = (body: string, policy = CSP): string => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="content-security-policy" content="${policy}"><title>Example</title></head><body>${body}</body></html>`;
const site = (body = 'Example', machine = '{}'): Map<string, string> => new Map([['index.html', page(body)], ['machine.json', machine]]);
const detects = (fragment: string) => ({ screenSecrets: vi.fn((text: string) => text.includes(fragment) ? 'secret-detector-match' as const : undefined) });
const clean = { screenSecrets: () => undefined };

describe('complete URL rendered site before storage', () => {
  it('returns the exact local file, page and UTF-8 byte population', () => {
    const files = site('Café 😀', '{"observations":["測試",{"status":"Unknown"}]}');
    files.set('sources/source-a.html', page('Source text &lt;plain&gt;'));
    files.set('size-report.json', '{"bytes":19}');
    const bytes = [...files.values()].map(body => Buffer.from(body)).reduce((n, body) => n + body.length, 0);
    expect(screenUrlRenderedSite(files, clean)).toEqual({ ok: true, files: 4, pages: 2, bytes });
  });

  it.each(['/elsewhere.json', 'dir/../escape.html', 'x\\escaped.html', 'nested//file.json', 'unsafe.svg', 'unsafe.HTML', 'link\n.html'])('refuses the path %s', path => {
    const files = site();
    files.set(path, '{}');
    expect(screenUrlRenderedSite(files, clean)).toEqual({ ok: false, code: 'path' });
  });

  it('requires machine JSON and an HTML page and refuses path prefixes that are already files', () => {
    expect(screenUrlRenderedSite(new Map([['index.html', page('Example')]]), clean)).toEqual({ ok: false, code: 'path' });
    expect(screenUrlRenderedSite(new Map([['machine.json', '{}']]), clean)).toEqual({ ok: false, code: 'path' });
    expect(screenUrlRenderedSite(site().set('index.html/extra.json', '{}'), clean)).toEqual({ ok: false, code: 'path' });
  });

  it('enforces the file and aggregate UTF-8 limits before screening any bytes', () => {
    const detector = detects('absent');
    const files = site();
    for (let i = 0; i < 4094; i++) files.set(`data/${i}.json`, 'null');
    expect(screenUrlRenderedSite(files, clean)).toMatchObject({ ok: true, files: 4096 });
    files.set('overflow.json', 'null');
    expect(screenUrlRenderedSite(files, detector)).toEqual({ ok: false, code: 'limits' });

    const atLimit = site();
    const padding = 2_097_152 - Buffer.byteLength(page('Example')) - 2;
    atLimit.set('machine.json', `${' '.repeat(padding)}{}`);
    expect(screenUrlRenderedSite(atLimit, clean)).toMatchObject({ ok: true, bytes: 2_097_152 });
    const multibyte = '{"測試":0}';
    atLimit.set('machine.json', `${' '.repeat(padding + 2 - multibyte.length)}${multibyte}`);
    expect(screenUrlRenderedSite(atLimit, detector)).toEqual({ ok: false, code: 'limits' });
    expect(detector.screenSecrets).not.toHaveBeenCalled();
  });

  it('refuses a non-representable path, raw body, and escaped JSON field before success', () => {
    const malformed = String.fromCharCode(0xd800);
    expect(screenUrlRenderedSite(site().set(`data-${malformed}.json`, '{}'), clean)).toEqual({ ok: false, code: 'utf8' });
    expect(screenUrlRenderedSite(site(malformed), clean)).toEqual({ ok: false, code: 'utf8' });
    expect(screenUrlRenderedSite(site('Example', '{"key":"\\ud800"}'), clean)).toEqual({ ok: false, code: 'utf8' });
    expect(screenUrlRenderedSite(site('Example', '{"\\u0000":"value"}'), clean)).toEqual({ ok: false, code: 'utf8' });
  });

  it.each(['{"k":"first","k":"second"}', '{"__proto__":0}', '{"overflow":1e1000}', '{"missing":}', '[]'])('requires strict machine JSON for %s', machine => {
    expect(screenUrlRenderedSite(site('Example', machine), clean)).toEqual({ ok: false, code: 'json' });
  });

  it('bounds both JSON nesting and the aggregate node population across files', () => {
    const tooDeep = `${'['.repeat(33)}null${']'.repeat(33)}`;
    expect(screenUrlRenderedSite(site().set('extra.json', tooDeep), clean)).toEqual({ ok: false, code: 'limits' });
    const list = `[${'null,'.repeat(32_767)}null]`;
    expect(screenUrlRenderedSite(site().set('a.json', list), clean)).toMatchObject({ ok: true });
    expect(screenUrlRenderedSite(site().set('a.json', list).set('b.json', list), clean)).toEqual({ ok: false, code: 'limits' });
  });

  it('screens raw file names and bodies, decoded HTML references, and decoded nested JSON keys and values', () => {
    const detector = detects('own-synthetic-marker');
    const inputs = [
      site().set('own-synthetic-marker.json', '{}'),
      site('own-synthetic-marker'),
      site('Example', '{"details":{"own-synthetic-\\u006darker":true}}'),
      site('Example', '{"details":[{"label":"own-synthetic-\\u006darker"}]}'),
    ];
    for (const files of inputs) expect(screenUrlRenderedSite(files, detector)).toEqual({ ok: false, code: 'secret' });
    expect(screenUrlRenderedSite(site('own &amp; marker'), detects('own & marker'))).toEqual({ ok: false, code: 'secret' });
  });

  it('screens raw concatenation, per-file keyed and value compositions, and sorted cross-file decoded values', () => {
    const raw = site().set('z-a.json', '[]').set('z-b.json', '{}');
    expect(screenUrlRenderedSite(raw, detects('[]{'))).toEqual({ ok: false, code: 'secret' });
    const values = site('Example', '{"first":"own-synthetic-","second":"marker"}');
    expect(screenUrlRenderedSite(values, detects('own-synthetic-marker'))).toEqual({ ok: false, code: 'secret' });
    const fields = site('Example', '{"first":"own-synthetic-","marker":false}');
    expect(screenUrlRenderedSite(fields, detects('own-synthetic-marker'))).toEqual({ ok: false, code: 'secret' });
    const reversed = site().set('z-b.json', '["marker"]').set('z-a.json', '["own-synthetic-"]');
    expect(screenUrlRenderedSite(reversed, detects('own-synthetic-marker'))).toEqual({ ok: false, code: 'secret' });
  });

  it('refuses when the detector cannot complete and does not echo its diagnostic', () => {
    const screenSecrets = (): never => { throw new Error('own fixture diagnostic'); };
    expect(screenUrlRenderedSite(site(), { screenSecrets })).toEqual({ ok: false, code: 'secret' });
  });

  it.each([
    page('body', "default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"),
    page('body', `${CSP}; script-src 'sha256-${'A'.repeat(43)}='; require-trusted-types-for 'script'; trusted-types 'none'`),
    page('body').replace('<meta charset="utf-8">', '<meta charset="iso-8859-1">'),
    page('<meta http-equiv="refresh" content="60">'),
    page('<template><script>/* own inert test fixture */</script></template>'),
    page('<noscript><script>/* own inert test fixture */</script></noscript>'),
  ])('checks the parser-enforced CSP and empty script registry on every HTML page', bad => {
    expect(screenUrlRenderedSite(site().set('sources/bad.html', bad), clean)).toEqual({ ok: false, code: 'sink' });
  });
});
