// Run under scratch_trace.cjs with a private TMPDIR: each line creates one top-level entry by an API the tracer may not wrap.
// The caller compares the listing with the trace. Named ESM imports from node:fs are used on purpose (the repo's dominant form).
import { appendFileSync, closeSync, copyFileSync, cpSync, createWriteStream, linkSync, mkdirSync, mkdtempSync, openSync, renameSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { open as openP } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = tmpdir();
mkdtempSync(join(t, 'bs-named-mkdtemp-'));                         // control: wrapped, named import
mkdirSync(join(t, 'bs-recursive-parent', 'child'), { recursive: true }); // top-level parent made by a nested recursive mkdir
appendFileSync(join(t, 'bs-append.txt'), 'x');
closeSync(openSync(join(t, 'bs-open.txt'), 'wx'));
await (await openP(join(t, 'bs-open-promise.txt'), 'w')).close();
copyFileSync(join(t, 'bs-append.txt'), join(t, 'bs-copy.txt'));
cpSync(join(t, 'bs-recursive-parent'), join(t, 'bs-cp-dir'), { recursive: true });
linkSync(join(t, 'bs-append.txt'), join(t, 'bs-hardlink.txt'));
writeFileSync(join(t, 'bs-recursive-parent', 'child', 'inner'), 'x');
renameSync(join(t, 'bs-recursive-parent', 'child', 'inner'), join(t, 'bs-renamed.txt'));
await new Promise((resolve) => { const s = createWriteStream(join(t, 'bs-stream.txt')); s.end('x', resolve); });
if (typeof fs.mkdtempDisposableSync === 'function') fs.mkdtempDisposableSync(join(t, 'bs-disposable-'));
execFileSync('/bin/sh', ['-c', 'mktemp -d "$TMPDIR/bs-shell-XXXXXX" >/dev/null']);
execFileSync('python3', ['-I', '-c', 'import tempfile; tempfile.mkdtemp(prefix="bs-python-")']);
