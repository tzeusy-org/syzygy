# Owner decision packet — public-admission registry entries

> **Withdrawn by D10, marked 2026-11-21.** This offering was never performed and is not performed now. Never offer it to the owner
> again. D10 retired the owner act this package offered (`governance-simplification-d10/RETIREMENTS.md` §C); the change it carried, if still wanted, is an agent adoption recorded in `decisions/AGENT-ADOPTIONS.md`.
> Everything below is history, unchanged.

> **Candidate — binds nothing.** Drafted 2026-10-03. Effect comes only from an
> owner act over an entry's exact bytes. A commit, a review or a passing check
> performs none. No target repository body has been read and no provider has
> been called.

> **Superseded offering, marked 2026-10-15 (provider route only).** The
> Agent SDK provider execution route entry (manifest row 1) is not offered:
> the owner declined to un-park Syzygy-made provider calls and directed the
> local agent CLI subprocess route instead
> (`decisions/OWNER-DIRECTION-DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15.md`).
> The text below is kept unedited.

## What this is

The public-repository admission package needs two registry entries before a
read or a model call can be lawful (REQ-polaris-generation-017; RFC4-1):

1. the **provider execution route** for Anthropic through the Claude Agent SDK
   runtime (`proposed/POLARIS-PROVIDER-ROUTE-ANTHROPIC-AGENT-SDK-CANDIDATE.json`);
2. one **shared public Git-hosting source-acquisition adapter**
   (`proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json`).

Each is its own record with its own act. These rows are candidates for the
owner to read, not usable entries: both leave `implementationVersion` null and
the governing contract version Unknown, so RFC4-3 admits no output from them.
Signing one registers its declared boundary and enables nothing; each usable
entry is a later version needing its own review and act, and the egress
consent, the observation consents and the public-source screening scope are
separate acts.

## How the acts would be given

The form proposed is the admission package's Q5 form: one structured question
whose option names the entries "at the manifest rows" of
`PUBLIC-ADMISSION-REGISTRY-MANIFEST.txt`, stated as provenance state (1),
`owner-adopted (bootstrap, uncorrelated)`, A1 audit-record identity absent. A
recorder binds each act to its row and refuses any other argument. This
follows the 2026-10-02 behaviour-contract re-pin, which re-pinned the Butlers
registry entry that way.

The version-tagged Scope A sign-off is not used [Inferred]. The direction
names "the PWB specification deltas, the observer registry entry and the
contract successors queued behind them", which reads as the Butlers project-
shape observer entry and its queue, and its recorder applies package patches
to an existing subject. These are two new files for different authorities,
and the admission package already signs its consents at manifest rows, so one
form across one sitting is simpler. If the owner reads Scope A as covering
any implementation-phase registry entry, the entries could instead be signed
by version tag; the bytes would not change.

## Questions for the owner

None is decided by this packet.

**O1. One shared source-acquisition adapter, or one per target?** *Recommended:*
one shared adapter. RFC4-1 requires exactly one registered adapter per
external authority per project, the hosting service is one such authority, and
a per-target entry would repeat the per-target cost the admission package
exists to remove. The cost: a change to the adapter is a new entry version
that affects every target.

**O2. Resource limits for the acquisition adapter.** The entry proposes 4,096
sources, 1 MiB per source, 128 MiB total, 256 MiB per shallow fetch, 65,536
tree entries (the index-depth limit of the first draft was removed: a generic Git acquisition has no index traversal). [Inferred] None is measured; the sources for
Redis are unread. *Recommended:* accept as the ceiling for the first target,
and treat the first run's measurement as the input to a later entry version.
A breach leaves dependent claims Unknown and never fails silently.

**O3. Route unknowns.** The provider entry lists what is [Unknown] today:
whether the Agent SDK on the owner's login or key can disable telemetry and keep
its state in the run directory, whether the real API accepts the runtime's
empty system message, traffic beyond the captured paths and credential writes
outside the run directory. *Recommended:* sign the entry only after that
check, since the egress record makes a runtime that cannot be so configured a
run that does not start.

**O4. The route's request is not only the generator's.** [Observed, capture
endpoint] The pinned runtime (SDK 0.3.288, CLI 2.1.288) adds a fixed system
prefix, an empty system message, a per-run-directory device and session id,
platform headers naming the OS, CPU architecture and Node version, and
sometimes a body-less HEAD probe (which the cited gate answers locally). The
entry carries every one of those bytes inline, with each header value as a
literal or a closed shape, and accepts the adapter only when the
generator-built parts match byte for byte and nothing falls outside the lists.
`PROVIDER-EGRESS-BYTES.md` (PR #258) is cited as provenance, by commit and
blob. The cited gate can also strip the three machine-identifying headers
(OS, CPU architecture, Node version); that is off by default and the entry
assumes no answer: whether the egress record requires stripping is an owner choice.
*Recommended:* accept the listed envelope for this route. Accepting it also needs a version of the egress record whose Conditions no longer say the route "adds no context of its own" and shows "nothing else" than the generator's parts; otherwise the two signed records contradict each other. The entry pins model `claude-opus-5-5`, no tools, effort `high` and a max_tokens ceiling (an [Inferred] proposal of 64000, the owner's choice, to be checked against the first requests run) as bytes it lists, and carries the runtime-fixed byte list inline. The further egress record version must admit those pinned fields (`model`, `tools`, `max_tokens`, effort and thinking off) as well as the runtime-fixed context, because the record refuses "a field outside the table" on either route, and whether its phrase "fixed by the runtime" covers values the entry pins is a reading, not settled. If the owner will not
send those bytes, the answer is a different route (PR #264), which replaces
this entry under RFC4-1.

## What it does not do

It grants no read, egress, write, execution or release; installs nothing in
the registry directory; and changes no adopted specification, policy or
consent. It does not touch the Butlers entry.

## Review

A fresh-context review precedes any offering; `REVIEW-BRIEF.md` names the
artifacts, references and criteria. Round 1 returned REVISE and round 2 REVISE; the raws are retained under `reviews/`.
