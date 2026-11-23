"""Regenerate the sealed stack-4 result with the two PR #548 R3 prose fixes."""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HISTORICAL = "docs/evidence/syzygy-bpyt-6-3-iso"
RECORD = f"{HISTORICAL}/dc4-object-and-iso-helpers-2026-10-28.json"
REVIEW = "docs/reviews/R-GP-IMPL-OBJECT-ISO-HELPERS-3-RAW.md"
RERUN = "docs/evidence/object-iso-helpers-review-2026-10-28/r3/aaf-rerun.json"
SCRIPT = "docs/evidence/syzygy-bpyt-64/repair-record.py"
R2 = "4d92ac9518dd60cdd124525c3e36c086ccd5e425"
R3 = "2df14d7d2580f453da5b61b5681097d1bfc902c3"
TEST_FILE = "packages/three-surface-poc-core/src/authority-artifact-fields.test.ts"
OLD_READING = (
    "The a-number row is the only test that fails a string-naming test at 4 of the 12 call sites "
    "it was run at (authority-artifact-fields.ts 102, 121, 132 and screen.ts 83)."
)
NEW_READING = (
    "At the round-1 repair commit, before the true row was restored, the a-number row was the "
    "only test that failed a string-naming test at 4 of the 12 call sites it was run at "
    "(authority-artifact-fields.ts 102, 121, 132 and screen.ts 83); at the round-2 head the "
    "restored true row fails it too at the three authority-artifact-fields.ts sites, so the "
    "a-number row is alone only at screen.ts 83 [Observed by R-GP-IMPL-OBJECT-ISO-HELPERS-3]."
)


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value, indent=1):
    return (json.dumps(value, indent=indent) + "\n").encode()


def regenerate(repo, subject):
    def show(commit, path):
        return subprocess.check_output(["git", "-C", repo, "show", f"{commit}:{path}"])

    script = Path(__file__).read_bytes()
    commit = subprocess.check_output(["git", "-C", repo, "rev-parse", "--verify", f"{subject}^{{commit}}"]).decode().strip()
    require(subject == commit, "pass the full correction source commit")
    require(script == show(commit, SCRIPT), "running correction differs from its source commit")
    sealed = show(R3, RECORD)
    raw = show(commit, REVIEW)
    rerun = show(commit, RERUN)
    require(sha(sealed) == "56d1b3471b8879dabc9ed5d441fc0bea2ad404cb5bb041a783cb3facca0fbb93", "sealed record changed")
    require(sha(raw) == "35e89acd6c0b974aad1e9ad950e56a93f64f877bb200f932e0475c1fac3a5750", "R3 raw review changed")
    require(sha(rerun) == "fca65c0a771c498ed0b8dcbc0297586d18750e3650e9378f5979c6afa9a49269", "R3 rerun changed")
    record = json.loads(sealed)
    require(encode(record) == sealed, "sealed record encoding changed")

    before_delta = json.loads(show(R2, f"{HISTORICAL}/test-delta.json"))
    after_delta = json.loads(show(R3, f"{HISTORICAL}/test-delta.json"))
    before_added = set(map(tuple, before_delta["added"]))
    after_added = set(map(tuple, after_delta["added"]))
    restored = sorted(name for path, name in after_added - before_added if path == TEST_FILE)
    require(before_added <= after_added and len(after_added - before_added) == len(restored) == 5, "expected five generated additions from the restored row")
    require(all(" is true" in name for name in restored), "restored test names do not match true")

    reading = record["mutants"]["repairRows"]
    fixes = record["repair"]["round2Review"]
    sites = set(reading["e"]["killedOnlyByANumberRow"])
    observed = sorted(row["id"] for row in json.loads(rerun)
                      if row["id"] in sites and row["ranAt"] == R3 and row["recorded"]["ranAt"] == reading["commit"]
                      and row["newFailures"] and set(row["newFailures"]) <= set(restored))
    require(len(observed) == 3 and sites - set(observed) == {"N-screen-L83n1-E"}, "R3 E evidence does not distinguish the four sites")

    edits = []
    for field, parent, key, old, new in (
        ("mutants.repairRows.reading", reading, "reading", OLD_READING, NEW_READING),
        ("repair.round2Review.F1", fixes, "F1", "adds a test", "adds five generated tests"),
    ):
        require(parent[key].count(old) == 1, f"expected exactly one correction at {field}")
        parent[key] = parent[key].replace(old, new, 1)
        edits.append({"field": field, "old": old, "new": new})

    corrected = encode(record)
    receipt = {
        "bead": "syzygy-bpyt.64",
        "findings": ["PR #548 independent round-3 N1", "PR #548 independent round-3 N2"],
        "subjectCommit": commit,
        "scriptSha256": sha(script),
        "prior": {"commit": R3, "path": RECORD, "sha256": sha(sealed)},
        "correctedSha256": sha(corrected),
        "review": {"path": REVIEW, "sha256": sha(raw)},
        "observations": {"path": RERUN, "sha256": sha(rerun), "additionalTrueRowFailures": observed},
        "restoredGeneratedTests": restored,
        "edits": edits,
    }
    return corrected, encode(receipt, indent=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", type=Path)
    parser.add_argument("source_commit")
    parser.add_argument("--check", type=Path, help="verify a retained correction record")
    parser.add_argument("--output", type=Path, help="write the regenerated whole record to a new scratch file")
    args = parser.parse_args()
    corrected, receipt = regenerate(args.repo.resolve(), args.source_commit)
    if args.check is None:
        sys.stdout.buffer.write(receipt)
    else:
        require(args.check.read_bytes() == receipt, "correction record differs from replay")
        print("R3 corrections match the retained record")
    if args.output is not None:
        with args.output.open("xb") as destination:
            destination.write(corrected)


if __name__ == "__main__":
    main()
