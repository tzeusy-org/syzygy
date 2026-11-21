# Review R-D11-1 — doctrine amendment D11 (session raw reads)
Subject: .syzygy/governance/contracts/candidates/doctrine-amendment-session-raw-reads-d11/PROPOSAL.md sha256 6488f9c910baa6c862b95d75c5da682c4a88f8054bf8adead740e1ccde764c6d
Reviewer: subagent-d11-fresh-reader-1, 2026-11-21
Verdict: REVISE

Digest computed with `sha256sum` over the untracked working-tree file in
worktree `k54o-10` (branch `agent/syzygy-k54o.10`, HEAD `9e919a293`).
Governing references read: `doctrine/security.md` (whole), `doctrine/vision.md`
VIS-3 and VIS-4 (lines 152-224), `doctrine/trust-and-evidence.md` trust floor
(lines 179-202), `decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`
(lines 1-55), `openspec/changes/dossier-declared-source-model/` (spec.md
lines 9-33, 153, 192, 525; design.md 9, 79; SEMANTIC-DELTA.md 57), and the
lower rules the proposal's table names.

## Restatement (VIS-3 fresh-reader test)

Intent: the owner has chosen to let agent sessions that Syzygy briefs to read
a repository (dossier authoring sessions are the motivating case) read the
repository's clone directly with their own agent tool, even though that
traffic goes to the session's model provider without passing Syzygy's secret
screening. The owner accepts that a secret in the repository may reach that
provider. Doctrine today (SEC-2's "never sent, whatever is declared") forbids
that, so SEC-2 and SEC-5 are amended to carve out this one exception.

Constraints it imposes:
1. SEC-2's secrets bullet is narrowed to sends *by Syzygy*: every prompt,
   request and payload Syzygy builds stays screened.
2. New exception: a briefed session's own reads of the repository clone may go
   to the session's model provider unscreened, only if (a) that provider is
   declared for the run and (b) the run's page discloses, on every run, that
   the session read the raw repository unscreened and a secret may have
   reached the provider.
3. Anything the session writes back into a Syzygy surface or store is still
   under SEC-5; a reproduced secret breaks the trust floor.
4. New SEC-2 violations: a secret in a prompt Syzygy builds; a session run
   whose page omits the disclosure.
5. SEC-5 gains a bullet saying session raw reads are outside screening, that
   this is "not a weakening", and that every other weakening waits for the
   owner.
6. Unchanged: the detection policy, all Syzygy sends/stores/renders, SEC-3,
   and which repositories/content classes a session may read (left to
   `pursuit-2026-11-21-source-reach`).
7. Lower rules (RFC5-12/14, RFC-0003 near line 289, CC-SEC-2, the dossier
   source policy's `agentSessions`, the dossier run page) follow later by
   agent adoption; nothing relies on the exception before the owner adopts.

Would a fresh reader get it right? Mostly, on the core mechanism. But three
points a reader without authoring context would get wrong or could not decide:
(i) whether the exception covers any briefed session or only dossier sessions
(the text says any; the owner's answer says dossier sessions; finding 1);
(ii) whether content outside the run's declared content classes may also reach
the provider through the session's read, which an unscreened raw read
necessarily allows but the text never says (finding 6); (iii) the new SEC-5
bullet calls the exception "not a weakening" while the bullet above it defines
"lets a secret be ... sent" as a weakening (finding 3). The restatement
therefore passes on intent and fails on scope.

## Findings

### 1. Scope is wider than the owner's answer — revise

Evidence: the owner's answer records "dossier agent sessions may keep reading
the raw clone, and every run page discloses that a secret in the clone can
reach the provider"
(`decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md:46-47`). The
proposed SEC-2 text grants the exception to any session: "When Syzygy briefs
an agent session to read a repository (for example a dossier authoring
session)" (PROPOSAL.md:54-56), and the one-sentence summary says "A session
Syzygy briefs to read a repository" (PROPOSAL.md:30). That covers any future
briefed session (Mission, fleet workers, other Polaris modes) the owner was not
asked about. Secrets is an owner class (vision.md:177-180), so the widening is
not the agent's to make.

Fix: scope the exception to the sessions of a Polaris dossier run (authoring,
inventory and review sessions, if all three read the clone), e.g. "When
Syzygy briefs an agent session of a Polaris dossier run to read the run's
repository ...". If wider scope is wanted, offer it to the owner as a separate
choice rather than in the text adopted under answer A.

### 2. The accepted risk is stated narrower than what a raw clone exposes — revise

Evidence: the proposal accepts "the risk that a secret committed to the
repository reaches the provider" (PROPOSAL.md:58-59). A raw clone read with
the agent's own tool also reaches untracked and git-ignored files in the
working tree (`.env`-style files) and the clone's `.git/config` (the dossier
spec itself notes the clone configuration is in the sessions' write reach,
spec.md:109). Those are not "committed". The owner's words are "a secret in
the clone" (answers:47), which is broader and accurate. Doctrine that
understates the accepted risk fails the honesty bar it exists to protect.

Fix: say "a secret anywhere in the clone the session reads (committed or not)"
and use the same words in the disclosure bullet (PROPOSAL.md:61-63 already
says "a secret in it"; make the risk sentence match).

### 3. The new SEC-5 bullet contradicts the bullet above it — revise

Evidence: security.md:152-154 defines owner-class weakening as "a change that
makes the policy detect less, admits unclassifiable content, or lets a secret
be indexed, rendered or sent"; VIS-4 class 2 repeats "let a secret be indexed,
rendered or sent" (vision.md:178-180). D11 lets a secret be sent. The proposed
bullet says "that is not a weakening of the policy" (PROPOSAL.md:90-91).
Read together, SEC-5 would call D11 a weakening and simultaneously say it is
not one.

Fix: replace with "This is a weakening the owner chose (D11) under the bullet
above; the policy's detection is unchanged, and every further weakening still
waits for the owner."

### 4. SEC-2's opening "Secrets never leave." left absolute — revise

Evidence: security.md:49-50 "**SEC-2 — ...** Secrets never leave." The
proposal keeps it and argues it "reads as the rule for Syzygy's own sends"
(PROPOSAL.md:94-96), but the sentence carries no such qualifier, and the
bullet title "Secrets never leave (SEC-5)" is also kept (PROPOSAL.md:51). The
file's own intro "keeps secrets out" (security.md:4) is likewise unqualified.
A fresh reader meets an absolute rule and then its exception two bullets
later; the headline sentence is the one most often quoted alone (RFC-0003:289,
the dossier policy JSON:41 and :428 quote it verbatim).

Fix: amend the opening to "Syzygy never sends a secret; the one accepted
exception is an agent session's own reads (below)." and retitle the bullet
"Syzygy never sends secrets (SEC-5)". Either amend security.md:4 to match or
state why it stays.

### 5. Blast-radius table is incomplete and one row is inaccurate — revise

Evidence (sweep below):
- **RFC5-15 is missing.** RFC-0005/consent-egress-secrets.md:205-213 says
  "every network transmission of repository content passes one check" with
  "SEC-5: matching or unclassifiable content never leaves", and :221-222
  "A feature that transmits as a side effect without traversing the choke
  point is the SEC-2 violation, whatever its intent." Session provider traffic
  is exactly such a transmission.
- **The dossier spec itself is missing.** The adopted
  `openspec/changes/dossier-declared-source-model/` requires every page to
  disclose "that SEC-2 and SEC-5 bind the agent's own reads and sends"
  (proposed/polaris-generation/spec.md:31) and says "SEC-2 and SEC-5 also bind
  the agent's own reads and sends: the brief SHALL require that the agent ...
  never send secrets" (spec.md:525; restated in SEMANTIC-DELTA.md:57 and
  design.md:79). After D11 the spec:31 disclosure becomes false and must be
  replaced by the raw-read disclosure; that is a spec amendment (CC-REV-2),
  not only a renderer change. The row "Dossier run page | the dossier renderer
  (F-3 era)" (PROPOSAL.md:121) points at code, not at the requirement.
- **Second policy row missed.** POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json
  :428 also says "Content delivered to a provider must be classified and
  screened ... Secrets never leave."; the table names only `agentSessions`
  (:41).
- **RFC5-12/RFC5-14 row is imprecise.** Neither clause contains "secrets
  never leave" (the phrase is RFC-0003:289's); RFC5-12 is about consent
  classes and does not mention secrets. The secrets conditions live in the
  RFC-0005 module summary (:63-67) and RFC5-15.
- **RFC-0003 cited by line number.** "RFC-0003 manifests, line 289" is the
  RFC3-7 clause (heading at manifests-and-namespace.md:276); cite RFC3-7.
- Minor: `.claude/skills/heart-and-soul/SKILL.md:31,51` summarise SEC-5 as
  "secrets fail closed"; refresh after adoption.

Fix: add rows for RFC5-15 (session traffic does not traverse the choke point;
name the exception and that it is disclosed, not checked), for the dossier
spec REQ (spec.md:31 disclosure and spec.md:525 brief rule, via CC-REV-2),
for policy JSON :428, and for the heart-and-soul summary; retarget the RFC
row to RFC-0005 §3.7 summary + RFC5-14/15 and RFC3-7; state whether the brief's
"never send secrets" instruction (spec.md:525) stays as a best-effort guard.

### 6. Content classes outside the run's declaration are silently in scope — revise

Evidence: RFC5-14 says "the run's record names the provider and the content
classes sent" (consent-egress-secrets.md:141-144), and the dossier policy binds
"three exact eligible artifact classes" (design.md:79). An unscreened raw
clone read sends every class (e.g. `code-content`) regardless. The proposal
says only secrets and says it does not change "which repositories a session
may read", deferring classes to `pursuit-2026-11-21-source-reach`
(PROPOSAL.md:104-108), whose prereq says widening what reaches a provider
"reverses the owner's signed screening-scope-v2 choice"
(docs/pursuits/2026-11-21-vision-pursuit-data.json:22). The owner's answer
("may keep reading the raw clone") arguably already accepts it for session
traffic, but neither the doctrine text nor the table says so, so a reader
cannot tell whether a session read of an undeclared class is a violation.

Fix: state explicitly in the exception that the declared content classes bind
what Syzygy sends, and that a session's raw read may carry any class to its
declared provider (disclosed); and in "What it does not change" say how this
interacts with the source-reach question (it answers the session channel; the
pursuit question governs Syzygy-built sends). If the author believes that
exceeds answer A, take it to the owner instead.

### 7. [Observed] label on an inference — revise

Evidence: PROPOSAL.md:21-22 "[Observed] So whatever that session reads goes
to its model provider unscreened." This is a deduction ("So"), and the spec
the proposal cites says Syzygy "cannot observe the agent tool's own
transmissions" (spec.md:525). The third bullet's last sentence ("Under that
text a dossier session reading a raw clone is a doctrine violation whenever
the clone holds a secret", :24-26) is also interpretation, and imprecise: the
violation is the send, not the read. The first bullet's quotation is verbatim
at spec.md:525 and true; "raw clone" is the author's phrase (the spec says
"real clone read location", spec.md:153).

Fix: relabel the :21-22 sentence and the last sentence of :23-26 [Inferred];
say "goes to its model provider, as far as the agent tool sends what it reads,
unscreened by Syzygy"; say "a violation whenever the session sends a secret".

### 8. "The run's page" vs the dossier's disclosure mechanism — note

Evidence: PROPOSAL.md:61 "the run's page discloses, on every run"; owner:
"disclosed on every run page" (answers:44). A dossier run renders many pages,
and the spec's disclosure mechanism is every page's machine form plus one
linked human sentence and the appendix (spec.md:31). "The run's page" may be
read as one page. Also unstated: what happens to a run that ends before any
page renders.

Fix: "every page the run renders discloses ..., in the run's disclosure
appendix and machine form", and say a run that renders nothing still records
the disclosure in its run record.

### 9. "Syzygy" vs "session" boundary vs SEC-3 — note

Evidence: SEC-3 binds "Syzygy, every process Syzygy launches or schedules,
and every instruction a Syzygy feature gives an agent (a brief, prompt, skill
or work item)" (security.md:81-83). D11 splits "sent by Syzygy" from the
session's own sends but never says whether a session Syzygy itself launches
(the dossier spec forbids this today, spec.md:383, but future modes may not)
counts as Syzygy. Narrowing per finding 1 mostly removes this.

Fix: add "a session the operator starts" or state that a session Syzygy
launches is Syzygy for SEC-2.

### 10. Owner's record says "SEC-5"; amendment edits mostly SEC-2 — note

Evidence: answers:13-14, :49-52 speak of "a doctrine amendment of SEC-5";
the quoted text lives in SEC-2 (security.md:62-63). The proposal explains this
correctly (PROPOSAL.md:23-26). Fix: when adopting, have the DOCTRINE-AMENDMENT-LOG
row name both SEC-2 and SEC-5 so the log does not repeat the packet's
attribution.

### 11. Precedent worth citing — note

`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`
already had sessions read "the clone without restriction" with every page
saying screening did not bind what the agent read or sent; the declared-source
model reversed that. Citing it would let the author reuse tested disclosure
wording and show the owner the reversal being reversed. Optional.

## Acceptance criteria summary

- a. Before blocks: PASS. Python `in` test over security.md: the SEC-2 bullet
  block and the violation block each occur exactly once (count 1); the edit-2
  anchor "- **Weakening it is the owner's decision (VIS-4):**" occurs once.
  The three After blocks are absent, as expected.
- b. Whole-text consistency: FAIL (findings 3, 4).
- c. Scope equals the owner's answer: FAIL (findings 1, 2; 6 unclear).
  Disclosure on every run page, no policy/detection change, Syzygy's own
  sends/stores/surfaces screened: present.
- d. Blast radius complete: FAIL (finding 5).
- e. [Observed] claims true: partial FAIL (finding 7).

## Sweep

Population: every `git ls-files` path under `.syzygy/governance/doctrine`,
`.syzygy/governance/contracts/rfcs`, `.syzygy/governance/policies`,
`openspec/changes`, `AGENTS.md`, `.claude/skills` — 185 readable files.
Whitespace normalized (runs of whitespace to one space) so wrapped phrases
match; Python `re`, case-insensitive.

Pattern 1 (restatements):
`secrets? never leave|never (?:be )?sent,? whatever|whatever is declared|never send secrets|own reads and sends|agent'?s? own reads|secret in a prompt|secrets? (?:are|is) never sent|never sends? (?:a )?secret|no secret (?:is|may be) sent|secrets?[^.]{0,80}never (?:be )?sent|never sent[^.]{0,40}secret`

16 hits in 7 files:
- security.md:50, 62 (x2), 63, 72 — the subject.
- contracts/rfcs/RFC-0003/manifests-and-namespace.md:289 — in table (as "line 289").
- policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json:41 (x2) — in table; :428 — NOT in table.
- policies/craft-and-care/security-and-secrets.md:59 — in table (CC-SEC-2).
- openspec/changes/dossier-declared-source-model/SEMANTIC-DELTA.md:57 (x2), design.md:79, proposed/polaris-generation/spec.md:31, :525 (x2) — NOT in table.

Pattern 2 (sentences, split at `.`/`;`, containing all of
`\b(agent|session)s?'?\b`, `\b(secret|screen(ed|ing)?|unscreened)\b`,
`\b(send|sends|sent|transmi\w*|provider|egress)\b`): 30 sentences in 15
files. Beyond pattern 1's files: RFC-0005 README.md (2) and
admission-and-boundary.md (1) — summaries, no rule to change;
vision.md (1) — VIS-4 agent-decides list, consistent;
POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json (4) — candidate,
not in force; dossier-declared-source-model CAPABILITY-/CONTRACT-COVERAGE.json
(3) — follow the spec; polaris-dossier-local-agent-mode (6),
polaris-dossier-launch-consent (1), polaris-dossier-arbitrary-public-repo (1)
— predecessors (finding 11), no change needed.

Found by reading, not by either pattern: RFC5-15
(consent-egress-secrets.md:205-222) "every network transmission" choke point
and side-effect violation — NOT in table. `.claude/skills/heart-and-soul/SKILL.md:31,51`
("secrets fail closed") found by a plain `secret|SEC-5|SEC-2` grep over
`.claude/skills` (4 lines, all in that skill).

Residual: wording that restates the rule in forms neither pattern covers
(e.g. "fails closed" alone, "screened before it leaves") was not swept across
all 185 files; the RFC-0005 module was read directly around §3.6-3.8.
