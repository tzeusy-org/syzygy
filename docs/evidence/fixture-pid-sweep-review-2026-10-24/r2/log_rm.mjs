// Preload (node --import): logs every rmSync path to $R509B_RM_LOG, then calls the original.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const original = fs.rmSync;
fs.rmSync = function rmSync(path, ...rest) {
  try {
    fs.appendFileSync(process.env.R509B_RM_LOG, `${String(path)}\n`);
  } catch {
    // logging never changes the call
  }
  return original.call(this, path, ...rest);
};
syncBuiltinESMExports();
