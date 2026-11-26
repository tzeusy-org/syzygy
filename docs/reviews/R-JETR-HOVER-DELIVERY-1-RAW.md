# R-JETR-HOVER-DELIVERY-1
Verdict: REVISE
Reviewed commit: a3acc4f140c3a115a6a6a1907b9fe2519792c0fd
Reviewer: fresh-context subagent

Subject: PR #1011, `apps/three-surface-poc/src/polaris-generation/dossier-reading.browser.test.ts` (sha256
b0346bb9e53cbf640c552407facd65688d3ea39e23649a316562122d27dfdfc2, identical at cfa986dff and a3acc4f14, re-derived by
`git show ... | sha256sum`) and `docs/evidence/syzygy-jetr/hover-delivery-mutation-2026-11-26.json`. Governing references:
bead syzygy-jetr acceptance criteria 1-3; AGENTS.md labels and verification rule 6.

Reviewer runs (local Chrome 120, worktree at a3acc4f14, file restored with `git checkout --` after each; `git status --short`
empty afterwards):

- R1 unrelaxed: fails `#block-local-reflow-inline a.cite: expected 200.953125 to be greater than or equal to 260` (6373 ms),
  as the PR and record say. [Observed]
- R2, R3 with the inline `leftRange` relaxed to `[0, 390]`: pass, 2580 ms and 2194 ms. [Observed]
- R4 mutant, relaxed: listener records `trusted: true` instead of `trusted: event.isTrusted` (line 85): the case PASSES. [Observed]
- R5 mutant, relaxed: the real hover move sent at `sample.point!.y + 40` (line 514): fails at the delivery check with
  `{"sampled":{"still":true,"point":{"x":207,"y":422},...,"scrollY":2366,"box":[200.953125,422.5,214.328125,422.5]},
  "delivered":{"target":"section#section-one","onLink":false,"trusted":true,"x":207,"y":462,"scrollY":2366,...}}`. No hint
  state in the message. [Observed]

Hosted CI for #1011 (`gh pr checks 1011`, at review time): `node (unit)` pass; `node (e2e)`, `node (integration)` and the
governance checks pending. [Observed]

## Findings

1. **F1, must-fix: a delivery miss does not report the hint state, which criterion 2 names.** Criterion 2: "If delivery misses,
   report event target and trust, before/after scroll and geometry, and hint state." `expectDeliveredOnLink`
   (test:103-106) puts only `{ sampled, delivered }` in its message, and it runs at line 516, before the hover poll at line
   522 ever reads `inspect`. R5 confirms: the miss message carries target, trust, scroll and box but not `hidden`, `hovered`
   or `contained`. Target, trust, sampled scroll/box and at-event scroll/box are present; the hint state is not. Repair: read
   `inspect` (or the popup's display and the link's `:hover`) after the move and include it in the delivery message, e.g. pass
   it into `expectDeliveredOnLink`.

2. **F2, should-fix: the trust half of the diagnostic is unproven in the page; one rule-6 mutant survives that the record
   does not list.** The in-memory checks at lines 519-521 prove the predicate rejects `trusted: false`, `scrollY + 5` and
   `box - 5` objects, but they mutate the record, not the recorder. R4 (listener records `trusted: true` unconditionally)
   survives: no real path ever produces an untrusted move, so the recorder's `event.isTrusted` read is not exercised. The
   control (lines 531-541) does exercise the recorder's `onLink`, `scrollY` and target fields. Either add the recorder
   mutant to the record as a named survivor with its reason (CDP moves are always trusted; the field is reported, not
   tested) or dispatch one untrusted `MouseEvent` in the control and require `trusted: false` to be recorded.

3. **F3, should-fix: the mutation record's baseline does not store the relaxation it ran under.** Every run relaxed
   `leftRange: [260, 390]` to `[0, 390]`, described only in prose under `host.note`. The `m0-baseline` entry's `old`/`new` are
   the identical placeholder `"const inline = 'document"`, which mutates nothing and cannot be re-applied. Rule 6 asks each
   run to be re-runnable from its stored fragments: record the relaxation as the baseline's `old`/`new`
   (`leftRange: [260, 390] as const` -> `leftRange: [0, 390] as const`) and say every mutant is applied on top of it. The
   commit (`cfa986dff`) and subject digest are stored and match. [Observed]

4. **F4, should-fix: two comment claims are stronger than their evidence.** (a) test:45 "an explicit instant `scrollTo`
   followed by two still frames leaves no scroll in flight when the point is sampled" is stated as fact; two equal frames show
   the page was still for two frames, not that nothing is pending (a later layout shift or scroll would still occur), and it
   was observed only on Chrome 120. The delivery check catches such a case, so the code is fine; the sentence should be
   [Inferred] or say "no scroll observed in flight". (b) test:46-47 says a point on the zero-height box "sits on an edge" and
   the glyph band is preferred for that reason, while the record's own survivor `m3-box-centre` reports the box centre hit the
   link on this host. Say the glyph band is a precaution, not a measured necessity. The PR body's "[Inferred] Hosted Chrome 157
   hit the same in-flight scroll" is correctly labelled; the commit message's "so a scroll still in flight could move the
   link" is phrased as possibility and is acceptable.

5. **F5, note: criterion 3's "verify ... the repository's required CI" and the committed bound are not yet verified.** The
   named case cannot pass locally unrelaxed (R1), so the committed `[260, 390]` bound and the fix on Chrome 157 rest entirely
   on hosted e2e, which is pending. One green hosted run would not show the 3-of-5 intermittent rate is gone; the PR should
   claim at most "passed N hosted runs" with N stated, never "fixed". [Unknown] until CI reports.

6. **F6, note: the 60_000 budget is not a widened delivery or hint threshold, but it is a 12x widening of the case's test
   budget and is stated without a measurement.** Before this PR the case had no budget, so it ran under the e2e tier's default
   (vitest.config.ts:45 sets none; vitest's default is 5 s). The assertions that decide a wrong target or hidden hint are
   untouched: `deliveredMove` waits at most 40 x 25 ms only for the event to arrive and then compares geometry exactly, and
   both hover polls keep vitest's default poll timeout. A larger test budget cannot turn a miss into a pass, only let a slow
   correct run finish; it also lets the 120-frame stability loop report `still: false` instead of a bare timeout. So it does
   not breach criterion 2. But the PR body says only "the 60 s budget its siblings state"; it should say the prior budget was
   the 5 s default, and cite a duration (R2/R3: 2.2-2.6 s locally) for why 60 s rather than e.g. 30 s.

7. **F7, note: in-page JS correctness is otherwise sound.** [Observed by reading] The stability loop (test:55-60) exits on
   two consecutive equal states or after 120 frames and returns `still` so the caller fails on non-settling pages rather than
   proceeding. `recordMoves` removes the previous capture listener before installing one (test:79); the last one is left on a
   page closed in `finally`, which is harmless. `point ?? null` and the `toMatchObject` at line 510 guard the later
   `sample.point!`; `expectDeliveredOnLink` throws on a null move before `move!` is spread at 519-521. A null `link` throws
   inside the evaluate (settledHitPoint) or inside the listener, where it yields `delivered: null` in the failure message:
   acceptable. Residual risk: `requestAnimationFrame` does not fire on a hidden page, which would hang the evaluate until the
   test budget; the CDP page is foreground today. The exit check (`mouseMove(0, 0)` then poll hidden, line 525-526) and the
   keyboard focus and containment check are kept unchanged. The change stays in the existing test file; no fixture,
   production or workflow file is touched (`git show --stat` of both commits).

8. **F8, note: criterion 1's "independently settled fixture state".** The hover starts after keyboard focus, blur and a
   hidden-hint check on the same page load, then settles by its own instant scroll and two still frames. That settles the
   geometry independently of the prior focus scroll; it does not reload the fixture. I read the criterion as satisfied by the
   settle loop; if the bead author meant a fresh navigation, it is not.
