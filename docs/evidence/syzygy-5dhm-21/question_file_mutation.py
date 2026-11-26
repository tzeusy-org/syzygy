#!/usr/bin/env python3
"""Rule-6 mutants for the question file, its run-record binding and its hold-out check (syzygy-5dhm.21).

    python3 docs/evidence/syzygy-5dhm-21/question_file_mutation.py --out RECORD.json

Each mutant replaces one fragment of one source file (exactly one occurrence), runs the named vitest files, records whether they
failed, and restores the file's bytes. A mutant is killed when the tests fail. Run on a clean tree; it rewrites sources in place
while it runs, so edit nothing meanwhile.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[3]
QF_TEST = "packages/polaris-generation-core/src/question-file.test.ts"
HOLD_TEST = "packages/polaris-dossier/src/question-file-hold-out.test.ts"
RUN_TEST = "packages/polaris-dossier/src/run-record-question-file.test.ts"
BRIEF_TEST = "packages/polaris-dossier/src/brief.test.ts"
QF = "packages/polaris-generation-core/src/question-file.ts"
KIT = "packages/polaris-dossier/src/regression-hold-out.testkit.ts"
REC = "packages/polaris-dossier/src/run-record.ts"
BRIEF = "packages/polaris-dossier/src/brief.ts"

MUTANTS = [
    ("depth-floor-nine", QF, "export const DEPTH_LIST_MIN = 10;", "export const DEPTH_LIST_MIN = 9;", [QF_TEST]),
    ("depth-ceiling-twenty-one", QF, "export const DEPTH_LIST_MAX = 20;", "export const DEPTH_LIST_MAX = 21;", [QF_TEST]),
    ("tasks-four", QF, "export const READER_TASKS = 5;", "export const READER_TASKS = 4;", [QF_TEST]),
    ("bind-incomplete-subject", QF, "if ([entry.graded, entry.depth, entry.tasks].some((ref) => ref.state !== 'frozen'))",
     "if ([entry.graded].some((ref) => ref.state !== 'frozen'))", [QF_TEST]),
    ("accept-non-canonical", QF, "if (encodeQuestionFile(file) !== text) throw new QuestionFileError('not-canonical');", "", [QF_TEST]),
    ("brief-topic-text-changed", QF, "stated so a newcomer could repeat them?' },\n      { id: 'end-to-end-workflows', text:",
     "stated so a newcomer could repeat it?' },\n      { id: 'end-to-end-workflows', text:", [QF_TEST, BRIEF_TEST]),
    ("findings-never-report", KIT, "return needles.filter(({ id }) => found.has(id)).map(({ id }) => `${role}:${packet}: ${id}`);",
     "return needles.filter(({ id }) => found.has(id) && false).map(({ id }) => `${role}:${packet}: ${id}`);", [HOLD_TEST]),
    ("no-json-unescape", KIT, "const found = new Set([...heldOutQuestionsIn(text, needles), ...heldOutQuestionsIn(unescaped, needles)]);",
     "const found = new Set([...heldOutQuestionsIn(text, needles)]);", [HOLD_TEST]),
    ("finding-repeats-text", KIT, "return needles.filter(({ id }) => found.has(id)).map(({ id }) => `${role}:${packet}: ${id}`);",
     "return needles.filter(({ id }) => found.has(id)).map(({ id, question }) => `${role}:${packet}: ${id} ${question}`);", [HOLD_TEST]),
    ("key-digest-unchecked", KIT, "if (sha256(bytes) !== reference.sha256) throw", "if (sha256(bytes) === 'never') throw", [HOLD_TEST]),
    ("held-out-leaks-into-brief", BRIEF, "const topicLines = BRIEF_TOPICS.map((topic) => `- \\`${topic.id}\\`: ${topic.text}`);",
     "const topicLines = [...BRIEF_TOPICS.map((topic) => `- \\`${topic.id}\\`: ${topic.text}`), '- How is a database\\'s keyspace organised in memory: what containers hold keys and their expirations?'];",
     [HOLD_TEST]),
    ("record-omits-question-file", REC, "export function recordRunConfig(config: RunConfig, subject: RunSubject, questionFile: QuestionFileBinding | null = questionFileBinding()): RecordedRunConfig {",
     "export function recordRunConfig(config: RunConfig, subject: RunSubject, questionFile: QuestionFileBinding | null = null): RecordedRunConfig {", [RUN_TEST]),
    ("record-binding-unvalidated", REC, "const questionFile = 'questionFile' in fields ? readQuestionFileBinding(fields['questionFile']) : null;",
     "const questionFile = 'questionFile' in fields ? (fields['questionFile'] as QuestionFileBinding) : null;", [RUN_TEST]),
    ("record-refuses-earlier", REC, "if (keys.join(',') !== RECORD_KEYS.join(',') && keys.join(',') !== RECORD_KEYS_WITH_QUESTION_FILE.join(','))",
     "if (keys.join(',') !== RECORD_KEYS_WITH_QUESTION_FILE.join(','))", [RUN_TEST]),
]


def run(tests):
    result = subprocess.run(["npx", "vitest", "run", *tests], cwd=ROOT, capture_output=True, text=True)
    tail = [line.strip() for line in (result.stdout + result.stderr).splitlines() if line.strip().startswith("Tests ")]
    return result.returncode, (tail[-1] if tail else "no test summary")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    baseline = {tests: run(list(tests)) for tests in {tuple(m[4]) for m in MUTANTS}}
    if any(code != 0 for code, _ in baseline.values()):
        raise SystemExit(f"baseline fails: {baseline}")
    records = []
    for name, rel, old, new, tests in MUTANTS:
        path = ROOT / rel
        original = path.read_bytes()
        text = original.decode("utf-8")
        if text.count(old) != 1:
            raise SystemExit(f"{name}: fragment occurs {text.count(old)} times in {rel}")
        try:
            path.write_text(text.replace(old, new))
            code, summary = run(tests)
        finally:
            path.write_bytes(original)
        records.append({"mutant": name, "path": rel, "old": old, "new": new, "tests": tests, "summary": summary,
                        "outcome": "killed" if code != 0 else "SURVIVED"})
        print(name, records[-1]["outcome"], summary, flush=True)
    sources = {rel: hashlib.sha256((ROOT / rel).read_bytes()).hexdigest() for rel in sorted({m[1] for m in MUTANTS} | {t for m in MUTANTS for t in m[4]})}
    record = {"bead": "syzygy-5dhm.21", "ranAt": commit, "subjectSha256": sources,
              "baseline": {" ".join(k): v[1] for k, v in baseline.items()},
              "killed": sum(r["outcome"] == "killed" for r in records), "total": len(records), "mutants": records}
    pathlib.Path(args.out).write_text(json.dumps(record, indent=2) + "\n")
    if any(r["outcome"] != "killed" for r in records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
