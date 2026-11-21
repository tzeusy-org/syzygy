# Owner decision packet — Messages API provider route registry entry

> **Withdrawn by D10, marked 2026-11-21.** This offering was never performed and is not performed now. Never offer it to the owner
> again. D10 retired the owner act this package offered (`governance-simplification-d10/RETIREMENTS.md` §C); the change it carried, if still wanted, is an agent adoption recorded in `decisions/AGENT-ADOPTIONS.md`.
> Everything below is history, unchanged.

> **Candidate — binds nothing.** Drafted 2026-10-03. Effect comes only from an
> owner act over the entry's exact bytes. A commit, a review or a passing check
> performs none. No target repository body has been read and no provider has
> been called.

> **Superseded offering, marked 2026-10-15.** This entry is not offered: the
> owner declined to un-park Syzygy-made provider calls and directed the local
> agent CLI subprocess route instead
> (`decisions/OWNER-DIRECTION-DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15.md`).
> The text below is kept unedited.

## What this is

One registry entry for the provider route that calls the Anthropic Messages
API directly through `@anthropic-ai/sdk` 0.131.0 (PR #264), as route B. It is
**a substitute for PR #255's Agent SDK provider entry, never an addition**:
RFC4-1 allows one adapter per authority per project, both entries address the
same authority, and the owner adopts one. Choosing this one leaves PR #255's
provider entry unadopted (its source-acquisition entry is unaffected).

Like PR #255's entries it is a candidate to read, not a usable entry:
`implementationVersion` is null, so RFC4-3 admits no output from it. Signing it
registers its declared boundary and enables nothing.

## How the act would be given

The form proposed is the same as PR #255's: an option selection naming the
entry "at the manifest row" of `MESSAGES-API-ROUTE-REGISTRY-MANIFEST.txt`,
stated as provenance state (1), `owner-adopted (bootstrap, uncorrelated)`, A1
audit-record identity absent. A recorder would bind the act to that row.
The act phrase registered for this candidate in `scripts/check_governance.py`
is ADOPT POLARIS MESSAGES API PROVIDER EXECUTION ROUTE REGISTRY ENTRY; it
matters only if the owner prefers the typed-phrase form, whose argument is the
same manifest row. The recorder and the act state which form binds; the packet
recommends the option selection. The
version-tagged Scope A sign-off is not used [Inferred], for the reason PR #255
gives.

## Questions for the owner

None is decided by this packet.

This entry is an RFC4-9 substitution: it keeps PR #255's role identity and
registers a new implementation identity, so adopting it after PR #255's entry
replaces that implementation and the act names it. The shared role identity
keeps PR #255's spelling, which names the Agent SDK; the name is kept, not
chosen, and a route-neutral role name would be a change to PR #255's entry.

**O1. Messages API route or Agent SDK route?** *Recommended:* this route, if
the owner accepts a direct API key. It sends strictly less than the Agent SDK
route (no system prefix, metadata, environment message, per-run device id or
probe), it has no bundled CLI, and its whole request is listed in the entry.
The cost: it needs an API key, not the owner's sign-in. If the owner will not
supply one, PR #255's entry is the route.

**O2. Reading of the confirmed egress record.** [Inferred] No enforceable
condition of the record (PR #215) is violated. Three wordings need the owner's
reading (set out in the entry's `egressRecordFit` and the semantic delta): the
record names the Agent SDK route; it permits only bytes "fixed by the runtime"
beyond the generator's, while this entry pins model, effort and a ceiling
itself; and it says "nothing else". If any is read restrictively a text-only
egress record version is needed, adding no class and no destination, and the
same holds for PR #255's entry on the last two. *Recommended:* read them as
descriptive and the pinned fields as the entry's listed bytes; the owner's
reading decides. A related choice: the gate can strip the three machine-
identifying headers (OS, architecture, Node version) before forwarding; the
entry lists them as sent and assumes no answer on stripping. *Recommended:*
the owner says whether the egress record should require stripping.

**O3. Credential.** API key only, from one environment variable, never logged.
The name `SYZYGY_POLARIS_PROVIDER_API_KEY` is a proposal [Inferred]; it cannot
begin with `ANTHROPIC_` because the adapter refuses to start when any such
variable is set [Observed in its source]. *Recommended:* accept; any other
name is a different byte in the entry.

**O4. Profile pins.** Model `claude-opus-5-5`, effort `high`, no tools,
thinking off or adaptive only (no `budget_tokens`), max_tokens ceiling 64000.
The ceiling is an [Inferred] proposal, not measured. *Recommended:* accept as
the ceiling for the first run and treat its measurement as the input to a
later entry version.

## What it does not do

It grants no read, egress, write, execution or release; installs nothing in
the registry directory; and changes no adopted specification, policy or
consent. It does not touch the Butlers entry.

## Review

A fresh-context review precedes any offering; `REVIEW-BRIEF.md` names the
artifacts, references and criteria. Round 1 ran (REVISE), round 2 ran (REVISE) and round 3 ran (CONFIRM WITH EXCEPTIONS, seven notes, all dispositioned in `reviews/ROUND-3-DISPOSITIONS.md`); each raw's own `Verdict:` line is the verdict of record and the raws are retained in `reviews/`.

## Known limitations carried to the act

Three round-3 notes concern bytes the act would bind, so they are not edited
(a bound false sentence can be corrected only by a successor). The owner can
accept them as they stand or ask for a successor entry before the act.

- **A stale "head" (round-3 finding 1).** The entry's `implementationStatus`
  calls PR #264's commit `e76b6929` its "head". PR #264 was force-pushed
  afterwards; that commit is still the provenance pin and the three pinned
  blobs are byte-identical at the new head, so no [Observed] claim about the
  source moves. *Proposed wording for a successor:* "PR #264 at drafting, since
  force-pushed; the commit this entry pins as provenance is `e76b6929`, held
  in no remote branch", or re-pin to the new head.
- **A missing citation (finding 2).** `timeoutNote` says an implementation must
  enforce the literal 600 before the entry is usable but does not name the
  tracking bead. *Proposed wording:* append "(bead syzygy-yqtg, item 1)".
- **An open Node transport list (finding 3).** The Node environment inputs the
  entry lists do not claim completeness; [Inferred, from Node's documentation,
  not exercised] `NODE_OPTIONS` and the lower-case proxy variables also reach
  the forwarded TLS request. *Proposed wording:* a closing row "any other
  environment input Node honours for TLS or proxying", and the bead's refusal
  list covers the named ones.
