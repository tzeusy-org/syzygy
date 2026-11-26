// Before/after for syzygy-5dhm.45: what the test-name recognizers read from Syzygy's own tree at a pinned commit, under the committed
// declared-source policy 2.0.0. Before this change no derivation read a test name and no page listed one; after it, the member below is
// what `syzygy dossier render` would derive for a dossier of this tree. Reads blobs through the pinned object reader only; runs nothing.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-45/test_names_before_after.mts <git-dir> <commit>
import { readFileSync } from 'node:fs';
import { openPinnedObjectReader } from '../../../packages/polaris-dossier/src/git-object-reader.ts';
import { MANIFEST_BLOB_LIMIT } from '../../../packages/polaris-dossier/src/manifest-facts.ts';
import { buildDossierScreen } from '../../../packages/polaris-dossier/src/screen.ts';
import { deriveTestNames } from '../../../packages/polaris-dossier/src/test-names.ts';

const [gitDir, commit] = process.argv.slice(2);
if (gitDir === undefined || commit === undefined) throw new Error('usage: test_names_before_after.mts <git-dir> <commit>');
const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const load = buildDossierScreen(new Uint8Array(readFileSync(policyPath)), true, { repository: 'repository:syzygy-self', commit }, 'public');
if (!load.ok) throw new Error(load.why);
const lister = openPinnedObjectReader({ gitDir, revision: commit });
const reader = openPinnedObjectReader({ gitDir, revision: commit, maxObjectBytes: MANIFEST_BLOB_LIMIT });
const entries = await lister.listTree();
const member = await deriveTestNames({ entries, screen: load.screen, consented: null, read: async (p) => (await reader.readBlobs([p]))[0]! });
if (member.state !== 'derived') throw new Error(member.why);
console.log(JSON.stringify({
  subject: { tree: 'syzygy (this repository)', commit, policy: `${load.screen.policyId} ${load.screen.policyVersion}`, policySha256: load.screen.policySha256 },
  before: { testNamesRead: 0, pagesListingTestNames: 0, basis: 'no rule before REQ-polaris-generation-034 version 2.34 read a test name' },
  after: {
    format: member.format,
    recognizers: member.recognizers.map(({ files: _files, ...rest }) => rest),
    unknownFiles: member.recognizers.flatMap((r) => r.files.filter((f) => f.epistemic === 'unknown').map((f) => ({ rule: r.rule, path: f.path, reason: f.unknownReason, parseFault: f.parseFault }))),
    units: member.units,
    unitsNotListed: member.unitsNotListed,
    namesListed: member.names.length,
    namesNotListed: member.namesNotListed,
    firstNames: member.names.slice(0, 12).map((n) => ({ name: n.name, kind: n.kind, path: n.path, line: n.line, rule: n.rule })),
  },
}, null, 2));
