// syzygy-bpyt.8.32: loaded with NODE_OPTIONS=--import into every vitest process, so process.getuid() answers 0 and a test's
// `isRoot` reads true. It grants no privilege: a mode-000 directory still refuses this user.
process.getuid = () => 0;
