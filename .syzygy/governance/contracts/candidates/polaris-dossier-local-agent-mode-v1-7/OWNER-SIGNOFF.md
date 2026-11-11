# Owner sign-off — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] This page may be offered only after
> a `CONFIRM`, or a `CONFIRM WITH EXCEPTIONS` with notes only, over these bytes;
> this version's review campaign under `docs/review-campaigns/` names the
> verdict of record. The install tooling is
> `scripts/build_polaris_dossier_local_agent_mode_v1_7.py`. Nothing here records
> a choice; only your selection after review binds this version.

## The one question

Do you sign version 1.7, which makes a dossier run close only on what was
shown, opens the landing page with a thesis and a verified excerpt, and shows
quotations as clean text?

- **Option:** "Sign dossier spec version 1.7"

## What it does

- **Close tells the truth.** Every revision that passes its check can be
  rendered and design-reviewed at once, and design repairs get their own
  limit, so fidelity repairs cannot use them up. At close the run record names
  the site it closes on and where each review stands for it. If that site was
  not reviewed, or a review was not ready, the run closes "with a finding"
  naming why, and every page says so. Close never calls it reviewed, and
  shows a review's "ready" as the reviewer's word (Inferred), not its own.
- **A thesis first** (schema v5). The landing page opens with the title, a
  one-sentence thesis and, if the draft names one, a short excerpt of the
  project's own code, rendered by Syzygy from the repository. Then come three
  to five pillars, each with its cost and a link to the page that backs it.
  The notice, legend and review status on reading pages fold into one ribbon,
  with the legend behind "How to read this page". On the landing page the
  ribbon, with the "draft, no human review" sentence, comes after the thesis
  and the excerpt.
- **Show, then tell.** A deep dive can walk through up to 60 lines of code with
  margin notes; each note is a checked, cited claim.
- **Clean quotations.** A quotation reads as the text the check matched:
  markup, comment markers and escapes left out, quotation marks straightened
  and line breaks and repeated spaces made one space. The exact bytes stay in
  the evidence view and behind the same anchor.
- **Two notes from v1.6's review** are folded in: the base of a changed-block
  list is always a fidelity round, and a falsifier line was missing.

## Where it came from

Your choice A on `pursuit-2026-11-09-release`, as the pursuit page records it,
covers P1, P3, P5 and P13's clause-bound part. Your choice B on
`fnry-19-p13-scope` set that part's scope: every quotation, not only Markdown
ones. The two v1.6 notes are carried as `syzygy-pdja.27` asked.

## What it costs

- More renders and design reviews per run, and a second limit to declare in
  every run configuration (no default, 0 allowed).
- A design repair whose check reports findings keeps spending design budget,
  not fidelity budget. Every checked resubmission still counts, as you kept on
  2026-11-05; a refused check counts against neither limit.
- A run can still end on an unreviewed site: the change is that it can no
  longer look reviewed. If you would rather close refuse, that is a one-line
  change and a new review round.
- Quotations in the reading view are not byte-exact, and in code that can
  misspell a name: `__init__` reads `init`, and a multi-line excerpt reads as
  one line. The exact bytes are one click away. Limiting clean display to
  Markdown sources would avoid that; `SEMANTIC-DELTA.md`, "For the owner",
  item 2.
- The legend is behind one click on narrative pages.

## What it does not do

- It does not change the one-command run. A launched run still renders only
  after a ready fidelity review until that candidate moves; `SEMANTIC-DELTA.md`,
  "For the owner", item 1, gives four ways to move it.
- It changes no RFC 0007 clause. It reads RFC7-12 as allowing a mechanically
  cleaned quotation with the exact text one step away; item 2 there.
- It does not let a run past its deadline close; that stays as it is.
- No code changes until you release the gate `syzygy-fj2q`.
