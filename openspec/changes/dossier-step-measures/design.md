# Design: step measures in the Execution Record, and what the agent tool reports about usage

One bead outcome (syzygy-5dhm.25, R3 slice 1) in one MODIFIED REQ-polaris-generation-033. REQ-033 is the requirement that states the Execution Record `close` writes, its step instants and its usage rule, so the measures are stated there.

## Why a specification delta at all

[Inferred] It adds a member to a record a requirement states, with its own Unknown rule: specified behaviour under VIS-4, so a delta and an agent adoption row.

## The stored-run script's predicate, with two changes

[Observed] `scripts/dossier_stored_run_measures.py` (figure f) already states a round over `steps.jsonl`: a delivered review prompt, ended by the next validated review check of its kind, counting the refused ones between. `step-measures.ts` keeps it with two changes. (1) A round also opens at an `issued` review prompt, the form the operator-started handover writes (`session-handover.ts`, `logStep(run, 'session-prompt', now, { outcome: 'issued', role: 'review', ... })`); no stored run holds one, so only the literal test reaches it. (2) A round also ends, unfinished, at the next review prompt of its kind (review F2): figure f lets two prompts end at one validated check, so their time and refusals were counted twice. The code does not import the script (one is TypeScript run at close, the other Python over stored runs); the application record (`docs/evidence/syzygy-5dhm-25/step-measures-stored-2026-11-25.json`) matches each of figure f's 33 rounds by kind and number: 31 agree to the hundredth of a minute, and 2 (run `d9411d26` and run `ffe579c7`, fidelity round 2 each) are rounds a next prompt superseded before any validated check, completed for figure f and unfinished here. [Inferred] Figure f's per-round figures for those runs overstate review time; that script is unchanged by this slice.

## Names and shape

- `record.json` member `stepMeasures`, beside `steps`; the format string stays `polaris-dossier-execution-record/2` (an added member; `status.ts` and `scripts/dossier_run_evidence.mjs` read named members and check no member set).
- A time is `{ state: 'measured', ms, from, to }` or `{ state: 'unknown', why }`; a count is `{ state: 'counted', ... }` or Unknown. Whole milliseconds: the step instants carry milliseconds, so no rounding enters the record.
- Wall time ends at the close instant (Syzygy's clock at close), since the `close` row is logged after the record is written.
- Revisions are distinct revision numbers named by `check` or `inventory-check` rows; a refused check names none, so it is counted by outcome but adds no revision. Only the outcome words those commands log (`passed`, `findings`, `refused`) become keys of the count by outcome; any other string, which a session could write into the log, is counted under `other` (review F1).

## What the agent tool reports about usage (the bead's second outcome)

[Observed] Syzygy reads no usage today. `close.ts:94` (`parseUsageFigure`) and `close.ts:114` record only the figure the operator declares with `--usage-tokens` and `--usage-turns`, labelled Inferred and attributed to the operator; with none, `close.ts:37` (`USAGE_NOT_RECORDED`) records Unknown. `.claude/skills/polaris-dossier/SKILL.md:126-129` asks the operator for the figure their tool shows.

[Observed] In a launched run (`syzygy polaris`) each session is an interactive `claude` started in a tmux window (`polaris.ts:579`, arguments from `sessionClaudeArgs`, `polaris.ts:541`), not a headless `claude -p` run, by the owner ruling tracked in syzygy-qkea.18 (`session-handover.ts:73-74`). Its `HOME` and `CLAUDE_CONFIG_DIR` are the run's private agent home, `<state root>/<run>.agents/<role>` (`session-view.ts:55-56`, `polaris.ts:506`), which the session itself may write (`session-view.ts:67`, `:71`, `:74`).

[Observed, key names only, read from this host's own Claude Code transcripts at version 2.1.331, never a run's] Claude Code writes a session transcript of JSON lines under its config directory. Each assistant row's `message.usage` carries `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` (with `cache_creation`, `server_tool_use`, `service_tier`, `speed`, `inference_geo`, `iterations`, `output_tokens_details`, `fallback_credit`). A `cost-state` row carries `totalCostUSD`, `totalDuration`, `totalAPIDuration`, `totalAPIDurationWithoutRetries`, `totalToolDuration`, `totalLinesAdded`, `totalLinesRemoved`, `hasUnknownModelCost` and `modelUsage`, whose entries per model carry `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `cacheCreationEphemeral5mInputTokens`, `cacheCreationEphemeral1hInputTokens`, `thinkingTokens`, `webSearchRequests` and `costUSD`. No row carries a turn total; turns would be counted from assistant rows. The Agent (subagent) tool's result to its parent session (`toolUseResult`) carries `totalTokens`, `totalDurationMs`, `totalToolUseCount`, `toolStats` and the same `usage` object: it reaches the parent session's own transcript, never Syzygy.

[Inferred] So in a launched run the usage of each session is readable without the operator, from the transcript under that session's agent home, but only as Inferred: the session can write the file it is read from, so it is never Observed and never a provider receipt; the transcript also carries prompt and response bodies, so a reader must take numeric usage members alone and copy no body. [Unknown] Whether a stored run's agent home holds such a transcript: this slice never opened a `run-*.agents` directory. In an operator-started run the sessions run under the operator's own home and Syzygy holds no pointer to their transcripts, so their usage stays Unknown. A headless `claude -p --output-format json` run returns a single result object (`claude --help`, 2.1.331); [Inferred] its documented members include usage, cost, turn and duration totals, but the launch does not use that mode.

[Inferred] This does not change `docs/polaris-generation/dossier-corpus-v1.json` `passBudget.usage` ("A run's tokens and turns are only the figures the runner declares at close"): it remains what the code does after this slice. It names the path slice 2 (syzygy-5dhm.26) can take; once that slice reads usage from the agent home, the corpus sentence needs the same amendment.

## Review (R-STEP-MEASURES-SPEC-1)

[Observed] One fresh-context review read the first draft (as version 2.27, digest `298c7b1c…6fcc`) beside the implementation at `d1a7cf9b4`; its raw is `docs/reviews/syzygy-5dhm-25/R-STEP-MEASURES-SPEC-1-RAW.md`, verdict `CONFIRM WITH EXCEPTIONS`, eight advisory findings. Dispositions:

- F1 (agent-written outcome strings became record keys): repaired. Only `passed`, `findings` and `refused` are keys; any other outcome counts under `other`. Paragraph, a scenario and a test say so.
- F2 (rounds of one kind could overlap): repaired. A round also ends, unfinished, at the next prompt of its kind. Paragraph, a scenario and two tests; two stored-run rounds change, as above.
- F3 (wall time is not between two logged instants): repaired in the paragraph's words.
- F4 (rows naming no revision; Scenario 1's inventory revision): repaired in the paragraph and Scenario 1.
- F5 (an out-of-order round voids its kind): repaired by saying so in the paragraph.
- F6 (the stored-run oracle cannot reach `issued`): repaired; the Form line names the literal test.
- F7 ("either" over three cases): repaired ("any case").
- F8 (the mutation runner rewrote the source during review): noted; no digest or commit was taken while it ran.

No finding was overruled and no confirmation round was run (D10: one review, gating nothing), so no review has read the repaired bytes. The version moved to 2.29 because other branches hold 2.27 and 2.28.
