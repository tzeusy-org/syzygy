
// rev-521 probe, appended to a scratch copy of subpath-imports.test.ts so it reuses edgesOf and entryEdgesOf byte for byte.
const PROBES: readonly string[] = [
  "const name = '@syzygy/polaris-dossier'; await import(name);",
  "await import('@syzygy/' + 'polaris-dossier');",
  "await import(`@syzygy/polaris-dossier`);",
  "require.resolve('@syzygy/polaris-dossier');",
  "import.meta.resolve('@syzygy/polaris-dossier');",
  "import { createRequire as cr } from 'node:module'; cr(import.meta.url)('@syzygy/polaris-dossier');",
  "import nodeModule from 'node:module'; nodeModule.createRequire(import.meta.url)('@syzygy/polaris-dossier');",
  "const r = require; r('@syzygy/polaris-dossier');",
  "import './dossier-bridge.js';",
  "import x from '\\u0040syzygy/polaris-dossier';",
  "await import('@syzygy/polaris-dossier', { with: { type: 'json' } });",
  "declare module 'm' { export * from '@syzygy/polaris-dossier'; }",
  "import type X = require('@syzygy/polaris-dossier');",
  "export = require('@syzygy/polaris-dossier');",
  "/// <reference path=\"../../../packages/polaris-dossier/src/cli.ts\" />",
  "if (a) {} else if (argv[0] === 'dossier') { await import('@syzygy/polaris-dossier'); }",
  "switch (argv[0]) { case 'dossier': await import('@syzygy/polaris-dossier'); }",
  "const m = argv[0] === 'dossier' ? await import('@syzygy/polaris-dossier') : undefined;",
  "function f(argv: string[]) { if (argv[0] !== 'dossier') return; return import('@syzygy/polaris-dossier'); }",
  "{ const argv = ['dossier']; if (argv[0] === 'dossier') await import('@syzygy/polaris-dossier'); }",
  "if (argv[0] === 'dossier') { if (x) {} else { await import('@syzygy/polaris-dossier'); } }",
  "if (argv[0] === 'dossier') globalThis.later = () => import('@syzygy/polaris-dossier');",
  "if (argv[0] === 'dossier' && (await import('@syzygy/polaris-dossier'))) {}",
];
describe('rev-521 guard probe', () => {
  it('records what the two methods report for each probe', () => {
    const out = PROBES.map((line) => {
      const text = `import * as path from 'node:path';\n${line}\n`;
      const reported = ts.preProcessFile(text, true, true).importedFiles.map((file) => file.fileName);
      try {
        return { line, reported, entryEdges: entryEdgesOf(text), all: importsOf(text) };
      } catch (error) {
        return { line, reported, throws: (error as Error).message };
      }
    });
    fs.writeFileSync(process.env.PROBE_OUT!, JSON.stringify(out, null, 1));
  });
});
