#!/usr/bin/env python3
"""Total the blind gradings of the 2026-11-21 Polaris dossier pilot (syzygy-5dhm.133, R29 slice 1).

    python3 scripts/dossier_pilot_totals.py              print the shares per arm and per question kind, all three gradings
    python3 scripts/dossier_pilot_totals.py --check      also compare them with the recorded result files; exit 1 on any difference
    python3 scripts/dossier_pilot_totals.py --json       print the recomputed totals as JSON
    python3 scripts/dossier_pilot_totals.py --selftest   mutate the stored inputs in memory, one predicate at a time, and confirm
                                                         --check fails each time (verification rule 6)
    --pilot DIR   the record directory (default: docs/evidence/pursuit-2026-11-21b/pilot)

Reads only the record: each grading's grades and label map, the answer files (for the "not stated" count), the claim check and
the recorded result files. A grade is 1 (fact present and correct), 0.5 (partly) or 0; an arm's share is the sum of its grades
over the number of required facts, rounded to three places, and a kind's share the same over that kind's questions, to two.
The label map says which blind label was which arm; it is read here and never by a grader. Starts no session, writes nothing.
Not authority: an uncalibrated pilot (one repository, model readers, a model grader), so no share here supports a claim of a win.
"""
import argparse
import copy
import hashlib
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_PILOT = REPO / "docs" / "evidence" / "pursuit-2026-11-21b" / "pilot"
KINDS = ("purpose", "structure", "mechanism", "rationale", "change", "limits")
GRADES = (0, 0.5, 1)

# One row per grading: where its grades, label map and recorded result are. `labelsKey` names the member of the label file that
# maps answer labels to arms (the first grading's file also maps the claim-check labels).
GRADINGS = (
    {"name": "first", "grades": "grading/grades.json", "labels": "labels-first-grading.json", "labelsKey": "answers",
     "result": "result.json", "resultLabelsKey": "answers"},
    {"name": "second", "grades": "grading2/grades.json", "labels": "labels-second-grading.json", "labelsKey": None,
     "result": "result2.json", "resultLabelsKey": None},
    {"name": "third", "grades": "grading3/grades.json", "labels": "labels-third-grading.json", "labelsKey": None,
     "result": "result3.json", "resultLabelsKey": None},
)
# The first result file names the plain synthesis by the name it had in the pilot's working directory. It is stored here under
# another name (a Markdown file's backticked paths must resolve in this repository; a synthesis of another repository's cannot).
RECORDED_NAME = {"plain.md": "plain-synthesis.txt"}


class RecordError(Exception):
    """The record cannot be totalled: a file is missing or not of the recorded shape."""


def read_json(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise RecordError(f"{path}: {error}") from error


def arm_totals(grades, label):
    """One blind label's totals over every graded question."""
    given = required = wrong = 0
    kinds = {}
    for row in grades:
        cell = row.get(label)
        if not isinstance(cell, dict) or not isinstance(cell.get("facts"), list) or not cell["facts"]:
            raise RecordError(f"question {row.get('id')}: no grades under label {label}")
        if any(isinstance(fact, bool) or fact not in GRADES for fact in cell["facts"]):
            raise RecordError(f"question {row.get('id')} label {label}: a grade is not one of 0, 0.5, 1")
        if row.get("kind") not in KINDS:
            raise RecordError(f"question {row.get('id')}: kind {row.get('kind')!r} is not one of the six")
        got = sum(cell["facts"])
        given += got
        required += len(cell["facts"])
        wrong += cell["wrong"]
        kind = kinds.setdefault(row["kind"], [0, 0])
        kind[0] += got
        kind[1] += len(cell["facts"])
    return {"factsRequired": required, "factsGiven": float(given), "share": round(given / required, 3),
            "wrongStatements": wrong, "perKind": {name: round(pair[0] / pair[1], 2) for name, pair in kinds.items()}}


def grading_totals(grades, labels):
    """Totals per arm, from the grades and the map from blind label to arm."""
    used = {label for row in grades for label in row if label not in ("id", "kind")}
    if used != set(labels):
        raise RecordError(f"the grades carry labels {sorted(used)}, the label map {sorted(labels)}")
    if len(set(labels.values())) != len(labels):
        raise RecordError("the label map names an arm twice")
    return {arm: arm_totals(grades, label) for label, arm in sorted(labels.items(), key=lambda pair: pair[1])}


def not_stated(answers):
    """How many answers say the artifact does not state it (the readers' agreed words)."""
    return sum("not stated" in row["answer"].lower() for row in answers["answers"])


def claim_totals(claims, claim_labels):
    """The claim check per artifact: sampled claims by verdict, and how many carried a pointer that held."""
    out = {}
    for label, arm in claim_labels.items():
        rows = claims[label]["claims"]
        verdicts = {}
        for row in rows:
            verdicts[row["verdict"]] = verdicts.get(row["verdict"], 0) + 1
        pointers = [row.get("pointer_ok") for row in rows]
        out[arm] = {"sampled": len(rows), "verdicts": verdicts, "codeClaims": claims[label].get("code_claims"),
                    "step": claims[label].get("step"), "withPointer": sum(pointer is not None for pointer in pointers),
                    "pointerOk": sum(pointer is True for pointer in pointers)}
    return out


def load(pilot):
    """Everything --check reads, as plain data, so a selftest can mutate one value and re-run the comparison."""
    pilot = pathlib.Path(pilot)
    record = {"gradings": {}, "answers": {}, "bytes": {}}
    for spec in GRADINGS:
        labels = read_json(pilot / spec["labels"])
        result = read_json(pilot / spec["result"])
        record["gradings"][spec["name"]] = {
            "grades": read_json(pilot / spec["grades"])["grades"],
            "labels": labels if spec["labelsKey"] is None else labels[spec["labelsKey"]],
            "result": result,
            "resultLabels": result["labels"] if spec["resultLabelsKey"] is None else result["labels"][spec["resultLabelsKey"]],
        }
    first = record["gradings"]["first"]["result"]
    for arm in first["arms"]:
        record["answers"][arm] = read_json(pilot / f"answers-{arm}.json")
    record["claims"] = read_json(pilot / "claims" / "result.json")
    record["claimLabels"] = read_json(pilot / "labels-first-grading.json")["claims"]
    for name in first.get("digests", {}):
        path = pilot / RECORDED_NAME.get(name, name)
        record["bytes"][name] = path.read_bytes() if path.is_file() else None
    return record


def recompute(record):
    """Every figure the result files record that the stored inputs determine."""
    out = {name: grading_totals(grading["grades"], grading["labels"]) for name, grading in record["gradings"].items()}
    for arm, answers in record["answers"].items():
        if arm in out["first"]:
            out["first"][arm]["answersWithNotStated"] = not_stated(answers)
            out["first"][arm]["difficultyFelt"] = answers.get("minutes_felt")
    return out


def differences(record):
    """Every place the recomputed figures differ from the recorded ones; empty when the record reproduces."""
    found = []
    totals = recompute(record)
    for name, grading in record["gradings"].items():
        if grading["labels"] != grading["resultLabels"]:
            found.append(f"{name} grading: the label map differs from the one its result file records")
        recorded = grading["result"]["arms"]
        if set(recorded) != set(totals[name]):
            found.append(f"{name} grading: arms {sorted(totals[name])} recomputed, {sorted(recorded)} recorded")
            continue
        for arm, row in sorted(recorded.items()):
            mine = totals[name][arm]
            # Every member the grades determine is compared; a recorded member with no recomputed counterpart is named below.
            for key in ("share", "factsGiven", "factsRequired", "wrongStatements", "perKind", "answersWithNotStated", "difficultyFelt"):
                if key in row and row[key] != mine.get(key):
                    found.append(f"{name} grading, arm {arm}, {key}: recomputed {mine.get(key)!r}, recorded {row[key]!r}")
            if "firstGradingShare" in row and row["firstGradingShare"] != totals["first"].get(arm, {}).get("share"):
                found.append(f"{name} grading, arm {arm}, firstGradingShare: recomputed "
                             f"{totals['first'].get(arm, {}).get('share')!r}, recorded {row['firstGradingShare']!r}")
    first = record["gradings"]["first"]["result"]
    claims = claim_totals(record["claims"], record["claimLabels"])
    if claims != first.get("claims"):
        found.append("first grading, claim check: the recomputed totals differ from the recorded ones")
    if record["claimLabels"] != first["labels"]["claims"]:
        found.append("first grading: the claim label map differs from the one its result file records")
    for name, digest in sorted(first.get("digests", {}).items()):
        data = record["bytes"].get(name)
        if data is None:
            found.append(f"digest of {name}: the file is absent")
        elif hashlib.sha256(data).hexdigest() != digest:
            found.append(f"digest of {name}: the stored bytes differ from the recorded sha256")
    return found


def render(totals):
    lines = []
    for name, arms in totals.items():
        lines.append(f"{name} grading")
        lines.append("  arm  share   given/required  wrong  " + "  ".join(f"{kind:>9}" for kind in KINDS))
        for arm, row in arms.items():
            kinds = "  ".join(f"{row['perKind'].get(kind, float('nan')):>9.2f}" for kind in KINDS)
            lines.append(f"  {arm:<3}  {row['share']:<6}  {row['factsGiven']:>5}/{row['factsRequired']:<8}  {row['wrongStatements']:>5}  {kinds}")
    return "\n".join(lines)


# ---- selftest: one in-memory mutation per predicate; --check must fail on each (rule 6) ----

def _flip_grade(record):
    cell = record["gradings"]["first"]["grades"][0]["A"]["facts"]
    cell[0] = 0 if cell[0] == 1 else 1


def _add_wrong(record):
    record["gradings"]["second"]["grades"][3]["B"]["wrong"] += 1


def _swap_labels(record):
    labels = record["gradings"]["third"]["labels"]
    labels["A"], labels["B"] = labels["B"], labels["A"]


def _move_kind(record):
    row = record["gradings"]["third"]["grades"][0]
    row["kind"] = "limits" if row["kind"] != "limits" else "purpose"


def _drop_not_stated(record):
    for row in record["answers"]["D"]["answers"]:
        if "not stated" in row["answer"].lower():
            row["answer"] = "stated"
            return
    raise AssertionError("no 'not stated' answer to mutate")


def _change_verdict(record):
    record["claims"]["Y"]["claims"][0]["verdict"] = "contradicted"


def _change_pointer(record):
    for row in record["claims"]["Y"]["claims"]:
        if row.get("pointer_ok") is True:
            row["pointer_ok"] = False
            return
    raise AssertionError("no held pointer to mutate")


def _change_bytes(record):
    record["bytes"]["key.json"] = record["bytes"]["key.json"] + b" "


def _change_recorded_share(record):
    record["gradings"]["first"]["result"]["arms"]["D"]["share"] = 0.35


def _change_recorded_first_share(record):
    record["gradings"]["second"]["result"]["arms"]["T"]["firstGradingShare"] = 0.95


MUTATIONS = (
    ("a grade", _flip_grade), ("a wrong-statement count", _add_wrong), ("the label map", _swap_labels),
    ("a question's kind", _move_kind), ("a 'not stated' answer", _drop_not_stated), ("a claim verdict", _change_verdict),
    ("a claim pointer", _change_pointer), ("a digested file's bytes", _change_bytes),
    ("a recorded share", _change_recorded_share), ("a recorded first-grading share", _change_recorded_first_share),
)


def selftest(pilot):
    record = load(pilot)
    base = differences(record)
    failures = []
    if base:
        failures.append(f"the unmutated record already differs: {base[0]}")
    for name, mutate in MUTATIONS:
        mutant = copy.deepcopy(record)
        mutate(mutant)
        try:
            caught = bool(differences(mutant))
        except RecordError:
            caught = True
        print(f"  {'caught' if caught else 'SURVIVED'}  {name}")
        if not caught:
            failures.append(f"mutating {name} did not fail the check")
    # A grade outside 0, 0.5, 1 and a label the map lacks are refused, never totalled.
    for name, grades, labels in (
        ("a grade of 2", [{"id": "Q1", "kind": "purpose", "A": {"facts": [2], "wrong": 0}}], {"A": "D"}),
        ("a boolean grade", [{"id": "Q1", "kind": "purpose", "A": {"facts": [True], "wrong": 0}}], {"A": "D"}),
        ("a label missing from the map", [{"id": "Q1", "kind": "purpose", "A": {"facts": [1], "wrong": 0}}], {"B": "D"}),
        ("an unknown kind", [{"id": "Q1", "kind": "other", "A": {"facts": [1], "wrong": 0}}], {"A": "D"}),
        ("one arm under two labels", [{"id": "Q1", "kind": "purpose", "A": {"facts": [1], "wrong": 0}, "B": {"facts": [1], "wrong": 0}}], {"A": "D", "B": "D"}),
    ):
        try:
            grading_totals(grades, labels)
            refused = False
        except RecordError:
            refused = True
        print(f"  {'refused' if refused else 'TOTALLED'}  {name}")
        if not refused:
            failures.append(f"{name} was totalled")
    synthetic = grading_totals(
        [{"id": "Q1", "kind": "purpose", "A": {"facts": [1, 0.5, 0], "wrong": 1}, "B": {"facts": [1, 1, 1], "wrong": 0}},
         {"id": "Q2", "kind": "limits", "A": {"facts": [0, 0], "wrong": 0}, "B": {"facts": [0.5, 1], "wrong": 2}}],
        {"A": "P", "B": "D"})
    expected = {"D": {"factsRequired": 5, "factsGiven": 4.5, "share": 0.9, "wrongStatements": 2, "perKind": {"purpose": 1.0, "limits": 0.75}},
                "P": {"factsRequired": 5, "factsGiven": 1.5, "share": 0.3, "wrongStatements": 1, "perKind": {"purpose": 0.5, "limits": 0.0}}}
    if synthetic != expected:
        failures.append(f"the synthetic grading totalled to {synthetic}")
    for failure in failures:
        print(f"FAIL {failure}")
    print(f"selftest: {len(MUTATIONS)} mutations, 5 refusals, 1 synthetic grading; {len(failures)} failure(s)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--pilot", default=str(DEFAULT_PILOT))
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.selftest:
            return selftest(args.pilot)
        record = load(args.pilot)
        totals = recompute(record)
        print(json.dumps(totals, indent=1) if args.json else render(totals))
        if not args.check:
            return 0
        found = differences(record)
    except RecordError as error:
        print(f"dossier_pilot_totals: {error}", file=sys.stderr)
        return 2
    for line in found:
        print(f"DIFFERS {line}", file=sys.stderr)
    compared = sum(len(grading["result"]["arms"]) for grading in record["gradings"].values())
    print(f"check: {compared} arm rows over {len(record['gradings'])} gradings, the claim check and "
          f"{len(record['bytes'])} digests compared with the recorded result files; {len(found)} difference(s)",
          file=sys.stderr)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
