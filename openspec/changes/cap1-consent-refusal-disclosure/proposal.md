# Capability 1 consent refusal disclosure

## Why

RFC3-16(a) requires the record state and artifact to remain visible when a
dependent effect is refused. The adopted P-109 amendment explicitly keeps
the refusal reason visible but makes the artifact identity and digest
optional in the refusal case. P-109 round 4 recorded that gap in finding 2.
Readers should be able to identify the refused artifact from safe evidence
without treating its presence as authorization.

## What changes

- Draft v1.1 to the P-109 consent overlay with one complete proposed replacement
  for CAP1-REQ-046 and one RFC3-16(a) contract-coverage consequence.
- Retain the refused entry and matching safe diagnostics in both answer
  channels. Include the producing evaluation's independently captured,
  SEC-5-admitted artifact identity and exact digest when both are available.
  Render the pair Unknown with a safe reason and route otherwise.
- Keep the CAP1-REQ-011 consent gate and its dependent effect rules, the
  adopted bytes and recorded acts, and all valid-consent obligations.

## Status and scope

Candidate only. Independently review the frozen bytes under CC-REV-2 and
CC-REV-4. A separate adoption would bind the effective composition and a
version tag under the rules then in force. No runtime work, consent action,
change in observation scope, or expansion of artifact access is part of
this candidate. The first work item is syzygy-0v4l.
