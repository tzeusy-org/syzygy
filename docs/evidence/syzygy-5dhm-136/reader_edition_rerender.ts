// Scratch measurement (syzygy-5dhm.70/.71): draw a stored run's latest passed draft with this worktree's renderer into a scratch
// directory. The CLI refuses a legacy polaris-dossier-run/1 record, so this drives the same functions `renderRun` does
// (deriveFindings -> buildLocalInput -> derivedStructureAt -> renderLocalDossier) over a COPY of the run directory, with no fidelity
// or design review bound. Nothing is written into the run directory; no body is printed.
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.env['R70_ROOT']!;
const at = (rel: string): string => path.join(ROOT, rel);

async function main(): Promise<void> {
  const [runDir, outDir] = process.argv.slice(-2) as [string, string];
  const { deriveFindings, draftRules } = await import(at('packages/polaris-dossier/src/check-derive.ts'));
  const { buildLocalInput } = await import(at('packages/polaris-dossier/src/render.ts'));
  const { loadDossierScreen } = await import(at('packages/polaris-dossier/src/screen.ts'));
  const { latestPassedDraft } = await import(at('packages/polaris-dossier/src/review-packet.ts'));
  const { openPinnedObjectReader } = await import(at('packages/polaris-dossier/src/git-object-reader.ts'));
  const { derivedStructureAt, readCurrencyPolicy } = await import(at('packages/polaris-dossier/src/derived-record.ts'));
  const { renderManifestFacts } = await import(at('packages/polaris-dossier/src/render.ts'));
  const { renderLocalDossier } = await import(at('apps/three-surface-poc/src/polaris-generation/dossier-site.ts'));

  const stored = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  const pinned: string = stored.subject.pinnedRevision.commit;
  const visibility = stored.subject.visibility?.value ?? 'public';
  const load = await loadDossierScreen(process.env['R70_POLICY_ROOT'] ?? ROOT, Date.now(), { visibility });
  if (!load.ok) throw new Error(`screen: ${load.why}`);
  const screen = load.screen;
  const draftRev = latestPassedDraft(runDir);
  if (!draftRev.ok) throw new Error(`draft: ${draftRev.reason}`);
  const doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(draftRev.bytes));
  const reader = openPinnedObjectReader({ gitDir: path.join(stored.subject.clone.path, '.git'), revision: pinned });
  const declared = { ...stored.declared, modelVersion: stored.declared.modelVersion ?? null };
  const derived = await deriveFindings(doc, { pinned, screen, reader }, draftRules(pinned, declared.maxQuestions ?? 0, declared.poleLimit ?? 5));
  const subject = {
    ...stored.subject,
    repository: { role: 'observed-source', ...stored.subject.repository },
    screeningPolicy: stored.subject.screeningPolicy ?? { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    visibility: stored.subject.visibility ?? { value: visibility, declaredBy: 'measurement script', source: 'scratch re-render' },
    contentClasses: stored.subject.contentClasses ?? ['code-content', 'project-documentation'],
  };
  const opened = { ok: true as const, run: runDir, runId: path.basename(runDir), subject, declared, deadlineEnds: 0, revision: null, contentClasses: subject.contentClasses };
  const input = buildLocalInput({ opened, doc, derived, review: { counts: false, why: 'scratch re-render: no review is bound' }, screen, credential: { required: false, why: 'scratch re-render' }, algorithm: reader.algorithm });
  if (!input.ok) throw new Error(`build: ${input.stage}: ${input.reason}`);
  let derivedStructure: unknown;
  try {
    derivedStructure = await derivedStructureAt({ run: runDir, revision: draftRev.revision, pinned, repositoryId: subject.repository.repositoryId, reader, isSecretPath: (p: string) => screen.screenPath(p) === 'secret-detector-match', policy: readCurrencyPolicy(process.env['R70_POLICY_ROOT'] ?? ROOT) });
  } catch (cause) { derivedStructure = undefined; console.log(`derived structure not available: ${cause instanceof Error ? cause.message : 'unknown'}`); }
  const manifestFacts = await renderManifestFacts(subject.clone.path, pinned, {}, screen, subject.contentClasses, reader);
  const files: ReadonlyMap<string, string> = renderLocalDossier({ local: { ...input.local, manifestFacts, ...(derivedStructure === undefined ? {} : { derivedStructure }) }, sources: input.sources }).files;
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [file, content] of files) {
    const out = path.join(outDir, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content);
  }
  console.log(JSON.stringify({ run: path.basename(runDir), draftRevision: draftRev.revision, schemaVersion: doc.schemaVersion, hasTaskRoutes: Object.hasOwn(doc, 'taskRoutes'), rederiveFindings: derived.findings.length,
    findingKinds: [...new Set(derived.findings.map((f: { kind: string }) => f.kind))], draftLayer: input.local.draftLayer.state, derivedState: (derivedStructure as { state?: string } | undefined)?.state ?? null, files: files.size }));
}
main().catch((cause) => { console.error(cause instanceof Error ? cause.message : cause); process.exit(1); });
