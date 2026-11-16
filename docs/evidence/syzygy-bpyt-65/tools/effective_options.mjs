// syzygy-bpyt.65, E2: every workspace project's options as TypeScript reads them, through extends, against the refusals
// scripts/clean_build.mjs adds. Usage, from the root of a Syzygy checkout: node <this file> > record.json.
// A project is refused when its effective outDir, tsBuildInfoFile or declarationDir lies outside <project>/dist, when it sets
// outFile, or when another project references it and its effective composite is not true.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { posix, relative, resolve } from 'node:path';
import ts from 'typescript';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const projects = execFileSync('git', ['ls-files', '-z', '--', 'apps', 'packages'], { encoding: 'utf8' }).split('\0')
  .filter((path) => /^(?:apps|packages)\/[^/]+\/tsconfig\.json$/u.test(path)).map((path) => path.slice(0, -'/tsconfig.json'.length)).sort();
const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } };
const referenced = new Set();
const rows = projects.map((project) => {
  const raw = JSON.parse(readFileSync(`${project}/tsconfig.json`, 'utf8'));
  for (const reference of raw.references ?? []) referenced.add(posix.normalize(posix.join(project, reference.path)));
  const parsed = ts.getParsedCommandLineOfConfigFile(resolve(project, 'tsconfig.json'), undefined, host);
  const o = parsed.options;
  const rel = (file) => (typeof file === 'string' ? relative(process.cwd(), file) : file);
  const dist = resolve(project, 'dist');
  const under = (file) => typeof file === 'string' && (file === dist || file.startsWith(`${dist}/`));
  return { project, extends: raw.extends, outDir: rel(o.outDir), tsBuildInfoFile: rel(o.tsBuildInfoFile), declarationDir: rel(o.declarationDir),
    outFile: rel(o.outFile), composite: o.composite, parseErrors: parsed.errors.length,
    outputsUnderDist: under(o.outDir) && under(o.tsBuildInfoFile) && (!('declarationDir' in o) || under(o.declarationDir)) && !('outFile' in o) };
});
for (const row of rows) row.referenced = referenced.has(row.project);
const refused = rows.filter((row) => !row.outputsUnderDist || (row.referenced && row.composite !== true)).map((row) => row.project);
console.log(JSON.stringify({ subject: 'effective tsconfig options of every workspace project', commit,
  tool: { path: 'docs/evidence/syzygy-bpyt-65/tools/effective_options.mjs', sha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex') },
  projects: rows.length, refused, rows }, null, 1));
