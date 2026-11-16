// rev-558: time product-build.test.ts's new emitted() over the 10 projects, twice, and compare the two runs and tsc --listFilesOnly.
// Usage, from a checkout root: node emitted_time.mjs
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(join(process.cwd(), 'x.js'));
const ts = require('typescript');
const ROOT = `${process.cwd()}/`;
const projects = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'packages'], { encoding: 'utf8' }).split('\0')
  .filter((p) => /^(?:apps|packages)\/[^/]+\/tsconfig\.json$/u.test(p)).map((p) => p.slice(0, -'/tsconfig.json'.length));
function emitted(project) {
  const path = join(ROOT, project, 'tsconfig.json');
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(path, ts.sys.readFile).config, ts.sys, dirname(path));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });
  return program.getSourceFiles().map(({ fileName }) => fileName).filter((f) => f.startsWith(`${ROOT}${project}/src/`) && !f.endsWith('.d.ts')).map((f) => f.slice(ROOT.length)).sort();
}
const runs = [];
for (let i = 0; i < 2; i += 1) { const t = Date.now(); const m = projects.flatMap((p) => emitted(p)); runs.push({ ms: Date.now() - t, modules: m }); }
const tsc = require.resolve('typescript/bin/tsc');
const listed = projects.flatMap((p) => execFileSync(process.execPath, [tsc, '-p', join(ROOT, p, 'tsconfig.json'), '--listFilesOnly'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter((f) => f.startsWith(`${ROOT}${p}/src/`) && !f.endsWith('.d.ts')).map((f) => f.slice(ROOT.length)).sort());
const exts = {};
for (const f of runs[0].modules) { const e = f.slice(f.lastIndexOf('.')); exts[e] = (exts[e] ?? 0) + 1; }
console.log(JSON.stringify({ loadavg: require('node:fs').readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3), projects: projects.length,
  ms: runs.map((r) => r.ms), modules: runs[0].modules.length, runsEqual: JSON.stringify(runs[0].modules) === JSON.stringify(runs[1].modules),
  equalsTsc: JSON.stringify(runs[0].modules) === JSON.stringify(listed), modulesSha256: require('node:crypto').createHash('sha256').update(runs[0].modules.join('\n')).digest('hex'), tscCount: listed.length, extensions: exts }, null, 1));
