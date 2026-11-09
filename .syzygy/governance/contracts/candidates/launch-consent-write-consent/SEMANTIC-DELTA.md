# Semantic delta — write consent for launch consent records

> **Candidate — binds nothing.** Drafted 2026-11-09 for bead `syzygy-pdja.22`.
> Effect comes only from an owner act over the record's exact bytes at this
> package's manifest row. No act is recorded here, and nothing here grants,
> signs or records a consent.

## Class

Normative: one new consent record of the class write (RFC5-12), for
`project:syzygy`'s own repository. It is the precondition
REQ-polaris-generation-046 names for writing launch consent records. It
changes no specification, contract, policy or doctrine byte, and no existing
consent.

## Subject and change

Before: no write consent of any kind is in force for any repository
[Observed: the 2026-11-08 screening-scope selection says "it grants no write
consent", `.syzygy/governance/decisions/OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md:14`;
a case-insensitive sweep of the 2026-11-09 tree of `.syzygy/governance/decisions/`
for `write consent`, `write-consent` and `Consent class: write` hits 8 of its
211 files and none is a record of the class: each says an act grants no
write consent, calls this one still to be drafted, indexes such a record, or
(the trusted-bootstrap direction, line 41) says write consent stays per
repository. Second method: no upper-case act phrase in
`ACCEPTANCE-ACT-RECORD.md` contains `WRITE`].
REQ-polaris-generation-046 then refuses every launch that would record
anything.

After, if the owner acts on the record: Syzygy may add launch consent records
as new files under `.syzygy/governance/decisions/launch-consent/`, each set in
one recording commit on `refs/heads/launch-consent-records` of the governance
home, and may write nothing else. The record is
`instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`, rendered from
`templates/WRITE-CONSENT-TEMPLATE.md` and `instances/syzygy/params.json` by
`scripts/build_launch_consent_write_consent.py`.

## What it serves, quoted (rule 8)

The owner's answer,
`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md:103-105`:

> "A. Grant one narrow write consent (only launch consent records, only
> as new files on one dedicated branch of Syzygy's governance home); Syzygy
> commits each record there, never touching your working tree".

and lines 109-110: "it grants no write consent. The write-consent instance is
drafted, reviewed and offered to the owner as its own act."

REQ-polaris-generation-046, in
`openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
at v1.0 on `main`. The owner signed v1.1 on 2026-11-08; its sign-off record
is on PR #800 and not yet on `main`. [Observed: lines 17, 23 and 29 are
byte-identical lines of both versions, at the same numbers; the falsifier
fragment quoted from line 161 stands unchanged inside v1.1's line 167, a
line v1.1 otherwise edits.]

- Line 29, the precondition: "Syzygy SHALL write launch consent records only
  under an in-force write consent for the observing project's own repository
  (RFC5-12; SEC-4) whose scope names this record class, the dedicated
  reference and the location in its tree. Absent that consent, Syzygy SHALL
  ask nothing, refuse, and name the consent that is missing. Every recording
  commit adds new files only, never edits or removes one, and is attributed
  to Syzygy and the operator; it is revertable by a revocation act, and
  before it is relied on by removing the commit from the dedicated reference.
  Syzygy SHALL NOT push or otherwise publish the dedicated reference;
  publication is the operator's act."
- Line 23, the reference and where records sit: "Syzygy SHALL make that
  recording commit itself, on one dedicated reference of the governance home
  that the write consent names (a branch under `refs/heads/`, as the owner's
  answer to Q3 and Q4 calls it), which SHALL NOT be the trunk, the current
  branch or any reference a run may pin; it SHALL create the record files and
  the commit without changing any working tree, index or other reference, and
  the commit's tree on that reference SHALL hold the records under
  `.syzygy/governance/decisions/`."
- Line 17: records are created "at the location the owner's write consent
  names".
- Line 161, the falsifier this consent must not license: "a file is edited or
  removed, a working tree, index or reference other than the dedicated one
  changes, or the trunk tip moves; Syzygy pushes the dedicated reference".

The spec leaves the reference's name and the location inside `decisions/` to
the write consent. This record names them.

The consent class, RFC5-12
(`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md:102-103`):
"**Write consent** — per repository: Syzygy may write its two namespaces and
reach declared adapter effects (SEC-4). Absent: read-only." and line 111:
"Every consent record names its class, subject, scope, granting principal,
grant instant, and revocation state." RFC3-7
(`.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md:260-263`):
"**Observation/write consent** (SEC-4): subject is the pair *(observing
Project, repository)*; scope enumerates what is consented — observe, write
(governance-root plane only), …". SEC-4
(`.syzygy/governance/doctrine/security.md:112-121`): "Syzygy writes into a
governed repository only with recorded consent, and every write can be traced
and undone", each write "attributed to Syzygy, atomic, and individually
revertable", with "No silent overwrite".

How the record meets each:

| Requirement | Where the record meets it |
|---|---|
| Names the record class | `Record class written:` line |
| Names the dedicated reference, a branch under `refs/heads/`, not the trunk | `Dedicated reference:` and `Trunk:` lines; the builder refuses `refs/heads/main`, `refs/heads/master`, the trunk field and any non-branch |
| Names the location, under `decisions/` | `Location in its tree:`; the builder refuses any location outside `.syzygy/governance/decisions/` |
| New files only | Scope: the tree differs from the parent's "only by files it adds"; edits, removals, renames and mode changes excluded |
| No working tree, index or other reference | Scope exclusions |
| Not the current branch | Exclusions: Syzygy writes nothing while the reference is any worktree's current branch |
| Never pushed | Exclusions: pushing and every other network operation |
| Attributed to Syzygy and the operator | Scope, last sentence |
| Revertable | "Reverting a write": by owner act, or by the operator removing the commit before reliance; Syzygy never removes one |
| RFC5-12 fields: class, subject, scope, principal, instant, revocation | `Consent class`, `Subject`, `## Scope`, `Owner`, the act's own instant, `Proposed revocation state` |
| Narrower than RFC5-12's "two namespaces" | One location inside `.syzygy/`; nothing in `openspec/`; no adapter effect |

## What depends on it

- **Screening scope version 8**
  (`../public-source-screening-scope-v8/SEMANTIC-DELTA.md:56-61`): its
  record population is "every file that a recording commit on the dedicated
  reference added at the launch records' location (recording commits add
  new files only), … and no file the reference holds that no recording
  commit added". [Inferred] That population is well defined only if
  recording commits are exactly add-only commits at one named location; this
  record's scope is that rule, so a write it permits cannot put a file in
  that population by an edit, and cannot put one outside it at the location.
  It does not stop a non-Syzygy writer (an agent session, the operator)
  committing to the branch: such a commit is not a recording commit, and
  version 8 already excludes the files it adds only if the reader can tell
  recording commits apart. Telling them apart is the implementation's job
  under REQ-polaris-generation-046's attribution rule, not this record's.
- **Implementation**: REQ-polaris-generation-046's write path checks this
  record's effect before asking anything. It must make every write with the
  governance home's hooks disabled: a reference move would otherwise run a
  `reference-transaction` hook, which is execution the record does not grant
  (round 1, finding 3). It must make a recording commit's parent the tip it
  read, and move the reference only if the tip is still that commit. No
  implementation is authorized by this record; it is a consent, not a
  direction.

## Spec note for a later launch-consent version (not a change here)

Round 1, finding 6 [Inferred]: REQ-polaris-generation-047 accepts with
`--revision` "a reference the clone holds" (spec line 176), so every branch
of any clone may be pinned, and spec line 23's "SHALL NOT be … any reference
a run may pin" cannot be met by any branch as written. Spec line 27 refuses
a run on the governance home's own working tree or Git directory, so
`refs/heads/launch-consent-records` itself is never pinned; a separate clone
made from the governance home carries it only as a remote-tracking
reference. No byte of the spec is edited here. A later launch-consent
version could read "SHALL NOT be the trunk, the current branch or the
reference a trunk-default pin resolves to", or refuse `--revision` naming
the dedicated reference, for the owner to choose.

## Choices this draft makes [Inferred]

Each is fixed in the bytes and may be changed by the owner before signing (a
change is a regenerated record and a new review round):

1. **The reference name**, `refs/heads/launch-consent-records`: a flat name,
   so it cannot collide with a branch named `syzygy` (Git refuses a branch
   `a` beside `a/b`), and it names what it holds.
2. **The location**, `.syzygy/governance/decisions/launch-consent/`: a
   subdirectory of the home the spec requires, so screening scope 8's
   population has a narrow home of its own.
   [Inferred] "under `.syzygy/governance/decisions/`" (line 23) includes a
   subdirectory; the reviewer is asked to confirm it.
3. **The subject's identity**, `repository:tzeusy-org-syzygy`: what
   REQ-polaris-generation-046's proposal rule derives from the `origin` URL
   `https://github.com/tzeusy-org/syzygy`. A self-observation launch
   (from a separate clone, spec line 27) proposes the same identity only
   when that clone's remote is that GitHub URL. A clone made from the local
   governance home has a filesystem path as its `origin`, and the rule then
   derives another identity (the builder's `derived_identity` gives
   `projects-syzygy` for `/home/orca/orca/projects/syzygy`), so that launch
   proposes a second identity for the same repository unless the operator
   gives this one as the identity option. No consent fails either way: this
   record's subject is the governance home, not the observed clone, and it
   names no revision or URL a launch matches on (round 1, finding 5). No
   earlier record gives Syzygy's own
   repository an identity [Observed: a sweep of `.syzygy/` and `openspec/`
   for `repository:` finds three identities, `redis-redis`,
   `butlers-configured-poc` and `psf-requests`].
4. **The recording commits' parents** are fixed (round 1, finding 1). The
   branch's first recording commit has no parent; every later one has
   exactly one, the branch's tip at the moment of the move; no recording
   commit takes any other commit as a parent, a trunk commit or a commit
   removed from the branch included. So the branch shares no history with
   the trunk, and an operator who deletes the branch, or moves it back,
   really removes the records: no later recording commit can bring a
   removed commit back onto the branch, which a free parent would have
   allowed. `--check` refuses a scope without the rule.

## What it does not do

- It grants no observation, egress or execution consent, records no drawer
  or provider statement and admits no repository.
- It writes nothing itself and authorizes no implementation.
- It does not touch `openspec/`, any policy or any act record, and gives
  Syzygy no write to the trunk or to the current branch.
- It does not make the records it permits in force; each is its own act.
