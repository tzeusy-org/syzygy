#!/usr/bin/env python3
"""Behavior fixtures for the task router's agent-only Load selection."""

import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from spent_round_routing import CANDIDATES, SOURCE, declared_rounds

REPO = Path(__file__).resolve().parent.parent


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, REPO / relative)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


router = load("spent_round_test_router", f"{CANDIDATES}/scripts/build_task_router.py")
quotations = load("spent_round_test_quotations", "scripts/check_quotations.py")

HEADER = """## The eleven rounds

| Round | Span | Files | What it settled | Where that settlement lives now |
|---|---|---|---|---|
"""


def row(name):
    return f"| `{name}` | test | 1 | test | test |\n"


class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        self.source = self.root / SOURCE
        self.source.parent.mkdir(parents=True)
        self.round = "round-2026-08f"
        (self.source.parent / self.round).mkdir()
        self.source.write_text(HEADER + row(self.round), encoding="utf-8")

    def rendered(self, paths, *, explicit_history=False):
        task = dict(key="routing-fixture", title="Fixture", modules=paths,
                    clauses={}, omissions=[], explicit_history=explicit_history)
        with patch.object(router, "REPO", self.root):
            return router.render([task])

    def test_table_membership_and_path_boundaries_at_load_line(self):
        directory = f"{CANDIDATES}/{self.round}"
        live = directory + "/fixtures/DRY-RUN-ADMINISTRATION.json"
        neighbors = [f"{CANDIDATES}/round-2026-08archive/README.md",
                     directory + "neighbor/README.md", "elsewhere/" + directory,
                     ".syzygy/governance/contracts/candidates-neighbor/" + self.round,
                     CANDIDATES, "PROJECT-STATUS.md"]
        text = self.rendered([directory, live] + neighbors)
        self.assertNotIn(f"`{directory}`", text)
        self.assertNotIn(f"`{live}`", text)
        for path in neighbors:
            self.assertIn(f"`{path}`", text)

    def test_explicit_history_remains_on_load_line(self):
        path = f"{CANDIDATES}/{self.round}/README.md"
        self.assertIn(f"`{path}`", self.rendered([path], explicit_history=True))

    def test_missing_empty_and_malformed_table_refuse_rendering(self):
        fixtures = ["", "## The eleven rounds\n\nNo table.\n", HEADER, HEADER.replace("| Round |", "| Wrong |") + row(self.round),
                    HEADER.replace("|---|", "|bad|", 1) + row(self.round),
                    HEADER + row("../round-2026-08f"),
                    HEADER + row(self.round).replace("`", "", 1),
                    HEADER + row(self.round).replace(" | test |", " |", 1),
                    HEADER + row(self.round) + "\n" + HEADER + row(self.round)]
        for text in fixtures:
            with self.subTest(text=text):
                self.source.write_text(text, encoding="utf-8")
                with self.assertRaises(ValueError):
                    self.rendered(["PROJECT-STATUS.md"])
        self.source.unlink()
        with self.assertRaises(FileNotFoundError):
            self.rendered(["PROJECT-STATUS.md"])

    def test_duplicate_and_missing_directory_refuse_rendering(self):
        for text, error in [(HEADER + row(self.round) * 2, ValueError),
                            (HEADER + row("round-2026-08z"), FileNotFoundError)]:
            with self.subTest(text=text):
                self.source.write_text(text, encoding="utf-8")
                with self.assertRaises(error):
                    self.rendered(["PROJECT-STATUS.md"])

        directory = self.source.parent / self.round
        directory.rmdir()
        directory.write_text("not a directory", encoding="utf-8")
        self.source.write_text(HEADER + row(self.round), encoding="utf-8")
        with self.assertRaises(ValueError):
            self.rendered(["PROJECT-STATUS.md"])

    def test_new_valid_row_and_replay_need_no_consumer_list(self):
        new = "round-2026-08z"
        path = f"{CANDIDATES}/{new}/README.md"
        self.assertIn(f"`{path}`", self.rendered([path]))
        (self.source.parent / new).mkdir()
        self.source.write_text(HEADER + row(new) + row(self.round), encoding="utf-8")
        first = self.rendered([path, "PROJECT-STATUS.md", "PROJECT-STATUS.md"])
        self.assertNotIn(f"`{path}`", first)
        self.assertEqual(first, self.rendered([path, "PROJECT-STATUS.md", "PROJECT-STATUS.md"]))
        self.source.write_text(HEADER + row(self.round) + row(new), encoding="utf-8")
        self.assertEqual(first, self.rendered([path, "PROJECT-STATUS.md", "PROJECT-STATUS.md"]))

    def test_invalid_candidate_paths_refuse_without_reading_them(self):
        for path in ["/absolute", "../outside", f"{CANDIDATES}/../outside",
                     f"{CANDIDATES}//{self.round}", "a/./b", "a\\b", "a\0b"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.rendered([path])

    def test_source_and_directory_cannot_escape_checkout(self):
        with tempfile.TemporaryDirectory() as outside:
            external = Path(outside)
            (external / "table.md").write_text(HEADER + row(self.round), encoding="utf-8")
            self.source.unlink()
            self.source.symlink_to(external / "table.md")
            with self.assertRaises(ValueError):
                self.rendered(["PROJECT-STATUS.md"])
            self.source.unlink()
            self.source.write_text(HEADER + row(self.round), encoding="utf-8")
            directory = self.source.parent / self.round
            directory.rmdir()
            directory.symlink_to(external, target_is_directory=True)
            with self.assertRaises(ValueError):
                self.rendered(["PROJECT-STATUS.md"])

    def test_dependency_sweep_still_reads_omitted_module(self):
        path = f"{CANDIDATES}/{self.round}/rfcs/dependency.md"
        source = self.root / path
        source.parent.mkdir()
        source.write_text("depends_on: [RFC-0002]\n", encoding="utf-8")
        text = self.rendered([path])
        self.assertNotIn(f"`{path}`", text)
        self.assertIn("**Declared contract dependencies (from module front matter, computed):** RFC-0002", text)

    def test_current_table_and_existing_citer_sweep_keep_live_inputs(self):
        rounds = declared_rounds(REPO)
        candidates = [f"{CANDIDATES}/{name}/README.md" for name in sorted(rounds)]
        live = f"{CANDIDATES}/round-2026-08f/fixtures/DRY-RUN-ADMINISTRATION.json"
        fixture = f"{CANDIDATES}/round-2026-08g/SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md"
        task = copy.deepcopy(router.TASKS[0])
        task["modules"] = candidates + [live, fixture]
        text = router.render([task])
        for path in task["modules"]:
            self.assertNotIn(f"`{path}`", text)
        corpus, tracked = quotations.tracked_corpus(str(REPO))
        for path in [live, fixture]:
            self.assertIn(path, tracked)
            self.assertEqual(corpus[path], (REPO / path).read_text(encoding="utf-8"))
        task["explicit_history"] = True
        for path in task["modules"]:
            self.assertIn(f"`{path}`", router.render([task]))


if __name__ == "__main__":
    unittest.main()
