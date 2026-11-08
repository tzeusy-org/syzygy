#!/usr/bin/env python3
"""Operator-run literal-fragment rule-6 checks. Restores each source in finally.
Usage: python3 docs/evidence/syzygy-bpyt-6-20/mutate.py <artifact-dir>
No broad gate runs while a source is mutated. No threshold or retry-until-green.
"""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
root = Path.cwd()
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
subject = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
factory = 'packages/three-surface-poc-core/src/git-runner.ts'
worker = 'packages/three-surface-poc-core/src/worker-change-observation.ts'
governance = 'apps/three-surface-poc/src/governance-inputs.ts'
observation = 'apps/three-surface-poc/src/git-observation.ts'
canonical = 'packages/three-surface-poc-core/src/project-shape-observation.ts'
verbatim = 'apps/three-surface-poc/src/verbatim-route.ts'
# id, source, literal old, literal new, profile (None -> unit), differential case filter
mutants = [
 ('factory-executable', factory, "execFileSync('git', argv", "execFileSync('wrong-git', argv", None, None),
 ('factory-argv-order', factory, 'const argv = [...prefix, ...args];', 'const argv = [...args, ...prefix];', None, None),
 ('factory-cwd-omission', factory, "{ stdio: [...stdio] }", "{ cwd: '/unexpected', stdio: [...stdio] }", None, None),
 ('factory-encoding', factory, '{ encoding, maxBuffer, stdio: [...stdio] }', '{ maxBuffer, stdio: [...stdio] }', None, None),
 ('factory-buffer-omission', factory, '{ stdio: [...stdio] }', '{ maxBuffer: 1, stdio: [...stdio] }', None, None),
 ('factory-stderr', factory, 'stdio: [...stdio]', "stdio: ['ignore', 'pipe', 'ignore']", None, None),
 ('factory-raw-type', factory, "return execFileSync('git', argv, { stdio: [...stdio] });", "return new Uint8Array(execFileSync('git', argv, { stdio: [...stdio] }));", None, None),
 ('factory-error-identity', factory, "return execFileSync('git', argv, { encoding, maxBuffer, stdio: [...stdio] });", "try { return execFileSync('git', argv, { encoding, maxBuffer, stdio: [...stdio] }); } catch (e) { throw new Error(String(e)); }", None, None),
 ('worker-text-mode', worker, "    encoding: 'utf8',\n", '', 1, 'invalid-utf8'),
 ('worker-buffer', worker, 'maxBuffer: 64 * 1024 * 1024', 'maxBuffer: 63 * 1024 * 1024', 1, 'stdout-bound0'),
 ('worker-stderr', worker, "stdio: ['ignore', 'pipe', 'pipe']", "stdio: ['ignore', 'pipe', 'ignore']", 1, 'nonzero-both-streams'),
 ('governance-fatal-decode', governance, "return new TextDecoder('utf-8', { fatal: true }).decode(stdout);", "return new TextDecoder('utf-8', { fatal: false }).decode(stdout);", 2, 'invalid-utf8'),
 ('governance-text-default-buffer', governance, "    stdio: ['ignore', 'pipe', 'ignore'],\n  })(args);", "    maxBuffer: 2 * 1024 * 1024,\n    stdio: ['ignore', 'pipe', 'ignore'],\n  })(args);", 2, 'stdout-bound1'),
 ('governance-text-stderr', governance, "    stdio: ['ignore', 'pipe', 'ignore'],\n  })(args);", "    stdio: ['ignore', 'pipe', 'pipe'],\n  })(args);", 2, 'nonzero-both-streams'),
 ('governance-raw-default-buffer', governance, "    stdio: ['ignore', 'pipe', 'ignore'],\n  })(['cat-file', 'blob', object]));", "    maxBuffer: 2 * 1024 * 1024,\n    stdio: ['ignore', 'pipe', 'ignore'],\n  })(['cat-file', 'blob', object]));", 3, 'stdout-bound1'),
 ('governance-raw-fidelity', governance, "})(['cat-file', 'blob', object]));", "})(['cat-file', 'blob', object]).subarray(1));", 3, 'valid-utf8-bom-nul'),
 ('repository-optional-locks', observation, "env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }", 'env: { ...process.env }', 4, 'valid-utf8-bom-nul'),
 ('repository-inherited-env', observation, "env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }", "env: { GIT_OPTIONAL_LOCKS: '0' }", 4, 'valid-utf8-bom-nul'),
 ('repository-env-freshness', observation, 'function readGit(root: string, args: readonly string[]): string {', 'const staleGitEnvironment = { ...process.env };\nfunction readGit(root: string, args: readonly string[]): string {', 'integration', 'refreshes inherited'),
 ('repository-cwd-omission', observation, "    encoding: 'utf8',", "    cwd: root,\n    encoding: 'utf8',", 4, 'valid-utf8-bom-nul'),
 ('repository-text-mode', observation, "    encoding: 'utf8',\n", '', 4, 'nonzero-both-streams'),
 ('canonical-buffer', canonical, 'maxBuffer: 256 * 1024 * 1024', 'maxBuffer: 255 * 1024 * 1024', 6, 'stdout-bound0'),
 ('canonical-argv', canonical, "prefix: ['--no-optional-locks', '-C', repoRoot]", "prefix: ['-C', repoRoot]", 6, 'valid-utf8-bom-nul'),
 ('canonical-stderr', canonical, "    stdio: ['ignore', 'pipe', 'ignore'],\n  });", "    stdio: ['ignore', 'pipe', 'pipe'],\n  });", 6, 'nonzero-both-streams'),
 ('verbatim-cwd', verbatim, 'cwd: repoRoot, ', '', 7, 'valid-utf8-bom-nul'),
 ('verbatim-envelope', verbatim, 'maxBuffer: limits.maxBytesPerSource', 'maxBuffer: 1048576', 7, 'narrow-envelope1'),
 ('verbatim-stderr', verbatim, "stdio: ['ignore', 'pipe', 'pipe']", "stdio: ['ignore', 'pipe', 'ignore']", 7, 'nonzero-both-streams'),
]
results = []
for mid, path, old, new, profile, case in mutants:
    target = root/path
    original = target.read_text()
    count = original.count(old)
    # The executable has two branches; both must still invoke git. Other mutations are single-site.
    expected_count = 4 if mid in ['factory-executable', 'factory-stderr'] else 1
    if count != expected_count:
        raise RuntimeError(f'{mid}: literal count {count}, expected {expected_count}')
    changed = original.replace(old, new)
    if mid == 'repository-env-freshness':
        changed = changed.replace("env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }", "env: { ...staleGitEnvironment, GIT_OPTIONAL_LOCKS: '0' }")
        old = original[original.index('function readGit('):original.index('export function resolvePwbRepositoryBinding')]
        new = changed[changed.index('const staleGitEnvironment'):changed.index('export function resolvePwbRepositoryBinding')]
    log = out/f'{mid}.log'
    env = dict(os.environ)
    if profile is None:
        command = ['npm', 'exec', 'vitest', 'run', '--', '--project', 'unit', 'packages/three-surface-poc-core/src/git-runner.test.ts']
    elif profile == 'integration':
        command = ['npm', 'exec', 'vitest', 'run', '--', '--project', 'integration', 'apps/three-surface-poc/src/git-observation.test.ts', '-t', case]
    else:
        command = ['node', 'docs/evidence/syzygy-bpyt-6-20/differential.mjs', str(out/mid), subject]
        env.update(G5_PROFILES=str(profile), G5_CASE_FILTER=case, G5_SKIP_CALLERS='1')
    try:
        target.write_text(changed)
        with log.open('w') as stream:
            result = subprocess.run(command, env=env, stdout=stream, stderr=subprocess.STDOUT)
    finally:
        target.write_text(original)
    text = log.read_text()
    if profile is None or profile == 'integration':
        failed = re.search(r'Tests\s+(\d+) failed', text)
        killed = result.returncode != 0 and failed is not None
        denominator = 5 if profile is None else 1
        reason = f'{failed.group(1)} failed tests' if failed else 'no executed failing test recorded'
    else:
        receipt = out/mid/'transport-differential.json'
        data = json.loads(receipt.read_text()) if receipt.exists() else {}
        denominator = data.get('cases', 0)
        killed = result.returncode != 0 and bool(data.get('differences')) and denominator > 0
        reason = data.get('differences', 'no differential receipt')
    row = {'id':mid,'subjectCommit':subject,'path':path,'subjectSha256':hashlib.sha256(original.encode()).hexdigest(),'mutantSha256':hashlib.sha256(changed.encode()).hexdigest(),'old':old,'new':new,'literalMatches':count,'command':command,'syntheticEnvironment':{k:env[k] for k in ['G5_PROFILES','G5_CASE_FILTER','G5_SKIP_CALLERS'] if k in env},'exitCode':result.returncode,'denominator':denominator,'killed':killed,'reason':reason,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()}
    results.append(row)
    (out/'mutants.json').write_text(json.dumps({'subjectCommit':subject,'harnessSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'denominator':len(mutants),'executed':len(results),'killed':sum(r['killed'] for r in results),'results':results},indent=2)+'\n')
    print(json.dumps({'id':mid,'killed':killed,'denominator':denominator}),flush=True)
if any(not r['killed'] for r in results):sys.exit(1)
