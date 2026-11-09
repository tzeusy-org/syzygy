# Impact ledger — Polaris dossier local-agent mode, version 1.6

> **Candidate — binds nothing.** [Observed] The patches apply to the installed
> version 1.5 bytes on `main` (commit `b229e170e43e7e2f874062674fb19d83778718c5`).
> [Observed] Version 1.5 is recorded
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.5.md`).
> The builder and recorder row are in this package's branch.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-033 | Bytes unchanged. Its rebuild-and-compare binding is read, in REQ-035, to rebuild a list-carrying packet from the current and the base frozen subjects |
| REQ-polaris-generation-034 | None |
| REQ-polaris-generation-035 | The changed-block list: when a packet carries one, what it lists, how it is derived and rebuilt, that a verdict still covers every entry, its disclosure, the REQ-006 reading; four scenarios added, one THEN line amended, the test form extended, one `warrants.decisions` entry added |
| REQ-polaris-generation-036 | None |

[Observed] Four scenarios are added: the change's spec goes from 76
`#### Scenario:` headings to 80 (counted by `grep -c` over the installed and the
patched bytes, 2026-11-09). `PROJECT-STATUS.md`'s effective-composition figure,
38 requirements and 298 scenarios today (`status_figure()`), is recounted by
`apply()` at install, and `check_spec_reconciliation.py --regenerate` follows.

## Parent requirements read or displaced

- REQ-polaris-generation-006 (understanding amendment): read, not displaced.
  "confirm the frozen bundle", "A revision SHALL retire dependent review
  evidence", "without the authoring conversation" and the rule that the
  generator does not classify its own wording change as immaterial all keep
  their meaning; the new sentence in REQ-035's reading says why.
- REQ-polaris-generation-002, 033 and 034 (the other declared parents of
  REQ-035): unchanged.

## Implementation impact

[Inferred] After sign-off only, and in a separate bead: the fidelity packet
builder (`review-packet`), the waiting-session delivery
(`session-prompt <run> review`), the rebuild in `review-check` and `render`,
and the review page's disclosure. No product code changes with this package.
`tasks.md` is unchanged. REQ-polaris-generation-035's `warrants.decisions`
gains `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`, so
`GOVERNING-DEPENDENCIES.md`, generated at install from the warrants
(`scripts/build_polaris_dependency_unions.py`), changes at install; it is not
patched here.

## Dependencies outside this package

- None for install. The battery registration (CG-26: the PROJECT-STATUS
  battery lines, the hosted workflow steps and the count sentence) for this
  builder is held until the owner signs, as one integration commit.

## Costs

- It saves reviewer attention, not tokens. Every later packet is the whole
  packet plus a short list, so it is a little larger. It does not reduce the
  cost `syzygy-pdja.19` measured (23.3M tokens for one fidelity session, almost
  all re-read context); batching repairs and `--fresh` remain the token levers.
- Anchoring grows. A reviewer told which blocks changed may read the rest less
  closely. The verdict must still judge every entry, and the review page says
  the list was shown, but whether the reviewer read the rest stays Inferred.
- One more thing can stop a verdict counting: an altered or missing stored
  input of a base round, or of the base choice recorded with a delivery,
  makes that packet's rebuild fail. It costs one round's verdict, the verdict
  on the packet whose base it is, and a new round. No later round depends on
  it, since each list names its base's core digest, rebuilt without a list. This fails closed, and costs a new round.
- A byte comparison can list a block whose change is trivial, and cannot list a
  block whose meaning changed only because a neighbour did. The second is why
  the verdict must still cover every entry.
- The list points away from coverage effects. A repair that moves or removes a
  claim can change whether an inventory entry is covered, or uncover an
  omission, without changing that entry's bytes or cited spans, so the list
  never names it. Coverage is judged over the whole draft, and the verdict must
  still record coverage for every entry, but a reviewer who follows the list
  can miss it.
- The list compares only claim blocks, inventory entries and the understanding
  record. It says so, so an empty list does not mean nothing else changed: draft
  content outside claim blocks (diagram nodes and edges, sections and their
  titles), the criteria, the verdict schema and the pinned revision are not
  compared.
- The full delta, which would save tokens, is not offered: its carry-forward
  rule would weaken "Any revision of the subject or the inventory retires the
  verdicts bound to it" (`SEMANTIC-DELTA.md`, "Which form, and why").
