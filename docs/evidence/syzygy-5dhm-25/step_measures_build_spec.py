#!/usr/bin/env python3
"""Build the version 2.27 MODIFIED REQ-polaris-generation-033 from the version 2.21 bytes by anchored insertions (syzygy-5dhm.25),
and count what survives. First drafted as 2.27; built as 2.29 after 2.27 and 2.28 were taken, with review R-STEP-MEASURES-SPEC-1's
repairs (F1 to F7).

Every edit asserts its anchor occurs exactly once. Usage: step_measures_build_spec.py <worktree> <out> [--survival]
With --survival it prints, by script, how many non-empty predecessor lines of the requirement block (from its heading to the end of its
warrants block) the built block carries in their order, and how many scenarios each has.
"""
import pathlib
import re
import sys

W = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
PRED = W / 'openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md'
src = PRED.read_text(encoding='utf-8')
text = src


def once(anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:80])


def insert_after_line(prefix, addition):
    """Insert `addition` as new lines after the one line starting with `prefix`."""
    global text
    lines = text.split('\n')
    hits = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(hits) == 1, (len(hits), prefix[:80])
    lines[hits[0] + 1:hits[0] + 1] = addition.split('\n')
    text = '\n'.join(lines)


def insert_before_line(exact, addition):
    global text
    lines = text.split('\n')
    hits = [i for i, line in enumerate(lines) if line == exact]
    assert len(hits) == 1, (len(hits), exact)
    lines[hits[0]:hits[0]] = addition.split('\n')
    text = '\n'.join(lines)


lines = text.split('\n')
assert lines[0] == '# Dossier verify: a free-form text checked against the pinned revision', lines[0]
assert lines[2].startswith('Candidate version 2.21;'), lines[2][:40]
lines[0] = '# Dossier step measures: stage timings and review rounds from the step log in the Execution Record'
lines[2] = ("Candidate version 2.29; binds nothing until its agent adoption row in AGENT-ADOPTIONS.md and its version tag. One MODIFIED "
            "requirement, REQ-polaris-generation-033, whose complete text below replaces the effective text that verify text version 2.21 "
            "gave it (versions 2.22 to 2.28 leave this requirement as 2.21 left it). It adds one paragraph, the measures `close` derives from "
            "the run's step log into the Execution Record, four scenarios and one line of the Form block; every other line is carried "
            "unchanged. The measures are times and counts of Syzygy's own logged steps, Inferred; they are not the agent sessions' token or "
            "turn usage, which stays as this requirement states it.")
text = '\n'.join(lines)

PARAGRAPH = (
    "Since version 2.29 the Execution Record that `syzygy dossier close` writes SHALL also carry, as its `stepMeasures` member, measures "
    "Syzygy derives at close from the run's step log, `steps.jsonl`, read by the reader rule above under its bound and over the same lines "
    "its step instants are taken from: the run's wall time, from the first readable step to the close instant; the time from the first "
    "step to the first draft check, to the first passed draft check, to the first passed inventory check and to the first rendered site; "
    "the number of distinct draft revisions and of distinct inventory revisions the log's check and inventory-check rows name, with the "
    "count of those rows by outcome, where an outcome other than passed, findings or refused is counted as other and never "
    "copied; and, for each review kind, fidelity and design, its rounds. A round opens at a session prompt of the "
    "review role and that kind that was delivered or issued, and ends at the next review check of that kind that validated; the refused "
    "review checks of that kind between are its refused submissions, and a round no validated check ends is counted unfinished and adds "
    "no time; a round also ends, unfinished, at the next session prompt of the review role and its kind, so no two rounds share a "
    "check or a millisecond. Each time is in whole milliseconds between two logged instants or, for the wall time, a logged instant and "
    "the close instant, and a row is read only with a step name and a UTC instant. "
    "The step log lies within the agent sessions' write reach, so every measure is Inferred, never Observed. A measure whose rows the log "
    "does not carry SHALL be Unknown with its reason, never zero: a log that cannot be read, or that holds no step or no readable step, "
    "makes every measure Unknown; a missing row, or rows that name no revision, make the measure that needs them Unknown; and instants "
    "out of order make the measure they bound Unknown rather than negative, where the measure a round's instants bound is all the rounds "
    "of its kind. Lines past those read for the step instants are counted unreadable. The measures read no agent "
    "session's own record, and they are not the sessions' token or turn usage, which stays the operator's declared figure or Unknown as "
    "this requirement states.")
insert_after_line("The run record and the dossier's appendix SHALL disclose in human form", "\n" + PARAGRAPH)

SCENARIOS = """#### Scenario: Stage timings and review rounds from the step log

- **WHEN** a run closes whose step log records a check with findings at revision 0 and a passed check at revision 1, a passed inventory check at revision 0, a delivered fidelity review prompt followed by one refused and one validated fidelity review check, a rendered site, a delivered design review prompt and its validated check, and a second delivered fidelity review prompt that no check ends
- **THEN** the Execution Record's `stepMeasures` is Inferred and carries the wall time to the close instant, the four times from the first step, two draft revisions, one inventory revision, fidelity rounds opened 2, completed 1, unfinished 1 with one refused submission, and one completed design round, each time in milliseconds between the logged instants

#### Scenario: A step measure without its rows is Unknown, never zero

- **WHEN** a run's step log records no check row and no design review prompt, or stands at its path but cannot be read, or is absent
- **THEN** in the first case the times to the first check and the first passed check, the draft revisions and the design rounds are Unknown, each with the reason naming the missing row, while the wall time is measured
- **AND** in the second case every measure is Unknown with the reader's `steps.jsonl cannot be read (...)` words, and in the third with `the step log records no step`
- **AND** no measure of any case is a zero, and a later instant logged before an earlier one makes the measure it bounds Unknown, never negative

#### Scenario: Step measures are not usage

- **WHEN** a run closes with no usage figure declared
- **THEN** its `agentUsage` stays `not-recorded`, Unknown, whatever its `stepMeasures` carry, and no step measure is labelled Observed or presented as a token or turn count

#### Scenario: Rounds never overlap, and an agent-written outcome is never a key

- **WHEN** a step log records two delivered fidelity review prompts before one validated fidelity review check, and a check row whose outcome is a string Syzygy never logs
- **THEN** the first round is unfinished, the second ends at the validated check, and a refused check between the second prompt and that check counts once, for the second round
- **AND** the check row is counted under `other`, and its outcome string appears nowhere in the record
"""
insert_before_line('Form: event-response.', SCENARIOS)

FORM = ("- **Case, oracle and falsifier (step measures, 2.29):** A literal step log with one row of each kind the measures read, a log "
        "lacking each row, an unreadable and an absent log, out-of-order instants and a log past its line cap; literal millisecond times "
        "and counts written before the run, never imported from the implementation, among them the literal case of a round opened at an "
        "issued prompt (`step-measures.test.ts`, \"opens a round at an issued review prompt too\"), which no stored run can reach; and every "
        "round of the stored runs compared with `scripts/dossier_stored_run_measures.py` figure f by kind and number, where only a round "
        "that a next prompt of its kind ends may differ; falsified by a figure that differs from its literal, a missing row read as zero, "
        "a negative time, two rounds sharing a check, an agent-written outcome in a key, or a measure labelled Observed.")
insert_after_line('- **Case, oracle and falsifier (verify):**', FORM)

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')

if '--survival' in sys.argv:
    def block(t):
        lines = t.split('\n')
        start = lines.index('### Requirement: Operator-agent authoring mode')
        end = next(i for i in range(start, len(lines)) if lines[i] == '```' and i > start + 5 and lines[i - 1].startswith('  parent_requirements'))
        return [line for line in lines[start:end + 1] if line.strip()]
    pred, new = block(src), block(text)
    j = 0
    carried = 0
    for line in pred:
        while j < len(new) and new[j] != line:
            j += 1
        if j < len(new):
            carried += 1
            j += 1
    scen = lambda ls: sum(1 for line in ls if re.match(r'^#### Scenario: ', line))
    print(f'predecessor non-empty lines {len(pred)}; carried in order {carried}; built non-empty lines {len(new)}; '
          f'added {len(new) - carried}; scenarios {scen(pred)} -> {scen(new)}')
