import { createHash } from 'node:crypto';
const guard = process.argv[2] === 'guarded';
const alphabet = ['](', ' ', ')', '<', '&', '#', 'x', '1', ';'];
const inputs = [];
let layer = [''];
for (let depth = 0; depth <= 6; depth += 1) {
  for (const suffix of layer) inputs.push(`](${suffix}`);
  if (guard) { if (depth < 6) layer = layer.flatMap((prefix) => alphabet.map((token) => prefix + token)); }
  else layer = layer.flatMap((prefix) => alphabet.map((token) => prefix + token));
}
const h = createHash('sha256'); for (const s of inputs) h.update(s + '\0');
console.log(JSON.stringify({ form: process.argv[2], count: inputs.length, finalLayer: layer.length, sha256: h.digest('hex') }));
