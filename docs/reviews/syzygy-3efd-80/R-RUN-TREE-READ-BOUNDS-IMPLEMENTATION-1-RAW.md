# Independent implementation review of run-tree read bounds

- Subject: `dc042d71ddb54c17f50ddeecc7076aeca3254013`
- Base: `2a1ef3e8e5f4ba404184143079af52b226bff94a`
- Reviewer: `/root/lane_four`, `coordinator:codex-20261123-167df18c`
- Contract: adopted 2.18, A-53, REQ-polaris-generation-033, -035 and -048

Verdict: REVISE

## Findings

1. Blocking, REQ-048. `packages/polaris-dossier/src/polaris.ts:159–165` reads the supervisor state on resume, then calls `attach` when the view is live. `attach` reads the state again at lines 260–264 and acts on its result. The no-live-view branch already reuses the checked state. Use that same snapshot for the live-view attachment and assert one state read at the command entry.
2. Blocking, REQ-035. `packages/polaris-dossier/src/waiting-sessions.ts:653–666` converts a present invalid `packetBytes` to the same fallback as an absent member. The contract gives the fallback to a readable older record written before the member existed. A record holding a value that cannot define a byte bound should refuse before the round read. Preserve the missing-member legacy path.
3. Blocking, REQ-033 and REQ-048. The ENOENT-only absence test in `packages/polaris-dossier/src/run-tree-read.ts:41` cannot distinguish a missing pathname entry from an entry whose link target is missing. A dangling state entry is reported absent by `polaris.ts:247`, so a named supervisor can proceed down its fresh-run branch. Dangling logs are reported empty by `close.ts:233`. Both requirements distinguish present unreadable entries from absence. Determine entry absence after the failed open without reopening content. Keep exact refusal and Unknown messages.

## Verified scope and evidence

[Observed] `git diff 2a1ef3e8 dc042d71 --check` passed in the independent review snapshot. The diff preserves the shared one-descriptor reader, introduces an error that retains the deciding byte bound, and migrates the named run, log, credential, choice, review, inventory and supervisor readers. Reviewed the read order in the waiting command, the current supervisor call graph, and the explicit end states for malformed or oversized records.

[Observed] The focused author check for this tree reports 374 passing tests. The tests exercise file type, boundary, and actual bytes read in the shared reader and at command seams. These checks do not exercise the above branches. Hosted validation and merge readiness remain separate.
