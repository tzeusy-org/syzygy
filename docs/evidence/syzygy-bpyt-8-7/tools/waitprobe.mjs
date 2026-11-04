// Probe: does waitModeStatus open on a sign-off record dated in the future? node waitprobe.mjs <tree> <scratch>
import fs from 'node:fs'; import path from 'node:path';
const [tree, scratch] = process.argv.slice(2);
const { waitModeStatus } = await import(path.join(tree, 'packages/polaris-dossier/dist/waiting-sessions.js'));
const D = '.syzygy/governance/decisions', REC = 'POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md';
const SPEC = 'openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md';
function world(name, edit) {
  const root = path.join(scratch, name); fs.rmSync(root, { recursive: true, force: true });
  for (const rel of [`${D}/${REC}`, `${D}/ACCEPTANCE-ACT-RECORD.md`, SPEC, 'docs/reviews/R-PR408-WAITING-SESSIONS-4-RAW.md']) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.copyFileSync(path.join(tree, rel), path.join(root, rel));
  }
  const f = path.join(root, D, REC); fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8')));
  return root;
}
const rows = {
  unchanged: waitModeStatus(world('w0', t => t)),
  dated2099: waitModeStatus(world('w1', t => t.replace(/^Date: \d{4}-\d{2}-\d{2}$/m, 'Date: 2099-01-01').replace(/2026-10-14T03:32:23\.826Z \(2026-10-14 UTC\)/, '2099-01-01T00:00:00.000Z (2099-01-01 UTC)'))),
  negativeControlVersionAltered: waitModeStatus(world('w3', t => t.replace(/^Version: 1\.2$/m, 'Version: 1.3'))),
  withdrawnLine: waitModeStatus(world('w2', t => `${t}\n\nWithdrawn: the owner withdraws this sign-off, 2026-10-20.\n`)),
};
console.log(JSON.stringify({ subject: 'packages/polaris-dossier/dist/waiting-sessions.js built from src/waiting-sessions.ts', record: `${D}/${REC}`, rows }));
