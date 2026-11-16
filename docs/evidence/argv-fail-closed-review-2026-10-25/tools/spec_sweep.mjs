// rev-528: every import specifier in every tracked TS/JS source file at a commit, read from the git objects (never the working
// tree), found twice: TypeScript's preprocessor, and a regex over the text. Counts the `#`, absolute and URL-scheme specifiers.
// Usage: node spec_sweep.mjs <repo> <commit> <typescript module path>
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [repo, commit, tsPath] = process.argv.slice(2);
const ts = createRequire(import.meta.url)(tsPath);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 });
const files = git('ls-tree', '-r', '-z', '--name-only', commit).toString().split('\0')
  .filter((path) => /\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/u.test(path));
const srcPopulation = (path) => /^(?:apps|packages)\/[^/]+\/src\//u.test(path) && path.endsWith('.ts');
const REGEX = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"`])([^'"`\n]*)\1/gu;
const odd = (specifier) => specifier.startsWith('#') || specifier.startsWith('/') || /^[a-z][a-z0-9+.-]*:/iu.test(specifier);
const report = { commit: git('rev-parse', commit).toString().trim(), files: files.length, srcModules: 0, preprocessorSpecifiers: 0,
  srcPreprocessorSpecifiers: 0, regexSpecifiers: 0, schemes: {}, oddByPreprocessor: [], oddByRegex: [], byExtension: {} };
for (const path of files) {
  const ext = path.slice(path.lastIndexOf('.'));
  report.byExtension[ext] = (report.byExtension[ext] ?? 0) + 1;
  const text = git('show', `${commit}:${path}`).toString();
  const imported = ts.preProcessFile(text, true, true).importedFiles.map((file) => file.fileName);
  report.preprocessorSpecifiers += imported.length;
  if (srcPopulation(path)) { report.srcModules += 1; report.srcPreprocessorSpecifiers += imported.length; }
  for (const specifier of imported) {
    const scheme = /^([a-z][a-z0-9+.-]*):/iu.exec(specifier)?.[1];
    if (scheme !== undefined) report.schemes[scheme] = (report.schemes[scheme] ?? 0) + 1;
    if (odd(specifier) && !specifier.startsWith('node:')) report.oddByPreprocessor.push(`${path}: ${specifier}`);
  }
  for (const match of text.matchAll(REGEX)) {
    report.regexSpecifiers += 1;
    const specifier = match[2];
    if (odd(specifier) && !specifier.startsWith('node:')) report.oddByRegex.push(`${path}: ${specifier}`);
  }
}
console.log(JSON.stringify(report, null, 1));
