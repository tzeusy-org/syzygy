// Check runner prerequisites before integration tests. Read executable bytes,
// never run Claude, load credentials, or connect to a provider here.
import { spawnSync } from 'node:child_process';
import { accessSync, constants, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const sourceRoot = new URL('../packages/polaris-dossier/src/', import.meta.url);
const childEnv = { PATH: '/usr/bin:/bin', LANG: 'C' };
const MiB = 1024 * 1024;

// Runtime modules import other workspace modules. Read their literal pins
// without running the modules or needing a compiled runtime in this job.
function sourcePin(file, name) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, sourceRoot), 'utf8'), ts.ScriptTarget.Latest);
  const declarations = source.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name);
  const initializer = declarations[0]?.initializer;
  if (declarations.length !== 1 || !initializer) throw new Error('missing pin declaration');
  if (ts.isCallExpression(initializer) && initializer.expression.getText(source) === 'Object.freeze'
    && initializer.arguments.length === 1 && ts.isObjectLiteralExpression(initializer.arguments[0])) {
    const entries = initializer.arguments[0].properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) throw new Error('nonliteral pin property');
      return [property.name.text, literal(property.initializer)];
    });
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('duplicate pin property');
    return Object.fromEntries(entries);
  }
  return literal(initializer);
}

function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  throw new Error('nonliteral pin value');
}

function command(executable, args) {
  const result = spawnSync(executable, args, {
    env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    timeout: 5000, killSignal: 'SIGKILL', maxBuffer: 4096,
  });
  return result.status === 0 && result.signal === null && result.error === undefined ? result.stdout : null;
}

function executable(file) {
  const resolved = realpathSync(file);
  accessSync(resolved, constants.X_OK);
  const stat = lstatSync(resolved);
  if (!stat.isFile()) throw new Error('executable is not a regular file');
  return { resolved, stat };
}

function pinnedExecutable(file, sha256, maxBytes, exactBytes) {
  if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(sha256)) return false;
  const { resolved, stat } = executable(file);
  if (stat.size < 1 || stat.size > maxBytes || (stat.mode & 0o022) !== 0) return false;
  if (exactBytes !== undefined && (stat.size !== exactBytes || stat.nlink !== 1)) return false;
  const digest = command('/usr/bin/sha256sum', ['--', resolved]);
  return digest?.slice(0, 64) === sha256;
}

const requirements = [
  ['Linux x64 and an unprivileged orca fixture account',
    () => process.platform === 'linux' && process.arch === 'x64' && process.getuid() !== 0 && userInfo().username === 'orca'],
  ['exact Node release and executable permissions',
    () => {
      const pin = sourcePin('git-memory-worker.ts', 'NODE_VERSION');
      const { stat } = executable(process.execPath);
      return process.version === pin && stat.size <= 128 * MiB && (stat.mode & 0o022) === 0;
    }],
  ['pinned Claude executable at ~/.local/share/claude/versions/<version>',
    () => {
      const pin = sourcePin('session-launch.ts', 'URL_CLI_PROGRAM');
      return typeof pin.version === 'string' && /^\d+\.\d+\.\d+$/u.test(pin.version) && Number.isSafeInteger(pin.bytes)
        && pinnedExecutable(path.join(homedir(), '.local/share/claude/versions', pin.version), pin.sha256, 512 * MiB, pin.bytes);
    }],
  ['pinned Git HTTP helper',
    () => {
      const pin = sourcePin('git-memory-transport.ts', 'GIT_MEMORY_HELPER_PROFILE');
      return pinnedExecutable(pin.path, pin.sha256, 16 * MiB);
    }],
  ['pinned OpenSSH client',
    () => {
      const pin = sourcePin('git-memory-ssh.ts', 'GIT_MEMORY_SSH_PROFILE');
      return pinnedExecutable(pin.path, pin.sha256, 16 * MiB);
    }],
  ['OpenSSH loopback server tools and /run/sshd',
    () => {
      for (const file of ['/usr/sbin/sshd', '/usr/lib/openssh/sshd-auth', '/usr/lib/openssh/sshd-session',
        '/usr/bin/ssh-keygen', '/usr/bin/ssh-agent', '/usr/bin/ssh-add']) executable(file);
      accessSync('/run/sshd', constants.X_OK);
      return statSync('/run/sshd').isDirectory();
    }],
  ['Git, C11 compiler driver and zsh',
    () => {
      for (const file of ['/usr/bin/git', '/usr/bin/cc', '/usr/bin/zsh']) executable(file);
      return true;
    }],
  ['bubblewrap namespace setup',
    () => command(sourcePin('session-url-view.ts', 'URL_SESSION_BWRAP'),
      ['--unshare-all', '--unshare-user', '--die-with-parent', '--new-session', '--cap-drop', 'ALL', '--clearenv',
        '--ro-bind', '/usr', '/usr', '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp',
        '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
        '--', '/usr/bin/true']) !== null],
  ['prlimit with an inert process',
    () => command('/usr/bin/prlimit', ['--core=0:0', '--', '/usr/bin/true']) !== null],
  ['strace with an inert process',
    () => command('/usr/bin/strace', ['-qq', '-f', '-e', 'trace=none', '-o', '/dev/null', '--', '/usr/bin/true']) !== null],
  ['Python pidfd and Linux /proc',
    () => command('/usr/bin/python3', ['-I', '-c', "import os; os.stat('/proc/self/task'); os.close(os.pidfd_open(os.getpid()))"]) !== null],
];

let failures = 0;
for (const [label, check] of requirements) {
  let passed = false;
  try { passed = check() === true; } catch { /* Keep command output and runner paths out of diagnostics. */ }
  if (passed) process.stdout.write(`Available: ${label}\n`);
  else {
    process.stderr.write(`Required for dossier native integration: ${label}\n`);
    failures++;
  }
}
if (failures > 0) {
  process.stderr.write(`Dossier native integration prerequisites failed (${failures}/${requirements.length}).\n`);
  process.exitCode = 1;
}
