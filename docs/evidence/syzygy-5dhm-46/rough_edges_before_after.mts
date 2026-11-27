// Before/after for syzygy-5dhm.46: what recognizer rough-edge-marker v1 reads from Syzygy's own tree at a pinned commit, under the
// committed declared-source policy 2.0.0. Before this change no derivation read a marker and no page listed one; after it, the member below
// is what `syzygy dossier render` would derive for a dossier of this tree. Reads blobs through the pinned object reader only; runs nothing,
// fetches nothing. Marker lines are not printed: only counts, kinds and file dispositions.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-46/rough_edges_before_after.mts <git-dir> <commit>
import { readFileSync } from 'node:fs';
import { openPinnedObjectReader } from '../../../packages/polaris-dossier/src/git-object-reader.ts';
import { MANIFEST_BLOB_LIMIT } from '../../../packages/polaris-dossier/src/manifest-facts.ts';
import { deriveRoughEdges } from '../../../packages/polaris-dossier/src/rough-edges.ts';
import { buildDossierScreen } from '../../../packages/polaris-dossier/src/screen.ts';

const [gitDir, commit] = process.argv.slice(2);
if (gitDir === undefined || commit === undefined) throw new Error('usage: rough_edges_before_after.mts <git-dir> <commit>');
const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const policyBytes = new Uint8Array(readFileSync(policyPath));
const load = buildDossierScreen(policyBytes, true, { repository: 'repository:syzygy-self', commit }, 'public');
if (!load.ok) throw new Error(load.why);
const lister = openPinnedObjectReader({ gitDir, revision: commit });
const reader = openPinnedObjectReader({ gitDir, revision: commit, maxObjectBytes: MANIFEST_BLOB_LIMIT });
const entries = await lister.listTree();
const started = performance.now();
const member = await deriveRoughEdges({ entries, screen: load.screen, consented: null, read: async (p) => (await reader.readBlobs([p]))[0]! });
const elapsedMs = Math.round(performance.now() - started);
if (member.state !== 'derived') throw new Error(member.why);
const r = member.recognizer;
const byKind: Record<string, number> = {};
for (const u of member.units) for (const [k, n] of Object.entries(u.byKind)) byKind[k] = (byKind[k] ?? 0) + n;
const reasons: Record<string, number> = {};
for (const f of r.files) if (f.epistemic === 'unknown') reasons[`${f.unknownReason}${f.parseFault === null ? '' : `/${f.parseFault}`}`] = (reasons[`${f.unknownReason}${f.parseFault === null ? '' : `/${f.parseFault}`}`] ?? 0) + 1;
console.log(JSON.stringify({
  subject: { tree: 'syzygy (this repository)', commit, policy: `${load.screen.policyId} ${load.screen.policyVersion}`, policySha256: load.screen.policySha256 },
  before: { markersRead: 0, pagesListingMarkers: 0, basis: 'no rule before REQ-polaris-generation-034 version 2.44 read a rough-edge marker' },
  after: {
    format: member.format,
    recognizer: { rule: r.rule, ruleVersion: r.ruleVersion, label: r.label, candidates: r.candidates, secretPathsLeftOut: r.secretPathsLeftOut, setApart: r.setApart, observed: r.observed, unknown: r.unknown, valuesLeftOut: r.valuesLeftOut, markers: r.markers, filesNotListed: r.filesNotListed },
    markersByKind: byKind,
    unknownFilesListedByReason: reasons,
    uncounted: { basis: 'Unknown, never zero: no row of units counts a file not read for markers', unknownFiles: r.unknown },
    units: member.units,
    unitsNotListed: member.unitsNotListed,
    markersListed: member.markers.length,
    markersNotListed: member.markersNotListed,
    deriveElapsedMs: elapsedMs,
  },
}, null, 2));
