# Semantic delta LAUNCH-CONSENT-V1-2 — existing full clones and any https or ssh locator

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-launch-consent` version 1.2. No review, owner selection,
> installation, tag or product change is claimed here.

**Artifact:** `proposed/spec.md.patch`, applied to
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
at version 1.1.
**Stable IDs affected:** REQ-polaris-generation-046 and 047, amended in place.

- **046:**
  - the pre-answer read list, made to agree with 047's closed list;
  - two statements added to the question (the agent sessions' reach, and
    delta bases);
  - the observation consent's recorded scope qualified for delta bases;
  - one sentence group added after the identity rule, whose derivation keeps
    its v1.1 bytes (every host, the last two path segments, and `https`,
    `http`, `ssh`, `git` and scp-form remotes);
  - the identity residuals rewritten;
  - two new paragraphs (locator forms; visibility), the first also giving
    the effect of a match by `Upstream:` URL;
  - the history-reach statement added to the run record and pages;
  - ten scenarios;
  - its case, oracle and falsifier;
  - one `warrants.decisions` entry.
- **047:**
  - the consented-HEAD branch's "changes nothing else" narrowed to the pin;
  - the trunk rule made exact for remote-tracking references, and
    `--revision` resolution made exact for annotated tags and
    abbreviations;
  - the HEAD paragraph (detached HEAD and the checkout warning);
  - one new paragraph group (clone forms, what Syzygy reads in them and
    under which rule, the delta-base statement, the reftable refusal, and
    the instruction to every agent session);
  - ten scenarios;
  - its case, observable, oracle independence and falsifier;
  - one `warrants.decisions` entry.

No requirement is added, removed or renamed; no other requirement's bytes
change.
**Change class:** Normative; the whole package takes the normative review floor.
**Author:** Claude, for `syzygy-pdja.29` (epic `syzygy-pdja`).
**Date:** 2026-11-09.

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
had put four points to the owner. They decide D2's disclosure, D5, D6 and
D7 below, and each decision quotes its ruling.

[Observed] Round 1 of review (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md`,
verdict `REVISE` at line 4) returned three revise findings and nine notes.
The repairs, and the reason for each disposition, are in
`ROUND-1-DISPOSITIONS.md`. One repair, D6's admission of typed `http://` and
`git://` URLs, rests on a reading made by the coordinating session, not by
the owner, and is labelled so in D6 and on the sign-off page.

[Observed] Round 2 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-2-RAW.md`,
verdict `REVISE` at line 4) returned three revise findings and three
editorial notes. The repairs are in `ROUND-2-DISPOSITIONS.md`; D1, D2, D3, D5
and "What does not change" below carry them.

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

- what Syzygy may touch in a clone that holds history;
- which locator forms are admitted;
- how a locator carrying credentials is handled.

Without the amendment, each of those would be an implementation choice
nobody signed.

## One change, not a split

[Inferred] Every edit lands in REQ-polaris-generation-046 and 047 of
`polaris-dossier-launch-consent`, and governs launch-consented runs. It has
one stated reach beyond them: an observation consent made by another act
also matches a launch by its normalised `Upstream:` URL. That match adds to
REQ-046's matching and REQ-047's revision branch and removes nothing from
either, so every consent a run could rely on before still serves it.

The category is one: what a launch accepts as its input, the clone and its
locator. It overlaps no other change. The local-agent mode keeps its bytes:
its REQ-033 already requires object reads by identifier at the pinned
revision and refuses alternates, replacements and local configuration, and
nothing here edits it. Its design table's `parseGithubUrl` citation names
the code `init` was built from and goes stale at implementation, as a
history sentence. It is not patched, so that the signed local-agent bytes
and this change stay apart.

**Recommendation:** one package, launch-consent version 1.2.

## The decisions, each with its reasoning

### D1. Which clones a launch accepts

**Decided:** for a launch-consented run, any clone that holds the pinned
revision: a full clone with history, branches, tags, remote-tracking
references, stash and reflogs, a one-commit clone, or anything between.
Syzygy never refuses it for holding more, and never fetches, prunes or
repacks it.

**Why:** the owner's selection. A launch consent record's scope is already
"the pinned revision's commit object and the tree and blob objects reachable
from its root tree, and nothing else, held in the operator's own clone, with
no fetch by Syzygy" (REQ-046). It states no form in which the clone was
made, so a full clone is within it as far as Syzygy's reads go.

**What does not move:** a run that relies on another act's consent whose
record states the clone's form keeps it, whether or not the run also relies
on or records a launch consent record. The redis consent says the operator
fetches each admitted commit alone; that is a performed act's byte, and this
version does not reach it. A scenario pins this.

**Which runs these rules bind.** [Observed, round 2 finding 1] REQ-047's
first branch pins a HEAD any in-force consent names and, in v1.1, "changes
nothing else for it". Left unchanged, that sentence would have exempted every
repeat launch run from D1, D2, D4 and D5. This version narrows it to the pin
("changes nothing else in how the revision of such a run is pinned") and
states that the clone-form, read and statement rules bind every
launch-consented run, whichever branch pinned it, and no other run. A run
that neither relies on nor records a launch consent record keeps every
predecessor's meaning, as the change's preamble says.

[Inferred] For the mixed case, a run at a HEAD the redis consent names that
also records a launch drawer or provider statement, this version takes the
first of the two ways round 2 offered: the redis consent's stated form binds
it. The other way, letting that form yield once a launch record exists,
would reach a performed act's stated scope and is the owner's alone; it is
not drafted.

### D2. What Syzygy may touch in a full clone

**Decided**, as a closed list in REQ-047:

**Two kinds of read, under two rules.** [Observed, round 1 finding 1] The
first draft said these reads "stay those REQ-polaris-generation-033 and
REQ-polaris-generation-046 permit", but REQ-033 permits only object reads by
identifier, and the reference and configuration reads are not that. This
version names them apart. The object reads are REQ-033's object reads. The
reference, configuration and Git-directory reads are launch reads, made only
to pin the revision, compare HEAD with it and propose the identity, which
read no repository content; REQ-033's object-read rule governs every read of
content. REQ-046's pre-answer list now names the same launch reads, so the
two lists agree. Round 2 (finding 3) found one read neither list named, the
type read a `--revision` refusal needs; both lists now name it, beside the
listing of stored object names that resolves an abbreviation.

- **Objects:** the pinned commit, its root tree and what is reachable below
  it, walked down, from the loose object files, the pack files and the pack
  indexes under `objects/`. No parent commit object; nothing reached only
  from another commit, branch, tag, stash, reflog or note. Parent
  identifiers are used only as REQ-046's record matching uses them, never
  resolved.
- **Pack storage:** a delta's base may be read solely to rebuild an
  in-scope object, which is then re-hashed.
  - The base is never used, classified, stored, quoted, given a recorded
    digest, rendered or sent.
  - The question, the launch output, the run record and every page state
    that objects of the pinned tree may have been rebuilt from delta bases
    outside it, never read as content; the launch observation consent's
    recorded scope says the same in its "nothing else" clause (round 1
    finding 3).
  - The statement is unconditional. Syzygy cannot learn a base's identity
    without hashing it, which would read the base as an object.
- **References:** the names of the clone's references, and the values only
  of `HEAD` and the reference it names, the references the trunk rule names,
  the local branch of the remote default's name (for the comparison D3
  states), and the one `--revision` names, read as file data from loose
  reference files and `packed-refs`. Reading `packed-refs` also reads the
  bytes of other references' values, which are used for nothing (round 2
  note 5). A clone that stores its references in the reftable backend is
  refused before the question.
- **Type:** where a `--revision` name resolves to one stored object that is
  not a commit, that object's type, from its header and, for a packed
  delta, the headers of its base chain, used only for the refusal (round 2
  finding 3).
- **Configuration:** the clone's own configuration file, read as text for
  remote names and URLs only, never honoured. No include, URL rewrite, hook
  path, object format or other setting changes a read. Also the files that
  locate the Git directory and the common Git directory.
- **Nothing else:** no other file of the Git directory, no working tree, no
  index. No process is started that reads or acts on the clone, wherever it
  runs (a Git command given the clone's Git directory from elsewhere
  included), so no hook or filter runs.
- **Missing objects:** an object needing an alternate, a replacement or a
  fetch, a partial clone's missing blob included, refuses the step as
  REQ-033 says. Nothing is fetched.

**Why the reftable refusal.** [Inferred] Round 1 found the text silent on a
clone whose references live in the reftable backend, which has no loose
reference files and no `packed-refs`. Reading reftable would be a read the
closed list does not name, and admitting it unread would leave the pin
undefined. Refusing is the fail-closed choice, and the operator can convert
or re-clone. Whether the implementation refuses it today is [Unknown]; no
code was run for this package.

**Why:** "history stays unread", in the owner's words. Walking down from
the commit, as REQ-033 and the installed registry entry already require
("walked down from the commit and never to a parent"), never reaches
history. Configuration is read but not honoured because REQ-046's identity
rule needs the remote URLs, and REQ-033 forbids honouring repository-local
configuration. Reading the working tree, even to detect changes, would be a
read of files the consent does not name.

**The owner's ruling on delta bases.** The first draft put the delta-base
read to the owner, since history's stored bytes may be inflated to rebuild a
trunk-tip object. The owner selected:

> Allow, as delta input only (Recommended) — Old bytes are used only to rebuild trunk-tip objects, never shown or sent, and the run discloses it. Most full clones work.

The disclosure that option promises was not in the first draft. It is now
the statement in the second sub-bullet above, with its scenario arm and
falsifier arm. The strict alternative, refusing any object whose delta chain
leaves the pinned tree, is not drafted. How many clones it would have
refused stays [Unknown].

### D3. How "trunk tip" is chosen in an existing clone

**Decided:** REQ-047's rule stands (the remote's default, else `main`, else
`master`, else refuse), made exact for a clone with remote-tracking
references:

- the remote's default is the commit that the remote-tracking branch named
  by `refs/remotes/<remote>/HEAD` points to;
- the remote is `origin` when it records one, else the one remote that does;
- where several remotes record one and none is `origin`, Syzygy refuses,
  naming `--revision`;
- `main` and `master` are the local `refs/heads/main` and `refs/heads/master`;
- while a remote default is recorded, no local branch is consulted for the
  pin. Where a local branch of that name points elsewhere, the launch output
  states both identifiers and that a local commit is not the trunk default,
  which is why that branch's value is on D2's list.

**`--revision` in a full clone.** [Observed, round 1 note 6] A full clone
holds annotated tags and many objects, and the v1.1 sentence ("a name that
resolves to no commit, or to more than one, SHALL be refused") leaves open how
Syzygy tells. This version states it: an abbreviation is ambiguous when more
than one stored identifier begins with it, decided from the loose object file
names and the pack indexes without reading those objects; a reference naming
a non-commit, an annotated tag included, is refused after Syzygy reads at
most that one object's type, and is never followed. Round 2 (finding 3)
showed that this type read was in neither closed list and tripped both
falsifiers. It is now a listed launch read: the one object's type, from its
header and, for a packed delta, the headers of its base chain, inflating
nothing beyond a header, used only for the refusal; it covers an identifier
as well as a reference that resolves to a non-commit, and both falsifier
arms carve it out. [Observed] The
implementation already refuses a non-commit (`launch-revision.ts:99`,
`ports.isCommit`) and treats a shared prefix as ambiguous without reading,
as the round-1 reviewer reports. Two scenarios pin it.

**Why:** the owner's standing rule, "Revision should always default to
latest trunk commit (eg main/master)". In a full clone, the latest trunk
commit the clone knows is the remote-tracking branch, as of the operator's
last fetch. A local branch can carry unpublished local commits, which are
not the trunk.

[Observed] The implemented trunk rule
(`packages/polaris-dossier/src/launch-revision.ts`) already reads it this
way. It labels the several-remotes refusal Inferred, because the clause says
"its remote's default" in the singular; this version states that refusal.

Syzygy still does not fetch. That the clone's remote-tracking branch is the
upstream's latest stays Inferred. The update command REQ-047 already prints
is the operator's way to refresh it.

### D4. A dirty or detached checkout

**Decided:**

- **Detached HEAD:** accepted. HEAD may be detached or name a branch; only
  the commit it resolves to is compared with the pinned revision. A HEAD
  elsewhere is refused as today, and the printed checkout command now warns
  that a checkout carries uncommitted changes over.
- **Uncommitted or untracked changes:** not detected, because detecting them
  means reading the working tree or the index, which Syzygy may not do. The
  launch output, the run record and every page say the working tree was not
  inspected and may differ from the pinned revision. The launch output
  prints `git -C <clone> status --short` for the operator to run.

**Why:** refusing a dirty checkout would need a read outside the consent.
REQ-033 already guarantees that "an uncommitted change in the clone's working
tree never reaches a check, a quotation or a source page", since every read
is an object read. What remains is that the agent sessions read the
checked-out files, so a claim might rest on uncommitted text. Disclosure and
the operator's own command are the honest limit.

### D5. The agent sessions' reach in a full clone

**Decided:** disclosure, and an instruction that binds nothing.

- The launch question states, before the answer:
  - that the agent sessions can read everything the clone holds, history,
    branches, tags, stash, reflogs and working tree included;
  - that no consent covers what lies beyond the pinned revision as content;
  - that Syzygy reads none of it as content, and what it does read beyond
    the pinned tree: the reference names and values, the stored object
    names, the configuration lines and Git-directory files REQ-047 lists,
    the type of a `--revision` object, and delta-base bytes inflated only to
    rebuild the pinned tree. The first draft said "Syzygy reads none of it",
    which round 2 (finding 2) showed the closed list contradicts.
- The run record and every page carry the same history-reach statement
  (round 1 note 8: the ruling says "the run discloses", not only the
  question).
- Every brief and packet Syzygy issues to an agent session of a
  launch-consented run, authoring and review sessions alike, tells that
  session to rest no claim on any commit but the pinned revision, and not to
  read the clone's history or other references. The first draft told only the
  authoring agent; the ruling's question named "the author and review agent
  sessions", and a review session reads the same clone.
- A session's compliance is its own report, labelled Inferred.

**The owner's ruling, and the trade-off it keeps.** The first draft put this
to the owner. Two options were offered:

- a pinned-tree copy for the agent sessions, which was the recommended one;
- disclosure only.

The owner selected the second:

> Disclose only — Agents work in your clone; the run discloses that they could read history, and whether they stayed at the pinned commit is Inferred.

So the owner chose disclosure over a copy that would have bounded the
agents' reach to the pinned tree. The cost stands as the owner accepted it:

- a full clone lets the author and review sessions read history no consent
  names, and send it to their provider as the operator's own act;
- nothing Syzygy does prevents that;
- "history stays unread" holds for Syzygy by rule, and for the agents only
  by the brief's request, which is Inferred.

The pinned-tree copy is not drafted. It would be a later version's change,
if the owner asks for it.

**Why the disclosure is needed:** REQ-033 already says the agent "reads the
clone without restriction", and the agent's reads are the operator's own
act. A single-commit clone bounded that reach physically, and the
clone-shape check existed for that reason ("your agent reads whatever the
clone holds", in the packet that review quotes). A full clone removes the
bound, so the question must say so.

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
refused. This version follows that direction. The owner has not been asked
this point; the sign-off page flags it, and either answer is a small change
to this paragraph and its scenarios.

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

**Port and case (round 1 note 10, carried to the owner).** [Inferred] The
unchanged normalisation removes any port and case-folds the host and the
path. So two servers on one host at different ports, or two repositories on
a case-sensitive host that differ only in case, share one normalised URL:
each matches the other's records by URL, and they share an identity. This
version does not change the derivation, and does not add a residual to the
spec for it; the sign-off page states it for the owner to decide.

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

### D9. Whether a signed policy or the write act names GitHub-only identities

**Decided: no escalation is needed for either.**

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

**Registry readings to test.** [Observed] The installed source-acquisition
registry entry carries two sentences this version leans on:

- Its fetch sentence says "to stay within the observation consent's stated
  fetch form the operator fetches the one consented commit alone (git fetch
  --depth=1 <upstream> <commit>)". Version 1.0's design §5 read this as
  guidance for consents that state a fetch form, which a launch record does
  not, and asked a reviewer to test that reading. This version relies on the
  same reading.
- Its `readAuthority` says "the pinned commit, its root tree and the trees
  and blobs reachable from it ... from the loose objects and version-2
  packs". This version reads it as admitting a delta base read solely to
  rebuild an in-scope packed object, which the owner allowed (D2).
- The same `readAuthority` says no ref, staging index or repository-local
  configuration is read. This version reads that as scoped to the adapter's
  object reads: D2's reference and configuration reads are launch reads,
  which the spec now says are not observer object reads (round 1 finding 1).

[Inferred] The round-1 reviewer read all three the same way (finding 4,
a note for the owner), and noted that the narrow readings have some
purchase: the word "only", a `REF_DELTA` base looked up "by object
identifier", and an entry signed when every base lay in scope. The owner
may want a later registry version to say so explicitly; the sign-off page
asks. If the owner or a reviewer rejects a reading, the entry needs an
owner-signed successor version first, and this package waits for it.

## What does not change

- These keep their bytes:
  - REQ-polaris-generation-033 to 036, 040 and every other requirement;
  - REQ-046's identity derivation;
  - the local-agent mode;
  - the screening policy (installed v7 and held v8);
  - the write consent;
  - the registry entry;
  - the redis consent and every record.
- A run that neither relies on nor records a launch consent record keeps
  every predecessor requirement's bytes and meaning, as the preamble says,
  and the clone form its consent states still binds it.
- A run that asks REQ-046's question gains one thing: a consent made by
  another act now also matches it by its normalised `Upstream:` URL (D7).
  That adds a match and removes none, so every consent that matched such a
  run under v1.1 still matches, by identity or by revision, and REQ-047's
  revision branch is unchanged.
- Also unchanged:
  - the phrase and the records' fields, save that the launch observation
    consent's recorded scope now carries the delta-base allowance (D2);
  - the dedicated reference and the write rules;
  - the trunk default for clones without remote-tracking references;
  - the did-not-fetch statement.

## Exact blocks

Each block is the exact text of the paragraphs the patch changes, current
then proposed, with the paragraphs split at blank lines, the same split the
patch's hunks follow. A paragraph the patch inserts has no current text; the
paragraph it follows is named. The blocks were generated by script from the
installed and the patched bytes.

### Change 1 (replace), in "Launch-time consent"

**Current:**

~~~~text
In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent and statement REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing ones at that moment, before it reads any blob of the repository and before it issues a brief. Before the answer Syzygy SHALL read only what the question needs, and SHALL read it as Git objects by object identifier: the clone's references; the pinned commit object, of which it SHALL use only the root tree identifier, the parent identifiers and the committer date, never the message or any author or committer identity; and the tree objects reachable from that root tree, of which it SHALL use only entry names, modes and object identifiers. It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and, after a confirmed answer, the launch consent records. From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path listing exposes, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the effective classification policy's classification as it would apply once an observation consent admits the repository, computed while the policy's scope that admits sources by observation consent (today its public-source scope) admits no repository for it. The preview label describes only how the classes were computed before the answer; it does not make the owner's answer, or a provider statement naming those classes, provisional. The question, the launch output and every record that names them SHALL label them a preview, and a confirmed answer SHALL NOT be read as the policy having admitted the repository before the answer.

Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

**Proposed:**

~~~~text
In the operator-agent mode, when a run is started with `syzygy dossier init`, or with the one command of REQ-polaris-generation-040 where that requirement is in force, and the in-force records do not already hold every consent and statement REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzygy SHALL ask the owner for the missing ones at that moment, before it reads any blob of the repository and before it issues a brief. Before the answer Syzygy SHALL read only what the question needs, and only these: the launch reads that REQ-polaris-generation-047 lists, which are not observer object reads and read no repository content, namely the names of the clone's references and the values that requirement lists, read as file data, the clone's configuration file, read as text only for its remotes' names and URLs, the files that locate the Git directory and the common Git directory, the loose object file names and pack indexes from which a `--revision` name is resolved and objects are located, and the type read that requirement permits for a `--revision` name that resolves to an object other than a commit; and, as Git objects by object identifier, each rebuilt from a delta base only as REQ-polaris-generation-047 permits, the pinned commit object, of which it SHALL use only the root tree identifier, the parent identifiers and the committer date, never the message or any author or committer identity; and the tree objects reachable from that root tree, of which it SHALL use only entry names, modes and object identifiers. It SHALL read no blob, and SHALL store nothing from these reads except in the question, the launch output and, after a confirmed answer, the launch consent records. From the tree listing alone it SHALL decide the governed conditions of REQ-polaris-generation-033 that a path listing exposes, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the effective classification policy's classification as it would apply once an observation consent admits the repository, computed while the policy's scope that admits sources by observation consent (today its public-source scope) admits no repository for it. The preview label describes only how the classes were computed before the answer; it does not make the owner's answer, or a provider statement naming those classes, provisional. The question, the launch output and every record that names them SHALL label them a preview, and a confirmed answer SHALL NOT be read as the policy having admitted the repository before the answer.

Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read, including that objects of the pinned tree may be rebuilt from delta bases stored outside it, whose stored bytes Syzygy inflates only for that and never reads as content; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; that the agent sessions can read everything the clone holds, its history, branches, tags, stash, reflogs and working tree included, that no consent covers what the clone holds beyond the pinned revision as content, and that Syzygy reads none of it as content: beyond the pinned commit and the trees and blobs reachable from its root tree, Syzygy reads only the reference names and values, the loose object file names and pack indexes, the configuration lines and the Git-directory files that REQ-polaris-generation-047 lists, the type of an object a `--revision` name resolves to, and delta-base bytes inflated only to rebuild objects of the pinned tree; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

### Change 2 (replace), in "Launch-time consent"

**Current:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments (`x/sub/name` and `y/sub/name`) derive one identity and, absent another match, share its records.

A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, held in the operator's own clone, with no fetch by Syzygy; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator's declaration whether the repository is public, and their Inferred labels. Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) and preserving the exact owner phrase. While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelated)` with its A1 audit-record identity explicitly absent; once one is in force, the question SHALL ask the owner to select the state explicitly (RFC3-16(c)(1)), and Syzygy SHALL refuse to record without a selection. Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the operator's declaration above.
~~~~

**Proposed:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The rule takes the last two path segments for every host, so the host and every earlier path segment (a group above a subgroup, for example) take no part in the identity; a normalised path of fewer than two segments derives no identity, and the operator SHALL give the identity option. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments, on one host or on two (`x/sub/name` and `y/sub/name`, or `github.com/a/b` and `gitlab.com/a/b`), or differ only in characters the rule replaces by or joins with `-` (`a-b/c` and `a/b-c`), derive one identity and, absent another match, share its records: a record made for either matches the other by identity, so the question names it and how it matched, and a confirmed answer under that identity relies on its drawer and provider statements, while an observation consent, which names revisions, covers only the commits it names.

A URL the operator gives as a locator (`--url` or the upstream option) SHALL be in one of the admitted locator forms, the schemes the derivation above normalises: `https://`, `http://` or `git://` followed by a host, an optional port and a path; `ssh://` followed by an optional user name and `@`, a host, an optional port and a path; or the scp form, an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path that does not begin with `//`. An operator-given URL carries no credentials: an `https://`, `http://` or `git://` URL carrying any user information, and any URL whose user information holds a `:`, is not admitted; an `ssh://` or scp-form user name alone is admitted. A URL Syzygy reads from the clone's remote configuration is a remote locator when it is in an admitted locator form once its user information, whatever it holds, is removed, and that user information is removed before anything is derived from it. A URL carrying a query or a fragment, or a percent-encoded character in its user information or host, a URL of any other scheme or transport (`file` and every other transport Git accepts), and a local path are neither admitted nor remote locators. Syzygy SHALL refuse an operator-given URL that is not admitted, naming the rule it fails, and SHALL NOT print, store or record that URL. A remote URL that is not a remote locator derives nothing, as for a clone with no remote, and Syzygy SHALL NOT print, store or record it: the launch output SHALL name the remote and the rule its URL fails, never the URL. Where a remote URL carried user information, the launch output SHALL say so, and Syzygy SHALL NOT print, store or record that user information. Syzygy SHALL make no network request to resolve, check or reach a locator, and SHALL apply no rewriting of it from Git or SSH configuration (a URL rewrite rule or an SSH host alias), so an alias is the host it names. The normalised URL is the locator every launch consent record, the run record and every page carry, for every host. An observation consent made by any other act, which records no normalised URL, also matches the run by URL, as an existing record above, when its `Upstream:` URL, normalised by the same rule, equals the derived URL, host and whole path; it is then a matching record for the identity proposal and the record list, named in the question with how it matched, and where it names the pinned revision it is an in-force consent the run holds, so the question asks for no new observation consent. This match adds to the matching above and never restricts it, nor the revision branch of REQ-polaris-generation-047: a record that does not match by URL may still match by identity or by naming the pinned revision or a parent, and a HEAD that any in-force consent names is pinned as that requirement states. By URL alone, a consent is never matched for a same-named repository on another host or under another group.

Whether the repository is public is the operator's declaration alone, for every host and form. Syzygy SHALL NOT infer it from the host, the scheme, a user name or whether the operator's clone needed a credential, SHALL make no request to learn it, and the question SHALL NOT suggest an answer. A repository that the operator does not declare public is not public under the effective screening policy, whatever its host.

A confirmed answer SHALL create, in the observing project's governance home at the location the owner's write consent names (below), one observation consent record for the pair (`project:syzygy`, the repository identity), as RFC5-12 and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, save that the stored bytes of a delta base outside that scope may be inflated solely to rebuild an object within it, as REQ-polaris-generation-047 states, held in the operator's own clone, with no fetch by Syzygy; granting principal the owner, as declared by the operator; grant instant Syzygy's clock at the answer; revocation state none. It SHALL carry the declared identity, how it was proposed, the normalised URL as a locator hint, the operator's declaration whether the repository is public, and their Inferred labels. Every launch consent record SHALL be an owner-act record binding the exact digest of its content (RFC3-16) and preserving the exact owner phrase. While no A1 audit mechanism is in force, its provenance state SHALL be `owner-adopted (bootstrap, uncorrelated)` with its A1 audit-record identity explicitly absent; once one is in force, the question SHALL ask the owner to select the state explicitly (RFC3-16(c)(1)), and Syzygy SHALL refuse to record without a selection. Each record SHALL record its ceremony: the question in full, the phrase, the terminal it came from and the operator's declaration above.
~~~~

### Change 3 (replace), in "Launch-time consent"

**Current:**

~~~~text
The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity and its recording commit; the repository identity, its normalised URL, their source and their Inferred label; the operator's declaration whether the repository is public, labelled Inferred; how the identity was proposed and the identity residuals above; the pinned revision and how it was chosen; the drawer statement relied on, if any; that who answered rests on the operator's declaration, labelled Inferred; and, for the provider statement, the citation REQ-polaris-generation-033 requires, not restated.
~~~~

**Proposed:**

~~~~text
The run record and every rendered page SHALL disclose, in human and machine form: that the consents were recorded at launch, with each record's identity and its recording commit; the repository identity, its normalised URL, their source and their Inferred label; the operator's declaration whether the repository is public, labelled Inferred; how the identity was proposed and the identity residuals above; that the agent sessions could read everything the clone holds beyond the pinned revision, its history, branches, tags, stash, reflogs and working tree included, which no consent covers as content and of which Syzygy read none as content, with the statement the question gives of what Syzygy reads beyond the pinned tree; the pinned revision and how it was chosen; the drawer statement relied on, if any; that who answered rests on the operator's declaration, labelled Inferred; and, for the provider statement, the citation REQ-polaris-generation-033 requires, not restated.
~~~~

### Change 4 (insert), in "Launch-time consent"

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

### Change 5 (replace), in "Launch-time consent"

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
- **Case:** Start operator-agent runs against controlled clones and fixture governance homes, varying independently: whether standard input is a terminal; the answer (exact phrase, other text, none, each record accepted or declined, each drawer answer, public declared, declined or not given); the tree's governed conditions and assigned classes; the clone's remotes and URLs, in each admitted and remote locator form and in forms neither admits, on `github.com` and other hosts, with paths of one, two and more segments, with and without user information; the identity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying one identity or several, including an in-force statement with and without covering classes; the write consent's presence, effect, reference and location; an A1 mechanism present or absent; whether the clone's working tree, Git directory or common Git directory is the governance home's; owner placements at and away from the pinned revision; and whether an execution choice was recorded.
- **Observable:** The question text, the phrase asked for, refusals and their reasons, the objects read before and after the answer, the commits on the dedicated reference and their trees, every other reference, working tree and index of the governance home before and after, each record's fields and bound digest, the brief's execution rule, withheld files, and the human and machine disclosures.
- **Oracle:** Expected questions, phrases, refusals, identities, normalised URLs, record sets, field values and withheld files derived from the fixture homes, clones and placements by an independent `git` reading, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test. Object reads are captured by an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read, never by Syzygy's own record. Commits, references, working trees and indexes are compared by an independent listing before and after.
- **Falsifier:** A blob is read, or any commit field other than the root tree, parents and committer date is used, before a confirmed phrase or in-force records; anything from a pre-answer read is stored outside the question, launch output and records; before the answer Syzygy reads anything the pre-answer list does not name, or reads the configuration for anything but its remotes' names and URLs; the question or the launch output omits that objects of the pinned tree may be rebuilt from delta bases outside it; the question omits any statement this requirement lists, including that only the owner may answer and the existing records with their states; a record is created without the exact phrase, without a terminal, without the write consent, without a declaration whether the repository is public, or, once an A1 mechanism is in force, without a state selection; one record carries two of observation consent, drawer statement and provider statement; a provider statement is created for a non-governed subject, or a second one for a subject and provider whose in-force statement covers the classes; a drawer statement is created on any answer but that none exists; a record names more than the pinned revision; a file is edited or removed, a working tree, index or reference other than the dedicated one changes, or the trunk tip moves; Syzygy pushes the dedicated reference; the proposed identity differs from the proposal rule, or is presented as Observed; a launch whose matching records carry more than one identity, with no identity option, is not refused before asking; the URL is recorded or rendered as the identity; an operator-given URL not in an admitted form is admitted, a remote URL that is not a remote locator derives anything, or a URL carrying credentials, or its user information, is printed, stored or recorded; an identity is derived other than from the last two path segments, or from a path of fewer than two; Syzygy makes a network request for a locator or applies a rewriting of it; a remote URL that is not a remote locator is printed, stored or recorded; an observation consent made by another act matches by URL other than by its normalised `Upstream:` URL equalling the derived URL, or does not match when they are equal, or the URL match prevents a match by identity or revision, or the pin of a consented HEAD; visibility is inferred from the host, scheme, a user name or a credential, or the question suggests an answer; the question omits that the agent sessions can read everything the clone holds beyond the pinned revision; the question, the run record or a page states that Syzygy reads nothing beyond the pinned revision, or its statement of what Syzygy reads beyond the pinned tree omits a read REQ-polaris-generation-047 permits; the pre-answer classes are not labelled a preview; a matching revoked record is not named; a run on the governance home's working tree or Git directory is not refused; an in-force record set is not reused; a disclosure this requirement lists is missing from the run record or a page; a file a placement would have placed renders other than Unknown; for a repository the operator does not declare public, the answer is asked for before the question states that the repository identity and its normalised URL are recorded on the dedicated reference in the observing project's own repository, which Syzygy never pushes and one push of which would publish them, or the question asks for a confirmation of that statement or adds an answer, phrase or record field for it; an execution choice is asked for or recorded; or who answered is presented as Observed.

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

### Change 6 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.
~~~~

**Proposed:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else in how the revision of such a run is pinned. The rules below on the clone's form, on Syzygy's reads of the clone and on the statements they require bind every launch-consented run, whichever of these branches pinned its revision, and bind no other run. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. The remote's default is the commit that the remote-tracking branch named by the symbolic reference `refs/remotes/<remote>/HEAD` points to, where the remote is `origin` when it records one, or else the one remote that records one; where several remotes record one and none is `origin`, the clone records no single remote default, and Syzygy SHALL refuse, naming `--revision`. `main` and `master` are the local branches `refs/heads/main` and `refs/heads/master`. While a remote default is recorded, no local branch is consulted for the pin: where a local branch of the same name points elsewhere, the launch output SHALL state both identifiers and that a local commit is not the trunk default. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused. An abbreviated identifier resolves to more than one when more than one object identifier the clone stores begins with it, decided from the loose object file names and the pack indexes alone, without reading those objects. A name that resolves to one stored object other than a commit, a reference naming an annotated tag included, SHALL be refused, naming `--revision`, after Syzygy makes at most the type read listed below, and SHALL NOT be followed to the object it names.
~~~~

### Change 7 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
Syzygy SHALL NOT change the clone's checkout. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.
~~~~

**Proposed:**

~~~~text
Syzygy SHALL NOT change the clone's checkout. HEAD may be detached or name a branch; only the commit it resolves to is compared with the pinned revision. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief, with the warning that a checkout carries uncommitted changes over. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.

For a launch-consented run, Syzygy SHALL accept the operator's clone in whatever form holds the pinned revision: a full clone with its history, branches, tags, remote-tracking references, stash and reflogs, a clone made by fetching one commit alone, or any form between, save that where the run relies on an observation consent made by another act whose record states the clone's form, that stated form binds the run, whether or not the run also relies on or records a launch consent record. Except as such a stated form requires, Syzygy SHALL NOT refuse the clone for holding commits, objects or references beyond the pinned revision; it SHALL NOT fetch, prune, repack or otherwise change it. Whatever the clone holds, Syzygy's reads of it for the run are only these. The object reads are Git object reads by object identifier, as REQ-polaris-generation-033 and REQ-polaris-generation-046 state them. The reference, configuration, Git-directory and type reads, and the listing of stored object names in the loose object files and pack indexes that resolves a `--revision` name, are launch reads, not observer object reads: Syzygy makes them only to pin the revision, to compare HEAD with it and to propose the identity, and they read no repository content, so REQ-polaris-generation-033's object-read rule governs every read of content:

- objects: the pinned commit object, its root tree and the trees and blobs reachable from it, reached by walking down from the commit, from the loose object files, the pack files and the pack indexes under `objects/`; save the type read below, Syzygy SHALL read no parent commit object and no object reached only from another commit, a branch, a tag, the stash, a reflog or a note, and SHALL use the pinned commit's parent identifiers only as REQ-polaris-generation-046 uses them, never resolving one;
- pack storage: where a pack stores an object of that scope as a delta, Syzygy MAY read the stored bytes of the delta's base, whichever object they belong to, solely to reconstruct that object, which it then re-hashes as REQ-polaris-generation-033 requires; it SHALL NOT use a base reached this way for anything else, and SHALL NOT classify, store, quote, record a digest of, render or send it, and the launch output, the run record and every page SHALL state that objects of the pinned tree may have been rebuilt from delta bases outside it, whose stored bytes were inflated only for that and never read as content;
- references: the names of the clone's references, and the values only of `HEAD` and the reference it names, the references the trunk rule above names, the local branch of the remote default's name, and the reference `--revision` names, each read as file data from the loose reference files and `packed-refs`, where reading `packed-refs` also reads the bytes of other references' values, which Syzygy SHALL use for nothing; a clone that stores its references otherwise (the reftable backend) SHALL be refused before asking for consent, naming the reason;
- type: where a `--revision` identifier or reference resolves to one stored object that is not a commit, an annotated tag included, that one object's type, read from its header and, where a pack stores it as a delta, from the headers of the entries of its base chain, inflating no more of any of them than its header, used for nothing but the refusal, and never classified, stored, quoted, recorded, rendered or sent;
- configuration: the clone's own configuration file, read as text only for its remotes' names and URLs and never honoured, so no include, URL rewrite, hook path, object format or other setting it states changes a read; and the files that locate the Git directory and the common Git directory;
- nothing else in the Git directory, and nothing in the working tree or the index. Syzygy SHALL NOT read either to learn whether the checkout holds uncommitted or untracked changes, and SHALL start no process that reads or acts on the clone, wherever that process runs (a Git command given the clone's Git directory from elsewhere included), so no hook or filter runs.

A clone whose objects of that scope cannot be read without an alternate, a replacement object or a fetch, a partial clone missing one included, SHALL be refused as REQ-polaris-generation-033 states, and Syzygy SHALL NOT fetch the missing object. Because Syzygy reads no working tree, it cannot tell whether the checked-out files differ from the pinned revision, while the agent sessions read them: the launch output, the run record and every page SHALL state that the working tree was not inspected and may differ from the pinned revision, and the launch output SHALL print the operator's own command that lists such changes (`git -C <clone> status --short`). Every brief and packet Syzygy issues to an agent session of a launch-consented run, the authoring and the review sessions alike, SHALL tell that session to rest no claim on any commit but the pinned revision and not to read the clone's history or other references; that a session complied is its own report, labelled Inferred. A run that neither relies on nor records a launch consent record is bound by none of these rules on the clone's form, Syzygy's reads and the statements, and whatever form its observation consent record states for the clone still binds it.
~~~~

### Change 8 (insert), in "Trunk-tip revision pinned at launch"

**Current:**

(nothing: inserted after the paragraph that begins "- **WHEN** the pinned revision is the trunk tip and the clone's HEAD is another commit that no in-fo")

**Proposed:**

~~~~text
#### Scenario: Existing full clone at the trunk tip

- **WHEN** the operator starts a run with no `--revision` on a full clone whose `refs/remotes/origin/HEAD` names `refs/remotes/origin/main`, whose HEAD is the commit that branch points to, and whose pinned commit no in-force consent names
- **THEN** Syzygy pins that commit, asks the question, and does not refuse the clone for its history, branches, tags or other references
- **AND** the objects read are the pinned commit, its root tree and the trees and blobs reachable from it, with no parent commit object, and no delta base reached in a pack is classified, stored, quoted, recorded, rendered or sent
- **AND** the launch output, the run record and every page state that objects of the pinned tree may have been rebuilt from delta bases outside it, never read as content
- **AND** Syzygy fetches nothing, starts no process in the clone and reads neither its working tree nor its index

#### Scenario: Several remote defaults

- **WHEN** two remotes, neither named `origin`, each record a remote default and no `--revision` is given
- **THEN** Syzygy refuses before asking for consent, naming `--revision`

#### Scenario: Local branch ahead of the remote default

- **WHEN** `refs/remotes/origin/HEAD` names `refs/remotes/origin/main` and the local `refs/heads/main` points to a later local commit
- **THEN** Syzygy pins the commit `refs/remotes/origin/main` points to and the launch output states both identifiers and that a local commit is not the trunk default

#### Scenario: Detached HEAD and uncommitted changes

- **WHEN** the clone's HEAD is detached at the pinned revision and its working tree holds uncommitted and untracked changes
- **THEN** Syzygy proceeds without reading the working tree or the index, and the launch output, the run record and every page state that the working tree was not inspected and may differ from the pinned revision
- **AND** the launch output prints `git -C <clone> status --short` for the operator, and no uncommitted change reaches a check, a quotation or a page

#### Scenario: Partial clone missing an object

- **WHEN** a blob reachable from the pinned commit's root tree is absent from the clone and only a promisor remote or an alternate could supply it
- **THEN** the step that needs it is refused with its reason, and Syzygy fetches nothing and follows no alternate

#### Scenario: Revision naming an annotated tag

- **WHEN** the operator gives `--revision v1.0` and `refs/tags/v1.0` names an annotated tag object
- **THEN** Syzygy refuses before asking for consent, naming `--revision`, having read no more of that object than the type read lists, and does not follow it to the commit it names

#### Scenario: Ambiguous abbreviation

- **WHEN** the operator gives `--revision` as an abbreviation that two stored object identifiers begin with
- **THEN** Syzygy refuses it as ambiguous, deciding so from the loose object file names and pack indexes without reading either object

#### Scenario: References in the reftable backend

- **WHEN** the clone stores its references in the reftable backend, with no loose reference files and no `packed-refs`
- **THEN** Syzygy refuses before asking for consent, naming the reason

#### Scenario: Repeat run on a full clone at a launch-consented HEAD

- **WHEN** a run with no `--revision` starts on a full clone whose HEAD is a revision an in-force launch observation consent names
- **THEN** Syzygy pins that HEAD and asks nothing, and its reads of the clone are only those this requirement lists
- **AND** the launch output, the run record and every page carry the delta-base and working-tree statements, and every brief and packet issued to an agent session carries the history instruction

#### Scenario: A consent that states the clone's form

- **WHEN** a run relies on an observation consent made by another act whose record states that the operator fetches the consented commit alone, whether or not it also relies on or records a launch consent record
- **THEN** that stated form still binds the run, and this requirement admits no other clone form for it
~~~~

### Change 9 (replace), in "Trunk-tip revision pinned at launch"

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
- **Case:** Start runs against controlled clones and fixture consent records, varying the clone's form (full with history, branches, tags, stash and reflogs; one commit alone; partial with a missing object; with an alternates file; packed with deltas whose bases lie outside the pinned tree; references in the reftable backend), `--revision` naming an annotated tag or an abbreviation shared by two stored objects, the remotes recording a default and their names, a local branch that differs from the remote default, uncommitted and untracked changes, a detached or attached HEAD, the remote default reference, the presence of `main` and `master`, HEAD, whether an in-force consent names HEAD, whether the clone's remote derives that consent's subject identity or another (a fork or mirror remote), and `--revision` (full, abbreviated, ambiguous, unknown, a reference), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, the did-not-fetch statement and update command, refusals and the point at which each is made, the objects, references and files read in the clone, the processes started, the working-tree and delta-base statements and status command, the history instruction in each brief and packet, the clone's references and working tree before and after, and captured network effects.
- **Oracle:** Expected pins, statements and refusals derived by an independent `git` reading of each fixture clone and the fixture records, prepared before the run.
- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; network effects come from an independent capture; object, reference and file reads come from a read-logging layer outside the code under test, as for REQ-polaris-generation-046.
- **Falsifier:** A run pins a commit other than the rule's; a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; a HEAD mismatch is not refused, or is refused only after the question; the launch output or run record lacks the full revision, its reference, the committer date, the did-not-fetch statement or the update command; Syzygy fetches, contacts a host, or changes the clone's checkout or references; or the trunk tip is presented as the upstream's latest as Observed; a launch-consented run that relies on no consent stating the clone's form refuses a clone for holding history, branches, tags or other references; Syzygy reads a parent commit object, an object reached only from another commit or reference other than by the type read this requirement lists, the working tree, the index, or a file of the Git directory this requirement does not list, honours a setting of the clone's configuration, or starts a process in the clone; a delta base reached in a pack is used for anything but reconstructing the in-scope object, or is classified, stored, quoted, recorded, rendered or sent, or the delta-base statement is missing from the launch output, the run record or a page; a missing object is fetched or taken from an alternate; a local branch is consulted while a remote default is recorded, or several remote defaults with none `origin` are not refused; an abbreviation is judged ambiguous by reading objects, a name resolving to a non-commit is followed or more of it or its base chain is read than the type read this requirement lists, or a reftable clone is read; a process is started that reads or acts on the clone; the working-tree statement, the status command, or the history instruction in any brief or packet issued to an agent session is missing; or a run relying on another act's consent that states the clone's form is admitted in another form, whether or not it relies on or records a launch consent record; or a launch-consented run whose HEAD an in-force consent names lacks a read limit or a statement this requirement sets for launch-consented runs.

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
