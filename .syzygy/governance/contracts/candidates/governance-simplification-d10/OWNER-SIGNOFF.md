# D10 — owner sign-off

**Candidate. This page offers the act; it does not perform it.**

## What you would adopt

The governance simplification in `PROPOSAL.md`: you decide doctrine,
secrets, writes into repositories you do not own, and exposure beyond the
tailnet or release; agents decide the rest, record each adoption in
`AGENT-ADOPTIONS.md`, report it, and revert it if you veto. One phrase adopts
the whole package: doctrine amendment D10, the four successor files, the new
adoption log and the retirements register, as bound by `MANIFEST.txt`.

## The phrase

```text
ADOPT GOVERNANCE SIMPLIFICATION D10: 9b8975f4c2fc80b59cfdc35ed926352c088390c9d91d287a57fa8f404759bc82
```

The argument is the sha256 of `MANIFEST.txt`, computed by script when this
page was written. If the package changes (for example after the one review),
the manifest is rebuilt with
`python3 scripts/record_governance_simplification_d10.py --write-manifest`
and this page is rewritten; `check_governance.py` (CG-7d) fails while the
digest on this page is stale.

## The command the recording session runs with your words

```text
python3 scripts/record_governance_simplification_d10.py --record --phrase "ADOPT GOVERNANCE SIMPLIFICATION D10: 9b8975f4c2fc80b59cfdc35ed926352c088390c9d91d287a57fa8f404759bc82"
```

The recorder refuses unless the phrase is exactly the line above, its digest
equals the current manifest, and every package file and install target still
matches its manifest row. It then installs the files, appends row D10 to the
doctrine amendment log, and writes the act record and its section in
`ACCEPTANCE-ACT-RECORD.md`. `--check` confirms the record afterwards.

## Then, in the same change

`FOLLOW-ON.md` F-0: regenerate the derived files, fix the checks that pin the
replaced bytes, run the battery, commit, and tag
`governance-simplification-d10-adopted-<date>`.

## Review

One independent fresh-context review of this package, run by the lead
session after drafting, with its fixes applied. It is not a gate and has no
further rounds (your direction, 2026-11-17: "One review, not gating").
