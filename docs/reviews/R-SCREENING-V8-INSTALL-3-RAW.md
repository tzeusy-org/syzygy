# R-SCREENING-V8-INSTALL-3 — screening scope v8 record and install, PR #810, round 3
Reviewed commit: be39bef353e2498452d5ea083df7ce945d5d853e
Subject: PR #810
Verdict: CONFIRM WITH EXCEPTIONS

Scope: this round reviews one repair commit, `be39bef3`, which sits on round 2's `01d5a2e2`. I read the v8 row (`PROJECT-STATUS.md:245`) and the v7 row (`:244`) against four sources:
- the v8 act record;
- the v8 policy's `sourceVisibility` texts at `be39bef3`, whose bytes hash to `44153bbe…`, the act's argument;
- `packages/polaris-dossier/src/source-visibility-gate.ts`;
- `packages/polaris-generation-core/src/source-visibility.ts`.

The checks ran in a detached worktree at `/home/orca/.tmp/reviews/rv810c` with `TMPDIR=/home/orca/.tmp/reviews/tmp810c`, and both are now removed. I edited nothing, ran no dossier, read no observed-repository body and made no provider call.

## Answers to the brief

1. **Every claim in the v8 row is true of the act, the policy and the code.** [Observed] One quoted phrase ends in a period where the act has a semicolon (Finding 1).
   - `grep -cF` against the act record, and the same counts over whitespace-normalised text:
     - "no object id or size of an excluded or withheld blob outside the run directory's check records and review packets": 1.
     - "A consent record whose kind or pair cannot be read refuses every read": 1.
     - "No rule for a public repository is relaxed." with the period: 0. Without the period: 1. The act reads "No rule for a public repository is relaxed; `policyVersion` is the only other value that changes."
   - "A pair is public only when every effective record states public":
     - The act says "A repository is private unless every effective observation consent record of its pair states public through its carrier".
     - The code agrees: `pairVisibility` is `carriers.length > 0 && carriers.every(carrier => carrier === 'public')`.
   - "no fetch and no partial redaction":
     - The act says "no fetch and no credential, a detector-matched body excluded whole in every class".
     - The policy's `privateSourceRules` says "no body is retained as redacted-span".
   - "public pairs included" sits outside the quotation marks. It matches the act's "refuses every read". It also matches `privateSourceRules`: "refuses every read under this scope, public repositories included".
   - "a superseding state-(1) `approve-policy` act", "from the owner's held selection of 2026-11-08", and "Supersedes the 2026-11-06 version-7 act, for the `approve-policy` role only" all match the act's head:
     - `Act type: approve-policy`;
     - "state (1)";
     - "Owner's words given on (UTC date): 2026-11-08";
     - "supersedes, for the `approve-policy` role only, the 2026-11-06 act".
   - The code refuses in more cases than the quoted trigger names (Finding 2). The row does not claim to be exhaustive.
2. **Round 2's findings 1–4 are resolved.** [Observed]
   - Finding 1: the sentence "Public pairs screen exactly as under version 7" is gone. The row now names three outcomes: public, private, and every read refused, with public pairs included.
   - Finding 2: the row quotes the act's own wording on object ids, which covers size as well. The policy's "never leave the run directory" is not quoted. The act's "outside the run directory's check records and review packets" carries the same meaning.
   - Finding 3: the v7 mark now reads "superseded that day, for the `approve-policy` role only, by the version-8 act". The diff is a pure insertion into the marked sentence.
   - Finding 4: the campaign file now has a round-2 verdict line, `REVISE` (`R-SCREENING-V8-INSTALL-2-RAW.md:4`). Its round-1 paragraph now says the PR treated the revise-tagged finding as revise under a notes-only verdict. Both verdict words match their raws' line 4.
3. **Nothing outside the three expected files changed.** [Observed]
   - `git diff --stat 01d5a2e2 be39bef3` gives:
     - `PROJECT-STATUS.md | 4 +-`
     - `docs/review-campaigns/screening-v8-install.md | 4 +-`
     - `docs/reviews/R-SCREENING-V8-INSTALL-2-RAW.md | 55 +++`
     - `3 files changed, 60 insertions(+), 3 deletions(-)`
   - The retained round-2 raw opens with its four-line head (`Verdict: REVISE`).
4. **Both checks pass at HEAD `be39bef353e2498452d5ea083df7ce945d5d853e`.** [Observed]
   - `python3 scripts/check_governance.py` gives `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0. That is the same as rounds 1 and 2.
   - `python3 scripts/check_docs_review_campaign_partition.py --check` exits 0 and prints:
     - `second-method PASS: git ls-files=821; git ls-tree=821; exact path sets equal`
     - `partition PASS: denominator=821; assigned=821; raw=776; other=45; unmatched=0; overlaps=0; campaigns=147`
   - That is one more file and one more raw than round 2's 820/775, which is the retained round-2 raw. The campaign count is unchanged, as expected.

## Findings

**Finding 1 — One quotation ends in a period where the act has a semicolon** (note)
- [Observed] The row has `"No rule for a public repository is relaxed."`. The act has "No rule for a public repository is relaxed; `policyVersion` is the only other value that changes."
- [Observed] `grep -cF` on the quoted string as written, period included, returns 0. Without the trailing period it returns 1.
- [Inferred] The words and the meaning are the act's own. Only the closing punctuation inside the quotation marks differs. A mechanical exact-quote check would miss it. Possible repairs:
  - move the period outside the closing quotation mark;
  - or end the quotation at "relaxed".

**Finding 2 — The quoted refusal trigger is narrower than the installed refusals** (note)
- [Observed] The row gives the third outcome only in the act's words: "A consent record whose kind or pair cannot be read refuses every read".
- [Observed] Policy `sourceVisibility.rule` also refuses for a file "whose effectiveness or pair cannot be read". `source-visibility-gate.ts` refuses every read in three cases:
  - the launch store cannot be read (`:56`);
  - an act record cannot be read (`:59`);
  - a launch record's grant instant cannot be read, "whatever its pair" (`:67`).
- [Observed] It also refuses when the act forms differ from the forms the policy names (`:53`).
- [Inferred] The row says nothing false. It quotes the act, which is the record the row cites, and it does not present the trigger as the only one. A reader who wants the full refusal set must go to the policy, and the policy is the right place for that.
