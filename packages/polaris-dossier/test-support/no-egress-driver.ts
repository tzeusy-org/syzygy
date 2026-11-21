import * as dgram from 'node:dgram';
import { renderLocalDossier } from '../../../apps/three-surface-poc/src/polaris-generation/dossier-site.js';
import { fullFixtureRun } from '../src/full-run.testkit.js';

/** The no-egress proof starts a process through an entry that imports this bundled driver. It runs one full fixture run through
 * the dossier commands and prints each step's exit status as one JSON line. With `canary`, it first sends one UDP datagram to the
 * loopback discard port, so the proof can show its capture sees a transmission when one is made. Test support only. */

const [clone, commit, stateRoot, mode] = process.argv.slice(2);
if (clone === undefined || commit === undefined || stateRoot === undefined) {
  process.stderr.write('usage: no-egress-driver <clone> <commit> <state root> [canary]\n');
  process.exit(2);
}
if (mode === 'canary') {
  const socket = dgram.createSocket('udp4');
  await new Promise<void>((resolve, reject) => {
    socket.send('canary', 9, '127.0.0.1', (error) => {
      socket.close();
      if (error === null) resolve();
      else reject(error);
    });
  });
}
const { run, steps } = await fullFixtureRun({ clone, commit, stateRoot, renderer: renderLocalDossier, closeArgs: ['--usage-turns', '3'] });
process.stdout.write(`${JSON.stringify({ run, steps: steps.map((step) => ({ command: step.argv[0], exit: step.exit })) })}\n`);
