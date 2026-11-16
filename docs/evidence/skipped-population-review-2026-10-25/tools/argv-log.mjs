import { appendFileSync } from 'node:fs';
appendFileSync(process.env.R527_ARGV_LOG, JSON.stringify({ pid: process.pid, ppid: process.ppid, argv: process.argv.slice(0, 4) }) + '\n');
