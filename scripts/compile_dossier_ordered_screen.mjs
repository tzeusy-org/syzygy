import { build } from 'esbuild';

/** Shared exact build profile. The runtime builder supplies its capture plugin
 * and records the complete metafile input graph, including this compiler. */
export const ORDERED_SCREEN_SOURCES = Object.freeze([
  'packages/polaris-dossier/src/url-ordered-design-screen-protocol.ts',
  'packages/polaris-dossier/src/url-ordered-design-screen-worker.ts',
  'packages/polaris-dossier/src/url-ordered-design-screen.ts',
  'scripts/compile_dossier_ordered_screen.mjs',
]);
export async function compileDossierOrderedScreen(root, plugins = []) {
  const result = await build({ absWorkingDir: root,
    entryPoints: ['packages/polaris-dossier/src/url-ordered-design-screen-worker.ts'],
    bundle: true, platform: 'node', format: 'esm', conditions: ['source'], target: 'node24',
    // Imported standalone CLIs must not mistake this bundle for their entrypoint.
    define: { 'import.meta.url': JSON.stringify('ordered-screen:module') },
    banner: { js: "import { createRequire as __orderedScreenCreateRequire } from 'node:module'; const require = __orderedScreenCreateRequire(import.meta.url);" },
    outfile: 'ordered-screen.mjs', write: false, metafile: true, logLevel: 'silent', plugins });
  if (result.outputFiles.length !== 1 || result.outputFiles[0].contents.length > 8_388_608)
    throw new Error('unexpected ordered screen worker build output');
  return result;
}
