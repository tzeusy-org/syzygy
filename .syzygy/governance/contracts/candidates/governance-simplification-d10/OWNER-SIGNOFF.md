# D10 — owner sign-off

**Candidate. This page offers the act; it does not perform it.**

## What you would adopt

The governance simplification in `PROPOSAL.md`: you decide doctrine,
secrets, writes into repositories you do not own, and exposure beyond the
tailnet or release; agents decide the rest, record each adoption in
`AGENT-ADOPTIONS.md`, report it, and revert it if you veto. One phrase adopts
the whole package: doctrine amendment D10, the five successor files, the
derived indexes regenerated from them, the new adoption log, your list of
owned repositories (`decisions/OWNED-REPOSITORIES.md`, one row: Syzygy's own
repository; only you change it) and the retirements register, as bound by
`MANIFEST.txt`.

## The phrase

```text
ADOPT GOVERNANCE SIMPLIFICATION D10: b336fbc75d33201660d85e296d117ed2f9b84196a8449b7442366b3e6d66aebb
```

The argument is the sha256 of `MANIFEST.txt`, computed by script when this
page was written. If the package changes (for example after the one review),
the manifest is rebuilt with
`python3 scripts/record_governance_simplification_d10.py --write-manifest`
and this page is rewritten; `check_governance.py` (CG-7d) fails while the
digest on this page is stale.

## The command the recording session runs with your words

```text
python3 scripts/record_governance_simplification_d10.py --record --phrase "ADOPT GOVERNANCE SIMPLIFICATION D10: b336fbc75d33201660d85e296d117ed2f9b84196a8449b7442366b3e6d66aebb"
```

The recorder refuses unless the phrase is exactly the line above, its digest
equals the current manifest, and every package file and install target still
matches its manifest row, and unless the working tree is clean. It then
installs the files, appends row D10 to the
doctrine amendment log, and writes the act record and its section in
`ACCEPTANCE-ACT-RECORD.md`; if any step fails it restores every file it
wrote. `--check` confirms the record afterwards.

## Then, in the same change

Run the battery from `PROJECT-STATUS.md`, commit, and tag
`governance-simplification-d10-adopted-<date>` (`FOLLOW-ON.md` F-0). The
package already carries the derived files and the battery changes, so
nothing needs fixing first.

## Review

One independent fresh-context review of this package, run by the lead
session after drafting, with its fixes applied. It is not a gate and has no
further rounds (your direction, 2026-11-17: "One review, not gating").
