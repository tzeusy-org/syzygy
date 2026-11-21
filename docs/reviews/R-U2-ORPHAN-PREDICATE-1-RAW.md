# Review R-U2-ORPHAN-PREDICATE-1
Verdict: REVISE
Reviewer: fresh-context Claude reviewer subagent (CC-REV-1), Opus 5.5, independent of the author session
Subject: SEMANTIC-DELTA.md sha256 556caa1a825f5e3a7f31887dd3f3f23f4d0cc7b64bd8e93d61b6ce3981003f2e

Reviewed at: worktree `/home/orca/orca/projects/syzygy/.worktrees/orphan-predicate`,
branch `agent/syzygy-659o.2-orphan-predicate`, HEAD = origin/main =
`af30266a0`, with the 13 uncommitted working-tree edits plus the untracked
`orphan-predicate-amendment/` directory. Line numbers below are of the
working-tree files (installed `contracts/rfcs/` copies; every mirror is the
same bytes, see finding 13).

## Mechanical checks run this session

- [Observed] Mirror identity: `cmp` over all six installed/mirror pairs the
  change touches: 6 of 6 byte-identical (criterion 4 met).
- [Observed] The delta's "Exact text" fence equals the working-tree diff:
  the 109 `+`/`-` body lines of the fenced diff equal, as an ordered list,
  the 109 of `git diff -U2 origin/main -- contracts/rfcs .syzygy/map`
  (Python list equality, True).
- [Observed] `python3 scripts/check_governance.py`: 21 OK, 16 WARN, 1 FAIL;
  the FAIL is CG-18 (12 findings over 10 context fixtures, digest and word
  count), caused by the edited RFC bytes (finding 7).
- [Observed] The delta's own sweep (`owner[ -]adjudicat`,
  `adjudicat[a-z]* by the owner`, `routes? (it )?to (the )?owner`) re-run with
  `git grep -i -E` over `.syzygy openspec apps packages scripts` minus
  `history/`, `round-*`, `_bootstrap/`, `-RAW.md`: 70 files hit. A second
  method (Python `re` over 2,238 tracked text files under the same roots and
  exclusions, whitespace-tolerant between words) finds 12 hits whose phrase
  is wrapped across a line break, which the delta's line-based sweep cannot
  see; 4 of them are in installed/mirrored RFC 0008 (finding 3).

## Findings

### 1. blocking — the "writer cannot be established" rule makes the first limb undecidable and folds human-typed references back into the Contradiction

File: `.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`
lines 798-799 and 806-808 (same text at RFC-0008/identity-authority-materialization.md
228-229 and 232-233; delta "Proposed meaning" 1).

Quoted: "the item carries the warrant reference Syzygy writes at
materialization (RFC4-17)" … "A warrant reference whose writer cannot be
established counts as Syzygy's: a doubtful claim renders as the
contradiction, never behind a provenance badge."

Problem.
- [Observed] RFC4-17 (`RFC-0004/named-adapters.md` 442-445) defines the
  reference only by content: "the warrant reference (resolvable spec anchor
  or decision identity) into the substrate's provenance field
  (`spec_id`/metadata)". A human or worker can type the same value into the
  same field. Nothing in the amended text names an observable property that
  distinguishes a Syzygy-written reference from a typed one.
- [Observed] The pursuit data the delta cites
  (`docs/pursuits/2026-11-21-trajectory-fifth-question-pursuit-data.json`,
  findings B3-F1/B3-F2) records that on Syzygy's own tracker `spec_id` is
  set on 26 of 1,370 items, "used ad hoc … never written by Syzygy", and
  classes such a field as "a tracker field a worker wrote … substrate
  annotation, asserted-by-worker, never a warrant". B3-F1 lists the Beads
  columns; none records per-field authorship [Inferred from that column
  list; not re-queried here].
- [Inferred] So the writer of a `spec_id` can in practice never be
  established, and the fail-closed sentence turns every unrecorded item with
  any non-empty warrant-shaped field into an unfilterable orphaned-work
  Contradiction: the 26 worker-written items on Syzygy's tracker today, and an
  [Unknown] number of the proving project's 10,971 (B3-F15: its `spec_id`
  population "not readable from this session"). The amendment's purpose,
  resolving B2-F3, therefore holds only if the proving project's items carry
  no `spec_id`, which is Unknown.
- [Inferred] It also inverts RFC8-23's own route for Unknown-provenance work,
  "resolvable by supplying a warrant": a human who supplies one by typing a
  reference into the substrate now mints a Contradiction.
- Edge cases asked for in criterion 1, "a human-typed warrant reference":
  fails. The item lands in the Contradiction, the opposite of the pursuit's
  classification.

VIS-2 does not require this polarity. Both outcomes render Unknown and never
green: a Contradiction renders the conclusion Unknown, and Unknown-provenance
is "counted, never green". So Unknown-provenance is not a fail-open
alternative.

Proposed fix. Define "Syzygy wrote it" by a property Syzygy can verify
against its own state. For example, the reference resolves to a Proposal or
materialization-attempt identity recorded under `.syzygy/work/**`, or it
carries an adapter-written marker that Syzygy checks against its own write
log. A reference that fails that check is a worker-written annotation, and
its item is Unknown-provenance (the third bullet of RFC8-23 already says
"without a Syzygy-written warrant reference"). Replace the "cannot be
established counts as Syzygy's" sentence with this check, and state the
VIS-2 argument explicitly: both branches stay Unknown.

### 2. blocking — "a Syzygy record other than a materialization record names its identity" is open-ended and self-sustaining

File: RFC-0001 lines 799-800; RFC-0008/identity-authority-materialization.md
229-230; RFC-0008/accounting-reconciliation-and-release.md 153-156.

Quoted: "or a Syzygy record other than a materialization record — an orphan
finding, a Proposal — names its identity."

Problem.
- [Inferred] The dashes read as examples, not a closed list. Other Syzygy
  records name scheduler work-item identities as a matter of course:
  - observation/snapshot records of the scheduler read (RFC8-8(c) reads every
    open item "at the answering evaluation");
  - an Unknown-provenance finding or count;
  - a Challenge;
  - an `adjudicates` Decision;
  - the warrant-backfill batches the same pursuit proposes
    (`.syzygy/work/warrants/<batch>.json`, rows of "warrant ref@pinned
    revision → work item ids").
  Read literally, any of these makes the item "claimed", and a snapshot that
  names every item collapses the predicate back to RFC1-29's old
  unconditional reading.
- [Inferred] Circularity: the orphan finding is listed as a claimant, but it
  exists only because the item was found claimed. Once minted, it keeps the
  item claimed forever. The adjudicating Decision also names the item, so an
  adjudication that rules "not Syzygy's work" cannot move the item to
  Unknown-provenance. The text gives no exit from the claim.
- Edge case "an item named by a superseded or orphan record": unspecified.
  When re-materialization "cites and supersedes the orphan finding" but
  leaves out a duplicate item from the failed attempt, it is not said whether
  the superseded finding still claims that item.

Proposed fix. Make the record class a closed, enumerated list, for example:
(i) an approved execution-intent Proposal's materialization attempt that
names the identity before the record is written; (ii) an orphan finding that
is open (not superseded, not adjudicated). Exclude by name observation and
snapshot records, Unknown-provenance findings, challenges, `adjudicates`
Decisions and warrant declarations. Say what an adjudication does to the
claim: a disclaiming adjudication ends it, and the item then renders
Unknown-provenance.

### 3. blocking — the delta misses active-authority sentences that still state the old rule, and one violation case now contradicts the new predicate

The delta's Downstream impact says: "Edited here: every Contradiction-route
hit in installed RFC 0001, 0002, 0008, 0009 and their mirrors". [Observed]
That is false. Four unedited sites remain in installed contracts, each
mirrored byte-for-byte in `contracts/candidates/rfcs/`:

a. `RFC-0008/identity-authority-materialization.md` 355-358, violation
   case 11: "*(RFC8-8/10)* A work item with no materialization record
   rendered as ordinary open work, or as an Unknown-provenance badge
   filtered off the board with only a count disclosed — no Contradiction
   minted …". The amendment requires exactly this for an unclaimed item: an
   Unknown-provenance badge, filterable with a count (RFC8-23). The
   violation case now forbids what the clause requires. The fix is to scope
   it to "a work item Syzygy claims (RFC1-29) with no materialization
   record".
b. Same file, lines 40-42, module summary: "**a scheduler work item with no
   materialization record is a Contradiction, not a badge** (RFC8-8,
   RFC8-10)". This still states the unconditional rule. Add "that Syzygy
   claims".
c. `RFC-0008/README.md` 109-111: "**A scheduler work item with no
   materialization record is a Contradiction, not a badge**, whose only
   lawful exit is owner adjudication". This is both unconditional and the old
   route. The phrase is wrapped ("owner" / "adjudication" on separate
   lines), so the delta's line-based regex cannot match it.
d. `RFC-0008/accounting-reconciliation-and-release.md` 319-321, inside
   RFC8-28: "the surface that routes a gap to work and a Contradiction to
   owner adjudication alone". This is also wrapped. The delta lists RFC8-28
   as affected, but it edited only line 300.

[Observed] The sweep method is line-based, which is exactly the trap in
AGENTS.md "A citation wrapped across a line break is invisible to every
basename sweep". The delta also swept only for route phrases, not for the
unconditional orphan statement. Sites (a) and (b) are not route phrases;
they were found by sweeping `orphan|no materialization record` over the
installed RFCs.

Proposed fix. Edit a-d in both copies. Re-run the sweep whitespace-tolerant
(Python `re` with `\s+` between words) and also for
`no materialization record`. Publish the regex and the denominator in the
delta.

### 4. should-fix — a partial materialization failure can escape both limbs

File: RFC-0001 lines 797-800 and 812-814.

Quoted (unchanged): "Re-materialization after a partial failure must **cite
and supersede the orphan finding**".

Problem. [Inferred] Partial failure is the canonical case of orphaned work.
Suppose the scheduler created the item, but the warrant-reference write did
not complete or is a separate later call, and the materialization record was
never written. Then the item carries no reference, and no listed Syzygy
record names it (the record failed, and the orphan finding is what the
detector would mint). The predicate classes the item Unknown-provenance, and
no orphan finding exists for re-materialization to cite. Whether RFC4-17's
write is atomic with creation is [Unknown]: RFC4-17 says only "At
materialization, the adapter writes".

Proposed fix. Either require the warrant reference in the creating call (a
sentence in RFC1-29 or a successor to RFC4-17), or make a pre-issuance
materialization-attempt record a claimant (see finding 2(i)). Otherwise
record the residual explicitly as a known gap.

### 5. should-fix — "agrees with" differs from "matches"

Files: `RFC-0008/accounting-reconciliation-and-release.md` 150-151 ("one
Syzygy claims and no materialization record agrees with") and
`RFC-0008/identity-authority-materialization.md` 62-63 ("Work Syzygy claims
but no materialization record agrees with"). Every other site says "matching
no materialization record".

Problem. Edge case "an item whose record exists but disagrees". [Inferred]
"Agrees" admits a reading in which a recorded item that disagrees with its
record is orphaned work. That contradicts RFC4-17 and RFC8-11 ("no
contradiction is manufactured on the chain's load-bearing join"), and the
delta's own "What explicitly does NOT change" ("The new predicate reads the
reference only on an item no record matches").

Proposed fix. Replace "agrees with" by "matches" at both sites.

### 6. should-fix — the doctrine the edits quote is not in this tree, and the dependency is not recorded

[Observed] Doctrine differs between this tree and the pending branch:
- `.syzygy/governance/doctrine/architecture.md:167`, in this worktree and on
  origin/main, reads "routes to adjudication by the owner".
- The D12 wording exists only on the remote branch
  `agent/doctrine-d12-contradiction-routing` (`04bf13bd2`), and the D12 row
  is absent from this tree's `DOCTRINE-AMENDMENT-LOG.md`.

The edited RFC2-15 sentence (`RFC-0002/reconciliation-chain.md` 83-86) keeps
its tag "[Observed — architecture.md.]", which is false at these bytes. The
delta's Warrant and Evidence present D12 as in force without naming the
branch or a merge order. [Observed] D12 is the owner's decision (log row:
"Owner decision, 2026-11-21, in the owner's words"), and the wording matches
it verbatim. So the substance is lawful, and criterion 3 is met on content.

Proposed fix. Add a "Depends on" line naming the D12 branch and PR, and land
this change only after D12 is on main. Otherwise RFC2-15's Observed tag
contradicts the doctrine it cites.

### 7. should-fix — derived files are said to be regenerated, but are not

Delta, Downstream impact: "**Generated, regenerated in this change:**
`DIRECTIVE-REGISTER.md`, `05-CONTRACT-INDEX.yaml`, the CG-18 context
fixtures … and `CONTEXT-BUDGET-REPORT.md`."

[Observed] None of these files is modified in the working tree.
`check_governance.py` fails CG-18 (12 findings, 10 fixtures). The register is
stale: for example, it gives `RFC1-30` at RFC-0001 line 813, but the clause is
now at 827, and `RFC8-11` at line 315, now at 327.

Proposed fix. Regenerate before the commit and re-run the battery. Otherwise
reword the sentence to say regeneration is pending.

### 8. should-fix — "claims" collides with a defined kernel term and with a scheduler verb

Problem.
- RFC 0001's own object table defines a **Claim** ("Kernel … The only
  carrier of status"). "Syzygy claims it" in RFC1-29 is therefore
  ambiguous to a cold reader, and the delta's "used in its plain sense"
  does not remove that.
- The new RFC8-8 bullet (`identity-authority-materialization.md` 244-246)
  then uses "claimed" in a third sense: "An agent that claimed or worked an
  affected item". Here it means the scheduler's claim or assign action.

Proposed fix.
- Use a term not already defined in the contracts for Syzygy's relation to
  an item, for example "Syzygy-attributed" or "Syzygy names it". Define it
  once in RFC1-29 and have the other sites cite that definition.
- In RFC8-8, write "an agent assigned to, or that worked, an affected item".

### 9. should-fix — the separation-of-duties rule is new normative content, stated in one place with no warrant

Delta "Proposed meaning" 3 adds a substantive constraint on adjudicators
("an agent that claimed or worked an affected item never adjudicates it").
"Current meaning" and "Warrant" do not motivate it, and it lives only in
RFC8-8. Meanwhile RFC1-29 (line 803) routes orphans "to adjudication
(RFC1-21)", and RFC1-21 does not carry the rule. A reader of RFC 0001 alone
misses it. [Inferred] The pursuit's own proposal ("a batch binds only by an
adoption row whose adopter is no claimant of its items"; bead
`syzygy-659o.2`, "the adjudicating session claimed none of the items")
supplies the warrant, but the delta does not cite it.

Proposed fix. Add the warrant (B2-F14 or the bead text) and a
cross-reference from RFC1-29 to RFC8-8. Say whether the rule is meant to bind
orphan adjudication only, and why other Contradictions are excluded.

### 10. note — the recorded lags are not traceable to the filed bead, and the code lag is wider than stated

Problems.
- [Observed] The delta says the lags are "recorded and filed" but names no
  bead except `syzygy-k54o.5.1`. The bead `syzygy-659o.13` ("Specifications
  and the POC route label follow the U2 contract amendment …") exists and
  should be cited.
- [Observed] The code lag covers more than the label. In
  `packages/three-surface-poc-core/src/project-shape-model.test.ts:801`, the
  pinned route is
  `{ … route: 'Owner adjudication', actor: 'owner', verb: 'adjudicate', target: 'act' }`.
  The `actor: 'owner'` field is lagging too.
- [Observed] `TERM-REGISTRY.md` T-19 (lines 1098, 1112, 1118) still says
  "exits only by owner adjudication" and "only the owner can settle it". It
  carries "Status: CANDIDATE. This file binds nothing", so it is not active
  authority, but it is stale vocabulary on a reader path.

Proposed fix. Name `syzygy-659o.13` in the lag list, and add the `actor`
field and the T-19 entry to it.

### 11. note — CC-REV-2 routing doctrine contradictions to the owner is correct and needs no change

`policies/craft-and-care/review-and-documentation.md` 75, 82 and 107-108
("routes to the owner as a contradiction") cover doctrine invalidation, an
owner class (VIS-4 class 1). They are consistent with D12's "or by the owner
when it falls in an owner class". The delta's out-of-scope items (RFC2-24
rows 1 and 7, RFC7 walkthrough judgment, RFC3-31, candidate RFC 0010) were
checked against the sweep hits, and the delta's descriptions of them are
accurate [Observed].

### 12. note — the abbreviated route forms drop the veto clause

Sites:
- RFC 0001 line 76: "(an agent's recorded adoption, or the owner in an
  owner class)";
- RFC 0001 table, line 218;
- RFC2-24 row 8;
- topology `04` lines 65-67.

These omit "reported and open to the owner's veto". The full form appears in
RFC1-21, RFC2-15 and RFC8-8, so this is acceptable shorthand. Suggest that
the short forms cite RFC1-21 so that no reader takes the shorthand for the
whole rule. Nothing is labelled owner-adopted [Observed: 0 of the diff's added lines
match `owner[- ](adopted|approved|accepted)`; the 13 changed files carry 23
such matches in total, all in unchanged pre-existing text]. Criterion 3
is met.

### 13. note — the passing criteria

- Criterion 4 [Observed]: 6 of 6 mirror pairs are byte-identical, and the
  fenced diff is faithful to the tree.
- Criterion 6: the Normative class is right. The change alters which items
  mint a Contradiction and who may exit one.
- Prose. The edited RFC1-21 (RFC-0001 lines 476-477) and RFC2-15
  (`reconciliation-chain.md` line 85) each leave one unreflowed line over
  120 columns. This is cosmetic.
- Partition check (criterion 1's "both or neither") [Inferred]. Assume the
  predicate is decidable. Then every unrecorded item lands in exactly one
  route: a claimed item is a Contradiction and, by RFC8-23's
  "no traceable warrant", also Unknown-provenance, with "the
  orphaned-work Contradiction governs"; an unclaimed item is
  Unknown-provenance only. So no item falls into neither route. The
  partition holds only on paper until findings 1, 2 and 4 make the predicate
  decidable.
- Criterion 2. The amendment does not contradict RFC4-17 or RFC8-11, subject
  to finding 5, nor RFC1-29's one-way door or RFC8-23's "both" rule. It does
  conflict with the unedited RFC8 violation case 11 (finding 3a).
