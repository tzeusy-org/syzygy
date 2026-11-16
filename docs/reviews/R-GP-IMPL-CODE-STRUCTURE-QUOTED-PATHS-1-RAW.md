# R-GP-IMPL-CODE-STRUCTURE-QUOTED-PATHS-1 — CC-REV-1 implementation review of syzygy-bpyt.6.7
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: bed29700756dfa13feaad07a4d0ed3c9dfa975fd
Subject: PR #646

Reviewer: fresh-context CC-REV-1 reviewer (class 3, deterministic observation), dispatched by the coordinator as `syzygy-f3k0`. Date: 2026-11-04.
Diff: `git diff cc9e6128...bed29700` (merge base `cc9e612834fc46f5ab97176a0baa2debc46fc9d6`), sha256 `5d3314e83c3b1e6ae300aa4d9c466be867ff6ef4d3ddf4da5c22aa73efaa6926`; four files, +99 −11 (`git-tree.ts`, `git-tree.test.ts`, `code-structure.ts`, `code-structure.test.ts`).
Inputs: the diff; `bd show syzygy-bpyt.6.7`; `docs/reviews/R-GP-IMPL-CODE-STRUCTURE-1-RAW.md` (F2, the residual this closes); `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` (GP-Q0).

## 1. Verdict summary

The change does what the bead asks. Under `{ nulTerminated: true }` the parser takes every NUL-terminated path verbatim, and code structure records paths that begin with `"` or hold LF exactly as committed. The default mode, which the PWB reader uses, is byte-identical to its predecessor over a 60,000-listing differential. No gate reads the code-structure result.

One exception is about authority. The bead's own gate sentence asked that this change be routed to the owner under `syzygy-bpyt.1`, and no record of that routing exists. I find the change covered by the owner-listed `6.1` row (section 4), but the PR names no authority. Five notes follow, all non-blocking: one is a surviving mutant on a predicate this PR leaves in place.

## 2. Verification at the head (scratch detached worktree, `npm ci` first)

- [Observed] `npm run typecheck`: exit 0.
- [Observed] `npm test` (unit): 166 files, 3631 tests pass.
- [Observed] `vitest run --project integration packages/three-surface-poc-core apps/three-surface-poc`: 61 files, 922 tests pass.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- [Observed] `gh pr checks 646` at review time: `node`, `node (unit)`, `node (integration)` and `node (e2e)` pass; `checks` is still pending. Review threads: 0, none unresolved.
- [Observed] Tests delta matches the PR body's `+4 ~1 -0`: two new `it` blocks in `git-tree.test.ts`, two in `code-structure.test.ts`, and one changed assertion. The real-git fixture is built in `beforeAll`, not at describe time.

## 3. Correctness

### 3a. Default mode is byte-identical (PWB caller)

- [Observed] The only callers of `parseGitLsTree` outside tests are `code-structure.ts:179` (strict) and `project-shape-observation.ts:456` (default, no options).
- [Observed] Differential: 60,000 generated listings of one to four records. The records draw on 11 heads (modes `100644`/`100755`/`120000`/`160000`/`040000`, a five-digit mode, the type `tag`, uppercase hex, a 64-hex id, size forms present, `-` and absent, and `garbage`) and 17 paths (`"`, `"q`, `x"`, `l\nb`, `\n`, `cr\r`, `cr\r\nlf`, ` sp`, `t\tab`, `12\t3`, the empty path, `"\303\261.md"`, `ñ`, `d/"e`, `-` and others). Separators are NUL, LF, CRLF or none. The predecessor `parseGitLsTree` (from `origin/main`) and the head's default call gave 0 differences by `JSON.stringify` over all 60,000. The same held for `{}` and `{ nulTerminated: false }`. Strict mode differs from the default on 13,833 of them, which is expected.
- [Inferred] The default branch is the old condition split in two: the same records, the same `malformed` record and the same entries. The differential agrees.

### 3b. Strict parser on adversarial NUL listings

Each input below was parsed with `{ nulTerminated: true }` [Observed]:

| Input | Result |
|---|---|
| embedded NUL inside a path (`…\tfo\0o\0`) | `malformed`, record `o` |
| last record without NUL | `malformed`, that record |
| path that is only `"` | parsed, path `"` |
| path `"/"` | parsed, path `"/"` |
| path `x\r\n` (CRLF inside a NUL record) | parsed, path `x\r\n` |
| CRLF-separated listing, no NUL | `malformed` |
| `\0\0` after a record (an empty record) | parsed; the empty record is skipped (N4) |
| `\0` alone; empty string | parsed, no entries |
| modes `100755`, `120000`; `160000 commit`; `040000 tree` | parsed, mode and type kept |
| type `tag`; 5- or 7-digit mode; uppercase hex; 39-hex id | `malformed` |
| 64-hex id | parsed (code structure then refuses it as non-SHA-1) |
| no size, or size `-` | parsed without `sizeBytes` (code structure then refuses a blob) |
| empty path (`…\t\0`) | `malformed` |
| path `\tx`; path `12\t3` with `-l` | parsed verbatim |
| path `12\t3` **without** `-l` | parsed as size 12, path `3` (N3, predates this PR) |
| a record starting with LF | `malformed` |

### 3c. Exact-path round-trip against real git

- [Observed] A repository with 18 committed paths: `"`, `""`, `"d/"`, `"lead`, `a\nb`, `\n`, `x\r`, `x\r\n`, `\back`, `tab\there`, ` sp`, `sp `, `ñ.md`, `"ñ\n.ts`, `12\t3`, `dir\n/"x\n`, `-` and `normal.ts`.
- [Observed] `observeCodeStructure` returned Observed with 18 files. The sorted path set equals the index's `git ls-files -s -z`, decoded strictly. Every digest equals the index object id, and every size equals the content byte length.
- [Observed] In the newline format (`git ls-tree -r --name-only`), git C-quotes 14 of those 18 paths: every path that holds `"`, LF, CR, tab, a backslash or a non-ASCII byte. Only ` sp`, `sp `, `-` and `normal.ts` are unquoted. This is the fact section 4 relies on.

### 3d. Consumers and gates (GP-Q0)

- [Observed] Denominator: 8 non-test TypeScript files read `codeStructure` or `region:code-structure`. They are `model-slices.ts`, `model.ts`, `epistemic.ts`, `response-identity.ts`, `proposed-work.ts`, `polaris.ts`, `orrery.ts` and `fresh-checkout-demo-main.ts`.
- [Observed] None is a gate. `fresh-checkout-verdict.ts`, `walkthrough-preflight.ts` and `walkthrough-readiness.ts` contain neither identifier. `fresh-checkout-demo-main.ts:518` records `codeStructure.kind` as a field and does not feed the exit.
- [Observed] The PWB project shape builds its own listing through `buildProjectShape` with its own runner and the default parser (`model-slices.ts:241-256`). No PWB-REQ population or denominator reads this result.
- [Observed] What does change, for a revision holding such a path, is downstream of the inventory becoming Observed:
  - the Polaris `region:code-structure` section and its file count;
  - the Orrery projection and its districts;
  - `deriveLifecycle` in `proposed-work.ts:101-118`, which reads the inventory. Before, it returned Unknown with "tree listing was not observed"; now it derives the state.
  These are the same consequences any Observed inventory already has. No new rendering rule is introduced.
- [Observed] Rendering safety for the new path classes: Orrery embeds the island with `JSON.stringify(...).replace(/</g, '\\u003c')` (`orrery.ts:191`) and writes paths through `textContent` (`orrery.ts:97,108`). Polaris renders only the count. A path holding `"` or LF cannot break out of either.
- [Unknown] Whether the registered Butlers revision holds any such path. I did not list its tree, so no live-output change is claimed either way.

### 3e. POC-REQ-002

- [Observed] Code structure still issues exactly one git command, `ls-tree -r -z -l <rev>` (`code-structure.ts:157`). `git-tree.ts` is pure string parsing, and nothing reads blob content.

## 4. GP-Q0 authority

- [Observed] GP-Q0 part 3 lists `6.1` as "`git ls-tree -z`, so quoted paths are recorded, not dropped". It then says "Any change not listed here to what a gate accepts or refuses stops and returns to the owner." Part 1 counts a rendered-byte change as not behavior-preserving.
- [Observed] The bead says: "route it as a decision under syzygy-bpyt.1 before implementing." A sweep of the full bead export found no such routing. Of 1,058 records, only `syzygy-bpyt.6.1`, `syzygy-bpyt.10` and this review bead name `bpyt.6.7`, and none of the 25 `syzygy-bpyt.1*` records names it.
- [Observed] `syzygy-bpyt.10`'s 6.1 owner notice lists output "(c) paths beginning with a quote or holding LF ('malformed inventory entry'; syzygy-bpyt.6.7 will record them)". That is a non-blocking notice of intent, not a ruling.
- [Inferred] My judgment is that the change is within the owner-listed 6.1 row. Section 3c shows that every path class this PR admits is one git C-quotes, so each is a "quoted path" in the row's own sense. Before 6.1 these paths rendered as wrong-path Observed, and 6.1 left them Unknown as a disclosed residual (F2). This PR completes the listed output, and it changes nothing a gate accepts or refuses (3d).

### E1 — exception — the PR states no authority for an output change, and the bead's routing gate is undischarged

- **Evidence.** The PR body says "This is the bead's authorized outcome" but cites neither the GP-Q0 row nor an owner record. The bead's gate sentence asked for routing first.
- **Disposition sought.** The PR text should name GP-Q0 part 3, row `6.1`, as the authority, citing section 3c's quoting fact. The `syzygy-bpyt.10` cycle report should say that F2 was closed under that row without a separate `syzygy-bpyt.1` decision, and it should list the downstream consumers in 3d (the Polaris count, the Orrery districts, the proposed-work lifecycle). If the owner reads the 6.1 row more narrowly, this is the point to say so.

## 5. Rule 6 — mutants

- [Observed] The PR's six mutants, re-run against `git-tree.test.ts`, `code-structure.test.ts` and the `project-shape*` tests (unit and integration, 308 tests): M1 2 failed, M2 1, M3 1, M4 3, M5 5 and M6 1. All six are killed.
- [Observed] My mutants, over the same 308 tests (each `old` fragment occurs exactly once; restored after each run):

| id | file | old | new | result |
|---|---|---|---|---|
| R1 | `git-tree.ts` | `const strict = options.nulTerminated === true;` | `const strict = options.nulTerminated !== false;` | killed (3) |
| R2 | `git-tree.ts` | `if (strict && raw !== '' && !raw.endsWith('\0')) {` | `if (strict && raw !== '' && !raw.includes('\0')) {` | killed (1) |
| R3 | `git-tree.ts` | `if (strict && raw !== '' && !raw.endsWith('\0')) {` | `if (strict && !raw.endsWith('\0')) {` | killed (2) |
| R4 | `code-structure.ts` | `if (raw !== '' && !raw.endsWith('\0')) {` | `if (false) {` | **survived** (N1) |
| R5 | `git-tree.ts` | `if (!strict && (path.startsWith('"')` | `if (!strict && (path.includes('"')` | **survived** (N2) |
| R6 | `git-tree.ts` | `return { kind: 'malformed', record: records[records.length - 1] ?? '' };` | `return { kind: 'malformed', record: raw };` | killed (1) |
| R7 | `git-tree.ts` | `const records = strict \|\| raw.includes('\0')` | `const records = raw.endsWith('\0') \|\| raw.includes('\0')` | killed (1) |
| R8 | `git-tree.ts` | `… \|\| path.includes('\n'))) return` | `… \|\| path.includes('\n') \|\| path.includes('\r'))) return` | **survived** (N2) |

Run at `bed29700`, in a scratch detached worktree.

## 6. Notes

### N1 — code structure's own unterminated-listing check is now shadowed, and its one distinguishing input is untested

- [Observed] R4 survives. The strict parser now refuses an unterminated listing itself, but one input still depends on `code-structure.ts`'s own check: an unterminated listing whose only records are gitlinks. The gitlink filter removes them, leaving `''`, which parses as empty.
- [Observed] Probe with an injected runner returning `160000 commit <40×a>       -\tsub` and no NUL. At the head it gives Unknown ("malformed inventory entry"). With R4 applied, it gives Observed with `files: []`.
- The predicate predates this PR. A one-line assertion would pin it.

### N2 — the PWB default mode's acceptance of interior `"` and of CR is not pinned

- [Observed] R5 and R8 survive. The PR says the default-mode refusals are pinned, but the pins cover a leading `"` and LF only. Nothing pins that the default accepts `d/"e` or a CR path.
- The differential in 3a shows the default unchanged, so this is not a regression. Note it for the separate review of the PWB caller that the bead defers.

### N3 — without `-l`, a path that begins with digits and a tab is misparsed

- [Observed] `100644 blob <sha>\t12\t3` parses as size 12, path `3`, in both modes. The optional size group can take the first tab-separated field of the path.
- [Observed] Both production callers pass `-l` (`code-structure.ts:157`, `project-shape-observation.ts:454`), which makes it unreachable today. The module header still documents `[-l]` as optional. This predates the PR.

### N4 — strict mode skips an empty record between NULs

- [Observed] `rec\0\0` parses as one entry. git never emits an empty record, so this is tolerance rather than an error. It is unchanged from the default mode.

### N5 — the PWB caller keeps the residual this PR fixes for code structure

- [Observed] `project-shape-observation.ts:454` also asks for `-z -l`. A Butlers path that begins with `"` or holds LF therefore still fails the whole PWB capture (`ls-tree record is malformed`). The bead defers this on purpose ("keep today's behaviour until reviewed separately"). It is recorded here so the deferral stays visible, and changing it would need its own owner-gated bead.

## 7. Disposition

Merge is acceptable once the `checks` job is green and E1's PR-text and cycle-report wording lands. The notes need no change to this PR.
