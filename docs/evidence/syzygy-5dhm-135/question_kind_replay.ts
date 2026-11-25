// Replay of the per-kind floor (syzygy-5dhm.135, REQ-polaris-generation-034 version 2.32) over a stored run's latest passed draft.
// Usage (from the worktree root): R135_ROOT=$PWD npx vite-node -c vitest.config.ts <this file> <run dir> <out.json>
//
// Reads, and never writes: the run's run.json and its frozen drafts (never a run's agent or session directory), and the pinned tree's
// listing from the clone the run record names, through the re-hashing object reader. Calls no model and asks no consent.
//
// No stored draft declares `questionKinds` (every one predates version 2.32), so the replay supplies the declarations by a published
// keyword rule over each Inferred claim block's own text (KIND_RULES below), applied to an in-memory copy of the draft with its schema
// version set to v13. The rule is a crude proxy for an author's declaration, so every count it gives is [Inferred]: a block the rule
// tags may not answer the kind, and a block that does may use words the rule does not list.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.env['R135_ROOT']!;
const at = (rel: string): string => path.join(ROOT, rel);

/** The keyword rule, version 1: a block declares a kind when its text matches the kind's pattern (case-insensitive). */
const KIND_RULES: Readonly<Record<string, RegExp>> = {
  purpose: /\b(?:purpose|is for|used for|designed (?:to|for)|lets (?:you|users|clients)|aims? to|goal)\b/iu,
  structure: /\b(?:module|modules|directory|directories|component|components|layer|layers|consists of|composed of|split into|is part of|lives in|defined in|organi[sz]ed)\b/iu,
  mechanism: /\b(?:calls|invokes|loop|event loop|dispatch(?:es)?|reads|writes|returns|executes|handles|processes|parses|stores|forks|sends|receives)\b/iu,
  rationale: /\b(?:because|so that|in order to|trade-?offs?|chose|chosen|instead of|rather than|the reason|to avoid|motivat\w*)\b/iu,
  change: /\b(?:to add|to change|to modify|to extend|add a new|adding a new|edit|register (?:a|the|your)|where to change|hook into|implement a new)\b/iu,
  limits: /\b(?:limits?|limited|cannot|can't|does not|doesn't|not supported|unsupported|fails?|failure|maximum|at most|no more than|refuses?)\b/iu,
};

async function main(): Promise<void> {
  const [runDir, out] = process.argv.slice(-2) as [string, string];
  const { collectBlocks } = await import(at('packages/polaris-dossier/src/check-derive.ts'));
  const { latestPassedDraft } = await import(at('packages/polaris-dossier/src/review-packet.ts'));
  const { loadDossierScreen } = await import(at('packages/polaris-dossier/src/screen.ts'));
  const { secretPathOf } = await import(at('packages/polaris-dossier/src/derived-record.ts'));
  const { openPinnedObjectReader } = await import(at('packages/polaris-dossier/src/git-object-reader.ts'));
  const { deriveTreeFacts } = await import(at('packages/polaris-dossier/src/derive.ts'));
  const { questionKindAdvice } = await import(at('packages/polaris-dossier/src/question-kinds.ts'));

  const stored = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  const pinned: string = stored.subject.pinnedRevision.commit;
  const visibility = stored.subject.visibility?.value ?? 'public';
  const load = await loadDossierScreen(ROOT, Date.now(), { repository: `repository:${stored.subject.repository.repositoryId}`, commit: pinned, visibility });
  if (!load.ok) throw new Error(`screen: ${load.why}`);
  const draftRev = latestPassedDraft(runDir);
  if (!draftRev.ok) throw new Error(`draft: ${draftRev.reason}`);
  const doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(draftRev.bytes));
  const reader = openPinnedObjectReader({ gitDir: path.join(stored.subject.clone.path, '.git'), revision: pinned });
  const facts = deriveTreeFacts(await reader.listTree(), secretPathOf(load.screen));

  const rows: { blockId: string; kinds: string[] }[] = [];
  let inferred = 0;
  for (const block of collectBlocks(doc)) {
    if (block.textKey !== 'text' || block.value['label'] !== 'inferred' || typeof block.value['id'] !== 'string') continue;
    inferred++;
    const said = typeof block.value['text'] === 'string' ? block.value['text'] : '';
    const kinds = Object.entries(KIND_RULES).filter(([, rule]) => rule.test(said)).map(([kind]) => kind);
    if (kinds.length > 0) rows.push({ blockId: block.value['id'], kinds });
  }
  const advice = questionKindAdvice({ ...doc, schemaVersion: 'polaris-dossier-local-draft-v13', questionKinds: rows }, facts);
  const record = {
    subject: `syzygy-5dhm.135: the per-kind floor replayed over ${path.basename(runDir)}'s latest passed draft`,
    run: path.basename(runDir),
    repositoryId: stored.subject.repository.repositoryId,
    pinnedRevision: pinned,
    draft: { revision: draftRev.revision, schemaVersion: doc.schemaVersion, sha256: createHash('sha256').update(draftRev.bytes).digest('hex') },
    declarations: {
      label: 'Inferred',
      basis: 'keyword rule version 1 of this harness over each Inferred claim block\'s own text, in place of the author\'s declaration no stored draft carries',
      rules: Object.fromEntries(Object.entries(KIND_RULES).map(([kind, rule]) => [kind, rule.source])),
      inferredBlocks: inferred, taggedBlocks: rows.length,
      blocksPerKind: Object.fromEntries(Object.keys(KIND_RULES).map((kind) => [kind, rows.filter((row) => row.kinds.includes(kind)).length])),
    },
    tree: { files: facts.files, secretPathsLeftOut: facts.secretPathsLeftOut, unitsNotListed: facts.unitsNotListed },
    advice,
  };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  const units = advice.state === 'compared' ? advice.units.map((unit: { unit: string; files: number; missing: string[] }) => `${unit.unit}(${unit.files}): missing ${unit.missing.join(',') || 'none'}`) : [advice.why];
  console.log(JSON.stringify({ run: record.run, draftRevision: draftRev.revision, tagged: rows.length, inferred, units }));
}
main().catch((cause) => { console.error(cause instanceof Error ? cause.message : cause); process.exit(1); });
