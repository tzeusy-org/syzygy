# Semantic delta LAUNCH-CONSENT-V1-2 — existing full clones, copied at the trunk tip, and any https or ssh locator

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-launch-consent` version 1.2, redrafted after round 3 to
> the owner's selection "Redesign: copy trunk tip locally". No review, owner
> sign-off, installation, tag or product change is claimed here.

**Artifact:** `proposed/spec.md.patch`, applied to
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
at version 1.1.
**Stable IDs affected:** REQ-polaris-generation-046 and 047, amended in place,
and one sentence of the change's preamble.

- **Preamble:** runs fall into two classes decided at launch: the run that
  keeps every predecessor meaning (its pinned revision another act's consent
  names, and no launch record is needed) and every other run, which is a
  launch-consented run.
- **046:**
  - the pre-answer read list, scoped to the clones and naming the copy, and
    a statement that the copy step's Git processes are not Syzygy's reads;
  - one statement added to the question (the copy), carried to the run
    record and pages;
  - the launch observation consent's scope held in the copy;
  - the write reading extended to the copy;
  - one sentence group added after the identity rule, whose derivation keeps
    its v1.1 bytes (every host, the last two path segments, and `https`,
    `http`, `ssh`, `git` and scp-form remotes);
  - the identity residuals rewritten, and a fourth (port and case) added;
  - two new paragraphs (locator forms; visibility), the first also giving
    the effect of a match by `Upstream:` URL;
  - ten scenarios;
  - its case, oracle (reads attributed by process) and falsifier;
  - one `warrants.decisions` entry.
- **047:**
  - the consented-HEAD branch's "changes nothing else" narrowed to the pin;
  - the trunk rule made exact for remote-tracking references, and
    `--revision` resolution for abbreviations and non-commits;
  - "did not fetch" becomes "made no network request";
  - the HEAD paragraph replaced: which runs are copy-class runs (none where another
    act's consent names the revision; a run under a launch consent recorded
    with version 1.1's scope alone is one, its run record stating that the
    copy goes beyond that consent's wording), how the copy is made, in the
    operator's clone's object format, and kept, what Git and what Syzygy
    read of the operator's clone, and the refusals;
  - seventeen scenarios, and one v1.1 scenario ("HEAD elsewhere") and the
    first scenario's WHEN amended;
  - its case, observable, oracle independence and falsifier;
  - one `warrants.decisions` entry.

No requirement is added, removed or renamed; no other requirement's bytes
change.
**Change class:** Normative; the whole package takes the normative review floor.
**Author:** Claude, for `syzygy-pdja.29` (epic `syzygy-pdja`).
**Date:** 2026-11-09; redrafted 2026-11-10.

## Warrant

[Observed] The owner direction `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`
(`.syzygy/governance/decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`),
a plain direction recorded from structured questions answered on 2026-11-09.
It authorizes drafting only. The owner's first two selections, quoted from
that record:

- "Accept full clones (Recommended) — Reads only the pinned trunk-tip commit
  from your existing clone; history stays unread. Needs a small spec
  amendment, review and your sign-off."
- "Any https or ssh git URL (Recommended) — Any host, over https or ssh; the
  launch consent and visibility rules still apply. Needs a spec amendment,
  review and your sign-off."

The owner did not choose the local-path option, and this version admits no
local path.

[Observed] The same record's section "Rulings on the draft's four points"
quotes four further selections, made after the first draft of this package
had put four points to the owner. They decided D2's disclosure and D5 of the
reviewed drafts, and decide D6 and D7 below, which quote their rulings.

[Observed] Round 1 of review (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md`,
verdict `REVISE` at line 4) returned three revise findings and nine notes.
The repairs, and the reason for each disposition, are in
`ROUND-1-DISPOSITIONS.md`. One repair, D6's admission of typed `http://` and
`git://` URLs, rested on a reading made by the coordinating session, not by
the owner; the owner accepted it on 2026-11-10 ("Keep http/git URLs").

[Observed] Round 2 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-2-RAW.md`,
verdict `REVISE` at line 4) returned three revise findings and three
editorial notes. The repairs are in `ROUND-2-DISPOSITIONS.md`; the sections
that carried them were redrafted after round 3.

[Observed] Round 3 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-3-RAW.md`,
verdict `REVISE` at line 4) returned three revise findings and three notes,
all in the full-clone reading design. Under the stopping rule the
coordinating session put the package to the owner, who selected, as the
direction record's dated section of 2026-11-10 quotes:

> Redesign: copy trunk tip locally (Recommended) — Syzygy makes its usual one-commit clone from your full clone over git's local file transport, with no network. The signed read rules then apply unchanged and the closed list goes away. git reads your packs (delta bases included), which is disclosed. Agents then work in that copy rather than your clone. Redraft and fresh review.

[Inferred] That the person answering is the owner. This selection supersedes
the full-clone reading design (the old D2 and its closed list) and the
"Disclose only" ruling for this design: the agent sessions now work in the
copy. The owner had declined a pinned-tree copy as a separate option on
2026-11-09 and chose the copy here. `ROUND-3-DISPOSITIONS.md` says where each
round-3 concern lands. The URL half (D6 to D8) is unchanged by the
redesign.

[Observed] Round 4, the first review of the redesign
(`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-4-RAW.md`, verdict `REVISE` at
line 4), reproduced the copy step on scratch fixtures and returned three
revise findings and six notes, all on the text's consistency.
`ROUND-4-DISPOSITIONS.md` says how each was disposed. The coordinating
session treats the redesign as a fresh sequence: round 4 is its first round,
and after two more `REVISE` verdicts it goes to the owner.

[Observed] Round 5 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-5-RAW.md`,
verdict `REVISE` at line 4) found round 4's findings answered and raised two
revise findings and seven notes. `ROUND-5-DISPOSITIONS.md` disposes them
and records a self-review table of every absolute, falsifier arm and
scenario THEN in REQ-046 and REQ-047, checked against a copy run, a no-copy
run and a refusal run. [Observed, by the coordinating session's message] On
2026-11-10 the owner asked for the review loop to continue autonomously, so
the stop after round 6 is lifted while rounds converge.

[Observed] Round 6 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-6-RAW.md`,
verdict `REVISE` at line 4) raised two revise findings, both edge cases,
and two notes. `ROUND-6-DISPOSITIONS.md` disposes them and adds a stage
sweep (every launch-output, run-record and page statement against runs
refused before, during and after the copy and after the question) and a
refusal sweep (every refusal against what it can truthfully state).

[Observed] Round 7 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-7-RAW.md`,
verdict `REVISE` at line 4) raised one revise finding and three notes.
The finding: "a run that makes a copy" named both a launch-time class and
a run that had made one. REQ-047 now defines two terms once, a
copy-class run (decided at launch; every other pinned run is a no-copy
run) and a run whose copy step started, and every sentence, arm and
scenario uses one of them. A copy-class run refused before its copy step
starts states only that no copy was made. This page uses the same terms.
`ROUND-7-DISPOSITIONS.md` disposes the findings, re-runs the stage sweep
with the two terms, and lists all 156 occurrences of "copy" in REQ-046
and REQ-047 with the term each uses.

[Observed] Round 8 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-8-RAW.md`,
verdict `REVISE` at line 4) raised one revise finding, the wording of one
falsifier arm ("runs without one", now "is a no-copy run"), and four
notes: the launch output's copy statements now have a definition and an
arm, line 240's last sentence is scoped to its own paragraph, and the
delta's retired phrasings are gone. `ROUND-8-DISPOSITIONS.md` adds a
pronoun pass over every arm and scenario THEN/AND line.

[Observed] Round 9 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-9-RAW.md`,
verdict `REVISE` at line 4) raised three revise findings and three notes.
Its finding 1 is the class of rounds 6 and 7, a required statement that a
run refused at some stage cannot truthfully make, so the repair is at the
root. REQ-047 now names the stages once (identifier named, copy step
started, commit pinned, question asked, brief issued, agent session
started) and states one stage rule: every statement about the copy, the
agent sessions, the pinned commit or the question is made only for a
stage the run reached, and a stage not reached is stated as not reached.
Two terms are defined once: the named identifier, which a run's pin rule
gives, and the pinned revision or commit, which that identifier becomes
only once shown to be a commit; a non-commit is never pinned. The copy
step now starts with the copy's directory. `ROUND-9-DISPOSITIONS.md`
derives the stage sweep from the rule and labels every "pin".

[Observed] Round 10 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-10-RAW.md`,
verdict `REVISE` at line 4) raised three revise findings and three notes;
the class recurred a fourth time, by run class rather than by stage. The
stage rule now names, for every statement it governs, the stage and the
run class (copy-class, no-copy or both) and the form for the other class;
its last stage is "brief or packet delivered", Syzygy's own act, which
replaces "brief issued" and "agent session started" above, and Syzygy
states nothing about a session except as its own report. The coordinating
session then stopped the loop and put the open points to the owner.
`ROUND-10-DISPOSITIONS.md` records the class-qualifier sweep as it stood
then (25 clauses).

[Observed] On 2026-11-10 the owner ruled, as the direction record's section
"Rulings after review round 10, 2026-11-10" quotes:

- "Final review rounds (Recommended)": round 11 of this package is ordered.
- "Keep http/git URLs" and "Port/case merge": both accepted as drafted. D6's
  typed-URL reading and the port-and-case merge in D7 are ruled, no longer
  open; the merge is disclosed as a fourth residual.
- "Refuse SHA-256 clones" was left unticked: the copy takes the operator's
  clone's object format and no clone is refused for it (D2).
- "Copy anyway (Recommended)": a run that only a launch observation consent
  recorded with version 1.1's scope covers is a copy-class run, and its run
  record states that the copy goes beyond that consent's "no fetch by
  Syzygy" wording (D1). The one-commit requirement and refusal for that case
  are removed.

[Inferred] That the person answering is the owner. `ROUND-11-PREP.md`
gives, for every statement these rulings add or change, its stage, its run
class and the other class's form, the class-qualifier sweep re-run (26
clauses), and the scratch fixture behind the SHA-256 change.

[Observed] Round 11 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-11-RAW.md`,
verdict `REVISE` at line 4), the round the owner ordered, raised three
revise findings and five notes. Both v1.1-consent falsifier arms are bound
to the one-commit refusal version 1.1 carried; the no-copy run's agent
statement is the directed-to form, with the session's own report labelled
Inferred, in REQ-046 and REQ-047 alike; the alternates and reftable arm is
scoped and timed as the body is. The recurring class had reached the
falsifier arms, which earlier sweeps classed as not statements, so
`ROUND-11-DISPOSITIONS.md` tests every arm of both falsifiers (57) against
the body in both classes and at every stage; five more arms that a
conforming run could trip are repaired there, and one residual is carried.

[Observed] Round 12 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-12-RAW.md`,
verdict `REVISE` at line 4), scoped to the round-11 repair, raised two
revise findings and five notes. The packet duty conflicted with
REQ-polaris-generation-035's closed packet contents, and the copy's
directory could lie inside the governance home's working tree. The owner
then ruled, as the direction record's section "Rulings after review round
12, 2026-11-10" quotes: "Briefs only (Recommended)" and "One more
fixes-only round (Recommended)". The briefs alone name the copy; the
copy's directory is kept out of the governance home, a run that would put it
there refused before its copy step; the 046.2 residual is closed by naming
pages among the stores. `ROUND-12-DISPOSITIONS.md` extends the arm sweep to
the predecessor requirements: every new duty on a brief, packet, record or
page is checked against the requirement that governs that artifact.

[Observed] Round 13 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-13-RAW.md`,
verdict `REVISE` at line 4), the fixes-only round, raised one revise finding
and six notes. The placement rule named one working tree of the governance
home while arm 046.12 watches every one, so a copy in a linked worktree
tripped the arm. It is closed from both sides: the copy's directory is never
inside any working tree of the governance home's repository, linked
worktrees included, nor inside its Git directory or common Git directory,
nor inside the operator's clone's working tree or Git directory; and arm
046.12 exempts the making, keeping or removal of a copy, wherever it sits.
`ROUND-13-DISPOSITIONS.md` re-tests every arm and statement that mentions a
working tree, the governance home or removal.

## Where the two limits live today (rule 9 sweep)

[Observed, 2026-11-09, at `origin/main` `715c59c4`.] The sweep used Python
`re`, case-insensitive, over `git ls-tree -r -z` of that commit for each
population, for seven forms: `github`; `https://`; `\bssh\b|scp`;
`github:[A-Za-z<{$]` (the code's identity form);
`commit alone|commits? alone|single-commit|one-commit|one consented commit`;
`shallow|--depth|depth=1`; `full clone`. A second pass with `git grep -i -F`
for `github`, `alone` and `shallow` over the same paths agreed. The raw
counts per population and every hit file are below, as round 1's note 11
asked; the counts equal the ones the round-1 reviewer re-derived.

**The predicate for "pins".** [Inferred, judged per file] A hit pins a clone
shape or a GitHub-only locator when it sits in a requirement, in an owner-act
record's scope or in a registry entry's authority field, and restricts the
clone's form or the locator's host. A hit in description, history, review
prose, a quotation of another file, a detector pattern or a URL of the
observing project's own upstream does not pin.

| Population | Files | Files with any hit | Files whose hit pins |
|---|---|---|---|
| installed specs, `openspec/changes/*/specs/**` | 9 | 1 | 0 |
| design and proposal of the two signed dossier changes | 4 | 2 | 0 |
| `.syzygy/governance/decisions/**` | 217 | 13 | 0 |
| `.syzygy/governance/policies/**` | 12 | 3 | 0 |
| `.syzygy/governance/declarations/**` | 2 | 1 | 1 |
| screening v8 and write-consent packages | 20 | 8 | 0 |

Each hit file, and why it does or does not pin:

- **Specs (1).** The launch-consent spec, `ssh` twice: REQ-046's
  normalisation already removes `https`, `http`, `ssh`, `git` and the scp
  form. It admits more than GitHub, so it does not pin.
- **Design and proposal (2).**
  - The launch-consent `design.md`, `commit alone` once: its §5 quotes the
    registry entry's fetch sentence, a quotation.
  - The local-agent `design.md`, `github` 4, `https://` 2, `shallow` 1: its
    command table names `parseGithubUrl` as code `init` and `preflight` are
    "built from", and its `shallow` hit describes the provider mode's fetch.
    Description, not a requirement.
- **Decisions (13), none pinning.**
  - `shallow` in three, each meaning a shallow file tree, not a clone:
    `CRAFT-TREE-RESTYLE.md`, `DOCTRINE-AMENDMENT-D6-TREE-STYLE.md`,
    `DOCTRINE-AMENDMENT-LOG.md`.
  - `github` in ten, each naming GitHub as a code host or API, a local,
    scratch or `.github/` workflow path, or the `github_pat_` detector, and
    in the 2026-10-08 blockers packet an example request for
    `https://github.com/redis/redis`; none restricts a locator:
    `BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md`,
    `DOCTRINE-AMENDMENT-D6-TREE-STYLE-REVIEW-2-RAW.md`,
    `DOSSIER-BLOCKERS-DECISION-PACKET-2026-10-08.md` (with one `https://`),
    `OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-20.md`,
    `OWNER-DIRECTION-SHARED-MUTATION-RUNNER-2026-10-29.md`,
    `PENDING-OWNER-DECISIONS.md`,
    `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`, and the
    three launch-gate administration files under `launch-gate/` (the
    validation transcript, its JSON and its Markdown report).
- **Policies (3), none pinning.**
  - `GOVERNANCE-SUBSTRATE-LOCK.yaml`, `github` 7 and `https://` 6: the
    upstream URLs of the governance tools it locks, in a record that is
    never authority.
  - The installed classification policy, `github` 1 and `shallow` 1: the
    `github_pat_` detector, and the network route "the shallow by-commit
    fetch from the target's upstream that the observation consent describes",
    a Syzygy fetch the local-agent mode never makes.
  - `craft-and-care/INSTALL-RECORD.md`, `shallow` 1: "shallow rule trees", not a clone.
- **Declarations (1), pinning.** The source-acquisition registry entry,
  `commit alone` 1 and `shallow`/`--depth` 2: its `typedAuthority.fetch`
  sentence (below, D9). It is the one pin, and it is conditional on a
  consent's stated fetch form.
- **Screening v8 and write-consent packages (8), none pinning.**
  - `github` in five write-consent files (`OWNER-DECISION-PACKET.md`,
    `ROUND-1-DISPOSITIONS.md`, `SEMANTIC-DELTA.md`, and the syzygy instance's
    `WRITE-CONSENT-LAUNCH-RECORDS.md` and `params.json`), each the observing
    project's own upstream.
  - `github` in v8's `IMPACT-LEDGER.md`, the `.github/` path its sweep covered.
  - `shallow` in v8's `SEMANTIC-DELTA.md` and its policy patch, each the same
    network-route sentence as the installed policy's.

Two further texts, outside those populations, were read because the code
cites them:

- [Observed] The clone-shape check (`packages/polaris-dossier/src/clone-shape.ts`)
  rests on the redis observation consent, a performed act's record. Its
  scope says "The operator fetches each admitted commit alone into a local
  repository used only for the run (`git fetch --depth=1 <upstream>
  <commit>`), so no ancestor commit is transferred". Review
  `docs/reviews/R-POLARIS-DOSSIER-CLONE-SHAPE-1-RAW.md` cites that sentence as
  its governing text and says "The spec does not itself require" the shape.
  So no signed requirement pins the single-commit clone; one performed
  consent record does, for the runs that rely on it.
- [Observed] The GitHub-only locator is code alone:
  `packages/polaris-dossier/src/github-url.ts` (copied from the provider-mode
  trigger) and the refusal in `init.ts` that a run record "carries a public
  https://github.com/<owner>/<repo> URL only". No signed requirement says it.

[Observed] Identities: over all 1,565 tracked files under `.syzygy/` and
`openspec/`, 0 carry a `github:<owner>:<repo>` identity, by both passes. The
form exists only as `repositoryId` in `github-url.ts` and the provider-mode
trigger, and no record uses it. Every recorded identity has the
`repository:` form REQ-046 derives or a declared one:

| Identity | Files |
|---|---|
| `repository:redis-redis` | 22 |
| `repository:psf-requests` | 9 |
| `repository:tzeusy-org-syzygy` | 4 |
| `repository:butlers-configured-poc` (declared) | 15 |

So the compatibility that matters is with the `repository:<owner>-<repo>`
identities. This version keeps REQ-046's derivation byte for byte, so every
one of them is derived as before.

**What needs a spec change, then.** [Inferred] Neither limit is a signed
requirement, so the code could drop both without one. The amendment is still
needed, because the launch-consent requirements describe reads, references
and locators for a clone that held one commit. They say nothing about:

- how a clone that holds history becomes the one-commit clone the signed
  rules read, and what Syzygy and Git read of it on the way;
- which locator forms are admitted;
- how a locator carrying credentials is handled.

Without the amendment, each of those would be an implementation choice
nobody signed.

## One change, not a split

[Inferred] Every edit lands in REQ-polaris-generation-046 and 047 of
`polaris-dossier-launch-consent`, and governs the runs REQ-047 pins. It has
one stated reach beyond launch-consented runs: an observation consent made
by another act also matches a launch by its normalised `Upstream:` URL. That
match adds to REQ-046's matching and REQ-047's revision branch and removes
nothing from either, so every consent a run could rely on before still
serves it. Every copy-class run is a launch-consented run, since the
preamble's other class is pinned at another act's revision and is a no-copy run (round 5 note 5); the earlier second reach is gone.

The category is one: what a launch accepts as its input, the clone and its
locator. It overlaps no other change. The local-agent mode keeps its bytes:
its REQ-033 already requires object reads by identifier at the pinned
revision and refuses alternates, replacements and local configuration, and
the copy is a clone those rules read unchanged. Its registry entry is another
matter: D9 flags a conflict that needs an owner-signed successor. Its
design table's `parseGithubUrl` citation names the code `init` was built
from and goes stale at implementation, as a history sentence. It is not
patched, so that the signed local-agent bytes and this change stay apart.

**Recommendation:** one package, launch-consent version 1.2.

## The decisions, each with its reasoning

D1 to D5 were redrafted on 2026-11-10 to the owner's redesign selection
(see the warrant). They replace the full-clone reading design reviewed in
rounds 1 to 3, whose closed list of in-place reads is gone.

### D1. Which clones a launch accepts, and which runs are copy-class runs

**Decided:**

- **Accepted clones.** Any clone of the operator's that holds the pinned
  commit and every object reachable from its root tree: a full clone with
  history, branches, tags, stash and reflogs, a one-commit clone, or
  anything between. Syzygy never refuses a clone for holding more, and never
  fetches into, prunes, repacks, checks out in or writes to it.
- **Who copies.** Every run REQ-047 pins is a copy-class run, the repeat run at a
  revision a launch consent of this version names included, unless its
  pinned revision is named by an in-force observation consent made by
  another act. A run that only a launch observation consent recorded with
  version 1.1's scope covers is a copy-class run too (owner ruling of
  2026-11-10, "Copy anyway").
- **The no-copy run.** It works in the operator's own clone as
  v1.1 does, and a HEAD elsewhere is refused with the checkout command.
  - Under another act's consent (today, the redis consent), that consent's
    stated form binds it, whether or not the run also records a launch
    consent record.
- **A launch observation consent recorded with version 1.1's scope**
  ("held in the operator's own clone, with no fetch by Syzygy"). Earlier
  drafts kept that scope: no copy, a one-commit clone required and a full
  clone refused (round 4 note 8). The owner chose "Copy anyway" on
  2026-11-10. Such a run is a copy-class run; a full clone works; once its
  copy step started (stage: copy step started; copy-class), the run record
  states that the copy goes beyond that consent's "no fetch by Syzygy"
  wording. A no-copy run states no such thing: it is covered by another
  act's consent. The consent is otherwise relied on as it was recorded.
  [Observed, local refs only] No such record is known today; the rule
  covers records that v1.1 may make before v1.2 is signed.

**Why:** the owner's selection. The copy is the clone the signed rules
already describe, so REQ-033 to 036 apply to it unchanged. The no-copy cases
keep a recorded scope out of reach: the redis consent says the operator
fetches each admitted commit alone, and this version does not override it.
A v1.1 launch record's "no fetch by Syzygy" is gone beyond by the owner's
ruling, and the run record says so rather than leaving it silent.

**Which runs keep every predecessor meaning.** [Observed, round 4 finding 2]
The preamble now sorts the runs into two classes on conditions known at
launch, and the classes partition them:

- the run whose pinned revision another act's consent names, and for which
  the in-force records other than launch consent records already hold
  everything REQ-033 requires, so it asks no question and neither relies on
  nor records a launch consent record. It keeps every predecessor meaning
  and is a no-copy run;
- every other run, which the preamble calls a launch-consented run, whether
  it then records anything or ends in a refusal or a decline.

Both classes are keyed on the pinned revision, the copy rule's own
condition. v1.1 keyed the first on HEAD; for a run with no `--revision`
whose HEAD a consent names, the pinned revision is that HEAD, so nothing
changes for it. A run with `--revision` at a launch-consented commit, on a
clone whose HEAD another act's consent names, is now a launch-consented copy-class run and is bound by REQ-047's read list (a scenario pins it). The
definition of "launch-consented run" now includes runs that end before
recording anything, which round 3 finding 2 asked for.

### D2. The copy step

**Decided**, in REQ-047, before the question:

1. Syzygy creates an empty directory of its own for the copy, never derived
   from the operator's clone's path, and in it an empty repository with an
   empty template (`git init --template=`).
2. It fetches from the operator's clone over Git's local file transport the
   pinned commit alone, by its full object identifier, at depth one, with no
   tags and no submodules, then checks the commit out detached. This is the
   form `clone-shape.ts` already checks for the redis consent, with the
   operator's clone in place of the upstream.
3. Every Git process for the copy runs with:
   - the system and global configuration disabled;
   - no other Git variable of the operator's environment;
   - every transport but the local file transport refused;
   - lazy fetching of missing objects disabled;
   - no hook path.
4. Syzygy checks the copy's form before the question, as the clone-shape
   check does, and refuses a copy that departs from it.
5. Where the run ends before its brief, by a refusal or a decline, Syzygy
   removes the copy and says so. Otherwise the copy is the run's clone and
   is kept after the run, outside the run's state directory, until the
   operator removes it; the launch output names its location (round 4 note
   4).

The file URL of the operator's clone is not a locator; it is never recorded
or rendered as one. REQ-046's write reading is extended to the copy's
directory, which Syzygy creates and keeps or removes. REQ-046 states once
that the copy, its making, keeping and removal lie outside each of its
"writes nothing", "edits or removes no file" and "changes no working tree,
index or reference" statements, and that REQ-047 alone governs them (round 5
finding 1); two scenarios and a falsifier arm say so in their own words.

**Git's reads are not Syzygy's.** [Observed, round 4 finding 1] Git's
`pack-objects` in the operator's clone, and `index-pack` and `checkout` in
the copy, read every blob of the pinned tree before the answer. REQ-046 now
says that these reads are not Syzygy's reads under its pre-answer list and
blob rule, that REQ-047's copy rules alone govern them, and that Syzygy uses
nothing they read but the copy. Its blob arm and pre-answer arm are scoped
to Syzygy's own reads, and both oracles attribute reads by process: the
read-logging layer records Syzygy's in-process reads, and an independent
process capture records the copy's Git processes, checked only against the
copy rules. What Syzygy itself may read before the answer is unchanged.

**What Git reads in the operator's clone, disclosed.** To serve the copy,
Git reads the operator's clone's configuration, its references and its
object store, including the stored bytes of delta bases outside the pinned
commit's objects. Syzygy uses nothing Git read but the copy. The question,
the run record and every page say so. This replaces ruling 1's arrangement,
in which Syzygy itself decompressed delta bases.

**Hooks and configuration that could run code.** [Observed, 2026-11-10, Git
2.53.0, a scratch fixture under `/home/orca/.tmp/`, outside the repository,
with no network.] With the environment above:

- the fetch of an unadvertised commit by full identifier over `file://`
  worked, and the copy held one commit and the form above;
- a `pre-upload-pack`-style hook in the source's hooks directory, a
  repository-level `uploadpack.packObjectsHook` and `core.fsmonitor` set to
  commands in the source's configuration did not run;
- an unknown identifier was refused ("not our ref");
- a blobless partial source with lazy fetching disabled failed the fetch;
- a source made with `git clone --shared` was served through its alternates.
  That is why an alternates file is refused before any Git process starts.

[Inferred] Git's serving side reads the source's own configuration, so a
setting there could change how it serves; Git ignores
`uploadpack.packObjectsHook` from a repository's own configuration by
design, and the hooks directory is not consulted by the serving side of a
local fetch. Whether command-line configuration reaches the serving process
is version behaviour. The residual is stated in the run record, labelled
Inferred: Syzygy relies on Git starting no program that the operator's
clone's configuration or hooks name while it serves the copy.

**Refusals.** A clone that lacks the pinned commit or an object reachable
from it, including a partial clone's missing object, fails the copy, and
Syzygy refuses with the reason and fetches nothing elsewhere.

**Object format.** Round 4 note 7 found that a SHA-256 clone failed the
copy: the copy's empty repository had the default object format, and the
one-commit form refused the settings a SHA-256 repository needs. The owner
left "Refuse SHA-256 clones" unticked on 2026-11-10. So the copy's empty
repository is made with the object format the operator's clone's
configuration records (`extensions.objectFormat`, read as text in every
launch-consented run, since it is a configuration key and not content, and
so before the run's class is decided; round 11 note 4), SHA-1 where it
records none, and the one-commit form the
copy is checked against includes the repository format version and the
object-format setting that format needs. No clone is refused for its object
format, as the signed entry, which admits SHA-256 objects, allows.
[Observed, Git 2.53.0, scratch fixture under the session's temporary
directory, removed afterwards] A two-commit repository made with
`--object-format=sha256` had 64-hex object names; a depth-one fetch of its
tip over `file://` into an empty repository made with `--template=` and
`--object-format=sha256` exited 0, the detached checkout exited 0, HEAD
equalled the named identifier, the copy held one commit with one shallow
line, and its configuration had `core.repositoryformatversion=1` and
`extensions.objectformat=sha256`. The same fetch into a SHA-1 copy exited
128 ("couldn't find remote ref") and left HEAD unborn. [Inferred] What the
implementation's form check must admit for a SHA-256 copy is those two
settings; `clone-shape.ts` is not changed by this package. A clone with
an alternates file, or with references in the reftable backend, is refused
before any Git process starts.

### D3. How "trunk tip" is chosen, and what Syzygy reads before the copy

**Decided:** REQ-047's rule stands (the remote's default, else `main`, else
`master`, else refuse), made exact for remote-tracking references:

- the remote's default is the commit the remote-tracking branch named by
  `refs/remotes/<remote>/HEAD` points to;
- the remote is `origin` when it records one, else the one remote that does;
  where several record one and none is `origin`, Syzygy refuses, naming
  `--revision`;
- `main` and `master` are the local `refs/heads/main` and `refs/heads/master`;
- while a remote default is recorded, no local branch is consulted. Where a
  local branch of that name points elsewhere, the launch output states both
  identifiers and that a local commit is not the trunk default.

**No Git process chooses the tip.** Syzygy reads the references as file
data, so no Git process runs in the operator's clone until the copy. Its own
reads of the operator's clone are a short closed list in REQ-047:

- the `.git` file or directory and the files that locate the Git directory
  and the common directory;
- reference names, and the values of `HEAD` and its target, the trunk-rule
  references, the local branch of the remote default's name and the
  `--revision` reference, from loose reference files and `packed-refs`
  (other values in `packed-refs` are read with it and used for nothing);
- the configuration file, as text, for remote names and URLs, never
  honoured;
- whether `objects/info/alternates` exists;
- for an abbreviated `--revision` only, the identifiers in loose object file
  names and pack indexes.

For a copy-class run, Syzygy itself reads no object of the
operator's clone. Its object reads, including the pinned commit object the
question needs, are made in the copy under the signed rules. The
governance-home check REQ-046 makes before asking is a comparison of the
operator's clone's paths (working tree, Git directory, common Git
directory) with the governance home's, not an object read, and it concerns
the operator's clone (round 4 note 5). A no-copy run keeps the
object reads REQ-033 and REQ-046 state, in the operator's clone, as v1.1
does.

**`--revision`.** An abbreviation is ambiguous when more than one
identifier in the operator's clone begins with it, decided from names alone.
A non-commit is refused, and never pinned, followed, or used beyond the
copy step and its refusal. Syzygy tells
the cases apart without reading the object itself (round 5 finding 2;
round 6 finding 1): a checkout that succeeds but leaves the copy's `HEAD`
at another object than the named identifier shows a non-commit, refused
naming `--revision` or the reference; a checkout that fails is refused
naming the failure and stating only that the object was not shown to be a
commit, since a real commit can fail it too ([Observed, round 6] a commit
with a root entry named `.GIT` fails with "invalid path"). Every other Git
failure for the copy is named as Git reported it, never with an unobserved
cause. Under the stage rule, a run that did not reach commit pinned states
that the commit was not pinned and its committer date is Unknown, and a
run that named no identifier states that none was named. [Observed, 2026-11-10, Git
2.53.0, scratch fixture with the stated environment] Fetching by a commit
identifier checks out with `HEAD` at it; a tree or a blob identifier fetches
with exit 0 and the checkout fails with exit 128; an annotated tag's
identifier fetches the tag and its commit, and the checkout leaves `HEAD` at
the commit, not the named identifier. Syzygy compares `HEAD`, a file of the
copy's Git directory that the form check already reads, so no object, blob
or otherwise, is read by Syzygy for the refusal. What Git reads of the
object to fetch or check it out is the copy step's. The earlier pre-answer
"type read" is gone.

**Why the copy precedes the question, and what that costs.** The question
needs the pinned commit's date and the tree listing, which are object
reads. Made in the operator's clone, they bring back the in-place reads and
delta bases the redesign removes. Made in the copy, they are the signed
reads. The cost: before the answer, the copy holds the pinned tree's blobs,
checked-out files included. Syzygy reads none of them as content before the
answer, the question says so, and a decline removes the copy.

**Why the rule:** the owner's standing rule, "Revision should always default
to latest trunk commit (eg main/master)". The latest trunk commit a clone
knows is its remote-tracking branch, as of the operator's last fetch; that
it is the upstream's latest stays Inferred, and the printed update command
is the operator's way to refresh it. [Observed] The implemented rule
(`packages/polaris-dossier/src/launch-revision.ts`) already reads it this
way.

### D4. The operator's checkout

**Decided:** for a copy-class run, the operator's HEAD, branch,
detached state, index and uncommitted changes do not matter. The copy is
checked out at the pinned revision, so none of them reaches a check, a
quotation, a page or an agent session. The v1.1 refusal of a HEAD elsewhere
stays for the no-copy run.

**Why:** the drafts reviewed in rounds 1 to 3 had to disclose that the
working tree was not inspected and might differ. The copy removes that residual for every copy-class run whose copy step
started.

### D5. The agent sessions' reach

**Decided:** every brief Syzygy issues to an agent session of a copy-class
run, the authoring brief and the inventory brief, names the copy as the
clone to work in and tells the session not to read the operator's clone. A
review packet carries exactly REQ-polaris-generation-035's contents, with
nothing added for the copy: that requirement's packet list is closed ("a
review packet containing only …"), and this change does not displace it.
Round 12 found the earlier text, which put the duty on packets too, in
conflict with it; the owner chose "Briefs only (Recommended)" on
2026-11-10. A session's
compliance is its own report, labelled Inferred. The question, the run
record and every page say that the authoring and inventory sessions are, or
were, directed, by their briefs, to work in the copy while the operator's
clone stays on the host (round 13, note 3); review sessions are confined to
their packets by REQ-polaris-generation-035 and are directed to no clone.

**The owner's ruling, and what it changes.** On 2026-11-09 the owner
declined a pinned-tree copy for the agents and chose "Disclose only". On
2026-11-10 the owner chose the copy as part of the redesign. This version
follows the later selection. The trade-off that remains: the operator's
clone is still on the same host, so a session that ignores its brief can
read history. The copy bounds what the session is given, not what it can
reach.

### D6. The locator forms admitted

**Decided.** Two populations, kept apart.

**URLs the operator gives** (`--url` or the upstream option) must be in one
of the admitted forms, the schemes REQ-046's v1.1 derivation normalises:

- `https://host[:port]/path`, `http://host[:port]/path` or
  `git://host[:port]/path`;
- `ssh://[user@]host[:port]/path`;
- the scp form `[user@]host:path`, where the host holds no `/` and the path
  does not begin with `//`.

An `https://`, `http://` or `git://` URL with any user information, a bare
user name included, and any URL whose user information holds a `:`, is
refused. An ssh or scp user name alone is admitted. A refused URL names the
rule it fails and is never printed, stored or recorded.

**URLs read from the clone's remotes** are remote locators when they are in
an admitted form once their user information is removed. REQ-046's v1.1
derivation normalises all of these unchanged. Their user information,
whatever it holds, is removed before anything is derived. Where it was
present, the launch output says so without printing it, and nothing records
it. A remote in no remote-locator form derives nothing, as for a clone with
no remote, and its URL is never printed, stored or recorded: the launch
output names the remote and the rule its URL fails (round 1 note 9; a URL
such as `https://host/a/b?private_token=…` is not a locator and may carry a
secret outside its user information).

**Neither population:**

- `file://` and every other transport;
- a local path;
- a query or a fragment;
- percent-encoding in the user information or the host.

Syzygy makes no network request for a locator and applies no rewrite from
Git or SSH configuration. An SSH host alias is the host it names.

**The owner's ruling.** The first draft narrowed REQ-046 so that `http://`
and `git://` remotes derived nothing. The owner selected:

> Keep proposing for http/git — Derive identities from http:// and git:// remotes too, as REQ-046 normalises today.

So the remote derivation keeps its v1.1 bytes.

**Typed `http://` and `git://` URLs: admitted, as v1.1 admits them.** The
draft reviewed in round 1 refused them, reading the ruling as about remotes
only. [Observed] Round 1 (finding 5) showed that v1.1 also normalises the
operator's typed upstream ("they are normalised the same way"), with `http`
and `git` among the schemes removed, so that refusal narrowed v1.1 in a way
no owner question put.

[Inferred — the coordinating session's reading, made in that session on
2026-11-09, not the owner's words.] The coordinating session reads "Keep
proposing for http/git" as a preference against narrowing v1.1, and
directed that typed `http://` and `git://` stay admitted, credentials still
refused. This version follows that direction. [Observed] On 2026-11-10 the
owner selected "Keep http/git URLs", accepting it as drafted.

**What the owner's first answer covers.** "Any https or ssh git URL" adds
every host over `https` and `ssh`. It does not, on this reading, remove the
`http` and `git` forms v1.1 already admitted for a typed upstream.

**Credentials:** refused when typed, stripped and disclosed when found in a
remote, as the ruling's brief asks. An `http://` or `git://` URL sends no
credential the operator typed, since none is admitted.

### D7. The normalisation rule and the identity form

**Decided: two segments for every host,** the owner's ruling:

> Two segments for every host — `repository:<owner>-<repo>` everywhere. Simpler, but a same-named repo on two hosts would share consent records.

- **The derivation is unchanged.** REQ-046's derivation keeps its v1.1
  bytes. The identity is `repository:` followed by the last two segments of
  the normalised path, joined by `-`. This version adds only a stated
  reading and a floor.
- **The reading:** the rule applies to every host, so the host and every
  earlier path segment take no part in the identity. A GitLab subgroup path
  `group/sub/project` proposes `repository:sub-project`, and
  `git@git.example.org:team/sub/tool.git` proposes `repository:sub-tool`.
- **The floor:** a normalised path of fewer than two segments derives no
  identity, and the operator gives the identity option.
- **The locator:** the normalised URL, the whole `host/path`, is what launch
  records, the run record and every page carry, for every host.

**The shared-records consequence, plainly.** Two repositories derive one
identity when their last two segments agree, whether on one host or on two:

- `github.com/a/b` and `gitlab.com/a/b`;
- `group1/sub/project` and `group2/sub/project` on one host;
- `a-b/c` and `a/b-c` after joining.

Absent the identity option, the second repository to be launched is
proposed the first one's identity. It matches the first one's records by
identity, and on a confirmed answer it relies on the first one's drawer
statement and agent-provider statements. That includes a provider statement
the owner made for a different repository. The question names each matching
record and how it matched, and the residual is disclosed. Avoiding the share
takes the owner seeing it in the question and giving another identity.

An observation consent names revisions, so it covers only the commits it
names and does not carry across. Launch observation consents still match by
identity, by URL or by revision. Since a different repository is at
different commits, its consent is a new record under the shared identity.

**How this interacts with the match by `Upstream:`.** [Observed, round 1
finding 2] The draft reviewed in round 1 said a consent made by another act
"is found" by its `Upstream:` URL and "never found for a same-named repository
on another host", but never said what being found does, and that absolute
contradicted REQ-047's first branch (a HEAD any in-force consent names is
pinned, whatever its identity) and REQ-046's identity match. This version
states the effect and bounds the claim:

- **The effect.** An observation consent made by another act records no
  normalised URL, so v1.1's URL match could never reach it. Under this
  version it also matches the run by URL when its `Upstream:` URL,
  normalised by the same rule, equals the derived URL: the host and the
  whole path. It is then a matching record like any other, counted in the
  identity proposal and the record list and named in the question with how
  it matched. Where it names the pinned revision, the run holds it, and no
  new observation consent is asked for.
- **Adds, never restricts.** The URL match adds to REQ-046's matching and
  never removes a match: a record may still match by identity, or by naming
  the pinned revision or a parent, and REQ-047's revision branch is
  unchanged.
- **The bounded claim.** By URL alone, a consent is never matched for a
  same-named repository on another host or under another group.

So a `gitlab.com/redis/redis` launch is proposed `repository:redis-redis`.
The redis consent does not match it by URL. It matches by identity and is
named so, and where a run without `--revision` finds the clone's HEAD at a
commit that consent names, REQ-047 pins that HEAD under it, as v1.1 does. The share above therefore comes
through the identity match, and REQ-046 already makes that match visible.

**Port and case (round 1 note 10, ruled 2026-11-10).** [Inferred] The
unchanged normalisation removes any port and case-folds the host and the
path. So two servers on one host at different ports, or two repositories on
a case-sensitive host that differ only in case, share one normalised URL:
each matches the other's records by URL, and they share an identity. The
owner accepted this as drafted ("Port/case merge", 2026-11-10). This version
does not change the derivation and discloses the merge as a fourth residual
beside the record list, labelled Inferred, for both run classes.

**Compatibility:** every identity in force is derived by the same bytes as
before, so redis, requests and Syzygy's own records still read and still
match.

### D8. Visibility on other hosts

**Decided:** whether a repository is public stays the operator's
declaration alone, for every host and form. Syzygy infers nothing from the
host, the scheme, a user name or whether the clone needed a credential. It
makes no request to learn visibility, and the question suggests no answer.
A repository not declared public is not public under the effective
screening policy.

**Why:** the owner's words, "the launch consent and visibility rules still
apply". Syzygy makes no network request, so it cannot learn a host's
visibility. An ssh URL is no evidence either way: public GitHub repositories
are routinely cloned over ssh.

### D9. Signed policies, the write act and the registry entry

**Decided: no escalation is needed for the policies or the write act; the
registry entry needs one (below).**

- **Screening scope v8**, selected and held, plus the installed policy.
  [Observed] Neither names a host, a scheme or a `github:` identity (sweep
  above). v8 reads publicness from the launch record's declaration, "It is
  public only when that answer is affirmative", or from the redis act's
  form, and from nothing else. The `github_pat_` detector is a secret
  pattern.
- **The performed write consent.** [Observed] It names only the observing
  project's own identity, `repository:tzeusy-org-syzygy`, derived from
  `github.com/tzeusy-org/syzygy` by the unchanged rule. Its scope is the
  dedicated reference and the location in Syzygy's own tree, and it says
  nothing about observed repositories' hosts.

**The registry entry conflicts with the copy. Flagged for the owner.**
[Observed] The installed source-acquisition registry entry for the
local-agent mode
(`.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`)
has these `typedAuthority` fields, each read against the redesign
[Inferred, field by field; round 4 finding 3]:

| Field | What it says | Under v1.2 |
|---|---|---|
| `fetch` | "none: Syzygy fetches nothing. The operator prepares the clone with their own tools" | **Contradicted.** Syzygy runs a local `git fetch` and prepares the copy itself. |
| `readAuthority` | objects "are read in process from the loose objects and version-2 packs of the operator's clone's .git directory; no ref, … shallow file … is read, and no process is started" | **Contradicted.** Syzygy starts Git processes, and its object reads are made in the copy, not in the operator's clone. The copy holds a `shallow` file, which Syzygy's form check reads, as it reads the redis clone's today. |
| `stateDirectoryWrites` | "Syzygy's own state directory for the run, outside the clone and never at a location derived from the clone's path; nothing is written to the clone, the observed repository, its forks or its tracker" | **Contradicted.** Syzygy writes the copy before the run's state directory exists, in a directory outside it, and the copy is the run's clone, which Syzygy fetches into, checks out and keeps after the run. |
| `tags` | "never read; the pinned identifier must name a commit object, and any other type refuses" | **Arguably contradicted.** A `--revision` naming an annotated tag brings the tag object into the copy, written by Git; Syzygy refuses it from the copy's `HEAD` without reading it. What is new is that a tag object is written into a clone Syzygy made. |
| `writeSurface` | `[]` | **Arguably contradicted,** with `stateDirectoryWrites`: the copy is a repository Syzygy writes outside the run's state directory and keeps. If the field names only writes to observed or external systems, as its sibling `databaseAccess` suggests, it is not; the successor should say which. |
| `authorityType`, `questions` | "version-control"; "What does this exact commit contain?" | Not contradicted: the copy is version-control data, and the question asked of it is the same one commit. |
| `databaseAccess` | `[]` | Not contradicted: no database is read or written. |
| `networkAccess`, `executeObservedCode`, `workingTreeRead`, `submodules` | none; false; false; a gitlink is never followed | Not contradicted: no network request, no hook or observed program runs (D2), Syzygy reads no working tree, and the copy is fetched with no submodules. |

**What is carried from v1.1, not new.** v1.1, as signed, already reads the
operator's clone's references before the answer and derives the identity
from its remote URLs. The entry's "no ref … repository-local configuration
… is read" sits inside `readAuthority`, the adapter's object reads, and
v1.1's references and URL reads are REQ-046's launch reads, not the
adapter's object reads. That reading is carried unchanged: it is the one
v1.0 and v1.1 rest on, and this version neither withdraws nor widens it in
kind. The reads v1.2 adds in the same class (the trunk-rule references, the
local branch of the remote default's name, `packed-refs`, the existence of
the alternates file, and loose object names and pack indexes for an
abbreviation) are launch reads too. The no-copy run keeps the
same reading. An earlier draft of this section listed the reference and URL
reads as the redesign's conflicts; they are not.

**What follows.** [Inferred] No reading of "fetches nothing", "no process
is started" or "nothing is written to the clone" admits the copy. So this
version cannot take effect under the entry as signed. It needs an
owner-signed successor version of the entry that admits:

- the copy step and its Git environment (`fetch`, `readAuthority`);
- object reads from the copy (`readAuthority`);
- the copy's directory as a write outside the run's state directory, made
  before it, and kept after the run (`stateDirectoryWrites`, and
  `writeSurface` if it reaches that write);
- an annotated tag object brought into the copy by Git, which Syzygy
  refuses from the copy's `HEAD` without reading it (`tags`);

and that says in words that the launch reads are not the adapter's object
reads. That successor is its own question for the owner. This package does
not draft it.

The delta-base reading that earlier drafts asked a reviewer to test is
withdrawn with the in-place design. The fetch-form reading of version 1.0's
design §5 still governs the no-copy run.

## What does not change

- These keep their bytes:
  - REQ-polaris-generation-033 to 036, 040 and every other requirement;
  - REQ-046's identity derivation;
  - the local-agent mode's specification;
  - the screening policy (installed v7 and held v8);
  - the write consent;
  - the registry entry, which D9 says needs a successor before this
    version can take effect;
  - the redis consent and every record.
- The signed read rules: from the copy on, every read, re-hash, HEAD check
  and refusal REQ-033 to 036 state applies to the copy unchanged.
- A run whose pinned revision another act's consent names, and which needs
  no launch consent record, keeps every predecessor requirement's bytes and
  meaning and is a no-copy run, as the preamble says, and the clone form its
  consent states binds it.
- A launch observation consent recorded under version 1.1 is relied on as
  it was recorded, except that its runs are copy-class runs and the run
  record states that the copy goes beyond its "no fetch by Syzygy" wording
  (D1, owner ruling of 2026-11-10).
- A run that asks REQ-046's question gains one thing beyond the copy: a
  consent made by another act now also matches it by its normalised
  `Upstream:` URL (D7). That adds a match and removes none, and REQ-047's
  revision branch is unchanged.
- Also unchanged:
  - the phrase and the records' fields, save that the launch observation
    consent's recorded scope now says the commit is held in the copy;
  - the dedicated reference and the write rules, read as also permitting the
    copy's directory;
  - the trunk default for clones without remote-tracking references;
  - the URL half: D6, D7 and D8, and the owner's http and git ruling.

## Exact blocks

Each block is the exact text of the paragraphs the patch changes, current
then proposed, with the paragraphs split at blank lines, the same split the
patch's hunks follow. A paragraph the patch inserts has no current text; the
paragraph it follows is named. The blocks were generated by script from the
installed and the patched bytes.

### Change 1 (replace), in "head"

**Current:**

~~~~text
Candidate exact behavioral delta; not adopted, binds nothing. This change applies to the existing polaris-generation capability. It adds two requirements to the operator-agent mode of REQ-polaris-generation-033 to 036: the consents and statements a run needs are asked for, answered by the owner and recorded when the run starts (046), and a run that no existing consent covers pins the repository's trunk tip (047). It edits no byte of any predecessor requirement or scenario. For a launch-consented run, meaning a run that relies on or records any launch consent record (an observation consent, a drawer statement or a provider statement recorded at launch), it reads, and in one place displaces, the predecessor text each requirement names, and only that text. A run whose clone's HEAD is a revision that an in-force observation consent made by any other act names, and that neither relies on nor records a launch consent record, keeps every predecessor requirement's bytes and meaning. It grants no consent itself: every consent and statement it describes is the owner's answer, recorded as its own act.
~~~~

**Proposed:**

~~~~text
Candidate exact behavioral delta; not adopted, binds nothing. This change applies to the existing polaris-generation capability. It adds two requirements to the operator-agent mode of REQ-polaris-generation-033 to 036: the consents and statements a run needs are asked for, answered by the owner and recorded when the run starts (046), and a run that no existing consent covers pins the repository's trunk tip (047). It edits no byte of any predecessor requirement or scenario. Runs in that mode fall into two classes, decided at launch. A run whose pinned revision an in-force observation consent made by any other act names, and for which the in-force records other than launch consent records already hold every consent and statement REQ-polaris-generation-033 requires, so that it asks no question and neither relies on nor records a launch consent record (an observation consent, a drawer statement or a provider statement recorded at launch), keeps every predecessor requirement's bytes and meaning. Every other run is a launch-consented run, whether it then relies on or records a launch consent record or ends before either; for it, this change reads, and in one place displaces, the predecessor text each requirement names, and only that text. It grants no consent itself: every consent and statement it describes is the owner's answer, recorded as its own act.
~~~~

### Change 2 (replace), in "Launch-time consent"

**Current:**

~~~~text
In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent and statement REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing ones at that moment, before it reads any blob of the repository and before it issues a brief. Before the answer Syzygy SHALL read only what the question needs, and SHALL read it as Git objects by object identifier: the clone's references; the pinned commit object, of which it SHALL use only the root tree identifier, the parent identifiers and the committer date, never the message or any author or committer identity; and the tree objects reachable from that root tree, of which it SHALL use only entry names, modes and object identifiers. It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and, after a confirmed answer, the launch consent records. From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path listing exposes, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the effective classification policy's classification as it would apply once an observation consent admits the repository, computed while the policy's scope that admits sources by observation consent (today its public-source scope) admits no repository for it. The preview label describes only how the classes were computed before the answer; it does not make the owner's answer, or a provider statement naming those classes, provisional. The question, the launch output and every record that names them SHALL label them a preview, and a confirmed answer SHALL NOT be read as the policy having admitted the repository before the answer.

Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

**Proposed:**

~~~~text
In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent and statement REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing ones at that moment, before it reads any blob of the repository and before it issues a brief. Before the answer Syzygy SHALL read of the clones only what the question needs, and only these: of the operator's clone, the reads REQ-polaris-generation-047 lists; of the copy that a copy-class run's copy step makes, as REQ-polaris-generation-047 defines those terms, the files of its Git directory that the copy's form check reads; and, as Git objects by object identifier in the run's clone, which in a copy-class run is the copy once its copy step has started and in a no-copy run is the operator's clone, the commit object the named identifier names, in a copy-class run only once the commit is pinned, of which it SHALL use only the root tree identifier, the parent identifiers and the committer date, never the message or any author or committer identity; and the tree objects reachable from that root tree, of which it SHALL use only entry names, modes and object identifiers. It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output, the run record, as the statements this change requires of it, and every page, as the run record's statements, and the artifacts REQ-polaris-generation-033 requires to name the pinned revision, as that revision, and, after a confirmed answer, the launch consent records. These rules bind every read Syzygy itself makes, in process, of either clone. The reads made by the Git processes of the copy step, in the operator's clone and in the copy, are not Syzygy's reads under this requirement: REQ-polaris-generation-047's copy rules alone govern them, and Syzygy SHALL use nothing they read but the copy they produce. From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path listing exposes, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the effective classification policy's classification as it would apply once an observation consent admits the repository, computed while the policy's scope that admits sources by observation consent (today its public-source scope) admits no repository for it. The preview label describes only how the classes were computed before the answer; it does not make the owner's answer, or a provider statement naming those classes, provisional. The question, the launch output and every record that names them SHALL label them a preview, and a confirmed answer SHALL NOT be read as the policy having admitted the repository before the answer.

Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names (stage: question asked; both classes); for a copy-class run, whose copy is made before the question, that the run's clone is a copy of the pinned commit alone, which Syzygy made from the operator's clone with Git over the local file transport and no network request, that Git read the operator's clone's configuration, references and object store, the stored bytes of delta bases outside the pinned commit's objects included, to make it, that Syzygy used nothing Git read but the copy it produced and itself read of the operator's clone only the references, remote names and URLs and other files REQ-polaris-generation-047 lists, and that the authoring and inventory sessions are directed, by their briefs, to work in the copy (stage: question asked; copy-class) while the operator's clone stays on the host, so that a session's staying in the copy is its own report; and that the copy, its checked-out files included, was made before the answer, that Syzygy has read none of its blobs, and that it is removed if the run ends before its brief and is otherwise kept after the run, at a location the launch output names, until the operator removes it; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

### Change 3 (replace), in "Launch-time consent"

**Current:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments (`x/sub/name` and `y/sub/name`) derive one identity and, absent another match, share its records.

A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, held in the operator's own clone, with no fetch by Syzygy; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator's declaration whether the repository is public, and their Inferred labels. Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) and preserving the exact owner phrase. While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelated)` with its A1 audit-record identity explicitly absent; once one is in force, the question SHALL ask the owner to select the state explicitly (RFC3-16(c)(1)), and Syzygy SHALL refuse to record without a selection. Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the operator's declaration above.
~~~~

**Proposed:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The rule takes the last two path segments for every host, so the host and every earlier path segment (a group above a subgroup, for example) take no part in the identity; a normalised path of fewer than two segments derives no identity, and the operator SHALL give the identity option. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Four residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments, on one host or on two (`x/sub/name` and `y/sub/name`, or `github.com/a/b` and `gitlab.com/a/b`), or differ only in characters the rule replaces by or joins with `-` (`a-b/c` and `a/b-c`), derive one identity and, absent another match, share its records: a record made for either matches the other by identity, so the question names it and how it matched, and a confirmed answer under that identity relies on its drawer and provider statements, while an observation consent, which names revisions, covers only the commits it names; and two repositories whose URLs differ only in a port, which normalisation drops, or only in letter case, which it lowercases, get one normalised URL and one identity, so each matches the other's records by URL as well as by identity and, absent another identity, relies on its drawer and provider statements.

A URL the operator gives as a locator (`--url` or the upstream option) SHALL be in one of the admitted locator forms, the schemes the derivation above normalises: `https://`, `http://` or `git://` followed by a host, an optional port and a path; `ssh://` followed by an optional user name and `@`, a host, an optional port and a path; or the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`. An operator-given URL carries no credentials: an `https://`, `http://` or `git://` URL carrying any user information, and any URL whose user information holds a `:`, is not admitted; an `ssh://` or scp-form user name alone is admitted. A URL Syzygy reads from the clone's remote configuration is a remote locator when it is in an admitted locator form once its user information, whatever it holds, is removed, and that user information is removed before anything is derived from it. A URL carrying a query or a fragment, or a percent-encoded character in its user information or host, a URL of any other scheme or transport (`file` and every other transport Git accepts), and a local path are neither admitted nor remote locators. Syzygy SHALL refuse an operator-given URL that is not admitted, naming the rule it fails, and SHALL NOT print, store or record that URL. A remote URL that is not a remote locator derives nothing, as for a clone with no remote, and Syzygy SHALL NOT print, store or record it: the launch output SHALL name the remote and the rule its URL fails, never the URL. Where a remote URL carried user information, the launch output SHALL say so, and Syzygy SHALL NOT print, store or record that user information. Syzygy SHALL make no network request to resolve, check or reach a locator, and SHALL apply no rewriting of it from Git or SSH configuration (a URL rewrite rule or an SSH host alias), so an alias is the host it names. The normalised URL is the locator every launch consent record, the run record and every page carry, for every host. An observation consent made by any other act, which records no normalised URL, also matches the run by URL, as an existing record above, when its `Upstream:` URL, normalised by the same rule, equals the derived URL, host and whole path; it is then a matching record for the identity proposal and the record list, named in the question with how it matched, and where it names the pinned revision it is an in-force consent the run holds, so the question asks for no new observation consent. This match adds to the matching above and never restricts it, nor the revision branch of REQ-polaris-generation-047: a record that does not match by URL may still match by identity or by naming the pinned revision or a parent, and a HEAD that any in-force consent names is pinned as that requirement states. By URL alone, a consent is never matched for a same-named repository on another host or under another group.

Whether the repository is public is the operator's declaration alone, for every host and form. Syzygy SHALL NOT infer it from the host, the scheme, a user name or whether the operator's clone needed a credential, SHALL make no request to learn it, and the question SHALL NOT suggest an answer. A repository that the operator does not declare public is not public under the effective screening policy, whatever its host.

A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, held in the copy that REQ-polaris-generation-047 makes from the operator's own clone, with no network request by Syzygy; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator's declaration whether the repository is public, and their Inferred labels. Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) and preserving the exact owner phrase. While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelated)` with its A1 audit-record identity explicitly absent; once one is in force, the question SHALL ask the owner to select the state explicitly (RFC3-16(c)(1)), and Syzygy SHALL refuse to record without a selection. Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the operator's declaration above.
~~~~

### Change 4 (replace), in "Launch-time consent"

**Current:**

~~~~text
Observing the observing project's own repository is permitted. Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL refuse the run before asking, and SHALL print the one command that makes a separate clone with its own Git directory, checked out at the pinned revision.
~~~~

**Proposed:**

~~~~text
Observing the observing project's own repository is permitted. Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL refuse the run before asking, and SHALL print the one command that makes a separate clone with its own Git directory, checked out at the named identifier where one was named, and otherwise naming `--revision`.
~~~~

### Change 5 (replace), in "Launch-time consent"

**Current:**

~~~~text
For a launch-consented run, this requirement displaces exactly this predecessor text: in REQ-polaris-generation-033, the words "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path", read as permitting, besides the run's state directory, the launch consent records and their recording commit on the dedicated reference, and only those, written before the run's state directory is created; the rest of that sentence, and the prohibition on writing to a location derived from the clone's path, are unchanged. It reads, and does not change: REQ-polaris-generation-033's requirement that the clone's HEAD equal a revision the in-force observation consent names, which a launch consent record meets by naming the pinned revision; its per-project statement and its drawer condition, which launch consent records provide; and its rule that every record Syzygy reads for its gates lies within the agent sessions' write reach and is disclosed so, which applies to the launch consent records as to every other.

The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity and its recording commit; the repository identity, its normalised URL, their source and their Inferred label; the operator's declaration whether the repository is public, labelled Inferred; how the identity was proposed and the identity residuals above; the pinned revision and how it was chosen; the drawer statement relied on, if any; that who answered rests on the operator's declaration, labelled Inferred; and, for the provider statement, the citation REQ-polaris-generation-033 requires, not restated.
~~~~

**Proposed:**

~~~~text
For a launch-consented run, this requirement displaces exactly this predecessor text: in REQ-polaris-generation-033, the words "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path", read as permitting, besides the run's state directory, the launch consent records and their recording commit on the dedicated reference, and only those, written before the run's state directory is created; the rest of that sentence, and the prohibition on writing to a location derived from the clone's path, are unchanged. For a copy-class run, every one of which is launch-consented, the same words are read as also permitting the copy its copy step makes, in a directory Syzygy creates for it and keeps or removes as that requirement states. That copy, its making, its keeping and its removal lie outside every statement of this requirement that Syzygy writes nothing, writes nothing outside the run's state directory, edits or removes no file, or changes no working tree, index or reference; REQ-polaris-generation-047 alone governs them. It reads, and does not change: REQ-polaris-generation-033's requirement that the clone's HEAD equal a revision the in-force observation consent names, which a launch consent record meets by naming the pinned revision; its per-project statement and its drawer condition, which launch consent records provide; and its rule that every record Syzygy reads for its gates lies within the agent sessions' write reach and is disclosed so, which applies to the launch consent records as to every other.

The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity and its recording commit, or that none was recorded; the repository identity, its normalised URL, their source and their Inferred label; the operator's declaration whether the repository is public, labelled Inferred, or that none was made; how the identity was proposed and the identity residuals above; under REQ-polaris-generation-047's stage rule, each with the stage it needs and the run class that requires it: for both classes, whether a question was asked (question asked); for a copy-class run, once its copy step started, how the copy was made and what Git and Syzygy read of the operator's clone to make it, as the question states them, the copy's location, and whether the copy was kept, until the operator removes it, or removed, and, for a no-copy run, that no copy was made; for a copy-class run, once a brief or packet was delivered, that the authoring and inventory sessions were directed, by their briefs, to work in the copy, and, for a no-copy run, once a brief or packet was delivered, that the run's clone, where the agent sessions are to work, is the operator's clone, that whether a session worked there is its own report, labelled Inferred, and that no copy was made; for both classes, once an identifier was named, the named identifier and how it was chosen, and, once the commit was pinned, that it is the pinned revision; and, for each such stage the run did not reach, that it was not reached; the drawer statement relied on, if any; that who answered rests on the operator's declaration, labelled Inferred; and, for the provider statement, the citation REQ-polaris-generation-033 requires, not restated.
~~~~

### Change 6 (replace), in "Launch-time consent"

**Current:**

~~~~text
- **WHEN** in-force records already hold the observation consent at the pinned revision and every statement the subject needs
- **THEN** Syzygy asks nothing, writes nothing, and names the records the run rests on
- **AND** the run record cites them as REQ-polaris-generation-033 requires
~~~~

**Proposed:**

~~~~text
- **WHEN** in-force records already hold the observation consent at the pinned revision and every statement the subject needs
- **THEN** Syzygy asks nothing, writes no record, and names the records the run rests on
- **AND** the run record cites them as REQ-polaris-generation-033 requires
~~~~

### Change 7 (insert), in "Launch-time consent"

**Current:**

(nothing: inserted after the paragraph that begins "- **WHEN** one record matches the run by URL and another by a parent commit, they carry different id")

**Proposed:**

~~~~text
#### Scenario: Locator on another host over ssh

- **WHEN** the clone's `origin` remote is `git@git.example.org:team/sub/tool.git` and no record matches the run
- **THEN** the question proposes the identity `repository:sub-tool` and the normalised URL `git.example.org/team/sub/tool`, each labelled Inferred
- **AND** a confirmed answer records that normalised URL, and the run record and every page carry it

#### Scenario: GitHub identities keep their form

- **WHEN** the clone's `origin` remote is `ssh://git@github.com/redis/redis.git` or `https://github.com/redis/redis`
- **THEN** the proposed identity is `repository:redis-redis` and the normalised URL `github.com/redis/redis`, as before this rule

#### Scenario: Same-named repository on two hosts

- **WHEN** an in-force record carries `repository:a-b` for `github.com/a/b`, and a clone of `gitlab.com/a/b`, at a commit that record does not name and whose parents it does not name, is launched with no identity option
- **THEN** the question proposes `repository:a-b`, names that record as matching by identity, and discloses the shared-identity residual
- **AND** an observation consent made by another act whose `Upstream:` is `github.com/a/b` does not match by URL, though where its subject identity is `repository:a-b` it matches by identity and is named so

#### Scenario: Consent found by its upstream URL

- **WHEN** an observation consent made by another act carries `repository:c-d` and the `Upstream:` URL `https://git.example.org/c/d.git`, names the pinned revision, and the clone's `origin` remote is `git@git.example.org:c/d`
- **THEN** that consent matches by URL, the question names it with how it matched and proposes `repository:c-d`, and no new observation consent is asked for

#### Scenario: Remote or given URL over http or git

- **WHEN** the clone's `origin` remote, or the upstream option the operator gives, is `git://git.example.org/a/b.git` or `http://git.example.org/a/b`
- **THEN** the question proposes `repository:a-b` and the normalised URL `git.example.org/a/b`, as before this rule

#### Scenario: Credentials in a given URL

- **WHEN** the operator gives `--url` or the upstream option as an `https://`, `http://` or `git://` URL with user information, a bare user name included, or any URL whose user information holds a `:`
- **THEN** Syzygy refuses before asking, naming the rule the URL fails, and the URL appears in no output, record or page

#### Scenario: Credentials in a remote URL

- **WHEN** the clone's `origin` remote URL carries user information on `https://` or `http://`
- **THEN** the user information is removed before the identity and URL are derived, the launch output says the remote URL carried user information without printing it, and it appears in no record or page

#### Scenario: Locator not admitted

- **WHEN** the operator gives a `file://` URL, a local path, or a URL with a query or fragment
- **THEN** Syzygy refuses before asking, naming the rule the URL fails, and makes no network request

#### Scenario: Remote URL that is not a locator

- **WHEN** the clone's `origin` remote URL carries a query, such as `https://git.example.org/a/b?private_token=x`
- **THEN** it derives nothing, the launch output names the remote and the rule its URL fails, and the URL appears in no output, record or page

#### Scenario: Visibility on another host

- **WHEN** the clone's remote is on a host other than `github.com` and the operator gives no declaration whether the repository is public
- **THEN** the question suggests no answer, Syzygy makes no request to learn the repository's visibility, and the repository is not public under the effective screening policy
~~~~

### Change 8 (replace), in "Launch-time consent"

**Current:**

~~~~text
- **WHEN** no in-force write consent for the observing project's own repository names launch consent records, the dedicated reference and their location
- **THEN** Syzygy asks nothing and refuses, naming the missing write consent
- **AND** writes nothing outside the run's state directory
~~~~

**Proposed:**

~~~~text
- **WHEN** no in-force write consent for the observing project's own repository names launch consent records, the dedicated reference and their location
- **THEN** Syzygy asks nothing and refuses, naming the missing write consent
- **AND** writes nothing outside the run's state directory, save the copy of a copy-class run whose copy step started, which it removes
~~~~

### Change 9 (replace), in "Launch-time consent"

**Current:**

~~~~text
- **WHEN** the clone's working tree, Git directory or common Git directory is the governance home's
- **THEN** Syzygy refuses before asking and prints the one command that makes a separate clone at the pinned revision
~~~~

**Proposed:**

~~~~text
- **WHEN** the clone's working tree, Git directory or common Git directory is the governance home's
- **THEN** Syzygy refuses before asking and prints the one command that makes a separate clone at the named identifier where one was named, and otherwise names `--revision`
~~~~

### Change 10 (replace), in "Launch-time consent"

**Current:**

~~~~text
- **Case:** Start operator-agent runs against controlled clones and fixture governance homes, varying independently: whether standard input is a terminal; the answer (exact phrase, other text, none, each record accepted or declined, each drawer answer, public declared, declined or not given); the tree's governed conditions and assigned classes; the clone's remotes and URLs; the identity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying one identity or several, including an in-force statement with and without covering classes; the write consent's presence, effect, reference and location; an A1 mechanism present or absent; whether the clone's working tree, Git directory or common Git directory is the governance home's; owner placements at and away from the pinned revision; and whether an execution choice was recorded.
- **Observable:** The question text, the phrase asked for, refusals and their reasons, the objects read before and after the answer, the commits on the dedicated reference and their trees, every other reference, working tree and index of the governance home before and after, each record's fields and bound digest, the brief's execution rule, withheld files, and the human and machine disclosures.
- **Oracle:** Expected questions, phrases, refusals, identities, record sets, field values and withheld files derived from the fixture homes, clones and placements by an independent `git` reading, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test. Object reads are captured by an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read, never by Syzygy's own record. Commits, references, working trees and indexes are compared by an independent listing before and after.
- **Falsifier:** A blob is read, or any commit field other than the root tree, parents and committer date is used, before a confirmed phrase or in-force records; anything from a pre-answer read is stored outside the question, launch output and records; the question omits any statement this requirement lists, including that only the owner may answer and the existing records with their states; a record is created without the exact phrase, without a terminal, without the write consent, without a declaration whether the repository is public, or, once an A1 mechanism is in force, without a state selection; one record carries two of observation consent, drawer statement and provider statement; a provider statement is created for a non-governed subject, or a second one for a subject and provider whose in-force statement covers the classes; a drawer statement is created on any answer but that none exists; a record names more than the pinned revision; a file is edited or removed, a working tree, index or reference other than the dedicated one changes, or the trunk tip moves; Syzygy pushes the dedicated reference; the proposed identity differs from the proposal rule, or is presented as Observed; a launch whose matching records carry more than one identity, with no identity option, is not refused before asking; the URL is recorded or rendered as the identity; the pre-answer classes are not labelled a preview; a matching revoked record is not named; a run on the governance home's working tree or Git directory is not refused; an in-force record set is not reused; a disclosure this requirement lists is missing from the run record or a page; a file a placement would have placed renders other than Unknown; for a repository the operator does not declare public, the answer is asked for before the question states that the repository identity and its normalised URL are recorded on the dedicated reference in the observing project's own repository, which Syzygy never pushes and one push of which would publish them, or the question asks for a confirmation of that statement or adds an answer, phrase or record field for it; an execution choice is asked for or recorded; or who answered is presented as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4]
  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033]
```
~~~~

**Proposed:**

~~~~text
- **Case:** Start operator-agent runs against controlled clones and fixture governance homes, varying independently: whether standard input is a terminal; the answer (exact phrase, other text, none, each record accepted or declined, each drawer answer, public declared, declined or not given); the tree's governed conditions and assigned classes; the clone's remotes and URLs, in each admitted and remote locator form and in forms neither admits, on `github.com` and other hosts, with paths of one, two and more segments, with and without user information; the identity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying one identity or several, including an in-force statement with and without covering classes; the write consent's presence, effect, reference and location; an A1 mechanism present or absent; whether the clone's working tree, Git directory or common Git directory is the governance home's; owner placements at and away from the pinned revision; whether the run is a copy-class run and, if so, the stage at which it is refused, before or after its copy step started, and the operator's clone's form; and whether an execution choice was recorded.
- **Observable:** The question text, the phrase asked for, refusals and their reasons, the objects read before and after the answer, the commits on the dedicated reference and their trees, every other reference, working tree and index of the governance home before and after, each record's fields and bound digest, the brief's execution rule, withheld files, and the human and machine disclosures.
- **Oracle:** Expected questions, phrases, refusals, identities, normalised URLs, record sets, field values and withheld files derived from the fixture homes, clones and placements by an independent `git` reading, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test. Object reads are captured by an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read, never by Syzygy's own record. Reads are attributed by process: that layer records the reads Syzygy makes in process, of the operator's clone and of the copy, and the Git processes of the copy step are captured by an independent process and file capture and checked only against REQ-polaris-generation-047's copy rules. Commits, references, working trees and indexes are compared by an independent listing before and after.
- **Falsifier:** Syzygy itself reads a blob, or uses any commit field other than the root tree, parents and committer date, before a confirmed phrase or in-force records; anything from a read Syzygy itself makes before the answer is stored outside the question, the launch output, the run record's required statements and every page, as the run record's statements, and the artifacts REQ-polaris-generation-033 requires to name the pinned revision, as that revision, and the launch consent records; before the answer Syzygy itself reads anything of a clone that the pre-answer list does not name; a statement REQ-polaris-generation-047's stage rule governs is missing from the question, the launch output, the run record or a page for a stage the run reached and a run class that requires it, or is stated for a stage it did not reach or for a run class that does not require it in place of the form that statement gives, or a stage it did not reach is not stated as not reached; a run that only a launch observation consent recorded with version 1.1's scope covers is refused because the operator's clone holds more than one commit, or history, branches, tags, stash or reflogs (the one-commit requirement version 1.1 carried), or its run record, once its copy step started, omits that the copy goes beyond that consent's wording; the question omits any statement this requirement lists, including that only the owner may answer and the existing records with their states; a record is created without the exact phrase, without a terminal, without the write consent, without a declaration whether the repository is public, or, once an A1 mechanism is in force, without a state selection; one record carries two of observation consent, drawer statement and provider statement; a provider statement is created for a non-governed subject, or a second one for a subject and provider whose in-force statement covers the classes; a drawer statement is created on any answer but that none exists; a record names more than the pinned revision; a file of the governance home or of the operator's clone is edited or removed, or a working tree, index or reference other than the dedicated one and those of a copy that a copy step makes changes, in either case other than by the making, keeping or removal of a copy that a copy step makes, or the trunk tip moves; Syzygy pushes the dedicated reference; the proposed identity differs from the proposal rule, or is presented as Observed; a launch whose matching records carry more than one identity, with no identity option, is not refused before asking; the URL is recorded or rendered as the identity; an operator-given URL not in an admitted form is admitted, a remote URL that is not a remote locator derives anything, or a URL carrying credentials, or its user information, is printed, stored or recorded; an identity is derived other than from the last two path segments, or from a path of fewer than two; Syzygy makes a network request for a locator or applies a rewriting of it from Git or SSH configuration; a remote URL that is not a remote locator is printed, stored or recorded; an observation consent made by another act matches by URL other than by its normalised `Upstream:` URL equalling the derived URL, or does not match when they are equal, or the URL match prevents a match by identity or revision, or the pin of a consented HEAD; visibility is inferred from the host, scheme, a user name or a credential, or the question suggests an answer; the pre-answer classes are not labelled a preview; a matching revoked record is not named; a run on the governance home's working tree or Git directory is not refused; an in-force record set is not reused; a disclosure this requirement lists is missing from the run record or a page; a file a placement would have placed renders other than Unknown; for a repository the operator does not declare public, the answer is asked for before the question states that the repository identity and its normalised URL are recorded on the dedicated reference in the observing project's own repository, which Syzygy never pushes and one push of which would publish them, or the question asks for a confirmation of that statement or adds an answer, phrase or record field for it; an execution choice is asked for or recorded; or who answered is presented as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [SEC-2, SEC-3, SEC-4, SEC-5, VIS-2, VIS-4]
  contracts: [RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2, OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09, POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05]
  topology: []
  parent_requirements: [REQ-polaris-generation-001, REQ-polaris-generation-025, REQ-polaris-generation-033]
```
~~~~

### Change 11 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.

Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator's clone holds at launch, and whether it is the upstream's latest commit is Inferred. The launch output and the run record SHALL state the pinned revision in full, the reference it came from, the commit's committer date as the commit object records it, and that Syzygy did not fetch; they SHALL print the operator's own command to update the clone before a later run.

Syzygy SHALL NOT change the clone's checkout. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.
~~~~

**Proposed:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else in how the revision of such a run is pinned. The full object identifier a run's pin rule gives, before any object is read, is the run's named identifier; it becomes the run's pinned revision, its pinned commit, only once it is shown to be a commit: in a copy-class run, when the copy's detached checkout leaves the copy's `HEAD` at the named identifier, and in a no-copy run, when Syzygy reads it as a commit object as REQ-polaris-generation-033 and REQ-polaris-generation-046 permit. Wherever this change says pinned revision or pinned commit, it means that commit, and a rule that acts before it is shown acts on the named identifier. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. The remote's default is the commit that the remote-tracking branch named by the symbolic reference `refs/remotes/<remote>/HEAD` points to, where the remote is `origin` when it records one, or else the one remote that records one; where several remotes record one and none is `origin`, the clone records no single remote default, and Syzygy SHALL refuse, naming `--revision`. `main` and `master` are the local branches `refs/heads/main` and `refs/heads/master`. While a remote default is recorded, no local branch is consulted for the pin: where a local branch of the same name points elsewhere, the launch output SHALL state both identifiers and that a local commit is not the trunk default. With `--revision`, the named identifier SHALL be the object the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no object identifier, or to more than one, SHALL be refused. An abbreviated identifier resolves to more than one when more than one object identifier the operator's clone names in its loose object file names and pack indexes begins with it. Where the named identifier names an object that is not a commit, an annotated tag included, the run is never pinned: Syzygy SHALL refuse, naming `--revision` where one was given and otherwise the reference the named identifier came from, and SHALL NOT follow that object to any object it names or use it beyond the copy step and that refusal. Syzygy tells these cases apart without reading the object itself, and SHALL NOT tell an object's type from a `packed-refs` peel line or any other reference data. Where the copy's detached checkout succeeds and leaves the copy's `HEAD` at an object other than the named identifier, the named object is not a commit, and Syzygy SHALL refuse as just stated. Where the detached checkout fails, Syzygy SHALL refuse, naming the named identifier, `--revision` where one was given, and the checkout's failure, and stating that the object was not shown to be a commit: it is either not a commit or a commit that could not be checked out, and the refusal SHALL NOT say which. Either refusal takes the place of the form check's refusal below for the same copy. What Git reads of that object to make or check out the copy is the copy step's, not Syzygy's.

Syzygy SHALL make no network request to choose or verify the revision: the trunk tip is the one the operator's clone holds at launch, and whether it is the upstream's latest commit is Inferred. The launch output and the run record SHALL make these statements under the stage rule below. Once an identifier is named (stage: identifier named; both classes), they SHALL state the named identifier in full, the reference it came from, or that `--revision` gave it, and that Syzygy made no network request, and SHALL print the operator's own command to update the clone before a later run. Once the commit is pinned (stage: commit pinned; both classes), they SHALL state its committer date as the commit object records it, which Syzygy reads as REQ-polaris-generation-046 permits; a run that did not reach that stage states that the commit was not pinned and that its committer date is Unknown, never a guess. Statements other requirements make on their own conditions, such as a remote URL's user information, are unaffected by the stage rule.

Syzygy SHALL NOT change the operator's clone: it SHALL NOT fetch into, prune, repack, check out in or write to it. Every run to which this requirement's pin rule gives a named identifier, the run its first sentence pins included, SHALL run on a copy unless its named identifier is named by an in-force observation consent made by another act. A run whose named identifier only an in-force launch observation consent names whose recorded scope holds that revision in the operator's own clone with no fetch by Syzygy, the scope version 1.1 of this change recorded, runs on a copy too: the copy goes beyond that consent's wording, and, once the copy step started (stage: copy step started; copy-class), the run record SHALL state that the copy goes beyond that consent's "no fetch by Syzygy" wording, which no other run states; that consent is otherwise relied on as it was recorded. A run that this rule requires to run on a copy is a copy-class run, and every other run with a named identifier is a no-copy run; which class a run is in is decided at launch, from the consents and the named identifier, before the copy step starts. A copy-class run's copy step is the creation of the copy's directory and the Git processes stated below, and the copy step has started once Syzygy has created that directory; a copy exists only in a copy-class run whose copy step has started.

A run reaches as many of these stages as it gets to: identifier named, once its pin rule has given a named identifier; copy step started, for a copy-class run; commit pinned, once the named identifier is shown to be a commit, which in a copy-class run is when the copy holds the commit; question asked, where a question is needed; and brief or packet delivered, once Syzygy has issued a brief or delivered a packet for the run. Each stage a run reaches comes after every earlier stage it needs: in a copy-class run the copy step before the commit is pinned, the commit pinned before any question, and a needed question before any brief or packet. Every statement this change requires of the question, the launch output, the run record or a page about the named identifier, the copy, the agent sessions, the pinned commit or the question names the stage it needs and the run class that requires it, copy-class, no-copy or both, and SHALL be made only for a run of that class that reached that stage. For each such stage the run did not reach, the run SHALL state, as what Syzygy did, that it was not reached: that no identifier was named, that no copy was made, that the commit was not pinned and its committer date is Unknown, that no question was asked, or that Syzygy issued no brief and delivered no packet; it SHALL NOT state the thing itself. A run of the class a statement does not name makes, in its place, the form that statement gives for that class, and a no-copy run's form of every copy statement is that no copy was made. Syzygy states nothing about whether an agent session started, received or read a brief or packet except as that session's own report, labelled Inferred. This is the stage rule.

The copy statements are the statements about the copy that REQ-polaris-generation-046 requires of the question, the run record and every page, and the launch output's statements below that the copy was removed, that it is kept and where, or that no copy was made; the stage rule governs each. A no-copy run's clone is the operator's own, as REQ-polaris-generation-033 and the consent that makes it a no-copy run state, any form that consent's record states for the clone binds it whether or not the run also relies on or records a launch consent record, and where the clone's HEAD is not the named identifier, Syzygy SHALL refuse before asking for consent and print the one command that checks out that revision. REQ-polaris-generation-033's rules for the pinned revision apply unchanged.

In a copy-class run, before the question, or before the brief where no question is asked, Syzygy SHALL make the copy as follows and in no other way; the creation of the copy's directory and the Git processes it starts to do so are the copy step. It SHALL create an empty directory of its own for the copy, never derived from the operator's clone's path, never inside any working tree of the governance home's repository, its linked worktrees included, nor inside its Git directory or common Git directory, and never inside the operator's clone's working tree or Git directory; a run for which Syzygy would create it in any of these SHALL be refused before its copy step starts, naming the reason. In that directory it SHALL make an empty repository with an empty template and with the object format the operator's clone's configuration records, SHA-1 where it records none, so that a SHA-1 clone and a SHA-256 clone are each copied; a clone is never refused for its object format, except that an object format Git does not support fails the copy's `init`, refused under the Git-failure rule. It SHALL fetch into that repository, from the operator's clone over Git's local file transport, the object the named identifier names alone, by its full object identifier, at a depth of one, with no tags and no submodules, and SHALL then check that object out detached. Every Git process it starts for the copy SHALL run with the system and global Git configuration disabled, with no other Git variable of the operator's environment, with every transport but the local file transport refused, with lazy fetching of missing objects disabled and with no hook path, so that no network request is made and no hook of the copy runs; these processes execute nothing of the observed repository and are not an execution choice. The file URL of the operator's clone is not a locator, and is never recorded or rendered as one. The operator's HEAD need not be the pinned revision, and the copy's HEAD is the pinned revision. The copy SHALL hold the pinned commit and the trees and blobs reachable from its root tree alone, in the form that one commit fetched alone into an empty repository of the same object format and checked out detached leaves, the repository format version and object-format setting that format needs included, and Syzygy SHALL check that form before the question and refuse a copy that departs from it. Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy, its directory included, where its copy step started, and the launch output SHALL say so, or, where the copy step never started, SHALL say that no copy was made. Otherwise the copy is the run's clone for the rest of the run and is kept after it, outside the run's state directory, until the operator removes it; the launch output SHALL name its location and say so.

To make the copy, Git reads the operator's clone: its configuration, which Git's serving side honours, its references, and its object store, the stored bytes of delta bases outside the named object's objects included. Syzygy uses nothing Git read but the copy it produced. For every launch-consented run, the reads Syzygy itself makes, in process, of the operator's clone SHALL be only these, and, for a no-copy run, the object reads REQ-polaris-generation-033 and REQ-polaris-generation-046 state and the files of its Git directory that the form check binding it reads: the check of the form another act's consent states, reading what that form needs, the whole configuration file and the pack indexes included, to which the configuration limit below yields:

- the `.git` file or directory and the files that locate the Git directory and the common Git directory;
- the names of its references, and the values of `HEAD` and the reference it names, of the references the trunk rule above names, of the local branch of the remote default's name and of the reference `--revision` names, each read as file data from the loose reference files and `packed-refs`, where reading `packed-refs` also reads the bytes of other references' values, which Syzygy SHALL use for nothing; a clone that stores its references otherwise (the reftable backend) SHALL be refused before any Git process starts;
- its configuration file, read as text only for its remotes' names and URLs and its object format (`extensions.objectFormat`), and never honoured;
- whether `objects/info/alternates` exists, and, in a copy-class run, a clone where it does SHALL be refused before the copy step starts;
- for an abbreviated `--revision` alone, the object identifiers its loose object file names and pack indexes give, at the width of the object format its configuration records (`extensions.objectFormat`, SHA-1 where it records none), a mismatch failing closed in the copy's fetch or, in a no-copy run, in REQ-polaris-generation-033's object read, each refused.

A clone that lacks the named object or an object reachable from it, a partial clone's missing object included, fails the copy, and Syzygy SHALL refuse, naming the reason, and fetch nothing from anywhere else. Every failure of a Git process for the copy SHALL be refused, naming that process and its failure as Git reported it; a refusal SHALL NOT state a cause, a missing object or a non-commit among them, that Syzygy has not observed. Once the copy step has started, the copy is the clone that REQ-polaris-generation-033 to 036 name and the run's clone REQ-polaris-generation-046 reads objects from, and every read, re-hash, HEAD check and refusal they state applies to it unchanged; REQ-polaris-generation-046's identity rule, its check of the governance home and its statement about the clone's configuration concern the operator's clone. Every brief Syzygy issues to an agent session of a copy-class run, the authoring brief and the inventory brief, SHALL name the copy as the clone to work in and tell the session not to read the operator's clone; that a session complied is its own report, labelled Inferred. A review packet of a copy-class run carries exactly the contents REQ-polaris-generation-035 lists, and nothing is added to it for the copy. Once a copy-class run's copy step started (stage: copy step started; copy-class), the run record SHALL state, labelled Inferred, that, for every Git process the copy step started, Syzygy relies on Git starting no program that the operator's clone's own configuration or hooks name while it serves the copy. Once a copy-class run's brief or packet was delivered, the run record SHALL state, labelled Inferred, that whether a session stayed in the copy is its own report; for a no-copy run, once a brief or packet was delivered, it states that the run's clone, where the agent sessions are to work, is the operator's clone, that whether a session worked there is its own report, labelled Inferred, and that no copy was made.
~~~~

### Change 12 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
- **WHEN** the clone's HEAD is a revision an in-force observation consent made by an earlier act names, the trunk tip is another commit, and no `--revision` is given
- **THEN** Syzygy pins HEAD exactly as REQ-polaris-generation-033 states, asks nothing, and does not refuse for the trunk tip
~~~~

**Proposed:**

~~~~text
- **WHEN** the clone's HEAD is a revision an in-force observation consent made by an earlier act other than a launch names, the trunk tip is another commit, and no `--revision` is given
- **THEN** Syzygy pins HEAD exactly as REQ-polaris-generation-033 states, the run is a no-copy run, Syzygy asks nothing, and does not refuse for the trunk tip
~~~~

### Change 13 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
- **WHEN** the operator starts a run with no `--revision` on a clone whose HEAD no in-force consent names, whose remote default branch is `main` and whose HEAD is the tip of `main`
- **THEN** Syzygy pins the commit `main` points to, and states it in full with its reference and committer date
- **AND** states that it did not fetch and prints the command to update the clone
~~~~

**Proposed:**

~~~~text
- **WHEN** the operator starts a run with no `--revision` on a clone whose HEAD no in-force consent names, whose remote default branch is `main` and whose HEAD is the tip of `main`
- **THEN** Syzygy pins the commit `main` points to, and states it in full with its reference and committer date
- **AND** states that it made no network request and prints the command to update the clone
~~~~

### Change 14 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
- **WHEN** the pinned revision is the trunk tip and the clone's HEAD is another commit that no in-force consent names
- **THEN** Syzygy refuses before asking for consent, changes nothing in the clone, and prints the command that checks out the pinned revision
~~~~

**Proposed:**

~~~~text
- **WHEN** the pinned revision is the trunk tip, which no in-force observation consent made by another act names, and the operator's clone's HEAD is another commit, on a branch with uncommitted changes
- **THEN** the run is a copy-class run, Syzygy makes the copy at the pinned revision and does not refuse, and the operator's checkout, branch and uncommitted changes are unchanged and absent from the copy

#### Scenario: HEAD elsewhere in a no-copy run

- **WHEN** `--revision` names a commit an in-force observation consent made by another act names, and the operator's clone's HEAD is another commit
- **THEN** the run is a no-copy run, and Syzygy refuses before asking for consent, changes nothing in the clone, and prints the command that checks out the named identifier

#### Scenario: Existing full clone at the trunk tip

- **WHEN** the operator starts a run with no `--revision` on a full clone with history, branches, tags, stash and reflogs, whose `refs/remotes/origin/HEAD` names `refs/remotes/origin/main` and whose trunk tip no in-force consent names
- **THEN** Syzygy pins the commit `refs/remotes/origin/main` points to, the run is a copy-class run, and Syzygy makes the copy before the question, one commit fetched at depth one over the local file transport, and does not refuse the operator's clone for its history
- **AND** Syzygy itself reads no object of the operator's clone, changes nothing in it, and makes no network request
- **AND** the question, the run record and every page state the copy statements, every brief names the copy as the clone to work in, and every review packet carries exactly REQ-polaris-generation-035's contents

#### Scenario: Repeat run at a launch-consented HEAD

- **WHEN** a run with no `--revision` starts on a full clone whose HEAD is a revision only an in-force launch observation consent names, recorded with the scope this version states (held in the copy), and every statement the subject needs is in force
- **THEN** Syzygy pins that HEAD, the run is a copy-class run, Syzygy makes the copy, and asks nothing, and the run record and every page state the copy statements

#### Scenario: Revision with launch records while HEAD is at another act's revision

- **WHEN** the operator's clone's HEAD is a commit an in-force observation consent made by another act names, and `--revision` names a trunk tip for which a launch observation consent, a drawer statement and a provider statement are in force
- **THEN** the run is a launch-consented run: Syzygy pins the named commit, the run is a copy-class run, Syzygy makes the copy, asks nothing, reads of the operator's clone only what this requirement lists, and the run record and every page state the copy statements

#### Scenario: Repeat run under a launch consent recorded by version 1.1

- **WHEN** a run with no `--revision` starts on a full clone whose HEAD is a revision only an in-force launch observation consent names, recorded with the scope version 1.1 of this change states (held in the operator's own clone, with no fetch by Syzygy)
- **THEN** the run is a copy-class run: Syzygy makes the copy at that revision and does not refuse the full clone
- **AND** the run record states that the copy goes beyond that consent's "no fetch by Syzygy" wording

#### Scenario: SHA-256 clone

- **WHEN** a copy-class run starts on a full clone whose configuration records the SHA-256 object format
- **THEN** Syzygy makes the copy as a SHA-256 repository, fetches the pinned commit into it and checks it out, and does not refuse the clone for its object format

#### Scenario: Several remote defaults

- **WHEN** two remotes, neither named `origin`, each record a remote default and no `--revision` is given
- **THEN** Syzygy refuses before asking for consent, naming `--revision`

#### Scenario: Local branch ahead of the remote default

- **WHEN** `refs/remotes/origin/HEAD` names `refs/remotes/origin/main` and the local `refs/heads/main` points to a later local commit
- **THEN** Syzygy pins the commit `refs/remotes/origin/main` points to and the launch output states both identifiers and that a local commit is not the trunk default

#### Scenario: Partial clone missing an object

- **WHEN** a blob reachable from the root tree of the commit the named identifier names is absent from the operator's clone and only a promisor remote could supply it
- **THEN** the copy fails, Syzygy refuses with its reason, makes no network request, and removes the copy

#### Scenario: Clone with an alternate

- **WHEN** the operator's clone has an `objects/info/alternates` file, in a copy-class run
- **THEN** Syzygy refuses before its copy step starts, naming the reason
- **AND** the launch output states the named identifier in full and its reference, that the commit was not pinned, and the committer date as Unknown
- **AND** the launch output and the run record state that no copy was made, that no question was asked, and that Syzygy issued no brief and delivered no packet, and no other copy statement

#### Scenario: Configuration and hooks of the operator's clone

- **WHEN** the operator's clone's own configuration sets `uploadpack.packObjectsHook` and `core.fsmonitor` to commands, and its hooks directory holds executable hooks
- **THEN** the copy is made and none of those commands or hooks runs

#### Scenario: Revision naming an annotated tag

- **WHEN** the operator gives `--revision v1.0` and `refs/tags/v1.0` names an annotated tag object
- **THEN** Syzygy refuses before asking for consent, naming `--revision`, does not follow the tag to the commit it names, and removes the copy

#### Scenario: Revision naming a blob

- **WHEN** the operator gives `--revision` as the full identifier of a blob the operator's clone holds
- **THEN** the copy's detached checkout fails, Syzygy refuses before asking for consent, naming the identifier, `--revision` and the checkout's failure and stating that the object was not shown to be a commit, reads no blob itself, and removes the copy

#### Scenario: Commit whose checkout fails

- **WHEN** the named identifier names a commit whose root tree holds an entry Git refuses to check out (a path named `.GIT`, for example)
- **THEN** Syzygy refuses before asking for consent, naming the identifier and the checkout's failure and stating that the object was not shown to be a commit, never that it is not a commit, and removes the copy

#### Scenario: Ambiguous abbreviation

- **WHEN** the operator gives `--revision` as an abbreviation that two object identifiers of the operator's clone begin with
- **THEN** Syzygy refuses it as ambiguous before any Git process starts

#### Scenario: References in the reftable backend

- **WHEN** the operator's clone stores its references in the reftable backend
- **THEN** Syzygy refuses before any Git process starts, naming the reason

#### Scenario: A consent that states the clone's form

- **WHEN** an in-force observation consent made by another act, whose record states that the operator fetches the consented commit alone, names the pinned revision, whether or not the run also relies on or records a launch consent record
- **THEN** the run is a no-copy run, and that stated form binds the run
~~~~

### Change 15 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
- **Case:** Start runs against controlled clones and fixture consent records, varying the remote default reference, the presence of `main` and `master`, HEAD, whether an in-force consent names HEAD, whether the clone's remote derives that consent's subject identity or another (a fork or mirror remote), and `--revision` (full, abbreviated, ambiguous, unknown, a reference), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, the did-not-fetch statement and update command, refusals and the point at which each is made, the clone's references and working tree before and after, and captured network effects.
- **Oracle:** Expected pins, statements and refusals derived by an independent `git` reading of each fixture clone and the fixture records, prepared before the run.
- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; network effects come from an independent capture.
- **Falsifier:** A run pins a commit other than the rule's; a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; a HEAD mismatch is not refused, or is refused only after the question; the launch output or run record lacks the full revision, its reference, the committer date, the did-not-fetch statement or the update command; Syzygy fetches, contacts a host, or changes the clone's checkout or references; or the trunk tip is presented as the upstream's latest as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [VIS-2, SEC-3]
  contracts: [RFC5-12]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08]
  topology: []
  parent_requirements: [REQ-polaris-generation-033]
```
~~~~

**Proposed:**

~~~~text
- **Case:** Start runs against controlled clones and fixture consent records, varying the scope a launch observation consent was recorded with (version 1.1's or this version's), the operator's clone's form (full with history, branches, tags, stash and reflogs; one commit alone; partial with a missing object; with an alternates file; references in the reftable backend; a configuration and hooks naming commands), whether an observation consent made by another act names the run's named identifier, the remotes recording a default and their names, a local branch that differs from the remote default, uncommitted changes, the remote default reference, the presence of `main` and `master`, HEAD, whether an in-force consent names HEAD, whether the clone's remote derives that consent's subject identity or another (a fork or mirror remote), and `--revision` (full, abbreviated, ambiguous, unknown, a reference, naming a blob, a tree or an annotated tag), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, the no-network statement and update command, refusals and the point at which each is made, the operator's clone's references, configuration, object store and working tree before and after, Syzygy's reads of it, the copy's location and form, the processes started and their configuration and environment, the copy statements, and captured network effects.
- **Oracle:** Expected pins, statements and refusals derived by an independent `git` reading of each fixture clone and the fixture records, prepared before the run.
- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; network effects come from an independent capture; Syzygy's own in-process reads of the operator's clone come from a read-logging layer outside the code under test, attributed by process, and the copy's Git processes, their reads and their effects from an independent process and file capture, checked only against the copy rules.
- **Falsifier:** A run pins a commit other than the rule's; a run started without `--revision` whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; for a no-copy run, a HEAD mismatch is not refused, or is refused only after the question; a copy-class run is refused for the operator's HEAD; once an identifier is named, the launch output or run record lacks it in full, its reference or that `--revision` gave it, the no-network statement or the update command; once the commit is pinned, they lack its committer date as the commit object records it, and before that stage they state any date but Unknown; Syzygy makes a network request, fetches from anywhere but the operator's clone into the copy, or changes the operator's clone; a run that an observation consent made by another act covers is a copy-class run or starts a copy step, or a run with a named identifier that no such consent covers is a no-copy run; the copy is made other than as this requirement states, or the run goes on although the copy holds more than the pinned commit and what its root tree reaches or departs from its form; a Git process for the copy runs with the system or global configuration, another transport, lazy fetching or a hook path, or a hook or a command the operator's clone's configuration names runs; in a copy-class run, a clone with an alternates file is not refused before its copy step starts; in a launch-consented run, a reftable clone is not refused before any Git process starts; a failed copy is not refused or is completed from elsewhere; the copy's directory is created inside any working tree of the governance home's repository, its linked worktrees included, or inside its Git directory or common Git directory, or inside the operator's clone's working tree or Git directory; for a launch-consented run, Syzygy itself, in process, reads of the operator's clone anything this requirement does not list, or honours its configuration; a run that only a launch observation consent recorded with the operator's-own-clone scope covers is a no-copy run, is refused because the operator's clone holds more than one commit, or history, branches, tags, stash or reflogs (the one-commit requirement version 1.1 carried), or, once its copy step started, its run record does not state that the copy goes beyond that consent's "no fetch by Syzygy" wording; in a copy-class run, a clone is refused for its object format other than as an object format Git does not support fails the copy's `init`, or a copy's object format differs from the operator's clone's; a completed run's copy is removed without the operator, or its location is not named; a named identifier that is not a commit is pinned or followed, or used beyond the copy step and its refusal, or is told from a commit by Syzygy reading the object itself or from reference data; a run whose checkout failed is refused as not a commit, or as a commit; a copy whose copy step started is not removed when the run ends before its brief; the launch output of a copy-class run that ends before its brief does not say that the copy was removed, where its copy step started, or that no copy was made, where it never started, or the launch output of a completed copy-class run does not say that the copy is kept and name its location; a brief of a copy-class run does not name the copy, or a review packet of a copy-class run carries anything REQ-polaris-generation-035 does not list; a statement the stage rule governs is missing for a stage the run reached and a run class that requires it, or stated for a stage it did not reach or for a run class that does not require it, or a stage the run did not reach is not stated as not reached; Syzygy states that an agent session started, or did not, other than as that session's own report labelled Inferred; or the trunk tip is presented as the upstream's latest as Observed.

```yaml
warrants:
  primary: RFC5-12
  doctrine: [VIS-2, SEC-3]
  contracts: [RFC5-12]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08, OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09]
  topology: []
  parent_requirements: [REQ-polaris-generation-033]
```
~~~~
