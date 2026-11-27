# Applicable contract consequences

This delta adds the attended operator projection to existing REQ-polaris-generation-048. The matrix covers each consequence changed by that projection and the unchanged boundaries on which it relies. The prior REQ-048 remains the source of the underlying supervisor behavior.

| Authority | Observable consequence | Covering requirement or comparison |
| --- | --- | --- |
| VIS-2 and RFC2-24 | The view distinguishes a verified live attempt from unavailable evidence and carries the reason. | REQ-048, Unverified view state stays Unknown. |
| VIS-2 | Detach and return name the same attempt, one interval and the original deadline. | REQ-048, One detached interval for the same live attempt. |
| VIS-2 | Inspecting status supplies view evidence without assigning a successful stop, resume or review outcome. | REQ-048, Stop and resume are distinct from inspecting a view. |
| VIS-2 | The human view gives equivalent plain-language cues for wait, eligible question and unavailable observation. | REQ-048, Ordinary and unverified waits remain distinct in plain text. |
| VIS-2 | The eligible Author question remains discoverable with keyboard access, including the recorded fallback for an unavailable view. | REQ-048, The author question has a discoverable keyboard path and An eligible Author question survives the unavailable view. |
| VIS-3 | Inventory and reviewers use independent role bindings, packets and checked dispositions. | Unchanged REQ-035 under A-305 and inherited REQ-048. The coverage fixtures check role identity, the v5-or-later missing-outcome publication hold and the historical schema and withheld-entry controls. |
| SEC-2 and SEC-5 | The exception is the disclosed author's own local read. Screened role input and artifacts still use the present checked channel. | Unchanged REQ-033 under A-51, REQ-035 and REQ-048. The role fixtures distinguish the raw-author channel from URL tool reads and disallowed helper input. |
| SEC-3 | An execution-permitting choice or retained permitting brief refuses before the affected role launches. | Existing REQ-048 no-observed-code execution requirement and its negative launch scenario. |
| VIS-4 and CC-SPEC-10 | The effective change traces to an exact protected source, binding row and version. | Pending recorder, exact review and inverse in the [verification plan](VERIFICATION.md). |

Current RFC and support-carrier questions stay Unknown where the archived review and the current candidate lack verified evidence. The coverage above assigns only the consequences tied to these specific requirement and scenario bytes.
