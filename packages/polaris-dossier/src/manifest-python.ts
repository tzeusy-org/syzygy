import { FieldWalk, member, requirementName, resolveFaults, type MNode, type Recognized } from './manifest-model.js';
import { readToml } from './manifest-toml.js';

/** Rule `python-project-manifest` version 1 (REQ-polaris-generation-034 version 2.7): every blob whose basename is `pyproject.toml`, read as
 * TOML v1.0.0 (`manifest-toml.ts`, which refuses a date-time or time value anywhere as beyond its reader). It reads `project.name` (a
 * string: `package`), `project.dependencies` (an array of strings: one `dependency` per string, section `project.dependencies`, group
 * null), `project.optional-dependencies` (a table of arrays of strings: section `project.optional-dependencies`, group the extra's key),
 * `dependency-groups` (a table of arrays: one `dependency` per string element, section `dependency-groups`, group the key; a table
 * element, an include, yields no fact; any other element is a `field-type` fault) and `tool.uv.workspace.members` (an array of strings:
 * one `workspace-member` per string). No other `tool` table is read, but `tool`, `tool.uv` and `tool.uv.workspace`, where present, must be
 * tables. A requirement's name is its longest leading run of `[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?`, as declared; a requirement with
 * none is a `field-type` fault. Pure. */

export const isPythonProjectPath = (path: string): boolean => path === 'pyproject.toml' || path.endsWith('/pyproject.toml');

const READ = ['', 'project', 'project/optional-dependencies', 'dependency-groups', 'tool', 'tool/uv', 'tool/uv/workspace'];
const isRead = (p: readonly string[]): boolean => READ.includes(p.join('/'));

export function recognizePythonProject(text: string): Recognized {
  return resolveFaults(readToml(text), isRead, true, (root) => {
    const walk = new FieldWalk();
    const requirements = (list: MNode, section: string, group: string | null): void => {
      if (!walk.is(list, 'array')) return;
      for (const item of list.items) {
        if (!walk.is(item, 'string')) continue;
        const name = requirementName(item.value);
        if (name === undefined) walk.fieldType = true;
        else walk.add('dependency', item.lines, name, section, group);
      }
    };
    if (!walk.is(root, 'map')) return walk;
    const project = member(root, 'project');
    if (project !== undefined && walk.is(project.value, 'map')) {
      const name = member(project.value, 'name');
      if (name !== undefined && walk.is(name.value, 'string')) walk.add('package', name.lines, name.value.value);
      const dependencies = member(project.value, 'dependencies');
      if (dependencies !== undefined) requirements(dependencies.value, 'project.dependencies', null);
      const optional = member(project.value, 'optional-dependencies');
      if (optional !== undefined && walk.is(optional.value, 'map')) {
        for (const extra of optional.value.entries) { const key = walk.keyOf(extra.key); if (key !== undefined) requirements(extra.value, 'project.optional-dependencies', key); }
      }
    }
    const groups = member(root, 'dependency-groups');
    if (groups !== undefined && walk.is(groups.value, 'map')) {
      for (const group of groups.value.entries) {
        const key = walk.keyOf(group.key);
        if (key === undefined || !walk.is(group.value, 'array')) continue;
        for (const item of group.value.items) {
          if (item.kind === 'map') continue;
          if (!walk.is(item, 'string')) continue;
          const name = requirementName(item.value);
          if (name === undefined) walk.fieldType = true;
          else walk.add('dependency', item.lines, name, 'dependency-groups', key);
        }
      }
    }
    const tool = member(root, 'tool');
    if (tool !== undefined && walk.is(tool.value, 'map')) {
      const uv = member(tool.value, 'uv');
      if (uv !== undefined && walk.is(uv.value, 'map')) {
        const workspace = member(uv.value, 'workspace');
        if (workspace !== undefined && walk.is(workspace.value, 'map')) {
          const members = member(workspace.value, 'members');
          if (members !== undefined && walk.is(members.value, 'array')) for (const item of members.value.items) if (walk.is(item, 'string')) walk.add('workspace-member', item.lines, item.value);
        }
      }
    }
    return walk;
  });
}
