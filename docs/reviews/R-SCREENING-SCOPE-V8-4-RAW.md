# R-SCREENING-SCOPE-V8-4 — public-source screening scope, version 8 (private sources), round 4
Reviewed commit: 0f2767d2198c02f7131904b55ba35af595fd2ec0
Manifest SHA-256: 19324bf7bcbf7841ec1b7ef8662e825694e2c8ba8e88d21023c3040865ee8401
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`
(round 4, ordered by the owner, item `syzygy-pdja.23-round-4`, answer A). No
observed-repository body, dossier output, run directory, `site/` file, clone
or credential was read; no dossier command and no provider call was made.

**Offer condition.** Four exceptions below (E1 to E4) **require a change**;
the rest are notes. Under the brief's offer condition the package is
therefore **not** offered for signing on this verdict and goes back to the
owner. Every exception is Minor; the round-3 repairs answer their findings.

Abbreviations: `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`;
`PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`;
`POLICY` = `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
(version-7 bytes on disk at the reviewed commit);
`BUILDER` = `scripts/build_public_source_screening_scope_v8.py`;
`DOSSIER` = `packages/polaris-dossier/src`;
`LAUNCH` = `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
at `913c6b7d` (read with `git show`, read only).

## Mechanical results (re-run this session at the reviewed commit)

- `git rev-parse 0f2767d2` = the commit above = the worktree HEAD; a scratch
  clone was checked out at the same commit for every run below.
- `python3 BUILDER --check`: "public-source-screening-scope-v8: patch and
  manifest current" (worktree and scratch clone).
- `--digests`: one row, `35d23d19…`, `[variant: pv]` (the act argument, not
  the head digest).
- `--manifest-digest` printed the digest in the head; `sha256sum` of
  `PKG/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` printed the same value
  (two methods).
- `--selftest`: "47 of 47 passed".
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- Each of the nine `RULE_PHRASES` (BUILDER:306-309) occurs exactly once in
  `SOURCE_VISIBILITY["rule"]` (counted by script), so each drop case's
  `replace(..., 1)` removes the only copy.
- Rule-6 probes (mutated builder copies in the scratch clone, restored after
  each):
  - P1, phrase loop cut to `RULE_PHRASES[:-2]`: exactly "FAIL a rule without
    'whose effectiveness or pair cannot be read' is found" and "FAIL a rule
    without 'including one that cannot be read at all' is found", 45 of 47.
  - P2, the exact-once edit check (BUILDER:371) disabled: 12 cases fail,
    among them "a reverted edit at contentClassification.indeterminate" and
    "edit 7 narrowed back to detector matches is found", 35 of 47.
  - P3, the exact-once check disabled for the `indeterminate` path only:
    exactly "FAIL a reverted edit at contentClassification.indeterminate
    ('Its path, object id and size remain code') is found", 46 of 47.

## Criterion 1 — round-3 dispositions

| # | Repair answers the finding? | Locations and claims true at the commit? |
|---|---|---|
| 1 | Yes for the pages-and-egress route: edit 7 (PATCH:35) now names every screening outcome the dossier screen can produce, and edit 8 (PATCH:40) amends `indeterminate`. The restated residual is still incomplete (E4) and the "stays only in its exclusion record" clause is untrue (E2) | [Observed] `DOSSIER/check-derive.ts:257-258` nulls `objectId` only for a path detector match; `DOSSIER/screen.ts:156-158` returns `denied-path` before `detectSecrets`. True |
| 2 | Yes. PATCH:25 names both fail-closed exceptions; the four-site list is punctuated with semicolons | True |
| 3 | Yes. `PKG/SEMANTIC-DELTA.md:146-148` and `PKG/IMPACT-LEDGER.md:197-199` except edits 7 and 8 | True |
| 4 | Partly. The phrase is adopted and pinned, and the cost is disclosed, but the definition's population is still open (E1) | PATCH:24; BUILDER:306-309; consequence PATCH:28 (last sentence); packet `PKG/OWNER-DECISION-PACKET.md:89-93`. True |

The dispositions' selftest count (`PKG/ROUND-3-DISPOSITIONS.md:17`, "47 of
47 (4 controls, 43 mutations)") matches the run.

## Exceptions

### E1. The refusal's definition does not say which files are records, so an unreadable file of unknown kind can still be ignored — Minor, **requires a change** [Inferred]

PATCH:24: "An observation consent record whose effectiveness or pair cannot
be read, meaning any record not shown to be revoked or superseded whose pair
is not read, including one that cannot be read at all, could concern any
pair, so while one exists every read under this scope is refused".

A file that "cannot be read at all" cannot be shown to be an *observation
consent* record. [Observed] LAUNCH:17-21 puts three kinds of launch consent
record on the same dedicated reference (the observation consent record, the
drawer statement, the provider statement; "none SHALL be read as another"),
and LAUNCH:23 says the reference's commit tree holds them "under
`.syzygy/governance/decisions/`", the directory that also holds every other
decision record. The sentence admits two readings:

- the head noun governs ("an observation consent record … meaning any [such]
  record"): an unparseable file under that directory is not shown to be an
  observation consent record, so the rule does not reach it and it is
  ignored. If it was a private fork's record of a public pair, the pair
  reads public: the fail-open case round-3 finding 4 named, moved from
  "effective-looking" to "observation consent";
- the gloss governs ("any record … whose pair is not read"): then every
  pairless record (most acts and decision records) refuses every read,
  which no implementer will adopt, so the reader falls back to the first
  reading.

Required (one phrase): name the population, for example "any file at the
location where observation consent records are read (for a launch record,
the dedicated reference's record location) whose kind, effectiveness or pair
cannot be read". The same wording is restated at `PKG/SEMANTIC-DELTA.md:54-58`
and `PKG/IMPACT-LEDGER.md:55-58`.

### E2. "They stay only in that blob's exclusion record (RFC5-17)" is not true of the exclusion records this scope keeps unchanged — Minor, **requires a change** [Observed text; Observed code]

Edit 7 (PATCH:35) and `consequence` (PATCH:28) say the withheld object id
and size "stay only in that blob's exclusion record in the run directory
(RFC5-17)"; `PKG/SEMANTIC-DELTA.md:137` adds "as RFC5-17 requires".

- RFC5-17 (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md:300-302`):
  "an excluded item is recorded as (content digest, location reference,
  policy version, redaction class)". It names no object id or size, and
  requires neither.
- POLICY:537-543 (`matchAction.retainedFields`: contentDigest,
  repositoryRelativePath, policyId, policyVersion, detectorId) and
  POLICY:550-556 (`unclassifiableExclusion.retainedFields`, the same with
  exclusionReason) retain neither, and `unchanged` (PATCH:26) says both
  apply to a private repository "exactly as to a public one". A denied-path
  blob is never read, so it has no content digest at all.
- [Observed] The run directory holds the object id in other records: the
  check record writes `citedBlobs` (`DOSSIER/check.ts:115`, written at
  `:255`), and the fidelity review packet writes `objectId` for an excluded
  span (`DOSSIER/review-packet.ts:150`, written by `writePacket` at `:184`).

So the clause either adds two fields to exclusion records that `unchanged`
keeps exactly, or is false. Neither reading changes exposure, but the bytes
are signed and cannot be corrected later. Required: "they stay only in the
run directory (and the operator's clone)", without the exclusion-record and
RFC5-17 attribution, at PATCH:28, PATCH:35, `PKG/SEMANTIC-DELTA.md:104-105`
and `:137`, and `PKG/IMPACT-LEDGER.md:67-68`.

### E3. The ledger's install list misses two sites that the signed text reaches — Minor, **requires a change** (ledger prose; no digest moves) [Observed]

`PKG/IMPACT-LEDGER.md:66-83` lists the grounds as screening exclusions only
and asks that the object id be dropped "for every excluded private blob".
The signed text is wider: "excluded or withheld on any ground" (PATCH:35),
and the packet says "every file that is withheld, for any reason"
(`PKG/OWNER-DECISION-PACKET.md:43-44`). Two sites an installer following
the ledger would leave unchanged:

- the class-gate withholding: a blob screening admits but whose class the
  consent does not name gets a source-population row with its `objectId`
  (`DOSSIER/render.ts:392`, reason `body-not-retained-for-generation`, row
  at `:395`) and a discovery row showing `object <algorithm>:<id>`
  (`DOSSIER/render.ts:676-679`), and the review packet carries its object id
  (`DOSSIER/review-packet.ts:133`);
- the review packet's excluded spans (`DOSSIER/review-packet.ts:150`): a
  `denied-path` span keeps its object id (the existing fixture
  `DOSSIER/review.test.ts:206` expects `.env`'s). [Inferred] The delta
  (`PKG/SEMANTIC-DELTA.md:140`) says such a packet is not an egress Syzygy
  makes; it is still a run-directory record handed to an agent session, so
  it is either an install site or a stated residual.

Required: name both sites and the class-gate ground in the ledger's "Object
ids and sizes" bullet, with fixtures.

### E4. The restated residual still omits the pinned commit id, a whole-tree digest rendered on every page — Minor, **requires a change** [Observed code; Inferred reach]

`consequence` (PATCH:28): "What is left: the run directory itself and the
operator's clone, which holds every object id, so whoever can read either
can still confirm a guess; and a secret no detector matches …". The same
list is at `PKG/SEMANTIC-DELTA.md:137` ("What remains, stated rather than
removed") and `PKG/OWNER-DECISION-PACKET.md:84-88` ("What remains").

[Observed] Every discovery row renders `revision ${pinned}`, the full commit
id (`DOSSIER/render.ts:679`); LAUNCH:178 states the pinned revision "in full"
with its committer date; the launch record carries it, and
`consentRecordMetadata` (PATCH:29) discloses commit ids as tracked objects.
[Inferred] A commit id is a digest of the commit header and the root tree
id, which is a digest of every entry's object id, the withheld blob's
included. A guesser who knows the rest of the tree (the private fork of a
public upstream that `consequence` names) and the commit header can confirm a
guessed secret against the rendered commit id offline, by the reasoning
`consequence` itself gives for the object id. It needs more knowledge than
the object id did (the author, both dates, the message, the parent), so it is
a narrower oracle, but it is one the list says does not exist, and the commit
id cannot be withheld. [Inferred] Tree ids are not code-structure (the scope
admits blobs: `sourceAdmission.discoveryMode`
"all-tracked-blobs-at-admitted-commit", POLICY:40) and the dossier renders
none ([Observed] no tree id in `DOSSIER/render.ts`), so the commit id is the
only such digest found.

Required (one clause at the three sites): add the pinned commit id, rendered
and recorded, as a residual oracle for a guesser who also knows the commit
header and the rest of the tree.

## Criterion 2 — edits 7 and 8

- Every screening outcome the dossier screen produces is named by edit 7:
  `denied-path`, `secret-detector-match`, `unknown-extraction-class`
  (`DOSSIER/screen.ts:156-158`), `active-content` (`:170`), `not-utf8-text`
  (`DOSSIER/check-derive.ts:241`), with "or any other exclusion" as
  catch-all. The class-gate withholding is covered by "withheld on any
  ground" in the signed text but not by the ledger (E3). No ground is
  missing from the policy text. [Observed]
- Edits 7 and 8 agree: edit 8 (PATCH:40) defers to "the code-structure
  rule" for private repositories, and `unchanged` and `privateSourceRules`
  name both (PATCH:25-26). [Observed]
- `targetMetadataRule` carries no object id (fields `sourceId`,
  `classificationBasis`, `excluded`, `reason`); no conflict. [Observed]
- RFC5-17: no conflict over rendering; the attribution of where the values
  stay is wrong (E2).
- Public repositories: both edits are conditioned on "a repository whose
  visibility is private (sourceVisibility)"; nothing changes for a public
  repository except through the named joined-pair exception. [Observed]

## Criterion 3 — the refusal

Fail closed for a record whose kind is known (E1 for one whose kind is not).
The cost is disclosed truthfully at PATCH:28 (last sentence),
`PKG/SEMANTIC-DELTA.md:61-64`, `PKG/IMPACT-LEDGER.md:55-58` and
`PKG/OWNER-DECISION-PACKET.md:89-93`: one malformed launch record stops every
run, redis included; availability only. [Observed] The requests/redis reader
already refuses the whole read on an unknown form
(`packages/polaris-generation-consent/src/package-reader.ts:30-32`), so the
practical reach is the launch reference.

## Criterion 4 — residual statements

True except E4 (the commit id) and E2 (where the values stay).

## Criterion 5 — rule 6

Each new case fails for the reason it names (P1-P3 above). The edit-8
revert is the generic per-edit revert case; P3 shows it is killed alone.

## Criterion 6 — regressions

No round-3 repair relaxes a rule: the clause-level diff of the patch's added
lines against `fa258a05` changes only the refusal definition (adds "ignore
it" to what the scope does not do), `privateSourceRules`, `unchanged`,
`consequence`, edit 7 (widened) and edit 8 (new). No public rule changes
beyond the two fail-closed exceptions PATCH:25 names. [Observed]

## Owner answers in the packet

Faithful in substance to the record in commit `8a4e624b`
(`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md`;
that commit is not an ancestor of the reviewed commit, and was read with
`git show`): item
`syzygy-pdja.23-provider-statement` B, item `syzygy-pdja.23-confidence` C
(the hold on launch-consent spec 1.1), retention A; the submission time
12:24:33Z matches. Two small losses are notes N3.

## Notes (no change required)

- N1 [Observed] BUILDER:541, "An extra (eighth) edit": EDIT_COUNT is now 8
  (BUILDER:313), so the extra edit is the ninth. Stale comment from round 3
  (`fa258a05` had `EDIT_COUNT = 7` at line 295 beside the same comment).
- N2 [Observed] `PKG/ROUND-3-DISPOSITIONS.md:7-8`, "No review brief for a
  round 4 is written", is false since this commit wrote one; true as
  history when written.
- N3 [Observed] `PKG/OWNER-DECISION-PACKET.md:137-140` gives the retention
  answer without its item id (`syzygy-pdja.23-retention`) and drops "revisit
  after the first private runs"; `:131-134` says "the name goes onto that
  branch" where the record says "its name and URL". The packet says "recorded
  here as you gave them" (`:115`); these are paraphrases.
- N4 [Observed] PATCH:24 uses "cannot be read" twice: in the first sentence
  ("a record that states private, states nothing, or cannot be read" →
  private) and in the refusal ("including one that cannot be read at all" →
  refused). A wholly unreadable record meets both; the refusal is stricter
  and leaves no read, so both fail closed. `PKG/IMPACT-LEDGER.md:42-44`
  ("including an unreadable record, is private") reads as if private were
  the whole outcome; `:56-58` gives the refusal.
- N5 [Observed] PATCH:25 says "except at four sites" and folds edit 8 in as
  "which indeterminate follows"; the patch edits five scope paths for this
  purpose. Accurate as written, easy to miscount.
