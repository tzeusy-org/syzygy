#!/usr/bin/env python3
"""Build the MODIFIED REQ-polaris-generation-034 that corrects the 2.50 view levels text (syzygy-3efd.91).

Built from the code excerpts 2.54 bytes by anchored edits; every edit asserts its anchor occurs exactly once.
Usage: view_levels_errata_build_spec.py <worktree> <out>.

1. The href between deep dives in the zoom target scenario is the one the paragraph gives (design.md D2).
2. The two scenarios that put a walk on the overview put it on section s1 (design.md D3).
3. The zoom target scenario's view "inside a collapsible section" is an omitted view; the paragraph says no figure renders
   inside one (design.md D4).
4. The 1048 px clause of "Zoom links and a walk share one layer" is dropped (design.md D5).
5. A zoom target whose figure fails the inertness check refuses the render, as the code does (design.md D6).
6. A directory a denied-path rule names is still a fact on the directory map, and a walk step on one whose own path is
   denied, or that a `deniedDirectoryNames` entry names, is withheld at check and not read by the walk advice (design.md D7).
"""
import pathlib
import sys

V = '2.55'
W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
# The predecessor: its path, the start of its title line, its version and the name the preamble gives it. A rebind over
# another predecessor (design.md D1) changes these four, and nothing else in this script.
PREDECESSOR = 'openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md'
PRED_TITLE = '# Dossier code excerpts'
PRED_VERSION = '2.54'
PRED_NAME = 'code excerpts'
src = (W / PREDECESSOR).read_text(encoding='utf-8')
text = src


def replace(old, new):
    global text
    n = text.count(old)
    assert n == 1, (n, old[:90])
    text = text.replace(old, new, 1)


lines = text.split('\n')
assert lines[0].startswith(PRED_TITLE), lines[0]
assert lines[2].startswith(f'Candidate version {PRED_VERSION}'), lines[2][:40]
lines[0] = '# Dossier view levels errata: zoom targets, walks and the denied-path directory'
lines[2] = (f"Candidate version {V}; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One "
            "MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces the effective text that "
            f"{PRED_NAME} version {PRED_VERSION} gave it. It corrects the view levels of version 2.50 to agree with themselves "
            "and with the code Syzygy ships: a scenario's address between deep dives, two scenarios that put a walk on the "
            "overview, a scenario's view inside a collapsible section, a 1048 px clause no render can reach, and a zoom target "
            "whose figure fails the inertness check, which refuses the render. It adds one scenario: a top-level directory a "
            "denied-path rule names is still a fact, and a walk step on one whose own path is denied is not read by the walk "
            "advice of version 2.51. No draft schema, brief version or byte, finding, record or page byte moves. Every other "
            "sentence and scenario of the predecessor is carried unchanged; the exact changes are in SEMANTIC-DELTA.md. "
            "Unmentioned effective requirements are unchanged.")
text = '\n'.join(lines)

# 3 and 5. The zoom target paragraph: what a notice is, and the refusal.
ZOOM = 'an element with no such figure has no zoom target, and a base element, which no `scope` names, never has one.'
replace(ZOOM, ZOOM + (f' From version {V}: no figure renders inside a collapsible section, so that clause passes no view over; '
                      'the views passed over for a notice are those whose figure is not produced, is not on a page the '
                      'render draws, or has a base not drawn at the render, and where the draft layer is withheld no element '
                      'has a zoom target. Where the figure so chosen then fails the inertness check of version 2.40 and a '
                      'notice stands in its place, Syzygy SHALL refuse the render and write no page, rather than pass that '
                      'view over, since the zoom links already chosen would name a fragment no page carries. No checked draft '
                      'reaches that case, every drawing the renderer makes from a checked draft passing its own inertness '
                      'check, so this sentence is verified only by a test that makes the inertness check fail for a chosen '
                      'target and observes the refusal and that no site is written.'))

# 6. Walk advice: what "withheld at check" means for a base element, a directory included (R35 code review, note 2).
WA = 'whose screening is Unknown there, or whose label check cannot admit for output under version 2.35.'
replace(WA, WA + (f' From version {V}, a base element counts as withheld at check for this rule, though its map names it, '
                  'where a denied-path rule of the bound screening policy names its own path (a top-level directory\'s path '
                  'or a unit\'s manifest path), and a top-level directory counts as withheld at check also where a '
                  '`deniedDirectoryNames` entry names it, so that every path below it is denied. Whether a directory is '
                  'withheld is decided from the policy and the directory\'s path alone, never from the files the tree holds '
                  'below it.'))

# 1. The href between deep dives.
replace("and `more`'s outer box for `app` `<a class=\"zoom-link\" href=\"runtime.html#figure-parts\">`",
        "and `more`'s outer box for `app` `<a class=\"zoom-link\" href=\"../deep-dives/runtime.html#figure-parts\">`")

# 3. The view passed over is omitted, not inside a collapsible section.
replace('four produced graphs about `app`: `ctx`,', 'four graphs about `app`, every one produced but `hidden`: `ctx`,')
replace('`hidden`, of `level` `container`, whose figure renders inside a collapsible section of deep dive `runtime`;',
        '`hidden`, of `level` `container`, homed at deep dive `runtime` with the disposition `omitted`, so a notice stands '
        'in its figure\'s place;')

# 2 and 4. The walk and the zoom links share one layer: on section s1, with no 1048 px draft.
replace('- **WHEN** the overview of the same draft also carries a walk over `ctx` whose first step names `app`, and in a second '
        'draft a layout supplied to check draws `ctx` 1048 px wide (the readable layout lays out no figure that wide)',
        '- **WHEN** the same draft homes `ctx` at section `s1` in place of the overview, and that section carries a walk over '
        '`ctx` whose first step names `app` (no version admits a walk on the overview)')
replace('\n- **AND** the 1048 px `ctx` carries no wrapper, no layer and no walk, and its list item for `app` still ends with the '
        '`zoom-text` link', '')

# 2. The walked figure and the zoom-only figure share section s1's page.
replace('- **WHEN** the overview of a v17 draft holds the graph `flow`, which carries a walk and draws no element with a zoom '
        'target, and the graph `ctx`,',
        '- **WHEN** section `s1` of a v17 draft holds the graph `flow`, which that section\'s walk walks and which draws no '
        'element with a zoom target, and the graph `ctx`,')

# 6. The scenario.
DASHED = '#### Scenario: Authored element stays dashed'
replace(DASHED, (
    '#### Scenario: A directory a denied-path rule names is still named\n\n'
    '- **WHEN** a public repository\'s pinned tree holds `src/a.ts`, `kubeconfig/notes`, `.kube/config` and '
    '`.kube/notes`, `kubeconfig` being one of the bound screening policy\'s `deniedPathBasenames` and `.kube` one of its '
    '`deniedDirectoryNames`, and no secret detector matching any of these paths\n'
    '- **THEN** the derived facts hold a `top-level-unit` fact for `kubeconfig` counting 1 file and one for `.kube` counting 2 '
    'files, neither counted in `secretPathsLeftOut`, and the directory map draws them as `kubeconfig/ (1 file)` and '
    '`.kube/ (2 files)`\n'
    '- **AND** no body of `.kube/config` or `.kube/notes` is read, each being a denied path, while `kubeconfig/notes` is '
    'not itself a denied path, the basename rule reading a path\'s final segment and so naming only the directory\'s own path\n'
    '- **AND** where a v17 draft with no finding has section `s1` walk a produced graph view `d` whose base is the '
    '`directories` map selecting `src`, `kubeconfig` and `.kube`, one step on each in that order, the walk advice of version '
    '2.51 withholds at check the step naming `kubeconfig`, whose own path is a denied path, and the step naming `.kube`, '
    'which a `deniedDirectoryNames` entry names, reading and counting neither, and reads the step naming `src`, so its '
    '`examined` is 1\n\n' + DASHED))

assert '2.NN' not in text
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print('ok', len(src.split('\n')), len(text.split('\n')), len(src.encode()) - len(text.encode()))
