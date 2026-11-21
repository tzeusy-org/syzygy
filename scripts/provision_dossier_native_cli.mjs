// Install only the public executable required by the synthetic integration
// fixtures. The runtime's independent pin governs the download, not a live
// manifest or installer. This script never executes the payload.
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dossierNativePin } from './dossier_native_pins.mjs';

async function provision(destination) {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Expected Linux x64.');
  const pin = dossierNativePin('session-launch.ts', 'URL_CLI_PROGRAM');
  if (typeof pin.version !== 'string' || !/^\d+\.\d+\.\d+$/u.test(pin.version)
    || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || pin.bytes > 512 * 1024 * 1024
    || typeof pin.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(pin.sha256)) {
    throw new Error('Invalid runtime CLI pin.');
  }
  const signal = AbortSignal.timeout(120_000);
  const url = `https://downloads.claude.ai/claude-code-releases/${pin.version}/linux-x64/claude`;
  let response;
  try {
    response = await fetch(url, { credentials: 'omit', redirect: 'error', signal, headers: { 'accept-encoding': 'identity' } });
  } catch {
    throw new Error('Could not fetch the exact public Claude release.');
  }
  if (response.status !== 200 || response.body === null || response.headers.get('content-length') !== String(pin.bytes)) {
    await response.body?.cancel();
    throw new Error('Unexpected status or content length for the pinned Claude release.');
  }
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const staging = await mkdtemp(path.join(destination, '.claude-download-'));
  const file = path.join(staging, 'claude');
  try {
    let bytes = 0;
    const sha256 = createHash('sha256');
    const meter = new Transform({
      transform(chunk, _encoding, done) {
        bytes += chunk.length;
        if (bytes > pin.bytes) return done(new Error('Pinned Claude release exceeds its byte limit.'));
        sha256.update(chunk);
        done(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(file, { flags: 'wx', mode: 0o600 }), { signal });
    if (bytes !== pin.bytes || sha256.digest('hex') !== pin.sha256) throw new Error('Pinned Claude release integrity check failed.');
    await chmod(file, 0o755);
    await rename(file, path.join(destination, pin.version));
    process.stdout.write(`Verified and installed Claude ${pin.version} Linux x64 (${bytes} bytes).\n`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

try {
  const [destination] = process.argv.slice(2);
  if (process.argv.length !== 3 || !path.isAbsolute(destination)) {
    throw new Error('Pass the absolute destination directory for the versioned fixture binary.');
  }
  await provision(destination);
} catch (error) {
  process.stderr.write(`Claude native fixture provisioning failed. ${error instanceof Error ? error.message : 'Unknown error.'}\n`);
  process.exitCode = 1;
}
