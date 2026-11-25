import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const POLICY_GIT_SOURCES = [
  'packages/polaris-dossier/src/policy-git.c',
  'packages/polaris-dossier/src/policy-git-supervisor.c',
  'packages/polaris-dossier/src/policy-git-protocol.h',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = async file => {
  const resolved = await realpath(file), bytes = await readFile(resolved);
  return { path: resolved, bytes: bytes.length, sha256: hash(bytes) };
};
function dependencies(makefile) {
  const body = makefile.replace(/\\\r?\n/gu, '').split(':').slice(1).join(':');
  const files = [];
  let token = '', escaped = false;
  for (const character of body) {
    if (escaped) { token += character; escaped = false; }
    else if (character === '\\') escaped = true;
    else if (/\s/u.test(character)) { if (token) files.push(token); token = ''; }
    else token += character;
  }
  if (escaped) throw new Error('incomplete native dependency escape');
  if (token) files.push(token);
  if (!files.length) throw new Error('missing native compiler dependencies');
  return [...new Set(files)];
}

/** Compile frozen preprocessor output, so the header-consuming and object-
 * producing stages have a retained byte identity. The dependency identities
 * are build provenance; installed runtimes do not need a compiler or headers.
 * This is not a hermetic compiler/linker claim. */
export async function compileDossierPolicyGit(root, capture) {
  if (process.platform !== 'linux' || process.arch !== 'x64' || process.version !== 'v24.6.0') {
    throw new Error('policy Git runtime requires the supported Linux x64 Node v24.6.0 build profile');
  }
  const node = await realpath(process.execPath);
  const include = path.resolve(path.dirname(node), '../include/node');
  const compiler = await identity('/usr/bin/cc'), git = await identity('/usr/bin/git');
  const temporaryRoot = path.join(os.homedir(), '.tmp');
  await mkdir(temporaryRoot, { recursive: true });
  const scratch = await realpath(await mkdtemp(path.join(temporaryRoot, 'syzygy-policy-git-build-')));
  await chmod(scratch, 0o700);
  const sources = new Map(), headers = new Map(), units = [], outputs = new Map();
  try {
    for (const name of POLICY_GIT_SOURCES) {
      const bytes = await readFile(path.join(root, name)); capture(name, bytes);
      const local = path.join(scratch, path.basename(name));
      await writeFile(local, bytes, { flag: 'wx', mode: 0o600 });
      sources.set(local, name);
    }
    const base = ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2'];
    for (const [source, output, flags] of [
      ['policy-git.c', 'host/policy-git.node', ['-fPIC', '-shared', '-pthread']],
      ['policy-git-supervisor.c', 'host/policy-git-supervisor', []],
    ]) {
      const preprocessed = source + '.i', depfile = source + '.d', binary = source + '.out';
      const preprocess = [...base, ...flags, '-DNAPI_VERSION=8', '-I', include, '-E', '-MD', '-MF', depfile, source, '-o', preprocessed];
      const compile = [...base, ...flags, preprocessed, '-Wl,-z,relro,-z,now', '-o', binary];
      const options = { cwd: scratch, env: { PATH: '/usr/bin:/bin', LANG: 'C' }, stdio: 'pipe', timeout: 10_000, maxBuffer: 65_536 };
      // Discover the external closure first, then bracket the actual frozen
      // preprocessing pass with its identities. A first hash taken only after
      // preprocessing could describe a replacement header, not its input.
      execFileSync(compiler.path, preprocess, options);
      const consumed = dependencies((await readFile(path.join(scratch, depfile))).toString('utf8'));
      const unitHeaders = [];
      for (const dependency of consumed) {
        const file = await realpath(path.resolve(scratch, dependency));
        if (sources.has(file)) continue;
        const record = await identity(file), prior = headers.get(record.path);
        if (prior && (prior.bytes !== record.bytes || prior.sha256 !== record.sha256)) throw new Error('native header changed during build');
        headers.set(record.path, record); unitHeaders.push(record.path);
      }
      execFileSync(compiler.path, preprocess, options);
      const finalDependencies = [];
      for (const dependency of dependencies((await readFile(path.join(scratch, depfile))).toString('utf8'))) {
        const file = await realpath(path.resolve(scratch, dependency));
        if (!sources.has(file)) finalDependencies.push(file);
      }
      if (JSON.stringify([...new Set(finalDependencies)].sort()) !== JSON.stringify([...new Set(unitHeaders)].sort())) {
        throw new Error('native header closure changed during preprocessing');
      }
      for (const file of unitHeaders) {
        const record = headers.get(file), current = await identity(file);
        if (record.bytes !== current.bytes || record.sha256 !== current.sha256) throw new Error('native header changed during preprocessing');
      }
      const frozen = await readFile(path.join(scratch, preprocessed));
      execFileSync(compiler.path, compile, options);
      if (hash(await readFile(path.join(scratch, preprocessed))) !== hash(frozen)) throw new Error('native preprocessed input changed');
      const bytes = await readFile(path.join(scratch, binary));
      if (!bytes.length || bytes.length > 262_144 || !bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
        throw new Error('unexpected policy Git native output');
      }
      outputs.set(output, bytes);
      units.push({ output, source: `packages/polaris-dossier/src/${source}`,
        preprocessed: { bytes: frozen.length, sha256: hash(frozen) },
        headers: [...new Set(unitHeaders)].sort(), preprocess, compile });
    }
    for (const record of [compiler, git, ...headers.values()]) {
      const current = await identity(record.path);
      if (current.bytes !== record.bytes || current.sha256 !== record.sha256) throw new Error('native build input changed');
    }
    return { outputs, nativeBuild: { format: 'polaris-policy-git-build/1', platform: 'linux', arch: 'x64', napi: 8,
      compiler, git, headers: [...headers.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), units } };
  } finally { await rm(scratch, { recursive: true, force: true }); }
}
