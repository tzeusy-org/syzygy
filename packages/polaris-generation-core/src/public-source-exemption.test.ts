import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';

import { codeContentExempt, pageSinkCspFinding, readCodeContentExemption } from './public-source-classification.js';

// syzygy-wsev / P-105 (owner act of 2026-10-08): the version-3 screening scope's code-content exemption and the policy half of its
// renderCondition. The policies are the builder's own proposed bytes for each variant (scripts/build_public_source_screening_scope_v3.py),
// re-derived from the checkout, so this holds before and after the act applies variant `all`; every expected value is written from the
// policy text, never computed by the module.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
type Scope = Record<string, unknown>;
let BASE: Scope, ALL: Scope, NON_WEB: Scope;
const SOURCE = (scope: Scope): string[] => ((scope['contentClassification'] as { rules: Record<string, unknown>[] }).rules.find(rule => rule['class'] === 'code-content')!['sourceExtensions'] as string[]);
const exemptionOf = (scope: Scope): Record<string, unknown> => (scope['activeContent'] as Scope)['codeContentExemption'] as Record<string, unknown>;
const withExemption = (scope: Scope, exemption: unknown): Scope => ({ ...scope, activeContent: { ...(scope['activeContent'] as Scope), codeContentExemption: exemption } });

// Since the version-4 act (2026-10-20) the version-3 base is recovered through version 4's base, the version-3 row `all`.
// Run without blocking the worker: a synchronous python3 child is not a short local tool (sync-child-process-guard.test.ts).
beforeAll(async () => {
  const py = `import json, sys; sys.path.insert(0, 'scripts')
import build_public_source_screening_scope_v2 as b2, build_public_source_screening_scope_v3 as b, build_public_source_screening_scope_v4 as b4, build_public_source_screening_scope_v5 as b5
import build_public_source_screening_scope_v6 as b6
v5_bcd, _mode = b6.base_bytes()
v4_span = b2.reverse_patch((b5.ROOT / b5.patch_path(b6.V5_BASE_VARIANT)).read_text(), v5_bcd)
assert b5.sha(v4_span) == b5.v4.manifest_rows(b5.ROOT)[b5.V4_BASE_VARIANT] and b5.propose(v4_span, b6.V5_BASE_VARIANT) == v5_bcd
v3_all = b2.reverse_patch((b4.ROOT / b4.patch_path(b5.V4_BASE_VARIANT)).read_text(), v4_span)
assert b4.sha(v3_all) == b4.v3.manifest_rows(b4.ROOT)[b4.V3_BASE_VARIANT] and b4.propose(v3_all, b5.V4_BASE_VARIANT) == v4_span
base = b2.reverse_patch((b.ROOT / b.patch_path('all')).read_text(), v3_all)
assert b.propose(base, 'all') == v3_all
sys.stdout.write(json.dumps({'base': json.loads(base)[b.SCOPE_KEY], **{v: json.loads(b.propose(base, v))[b.SCOPE_KEY] for v in b.VARIANTS}}))`;
  const run = await promisify(execFile)('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const out = JSON.parse(run.stdout) as Record<string, Scope>;
  [BASE, ALL, NON_WEB] = [out['base']!, out['all']!, out['non-web']!];
});

describe('reading the exemption', () => {
  it('reads none from the version-2 scope', () => {
    expect(readCodeContentExemption(BASE, SOURCE(BASE))).toEqual({ ok: true, exemption: null });
  });
  it('reads variant all: every one of the 25 source extensions', () => {
    const read = readCodeContentExemption(ALL, SOURCE(ALL));
    expect(read).toEqual({ ok: true, exemption: { exemptExtensions: ['.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.go', '.java', '.js', '.mjs', '.cjs', '.jsx', '.kt', '.lua', '.php', '.py', '.pyi', '.rb', '.rs', '.sh', '.sql', '.swift', '.tcl', '.ts', '.tsx'] } });
  });
  it('reads variant non-web: the 18 outside .js .mjs .cjs .jsx .ts .tsx .php', () => {
    const read = readCodeContentExemption(NON_WEB, SOURCE(NON_WEB));
    expect(read).toEqual({ ok: true, exemption: { exemptExtensions: ['.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.go', '.java', '.kt', '.lua', '.py', '.pyi', '.rb', '.rs', '.sh', '.sql', '.swift', '.tcl'] } });
  });
  it.each([
    ['is not an object', () => withExemption(ALL, ['.c'])],
    ['lacks renderCondition', () => { const { renderCondition: _r, ...rest } = exemptionOf(ALL); return withExemption(ALL, rest); }],
    ['carries an extra field', () => withExemption(ALL, { ...exemptionOf(ALL), note: 'x' })],
    ['renames a field, keeping the count', () => { const { egress, ...rest } = exemptionOf(ALL); return withExemption(ALL, { ...rest, egres: egress }); }],
    ['has another rule text', () => withExemption(ALL, { ...exemptionOf(ALL), rule: `${exemptionOf(ALL)['rule'] as string} ` })],
    ['has another renderCondition text', () => withExemption(ALL, { ...exemptionOf(ALL), renderCondition: (exemptionOf(ALL)['renderCondition'] as string).replace('\'none\'', '\'self\'') })],
    ['has another egress text', () => withExemption(ALL, { ...exemptionOf(ALL), egress: 'none' })],
    ['has another appliesTo text', () => withExemption(ALL, { ...exemptionOf(ALL), appliesTo: 'every body' })],
    ['lists no extension', () => withExemption(ALL, { ...exemptionOf(ALL), exemptExtensions: [] })],
    ['lists an extension twice', () => withExemption(ALL, { ...exemptionOf(ALL), exemptExtensions: ['.c', '.c'] })],
    ['lists an extension that is not a source extension', () => withExemption(ALL, { ...exemptionOf(ALL), exemptExtensions: ['.c', '.md'] })],
    ['lists a non-string', () => withExemption(ALL, { ...exemptionOf(ALL), exemptExtensions: ['.c', 3] })],
  ])('refuses an exemption that %s', (_name, scope) => {
    const read = readCodeContentExemption(scope(), SOURCE(ALL));
    expect(read.ok).toBe(false);
  });
  // The object test in @syzygy/support decides at three reads (syzygy-bpyt.6.3 stack 4): a scope, or its active-content part, that is not
  // an object declares no exemption, and a declaration that is not an object is refused in its own words. An array that carries a field
  // by name is still an array.
  it.each<[string, () => unknown]>([
    ['a scope that is null', () => null],
    ['a scope that is a string', () => 'x'],
    ['a scope that is an array', () => []],
    ['a scope that is an array carrying activeContent', () => Object.assign([], { activeContent: ALL['activeContent'] })],
    ['active content that is null', () => ({ activeContent: null })],
    ['active content that is a string', () => ({ activeContent: 'x' })],
    ['active content that is an array', () => ({ activeContent: [] })],
    ['active content that is an array carrying the exemption', () => ({ activeContent: Object.assign([], { codeContentExemption: exemptionOf(ALL) }) })],
  ])('reads none from %s', (_name, scope) => {
    expect(readCodeContentExemption(scope(), SOURCE(ALL))).toEqual({ ok: true, exemption: null });
  });
  it.each<[string, () => unknown]>([
    ['an array', () => []],
    ['null', () => null],
    ['a string', () => 'x'],
    ['a number', () => 1],
    ['an array carrying every field', () => Object.assign([], exemptionOf(ALL))],
  ])('refuses, in its own words, an exemption that is %s', (_name, exemption) => {
    expect(readCodeContentExemption(withExemption(ALL, exemption()), SOURCE(ALL))).toEqual({ ok: false, why: 'its code-content exemption is not an object' });
  });
  // R-PR409-DOSSIER-BLOCKERS-INSTALL-1 N4: the shape is the reader's own check, so a caller whose sourceExtensions carry a slash (which
  // codeContentExempt's final-segment match could never meet) is refused here rather than relying on that caller's validation.
  it.each([['x/y.c'], ['.x/c'], ['. c'], ['..c'], ['c'], ['.']])('refuses an exempt extension %j shaped other than a dot and a name, even when the caller lists it', entry => {
    const read = readCodeContentExemption(withExemption(ALL, { ...exemptionOf(ALL), exemptExtensions: ['.c', entry] }), [...SOURCE(ALL), entry]);
    expect(read).toEqual({ ok: false, why: 'its code-content exemption exemptExtensions lists an entry that is not a dot followed by no slash, no whitespace and no `..`' });
  });
});

describe('which bodies are exempt', () => {
  const all = (): readonly string[] => { const r = readCodeContentExemption(ALL, SOURCE(ALL)); if (!r.ok || r.exemption === null) throw new Error('unread'); return r.exemption.exemptExtensions; };
  const nonWeb = (): readonly string[] => { const r = readCodeContentExemption(NON_WEB, SOURCE(NON_WEB)); if (!r.ok || r.exemption === null) throw new Error('unread'); return r.exemption.exemptExtensions; };
  it('exempts a code-content body by the final segment\'s extension', () => {
    expect(codeContentExempt('src/server.c', 'code-content', { exemptExtensions: all() })).toBe(true);
    expect(codeContentExempt('deps/lua/src/lapi.h', 'code-content', { exemptExtensions: all() })).toBe(true);
    expect(codeContentExempt('web/app.js', 'code-content', { exemptExtensions: all() })).toBe(true);
  });
  it('never exempts a project-documentation body, nor a path no class admits, nor with no exemption declared', () => {
    expect(codeContentExempt('README.md', 'project-documentation', { exemptExtensions: all() })).toBe(false);
    expect(codeContentExempt('docs/notes.c', 'project-documentation', { exemptExtensions: all() })).toBe(false);
    expect(codeContentExempt('src/server.c', undefined, { exemptExtensions: all() })).toBe(false);
    expect(codeContentExempt('src/server.c', 'code-content', null)).toBe(false);
  });
  it('variant non-web scans .js .mjs .cjs .jsx .ts .tsx .php as before', () => {
    for (const name of ['a.js', 'a.mjs', 'a.cjs', 'a.jsx', 'a.ts', 'a.tsx', 'a.php']) expect(codeContentExempt(`web/${name}`, 'code-content', { exemptExtensions: nonWeb() }), name).toBe(false);
    expect(codeContentExempt('src/server.c', 'code-content', { exemptExtensions: nonWeb() })).toBe(true);
  });
  it('compares case-sensitively, by the final segment only', () => {
    expect(codeContentExempt('src/SERVER.C', 'code-content', { exemptExtensions: all() })).toBe(false);
    expect(codeContentExempt('src.c/README', 'code-content', { exemptExtensions: all() })).toBe(false);
  });
});

describe('the policy half of renderCondition on one page', () => {
  const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
  const page = (head: string, body = '<p>a&lt;b &amp;&amp; c&gt;d</p>'): string => `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>${body}</body>\n</html>\n`;
  const GOOD = page(`<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${CSP}\n<title>t</title>`);
  it('accepts a page whose only CSP meta comes first in <head> after the charset and viewport metas', () => {
    expect(pageSinkCspFinding(GOOD)).toBeNull();
    expect(pageSinkCspFinding(page(`${CSP}\n<title>t</title>`))).toBeNull();
  });
  it.each([
    ['no CSP meta', page('<meta charset="utf-8">\n<title>t</title>'), 'the page carries 0 Content-Security-Policy meta elements, not exactly one'],
    ['two CSP metas', page(`${CSP}\n${CSP}\n<title>t</title>`), 'the page carries 2 Content-Security-Policy meta elements, not exactly one'],
    ['a Report-Only CSP', page(CSP.replace('Content-Security-Policy"', 'Content-Security-Policy-Report-Only"')), 'the page\'s Content-Security-Policy is Report-Only, which enforces nothing'],
    ['the CSP after <title>', page(`<meta charset="utf-8">\n<title>t</title>\n${CSP}`), 'the page\'s Content-Security-Policy is not delivered first in <head>, before every other element but the charset and viewport metas'],
    ['the CSP in <body>', page('<title>t</title>', CSP), 'the page\'s Content-Security-Policy is not delivered first in <head>, before every other element but the charset and viewport metas'],
    ['default-src \'self\'', page(CSP.replace('default-src \'none\'', 'default-src \'self\'')), 'the page\'s default-src source list is not exactly \'none\''],
    ['default-src \'none\' with another source', page(CSP.replace('default-src \'none\'', 'default-src \'none\' https:')), 'the page\'s default-src source list is not exactly \'none\''],
    ['no default-src', page(CSP.replace('default-src \'none\'; ', '')), 'the page\'s default-src source list is not exactly \'none\''],
    ['a script-src', page(CSP.replace('img-src data:', 'script-src \'unsafe-inline\'')), 'the page\'s Content-Security-Policy carries script-src, which may override default-src for script or plugins'],
    ['a script-src-attr', page(CSP.replace('img-src data:', 'script-src-attr \'unsafe-inline\'')), 'the page\'s Content-Security-Policy carries script-src-attr, which may override default-src for script or plugins'],
    ['an object-src', page(CSP.replace('img-src data:', 'object-src *')), 'the page\'s Content-Security-Policy carries object-src, which may override default-src for script or plugins'],
  ])('refuses a page with %s', (_name, html, why) => {
    expect(pageSinkCspFinding(html)).toBe(why);
  });
});
