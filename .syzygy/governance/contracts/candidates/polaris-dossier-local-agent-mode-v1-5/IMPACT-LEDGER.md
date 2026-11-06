# Impact ledger — Polaris dossier local-agent mode, version 1.5

> **Candidate — binds nothing.** [Observed] The patches apply to the version 1.4
> proposed bytes (commit `59768e6f28356723b39482f314cf211f245873b5`). [Unknown]
> Version 1.4 is selected by the owner but not yet recorded or installed, so the
> version 1.5 builder, recorder row and tag cannot exist until it is.

## Requirement impact

| Requirement | Effect |
|---|---|
| REQ-polaris-generation-033 | Human-form disclosure moves to one sentence and an appendix; machine form stays on every page |
| REQ-polaris-generation-034 | Topics, voice, citation and quotation rules, withheld-span rule, reading and evidence views, Poles, script rule, test forms |
| REQ-polaris-generation-035 | Rendered-design criteria; the verdict's form for an uncited judgement and a withheld entry; test forms |
| REQ-polaris-generation-036 | None |

## Parent requirements read or displaced

- REQ-polaris-generation-003: one quoted sentence is read to take in the
  machine-marked judgement class, and its scenario "Unsupported or surplus anchor"
  does not reach an unanchored judgement; every other obligation is unchanged.
- REQ-polaris-generation-006: "draft-to-source support" is displaced for an
  uncited judgement and a withheld entry only.
- REQ-polaris-generation-004: primary narrative order, by the owner's ruling
  that RFC7-13 and this requirement allow.
- REQ-polaris-generation-012: unchanged; the reading view must stay keyboard and
  nonvisually recoverable.

## Implementation impact

[Inferred] `syzygy-pdja.3` (reading view, evidence view, appendix, nav) and
`syzygy-pdja.4` (brief, draft schema v4, Poles, checks, skill text) implement
this version and are blocked on it. `tasks.md` is unchanged; those beads hold the
work. `GOVERNING-DEPENDENCIES.md` is generated at install from the warrants above
(`scripts/build_polaris_dependency_unions.py`), so it is not patched here. No
product code changes with this package.

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
  marked. Telling a judgement from a fact is a review call, so a reviewer can
  miss one.
- A claim block resting on withheld spans loses its text entirely, because the
  agent may have drawn it from what was withheld. Its place says only that the
  sources are withheld.
- A block citing both admitted and withheld spans keeps today's rules, so it
  stands on its admitted span unless a review finds otherwise. You chose "all"
  for this rule on 2026-11-05; three of the five incident rows were partly withheld.
- A fact with no citation is refused, not allowed. Doctrine requires that; allowing
  it would need a doctrine amendment.
