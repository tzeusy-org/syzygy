// Round-2 reviewer tool: Node's own outcome for exports entries whose condition keys hold a /../ segment, under import() and
// require(), beside the guard's decision (argv[2]: the testkit path).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const kit = await import(process.argv[2]);
const T = './dist/index.js';
const ENTRIES = {
  'key a/../b alone': { 'a/../b': T },
  'nested key, default after': { node: { 'x/../import': T }, default: T },
  'key after default': { default: T, 'a/../b': T },
  'key a/..b, default after': { 'a/..b': T, default: T },
};
const scratch = mkdtempSync(join(tmpdir(), 'keys-'));
let i = 0;
try {
  for (const [name, entry] of Object.entries(ENTRIES)) {
    for (const how of ['import', 'require']) {
      const dir = join(scratch, String(i++));
      const pkg = join(dir, 'node_modules', 'pkg');
      mkdirSync(join(pkg, 'dist'), { recursive: true });
      writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'pkg', exports: { '.': entry } }));
      writeFileSync(join(pkg, 'dist', 'index.js'), 'module.exports = "loaded";\n');
      const load = how === 'import' ? "(await import('pkg')).default" : "(await import('node:module')).createRequire(import.meta.url)('pkg')";
      writeFileSync(join(dir, 'probe.mjs'), `try { process.stdout.write(String(${load})); } catch (e) { process.stdout.write('error ' + e.code); }\n`);
      const run = spawnSync(process.execPath, ['probe.mjs'], { cwd: dir, encoding: 'utf8' });
      const guard = kit.segmentFaultOf(entry, false) ?? 'accepts';
      process.stdout.write(`${name}\t${how}\tnode=${run.stdout === 'loaded' ? 'loads' : run.stdout}\tguard=${guard}\n`);
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
