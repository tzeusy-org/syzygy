// tree_reporter.mjs: a Vitest reporter that writes the finished task tree of a run to $REV537_OUT as JSON
// (R-GP-IMPL-TEST-TIMEOUTS-1). Per task: type, name, location, mode, state, duration, and each error's first line.
// Per file and suite it also writes `hookMs`, its duration less the sum of its direct children's durations: the time
// its own beforeAll/afterAll hooks took (plus scheduling gaps), the reviewer's second method for hooks. The first
// method is the run's own --hookTimeout: a hook that reaches it fails with "Hook timed out".
import { writeFileSync } from 'node:fs';

const firstLine = (e) => String(e?.message ?? e).split('\n')[0].slice(0, 300);
function node(t) {
  const r = t.result ?? {};
  const out = {
    type: t.type, name: t.name, line: t.location?.line ?? null, mode: t.mode, state: r.state ?? null,
    durationMs: r.duration ?? null, errors: (r.errors ?? []).map(firstLine),
  };
  if (t.tasks) {
    out.tasks = t.tasks.map(node);
    const children = out.tasks.reduce((s, c) => s + (c.durationMs ?? 0), 0);
    out.hookMs = r.duration == null ? null : Math.round(r.duration - children);
  }
  return out;
}
export default class TreeReporter {
  onFinished(files, errors) {
    const out = files.map((f) => ({
      file: f.filepath, project: f.projectName ?? null, ...node(f),
      collectMs: f.collectDuration ?? null, setupMs: f.setupDuration ?? null, prepareMs: f.prepareDuration ?? null,
      environmentMs: f.environmentLoad ?? null,
    }));
    writeFileSync(process.env.REV537_OUT, JSON.stringify({ files: out, unhandled: (errors ?? []).map(firstLine) }, null, 1));
  }
}
