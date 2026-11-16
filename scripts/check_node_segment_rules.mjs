// Pins the export-entry reader's segment rules (workspace-reach.testkit.ts, syzygy-bpyt.70) against the Node that runs it. The
// node-ci workflow runs it under the job's own Node, which floats within 24.x (syzygy-bpyt.76, the PR 557 round-1 review's N4).
//
//   node scripts/check_node_segment_rules.mjs
//
// A copy of docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs, which stays unedited since syzygy-bpyt-70/record.json names its
// sha256. The copy differs in four places: it runs from scripts/, it writes no record, it prints each mismatched row, and it
// fails with exit 2 and says why when it cannot read the Node source it checks against (below), where the original crashed or
// counted a mismatch.
//
// 1. The two regexes the reader copies must equal, source and flags, the ones in Node's own
//    lib/internal/modules/esm/resolve.js, read from the running binary.
// 2. For each target in the test's case rows, a scratch package exports it under `import`, and a child `node` imports the
//    package. Node's outcome (ERR_INVALID_PACKAGE_TARGET: refuses; DEP0166 on stderr: warns, that is, accepts with the
//    warning, and `then` records whether the target then loads or which error its load fails with; else loads) must equal the
//    reader's and the test's. The file the target names is created first, so a target Node accepts loads.
// Exit 1 on any mismatch, exit 2 when Node's source cannot be read.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const kitFile = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts';
const kit = await import(join(root, kitFile));

// The case rows of workspace-reach.test.ts, read from its source so that each recorded expectation is the test's own.
const testFile = 'packages/polaris-generation-core/src/workspace-reach.test.ts';
const testSource = readFileSync(join(root, testFile), 'utf8');
const block = testSource.slice(testSource.indexOf('const CASES'), testSource.indexOf('];', testSource.indexOf('const CASES')));
const CASES = [...block.matchAll(/\['((?:[^'\\]|\\.)*)', '(loads|refuses|warns)'\]/g)].map((match) => [match[1].replace(/\\(.)/g, '$1'), match[2]]);
if (CASES.length !== (block.match(/\['/g) ?? []).length || CASES.length === 0) throw new Error(`${testFile}: unreadable CASES`);

// Node's own source of the module, read through process.binding('natives'), a deprecated internal (DEP0111). A Node that removes
// it, or no longer ships the module or either literal under its name, leaves nothing to pin against: that fails, never passes.
const unreadable = (why) => {
  process.stderr.write(`check_node_segment_rules: cannot read the segment rules of Node ${process.version} (${why}), so the copies in ${kitFile} `
    + 'cannot be checked against this Node; find another way to read its lib/internal/modules/esm/resolve.js before this step can pass\n');
  process.exit(2);
};
let nodeSource;
try {
  nodeSource = process.binding('natives')['internal/modules/esm/resolve'];
} catch (error) {
  unreadable(`process.binding('natives') threw: ${error instanceof Error ? error.message : String(error)}`);
}
if (typeof nodeSource !== 'string') unreadable("process.binding('natives') holds no internal/modules/esm/resolve source");
const literal = (name) => {
  const line = nodeSource.split('\n').find((text) => text.startsWith(`const ${name} = `));
  if (line === undefined) unreadable(`internal/modules/esm/resolve has no line starting "const ${name} = "`);
  return line.slice(`const ${name} = `.length).replace(/;$/, '');
};
const regexes = [['invalidSegmentRegEx', kit.INVALID_SEGMENT], ['deprecatedInvalidSegmentRegEx', kit.REFUSED_SEGMENT]].map(([name, copy]) => {
  const node = literal(name);
  return { node: name, nodeLiteral: node, copy: String(copy), equal: node === String(copy) };
});

const readerOutcome = (target) => {
  const fault = kit.segmentFaultOf({ import: target }, false);
  if (fault === undefined) return 'loads';
  if (fault.endsWith('which Node refuses (ERR_INVALID_PACKAGE_TARGET)')) return 'refuses';
  if (fault.endsWith('which Node accepts with a deprecation warning (DEP0166)')) return 'warns';
  return fault;
};

const scratch = mkdtempSync(join(tmpdir(), 'node-segments-'));
const cases = [];
try {
  CASES.forEach(([target, expected], index) => {
    const dir = join(scratch, String(index));
    const pkg = join(dir, 'node_modules', 'pkg');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'pkg', type: 'module', exports: { '.': { import: target } } }));
    // The file a loading target names, as Node joins it (empty segments collapse; `.hidden`, `..x` stay). A target ending in `/`
    // names a directory: it gets an index.js, which Node still does not load.
    const file = join(pkg, target.replace(/\/+/g, '/'), target.endsWith('/') ? 'index.js' : '');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, 'export default "loaded";\n');
    // The probe catches a failed import and prints its code, so the process lives long enough to print a deprecation warning.
    writeFileSync(join(dir, 'probe.mjs'),
      "try {\n  process.stdout.write(String((await import('pkg')).default));\n} catch (error) {\n  process.stdout.write(`error ${error.code}`);\n}\n");
    const run = spawnSync(process.execPath, ['probe.mjs'], { cwd: dir, encoding: 'utf8' });
    const stderr = run.stderr.split('\n').filter((line) => line.trim() !== '');
    const loaded = run.status === 0 && run.stdout === 'loaded';
    // What follows Node's resolution: the target loads, or the error the load fails with.
    const then = loaded ? 'loads' : run.status === 0 && run.stdout.startsWith('error ') ? run.stdout.slice('error '.length) : 'unknown';
    const warned = stderr.some((line) => line.includes('DEP0166'));
    const node = then === 'ERR_INVALID_PACKAGE_TARGET' ? 'refuses'
      : warned ? 'warns'
      : loaded && stderr.length === 0 ? 'loads' : 'other';
    const reader = readerOutcome(target);
    cases.push({ target, node, then, reader, test: expected, equal: node === reader && node === expected, status: run.status, stderr: stderr.slice(0, 2).map((line) => line.slice(0, 200)) });
  });
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const record = {
  subject: kitFile,
  subjectSha256: createHash('sha256').update(readFileSync(join(root, kitFile))).digest('hex'),
  casesFrom: testFile,
  casesFromSha256: createHash('sha256').update(testSource).digest('hex'),
  node: process.version,
  nodeFile: 'lib/internal/modules/esm/resolve.js',
  regexes,
  cases,
  mismatches: regexes.filter((row) => !row.equal).length + cases.filter((row) => !row.equal).length,
};
process.stdout.write(`${record.node} regexes ${regexes.map((row) => row.equal).join(' ')} cases ${cases.filter((row) => row.equal).length}/${cases.length} mismatches ${record.mismatches}\n`);
for (const row of regexes.filter((row) => !row.equal)) process.stdout.write(`mismatch: ${row.node} is ${row.nodeLiteral} in Node, ${row.copy} in ${kitFile}\n`);
for (const row of cases.filter((row) => !row.equal)) process.stdout.write(`mismatch: ${JSON.stringify(row.target)} Node ${row.node} (then ${row.then}), reader ${row.reader}, test ${row.test}\n`);
process.exit(record.mismatches === 0 ? 0 : 1);
