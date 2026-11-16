# R-LAUNCH-CONSENT-IMPL-A-1 — launch-time consent and the trunk-tip pin, implementation review
Reviewed commit: 257238a1
Subject: PR #806
Verdict: REVISE

Reviewer: fresh-context independent reviewer (Claude Opus 5.5), 2026-11-09.
Scope: `git diff origin/main...257238a1` (31 files, +3042/-25), against
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
(REQ-polaris-generation-046 lines 9-33, 047 lines 182-186), the write consent
`.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`
and its act `.syzygy/governance/decisions/LAUNCH-CONSENT-WRITE-CONSENT-ACT.md`,
and `.syzygy/governance/decisions/OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`.
No observed repository body, dossier output or credential was read; no dossier
run or provider call was made; git ran only in temporary repositories and in
the scratch worktree.

## What was run

- `npm ci`, then `npm run check` at 257238a1 in a scratch worktree [Observed]:
  typecheck clean (0 `error TS`), `Test Files 179 passed (179)`,
  `Tests 4160 passed (4160)`, exit 0.
- `python3 scripts/check_governance.py` [Observed]: `32 OK, 21 WARN, 0 FAIL
  (53 checks)`, exit 0.
- Integration files `launch.test.ts` (23), `launch-store.test.ts` (9),
  `launch-write-consent.test.ts` (7): all passed [Observed].
- A reviewer probe (`probe806.test.ts`, scratch only, not committed; tier
  registration edited in the scratch copy only), three tests, all passed
  [Observed]:
  1. Writer confinement. A temp home on `main` with an `origin` bare remote
     (pushed), a staged file, an uncommitted edit, and `reference-transaction`,
     `post-commit`, `pre-push` and `post-rewrite` hooks in **both**
     `.git/hooks/` and a `core.hooksPath` set in the repo config. Two writes
     (one record, then two). A byte snapshot of every file in the working tree
     and `.git/` except `.git/objects/`, the dedicated ref's loose file and its
     reflog: identical before and after (`changed == []`), so config, index,
     HEAD, `logs/HEAD`, `main` and `refs/remotes/origin/main` are untouched.
     No hook ran (marker absent). The bare remote's `for-each-ref` unchanged
     (nothing pushed). First commit `rev-list --parents` = itself (no parent);
     second = `<t2> <t1>`. Every path in the first tree is under
     `.syzygy/governance/decisions/launch-consent/`; `diff-tree t1 t2` is
     `A`, `A`. Refs afterwards: exactly `launch-consent-records`, `main`,
     `origin/main`. Reflog of the dedicated ref: two `launch consent: record`
     entries (in scope: "Git's own log entry for that reference move").
     A stale `expectedTip` is refused and the tip stays.
  2. Old-value check. A git wrapper moves the ref to an intruder commit
     immediately before the writer's `update-ref`: the write returns
     `ok: false` [Observed]. With the old value removed from the `update-ref`
     argv (mutant R1b) the probe fails, so it is the old-value check that
     refuses.
  3. Attribution. A commit made by hand with plumbing, author and committer
     `agent <a@x>`, message "not a recording commit", adding one well-formed
     record file under the location on top of a real recording commit, then
     `update-ref` onto the branch: `readLaunchRecords` returns `ok: true` and
     counts the forged record, attributed to the agent's commit
     (`FORGED-COUNTED ... @9dd9a270...`, `agent-commit 9dd9a270...`)
     [Observed]. See finding 1.
- Mutants (rule 6), applied one at a time from
  `scripts/launch_consent_mutations.py`'s own `MUTANTS` fragments, each file
  restored after, `git status` clean afterwards except the probe [Observed]:

  | Mutant | Test file | Result |
  |---|---|---|
  | non-terminal refusal | launch.test.ts | killed (1 failed / 22 passed) |
  | exact phrase | launch.test.ts | killed (3 / 20) |
  | not declared public: refuse before any record | launch.test.ts | killed (1 / 22) |
  | self-observation refusal | launch.test.ts | killed (1 / 22) |
  | reader: additions only | launch-store.test.ts | killed (1 / 8) |
  | writer: hooks disabled | launch-store.test.ts | killed (1 / 8) |
  | write consent: withdrawal sweep | launch-write-consent.test.ts | killed (1 / 6) |
  | R1 (reviewer): `update-ref` old value dropped, `LAUNCH_REF, oid, tipRead.tip ?? zero]` → `LAUNCH_REF, oid]` | launch-store.test.ts | **survived** (0 / 9) |
  | R1b: same fragment | reviewer probe | killed (1 / 2) |
  | R2 (reviewer): `if (!store.ok) return refuse('records'` → `if (false as boolean) return refuse('records'` | launch.test.ts | **survived** (0 / 23) |
  | R3 (reviewer): `[home.gitDir, home.common].includes(` → `[home.gitDir].includes(` | launch.test.ts | **survived** (0 / 23) |

  Seven of the record's 27 mutants re-run, seven killed, matching
  `docs/evidence/syzygy-pdja-21/launch-consent-mutations-2026-11-09.json`.

## Criterion assessment

1. SHALLs of 046/047: most are implemented and tested. Gaps the PR body does
   not disclose: findings 2, 3 and 4.
2. Writer confinement: holds, proven by probe 1 and 2 above. The old-value
   check is real but no committed test pins it (finding 5).
3. Reader population: the reader tells recording commits apart by *shape
   alone* (add-only, at the location, parseable, name matches ID). It checks
   no attribution, so the act's disclosed residual is understated (finding 1).
4. Fail-closed polarity: holds for no TTY (`launch.ts:233`), write consent
   absent (`launch.ts:232`), a wrong or near-miss phrase (`launch.ts:278`,
   tests at `launch.test.ts:136-161`), an unreadable record (whole reference
   refused, `launch-store.ts:183-191`; `launch.ts:151`), not public with no
   admitting policy (`launch.ts:255`), self-observation (`launch.ts:143`).
   `withLaunchRecords` adds nothing on an unreadable reference
   (`launch-sources.ts:19`). The `records` refusal in `launch.ts` is untested
   (R2, finding 5).
5. Tests: expected values are literals; git runs only under `tempDir` homes
   (`launch.testkit.ts:12-31`). Mutants: see table.
6. `npm run check` and `check_governance` clean, as above.
7. The four unsettled items: see finding 9.

## Findings

**Finding 1 — The reader counts any add-only commit as a recording commit; attribution is never checked** (requires change)
`packages/polaris-dossier/src/launch-store.ts:89-103` parses only `tree` and
`parent` lines; `readLaunchRecords` (`:165-208`) accepts every commit whose
diff is additions of record-shaped files under the location
(`:114-138`). Nothing reads the author, the committer or the message that
`writeLaunchRecords` sets (`:218`, author = operator, committer = `Syzygy`,
`:59-65`). Probe 3 shows a commit by `agent <a@x>` with message "not a
recording commit" counted as a launch record. The write consent's semantic
delta says the v8 population "excludes the files it adds only if the reader
can tell recording commits apart. Telling them apart is the implementation's
job under REQ-polaris-generation-046's attribution rule"
(`.syzygy/governance/contracts/candidates/launch-consent-write-consent/SEMANTIC-DELTA.md:128-132`),
and the owner was told "[Inferred] Syzygy can only tell them apart by how each
commit is attributed, and attribution is a stored claim"
(`.../OWNER-DECISION-PACKET.md:90-92`). The implementation does not do even
that much, and the PR body's "The reader counts only files a recording commit
added" overstates it. Spec 046 line 29: "Every recording commit … is
attributed to Syzygy and the operator." Required: the reader refuses (or at
least does not count) a commit whose committer is not the writer's exact
`Syzygy <syzygy@launch-consent.invalid>` form and whose message is not the
writer's form; a test with a forged-attribution commit; and the residual
(attribution is a stored claim any writer can copy) disclosed in the PR body
and wherever screening v8 relies on the population.

**Finding 2 — 047's first branch is skipped whenever `--url` is absent** (requires change)
`packages/polaris-dossier/src/init.ts:109-117` computes
`headConsentedElsewhere` only when `--url` is given, and passes
`headConsentedElsewhere: false` to the launch (`init.ts:129`); `launch.ts:154`
then consults only launch records for HEAD. Spec 047 line 182: "a run started
without `--revision` whose clone's HEAD is a revision that an in-force
observation consent names, whatever that consent's subject identity and
whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033
states". `--url` is now optional (`cli.ts` synopsis), so a run with no `--url`
on a clone whose HEAD another act consents, but which is not the trunk tip, is
refused at `head` with a checkout command that would move it off the
consented revision. Not disclosed. Required: consult every other act's
observation consents for HEAD regardless of `--url` (or disclose the
narrowing and keep `--url` required), with a test.

**Finding 3 — Shipped agent texts other than the skill do not say only the owner answers** (requires change)
Spec 046 line 13: "The question, and every skill and agent text Syzygy ships,
SHALL say that only the owner answers it, in person … the `/polaris-dossier`
skill and the agent instructions SHALL tell the agent never to run a command
that asks for consent and never to answer one." Only the two `SKILL.md`
copies changed (`.claude/skills/polaris-dossier/SKILL.md:54-58`). A sweep for
`never answer|asks for consent|consent phrase` over
`packages/polaris-dossier/src`, `packages/polaris-generation-*/src`,
`.claude`, `.codex`, `AGENTS.md` and `docs/polaris-generation` (tests
excluded) returns those two files only [Observed]; the briefs Syzygy issues
to agent sessions (`brief.ts:106 renderBrief`, `inventory.ts:103
renderInventoryBrief`, the review briefs) and `AGENTS.md` carry no such line.
Not disclosed in the PR body's "Not built" list. Required: add the line to
every shipped agent text, or list the gap.

**Finding 4 — 047 line 184's run-record statement is neither built nor disclosed** (requires change)
Spec 047 line 184: "The launch output and the run record SHALL state the
pinned revision in full, the reference it came from, the commit's committer
date … and that Syzygy did not fetch; they SHALL print the operator's own
command to update the clone". The launch output does (`launch.ts:114-115`,
`init.ts:236-246`), but `encodeRunRecord(config.config, subject)`
(`init.ts:212`) is unchanged, so the run record carries none of it. The PR
body's item 4 lists only "the page and run-record disclosures of line 33".
Required: build it, or add 047 line 184's run-record half (and 046 line 13's
"on every rendered page") to the not-built list. Related, a note: the init
report's launch disclosures (`init.ts:236-246`) omit the identity residuals
and name the drawer statement relied on only on the `covered` path.

**Finding 5 — Two load-bearing predicates have no killing test** (requires change)
Mutant R1 (drop the `update-ref` old value, `launch-store.ts:274`) survives
`launch-store.test.ts`: the "tip moved" test exercises only the earlier
`expectedTip` comparison (`:225`), not the race the old value guards. The
write consent and its SD require it ("move the reference only if the tip is
still that commit", SD:137-138). Mutant R2 (no refusal on an unreadable
store, `launch.ts:151`) survives `launch.test.ts`. Neither predicate is in
the 27-mutant set, so the record's "one per predicate" does not cover them.
Required: a race test (a wrapper `GitRun` that moves the ref before
`update-ref`, as probe 2 does) and a launch test over an unreadable
reference, each added to the mutation script.

**Finding 6 — The self-observation refusal's command and arms** (note)
`launch.ts:144-146` prints a checkout of the clone's HEAD, not "the pinned
revision" (spec 046 line 27), because it runs before the pin. Mutant R3
survives: the common-Git-directory arm is untested and appears unreachable,
since a linked worktree's `.git` file is refused earlier at `clone` with no
separate-clone command (`launch-clone.ts:83`). Fail-closed either way.

**Finding 7 — `--revision` resolution over-refuses** (note)
`launch-revision.ts:193-205` counts every stored object with the prefix, so
a prefix shared by one commit and one blob is "ambiguous"; spec 047 line 182
refuses a name that resolves "to more than one" *commit*. An annotated tag is
refused as not a commit (`:242`) rather than peeled. Both fail closed.

**Finding 8 — The write consent's subject is not checked against the home** (note)
`readWriteConsent` (`launch-write-consent.ts:144-175`) proves the act and its
scope lines but not that the governance home is
`repository:tzeusy-org-syzygy` (record line 17). Run from a fork or another
checkout carrying the same bytes, the consent reads as in force for it.

**Finding 9 — The PR body's unsettled items** (note)
- Item 1 (clone shape) is correctly disclosed, and its consequence is large:
  the trunk-tip default works end to end only on single-commit clones with
  `--revision`, `--identity` and `--upstream`. It belongs in the owner's
  report, not only the coordinator's.
- Item 2 (dedicated act reader) is sound as scoped. It regenerates the act
  from a ported template, binds the artifact's sha256, sweeps withdrawals and
  requires the exact scope lines; the in-checkout test reads the real act
  (`launch-write-consent.test.ts:30-37`). Two cautions. The relaxed rule
  (`launch-write-consent.ts:163`, instant on or after `Date`) has no upper
  bound. And the withdrawal sweep refuses on any decisions file that names
  the act's identity stem or the artifact path (`:117`, `:155`), so a future
  routine citation in `decisions/` silently disables launch (fail-closed but
  fragile). The shared reader's rule should be fixed by its own reviewed
  change, not left forked.
- Item 3 (run-record URL and id grammar) is correctly disclosed; `init.ts`
  refuses explicitly (`url` stage) rather than silently.
- Item 4 (not built) is incomplete: findings 3 and 4.
- Item 5 (broad revocation sweep) is correctly disclosed. The same holds for
  supersession, which a later launch record may assert over a statement made
  by another act (`launch.ts:216`); that statement stays active in its own
  reader. Harmless while coverage is a union, but undisclosed.
