#!/usr/bin/env bash
# Reviewer's second method for the string-pre-image pins of PR #538: bash printf + coreutils sha256sum,
# pre-images typed by hand from the test and module source text. Imports no module under test, no hashlib, no node:crypto.
# Output: one "<id> <digest>" line per literal.
set -u
h() { sha256sum | cut -d' ' -f1; }
nul() { printf '\000'; }

# C3: model.test.ts butlersFixture() file contents, byte for byte.
printf 'C3 docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md sha256:%s\n' "$(printf '%s' '# WhatsApp identity design
Status: Approved for implementation
' | h)"
printf 'C3 openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md sha256:%s\n' "$(printf '%s' '# Repair WhatsApp identity reconciliation
- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.
owner-approved-intent-marker
' | h)"
printf 'C3 openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md sha256:%s\n' "$(printf '%s' '# switchboard identity
REQ-switchboard-identity-001
whatsapp_user_client -> whatsapp_jid
' | h)"
printf 'C3 src/butlers/identity.py sha256:%s\n' "$(printf '%s' 'def canonical_identity():
    return "private-source-marker"
' | h)"
printf 'C3 tests/core/test_identity.py sha256:%s\n' "$(printf '%s' 'def test_identity():
    assert "private-test-marker"
' | h)"

# C11: JSON.stringify of dossier-evaluation.test.ts QUESTIONS, written out by hand.
printf 'C11 questionsSha256 %s\n' "$(printf '%s' '{"format":"polaris-reader-questions-v1","questions":[{"id":"q-ideas","topics":["core-ideas"],"text":"What is the central idea?"},{"id":"q-trade","topics":["trade-offs","mechanisms"],"text":"What does speed cost?"},{"id":"q-purpose","topics":[],"text":"Who is it for?"}]}' | h)"

# R3: JSON.stringify([id, question, scope, reason]) per dossier-profile.ts:119-128, written out by hand.
printf 'R3 purpose %s\n' "$(printf '%s' '["purpose","What is this project for, and who is it for?","The purpose and beneficiary framing of every section.","No selected source path looks like an overview, README or statement of purpose (a path test, not a reading of content)."]' | h)"
printf 'R3 audience %s\n' "$(printf '%s' '["audience","Who should this dossier be written for?","Depth, vocabulary and which workflows are treated as primary.","No intended reader was declared."]' | h)"
printf 'R3 scope %s\n' "$(printf '%s' '["scope","2 file(s) did not fit the source budget. Continue with a limited account, or extend the budget?","Every claim about material in the deferred files.","Selection was capped, so part of the repository is counted but unread."]' | h)"

# R9: attempt- + sha256(requestId NUL stage NUL ordinal), request run-one, ordinals 0..4 in stage order.
ord=0
for stage in inventory plan author edit fidelity; do
  printf 'R9 %s attempt-%s\n' "$stage" "$( { printf '%s' run-one; nul; printf '%s' "$stage"; nul; printf '%s' "$ord"; } | h)"
  ord=$((ord + 1))
done
