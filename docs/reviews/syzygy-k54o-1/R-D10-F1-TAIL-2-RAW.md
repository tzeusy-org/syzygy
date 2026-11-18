# R-D10-F1-TAIL-2 — independent correction recheck

VERDICT: REVISE

Ready to merge: No.

[Observed] Subject: PR825 frozen head `421dc862ea2026d50c254d40deab4031726abd1c`, tree `ed1351f0265048ddb01b70fb6215796bcbe29c93`; source/base `182a703b2dbae97a16ae7334cd84a32b634cedc0`. The clean independent review branch was fast-forwarded from the first reviewed head58bc. Recheck scope was the three correction paths since58bc, their actual governing VIS-4/RFC3-16 record and veto predicates, the published PR rollback guidance, and one concrete hosted failure. The first raw remains unchanged, SHA256 `a34262583218acd45cdd55eb1b5ad753e4cf4b701ff5e68725321ebaccafa579`.

## Original findings resolved

[Observed] The Why field now must be nonblank after whitespace stripping. The recorded source reversal selects mainline1, and the binding rejects missing/wrong mainlines. Independently exercising seven malformed inputs—empty Why, whitespace Why, omitted mainline, mainline2, missing applicability snapshot, missing specification snapshot, missing policy snapshot—returned no applicable amendment, explicit record findings, and the exact predecessor composition, including329 scenarios. These are direct binding/census probes, not assertions masked by changed subject hashes.

[Observed] A-4 names each of the three unchanged reviewed subjects with its exact source-landing snapshot URL. The two new reference mutants protect the specification and policy names in addition to the existing applicability mutation. Their subject digests remain unchanged. I fetched PR825 metadata through the GitHub connector: it was open/draft at the frozen head, and its body actually retained the two-stage rollback instructions linked by A-4. The external source snapshots and PR pointer preserve historical references after the local source files are removed.

[Observed] I independently built a disposable synthetic merge from source182a to frozen421dc8 and executed the documented seven-path tail reversal followed by `git revert --no-commit -m 1 182a703b2dbae97a16ae7334cd84a32b634cedc0`. It completed without a source-revert conflict and preserved the ledger bytes. Source paths were independently enumerated with Git's source-merge diff:109/109 matched their pre-source bytes or absence. A second whole-tree diff against the pre-source parent named only AGENT-ADOPTIONS.md. The current binding applied none of the missing subjects and produced explicit applicability Unknown findings; the retained historical row did not keep the amendment effective.

[Observed] The independently produced tail-preparation patch digest matched the coordinator's retained proof, `e3231e29997ad698e48b3177830e3a9c66d7a57ce2395c8e370600da8c1f8eb2`. I inspected that proof's command history and checked the SHA256 of its postrollback governance log. The log reports30 OK,22 WARN,0 FAIL over52 checks; this is retained coordinator execution evidence, not a governance run independently repeated by me. The earlier failed historical-link proof remains retained.

## Remaining material finding

**P1 — Current reconciliation gains a dependency that the historical P115 replay does not copy.** `scripts/check_spec_reconciliation.py:685`; `scripts/prepare_three_surface_poc_governedby_reference_recording.py:2814` and`:2838`.

[Observed] `declared_source_binding` unconditionally imports `d10_supersession`; census now calls that binding. P115's `current_tools` replay tuple copies the current reconciliation script into a frozen historical checkout but does not include this helper. The retained hosted log `d10-f1-tail-421dc8-p115-hosted.log` records the actual path from P115 core_phase → census_report → check_census → census → declared_source_binding, ending in `ModuleNotFoundError: No module named 'd10_supersession'`. Its replay metadata names the current reconciliation tool digest. I independently checked the changed import and the replay-copy list against that traceback. I did not duplicate the full P115 run.

[Inferred] This is a concrete integration regression caused by the tail's new dependency, not an uncertain readiness condition. It violates the engineering-bar requirement to verify behavior and preserve functioning callers. Minimal fix: make the replay fixture carry the current helper dependency needed by the copied tool, preserving the frozen historical subject and the real absent-D10 behavior. Verify the historical/current-tool replay and record its actual results. Do not substitute a fabricated successful D10 record or weaken normal-tree refusal.

## Verification boundary

[Observed] Independent bounded evidence is retained beside this report as `R-D10-F1-TAIL-2-independent-evidence.json`, naming the frozen subject and tree, the seven refusal results and the disposable109-path rollback. The scratch clone was deleted. No implementation, canonical tracker, PR, adoption/veto record, or earlier raw was edited by this reviewer.

[Unknown] The full421dc8 reconciliation selftest was still producing its retained log when inspected; I make no completion claim from it. The earlier acd selftest result does not establish this frozen head. Full exact-final-head clean-clone checks, hosted CI, actual queue, retention documentation and default landing remain outside this bounded confirmation. F-1 remains open; F-3/F-4/F-5 and preexisting PWB report-only Unknowns are not cleared.

[Inferred] The first review's two findings are resolved, and the rollback correction is proportionate. The overall content verdict remains REVISE solely for the newly confirmed P115 replay regression. A minimal fixture correction and scoped independent recheck can address it; no new ceremony framework is needed.
