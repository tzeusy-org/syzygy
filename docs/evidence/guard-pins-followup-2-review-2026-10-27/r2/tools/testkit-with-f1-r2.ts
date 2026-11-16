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

/** The one target an `exports` or `imports` entry names: a string, or an object whose conditions other than `types` all name the
 * same string. Node takes the first condition it matches, so `node` or `module-sync` ahead of `import` changes what it loads. */
function targetOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return undefined;
  const targets = Object.entries(entry).filter(([condition]) => condition !== 'types').map(([, target]) => target);
  const [first] = targets;
  return typeof first === 'string' && targets.every((target) => target === first) ? first : undefined;
}

/** The module a package's own `./dist/X.js` target names, `src/X.ts`, or undefined for any other target. */
function moduleIn(workspace: Workspace, dir: string, target: string): string | undefined {
  if (!target.startsWith('./dist/')) return undefined;
  const module = posix.join(dir, target.replace(/^\.\/dist\//u, 'src/').replace(/\.js$/u, '.ts'));
  return workspace.isFile(module) ? module : undefined;
}

/** A dependency version the guards treat as possibly local, so a bare name declared with it names no module:
 * - `file:`, or a path (`.`, `..`, `./x`, `../x`, `/x`, `~/x`) or tarball name (`x.tgz`, `x.tar`, `x.tar.gz`): npm reads each
 *   as a directory or a file;
 * - `link:` and `workspace:`: npm does not install them at all (npm-package-arg 12.0.2 throws EUNSUPPORTEDPROTOCOL), and other
 *   package managers link them locally;
 * - `npm:`: an alias. npm-package-arg 12.0.2 accepts only a registry spec after `npm:`, and npm 11.5.1 fetches that spec from
 *   the registry unless the alias is declared under a workspace's own name and either the root's manifest declares it or the
 *   alias's range is `*`, absent or one that workspace's version satisfies; then npm links the workspace, as for a plain range
 *   declared under a workspace's name (npm skips any root declaration under a workspace's name, whatever its version). Every
 *   workspace here is `@syzygy/`-scoped, and the `@syzygy/*` branch reads such a name before this pattern. Its target may carry
 *   a workspace package's name, which other package managers can link locally; every alias is refused, failing closed.
 * The tarball arm also matches a tarball URL (`https://…/x.tgz`), which npm types as `remote`, and a git spec whose text ends in a
 * tarball extension (`github:someone/dossier#v1.tar`), which npm types as `git`; both are refused too, failing closed.
 * Residual (syzygy-bpyt.8.38): npm also reads a directory spec with no leading `./`, `../`, `/` or `~/` (`packages/polaris-dossier/`,
 * `.hidden-lib`, `a/b/c`) as a directory. Those still read as outside the workspace; widening the pattern to them changes what the
 * guards refuse and needs a GP-Q0 ruling first.
 * Residual (the review of 8.39, N2): a workspace whose name is not `@syzygy/`-scoped is read by its bare name as outside the
 * workspace (unless some manifest declares that name with a version this pattern matches), while npm links it under that name
 * and Node loads it from there. 0 of the 12 workspaces are unscoped today; closing it changes what the guards refuse and needs a
 * GP-Q0 ruling first. */
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
