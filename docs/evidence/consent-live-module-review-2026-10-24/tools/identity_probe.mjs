// Module identity across the consent root and ./live in the built (dist) form, resolved as the dossier resolves them.
// Usage: node identity_probe.mjs <tree>
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const tree = fs.realpathSync(path.resolve(process.argv[2]));
const fromDossier = createRequire(path.join(tree, 'packages/polaris-dossier/dist/screen.js'));
const rootFile = fs.realpathSync(fromDossier.resolve('@syzygy/polaris-generation-consent'));
const liveFile = fs.realpathSync(fromDossier.resolve('@syzygy/polaris-generation-consent/live'));
console.log('root resolves to', path.relative(tree, rootFile));
console.log('live resolves to', path.relative(tree, liveFile));
const root = await import(pathToFileURL(rootFile).href);
const live = await import(pathToFileURL(liveFile).href);
// Also import the bare specifiers through Node's own resolver from the dossier's dist directory.
const viaDossier = await import(pathToFileURL(path.join(tree, 'packages/polaris-dossier/dist/screen.js')).href);
const liveNames = Object.keys(live).sort();
const rootNames = Object.keys(root).sort();
const same = liveNames.filter(n => root[n] === live[n]);
console.log(`live values ${liveNames.length}; root values ${rootNames.length}; live values === root value: ${same.length}`);
console.log('live values not on root or not the same object:', liveNames.filter(n => root[n] !== live[n]));
console.log('root values not on live:', rootNames.filter(n => !Object.hasOwn(live, n)));
// instanceof across the two entry points.
let thrown;
try { live.parseAdmissionRecords('not json at all', '0'.repeat(40)); } catch (e) { thrown = e; }
console.log('parseAdmissionRecords via live threw:', thrown?.constructor?.name, '; instanceof root.AdmissionRecordError:', thrown instanceof root.AdmissionRecordError, '; instanceof live.AdmissionRecordError:', thrown instanceof live.AdmissionRecordError);
console.log('screen module loaded:', typeof viaDossier.loadDossierScreen);
