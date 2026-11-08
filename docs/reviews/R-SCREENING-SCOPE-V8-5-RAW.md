# R-SCREENING-SCOPE-V8-5 — public-source screening scope, version 8 (private sources), round 5
Reviewed commit: b311bdbf574664911521c9243a61adc6cb7513b3
Manifest SHA-256: be9ea5ee494fa7b784c6d800f175988926b57429bcc05b2d109cb3eb88f6b927
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`
(round 5, scoped, ordered by the owner: "Round 5, scoped (Recommended)"). No
observed-repository body, dossier output, run directory, `site/` file, clone
or credential was read; no dossier command and no provider call was made.

**Offer condition.** One exception below (X1) **requires a change**; the rest
are notes. Under the brief's offer condition the package is therefore **not**
offered for signing on this verdict and goes back to the owner. X1 is Minor.
E2, E3 and E4 of round 4 are answered; E1 is answered for the two readings
round 4 named, and X1 is the residue of the population it chose.

Abbreviations: `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`;
`PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`;
`POLICY` = `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
(version-7 bytes on disk at the reviewed commit);
`BUILDER` = `scripts/build_public_source_screening_scope_v8.py`;
`DOSSIER` = `packages/polaris-dossier/src`;
`LAUNCH` = `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
at `913c6b7d` (read with `git show`, read only).

## Mechanical results (re-run this session at the reviewed commit)

- `git rev-parse HEAD` in the worktree = the commit above; a scratch clone was
  checked out at the same commit for every run below.
- `python3 BUILDER --check`: "public-source-screening-scope-v8: patch and
  manifest current" (worktree and scratch clone).
- `--digests`: one row, `[variant: pv]` (the act argument, not the head
  digest).
- `--manifest-digest` printed the digest in the head; `sha256sum` of
  `PKG/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` printed the same value
  (two methods).
- `--selftest`: "50 of 50 passed", matching `PKG/ROUND-4-DISPOSITIONS.md:28`.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- Each of the twelve `RULE_PHRASES` (BUILDER:313-317) occurs exactly once in
  `SOURCE_VISIBILITY["rule"]` (counted by script), so each drop case's
  `replace(..., 1)` (BUILDER:574-577) removes the only copy.

## Criterion 6 — rule 6 (run first; the other criteria rely on it)

Mutated builder copies in the scratch clone, restored after each:

- P1, the checker's phrase loop (BUILDER:395) cut to `RULE_PHRASES[:-3]`:
  exactly "FAIL a rule without 'a drawer or provider statement included' is
  found", "... 'whose kind cannot be read' ..." and "... 'with that file
  named' ...", 47 of 50.
- P2-P4, the checker's loop skipping one new phrase at a time: each run fails
  exactly that phrase's case and no other, 49 of 50 each.

Each new case fails for the reason it names: the drop removes the phrase, and
only the `lost {phrase!r}` finding from the checker kills it. [Observed]

## Criterion 1 — round-4 dispositions

| # | Repair answers the finding? | Quoted locations and claims true at the commit? |
|---|---|---|
| E1 | Yes for the two readings round 4 named: the population is now named (PATCH:24), so an unreadable file of unknown kind there refuses, and a readable drawer or provider statement does not. The population chosen leaves X1 | [Observed] PATCH:24; BUILDER:125-131, :316-317; `PKG/SEMANTIC-DELTA.md:54-64`; `PKG/IMPACT-LEDGER.md:57-71`; packet `PKG/OWNER-DECISION-PACKET.md:96-102`. True |
| E2 | Yes. The RFC5-17 attribution is gone from PATCH:28, PATCH:35, `PKG/SEMANTIC-DELTA.md:109-112` and `:143`, and the ledger (`PKG/IMPACT-LEDGER.md:77-84`) | [Observed] `DOSSIER/check.ts:115` writes `citedBlobs`; `DOSSIER/review-packet.ts:133` and `:150` carry `objectId`. True. The inventory check record writes the same `citedBlobs` (`DOSSIER/inventory.ts:304`), also a check record, so "check records" (plural) covers it. Size: see N1 |
| E3 | Yes. Both sites and the class-gate ground are named, with fixtures | [Observed] `DOSSIER/render.ts:392` (reason), `:395` (row), `:679` (detail); `DOSSIER/review-packet.ts:133`, `:150`; `DOSSIER/review.test.ts:206` (`.env`, `denied-path`, `objectIds['.env']`). True |
| E4 | Yes. The commit id is named at all three sites | PATCH:28; `PKG/SEMANTIC-DELTA.md:143`; `PKG/OWNER-DECISION-PACKET.md:88-92`. True. A further rendered digest is N2 |
| N1 | Yes | BUILDER:549 "(ninth)". True |
| N2 | Yes, dated in place, sentence kept | `PKG/ROUND-3-DISPOSITIONS.md:9-10`; `git show --stat 0f2767d2` touches `PKG/REVIEW-BRIEF.md`. True |
| N3 | Yes for answers 2 and 3 | Record at `8a4e624b`, lines 76 ("C. Only the name-on-branch warning"), 79 ("its name and URL"), 89 ("A. No retention rule for now; revisit after the first private runs"). Quotes match. Two leftovers: N4 |
| N4 | Yes | `PKG/IMPACT-LEDGER.md:44-45`. True |
| N5 | No change, as dispositioned | — |

## Exceptions

### X1. The launch records' location holds more than launch records, so "whose kind cannot be read" decides between refusing every run and ignoring an unrecognised file — Minor, **requires a change** [Inferred]

PATCH:24: "Every file at a location where observation consent records are read
counts as a possible one: for launch consent records, every file at the
launch records' location on the dedicated reference, a drawer or provider
statement included; ... Any such file not shown to be revoked or superseded
whose kind cannot be read, or that reads as an observation consent record
..., could be a record of any pair, so while one exists every read under this
scope is refused".

- [Observed] LAUNCH:23: "the commit's tree on that reference SHALL hold the
  records under `.syzygy/governance/decisions/`". LAUNCH:29: the write
  consent names "the dedicated reference and the location in its tree";
  "Every recording commit adds new files only". RFC3-7, quoted at
  `openspec/changes/polaris-dossier-launch-consent/design.md:23` (at
  `913c6b7d`): "**Consent records** are governance acts stored in
  `.syzygy/governance/decisions/`". The write-consent instance that would fix
  the location is not drafted (record at `913c6b7d`,
  `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md:109-110`:
  "The write-consent instance is drafted, reviewed and offered to the owner
  as its own act").
- [Inferred] Nothing in LAUNCH requires the dedicated reference's tree to hold
  only launch records. A branch under `refs/heads/` started from the trunk
  carries the whole decisions directory: every act, direction, register and
  `launch-gate/` file. Under PATCH:24 each of those is "a possible one".
- The generic launch form reads three kinds (LAUNCH:21, "none SHALL be read as
  another"). It has no reader for an owner act, a direction or a register, so
  for such a file "its kind" can be read only as "not a launch record". That
  is also the only thing it can say about a truncated or garbled launch
  record. The text gives no way to tell "kind read as something else" from
  "kind cannot be read". Two readings result:
  - every non-launch file at that location is of unreadable kind, so every
    read under the scope is refused, always. That contradicts the cost the
    text discloses (PATCH:28, "one malformed or unreadable file written
    there"), and no implementer will adopt it;
  - a file the launch form does not recognise has a readable kind ("other")
    and is ignored. Then a malformed launch record is ignored too, and a
    private fork's record of a public pair is lost: the fail-open that round 3
    finding 4 and round 4 E1 named.
- The existing act-form reader shows how much work this phrase hides. It
  separates the two cases by a folded stem match over every file under the
  decisions directory (`packages/polaris-generation-consent/src/package-reader.ts:19-24`),
  and calls that "a backstop ... not a parser". The launch form has no
  defined stem.

Round 4's suggested wording ("the dedicated reference's record location",
`docs/reviews/R-SCREENING-SCOPE-V8-4-RAW.md:94-96`) did not weigh this. The
repair copied it, so the gap came with it.

Required (one phrase at PATCH:24, restated at `PKG/SEMANTIC-DELTA.md:56-58`,
`PKG/IMPACT-LEDGER.md:58-60` and the packet's `:96-99`): bound the
population to files whose kind the location fixes. For example: "every file
a recording commit on the dedicated reference added (LAUNCH: new files
only), a drawer or provider statement included". Or: state that the launch
records' location holds launch consent records only, so any other file there
is of unreadable kind. Either way, a well-formed decision record the trunk
carries is not a candidate, and an unrecognised file a recording commit
added still refuses.

## Criterion 2 — the refusal (E1)

- An unreadable file of unknown kind at the location refuses, on PATCH:24's
  words, as long as "the location" holds only launch records. Where it holds
  more, see X1. [Inferred]
- A readable drawer or provider statement does not refuse. It is neither "of
  unreadable kind" nor something that "reads as an observation consent
  record". [Observed] PATCH:24. The narrowing from round 4's gloss ("any
  record ... whose pair is not read") to observation consent records is
  intended (round 4 E1, second reading). It relaxes nothing that decides
  visibility, since only an observation consent record carries visibility
  (PATCH:24, the carriers). [Inferred]
- Act forms: "each act file named above". The two named act files are the
  only carriers of public by form. An unreadable bound instance makes its act
  "an observation consent record whose effectiveness ... cannot be read", so
  it refuses. The code is stricter still: it sweeps every decisions file by
  stem (`package-reader.ts:19-24`). [Observed]
- Cost: disclosed truthfully at PATCH:28 (last sentence) and
  `PKG/OWNER-DECISION-PACKET.md:96-102`. The delta's sentence lags (N5).

## Criterion 3 — where the values stay (E2, E3)

- True of the code for the object id. [Observed] `DOSSIER/check.ts:115` and
  `DOSSIER/inventory.ts:304` write `citedBlobs`. Their `objectId`
  (`DOSSIER/check-model.ts:96`) is null only for a path a secret detector
  matches (`DOSSIER/check-derive.ts:258`). The fidelity packet carries
  `objectId` at `DOSSIER/review-packet.ts:133`, `:136-146` and `:150`, and is
  written only under the run's `reviews/` (`:181-187`). No egress call appears
  in `DOSSIER/review.ts` or `DOSSIER/review-packet.ts` (swept for `egress`;
  none). The size: N1. Refusal output: N3.
- Consistent with `matchAction` and `unclassifiableExclusion`
  (POLICY:534-558, `retainedFields` unchanged), with `unchanged` (PATCH:26),
  and with RFC5-17 (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md:300-302`,
  "(content digest, location reference, policy version, redaction class)").
  The policy no longer claims RFC5-17 holds either value. [Observed]
- The reason given for not moving them (`PKG/SEMANTIC-DELTA.md:143`) is sound.
  Moving them would add fields to two lists that `unchanged` keeps exactly. A
  denied-path blob is never read (`DOSSIER/screen.ts:156-158`), so it has no
  content digest to anchor a record. [Observed]
- Install sites: the ledger now names every page site the signed text reaches
  in `DOSSIER/render.ts`. [Observed] A sweep of `objectId` over the
  non-test files in `DOSSIER` found writes only at `check-derive.ts:255`,
  `:258`, `:315`, `:333`, `render.ts:378`, `:395`, `:438`, `:679`,
  `review-packet.ts:133-150` and the `git-object-reader.ts` refusal. Of the
  render sites, `:378` and `:438` reach admitted blobs only (`:440`
  filters out `exclusion.excluded`).

## Criterion 4 — residual statements (E4)

`consequence`, the delta and the packet are now true about the commit id.
Further digests that are rendered and cover a withheld private blob:

- the fidelity packet's sha256. It is rendered at `DOSSIER/render.ts:720` and
  `:752` and recorded at `:238`. The packet carries the withheld span's
  object id. N2 explains why this adds no oracle beyond the run-directory
  residual already stated.
- no tree id is rendered (round 4, confirmed), and no other digest of an
  excluded blob is rendered. `excludedSourceId` is keyed by run and path
  (`DOSSIER/render.ts:387`). [Observed]

## Criterion 5 — the two unrequested wording changes

- `privateSourceRules` (PATCH:25): "a file that could be a record of any pair
  (its kind, effectiveness or pair unread) refuses every read". It widens the
  summary to match the widened rule (kind added). It relaxes nothing. "Unread"
  is looser than the rule's "cannot be read", but the clause summarises and
  PATCH:24 governs. [Observed]
- `consequence`, last sentence: "one malformed or unreadable file written
  there". It widens the disclosed cost to match the rule. It relaxes nothing.
  [Observed]

## Criterion 7 — regressions

No round-4 repair relaxes a rule. [Observed] The patch diff from `0f2767d2`
changes:
- the refusal's population (widened to files; drawer and provider statements
  of readable kind excluded, as intended);
- `privateSourceRules` and `consequence` (wording above, and the residual
  added);
- edit 7's statement of where the values stay. The rule is unchanged: they
  are not code-structure and never rendered or sent.

No public rule changes beyond the two fail-closed exceptions PATCH:25 names.
`unchanged` (PATCH:26) is byte-identical.

## Notes (no change required)

- N1 [Observed] The size is held by neither record. "Object id and size ...
  kept only in the run directory's check records and its local review
  packets" appears at PATCH:28, PATCH:35, `PKG/SEMANTIC-DELTA.md:109`,
  `PKG/IMPACT-LEDGER.md:77-78` and `PKG/OWNER-DECISION-PACKET.md:47-48`. But
  `CitedBlob` (`DOSSIER/check-model.ts:94-100`) and the packet spans
  (`DOSSIER/review-model.ts:53-56`) have no size field, and `DOSSIER/render.ts`
  renders no blob size. As an upper bound ("only") the statement is true and
  fails closed. Read as a statement that those records hold the size, it is
  not.
- N2 [Inferred] The fidelity packet's sha256 is rendered on pages
  (`DOSSIER/render.ts:720`, `:752`) and covers the withheld span's object id
  (`DOSSIER/review-packet.ts:133`, `:150`), so it is a digest over the
  withheld blob's id. Its preimage also holds the frozen inventory document
  and the draft view (`:155-166`), which only the run directory holds. So it
  confirms nothing for anyone who cannot read the run directory, which is
  already a stated residual. The residual lists could name it for
  completeness.
- N3 [Inferred] An object-read refusal names the object id in the command's
  result (`DOSSIER/git-object-reader.ts:62-63`, `:426`; returned at
  `DOSSIER/check.ts:205`, `DOSSIER/render.ts:170`,
  `DOSSIER/review-packet.ts:121`, `DOSSIER/init.ts:128`). A refusal stops the
  step rather than withholding a blob and continuing, so "kept only in ...
  check records and ... review packets" is not falsified on its natural
  reading. If a resource-limit failure at object read counts as "withheld on a
  resource-limit failure" (PATCH:35), the id reaches the operator's
  terminal. It is not rendered and not an egress.
- N4 [Observed] Two N3 leftovers in the packet:
  - `PKG/OWNER-DECISION-PACKET.md:125` says "Each answer below quotes that
    record", but answer 1 (`:131-133`) paraphrases. The record (`8a4e624b`,
    line 64) reads "B. No: the launch answer suffices".
  - `:114-115` still says the warning covers "a private repository's name";
    the record (line 79) says "its name and URL".
- N5 [Observed] Cost wording lags the signed text:
  - `PKG/SEMANTIC-DELTA.md:67-68` keeps "one malformed record written there";
    `consequence` now says "malformed or unreadable file".
  - `PKG/IMPACT-LEDGER.md:60` drops "not shown to be revoked or superseded"
    from its restatement.
  - `PKG/OWNER-DECISION-PACKET.md:99` says "until the file is fixed or
    revoked". Launch records are add-only (LAUNCH:29, "never edits or removes
    one"), and the rule says "until it is read or revoked".
