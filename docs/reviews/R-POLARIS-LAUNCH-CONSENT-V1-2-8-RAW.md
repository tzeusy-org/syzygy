Review: R-POLARIS-LAUNCH-CONSENT-V1-2-8
Reviewed commit: f242299f63aacdf94a9e910486f0ff42964cf735
Manifest SHA-256: 9de3476f68fb69d605e45cd3bb42e07aee25f8d70d597745070b6bfdb2f6e56a
Verdict: REVISE
Package: polaris-dossier-launch-consent

I started with a fresh context and edited nothing. I checked out the reviewed commit in a detached scratch worktree. I extracted `openspec/changes/polaris-dossier-launch-consent/` into a scratch repository under the brief's TMPDIR and applied `proposed/spec.md.patch` there with `git apply`. I built scratch Git fixtures with Git 2.53.0 and no network. Afterwards I deleted the worktree and the scratch directory. Unless a package file is named, line numbers refer to the post-apply spec, which has 397 lines.

## What held

- [Observed] `sha256sum` gives the values in `PROPOSED-SUBJECTS.json`:
  - v1.1 spec: `95172020…`.
  - Patch: `bb49aea4…`.
  - Post-apply spec: the digest in the head above.
- [Observed] Tooling at the reviewed commit:
  - `--check`:
    - the v1.0 builder reports "the package verifies (applied)";
    - the v1.1 builder reports "the v1.1 package verifies (applied)";
    - the v1.2 builder reports "the v1.2 package verifies (unapplied)".
  - `--selftest`: 25, 30 and 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
- [Observed] I checked the exact blocks in SEMANTIC-DELTA.md by script:
  - each of the 12 replace "Current" blocks occurs exactly once in the v1.1 bytes;
  - each of the 12 "Proposed" blocks occurs exactly once in the post-apply bytes;
  - doing the replacements in order and inserting Change 6 after its named paragraph reproduces the post-apply spec byte for byte, at exactly one insertion point.
- [Observed] REQ-046's derivation sentence ("The derived identity is taken from … replaced by `-`.", 638 characters) is byte-identical in v1.1 and the post-apply spec.
  - A script reimplementation derives `repository:redis-redis` from both GitHub forms, `repository:psf-requests` and `repository:tzeusy-org-syzygy`.
  - It also derives `repository:sub-tool` (line 129), `repository:a-b` for the `git://` and `http://` forms (line 151), and `repository:c-d` for both forms at line 145.
- [Observed] Copy-step fixture. I ran each step under `env -i` with `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file`, `GIT_NO_LAZY_FETCH=1` and `core.hooksPath=/dev/null`: `init --template=`, then `fetch --depth=1 --no-tags --no-recurse-submodules file://…`, then `checkout --detach`. The source clone set `uploadpack.packObjectsHook` and `core.fsmonitor` to `touch` commands and held executable hooks.

  | Named object | fetch | checkout | copy `HEAD` = named id |
  |---|---|---|---|
  | commit | 0 | 0 | yes |
  | annotated tag | 0 | 0 | no |
  | blob | 0 | 128 ("unable to read tree") | no |
  | tree | 0 | 128 ("Cannot switch branch to a non-commit") | no |

  - No configured command and no hook ran.
  - [Inferred] Each row is handled truthfully by line 238 together with line 254. This reproduces the round-7 table and supports the scenarios at lines 348, 353, 358 and 363.
- [Observed] Round 7 finding 1 is repaired at the root.
  - Line 242 defines "copy-class run", "no-copy run" and the copy step's start. It adds "A copy-class run refused before its copy step starts has no copy … such a run states only that no copy was made".
  - Line 37 is scoped to "a copy-class run whose copy step started". It adds "for a copy-class run refused before its copy step started, that no copy was made, and no other copy statement".
  - The REQ-046 arm (line 223), the REQ-047 arm (line 386), line 244 and the alternates scenario (line 343) carry the same split.
  - `makes a copy`, `made a copy`, `makes no copy` and `run with a copy` occur 0 times in the post-apply spec, by `re.findall` and by `grep -c`.
- [Observed] Round 7 finding 2 is repaired.
  - Line 240: "Which of the two a refused run states turns on that read alone, never on the refusal".
  - Unknown is fixed only for runs that cannot have read the date: a copy-class run refused before its copy step (line 9 gives it no run's clone yet) and a non-commit.
- [Observed] Round 7 finding 3 is repaired. Line 238 names "the pinned identifier, `--revision` where one was given, and the checkout's failure", and line 358 names "the identifier, `--revision` and the checkout's failure". The disposition corrects the stage to Q.
- [Observed] Occurrence list. Over lines 7–398, `\bcop(y|ies|ied)\b` (case-folded) gives 156 matches.
  - The disposition's 156 rows carry exactly the same line numbers in the same order (list equality by script).
  - "copy-class run" occurs 28 times, plus the rule and the definition = 30 as tabulated. "no-copy run" occurs 10 times.
  - I read every line holding a match: lines 9, 11, 21, 35, 37, 187, 219, 222, 223, 238, 240, 242, 244, 246, 251, 254 and every scenario line the table names.
  - Each labelled match uses its term where its definition applies, with one exception the regex cannot see (Finding 1).
- [Observed] I read the whole post-apply REQ-046 and REQ-047 (lines 7–397). The pre-answer list (line 9), REQ-047's list (lines 246–252), both falsifiers and the full-clone scenario (line 305) name the same reads of the operator's clone.
- Stage sweep. The round-7 table has 14 data rows (counted by script), so I re-judged all 14, plus the six stage definitions: 20 items.
  - I agree with the six stage definitions.
  - I agree with 12 rows outright.
  - Two rows each have one cell that does not hold (Finding 3).

## Findings

**Finding 1 — One REQ-047 falsifier arm still states the class rule without the defined terms, and read literally it trips conforming refused runs** (revise)

- [Observed] Line 386, REQ-047's falsifier: "a run that an observation consent made by another act covers is a copy-class run or starts a copy step, or a run that neither such a consent nor a launch observation consent recorded with the operator's-own-clone scope covers runs without one".
- [Observed] Line 242 makes the class a launch-time fact: "which class a run is in is decided at launch … before any Git process starts". It also says "a copy exists only in a copy-class run whose copy step has started".
- [Inferred] Two conforming runs are covered by neither consent and have no copy, so a literal oracle trips on each:
  - a copy-class run refused for an alternates file before any Git process starts (the scenario at lines 340–343, stage C0);
  - a run refused before any revision is pinned (stage U), which is not classed at all.
  - In each case the run "runs without one".
  - This is round 7 finding 1's class, an arm a conforming refused run cannot meet, surviving in the one place that does not use the new terms.
- [Observed] The arm has carried this wording since `e004db00`. The round-7 occurrence table cannot see it, because "one" is not matched by `\bcop(y|ies|ied)\b`; its row 140 labels only the following "the copy is made". The disposition's claim that "every sentence, arm and scenario now uses one of them" therefore does not hold for this arm.
- Repair I would accept: replace "runs without one" with "is a no-copy run", mirroring the sibling arm a few clauses later ("is a copy-class run or starts a copy step"). Then re-run the occurrence sweep with a pronoun pass ("one", "it") over the falsifiers.

**Finding 2 — Line 244's launch-output copy statements have no falsifier arm** (note)

- [Observed] Line 244 requires three launch-output statements:
  - for a run that ends before its brief, "the launch output SHALL say so" (that the copy was removed);
  - "where the copy step never started, SHALL say that no copy was made";
  - for a completed run, "the launch output SHALL name its location and say so" (that it is kept).
- [Observed] REQ-047's arms (line 386) cover location and the act of removal, but not these statements:
  - "a completed run's copy is removed without the operator, or its location is not named";
  - "a copy whose copy step started is not removed when the run ends before its brief";
  - "a copy-class run refused before its copy step started states anything of a copy but that no copy was made".
  - REQ-046's arm (line 223) covers only "the question, the run record or a page".
  - No arm trips when the launch output omits "removed", "no copy was made" or "kept".
- [Inferred] The alternates scenario (line 343) checks the C0 launch output. "the copy statements are missing" may be meant to reach the others, but no clause defines that population.
- Repair: add an arm such as "the launch output omits that the copy was removed, kept, or, where the copy step never started, that no copy was made". Alternatively, define "the copy statements" to include line 244's.

**Finding 3 — Two stage-sweep cells claim more than the spec fixes, and one line-240 sentence is wider than the sweep reads it** (note, editorial)

- [Observed] In ROUND-7-DISPOSITIONS.md, the "Committer date" row's P cell reads "other refusals: read".
  - Several identities, a URL not admitted, the governance home and the write consent absent are refusals that nothing orders after a read of the commit object. Several can be decided before any Git process starts.
  - Line 240 says the date is stated "where Syzygy has read that object", and otherwise Unknown.
  - The disposition says the sweep uses "Unknown unless read" wherever a read was permitted. That cell does not.
- [Observed] The Q column groups "no terminal" with refusals after the question. Line 11 refuses "when standard input is not a terminal", so for that run no question is shown. The row "Copy statements in the question" then over-claims "stated before the answer" for it.
- [Observed] Line 240 ends: "A run refused before any revision is pinned states the refusal alone."
  - The sweep's U cells instead give the remote-user-information and local-branch statements "where read".
  - Line 17 ("Where a remote URL carried user information, the launch output SHALL say so") is conditioned on the URL, not on a read.
  - [Inferred] The sweep reads line 240 as "of this paragraph's statements, only the refusal". The literal text is an absolute that conflicts with line 17 for a U refusal on a clone whose remote carries user information.
- Repair:
  - make the P cell "Unknown unless read";
  - split "no terminal" out of the question row;
  - scope line 240's last sentence, for example "states, of these statements, only the refusal".

**Finding 4 — SEMANTIC-DELTA.md still uses the retired run terms** (note, editorial)

- [Observed] SEMANTIC-DELTA.md line 529: "The copy removes that residual for every run that makes one".
- [Observed] Lines 533–534, D5: "every brief and packet Syzygy issues to an agent session of a run with a copy". The spec's line 254 now says "of a copy-class run".
- [Inferred] The delta is explanation, not the subject, so no rule changes. Still, it re-uses the phrasing round 7 finding 1 retired.
- Repair: use "copy-class run", or "a copy-class run whose copy step started", in D4 and D5.

**Finding 5 — Earlier concerns: rounds 1 to 7 answered, except Finding 1's survival of round 7 finding 1's class** (note)

- [Observed] Round 7's four findings are answered in the bytes, as "What held" sets out.
- [Observed] The URL half shows no surviving concern:
  - the derivation is byte-identical;
  - credentials and non-locator URLs are refused or never printed (lines 17, 156, 161 and 171);
  - the `Upstream:` match stays additive and is bounded by line 141.
- [Inferred] The one surviving class is Finding 1: an arm that does not use the defined terms and trips conforming refused runs. Its repair is a one-phrase edit.
