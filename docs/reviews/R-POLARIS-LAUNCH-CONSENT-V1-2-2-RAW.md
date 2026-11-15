Review: R-POLARIS-LAUNCH-CONSENT-V1-2-2
Reviewed commit: 82399c9b1affa858f6defbfa7cd5f7f7f910b54e
Manifest SHA-256: 5f576e421a0e2ae84047a96922b3488008f87084657c26b1989ea67c583552fc
Verdict: REVISE
Package: polaris-dossier-launch-consent

Reviewer: fresh-context reviewer, read-only. I worked on a detached worktree of the reviewed commit, with TMPDIR under `/home/orca/.tmp/reviews/`. I edited no tracked file, ran no dossier, read no observed-repository body, made no provider call and fetched nothing external. The worktree and the temp directory were removed afterwards.

Subject. [Observed] I ran `sha256sum` on the installed v1.1 spec and got `95172020bcae70cbfc6d5f6b9e9ad750b7e8da0e634a60017fe7e96845eee4a7`. I applied `proposed/spec.md.patch` with `git apply`; the patch hashes to `5494bb07…`. The post-apply spec hashes to the digest in the head above. All three values equal `PROPOSED-SUBJECTS.json`. `git diff --stat`: 1 file, 131 insertions, 16 deletions. Line numbers below are those of the post-apply spec (360 lines).

## Summary of what holds

- [Observed] Criterion 4.
  - The derivation span, from "The derived identity is taken" to "the operator may give the identity option on any launch.", is byte-identical before and after. It is 830 bytes and occurs once in each file.
  - The rule, applied by script, yields `repository:redis-redis` (https and ssh forms), `repository:psf-requests`, `repository:tzeusy-org-syzygy`, `repository:sub-tool`, `repository:a-b` (both `git://` and `http://`) and `repository:c-d` (both the https and scp forms of the new "Consent found by its upstream URL" scenario). Each matches its scenario.
- [Observed] Criterion 8.
  - `SEMANTIC-DELTA.md` holds 16 `~~~~text` blocks. Every paragraph in them occurs verbatim in the v1.1 or the post-apply bytes: 0 misses.
  - All 54 paragraphs that are new in the post-apply spec appear in those blocks.
  - Each of the 16 spec quotations in `ROUND-1-DISPOSITIONS.md` occurs in the post-apply spec at the line the page gives (9, 11, 17 ×3, 21, 37, 223, 238 ×2, 244, 246, 247, 248, 250, 252).
- [Observed] Criterion 9. I re-ran the seven published forms (Python `re`, IGNORECASE, OR'd together) at `715c59c4` over four of the six populations, and all four reproduce: specs 9 / 1, decisions 217 / 13, policies 12 / 3 (the three files named) and declarations 2 / 1 (the registry entry). I did not re-run the design/proposal and v8/write-consent populations; round 1 reproduced them. The "pins" predicate is now stated and every hit file is listed with its reason.
- [Observed] Criterion 13.
  - Before apply, `--check` passes for v1.0 ("applied"), v1.1 ("applied") and v1.2 ("unapplied").
  - `--selftest` passes for v1.0 (25 fixtures), v1.1 (30) and v1.2 (31), each with 0 failing.
  - `record_versioned_signoff.py --selftest` passes 175 fixtures, 0 failing.
  - After apply with no v1.2 record, all three builders' `--check` fail with "the tree carries the v1.2 patch, which no sign-off record covers".
  - `check_governance.py` on the applied tree: 32 OK, 21 WARN, 0 FAIL.
- [Observed] Criterion 2.
  - Ruling 1 lands in the question (line 11), the recorded scope (line 21) and the launch output, run record and pages (line 247).
  - Ruling 2: `SEMANTIC-DELTA.md` (around line 407) records that the pinned-tree copy was the recommended option and was not chosen.
  - Ruling 3 lands at line 15, with the shared-records consequence stated.
  - Ruling 4: the scheme list in the derivation is unchanged.
  - D6's typed `http`/`git` reading is labelled "[Inferred — the coordinating session's reading … not the owner's words.]" (`SEMANTIC-DELTA.md:486`) and is put to the owner as item 1 of `OWNER-SIGNOFF.md` "Before you sign".
- [Observed] Criterion 14, per round-1 finding.
  - Finding 1 is resolved for the reads listed; Finding 3 below is a gap the repair left.
  - Finding 2 is resolved: line 17 states the effect, "adds … never restricts", and "By URL alone".
  - Finding 3 is resolved at lines 11, 21 and 247, but see Finding 1 below for which runs it reaches.
  - Findings 4 and 10 are carried to the owner, each with a reason (sign-off items 3 and 2).
  - Finding 5 is resolved: admitted, attributed and flagged.
  - Finding 6 is repaired, but the repair adds a read the closed lists do not name (Finding 3 below).
  - Findings 7, 9, 11 and 12 are resolved.
  - Finding 8 is repaired, but the repair adds a false sentence (Finding 2 below).

## Findings

**Finding 1 — REQ-047's unchanged "changes nothing else for it" exempts every run at a consented HEAD, repeat launch runs included, from the new clone-form, closed-list and disclosure rules, and conflicts with the falsifier for a mixed run** (revise)

- [Observed] Line 238 (unchanged from v1.1) says: "a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it."
- [Observed] Version 1.2 puts all of the following into REQ-047, after that sentence:
  - the clone-form admission (line 244);
  - the closed read list with the delta-base allowance (lines 246–250);
  - the delta-base statement for the launch output, run record and pages (line 247);
  - the working-tree statement and the history instruction to every brief and packet (line 252).
- [Inferred] So none of those binds a run whose HEAD an in-force consent names, and that includes a launch observation consent ("whichever act made it"). Every repeat launch run is such a run.
  - The scenario "Self-observation keeps the trunk tip stable" (lines 189–193) describes exactly that case: its second run "finds the in-force record and asks nothing".
  - On a full clone, that second run therefore has no rule requiring it to:
    - disclose delta-base reconstruction (ruling 1: "the run discloses it");
    - send the history instruction to its sessions (ruling 2);
    - carry the working-tree statement.
  - Nothing permits the delta-base read under 047 either, so 033's "Git object read by object identifier at the pinned revision" alone governs it.
  - Every new REQ-047 scenario that exercises a full clone requires "whose pinned commit no in-force consent names" (line 296), so no scenario reaches a repeat run.
- [Observed] There is a mixed case. A run at a HEAD the redis consent names may still record a launch provider or drawer statement (REQ-046, lines 9 and 25). It is then "launch-consented" under the preamble's definition (line 3: "relies on or records any launch consent record").
  - Line 244 says: "For a launch-consented run, Syzygy SHALL accept the operator's clone in whatever form holds the pinned revision".
  - Line 252 keeps the stated form only for "a run that relies on no launch consent record", and the scenario at line 340 is limited the same way.
  - The falsifier's last arm (line 349) says: "a run relying on another act's consent that states the clone's form is admitted in another form".
  - [Inferred] So for this run, line 244 and the falsifier contradict each other, and line 238's "nothing else" contradicts both.
  - The owner page goes further than the spec: "The redis consent … keeps that rule for runs made under it" (`OWNER-SIGNOFF.md`, end of "What it costs"). The spec keeps the rule only for runs relying on no launch record.
  - D1 "What does not move" (`SEMANTIC-DELTA.md:236-239`) also states it without the condition.
- Repair I would accept:
  - Narrow line 238's exemption to the pin, for example "changes nothing else in how the revision is pinned". Then state that lines 244–252 bind every launch-consented run, whichever branch pinned its revision.
  - State the mixed case one way:
    - either another act's consent that states the clone's form binds every run relying on it, launch records or not, and line 244 and the D1 sentence say so;
    - or that form yields when a launch record is recorded, which reaches a performed act's stated scope and is the owner's to decide.
  - Align line 252, the scenario at line 340, the falsifier arm and the owner page sentence with the choice.
  - Add a scenario: a repeat run on a full clone at a launch-consented HEAD carries the delta-base, working-tree and history statements.

**Finding 2 — "Syzygy reads none of it" is false under the package's own closed list** (revise)

- [Observed] Line 11 (question, added by this patch) requires the question to state "that no consent covers what the clone holds beyond the pinned revision, and that Syzygy reads none of it".
- [Observed] Line 37 (run record and pages, added in the round-1 Finding 8 repair) requires them to state "everything the clone holds beyond the pinned revision … which no consent covers and of which Syzygy read none".
- [Observed] The same change makes Syzygy read things beyond the pinned revision:
  - "the names of the clone's references" and the values of `HEAD`, the trunk references, "the local branch of the remote default's name" (line 248);
  - the configuration file and the Git-directory locator files (line 249);
  - the pack indexes for the whole store (lines 238 and 246);
  - "the stored bytes of the delta's base, whichever object they belong to" (line 247).
- [Observed] Line 21's qualified scope permits that delta-base inflation under the launch observation consent. So "no consent covers" also sits uneasily with the record's own scope.
- [Observed] The owner page repeats the claim: "Syzygy reads none of it, but the agent sessions can read everything in a full clone".
- [Inferred] Under VIS-2, the consent question and every page would state as fact something the specified behaviour contradicts. This is the same class of defect as round-1 Finding 3 ("and nothing else"), introduced by the round-1 Finding 8 repair.
- Repair I would accept:
  - At lines 11 and 37 and on the owner page, replace "reads none of it" with a sentence bounded to content. For example: Syzygy reads none of it as content; beyond the pinned tree it reads only the reference names and values, the configuration lines and the Git-directory files REQ-047 lists, and delta-base bytes inflated only to rebuild objects of the pinned tree.
  - Reconcile "no consent covers" with line 21's allowance.
  - Add a falsifier arm for the statement's accuracy.

**Finding 3 — The round-1 Finding 6 repair adds a read that neither closed list names, so a conforming `--revision` refusal trips both falsifiers** (revise)

- [Observed] Line 238 (new): "A reference that names an object other than a commit, an annotated tag included, SHALL be refused, naming `--revision`, after Syzygy reads at most that one object's type".
- [Observed] REQ-047's closed list (line 244: "Syzygy's reads of it for the run are only these") does not name that read:
  - objects are only "the pinned commit object, its root tree and the trees and blobs reachable from it";
  - Syzygy "SHALL read … no object reached only from another commit, a branch, a tag" (line 246);
  - and "nothing else in the Git directory" (line 250).
- [Observed] REQ-046's pre-answer list (line 9) names the same objects only. The refusal happens "before asking for consent".
- [Observed] The falsifier arms collide:
  - line 223: "before the answer Syzygy reads anything the pre-answer list does not name";
  - line 349: "Syzygy reads … an object reached only from another commit or reference".
  - Either is tripped by the type read that line 238 requires. Line 349 also forbids only "more than its type", so the arms disagree with each other too.
- [Observed] The same gap holds for a full or abbreviated identifier that resolves to one stored non-commit (a tree or blob). "A name that resolves to no commit … SHALL be refused" needs that object's type, and line 238's type allowance covers only "a reference that names" one.
- [Inferred] In a pack, an OFS_DELTA or REF_DELTA entry's header gives the delta type, not the object type. Learning "that one object's type" can therefore mean walking that entry's base chain. The pack-storage allowance (line 247) is limited to "an object of that scope", and the non-commit is not one.
- [Observed] The registry entry's `readAuthority` (line 139) admits "the pinned commit, its root tree and the trees and blobs reachable from it" only. This type read is beyond that list too, and so beyond the reading the owner is asked to agree with in sign-off item 3.
- Repair I would accept:
  - Name, in both the line 246–250 list and the line 9 pre-answer list, the type read of the one object a `--revision` reference or identifier resolves to when it is not the pinned commit. Include any base-chain headers needed to learn that type, used for nothing else and never inflated beyond the header.
  - Carve that read out of the line 349 arm and the line 223 arm.
  - Put the registry point to the owner in "Before you sign" item 3.

**Finding 4 — The scp-form clause reads ambiguously** (note, editorial)

- [Observed] Line 17: "the scp form, an optional user name and `@`, a host holding no `/`, `:` and a path that does not begin with `//`".
- [Inferred] The `:` reads as a second character the host must not hold, not as the separator.
- Repair I would accept: "a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`".

**Finding 5 — "Values only of" the listed references cannot hold for `packed-refs` read as file data** (note, editorial)

- [Observed] Line 248 reads "the values only of `HEAD` and the reference it names, …, each read as file data from the loose reference files and `packed-refs`".
- [Inferred] Reading `packed-refs` as file data reads every packed reference's value. Reading the names "of the clone's references" from it does the same.
- Repair I would accept: say that the values of other references may be read as bytes of `packed-refs` but are used for nothing, matching the delta-base form.

**Finding 6 — The delta's "What does not change" claims something new for runs the spec preamble says keep every meaning** (note, editorial)

- [Observed] `SEMANTIC-DELTA.md:648-650` says a run "that relies on no launch consent record keeps every predecessor requirement's bytes … One thing is new for it: a consent made by another act now also matches by its normalised `Upstream:` URL".
- [Observed] Spec line 3 says a run at another act's consented HEAD "that neither relies on nor records a launch consent record, keeps every predecessor requirement's bytes and meaning".
- [Inferred] The URL match acts only through REQ-046's question. A run that records nothing asks nothing, so nothing is new for it. The delta's population ("relies on no launch consent record") also includes first launches, which record one.
- Repair I would accept: bound the delta sentence to runs that ask the REQ-046 question.
