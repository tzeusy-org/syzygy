// Before/after for syzygy-5dhm.116: what recognizer limit-default v1 derives from Syzygy's own tree at a pinned commit, under the committed
// declared-source policy 2.0.0, twice: for a run relying on no per-project statement (the class gate withholds what no statement lists) and
// for a run whose statement lists code-content. Before this change no derivation read a limit constant or a configuration entry. Reads
// blobs through the pinned object reader only; runs nothing, fetches nothing. Quoted lines are not printed: only counts, kinds, types,
// reasons and a sample of names and values. The listed run is derived twice, 64 paths to a reader call (as the render reads) and one path
// to a call (as the sibling recognizers read), and the two members are compared, so the batching's cost and its sameness are measured.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-116/cliffs_before_after.mts <git-dir> <commit>
import { readFileSync } from 'node:fs';
import { openPinnedObjectReader } from '../../../packages/polaris-dossier/src/git-object-reader.ts';
import { deriveLimits } from '../../../packages/polaris-dossier/src/limits.ts';
import { MANIFEST_BLOB_LIMIT } from '../../../packages/polaris-dossier/src/manifest-facts.ts';
import { buildDossierScreen } from '../../../packages/polaris-dossier/src/screen.ts';

const [gitDir, commit] = process.argv.slice(2);
if (gitDir === undefined || commit === undefined) throw new Error('usage: cliffs_before_after.mts <git-dir> <commit>');
const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const load = buildDossierScreen(new Uint8Array(readFileSync(policyPath)), true, { repository: 'repository:syzygy-self', commit }, 'public');
if (!load.ok) throw new Error(load.why);
const screen = load.screen;
const lister = openPinnedObjectReader({ gitDir, revision: commit });
const reader = openPinnedObjectReader({ gitDir, revision: commit, maxObjectBytes: MANIFEST_BLOB_LIMIT });
const entries = await lister.listTree();

async function derive(consented: readonly string[] | null, batched: boolean) {
  let calls = 0;
  const started = performance.now();
  const readMany = batched
    ? (paths: readonly string[]) => { calls++; return reader.readBlobs(paths); }
    : async (paths: readonly string[]) => { const out = []; for (const p of paths) { calls++; out.push((await reader.readBlobs([p]))[0]!); } return out; };
  const m = await deriveLimits({ entries, screen, consented, readMany });
  return { m, elapsedMs: Math.round(performance.now() - started), calls };
}

function summary(m: Awaited<ReturnType<typeof derive>>['m']) {
  if (m.state !== 'derived') throw new Error(m.why);
  const tally = (keyOf: (r: (typeof m.rows)[number]) => string) => {
    const out: Record<string, number> = {};
    for (const r of m.rows) out[keyOf(r)] = (out[keyOf(r)] ?? 0) + 1;
    return out;
  };
  const reasons: Record<string, number> = {};
  for (const f of m.recognizer.files) if (f.epistemic === 'unknown') { const k = `${f.source}/${f.unknownReason}${f.parseFault === null ? '' : `/${f.parseFault}`}`; reasons[k] = (reasons[k] ?? 0) + 1; }
  const { files: _f, ...recognizer } = m.recognizer;
  return {
    recognizer, unknownListedByReason: reasons, unitsListed: m.units.length, rowsListed: m.rows.length, rowsNotListed: m.rowsNotListed,
    listedBySourceKindType: tally((r) => `${r.source}/${r.kind}/${r.valueType ?? `unknown:${r.unknownReason}`}`),
    firstListed: m.rows.slice(0, 15).map((r) => ({ path: r.path, line: r.line, name: r.name, value: r.value, valueType: r.valueType })),
  };
}

const none = await derive(null, true);
const batched = await derive(['code-content'], true);
const single = await derive(['code-content'], false);
console.log(JSON.stringify({
  subject: { tree: 'syzygy (this repository)', commit, policy: `${screen.policyId} ${screen.policyVersion}`, policySha256: screen.policySha256 },
  before: { rows: 0, pagesListingRows: 0, basis: 'no rule before REQ-polaris-generation-034 version 2.49 read a limit constant or a configuration entry' },
  afterNoStatement: { ...summary(none.m), deriveElapsedMs: none.elapsedMs, readerCalls: none.calls },
  afterCodeContentListed: { ...summary(batched.m), deriveElapsedMs: batched.elapsedMs, readerCalls: batched.calls },
  sameRunOnePathPerCall: { deriveElapsedMs: single.elapsedMs, readerCalls: single.calls, memberIdentical: JSON.stringify(single.m) === JSON.stringify(batched.m) },
}, null, 2));
