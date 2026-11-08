# Write consent — launch consent records on one dedicated branch

> Template. Replace every `{{…}}` field; a filled record with any `{{` left is
> invalid. Candidate — binds nothing until the owner acts on the filled record.

Date: {{DRAFT_DATE}} (drafted); the act, if performed, records its own instant

Owner: {{OWNER}}

Record ID: `WRITE-CONSENT-LAUNCH-RECORDS-{{DRAFT_DATE}}`

Record version: `{{VERSION}}`

Consent class: write (RFC5-12; SEC-4)

Subject: `(project:syzygy, repository:{{REPOSITORY_ID}})`, the observing
project and its own repository, the governance home of `project:syzygy`

Repository identity: `repository:{{REPOSITORY_ID}}` [Inferred]: derived from
the upstream below by REQ-polaris-generation-046's proposal rule; this record
declares it

Upstream: {{UPSTREAM_URL}} (a locator hint, never the identity)

Record class written: launch consent records (REQ-polaris-generation-046):
observation consent records, drawer statements and agent-provider statements
recorded at launch, and nothing else

Dedicated reference: `{{REFERENCE}}`

Location in its tree: `{{LOCATION}}`

Trunk: `{{TRUNK}}`

Proposed provenance state: `owner-adopted (bootstrap, uncorrelated)` —
state (1), RFC3-16; A1 audit-record identity explicitly absent

Proposed revocation state: {{REVOCATION}}

## Scope

Syzygy may write launch consent records into a Git repository of
`repository:{{REPOSITORY_ID}}` that it uses as `project:syzygy`'s governance
home, and may write nothing else under this consent. Each write is one
recording commit made for one confirmed launch answer, and is exactly:

- the Git objects that commit needs, written to that repository's object
  database: one blob per new record file, the tree objects that hold them,
  and the commit object itself;
- the reference `{{REFERENCE}}`: created when it is absent, pointing at that
  recording commit; otherwise moved from its current tip to a recording
  commit whose only parent is that tip, and in no other way. Git's own log
  entry for that reference move is part of the same write.

Every recording commit has at most one parent. Its tree differs from its
parent's tree, or from the empty tree when it has no parent, only by files
it adds at paths under `{{LOCATION}}` that the parent's tree does not hold.
It edits, removes, renames or changes the mode of no file, and adds no file
outside that location. Each added file is one launch consent record. The
commit is attributed to Syzygy and the operator.

The scope excludes:

- `{{TRUNK}}`, the current branch of any of that repository's worktrees, and
  every reference other than `{{REFERENCE}}`, including tags, remote-tracking
  references, notes and the stash. While `{{REFERENCE}}` is the current
  branch of any worktree of that repository, Syzygy writes nothing under this
  consent;
- every working tree, every index and `HEAD`, the repository's configuration
  and hooks, and any object the recording commit does not need;
- deleting, rewinding, resetting or force-moving `{{REFERENCE}}`, and
  removing any commit from it;
- pushing, or in any other way publishing, `{{REFERENCE}}` or any object on
  it, and every other network operation. Publication is the operator's own
  act;
- any record of another class, including act records, run records and
  owner direction records, and any file outside `{{LOCATION}}`;
- any other repository, including the clone a run observes; and
- read, egress and execution, which other records govern.

## What it does not do

It grants no observation consent, records no drawer or provider statement,
and admits no repository: each launch consent record is the owner's own
act, given by typing its exact phrase at launch. It does not make any record
in force. A launch consent record is in force only from its own owner-act
record and the recording commit that contains it
(REQ-polaris-generation-046). It changes no specification and no policy.

## Reverting a write

A launch consent record is revoked or superseded only by a later owner act
naming it (RFC5-13). Where a later launch answer supersedes one (a wider
provider statement, REQ-polaris-generation-046), the superseding record is a
new file; the earlier file is never edited or removed. A revocation made by
any other owner act is that act's own record, which this consent does not
write. Before any run relies on a recording commit, the
operator may remove it from `{{REFERENCE}}` with Git; that is the operator's
own act, outside this consent, and Syzygy never does it.

## Withdrawal and change

Withdrawal is a later owner act naming this record. It is prospective
(RFC5-13): from its instant Syzygy asks nothing at launch, refuses and names
this consent as missing (REQ-polaris-generation-046). Records already on the
reference stay, each governed by its own act. A change to the reference, the
location or the record class is a new version of this record, signed
separately.
