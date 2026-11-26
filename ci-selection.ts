// Which tests a pull request runs (syzygy-qu5j). Pure: the caller supplies the changed paths and the module texts, and
// `scripts/select_ci_tests.mjs` turns the plan into test files through Vitest's own module graph. Merge-group runs never
// read this: the tree that lands is always tested whole.
//
// Two ways a change reaches a test:
//   - by import: every test whose module graph holds a changed module (`apps/*`, `packages/*`, or a script or root
//     module a test imports);
//   - by reading: tests read documents, fixtures, scripts and sibling sources from disk, which no import graph sees. A
//     "reader" module selects every test that imports it (itself included):
//       - for a path outside the workspaces, every module that locates the real repository (`ROOTED` below: a relative
//         `new URL('../..')`, `process.cwd()`, `git rev-parse`), and every module naming the path's basename as a path
//         literal. A bare `'..'` join is not counted: 178 of 739 modules carry one, and counting it selected 308 of 366
//         test files for a Trajectory change (measured 2026-11-27 on PR #1007's diff);
//       - for a path inside a workspace, every module naming its basename, and for a file that is not a module also its
//         directory's name, as a path literal (opened and closed by a quote, backtick or slash); and every test file
//         that is a "walker" (`WALKS`: it lists a directory) in the same workspace, or anywhere when it also locates
//         the repository. Guards that scan sources (`support-purity.test.ts` walks its own `src`,
//         `sync-child-process-guard.test.ts` walks the repository) are walkers, so a new module is checked by them.
//         Only test files count: a product module that lists a directory reads the input its caller hands it, and
//         counting those selected every dossier browser test for a Trajectory change (measured on PR #1007's diff).
//       - a renamed path is looked up by its old name as well as its new one.
//     The rule over-selects on purpose. A reader it cannot see (a path assembled from parts that never name a token, a
//     directory read from a root handed in by a caller it does not import, a walk that names no listing call) is the
//     residual: no unit test fails when a new test escapes the rule, and the full merge-group run is what catches it,
//     in the queue, never on main.
// A change the graph cannot bound runs every tier in full: manifests, the lockfile, test and type configuration, the
// workflow, this selector and its runners, and a deleted or renamed workspace module.

/** One changed path, as `git diff --name-status` reports it (`A`, `M`, `D`, `R100`, …; a rename lists its old path too). */
export interface ChangedPath {
  readonly status: string;
  readonly path: string;
  readonly previous?: string;
}

export interface SelectionPlan {
  readonly mode: 'full' | 'selected';
  /** Why the run is full: each trigger hit, as `<rule>: <path>`. Empty when selected. */
  readonly reasons: readonly string[];
  /** Changed workspace modules, handed to the module graph. */
  readonly code: readonly string[];
  /** Each changed path, the tokens a reader would name it by, and the readers found. */
  readonly documents: ReadonlyArray<{ readonly path: string; readonly tokens: readonly string[]; readonly readers: readonly string[] }>;
  /** Every module the graph is asked about: `code` plus every reader, sorted and distinct. */
  readonly related: readonly string[];
}

/** A change here runs every tier in full; each rule names itself in the plan's reasons. */
export const FULL_RUN_TRIGGERS: ReadonlyArray<{ readonly rule: string; readonly test: RegExp }> = [
  { rule: 'package manifest', test: /(^|\/)package\.json$/u },
  { rule: 'lockfile', test: /^package-lock\.json$/u },
  { rule: 'npm configuration', test: /(^|\/)\.npmrc$/u },
  { rule: 'test configuration', test: /^vitest[^/]*\.(ts|mts|js|mjs)$/u },
  { rule: 'package test configuration', test: /^(apps|packages)\/[^/]+\/vitest[^/]*\.(ts|mts|js|mjs)$/u },
  { rule: 'type configuration', test: /(^|\/)tsconfig[^/]*\.json$/u },
  { rule: 'selector', test: /^ci-selection\.ts$/u },
  { rule: 'selector', test: /^scripts\/(select_ci_tests|run_ci_tier|check_unit_tmpdir)\.mjs$/u },
  { rule: 'workflow', test: /^\.github\/workflows\/node-ci\.yml$/u },
];

const WORKSPACE = /^(apps|packages)\/[^/]+\//u;

const MODULE = /\.(ts|mts|cts|tsx|js|mjs|cjs)$/u;

/** A module that finds the real repository from where it sits, or from the process; see the head comment. */
export const ROOTED = /new URL\(\s*['"`](\.\.\/?)+['"`]|process\.cwd\(\)|['"`]rev-parse['"`]|--show-toplevel/u;

/** A module that lists a directory, and so may read a file no one names to it; see the head comment. */
export const WALKS = /\b(readdir|opendir|glob)(Sync)?\(|['"`]ls-files['"`]/u;

/** The workspace a path lies in (`apps/x`, `packages/y`), or undefined. */
const workspaceOf = (path: string): string | undefined => WORKSPACE.exec(path)?.[0].slice(0, -1);

/** The names a reader would use to reach `path`: see the head comment. */
export function readerTokens(path: string): string[] {
  const parts = path.split('/');
  const basename = parts[parts.length - 1]!;
  if (!WORKSPACE.test(path) || MODULE.test(path)) return [basename];
  return [...new Set([basename, parts[parts.length - 2]!])];
}

/** Whether `text` names `token` as a path literal: opened by a quote, backtick or slash, closed by a quote, backtick or slash. */
export function namesPath(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`['"\`/]${escaped}['"\`/]`, 'u').test(text);
}

/**
 * The plan for one pull request. `modules` maps each tracked workspace module (repository-relative) to its text; only
 * modules are readers, so a document naming another document selects nothing by itself.
 */
export function planSelection(changed: readonly ChangedPath[], modules: ReadonlyMap<string, string>): SelectionPlan {
  const reasons: string[] = [];
  const code = new Set<string>();
  const documents: Array<{ path: string; tokens: string[]; readers: string[] }> = [];
  for (const change of changed) {
    for (const path of change.previous === undefined ? [change.path] : [change.previous, change.path]) {
      const trigger = FULL_RUN_TRIGGERS.find(({ test }) => test.test(path));
      if (trigger !== undefined) reasons.push(`${trigger.rule}: ${path}`);
    }
    const removed = change.status.startsWith('D') || change.status.startsWith('R');
    const removedPath = change.status.startsWith('R') ? change.previous ?? change.path : change.path;
    if (removed && WORKSPACE.test(removedPath)) reasons.push(`workspace module removed or renamed: ${removedPath}`);
    if (MODULE.test(change.path) && !change.status.startsWith('D')) code.add(change.path); // a removed workspace one has already made the run full
    const names = change.previous === undefined ? [change.path] : [change.previous, change.path];
    const tokens = [...new Set(names.flatMap(readerTokens))];
    const workspace = workspaceOf(change.path);
    const reads = (module: string, text: string): boolean => {
      if (tokens.some((token) => namesPath(text, token))) return true;
      if (workspace === undefined) return ROOTED.test(text);
      return module.endsWith('.test.ts') && WALKS.test(text) && (workspaceOf(module) === workspace || ROOTED.test(text));
    };
    const readers = [...modules].filter(([module, text]) => module !== change.path && reads(module, text)).map(([module]) => module).sort();
    documents.push({ path: change.path, tokens, readers });
  }
  if (reasons.length > 0) return { mode: 'full', reasons: [...new Set(reasons)], code: [], documents: [], related: [] };
  const related = new Set<string>(code);
  for (const { readers } of documents) for (const reader of readers) related.add(reader);
  return { mode: 'selected', reasons: [], code: [...code].sort(), documents, related: [...related].sort() };
}

/** Reads `git diff --name-status -M` output (tab-separated) into changed paths. */
export function parseNameStatus(output: string): ChangedPath[] {
  return output.split('\n').filter((line) => line.length > 0).map((line) => {
    const [status, first, second] = line.split('\t');
    if (status === undefined || first === undefined) throw new Error(`unreadable name-status row: ${JSON.stringify(line)}`);
    return /^[RC]/u.test(status) && second !== undefined ? { status, path: second, previous: first } : { status, path: first };
  });
}
