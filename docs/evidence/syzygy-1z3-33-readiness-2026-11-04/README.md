# PWB invitation preparation: retained NOT READY run

[Observed] The owner-run `20261104201253` on 2026-11-04 reports **NOT READY**
at Syzygy `99040a5ce7096b07a753a792ba530cf7260551a9`. The
[demo](pwb-p4-5-fresh-checkout-demo-2026-11-04-1z3-33.json) has
`preflight.ready=false` and fails its `preflight-ready` invariant. The
[run log](owner-run-20261104201253.log) records sweep exit 0, demo exit 1,
and wrapper exit 0. Successful evidence retention does not complete
`syzygy-1z3.33` or authorize an owner invitation.

[Observed] [semantic-readiness.json](semantic-readiness.json) composes the
retained metadata, names each evidence subject with its SHA-256 and byte
count, and pins the inspected implementation files by digest. The original
demo, sweep and log bytes are copied unchanged. This evidence-only change
preserves the run's source trees; its commit will differ from the measured
source commit. The exact resulting commit belongs in the independent review
and worker report, not in the historical run's source field.

## Recorded invitation checks

[Observed] These figures come from the retained preflight and sweep, without
a new product or target-repository run:

| Check | Retained result | Preparation consequence |
|---|---|---|
| Six project-account answers | 4 backed of 6; `v1-scope` and `v1-success` have label Unknown, empty statements and no anchors | Failed |
| Principles | 7 modeled / 7 declared / 7 rows | Non-empty and reconciled in demo |
| Success criteria | 16 modeled / 16 declared / 16 rows | Non-empty and reconciled in demo |
| Catalog | 0 modeled / denominator Unknown (`excluded-content`) / 0 rows | Failed; 0 modeled is not proof of no declarations |
| Topology | 58 modeled / 58 declared / 58 rows | Non-empty and reconciled in demo |
| Exact requirement | One identified route reports 6 requirements | Reachable in demo |
| Legitimate visible Unknown | 18 distinct visible / 18 machine Unknowns | Matched in demo |
| Source paths | 205 linked identities; preflight reports no source-path-unresolved limb | Recorded demo check only |
| Keyboard sweep | Each of 2 mounts: 1117 reached / 1117 focusables; 634 activations; 0 reported violations | Passed on sweep capture bytes |
| Fresh-clone demo | `healthy=false`; failed invariant `preflight-ready` | Failed |
| Independent exact-head live review and repair confirmation | Not supplied by these probe artifacts | Separate retained evidence required |

## Exact bindings and their limits

[Observed] Both probes identify Butlers revision
`9e28384a4e6ea8a2a2218a9472d450672fffd03f`, surface
`polaris@649194529c7f`, and walkthrough identity
`pwb-eval-e2ffd1ff876c7cd29e6de929`. The structured composition retains the
full snapshot/input identities and ingress details.

[Observed] They are **separate captured evaluations**: the sweep's observation
instant is `2026-11-04T12:13:04.918Z`; the demo's evaluation as-of is
`2026-11-04T12:20:16.007Z`. The corresponding served page hashes differ.
Each used a private loopback daemon; the tailnet variant changed the Host
header to exercise the mount, without establishing a remote tailnet
connection. The keyboard result therefore describes the swept bodies; it
does not certify the different demo bodies.

[Observed] At composition, local `origin/main` named
`4aa2b7527f32e776142b02795adec7976d9c60f2`. Its two surface source trees
differ from the run source in 9 files, enumerated in the JSON. This is a
dated local-ref comparison. The old run remains evidence about its pinned
source, without validating later code or the eventual PR merge tree.

## Finite source-only diagnosis

[Observed] The demo labels the V1 source, about/heart-and-soul/v1.md,
Unknown with reason `excluded-content`. The catalog class also retains an
unenumerated-heading count of 1. The summary does not retain that source's
classification record or per-class grammar-failure details.

[Observed] The inspected implementation has this dependency chain:

1. [The manifest](../../../packages/three-surface-poc-core/src/project-shape-manifest.ts)
   assigns V1 account, success and catalog extraction to the named V1 source.
2. [Account extraction](../../../packages/three-surface-poc-core/src/project-shape-extraction.ts)
   obtains `v1-scope` and `v1-success` from the V1 source's literal headings.
3. [Coverage](../../../packages/three-surface-poc-core/src/project-shape-coverage.ts)
   makes excluded or failed extraction outcomes Unknown; a parse failure can
   also map to `excluded-content`. The reason alone cannot identify a
   secret detector or distinguish it from a grammar failure.
4. [The model](../../../packages/three-surface-poc-core/src/project-shape-model.ts)
   emits missing account sections with no statement and an empty anchor list.
5. [Preflight](../../../apps/three-surface-poc/src/walkthrough-preflight.ts)
   rejects unbacked account statements and empty/unreconciled populations.
   [The demo](../../../apps/three-surface-poc/src/fresh-checkout-demo-main.ts)
   returns 1 when its invariant verdict is unhealthy.

[Inferred] The admitted-source/class coverage gap explains the displayed
missing answers and catalog failure. A browser navigation pass cannot
supply those declarations. This diagnosis is limited to the recorded
coverage outcome and the inspected source paths.

[Unknown] The precise exclusion trigger, grammar arm, source line and
appropriate repair are not established. The older pinned live fixture
describes a different target revision and cannot establish this run's cause.
No target body or private capture was read to fill that gap.

## Remaining gates and next action

[Inferred] The next useful action is a narrowly reviewed owner-run diagnostic
that emits only the admitted V1 source's classification outcome, typed
per-class grammar failures and denominators after the existing authority
gate. It should emit neither source text nor matched detector content.
Determine its applicable authority before execution. A source, policy,
registry or specification change needs its own applicable gate; this record
grants none and proposes no bypass.

[Observed] The preparation requirements retained in the `syzygy-1z3.22`
dispatch remain unsatisfied: source-backed answers and catalog coverage,
fresh successful preflight/demo, independently retained exact-head live
review and repair confirmation must hold together before invitation.
Keyboard and source-path evidence must remain bound to the chosen source
and evaluations. Any repair needs a newly bound confirmation; this record
does not relabel the historical run as current.

[Observed] The owner direction in
[the questionnaire answers](../../../.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md)
opens the freeze window after the first requests run or on 2026-11-05,
whichever comes first. Its scope states: “When it opens, no merge may touch”.
The named surface source directories remain frozen until the owner's
judgment and cycle report are recorded. This evidence does not announce or
prove administration of that freeze.

[Observed] PWB-REQ-021 states: “Readiness and the nine answers SHALL be
machine-readable and owner-visible but SHALL remain execution facts”.
PWB-REQ-022 states: “Tests, code, an agent report or page availability SHALL
NOT substitute.” Both clauses are in the
[adopted specification](../../../openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md).
The records here are agent-side probe execution evidence and mechanical
pre-invitation readiness. They supply no owner walkthrough execution record,
no owner met/not-met judgment and no judgment act-validity evaluation.
