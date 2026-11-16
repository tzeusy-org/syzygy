"""In a checkout (argv[1]) at 5cf4223a: swap the duplicate check back to the probe's array form and apply T6."""
import sys
root = sys.argv[1]
TEST = root + "/apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"
PLAN = root + "/apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
edits = [
    (TEST, "expect(ids.filter((id, index) => ids.indexOf(id) !== index).join(', '), 'duplicate mutation ids').toBe('');",
     "expect(ids.filter((id, index) => ids.indexOf(id) !== index), 'duplicate mutation ids').toEqual([]);"),
    (PLAN, "id: 'canonical-json-cycle-check-disabled',", "id: 'canonical-json-sorted-keys-disabled',"),
]
for path, old, new in edits:
    text = open(path, encoding="utf-8").read()
    assert text.count(old) == 1, (path, text.count(old))
    open(path, "w", encoding="utf-8").write(text.replace(old, new))
print("applied")
