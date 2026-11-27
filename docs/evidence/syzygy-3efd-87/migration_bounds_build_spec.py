#!/usr/bin/env python3
"""Build the version 2.41 MODIFIED REQ-polaris-generation-034 (migration bounds) from the version 2.40 bytes by anchored edits (syzygy-3efd.87).

Every edit asserts its anchor occurs exactly once. Usage: migration_bounds_build_spec.py <worktree> <out>.

The predecessor is figure walks 2.40. The v10 and v11 migration's parity claim (version 2.24, narrowed by 2.38) is narrowed again to the
drafts whose migrated model fits the v12 model bounds; the rule and the bounds are kept (design.md D1, D2).
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PREDECESSOR = 'openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith('# Dossier figure walks'), lines[0]
assert lines[2].startswith('Candidate version 2.40;'), lines[2][:40]
lines[0] = '# Dossier migration bounds: the v10 and v11 migration keeps parity only where the migrated model fits its bounds'
lines[2] = ("Candidate version 2.41; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that figure walks version 2.40 "
            "gave it. It narrows the parity version 2.24 states for the migration of a draft of schema v10 or v11 to schema v12: a draft "
            "that check passes migrates to a draft that check passes only where its graph nodes and containment groups number at most 200 "
            "in all and its graph edges at most 400 in all, the bounds of the v12 model; a larger draft, which check passes in its own "
            "schema since those schemas bound each diagram and not the draft, migrates to a draft check refuses with a `schema` finding, and "
            "no parity is stated for it. The migration, the model bounds and every finding are unchanged. Every other sentence and scenario "
            "of the predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. Unmentioned effective requirements are "
            "unchanged.")
text = '\n'.join(lines)

# The parity claim: who it covers.
replace("For every draft d of schema v10 or v11 that check passes, check passes the migrated draft;",
        "For every draft d of schema v10 or v11 that check passes and whose migrated model fits the bounds of the v12 model, check passes "
        "the migrated draft;")

# The bound arithmetic, after the closing sentence on drafts check does not pass.
ANCHOR = ("No parity is stated for a draft check does not pass: its findings may differ in kind as well as path, because the model's and "
          "the views' bounds and checks are not the diagram's (a containment of six top-level groups, for example, draws a `schema` "
          "finding in schema v11 and a `view-shape` finding once migrated).")
replace(ANCHOR, ANCHOR + (
    " The migrated model's elements are d's graph nodes and containment groups and its relationships are d's graph edges, one for "
    "one: every identity of a schema-v10 or v11 draft is unique, so the merge by identity joins none, and a nesting becomes an "
    "element's `parent`, never a relationship. So d's migrated model fits the bounds of the v12 model exactly where d's graph nodes "
    "and containment groups number at most 200 in all, across every diagram, and its graph edges at most 400 in all. The v10 and v11 "
    "schemas bound each diagram and not the draft (up to 20 diagrams, a graph of up to 40 nodes and 80 edges, a containment of up to "
    "40 groups), so their schema documents admit a draft of up to 800 nodes and groups and 1,600 edges. A draft check passes whose "
    "nodes and "
    "groups number more than 200 in all, or whose edges more than 400, migrates to a draft that check refuses with a `schema` finding "
    "at `$.model.elements` or `$.model.relationships`, as check refuses any v12 draft whose model exceeds those bounds, and no parity "
    "is stated for it; the migration itself is unchanged and still yields that draft, and no bound of either schema changes."))

# One scenario, before the one Form line.
FORM = '\nForm: event-response.\n'
assert text.count(FORM) == 1
at = text.index(FORM)
SCENARIO = '''
#### Scenario: A migrated model past the v12 bounds keeps no parity

- **WHEN** a schema-v11 draft that check passes holds six graph diagrams of 37 nodes each, 222 nodes in all, with 60 edges in all and no containment, and is migrated to schema v12
- **THEN** the migrated draft's `model` holds 222 elements, one per node, and check refuses it with a `schema` finding at `$.model.elements`, so the parity of version 2.24 is not stated for it, and the migration's output is the one the rules of version 2.24 give
- **AND** a schema-v11 draft that check passes holding graph nodes and containment groups 200 in all and graph edges 400 in all migrates to a draft check passes, with the parity stated, and one holding 401 edges in all migrates to a draft check refuses with a `schema` finding at `$.model.relationships'''
text = text[:at] + '\n' + SCENARIO.rstrip('\n') + '`' + '\n' + text[at:]


def extend(end, addition):
    replace(end, end[:-1] + addition)


extend("and drafts of schema v15 and earlier with and without `walk`.",
       "; and, for version 2.41, schema-v10 and v11 drafts that check passes whose graph nodes and containment groups number 200 and "
       "201 in all and whose graph edges number 400 and 401 in all, spread over several diagrams, migrated to schema v12.")
extend("and the brief v24 walk paragraph.",
       "; for version 2.41, each migrated draft's element and relationship counts and check's findings on it.")
extend("compared with the citation link the list of the figure carrying the node's claim carries.",
       "; for version 2.41, each fixture's node, group and edge totals counted by hand from the fixture, and the expected `schema` finding "
       "written before check runs.")
extend("changes any finding but the `field-version` one at a walk, or any byte.",
       "; for version 2.41, a draft whose nodes and groups number at most 200 and edges at most 400 migrates to a draft check refuses, "
       "or one past either bound migrates to a draft check passes, or the migration yields no draft for it.")

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')))
