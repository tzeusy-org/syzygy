Review: R-POLARIS-LAUNCH-CONSENT-V1-2-7
Reviewed commit: 33309d1196ad46ff859720432f3538836c0900b1
Manifest SHA-256: 23a3a06331a9c235842d50b781b692f2a532da3d68c3fb5d913b1ba02c8493cd
Verdict: REVISE
Package: polaris-dossier-launch-consent

I started with a fresh context and edited nothing. I checked out the reviewed commit in a detached scratch worktree and applied `proposed/spec.md.patch` with `git apply`. I built scratch Git fixtures under the brief's TMPDIR with no network, using Git 2.53.0. Afterwards I deleted the fixtures and removed the worktree. Unless a package file is named, line numbers refer to the post-apply spec.

## What held

- [Observed] `sha256sum` gives the values in `PROPOSED-SUBJECTS.json`:
  - v1.1 spec: `95172020…`.
  - Patch: `71b2c8e6…`.
  - Post-apply spec: the digest in the head above.
- [Observed] On the clean tree, the tooling passes:
  - `--check`:
    - the v1.0 builder reports "the package verifies (applied)";
    - the v1.1 builder reports "applied";
    - the v1.2 builder reports "unapplied".
  - `--selftest` for those builders: 25, 30 and 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
  - With the patch applied, the v1.2 `--check` fails as expected: "the tree carries the v1.2 patch, which no sign-off record covers".
- [Observed] I checked the SEMANTIC-DELTA.md exact blocks by script:
  - all 12 "Current" blocks occur once each in the v1.1 bytes;
  - all 13 "Proposed" blocks occur in the post-apply bytes;
  - doing the replacements in order and inserting Change 6 after its named anchor gives the post-apply spec byte for byte.
- [Observed] REQ-046's derivation sentence ("The derived identity is taken from … replaced by `-`.") is byte-identical in v1.1 and the post-apply spec.
  - A script reimplementation derives `repository:redis-redis` from both GitHub forms, `repository:psf-requests` and `repository:tzeusy-org-syzygy`.
  - It derives `repository:sub-tool` for `git@git.example.org:team/sub/tool.git`, and `repository:a-b` for the `git://` and `http://` forms of line 150.
- [Observed] Quotation sweep. I took every double-quoted span of 20 to 300 characters outside the exact blocks in SEMANTIC-DELTA.md, IMPACT-LEDGER.md, OWNER-SIGNOFF.md and ROUND-6-DISPOSITIONS.md: 63 spans.
  - The corpus was the governing records, the specs, the registry entry, the raws and the decisions, whitespace-normalised, with `…` treated as a split.
  - 60 matched.
  - The other 3 are exact elsewhere:
    - the screening policy's `networkEgressRoutes` string, in `POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json:401`;
    - the code refusal text, in `packages/polaris-dossier/src/github-url.ts:24`;
    - the option label itself.
- [Observed] The rule-9 sweep reproduces at `715c59c4`:
  - 1,565 tracked files under `.syzygy/` and `openspec/`, 0 carrying a `github:<owner>:<repo>` identity;
  - 9 installed spec files under `openspec/changes/*/specs/`, 1 hit file (the launch-consent spec), as the table states.
- [Observed] Round 6 finding 1 is repaired in the bytes:
  - Line 238 now separates the two cases. "Where the copy's detached checkout succeeds and leaves the copy's `HEAD` at an object other than the pinned identifier, the pinned object is not a commit". A failed checkout is refused "stating that the object was not shown to be a commit … and the refusal SHALL NOT say which".
  - The scenario at line 359 and the falsifier arm "a run whose checkout failed is refused as not a commit, or as a commit" (line 385) are added.
  - Line 254 adds "a refusal SHALL NOT state a cause, a missing object or a non-commit among them, that Syzygy has not observed".
- [Observed] My scratch fixture for the failed-checkout case used `env -i` with `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file` and `GIT_NO_LAZY_FETCH=1`. Each case ran `init --template=`, then `fetch --depth=1 --no-tags --no-recurse-submodules file://… <oid>`, then `checkout --detach <oid>`:

  | Named object (`cat-file -t`) | fetch | checkout | copy `HEAD` = named id |
  |---|---|---|---|
  | commit whose root tree holds `.GIT` | 0 | 1 ("error: invalid path '.GIT'") | no (unborn) |
  | ordinary commit | 0 | 0 | yes |
  | annotated tag → commit | 0 | 0 | no (the tag's commit) |
  | blob | 0 | 128 ("unable to read tree") | no (unborn) |
  | tree | 0 | 128 ("Cannot switch branch to a non-commit") | no (unborn) |
  | identifier the clone does not hold | 128 ("not our ref") | 128 | no |

  - [Inferred] Each row is handled truthfully by line 238 together with line 254's "Every failure of a Git process for the copy SHALL be refused, naming that process and its failure as Git reported it".
  - The `.GIT` commit is refused as "not shown to be a commit", never as a non-commit.
- [Observed] Round 6 finding 2 is repaired in the bytes:
  - Line 240 scopes the statements: "Once a revision is pinned". The date is stated "where Syzygy has read that object as REQ-polaris-generation-046 permits, and otherwise SHALL state that the date is Unknown, never a guess".
  - It adds "A run refused before any revision is pinned states the refusal alone".
  - The arm at line 385 is scoped the same way, and also trips on "a committer date Syzygy has not read".
  - The alternates scenario (line 342) adds the Unknown date.
- [Observed] Round 6 finding 3 is answered.
  - The eleven rows named in the disposition now carry per-run text: A46.11, A46.25, A46.32, A46.63, A46.70, S46.4, S46.11, S46.12, S46.35, S46.37 and F46.14.
  - F47.1 to F47.20 now differ per column.
- [Observed] I read the whole post-apply REQ-046 and REQ-047 (lines 7–396). The pre-answer list (line 9), REQ-047's list (lines 246–252), both falsifiers and the full-clone scenario (line 305) name the same reads of the operator's clone.
- Stage sweep: I re-judged all 15 rows.
  - I agree with 12.
  - "Committer date" and "Run record copy disclosures" are wrong at stage B (Findings 2 and 1).
  - At P, "Committer date" is right ("unless read"), but line 240 does not say the same (Finding 2).
- Refusal sweep: I re-judged all 22 rows.
  - I agree with 21 on what each refusal names and whether it is truthful.
  - The stage given for "Not declared public" is wrong (Finding 3).
- Self-review: I re-judged A47.8 to A47.15, A47.27, A47.36, S47.20, S47.23, S47.24, F47.6, F47.11, F47.15, F47.16 and F47.19.
  - I agree with all of them except F47.19's refusal column, which carries Finding 1's gap.

## Findings

**Finding 1 — A copy-class run refused before any Git process starts must still disclose "how the copy was made" in its run record** (revise)

- [Observed] Line 37 requires the run record to disclose "for a run that makes a copy, whether or not a question was asked, how the copy was made and what Git and Syzygy read of the operator's clone to make it, that the agent sessions were directed to work in the copy, the copy's location, and whether the copy was kept, until the operator removes it, or removed".
  - Version 1.1's sentence (v1.1 line 33) had no copy clause.
  - The "or removed" alternative brings runs that end before their brief into this sentence.
- [Observed] The spec uses "a run that makes a copy" for the launch-time class, including a run that never makes its copy:
  - line 251: "where the run makes a copy, a clone where it does SHALL be refused before any Git process starts";
  - the scenario at line 340: "in a run that makes a copy", refused "before any Git process starts".
- [Observed] Line 240 requires a run-record statement for exactly that run: "the launch output and the run record SHALL state …", where "a run refused before its clone shows the pinned commit, by … an alternates file … is such a run".
- [Observed] REQ-046's falsifier (line 223) trips when "for a run that makes a copy, the question, the run record or a page omits a copy statement".
- [Inferred] For an alternates-refused run, a conforming implementation must write the run record that line 240 requires. That record cannot truthfully state how a copy was made, what Git read to make it, or the copy's location, because no Git process ran and no copy exists.
  - If it omits those statements, the arm trips. If it states them, it asserts something unobserved, contrary to VIS-2.
  - This is round 6 finding 2's class (a statement a conforming refused run cannot make), reopened for the run record.
- [Observed] The stage sweep's row "Run record copy disclosures (A46.84)" gives stage B as "no copy", and F47.19 says "a refused run asks no question; its record says the copy was removed". Both read "makes" as "made", which the text does not fix.
- Repair I would accept, either of these:
  - Scope line 37's copy clause, and the matching REQ-046 arm, to a run in which Syzygy started the copy step. Say that a run of that class refused before any Git process starts states only that no copy was made.
  - Or name, in line 37, the alternates refusal as stating that no copy was made, and correct the stage-sweep row.

**Finding 2 — Line 240 lists a departing copy among the runs whose date is Unknown, though the date may already have been read** (note, editorial)

- [Observed] Line 240: "a run refused before its clone shows the pinned commit, by a failed or departing copy, an alternates file or a non-commit, is such a run" (that is, one stating Unknown).
- [Observed] REQ-046 (line 9) permits the pinned commit object read "in the run's clone, which is the copy where REQ-polaris-generation-047 makes one". Line 254 makes the copy that clone "From the copy on". Nothing orders that read after the form check.
  - [Inferred] So a departing copy, which can hold the pinned commit, may have had its date read lawfully. Line 240 then both requires the read date and classes the run as one that states Unknown.
- [Observed] The stage sweep's P cell says "Unknown for a non-commit or departing copy, unless read". That disagrees with the spec's wording.
- [Observed] The stage sweep's B cell, "Unknown", also covers "a full clone under a v1.1-scoped consent". That is a no-copy run, where line 246 permits "the object reads REQ-polaris-generation-033 and REQ-polaris-generation-046 state". Its date may also have been read.
- [Inferred] No conforming run is forced into a false statement, because the falsifier accepts "a read date" or Unknown. The defect is wording.
- Repair: drop "departing copy" from line 240's list, or reword it as "such as, where Syzygy has not read it, …". Make the stage sweep's B and P cells "Unknown unless read".

**Finding 3 — The refusal sweep puts "Not declared public" at the wrong stage, and two refusals for a non-commit name different things** (note, editorial)

- [Observed] Line 11 has the declaration "asked for in the question". The scenario at line 87 is "the operator declines to declare". The refusal therefore comes after the question (stage Q), not at P as the refusal sweep's row "Not declared public, no policy (A46.70)" gives it.
  - [Inferred] No statement changes: the copy is removed either way, and the date has been read by then.
- [Observed] Line 238 says "Where `--revision` names an object that is not a commit … Syzygy SHALL refuse, naming `--revision`". The failed-checkout refusal names "the pinned identifier and the checkout's failure". The blob scenario (line 357) names "the identifier".
  - [Inferred] One refusal can name both, so nothing conflicts. A reader of line 357 alone would not learn that a blob `--revision` must also name `--revision`.
- Repair: give that row stage Q, and add "naming `--revision` where one was given" to the failed-checkout sentence or to the blob scenario.

**Finding 4 — Earlier concerns: rounds 1 to 6 answered, except Finding 1's reopening of round 6 finding 2's class** (note)

- [Observed] Round 6's four findings are answered in the bytes, as "What held" sets out.
- [Observed] The URL half shows no surviving concern from rounds 1 or 2:
  - the derivation sentence is unchanged;
  - credentials and non-locator URLs are refused or never printed (lines 17, 155 and 171);
  - the `Upstream:` match stays additive and is bounded by the two-host scenario (line 141).
- [Inferred] The only reopened class is Finding 1: an absolute that a conforming refused run cannot meet truthfully, now in the run record's copy disclosures.
