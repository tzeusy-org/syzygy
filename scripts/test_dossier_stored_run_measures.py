#!/usr/bin/env python3
"""Tests for scripts/dossier_stored_run_measures.py (syzygy-5dhm.127) over a small fixture run tree and pilot record.

    python3 scripts/test_dossier_stored_run_measures.py

Expected values are literals worked out by hand from the fixture below, never computed by the module under test.
"""
import copy
import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("stored_run_measures", SCRIPTS / "dossier_stored_run_measures.py")
measures = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = measures
spec.loader.exec_module(measures)

RUN_B = "run-" + "1" * 32  # sorts first; has the review rounds
RUN_A = "run-" + "2" * 32
RUN_C = "run-" + "3" * 32  # another repository: outside the fixed-input cohort
KINDS = ("purpose", "structure", "mechanism", "rationale", "change", "limits")


def cite(path, start, end):
    return {"id": f"{path}:{start}", "path": path, "startLine": start, "endLine": end}


DRAFT_A = {
    "schemaVersion": "draft-v1",
    "introduction": {"id": "i", "text": "Alpha beta gamma", "citations": [cite("f.c", 1, 2)]},
    "sections": [{"id": "s1", "paragraphs": [{"id": "p1", "citations": [cite("f.c", 1, 4)]},
                                             {"id": "p2", "citations": [cite("g.c", 10, 10)]}]}],
    "poles": [{"label": "Fast store", "sections": ["s1"]}],
    "understanding": {"proposition": [{"id": "u", "statement": "alpha store", "citations": [cite("f.c", 1, 1)]}]},
    "clarifications": [{"question": "q", "answer": "a"}],
}
DRAFT_B = {
    "schemaVersion": "draft-v1",
    "introduction": {"id": "j", "text": "alpha delta", "citations": [cite("f.c", 1, 2)]},
    "sections": [{"id": "s1", "paragraphs": [{"id": "q1", "citations": [cite("f.c", 3, 6)]},
                                             {"id": "q2", "citations": [cite("h.c", 1, 1)]}]}],
    "poles": [{"label": "Slow store", "sections": ["s1"]}],
    "understanding": {"proposition": []},
}
DRAFT_C = {"schemaVersion": "draft-v1", "introduction": {"id": "k", "text": "x", "citations": [cite("z.c", 1, 1)]}}


def step(name, minute, **extra):
    return dict({"format": "polaris-dossier-step/1", "step": name, "at": f"2026-01-01T00:{minute:02d}:00.000Z"}, **extra)


STEPS_B = [
    step("session-prompt", 0, outcome="issued", role="all"),
    step("await", 1, outcome="delivered", role="inventory", round=1, session=1),
    step("check", 6, outcome="passed"),
    step("session-prompt", 10, outcome="delivered", role="review", kind="fidelity", round=1, session=1),
    step("await", 10, outcome="delivered", role="review", kind="fidelity", round=1, session=1),
    step("review-check", 15, outcome="refused", kind="fidelity", number=0),
    step("review-check", 20, outcome="validated", kind="fidelity", number=1),
    step("close", 30, outcome="closed", usage="not-recorded"),
]
STEPS_A = [step("session-prompt", 0, outcome="issued", role="all"), step("check", 2, outcome="passed"),
           step("close", 4, outcome="closed", usage={"tokens": 1})]
STEPS_C = [step("session-prompt", 0, outcome="issued", role="all")]


def verdict(packet, support, findings, readiness="not-ready"):
    return {"schemaVersion": "v", "sessionId": "s1", "packetSha256": packet, "readiness": readiness,
            "blockSupport": [{"blockId": b, "verdict": v, "spanIds": []} for b, v in support], "findings": findings}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(data if isinstance(data, str) else json.dumps(data), encoding="utf-8")


def run_tree(root):
    for run, repo, brief, draft, steps in ((RUN_A, "r-x", "b1", DRAFT_A, STEPS_A), (RUN_B, "r-x", "b1", DRAFT_B, STEPS_B),
                                           (RUN_C, "other-y", "b1", DRAFT_C, STEPS_C)):
        base = root / run
        write(base / "run.json", {"subject": {"repository": {"repositoryId": repo}, "pinnedRevision": {"commit": "c1"}}})
        write(base / "brief.json", {"briefVersion": brief})
        write(base / "steps.jsonl", "".join(json.dumps(s) + "\n" for s in steps))
        write(base / "drafts" / "rev-0.json", {"schemaVersion": "draft-v0"})  # superseded: never read
        write(base / "drafts" / "rev-1.json", draft)
        write(base / "drafts" / "next.json", {"schemaVersion": "next"})
        (base / "reviews").mkdir(parents=True, exist_ok=True)
        (base / "inventory").mkdir(parents=True, exist_ok=True)
    write(root / RUN_A / "inventory" / "rev-0.json",
          {"entries": [{"kind": "component", "citations": [cite("f.c", 1, 2)]}, {"kind": "c2", "citations": []}]})
    write(root / RUN_B / "inventory" / "rev-0.json", {"entries": [{"kind": "component", "citations": [cite("f.c", 1, 2)]}]})
    write(root / RUN_A / "reviews" / "fidelity-verdict-0.json",
          verdict("pa", [("i", "supported"), ("p1", "supported"), ("p2", "unsupported")], []))
    write(root / RUN_A / "reviews" / "fidelity-packet-pa" / "packet.json", {"draft": {"revision": 1, "document": DRAFT_A}})
    support_b = [("j", "supported"), ("q1", "supported"), ("q2", "supported")]
    finding = {"severity": "blocking", "subject": "argument", "target": "j"}
    write(root / RUN_B / "reviews" / "fidelity-verdict-0.json", verdict("pb", support_b, [finding]))
    write(root / RUN_B / "reviews" / "fidelity-verdict-1.json",
          verdict("pb", support_b, [finding, {"severity": "advisory", "subject": "style", "target": "q1"}]))
    write(root / RUN_B / "reviews" / "fidelity-packet-pb" / "packet.json", {"draft": {"revision": 1, "document": DRAFT_B}})
    write(root / RUN_B / "reviews" / "fidelity-session-1.launch.json", "not json: listed, never read")
    # Directories the script must never open: unreadable, so a listing of either fails the run.
    for suffix in (".agents", ".sessions"):
        blocked = root / f"{RUN_A}{suffix}"
        blocked.mkdir()
        write(blocked / "x.json", "{}")
        os.chmod(blocked, 0)


def grades_file(rows_by_label):
    return {"grades": [dict({"id": i, "kind": kind}, **{label: {"facts": [facts[i]], "wrong": 0}
                                                         for label, facts in rows_by_label.items()})
                       for i, kind in enumerate(KINDS)]}


D1, D2, D4 = [1, 1, 0, 0, 1, 0], [1, 1, 0, 0, 0.5, 0], [1, 0, 0, 0, 1, 0]
E3, E4, Y4, Z4 = [1, 1, 1, 0, 0, 0], [1, 1, 1, 1, 0, 0], [1, 0, 0, 0, 1, 0], [1, 1, 1, 0, 0, 0]


def pilot_tree(pilot, readers):
    write(pilot / "key.json", {"questions": [{"id": i, "kind": k, "required_facts": ["f"]} for i, k in enumerate(KINDS)]})
    write(pilot / "grading" / "grades.json", grades_file({"A": D1, "B": [1] * 6}))
    write(pilot / "labels-first-grading.json", {"answers": {"A": "D", "B": "T"}, "claims": {}})
    write(pilot / "grading2" / "grades.json", grades_file({"A": D2}))
    write(pilot / "labels-second-grading.json", {"A": "D"})
    write(pilot / "grading3" / "grades.json", grades_file({"A": E3}))
    write(pilot / "labels-third-grading.json", {"A": "E"})
    write(readers / "grade" / "grades.json", grades_file({"A": D4, "B": Y4, "C": E4, "D": Z4}))
    write(readers / "labels" / "labels.json", {"A": "D", "B": "Y", "C": "E", "D": "Z"})


class Fixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(cls.tmp.name)
        cls.state, cls.pilot, cls.readers = root / "state", root / "pilot", root / "readers"
        cls.record = root / "record.json"
        run_tree(cls.state)
        pilot_tree(cls.pilot, cls.readers)
        cls.corpus = measures.load_corpus(cls.state, cls.pilot, cls.readers)
        cls.out = measures.compute(cls.corpus)

    @classmethod
    def tearDownClass(cls):
        for suffix in (".agents", ".sessions"):
            os.chmod(cls.state / f"{RUN_A}{suffix}", 0o755)
        cls.tmp.cleanup()

    def fig(self, name):
        return self.out["figures"][name]

    def test_reads_only_the_named_files(self):
        names = sorted(self.corpus["files"])
        self.assertNotIn(f"{RUN_A}/drafts/rev-0.json", names)
        self.assertFalse(any(".agents" in n or ".sessions" in n or "launch" in n or "next.json" in n for n in names))
        self.assertEqual(len(names), 28)
        self.assertEqual(self.out["launchRecordsListed"], {"11111111": 1, "22222222": 0, "33333333": 0})
        self.assertEqual(len(self.out["inputs"]), 28)
        self.assertTrue(all(len(i["sha256"]) == 64 for i in self.out["inputs"]))

    def test_cohort(self):
        self.assertEqual(self.out["fixedInputCohort"]["runs"], ["11111111", "22222222"])
        self.assertEqual(list(self.out["fixedInputCohort"]["leftOut"]), ["33333333"])

    def test_a_path_and_claim_level(self):
        a = self.fig("a_author_variance")
        self.assertEqual(a["runs"]["22222222"]["blocks"], 3)
        self.assertEqual(a["pathLevel"], {"perRun": {"11111111": 2, "22222222": 2}, "union": 3, "inEveryRun": 1,
                                          "inOneRunOnly": 2, "meanPairwiseJaccard": 0.333})
        self.assertEqual(a["claimLevel"]["loose"], {"meanOrderedPairShareMatched": 0.667, "minPair": 0.667, "maxPair": 0.667,
                                                    "shareOfBlocksMatchedInEveryOtherRun": {"11111111": 0.667,
                                                                                            "22222222": 0.667}})
        self.assertEqual(a["claimLevel"]["strict"], {"meanOrderedPairShareMatched": 0.5, "minPair": 0.333, "maxPair": 0.667,
                                                     "shareOfBlocksMatchedInEveryOtherRun": {"11111111": 0.333,
                                                                                             "22222222": 0.667}})

    def test_a_poles_and_thesis(self):
        p = self.fig("a_author_variance")["polesAndThesis"]
        self.assertEqual(p["polesPerRun"], {"11111111": 1, "22222222": 1})
        self.assertEqual(p["runsWithPoles"], 2)
        self.assertEqual(p["meanPairwiseJaccardPoleLabelWords"], 0.333)
        self.assertIsNone(p["meanPairwiseJaccardSectionTitleWords"])
        self.assertEqual(p["meanPairwiseJaccardIntroductionWords"], 0.25)
        self.assertEqual(p["meanPairwiseJaccardPropositionWords"], 0.0)

    def test_b_supported_claim_clusters(self):
        b = self.fig("b_pooled_ceiling")["supportedClaims"]
        self.assertEqual(b["perRunItems"], {"11111111": 3, "22222222": 2})
        self.assertEqual(b["byThreshold"]["0.5"], {"unionClusters": 3, "perRunShareOfUnion": {"11111111": 1.0, "22222222": 0.333},
                                                   "clustersInOneRunOnly": 2, "clustersInEveryRun": 1})
        self.assertEqual(b["byThreshold"]["any"], {"unionClusters": 2, "perRunShareOfUnion": {"11111111": 1.0, "22222222": 0.5},
                                                   "clustersInOneRunOnly": 1, "clustersInEveryRun": 1})
        self.assertEqual(b["byThreshold"]["1.0"], {"unionClusters": 4,
                                                   "perRunShareOfUnion": {"11111111": 0.75, "22222222": 0.5},
                                                   "clustersInOneRunOnly": 3, "clustersInEveryRun": 1})

    def test_b_inventory_lines_and_gain(self):
        b = self.fig("b_pooled_ceiling")
        self.assertEqual(b["inventoryEntries"]["byThreshold"]["0.5"],
                         {"unionClusters": 2, "perRunShareOfUnion": {"11111111": 0.5, "22222222": 1.0},
                          "clustersInOneRunOnly": 1, "clustersInEveryRun": 1})
        self.assertEqual(b["supportedCitedLines"], {"union": 7, "perRunShareOfUnion": {"11111111": 1.0, "22222222": 0.571}})
        gains = {(p["first"], p["second"]): p["secondAddsShareOfFirstClusters"]["0.5"] for p in b["secondRunGain"]["sameBriefPairs"]}
        self.assertEqual(gains, {("11111111", "22222222"): 0.0, ("22222222", "11111111"): 2.0})

    def test_e_reviewer_consistency(self):
        e = self.fig("e_reviewer_consistency")
        self.assertEqual((e["consecutiveVerdictPairsExamined"], e["pairsWithEqualPacket"], e["readinessAgreeing"]), (1, 1, 1))
        pair = e["pairs"][0]
        self.assertEqual(pair["reviewCheckOutcomes"], ["refused", "validated"])
        self.assertEqual((pair["findingSetJaccard"], pair["blockSupportAgreement"], pair["coverageAgreement"]), (0.5, 1.0, None))

    def test_e_instrument_noise(self):
        n = self.fig("e_comprehension_instrument_noise")
        self.assertEqual(sorted(n["regrade"]), ["D", "E"])
        d = n["regrade"]["D"]
        self.assertEqual(d["overall"], {"first": 0.5, "second": 0.417, "fourth": 0.333})
        self.assertEqual(d["overallSpreadPoints"], 16.7)
        self.assertEqual(d["perKindSpreadPoints"], {"purpose": 0.0, "structure": 100.0, "mechanism": 0.0, "rationale": 0.0,
                                                    "change": 50.0, "limits": 0.0})
        self.assertEqual(d["factLevel"], {"pairs": 3, "minShareEqual": 0.667, "maxMeanAbsoluteGradeDifference": 0.25})
        dy, ez = n["readerRepeat"]
        self.assertEqual((dy["overallDifferencePoints"], dy["maxAbsKindDifferencePoints"]), (0.0, 0.0))
        self.assertEqual(dy["sameTextEveryMeasurement"]["overallSpreadPoints"], 16.7)
        self.assertEqual((ez["overallDifferencePoints"], ez["perKindDifferencePoints"]["rationale"]), (-16.7, -100.0))
        self.assertEqual(ez["factLevel"], {"factsEqual": 5, "facts": 6, "shareEqual": 0.833, "meanAbsoluteGradeDifference": 0.167})
        self.assertEqual(n["binomialSamplingError"]["D"], {"share": 0.333, "overallPoints": 19.2, "perKindPointsAt13Facts": 13.1})
        self.assertEqual(n["pointsPerFactOverall"], 16.67)

    def test_five_point_rule(self):
        rule = self.out["fivePointRule"]
        self.assertEqual(rule["overall"], {"observedNoisePoints": 16.7, "insideObservedNoise": True, "factsInFivePoints": 0.3})
        self.assertEqual(rule["perKind"], {"observedNoisePoints": 100.0, "insideObservedNoise": True,
                                           "smallestPointsPerFact": 100.0, "oneFactExceedsRule": True})

    def test_f_stage_time(self):
        f = self.fig("f_stage_time_and_operator_actions")
        self.assertEqual(f["reviewRounds"]["fidelity"], {"rounds": 1, "medianMinutes": 10.0, "minMinutes": 10.0,
                                                         "maxMinutes": 10.0, "sumMinutes": 10.0})
        self.assertEqual(f["reviewRounds"]["design"], {"rounds": 0})
        self.assertEqual(f["allRuns"], {"wallMinutes": 34.0, "reviewMinutes": 10.0, "reviewShareOfWallTime": 0.294})
        b = f["perRun"]["11111111"]
        self.assertEqual(b["rounds"], [{"kind": "fidelity", "round": 1, "session": 1, "minutes": 10.0, "refusedSubmissions": 1}])
        self.assertEqual(b["operatorActionsObservable"], {"sessionsStarted": 2, "launchFormRecords": 1,
                                                          "clarificationsAnswered": 0, "usageFiguresGivenAtClose": 0})
        self.assertEqual(f["perRun"]["22222222"]["operatorActionsObservableTotal"], 2)
        self.assertEqual(f["perRun"]["33333333"]["authorMinutesToFirstCheck"], None)
        self.assertEqual(f["operatorActionsObservableRange"], [0, 3])

    def test_check_write_and_failure(self):
        args = ["--state-root", str(self.state), "--pilot", str(self.pilot), "--readers", str(self.readers),
                "--record", str(self.record)]
        self.assertEqual(measures.main(args + ["--write"]), 0)
        self.assertEqual(measures.main(args + ["--check"]), 0)
        stored = json.loads(self.record.read_text())
        changed = copy.deepcopy(stored)
        changed["figures"]["b_pooled_ceiling"]["supportedClaims"]["byThreshold"]["0.5"]["unionClusters"] = 4
        self.record.write_text(json.dumps(changed))
        self.assertEqual(measures.main(args + ["--check"]), 1)
        self.record.write_text(json.dumps(stored))

    def test_selftest_catches_every_mutation(self):
        self.assertEqual(measures.selftest(self.corpus), [])

    def test_selftest_refuses_a_record_the_inputs_do_not_reproduce(self):
        stale = copy.deepcopy(self.out)
        stale["inputsDigest"] = "0" * 64
        self.assertEqual(len(measures.selftest(self.corpus, stale)), 1)

    def test_missing_input_exits_2(self):
        result = subprocess.run([sys.executable, str(SCRIPTS / "dossier_stored_run_measures.py"), "--state-root",
                                 str(self.state / "absent"), "--check"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("inputs unreadable", result.stderr)


if __name__ == "__main__":
    unittest.main()
