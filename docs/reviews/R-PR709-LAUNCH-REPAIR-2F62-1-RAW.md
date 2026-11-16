# R-PR709-LAUNCH-REPAIR-2F62-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 2f6297f6169ba741dfbe3a8ab678b0dadb173ead
Reviewer: fresh-context subagent, 2026-11-04

## Findings (none blocking)

**F1. A state file from before this change re-delivers a pair it already delivered.** polaris.ts:599. Criterion 1. Non-blocking. High confidence.
`state.fidelityDeliveredPairs ?? []` gives an empty list for a state written before the change, so the current (draft, inventory) pair is "due" again. `deliverToWaiting` (waiting-sessions.ts:256-271) does not deduplicate by packet digest, so the reviewer gets the same packet as round N+1. That costs one review round and one new verdict, but it does not loop: the pair is recorded once delivered. For a legacy run whose verdict already blocked, the re-delivered verdict is what finally triggers the inventory/author split. That turns out to be the useful outcome, but by accident.
Minimum fix: when `fidelityDeliveredPairs` is absent, seed it from the review delivery records (`packet.draftRevision`/`inventoryRevision`). Or record in the docstring that the duplicate delivery is accepted.

**F2. The inventory session's pass message tells it to end, which conflicts with being asked for a repair later.** waiting-sessions.ts:502 (unchanged) and polaris.ts:333. Criterion 1. Non-blocking. Medium confidence.
- When an inventory passes, `await` tells it "Your work is done: tell the operator, and end this session."
- The appended guidance never says that Syzygy may later ask for a revision after a pass.
- It also says "Never ask the operator to run, start or tell anything", which clashes with "tell the operator".

Resubmission is mechanically possible:
- `latest === role.session` still holds (waiting-sessions.ts:485).
- The inventory gate (inventory.ts:276-288) has no "already counted" refusal.
- `remain-on-exit` keeps the pane, and an idle Claude REPL takes typed input.

But a session that obeyed "end this session" cannot receive the repair message. Minimum fix: add one sentence to `LAUNCHED_GUIDANCE.inventory` saying that after a pass it stays open, because Syzygy may type a repair request.

**F3. Reviewer-written reasons are typed into the inventory session as if Syzygy said them.** polaris.ts:468-472. Criterion 1/SEC. Non-blocking. Medium confidence.
- `inventoryRepairMessage` inlines each review row's `reason` (300 characters each). That is text written by an LLM, which may echo text from the clone.
- tmux types it into the inventory session prefixed "Syzygy:".
- The number of entries is unbounded, so with many rows the typed message has no size limit.

Minimum fix: label the reasons as the reviewer's words (data, not instruction) and cap the number of entries listed, giving a count for the remainder.

**F4. The "bare not-ready goes to the author" case cannot happen inside the loop.** polaris.ts:582 and review.ts:166. Criterion 1. Non-blocking. High confidence.
- The supervisor's `verdictFor` reads `readiness.blocking`, which the check record sets to `derivedBlocking(verdict)`, not to the declared readiness.
- A verdict declared not-ready with no failing row is therefore treated as `'ready'` and rendered. `repairSides` never sees it.
- This predates the PR (`verdictFor` is not in the diff), but the commit message and the `RepairSides` docstring describe a path the loop never takes.

Minimum fix: correct the comment and message, or open a bead on whether a declared not-ready verdict should block rendering.

**F5. The mutant record does not name the commit or subject digest the syzygy-1z8m.4 mutants ran at.** docs/evidence/syzygy-1z8m-1/launched-guidance-mutants-2026-11-04.json. Criterion 4, rules 11 and 6-record. Non-blocking. High confidence.
- The record has `baseCommit: e233ebc5` and the note "applied to the uncommitted working tree".
- 13 of its 22 mutants (`sides-*`, `due-*`, `spent-*`, `flatten-*`, `msg-*`, `readverdict-*`) target code that does not exist at e233ebc5.
- No digest of the subject is recorded.

Minimum fix: add `subjectSha256` for polaris.ts at the tree the mutants ran on, and note that the 1z8m.4 entries ran at 2f6297f6's content.

**F6. The supervisor loop itself has no test.** polaris.ts:586-624. Criterion 4. Non-blocking (the commit message says so).
This covers the `inventoryRevision` currency gate on `fidelityState`, setting and clearing `pendingRepair`, and the screen phase. Removing the currency gate kills no test.

**F7. A refused final revision leaves the run idling until its deadline.** Criterion 1. Non-blocking. Low impact, not new behaviour.
If the side asked to repair submits its last permitted revision (revision == limit) and check refuses it:
- for the inventory, `inventory.counts` becomes false;
- for the draft, `passedDraft` becomes null.

Either way `fidelityState` is `'none'` and the run waits for its deadline instead of stopping as blocked. The old code behaved the same way for drafts.

## Checked clean

- **Off-by-one:** clean. `nextRevision` starts at 0, and check.ts:170 refuses only `revision > maxRepairCycles`. So revisions 0..max may freeze, and `fidelityRepairSpent`'s `>= max` (draft and inventory alike) stops exactly when no further revision can freeze.
- **Stop rule:**
  - It cannot stop while a requested repair is still possible: it only returns a side that has rows to repair and is at the limit.
  - It cannot loop forever: the deadline bounds the loop.
  - It cannot evaluate a half-repaired pair: once either side moves, the old verdict's packet no longer matches, so `fidelityState` is `'none'` and `sides` is null.
- **Delivery gating:** a pair is delivered only when every side in `pendingRepair` has a strictly newer revision. `pendingRepair` is cleared only on delivery or give-up.
- **`repairSides` against `derivedBlocking`:** same four keys, same predicates and the same record filter. Every row that makes `derivedBlocking` true lands on a side, and `author` is true whenever there is no inventory row.
- **Current-verdict rule:** a verdict counts only while its packet's `inventoryRevision` is the counting one. That matches REQ-polaris-generation-035 ("Any revision of the subject or the inventory retires the verdicts bound to it"). The `packet.inventoryRevision` the gate reads is written by review.ts:159.
- **`sessionClaudeArgs`:** byte-identical to the removed inline code, plus `'--append-system-prompt', LAUNCHED_GUIDANCE[role]` for non-author roles. Placing it after `--strict-mcp-config` ends the variadic `--disallowedTools`. `claude --help` lists `--append-system-prompt <prompt>`. The argv still goes into `launches[].argvSha256` and the launch record. One small caveat: on a resume, an existing launch record is not rewritten (pre-existing).
- **Signed content (criterion 3):** the diff touches only polaris.ts, the new test and the evidence JSON. No packet, criteria, check, handover or waiting-prompt code changed. Candidate REQ-045 allows guidance "explicitly on its command line".
- **Commands run:**
  - `npx tsc --noEmit -p .`: exit 0, no output.
  - `npx vitest run …/polaris-launch-guidance.test.ts`: 19/19 passed.
  - `npm run test:tiers`: "ok: every test file is in exactly one tier".
- **Test expectations:** they are literals.
- **Mutants re-run on the working copy, then restored:**
  - `due-ignore-inv-pending`: killed (1 failed).
  - The `>=`→`>` off-by-one in the draft side of `fidelityRepairSpent`: killed (2 failed). This one is new.
  - `no-append`: killed (1 failed).
  - polaris.ts sha256 before and after: `ece767297eb64b2e114261fe805ce951a909dee543502b69e3e140e2541ecbd2`. `git status` was clean afterwards.
