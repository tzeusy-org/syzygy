# Impact ledger — public-source screening scope, version 8 (private sources)

> **Candidate — binds nothing.** Drafted 2026-11-08 (`syzygy-pdja.23`). It
> names what an act over this package's row would break or require, and which
> specification text would read differently. The install is separate work
> after the act and is not part of this package.

## Method

At this package's base (`origin/main` at `fd08ea62`), `git grep -F` over
`packages/`, `apps/`, `scripts/`, `PROJECT-STATUS.md` and `.github/`,
excluding the screening-scope builders, for:

- the version-7 version literal, `1.8.0-public-source-candidate…v7-s`: 16
  lines in 10 tracked files;
- the version-7 act file name, `…PUBLIC-SOURCE-SCOPE-V7-ACT.md`: 8 files.

The figures are re-derived by those two sweeps, never carried. Re-run them at
the install commit.

## What an act requires, in one landing

A policy act without its install turns `main` red, so these land together:

- **Policy identity.** The version literal's readers and the act-record
  readers the two sweeps list, among them
  `apps/three-surface-poc/src/governance-inputs.ts` and
  `packages/three-surface-poc-core/src/git-object-reader.ts`. [Observed] The
  version-7 act says the read gates refuse a policy on its digest first. Both
  files are under the surface merge freeze paths, so the install cannot land
  while `scripts/surface-merge-freeze.json` is frozen.
- **Redaction.** `packages/polaris-generation-core/src/secret-redaction.ts`
  pins `appliesTo` by digest (`REDACTION_TEXTS.appliesTo`) and must accept the
  new text. `redactBody`'s callers, `packages/polaris-dossier/src/screen.ts`
  and `apps/three-surface-poc/src/polaris-generation/public-source-screening.ts`,
  must be given the pair's visibility and must not retain a redacted-span
  body for a private pair. That needs fixtures for a private pair with a
  credential-assignment match in a project-documentation body (excluded
  whole) and the same body for a public pair (redacted, as today).
- **Visibility.** A reader of `sourceVisibility` that decides per commit
  read. It returns public only when the record admitting that commit, and
  every other effective observation record of the same pair, state public
  through a carrier. Anything else, including an unreadable record, is
  private. The carriers are named in the policy. [Observed]
  `packages/polaris-generation-consent/src/package-reader.ts` reads the
  existing observation consents through a list of act forms
  (`ADMISSION_ACT_FORMS`); its two `consent-observation` forms are the
  requests and redis public-repository observation acts. [Observed] Only the
  redis act is recorded. The policy closes the carrier set itself (round 2,
  finding 2): only those two named act files state public by form, and the
  reader must hold that list as a pin it compares with the policy, never as
  a list that may grow. The reader states public by form identity, never
  from the record's title or its `Upstream: … (public; …)` parenthetical,
  which the reader's regex treats as ignorable.
  `packages/polaris-dossier/src/gate-sources.ts` reaches them through that
  reader. A record whose effectiveness or pair cannot be read, including one
  that cannot be read at all, must refuse every read under the scope and
  name the record (round 2, finding 3; round 3, finding 4).
  Fixtures needed: the redis form reads public; a launch record answering no
  reads private; a public pair that also holds a private, silent or
  unreadable record reads private at every commit; a record with no readable
  pair refuses every read. [Inferred] A
  private repository reaches Syzygy only through the launch-consent change's
  generic form, or through a new form drafted as its own package. This
  policy adds neither.
- **Object ids and sizes** (round 2, finding 1; widened in round 3, finding
  1). For a private pair, a blob excluded or withheld on any ground keeps its
  object id and size only in its exclusion record in the run directory. The
  grounds are a denied path, an indeterminate or unclassifiable blob, a
  detector match on path or body, active content, and a strict-UTF-8, NUL or
  resource-limit failure. [Observed]
  `packages/polaris-dossier/src/check-derive.ts` keeps `path` and `objectId`
  for a cited blob excluded by screening unless the path matched a detector,
  so `denied-path` and `unknown-extraction-class` outcomes keep them.
  [Observed] `packages/polaris-dossier/src/screen.ts`
  returns `denied-path` before any detector runs.
  `packages/polaris-dossier/src/render.ts` writes the object id on the
  discovery page row and in the source population. Both must drop the object
  id and size for every excluded private blob, whatever the outcome. Every
  code-structure egress table must leave them out too, and the indeterminate
  reading must follow edit 8. Fixtures needed: a private denied-path blob, a
  private indeterminate blob and a private body-matched blob each render no
  object id or size; their public counterparts render them as today.
- **Egress.** Syzygy's provider-mode egress check must refuse a private pair's
  content, target-metadata included, unless an egress consent names the pair
  and states it private. [Observed] The egress consents present are titled
  public-target. [Inferred] No route needs it before a private pair is
  observed in the provider mode.
- **Fetch.** [Observed] The provider-mode acquisition candidate
  (`public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json`)
  is parked and fetches from an upstream. It must refuse a private pair.
  [Inferred] The installed local-agent entry
  (`declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`)
  reads the operator's clone, makes no fetch, and needs no change beyond its
  name.
- **When it lands.** The policy file changes only in the commit that
  records the act. [Observed] The version-7 act says the read gates "refuse a
  policy on its digest first", and its recording commit carried the read-gate
  change. So that commit must carry the install, or every run, public ones
  included, is refused until the install lands. If the install cannot land
  (for example, under an active surface merge freeze,
  `scripts/surface-merge-freeze.json`), recording waits, and runs continue
  under version 7.
- **Governance registration** at the act, as for version 7: a version-8
  recorder written after a confirming review; the version-7 manifest
  activation gated off once the version-8 act exists; the chain link; the
  act record's manifest-heading exemption; and the battery line swap.

## Specification text that would read differently

No byte of any specification is edited here. The launch-consent change below
is another agent's draft on its own branch, read at
`agent/syzygy-pdja.21-launch-consent` commit `913c6b7d` (round 1 read
`882d2297`; the line numbers below were re-derived at `913c6b7d`). It binds
nothing until signed.

The launch-consent change's proposed polaris-generation spec (path
proposed/polaris-generation/spec.md in that change, not yet on `main`),
REQ-polaris-generation-046:

- **Line 25**, "A repository that the operator does not declare public SHALL
  be refused before any record is written while no effective policy admits
  non-public sources". Once this version is in force, `sourceVisibility.admitted`
  lists `private`, so the condition is false and the refusal does not fire.
  The same paragraph says "A successor that admits non-public sources through
  this same observation consent record lifts the refusal for the sources it
  admits with no change to this requirement; one that asks more of the
  record or the question (another field, consent class or disclosure) needs
  this requirement amended alongside it". The policy takes its carrier for a
  launch record from "the operator's declaration whether the repository is
  public", which line 17 already requires the record to carry. It asks for
  no new consent class or disclosure. **What is honestly open:** REQ-046
  names that declaration but fixes no encoding for it. The policy requires
  the generic form to read it as one of exactly two values, with the
  affirmative answer meaning public. [Inferred] That pins the encoding of an
  item the record already carries, so it is not "another field". A reader
  who counts a fixed two-value encoding as another field would need REQ-046
  amended alongside this act, by its own drafter. The disagreement is
  recorded here rather than settled by this package.
- **Line 15**, the identity residuals: "a fork or mirror at a commit an
  upstream record names, or at a child of one, is proposed the upstream's
  identity". Under this version a private fork launched that way joins the
  upstream's pair, and its record stating private makes the whole pair read
  private (`sourceVisibility.rule`). [Inferred] The spec text needs no change,
  but the question at line 11 could warn that the upstream's runs then get
  the stricter rules.
- **Line 11**, the question asks "the operator's declaration whether the
  repository is public". A "no" now records a private repository instead of
  ending in a refusal. [Inferred] The question would do well to say that a
  private repository gets stricter screening (more withheld files). That is
  optional and outside this package.
- **Line 17** (the record carries the declaration) and **line 33** (every
  page discloses it, labelled Inferred): unchanged bytes. The disclosed
  declaration now also decides which screening rules applied.
- **Lines 81–84**, scenario "Not declared public": its WHEN ("no effective
  policy admits non-public sources") is false once this version is in force,
  so it never fires. No scenario covers an admitted private launch.
  [Inferred] Adding one would need a REQ-046 edit by its own drafter.
- **Lines 157 and 161** (the test case's "public declared or not" and the
  falsifier's "without a declaration whether the repository is public"):
  unchanged in force. A declaration is still required. It no longer decides
  admission, only the rules.
- **The paragraph on per-project statements** ("For a subject that is
  governed under REQ-polaris-generation-033, or whose drawer status is
  unknown, the answer SHALL also create … the per-project statement"): its
  bytes are unaffected, but it is where open question 1 lands if the owner
  wants a statement for every private subject.

`design.md` line 22 quotes `observedRepositories` in its version-7 wording,
and that quotation would go stale. The design notes on private repositories
(around line 143) and `tasks.md` line 28 describe this package. Neither is
edited here.

Adopted text: REQ-polaris-generation-033
(`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`)
is not changed and reads the same. Its non-governed rule means that a private
repository with no drawer, no `openspec/**` and no `.syzygy/` path reaches
the operator's agent provider with no per-project statement. [Observed: "For
a non-governed subject the agent sessions' sends are the operator's own act
as stated above and no statement is required."] The policy records this in
`sourceVisibility.agentSessions` and cannot change it.

`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`
line 257 reads "`public-source screening scope version 7` or a successor".
Version 8 is such a successor and keeps `renderCondition`, so that clause
reads the same.

`openspec/changes/polaris-dossier-arbitrary-public-repo/` (the standing
public-observation consent) is public-only by its own text. It is unaffected
while it stays a candidate. [Inferred] If it is adopted with standing records
that are neither of the two named carriers, its repositories read private
under this version (fail closed), and a later policy version would have to
name its form.

## Not affected

Every detector, placement, exemption and consent, and every class rule
except the code-structure rule and the last sentence of `indeterminate`
(edits 7 and 8), which change for private repositories only. The Butlers
base scope (`scope`) is outside `publicSourceScope`, so its rules do not
change (`inheritedRules`).
