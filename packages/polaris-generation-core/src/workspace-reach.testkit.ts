import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

// Test support: which workspace modules an entry reaches, for the guards that keep a module off a path the `syzygy` CLI takes
// (island-boundary.test.ts, syzygy-bpyt.8.1, and polaris-dossier's subpath-imports.test.ts, syzygy-bpyt.8.34). An `@syzygy/*`
// specifier resolves through its package's `exports`, where `./dist/X.js` is `src/X.ts`. Each guard says which edges a module has.
// A specifier the walk cannot follow as Node would reads as naming no module, so both guards' "resolves every" rows fail on it: an
// absolute path, a `file:` URL, a `#` alias the importing package's `imports` does not name, and an entry whose conditions name
// more than one target (syzygy-bpyt.8.36, the review of 8.34, N1); and a bare name some manifest declares as a local dependency,
// which npm installs under that name from a directory or another package's name (syzygy-bpyt.8.37, the review of 8.36, N2). A `#`
// alias it names is followed to its target.

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface ReachEdge { readonly from: string; readonly specifier: string; readonly to: string }

export const isFile = (path: string): boolean => existsSync(join(ROOT, path)) && statSync(join(ROOT, path)).isFile();
export const readModule = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

type Dependencies = Readonly<Record<string, string>>;
export interface Manifest {
  readonly name: string; readonly dir: string; readonly exports?: Record<string, unknown>; readonly imports?: Record<string, unknown>; readonly main?: string;
  readonly dependencies?: Dependencies; readonly devDependencies?: Dependencies; readonly optionalDependencies?: Dependencies; readonly peerDependencies?: Dependencies;
}
/** What a resolver reads: each manifest by its name, the workspace root's among them, and which paths are files. */
export interface Workspace { readonly manifests: ReadonlyMap<string, Manifest>; readonly isFile: (path: string) => boolean }

const manifests = new Map<string, Manifest>();
const root = JSON.parse(readModule('package.json')) as Omit<Manifest, 'dir'>;
manifests.set(root.name, { dir: '.', ...root });
for (const parent of ['apps', 'packages']) {
  for (const name of readdirSync(join(ROOT, parent))) {
    const path = `${parent}/${name}/package.json`;
    if (!isFile(path)) continue;
    const manifest = JSON.parse(readModule(path)) as Omit<Manifest, 'dir'>;
    manifests.set(manifest.name, { dir: `${parent}/${name}`, ...manifest });
  }
}
export const WORKSPACE: Workspace = { manifests, isFile };

/** The one target an `exports` or `imports` entry names: a string, or an object whose conditions other than `types` and `source`
 * all name the same string. Node takes the first condition it matches, so `node` or `module-sync` ahead of `import` changes what it
 * loads. `source` is the workspace's own condition, which tests and tools resolve (syzygy-bpyt.4.2): it must name the `src/X.ts`
 * module that target's `./dist/X.js` reads as, or the entry names none, so a module reads the same under either resolution. */
function targetOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return undefined;
  const targets = Object.entries(entry).filter(([condition]) => condition !== 'types' && condition !== 'source').map(([, target]) => target);
  const [first] = targets;
  if (typeof first !== 'string' || !targets.every((target) => target === first)) return undefined;
  const source: unknown = (entry as Record<string, unknown>)['source'];
  if (source === undefined) return first;
  return source === first.replace(/^\.\/dist\//u, './src/').replace(/\.js$/u, '.ts') ? first : undefined;
}

/** The module a package's own `./dist/X.js` target names, `src/X.ts`, or undefined for any other target. */
function moduleIn(workspace: Workspace, dir: string, target: string): string | undefined {
  if (!target.startsWith('./dist/')) return undefined;
  const module = posix.join(dir, target.replace(/^\.\/dist\//u, 'src/').replace(/\.js$/u, '.ts'));
  return workspace.isFile(module) ? module : undefined;
}

/** A dependency version the guards treat as possibly local, so a bare name declared with it names no module:
 * - `file:`, or a path (`.`, `..`, `./x`, `../x`, `/x`, `~/x`) or tarball name (`x.tgz`, `x.tar`, `x.tar.gz`): npm reads each
 *   as a directory or a file, except in the root's manifest under a workspace's own name, where npm links that workspace;
 * - `link:` and `workspace:`: npm does not install them at all (npm-package-arg 12.0.2 throws EUNSUPPORTEDPROTOCOL), except in
 *   the root's manifest under a workspace's own name, as above, and another package manager might link them (not observed here);
 * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`. npm 11.5.1 skips each declaration in the
 *   root's manifest under a workspace's own name, whatever its version, and links that workspace. For every other declaration, npm
 *   fetches the alias's spec from the registry unless that declaration is under a workspace's own name and the alias's range is `*`,
 *   absent or one that workspace's version satisfies; then npm links the workspace, as for a plain range so declared. Every workspace
 *   here is `@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name before this pattern. Its target may carry a workspace
 *   package's name, which another package manager might link locally (not observed here); every alias is refused, failing closed.
 * The tarball arm also matches a tarball URL (`https://…/x.tgz`), which npm types as `remote`, and a git spec whose text ends in a
 * tarball extension (`github:someone/dossier#v1.tar`), which npm types as `git`; both are refused too, failing closed.
 * Residual (syzygy-bpyt.8.38): npm also reads a directory spec with no leading `./`, `../`, `/` or `~/` (`packages/polaris-dossier/`,
 * `.hidden-lib`, `a/b/c`) as a directory. Those still read as outside the workspace; widening the pattern to them changes what the
 * guards refuse and needs a GP-Q0 ruling first. GP-B2 Q4 instead supplies the separate workspace-reach.test.ts test
 * "requires every npm workspace to be @syzygy/-named and every dependency or override spec to be a registry version shape":
 * a complete suite refuses such manifests up front; this resolver's behavior stays as reviewed.
 * Residual (the review of 8.39, N2): a workspace whose name is not `@syzygy/`-scoped is read by its bare name as outside the
 * workspace (unless some manifest declares that name with a version this pattern matches), while npm links it under that name
 * and Node loads it from there. At syzygy-bpyt.8.39, 0 of the 12 workspaces are unscoped; closing it changes what the guards
 * refuse and needs a GP-Q0 ruling first. The same GP-B2 Q4 precondition test in workspace-reach.test.ts refuses every
 * non-@syzygy/-named workspace, including one with no entry, as a prerequisite to the full suite's assurance. */
const LOCAL_VERSION = /^(?:file:|link:|workspace:|npm:|\.\.?(?:\/|$)|\/|~\/)|\.(?:tgz|tar|tar\.gz)$/iu;

/** Every name any manifest declares a local dependency under. npm installs a dependency where every workspace module resolves it. */
function localNames(workspace: Workspace): Set<string> {
  const names = new Set<string>();
  for (const manifest of workspace.manifests.values()) {
    for (const field of [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]) {
      for (const [name, version] of Object.entries(field ?? {})) if (LOCAL_VERSION.test(version)) names.add(name);
    }
  }
  return names;
}

/** The module a specifier names in `workspace`, null for one outside the workspace (`node:*`, a dependency), or undefined when it
 * names none. */
export function resolveIn(workspace: Workspace, from: string, specifier: string): string | null | undefined {
  if (specifier.startsWith('.')) {
    const base = posix.normalize(posix.join(posix.dirname(from), specifier));
    return [base.replace(/\.js$/u, '.ts'), `${base}.ts`, `${base}/index.ts`].find(workspace.isFile);
  }
  if (specifier.startsWith('/') || /^file:/iu.test(specifier)) return undefined;
  if (specifier.startsWith('#')) {
    const owner = [...workspace.manifests.values()].find((manifest) => from.startsWith(`${manifest.dir}/`));
    const target = owner?.imports === undefined ? undefined : targetOf(owner.imports[specifier]);
    if (owner === undefined || target === undefined || target.startsWith('#') || target.startsWith('../')) return undefined;
    return target.startsWith('./') ? moduleIn(workspace, owner.dir, target) : resolveIn(workspace, from, target);
  }
  const named = /^(@syzygy\/[^/]+)(\/.*)?$/u.exec(specifier);
  if (named === null) return localNames(workspace).has(/^(?:@[^/]+\/)?[^/]+/u.exec(specifier)![0]) ? undefined : null;
  const manifest = workspace.manifests.get(named[1]!);
  if (manifest === undefined) return undefined;
  const subpath = named[2] === undefined ? '.' : `.${named[2]}`;
  const target = manifest.exports === undefined ? (subpath === '.' ? manifest.main : undefined) : targetOf(manifest.exports[subpath]);
  return target === undefined ? undefined : moduleIn(workspace, manifest.dir, target);
}

/** The module a specifier names in this workspace (`resolveIn` over the tree's own manifests and files). */
export const resolve = (from: string, specifier: string): string | null | undefined => resolveIn(WORKSPACE, from, specifier);

/** Node's segment rules for an `exports` target, applied to the target after its leading `./`, copied verbatim from Node 24.6.0
 * (lib/internal/modules/esm/resolve.js, `invalidSegmentRegEx` and `deprecatedInvalidSegmentRegEx`, read in
 * `resolvePackageTargetString`). A target the second matches (a `.`, `..` or `node_modules` segment, in any case, percent-encoded or
 * not) Node refuses with ERR_INVALID_PACKAGE_TARGET; one only the first matches (an empty segment) it accepts with the DEP0166
 * deprecation warning (a `//` target then loads; one that ends in `/` names a directory, which Node then fails to load). docs/evidence/syzygy-bpyt-70/node-segments.json records Node's own outcome for
 * each case the segment rows of workspace-reach.test.ts name (syzygy-bpyt.70, the PR 554 round-1 review's N3). */
export const INVALID_SEGMENT = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
export const REFUSED_SEGMENT = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
/** The conditions Node 24 matches with no `--conditions` flag; `types` and `source` are read by TypeScript and the test resolver. */
const NODE_CONDITIONS = new Set(['node', 'import', 'require', 'module-sync', 'node-addons', 'default']);

/** Every target string an entry names, with the conditions that lead to it (none for a string entry or `main`). */
function targetsOf(entry: unknown, conditions: readonly string[] = []): (readonly [readonly string[], string])[] {
  if (typeof entry === 'string') return [[conditions, entry]];
  if (Array.isArray(entry)) return entry.flatMap((fallback) => targetsOf(fallback, conditions));
  if (typeof entry !== 'object' || entry === null) return [];
  return Object.entries(entry).flatMap(([condition, target]) => targetsOf(target, [...conditions, condition]));
}

/** Every condition key an entry names, with the conditions that lead to it. */
function conditionKeysOf(entry: unknown, conditions: readonly string[] = []): (readonly [readonly string[], string])[] {
  if (Array.isArray(entry)) return entry.flatMap((fallback) => conditionKeysOf(fallback, conditions));
  if (typeof entry !== 'object' || entry === null) return [];
  return Object.entries(entry).flatMap(([condition, target]) => [[conditions, condition] as const, ...conditionKeysOf(target, [...conditions, condition])]);
}

/** Why Node's segment rules refuse one of an entry's targets, the most severe first, or undefined when they refuse none. A target
 * under a condition Node does not read, or a `main`, which Node reads without these rules, is refused too, since the workspace's
 * own resolution joins it away, but its message makes no claim about Node. A condition key with a `/../` segment is refused as
 * well, as the serialized check before syzygy-bpyt.70 refused it (the PR 557 round-1 review's N2). */
export function segmentFaultOf(entry: unknown, main: boolean): string | undefined {
  const faults = targetsOf(entry).flatMap(([conditions, target]) => {
    if (!INVALID_SEGMENT.test(target.replace(/^\.\//u, ''))) return [];
    const where = main ? 'main field' : conditions.length === 0 ? 'entry' : `${conditions.join(' > ')} condition`;
    const nodeReads = !main && conditions.every((condition) => NODE_CONDITIONS.has(condition));
    const [rank, why] = !nodeReads ? [2, main ? 'which Node reads without its exports rules' : 'which Node does not read']
      : REFUSED_SEGMENT.test(target.replace(/^\.\//u, '')) ? [0, 'which Node refuses (ERR_INVALID_PACKAGE_TARGET)']
      : [1, 'which Node accepts with a deprecation warning (DEP0166)'];
    return [{ rank, message: `its ${where} target ${JSON.stringify(target)} has an empty, '.', '..' or 'node_modules' segment, ${why}` }];
  });
  const keyFaults = conditionKeysOf(entry).filter(([, key]) => key.includes('/../')).map(([conditions, key]) => ({
    rank: 2,
    message: `its ${conditions.map((condition) => `${condition} > `).join('')}condition key ${JSON.stringify(key)} has a /../ segment, and no condition Node matches by default has one`,
  }));
  return [...faults, ...keyFaults].sort((a, b) => a.rank - b.rank)[0]?.message;
}

/** Every entry a workspace package's manifest names, by its specifier, with the `src` module its `exports` (or its `main`, where it
 * has no `exports`) names, read as above: the source of what Node loads for the specifier. The S10 no-egress bundle aliases by it
 * (syzygy-bpyt.46). An entry the resolver cannot read throws, and so does one with a target Node's segment rules refuse, which
 * `moduleIn` would join away (the PR 545 round-1 review's N6; `segmentFaultOf`, syzygy-bpyt.70). */
export function entryModulesIn(workspace: Workspace): Record<string, string> {
  const modules: Record<string, string> = {};
  for (const manifest of workspace.manifests.values()) {
    if (manifest.dir === '.') continue;
    const entries: [string, unknown][] = manifest.exports !== undefined ? Object.entries(manifest.exports) : manifest.main !== undefined ? [['.', manifest.main]] : [];
    for (const [subpath, entry] of entries) {
      const specifier = subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`;
      const fault = segmentFaultOf(entry, manifest.exports === undefined);
      if (fault !== undefined) throw new Error(`${specifier}: ${fault}`);
      const module = resolveIn(workspace, `${manifest.dir}/package.json`, specifier);
      if (typeof module !== 'string') throw new Error(`${specifier}: its entry is not a ./dist/X.js whose src/X.ts exists`);
      modules[specifier] = module;
    }
  }
  return modules;
}

/** `entryModulesIn` over this workspace. */
export const entryModules = (): Record<string, string> => entryModulesIn(WORKSPACE);

/** Every module `entry` reaches by the specifiers `specifiersOf` gives for each module, in the order it reaches them: every edge
 * between workspace modules, and any workspace specifier that names no module. */
export function reach(entry: string, specifiersOf: (module: string) => readonly string[]): { reachable: string[]; edges: ReachEdge[]; unresolved: Omit<ReachEdge, 'to'>[] } {
  const seen = new Set([entry]);
  const queue = [entry];
  const edges: ReachEdge[] = [];
  const unresolved: Omit<ReachEdge, 'to'>[] = [];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    for (const specifier of specifiersOf(file)) {
      const to = resolve(file, specifier);
      if (to === null) continue;
      if (to === undefined) { unresolved.push({ from: file, specifier }); continue; }
      edges.push({ from: file, specifier, to });
      if (!seen.has(to)) { seen.add(to); queue.push(to); }
    }
  }
  return { reachable: [...seen].sort(), edges, unresolved };
}
