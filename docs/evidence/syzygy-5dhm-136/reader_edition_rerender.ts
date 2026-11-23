// Scratch measurement (syzygy-5dhm.70/.71): draw a stored run's latest passed draft with this worktree's renderer into a scratch
// directory. The CLI refuses a legacy polaris-dossier-run/1 record, so this drives the same functions `renderRun` does
// (deriveFindings -> buildLocalInput -> derivedStructureAt -> renderLocalDossier) over a COPY of the run directory,
// with the three inputs a real render has (syzygy-a70b, fixed 2026-11-24; the first measurement lacked all three):
//   - the screen loaded for the run's placement subject (`repository:<id>` and the pinned commit, as `placementSubjectOf` gives it),
//     so an owner placement in the policy places what it names;
//   - the run's eligible content classes (`subject.contentClasses`); a legacy run that records none takes LEGACY_CLASSES, the
//     set the newest stored run declares, and the output says so;
//   - the run's newest stored fidelity verdict, INJECTED as if it counted (its packet is not rebuilt), and the output says so.
// No design review is bound. Nothing is written into the run directory; no body is printed. REVIEW=none, PLACE=0 and CLASSES=<list>
// reproduce the defective first form.
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.env['R70_ROOT']!;
const LEGACY_CLASSES = 'code-content,project-documentation,governance-text';
/** The highest-numbered `fidelity-verdict-<n>.json` under the run copy's reviews/. */
const newestVerdict = (runDir: string): string => fs.readdirSync(path.join(runDir, 'reviews')).filter(f => /^fidelity-verdict-\d+\.json$/u.test(f))
  .sort((a, b) => Number(/\d+/u.exec(a)![0]) - Number(/\d+/u.exec(b)![0])).at(-1)!;
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
  const load = await loadDossierScreen(process.env['R70_POLICY_ROOT'] ?? ROOT, Date.now(), process.env['PLACE'] === '0' ? { visibility } : { repository: `repository:${stored.subject.repository.repositoryId}`, commit: pinned, visibility });
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
    contentClasses: stored.subject.contentClasses ?? (process.env['CLASSES'] ?? LEGACY_CLASSES).split(','),
  };
  const opened = { ok: true as const, run: runDir, runId: path.basename(runDir), subject, declared, deadlineEnds: 0, revision: null, contentClasses: subject.contentClasses };
  const input = buildLocalInput({ opened, doc, derived, review: await reviewFor(runDir), screen, credential: { required: false, why: 'scratch re-render' }, algorithm: reader.algorithm });
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
  console.log(JSON.stringify({ run: path.basename(runDir), inputs: {
    placement: process.env['PLACE'] === '0' ? null : `repository:${stored.subject.repository.repositoryId}@${pinned}`,
    contentClasses: subject.contentClasses, contentClassesFrom: stored.subject.contentClasses === undefined ? (process.env['CLASSES'] === undefined ? 'LEGACY_CLASSES (the run records none)' : 'CLASSES') : 'run.json',
    review: (process.env['REVIEW'] ?? 'inject') === 'none' ? null : `injected ${process.env['REVIEW_VERDICT'] ?? newestVerdict(runDir)} (stored verdict, packet not rebuilt)` },
  draftRevision: draftRev.revision, schemaVersion: doc.schemaVersion, hasTaskRoutes: Object.hasOwn(doc, 'taskRoutes'), rederiveFindings: derived.findings.length,
    findingKinds: [...new Set(derived.findings.map((f: { kind: string }) => f.kind))], draftLayer: input.local.draftLayer.state, derivedState: (derivedStructure as { state?: string } | undefined)?.state ?? null, files: files.size }));
}
main().catch((cause) => { console.error(cause instanceof Error ? cause.message : cause); process.exit(1); });

// syzygy-a70b: REVIEW=none keeps the 5dhm.136 harness's unbound review; REVIEW=inject binds the stored verdict named by REVIEW_VERDICT
// (a file under the run copy's reviews/) as if it counted, so the renderer is measured apart from whether its packet still rebuilds.
async function reviewFor(runDir: string): Promise<unknown> {
  if ((process.env['REVIEW'] ?? 'inject') === 'none') return { counts: false, why: 'scratch re-render: no review is bound' };
  const { derivedBlocking } = await import(at('packages/polaris-dossier/src/review-verdict.ts'));
  const file = path.join(runDir, 'reviews', process.env['REVIEW_VERDICT'] ?? newestVerdict(runDir));
  const verdict = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (verdict.blockSupport as { blockId: string; verdict: string }[]);
  return {
    counts: true, kind: 'fidelity', number: Number(/(\d+)\.json$/.exec(file)![1]), session: 1, packetSha256: verdict.packetSha256,
    verdict: { readiness: verdict.readiness, blocking: derivedBlocking(verdict), blockSupport: Object.fromEntries(rows.map((r) => [r.blockId, r.verdict])), declaredBy: 'the review session', label: 'Inferred' },
    withheldInventoryEntries: 0,
    sessionId: { value: String(verdict.sessionId ?? 'scratch'), declaredBy: 'the review session', label: 'Inferred' },
    launchForm: { value: 'terminal', declaredBy: 'operator', label: 'Inferred' },
    providerStatement: null,
    observed: { packetSha256: verdict.packetSha256, verdictNamesPacket: true, label: 'Observed' },
    inferred: { basis: 'scratch re-render: the stored verdict is injected, not rebuilt', label: 'Inferred' },
    label: 'Inferred',
  };
}
