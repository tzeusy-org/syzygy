# R-POLARIS-LAUNCH-CONSENT-1
Verdict: REVISE
Reviewed commit: 51375c8c5196051f58b4f8cc373da5d69c2c8bb3
Spec SHA-256: 5123ebb8f359219789d8f0b2cbc802bb455279e751e979c05ac9c24d1ce00343

Reviewer: independent fresh-context reviewer, 2026-11-08. Subject: every file
under `openspec/changes/polaris-dossier-launch-consent/` and
`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md` at
the commit above (`git rev-parse HEAD` confirmed equal before review). The
spec digest was computed by `hashlib.sha256` over the file bytes. No
observed-repository body or dossier output was read; no dossier or polaris
command was run. Line numbers are each file's own.

Owner intent the lead supplied for judgment (2026-11-08): "My vision is that I
can point polaris at any repo for which I have the source and generate the
Polaris sites", and "Revision should always default to latest trunk commit (eg
main/master). Observing its own repository for the purposes of generating a
Polaris for itself is fine."

## Summary

The core reading holds: no doctrine or contract clause I tested fixes the
*ceremony or timing* of a per-repository observation consent, and the REQ-033
quotation is exact. But the spec contradicts itself on reads before consent,
REQ-047 silently changes REQ-033 for runs that do not use launch consent, the
design omits RFC3-16(c)'s state-(1) composition, and three pieces of
per-repository preparation that the owner's intent targets are left in place
and undisclosed (the drawer statement, screening placements, and per-repository
code registration of statement and drawer forms).

## Findings

### F1 — blocking — spec.md:9, :116; OWNER-PACKET.md Q7 A (lines 118-120)

Clause: REQ-046, "Syzygy SHALL ask the owner for the missing consents at that
moment, before it reads any object of the repository"; its falsifier (line 99),
"An object is read before a confirmed answer or an in-force record". Against
it: REQ-047 line 116, the launch output states "the commit's committer date as
the clone records it", which needs the commit object read; REQ-046 line 9, the
question must state "for a governed subject, the agent provider and content
classes", and deciding governed status under REQ-033 needs "Syzygy's own path
listing of that tree" (tree objects); packet Q7 A, the statement "names every
content class at the pinned revision", which needs the tree listed and classed
before the answer. Every governed launch, and every launch at all under
REQ-047's output rule, trips the falsifier. Not satisfiable as written.

Repair I would accept: name exactly what may be read before the answer
(references, the one commit object, the tree listing of path names; no blob
body), cite the clause that permits that pre-consent metadata read or state
the reading for it in design §1 and the packet, and narrow the falsifier to
match; or move the committer date and the governed decision after the answer
and say how the question can then state the classes.

### F2 — revise — spec.md:3, :114, :118; SEMANTIC-DELTA.md:28

Clause: spec.md:3, "every other run keeps every predecessor requirement's bytes
and meaning"; SEMANTIC-DELTA "Read, unchanged: REQ-033's HEAD check". REQ-047
opens "In the operator-agent mode a run SHALL pin exactly one revision at
launch" with no restriction to launch-consented runs, and pins the trunk tip
absent `--revision`. REQ-033 records "the clone's checked-out HEAD commit" as
the pin when it equals a consented revision. A run on an existing consent
(e.g. Redis's at a fixed commit) with HEAD at that commit and no `--revision`
proceeds today and is refused under REQ-047 (HEAD differs from the trunk tip).
That is a behavioral change to REQ-033 for every run, undeclared as a
displacement, and contradicts the header sentence.

Repair I would accept: declare REQ-047's displacement of REQ-033's "record
that commit as the run's pinned revision" sentence for all runs and drop the
"every other run" claim, or restrict REQ-047's default to runs without an
in-force consent naming HEAD; add the case to the delta and the packet.

### F3 — revise — design.md:17 (RFC3-16 row); OWNER-PACKET.md Q4 A (lines 85-88)

Clause not cited by design §1: RFC3-16(c)(1), "A real human/social governance
act, preserved as the **exact owner phrase**, **exact content digest**, act
record and **recording commit/tag**." Spec line 13 fixes provenance state (1);
Q4 A, recommended, lets "A run may proceed on an uncommitted record". An
uncommitted record lacks one of the four things state (1) is preserved as. The
design table claims "No [amendment]" for RFC3-16 without testing (c). Also
RFC3-16(b): "after A1 exists, the act must explicitly select state (1)"; the
spec hard-codes state (1) and the question offers no selection.

Repair I would accept: add RFC3-16(a) trust premise and RFC3-16(c)(1) rows to
design §1 with a stated reading of "recording commit/tag" for an uncommitted
launch record; either make Q4 B the only lawful arm or put the reading to the
owner as a genuine question; state what the question carries once an A1
mechanism exists.

### F4 — revise (intent) — spec.md:15; spec.md:35 scenario 1; proposal.md:10-12

Clause: proposal.md:10-12, "with nothing prepared for that repository
beforehand"; spec.md:15, governed applies to a subject "whose project input
does not state whether a kernel evidence drawer exists". [Observed]
`packages/polaris-dossier/src/gate-sources.ts:322` `DRAWER_FORMS` holds a
per-repository owner act ("STATE NO KERNEL EVIDENCE DRAWER FOR REDIS-REDIS")
as the only source of a drawer statement. The launch question never asks for
it, so every new repository is governed and needs a statement, and scenario 1
("a non-governed public repository that no consent record names") is
unreachable for any repository not prepared with a drawer act beforehand.
Neither the proposal, packet nor design discloses this.

Repair I would accept: either ask the drawer statement at launch as its own
record (with its own clause reading), or state in REQ-046, the proposal and
the packet that without a prior drawer act every launched repository is
treated as governed, and rewrite scenario 1's WHEN to a reachable state; put
the choice to the owner as a packet question.

### F5 — revise (intent; honesty) — spec.md:19; design.md:86-99

Clause: spec.md:19, the public-source scope "admits the repository by its
consent record and holds no per-repository entry". [Observed]
`POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
`publicSourceScope.contentClassification.ownerPlacements` holds an entry for
`repository:redis-redis` at one commit placing `tls.md`, `modules/modules.md`
and `redis.conf`; the policy's own text says placements "name a repository
only to place paths at commits its observation consent already admits". So
the scope does hold per-repository entries, pinned per commit. Two
consequences the change neither states nor puts to the owner: (a) a new
repository gets no placements, so files of the same shapes are withheld, and
`OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03.md` records that withheld
files blocked the 2026-10-14 Redis trial's readiness; (b) the trunk-tip default
moves every run off the commit a placement names, so existing placements stop
applying. That is material per-repository preparation the owner's direction
targets, left in place. The normative sentence "holds no per-repository entry"
is also inaccurate as written.

Repair I would accept: correct the sentence (admission holds no per-repository
entry; placements do); add to design §5 and the packet what a launched run on a
repository with no placements yields, and offer the owner the choice (accept
withholding, or a policy successor making placements repository-independent
or launch-time).

### F6 — revise — spec.md:15, :17; RFC3-7

Clause: RFC3-7, egress consent "**One record per *(Project, provider)* pair,
naming the permitted set**". REQ-046 creates a statement with every confirmed
answer for a governed subject, and the reuse rule (line 17) speaks only of an
in-force record that "names the repository and the pinned revision". A
statement is not revision-scoped, so a second launch at a new trunk tip either
creates a second statement for the same (subject, provider) pair or the text
is silent on reuse. REQ-033 treats the statement as a consent record distinct
from an egress record, but design §1 does not say whether RFC3-7's one-per-pair
rule reaches it.

Repair I would accept: state that an in-force statement for the same subject
and provider, covering the stated classes, is reused and named, and that a
different class set supersedes it by a recorded act; add a scenario; state the
RFC3-7 reading in design §1.

### F7 — revise (testability; honesty) — spec.md:9, :13, :17

Clause: spec.md:9, the question states "the repository identity and the source
of that identity". No rule says how the identity is derived (remote URL,
operator declaration, `repository:<id>` form), so the oracle cannot derive an
expected identity independently, and line 17's revoked-record lookup "for the
same repository identity" is not testable. The identity's source (clone
configuration, within the agent sessions' write reach, or an operator
declaration) is not labelled Inferred, unlike the public status and who
answered; an operator or agent re-cloning under another remote name would
avoid naming a revoked record.

Repair I would accept: define the derivation, label the identity Inferred
with its source, disclose the re-identification residual beside the revoked
record rule, and add it to the falsifier.

### F8 — revise — spec.md:99 (REQ-046 falsifier); spec.md:156 (REQ-047 falsifier)

CC-SPEC-4 completeness. REQ-046's falsifier omits: the question missing any
required statement (including "an agent must never answer it"); a run on the
governance home's own working tree not refused; a non-public declaration not
refused before any record; a revoked record not named before asking; a missing
disclosure on the run record or a page; an in-force record not reused. Its
Observable lists "the objects read before and after the answer" but the
oracle-independence line covers only file creation; no independent capture of
object reads is named. REQ-047's falsifier omits a HEAD mismatch not refused
before consent and launch output missing the committer date, reference or
did-not-fetch statement.

Repair I would accept: add each omission to the falsifiers; name an
independent read capture (e.g. an instrumented object store outside the code
under test).

### F9 — note — spec.md:23, :25; proposal.md lines on overlap

Overlap with REQ-040 to 045 is in vocabulary, not requirement: the
one-command-run spec uses "launch record" 20 times for a session launch record
("An inventory or verdict from a launched run SHALL count only when its
session's launch record exists"); REQ-046 calls the consent records "launch
records". If both are adopted, REQ-040's falsifier ("a launch record is
missing") and REQ-046's write rule read ambiguously. Both also require the run
page to disclose the statement and its classes. No requirement or scenario
otherwise overlaps REQ-037 to 045 [Observed: read both proposed specs'
revision, consent and launch sentences].

Repair I would accept: rename (e.g. "launch consent records") and cross-cite
the statement disclosure rather than restate it.

### F10 — note — design.md:19 (SEC-2 row), :21 (VIS-4 row)

SEC-2's "Onboarding consent must name the providers permitted for the project
and the content classes they may receive; Syzygy renders that consent on the
project's surface." I accept launch-as-onboarding as a reading: the clause
fixes content and rendering, not occasion, and spec line 27 renders it. It is
[Inferred] and should stay labelled so in the packet, not only the design. On
VIS-4: RFC3-16(a)'s trust premise says "A machine may prepare an act for owner
attendance; it may not mint, impersonate, approve … one. If an implementation
accepts a forged record as an act, the resulting effect is unauthorized and is
a trust-floor violation". An agent-typed confirmation is therefore not a
residual that disclosure cures; it is an unauthorized effect that disclosure
makes visible. Design §3 and packet Q5 should say so in those words.

### F11 — note — SEC-4 / RFC5-12 write class (design.md:15, :20; packet Q3)

The write consent of Q3 is the right instrument: RFC5-12 "Write consent — per
repository: Syzygy may write its two namespaces", RFC3-7 "write
(governance-root plane only)", SEC-4 "Consent first: writes need recorded
per-repository consent (onboarding)". `decisions/` is in the governance root,
so the Q3 act covers it. Q3 B ("treat the launch command as your own
recorder") is a genuine arm but its trade-off line ("a reviewer may not accept
it") steers by reviewer prediction rather than stating what SEC-4 reading it
rests on.

### F12 — note (intent) — self-observation; Q4

For Syzygy's own repository the trunk tip moves with every commit, and under
Q4 A committing a launch record itself creates a new trunk tip with no consent,
so a self-run never meets "Revision already consented" and the next run always
asks. Not unlawful; the packet should state it under Q4 or Q6.

### F13 — note — registry entry; governance checks

[Observed] The installed source-acquisition entry
(`declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`)
says "to stay within the observation consent's stated fetch form the operator
fetches the one consented commit alone", presuming consent precedes the clone
and names a fetch form; launch consent reverses that order and REQ-046's
record names no fetch form. The ledger's disposition of this entry covers
only its state-directory text. Separately, [Unknown] whether
`scripts/check_governance.py` and the consent package's existing per-repository
form registries (`STATEMENT_FORMS`, `DRAWER_FORMS` in `gate-sources.ts`) can
read a launch record family with no per-repository code or phrase
registration; design §7 slice 2 should state that requirement, since per-
repository registration would be preparation by another name.

## Question-by-question

1. Clause sufficiency: RFC5-12, RFC5-13, RFC3-7 and SEC-4 permit the ceremony
   with the Q3 act. RFC3-16(c)(1) is not tested by design §1 and conflicts with
   Q4 A (F3). SEC-2's onboarding bullet admits the launch reading [Inferred]
   (F10). RFC3-7's "referenced — never embedded — from the declaration" is a
   pre-existing gap the change correctly flags and does not worsen. RFC3-7's
   one-per-pair rule needs a stated reading for repeat statements (F6). No
   amendment is required if F3 resolves to committed records or an owner
   reading.
2. Displacement exactness: the quoted REQ-033 text is exact [Observed:
   `str.count` = 1 in
   `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`].
   REQ-046 displaces only it, but REQ-047 changes REQ-033's pin rule for all
   runs without declaring it (F2).
3. Overlap: no requirement or scenario overlap with REQ-037 to 045;
   terminology collision on "launch record" and a duplicated disclosure (F9).
4. Testability: scenarios have observable outcomes; repository identity has no
   derivation for an oracle (F7); falsifiers incomplete (F8); scenario 1
   unreachable as written (F4); read-before-consent contradiction (F1).
5. Honesty: who answered, public status and upstream latest are labelled
   Inferred and disclosed. Repository identity and its source are not (F7);
   "holds no per-repository entry" is inaccurate (F5).
6. Packet: Q1-Q8 each change the bytes. Missing owner decisions: the drawer
   statement at launch (F4), per-repository screening placements (F5), REQ-047's
   effect on existing consented runs (F2), statement reuse across revisions
   (F6), and the RFC3-16(c) reading for uncommitted records (F3). Q3 B's
   trade-off steers mildly (F11).
7. Impact ledger: re-ran sweep B (`own state directory for the run`, Python
   `re`) over `git ls-tree -r -z --name-only`
   `fd08ea62f8b55fb60d7c79628688bc014b40875b`: 9,208 tracked paths, 40 not
   UTF-8, 9,168 searched, 8 files (raw 1, `.syzygy` other 5, OpenSpec 1, code
   1). Equal to the ledger row. Second method: `git grep -l -F` at the same
   commit, 8 files. Also re-ran sweep A over the same population: 188, equal.
