'use strict';
// Preload (`node --require`, via NODE_OPTIONS) that logs every entry a process creates directly in its own temp directory.
//
// Environment: SCRATCH_TRACE_LOG (absolute path of a JSON-lines file; no log is written without it) and SCRATCH_TRACE_ROOT
// (the repository root; a stack frame under it, outside node_modules, names the creating module).
//
// It wraps fs.mkdtemp, fs.mkdtempSync, fs.promises.mkdtemp, fs.mkdir, fs.mkdirSync, fs.promises.mkdir, fs.writeFile,
// fs.writeFileSync, fs.promises.writeFile, fs.symlink and fs.symlinkSync, calls the original unchanged, and appends one line
// per call whose created entry sits directly in os.tmpdir() as read at call time: { t, pid, kind, path, prefix (mkdtemp only),
// frames: up to six frames under SCRATCH_TRACE_ROOT, innermost first }. It changes no argument, result or error, and a logging
// failure is swallowed. It sees only Node processes that inherit NODE_OPTIONS: a child Python, a browser or git makes entries it
// cannot see (they appear in the sampler's listing without a trace line).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const log = process.env.SCRATCH_TRACE_LOG;
const root = process.env.SCRATCH_TRACE_ROOT;
if (log && root) {
  const append = fs.appendFileSync.bind(fs);
  const here = __filename;
  const frames = () => {
    const holder = {};
    Error.captureStackTrace(holder);
    const found = [];
    for (const line of String(holder.stack).split('\n').slice(1)) {
      const match = /\(?((?:file:\/\/)?\/[^():]+?)(?::(\d+))?(?::(\d+))?\)?$/.exec(line.trim());
      if (!match) continue;
      let file = match[1].replace(/^file:\/\//, '');
      try { file = decodeURIComponent(file); } catch { /* keep as is */ }
      if (file === here || file.includes('/node_modules/') || file.startsWith('node:') || !file.startsWith(root + '/')) continue;
      found.push(`${file.slice(root.length + 1)}:${match[2] ?? ''}`);
      if (found.length === 6) break;
    }
    return found;
  };
  const inTmp = (candidate) => {
    try {
      const resolved = path.resolve(String(candidate));
      return path.dirname(resolved) === path.resolve(os.tmpdir()) ? resolved : undefined;
    } catch { return undefined; }
  };
  const note = (kind, created, extra) => {
    try {
      const resolved = inTmp(created);
      if (resolved) append(log, JSON.stringify({ t: Date.now(), pid: process.pid, kind, path: resolved, ...extra, frames: frames() }) + '\n');
    } catch { /* tracing must never fail the traced process */ }
  };
  const prefixOf = (argument) => path.basename(String(argument));
  const wrapSync = (owner, name, kind, pick) => {
    const original = owner[name];
    if (typeof original !== 'function') return;
    owner[name] = function (...args) {
      const result = original.apply(this, args);
      note(kind, pick(args, result), kind === 'mkdtemp' ? { prefix: prefixOf(args[0]) } : {});
      return result;
    };
  };
  const wrapCallback = (owner, name, kind, pick) => {
    const original = owner[name];
    if (typeof original !== 'function') return;
    owner[name] = function (...args) {
      const last = args.length - 1;
      if (typeof args[last] === 'function') {
        const done = args[last];
        const prefix = kind === 'mkdtemp' ? { prefix: prefixOf(args[0]) } : {};
        const where = frames();
        args[last] = function (error, result, ...rest) {
          if (!error) note(kind, pick(args, result), { ...prefix, calledFrom: where });
          return done.call(this, error, result, ...rest);
        };
      }
      return original.apply(this, args);
    };
  };
  const wrapPromise = (owner, name, kind, pick) => {
    const original = owner[name];
    if (typeof original !== 'function') return;
    owner[name] = function (...args) {
      const where = frames();
      return original.apply(this, args).then((result) => {
        note(kind, pick(args, result), { ...(kind === 'mkdtemp' ? { prefix: prefixOf(args[0]) } : {}), calledFrom: where });
        return result;
      });
    };
  };
  const created = { mkdtemp: (args, result) => result, path: (args) => args[0], link: (args) => args[1] };
  for (const [name, kind, pick] of [['mkdtempSync', 'mkdtemp', created.mkdtemp], ['mkdirSync', 'mkdir', created.path], ['writeFileSync', 'writeFile', created.path], ['symlinkSync', 'symlink', created.link]]) wrapSync(fs, name, kind, pick);
  for (const [name, kind, pick] of [['mkdtemp', 'mkdtemp', created.mkdtemp], ['mkdir', 'mkdir', created.path], ['writeFile', 'writeFile', created.path], ['symlink', 'symlink', created.link]]) wrapCallback(fs, name, kind, pick);
  for (const [name, kind, pick] of [['mkdtemp', 'mkdtemp', created.mkdtemp], ['mkdir', 'mkdir', created.path], ['writeFile', 'writeFile', created.path], ['symlink', 'symlink', created.link]]) wrapPromise(fs.promises, name, kind, pick);
}
