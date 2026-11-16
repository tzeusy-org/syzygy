// threshold.vitest.config.mjs: the checkout's root vitest.config.ts with hookTimeout (and optionally testTimeout)
// replaced, for the reviewer's threshold runs (R-GP-IMPL-TEST-TIMEOUTS-1). Vitest 3.2.7 passes --testTimeout to its
// projects but not --hookTimeout (cli-api `overridesOptions`), so a hook budget must come through the config file
// the projects extend. Env: REV537_ROOT (checkout), REV537_HOOK_MS (required), REV537_TEST_MS (optional).
const root = process.env.REV537_ROOT;
const base = (await import(`${root}/vitest.config.ts`)).default;
const test = { hookTimeout: Number(process.env.REV537_HOOK_MS) };
if (process.env.REV537_TEST_MS) test.testTimeout = Number(process.env.REV537_TEST_MS);
// A shallow merge: only test.hookTimeout/testTimeout and root change; vitest/config is not resolvable from here.
export default { ...base, root, test: { ...base.test, ...test } };
