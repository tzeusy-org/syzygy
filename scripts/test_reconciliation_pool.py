"""Tests for the reconciliation selftest's per-run scope and family pool.

`check_spec_reconciliation.py --selftest` runs its serial case families side
by side in forked workers, and every `run()` opens one per-run scope of memos
(syzygy-7rkx). Neither shows in the selftest's own witness record: a family
pool that drops a failure, or a `run()` that stops memoizing, still prints
PASS. These tests pin both, in seconds, over synthetic families and a stubbed
P115 answer; they read no repository tree.

Run from the repository root:

    python3 scripts/test_reconciliation_pool.py
"""

from __future__ import annotations

import contextlib
import io
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest import mock

import check_spec_reconciliation as checker


def _environment(workers, timeout):
    return mock.patch.dict(os.environ, {"SELFTEST_WORKERS": str(workers),
                                        "SELFTEST_TIMEOUT": str(timeout)})


@contextlib.contextmanager
def _stub_signed(counter=None):
    """P115's answer read from a `marker` file in the tree, counted."""
    reference = checker.poc_reference()

    def is_signed(root):
        if counter is not None:
            counter.append(str(root))
        return (Path(root) / "marker").read_text()

    with mock.patch.object(reference, "is_signed", is_signed):
        yield


class RunScopeTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.tree = Path(directory.name)

    def test_each_scope_starts_empty_and_exit_clears(self):
        marker = self.tree / "marker"
        with _stub_signed():
            marker.write_text("first")
            with checker._run_scope():
                first = checker.reference_signed(self.tree)
            marker.write_text("second")
            with checker._run_scope():
                second = checker.reference_signed(self.tree)
            after = (checker._SIGNED_MEMO, checker._RUN_MEMO)
            marker.write_text("third")
            outside = checker.reference_signed(self.tree)
        self.assertEqual((first, second, outside), ("first", "second", "third"))
        self.assertEqual(after, (None, None))

    def test_a_nested_scope_is_refused(self):
        with checker._run_scope():
            with self.assertRaises(AssertionError):
                with checker._run_scope():
                    pass
            self.assertEqual(checker._SIGNED_MEMO, {})
        self.assertIsNone(checker._SIGNED_MEMO)

    def test_run_asks_p115_once_per_tree(self):
        (self.tree / "marker").write_text("signed")
        calls, answers = [], []

        def outcomes(root, report):
            answers.append(checker.reference_signed(root))
            answers.append(checker.reference_signed(root))

        stubs = [mock.patch.object(checker, "check_outcomes", outcomes),
                 mock.patch.object(checker, "check_census", lambda root, report: None)]
        stubs += [mock.patch.object(checker, name, lambda *args: None)
                  for name in ("check_generated", "check_routes", "check_pins",
                               "check_unions")]
        with contextlib.ExitStack() as stack:
            for stub in stubs:
                stack.enter_context(stub)
            stack.enter_context(_stub_signed(calls))
            checker.run(self.tree)
            checker.scoped_check_outcomes(self.tree, checker.Report())
        self.assertEqual(answers, ["signed"] * 4)
        self.assertEqual(len(calls), 2, "one P115 answer per scope, two scopes")
        self.assertIsNone(checker._SIGNED_MEMO)


def _leaky(found, failed):
    found.append({"pid": os.getpid(), "saw": repr(checker._SIGNED_MEMO)})
    checker._SIGNED_MEMO = {"left-behind": True}


def _observer(found, failed):
    found.append({"pid": os.getpid(), "saw": repr(checker._SIGNED_MEMO)})


def _ordered(index, count):
    def family(found, failed):
        time.sleep(0.1 * (count - index))   # later families finish first
        print(f"family {index}")
        found.append({"family": index})
    return family


class FamilyPoolTest(unittest.TestCase):
    def families(self, families, workers=2, timeout=60):
        found, failed = [], []
        with _environment(workers, timeout), \
                contextlib.redirect_stdout(io.StringIO()) as printed:
            checker._run_families(families, found, failed)
        return found, failed, printed.getvalue()

    def test_each_family_runs_in_a_fresh_fork(self):
        found, failed, _ = self.families([_leaky, _observer, _observer])
        pids = [w["pid"] for w in found]
        self.assertEqual(len(set(pids)), 3)
        self.assertNotIn(os.getpid(), pids)
        self.assertEqual([w["saw"] for w in found], ["None"] * 3)
        self.assertEqual(failed, [])

    def test_results_and_output_merge_in_list_order(self):
        count = 6
        found, failed, printed = self.families(
            [_ordered(i, count) for i in range(count)])
        self.assertEqual([w["family"] for w in found], list(range(count)))
        self.assertEqual(printed, "".join(f"family {i}\n" for i in range(count)))

    def test_every_familys_failures_are_kept(self):
        def both(found, failed):
            found.append({"family": "both"})
            failed.append("both: a failure")

        def failure_only(found, failed):
            failed.append("failure-only: a failure")

        def clean(found, failed):
            found.append({"family": "clean"})

        found, failed, _ = self.families([both, failure_only, clean])
        self.assertEqual(failed, ["both: a failure", "failure-only: a failure"])
        self.assertEqual(found, [{"family": "both"}, {"family": "clean"}])

    def assert_raise_is_a_failure(self, raising, workers):
        def first(found, failed):
            found.append({"family": "first"})

        def last(found, failed):
            found.append({"family": "last"})

        found, failed, _ = self.families([first, raising, last], workers=workers)
        self.assertEqual(found, [{"family": "first"}, {"family": "partial"},
                                 {"family": "last"}])
        self.assertEqual(len(failed), 1, failed)
        self.assertTrue(failed[0].startswith("family 1 (raising) raised "), failed)
        return failed[0]

    def test_a_family_that_raises_fails_the_run(self):
        def raising(found, failed):
            found.append({"family": "partial"})
            raise ValueError("a predicate broke")

        for workers in (2, 1):
            with self.subTest(workers=workers):
                failure = self.assert_raise_is_a_failure(raising, workers)
                self.assertIn("ValueError: a predicate broke", failure)

    def test_a_family_that_exits_fails_the_run_and_does_not_hang(self):
        def raising(found, failed):
            found.append({"family": "partial"})
            sys.exit("census refused: a test")

        for workers in (2, 1):
            with self.subTest(workers=workers):
                failure = self.assert_raise_is_a_failure(raising, workers)
                self.assertIn("SystemExit: census refused: a test", failure)

    def test_a_dead_worker_fails_by_the_timeout(self):
        def dies(found, failed):
            os._exit(3)

        def clean(found, failed):
            found.append({"family": "clean"})

        started = time.monotonic()
        with self.assertRaises(checker.PoolTimeout):
            self.families([clean, dies, clean], timeout=3)
        self.assertLess(time.monotonic() - started, 30)


def _task_exits(index):
    if index == 1:
        sys.exit("census refused: a case")
    return index


def _task_dies(index):
    if index == 1:
        os._exit(3)
    return index


class ForkMapTest(unittest.TestCase):
    """The pooled cases (`_map_cases`) go through the same `_fork_map`."""

    def test_a_task_that_exits_fails_the_run(self):
        with _environment(2, 60):
            with self.assertRaises(RuntimeError) as raised:
                checker._fork_map(_task_exits, 3)
        self.assertNotIsInstance(raised.exception, checker.PoolTimeout)
        self.assertIn("task 1 raised SystemExit: census refused: a case",
                      str(raised.exception))

    def test_a_dead_worker_fails_by_the_timeout(self):
        with _environment(2, 3):
            with self.assertRaises(checker.PoolTimeout):
                checker._fork_map(_task_dies, 3)

    def test_results_come_back_in_order(self):
        with _environment(2, 60):
            self.assertEqual(checker._fork_map(abs, 5), [0, 1, 2, 3, 4])


if __name__ == "__main__":
    unittest.main(verbosity=2)
