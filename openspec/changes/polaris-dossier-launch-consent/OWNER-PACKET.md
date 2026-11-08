# Owner packet — Polaris on any repository, consent asked at launch

> **Candidate — binds nothing.** Questions for you, each with a
> recommendation. Nothing here is decided, no consent is recorded, and no act
> is offered until a fresh-context review confirms these bytes.

## What you asked for, and what it takes

You asked to point Polaris at any repository whose source you hold and get a
dossier, defaulting to the latest trunk commit, Syzygy's own repository
included (your direction of 2026-11-08, recorded as
`POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08` in
`decisions/POLARIS-DOSSIER-LAUNCH-CONSENT-DIRECTION.md`).

The draft keeps every consent the rules require, one per repository and
revision, but asks you for it when the run starts instead of in a separate
sitting:

- **046:** `syzygy dossier init` (and `syzygy polaris`, once its own change
  is signed) asks you in the terminal, before reading anything: "this
  repository, this commit, Syzygy may read it; for a governed project, your
  agent's provider may receive these classes". You type the confirmation.
  Syzygy writes the consent record (and, for a governed project, a separate
  provider statement) into its own `decisions/` home. Each is revocable like
  any other consent.
- **047:** with no `--revision`, the run pins the commit your clone's trunk
  points to (its remote's default branch, else `main`, else `master`).
- **Self-observation:** allowed, from a separate checkout of Syzygy.

**It needs no doctrine or contract amendment** [Inferred; `design.md` §1 sets
out the reading clause by clause, and the reviewer is asked to test it]. The
rules require a recorded, per-repository consent; they do not say it must be
drafted and signed in advance. The parked standing-consent change needed
amendments because it dropped the per-repository record; this one keeps it.

**It does need one act from you besides sign-off:** a write consent letting
Syzygy write those records into its own repository (Q3). SEC-4 says Syzygy
writes into a governed repository only with recorded consent, and Syzygy's
own repository is governed.

## Already settled by your words

- **Default revision:** the latest trunk commit; `--revision` stays
  available. (Whether "latest" means your clone's tip or a fetched one is Q8.)
- **Self-observation:** permitted.

## Questions

### Q1. Approve the launch-consent design?

Ask at launch, in the terminal, record one observation consent per
repository and revision, plus a separate statement for governed projects.

- **A (recommended).** Yes, as drafted.
- **B.** Yes, but ask once per repository, covering every later trunk
  revision. Fewer prompts; but a consent naming future commits is a standing
  consent in all but name, and needs the amendments the parked change
  carried.
- **C.** No; keep the separate sitting per repository.

### Q2. Public repositories only, or private too?

The classification policy's public-source scope admits public repositories
only. Syzygy's own repository is public [Observed, 2026-11-08].

- **A (recommended).** Public only for now. A launch on a repository you
  declare private is refused, naming the missing policy.
- **B.** Private too. Needs a classification-policy successor admitting
  private sources, and its own review and act; drafted as a separate item.

### Q3. The write consent for Syzygy's own repository

One owner act, recorded once: Syzygy may write launch-consent records, and
only those, as new files under one named location in its own
`.syzygy/governance/decisions/`.

- **A (recommended).** Grant it, as a reviewed instance and owner-act record,
  scoped to that one record class and location.
- **B.** Treat the launch command as your own recorder, like the existing
  recorder scripts, with no write consent. Cheaper, but it reads SEC-4
  narrowly and a reviewer may not accept it.

### Q4. Where the records live and how they reach git

- **A (recommended).** `decisions/launch-consent/`, one directory per launch.
  Syzygy writes and never commits; you (or your session, on your word)
  commit them. A run may proceed on an uncommitted record, and the run page
  says whether the record was committed at close.
- **B.** As A, but refuse to render until the record is committed.
- **C.** Syzygy commits each record itself on the current branch. Needs the
  write consent to cover commits too.

### Q5. The answer must be yours, but an agent could type it

Syzygy cannot tell who typed the confirmation. The draft forbids agents in
every skill and instruction text, and discloses on every page that who
answered rests on your declaration (Inferred), as the execution choice does
today.

- **A (recommended).** As drafted, plus the confirmation must include the
  pinned commit's first twelve characters, so a careless auto-approve fails.
- **B.** As drafted, plain confirmation.
- **C.** Out-of-band answer (separate user or phone prompt). Strongest; new
  infrastructure.

### Q6. How long a launch consent lasts

- **A (recommended).** Until you revoke it. A later run at the same revision
  reuses it without asking, and re-rendering an old dossier keeps working.
- **B.** It expires when its run closes. Every run asks again; re-rendering a
  closed run is refused once expired.

### Q7. What a governed project's provider statement covers

Your agent reads the whole clone whatever the statement lists (already
disclosed under REQ-033).

- **A (recommended).** The statement names every content class at the pinned
  revision, so it says truthfully what the provider may receive.
- **B.** You choose classes at the prompt; the page then discloses that the
  agent may still have sent others.

### Q8. "Latest trunk commit": your clone's tip, or fetched at launch?

- **A (recommended).** Your clone's tip, no network request; the launch
  prints the commit date and the command to update the clone.
- **B.** Fetch at launch. Needs a source-acquisition registry act covering a
  fetch for this route, which no act now does for `init`.

## How this would be signed

- The spec: by version tag under
  `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, after a
  fresh-context review confirms these bytes; the tag is assigned when the
  package is built.
- The write consent (Q3 A): its own instance and owner-act record, reviewed
  with the spec.
- Nothing is signed by an agent on your behalf (VIS-4).

## Implementation outline (after sign-off)

`design.md` §7: revision resolver; the launch-record family in the consent
package; the terminal question; the write gate; self-observation guard and
disclosures; conformance tests with a mutation pass. No implementation starts
before sign-off and the Q3 act.

## What this does not settle

- No project declaration lists observed repositories (RFC3-7's "referenced
  from the declaration"); Redis has the same gap. Flagged, not repaired.
- Reconstructed motivations and comparisons (the parked REQ-038/039) are
  separate.
