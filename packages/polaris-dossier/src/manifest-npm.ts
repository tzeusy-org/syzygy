import { readJson } from './manifest-json.js';
import { FieldWalk, member, resolveFaults, type MNode, type Recognized } from './manifest-model.js';

/** Rule `npm-package-manifest` version 1 (REQ-polaris-generation-034 version 2.7): every blob whose basename is `package.json`, read as one
 * JSON text whose value is an object (`manifest-json.ts`, which refuses only nesting deeper than 256 as beyond its reader). It reads
 * `name` (a string: one `package` fact), `workspaces` (an array of strings, or an object whose member `packages` is an array of strings,
 * no other member of that object read: one `workspace-member` fact per string; an object without `packages` is a `field-type` fault) and
 * the four dependency sections (each an object whose member values are strings: one `dependency` fact per member, its section the field's
 * name, its group null). A repeated name in the root object, `workspaces` or a section is `duplicate-key`. Pure. */

export const NPM_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
const READ = new Set<string>(['workspaces', ...NPM_SECTIONS]);

export const isNpmManifestPath = (path: string): boolean => path === 'package.json' || path.endsWith('/package.json');

export function recognizeNpmManifest(text: string): Recognized {
  return resolveFaults(readJson(text), (p) => p.length === 0 || (p.length === 1 && READ.has(p[0]!)), false, (root) => {
    const walk = new FieldWalk();
    if (!walk.is(root, 'map')) return walk;
    const name = member(root, 'name');
    if (name !== undefined && walk.is(name.value, 'string')) walk.add('package', name.lines, name.value.value);
    const workspaces = member(root, 'workspaces');
    if (workspaces !== undefined) {
      let list: MNode | undefined = workspaces.value;
      if (list.kind === 'map') {
        const packages = member(list, 'packages');
        if (packages === undefined) walk.fieldType = true;
        list = packages?.value;
      }
      if (list !== undefined && walk.is(list, 'array')) for (const item of list.items) if (walk.is(item, 'string')) walk.add('workspace-member', item.lines, item.value);
    }
    for (const section of NPM_SECTIONS) {
      const found = member(root, section);
      if (found === undefined || !walk.is(found.value, 'map')) continue;
      for (const dependency of found.value.entries) {
        const key = walk.keyOf(dependency.key);
        if (key !== undefined && walk.is(dependency.value, 'string')) walk.add('dependency', dependency.lines, key, section, null);
      }
    }
    return walk;
  });
}
