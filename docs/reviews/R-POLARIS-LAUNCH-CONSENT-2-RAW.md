# R-POLARIS-LAUNCH-CONSENT-2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 3c00d2c8a545cdcdaf5fac3ede82a917157c74f7
Spec SHA-256: 5a3b73ba641518cc083f5dfbb7e4d3acfd068a3712bc91eb213f2728fdb9e189

Reviewer: independent fresh-context confirmation reviewer, 2026-11-08, per
`openspec/changes/polaris-dossier-launch-consent/REVIEW-BRIEF-ROUND-2.md`.
`git rev-parse HEAD` was confirmed equal to the commit above before review.
The spec digest was computed by Python `hashlib.sha256` over the bytes of
`proposed/polaris-generation/spec.md`. Subject read: every file under the
change directory and
`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md`;
governing references read: RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16 with (a),
(b) and (c), the predecessor REQ-polaris-generation-033, and the
`publicSourceScope` of the classification policy candidate. No
observed-repository body or dossier output was read; no dossier or polaris
command was run. Line numbers are each file's own at the reviewed commit.

Owner intent supplied by the lead (2026-11-08): "My vision is that I can point
polaris at any repo for which I have the source and generate the Polaris
sites." "Revision should always default to latest trunk commit (eg
main/master). Observing its own repository for the purposes of generating a
Polaris for itself is fine."

## Summary

Every round-1 disposition is true of the bytes. No finding is blocking: the
spec is lawful on the readings it states, internally coherent for every
scenario it lists, and testable. Two repairs introduced revise-level defects
the owner should see: the F7 identity derivation makes repository identity
follow the remote URL, which RFC1-2 says it must not, and design §1 does not
test RFC1-2 or RFC3-6; and the F2 restriction in REQ-047 qualifies the
existing-consent branch by the derived identity where the header and the
scenario do not. One owner question is missing: the pre-answer classes are
computed under a policy scope that, by its own text, admits no repository
until a consent exists. The change serves the owner's intent: a public
repository with no preparation reaches a dossier after one terminal question,
the trunk tip is the default, and self-observation works from a separate
clone without moving the trunk.

## Findings

### G1 — revise (new, from the F7 repair; owner question) — spec.md:15; design.md:16-26, :121-126

Clause: RFC1-2, "Repository identity is a declared identity in the project
declaration, never a remote URL or path — URLs and default branches change;
identity must not." RFC3-6, "Repository identity is the declared opaque
identifier — never a URL, path, or branch (RFC1-2); locator hints may change
without touching identity."

spec.md:15 derives the identity afresh from the clone's remote URL at every
launch: "The repository identity SHALL be derived, never chosen by Syzygy:
from the URL of the clone's remote …". After a URL change (a rename upstream,
a move between hosts, a fork remote), the same repository derives a new
identity; a record that still matches by "the pinned revision or a parent"
is found, but nothing says the new record keeps the matched record's
identity, so one repository acquires two identities — the split RFC1-2
forbids. The identity string is not literally a URL, and the owner's phrase
does name it, so a lawful reading exists (the derivation proposes, the
owner's phrase declares, the URL is a locator hint), but design §1 has no
RFC1-2 or RFC3-6 row and design §5 discloses only the revoked-record
residual, not the identity split. Also, "the last two path segments" lets two
distinct repositories collide where hosts nest groups: `x/sub/name` and
`y/sub/name` both derive `repository:sub-name`.

Repair I would accept: add RFC1-2 and RFC3-6 rows to design §1 stating the
reading (derivation proposes; the owner's phrase declares; the recorded URL
is a locator hint); add to REQ-046 that where an existing record matches by
URL, revision or parent, the question proposes that record's identity rather
than a newly derived one; disclose the collision case beside the
re-identification residual. Or put the choice to the owner as a packet
question.

### G2 — revise (new, from the F2 repair) — spec.md:3, :159, :171

Clause: spec.md:159, "a run started without `--revision` whose clone's HEAD
is a revision that an in-force observation consent **for the derived
repository identity** names SHALL pin that HEAD exactly as
REQ-polaris-generation-033 states". Against it, the header (spec.md:3): "A
run whose clone's HEAD is a revision that an in-force observation consent
made by any other act names keeps every predecessor requirement's bytes and
meaning", and the scenario (spec.md:171), whose WHEN has no identity
qualifier. A clone at a consented Redis commit whose remote URL derives an
identity other than `repository:redis-redis` (a fork remote, a mirror) falls
into "every other run", pins the trunk tip and is refused for HEAD mismatch —
a change to REQ-033's behaviour for a run that does not use launch consent,
which the header says does not happen. REQ-046's own matching rule
(spec.md:15: identity, URL, pinned revision or parent) is wider than
REQ-047's branch, so the two requirements disagree on what "an existing
consent covers" means. Not blocking: read charitably the scenario sits under
the requirement, and for Redis's upstream URL the design's [Inferred] match
holds.

Repair I would accept: qualify REQ-047's first branch by REQ-046's matching
rule (or by "names HEAD", with no identity condition), and make the header
and scenario say the same; add the fork-remote case to REQ-047's Case line.

### G3 — revise (owner question, missing from the packet) — spec.md:9, :11; OWNER-PACKET.md Q1 (lines 66-77)

Clause: spec.md:9, "From the tree listing alone it SHALL decide … the content
classes its path classification assigns at the pinned revision", stated to
the owner before the answer (spec.md:11). [Observed]
`POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
`publicSourceScope.observedRepositories`: "exactly the repository ids named
by an effective public-repository observation consent record … the policy
admits no repository". Before the answer no consent exists, so the scope
that would classify the paths applies to no repository; the classes shown
are a preview of how the scope would classify once admitted, computed under
no effective policy for that repository. Q1 puts the "preparation, not
observation" reading to the owner for the reads; it does not put this
reading for the classification.

Repair I would accept: state in REQ-046 and design §1 that the pre-answer
classes are the policy's classification as it would apply on admission,
labelled as a preview, and add that reading to Q1's list of readings the
owner accepts.

### G4 — note — OWNER-PACKET.md:3-4, :178

Q10 is drafted with no recommendation ("No recommendation: the options are
drafted for your choice", line 172), as F5's disposition says. Two
residues: the preamble still says "Questions for you, each with a
recommendation" (line 4), now false for Q10; and option B alone carries a
parenthetical, "(drafted, not decided)" (line 178), in the slot where other
questions put "(recommended)", which marks it out among the three. Repair:
"each with a recommendation except Q10"; drop the parenthetical or give one
to each option.

### G5 — note — spec.md:9, :161, :144

spec.md:9: Syzygy "SHALL store nothing from these reads except in the
question, the launch output and, after a confirmed answer, the launch
consent records". REQ-047 (spec.md:161) requires "the run record" to state
the committer date. The run record is not in ¶1's list; an implementation
may satisfy both by re-reading the commit after the answer, but the oracle
cannot tell which read a stored date came from, so REQ-046's falsifier
clause "anything from a pre-answer read is stored outside the question,
launch output and records" is not observable for that field. Repair: add the
run record to ¶1's list, or say the run record takes the date from a
post-answer read.

### G6 — note — spec.md:144 (REQ-046 falsifier)

The falsifier is now near-complete (F8 repaired). Remainders, each a SHALL
the falsifier does not name: asking before refusing when the write consent
is absent (spec.md:29, "Syzygy SHALL ask nothing, refuse"; the falsifier
names only a record created without it); the self-observation refusal made
after asking rather than "before asking" (spec.md:27); launch consent
records read from any reference other than the dedicated one, or from a
working tree (spec.md:23); and per-repository code, phrase, form or registry
entry (spec.md:25), which no scenario or Observable reaches and which needs
a structural test. Repair: add the four clauses, and a structural case for
the last.

### G7 — note — spec.md:25, :124, :144

"every file a placement would have placed is withheld and renders Unknown"
is testable where a placement names the repository at another commit, but
counterfactual for a repository with no placement at all (every new one),
where it is vacuous. Repair: "every file the screening withholds for want of
a placement".

### G8 — note — spec.md:23, :29

"which SHALL NOT be the trunk, the current branch or any reference a run may
pin": a run pins a reference of the observed clone, not of the governance
home, so for every repository but Syzygy's own the clause is vacuous, and for
a self-observation clone that fetches the dedicated reference it is
unenforceable by Syzygy. Also, the dedicated reference lies in the agent
sessions' write reach; deleting or force-moving it removes every launch
record from Syzygy's view, after which a revoked record goes unnamed (the
same residual as G1's, by another route). REQ-033's write-reach disclosure
covers the records; this specific failure is not stated. Repair: say "any
reference of the governance home's trunk or current branch", and add the
reference-rewrite residual beside the re-identification residual.

### G9 — note — design.md:58, :96; IMPACT-LEDGER.md:48, :69

F9's disposition says "Renamed 'launch consent record' throughout". Four
occurrences of the shorthand "launch records" remain in design and ledger
prose (Python `re` `launch\s+records?\b` over every `.md` in the change
directory except the briefs and dispositions: 7 hits, 3 of them quoting
REQ-040's term deliberately). The spec itself is clean. Editorial.

## Question-by-question

1. **Dispositions F1 to F13.** Each is true of the bytes.
   - F1 repaired: spec.md:9 names references, the commit's root tree,
     parents and committer date, and tree entries; no blob; falsifier
     spec.md:144 matches. Residue G5.
   - F2 repaired by restriction (spec.md:159, scenario :171); residue G2.
   - F3 repaired: spec.md:17 (state (1) with item 9 absent; explicit
     selection once A1 exists), spec.md:23 (recording commit); design §1
     rows at :19-20; Q4 every arm commits.
   - F4 repaired: spec.md:19; scenario 1 (:41) reachable; "drawer unknown"
     scenario :53; Q9.
   - F5 repaired: spec.md:25; design §5 :134-145; Q10 with no recommendation
     (residue G4).
   - F6 repaired: spec.md:21; scenarios :59, :65; design §1 RFC3-7 row.
   - F7 repaired as to testability and labelling (spec.md:15); the repair
     introduced G1.
   - F8 repaired: Oracle independence names an instrumented object store
     (spec.md:143); falsifiers widened; remainders G6.
   - F9 accepted; spec clean; residue G9.
   - F10 accepted: spec.md:13; design §3; packet preamble and Q5.
   - F11 accepted: Q3 B now states its SEC-4 reading (packet :96-99).
   - F12 repaired: spec.md:23, :29; scenario :112; design §4; Q4 B and C
     state the self-run cost.
   - F13 accepted: design §5 :146-156; spec.md:25 generic form; ledger
     :58-69.
2. **New defects.** No contradiction between REQ-046 and REQ-047 in any
   listed scenario; one in their matching rules (G2). REQ-033: the
   displacement quotation is exact (Python `str.count` = 1 in
   `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`),
   and the only other change to REQ-033's effect is G2's edge case. No
   falsifier the requirement cannot satisfy; one clause the oracle cannot
   observe (G5). Unlabelled claims: none found that Syzygy cannot observe;
   the pre-answer classes are a preview not so labelled (G3).
3. **Dedicated reference.** I accept the reading. RFC3-7 says consent records
   are "stored in `.syzygy/governance/decisions/`", naming a path and no
   reference; a commit whose tree holds the record at that path, in the
   governance home, stores it there. RFC3-16(c)(1) preserves state (1) as
   "the exact owner phrase, exact content digest, act record and recording
   commit/tag": "commit/tag" contemplates an anchor other than the trunk
   (a tag is never the trunk), and RFC3-16(c) says a commit "may serve as
   recorded context for a human-attended state-(1) act", which is the use
   here; that Syzygy, not the owner, makes the commit is preparation under
   RFC3-16(a)'s "A machine may prepare an act for owner attendance", since
   the phrase is the act. Costs the owner should weigh under Q4: records off
   the trunk are outside every trunk-reading check and surface (no PR, no
   `check_governance` pass over them) and vanish from view if the reference
   is rewritten (G8).
4. **Packet questions.** Q1 to Q10 are genuine: each answer changes spec or
   policy bytes (Q2 B, Q10 B and C through a policy successor). Q10 is
   drafted without a recommendation, with the residues in G4. Missing: the
   classification-preview reading (G3) and, if not repaired, the identity
   reading (G1).
