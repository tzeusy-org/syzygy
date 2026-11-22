// Recorded mutation run over the five infrastructure recognizers, the manifest driver's infrastructure-recognizer predicates and the site's infrastructure
// map and coverage remainder (REQ-polaris-generation-034, infrastructure recognizers, syzygy-3efd.26).
// Usage: node infra_recognizers_mutation.mjs <worktree> <out.json> <scratch-dir>
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
// Mutant ids are prefixed by the unit they mutate: compose-, kubernetes-, terraform-, makefile-, cmake-, yaml-, driver-, site-.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out, scratch] = process.argv.slice(2);
if (!root || !out || !scratch) throw new Error('usage: node infra_recognizers_mutation.mjs <worktree> <out.json> <scratch-dir>');
fs.mkdirSync(scratch, { recursive: true });

const TESTS = [
  'packages/polaris-dossier/src/manifest-infra-recognizers.test.ts',
  'packages/polaris-dossier/src/manifest-infra-facts.test.ts',
  'packages/polaris-dossier/src/manifest-facts.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-infrastructure-map.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-computed-maps.test.ts',
];
const TIMEOUT_MS = 300_000;

const D = 'packages/polaris-dossier/src/';
const C = `${D}manifest-compose.ts`, K = `${D}manifest-kubernetes.ts`, T = `${D}manifest-terraform.ts`, M = `${D}manifest-make.ts`, X = `${D}manifest-cmake.ts`;
const Y = `${D}manifest-yaml.ts`, F = `${D}manifest-facts.ts`;
const S = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';

const MUTANTS = [
  ['compose-basename-dropped', C, "'compose.override.yaml', ", ''],
  ['compose-workflow-not-excluded', C, 'isComposeBasename(path) && !isWorkflowPath(path)', 'isComposeBasename(path)'],
  ['compose-no-service-fact', C, "walk.add('service', entry.lines, service);", ''],
  ['compose-image-not-read', C, "walk.add('service-image', image.lines, service, image.value.value)", 'void 0'],
  ['compose-integer-port-dropped', C, "if (node.kind === 'other' && node.int !== undefined) return node.int;", ''],
  ['compose-published-order', C, '`${publishedText}:${targetText}`', '`${targetText}:${publishedText}`'],
  ['compose-missing-target-accepted', C, 'if (target === undefined) { walk.fieldType = true; continue; }', 'if (target === undefined) continue;'],
  ['compose-depends-map-dropped', C, "for (const dependency of value.entries) { const to = walk.keyOf(dependency.key); if (to !== undefined) walk.add('service-depends-on', dependency.lines, service, to); }", ''],
  ['compose-depends-on-not-read', C, "|| (p.length === 3 && p[0] === 'services' && p[2] === 'depends_on')", ''],
  ['kubernetes-directory-dropped', K, "'kustomize'", "'kustomise'"],
  ['kubernetes-templates-kept', K, "|| directories.includes('templates')", ''],
  ['kubernetes-compose-kept', K, '&& !isComposeBasename(path)', ''],
  ['kubernetes-single-document', K, 'readYaml(text, true)', 'readYaml(text)'],
  ['kubernetes-null-name-empty', K, 'let name: string | null = null;', "let name: string | null = '';"],
  ['kubernetes-metadata-not-read', K, "(p.length === 1 && p[0] === 'metadata')", 'false'],
  ['kubernetes-missing-apiversion-taken', K, "if (apiVersion === undefined || kind === undefined) continue;\n    const apiOk = walk.is(apiVersion.value, 'string');", "if (kind === undefined) continue;\n    const apiOk = apiVersion === undefined || walk.is(apiVersion.value, 'string');"],
  ['terraform-tfvars-matched', T, '/^.+\\.tf$/u', '/^.+\\.tf(?:vars)?$/u'],
  ['terraform-depth-unbounded', T, 'if (depth > MAX_DEPTH) beyond = true;', ''],
  ['terraform-depth-off-by-one', T, 'depth > MAX_DEPTH', 'depth >= MAX_DEPTH'],
  ['terraform-module-duplicate-syntax', T, "if (body.block?.type === 'module') duplicateKey = true; else fail();", 'fail();'],
  ['terraform-resource-labels', T, 'if (block.labels.length !== 2) { fieldType = true; return; }', 'if (block.labels.length < 2) { fieldType = true; return; }'],
  ['terraform-module-template-source', T, 'if (block.labels.length !== 1 || block.source?.literal === undefined)', "if (block.labels.length !== 1 || block.source === undefined)"],
  ['terraform-escape-dollar', T, "if ((c === '$' || c === '%') && text[i + 1] === c && text[i + 2] === '{') { out += `${c}{`; i += 3; continue; }", ''],
  ['terraform-heredoc-untrimmed', T, 'if (line.trim() === id) return;', 'if (line === id) return;'],
  ['terraform-slash-comment', T, "if (c === '#' || (c === '/' && text[i + 1] === '/'))", "if (c === '#')"],
  ['terraform-fault-order', T, "if (fieldType) return { ok: false, parseFault: 'field-type' };", "if (fieldType && !beyond) return { ok: false, parseFault: 'field-type' };"],
  ['makefile-basename', M, "'GNUmakefile'", "'GNUMakefile'"],
  ['makefile-recipe-read', M, "if (physical.startsWith('\\t')) {", 'if (false) {'],
  ['makefile-stray-tab-accepted', M, 'if (!inRecipe) syntax = true;', ''],
  ['makefile-conditional-ends-recipe', M, 'if (!CONDITIONAL_DIRECTIVES.includes(firstWord(content))) inRecipe = false;', 'inRecipe = false;'],
  ['makefile-else-ends-recipe', M, "const CONDITIONAL_DIRECTIVES = [...CONDITIONALS, 'else', 'endif'];", "const CONDITIONAL_DIRECTIVES = [...CONDITIONALS, 'endif'];"],
  ['makefile-pattern-target', M, '/[%$]/u.test(target) || ', ''],
  ['makefile-special-target', M, "|| (target.startsWith('.') && !target.includes('/'))", ''],
  ['makefile-not-distinct', M, 'if (seen.has(target)) continue;', ''],
  ['makefile-target-specific', M, 'if (tail.op >= 0) continue;', ''],
  ['makefile-recipeprefix', M, "if (name === '.RECIPEPREFIX') beyond = true;", ''],
  ['makefile-eval-syntax', M, "if (content.startsWith('$(') || content.startsWith('${')) { beyond = true; continue; }", ''],
  ['makefile-conditional-open', M, 'if (conditionals > 0) syntax = true;', ''],
  ['makefile-continuation-parity', M, '% 2 === 1', '% 2 === 0'],
  ['makefile-define-open', M, 'if (depth > 0) syntax = true;', ''],
  ['cmake-case', X, 'const command = name!.toLowerCase();', 'const command = name!;'],
  ['cmake-no-argument', X, 'if (args.length === 0) { fieldType = true; continue; }', 'if (args.length === 0) continue;'],
  ['cmake-library-kind', X, "add_library: 'library'", "add_library: 'executable'"],
  ['cmake-custom-dropped', X, ", add_custom_target: 'custom'", ''],
  ['cmake-bracket-newline', X, "return content.startsWith('\\r\\n') ? content.slice(2) : isNewline(content[0]) ? content.slice(1) : content;", 'return content;'],
  ['cmake-quoted-continuation', X, 'if (isNewline(text[i + 1])) { i += 2; continue; }', ''],
  ['cmake-escaped-semicolon', X, "if (e === ';') return '\\\\;';", "if (e === ';') return ';';"],
  ['cmake-last-line', X, 'last: lineOf(i - 1)', 'last: lineOf(nameStart)'],
  ['cmake-unclosed-paren', X, 'if (c === undefined) fail();', 'if (c === undefined) break;'],
  ['cmake-line-end-unchecked', X, "if (i < n && !isNewline(text[i]) && text[i] !== '#') fail();", ''],
  ['cmake-line-end-bracket-comment', X, "if (text[i] === '#' && bracketOpen(i + 1) >= 0) { i++; bracket(); continue; }\n        break;", 'break;'],
  ['cmake-inner-quote-breaks', X, "u === '(' || u === ')' || u === '#') break;", "u === '(' || u === ')' || u === '#' || u === '\"') break;"],
  ['makefile-directive-line-rule', M, 'if (DIRECTIVES.includes(firstWord(content))) continue;\n    if (found.colon >= 0) {', 'if (found.colon >= 0) {'],
  ['makefile-assignment-after-colon', M, 'if (found.op >= 0 && found.colon < 0) {', 'if (found.op >= 0) {'],
  ['yaml-second-document', Y, 'if (documents > 1 && !multi) beyond = true;', 'if (documents > 1) beyond = true;'],
  ['yaml-integer-text', Y, "INTEGER.test(plain) ? { kind: 'other', lines, int: plain } : ", ''],
  ['driver-format', F, "'polaris-dossier-manifest-facts/2'", "'polaris-dossier-manifest-facts/1'"],
  ['driver-read-limit', F, 'export const INFRA_READ_LIMIT = 100;', 'export const INFRA_READ_LIMIT = 250;'],
  ['driver-compose-not-set-apart', F, '{ rule: COMPOSE_FILE, matches: isComposePath, setsApart: true,', '{ rule: COMPOSE_FILE, matches: isComposePath, setsApart: false,'],
  ['driver-remainder-old-rules', F, 'const candidate = MANIFEST_RECOGNIZERS.some(', 'const candidate = MANIFEST_RECOGNIZERS.slice(0, 5).some('],
  ['driver-remainder-secret-counted', F, 'if (secretOrUnder(segments, isSecretPath)) { secretPathsLeftOut++; continue; }', 'if (secretOrUnder(segments, isSecretPath)) { secretPathsLeftOut++; }'],
  ['driver-remainder-place-limit', F, 'ordered.slice(0, CENSUS_LISTED_LIMIT), rest = ordered.slice(CENSUS_LISTED_LIMIT)', 'ordered.slice(0, 260), rest = ordered.slice(260)'],
  ['driver-remainder-shown-path', F, 'CONTROL.test(segment) ? shownPath(segment) : segment', 'CONTROL.test(segment) ? segment : segment'],
  ['driver-remainder-unsorted', F, '[...directories].sort(([a], [b]) => byCodeUnit(a, b))', '[...directories]'],
  ['site-remainder-missing-dropped', S, "`${mapSection('directories', 'Directory map', derivedUnknownSentence(derived))}${remainder}`", "mapSection('directories', 'Directory map', derivedUnknownSentence(derived))"],
  ['site-rule-list-commas', S, "`${rules.slice(0, -1).join(', ')} and ${rules[rules.length - 1]}`", "rules.join(', ')"],
  ['site-remainder-more-always', S, "r.placesNotListed === 0 ? ''", "r.placesNotListed < 0 ? ''"],
  ['site-infrastructure-files-word', S, "map === 'infrastructure' ? 'infrastructure files' : 'manifest files'", "'manifest files'"],
  ['site-infra-rule-dropped', S, "'makefile', 'cmake-lists']", "'makefile']"],
  ['site-kubernetes-no-name', S, "typeof fact['name'] === 'string'\n      ? `Kubernetes", "true\n      ? `Kubernetes"],
  ['site-cmake-kind-words', S, "`CMake ${value(fact, 'targetKind')} target ${value(fact, 'target')}.`", "`CMake target ${value(fact, 'target')}.`"],
  ['site-machine-remainder', S, 'remainder: derivedMember === undefined ? null : derivedMember.remainder,', ''],
  ['site-infra-map-page', S, "  { map: 'infrastructure', path: 'maps/infrastructure.html', title: 'Infrastructure map' },\n", ''],
];

// A mutant that cannot change behaviour, with why; it is recorded with its explanation, never dropped.
const EXPLAINED = {
};

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
for (const [id, file, old] of MUTANTS) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) throw new Error(`${id}: the fragment occurs ${count} times in ${file}`);
}
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });

const command = ['npx', 'vitest', 'run', ...TESTS, '--reporter=json'];
async function runTests(tag) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn(command[0], [...command.slice(1), `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, TIMEOUT_MS);
  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  const failedTests = [];
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      for (const name of failed) failedTests.push(name);
      if (failed.length === 0 && result.status === 'failed') failedTests.push(`${path.relative(root, result.name)} (file failed: ${String(result.message).slice(0, 200)})`);
    }
  }
  return { code, timedOut, failedTests, total };
}

const head = await new Promise((resolve) => { const c = spawn('git', ['-C', root, 'rev-parse', 'HEAD']); let s = ''; c.stdout.on('data', (d) => { s += d; }); c.on('exit', () => resolve(s.trim())); });
const record = {
  format: 'mutation-run/1',
  ranAt: new Date().toISOString(),
  commit: head,
  subject: Object.fromEntries(files.map((file) => [file, sha(originals.get(file))])),
  command: `${command.join(' ')} --outputFile=<scratch>/mutation-<id>.json`,
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the ${TESTS.length} test files above under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero (failedTests lists each failing test) or is stopped after ${TIMEOUT_MS / 1000} s. The unmutated baseline runs first and must pass.`,
  testFiles: TESTS,
  baseline: null,
  mutants: [],
  summary: null,
};
try {
  const baseline = await runTests('baseline');
  record.baseline = { exitCode: baseline.code, tests: baseline.total, failedTests: baseline.failedTests };
  if (baseline.code !== 0) throw new Error(`the baseline fails: ${baseline.failedTests.join('; ')}`);
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runTests(id);
      const killed = result.timedOut || result.code !== 0;
      record.mutants.push({ id, file, old, new: replacement, killed, explanation: EXPLAINED[id] ?? null, killedBy: result.timedOut ? 'timeout' : killed ? 'tests' : null, failedTests: result.failedTests, seconds: Math.round((Date.now() - started) / 1000) });
      process.stdout.write(`${id}: ${killed ? 'killed' : 'SURVIVED'} (${result.failedTests.length} failed${result.timedOut ? ', timeout' : ''})\n`);
    } finally {
      restoreAll();
    }
  }
} finally {
  restoreAll();
  for (const file of files) if (sha(fs.readFileSync(path.join(root, file))) !== record.subject[file]) throw new Error(`${file} was not restored`);
  const killed = record.mutants.filter((m) => m.killed).length;
  record.summary = { mutants: record.mutants.length, killed, survived: record.mutants.length - killed, survivedExplained: record.mutants.filter((m) => !m.killed && m.explanation !== null).length };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}
