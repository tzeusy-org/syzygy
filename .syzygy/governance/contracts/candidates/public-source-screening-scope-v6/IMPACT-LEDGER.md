# Impact ledger — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`). It names
> what an act over this package's row would break or require. The install is
> separate work after the act and is not part of this package.

## Method

At this package's base commit (`origin/main` at `d7bfcce2`), `git grep -nF`
over `packages/`, `apps/` and `scripts/` for:

- the version-5 version literal
  `1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd`
  (17 lines in 10 tracked files, excluding the screening-scope builders and
  the version-5 recorder; 3 of the 10 are not tests);
- `scopeDetectors` and `ownerPlacements` outside `*.test.ts` (readers in
  `packages/polaris-generation-core/src/secret-redaction.ts`,
  `public-source-classification.ts`, `packages/polaris-dossier/src/screen.ts`
  and `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`);
- the version-5 act file name in
  `packages/polaris-generation-consent/src/package-reader.ts`.

The readers that refuse an unknown policy shape were read:
`readScopeDetectors` and `readSecretRedaction` (`secret-redaction.ts`), and
`readProjectDocumentationRule` and `readOwnerPlacements`
(`public-source-classification.ts`). The version-5 install (`edaa8ff5`,
`syzygy-mea.4`) is the model for the version-6 one.

## What an act breaks until the install lands

Like every policy act, the act breaks the read gates, so **no Redis run can
start between the act and the install** [Inferred, from the version-5
ledger and the readers named below].

- **The act-chain reader.** `POLICY_ACT_FORMS` in
  `packages/polaris-generation-consent/src/package-reader.ts` is a closed,
  ordered list of act forms (version 5 is the fifth). A version-6 record makes
  the chain reader refuse until the install adds a sixth form, a `v6` member
  of `PolicyActChain`, and the matching arm of `renderPolicyAct` and its
  testkit (`recorder-fixtures.testkit.ts`, `package-reader.test.ts`).
- **The scope-detector text pin.** `readScopeDetectors` accepts the
  `scopeDetectors` object only when the SHA-256 of its `consequence` equals
  `SCOPE_DETECTOR_TEXTS.consequence`. Version 6 appends a clause to that
  sentence, so every public-source screen refuses the policy until the install
  re-pins it (the `rule` text is unchanged). The detector itself is read
  generically (`flags,id,kind,pattern`), so its shape needs no reader change.
- **Version pins.** The `policyVersion` and act identity are pinned in
  `apps/three-surface-poc/src/governance-inputs.ts` (lines 90 and 111) and
  `packages/three-surface-poc-core/src/git-object-reader.ts` (line 51), with
  test literals in `governance-inputs.test.ts`, `content-classification.test.ts`,
  `project-shape-model.test.ts`, `packages/polaris-dossier/src/census.test.ts`
  and `screen-scope-v5.test.ts` (which also counts three scope detectors).
- **Not broken:** `readOwnerPlacements` checks each placed path's shape
  (folded, distinct) and hashes no path list, so `redis.conf` is read as given.
  The project-documentation rule text, its four path rules and their texts are
  unchanged.
- **The version-5 recorder's battery lines.**
  `scripts/record_public_source_screening_scope_v5_act.py --check` checks the
  applied subject, so it fails once the policy moves. The version-6 recorder
  replaces its two lines in the CG-26 triple (`PROJECT-STATUS.md` battery,
  `.github/workflows/governance-docs.yml`, the count sentence) once, at the
  act's integration commit, not in this package.
- **`check_governance.py`.** This package registers the version-6 constants
  and an activation gated on the act record's existence, and gates the
  version-5 manifest's copy registration off once that record exists. The
  chain link and the act record's manifest-heading exemption
  (`BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS`) arrive with the act.
- **Policy-path consumers not reassessed:** `scripts/install_redis_sitting.py`,
  `scripts/simulate_redis_sitting.py`, `scripts/check_spec_reconciliation.py`
  and `scripts/probe_superseded_policy_act_regeneration.py`. Version 5's ledger
  left them Unknown; whether each breaks is still Unknown, and the install
  assesses each.

## What the install must build

- **Re-pin and extend**, as above: the sixth act form, the chain member, the
  consequence digest, the version and identity pins, the test literals.
- **Run the builder's fixtures through both TypeScript screens.** The
  builder's oracle is Python; the screens are JavaScript. The builder already
  shows the two engines find the same spans for this pattern over every
  fixture body and seven dialect probes, but the install must show the
  shipped screens (`screen.ts` and the app's `public-source-screening.ts`)
  reach the builder's `--score` outcomes, including line numbering under CRLF
  and bare CR, and code-body whole-withholding.
- **Linear scanning in the shipped matcher.** `compileEveryOffsetMatcher`
  asserts in its header that declared regexes other than the URL pattern have
  "no nested ambiguous quantifier". The new pattern keeps that true; the
  install pins it with a bound test over long blank, `#` and ACL lines, as the
  builder does.
- **Agent text.** `render.ts` and `close.ts` screen agent-written prose
  through `screenBody`; the new detector joins it, so an agent draft quoting a
  line that opens with `requirepass <value>` is refused where version 5
  passed it.

## Effect on the Redis run

| File | v5 | v6 |
|---|---|---|
| `redis.conf` at the trial commit | no class, withheld | project documentation; password-directive lines and their guards withheld |
| `TLS.md`, modules/MODULES.md, `README.md` | project documentation | the same, with directive lines now withheld |
| Code files with a line opening with a password directive | admitted | withheld whole |
| Everything else | unchanged | unchanged |

What stays Unknown:

- [Unknown] How many of `redis.conf`'s lines the detector withholds, and so
  how many of run 3's 34 revision-0 citations would reach the reviewer.
- [Unknown] How many Redis code files the detector newly withholds whole.
- [Unknown] Whether any other screen step (a policy detector match) withholds
  part or all of `redis.conf`.

**What settles them:** `scripts/redis_screening_v6_measure.py`, a count-only
script the owner runs over the local Redis clone and a run's metadata (it
prints counts and tree paths, never body text; it uses the builders' Python
oracle with the active-content scan switched off on both sides, so its
figures are [Inferred] estimates until the install measures the shipped
screens). No agent has run it. The next run's check records settle each cited
file's outcome under the installed version 6.

## What it does not touch

The base (Butlers) scope's rules, the policy's own `detectors`, the consent
and egress readers, every specification, and every version-5 rule other than
the one placement list and the scope detectors' list and consequence.
