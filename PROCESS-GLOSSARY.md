# Process glossary

> **Navigation, never authority.** This page defines the vocabulary this
> repository uses to talk about *its own process* — how a document becomes
> binding, who may make it so, and what the shorthand identifiers mean. It
> defines no product term, adopts nothing, and binds nothing. Where this page
> and an owning record disagree, **the owning record wins and this page is
> stale.** For every claim below about current wave, gate or launch state, that
> owning record is [`PROJECT-STATUS.md`](PROJECT-STATUS.md) — named here rather
> than left implicit, so a reader who suspects a sentence has gone stale knows
> where to check without first working out who owns the answer.
>
> Two other glossaries exist and this one replaces neither:
>
> | For | Go to |
> |---|---|
> | Adopted product/doctrine terms | [`doctrine/README.md`](.syzygy/governance/doctrine/README.md#glossary-read-first) — **adopted**, seven entries |
> | The wider working product vocabulary | [`TERM-REGISTRY.md`](.syzygy/governance/contracts/candidates/policy-candidates/TERM-REGISTRY.md) — **candidate** |
> | How this repository's process works | this page |
>
> Written 2026-08-13 to close review finding RD-50 f8: seven process terms
> were used on the default reading path before anything defined them.

## The lifecycle of a document

Since doctrine amendment D10 (2026-11-18), five words name **increasing
force** — candidate, confirmed, adopted, accepted, recorded — and they are not
synonyms: a document at one level must never be described using a word from
a higher one, and an agent adoption is never described as the owner's.

| Word | Means | Who makes it so |
|---|---|---|
| **candidate** | Drafted and reviewable. **Binds nothing.** May be discussed, may not be cited as authority. Most of this repository is here | anyone |
| **confirmed** | An independent fresh-context reviewer examined the exact bytes and returned `CONFIRM`. Says the bytes are ready — **still binds nothing**, and since D10 a review gates nothing either | a reviewer |
| **adopted** | An agent landed it on the default branch with a row in `decisions/AGENT-ADOPTIONS.md` (commit, what, why, revert command; a spec version also gets a tag). Binding until the owner vetoes it. Covers everything outside the four owner classes | an agent (VIS-4) |
| **accepted** | An owner **act** was performed on it before D10, with a typed phrase over a digest. Binding as decided; a later edit is a new adoption, not a broken act (RFC3-16 as amended) | the owner, before D10 |
| **recorded** | An owner **decision** was written down: the owner's words, dated, with the commit that applies it. No ceremony phrase, no argument. Since D10 this is how the owner decides the four owner classes (doctrine; secrets; writes into repositories the owner does not own; exposure beyond the tailnet, release, deployment, multi-user) | the owner, and only the owner |

**Confirmed is not adopted.** A `CONFIRM` verdict says the bytes are ready;
adoption is the commit plus its row. This is the distinction a newcomer most
often collapses.

- *Example:* confirmation of Waves A and B did not make them binding — the
  two acts performed on 2026-08-17 did, and each was a separate transaction
  after the review.
- *Status lives elsewhere:* what was accepted is owned by
  `.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`, what agents
  adopted by `decisions/AGENT-ADOPTIONS.md`, and both are summarised in
  `PROJECT-STATUS.md`; read those, not this page, for status.
- *Superseded, dated:* until 2026-09-05 this paragraph ended "Waves A and B
  are both *confirmed* today and **neither is accepted**; no owner act has
  been performed in this repository at all." That was true when written and
  stopped being true on 2026-08-17. Until 2026-11-21 the table had four rows
  and said only the owner made anything binding; D10 made that false on
  2026-11-18.

## Acts, arguments, offers

An act was the owner's formal transaction; its argument was the exact bytes
it bound; an offer presented a prepared act for a yes/no. D10 retired the
ceremony: no new act, argument or offer is prepared. The words remain
because the records use them.

- **act** — a formal owner transaction that changed what was binding.
  - An act had an exact **ceremony phrase** the owner typed, and an
    **argument**. Only the owner performed acts.
  - `.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md`, created by the
    first of them, is the append-only record of every one. This page
    defines the word; it never says which acts exist.
  - Since D10 the owner decides the four owner classes by a recorded
    decision, with no phrase or digest, and agents adopt everything else.
  - *(Until 2026-09-05 this entry read "No act has been performed yet;
    `decisions/ACCEPTANCE-ACT-RECORD.md` therefore does not exist, and that
    absence is correct rather than a gap" — correct when written, false from
    2026-08-17 onward.)*

- **argument** — the exact bytes an act bound, identified by a `sha256`
  digest.
  - For a wave act the argument is the digest of that wave's **whole
    manifest file** — four generated header lines plus one digest row per
    module.
  - Since D10 an argument is history, not a lock: editing a bound file is a
    new adoption (RFC3-16 as amended).
  - *(Corrected 2026-08-13, RD-54: the header names the acceptance phrase, so
    renaming the phrase regenerated the argument. Moot since D10.)*

- **offer** — presenting a prepared act to the owner for a yes/no.
  - Preparing an offer was not performing it.
  - D10 withdrew the unperformed offers its package lists (`RETIREMENTS.md`
    §C in `contracts/candidates/governance-simplification-d10/`); none is
    presented again.

- **adoption** — an agent's decision under VIS-4 as amended by D10: the
  change lands on the default branch and one row in
  `decisions/AGENT-ADOPTIONS.md` names the commit, what changed, why and the
  revert command.
  - The pull request or session summary that links the row is the report.
  - **veto** — the owner's revert of an adoption, at any time, by saying so;
    recorded as a new row. A vetoed change is not adopted again without the
    owner.

- **wave** — one batch of contract modules accepted by one act.
  - There are six (A, B, C1, C2, D1, D2).
  - Waves A and B are the launch path; C1/C2/D1/D2 are **deferred** —
    candidate, not accepted, not used by the launch target, and excluded
    from default task routing.

- **retire / survive** — what happens to a *confirmation* when bytes move.
  If the bytes a review confirmed change, that review no longer covers them
  and is **retired**; otherwise it **survives**.

## Identifiers

Identifiers are amended in place or retired — **never renumbered**.

- **Forms here, instances elsewhere.** This page defines the *forms*. For
  the *instances* — every identifier that exists, and the file and line
  where each is defined — see [`DIRECTIVE-REGISTER.md`](DIRECTIVE-REGISTER.md),
  which is generated from the corpus on every CI run.
  - It answers "where does `CC-SPEC-11` live?"; it deliberately does not
    answer "what does it say?", because only the clause does.

| Form | Is | Example |
|---|---|---|
| `P-nn` | An open **owner decision**, queued in `PENDING-OWNER-DECISIONS.md`. Since D10 a row outside the four owner classes may be closed by an agent adoption | `P-41` — the specification-acceptance craft act |
| `RD-nn` | A **review**. Raw reviewer output, stored verbatim and never edited | `RD-49` — the P-33 review |
| `VIS-n`, `SEC-n` | An adopted **doctrine** rule. Binding since 2026-07-30 | `VIS-2` — no evidence means Unknown |
| `A-n` | An **agent adoption**, one row of `decisions/AGENT-ADOPTIONS.md` | `A-4` — the dossier declared-source model |
| `SDR-n` | A prior recorded owner **decision** | `SDR-9` |
| `CC-*` | A **craft policy** clause; owner-approved before D10, changed since by agent adoption | `CC-REV-3` |
| `RFCn-m` | Clause *m* of candidate contract RFC-000*n* | `RFC3-15` — the governance category rules |
| `D1`, `D2`, `D3` | A **doctrine amendment**. D1 and D2 are in force; D3 is a candidate | |
| `CG-nn` | A check inside `check_governance.py` | `CG-15` |
| `round-YYYY-MMx` | One work pass, with its own reviews and reports. Historical once superseded | `round-2026-08g` |

`D1`/`D2` as doctrine amendments and `D1`/`D2` as deferred waves are
different things that share a spelling. Context distinguishes them; nothing
else does.

## The launch gate

The launch gate is a fixed question set that judges whether the repository
is ready for its first specification; it is an instrument and authorizes
nothing.

- **launch gate** — a fixed question set (`A1…G1`) asking whether this
  repository is ready for anyone to author its first specification. It is an
  **instrument**: it judges, and it authorizes nothing.

- **administration** — one run of the gate against the corpus, producing a
  record. The record is **structured JSON**; the human-readable Markdown
  report is *generated from it and never read back as authority*.

- **formal administration** — an administration that may be cited as launch
  evidence.
  - It must be run in **fresh context**, by someone who is not an authoring
    session of this repository, preferably outside the corpus authors' model
    family.
  - Which administrations have been run, and what each returned, is a status
    question this page does not own: the launch-path table in
    `PROJECT-STATUS.md` owns it, and the records live under
    `.syzygy/governance/decisions/launch-gate/`.
  - The 2026-08-09 run was a **pilot**, not a formal administration, and is
    steering evidence only.
  - *Superseded, dated:* until 2026-09-05 this entry read "**None has ever
    been run.** The only administration on record is the 2026-08-09 pilot,
    which returned `NOT READY`." That was true when written and stopped
    being true on 2026-08-18, when Administration 1 was performed
    out-of-family in fresh context — an administration whose own strongest
    findings were stale current-state claims on the default path, of which
    this sentence was one.

- **E1…E6** — the six readiness questions in the gate's section E, the
  section that asks the gate's actual question. Abbreviated constantly:

  | | Asks |
  |---|---|
  | **E1** | Is it defined what a specification *is* here — form, home, granularity, acceptance authority, change process — before the first one is written? |
  | **E2** | Is the first specification identified, with every prerequisite satisfied or explicitly waived? |
  | **E3** | Would authoring the first spec force reopening any vision- or shape-level question? *The sharpest single gate — an empty list is the readiness signal* |
  | **E4** | Is the shape/spec boundary crisp enough that an author knows which side a sentence falls on, without asking? |
  | **E5** | Do acceptance criteria exist for a specification itself? |
  | **E6** | Is there a defined propagation path for a shape change *after* specs exist? |

  `A`–`D`, `F`, `G` cover problem and vision, decomposability, spec-driven
  discipline, comprehensibility, process health, and the gate's scrutiny of
  itself.

- **`READY` authorizes nothing.** It is evidence the owner may weigh when
  making a separate launch decision.

## Review vocabulary

These terms define a review's verdict words and fresh context, where its
raw output and each finding's outcome are kept, and what model family,
digest binding and semantic deltas mean for a review.

- **verdict words** are a closed set and are **copied exactly**, never
  paraphrased: `CONFIRM`, `CONFIRM WITH EXCEPTIONS`, `REVISE`. "Pass with
  findings" is not a verdict and never substitutes for `EXCEPTIONS`.

- **fresh context** — the reviewer is given only the artifact, its governing
  references, and the acceptance criteria. No summaries, no prior verdicts,
  no "how it's going".

- **raw review lane** — the directories holding reviewer bytes verbatim
  behind a provenance banner. **Never edited**, including to fix an error
  the reviewer made; the register records the disposition instead.

- **disposition register** — where each finding's outcome is recorded, in
  the vocabulary `repaired` · `open` · `declined`. Never "acknowledged".

- **same-model-family** — the reviewer is the same model family as the
  corpus authors. Such a review **supports repair** and is never the formal
  launch administration. Every review obtained so far is same-family, and
  each one says so.

- **exact-package review** — a review bound to a specific digest. Editing
  the subject afterwards makes the review worth nothing, however small the
  edit.

- **semantic delta** — the document normative changes travel in.
  "Editorial" and "no semantic change" are reviewable claims, not
  exemptions.

## Epistemic labels

Three labels are used on substantive claims throughout, and they are
load-bearing:

```text
[Observed]   measured, with the method and denominator available
[Inferred]   reasoned. An LLM assertion is always Inferred, never Observed
[Unknown]    no evidence — never rendered as green, never as zero
```

`Unknown` is a **result**, not a failure to produce one.

## Where to ask what

Each question has one owning record; this page owns none of them.

| Question | Owning record |
|---|---|
| What is this project? | [`README.md`](README.md), [`OVERVIEW.md`](.syzygy/intent/OVERVIEW.md) |
| What is the current gate state? | [`PROJECT-STATUS.md`](PROJECT-STATUS.md) |
| Has the owner decided X? | [`decisions/README.md`](.syzygy/governance/decisions/README.md) |
| What does this *product* word mean? | the two glossaries at the top of this page |
| How do I work in this repository? | [`AGENTS.md`](AGENTS.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) |
