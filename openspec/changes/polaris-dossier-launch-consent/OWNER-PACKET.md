# Owner packet — Polaris on any repository, consent asked at launch

> **Candidate — binds nothing.** **Answered 2026-11-08.** You answered every
> question through a questionnaire that regrouped them, recorded in
> `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08.md`;
> each question below carries its answer. The answers sign nothing and record
> no consent: the change is narrowed to them, a fresh-context review confirms
> the repaired bytes, and only then is the sign-off package offered to you.
> Revised after round 1 asked for changes (`ROUND-1-DISPOSITIONS.md`).
>
> *Text below as drafted before the answers; Q10 was drafted with no
> recommendation.*

## What you asked for, and what it takes

You asked to point Polaris at any repository whose source you hold and get a
dossier, defaulting to the latest trunk commit, Syzygy's own repository
included (your direction of 2026-11-08, recorded as
`POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08` in
`decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md`).

The draft keeps every consent the rules require, but asks you for it when the
run starts instead of in a separate sitting:

- **046:** `syzygy dossier init` (and `syzygy polaris`, once its own change
  is signed) looks only at the commit and its file listing, never a file's
  contents, then asks you in the terminal. You type a phrase naming the
  repository and the commit. That records up to three things, each its own
  revocable act:
  - permission to read this repository at this one commit;
  - if you say so, that no kernel evidence drawer exists for it, so a
    repository with no specs or Syzygy files runs as non-governed;
  - for a governed repository, which provider your agent may send which
    content classes to. This one is kept per repository and provider and
    reused at later commits.
- **047:** a run that no existing consent covers pins the commit your clone's
  trunk points to (its remote's default branch, else `main`, else `master`).
  A clone sitting on a commit an existing consent already names (Redis today)
  runs exactly as now.
- **Self-observation:** allowed, from a separate clone. The records are
  committed to a dedicated branch of Syzygy that is never the trunk, so
  recording a consent never moves the commit the next self-run pins; a second
  run on the same trunk asks nothing.

**No doctrine or contract amendment is needed**, on the drafter's reading,
which is Inferred and was tested by the round-1 reviewer (`design.md` §1).
The rules require a recorded, per-repository consent with an exact owner
phrase and a recording commit; they do not say it must be drafted and signed
in advance. Two readings in it are yours to accept when you approve Q1:
reading a commit's file listing to frame the question is preparation, not
observation; and a launch is the repository's "onboarding" in SEC-2's sense.

**It needs one act from you besides sign-off:** a write consent letting
Syzygy commit those records to the dedicated branch of its own repository
(Q3). SEC-4 says Syzygy writes into a governed repository only with recorded
consent, and Syzygy's own repository is governed.

**What still needs preparation, honestly stated:** screening placements (the
owner rules that let three named Redis files through screening at one commit)
are per repository and per commit. A repository with none still runs; files a
placement would have let through are withheld and show as Unknown, and a
withheld file can block an inventory entry's readiness. Q10.

## Already settled by your words

- **Default revision:** the latest trunk commit; `--revision` stays
  available. (Whether "latest" means your clone's tip or a fetched one is Q8.)
- **Self-observation:** permitted.

## Questions

### Q1. Approve the launch-consent design?

**Answered: A** — with a third reading you accepted: the content classes shown before you answer are a preview of the screening policy's classification once the repository is admitted (round 2, G3).

Ask at launch, in the terminal, after reading only the commit and its file
listing; record the observation consent per repository and commit, the
drawer statement per repository, and the provider statement per repository
and provider.

- **A (recommended).** Yes, as drafted, accepting the two readings above.
- **B.** Yes, but ask once per repository, covering every later trunk
  commit. Fewer prompts; a consent naming future commits is a standing
  consent in all but name and needs the amendments the parked change carried.
- **C.** No; keep the separate sitting per repository.

### Q2. Public repositories only, or private too?

**Answered: B** — private too. A launch on a repository not declared public stays refused until you perform a screening-policy successor admitting non-public sources; that successor is drafted separately.

The screening policy's public-source scope admits public repositories only.
Syzygy's own repository is public [Observed, 2026-11-08].

- **A (recommended).** Public only for now. A launch on a repository not
  declared public is refused, naming the missing policy.
- **B.** Private too. Needs a screening-policy successor admitting private
  sources, with its own review and act; drafted as a separate item.

### Q3. The write consent for Syzygy's own repository

**Answered: A** — the write-consent instance is drafted, reviewed and offered as its own act; this answer grants nothing.

One owner act, recorded once: Syzygy may commit launch consent records, and
only those, as new files on one named dedicated branch of its own repository.

- **A (recommended).** Grant it, as a reviewed instance and owner-act record
  scoped to that record class, branch and location.
- **B.** No write consent; treat the launch command as your own recorder,
  like the existing recorder scripts. This rests on reading SEC-4's "Syzygy
  writes" as excluding a command that records your own phrase at your
  terminal; under that reading the recorder scripts need none either.

### Q4. Where the records live

**Answered: A** — a dedicated branch, never the trunk.

RFC3-16 keeps an owner act as the exact phrase, its digest, the act record
and the recording commit, so a record must be committed before it counts.

- **A (recommended).** Syzygy commits each record to a dedicated branch of
  its governance home, never the trunk or your current branch, without
  touching your working tree. The trunk tip never moves, so self-runs work
  (round 1, F12). You push that branch when you want it off the machine.
- **B.** You commit each record to the trunk yourself; the brief is refused
  until you do. Each recording commit moves Syzygy's trunk, so every
  self-run asks again and the commit holding the consent is itself
  unconsented.
- **C.** Syzygy commits to the trunk. Same self-run cost as B, without the
  manual step.

### Q5. The phrase must be yours, but an agent could type it

**Answered: A.**

Syzygy cannot tell who typed it. If an agent did, the result is not an act
of yours: the contract calls accepting it an unauthorized effect and a
trust-floor violation. Disclosure on every page makes the risk visible; it
does not cure it.

- **A (recommended).** As drafted: an exact phrase naming the repository and
  the commit's first twelve characters, forbidden to agents in every skill
  and instruction text, with who answered disclosed as your declaration.
- **B.** Out-of-band answer (a separate user or a phone prompt) an agent
  cannot reach. Strongest; new infrastructure.

### Q6. How long a launch consent lasts

**Answered: A.**

- **A (recommended).** Until you revoke it. A later run at the same commit
  reuses it without asking, and re-rendering an old dossier keeps working.
- **B.** It expires when its run closes. Every run asks again; re-rendering a
  closed run is refused once expired.

### Q7. What a governed repository's provider statement covers

**Answered: A.**

Your agent reads the whole clone whatever the statement lists (already
disclosed under REQ-033).

- **A (recommended).** Every content class the file listing shows at the
  pinned commit. Reused at later commits while it still covers them; a wider
  set replaces it by a new recorded statement.
- **B.** You choose classes at the prompt; the page then discloses that the
  agent may still have sent others.

### Q8. "Latest trunk commit": your clone's tip, or fetched at launch?

**Answered: A.**

- **A (recommended).** Your clone's tip, no network request; the launch
  prints the commit date and the command to update the clone.
- **B.** Fetch at launch. Needs a source-acquisition registry act covering a
  fetch for this route, which no act now does for `init`.

### Q9. The drawer statement at launch

**Answered: A.**

A kernel evidence drawer is Syzygy's evidence store for a project. A
repository whose drawer status nobody has stated counts as governed, and so
needs a provider statement. Today that statement is a separate act per
repository.

- **A (recommended).** Ask at launch: "none exists", "one exists" or "don't
  know". "None exists" records a drawer statement for that repository,
  reused afterwards; the other two leave it governed.
- **B.** Don't ask; every launched repository is governed and needs a
  provider statement, which the same question then asks for.

### Q10. Should screening placements follow the trunk?

**Answered: A** — placements stay per commit.

Placements name one repository at one commit. A trunk-tip run of Redis at a
newer commit gets none of them, and a new repository has none. No
recommendation: the options are drafted for your choice.

- **A.** Leave them as they are: optional, per commit;
  a run without them proceeds, the files they would have let through are
  withheld and shown as Unknown. Placements for a new commit come only from
  a new policy version.
- **B (drafted, not decided).** A screening-policy successor carries a
  placement forward from its named commit to a later pinned commit when
  every placed path's file is byte-identical at both (same Git blob
  identifier); a changed or missing path is not carried and is withheld. No
  file's contents are judged anew, and the run page lists each carried
  placement with the commit it came from. Needs its own policy review and
  act.
- **C.** A placement question at launch: Syzygy lists withheld paths and you
  place them for this commit. Most flexible; it puts a screening decision in
  the launch prompt, which the screening policy does not now allow.

## How this would be signed

- The spec: by version tag under
  `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, after a
  fresh-context review confirms these bytes; the tag is assigned when the
  package is built.
- The write consent (Q3 A): its own instance and owner-act record, reviewed
  with the spec.
- Q2 B and Q10 B, if chosen: each its own screening-policy successor.
- Nothing is signed by an agent on your behalf (VIS-4).

## Implementation outline (after sign-off)

`design.md` §7: revision resolver and identity derivation; one generic launch
consent record family with no per-repository code; the terminal question;
the write gate; self-observation guard and disclosures; conformance tests
with an instrumented object store and a mutation pass. No implementation
starts before sign-off and the Q3 act.

## What this does not settle

- No project declaration lists observed repositories (RFC3-7's "referenced
  from the declaration"); Redis has the same gap. Flagged, not repaired.
- Repository identity (round 2, G1), answered A on 2026-11-08 outside the
  numbered questions: your phrase declares the identity Syzygy proposes; a
  matching record's identity is proposed before a newly derived one; matching
  records that disagree are refused before asking. A URL change at a commit no
  record names still splits the identity, a fork at an upstream commit is
  proposed the upstream identity, and two repositories sharing the last two
  URL segments share one; all are disclosed, labelled Inferred. The refusal when matching records disagree was drafted after your
  answer, as the direction record says it was owed; round 3 accepted it.
- Reconstructed motivations and comparisons (the parked REQ-038/039) are
  separate.
