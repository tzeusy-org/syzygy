// Independent native parser observation for the constructed corpus, not a replica of clean_build's admission predicate.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const diagnostic = ({ code, category, messageText }) => ({ code, category, messageText,
  text: ts.flattenDiagnosticMessageText(messageText, '\n') });
const rows = process.argv.slice(2).map((path) => {
  const unrecoverable = [];
  try {
    const parsed = ts.getParsedCommandLineOfConfigFile(resolve(path), undefined,
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (error) => unrecoverable.push(diagnostic(error)) });
    return { path, defined: parsed !== undefined, unrecoverable, errors: parsed?.errors.map(diagnostic) ?? null };
  } catch (error) {
    return { path, unrecoverable, thrown: { name: error.name, message: error.message } };
  }
});
console.log(JSON.stringify({ typescript: ts.version, rows }));
