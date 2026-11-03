// The package's one entry: the two command-line drivers the daemon dispatches to. Everything else is reached by an explicit subpath
// listed in `exports` and documented in `README.md` (syzygy-bpyt.8.6).
export { runDossierCli } from './cli.js';
export { runPolarisCli } from './polaris.js';
