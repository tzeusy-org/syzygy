# R-SCREENING-V8-IMPL-B-1 — screening scope v8 reading code and recorder, implementation review
Reviewed commit: 0fb18104
Subject: PR #807
Verdict: REVISE

Reviewer: fresh-context independent reviewer, 2026-11-09. Scope: the diff
`4b7e04df..0fb18104` (27 files, +1858/−25), read against the v8 package
(`SEMANTIC-DELTA.md`, the `pv` patch, the manifest), the held selection
`OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md`, the direction
`OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md` part 3, and
`AGENTS.md`. I worked in a detached scratch worktree at `0fb18104`, after
`npm ci`. I did not run the recorder's `--record`, did not read any observed
repository body or dossier output, and made no provider call.

## What I ran

- `npm ci`: exit 0.
- `npm run check`: exit 0. Test Files 181 passed (181), Tests 4212 passed (4212).
- `npx vitest run --project integration packages/polaris-dossier packages/polaris-generation-consent packages/polaris-generation-core apps/three-surface-poc/src/polaris-generation apps/three-surface-poc/src/product-build.test.ts`: Test Files 40 passed (40), Tests 2021 passed (2021).
- `npm run test:tiers`: "ok: every test file is in exactly one tier" (unit 181, integration 94, e2e 26, live 3).
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/record_public_source_screening_scope_v8_act.py --selftest`: "selftest: 88 of 88 predicates held".
- `python3 scripts/build_public_source_screening_scope_v8.py --check`: "public-source-screening-scope-v8: patch and manifest current".
- `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS".
- `python3 scripts/screening_v8_mutations.py --out <scratch>` at `0fb18104`: 22 of 22 killed (I re-ran it because the record's commit is not an ancestor of the reviewed head; see Finding 5).
- My own 16 extra mutants, one file at a time, each restored afterwards (`git status --porcelain` empty): 11 killed and 5 survived. The survivors are listed under Findings 2 and 3.
- Frozen table, independently: `git ls-tree -r -z --name-only f5bfaed7 -- <package>` plus the builder gives 12 files. That set equals the 12 keys of `FROZEN_FILE_DIGESTS`. For every one of the 12, the sha256 of `git show f5bfaed7:<file>` equals the recorder's literal and the current bytes. The round-6 raw head line 3 reads `Manifest SHA-256: 3da45020…`, which equals `REVIEWED_MANIFEST_SHA`.
- Recorder `validate()` (read-only, imported) over the live inputs, argument `44153bbe…`: it accepted, with `spec_signed True`, `applied False`, `stale []`. `validate_words('Sign screening scope version 8, variant pv', …)` returned `2026-11-08`. I then appended one space to `IMPACT-LEDGER.md` and ran it again: "REFUSED: frozen subject does not carry the reviewed bytes of …IMPACT-LEDGER.md". I restored the file.
- Not run: no `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-ACT.md` exists (0 matches in the decisions directory, 0 in `ACCEPTANCE-ACT-RECORD.md`), and the policy still hashes to `626be0ca…`, the v7 argument.

## Criterion assessment

- **Reads v8 exactly as the signed semantics state.** Partly met.
  - [Observed] Redaction is off for a private pair (`redactionFor`, `screen.ts:181`).
  - [Observed] A private screen keeps excluded and withheld object ids off the source population and the discovery rows (`render.ts:397`, `render.ts:681`).
  - [Observed] Pair visibility is fail-closed. It is public only when every effective record states public. A not-given declaration is private. An unreadable store or an unreadable act record refuses. A missing subject is built private.
  - [Observed] v7 refuses a private screen, and the provider mode refuses a private pair.
  - **Not met for "no fetch":** the `syzygy polaris` supervisor still fetches from the upstream URL for any pair that passes preflight, and this PR makes private pairs able to pass it (Finding 1).
  - The "private-naming egress consent" is implemented as a blanket refusal of private pairs in provider mode. That is narrower and fail-closed, so I accept it (note in Finding 6).
- **Public pairs screen identically under v7 and v8.** Met for the population tested.
  - [Observed] `screen-scope-v8.test.ts` compares v7 and v8 over 10 paths and 7 bodies, and the credential body keeps `withheld: [4, 5, 6]`.
  - [Observed] The gate test reads this checkout's Redis act record as public.
- **Recorder frozen to the reviewed bytes, refuses otherwise, not run.** Met. Verified above by an independent re-derivation, a live mutation and a file sweep.
- **Every load-bearing predicate has a killing test.** Not met: five survivors, two of them on predicates the PR body names as behaviour (Findings 2 and 3).
- **Expected values are literals.** Met in the tests I read (gate, screen-scope-v8, render additions). The testkit derives `V8` from the patch, but it checks the result against a literal row digest.

## Findings

**Finding 1 — The supervisor fetches a private repository from its host** (requires change)

- [Observed] `packages/polaris-dossier/src/polaris.ts:342` runs `git init`, then `git -C <clone> fetch -q --depth=1 <url> <commit>`, whenever no `--clone` is passed. The commit is any `consentedRevisions` entry preflight returned. Nothing on that path reads visibility.
- [Observed] Preflight's sources include launch records (`cli.ts:194` `withLaunchRecords`; `launch-sources.ts` `consentedRevisionsFor` adds every active launch observation record).
- [Observed] This PR's `policyAdmitsNonPublic` (`launch-cli.ts`) makes the launch record a `not-public` pair once v8 is in force.
- [Inferred] So after the act, `syzygy polaris <url>` for a private pair makes Syzygy fetch from the private host, through the operator's git credential helper.
- That contradicts edit 4 of the semantic delta: for a private repository "Syzygy fetches nothing, reads only Git objects already in a clone the operator holds, and holds, reads, requests and uses no credential for its host". It also contradicts the direction's "no fetch … for private repositories".
- Required: before the fetch, the supervisor refuses a pair whose visibility is not public, or requires `--clone` for one, using the same `pairVisibilityAt` decision. Add a killing test.

**Finding 2 — The act-forms-match refusal has no killing test** (requires change)

- [Observed] `source-visibility-gate.ts:45`: `if (!ACT_FORMS_MATCH_POLICY) return { ok: false, … }`. The PR body names this as a refusal ("If the admission reader's observation forms are not exactly the acts the policy names, it refuses").
- Two mutants survive `source-visibility-gate.test.ts` (18 passed each):
  - `if (false) return`;
  - `ACT_FORMS_MATCH_POLICY = true || …` at line 36.
- The only test asserts that the constant is `true` over the real lists. So adding a third `consent-observation` form to `ADMISSION_ACT_FORMS` would make its records read public by form. That is exactly what the rule forbids ("never because a code list of act forms grows"), and no test would fail.
- Required: make the comparison a function of injectable lists, or inject the form list, and test a mismatch both ways.

**Finding 3 — The provider-mode reader's unreadable-`sourceVisibility` refusal has no killing test, and the fall-through is fail-open** (requires change)

- [Observed] `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts:181`: `if (!visibilityRead.ok) refuse(…)`. The mutant `if (false) refuse(` survives `public-source-screening.test.ts` (48 passed).
- [Inferred] Without that line a malformed `sourceVisibility` goes on to line 183, which tests `visibilityRead.ok && …`, so it is not refused. `readSecretRedaction` still accepts the v8 `appliesTo` beside the key, so the reader would screen as for a public pair.
- The act chain binding the bytes limits the reach today, but the predicate is the reader's own fail-closed guard. Required: add a test with a malformed `sourceVisibility`.
- The other three survivors are lower value, and I record them here as notes:
  - `source-visibility.ts:56` `rule.includes(file)` is redundant while the rule text is digest-pinned, but it guards an edit to `PUBLIC_BY_FORM_ACTS`.
  - `launch-cli.ts:48` the re-hash after the chain read guards a time-of-check race only.
  - `screen.ts:122`, the default `visibility = 'public'` (Finding 4).

**Finding 4 — `buildDossierScreen` defaults to the looser visibility** (note)

- [Observed] `screen.ts:122` defaults `visibility` to `'public'`. Under a v8 policy, any caller that omits the argument gets partial redaction and rendered object ids. Changing the default to `'private'` survives the screen tests.
- [Observed] Production callers pass it explicitly: only `loadDossierScreen` does, at line 234. `FIXTURE_SCREEN` (`full-run.testkit.ts:81`) and `scripts/redis_screening_remeasure.mjs:442` rely on the default.
- Suggest: no default, or `'private'` whenever the policy declares `sourceVisibility`, so a future caller cannot fail open.

**Finding 5 — The mutation record names a commit that the reviewed head does not contain** (note)

- [Observed] `docs/evidence/syzygy-pdja-21/screening-v8-mutations-2026-11-09.json` records `6d1ebef2`, and `git merge-base --is-ancestor 6d1ebef2 0fb18104` fails. The branch was rebased: `git diff --stat 6d1ebef2 0fb18104` touches 18 files.
- I re-ran the runner at `0fb18104` and all 22 were killed, so the claim holds at this head. The record is still not re-checkable against the reviewed head's ancestry (AGENTS rule 11, and the rebase note). Suggest regenerating it at the final head.

**Finding 6 — Smaller reading gaps, all fail-closed today or unreachable by Syzygy's own writer** (note)

- [Observed] `source-visibility-gate.ts:54` filters on `Date.parse(grantInstant) <= now`. The launch-record grammar (`launch-record.ts:130`) admits `2026-13-01T00:00:00Z`, and `Date.parse` returns `NaN` for it (checked with node). So a record with such an instant drops silently from the carriers instead of refusing as a record "whose effectiveness … cannot be read".
  - [Inferred] Syzygy's writer never produces one, but a record copied onto the reference within the agent write reach could. That would drop a fork's private record, and the pair would read public.
- [Observed] The gate takes every effective record of the pair, whatever its revision, and does not itself require that one of them admits the commit read. Admission is decided elsewhere (`observationConsentFor`), so the outcome agrees with the rule. A test pinning the per-commit wording would make this explicit.
- [Observed] The provider mode refuses every private pair rather than reading an egress consent "that names the pair and states it private". That is narrower than the direction's "a private-naming egress consent", and fail-closed. Say so in the PR body as a scoped-down part.
- [Observed] `packages/test-kit/src/unified-patch.ts:16,31` uses `out.push(...lines.slice(…))`, which AGENTS.md forbids, because the stack bounds the argument list. It is harmless at the policy's size, but it is a test kit others will reuse. Loop instead.

**Finding 7 — Recorder** (note, no change)

- [Observed] Phrase label, argument = manifest row `44153bbe…`, and selection-quote words are all checked.
- [Observed] The spec v1.1 signoff is required, and `record_versioned_signoff.py --check` passes at this commit.
- [Observed] The frozen table matches `f5bfaed7` file for file. The head binds the manifest file's digest over the first four non-blank lines.
- [Observed] The `check_governance.py` registrations (the v7→v8 chain link, the copy registry and the v7-manifest-to-history switch) are all gated on the act file existing.
- [Observed] The CG-26 triple is consistent: the battery line, the workflow step and the count 136 → 137.
- [Observed] The PR body's post-record install checklist is honest about what fails after `--record`. [Unknown] Whether those install items land "in the same change" as the direction requires; that is for the coordinator's record commit.
