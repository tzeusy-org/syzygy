# R-GP-IMPL-CHROME-SINGLETON-2 — CC-REV-1 implementation review of syzygy-bpyt.4.11, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 6dcf9490
Subject: r2-review.diff sha256 100fa4ae6502e12043020af48fea6a68d93e3f8aa6f280ca7a72ad9261959c53

Reviewer: independent fresh-context reviewer (rev-515b), 2026-10-25. Full reviewed commit
`6dcf94906b2989345f5b03dfeaa2d64c56632886`, base `3ec6929951080613b3c5cb7205fe303c5449be58`, PR #515, bead
`syzygy-bpyt.4.11`. Round 1 is `R-GP-IMPL-CHROME-SINGLETON-1-RAW.md` (REVISE over `490332aa`, sha256
`4a8f8d769748286096978f114c13f8f7062f1b21e7966888be1185d89e381225`). Nothing in the subject, the PR, the tracker or
any worktree under `.worktrees/` was changed. No target repository content was read, and no credential file was
opened. Tools are under `rev-515b/tools/` and result files under `rev-515b/results/`, in the coordinator's
scratchpad.

Summary: all nine round-1 repair items are repaired or dispositioned as directed. F1 is closed: a victim directory
that round 1's code removes survives at the head. I found no new blocking finding. There are four notes, N8 to N11.
- N8: a mutant of the new profile check survives.
- N9: two same-user windows remain between a check and the action it guards; one of them is not disclosed.
- N10: one code comment claims more for the identity check than it gives.
- N11: one sentence in the PR body reads as if the repair were on `main`.

## 1. Subject identity checks

- [Observed] `sha256sum` of `lead/b411/r2-review.diff` printed
  `100fa4ae6502e12043020af48fea6a68d93e3f8aa6f280ca7a72ad9261959c53`, and of `lead/b411/r2-delta.diff`
  `09ed7c0f86c82f8e6c79bfb1f58f2ae46bd431d255bd34a637161e2b23350c6f`. **Both match the brief.**
- [Observed] Re-derived in a fresh clone by `tools/identity.py` (output `results/identity.txt`):
  - `git diff 3ec69299 6dcf9490` hashes to `100fa4ae…9c53`: **matches**. It covers 42 files, "42 files changed, 9456
    insertions(+), 17 deletions(-)".
  - `git diff 490332aa 6dcf9490 -- <the 42 subject paths>` hashes to `09ed7c0f…0c6f`: **matches**. It covers 16
    files, "16 files changed, 3375 insertions(+), 40 deletions(-)". The three code files are `cdp-browser.ts`,
    `cdp-browser.test.ts` and `cdp-browser.browser.test.ts`; the other 13 are under
    `docs/evidence/chrome-singleton-leak-2026-10-22/`.
  - `git merge-base 3ec69299 6dcf9490` is `3ec69299…`. `490332aa` is an ancestor of the head.
  - Of the 464 files changed in `9a30237e..3ec69299`, 0 are subject paths. Of the 58 changed in
    `3ec69299..71334012` (the current `main`, fetched from GitHub), 0 are subject paths.
- [Observed] `gh pr view 515` reports `headRefOid` `6dcf94906b2989345f5b03dfeaa2d64c56632886`, so the PR head has not
  moved.
- [Observed] The round's history and its code commit (`results/evidence-commits.txt`):
  - The lane's non-merge commits since round 1 are `bcd39b4e` (code) and `3fad24d4`, `0410e3cd`, `42baf076`,
    `9cfa7cd0`, `b15f1a91` (evidence).
  - `git log --no-merges 490332aa..6dcf9490 ^3ec69299 -- apps vitest.config.ts packages package.json
    package-lock.json` lists `bcd39b4e` alone.
  - Each evidence commit differs from `bcd39b4e` in 0 files under `apps packages scripts vitest.config.ts
    package.json package-lock.json tsconfig*.json`.
  - The head differs from `bcd39b4e` in 5 files under those paths. All 5 are `packages/polaris-dossier/src/` files
    that `main` changed in `df6046a1..3ec69299`. `git grep -e cdp-browser -e launchBrowser` over them finds nothing.
- [Observed] At the head, `cdp-browser.ts` hashes to `60a39907…1d68d` and `cdp-browser.test.ts` to
  `aea55cef…1dd03d`. These are the `sha256AtCommit` values in `mutants-cdp-r1-2026-10-25.json` (at `3fad24d4`) and in
  the two `browser-files-*-r1` records (at `0410e3cd`).

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at the head, section "CC-REV-1 —
Mandatory independent review classes"):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Class 6: "**public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- "**A reviewer or the owner** may reclassify at any time."

**SEC-4** (`.syzygy/governance/doctrine/security.md`): "Syzygy writes into a governed repository only with recorded
consent, and every write can be traced and undone." **SEC-3**: "Syzygy runs observed-project code only inside an
explicit, opt-in execution profile."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, Part 1):
- "'Behavior-preserving' means none of the following changes:" "a rendered byte, a wire format, a refusal string or an
  exit code;" "a signed or digest-bound artifact;" "a consent, security or retention decision."
- The extra checks apply to "pull requests touching class 1 (authority boundaries), class 3 (deterministic
  observation) or class 4 (security), and class-6 pull requests that remove an endpoint". They are "an old-versus-new
  differential over a mutated-record corpus that includes records with altered prose;" "a rule-6 mutant for each
  predicate;" "a non-blocking owner notice in the cycle report."

**AGENTS.md** at `6dcf9490`, verification rules 6 ("Mutate the input and confirm the check fails, per predicate,
before trusting it"), 9 ("A claim of absence needs a sweep with a denominator.") and 11 ("An evidence record names its
subject and the subject's digest").

**Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`): "**A test is worth keeping only if some
plausible bug makes it fail.**"; bar 3, "**Edge and failure paths are first-class** — … concurrency-sensitive paths
get tests proportional to blast radius."; bar 5, "**Mock only at boundaries you don't own** — Network, clock,
filesystem, third-party services."

**Ruling: no class (none).** It confirms round 1's ruling.
- **The repair does not change the class.** It adds an owner check (profile and link) and an identity check (device
  and inode) in front of a recursive removal that already existed at `490332aa`. Both checks only **narrow** what is
  removed: each new condition is one more way to keep a directory. No new path to deletion is added.
- What is removed is still a Chrome socket directory directly under the run's own temp directory. That is not
  serving (SEC-1), not data leaving owner infrastructure (SEC-2), not running observed code (SEC-3; Chrome loads
  Syzygy-rendered `file://`, `data:` and `about:blank` pages), not a write into a governed repository (SEC-4), and
  not a secret (SEC-5). No auth surface or egress path is touched.
- The cross-user threat that F1 fix 2 guards against is a host-hygiene question. I judged it under the brief's
  verdict rule (section 5), as round 1 did, and not under the clause's letter.
- **Not class 6.** `BrowserProfileRemoval.singleton` changes type from `string` to `ChromeSingletonDirectory`
  (`git show 490332aa:…/cdp-browser.ts` line 305 reads `readonly singleton?: string;`), and `lstat` is added. Both are
  fields of the options type of `removeBrowserProfile`, which is marked "Test seam: exported for the tests; production
  code reaches it only inside this file." (`cdp-browser.ts:338`). [Observed: `git grep -n -e removeBrowserProfile -e
  ChromeSingletonDirectory -e BrowserProfileRemoval -- apps packages scripts` finds the three names only in
  `cdp-browser.ts` and `cdp-browser.test.ts`.] No external consumer depends on them.
- **GP-Q0 "behavior-preserving": yes.**
  - [Observed] No rendered byte, wire format or refusal string changes (section 6).
  - [Inferred from code] No exit code changes. Every new filesystem call (`lstat` of the profile, the link and the
    directory) sits inside the existing `try` blocks, so no new throw path exists. `isChromeSingletonDirectory` still
    runs outside the `try` on a string.
  - No signed or digest-bound artifact is touched (nothing under `.syzygy/**` or `openspec/**`).
  - No consent, security or retention decision of Syzygy's changes. A temp directory's lifetime is not a Syzygy
    retention decision.
- **GP-Q0 extras:** not required for a class-none change. The rule-6 part is met anyway:
  - [Observed] The lane's 31 mutants are all killed (record checked by script; I reproduced seven).
  - Mine add five killed, one survivor (N8), and one N5 counterfactual this host cannot test (section 4, N5).
  - The mutated-record differential does not apply, because no record is parsed. The owner notice does not apply.

## 3. What I ran, and the results

Every run used its own fresh private TMPDIR under `/tmp/r515b-*`, created empty. Unless a row says otherwise the run
was in a fresh clone or worktree at `6dcf9490`, after `npm ci` (exit 0 in all four trees), with Chrome
120.0.6099.224 (`/usr/bin/google-chrome`) and Node v24.6.0. Load averages ran from 23 to 46.

| # | Command or probe | Result [Observed] |
|---|---|---|
| 1 | `npm run typecheck` (clone, and again in a second worktree) | exit 0 both |
| 2 | `vitest run --project @syzygy/three-surface-poc-app` on `cdp-browser.test.ts` and `cdp-browser.browser.test.ts` (`/tmp/r515b-1`) | "Test Files  2 passed (2)", "Tests  31 passed (31)". "does not fail the run when the singleton directory cannot be removed" ran (✓, not skipped). TMPDIR afterwards: `node-compile-cache` only |
| 3 | The canonical battery, extracted from `PROJECT-STATUS.md` §"How to verify this page" by `tools/battery.py` and run one command at a time in a clean clone | "commit=6dcf94906b2989345f5b03dfeaa2d64c56632886 commands=110 nonzero=0". Shell assignments (`CS=…`, `DR=…`) are applied to later commands and not counted. `results/battery-logs.txt` holds 110 "$ " headers and 110 "exit=0" lines. **The lane's battery line is reproduced.** Within it, `check_governance.py` printed "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", the same summary as round 1. `check_quotations.py` printed "OK    QC-1  … 36 quotations examined in 17 of 940 .md files scanned …, 0 findings" |
| 4 | `polaris-authority-sweep.test.ts` (PWB-REQ-014; `/tmp/r515b-3`) | "Tests  5 passed (5)" |
| 5 | Hosted runs the PR cites: `gh run view 40117103022` and `40117103024`, `gh pr checks 515`, and the node job log | Both `"conclusion":"success"`, `"headSha":"6dcf94906b2989345f5b03dfeaa2d64c56632886"`. `gh pr checks`: "checks	pass	1m56s" and "node	pass	3m14s". In the node log, `cdp-browser.test.ts (29 tests)` ✓ and `cdp-browser.browser.test.ts (2 tests) 3230ms` ✓, so the real-Chrome file ran and was not skipped. "Tests  5254 passed \| 5 skipped (5259)". Excerpt: `results/hosted-node-excerpt.txt` |
| 6 | **F1 victim probe, round 1's run 13 repeated:** `tools/victim_probe.sh` inside `bwrap --dev-bind / / --tmpfs /tmp --bind <rev-515b> <rev-515b>`. `/tmp` is a private tmpfs, and the script refuses to run unless it is. TMPDIR, TMP and TEMP are unset. A same-user `/tmp/.com.google.Chrome.Victim` holds a socket and a sentinel. Links to its socket are planted at all 129 old literal paths (`/tmp/syzygy-browser-profile` and `-0` to `-127`). The four `browser profile cleanup` cases run, then the whole unit file | **Head:** "Tests  4 passed \| 25 skipped (29)", "four-cases after: victim=present sentinel=present"; whole file "Tests  29 passed (29)", "victim=present sentinel=present". **Round-1 head `490332aa`, same plants:** "Tests  4 passed \| 20 skipped (24)", "victim=absent sentinel=absent"; whole file "Tests  24 passed (24)", "victim=absent sentinel=absent". So the probe still detects, and **F1 is closed at the head** |
| 7 | **The new private-root path:** the same sandbox, with `tools/racer.mjs`, a same-user process. It watches `/tmp` and, as each `syzygy-profile-*` root appears, plants `profile/SingletonSocket` and `profile-0..127/SingletonSocket` in it. Run twice | It reached roots in both runs, and every root it could `stat` reported mode `700`. The victim was removed in 3 of 4 passes (run 1 four-cases; run 2 both). 1–2 cases failed in each pass ("Tests  2 failed \| 2 passed \| 25 skipped (29)", "Tests  1 failed \| 28 passed (29)", then 1 and 1). Run 2's log shows the cause, "Error: ENOTEMPTY, Directory not empty: /tmp/syzygy-profile-gdCri0 '/tmp/syzygy-profile-gdCri0'" in "retries transient ENOTEMPTY failures and succeeds within the bound": cleanup racing the racer's `mkdir`, not a product defect. Run 1's log filter predates its widening, so its failure messages were not captured [Inferred: the same cause, since only the four `browser profile cleanup` cases ran in its first pass]. **The new path is reachable only by a writer of a 0700 root, that is, the running user** [Inferred from the mode]. Such a writer can delete the victim directly, so this is the accepted same-user boundary |
| 8 | Round 1's `decoy_probe.mjs`, unchanged except for its TMPDIR prefix guard (`/tmp/r515-` → `/tmp/r515b-`; `diff` shows that one line), against the head's dist. Record `results/decoy-probe-head.json` | **Part A:** 12 of 12 hold (`absolute-outside`, `dotdot-leaves-tmpdir`, `dotdot-inside-tmpdir`, `relative-target`, `nested`, `final-component-symlink`, `final-component-file`, `trailing-slash-names-tmpdir`, `names-tmpdir-itself`, `double-slash`, `newline-in-name`, and the control `own-among-siblings`). The control removed exactly `.com.google.Chrome.Mine01`. **Part B:** two real Chromes in one TMPDIR with decoys planted first. The helper was frozen (1 pid), `closeA` "ok", A's directory removed, B's present; `bWorks: true`; `closeB` "ok", B's removed. Every decoy and the outside victim survived, 0 profiles left, `"holds": true` |
| 9 | My `tools/safety_probe.mjs` against the head's dist (`/tmp/r515b-p1`, mode 755). Record `results/safety-probe-2.json`. `safety-probe-1.json` is the same probe with 300 racer trials, made before the probe's own cleanup helper was fixed to unlink links first | **P1a:** the profile path is a link to a directory whose link (ours) names a Chrome directory, and an injected `lstat` answers another owner for the profile path: victim **kept**. **P1b:** the same with the real `lstat`: removed (a same-user link is trusted, by design). **P2:** an injected `lstat` swaps `SingletonSocket` for a link to another directory right after the link's owner check: **the other directory is removed**. **P3:** an injected `lstat` renames the read directory aside and makes a new one at its name right after the removal's identity check: **the new one is removed** and the one that was read survives. **P4:** make, remove and remake a directory under one name, 2000 times: `sameInode: 0` (this `/tmp` is tmpfs with `inode64`). **P5:** no seam; a separate same-user process swaps the directory with another back and forth while the default removal runs, 1000 trials: `replacementRemoved: 12`, `originalRemoved: 589`, `neitherRemoved: 399`. `leftInTmpdir: []` |
| 10 | `tools/mutant_dist_probe.py`: rebuilds the dist with my surviving mutant `own-profile-check-follows-profile` and runs `safety_probe.mjs` on it, then restores and rebuilds | P1a turns `false` (victim removed), so the mutant is not equivalent. "restored True rebuilt exit 0" |
| 11 | My `tools/mutants_r2.py`. Record `results/mutants-r2.json`, `treeCommit` `6dcf9490…`. Each mutant stores its `old`/`new` fragments; the unit and real-Chrome files run in `/tmp/r515b-m<n>-<k>`, except the root control and the two N5 mutants, which run the unit file only | control "CONTROL-PASS" 31/31; root control 29 tests, 28 passed, 1 skipped. The seven lane mutants and my own: section 4 (F1 fix 2, N1, N2) and N8. Every file restored (`restored: True` ×16). No mutant needed a second attempt |
| 12 | The same tool with the four round-2 keep cases skipped (`results/mutants-r2-necessity.json`), and at `490332aa` (`results/mutants-r2-at-490332aa.json`) | Skip-only control: exit 0, 27 passed and 4 skipped. **All six owner and identity mutants SURVIVE without the round-2 cases** (27 passed, 4 skipped each), so each is killed by its new case alone. At `490332aa`: control 26/26 and `name-case-insensitive` SURVIVED (26/26), as round 1 found; at the head it is killed |
| 13 | `cdp-browser.browser.test.ts` alone, then the lane's `launch_probe.py` in head mode with 24 launches, each run in a fresh TMPDIR, 10 times (`tools/repeat_real_chrome.py`; records `results/repeat-real-chrome-runs1-5.json`, `-runs6-10.json`, `launch-probe-head-run1..10.json`). Runs 1–5 used the tool before I added its first-run argument, which changes only the output names | **Browser file: 10 of 10** "Tests  2 passed (2)"; afterwards each TMPDIR held `node-compile-cache` only (0 Chrome directories, 0 other). **Launch probe:** 240 launches, all 240 closed, 0 closes threw. 4 leaders were killed (3 in run 2, 1 in run 7), 0 closed launches left anything, and every probe TMPDIR was empty at the end. The probe's `holds` is true in runs 2 and 7 and false in the other 8. By its own rule a run with no kill "holds in neither mode: run it again": at this load most leaders exited inside the 1 s grace. The kill path is forced in every browser-file run, by the frozen helper |
| 14 | The unit file inside `bwrap --unshare-user --uid 0 --gid 0 --cap-add ALL` (`results/unit-as-userns-root.log`) | "↓ … does not fail the run when the singleton directory cannot be removed 4ms [running as root]", "Tests  28 passed \| 1 skipped (29)". See N5 for what this does and does not show |
| 15 | `npx vitest list` at base `3ec69299` and at the head (`results/vitest-list-*.txt`), compared by `tools/compare_tests.py` (`results/compare-tests.txt`) | Section 4, "No assertion moved" |
| 16 | `tools/check_records_r2.py` over the evidence directory (`results/records-check.txt`) | Section 4, N4, and section 7 |
| 17 | `ps -eo pid,ppid,args` filtered for `user-data-dir=/tmp/r515b`, after all runs | 0 Chrome processes. The only match was the shell running the filter |

## 4. Round 1's findings, each with a verdict

### Deletion safety, question by question (round 1's questions re-asked at the head, then the brief's new ones)

- **A `SingletonSocket` link pointing elsewhere.** Unchanged and safe.
  - [Observed: run 8 A1–A12] Every shape round 1 tried is kept at the head.
  - [Observed: delta] The textual predicate (`isChromeSingletonDirectory`, `CHROME_SINGLETON_DIRECTORY`) is
    byte-identical to `490332aa`. Only the comment above it changed, from 147 to 145.
- **Two Chromes sharing one TMPDIR.** Safe [Observed: run 8 B].
- **`os.tmpdir()` versus Chrome's TMPDIR.** Unchanged by the delta. The TMP/TEMP residual is now disclosed (N6).
- **A failure to remove is swallowed.** [Observed: code] Every new `lstat` sits inside a `try`. The lane's
  `read-failure-propagates` and `removal-failure-propagates` are killed (record).
- **The new `lstat` seam** (`BrowserProfileRemoval.lstat`):
  - *Injected.* An injected `lstat` can answer any owner and any identity, so it can make the code trust a link and
    remove a directory it did not read. P2 and P3 (run 9) show exactly that.
    - This is reachable only through the exported test seam, exactly as the existing `singleton` override can
      already name any Chrome-named directory under `os.tmpdir()`.
    - [Observed: sweep] Production code passes no `lstat`. The 2 production call sites are `cdp-browser.ts:516`, the
      default `removeBrowserProfile`, and `:523`, `launchBrowser`'s `{ singleton }` only. The 3 injected uses in
      `cdp-browser.test.ts` (`:449`, `:456`, `:476`) each wrap the real `lstatSync` and change one field for one
      path.
  - *Default.* `lstatSync(path, { bigint: true })` does not follow the final component, so:
    - **A profile that is a link** is judged by the link's own owner. [Observed: P1a] A link answered as another
      owner is refused. No test pins this; N8.
    - **A link replaced between `lstat` and `readlink`** is followed, and the replacement is not owner-checked.
      [Observed: P2, via the seam] Only a writer of the profile directory can replace it. Production profiles are
      fresh `mkdtempSync` directories (mode 0700 [Inferred from Node's mkdtemp]). The test profiles sit inside 0700
      `mkdtemp` roots [Observed: mode 700 in run 7]. So only the running user can do it; N9.
    - **A profile whose owner differs from its link's owner** is refused either way, because both must be the
      running user. [Observed] The lane's cases "keeps the directory a link names when the profile is not…" and "…when
      the link is not…" pass, and their mutants are killed.
    - Intermediate components of the profile path are followed and not owner-checked. No current caller passes a
      path through a directory another user controls (sweep above); N9.
- **Identity (N1).**
  - *Is the check made on the directory actually removed?* **No.** `removeChromeSingletonDirectory` runs
    `lstat(recorded.path)` and then `rmSync(recorded.path, …)`, which resolves the path again. [Observed: P3
    deterministic; P5, 12 of 1000 trials with a real same-user racer and no seam] A directory swapped in between is
    removed. The PR's residual "Identity limits" discloses this window. N9 gives who can open it.
  - *Can inode reuse pass?*
    - [Observed: P4] Not on this host's `/tmp` (tmpfs, `inode64`): 0 of 2000.
    - [Inferred] Yes on a file system that reuses inode numbers (ext4 is the root file system here, and holds `/tmp`
      wherever `/tmp` is not a tmpfs). The pair then matches a newer directory with the same name.
    - The PR body discloses this ("Device and inode cannot tell two directories apart if the file system reuses the
      inode number…"). The test comment at `cdp-browser.test.ts:465` does too. The code comment at
      `cdp-browser.ts:285` does not (N10).
    - A same-name directory still needs the same six random characters, which is round 1's k / 62^6.
  - *Does the fallback keep a guard at least as strict as round 1's?* **Yes, and stricter.** [Observed: code
    `:308-318`, `:341-348`] With no recorded directory, `removeBrowserProfile` reads the link before it removes the
    profile. It adds the profile and link owner checks, which `490332aa` did not have, and records the identity at
    that moment. The removal then applies round 1's full guard (parent, name, real directory, owner) plus the identity.
    The lane's `link-read-after-profile-removed` and `link-not-read-at-removal` are killed (record).
- **TOCTOU between the identity check and the recursive remove.**
  - *Rename aside, then a new directory at the name:* the new directory is removed [Observed: P3, P5].
  - *A link at the name:* `rmSync` removes the link only [round 1 run 12]. [Observed this round] With Node v24.6.0,
    `rmSync(<dangling link>, { recursive: true, force: true })` leaves a **dangling** link in place. That removes
    less, not more.
  - Who can open the window:
    - In a sticky `/tmp` (1777), only the directory's owner or root can rename the singleton directory
      [Inferred from sticky-bit semantics].
    - In a private TMPDIR (my runs: 755 and mine), only the running user can.
    - So **no other account can open the window**. A same-user process can, and such a process can already delete
      either directory itself.
    - The window existed at `490332aa` with no identity check at all, so it is narrower now, not new. The PR says
      "Neither window is wider than it was at `490332aa`" [Inferred: agreed].

### F1 — the fake-`remove` tests read a link at a fixed path in the shared `/tmp`

- **F1 fix 1 (required): repaired.**
  - [Observed: `results/compare-tests.txt`] The four cases now pass `missingProfile()`, `missingProfile()`,
    `missingProfile()` and ``join(root, `profile-${run}`)`` (with `const root = privateRoot();`). The roots are
    `mkdtempSync(join(tmpdir(), 'syzygy-profile-'))` and are removed in `afterEach` (`cdp-browser.test.ts:209-220`).
  - `git grep -F syzygy-browser-profile 6dcf9490` matches only evidence files (`assemble_round1.py`,
    `verification-round1-2026-10-25.json`), never a test or source file.
  - [Observed: run 6] The victim survives at the head and is removed at `490332aa` with the same 129 plants.
  - No matcher or expected value changed; see "No assertion moved" below.
  - [Observed: sweep of every call that can reach the default link read] `removeBrowserProfile` is called on 24 lines
    of `cdp-browser.test.ts` (26 lines name it, with the import at `:7` and the comment at `:209`) and on 2 of
    `cdp-browser.ts` (`:516`, `:523`). Every test call passes a path under a private `mkdtemp` root.
    Each of the 9 `closeDisposableBrowser(…, '/tmp/private-browser-profile', …)` calls in the same file injects
    `removeProfile`, so none of them reaches the default removal or reads a link.
- **F1 fix 2 (taken): repaired.**
  - [Observed: code `:308-318`] The link is read only after `ownedByRunningUser(lstat(profile))` and
    `ownedByRunningUser(lstat(link))`.
  - The cases are "keeps the directory a link names when the profile is not the running user's…", "…when the link is
    not the running user's" and the control "removes the directory a profile's link names when the profile and the
    link are the running user's…".
  - [Observed: run 11] The lane's mutants are killed. Each first error line is "AssertionError: expected false to be
    true // Object.is equality":
    - `profile-owner-not-checked`, by the profile case;
    - `link-owner-not-checked`, by the link case;
    - `link-trusted-whoever-made-it`, by both.
  - These match the lane's record test for test.
  - [Observed: run 12] All three survive without the round-2 cases, so each check is pinned by its own case.
  - My own mutants: `own-profile-check-reads-parent` (`lstat(dirname(profile))`) is killed by the profile case. Same
    error line.
  - `own-link-check-reads-target` (`lstat(readlinkSync(link))`) is killed by the link case. Same error line.
  - `own-profile-check-follows-profile` **SURVIVED** (N8).
- **New defect or unrecorded claim from F1?** The P2 window, the link check and the read not being one step, is not
  in the PR's residuals (N9). Nothing else.

### N1 — identity: repaired

- [Observed: code] `ChromeSingletonDirectory { path, dev, ino }` is recorded by `chromeSingletonDirectory`
  (`:314`). `launchBrowser` records it once Chrome has announced its endpoint (`:561`). The removal requires
  `entry.dev === recorded.dev && entry.ino === recorded.ino` (`:326`). The values are `bigint`.
- [Observed: run 11] The lane's mutants are killed:
  - `identity-inode-not-compared`, by "keeps a directory made under the same name after the one that was read…";
  - `identity-device-not-compared`, by "keeps a directory with the recorded inode number on another device";
  - `identity-not-compared`, by both.
- [Observed: run 12] All three survive without the round-2 cases.
- [Observed: run 11] My mutants are killed:
  - `own-identity-of-socket-file` (the identity recorded from `<dir>/SingletonSocket`) by 4 cases, including the
    real-Chrome one ("expected true to be false"); it left 2 Chrome directories in its TMPDIR.
  - `own-removal-ignores-injected-lstat` by the device case.
- Limits: the identity is checked on a path the removal then resolves again, and inode reuse is not covered (N9, N10).
  Both are disclosed in the PR body. The test case renames the first directory aside, so it pins the comparison and
  not the reuse case. Its comment says so.

### N2 — case sensitivity: repaired

- [Observed] `'.COM.GOOGLE.CHROME.AbCdEf', 'com.google.chrome.AbCdEf', 'ORG.chromium.Chromium.AbCdEf'` joined the
  near-miss list (`cdp-browser.test.ts:393`).
- `name-case-insensitive`, the lane's fragment and round 1's `guard-name-case-insensitive` edit, is killed at the head:
  "AssertionError: expected [ '..com.google.Chrome.AbCdEf', …(16) ] to deeply equal [ '..com.google.Chrome.AbCdEf',
  …(19) ]". It SURVIVED at `490332aa` (run 12).

### N3 — 145, not 147: repaired as directed

- [Observed: `git grep -F -e 147 -e 145`] `cdp-browser.ts:269-270` and `cdp-browser.browser.test.ts:11, 97` say 145.
- The unit test name "…which Chrome 147 to 155 make…" (`cdp-browser.test.ts:353`) is kept so that the name set does
  not move. The PR body says so, and round 1 offered that option.

### N4 — `sha256AtCommit` in the browser-files records: repaired

- [Observed: `results/records-check.txt`] The three 2026-10-22 browser-files records now carry four digests each.
  Each equals `git show <treeCommit>:<path> | sha256`: 0 mismatches. Since round 1 each gained exactly 6 lines and lost
  0. Parsed, they equal their `490332aa` bytes with `sha256AtCommit` removed: "keys added ['sha256AtCommit'] removed
  []; rest equal: True" ×3.
- The `dccd484f` digests are `c6c0ac6c…842033`, `a655dd3f…1e265e`, `2f659ee9…699a1e` and `70102033…73856f`. They
  match the prefixes round 1 computed independently.
- Over all 25 JSON records at the head: 21 name a commit and 20 carry a `sha256AtCommit` field. All of those match at
  their commit. The 21st, `verification-2026-10-22.json`, carries 15 64-hex digests under other keys, as round 1
  counted it. `chrome-names` and the four test-list records name no code commit; their subjects are executables or
  name lists.
- `browser_files_run.py` now writes the field (+8/−1).

### N5 — the cannot-be-removed case under uid 0: repaired, and the counterfactual is [Unknown] here

- [Observed] The case calls `skip(process.getuid?.() === 0, 'running as root')`. The installed vitest 3.2.7 declares
  `(condition: boolean, note?: string): void`.
- As the running user the case runs (run 2, ✓). As uid 0 in a user namespace it is skipped with "[running as root]"
  (run 14).
- [Observed] I could not show that the case would fail as real root without the skip:
  - My `own-n5-skip-dropped-as-root` passed, 29 of 29.
  - Inside `bwrap` as uid 0 with `CapEff 000001ffffffffff`, `rm` in a 0555 directory still printed "Permission
    denied". The process ran under AppArmor's `bwrap//&unpriv_bwrap (enforce)`, and
    `kernel.apparmor_restrict_unprivileged_userns` is 1.
  - So this host cannot stand in for root. The failure under real root stays [Inferred], as in round 1.
- The skip is harmless as the running user [Observed: `own-n5-skip-dropped-as-user`, 29/29, an equivalent mutant
  there].

### N6 — the TMP/TEMP residual: repaired (disclosed)

- [Observed] The PR body's Residuals has "**N6: `TMP` or `TEMP` set without `TMPDIR`.**" with the mechanism, and says
  Chrome's spawn environment is not changed.
- [Observed: delta] The `spawn(...)` arguments and options are byte-identical to `490332aa`.

### N7 — the load flake: dispositioned as directed

- [Observed: `bd show syzygy-bpyt.4.21`, read-only] Status "open", title "cdp-browser.test.ts: inject the clock in the
  drain-timeout shutdown case so a loaded host cannot fail it". It cites the round-1 raw and its acceptance criteria
  include "Tests: +0 ~1 -0".
- [Observed: delta] That case is untouched. I did not see it fail in this round's runs.

### No assertion moved, and the Tests line

- [Observed: `results/compare-tests.txt`] The diff removes 10 lines from the three changed test files. The PR body's
  account of these 10 lines is exact:
  - 4 imports;
  - 2 draft-preview lines, the launch and its `finally`, from the first revision;
  - 4 profile arguments, one per cleanup case.
- Two of the argument lines open with `expect(() => removeBrowserProfile(`. The paired added line differs only inside
  the first argument, `'/tmp/syzygy-browser-profile'` → `missingProfile()`, and the `.toThrow(…)` lines below are
  untouched. The only other in-case change is the added `const root = privateRoot();`.
- Inside the four cases (base versus head, same 4 names), the only lines changed are those arguments and that added
  line. **No matcher and no expected value on `main` changed.**
- **Name sets** (`npx vitest list`, base `3ec69299` 5244 lines and 5235 distinct; head 5261 and 5252):
  - added 17, removed 0;
  - +16 in `cdp-browser.test.ts` and +1 in `cdp-browser.browser.test.ts`.
- Of the 17, 5 are the round-2 names. The PR's `Tests: +17 ~4 -0` is consistent: name sets cannot see `~`, and the four
  argument-only cases are the `~4`. The lane's own record says `'Tests: +17 ~0 -0'` and the PR body explains the
  difference.
- My base is the current merge base, not the lane's `df6046a1` (5170 lines), so my absolute counts differ; the
  delta does not.

## 5. New findings

Verdict-rule ruling. The brief says "A path by which the cleanup could delete a directory it did not create is
blocking."
- I found no such path **for any other account**:
  - the planted literal paths (run 6);
  - the new private roots (mode 700, run 7);
  - every link shape (run 8);
  - a link profile answered as another owner (P1a).
- The paths I did find (run 7's racer, P2, P3, P5) all need a process **running as the same user**. It must write into
  that user's own 0700 directories, or rename that user's own directory in a sticky or private temp directory.
- I rule these not blocking, for three reasons:
  - such a process can delete the same directory directly, so the cleanup gives it nothing new;
  - round 1 drew the same line for N1 (a same-user process making the same name);
  - F1 fix 2, as the coordinator directed it, trusts a link exactly when it is the running user's.
- If the coordinator reads the rule as covering a same-user racer too, P5 is that path. Node's `fs` has no
  descriptor-relative removal, so it can be narrowed but not closed (N9).

### N8 — note — the profile owner check is not pinned against a profile path that is a link

- **Severity:** low. The code is right today [Observed: P1a].
- **Evidence.**
  - [Observed: run 11] `own-profile-check-follows-profile` replaces `lstat(profile)` at `cdp-browser.ts:311` with
    `lstat(realpathSync(profile))`, plus the import. It **SURVIVED**: exit 0, "31 passed".
  - [Observed: run 10] Built into the dist, the same mutant makes P1a remove the victim ("P1a … victim kept": `false`),
    so it is not equivalent.
  - The suite's only "profile not ours" case makes the profile a real directory, and its injected `lstat` answers
    for that path string. Its real path equals its path, so resolving it changes nothing.
- **Failure scenario.** A later edit resolves the profile path before the owner check, for example to normalize it,
  which `AGENTS.md` asks of `authorizeWrite`'s callers. A profile path that another user made as a link to one of our
  live Chrome profiles is then trusted, and our live Chrome's singleton directory is removed. Nothing fails. This is
  reachable only if some caller again passes a profile path in a shared directory, which F1 fix 1 removed, so it is
  a defense-in-depth gap.
- **Proposed fix (test-only).** Add a case in "Chrome singleton directory (syzygy-bpyt.4.11)":
  1. Make `real` (a directory holding `SingletonSocket` linked to a Chrome-named directory under the private root),
     and a link `profile -> real`.
  2. Call `removeBrowserProfile(profile, { remove: () => undefined, lstat: lstatWith(profile, { uid:
     <its uid> + 1n }) })`.
  3. Expect the Chrome-named directory to survive.
  4. Re-run `own-profile-check-follows-profile` (fragments in `results/mutants-r2.json`): it must be killed.
- `Tests: +1 ~0 -0`.

### N9 — note — two same-user windows sit between a check and the action it guards; one is not disclosed

- **Severity:** low. No other account can open either window (section 4).
- **Evidence.**
  - *Owner check, then read.* `chromeSingletonDirectory` (`cdp-browser.ts:311-312`) owner-checks the link with
    `lstat(link)`, then `readlinkSync(link)` resolves the path again.
    - [Observed: P2, through the seam] A link swapped in between names a directory that is then removed.
    - The PR's Residuals do not mention this window. The doc comment says "The link is read only if the profile and
      the link are the running user's", which is true only for the instant of the `lstat`.
  - *Identity check, then remove.* `removeChromeSingletonDirectory` (`:325-326`) checks identity with
    `lstat(recorded.path)`, then `rmSync(recorded.path)` resolves the path again.
    - [Observed: P3 through the seam. P5 without it: 12 of 1000 trials removed the replacement.]
    - The PR's "Identity limits" discloses this one: "a replacement by a directory is not detected".
  - Who can open them: a writer of the profile directory for the first, and anyone who can rename the user's
    directory in TMPDIR for the second. With `mkdtemp` profiles (0700), a sticky `/tmp` or a private TMPDIR, that is
    the running user or root only [Inferred from permission semantics; Observed modes 700 and 755].
  - The owner check also covers only the final path component and not its mode.
- **Failure scenario.** A future caller passes a profile, or a TMPDIR, that is group- or world-writable without the
  sticky bit, for example a shared CI scratch directory. Another account can then swap the link or the directory
  inside the window and steer the recursive removal to a directory of its choosing that we can delete.
- **Proposed fix.**
  1. Disclose the owner-check-then-read window beside "Identity limits" in the PR Residuals.
  2. Say in the doc comment at `:303-307` that the guarantee holds for a private profile (`mkdtemp`) in a sticky or
     private temp directory.
  3. Optionally, cheap and test-only to pin:
     - (a) refuse the profile unless `(lstat(profile).mode & 0o022) === 0n`, so a group- or world-writable profile
       is never read;
     - (b) narrow the removal window: rename the directory to a fresh random name in the same parent, compare that
       entry's identity, then `rmSync` it, or rename it back on a mismatch.
     Either needs its own case and rule-6 mutant. Neither closes the window against the running user, and nothing
     in Node's `fs` can.

### N10 — note, editorial — "the identity tells the two apart" claims more than device and inode give

- **Severity:** editorial.
- **Evidence.**
  - [Observed] `cdp-browser.ts:282-285`: "…another Chrome in the same temp directory can then make one under the same
    name before this one is removed; the identity tells the two apart."
  - The PR body and the test comment (`cdp-browser.test.ts:465`, "which a file system may reuse") both say that inode
    numbers can be reused. [Observed: P4] Not reused on this host's tmpfs. [Inferred] Reused on file systems such as
    ext4.
- **Failure scenario.** A maintainer reads the code comment as a guarantee. They then widen the name pattern or drop
  another guard on the strength of the identity check.
- **Proposed fix.** Reword it to: "the identity tells the two apart unless the file system has reused the inode
  number". Optionally also record and compare `birthtimeNs` where the platform reports a nonzero value.

### N11 — note, editorial — the PR body's repair heading reads as if the repair were on `main`

- **Severity:** editorial; PR prose only.
- **Evidence.** [Observed] The PR body says "Repaired on `origin/main` at `3ec69299` (merged; the code commit is
  `bcd39b4e`)". `git merge-base --is-ancestor bcd39b4e 71334012` exits 1, so the repair is not on `main`. What
  happened is that `main` at `3ec69299` was merged into the branch (`6dcf9490`).
- **Failure scenario.** A reader of the change record looks for the repair on `main`, or treats it as landed.
- **Proposed fix.** Write "Repaired on the branch (code commit `bcd39b4e`), with `origin/main` at `3ec69299` merged
  in (`6dcf9490`)."

## 6. Every changed output

None. [Observed]:
- Outside the evidence directory, the subject is exactly 4 files: `cdp-browser.ts`, `cdp-browser.test.ts`,
  `cdp-browser.browser.test.ts` and `polaris-generation/draft-preview.browser.test.ts`. This holds against
  `3ec69299` and against the lane's `df6046a1` (`results/evidence-commits.txt`).
- The round-2 hunks in `cdp-browser.ts` change only:
  - the `node:fs` import (adding `type BigIntStats`);
  - the 145 comment;
  - the new `ChromeSingletonDirectory`, `readEntry` and `ownedByRunningUser`;
  - the bodies of `chromeSingletonDirectory` and `removeChromeSingletonDirectory`;
  - `BrowserProfileRemoval`, `removeBrowserProfile`;
  - the declared type of `launchBrowser`'s `singleton`.
- The CDP launch arguments, including `--disable-ipc-flooding-protection` and `Emulation.setFocusEmulationEnabled`, and
  the spawn options are untouched. No renderer, route, wire format, fixture or exit path is touched.
- I did not re-run round 1's `polaris-accessibility-main` comparison. Between `490332aa` and the head, nothing on that
  command's path changes except which directories the removal keeps [Inferred from the delta].
- The battery is 110 commands, all exit 0, and `check_governance`'s summary line is the same as round 1's. Hosted
  `checks` and `node` pass at the head.

## 7. Verdict per acceptance criterion

1. **"After a passing run of every Chrome-driven vitest file with a fresh private TMPDIR, that TMPDIR holds no
   .com.google.Chrome.* or polaris-draft-browser-* directory (listing recorded before and after)."** **Met.**
   - [Observed: run 13] `cdp-browser.browser.test.ts` passed 10 of 10 times. Each TMPDIR was listed empty before and
     held `node-compile-cache` only after. The launch probe left 0 entries over 240 launches.
   - [Observed: records, by script]
     - `browser-files-head-r1`: Chrome 120, 11 files, 11 passed, 11 on their first attempt, 0 entries left over all
       attempts. The combined run exits 0 with "tests 119 passed 118 skipped 1" and leaves 0.
     - `browser-files-head-chrome154-r1`: the same under Chrome for Testing 154.0.8037.57.
     - `chrome-matrix-head-r1`: 120, 145, 147, 149, 151 and 154 all "passed", one attempt each, `left []`.
   - The F1 repair needed this listing re-run. It was re-run (records at `0410e3cd`, which is code-identical to the
     head) and again here.
2. **"A killed run's leftover is covered by syzygy-bpyt.4.10's sweep, or is stated as out of scope."** **Met:**
   stated out of scope in the criteria table and the Residuals.
3. **"No change to any test's assertions; Tests +0 ~0 -0 unless a cleanup test is added."** **Met** (section 4, "No
   assertion moved"): +17 ~4 −0, and every added test is a cleanup test.
4. **"CC-REV-1 class stated (expected none)."** **Met.** The PR states none and asks to be reclassified if the
   reviewer reads class 4. I rule none (section 2).
- **Round-1 repair items 1–9:**
  - F1 fix 1, F1 fix 2, N1, N2, N4 and N5: repaired;
  - N3: repaired, with the test name kept as allowed;
  - N6: disclosed;
  - N7: filed as `syzygy-bpyt.4.21`.
- **No repair introduced a new defect.** One claim is not fully recorded: the owner-check-then-read window (N9).
- **The PR body.** Every figure I re-derived agrees with the bytes, except the N11 wording:
  - the battery line;
  - the hosted runs and their durations;
  - the 10 removed lines;
  - +17 names;
  - 31 of 31 mutants (31 records, 31 `killed`; 30 with one attempt each, and the one `leak` mutant a single run by
    design);
  - "no … needed a second attempt";
  - the four code files;
  - `bcd39b4e` as the last code commit;
  - the evidence commits being code-identical to it;
  - the round-1 review digest and verdict carried in `verification-round1-2026-10-25.json`.
- Two claims I did not reproduce:
  - `assemble_round1.py`'s "it stopped on a mutant I set to `SURVIVED`";
  - the 2026-10-22 launch-probe figures, which predate round 1 and were not re-run by the lane.
- `launch_probe.py`'s base mode cannot run at the head: its fragment `removeChromeSingletonDirectory(singleton);` now
  reads `(singleton, options.lstat)`. It fails loudly ("the removal call must occur once"). Its records are bound to
  `dccd484f`, so this is not a finding.

## 8. Cleanup

- [Observed] Removed after the runs:
  - the scratch clones `rev-515b/clone` and `rev-515b/gov`;
  - the worktrees `rev-515b/head2` (at `6dcf9490`), `rev-515b/r1` (at `490332aa`) and `rev-515b/base` (at
    `3ec69299`);
  - every private TMPDIR I made. I removed `/tmp/r515b-1`, `-2`, `-3`, `-p1`, `-p2`, `-pc`, `-px`, `-v1`, `-v2`, and
    `-rt` (made at the end to re-check the N5 sandbox: as uid 0 with "CapEff:	000001ffffffffff" and label
    "bwrap//&unpriv_bwrap (enforce)", `rm` in a 0555 directory printed "rm: cannot remove
    '/tmp/r515b-rt/locked/file': Permission denied"; `/proc/sys/kernel/apparmor_restrict_unprivileged_userns` read
    `1`). The tools removed their own: `-p3` (`mutant_dist_probe.py`), and the harnesses' `-m<n>-<k>`, `-b<i>` and
    `-l<i>`.
  - Before deleting, `find /tmp -maxdepth 1 -name 'r515b*'` listed exactly the nine above; afterwards
    `ls -d /tmp/r515b*` printed "ls: cannot access '/tmp/r515b*': No such file or directory".
  - None of the five scratch trees was registered as a worktree of `/home/tze/GitHub/syzygy` (`git worktree list
    --porcelain` there names no `rev-515b` path); the three worktrees belonged to my own clone.
- The victim and racer probes ran in a private tmpfs `/tmp` inside `bwrap`, which vanished with the sandbox. Nothing
  was created in, or deleted from, the shared `/tmp` outside my own TMPDIRs.
- No process was killed by pattern. The only signals came from my own tools, to their own children:
  - `victim_probe.sh` sent SIGTERM to the racer PID it started;
  - `safety_probe.mjs` sent SIGKILL to the racer child it spawned;
  - round 1's decoy probe sent SIGSTOP, then SIGKILL, to the network helper of a Chrome that was a child of its own
    Node process;
  - the product's own `closeDisposableBrowser` killed the leaders it had launched, in the tests and the launch probe.
- Kept, with sha256:
  - `tools/`:
    - `battery.py` `9883cb0718555b1a471200ba9efe61605983cfa6fe99c92b84a42806cea6451e`
    - `check_records_r2.py` `5d1b5fa8151b8eb04d94e1cbbb573df897c779f6df19db09bbb57c48a5d49af4`
    - `compare_tests.py` `a4a6dcf2a44352243d9842b1dbc8eb49b219269ec0bf5e5c519fd590bd5be401`
    - `decoy_probe_r1_prefixed.mjs` `ab4e44aedf72ea8f6772c0a5f8b41b588d1af6ae0b10b8656931d7681f723b99`
    - `evidence_commits.py` `ad69c53185704532d92decd17480a04e074292ce551c33d718d941588375cf31`
    - `identity.py` `a6ba5d3fc3d3351fcb1a5af89f437eb1aa26179caf9889cf89a85bd18b461d43`
    - `mutant_dist_probe.py` `050c5d117daf6439466a1d0008e5fbe4cc533cfa82ae5a89f9dfdf98e0409fad`
    - `mutants_r2.py` `1b77a3ceb488a23a648a3ba47add7f89b5da9ab68deb638712fa2c8e5bdd8bed`
    - `racer.mjs` `6d8d640f676957262895adcd748a79ba71430571649c2ac7d20cad468071babf`
    - `repeat_real_chrome.py` `2be5cd7ef7fbf77119a610e58c53a217c05c328d9d06e07ccf2bf98365595b6c`
    - `safety_probe.mjs` `ffb5df83f06bf90448de5808eff98c10a8a79c70165ea9b021f59798468b6cc2`
    - `shape.py` `88b86fc18448b6ade063ae6306dc142474a20f3714863c4760ff044860965b0a`
    - `victim_probe.sh` `32d4d46afff210d0ef1b40c1fae96092d1871ef40d6b59f7669fa303942fbc09`
  - Revision notes on three tools:
    - `mutants_r2.py` gained its necessity variants after `results/mutants-r2.json` was made. That only appended
      mutants; the earlier ones are unchanged.
    - `victim_probe.sh` widened its output filter after `victim-head-old.log`, `victim-r1-old.log` and
      `victim-head-race.log` were made.
    - `safety_probe.mjs` fixed its own cleanup helper after `safety-probe-1.json` was made.
  - `results/`:
    - `authority-sweep.log` `b33e8be1181118c0b37218d5b19fb38b49519c083928fe503fdf43c063f0c4ab`
    - `battery-logs.txt` `4ef8185f668f0d56724313e0bbcf5a57dbb698d0e981c2d5b959239bb7f92ef5`
    - `battery.log` `20603f032b9a8c3f67faed2895631ad932457d404ca6bf826b46d3abbb46fe01`
    - `compare-tests.txt` `9a4e94abe7b892edcc51b51ff49ddfa41d9af7cbb1aecec419adcee1961e1aea`
    - `decoy-probe-head.json` `920fc8d8b63cabd8e0280a7cc280c30f0707076ff385d690b50f29feddbbaaf9`
    - `decoy-probe-head.log` `0937b8902e07462aeb7d5d0af0ded367133e27ed28c7ec0b6a4ad14cfef5d2b7`
    - `evidence-commits.txt` `50d61c99248d271c102deb7a4b15fe1c42eeab9dc9b84eccc5128019e76897df`
    - `hosted-node-excerpt.txt` `2b07a27ff0c29afa049f0b2cecae5b145ca3283687cc638d1bfb7eec1d8e06fc`
    - `identity.txt` `f37c514173ab96b63b83fa75794b1982e22067bd56879cd3ceb8c470f1bd522e`
    - `lane-named-mutant-edits.json` `22fe0aed614003297dc5ba71074b1155dd16ae1fffea0922ee33e46dad988ce1`
    - `launch-probe-head-run1.json` `c21c891c4e033cbb4b81d7f3cc7aa95ad2d3ca2e99564472d640659d1e0e1926`
    - `launch-probe-head-run2.json` `3da865ef5d9eb97d3897d1656a3de40ca73c474cbf30eefc3197acf077293976`
    - `launch-probe-head-run3.json` `9de30b9d378f0e4a04c2e0bd2373edacd3c3fecdcd47cb4a6baf7405e8dc7747`
    - `launch-probe-head-run4.json` `2dedb2f61618c3cef0be6f00b3ae5c071918a0c734b117f3891721342e991134`
    - `launch-probe-head-run5.json` `f6a5b534ed9d9e53cf389500f0837704a94dcaaaea4b26075812f97f18c5b680`
    - `launch-probe-head-run6.json` `6438a6e19b216efdcb58f140bb4a07788c056239960798ad7ca3758e151ff92b`
    - `launch-probe-head-run7.json` `aa1fb63acb567dcd45d155d6a625ca8efed06df0b1a1276f45418de97d8cb3d6`
    - `launch-probe-head-run8.json` `20194bbcd950d0a91be536f45c442151bcc7f2612bb70f4085cdc6b9ea22a955`
    - `launch-probe-head-run9.json` `408cbfd369a363d5ba22b3f371246dd25107951bf265c878559b729dc1558657`
    - `launch-probe-head-run10.json` `a03be827af3bc88608b7e7108273e3bf958c98b38da9d2866fc989f5ebb00fc3`
    - `mutants-r2-at-490332aa.json` `dd0269bd1880c7e948999394bdfa90a00a8fd094a5bdc214d206d5981f503ee2`
    - `mutants-r2-at-490332aa.log` `b5ab4b60e806cfee1421868ae996ba3274ecb494fa7d720c2b4890f20cd4c943`
    - `mutants-r2-necessity.json` `7d0180493ef88f89b8810856b5d4f9261cfba4d41bcc37795aed570d37a2c094`
    - `mutants-r2-necessity.log` `7526e709bb4e9f04ca1a6fa627168c9504f53b0ee6b4416db24b242f93043663`
    - `mutants-r2.json` `72a69f8d7c8389af51c9840810b55495a8e7f64229660d1378d284e6674eb0f4`
    - `mutants-r2.log` `3f9c75d5dd5acf5c1c1696bcad05b64f1b307101a08067eca7f2a1177bdba2d4`
    - `npm-ci.log` `d10275741ededc3115f459c96db72da571e9d8dc9211740789b5a9d05f5b603e`
    - `npm-ci-base.log` `ec863edd1902f393f89dbae6292f427d2c3217791ca8a62b9adbcdc6e529b47b`
    - `npm-ci-head2.log` `77c18f5c26888b4ee120519df09efa079f6ba755b26e89d2d28cb5f0dc96aed7`
    - `npm-ci-r1.log` `77c18f5c26888b4ee120519df09efa079f6ba755b26e89d2d28cb5f0dc96aed7`
    - `records-check.txt` `1c7989e01615267162ec6801930968782959a9a269879c379f0c85e9b8e36ba5`
    - `repeat-real-chrome-runs1-5.json` `8c43813c606f47e42d43791739687eb2cc8e70b85f900b48ef038f8349b8ba8a`
    - `repeat-real-chrome-runs1-5.log` `08cecebb317d3234387f98518a4a8d81144da806a4baa0f7816475222938e23a`
    - `repeat-real-chrome-runs6-10.json` `2f9bc793a9ad9af24c7c9b0b6a7eededbf50f86d878ce400ca127b630e3d58c6`
    - `repeat-real-chrome-runs6-10.log` `ceb0feaf71638305a089b0895aefe733f51b6b78eb21725d4e39edca450aa4c8`
    - `safety-probe-1.json` `44414fe6b3a82311fcaf58a329bab1d57c6cd482e758b06faaee2368346ce0ac`
    - `safety-probe-2.json` `c0505ed2ebf8d9cf6b7a867a48ecf83ee62871b33b12126a2550672907f2de17`
    - `safety-probe-mutant-follows-profile.json` `323c38d2434e8ef931fdc75033204e2e1558060def776043c1ef8e8ec78fe91d`
    - `subject-paths.txt` `dffe7d97b9b5aa140b1488a469f3572722e70539957358b838d9139f765d6bea`
    - `two-files-run1.log` `97a3c8bb599bcb069d6018d1bafdf0c9ae1b01040516dd1610303ddc61c4f80b`
    - `typecheck.log` `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f`
    - `typecheck-head2.log` `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f`
    - `unit-as-userns-root.log` `0513ce4195208f98805a2ab01388c0639671f0139d167a8d87b28ba56ecbd065`
    - `victim-head-old.log` `6fb76c83d581821ff22bc09dc17ad7a87e76a3462f83e637d8b46023a01d6f7f`
    - `victim-head-race.log` `381e056863ad415c563b669e00e69b4d080b8437639bc9bfff0007f646947080`
    - `victim-head-race.four-cases.json` `451de3790ac1911b32e6e0246cdab03c03b7eb5e5f9d162bb57fdbfce6d5ab7d`
    - `victim-head-race.whole-file.json` `b6eeb608245fdeed37606c87ff7b763a6c73d313a12408d6ed1bb2e1e14c074d`
    - `victim-head-race2.log` `898997aad372b75c010b7097da0d76d65749fa409bb3686aaa554dcea8407ea0`
    - `victim-head-race2.four-cases.json` `7fe6a3271c64be7778cf17d31373c2b3b5d0299abe408edef14572d49a0a14dc`
    - `victim-head-race2.whole-file.json` `63ea8f7a852402ee027a441916961086d4772b80ffe8b6595869ab7c6c0760f9`
    - `victim-r1-old.log` `21f719fce30993b04e978edee0392a40fb4313a638f87c84c127997fcf1bc582`
    - `vitest-list-base.txt` `74981e2142e0360a0f6fdec79070de92cb557d96cb466847e3144cc1895c8d5c`
    - `vitest-list-head.txt` `7e2be9a9d9fd070b9bd5e586dd633d095d6a4725d19729e362f9cdd823f25e9e`
  - Not kept:
    - the full hosted node job log (excerpt kept);
    - the 110 per-command battery logs (concatenated into `battery-logs.txt`);
    - my re-derived copy of the subject diff (its digest matched; section 1);
    - two empty `vitest list` stderr files.
