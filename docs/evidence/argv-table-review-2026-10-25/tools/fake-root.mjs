// rev-521: my own copy of the simulated-root shim, loaded with NODE_OPTIONS=--import. It answers getuid() with 0 and grants nothing.
process.getuid = () => 0;
