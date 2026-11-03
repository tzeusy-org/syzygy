# Impact ledger — public-source screening scope, version 5

> **Candidate — binds nothing.** Drafted 2026-11-03. It names what an act over
> one of this package's rows would break or require. The install is separate
> work after the act and is not part of this package.

## Method

At this package's base commit (`origin/main` at `85c54814`), `git grep -lF`
over `packages/`, `apps/`, `scripts/` and `.github/` for:

- the version-4 version literal
  `1.5.0-public-source-candidate.1.none.code-all.redact-span` (8 tracked
  files);
- the policy path (35 tracked files, 21 outside `*.test.ts`);
- the type `PublicSourceContentClass` (6 files).

The readers that refuse an unknown policy shape were read:
`readProjectDocumentationRule`, `readCodeContentExemption` and
`readSecretRedaction` in `packages/polaris-generation-core/src/`, and
`buildDossierScreen` in `packages/polaris-dossier/src/screen.ts`. The
version-4 ledger's population was the starting list.

## What an act breaks until the install lands

Like every policy act, any row breaks both read gates, so **no Redis run can
start between the act and the install**.

- **The act-chain readers.** `POLICY_ACT_FORMS` in
  `packages/polaris-generation-consent/src/package-reader.ts` is a closed list
  of act forms read as a chain. A version-5 record makes the reader refuse
  until the install adds a fifth form and extends the chain (version 5 needs
  version 4).
- **The Butlers (base) read gate.** `apps/three-surface-poc/src/governance-inputs.ts`
  pins the version-4 `policyVersion`, act identity and recording tag. The
  pins move with their tests and fixtures:
  - `governance-inputs.test.ts`;
  - `packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts` and
    `package-reader.test.ts`;
  - the literals in `packages/three-surface-poc-core/src/git-object-reader.ts`,
    `content-classification.test.ts` and `project-shape-model.test.ts`.

  No base-scope rule changes, so only the pins move.
- **Text-digest pins in the readers.** The screens accept policy prose only
  when its SHA-256 equals the text they implement. Each variant moves pinned
  text, and the screen refuses the policy until the install re-pins it:
  - `readSecretRedaction` hashes the `REDACTION_TEXTS` fields, among them
    `unchanged`, which `bcd` changes;
  - `readProjectDocumentationRule` hashes the rule text and requires exactly
    three path rules; `bd` and `bcd` change the text and add a fourth;
  - `readCodeContentExemption` hashes each `codeContentExemption` text
    against `EXEMPTION_TEXTS`, and `bcd` changes its `rule`.
- **`wholeArtifactDetectors` must name policy detector ids.** `readSecretRedaction`
  refuses a whole-artifact id outside the policy's own `detectors`, so every
  variant's two scope-detector ids refuse until the reader is given
  `scopeDetectors`.
- **The version-4 recorder's battery lines.**
  `scripts/record_public_source_screening_scope_v4_act.py --check` checks the
  applied subject, so it fails once the policy moves. A version-5 recorder
  replaces its two lines in the CG-26 triple (`PROJECT-STATUS.md` battery,
  `.github/workflows/governance-docs.yml`, the count sentence) once, at the
  install.
- **`check_governance.py` CG-7e.** `_activate_public_source_scope_v4_copy_registry`
  keeps the version-4 manifest in `ACT_DIGEST_COPY_FILES` with no version-5
  guard, unlike version 3's, which stops once a version-4 act exists. The
  recorder change adds that guard and an existence-gated version-5
  registration. This package adds neither; version 4's drafting commit added
  none either (its registration came with its recorder, `7a6c9a26`).
- **Policy-path consumers not yet assessed:**
  - `scripts/install_redis_sitting.py` and `scripts/simulate_redis_sitting.py`;
  - `scripts/check_spec_reconciliation.py`;
  - `scripts/probe_superseded_policy_act_regeneration.py`;
  - the app's `checkoutPolicyActPort` in
    `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`.

  Whether each breaks is Unknown; the install assesses each. The remaining
  path hits are earlier packages' builders and recorders and fixtures, as in
  the version-4 ledger.

## What the install must build

### T (every variant)

- **Scope detectors in both screens.** `buildDossierScreen` (dossier) and the
  app's `public-source-screening.ts` compile `doc.detectors` only. They must
  add `publicSourceScope.scopeDetectors.detectors` for this scope, for:
  - `screenPath`, `screenBody` and `screenTargetBody`;
  - `compileEveryOffsetMatcher`;
  - the re-screen of retained text;
  - the cited-span screen.

  `screen.test.ts` must keep the two screens agreeing over the builder's
  `COUNTEREXAMPLES` and `CLASS_FIXTURES`. The Butlers reader keeps the
  policy's detectors only.
- **Regex dialect.** The builder's oracle runs Python `re`; the screens run
  JavaScript `RegExp`. The three patterns use no lookbehind or Unicode class,
  but `\s` differs, so the install runs the builder's fixtures through the
  TypeScript screens (as version 4 required).
- **Agent text.** `render.ts` (lines 280, 388) and `close.ts` (line 123)
  screen agent-written prose through `screenBody`; the scope detectors join
  it, so an agent draft
  quoting a PGP header or an `ASIA…` id is refused where version 4 passed it.

### B (`b`, `bd`, `bcd`)

- `PublicSourceContentClass` (`packages/polaris-generation-core/src/public-source-classification.ts`)
  gains `governance-text`; `publicSourceContentClass` reads
  `governanceTextPaths` and returns undefined for a path two classes match.
- `secret-redaction.ts` `KNOWN_CLASSES`: `governance-text` must not become
  redactable (the policy keeps it out of `redactedClasses`).
- **Class gate.** `class-gate.ts` `unconsentedClass` already compares the class
  string with the statement's list; with no statement (`consented === null`)
  every class but `code-content` is withheld, which keeps `governance-text`
  withheld. Render labels and the review packet's class field learn the class.
- **Data, never policy.** No Syzygy reader may take a target's governance-text
  body as an input to its own policy evaluation (`selfReferenceRule`). A test
  pins that the screens' policy input is only Syzygy's own file.

### D (`bd`, `bcd`)

- `readProjectDocumentationRule` learns the fourth path rule and
  `ownerPlacements`.
- `publicSourceContentClass` and the screens' `contentClass(path)` take the
  repository identity and the admitted commit. Today they take a path alone,
  so the call sites in `review.ts`, `check.ts`, `render.ts` and the app's
  `repo-corpus.ts` thread both through.
- A run at a revision the entry does not list classifies the two paths as
  version 4 does (no class). A test pins the other three admitted Redis
  revisions.

### C (`bcd`)

- `screen.ts`'s `exempt` and the app screen: a project-documentation body
  skips `scanActiveContent`, through the same `renderCondition` machinery as
  version 3.
- **The render fallback.** `render.ts`'s refusal at lines 201-208 rescans
  code-content bodies when a page cannot confirm the condition. It must also
  rescan exempt documentation bodies. Today its message names only the
  code-content exemption.
- **Redacted bodies.** A body that is both redacted (version 4) and exempt
  (C) is scanned at a fallback sink over the complete body, as version 4's
  `unchanged` says. The scanner's findings carry no text, so no withheld line
  leaks through them; the install pins that.
- **Agent text unchanged.** The exemption names target bodies only;
  `render.ts` (lines 280, 388) and `close.ts` (line 123) keep screening
  agent-written prose whole-text through `screenBody`.

## Effect on the Redis run

**[Inferred] What changes per file**, if no other screen step withholds it:

| File | `t` | `b` | `bd` | `bcd` |
|---|---|---|---|---|
| `SECURITY.md`, `MANIFESTO` | none | governance-text | governance-text | governance-text |
| `TLS.md`, modules/MODULES.md | none | none | project-documentation | project-documentation |
| `00-RELEASENOTES`, `LICENSE.txt` | none | none | none | active-content scan lifted |
| `README.md` | none | none | none | active-content scan lifted |
| `redis.conf` | none | none | none | none |

What stays Unknown:

- [Unknown] How many of the 89 and the 10 spans return. The bead records no
  per-file split.
- [Unknown] Whether the newly classed bodies hold a detector match or a key
  header.
- [Unknown] How many Redis code-content files T newly excludes, for example
  test files with `redis://user:pass@` URLs or embedded test keys.

**What settles the Unknowns:**

- the owner's metadata measurement (direction item 3), for the trial's
  per-file split;
- the next run's check records (`citedBlobs`), for each cited file's outcome
  under the installed version 5.

## What it does not touch

It does not touch the base (Butlers) scope's rules, the policy's own
`detectors`, the consent and egress readers, or any specification. The
Butlers read gate's pins move, as above; the rules it reads do not.
