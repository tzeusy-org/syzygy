# R-GP-IMPL-CHROME-SINGLETON-3 — CC-REV-1 implementation review of syzygy-bpyt.4.28 (PR #632), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 1ee5b391526f631bdf7c7ad857639c017608dd76
Subject: PR #632

Subject bytes: `git diff be4f3261...1ee5b391` (merge base `be4f3261f1cf0300962efea81a94e2c0e49af538`), sha256
`6424816cd33e70ea2afae542d250c002984e58b0a27d2eb756f6eb4b1b4a8e7b`, 3958 bytes. Two files:
`apps/three-surface-poc/src/cdp-browser.ts` (+15 -2, comments only) and `apps/three-surface-poc/src/cdp-browser.test.ts`
(+11, one case).

Reviewer: independent fresh-context reviewer (w-rev-632 lane, review bead `syzygy-9gum`), 2026-11-04. Governing
references: bead `syzygy-bpyt.4.28` acceptance criteria 1-5; `docs/reviews/R-GP-IMPL-CHROME-SINGLETON-2-RAW.md` notes
N8-N10. Nothing in the subject, the PR or the tracker was changed. Scratch: a detached worktree at the head under
`/tmp/r632` with its own `npm ci`, removed afterwards.

## Verification

| # | Command (at `1ee5b391`, TMPDIR `/tmp/r632`) | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 2 | `npx vitest run apps/three-surface-poc/src/cdp-browser.test.ts apps/three-surface-poc/src/cdp-browser.browser.test.ts` | 2 files, 32 passed (unit 30, e2e real Chrome 2), 0 skipped |
| 3 | `npm test` | 165 files, 3614 passed |
| 4 | `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks)" |
| 5 | `gh pr checks 632` | node, node (unit), node (integration), node (e2e) pass; governance-docs `checks` pending at review time |
| 6 | Comment-stripped emit of `cdp-browser.ts`, base vs head (`ts.transpileModule`, `removeComments`) | identical, sha256 `2168be61…` both |
| 7 | `node -e` under `process.umask(0)`: `mkdtempSync` mode | `700`; `/tmp` mode `1777` |

GP-Q0: no accepted or refused case changes. [Observed: row 6, and every `-`/`+` line of the `.ts` hunk is a ` *`
comment line.] No CDP launch argument or spawn option changed. The test delta `Tests: +1 ~0 -0` in the PR body matches
the diff.

## Rule-6 mutants (my own; unit file only, each restored, `restored: True`)

All at `1ee5b391`, file `apps/three-surface-poc/src/cdp-browser.ts`. Control: 30 passed.

| id | old | new | outcome |
|---|---|---|---|
| M1 (N8) | `ownedByRunningUser(lstat(profile))`; import `readlinkSync,` | `ownedByRunningUser(lstat(realpathSync(profile)))`; import `readlinkSync, realpathSync,` | KILLED, 1 failed: the new case only |
| M2 | `ownedByRunningUser(lstat(profile))` | `ownedByRunningUser(lstat(profile + '/'))` | KILLED, 2 failed (new case and the real-directory "profile is not the running user's" case) |
| M3 | `ownedByRunningUser(lstat(profile))` | `ownedByRunningUser(statSync(profile, { bigint: true }))` | KILLED, 2 failed (same two) |
| M4 | `if (!ownedByRunningUser(lstat(profile)) \|\| !ownedByRunningUser(lstat(link))) return undefined;` | `if (!ownedByRunningUser(lstat(link))) return undefined;` | KILLED, 2 failed (same two) |
| M5 | same line as M4 | `if (!ownedByRunningUser(lstat(profile))) return undefined;` | KILLED, 1 failed ("the link is not the running user's") |
| M6 | `entry.ino === recorded.ino` | `true` | KILLED, 1 failed ("keeps a directory made under the same name after the one that was read") |

Counterfactual for M1: with the base commit's test file (`git show be4f3261:…/cdp-browser.test.ts`) and M1 applied, the
unit file reports "29 passed" — the survivor N8 describes. The new case is what kills it. [Observed]

## TOCTOU, symlink and owner cases

- [Observed] Profile as a link: the profile is judged by `lstat` of the entry itself (`cdp-browser.ts:324`), so a link
  another uid made is refused whatever it names; M1-M3 show resolving or following it is caught.
- [Observed] Link owner: M5 shows the link's own owner check is pinned.
- [Inferred from permission semantics] Window 1 (owner `lstat` of the link, then `readlinkSync`): the link lives in a
  0700 `mkdtemp` profile, so only the running user or root can swap it. Window 2 (identity `lstat`, then `rmSync`):
  the singleton directory sits directly under TMPDIR; with the sticky bit (`/tmp` is 1777) or a private TMPDIR another
  account cannot rename or remove it. Both windows remain open to a same-user racer, as the new comment says.
- [Observed] The comment's "12 of 1000 trials" matches the round-2 raw (N9, P5).

## Item 3 across every profile creator

- [Observed] `git grep` for `mkdtempSync(join(tmpdir()`, `--user-data-dir` and `--headless` outside `docs/` and
  `dist/`: one profile creator, `launchBrowser` at `cdp-browser.ts:534` (`mkdtempSync`). `removeBrowserProfile` and
  `closeDisposableBrowser` are exported but called outside `cdp-browser.ts` only by tests (`cdp-browser.test.ts`;
  `surface-routes.test.ts` names it in a comment). So the "no" holds for every caller today.
- [Observed: row 7] `mkdtempSync` yields mode 0700 even under umask 0.

## Findings

E1. **Low (exception) - item 3's recorded reason is circular and omits the premise it rests on.**
Anchor: `apps/three-surface-poc/src/cdp-browser.ts:318-320`.
Evidence: [Observed] "Refusing a group- or world-writable profile is not done (syzygy-bpyt.4.28 item 3): mkdtemp makes
the profile 0700 and a writable one is already not private, so the owner checks above are the whole rule." A writable
profile being "not private" places it outside the guarantee; it is not a reason the owner checks suffice for it. The
decision is sound only because `launchBrowser` is the sole creator (section above), and that premise is not written.
Both entry points that take a profile path, `removeBrowserProfile` and `closeDisposableBrowser`, are exported and
accept any path with no mode check, which is the round-2 N9 failure scenario (a future caller with a shared,
non-sticky scratch directory).
Failure scenario: a maintainer adds a second caller with a non-`mkdtemp` profile, reads "the owner checks above are the
whole rule" and believes the case is covered.
Proposed fix: say the decision rests on `launchBrowser`'s `mkdtempSync` being the only creator, and that a caller
passing any other profile is outside the guarantee and must add the mode refusal (item 3) first. Comment only; no
behaviour change.

N1. **Note - AC1's "the link is not read" is asserted by outcome only.**
Anchor: `apps/three-surface-poc/src/cdp-browser.test.ts:464-473`.
Evidence: [Observed] The case asserts only that the victim's `SingletonSocket` survives; `readlinkSync` is not behind
a seam, so a read-then-refuse variant would pass. Today a read link leads only to removal, so the outcome pins the
safety property (M1-M4 killed). No repair required; recorded so AC1 is not read as met literally.

N2. **Note, editorial - an Inferred permission argument is stated as fact.**
Anchor: `apps/three-surface-poc/src/cdp-browser.ts:317-318`, "Another account cannot use either in a private or sticky
temp directory." The round-2 raw labelled this `[Inferred from permission semantics]` and also recorded that the owner
check covers only the final path component and not its mode; the comment carries neither.

N3. **Note, editorial - the second window is documented away from its code.**
The identity-`lstat`-then-`rmSync` window is described on `chromeSingletonDirectory` (`:311-317`), while the window
itself is in `removeChromeSingletonDirectory` (`:330-336`), whose comment does not mention it.

No revise finding. Acceptance criteria: 1 met (N1), 2 met, 3 decided and recorded (E1 on the reason), 4 met, 5 met.
