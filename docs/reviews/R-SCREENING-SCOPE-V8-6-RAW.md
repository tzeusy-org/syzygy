# R-SCREENING-SCOPE-V8-6 — public-source screening scope, version 8 (private sources), round 6
Reviewed commit: f5bfaed7d7f232f040fcabcf95dc99ba33cc0d8d
Manifest SHA-256: 3da4502006c942524287b4a6831a65aac2a8df0f8ce59edb0b753a44cdc94a00
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`
(round 6, scoped to the round-5 repairs, as the owner ordered: "Repair X1,
scoped round 6 (Recommended)"). No observed-repository body, dossier output,
run directory, `site/` file, clone or credential was read. No dossier command
and no provider call was made.

**Offer condition.** Every exception below is a **note**. None requires a
change. X1 of round 5 is answered, and N1, N4 and N5 are answered. Carrying N2
and N3 without a change is sound.

Abbreviations:
- `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`
- `PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`
- `BUILDER` = `scripts/build_public_source_screening_scope_v8.py`
- `DOSSIER` = `packages/polaris-dossier/src`
- `LAUNCH` = `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
  at `913c6b7d`, read only, with `git show`.

## Mechanical results (re-run this session at the reviewed commit)

All runs used a scratch clone checked out at the reviewed commit.
- `git rev-parse HEAD` printed the reviewed commit.
- `python3 BUILDER --check`: "public-source-screening-scope-v8: patch and
  manifest current".
- `--digests` printed one row, `44153bbe…` `[variant: pv]`. That row is the
  act argument, not the head digest.
- Head digest, by two methods:
  - `--manifest-digest` printed `3da45020…`.
  - `sha256sum PKG/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt` printed the
    same value.
- `--selftest`: "51 of 51 passed". That matches `PKG/ROUND-5-DISPOSITIONS.md:22`.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `RULE_PHRASES` (BUILDER:315-320) has 13 entries. A script counted each one in
  `SOURCE_VISIBILITY["rule"]`: each occurs exactly once. So each drop case's
  `replace(phrase, "", 1)` (BUILDER:577-579, drop at :579) removes the only copy.
- The diff `826111fe..f5bfaed7` outside PKG and BUILDER touches only
  `docs/review-campaigns/screening-scope-v8.md`.

## Criterion 5 — rule 6 (run first)

Each mutant was a copy of the builder in the scratch clone, restored after the
run.
- M1: the checker's loop (BUILDER:398) skips only the new phrase. Result: 50 of
  51, failing exactly "a rule without 'that a recording commit on the dedicated
  reference added' is found".
- M2: the loop is cut to `RULE_PHRASES[:-1]`. Result: the same single failure,
  50 of 51.

The new case fails for the reason it names. The drop removes the phrase, and
only the checker's `lost {phrase!r}` finding kills it. [Observed]

The new clause ", and no file the reference holds that no recording commit
added" is not pinned. Dropping it would only widen the refusal, which fails
closed, so it needs no pin. [Inferred]

## Criterion 1 — round-5 dispositions

| # | Repair answers the finding? | Quoted locations and claims true at the commit? |
|---|---|---|
| X1 | Yes. The population is now the files that a recording commit on the dedicated reference added (PATCH:24, BUILDER:126-128). A trunk-carried decision record is outside it, and an unrecognised file a recording commit added is inside it. This is the first of the two forms round 5 offered (`docs/reviews/R-SCREENING-SCOPE-V8-5-RAW.md:125-131`) | [Observed] `PKG/SEMANTIC-DELTA.md:57-62`; `PKG/IMPACT-LEDGER.md:58-67`, with the new fixture at `:74-75`; packet `PKG/OWNER-DECISION-PACKET.md:97-103`. True |
| N1 | Yes. "kept, if at all, only in" appears at PATCH:28 and PATCH:35, `PKG/SEMANTIC-DELTA.md:113-117` and `:148`, `PKG/IMPACT-LEDGER.md:81-85` and packet `:47-49` | [Observed] `CitedBlob` (`DOSSIER/check-model.ts:94-100`) and `PacketSpan` (`DOSSIER/review-model.ts:53-57`) carry `objectId` and no size. The `bytes` fields in `check.ts:54`, `:240` and `review-model.ts:63`, `:95` size the run's own draft, packet and verdict files, not a source blob. True |
| N2 | Carried as a note | Sound; see criterion 4 |
| N3 | Carried as a note | Sound; see criterion 4 |
| N4 | Yes | [Observed] Record at `8a4e624b`, line 64: "B. No: the launch answer suffices". The packet (`:134-135`) quotes "No: the launch answer suffices" under answer "B". Line 79 reads "its name and URL"; packet `:118` reads "name and URL". True |
| N5 | Yes, all three sites | [Observed] `PKG/SEMANTIC-DELTA.md:71-72` ("malformed or unreadable file"); `PKG/IMPACT-LEDGER.md:62` ("not shown to be revoked or superseded"); packet `:99-101` ("until it is read or a later record revokes it"), consistent with LAUNCH:29 ("adds new files only, never edits or removes one"). True |

Every line range in `PKG/ROUND-5-DISPOSITIONS.md:15-20` was re-derived from the
files at this commit, and each one lands on the cited text. [Observed]

## Criterion 2 — the refusal (X1)

- **No reading ignores an unreadable file that a recording commit added.**
  [Observed] PATCH:24 puts every such file in the population. "a drawer or
  provider statement included" keeps those kinds inside it. Anything of
  unreadable kind, or an observation consent record of unreadable
  effectiveness or pair, refuses "with that file named". [Inferred] One edge
  depends on which bytes are read. If an implementer reads a recorded path at
  the reference's tip and takes "file ... added" to mean the blob the
  recording commit added, then a later non-recording edit of that path drops
  out of the population. That reading is strained, and it falls inside the
  agent write-reach residual that the launch draft already discloses. See
  note A2.
- **No reading lets a well-formed trunk-carried decision record refuse.**
  [Observed] LAUNCH:29 says "Every recording commit adds new files only". A
  file the trunk carried, at any path, was therefore added by no recording
  commit. PATCH:24 also excludes it outright: "no file the reference holds
  that no recording commit added".
- **The term is definite enough for an implementer, with one note.**
  [Observed] LAUNCH:23 defines the recording commit as the commit "Syzygy
  SHALL make ... itself, on one dedicated reference ... (a branch under
  `refs/heads/`)". LAUNCH:29 adds that it is "attributed to Syzygy and the
  operator" and adds new files only. The launch reader has to identify
  recording commits anyway, because a record is in force "from the recording
  commit that contains it" (LAUNCH:23). [Inferred] So the screening population
  reuses whatever test the launch reader adopts. A file that no recording
  commit added can never be an effective record, so leaving it out loses no
  carrier. The launch draft says "contains" and this text says "added"; see
  note A1.
- **The cost.** [Observed] The packet's restatement (`:97-103`) is truthful
  and bounded. The signed `consequence` (PATCH:28, last sentence) still says
  "one malformed or unreadable file written there". That is broader than the
  bounded rule. See note A3.

## Criterion 3 — where the values stay (N1)

- [Observed] "kept, if at all, only in" is true of the code.
  - The object id is written to the check records: `DOSSIER/check.ts:115` and
    `DOSSIER/inventory.ts:304` write `citedBlobs`.
  - It is written to the review packets, under the run's `reviews/` only
    (`DOSSIER/review-packet.ts:133`, `:150`, `:181`).
  - Neither record holds a blob size (criterion 1, N1).
- [Inferred] The change alters no rule's meaning. The clause stays an upper
  bound on where the values may be kept. "never rendered or carried in any
  egress" is unchanged at all four sites, and `unchanged` (PATCH:26) is not
  in the diff. The packet's plainer form (`:47-49`, "The object id stays only
  in ...; the size is kept in neither") is true today, but N3 bounds it (see
  criterion 4).

## Criterion 4 — carried notes (N2, N3)

- **N2: not a false statement.** [Inferred] The signed text withholds "the
  object id and size", and the fidelity packet's sha256 is neither. Its
  preimage includes run-directory-only bytes (round 5 raw, lines 229-236). So
  it confirms nothing to a reader who lacks the run directory, and that
  residual is already stated at PATCH:28. Carrying it is sound.
- **N3: not a false statement.** [Observed] An object-read refusal serialises
  the object id (`DOSSIER/git-object-reader.ts:62-63`). `DOSSIER/check.ts:205`
  returns it in the refusal's `objectRead` field. [Inferred] A refusal stops
  the step; it does not withhold a blob and carry on. It is local command
  output, neither rendered nor an egress. So "kept ... only in" (a statement
  about storage) and "never rendered or carried in any egress" both stand.
  Carrying it is sound. The packet's plainer "stays only in" (`:47`) is the
  one sentence a strict reader could hold against it; see note A4.

## Criterion 6 — regressions

- [Observed] Against `826111fe`, the patch changes three strings:
  - `sourceVisibility.rule`: the population is bounded;
  - `consequence`: "if at all" is added;
  - edit 7's code-structure rule: "if at all" is added.
- [Observed] `privateSourceRules` (PATCH:25) and `unchanged` (PATCH:26) are
  byte-identical.
- [Inferred] The population bound narrows a fail-closed refusal. The files it
  removes are ones no recording commit added, and LAUNCH:23 lets none of them
  be an effective record. So no carrier of visibility is lost and no exposure
  rule is relaxed. "if at all" relaxes nothing.
- [Observed] No public rule changes beyond the two fail-closed exceptions that
  PATCH:25 names.

## Notes (none requires a change)

- **A1 [Inferred] "added" versus "contains".** PATCH:24 bounds the population
  to files "that a recording commit ... added". LAUNCH:23 puts a record in
  force "from the recording commit that contains it". Read as tree
  containment, a later recording commit "contains" a file that a non-recording
  commit put there. That file is outside this population. If it is
  well-formed, the first sentence of the rule still reads it. If it is
  malformed, it cannot be established in force (LAUNCH:23, "never from ... a
  file's presence"). Both readings fail closed on visibility. A later version
  of either text could use one verb.
- **A2 [Inferred] Which tree is read.** PATCH:24 does not say whether a
  recorded file is read from the recording commit's tree or from the
  reference's tip. Edits or deletions after a recording commit are within the
  agent write reach that LAUNCH:31 and REQ-polaris-generation-033 disclose.
  This text neither adds nor closes that residual, and it was present in
  round 5's wording too.
- **A3 [Inferred] The signed cost sentence is broader than the rule.**
  PATCH:28 (BUILDER:195) reads "one malformed or unreadable file written
  there". Packet `:104-105` reads "one malformed record there would stop
  everything". Under the bounded rule, only a file that a recording commit
  added refuses. The sentence still holds as a statement of what an agent
  session can cause: recording commits are identified by attribution and
  add-only shape (LAUNCH:29), and an agent with write reach can produce both.
  It overstates the availability cost, never understates exposure, and the
  packet's `:97-103` gives the bounded form. No change needed. A later
  version could say "added by a recording commit".
- **A4 [Inferred] Packet `:47`, "The object id stays only in".** Read as a
  statement about where the value is stored, it is true. An object-read
  refusal still prints the id on the operator's terminal (N3). The signed
  text's "kept, if at all, only in" is the governing form.
