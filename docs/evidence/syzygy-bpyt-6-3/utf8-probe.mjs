// Old-versus-new differential for the strict UTF-8 decoder (syzygy-bpyt.6.3 stack 2).
// Usage: node utf8-probe.mjs <built clone> <out.json> [--tmp <dir>]
// Drives the four call sites that used a local strict decoder through their public entry points, on one byte corpus:
//   authority-artifact-fields   parseConsentArtifact, parsePolicyArtifact, parseRegistryArtifact (pure bytes in, fields out)
//   git-object-reader           createExactObjectReader(...).read on a blob whose bytes are the corpus item
//   project-shape-observation   createPhaseASeedReader(...) on a root-index blob, and observeProjectShapeSources with the
//                               corpus item as the answer to each of the three git commands that are decoded as text
//   code-structure              observeCodeStructure through its default runner, on real repositories built with fixed dates
// Each row stores the sha256 of the JSON result; the run is deterministic, so two runs on one tree give equal files.
// The corpus: named byte arrays (every malformed class, the BOM cases, lengths 0 to 300 KB), seven protocol texts each
// with eight byte-level mutations, and 1,500 arrays from a fixed linear-congruential generator; the record counts them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const [clone, out] = args;
if (clone === undefined || out === undefined) throw new Error('usage: utf8-probe.mjs <built clone> <out.json> [--tmp dir]');
const tmpBase = args.includes('--tmp') ? args[args.indexOf('--tmp') + 1] : tmpdir();
const sha = (v) => createHash('sha256').update(v).digest('hex');
const sha1Blob = (bytes) => createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
const core = await import(pathToFileURL(join(clone, 'packages/three-surface-poc-core/dist/index.js')).href);
const enc = new TextEncoder();
const B = (...v) => Uint8Array.from(v);
const cat = (...parts) => { const o = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { o.set(p, at); at += p.length; } return o; };
const BOM = B(0xef, 0xbb, 0xbf);

// ---- the corpus -------------------------------------------------------------
const named = [
  ['empty', B()], ['ascii', enc.encode('abc\n')], ['two-byte', B(0xc3, 0xa9)], ['three-byte', B(0xe2, 0x82, 0xac)], ['four-byte', enc.encode('\u{1F600}')],
  ['noncharacter-fffe', B(0xef, 0xbf, 0xbe)], ['replacement-char', B(0xef, 0xbf, 0xbd)], ['nul', B(0x00)], ['nul-inside', B(0x61, 0x00, 0x62)],
  ['bom-only', BOM], ['bom-text', cat(BOM, enc.encode('a'))], ['bom-bom-text', cat(BOM, BOM, enc.encode('a'))], ['text-bom', cat(enc.encode('a'), BOM)],
  ['lone-continuation', B(0x80)], ['lead-no-continuation', B(0xc3)], ['truncated-3', B(0xe2, 0x82)], ['truncated-4', B(0xf0, 0x9f, 0x98)],
  ['overlong-nul', B(0xc0, 0x80)], ['overlong-c1', B(0xc1, 0xbf)], ['overlong-slash-3', B(0xe0, 0x80, 0xaf)], ['overlong-4', B(0xf0, 0x80, 0x80, 0xaf)],
  ['surrogate-high', B(0xed, 0xa0, 0x80)], ['surrogate-low', B(0xed, 0xbf, 0xbf)], ['past-10ffff', B(0xf4, 0x90, 0x80, 0x80)], ['f5', B(0xf5, 0x80, 0x80, 0x80)],
  ['ff', B(0xff)], ['fe', B(0xfe)], ['ff-fe', B(0xff, 0xfe)], ['good-then-bad', B(0x61, 0x62, 0xc3, 0x28)], ['bad-then-good', B(0xc3, 0x28, 0x61)],
  ['latin1-e-acute', B(0x63, 0x61, 0x66, 0xe9)], ['latin1-pair', B(0xf1, 0xf2)], ['utf16le-bom', B(0xff, 0xfe, 0x61, 0x00)], ['utf16be-bom', B(0xfe, 0xff, 0x00, 0x61)],
  ['crlf-text', enc.encode('a\r\nb\r\n')], ['all-ascii-printable', enc.encode(Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(''))],
  ['long-valid-300k', enc.encode('x'.repeat(300_000))], ['long-valid-multibyte-300k', enc.encode('é'.repeat(150_000))],
  ['long-bad-tail-300k', cat(enc.encode('x'.repeat(299_999)), B(0xff))], ['long-split-sequence', cat(enc.encode('x'.repeat(65_535)), B(0xe2, 0x82, 0xac))],
  ['stream-boundary-split', cat(enc.encode('x'.repeat(8_191)), B(0xf0, 0x9f, 0x98, 0x80))],
];
const protocol = [
  ['revision', enc.encode(`${'3'.repeat(40)}\n`)],
  ['instant', enc.encode('2026-08-15T10:00:00+00:00\n')],
  ['ls-tree', enc.encode(`100644 blob ${'1'.repeat(40)}      12\tREADME.md\0`)],
  ['consent', enc.encode('# Consent\n\nSubject: `(project:syzygy, repository:butlers)`\nObservation content class: `declared-project-shape-text`\n')],
  ['policy', enc.encode('{"policyId":"p","policyVersion":"1","owningProject":"project:syzygy"}\n')],
  ['registry', enc.encode('{"governanceHome":"h","project":"project:syzygy","repository":"repository:butlers","authority":"read-only","writeSurface":[]}\n')],
  ['markdown', enc.encode('# Index\n\n- [Heart](heart-and-soul/README.md)\n')],
];
const mutate = (name, base) => [
  [`${name}+bom`, cat(BOM, base)], [`${name}+bom-bom`, cat(BOM, BOM, base)], [`${name}+bad-tail`, cat(base, B(0xff))], [`${name}+truncated-tail`, cat(base, B(0xe2, 0x82))],
  [`${name}+bad-head`, cat(B(0x80), base)], [`${name}+overlong-tail`, cat(base, B(0xc0, 0x80))], [`${name}+e-acute-tail`, cat(base, B(0xc3, 0xa9))], [`${name}+nul-tail`, cat(base, B(0x00))],
];
let seed = 20261025;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const alphabet = [0x61, 0x7a, 0x0a, 0x00, 0x7f, 0x80, 0xbf, 0xc0, 0xc2, 0xdf, 0xe0, 0xed, 0xef, 0xbb, 0xf0, 0xf4, 0xf5, 0xff];
const codePoint = () => {
  const range = next() % 5;
  if (range === 0) return 0x20 + (next() % 0x5f);
  if (range === 1) return 0xa0 + (next() % 0x560);
  if (range === 2) { const c = 0x800 + (next() % 0xf800); return c >= 0xd800 && c <= 0xdfff ? 0x2603 : c; }
  if (range === 3) return 0x10000 + (next() % 0x100000);
  return 0x0a;
};
const validText = () => enc.encode(String.fromCodePoint(...Array.from({ length: next() % 21 }, codePoint)));
const mutateOne = (bytes) => {
  const out = Array.from(bytes);
  const at = out.length === 0 ? 0 : next() % out.length;
  const kind = next() % 4;
  if (kind === 0 && out.length > 0) out[at] = next() & 0xff;
  else if (kind === 1 && out.length > 0) out.splice(at, 1);
  else if (kind === 2) out.splice(at, 0, alphabet[next() % alphabet.length]);
  else if (out.length > 0) out.length = at;
  return Uint8Array.from(out);
};
const random = Array.from({ length: 1500 }, (_, i) => {
  const mode = next() % 3;
  const base = mode === 2 ? Uint8Array.from({ length: next() % 41 }, () => (next() % 4 === 0 ? next() & 0xff : alphabet[next() % alphabet.length])) : validText();
  const body = mode === 1 ? mutateOne(base) : base;
  return [`random-${i}`, next() % 4 === 0 ? cat(BOM, body) : body];
});
const corpus = [...named, ...protocol, ...protocol.flatMap(([n, b]) => mutate(n, b)), ...random];

const reference = (bytes) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return undefined; } };
const jsonOf = (v) => JSON.stringify(v, (_, x) => (x instanceof Map ? { map: [...x.entries()] } : x === undefined ? { undefined: true } : x));

// ---- drivers ----------------------------------------------------------------
const limits = core.PWB_RESOURCE_LIMITS;
const detectors = core.compileDetectors(core.PWB_SECRET_POLICY);
const classifyPhaseA = (text) => core.classifyPhaseASeed(detectors, text);
const entry = (path, bytes) => ({ mode: '100644', type: 'blob', objectId: sha1Blob(bytes), sizeBytes: bytes.byteLength, path });
const bounded = (fn) => { try { return fn(); } catch (error) { return { threw: error instanceof Error ? `${error.name}: ${error.message}` : String(error) }; } };

const drivers = {
  'authority-consent': (bytes) => core.parseConsentArtifact(bytes),
  'authority-policy': (bytes) => core.parsePolicyArtifact(bytes),
  'authority-registry': (bytes) => core.parseRegistryArtifact(bytes),
  'object-reader': (bytes) => {
    const path = 'about/heart-and-soul/vision.md';
    const e = entry(path, bytes);
    const reader = core.createExactObjectReader({ runGit: () => bytes, tree: core.indexGitTree([e]) });
    const read = reader.read(path, e.objectId);
    return { read, records: reader.records };
  },
  'seed-reader': (bytes) => {
    const path = 'about/README.md';
    const e = entry(path, bytes);
    const reads = [];
    const read = core.createPhaseASeedReader({ tree: core.indexGitTree([e]), limits, ledger: core.createResourceLedger(limits), reads, runGit: () => bytes, objectFormat: 'sha1', classifyPhaseA });
    const result = read({ path, objectId: e.objectId });
    return { result, reads };
  },
};
for (const stage of ['rev-parse', 'show', 'ls-tree']) {
  drivers[`observe-${stage}`] = (bytes) => {
    const order = ['rev-parse', 'show', 'ls-tree'];
    const good = { 'rev-parse': enc.encode(`${'3'.repeat(40)}\n`), show: enc.encode('2026-08-15T10:00:00+00:00\n') };
    const runGit = (a) => {
      const command = a[0];
      if (command === stage) return bytes;
      if (order.indexOf(command) >= 0 && order.indexOf(command) < order.indexOf(stage)) return good[command];
      throw new Error(`stop at ${command}`);
    };
    const result = core.observeProjectShapeSources({ repositoryId: 'repository:probe', revision: 'main', capturedAt: '2026-10-25T00:00:00.000Z', runGit, classifyPhaseA });
    return { kind: result.kind, failureState: result.failureState, detail: result.detail, reason: result.reason, sources: result.sources?.length, reads: result.reads?.map((r) => [r.path, r.outcome]) };
  };
}

const rows = [];
for (const [driver, run] of Object.entries(drivers)) {
  for (const [id, bytes] of corpus) rows.push({ driver, input: id, sha256: sha(jsonOf(bounded(() => run(bytes)))) });
}

// ---- code-structure through its default runner (real repositories, fixed identity and dates) ----
const env = { ...process.env, GIT_AUTHOR_NAME: 'p', GIT_AUTHOR_EMAIL: 'p@example.invalid', GIT_COMMITTER_NAME: 'p', GIT_COMMITTER_EMAIL: 'p@example.invalid', GIT_AUTHOR_DATE: '2026-10-25T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-25T00:00:00Z', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
const git = (root, a, input) => execFileSync('git', ['-C', root, ...a], { env, input, stdio: ['pipe', 'pipe', 'ignore'] }).toString('utf8').trim();
const names = (list) => Buffer.concat(list.map(([mode, type, id, name]) => Buffer.concat([Buffer.from(`${mode} ${type} ${id}\t`), Buffer.isBuffer(name) ? name : Buffer.from(name), Buffer.from('\0')])));
const structureCases = [];
const work = mkdtempSync(join(tmpBase, 'utf8-probe-'));
try {
  const make = (label, build) => {
    const root = join(work, label);
    mkdirSync(root, { recursive: true });
    git(root, ['init', '-q']);
    writeFileSync(join(root, 'blob.txt'), 'x\n', 'utf8');
    const blob = git(root, ['hash-object', '-w', 'blob.txt']);
    const tree = git(root, ['mktree', '-z', '--missing'], build(blob));
    const revision = git(root, ['commit-tree', tree, '-m', label]);
    return { root, revision };
  };
  const gitlink = '1'.repeat(40);
  const cases = {
    'valid-names': (b) => names([['100644', 'blob', b, 'a.ts'], ['100644', 'blob', b, 'b.md'], ['100644', 'blob', b, 'é.py']]),
    'latin1-pair': (b) => names([['100644', 'blob', b, Buffer.from([0xf1, 0x2e, 0x6d, 0x64])], ['100644', 'blob', b, Buffer.from([0xf2, 0x2e, 0x6d, 0x64])]]),
    'one-bad-byte': (b) => names([['100644', 'blob', b, Buffer.from([0x61, 0xff, 0x2e, 0x74, 0x73])]]),
    'bad-name-valid-name': (b) => names([['100644', 'blob', b, 'ok.ts'], ['100644', 'blob', b, Buffer.from([0xc3, 0x28, 0x2e, 0x6d, 0x64])]]),
    'gitlink-bad-path': (b) => names([['100644', 'blob', b, 'ok.ts'], ['160000', 'commit', gitlink, Buffer.from([0xf1, 0xf2])]]),
    'gitlink-valid-path': (b) => names([['100644', 'blob', b, 'ok.ts'], ['160000', 'commit', gitlink, 'vendor']]),
    'overlong-name': (b) => names([['100644', 'blob', b, Buffer.from([0xc0, 0x80, 0x2e, 0x6d, 0x64])]]),
    'bom-like-name': (b) => names([['100644', 'blob', b, Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x2e, 0x6d, 0x64])]]),
    'empty-tree': () => Buffer.alloc(0),
  };
  for (const [label, build] of Object.entries(cases)) {
    const { root, revision } = make(label, build);
    structureCases.push({ driver: 'code-structure', input: label, sha256: sha(jsonOf(bounded(() => core.observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-10-25T00:00:00Z' })))) });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
rows.push(...structureCases);

const decodable = corpus.filter(([, b]) => reference(b) !== undefined).length;
const result = {
  corpus: {
    items: corpus.length, named: named.length, protocolTexts: protocol.length, protocolMutations: protocol.length * 8, random: random.length,
    decodableByTheReferenceDecoder: decodable, refusedByTheReferenceDecoder: corpus.length - decodable,
    referenceDecoder: "new TextDecoder('utf-8', { fatal: true }) in try/catch, the base definition, inside this probe",
  },
  drivers: Object.fromEntries(Object.keys(drivers).concat(['code-structure']).map((d) => [d, { rows: rows.filter((r) => r.driver === d).length, distinctResults: new Set(rows.filter((r) => r.driver === d).map((r) => r.sha256)).size }])),
  rows,
  rowsSha256: sha(JSON.stringify(rows)),
};
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`rows ${rows.length}; corpus ${corpus.length} (${decodable} decodable); rows digest ${result.rowsSha256}`);
