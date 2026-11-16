// What the exact-object reader does with a CRLF blob holding a 150,000-line closed fence, at base and head.
// Usage: node big-fence-reader-probe.mjs <base dist> <head dist>
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [b, h] = process.argv.slice(2);
const sha1Blob = (bytes) => createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
for (const [which, dist] of [['base', b], ['head', h]]) {
  const core = await import(pathToFileURL(join(dist, 'index.js')).href);
  const end = String.fromCharCode(13, 10);
  const text = '# Log' + end + '```' + end + 'x'.concat(end).repeat(150000) + '```' + end;
  const bytes = new TextEncoder().encode(text);
  const oid = sha1Blob(bytes);
  const entry = { mode: '100644', type: 'blob', objectId: oid, sizeBytes: bytes.byteLength, path: 'notes/log.md' };
  const reader = core.createExactObjectReader({ runGit: () => bytes, tree: core.indexGitTree([entry]), resourceLimits: core.PWB_RESOURCE_LIMITS });
  let out;
  try { const r = reader.read('notes/log.md'); out = `${r.kind} ${r.record.outcome}`; } catch (e) { out = `THROWS ${e.constructor.name}: ${e.message}`; }
  console.log(JSON.stringify({ build: which, bytes: bytes.byteLength, maxBytesPerSource: core.PWB_RESOURCE_LIMITS.maxBytesPerSource, out }));
}
