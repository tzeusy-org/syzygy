// rev-558: the PLUGINS_KEY pattern of sync-child-process-guard.test.ts, read from the file, over key forms. Usage: node plugins_probe.mjs <guard> <config>...
import { readFileSync } from 'node:fs';
const guard = readFileSync(process.argv[2], 'utf8');
const source = /const PLUGINS_KEY = \/(.+)\/;\n/.exec(guard)[1];
const re = new RegExp(source);
const forms = {
  'bare': 'plugins: [p],', 'single-quoted': "'plugins': [p],", 'double-quoted': '"plugins": [p],', 'space before colon': 'plugins : [p],',
  'newline before colon': 'plugins\n: [p],', 'shorthand': '{ plugins }', 'shorthand with others': '{ extends: true, plugins, test: {} }',
  'computed single': "['plugins']: [p],", 'computed double': '["plugins"]: [p],', 'computed template': '[`plugins`]: [p],',
  'comment between key and colon': 'plugins /* x */: [p],', 'unicode escape in identifier': 'pl\\u0075gins: [p],',
  'spread of an imported object': '...shared,', 'mergeConfig with an imported config': 'export default mergeConfig(base, defineConfig({}))',
  'project extends a file path': "{ extends: './vite.plugins.config.ts', test: { name: 'x', include: ['packages/a/src/**/*.test.ts'] } }",
  'key with a template literal not possible; a string key with escape': "'plugin\\x73': [p],",
  'false positive: comment': '// no plugins: none here', 'false positive: identifier pluginsX': 'pluginsX: [],', 'false positive: myplugins': 'myplugins: [],',
};
const out = {};
for (const [name, text] of Object.entries(forms)) out[name] = re.test(text);
for (const path of process.argv.slice(3)) out[`matches in ${path}`] = (readFileSync(path, 'utf8').match(new RegExp(source, 'g')) ?? []).length;
console.log(JSON.stringify({ pattern: source, refused: out }, null, 1));
