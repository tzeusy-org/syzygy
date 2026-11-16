# R-SCREENING-V8-IMPL-B-2 — screening scope v8 reading code and recorder, implementation review, round 2
Reviewed commit: 72528d19
Subject: PR #807
Verdict: REVISE

Reviewer: fresh-context independent reviewer, 2026-11-09. Scope:
`git diff origin/main...72528d19` (36 files, +2423/−47), with the round-1
repairs `0fb18104..72528d19` (18 files) read closely. I read it against the v8
package (`SEMANTIC-DELTA.md`, the `pv` patch and the manifest), the held
selection `OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md`, part 3 of the
direction `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`, and
`AGENTS.md`. I judged each round-1 finding against the bytes, not against the
PR body's dispositions.

I worked in a detached scratch worktree at `72528d19`, after `npm ci`. I did
not run the recorder's `--record`. I read no observed repository body or
dossier output, made no dossier run and no provider call, and edited no source
file.

## What I ran

- `npm ci`: exit 0.
- `npm run check`: exit 0. Test Files 182 passed (182); Tests 4239 passed (4239).
- Integration tier over the touched packages: exit 0. Test Files 41 passed (41); Tests 2031 passed (2031). The command was `npx vitest run --project integration packages/polaris-dossier packages/polaris-generation-consent packages/polaris-generation-core packages/test-kit apps/three-surface-poc/src/polaris-generation apps/three-surface-poc/src/product-build.test.ts`.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/record_public_source_screening_scope_v8_act.py --selftest`: "selftest: 88 of 88 predicates held".
- `python3 scripts/build_public_source_screening_scope_v8.py --check`: "public-source-screening-scope-v8: patch and manifest current".
- `python3 scripts/check_docs_review_campaign_partition.py --check`: "partition PASS: denominator=804; … unmatched=0".
- Recorder unchanged since round 1: `git diff --quiet 0fb18104 72528d19 -- scripts/record_public_source_screening_scope_v8_act.py scripts/check_governance.py` exits 0.
- Frozen table, re-derived independently:
  - 12 `FROZEN_FILE_DIGESTS` entries. For all 12 (12 of 12), the sha256 of the current bytes and of `git show f5bfaed7:<path>` both equal the literal.
  - `git ls-tree` gives 11 package files at HEAD. With the builder that is 12, the same set.
  - `REVIEWED_MANIFEST_SHA` starts `3da45020`. That equals the manifest file's sha and line 3 of the round-6 raw.
- Recorder not run:
  - No `…PUBLIC-SOURCE-SCOPE-V8-ACT.md` exists in `.syzygy/governance/decisions/`.
  - `git grep -l PUBLIC-SOURCE-SCOPE-V8-ACT` returns only the round-1 raw, `package-reader.ts`, `check_governance.py` and the recorder.
- Mutation record:
  - `docs/evidence/syzygy-pdja-21/screening-v8-mutations-2026-11-09.json` names commit `1bf4eb46`.
  - `git merge-base --is-ancestor 1bf4eb46 72528d19` succeeds, and `1bf4eb46..72528d19` touches only the record. Each result stores `old`, `new`, test and counts.
- `python3 scripts/screening_v8_mutations.py --out <scratch>` at `72528d19`: 37 mutants, 37 killed, survived `[]`. `git status --porcelain` was empty afterwards.
- My own 11 mutants, one at a time, each restored, with an empty tree afterwards: 9 killed and 2 survived (listed under Finding 2). The killed ones:
  - `fetchRefusal` reads a throw as public;
  - the trigger fetches on a throw;
  - `cliVisibilityOf` ignores an injected decision;
  - `actFormsMatchPolicy` with the element comparison removed;
  - `actFormsMatchPolicy` with `a.length === b.length` removed;
  - the provider v8 decision line reduced to `(true)`;
  - the unparsed check restricted to in-force records;
  - the trigger's private stop weakened;
  - `fetchRefusal`'s private stop disabled (through the clone test).
- My own fetch/egress sweep:
  - Population: tracked `apps/`, `packages/` and `scripts/` sources ending `.ts|.mts|.js|.mjs|.cjs|.py|.sh`, which gives 787. Excluding `.test.`, `.testkit.`, `/test-kit/`, `testing`, `fixtures` and `.d.ts` leaves **461**.
  - Predicate (Python `re`): a quoted `fetch|clone|ls-remote|pull|remote|archive|submodule` argument, `git (fetch|clone|ls-remote|pull|archive)`, `fetch(`, `http(s).request(`, `http(s).get(`, `undici`, or `new WebSocket`.
  - Result: **32 files hit**. Three sites contact an observed repository's host:
    - `packages/polaris-dossier/src/polaris.ts:353`, the supervisor fetch, now behind `fetchRefusal`;
    - `apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:232`, `gitMaterialize`, now behind `visibilityStop`;
    - `dossier-trigger.ts:44`, `ls-remote`, metadata only, under `ISOLATED_GIT_FLAGS` with a minimal environment, before admission (disclosed).
  - The other 29 hits fall into these classes:
    - the local daemon or CDP (`fresh-checkout-demo-main.ts`, `polaris-accessible-names-main.ts`, `polaris-keyboard-sweep-main.ts`, `test-http-client.ts`, `cdp-browser.ts`);
    - message, shape or field strings (`clone-shape.ts`, `init.ts`, `launch.ts`, `launch-revision.ts`, `run-dir.ts`, `run-record.ts`, `git-object-reader.ts`, `pipeline-demo.ts`);
    - registry-entry field tests in the `build_*` scripts;
    - `scripts/` clone, fetch or archive of this Syzygy checkout, or `ls-remote` of Syzygy's own remote;
    - `dossier_scale_measure.mjs`, which uses a synthetic local origin.
  - Second method: every `spawnSync`/`execFile` in the non-test `polaris-dossier` and `polaris-generation-*` sources. They run git only in `polaris.ts` (the clone step) and `launch-store.ts` (the Syzygy home); the rest run tmux, bwrap or sh. No other network path was found.

## Round-1 findings, judged against the bytes

| Round 1 | Status at 72528d19 | Evidence |
|---|---|---|
| 1 — supervisor fetches a private repository (requires change) | **Resolved** | [Observed] `polaris.ts:340-358` `supervisorClone` calls `fetchRefusal` (`source-visibility-gate.ts`) before `init`/`fetch`, and only `visibility === 'public'` passes. It refuses a private pair, an undecidable pair, a throw, no port and no repository id, each naming `--clone`. `cliVisibilityOf` gives no decision when the sources are injected. `polaris-clone.test.ts` asserts the exact git command list, so no fetch happens on each refusal. The trigger's `materialize` is guarded the same way (`dossier-trigger.ts`, `visibilityStop`). Runner mutants plus my R2-1, R2-2, R2-3, R2-9 and R2-10 are all killed. My sweep finds no other host fetch. |
| 2 — act-forms refusal untested (requires change) | **Resolved** | [Observed] `actFormsMatchPolicy(forms, named)` takes injectable lists (`observationForms`). Six mismatches refuse every read, and the reverse case (the policy names a form the reader lacks) returns false. The runner's `if (false)`, `true ||` and without-repeats mutants are killed, and so are my R2-4 and R2-5. |
| 3 — provider-mode malformed `sourceVisibility` untested; fall-through fail-open (requires change) | **Resolved** | [Observed] `public-source-screening.ts:184` now reads `if (!(visibilityRead.ok && (!visibilityRead.declared \|\| visibility === 'public'))) refuse(…)`, which fails closed on its own. The runner mutant on line 181 is killed (2 failed), and so is my R2-7 (`(true)`). |
| 4 — `buildDossierScreen` defaults public (note) | **Resolved** | [Observed] `screen.ts:133` `given ?? (visibilityRead.declared ? 'private' : 'public')`. Its mutant is killed. `FIXTURE_SCREEN` and `redis_screening_remeasure.mjs:442` pass `'public'` explicitly; the latter carries the comment "Redis is public by its act's form". |
| 5 — mutation record not an ancestor (note) | **Resolved** | [Observed] The record is at `1bf4eb46`, an ancestor, and I reproduced 37 of 37 at `72528d19`. |
| 6a — unparseable grant instant dropped silently (note) | **Partly resolved; see Finding 1** | [Observed] It now refuses, but only for a record of the subject pair (`source-visibility-gate.ts:60-64`). |
| 6b — per-commit wording | Not done (optional), stated in the PR body | Admission stays with `observationConsentFor`. |
| 6c — egress consent scoped down | **Disclosed** | The PR body states that "the provider mode refuses every private pair" and that this part is not built. |
| 6d — `push(...)` in `unified-patch.ts` | **Resolved** | [Observed] Lines 16 and 31 now loop. |
| 7 — recorder (note) | Unchanged; still holds | See "What I ran" above. |

## Findings

**Finding 1 — An unreadable grant instant refuses only reads of its own pair; the held text refuses every read** (requires change)

- [Observed] `packages/polaris-dossier/src/source-visibility-gate.ts:60` first narrows to `pairs`: active `observation-consent` records whose `identity === subject.repository`.
- [Observed] Line 63 then looks only among `pairs` for a record whose `grantInstant` does not parse. So an active observation launch record of **another** pair with an unreadable instant is ignored, and the subject reads normally.
- [Observed] `SEMANTIC-DELTA.md:63-73` says otherwise: "Such a file, not shown to be revoked or superseded, whose kind cannot be read, or that reads as an observation consent record whose effectiveness or pair cannot be read … could be a record of any pair. While one exists, every read under the scope is refused, with that file named, until it is read or revoked. The scope does not ignore it …".
- The same passage records the owner's trade-off: "one malformed or unreadable file written there stops every run, redis included. That costs availability, never exposure."
- [Observed] The launch-record grammar (`launch-record.ts:130`) admits month-13 or hour-25 instants. So such a record is readable as to pair, but its effectiveness is not.
- [Inferred] No exposure follows for the subject pair today, because another pair's record does not enter its carriers. But the code reads the rule more narrowly than the held semantics state, and it smooths away the trade-off the owner chose. The acceptance criterion is "v8 is read exactly as the held semantics state".
- [Observed] No test pins the scope either way: every unparsed-instant case in `source-visibility-gate.test.ts:52-55` uses the subject's identity.
- Required: run the unparsed-instant check over every active observation-consent record in the store, whatever its identity. Add a killing test with another pair's record (for example `identity: 'repository:other'`, grant instant `2026-13-01T00:00:00Z`) that refuses a read of `repository:o-r` and names the file.

**Finding 2 — Two survivors outside the v8 predicates** (note)

- [Observed] `polaris.ts:347`: weakening the reuse test to `head.status === 0` survives `polaris-clone.test.ts` (9 passed). With that mutant, a clone at **another** commit would be reused as if it held the consented one.
  - This is pre-existing logic moved into `supervisorClone`, not a v8 predicate.
  - No case has `rev-parse` succeeding with a different commit. One more `it` (status 0, `stdout` another sha, `exists` true) expecting the "exists but is not a clone" refusal would pin it.
- [Observed] `packages/test-kit/src/unified-patch.ts:16`: `k < Math.min(start, lines.length)` → `k < start` survives `screen-scope-v8.test.ts` (11 passed). The guard only matters for a hunk starting past the end of the text, which the `pv` patch never has. It is harmless, but it is unpinned in a shared kit.

**Finding 3 — Residuals carried forward, all disclosed and fail-closed** (note)

- [Observed] `dossier-main.ts:20` wires `materialize: gitMaterialize` and no `visibility` port. Under `visibilityStop` the provider trigger would therefore fetch **no** pair, public ones included.
  - [Observed] Production stops earlier at `admission-missing` (no records port), as the PR body says. This is fail-closed. Whoever wires admission must wire `visibility` too.
- [Observed] The trigger's `ls-remote` (`dossier-trigger.ts:44`) contacts the host before admission or visibility. It is metadata only, with no credential helper (isolated flags and a minimal environment).
  - It is disclosed in the PR body. Edit 4's "fetches nothing … requests and uses no credential" is not breached for objects or credentials. [Inferred] A private repository's existence is still probed by URL. That is for the owner if provider mode ever admits private pairs, which it does not today.
- [Observed] `supervisorClone` reuses an existing clone at the commit "whatever the visibility" (`polaris-clone.test.ts`, reuse case). That reads objects already held locally, which edit 4 permits. Disclosed by the test name.

## Criterion summary

- v8 read exactly as held, fail closed: **not met only for Finding 1**; otherwise met.
- No fetch for a pair not decided public: met over the 461-file sweep.
- Public pairs screen identically under v7 and v8: met (unchanged since round 1; `screen-scope-v8.test.ts` passes).
- Recorder frozen, refusing and not run: met.
- Killing tests: met for every v8 predicate the runner names (37 of 37, reproduced). Finding 1's widened check needs its own.
- Literal expected values: met in the tests added since round 1.
- Scoped-down parts disclosed: met (6b, 6c, the trigger's `ls-remote`, the unwired trigger port).
