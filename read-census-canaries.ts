// syzygy-qu5j: one tracked file per read route the census records. `apps/three-surface-poc/src/read-census.test.ts` reads
// each through its route, and `scripts/check_read_census.mjs` fails a census that has that test's line but lost a route.
export const CANARY_TEST = 'apps/three-surface-poc/src/read-census.test.ts';
const DIR = 'apps/three-surface-poc/src/fixtures/read-census-canaries';
export const CANARIES = {
  readFileSync: `${DIR}/readFileSync.txt`,
  readFile: `${DIR}/readFile.txt`,
  'promises.readFile': `${DIR}/promises.readFile.txt`,
  createReadStream: `${DIR}/createReadStream.txt`,
  openSync: `${DIR}/openSync.txt`,
  'promises.open': `${DIR}/promises.open.txt`,
  copyFileSync: `${DIR}/copyFileSync.txt`,
  'promises.copyFile': `${DIR}/promises.copyFile.txt`,
  cpSync: `${DIR}/cpSync.txt`,
  openAsBlob: `${DIR}/openAsBlob.txt`,
} as const;
