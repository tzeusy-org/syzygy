"""Integration tests for the advisory adoption preflight's Git object boundary."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from check_spec_reconciliation import (
    ADOPTION_LEDGER_TITLE,
    ADOPTION_TABLE_DIVIDER,
    ADOPTION_TABLE_HEADER,
    AGENT_ADOPTIONS,
)


CLI = Path(__file__).with_name("check_adoption_collisions.py").resolve()


class GitComparisonTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.repo = Path(directory.name)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.name", "Synthetic fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.git("commit", "--allow-empty", "-qm", "seed git objects")
        self.seed = self.git("rev-parse", "HEAD")
        self.ledger = self.repo / AGENT_ADOPTIONS
        self.ledger.parent.mkdir(parents=True)
        self.ledger.write_text(
            f"{ADOPTION_LEDGER_TITLE}\n\n{ADOPTION_TABLE_HEADER}\n{ADOPTION_TABLE_DIVIDER}\n",
            encoding="utf-8",
        )
        self.append_row("A-1", self.seed, "first adoption")
        self.start = self.commit("initial ledger")

    def git(self, *args: str) -> str:
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()

    def commit(self, message: str) -> str:
        self.git("add", "--all")
        self.git("commit", "-qm", message)
        return self.git("rev-parse", "HEAD")

    def branch(self, name: str, base: str | None = None):
        self.git("switch", "-qc", name, self.start if base is None else base)

    def append_row(self, identity: str, subject: str, description: str, tag: str = "—"):
        with self.ledger.open("a", encoding="utf-8") as target:
            target.write(
                f"| {identity} | 2026-11-24 | `{subject}` | {description} | fixture | reverse fixture | {tag} |\n"
            )

    def spec(self, name: str, identity: str, family="polaris-generation", version="2.25",
             *, stored_version: str | None = None, prepared_first: bool = False,
             has_requirements: bool = True) -> str:
        path = f"openspec/changes/{name}/proposed/{family}/spec.md"
        file = self.repo / path
        file.parent.mkdir(parents=True)
        contents = "## MODIFIED Requirements\n\n### Requirement: A synthetic declaration\n"
        if not has_requirements:
            contents = "## MODIFIED Requirements\n\nA heading without any entries.\n"
        file.write_text(
            f"# Fixture {name}\n\n"
            f"Candidate version {stored_version or version}. One MODIFIED requirement, REQ-{family}-034.\n\n"
            + contents,
            encoding="utf-8",
        )
        subject = self.commit("prepare new spec")
        if prepared_first:
            (self.repo / "build-input.txt").write_text("register prepared specification\n")
            subject = self.commit("register prepared specification")
        description = f"[new spec](https://github.com/tzeusy-org/syzygy/blob/{subject}/{path})"
        self.append_row(identity, subject, description, f"`dossier-{name}-v{version}`")
        return self.commit("record versioned adoption")

    def installed_spec(self, name: str, identity: str) -> str:
        file = self.repo / "openspec/changes/installed/specs/other-capability/spec.md"
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(f"# Installed fixture {name}\n\n### Requirement: A synthetic rule\n",
                        encoding="utf-8")
        subject = self.commit("install amended specification")
        self.append_row(identity, subject, "spec amendment", f"`{name}-v1.0`")
        return self.commit("record installed amendment")

    def outcome(self, head: str, base: str, expected: int) -> dict:
        result = subprocess.run([sys.executable, str(CLI), "--head", head, "--base", base],
                                cwd=self.repo, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual((payload["head"], payload["base"]), (head, base))
        return payload

    def repo_snapshot(self) -> tuple[str, ...]:
        return (
            self.git("rev-parse", "HEAD^{tree}"),
            self.git("status", "--porcelain=v1"),
            self.git("ls-files", "--stage"),
            self.git("for-each-ref", "--format=%(refname) %(objectname)"),
            self.git("count-objects", "-v"),
        )

    def test_distinct_adjacent_adoptions_are_structurally_clear_without_writes(self):
        self.git("tag", "existing-tag")
        self.branch("candidate")
        self.append_row("A-2", self.start, "candidate addition")
        candidate = self.commit("candidate")
        self.branch("incumbent")
        self.append_row("A-3", self.start, "incumbent addition")
        incumbent = self.commit("incumbent")
        plain_merge = self.git("merge-tree", "--trivial-merge", self.start, candidate, incumbent)
        self.assertIn("changed in both", plain_merge)
        self.assertIn("<<<<<<<", plain_merge)
        before = self.repo_snapshot()
        result = self.outcome(candidate, incumbent, 0)
        self.assertEqual(result, {"head": candidate, "base": incumbent, "merge_base": self.start,
                                  "adoption_collisions": [], "version_collisions": [], "outcome": "clear"})
        self.assertEqual(self.repo_snapshot(), before)

    def test_duplicate_new_identity_and_same_family_version_are_reported_separately(self):
        self.branch("candidate")
        candidate = self.spec("candidate-spec", "A-2", prepared_first=True)
        self.branch("incumbent")
        incumbent = self.spec("incumbent-spec", "A-2")
        result = self.outcome(candidate, incumbent, 1)
        self.assertEqual([row["id"] for row in result["adoption_collisions"]], ["A-2"])
        (version,) = result["version_collisions"]
        self.assertEqual((version["family"], version["version"]), ("polaris-generation", "2.25"))
        self.assertEqual(version["candidate"]["spec_path"],
                         "openspec/changes/candidate-spec/proposed/polaris-generation/spec.md")
        self.assertEqual(version["shared_modified_requirements"], ["REQ-polaris-generation-034"])

    def test_equal_version_in_different_families_is_clear(self):
        self.branch("candidate")
        candidate = self.spec("candidate-spec", "A-2", "polaris-generation")
        self.branch("incumbent")
        incumbent = self.spec("incumbent-spec", "A-3", "other-capability")
        self.assertEqual(self.outcome(candidate, incumbent, 0)["version_collisions"], [])

    def test_separate_installed_amendment_series_can_share_version(self):
        self.branch("candidate")
        candidate = self.installed_spec("candidate-amendment", "A-2")
        self.branch("incumbent")
        incumbent = self.installed_spec("incumbent-amendment", "A-3")
        self.assertEqual(self.outcome(candidate, incumbent, 0)["version_collisions"], [])

    def test_version_collision_can_exist_with_distinct_adoption_ids(self):
        self.branch("candidate")
        candidate = self.spec("candidate-spec", "A-2")
        self.branch("incumbent")
        incumbent = self.spec("incumbent-spec", "A-3")
        result = self.outcome(candidate, incumbent, 1)
        self.assertEqual(result["adoption_collisions"], [])
        self.assertEqual(len(result["version_collisions"]), 1)

    def test_equal_new_row_requires_a_different_claim_to_collide(self):
        self.branch("candidate")
        self.append_row("A-2", self.start, "identical claim")
        candidate = self.commit("candidate")
        self.branch("incumbent")
        self.append_row("A-2", self.start, "identical claim")
        incumbent = self.commit("incumbent")
        self.assertEqual(self.outcome(candidate, incumbent, 0)["adoption_collisions"], [])

    def test_invalid_binding_and_nonregular_ledger_are_unavailable(self):
        self.branch("candidate")
        mismatched = self.spec("wrong-version", "A-2", stored_version="2.26")
        error = self.outcome(mismatched, self.start, 2)
        self.assertIn("does not bind", error["reason"])
        self.ledger.unlink()
        self.ledger.symlink_to("outside")
        symlink = self.commit("replace regular ledger")
        error = self.outcome(symlink, self.start, 2)
        self.assertIn("regular blob", error["reason"])

    def test_new_proposed_binding_needs_a_requirement_entry(self):
        self.branch("candidate")
        incomplete = self.spec("candidate-spec", "A-2", has_requirements=False)
        error = self.outcome(incomplete, self.start, 2)
        self.assertIn("has no requirement entries", error["reason"])

    def test_proposed_claim_must_bind_current_bytes(self):
        self.branch("candidate")
        self.spec("candidate-spec", "A-2")
        file = self.repo / "openspec/changes/candidate-spec/proposed/polaris-generation/spec.md"
        file.write_text(file.read_text().replace("Candidate version 2.25", "Candidate version 2.26"),
                        encoding="utf-8")
        changed = self.commit("edit the installed proposal after adoption")
        self.assertIn("differs from", self.outcome(changed, self.start, 2)["reason"])

    def test_new_subject_must_be_readable_in_compared_history(self):
        self.branch("outside")
        outside = self.spec("outside-spec", "A-2")
        self.branch("candidate")
        path = "openspec/changes/outside-spec/proposed/polaris-generation/spec.md"
        description = f"[outside spec](https://github.com/tzeusy-org/syzygy/blob/{outside}/{path})"
        self.append_row("A-2", outside, description, "`dossier-outside-spec-v2.25`")
        candidate = self.commit("claim a spec from another history")
        self.assertIn("outside the history", self.outcome(candidate, self.start, 2)["reason"])

    def test_new_untagged_subject_must_resolve(self):
        self.branch("candidate")
        self.append_row("A-2", "f" * 40, "subject object does not exist")
        candidate = self.commit("unreadable untagged subject")
        self.assertIn("could not read", self.outcome(candidate, self.start, 2)["reason"])

    def test_installed_path_can_advance_between_its_own_amendments(self):
        self.branch("candidate")
        self.installed_spec("first-amendment", "A-2")
        candidate = self.installed_spec("second-amendment", "A-3")
        self.assertEqual(self.outcome(candidate, self.start, 0)["version_collisions"], [])

    def test_ambiguous_refs_missing_objects_and_nonunique_ancestors_are_unavailable(self):
        self.git("branch", "ambiguous")
        self.git("tag", "ambiguous")
        self.assertIn("full 40-character", self.outcome("ambiguous", self.start, 2)["reason"])
        self.assertIn("could not read", self.outcome("f" * 40, self.start, 2)["reason"])
        self.branch("left")
        left = self.commit_after_row("A-2", "left")
        self.branch("right")
        right = self.commit_after_row("A-3", "right")
        tree = self.git("rev-parse", "HEAD^{tree}")
        left_merge = self.git("commit-tree", tree, "-p", left, "-p", right, "-m", "left merge")
        right_merge = self.git("commit-tree", tree, "-p", right, "-p", left, "-m", "right merge")
        self.assertIn("unique merge base", self.outcome(left_merge, right_merge, 2)["reason"])

    def commit_after_row(self, identity: str, description: str) -> str:
        self.append_row(identity, self.start, description)
        return self.commit(description)

    def test_clear_report_is_bound_to_old_base_after_main_moves(self):
        self.branch("candidate")
        candidate = self.commit_after_row("A-2", "candidate")
        stale = self.outcome(candidate, self.start, 0)
        self.git("switch", "-q", "main")
        incumbent = self.commit_after_row("A-2", "incumbent")
        current = self.outcome(candidate, incumbent, 1)
        self.assertNotEqual(stale["base"], self.git("rev-parse", "main"))
        self.assertEqual(current["base"], incumbent)
        self.assertEqual([row["id"] for row in current["adoption_collisions"]], ["A-2"])

    def test_inherited_row_rewrite_does_not_report_clear(self):
        self.ledger.write_text(self.ledger.read_text().replace("first adoption", "rewritten"),
                               encoding="utf-8")
        candidate = self.commit("rewrite inherited row")
        self.assertIn("inherited adoption row A-1 differs",
                      self.outcome(candidate, self.start, 2)["reason"])


if __name__ == "__main__":
    unittest.main()
