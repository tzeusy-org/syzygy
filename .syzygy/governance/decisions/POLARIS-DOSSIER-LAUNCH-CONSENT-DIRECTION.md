# Owner direction — Polaris on any repository, consent asked at launch

Date: 2026-11-08

Owner: Tzeusy

Decision ID: `POLARIS-DOSSIER-LAUNCH-CONSENT-2026-11-08`

This is a plain owner direction. It binds no artifact digest, adds no row to
`ACCEPTANCE-ACT-RECORD.md` and registers nothing. It amends no doctrine,
contract or specification, grants no read, write, egress or execution, and
records no consent for any repository. It directs the drafting of the
candidate change `openspec/changes/polaris-dossier-launch-consent/`, which
binds nothing until the owner signs it off by its version tag (VIS-4;
`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`). It authorizes no
implementation code.

## The owner's words

In a Claude Code CLI session on 2026-11-08, after saying that too much
preliminary work goes into preparing each repository for a run, the owner
wrote:

> "My vision is that I can point polaris at any repo for which I have the
> source and generate the Polaris sites."

> "Revision should always default to latest trunk commit (eg main/master).
> Observing its own repository for the purposes of generating a Polaris for
> itself is fine."

The session had offered to draft one general specification change and owner
packet in place of the Syzygy-specific packets it had been preparing, and
asked:

> "Should I draft that spec change and packet in place of the
> Syzygy-specific ones?"

The owner replied:

> "yes, please draft it"

## What it directs

1. **The draft.** A candidate specification change and owner packet under
   which the owner can point Polaris at any repository whose source they
   hold, with no per-repository preparation before the run. The consent each
   repository needs is asked for when the run starts, answered by the owner,
   and recorded then. Its questions are in the change's `OWNER-PACKET.md`.
2. **Revision.** A run defaults to the latest commit of the repository's
   trunk (`main`, `master` or the branch the repository names as its
   default). [Inferred] The owner's words set the default; whether "latest"
   means the tip the operator's clone holds or a tip fetched at launch is
   left to the packet.
3. **Self-observation.** Syzygy may observe its own repository to generate a
   Polaris dossier of itself.
4. **What it replaces.** The Syzygy-specific packets the session had begun
   are not pursued; this general change takes their place.

[Inferred] This records what the owner asked for. It does not decide any
packet question, and nothing in it is a consent record for any repository,
Syzygy's own included.
