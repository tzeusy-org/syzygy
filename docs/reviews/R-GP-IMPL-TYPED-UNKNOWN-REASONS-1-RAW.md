# R-GP-IMPL-TYPED-UNKNOWN-REASONS-1 — CC-REV-1 implementation review of syzygy-bpyt.6.4 (PR #583), 2026-11-03
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 185b6b365b6354aadbaf0ab83903e32987812eef
Subject: PR #583 diff 7202d49b..185b6b36 (git diff, all files) sha256 8665b2f04f0b06e2a2f66df289934cc6271d27773bd1ba5a4c22b8386215f40b; code-only (apps, packages) sha256 9a388cddcde9747d48b053372919f2b017911fd9607a240e86dbe36c9711044b

Reviewer: fresh-context default-model review (Claude Opus 5.5, reviewer lane for syzygy-y1hk), 2026-11-03. No fetch of
any observed repository's content; fixtures only.

## Scope reviewed

- Bead syzygy-bpyt.6.4 (DC-4 of the 2026-10-21 greenfield-parity audit) under GP-Q0: behavior-preserving; served bytes,
  wire fields and digest-bound artifacts unchanged.
- PR head 185b6b36, code head 29922657, base 7202d49b (merge base with origin/main). Five commits.
- Changed files: 26. Code in packages/three-surface-poc-core/src (content-classification, epistemic [new], model,
  project-shape-coverage, project-shape-model and its test, project-shape-observation, proposed-work, work-items) and
  apps/three-surface-poc/src (capability-detail, orrery, polaris-source, polaris, pwb-mutation-sweep,
  test-project-shape-fixture). Evidence under docs/evidence/syzygy-bpyt-6-4/. [Observed]
- Nothing under .syzygy/** or openspec/**; no file outside what the bead authorizes. The pwb-mutation-sweep literal
  moved with the guarded fragment it mutates. [Observed: git diff --stat 7202d49b 185b6b36]

## Verification run by the reviewer (clean clones under /tmp/r583, TMPDIR=/tmp/r583/t)

- npm ci: pass (head and base clones).
- npm run typecheck: exit 0.
- npx vitest run: exit 0; 257 files passed, 3 skipped; 6022 tests passed, 5 skipped.
- npm run test:system: exit 0; 52 passed, 1 skipped.
- python3 scripts/check_governance.py: 32 OK, 21 WARN, 0 FAIL (53 checks).
- gh pr checks 583: checks pass (18m53s), node pass (4m40s).
- The PROJECT-STATUS canonical battery was not run by this reviewer.

## Byte identity (the load-bearing claim)

1. Re-run of the implementer's probe. I built base 7202d49b and head 185b6b36 with npm run build:poc in separate
   clones and ran docs/evidence/syzygy-bpyt-6-4/diff-probe.mjs against each under the same TMPDIR, then
   compare-probe.py. Result: 36 models, 2108 rows, 0 differ; both outputs sha256
   c392e48856dfd2ac09f4f4f3bb26cdcd31e973c6affd7d0e6c76958f76ba2a95. [Observed] This matches the PR's 36 / 2108 / 0.
2. Independent extension. The original probe queries the source route with only the first 40 source identities
   (diff-probe.mjs:115) and never with an unresolvable identity. I extended it (diff of 18 lines, below):
   - every source identity, plus a bogus identity and a whitespace identity (the reference-unresolvable arms of
     polaris-source.ts);
   - 12 more models: five resource-limit envelopes (maxSources 1, maxBytesPerSource 40, maxTotalBytes 2000,
     maxParsePassesPerSource 1, maxIndexDepth 0), a small human/machine response ceiling, a withdrawn consent, NUL plus
     active content, a missing linked file, a root-only tree, a failing rev-parse, and a runner that always throws.
   Every added model has a model digest distinct from the observed one. Result: 48 models, 3268 rows (3124 route rows,
   all status 200), 0 differ; both outputs sha256
   1de03c8994caaef985f0d41a04e5b45f4c0fa52e21e65218b37f8d495be4398a. [Observed]
3. Negative control on the extension: mutant C below, built into head, makes 26 rows differ: model, responseIdentity,
   unknownSubjects and the /api/poc, /polaris and /orrery routes in both Host forms. So the extended differential sees
   a one-word reason change. [Observed]
4. Serialization paths:
   - The only object-literal key-order change candidate is the constructor. epistemic.ts keeps label, reason,
     closedReason, resolutionRoutes, then the optional actionRoute, with the argument order swapped. The new runtime
     test pins it, and the PR's negative control and my mutant D fail on a swap.
   - The two work-items disclosures now go through unknown(). Before, they copied governedBy.resolutionRoutes and
     titles.resolutionRoutes. Both producers (work-items.ts:56-62, :85-91) build those as [resolutionRoute(closedReason)],
     so the recomputed value is equal, and no actionRoute is added. [Observed]
   - Removing ?? 'No route recorded' after UNKNOWN_REASON_ROUTES[...] cannot change bytes when every key is one of the
     twelve, because the record is total over UnknownReason. routeOf keeps the 'deferred' to no-route arm explicitly.
     [Observed]
   - The undefined-member omission and HTML attribute paths are unchanged: no renderer template changed except that
     the types and the casts were removed. [Observed: diff of polaris.ts, polaris-source.ts, orrery.ts]

## Untrusted input reaching a typed field

- Every value now typed UnknownReason at a producer originates from a compile-time literal: PWB_FAILURE_STATES (now
  satisfies-checked), CONTRADICTED_REASON, UNENUMERATED_UNKNOWN, or inline literals in coverage and the model.
  [Observed: grep of unknownReason: in project-shape-coverage.ts and content-classification.ts]
- On the Butlers-derived content path, classifySource (content-classification.ts:371-383) compares the reader's
  record.detail string only to choose among the fixed() constants. The string never becomes a reason. [Observed]
- No JSON.parse site in the core or the app populates a typed reason field. Those sites are work-items,
  materialization, test-artifact-verification, authority-artifact-fields and fresh-checkout-demo-main. The last reads a
  served model only for its verdict. [Observed: grep JSON.parse over both src trees]
- Remaining casts: reasonCountRows' Object.entries cast (polaris.ts) is sound, because ReasonCounts is keyed by
  UnknownReason. capability-detail.ts:89 is pre-existing; see N2.
- So dropping the runtime closedReason() re-validation does not open a path from untrusted bytes. The fail-closed throw
  is replaced by a compile-time guarantee over literal-only sources. [Inferred from the sweeps above]

## Rule 6: mutants re-run by the reviewer at 185b6b36 (tree restored clean after each)

| id | file | old -> new | check | outcome |
|---|---|---|---|---|
| A (re-run of T6) | project-shape-coverage.ts | ItemCoverage unknownReason?: UnknownReason -> string | typecheck | killed: TS2578 at project-shape-model.test.ts:377 plus TS2345 at project-shape-model.ts:426 |
| B (new) | project-shape-observation.ts | ProjectShapeObservationUnknown reason: UnknownReason -> string | typecheck | killed: TS2322 at project-shape-model.ts:553 |
| D (re-run of R1) | epistemic.ts | key order reason, closedReason -> closedReason, reason | vitest | killed: "a producer cannot emit an untyped Unknown reason" |
| E (new) | work-items.ts | workItemTitlesDisclosure closedReason -> 'missing-evidence' | vitest | killed: Trajectory "discloses its withheld title (SEC-5)" |
| C (new) | epistemic.ts | PRODUCER_UNKNOWN_REASONS.codeStructure 'source-uncaptured-or-unreachable' -> 'missing-evidence' | full vitest | SURVIVED: 6022 passed, 5 skipped |
| F (new) | orrery.ts | unmappedRegionUnknown reason: UnknownReason -> string | typecheck | survived (widening is assignable; no gate claims this carrier) |

## Findings

No blocking finding. Notes:

- N1 (low, accuracy): epistemic.ts:5 says "An Unknown is built only here", but two PocUnknown object literals remain in
  the app:
  - apps/three-surface-poc/src/polaris-anchor-resolution.ts:23-29 (NO_OWN_IDENTITY);
  - apps/three-surface-poc/src/polaris.ts:1354 (the proposal-lifecycle disclosure).
  Both are typed, so neither can carry an untyped reason. Still, the module is not the only constructor the bead
  outcome and the comment describe. Because the barrel keeps the constructors internal, the app cannot use them. Either
  soften the comment or route the two sites through an exported constructor; the second option is a class-6 barrel
  change.
- N2 (low, typing): apps/three-surface-poc/src/capability-detail.ts:89 keeps currentIntent.reason as UnknownReason.
  This PR widened that field to UnknownReason | typeof NO_SEED_SET_CURRENT_AUTHORITY_REASON, so the pre-existing cast
  now silently narrows away the one sentence the PR made explicit. The cast is unreachable in served output today: the
  placeholder's capabilityId 'capability:unknown' matches no capability entity, and the adoption Unknown renders its
  own route, not a lookup. It is still a cast of the kind the bead set out to remove. [Inferred for reachability]
- N3 (low, test gap, follow-up): the producer reasons in PRODUCER_UNKNOWN_REASONS are pinned only for membership in the
  twelve (project-shape-model.test.ts:384), never for value. Mutant C swaps code-structure's reason for another valid
  word. It changes served /api/poc, /polaris and /orrery bytes in 26 differential rows, and the full suite still passes.
  The gap is probably pre-existing: at base the same literal was inline in deriveUnknownSubjects and no test names
  region:code-structure with its reason. [Inferred, not re-run at base] Suggest one conformance-style literal
  expectation per non-claim Unknown subject id. That is test-only and changes no bytes.
- N4 (info): the PR's probe covers only the first 40 source identities and no unresolvable identity. The reviewer's
  extension closes that and finds 0 differences, so the byte-identity claim stands. Mutant F shows the Orrery island's
  reason type is documentation, not a gate; the PR does not claim otherwise.

## Probe extension used (diff against docs/evidence/syzygy-bpyt-6-4/diff-probe.mjs at 185b6b36)

```diff
115c115
<     const queries = route.path.endsWith('/polaris/source') || route.path.includes('source') ? ['', ...sources.slice(0, 40)] : [''];
---
>     const queries = route.path.endsWith('/polaris/source') || route.path.includes('source') ? ['', ...sources, 'sha256:not-a-real-identity', ' '] : [''];
186a187,199
> 
>   'limits-one-source': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxSources: 1 } } }),
>   'limits-tiny-bytes': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxBytesPerSource: 40 } } }),
>   'limits-total-bytes': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxTotalBytes: 2000 } } }),
>   'limits-one-pass': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxParsePassesPerSource: 1 } } }),
>   'limits-depth-zero': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxIndexDepth: 0 } } }),
>   'limits-human-response': () => build({ projectShape: { authority: ADMIT, runGit: gitFor(TEXTS), resourceLimits: { ...core.PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 1000, maxMachineResponseBytes: 1000 } } }),
>   'consent-withdrawn': () => build({ projectShape: { authority: { ...ADMIT, admits: false, authorizationMode: 'rejected', consent: { kind: 'withdrawn', provenance: 'state-1', actIdentity: 'act:w', artifactDigest: ADMIT.consent.artifactDigest, actInstant: '2026-09-03T00:00:00Z' } }, runGit: gitFor(TEXTS) } }),
>   'nul-and-active': () => withShape(mapTexts((t, p) => (p === firstKey ? `${t}\n\u0000\n` : `${t}\n<script>alert(1)</script>\n`))),
>   'missing-linked-file': () => withShape(Object.fromEntries(Object.entries(TEXTS).filter(([p]) => p !== Object.keys(TEXTS)[1]))),
>   'only-root': () => withShape({ 'about/README.md': TEXTS['about/README.md'] }),
>   'failed-rev-parse': () => build({ projectShape: { authority: ADMIT, runGit: failing(gitFor(TEXTS), 'rev-parse') } }),
>   'failed-everything': () => build({ projectShape: { authority: ADMIT, runGit: () => { throw new Error('no git'); } } }),
```

## Verdict

CONFIRM WITH EXCEPTIONS. The served bytes are unchanged over the PR's corpus and the reviewer's larger one; the typed
reasons have literal-only sources; scope holds; gates and CI are green. N1–N3 are notes, not revise findings.
