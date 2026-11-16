
const { createVitest } = await import('vitest/node');
const vitest = await createVitest('test', { config: 'packages/cap1-system/vitest.config.ts', watch: false });
const { testModules, unhandledErrors } = await vitest.collect();
const tests = testModules.flatMap((module) => [...module.children.allTests()].map((test) => ({
  file: module.moduleId, name: test.fullName, state: test.result().state,
})));
const errors = [...testModules.flatMap((module) => module.errors()), ...unhandledErrors].map((error) => String(error?.message ?? error));
await vitest.close();
console.log('CENSUS ' + JSON.stringify({ tests, errors }));
