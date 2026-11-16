# Round 1 dispositions — Polaris dossier local-agent mode, version 1.6

> **Candidate — binds nothing.** [Observed] Dispositions of
> `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-1-RAW.md` (verdict `REVISE`, over
> `701b7d74`), written by the drafter. Whether each repair holds is round 2's
> call, not this page's. Every repair retires the round-1 subject; the new
> proposed `spec.md` digest is in `PROPOSED-SUBJECTS.json`, now written by
> `build_polaris_dossier_local_agent_mode_v1_6.py --write-subjects` and checked
> by its `--check`.

1. **Finding 1** (major). Repaired by restating the case as a verdict naming
   the digest of an altered list. The scenario "Changed-block list rebuilt
   with its packet" now reads: "a verdict names the digest of a packet whose
   changed-block list differs from the one Syzygy rebuilds, or the base
   round's stored frozen draft, understanding record, inventory or pinned
   revision is altered or missing". The falsifier is restated the same way.
   The delta's item 4 no longer says an altered delivered list changes the
   rebuilt digest. An altered delivered copy is left to the existing re-hash
   scenario. The continuity paragraph now says "That a waiting session read
   the delivered list unaltered is Inferred, as for the rest of its packet;
   the waiting command's re-hash is the only check on the delivered copy."
   This keeps v1.5's Inferred label.
2. **Finding 2** (major). Repaired. "Which form, and why" now attributes the
   test (draft the full delta only if its rules can be stated without weakening
   REQ-polaris-generation-035) to the drafter and the drafting brief.
   It quotes the record's own item 2: "The drafter chooses between the
   smaller form and the full delta and says why." The Warrant section quotes
   both selections whole from
   `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md`. The `--fresh` one
   now includes "when the carried context is large" and "The run can still go
   unattended."
3. **Finding 3** (minor). Repaired. REQ-polaris-generation-035's
   `warrants.decisions` gains `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`.
   The packet sentence also names the direction. The Warrant section now
   names the record and no longer says none exists. The ledger now says the
   warrants change and that `GOVERNING-DEPENDENCIES.md` changes at install.
4. **Finding 4** (minor). Repaired in the continuity paragraph and the
   scenario "Changed-block list disclosed". Two things are Observed: that the
   packet Syzygy rebuilt carries the list, and that the verdict has every
   entry. Two things are Inferred: which earlier round is the base, which
   "rests on the delivery and verdict records Syzygy stored", and that the
   reviewer considered every entry.
5. **Finding 5** (minor). Repaired. Session identity is now the session
   directory. The base round is "the latest earlier round Syzygy delivered
   into that same directory for which Syzygy recorded a verdict written there
   for that round, whether that verdict counted, failed validation or was
   refused". A round with no recorded verdict is never a base. The clause now
   says that a packet into a directory with no earlier round, as for a new
   session, has no base round and carries no list, so the `--fresh` case
   follows from the clause and not from the design. The scenario's AND line
   lists the three no-list cases.
6. **Finding 6** (minor). Repaired in the validation paragraph. The rebuild
   uses the base round's recorded inputs: the frozen draft with its
   understanding record, the frozen inventory and the pinned revision, with
   the cited spans re-read from verified blobs. The base packet is "rebuilt
   from those inputs and its digest re-derived, never copied from a delivery
   record". A new sentence says that where a base input is missing or does
   not rebuild, a verdict on that packet "SHALL NOT count". A falsifier limb
   was added for a copied base digest.
7. **Finding 7** (minor). Repaired. "Which form, and why" gains "Also not
   drafted: a delta-only packet with fresh entries", which names the third
   form. It says the form was not chosen because it displaces "a review
   packet containing only the frozen subject", gives fresh entries for bytes
   not read that round, needs the chain, and saves nothing under `--fresh`.
   The ledger's Costs, and the owner page, now say that a repair can change
   an entry's coverage without changing its bytes, so the list never names
   it.
8. **Finding 8** (note). Taken. The REQ-006 reading now also quotes "The
   candidate-authoring stage SHALL NOT define or narrow its own review
   denominator." It says the sentence is met because the authoring stage
   does not write the list and the denominator stays the whole packet. The
   delta adds that the list may narrow attention, and that this is disclosed.
9. **Finding 9** (note). No change. It confirms criterion 1.
10. **Finding 10** (note). Taken. The list now "says that it compares nothing
    else, so that a difference in the criteria, the verdict schema or the
    pinned revision is not shown by it". The scenario's THEN line, the
    falsifier, the delta's item 2 and the ledger say the same.
11. **Finding 11** (note). Taken. design.md and proposal.md now name
    `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`, and design.md
    restates the base-round and no-list rules.
