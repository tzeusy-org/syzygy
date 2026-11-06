#!/usr/bin/env python3
"""Record conservative Vitest suite hook bounds, with raw output and resolved budgets.

Maintained successor of the frozen .4.31 hook recorder. No product source is
imported/executed by this module; its explicit operator command runs owned tests.
Run inside an owned private filesystem/process/network boundary after npm ci.

Usage: python3 -I scripts/measure_vitest_hook_durations.py TREE --file FILE
       --project e2e --mode alone|full --runs 5 --out NEW_DIRECTORY
       [--diagnostic-hook-budget 600000]

Alone runs the complete selected file. Repeat --file for each subject of a full
context. Full runs the current ordinary product
commands: check, test:integration, test:e2e (including system). Live/operator-only
tests are excluded. Full means ordinary budgets, never diagnostic overrides.
The full commands retain their guards, discovery, worker limits and assertions.
A passive Node preload adds a reporter to each Vitest run, including nested
ordinary drivers; it changes no test/configuration value. A diagnostic alone
run uses a config successor setting hookTimeout on each project, rather than
the ineffective Vitest 3.2.7 CLI hookTimeout override. Explicit hook timeouts
still win. Validate budgets and bounds with owned delayed-hook controls first.

beforeAllMs/afterAllMs include runner bookkeeping; they are conservative bounds,
not raw hook clocks. Missing/skipped/failed suites provide no valid timing.
Attempts/raw reports are retained even on failure; existing output is refused.
This recorder is evidence tooling, not a new product acceptance gate.
"""

import argparse
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import threading
import time


REPORTER = r"""import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const span = (t) => Number.isFinite(t.result?.startTime) && Number.isFinite(t.result?.duration)
  ? [t.result.startTime, t.result.startTime + t.result.duration] : null;
export default class {
  onInit(ctx) {
    this.root = ctx.config.root;
    this.budgets = ctx.projects.map(p => ({ project: p.name, hookTimeout: p.config.hookTimeout,
      testTimeout: p.config.testTimeout, maxWorkers: p.config.maxWorkers }));
  }
  onFinished(files, errors) {
    const rows = [], tests = [], fileRows = [];
    const walk = (task, names, file, project) => {
      if (task.type === 'test') {
        tests.push({ file, project, name: [...names, task.name].join(' > '),
          state: task.result?.state ?? task.mode, durationMs: task.result?.duration ?? null });
        return;
      }
      const children = (task.tasks ?? []).map(span).filter(Boolean), own = span(task);
      let first = Infinity, last = -Infinity;
      for (const child of children) { first = Math.min(first, child[0]); last = Math.max(last, child[1]); }
      rows.push({ file, project, suite: names.join(' > ') || '(file)', state: task.result?.state ?? task.mode,
        directChildren: task.tasks?.length ?? 0, timedChildren: children.length,
        beforeAllMs: own && children.length ? first - own[0] : null,
        afterAllMs: own && children.length ? own[1] - last : null,
        suiteMs: own ? own[1] - own[0] : null });
      for (const child of task.tasks ?? []) walk(child, child.type === 'suite' ? [...names, child.name] : names, file, project);
    };
    for (const f of files ?? []) {
      const file = relative(this.root, f.filepath).split('\\').join('/'), project = f.projectName ?? '';
      fileRows.push({ file, project, state: f.result?.state ?? f.mode });
      walk(f, [], file, project);
    }
    writeFileSync(join(process.env.SYZYGY_HOOK_REPORT_DIRECTORY, `report-${process.pid}.json`), JSON.stringify({
      schema: 'vitest-hook-reporter/2', root: this.root, budgets: this.budgets,
      boundInterpretation: 'suite-to-first-child and last-child-to-suite-end, including runner bookkeeping',
      files: fileRows, rows, tests, unhandledErrors: (errors ?? []).map(e => ({ name: e?.name, message: String(e?.message ?? e) }))
    }, null, 2) + '\n', { flag: 'wx' });
  }
}
"""

PRELOAD = r"""import { basename } from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
const entry = process.argv[1];
if (entry && existsSync(entry) && basename(realpathSync(entry)) === 'vitest.mjs' && process.argv[2] === 'run') {
  if (!process.argv.some(a => a === '--reporter' || a.startsWith('--reporter='))) process.argv.push('--reporter=default');
  process.argv.push(`--reporter=${process.env.SYZYGY_HOOK_REPORTER}`);
}
"""


def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_json(p, value):
    with Path(p).open('x', encoding='utf8') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tree', type=Path)
    parser.add_argument('--file', action='append', required=True)
    parser.add_argument('--project', required=True)
    parser.add_argument('--mode', choices=['alone', 'full'], required=True)
    parser.add_argument('--runs', type=int, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--config', type=Path)
    parser.add_argument('--diagnostic-hook-budget', type=int)
    args = parser.parse_args()
    tree, out = args.tree.resolve(), args.out.resolve()
    if args.runs < 1 or (args.diagnostic_hook_budget is not None and (args.mode != 'alone' or args.diagnostic_hook_budget < 1)):
        parser.error('positive run count; diagnostic hook budget is positive and alone-only')
    if args.mode == 'full' and args.config:
        parser.error('full ordinary contexts use the canonical configuration')
    if args.mode == 'alone' and len(args.file) != 1:
        parser.error('alone selects exactly one complete file')

    def git(*argv):
        return subprocess.check_output(['git', *argv], cwd=tree, text=True).strip()

    if git('status', '--porcelain=v1', '--untracked-files=no'):
        parser.error('tracked subject is not clean')
    for name in args.file:
        selected = tree / name
        if Path(name).is_absolute() or not selected.is_file() or not selected.resolve().is_relative_to(tree):
            parser.error('file must name a real file within the subject')
        committed = subprocess.run(['git', 'show', f'HEAD:{name}'], cwd=tree, capture_output=True)
        if committed.returncode != 0 or committed.stdout != selected.read_bytes():
            parser.error('selected file must match its committed subject bytes')
    out.mkdir(parents=True, exist_ok=False)
    reporter, preload = out / 'hook-reporter.mjs', out / 'hook-preload.mjs'
    reporter.write_text(REPORTER)
    preload.write_text(PRELOAD)
    ordinary_config = args.config.resolve() if args.config else tree / 'vitest.config.ts'
    config = ordinary_config
    if args.diagnostic_hook_budget:
        config = out / 'diagnostic.config.mjs'
        config.write_text('import base from ' + json.dumps(ordinary_config.as_uri()) + ';\n'
            'export default { ...base, test: { ...base.test, projects: base.test.projects.map(p => ({ ...p, test: { ...p.test, hookTimeout: '
            + str(args.diagnostic_hook_budget) + ' } })) } };\n')

    # Reuse the established pidfd/subreaper implementation without changing it.
    supervisor_path = tree / 'scripts/check_unit_tmpdir_child.py'
    spec = importlib.util.spec_from_file_location('owned_lifetime', supervisor_path)
    lifetime = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lifetime)
    files = [*args.file, 'package-lock.json', 'vitest.config.ts', 'vitest.setup.ts', 'vitest.tiers.ts',
             'apps/three-surface-poc/src/cdp-browser.ts', 'scripts/check_unit_tmpdir_child.py']
    browser = Path(os.environ['SYZYGY_POC_BROWSER']).resolve() if os.environ.get('SYZYGY_POC_BROWSER') else None
    record = {'schema': 'vitest-hook-durations/2', 'startedAt': now(), 'subject': {'commit': git('rev-parse', 'HEAD'),
        'files': {f: digest(tree / f) for f in files}}, 'tool': {'path': str(Path(__file__).resolve()), 'sha256': digest(__file__),
        'reporterSha256': digest(reporter), 'preloadSha256': digest(preload), 'supervisorSha256': digest(supervisor_path)},
        'host': {'platform': platform.platform(), 'cores': os.cpu_count(), 'node': subprocess.check_output(['node', '--version'], text=True).strip()},
        'vitest': json.loads((tree / 'node_modules/vitest/package.json').read_text())['version'],
        'browser': None if browser is None else {'executable': str(browser), 'sha256': digest(browser),
            'version': subprocess.check_output([str(browser), '--version'], text=True).strip()},
        'mode': args.mode, 'project': args.project, 'selectedFiles': args.file,
        'diagnosticHookBudget': args.diagnostic_hook_budget,
        'ordinaryConfig': {'path': str(ordinary_config), 'sha256': digest(ordinary_config)},
        'config': {'path': str(config), 'sha256': digest(config)},
        'loadSamplingSeconds': 5, 'runs': []}
    write_json(out / 'subject.json', record)
    commands = ([['node', str(tree / 'node_modules/vitest/vitest.mjs'), 'run', '--config', str(config), '--project', args.project, args.file[0]]]
                if args.mode == 'alone' else [['npm', 'run', name] for name in ['check', 'test:integration', 'test:e2e']])
    original_cwd = Path.cwd()
    os.chdir(tree)
    stopped = False
    try:
        for index in range(1, args.runs + 1):
            run_dir = out / f'run-{index:02d}'
            run_dir.mkdir()
            run = {'index': index, 'startedAt': now(), 'commands': []}
            for number, command in enumerate(commands, 1):
                step = run_dir / f'command-{number:02d}'
                step.mkdir()
                reports = step / 'reports'
                reports.mkdir()
                environment = {'SYZYGY_HOOK_REPORTER': str(reporter), 'SYZYGY_HOOK_REPORT_DIRECTORY': str(reports)}
                # The child receives only this declared environment, through a shell-free exec.
                launcher = step / 'launch.py'
                launcher.write_text('import os\nenv = {**os.environ, **' + repr(environment) + '}\n'
                    + 'env["NODE_OPTIONS"] = (os.environ.get("NODE_OPTIONS", "") + '
                    + repr(' --import=' + preload.as_uri()) + ').strip()\n'
                    + 'os.execvpe(' + repr(command[0]) + ', ' + repr(command) + ', env)\n')
                samples, stop = [os.getloadavg()[0]], threading.Event()

                def sample():
                    while not stop.wait(5):
                        samples.append(os.getloadavg()[0])

                sampler = threading.Thread(target=sample, daemon=True)
                started, tick = now(), time.monotonic()
                sampler.start()
                # Save both complete streams independently, never replace them with a tail.
                stdout_fd, stderr_fd = os.dup(1), os.dup(2)
                try:
                    with (step / 'stdout.log').open('xb') as stdout, (step / 'stderr.log').open('xb') as stderr:
                        sys.stdout.flush()
                        sys.stderr.flush()
                        os.dup2(stdout.fileno(), 1)
                        os.dup2(stderr.fileno(), 2)
                        result = lifetime.supervise([sys.executable, str(launcher)])
                finally:
                    os.dup2(stdout_fd, 1)
                    os.dup2(stderr_fd, 2)
                    os.close(stdout_fd)
                    os.close(stderr_fd)
                    stop.set()
                    sampler.join()
                samples.append(os.getloadavg()[0])
                entry = {'command': command, 'startedAt': started, 'finishedAt': now(), 'wallSeconds': time.monotonic() - tick,
                    'load1': {'start': samples[0], 'end': samples[-1], 'min': min(samples), 'max': max(samples), 'samples': samples},
                    'lifetime': result, 'reports': [{'path': str(p.relative_to(out)), 'sha256': digest(p)} for p in sorted(reports.glob('*.json'))],
                    'streams': {n: {'path': str((step / n).relative_to(out)), 'bytes': (step / n).stat().st_size, 'sha256': digest(step / n)}
                                for n in ['stdout.log', 'stderr.log']}}
                write_json(step / 'attempt.json', entry)
                run['commands'].append(entry)
                print(json.dumps({'run': index, 'command': number, 'lifetime': result, 'reports': len(entry['reports'])}), flush=True)
                if result['code'] != 0 or not result['lifetime']['complete'] or result['signalError'] or result['interrupted']:
                    stopped = True
                    break
            run['finishedAt'] = now()
            write_json(run_dir / 'run.json', run)
            record['runs'].append(run)
            if stopped:
                break
    finally:
        os.chdir(original_cwd)
    record['finishedAt'] = now()
    record['subjectUnchanged'] = git('rev-parse', 'HEAD') == record['subject']['commit'] and not git('status', '--porcelain=v1', '--untracked-files=no')
    write_json(out / 'result.json', record)
    return 1 if stopped or not record['subjectUnchanged'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
