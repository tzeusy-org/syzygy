# Governance simplification D10 — owner act

Owner: Tzeusy

Act instant: 2026-11-18T12:59:48Z

Project identity: project:syzygy

Artifact identity: governance-simplification-d10 (doctrine amendment D10 and the successor files it installs)

Act type: adopt doctrine amendment, accept contract amendment, confirm craft amendment and retire clauses, as one indivisible transaction

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
ADOPT GOVERNANCE SIMPLIFICATION D10: b336fbc75d33201660d85e296d117ed2f9b84196a8449b7442366b3e6d66aebb
```

The argument is the sha256 of .syzygy/governance/contracts/candidates/governance-simplification-d10/MANIFEST.txt. It was recomputed at recording and
matched the phrase, and every manifest row, package and base, verified
against the bytes on disk before anything was installed.

Installed: the 29 `proposed/` files the manifest's `[package]`
section binds, at 32 targets, each named by a row of its `[base]`
section (a file under the installed contract tree also lands at its
candidate mirror). The targets are not repeated here: the manifest is the one
list, and its digest is the argument above.

Doctrine log: row D10 appended to `.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`.

Retired and superseded clauses: the package's `RETIREMENTS.md`, bound by its
manifest row.

Supersession relationship: the installed files supersede their previous
bytes. Earlier performed acts, their records and their digests remain
history; they no longer lock the files they bound (RFC3-16 as amended).

Revocation relationship: none.

From this act on, agent adoptions are recorded as rows of the agent
adoption log this act creates, and owner decisions as the owner's words with
their commit (VIS-4 and RFC3-16 as amended); no later adoption needs a typed
phrase or digest.
