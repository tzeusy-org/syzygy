Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-2
Reviewed commit: 5236223d295022fa96f1fe1432d69da75f608796
Manifest SHA-256: 58434ada159cd82256f9e6b84c1b0c47c32a840643d41572ba1e861d60bf8bc0
Verdict: REVISE

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

Subject: `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`. I computed its digest above with `sha256sum` at the reviewed commit.

Governing text: PR #812 at `de9c1ba89746f380007446a26a03e2a96d9e4d80`.
- [Observed] `origin/agent/syzygy-pdja-clone-and-url-scope` resolves to `de9c1ba8`.
- [Observed] I applied that commit's `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` to the v1.1 spec in a scratch directory. The base was `95172020…` and the patch `98025a0a…`. The result was `ff133775577b86aa377375ccdc6a605a187e30095bfd6ca73ac2a58debacd5c2`, which equals #812's `PROPOSED-SUBJECTS.json`.
- [Observed] `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md` at `de9c1ba8` hashes to `758feff4…`.

Commands, run in a detached worktree of the reviewed commit. I did not run `npm ci` because I ran no npm command.
- `build_public_git_source_acquisition_local_agent_v1_1.py --check`: "unapplied, verifies", exit 0.
- `… --selftest`: "53 of 53 predicates held".
- `… --digests`: base `917aecc7…`, proposed `58434ada…`, patch `9ddb8851…`. These equal `PROPOSED-SUBJECTS.json` and my own `sha256sum`.
- `build_public_git_source_acquisition_local_agent.py --check`: "applied, verifies". `--selftest`: "37 of 37 predicates held".
- `record_versioned_signoff.py --selftest`: "179 fixtures, 0 failing".
- `record_versioned_signoff.py --check public-git-source-acquisition-local-agent --version 1.0`: "regenerates exactly; applied tree verified", exit 0.
- `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `check_docs_review_campaign_partition.py --check`: partition PASS, denominator 824, unmatched 0.

Independent structural diff, v1.0 installed entry against the proposed entry, flattened to leaf paths:
- [Observed] Changed: `typedAuthority.readAuthority`, `.fetch`, `.tags` and `.stateDirectoryWrites`.
- [Observed] Added: `implementationCoverage.copyStep`. Removed: nothing.
- [Observed] The other 142 leaf paths keep their order.
- [Observed] The installed entry equals the v1.0 candidate bytes (`cmp`).
- Item 6 holds.

Round-1 findings, judged against the bytes:
- **F1, the classes defined in the entry.** [Observed] `fetch` now defines both classes itself. [Inferred] With v1.2 unsigned, no version in force of REQ-047 requires a copy. I checked the installed v1.1 spec: "copy" occurs 0 times. So every run is a no-copy run, and `fetch` ("none"), "no process is started" and `stateDirectoryWrites` hold in v1.0's words. The repair is right in kind. Findings 1 and 2 below are two places where the package's account of the signed-alone case is still not exact.
- **F2, the record text.** Repaired. [Observed] I rendered the v1.1 record and aggregate block over the real `@1.1` package. The scope, supersession and "does not" lines are true of v1.1. After a simulated v1.1 record, the v1.0 record regenerates byte for byte, and `--check --version 1.0` prints "superseded by a later version".
- **F3, the replaced record's SHA-256 line.** Repaired. Probe B, run in a scratch copy after a simulated v1.1 record:
  - [Observed] The v1.0 SHA line set to 64 zeros fails with "the record's installed SHA-256 is not the SHA-256 of the bytes the later version takes as its base".
  - [Observed] A one-character change fails the same way.
  - [Observed] With the line restored, the check passes.
- **F5, the builder.** Taken. I re-ran M1 to M5 coherently, regenerating the patch and `PROPOSED-SUBJECTS.json` each time so those checks stay silent.
  - [Observed] Each fails with exactly one finding, naming its clause: 'launch read (3)', 'launch read (5)', "the copy's directory and where it lies", 'the source and the object', 'launch read (2)'.
  - [Observed] An unchanged control verifies.
  - [Observed] So do my extra mutants fail: a dropped "only those … in force name" bound, a narrowed no-copy sentence, `networkAccess` and `writeSurface` made non-empty, an edit to `subject.observedRepositories`, a changed `copyStep` claim and an appended `tags` clause.
- **F6.** Taken, and the text is accurate.
- **F7.** Taken in part; see Finding 3.
- **F4, F8, F9.** Carried to the owner page, items 2 to 4. See item 8 below.

Recorder rule 6. I ran 13 source mutants of `record_versioned_signoff.py` against `--selftest`:
- [Observed] Killed:
  - the digest guard removed;
  - the `None` guard disabled (the selftest aborts with a `TypeError`);
  - `installed_sha` not passed;
  - each of the four override fields ignored;
  - the real v1.0 package's `replaced_bytes` dropped, or pointed at `PROPOSED`;
  - the real v1.1 package's `record_does_not` or `record_aggregate_scope` dropped;
  - `latest` forced true.
- [Observed] Survived: the v1.1 "does not" text rewritten to drop its "local execution and a local write" while keeping the substring the selftest pins. See Finding 4.
- [Observed] The retained mutation record's `file_sha256_restored` equals both scripts' SHA-256 at the reviewed commit, and each mutant stores `old`/`new`.

Item 8, the owner page. [Inferred] "Before you sign" items 2 to 4 put round-1 Findings 8, 4 and 9 plainly and lean on no answer. Item 1 states a fact that is wrong (Finding 2).

## Findings

**Finding 1 — the entry closes the reads of every run, while #812 closes only those of a launch-consented run, so REQ-033's HEAD-check reads in a run that is not launch-consented fall outside the list, and E2's "changes nothing that run may do" is false** (revise)

[Observed] #812 at `de9c1ba8`, REQ-047, binds its closed list to one class of run: "For every launch-consented run, the reads Syzygy itself makes, in process, of the operator's clone SHALL be only these". The proposed `readAuthority` closes the list for every run: "Besides them Syzygy reads, as data and never honoured, only the following". For a run that is not launch-consented, such as the redis run, the only item that applies is "In every no-copy run (fetch), launch-consented or not, it reads the files of the operator's clone's .git directory that the form check binding that run reads".

[Observed] Every run makes REQ-033's HEAD check before the form check:
- `packages/polaris-dossier/src/init.ts:165` calls `resolveCloneHead`. Line 178 then runs `cloneGitDirShape`, the form check.
- `clone-head.ts:8` says the HEAD check "reads `.git/HEAD`, at most one loose ref under `refs/heads/`, and `packed-refs`".
- `init.ts:114` also reads HEAD before Syzygy knows whether the run is launch-consented: it is the read that decides #812's first branch.
- The form check does not read a ref file's content or `packed-refs`. `clone-shape.ts:29` refuses `packed-refs` by name.

[Inferred] Take a run that is not launch-consented and whose clone's HEAD names a branch, for example a redis-consent clone that departs from its stated form. That run reads a loose ref file and possibly `packed-refs`. Neither is a form-check read, and no item of the closed list admits it. v1.0 admitted these reads by the reading #812's D9 carries: "no ref … is read" bounds the object reads. v1.1 now says in words that nothing else is read. So, signed with or without v1.2, the entry excludes reads the implementation makes today. E2's "This version changes nothing that run may do" is not true at this edge. This is the same class of gap as round-1 Finding 1, now reached through the HEAD check instead of the form check.

Repair, either way:
- scope "only the following" to the launch-consented run, as #812 does; or
- admit, for every run, the reads REQ-033's HEAD check makes: HEAD and the reference it names, from loose files and `packed-refs`.

Then correct E2 and the Dependency section.

**Finding 2 — E3, the Dependency section and the owner page say v1.1's rules ask for none of the trunk-rule references, `packed-refs` or abbreviation reads, but v1.1 names some of them and the implementation makes them today** (revise)

[Observed] E3 says of #812's D9 list: "The qualifier 'only those the launch-consent requirements in force name' is what keeps them out while v1.2 is unsigned: v1.1's rules ask for none of them, so the entry admits none of them for a v1.1 run". `OWNER-SIGNOFF.md` says: "Some of them only v1.2 asks for: the trunk-rule references, the local branch named like the remote's default, `packed-refs`, whether an alternates file exists, and object names for a shortened `--revision`."

[Observed] The installed v1.1 spec, REQ-047, says otherwise:
- On the trunk rule: "Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch".
- On abbreviation: "given as a full or unambiguous abbreviated object identifier".
- v1.1's REQ-046 reads "the clone's references" before the answer.

[Observed] The implementation reads these today:
- `packages/polaris-dossier/src/launch-revision.ts:89-90` pins by `refs/remotes/${chosen.remote}/HEAD`.
- `clone-head.ts` reads `packed-refs` in every run (`init.ts:165`).

[Inferred] So v1.1 does name the trunk-rule references, an abbreviation's resolution and, through the HEAD check, `packed-refs`. Read literally, the entry's bound admits them for a v1.1 run. That is correct, and it is needed, or signing v1.1 alone would put v1.1's own trunk-tip pin outside the entry. But the owner is told that v1.2 alone asks for these reads and that they are kept out. The error appears to come from D9's phrase "The reads v1.2 adds in the same class", which the package copies.

Repair: re-derive, read by read, which of the five v1.1 already names. Then correct E3, "Dependency on launch-consent v1.2", the owner page's "What changes" bullet and "Before you sign" item 1.

**Finding 3 — the ledger's item 1a still misses a real-tree pin of the v1.0 identity in `gate-acts.test.ts`** (note)

[Observed] `packages/polaris-dossier/src/gate-acts.test.ts:31` defines `SIGNOFF` as the v1.0 record's path. Line 220, inside `expectFollowsTree`, expects `{ state: 'ok', record: 'public-git-source-acquisition-local-agent-v1.0' }` whenever that file exists. Line 93 calls `expectFollowsTree(REAL_ROOT, …)`.

[Inferred] After v1.1 is recorded and the form moves to v1.1, the v1.0 record still exists, so line 220 fails on the real tree. The ledger names `gate-acts.test.ts:581`, `:596` and `:613` only. Line 220 reaches the record through a local constant, not through `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`. Its first sweep, "for the installed file name and the v1.0 record name", should have found line 31.

[Observed] I re-derived the constant sweep exactly: 33 occurrences on 29 lines in 10 tracked files under `packages/`, `apps/` and `scripts/`.

**Finding 4 — the v1.1 record's own text lives in the recorder, outside the package digest and the package-unchanged check, and the selftest pins only a substring of it** (note)

[Observed] `GIT_SOURCE_V11_SCOPE`, `_SUPERSESSION`, `_DOES_NOT` and `_AGGREGATE` are in `scripts/record_versioned_signoff.py`. The review binds the subject's digest. The recorder confirms that "the package directory still equals the package at the reviewed commit", and the recorder script is not in that directory.

[Observed] A mutant that changes the "does not" text from "widens, in a copy-class run alone, local execution and a local\nwrite: " to "widens, in a copy-class run alone, nothing new: \nwrite: " passes `--selftest` ("179 fixtures, 0 failing"). The real-text fixture checks only `"widens, in a copy-class run alone" in …`.

[Inferred] A later edit to the text that the signed record will carry is retired by no review. Pin the four texts in full in the selftest, or name them in the brief as reviewed bytes.

**Finding 5 — ledger item 2's "no longer depends on the second" overstates the recorder line alone** (note, editorial)

[Observed] I ran a scratch probe after a simulated v1.1 record. I rewrote the v1.0 record's SHA line and the v1.0 base file together, to consistent forged bytes.
- `record_versioned_signoff.py --check … --version 1.0` exits 0.
- The v1.1 builder refuses: "the patch applied to the v1.0 bytes does not give the proposed bytes".
- The v1.0 builder refuses: "the sitting manifest does not row the proposed entry at its SHA-256".

[Inferred] The ledger's conclusion that both battery lines are required is right. Its sentence that the recorder's v1.0 line "no longer depends on the second" holds for a forged record line alone, not for a forged line and base together.

**Finding 6 — exactness against #812 otherwise holds, and the scope is no wider than #812 and the owner's selection** (note)

[Observed] I checked each Proposed block against REQ-046 and REQ-047 at `de9c1ba8`. Each of these matches #812 or is narrower:
- the named identifier;
- the five launch reads, one to one with REQ-047's bullets;
- the Git environment;
- the fetch: full identifier, depth one, no tags or submodules, `file://` only, from nowhere else, detached checkout;
- the commit test from the copy's `HEAD`, "never by reading that object or from reference data";
- object reads moving to the copy;
- the copy's form check before the question;
- the copy's directory: Syzygy creates it, removes it before the brief, otherwise keeps it at a location the launch output names, and Git writes its contents;
- the non-commit object, "uses it for nothing beyond the copy step and that refusal";
- the refusals: reftable, alternates before the copy step, a Git failure "as Git reported it";
- the Inferred hook and configuration residual;
- "not a locator".

[Observed] `networkAccess`, `writeSurface`, `executeObservedCode`, `workingTreeRead` and `submodules` are unchanged and agree with #812's D9.

[Inferred] The owner's selection says "the closed list goes away". That refers to the withdrawn list of reads made in place in the full clone, not to the launch reads. #812's REQ-047 keeps a closed launch-read list, so the entry's list is not a widening of the owner's ruling. Its one departure, closing the list for every run, is Finding 1.

The reviewer edited nothing tracked, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external. The scratch worktree and the TMPDIR were removed.
