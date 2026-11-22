import { FieldWalk, lineCountOf, member, resolveFaults, type Recognized } from './manifest-model.js';
import { readYaml } from './manifest-yaml.js';

/** Rule `github-actions-workflow` version 1 (REQ-polaris-generation-034 version 2.7): every blob whose path is exactly
 * `.github/workflows/<name>.yml` or `.github/workflows/<name>.yaml`, three segments, `<name>` not empty, read as YAML 1.2 under the core
 * schema, one document whose root is a mapping (`manifest-yaml.ts`, which states the forms it refuses as beyond its reader). It reads
 * `name` (a string or absent: one `workflow` fact spanning the whole file, its name the string or null), `on` (a string, a sequence of
 * strings or a mapping: one `workflow-trigger` per string or key), `jobs` (a mapping: one `job` per key) and each job's `needs` (a string or
 * a sequence of strings: one `job-needs` per string, from the job's key, to the string, whether or not it names a job of the file). A job
 * whose value is not a mapping is a `field-type` fault. Pure. */

export const isWorkflowPath = (path: string): boolean => /^\.github\/workflows\/[^/]+\.(?:yml|yaml)$/u.test(path);

const isRead = (p: readonly string[]): boolean => p.length === 0 || (p.length === 1 && (p[0] === 'on' || p[0] === 'jobs')) || (p.length === 2 && p[0] === 'jobs');

export function recognizeWorkflow(text: string): Recognized {
  return resolveFaults(readYaml(text), isRead, true, (root) => {
    const walk = new FieldWalk();
    if (!walk.is(root, 'map')) return walk;
    const name = member(root, 'name');
    if (name === undefined) walk.add('workflow', { first: 1, last: lineCountOf(text) }, null);
    else if (walk.is(name.value, 'string')) walk.add('workflow', { first: 1, last: lineCountOf(text) }, name.value.value);
    const on = member(root, 'on');
    if (on !== undefined) {
      const value = on.value;
      if (value.kind === 'string') walk.add('workflow-trigger', value.lines, value.value);
      else if (value.kind === 'array') { for (const item of value.items) if (walk.is(item, 'string')) walk.add('workflow-trigger', item.lines, item.value); }
      else if (value.kind === 'map') { for (const entry of value.entries) { const event = walk.keyOf(entry.key); if (event !== undefined) walk.add('workflow-trigger', entry.lines, event); } }
      else walk.is(value, 'string');
    }
    const jobs = member(root, 'jobs');
    if (jobs !== undefined && walk.is(jobs.value, 'map')) {
      for (const entry of jobs.value.entries) {
        const job = walk.keyOf(entry.key);
        if (job === undefined) continue;
        walk.add('job', entry.lines, job);
        if (!walk.is(entry.value, 'map')) continue;
        const needs = member(entry.value, 'needs');
        if (needs === undefined) continue;
        if (needs.value.kind === 'array') { for (const item of needs.value.items) if (walk.is(item, 'string')) walk.add('job-needs', item.lines, job, item.value); }
        else if (walk.is(needs.value, 'string')) walk.add('job-needs', needs.value.lines, job, needs.value.value);
      }
    }
    return walk;
  });
}
