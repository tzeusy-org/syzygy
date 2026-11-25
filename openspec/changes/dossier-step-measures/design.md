# Design

## Timing evidence

[Observed] The close record stores its own clock instant before appending its close row. Earlier Syzygy commands append instants, and passed or findings draft and inventory checks also append their revision numbers. The attended and waiting handoffs log reviewer kind and session. Waiting delivery includes a round number. A validated review check carries kind and number without a session or round identity. [Close writer](../../../packages/polaris-dossier/src/close.ts) · [Check writer](../../../packages/polaris-dossier/src/check.ts) · [Attended handoff](../../../packages/polaris-dossier/src/session-handover.ts) · [Waiting delivery](../../../packages/polaris-dossier/src/waiting-sessions.ts) · [Review validator](../../../packages/polaris-dossier/src/review.ts)

[Inferred] One bounded read supplies the legacy step view and the new measures. A separate existing inventory of file digests may run after that read. Close preserves both views of the retained snapshot even if the underlying file is replaced during that inventory. Earlier saved records without the new field stay readable. Intervals start at the first stored instant and end at the named first milestone or the captured close instant. They describe wall time in the recorded lifecycle, without a claim of command duration, session effort, attendance or the time of an unrecorded stage.

[Inferred] Distinct revision counts use passed or findings checks. Review pairing follows physical order within each kind, consumes a validation once, and marks superseded or unpaired prompts unfinished. The stored order supports this inference without proving the validator's session or round. An unpaired interval is Unknown. A readable but incomplete log reports its bounded row accounting and yields Unknown measures. The projection retains only numeric values and fixed reasons alongside its labels. Command logs, session output, credentials, evaluator inputs and provider records supply no new read.

Before writing, close applies the same bounded JSON parser as status. It keeps the existing JSON members and prefers the familiar formatted form. Compact JSON can preserve large existing content within the exact byte ceiling. A fixed capacity Unknown replaces the derived member only when the full measures cannot fit. If the remaining complete record still cannot fit, close gives a typed refusal and creates no Execution Record.

## Which usage fields are readable

| Field | What the current Syzygy path can report |
| --- | --- |
| Tokens and turns | [Observed] Close accepts explicit positive `--usage-tokens` and `--usage-turns` declarations. A supplied field is Inferred and attributed to the operator. An absent member is Unknown. |
| Review packet size | [Observed] Syzygy can report the UTF-8 byte count and digest of a review packet it built and wrote. These describe that packet. |
| Tool-owned token categories, cache, cost, usage limits, turn totals and execution time | [Unknown] The attended opening and waiting handoff produce interactive launch commands. They do not acquire a tool-owned usage receipt. |
| Stage and review elapsed intervals | [Inferred] The proposed close measures derive from Syzygy's retained log and the captured close instant. |

[Observed] Claude Code documents an interactive `/usage` command and a separate structured programmatic output mode. Local `codex exec --help` documents its non-interactive `--json` event stream. Neither tool's alternate mode is entered by this proposed close change. The actual interactive commands, Syzygy's packet bytes and the only existing declaration are directly inspectable in the source. [Claude Code commands](https://code.claude.com/docs/en/commands#commands) · [Claude Code programmatic output](https://code.claude.com/docs/en/headless#get-structured-output) · [Interactive command construction](../../../packages/polaris-dossier/src/session-handover.ts) · [Packet sizing](../../../packages/polaris-dossier/src/waiting-sessions.ts) · [Close declaration](../../../packages/polaris-dossier/src/close.ts) · [Status reader](../../../packages/polaris-dossier/src/status.ts)

## Verification

[Inferred] Use synthetic owned fixtures through normal close. Independently pin literal intervals, distinct revision and round counts, Unknown cases, both projections across a replacement and byte parity of the provider rendering. The useful discriminator for the replacement case mutates only the source read for the measures. The useful discriminator for attribution varies one prompt, validator or instant while holding the rest of the synthetic log fixed.
