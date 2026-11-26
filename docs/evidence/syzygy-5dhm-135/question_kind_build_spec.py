#!/usr/bin/env python3
"""syzygy-5dhm.135: build REQ-polaris-generation-034 version 2.32 from version 2.29's bytes.

Usage: question_kind_build_spec.py <worktree> <out>
Reads openspec/changes/dossier-brief-terminology/proposed/polaris-generation/spec.md (version 2.29, A-306) and writes the successor:
the title and banner replaced, three paragraphs placed immediately after the `inventoryOmissions` paragraph, five scenarios placed
immediately after the last scenario, and one sentence appended to each of the oracle's Observable, Oracle and Falsifier lines. Every
other byte is the predecessor's; removing these additions and restoring the title and banner recovers it.
"""
import pathlib
import sys

root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
prior = (root / 'openspec/changes/dossier-brief-terminology/proposed/polaris-generation/spec.md').read_text(encoding='utf-8')

OLD_TITLE = '# Dossier brief terminology IDs\n'
NEW_TITLE = '# Dossier question-kind floor\n'
OLD_BANNER = ('Candidate version 2.29. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
              'version 2.26 (A-217). It binds through agent adoption A-306 and the annotated tag `polaris-dossier-brief-terminology-v2.29`. '
              'It changes the issued author brief and leaves draft validation and rendering under the inherited requirements.\n')
NEW_BANNER = ('Candidate version 2.32. One MODIFIED requirement, REQ-polaris-generation-034, whose complete text below replaces effective '
              'version 2.29 (A-306). It binds through its agent adoption row and the annotated tag `polaris-dossier-question-kind-floor-v2.32`. '
              'It adds an inert top-level draft member, `questionKinds`, to draft schema v13, advice on check\'s report built from it, and '
              'brief v21; it changes no finding of a draft without the member, no rendered byte and no gate.\n')

ANCHOR = 'A draft in schema `polaris-dossier-local-draft-v5` or a later version MAY carry a top-level member `inventoryOmissions`'

PARAGRAPHS = [
    # The draft member.
    'From version 2.32 a draft in schema `polaris-dossier-local-draft-v13` MAY carry a top-level member `questionKinds`, the authoring '
    'session\'s declaration of which kinds of newcomer question its blocks answer: a list of at most 2000 objects `{"blockId", "kinds"}` with '
    'no other member, `blockId` a string of the form of a draft identity, and `kinds` a list of one to six distinct values of the six question '
    'kinds, in any order: `purpose` (what the project is for), `structure` (how its parts fit), `mechanism` (how it works), `rationale` (why '
    'it is built this way), `change` (where to change something) and `limits` (what it does not do and how it fails), the six kinds and '
    'spellings of the comprehension regression\'s key. The member adds no schema version, because it is inert, as `inventoryOmissions` is: '
    'it is optional, no label, citation, quotation, gate or rendered byte rests on it, and no finding but those of its own shape, and it is never rendered, so a v13 draft '
    'without it is checked and rendered exactly as before version 2.32. From version 2.32 the identifier `polaris-dossier-local-draft-v13` '
    'therefore names a schema with this optional member, the schema file a brief issues describes it, and that file\'s digest differs from '
    'the one a brief issued before version 2.32 states. Check SHALL accept the member in a v13 draft whichever of the two schema files its '
    'run was briefed with. A `blockId` is not an identity of the draft: Syzygy SHALL NOT count it among the draft\'s identities or resolve it '
    'at check, and a `blockId` naming no block, or named by more than one object, is no finding; the advice below reports both. A member of '
    'any other shape in a v13 draft is a `schema` repair finding at the path of the fault, a repeated kind among them, and the member in a '
    'draft of schema v12 or earlier is one `field-version` repair finding at `$.questionKinds` with the detail '
    '`` `questionKinds` needs draft schema polaris-dossier-local-draft-v13 ``, in place of the `schema` finding there; wherever this '
    'requirement says that a draft of an earlier schema is checked or rendered exactly as an earlier version checks or renders it, that '
    'exception holds too. Syzygy checks no claim in a declaration: which kinds a block answers is the authoring session\'s unverified '
    'statement. Syzygy SHALL NOT render it: no page, source page, machine view or other file of a rendered site carries the member. The '
    'fidelity packet carries the draft with the member, as it carries every member but the discovery account; no verdict rule reads it. '
    'The provider mode is unaffected: the provider stages\' closed draft schema does not gain the member, and the rendered bytes the provider '
    'golden pins do not change.',
    # The advice.
    '`syzygy dossier check` SHALL also compute question-kind advice for every draft that parses, and SHALL carry it on its report as the '
    'member `questionKindAdvice`; check SHALL write it to no file: not the check record, the step log, a packet or a rendered page. It is '
    'advice, under every rule the inventory-coverage advice of version 2.12 is: no repair finding, no change to the outcome, exit status or '
    'any refusal, no class member, nothing of it in `run-advice.json`, read by no gate, verdict validation or readiness, and none for an '
    'inventory check; a failure to compute it never refuses or fails a check. Where the draft\'s schema is v13, the pinned tree was listed '
    'at this check and at least one object of `questionKinds` names a `blockId` that is a non-empty string and at least one of the six kinds, '
    'the advice SHALL be `{"state": "compared", "rule": {"id": "question-kind-floor", "version": 1}, "majorUnits": {"rule": {"id": '
    '"major-unit", "version": 1}, "share": "1/20", "limit": 8, "unitsNotListed"}, "kinds", "units", "declarations", "label": "Inferred", '
    '"basis", "note"}`; in every other case it SHALL be `{"state": "unknown", "why", "note"}` with no unit and no count, because kinds no one '
    'declared are Unknown, never six missing kinds (VIS-2). `why` is Syzygy\'s own sentence naming the case. Rule `major-unit` version 1 '
    'takes the facts of rule `top-level-unit` that this check derived from the pinned tree: the major units are the whole repository, named '
    '`.`, with every listed file, then each listed top-level directory holding at least one twentieth of the listed files, by files '
    'descending and then by name code unit by code unit, at most eight; the listed files leave out every path a secret detector matches, '
    'and no such path or directory is named. `unitsNotListed` is the count of directories that rule did not list. Rule `question-kind-floor` '
    'version 1 counts the claim blocks this requirement checks as claim blocks, other than understanding items, that are labelled Inferred '
    'and whose `id` some object of `questionKinds` names; each such block, counted once, its kinds the union of the kinds every object naming '
    'it lists, answers each of its kinds for the whole repository and for each major directory that one of its citations names a path '
    'inside, its first path segment being that directory\'s name. `kinds` lists the six kinds in the order above; each item of `units`, in '
    'the order of the major units, is `{"unit", "files", "answered", "missing"}`: `answered` maps each kind to the number of counted blocks '
    'answering it for that unit, and `missing` lists, in the order of `kinds`, those it maps to zero. `declarations` is `{"rows", "counted", '
    '"unmatched", "duplicated", "unnamed"}`: the objects that name a block and a kind, the distinct blocks counted, the named identifiers '
    'that are no counted block, in order of first mention, those named by more than one object, in order of second mention, and the number '
    'of distinct identifiers left out of those two lists because a secret detector of the bound screening policy matches them; such an '
    'identifier is never named. A failure to compute the advice, its detector among them, is the Unknown form. The advice is labelled '
    'Inferred, with `basis` saying the declarations are the authoring session\'s own and the units derived from the tree, and its `note` '
    'SHALL say that it sets no outcome and is not stored, what the six kinds ask, which blocks count and where, that a missing kind is a gap '
    'a reader will ask about and never a quota, and that a block is declared only for what it answers.',
    # The brief.
    'Brief v21 SHALL issue schema `polaris-dossier-local-draft-v13`. For the same run it SHALL equal brief v20 except for its '
    '`polaris-dossier-brief-v21` version line, its draft-schema line, which names the schema file\'s digest, and one paragraph placed '
    'immediately after the worth-knowing paragraph, before `## Task routes`, which reads: "A newcomer asks six kinds of question about each '
    'major part of a project: `purpose` (what it is for), `structure` (how its parts fit), `mechanism` (how it works), `rationale` (why it is '
    'built this way), `change` (where to change something) and `limits` (what it does not do and how it fails). In `questionKinds`, list '
    'each Inferred claim block that answers one: `{"blockId": "<the block\'s id>", "kinds": [...]}`, naming only the kinds it answers. Check '
    'counts these rows for the whole repository and for each top-level directory holding at least one twentieth of the files, a block '
    'counting for each such directory it cites a file inside, and advises the kinds no block answers there. It is advice, never a finding: '
    'write a block for a missing kind where the part has something to say, and never declare a kind a block does not answer. The rows are '
    'never rendered." Every statement above of what brief v20 carries, equals or differs by holds of brief v21 apart from those three '
    'differences. The success report and the brief record SHALL name brief v21. The paragraph names the six kinds and none of the '
    'regression key\'s questions or required facts, which stay out of every authoring text (the comprehension-regression rule of '
    '`CONTRIBUTING.md`).',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: Unit with no change block advised

- **WHEN** a v13 draft whose introduction cites a file in `src/` declares it `purpose`, and declares `structure` and `mechanism` for a paragraph citing `src/` and `rationale` and `limits` for one citing `docs/`, and the pinned tree's major units are `.`, `src` and `docs`
- **THEN** check passes and its report's `questionKindAdvice` is compared, with `missing` `["change"]` for `.`, `["rationale", "change", "limits"]` for `src` and `["purpose", "structure", "mechanism", "change"]` for `docs`
- **AND** neither the check record nor the step log carries `questionKindAdvice`

#### Scenario: Unit answering all six kinds is not advised

- **WHEN** the counted blocks citing files in one major directory together declare all six kinds
- **THEN** that unit's `missing` is empty and its `answered` counts every kind at least once

#### Scenario: Nothing declared is Unknown

- **WHEN** a v13 draft carries no `questionKinds`, or only objects naming no kind, or the pinned tree cannot be listed
- **THEN** the advice is `{"state": "unknown", "why", "note"}` with no unit and no count, and the check's outcome is what it would be without the advice

#### Scenario: Declarations in an earlier schema

- **WHEN** a draft of schema v10 carries `questionKinds`
- **THEN** check reports one `field-version` finding at `$.questionKinds` naming `polaris-dossier-local-draft-v13`, in place of the `schema` finding there, and the advice is Unknown
- **AND** a v13 draft whose object repeats a kind gets a `schema` finding at that object's `kinds`, and one naming a kind outside the six a `schema` finding at that kind

#### Scenario: Brief v21 teaches the six kinds

- **WHEN** Syzygy issues a brief under version 2.32
- **THEN** `brief.md` names `polaris-dossier-brief-v21` and schema `polaris-dossier-local-draft-v13` with the issued schema file's digest, and holds the exact question-kinds paragraph immediately after the worth-knowing paragraph, the rest being brief v20 for the same run
- **AND** no rendered page of any draft changes, and the provider golden's bytes are unchanged'''

OBSERVABLE_ADD = ' For the question-kind floor, record check\'s report member `questionKindAdvice`, the check record and step log beside it, and the issued brief v21.'
ORACLE_ADD = ' For the question-kind floor, fix each unit\'s missing kinds as literals from the fixture tree and the declarations, outside the advice code.'
FALSIFIER_ADD = ' For the question-kind floor: a unit lists a kind a counted block declares for it; a block labelled Unknown or non-normative counts; the advice is compared with nothing declared; it enters a check record, a step log, a page or an outcome; or the brief\'s paragraph names a regression question.'


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
for k, paragraph in enumerate(PARAGRAPHS):
    lines[at[0] + 1 + 2 * k:at[0] + 1 + 2 * k] = ['', paragraph]
spec = '\n'.join(lines)
spec = once(spec, SCENARIO_ANCHOR, SCENARIOS + SCENARIO_ANCHOR)
spec = line_end(spec, '- **Observable:**', OBSERVABLE_ADD)
spec = line_end(spec, '- **Oracle:**', ORACLE_ADD)
spec = line_end(spec, '- **Falsifier:**', FALSIFIER_ADD)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(spec, encoding='utf-8')
print(f'wrote {out}: {len(spec.encode())} bytes')
