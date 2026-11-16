// Reviewer probe for PR #538 item 4: the operator-reported record's digest, built by the base and the head builds over the
// same bytes, compared with each other and with coreutils `sha256sum` over a file holding the view's bytes (no node:crypto
// in the comparison). Inputs include the real CLI read path (readBoundedRegularFile: a subarray of a 4 MiB + 1 allocation),
// views with a non-zero byteOffset, a pooled Buffer, a SharedArrayBuffer view, a Uint8Array subclass and an empty array.
// Usage: node junit-crossbuild-probe.mjs <built base clone> <built head clone> <private tmpdir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [baseRoot, headRoot, tmp] = process.argv.slice(2);
mkdirSync(tmp, { recursive: true });
const load = (root) => import(pathToFileURL(join(root, 'packages/three-surface-poc-core/dist/index.js')).href);
const base = await load(baseRoot);
const head = await load(headRoot);

const XML = '<?xml version="1.0"?><testsuite name="r538" tests="2" failures="0" errors="0" skipped="0" time="0.1"><testcase name="é"/></testsuite>';
const xmlBytes = Buffer.from(XML, 'utf8');
const onDisk = join(tmp, 'junit.xml');
writeFileSync(onDisk, xmlBytes);
const sab = new SharedArrayBuffer(xmlBytes.length + 11);
new Uint8Array(sab).set(xmlBytes, 7);
class Sub extends Uint8Array {}
const wide = Buffer.concat([Buffer.alloc(31, 0x41), xmlBytes, Buffer.alloc(13, 0x42)]);
const CORPUS = [
  ['cli-read-path-readBoundedRegularFile', head.readBoundedRegularFile(onDisk)],
  ['pooled-small-buffer', Buffer.from('<testsuite tests="1">', 'utf8')],
  ['buffer-subarray-offset-31', wide.subarray(31, 31 + xmlBytes.length)],
  ['uint8array-view-offset-31', new Uint8Array(wide.buffer, wide.byteOffset + 31, xmlBytes.length)],
  ['shared-array-buffer-view-offset-7', new Uint8Array(sab, 7, xmlBytes.length)],
  ['uint8array-subclass', Sub.from(xmlBytes)],
  ['invalid-utf8-bytes', Buffer.concat([xmlBytes, Buffer.from([0xc3, 0x28, 0xff])])],
  ['empty-array', new Uint8Array(0)],
];
const input = (raw) => ({ rawJUnit: raw, command: ['pytest'], reportedExitCode: 0, ingestedAt: '2026-10-27T00:00:00Z', repositoryCommit: 'b'.repeat(40), scope: 'x' });
let bad = 0;
for (const [id, raw] of CORPUS) {
  const a = base.buildOperatorReportedTestArtifactRecord(input(raw));
  const b = head.buildOperatorReportedTestArtifactRecord(input(raw));
  const file = join(tmp, `${id}.bin`);
  writeFileSync(file, Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
  const coreutils = `sha256:${execFileSync('sha256sum', [file], { encoding: 'utf8' }).split(' ')[0]}`;
  const same = JSON.stringify(a) === JSON.stringify(b);
  const digest = b.kind === 'built' ? b.record.digest : null;
  const oracleOk = digest === null ? null : digest === coreutils;
  if (!same || oracleOk === false) bad += 1;
  console.log(JSON.stringify({ id, byteOffset: raw.byteOffset, byteLength: raw.byteLength, backing: raw.buffer.byteLength, kind: b.kind, baseEqualsHead: same, headDigestEqualsSha256sum: oracleOk }));
}
console.log(JSON.stringify({ rows: CORPUS.length, bad }));
process.exitCode = bad === 0 ? 0 : 1;
