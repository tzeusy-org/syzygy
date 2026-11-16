// rev-530 probe: polaris-narrative.ts's removed post-order deepFreeze against @syzygy/support's, (1) as functions on the
// inputs where they differ, and (2) through NarrativeRegistry built at the base and at the head, fed frozen shells
// around unfrozen members, shared members, and a later mutation of every input.
// Usage: node narrative_freeze_probe.mjs <base clone, built> <head clone, built>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [baseRoot, headRoot] = process.argv.slice(2);
const load = (root, p) => import(pathToFileURL(join(root, p)).href);

// The base body of apps/three-surface-poc/src/polaris-narrative.ts (c104771f, lines 132-138), verbatim.
function oldNarrativeFreeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) oldNarrativeFreeze(inner);
    Object.freeze(value);
  }
  return value;
}
const { deepFreeze: supportFreeze } = await load(headRoot, 'packages/support/dist/index.js');

const census = (value) => {
  const seen = new Set(); let objects = 0, frozen = 0;
  const walk = (v) => { if (v === null || typeof v !== 'object' || seen.has(v)) return; seen.add(v); objects++; if (Object.isFrozen(v)) frozen++; for (const c of Object.values(v)) walk(c); };
  walk(value); return { objects, frozen };
};
const attempt = (fn, make) => { const v = make(); try { fn(v); return { ok: true, census: census(v) }; } catch (e) { return { ok: false, error: `${e.constructor.name}: ${e.message}`.slice(0, 80), census: census(v) }; } };

const shapes = {
  'frozen shell around unfrozen member': () => Object.freeze({ inner: { x: [1] } }),
  cycle: () => { const n = { list: [] }; n.list.push(n); return n; },
  'typed array member': () => ({ a: { b: 1 }, bytes: new Uint8Array([1, 2]) }),
  'shared member (DAG)': () => { const s = { x: [1] }; return { a: s, b: s }; },
  'plain tree': () => ({ a: { b: [{ c: 1 }, 'd'] } }),
};
const direct = Object.fromEntries(Object.entries(shapes).map(([k, make]) => [k, { old: attempt(oldNarrativeFreeze, make), support: attempt(supportFreeze, make) }]));

async function throughRegistry(root) {
  const { NarrativeRegistry } = await load(root, 'apps/three-surface-poc/dist/polaris-narrative.js');
  const registry = new NarrativeRegistry();
  const frozenSupports = Object.freeze(['claim:b']);
  const captured = Object.freeze({ label: 'Observed', tier: 'unstated', reason: 'none' });
  const claims = Object.freeze(['claim:a', 'claim:b']);
  const anchors = [{ targetClass: 'evidence', targetId: 'sha256:00', revision: 'r1', locator: 'a.md:1', supports: frozenSupports, captured },
    { targetClass: 'evidence', targetId: 'sha256:01', revision: 'r1', locator: 'b.md', supports: ['claim:a'], captured: { label: 'Unknown', tier: 't', reason: 'x' } }];
  const block = registry.registerAnchored('block:1', claims, anchors);
  const sharedBand = { band: 'argument', authorityClass: 'x', blockIds: ['block:1'] };
  const form = Object.freeze({ kind: 'capability-deep-dive', capabilityId: 'cap:1', readingMode: 'm', adoption: 'adopted', bands: [sharedBand, sharedBand],
    intent: Object.freeze({ verbatim: 'rendered', requirements: ['R1'] }), proposals: [{ changeId: 'c', exclusiveWith: ['d'], anchorable: false, statusBearing: false }], exclusivityBasis: { kind: 'k', ids: ['e'] } });
  registry.registerDeepDive(form);
  // mutate every unfrozen input after registration: a captured state must not change
  anchors[1].supports.push('claim:z'); anchors[1].captured.reason = 'mutated'; sharedBand.blockIds.push('block:z'); form.proposals[0].exclusiveWith.push('z');
  const narrative = registry.narrative();
  let cycleOutcome;
  try { const cyc = { kind: 'capability-deep-dive', capabilityId: 'cap:cycle', bands: [] }; cyc.bands.push(cyc); new NarrativeRegistry().registerDeepDive(cyc); cycleOutcome = 'terminated'; }
  catch (e) { cycleOutcome = `${e.constructor.name}`; }
  return { json: JSON.stringify(narrative), census: census(narrative), blockFrozen: census(block), inputsStillUnfrozen: !Object.isFrozen(anchors[1].supports), cycleOutcome };
}
const base = await throughRegistry(baseRoot);
const head = await throughRegistry(headRoot);
console.log(JSON.stringify({ direct, registry: { base, head, jsonEqual: base.json === head.json, censusEqual: JSON.stringify(base.census) === JSON.stringify(head.census) } }, null, 1));
