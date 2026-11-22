# Dossier interactive handover design v1.8

**Artifact** `openspec/changes/polaris-dossier-local-agent-mode/design.md`

**Requirement** REQ-polaris-generation-035

**Change class** Clarifying

**CC-REV-1 classes** None. The patch corrects how the existing handover and
launch declaration are described.

**Author** Codex, bead syzygy-qkea.18

**Date** 2026-11-22

## Current and proposed text

[Observed] The patch gives the predecessor and successor text together. The
v1.2 tag at `77fc9f6e` still has the headless examples. Its waiting-session
amendment did not apply this correction. The v1.6 sign-off and its applied-tree
check remain the latest recorded local-agent-mode specification.

````diff
diff --git a/openspec/changes/polaris-dossier-local-agent-mode/design.md b/openspec/changes/polaris-dossier-local-agent-mode/design.md
index be3312e8..a6ca8eeb 100644
--- a/openspec/changes/polaris-dossier-local-agent-mode/design.md
+++ b/openspec/changes/polaris-dossier-local-agent-mode/design.md
@@ -1,13 +1,10 @@
 # Design: the operator-agent mode and the `syzygy dossier` commands

-> **Version 1.6.** Explains the requirements in
-> specs/polaris-generation/spec.md; version 1.0 was signed off by the owner
-> on 2026-10-06, version 1.1 on 2026-10-07 and version 1.2 on 2026-10-14,
-> and this text binds only by the owner's sign-off of version 1.6. It is not an
-> implementation. It contains no code. The command surface below is a design
-> for implementation after the owner's sign-off (direction item 5); the
-> requirements are the controlling text, and doctrine, accepted contracts,
-> the adopted requirements and the owner's rulings
+> **Design v1.8.** The agent adoption records the interactive handover
+> correction. The owner's recorded v1.6 sign-off covers the specification
+> and its predecessor design at the v1.6 tag. This design explains the
+> requirements in `specs/polaris-generation/spec.md`. Doctrine, accepted
+> contracts, the adopted requirements and the owner's rulings
 > (`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`,
 > `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`) remain
 > controlling over both.
@@ -52,42 +49,44 @@ the usage figure at the end.
 14 agent:    reports the site path, `syzygy dossier status <run>` verbatim, and what is still Unknown
 ```

-At steps 9, 10 and 12 the authoring session stops and hands over: it runs
-`syzygy dossier session-prompt`, which prints the fixed prompt and a
-ready-to-paste command (`claude -p "<prompt>"` or `codex exec "<prompt>"`).
+For an ordinary hand-over at steps 9, 10 and 12, the authoring session
+runs `syzygy dossier session-prompt` and waits. Issuing a fresh prompt
+prints the fixed prompt and a ready-to-paste command. The command changes
+to the role directory and starts interactive `claude '<prompt>'` or
+`codex '<prompt>'`, with the fixed prompt as the session's first message.
 Its working directory is a session directory Syzygy makes for that role:
 for the inventory, one holding only the inventory brief; for a review, the
 packet directory. It is never the clone, whose project-scoped agent
 configuration and instructions (`.claude/`, `.mcp.json`, `CLAUDE.md`,
 `AGENTS.md`) the tool would otherwise load, and never the state directory,
 which holds the drafts the inventory must not see. The **operator**
-opens a new terminal and starts that session there with the exact prompt
-printed, so it is a separate top-level session the operator starts and the
-authoring session never writes the reviewer's instructions (owner direction
+starts the printed role command. It is a separate top-level session and
+the authoring session never writes the reviewer's instructions (owner
+direction
 `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`, item 2). A
 subagent of the authoring session does not count. When the session finishes,
 the operator returns to the authoring session, which resumes at the next
 step. The loop is therefore attended at each hand-over, and no agent
 coordinates another.

-One other launch form counts: the operator may type the printed command
-behind Claude Code's `!` shell-escape prefix in the authoring session's
-terminal. The operator types it and the prompt is Syzygy's, so it is a
-session the operator starts (035); its output returns to the authoring
-session's context, which harms nothing in the review. A headless session
-that the authoring agent starts and reads is not offered: it is not a
-session the operator starts, and it brushes against "No unattended agent
-coordination" (first review, finding 9; the lead's ruling). That `!` counts
-is the lead's reading of the owner's words, shown to the owner in the
-packet: the `!` launch is the same headless command, a child of the
-authoring tool's shell whose output lands in the author's context, and only
-who typed it differs. Each session writes its own session identifier into
-its inventory or verdict (session-declared). When the operator returns, the
-authoring session asks how the session was started and records the answer
-with `syzygy dossier launch-form <run> <role> terminal|bang`
-(operator-declared, conveyed by the agent, as the run configuration is).
-Both are Inferred. A verdict or inventory counts only once its launch form
-is recorded, and any other form is refused.
+For an ordinary Claude Code hand-over, the operator may also use the
+printed `!` shell-escape form in the authoring terminal. The same
+interactive role command runs with Syzygy's fixed prompt. For Codex,
+Syzygy prints the new-terminal form. The operator starts each role
+session (035) and reports how it started. The authoring session records
+the report with `syzygy dossier launch-form <run> inventory terminal|bang`
+for inventory or `syzygy dossier launch-form <run> review terminal|bang
+--kind fidelity|design` for a review, using the matching kind. Each
+session declares its identifier in its inventory or verdict. The
+identifier and launch form are Inferred. An inventory or verdict counts
+only with an eligible recorded launch form.
+
+For the waiting flow, `syzygy dossier session-prompt <run> all` prints
+three new-terminal commands. As the operator reports each start, record
+its terminal launch form with the same commands and matching review kind.
+Later `session-prompt <run> review --kind <kind>` delivers the packet to
+the existing waiting reviewer of that kind. Add `--fresh` to issue a new
+review prompt.

 At step 3 the skill may offer presets, but the operator selects or types the
 values; Syzygy records them as operator-declared, conveyed by the agent
@@ -555,10 +554,9 @@ built and measured.
   check must carry an index map from normalised to raw offsets. Whether the
   rendered span is the exact raw range or widened to whole lines is a
   rendering choice; the requirement asks only that it be Syzygy's own bytes.
-- **Session identifiers.** [Unknown] whether Claude Code and Codex expose a
-  stable session identifier to the session itself, and whether `claude -p`
-  and `codex exec` report one the verdict can carry. If not, the operator
-  supplies one per session; either way it is operator-declared.
+- **Session identifiers.** [Unknown] whether the interactive Claude Code
+  and Codex sessions expose a stable identifier to the session itself.
+  Where the tool supplies none, the operator supplies one per session.
 - **Which object reader.** Decision 1 names an in-process reader; whether an
   existing library fits, or a small reader is written, is decided at
   implementation.
@@ -632,16 +630,17 @@ With a URL (the author, driving the loop):
    AskUserQuestion; record each with the operator's exact answer.
 7. Write `<run>/drafts/next.json`; `syzygy dossier check <run>`; repair every
    finding and re-run until clean or refused.
-8. For each of inventory, review --kind fidelity, then (after
-   `syzygy dossier render <run>`) review --kind design: run
+8. For ordinary hand-over, start with inventory, then review --kind fidelity,
+   then (after `syzygy dossier render <run>`) review --kind design. Run
    `syzygy dossier session-prompt <run> <role> [--kind <kind>]`, show the
    operator the command it prints, and wait. The operator starts that
-   session in a new terminal, or by typing `!` followed by the printed
-   command here. Never start it yourself, headless or otherwise, and never
-   use a subagent for it. When the operator returns, ask which launch form
-   they used and run `syzygy dossier launch-form <run> <role>
-   terminal|bang` with their answer. Resume
-   when the operator says it has finished, and run `syzygy dossier status`.
+   session in a new terminal or uses the printed `!` form for an ordinary
+   Claude Code hand-over. Never launch the role yourself or use a subagent
+   for it. When the operator returns, ask which launch form they used and
+   record the answer with `syzygy dossier launch-form <run> inventory
+   terminal|bang` or `syzygy dossier launch-form <run> review terminal|bang
+   --kind fidelity|design`, as appropriate. Resume when the operator says
+   the session has finished, and run `syzygy dossier status`.
 9. On a blocking finding, go back to 7.
 10. Ask the operator for the usage figure their tool shows (or none);
     `syzygy dossier close <run> --usage-…`. Report the site path and
@@ -700,7 +699,7 @@ verified; quote it exactly, and treat a refusal as a refusal.
 ```

 [Inferred] Codex reads `AGENTS.md` from its working directory and its home
-configuration, and `codex exec` starts a fresh non-interactive session; the
-exact flags are confirmed at implementation, not here. A review in the other
-tool (a Codex review of a Claude Code draft) needs only that tool installed
+configuration. The printed command uses the role directory and passes the
+fixed prompt as the first message to interactive `codex`. A review in the
+other tool (a Codex review of a Claude Code draft) needs that tool installed
 and is recorded as such.
````

## Warrant and boundary

[Observed] S7 documented the interactive commands and the owner's ruling to
use them. The prior waiting-session option B assessed a non-interactive
command. Its tool-approval cost describes that proposed form. The command
implementation and its literal assertions establish what is printed today.
VIS-4 and CC-REV-2 govern adoption of the design correction.
[PR #382](https://github.com/tzeusy-org/syzygy/pull/382)

[Observed] In `packages/polaris-dossier/src/session-handover.ts`,
`sessionCommands` passes the fixed first prompt in the role directory.
Ordinary Claude Code prints both forms. Codex and waiting sessions print the
new-terminal form. Under ordinary handover and waiting alike, the operator
starts the role. The design continues to use the existing recorded launch
form as the precondition for counting a submission. REQ-polaris-generation-035
continues to govern waiting eligibility, role capability and review
continuity. Existing controls govern provider disclosure, attendance,
execution and credentials. The design continues to label the reported
identifier and launch form Inferred and the tool's exposure of a stable
identifier Unknown. [Observed] The changed surface is documentation.

## Downstream impact and version

[Observed] The patch is the review surface. The literal
tests for inventory and waiting sessions cover the printed commands, and the
REQ-035 source specifies the waiting record and eligibility rules. A tracked
file census and an exact-string search of the live design, practical kit
and command implementation located the launch examples in the design and
a source comment recording S7's historical departure. The earlier option
and rationale remain in the dated blocker packet.

[Observed] The v1.6 record regenerates in both trees and its exact applied tree
verifies at the predecessor baseline. On the successor design the recorder
uses the D10 supersession path for the changed design. The proposed v1.7 aggregate subject names the earlier design
baseline. Applying that proposal to this design would require recomposition
and a review decision under CC-REV-1 and CC-REV-4 based on the resulting
semantic changes. The v1.7 builder verifies the
unapplied historical candidate at the predecessor baseline
`1960dbc60578cbb8737ee16263cdccd44f954bba`; the draft package is preserved at
its original commit. [Inferred] A distinct design version identifies which
interactive wording was adopted while retaining v1.6 as the recorded
local-agent-mode specification version. The agent adoption log names the
install commit and its revert command. The design version tag identifies
the installed correction.

## Review

The independent review returned **REVISE** against
`db78a1800fa8c5957e49db7d432b687fbbd1092f`. Its verbatim findings and both
subject blob IDs are in [the raw review](interactive-handover-review-RAW.md).
The disposition follows CC-REV-4.

1. Give the two launch-form signatures and require the corresponding review
   kind explicitly in the instructions.
2. Describe a fresh prompt under ordinary handover. Describe the waiting
   path's startup report, packet delivery and `--fresh` escape separately.
   The session declares its identifier in the submission.
3. Identify the design version and the previous owner sign-off separately
   in the design's opening.
4. State the CC-REV-1 classification and limit the v1.7 claim to
   recomposition and a review decision under the applicable clauses.

The cited patch drops trailing Markdown whitespace and displays blank
context lines as empty lines. The design source is the install commit.
