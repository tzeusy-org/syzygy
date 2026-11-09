# R-PDJA-25-28-1 — RS-13 advice classes and zero-bytes oracle, PR #814, round 1
Reviewed commit: d316d170f5deeb96a07a26c639c175923d4fd525
Subject: PR #814
Verdict: CONFIRM WITH EXCEPTIONS

## Findings

**Finding 1 — The anchored zero-bytes oracle is correct, and the bug reproduced in this environment** (note)
- [Observed] `ZERO_BYTES = /(?<![\d.,])\b0 bytes\b/u`, at `waiting-sessions.test.ts:971`, was probed with vite-node against these strings:
  - Matches (true): `0 bytes` at line start, `(0 bytes over them)`, `sent 0 bytes.`, `a 0 bytes`, `=0 bytes`, `-0 bytes`.
  - No match (false): `25540 bytes`, `10 bytes`, `100 bytes`, `2,0 bytes`, `1.0 bytes`, `x0 bytes`, `00 bytes`, `0 bytesize`.
- [Observed] `deliveryUsageNote(..., packetBytes: 0)` produces a note that matches the oracle, so the oracle catches a real "0 bytes" claim.
- [Observed] In this environment the integration test's round-2 packet was `25540 bytes`.
  - Under the unanchored mutant `/0 bytes/u`, the original integration test "says Unknown, never zero…" failed on that string.
  - That reproduces the pdja.28 bug. The anchored form passes it.
- [Observed] The oracle does not match `0 bytes` (two spaces), `0\u00a0bytes` or `0 Bytes`.
  - [Inferred] `deliveryUsageNote` emits none of these forms, so this is not a gap.

**Finding 2 — All four RS-13 classes have literal tests that cover the bead's examples** (note)
- [Observed] Each test value in `reader-standards.test.ts:116-141` is a literal title, and each expected value is a literal reason string or `undefined`.
- [Observed] Every example the bead names has a positive test:
  - PascalCase: RedisModule, HttpServer, EventLoop, ClientState, ByteBuffer.
  - Paths: src/server, net/http, lib/utils.
  - `.js` files: App.js, Server.js, Index.js.
  - Initialisms: parseURL, toJSON, getID, innerHTML.
- [Observed] d3.js and three.js have negative tests.
- [Observed] Negative tests also cover:
  - GitHub, JavaScript, TypeScript, YouTube, GitLab, WebSocket, McCarthy and PostgreSQL;
  - read/write, I/O, TCP/IP, client/server, and/or and OS/2;
  - Node.js, Next.js and Vue.js;
  - macOS, tvOS, watchOS, openSUSE, iOS and gRPC.

**Finding 3 — Ordinary prose stays unflagged; brand-shaped words become advice-only false positives** (note)
- [Observed] I probed about 65 titles. None of the plain-English ones was flagged. These include:
  - "How the server starts", "Why the cache evicts keys", "What happens on a cold start", "The request lifecycle", "Where errors go";
  - "Writing to disk", "How replication works", "The Big Picture", "Life Cycle of a Request", "Inside the event loop";
  - "A Tour of the Codebase", "Working with Docker Compose", "The New York deployment", "Deploying to AWS and GCP", "Why McDonald uses it";
  - "Pass/fail criteria", "Yes/no answers", "Using Express.js", "Using Chart.js", "PostgreSQL vs MySQL".
- [Observed] Products and names absent from the lists are flagged under the new two-part PascalCase rule:
  - LeBron, DeepSeek, PyTest, LiveView, SvelteKit, NextAuth, DevTools, QuickStart and LaTeX.
  - The PR body predicts this ("Any brand missing from the list is a false positive in advice only").
  - LaTeX is flagged because `La`+`Te` count as two capitalised parts.
- [Observed] `The os/arch matrix` is flagged as a path through the `os` head.
  - [Inferred] This is a prose-pair false positive that the head list brings back.
- [Observed] `SURNAME` (`^Ma?c[A-Z][a-z]+$`) exempts a real code type, such as `MacAddress`. This is a new false negative.
- [Observed] These titles were flagged before this PR by rules it does not change, so they are not regressions:
  - `ioBroker` and `kubeCTL` (pre-existing camelCase rule);
  - `src/`, `bin/` and `tests/unit` (trailing-slash and path rules).
- [Inferred] None of this changes an outcome (see Finding 4), so I do not hold the PR for it.

**Finding 4 — No outcome, exit code, stored record or gate changes** (note)
- [Observed] `readerAdvice` and `reviewReachAdvice` have one production caller: `check.ts:264-267`.
  - Both run after the check record is written at `check.ts:257` and after the outcome is logged.
  - Both are spread only onto the returned report (`check.ts:270`).
- [Observed] `cli.ts:349-351` sets the exit code from `result.report.outcome` alone.
- [Observed] Existing tests pin that advice never reaches the stored record:
  - `check.test.ts:813` checks `read(run, 'checks/rev-0.json')).not.toContain('readerAdvice')`.
  - `check.test.ts:479` and `inventory.test.ts:362` assert the property is absent where it is not offered.
- [Observed] A sweep of the tree (excluding `node_modules`, `dist`, `.git`, `docs/reviews` and `docs/evidence`) found these other readers:
  - `brief.ts:38` (comment) and `polaris.ts` (the author prompt). They tell the authoring session to read the advice, which is advisory by design.
  - Tests.
  - The skill's `reader-standards.md` copies, which hold the RS-13 rule text and are unchanged.
- [Observed] `ELEMENT_DETAIL` feeds only the `detail` string of `reviewReach.elements` (`review-reach.ts:131`). The counts are unchanged.

**Finding 5 — The ELEMENT_DETAIL text matches `render.ts`, but omits the Pole-label consequence** (note)
- [Observed] Diagram title and relationship:
  - `render.ts:602-605` `diagramHeld` is true when the diagram has at least one node or edge and every one is withheld.
  - Line 620 then renders both title and relationship as `WITHHELD_LABEL` (`'Withheld item'`, line 790).
  - The detail's "if every node and edge of its diagram is withheld, the diagram's title and relationship render as "Withheld item" too" is accurate.
- [Observed] Section title:
  - `render.ts:607-610` `containerTitle` holds a section title when every paragraph leaf and every diagram of the section is held, with at least one of either.
  - The detail's "the title of a section whose paragraphs and diagrams are all withheld" is accurate.
  - [Inferred] It also covers a section with no paragraph leaves and one held diagram, which the clause reads as true vacuously.
- [Observed] The detail does not say the next step:
  - At `render.ts:775`, a Pole label renders as `Withheld item` when every section in that Pole has a withheld title.
  - [Inferred] That is one more transitive consequence of a withheld node or edge.
  - The bead did not ask for it. It is optional advice text.
- [Observed] The new test in `review-reach.test.ts` checks the following:
  - the consequence string appears on both diagram-node details and the one diagram-edge detail;
  - the two understanding-item details do not carry it.

**Finding 6 — The rule-6 record stores fragments, the commit and digests, and three re-runs reproduced (four re-run in all)** (note)
- [Observed] `pdja-25-28-mutants-2026-11-10.json` is complete:
  - It records 17 mutants. Each has `file`, `old`, `new`, `tests`, `outcome`, a `vitest` summary and `failedTests`.
  - It also records `ranAt` `35688fea4f8acb7b2e3265d678a37ec4885dfd51` with a rebase note, and `subjectDigests`.
- [Observed] `35688fea` is an ancestor of the head, and `git diff 35688fea HEAD` touches only the evidence file.
- [Observed] All six `subjectDigests` match sha256 of the bytes at the head.
- [Observed] I re-applied four mutants by exact single replacement (count asserted 1), ran the recorded tests and restored the file. All four were killed.

  | Mutant | Recorded | Re-run |
  |---|---|---|
  | `pascal-three-parts` | `Tests  6 failed \| 76 passed (82)` | `Tests  6 failed \| 76 passed (82)` (identical) |
  | `path-head-case-insensitive` | `Tests  1 failed \| 81 passed (82)` | `Tests  1 failed \| 81 passed (82)` (identical) |
  | `element-detail-drop-node-consequence` | `Tests  1 failed \| 19 passed (20)` | `Tests  1 failed \| 19 passed (20)` (identical) |
  | `pdja28-oracle-unanchored` | `Tests  1 failed \| 133 passed (134)` | `Tests  2 failed \| 132 passed (134)` |

- [Observed] The extra failure in the last row is the original integration test "says Unknown, never zero…". Its packet here was 25540 bytes (see Finding 1).
- [Inferred] The recorded count for that mutant depends on the environment, as the bead says. The killed outcome holds in both environments.
- [Inferred] A note in the record that this count varies with the environment would stop a later re-run from reading the difference as drift.

**Finding 7 — Checks are green locally; CI governance was still pending** (revise)
- [Observed] `npm run check`: `Test Files  183 passed (183)`, `Tests  4306 passed | 1 skipped (4307)`, exit 0.
- [Observed] Integration tier (`npx vitest run --project integration packages/polaris-dossier`): `Test Files  22 passed (22)`, `Tests  1252 passed | 4 skipped (1256)`.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  - A grep of its WARN/FAIL lines for the changed files' names found nothing (exit 1).
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`:
  - `second-method PASS: git ls-files=822; git ls-tree=822; exact path sets equal`
  - `partition PASS: denominator=822; assigned=822; raw=777; other=45; unmatched=0; overlaps=0; campaigns=147`
- [Observed] `gh pr checks 814` on head d316d170:
  - pass: `node`, `node (e2e)`, `node (integration)`, `node (unit)`, `checks (P115 recording selftest)`, `checks (readability selftest)`, `checks (reconciliation selftest)`.
  - `checks (governance)` was `pending`.
- [Observed] The PR is a draft and `MERGEABLE`.
- [Unknown] The hosted governance job's result. Do not merge until it reports pass.
