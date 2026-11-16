// Hash-call tracer for syzygy-bpyt.6.3 (preloaded with NODE_OPTIONS=--require; committed beside the record).
//
// Wraps node:crypto createHash so every hash that is created, fed and finalised through it is recorded as
//   { alg, enc, inDigest, inLen, outDigest, site }
// where inDigest is the sha256 of the concatenated update() bytes (taken with the ORIGINAL createHash, so
// the tracer never records itself), outDigest is the sha256 of what digest() returned, and site is the first
// stack frame that is neither node internals, node_modules, this file, nor the shared helper
// (packages/support/src/{sha256,deep-freeze,index}.ts or its dist). Records append to
// $HASH_TRACE_DIR/<pid>.jsonl, one object per line, repo-relative paths from $HASH_TRACE_ROOT.
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const out = process.env.HASH_TRACE_DIR;
const root = (process.env.HASH_TRACE_ROOT || '').replace(/\/+$/, '') + '/';
if (!out) return;
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, `${process.pid}.jsonl`);
const original = crypto.createHash;
const HELPER = /packages\/support\/(src\/(sha256|deep-freeze|index)\.ts|dist\/)/;

function site() {
  const previous = Error.stackTraceLimit;
  Error.stackTraceLimit = 40;
  const stack = new Error().stack.split('\n').slice(1);
  Error.stackTraceLimit = previous;
  for (const line of stack) {
    const m = /\(?((?:file:\/\/)?\/[^():]+?):(\d+):\d+\)?$/.exec(line.trim());
    if (!m) continue;
    let f = m[1].replace(/^file:\/\//, '');
    if (f.startsWith('node:') || f.includes('/node_modules/') || f === __filename || HELPER.test(f)) continue;
    return f.startsWith(root) ? f.slice(root.length) : f;
  }
  return '<none>';
}

function traced(algorithm, options) {
  const real = original.call(crypto, algorithm, options);
  const where = site();
  const chunks = [];
  const record = { alg: String(algorithm).toLowerCase(), site: where };
  const wrap = new Proxy(real, {
    get(target, prop) {
      if (prop === 'update') {
        return (data, enc) => {
          const buf = typeof data === 'string' ? Buffer.from(data, enc || 'utf8') : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(data);
          chunks.push(buf);
          target.update(data, enc);
          return wrap;
        };
      }
      if (prop === 'digest') {
        return (enc) => {
          const result = target.digest(enc);
          const input = Buffer.concat(chunks);
          record.enc = enc === undefined ? 'buffer' : enc;
          record.inLen = input.length;
          record.inDigest = original.call(crypto, 'sha256').update(input).digest('hex');
          record.outDigest = original.call(crypto, 'sha256').update(result).digest('hex');
          fs.appendFileSync(file, JSON.stringify(record) + '\n');
          return result;
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return wrap;
}

crypto.createHash = traced;
try { require('node:module').syncBuiltinESMExports(); } catch {}
