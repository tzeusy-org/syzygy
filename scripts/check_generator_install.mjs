import { existsSync } from 'node:fs';
import { join } from 'node:path';

if (!existsSync(join(process.cwd(), 'node_modules', '.bin', 'tsc'))
  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))
  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'support'))
  || !existsSync(join(process.cwd(), 'node_modules', 'parse5'))) {
  process.stderr.write('Generator dependencies are missing. Run npm ci from the repository root, then retry.\n');
  process.exitCode = 1;
}
