import { FieldWalk, member, resolveFaults, type MNode, type Recognized } from './manifest-model.js';
import { readToml } from './manifest-toml.js';

/** Rule `cargo-manifest` version 1 (REQ-polaris-generation-034 version 2.7): every blob whose basename is `Cargo.toml`, read as TOML v1.0.0
 * (`manifest-toml.ts`, which refuses a date-time or time value anywhere as beyond its reader). It reads `package.name` (a string:
 * `package`), `workspace.members` (an array of strings: one `workspace-member` per string) and the keys of `dependencies`,
 * `dev-dependencies`, `build-dependencies` and `workspace.dependencies` (one `dependency` per key, its section the table's dotted name,
 * its group null) and of `target.<spec>.dependencies`, `.dev-dependencies` and `.build-dependencies` (section `target.dependencies`,
 * `target.dev-dependencies` or `target.build-dependencies`, group the `<spec>` key). A dependency's name is its key, never the `package`
 * value that renames it. Each table on the way to a read field must be a table, or the file is a `field-type` fault. Pure. */

const SECTIONS = ['dependencies', 'dev-dependencies', 'build-dependencies'] as const;
const TOP = new Set<string>(['package', 'workspace', 'target', ...SECTIONS]);

export const isCargoManifestPath = (path: string): boolean => path === 'Cargo.toml' || path.endsWith('/Cargo.toml');

const isRead = (p: readonly string[]): boolean => p.length === 0 || (p.length === 1 && TOP.has(p[0]!))
  || (p.length === 2 && ((p[0] === 'workspace' && p[1] === 'dependencies') || p[0] === 'target'))
  || (p.length === 3 && p[0] === 'target' && (SECTIONS as readonly string[]).includes(p[2]!));

export function recognizeCargoManifest(text: string): Recognized {
  return resolveFaults(readToml(text), isRead, true, (root) => {
    const walk = new FieldWalk();
    const keys = (table: MNode | undefined, section: string, group: string | null): void => {
      if (table === undefined || !walk.is(table, 'map')) return;
      for (const entry of table.entries) { const key = walk.keyOf(entry.key); if (key !== undefined) walk.add('dependency', entry.lines, key, section, group); }
    };
    if (!walk.is(root, 'map')) return walk;
    const pkg = member(root, 'package');
    if (pkg !== undefined && walk.is(pkg.value, 'map')) {
      const name = member(pkg.value, 'name');
      if (name !== undefined && walk.is(name.value, 'string')) walk.add('package', name.lines, name.value.value);
    }
    const workspace = member(root, 'workspace');
    if (workspace !== undefined && walk.is(workspace.value, 'map')) {
      const members = member(workspace.value, 'members');
      if (members !== undefined && walk.is(members.value, 'array')) for (const item of members.value.items) if (walk.is(item, 'string')) walk.add('workspace-member', item.lines, item.value);
      keys(member(workspace.value, 'dependencies')?.value, 'workspace.dependencies', null);
    }
    for (const section of SECTIONS) keys(member(root, section)?.value, section, null);
    const target = member(root, 'target');
    if (target !== undefined && walk.is(target.value, 'map')) {
      for (const spec of target.value.entries) {
        const group = walk.keyOf(spec.key);
        if (group === undefined || !walk.is(spec.value, 'map')) continue;
        for (const section of SECTIONS) keys(member(spec.value, section)?.value, `target.${section}`, group);
      }
    }
    return walk;
  });
}
