Review: R-POLARIS-LAUNCH-CONSENT-V1-2-1
Reviewed commit: bec95fd46eabfe45ce7f58bad56e77d187f42c34
Manifest SHA-256: 5ae954455277fce0879b2ed404500c350180882a0815dc1801e47866dc48bbf1
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh-context reviewer, read-only, on a detached worktree of the reviewed commit. I edited nothing, ran no dossier, read no observed-repository body and made no provider call or external fetch.

Subject. [Observed] I ran `sha256sum` on the installed v1.1 spec and got `95172020…`. I applied `proposed/spec.md.patch` (patch digest `a14e89d3…`) with `git apply`, and the post-apply spec hashed to the digest in the head above. Both values equal `PROPOSED-SUBJECTS.json`.

## Summary of what holds

- [Observed] Criterion 4. The derivation sentence of REQ-polaris-generation-046 is byte-identical before and after the patch. I compared by script the span from "The derived identity is taken" to "the operator may give the identity option on any launch.": 830 bytes each, equal, one occurrence in each file. The matching and proposal sentences that follow it are also equal. I applied the rule by script and it yields:
  - `repository:redis-redis`, `repository:psf-requests` and `repository:tzeusy-org-syzygy` from their `https://github.com/...` URLs, and `repository:redis-redis` from `ssh://git@github.com/redis/redis.git`;
  - `repository:sub-tool` from `git@git.example.org:team/sub/tool.git`;
  - `repository:a-b` from the `git://` and `http://` scenario URLs.
- [Observed] Criterion 8, exact blocks. I checked all 14 `~~~~text` blocks by script against the paragraphs of the v1.1 and post-apply bytes. Every paragraph matches, and the changed paragraph sets equal the patch's 8 hunks (8 current, 41 proposed). The one byte-level difference is the file-final newline after the last YAML fence.
- [Observed] Criterion 8, quotations. I re-extracted every double-quoted span of 12 or more characters and every `>` quotation in `SEMANTIC-DELTA.md` (above "Exact blocks"), `IMPACT-LEDGER.md` and `OWNER-SIGNOFF.md`, normalised whitespace and backticks, and searched for each in the cited sources. All 23 quotations of the owner's words, the registry entry, the v1.1 spec, REQ-033, the redis consent, the clone-shape review, `init.ts` and the policy were found. The only spans not found are the package's own banners and its proposed option label, which quote nothing.
- [Observed] Criterion 9. I re-ran the sweep's seven predicates (Python `re`, IGNORECASE) at `715c59c4` over `git ls-tree -r -z`. The populations reproduce exactly: 9, 4, 217, 12, 2, 20 and 1,565 files. The identity counts also reproduce: 22 / 9 / 4 / 15, and 0 files carry `github:[A-Za-z<{$]`. The judged third column is discussed in Finding 11.
- [Observed] Criterion 13.
  - `--check` passes for v1.0 ("applied"), v1.1 ("applied") and v1.2 ("unapplied").
  - `--selftest` passes for v1.0 (25 fixtures), v1.1 (30) and v1.2 (31), each with 0 failing.
  - `record_versioned_signoff.py --selftest` passes 175 fixtures, 0 failing.
  - With the v1.2 patch applied and no v1.2 record, all three builders' `--check` fail with "the tree carries the v1.2 patch, which no sign-off record covers". The recount moves from (38, 302) to (38, 316): 14 scenarios added, as the ledger says.
  - Each v1.2 check branch has a refusing fixture: not installed, no record, wrong bytes, missing patch, extra requirement, scenario dropped or doubled, neither state, status links, stale subjects, review digest mismatch, unknown later version.
- [Observed] Criterion 6. The trunk rule matches `packages/polaris-dossier/src/launch-revision.ts:39-47,89-97`: `origin` first, else the one remote with a default; several remotes with none `origin` refuse; then `refs/heads/main`, then `refs/heads/master`.
- [Observed] Criterion 1. No hunk admits a local path, an egress, a write or an execution beyond v1.1.
  - `file://`, other transports and local paths are refused (spec line 17).
  - "SHALL make no network request to resolve, check or reach a locator" (line 17).
  - "SHALL start no process in the clone" (line 240).
  - Findings 1 to 3 concern reads.

## Findings

**Finding 1 — The pre-answer read list of REQ-046 still omits the configuration and calls reference reads object reads, so the two requirements' closed lists disagree** (revise)

- [Observed] The post-apply spec, line 9 (REQ-046, unchanged), says: "Before the answer Syzygy SHALL read only what the question needs, and SHALL read it as Git objects by object identifier: the clone's references; the pinned commit object, …; and the tree objects reachable from that root tree".
- [Observed] Line 15 proposes the identity before the answer, from "the URL of the clone's remote". That needs the clone's configuration.
- [Observed] Line 239 (new, REQ-047) says: "configuration: the clone's own configuration file, read as text only for its remotes' names and URLs … and the files that locate the Git directory and the common Git directory".
- [Observed] Line 238 says references are "read as file data from the loose reference files and `packed-refs`".
- So after this patch:
  - REQ-046's "read only" list lacks the configuration and Git-directory locator reads that REQ-047 now lists, and that happen before the answer.
  - REQ-046 says references are read "as Git objects by object identifier", while REQ-047 says they are file data.
- [Observed] The lead-in at line 234 says these reads "stay those REQ-polaris-generation-033 and REQ-polaris-generation-046 permit". REQ-033 (local-agent spec, line 13 area) says: "Every read Syzygy makes for the run SHALL be a Git object read by object identifier at the pinned revision through the registered observer, never a read of the working tree". Neither text permits a text read of the configuration file.
- [Inferred] The tension already existed in v1.1, which derived from the remote URL without listing the configuration. This version makes the reads explicit, and so makes them visibly not what 033 and 046 permit.
- Repair I would accept:
  - Amend REQ-046's pre-answer sentence so its list matches REQ-047's: reference names and the named values as file data, the configuration as text for remote names and URLs only, and the Git-directory locator files.
  - Reword REQ-047's lead-in to say that these launch reads are not observer object reads, are made only to pin the revision and propose the identity, and never read repository content. REQ-033's object-read rule then governs every content read.
  - Add a falsifier arm to REQ-046: a pre-answer read outside that list.

**Finding 2 — Lookup by `Upstream:` has no stated effect, and its absolute "never found" contradicts REQ-047's first branch and REQ-046's identity match** (revise)

- [Observed] Spec line 17 (new): "An observation consent made by any other act is found for a locator when that record's `Upstream:` URL, normalised by the same rule, equals the locator's normalised URL, host and whole path, never by the identity's two segments: a consent is never found for a same-named repository on another host or under another group".
- [Observed] Version 1.1 has no `Upstream:` lookup (I grepped the v1.1 bytes for `Upstream`: 0 hits). The new sentence never says what being "found" does for a run. It could mean the consent the run relies on, a record the question names, or a match under REQ-046.
- [Observed] REQ-047's first branch (line 228, unchanged) pins HEAD when "an in-force observation consent names [it], whatever that consent's subject identity and whichever act made it". Its scenario "Fork remote at a consented commit" runs a clone whose remote derives another identity.
  - [Inferred] So a `gitlab.com/redis/redis` clone at a commit the redis act names runs under the redis consent by revision.
  - That is a consent found for a same-named repository on another host, which line 17 says never happens.
- [Observed] REQ-046's matching (line 15) treats "An existing record, in any state" as matching by identity. `SEMANTIC-DELTA.md:410-414` (D7) says such a launch's "question names the redis records as matching by identity" and that "Its own `Upstream:` lookup finds nothing".
- [Inferred] So under this text the same record is both "matching" (REQ-046) and "never found" (line 17). The scenario "Same-named repository on two hosts" (line 137, its THEN and AND arms) depends on the two verbs meaning different things, and the spec never defines the difference.
- [Observed] `SEMANTIC-DELTA.md:477-478` says a run relying on no launch record "keeps every predecessor requirement's bytes and meaning". Line 17 is a new rule for exactly those runs (consents made by another act).
- Repair I would accept:
  - State what "found for a locator" grants: for example, that the consent may be relied on as the run's observation consent, or that it is named in the question.
  - Say that this lookup is in addition to, and never restricts, REQ-047's revision branch and REQ-046's identity, URL and revision matching.
  - Replace "a consent is never found for a same-named repository on another host" with a claim bounded to the URL lookup.
  - Correct D7 and the "What does not change" bullet to match.

**Finding 3 — The launch observation consent's recorded scope still says "and nothing else", while delta bases outside it are inflated under it, and the question does not disclose this** (revise)

- [Observed] Spec line 21 (REQ-046, unchanged) defines the launch observation consent record's scope as "the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, held in the operator's own clone, with no fetch by Syzygy".
- [Observed] Line 237 (new): "Syzygy MAY read the stored bytes of the delta's base, whichever object they belong to, solely to reconstruct that object". The disclosure goes only to "the run record and every page".
- [Observed] The question must state "what the observation consent permits Syzygy to read" (line 11). Nothing requires it, or the launch output, to mention delta bases.
- [Inferred] The owner allowed the read ("Allow, as delta input only … the run discloses it"). RFC5-12's grant ("per repository: Syzygy may read and index it", RFC-0005 line 99) is repository-wide, so no contract is exceeded.
- [Inferred] But a record minted under v1.2, and the question that mints it, would say the consent covers "nothing else" while Syzygy inflates bytes of objects outside that list under it. Under VIS-2 that statement should be true at the point of consent.
- Repair I would accept, either or both:
  - Add to the question's list the statement that objects of the pinned tree may be rebuilt from delta bases outside it, inflated only for that, and add the same statement to the launch output.
  - Qualify the scope sentence's "and nothing else" with the REQ-047 delta-base allowance, so the record's stated scope is accurate.

**Finding 4 — Question (a): the registry entry admits the delta-base reads, and its `fetch` sentence reads as guidance** (note, for the owner)

- [Observed] `typedAuthority.readAuthority` (`POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json:139`) says: "Git object reads by object identifier at the run's pinned revision only: the pinned commit, its root tree and the trees and blobs reachable from it … Objects are read in process from the loose objects and version-2 packs".
- [Observed] The entry names `packages/polaris-dossier/src/git-object-reader.ts`, at implementation version 1.0.0, as implementing `typedAuthority.readAuthority`. That file resolves OFS_DELTA and REF_DELTA bases with no scope test (`git-object-reader.ts:499-527`), and its budget counts "each delta base".
- [Inferred] I read the enumeration as listing the objects whose reads are authorised. Decoding a delta base is how a packed, authorised object is read, which the signed implementation already does. So the entry admits the base read and needs no successor for it.
- [Inferred] The narrow reading has some purchase: the word "only", and a REF_DELTA base being looked up "by object identifier". The entry was also signed in the one-commit context, where every base lay in scope. The owner may want a later registry version to say so explicitly.
- [Observed] `typedAuthority.fetch` (line 140) opens "none: Syzygy fetches nothing". Its second clause is conditional on "the observation consent's stated fetch form" and addresses the operator, not the adapter.
- [Inferred] It reads as guidance. A launch record states its form as "held in the operator's own clone, with no fetch by Syzygy", which a full clone meets.
- [Observed] Related residual: the same `readAuthority` says "no ref, staging index …, repository-local configuration … is read".
- [Inferred] I read that as scoped to the adapter, which the launch reads of Finding 1 bypass. That holds only if Finding 1's repair says the launch reads are not observer reads. If the owner reads the entry as covering every read of the run, the entry needs a successor first.

**Finding 5 — Question (c): keeping typed URLs at https, ssh and scp is a defensible reading, but it narrows v1.1 in a way no owner question put** (note, for the owner)

- [Observed] The first selection reads: "Any https or ssh git URL (Recommended) — Any host, over https or ssh".
- [Observed] Ruling 4's question concerned remotes only ("a clone whose remote is http:// or git:// would no longer get a proposed identity"). The owner rejected that narrowing: "as REQ-046 normalises today".
- [Observed] REQ-046 as it stands today also normalises the operator's typed upstream: "they are normalised the same way" (line 15), with `http` and `git` among the schemes removed.
- [Inferred] So refusing typed `http://` and `git://` follows the first answer's words. It also narrows v1.1 semantics that no ruling put to the owner, and ruling 4 leans against narrowing.
- [Observed] The drafter labels the reading Inferred and a choice (`SEMANTIC-DELTA.md` D6), the ledger lists it as "Narrower: typed http and git", and the sign-off page lists it under costs. So the owner sees it at sign-off.
- Repair I would accept: the sign-off page says plainly that typed `http://` and `git://` upstreams are accepted under v1.1 and refused under v1.2. Alternatively, admit them, which D6 itself calls lawful.

**Finding 6 — Under full clones, `--revision` resolution meets objects the closed list forbids** (note)

- [Observed] Line 228 (unchanged): `--revision` is "a full or unambiguous abbreviated object identifier or a reference the clone holds … a name that resolves to no commit, or to more than one, SHALL be refused".
- [Observed] Line 236 limits object reads to the pinned commit and what lies below it, with "no object reached only from another commit, a branch, a tag". The registry entry says tags are "never read".
- [Inferred] In a full clone, `--revision v1.0` commonly names an annotated tag object. Telling such an object from a commit, or telling whether an abbreviation's candidates are commits, reads an object outside the list.
- [Observed] The implementation refuses a non-commit through `ports.isCommit` (`launch-revision.ts:99`). It treats several store identifiers sharing the prefix as ambiguous without reading them.
- Repair I would accept:
  - State that an abbreviation is ambiguous when more than one stored identifier has that prefix, decided from the store listing alone.
  - State that a reference naming a non-commit (an annotated tag included) is refused, after reading at most that one object's type.
  - Disclose that refusal in the scenario set.

**Finding 7 — The closed list's wording leaves the reads a conforming reader needs unnamed** (note, editorial)

- [Observed] Line 240 says "nothing else in the Git directory". Line 236 names objects only logically. The registry entry names "the pack indexes under `objects/pack/`", which the spec's list does not. Repair: name loose object files, pack files and pack indexes as the storage of the objects item.
- [Observed] Line 238 reads the values "only of `HEAD`, the references the trunk rule above names and the reference `--revision` names". Line 228 needs a comparison: "where a local branch of the same name points elsewhere, the launch output SHALL state both identifiers". That needs the value of a local branch such as `refs/heads/develop`, which the rule does not otherwise name. The same sentence also says "no local branch is consulted". Repair: list the local branch of the remote default's name among the values read, and say "consulted for the pin".
- [Observed] A symbolic `HEAD` needs its target's value. Repair: say "`HEAD` and the reference it names".
- [Unknown] Whether a clone using the reftable backend, which has no loose refs and no `packed-refs`, is refused or read. The text is silent.
- [Observed] Line 240 says "SHALL start no process in the clone", while the registry says "no process is started". Repair: align the wording, so that a `git --git-dir=<clone>` process run from elsewhere is plainly excluded.

**Finding 8 — Ruling 2's history disclosure reaches the question only, and the brief instruction reaches the authoring agent only** (note)

- [Observed] Ruling 2: "the run discloses that they could read history". The new statement is in the question (line 11). The run record and page list (line 37) gains no history-specific item.
- [Inferred] REQ-033's existing run-record disclosure, "that the agent read the clone without restriction … that the agent's account of what it read is self-reported and Inferred", covers it in general terms.
- [Observed] The ruling's question names "the author and review agent sessions". Line 242 instructs only "the authoring agent".
- Repair I would accept: add the history-reach statement to the run record and pages, and either extend the instruction to the review sessions' packets or say why they need none.

**Finding 9 — The no-print rule protects user information only** (note)

- [Observed] Line 17: a remote URL that is not a remote locator "derives nothing". The no-print rule applies only "where a remote URL carried user information".
- [Inferred] A remote such as `https://host/a/b?private_token=…` is not a remote locator. Nothing forbids printing it in a launch-output diagnostic.
- Repair I would accept: no remote URL that fails the remote-locator rule is printed, stored or recorded.

**Finding 10 — Normalisation merges more than the stated residuals** (note, for the owner)

- [Observed] The unchanged rule removes "any port" and case-folds "the host and the path" (line 15).
- [Inferred] Two servers on one host at different ports, or two repositories on a case-sensitive host that differ only in case, share one normalised URL. So the `Upstream:` lookup (line 17) would find one's consent for the other, and they share an identity.
- [Observed] The residual list (line 15) and D7's "never found for a same-named repository on another host" do not mention this.
- Repair I would accept: add it as a fourth Inferred residual. The derivation bytes would not change.

**Finding 11 — The rule-9 table's third column is a judgement with no stated predicate** (note, editorial)

- [Observed] The populations and identity counts reproduce exactly (see the summary). The raw predicate hits per population at `715c59c4` are:
  - specs: 1;
  - design and proposal: 2 (the launch-consent `design.md` §5 quote and the local-agent design);
  - decisions: 13, all on "shallow" (shallow trees) and similar non-clone senses;
  - policies: 3 (`GOVERNANCE-SUBSTRATE-LOCK.yaml`, the classification policy, `craft-and-care/INSTALL-RECORD.md`);
  - declarations: 1;
  - screening v8 and write consent: 8.
- [Observed] The table reports "files with a hit that pins a clone shape or a GitHub-only locator", which is a filtered subset. It names no predicate for "pins" and does not enumerate the raw hits (rule 2, rule 9).
- Repair I would accept: publish the raw hit counts per population, and name each hit file excluded from the third column with the reason.

**Finding 12 — The owner page understates two rules** (note, editorial)

- [Observed] `OWNER-SIGNOFF.md:32` says "A typed URL that carries a password or token is refused". Line 17 of the spec refuses any `https://` user information, including a bare user name.
- [Observed] `OWNER-SIGNOFF.md:27` gives the trunk tip as `origin/HEAD`, then `main`, then `master`. It omits the one-non-origin-remote case and the refusal when several remotes record a default and none is `origin` (line 228).
- Repair I would accept: one clause each.
