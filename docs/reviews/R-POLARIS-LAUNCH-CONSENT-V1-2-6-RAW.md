Review: R-POLARIS-LAUNCH-CONSENT-V1-2-6
Reviewed commit: 083ad8c5b42b7dd85efed6773d73bf7dfa076bad
Manifest SHA-256: 411aaca4d8041ca5c869d05f56380c5c9a12b3cec760df700fc6aaf99e66d410
Verdict: REVISE
Package: polaris-dossier-launch-consent

I reviewed with a fresh context and made no edits. I worked in a detached scratch worktree of the reviewed commit and applied `proposed/spec.md.patch` with `git apply`. Line numbers below refer to the post-apply spec unless a package file is named. I built scratch Git fixtures under the brief's TMPDIR with no network, using Git 2.53.0. Afterwards I deleted them and removed the worktree.

## What held

- [Observed] `sha256sum` digests match `PROPOSED-SUBJECTS.json`:
  - v1.1 spec: `95172020…`;
  - patch: `705fb41b…`;
  - post-apply spec: the digest in the head above.
- [Observed] The tooling holds on the clean tree:
  - `--check` passes for the v1.0, v1.1 and v1.2 builders (v1.2 reports "unapplied").
  - `--selftest` passes for the same builders: 25, 30 and 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest` passes: 175 fixtures, 0 failing.
- [Observed] The exact blocks in SEMANTIC-DELTA.md match the bytes, checked by script:
  - all 12 "Current" blocks are substrings of the v1.1 bytes, and Change 6's insertion anchor is present;
  - all 13 "Proposed" blocks are substrings of the post-apply bytes;
  - replacing each Current block with its Proposed block and inserting Change 6 rebuilds the post-apply spec byte for byte.
- [Observed] REQ-046's derivation sentence is byte-identical before and after.
  - A script reimplementation of the stated rule derives `repository:redis-redis`, `repository:psf-requests`, `repository:tzeusy-org-syzygy` and `repository:sub-tool` (for `git@git.example.org:team/sub/tool.git`).
- [Observed] The registry entry's `typedAuthority` holds 12 fields, and D9's table now covers all 12. The quoted `fetch`, `readAuthority` (elided), `stateDirectoryWrites` and `tags` text matches the JSON.
- [Observed] Round 5's findings are answered in the bytes:
  - Finding 1: the root sentence at line 35 is present; the falsifier arm reads "a file of the governance home or of the operator's clone is edited or removed"; "Records already in force" reads "writes no record"; "Write consent absent" excepts the copy.
  - Finding 2: the pre-answer list (line 9) no longer names a type read. Line 238 refuses a non-commit from the copy's checkout and `HEAD`. The scenario "Revision naming a blob" (line 353) is added, and the Case varies blob, tree and annotated tag.
  - Finding 3: line 246 names "the form check binding it", and the configuration limit yields to it. The arm at line 379 is scoped "for a launch-consented run".
  - Finding 4: the question says the copy is "removed if the run ends before its brief". The run record states how the copy was made, where it is, and that it is kept.
  - Finding 5: line 35 reads "every one of which is launch-consented". The delta's "One change" names one reach.
  - Findings 6, 7 and 8: D9 covers every field, REQ-046's Case varies whether the run makes a copy, and the owner page is reworded.
- [Observed] Scratch fixture for the `--revision` refusal. The environment was `env -i`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1`. Each case ran `git init --template=`, then `fetch --depth=1 --no-tags --no-recurse-submodules file://… <oid>`, then `checkout --detach <oid>`:

  | Named object | fetch | checkout | copy `HEAD` equals named id |
  |---|---|---|---|
  | commit | 0 | 0 | yes |
  | tree | 0 | 128 ("Cannot switch branch to a non-commit") | no (unborn) |
  | blob | 0 | 128 ("unable to read tree") | no (unborn) |
  | annotated tag → commit | 0 | 0 | no (the tag's commit) |
  | annotated tag → tree | 0 | 128 | no |
  | annotated tag → blob | 0 | 128 | no |
  | annotated tag → annotated tag | 0 | 0 | no (the innermost commit) |

  - [Inferred] Every non-commit kind is refused by line 238's two tests without Syzygy reading the object. Finding 1 covers the converse case.
- [Observed] D2's hooks fixture reproduces. The operator's clone set `uploadpack.packObjectsHook` and `core.fsmonitor` to a marker script and `core.hooksPath` to a directory of executable hooks. Executable hooks were also placed in `.git/hooks`. The copy succeeded and no marker was written.
  - Positive control: the same `packObjectsHook` set in a global configuration (`GIT_CONFIG_GLOBAL=<file>`) wrote the marker. The probe works.
- [Observed] `strace -f` of the copy step against a full clone shows `git-upload-pack` chdir into the operator's `.git` and then make no create, write, unlink or rename there. Every object write landed in the copy. Snapshots taken before and after (path, size, mtime, mode) were identical for a full and a shallow operator clone. This supports self-review row A47.13's "[Inferred: upload-pack writes nothing]" for these fixtures.
- [Observed] A copy made this way passes `clone-shape.ts`'s top-level allowlist (`config`, `FETCH_HEAD`, `HEAD`, `index`, `logs/HEAD`, `objects/`, `refs/`, `shallow`), and its `config` holds `[core]` keys alone.
- [Observed] A `blob:none` partial clone used as the operator's clone fails the copy at the fetch: exit 128, with "lazy fetching disabled" from the remote side. No checkout result arises.
- [Observed] A reftable clone has `HEAD` = `ref: refs/heads/.invalid` and `refs/heads` as a regular file. [Inferred] The listed reads ("the names of its references, and the values of `HEAD` and the reference it names") therefore suffice to detect it without honouring the configuration.

## Findings

**Finding 1 — A detached-checkout failure is declared to mean "not a commit", and a real commit can fail it** (revise)

- [Observed] Line 238: "where the copy's detached checkout fails, or leaves the copy's `HEAD` at an object other than the pinned identifier, the pinned object is not a commit, and Syzygy SHALL refuse, naming `--revision` where one was given and otherwise the reference the pin came from; this refusal takes the place of the form check's refusal below for the same copy."
- [Observed] Scratch fixture: a commit object (`git cat-file -t` → `commit`) whose root tree holds one entry named `.GIT`, written with `hash-object -t tree --literally`.
  - With the stated environment, the depth-1 fetch exits 0.
  - `checkout --detach <commit>` exits 1 with "error: invalid path '.GIT'", leaving `HEAD` unborn.
- [Inferred] Other checkout failures fall in the same class: a path component too long for the filesystem, or a full disk.
- [Inferred] Under line 238, a conforming implementation must treat such a commit as "not a commit" and refuse naming `--revision`. For a trunk-default pin, it names the trunk reference, which tells the operator that `refs/remotes/origin/HEAD`'s target is not a commit.
  - The refusal itself is right, since it fails closed. The reason it states is false. The spec asserts as fact an inference the fixture falsifies, contrary to VIS-2's bar.
  - No falsifier arm catches it. Line 379's "a non-commit `--revision` is followed, pinned or used, or is told from a commit by Syzygy reading the object itself" is not tripped by a commit refused as a non-commit.
- [Observed] The second test is sound. After a successful `checkout --detach <oid>`, `HEAD` differs from `<oid>` only when Git peeled a tag. In the fixture that happened for every annotated-tag case and no other.
- Repair I would accept:
  - Split the two tests. Where `HEAD` lands at another object after a successful checkout, the pinned object is not a commit; refuse naming `--revision` or the reference.
  - Where the checkout fails, refuse naming the checkout failure and the pinned identifier, and say the object is not a commit or could not be checked out, without asserting which. That refusal still takes the place of the form check's.
  - Add a scenario: a commit whose checkout fails is refused naming the checkout failure, not as a non-commit.

**Finding 2 — The launch output's committer-date statement cannot be met by a copy run refused before its copy holds the commit** (revise)

- [Observed] Line 240, carried from v1.1 with only "did not fetch" reworded: "The launch output and the run record SHALL state the pinned revision in full, the reference it came from, the commit's committer date as the commit object records it, and that Syzygy made no network request".
  - It is unconditional. Line 379's arm matches it: "the launch output or run record lacks the full revision, its reference, the committer date, the no-network statement or the update command".
- [Observed] For a copy run, line 246's list lets Syzygy read the operator's clone only as references, configuration text, the existence of the alternates file, and abbreviation names. Object reads are listed only "for a run that makes no copy". REQ-046 (line 9) places the pinned commit object read "in the run's clone, which is the copy where REQ-polaris-generation-047 makes one".
- [Observed] Version 1.2 adds copy-run refusals made after the pin and before any copy holds the commit:
  - an alternates file (line 251; scenario at line 338, "before any Git process starts");
  - the reftable refusal (line 249);
  - a failed copy (line 254; scenario at line 333).
- [Inferred] In each case the trunk tip is already pinned from reference file data (line 238 pins "at launch, before the question"). The only source of the committer date is then the operator's clone's commit object, which line 246 forbids Syzygy to read in a copy run.
  - A conforming implementation therefore either omits the date, tripping the line 379 arm, or reads an unlisted object, tripping "for a launch-consented run, Syzygy itself, in process, reads of the operator's clone anything this requirement does not list".
  - In v1.1 the pinned commit object was a permitted pre-answer read of the operator's clone, so the date was always readable once pinned. The conflict is new to the redesign: round 4 finding 1's class, an absolute a conforming run breaks, reopened here for a statement.
- [Observed] Self-review rows A47.12 ("a refusal has no run record") and F47.6 ("a refusal has none") assume a scope the text does not state, and say nothing about the launch output of a refused run.
- Repair I would accept, either of these:
  - Scope line 240's committer date (or the whole statement) to runs whose clone holds the pinned commit, and say that a run refused before then states the revision and reference only. Scope the arm the same way.
  - Or state that the launch output of a run refused before its question states only what it has read.

**Finding 3 — The self-review table's copy-independence labels and per-run columns are not what its method says** (note, editorial)

- [Observed] ROUND-5-DISPOSITIONS.md says each item "was read and checked against three conforming runs" and that rows marked independent "read and write nothing that the copy changes".
- [Observed] Six rows describe a refusal that ends a copy run before its brief, so the copy is removed (A47.24). Yet they are marked "holds; independent of the copy":
  - A46.11 (line 196, no terminal or phrase);
  - A46.25 (line 210, several identities);
  - A46.32 (line 217, URL not admitted);
  - S46.12 (statement declined);
  - S46.35 and S46.37 (URL refusals before asking).
- [Observed] Their siblings for the same events say otherwise: A46.55 (line 240) reads "run ends before its brief, so A47.24 removes it", and S46.26 (line 295) reads "refuses before asking; copy removed". [Inferred] The verdict "holds" is still right, because A47.24 covers removal. The labels are wrong, and inconsistent across rows.
- [Observed] Rows F47.1 to F47.19 (lines 410–428) repeat one identical text in all three run columns. For example, F47.13's "copy run" column reads "v1.1-scoped consent: no copy, one-commit form". These are not per-run judgments.
- [Observed] I re-judged 45 rows: A46.2, 3, 5, 7, 11, 13, 25, 32, 33, 35, 41, 55, 59, 60, 67, 70, 72, 75, 77, 79, 80; S46.3, 11, 12, 26, 35, 37, 42; F46.11, 12, 18, 29; A47.9, 12, 13, 20, 24, 30; S47.18, 20, 21, 22; F47.6, 7, 15.
  - I disagree substantively with A47.9, S47.22 and F47.15 (Finding 1), and with A47.12 and F47.6 (Finding 2).
  - I disagree on labels only with the six rows above.
  - I agree with the rest.
- Repair: relabel the six rows, and state per-run judgments for the F47 rows or say they are run-independent.

**Finding 4 — Earlier concerns: rounds 1 to 5 are answered, except where Findings 1 and 2 reopen a class** (note)

- [Observed] Round 5's nine findings are answered in the bytes, as "What held" lists.
- [Inferred] Round 5 finding 2's repair removed the blob read, and Finding 1 here is a new honesty gap in that repair's own mechanism. Round 4 finding 1's class (an absolute a conforming run breaks) reappears for a statement and a read (Finding 2).
- [Observed] The URL half shows no surviving round 1 or 2 concern:
  - the derivation sentence is unchanged;
  - credentials and non-locators are refused and never printed;
  - the `Upstream:` match stays additive and is bounded by the two-host scenario.
