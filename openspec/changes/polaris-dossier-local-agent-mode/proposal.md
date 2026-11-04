# Polaris dossier local-agent mode

> **Version 1.3.** Drafted 2026-10-05 under the owner direction
> `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`),
> which authorizes drafting and review only, and relies on the owner's
> rulings `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md`).
> The owner signed off version 1.0 on 2026-10-06, after adopting the SEC-3
> amendment that the review-1 rulings direct (item 1) as doctrine amendment
> D9 the same day, and version 1.1 on 2026-10-07; version 1.2 adds the
> waiting sessions of the owner direction
> `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md`),
> signed off on 2026-10-14; version 1.3 adds the presentation elements of the
> owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
> (`.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`).
> These bytes bind only by the owner's sign-off of version 1.3 (VIS-4). It grants no read, egress, write or execution beyond what
> its requirements state.

**A Polaris dossier can be written by the operator's own Claude Code or Codex
session over a local clone, while Syzygy checks every quotation against the
pinned Git objects, runs a fresh-context review step and renders the pages,
and makes no provider call itself.** This change adds that operator-agent mode
to the `polaris-generation` capability, beside the provider mode the adopted
requirements describe.

## Why

On 2026-10-05 the owner wrote that dossier generation "should be purely done
by a human using claude-code or codex, a provided syzygy binary, and the
target codebase cloned locally", with no API key, and then directed the mode. The adopted generator requirements
assume the opposite: Syzygy calls the model through a registered provider
route, under stage budgets it enforces, with provider receipts for usage, an
independent inventory and review that Syzygy dispatches, and a discovery
account Syzygy produces from its own reads. Those requirements cannot be met
literally when the model runs in the operator's session, and meeting them by
pretence (receipts Syzygy never saw, a "registered route" that is the
operator's terminal) would break VIS-2. The direction routes the change
through one reviewed CC-REV-2 delta.

## What changes

- **Added:** four requirements, 033 to 036, in the existing
  `polaris-generation` capability:
  - 033 Operator-agent authoring mode: mode selection, the governed
    predicate and per-project statement, clone pinning to a consented
    revision, isolated and re-hashed Git-object reads, the SEC-3-gated
    execution rule, no provider call, the operator's declared limits and
    model, unobserved agent usage, records re-derived rather than trusted,
    and the disclosure.
  - 034 Agent brief and mechanically checked draft: the brief, the
    self-reported understanding record, the labelling, citation and
    quotation rules, the draft schema, the quote, path and label checks with
    repair findings, and rendering with RFC7-10 evidence-artifact anchors.
  - 035 Fresh-context review in the operator-agent mode: inventory and review
    contexts, the review packet, verdict validation, and what independence
    can and cannot be shown.
  - 036 Self-reported discovery and in-session clarification.
- **Modified in effect, not in bytes:** for an operator-agent run the new
  requirements displace or read named text of REQ-polaris-generation-001,
  002, 005, 006, 017, 018, 020, 021, 022, 030 and 031, and of the base
  change's `INTERFACES.md` (Provider bullet; "Budget and retry
  decisions"), `OWNER-FLOW.md` ("Resolve warranted work"; "Materialize
  once, then execute") and `SECURITY-CONTRACT.md` (the paragraph that
  begins "The trail resides outside the governed plane"). Each displaced sentence is
  quoted in the semantic delta. For a provider-mode run nothing changes.
- **RFC7-20, by the owner's reading, not by edit:** the owner ruled that
  RFC7-20's consent condition governs drafts Syzygy computes, and that an
  operator-computed draft is admitted with disclosure, a declared and
  recorded tool and provider, and byte-verified quotes (rulings direction,
  item 1). REQ-polaris-generation-001's draft-layer sentence is read
  accordingly in 033. The first review found the reading changes the
  clause's effect; the owner kept the ruling and directed that the finding be
  preserved for the owner, not resolved (review-1 rulings, item 3).
- **Execution follows SEC-3 as amended by D9.** The owner chose to let
  the agent build and run the observed project on the host and directed a
  SEC-3 amendment to permit it (review-1 rulings, item 1), adopted as D9.
  The brief invites execution only when D9 is in force, the operator is the
  owner attending the authoring session the owner started on the owner's
  host, the operator personally records the owner's choice for that one run
  and revision before the brief (never a configuration value or standing
  record), and any credential check D9 requires passes; only the authoring
  brief carries it, and it asks for no process that outlives the session.
  Otherwise it quotes SEC-3's head sentence, tells the agent not to build
  or run the project outside an explicit, opt-in execution profile, and
  invites nothing outside one. Claims the agent marks as resting on
  execution are Inferred and shown with the commands they name, every
  reported command is disclosed, and Syzygy itself executes and launches no
  observed code.
- **Parked, not withdrawn:** the provider mode and its route, egress and
  adapter packages, per the direction's item 4.

## Capabilities

- **Modified:** `polaris-generation`, by four added requirements.
- **New:** none. The mode is a way of running the same generator, in the way
  requirements 030 and 031 extended it.

## Amendment relation

- It amends the composition of `openspec/changes/polaris-manifesto-generation/`
  and `openspec/changes/polaris-manifesto-understanding-amendment/`, as
  amended by the tree-form adoption. No byte of either is edited.
- It is independent of the candidate
  `openspec/changes/polaris-non-governed-narrative-profile/` (requirement 032)
  in category: 032 says how a non-governed subject's narrative is composed,
  this change says who authors it and how Syzygy checks it. They share one
  thing, the predicate that decides whether a subject is governed. 033
  counts every `.syzygy/` path, because a path listing cannot tell adoption,
  so it is never less strict than 032's "adopted capability declaration";
  whichever of the two is adopted second reconciles the two definitions. A Redis
  dossier needs both. The numbers 033 to 036 follow 032; if 032 is never
  adopted the gap stays, because identifiers are never renumbered.
- **The candidate delta was held in `proposed/`, not `specs/`,** for the
  reason the profile change gives: `scripts/count_polaris_effective_scenarios.py`
  required exactly one base and one overlay. The v1.0 sign-off placed it in
  `specs/`, after that script's generalization (`tasks.md`).
- Never archive or sync this as an unrelated competing change.

## Scope and preserved boundaries

- **Syzygy's own reads keep every gate.** Observation consent, the observer
  registry entry, and the classification and screening policy acts apply to
  every Git object Syzygy reads, unchanged (direction item 3).
- **Who sends is the ruling, not whether consent is needed.** The agent's
  sends to its provider are the operator's own act (direction item 2). Every
  transmission Syzygy itself makes still traverses the egress check of
  REQ-polaris-generation-025; in this mode Syzygy makes none.
- **Unobservable things stay Inferred or unrecorded.** What the agent read,
  how much it spent and whether its review contexts were fresh are
  operator-declared or self-reported, and the page says so. Only Syzygy's own
  reads, checks and steps are Observed.
- **Any repository, SEC-2 kept whole.** The owner allowed the mode on any
  repository (scope record, item 1; review-1 rulings, item 2). A subject
  governed under 032's four conditions, or silent about them, needs an
  in-force per-project statement naming the operator's agent provider,
  SEC-2's "explicit, recorded, per-project consent". The statement is a
  consent record; neither its content classes nor SEC-5 screening bind what
  the agent reads or sends, and every page says so.
- **Syzygy's records within the agent's reach.** On a single-user host the
  agent can write Syzygy's state directory. As the owner ruled (R1,
  `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`), nothing Observed rests
  on a stored record and every value shown from one is labelled Inferred.
  That reads REQ-polaris-generation-018 and 022 for this mode. The reading
  of 020's work-item gates, and option A's fuller cost (agent-editable
  refusal records, stored pinned revision and packets), go to the owner with
  the sign-off.
- **Reviews in sessions the operator starts.** Separate top-level sessions
  the operator starts, in a new terminal or by typing `!` and the printed
  command in the authoring session's terminal; never a subagent, and never a
  headless session the authoring agent starts (scope record, item 2).
  Admitting `!` is the lead's reading of the owner's words, not an owner
  ruling: the `!` launch is the same headless command, a child of the
  authoring tool's shell whose output lands in the author's context, and
  only who typed it differs. The owner's sign-off covers that reading.
  Since version 1.2 the operator may start these sessions at the start of
  the run, before their input exists: each waits through one Syzygy command
  for what Syzygy delivers into its directory, re-hashes it and reads it, and
  hands its result back through the same command, pre-approved to read and
  to run that command, never to write.
  One review session may go on to review later revisions, and the review
  page discloses it. Syzygy and the authoring session still start, resume
  and signal no session.
- **Presentation elements.** Since version 1.3 a draft may lay out its
  argument with tables, callouts, numbered steps, definition lists, cards,
  collapsible sections and code excerpts, rendered as inert static HTML. Every
  claim an element holds is checked, reviewed and marked as any claim block
  is; the short labels that head elements carry no claim; and a code excerpt
  is the cited lines as Syzygy read them, never the agent's copy.
- **What the agent ran is its report.** Commands the agent says it ran are
  recorded as its report, labelled Inferred; Syzygy cannot observe them.
- **No new permission.** This is not permission to read, egress, write,
  execute observed code, deploy, release or adopt intent.

## Impact

- **Generation core:** a local-agent draft schema and adapter onto the
  existing quote check, schema validation, review validation and dossier
  evaluation.
- **App:** a `syzygy dossier` command family (design only: `design.md`), the
  consent reader of PR #263 (on `main`), isolated, re-hashed Git-object
  reads by identifier, and the existing dossier renderer.
- **Agent harness:** a thin Claude Code skill and Codex instructions that
  drive the loop (text in `design.md`; not installed by this change).
- **Authority unchanged.** The generator's authority remains what its
  performed acts say. Implementation that depends on this change waits for
  the owner's sign-off (direction item 5).
