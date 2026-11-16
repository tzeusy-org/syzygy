"""Apply the W7 spread edit to the runner in a checkout (argv[1]); argv[2] = 'apply' or 'check'."""
import sys
RUNNER = "apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts"
OLD = "  'packages/polaris-generation-core/src/provider-draft.test.ts',\n] as const;"
NEW = "  'packages/polaris-generation-core/src/provider-draft.test.ts',\n  ...['packages/polaris-generation-core/src/island-boundary.test.ts'],\n] as const;"
path = sys.argv[1] + "/" + RUNNER
text = open(path, encoding="utf-8").read()
assert text.count(OLD) == 1, text.count(OLD)
open(path, "w", encoding="utf-8").write(text.replace(OLD, NEW))
print("W7 applied")
