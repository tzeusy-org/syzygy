// Round-2 reviewer tool: for each empty-segment form the guard names "accepts with a deprecation warning (DEP0166)", export it
// under `import` and under `require`, create pkg/index.js and pkg/dist/index.js, load it with import() and require() in a child
// node, and record whether DEP0166 is printed and what follows (loaded, or the error code). argv[2]: the testkit path.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const kit = await import(process.argv[2]);
const BS = String.fromCharCode(92);
const T = ['./dist//index.js', './/dist/index.js', './dist/', './dist/x//', './', './/', `./dist${BS}${BS}index.js`, `./dist/${BS}index.js`, `./dist${BS}`, './dist/x/'];
const scratch = mkdtempSync(join(tmpdir(), 'warn-'));
let i = 0;
try {
  for (const target of T) {
    const fault = kit.segmentFaultOf({ import: target }, false) ?? 'accepts';
    for (const [condition, how] of [['import', 'import'], ['require', 'require']]) {
      const dir = join(scratch, String(i++));
      const pkg = join(dir, 'node_modules', 'pkg');
      mkdirSync(join(pkg, 'dist', 'x'), { recursive: true });
      writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'pkg', exports: { '.': { [condition]: target } } }));
      for (const f of ['index.js', 'dist/index.js', 'dist/x/index.js']) writeFileSync(join(pkg, f), 'module.exports = "loaded";\n');
      const load = how === 'import' ? "(await import('pkg')).default" : "(await import('node:module')).createRequire(import.meta.url)('pkg')";
      writeFileSync(join(dir, 'probe.mjs'), `try { process.stdout.write(String(${load})); } catch (e) { process.stdout.write('error ' + e.code); }\n`);
      const run = spawnSync(process.execPath, ['probe.mjs'], { cwd: dir, encoding: 'utf8' });
      const warned = run.stderr.includes('DEP0166');
      process.stdout.write(`${JSON.stringify(target)}\t${condition}/${how}\twarned=${warned}\tthen=${run.stdout === 'loaded' ? 'loads' : run.stdout}\tguard=${fault.replace(/^.*segment, /u, '')}\n`);
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
