# Round 1 dispositions — Polaris on any repository, consent asked at launch

> **Candidate — binds nothing.** The drafting session's dispositions of
> `docs/reviews/R-POLARIS-LAUNCH-CONSENT-1-RAW.md` (verdict `REVISE`, line 2,
> over `51375c8c`), made under the lead's direction of 2026-11-08 on F1, F2,
> F4 to F8, F11 and F12. The raw is not edited. Each finding's repair is in
> the files named; "repaired" is the drafter's claim, for the confirmation
> round to test.

| Finding | Severity (raw) | Disposition | Where |
|---|---|---|---|
| F1 pre-answer reads contradict "before it reads any object" | blocking | **Repaired.** Before the answer Syzygy reads only references, the pinned commit object (using only its root tree, parents and committer date, never the message or any identity) and the tree objects (entry names, modes and identifiers); never a blob; nothing stored beyond the question, launch output and records. The falsifier now names a blob read or any other commit field. Design §1 states the reading that this frames the act rather than observes; the packet puts it to the owner under Q1 | spec REQ-046 ¶1, falsifier; design §1 RFC5-12 row, §2; packet Q1 |
| F2 REQ-047 changes REQ-033 for every run | revise | **Repaired** by restriction, per the lead: a run whose HEAD an in-force consent for the derived identity names pins HEAD exactly as REQ-033 states and asks nothing; the trunk default reaches only runs no existing consent covers. Header sentence rewritten; scenario "Existing consent at HEAD keeps today's behaviour" added; Redis unaffected at its consented commits | spec header, REQ-047 ¶1 and first scenario; delta; design §4 |
| F3 RFC3-16(c)(1) recording commit untested; Q4 A uncommitted | revise | **Repaired.** The phrase is an exact owner phrase; a record counts only with its recording commit, which Syzygy makes on the dedicated reference before the record is relied on; state (1) while no A1 mechanism is in force, an explicit owner selection once one is. Design §1 gains RFC3-16(a) and (c)(1) rows. Q4 rewritten: every arm commits | spec REQ-046 ¶5, ¶8; design §1, §3; packet Q4 |
| F4 drawer statement unreachable; scenario 1 unreachable | revise (intent) | **Repaired**, per the lead: the question asks whether a drawer exists; "none exists" records a drawer statement per subject, carried by REQ-001's project input as any other drawer act is. Scenario 1 now reaches a non-governed subject with no preparation; a "drawer unknown" scenario added. Packet Q9 offers not asking | spec REQ-046 ¶6, scenarios 1 and 3; design §2; packet Q9 |
| F5 "holds no per-repository entry" inaccurate; placements undisclosed | revise (intent; honesty) | **Repaired.** The sentence now says admission needs no per-repository entry while owner placements are per repository, per commit and optional; a run without them proceeds and the files they would have placed are withheld and render Unknown; scenario added. Design §5 states the readiness cost with its source. Packet Q10 drafts three options, including carrying placements forward when every placed path's blob is unchanged, with no recommendation | spec REQ-046 ¶9, scenario; design §5; packet Q10, preamble; proposal |
| F6 statement reuse across revisions; RFC3-7 one-per-pair | revise | **Repaired**, per the lead: one statement per (subject, provider), not revision-scoped, reused while its classes cover the run; a wider set supersedes it by a recorded act naming the earlier one. Two scenarios added; design §1 states the RFC3-7 reading | spec REQ-046 ¶7, scenarios; design §1 RFC3-7 row; packet Q7 |
| F7 repository identity undefined and unlabelled | revise (testability; honesty) | **Repaired.** A fixed derivation from the clone's remote URL (remote choice, normalisation, `repository:<owner>-<name>` form; operator options where no remote), labelled Inferred with its source in agent write reach; records match by identity, URL, pinned revision or parent; the re-identification residual is disclosed and has a scenario and falsifier clause | spec REQ-046 ¶4, scenario "Re-identified clone", falsifier; design §5 |
| F8 falsifiers incomplete; no independent read capture | revise | **Repaired.** Both falsifiers list every omission the raw names and the new rules' failures; REQ-046's oracle independence names an instrumented object store (a read-logging layer outside the code under test) and before/after listings of commits, references, working trees and indexes | spec REQ-046 and REQ-047 Form blocks |
| F9 "launch record" collides with REQ-040; duplicated disclosure | note | **Accepted.** Renamed "launch consent record" throughout; the provider statement's disclosure now cites REQ-033's citation rule instead of restating it | spec; design §6; delta |
| F10 SEC-2 reading should be labelled in the packet; agent-typed answer is unauthorized, not a residual | note | **Accepted.** The packet states the SEC-2 onboarding reading as Inferred under Q1; REQ-046, design §3 and packet Q5 say an agent-typed phrase is an unauthorized effect and a trust-floor violation that disclosure makes visible and does not cure | spec REQ-046 ¶3; design §3; packet preamble, Q5 |
| F11 Q3 B steers by reviewer prediction | note | **Accepted**, per the lead: the steering line is removed; Q3 B now states the SEC-4 reading it rests on | packet Q3 |
| F12 committing records moves Syzygy's trunk, so self-runs never reach a consented tip | note, raised to revise by the lead | **Repaired.** Records are committed by Syzygy to one dedicated reference of the governance home that is never the trunk, the current branch or a pinnable reference, by Git object writes that touch no working tree, index or other reference; readers read records from that reference. Recording never moves the trunk tip, the records never enter the observed subject, and a second self-run at the same tip asks nothing (new scenario). Because a worktree shares references and objects, the separate checkout must be a separate clone. Q4 B and C state the self-run cost of committing to the trunk | spec REQ-046 ¶8, ¶10, ¶11, scenarios; design §4 "Self-observation and the trunk tip"; packet Q4 |
| F13 registry entry presumes consent before the clone; per-repository form registries | note | **Accepted.** Design §5 quotes the entry, states the reading under which it is unaffected [Inferred] and the remedy if not (a successor version); the record states its fetch form. REQ-046 now requires one generic form with no per-repository code, phrase, form or registry entry; design §7 slice 2 carries it; the ledger dispositions both | spec REQ-046 ¶5, ¶9; design §2, §5, §7; ledger |

## Not changed

- The round-1 reviewer's answers to questions 2, 3 and 7 (REQ-033 quotation
  exact; no requirement overlap; sweeps A and B re-derived equal) needed no
  repair.
- No figure, commit or population from the raw was copied into a repair
  without re-derivation: the placement entry, the registry sentence, the
  `DRAWER_FORMS`/`STATEMENT_FORMS` locations and the RFC3-16 quotations were
  re-read from their files on 2026-11-08.

## Stopping rule

Agreed with the lead before this repair: one confirmation round follows;
whatever it returns, the packet then goes to the owner with any remaining
findings listed. There is no round 3.
