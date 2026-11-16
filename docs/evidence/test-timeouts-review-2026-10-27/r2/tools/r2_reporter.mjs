// r2_reporter.mjs: round-2 reviewer's vitest reporter (R-GP-IMPL-TEST-TIMEOUTS-2). Writes R2_OUT as JSON: per file its
// state and duration, its hookMs (file duration less its direct children's durations: the file-level beforeAll/afterAll
// time), per suite the same, and every test's full name, state, duration and errors; plus unhandled errors.
import { writeFileSync } from 'node:fs';
export default class {
  onFinished(files, errors) {
    const out = { files: [], unhandled: (errors ?? []).map((e) => String(e?.message ?? e)) };
    const walk = (task, names, rows) => {
      const name = [...names, task.name].filter(Boolean);
      const r = task.result ?? {};
      if (task.type === 'test') rows.tests.push({ name: name.join(' > '), state: r.state ?? task.mode, durationMs: r.duration ?? null, errors: (r.errors ?? []).map((e) => e.message) });
      else {
        const kids = task.tasks ?? [];
        const kidMs = kids.reduce((s, k) => s + (k.result?.duration ?? 0), 0);
        rows.suites.push({ name: name.join(' > ') || '(file)', state: r.state ?? task.mode, durationMs: r.duration ?? null, hookMs: r.duration != null ? Math.round(r.duration - kidMs) : null, errors: (r.errors ?? []).map((e) => e.message) });
        for (const k of kids) walk(k, task.type === 'suite' ? name : [], rows);
      }
    };
    for (const f of files) {
      const rows = { file: f.filepath, state: f.result?.state, durationMs: f.result?.duration ?? null, collectMs: f.collectDuration ?? null, tests: [], suites: [] };
      walk({ ...f, name: '' , type: 'suite-root', tasks: f.tasks }, [], rows);
      out.files.push(rows);
    }
    writeFileSync(process.env.R2_OUT, JSON.stringify(out, null, 1));
  }
}
