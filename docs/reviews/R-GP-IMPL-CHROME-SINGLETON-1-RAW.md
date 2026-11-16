# R-GP-IMPL-CHROME-SINGLETON-1 — CC-REV-1 implementation review of syzygy-bpyt.4.11, round 1
Verdict: REVISE
Reviewed commit: 490332aa
Subject: r1-review.diff sha256 a41c58ec78cdb30a1e6463ba7332dcf575e384472b23988d3cd213c047526436

Reviewer: independent fresh-context reviewer (rev-515), 2026-10-24. Full reviewed commit
`490332aa7cc1cdf818ae01bd46e375f8280d8b7d`, base `9a30237ed700e6579f3fcc1c6292e6c759861c3f`, PR #515, bead
`syzygy-bpyt.4.11`. Nothing in the subject, the PR, the tracker or any worktree under `.worktrees/` was changed. No
target repository content was read. Tools and result files are kept beside this raw, under `rev-515/tools/` and
`rev-515/results/` in the coordinator's scratchpad.

One blocking finding (F1) and seven notes (N1–N7). F1 is a reproduced path by which the new cleanup deletes a
directory the run did not create. The fix is small and touches no assertion.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b411/r1-review.diff` printed
  `a41c58ec78cdb30a1e6463ba7332dcf575e384472b23988d3cd213c047526436`. This **matches** the brief.
- [Observed] In a fresh clone checked out at `490332aa…`, `git diff 9a30237ed700e6579f3fcc1c6292e6c759861c3f
  490332aa7cc1cdf818ae01bd46e375f8280d8b7d | sha256sum` printed the same digest. So the frozen file is that diff.
- [Observed] `git merge-base 9a30237e 490332aa` is `9a30237ed700e6579f3fcc1c6292e6c759861c3f`. The branch is 11
  linear commits on that base, `0856f922` to `490332aa`.
- [Observed] `git diff --name-only 9a30237e 490332aa` lists 33 files. Four lie outside
  `docs/evidence/chrome-singleton-leak-2026-10-22/`: `apps/three-surface-poc/src/cdp-browser.ts`,
  `cdp-browser.test.ts`, `cdp-browser.browser.test.ts` and `polaris-generation/draft-preview.browser.test.ts`.
  `test-model-fixture.ts`, the dossier render files and the `syzygy-bpyt.4.12` stray are not in the diff.
- [Observed] `gh pr view 515` reports `headRefOid` `490332aa7cc1cdf818ae01bd46e375f8280d8b7d`, so the PR head has not
  moved since the brief.
- [Observed] The evidence commits match the head's code. Over `apps packages scripts vitest.config.ts package.json
  package-lock.json tsconfig.json tsconfig.base.json`, `git diff --name-only <c> 490332aa` lists 0 files for each of
  `aa74cbb9`, `dccd484f`, `6f84e689` and `012e6c84`. It lists 3 for `8dc316a7`, which is named only as the commit of
  the replaced records. All five are ancestors of `490332aa`.
- [Observed] At the head, the four code files hash to the `sha256AtCommit` values in `mutants-cdp-2026-10-22.json`
  (`treeCommit` `dccd484f…`): `cdp-browser.ts` `c6c0ac6c…42033`, `cdp-browser.test.ts` `a655dd3f…e265e`,
  `cdp-browser.browser.test.ts` `2f659ee9…a1e`, `draft-preview.browser.test.ts` `70102033…856f`.
- [Unknown] The merge with main at `ce322e1a` was not built or tested here. The coordinator merges at landing.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, section "CC-REV-1 — Mandatory
independent review classes"):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Class 6: "**public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
  depend on;"
- "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact." and "**A reviewer or the owner** may reclassify at any time."

**SEC-4** (`.syzygy/governance/doctrine/security.md`): "Syzygy writes into a governed repository only with recorded
consent, and every write can be traced and undone." SEC-1 covers serving, SEC-2 data leaving owner infrastructure,
SEC-3 running observed-project code, and SEC-5 secrets.

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, Part 1):
- "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an
  exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- The extra checks apply to "pull requests touching class 1 (authority boundaries), class 3 (deterministic
  observation) or class 4 (security), and class-6 pull requests that remove an endpoint". They are "an old-versus-new
  differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant for each
  predicate; a non-blocking owner notice in the cycle report."

**AGENTS.md** at `490332aa`, verification rules:
- 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
- 9: "A claim of absence needs a sweep with a denominator."
- 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
  against the bytes it describes."

**The brief's verdict rule:** "A path by which the cleanup could delete a directory it did not create, or anything
outside its TMPDIR, is blocking."

**Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):
- 2: "Every bugfix ships a regression test — Written to fail on pre-fix code."
- 3: "Edge and failure paths are first-class".
- 5: "Mock only at boundaries you don't own".
- 6: "Deterministic or quarantined".

**Ruling: no class (none).** It agrees with the change record.
- Class 4 by its letter covers SEC-1…SEC-5, auth surfaces and egress paths. The change removes a Chrome socket
  directory from a local temp directory. That is not serving (SEC-1), not data leaving owner infrastructure (SEC-2),
  and not running observed code (SEC-3): the pages Chrome loads are Syzygy-rendered `file://` and `data:` pages. It is
  not a write into a governed repository (SEC-4), and it touches no secret (SEC-5). No auth surface or egress path is
  touched.
- Recursive deletion under a shared `/tmp` is a host-safety question. I judged it under the brief's verdict rule (F1,
  N1), not as class 4. F1 does not change this ruling: it is a hermeticity defect in a test seam, not a SEC surface.
- **The operator commands do not change the class.** `polaris-accessibility-main`, `polaris-keyboard-sweep-main` and
  `polaris-accessible-names-main` reach the change only through `launchBrowser` [Observed: `grep` of the three files;
  none imports `removeBrowserProfile`].
  - What they delete now, and from where: besides their profile (as before), the singleton directory of their own
    Chrome. The path is read from the `SingletonSocket` link in that profile (a fresh `mkdtempSync` directory) and is
    removed only when it sits directly under their `os.tmpdir()` (`/tmp` when TMPDIR is unset), carries Chrome's
    name, is a real directory and belongs to the user [Observed: `cdp-browser.ts:278-300, 489-552`].
  - [Observed] I ran `polaris-accessibility-main` (dist) at the head and at the base, each with its own private
    TMPDIR. Both exited 0 and printed the same 7 stdout lines, except the `--out` path I gave them. The written JSON
    bodies differ only in `capturedAt`, `commit` and the six `variants[i].url` temp paths. Neither left anything in
    its TMPDIR.
  - No external consumer can depend on the directory existing, so class 6 is not touched.
- **GP-Q0 "behavior-preserving":** yes.
  - [Observed] No rendered byte or wire format changes (above, and section 5).
  - [Inferred from code] No exit code changes. `isChromeSingletonDirectory` is pure. `readlinkSync`, `lstatSync` and
    `rmSync` sit inside `try`, so no new throw path exists. My mutant `readlink-failure-propagates` (section 3) shows
    the `catch` matters.
  - No consent, security or retention decision changes.
- **GP-Q0 extras.** They are not required for a class-none change. The rule-6 part is met anyway: the lane's 21
  mutants cover each predicate (parent, name, anchor, suffix, dot ×4, Chromium form, `lstat`, `isDirectory`, uid,
  failure swallow, the launch read and each cleanup site). My 7 mutants add one survivor (N2). The differential over
  a mutated-record corpus does not apply: no record is parsed. The owner notice does not apply.

## 3. What I ran, and the results

Every run used its own fresh private TMPDIR under `/tmp/r515-*`, created empty, with Chrome 120.0.6099.224
(`/usr/bin/google-chrome`) and Node v24.6.0, in scratch clones at `490332aa`. The load average was 37–50.

| # | Command or probe | Result [Observed] |
|---|---|---|
| 1 | `npm ci`; `npm run typecheck` | both exit 0 |
| 2 | `vitest run --project @syzygy/three-surface-poc-app …/cdp-browser.test.ts` (`/tmp/r515-1`) | "Tests  24 passed (24)"; TMPDIR afterwards: `node-compile-cache` only |
| 3 | the same for `cdp-browser.browser.test.ts` (`/tmp/r515-2`) | "Tests  2 passed (2)"; both cases ✓; afterwards `node-compile-cache` only |
| 4 | the same for `draft-preview.browser.test.ts` (`/tmp/r515-3`) | "Tests  1 passed (1)"; afterwards `node-compile-cache` only |
| 5 | the whole app project, all 89 files in one TMPDIR (`/tmp/r515-4`) | "Test Files  88 passed \| 1 skipped (89)", "Tests  1107 passed \| 2 skipped (1109)", exit 0. The skips are `project-shape-discovery.live.test.ts` and one case of `polaris-opening-index.browser.test.ts`. Afterwards: `node-compile-cache` only, so 0 Chrome directories, 0 `polaris-draft-browser-*` and 0 profiles. This is the fully green combined run the PR body says it could not get |
| 6 | `python3 scripts/check_governance.py` at the head | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0. At the base, the same summary line. The OK/WARN lines differ only in the examined-population counts of CG-1f (442 → 441 references, 0 findings both) and CG-2a (2057 → 2066 files, 0 findings both) |
| 7 | `cdp-browser.browser.test.ts` with `TMPDIR=/tmp/r515-q1/` (trailing slash) | "Tests  2 passed (2)"; afterwards `node-compile-cache` only |
| 8 | the same with `TMPDIR=/tmp/r515-ql`, a symlink to `/tmp/r515-q2` | "Tests  2 passed (2)"; `/tmp/r515-q2` afterwards held `node-compile-cache` only |
| 9 | `SYZYGY_POC_BROWSER=/bin/false`, draft-preview (`/tmp/r515-5`) | fails by design: "Error: browser exited with 1 before announcing a DevTools endpoint:"; afterwards `node-compile-cache` only, so no draft directory and no profile |
| 10 | My `my_mutants.py` (sha256 `6c372fc8…51cf`) over the unit and real-Chrome files. Record `results/my-mutants.json`, sha256 `8a81d716…53c3`, `treeCommit` `490332aa…`, source sha256 `c6c0ac6c…42033`; each mutant's `old`/`new` fragment is stored | control "CONTROL-PASS", 26/26, nothing left. **Leak:** `leak-singleton-not-read-while-running` (the lane's `singleton-not-read-while-running` edit) killed by the real-Chrome case: "AssertionError: expected true to be false // Object.is equality", leaving `.com.google.Chrome.I78v4O`, `.com.google.Chrome.phSwzN`. `leak-removal-is-a-no-op` killed by the real-Chrome case and 5 unit cases, leaving 2 directories. **Guards:** `guard-lstat-becomes-stat` (the lane's `stat-follows-links`) killed: "Error: ENOENT: no such file or directory, lstat '/tmp/r515-m3-1/syzygy-singleton-yu1YMJ/.com.google.Chrome.LinkTo'". `guard-parent-not-checked` (the lane's `parent-not-checked`) killed: "AssertionError: expected false to be true // Object.is equality". **New:** `guard-parent-prefix-comparison` killed by the nested-directory case. `readlink-failure-propagates` killed by 5 cases. `guard-name-case-insensitive` **SURVIVED** (N2). File restored after each mutant (`restored: true` ×8). My three re-runs of lane mutants match the lane's record in outcome and in the killing test's first error line |
| 11 | My `decoy_probe.mjs` (sha256 `249366e6…50f1`) against the head's dist `cdp-browser.js`. Record `results/decoy-probe-1.json`, sha256 `e91386b6…6155`. TMPDIR `/tmp/r515-p1`, with an "outside" directory `/tmp/r515-px` and cwd `/tmp/r515-pc` | **Part A** (`removeBrowserProfile` on a profile whose `SingletonSocket` I planted): 12 of 12 hold. Kept: an absolute target outside TMPDIR; a `..` path leaving TMPDIR; a `..` path staying inside it; a relative target (with matching directories in TMPDIR and cwd); a nested path; a final component that is a symlink to a directory outside (link and target kept); a final component that is a file; a trailing slash (TMPDIR itself kept); a link naming TMPDIR itself; a doubled slash; a name ending in a newline. The positive control removed exactly `.com.google.Chrome.Mine01` and kept `com.google.Chrome.Other1` and `org.chromium.Chromium.Other2`. **Part B** (two real Chromes in one TMPDIR, with 3 Chrome-named decoy directories and a Chrome-named symlink to a directory outside planted first): A's network helper frozen (1 pid), so A is closed through the kill path [Inferred: the repository test's mechanism]. `closeA` "ok"; A's `.com.google.Chrome.kCf3fL` removed; B's `.com.google.Chrome.oEiYRR` still present; B then navigated and evaluated (`bWorks: true`); `closeB` "ok" and B's directory removed. Every decoy, the symlink and its target survived. 0 profiles left. `"holds": true` |
| 12 | `node -e "rmSync(link,{recursive:true,force:true})"` on a symlink to a directory (`/tmp/r515-6`) | "link=absent target-sentinel=present": `rmSync` removed the top-level link and left its target |
| 13 | My `fixed_path_probe.sh` (sha256 `e4af9afa…f520`) inside `bwrap --dev-bind / / --tmpfs /tmp --bind <rev-515> <rev-515>`, so `/tmp` is a private tmpfs. The script refuses to run unless `/tmp` is tmpfs and empty apart from the bound scratch path. Log `results/fixed-path-probe.log`, sha256 `ac2ec3e6…7761` | F1, reproduced; detail under F1 |
| 14 | `ps -eo pid,args` filtered with `grep -F -- '--user-data-dir=/tmp/r515'`, after all runs | 0 processes |

## 4. Findings

### Deletion safety, question by question (brief, "What to judge")

- **A `SingletonSocket` link pointing elsewhere.** Every shape the brief lists was kept: another Chrome's directory,
  `..`, an absolute target outside TMPDIR, a relative target, a nested path, and a final component that is a symlink
  [Observed: run 11 A1–A12, B]. The predicate is textual: the parent must be exactly `os.tmpdir()`, the name must
  match, then `lstat` must say directory with the user's uid. Every malformed shape fails closed, including two that
  name a real directory inside TMPDIR (`sub/../` and the doubled slash). In production the link is written by our
  own Chrome into a fresh `mkdtempSync` profile, so the link names our Chrome's directory. The exception is a profile
  path the code did not create, which the tests pass: F1.
- **TOCTOU between the read and the removal.**
  - When Chrome is killed, it never removes its directory, so the stored path still names ours at removal time.
  - When Chrome exits cleanly, it removes the directory itself. The later `lstat` gets ENOENT, which is swallowed. An
    unrelated directory can be removed only if a same-uid process creates the identical `<name>.<6 random>` in that
    window (N1).
  - A swap of the directory for a symlink between `lstat` and `rmSync` removes the link only [Observed: run 12].
- **Two Chromes sharing one TMPDIR:** safe [Observed: run 11 B].
- **The name pattern** is anchored at both ends, and JavaScript's `$` does not match before a final newline [Observed:
  run 11 A11]. The suffix class is `[A-Za-z0-9]+`. Case is not pinned by any test (N2).
- **`os.tmpdir()` versus Chrome's TMPDIR.**
  - TMPDIR unset: both use `/tmp` [Inferred].
  - Trailing slash: works and leaves nothing [Observed: run 7].
  - TMPDIR a symlink: works and leaves nothing; Chrome does not resolve the link [Observed: run 8].
  - TMPDIR unset with TMP or TEMP set: Node and Chrome disagree, so the removal is skipped (fail-closed) and the
    directory leaks (N6) [Inferred].
- **A failure to remove** is swallowed. It cannot fail a test run or an operator command [Observed: the unit case
  "does not fail the run…"; run 10 `readlink-failure-propagates`; Inferred from code: no new throw path].

### F1 — blocking — the fake-`remove` tests now read a link at a fixed path in the shared `/tmp`, and remove the directory it names

- **Severity.** Blocking under the brief's rule ("A path by which the cleanup could delete a directory it did not
  create… is blocking"). Likelihood is low. Blast radius is small but real: per planted link, one real directory of
  the running user, with Chrome's name, directly under the run's `os.tmpdir()`.
- **Evidence.**
  - [Observed] `apps/three-surface-poc/src/cdp-browser.test.ts:211, 222, 235` call
    `removeBrowserProfile('/tmp/syzygy-browser-profile', { remove: … })`.
  - `:251` calls ``removeBrowserProfile(`/tmp/syzygy-browser-profile-${run}`, { remove: … })`` for `run` 0 to 127.
  - These four tests are unchanged from the base, and they inject `remove` so that nothing real is touched.
  - At the head, `removeBrowserProfile` (`cdp-browser.ts:315`) runs
    `options.singleton ?? chromeSingletonDirectory(profile)` whatever `remove` was injected. It then calls the real
    `removeChromeSingletonDirectory` (`:317`). That reads `<profile>/SingletonSocket` in the shared `/tmp`, whatever
    TMPDIR is, and removes what the link names when it passes the guard.
  - [Observed] My mutant `readlink-failure-propagates` (run 10, TMPDIR `/tmp/r515-m7-1`) made the read visible: "Error:
    ENOENT: no such file or directory, readlink '/tmp/syzygy-browser-profile/SingletonSocket'" and "…readlink
    '/tmp/syzygy-browser-profile-0/SingletonSocket'".
  - [Observed] `git grep -F syzygy-browser-profile` finds only those 4 lines, so nothing in the repository creates
    the path. `ls -ld /tmp/syzygy-browser-profile /tmp/syzygy-browser-profile-0` on this host: "No such file or
    directory" for both.
- **Reproduction** [Observed: run 13, private-tmpfs `/tmp`, TMPDIR unset as in a default `npm test` or hosted run].
  The probe made a same-user `/tmp/.com.google.Chrome.Victim` (standing for another Chrome's singleton directory),
  planted `/tmp/syzygy-browser-profile/SingletonSocket -> /tmp/.com.google.Chrome.Victim/SingletonSocket`, and ran the
  unchanged pre-existing case "retries transient ENOTEMPTY failures and succeeds within the bound" alone:
  - head, no link planted: "Tests  1 passed | 23 skipped (24)", "after: victim=present sentinel=present";
  - head, link planted: "Tests  1 passed | 23 skipped (24)", "after: victim=absent sentinel=absent";
  - base `9a30237e`, link planted: "Tests  1 passed | 12 skipped (13)", "after: victim=present sentinel=present".
  The test passes either way and reports nothing.
- **Failure scenario.**
  - On a host with another local account, that account creates `/tmp/syzygy-browser-profile/`. `/tmp` is
    world-writable, so the first creator owns the path. It plants a link to a directory it can see by listing `/tmp`,
    for example the owner's desktop Chrome's `/tmp/.com.google.Chrome.XXXXXX` or a lane's running Chrome's.
  - The owner then runs `npm test` (or any run with TMPDIR unset). The unit case removes that directory, which the
    run did not create, and the live Chrome loses its process-singleton socket.
  - With a private TMPDIR the planted link must name a directory directly under that TMPDIR. A lane TMPDIR made with
    `mkdir` is mode 0755 and listable [Inferred], so it is reachable the same way.
  - In production code the path does not exist: `launchBrowser`'s profile is its own fresh `mkdtempSync` directory
    and only the user's processes can write in it [Inferred: Node creates mkdtemp directories 0700].
- **Proposed fix.**
  1. **Required, test-only.** In the four `browser profile cleanup` tests, replace the literal `/tmp/…` profile paths
     with a non-existent child of a private root the test creates (for example
     `join(mkdtempSync(join(tmpdir(), 'syzygy-profile-')), 'profile')`, removed in `afterEach`). No assertion changes.
  2. **Recommended, defense in depth.** Trust a `SingletonSocket` link only when `lstat` of the link and of its
     profile directory both report the running user's uid, or skip the fallback read when a `remove` override is
     injected. Add a case that plants a link at an injected-`remove` profile and asserts that the named directory
     survives, and a rule-6 mutant that drops the new check.
  3. Re-run the unit file and the AC1 listing afterwards.

### N1 — note — after a clean exit, the stored path is removed later and is not checked to be the same directory

- **Severity:** low. **Likelihood:** negligible.
- **Evidence.** [Observed: `cdp-browser.ts:493, 531, 294-300`] The path read at launch is kept as a string. At close,
  after the drain (at least two scans 25 ms apart), it is `lstat`-checked by type and uid only.
  - [Inferred] When Chrome exited cleanly, it has already removed that directory. A same-uid process that creates
    the identical name in the window (another lane's Chrome in the same TMPDIR) would have its directory removed.
  - The name carries 6 characters from a 62-letter alphabet, so the chance is about k / 62^6 (about k / 5.7·10^10)
    per clean close, where k is the number of same-prefix directories created in the window.
- **Failure scenario.** Two lanes share `/tmp`. Lane A's Chrome exits cleanly and removes `.com.google.Chrome.Ab12Cd`.
  Lane B's Chrome draws the same suffix within milliseconds, and A's cleanup removes B's live singleton directory.
- **Proposed fix.** Record `dev` and `ino` from an `lstat` at the launch read. At removal, require the same pair before
  `rmSync`. Add a unit case that removes the directory and recreates it under the same name between the read and the
  removal, asserting that the new one survives, and a mutant that drops the comparison.

### N2 — note — the name predicate's case sensitivity is not pinned

- **Severity:** low.
- **Evidence.** [Observed: run 10] `guard-name-case-insensitive` (the `i` flag added to `CHROME_SINGLETON_DIRECTORY`,
  `cdp-browser.ts:276`) **SURVIVED**: exit 0, 26/26. The near-miss list in "keeps a directory whose name is not exactly
  Chrome's…" (`cdp-browser.test.ts`) has no case variant.
- **Failure scenario.** A later edit makes the match case-insensitive and nothing fails. The predicate then accepts
  `.COM.GOOGLE.CHROME.<x>` names it was meant to refuse. Removal still needs our own link to name the directory, which
  is why this is a note.
- **Proposed fix.** Add `'.COM.GOOGLE.CHROME.AbCdEf'`, `'com.google.chrome.AbCdEf'` and `'ORG.chromium.Chromium.AbCdEf'`
  to the near-miss list.

### N3 — note — the comments and one test name say "147", but the evidence shows the dotless name from 145

- **Severity:** editorial.
- **Evidence.**
  - [Observed] `chrome-names-2026-10-22.json` records "Google Chrome for Testing 145.0.7632.6" with shape
    `org.chromium.Chromium.<random>` and `leadingDot` false. The PR body says "145 to 154".
  - The code says "the Chrome for Testing builds 147 to 154" and "where the dot went between 120 and 147 is not known"
    (`cdp-browser.ts:269-270`). The browser test says "the builds from 147 to 155" (`cdp-browser.browser.test.ts:11-12,
    97`). One unit test is named "…which Chrome 147 to 155 make…" (`cdp-browser.test.ts:319`).
- **Failure scenario.** A maintainer bisecting the dot's history starts from 147 and misses that 145 is already
  dotless.
- **Proposed fix.** Say 145 in those four places. Renaming the test changes the name-set delta; the coordinator can
  leave the name and fix only the comments.

### N4 — note — three evidence records name their commit but not the subject's digest (rule 11)

- **Severity:** low. The commit is code-identical to the head, so the records can still be re-checked.
- **Evidence.** [Observed: `tools/check_records.py`, output `results/records-summary.txt`]
  - `browser-files-base-2026-10-22.json`, `browser-files-head-2026-10-22.json` and
    `browser-files-head-chrome154-2026-10-22.json` carry a full `treeCommit` and no `sha256AtCommit` (0 digest fields).
  - The other 13 commit-carrying records of the 19 carry a full 40-hex commit and the digests of the files they
    exercise.
  - `chrome-names` carries no commit; it digests the Chrome executables it probed, which are its subject.
- **Failure scenario.** A rebase or squash re-hashes the recorded commit, and AC1's records can no longer be tied to
  the bytes they ran.
- **Proposed fix.** Add `sha256AtCommit` for the four code files to `browser_files_run.py`'s output and regenerate, or
  add it to the existing records from `git show <treeCommit>:<path> | sha256sum`.

### N5 — note — "does not fail the run when the singleton directory cannot be removed" depends on not running as root

- **Severity:** low.
- **Evidence.** [Observed: `cdp-browser.test.ts:405`] The case makes the removal fail with `chmodSync(stuck, 0o555)`
  and then expects `…/SingletonSocket` to still exist. [Inferred] Under uid 0, permission bits do not stop the
  unlink, so the removal succeeds and that expectation fails.
- **Failure scenario.** The suite runs in a root container and this case fails with no defect present.
- **Proposed fix.** Skip the case when `process.getuid?.() === 0`, or make the removal fail another way, for example a
  directory on a read-only bind mount where one is available.

### N6 — note — when TMPDIR is unset but TMP or TEMP is set, the directory still leaks (fail-closed)

- **Severity:** low. This is an AC1 residual, not a safety issue.
- **Evidence.** [Inferred] Node's `os.tmpdir()` reads TMPDIR, then TMP, then TEMP, then `/tmp`. Chrome's temp
  directory on Linux comes from TMPDIR, else `/tmp`. If they disagree, `dirname(directory) === tmpdir()` is false, so
  nothing is removed. Run 8 shows a symlinked TMPDIR is fine.
- **Failure scenario.** An operator shell exports `TMP=/var/tmp/x` with no TMPDIR. Every killed Chrome leaves a
  directory in `/tmp`, as at the base.
- **Proposed fix.** Disclose it in the residuals. Passing `TMPDIR: tmpdir()` in Chrome's spawn environment would make
  them agree. It would also move the socket under `$TMP`, so it could hit the 65-byte path limit the PR measured.
  Judge that before adopting it.

### N7 — note — a load flake in an untouched unit case (not `syzygy-bpyt.4.13`)

- **Severity:** low. The test is pre-existing; the lane reported it to the coordinator as a follow-up.
- **Evidence.**
  - [Observed: run 10, `guard-parent-prefix-comparison` attempt 1] "disposable browser shutdown waits for private
    Chrome group members before removal and retains the profile on drain timeout" failed with "Error: private
    browser profile drain did not verify two empty scans before deadline".
  - The same line appears in the lane's `mutants-cdp` record under `singleton-never-removed`,
    `singleton-not-read-while-running` and `is-directory-guard-dropped`.
  - [Inferred] The first sub-case runs `closeDisposableBrowser` on the real clock with `profileDrainMs: 100` and
    25 ms sleeps, which a loaded host overruns.
  - This is not the 5 s timeout tracked as `syzygy-bpyt.4.13`. I saw no 5 s timeout in any run.
- **Failure scenario.** A clean change fails `node` CI or a battery on a loaded host.
- **Proposed fix.** Inject `now` in that sub-case as the other sub-cases do, under its own follow-up bead.

## 5. Every changed output

None. [Observed]:
- The diff outside the evidence directory is the four files in section 1. None is a renderer, route, wire format or
  fixture. The CDP launch arguments, including `--disable-ipc-flooding-protection` and
  `Emulation.setFocusEmulationEnabled`, are untouched; the hunks in `cdp-browser.ts` change only imports, the new
  functions, `removeBrowserProfile` and the cleanup passed to `closeDisposableBrowser`.
- `polaris-accessibility-main` at the head and the base printed the same stdout and wrote the same JSON, apart from
  temp paths, the timestamp and the commit (section 2).
- Hosted checks at `490332aa`: `gh pr checks 515` printed "checks	pass	2m3s" (run `39802174906`) and
  "node	pass	4m44s" (run `39802174837`).

## 6. Verdict per acceptance criterion

1. **"After a passing run of every Chrome-driven vitest file with a fresh private TMPDIR, that TMPDIR holds no
   .com.google.Chrome.* or polaris-draft-browser-* directory (listing recorded before and after)."** **Met.**
   - [Observed] My run 5: every Chrome-driven file, in one fresh private TMPDIR, all passing. Before, the directory
     was freshly created and empty; after, it held `node-compile-cache` only.
   - The lane's records agree: base, 11/11 passing with 2 leaving a Chrome directory; head under Chrome 120, 10/11
     passing with 0 left; head under Chrome 154, 11/11 with 0 left. The six-build matrix at the head passes with 0
     left, and the pre-fix matrix fails 5 dotless builds on the name assertion and leaves their directory (checked by
     script).
   - The lane's records give the "after" listing per attempt. The "before" state is "emptied" by construction, not a
     recorded listing.
   - F1 does not affect AC1 itself, but its fix needs this listing re-run.
2. **"A killed run's leftover is covered by syzygy-bpyt.4.10's sweep, or is stated as out of scope."** **Met:** stated
   out of scope in the PR body's criteria table and its residuals.
3. **"No change to any test's assertions; Tests +0 ~0 -0 unless a cleanup test is added."** **Met.**
   - [Observed: `git diff -U0`] The three changed test files remove 5 lines. Three are imports. Two are the
     draft-preview launch and its `finally`, restructured so the removal runs even when the launch or close throws.
     None is an assertion.
   - The `it(` count goes 13 → 24 in `cdp-browser.test.ts` and 1 → 2 in `cdp-browser.browser.test.ts`, which is +12.
     That matches `test-lists-2026-10-22.json`'s "Tests: +12 ~0 -0". All 12 are cleanup tests.
   - The new real-Chrome name assertion was added in this branch (`8dc316a7`) and widened in `aa74cbb9`. Main has no
     `toMatch` in that file [Observed: count 0 at `9a30237e`].
   - The widening is not a loosening to pass. The old pattern accepted `.com.google.Chrome.`,
     `.com.google.Chrome.ab-cd`, `.com.google.Chrome.Ab.Cd` and a trailing newline, all of which the new one rejects.
     The new one accepts only what was observed in addition: the dotless names.
   - F1's required fix changes test arguments only, not assertions.
4. **"CC-REV-1 class stated (expected none)."** **Met.** The PR states none, and I rule none (section 2).

## 7. Test quality

- **Assert behavior (bar 1):** met. The new tests assert directory listings and existence, which are observable
  effects.
- **Regression test (bar 2):** met.
  - [Observed] The real-Chrome case fails when the fix is removed (run 10, both leak mutants), and the lane's base
    run shows the same file leaving a directory.
  - The unit cases pin each guard. One gap is the case-insensitive survivor (N2).
- **Edge and failure paths (bar 3):** largely met. Gaps:
  - case variants (N2);
  - same-name reuse (N1);
  - the hermeticity of the injected-`remove` seam (F1);
  - the two `launchBrowser` cleanup sites with a live singleton (CDP connect failure and `Browser.getVersion`
    failure), as the lane disclosed. My run 9 exercised the connect-failure site's profile removal, with no singleton
    because `/bin/false` makes none.
- **No tautologies (bar 4):** met. Expected values are literals. The real-Chrome name regex is checked against real
  Chrome output across six builds.
- **Mocks (bar 5):** met for the new tests. `process.getuid` and TMPDIR are operating-system boundaries. The
  pre-existing `remove` injection is now only a partial fake (F1).
- **Determinism (bar 6):**
  - The unit cases touch only a private temp root and are deterministic, except under root (N5).
  - The real-Chrome case shares the sibling case's 3 s drain and is load-bound, as disclosed. In my runs it passed
    in runs 3, 5, 7 and 8, in the control, and wherever it was not the mutant's target (load 37–50).
  - A pre-existing unit flake was observed (N7).
- **Names (bar 7):** clear, with one stale range (N3).
- **Cleanup on failure.**
  - [Observed: code] The unit `afterEach` restores mocks and env, restores directory modes, and removes every root.
  - The real-Chrome case's `finally` SIGKILLs the frozen helper and closes the browser if `close()` was not
    attempted. If `close()` throws on the drain, the profile and the singleton directory stay by design, and only
    the frozen pid gets a further kill. That is the same shape as the pre-existing sibling case.
  - [Observed] After all my runs, 0 Chrome processes carried `--user-data-dir=/tmp/r515`. Every TMPDIR of a vitest
    run held only vitest's `node-compile-cache` afterwards. The probe TMPDIRs held only what my probes planted.

## 8. Cleanup

- [Observed] Removed: the three scratch clones under `rev-515/` (`clone`, `mut`, and `base`, a worktree of `clone`);
  every private TMPDIR I made (`/tmp/r515-1` to `-5`, `-6`, `-7clone`, `-7base`, `-m0-1` to `-m7-1` (removed by
  `my_mutants.py`), `-p1`, `-pc`, `-px`, `-q1`, `-q2`, and the symlink `-ql`). `ls -d /tmp/r515*` afterwards: "No such
  file or directory".
- The F1 reproduction ran in a private tmpfs `/tmp` inside `bwrap`, which vanished with the sandbox. Nothing was
  created in or deleted from the shared `/tmp` outside my own TMPDIRs.
- No process was killed by pattern. My probe signalled only the network helper of a Chrome that was a child of its
  own Node process with `--user-data-dir` under its TMPDIR.
- Kept beside this raw:
  - `tools/`: `check_records.py` `499fadd9…4731`, `decoy_probe.mjs` `249366e6…50f1`, `fixed_path_probe.sh`
    `e4af9afa…f520`, `my_mutants.py` `6c372fc8…51cf`.
  - `results/`: the run logs, `my-mutants.json`, `decoy-probe-1.json`, `fixed-path-probe.log`,
    `records-summary.txt` and the two `check_governance` logs.
