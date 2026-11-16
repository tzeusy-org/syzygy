// Reviewer's probe for PR 533 round 2: what the manifest reports when an index's early-closed fence hides a later link (G3's hide
// direction). Usage: node g3-manifest-probe.mjs <built clone> <out.json>. Every input is a synthetic fixture written here; the tree
// and its bodies are in memory, and no repository body is read.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
const core = await import(pathToFileURL(join(root, 'packages/three-surface-poc-core/dist/index.js')).href);
const B = '```';
const oid = (n) => n.toString(16).padStart(40, '0');
const ROOT = 'about/README.md';
const rootIndex = ['# Project', '', '- [Heart and Soul](heart-and-soul/README.md)', ''].join('\n');
const pillarIndex = (fenceLines) => ['# Heart and Soul', '', '- [Vision](vision.md)', '', ...fenceLines, '', '- [Lore](lore.md)', ''].join('\n');
const run = (fenceLines) => {
  const H = 'about/heart-and-soul';
  const bodies = new Map([[ROOT, rootIndex], [`${H}/README.md`, pillarIndex(fenceLines)], [`${H}/vision.md`, '# Vision\n'], [`${H}/lore.md`, '# Lore\n']]);
  const tree = [
    { mode: '040000', type: 'tree', objectId: oid(6), path: 'about' },
    { mode: '100644', type: 'blob', objectId: oid(1), path: ROOT },
    { mode: '040000', type: 'tree', objectId: oid(2), path: H },
    { mode: '100644', type: 'blob', objectId: oid(3), path: `${H}/README.md` },
    { mode: '100644', type: 'blob', objectId: oid(4), path: `${H}/vision.md` },
    { mode: '100644', type: 'blob', objectId: oid(5), path: `${H}/lore.md` },
  ];
  const text = bodies.get(`${H}/README.md`);
  const result = core.deriveProjectShapeManifest({ repositoryId: 'repository:probe', revision: 'a'.repeat(40), tree, readSeed: ({ path }) => ({ kind: 'text', text: bodies.get(path) }) });
  if (result.kind !== 'manifest') return { kind: result.kind, reason: result.reason };
  const pillar = result.manifest.pillars.find((p) => p.key === 'heart-and-soul');
  return {
    profileReading: core.maskMarkdownCodeContexts(text).kind,
    linkVisibleToProfile: core.maskMarkdownCodeContexts(text).kind === 'masked' && core.maskMarkdownCodeContexts(text).masked.includes('[Lore](lore.md)'),
    indexLinkTargets: core.indexLinkTargets(text),
    pillar,
    namedFileSources: result.manifest.sources.filter((s) => s.rule === 'pillar-named-file').map((s) => s.path),
  };
};
const result = {
  plainFence: run([B, 'x', B]),
  closerShapedLineWithInfo: run([B, 'x', B + 'js', 'y', B]),
};
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(result, null, 1));
