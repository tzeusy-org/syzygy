#!/usr/bin/env python3
"""syzygy-5dhm.43: build REQ-polaris-generation-034 version 2.33 from version 2.32's bytes.

Usage: choice_floor_build_spec.py <worktree> <out>
Reads openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md (version 2.32) and writes the successor: the title
and banner replaced, one paragraph placed immediately after the worth-knowing count advice paragraph, two scenarios placed immediately
after the last scenario, and one sentence appended to each of the oracle's Observable, Oracle and Falsifier lines. Every other byte is the
predecessor's; removing these additions and restoring the title and banner recovers it.
"""
import pathlib
import sys

root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
prior = (root / 'openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')

OLD_TITLE = '# Dossier question-kind floor\n'
NEW_TITLE = '# Dossier choice floor\n'
OLD_BANNER = ('Candidate version 2.32. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
              'version 2.29 (A-306). It binds through its agent adoption row and the annotated tag `polaris-dossier-question-kind-floor-v2.32`. '
              'It adds an inert top-level draft member, `questionKinds`, to draft schema v13, advice on check\'s report built from it, and '
              'brief v21; it changes no finding of a draft without the member, no rendered byte and no gate.\n')
NEW_BANNER = ('Candidate version 2.33. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
              'version 2.32 (A-315). It binds through its agent adoption row and the annotated tag `polaris-dossier-choice-floor-v2.33`. '
              'It adds the choice floor, advice on check\'s report counting the choices and trade-offs on record per Pole; it changes no '
              'finding, no brief, no schema, no rendered byte and no gate.\n')

ANCHOR = 'For a v13 draft, and for no draft of an earlier schema, check\'s report SHALL carry in its `readerAdvice` a member `worthKnowing`'

PARAGRAPH = (
    'From version 2.33, for a v13 draft, and for no draft of an earlier schema, check\'s report SHALL carry in its `readerAdvice` a member '
    '`choiceFloor`, the choice floor (rule `choice-floor` version 1): a list of advisories `{"at", "onRecord", "detail"}`. Like the rest of '
    'that advice it sets no outcome, is no finding, and enters neither the check record nor its reading ledger. On record are the items of '
    'the understanding record\'s `choices` and `tradeOffs` labelled Inferred; an item labelled Unknown is not. The groups are those of the '
    'worth-knowing count: each Pole, at `$.poles[<i>]`, with the sections it names, each section counted in the first Pole naming it; or, for '
    'a draft that declares no Poles, the whole draft, at `$.sections`. An item is on record for a Pole when a file one of its citations names '
    'is a file named by some citation inside one of the Pole\'s counted sections, or inside a deep dive whose `sectionId` names one of '
    'them, at any depth (a claim\'s `citations`, a code excerpt\'s `citation`), files compared by path alone; for a draft with no Poles every item on record is on record for the draft, and an item may '
    'be on record for more than one Pole. A group with fewer than three items on record is one advisory, in the order of the groups, with '
    '`onRecord` that count and the detail "<name> has <n> choices or trade-offs on record, fewer than 3: where its source shows a decision '
    'this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record\'s '
    '`choices` or `tradeOffs` citing a file its sections cite; never record one its source does not show", where <name> is `the Pole ` '
    'followed by the Pole\'s label as a JSON string, or `the draft`; "choices or trade-offs" is "choice or trade-off" where <n> is 1; and a '
    'draft with no Poles omits " citing a file its sections cite". A group with three or more is no advisory. The floor counts what the '
    'record holds and is never a quota: it asks for no item its source does not show, and it counts an item whatever the review later '
    'finds of it.'
)

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: Pole below the choice floor advised

- **WHEN** a v13 draft declares a Pole naming a section whose claim cites `src/a.c` and a second Pole naming a section whose claim cites `src/b.c` and one whose code excerpt cites `src/c.c`, and its understanding record holds Inferred choices citing `src/a.c` and `src/b.c` and Inferred trade-offs citing `src/a.c`, `src/b.c` and `src/c.c`
- **THEN** check's `readerAdvice.choiceFloor` holds exactly one advisory, at `$.poles[0]` with `onRecord` 2 and its literal detail, and none for the second Pole, which has three on record
- **AND** the check's outcome is what it would be without the advice, and the check record carries no `choiceFloor`

#### Scenario: Choice floor counts Inferred items once per Pole

- **WHEN** a v13 draft records an Unknown choice and an Inferred choice citing a file no section cites, and declares a second Pole naming only a section the first Pole names
- **THEN** neither of those choices is on record for any Pole, and the second Pole's advisory has `onRecord` 0
- **AND** an item whose matching file is named only by its second citation, by a citation nested in a child or a list item of a section, or by a deep dive whose `sectionId` names one of the Pole's sections, is on record for that Pole
- **AND** a draft with no Poles has one group, at `$.sections`, counting every Inferred choice and trade-off, and a draft of schema v12 or earlier has no `choiceFloor` member'''

OBSERVABLE_ADD = ' For the choice floor, record check\'s `readerAdvice.choiceFloor` and the check record beside it.'
ORACLE_ADD = ' For the choice floor, fix each group\'s count and detail as literals from the fixture\'s Poles, sections and understanding record, outside the advice code.'
FALSIFIER_ADD = (' For the choice floor: a group with three items on record is advised, or one with two is not; an Unknown item, or one sharing no '
                 'file with the Pole\'s sections and their deep dives, counts; an item matched by a later citation, a nested citation or a deep dive of the Pole does not count; a section counts in a second Pole; or the advice enters a check record, an outcome or '
                 'an earlier schema\'s advice.')


def once(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, old[:80]
    return text.replace(old, new)


def line_end(text: str, prefix: str, add: str) -> str:
    lines = text.split('\n')
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, prefix
    lines[hits[0]] += add
    return '\n'.join(lines)


spec = once(prior, OLD_TITLE, NEW_TITLE)
spec = once(spec, OLD_BANNER, NEW_BANNER)
lines = spec.split('\n')
at = [i for i, line in enumerate(lines) if line.startswith(ANCHOR)]
assert len(at) == 1
lines[at[0] + 1:at[0] + 1] = ['', PARAGRAPH]
spec = '\n'.join(lines)
spec = once(spec, SCENARIO_ANCHOR, SCENARIOS + SCENARIO_ANCHOR)
spec = line_end(spec, '- **Observable:**', OBSERVABLE_ADD)
spec = line_end(spec, '- **Oracle:**', ORACLE_ADD)
spec = line_end(spec, '- **Falsifier:**', FALSIFIER_ADD)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(spec, encoding='utf-8')
print(f'wrote {out}: {len(spec.encode())} bytes')
