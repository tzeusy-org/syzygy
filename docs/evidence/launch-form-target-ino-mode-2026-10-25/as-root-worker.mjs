// syzygy-bpyt.8.35, after the PR 525 review's N4: loaded with NODE_OPTIONS=--import into every node process vitest starts, so
// process.getuid() answers 0 and the test's `isRoot` reads true. The syzygy CLI is left alone: its daemon reads getuid for the
// credential owner check (packages/cap1-daemon/src/credentials.ts:303). It grants no privilege. launched.test.ts starts no node child.
if (!(process.argv[1] ?? '').endsWith('apps/syzygy/dist/main.js')) process.getuid = () => 0;
