// Before/after for syzygy-5dhm.119: what recognizer doc-reference v1 derives from Syzygy's own tree at a pinned commit, under the committed
// declared-source policy 2.0.0, twice: for a run relying on no per-project statement (the class gate withholds every document) and for a
// run whose statement lists project-documentation and code-content. Before this change no derivation resolved a document's path or
// identifier against the tree. Reads blobs through the pinned object reader only; runs nothing, fetches nothing. Quoted lines are not
// printed: only counts, outcomes, reasons and a sample of document-only values.
// Usage: npx tsx --conditions=source docs/evidence/syzygy-5dhm-119/docs_and_code_before_after.mts <git-dir> <commit>
import { readFileSync } from 'node:fs';
import { deriveDocsAndCode } from '../../../packages/polaris-dossier/src/doc-references.ts';
import { openPinnedObjectReader } from '../../../packages/polaris-dossier/src/git-object-reader.ts';
import { MANIFEST_BLOB_LIMIT } from '../../../packages/polaris-dossier/src/manifest-facts.ts';
import { buildDossierScreen } from '../../../packages/polaris-dossier/src/screen.ts';

const [gitDir, commit] = process.argv.slice(2);
if (gitDir === undefined || commit === undefined) throw new Error('usage: docs_and_code_before_after.mts <git-dir> <commit>');
const policyPath = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const load = buildDossierScreen(new Uint8Array(readFileSync(policyPath)), true, { repository: 'repository:syzygy-self', commit }, 'public');
if (!load.ok) throw new Error(load.why);
const lister = openPinnedObjectReader({ gitDir, revision: commit });
const reader = openPinnedObjectReader({ gitDir, revision: commit, maxObjectBytes: MANIFEST_BLOB_LIMIT });
const entries = await lister.listTree();

async function measure(consented: readonly string[] | null) {
  const started = performance.now();
  const m = await deriveDocsAndCode({ entries, screen: load.ok ? load.screen : (undefined as never), consented, read: async (p) => (await reader.readBlobs([p]))[0]! });
  const elapsedMs = Math.round(performance.now() - started);
  if (m.state !== 'derived') throw new Error(m.why);
  const tally = (keyOf: (r: (typeof m.rows)[number]) => string) => {
    const out: Record<string, number> = {};
    for (const r of m.rows) out[keyOf(r)] = (out[keyOf(r)] ?? 0) + 1;
    return out;
  };
  const reasons = (files: typeof m.documents.files) => {
    const out: Record<string, number> = {};
    for (const f of files) if (f.epistemic === 'unknown') { const k = `${f.unknownReason}${f.parseFault === null ? '' : `/${f.parseFault}`}`; out[k] = (out[k] ?? 0) + 1; }
    return out;
  };
  const { files: _d, ...documents } = m.documents;
  const { files: _c, ...code } = m.code;
  return {
    consented, documents, documentUnknownByReason: reasons(m.documents.files), code, codeUnknownListedByReason: reasons(m.code.files), counts: m.counts,
    rowsListed: m.rows.length, rowsNotListed: m.rowsNotListed,
    listedByFormAndOutcome: tally((r) => `${r.form}/${r.written}/${r.outcome}${r.unknownReason === null ? '' : `/${r.unknownReason}`}`),
    firstDocumentOnlyListed: m.rows.filter((r) => r.outcome === 'document-only').slice(0, 25).map((r) => ({ document: r.document, line: r.line, value: r.value, written: r.written })),
    deriveElapsedMs: elapsedMs,
  };
}

console.log(JSON.stringify({
  subject: { tree: 'syzygy (this repository)', commit, policy: `${load.screen.policyId} ${load.screen.policyVersion}`, policySha256: load.screen.policySha256 },
  before: { rowsResolved: 0, pagesListingRows: 0, basis: 'no rule before REQ-polaris-generation-034 version 2.48 resolved a document\'s path or identifier against the tree' },
  afterNoStatement: await measure(null),
  afterBothClassesListed: await measure(['code-content', 'project-documentation']),
}, null, 2));
