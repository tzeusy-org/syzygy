import path from 'node:path';
import { isDossierPagePath } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { RUN_LAYOUT } from './state-directory.js';
import type { UrlDesignProductMetadata } from './url-design-product.js';
import { sameProductFile, sameProductPath, snapshotProductFile, snapshotProductNames } from './url-product-reads.js';

const MAX_FILES = 4096;
const MAX_BYTES = 2_097_152;

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
