Review: R-GIT-SOURCE-LOCAL-AGENT-V1-1-3
Reviewed commit: 0f1a203d3016f1f7a5e72854a07ef415d54035c0
Manifest SHA-256: a1d4414edb4508e2de32009b2a634d65c2a9e92686b1501cf42be33a51528f79
Verdict: REVISE

Package: public-git-source-acquisition-local-agent, version 1.1. The builder is build_public_git_source_acquisition_local_agent_v1_1.py.

Subject: `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`. I computed its digest above with `sha256sum` at the reviewed commit.

Governing text: PR #812 at `de9c1ba89746f380007446a26a03e2a96d9e4d80`.
- [Observed] `origin/agent/syzygy-pdja-clone-and-url-scope` resolves to `de9c1ba8`.
- [Observed] I applied that commit's `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` to the v1.1 spec in a scratch directory. The base was `95172020…` and the patch `98025a0a…`. The result was `ff133775577b86aa377375ccdc6a605a187e30095bfd6ca73ac2a58debacd5c2`, which equals #812's `PROPOSED-SUBJECTS.json`.
- [Observed] The installed v1.1 spec at the reviewed commit also hashes to `95172020…`.
- [Observed] `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md` at `de9c1ba8` hashes to `758feff4…`.

Commands, run in a detached worktree of the reviewed commit. I did not run `npm ci` because I ran no npm command.
- `build_public_git_source_acquisition_local_agent_v1_1.py --check`: "unapplied, verifies", exit 0.
- `… --selftest`: "55 of 55 predicates held".
- `… --digests`: base `917aecc7…`, proposed `a1d4414e…`, patch `b9783f7f…`. These equal `PROPOSED-SUBJECTS.json` and my own `sha256sum`.
- `build_public_git_source_acquisition_local_agent.py --check`: "applied, verifies". `--selftest`: "37 of 37 predicates held".
- `record_versioned_signoff.py --selftest`: "179 fixtures, 0 failing".
- `record_versioned_signoff.py --check public-git-source-acquisition-local-agent --version 1.0`: "regenerates exactly; applied tree verified", exit 0.
- `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `check_docs_review_campaign_partition.py --check`: partition PASS, denominator 825, unmatched 0.

Item 6, everything else byte-identical. It holds.
- [Observed] I flattened the installed v1.0 entry and the proposed entry to leaf paths and compared them.
  - Changed: `typedAuthority.readAuthority`, `.fetch`, `.tags` and `.stateDirectoryWrites`.
  - Added: `implementationCoverage.copyStep`. Removed: nothing.
  - The other 142 leaf paths keep their order.
- [Observed] The installed entry equals the v1.0 candidate bytes (`cmp`).
- [Observed] Applying the patch with `git apply` to a copy of the installed entry gives `a1d4414e…`.
- [Observed] The five Proposed blocks in `SEMANTIC-DELTA.md` equal the five JSON string values exactly.

Builder rule 6. I ran 8 coherent mutants of the proposed entry in a second scratch worktree. For each, I regenerated the patch and `PROPOSED-SUBJECTS.json` so that those checks stay silent.
- The mutants:
  - drop launch read (4);
  - drop "never by reading that object or from reference data";
  - widen read (2) to "the values of every reference";
  - drop "no tags" from fetch;
  - drop the removal before the brief;
  - drop the bound "of what they list only what the launch-consent requirements in force name";
  - drop "and from nowhere else";
  - drop "never follows it to any object it names" from tags.
- [Observed] Each fails `--check` with findings that name only its clause. An unchanged control verifies.

Recorder rule 6. [Observed] The round-2 mutation record's `file_sha256_restored` equals the SHA-256 of both scripts at the reviewed commit. Its five mutants each store `old`/`new` and are killed. The round-2 raw's surviving mutant is among them, now killed.

Round-2 findings, judged against the bytes:
- **F1, the list closed for every run.** Repaired in kind.
  - [Observed] `readAuthority` now closes the list only "In a launch-consented run (REQ-polaris-generation-046 and 047)". It says that "A run that is not launch-consented has no closed list of reads here beyond the object reads, as under version 1.0". It names that run's HEAD-check reads as an admission.
  - [Observed] `init.ts` reaches `resolveCloneHead` before the launch branch, and `clone-head.ts` reads HEAD, at most one loose ref and `packed-refs`. The entry now admits all of these for a run that is not launch-consented.
  - [Inferred] That run is closed nowhere v1.0 left it open.
  - The launch-consented run has a remaining gap of the same class; see Finding 1.
- **F2, what v1.1 already names.** Repaired. I re-derived E3's table by script, counting literals over the installed v1.1 spec and #812's post-apply spec:

  | Literal | v1.1 | v1.2 |
  |---|---|---|
  | "local branch" | 0 | 5 |
  | "alternates" | 0 | 4 |
  | "packed-refs" | 0 | 3 |
  | "abbreviat" | 2 | 6 |
  | "remote's `HEAD`" | 1 | 1 |

  - [Observed] v1.1's trunk rule and its "full or unambiguous abbreviated object identifier" are quoted correctly.
  - [Observed] Each E3 row is right as a statement about what v1.1 names.
  - [Observed] E3, "Dependency on launch-consent v1.2", the owner page's "What changes" bullet and "Before you sign" item 1 now say the same thing: only the local branch of the remote default's name and the alternates check are v1.2's alone.
  - Their shared further claim, that signed alone the list "admits what v1.1 already reads", is not exact; see Finding 1.
- **F3, `gate-acts.test.ts:31` and `:220`.** Taken. [Observed] Item 1a names them, with `:93`. Other pins in the same family remain; see Finding 4.
- **F4, the record texts.** Repaired. [Observed] The selftest compares all four `GIT_SOURCE_V11_*` texts in full, as literals, against the `@1.1` package's fields. The brief names them as reviewed bytes. See Finding 3 on their content.
- **F5, ledger item 2.** Taken. [Observed] Item 2 now says that the recorder line catches a forged record line alone, not a forged line and base together, and that the builder line is required for the base.
- **F6.** No action needed.

Item 1, exactness against REQ-046 and REQ-047 at `de9c1ba8`. [Observed] Every Proposed block matches #812 or is narrower:
- the run classes. The entry's "every other run" adds only runs with no named identifier, which make no copy under either text;
- the named identifier;
- the five launch reads, one to one with REQ-047's bullets, under a bound #812 does not carry and which only narrows;
- the Git environment;
- the fetch: full identifier, depth one, no tags or submodules, `file://`, from nowhere else, detached;
- the commit test from the copy's `HEAD`;
- object reads moving to the copy;
- the copy's form-check reads;
- the no-copy form-check reads "to which (3) yields", as REQ-047 says;
- the copy's directory, Syzygy's own creation and removal of it, and Git's writes of its contents;
- the non-commit object;
- the reftable and alternates refusals, with the alternates refusal placed in the copy-class paragraph as #812 places it;
- the Inferred hook residual;
- "not a locator".

[Observed] REQ-046 at `de9c1ba8` says "For a copy-class run, every one of which is launch-consented". So the copy's reads fall under the closed list as the entry places them. The one wording that reaches past #812 is Finding 2.

Scope. [Observed] The owner's "Redesign after review round 3" section authorizes drafting only, and the package performs nothing. [Inferred] "the closed list goes away" refers to the withdrawn in-place reading design, as round 2 found. The entry is no wider than #812 and that selection.

Item 4, signed alone. [Observed] While no version in force requires a copy, every copy clause is inert. `fetch` ("none"), "no process is started" and `stateDirectoryWrites`' first clause hold in v1.0's words for every run. The exception is Finding 1, a read v1.1 runs make today that the closed list does not admit.

Item 8, the owner page. [Inferred] It puts the choices plainly. Items 2 to 5 lean on no answer. Item 1's "under v1.1 it admits what v1.1 already reads" is the sentence Finding 1 corrects.

## Findings

**Finding 1 — signed alone, the closed launch-read list leaves out reads that every launch-consented v1.1 run makes today: the value of every loose reference, and, for a full-identifier `--revision`, the store's object identifiers. The package says it "says in words what v1.1's runs already do".** (revise)

[Observed] Read (2) of the proposed `readAuthority` admits "the names of its references, and the values of HEAD and the reference it names, of the references REQ-polaris-generation-047's trunk rule names, of the local branch of the remote default's name and of the reference --revision names". Other references' values are admitted only as they come with `packed-refs`, "used for nothing". Read (5) admits object identifiers "for an abbreviated --revision alone".

[Observed] The launch path runs in every launch:
- `init.ts:125` calls `launchConsent`, and `launch.ts:135` calls `readCloneSnapshot`.
- `packages/polaris-dossier/src/launch-clone.ts:100-125` walks every entry under `.git/refs/`. It reads each loose file's content with `readBounded(abs, …)` and stores its value in `snapshot.refs`. That covers tags, every remote-tracking branch and the stash.
- `launch-revision.ts:33` sets `HEX_PREFIX = /^[0-9a-f]{4,64}$/`, and `:59-61` calls `ports.storedIds()` for any name that matches it. A full 40- or 64-hex `--revision` therefore reads every loose object name and pack index too (`launch.ts`, `storedIdentifiers`).

[Inferred] Under the installed v1.1 spec ("the clone's references", read before the answer), these reads are what v1.1's runs do today. The bound "of what they list only what the launch-consent requirements in force name" can only narrow read (2) and read (5), never add to them. So once this version is installed, with or without v1.2, a launch-consented run's implementation reads outside the signed entry.

The following say otherwise:
- "Dependency on launch-consent v1.2": "it says in words what v1.1's runs already do and admits nothing they do not".
- The owner page, "Before you sign" item 1: "under v1.1 it admits what v1.1 already reads".
- IMPACT-LEDGER lists no change to `launch-clone.ts` or `launch-revision.ts` in the signing commit.

This is the same class as round-2 Finding 1: the entry excludes reads the implementation makes today, reached through the launch path instead of the HEAD check.

Repair, either way:
- name the narrowing of `launch-clone.ts` and `launch-revision.ts` as a change that must travel with the sign-off. It needs its own authorization. Then correct the Dependency section, E3's closing paragraph and owner item 1 to say that signing closes reads v1.1's runs make today;
- or, if the owner prefers, word read (2) and read (5) so that they admit what the requirements in force name. #812 itself lists the narrower set, so this option must not exceed #812 once v1.2 is in force.

**Finding 2 — "Syzygy reads only the following" is not scoped to the clones, while #812 closes only "the reads Syzygy itself makes, in process, of the operator's clone"** (note, editorial)

[Observed] The entry reads: "In a launch-consented run (REQ-polaris-generation-046 and 047), besides the object reads, Syzygy reads only the following: in the operator's clone these five things alone, … In a copy-class run (fetch) it … reads the files of the copy's .git directory …".

[Inferred] Read literally, the sentence closes every read Syzygy makes in that run. That includes `homeGitDirs(ports.home)` and the launch records, which `launch.ts` reads from the governance home's dedicated reference, as well as the run's state directory and the policies. In the context of an adapter entry the clones are plainly meant, so this is wording only. "Syzygy reads of the operator's clone and the copy only the following" would match #812's scope exactly.

**Finding 3 — the v1.1 record texts are true but name only the execution and write widenings, not the copy-class run's reads in the copy or the launch-read closure** (note, for the owner)

[Observed] `GIT_SOURCE_V11_DOES_NOT` and `_AGGREGATE` say: "against version 1.0 it widens, in a copy-class run alone, local execution and a local write".

[Inferred] In a copy-class run, Syzygy also reads a new local location: the copy's objects and its `.git` form-check files, including the `shallow` file v1.0's words exclude from object reads. For every launch-consented run, v1.1 also closes a list v1.0 left to a reading. Neither sentence is false. A later reader of the signed record could still take the two named widenings as the whole change. The owner may want one clause, such as "and reads that copy in place of the operator's clone", or may leave it.

**Finding 4 — ledger item 1a is still not complete: the `SIGNOFF` fixture family in `gate-acts.test.ts`, its testkit renderer and two `start-gates.test.ts` literals also pin the v1.0 identity** (note)

[Observed] `gate-acts.test.ts:63` (`world(…, true)`) writes the record at the fixed v1.0 path `SIGNOFF` with `renderLocalAgentSignoff`, defined at `packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts:162`. These tests read that record and expect the v1.0 identity or its absence message:
- `gate-acts.test.ts:90` and `:221`;
- `:230`;
- `:432-443`;
- `:659-663`.

[Observed] `start-gates.test.ts:191` and `:1036` expect `'public-git-source-acquisition-local-agent-v1.0'` as a literal. The ledger's table puts that file under "follows item 1" and does not list it as a required change.

[Inferred] Once item 1 moves the form to v1.1, the reader looks for the v1.1 record file. These tests then fail or need their expectations changed in the same commit, as `:220` does.

[Observed] I reproduced the constant sweep: 33 occurrences on 29 lines in 10 tracked files. A sweep for `local-agent-v1.0` under `packages/` returns the lines above.

**Finding 5 — E2's list of what the form check reads is short of the code** (note, editorial)

[Observed] E2 says that, from `clone-shape.ts`, the form-check reads "are HEAD, `config`, `shallow`, `logs/HEAD` and the pack indexes". `clone-shape.ts` also reads `FETCH_HEAD` (`:175`). It also lists the `.git` directory and its `refs`, `hooks`, `info`, `logs`, `objects` and `objects/info` subdirectories (`:162-212`).

[Inferred] The entry's own words admit all of these by reference ("the files … that the form check binding that run reads"). So only the explanatory prose is short.

The reviewer edited nothing tracked, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external. Both scratch worktrees and the TMPDIR were removed.
