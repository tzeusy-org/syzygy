# R-GP-IMPL-CLOSED-SCHEMA-1 — CC-REV-1 review of syzygy-bpyt.8.5 (one closed-schema builder and checker, PR #597), round 1
Verdict: REVISE
Reviewed commit: fe3f808bb324c1e9bfd4b227336a2af5157517f7
Subject: pr597.diff (git diff 85c54814580a09bf07e0f8d3536259e126b9ffb5 fe3f808bb324c1e9bfd4b227336a2af5157517f7) sha256 10f65f92321c2ae0c701412bb82a6d21e373a8d2b9988c7b64a979edc3a18e63

Reviewer: fresh-context PR reviewer (Claude Opus 5.5, review bead `syzygy-gd0g`), 2026-11-03. I did not write this
change. Exact head `fe3f808b`, PR base `85c54814` (the merge base with `origin/main` at review time). I read no body of
Butlers or of any observed repository; every input below is synthetic or the repository's own source.

Reviewed against: bead `syzygy-bpyt.8.5` (outcome, byte-identity and registry-bound-reader clauses); GP-Q0 of
`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` as the bead and brief state it
(behavior-preserving; no change to what a gate accepts or refuses or the reason it reports); AGENTS.md verification
rules 4, 6, 9 and 11; the PR body and `docs/evidence/syzygy-bpyt-8-5/schema-dedup-2026-11-03.json`.

## Summary

The dedup is careful and almost exactly behavior-preserving. The golden reproduces byte-identical on my machine, the
four callers are all exercised by it, the registry-bound reader is untouched, the sweeps re-derive, and the typecheck
and the targeted suites pass. One finding changes the verdict: `check`'s `oneOf` no longer swallows an exception thrown
inside an arm, as the old `try { check(candidate, value) } catch {}` did. On an array with a plain-object prototype
whose items all pass, at a `refs` position under a `oneOf` (the draft-model `disposition`), the base refuses with
`invalid-disposition` and the head throws a `TypeError`. I reproduced it through the public `validateStage('inventory')`
entry. The input cannot come from `JSON.parse`, but it is exactly the hardening class the bead names (array shape,
untrusted in-process values), the reason a gate reports changes (GP-Q0), and the evidence record says the opposite
("kept byte-for-byte"). The repair is small. Five notes follow; none blocks on its own.

## Findings

### F1 (revise): `check` under `oneOf` lets an arm's exception escape; the base turned it into `invalid-disposition`

Base `closed-schema.ts` (at `85c54814`):

```ts
for (const candidate of schema.oneOf) {
  try { check(candidate, value); return; } catch { /* try next closed arm */ }
}
throw new Error('invalid-disposition');
```

Head `closed-schema.ts` (`visit`, `oneOf` branch): each arm runs as `visit(found, arm, value, at)` with no `try`. So any
exception an arm raises, not only a recorded failure, now leaves `check`. The one reachable thrower is the repeat test
`new Set(value)` on an array whose prototype is `Object.prototype`: it passes `Array.isArray` and the key count, its
items pass, and then it is not iterable. The head's `if (walk.firstFailure && walk.failures.length > 0) return;` stops
only when an item already failed, so a valid-item array still gets to `new Set`.

Probe (a vitest file I placed at `packages/polaris-dossier/src/zz-r597-probe.test.ts` while running, then removed; the
file's sha256 was `87d99208212b5fb2f836c61b9671dfc41a87244023ab8c235f10aed4c3b554c4`). The base side ran on the head
tree with every non-test source in the diff checked out from `bcb259aa`, and `closed-schema.test.ts` moved aside:

```ts
const protoArr = (items: unknown[]) => Object.setPrototypeOf([...items], Object.prototype);
check(disposition, { kind: 'produced', assetIds: protoArr(['a1']) });
check(disposition, { kind: 'omitted', reason: 'r', references: protoArr(['a1']) });
validateStage('inventory', { entries: [{ id: 'i1', sourceIds: ['s1'], statement: 'P', kind: 'purpose',
  disposition: { kind: 'produced', assetIds: protoArr(['intro']) } }] }, { sources: [{ sourceId: 's1', text: 'P' }] });
```

| case | base `bcb259aa` | head `fe3f808b` |
|---|---|---|
| `check(disposition, produced + protoArr)` | `THROW Error: invalid-disposition` | `THROW TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))` |
| `check(disposition, omitted + protoArr)` | `THROW Error: invalid-disposition` | `THROW TypeError: …` (same) |
| `validateStage('inventory', …)` | `THROW Error: invalid-disposition` | `THROW TypeError: …` (same) |
| same array outside any `oneOf` (`entries[0].sourceIds`) | `THROW TypeError: …` | `THROW TypeError: …` (preserved) |
| hole + named key under `oneOf` (`check`) | `THROW Error: invalid-disposition` | `THROW Error: invalid-disposition` (preserved) |
| `checkShape`, arm 1 passes, arm 2 would throw | `THROW TypeError: …` | `THROW TypeError: …` (preserved for my case) |

The golden misses this because its `protoArr` replacement is `Object.setPrototypeOf([1], Object.prototype)`: the item
`1` fails `handle` first, so `check` stops before the repeat test. The record's own `firstAfterRun` note found the
neighbouring case (165 differing cases) and repaired it with the early stop, which covers an item breach but not a
passing one. The `knownPreserved` sentence ("`check` refuses the first and stops before the second", in the PR body)
is true only when an item has failed.

Why it is revise and not a note: it changes the reason a gate reports for a hardening input (GP-Q0), on a path the bead
lists ("hardening against untrusted drafts … array shape"), and the PR's evidence asserts the opposite. Possible repairs,
for the author: restore the swallow for the throwing form only (in `check` mode, run each arm's `visit` in a
`try`/`catch` that treats a throw as that arm's failure), or route the decision to the owner if the new behavior is
wanted. Either way, add a golden or test case with valid items in a plain-object-prototype array at a `oneOf` `refs`
position, and correct the `knownPreserved` text.

### N1 (note): the array key-count predicate has no killing test and the golden does not exercise it

Mutant `keycount` (on the head bytes of `closed-schema.ts`, sha256 `31910355f0919a0e163c775af34f48d56c15e96ed8fb710a0d762db8116d41c0`):

- old: `if (!Array.isArray(value) || Object.keys(descriptors).length !== value.length + 1) { fail(walk, 'invalid-array'`
- new: `if (!Array.isArray(value)) { fail(walk, 'invalid-array'`

Outcome: survived. The PR's seven-file set gave `Tests 253 passed (253)`. The full suites of
`packages/polaris-generation-core`, `packages/polaris-dossier` and `packages/polaris-generation-consent` gave
`Test Files 64 passed (64)`, `Tests 2789 passed | 1 skipped (2790)`. This is the "array shape" check (an array with an
extra named key, or a hole), which the brief and bead call hardening. The record's nine mutants leave it out. The golden
does not exercise it either: its only holey array also carries a named key, so the key count still matches, and no
mutant adds a named key to a full array. A `git grep` of the base test files for that construction found none, so the
gap is probably older than this PR [Inferred; I did not run the mutant at base]. Rule 6 is unmet for this predicate.
A one-line test (an array with an extra named key: `check` gives `invalid-array`, `checkShape` gives
`$ … must be an array`) would kill it.

### N2 (note): the proxy guard in `discriminatorsMatch` survives

- old: `if (typeof value !== 'object' || value === null || Array.isArray(value) || types.isProxy(value)) return false;`
- new: `if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;`

Survived on the seven-file set (`253 passed`). It only chooses which arm `checkShape` reports against: every arm has
already refused a proxy as `must be an object`. But without it, a proxy's `getOwnPropertyDescriptor` trap runs during
reporting. The base had the same unpinned guard. A test-only follow-up.

### N3 (note): golden caller coverage holds; two stage schemas are emitted but never checked

I copied `golden-capture.test.ts.txt` to `packages/polaris-dossier/src/zz-bpyt85-golden.test.ts`, ran it with
`GOLDEN_OUT` at the head tree and again with the base sources swapped in (as for F1), then removed it. Both outputs have
sha256 `bf3f630d265cba4b40045e4f4a9e43575eea6ecf9c20c5c4f72b3148129d0cea`, the record's figure. The populations are
`documents 32, parameterRefusals 7, shape 124640, closed 34162, fixtures 4087`. All four callers are reached:

- `draft-schema.ts`: documents, and `checkDraftShape` over four schemas × four arms.
- `provider-draft.ts`: `check` over six stage schemas, and `validateStage('inventory')` fixtures.
- `draft-model.ts`: `validateDraftRecord` fixtures.
- `rendered-design.ts`: `renderedDesignVerdict` fixtures.

`edit` and `repair` appear only as emitted documents and are never checked. Each vitest run also ended with exit 1
from `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`, after `Tests 1 passed (1)`, on both sides. That is a
harness artifact of one 327 s test and the output is not affected, but the record's `how` should say so, so that a
re-runner does not read the exit code (rule 4).

### N4 (note): the `/live` surface now exports shared, unfrozen schema constants

`live.ts` adds `check, checkShape, choice, handle, list, object, one, ref, refs, text` and three types. The island
boundary is unchanged, since `closed-schema.ts` was already reachable through `draft-model.ts`, and its imports are
`node:util` and `./source-model.js` only. But `text` and `handle` are mutable exported objects that `draft-schema.ts`
(dossier) and the provider and rendered-design schemas now share by reference. Before this PR the dossier kept private
copies. An in-process importer that mutates `text.maxLength` now moves every schema at once. No code does this today.
Freezing the two constants would close it without changing an emitted byte [Inferred; not run].

### N5 (note): the evidence record's subject commit is not on the PR branch

`subject.commit` `ba8eb516` and `golden.beforeCommit` `bcb259aa` predate the rebase onto `85c54814`. `ba8eb516` is not
an ancestor of the head. It differs from `f269361d` only in the four `docs/evidence/syzygy-bpyt-7-7/` files, and
`bcb259aa` differs from `85c54814` the same way. All five `subject.files` digests equal the head's bytes (checked by
script), so the record can still be checked against the bytes it describes (rule 11). Citing the head commit as well
would save the next reader this derivation.

## Checks that held

- Registry-bound reader: `git diff --quiet 85c54814 fe3f808b -- packages/polaris-dossier/src/git-object-reader.ts`
  is clean, and its sha256 is `9f33e5fbbf464b1df28b79c3fcf5016b8ad7db1910041734c5fb8e4a790998f3`, the record's figure.
- `check` versus the base `check`, apart from F1, is equivalent by reading:
  - Same codes in the same order: structure, property, array, object, fields.
  - The missing-field-first order holds.
  - Fields are walked in the value's key order.
  - Every caller of `check` uses `object()` with no optional fields.
  - No `check` schema uses `integer` or `$ref` (`git grep` over the three caller files: none).
- `checkShape` versus the base `checkDraftShape` is equivalent by reading, apart from throwing inputs:
  - Error cap: the base pushed without a cap and sliced to 50; the head caps at 50. Both keep the same prefix.
  - `oneOf`: the head stops at the first passing arm, so a later arm's throw is skipped. Only throwing inputs can tell
    the difference, and it is not exercised by my case.
- Mutants re-run on the PR's seven-file set (head bytes as above; baseline `253 passed (253)`):
  - `proxy`: 2 failed.
  - `prototype`: 1 failed.
  - `hole`: 1 failed.
  - All three match the record's counts, with the record's `old`/`new` fragments. Mine are N1 (survived) and N2
    (survived).
- Sweeps (rule 9) over the same 75 production files (the record's roots, excluding `*.test.ts` and `*.testkit.ts`),
  Python `re`:
  - `'oneOf' in schema`: 1 hit (`closed-schema.ts`).
  - The builder regex: 23 hits, of which 8 are schema builders, all in `closed-schema.ts`.
  - `sha256` definitions: 0.
  - Record-test definitions: 0.
  - `new Date(…).toISOString()`: 8 lines remain, in `iso-of.ts`, `package-reader.ts` and `polaris.ts`, as the
    record's sweep reading explains.
  - The pinned-revision regex appears once in `draft-schema.ts`.
- The nine `isoOf` sites are 1 + 1 + 1 + 3 + 1 + 2 across six files, each a direct `new Date(x).toISOString()`
  replacement. `discovery-provider`'s `isPlainRecord` equals the old local `isRecord`.
- `npm run typecheck`: exit 0.
