# Impact ledger — Polaris dossier local-agent mode, version 1.5

> **Candidate — binds nothing.** [Observed] The patches apply to the version 1.4
> proposed bytes (commit `59768e6f28356723b39482f314cf211f245873b5`). [Unknown]
> Version 1.4 is selected by the owner but not yet recorded or installed, so the
> version 1.5 builder, recorder row and tag cannot exist until it is.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-033 | Human-form disclosure moves to one line and an appendix; machine form stays on every page |
| REQ-polaris-generation-034 | Topics, voice, citation and quotation rules, withheld-span rule, reading and evidence views, Poles, script wording |
| REQ-polaris-generation-035 | Rendered-design criteria; uncited block advisory in the fidelity verdict |
| REQ-polaris-generation-036 | None |

## Parent requirements read or displaced

- REQ-polaris-generation-003: one quoted sentence is read to take in the
  machine-marked judgement class; every other obligation is unchanged.
- REQ-polaris-generation-004: primary narrative order, by the owner's ruling
  that RFC7-13 and this requirement allow.
- REQ-polaris-generation-012: unchanged; the reading view must stay keyboard and
  nonvisually recoverable.

## Implementation impact

[Inferred] `syzygy-pdja.3` (reading view, evidence view, appendix, nav) and
`syzygy-pdja.4` (brief, draft schema v4, Poles, checks, skill text) implement
this version and are blocked on it. `tasks.md` is unchanged; those beads hold the
work. No product code changes with this package.

## Dependencies outside this package

- The script clause does nothing until the screening scope v7 candidate
  (`syzygy-pdja.5`) is signed. Each of the two can land without the other.
- The surface merge freeze (`scripts/surface-merge-freeze.json`) governs when
  `.3` may merge.

## Costs

- A reader in the reading view sees no label word on running text. They rely on
  the section's one sentence, the marks and the evidence view. A reader who
  never opens those may take a judgement for a sourced fact. The owner chose this.
- An uncited judgement cannot be checked against a source. It is counted and
  disclosed, and reviewers judge only whether it is plausibly a judgement.
- A claim resting on withheld spans cannot be read, so its row says less.
