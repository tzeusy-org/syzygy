#!/usr/bin/env python3
"""syzygy-5dhm.26: build REQ-polaris-generation-033 version 2.39 from version 2.31's bytes.

Usage: session_usage_build_spec.py <worktree> <out>
Reads openspec/changes/dossier-step-measures/proposed/polaris-generation/spec.md (version 2.31, A-310) and writes the successor: the
title and banner replaced, two paragraphs placed immediately after the reviewer-rounds paragraph, three scenarios placed immediately
after the last scenario, and one case, oracle and falsifier bullet placed immediately after the close-step-measures bullet. Every other
byte is the predecessor's; removing these additions and restoring the title and banner recovers it (session_usage_inverse.py).
"""
import pathlib
import sys

PREDECESSOR = 'openspec/changes/dossier-step-measures/proposed/polaris-generation/spec.md'

OLD_TITLE = '# Dossier close timings and review round counts\n'
NEW_TITLE = '# Dossier session usage and the cost line\n'
OLD_BANNER = ('Candidate version 2.31. One MODIFIED requirement, REQ-polaris-generation-033, after scripted benchmark grading version 2.30. '
              'A reviewed source, its agent adoption row and its version tag establish applicability.\n')
NEW_BANNER = ('Candidate version 2.39. One MODIFIED requirement, REQ-polaris-generation-033, after close step measures version 2.31 (A-310). '
              'It binds through its agent adoption row and the annotated tag `polaris-dossier-session-usage-v2.39`. It adds the session usage '
              'Syzygy reads from a launched run\'s own transcripts to the Execution Record, and one cost line to close, status and the review '
              'page; it changes no gate, no check and no rendered byte outside the review page\'s review-status region.\n')

ANCHOR = 'For reviewer rounds, tally fidelity and design separately.'

PARAGRAPHS = [
    # Session usage in the Execution Record.
    'Since version 2.39, close SHALL also write a `sessionUsage` member of `record.json`, read by Syzygy at close and never typed by the '
    'operator. For a run whose launched marker is absent it SHALL be Unknown as a whole with the fixed reason `operator-started`, and for '
    'one whose marker cannot be read with `launched-marker-unreadable`: Syzygy attributes no transcript to a session it did not start. For '
    'a launched run it SHALL carry one row for each role the supervisor starts, in the order author, inventory, fidelity, design, read from '
    'that role\'s private home `<state root>/<run id>.agents/<role>/`, where the agent tool keeps the session\'s transcripts under '
    '`.claude/projects/`; the supervisor SHALL derive each home from the run directory by the rule the reader uses. Syzygy SHALL walk that '
    'directory without following a symbolic link, at most four levels below it, and read every regular file named `*.jsonl`, at most 256 '
    'per role, each by the reader rule under 268,435,456 bytes without following a link. A role\'s row SHALL be Unknown with one fixed '
    'reason when its home is absent (`no-agent-home`), it holds no transcript (`no-transcript`), an entry on the walk is a link or special '
    'file (`link-or-special-entry`), the walk finds too many files or levels (`too-many-transcripts`), a file cannot be read '
    '(`transcript-unreadable`) or is past its bound (`transcript-over-bound`), a nonempty line other than an unterminated last line does '
    'not parse as one JSON object (`transcript-malformed-line`), or a response has no nonempty message identity '
    '(`response-without-identity`) or no usage object (`response-without-usage`). A response is an entry of type `assistant` whose '
    'message\'s model is not the tool\'s `<synthetic>` marker; entries sharing one message identity are one response, each token kind '
    'taking the largest value they give. Otherwise the row is Inferred and carries the transcript count, the response count, the sums of '
    'input, output, cache-creation and cache-read tokens with their total, and the milliseconds from the first to the last valid UTC '
    'instant of any entry; a kind some response does not give as a nonnegative safe integer is Unknown (`field-unreadable`), and so is the '
    'total, and a row with no instant has an Unknown span (`no-instant`). The run total sums each figure over the four rows and spans '
    'their earliest to their latest instant; any Unknown row makes every total figure Unknown (`session-unknown`), and a kind Unknown in a '
    'row keeps that kind and the total Unknown. Money SHALL always be Unknown (`no-price-receipt`). Every figure is Inferred, never '
    'Observed, because each session can write its own home; a transcript is no tool-owned receipt, so the step measures\' tool-owned usage '
    'stays Unknown, and the operator\'s declared figure keeps its meaning. The member carries only numbers, closed labels and fixed '
    'reasons: no transcript text, identifier, path inside a home or instant enters it (SEC-5).',
    # The one cost line.
    'Close\'s report, `syzygy dossier status` and the review page SHALL each give one cost line built from session usage: the run total\'s '
    'tokens with each kind, the number of sessions, the model responses, the span and money Unknown, any Unknown figure saying so. Where '
    'the total is Unknown the line SHALL name each session that makes it so, with its reason, and give the known sessions\' token totals; '
    'for a run Unknown as a whole it SHALL say that Syzygy did not start the run\'s sessions, or cannot read its launched marker. Status '
    'SHALL take the line from the Execution Record once the run is closed, say `not recorded` for a record without `sessionUsage` and '
    'Unknown for one in another form, and before close read the transcripts then and say that it did. Render SHALL read the usage at that '
    'render and place the line, labelled, in the review-status region of the review page and of no other page; that region is the only '
    'part a later render may change without retiring a rendered-design review, so a changed cost line retires no review. The machine '
    'view\'s region member carries the same item.',
]

SCENARIO_ANCHOR = '\n\nForm: event-response.\n'
SCENARIOS = '''

#### Scenario: A launched run's session usage is read from its transcripts

- **WHEN** a launched run's four homes hold transcripts with literal token counts, one response written over two lines, a synthetic notice, a subagent transcript and an unterminated last line
- **THEN** close's `sessionUsage` gives each role's literal sums, response count and span and the literal run total, all Inferred, with money Unknown
- **AND** no transcript text, identifier or instant enters the record, and the step measures' tool-owned usage stays Unknown

#### Scenario: An unreadable session is Unknown, never zero

- **WHEN** one role's home is absent, holds a link, a malformed line or a response without identity or usage, or a response gives no count for one token kind
- **THEN** that row, or that kind, is Unknown with its fixed reason, and every run total figure resting on it is Unknown
- **AND** a run the operator started is Unknown as a whole, whatever homes lie beside it

#### Scenario: One cost line on the review page

- **WHEN** a run is rendered and closed
- **THEN** the review page's review-status region carries the cost line and no other page carries it
- **AND** status gives the closed record's cost line, `not recorded` for a record closed before version 2.39, and before close the line read then'''

BULLET_ANCHOR = '- **Case, oracle and falsifier (close step measures):**'
BULLET = ('- **Case, oracle and falsifier (session usage):** Synthetic agent homes whose transcripts carry token counts and instants '
          'fixed as literals before the run, with a launched marker and without one, through the ordinary close, status and render paths, '
          'and a canary string in every transcript body. The oracle is the literal per-role and total figures and the exact cost line. '
          'Falsified by a figure that differs from its literal, a response counted once per line, a synthetic notice counted, an unreadable '
          'role or kind giving zero or a total, the canary or an instant in the record or a page, the cost line on a page other than the '
          'review page, or a link followed.')


def once(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, old[:80]
    return text.replace(old, new)


def build(prior: str) -> str:
    spec = once(prior, OLD_TITLE, NEW_TITLE)
    spec = once(spec, OLD_BANNER, NEW_BANNER)
    lines = spec.split('\n')
    at = [i for i, line in enumerate(lines) if line.startswith(ANCHOR)]
    assert len(at) == 1
    for k, paragraph in enumerate(PARAGRAPHS):
        lines[at[0] + 1 + 2 * k:at[0] + 1 + 2 * k] = ['', paragraph]
    spec = '\n'.join(lines)
    spec = once(spec, SCENARIO_ANCHOR, SCENARIOS + SCENARIO_ANCHOR)
    lines = spec.split('\n')
    at = [i for i, line in enumerate(lines) if line.startswith(BULLET_ANCHOR)]
    assert len(at) == 1
    lines[at[0] + 1:at[0] + 1] = ['', BULLET]
    return '\n'.join(lines)


if __name__ == '__main__':
    root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    spec = build((root / PREDECESSOR).read_text(encoding='utf-8'))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(spec, encoding='utf-8')
    print(f'wrote {out}: {len(spec.encode())} bytes')
