#!/usr/bin/env python3
"""Tests for the Polaris dossier pilot harness (syzygy-5dhm.133): totals, grading input, reader text.

    python3 scripts/test_dossier_pilot.py

Expected values are literals written here, never read from the result files or computed by the module under test.
"""
import copy
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parent
PILOT = SCRIPTS.parent / "docs" / "evidence" / "pursuit-2026-11-21b" / "pilot"


def load(name):
    spec = importlib.util.spec_from_file_location(f"pilot_test_{name}", SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


totals = load("dossier_pilot_totals")
grading_input = load("dossier_pilot_grading_input")
site_to_text = load("dossier_site_to_text")
runs = load("dossier_pilot_runs")

FIRST = {"D": 0.34, "P": 0.481, "T": 0.944}
SECOND = {"D": 0.327, "E": 0.574, "P": 0.457, "T": 0.951}
THIRD = {"D": 0.333, "E": 0.605, "F": 0.481, "G": 0.414, "H": 0.389, "P": 0.469}
KINDS = ("purpose", "structure", "mechanism", "rationale", "change", "limits")
# Per kind, in KINDS order, for every arm row of every grading.
PER_KIND = {
    "first": {"D": (0.58, 0.29, 0.40, 0.31, 0.04, 0.42), "P": (0.50, 0.79, 0.60, 0.23, 0.58, 0.15),
              "T": (0.96, 0.89, 0.93, 0.96, 0.92, 1.00)},
    "second": {"D": (0.58, 0.29, 0.37, 0.31, 0.04, 0.38), "E": (0.65, 0.57, 0.67, 0.62, 0.42, 0.50),
               "P": (0.46, 0.75, 0.57, 0.19, 0.58, 0.15), "T": (1.00, 0.93, 0.93, 0.92, 0.92, 1.00)},
    "third": {"D": (0.58, 0.29, 0.37, 0.31, 0.04, 0.42), "E": (0.69, 0.57, 0.73, 0.58, 0.50, 0.54),
              "F": (0.65, 0.32, 0.50, 0.65, 0.12, 0.65), "G": (0.50, 0.36, 0.37, 0.62, 0.27, 0.38),
              "H": (0.65, 0.29, 0.37, 0.58, 0.00, 0.46), "P": (0.46, 0.79, 0.57, 0.27, 0.58, 0.12)},
}
# The first result file records digests of the first grading's inputs only. These pin the rest: the second and third gradings'
# grades and the three label maps (sha256 of the stored bytes, written here by script on 2026-11-22).
PINNED = {
    "grading2/grades.json": "5a7f1095de48d31e2b5179a6e7a6e145f5b8039c5aaa5839d226607c57df69f8",
    "grading3/grades.json": "3ca4a22549239a164c0d2f3c3a997a28cb3077c117d00039600aff7f9c6acd39",
    "labels-first-grading.json": "d27cfe41b07043a3db56464dd39189592b21424798014f0c5dbe3b819f8d1af3",
    "labels-second-grading.json": "755a15b71d972e5ae11925c5c870bd7df90be681f25403b512d2bdfb5e391a62",
    "labels-third-grading.json": "2910b0a41ccbf6f0fab1e1f2fa9be69727fa3c97901fef33e8c8a846ae23cf62",
}


class TotalsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = totals.load(PILOT)
        cls.totals = totals.recompute(cls.record)

    def shares(self, grading):
        return {arm: row["share"] for arm, row in self.totals[grading].items()}

    def test_recorded_shares_per_arm(self):
        self.assertEqual(self.shares("first"), FIRST)
        self.assertEqual(self.shares("second"), SECOND)
        self.assertEqual(self.shares("third"), THIRD)

    def test_shares_per_question_kind(self):
        rows = 0
        for grading, arms in PER_KIND.items():
            self.assertEqual(set(arms), set(self.totals[grading]), grading)
            for arm, want in arms.items():
                self.assertEqual(self.totals[grading][arm]["perKind"], dict(zip(KINDS, want)), (grading, arm))
                rows += 1
        self.assertEqual(rows, 13)

    def test_pinned_digests(self):
        for name, digest in PINNED.items():
            self.assertEqual(hashlib.sha256((PILOT / name).read_bytes()).hexdigest(), digest, name)

    def test_a_missing_recorded_member_fails_the_check(self):
        for grading, arm, member in (("third", "E", "share"), ("second", "D", "firstGradingShare"), ("first", "T", "difficultyFelt"),
                                     ("third", "P", "perKind"), ("second", "T", "factsRequired")):
            mutant = copy.deepcopy(self.record)
            del mutant["gradings"][grading]["result"]["arms"][arm][member]
            found = totals.differences(mutant)
            self.assertEqual(len(found), 1, found)
            self.assertIn(f"{grading} grading, arm {arm}, {member}", found[0])
            self.assertIn("absent from the result file", found[0])

    def test_population(self):
        for grading, arms in (("first", 3), ("second", 4), ("third", 6)):
            self.assertEqual(len(self.totals[grading]), arms)
            for row in self.totals[grading].values():
                self.assertEqual(row["factsRequired"], 81)
                self.assertEqual(set(row["perKind"]), set(KINDS))
            self.assertEqual(len(self.record["gradings"][grading]["grades"]), 24)
        self.assertEqual(self.totals["first"]["D"]["factsGiven"], 27.5)
        self.assertEqual(self.totals["first"]["D"]["answersWithNotStated"], 20)

    def test_record_reproduces(self):
        self.assertEqual(totals.differences(self.record), [])

    def test_one_changed_grade_fails_the_check(self):
        mutant = copy.deepcopy(self.record)
        cell = mutant["gradings"]["first"]["grades"][0]["A"]["facts"]
        cell[0] = 0 if cell[0] == 1 else 1
        found = totals.differences(mutant)
        self.assertTrue(any("first grading, arm P, share" in line for line in found), found)

    def test_every_mutation_fails_the_check(self):
        self.assertEqual(len(totals.MUTATIONS), 17)
        for name, mutate in totals.MUTATIONS:
            mutant = copy.deepcopy(self.record)
            mutate(mutant)
            self.assertTrue(totals.differences(mutant), name)

    def test_commands(self):
        for flags, code in ((["--check"], 0), (["--selftest"], 0), (["--check", "--pilot", str(SCRIPTS)], 2)):
            done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_pilot_totals.py"), *flags], capture_output=True, text=True)
            self.assertEqual(done.returncode, code, (flags, done.stderr))

    def test_check_fails_on_a_changed_copy(self):
        with tempfile.TemporaryDirectory() as scratch:
            copy_dir = pathlib.Path(scratch) / "pilot"
            subprocess.run(["cp", "-r", str(PILOT), str(copy_dir)], check=True)
            grades = json.loads((copy_dir / "grading3" / "grades.json").read_text())
            grades["grades"][5]["C"]["facts"][0] = 0.5 if grades["grades"][5]["C"]["facts"][0] != 0.5 else 0
            (copy_dir / "grading3" / "grades.json").write_text(json.dumps(grades))
            done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_pilot_totals.py"), "--check", "--pilot", str(copy_dir)], capture_output=True, text=True)
            self.assertEqual(done.returncode, 1, done.stderr)
            self.assertIn("DIFFERS third grading, arm P", done.stderr)


class GradingInputTests(unittest.TestCase):
    def test_recorded_gradings_rebuild(self):
        for name, labels in (("first", 3), ("second", 4), ("third", 6)):
            found, rows, drawn = grading_input.check_recorded(PILOT, name)
            self.assertEqual((found, rows, drawn), ([], 24, labels), name)

    def test_recorded_label_maps(self):
        spec = grading_input.RECORDED
        self.assertEqual(grading_input.build_from(PILOT, spec["first"]["arms"], spec["first"]["coin"], "rotate")[0], {"A": "P", "B": "T", "C": "D"})
        self.assertEqual(grading_input.build_from(PILOT, spec["second"]["arms"], spec["second"]["coin"], "pick")[0], {"A": "P", "B": "E", "C": "D", "D": "T"})
        self.assertEqual(grading_input.build_from(PILOT, spec["third"]["arms"], spec["third"]["coin"], "pick")[0],
                         {"A": "H", "B": "D", "C": "P", "D": "E", "E": "F", "F": "G"})

    def test_input_carries_only_id_and_answer(self):
        _, built = grading_input.build_from(PILOT, ["D", "P", "T"], ["key.json"], "rotate")
        for row in built:
            self.assertEqual(sorted(row), ["answers", "id", "kind", "model_answer", "question", "required_facts"])
            self.assertEqual(sorted(row["answers"]), ["A", "B", "C"])
            for answer in row["answers"].values():
                self.assertIsInstance(answer, str)
        notes = json.loads((PILOT / "answers-D.json").read_text())["notes"]
        self.assertGreater(len(notes), 20)
        self.assertNotIn(notes, json.dumps(built, ensure_ascii=False))

    def test_selftest_and_refusal(self):
        self.assertEqual(grading_input.selftest(), 0)
        key = [{"id": "Q1", "kind": "purpose", "question": "q", "model_answer": "m", "required_facts": ["f"]}]
        with self.assertRaises(grading_input.InputError):
            grading_input.build_input(key, {"D": {"answers": []}, "P": {"answers": [{"id": "Q1", "answer": "a"}]}}, {"A": "D", "B": "P"})

    def test_label_map_is_not_written_beside_the_input(self):
        with tempfile.TemporaryDirectory() as scratch:
            done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_pilot_grading_input.py"), "--grading", "second",
                                   "--out", f"{scratch}/input.json", "--labels-out", f"{scratch}/labels.json"], capture_output=True, text=True)
            self.assertEqual(done.returncode, 2, done.stderr)
            self.assertEqual(list(pathlib.Path(scratch).iterdir()), [])


class SiteToTextTests(unittest.TestCase):
    def test_fixture_page(self):
        self.assertEqual(site_to_text.selftest(), 0)
        page = ("<html><body><header>BANNER</header><main><h2>Persistence</h2><p>Two files"
                "<a class=\"cite\" href=\"sources/x.html\">3<span class=\"cite-pop\">src/rdb.c 10-20</span></a>.</p>"
                "<ol><li>fork</li><li>write</li></ol></main></body></html>")
        self.assertEqual(site_to_text.page_text(page), "## Persistence\n\nTwo files [3: src/rdb.c 10-20].\n\n- fork\n\n- write\n")

    def test_site_counts_and_source_pages(self):
        with tempfile.TemporaryDirectory() as scratch:
            site, out = pathlib.Path(scratch) / "site", pathlib.Path(scratch) / "text"
            pages = {"index.html": "<main><h1>One two</h1><p>three four five</p></main>",
                     "poles/1.html": "<nav>skip me</nav><main><p>six seven</p></main>",
                     "sources/index.html": "<main><p>eight</p></main>",
                     "sources/a.html": "<main><p>RAW SOURCE BODY</p></main>",
                     "sources/src/b.c.html": "<main><p>RAW SOURCE BODY</p></main>"}
            for relative, body in pages.items():
                (site / relative).parent.mkdir(parents=True, exist_ok=True)
                (site / relative).write_text(body)
            (site / "style.css").write_text("main{}")
            report = pathlib.Path(scratch) / "report.json"
            done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(site), str(out), "--report", str(report)],
                                  capture_output=True, text=True)
            self.assertEqual(done.returncode, 0, done.stderr)
            self.assertEqual(done.stdout, "pages 3 words 9 sources pages excluded 2\n")
            self.assertEqual(sorted(p.relative_to(out).as_posix() for p in out.rglob("*") if p.is_file()), ["index.md", "poles/1.md", "sources/index.md"])
            self.assertEqual((out / "index.md").read_text(), "# One two\n\nthree four five\n")
            self.assertEqual(json.loads(report.read_text())["perPageWords"], {"index.html": 6, "poles/1.html": 2, "sources/index.html": 1})
            again = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(site), str(out)], capture_output=True, text=True)
            self.assertEqual(again.returncode, 2)
            kept = report.read_bytes()
            over = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(site), f"{scratch}/text2", "--report", str(report)],
                                  capture_output=True, text=True)
            self.assertEqual(over.returncode, 2)
            self.assertIn("already exists", over.stderr)
            self.assertEqual(report.read_bytes(), kept)
            self.assertFalse(pathlib.Path(f"{scratch}/text2").exists())

    def test_reader_form_leaves_out_the_run_pages(self):
        # syzygy-5dhm.136: --reader keeps the reading path alone; the run pages it leaves out are counted with their words.
        with tempfile.TemporaryDirectory() as scratch:
            site, out = pathlib.Path(scratch) / "site", pathlib.Path(scratch) / "text"
            pages = {"index.html": "<main><p>one two three</p></main>", "name-index.html": "<main><p>four</p></main>",
                     "maps/ci.html": "<main><p>five six</p></main>", "appendix.html": "<main><p>run words here</p></main>",
                     "understanding.html": "<main><p>more run</p></main>", "size-report.html": "<main><p>size</p></main>",
                     "sources/a.html": "<main><p>RAW SOURCE BODY</p></main>"}
            for relative, body in pages.items():
                (site / relative).parent.mkdir(parents=True, exist_ok=True)
                (site / relative).write_text(body)
            report = pathlib.Path(scratch) / "report.json"
            done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(site), str(out), "--reader", "--report", str(report)],
                                  capture_output=True, text=True)
            self.assertEqual(done.returncode, 0, done.stderr)
            self.assertEqual(done.stdout, "pages 3 words 6 sources pages excluded 1 run pages excluded 3\n")
            self.assertEqual(sorted(p.relative_to(out).as_posix() for p in out.rglob("*") if p.is_file()), ["index.md", "maps/ci.md", "name-index.md"])
            recorded = json.loads(report.read_text())
            self.assertEqual(recorded["form"], "reader")
            self.assertEqual(recorded["runPagesWords"], {"appendix.html": 3, "size-report.html": 1, "understanding.html": 2})

    def test_one_page_class_definition(self):
        # The pilot's split reads the classes the converter applies, from the one JSON definition.
        self.assertIs(runs.page_class.__code__, runs._CONVERTER.page_class.__code__)
        record = json.loads((SCRIPTS / "dossier_page_classes.json").read_text())
        self.assertEqual([row["class"] for row in record["classes"]], ["reader", "navigation", "run"])
        self.assertEqual(sorted(record["classes"][2]["paths"]), ["appendix.html", "clarifications.html", "discovery.html", "executions.html",
                                                                  "review.html", "size-report.html", "understanding.html"])

    def test_agent_and_session_directories_are_refused(self):
        with tempfile.TemporaryDirectory() as scratch:
            for suffix in (".agents", ".sessions"):
                site = pathlib.Path(scratch) / f"run-x{suffix}" / "site"
                site.mkdir(parents=True)
                (site / "index.html").write_text("<main>x</main>")
                done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(site), f"{scratch}/out{suffix}"], capture_output=True, text=True)
                self.assertEqual(done.returncode, 2)
                self.assertFalse(pathlib.Path(f"{scratch}/out{suffix}").exists())
                plain = pathlib.Path(scratch) / f"plain{suffix[1:]}" / "site"
                plain.mkdir(parents=True)
                (plain / "index.html").write_text("<main>x</main>")
                for flags in ([f"{scratch}/run-y{suffix}/text"], [f"{scratch}/text{suffix[1:]}", "--report", f"{scratch}/run-y{suffix}/report.json"]):
                    done = subprocess.run([sys.executable, str(SCRIPTS / "dossier_site_to_text.py"), str(plain), *flags], capture_output=True, text=True)
                    self.assertEqual(done.returncode, 2, flags)
                    self.assertIn(".agents or .sessions", done.stderr)
                    self.assertFalse(pathlib.Path(flags[0]).exists())


class RunsTests(unittest.TestCase):
    """The stored runs' page-class split (syzygy-5dhm.134)."""

    @classmethod
    def setUpClass(cls):
        cls.runs = json.loads((PILOT / "runs.json").read_text())
        cls.words = json.loads((PILOT / "runs-page-words.json").read_text())

    def test_record_reproduces(self):
        self.assertEqual(runs.record_differences(self.runs, self.words), [])
        self.assertEqual(runs.selftest(), 0)

    def test_split_literals(self):
        # run prefix: (pages, words, reader words, navigation words, run words, reader share)
        want = {"2ecdcab0": (15, 15281, 10863, 221, 4197, 0.711), "4465d22f": (11, 7883, 4306, 251, 3326, 0.546),
                "658f2f90": (15, 12574, 7195, 921, 4458, 0.572), "d9411d26": (11, 15897, 10872, 414, 4611, 0.684),
                "ffe579c7": (15, 14227, 9002, 1016, 4209, 0.633)}
        self.assertEqual(sorted(self.words["runs"]), sorted([*want, "36df95fa"]))
        self.assertEqual(self.words["runs"]["36df95fa"], {"runId": "36df95faf04a4c98eabbb32a18a4e833", "site": None})
        # What was measured is named: the run id and, for a site, the digest of its kept pages (literals, 2026-11-22).
        self.assertEqual(self.words["format"], "polaris-dossier-pilot-page-words/2")
        self.assertEqual({prefix: (row["runId"], row.get("siteDigest")) for prefix, row in self.words["runs"].items()}, {
            "2ecdcab0": ("2ecdcab0c77e228f6ad9d3e0acfa1414", "9d364b7782bf6e0e29905c84a2c83fb37346abaf11dfb1f6f699452cf3ed7fff"),
            "36df95fa": ("36df95faf04a4c98eabbb32a18a4e833", None),
            "4465d22f": ("4465d22f5ce1829ca49059a5b8451bb0", "3c093a02f23ea89a8d81c943fb09018f2c1b8e8127eb70fd3fa89ce9493157ba"),
            "658f2f90": ("658f2f90470f73eea1dc1d90209c5ef7", "517ccb51731b9cf2bf8cd6db3c8ccd787833a2061a43188bf949bde995488020"),
            "d9411d26": ("d9411d26ca55ebe0250e2e9b94dc0e32", "5b71a08f708a98dfb0c87dc56210c5552befb2e46103212660710caf637e132c"),
            "ffe579c7": ("ffe579c77dc21d9f6dd87ca6e2bc9301", "277985f62793973d2f3dd54faf6ab30dc6356f6c4248f6a82b7c83664456fef6")})
        for prefix, (pages, words, reader, navigation, run, share) in want.items():
            got = runs.split(self.words["runs"][prefix]["perPageWords"])
            self.assertEqual((got["pages"], got["words"], got["wordsByClass"]["reader"], got["wordsByClass"]["navigation"],
                              got["wordsByClass"]["run"], got["wordsByClass"]["other"], got["readerShareOfWords"]),
                             (pages, words, reader, navigation, run, 0, share), prefix)

    def test_a_changed_page_fails_the_check(self):
        mutant = copy.deepcopy(self.words)
        mutant["runs"]["658f2f90"]["perPageWords"]["review.html"] += 1
        found = runs.record_differences(self.runs, mutant)
        # One more word on a run page moves the total and the class split; the reader share still rounds to 0.572.
        self.assertEqual(sorted(line.split(":")[0] for line in found), ["run 658f2f90, words", "run 658f2f90, wordsByClass"])

    def test_a_malformed_record_exits_2_without_a_traceback(self):
        script = str(SCRIPTS / "dossier_pilot_runs.py")

        def drop(member):
            return lambda r, w: w["runs"]["658f2f90"].pop(member)
        cases = (
            ("a words row that is a string", lambda r, w: w["runs"].__setitem__("658f2f90", "site/1"), "malformed row for run 658f2f90"),
            ("a words row without its site", drop("site"), "no member `site`"),
            ("a words row without its words per page", drop("perPageWords"), "`perPageWords` is not an object of counts"),
            ("a page count that is a string", lambda r, w: w["runs"]["658f2f90"]["perPageWords"].__setitem__("review.html", "12"),
             "`perPageWords` is not an object of counts"),
            ("a runs.json row that is a list", lambda r, w: r["runs"].__setitem__("658f2f90", []), "runs.json: malformed row for run 658f2f90"),
            ("a runs.json without runs", lambda r, w: r.pop("runs"), "runs.json: malformed, no object member `runs`"),
        )
        for name, mutate, message in cases:
            with self.subTest(name), tempfile.TemporaryDirectory() as scratch:
                mutant_runs, mutant_words = copy.deepcopy(self.runs), copy.deepcopy(self.words)
                mutate(mutant_runs, mutant_words)
                pathlib.Path(scratch, "runs.json").write_text(json.dumps(mutant_runs))
                pathlib.Path(scratch, "runs-page-words.json").write_text(json.dumps(mutant_words))
                done = subprocess.run([sys.executable, script, "--check", "--pilot", scratch], capture_output=True, text=True)
                self.assertEqual((done.returncode, done.stdout), (2, ""))
                self.assertNotIn("Traceback", done.stderr)
                self.assertIn(message, done.stderr)
        with tempfile.TemporaryDirectory() as scratch:
            pathlib.Path(scratch, "runs.json").write_text("{not json")
            done = subprocess.run([sys.executable, script, "--check", "--pilot", scratch], capture_output=True, text=True)
            self.assertEqual(done.returncode, 2)
            self.assertNotIn("Traceback", done.stderr)

    def test_a_changed_run_id_or_digest_fails_the_check(self):
        for member, value in (("runId", "658f2f90" + "0" * 24), ("siteDigest", "0" * 63)):
            mutant = copy.deepcopy(self.words)
            mutant["runs"]["658f2f90"][member] = value
            self.assertEqual([line.split(":")[0] for line in runs.record_differences(self.runs, mutant)], [f"run 658f2f90, {member}"])

    def test_commands(self):
        script = str(SCRIPTS / "dossier_pilot_runs.py")
        done = subprocess.run([sys.executable, script, "--check"], capture_output=True, text=True)
        self.assertEqual((done.returncode, done.stdout),
                         (0, "check: 6 runs (5 with a site) re-derived from the recorded words per page; 0 difference(s)\n"))
        with tempfile.TemporaryDirectory() as scratch:
            for root in (f"{scratch}/run-x.agents", f"{scratch}/run-x.sessions/inner"):
                refused = subprocess.run([sys.executable, script, "--check", "--state-root", root], capture_output=True, text=True)
                self.assertEqual(refused.returncode, 2)
                self.assertIn(".agents or .sessions", refused.stderr)
            absent = subprocess.run([sys.executable, script, "--check", "--state-root", scratch], capture_output=True, text=True)
            self.assertEqual(absent.returncode, 2)
            self.assertIn("0 run directories", absent.stderr)

    def test_a_run_is_read_without_its_agent_or_session_directories(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = pathlib.Path(scratch)
            run = root / "run-abcd1234ffff"
            for trap in (root / "run-abcd1234ffff.agents", root / "run-abcd1234ffff.sessions"):
                trap.mkdir()
            (run / "drafts").mkdir(parents=True)
            (run / "brief.json").write_text(json.dumps({"briefVersion": "b-9", "guidanceVersion": "g-2"}))
            for number in (0, 1, 2):
                (run / "drafts" / f"rev-{number}.json").write_text(json.dumps({"schemaVersion": f"s-{number}"}))
            for number, body in ((0, "<main>old</main>"), (1, "<main><p>one two three</p></main>")):
                site = run / "site" / str(number)
                (site / "sources").mkdir(parents=True)
                (site / "index.html").write_text(body)
                (site / "review.html").write_text("<main>four five</main>")
                (site / "sources" / "a.html").write_text("<main>RAW</main>")
            facts, measured = runs.read_run(root, "abcd1234", site_to_text)
            self.assertEqual(facts, {"runDir": "run-abcd1234ffff", "briefVersion": "b-9", "guidanceVersion": "g-2",
                                     "draftSchemaVersion": "s-2", "lastDraftRevision": 2})
            # The digest covers the kept pages of the last site only; the literal is from sha256sum over the two lines, not from the module.
            self.assertEqual(measured, {"runId": "abcd1234ffff", "site": "site/1",
                                        "siteDigest": "69890350878cf971cd0e6543a5a1a0230c05a8179f7ea69ce9f88b891ab89da7",
                                        "sourcesPagesExcluded": 1, "perPageWords": {"index.html": 3, "review.html": 2}})


class ScreenedTreeTests(unittest.TestCase):
    def test_selftest(self):
        done = subprocess.run(["node", str(SCRIPTS / "dossier_pilot_screened_tree.mjs"), "--selftest"], capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertIn("19 count mutations", done.stdout)
        self.assertIn("0 failure(s)", done.stdout)
        self.assertNotIn("SURVIVED", done.stdout)

    def test_refuses_without_a_clone_that_holds_the_commit(self):
        with tempfile.TemporaryDirectory() as scratch:
            subprocess.run(["git", "init", "-q", "--bare", f"{scratch}/empty.git"], check=True)
            done = subprocess.run(["node", str(SCRIPTS / "dossier_pilot_screened_tree.mjs"), "--clone", f"{scratch}/empty.git", "--out", f"{scratch}/tree"],
                                  capture_output=True, text=True)
            # The clone is checked before the policy bytes and the built screen are loaded, so this refusal is the clone's own
            # whether or not the checkout is built.
            self.assertEqual(done.returncode, 2, done.stdout + done.stderr)
            self.assertIn("does not hold commit", done.stderr)
            self.assertFalse(pathlib.Path(f"{scratch}/tree").exists())

    def test_an_error_that_is_not_a_refusal_exits_2(self):
        with tempfile.TemporaryDirectory() as scratch:
            subprocess.run(["git", "init", "-q", "--bare", f"{scratch}/empty.git"], check=True)
            for flags in (["--manifest", f"{scratch}/absent.json"], ["--out", f"{scratch}/no/such/parent/tree"]):
                done = subprocess.run(["node", str(SCRIPTS / "dossier_pilot_screened_tree.mjs"), "--clone", f"{scratch}/empty.git", *flags],
                                      capture_output=True, text=True)
                self.assertEqual(done.returncode, 2, (flags, done.stderr))
                self.assertIn("ERROR: ", done.stderr)


if __name__ == "__main__":
    unittest.main()
