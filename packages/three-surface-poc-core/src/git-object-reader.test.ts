// PWB-REQ-006 counterexample sweep: the exact Git object reader.
//
// Oracle independence: malicious paths, active sentinels, limit values and
// the Git spy are all supplied here, outside production code. The spy
// throws on any command other than `cat-file blob <hex>` so that a request
// escaping the object reader fails the test rather than reaching a
// filesystem. Expected refusal reasons and forms are hand-typed literals.
// Sink scans serialize everything the module returns and look for the
// sentinel bytes.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  ACTIVE_CONTENT_FORMS,
  PWB_DENIED_PATH_RULES,
  PWB_POLICY_IDENTITY,
  READ_REFUSAL_REASONS,
  admitExactObjectRead,
  contentDigestOf,
  createExactObjectReader,
  deniedPathReason,
  evaluateLimit,
  readManifestSources,
  scanActiveContent,
  type ExactObjectReader,
  type ObjectReadRecord,
} from './git-object-reader.js';
import { indexGitTree, type GitTreeEntry } from './git-tree.js';
import { recognizeCodeContexts } from './markdown-code-context.js';
import type { ManifestSource } from './project-shape-manifest.js';
import { PWB_RESOURCE_LIMITS, type PwbResourceLimits } from './project-shape-observation.js';
import { createResourceLedger } from './resource-ledger.js';

// ---------------------------------------------------------------------
// Fixture repository: bodies, real Git object ids, a tree with every
// entry kind the guard must refuse.

const enc = new TextEncoder();
const sha1Blob = (bytes: Uint8Array): string =>
  createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');

const SENTINELS = {
  script: '<script>alert("pwb-sentinel-1")</script>',
  svg: '<svg onload="pwb-sentinel-2()"></svg>',
  handler: '<img src=x onerror="pwb-sentinel-3()">',
  jsLink: '[click](javascript:pwb_sentinel_4())',
  dataLink: '[img](data:text/html;base64,cHdiLXNlbnRpbmVsLTU=)',
  entityLink: '[x](&#106;avascript:pwb_sentinel_6())',
  refDef: '[ref]: javascript:pwb_sentinel_7()',
  comment: '<!-- pwb-sentinel-8 -->',
  div: '<div class="pwb-sentinel-9">',
  unclosedFence: '```\npwb-sentinel-10\n',
} as const;

const TEXTS: Record<string, string> = {
  'about/README.md': '# About\n\n- [Heart](heart-and-soul/README.md)\n',
  'about/heart-and-soul/README.md': '# Heart and soul\n\nSee <https://example.org/x> and <me@example.org>. 1 < 2 > 0.\n',
  'about/heart-and-soul/vision.md': '# Vision\n\nmetadata: plain words\n\n[ok](./principles.md) [abs](https://example.org/?a=1&b=2)\n',
  'openspec/specs/one/spec.md': '# One\n',
  'roster/alpha/butler.toml': 'name = "alpha"\n',
  'notes/script.md': `# Notes\n\n${SENTINELS.script}\n`,
  'notes/svg.md': `${SENTINELS.svg}\n`,
  'notes/handler.md': `${SENTINELS.handler}\n`,
  'notes/js-link.md': `${SENTINELS.jsLink}\n`,
  'notes/data-link.md': `${SENTINELS.dataLink}\n`,
  'notes/entity-link.md': `${SENTINELS.entityLink}\n`,
  'notes/ref-def.md': `${SENTINELS.refDef}\n`,
  'notes/comment.md': `${SENTINELS.comment}\n`,
  'notes/div.md': `${SENTINELS.div}\n`,
  'notes/unclosed-fence.md': SENTINELS.unclosedFence,
  'notes/inert-code.md': `# Inert\n\n\`\`\`html\n${SENTINELS.script}\n${SENTINELS.svg}\n\`\`\`\n\nUse \`${SENTINELS.div}\` and \`${SENTINELS.jsLink}\` as text.\n`,
  '.env': 'SECRET=1\n',
  'config/secrets.json': '{}\n',
  'keys/id_rsa': 'x\n',
  'keys/.env.staging': 'x\n',
  'certs/server.pem': 'x\n',
  'certs/Server.KEY': 'x\n',
  'deep/a/b/c/d/e/file.md': '# Deep\n',
};
const BYTES: Record<string, Uint8Array> = Object.fromEntries(Object.entries(TEXTS).map(([path, text]) => [path, enc.encode(text)]));
const NUL_BYTES = enc.encode('a\0b');
const BAD_UTF8 = new Uint8Array([0x23, 0x20, 0xff, 0xfe, 0x0a]);
const oidOf = (path: string): string => sha1Blob(BYTES[path] as Uint8Array);
const SYMLINK_OID = 'a'.repeat(40);
const SUBMODULE_OID = 'b'.repeat(40);
const TREE_OID = 'c'.repeat(40);
const NUL_OID = sha1Blob(NUL_BYTES);
const BAD_UTF8_OID = sha1Blob(BAD_UTF8);

function blob(path: string, mode = '100644'): GitTreeEntry {
  return { mode, type: 'blob', objectId: oidOf(path), sizeBytes: (BYTES[path] as Uint8Array).byteLength, path };
}

const TREE: readonly GitTreeEntry[] = [
  ...Object.keys(TEXTS).map((path) => blob(path, path === 'roster/alpha/butler.toml' ? '100755' : '100644')),
  { mode: '120000', type: 'blob', objectId: SYMLINK_OID, sizeBytes: 12, path: 'about/link.md' },
  { mode: '160000', type: 'commit', objectId: SUBMODULE_OID, path: 'vendor/sub' },
  { mode: '040000', type: 'tree', objectId: TREE_OID, path: 'about/tree-entry' },
  { mode: '100644', type: 'blob', objectId: NUL_OID, sizeBytes: NUL_BYTES.byteLength, path: 'binary/nul.md' },
  { mode: '100644', type: 'blob', objectId: BAD_UTF8_OID, sizeBytes: BAD_UTF8.byteLength, path: 'binary/latin1.md' },
  { mode: '100644', type: 'blob', objectId: oidOf('about/README.md'), path: 'unsized/README.md' },
  // A listing that names a regular-file mode but not a blob: type is checked, not only mode.
  { mode: '100644', type: 'commit', objectId: SUBMODULE_OID, path: 'vendor/mislabeled' },
];

interface SpyOptions {
  readonly blobOverrides?: Record<string, Uint8Array | 'throw'>;
}

function gitSpy(options: SpyOptions = {}): { readonly runGit: (args: readonly string[]) => Uint8Array; readonly calls: string[][] } {
  const byOid = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(BYTES)) byOid.set(oidOf(path), bytes);
  byOid.set(NUL_OID, NUL_BYTES);
  byOid.set(BAD_UTF8_OID, BAD_UTF8);
  byOid.set(SYMLINK_OID, enc.encode('/etc/passwd'));
  const calls: string[][] = [];
  const runGit = (args: readonly string[]): Uint8Array => {
    calls.push([...args]);
    if (args.length !== 3 || args[0] !== 'cat-file' || args[1] !== 'blob' || !/^[0-9a-f]{40}$/.test(args[2] ?? '')) {
      throw new Error(`spy: request escaped the object reader: git ${args.join(' ')}`);
    }
    const oid = args[2] as string;
    const override = options.blobOverrides?.[oid];
    if (override === 'throw') throw new Error('fatal: Not a valid object name');
    if (override !== undefined) return override;
    const bytes = byOid.get(oid);
    if (bytes === undefined) throw new Error('fatal: Not a valid object name');
    return bytes;
  };
  return { runGit, calls };
}

function reader(limits: Partial<PwbResourceLimits> = {}, options: SpyOptions = {}): { readonly reader: ExactObjectReader; readonly calls: string[][] } {
  const spy = gitSpy(options);
  return {
    reader: createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), resourceLimits: { ...PWB_RESOURCE_LIMITS, ...limits } }),
    calls: spy.calls,
  };
}

const ALL_SENTINEL_BYTES = [...Object.values(SENTINELS), 'pwb-sentinel', 'pwb_sentinel', 'alert(', 'javascript', 'onerror', 'onload', 'SECRET=1', '/etc/passwd'];

function assertNoSentinel(sink: unknown): void {
  const bytes = JSON.stringify(sink);
  for (const sentinel of ALL_SENTINEL_BYTES) expect(bytes, `sink carries ${sentinel}`).not.toContain(sentinel);
  expect(bytes).not.toMatch(/"text"/);
}

// ---------------------------------------------------------------------

describe('read guard — paths that must never reach Git', () => {
  const MALICIOUS: readonly (readonly [string, string])[] = [
    ['/etc/passwd', 'path-escapes-repository'],
    ['/about/README.md', 'path-escapes-repository'],
    ['../about/README.md', 'path-escapes-repository'],
    ['about/../../README.md', 'path-escapes-repository'],
    ['about/README.md\0', 'path-escapes-repository'],
    ['abo\0ut/README.md', 'path-escapes-repository'],
    ['', 'path-escapes-repository'],
    ['.', 'path-escapes-repository'],
    ['..', 'path-escapes-repository'],
    ['about/..', 'path-escapes-repository'],
    ['about/../about/README.md', 'path-not-normalized'],
    ['about/./README.md', 'path-not-normalized'],
    ['./about/README.md', 'path-not-normalized'],
    ['about//README.md', 'path-not-normalized'],
    ['about/README.md/', 'path-not-normalized'],
    ['about/heart-and-soul/README.md/../vision.md', 'path-not-normalized'],
    ['.env', 'denied-basename'],
    ['config/secrets.json', 'denied-basename'],
    ['keys/id_rsa', 'denied-basename'],
    ['keys/.env.staging', 'denied-prefix'],
    ['certs/server.pem', 'denied-suffix'],
    ['certs/Server.KEY', 'denied-suffix'],
    ['.git/config', 'not-in-tree'],
    ['C:\\Windows\\system32', 'not-in-tree'],
    ['about/missing.md', 'not-in-tree'],
    ['about/link.md', 'not-a-regular-blob'],
    ['vendor/sub', 'not-a-regular-blob'],
    ['vendor/sub/README.md', 'not-in-tree'],
    ['about/tree-entry', 'not-a-regular-blob'],
    ['vendor/mislabeled', 'not-a-regular-blob'],
  ];

  it.each(MALICIOUS)('refuses %j as %s without any Git call', (path, reason) => {
    const { reader: r, calls } = reader();
    const result = r.read(path);
    expect(result.kind).toBe('unavailable');
    expect(result.record).toEqual({ path, outcome: 'refused', bytes: 0, detail: reason });
    expect(calls).toEqual([]);
    expect(r.records).toHaveLength(1);
  });

  it('refuses a caller-supplied object id that differs from the tree', () => {
    const { reader: r, calls } = reader();
    const result = r.read('about/README.md', 'd'.repeat(40));
    expect(result.record.detail).toBe('object-id-differs-from-tree');
    expect(calls).toEqual([]);
  });

  it('the admission vocabulary is closed and every reason is exercised above', () => {
    expect([...READ_REFUSAL_REASONS].sort()).toEqual(
      [
        'denied-basename',
        'denied-prefix',
        'denied-suffix',
        'not-a-regular-blob',
        'not-in-tree',
        'object-id-differs-from-tree',
        'path-escapes-repository',
        'path-not-normalized',
      ].sort(),
    );
    const exercised = new Set([...MALICIOUS.map(([, reason]) => reason), 'object-id-differs-from-tree']);
    for (const reason of READ_REFUSAL_REASONS) expect(exercised.has(reason), reason).toBe(true);
  });

  it('admits a regular blob by exact tree identity, executable mode included', () => {
    const tree = indexGitTree(TREE);
    expect(admitExactObjectRead(tree, 'about/README.md')).toEqual({ kind: 'admitted', entry: blob('about/README.md') });
    expect(admitExactObjectRead(tree, 'roster/alpha/butler.toml', oidOf('roster/alpha/butler.toml'))).toEqual({
      kind: 'admitted',
      entry: blob('roster/alpha/butler.toml', '100755'),
    });
  });

  it('denied-path rules apply to the final segment only', () => {
    expect(deniedPathReason('.env/README.md')).toBeUndefined();
    expect(deniedPathReason('a/.env')).toBe('denied-basename');
    expect(deniedPathReason('a/.env.local')).toBe('denied-basename');
    expect(deniedPathReason('a/.env.anything')).toBe('denied-prefix');
    expect(deniedPathReason('a/x.pem')).toBe('denied-suffix');
    expect(deniedPathReason('a/pem')).toBeUndefined();
    expect(deniedPathReason('a/keyring.md')).toBeUndefined();
  });
});

describe('exact object reads', () => {
  it('issues exactly one `cat-file blob <oid>` per admitted read and returns the body only through the result', () => {
    const { reader: r, calls } = reader();
    const result = r.read('about/heart-and-soul/README.md');
    expect(result.kind).toBe('text');
    if (result.kind !== 'text') throw new Error('unreachable');
    expect(result.text).toBe(TEXTS['about/heart-and-soul/README.md']);
    expect(calls).toEqual([['cat-file', 'blob', oidOf('about/heart-and-soul/README.md')]]);
    const expectedDigest = `sha256:${createHash('sha256').update(BYTES['about/heart-and-soul/README.md'] as Uint8Array).digest('hex')}`;
    expect(result.record).toEqual({
      path: 'about/heart-and-soul/README.md',
      objectId: oidOf('about/heart-and-soul/README.md'),
      outcome: 'read',
      bytes: (BYTES['about/heart-and-soul/README.md'] as Uint8Array).byteLength,
      contentDigest: expectedDigest,
    });
    expect(contentDigestOf(BYTES['about/heart-and-soul/README.md'] as Uint8Array)).toBe(expectedDigest);
    expect(r.records).toEqual([result.record]);
    expect(r.totalBytes()).toBe(result.record.bytes);
  });

  it('a benign Markdown body with autolinks, comparisons, prose colons and query strings is read', () => {
    const { reader: r } = reader();
    expect(r.read('about/heart-and-soul/README.md').kind).toBe('text');
    expect(r.read('about/heart-and-soul/vision.md').kind).toBe('text');
    expect(r.read('roster/alpha/butler.toml').kind).toBe('text');
  });

  it('rejects bytes that do not hash to the tree-named object', () => {
    const oid = oidOf('about/README.md');
    const { reader: r } = reader({}, { blobOverrides: { [oid]: enc.encode('# About\n\ntampered\n') } });
    const result = r.read('about/README.md');
    expect(result.kind).toBe('unavailable');
    expect(result.record.outcome).toBe('object-id-mismatch');
    expect(result.record.contentDigest).toBe(contentDigestOf(enc.encode('# About\n\ntampered\n')));
  });

  it('rejects NUL bytes and invalid UTF-8 after the identity check', () => {
    const { reader: r } = reader();
    expect(r.read('binary/nul.md').record.outcome).toBe('contains-nul');
    expect(r.read('binary/latin1.md').record.outcome).toBe('not-utf-8');
  });

  it('drops one leading byte-order mark from the decoded text and keeps a second', () => {
    // Typed here from the Unicode rule the decoder follows (UTF-8 BOM EF BB BF), not read back from the module.
    const readBytes = (bytes: Uint8Array) => {
      const path = 'notes/bom.md';
      const tree = indexGitTree([{ mode: '100644', type: 'blob', objectId: sha1Blob(bytes), sizeBytes: bytes.byteLength, path }]);
      return createExactObjectReader({ runGit: () => bytes, tree, resourceLimits: PWB_RESOURCE_LIMITS }).read(path);
    };
    expect(readBytes(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61, 0x0a]))).toMatchObject({ kind: 'text', text: 'a\n', record: { outcome: 'read' } });
    expect(readBytes(Uint8Array.from([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 0x61]))).toMatchObject({ kind: 'text', text: '\uFEFFa', record: { outcome: 'read' } });
  });

  it('a Git failure is recorded, not thrown', () => {
    const { reader: r } = reader({}, { blobOverrides: { [oidOf('about/README.md')]: 'throw' } });
    const result = r.read('about/README.md');
    expect(result.record.outcome).toBe('git-read-failed');
    expect(result.record.detail).toBe('fatal: Not a valid object name');
    expect(result.record.bytes).toBe(0);
  });
});

describe('active content is rejected and never reaches a sink', () => {
  const ACTIVE: readonly (readonly [string, string])[] = [
    ['notes/script.md', 'script-element'],
    ['notes/svg.md', 'svg-element'],
    ['notes/handler.md', 'html-tag'],
    ['notes/js-link.md', 'unsafe-url-scheme'],
    ['notes/data-link.md', 'unsafe-url-scheme'],
    ['notes/entity-link.md', 'obfuscated-link-destination'],
    ['notes/ref-def.md', 'unsafe-url-scheme'],
    ['notes/comment.md', 'html-comment-or-declaration'],
    ['notes/div.md', 'html-tag'],
    ['notes/unclosed-fence.md', 'malformed-code-context'],
  ];

  it('markup examples wholly inside closed code contexts read as text (PWB-REQ-006 amended)', () => {
    const { reader: r } = reader();
    const result = r.read('notes/inert-code.md');
    expect(result.kind).toBe('text');
    expect(result.record.outcome).toBe('read');
    expect(result.record.activeContent).toBeUndefined();
    if (result.kind === 'text') expect(result.text).toContain(SENTINELS.script);
  });

  it.each(ACTIVE)('%s stays counted as active-content (%s) with a body-free record', (path, form) => {
    const { reader: r } = reader();
    const result = r.read(path);
    expect(result.kind).toBe('unavailable');
    expect(result.record.outcome).toBe('active-content');
    expect(result.record.activeContent?.map((f) => f.form)).toContain(form);
    expect(result.record.objectId).toBe(oidOf(path));
    expect(result.record.bytes).toBe((BYTES[path] as Uint8Array).byteLength);
    assertNoSentinel(result);
    assertNoSentinel(r.records);
  });

  it('the handler sentinels also name the event-handler form', () => {
    const forms = (text: string): string[] => scanActiveContent(text).map((f) => f.form);
    expect(forms(SENTINELS.svg)).toEqual(expect.arrayContaining(['svg-element', 'event-handler-attribute']));
    expect(forms(SENTINELS.handler)).toEqual(expect.arrayContaining(['html-tag', 'event-handler-attribute']));
  });

  it('scanActiveContent: forms, positions, obfuscation and case', () => {
    expect(scanActiveContent('a\nb <SCRIPT src=x>')).toEqual([{ form: 'script-element', line: 2, column: 3 }]);
    expect(scanActiveContent('[x](JaVaScRiPt:1)').map((f) => f.form)).toEqual(['unsafe-url-scheme']);
    expect(scanActiveContent('[x](java\tscript:1)').map((f) => f.form)).toEqual(['unsafe-url-scheme']);
    expect(scanActiveContent('[x](vbscript:1)').map((f) => f.form)).toEqual(['unsafe-url-scheme']);
    expect(scanActiveContent('[x](file:///etc/passwd)').map((f) => f.form)).toEqual(['unsafe-url-scheme']);
    expect(scanActiveContent('<javascript:alert(1)>').map((f) => f.form)).toEqual(['unsafe-url-scheme']);
    expect(scanActiveContent('[x](&#x6A;avascript:1)').map((f) => f.form)).toEqual(['obfuscated-link-destination']);
    expect(scanActiveContent('[x](java&colon;script)').map((f) => f.form)).toEqual(['obfuscated-link-destination']);
    expect(scanActiveContent('<!DOCTYPE html>').map((f) => f.form)).toEqual(['html-comment-or-declaration']);
    expect(scanActiveContent('<![CDATA[x]]>').map((f) => f.form)).toEqual(['html-comment-or-declaration']);
    expect(scanActiveContent('<?php echo 1 ?>').map((f) => f.form)).toEqual(['html-comment-or-declaration']);
    expect(scanActiveContent('<iframe src="x"></iframe>').map((f) => f.form)).toEqual(['html-tag', 'html-tag']);
    expect(scanActiveContent('text <br/> more').map((f) => f.form)).toEqual(['html-tag']);
  });

  it('scanActiveContent: benign Markdown yields no finding', () => {
    for (const text of [
      '',
      '# Title\n\nplain prose with metadata: value and file: mention\n',
      '<https://example.org/path?a=1&b=2>',
      '<me@example.org>',
      '1 < 2 and 3 > 2',
      '[link](https://example.org/?a=1&b=2)',
      '[rel](./other.md "title")',
      '[ref]: https://example.org/x',
      '![img](./pic.png)',
      'a -> b => c',
      'code spans are scanned like any other text; `a<b` and `x > y` are fine',
    ]) {
      expect(scanActiveContent(text), text).toEqual([]);
    }
  });

  // PWB-REQ-006 as amended 2026-09-05 (policy `activeContentClassification`):
  // closed inline code spans and fenced code blocks are inert contexts.
  it('every sentinel inside a closed code fence or inline span is inert', () => {
    for (const [name, sentinel] of Object.entries(SENTINELS)) {
      if (name === 'unclosedFence') continue;
      expect(scanActiveContent(`# Doc\n\n\`\`\`html\n${sentinel}\n\`\`\`\n`), sentinel).toEqual([]);
      expect(scanActiveContent(`~~~\n${sentinel}\n~~~`), sentinel).toEqual([]);
      expect(scanActiveContent(`use \`${sentinel}\` here`), sentinel).toEqual([]);
      expect(scanActiveContent(`use \`\` ${sentinel} \`\` here`), sentinel).toEqual([]);
    }
  });

  it('the same sentinel outside the context still excludes, at its raw position', () => {
    const text = '```\n<div>\n```\nafter `<br>` and <SCRIPT>';
    expect(scanActiveContent(text)).toEqual([{ form: 'script-element', line: 4, column: 18 }]);
  });

  it('indented code and HTML code elements are not inert contexts', () => {
    expect(scanActiveContent('para\n\n    <div>\n').map((f) => f.form)).toEqual(['html-tag']);
    expect(scanActiveContent('<code>&lt;x&gt;</code>').map((f) => f.form)).toEqual(['html-tag', 'html-tag']);
  });

  it('a malformed code context is itself a finding that excludes the source', () => {
    expect(scanActiveContent('a\n```\nnever closed')).toEqual([{ form: 'malformed-code-context', line: 2, column: 1, context: 'unclosed-fence' }]);
    expect(scanActiveContent('text `open span\nstill open')).toEqual([{ form: 'malformed-code-context', line: 1, column: 1, context: 'unclosed-inline-span' }]);
    expect(scanActiveContent('```js `x`\ncode\n```')).toEqual([{ form: 'malformed-code-context', line: 1, column: 1, context: 'backtick-fence-with-backtick-in-info-string' }]);
    // A closer shorter than the opener, or with trailing text, does not close.
    expect(scanActiveContent('````\n```\nx\n``` y\n').map((f) => f.form)).toEqual(['malformed-code-context']);
    // Different-length backtick runs are content, so the span never closes.
    expect(scanActiveContent('`` a ` b').map((f) => f.form)).toEqual(['malformed-code-context']);
  });

  it('the form vocabulary is closed and every form is produced by a sentinel above', () => {
    expect([...ACTIVE_CONTENT_FORMS].sort()).toEqual(
      ['event-handler-attribute', 'html-comment-or-declaration', 'html-tag', 'malformed-code-context', 'obfuscated-link-destination', 'script-element', 'svg-element', 'unsafe-url-scheme'].sort(),
    );
    const produced = new Set<string>();
    for (const text of [...Object.values(SENTINELS), SENTINELS.unclosedFence]) for (const f of scanActiveContent(text)) produced.add(f.form);
    for (const form of ACTIVE_CONTENT_FORMS) expect(produced.has(form), form).toBe(true);
  });
});

const ENDS: readonly (readonly [string, string])[] = [['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']];

function readOne(text: string): ReturnType<ExactObjectReader['read']> {
  const bytes = enc.encode(text);
  const oid = sha1Blob(bytes);
  const entry: GitTreeEntry = { mode: '100644', type: 'blob', objectId: oid, sizeBytes: bytes.byteLength, path: 'notes/line-ends.md' };
  const runGit = (args: readonly string[]): Uint8Array => {
    if (args.length !== 3 || args[0] !== 'cat-file' || args[1] !== 'blob' || args[2] !== oid) throw new Error(`spy: request escaped the object reader: git ${args.join(' ')}`);
    return bytes;
  };
  return createExactObjectReader({ runGit, tree: indexGitTree([entry]), resourceLimits: PWB_RESOURCE_LIMITS }).read('notes/line-ends.md');
}

// syzygy-bpyt.16 (ruled on syzygy-bpyt.1.14): the reader hands a blob's decoded text to the scan with its line ends as they are, and the
// code-context mask ends a line at CRLF, CR and LF alike, so a CRLF or CR blob gets the outcome its LF form gets. The first text was
// admitted under CRLF and CR before the fix (a backtick opener whose info text holds a backtick, hiding a script element as an inline
// span); the second was excluded (a tilde fence that the mask did not recognize, leaving the script element it holds in the open).
describe('a CRLF or CR blob gets the outcome its LF form gets', () => {
  const FAIL_OPEN = ['# Doc', '', '```a`b', '<script>alert(1)</script>', '```', ''];
  const BENIGN = ['# Doc', '', '~~~', '<script>alert(1)</script>', '~~~', 'after', ''];

  it.each(ENDS)('%s: a backtick opener whose info text holds a backtick is excluded as a malformed code context, with a body-free record', (_name, end) => {
    const text = FAIL_OPEN.join(end);
    const result = readOne(text);
    expect(result.kind).toBe('unavailable');
    expect(result.record.outcome).toBe('active-content');
    expect(result.record.activeContent).toEqual([{ form: 'malformed-code-context', line: 3, column: 1, context: 'backtick-fence-with-backtick-in-info-string' }]);
    expect(result.record.bytes).toBe(enc.encode(text).byteLength);
    expect(JSON.stringify(result)).not.toContain('alert(1)');
  });

  it.each(ENDS)('%s: a script element inside a closed tilde fence reads as text, byte for byte', (_name, end) => {
    const text = BENIGN.join(end);
    const result = readOne(text);
    expect(result.kind).toBe('text');
    expect(result.record.outcome).toBe('read');
    expect(result.record.activeContent).toBeUndefined();
    if (result.kind === 'text') expect(result.text).toBe(text);
  });
});

describe('a 200,000-line closed fence under the read limit (GP-B2 Q1)', () => {
  // GP-B2 Q1 (syzygy-bpyt.1.18): a blob under the per-source read limit whose closed fence runs 200,000 lines used to throw a RangeError out
  // of the reader (it rethrows everything but a parse-pass breach); it now reads, and the active-content scan decides it.
  const LONG_LINES = 200_000;

  // A larger stack (a worker-thread pool runs at 4 MB) lets the old line pass the size tests below; this canary fails first, by name.
  it('one spread call over 200,002 arguments still overflows the stack in this test process', () => {
    const sink: unknown[] = [];
    expect(() => sink.push(...new Array<unknown>(LONG_LINES + 2))).toThrow(RangeError);
  });

  it.each(ENDS)('%s: a 200,000-line closed fence holding a script element reads as text, under the read limit', (_name, end) => {
    const text = `~~~${end}<script>${end}${`x${end}`.repeat(LONG_LINES)}~~~${end}after${end}`;
    expect(enc.encode(text).byteLength).toBeLessThan(PWB_RESOURCE_LIMITS.maxBytesPerSource);
    const result = readOne(text);
    expect(result.kind).toBe('text');
    expect(result.record.outcome).toBe('read');
    expect(result.record.activeContent).toBeUndefined();
    if (result.kind === 'text') expect(result.text === text, 'the text read differs from the blob').toBe(true);
  });

  it.each(ENDS)('%s: a script element after a 200,000-line closed fence is found, with a body-free record', (_name, end) => {
    const text = `~~~${end}${`x${end}`.repeat(LONG_LINES)}~~~${end}<script>alert(1)</script>${end}`;
    expect(enc.encode(text).byteLength).toBeLessThan(PWB_RESOURCE_LIMITS.maxBytesPerSource);
    const result = readOne(text);
    expect(result.kind).toBe('unavailable');
    expect(result.record.outcome).toBe('active-content');
    // Forms only: positionOf counts LF, so a bare-CR text reports line 1 (the GAP below).
    expect(result.record.activeContent?.map((finding) => finding.form)).toEqual(['script-element', 'script-element']);
    expect(JSON.stringify(result)).not.toContain('alert(1)');
  });

  it.each(ENDS)('%s: scanActiveContent over a 200,000-line closed fence finds nothing inside it', (_name, end) => {
    expect(scanActiveContent(`~~~${end}<script>${end}${`x${end}`.repeat(LONG_LINES)}~~~${end}`)).toEqual([]);
  });
});

// syzygy-bpyt.55 (D1): the recognizer is total, so a malformed text still has ranges (an unclosed fence runs to the end, an opener with a
// backtick in its info string still opens, a span open at a fence opener is dropped). The gate never acts on them: the profile's decision
// is to exclude the whole artifact, so the scan reports the one malformed finding and reads nothing else of the text, and the reader hands
// no text on. Each text holds a script element inside the recovered range and one outside it; neither is reported.
describe('a malformed code context is excluded whole, and the recognizer\'s recovery is never acted on', () => {
  const CASES = [
    ['unclosed-fence', ['<script>out</script>', '```', '<script>in</script>'].join('\n'), 2],
    ['backtick-fence-with-backtick-in-info-string', ['```a`b', '<script>in</script>', '```', '<script>out</script>'].join('\n'), 1],
    ['unclosed-inline-span', ['`open', '```', '<script>in</script>', '```', '<script>out</script>'].join('\n'), 1],
  ] as const;

  it.each(CASES)('%s: the scan reports the one finding and nothing from the recovered ranges', (reason, text, line) => {
    const recognition = recognizeCodeContexts(text);
    expect(recognition.malformed).toEqual({ reason, line });
    expect(recognition.fenceRanges.length).toBeGreaterThan(0);
    expect(scanActiveContent(text)).toEqual([{ form: 'malformed-code-context', line, column: 1, context: reason }]);
  });

  it.each(CASES)('%s: the reader refuses the blob and hands on no text', (reason, text, line) => {
    const result = readOne(text);
    expect(result.kind).toBe('unavailable');
    expect('text' in result).toBe(false);
    expect(result.record.outcome).toBe('active-content');
    expect(result.record.activeContent).toEqual([{ form: 'malformed-code-context', line, column: 1, context: reason }]);
  });
});

// GAP, for the line-model follow-up of syzygy-bpyt.16: positionOf counts LF only, so a CRLF text reports its LF form's positions and
// a bare-CR text reports line 1 with the offset as column, while a malformed finding takes the mask's line, which counts every line end.
describe('reported positions in CRLF and bare-CR texts', () => {
  it('CRLF as LF; a bare CR counted by the malformed line only', () => {
    expect(scanActiveContent('a\r\n<script>x</script>')).toEqual([{ form: 'script-element', line: 2, column: 1 }, { form: 'script-element', line: 2, column: 10 }]);
    expect(scanActiveContent('a\r<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);
    expect(scanActiveContent('a\rb\r`x')).toEqual([{ form: 'malformed-code-context', line: 3, column: 1, context: 'unclosed-inline-span' }]);
  });

  it('U+2028 is line content: an LF text reports its finding on line 1', () => {
    expect(scanActiveContent('a\u2028<script>x</script>')).toEqual([{ form: 'script-element', line: 1, column: 3 }, { form: 'script-element', line: 1, column: 12 }]);
  });
});

describe('declared resource limits are evaluation inputs', () => {
  it('evaluateLimit: at the limit passes, one over breaches, for every declared limit', () => {
    const limits: PwbResourceLimits = { maxSources: 3, maxBytesPerSource: 10, maxTotalBytes: 20, maxIndexDepth: 4, maxParsePassesPerSource: 16, maxHumanResponseBytes: 100, maxMachineResponseBytes: 400 };
    const names: (keyof PwbResourceLimits)[] = ['maxSources', 'maxBytesPerSource', 'maxTotalBytes', 'maxIndexDepth', 'maxParsePassesPerSource', 'maxHumanResponseBytes', 'maxMachineResponseBytes'];
    expect(names.length).toBe(Object.keys(PWB_RESOURCE_LIMITS).length);
    for (const name of names) {
      expect(evaluateLimit(limits, name, limits[name]), name).toBeUndefined();
      expect(evaluateLimit(limits, name, 0), name).toBeUndefined();
      expect(evaluateLimit(limits, name, limits[name] + 1), name).toEqual({ limit: name, declared: limits[name], observed: limits[name] + 1 });
      expect(evaluateLimit(limits, name, limits[name] + 1, 'p'), name).toEqual({ limit: name, declared: limits[name], observed: limits[name] + 1, path: 'p' });
      expect(evaluateLimit(limits, name, Number.NaN), name).toBeDefined();
      expect(evaluateLimit(limits, name, Number.POSITIVE_INFINITY), name).toBeDefined();
    }
  });

  it('maxSources: reads beyond the count stay counted as over-limit and issue no Git call', () => {
    const { reader: r, calls } = reader({ maxSources: 2 });
    const paths = ['about/README.md', 'about/heart-and-soul/README.md', 'about/heart-and-soul/vision.md', 'openspec/specs/one/spec.md'];
    const outcomes = paths.map((path) => r.read(path).record.outcome);
    expect(outcomes).toEqual(['read', 'read', 'over-limit', 'over-limit']);
    expect(calls).toHaveLength(2);
    expect(r.records).toHaveLength(4);
    expect(r.breaches).toEqual([
      { limit: 'maxSources', declared: 2, observed: 3, path: 'about/heart-and-soul/vision.md' },
      { limit: 'maxSources', declared: 2, observed: 4, path: 'openspec/specs/one/spec.md' },
    ]);
    expect(r.records[2]).toEqual({ path: 'about/heart-and-soul/vision.md', outcome: 'over-limit', bytes: 0, detail: 'maxSources' });
  });

  it('maxBytesPerSource: a declared over-size blob is never opened', () => {
    const size = (BYTES['about/heart-and-soul/vision.md'] as Uint8Array).byteLength;
    const { reader: r, calls } = reader({ maxBytesPerSource: size - 1 });
    const result = r.read('about/heart-and-soul/vision.md');
    expect(result.record).toEqual({ path: 'about/heart-and-soul/vision.md', objectId: oidOf('about/heart-and-soul/vision.md'), outcome: 'over-limit', bytes: 0, detail: 'maxBytesPerSource' });
    expect(calls).toEqual([]);
    expect(r.breaches).toEqual([{ limit: 'maxBytesPerSource', declared: size - 1, observed: size, path: 'about/heart-and-soul/vision.md' }]);
    const exact = reader({ maxBytesPerSource: size });
    expect(exact.reader.read('about/heart-and-soul/vision.md').kind).toBe('text');
  });

  it('maxTotalBytes: the read that would cross the total is not opened; later smaller reads still may be', () => {
    const a = (BYTES['about/README.md'] as Uint8Array).byteLength;
    const b = (BYTES['about/heart-and-soul/README.md'] as Uint8Array).byteLength;
    const c = (BYTES['openspec/specs/one/spec.md'] as Uint8Array).byteLength;
    const { reader: r, calls } = reader({ maxTotalBytes: a + c });
    expect(r.read('about/README.md').kind).toBe('text');
    expect(r.read('about/heart-and-soul/README.md').record).toMatchObject({ outcome: 'over-limit', detail: 'maxTotalBytes', bytes: 0 });
    expect(r.read('openspec/specs/one/spec.md').kind).toBe('text');
    expect(calls).toHaveLength(2);
    expect(r.totalBytes()).toBe(a + c);
    expect(r.breaches).toEqual([{ limit: 'maxTotalBytes', declared: a + c, observed: a + b, path: 'about/heart-and-soul/README.md' }]);
  });

  it('a blob the listing did not size is bounded after the read and its bytes are dropped', () => {
    const size = (BYTES['about/README.md'] as Uint8Array).byteLength;
    const { reader: r, calls } = reader({ maxBytesPerSource: size - 1 });
    const result = r.read('unsized/README.md');
    expect(calls).toHaveLength(1);
    expect(result.kind).toBe('unavailable');
    expect(result.record).toMatchObject({ outcome: 'over-limit', detail: 'maxBytesPerSource', bytes: size });
    expect(r.totalBytes()).toBe(0);
    const total = reader({ maxTotalBytes: size - 1 });
    expect(total.reader.read('unsized/README.md').record).toMatchObject({ outcome: 'over-limit', detail: 'maxTotalBytes' });
  });

  it('registry-bound limits are the default', () => {
    const { reader: r } = reader();
    expect(r.limits).toEqual(PWB_RESOURCE_LIMITS);
  });
});

describe('phase B population read never shrinks', () => {
  const source = (path: string, anchor: ManifestSource['anchor']): ManifestSource => ({
    path,
    rule: 'pillar-named-file',
    pillar: 'heart-and-soul',
    extractionClasses: ['principle'],
    anchor,
  });
  const SOURCES: readonly ManifestSource[] = [
    source('about/heart-and-soul/vision.md', { kind: 'blob', mode: '100644', objectId: oidOf('about/heart-and-soul/vision.md') }),
    source('about/heart-and-soul/missing.md', { kind: 'missing-at-revision' }),
    source('about/link.md', { kind: 'blob', mode: '120000', objectId: SYMLINK_OID }),
    source('about/tree-entry', { kind: 'not-a-blob', mode: '040000', type: 'tree' }),
    source('vendor/sub', { kind: 'not-a-blob', mode: '160000', type: 'commit' }),
    source('notes/script.md', { kind: 'blob', mode: '100644', objectId: oidOf('notes/script.md') }),
    source('certs/server.pem', { kind: 'blob', mode: '100644', objectId: oidOf('certs/server.pem') }),
    source('binary/nul.md', { kind: 'blob', mode: '100644', objectId: NUL_OID }),
    source('about/README.md', { kind: 'blob', mode: '100644', objectId: 'e'.repeat(40) }),
  ];

  it('one result per source, in order, bodies only via consume, every rejected source visible', () => {
    const { reader: r, calls } = reader();
    const consumed: string[] = [];
    const results = readManifestSources({ sources: SOURCES }, r, (s, text) => {
      consumed.push(s.path);
      return text.length;
    });
    expect(results.map((x) => x.source.path)).toEqual(SOURCES.map((s) => s.path));
    expect(results.map((x) => [x.record.outcome, x.record.detail])).toEqual([
      ['read', undefined],
      ['refused', 'missing-at-revision'],
      ['refused', 'not-a-regular-blob'],
      ['refused', 'not-a-regular-blob'],
      ['refused', 'not-a-regular-blob'],
      ['active-content', undefined],
      ['refused', 'denied-suffix'],
      ['contains-nul', undefined],
      ['refused', 'object-id-differs-from-tree'],
    ]);
    expect(consumed).toEqual(['about/heart-and-soul/vision.md']);
    expect(results[0]?.value).toBe(TEXTS['about/heart-and-soul/vision.md']?.length);
    expect(calls).toEqual([
      ['cat-file', 'blob', oidOf('about/heart-and-soul/vision.md')],
      ['cat-file', 'blob', oidOf('notes/script.md')],
      ['cat-file', 'blob', NUL_OID],
    ]);
    assertNoSentinel(results);
    assertNoSentinel(r.records);
    assertNoSentinel(r.breaches);
    expect(results.filter((x) => x.record.outcome !== 'read')).toHaveLength(8);
  });
});

describe('policy-bound constants are byte-equal to the act-bound artifacts', () => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const root = join(here, '..', '..', '..');
  const policy = JSON.parse(
    readFileSync(join(root, '.syzygy', 'governance', 'policies', 'POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'),
  ) as {
    policyId: string;
    policyVersion: string;
    sourceAdmission: { gitObjectsOnly: boolean; allowedTextEncodings: string[]; deniedPathBasenames: string[]; deniedPathPrefixes: string[]; deniedPathSuffixes: string[]; pathRuleScope: string };
    accessBoundary: Record<string, boolean>;
  };

  it('denied path rules, identity and admission posture', () => {
    expect(PWB_POLICY_IDENTITY).toEqual({ policyId: policy.policyId, policyVersion: policy.policyVersion });
    expect([...PWB_DENIED_PATH_RULES.basenames]).toEqual(policy.sourceAdmission.deniedPathBasenames);
    expect([...PWB_DENIED_PATH_RULES.prefixes]).toEqual(policy.sourceAdmission.deniedPathPrefixes);
    expect([...PWB_DENIED_PATH_RULES.suffixes]).toEqual(policy.sourceAdmission.deniedPathSuffixes);
    expect(policy.sourceAdmission.gitObjectsOnly).toBe(true);
    expect(policy.sourceAdmission.allowedTextEncodings).toEqual(['utf-8']);
    expect(policy.sourceAdmission.pathRuleScope).toContain('final segment');
    expect(policy.accessBoundary.workingTree).toBe(false);
    expect(policy.accessBoundary.observedCodeExecution).toBe(false);
  });

  it('module surface: outcome vocabulary is closed and records never carry a text field', () => {
    const record: ObjectReadRecord = { path: 'x', outcome: 'read', bytes: 0 };
    expect(Object.keys(record)).toEqual(['path', 'outcome', 'bytes']);
  });
});

// ---------------------------------------------------------------------
// One evaluation-wide envelope (registry amendment 2026-09-05:
// `resourceLimitSemantics.maxTotalBytes` / `maxParsePassesPerSource`;
// PWB-REQ-006 as amended). The reader charges the shared ledger.

describe('the reader charges one shared resource ledger', () => {
  const PATH = 'about/heart-and-soul/README.md';
  const size = (BYTES[PATH] as Uint8Array).byteLength;

  it('a fresh read charges exactly four registry passes on its path and counts its body once', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    const spy = gitSpy();
    const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
    expect(r.ledger).toBe(ledger);
    expect(r.read(PATH).kind).toBe('text');
    expect(ledger.passesFor(PATH)).toBe(4);
    const summary = ledger.summary();
    expect(summary.passesByIdentity).toMatchObject({
      'utf8-and-nul-validation': 1,
      'markdown-code-context-mask': 1,
      'active-html-svg-script-handler': 1,
      'unsafe-url-positions': 1,
      'phase-a-link-discovery': 0,
      'secret-known-token-formats': 0,
    });
    expect(summary.parsePasses).toBe(4);
    expect(ledger.totalBytes()).toBe(size);
    expect(ledger.counted(PATH, oidOf(PATH))).toBe(true);
    expect(r.totalBytes()).toBe(size);
    expect(r.breaches).toBe(ledger.breaches);
  });

  it('a phase-A body held in the ledger is reused: no cat-file, no repeated passes, bytes counted once', () => {
    const ledger = createResourceLedger(PWB_RESOURCE_LIMITS);
    // Phase A took the body, counted it and validated it (nine passes).
    expect(ledger.chargeBody(PATH, oidOf(PATH), size)).toBeUndefined();
    for (let i = 0; i < 9; i += 1) ledger.chargePass(PATH, 'utf8-and-nul-validation');
    ledger.remember(PATH, oidOf(PATH), { bytes: BYTES[PATH] as Uint8Array, text: TEXTS[PATH] as string });
    const spy = gitSpy();
    const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
    const result = r.read(PATH);
    expect(result.kind).toBe('text');
    if (result.kind !== 'text') throw new Error('unreachable');
    expect(result.text).toBe(TEXTS[PATH]);
    expect(spy.calls).toEqual([]);
    expect(ledger.passesFor(PATH)).toBe(9);
    expect(ledger.totalBytes()).toBe(size);
    expect(result.record).toEqual({ path: PATH, objectId: oidOf(PATH), outcome: 'read', bytes: size, contentDigest: contentDigestOf(BYTES[PATH] as Uint8Array) });
    expect(r.records).toEqual([result.record]);
    // A body held under another object id is not this source's body.
    const other = r.read('about/README.md');
    expect(other.kind).toBe('text');
    expect(spy.calls).toEqual([['cat-file', 'blob', oidOf('about/README.md')]]);
  });

  it('a body already counted by phase A does not count again toward maxTotalBytes', () => {
    const ledger = createResourceLedger({ ...PWB_RESOURCE_LIMITS, maxTotalBytes: size });
    expect(ledger.chargeBody(PATH, oidOf(PATH), size)).toBeUndefined();
    const spy = gitSpy();
    const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
    expect(r.read(PATH).kind).toBe('text');
    expect(ledger.totalBytes()).toBe(size);
    expect(ledger.breaches).toEqual([]);
    expect(r.read('about/README.md').record).toMatchObject({ outcome: 'over-limit', detail: 'maxTotalBytes' });
  });

  it('maxParsePassesPerSource: limit − 1 and limit stop the read closed at the pass that never ran; limit + 1 reads', () => {
    // A fresh read needs four passes; the fourth is unsafe-url-positions.
    for (const [declared, expected] of [
      [3, 'over-limit'],
      [4, 'read'],
      [5, 'read'],
    ] as const) {
      const ledger = createResourceLedger({ ...PWB_RESOURCE_LIMITS, maxParsePassesPerSource: declared });
      const spy = gitSpy();
      const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
      const result = r.read(PATH);
      expect(result.record.outcome, String(declared)).toBe(expected);
      if (expected === 'over-limit') {
        expect(result.kind).toBe('unavailable');
        expect(result.record).toEqual({ path: PATH, objectId: oidOf(PATH), outcome: 'over-limit', bytes: size, detail: 'maxParsePassesPerSource', contentDigest: contentDigestOf(BYTES[PATH] as Uint8Array) });
        expect(ledger.breaches).toEqual([{ limit: 'maxParsePassesPerSource', declared, observed: declared + 1, path: PATH }]);
        expect(ledger.summary().passesByIdentity['unsafe-url-positions']).toBe(0);
      } else {
        expect(ledger.breaches).toEqual([]);
      }
    }
  });

  it('the pass budget is per source: a second source starts fresh', () => {
    const ledger = createResourceLedger({ ...PWB_RESOURCE_LIMITS, maxParsePassesPerSource: 4 });
    const spy = gitSpy();
    const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
    expect(r.read(PATH).kind).toBe('text');
    expect(r.read('about/README.md').kind).toBe('text');
    expect(r.read('roster/alpha/butler.toml').kind).toBe('text');
    expect(ledger.summary().maxPassesOnOneSource).toBe(4);
    expect(ledger.summary().sourcesTraversed).toBe(3);
  });
});
