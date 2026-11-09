# Round 1 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 1 (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-1-RAW.md`) read commit
> `bec95fd4` and the post-apply digest its head names, and returned `REVISE`
> (line 4): three revise findings and nine notes. This page says how each
> was disposed. Every quotation below is copied by script from the
> post-apply spec of this commit; the line numbers are that file's.
> Nothing here is a review or a verdict on the repairs; a fresh round
> decides that.

## 1 — The pre-answer read list and the closed list disagree

**Disposed: repaired as the reviewer proposed.** REQ-046's pre-answer list
now names the launch reads of references, configuration and Git-directory
files, apart from the object reads (line 9):

> Before the answer Syzygy SHALL read only what the question needs, and only these: the launch reads that REQ-polaris-generation-047 lists, which are not observer object reads and read no repository content, namely the names of the clone's references and the values that requirement lists, read as file data, the clone's configuration file, read as text only for its remotes' names and URLs, and the files that locate the Git directory and the common Git directory; and, as Git objects by object identifier, each rebuilt from a delta base only as REQ-polaris-generation-047 permits, the pinned commit object,

REQ-047's lead-in no longer says these reads "stay those
REQ-polaris-generation-033 and REQ-polaris-generation-046 permit"; it names
the two kinds and the rule each falls under (line 244):

> Whatever the clone holds, Syzygy's reads of it for the run are only these. The object reads are Git object reads by object identifier, as REQ-polaris-generation-033 and REQ-polaris-generation-046 state them. The reference, configuration and Git-directory reads are launch reads, not observer object reads: Syzygy makes them only to pin the revision, to compare HEAD with it and to propose the identity, and they read no repository content, so REQ-polaris-generation-033's object-read rule governs every read of content:

REQ-046's falsifier gains the arm the reviewer asked for (line 223):

> before the answer Syzygy reads anything the pre-answer list does not name, or reads the configuration for anything but its remotes' names and URLs;

`SEMANTIC-DELTA.md` D2 ("Two kinds of read, under two rules") and D9 (the
registry's "no ref … configuration" read as scoped to the adapter) follow.

## 2 — The `Upstream:` lookup has no stated effect, and its "never found" contradicts 047 and 046

**Disposed: repaired as the reviewer proposed.** The sentence now says what
the match grants (a matching record, named in the question, and an in-force
consent the run holds where it names the pinned revision), that it adds to
and never restricts REQ-046's matching and REQ-047's revision branch, and
bounds the claim to the URL match (line 17):

> An observation consent made by any other act, which records no normalised URL, also matches the run by URL, as an existing record above, when its `Upstream:` URL, normalised by the same rule, equals the derived URL, host and whole path; it is then a matching record for the identity proposal and the record list, named in the question with how it matched, and where it names the pinned revision it is an in-force consent the run holds, so the question asks for no new observation consent. This match adds to the matching above and never restricts it, nor the revision branch of REQ-polaris-generation-047: a record that does not match by URL may still match by identity or by naming the pinned revision or a parent, and a HEAD that any in-force consent names is pinned as that requirement states. By URL alone, a consent is never matched for a same-named repository on another host or under another group.

The scenario "Same-named repository on two hosts" now says the consent
"does not match by URL, though where its subject identity is
`repository:a-b` it matches by identity and is named so", and a new
scenario, "Consent found by its upstream URL", pins the effect. D7 and the
"What does not change" bullet are corrected: a run relying on another act's
consent does get the new URL match, which removes none.

## 3 — The recorded scope says "and nothing else" while delta bases are inflated under it

**Disposed: repaired both ways the reviewer offered.** The question states
it (line 11):

> what the observation consent permits Syzygy to read, including that objects of the pinned tree may be rebuilt from delta bases stored outside it, whose stored bytes Syzygy inflates only for that and never reads as content;

The launch observation consent's recorded scope is qualified (line 21):

> scope the pinned revision's commit object and the tree and blob objects reachable from its root tree, and nothing else, save that the stored bytes of a delta base outside that scope may be inflated solely to rebuild an object within it, as REQ-polaris-generation-047 states,

The launch output joins the run record and pages in carrying the statement
(line 247):

> and the launch output, the run record and every page SHALL state that objects of the pinned tree may have been rebuilt from delta bases outside it, whose stored bytes were inflated only for that and never read as content;

REQ-046's falsifier gains the arm "the question or the launch output omits
that objects of the pinned tree may be rebuilt from delta bases outside it".

## 4 — Question (a): the registry entry admits the delta-base reads

**Disposed: carried to the owner, no spec change.** The finding is a note
for the owner and agrees with the package's reading. D9 now adds the third
reading the reviewer named (the entry's "no ref … repository-local
configuration" as scoped to the adapter, which holds because finding 1's
repair says the launch reads are not observer reads) and records that the
narrow readings have purchase. `OWNER-SIGNOFF.md`, "Before you sign" item
3, puts it to the owner: agree, or ask for a registry successor first.

## 5 — Question (c): keeping typed URLs at https, ssh and scp narrows v1.1

**Disposed: repaired by admitting typed `http://` and `git://`, as v1.1
does, credentials still refused.** [Observed] v1.1 admits them: REQ-046
normalises the typed upstream "the same way", and its scheme list holds
`http` and `git`. [Inferred] The coordinating session read the owner's
"Keep proposing for http/git" as a preference against narrowing v1.1 and
directed this repair; the reading is the coordinating session's, made in
that session, not the owner's words. D6 labels it so, and
`OWNER-SIGNOFF.md` "Before you sign" item 1 flags it for the owner. The
locator rule now reads (line 17):

> A URL the operator gives as a locator (`--url` or the upstream option) SHALL be in one of the admitted locator forms, the schemes the derivation above normalises: `https://`, `http://` or `git://` followed by a host, an optional port and a path; `ssh://` followed by an optional user name and `@`, a host, an optional port and a path; or the scp form, an optional user name and `@`, a host holding no `/`, `:` and a path that does not begin with `//`. An operator-given URL carries no credentials: an `https://`, `http://` or `git://` URL carrying any user information, and any URL whose user information holds a `:`, is not admitted; an `ssh://` or scp-form user name alone is admitted.

The scenario "Remote over http or git" became "Remote or given URL over
http or git"; "Locator not admitted" no longer lists `http://` or `git://`;
"Credentials in a given URL" covers all three schemes and a bare user name.
The ledger's "Narrower: typed http and git" is replaced by "Not narrower".

## 6 — Under full clones, `--revision` resolution meets objects the closed list forbids

**Disposed: repaired.** REQ-047 states both rules the reviewer proposed
(line 238):

> An abbreviated identifier resolves to more than one when more than one object identifier the clone stores begins with it, decided from the loose object file names and the pack indexes alone, without reading those objects. A reference that names an object other than a commit, an annotated tag included, SHALL be refused, naming `--revision`, after Syzygy reads at most that one object's type, and SHALL NOT be followed to the object it names.

Two scenarios, "Revision naming an annotated tag" and "Ambiguous
abbreviation", and a falsifier arm pin it. [Observed, by the reviewer] The
implementation already refuses a non-commit and treats a shared prefix as
ambiguous without reading.

## 7 — The closed list's wording leaves needed reads unnamed

**Disposed: repaired, every item.**

- Storage named (line 246):

> commit, from the loose object files, the pack files and the pack indexes under `objects/`;

- `HEAD` and its target, the local branch of the remote default's name, and
  the reftable backend, which the text was silent on and is now refused
  before the question, fail-closed (line 248):

> - references: the names of the clone's references, and the values only of `HEAD` and the reference it names, the references the trunk rule above names, the local branch of the remote default's name, and the reference `--revision` names, each read as file data from the loose reference files and `packed-refs`; a clone that stores its references otherwise (the reftable backend) SHALL be refused before asking for consent, naming the reason;

- "Consulted for the pin" (line 238):

> no local branch is consulted for the pin

- The process wording, aligned so that a process run from elsewhere is
  plainly excluded (line 250):

> SHALL start no process that reads or acts on the clone, wherever that process runs (a Git command given the clone's Git directory from elsewhere included), so no hook or filter runs.

[Inferred] The reftable refusal is a choice: reading reftable would be a
read the list does not name, and admitting it unread would leave the pin
undefined. Whether the implementation refuses it today is [Unknown]. A
scenario, "References in the reftable backend", pins it.

## 8 — The history disclosure reaches the question only, and the instruction the authoring agent only

**Disposed: repaired, both parts.** The run record and pages carry the
history reach (line 37):

> that the agent sessions could read everything the clone holds beyond the pinned revision, its history, branches, tags, stash, reflogs and working tree included, which no consent covers and of which Syzygy read none;

The instruction now goes to every agent session, review sessions included,
since they read the same clone (line 252):

> Every brief and packet Syzygy issues to an agent session of a launch-consented run, the authoring and the review sessions alike, SHALL tell that session to rest no claim on any commit but the pinned revision and not to read the clone's history or other references; that a session complied is its own report, labelled Inferred.

## 9 — The no-print rule protects user information only

**Disposed: repaired as the reviewer proposed** (line 17):

> A remote URL that is not a remote locator derives nothing, as for a clone with no remote, and Syzygy SHALL NOT print, store or record it: the launch output SHALL name the remote and the rule its URL fails, never the URL.

A scenario, "Remote URL that is not a locator", and a falsifier arm pin it.

## 10 — Normalisation merges more than the stated residuals

**Disposed: carried to the owner, no spec change.** As directed, the point
goes to the owner rather than into the spec. `OWNER-SIGNOFF.md`, "Before
you sign" item 2, states it plainly: the unchanged rule drops any port and
case-folds the host and path, so two servers on one host at different
ports, or two repositories differing only in case on a case-sensitive host,
share one normalised URL and one identity, and each matches the other's
records. It offers three answers: accept it, disclose it as a fourth
residual with the rule's bytes unchanged, or change the rule. D7 and the
ledger's costs record it as carried.

## 11 — The rule-9 table's third column is a judgement with no stated predicate

**Disposed: repaired.** `SEMANTIC-DELTA.md`'s sweep now states the
predicate for "pins", publishes the raw hit counts per population (1, 2,
13, 3, 1 and 8 files, equal to the reviewer's), and names every hit file
with the reason it does or does not pin. [Observed] The counts were
re-derived by script at `715c59c4` over `git ls-tree -r -z`, with the seven
published forms.

## 12 — The owner page understates two rules

**Disposed: repaired, one clause each.** `OWNER-SIGNOFF.md` now says a typed
`https://`, `http://` or `git://` URL with any user information, "even a
bare user name", is refused, and gives the trunk rule's one-other-remote
case and its refusal "where several do and none is `origin`".
