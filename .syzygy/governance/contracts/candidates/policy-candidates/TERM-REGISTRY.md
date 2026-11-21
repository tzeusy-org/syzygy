# Working term registry — candidate

> **Status: CANDIDATE. This file binds nothing.**
>
> **Renamed 2026-08-05b.** This file was titled "Syzygy's canonical public
> vocabulary". A candidate has no canon, and a title that says otherwise is
> read before the status banner that corrects it — an artifact must not
> contradict itself in the first line and the third. It becomes a canonical
> vocabulary if and when an owner act accepts it, and not before.
> It is a candidate policy artifact produced in the 2026-08 human-clarity
> refactor round. No owner act has accepted it, and none of its 31 entries
> acquires force from appearing here.
>
> **Owning authorities always win over this registry's restatements.** Every
> entry names the artifact that owns its meaning. Where this file and an
> owning authority disagree, the authority is right and this file is stale —
> cite the authority, never this registry, in any normative context.
>
> Companion: `../round-2026-08/TERM-MIGRATION-REPORT.md` (occurrence sweeps,
> deprecated-synonym findings, what was deliberately not changed).

## Two tiers: what the public path needs, and what it does not

A reader arriving at `README.md` and `intent/OVERVIEW.md` must not have to
learn thirty-one terms. **The default public path is bounded to the eleven
core terms below.** Everything else is advanced vocabulary: real, needed, and
reachable in one action — but never a prerequisite for understanding what
Syzygy is.

**Core — the eleven.** Sufficient, and required, for the default path. Each
row's right-hand column is the ordinary-language question the term answers,
because a newcomer meets the question before the term:

| Term | ID | Plain question it answers |
|---|---|---|
| Project | T-01 | *what is the governed unit?* — one governance root, one owner |
| Capability | T-04 | *what is this project supposed to be able to do?* |
| Desired state | T-07 | *what should be true?* |
| Observed state | T-09 | *what does evidence say is true?* |
| Execution state | T-11 | *what did agents and humans actually do?* |
| Evidence | T-14 | *what backs that up?* — a durable, identified artifact |
| Unknown | T-31 | *what do we not know?* — never green, never zero |
| Gap | T-20 | *what is missing?* — intended and absent |
| Contradiction | T-19 | *where do authorities disagree?* |
| Reconciliation | T-26 | *did the work actually satisfy the intent?* |
| Mission | T-27 | *what has an agent been allowed to do, and within what bounds?* |

**Two corrections to this table, 2026-08-06.**

- **`Unknown` was listed as T-15, and T-15 is not `Unknown`.** T-15 is *Claim
  epistemic label* — the three-value dimension of which `Unknown` is one
  value. The core set named a value and pointed at its dimension. `Unknown` is
  the more load-bearing of the two for a newcomer (it is the whole content of
  VIS-2) and the dimension is not, so `Unknown` now has its own entry, **T-31**,
  with an **adopted** owning authority; and *Claim epistemic label* is advanced.
- **`Claim` moved to advanced.** A newcomer does not need the kernel's
  positive-status carrier to understand what Syzygy is for. Desired state,
  observed state and the difference between them carry the thesis; `Claim` is
  the mechanism by which the kernel represents an assertion about them, and
  that is a thing you need once you are working inside the model.

**Advanced — provenance and mechanism.** Everything a reader needs only once
they are working *inside* the model: claim (T-13), claim epistemic label
(T-15), state plane (T-06), proposed / inferred / historical state, source
snapshot, evaluation, observation record, challenge, warrant, rendering tier
(T-16), requirement, governance root, Project Genome, autonomy envelope,
attention item, context packet, execution profile, aligned, converged.

**Ordinary language first, on the default path.** Where the plain phrasing
carries the meaning, use it and let the term follow in parentheses — not the
other way round:

```text
what should be true            (desired state)
what evidence says is true     (observed state)
what agents did                (execution state)
something missing              (gap)
authorities disagree           (contradiction)
check work against intent      (reconciliation)
```

**The bound is partly testable, the testable part is tested every run, and it
currently fails.** A sweep of the default path (`README.md` plus
`OVERVIEW.md`'s pre-drawer content) must use no term outside the core set
without defining it in place. `check_governance.py` **CG-23** performs one
sweep of that bound and prints its findings on every run — report-only,
because the core set is candidate and a candidate bound is reported, never
enforced. Read its output rather than this sentence; what it finds moves.

**What CG-23 does not see, stated in the same breath as what it does**
(recorded 2026-08-10, review RD-16 finding 5; the earlier wording called the
bound "tested every run" without qualification, which read as a census of what
exists rather than a census of what one regex sees):

- **Core terms are exempt by construction.** CG-23 examines only the advanced
  set, so a *core* term used loosely on the default path — the defect this
  section ranks as the **worse** one — is structurally invisible to it. That
  is the class that produced review RD-16's blocking finding 2
  (`Reconciliation` used in the sense T-26 reserves against).
- **Its matcher misses inflected and line-wrapped forms.** It matches
  `\b<name>\b` case-insensitively, so *warranted* does not match `Warrant`
  (T-17), and a multi-word term broken across a line — `Project\nGenome` —
  does not match `Project Genome` (T-03). At the review's baseline commit
  three advanced terms were present on the default path and unreported for
  exactly this reason. **Widening the matcher belongs to the checker, not
  here** — it is routed as a scripts-batch repair (disposition register, batch
  `R-SCR`) and this paragraph is the disclosure that stands until it lands.
- **Terms with no entry at all are invisible to it**, because it can only look
  for names it reads out of this file.

That third class is the larger one. **The recorded enumeration is fifteen
default-path terms with no entry and no in-place definition**, listed in
`../round-2026-08c/PUBLIC-VOCABULARY-COMPREHENSION-REPORT.md` ("The bound is
not a bound yet"). This registry deliberately **points at that enumeration and
does not copy it**: a shorter list restated here reads as a repair that did
not happen, and a copied list goes stale silently the moment either
default-path artifact is edited — which both now have been. These are
**findings, not exemptions**: either the term earns an entry and an owning
authority, or the default path stops using it.

**Recommended substitutions, and what has now been applied.** The
substitutions this registry recommends on the default path — *shared project
model* for *kernel*, *view* for *surface*, *portfolio workspace* defined
inline for *workspace*, *agent workers* or *work-execution tools* for
*actuator*, *approval* or *authority* for *warrant*, and a plain rendering of
*evaluation engine* — are stated with their rationale in the same 08c report.
As of **2026-08-10** they are **applied to `intent/OVERVIEW.md`**, together
with the RD-16 repairs to that file — **with one deliberate exception, stated
because a blanket "applied" would be false**: *surface* was **kept** there.
Every remaining use is the literal product distinction the substitution
exempts (the three surfaces' proper names and their table, the two-consumers
sentence, and RFC10-1's negation), plus one ordinary-English verb. This is
lawful and is recorded rather
than assumed: **act 4 has not been performed**, its argument is a digest the
acceptance record re-quotes from the file, and repairing a pending offering
before the act is the cheapest moment the repair will ever be available. The
earlier statement here — that both CG-23 hits sat inside act 4's digest
subject "so neither was edited" — described the position before that pass and
is superseded. `README.md` is bound by no act; its half of these findings is
tracked separately.

**`actuator` is the one of these with a home elsewhere.** It has no entry here
and gains none: adopted doctrine is where the word is actually used
(`vision.md`'s Thesis and two more sites, `v1.md` once), and doctrine's own
glossary is where a definition belongs. That definition is drafted for the
owner at `DOCTRINE-AMENDMENT-ACTUATOR-DEFINITION.md` (**P-25(c)**) — a
proposal, adopting nothing; **doctrine edits are owner-only, VIS-4**. On the
default path the registry's other arm applies and is done: the word is gone
from `intent/OVERVIEW.md`.

**One routing gap this registry cannot close from inside itself** (review
RD-16 finding 4). `README.md` routes an unfamiliar reader to the doctrine
glossary as "the only one in this repository". That glossary has seven bullets
and resolves **one** of the eleven core terms above (`Project`, under the head
word *Governed project*); the other ten are defined here, and `README.md`
links to this file nowhere. So the page that promises the answer cannot reach
the artifact that holds it. The registry-side statement is this paragraph; the
repair to the promise itself is a `README.md` edit and is not made here.

**Two things this tiering does not do.** It does not rank terms by importance
— `rendering tier` is more load-bearing to a kernel implementer than `Gap`.
And it does not license vagueness on the default path: a core term used
loosely is worse than an advanced term used precisely.

## Admitting a new public term

**The rule lives in one place: §3, below.** This heading used to carry a
second copy of it, with **five** conditions where §3 carried **four** — two
statements of one rule, disagreeing about what the rule was, in one file. A
registry whose own admission rule is ambiguous cannot adjudicate a term.

The five-condition form was the stronger and it survives; §3 now states it,
and this section states nothing. Retiring is cheaper than renaming: retire the
term, keep the ID, never reuse it.

## How to read an entry

Each term carries a **stable term ID** (`T-nn`). IDs are amended in place or
retired; they are never renumbered and never reused.

**Owning authority** is typed, and the type matters more than the citation:

| Marker | Meaning |
|---|---|
| **adopted** | Adopted doctrine (`.syzygy/governance/doctrine/`), or an owner ruling in `decisions/`. Binding today. |
| **candidate** | A clause of an unaccepted contract in `../rfcs/`. **Discussable, never citable as binding authority.** The meaning is the best current draft, not settled law. |

A term whose only owning authority is *candidate* has no adopted definition.
That is recorded, not hidden — see the **Authority-coverage summary** below.

Formal definitions are quoted or closely paraphrased from the owning clause.
Plain-language sentences are **reading aids** and are never the definition.

---

## 1. The five dimensions — never collapse them

Five different questions in Syzygy are answered by five different closed
vocabularies. They are routinely confused because English offers one word for
all of them.

| Dimension | Question it answers | Values | Owning authority |
|---|---|---|---|
| **State plane** | *What kind of assertion is this record making?* | desired · proposed · observed · inferred · execution · historical | RFC1-22 (candidate) |
| **Claim epistemic label** | *How is this claim grounded?* | Observed · Inferred · Unknown | `trust-and-evidence.md`, "Status claims vs narrative claims" (**adopted**) |
| **Rendering tier** | *How strongly does the evidence support the claim?* | `gate-backed` · `report-fact` · `reduced-fidelity` · `asserted-by-worker` · `declared-only` · `suspended` | RFC2-25 (candidate) |
| **Work lifecycle** | *Where is this piece of work?* | `future` · `planned` · `ready` · `active` · `blocked` · `review` · `merged` · `reconciled` · `closed-unmerged` · four absence values — thirteen, closed. Carried **beside** the separate chain state (`merged`, `reconciliation-pending`, `reconciled@E`, `unsatisfied`, `contradiction-raised`, `Unknown(reason)`) | RFC8-12, RFC8-28 (candidate) |
| **Governance lifecycle** | *What has been done to this artifact, by whom?* | Normative artifacts: draft → adopted/accepted → amended → retired. Decisions and consents: active → superseded/revoked/expired. Kernel records: immutable recorded fact. Presentation artifacts: draft → adopted/published → superseded | RFC3-16 (candidate); adoption authority is VIS-4 (**adopted**) |

### The rule

> **Never use a generic word such as "status", "state", or "stage" where the
> dimension matters.** Name the dimension: *state plane*, *epistemic label*,
> *rendering tier*, *work lifecycle state*, *governance lifecycle state*. A
> field, column, count, badge, filter, or API key named only `status` is a
> defect wherever more than one of these five could be meant.

Two consequences worth stating separately, because both were live confusions
in the corpus this registry was built from:

- **"Observed" and "Inferred" are each bound twice** — once as a state plane
  (T-09, T-10) and once as a claim epistemic label (T-15). They are two
  coherent systems sharing two words, not one system used loosely. An artifact
  can sit in the Observed plane while a claim about it is labelled Inferred,
  and both statements are true at once.

  > **First-use rule.** In any new prose, the first use of either word must
  > name which system it belongs to: *the Observed plane* / *an Observed
  > claim*, *the Inferred plane* / *an Inferred claim*. Subsequent uses in the
  > same passage may drop the qualifier. A bare `[Observed]` or `[Inferred]`
  > **epistemic label marker** is exempt and always was — the bracket is the
  > qualifier, and it is unambiguous. What the rule catches is running prose:
  > "the module is Observed" is a sentence with two readings and no way to
  > choose between them.

  This rule is not currently mechanically checked. That is a stated gap, not
  a claim of compliance: no sweep in this repository distinguishes a bare
  running-prose `Observed` from a bracketed marker, and asserting the corpus
  complies would be the kind of unverified completeness claim VIS-2 forbids.
  **[Unknown]** — how many bare uses exist.
- **A tier is not a fourth label** (RFC2-25, candidate). The three-label rule
  is exclusive and exhaustive; a tier only ever *restricts* its parent label.

**A sixth question the five do not answer** (recorded 2026-08-10, review RD-16
finding 10). Two `Status` columns on default-path artifacts mix domains under
one heading: `README.md`'s authority table carries governance-lifecycle values
in its first rows and **existence facts** (*does not exist yet*, *nothing
exists yet*) in its last two; `PROJECT-STATUS.md`'s gate table mixes
governance lifecycle with `not started — blocked on the wave acts`, and
`blocked` is a value of the **work lifecycle**. The rule above catches both.
Sharper, and the reason this is recorded rather than repaired here: the domain
those two tables actually need — *does this artifact exist yet / has this gate
fired* — **is none of the five**. So the closure is a closure over five
questions, not over every question the corpus asks with the word "status".
This registry does not mint a sixth dimension to fix it: admitting one is a
§3 act with five conditions to satisfy, and the two columns can be renamed
(`Authority state`, `Gate state`) without it. Neither file is edited from
here; both are outside this artifact.

---

## 2. The six-plane state model (candidate — RFC-0001, unaccepted)

**Six state planes, and only six**: desired, proposed, observed, inferred,
execution, historical (RFC1-22, candidate). Every *source-state assertion* —
a record that asserts project state on its own authority — sits in exactly one
of them, **assigned per evaluation, not once and for all**. Derived objects
(claims, gaps, contradictions, snapshots) and **all relation edges** occupy no
plane; asking a plane of an edge is a category error.

**Older three- and four-state phrasings in presentation prose read as
compressions of this model, not as competing models** (round direction P-16).
Doctrine's adopted thesis names three — *desired state*, *observed
implementation state*, *execution state* (`vision.md`, Thesis) — because those
three are what the owner's problem is about. The candidate kernel contract
adds *proposed*, *inferred*, and *historical*, each carrying rules the three
cannot express: Proposed carries the exclusivity-group rule, Inferred carries
the challenge-authority ceiling, Historical carries staleness and supersession.

**Honest reading of the authority situation:** doctrine's three-state thesis
is **adopted**; the six-plane model is **candidate**. This registry
canonicalizes six planes as *vocabulary*, which is a drafting convention it
may set. It does not and cannot make RFC1-22 binding. Until an owner act
accepts RFC-0001, "six planes" is how we agree to speak, and `vision.md` is
still what governs.

---

## 3. Term-admission rule

**The single admission rule. There is no other, here or elsewhere in this
file.** Between 2026-08-05b and 2026-08-06 there were two — a five-condition
form under "Admitting a new public term" and a four-condition form here — and
they were not the same rule. The four-condition form omitted the fresh-reader
distinction test, which is the only condition that cannot be satisfied by the
person proposing the term. The five-condition form is therefore the one that
survives; the four-condition form is retired, and no condition it carried is
lost (each of its four maps onto one of the five below).

> **A new durable term is admitted only when all five hold. Any one failing is
> a rejection, not a discussion.**
>
> 1. **No existing term is adequate.** Name the nearest existing term and say
>    what it cannot express. Check this registry first.
> 2. **The distinction is operationally meaningful** — something is rendered,
>    counted, gated, routed, or refused differently because the distinction
>    exists. A distinction that changes only emphasis is a sentence, not a
>    term.
> 3. **It has an identified owning authority and a lifecycle** — exactly one
>    artifact defines it, the entry names that artifact, and the entry says
>    what would retire the term.
> 4. **It has a one-sentence plain-language explanation** a competent engineer
>    unfamiliar with Syzygy understands **without needing a second Syzygy
>    term**.
> 5. **It passes a fresh-reader distinction test**: a reader given only the
>    two definitions — the new term and its nearest neighbour — places five
>    real examples correctly, without coaching.
>
> A term failing any of the five is a phrase, not vocabulary. Use the existing
> term, or write the sentence out. Terms are scarce on purpose: every admitted
> term is a thing every future reader must learn.

**Scarcity is the point**, and the corollary from this corpus is:
**a distinction that is real is worth a term; a distinction that is merely
felt is worth a sentence.** Reconciliation (T-26) earns its reservation
because a substrate uses the same word for a different thing and the two must
never share a count. "Status" earns no term at all because it means five
things (§1).

**Internal metadata is not public vocabulary.** A field name in contract front
matter, an envelope field, or an index key is not admitted by this rule and
does not belong in this registry unless a reader on the default path meets it.
`depends_on`, `constrains` and `cites` are index mechanics; *maximum park
duration*, *unmediated effect surface* and *sibling disposition on partial
failure* are envelope fields. All six are deliberately absent from the tiers
above, and recording that here is what stops the next round admitting them by
default.

## 4. The registry

### Group A — Project and structure

---

#### T-01 · Project

**Plain language.** One owner's software project as Syzygy sees it: one or
more repositories, exactly one of which holds the governance files.

**Formal definition.** One or more repositories with exactly one designated
**governance root** — the repository holding the Project's single `openspec/**`
and `.syzygy/**` plane — and one owner, explicitly brought under Syzygy
observation. Additional repositories are declared observed-source repositories,
read-only to Syzygy unless separately onboarded, and **every observed
repository requires consent** (`architecture.md`; security.md **SEC-4**). The
consent condition was dropped by an earlier restatement here and is restored
(2026-08-10, review RD-16 finding 13): a SEC-4-bearing condition is a poor
thing to lose in a paraphrase, even one the banner's "owning authorities always
win" would have covered.

**Owning authority.** `architecture.md`, "Definitions" (**adopted**);
RFC1-1 (candidate) makes "exactly one governance root" a kernel invariant and
rules that zero or two roots is a Contradiction, never silently repaired.

**Permitted aliases.** *governed project* (doctrine's own phrasing in
"Governed projects and the two-namespace plane").

**Deprecated synonyms.** *repo*, *codebase*, *workspace* — a workspace is a
set of projects and is a distinct, portfolio-level concept (RFC10-15,
candidate).

> **`workspace` is deprecated as a synonym, undefined as a term, and
> load-bearing anyway** (recorded 2026-08-10, review RD-16 finding 9). It
> carries at least three referents in the corpus, each quoted from its site:
> a **scope** — "workspace-level operator domain" (`README.md`,
> `intent/OVERVIEW.md`); an **authority store** — "lives in a typed,
> platform-level workspace governance store" (RFC10-15); and **personal
> presentation state** — "distinct from the presentation-only workspace
> manifest (which remains personal presentation state, RFC 0003)" (RFC10-15).
> It has **zero occurrences in the adopted doctrine tree** — a claim the
> reviewer measured over all six doctrine files, case-insensitively, and this
> registry repeats rather than re-derives.
>
> Disposition, and it is two-sided: on the **default path** the registry's own
> recommended substitution is applied — `intent/OVERVIEW.md` now defines
> *portfolio workspace* inline at first use (2026-08-10). Admitting a
> **`Workspace` entry** here under §3 is not done and is not an agent's call:
> the term's only owning clause is candidate (RFC10-15, Wave D1), so an entry
> would have no adopted definition, which is the class **P-17** records and
> **P-16** rules on.

**Related but distinct.** Repository (an entity with a declared *role*, not a
separate class — RFC1-2); Workspace (the portfolio-level concept above, which
has no entry of its own); Governance root (T-02).

**Example.** A Project with three repositories: one `governance-root` holding
`.syzygy/`, two `observed-source` repositories consented for observation.

**Misuse.** Calling each repository of a multi-repo Project a "project" — that
splits one owner's intent across three governance planes, which the exactly-one
invariant exists to prevent.

---

#### T-02 · Governance root

**Plain language.** The one repository where a Project's governance files
live — and it is the *location* of the file, not any setting, that makes it so.

**Formal definition.** The repository containing the Project's single
`openspec/**` and `.syzygy/**` plane. **Location is designation**: the project
declaration lives at `.syzygy/project.yaml` in exactly one repository, and that
location — not any field value — designates the root. A repository carries at
most one `.syzygy/` plane, at its root, and is the governance root of at most
one Project.

**Owning authority.** `architecture.md`, "Governed projects and the
two-namespace plane" (**adopted**); RFC3-4 (candidate) for the
location-is-designation mechanism and its rationale (*a field can dangle or
lie; a file's location cannot*).

**Permitted aliases.** none. Use the full phrase.

**Deprecated synonyms.** *main repo*, *primary repo*, *root repo* — all three
suggest precedence among repositories, which is not what the designation means.

**Related but distinct.** Project (T-01); *observed-source repository*;
`.syzygy/governance/` (a directory inside the root, not the root).

**Example.** `syzygy/` contains `.syzygy/project.yaml`, so `syzygy/` is the
governance root; two sibling service repositories are observed-source.

**Misuse.** Declaring a *different* repository as root in a config field.
Designation follows the file's location; a declaration purporting otherwise
is a Contradiction routed to the owner (RFC3-4, candidate).

---

#### T-03 · Project Genome

**Plain language.** Everything a project would need to survive deletion of its
code — and it is much more than the behavioural specs.

**Formal definition.** The complete normative corpus: everything that must
survive deletion of the implementation. The behavioral-requirements system
holds its behavioral portion, **not its whole** — "regenerate from the
specification" must never collapse into "regenerate from behavioral scenarios
alone." Inventory in three tiers: universally required (doctrine and behavioral
requirements; topology and quality policy; the verification contract; a
handcrafted-region declaration, which may be empty); required when present
(accepted RFCs; designated executable specifications; generation policy and
provenance; normative data and external service contracts); not Genome
(observed and generated artifacts, environment/dependency locks, raw
operational and incident knowledge).

**Owning authority.** `architecture.md`, "Project Genome" (**adopted**);
RFC1-8 (candidate) rules Genome a *membership predicate over the declared
inventory*, not a graph entity.

**Permitted aliases.** *Genome* (after first use in a document).

**Deprecated synonyms.** *the specs*, *the docs*, *source of truth* — each is
narrower than the Genome or wrong about typed authority.

**Related but distinct.** Requirement (T-05); *Genome-complete* (a claim about
the corpus itself, saying nothing about runtime realization —
`architecture.md`, Definitions); Desired state (T-07).

**Example.** A project's adopted doctrine, topology, verification contract,
and empty handcrafted-region declaration are all Genome; its lockfiles and its
generated integration tests are not.

**Misuse.** "The Genome is complete, so the project regenerates." Full
regeneration is the **north star, not present doctrine** (`vision.md`, "The
north star (honestly labeled)"); no artifact may claim it as current
capability.

---

#### T-04 · Capability

**Plain language.** A named thing the product does, at the granularity a human
would use to describe it.

**Formal definition.** A named unit of declared behavior that the project's
own spec or shape documents assert exists, at the granularity a human would
use to describe what the project does. Capability identities come only from the
project's own declared artifacts. A drafted (unadopted) capability renders as
unadopted and **may not anchor the map**. Code mapping to no declared
capability renders Unknown — never silently inferred into a capability.

**Owning authority.** `architecture.md`, "Definitions" (**adopted**); `v1.md`
for the drafted/unadopted rule (**adopted**); RFC1-14 (candidate).

**Permitted aliases.** none.

**Deprecated synonyms.** **Feature** — deprecated as an identity. There is no
Feature kernel entity and no feature identifier (SDR-1, **adopted**; RFC1-32,
candidate). "Feature" and "feature request" survive only as *workflow
vocabulary* in intake flows, and UI prose may say "feature" only where it
resolves to a Capability identity.

**Related but distinct.** Requirement (T-05, a reference into OpenSpec);
Topology entry (intended structure); Code element.

**Example.** "Owner-act acceptance ceremony" is a Capability; the three
requirements describing its screens are Requirements that refine it.

**Misuse.** Storing `feature_id` beside capability identities (RFC1-32
violation case, candidate); colouring unmapped code by its nearest
capability's status.

---

#### T-05 · Requirement

**Plain language.** A required observable behaviour — owned by OpenSpec, only
*referenced* by Syzygy.

**Formal definition.** Requirement and Scenario are **references, not owned
content**. The OpenSpec artifact contract is the external authority for their
content and identity; the kernel holds `(artifact identity, anchor)` references
and degrades to Unknown — never guesses — when a reference no longer resolves.

**Owning authority.** RFC1-15 (candidate). Doctrine's typed-authority table
(`architecture.md`) is the adopted ground: *"What observable behavior is
required?" → the behavioral-requirements system (`openspec/`)*.

**Permitted aliases.** *requirement reference* (the precise kernel term);
*scenario* for the sub-reference class.

**Deprecated synonyms.** *spec* used alone — "spec" spans doctrine, contracts,
and OpenSpec and resolves nothing; *ticket*, *story*, *acceptance criterion*.

**Related but distinct.** Capability (T-04); Desired state (T-07, the plane a
requirement reference sits in); Project Genome (T-03, broader).

**Example.** `openspec/specs/acceptance/spec.md#req-3` is the anchor; the
kernel holds the reference and renders Unknown if the anchor breaks (Unknown
reason `reference-unresolvable`, RFC2-24, candidate).

**Misuse.** Copying requirement prose into `.syzygy/**` so it can be queried
faster. That mints a second content authority; the kernel holds references.

---

### Group B — The six state planes

---

#### T-06 · State plane

**Plain language.** Which of six kinds of statement a record is making about
the project — decided afresh each time the system reads status, and never
asked of a link between records.

**Formal definition.** Every **source-state assertion** in the graph — an
entity or record that asserts project state on its own authority — is assigned
to exactly one of six state planes, always read at an identified evaluation.
Plane assignment is evaluated **per (assertion, evaluation)**, so "exactly one
plane" holds *at each evaluation*. **Derived objects and relation edges occupy
no plane**; an edge's relationship to the planes is carried entirely by its
*semantic relation class*. "Which plane is this edge on?" is a category error a
conforming implementation must have no answer to — neither a seventh value nor
a null.

**Owning authority.** RFC1-22 (candidate). No adopted doctrine clause defines
"state plane"; see §2 and the authority-coverage summary.

**Permitted aliases.** *plane* (after first use).

**Deprecated synonyms.** *state* used alone for the dimension — collides with
work lifecycle state and governance lifecycle state (§1); *layer*, *tier*,
*bucket*.

**Related but distinct.** Claim epistemic label (T-15); Rendering tier (T-16);
*semantic relation class* (the edge-side counterpart, RFC1-25, candidate).

**Example.** A Proposal sits in the Proposed plane; when adopted, the adopting
Decision is a Desired-plane assertion — the Proposal does not migrate.

**Misuse.** Adding a `plane` column to the relation table so every edge has
one. That is the closure RFC1-22 states explicitly to prevent.

---

#### T-07 · Desired state

**Plain language.** What the project has decided it wants.

**Formal definition.** Adopted governance and spec state: capabilities,
requirement and scenario references, decisions, policies, topology entries,
declared regions, declared implementation mappings, consent records, project
and repository declarations. Only the owner adopts shape-level deltas (VIS-4).

**Owning authority.** `vision.md`, Thesis (**adopted**) — *"desired state lives
in human-guided doctrine and specifications"*; RFC1-22, Desired plane
(candidate) for the membership list.

**Permitted aliases.** *the Desired plane*, *intent* (in presentation prose,
where Polaris is the surface being described).

**Deprecated synonyms.** *the spec* (too narrow — desired state includes
doctrine, topology, and policy); *the plan* (that is execution intent, T-11);
*target state* (unbound).

**Related but distinct.** Proposed state (T-08 — unadopted, never desired);
Project Genome (T-03 — the corpus, not the plane); Observed state (T-09).

**Example.** An adopted topology entry declaring that the evidence adapter
belongs in the kernel district is Desired-plane.

**Misuse.** Rendering a drafted capability as desired state. Drafted is
unadopted; it renders `unadopted-draft` and may not anchor the map.

---

#### T-08 · Proposed state

**Plain language.** Changes someone has proposed and nobody has adopted.

**Formal definition.** Unadopted deltas: Proposals, each carrying an
**exclusivity group**. Never desired, never observed; may not anchor the map.
The kernel refuses to render a projection that unions two proposals in one
exclusivity group, and refuses to silently union proposals whose compatibility
is undeclared — the honest render is *N candidate futures*, selectable one at
a time.

**Owning authority.** RFC1-22 (Proposed plane) and RFC1-27 (Proposal and
exclusivity groups) — both **candidate**. **No adopted doctrine clause names a
proposed state**; the closest adopted anchor is VIS-1's prohibition on
comprehensible fiction.

**Permitted aliases.** *the Proposed plane*.

**Deprecated synonyms.** *draft state*, *pending state*, *WIP* — all three
suggest a stage of the same assertion rather than a distinct plane.

**Related but distinct.** Desired state (T-07); Mission (T-27 — authority to
proceed, not a proposal); *unadopted-draft* (a sibling surface state, RFC2-25).

**Example.** Two competing Proposals to restructure the same district, in one
exclusivity group, render as two candidate futures — never as one merged scene.

**Misuse.** Summing proposed work into a remaining-work total. Two proposals
in one exclusivity group never sum (RFC8-13, candidate).

---

#### T-09 · Observed state

**Plain language.** What actually exists, as captured by evidence.

**Formal definition.** What exists: code elements, evidence artifacts,
observation records, verification runs. Deterministic, evidence-linked,
immutable once recorded.

**Owning authority.** `vision.md`, Thesis (**adopted**) — *"observed
implementation state lives in code, tests, CI, and runtime evidence"*;
RFC1-22, Observed plane (candidate).

**Permitted aliases.** *the Observed plane*; **observed implementation
state** (doctrine's own phrasing — but note the plane is *wider* than
implementation: it also holds evidence artifacts and observation records).

**Deprecated synonyms.** *reality*, *actual state*, *as-built* — none carries
the evidence requirement.

**Related but distinct.** The **Observed epistemic label** (T-15) — same word,
different system; Evidence (T-14); Execution state (T-11).

**Example.** A retained CI gate artifact bound to the exact revision under test
is an Observed-plane evidence artifact.

**Misuse.** Writing bare "Observed" where the reader cannot tell plane from
label. Write "the Observed plane" or "an Observed claim."

---

#### T-10 · Inferred state

**Plain language.** What a model thinks — allowed to raise doubt, never
allowed to establish anything.

**Formal definition.** A **layer, not a substrate**: challenges (V0) and
inference-profile artifacts. **Challenge authority only** — never establishes
or raises a status; conservative suspension to Unknown is the universal
default. Inference overlays are separately versioned artifacts recording model,
version, parameters, and exact inputs, excluded from the VIS-7 identity test.

**Owning authority.** `trust-and-evidence.md`, "The deterministic/inferred
seam" (**adopted**) — *"Inference holds no positive status authority — it holds
challenge authority only"*; RFC1-22 (Inferred plane) and RFC2-7/RFC2-8
(candidate) for the overlay and ceiling mechanics.

**Permitted aliases.** *the Inferred plane*; *the inferred layer* (doctrine's
phrasing).

**Deprecated synonyms.** *AI state*, *guess*, *estimate*, *confidence score* —
inference is not a weaker kind of observation, it is a different authority.

**Related but distinct.** The **Inferred epistemic label** (T-15); Challenge
(T-18 — the mechanism by which the plane exerts its only power); Unknown.

**Example.** An inferred implementation mapping renders visually distinct from
a declared one and may not anchor the map.

**Misuse.** Treating missing evidence as Inferred. **Missing evidence never
renders a claim Inferred** — it renders Unknown (`trust-and-evidence.md`).

---

#### T-11 · Execution state

**Plain language.** What work is scheduled, running, or done — which proves
nothing about whether intent was satisfied.

**Formal definition.** Work items, execution runs, materialization records,
approved-unmaterialized execution intent; Syzygy's own propagation acts,
captured as Execution records. Epistemic rule: **may never satisfy a
desired-state claim — work is never proof.**

**Owning authority.** `vision.md`, Thesis (**adopted**) — *"execution state
lives in work-scheduler records — and scheduled or completed work is never
proof that the implementation satisfies intent"*; RFC1-22 (Execution plane) and
RFC1-23 (the act-assignment rule) — candidate.

**Permitted aliases.** *the Execution plane*.

**Deprecated synonyms.** *progress*, *delivery state*, *done-ness* — each
smuggles in the inference the plane's epistemic rule forbids.

**Related but distinct.** Work lifecycle state (§1 — the thirteen normalized
values *inside* this plane); Observed state (T-09 — a verification run is
Observed even when an agent triggered it, RFC1-23); Reconciliation (T-26).

**Example.** A merged work item is Execution-plane `merged`. Its chain state is
`reconciliation-pending` until a reconciliation evaluation says otherwise.

**Misuse.** A completed work item flipping a requirement's alignment
indicator green (RFC1-22/23 violation case, candidate).

---

#### T-12 · Historical state

**Plain language.** Superseded evaluations and their immutable records, kept
and visibly marked stale.

**Formal definition.** The ordered series of superseded evaluations and their
immutable observation records. Staleness is visible on the primary surface;
claims only degrade between evaluations over one snapshot. **Supersession moves
an observation record from Observed to Historical as a rendered consequence of
the superseding evaluation** — the record itself is immutable and never edited;
only its plane assignment at later evaluations changes, and that move is
rendered, never silent.

**Owning authority.** RFC1-22, Historical plane (candidate); the adopted
grounding is `trust-and-evidence.md`, "Staleness", and VIS-6 exception (b)
(observation records are exempt from rebuildability).

**Permitted aliases.** *the Historical plane*.

**Deprecated synonyms.** *archive*, *audit log*, *old data* — the plane is
displayable current-surface content with a staleness obligation, not a
cold store.

**Related but distinct.** Observation record (T-23 — the record; the plane is
where superseded ones sit); *superseded* (a freshness state, RFC2-10).

**Example.** Last week's observation record still displays, marked stale, and
cannot contribute to a current convergence claim.

**Misuse.** Deleting superseded records to keep the store small. They are
identity-bearing evaluation inputs and VIS-6 exception (b) content.

---

### Group C — Claims, evidence, and epistemics

---

#### T-13 · Claim

**Plain language.** The single object that carries any positive answer about
the project — so anything the system shows as good can be disputed at one
identified place.

**Formal definition.** **All positive status flows through Claims.** No edge
is itself a status; evidence reaches status only via `supports` into a Claim,
and challenges attach only to Claims — so a status carried on any other edge
would be unchallengeable. There is no evidence-to-status backdoor. Claim
identity has **two levels**: a **durable identity** derived from (subject
identity, cited normative reference identity, declared scope), stable across
evaluations, which challenges and dismissals bind to; and an **evaluation
instance** carrying status, epistemic label, rendering tier, Unknown reason,
supporting evidence set, freshness state, and challenge state.

A **status claim** — anything that turns an indicator green, declares
aligned/converged/genome-complete, or asserts a gap factually resolved or
absent — requires current evidence. **A narrative sentence doing a badge's work
is judged as a badge.**

**Owning authority.** `trust-and-evidence.md`, "Status claims vs narrative
claims" (**adopted**) for the status-claim trigger and the badge rule;
SDR-2 (**adopted owner ruling**) for two-level identity; RFC1-24, RFC1-18,
RFC1-19, RFC2-5 (candidate) for the mechanics.

> **Note.** "Claim" is *not* among the technical nouns doctrine freezes in
> `architecture.md`, "Vocabulary", although it is the most load-bearing noun in
> the candidate kernel. See the authority-coverage summary.

**Permitted aliases.** *status claim* (the sub-class with the evidence
requirement); *claim instance* (the evaluation-scoped level).

**Deprecated synonyms.** *assertion*, *finding*, *result*, *badge* — a badge is
a rendering of a claim, never the claim.

**Related but distinct.** Evidence (T-14 — what supports a claim);
Gap (T-20); Contradiction (T-19); Warrant (T-17 — authorizes work, does not
describe status).

**Example.** "Capability C is Aligned to requirement R at evaluation E" is one
claim instance, on a durable identity that survives re-evaluation.

**Misuse.** A `verifies` edge rendered as a green badge with no Claim behind
it — an unchallengeable status (RFC1-24/25 violation case, candidate).

---

#### T-14 · Evidence

**Plain language.** A durable, identified artifact you can go and check.

**Formal definition.** **A durable, identified, integrity-verifiable artifact
carrying its source, capture time, scope, and provenance** — a test run, a tool
exit status, a file hash, a commit SHA, an observation record, a captured
runtime trace or incident record. **Reproducibility is a separately declared
property of an evidence class, not a prerequisite for evidence status**: a
one-off runtime observation, durably captured and identified, is evidence.
**An LLM assertion is Inferred, never Observed, regardless of confidence.**
Every claim class must declare its **currency bound** — how old evidence may be
and still count as current — judged at the evaluation's as-of instant; until a
class declares one, its evidence is not current and its claims render Unknown.

**Owning authority.** `trust-and-evidence.md`, "Evidence, and the two other
warrants" (**adopted**); VIS-2 (**adopted**); RFC2-9 (candidate) for the
currency-bound declaration mechanism.

**Permitted aliases.** *evidence artifact* (the kernel entity class).

**Deprecated synonyms.** *proof* (over-claims), *data*, *logs*, *the CI
output* — evidence is a class with declared properties, not a file type.

**Related but distinct.** Rendering tier (T-16 — how strongly it supports);
Warrant (T-17 — authorizes an act; explicitly **not** evidence);
Observation record (T-23 — one immutable kind of evidence).

**Example.** A retained JUnit XML artifact naming the exact revision under
test, referenced by identity and digest from the snapshot.

**Misuse.** "The worker said the tests passed" treated as evidence that tests
passed. That is Observed **as a report fact** only (SDR-9, adopted);
`report-fact` supports claims about the report, never about the subject matter.

---

#### T-15 · Claim epistemic label

**Plain language.** One of exactly three words describing how a claim is
grounded: Observed, Inferred, or Unknown.

**Formal definition.** Narrative and exploratory claims must be labeled
Observed, Inferred, or Unknown, and **the labels are exclusive**:
**Observed** — a deterministic claim carrying a resolvable evidence link;
**Inferred** — the output of a declared inference process, carrying its
inference provenance; **Unknown** — a claim that is neither evidence-backed
Observed nor valid Inferred, including one whose evidence is missing,
inaccessible, or stale. **Missing evidence never renders a claim Inferred** —
absence of evidence does not make a claim probabilistic; it makes it Unknown.
**No evidence means Unknown, never green, never zero** (VIS-2; SDR-6).

**Owning authority.** `trust-and-evidence.md`, "Status claims vs narrative
claims" (**adopted**); VIS-2 (**adopted**); SDR-6 (**adopted owner ruling**)
for never-zero; RFC2-24 (candidate) for the twelve closed Unknown *reasons*.

**Permitted aliases.** *epistemic label*, *the three-label rule*.

**Deprecated synonyms.** *confidence*, *certainty level*, *N/A*, *TBD*,
*not applicable*, *0* — every one of these is a way of not saying Unknown.

**Related but distinct.** **Unknown (T-31)** — this entry defines the
*dimension* and restates `Unknown` only as one of its three values; **T-31
carries the definition of record for the value**, and is the entry to read
where the two restatements differ in wording. State plane (T-06 — Observed and
Inferred are bound in both systems, §1); Rendering tier (T-16 — a tier
restricts a label, never replaces it); freshness state (`fresh`/`stale`/`broken`/`superseded`, RFC2-10 —
orthogonal to all three labels).

**Example.** "40 modules Unknown (reason: `missing-evidence` ×31,
`no-currency-bound-declared` ×9)" — aggregated honestly, reason counts
disclosed, each expandable.

**Misuse.** Rendering a region green because its neighbours are green
(VIS-1 violation); rendering an absent cost as `0` (SDR-6 violation).

---

#### T-31 · Unknown

**Plain language.** *We do not know.* Not zero, not empty, not fine — an
answer the system is required to give and required to show.

**Formal definition.** A claim that is neither evidence-backed **Observed**
nor a valid **Inferred** is **Unknown**, including one whose supporting
evidence is missing, inaccessible, or stale. **No evidence means Unknown,
never green, never zero.** Missing evidence never renders a claim Inferred —
absence of evidence does not make a claim probabilistic; it makes it Unknown.
An absent quantity renders Unknown, never `0`. An Unknown carries a **reason**
from a closed vocabulary of twelve (RFC2-24, candidate), and a count of
Unknowns discloses its reason breakdown rather than aggregating them into one
number.

**Owning authority.** **VIS-2 (adopted)**; `trust-and-evidence.md`, "Status
claims vs narrative claims" (**adopted**); **SDR-6 (adopted owner ruling)** for
never-zero. RFC2-24 (candidate) for the twelve closed reasons; RFC2-25
(candidate) for the two Unknown-parented tiers, `declared-only` and
`suspended`.

**Lifecycle.** Retired only if VIS-2 is amended, which would be a doctrine
change. This is the most firmly held term in the registry and the one with the
strongest adopted backing.

**Permitted aliases.** none. Write `Unknown`.

**Deprecated synonyms.** *N/A*, *TBD*, *not applicable*, *unknown* rendered as
`0`, *—*, *no data*, *pending*, an empty cell, a grey badge with no reason.
Every one of these is a way of not saying Unknown, and several of them read as
a *negative answer* rather than as an absent one.

**Related but distinct.** *Claim epistemic label* (T-15 — `Unknown` is one of
its three values, and T-15 is the dimension, not the value; the core tier used
to name this term and point at that ID, which is the mismatch corrected on
2026-08-06). **This entry carries the definition of record for the value
`Unknown`**; T-15 defines the three-value dimension and restates the value
only as one of its members. Where the two restatements differ in wording, this
entry is the one to read — and both are restatements, so the owning authority
still wins over either. *Gap* (T-20 — a gap is something evidence establishes
to be absent; an Unknown is not knowing whether it is absent. Rendering an
Unknown as a gap manufactures knowledge). *Contradiction* (T-19 — two
authorities that cannot both hold, which is more information than Unknown, not
less).

> **Settled 2026-08-16 — SDR-35.** The two-term rule — **no evidence →
> Unknown; evidence of non-satisfaction → Gap** — is ratified as the owner
> ruling on **P-36**. Record: `../../../decisions/SURFACE-DECISION-RECORD.md`
> (SDR-35); `../../../decisions/UNKNOWNS-AND-GAPS-DECISION.md`. This entry's
> boundary line above states the ratified reading.

**Example.** "40 modules Unknown (reason: `missing-evidence` ×31,
`no-currency-bound-declared` ×9)" — aggregated honestly, reason counts
disclosed, each expandable. A map that is predominantly grey on an undeclared
project is **correct output**.

**Misuse.** Rendering a region green because its neighbours are green; showing
an unmeasured cost as `0`; folding Unknowns of different reasons into one
count; treating "no evidence found" as "no problem found".

---

#### T-16 · Rendering tier (also called "evidence tier")

**Plain language.** How strong the backing for one answer is — six fixed
strengths, each sitting inside one of the three ways an answer can be
grounded.

> **Naming conflict, recorded not resolved (2026-08-05b).** RFC2-25 — the
> owning clause — calls this a **rendering tier**, and so do RFC-0001,
> RFC-0002 (×2), RFC-0006 and RFC-0008: five uses. RFC-0005's
> `execution-profiles.md` and RFC-0010 call it an **evidence tier**: two uses.
> This registry previously carried only the minority name, which made a
> restatement look like a rename of the term its own owning clause defines.
> The registry does not get to choose: the majority name leads here, the
> minority name is recorded as a synonym, and **which one the corpus adopts is
> an open question for the owner** — see `PENDING-OWNER-DECISIONS.md`. Both
> names denote exactly the same six closed values; no reader is at risk of
> meaning-drift, only of thinking one of the two is wrong.

**Formal definition.** Six tiers, closed, each inside exactly one parent label.
A tier qualifies how a claim renders and may only **restrict** its parent
label's authority, never extend it. **A tier never becomes a fourth epistemic
label.** Inside **Observed**: `gate-backed` (a retained, resolvable gate
artifact bound to the exact revision — **the only tier that may support a
positive status claim**), `report-fact` ("X reported Y" is Observed as a fact
about the report; Y is not thereby Observed), `reduced-fidelity` (deterministic
at a declared coarse granularity). Inside **Inferred**: `asserted-by-worker`
(an LLM worker's assertion with no retained artifact — visible, never green,
challengeable, never a status input). Inside **Unknown**: `declared-only` (the
declaration is Observed; its satisfaction is Unknown — both halves render),
`suspended` (an Unknown carrying a visible basis under question).

Outside the registry sit **three closed sibling surface states** —
`dismissed-by-decision`, `unadopted-draft`, `editorial-draft` — which *replace*
a status rendering; and `challenge-pending`, which *accompanies* an unchanged
one.

**Owning authority.** RFC2-25 (candidate); SDR-9 and SDR-33 (**adopted owner
rulings**) behind `report-fact` and `reduced-fidelity`.

**Permitted aliases.** *evidence tier* — the minority name, which this entry's
own title carries as a parenthetical. (An earlier revision listed *rendering
tier* here, which is this entry's **own heading**: a term cannot be an alias of
itself, and listing it as one hid which of the two names the registry had
actually chosen. Review RD-3, finding F-1.)

**Deprecated synonyms.** *evidence strength*, *confidence tier*, *quality
level*.

**Related but distinct.** Claim epistemic label (T-15 — the parent);
Evidence (T-14); sibling surface states (not tiers).

**Example.** A capability with a declared implementation mapping and no
verification renders `declared-only`: the mapping is Observed, the satisfaction
is Unknown, and both halves must be visible.

**Misuse.** Minting a seventh tier, or rendering `gate-backed` as if it were a
label. Both require an amendment; neither is an implementation choice.

---

#### T-17 · Warrant

**Plain language.** The recorded authority that permits an act — which is a
different thing from the evidence that describes a state.

**Formal definition.** **Status describes; warrant authorizes.** Two acts are
authorized by warrants that are *not* evidence: a **recorded decision**
(attributed, timestamped, individually revertable — it may suppress a gap,
rendered *dismissed by decision*, never as resolved or green, and takes
effect only once committed out to the governed plane with a reason and an
expiry); and a **work warrant** — creating or prioritizing work requires
traceable authority from a closed set of four classes: an approved
requirement/intent, a **confirmed** finding, a declared policy, or an explicit
owner decision. A claim that both declares status and spawns work must satisfy
both gates. **Warrant is deliberately not reified**: it is a property of the
`motivates` edge or of a Decision, never a node.

**Owning authority.** `trust-and-evidence.md`, "Evidence, and the two other
warrants" (**adopted**); RFC1-8 (non-reification) and RFC1-25 `motivates`
(the four warrant classes, carried verbatim and closed) — candidate.

**Permitted aliases.** *work warrant* for the work-authorizing class.

**Deprecated synonyms.** *justification*, *reason*, *rationale*, *approval* —
each is either weaker or a different act.

**Related but distinct.** Evidence (T-14 — explicitly not a warrant);
Decision; Mission (T-27 — a bounded authority to proceed, itself
owner-act-backed).

**Example.** A confirmed gap finding — confirmed by a Decision or a declared
deterministic Policy — becomes a work warrant. **A derived gap is not a work
warrant** on its own (RFC1-21, candidate).

**Misuse.** Auto-scheduling work from a computed gap. Kernel-derived objects
are not authorities; a confirmation act is required.

---

#### T-18 · Challenge

**Plain language.** A specific, falsifiable objection to exactly one claim —
the only power inference has.

**Formal definition.** **Admissible only if it** identifies exactly one claim
(by durable identity), states a specific falsifiable concern, carries its
inference provenance (or, if human-authored, attribution), and is individually
resolvable. Mere model uncertainty, batch objections, and unfalsifiable unease
are inadmissible. States: `submitted → admitted | rejected`;
`admitted → resolved-upheld | resolved-dismissed | withdrawn | expired`.
**Only `admitted` suspends** — a submitted challenge is rendered on the claim
(`challenge-pending`) but suspends nothing. **Admission checks presence, never
merit.** **Expiry is eligibility, never an outcome**: an expiry-eligible
challenge keeps suspending until a recorded resolution act, because automatic
expiry would improve a claim over an unchanged snapshot.

**Owning authority.** `trust-and-evidence.md` (**adopted**) for the
admissibility floor and conservative suspension; RFC2-12 (admissibility) and
RFC2-13 (states, admission, resolution, expiry) — candidate.

**Permitted aliases.** none.

**Deprecated synonyms.** *flag*, *warning*, *concern*, *dispute*, *objection* —
none carries the admissibility floor, and a "flag" that suspends nothing is not
a challenge.

**Related but distinct.** Contradiction (T-19 — between authoritative claims,
exits only by adjudication: an agent's recorded adoption, or the owner in an
owner class); Gap (T-20); Inferred state (T-10).

**Example.** An inference process challenges one Aligned claim, citing a
specific untested branch. Once admitted, the claim renders Unknown
(`challenge-suspended`, `suspended` tier) with its deterministic basis still
visible.

**Misuse.** A model emitting "low confidence in this module" across 200 claims.
Batch objections and mere uncertainty are inadmissible by the floor.

---

#### T-19 · Contradiction

**Plain language.** Two authoritative claims that cannot both be true — only
the owner can settle it.

**Formal definition.** A set of authoritative claims in the same declared scope
that cannot simultaneously be satisfied — whether from different typed
authorities or from one. It renders the affected conclusion Unknown, routes to
adjudication (the owner), **is never silently resolved by precedence, and is
never auto-scheduled into work**. No surface may silently pick a winner. Its
only lawful exit is an `adjudicates` Decision.

**Owning authority.** `architecture.md`, "Typed authority" (**adopted**);
RFC1-21, RFC2-15, RFC1-18(b) (two-level contradiction identity) — candidate.

**Permitted aliases.** none.

**Deprecated synonyms.** *conflict*, *inconsistency*, *mismatch*, *error* — and
specifically, no substrate's "conflict", "failed", or "blocked" label may be
translated into Contradiction without the adapter naming which one it means
(RFC2-17, candidate).

**Related but distinct.** **Gap (T-20)** — the distinction is load-bearing: a
gap is *compatible* desired state not yet realized and exits by evidence or
dismissal; a contradiction is *co-unsatisfiable* and exits only by
adjudication. No surface, count, endpoint, or UI string may merge the two.

**Example.** A project declaration resolving to two governance roots.
Contradiction minted, routed to the owner, never repaired silently.

**Misuse.** A `contradiction-raised` verdict opened as a gap and thereby routed
into work without adjudication (RFC2-18 violation case, candidate).

---

#### T-20 · Gap

**Plain language.** Something the project decided it wants that is not real
yet.

**Formal definition.** Compatible desired state not yet realized in observed
state — the intent-vs-observed, work-generating delta. **A gap leaves a surface
in exactly two non-interchangeable ways:** *factual resolution or absence* — a
status claim requiring current evidence; or *policy dismissal* — a recorded,
attributed decision with reason and expiry, committed out to the governed
plane, always rendered **dismissed by decision**, never green, resolved, or
aligned. A dismissal whose reason or expiry is not current at the as-of instant
renders the gap again — through a new evaluation, never a wall-clock flip.
Gap identity is two-level, like Claim.

**Owning authority.** `architecture.md`, "Typed authority" (**adopted**);
`trust-and-evidence.md`, "Status claims vs narrative claims" (**adopted**) for
the two exits; VIS-6 exception (a) (**adopted**); RFC1-20, RFC2-15 (candidate).

**Permitted aliases.** none.

**Deprecated synonyms.** *TODO*, *backlog item*, *missing feature*, *tech
debt* — a gap is a computed relation between planes, not a work item.

**Related but distinct.** **Contradiction (T-19)** — the distinction is
load-bearing and is spelled out from both sides: a gap is *compatible* desired
state not yet realized and exits by evidence or dismissal; a contradiction is
*co-unsatisfiable* and exits only by adjudication. No surface, count,
endpoint, or UI string may merge the two. **Unknown (T-31)** — a gap is
something evidence establishes to be absent; an Unknown is not knowing whether
it is absent. Rendering an Unknown as a gap manufactures knowledge; rendering
a gap as an Unknown discards it. Work item (a gap is *addressed*, never
*closed*, by work — RFC1-25 `addresses`).

> **Settled 2026-08-16 — SDR-35.** The two-term rule — **no evidence →
> Unknown; evidence of non-satisfaction → Gap** — is ratified as the owner
> ruling on **P-36**. Record: `../../../decisions/SURFACE-DECISION-RECORD.md`
> (SDR-35); `../../../decisions/UNKNOWNS-AND-GAPS-DECISION.md`. The example
> below states the ratified reading.

**Example.** An adopted requirement whose current admissible evidence
establishes that it is **not satisfied** at evaluation E is a gap at E. An
adopted requirement with **no** verifying evidence at E is **Unknown**, never
a gap (VIS-2). V0 surfaces absence as Unknown; V1 computes gaps as navigable,
work-generating objects (`v1.md`, the V0/V1 gap boundary; SDR-12, adopted).

**Misuse.** Rendering a dismissed gap green. Dismissal claims nothing about the
facts and always renders as *dismissed by decision*, with reason and expiry
visible.

---

### Group D — Time, evaluation, and evidence records

---

#### T-21 · Source snapshot

**Plain language.** A closed list identifying every input that could affect an
answer — so anything not in it cannot influence the answer.

**Formal definition.** A snapshot **identifies every deterministic input
capable of affecting the observed graph or a status claim**, by version or
content hash. Its minimum input list is enumerated in eleven numbered items —
repositories and working-tree state; governance artifacts with adoption status
as a fact; the work-state export; consumed test/CI/verification reports with
the revision each claims; the runtime observation dataset and its window;
captured execution evidence; observer/adapter/parser/layout/policy/kernel
versions; deterministic parsing configuration; open challenges, decisions, and
adjudications; the identified prior observation records admitted; and the
owner-act records establishing effective status. **Item numbers are
load-bearing and never renumbered.** **Uncaptured means uninfluential**: a
source not identified in the snapshot must not influence any deterministic
claim of that snapshot's evaluations; affected claims render Unknown
(`source-uncaptured-or-unreachable`).

**Owning authority.** `architecture.md`, "Snapshots and the loop"
(**adopted**) — the closed semantic rule; RFC2-1 (the eleven-item minimum) and
RFC2-2 (the uncaptured rule) — candidate. The snapshot's *representation* (one
tuple or a composite) is explicitly deferred.

**Permitted aliases.** **snapshot** — permitted where no other snapshot sense
is in play. Doctrine itself uses the bare form for the constitutional rule.
Prefer the full form in schemas, APIs, and any prose near VCS or container
vocabulary.

**Deprecated synonyms.** *state capture*, *scan*, *index*, *crawl* — none
carries closure, and closure is the whole idea.

**Related but distinct.** Evaluation (T-22 — a snapshot plus an as-of instant);
Observation record (T-23 — the *output* of one evaluation over a snapshot).

**Example.** Two evaluations reading different owner-act records cannot
silently report the same effective status, because the act-record set consumed
is a snapshot item (item 11).

**Misuse.** Calling a substrate's live readiness API at answer time. A source
not in the snapshot must not influence that evaluation's answers, and the live
call defeats the identity test on re-run (RFC8-13, candidate).

---

#### T-22 · Evaluation

**Plain language.** One identified moment at which status is read — status is
always read *at* an evaluation, never in general.

**Formal definition.** A status evaluation is identified by the pair
**(source snapshot, as-of instant)** — **and nothing else**. An evaluation's
*kind* (reconciliation, observation, propagate pass) is a **descriptive label,
never identity-bearing**; no implementation may add a purpose, kind, or run tag
as a third identity component. The as-of instant is an explicit input, never
ambient wall-clock; every time-sensitive judgment — currency, staleness,
dismissal expiry, challenge expiry — is computed at it. **Degradation-only:**
a later evaluation over the same snapshot at a later as-of instant may only
*degrade* claims, never establish or improve one; improvement requires a new
snapshot carrying a permitted authoritative input (new evidence, an
adjudication result, a challenge resolution, a recorded decision, or an adopted
governance/spec artifact change).

**Owning authority.** `architecture.md`, "Snapshots and the loop"
(**adopted**) — *"Time is an explicit input, never an ambient one"*; VIS-2 and
VIS-7 (**adopted**); RFC2-3 and RFC2-4 (candidate).

**Permitted aliases.** *status evaluation* (doctrine's fuller phrasing).

**Deprecated synonyms.** *scan*, *run*, *refresh*, *check*, *sync* — the
substrate words all lose the identity pair.

**Related but distinct.** Source snapshot (T-21); Execution run (an Execution-
plane record, not an evaluation); Reconciliation evaluation (T-26 — an
*ordinary* identified evaluation, not a new kind of identity).

**Example.** "Aligned" without an evaluation identity is not a well-formed
claim (RFC2-16, candidate).

**Misuse.** "The badge flipped overnight." No status changes without a new
identified evaluation; a wall-clock flip is a violation.

---

#### T-23 · Observation record

**Plain language.** The immutable, deterministic-facts-only result of one
evaluation.

**Formal definition.** The immutable result of exactly one identified
evaluation, containing **deterministic facts only**: the evaluation identity;
the deterministic observed graph; the declared-identity base layout; every
claim instance with label, tier, reason, and resolvable evidence links;
coverage records; freshness states; the open challenge and contradiction sets
as facts (not their inferred content); and observer/adapter versions.
**Inferred material never enters it.** It is evaluation-identified historical
evidence, exempt from rebuildability under VIS-6 exception (b), displayable
after supersession only with staleness visible on the primary surface — and it
cannot silently remain green.

**Owning authority.** `architecture.md`, "Snapshots and the loop"
(**adopted**); `trust-and-evidence.md`, "The deterministic/inferred seam" and
"Staleness" (**adopted**); VIS-6 exception (b) (**adopted**); RFC2-6
(candidate).

**Permitted aliases.** none.

**Deprecated synonyms.** *report*, *scan result*, *audit*, *snapshot of
status* — the last is actively harmful, since Snapshot is a different term
(T-21).

**Related but distinct.** Source snapshot (T-21 — the inputs; the record is the
output); Evidence (T-14 — an observation record is one kind of evidence);
Historical state (T-12 — where superseded records sit).

**Example.** A broken observer degrades to its last-good observation record,
clearly marked stale/broken — it never fails invisibly.

**Misuse.** Storing observation records in `cache/`. They are identity-bearing
snapshot inputs, and a deletion-safe home would let one vanish between
evaluations (RFC3-20, candidate).

---

### Group E — Reconciliation and outcomes

---

#### T-24 · Aligned

**Plain language.** *One* thing satisfies *one* rule, at *one* named moment,
with current evidence.

**Formal definition.** A scoped relation between **one observed subject and one
cited normative claim, at one identified evaluation** — the subject satisfies
that claim, with the evidence trail current at the evaluation's as-of instant.
Realized as the predicate of a Claim, not as an edge, so every alignment stays
challengeable. Established **only by `gate-backed` Observed evidence** and only
at a named evaluation.

**Owning authority.** `architecture.md`, "Definitions" (**adopted**);
RFC1-8 (Aligned as a Claim predicate, resolving SDR §5 q3) and RFC2-16
(candidate) for the gate-backed and named-evaluation requirements.

**Permitted aliases.** none.

**Deprecated synonyms.** *compliant*, *passing*, *satisfied*, *green*,
*on spec* — every one is used loosely elsewhere and none carries the
one-subject-one-claim-one-evaluation scoping.

**Related but distinct.** **Converged (T-25) — Aligned is not the singular of
Converged**, and Converged is not the plural of Aligned; the distinction is
the point.

**Example.** "Code element X is Aligned to requirement R at evaluation E,
backed by gate artifact G."

**Misuse.** "12 of 14 aligned, so the capability is aligned." Aggregation over
a scope is Converged and carries four further conditions.

---

#### T-25 · Converged

**Plain language.** A whole declared scope is in good shape — a much stronger,
aggregate claim.

**Formal definition.** An **aggregate state over a declared target scope**, at
one identified evaluation: every mandatory normative claim in scope is aligned;
the realization is behaviorally equivalent under the declared verification
oracle and compliant with the project's declared architecture, quality,
performance, security, and evidence policies; **no unresolved contradiction
touches the scope**; and **no actionable gap remains open in it**. A Converged
claim **renders its oracle's declared coverage alongside it**; an oracle whose
adequacy is unassessed yields Unknown. Oracle adequacy is assessed by a human
or by a deterministic measure declared in the project's quality policy; an
inferred adequacy judgment carries only challenge authority.

**Owning authority.** `architecture.md`, "Definitions" (**adopted**);
RFC2-16 and RFC1-18(a) (declared scope is a typed reference, never a string) —
candidate.

**Permitted aliases.** none.

**Deprecated synonyms.** *done*, *complete*, *shipped*, *100%*, *fully
compliant*.

**Related but distinct.** Aligned (T-24); **Genome-complete** — a claim about
the normative corpus itself, saying nothing about runtime realization
(`architecture.md`, Definitions); *no gap at E* (RFC2-21, candidate).

**Example.** "Scope S is Converged at E under oracle O, whose declared coverage
is 71% of S's mandatory claims" — coverage rendered alongside, as required.

**Misuse.** Declaring convergence without rendering the oracle's coverage, or
over a **free-form scope string**. A scope string is not a scope: it names no
identified targets (RFC1-18(a), candidate).

---

#### T-26 · Reconciliation

**Plain language.** Checking, after a change merges, whether it actually
satisfied the intent that authorized it. Merging alone proves nothing.

**Formal definition.** **Unqualified "reconciliation" means exactly one thing
in Syzygy: the post-merge evaluation of whether a merged change satisfies the
intent revision that warranted it.** Every materialized work item that reaches
merge enters a chain on its durable identity:
`merged → reconciliation-pending → (reconciliation evaluation) → reconciled@E |
unsatisfied | contradiction-raised | Unknown(reason)`. The reconciliation
evaluation is an **ordinary identified evaluation** whose snapshot must include
the post-merge revision of every affected repository, the **exact intent
revision pinned in the immutable materialization record**, and the verification
evidence claimed. **Work-scheduler closure never implies `reconciled`.**

**Owning authority.** `vision.md`, Thesis (**adopted**) — *"scheduled or
completed work is never proof that the implementation satisfies intent"*;
SDR-7 and SDR-12 (**adopted owner rulings**); RFC2-17 (word reservation),
RFC2-18 (the chain), RFC2-20 (the closure fallacy), RFC8-28/RFC8-30
(candidate).

**Permitted aliases.** *the reconciliation chain*; *chain state* for the field.

**Deprecated synonyms — and this is a hard reservation.** Work-scheduler
substrates use "reconcile"/"reconciled" for **scheduler-state repair** —
"the scheduler's own records were brought back into agreement." That is a
substrate term the adapter translates on read, and **the two senses never share
a field, a count, or a UI string.** Also reserved apart: `unsatisfied` (a gap)
versus `contradiction-raised` (a Contradiction) — never merged into one count
or one badge.

**Related but distinct.** Work lifecycle state (§1 — carried *beside* the chain
state, never folded into it); Aligned (T-24); Gap (T-20).

**Example.** At V0, merged-but-unreconciled work renders "reconciliation
evidence absent / Unknown," and **a wall of such Unknowns on a fleet-built
project is correct output, not a defect** (SDR-12, adopted).

**Misuse.** "Reconciled: 12" computed from scheduler-repair events; a closed
work item rendered as *done* with no `reconciled@E` verdict.

---

### Group F — Bounded autonomy

*Every term in this group is defined **only** by candidate contracts new at
rev10. None has an adopted doctrine definition, and RFC-0010 records that
bounded missions cannot lawfully **operate** under unamended doctrine — see the
authority-coverage summary and the migration report.*

---

#### T-27 · Mission

**Plain language.** One bounded job a human explicitly approves, inside which
agents may plan, execute, verify, and recover without asking again.

**Formal definition.** A first-class identified entity binding at minimum: its
**objective and rationale**; its **target** (workspace, projects, capabilities,
requirements); its **exact pinned inputs** — the doctrine, contract,
specification, policy, and evaluation revisions it runs under, by digest or
revision identity; its **initiating owner act**; its **parent mission**, if
any; its lifecycle state and terminal outcome. Pinned inputs are **immutable
for the mission's life**: a change to a pinned input does not silently retarget
a running mission — it raises an escalation. **A mission is not work, and work
is never proof**: a mission's completion predicate is evaluated against
evidence, never against work having been performed, and a mission is authority
to *proceed inside* the gates, never authority to skip one.

**Owning authority.** RFC10-4, RFC10-6 (**candidate**). Adopted grounding:
VIS-4 (humans steer, agents shape within) — but see the note below.

> **Open authority question.** `vision.md` states Syzygy is *"not autonomous —
> the loop is human-triggered."* RFC-0010 itself records that under unamended
> doctrine, missions can be *specified* but **cannot lawfully operate**;
> proposed doctrine amendment **D3** is the owner's to adopt, amend, or
> decline. Nothing in this registry resolves that.

**Permitted aliases.** *bounded mission*.

**Deprecated synonyms.** *run*, *job*, *batch*, *sprint*, *epic*, *agent
session* — a Mission is an authority object, not a unit of work.

**Related but distinct.** Autonomy envelope (T-28 — the bounds it carries);
Work item; Proposal (T-08 — a mission is not a proposal); Warrant (T-17).

**Example.** One approved mission targeting two capabilities, pinned to
specific contract digests, with a completion predicate declaring the minimum
rendering tier it accepts (RFC-0010's own text says *evidence tier*, the
minority name T-16 records as a synonym).

**Misuse.** A mission marking itself completed because all its work items
closed, with no evidence satisfying the completion predicate (RFC10-6 violation
case, candidate).

---

#### T-28 · Autonomy envelope

**Plain language.** The bounds of an approved mission — and nothing inside it
may ever widen them.

**Formal definition.** Every approved mission carries an envelope bounding, at
minimum: permitted **change classes**; **prohibited and human-only surfaces**
(the VIS-4 always-human classes appear here as a **floor, not a choice**); the
**maximum autonomy level**; allowed projects, repositories, and paths; allowed
tools, model/provider classes, and execution profiles; **budgets** — token,
monetary, wall-clock, retry, concurrency; required gates and independent
reviews; evidence and reconciliation requirements; stop, pause, cancellation,
and expiry conditions; checkpoint and recovery obligations; escalation
triggers; and the completion predicate.

**An unstated field is the narrowest reading, never the widest** — absence of a
budget is zero delegated spend of that kind; absence of a path grant is no
write access. An **ambiguously** stated bound likewise resolves to its
narrowest defensible reading, and genuine ambiguity in a load-bearing bound is
an escalation trigger, never a call the running agent makes for itself.
**No self-widening**: no agent, fleet, worker, or component may widen any
bound — not by creating a child mission exceeding the parent's remaining
envelope, not by consuming another mission's budget, not by re-interpreting an
ambiguous bound in its own favour. Widening is exclusively a human act.
**Bound exhaustion never self-extends.**

**Owning authority.** RFC10-7, RFC10-8, RFC10-9, RFC10-11 (**candidate**).
Adopted grounding: VIS-4 (the always-human classes) and VIS-5 (adapter
authorization).

**Permitted aliases.** *envelope* (after first use).

**Deprecated synonyms.** *permissions*, *config*, *guardrails*, *limits*,
*policy* — *guardrail runtime* is a distinct thing (the enforcement plane); the
envelope is the authority object it enforces.

**Related but distinct.** Mission (T-27); execution profile (RFC5-18);
Context packet (T-30 — **reports** the envelope, never grants it).

**Example.** An envelope with no stated monetary budget delegates zero spend —
not "unlimited", and not "the default."

**Misuse.** A worker raising its own retry budget "to finish the objective."
That is an attempted self-widening: the mission transitions to `blocked`, the
attempt is recorded as evidence, and an Attention Item is minted.

---

#### T-29 · Attention item

**Plain language.** A decision-ready packet for a human — not a notification,
not an event.

**Formal definition.** A first-class identified entity binding at minimum:
**what happened**; **why human attention is required**; the affected mission,
work, and project; the **evidence and its uncertainty** (Unknowns rendered as
Unknowns); the **available choices**; the **consequence of each choice**; the
**default and expiry if ignored** — and **an expiry default must be safe:
expiry may narrow, pause, or block, and may never widen an envelope or approve
anything**; what work is **blocked**; whether the situation is **reversible**;
and, on resolution, the **resolution act and its provenance**. One authorizing
resolution act resolves **one** item, or explicitly enumerates each resolved
item's identity and the option chosen; **a bulk act over unenumerated items
resolves nothing.** The queue **compresses event volume into decision-ready
packets** — streaming every run event to the human is a violation, not a
conservative default. Items never silently disappear.

**Owning authority.** RFC10-12, RFC10-13 (**candidate**).

**Permitted aliases.** *attention queue* for the collection.

**Deprecated synonyms.** *notification*, *alert*, *inbox item*, *approval
request*, *ping* — each names a delivery mechanism; this names a decision
object with a mandatory content contract.

**Related but distinct.** Challenge (T-18 — an objection to a claim);
Contradiction (T-19 — adjudication is its exit, and an attention item may
carry it); Gap (T-20).

**Example.** "Budget 90% consumed. Choices: extend (human act), narrow scope,
stop. Default if ignored at 18:00: pause. Blocked: 3 work items. Reversible:
yes."

**Misuse.** An attention item expiring and thereby approving a pending deploy —
expiry widened authority, which the safe-default rule forbids.

---

#### T-30 · Context packet

**Plain language.** The exact, recorded set of governing material one agent run
received — so "what did it see?" is a fact, not a guess.

**Formal definition.** A versioned, **immutable**, digest-bound execution
artifact, minted per compiled run. It identifies at minimum: the objective; the
project and workspace identity; the selected evaluation and as-of instant; the
exact doctrine rules by identifier; the exact RFC clauses by clause ID at
stated revision/digest; the exact OpenSpec requirements and scenarios, once
such exist; the topology and craft policies included; the work warrant and
autonomy envelope governing the run; relevant code, test, and evidence
references; the active decisions, contradictions, challenges, and Unknowns in
scope; the allowed tools and permissions (deny-by-default); compiler and
adapter versions; **the explicitly omitted candidate context, each with its
reason**; and the packet's final digest.

**Mandatory context is selected deterministically**; inference may **add**
suggested context with provenance, and may **never suppress, demote, or
replace** mandatory deterministic context. **Incomplete is Unknown, and Unknown
blocks by default.** A packet **reports** the envelope and permissions it was
compiled under; **it is never itself an authorization source** — enforcement
re-derives every permission at the choke point, and whoever mints packets
grants nothing.

**Owning authority.** RFC11-1, RFC11-4, RFC11-5, RFC11-6 (**candidate**).
Adopted grounding: VIS-7 / the trust floor (what an agent saw is a provable
fact); SEC-2 (deny-by-default grants).

**Permitted aliases.** *packet* (after first use); *governed context packet*.

**Deprecated synonyms.** *prompt*, *context window*, *system prompt*, *RAG
result*, *retrieved docs* — all four name a mechanism; this names an immutable,
digest-bound provenance artifact.

**Related but distinct.** Autonomy envelope (T-28 — a mandatory packet *input*,
and the actual authority); Source snapshot (T-21 — inputs to an evaluation, not
to a run); governed memory (RFC11-8).

**Example.** A packet for a doctrine-amendment task listing 4 doctrine rules,
9 clauses, 2 policies, and 31 omitted candidates each with its reason.

**Misuse.** Instructing an agent to "read all project documentation," or
dispatching it with no packet. Both are violations, not fallbacks (RFC11-3,
candidate).

---

## 5. Authority-coverage summary

**How the figures on this page are obtained, and what still owns them.** Every
count in this section is a *derived value* over this file's own contents —
the class verification rule 3 exists to catch, and the class this registry was
once caught in: two figures here disagreed with a third by one, and one of
them failed its own arithmetic (review RD-16 finding 6). All four self-counts
— entries, core terms, terms corresponding to a frozen doctrine noun, and
terms outside the frozen list — were **recomputed on 2026-08-10** by
enumerating the `#### T-nn` headings and the core table's ID column, and
corrected below. **No check in the battery recomputes them**, so they are only
as fresh as the last hand-run sweep; adding that recompute is routed to the
scripts batch (`R-SCR`). Until it exists, treat any of these numbers quoted
outside this file as stale by default.

| Coverage | Terms | Count |
|---|---|---|
| Definition anchored in **adopted** doctrine or an owner ruling (candidate clauses add mechanism only) | T-01, T-02, T-03, T-04, T-05\*, T-07, T-09, T-10, T-11, T-13, T-14, T-15, T-17, T-18, T-19, T-20, T-21, T-22, T-23, T-24, T-25, T-26, **T-31** | 23 |
| Definition exists **only** in a candidate contract | T-06, T-08, T-12, T-16, T-27, T-28, T-29, T-30 | 8 |

\* T-05's *adopted* anchor is doctrine's typed-authority table routing
observable behavior to `openspec/`; the reference-not-content rule is
candidate (RFC1-15).

**What this table means.** Eight of thirty-one foundational public terms — including
the word "plane" itself — have **no adopted definition anywhere**. They are
usable vocabulary and unusable authority. Any artifact that must *bind* on
T-06, T-08, T-12, T-16, T-27, T-28, T-29, or T-30 is waiting on an owner act.

**A further gap, recorded because it surprised us.** Doctrine freezes thirteen
technical nouns for citation in `architecture.md`, "Vocabulary": *project,
capability, gap, contradiction, evidence, warrant, aligned, converged,
genome-complete, genome, snapshot, evaluation, observation record*.
**"Claim" is not among them** — although RFC1-24 makes the Claim the sole
carrier of all positive status. **Twelve** of this registry's entries
correspond to a frozen noun — ten by exact name (T-01, T-04, T-14, T-17,
T-19, T-20, T-22, T-23, T-24, T-25) plus *Project Genome*→genome and *Source
snapshot*→snapshot; the frozen *genome-complete* has no registry entry of its
own. **Every other entry sits outside the frozen list** — nineteen at this
recompute, and stated as "every other entry" so the sentence cannot fail its
own arithmetic the way its predecessor did (it read *eighteen* against
thirty-one entries and twelve correspondences). Their stability today rests on
candidate contracts.

---

## 6. What this registry does not establish

- **It is not evidence that the vocabulary is coherent.** It records what the
  31 listed terms mean and who owns each meaning. It has twice been shown not
  to be: `Gap` (T-20) and `Unknown` (T-31) classified one case in opposite
  ways until 2026-08-10, and the correction that resolved it follows adopted
  doctrine but is **not a ruling** — see the disclosure in both entries and
  **P-36**.
- **There is no term for "the difference between desired and observed", and
  that is deliberate** (recorded 2026-08-10, review RD-16 finding 3). The
  aggregate the narrative most often reaches for — *gaps · contradictions ·
  Unknowns* taken together — is named by no entry here, by none of doctrine's
  thirteen frozen nouns, and by no glossary bullet. `Gap` (T-20) is a strict
  subset: *compatible* desired state excludes contradictions, and T-31
  excludes Unknowns. **The sanctioned phrasing is the plain phrase "the
  difference"**, which is what adopted doctrine itself uses (`vision.md`:
  "Syzygy computes and shows the difference…") and what `README.md`'s diagram
  node carries. Admitting a term for it would have to pass §3's five
  conditions, and no one has proposed one that does. Reaching for a reserved
  term instead is how `intent/OVERVIEW.md` came to use `Reconciliation` in the
  sense T-26 reserves against — the defect this bullet exists to prevent
  recurring.
- **The corpus was not swept for terms used normatively that are absent from
  this registry entirely.** That is the larger unrun half of a lexical audit,
  and the migration report says so under its own finding.
- **The admission rule (§3) was applied to no incumbent term.** Every entry is
  vocabulary admitted by prior use. The rule governs what comes next.
- **No newcomer comprehension test has been run** on any of the 31 entries.
  VIS-3's fresh-reader review is a separate act, not performed here.
- **Nothing was renamed, replaced, or migrated anywhere in the repository.**
  Deprecated synonyms above are recommendations pending review; the migration
  report records what exists and what was deliberately left alone.
