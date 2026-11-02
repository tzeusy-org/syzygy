# R-GP-IMPL-OBSERVED-LEAVES-1 — CC-REV-1 implementation review of syzygy-bpyt.4.26, round 1
Verdict: REVISE
Reviewed commit: 6d95c626
Subject: r1-review.diff sha256 54240cc14c44be103ac719a6d0cc60820f4e67bb5ab72a1bdedd53044cddf666

Reviewer: rev-559 (fresh context, default model), 2026-10-29. Test-only subject; I changed no byte of it. I did not push,
comment, merge or run any bd mutation. No target repository content was fetched; every run used the test's own fixture clone.

## 1. Subject identity checks

- [Observed] `git diff eb6183b5 6d95c626 | sha256sum` in my scratch clone gives
  `54240cc14c44be103ac719a6d0cc60820f4e67bb5ab72a1bdedd53044cddf666`, equal to `sha256sum` of the coordinator's
  `r1-review.diff`. It matches.
- [Observed] `git merge-base eb6183b5 6d95c626` = `eb6183b58253ef62fa364b78778efda9a77073df`.
- [Observed] `gh pr view 559 --json headRefOid,state`: `{"headRefOid":"6d95c6264b7de14825fd6abfb6e3fed9b8c975f1","state":"OPEN"}`.
- [Observed] PR body, `gh pr view 559 -R Tzeusy/syzygy --json body --jq .body | sha256sum`, read twice (start and end of
  the review): `e421b25f97b10a9c28a7e613158c1f7c5397da4e2217159c3691d21ae18d4877` both times. It matches.
- [Observed] Scope, by `git diff --stat eb6183b5 6d95c626`: 9 files, `1107 insertions(+), 58 deletions(-)`; 8 under
  `docs/evidence/syzygy-bpyt-4-26/` and `packages/polaris-dossier/src/review.test.ts`.
  `git diff --name-only eb6183b5 6d95c626 -- apps packages scripts` lists only `packages/polaris-dossier/src/review.test.ts`.
  `git diff --name-only ... -- packages/three-surface-poc-core apps/three-surface-poc` lists 0 files. No product module,
  config, manifest or `scripts/` file changes.
- [Observed] `git diff --stat 00d882a3 6d95c626` touches only `docs/evidence/syzygy-bpyt-4-26/` (7 files), so the test bytes
  at `00d882a3`, `a64518bd` and `6d95c626` are the same: `git show 6d95c626:packages/polaris-dossier/src/review.test.ts |
  sha256sum` = `3e3c3a74952114a044c0624c73e8a78041f41c79b86d1ce0e46c2bb437dae0f6`, equal to `record.json`'s `subjectSha256`.
- [Observed] Every `files` digest in `record.json` matches the file on disk at `6d95c626` (7 of 7, by `sha256sum`).
  `tools/titles.py` differs from `docs/evidence/syzygy-bpyt-70/tools/titles.py` on main `f361108c` in its docstring's first
  line only (`diff`: one line changed), as its docstring says.
- [Observed] Authority-sweep keys: a Python walk over the 5 retained `.json` files finds no key named `source`,
  `provenance`, `evidence` or `anchor`.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:16` onward), quoted:

- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing
  the change never finally decides which classes it touches."
- Class 3: "**deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);"
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- "**The change record states** which classes the change touches, or \"none,\" so a misclassification is a findable
  violation after the fact." and "**A reviewer or the owner** may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:44` onward), quoted:

- "\"Behavior-preserving\" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
  code; a signed or digest-bound artifact; a consent, security or retention decision."
- "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint." The checks: "an old-versus-new differential over a
  mutated-record corpus that includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking owner
  notice in the cycle report."
- Stop clause (`:95`): "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

Test-rigor bar (`git show 6d95c626:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:58-59` "**Every bugfix ships a regression test** — Written to fail on pre-fix code."
- `:78-81` "**Deterministic or quarantined** — A test that fails intermittently is worse than no test ... Fix the
  nondeterminism (time, ordering, shared state) or delete the test; never retry-until-green."
- `:93-96` "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches
  ... Reviews state the net test delta".

AGENTS.md verification rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".

**Class ruling.** [Inferred] The changed row is the oracle for what the dossier review commands label Observed against
Inferred: "What is Observed about a verdict is the packet and its digest and that the verdict names it; nothing the reviewer
wrote." That is the deterministic/inferred seam, so the change touches **CC-REV-1 class 3 at the test-oracle level**. It
does not touch class 4: no SEC-1…SEC-5 surface, auth surface or egress path is read or changed. Not classes 1, 2, 5, 6 or 7:
no authority table, identity, store, endpoint or certificate code changes, and no product byte changes (§1). The PR body's
"class 4, a test guard that refuses more" names the wrong class: CC-REV-1's class 4 is security, and "a test guard that
refuses more" is the #546 precedent's phrase for when an owner notice is due, not a class (N2). Class 3 and class 4 carry the
same GP-Q0 checks, so the checks owed do not change: the differential is §3.6, the rule-6 mutants §3.4-3.5, and the owner
notice the coordinator's.

**Does the change accept anything a test refused before?** [Observed] Yes. At `eb6183b5` under `TMPDIR=/tmp/r559-p1` the
observed-only row failed (§3.2); at `6d95c626` under the same TMPDIR it passes. What is newly accepted is a verdict leaf whose
every occurrence in a holder's string values lies inside, or straddles the edge of, an occurrence of the run path. The run
path is built by the test (`tempDir(...)` + `RUN_ID`); it is not reviewer text and not derived from the verdict. This is the
bead's acceptance criterion itself ("The row passes under a TMPDIR containing p1"), and the bead's own suggested fix ("compare
leaves against the holder with path fields removed") narrows further. **Stop clause:** no product gate changes (only the test
file changes outside `docs/evidence/`), so I rule that the stop clause does not fire. The test guard both narrows (above) and
refuses more (§4 F1). Under the #546 precedent ("a test guard that refuses more takes an owner notice on syzygy-bpyt.10, not an
owner question") an owner notice on `syzygy-bpyt.10` is due. It must name class 3, list the narrowing, and list the new
refusals exactly. As the body stands it cannot be written from the body, because the refusal list is not exact (F1).

## 3. What I ran, and the results

Scratch clone of `/home/tze/GitHub/syzygy` under `rev-559/clone`, checked out at `6d95c626`; `npm ci` printed "added 117
packages in 2s" and exited 0. Every `dist/` was absent for every run (`find . -path ./node_modules -prune -o -type d -name dist
-print | wc -l` → `0`). One vitest process at a time.

### 3.1 Hosted CI at `6d95c626`
[Observed] `gh pr checks 559`: `checks pass 21m59s` and `node pass 3m10s`. Run `40766372849` (node): `headSha
6d95c6264b7de14825fd6abfb6e3fed9b8c975f1`, `conclusion success`; every step success, including "typecheck (npm run
typecheck)", "unit + conformance tests (npm test)" and "system tests (npm run test:system)". Log lines: `Test Files 253 passed
| 3 skipped (256)`, `Tests 5811 passed | 5 skipped (5816)`; system: `Tests 51 passed (51)`. Run `40766372855` (checks):
`headSha 6d95c626...`, `conclusion success`.

### 3.2 The false failure, reproduced at the base
[Observed] Base test file (`git show eb6183b5:...review.test.ts`) at load 25.69, `TMPDIR=/tmp/r559-p1`:
`× review-check > observes only the packet, its digest and that the verdict names it: ...`,
`AssertionError: expected '{"command":"review-packet","outcome":…' not to contain 'p1'`, `Tests 1 failed | 61 passed (62)`.

### 3.3 The changed file at `6d95c626`, targeted runs
[Observed] Each `npx vitest run packages/polaris-dossier/src/review.test.ts`:

| TMPDIR | load1 | Result |
|---|---|---|
| `/tmp/r559-1` | 22.70 | `Tests 63 passed (63)` |
| `/tmp/r559-p1` | 24.83 | `Tests 63 passed (63)` |
| `/tmp/r559-slash/` (trailing slash) | 32.30 | `Tests 63 passed (63)` |
| `/tmp/r559-link` (symlink to `/tmp/r559-real`) | 32.13 | `Tests 63 passed (63)` |
| `/tmp/r559-q"x` (holds a `"`) | 32.68 | `FAIL ... > observes only the packet and its digest under a TMPDIR whose path holds a verdict leaf`, `AssertionError: expected 0 to be greater than or equal to 2`, `Tests 1 failed \| 62 passed (63)` |
| `/tmp/r559-q"x`, base test file | 32.91 | `Tests 62 passed (62)` |
| `/tmp/r559-q"x`, N1's fix applied | 29.72 | `Tests 63 passed (63)` |
| `/tmp/r559-1`, N1's fix applied | 29.93 | `Tests 63 passed (63)` |

Local merge with current main: `git ls-remote` main = `f361108c94233195a19a7e1bc639f90170c3b88d` (#557), still main at the
end of the review. Merge of `f361108c` into `6d95c626` was clean (76 files from main, `package-lock.json` unchanged, no
`packages/polaris-dossier` file from main). [Observed] `TMPDIR=/tmp/r559-1` (load 38.55): `Tests 63 passed (63)`;
`TMPDIR=/tmp/r559-p1` (load 34.73): `Tests 63 passed (63)`.

### 3.4 Whole vitest suite at `6d95c626`, every `dist/` absent
[Observed] `TMPDIR=/tmp/r559-full npx vitest run --reporter=json`, load1 34.31 at start and 62.00 at end, 317 s wall:
256 files (256 `passed`), `numTotalTests 5816`, `numPassedTests 5811`, `numFailedTests 0`, `numPendingTests 5`,
`success true`. No file failed, so no re-run was needed. Clone clean after (`git status --porcelain` empty). Summary kept as
`full-summary.json`.

Governance at `6d95c626`, load 28.48: `python3 scripts/check_governance.py` exit 0, last line `32 OK, 21 WARN, 0 FAIL (53
checks) — counts derived, not asserted`. I did not run `npm run typecheck` locally; hosted node's typecheck step passed at
`6d95c626` (§3.1). `polaris-authority-sweep.test.ts` passed inside §3.4's run.

### 3.5 Rule 6: the lane's mutants, re-run
[Observed] `python3 -I docs/evidence/syzygy-bpyt-4-26/tools/mutants.py <clone> lane-mutants-absent.json /tmp/r559-lane absent`
at `6d95c626` (load 45.98 at start, 33.56 at end): `summary {'rows': 8, 'asExpected': 8, 'unexpected': []} status after ''`.
Every kill is an assertion, not a timeout. First lines, verbatim from the record:

| Row | Failing rows | Kill message |
|---|---|---|
| U0, U0P | none | |
| M1 | new row | `AssertionError: expected '{"command":"review-packet","outcome":…' not to contain 'p1'` |
| M1P | both observed-only rows | same, on both |
| M2 | validates, both observed-only | `expected { command: 'review-check', …(18) } to match object { command: 'review-check', …(10) }`; `expected '{"packetSha256":"89ee575dceeadd31c97b…' not to contain 'not-ready'` |
| M3 | both observed-only | `expected '{"command":"<run>","outcome":"<run>",…' to contain 'd4fb5f26828e1201fc5aba726bd9b5ba6154e…'` |
| M4 | new row | `expected '/tmp/r559-lane/plain' to be '/tmp/r559-lane/plain/tmpdir-p1-96KRt6' // Object.is equality` |
| M4B | new row | `expected 0 to be greater than or equal to 2` |

I re-ran the absent state only; the present state at `6d95c626` is [Unknown] to me (the lane's retained present record is at
`a64518bd`: `8/8`, `statusAfter ''`, 10 dist dirs).

### 3.6 Rule 6: my mutants, and the old-versus-new differential
Tool `tools/rmut.py` (exact-once edits, one file run with vitest's JSON reporter, restore, clean check; `statusAfter ''` on
every batch). Records: `probes.json`, `rmut.json`, `rmut2.json`, `rmut3.json`. Load1 per row 20.2–56.1.

Probe (P0 plain, P0P under a p1 TMPDIR; no edit to any assertion; 63/63 both): 5 Observed holders per call; 2 of them carry the
run path (the `reviewPacket` report and the CLI `review-packet --json` output), in `run` and in
`directory: "<run>/reviews/fidelity-packet-<digest>"`; `runTwice: []` in all 4 probes (no string value holds the run path
twice). Reviewer leaves (30 distinct) include `p1`, `p1a`, `p1b`, `p2`, `intro`, `prose`, `reviewer-1`, `span-1`…`span-5`.

| Row | Edit | TMPDIR | Observed-only rows | First kill line |
|---|---|---|---|---|
| R1 | replacement skips the holder carrying `command` (misses one holder) | plain | both fail | `expected '{"command":"review-packet","outcome":…' not to contain '/tmp/r559-m-qx'` |
| R1B | R1, and the tmpdir assertion dropped | plain | old row passes, new row fails | `not to contain 'p1'` (new row) |
| R1BP | as R1B | p1 | both fail | `not to contain 'p1'` |
| R2 | `value.replace(run, '<run>')` (first occurrence only) | p1 | both pass: **survives**, equivalent at this fixture (N3) | |
| R3 | `review.ts`: `run: \`${opened.run}p1\`` (leaf after the run path) | plain | both fail | `not to contain 'p1'` |
| R3B | `run: \`p1${opened.run}\`` (leaf before it) | plain | both fail | `not to contain 'p1'` |
| R3C | `directory: path.join(directory, 'p1')` (leaf as a segment under it) | plain | both fail (+7 collateral) | `not to contain 'p1'` |
| R3D | `run: \`${opened.run}/reviewer-1\`` (the sessionId leaf beside it) | plain | both fail | `not to contain 'reviewer-1'` |
| R4 | the `finally` restore deleted | plain | new row passes; 26 later rows fail | `Error: ENOENT: no such file or directory, mkdtemp '/tmp/r559-m-qx/tmpdir-p1-iwhwd6/dossier-review-clone-XXXXXX'` |
| R5 | `review.ts`: review-packet `packetSha256: 'x'` | plain | both **pass** (the digest is still in `directory`); killed elsewhere | `expected 'x' to be 'dcb46d55…'` (CLI row) |
| R6 | `directory: \`${opened.run}-elsewhere\`` (under tmpdir, outside the run dir) | plain | both **pass**; killed elsewhere (7 rows, packet ENOENT) | |
| R7 | `directory: \`${path.dirname(path.dirname(opened.run))}-other\`` (= `<tmpdir>-other`, outside tmpdir) | plain | both fail | `expected '{"command":"review-packet","outcome":…' not to contain '/tmp/r559-m-qx'` |

Differential, the old check (`eb6183b5`'s raw `JSON.stringify(holder)`, no tmpdir or digest assertion) against the new one,
observed-only row only. Old column: `rmut3.json` (OLD-R3/R5/R6/R7) and §3.2/§3.5 (unmutated, M1/M1P):

| Input | Old check | New check |
|---|---|---|
| unmutated, plain TMPDIR | passes | passes |
| unmutated, TMPDIR holding `p1` | **fails** (`not to contain 'p1'`) | passes (the narrowing, listed) |
| R3 leaf beside the run path | fails | fails |
| R5 holder's `packetSha256` wrong | passes | passes |
| R6 `<run>-elsewhere` | passes | passes (listed as refused: F1) |
| R7 `<tmpdir>-other` | passes | **fails** (refused, not listed: F1) |

The "records with altered prose" part of the GP-Q0 differential does not apply as written: no product record or reader
changes, and the altered-prose analogue here is a verdict leaf added to emitted text (R3–R3D, M2).

## 4. Findings

### F1 (blocking): the body's list of new refusals is not exact, so the owner notice cannot be written from it

Severity: blocking under the verdict rule ("a false sentence in the PR body"; "a refusal the body does not list").

Evidence [Observed]:
- The body's "New test refusals" item 1, "An Observed holder that carries a path under `os.tmpdir()` outside the run
  directory", is false for a path that starts with the run path's spelling. R6 emits `directory: <run>-elsewhere`, a path under
  `os.tmpdir()` outside the run directory, and both observed-only rows pass, since `value.split(run).join('<run>')` turns it into
  `<run>-elsewhere` and `expect(text).not.toContain(tmpdir())` finds nothing.
- The check also refuses something the body does not list. R7 emits `<tmpdir>-other`, a path *outside* `os.tmpdir()`, and both
  rows fail with `not to contain '/tmp/r559-m-qx'`. The predicate is a substring test on JSON text, so it refuses any text that
  begins with the `os.tmpdir()` string. This is the brief's "TMPDIR that is a prefix of another path" case, and it is real.
- It compares the unescaped `os.tmpdir()` string against JSON text. Under a TMPDIR holding `"` or `\` it can never match (and
  the new row fails falsely: N1). Under a Linux symlinked TMPDIR, `tmpdir()` is the link's spelling while `run` is resolved
  (`tempDir` calls `fs.realpathSync`), so a stray resolved path is not refused. On macOS (`/private/var/…` contains `/var/…`)
  it is.
- Item 2, "whose JSON ... no longer carries the packet digest it observes": the test asserts the digest of the packet the test
  assembled, anywhere in the text. R5 sets the holder's own `packetSha256` to `'x'`, and both rows pass because `directory`
  still holds `fidelity-packet-<digest>`. The assertion works as the vacuity guard M3 shows. It does not pin the field, and
  the field is pinned by other rows (R5 kills: the review-packet row and the CLI row).
- Summary, bullet 1: "It also asserts that no `os.tmpdir()` path is left in that JSON, and that the packet digest the holder
  observes is still there". Both halves have the same inexactness.

Failure scenario: the coordinator writes the `syzygy-bpyt.10` owner notice from the body. It then tells the owner the test
refuses a stray tmp path that it accepts (R6), and leaves out a refusal it makes (R7). The #554 precedent quoted in §2 holds
the notice to listing "exactly what the guards newly refuse".

Exact fix: body only, no code change required. In the Summary, replace the sentence "It also asserts that no `os.tmpdir()`
path is left in that JSON, and that the packet digest the holder observes is still there." with:

> It also asserts that the `os.tmpdir()` string no longer occurs anywhere in that JSON, and that the digest of the packet the
> test assembled still does.

Replace the whole "## New test refusals" section (heading through "...still fails the check (mutant M2 below).") with:

> ## New test refusals
>
> The check now refuses two things it did not refuse before (both test-only). Both are substring tests over each Observed
> holder's JSON text after every occurrence of the run path in its string values has been replaced by `<run>`:
>
> 1. The text still contains the `os.tmpdir()` string. This refuses a path under `os.tmpdir()` outside the run directory,
>    except one whose spelling begins with the run path: a sibling such as `<run>-old` is replaced along with it and is not
>    refused. It also refuses any text that only begins with the `os.tmpdir()` string, such as a path under `<tmpdir>-other`,
>    which is not under `os.tmpdir()`. The comparison is the unescaped `os.tmpdir()` string against JSON text, so a TMPDIR
>    holding `"` or `\` never matches. Under a symlinked TMPDIR the run path is the resolved one, so a stray path spelled
>    through the resolved directory is refused only where it contains the TMPDIR's own spelling (it does on macOS, `/private/var/…`
>    against `/var/…`; it does not under a Linux symlink).
> 2. The text no longer contains the digest of the packet the test assembled. The review-packet holders carry that digest
>    twice, in `packetSha256` and in `directory`, so this guards against a replacement that empties the text (mutant M3). It does
>    not pin the `packetSha256` field, which the review-packet and CLI rows pin.
>
> The check also stops refusing one thing: a verdict leaf whose every occurrence in a holder's string values lies inside, or
> straddles the edge of, an occurrence of the run path. That was the false failure. A verdict leaf anywhere else in a holder
> still fails the check (mutant M2 below; a leaf right before, right after or under the run path also fails it).

If N1's code fix is applied in the same round, drop the sentence "The comparison is the unescaped ... never matches." and
replace it with "The comparison is the JSON-escaped `os.tmpdir()` string against JSON text."

### N1 (note): a TMPDIR holding `"` or `\` makes the new row fail falsely

Evidence [Observed]: under `TMPDIR='/tmp/r559-q"x'` the head fails the new row with `expected 0 to be greater than or equal to
2`, and the base passes (62/62). `holderTexts` are JSON text, where `"` is spelled `\"`, so `text.includes(leafy)` never
matches. For the same reason `expect(text).not.toContain(tmpdir())` is vacuous under such a TMPDIR. This is the same failure
class as the bead's: a host TMPDIR makes the suite fail falsely. On POSIX it is rare (`"`, `\`, a control character).
Exact fix, verified 63/63 under both `/tmp/r559-q"x` and `/tmp/r559-1` (§3.3). In `review.test.ts`, replace

    expect(text).not.toContain(tmpdir());

with

    expect(text).not.toContain(JSON.stringify(tmpdir()).slice(1, -1));

and

      expect(holderTexts.filter((text) => text.includes(leafy)).length).toBeGreaterThanOrEqual(2);

with

      expect(holderTexts.filter((text) => text.includes(JSON.stringify(leafy).slice(1, -1))).length).toBeGreaterThanOrEqual(2);

Applying it in round 2 changes a test decision, so round 2 must cover it, and the lane's M4B kill message stays the same.
If it is not applied, file a follow-up bead quoting this note.

### N2 (note): the class is misnamed in the body

The body's "class 4, a test guard that refuses more" names CC-REV-1's security class. The change touches class 3 at the
test-oracle level (§2). The checks owed are the same. Act on it by naming class 3 in the owner notice, and, since the body is
being edited for F1, replace "as the author I read this as class 4, a test guard that refuses more. That is my reading, not a
ruling; the review decides." with "CC-REV-1 class 3 (deterministic observation, the deterministic/inferred seam) at the
test-oracle level, by the round-1 review's ruling; I had read it as class 4."

### N3 (note): "every occurrence" is unpinned

R2 (`value.replace(run, '<run>')`, first occurrence only) survives because it is equivalent at this fixture. No Observed
holder's string value holds the run path twice (`runTwice: []` in all 4 probes). The body claims no pin on this, and no
regression the PR names is missed. No action is required. If a holder later carries the run path twice in one string, a
first-only replacement would be caught by the tmpdir assertion anyway, since the second occurrence still contains `tmpdir()`.

### N4 (note): the evidence tools sit beside "no ... script changes"

The body's "The fix, test only (no product module, config, manifest or script changes)" is true of the fix (`00d882a3`'s
test change). The PR also adds three Python tools under `docs/evidence/syzygy-bpyt-4-26/tools/`, none run by CI. If the body
is edited for F1, write "(no product module, config, manifest or `scripts/` change; the evidence tools are under
`docs/evidence/syzygy-bpyt-4-26/tools/`)".

## 5. Every changed test decision

[Observed] By a Python comparison of the old row body (`eb6183b5`, de-indented) against `observedOnly()`'s body (`6d95c626`),
and of everything outside those regions. Inside, the only differences are:
`+ const holderTexts: string[] = [];`,
`- const text = JSON.stringify(holder);` replaced by `holderTexts.push(...)`, the two comment lines, the replacing
`JSON.stringify(holder, (_key, value) => ... value.split(run).join('<run>') ...)`, `expect(text).not.toContain(tmpdir());`,
`expect(text).toContain(digest);`, and `+ return { reviewerText, holderTexts };`. Outside: the old row's `it(...)` now holds
`await observedOnly();`, and the new row with its comment is added. Nothing else in the file changes (21 added lines outside,
all of them the two rows).

The decisions:
1. The leaf check reads replaced text instead of raw text: a narrowing, listed in the body (§2).
2. New refusal: the `os.tmpdir()` string left in the replaced text. Listed, inexactly (F1).
3. New refusal: the assembled digest missing from the replaced text. Listed, inexactly (F1).
4. New row under a TMPDIR whose path holds `p1`. Listed.
Every other assertion of the old row is byte-identical in `observedOnly()`.

## 6. Acceptance items

- "The row passes under a TMPDIR containing p1": **met** [Observed]. 63/63 under `/tmp/r559-p1` (§3.3). The new row runs
  under `<outer>/tmpdir-p1-…`, and M4 and M4B prove it really does: `expect(tmpdir()).toBe(leafy)` and the ≥2 holders carrying
  the leafy path both fail when TMPDIR is not set.
- "still fails when a verdict leaf really appears in the holder (a recorded mutant)": **met** [Observed]. M2 (retained) and my
  R3, R3B, R3C and R3D: a leaf after, before, as a segment under, and beside the run path is still caught. No reviewer leaf is
  left unchecked: each leaf is still tested against the whole replaced text, and only occurrences overlapping the
  test-supplied run path's spelling are masked.
- "titles unchanged or the change stated": **met**. `titles.json`: 5810 → 5811, 1 added, 0 removed. [Observed] My structural
  comparison (§5) agrees: one `it(` added, and the existing title's bytes are unchanged.
- "Tests delta and class stated": delta **met** (5810 → 5811; hosted and my full run both show 5811 passed). Class **stated
  but misnamed** (N2).

PR body figures against my runs: the base failure message, the mutant table's failing sets and kill lines, 256 files / 5811 /
0 / 5 skipped, and `check_governance` 0 FAIL all match [Observed]. The present-state re-run at `6d95c626` and the POC surface
version value are [Unknown] to me; the surface-version equality is [Inferred] from 0 changed files under both `src` trees. The
false sentences are those in F1.

## 7. Test quality

- Determinism [Inferred]: the new row is deterministic. `leafy` always holds `p1`, the run path is replaced whole, and the ≥2
  count is fixed by the product's two run-carrying holders. The fix also removes an existing flake. At `eb6183b5` the raw holder
  text carried `dossier-review-state-XXXXXX`, whose 6 random `[A-Za-z0-9]` characters hold `p1` or `p2` with probability about
  5 × 2 / 62² ≈ 0.26% per run, which failed the old row falsely regardless of TMPDIR. After the change that suffix is inside the
  replaced run path. This is test-rigor bar 6 (`SKILL.md:78-81`) served.
- Restore [Observed]: `finally` restores `TMPDIR`, and `os.tmpdir()` reads the environment on each call. R4 shows the restore
  is pinned: without it, 26 later rows in the file fail with `ENOENT ... mkdtemp '<deleted leafy>/...'`. `afterEach` removes the
  inner temp dirs before `leafy` (the cleanups run in reverse). The `outer === undefined` branch (delete) was not exercised by
  my runs, where TMPDIR was always set; hosted CI passed (§3.1). Whether its TMPDIR was set is [Unknown].
- Bar 2 (`SKILL.md:58-59`) [Observed]: the new row fails on pre-fix code (M1, `not to contain 'p1'`).
- Bar 10 (`SKILL.md:93-96`): the new row reuses the existing check through `observedOnly()` and does not copy it, which is
  the right extension. Net +1.
- Bar 7: the tmpdir assertion's failure line (`not to contain '/tmp/…'`) names the defect. The digest assertion's
  (`to contain '<digest>'`) does too, once a reader knows it is the vacuity guard; the in-code comment says so.
- Weak spots: N1 (escaping), N3 (first-occurrence equivalence), and R5/R6 above (the new assertions are vacuity and stray-tmp
  guards on text, not field pins). None makes a test survive the regression the PR names.

## 8. Cleanup

The scratch clone `rev-559/clone` is deleted. Every TMPDIR I made is deleted (`/tmp/r559-1`, `/tmp/r559-p1`, `/tmp/r559-full`,
`/tmp/r559-lane`, `/tmp/r559-real`, `/tmp/r559-slash`, the symlink `/tmp/r559-link`, `/tmp/r559-q"x`, `/tmp/r559-m-qx`,
`/tmp/r559-m-p1`). Afterwards `ls -d /tmp/r559*` returned "No such file or directory". I deleted nothing else in `/tmp`, and
I killed no process. Also deleted: the npm ci log, the PR-body copy, the main-branch `titles.py` copy, the full-suite vitest
log, and the 2.2 MB full-suite JSON report (summarised in `full-summary.json`).

Kept files (paths relative to `rev-559/`, each under 300 KB):

| `<path relative to rev-559/>` | `<sha256>` |
|---|---|
| `tools/rmut.py` | `ac2cc6b6a64d0226bc007e7e4e36c1a53687f12d26b12d59e2bc09ef0a0d1fc1` |
| `probes.json` | `19cc098979939d0b0e61df8a3019f66b9f7d8ef8cabf73a5ac11cc84d278e5ed` |
| `probes/P0-probe-plain/probe-1793225171712-r7wq6r.json` | `0ba1de76ba7f25b4bccc86a7aa2199f16e9735fa693529153e990851eecd561a` |
| `probes/P0-probe-plain/probe-1793225171879-pgos5q.json` | `c05859839d514ac827e8518284a1f6f360da05d9622ca6847a43e86b5b9ceeb6` |
| `probes/P0P-probe-p1/probe-1793225189728-xl3uph.json` | `d896c55d1f8df739345941036b16d66114f3b82197c2e61c735eff4d3794f014` |
| `probes/P0P-probe-p1/probe-1793225189915-kq6718.json` | `381dd6b6990d698808180ac376fe909ac6f87899e54bd31619943cbc02b29038` |
| `rmut.json` | `becbeb5ac4922593af1a12ce033a24303d19364617bbb6eb790aad03ee3167d2` |
| `rmut2.json` | `b9be8e2d334038ac64bb48bf18ea7b482ad18273c90d83d2416242c8a1bfe0f4` |
| `rmut3.json` | `9157c795c55b9c15239ba7c799ebff6e69ac9da04f5a3a22f67722774dc36b2c` |
| `lane-mutants-absent.json` | `b4b57a3d76f4221465ad2ef9a937a91b7b9bfe82e8e90894ff8e5399b38d011e` |
| `lane-mutants.log` | `35cf12db8a92a71940261239b24d8a14e8c277b938c3b52661bf8914c33f92a7` |
| `lane-load.txt` | `5276d9dfe6145faf85e2b126b27f8918c447a50eb9a189e03b52b8c6cb0fa345` |
| `full-summary.json` | `59fd50fb3677d672c2a37a1e05c204ccb9aeb8611565a2264f62490a23dd4836` |
| `full-load.txt` | `5b79da512dfa2d35efe4e500e204e394b95373ddbdd25debd178af6d5f61010c` |

The ad-hoc targeted runs in §3.2, §3.3 and the merge run kept no file; their result lines are quoted above. `tools/rmut.py`
was edited between batches (rows R6, R7 and OLD-* and the `excludes`/`record` modes were added after `rmut.json` was taken).
The kept bytes are the final tool, which still holds every row of all three records unchanged.
