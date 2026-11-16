> **Candidate — binds nothing. Draft only, 2026-11-04.** No owner sign-off,
> policy installation, execution permission or implementation change is recorded.

# Semantic delta CC-SEC-3-D9 — conform the craft policy to D9

**Artifact(s):** `.syzygy/governance/policies/craft-and-care/security-and-secrets.md`, introduction and CC-SEC-3 only; proposed patch alongside this delta.
**Stable IDs affected:** CC-SEC-3 retained; SEC-3 and REQ-polaris-generation-033 cited, not amended.
**Change class:** Normative — the absolute policy prohibition narrows to accommodate the exception D9 already put in doctrine.
**Author:** Codex, drafting bead `syzygy-bpyt.1.6`.
**Date:** 2026-11-04.

## Current meaning

[Observed at baseline in SUBJECT.json] The installed policy's introduction says:

```text
no observed-code execution outside an accepted profile, consented revertable
writes, and secrets kept out.
```

Its full CC-SEC-3 section is:

```markdown
## CC-SEC-3 — Observed code never executes outside an accepted profile

Observed-project code is untrusted regardless of owner (SEC-3), and runs
only inside an accepted, explicit opt-in execution profile.

- **Until the execution-profile RFC is accepted:** **no observed-project
  code executes, period** — observation is parsing and reading, never
  evaluation.
- **After acceptance**, execution happens only inside an explicit opt-in
  profile with:
  - default-deny;
  - isolated credentials;
  - declared network access;
  - resource limits;
  - destructive-operation gates.
- "Run the project's own test command to get better evidence" is exactly
  the tempting violation.
- *Violation:* an observer that executes a governed repository's build
  script to discover its structure, inheriting the host user's ambient
  credentials.
```

## Proposed meaning

The introduction would say:

```text
observed-code execution only within SEC-3's boundary, consented revertable
writes, and secrets kept out.
```

The full replacement section is:

```markdown
## CC-SEC-3 — Observed code follows SEC-3's execution boundary

Observed-project code is untrusted regardless of owner (SEC-3). Every change
must preserve SEC-3's execution boundary for Syzygy, what it launches or
schedules, and every instruction a Syzygy feature gives an agent.

- **Until the execution-profile RFC is accepted:** no observed-project code
  executes except through the one permitted case SEC-3 defines for the
  owner's attended agent session. Observation remains parsing and reading,
  never evaluation.
- **An execution profile**, once accepted, remains explicit opt-in, with:
  - default-deny;
  - isolated credentials;
  - declared network access;
  - resource limits;
  - destructive-operation gates.
- **A feature using SEC-3's permitted case** must specify and implement how
  its instruction satisfies SEC-3, including its credential protection, and
  how its disclosures preserve the distinction between the session's report
  and observation. The dossier authoring brief under
  REQ-polaris-generation-033 is this amendment's named case; its run choice,
  attendance declaration, command disclosure and credential checks remain
  governed by that requirement. A feature sign-off is not a choice for a run.
- The permitted case gives none of a profile's guarantees. A feature may
  not present it as containment or use an agent tool's permission setting
  as proof of the operating-system credential protection SEC-3 requires.
- "Run the project's own test command to get better evidence" does not
  establish an accepted profile or the permitted case.
- *Violation:* an observer that executes a governed repository's build
  script to discover its structure, inheriting the host user's ambient
  credentials. SEC-3's permitted case authorizes no such observer execution.
```

[Inferred] This conforms the engineering obligation to SEC-3's existing
boundary rather than creating a second exception or defining the case again.
The profile protections stay. The old tempting example remains insufficient
on its own; the observer-execution violation remains a violation.

## What explicitly does NOT change

SEC-3, its cost and credential condition; other doctrine; any RFC; the
signed dossier specification, including REQ-polaris-generation-033; CC-SEC-1,
2 and 4–6; per-repository read consent, egress, writes, retention and secrets
posture outside this execution boundary. The provider island stays parked.
No daemon or Syzygy-launched session receives the attended-session exception.
No installed policy, act-bound byte, flag, refusal string or rendered byte is
changed by this candidate. The later flag change remains separately gated.

## Warrant

[Observed] GP-Q7 in
`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`
records **"Draft it now (Recommended)"**, authorizing this draft, not its
adoption. D9's adoption is recorded in
`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, D9 row; that row records
Q4 A, a conforming CC-SEC-3 amendment after D9. The candidate workflow and
semantic-delta template in `../policy-candidates/` supply the draft form;
their candidate banners do not confer authority.

## Evidence or decision basis

`SUBJECT.json` identifies the baseline and hashes of governing inputs. The
owner direction, installed SEC-3, D9 log and review notes, signed dossier
REQ-polaris-generation-033, and the adapter-credential review are in-tree.
The underlying owner session is not in-tree; the dated direction is the
resolvable record. The author has neither read credentials nor fetched a
target repository. Implementation observations are source inspection, not
runtime credential or host-state evidence.

## Terms introduced / retired

None. CC-SEC-3 retains its identity and changes its heading. "Permitted case"
is SEC-3's existing term. This policy does not define "typed adapter", a
run, or attendance; the unresolved credential classification is an owner
question in OWNER-DECISION-PACKET.md, not a new definition here.

## Downstream impact

IMPACT-LEDGER.md gives the method, candidate migration and explicit limits.
IMPACT-SWEEP.json retains the baseline lexical results; it is a candidate
inventory, not proof that every semantic dependency was found. The draft
adds no derived authority. The proposed installed file hash is recorded in
SUBJECT.json; no current authority digest is re-minted here.

## Migration / supersession plan

Only after fresh review and the owner's craft-policy act: apply the exact
patch to the exact baseline policy (or stop on drift); record the new craft
amendment in INSTALL-RECORD.md and the canonical acceptance record through
the owning act route; regenerate affected derived views, context budgets and
manifests and re-run the canonical battery in a clean clone of that exact
commit. Preserve predecessor records and bound bytes. An invalidated bound
record requires its own reviewed successor, never an in-place repair.

Scope A's 2026-10-02 direction names PWB deltas, the observer registry entry
and queued contract successors, not this craft policy. This draft extends no
sign-off route and registers no act phrase. The existing craft-act precedent
is the route to prepare after review; its exact offering and recording
mechanism must be checked then. Signing is an owner act, not a merge.

The separate implementation change may flip PERMITTING_ARM_ENABLED only
when the packet's pre-flip gates pass. A per-run choice follows separately;
policy adoption and a flag change supply neither attendance nor a run choice.

## Review

**Required class:** CC-REV-1 class 4 (security), and CC-REV-4 normative fresh-reader review; class 1 is also proposed for the permission boundary, subject to independent classification.
**Reviewer:** pending independent fresh-context assignment by the coordinator.
**Verdict:** none — this is frozen author output awaiting review.
