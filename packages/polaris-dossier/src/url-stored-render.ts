import path from 'node:path';
import { encodeCanonicalJson, isDossierPagePath } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import { RUN_LAYOUT } from './state-directory.js';
import type { UrlDesignProductMetadata } from './url-design-product.js';
import { sameProductFile, sameProductPath, snapshotProductFile, snapshotProductNames } from './url-product-reads.js';

const MAX_FILES = 4096;
const MAX_BYTES = 2_097_152;
const OUTPUT_JSON_LIMITS = { maxBytes: MAX_BYTES, maxNodes: 65_536, maxDepth: 32 };

/** Check live authority around one bounded synchronous host read. Descriptor
 * checkpoints sample the same deadline throughout the walk. */
export function readStoredUrlRenderWithAuthority<T>(
  deadline: number, authorityCurrent: () => boolean, read: (withinDeadline: () => boolean) => T | null,
): T | null {
  const withinDeadline = (): boolean => Date.now() < deadline;
  try {
    if (!withinDeadline() || authorityCurrent() !== true || !withinDeadline()) return null;
    const result = read(withinDeadline);
    if (result === null || !withinDeadline() || authorityCurrent() !== true || !withinDeadline()) return null;
    return result;
  } catch { return null; }
}

/** Recover descriptive output metadata only. The independently retained digest
 * binds this census; it does not restore a renderer receipt or delivery grant. */
export function readStoredUrlRenderOutput(
  run: string, site: number, expectedSha256: string, current: () => boolean,
): UrlDesignProductMetadata['output'] | null {
  try {
    if (!Number.isSafeInteger(site) || site < 0 || site > 999_999 || typeof expectedSha256 !== 'string'
      || !/^[a-f0-9]{64}$/u.test(expectedSha256)) return null;
    let available = true;
    const check = (): void => {
      available = available && current() === true;
      if (!available) throw new Error('url-stored-render-unavailable');
    };
    const relative = `${RUN_LAYOUT.site}/${site}`;
    const directories: { name: string; captured: ReturnType<typeof snapshotProductNames> }[] = [];
    const files: { name: string; snapshot: ReturnType<typeof snapshotProductFile> }[] = [];
    const population: { path: string; sha256: string; bytes: number }[] = [];
    let bytes = 0, pages = 0, entries = 0;
    const captureDirectory = (name: string) => {
      const captured = snapshotProductNames(run, name, MAX_FILES, check);
      // Empty directories cannot be represented by the admitted file population.
      // Bound directory/entry work as well as file bodies during discovery.
      if (captured.missingAt !== null || captured.names.length === 0 || directories.length >= MAX_FILES
        || entries + captured.names.length > MAX_FILES * 2) throw new Error('url-stored-render-unavailable');
      entries += captured.names.length;
      return { name, captured };
    };
    directories.push(captureDirectory(relative));
    for (let i = 0; i < directories.length; i++) {
      const directory = directories[i]!;
      for (const entry of directory.captured.names) {
        check();
        const name = `${directory.name}/${entry}`, file = name.slice(relative.length + 1);
        if (!isDossierPagePath(file)) return null;
        let child: ReturnType<typeof captureDirectory> | null = null;
        // A directory may itself have an html/json suffix. Descriptor opens,
        // rather than extensions, distinguish directories from regular files.
        try { child = captureDirectory(name); } catch { /* try a bounded regular file below */ }
        if (child !== null) { directories.push(child); continue; }
        if (!/\.(?:html|json)$/u.test(file) || files.length >= MAX_FILES || bytes >= MAX_BYTES) return null;
        const snapshot = snapshotProductFile(run, name, MAX_BYTES - bytes, check);
        if (snapshot.bytes === null) return null;
        bytes += snapshot.bytes.length;
        if (file.endsWith('.html')) pages++;
        files.push({ name, snapshot });
        population.push({ path: file, sha256: sha256(snapshot.bytes), bytes: snapshot.bytes.length });
      }
    }
    population.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const output = deepFreeze({ files: population.length, pages, bytes, population });
    if (sha256(encodeCanonicalJson(output, OUTPUT_JSON_LIMITS)) !== expectedSha256
      || files.some(file => !sameProductFile(file.snapshot, snapshotProductFile(run, file.name, file.snapshot.bytes!.length, check)))
      || directories.some(directory => {
        const next = snapshotProductNames(run, directory.name, MAX_FILES, check);
        return !sameProductPath(directory.captured, next) || directory.captured.names.length !== next.names.length
          || directory.captured.names.some((name, i) => name !== next.names[i]);
      }) || checkStoredUrlRender(run, path.join(run, RUN_LAYOUT.site, String(site)), output, current) !== site) return null;
    check();
    return output;
  } catch { return null; }
}

/** Recheck the installed renderer's admitted site under the exact directory
 * reported by the writer. The result is local evidence, not a delivery grant. */
export function checkStoredUrlRender(
  run: string, reportPath: string, expected: UrlDesignProductMetadata['output'], current: () => boolean,
): number | null {
  try {
    const site = path.basename(reportPath), number = Number(site);
    if (!/^(?:0|[1-9][0-9]*)$/u.test(site) || !Number.isSafeInteger(number) || number > 999_999
      || reportPath !== path.join(run, RUN_LAYOUT.site, site)
      || expected.population.length !== expected.files || expected.files < 1 || expected.files > MAX_FILES
      || !Number.isSafeInteger(expected.bytes) || expected.bytes < 1 || expected.bytes > MAX_BYTES) return null;
    const check = (): void => { if (current() !== true) throw new Error('url-stored-render-unavailable'); };
    const relative = `${RUN_LAYOUT.site}/${site}`;
    const names = new Map<string, Set<string>>([[relative, new Set()]]);
    const seen = new Set<string>();
    let bytes = 0, pages = 0;
    for (const file of expected.population) {
      check();
      if (!isDossierPagePath(file.path) || !/\.(?:html|json)$/u.test(file.path) || seen.has(file.path)
        || !Number.isSafeInteger(file.bytes) || file.bytes < 1 || !/^[a-f0-9]{64}$/u.test(file.sha256)) return null;
      seen.add(file.path);
      bytes += file.bytes;
      if (bytes > expected.bytes) return null;
      if (file.path.endsWith('.html')) pages++;
      let parent = relative;
      for (const part of file.path.split('/')) {
        if (!names.has(parent)) names.set(parent, new Set());
        names.get(parent)!.add(part);
        parent += `/${part}`;
      }
    }
    if (bytes !== expected.bytes || pages !== expected.pages) return null;

    const readNames = (directory: string, expectedNames: ReadonlySet<string>) => {
      const captured = snapshotProductNames(run, directory, Math.max(1, expectedNames.size), check);
      if (captured.missingAt !== null || captured.names.length !== expectedNames.size || captured.names.some(name => !expectedNames.has(name)))
        throw new Error('url-stored-render-unavailable');
      return captured;
    };
    const directories = [...names].map(([directory, expectedNames]) => ({ directory, expectedNames, captured: readNames(directory, expectedNames) }));
    const files = expected.population.map(file => {
      const name = `${relative}/${file.path}`;
      const snapshot = snapshotProductFile(run, name, file.bytes, check);
      if (snapshot.bytes === null || snapshot.bytes.length !== file.bytes || sha256(snapshot.bytes) !== file.sha256)
        throw new Error('url-stored-render-unavailable');
      return { name, snapshot, bytes: file.bytes };
    });
    if (files.some(file => !sameProductFile(file.snapshot, snapshotProductFile(run, file.name, file.bytes, check)))
      || directories.some(item => !sameProductPath(item.captured, readNames(item.directory, item.expectedNames)))) return null;
    check();
    return number;
  } catch { return null; }
}
