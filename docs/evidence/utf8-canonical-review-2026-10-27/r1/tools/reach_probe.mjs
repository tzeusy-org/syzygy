// Reachability of the decode at each PR 534 site, for the input classes the brief names.
// Usage: node reach_probe.mjs <built clone whose packages/support/dist/decode-utf8.js records calls> <out.json>
// The recording build is made by instrument_decode.py: every decodeUtf8 call pushes { bytes, result } onto
// globalThis.__du8. A site reaches the decode for an input when some call during that driver run received exactly the
// input's bytes; the result says whether the decoder refused it. Drivers are those of utf8-probe.mjs (same entry points).
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [clone, out] = process.argv.slice(2);
globalThis.__du8 = [];
const core = await import(pathToFileURL(join(clone, 'packages/three-surface-poc-core/dist/index.js')).href);
const enc = new TextEncoder();
const B = (...v) => Uint8Array.from(v);
const cat = (...p) => Uint8Array.from(p.flatMap((x) => [...x]));
const BOM = B(0xef, 0xbb, 0xbf);
const sha1Blob = (bytes) => createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
const consent = enc.encode('Subject: `(project:syzygy, repository:butlers)`\nObservation content class: `declared-project-shape-text`\n');
const inputs = [
  ['empty', B()], ['bom-only', BOM], ['bom-led-text', cat(BOM, enc.encode('a\n'))], ['bom-led-consent', cat(BOM, consent)],
  ['truncated-3-at-end', cat(enc.encode('ab'), B(0xe2, 0x82))], ['truncated-4-at-end', cat(enc.encode('ab'), B(0xf0, 0x9f, 0x98))],
  ['surrogate-ed-a0-80', cat(enc.encode('ab'), B(0xed, 0xa0, 0x80))], ['overlong-c0-80', cat(enc.encode('ab'), B(0xc0, 0x80))],
  ['overlong-e0-80-af', cat(enc.encode('ab'), B(0xe0, 0x80, 0xaf))], ['overlong-f0-80-80-af', cat(enc.encode('ab'), B(0xf0, 0x80, 0x80, 0xaf))],
  ['bom-then-bad', cat(BOM, enc.encode('a'), B(0xff))],
];
const detectors = core.compileDetectors(core.PWB_SECRET_POLICY);
const classifyPhaseA = (text) => core.classifyPhaseASeed(detectors, text);
const limits = core.PWB_RESOURCE_LIMITS;
const entry = (path, bytes) => ({ mode: '100644', type: 'blob', objectId: sha1Blob(bytes), sizeBytes: bytes.byteLength, path });
const drivers = {
  'authority-consent': (b) => core.parseConsentArtifact(b),
  'authority-policy': (b) => core.parsePolicyArtifact(b),
  'authority-registry': (b) => core.parseRegistryArtifact(b),
  'object-reader': (b) => { const p = 'about/heart-and-soul/vision.md'; const e = entry(p, b); const r = core.createExactObjectReader({ runGit: () => b, tree: core.indexGitTree([e]) }); return r.read(p, e.objectId); },
  'seed-reader': (b) => { const p = 'about/README.md'; const e = entry(p, b); const reads = []; const read = core.createPhaseASeedReader({ tree: core.indexGitTree([e]), limits, ledger: core.createResourceLedger(limits), reads, runGit: () => b, objectFormat: 'sha1', classifyPhaseA }); return { result: read({ path: p, objectId: e.objectId }), reads }; },
};
for (const stage of ['rev-parse', 'show', 'ls-tree']) {
  drivers[`observe-${stage}`] = (b) => {
    const order = ['rev-parse', 'show', 'ls-tree'];
    const good = { 'rev-parse': enc.encode(`${'3'.repeat(40)}\n`), show: enc.encode('2026-08-15T10:00:00+00:00\n') };
    const runGit = (a) => { const c = a[0]; if (c === stage) return b; if (order.indexOf(c) >= 0 && order.indexOf(c) < order.indexOf(stage)) return good[c]; throw new Error(`stop at ${c}`); };
    const r = core.observeProjectShapeSources({ repositoryId: 'repository:probe', revision: 'main', capturedAt: '2026-10-25T00:00:00.000Z', runGit, classifyPhaseA });
    return { kind: r.kind, failureState: r.failureState, detail: r.detail };
  };
}
const eq = (a, b) => a.byteLength === b.byteLength && a.every((x, i) => x === b[i]);
const rows = [];
for (const [driver, run] of Object.entries(drivers)) {
  for (const [id, bytes] of inputs) {
    globalThis.__du8 = [];
    let outcome;
    try { outcome = run(bytes); } catch (e) { outcome = { threw: String(e) }; }
    const hit = globalThis.__du8.find((c) => eq(c.bytes, bytes));
    rows.push({ driver, input: id, reachedDecode: hit !== undefined, decoderRefused: hit ? hit.result === undefined : null, calls: globalThis.__du8.length, outcome: JSON.stringify(outcome).slice(0, 160) });
  }
}
writeFileSync(out, JSON.stringify({ rows }, null, 1) + '\n');
for (const r of rows) console.log(r.driver.padEnd(19), r.input.padEnd(22), r.reachedDecode ? 'REACHED' : 'not-reached', r.decoderRefused === null ? '' : r.decoderRefused ? 'refused' : 'decoded', r.outcome.slice(0, 110));
