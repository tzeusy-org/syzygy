# Agent adoptions

Every change an agent adopts under VIS-4 (doctrine `vision.md`, as amended
by D10), one row each. Rows are appended and never edited. A veto is a new
row that reverts an earlier one. The report to the owner is the pull request
or session summary that links the row.

Owner-class changes (doctrine; secrets; writes into repositories the owner
does not own; exposure beyond the tailnet, release, deployment, multi-user)
are not adopted here: the owner decides them, and the decision is recorded
as the owner's words with the commit that applies it.

How to add a row: land the change on the default branch, then append one
row naming the commit, what changed, why, and the command that reverts it.
A specification version also gets a git tag, named in the last column.

| Id | Date | Commit | What changed | Why | Revert | Tag |
|---|---|---|---|---|---|---|
| A-1 | 2026-11-18 | `dd932da5a` | CC-REV-2 names the CC-IMPACT-6 recorded spec lag as its one exception | The two clauses contradicted each other once D10 amended CC-IMPACT-6 (R-D10-PACKAGE-RESUME-1) | `git revert dd932da5a` (reverts A-2 too) | — |
| A-2 | 2026-11-18 | `dd932da5a` | `d10_supersession.py` treats D10 as in effect only when its record verifies | A bare or forged record file, or a recordless install, silenced the superseded checks (R-D10-PACKAGE-RESUME-1) | `git revert dd932da5a` (reverts A-1 too) | — |
| A-3 | 2026-11-18 | `f3298b88b` | `supersededByD10` also requires the replaced file to hold exactly the bytes D10 installed; dossier tests follow the adopted doctrine | A later doctrine or RFC-0005 edit kept the D9 and class acts in force; 30 tests failed on the adopted tree | `git revert f3298b88b` | — |
| A-4 | 2026-11-18 | `182a703b2dbae97a16ae7334cd84a32b634cedc0` | [specification2.0](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md); [screening policy](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json); [four scoped N/A judgments](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md) | Replace retired dossier consent gates with declared pinned local sources under D10, preserving SEC-5 and the reviewed034–036 behavior; F-3/F-4/F-5 remain separate | `git revert -m 1 182a703b2dbae97a16ae7334cd84a32b634cedc0` ([tail preparation](https://github.com/tzeusy-org/syzygy/pull/825)) | `polaris-dossier-declared-source-model-v2.0` |
| A-5 | 2026-11-20 | `0190b8a6c` | The battery and hosted workflow drop ten checks that printed only SUPERSEDED under D10 (143 to 133) | They held performed acts to bytes D10 replaced and proved nothing (D10 FOLLOW-ON F-5, slice 1) | `git revert 0190b8a6c` | — |
