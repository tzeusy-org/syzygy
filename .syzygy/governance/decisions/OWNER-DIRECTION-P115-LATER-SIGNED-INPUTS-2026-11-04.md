# Owner direction — P115 accepts a signed later version of a frozen input; dossier v1.3 signed

Date: 2026-11-04

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It does not itself sign anything. The dossier v1.3 sign-off it reports is
  recorded by its own version-tagged record,
  `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`.
- It starts no run and reads no repository body.

## Context

The signed P115 sign-off
(`THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`,
2026-10-27) froze the digests of eight governing input specifications. One
of them is the Polaris dossier local-agent mode spec at its v1.2 bytes. P115's
signed check failed on any change to those bytes, so installing the reviewed
dossier v1.3 would have made P115 read as unsigned and failed the governance
battery. The v1.3 owner packet
(`contracts/candidates/polaris-dossier-local-agent-mode-v1-3/OWNER-DECISION-PACKET.md`,
question 2) asked how P115 should treat a later signed version of an input.

## How the answers were given

The lead Claude Code session put structured questions (AskUserQuestion) to
the owner on 2026-11-04, at about 13:35Z, and the owner chose one option for
each.

1. Question: sign off version 1.3 of the dossier local-agent mode?
   Chosen: "Sign version 1.3 (Recommended)", meaning sign the reviewed v1.3
   bytes (round 2, `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md`,
   CONFIRM WITH EXCEPTIONS, notes only).
2. Question: how should the P115 freeze treat a later signed version of an
   input?
   Chosen: "Accept signed later versions (Recommended)". The option read:
   "Change P115's checker so it treats a recorded, reviewed, signed later
   version of an input as current. Cost (review note 14): nobody re-confirms
   P115's 'explicitly-unaffected' reading of REQ-034 for the amended text."
3. Question: v1.3 renders an empty table cell with the words "no entry"; the
   owner wants `-`. How should that land?
   Chosen: "Sign 1.3 now, `-` in v1.4 (Recommended)". The v1.3 bytes are not
   edited for it. A v1.4 change is a later item and is not drafted now.

## What it directs

1. **P115's checker accepts a signed later version of a governing input.**
   A governing input whose current bytes differ from the digest P115 froze
   passes only when all of these hold:
   - the input's own sign-off chain has a builder that can say which bytes
     are signed (today only the Polaris dossier local-agent mode spec);
   - P115's frozen digest is the reviewed digest of a recorded earlier
     version of that input;
   - a later version is recorded, and the input's builders' signed check
     reports the installed bytes as that latest recorded, reviewed, signed
     version, with no finding.

   In every other case the check fails closed, as before. Nothing else in
   P115's binding changes: its six subjects, its manifest, its review
   binding and its chain stay exact.
2. **The dossier v1.3 sign-off is recorded** with
   `scripts/record_versioned_signoff.py`, with this owner selection quote and
   date, and installed with its follow-ups.
3. **The empty-cell rendering `-` is a v1.4 item** for a later bead.

## The cost the owner accepted

Review note 14 (round 2 of v1.3): P115's `REQUIREMENT-CONSUMPTION.json`
classifies REQ-polaris-generation-034 as `explicitly-unaffected` against its
v1.2 block. Under this direction nobody re-confirms that classification for
the amended 034 text when the later version is accepted. [Inferred: the
round-2 reviewer's reading] It is very likely still true, since presentation
elements do not touch the POC `workItems` carrier, but no review checks it.

## What it does not do

- It does not edit the P115 sign-off record, its manifest, its frozen source
  bindings or its review.
- It does not admit an unsigned, unrecorded or unreviewed change to any of
  the eight inputs.
- It changes no doctrine, contract, policy or specification text.
