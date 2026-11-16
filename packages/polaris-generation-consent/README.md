# Polaris generation consent

Consent-backed `permissionIdentity`, `admit` and `permitted` ports for the
generation pipeline. They read public-repo admission records (observation and
egress consent) through an injected `AdmissionRecordReader`, fail closed, and
emit a content-free audit record per check. This package grants nothing: the
real records are owner acts that do not exist yet, so it is coded against an
interface and fixtures.

## Entry points

The package root exports everything. `src/consent-ports.ts` is parked egress
code (owner packet Q8): it takes pipeline types and `digestCanonicalJson` from
the core root, which re-exports the parked provider island, so only the root
exports it. `@syzygy/polaris-generation-consent/live` exports everything else:
the admission records, the in-force rules (`src/in-force.ts`, which
`consent-ports.ts` re-exports), the package reader and the recorder template.
A module the `syzygy` CLI reaches imports `/live`, and
`packages/polaris-generation-core/src/island-boundary.test.ts` fails when one
reaches the island.

- A record counts only if it is in force (`inForceAt` set and not in the
  future), has no withdrawal marker (dated or not), and is not replaced by a
  successor that took effect. Two records with one id and version but different
  digests void each other.
- Every source needs an observation grant for its repository and a full commit
  object id; a tag label never counts. Every non-excluded source also needs the
  egress record's repository and content class (an undeterminable class is
  refused), and the generator's own instruction class must be admitted.
- The permission identity digests the records relied on. `admit` and
  `permitted` recompute it and refuse on any change, so withdrawal between
  stages or between admit and send stops the send.
- Every refusal renders as `unconsented-source-or-provider`; `reasons` in the
  audit say which test failed. An audit sink that throws also refuses.
- `withConsent(base, options)` is the intended wiring: it replaces `verifySources`,
  `permissionIdentity`, `admit` and `permitted` together, so the population sent is
  the population consented. `matches(request)` digests every source property
  (bodies and span texts by hash, classification basis, any segment fields); a body
  that one full-file span already carries digests the same with or without the
  duplicate, as the pipeline drops it before `verifySources`.
- The reader's output is validated whole (`parseAdmissionRecords`); a malformed
  record, a non-integer time field, or a clock that is not a safe integer refuses,
  attributed to its own reason. An empty population is refused.
- Each check audits its final outcome once (a reservation refused, failed or
  followed by a failed audit is not recorded as permitted).
- `reserve` is the durable reservation (for example the lifecycle journal's
  `admit`), run only after consent holds.

Not here: the reader over real records (their in-force index is undefined), the
content-class mapping, and the single egress check for any route other than
`permitted`.

## Reading the real admission records

`createPackageAdmissionReader({ root })` implements `AdmissionRecordReader` over the public-repo-admission package. A candidate instance under `instances/**` binds nothing and is never returned: a record exists only when an owner act record (`.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-*-ACT.md`) names the instance by path and digest. If the instance bytes no longer hash to the act's digest the record is returned with `inForceAt: null`. The in-force instant is the act record's `Recorded at (UTC): YYYY-MM-DDTHH:MM:SSZ` line when it has exactly one (same calendar day as `Date:`; anything else refuses the read). A record without that line refuses the read: there is no date-only reading. Any other `PUBLIC-REPO-ADMISSION-*` file in `decisions/`, a successor form, a branch name as a revision or an artifact path outside `instances/` refuses the whole read.

`createAdmissionRecordsPort({ reader, now })` answers the dossier trigger's `AdmissionRecordsPort` (`check(requirement)`) from the reader, with the consent ports' in-force polarity (`inForceRecords`), freshly on every call. The public-source policy requirement is answered by `createPackagePolicyReader`: an `approve-policy` act naming `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` (found by its recorder's file name, from the closed list `POLICY_ACT_FORMS`; any other decisions file that names the policy refuses the read) that the act chain puts in force at `now` (version 1 from its instant until version 2's, version 2 from its own), whose digest equals the policy file's current bytes, and only while that file declares a `publicSourceScope` object, so the 2026-09 Butlers-only policy acts satisfy nothing and a superseded version 1 act satisfies nothing even when the policy bytes revert to its argument. `readPolicyActChain({ root, now })` gives the same answer as the port at every instant (a test checks this on every policy fixture world); it and `readClassActState({ root, now })` report an act recorded after `now` as `absent`. The existing read-gate pin in `governance-inputs.ts` is a separate gate and is not checked here. Wiring in `poc:dossier` is `records: createPackageAdmissionRecordsPort({ root, now: Date.now })`.

Limits: no withdrawal or successor act form exists yet, so a file of an unknown form refuses everything rather than being interpreted. That sweep is a stem match (case, Unicode-compatibility, dash, `_`/whitespace and default-ignorable folding), a backstop rather than a parser: a withdrawal worded without a stem, one written outside `decisions/`, or one appended as a heading to `ACCEPTANCE-ACT-RECORD.md` is not seen. The opposite hazard is availability: a decisions file whose text carries a stem anywhere ("the public egress consent", an act identity, an instance path, or a stem inside a script name or package path such as `scripts/record_public_egress_v2_act.py`) refuses every read until it is reworded or the reader changes. No text is filtered by its wording: a filter on words cannot be made fail-closed (R-361-1 met it with synonyms, split spellings, lookalikes, a word in a file name or a sibling file). The one exception is `src/citation-allowlist.ts`, a reviewed list of decisions files by path and the sha256 of their exact bytes, each with a one-line reason. In a file at that path with those bytes, and only there, whole tokens that exactly cite existing tooling are set aside before matching: `scripts/<name>` or `<name>` for a snake_case code file present in `scripts/`, or the path (or a suffix of it from the package directory up) of a file present in the public-repo-admission or public-egress-v2 package with no segment starting `instance` in any case; never a name carrying a record-id or act-identity needle or a `public-egress-` stem other than version 2's, and never the file's own name. A new, edited, renamed or copied file gets the whole-text sweep, in all three sweeps (admission, screening-scope policy, class amendment). The list was seeded empty: running the sweeps with no file allowlisted over main's 131 decisions files (at `5126610b`) refused nothing. `PENDING-OWNER-DECISIONS.md` changes with every row, so it can never be allowlisted: a row that cites a stem-bearing script refuses every read, and the row must be reworded (name the script by what it does, or cite it outside `decisions/`). `real-tree.test.ts` runs every read over this checkout's `decisions/`, so a trip fails CI on the commit that adds it rather than at the owner's sitting, and it fails on an allowlist entry that no longer matches a file byte for byte. The remedy for a trip is to reword the decisions file, or to add an entry for its exact bytes in a reviewed PR; never to widen a filter. Verified against the real instance bytes on main with synthetic act records only; no performed act exists today, so the reader returns no record from the live tree. The #266 act record form was read from its recorder script on the screening-scope branch, not from a performed record.
