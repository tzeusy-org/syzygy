"""Replay the two PR #548 N1 mutations against their old and successor selftests.

From an npm-ci checkout, pass the tool's full source commit, before the evidence
record was added. Omit --check to write the computed record to stdout.
"""

import argparse
import difflib
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = "docs/evidence/syzygy-bpyt-64"
HISTORICAL = "docs/evidence/syzygy-bpyt-6-3-iso"
REVIEW = "docs/reviews/R-GP-IMPL-OBJECT-ISO-HELPERS-2-RAW.md"
FIX = "docs/evidence/object-iso-helpers-review-2026-10-28/r2/tools/sm4-fix-lines.txt"
STRICT = "945c13f9a222e995003cbd7bfc8fe5a8090a138a"
SM4 = "2d9039bbde4371ce9eb7ed3fb0c3315ff3a76818"
REVIEWED = "4d92ac9518dd60cdd124525c3e36c086ccd5e425"
TOOL = "site-equivalence.mjs"
MARKER = b"  console.log('site-equivalence selftest ok');\n"
IMPORT = rb"out = out.replace(/^import \{ isoOf \} from '\.\/iso-of\.js';\n/m, '');"
MUTANTS = {
    "R2-M4-iso-import-first-line-only": (
        IMPORT.replace(rb"\n/m", rb"\n/"),
        "an isoOf import after another import is equal",
    ),
    "R2-M5-iso-import-any-source": (
        IMPORT.replace(rb"\.\/iso-of\.js", b"[^']*"),
        "an isoOf imported from another module is not equal",
    ),
}


def require(condition, reason):
    if not condition:
        raise SystemExit(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def create_record(repo, subject):
    env = {
        "PATH": os.environ["PATH"],
        "NODE_PATH": str(repo / "node_modules"),
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
    }

    def git(*args):
        return subprocess.check_output(["git", "-C", repo, *args], env=env)

    commit = git("rev-parse", "--verify", f"{subject}^{{commit}}").decode().strip()
    require(subject == commit, "pass the full tool source commit")

    strict = git("show", f"{STRICT}:{HISTORICAL}/{TOOL}")
    old = git("show", f"{SM4}:{HISTORICAL}/{TOOL}")
    new = git("show", f"{commit}:{HERE}/{TOOL}")
    review = git("show", f"{commit}:{REVIEW}")
    fix = git("show", f"{commit}:{FIX}")
    replay = git("show", f"{commit}:{HERE}/build-record.py")
    require(Path(__file__).read_bytes() == replay, "running builder differs from the source commit")
    require(sha(strict) == "fbcee6fc821dfb35f7461f0fa5cbab4eb7e828d9eef1d866cd48b8db51adb942", "strict predecessor changed")
    require(sha(old) == "121a3d57cfc8eb5375858b80ba1ec84fdf2d62ee8098979253d12fd37809ac00", "SM4 predecessor changed")
    require(sha(review) == "2693097ed4d5929d979d03944c39b45bba471e815dac034430727b505554590c", "R2 raw review changed")
    require(sha(fix) == "823d7ef698cb546a2f717d06496d5926b05d065c4c33c0c23599af2aec4d146e", "R2 repair bytes changed")
    require(old.count(MARKER) == 1 and new == old.replace(MARKER, fix + MARKER, 1), "successor must add the exact repair before the success message")
    changes = [
        line[:1] for line in difflib.unified_diff(
            strict.decode().splitlines(), new.decode().splitlines(), n=0,
        ) if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
    ]
    require(changes == ["+"] * 8, "expected eight added lines over the strict predecessor")

    sealed_pair = git("show", f"{REVIEWED}:{HISTORICAL}/site-equivalence.json")
    require(sha(sealed_pair) == "7864c27fb50eb2ef483e8ff63cb5a8804879572258b6f4c8161af5fdde007726", "historical pair output changed")
    pair = json.loads(sealed_pair)
    controls = []
    rows = []

    with tempfile.TemporaryDirectory(prefix="site-equivalence-") as directory:
        scratch = Path(directory)
        script = scratch / TOOL
        pair_output = scratch / "pair.json"

        def run(*args):
            return subprocess.run(["node", script, *args], env=env, cwd=repo, capture_output=True)

        for label, source, source_commit in (("SM4", old, SM4), ("successor", new, commit)):
            script.write_bytes(source)
            baseline = run("--selftest")
            require(baseline.returncode == 0 and baseline.stdout == b"site-equivalence selftest ok\n" and not baseline.stderr, f"{label} baseline selftest did not pass")
            comparison = run(repo, pair["base"], pair["head"], pair_output)
            require(comparison.returncode == 1 and pair_output.is_file() and pair_output.read_bytes() == sealed_pair, f"{label} historical pair output differs")
            pair_output.unlink()
            controls.append({"generation": label, "subjectCommit": source_commit, "selftestExit": baseline.returncode, "pairExit": comparison.returncode})

            for mutant_id, (replacement, diagnostic) in MUTANTS.items():
                require(source.count(IMPORT) == 1 and IMPORT != replacement, f"{label} {mutant_id} replacement must apply once")
                mutated = source.replace(IMPORT, replacement, 1)
                script.write_bytes(mutated)
                result = run("--selftest")
                assertion = f"Error: selftest: {diagnostic}"
                if label == "SM4":
                    require(result.returncode == 0 and result.stdout == baseline.stdout and not result.stderr, f"{mutant_id} did not survive the old selftest")
                else:
                    require(result.returncode == 1 and not result.stdout and assertion.encode() in result.stderr.splitlines(), f"{mutant_id} did not fail its intended assertion")
                rows.append({
                    "id": mutant_id,
                    "generation": label,
                    "subjectCommit": source_commit,
                    "toolSha256": sha(source),
                    "old": IMPORT.decode(),
                    "new": replacement.decode(),
                    "mutatedSha256": sha(mutated),
                    "selftestExit": result.returncode,
                    "failedAssertion": assertion if label == "successor" else None,
                })

    return {
        "bead": "syzygy-bpyt.64",
        "finding": "PR #548 independent round-2 N1",
        "subjectCommit": commit,
        "reviewedCommit": REVIEWED,
        "review": {"path": REVIEW, "sha256": sha(review)},
        "repair": {"path": FIX, "sha256": sha(fix), "addedLines": len(fix.splitlines())},
        "strictPredecessor": {"commit": STRICT, "sha256": sha(strict), "successorAddedLines": len(changes)},
        "tool": {"path": f"{HERE}/{TOOL}", "sha256": sha(new)},
        "replay": {"path": f"{HERE}/build-record.py", "sha256": sha(replay)},
        "historicalPair": {
            "base": pair["base"], "head": pair["head"], "reportSha256": sha(sealed_pair),
            "changedSourceFiles": pair["changedSourceFiles"], "modified": pair["modified"],
            "equal": pair["equal"], "notEqual": pair["notEqual"],
        },
        "controls": controls,
        "mutations": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", type=Path)
    parser.add_argument("source_commit")
    parser.add_argument("--check", type=Path, help="verify an existing report byte for byte")
    args = parser.parse_args()
    result = (json.dumps(create_record(args.repo.resolve(), args.source_commit), indent=2) + "\n").encode()
    if args.check is None:
        sys.stdout.buffer.write(result)
    else:
        require(args.check.read_bytes() == result, "record differs from replay")
        print("SM4 evidence replay matches the retained record")


if __name__ == "__main__":
    main()
