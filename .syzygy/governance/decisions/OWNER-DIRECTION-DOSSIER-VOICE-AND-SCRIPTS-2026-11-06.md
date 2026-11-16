# Owner direction — dossier judgements, citations and scripts

Date: 2026-11-06

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06`

This is a plain owner direction in the shape of
`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs nothing. What it asks for binds only through the owner's own
  sign-off of reviewed bytes (VIS-4).

## The owner's words

On 2026-11-06, in the Claude Code CLI, while reading the Redis dossier from
`run-d9411d26ca55ebe0250e2e9b94dc0e32`, the owner wrote:

1. "Polaris judgements *should be allowed*; we should convert the \"quote
   rule\" to \"strongly encourage citations\""
2. "Give up no-scripts but should still be a perfectly functional
   static-site."

The lead session filed this and the rest of that review under the bead epic
`syzygy-pdja`.

## The direction

1. **Judgements and citations.** A dossier may state Polaris's own judgements.
   The rule that requires a quotation is to become a rule that strongly
   encourages citations. A specification amendment (`syzygy-pdja.2`) carries
   this.
2. **Scripts.** The dossier's rule against scripts is to be given up, and every
   page must still work as a static site with scripts off. A screening policy
   change and a specification amendment (`syzygy-pdja.5`) carry this.

## What this does not do

- It changes no specification, policy, check or renderer.
- It relaxes no screening rule. The current scope's `renderCondition` stays in
  force until a signed successor replaces it.
- It keeps the epistemic rules: an agent's claim stays Inferred, never Observed
  (VIS-2), and every verified quotation stays byte-checked.
- It decides nothing about withheld lines or about option E.
