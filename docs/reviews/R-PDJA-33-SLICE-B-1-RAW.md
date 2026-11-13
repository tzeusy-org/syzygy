# R-PDJA-33-SLICE-B-1 — copy step and slice-A repairs, implementation review, round 1
Reviewed commit: ad6163f3
Subject: branch agent/syzygy-pdja-33-impl, slice B (5544c225..c75c68d1) and slice-A repairs (c75c68d1..ad6163f3)
Verdict: REVISE

## What I ran

- [Observed] Setup:
  - `git fetch origin agent/syzygy-pdja-33-impl`. The remote head was `ad6163f37b28827968b1db6249f684deb2c5042a`.
  - `git worktree add --detach /home/orca/.tmp/reviews/rvB ad6163f3`, then `npm ci` (exit 0), with `TMPDIR=/home/orca/.tmp/reviews/tmpB`.
  - Before removal, `git status --short` in the worktree printed 0 lines and HEAD was still `ad6163f3`. I then removed the worktree and TMPDIR. `git worktree list` no longer names rvB.
- [Observed] What I read:
  - `git diff 5544c225 c75c68d1`, `git diff c75c68d1 ad6163f3` and `docs/reviews/R-PDJA-33-SLICE-A-1-RAW.md`.
  - REQ-polaris-generation-046: line 9 (the pre-answer reads), line 11 (the question's copy statements), line 35, line 222 (oracle independence) and line 223 (the falsifier).
  - REQ-polaris-generation-047, lines 238-256: the class rule, the stage rule, the copy step, the Git environment, removal, and the closed list with its alternates refusal.
  - The owner direction of 2026-11-12, including its 2026-11-13 correction.
  - The installed registry entry's `typedAuthority.fetch`, `readAuthority`, `tags` and `stateDirectoryWrites`.
  - `IMPACT-LEDGER.md` items 1b and 3, and window 2.
  - Both mutation records.
- [Observed] `npm run check`: exit 0, `Test Files  185 passed (185)`, `Tests  4338 passed | 1 skipped (4339)`.
- [Observed] `npm run test:integration`: exit 0, `Test Files  94 passed (94)`, `Tests  2869 passed | 4 skipped (2873)`.
  - The log has three `FAIL |fixture| fixture.test.ts …` lines. They come from the tmpdir harness's own selftest children: 10 `tmpdir-selftest-case` lines, the same pattern round 1 recorded. They are not failures.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: exit 0.
  - `second-method PASS: git ls-files=853; git ls-tree=853; exact path sets equal`.
  - `partition PASS: denominator=853; assigned=853; raw=806; other=47; unmatched=0; overlaps=0; campaigns=152`.
- [Observed] Rule 6 method: each mutant is an exact-once string replacement. Both recorded commands were run, then the file was restored and its sha256 asserted equal to the pre-mutation bytes.
  - Slice A commands: `npx vitest run --project unit …launch-clone.test.ts …launch-revision.test.ts` and `npx vitest run --project integration …launch.test.ts`.
  - Slice B commands: the two recorded in its record, which add `clone-shape.test.ts`, `start-gates.test.ts` and `package-reader.test.ts`.
- [Observed] Mutant outcomes. The first count is the unit run, the second the integration run.

| Mutant | Source | Result | Unit | Integration |
|---|---|---|---|---|
| R1 (round 1's text) | slice-A review | KILLED | `Tests  9 failed \| 26 passed (35)` | `Tests  3 failed \| 43 passed (46)` |
| R3 (round 1's text) | slice-A review | KILLED | `Tests  8 failed \| 27 passed (35)` | `Tests  2 failed \| 44 passed (46)` |
| B7-git-env-kept | slice-B record | KILLED | `Tests  39 passed (39)` | `Tests  2 failed \| 492 passed (494)` |
| B12-no-head-is-commit-check | slice-B record | KILLED | `Tests  39 passed (39)` | `Tests  1 failed \| 493 passed (494)` |
| B15-launch-refuse-keeps-copy | slice-B record | KILLED | `Tests  39 passed (39)` | `Tests  8 failed \| 486 passed (494)` |
| O1-utf8 | mine | KILLED | `Tests  39 passed (39)` | `Tests  3 failed \| 491 passed (494)` |
| O1b-buffer | mine | KILLED | `Tests  39 passed (39)` | `Tests  3 failed \| 491 passed (494)` |
| O3-copyfile | mine | SURVIVED | `Tests  39 passed (39)` | `Tests  494 passed (494)` |
| O2 | mine | KILLED | `Tests  39 passed (39)` | `Tests  2 failed \| 492 passed (494)` |

- What my own mutants change:
  - O1-utf8, in `launch.ts`, after `copy = { dir: made.dir, gitDir: made.gitDir };`: `try { fs.readFileSync(path.join(snapshot.gitDir, 'objects', commit.slice(0, 2), commit.slice(2)), 'utf8'); } catch { /* mutant */ }`. It reads the operator's clone's commit object after the copy step.
  - O1b-buffer: as O1, without the encoding.
  - O3-copyfile: as O1, but `fs.copyFileSync(<same object path>, path.join(path.dirname(made.dir), '..', 'stolen'))`.
  - O2, in `launch-copy.ts`: `  env['GIT_CONFIG_GLOBAL'] = '/dev/null';\n` replaced by nothing.
- [Observed] Synthetic probes. All ran under TMPDIR with git 2.53.0 and node v24.6.0, through `npx vite-node` on the source with the `source` condition.
  - P1/P2: a repeat `initRun` as the CLI wires it, with `--url`. See Finding 1.
  - P3/P4: `makeCopy` against a clone with hostile config, under `strace -f -e trace=execve,openat`. See choice 5 and Findings 4 and 5.
  - A network-syscall trace of the copy's `checkout`. See Finding 5.
- [Observed] Sweep 1: call sites after the copy step starts.
  - Method: every `fs.*`, process spawn, object-reader and clone-reader call site in `launch.ts`, `launch-copy.ts` and `init.ts`.
  - After `makeCopy` (`launch.ts:210`), `launch.ts` has 4 sites:
    - `cloneGitDirShape(made.gitDir)` at 222;
    - `openReader({ gitDir: made.gitDir })` at 225;
    - `openReader({ gitDir: runGitDir })` at 253, where `runGitDir` is the copy's;
    - `writeLaunchRecords` at 395, on the governance home.
    - The no-copy `isCommit` reader at 239 is in the else-branch only.
  - In `init.ts`, after the launch returns, 6 sites:
    - `resolveCloneHead(runClone)` at 180, `fs.realpathSync(runClone)` at 183, `cloneGitDirShape(head.gitDir)` at 193 and `openReader`/`cloneStoreShape` at 199-200, all on the copy;
    - `createRunDirectory(stateRoot)` at 227;
    - `removeCopy(copy.dir)` at 104, on the copy.
  - In `launch-copy.ts`, the in-process reads are `lstatSync`/`readFileSync` of the copy's `.git/HEAD` (118, 120). The rest are mkdir/mkdtemp/rm of the copy root and `realpathSync` of path prefixes.
  - [Inferred] On the copy-class path through `launchConsent`, no call site reads the operator's clone after the copy step starts. The exception is Finding 1's path, which never reaches `launchConsent`.

## Slice-A round-1 findings

- Finding 1, the read oracle blind to the commonest read API: **resolved for the finding as written.**
  - [Observed] `installReadLog` now wraps `openSync`, `open`, `readFileSync`, `readFile`, `createReadStream`, `promises.open` and `promises.readFile`, plus four examination calls. `sealExcept` sets every unlisted `.git` file to mode 000.
  - [Observed] R1 and R3, re-run by their recorded text, are killed in both tiers (table above).
  - [Inferred] The oracle still has a gap after the copy step starts; see Finding 3.
- Finding 2, every remote's HEAD read: **resolved.**
  - [Observed] Stage 2 now admits `refs/remotes/origin/HEAD`. It admits the other remotes' HEADs only when `refs.get(ORIGIN_HEAD)?.kind !== 'symbolic'`.
  - [Observed] Two unit tests pin both arms: "another remote's HEAD is not read while origin records a default" and "origin's HEAD absent, or not symbolic". Both failed under R1/R3, so they run against the patched layer.
  - The record's F2m mutant is killed. I did not re-run F2m.
- Finding 3, the `.git/reftable` existence probe: **resolved.**
  - [Observed] The `lstatSync(path.join(gitDir, 'reftable'))` block is removed. HEAD's `ref: refs/heads/.invalid` placeholder is the only detection.
- Finding 4, `--revision HEAD` refused: **resolved.**
  - [Observed] `revisionRefCandidates` prepends `HEAD` for that name alone. `holdsRef` treats HEAD as always held. `resolveName` and `resolveRef` take `snapshot.head` for it.
  - [Observed] A unit test covers a detached HEAD and a symbolic HEAD, with no store listing.
- Finding 5, M10 not equivalent: **resolved.**
  - [Observed] Commit afdc15a5 stages the lstat-to-open race.
  - [Observed] The repair record reclassifies M10, adds M10b (O_NOFOLLOW dropped alone), and records both killed. It leaves the slice-A record unedited, as `supersedes_in_part` says.
- Finding 6, the alternates refusal deferred to slice B: **resolved on the launch path.**
  - [Observed] `launch.ts` refuses a copy-class run on `snapshot.alternates` before `copyRoot` is checked or any directory is made. The test "a clone with an alternate" asserts the copy root does not exist.
  - [Observed] Finding 1's path skips this refusal too.

## The implementer's choices

1. FETCH_HEAD holds the clone's `file://` URL, and the copy's form check admits it. **[Inferred] Conforms.**
   - 047's form is "the form that one commit fetched alone into an empty repository … leaves". FETCH_HEAD with its source URL is part of that form.
   - The URL is not recorded or rendered as a locator by any code in this diff.
   - Residual: the form check applies `namesOnly` to FETCH_HEAD's whole text. A clone path that holds a run of 40 or more hex digits would refuse every copy. That fails closed, so no finding.
2. `observationConsentNaming(revision)`. **[Observed] Conforms inside `launchConsent`.**
   - It is optional on the port and required on `GateSources`. It returns `satisfied: false` when the port lacks it, so the run copies.
   - It reads `inForceRecords` of the admission reader, class `observation`, by revision alone.
   - `withLaunchRecords` spreads `base`, so launch records never satisfy it. Mutants B22-B24 cover it.
   - **But `init` decides a run's path before this lookup runs, using sources that do count launch records. See Finding 1.**
3. The copy root is `<stateRoot>/copies/copy-XXXXXX`. **[Inferred] Conforms.**
   - Run directories are `run-<32 hex>` under the state root (`state-directory.ts:34`, 113-118), so `copies/` lies outside every run's state directory.
   - `copyRootViolation` resolves real paths for each forbidden place 047 names before `mkdirSync`. The test covers three of them.
4. The copy statement is a separate refusal field. **[Inferred] Acceptable for slice B.**
   - `copy` and `copyStatement` sit on `LaunchRefusal` and `InitRefusal`.
   - How they reach the printed launch output is slice D's.
5. Relied on, not checked: Git runs no program the clone's config or hooks name while serving a `file://` fetch. **[Observed] Holds for everything I planted.**
   - Planted in the clone's `.git/config`:
     - `core.fsmonitor`, `uploadpack.packObjectsHook`, `core.sshCommand`, `core.alternateRefsCommand`, `core.gitProxy`, `core.askPass`, `core.pager`, `core.editor`;
     - `filter.evil.smudge`, `filter.evil.process` and `filter.evil.clean`, with a committed `.gitattributes` naming `filter=evil`;
     - `diff.external`, `credential.helper`, `remote.origin.uploadpack`, `remote.origin.receivepack`;
     - `core.hooksPath` pointing at a hostile hooks directory, `safe.directory=*`, `gc.auto=1`, `maintenance.auto=true`, `protocol.allow=always`;
     - an `include.path` and an `includeIf.gitdir:/.path`, both naming a file that sets `packObjectsHook` and `fsmonitor`.
   - Planted hooks: 14 executable hooks, including `pre-upload-pack`, `post-checkout`, `pre-auto-gc`, `reference-transaction`, `post-index-change` and `fsmonitor-watchman`. They went in both `.git/hooks` and the hostile hooks path.
   - Planted in the operator's environment: `XDG_CONFIG_HOME` and `HOME` pointing at config with hooksPath, fsmonitor and a filter, plus `GIT_CONFIG_PARAMETERS`, `GIT_EXEC_PATH`, `EDITOR`, `PAGER` and `SSH_ASKPASS`.
   - Result: the copy was made and the marks directory stayed empty.
   - The strace execve list for fetch:
     - `/bin/sh -c "git-upload-pack '<clone>'"`, then `git-upload-pack`;
     - `git pack-objects --revs --thin --stdout --shallow --delta-base-offset` (server side);
     - `git unpack-objects` and `git rev-list --objects --stdin --quiet --alternate-refs` (client side);
     - `git maintenance run --auto --quiet --detach`.
   - init and checkout each exec `git` alone.
   - [Observed] upload-pack read `included.cfg`, which is Git honouring the clone's configuration as 047 discloses.
   - [Unknown] `safe.directory` and ownership: I cannot create a clone owned by another user without privilege. [Inferred] With global and system config disabled, a `safe.directory` grant is unreachable, so a foreign-owned clone fails the fetch, which refuses with Git's report.
   - Two side effects reach the copy from the operator's environment, though no clone setting does; see Findings 4 and 5.
6. The integration oracle seals the clone's `.git` until the copy's first Git process, then unseals it. **[Inferred] Not right as built.**
   - 047 keeps the closed list in force for "the reads Syzygy itself makes, in process, of the operator's clone" through the whole run. In a copy-class run Syzygy reads no object of that clone (entry `readAuthority`).
   - Git needs the files readable only while its processes run.
   - Never re-sealing, together with the log's fixed API list, lets an in-process read after the copy step go unseen (O3 survived). See Finding 3.
7. HEAD is the only Git-directory short name taken as a `--revision` candidate. **[Inferred] Conforms.**
   - Read (2) admits HEAD's value and no other Git-directory file. Taking `FETCH_HEAD` or `ORIG_HEAD` would read outside the list.
   - Any other name falls back to the `refs/` candidates and fails closed.

## Findings

**Finding 1 — a repeat `init --url` at a launch-consented HEAD skips the launch, so a copy-class run runs on the operator's clone with no copy** (blocking)

- [Observed] Where the run's path is decided:
  - `init.ts:121-129`: when `--url` is given and `--revision` is not, `init` sets `headConsentedElsewhere = ids.length === 1 && head.ok && (await sources.observationConsentFor(ids[0]!, head.commit)).satisfied`. When that is true it skips `launchConsent` entirely, so no class lookup, no alternates refusal and no copy step run.
  - In the CLI, `sources` is `cliGateSources(ports)`, which is `withLaunchRecords(createPackageGateSources(…))` (`cli.ts:198-199`).
  - That wrapper's `repositoryIdsFor` falls back to launch records by normalised URL. Its `observationConsentFor` falls back to a launch observation consent naming the revision (`launch-sources.ts:28-46`).
  - So a HEAD that only a launch consent names sets `headConsentedElsewhere` to true.
- [Observed] Probe P1:
  - The first `initRun` (no `--url`, sources `withLaunchRecords(noOtherActs(), {home})`) recorded a launch consent and made a copy at `…/st1-…/copies/copy-JjMEM6`.
  - A second `initRun` on the same full clone with `url: 'https://github.com/redis/redis'` made no copy (`copies/` absent). It was refused at `clone-shape` with `.git holds packed-refs, which the consented form never leaves there…`. That means it ran the no-copy form check over the operator's clone.
- [Observed] Probe P2: the second run used a separate operator clone at the same commit, in the one-commit form (`git init --template=`, `fetch --depth=1`, `checkout --detach FETCH_HEAD`). It returned `ok: true` with `clone=` the operator's own clone, and no `copies/` directory was created.
- [Inferred] Why this blocks:
  - 047 says: "A run whose named identifier only an in-force launch observation consent names whose recorded scope holds that revision in the operator's own clone … runs on a copy too". Every run with a named identifier runs on a copy "unless its named identifier is named by an in-force observation consent made by another act".
  - P2 is exactly window 2's case, the v1.1-era one-commit clone. The run then reads the operator's clone's objects, blobs included, which is the falsifier's "reads anything of a clone that the pre-answer list does not name".
  - So slice B does not close window 2 for the CLI's `--url` form. The launch's own tests miss it because `initWith` never passes `url`.
- Repair:
  - Decide `headConsentedElsewhere` from `ports.sources`, the base without launch records, or from `observationConsentNaming(head.commit)`.
  - Add an init-level test that repeats a launch-consented run with `--url`, with sources wrapped as the CLI wraps them, and asserts a copy.
  - Add a mutant that reverts the repair.

**Finding 2 — a thrown error, or an interrupt at the question, leaves the copy unremoved and unnamed** (revise)

- [Observed] Removal is wired only through the two `refuse` closures (`launch.ts:153-157`, `init.ts:102-106`). Several paths after the copy exists rethrow:
  - `launch.ts:229` rethrows a non-`GitObjectReadRefusal` from the copy's inventory.
  - `launch.ts:259` rethrows from the pre-answer reads.
  - `init.ts:205` rethrows from the listing.
  - Every awaited port after `makeCopy` can also throw: `sources.*`, `writeConsent`, `terminal.ask`, `writeStore` and `createRunDirectory`.
  - None is wrapped in a `try`/`finally` that removes the copy.
- [Inferred] The question is asked after the copy exists. `launch-cli.ts:32` reads it through `readline` with `terminal: false`. A Ctrl-C there gets node's default SIGINT, which exits without removal and without the launch output's statement.
- [Inferred] 047: "Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy … or … say that the copy was not removed, name its location". An interrupted question is the commonest way such a run ends, and an uncaught error is a refusal in effect (the command exits non-zero).
- Repair:
  - Wrap everything after `makeCopy` in a `try`/`finally`, or a catch that removes the copy and states the outcome.
  - Handle SIGINT during the question as "an answer is not given", which refuses and removes.
  - Test one thrown port.
- [Inferred] A related case: the brief is a separate command (`cli.ts` `brief <run>`). Whether a refused `brief` "ends the run before its brief" and owes a removal is a question for slice D or the owner.

**Finding 3 — after the copy step starts, the read oracle no longer sees every in-process read of the operator's clone** (revise)

- [Observed] `sealedReads` (`launch.test.ts`) calls `seal.unseal()` on the first Git process and never re-seals. `installReadLog` logs a fixed list of entry points, rooted at the clone's `.git` only.
- [Observed] O3, which calls `fs.copyFileSync` on the operator's clone's commit object after the copy is made, survived both tiers. O1 and O1b, the same read through `readFileSync`, were killed by the log.
- [Inferred] What is still unseen:
  - `copyFileSync`, `cpSync`, `promises.copyFile` and `promises.cp` read content through no logged entry.
  - With the seal lifted they also succeed. Even sealed, the EACCES is swallowed when the code catches it.
  - The working tree outside `.git` is not logged at all, though 046's list admits none of it.
  - That is the defect class of round-1 Finding 1, now after the copy step. 046's oracle requires a layer "outside the code under test" that logs every in-process read of either clone.
- [Inferred] Production code at ad6163f3 makes no such read (sweep 1). The defect is in the evidence.
- Repair:
  - Unseal only while each Git process for the copy runs, and re-seal when it returns. The wrapper already sits on `copyGit`.
  - Add the copy entry points to `CONTENT_READS`.
  - Root the log at the clone, not `.git`.
  - Record O3 killed.

**Finding 4 — the operator's environment can rewrite the copy's checked-out files through Git's global and system attributes files** (note)

- [Observed] `copyEnvironment` keeps every non-`GIT_*` variable, `XDG_CONFIG_HOME` and `HOME` included.
- [Observed] Probe P4 put `* text eol=crlf ident` in `$XDG_CONFIG_HOME/git/attributes`.
  - The copy's checkout opened that file, then wrote `a.c` as `"x $Id: 5692e3a1… $\r\n"`. The committed blob is `"x $Id$\n"`.
  - The copy's `.git` still passes the form check.
- [Observed] `GIT_CONFIG_GLOBAL=/dev/null` does disable the global config. The XDG and HOME filter, hooksPath and fsmonitor settings never fired.
- [Inferred] The attributes files are not config, so `GIT_CONFIG_NOSYSTEM` and `GIT_CONFIG_GLOBAL` leave `$(prefix)/etc/gitattributes` and `core.attributesFile`'s default in force.
  - Nothing executes: drivers need config.
  - But the working tree the agent sessions read can differ from the pinned commit's blobs, through end-of-line conversion, `ident` or `working-tree-encoding`.
- Suggest `GIT_ATTR_NOSYSTEM=1` and `-c core.attributesFile=/dev/null`. Both are Syzygy's own settings, not variables of the operator's environment.

**Finding 5 — the copy's checkout resolves the host name for its reflog identity, and fetch starts auto-maintenance** (note)

- [Observed] The copy's `checkout --detach` writes `logs/HEAD` with identity `orca <orca@Tzeusy.(none)>`.
  - The traced checkout opened `/etc/nsswitch.conf`, `/etc/host.conf`, `/etc/resolv.conf` and `/etc/hosts`, and tried the nscd socket 4 times.
  - [Inferred] Git's default identity canonicalises the host name with `getaddrinfo(AI_CANONNAME)`. On this host the name is in `/etc/hosts`. On a host where it is not, that lookup goes to DNS: a network request 047 says the environment rules out ("so that no network request is made").
- [Observed] `fetch` spawned `git maintenance run --auto --quiet --detach`. The entry's `fetch` text says "no other process is started".
  - [Inferred] Git starts it, not Syzygy, and it ran nothing in this probe. Still, `--no-auto-maintenance` or `-c maintenance.auto=false` removes the question.
- Suggest fixed `-c user.name=… -c user.email=…`, which skips the lookup and is Syzygy's own setting, plus the maintenance switch. Neither changes the copy's form.

**Finding 6 — `objectsRead` is true for a `copy`-stage refusal made before any object was read** (note)

- [Observed] `init.ts:144` sets `objectsRead` to true for every launch refusal stage except `clone`, `self-observation`, `records`, `revision` and `head`. The new `copy` stage is not excepted.
- So a refusal for "no location for the copy", a forbidden copy root, or a failed `init` or `fetch` reports `objectsRead: true`, though Syzygy read no object. [Inferred] VIS-2 asks for the honest value.
- Suggest deciding it from whether the copy's inventory or the pre-answer reads ran.

**Finding 7 — deferring the copy statements to slice D is safe only if slice B is not released, or used for an owner run, before slice D** (note)

- [Inferred] With slice B alone, a copy-class run asks the question without 046's copy statements: how the copy was made, what Git read, what Syzygy read, and that the copy is kept or removed. The run record also lacks 047's Inferred reliance statement.
- Those are falsifier arms ("the question omits any statement this requirement lists").
- This deferral is the lead's; I record only that the owner's Redis run should wait for slice D.

[Observed] Expected values in the new tests are literals: refusal strings, the argument vectors, the exact Git environment, object-type lists and the copy-statement text. None is imported from the module under test.

[Inferred] Outside Finding 1, the copy-class decision conforms:
- `copyClass` is decided from the consents and the named identifier, before the copy step;
- an unsatisfied or absent lookup means copy;
- a no-copy run keeps the HEAD check and the `isCommit` header read;
- the class is not re-decided later.

[Inferred] The copy step's process set and environment conform to 047's list, with the residuals in Findings 4 and 5:
- three processes;
- every `GIT_*` variable removed, then `GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1` set;
- `core.hooksPath=/dev/null` and an empty template;
- `--depth=1 --no-tags --no-recurse-submodules` by full identifier.

[Inferred] Removal on the `refuse` paths and keeping on success conform, apart from Finding 2:
- slice B's mutants B15 and B17 are killed, and my re-run of B15 is killed;
- `copyKeptStatement` is added to the init report's disclosures;
- the copy stays at `<stateRoot>/copies/copy-*` outside the run directory.
