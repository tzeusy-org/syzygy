# R-LAUNCH-WRITE-CONSENT-1 — write consent for launch consent records, round 1
Reviewed commit: 1a368d04a398285d446bfc36d3f3ef217cacd7bd
Manifest SHA-256: f2f0e2dcadb9bcdf224ddc26601cf0a2874888258a1367656cb16f7cddd24ff8
Verdict: REVISE

Reviewer: independent, fresh context, holding the artifact, the brief's
references and the brief's criteria
(`.syzygy/governance/contracts/candidates/launch-consent-write-consent/REVIEW-BRIEF.md`).
Branch `agent/syzygy-pdja.22-write-consent`; HEAD confirmed by
`git rev-parse HEAD`. The Manifest SHA-256 above is printed by
`python3 scripts/build_launch_consent_write_consent.py --manifest-digest` and
matches `sha256sum` of the manifest file. The record's own digest (the
manifest row) was re-derived by `sha256sum` and matches the row.

No secret, target repository body, dossier output or credential was read; no
dossier command or provider call was made; no branch or commit was created.
Disclosure: to read the v1.1 bytes I ran
`git fetch origin agent/syzygy-pdja.21-launch-consent-v1-1` in the reviewed
worktree, which updated that branch's remote-tracking reference and
`FETCH_HEAD`, and `git remote get-url origin`. Rule-6 mutants of the builder
ran from a temporary copy under `scripts/`, removed after each run; the
`check_governance.py` registration mutants ran in a scratch extraction
(`git archive HEAD`) outside the worktree.

In this raw "SD" is the package's `SEMANTIC-DELTA.md`, "packet" its
`OWNER-DECISION-PACKET.md`, "record" `instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`,
"template" `templates/WRITE-CONSENT-TEMPLATE.md`, all under
`.syzygy/governance/contracts/candidates/launch-consent-write-consent/`, and
"spec" `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`.

## Criteria

1. **Exactly the owner's answer — yes.** The answer
   (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md:103-105`): "only
   launch consent records, only as new files on one dedicated branch of
   Syzygy's governance home; Syzygy commits each record there, never touching
   your working tree". The record: "may write launch consent records … and
   may write nothing else under this consent" (record:43-45); "adds no file
   outside that location" (record:59-60); exclusions name `refs/heads/main`,
   "the current branch of any of that repository's worktrees", "every working
   tree, every index and `HEAD`" (record:65-71). Nothing the answer grants is
   withheld. [Observed] Nothing wider is permitted in kind; Finding 1 is a
   hole in *how* the one permitted write may be shaped, not a wider class.

2. **REQ-polaris-generation-046's precondition — yes, with a spec-side
   residual.** Spec line 29: "whose scope names this record class, the
   dedicated reference and the location in its tree". The record names all
   three (record:26-32). The reference is `refs/heads/launch-consent-records`,
   a branch under `refs/heads/`, not the trunk (record:30, 34). Line 23's
   "under `.syzygy/governance/decisions/`" is met by a subdirectory
   [Inferred]: RFC3-7 says consent records "are governance acts stored in
   `.syzygy/governance/decisions/`"
   (`.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md:255-256`),
   and `decisions/launch-gate/` is an existing subdirectory home of the same
   tree. "Any reference a run may pin": see Finding 6 — a defect of nothing
   the record can fix.

3. **Write population closed — no.** The falsifier fragment (spec line 161):
   "a working tree, index or reference other than the dedicated one changes,
   or the trunk tip moves; Syzygy pushes the dedicated reference". The scope
   permits none of these (record:63-76). But the scope says each write "is
   exactly" objects plus one reference move and its log entry (record:46-54)
   and "may write nothing else" (record:45), and the Git mechanics of that
   move write files outside that list — Finding 2.

4. **Add-only — yes for each commit; leaving the first parent open is not
   sound.** "Its tree differs from its parent's tree, or from the empty tree
   when it has no parent, only by files it adds at paths under
   `.syzygy/governance/decisions/launch-consent/` that the parent's tree does
   not hold. It edits, removes, renames or changes the mode of no file"
   (record:56-59). [Inferred] That makes every recording commit add new
   files only, at the one location; a path colliding with a parent directory
   or blob needs a removal and is excluded. The open parent of a creating
   commit is Finding 1.

5. **Sound RFC5-12 record — yes.** RFC5-12: "Every consent record names its
   class, subject, scope, granting principal, grant instant, and revocation
   state" (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md:111-112`).
   Class record:15; subject the pair `(project:syzygy,
   repository:tzeusy-org-syzygy)` per RFC3-7 (record:17); scope record:41-80;
   principal `Owner: Tzeusy` (record:9); instant "the act, if performed,
   records its own instant" (record:7), the same form as the
   `dossier-agent-provider-v2` precedent instance line 7; revocation state
   record:39; prospective withdrawal citing RFC5-13 (record:104-107). The
   identity is acceptable as a first declaration: `git remote get-url origin`
   gives `https://github.com/tzeusy-org/syzygy` and the builder's
   `derived_identity` gives `tzeusy-org-syzygy`; a self-observation launch
   proposes it only under a condition the SD does not state (Finding 5).

6. **Packet honest — largely yes.** Plain words, one question (packet:47),
   the exact owner words (packet:9-12), the accepted costs quoted
   (packet:71-73) and what the act does not do (packet:94-103). The
   `[Inferred]` label on attribution (packet:86-88) is honest. One cost is
   understated by omission (Finding 1, the open first parent) and one
   phrase is narrower than its source (Finding 7). [Observed] `git grep -lF
   polaris-generation-046 -- apps packages` returns 0 files, so packet:100-102
   holds at this commit.

7. **Rule 6 — `--check` passes; `--selftest` passes 23 of 23; three
   predicates have no killing mutant.** Each named mutant matches its
   reason by needle (`caught`, builder:204-209). Mutating the builder: (a)
   dropping `trunk` from `ref in (trunk, "refs/heads/main", "refs/heads/master")`
   (builder:127), (b) dropping `or ref.endswith("/")` (builder:125), and (c)
   dropping `loc.endswith("/")` (builder:129) each leave `--selftest` at 23
   of 23. Dropping the `master` literal is killed (22 of 23). Finding 4.

8. **Registration — yes.** `LAUNCH_WRITE_CONSENT_*` at
   `scripts/check_governance.py:1831-1842`; phrase registration gated on the
   manifest at :2753-2757; copy registry for the manifest and any
   `ROUND-n-DISPOSITIONS.md` gated on the manifest at :3665-3680. No
   `PWB_SUCCESSOR_CHAIN` link, no performed record under `decisions/`, no
   recorder script (`ls scripts` shows only the builder). Mutants in the
   scratch extraction: one character of the manifest row changed fires CG-7e
   ("unlabeled digest … is one character from this file's declared
   argument"); a `ROUND-1-DISPOSITIONS.md` quoting the phrase with a wrong
   digest fires CG-7d and raises CG-7e. Summary line in the worktree:
   `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
   (The scratch extraction's own baseline shows one CG-7h FAIL that the
   worktree does not; I read it as an artefact of the extraction, not the
   package, and relied on it only for deltas.)

9. **Authority — yes.** No package Markdown outside `instances/` and
   `reviews/` carries a 64-hex token (Python sweep: 0 in each of the 4
   files: packet, brief, SD, template). The words signed, granted, accepted
   and "in force" appear only negated, conditional, or in Finding 8's one
   accurate description of another artifact.

## Findings

**Finding 1 — the open parent of a creating commit lets Syzygy restore records the operator removed** (requires change)
[Inferred] The record permits creating the reference "when it is absent,
pointing at that recording commit" (record:51-52), and "Every recording
commit has at most one parent" (record:56) with no constraint on which; the
SD makes this explicit: "the scope permits a root commit or a child of any
commit" (SD:158-160). If the operator deletes the branch to remove records
"before it is relied on" (spec line 29; record:98-100), the removed commits
remain in the object database, and the next recording commit may lawfully
take the old tip as its parent. Every record the operator removed is then
again on the dedicated reference, "added by a recording commit on the
dedicated reference" in screening scope 8's population
(`../public-source-screening-scope-v8/SEMANTIC-DELTA.md:56-61`) and "in force
from … the recording commit that contains it" (spec line 23), with no new
owner answer. That defeats the revert path SEC-4 ("individually revertable",
`.syzygy/governance/doctrine/security.md:117`) and spec line 29 rely on. The
same openness lets the first commit's parent be a trunk commit, so the
branch shares the trunk's history and tree; the packet does not tell the
owner that. Repair: fix the creating commit's parent (no parent, or a
parent from which no commit that ever held a file at the location is
reachable), and say which in the packet.

**Finding 2 — "is exactly" leaves out the transient files Git writes to move a reference** (requires change)
[Inferred] The scope says each write "is exactly" the objects and "the
reference … moved … Git's own log entry for that reference move is part of
the same write" (record:46-54), and "may write nothing else under this
consent" (record:45). Every Git reference update takes a
`<ref>.lock` file (and, for a packed reference, touches `packed-refs`
locking), and object writes go through temporary files before rename. Read
literally, no implementation can comply. The falsifier (spec line 161)
forbids none of these, so the fix is one clause, not a narrowing: name
Git's transient lock and temporary files for those writes as part of the
same write, as the log entry already is.

**Finding 3 — the reference move can run a hook of the governance home** (note)
[Inferred] `git update-ref` runs the `reference-transaction` hook if one is
installed. The record already excludes hooks as a write target and
"execution, which other records govern" (record:70-71, 80), so the record
is right; the implementation must make the move with hooks disabled, and no
package text says so. Worth one sentence in the SD's "What depends on it".

**Finding 4 — three docstring predicates have no killing mutant** (note)
[Observed] Builder docstring (builder:24-27) claims the reference "is
neither the trunk nor `refs/heads/main` nor `refs/heads/master`" and the
location "is a directory". Removing the `trunk` comparison (builder:127),
the trailing-slash test on the reference (builder:125) or the location's
`endswith("/")` (builder:129) leaves `--selftest` at 23 of 23: the trunk
mutant sets `REFERENCE` to `refs/heads/main`, which the literal also catches.
Add mutants with a non-`main` trunk equal to the reference, a reference
ending in `/`, and a location without the trailing slash. The
`--digests`/`--manifest-digest` "refuses while stale" claims (builder:19-20)
also have no selftest.

**Finding 5 — "a self-observation launch proposes the same identity" holds only for a GitHub-URL clone** (note)
[Inferred] SD:150-154 says the derived identity is what a self-observation
launch proposes. Spec line 27 requires that launch to run on a separate
clone; if that clone is made from the local governance home, its `origin`
is a filesystem path, and the builder's own `derived_identity` gives
`projects-syzygy` for `/home/orca/orca/projects/syzygy`. This write consent
names no revision and no URL a launch matches on, so such a launch proposes
a second identity for the same repository. No consent fails (the write
consent's subject is the governance home, independent of the observed
clone), but the SD sentence should carry its condition.

**Finding 6 — "any reference a run may pin" cannot be met by any branch; the defect is the spec's** (note)
[Inferred] REQ-polaris-generation-047 accepts with `--revision` "a reference
the clone holds" (spec line 176), so every branch of any clone is pinnable
and spec line 23's "SHALL NOT be … any reference a run may pin" is
unsatisfiable as written. Spec line 27 refuses a run on the governance
home's working tree or Git directory, so `refs/heads/launch-consent-records`
itself is never pinned; a separate clone of the governance home carries it
as a different (remote-tracking) reference. Nothing the record can fix; a
v1.2 candidate for the spec.

**Finding 7 — the packet's "until it is revoked" is narrower than scope 8's "until it is read or revoked"** (note)
[Observed] Packet:76-78: "one unreadable record stops every run, public ones
included, until it is revoked". Scope 8
(`../public-source-screening-scope-v8/SEMANTIC-DELTA.md:66-67`): "refused,
with that file named, until it is read or revoked". The packet also omits
that the operator may remove the commit before reliance (record:98-100).
The cost is not understated in size, only in its exits.

**Finding 8 — SD:53 says "The owner signed v1.1"** (note)
[Observed] The sentence describes another artifact, and is accurate:
`POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.1.md` is added on
`origin/agent/syzygy-pdja.21-launch-consent-v1-1` by `bde8ed1f`, and the SD
dates it and says it is not yet on `main`. It labels nothing in this package
signed; recorded so criterion 9's answer has its exception named.
[Observed] SD's byte-identity claim for spec lines 17, 23 and 29 and the
falsifier fragment in v1.1's line 167 were re-checked by Python: all true.
