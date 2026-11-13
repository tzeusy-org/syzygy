# Owner direction — implement launch-consent v1.2 and source-acquisition entry v1.1

Date: 2026-11-12

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing and edits no act-bound byte.
- It records no consent for any repository.
- It performs no dossier run, body read or provider call.

## The owner's words

[Observed by the coordinating Claude Code session.] On 2026-11-12 the owner
answered one structured question. The question said that launch-consent spec
v1.2 and the local-agent source-acquisition registry entry v1.1 are
both signed, and that `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`
withholds implementation until a separate direction. It then asked whether to
implement:
- the copy step: a private copy of the pinned commit for copy-class runs,
  which closes the disclosed window in which such runs proceed without a copy;
- launch reads narrowed to the entry's closed list (its impact ledger,
  item 1b);
- the URL parser for https, ssh, http and git, with port and case merging;
- refusal of SHA-256 and reftable clones;
- the new statements in the launch question, the launch output, the run
  record, the pages and the briefs.

The question said that each slice gets a fresh-context review, that no agent
makes dossier runs or provider calls, and that the owner's Redis run follows.

The owner selected:

> Authorize implementation (Recommended) — I record a plain owner direction (no digest, nothing registered), then implement in reviewed slices on agent branches and bring PRs for you to merge.

The other option was "Not yet".
- [Inferred] That the person answering is the owner.

## What this authorizes

Implementation code under `apps/**`, `packages/**` and `scripts/` for the
following signed semantics, and nothing else:

1. REQ-polaris-generation-046 and 047 as signed in
   `POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.2.md` (this directory), as its
   package's impact ledger lists them under "Implementation impact":
   - the copy step for every copy-class run, with the clone-shape check
     applied to the copy;
   - pre-copy reads of the operator's clone limited to the listed reads, with
     the reftable and alternates refusals;
   - the locator parser for the admitted forms, the remote-locator forms and
     matching of other acts' consents by the whole normalised `Upstream:` URL;
   - the identity derivation's two-segment floor;
   - the statements REQ-046 and 047 add, in the question, the output, the run
     record, the pages, and the authoring and inventory briefs (review packets
     unchanged, as ruled "Briefs only (Recommended)");
   - `--revision` resolution and the reftable refusal as 047 states them.
2. The launch reads that registry entry v1.1 admits, as signed on
   2026-11-11 (its sign-off record is in this directory): its impact
   ledger's item 1b (the reads narrowed to the closed list) and item 3 (the
   copy step).

Each slice merges only after an independent fresh-context review of its pull
request.

## What it does not authorize

- A dossier run, a body read of any observed repository, or a provider call
  by an agent. The owner starts runs.
- Any write beyond the performed launch-record write consent.
- Any change to a signed specification, registry entry or policy byte. A
  defect found during implementation goes back through review and owner
  sign-off (CC-REV-2).
