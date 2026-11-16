// Internal helpers that more than one workspace package needs and that have
// one meaning everywhere (syzygy-bpyt.6.3). The package depends on nothing in
// the workspace: the import graph has two leaves that cannot import each other
// (`@syzygy/cap1-core` and `@syzygy/polaris-generation-core`), and the helpers
// are needed on both sides of the Polaris generation kit's boundary, so they
// sit below both. Pure: no file, process or clock.
export { sha256 } from './sha256.js';
export { deepFreeze } from './deep-freeze.js';
export { decodeUtf8 } from './decode-utf8.js';
export { isRecord } from './is-record.js';
