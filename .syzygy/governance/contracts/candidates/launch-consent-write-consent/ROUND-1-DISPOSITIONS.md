# Round 1 dispositions — write consent for launch consent records

> **Candidate — binds nothing.** The drafter's dispositions of
> `docs/reviews/R-LAUNCH-WRITE-CONSENT-1-RAW.md` (verdict `REVISE`, over
> `1a368d04`), repaired as the coordinator directed on 2026-11-09. Not a
> review and not evidence that a repair holds; round 2 decides that. Line
> numbers below are this repair's own bytes, re-derived by script; the raw's
> line numbers are the reviewed commit's.

"Record" is `instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`, "SD"
`SEMANTIC-DELTA.md`, "packet" `OWNER-DECISION-PACKET.md`, "builder"
`scripts/build_launch_consent_write_consent.py`.

| # | Grade | Finding (raw lines) | Disposition |
|---|---|---|---|
| F1 | requires change | The open parent of a creating commit lets Syzygy restore records the operator removed, and lets the branch share the trunk's history (raw 130-149) | **Repaired.** The branch's first recording commit has no parent; every later one has exactly one, the branch's tip at the moment of the move; no recording commit takes any other commit as a parent, a trunk commit or a removed commit included (record:62-68). The revert path says moving the branch back or deleting it is a real undo, because a removed commit never returns (record:109-114). The SD's choice 4 now fixes the parents instead of leaving them open (SD:185-193). The packet says so in plain words, under the costs (packet:93-98) and in a new "Undoing a record" section (packet:115-120). New builder predicate: the scope must state the parent rule (builder:147), with two mutants (builder:265, 269). |
| F2 | requires change | "Is exactly" leaves out Git's transient lock and temporary files (raw 151-161) | **Repaired.** One clause adds Git's own transient files for those writes, which the write itself creates and removes: the reference's lock file and the temporary files an object is written through before rename (record:55-57), in the same way as the log-entry clause. |
| F3 | note | A reference move can run a hook (raw 163-168) | **Repaired.** The record states that every write runs with the repository's hooks disabled (record:59-60). The SD's implementation bullet says why: a `reference-transaction` hook would be execution the record does not grant (SD:135-140). |
| F4 | note | Three docstring predicates have no killing mutant; `--digests` and `--manifest-digest` have no refusal case (raw 170-180) | **Repaired.** New mutants: a reference equal to a non-`main` trunk (builder:259), a reference ending in `/` (builder:261), and a location without its trailing slash (builder:263). One refusal case each for `--digests` and `--manifest-digest` over a stale fixture (builder:333), through a new `run()` the CLI shares (builder:365). The selftest went from 23 to 30 predicates. [Observed] Removing each guarded test from a temporary copy of the builder fails exactly the matching cases: the trunk comparison (builder:132), the reference's trailing slash (builder:130), the location's trailing slash (builder:134), the parent rule (builder:147, both its cases), and the stale refusal in `run()` (both modes). |
| F5 | note | "A self-observation launch proposes the same identity" holds only for a GitHub-URL clone (raw 182-191) | **Repaired.** The SD states the condition, that the separate clone's remote is the GitHub URL. A clone made from the local governance home derives another identity (`projects-syzygy`, re-derived with the builder's own `derived_identity`), so that launch proposes a second identity unless the operator gives this one, and no consent fails either way (SD:171-180). The packet says the same in plain words (packet:67-70). |
| F6 | note | "Any reference a run may pin" cannot be met by any branch; the defect is the spec's (raw 193-201) | **Carried as a spec note**, with no spec byte edited: a new SD section, "Spec note for a later launch-consent version (not a change here)" (SD:142-154), names two possible readings for the owner. |
| F7 | note | The packet's "until it is revoked" is narrower than scope 8's "until it is read or revoked" (raw 203-209) | **Repaired.** The packet now says "until it is read or revoked" (packet:81) and adds that the operator can remove the commit before any run relies on it (packet:82). |
| F8 | note | SD's "The owner signed v1.1" describes another artifact accurately (raw 211-218) | **No change.** |

**Drafter's note, not a finding.** This record quotes no digest. The
round-1 registration in `scripts/check_governance.py` required every round
dispositions record to carry the current argument, so this file failed CG-7e.
The registration now counts a dispositions record as a copy only while it
quotes the act phrase, which follows the `DOSSIER_LOCAL_AGENT` precedent's rule
("a REVISE round's record quotes no digest and is not registered").
[Observed] A temporary dispositions file that quoted the phrase with a digest
one character off failed both CG-7d and CG-7e.
