// Independent probe: for each target form, build a scratch package whose exports '.' names the target under one condition,
// load it through import() or require() in a child node, and record loads / warns / throws (with the error code). Then ask
// the testkit (argv[2] = path to workspace-reach.testkit.ts) for its decision on the same entry. Writes JSON to argv[3].
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const kit = await import(process.argv[2]);
const BS = String.fromCharCode(92);
const T = [
  './dist/index.js',
  './dist/./index.js', './dist/.', './dist/x/../index.js', './dist/x/..', './dist/node_modules/index.js',
  './dist/NODE_MODULES/index.js', './dist/Node_Modules/index.js', './dist/nOdE_mOdUlEs/index.js',
  './dist/%2e/index.js', './dist/%2E/index.js', './dist/%2e%2e/index.js', './dist/%2E%2e/index.js', './dist/.%2e/index.js',
  './dist/%6eode_modules/index.js', './dist/%4Eode_modules/index.js', './dist/node%5Fmodules/index.js', './dist/%6E%6F%64%65%5F%6D%6F%64%75%6C%65%73/index.js',
  `./dist/x${BS}..${BS}index.js`, `./dist${BS}.${BS}index.js`, `./dist${BS}node_modules${BS}index.js`, `./dist${BS}index.js`,
  './dist//index.js', './dist/', './dist/x//', './/dist/index.js',
  './dist/.hidden/index.js', './dist/..x/index.js', './dist/node_modules_x/index.js', './dist/...x/index.js', './dist/%2e%2e%2findex.js',
  './dist/%252e/index.js',
];
const MODES = [['import', 'import'], ['require', 'require'], ['default', 'import'], ['default', 'require']];
const scratch = mkdtempSync(join(tmpdir(), 'forms-'));
const rows = [];
let i = 0;
try {
  for (const target of T) {
    for (const [condition, how] of MODES) {
      const dir = join(scratch, String(i++));
      const pkg = join(dir, 'node_modules', 'pkg');
      mkdirSync(pkg, { recursive: true });
      writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'pkg', exports: { '.': { [condition]: target } } }));
      // Create files under several plausible decodings so a target Node accepts can load.
      const variants = new Set([target, decodeURIComponent(target.replace(/%2f/gi, '%252f')), target.replace(/\/+/g, '/')]);
      for (const v of variants) {
        if (v.endsWith('/') || v.endsWith('/.') || v.endsWith('/..')) continue;
        const file = join(pkg, v);
        try { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, 'module.exports = "loaded";\n'); } catch {}
      }
      const probe = how === 'import' ? "const m = await import('pkg');process.stdout.write(String(m.default));" : "const { createRequire } = await import('node:module');process.stdout.write(String(createRequire(import.meta.url)('pkg')));";
      writeFileSync(join(dir, 'probe.mjs'), probe);
      const run = spawnSync(process.execPath, ['probe.mjs'], { cwd: dir, encoding: 'utf8' });
      const err = run.stderr;
      const code = /\b(ERR_[A-Z_]+|MODULE_NOT_FOUND)\b/.exec(err)?.[1] ?? null;
      const node = run.status === 0 && run.stdout === 'loaded' ? (err.includes('DEP0166') ? 'warns' : err.trim() === '' ? 'loads' : 'loads+other-stderr') : `throws ${code}`;
      const fault = kit.segmentFaultOf({ [condition]: target }, false) ?? null;
      const guard = fault === null ? 'accepts' : fault.endsWith('(ERR_INVALID_PACKAGE_TARGET)') ? 'refuses: says Node refuses' : fault.endsWith('(DEP0166)') ? 'refuses: says Node warns' : `refuses: ${fault}`;
      rows.push({ target, condition, how, node, guard });
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
writeFileSync(process.argv[3], JSON.stringify({ node: process.version, rows }, null, 1) + '\n');
for (const r of rows) process.stdout.write(`${JSON.stringify(r.target)}\t${r.condition}/${r.how}\t${r.node}\t${r.guard}\n`);
