// Repository-reading tests can depend on a declared path family even when their imports and literals do not name its files.
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import ts from 'typescript';

export const DOSSIER_CORPUS_MANIFEST = 'docs/polaris-generation/dossier-corpus-v1.json';
const DOSSIER_CORPUS_READER = 'packages/polaris-dossier/src/corpus.test.ts';
const DOSSIER_CORPUS_IMPLEMENTATION = 'packages/polaris-dossier/src/corpus.ts';
const DOSSIER_CORPUS_MODULE = DOSSIER_CORPUS_IMPLEMENTATION.slice(0, -3);
const DOSSIER_CORPUS_DIRECT_INPUTS = [DOSSIER_CORPUS_MANIFEST, 'docs/evidence/pursuit-2026-11-21b/measure-now.json'];
const MECHANISM_MEMBER = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*\*?[A-Za-z0-9._-]*$/u;

// Review both files' filesystem reads and path interpretation before refreshing either digest. They bind the
// exact tracked source bytes, including comments and layout. With unreviewed bytes the selector runs in full.
const REVIEWED_SOURCES = [
  [DOSSIER_CORPUS_READER, 'fa03f3127aea8142226cddcc6fe50657f4af400d3b138058016b4f9a82bd7584'],
  [DOSSIER_CORPUS_IMPLEMENTATION, '1ebebdb159f486643c26f5c51872fae1c76e15c4e198c6cf0c4f7c3326ce53c5'],
] as const;

export type ReaderInventory =
  | { readonly reader: string; readonly matches: (path: string) => boolean }
  | { readonly issue: string }
  | undefined;

function importsCorpus(source: ts.SourceFile): boolean {
  return source.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false;
    const name = statement.moduleSpecifier.text;
    if (!name.startsWith('.') || posix.join(posix.dirname(source.fileName), name).replace(/\.[jt]s$/u, '') !== DOSSIER_CORPUS_MODULE) {
      return false;
    }
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (!clause || clause.isTypeOnly || !bindings) return false;
    return ts.isNamespaceImport(bindings) || bindings.elements.some((binding) =>
      !binding.isTypeOnly && (binding.propertyName ?? binding.name).text === 'mechanismVersion');
  });
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function corpusPaths(value: unknown): ((path: string) => boolean) | undefined {
  const manifest = record(value);
  const mechanism = record(manifest?.['mechanismVersion']);
  const rows = mechanism?.['members'];
  const excluded = mechanism?.['excludeSuffixes'];
  if (manifest?.['format'] !== 'polaris-dossier-corpus/1' || mechanism?.['format'] !== 'polaris-dossier-mechanism/1' ||
      !Array.isArray(rows) || rows.length === 0 || !Array.isArray(excluded) ||
      !excluded.every((suffix): suffix is string => typeof suffix === 'string' && suffix.length > 0)) {
    return undefined;
  }

  const seen = new Set<string>();
  const members = new Set<string>();
  const wildcards: Array<{ directory: string; head: string; tail: string }> = [];
  for (const row of rows) {
    const member = record(row);
    const path = member?.['path'];
    const group = member?.['group'];
    if (typeof group !== 'string' || group.length === 0 || typeof path !== 'string' || seen.has(path) ||
        !MECHANISM_MEMBER.test(path) || path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
      return undefined;
    }
    const name = posix.basename(path);
    const directory = posix.dirname(path);
    const parts = name.split('*');
    seen.add(path);
    if (parts.length === 2) wildcards.push({ directory, head: parts[0]!, tail: parts[1]! });
    else members.add(path);
  }
  return (path) => {
    if (members.has(path) || DOSSIER_CORPUS_DIRECT_INPUTS.includes(path)) return true;
    const name = posix.basename(path);
    if (excluded.some((suffix) => name.endsWith(suffix))) return false;
    const directory = posix.dirname(path);
    return wildcards.some(({ directory: parent, head, tail }) =>
      directory === parent && name.length >= head.length + tail.length && name.startsWith(head) && name.endsWith(tail));
  };
}

/** Use the declared paths only while the reviewed reader and its path interpreter are still exact. */
export function dossierCorpusReaders(
  modules: ReadonlyMap<string, string>,
  readBlob: (path: string) => Uint8Array | undefined,
): ReaderInventory {
  for (const [name, contents] of modules) {
    if (name === DOSSIER_CORPUS_READER || !name.endsWith('.test.ts')) continue;
    const source = ts.createSourceFile(name, contents, ts.ScriptTarget.Latest);
    if (importsCorpus(source)) return { issue: `Unregistered dossier corpus test reader: ${name}` };
  }
  for (const [path, expectedDigest] of REVIEWED_SOURCES) {
    const blob = readBlob(path);
    if (!blob || createHash('sha256').update(blob).digest('hex') !== expectedDigest) {
      return { issue: `Tracked dossier corpus reader source drifted: ${path}` };
    }
  }
  try {
    const manifest = readBlob(DOSSIER_CORPUS_MANIFEST);
    if (manifest) {
      const matches = corpusPaths(JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(manifest)));
      if (matches) return { reader: DOSSIER_CORPUS_READER, matches };
    }
  } catch {
    // An invalid UTF-8 or JSON manifest cannot establish a bounded read set.
  }
  return { issue: 'Tracked dossier corpus reader manifest could not be read exactly' };
}
