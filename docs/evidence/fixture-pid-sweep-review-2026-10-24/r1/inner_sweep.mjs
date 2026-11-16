// Runs inside a new PID namespace: reports how the outer (live) pid looks from here, then sweeps.
// Usage: node inner_sweep.mjs <private-dir under /tmp/r509-> <built helper path> <outer pid>
const [dir, helperPath, outer] = process.argv.slice(2);
if (!dir?.startsWith('/tmp/r509-')) throw new Error(`refusing ${dir}`);
const { removeFixturesOfDeadProcesses } = await import(helperPath);
let seen;
try { process.kill(Number(outer), 0); seen = 'alive'; } catch (error) { seen = error.code; }
console.log(JSON.stringify({ innerPid: process.pid, outerPidSeenAs: seen }));
removeFixturesOfDeadProcesses(dir);
