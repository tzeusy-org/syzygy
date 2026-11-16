# R-PDJA-19-USAGE-NOTE-1 — per-round usage note, skill batching guidance, fidelity delta-review note
Reviewed commit: 2e81638435adf80f4022577b209ad1e67ea896ca
Subject: PR #803
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: independent, fresh context. Diff reviewed: `git diff origin/main...HEAD`
(6 files, +302/-6) on branch `agent/syzygy-pdja.19-fidelity-cost`, HEAD confirmed
2e816384. No observed-repository body, dossier output or credential was read; no
dossier run was made. Every mutation was restored (`git status --short` empty after
each step).

## Acceptance criteria

1. **Packet byte-unchanged — holds.** [Observed] The diff leaves the packet builder
   untouched: `deliverToWaiting` still writes `built.bytes` and `built.sha256`; the new
   `packetBytes` and `usageNote` go only to the delivery record
   (`packages/polaris-dossier/src/waiting-sessions.ts:326`) and the CLI report
   (`waiting-sessions.ts:345`). Proof by fixture: a temporary probe test, appended to the
   test file and then removed, ran the `harness()` fixture through two fidelity rounds
   (round 2 after a `Kestrel, repaired` revision) and hashed each `round-N/packet.json`
   after replacing the per-run temp root and run id with placeholders. Run twice with
   HEAD's `waiting-sessions.ts` and twice with `origin/main`'s (and main's test file):
   round 1 normalized sha256 `b57ea3ddc735d8c78164e272bf14b9f15900cacc415ea4809f87c518838019e6`
   (25,504 bytes), round 2 `73665c17d06306eb3da9f272d8b4e9baa97021032b26e1a9c044288a27f5b06d`
   (25,514 bytes), identical in all four runs. In every run the raw file's sha256 equalled
   the delivery record's `packetSha256`, so the digest a verdict names and REQ-033's
   rebuild-and-compare see the same bytes as before. The only per-run variance was the run
   path and run id, which main has too.

2. **Usage stays honest under REQ-033 — holds, with Finding 1.** The clause, from
   `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:23`:
   "Agent usage SHALL be recorded only as the figure the operator declares, labelled
   Inferred and attributed to the operator, and where no figure is declared the run record
   SHALL say that the usage was not recorded and that Syzygy cannot observe it; it SHALL
   NOT be presented as Observed, as a provider receipt, or as zero." [Observed] The note
   (`waiting-sessions.ts:287-299`) carries no token figure, never uses the word Observed,
   says "Syzygy cannot observe the session's token use; only the figure the operator
   declares at close records it, labelled Inferred", and renders an unsized earlier record
   as "Unknown", never 0 (`waiting-sessions.ts:261` maps a missing or invalid size to
   `null`). The human output is generated from the same document (`cli.ts:26-27`), so the
   note reaches a non-JSON reader too.

3. **Carried-context figure — labelled Inferred and correct over sized and unsized
   records; see Finding 2 for records that are not counted at all.** [Observed] The sum
   runs over sized records only, the unsized ones are counted apart as Unknown, and the
   `them` / `k of them` phrasing is exact (`deliveryUsageNote` unit test, rounds 100 /
   null / 250 → "350 bytes over 2 of them … 1 round whose record states no size
   (Unknown)").

4. **Literal expected values and mutants — holds.** [Observed] The tests compare against
   literal strings and the `statSync` size of the written file, never a value from the
   module under test. The evidence record's subject digests match HEAD's bytes
   (`fd0c0e99…` and `dba3e66d…`, re-hashed at 2e816384 and at `ranAt` 184a7a2a, an
   ancestor of HEAD). Re-run from
   `docs/evidence/syzygy-pdja-19/usage-note-mutations-2026-11-09.json`, each `old`
   fragment found exactly once, applied alone, the record's own command, file restored
   after each:
   - M1-utf16-length: killed, exit 1, 1 failed / 19 passed (the non-ASCII test).
   - M3-omit-earlier-rounds: killed, exit 1, 3 failed / 17 passed.
   - M4-missing-size-as-zero: killed, exit 1, 1 failed / 19 passed.
   - M5-every-round-sized: killed, exit 1, 2 failed / 18 passed.
   - Baseline after restore: exit 0, 20 passed / 112 skipped.

5. **Design note's clause claims — accurate, with Finding 3.** Spot-checked against the
   spec text: REQ-035's packet sentence and "and nothing else" (scenario "Review packet
   without the authoring exchange", spec.md:475); the completeness rule and "Any revision
   of the subject or the inventory retires the verdicts bound to it" (spec.md:460); the
   continuity "MAY" and "may anchor this one" (spec.md:464); REQ-033's
   rebuild-and-compare (spec.md:25) and usage sentence (spec.md:23); REQ-034's
   resubmission sentence (spec.md:245), its table-cell reading (spec.md:249) and "with
   the claims as presented" (spec.md:251); REQ-006's "confirm the frozen bundle" and "A
   revision SHALL retire dependent review evidence" in
   `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md:235`,
   and "REQ-035 displaces neither" holds (spec.md:466 names neither among what it reads
   or displaces, and keeps the immaterial-wording rule unchanged). Each quotation matched
   the text verbatim.

6. **Checks — pass.** `npm run check`: the first run failed on one test, a 5000 ms
   timeout in `packages/polaris-generation-core/src/island-boundary.test.ts` ("admits
   transitive island ingress only from the island and exact parked remainder"), which
   the diff does not touch. That file passed alone (9/9) and the full re-run exited 0:
   176/176 files, 4068/4068 tests. `python3 scripts/check_governance.py`: exit 0, "32 OK,
   21 WARN, 0 FAIL (53 checks)"; no WARN line names a file this diff changes.

7. **Authority — holds** [Inferred]. `POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`
   (2026-10-05) chose the option "I draft the CC-REV-2 amendment, get it reviewed, bring
   it to you for a version-tag sign-off, then implement" (line 51), and item 5 says
   implementation that depends on the amendment "waits for that sign-off". v1.5 is
   signed (`POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.5.md`). That sign-off's own text
   says "It authorizes no implementation of the signed semantics" (line 42), so the
   authority is the direction plus the signed text, the same footing pdja.17 and pdja.20
   took. The change implements nothing the signed text does not already allow: an extra
   field on a delivery record, a line on the CLI report, skill advice and a note that
   proposes but does not implement option D.

## Findings

**Finding 1 — the note states agent behaviour Syzygy cannot observe, with no label** (note)
`packages/polaris-dossier/src/waiting-sessions.ts:288` says "the session reads it whole",
and `waiting-sessions.ts:296` says "each model call it makes reads its whole context
again". Both are claims about the agent session and its tool. `DELIVERY_DISCLOSURES`
already says it is Inferred that the session reads the packet unaltered. The figures are
honest; these two clauses carry no label. Suggest "[Inferred]" or "as Syzygy expects",
and pin the wording in the round-1 test.

**Finding 2 — a delivery record that `deliveries()` drops is not counted, not even as Unknown** (note)
`waiting-sessions.ts:259` returns `[]` for a record with a wrong `round` or a missing or
non-string `packetSha256`. The note's "already holds N earlier rounds" uses
`earlier.length`, so a session that took rounds 1 and 2, whose round-1 record was
altered, gets round 3 and a note saying it holds 1 earlier round. The rounds the note
can name are counted correctly. A held count lower than the round number minus one
goes unsaid. This gap is older than the PR: the round numbering and the continuation
text at `waiting-sessions.ts:370` rest on the same filter. Consider counting the gap
`round - 1 - earlier.length` as Unknown rounds.

**Finding 3 — two of the design note's Inferred cost claims do not follow from its own model** (note)
`docs/polaris-generation/fidelity-delta-review-proposal.md:116-117` says D's saving "is
mostly on the linear term". But under the note's own model (lines 20-24), a continuing
session's carried context is the sum of the packets it was delivered. Smaller delta
packets therefore shrink the quadratic term as well. Line 68 says six rounds cut to two
or three "roughly halves the review's spend". Under the same model, carried context
grows like 1+2+…+n, which gives 21 packet-reads against 3 to 6, a cut of about 70-85%,
not half. Neither claim binds anything and both are labelled Inferred. They do feed the
recommendation to defer D, so the owner should see them stated correctly.

**Finding 4 — row A labels the bytes Observed while the note itself carries no label** (note)
`fidelity-delta-review-proposal.md:67` says the note "states bytes Syzygy built
(Observed)". The implemented note labels its byte figure with nothing ("built by Syzygy
at this step"). Labelling the bytes Syzygy built and wrote at that step as Observed
would be defensible, since they are not agent usage. Still, the design note should
describe what the code does, or the code should carry the label the note claims.
