# P115 behavior and verification matrix

Status: PROPOSED implementation tests, not executed evidence. Normative owner is POC-REQ-014 in the exact six-file signed source binding; original POC/PWB clauses retain their scopes.

| Input/boundary | Required producer and consumer behavior | Existing gate to extend; reason |
|---|---|---|
| Observed N=0 | One complete shared value, items[], measured count0, no item claims; consumer admits | governing-intent-sweep existing served-population/Unknown cases and routes empty-seed parity; distinguish observed empty from missing evidence |
| N=1 and N>1, same values/distinct ids | One shared three-field value; N exact local refs; independent expansion preserves ordered ids, source revision/capture and evaluation; separate epistemic records remain separate | governing-intent-sweep existing per-item case and falsifier table; enumerate carriers, effective claim keys and separately served records; do not assert tuples==distinct ids where a claim renders more than once |
| R<N and narrowing | Full N unchanged, R rendered, N−R outside, count region reason/route/warrant text intact, all R Unknown-coded and narrowing retains exactly R | governing-intent-sweep existing 54/54,52/2 and narrowed cases; surface-render-fractions 53/55; no new human state/control |
| WorkItems Unknown | Preserve original unknown result/reason; no manufactured shared value/items/count0 | governing-intent-sweep existing Unknown-observation case; Python entry-point Unknown vector |
| Missing/altered shared field or action metadata, extra key/route | No200/304; exact bounded typed503; consumers explicitly reject before derived output | governing-intent-sweep existing falsifier table, field-by-field independently authored vectors; route-side actual logical corruption and guard-mutation witnesses |
| Missing/inline/extra-key/nonliteral/recursive/external/cross-observation item ref | Same explicit failure; no generic lookup/default/normalization | same governing-intent gate; production consumer admission exercised as a separate subject, expected outcomes literal; oracle expander imports no production/model helper |
| Logical item differs in any complete value or field set | Refuse before mapping; never overwrite a bad item with the shared literal or coerce equality by dropping actor/verb/target | governing-intent per-item case with malformed logical input through actual route; source-mutant guard witness |
| Valid A then malformed B (same revision allowed) | B cannot borrow A's value, evaluation remains B; no claims/totals from B | existing falsifier table accepts sequential fixtures; Python adapters execute separate invocations/inputs without retained resolver state |
| Repeated/concurrent same inputs | Same effective facts, ordered membership and response representation for same request mount; no source/model mutation or global state | routes existing five sequential/concurrent GETs and governing-intent determinism case; fixture-local calls only |
| Unauthenticated or forbidden request, with validator header | Existing401/403 before endpoint success; no model/errorbody information leaked by a new handler bypass | routes existing conditional/auth-admission case through the actual daemon boundary; do not infer auth from direct Route.handle calls |
| Stale inline ETag | Must not return304 for the new reference representation; contentKey and ETag are over actual encoded wire plus request-specific links | routes existing independent walker and stale-validator cases; independent canonicalizer recomputes raw received object; keep25 exclusions |
| Invalid form with matching/wildcard validator | Return503 before304; no success-shaped partial model or replacement counts | routes existing revalidation case plus malformed logical input; preserve credential admission order |
| Valid body limit−1/limit/limit+1 | Original limit semantics over final UTF-8 body, direct+tailnet; breach remains response-limit-breached and never304 | response-limits exact-byte boundary table and matching-validator breach case; include N=0/1/many and Unicode, avoid assuming every small N saves bytes |
| P115 wire fault | Bounded failure, unchanged evaluation/readiness:false; no RFC2-24 reason, resource breach recorder event, persisted readiness arm, or positive test evidence fabricated | routes/refusal assertions; existing response/readiness tests remain the owning regression gates; do not extend PWB-REQ-022 verdict arms |
| Per-item claims and other entity/relationship records | Preserve full records, membership and identities, even when their reason/route text equals the shared three-field value | independent governing-intent carrier/identity sweep plus block-provenance existing fullrecord expectations; count only the pooled workItems value, not every textual occurrence of the reason |
| Title naming a requirement | Observer still withholds title; no requirement id inferred into governedBy; no new SQL column | governing-intent existing title sentinel and core work-items projection tests; no real title/body reads |
| Human parity comparisons | Effective expanded wire facts equal unchanged logical/human facts; raw structural equality is intentionally different | routes human/machine equality and presentation-route parity; independent one-hop expansion only for the governing-intent family |
| Fresh-checkout reader, names reader | Validate whole wire branch before record/parity/source-page derived output; retain raw bytes for hash/size | shared TypeScript admission covered by existing governing-intent negative table plus existing synthetic browser fixtures; do not run real fresh-checkout/live browser command as a fixture test |
| Two Python operators | Original capture bytes retained and measured; invalid form yields named fault and no derived totals; no external I/O | new test_poc_machine_wire.py, two entry-point methods × four named subcases; stdlib-only, owned synthetic temp captures |
| Old inline capture with current tool | Explicit invalid-governing-intent-reference; historical reproduction uses the recorded old tool revision offline | Python/TS admission fixture; old evidence untouched, no hidden legacy arm |
| Separate presentation endpoint | Existing artifact protocol unchanged; no workItems resolver added | existing polaris-presentation-route tests; avoid expanding the separate envelope |
| Full owned migration | All operator entry points and declared machine-answer tests move together in one PR; imports/build and CI exact-head green | owned-file check + actual diff review and current CI; no grep-only assertion substitutes for semantic tests |

Planned test delta is in TEST-DELTA-PLAN.json: +2 Python methods/8 subcases, ~18 named existing TS blocks, -0 deletions, +0 TS it blocks. Existing parameterized tests absorb the 33 wire negative vectors; source guard mutations retain actual old/new fragments and subject commit. A new behavior or necessary extra block must be explained before broadening the plan. The preparation itself changed/executed zero product tests.

Future fixture commands, after owner act and clean isolated worktree npm ci:

```
npm run build:poc
npx vitest run apps/three-surface-poc/src/governing-intent-sweep.test.ts apps/three-surface-poc/src/block-provenance-sweep.test.ts apps/three-surface-poc/src/routes.test.ts apps/three-surface-poc/src/response-limits.test.ts
python3 -m unittest discover -s scripts -p test_poc_machine_wire.py
```

Then run each other changed existing test and the unchanged core work-items/model/trajectory/identity regression files once, with captured denominators. The final exact-head required Node/governance CI owns the broad final gate. This is no instruction to replay prior P115 signoff native cases or large review batteries. Live Butlers/private service commands, restart, body reads and response measurements require a separate bounded authorization and must retain a new non-overwriting capture identity.
