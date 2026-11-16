// Reviewer's byte check (R-GP-IMPL-SPREAD-LOOPS-1): the VISION fixture of project-shape-model.test.ts at the reviewed commit, with the
// lane's success-list replacement, measured as UTF-16 length and as UTF-8 bytes. Usage: node bytes-check.mjs <project-shape-model.test.ts>
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const m = /const VISION = \[([\s\S]*?)\]\.join\('\\n'\);/.exec(src);
const VISION = eval(`[${m[1]}]`).join('\n');
for (const n of [100000, 125000, 130000, 200000]) {
  const section = ['## What Success Looks Like', '', ...Array.from({ length: n }, () => '- x'), ''].join('\n');
  const v = VISION.replace(/## What Success Looks Like[\s\S]*?(?=## What Butlers Is Not)/, `${section}\n`);
  console.log(JSON.stringify({ bullets: n, utf16Length: v.length, utf8Bytes: Buffer.byteLength(v) }));
}
