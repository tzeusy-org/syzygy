# R-GP-IMPL-TEST-KIT-1: PR #624 (syzygy-bpyt.4.4 first slice, private packages/test-kit)

Verdict: REVISE
Reviewed commit: 9737c32232a5370b78406bb528cf8df84ad4bf6c
Subject: PR #624

Reviewer: fresh-context CC-REV-1 pass, scratch detached worktree at the reviewed commit, `npm ci`, no `dist/` present at the start.

## Scope read

Bead syzygy-bpyt.4.4 (remainder filed as syzygy-7zyr, not faulted). Diff against origin/main: new `packages/test-kit` (temp-dir, git-repo, blob-id, html-query, index, two test files, package.json), `esbuild ^0.28.2` root devDependency, `@syzygy/test-kit` devDependency of polaris-dossier, four polaris-dossier tests replacing an inline `GIT_ENV` with the kit's, one `vitest.tiers.ts` row.

## Commands run (reviewed commit, TMPDIR=/tmp/r624)

- `npm run typecheck`: exit 0.
- `npm test` (unit project): 165 files, 3604 tests passed.
- `npm run test:tiers`: ok, every test file in exactly one tier (unit 165, integration 87, e2e 24, live 3).
- `npm run build`: completed without error.
- `npm run test:integration`: 1 failed of 87 files. `apps/three-surface-poc/src/git-observation.test.ts`, "refuses exactly the projects the POC start compiles or loads, and the files that define its build": "the workspaces the probes are built over; a new workspace needs its probes reviewed: expected [...] to have a length of 12 but got 13".
- `npx vitest run --project e2e`: 1 failed of 13 files. `packages/polaris-dossier/src/no-egress.test.ts`, "aliases every workspace package entry to the src module its exports, or its main, names": `expected { ...(19) } to deeply equal { ...(18) }` (the literal alias table has no `@syzygy/test-kit` entry).
- The four touched dossier tests plus the kit tests pass (6 files, 230 tests).
- Hosted checks on the head: node (unit) pass; node (integration), node (e2e) and the aggregate `node` fail on the same two assertions (run 41679368033), reproduced locally.

## Findings

F1 (blocking). Adding a thirteenth workspace breaks `git-observation.test.ts:201`, whose message says a new workspace needs its probes reviewed. The PR neither updates the count nor the probes. The probe set decides which projects the POC start's compiled/loaded surface refuses, so the count change is a gate-population decision, not a mechanical edit: the PR author must review the probes for `packages/test-kit` and say so. GP-Q0 flag: if review shows the refusal set changes, that is an owner question.

F2 (blocking). `no-egress.test.ts` pins the full alias table as a literal; the kit adds `@syzygy/test-kit` (a `source` export) and the literal was not extended. Expected values are literals by design, so the fix is to add the entry, with the same review that F1 requires of whether the no-egress bundle should resolve a test-only package at all.

F3 (low). `packages/test-kit/package.json` exports `types`/`import`/`default` under `dist/`, but the package has no `tsconfig.json` and is in no build list, so those paths can never exist. Under the `source` condition nothing breaks; a `dist` consumer would get a dead path. Either export `source` only, or state that the dist entries are inert.

F4 (low). Only `GIT_ENV` is consumed by the slice. `gitRepo`, `git`, `tempDir`, `gitBlobId`, `tagsOf`, `attributeValues` and `GIT_ENV_NO_MAINTENANCE` have no consumer; they are exercised only by the kit's own tests. Acceptable as a first slice if adoption is tracked in syzygy-7zyr; noted because the PR body should say it.

F5 (note). `tempDir` registers teardown through `globalThis.syzygyAfterTestFile` (vitest.setup.ts:21) with a `process.once('exit')` fallback; this matches the existing pattern in `apps/three-surface-poc/src/test-model-fixture.ts:62`. No finding.

## Checked and sound

- The replaced `GIT_ENV` literal in all four dossier tests is byte-identical to the kit's `GIT_ENV` (diff read), so those tests run under an unchanged environment.
- `esbuild ^0.28.2` resolves to 0.28.2 in `package-lock.json`; the lockfile has the `packages/test-kit` entry.
- `vitest.tiers.ts` places `git-repo.test.ts` (runs git) in integration and `test-kit.test.ts` (no process) in unit; `test:tiers` agrees.
- No built module imports the kit: polaris-dossier lists it under `devDependencies` and only `*.test.ts` files import it; `npm run build` succeeded.
- Kit test expectations are literals (git blob ids for the empty blob and `hello\n`), not computed from the module under test.

## Verdict

REVISE. Two tests the PR breaks fail locally and in hosted CI; both need the author's review of what a thirteenth workspace means for the probes and the no-egress alias table before merge.
