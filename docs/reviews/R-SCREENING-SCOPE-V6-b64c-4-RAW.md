# Review — public-source screening scope, version 6, round 4
Reviewed commit: b64c6769fd2fa928ae946dc27cdb729267f153fb
Manifest SHA-256: 76b2b6b0ac9eb185d8816e6014f86bc8a66c13501a8727a83fa6f8b8c1a18986
Verdict: CONFIRM WITH EXCEPTIONS

**Scope.** This is a narrow CC-REV-1 round 4, run in fresh context on the owner's direction past the three-round stopping rule. `git rev-parse HEAD` printed the reviewed commit, and the worktree was clean. I read these files:

- `ROUND-4-REVIEW-BRIEF.md`
- the round-3 raw
- `ROUND-3-DISPOSITIONS.md`
- the package files the criteria name
- the proposed patch
- the cited test line

I also compared bytes against `d942888a`. I did not read, clone or fetch any target repository. I opened no `site/` or clone directory, did not run `redis_screening_v6_measure.py`, printed no fixture text, ran no recorder, and edited nothing in the repository. Scratch work is in the session scratchpad.

## Findings

**Finding 1 — The cost of the directive arm on ordinary text is stated only in the dispositions, not in the packet the owner reads** (note, for the owner)

[Observed] `ROUND-3-DISPOSITIONS.md` says round-3 note 3 is "Carried as a named cost, to the owner with this package". The cost it describes is this: a Markdown heading or a code comment that opens with one of the four directive words is withheld. The dispositions also correct the trigger of the ACL arm: it fires on "a blank or a quote", or on `#`/`!` followed by 64 hex digits.

`OWNER-DECISION-PACKET.md` is byte-identical to round 3 (blob `8f8aa36f`). Its ordinary-text bullet (lines 85-87) still names only the ACL part ("Ordinary text can trip the ACL part"). The packet has no route to `ROUND-3-DISPOSITIONS.md`: `grep -nF DISPOSITION` finds no match in it.

Nothing in the packet is false: it does not say that the ACL part is the only cost. The disposition is literally true, because the dispositions file sits inside the package. But an owner who reads only the packet will not see that headings such as `## Requirepass and ACLs` are blanked, or that code files with a `# masterauth …` comment are withheld whole. The dispositions also leave out round 3's smaller observation (a first line led by a BOM is not matched); round 3 inferred this is harmless.

Before the act, the lead could point the owner at the round-3 dispositions' note 3 alongside the packet. No reviewed file needs to change.

**Finding 2 — I could not verify the install bead that note 2 is carried to** (note, not resolved)

[Observed] The disposition carries note 2 to `syzygy-n5jm`. Its content is accurate:

- `packages/polaris-generation-core/src/public-source-classification.test.ts:41` asserts `ownerPlacements` with `paths: ['tls.md', 'modules/modules.md']`.
- [Inferred] That assertion fails once the act adds `redis.conf`.

[Unknown] Whether `syzygy-n5jm` exists and records this item. In this worktree:

- `bd show syzygy-n5jm` reports "Issue syzygy-n5jm not found".
- `bd list --all --json` returns 0 issues, so the tracker is not reachable from here. This is not evidence that the bead is absent.
- The id appears in no commit message on any ref.
- In tracked files, the id appears only in `ROUND-3-DISPOSITIONS.md:37` and `ROUND-4-REVIEW-BRIEF.md:42`.

The lead should confirm from the main checkout that the bead names the test file and line before the install starts.

**Finding 3 — "Every other file the review read is byte-identical" holds for the package and scripts, not for every file round 3 read** (note, editorial)

[Observed] This is true for every package file, the patch, the builder, the measurement and census scripts, `check_governance.py`, the policy directory, `packages/polaris-generation-core/`, the trial evidence JSON and the contracts tree. Each has an equal blob, or no diff, between `d942888a` and HEAD.

It is not true of everything round 3 read. Round 3 cited `.github/workflows/governance-docs.yml:56`, and the rebase onto `main` changed that file by 88 lines (it was split into jobs and lost its push trigger). The `check_governance` step it cited is now at line 64 and still runs. The change came from `main`, not from a repair, and does not affect anything round 3 concluded, so the sentence is overbroad but not misleading.

## Narrow criteria, checked

**1 — Note 1, the re-wrap.**

- [Observed] `git diff d942888a HEAD` on `SEMANTIC-DELTA.md` shows one hunk. Display line 55 is split between `[#!]` and `(?=`, and the new line is indented to match.
- A scratch script compared the two versions with Python `re` and found them equal once `\s+` is removed (20,054 bytes against 20,066). A byte-level `SequenceMatcher` reports exactly one opcode: an insert of `'\n           '`.
- With each display line stripped and joined, the pattern equals the JSON-decoded `"pattern"` value in `proposed/…p.patch` exactly.
- No line of the display contains `](`.
- `python3 scripts/check_governance.py` prints "32 OK, 21 WARN, 0 FAIL (53 checks)" with rc 0. CG-1a reports "744 links examined, 0 findings".
- The block still says "(one line in the bytes; wrapped here)".

**2 — Notes 2 to 4, the dispositions.**

- Note 2: the content is accurate. The test line was confirmed at line 41. The bead could not be verified (Finding 2).
- Note 3: the stated cost and the corrected ACL trigger match what round 3 observed. The claim that nothing leaks and more is withheld agrees with round 3. The packet is unchanged, and the owner-facing gap is Finding 1.
- Note 4: accurate. The clause changed "keeps" to "withholds". Its list of uncaught shapes now has seven items; I counted them in the patch's consequence string: named mid-line, a prose comment, a rename-command target, a module's own option, an unnamed directive, a following line, and an escape or inner quote. The value class `[^ \t\v\f\r\n]+` excludes vertical tab and form feed.
- None of the dispositions changes a reviewed file.
- The dispositions openly say that the recorder cannot bind round 3, and why. No disposition is false. Finding 3 is the one overbroad sentence.

**3 — Nothing else changed.**

- [Observed] I compared blobs (`git ls-tree -r`) at `d942888a` and at HEAD, over the package directory, the builder, `redis_screening_v6_measure.py`, `dossier_run_citation_census.py` and `check_governance.py`. Every blob is identical except:
  - `SEMANTIC-DELTA.md` (`f2c2238d` → `62a20f53`);
  - two new files, `ROUND-3-DISPOSITIONS.md` and `ROUND-4-REVIEW-BRIEF.md`.
- Across the repository, the other changes in scope are:
  - the round-3 raw;
  - the campaign entry `docs/review-campaigns/mcs4-screening-scope-v6.md`, which adds a two-line round-3 paragraph;
  - the recorder, which is out of scope.
- The remaining diff comes from `main` (workflows, polaris-dossier, other campaigns and evidence) and touches no in-scope file.

**4 — Still sound.**

- [Observed] `--check` prints "patch and manifest current", rc 0.
- `--selftest` prints "49 of 49 predicates held", rc 0.
- `--manifest-digest` prints `76b2b6b0…`, which equals `sha256sum` of the manifest file and the digest round 3 recorded.
- The manifest blob (`25c82355`) is unchanged, so its one row (`c44058c0…`) is unchanged.
- `check_docs_review_campaign_partition.py --check`: PASS, denominator 749, unmatched 0.

## Commands run

- `git rev-parse HEAD`
- `git status --short`
- `git cat-file -t d942888a`
- `git diff --stat d942888a HEAD`
- `git diff --stat d942888a HEAD -- <package dir>`
- `git diff d942888a HEAD -- SEMANTIC-DELTA.md <builder> <measure> <census> scripts/check_governance.py docs/review-campaigns/mcs4-screening-scope-v6.md`
- `git diff --stat d942888a HEAD -- .syzygy/governance/policies packages/polaris-generation-core docs/evidence/redis-trial-metadata-2026-11-03.json .syzygy/governance/contracts <v5 builder> scripts/install_redis_sitting.py scripts/build_pwb_behavior_contract_repin.py`
- `git diff d942888a HEAD -- .github/workflows/governance-docs.yml`
- `git ls-tree -r d942888a -- …` and `git ls-tree -r HEAD -- …`, over the in-scope paths
- `git show d942888a:…/SEMANTIC-DELTA.md`, written to scratch
- `python3 -I <scratch>/cmp.py`: equality with whitespace removed, the byte opcodes, the joined display against the patch's JSON pattern, and a `](` scan
- `python3 scripts/build_public_source_screening_scope_v6.py --manifest-digest`, `--check` and `--selftest`
- `sha256sum` of the manifest file
- `python3 scripts/check_governance.py`, written to scratch and grepped for `CG-1a` and `screening-scope-v6`
- `python3 scripts/check_docs_review_campaign_partition.py --check`
- `sed -n 35,45p packages/polaris-generation-core/src/public-source-classification.test.ts`
- `grep -nF` on `OWNER-DECISION-PACKET.md`, for `DISPOSITION`, `ACL part` and `Ordinary text`
- `bd show syzygy-n5jm`
- `bd list --all --json`
- `git log --all --oneline --grep=n5jm`
- `git grep -nF n5jm HEAD`
