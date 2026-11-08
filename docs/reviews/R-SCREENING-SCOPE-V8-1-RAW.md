# R-SCREENING-SCOPE-V8-1 — public-source screening scope, version 8 (private sources)
Reviewed commit: e9f8cf42e19409c1c4338330b13a7b271f91d57a
Manifest SHA-256: 75e573b432ac1a5095c98eb81d42736897583096e359ff03c145cdb81a2ec155
Verdict: REVISE

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-08. Brief:
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md`.
No observed-repository body, dossier output, run directory or credential was
read; no dossier command and no provider call was made.

Abbreviations: `PKG` = `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8`;
`PATCH` = `PKG/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch`;
`LC` = `openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md`
read at `882d2297` (the commit the impact ledger names).

## Mechanical results (all re-run this session at the reviewed commit)

- `python3 scripts/build_public_source_screening_scope_v8.py --check`:
  "public-source-screening-scope-v8: patch and manifest current", exit 0.
- `--digests`: one row, `[variant: pv]`, digest equal to the manifest row.
- `--manifest-digest` printed the digest in the head above; `sha256sum` of the
  manifest file printed the same value (two methods).
- `--selftest`: "18 of 18 passed", exit 0.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- The commit adds 8 files over base `fd08ea62` (`git diff --stat`): the six
  package files, the builder and 25 lines of `check_governance.py`
  (`PUBLIC_SOURCE_SCOPE_V8_*`, lines 3799-3821, an existence-gated activation
  as for version 7).
- Impact-ledger sweeps (criterion 8), `git grep -F` at `fd08ea62` over
  `packages apps scripts PROJECT-STATUS.md .github`, excluding
  `scripts/build_public_source_screening_scope_v*.py`: the version-7 literal
  `1.8.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s`
  gives 16 lines in 10 files; `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-ACT.md`
  gives 12 lines in 8 files. Both reproduce `IMPACT-LEDGER.md:14-16`.
- No review-campaign file carries a `SCOPE-V8` pattern (`grep -rl -F SCOPE-V8
  docs/review-campaigns/` empty); this raw's committer must add one in the
  same commit (brief `REVIEW-BRIEF.md:71-72`).

## Findings

### 1. Visibility is keyed to the pair, but observation consent records are per revision — Moderate (revise) [Observed text; Inferred consequence]

`PATCH:24` (`sourceVisibility.rule`): "a repository's visibility is public
only when its effective observation consent record states that the repository
is public … Visibility is read for each pair from that pair's own record and is
never inherited from another pair, a fork or an upstream."

The singular "its … record" / "that pair's own record" has no single referent
once launch consent exists. `LC:17`: a confirmed answer creates "one
observation consent record for the pair … scope the pinned revision's commit
object … and nothing else"; `LC:23`: "A record stays in force until a later
owner act revokes or supersedes it; it does not expire when the run closes."
So one pair accumulates several effective records, one per revision, each with
its own declaration, alongside any pre-existing admission record (for example
`public-repo-admission/instances/requests/OBSERVATION-CONSENT.md` for the same
identity).

Concrete path: `LC:15` proposes, for "a fork or mirror at a commit an upstream
record names, or at a child of one", "the upstream's identity". A private fork
of a public upstream therefore joins the public upstream's pair by default. Its
own launch record may state private, but the pair also holds the upstream's
record stating public. An install that reads "the pair's record" by any
reading other than "the record admitting the commit being read" (first found,
any, most recent at the pair level) gives the private fork the public rules:
`secretRedaction.appliesTo` retains its project-documentation bodies as
redacted-span (the offline-guess oracle the delta closes for private sources,
`SEMANTIC-DELTA.md:90`), and `rawBodyHandling.rule`'s stated-private condition
(`PATCH:44`) is not triggered. The policy text permits that fail-open reading;
"never inherited from … a fork or an upstream" does not prevent it, because
under `LC:15` the fork and upstream are the same pair.

Required: key visibility to the record that admits the commit being read
(the (pair, revision) record), and make the repository private for every rule
whenever any other effective observation record of the same pair states
private, states nothing, or is unreadable. Pin the new wording in `--check`.

### 2. "States that the repository is public" has no defined carrier; existing public records state it only in prose — Moderate (revise) [Observed]

Criterion 4 asks whether an install can read the statement without parsing
free prose. At this commit it cannot:

- `LC:17` requires the launch record to carry "the operator's declaration
  whether the repository is public" but names no field, key or value set.
- The existing admitted public records state visibility only in prose: the
  instance heading `# requests observation consent (public repository)`
  (`public-repo-admission/instances/requests/OBSERVATION-CONSENT.md:1`) and the
  parenthetical in `Upstream: https://github.com/psf/requests (public;
  configuration, not repository identity)` (same file, line 19). The reader's
  regex treats that parenthetical as ignorable trailing text
  (`packages/polaris-generation-consent/src/package-reader.ts:165-171`,
  `(?: \([^\n]*\))?`).
- No consent form in `ADMISSION_ACT_FORMS` (`package-reader.ts:35-39`) carries
  a visibility field.

Consequence: a strictly fail-closed install ("a consumer that cannot read the
statement treats the repository as private", `PATCH:24`) turns the admitted
public repositories (requests, redis) private: no upstream fetch
(`PATCH:39`), and the version-2 public-target egress consent stops covering
them (`PATCH:44`). That contradicts `SEMANTIC-DELTA.md:100-102` ("Every rule
for a public repository is byte-unchanged in effect"). The alternative, reading
the title or parenthetical, is parsing prose. `IMPACT-LEDGER.md:40-48`
("Visibility") names a reader but does not say how existing admission forms
are to state public.

Second-order, for criterion 6: if the remedy is a structured visibility field
in the launch record, that is "another field" and, by `LC:25` ("one that asks
more of the record or the question (another field, consent class or
disclosure) needs this requirement amended alongside it"), REQ-046 would need
amending — contradicting `IMPACT-LEDGER.md:86-87` ("needs no REQ-046
amendment"). The package should decide the carrier (e.g. the closed set of
existing admission forms counts as stating public by form identity, and a
launch record states it by an exact literal the generic form defines), and
then say whether REQ-046 changes.

### 3. The delta claims a residual is disclosed in `consequence`; the policy bytes do not disclose it — Moderate (revise) [Observed]

`SEMANTIC-DELTA.md:91`: "Digests of excluded private bodies | Unchanged
(RFC5-17 requires them) | [Inferred] A whole-body digest confirms a guess only
when the guesser knows the rest of the body, which whole exclusion does not
show. The residual is disclosed in `consequence`, not removed".

`sourceVisibility.consequence` (`PATCH:28`) says only why redaction is off
("for a public repository the body is published already and this adds
nothing, for a private one it would"). It says nothing about the whole-body
digest residual of an excluded private body. `secretRedaction.withheldLines`
(v7 bytes) speaks only of withheld lines of a retained body.

On criterion 3's soundness question: the offline-guess argument for turning
redaction off is sound for the redacted-span case [Inferred]. Whole exclusion
closes it only when the rest of the body is unknown to the guesser. RFC5-17
(`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md:300-303`:
"an excluded item is recorded as (content digest, location reference, policy
version, redaction class)") keeps the digest and the path. The rest of the
body *is* known in exactly the case Finding 1 makes likely: a private fork of
a public upstream, where the file differs from the published upstream file by
the secret line. Templates and earlier public history give the same oracle.
Where a holder of the digest can read it without holding the clone is not
stated in the package [Unknown]. This should be named in the bytes the owner
signs (`consequence`), not only in the delta, and the delta's claim corrected.
The owner packet's sentence "That matters only when the rest of the file is
not already published" (`OWNER-DECISION-PACKET.md:26-27`) states the same
condition from the other side but does not say it survives whole exclusion.

### 4. "Open question 4" is cited but does not exist — Minor [Observed]

`SEMANTIC-DELTA.md:111-112`: "whether 'states that the repository is public'
can be read by an install without parsing free prose. See open question 4."
`OWNER-DECISION-PACKET.md:67-83` has three open questions (1 provider
statement, 2 whose repositories, 3 retention). The judged half routes to an
absent question; per Finding 2 it is a package decision, not an owner one.

### 5. Owner packet understates what signing loosens and when runs stop — Minor [Observed]

- `OWNER-DECISION-PACKET.md:43-44`: "It is what you asked for, and nothing
  gets looser for anyone." Admission itself is the loosening: a private
  repository's content, previously refused at launch (`LC:25`), now enters the
  run directory and rendered pages and, in the operator-agent mode, reaches the
  agent's provider with no per-project statement for a non-governed subject
  (the packet's own `:48-55`). The sentence should say the rules get no looser,
  not that nothing does.
- `OWNER-DECISION-PACKET.md:62-65`: "Until it lands, the read gates refuse the
  new policy." It does not say plainly that public runs stop too, and it
  disagrees with `IMPACT-LEDGER.md:23` ("A policy act without its install
  turns `main` red, so these land together"). The signer should be told that
  the act waits for (or lands with) the install, and that the install's
  frozen-path files (`scripts/check_surface_freeze.py:21`, `FROZEN_PREFIXES`)
  cannot land while a surface freeze is active.
- `OWNER-DECISION-PACKET.md:59-61` lists what a mis-declared public
  repository gets (partial redaction, upstream fetch) but omits that a
  public-target egress consent then covers it.

### 6. `--selftest` does not mutate three of the six edits or four of the new key's texts — Minor [Observed]

`SEMANTIC-DELTA.md:107-109`: "Mechanical: the six edits, the key … are pinned
by `--check`. `--selftest` mutates each of them (18 cases)." The 18 cases
(`scripts/build_public_source_screening_scope_v8.py:344-418`) are 3 positive
controls and 15 mutations. No case mutates `purpose`, `observedRepositories`,
or the first `secretRedaction.appliesTo` edit, the one that confines
redaction to public (`:74-77`); none mutates `privateSourceRules`,
`unchanged`, `agentSessions`, `consequence` or `values`. A probe this session
confirmed the code catches each: dropping " of a repository whose visibility
is public (sourceVisibility)," gives "the edit at secretRedaction.appliesTo is
not present exactly once"; reverting `purpose` / `observedRepositories` give
the matching edit findings; gutting `agentSessions` gives "sourceVisibility is
not the declared value". So this is a rule-6 coverage gap, not a behaviour
defect. Each case that exists fails for the reason it names: the needle
matched the intended finding in every probe.

Also observed: `--check` pins the scope relative to the script's own `EDITS`;
nothing pins their number. Appending a seventh `EDITS` entry that relaxes
`detectors` while keeping the phrase "public visibility exempts nothing"
gave `semantic_findings(...) == []` in a probe. "No other rule can change
unseen" (`SEMANTIC-DELTA.md:74-75`) holds only for a reviewer who reads
`EDITS`. A `len(EDITS) == 6` pin with a selftest case would make it mechanical.

### 7. A metadata consequence is not named: a private repository's identity enters Syzygy's governance repository — Minor [Observed text; Inferred consequence]

`LC:17` stores the identity and "the normalised URL as a locator hint" in the
launch record. `LC:23` commits it "on one dedicated reference of the
governance home". `LC:29`: "Syzygy SHALL NOT push or otherwise publish the
dedicated reference; publication is the operator's act." For a public
repository this is public information. For a private one, its name, host path
and commit ids become tracked objects in Syzygy's own repository, one push away
from its remote. The table's metadata row (`SEMANTIC-DELTA.md:92`) covers only
`targetMetadataRule`. The policy cannot govern it (it is the spec's), but it
should be named beside open question 2, as `agentSessions` names REQ-033.

## Notes (no change required)

- N1 [Observed] The launch-consent branch has moved:
  `agent/syzygy-pdja.21-launch-consent` is at `8e5754b9`, not the `882d2297`
  the ledger reads (`IMPACT-LEDGER.md:69-70`). A word diff of `LC` changes
  lines 3, 9, 15, 23 and 25. In line 25, "public-source scope" becomes "that
  admits sources by observation consent (today its public-source scope)". None
  of the sentences the ledger cites changes in substance, and line numbers 11,
  17, 25, 33, 81-84, 157 and 161 still hold at `882d2297` (verified).
- N2 [Observed] The ledger's list of launch-consent clauses that read
  differently is complete for that spec, as far as a sweep of `LC` for
  `public|private|fetch|egress|redact|visib|upstream|withheld` shows. Two
  further readings: `LC:15`'s fork-identity rule (Finding 1), and
  `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:257`
  ("`public-source screening scope version 7` or a successor"). Version 8 is
  such a successor and keeps `renderCondition`, so that clause reads the same;
  the ledger could say so.
- N3 [Observed] The quotations check out: REQ-033's non-binding sentence
  (`agentSessions`, `PATCH:27`; local-agent-mode spec line 11); `detectors`'
  "public visibility exempts nothing"; both egress consent instances and both
  templates titled "Public-target egress consent"; and the direction's answer
  B (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md:65-77` on the
  launch-consent branch, not on `origin/main`, as `SEMANTIC-DELTA.md:12-16`
  says).
- N4 [Inferred] Criterion 1: apart from Findings 1-2, which concern how
  visibility is determined rather than an edit, no edit relaxes a public rule.
  Each of the three site edits narrows only its private reading. Admission is
  through the same observation consent: `observedRepositories` still "admits no
  repository".
- N5 [Inferred] The no-fetch/no-credential decision and the stated-private
  egress condition are the less exposing choices. A further hardening is
  outside this package's "no public rule changes" scope, so it is for the
  owner, not required: forbid credentials on the public fetch route too. A
  mis-declared private repository's fetch would then fail instead of
  succeeding through an ambient credential helper. `accessBoundary.credentialApi`
  is false, but `networkEgressRoutes[0]` names no credential prohibition for
  public.
- N6 [Unknown] Whether Syzygy's own deliveries into agent sessions (review
  packets) of a non-governed private subject count as "sends" under
  `rawBodyHandling.rule`'s stated-private condition. That condition names
  external egress only, while `agentSessions` says the policy binds what
  Syzygy "sends". If a launched run's review role can use a different provider
  from the authoring role, that delivery is the only route by which the second
  provider receives the content. The "Agent review packets" row
  (`SEMANTIC-DELTA.md:94`) could say which reading holds.
- N7 [Observed] The `check_governance.py` registration mirrors version 7's,
  existence-gated on the not-yet-existing act file. CG passes with 0 FAIL.
