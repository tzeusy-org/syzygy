# Dossier interactive handover design v1.8

**Artifact** `openspec/changes/polaris-dossier-local-agent-mode/design.md`  
**Requirement** REQ-polaris-generation-035  
**Change class** Clarifying  
**Author** Codex, bead syzygy-qkea.18  
**Date** 2026-11-22

## Current and proposed text

[Observed] The patch gives the predecessor and successor text together. The
v1.2 tag at `77fc9f6e` still has the headless examples. Its waiting-session
amendment did not apply this correction. The v1.6 sign-off and its applied-tree
check remain the latest recorded local-agent-mode specification.

```diff
diff --git a/openspec/changes/polaris-dossier-local-agent-mode/design.md b/openspec/changes/polaris-dossier-local-agent-mode/design.md
index be3312e8..e1325d2b 100644
--- a/openspec/changes/polaris-dossier-local-agent-mode/design.md
+++ b/openspec/changes/polaris-dossier-local-agent-mode/design.md
@@ -54,7 +54,9 @@ the usage figure at the end.
 
 At steps 9, 10 and 12 the authoring session stops and hands over: it runs
 `syzygy dossier session-prompt`, which prints the fixed prompt and a
-ready-to-paste command (`claude -p "<prompt>"` or `codex exec "<prompt>"`).
+ready-to-paste command. The command changes to the role directory and
+starts interactive `claude '<prompt>'` or `codex '<prompt>'`, with the
+fixed prompt as the session's first message.
 Its working directory is a session directory Syzygy makes for that role:
 for the inventory, one holding only the inventory brief; for a review, the
 packet directory. It is never the clone, whose project-scoped agent
@@ -70,24 +72,16 @@ the operator returns to the authoring session, which resumes at the next
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
+interactive role command runs with Syzygy's fixed prompt. For Codex and
+waiting sessions, Syzygy prints the new-terminal form. The operator
+starts each role session (035). Each session writes its own identifier
+into its inventory or verdict. When the operator returns, the authoring
+session asks how the role was started and records the answer with
+`syzygy dossier launch-form <run> <role> terminal|bang`. The identifier
+and launch form are Inferred. An inventory or verdict counts only with
+an eligible recorded launch form.
 
 At step 3 the skill may offer presets, but the operator selects or types the
 values; Syzygy records them as operator-declared, conveyed by the agent
@@ -555,10 +549,9 @@ built and measured.
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
@@ -636,12 +629,12 @@ With a URL (the author, driving the loop):
    `syzygy dossier render <run>`) review --kind design: run
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
+   run `syzygy dossier launch-form <run> <role> terminal|bang` with their
+   answer. Resume when the operator says the session has finished, and run
+   `syzygy dossier status`.
 9. On a blocking finding, go back to 7.
 10. Ask the operator for the usage figure their tool shows (or none);
     `syzygy dossier close <run> --usage-…`. Report the site path and
@@ -700,7 +693,7 @@ verified; quote it exactly, and treat a refusal as a refusal.
 ```
 
 [Inferred] Codex reads `AGENTS.md` from its working directory and its home
-configuration, and `codex exec` starts a fresh non-interactive session; the
-exact flags are confirmed at implementation, not here. A review in the other
-tool (a Codex review of a Claude Code draft) needs only that tool installed
+configuration. The printed command uses the role directory and passes the
+fixed prompt as the first message to interactive `codex`. A review in the
+other tool (a Codex review of a Claude Code draft) needs that tool installed
 and is recorded as such.
```

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

[Observed] The review surface consists of the five patch hunks. The literal
tests for inventory and waiting sessions cover the printed commands, and the
REQ-035 source specifies the waiting record and eligibility rules. A tracked
file census and an exact-string search of the live design, practical kit
and command implementation located the launch examples in the design and
a source comment recording S7's historical departure. The earlier option
and rationale remain in the dated blocker packet.

[Observed] The v1.6 recorded sign-off verifies with this design patch
applied. The proposed v1.7 aggregate subject names the earlier design
baseline and its applied-tree proposal consequently needs recomposition and
fresh review if taken up on these bytes. The v1.7 builder verifies the
unapplied historical candidate at the predecessor baseline
`1960dbc60578cbb8737ee16263cdccd44f954bba`; the draft package is preserved at
its original commit. [Inferred] A distinct design version identifies which
interactive wording was adopted while retaining v1.6 as the recorded
local-agent-mode specification version. The agent adoption log names the
install commit and its revert command. The design version tag identifies
the installed correction.

## Review

CC-REV-1 and CC-REV-4 govern fresh-context review of the patch, classification,
waiting-session boundary and recorded predecessors. Its receipt accompanies
the adoption.
