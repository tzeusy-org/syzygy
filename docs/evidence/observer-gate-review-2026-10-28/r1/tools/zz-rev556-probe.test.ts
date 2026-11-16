// Reviewer probe for PR #556, copied into apps/three-surface-poc/src/ of a scratch clone for one run and removed afterwards.
// Prints, as one JSON line: the workspaces the import walk from main.ts reaches, those reached with re-export edges dropped, the
// projects the build list reaches at reference depth 0, 1 and any, and each protected project's extends chain.
import { posix } from 'node:path';
import ts from 'typescript';
import { it } from 'vitest';

import { reach, readModule, WORKSPACE } from '../../../packages/polaris-generation-core/src/workspace-reach.testkit.js';

it('probe', () => {
  const workspaces = [...WORKSPACE.manifests.values()].map((m) => m.dir).filter((d) => d !== '.');
  const ownersOf = (mods: readonly string[]) => [...new Set(mods.map((m) => workspaces.find((d) => m.startsWith(`${d}/`)) ?? `?${m}`))].sort();
  const all = reach('apps/three-surface-poc/src/main.ts', (f) => ts.preProcessFile(readModule(f), true, true).importedFiles.map((i) => i.fileName));
  const noReexport = reach('apps/three-surface-poc/src/main.ts', (f) =>
    ts.preProcessFile(readModule(f).replace(/^export [^;]*? from [^;]*;$/gmu, ''), true, true).importedFiles.map((i) => i.fileName));
  const restart = reach('apps/three-surface-poc/src/restart-main.ts', (f) => ts.preProcessFile(readModule(f), true, true).importedFiles.map((i) => i.fileName));
  const { scripts } = JSON.parse(readModule('package.json')) as { scripts: Record<string, string> };
  const build = (scripts['build:poc'] ?? '').split(' ').slice(2);
  const refs = (p: string): string[] => ((JSON.parse(readModule(`${p}/tsconfig.json`)) as { references?: { path: string }[] }).references ?? []).map((r) => posix.normalize(posix.join(p, r.path)));
  const depth1 = [...new Set([...build, ...build.flatMap(refs)])].sort();
  const any = new Set<string>(); const visit = (p: string): void => { if (any.has(p)) return; any.add(p); refs(p).forEach(visit); }; build.forEach(visit);
  const chains = Object.fromEntries([...any].map((p) => { const c: string[] = []; for (let f: string | undefined = `${p}/tsconfig.json`; f;) { c.push(f); const e = (JSON.parse(readModule(f)) as { extends?: string }).extends; f = e === undefined ? undefined : posix.normalize(posix.join(posix.dirname(f), e)); } return [p, c]; }));
  console.log('REV556PROBE ' + JSON.stringify({
    importWorkspaces: ownersOf(all.reachable), importModules: all.reachable.length, unresolved: all.unresolved.length,
    noReexportWorkspaces: ownersOf(noReexport.reachable), noReexportModules: noReexport.reachable.length,
    restartWorkspaces: ownersOf(restart.reachable),
    buildList: build, depth0: [...build].sort(), depth1, depthAny: [...any].sort(), chains,
  }));
});
