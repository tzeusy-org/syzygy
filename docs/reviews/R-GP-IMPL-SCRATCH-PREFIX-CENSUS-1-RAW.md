# R-GP-IMPL-SCRATCH-PREFIX-CENSUS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.18, round 1
Verdict: REVISE
Reviewed commit: e2aae62e
Subject: r1-review.diff sha256 3b29116c5d59ab9511b05de3626695a64db0ec03b0e13afbc6e32b70491c45f3

Reviewer: rev-522, fresh context, read-only on the PR (no push, no PR comment, no bd mutation). No target repository
content was fetched; nothing under `~/.claude/` or `~/.config/` was opened. All paths below are relative to the
reviewed commit unless absolute. The census directory is abbreviated `EV/` = `docs/evidence/scratch-prefix-census-2026-10-23/`.

## 1. Subject identity checks

- [Observed] `sha256sum` of the coordinator's subject file:
  `3b29116c5d59ab9511b05de3626695a64db0ec03b0e13afbc6e32b70491c45f3  .../lead/b418/r1-review.diff`.
- [Observed] Re-derived in my scratch clone (`git diff 7de5dc4097781e7645ea54f50cffe419cfed0f3b e2aae62efc5a4c7d346f03a2c581c852b5ea8802 --output=rederived.diff`):
  `3b29116c5d59ab9511b05de3626695a64db0ec03b0e13afbc6e32b70491c45f3  .../rev-522/rederived.diff`. **The digest matches.**
- [Observed] `git diff --shortstat`: ` 38 files changed, 50236 insertions(+)`; `--name-status`: 38 rows, every one `A` and
  every path under `EV/`. `git merge-base 7de5dc40 e2aae62e` = `7de5dc4097781e7645ea54f50cffe419cfed0f3b`.
- [Observed] PR head per `gh pr view 522`: `headRefOid` `e2aae62efc5a4c7d346f03a2c581c852b5ea8802`, 38 files.
  `gh pr checks 522`: `checks pass 2m0s`, `node pass 4m13s`.
- [Observed] Run commit `a864e999645a071dda40325b2235976590e02973` has parent `83898969`, whose parents are `139eeb18`
  and `7de5dc40`; `git diff --stat 7de5dc40 a864e999` touches 8 files, all under `EV/` (`census_run.py`,
  `collect_runs.py`, `scratch_trace.cjs`, `static_sites.py`, `tmp_sampler.py`, `trace-selftest-2026-10-23.json`,
  `trace_fixture.mjs`, `trace_selftest.py`). So the run tree is main `7de5dc40` plus instruments only, as claimed.
- [Observed] Main moved: `git diff --name-only 7de5dc40 71334012` lists 351 files, 0 under `EV/`. A Python sweep of
  `git diff -U0 7de5dc40 71334012 -- apps packages` for added or removed lines matching `mkdtemp|tmpdir\(\)` prints
  `added lines with mkdtemp/tmpdir() 0 removed 0`, and `cdp-browser.ts`, `test-model-fixture.ts`, `restart.ts`,
  `dossier-trigger.ts`, `self-corpus.ts`, `redis-shaped-measure-main.ts` are not among the 351; `vitest.config.ts` is,
  for one added alias line. The census is not staled by main's movement.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of
seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never
finally decides which classes it touches." The classes (lines 31-43) are "authority boundaries", "graph identity",
"deterministic observation", "security", "data migration", "public interface" and "certificate logic". Lines 49-51:
"The change record states which classes the change touches, or "none," so a misclassification is a findable
violation after the fact." and "A reviewer or the owner may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`), line 52 then
its three bullets: "\"Behavior-preserving\" means none of the following changes:" / "a rendered byte, a wire format,
a refusal string or an exit code;" / "a signed or digest-bound artifact;" / "a consent, security or retention
decision."

AGENTS.md verification rules relied on: 2 ("No "zero / all / 100%" claim without running that exact sweep"), 3
("Digests are scripted, never transcribed; totals are computed"), 4, 6 ("Mutate the input and confirm the check fails,
per predicate"), 9 ("A claim of absence needs a sweep with a denominator") and 11 ("An evidence record names its
subject and the subject's digest").

**Class ruling: none.** [Observed] All 38 files are new under `EV/`; `git grep -l -F 'scratch-prefix-census' e2aae62e`
returns only four files inside `EV/` itself, so no CI workflow, npm script, manifest or governed file reaches the
tools. No module, endpoint, write boundary, identity, observation seam, auth or egress surface, migration or
certificate is touched. **GP-Q0:** [Observed] no rendered byte, wire format, refusal string, exit code, signed or
digest-bound artifact, or consent/security/retention decision changes; the two gates report the same results as the
PR's verification record (section 3), so nothing a gate accepts or refuses changes. F1/F2/F3 below are proposals only;
F1's eventual PR signals processes and deletes recursively and must state its own classes.

## 3. What I ran and the results

Scratch clone `rev-522/clone` at `e2aae62e`, `npm ci` (`added 115 packages in 853ms`). Every run used its own short
private directory under `/tmp/r522-*`, deleted afterwards.

| Check | Result (verbatim where quoted) |
|---|---|
| Assembler self-test re-run (`assemble_census.py --selftest`) | `{"unmutated": true, "killed": {"owner-pid-digits-not-normalised": true, "derived-names-not-recognised": true, "chrome-dotted-form-only": true, "chromium-form-dropped": true, "chrome-suffix-unanchored": true, "nanoid-length-one-more": true, "nanoid-length-any-near": true, "fixture-rule-matches-every-surface-prefix": true, "operator-rule-matches-test-files": true, "operator-code-given-the-wrong-disposition": true, "stale-lock-rule-dropped": true, "unknown-creator-rule-dropped": true, "no-frame-not-treated-as-unknown": true, "creating-frame-ignores-calledFrom": true, "unattributed-name-given-a-class": true, "numeric-segments-not-normalised": true, "digits-inside-words-normalised": true}, "holds": true}`; my record equals the committed `assemble-selftest-2026-10-24.json` as parsed JSON (`True`; both name the assembler sha256 `6c651b650fef0baea1768dc862410d8998bfc1e3d4bce0cb21c417baf538fdfb`; `17 17` killed) |
| Tracer self-test re-run (`trace_selftest.py`, private `/tmp/r522-ts`) | `{"unmutated": true, "noLogVariable": true, "killed": {"sync-wrappers-dropped": true, "callback-wrappers-dropped": true, "promise-wrappers-dropped": true, "directly-in-temp-test-removed": true, "prefix-not-recorded": true, "log-variable-defaults-to-the-temp-directory": true}, "holds": true}` |
| Input checks re-run (`input_checks.py`, `/tmp/r522i`) | `{"control": true, "refused": {"trace-byte-changed": true, "trace-line-removed": true, "run-record-names-another-commit": true, "static-census-names-another-commit": true, "sampler-record-missing": true}, "holds": true}` |
| Full assembler re-run over the stored runs (`tools/compare_records.py` against the committed census) | `differing paths: 1` — `('/leftBySIGKILL[26]/topLevelChildrenOfOneObserved', 'missing in rerun', "['ssr']", 'None')`, the one field the PR says was read from a live directory at assembly. Every count, class, rule, finding sentence and the launcher probe reproduce |
| Static census re-run (`static_sites.py` at `a864e999`) | byte-identical: both files `09dfb9d602d15f149c2f8ef0acf6c8fd0c2036c0f0351d543f1f9c805b245d7a`; `"blobsRead": 818, "filesWithASite": 260, "sites": 591` |
| Digests (`tools/digest_checks.py`) | `1. files on disk 37 listed 37 onDiskNotListed [] listedNotOnDisk [] mismatched []`; all 7 run records `commit ok True`, each of `census_run.py`, `scratch_trace.cjs`, `tmp_sampler.py` `(True, True)` (equal at the run commit and at HEAD), `trace sha ok True lines ok True`; `5. static treeCommit ok True`; census `toolSha256` all `True` at HEAD; `collect_runs.py` and `static_sites.py` differ from their run-commit blobs (both changed after `a864e999`; they ran after the runs, so the record rightly names HEAD's bytes) |
| Kill counts recomputed from `listingAtEnd` | `6. kill entries [16, 34, 15] MB [192.3, 141.7, 65.4] marker [10, 26, 8] leaders [1, 3, 1]`, equal to `finding[0]` |
| One rule per class | `rows 176 distinct classes 176`; `rule field present and in table: 176`; `disposition matches its rule: 176`; `R8 used: []`; `sum byRule 176` |
| Second method for the kill and fresh-run figures (`tools/second_method.py`, name shape only, no trace) | `union of classes left by the three kills 27`; `f1 ... removed 1`, `f2 ... removed 10`, `f3 ... removed 4`, each removed set only the two R1 classes; `union of classes still there after the fresh runs 25` — equal to `finding[1]` |
| Exposure bounds re-derived (`tools/exposure_check.py`) | see F1 |
| Reproduction, 75 s kill (`tools/kill_repro.py`, own harness, no tracer, `/tmp/r522-1`, load `10.48` at start) | `{"secondsIntoTheRun": 75.0, "finishedBeforeSignal": false, "entriesAtSignal": 33, "stopped": {"sigtermRounds": 1, "sigkilledByPid": [], "remaining": 0}, "entriesAfterKill": 33, "survivors": 26, "byMarker": 18}` |
| Reproduction against the record (`second_method.py` with the repro) | `repro entries 33 classes 11`; 10 of 11 in the record's kill union; `NOT in the record's kill union: ['dossier-close-']`, which is a record class (`R9-test-file`). No class outside the record's 176 |
| Chrome helper probe (`tools/chrome_helpers.py`, one headless Chrome launched detached, `/tmp/r522-c`) | before: 1 browser, 2 `chrome_crashpad_handler` (`argMarker False`, outside the leader's session and group), 2 zygote, 1 gpu, 2 utility, 6 renderer (all `argMarker True`); after SIGTERM of the marked processes only: `after SIGTERM of marked only: []` within 10 s |
| Tracer blind-spot probe (`tools/run_blindspots.py`, `/tmp/r522-b`, Node `v24.6.0`) | `traced` only `bs-append.txt` and `bs-named-mkdtemp-…`; `UNTRACED` `bs-copy.txt`, `bs-cp-dir`, `bs-disposable-…`, `bs-hardlink.txt`, `bs-open-promise.txt`, `bs-open.txt`, `bs-python-…`, `bs-recursive-parent`, `bs-renamed.txt`, `bs-shell-…`, `bs-stream.txt` |
| Creator source sweep (`tools/creator_sweep.py`, blobs of `a864e999` under apps/, packages/, scripts/ and root, Python `re`) | `"blobs": 618, "filesNamingTemp": 194`; same-line co-occurrence with `tmpdir()` (`tools/sameline.py`): `appendFile: 0 ... of 33`, `open: 0 ... of 139`, `copyFile: 0 ... of 5`, `cp: 0 ... of 6`, `rename: 0 ... of 21`, `link: 0 ... of 33`, `recursive-mkdir: 0 ... of 255`; `stream`, `socket-listen`, `mkdtempDisposable`, `sh-mktemp`: 0 files |
| Static literal extraction (`tools/literal_check.py`) | see N5 |
| `os.tmpdir()` re-read (plain Node) | `{"before":"/tmp","afterAssign":"/tmp/r522-none","childInherits":"/tmp/r522-none"}` |
| My assembler mutants (`tools/my_mutants.py`) | `{"r9-all-test-files-to-any": false, "r6-tree-clause-dropped": true, "testkit-suffix-not-a-test-file": false, "creating-file-from-last-row": false, "exposure-upper-adds-no-gap": false}` (false = survived); see section 7 |
| `python3 scripts/check_governance.py` (clone, by absolute path) | exit 0, `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` |
| `python3 scripts/check_quotations.py` (clone) | exit 0, `OK    QC-1  a quotation beside a path:line locator was said by that file — 35 quotations examined in 16 of 936 .md files scanned (loc-paren-quote 2, loc-colon-quote 23, quote-paren-loc 10), 0 findings` |

Not run by me: the PROJECT-STATUS battery (`commands=110 nonzero=0` is the lane's figure, valid for `e2aae62e` only), a
clean full `npx vitest run`, and a fresh run seeded from my kill's leftovers.

### The census's soundness question, answered

- [Observed] The tracer does **not** see every way an entry is made directly in TMPDIR. Beyond the four wrapped
  families it misses `open`/`openSync`/`fs.promises.open`, `copyFile`, `cpSync`, `linkSync`, `renameSync`,
  `createWriteStream`, `mkdtempDisposableSync`, non-Node processes (`sh mktemp`, Python `tempfile`) and — not in the
  record's limits — **a recursive `mkdir` of a nested path, whose new top-level parent is untraced** (N1).
  `appendFileSync` is traced (Node routes it through the wrapped `writeFileSync`).
- [Observed] The sampler closes the gap for any entry that lives one sample: across the seven runs every name the
  sampler saw without a trace line falls in four shapes (`npm-compile-cache`, `vitest-project-directory`,
  `chrome-singleton`, `syzygy-poc-restart-<n>-<n>.lock`) and `samplerAgainstFinalListing` is empty both ways for all
  seven runs. Every name in every final listing has a class; `R8-creator-unknown` is used by 0 classes.
- [Observed] Source sweep, denominator 618 blobs / 194 files naming the temp directory: no unwrapped creator shares a
  line with `tmpdir()`. Of the 8 `tmpdir()` sites in apps/ and packages/ that are not `mkdtemp` calls, two make a
  top-level entry by an unwrapped path: `restart.ts:105` (the lock; found by the census) and `poc-main.ts:160-164`
  (the default state root `tmpdir()/syzygy-three-surface-poc/<digest>`, a nested path; no run created it, and
  `main.test.ts:386` reads it from injected `daemonOptions()` [Inferred: injected fakes]). `polaris.ts:379`
  (`polaris-`, only without `XDG_RUNTIME_DIR`) and `session-view.ts:99` (`polaris-view-probe-`, only with `bwrap`) are
  non-test creators the root run never reached; they are in the static census's never-seen list.
- **Misses / misattributions:** [Observed] no class created by these seven runs is missed or misattributed; the
  census's "176 classes" is a count of classes the trace or the sampler saw, so an untraced class whose entries all
  live under one sample (about 0.5 s) would be uncounted. Such an entry can be left by a kill only when the kill lands
  inside its life, and none of the three kills (nor mine) left an unknown name.

## 4. Findings

### F1 — blocking — the exposure "upper bound" is not an upper bound, so `finding[4]`'s "0.156 or less" is unsupported

- **Evidence.** [Observed] `assemble_census.py:382` adds one sampler interval to a sampled name's sighting span
  (`slot['upper'] += seen['last'] - seen['first'] + exposure_interval`), and `:385` one interval to a never-sampled
  name. A name first sighted at sample s_i and last at s_j was absent at s_(i-1) and at s_(j+1), so it lived up to
  (last − first) + the gap before + the gap after: two gaps, not one. The record's own definition
  (`exposureRanking.meaning`: "the upper bound counts every name once for a whole sampler interval more than it was
  seen") is the one-gap figure. Re-derived from the stored `runs/c0-clean.samples.json` and trace
  (`tools/exposure_check.py`): `distinct sighting instants 255`, `gaps ... min 0.5 median (<2 s) 0.5 p90 (<2 s) 0.52`;
  with one 0.5 s gap my script reproduces every published figure, and with two:

  | Class (bead-named) | names / sampled / never | published upper | two 0.5 s gaps |
  |---|---|---|---|
  | `syzygy-public-screen-` | 12 / 12 / 0 | 0.156 | **0.196** |
  | `syzygy-trigger-` | 35 / 4 / 31 | 0.115 | 0.129 |
  | `syzygy-dossier-src-` | 33 / 3 / 30 | 0.109 | 0.119 |
  | `syzygy-trigger-repo-` | 1 / 1 / 0 | 0.013 | 0.017 |
  | `syzygy-poc-surface-state-` | 4 / 0 / 4 | 0.013 | 0.013 |
  | `syzygy-build-output-` | 1 / 1 / 0 | 0.297 | 0.300 |

  `finding[4]` and the PR body say the five never-left prefixes "have an upper bound of 0.156 or less". The stored tables
  support "0.196 or less". The conclusion ("a kill misses them most of the time and catches them sometimes") survives:
  by Markov's inequality one kill catches a class with probability at most its expected count, here at most 0.196
  [Inferred, under the record's own assumption that the clean run represents a kill run's timing].
- **Failure scenario.** A later sizing (F2's budget, a /tmp-exhaustion estimate, a decision that a class needs no
  sweep) reads `upperBound` as a bound and under-estimates every sampled class; the gap grows with the number of
  sampled names per class (12 names → +0.04 here; a class of 100 short sampled names → +0.33).
- **Proposed fix.** Count two gaps per sampled name (`+ 2 * exposure_interval`, or the measured gap before and after
  if the sampler records its sample instants) and keep one for never-sampled names; regenerate the census and both
  assembler-bound records (`assemble-selftest`, `input-checks` name the assembler's sha256); reword
  `exposureRanking.meaning`; state that the bound assumes sample gaps of at most 0.5 s (the stored instants show a p90
  of 0.52 s, so either carry the measured maximum gap or say so). Add an aggregation fixture with a literal expected
  bound (section 7) so a mutant of `:382` dies. `topLevelChildrenOfOneObserved` cannot be re-read (the run
  directories are gone): carry the stored value through, or drop it with a dated note.

### F2 — blocking — `finding[2]`'s partition of the 176 classes sums to 174

- **Evidence.** [Observed] `finding[2]` (`assemble_census.py:493-495`) reads: "176 classes ... (170 by mkdtemp): 163
  by test files, 6 by non-test modules, 1 by cdp-browser.ts (the browser profile), 3 by Chrome, vitest and npm
  themselves, and 1 lock file made by restart.ts." 163 + 6 + 1 + 3 + 1 = 174. The two `R1-fixture-sweep-landed`
  classes (`syzygy-poc-surface-fixture-p<pid>-n<ns>-`, `…-template-p<pid>-n<ns>-`, creating file
  `apps/three-surface-poc/src/test-model-fixture.ts`, a non-test module) are in no term. Read as written, "6 by
  non-test modules" is also false: 9 classes are made by non-test modules (`test-model-fixture.ts` 2,
  `cdp-browser.ts` 1, the six R6 classes). The PR body repeats the 174-term list. The rule table itself is right
  (`byRule` sums to 176).
- **Failure scenario.** A reader reconciling the census (rule 2: enumerate remainders) finds two classes with no stated
  creator group, or concludes PR 509's two classes come from test files.
- **Proposed fix.** Generate the sentence from every rule count, e.g. "2 by test-model-fixture.ts (PR 509's sweep), 6 by
  other non-test modules, …", and have the assembler assert that the parts it prints sum to `len(table)`. Correct the
  PR body to match.

### N1 — note — the tracer limits omit the recursive-mkdir parent

- **Evidence.** [Observed] `scratch_trace.cjs:40` logs a call only when `path.dirname(resolved)` is the temp directory,
  so `mkdirSync(join(tmpdir(), 'a', 'b'), { recursive: true })` creates top-level `a` without a trace line
  (`UNTRACED bs-recursive-parent`). `limits[0]` lists "open/openSync, copyFile, rename, link, cp, a stream, or ... a
  process that is not Node", not this; `mkdtempDisposableSync` (Node 24, `UNTRACED bs-disposable-…`; 0 uses in the
  repo) is also absent. No run left such an entry (section 3).
- **Failure scenario.** A future helper making `join(tmpdir(), 'syzygy-x', sub)` recursively leaves `syzygy-x`; the
  census files it as `unattributed` and R8 "creator unknown" though a Node frame made it.
- **Proposed fix.** `mkdirSync`/`mkdir` with `recursive: true` return the first directory created: log that return
  value when its parent is the temp directory. Add the case to `trace_fixture.mjs` with a mutant, and add both APIs
  to `limits[0]`.

### N2 — note — the surviving-process count is a lower bound

- **Evidence.** [Observed] `census_run.py:67` matches `--user-data-dir=<private>/tmp/` in the arguments only. In my
  75 s kill, 26 processes carried my private TMPDIR, 18 by that argument and 8 only by `TMPDIR=` in their environment,
  among them two `cat` processes in the browser's group and a `chrome_crashpad_handler` in its own group (its
  `--database=` argument names the operator's real `~/.config/google-chrome/Crash Reports` directory; I read the
  argument only, not the directory). `cdp-browser.ts:324-326` already says "Browser helpers can omit --user-data-dir
  or rewrite their entire argv into one field." In my probe the crashpad handlers exited within 10 s of SIGTERM to the
  marked processes; whether the PR's runs left any helper running is [Unknown].
- **Failure scenario.** "10 / 26 / 8 Chrome processes survive" is read as the whole population, and a sweep sized on it
  misses helpers.
- **Proposed fix.** Say "at least"; in `census_run.py` also count (and stop by pid) processes carrying the private
  `TMPDIR=` value or the browser's session id, and record them by kind. Separately worth a bead: headless test Chrome
  writes crash reports into the operator's real Chrome configuration directory [Inferred from the argument].

### N3 — note — F1 is not safe to file as described; the guards it must carry

- **Evidence.** [Observed] F1 (`assemble_census.py:506`, `followUps[0].what`) and R3's text (`:100`) stop "processes
  whose arguments carry --user-data-dir=<that profile>/". `cdp-browser.ts:462` launches Chrome with
  `--user-data-dir=${profile}`: no trailing slash, so that marker matches no Chrome process, and a sweep built on it
  would find "no live process" and delete a profile under live orphans. Argument matching alone also misses helpers
  (N2).
- **Failure scenario.** F1 lands as written; after a SIGKILL, the next run's sweep sees no marked process, removes the
  profile and the Chrome singleton directory while the orphan Chrome processes (the record counts 10 / 26 / 8 per
  kill) still run, and those orphans keep running unsignalled.
- **Guards F1 must carry.** (1) Owner liveness exactly as PR 509: owner pid and pid-namespace inode in the name; refuse
  when the owner is alive or the namespace differs. (2) Process match by exact argv element equality
  `--user-data-dir=<profile>` over `/proc/<pid>/cmdline` split on NUL, same uid, never a substring; plus the browser's
  session: read the browser pid from the profile's `SingletonLock` link, verify its uid, start time (field 22) later
  than the profile's creation and its argv element, then signal its session members, as
  `livePrivateBrowserMembers` does. (3) Re-verify identity immediately before each signal (or use a pidfd) against pid
  reuse. (4) SIGTERM, bounded wait, then SIGKILL; a stopped (`T`) process holds SIGTERM until SIGCONT, so SIGKILL it
  (the PR saw one). (5) Delete only after a re-scan finds no matching process. (6) Follow `SingletonSocket` with
  `lstat` only; accept its target only if the target's parent realpath equals the run's temp directory, the basename
  matches the Chrome singleton shape, it is a directory owned by the uid and not a link; never follow a link out of
  that directory (PR 515's guard). (7) Normalize paths before any containment check (AGENTS.md: `authorizeWrite` uses
  raw `startsWith`). (8) A rule-6 mutant per guard and an independent review; the PR states its CC-REV-1 classes.
- **Proposed fix.** Carry these guards verbatim into the F1 bead, and correct the marker in the record's F1 and R3 text
  in the F1/F2 regeneration.

### N4 — note — F2 is testable only with additions, and R9/R6 rest on F2 being lodged

- **Evidence.** [Observed] `syzygy-bpyt.4.4` (bd, read-only) describes "tempDir()" in a private kit that "test files
  across packages adopt"; it says nothing of an owner-pid root, a sweep or assigning `TMPDIR`. Yet R9 (`:117-119`)
  states "The kit's tempDir() (syzygy-bpyt.4.4) makes one owner-pid root per process ... so one sweep covers all of
  them", and R6 (`:110`) relies on "a test-kit root installed as TMPDIR in the worker". A `tempDir()` helper cannot
  reach the six R6 classes, which call `mkdtempSync(join(tmpdir(), …))` themselves (`dossier-trigger.ts:42,143,145,210`,
  `self-corpus.ts:122`, `redis-shaped-measure-main.ts:22`). Only F2's `process.env.TMPDIR` mechanism does, and
  it works as stated for in-process callers and inheriting children (section 3). So the dispositions of 169 classes
  hold once F2 is lodged on 4.4, not before.
- **F2's criterion** ("no entry remains except the classes of rules R2, R4, R5, R7") is measurable with these tools,
  but: (a) a kill that catches no R9/R6 entry passes it vacuously. Require a non-vacuous kill (at least one R9 and
  one R6 entry left) or seed synthetic dead-owner roots, as PR 509's tests do. (b) Under F2's mechanism,
  `cdp-browser.ts`'s profile (R3), Chrome's singleton directory (R2, Chrome inherits `TMPDIR`) and a worker-made lock
  (R7) land inside the worker root, so the root sweep inherits F1's orphan-process problem; the criterion is silent on
  R3. (c) A child started with a constructed environment (`no-egress.test.ts:55`:
  `env: { PATH: ..., HOME: dir, [FULL_RUN_ROOT_ENV]: REAL_ROOT }`) inherits neither the root nor the private TMPDIR, so
  its entries go to the system `/tmp`, outside both the mechanism and the measurement. Today that driver's dossier
  modules make no temp entry [Inferred: static grep of `tmpdir()` in `packages/polaris-dossier/src` non-test files
  finds only `polaris.ts:379` and `session-view.ts:99`, neither on that path].
- **Proposed fix.** Lodge F2 on 4.4 at merge, with: the non-vacuity condition; R3 either listed as an exception until F1
  lands or covered by F1's guards inside the root sweep; and a requirement that children with a constructed
  environment pass `TMPDIR` through, or a stated residual naming them. Reword R9/R6 as conditional on that comment.

### N5 — note — the static census extracts 2 of 591 literals, so the never-seen labels are wrong

- **Evidence.** [Observed] `static_sites.py`'s `LITERAL` is `['"`]([A-Za-z0-9._]+[-_])(?=['"`]|\$\{)`; the
  character class excludes `-`, so any multi-segment prefix (`'syzygy-poc-browser-'`) yields `None`.
  `tools/literal_check.py`: `sites 591 literalNone 589 noneButCorrectedRegexFindsAPrefix 177
  publishedRegexDisagreesWithRecord 0 filesAffected 117`. 10 of the 22 apps/ and packages/ files in
  `staticCoverage.neverSeen` are labelled "(a prefix passed as a variable)" though each has a literal:
  `restart.ts` (`syzygy-poc-restart-`), `session-view.ts` (`polaris-view-probe-`), `fresh-checkout-demo-main.ts`,
  `polaris-accessibility-main.ts`, `polaris-keyboard-sweep-main.ts`, `pwb-mutation-run-main.ts`,
  `pwb-mutation-sweep-main.ts`, `generation-mutation-run-main.ts`, `effect-observer.ts`,
  `daemon-entry-unchanged.system.test.ts`. The PR body's "(listed with their literals in the record)" is false for
  them. No disposition rests on this field (`staticFilesNamingTheLiteral` uses `git grep` on the real stem).
- **Proposed fix.** `['"`]([A-Za-z0-9._][A-Za-z0-9._-]*[-_])(?=['"`]|\$\{)`, a fixture line per shape, regenerate.

### N6 — note — Python does run in the root run

- **Evidence.** [Observed] `limits[3]` and `subject.notRun` say the Python and shell scripts are "not in any run", but
  TS tests start `python3 -c` children (`public-source-screening.test.ts:446`, `screen.test.ts:261` and `:345`, and
  `recorder-fixtures.testkit.ts`, named at `sync-child-process-guard.test.ts:36`). A Python file can never be a Node
  frame, so "never seen" for the 93 scripts/ files is structural, not a measure of reach.
- **Proposed fix.** Say so; the sampler's empty untraced set is the evidence that those children left nothing.

### N7 — note — two rule texts overstate

- **Evidence.** [Observed] R4 (`:103`) says the vitest directory is made "before any test runs"; the clean run's seven
  project directories first appear at 1.51, 1.51, 36.93, 75.99, 126.24, 131.29 and 138.85 s, one per project as it
  starts. The load-bearing part, vitest's main process, stands. R2 (`:97`) says the Chrome directory "can be removed
  only through the profile's SingletonSocket link"; F3, and F2's mechanism, would also reach it.
- **Proposed fix.** "As each project starts, in vitest's main process"; drop "only".

### N8 — note — the vitest shape rule also fits a 21-character mkdtemp name

- **Evidence.** [Observed] `NANOID = ^[A-Za-z0-9_-]{21}$` (`:37`) matches `dossier-origin-0gdUJr` (k1) and
  `polaris-marker-KE28cb` (clean run sampler). The trace classifies both first, so nothing is misfiled here. My own
  second method misfiled the first until I excluded word-stem names.
- **Failure scenario.** An untraced 21-character entry (a non-Node creator) is filed under R4 "vitest" as a residual.
- **Proposed fix.** Require the observed `ssr` child or reject a `<word>-<6>` stem; add a fixture name of that shape.

### N9 — note — the sampler records are bound only by the verification list

- **Evidence.** [Observed] `census_run.py` stores the trace's sha256 and line count but only the sampler record's
  path; the exposure figures rest on the samples. `input-checks` covers a missing sampler record, not an altered one.
  `verification-2026-10-24.json` does carry all 37 digests (checked).
- **Proposed fix.** Store the sampler record's sha256 in the run record, check it in the assembler, and add an
  input-check case.

### N10 — note — the assembler's probe leaves its directory

- **Evidence.** [Observed] Each full assembler run left `<probe>/tmp/node-compile-cache` (I removed `/tmp/r522-p1`,
  `/tmp/r522-p2`, `/tmp/r522-probe`).
- **Proposed fix.** Remove the probe directory in a `finally`.

## 5. Every changed output

None. [Observed] `git diff --name-status 7de5dc40 e2aae62e` is 38 `A` rows, all under `EV/`; the directory is cited
only from inside itself; no module, rendered page, route, machine body, ETag, wire format, refusal string, exit code,
signed or digest-bound artifact, spec, consent or retention decision changes. Both gates give the results the PR's
verification record gives.

## 6. Verdict per acceptance criterion

`syzygy-bpyt.4.18`: "A committed census record names the commit in full, the per-prefix counts after one SIGKILLed run
in a private TMPDIR, and the creating file for each prefix. Each prefix has a recorded disposition: a sweep, a test-kit
temp root, or a stated residual."

| Part | Verdict | Basis |
|---|---|---|
| Names the commit in full | **Met** | `subject.treeCommit` `a864e999645a071dda40325b2235976590e02973`; every run record and the static census name it (checked) |
| Per-prefix counts after a SIGKILLed run in a private TMPDIR | **Met** | three kills, `leftAfterSIGKILL` per class; recomputed by two methods; reproduced at 75 s (classes, not counts) |
| Creating file for each prefix | **Met** | 172 classes by innermost trace frame; Chrome, vitest and npm by shape with the launcher literal, the vitest source literal and the probe; the lock by its static stem, labelled inferred |
| A disposition for each prefix | **Met, conditionally** | 176 of 176, one rule each; the test-kit-root disposition of 169 classes holds once F2 is lodged on `syzygy-bpyt.4.4` (N4) |
| Findings follow from the tables | **Not met** | F1 (bound), F2 (partition) |

## 7. Test quality (the assembler self-test)

- [Observed] Expected values are literals (`EXPECTED`, `:145-163`), never read from the code under test. The fixture
  covers the classifier's edges well: 21 versus 20 characters, both Chrome spellings, Chromium, a `.bak` near-miss, an
  owner-pid name beside a plain one, a derived name, `calledFrom`, a frameless third-party creator. 17 of 17 mutants
  are killed, 15 by divergence and 2 (`unknown-creator-rule-dropped`, `no-frame-not-treated-as-unknown`) by the
  designed fail-closed stop. Each record stores `old`/`new`.
- [Observed] My mutants: 1 of 4 fixture-reachable killed (`r6-tree-clause-dropped`, by `thirdparty-FFFFFF`).
  Survivors: `r9-all-test-files-to-any` (`and all(TEST_FILE.search(f) for f in files),` → `any`),
  `testkit-suffix-not-a-test-file` (`|\.testkit\.ts$')` → `')`), `creating-file-from-last-row` (`rows[:1]` →
  `rows[-1:]`). Over the real stored runs the first two change nothing (`census-m1.json byRule equal True classes
  changed [] finding equal True`, same for m3), since no class mixes test and non-test creators and no `.testkit.ts`
  file is an innermost frame. They are gaps for future data, not errors in this record.
- [Observed] `exposure-upper-adds-no-gap` (`:382`) survives by construction: the self-test exercises only
  `classify`/`disposition`, never the aggregation (counts, exposure, sweep effect, finding sentences). That is where
  F1 and F2 live (test-rigor bar 1 and 3: the aggregation behaviour has no pin).
- **Proposed fix.** Add a fixture class made by one test file and one non-test module (must stop), a `.testkit.ts`
  creator, a name whose two rows name different files, and a small synthetic two-run aggregation with literal
  expected `byRule`, partition sentence and exposure bounds, plus mutants of `:382`, `:385` and the sentence.

## 8. Cleanup

- Deleted: the scratch clone `rev-522/clone`, the evidence copies `rev-522/evcopy-m1` and `rev-522/evcopy-m3`, the
  mutant copies `rev-522/mutants/`, `rev-522/rederived.diff` (its digest is in section 1), and every private
  directory `/tmp/r522-1`, `/tmp/r522-b`, `/tmp/r522-c`, `/tmp/r522-p1`, `/tmp/r522-p2`, `/tmp/r522-probe`
  (`/tmp/r522-ts` and `/tmp/r522i` were removed by their own tools). Nothing else in `/tmp` was touched.
- Processes: all 26 survivors of my kill and all 14 probe Chrome processes were stopped by pid after the private
  marker check (`"remaining": 0`, `remaining at end: 0`); none by name or pattern.
- Disclosure: one `python3 scripts/check_governance.py` was started by mistake with the shell's working directory in
  a lane worktree (`.worktrees/parallel-agents/syzygy-bpyt.4.11`) after a cwd reset; its result was discarded. The
  script's non-selftest path writes nothing [Inferred: every write site in it is inside a selftest temporary
  directory]. No file in any worktree was edited.
- Kept files, all under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522/`
  (sha256 by `sha256sum`; this raw's own digest is in the reply). `assemble-selftest-rerun.json` is byte-identical to
  the committed `assemble-selftest-2026-10-24.json` (same digest as in the committed verification record); `static-rerun.json` to the
  committed static census. The three `census-*.json` differ from one another only where each names its own
  assembler's sha256.

  | File | sha256 |
  |---|---|
  | `tools/blindspots.mjs` | `978bcb37962a63236d33f168840deb95547bb406eba26cbdb2d6abda8dea790a` |
  | `tools/chrome_helpers.py` | `2c1252f6dd4124f8614915b44690004f0ce900ee5fb9b479651aaa6e26f199c5` |
  | `tools/compare_records.py` | `901888743b33928bf129f0f6a45182b11f5f5e30f40ab08426d1734376298386` |
  | `tools/creator_sweep.py` | `f173218b848bb6f4efa84ee5509212c325f0d8152bc5b4ea54941de2330ba04e` |
  | `tools/digest_checks.py` | `f1f983d4762ece629fe0b9aa2502ba037d6a88ff3ce7f3e8aaef5236f5137451` |
  | `tools/exposure_check.py` | `c4f183697c47c074a6dd9186353941157fe353ad17470718cf0b263be6edbbae` |
  | `tools/kill_repro.py` | `a7f4fe37f40fc1b559cc3c4448730a3c64e7040d920a8d0b0e38e44926810e9f` |
  | `tools/literal_check.py` | `b53fafc5532822d835025ff623a75612d6c0f8ddff3189a645a2738a0612732b` |
  | `tools/my_mutants.py` | `74b4569dad9f5b5782011afa18c8bdfbbf060b700e023321a70c4fd067355fcf` |
  | `tools/run_blindspots.py` | `4a5048fc429078d89ecf736e8de3f96c162cf5dcb6e58ae6f1fc48d5cd52bacc` |
  | `tools/sameline.py` | `93094c6ae1761385164600a97778581bcef8b3ea2e4b0808b9cdcb69f2f45f08` |
  | `tools/second_method.py` | `90fec4f5f11a39067e2efb42e45ad130835bcb0918ce9aa01ed224aaff45911e` |
  | `assemble-selftest-rerun.json` | `97683fe2be4dd59412cacb1bf96023170d3f26b1f1633720992efd8171a1ac71` |
  | `blindspots.out` | `f98ede30f1535c4ff2656ec8762f6d9a255b8104fc7801e9b264d562fa139b77` |
  | `census-m1.json` | `e2e7787c2b5b88d1a8ff39cdcb59cad5b0c16c0e8cfe5d2abc4a5f6777b3ab42` |
  | `census-m3.json` | `c812be7e15c4839c627603fe3d3a6a4100e01bd2bfcebfff0dce08e6a353a7f1` |
  | `census-rerun.json` | `ca3d308e2bdf7159ca38b94b7d2049d1918c4d75d27a2cf08042fd8fbbf67533` |
  | `chrome-helpers.json` | `52215838639d7340c638cf002e527d27762b165d3a4d8bcef07f1b01d55d61b6` |
  | `creator-sweep.json` | `d1703bccdd14d4150406c98ac54db5cf3621c1610fbf5be6c1d5d1dd1998eaa4` |
  | `digest-checks.out` | `a3e4ca35c0331eee9ddc15ed170c08418448510600ecce606d0355e210f4eff8` |
  | `exposure-check.out` | `09bb34ef9d8f14ad0c50aa42f9458fc6bc771b71bb08a6c45f9a15972991f43d` |
  | `gate-governance.log` | `d213087934d327d4d0750a3e330504c770636d8e43b0bfafea253c9d63bc0583` |
  | `gate-quotations.log` | `3630765ceadaec94fa431de31d8422c076576afd96f7d05d1bb50c074f2b0a7a` |
  | `input-checks-rerun.json` | `c88c09641dc121c5136215c4166ae2daf8a26993a21ba544d01a4d58c346a1ec` |
  | `input-checks-rerun.out` | `a9814d6b8385bc35f6e8a5af67d21fc0438837d0ce523cb7af7477e105350e7d` |
  | `literal-check.out` | `948ffa92989e23035a567aa7aaef4c242c861b35586155c023bf6b4f6e07a318` |
  | `main-changed.txt` | `87cc64637d7521e26a13d33981bd03c0086a629d52c2eadbdca434886a405ad2` |
  | `my-mutants.json` | `d417b81266d86c3d138a55a0d00382409ebe6ca8ed46b4a9b12af18913c2e5e6` |
  | `npm-ci.log` | `4bc3419a2ce9d4452ee6197a7129b5dc725090e1bb3c4c4c1b5473cc14af3507` |
  | `repro-k75.json` | `816e37ef78bb1ce354f4e31c47b963795881bb555460326438273a5ca75e4b49` |
  | `repro-k75.out` | `fa85bade98bf89a5d2b780855e60905ccfdf9effc911a410a1aabad37d4d4a60` |
  | `second-method.out` | `e61ce416467d4e3f62d59d1d19c4822388c9a899a9c911cbbc6fd3f8e78e5126` |
  | `static-rerun.json` | `09dfb9d602d15f149c2f8ef0acf6c8fd0c2036c0f0351d543f1f9c805b245d7a` |
  | `trace-selftest-rerun.json` | `c62e3a07ff2e48863001c6154f9abb1f3b6a218a8f7f503732aab90d057f3c8f` |

  `my-mutants.json` stores each mutant's `old`/`new` fragment; the fragments were applied to `EV/assemble_census.py`
  at `e2aae62e` (blob sha256 `6c651b650fef0baea1768dc862410d8998bfc1e3d4bce0cb21c417baf538fdfb`). The mutant copies
  themselves were deleted; `tools/my_mutants.py` regenerates them.
