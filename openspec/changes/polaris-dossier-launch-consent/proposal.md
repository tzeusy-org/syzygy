# Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Drafted 2026-11-08 from the owner direction
> `POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08`. It is not adopted, performs no
> act, records no consent and grants no read, write, egress or execution.
> Effect comes only from owner acts over exact reviewed bytes;
> `OWNER-PACKET.md` in this directory lists them. No fresh-context review
> has run yet. Tracking bead: `syzygy-pdja.21`.

**The owner should be able to point Polaris at any repository whose source
they hold and get a dossier, with nothing prepared for that repository
beforehand.** Today every repository needs its own observation consent and,
when governed, its own agent-provider statement, each drafted as a candidate
package, reviewed and signed in a separate sitting before the first run
(Redis took a whole sitting). This change keeps exactly those consents, one
per repository and revision, but asks for them when the run starts and
records the owner's answer there and then.

## Why

**Warrant:** the plain owner direction
`POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08`
(`.syzygy/governance/decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md`),
which directs this draft and performs no act. The owner's words:

> "My vision is that I can point polaris at any repo for which I have the
> source and generate the Polaris sites."

> "Revision should always default to latest trunk commit (eg main/master).
> Observing its own repository for the purposes of generating a Polaris for
> itself is fine."

[Observed] The preparation the owner objects to is the per-repository
ceremony, not the per-repository consent: RFC5-12 and RFC3-7 require an
observation consent for every observed repository, and SEC-2 requires a
per-project statement before a governed project's content reaches a model
provider. Neither clause says when or through what ceremony the owner gives
it. [Inferred] Asking at launch therefore needs no doctrine or contract
amendment; `design.md` §1 sets out the clause-by-clause reading a reviewer
should test.

## What changes

- **REQ-polaris-generation-046, launch-time consent.** When a run starts
  without the consents it needs, Syzygy asks the owner in the terminal,
  states exactly what each consent covers, and on the exact confirmation
  writes an observation consent record naming the one pinned revision, and
  for a governed subject a separate per-project statement. Each is an
  owner-act record binding its own digest, revocable by a later act like
  any other. An agent must never answer; Syzygy cannot tell, so who answered
  is disclosed as the operator's declaration, labelled Inferred.
- **REQ-polaris-generation-047, trunk-tip revision.** Absent `--revision`, a
  run pins the commit the clone's trunk points to (remote default branch,
  else `main`, else `master`), with no fetch, and states that it did not
  fetch.
- **Self-observation** is permitted from a separate checkout; a run whose
  clone is the governance home's own working tree is refused with the
  command that makes one.
- **One displacement** of REQ-polaris-generation-033: its rule that Syzygy
  writes only to the run's state directory gains one exception, the launch
  records, written only where the owner's write consent permits.

## What it needs from the owner, besides sign-off

- **A write consent for Syzygy's own repository** (RFC5-12's write class,
  SEC-4), naming the launch records and their location. Without it Syzygy
  may not write a consent record into its own governance home. This is a
  one-time owner act, not an amendment (packet Q3).
- Answers to the packet's questions: public repositories only or private
  too, the record location and commit practice, the residual that an agent
  could type the answer, the statement's content classes, and whether
  "latest" means the clone's tip or a fetched one.

## What it does not change

- Revocation (RFC5-13), the execution choice and its rules (SEC-3, D9,
  REQ-033's `allow-execution`), the governed predicate, classification and
  screening, and every disclosure REQ-033 requires.
- The parked standing consent of
  `openspec/changes/polaris-dossier-arbitrary-public-repo/` (REQ-037): this
  change is the per-repository alternative its packet Q0 offered, and edits
  none of its bytes. `design.md` §6 states the relation.
- `openspec/changes/polaris-dossier-one-command-run/` (REQ-040 to 045,
  unsigned): this change edits none of its bytes; REQ-046 applies to
  `syzygy polaris` only where REQ-040 is in force.

## Impact

- Specs: `proposed/polaris-generation/spec.md` (two ADDED requirements). The
  delta is held under `proposed/`, not `specs/`, so no dependency tool counts
  it before an act (the arbitrary-public-repo precedent).
- Code, after sign-off only: the dossier CLI's `init` and `polaris` paths,
  the consent package's readers (one new record family), the skill and agent
  texts. `design.md` §7 outlines the slices.
- Governance: one owner write-consent act; one pending-register row (P-118).
