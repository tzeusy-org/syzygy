// Which allowlist names the support package's product modules use, read from a commit (not the working tree).
// Usage: node used_names.mjs <clone> <commit>
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const [clone, commit] = process.argv.slice(2);
const ts = createRequire(join(clone, 'package.json'))('typescript');
const git = (...args) => execFileSync('git', ['-C', clone, ...args], { encoding: 'utf8' });

function identifiersOf(name, source) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false));
  return [...names].sort();
}

const test = git('show', `${commit}:packages/support/src/support-purity.test.ts`);
const list = [...test.match(/ALLOWED_IDENTIFIERS = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
const files = git('ls-tree', '-r', '-z', '--name-only', commit, 'packages/support/src/').split('\0').filter(Boolean)
  .filter((p) => /\.[cm]?[jt]sx?$/u.test(p) && !p.endsWith('.test.ts') && !p.endsWith('/purity.testkit.ts'));
const used = new Map();
for (const file of files) for (const name of identifiersOf(file, git('show', `${commit}:${file}`))) used.set(name, [...(used.get(name) ?? []), file.replace('packages/support/src/', '')]);
console.log(JSON.stringify({
  commit, files, listCount: list.length, usedCount: used.size,
  unusedOnList: list.filter((n) => !used.has(n)), usedNotOnList: [...used.keys()].filter((n) => !list.includes(n)),
  usedBy: Object.fromEntries([...used].sort()),
}, null, 1));
