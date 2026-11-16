// rev-540: record every module URL Node loads in this process, written at exit to $REV540_LOADS (one URL per line).
// Used as `node --import <this> <entry> --help`, so the entry's whole static graph loads and the POC exits at its usage text.
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';

const loaded = new Set();
registerHooks({
  load(url, context, nextLoad) {
    loaded.add(url);
    return nextLoad(url, context);
  },
});
process.on('exit', () => { writeFileSync(process.env.REV540_LOADS, [...loaded].sort().join('\n') + '\n'); });
