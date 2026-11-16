// Every isRecord call site at the head of the four class-1 / class-4 importers, run through the BUILT modules of the base and of the head
// (R-GP-IMPL-OBJECT-ISO-HELPERS-1). For each site the position the predicate tests is filled with each probe value, the module's own
// exported entry point is called, and the two outputs are compared as canonical text.
// Usage: node importer-probe.mjs <base checkout> <head checkout> <out.json>
// Both checkouts must have been built (npm ci; npm run typecheck). The live screening policy is read from the head checkout (Syzygy's own
// governed file, not an observed repository).
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [baseRoot, headRoot, out] = process.argv.slice(2);
const load = async (root) => ({
  aaf: await import(pathToFileURL(`${root}/packages/three-surface-poc-core/dist/authority-artifact-fields.js`).href),
  red: await import(pathToFileURL(`${root}/packages/polaris-generation-core/dist/secret-redaction.js`).href),
  psc: await import(pathToFileURL(`${root}/packages/polaris-generation-core/dist/public-source-classification.js`).href),
  scr: await import(pathToFileURL(`${root}/packages/polaris-dossier/dist/screen.js`).href),
});
const B = await load(baseRoot), H = await load(headRoot);

const LIVE = JSON.parse(readFileSync(`${headRoot}/.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`, 'utf8'));
const clone = (v) => structuredClone(v);
const SCOPE = () => clone(LIVE.publicSourceScope);
const RULES = () => SCOPE().contentClassification.rules;
const DOC_RULE = () => RULES().find((r) => r.class === 'project-documentation');
const CODE_EXT = () => RULES().find((r) => r.class === 'code-content').sourceExtensions;
const DETECTOR_IDS = LIVE.detectors.map((d) => d.id);
const enc = (v) => new TextEncoder().encode(JSON.stringify(v));
const fnWith = (fields) => Object.assign(function probe() { return 1; }, fields);

// Canonical text of any output: functions, regexps, Maps and Sets made visible, keys sorted.
const canon = (v) => JSON.stringify(v, function (k, x) {
  if (typeof x === 'function') return '[function]';
  if (x instanceof RegExp) return `[regexp ${x.source}/${x.flags}]`;
  if (x instanceof Map) return { '[map]': [...x.entries()] };
  if (x instanceof Set) return { '[set]': [...x] };
  if (x === undefined) return '[undefined]';
  if (x && typeof x === 'object' && !Array.isArray(x)) return Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]]));
  return x;
});
const run = (f) => { try { return canon(f()); } catch (e) { return `THROWS ${e?.constructor?.name}: ${e?.message}`; } };
const screenView = (load) => {
  if (!load.ok) return load;
  const s = load.screen;
  const paths = ['src/server.c', 'README.md', 'docs/notes.md', 'config/.env', 'LICENSE', 'src/a.txt', 'x.unknown'];
  return { policyId: s.policyId, policyVersion: s.policyVersion, projectDocumentation: s.projectDocumentation, codeContentExemption: s.codeContentExemption,
    secretRedaction: s.secretRedaction, screenPath: paths.map((p) => s.screenPath(p) ?? null), contentClass: paths.map((p) => s.contentClass(p) ?? null),
    screenBody: [s.screenBody('plain text', 'README.md') ?? null, s.screenBody('<script>x</script>', 'README.md') ?? null] };
};
const policyWith = (edit) => { const p = clone(LIVE); edit(p); return p; };

// JSON-reachable values (a byte-fed site can hold nothing else) and direct-call values (a site fed an unknown value can hold anything).
const JSON_VALUES = [['array', []], ['array of one object', [{}]], ['null', null], ['string', 'x'], ['number', 1], ['true', true], ['empty object', {}]];
const ANY_VALUES = (carry) => [...JSON_VALUES, ['undefined', undefined], ['function', () => 1], ['array carrying the fields', Object.assign([], carry)],
  ['function carrying the fields', fnWith(carry)], ['proxy of an array carrying the fields', new Proxy(Object.assign([], carry), {})],
  ['the valid object itself', carry]];

const sites = [];
const site = (id, file, line, values, call) => sites.push({ id, file, line, values, call });

// authority-artifact-fields.ts (bytes in: only JSON values can stand at any position)
const AAF = 'packages/three-surface-poc-core/src/authority-artifact-fields.ts';
site('A1', AAF, 102, JSON_VALUES, (m, v) => m.aaf.parsePolicyArtifact(enc(v)));
site('A2', AAF, 121, JSON_VALUES, (m, v) => m.aaf.parseRegistryArtifact(enc(v)));
site('A3', AAF, 132, JSON_VALUES, (m, v) => m.aaf.parseRegistryArtifact(enc({ governanceHome: 'g', project: 'p', entries: [v] })));
site('A4', AAF, 136, JSON_VALUES, (m, v) => m.aaf.parseRegistryArtifact(enc({ entries: [{ subject: v, typedAuthority: { writeSurface: [] } }] })));
site('A5', AAF, 141, JSON_VALUES, (m, v) => m.aaf.parseRegistryArtifact(enc({ entries: [{ subject: { observedRepository: 'r' }, typedAuthority: v }] })));

// secret-redaction.ts (called with an unknown scope)
const RED = 'packages/polaris-generation-core/src/secret-redaction.ts';
site('B1', RED, 71, ANY_VALUES({ secretRedaction: SCOPE().secretRedaction }), (m, v) => m.red.readSecretRedaction(v, DETECTOR_IDS));
site('B2', RED, 73, ANY_VALUES(SCOPE().secretRedaction), (m, v) => m.red.readSecretRedaction({ secretRedaction: v }, DETECTOR_IDS));

// public-source-classification.ts (called with unknown rules and scope)
const PSC = 'packages/polaris-generation-core/src/public-source-classification.ts';
site('C1', PSC, 68, ANY_VALUES(DOC_RULE()), (m, v) => m.psc.readProjectDocumentationRule([v, ...RULES().filter((r) => r.class !== 'project-documentation')], CODE_EXT()));
site('C1b', PSC, 68, ANY_VALUES(DOC_RULE()), (m, v) => m.psc.readProjectDocumentationRule([v, ...RULES()], CODE_EXT()));
site('C2', PSC, 78, ANY_VALUES(DOC_RULE().pathRules[0]), (m, v) => { const r = DOC_RULE(); r.pathRules[0] = v; return m.psc.readProjectDocumentationRule([r], CODE_EXT()); });
site('C3', PSC, 83, ANY_VALUES(DOC_RULE().rootStemNumericPrefix), (m, v) => { const r = DOC_RULE(); r.rootStemNumericPrefix = v; return m.psc.readProjectDocumentationRule([r], CODE_EXT()); });
site('C4', PSC, 204, ANY_VALUES({ activeContent: SCOPE().activeContent }), (m, v) => m.psc.readCodeContentExemption(v, CODE_EXT()));
site('C5', PSC, 205, ANY_VALUES(SCOPE().activeContent), (m, v) => m.psc.readCodeContentExemption({ activeContent: v }, CODE_EXT()));
site('C6', PSC, 207, ANY_VALUES(SCOPE().activeContent.codeContentExemption), (m, v) => m.psc.readCodeContentExemption({ activeContent: { codeContentExemption: v } }, CODE_EXT()));

// screen.ts (bytes in)
const SCR = 'packages/polaris-dossier/src/screen.ts';
const screenOf = (m, p) => screenView(m.scr.buildDossierScreen(enc(p), true));
site('D0', SCR, 0, [['the live policy unchanged', null]], (m) => screenOf(m, LIVE));
site('D1', SCR, 81, JSON_VALUES, (m, v) => screenOf(m, v));
site('D2', SCR, 83, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.publicSourceScope = v; })));
site('D3', SCR, 84, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.sourceAdmission = v; })));
site('D4', SCR, 88, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.publicSourceScope.contentClassification = v; })));
site('D5', SCR, 89, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.publicSourceScope.contentClassification.rules.unshift(v); })));
site('D5b', SCR, 89, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { const r = p.publicSourceScope.contentClassification.rules; const i = r.findIndex((x) => x.class === 'code-content'); r[i] = v; })));
site('D6', SCR, 90, [['(the position holds only a filtered record or undefined; see D5b)', null]], (m) => screenOf(m, LIVE));
site('D7', SCR, 100, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.detectors.unshift(v); })));
site('D7b', SCR, 100, JSON_VALUES, (m, v) => screenOf(m, policyWith((p) => { p.detectors = [...p.detectors.map((d, i) => (i === 0 ? v : d))]; })));

const rows = [];
let differ = 0, cells = 0;
for (const s of sites) {
  for (const [label, value] of s.values) {
    const base = run(() => s.call(B, value)), head = run(() => s.call(H, value));
    cells++;
    if (base !== head) differ++;
    rows.push({ site: s.id, file: s.file, line: s.line, value: label, same: base === head, base, head: base === head ? '(same)' : head });
  }
}
const result = { sites: sites.length, cells, differ, rows };
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`sites ${sites.length}, cells ${cells}, base and head differ on ${differ}`);
for (const r of rows) console.log(`${r.site} ${r.file.split('/').pop()}:${r.line} [${r.value}] ${r.same ? 'same' : 'DIFFERS'}: ${r.base.slice(0, 150)}`);
