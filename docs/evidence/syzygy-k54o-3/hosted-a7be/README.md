# Exact a7be hosted result

[Observed] Published PR head a7bef3f82605e104830c72c671ba4266d581705d. Tested merge 865f4059b0892f9197f33bea1cef5c3d1af07659 is bound by five uploaded success receipts; exact parents and tree are retained. Metadata was captured through GitHub REST APIs because the connected job wrapper omitted timestamps. Log response bytes were captured directly through a pipe, with SHA256 and deterministic gzip copies.

[Observed] Node run45544957661 FAIL: seven jobs passed, core-3 and stop-resume failed, required aggregate failed. Core-3 reports two stage-await cases failing before any forwarding/read/peer activity (1846 passed,2 failed over1848). Stop-resume hit its existing600000ms test timeout. Governance run45544957683 PASS6/6, but reconciliation421s exceeds420. Node maximum670s; workflow spans827s and429s respectively. This is functional/timing evidence, never whole acceptance.

[Observed] Exactly five of seven required lane success receipts exist; core-3 and stop-resume are absent. All five bind the same tested merge. terminal-report.json checks exact expected job-name populations independently of API total_count and records every step timestamp. reconciliation-profile.json retains61 real profiling rows; parallel nested times overlap and must not be summed as wall time.

[Unknown] Source/tree equivalence between PR head and tested merge is not established here. Current PR base metadata differed from the tested merge first parent; actual receipts and GitHub commit metadata control the binding. No source edits, reruns, local checks, primary mutations, or broad logs were printed.
