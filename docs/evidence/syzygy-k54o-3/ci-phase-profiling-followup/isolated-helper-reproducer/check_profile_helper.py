#!/usr/bin/env python3
"""Check only the helper AST read from a frozen git blob, with synthetic inputs."""
import argparse
import ast
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import types


class WriteError:
    def write(self, _):
        raise OSError("synthetic output failure")

    def flush(self):
        raise AssertionError("unreachable")


class FlushError:
    def write(self, text):
        return len(text)

    def flush(self):
        raise OSError("synthetic flush failure")


class ClosedError:
    def write(self, _):
        raise ValueError("synthetic closed stream")

    def flush(self):
        raise ValueError("synthetic closed stream")


class BadLength:
    def __len__(self):
        raise ValueError("synthetic count failure")


def check(tree, sink_factory, raising=False, enabled=True,
          clock_fail=None, bad_length=False):
    calls, clocks = [], []
    marker = object()
    original_error = RuntimeError("synthetic original")
    sink = sink_factory()

    def now():
        clocks.append(1)
        if len(clocks) == clock_fail:
            raise ValueError("synthetic clock failure")
        return len(clocks) * 1_000_000

    def target():
        calls.append(1)
        if raising:
            raise original_error
        return marker

    namespace = {
        "os": types.SimpleNamespace(
            environ={"SELFTEST_PROFILE": "1"} if enabled else {}),
        "time": types.SimpleNamespace(monotonic_ns=now),
        "json": json,
        "sys": types.SimpleNamespace(stderr=sink),
    }
    exec(compile(tree, "<isolated-profiling-helper>", "exec"), namespace)
    try:
        result = namespace["_profile_selftest_call"](
            "synthetic", target,
            witnesses=BadLength() if bad_length else [])
    except BaseException as actual_error:
        assert raising and actual_error is original_error, (
            "changed-exception", type(actual_error).__name__)
    else:
        assert not raising and result is marker, "changed-result"
    assert len(calls) == 1, "target must run exactly once"
    if not enabled:
        assert not clocks, "disabled profiling sampled its clock"
    return {
        "originalOutcome": "raised" if raising else "returned",
        "functionCalls": len(calls),
        "clockCalls": len(clocks),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source_path = "scripts/check_spec_reconciliation.py"
    source_bytes = subprocess.run(
        ["git", "show", args.commit + ":" + source_path], cwd=args.repo,
        check=True, capture_output=True).stdout
    source = source_bytes.decode("utf-8")
    commit = subprocess.run(
        ["git", "rev-parse", args.commit + "^{commit}"], cwd=args.repo,
        check=True, capture_output=True, text=True).stdout.strip()
    source_tree = ast.parse(source)
    helpers = [node for node in source_tree.body
               if isinstance(node, ast.FunctionDef)
               and node.name == "_profile_selftest_call"]
    assert len(helpers) == 1, "exactly one profiling helper required"
    helper = helpers[0]
    helper_source = "".join(source.splitlines(keepends=True)[
        helper.lineno - 1:helper.end_lineno])
    isolated = ast.Module(body=[copy.deepcopy(helper)], type_ignores=[])

    results = []
    for sink in (io.StringIO, WriteError, FlushError, ClosedError):
        for raising in (False, True):
            results.append({
                "id": sink.__name__ + ("-raise" if raising else "-return"),
                **check(isolated, sink, raising),
            })
    for raising in (False, True):
        suffix = "-raise" if raising else "-return"
        results.append({"id": "disabled" + suffix,
                        **check(isolated, WriteError, raising, enabled=False)})
        for stage in (1, 2):
            results.append({
                "id": "clock" + str(stage) + suffix,
                **check(isolated, WriteError, raising, clock_fail=stage),
            })
        results.append({
            "id": "count-failure" + suffix,
            **check(isolated, WriteError, raising, bad_length=True),
        })
    assert len(results) == 16

    # Retain exact guarded/unguarded source fragments, and run their mutation.
    helper_tree = ast.parse(helper_source)
    function = helper_tree.body[0]
    function_try = next(node for node in function.body
                        if isinstance(node, ast.Try) and node.finalbody)
    assert not function_try.handlers, "real function must have no error handler"
    assert len(function_try.finalbody) == 1
    guarded = function_try.finalbody[0]
    assert isinstance(guarded, ast.Try) and len(guarded.handlers) == 1
    lines = helper_source.splitlines(keepends=True)
    old = "".join(lines[guarded.lineno - 1:guarded.end_lineno])
    body_lines = lines[guarded.body[0].lineno - 1:guarded.body[-1].end_lineno]
    assert all(line.startswith("    ") or not line.strip() for line in body_lines)
    new = "".join(line[4:] if line.startswith("    ") else line
                  for line in body_lines)
    assert helper_source.count(old) == 1
    mutant_source = helper_source.replace(old, new, 1)
    mutant = ast.parse(mutant_source)
    try:
        check(mutant, WriteError)
    except AssertionError as failure:
        mutation = {"id": "unguarded-finally-output", "outcome": "killed",
                    "predicate": "return identity despite failing stderr",
                    "observed": str(failure), "old": old, "new": new,
                    "mutantHelperSha256": hashlib.sha256(
                        mutant_source.encode()).hexdigest()}
    else:
        raise AssertionError("unguarded-output mutation survived")

    report = {
        "sourceCommit": commit,
        "sourcePath": source_path,
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "helperSha256": hashlib.sha256(helper_source.encode()).hexdigest(),
        "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "caseCount": len(results), "passed": len(results), "cases": results,
        "mutation": mutation,
        "executionBoundary": "Only the extracted helper AST executes, using "
        "fake environment, clock, streams and synthetic callables. No project "
        "module, fixture, canonical selftest or build is imported/executed.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in (
        "sourceCommit", "sourceSha256", "harnessSha256", "caseCount", "passed")},
        indent=2))
    print("unguarded-finally-output mutation: " + mutation["outcome"])


if __name__ == "__main__":
    main()
