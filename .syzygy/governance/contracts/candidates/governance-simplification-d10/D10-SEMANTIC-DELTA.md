# D10 — semantic delta

Doctrine amendment D10, clause by clause: the old text, the new text, and
why. The old text is quoted from the doctrine files on `main` when this
package was built; the new text is the package's `proposed/` copy. Both were
extracted by script (Python `difflib`, changed lines grouped by clause), not
retyped. The full proposed files are under
`proposed/.syzygy/governance/doctrine/`, each named `<file>.md.proposed`
(the suffix is dropped when the act installs it).

Identifiers: no rule is renumbered, retired or merged. VIS-4's and SEC-1 to
SEC-5's titles are kept; VIS-4's, SEC-2's, SEC-3's and SEC-4's bodies are
rewritten. Two glossary terms are added.

The lower-level clauses that change with D10 (contracts, policies,
specifications, directions, acts) are in `RETIREMENTS.md`.

## Sweep for sentences that contradict the new regime

[Observed: a Python sweep of the six files under
`.syzygy/governance/doctrine/` at the commit this package was built on.]

- Predicate, case-insensitive:
  `consent|sign-?off|signs? off|signed off|owner act|adopt|gate|autonom|unattended|recorded choice`.
- Denominator: 6 files, 1,337 lines.
- Result: 71 matching lines; 49 lie in clauses this amendment changes and
  22 are kept.

The 22 kept lines, and why each stays:

| Line | Why it stays |
|---|---|
| `README.md`:3 | The status banner records the 2026-07-30 `ADOPT DOCTRINE` adoption, which is history |
| `README.md`:19 | "Consent" still means the owner's; the consents that remain (SEC-4) are the owner's |
| `README.md`:69 | Identifier stability after adoption; unaffected |
| `README.md`:104 | "The owner adopts every amendment" of doctrine: owner class 1 |
| `architecture.md`:91 | `project.yaml` still holds consents: SEC-4 write consents for other people's repositories |
| `architecture.md`:94, 203 | "adopted" used descriptively |
| `architecture.md`:229, 339, 377; `v1.md`:62, 84; `vision.md`:60, 127 | The predicate's `gate` matched "aggregate", "propagate" or "navigate"; no rule |
| `security.md`:112 | SEC-4's title: writes into other people's repositories are still consented |
| `trust-and-evidence.md`:49, 184; `vision.md`:272 | "Gate" in another sense: a work warrant's two checks; Syzygy never gating a governed project's releases |
| `v1.md`:68, 69 | Drafted doctrine stays unadopted until the owner adopts it: owner class 1 |
| `vision.md`:153 | The fresh-reader review stays the test at adoption; D10 changes only what a failure does |
| `vision.md`:339 | The owner re-judges success at each stage: a judgment about the product, not a gate on work |

## `vision.md`

### What Syzygy is not — opening sentence (lines 87-87 → proposed lines 87-87)

Old:

```text
autonomous.
```

New:

```text
autonomous about intent.
```

Why: Agents may now adopt changes and work unattended (VIS-4), so the bare 'not autonomous' would be false. What stays true is that intent (doctrine and the owner classes) is the owner's.

### What Syzygy is not — 'Not autonomous' (lines 105-107 → proposed lines 105-108)

Old:

```text
- **Not autonomous.** The loop is human-triggered; autonomy beyond VIS-4's
  stated bounds is licensed only through the mechanism VIS-4 names, never by
  reinterpretation.
```

New:

```text
- **Not autonomous about intent.** People start the work, and the owner
  holds doctrine and the four owner classes (VIS-4). Agents may work
  unattended and adopt other changes, but only within VIS-4's bounds, always
  recorded and reported, never by reinterpretation.
```

Why: Same reason. The bullet keeps 'never by reinterpretation' and points at VIS-4's bounds instead of a gate that D10 removes.

### VIS-3 — what a failed fresh-reader review does (lines 158-167 → proposed lines 159-167)

Old:

```text
- **What a failure freezes:**
  - In the Syzygy repository, a failing artifact freezes **autonomous
    adoption, not agent authorship**: agents may draft repairs, but every
    amendment to that artifact requires owner adoption until it passes a
    fresh-reader review.
  - In governed projects the failure is shown as status; whether to freeze is
    that project's own policy (Syzygy does not enforce outward).
- *Violation:* specs eroding, one LLM edit at a time, into something only LLMs
  can parse.

```

New:

```text
- **What a failure does:**
  - In the Syzygy repository, a failing artifact is repaired before anything
    relies on it. An agent adopts the repair like any other change (VIS-4);
    the review is an engineering norm, not an owner gate.
  - In governed projects the failure is shown as status; what to do about it
    is that project's own policy (Syzygy does not enforce outward).
- *Violation:* specs eroding, one LLM edit at a time, into something only LLMs
  can parse.

```

Why: The old text froze agent adoption of a failing artifact until it passed review, which made review an owner gate. The owner chose 'One review, not gating': review stays as the test, a failure still blocks reliance, and the repair is an ordinary agent adoption.

### VIS-4 — rewritten (lines 168-191 → proposed lines 168-209)

Old:

```text
**VIS-4 — Humans steer the vision; agents shape within it.** Shape-defining
changes always need the owner's sign-off; Syzygy and its agents may draft
them, never adopt them.

- **Shape-defining changes** — doctrine (heart-and-soul), craft-and-care
  standards, topology, and RFC acceptance — need owner sign-off every time.
- **Behavioral specs (`openspec/`) sit below that line.** LLM adoption of spec
  changes is permitted in principle, but opening that gate is a **doctrine
  amendment event** needing both:
  - an accepted adjudication RFC, defining what makes adversarial judgment
    independent, how the ambiguity determination is recorded, and how each
    adopted change stays individually revertable; *and*
  - the owner's explicit doctrine amendment recording that the gate opens.
- **RFC acceptance alone never opens it.**
- **Always human-gated, gate open or not:** spec changes touching security
  posture, privacy or retention obligations, or normative data contracts.
- **Classification is never the author's call.** Whether a change is
  spec-level or shape-level is contested by default and is never decided by
  the agent making the change; it is settled without a human only while an
  opened gate is in force.
- *Violation:* an agent sprouting specs inside an ambiguous vision; an agent
  certifying its own governing vision as unambiguous; an agent editing a spec
  to match code it just wrote; treating RFC acceptance alone as opening the
  gate.
```

New:

```text
**VIS-4 — Humans steer the vision; agents shape within it.** The owner adopts
doctrine and decides four classes of change; agents decide everything else,
record it and report it, and the owner may veto any of it afterwards.

- **The owner decides, and only the owner:**
  1. **Doctrine** — any change to `governance/doctrine/` (heart-and-soul).
  2. **Secrets** — anything that would weaken secret detection or SEC-5's
     fail-closed rule, or let a secret be indexed, rendered or sent.
  3. **Writes to other people's repositories** — any write or push into a
     repository the owner does not own (SEC-4).
  4. **Exposure and release** — any network exposure beyond the owner's
     tailnet (SEC-1), and any release, deployment or multi-user operation.
- **Agents decide everything else.** That includes behavioral specifications
  and their versions, contracts (RFCs), the craft-and-care and specification
  bars, topology, screening and classification policy within SEC-5, review
  practice, when implementation starts, fixes that change behavior,
  unattended agent work, which repositories Syzygy reads and which provider
  receives their content (SEC-2), and running observed code under SEC-3.
- **How an agent adopts.** The change lands on the default branch with one
  row in `governance/decisions/AGENT-ADOPTIONS.md` naming the commit, what
  changed, why, and the command that reverts it; a specification version also
  gets a git tag. The pull request or session summary that links the row is
  the report to the owner.
- **How the owner vetoes.** At any time, by saying so. A veto is a revert: an
  agent runs the row's revert command and adds a row recording the veto. A
  vetoed change is not adopted again without the owner.
- **Classification is the agent's call, contested by veto.** The agent making
  a change decides whether it falls in an owner class; when unsure, it treats
  the change as owner-class and asks.
- **Owner decisions need no ceremony.** A decision in the four classes is
  recorded as the owner's words, dated, with the commit that applies it; no
  typed phrase or digest is required.
- **Lower rules follow this one.** Where a contract, policy, specification,
  decision or direction requires an owner act, sign-off, consent or ruling for
  something this rule leaves to agents, this rule governs and an agent
  adoption satisfies it, until the lower rule is amended.
- *Violation:* an agent changing doctrine, weakening secret detection,
  pushing into a repository the owner does not own, or exposing Syzygy beyond
  the tailnet without the owner's decision; an agent adoption with no log row
  or no revert command; an agent editing a spec to match code it just wrote
  without saying so in the row; a vetoed change adopted again without the
  owner.
```

Why: The owner's direction: keep owner checkpoints 1 (doctrine), 4 (secrets), 5 (writes to other people's repositories) and 6 (network exposure or release); everything else is agent-decided, recorded and reported, with veto. This replaces the 'shape-defining' list, the adjudication-RFC precondition, the 'always human-gated' class and 'classification is never the author's call'. The adoption mechanism (one log row, a tag for spec versions, the PR as report) is the simplest durable record that names a commit and a revert. The lower-rules sentence makes every clause that still says 'owner act' read correctly from the day of adoption, so follow-on edits can be ordinary agent work. The title is kept: CG-4's rationale string quotes it.

### VIS-5 — who controls code change (lines 222-224 → proposed lines 240-242)

Old:

```text
  code.** The human gates on code change are VIS-4's sign-offs and the worker
  toolchain's own review gates, which live outside Syzygy and are not
  guaranteed here.
```

New:

```text
  code.** The human controls on code change are VIS-4's owner decisions and
  veto, and the worker toolchain's own review gates, which live outside
  Syzygy and are not guaranteed here.
```

Why: 'VIS-4's sign-offs' no longer exist for most changes; the human controls are now owner decisions and veto.

### VIS-6 — observed-only projects (lines 238-244 → proposed lines 256-262)

Old:

```text
    project that records the consent to observe it. There it is Syzygy's
    attributed record about the project: it never anchors the project's
    capability map, is never presented as the project's own declaration, is
    never cited as the project's text, and never suppresses a gap of the
    project. A dismissal of such a project's gap is not committed there: it
    takes effect only in the project's own governed plane, so it waits for an
    act that names that write.
```

New:

```text
    project that observes it. There it is Syzygy's
    attributed record about the project: it never anchors the project's
    capability map, is never presented as the project's own declaration, is
    never cited as the project's text, and never suppresses a gap of the
    project. A dismissal of such a project's gap is not committed there: it
    takes effect only in the project's own governed plane, so it waits until
    Syzygy may write there (VIS-4; SEC-4).
```

Why: There is no longer a 'consent to observe'. A write into another plane is still controlled: by VIS-4 for the owner's own repositories, by SEC-4's consent for others'.

### North star — when inferred intent becomes desired state (lines 304-304 → proposed lines 322-323)

Old:

```text
  intent becomes desired state only after owner adoption (VIS-4).
```

New:

```text
  intent becomes desired state only once adopted under VIS-4: by the owner
  for doctrine, and by an agent, recorded and reported, for the rest.
```

Why: Inferred vision is doctrine and stays with the owner; inferred specs and shape are agent-adopted under VIS-4.

## `security.md`

### Opening summary (lines 3-5 → proposed lines 3-5)

Old:

```text
Syzygy treats observed code as untrusted everywhere, admits clients only as
SEC-1 allows, sends data out only with scoped consent, keeps secrets out, and
makes only consented, revertable writes.
```

New:

```text
Syzygy treats observed code as untrusted everywhere, stays within the owner's
tailnet, sends content only to a run's declared provider, keeps secrets out,
and writes into other people's repositories only with the owner's consent.
```

Why: Restates the five rules as amended: tailnet, declared provider, secrets out, consent only for other people's repositories.

### SEC-1 — beyond localhost (lines 28-33 → proposed lines 28-40)

Old:

```text
- **Beyond localhost:** access must be authenticated, TLS-protected, and
  limited to the owner's own devices. An unauthenticated network-exposed
  configuration is never the default.
- *Violation:* a fresh install serving portfolio data on a LAN address with no
  credential; a loopback endpoint answering an arbitrary web page's fetch; a
  machine client admitted on loopback location alone.
```

New:

```text
- **Beyond localhost, the tailnet and nothing else:** access must be
  authenticated, TLS-protected, and limited to the owner's own devices on the
  owner's tailnet. An unauthenticated network-exposed configuration is never
  the default.
- **Exposure beyond the tailnet is the owner's decision (VIS-4).** A public
  address, tunnel, port forward or shared link waits for the owner, and so
  does any release, deployment or multi-user operation. The standing posture,
  in the owner's words: "Network exposure (ingress) should almost never be
  necessary, everything stays within tailnet".
- *Violation:* a fresh install serving portfolio data on a LAN address with no
  credential; a loopback endpoint answering an arbitrary web page's fetch; a
  machine client admitted on loopback location alone; a tunnel or public
  address opened without the owner's decision.
```

Why: The owner's answer, quoted: 'Network exposure (ingress) should almost never be necessary, everything stays within tailnet'. Exposure beyond the tailnet, release, deployment and multi-user operation are owner class 4. The authentication and client-class rules are unchanged.

### SEC-2 — egress (lines 42-60 → proposed lines 49-73)

Old:

```text
**SEC-2 — Portfolio data leaves owner-controlled infrastructure only through
explicit, scoped consent.** No governed-project content, or anything derived
from it, is sent to a store or service the owner does not control — model
providers included — without explicit, recorded, per-project consent.

- **What is covered:** source structure, specs, work history, and anything
  derived from them, including prompts.
- **Model providers are such services.**
- **What consent must say:**
  - Onboarding consent must name the providers permitted for the project and
    the content classes they may receive; Syzygy renders that consent on the
    project's surface.
  - A provider not named needs fresh consent.
- **Without consent**, the inferred layer renders Unknown instead of being
  computed.
- **Remote backing dependencies** are allowed under the same consent rule.
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project source sent to an unnamed model provider.

```

New:

```text
**SEC-2 — Portfolio data leaves owner-controlled infrastructure only for a
run's declared provider, and secrets never leave.** Repository content, or
anything derived from it, is sent to a store or service the owner does not
control only when that service is a provider declared for the run. No
per-project or per-repository consent is needed.

- **What is covered:** source structure, specs, work history, and anything
  derived from them, including prompts, from any repository Syzygy reads,
  public or private.
- **Model providers are such services.** A run declares its providers (for
  example, the model provider behind the operator's agent tool) in its own
  record, and Syzygy renders them on the project's surface.
- **A provider not declared for the run receives nothing.**
- **Secrets never leave (SEC-5):** content that matches the secret-detection
  policy, or cannot be classified, is never sent, whatever is declared.
- **With no declared provider**, the inferred layer renders Unknown instead
  of being computed.
- **Remote backing dependencies** are allowed under the same rule: a backing
  store the owner does not control is a provider and is declared.
- **The owner's trade-off:** private repositories are read and sent to the
  declared provider without a per-repository question.
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project content sent to a provider the run did not declare; a
  secret in a prompt.

```

Why: The owner: per-repository consent for public repositories is 'completely unnecessary', and owner checkpoint (2), reading or sending a private repository, was not kept. So no per-project consent for any repository; content goes only to a provider declared for the run; secrets never (owner class 2, SEC-5). The trade-off for private repositories is stated once, as the owner chose it.

### SEC-3 — observed code (lines 61-111 → proposed lines 74-113)

Old:

```text
**SEC-3 — Observed code is untrusted, everywhere.** Syzygy runs
observed-project code only inside an explicit, opt-in execution profile.

- **It is untrusted whoever owns the project.**
- **What this binds:** Syzygy itself, every process Syzygy launches or
  schedules, and every instruction a Syzygy feature gives an agent (a brief,
  prompt, skill or work item). None of them runs observed code outside a
  profile, or tells anything else to, except in the one permitted case
  below.
- **The profile is:** default-deny, with isolated credentials, declared
  network access, resource limits, and gates on destructive operations.
- **The profile contract is a blocking RFC:** no observed-project code runs
  until it is accepted.
- **The one permitted case — the owner's attended agent session.** A Syzygy
  instruction may let an agent session build and run observed-project code
  outside a profile when three things hold: the session is on the owner's
  own host; the owner started it and attends it, being present to see and
  stop what it does; and the owner has recorded a choice for that one run,
  naming what the instruction covers. A standing or per-project record does
  not qualify. The code stays untrusted, and:
  - The owner's choice for the run is recorded before Syzygy issues the
    instruction.
  - Every claim that rests on that execution is labelled Inferred, never
    Observed.
  - Every command the session reports having run is disclosed, as the
    session's own report.
  - Syzygy keeps every credential it holds for its typed adapters where
    neither the session nor any process it starts, directly or not, can read
    it at the operating-system level, for as long as any of them runs.
- **Whom the case binds:** Syzygy. Syzygy never gives the instruction to a
  session it started or to one left running unattended, and never asks for a
  process that outlives the session. Work the session hands to its own
  subagents is part of the session. Once the instruction is given, SEC-3
  governs what Syzygy does about the session, not what the session does.
- **What the permitted case costs:** the session runs with the owner's own
  credentials and network, including Syzygy's endpoints and any Syzygy
  credential readable on that host. Observed code it runs can reach them,
  and can change any file the owner can, the clone it runs in included.
  Nothing contains it, so it gives none of a profile's guarantees. The owner
  accepted that risk over two alternatives: allowing execution only in a
  sandbox, and forbidding it.
- *Violation:* an execution profile that inherits the host user's ambient
  credentials "for convenience." The permitted case is not such a profile.
  Its exposure to the owner's credentials is the same; what differs is that
  nothing claims otherwise. It claims no containment, Syzygy instructs it
  only on the owner's recorded choice for that run, and nothing resting on
  it renders as more than Inferred. Also violations: Syzygy instructing a
  session to run observed code before the owner's choice for that run is
  recorded, or on a standing record; a claim that rests on the session's
  execution rendered Observed.

```

New:

```text
**SEC-3 — Observed code is untrusted, everywhere.** Syzygy itself never runs
observed-project code; agent sessions may build and run it, contained as
below, without an owner choice per run or per project.

- **It is untrusted whoever owns the project.**
- **The daemon never executes observed code**, and neither does any other
  Syzygy process.
- **What this binds:** Syzygy, every process Syzygy launches or schedules,
  and every instruction a Syzygy feature gives an agent (a brief, prompt,
  skill or work item).
- **Where observed code may run:**
  - **In a sandbox** — an execution profile: default-deny, isolated
    credentials (no Syzygy credential and none of the owner's readable),
    declared network access, resource limits, and gates on destructive
    operations. Any agent session, attended or not, may be told to run
    observed code there.
  - **In the owner's attended session** — a session on the owner's own host
    that the owner started and attends, being present to see and stop what it
    does. The code runs with the owner's own credentials and network,
    including Syzygy's endpoints and any Syzygy credential readable on that
    host, and nothing contains it: it gives none of a sandbox's guarantees.
    The owner accepted that risk (D9). Syzygy never gives this instruction to
    a session it started or to one left running unattended, and never asks
    for a process that outlives the session. Work the session hands to its
    own subagents is part of the session.
- **Who decides:** the agent, not the owner. Whether to build or run, and
  where, is recorded in the run's record before the instruction is given.
- **Wherever it runs:** every claim that rests on that execution is labelled
  Inferred, never Observed; every command the session reports having run is
  disclosed, as the session's own report; and Syzygy keeps every credential
  it holds for its typed adapters where neither the session nor any process
  it starts can read it at the operating-system level, for as long as any of
  them runs.
- **The owner's trade-off:** observed code may be built and run by agents
  without a per-run owner choice.
- *Violation:* the daemon executing observed code; a sandbox that inherits
  the host user's ambient credentials "for convenience"; an unattended
  session told to run observed code outside a sandbox; a claim that rests on
  observed-code execution rendered Observed.

```

Why: Kept: observed code is untrusted, and the daemon never runs it. Dropped: the owner's per-run recorded choice (owner checkpoint (3) was not kept). Agents may now run observed code in a sandbox, attended or not. D9's attended-session case is kept with its stated costs and without the per-run record, because the owner accepted that risk in D9 and the new direction removes only the choice, not the case. The 'blocking RFC' sentence goes: RFC 0005's execution-profile module was accepted with Wave A.

### SEC-4 — writes (lines 112-123 → proposed lines 114-129)

Old:

```text
**SEC-4 — Writes are consented, attributed, and revertable.** Syzygy writes
into a governed repository only with recorded consent, and every write can be
traced and undone.

- **Consent first:** writes need recorded per-repository consent
  (onboarding).
- **Every write** is attributed to Syzygy, atomic, and individually
  revertable.
- **No silent overwrite:** Syzygy never overwrites a governance artifact it
  did not author without surfacing the conflict.
- *Violation:* first-pass doctrine drafting silently replacing an existing
  `.syzygy/governance/` tree.
```

New:

```text
**SEC-4 — Writes are consented, attributed, and revertable.** Syzygy writes
or pushes into a repository the owner does not own only with the owner's
recorded consent for that repository; Syzygy's own repository and the owner's
repositories need none. Every write can be traced and undone.

- **Consent first, where it applies:** a write or push into a repository the
  owner does not own needs the owner's recorded consent for that repository
  (VIS-4). Which repositories the owner owns is declared in Syzygy's
  configuration; an undeclared repository counts as not owned.
- **Every write** is attributed to Syzygy, atomic, and individually
  revertable.
- **No silent overwrite:** Syzygy never overwrites a governance artifact it
  did not author without surfacing the conflict.
- *Violation:* a push into a repository the owner does not own without the
  owner's consent; first-pass doctrine drafting silently replacing an
  existing `.syzygy/governance/` tree.
```

Why: Owner checkpoint (5) kept: writes or pushes into repositories the owner does not own need the owner's consent. Syzygy's own repository and the owner's repositories need none, which removes the launch-record write-consent act class. Attribution, atomicity, revertability and no-silent-overwrite are unchanged.

### SEC-5 — who may change the secret policy (insert after line 130 → proposed lines 137-140)

Old:

```text
(nothing)
```

New:

```text
- **Weakening it is the owner's decision (VIS-4):** a change that makes the
  policy detect less, admits unclassifiable content, or lets a secret be
  indexed, rendered or sent waits for the owner. Any other change to the
  screening or classification policy is an agent adoption.
```

Why: Owner checkpoint (4), secrets: weakening detection or fail-closed classification stays with the owner. Every other screening or classification change (the eight per-version acts so far) becomes an agent adoption.

## `architecture.md`

### Governed projects — onboarding and observed-only projects (lines 26-33 → proposed lines 26-35)

Old:

```text
- Onboarding is recorded, per-repository consent (security.md SEC-4).
  **Every observed repository consents, governance root or not.**

An **observed-only project** is a governed project whose governance root
Syzygy may read under the owner's consent but may not write: no act in force
names a write into it. It is still governed, and its plane is still its own;
Syzygy writes nothing there until an act names the write (vision.md VIS-6 says
where content Syzygy authors about it lives meanwhile).
```

New:

```text
- Onboarding is a recorded declaration by the operator, not a consent: any
  repository the operator points Syzygy at may be read, governance root or
  not (security.md SEC-2). Writing into a repository the owner does not own
  needs the owner's consent (security.md SEC-4).

An **observed-only project** is a governed project whose governance root
Syzygy may read but may not write: no write into it is allowed (security.md
SEC-4) or adopted (vision.md VIS-4). It is still governed, and its plane is
still its own; Syzygy writes nothing there until a write is (vision.md VIS-6
says where content Syzygy authors about it lives meanwhile).
```

Why: 'Every observed repository consents' contradicts the owner's direction. Onboarding stays a recorded declaration (which repository, which root), not a consent. The observed-only definition loses 'under the owner's consent' and 'act in force' for the same reason.

### The write plane — 'every edge is gated' (lines 68-70 → proposed lines 70-73)

Old:

```text
Every edge from Syzygy is gated: each observed repository, governance root
included, has consented (SEC-4), and adapters act only when explicitly
authorized.
```

New:

```text
Every edge from Syzygy is declared: each observed repository, governance
root included, is declared by the operator; a write into a repository the
owner does not own has the owner's consent (SEC-4); and adapters act only
when explicitly authorized.
```

Why: Reads are declared, not consented; writes into other people's repositories keep SEC-4's consent; adapters keep explicit authorization.

## `README.md`

### Glossary — owner classes, agent adoption, governed project, observed-only project, attributed owner answer (lines 21-34 → proposed lines 21-42)

Old:

```text
- **Governed project** — one or more repositories with one owner and exactly
  one **designated governance root**: the repository that holds the project's
  single `openspec/**` + `.syzygy/**` plane. It is explicitly brought under
  Syzygy observation. Other repositories are declared observed-source
  repositories, read-only to Syzygy unless separately onboarded, and every
  observed repository needs consent (architecture.md; security.md SEC-4).
- **Observed-only project** — a governed project whose governance root Syzygy
  may read under the owner's consent but may not write: no act in force names
  a write into it, and Syzygy writes nothing there until one does
  (architecture.md).
- **Attributed owner answer** — the owner's answer to a question about
  intent, attributed, dated and individually withdrawable. It is neither
  evidence nor a warrant: it renders Observed only as a fact about the record,
  never as adopted intent without an applicable act, and never in place of an
```

New:

```text
- **Owner classes** — the four kinds of change only the owner decides
  (vision.md VIS-4): doctrine; secrets; writes into repositories the owner
  does not own; and network exposure beyond the tailnet, release, deployment
  and multi-user operation.
- **Agent adoption** — a change an agent adopts under vision.md VIS-4: landed
  on the default branch with one row in `decisions/AGENT-ADOPTIONS.md`
  (commit, what changed, why, revert command), reported to the owner, and
  undone by the owner's veto.
- **Governed project** — one or more repositories with one owner and exactly
  one **designated governance root**: the repository that holds the project's
  single `openspec/**` + `.syzygy/**` plane. It is explicitly brought under
  Syzygy observation. Other repositories are declared observed-source
  repositories, read-only to Syzygy unless separately onboarded. Reading a
  repository needs no consent; writing into one the owner does not own does
  (architecture.md; security.md SEC-2, SEC-4).
- **Observed-only project** — a governed project whose governance root Syzygy
  may read but may not write: no write into it is allowed or adopted, and
  Syzygy writes nothing there until one is (architecture.md).
- **Attributed owner answer** — the owner's answer to a question about
  intent, attributed, dated and individually withdrawable. It is neither
  evidence nor a warrant: it renders Observed only as a fact about the record,
  never as adopted intent unless adopted under VIS-4, and never in place of an
```

Why: Two new terms used across doctrine after D10, and three entries that said every observed repository needs consent or that adoption needs an 'act'.

## `v1.md`

### Scope diagram — deferred list (lines 10-10 → proposed lines 10-10)

Old:

```text
    L["Deferred, each for its own reason<br/>live fleet monitoring, certificates,<br/>autonomous spec adoption, regeneration,<br/>multi-user"]
```

New:

```text
    L["Deferred, each for its own reason<br/>live fleet monitoring, certificates,<br/>regeneration, multi-user"]
```

Why: Agent adoption of specifications is no longer deferred: D10 opens it.

### V0 — drafting a project's declared artifacts (lines 48-50 → proposed lines 48-50)

Old:

```text
    first action is to *draft* them for owner sign-off (see non-code writes,
    below). Until signed off, drafted capabilities render as unadopted and may
    not anchor the map.
```

New:

```text
    first action is to *draft* them for adoption under VIS-4 (see non-code
    writes, below). Until adopted, drafted capabilities render as unadopted
    and may not anchor the map.
```

Why: Drafted capabilities are adopted under VIS-4 (an agent for specs and shape, the owner for doctrine), not by owner sign-off.

### Deferred — count (lines 99-99 → proposed lines 99-100)

Old:

```text
Five capabilities wait, each for a stated reason.
```

New:

```text
Four capabilities wait, each for a stated reason. Agent adoption of
specifications, once deferred here, is in force under VIS-4 since D10.
```

Why: Same reason; the table loses one row.

### Deferred — table row removed (lines 105-105 → proposed lines 106-105)

Old:

```text
| Autonomous spec adoption | Permitted in principle; opening the gate needs the adjudication RFC **and** an owner doctrine amendment (VIS-4) |
```

New:

```text
(removed)
```

Why: The 'Autonomous spec adoption' deferral is resolved by D10.

### Platform and observed code (lines 117-122 → proposed lines 117-121)

Old:

```text
    access limited to the owner's own devices (SEC-1).
  - Remote backing dependencies fall under SEC-2's consent rules.
- **Observed code:** executing it is opt-in, profiled, and blocked until the
  execution-profile RFC is accepted (SEC-3). SEC-3's one permitted case
  outside a profile is a Syzygy instruction, on the owner's recorded choice
  for that run, to the owner's own attended agent session.
```

New:

```text
    access limited to the owner's own devices on the owner's tailnet (SEC-1).
  - Remote backing dependencies fall under SEC-2's declared-provider rule.
- **Observed code:** Syzygy never runs it; an agent session may build and run
  it in a sandbox, or in the owner's own attended session, without a per-run
  owner choice (SEC-3).
```

Why: SEC-1's tailnet posture, SEC-2's declared-provider rule and SEC-3's sandbox or attended session without a per-run choice.

## `trust-and-evidence.md`

### Attributed owner answer — adoption (lines 57-57 → proposed lines 57-57)

Old:

```text
never as adopted intent unless an applicable act adopts it (vision.md VIS-4).
```

New:

```text
never as adopted intent unless it is adopted under vision.md VIS-4.
```

Why: 'An applicable act' becomes 'adopted under VIS-4', since adoption is no longer only by owner act.

