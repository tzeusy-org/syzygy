// rev-527: getuid() -> 0 in vitest workers (tinypool's entry) and the argv-less `node -e` collection child only.
const entry = process.argv[1];
if (entry === undefined || entry.endsWith('/tinypool/dist/entry/process.js')) process.getuid = () => 0;
