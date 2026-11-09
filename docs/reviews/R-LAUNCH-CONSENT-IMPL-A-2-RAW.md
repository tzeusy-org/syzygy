# R-LAUNCH-CONSENT-IMPL-A-2 — launch-time consent and the trunk-tip pin, implementation review, round 2
Reviewed commit: 4b7e04df
Subject: PR #806
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer (Claude Opus 5.5), 2026-11-09.
Scope: PR #806 at `4b7e04df1886f4a722f3793001341989309dd451` (42 files against
`origin/main`; 16 files, +695/-22, since round 1's `257238a1`), against
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
(REQ-polaris-generation-046 lines 9-33, 047 lines 180-188), the write consent
`.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`
(Scope, lines 40-91), its act, and
`.syzygy/governance/decisions/OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`.
The PR body was read with `gh pr view 806 --json body` (headRefOid
`4b7e04df1886f4a722f3793001341989309dd451`). No observed repository body,
dossier output or secret was read. No dossier run, `syzygy dossier init`
against a real repository or provider call was made. No consent phrase was
typed or answered. Git ran only in the scratch worktree and in the tests'
temporary repositories.

## What was run

All of these ran in a detached scratch worktree at `4b7e04df`, after `npm ci` (exit 0).

- `npm run check` [Observed]: exit 0, 0 `error TS`, `Test Files 179 passed (179)`,
  `Tests 4167 passed (4167)`.
- `python3 scripts/check_governance.py` [Observed]: exit 0,
  `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `python3 scripts/check_docs_review_campaign_partition.py --check` [Observed]:
  `partition PASS: denominator=803; ... unmatched=0; overlaps=0`.
- `npx vitest run packages/polaris-dossier/src/launch` [Observed]: 147 passed.
  By file: `launch-revision` 8, `launched` 43, `launch-record` 21,
  `launch-identity` 30, `launch-write-consent` 7, `launch-store` 14 and
  `launch` 24. `polaris-launch-guidance.test.ts` was also run with the launch
  files: 7 files, 139 passed.
- `python3 scripts/launch_consent_mutations.py --out <scratch>/mut-r2.json`
  [Observed]: exit 0. **31 of 31 killed**, run at `4b7e04df`. This matches
  `docs/evidence/syzygy-pdja-21/launch-consent-mutations-2026-11-09-r2.json`
  (commit `008f10ee`, 31/31/[]). The mutated files are unchanged between
  `008f10ee` and `4b7e04df`: `git diff --stat 008f10ee 4b7e04df` touches no
  `launch*.ts`. `git status --porcelain` was clean afterwards.
- Reviewer mutants, each applied once from a scratch script and restored, with
  the tree clean afterwards [Observed]:

  | Mutant | Fragment | Test file | Result |
  |---|---|---|---|
  | RA | `header.find(line => line.startsWith('committer '))` → `'author '` | launch-store.test.ts | killed (7 failed / 7 passed) |
  | RB | `const ids = found.slice(firstFound).map(` → `const ids = found.map(` | launch-store.test.ts | killed (2 / 12) |
  | RC | `${[...recordIds].sort().join(', ')}` → `${[...recordIds].join(', ')}` | launch-store.test.ts | killed (1 / 13) |
  | RD | `${CONSENT_RULE}` dropped from `reviewPrompt` | polaris-launch-guidance.test.ts | killed (2 / 33) |
  | RE | `${CONSENT_RULE}` dropped from `authorPrompt` | polaris-launch-guidance.test.ts | killed (1 / 34) |
  | R3 (round 1) | `[home.gitDir, home.common].includes(` → `[home.gitDir].includes(` | launch.test.ts | **survived** (24 passed) |

## Round-1 findings: resolution

| # | Round-1 finding | Resolution at `4b7e04df` | Resolved? |
|---|---|---|---|
| 1 | Reader never checks attribution (requires change) | **Built.** `launch-store.ts:90-91` pins `RECORDING_COMMITTER` and `recordingSubject`. `commitHead` parses the committer and the subject (`:109-112`). The reader refuses any commit whose committer is not `Syzygy <syzygy@launch-consent.invalid>` (`:196`), or whose subject is not `launch consent: <its own added IDs, sorted>` (`:208-209`). The writer's caller uses the same function (`launch.ts:314`). Tests: forged committer and forged subject (`launch-store.test.ts:165-177`), with exact literal reasons. A commit copying both is pinned as read (`:179-186`). The residual is disclosed in the PR body ("attribution is a stored claim … Screening v8's population rests on that same claim"). Mutants: the runner's committer and subject mutants, plus RA, RB and RC, all killed [Observed]. | Yes |
| 2 | 047's first branch skipped without `--url` (requires change) | **Disclosed, not built.** It is in the PR body under "Not built here" with the consequence (refused at `head`) and a workaround (pass `--url`). The code is unchanged (`init.ts:109-117`). The finding's options included disclosure. The disclosure is slightly imprecise; see new Finding 2. | Yes, by disclosure |
| 3 | Shipped agent texts lack the owner-only line (requires change) | **Built in part, remainder disclosed.** `CONSENT_RULE` (`session-handover.ts:51`) ends all seven session prompts: the author, inventory, review and waiting variants (`session-handover.ts:52, 268, 354, 357`; `polaris.ts:393`). `AGENTS.md:91-93` carries the line. A literal `endsWith` test covers each prompt (`polaris-launch-guidance.test.ts:248-261`; RD and RE killed). The PR body lists the brief and criteria bodies as not repeating it. Not covered and not named: the fixed reviewer texts in `review-packet.ts:21` and `design-review.ts:77`, and the inventory brief text at `inventory.ts:118`. These are the bodies the disclosure calls "the brief and criteria bodies", so the disclosure covers them by class [Inferred]. | Yes, by build plus disclosure |
| 4 | 047 line 184's run-record statement neither built nor disclosed (requires change) | **Disclosed.** The PR body's item 4 now names 047 line 184's run-record half (reference, committer date, "did not fetch"; `encodeRunRecord` unchanged, `init.ts:212`) and 046 line 13's "on every rendered page". | Yes, by disclosure |
| 5 | Two predicates without a killing test (requires change) | **Built.** A race test moves the reference just before the writer's `update-ref` and asserts the refusal text and the other writer's tip (`launch-store.test.ts:66-84`). The launch refuses on an unreadable store (`launch.test.ts:194-199`). Both are in the runner (`launch_consent_mutations.py:42, 45`) and both are killed, at `008f10ee` (recorded) and at `4b7e04df` (this run) [Observed]. | Yes |
| 6 | Self-observation command and arms (note) | Unchanged. R3 still survives (table above). | Open note, carried as Finding 3 |
| 7 | `--revision` over-refuses (note) | Unchanged; fails closed. | Open note |
| 8 | Write consent subject not checked against the home (note) | Unchanged. | Open note |
| 9 | Unsettled items (note) | The clone-shape item is still disclosed only "for the coordinator". The others are unchanged or now resolved through F3 and F4. | Open note |

## New findings

**Finding 1 — One stray commit on the reference disables every launch and every launch-record gate, with no named recovery** (note)
[Observed] `launch-store.ts:196` and `:209` return `ok: false` for the whole
reference when any commit in the chain fails the committer or subject check.
`launch.ts:151` then refuses at `records`, and `withLaunchRecords`
(`launch-sources.ts:18`) adds nothing. This is the correct fail-closed
polarity. The refusal reason names the offending commit, but the PR body's
residual paragraph does not say that the operator must remove it. The write
consent ("Reverting a write", lines 106-114) puts that removal outside
Syzygy. [Inferred] The previous writer at `257238a1` wrote subjects in input
order, unsorted (`launch.ts` diff). Any record committed by that code would
now make the reference unreadable. [Unknown] whether any such commit exists in
a real governance home; this review did not look. A line in the PR body
naming both would close it.

**Finding 2 — The F2 disclosure's workaround is narrower than it reads** (note)
[Observed] With `--url`, `headConsentedElsewhere` is computed only for the
URL's own subject, and only when exactly one identity names the URL
(`init.ts:111-115`: `ids.length === 1 && ... observationConsentFor(ids[0]!, head.commit)`).
047 line 182 says "whatever that consent's subject identity and whichever act
made it". "Pass `--url` in that case" therefore does not reach a consent made
under a subject identity other than the one the URL resolves to, nor a URL
named by two consents. The body's preceding sentence ("Building it needs every
in-force observation consent read by revision across subject identities")
implies this but does not state it for the `--url` path. Fails closed: the run
is refused at `head` or `repository`.

**Finding 3 — The self-observation common-Git-directory arm is still unkilled** (note)
[Observed] R3 survives at `4b7e04df` (24 passed). Round 1's analysis stands: a
linked worktree's `.git` file is refused earlier, at `clone`
(`launch-clone.ts`), so the arm appears unreachable [Inferred]. The arm fails
closed either way. The runner's "self-observation refusal" mutant disables
the whole condition and so does not test this arm.

**Finding 4 — The reader checks the committer, not the operator half of the attribution** (note)
[Observed] Spec 046 line 29 says a recording commit "is attributed to Syzygy
and the operator". The writer sets the author to the operator
(`launch-store.ts:234`, `homeGit` `:59-65`). The reader reads only the
`committer` line, and accepts any author. This is harmless while attribution
is a disclosed stored claim; it is recorded so the PR body's "attributed to
Syzygy" is not read as checking both halves.

**Finding 5 — The init report's 046 line 33 disclosures are still incomplete, and the not-built list implies otherwise** (note)
[Observed] The PR body says "only the init report's disclosures exist" for
046 line 33. `launchDisclosures` (`init.ts:236-246`) omits the three identity
residuals. On the `recorded` path it does not name the drawer statement relied
on (that appears only through `relied`, on the `covered` path). This is round
1's note under Finding 4, unchanged. The page and run-record halves are
disclosed as not built, so the remaining gap is in the init report only.

## Criterion assessment

- 046/047 within the write consent: what is built conforms. Each unbuilt SHALL
  the round-1 review named is now disclosed in the PR body. Findings 2 and 5
  are precision notes on two of those disclosures.
- Killing tests: 31/31 runner mutants killed at the reviewed commit, and 5 of
  6 reviewer mutants killed. The survivor is an arm that is unreachable and
  fails closed (Finding 3).
- Literal expected values: the new tests compare literal reason strings, the
  literal `CONSENT_RULE` text and literal subjects [Observed].
- Nothing beyond the write consent: the round-1 writer probe stands. Round 2
  changed only the reader, the commit message's subject and prompt texts. The
  writer's plumbing argv is unchanged apart from the message [Observed, from
  the `257238a1..4b7e04df` diff]. No push code path was added (`git diff`
  adds no `push` call).
- Gates: `npm run check`, the launch integration tests and `check_governance`
  are clean, as above.
