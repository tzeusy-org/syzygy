# URL dossier lean run — version 2.46

[Inferred] Agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over URL dossier 2.1 (`dossier-url-declared-source-run`, row A-14).

## Why

- [Observed] URL dossier 2.1 specified a native URL runtime: a source-transport provider declaration, a host relay for every provider request, an all-admitted in-memory pack gate and a protected audit before each send. That runtime never landed. Draft PR #839, which implemented it, reached 898 commits and was closed as superseded on 2026-11-28.
- [Observed] D10 follow-on F-3 (`.syzygy/governance/contracts/candidates/governance-simplification-d10/FOLLOW-ON.md`) asks only that the record gates come off `syzygy polaris <url>`. That code is PR #1043 (bead syzygy-k54o.3.1).
- [Inferred] So the specification should say what the command does: pin a commit by an anonymous `git ls-remote`, fetch that one commit with no credential, and read no record.

## What changes

[Observed] Two MODIFIED requirements, each complete in `proposed/polaris-generation/spec.md`:

- REQ-polaris-generation-025 ("Provenance-bound source policy") keeps, reworded, what 2.1 said about policy, classification and exclusion, and drops its URL relay, transport, design-delivery, tool-receipt and audit paragraphs. It goes from 14 scenarios to 6.
- REQ-polaris-generation-047 ("Trunk-tip revision pinned at launch") pins trunk, a reference or a commit by anonymous `ls-remote`, makes a one-commit clone with no credential (or checks the operator's `--clone`), and reads no consent, registry, statement or act record. It goes from 24 scenarios to 5.

## Non-goals

[Inferred] The following are left out:

- REQ-polaris-generation-033, 035 and 048 keep their current texts. Bead `syzygy-k54o.3.4` narrows them; until then 047 says their URL-supervised clauses apply to no run.
- Retiring A-14. That cannot be done here (design D2).
- Any code. PR #1043 carries it.
