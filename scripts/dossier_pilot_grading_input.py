#!/usr/bin/env python3
"""Build a blind grader's input for the Polaris dossier pilot (syzygy-5dhm.133, R29 slice 1).

    python3 scripts/dossier_pilot_grading_input.py --grading first|second|third --check
        rebuild a recorded grading's input and label map from the record and compare both with the stored files; exit 1 on a
        difference
    python3 scripts/dossier_pilot_grading_input.py --arms D,E,P --coin answers-E.json --out INPUT.json --labels-out LABELS.json
        a new grading: the named arms' answer sets (answers-<arm>.json in the record directory) under blind labels A, B, C, ...
    python3 scripts/dossier_pilot_grading_input.py --selftest
    --pilot DIR   the record directory (default: docs/evidence/pursuit-2026-11-21b/pilot)

The input is the key (id, kind, question, model answer, required facts) plus, per question, each arm's answer text under its
blind label. From a reader's file only `id` and `answer` are carried: never where the reader looked, its notes or an arm name.
Labels are drawn from a recorded digest, so the draw can be repeated and nobody chooses it: the sha256 of the named coin files'
bytes, in the order given, picks the arm for label A by its first byte modulo the arms left, B by its second, and so on. The
first grading used an older draw (a rotation of D, P, T by the second byte of the key's digest), kept here so it reproduces.
The label map is the one file a grader must not be given: write it outside the directory the grader is pointed at. This script
starts no session and reads only the record directory.
"""
import argparse
import hashlib
import json
import pathlib
import string
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_PILOT = REPO / "docs" / "evidence" / "pursuit-2026-11-21b" / "pilot"
RECORDED = {
    "first": {"arms": ["D", "P", "T"], "coin": ["key.json"], "draw": "rotate", "input": "grading/input.json",
              "labels": "labels-first-grading.json", "labelsKey": "answers"},
    "second": {"arms": ["D", "E", "P", "T"], "coin": ["answers-E.json"], "draw": "pick", "input": "grading2/input.json",
               "labels": "labels-second-grading.json", "labelsKey": None},
    "third": {"arms": ["D", "E", "F", "G", "H", "P"], "coin": ["answers-F.json", "answers-G.json", "answers-H.json"],
              "draw": "pick", "input": "grading3/input.json", "labels": "labels-third-grading.json", "labelsKey": None},
}


class InputError(Exception):
    """The input cannot be built: a file is missing, malformed, or an answer set does not cover the key."""


def draw_labels(arms, coin, draw="pick"):
    """The map from blind label to arm that the digest `coin` draws."""
    arms = list(arms)
    if len(arms) < 2 or len(set(arms)) != len(arms) or len(arms) > len(string.ascii_uppercase):
        raise InputError("a grading needs two or more distinct arms")
    if draw == "rotate":
        turn = coin[1] % len(arms)
        order = arms[turn:] + arms[:turn]
    else:
        order = []
        for byte in coin[:len(arms) - 1]:
            order.append(arms.pop(byte % len(arms)))
        order += arms
    return dict(zip(string.ascii_uppercase, order))


def answer_texts(answers, key, arm):
    """One arm's answer text per question id: exactly the key's ids, each once. Nothing else of the reader's file is kept."""
    rows = answers.get("answers") if isinstance(answers, dict) else None
    if not isinstance(rows, list):
        raise InputError(f"arm {arm}: no answers list")
    texts = {}
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not isinstance(row.get("answer"), str):
            raise InputError(f"arm {arm}: an answer lacks a string id or answer")
        if row["id"] in texts:
            raise InputError(f"arm {arm}: question {row['id']} answered twice")
        texts[row["id"]] = row["answer"]
    wanted = [question["id"] for question in key]
    if sorted(texts) != sorted(wanted):
        raise InputError(f"arm {arm}: answers cover {len(texts)} ids, the key has {len(wanted)}, or the ids differ")
    return texts


def build_input(key, answers_by_arm, labels):
    """The grader's input: one row per key question, with each arm's answer under its blind label only."""
    texts = {label: answer_texts(answers_by_arm[arm], key, arm) for label, arm in labels.items()}
    return [{"id": question["id"], "kind": question["kind"], "question": question["question"],
             "model_answer": question["model_answer"], "required_facts": question["required_facts"],
             "answers": {label: texts[label][question["id"]] for label in sorted(labels)}} for question in key]


def read_json(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise InputError(f"{path}: {error}") from error


def build_from(pilot, arms, coin_files, draw):
    pilot = pathlib.Path(pilot)
    try:
        coin = hashlib.sha256(b"".join((pilot / name).read_bytes() for name in coin_files)).digest()
    except OSError as error:
        raise InputError(f"coin file: {error}") from error
    labels = draw_labels(arms, coin, draw)
    key = read_json(pilot / "key.json")["questions"]
    answers = {arm: read_json(pilot / f"answers-{arm}.json") for arm in arms}
    return labels, build_input(key, answers, labels)


def check_recorded(pilot, name):
    """Differences between a rebuilt recorded grading and its stored input and label map."""
    spec = RECORDED[name]
    pilot = pathlib.Path(pilot)
    labels, built = build_from(pilot, spec["arms"], spec["coin"], spec["draw"])
    stored_labels = read_json(pilot / spec["labels"])
    if spec["labelsKey"] is not None:
        stored_labels = stored_labels[spec["labelsKey"]]
    found = []
    if labels != stored_labels:
        found.append(f"{name} grading: the drawn labels differ from the recorded label map")
    stored = read_json(pilot / spec["input"])
    if built != stored:
        rows = sum(1 for mine, theirs in zip(built, stored) if mine != theirs) + abs(len(built) - len(stored))
        found.append(f"{name} grading: {rows} row(s) of the rebuilt input differ from the recorded input")
    return found, len(built), len(labels)


def selftest():
    failures = []
    key = [{"id": "Q1", "kind": "purpose", "question": "What?", "model_answer": "M1", "required_facts": ["f1", "f2"], "support": [{"path": "a.c"}]},
           {"id": "Q2", "kind": "limits", "question": "Limit?", "model_answer": "M2", "required_facts": ["f3"], "support": []}]
    answers = {
        "D": {"answers": [{"id": "Q1", "answer": "d-one", "where": "WHERE-MARK"}, {"id": "Q2", "answer": "d-two", "where": "x"}], "notes": "NOTES-MARK", "minutes_felt": 3},
        "P": {"answers": [{"id": "Q2", "answer": "p-two"}, {"id": "Q1", "answer": "p-one"}], "arm": "ARM-NAME-MARK"},
    }
    built = build_input(key, answers, {"A": "P", "B": "D"})
    expected = [
        {"id": "Q1", "kind": "purpose", "question": "What?", "model_answer": "M1", "required_facts": ["f1", "f2"], "answers": {"A": "p-one", "B": "d-one"}},
        {"id": "Q2", "kind": "limits", "question": "Limit?", "model_answer": "M2", "required_facts": ["f3"], "answers": {"A": "p-two", "B": "d-two"}},
    ]
    if built != expected:
        failures.append("the synthetic input differs from its literal")
    text = json.dumps(built)
    for mark in ("WHERE-MARK", "NOTES-MARK", "ARM-NAME-MARK", "minutes_felt", "support"):
        if mark in text:
            failures.append(f"the input carries {mark}")
    # Draws: literal digests, literal maps.
    draws = (
        ("pick", ["D", "E", "P", "T"], bytes([5, 0, 3]), {"A": "E", "B": "D", "C": "T", "D": "P"}),
        ("pick", ["D", "P"], bytes([1]), {"A": "P", "B": "D"}),
        ("rotate", ["D", "P", "T"], bytes([0, 1]), {"A": "P", "B": "T", "C": "D"}),
        ("rotate", ["D", "P", "T"], bytes([9, 3]), {"A": "D", "B": "P", "C": "T"}),
    )
    for draw, arms, coin, want in draws:
        got = draw_labels(arms, coin, draw)
        if got != want:
            failures.append(f"draw {draw} over {arms} with {list(coin)} gave {got}")
    # Refusals: each mutated input must be refused, never built (rule 6).
    refusals = (
        ("a missing answer", {**answers, "D": {"answers": answers["D"]["answers"][:1]}}),
        ("a duplicate id", {**answers, "D": {"answers": [answers["D"]["answers"][0]] * 2}}),
        ("an id the key lacks", {**answers, "D": {"answers": [answers["D"]["answers"][0], {"id": "Q9", "answer": "x"}]}}),
        ("a non-string answer", {**answers, "D": {"answers": [answers["D"]["answers"][0], {"id": "Q2", "answer": 3}]}}),
        ("no answers list", {**answers, "D": {"notes": "x"}}),
    )
    for name, mutated in refusals:
        try:
            build_input(key, mutated, {"A": "P", "B": "D"})
            failures.append(f"{name} was built")
        except InputError:
            pass
    for name, arms in (("one arm", ["D"]), ("a repeated arm", ["D", "D"])):
        try:
            draw_labels(arms, bytes(32))
            failures.append(f"{name} was drawn")
        except InputError:
            pass
    for failure in failures:
        print(f"FAIL {failure}")
    print(f"selftest: 1 synthetic input, 5 leak marks, {len(draws)} draws, {len(refusals) + 2} refusals; {len(failures)} failure(s)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--pilot", default=str(DEFAULT_PILOT))
    parser.add_argument("--grading", choices=sorted(RECORDED))
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--arms")
    parser.add_argument("--coin", action="append", default=[])
    parser.add_argument("--out")
    parser.add_argument("--labels-out")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    try:
        if args.check:
            if not args.grading:
                parser.error("--check needs --grading")
            found, rows, arms = check_recorded(args.pilot, args.grading)
            for line in found:
                print(f"DIFFERS {line}", file=sys.stderr)
            print(f"check: {args.grading} grading, {rows} questions under {arms} labels rebuilt and compared with the "
                  f"recorded input and label map; {len(found)} difference(s)")
            return 1 if found else 0
        if args.grading:
            spec = RECORDED[args.grading]
            arms, coin_files, draw = spec["arms"], spec["coin"], spec["draw"]
        elif args.arms and args.coin:
            arms, coin_files, draw = [arm.strip() for arm in args.arms.split(",")], args.coin, "pick"
        else:
            parser.error("name a recorded --grading, or give --arms and at least one --coin file")
        if not args.out or not args.labels_out:
            parser.error("writing needs --out and --labels-out")
        out, labels_out = pathlib.Path(args.out), pathlib.Path(args.labels_out)
        if out.exists() or labels_out.exists():
            raise InputError("an output file already exists; refusing to overwrite it")
        if out.resolve().parent == labels_out.resolve().parent:
            raise InputError("the label map would sit beside the grader's input; write it to another directory")
        labels, built = build_from(args.pilot, arms, coin_files, draw)
        out.write_text(json.dumps(built, indent=1), encoding="utf-8")
        labels_out.write_text(json.dumps(labels), encoding="utf-8")
        print(f"written: {len(built)} questions, {sum(len(row['required_facts']) for row in built)} required facts, {len(labels)} labels")
        return 0
    except InputError as error:
        print(f"dossier_pilot_grading_input: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
