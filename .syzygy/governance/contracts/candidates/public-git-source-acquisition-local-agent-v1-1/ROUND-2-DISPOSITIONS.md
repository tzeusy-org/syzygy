# Review round 2 dispositions — public-git-source-acquisition-local-agent v1.1

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-2-RAW.md

> **Candidate — binds nothing.** The raw (`REVISE`, over `5236223d`, two
> revise findings and four notes) is not edited. The two revise findings
> are repaired, which changes the subject's bytes and retires the round-2
> review (rule 10); round 3 reviews the repaired bytes (`REVIEW-BRIEF.md`).
> The notes are taken. The package stays bound to PR #812 at `de9c1ba8`.

1. **Finding 1** (revise): the entry closed its read list for every run,
   while #812's REQ-047 closes it only "For every launch-consented run", so
   the HEAD-check reads of a run that is not launch-consented (a loose ref
   file and `packed-refs`, `clone-head.ts`) fell outside the list, and E2's
   "changes nothing that run may do" was false at that edge.
   **Repaired by mirroring #812's scoping.** `readAuthority` now says "The
   reads of the pinning, identity and clone-form rules are launch reads,
   made as data and never honoured, and not object reads. In a
   launch-consented run (REQ-polaris-generation-046 and 047), besides the
   object reads, Syzygy reads only the following: ...", and ends "A run
   that is not launch-consented has no closed list of reads here beyond the
   object reads, as under version 1.0; besides its form-check reads above,
   REQ-polaris-generation-033's check of its HEAD reads HEAD and the
   reference HEAD names, from the loose reference files and packed-refs".
   **Why this option:** it makes the entry claim no more than the spec it
   serves; the other option, a list closed for every run, would make the
   entry a closure #812 does not ask for, and every read some later
   predecessor rule needs in a run that is not launch-consented would again
   fall outside it. The HEAD-check reads are still named, as an admission,
   so the run's reads are said in words without being closed. E2, E3 and
   "Dependency on launch-consent v1.2" are rewritten to match. Two
   selftest fixtures pin the scoping ("(R2 F1) ...").
2. **Finding 2** (revise): E3, the Dependency section and the owner page
   said v1.1's rules ask for none of #812's D9 "adds" reads, but v1.1
   names the trunk-rule references and the abbreviation, and the
   implementation reads `packed-refs` today. **Repaired.** Re-derived by
   script (counts over the installed v1.1 spec and #812's post-apply spec),
   read by read: v1.1 names the trunk-rule references and the abbreviation
   [Observed]; it names `packed-refs` not by name but as the store of the
   references it names [Inferred, and the implementation reads it, Observed];
   it names neither the local branch of the remote default's name nor the
   alternates-file check [Observed: 0 occurrences of "local branch" and of
   "alternates"]. E3 now carries that table. The bound in the entry becomes
   "of what they list only what the launch-consent requirements in force
   name", since read (2) lists parts v1.1 names and a part it does not.
   The Dependency section, the owner page's "What changes" bullet and
   "Before you sign" item 1 now say that, signed alone, the list admits
   what v1.1 already reads and keeps out only those two items.
3. **Finding 3** (note): item 1a missed `gate-acts.test.ts:31` and `:220`
   (via `:93`), which pin the v1.0 identity on the real tree through a
   local constant. **Taken.** Added to item 1a and to "Who else reads the
   entry".
4. **Finding 4** (note): the four v1.1 record texts live in the recorder,
   outside the package digest, and the selftest pinned only a substring
   (the reviewer's "nothing new" mutant survived). **Taken.** The recorder
   selftest now pins all four in full as literals; the round-2 mutation
   record shows the reviewer's survivor and one mutant per other text
   killed. `REVIEW-BRIEF.md` names the four texts as reviewed bytes.
5. **Finding 5** (note, editorial): ledger item 2's "no longer depends on
   the second" overstated the recorder line: a forged record line and
   forged base together pass it. **Taken.** Item 2 now says the recorder
   line catches a forged record line alone, not the pair, and that the
   builder line is required for that too.
6. **Finding 6** (note): exactness against #812 otherwise holds and the
   scope is no wider than #812 and the owner's selection. **No action.**
