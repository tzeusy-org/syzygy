# Owner direction — Redis screening: session visibility, a v5 draft and a metadata measurement

Date: 2026-11-03

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It changes no screening policy, consent or provider statement. A v5
  screening scope binds only by its own policy act.
- It starts no run and reads no repository body.

## Context

Earlier the same day the owner said Redis comes before psf/requests, as a
preference (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md`). The owner
then asked: "Let's keep working towards getting syzygy into a state where I can
have a one-shot command to generate a full Polaris for Redis."

A read-only research pass ran that session. It read no Redis body and started
no run. It found two things:
- [Inferred, from the trial bead `syzygy-olmr` and the v4 packet] 99 of the 140
  spans withheld in the 2026-10-14 Redis trial sit on files that screening
  scope v4 still withholds.
- [Inferred, from `packages/polaris-dossier/src/cli.ts` and `polaris.ts`] The
  withheld-files warning reaches the authoring session's `check`, not
  `inventory-check`. After the inventory is accepted, the supervisor's repair
  messages go only to the author. So an inventory entry citing only withheld
  files can block readiness for good.

## How the answers were given

The lead Claude Code session put three structured questions (AskUserQuestion)
to the owner on 2026-11-03, and the owner chose one option for each.

1. Question: may agents implement the code-only fix, with no change to the
   screening policy? The fix lists withheld paths in both briefs, adds the
   warning to `inventory-check`, and renders redacted spans honestly
   (`syzygy-ts8u`).
   Chosen: "Yes, plain direction (Recommended)". The option read: "Record as
   a plain owner direction extending your 2026-10-14 option D (the
   author-side warning) to the inventory session; implement, review, merge.
   No security-posture change."
2. Question: should agents draft screening scope v5, which binds nothing until
   the owner's policy act?
   Chosen: "Draft v5 with B+C+D (Recommended)". The option read:
   - Loosenings: "B is a governance-text class for root SECURITY/MANIFESTO; C
     exempts project docs from the active-content scan under v3's render
     condition; D names TLS.md and modules/MODULES.md for Redis."
   - Tightenings: "credential URLs in any scheme, a generic private-key header
     (EC/PGP keys screen clean today), more token formats."
   - Process: "Independent review, then offered to you for one act."
3. Question: how should the files and inventory rows that blocked the
   2026-10-14 trial be measured?
   Chosen: "Prepare a user-run script". The option read: "I write a reviewable
   script (metadata only) for you to run as tze now; its output decides
   whether to prepare option E (withheld-only inventory rows render as
   Unknown, a REQ-035 spec change)."

## What it directs

1. **Session-side visibility (code).** These changes are authorized in
   `packages/polaris-dossier/`, with tests:
   - a path-only census of withheld sources in the authoring and inventory
     briefs;
   - the review-visibility warning on `inventory-check`;
   - an inventory instruction to prefer admitted sources;
   - the `syzygy-ts8u` repair: a redacted-span source renders as partially
     retained, with its withheld line count, and provenance carries detector
     ids and withheld line ranges, never matched text.

   Excluded: no change to what screening admits, withholds or redacts, and no
   change to any readiness criterion.
2. **Screening scope v5 (candidate only).** Agents draft a candidate package
   with variants B, C and D and the paired tightenings, review it
   independently, and offer it for one policy act. `syzygy-ha5b` is widened
   to match. Nothing binds until that act.
3. **Metadata measurement.** Agents write a reviewable script for the owner to
   run as `tze` over the 2026-10-14 trial run's Syzygy-written JSON:
   - What it prints: paths, outcomes and counts only, never span or body text.
   - Its output decides whether option E, a REQ-035 spec change, is prepared.
   - The owner's choice of this option settles the research pass's open
     question, whether a metadata-only read after the run's deadline is
     acceptable, for this script only.
