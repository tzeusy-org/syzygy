# Impact ledger — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`). It names
> what an act over this package's row would break or require. The install is
> separate work after the act and is not part of this package.

## Method

At this package's base commit (`origin/main` at `d7bfcce2`), `git grep -nF`
over `packages/`, `apps/` and `scripts/` (and, for battery lines,
`PROJECT-STATUS.md` and `.github/`) for:

- the version-5 version literal
  `1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd`
  (17 lines in 10 tracked files, excluding the screening-scope builders and
  the version-5 recorder; 3 of the 10 are not tests);
- the version-5 act file name
  `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md` (7 files
  outside the screening-scope builders and recorders; round 1 counted 8 over
  a population it did not list);
- the scope-detector consequence digest (1 site, `secret-redaction.ts`);
- `scopeDetectors` and `ownerPlacements` outside `*.test.ts` (readers in
  `packages/polaris-generation-core/src/secret-redaction.ts`,
  `public-source-classification.ts`, `packages/polaris-dossier/src/screen.ts`
  and `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`).

The readers that refuse an unknown policy shape were read:
`readScopeDetectors` and `readSecretRedaction` (`secret-redaction.ts`), and
`readProjectDocumentationRule` and `readOwnerPlacements`
(`public-source-classification.ts`). The version-5 install is the precedent:
eleven `syzygy-mea.4` commits from `edaa8ff5` (read gate and act chain) to
`a8adc2db` (its mutation evidence), plus the act's own integration commit
`b1c2b939`.

## What an act breaks until the install lands

Like every policy act, the act breaks the read gates, so **no Redis run can
start between the act and the install**. **The governance battery is also red
in that window**: under version 5 three battery steps refused from the act
until `ac902baa` [Observed, that commit's message], and version 6 breaks the
same steps the same way [Inferred].

- **The act-chain reader.** `POLICY_ACT_FORMS` in
  `packages/polaris-generation-consent/src/package-reader.ts` is a closed,
  ordered list of act forms (version 5 is the fifth). A version-6 record makes
  the chain reader refuse until the install adds a sixth form, a `v6` member
  of `PolicyActChain`, and the matching arm of `renderPolicyAct` and its
  testkit (`recorder-fixtures.testkit.ts`, `package-reader.test.ts`).
- **The policy subject's later-acts chain.**
  `scripts/build_pwb_behavior_contract_repin.py` (line 138) lists each
  screening-scope act and its chosen-variant patch, and reverses the live
  policy through them. Under version 5, `build_pwb_behavior_contract_repin.py
  --selftest` (a battery line), `record_pwb_behavior_contract_repin_acts.py
  --check registry` and `check_spec_reconciliation.py --selftest` refused
  until the chain gained the version-5 entry (`ac902baa`) [Observed]. A sixth
  entry is needed for version 6 [Inferred]. Its variant reader parses the
  record's `Chosen variant:` line, which the version-6 recorder writes.
- **The scope-detector text pin.** `readScopeDetectors` accepts the
  `scopeDetectors` object only when the SHA-256 of its `consequence` equals
  `SCOPE_DETECTOR_TEXTS.consequence`. Version 6 appends a clause to that
  sentence, so every public-source screen refuses the policy until the install
  re-pins it (the `rule` text is unchanged). The detector itself is read
  generically (`flags,id,kind,pattern`), so its shape needs no reader change.
- **Version, act and record pins.** `apps/three-surface-poc/src/governance-inputs.ts`
  pins the act record path (line 65, `PWB_ACT_RECORDS.policy`), the superseded
  record (line 71), the `policyVersion` (line 90), `actIdentity` (line 107),
  `recordingTag` (line 110) and the scope anchors (line 111).
  `packages/three-surface-poc-core/src/git-object-reader.ts` pins the version
  (line 51). Test literals follow in `governance-inputs.test.ts`,
  `content-classification.test.ts`, `project-shape-model.test.ts`,
  `packages/polaris-dossier/src/census.test.ts`,
  `packages/polaris-generation-consent/src/recorder-fixtures.testkit.test.ts`
  and `screen-scope-v5.test.ts` (which also counts three scope detectors).
- **`scripts/install_redis_sitting.py`.** It names each screening-scope act,
  its recorder and its manifest-heading exemption (the version-5 constants at
  lines 131-139 and 858-871), taught by `4f9c5de5` and `74a2829a` under
  version 5 [Observed]. It needs the version-6 act the same way [Inferred].
- **The version-5 builder and the tests that call it** (round 2, finding 2).
  `build_public_source_screening_scope_v5.py`'s `base_bytes` (lines 328-342)
  accepts only the version-4 row or one of its own rows on disk, so after the
  act it raises "the base is unknown", and so does its `--check` [Observed,
  the function's text; the raise is Inferred until the act]. Five test sites
  call it through a Python child and fail with it:
  `packages/polaris-dossier/src/screen.test.ts` (lines 308 and 395),
  `packages/polaris-generation-core/src/public-source-exemption.test.ts`
  (line 26), `apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts`
  (line 454) and `packages/polaris-dossier/src/screen-scope-v5.test.ts`
  (line 75) [Observed, the base_bytes sweep over `packages` and `apps`: those
  five lines and no other]. The install moves those tests to recover the
  version-5 base through the version-6 builder's `base_bytes`, with the
  version-5 patch reversed, as `b4230850` did for the version-3 and version-4
  fixtures under version 5 and `8f4532a9` and `76361363` did for the
  version-3 fixtures under version 4 [Observed, those commits' messages].
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
  version-5 manifest's copy registration off once that record exists. With the
  act, as `b1c2b939` did for version 5, come: the `PWB_EFFECT_AMENDMENT_ACTS`
  chain link with its digest, the version-5 manifest's
  `PWB_EFFECT_AMENDMENT_OFFERINGS` "row" entry (which pins its row as
  history), and the act record's manifest-heading exemption
  (`BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS`).
- **Still not assessed:** `scripts/simulate_redis_sitting.py` and
  `scripts/probe_superseded_policy_act_regeneration.py`. Whether each breaks
  is Unknown; the install assesses each.

## What the install must build

- **Re-pin and extend**, as above: the sixth act form, the chain member, the
  consequence digest, the version and identity pins, the test literals.
- **Run the builder's fixtures through both TypeScript screens.** The
  builder's oracle is Python; the screens are JavaScript. The builder already
  shows the two engines find the same spans for this pattern over every
  fixture body, nine dialect probes and two declared-split probes, but the
  install must show the
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
