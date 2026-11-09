# Semantic delta LAUNCH-CONSENT-V1-2 — existing full clones and any https or ssh locator

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-launch-consent` version 1.2. No review, owner selection,
> installation, tag or product change is claimed here.

**Artifact:** `proposed/spec.md.patch`, applied to
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
at version 1.1.
**Stable IDs affected:** REQ-polaris-generation-046 and 047, amended in place.
046: one statement added to the question, the identity rule (admitted forms
and a host-qualified identity off `github.com`), the identity residuals, two
new paragraphs (locator forms; visibility), six scenarios, its case, oracle
and falsifier, and one `warrants.decisions` entry. 047: the trunk rule made
exact for remote-tracking references, the HEAD paragraph (detached HEAD and
the checkout warning), one new paragraph group (clone forms and what Syzygy
reads in them), six scenarios, its case, observable, oracle independence and
falsifier, and one `warrants.decisions` entry. No requirement is added,
removed or renamed; no other requirement's bytes change.
**Change class:** Normative; the whole package takes the normative review floor.
**Author:** Claude, for epic `syzygy-pdja`.
**Date:** 2026-11-09.

## Warrant

[Observed] The owner direction `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`
(`.syzygy/governance/decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`),
a plain direction recorded from two structured questions answered on
2026-11-09. It authorizes drafting only. The owner's selections, quoted from
that record:

- "Accept full clones (Recommended) — Reads only the pinned trunk-tip commit
  from your existing clone; history stays unread. Needs a small spec
  amendment, review and your sign-off."
- "Any https or ssh git URL (Recommended) — Any host, over https or ssh; the
  launch consent and visibility rules still apply. Needs a spec amendment,
  review and your sign-off."

The owner did not choose the local-path option, and this version admits no
local path.

## Where the two limits live today (rule 9 sweep)

[Observed, 2026-11-09, at `origin/main` `715c59c4`.] The sweep used Python
`re`, case-insensitive, over the tracked files of each population, for seven
forms: `github`; `https://`; `\bssh\b|scp`; `github:[A-Za-z<{$]` (the
code's identity form); `commit alone|commits? alone|single-commit|one-commit|one consented commit`;
`shallow|--depth|depth=1`; `full clone`. A second pass with `git grep -i -F`
for `github`, `alone` and `shallow` over the same paths agreed.

| Population | Files | Files with a hit that pins a clone shape or a GitHub-only locator |
|---|---|---|
| installed specs, `openspec/changes/*/specs/**` | 9 | 0. The one hit, the launch-consent spec, already normalises `https`, `http`, `ssh`, `git` and scp-form remotes (REQ-046) |
| design and proposal of the two signed dossier changes | 4 | 1: the local-agent design's command table names `parseGithubUrl` as code `init` and `preflight` are "built from". Descriptive, not a requirement |
| `.syzygy/governance/decisions/**` | 217 | 0 (hits are GitHub as a code host, review prose and this direction's own README row) |
| `.syzygy/governance/policies/**` | 12 | 0. The installed policy's one `shallow` hit is the network route "the shallow by-commit fetch from the target's upstream that the observation consent describes", a Syzygy fetch the local-agent mode never makes; its `github` hit is the `github_pat_` detector |
| `.syzygy/governance/declarations/**` | 2 | 1: the source-acquisition registry entry's `typedAuthority.fetch` (below) |
| screening v8 and write-consent packages | 20 | 0. GitHub appears only as the observing project's own upstream |

Two further texts, outside those populations, were read because the code
cites them:

- [Observed] The clone-shape check (`packages/polaris-dossier/src/clone-shape.ts`)
  rests on the redis observation consent, a performed act's record, whose
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
`repository:` form REQ-046 derives or a declared one: `repository:redis-redis`
(22 files), `repository:psf-requests` (9), `repository:tzeusy-org-syzygy` (4)
and the declared `repository:butlers-configured-poc` (15). So the
compatibility that matters is with the `repository:<owner>-<repo>` identities
derived from `github.com`, and this version keeps that form for `github.com`.

**What needs a spec change, then.** [Inferred] Neither limit is a signed
requirement, so the code could drop both without one. The amendment is still
needed: the launch-consent requirements describe reads, references and
locators for a clone that held one commit, and say nothing about what Syzygy
may touch in a clone that holds history, nor which locator forms are
admitted and how one carrying credentials is handled. Without the
amendment, each of those would be an implementation choice nobody signed.

## One change, not a split

[Inferred] Every edit lands in REQ-polaris-generation-046 and 047 of
`polaris-dossier-launch-consent`, and governs launch-consented runs, with one
stated reach beyond them: an observation consent made by another act is found
by its normalised `Upstream:` URL, which finds every consent today's
`https://github.com` form finds. The category is one: what a launch accepts
as its input, the clone and its locator. It overlaps no other change. The
local-agent mode keeps its bytes: its REQ-033 already requires object reads
by identifier at the pinned revision and refuses alternates, replacements and
local configuration, and nothing here edits it. Its design table's
`parseGithubUrl` citation names the code `init` was built from and goes stale
at implementation, as a history sentence; it is not patched, so that the
signed local-agent bytes and this change stay apart. **Recommendation:** one
package, launch-consent version 1.2.

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
record states the clone's form keeps it. The redis consent says the operator
fetches each admitted commit alone; that is a performed act's byte, and this
version does not reach it. A scenario pins this.

### D2. What Syzygy may touch in a full clone

**Decided**, as a closed list in REQ-047:

- **Objects:** the pinned commit, its root tree and what is reachable below
  it, walked down. No parent commit object; nothing reached only from
  another commit, branch, tag, stash, reflog or note. Parent identifiers are
  used only as REQ-046's record matching uses them, never resolved.
- **Pack storage:** a delta's base may be read solely to rebuild an in-scope
  object, which is then re-hashed. The base is never used, classified,
  stored, quoted, given a recorded digest or rendered. See the owner point
  below.
- **References:** the names of the clone's references, and the values only
  of `HEAD`, the references the trunk rule names and the one `--revision`
  names, read as file data from loose reference files and `packed-refs`.
- **Configuration:** the clone's own configuration file, read as text for
  remote names and URLs only, never honoured. No include, URL rewrite, hook
  path, object format or other setting changes a read. Also the files that
  locate the Git directory and the common Git directory.
- **Nothing else:** no other file of the Git directory, no working tree, no
  index. No process is started in the clone, so no hook or filter runs.
- **Missing objects:** an object needing an alternate, a replacement or a
  fetch, a partial clone's missing blob included, refuses the step as
  REQ-033 says. Nothing is fetched.

**Why:** "history stays unread", in the owner's words. Walking down from
the commit, as REQ-033 and the installed registry entry already require
("walked down from the commit and never to a parent"), never reaches
history. Configuration is read but not honoured because REQ-046's identity
rule needs the remote URLs, and REQ-033 forbids honouring repository-local
configuration. Reading the working tree, even to detect changes, would be a
read of files the consent does not name.

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
- while a remote default is recorded, no local branch is consulted. Where a
  local branch of that name points elsewhere, the launch output states both
  identifiers and that a local commit is not the trunk default.

**Why:** the owner's standing rule, "Revision should always default to
latest trunk commit (eg main/master)". In a full clone the latest trunk
commit the clone knows is the remote-tracking branch, as of the operator's
last fetch. A local branch can carry unpublished local commits, which are
not the trunk. [Observed] The implemented trunk rule
(`packages/polaris-dossier/src/launch-revision.ts`) already reads it this
way, and labels the several-remotes refusal Inferred because the clause says
"its remote's default" in the singular; this version states it. Syzygy still
does not fetch. That the clone's remote-tracking branch is the upstream's
latest stays Inferred, and the update command REQ-047 already prints is the
operator's way to refresh it.

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
is an object read. What remains is that the agent sessions read the checked-out
files, so a claim might rest on uncommitted text. Disclosure and the
operator's own command are the honest limit.

### D5. The agent sessions' reach in a full clone

**Decided:** the launch question states, before the answer, that the agent
sessions can read everything the clone holds, history, branches, tags,
stash, reflogs and working tree included; that no consent covers what lies
beyond the pinned revision; and that Syzygy reads none of it. The brief of
a launch-consented run tells the authoring agent to rest no claim on any
commit but the pinned revision and not to read the clone's history or other
references. Its compliance is its own report, labelled Inferred.

**Why:** REQ-033 already says the agent "reads the clone without
restriction", and the agent's reads are the operator's own act. A single-commit clone
bounded that reach physically, and the clone-shape check existed for that
reason ("your agent reads whatever the clone holds", the packet that review
quotes). A full clone removes the bound. "History stays unread" therefore
holds for Syzygy by rule and for the agent only by instruction; the question
must say so. See the owner point below.

### D6. The locator forms admitted

**Decided:** three forms:

- `https://host[:port]/path`;
- `ssh://[user@]host[:port]/path`;
- the scp form `[user@]host:path`, where the host holds no `/` and the path
  does not begin with `//`.

The normalised path must hold at least one segment. These are refused or
derive nothing:

- `http`, `git`, `file` and every other transport;
- a local path;
- a query or a fragment;
- percent-encoding in the user information or the host;
- any URL no form matches.

**Credentials:**

- an `https://` URL with any user information is not admitted, since a
  token is commonly carried as the user name;
- a URL whose user information holds a `:` is not admitted;
- an ssh or scp user name alone is admitted and dropped by normalisation.

**Refusals:**

- an operator-given URL that is not admitted is refused, naming the rule,
  and the URL is never printed, stored or recorded;
- a remote URL that is not admitted derives nothing, as for a clone with no
  remote, so the operator gives the identity and upstream options;
- where the remote URL carried user information, the launch output says so
  and never prints it.

**Network and configuration:** Syzygy makes no network request for a
locator and applies no rewrite from Git or SSH configuration. An SSH host
alias is therefore the host it names.

**Why:** the owner chose "any https or ssh git URL" and declined local
paths. REQ-046 as signed normalises `http` and `git` remotes too. This version
narrows the derivation to the two transports chosen, so a remote over an
unauthenticated transport is not recorded as a locator without the operator
giving one. Refusing, rather than silently stripping, an operator-typed
credential keeps it out of every record. Stripping it from a remote URL Syzygy
reads keeps an existing clone usable, and the launch output points out the
credential sitting in the operator's configuration.

### D7. The normalisation rule and the identity form

**Decided:**

- **Normalisation:** REQ-046's rule, unchanged except for the schemes it
  names, which are now `https`, `ssh` and the scp form.
- **Identity:** for `github.com`, `repository:<owner>-<repo>` as today. For
  any other host, `repository:` followed by the host and every path
  segment, joined by `-`, with the same character replacement. So
  `git@git.example.org:team/sub/tool.git` proposes
  `repository:git.example.org-team-sub-tool`.
- **Locator:** the normalised URL, `host/path`, is what launch records, the
  run record and every page carry, for every host.
- **Other acts' consents:** a consent made by another act is found when its
  `Upstream:` URL, normalised the same way, equals the locator's.

**Why:**

- **Compatibility.** Every identity in force is `github.com`-derived or
  declared, and the `github.com` form is unchanged byte for byte, so redis,
  requests and Syzygy's own records still read and still match.
  [Inferred] A launch record that an earlier build wrote for a non-GitHub
  host, before its `init` refused, keeps its identity, because REQ-046 takes
  the identity every matching record carries, and such a record still
  matches by URL.
- **Why the host joins the identity off GitHub.** The two-segment rule
  applied to every host would give a GitLab mirror of `redis/redis` the
  identity `repository:redis-redis`. That identity would then match redis's
  records by identity, and the mirror would inherit redis's drawer and
  provider statements. With the host in the identity, a cross-host copy
  shares records only by commit, which REQ-046's revision and parent
  matching already discloses. Nested groups (`group/sub/project`) are common
  off GitHub, so every segment is kept.
- **The cost.** Collisions remain where the rule replaces or joins
  characters (`a-b/c` and `a/b-c`), for a host and a GitHub owner of the
  same name, and between ports on one host. The residual sentence now names
  them, replacing the `x/sub/name` example, which the GitHub rule cannot
  produce. The identity stays a proposal that the owner's phrase declares.

The alternative, the two-segment form for every host, is lawful and simpler.
It is not chosen because of the mirror case above. A reviewer or the owner
may prefer it.

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
  `github.com/tzeusy-org/syzygy`, which this version leaves unchanged. Its
  scope is the dedicated reference and the location in Syzygy's own tree,
  and it says nothing about observed repositories' hosts.

**One registry sentence to test.** [Observed] The installed
source-acquisition registry entry says "to stay within the observation
consent's stated fetch form the operator fetches the one consented commit
alone (git fetch --depth=1 <upstream> <commit>)". Version 1.0's design §5
read this as guidance for consents that state a fetch form, which a launch
record does not, and asked a reviewer to test that reading. This version
relies on the same reading. If a reviewer rejects it, the entry needs a
successor version, owner-signed, and this package must wait for it. Its
`readAuthority` ("the pinned commit, its root tree and the trees and blobs
reachable from it ... from the loose objects and version-2 packs") is read
here as admitting a delta base read solely to rebuild an in-scope packed
object. That reading also goes to the owner (below).

## Points for the owner before review

1. **Delta bases in a full clone's packs.** [Inferred] Git commonly stores a
   trunk-tip blob as a delta against another object, which may be a
   historical one. To read the pinned tree at all, Syzygy must read that
   base's stored bytes. D2 admits that read solely as decompression input,
   never as content. Literally, "history stays unread" is then false at the
   byte level: history is never read as content, but its stored bytes may be
   inflated to rebuild a trunk-tip object. The strict alternative refuses
   any object whose delta chain leaves the pinned tree. How many full clones
   that would refuse is [Unknown]; it was not measured, because measuring it
   means opening observed repositories' packs. A third option, which needs
   no spec change, keeps the one-commit form for the clone Syzygy reads: the
   operator makes a second, one-commit clone from the full one. It is less
   convenient, and it is not what the owner selected.
2. **The agent's reach (D5).** A full clone lets the agent sessions read
   history the consent does not name. The brief can ask the agent not to;
   it cannot make it.
3. **The identity form off GitHub (D7)**, host-qualified, versus the
   simpler two-segment form for every host.
4. **Narrowing REQ-046's derivation** to https and ssh (D6). A clone whose
   only remote is `http://` or `git://` no longer proposes an identity, and
   the operator gives one.

None of these needs a signed policy or act byte edited. Point 1 may need a
registry-entry successor if a reviewer reads the entry's `readAuthority` more
narrowly.

## What does not change

- REQ-polaris-generation-033 to 036, 040 and every other requirement keep
  their bytes. So do the local-agent mode, the screening policy (installed
  v7 and held v8), the write consent, the registry entry, the redis consent
  and every record.
- A run that relies on no launch consent record keeps every predecessor
  requirement's bytes and meaning. Its locator is still found as before, and
  the clone form its consent states still binds it.
- The phrase, the records' fields, the dedicated reference, the write rules,
  the trunk default for clones without remote-tracking references, and the
  did-not-fetch statement.

## Exact blocks

Each block is the exact text of the paragraphs the patch changes, current
then proposed, with the paragraphs split at blank lines, the same split the
patch's hunks follow. A paragraph the patch inserts has no current text; the
paragraph it follows is named.

### Change 1 (replace), in "Launch-time consent"

**Current:**

~~~~text
Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

**Proposed:**

~~~~text
Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by typing, and SHALL refuse, naming the missing consents and the command to run, when standard input is not a terminal, when an answer is not given, or when the answer is anything but the exact owner phrase the question names. The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before the answer is asked for: the proposed repository identity, how it was proposed (derived, taken from a matching record, or given by the operator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that the observation consent covers that one revision only; what the observation consent permits Syzygy to read; the operator's declaration whether the repository is public, asked for in the question; the drawer question below; for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement below would name, the classes labelled a preview, and that the agent sessions read the clone without restriction whatever classes the statement names; that the agent sessions can read everything the clone holds, its history, branches, tags, stash, reflogs and working tree included, that no consent covers what the clone holds beyond the pinned revision, and that Syzygy reads none of it; every existing record for the same repository identity, its state and its act; that each consent and statement is the owner's own act, revocable only by a later owner act naming it; and that only the owner may answer, never an agent. Where the operator does not declare the repository public, whether the declaration is that it is not public or no declaration is given, the question SHALL also state, before the answer is asked for, that a confirmed answer records the repository identity and its normalised URL in the launch consent records, which Syzygy commits on the dedicated reference below, in the observing project's own repository; that Syzygy never pushes that reference; and that one push of it would publish them. That statement is a warning only: the question SHALL ask for no confirmation of it, and it adds no answer, phrase or record field to those this requirement lists.
~~~~

### Change 2 (replace), in "Launch-time consent"

**Current:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`. Where the clone has no remote, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs share their last two path segments (`x/sub/name` and `y/sub/name`) derive one identity and, absent another match, share its records.
~~~~

**Proposed:**

~~~~text
The repository identity is declared by the owner's phrase; Syzygy only proposes it, and SHALL propose it by the rule below, never choosing one by any other means. The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the remote named `origin`, or else the clone's only remote, where that URL is in an admitted locator form (below), normalised by removing the scheme (`https`, `ssh` or the scp form `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`, and case-folding the host and the path. Where the normalised host is `github.com`, the identity is `repository:` followed by the last two path segments of the normalised URL joined by `-`; for any other host it is `repository:` followed by the host and every path segment of the normalised URL, joined by `-`; in both, every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` is replaced by `-`. Where the clone has no remote, or the URL that rule selects is not in an admitted locator form, the operator SHALL give the identity and upstream URL as options, and they are normalised the same way; the operator may give the identity option on any launch. The identity and normalised URL SHALL be labelled Inferred, attributed to their source, and disclosed with the statement that the clone's configuration lies within the agent sessions' write reach. An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record carries one and the same identity, that identity, so a repository whose URL has changed keeps the identity its records already carry; otherwise, where no record matches, the derived identity. Where matching records carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking, naming each matching record with its identity and how it matched, and the identity option; it SHALL NOT pick one by any precedence, because a guess would attach the run to another repository's records and statements without the owner seeing the choice. Where the operator gives an identity that a matching record does not carry, the question SHALL name every such record. The URL, recorded and derived, is a locator hint and never the identity. Three residuals SHALL be disclosed beside the record list, each labelled Inferred: a clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed; a fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream's identity and so relies on the upstream's drawer and provider statements unless the operator gives another identity; and two repositories whose normalised URLs differ only in a port, or only in characters the rule replaces by or joins with `-` (`a-b/c` and `a/b-c`, or a host and a GitHub owner of the same name), derive one identity and, absent another match, share its records.

A URL Syzygy takes as a locator, whether the operator gives it (`--url` or the upstream option) or Syzygy reads it from the clone's remote configuration, SHALL be in one of three admitted locator forms: `https://` followed by a host, an optional port and a path; `ssh://` followed by an optional user name and `@`, a host, an optional port and a path; or the scp form, an optional user name and `@`, a host holding no `/`, `:` and a path that does not begin with `//`. The normalised path SHALL hold at least one segment. An admitted locator carries no credentials: an `https://` URL carrying any user information, and any URL whose user information holds a `:`, is not admitted; an `ssh://` or scp-form user name alone is admitted, and normalisation removes it. A URL carrying a query or a fragment, or a percent-encoded character in its user information or host, a URL of any other scheme or transport (`http`, `git`, `file` and every other transport Git accepts), a local path, and a URL no form matches are not admitted. Syzygy SHALL refuse an operator-given URL that is not admitted, naming the rule it fails, and SHALL NOT print, store or record that URL. A remote URL that is not admitted derives nothing, as for a clone with no remote; where a remote URL carried user information, the launch output SHALL say so, and Syzygy SHALL NOT print, store or record that user information. Syzygy SHALL make no network request to resolve, check or reach a locator, and SHALL apply no rewriting of it from Git or SSH configuration (a URL rewrite rule or an SSH host alias), so an alias is the host it names. The normalised URL is the locator every launch consent record, the run record and every page carry, for every host. An observation consent made by any other act is found for a locator when that record's `Upstream:` URL, normalised by the same rule, equals the locator's normalised URL; a locator that found such a consent before this rule still finds it.

Whether the repository is public is the operator's declaration alone, for every host and form. Syzygy SHALL NOT infer it from the host, the scheme, a user name or whether the operator's clone needed a credential, SHALL make no request to learn it, and the question SHALL NOT suggest an answer. A repository that the operator does not declare public is not public under the effective screening policy, whatever its host.
~~~~

### Change 3 (insert), in "Launch-time consent"

**Current:**

(nothing: inserted after the paragraph that begins "- **WHEN** one record matches the run by URL and another by a parent commit, they carry different id")

**Proposed:**

~~~~text
#### Scenario: Locator on another host over ssh

- **WHEN** the clone's `origin` remote is `git@git.example.org:team/sub/tool.git` and no record matches the run
- **THEN** the question proposes the identity `repository:git.example.org-team-sub-tool` and the normalised URL `git.example.org/team/sub/tool`, each labelled Inferred
- **AND** a confirmed answer records that normalised URL, and the run record and every page carry it

#### Scenario: GitHub identities keep their form

- **WHEN** the clone's `origin` remote is `ssh://git@github.com/redis/redis.git` or `https://github.com/redis/redis`
- **THEN** the proposed identity is `repository:redis-redis` and the normalised URL `github.com/redis/redis`, as before this rule

#### Scenario: Credentials in a given URL

- **WHEN** the operator gives `--url` or the upstream option as an `https://` URL with user information, or any URL whose user information holds a `:`
- **THEN** Syzygy refuses before asking, naming the rule the URL fails, and the URL appears in no output, record or page

#### Scenario: Credentials in a remote URL

- **WHEN** the clone's `origin` remote URL carries user information on `https://` and the operator gives no upstream option
- **THEN** that URL derives nothing, the launch output says the remote URL carried user information without printing it, and Syzygy asks for the identity and upstream options as for a clone with no remote

#### Scenario: Locator not admitted

- **WHEN** the operator gives an `http://`, `git://` or `file://` URL, a local path, or a URL with a query or fragment
- **THEN** Syzygy refuses before asking, naming the rule the URL fails, and makes no network request

#### Scenario: Visibility on another host

- **WHEN** the clone's remote is on a host other than `github.com` and the operator gives no declaration whether the repository is public
- **THEN** the question suggests no answer, Syzygy makes no request to learn the repository's visibility, and the repository is not public under the effective screening policy
~~~~

### Change 4 (replace), in "Launch-time consent"

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
- **Case:** Start operator-agent runs against controlled clones and fixture governance homes, varying independently: whether standard input is a terminal; the answer (exact phrase, other text, none, each record accepted or declined, each drawer answer, public declared, declined or not given); the tree's governed conditions and assigned classes; the clone's remotes and URLs, in each admitted locator form and in forms not admitted, on `github.com` and other hosts, with and without user information; the identity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying one identity or several, including an in-force statement with and without covering classes; the write consent's presence, effect, reference and location; an A1 mechanism present or absent; whether the clone's working tree, Git directory or common Git directory is the governance home's; owner placements at and away from the pinned revision; and whether an execution choice was recorded.
- **Observable:** The question text, the phrase asked for, refusals and their reasons, the objects read before and after the answer, the commits on the dedicated reference and their trees, every other reference, working tree and index of the governance home before and after, each record's fields and bound digest, the brief's execution rule, withheld files, and the human and machine disclosures.
- **Oracle:** Expected questions, phrases, refusals, identities, normalised URLs, record sets, field values and withheld files derived from the fixture homes, clones and placements by an independent `git` reading, prepared before the run; each record's digest recomputed independently from its bytes.
- **Oracle independence:** Fixture homes, clones and expected outcomes are written outside the code under test. Object reads are captured by an instrumented object store, a fixture clone served through a read-logging layer outside the code under test that records each object identifier and type read, never by Syzygy's own record. Commits, references, working trees and indexes are compared by an independent listing before and after.
- **Falsifier:** A blob is read, or any commit field other than the root tree, parents and committer date is used, before a confirmed phrase or in-force records; anything from a pre-answer read is stored outside the question, launch output and records; the question omits any statement this requirement lists, including that only the owner may answer and the existing records with their states; a record is created without the exact phrase, without a terminal, without the write consent, without a declaration whether the repository is public, or, once an A1 mechanism is in force, without a state selection; one record carries two of observation consent, drawer statement and provider statement; a provider statement is created for a non-governed subject, or a second one for a subject and provider whose in-force statement covers the classes; a drawer statement is created on any answer but that none exists; a record names more than the pinned revision; a file is edited or removed, a working tree, index or reference other than the dedicated one changes, or the trunk tip moves; Syzygy pushes the dedicated reference; the proposed identity differs from the proposal rule, or is presented as Observed; a launch whose matching records carry more than one identity, with no identity option, is not refused before asking; the URL is recorded or rendered as the identity; a locator not in an admitted form is admitted, or a URL carrying credentials, or its user information, is printed, stored or recorded; a `github.com` locator derives an identity other than the two-segment form, or another host's an identity without its host and every path segment; Syzygy makes a network request for a locator or applies a rewriting of it; an observation consent made by another act is not found by its normalised `Upstream:` URL; visibility is inferred from the host, scheme, a user name or a credential, or the question suggests an answer; the question omits that the agent sessions can read everything the clone holds beyond the pinned revision; the pre-answer classes are not labelled a preview; a matching revoked record is not named; a run on the governance home's working tree or Git directory is not refused; an in-force record set is not reused; a disclosure this requirement lists is missing from the run record or a page; a file a placement would have placed renders other than Unknown; for a repository the operator does not declare public, the answer is asked for before the question states that the repository identity and its normalised URL are recorded on the dedicated reference in the observing project's own repository, which Syzygy never pushes and one push of which would publish them, or the question asks for a confirmation of that statement or adds an answer, phrase or record field for it; an execution choice is asked for or recorded; or who answered is presented as Observed.

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

### Change 5 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.
~~~~

**Proposed:**

~~~~text
In the operator-agent mode, a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states, and this requirement changes nothing else for it. Every other run SHALL pin exactly one revision at launch, before the question of REQ-polaris-generation-046 is asked, and that revision SHALL NOT change within the run. Absent `--revision`, it SHALL be the commit the repository's trunk points to in the operator's clone: the branch the clone records as its remote's default (the remote's `HEAD` reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch. Where none of these exists, Syzygy SHALL refuse, naming `--revision`. The remote's default is the commit that the remote-tracking branch named by the symbolic reference `refs/remotes/<remote>/HEAD` points to, where the remote is `origin` when it records one, or else the one remote that records one; where several remotes record one and none is `origin`, the clone records no single remote default, and Syzygy SHALL refuse, naming `--revision`. `main` and `master` are the local branches `refs/heads/main` and `refs/heads/master`. While a remote default is recorded, no local branch is consulted: where a local branch of the same name points elsewhere, the launch output SHALL state both identifiers and that a local commit is not the trunk default. With `--revision`, the pinned revision SHALL be the commit the operator names, given as a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused.
~~~~

### Change 6 (replace), in "Trunk-tip revision pinned at launch"

**Current:**

~~~~text
Syzygy SHALL NOT change the clone's checkout. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.
~~~~

**Proposed:**

~~~~text
Syzygy SHALL NOT change the clone's checkout. HEAD may be detached or name a branch; only the commit it resolves to is compared with the pinned revision. Where the clone's HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the pinned revision, so that REQ-polaris-generation-033's HEAD check holds at the brief, with the warning that a checkout carries uncommitted changes over. The pinned revision is the revision the launch consent names; REQ-polaris-generation-033's rules for it apply unchanged.

For a launch-consented run, Syzygy SHALL accept the operator's clone in whatever form holds the pinned revision: a full clone with its history, branches, tags, remote-tracking references, stash and reflogs, a clone made by fetching one commit alone, or any form between. It SHALL NOT refuse the clone for holding commits, objects or references beyond the pinned revision, and SHALL NOT fetch, prune, repack or otherwise change it. Whatever the clone holds, Syzygy's reads for the run stay those REQ-polaris-generation-033 and REQ-polaris-generation-046 permit, and are only these:

- objects: the pinned commit object, its root tree and the trees and blobs reachable from it, reached by walking down from the commit; Syzygy SHALL read no parent commit object and no object reached only from another commit, a branch, a tag, the stash, a reflog or a note, and SHALL use the pinned commit's parent identifiers only as REQ-polaris-generation-046 uses them, never resolving one;
- pack storage: where a pack stores an object of that scope as a delta, Syzygy MAY read the stored bytes of the delta's base, whichever object they belong to, solely to reconstruct that object, which it then re-hashes as REQ-polaris-generation-033 requires; it SHALL NOT use a base reached this way for anything else, and SHALL NOT classify, store, quote, record a digest of or render it;
- references: the names of the clone's references, and the values only of `HEAD`, the references the trunk rule above names and the reference `--revision` names, each read as file data from the loose reference files and `packed-refs`;
- configuration: the clone's own configuration file, read as text only for its remotes' names and URLs and never honoured, so no include, URL rewrite, hook path, object format or other setting it states changes a read; and the files that locate the Git directory and the common Git directory;
- nothing else in the Git directory, and nothing in the working tree or the index. Syzygy SHALL NOT read either to learn whether the checkout holds uncommitted or untracked changes, and SHALL start no process in the clone, so no hook or filter runs.

A clone whose objects of that scope cannot be read without an alternate, a replacement object or a fetch, a partial clone missing one included, SHALL be refused as REQ-polaris-generation-033 states, and Syzygy SHALL NOT fetch the missing object. Because Syzygy reads no working tree, it cannot tell whether the checked-out files differ from the pinned revision, while the agent sessions read them: the launch output, the run record and every page SHALL state that the working tree was not inspected and may differ from the pinned revision, and the launch output SHALL print the operator's own command that lists such changes (`git -C <clone> status --short`). The brief of a launch-consented run SHALL tell the authoring agent to rest no claim on any commit but the pinned revision and not to read the clone's history or other references; that the agent complied is its own report, labelled Inferred. This changes nothing for a run that relies on no launch consent record: whatever form its observation consent record states for the clone still binds that run.
~~~~

### Change 7 (insert), in "Trunk-tip revision pinned at launch"

**Current:**

(nothing: inserted after the paragraph that begins "- **WHEN** the pinned revision is the trunk tip and the clone's HEAD is another commit that no in-fo")

**Proposed:**

~~~~text
#### Scenario: Existing full clone at the trunk tip

- **WHEN** the operator starts a run with no `--revision` on a full clone whose `refs/remotes/origin/HEAD` names `refs/remotes/origin/main`, whose HEAD is the commit that branch points to, and whose pinned commit no in-force consent names
- **THEN** Syzygy pins that commit, asks the question, and does not refuse the clone for its history, branches, tags or other references
- **AND** the objects read are the pinned commit, its root tree and the trees and blobs reachable from it, with no parent commit object, and no delta base reached in a pack is classified, stored, quoted, recorded or rendered
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

#### Scenario: A consent that states the clone's form

- **WHEN** a run relies on an observation consent made by another act whose record states that the operator fetches the consented commit alone, and on no launch consent record
- **THEN** that stated form still binds the run, and this requirement admits no other clone form for it
~~~~

### Change 8 (replace), in "Trunk-tip revision pinned at launch"

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
- **Case:** Start runs against controlled clones and fixture consent records, varying the clone's form (full with history, branches, tags, stash and reflogs; one commit alone; partial with a missing object; with an alternates file; packed with deltas whose bases lie outside the pinned tree), the remotes recording a default and their names, a local branch that differs from the remote default, uncommitted and untracked changes, a detached or attached HEAD, the remote default reference, the presence of `main` and `master`, HEAD, whether an in-force consent names HEAD, whether the clone's remote derives that consent's subject identity or another (a fork or mirror remote), and `--revision` (full, abbreviated, ambiguous, unknown, a reference), with network access captured.
- **Observable:** The pinned revision, its stated reference and date, the did-not-fetch statement and update command, refusals and the point at which each is made, the objects, references and files read in the clone, the working-tree statement and status command, the brief's history instruction, the clone's references and working tree before and after, and captured network effects.
- **Oracle:** Expected pins, statements and refusals derived by an independent `git` reading of each fixture clone and the fixture records, prepared before the run.
- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; network effects come from an independent capture; object, reference and file reads come from a read-logging layer outside the code under test, as for REQ-polaris-generation-046.
- **Falsifier:** A run pins a commit other than the rule's; a run whose HEAD an in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; a HEAD mismatch is not refused, or is refused only after the question; the launch output or run record lacks the full revision, its reference, the committer date, the did-not-fetch statement or the update command; Syzygy fetches, contacts a host, or changes the clone's checkout or references; or the trunk tip is presented as the upstream's latest as Observed; a launch-consented run refuses a clone for holding history, branches, tags or other references; Syzygy reads a parent commit object, an object reached only from another commit or reference, the working tree, the index, or a file of the Git directory this requirement does not list, honours a setting of the clone's configuration, or starts a process in the clone; a delta base reached in a pack is used for anything but reconstructing the in-scope object, or is classified, stored, quoted, recorded or rendered; a missing object is fetched or taken from an alternate; a local branch is consulted while a remote default is recorded, or several remote defaults with none `origin` are not refused; the working-tree statement, the status command or the brief's history instruction is missing; or a run relying on another act's consent that states the clone's form is admitted in another form.

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
