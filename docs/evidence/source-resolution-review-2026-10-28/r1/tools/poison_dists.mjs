// Poison a built checkout's dists, so that any test or typecheck that reads one fails or sees a wrong value.
//
// Usage, from the checkout root after a full `npm run build`:
//   node poison_dists.mjs value <package dir>...   every export entry of each named package: each JS entry is replaced by a
//        module exporting the same names, every one 'R549-POISONED-VALUE' (functions return it); each entry's .d.ts by one
//        declaring every name as the literal type 'R549-POISONED-TYPE'.
//   node poison_dists.mjs throw                    every dist/**/*.js of every apps/* and packages/* project: a top-level throw
//        prepended; every dist/**/*.d.ts replaced by one declaration of the literal type 'R549'.
// Prints one JSON line: the files poisoned, per mode.
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [mode, ...dirs] = process.argv.slice(2);
const poisoned = [];
if (mode === 'value') {
  const writes = [];
  for (const dir of dirs) {
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    for (const [subpath, entry] of Object.entries(manifest.exports)) {
      const js = typeof entry === 'string' ? entry : entry.import ?? entry.default;
      const dts = typeof entry === 'string' ? js.replace(/\.js$/u, '.d.ts') : entry.types ?? js.replace(/\.js$/u, '.d.ts');
      const real = await import(pathToFileURL(resolve(dir, js)).href);
      const names = Object.keys(real).filter((name) => name !== 'default');
      const body = names.map((name) => typeof real[name] === 'function'
        ? `export function ${name}() { return 'R549-POISONED-VALUE'; }`
        : `export const ${name} = 'R549-POISONED-VALUE';`).join('\n');
      const declared = [...readFileSync(resolve(dir, dts), 'utf8').matchAll(/\bexport\s+(?:declare\s+)?(?:const|function|class|interface|type|enum|let|var)\s+([A-Za-z_$][\w$]*)/gu)].map((m) => m[1]);
      const reexported = [...readFileSync(resolve(dir, dts), 'utf8').matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/gu)]
        .flatMap((m) => m[1].split(',').map((part) => part.trim().replace(/^type\s+/u, '').split(/\s+as\s+/u).pop()).filter(Boolean));
      const typeNames = [...new Set([...names, ...declared, ...reexported])];
      writes.push([resolve(dir, js), `${body}\n`]);
      writes.push([resolve(dir, dts), `${typeNames.map((name) => `export declare const ${name}: 'R549-POISONED-TYPE';`).join('\n')}\n`]);
      poisoned.push({ package: manifest.name, subpath, js, jsExports: names.length, dts, dtsNames: typeNames.length });
    }
  }
  // Every real module is read before any is replaced: the packages import one another.
  for (const [path, text] of writes) writeFileSync(path, text);
} else if (mode === 'throw') {
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  for (const parent of ['apps', 'packages']) {
    for (const project of readdirSync(parent)) {
      const dist = join(parent, project, 'dist');
      if (!existsSync(dist)) continue;
      for (const path of walk(dist)) {
        if (path.endsWith('.d.ts')) { writeFileSync(path, "export declare const R549_POISONED_TYPE: 'R549';\n"); poisoned.push(path); }
        else if (path.endsWith('.js')) { writeFileSync(path, `throw new Error('R549-POISONED-DIST ${path}');\n${readFileSync(path, 'utf8')}`); poisoned.push(path); }
      }
    }
  }
} else {
  throw new Error('usage: node poison_dists.mjs value <package dir>... | throw');
}
console.log(JSON.stringify({ mode, count: poisoned.length, poisoned: mode === 'value' ? poisoned : undefined,
  js: mode === 'throw' ? poisoned.filter((p) => p.endsWith('.js')).length : undefined,
  dts: mode === 'throw' ? poisoned.filter((p) => p.endsWith('.d.ts')).length : undefined }));
