import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const sourcePath = 'packages/polaris-dossier/src/url-run-composed.test.ts';
const subjects = [
  { commit: 'c1def9545540bc72c7d406d2bb08cfc25f9ae87f', sha256: '00e9d01fd6dc014994fac2c0aa95369492d0e1a80828cc9591e7c34e8c8052a7' },
  { commit: 'a9d50898d9e29815b94be34ef0e0638be71246de', sha256: '581b2e379ac015b333e5edc8ef717d4a93e767d19f2bd6f386db8073b9997bec' },
];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const results = [];
for (const subject of subjects) {
  const bytes = execFileSync('git', ['show', `${subject.commit}:${sourcePath}`]);
  if (createHash('sha256').update(bytes).digest('hex') !== subject.sha256) throw new Error('source digest mismatch');
  const source = bytes.toString('utf8');
  const start = source.indexOf("describe('composed URL run with actual role processes', () => {");
  if (start === -1) throw new Error('fixture describe absent');
  const match = source.slice(start).match(/beforeAll\(async \(\) => \{([\s\S]*?)\n  \}, 60_000\);/);
  if (!match) throw new Error('actual initializer extraction failed');
  const body = match[1];
  const initialize = new AsyncFunction('fs', 'path', 'recoveryHost', 'buildComposedRuntime', 'let runtime;\n' + body + '\nreturn runtime;');
  const scratchParent = path.join(os.homedir(), '.tmp');
  await fs.mkdir(scratchParent, { recursive: true });
  const scratch = await fs.mkdtemp(path.join(scratchParent, 'f3-initializer-review-'));
  try {
    const recoveryHost = { root: path.join(scratch, 'missing-parent', 'fixture-root') };
    let buildCalls = 0;
    const marker = Object.freeze({ built: true });
    const build = async () => { buildCalls++; return marker; };
    if (await initialize(fs, path, recoveryHost, build) !== marker) throw new Error('build result changed');
    const mode = (await fs.stat(recoveryHost.root)).mode & 0o777;
    if (mode !== 0o700 || buildCalls !== 1) throw new Error('private root or build invocation mismatch');
    let collisionCode;
    try { await initialize(fs, path, recoveryHost, build); } catch (error) { collisionCode = error.code; }
    if (collisionCode !== 'EEXIST' || buildCalls !== 1) throw new Error('collision did not refuse before build');
    results.push({ ...subject, sourcePath, initializerSha256: createHash('sha256').update(body).digest('hex'),
      extractedActualInitializer: true, missingParentCreated: true, privateRootMode: mode.toString(8), buildCalls,
      collisionCode, originalTimeoutMilliseconds: 60000, realBuildExecuted: false });
  } finally { await fs.rm(scratch, { recursive: true, force: true }); }
}
process.stdout.write(JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2) + '\n');
