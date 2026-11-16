// Resolve hook: append every resolved module URL to $MODULE_LOG.
import { appendFileSync } from 'node:fs';
export async function resolve(specifier, context, next) {
  const result = await next(specifier, context);
  appendFileSync(process.env.MODULE_LOG, `${result.url}\n`);
  return result;
}
