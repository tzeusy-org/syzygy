#!/usr/bin/env python3
"""Measures (a), (b), (e) and (f) of move R27 over the stored Polaris dossier runs, and the comprehension pilot's noise
(syzygy-5dhm.127, R27 slice 1).

    python3 scripts/dossier_stored_run_measures.py              print the headline figures
    python3 scripts/dossier_stored_run_measures.py --write      write the record (docs/evidence/syzygy-5dhm-127/)
    python3 scripts/dossier_stored_run_measures.py --check      recompute every figure and digest and compare with the record;
                                                                exit 1 and name each difference
    python3 scripts/dossier_stored_run_measures.py --selftest   mutate the loaded inputs in memory, one predicate at a time, and
                                                                confirm the figure that predicate feeds changes and --check fails
    --state-root DIR   the dossier state directory (default ~/.local/state/syzygy-dossier)
    --pilot DIR        the 2026-11-21 pilot record (default docs/evidence/pursuit-2026-11-21b/pilot)
    --readers DIR      the 2026-11-23 reader arms (default docs/evidence/syzygy-5dhm-136/readers-2026-11-23)
    --record FILE      the record (default docs/evidence/syzygy-5dhm-127/stored-run-measures.json)

Reads only stored JSON: in each `run-<32 hex>` directory its run.json, brief.json, steps.jsonl, last draft revision, last
inventory revision, every review verdict and the packet of each run's last fidelity verdict; it lists the names of the
`*.launch.json` files and reads none of them. It never opens or lists a `run-*.agents` or `run-*.sessions` directory, starts
no session and no dossier run, and prints counts and digests only, never a repository's text. Not authority.

(a) author variance at fixed input, (b) a pooled pseudo-ceiling, (e) reviewer consistency over identical packets and the
comprehension instrument's grader and reader noise, (f) stage time per review round and the operator actions the records show.
Every figure carries its predicate and denominator in the record.
"""
import argparse
import copy
import hashlib
import itertools
import json
import math
import os
import pathlib
import re
import statistics
import sys
from datetime import datetime

REPO = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_STATE = pathlib.Path.home() / ".local" / "state" / "syzygy-dossier"
DEFAULT_PILOT = REPO / "docs" / "evidence" / "pursuit-2026-11-21b" / "pilot"
DEFAULT_READERS = REPO / "docs" / "evidence" / "syzygy-5dhm-136" / "readers-2026-11-23"
DEFAULT_RECORD = REPO / "docs" / "evidence" / "syzygy-5dhm-127" / "stored-run-measures.json"
FORMAT = "syzygy-dossier-stored-run-measures/1"
RUN_DIR = re.compile(r"^run-[0-9a-f]{32}$")
REV = re.compile(r"^rev-(\d+)\.json$")
VERDICT = re.compile(r"^(fidelity|design)-verdict-(\d+)\.json$")
BLOCK_ROOTS = ("introduction", "sections", "diagrams", "deepDives", "unresolved")
THRESHOLDS = ("any", 0.3, 0.5, 0.7, 1.0)
STRICT = 0.5
WORD = re.compile(r"[a-z][a-z0-9-]{2,}")
STOP = frozenset({"the", "and", "for", "how", "what", "with", "its", "are", "from", "that", "this", "into"})
KINDS = ("purpose", "structure", "mechanism", "rationale", "change", "limits")
RULE_POINTS = 5
# The gradings of the comprehension pilot: where each one's grades and label map are, as corpus keys. The fourth is the
# 2026-11-23 reader grading, which graded the pilot's arms D, E and P again beside the new arms.
GRADINGS = (
    ("first", "pilot/grading/grades.json", "pilot/labels-first-grading.json", "answers"),
    ("second", "pilot/grading2/grades.json", "pilot/labels-second-grading.json", None),
    ("third", "pilot/grading3/grades.json", "pilot/labels-third-grading.json", None),
    ("fourth", "readers/grade/grades.json", "readers/labels/labels.json", None),
)
# Two readers, one dossier: the kept pilot arm and the new arm that read the same stored run's original site.
READER_REPEATS = (("D", "Y", "run 658f2f90, original stored site"), ("E", "Z", "run d9411d26, original stored site"))
PILOT_FILES = ("key.json", "grading/grades.json", "grading2/grades.json", "grading3/grades.json",
               "labels-first-grading.json", "labels-second-grading.json", "labels-third-grading.json")
READER_FILES = ("grade/grades.json", "labels/labels.json")


class InputError(Exception):
    """An input is missing or not of the stored shape."""


# ---------------------------------------------------------------------------------------------------------------- loading

def _listdir(path):
    try:
        return sorted(os.listdir(path))
    except OSError as error:
        raise InputError(f"{path}: {error}") from error


def _read(path):
    try:
        return pathlib.Path(path).read_bytes()
    except OSError as error:
        raise InputError(f"{path}: {error}") from error


def _last(names, pattern):
    numbered = [(int(m.group(1)), name) for name in names for m in [pattern.match(name)] if m]
    if not numbered:
        return None
    return max(numbered)[1]


def load_corpus(state_root, pilot, readers):
    """Every byte the figures read, keyed by a stable name; plus the launch-record names, which are listed and not read."""
    state_root = pathlib.Path(state_root)
    files, listed = {}, {}
    runs = [name for name in _listdir(state_root) if RUN_DIR.match(name)]
    if not runs:
        raise InputError(f"{state_root}: no run directory")
    for run in runs:
        base = state_root / run
        for name in ("run.json", "brief.json", "steps.jsonl"):
            files[f"{run}/{name}"] = _read(base / name)
        draft = _last(_listdir(base / "drafts"), REV)
        files[f"{run}/drafts/{draft}"] = _read(base / "drafts" / draft)
        inventory_names = _listdir(base / "inventory")
        inventory = _last(inventory_names, REV)
        if inventory:
            files[f"{run}/inventory/{inventory}"] = _read(base / "inventory" / inventory)
        review_names = _listdir(base / "reviews")
        for name in review_names:
            if VERDICT.match(name):
                files[f"{run}/reviews/{name}"] = _read(base / "reviews" / name)
        listed[run] = sorted([f"inventory/{n}" for n in inventory_names if n.endswith(".launch.json")]
                             + [f"reviews/{n}" for n in review_names if n.endswith(".launch.json")])
        last_fidelity = _last([n for n in review_names if n.startswith("fidelity-verdict-")],
                              re.compile(r"^fidelity-verdict-(\d+)\.json$"))
        if last_fidelity:
            digest = json.loads(files[f"{run}/reviews/{last_fidelity}"])["packetSha256"]
            key = f"{run}/reviews/fidelity-packet-{digest}/packet.json"
            files[key] = _read(state_root / key)
    for name in PILOT_FILES:
        files[f"pilot/{name}"] = _read(pathlib.Path(pilot) / name)
    for name in READER_FILES:
        files[f"readers/{name}"] = _read(pathlib.Path(readers) / name)
    return {"files": files, "launchRecords": listed}


def _json(corpus, key):
    try:
        return json.loads(corpus["files"][key])
    except KeyError as error:
        raise InputError(f"{key}: not loaded") from error
    except ValueError as error:
        raise InputError(f"{key}: {error}") from error


def _steps(corpus, run):
    raw = corpus["files"][f"{run}/steps.jsonl"].decode("utf-8")
    return [json.loads(line) for line in raw.splitlines() if line.strip()]


def _run_keys(corpus):
    return sorted({key.split("/", 1)[0] for key in corpus["files"] if RUN_DIR.match(key.split("/", 1)[0])})


def _keyed(corpus, run, folder, pattern):
    names = [key.split("/")[-1] for key in corpus["files"] if key.startswith(f"{run}/{folder}/") and key.count("/") == 2]
    name = _last(names, pattern)
    return None if name is None else f"{run}/{folder}/{name}"


# ---------------------------------------------------------------------------------------------------------------- helpers

def short(run):
    return run[4:12]


def r3(value):
    return None if value is None else round(value, 3)


def jaccard(a, b):
    if not a and not b:
        return None
    return len(a & b) / len(a | b)


def mean_pairwise(sets):
    values = [jaccard(a, b) for a, b in itertools.combinations(sets, 2)]
    values = [v for v in values if v is not None]
    return r3(statistics.fmean(values)) if values else None


def words(text):
    return {w for w in WORD.findall(str(text).lower()) if w not in STOP}


def cited_lines(citations):
    out = set()
    for c in citations or ():
        if not isinstance(c, dict) or not isinstance(c.get("path"), str):
            continue
        start, end = c.get("startLine"), c.get("endLine", c.get("startLine"))
        if isinstance(start, int) and isinstance(end, int) and not isinstance(start, bool):
            out.update((c["path"], line) for line in range(start, end + 1))
    return out


def cited_paths(citations):
    return {c["path"] for c in citations or () if isinstance(c, dict) and isinstance(c.get("path"), str)}


def blocks(draft):
    """Every dict under the block roots with a non-empty citations list whose items carry a path (understanding excluded)."""
    out = []

    def walk(node):
        if isinstance(node, dict):
            cites = node.get("citations")
            if isinstance(cites, list) and cites and any(isinstance(c, dict) and "path" in c for c in cites):
                out.append({"id": node.get("id"), "paths": cited_paths(cites), "lines": frozenset(cited_lines(cites))})
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for root in BLOCK_ROOTS:
        walk(draft.get(root))
    return out


def index(items):
    """(path, line) -> indices of the items citing it."""
    out = {}
    for i, item in enumerate(items):
        for key in item["lines"]:
            out.setdefault(key, []).append(i)
    return out


def matched(item, others, others_index, threshold):
    candidates = {j for key in item["lines"] for j in others_index.get(key, ())}
    if threshold == "any":
        return bool(candidates)
    return any(jaccard(item["lines"], others[j]["lines"]) >= threshold for j in candidates)


def cluster(items_by_run, threshold, same=None):
    """Union-find over items of different runs: join when cited (path, line) sets meet the threshold ('any' = share a line)."""
    flat = [(run, item) for run in sorted(items_by_run) for item in items_by_run[run]]
    parent = list(range(len(flat)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    by_line = index([item for _, item in flat])
    for i, (run, item) in enumerate(flat):
        for j in {j for key in item["lines"] for j in by_line[key] if j > i}:
            other_run, other = flat[j]
            if other_run == run or (same and not same(item, other)):
                continue
            if threshold == "any" or jaccard(item["lines"], other["lines"]) >= threshold:
                parent[find(i)] = find(j)
    members = {}
    for i, (run, _) in enumerate(flat):
        members.setdefault(find(i), set()).add(run)
    return list(members.values())


def cluster_summary(items_by_run, threshold, same=None):
    clusters = cluster(items_by_run, threshold, same)
    runs = sorted(items_by_run)
    return {
        "unionClusters": len(clusters),
        "perRunShareOfUnion": {short(r): r3(sum(r in c for c in clusters) / len(clusters)) if clusters else None for r in runs},
        "clustersInOneRunOnly": sum(len(c) == 1 for c in clusters),
        "clustersInEveryRun": sum(len(c) == len(runs) for c in clusters),
    }


def minutes(start, end):
    parse = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
    return (parse(end) - parse(start)).total_seconds() / 60


# ---------------------------------------------------------------------------------------------------------------- runs

def run_facts(corpus):
    out = {}
    for run in _run_keys(corpus):
        record = _json(corpus, f"{run}/run.json")
        subject = record.get("subject", {})
        draft_key = _keyed(corpus, run, "drafts", REV)
        draft = _json(corpus, draft_key)
        out[run] = {
            "repositoryId": subject.get("repository", {}).get("repositoryId"),
            "commit": subject.get("pinnedRevision", {}).get("commit"),
            "briefVersion": _json(corpus, f"{run}/brief.json").get("briefVersion"),
            "draftSchema": draft.get("schemaVersion"),
            "lastDraftRevision": int(REV.match(draft_key.split("/")[-1]).group(1)),
            "draft": draft,
        }
    return out


def cohorts(facts):
    groups = {}
    for run, f in facts.items():
        groups.setdefault((f["repositoryId"], f["commit"]), []).append(run)
    return groups


def fixed_input_cohort(facts):
    """The largest group of runs at one repository and commit (ties: the repository id sorts first)."""
    groups = sorted(cohorts(facts).items(), key=lambda kv: (-len(kv[1]), str(kv[0])))
    (repository, commit), runs = groups[0]
    return repository, commit, sorted(runs)


# ---------------------------------------------------------------------------------------------------------------- (a)

def figure_a(facts, cohort):
    runs = cohort
    blk = {r: blocks(facts[r]["draft"]) for r in runs}
    paths = {r: set().union(*(b["paths"] for b in blk[r])) if blk[r] else set() for r in runs}
    union = set().union(*paths.values())
    claim = {}
    for name, threshold in (("loose", "any"), ("strict", STRICT)):
        pair, in_all = {}, {}
        idx = {r: index(blk[r]) for r in runs}
        hits = {r: [0] * len(blk[r]) for r in runs}
        for a, b in itertools.permutations(runs, 2):
            got = [matched(item, blk[b], idx[b], threshold) for item in blk[a]]
            for i, g in enumerate(got):
                hits[a][i] += g
            pair[f"{short(a)}->{short(b)}"] = sum(got) / len(got) if got else None
        values = [v for v in pair.values() if v is not None]
        for r in runs:
            in_all[short(r)] = r3(sum(h == len(runs) - 1 for h in hits[r]) / len(hits[r])) if hits[r] else None
        claim[name] = {"meanOrderedPairShareMatched": r3(statistics.fmean(values)) if values else None,
                       "minPair": r3(min(values)) if values else None, "maxPair": r3(max(values)) if values else None,
                       "shareOfBlocksMatchedInEveryOtherRun": in_all}
    repo_words = words(str(facts[runs[0]]["repositoryId"]).replace("-", " "))
    strip = lambda s: s - repo_words
    poles = {r: facts[r]["draft"].get("poles") or [] for r in runs}
    with_poles = [r for r in runs if poles[r]]
    pole_words = [strip(set().union(*(words(p.get("label", "")) for p in poles[r]))) for r in with_poles]
    section_words = [strip(set().union(set(), *(words(s.get("title", "")) for s in facts[r]["draft"].get("sections") or [])))
                     for r in runs]
    intro = [strip(words((facts[r]["draft"].get("introduction") or {}).get("text", ""))) for r in runs]
    props = {r: (facts[r]["draft"].get("understanding") or {}).get("proposition") or [] for r in runs}
    prop_words = [strip(set().union(set(), *(words(p.get("statement", "")) for p in props[r]))) for r in runs]
    prop_lines = [set().union(set(), *(cited_lines(p.get("citations")) for p in props[r])) for r in runs]
    return {
        "label": "Observed",
        "runs": {short(r): {"lastDraftRevision": facts[r]["lastDraftRevision"], "blocks": len(blk[r]),
                            "blocksWithoutLineCitation": sum(not b["lines"] for b in blk[r]),
                            "briefVersion": facts[r]["briefVersion"], "draftSchema": facts[r]["draftSchema"]} for r in runs},
        "pathLevel": {"perRun": {short(r): len(paths[r]) for r in runs}, "union": len(union),
                      "inEveryRun": sum(all(p in paths[r] for r in runs) for p in union),
                      "inOneRunOnly": sum(sum(p in paths[r] for r in runs) == 1 for p in union),
                      "meanPairwiseJaccard": mean_pairwise([paths[r] for r in runs])},
        "claimLevel": claim,
        "polesAndThesis": {
            "polesPerRun": {short(r): len(poles[r]) for r in runs},
            "runsWithPoles": len(with_poles),
            "meanPairwiseJaccardPoleLabelWords": mean_pairwise(pole_words),
            "sectionsPerRun": {short(r): len(facts[r]["draft"].get("sections") or []) for r in runs},
            "meanPairwiseJaccardSectionTitleWords": mean_pairwise(section_words),
            "meanPairwiseJaccardIntroductionWords": mean_pairwise(intro),
            "propositionItemsPerRun": {short(r): len(props[r]) for r in runs},
            "meanPairwiseJaccardPropositionWords": mean_pairwise(prop_words),
            "meanPairwiseJaccardPropositionCitedLines": mean_pairwise(prop_lines),
        },
        "predicates": {
            "draft": "each run's highest-numbered drafts/rev-<n>.json",
            "block": "any dict under introduction, sections, diagrams, deepDives or unresolved with a non-empty citations list "
                     "whose items carry a path (the understanding record is excluded)",
            "citedLines": "the set of (path, line) over a block's citations, each closed range startLine..endLine",
            "loose": "block X of run A is matched in run B when some block of B shares a cited (path, line) with X",
            "strict": "block X of run A is matched in run B when some block of B has cited-line Jaccard >= 0.5 with X; a block "
                      "with no line citation is never matched",
            "words": "lowercased regex [a-z][a-z0-9-]{2,}, minus {the,and,for,how,what,with,its,are,from,that,this,into} and "
                     "the words of the repository id",
            "thesis": "understanding.proposition: its statements' words and its cited lines",
            "pairs": "mean over unordered run pairs (Jaccard) or ordered pairs (share matched); a pair of two empty sets is left out",
        },
        "denominator": f"{len(runs)} runs at one repository and commit; blocks per run in runs[*].blocks",
    }


# ---------------------------------------------------------------------------------------------------------------- (b)

def supported_claims(corpus, run):
    key = _keyed(corpus, run, "reviews", re.compile(r"^fidelity-verdict-(\d+)\.json$"))
    if key is None:
        return None, []
    verdict = _json(corpus, key)
    packet = _json(corpus, f"{run}/reviews/fidelity-packet-{verdict['packetSha256']}/packet.json")
    supported = {row.get("blockId") for row in verdict.get("blockSupport") or [] if row.get("verdict") == "supported"}
    items = [b for b in blocks(packet["draft"]["document"]) if b["id"] in supported and b["lines"]]
    return {"fidelityVerdict": key.split("/")[-1], "draftRevisionInPacket": packet["draft"].get("revision")}, items


def inventory_entries(corpus, run):
    key = _keyed(corpus, run, "inventory", REV)
    if key is None:
        return None, []
    entries = _json(corpus, key).get("entries") or []
    return key.split("/")[-1], [{"kind": e.get("kind"), "lines": frozenset(cited_lines(e.get("citations")))} for e in entries]


def gain(items_by_run, first, second, threshold):
    """How many more clusters the second run adds to the first, as a share of the first's clusters."""
    clusters = cluster({first: items_by_run[first], second: items_by_run[second]}, threshold)
    held = sum(first in c for c in clusters)
    added = sum(first not in c for c in clusters)
    return r3(added / held) if held else None


def figure_b(corpus, facts, cohort):
    claims, entries, inputs = {}, {}, {}
    for r in cohort:
        info, claims[r] = supported_claims(corpus, r)
        inv, raw = inventory_entries(corpus, r)
        entries[r] = raw
        inputs[short(r)] = dict(info or {}, inventory=inv)
    # An inventory entry with no line citation is its own cluster: give it no lines, so it joins nothing.
    same_kind = lambda a, b: a["kind"] == b["kind"]
    lines = {r: set().union(set(), *(c["lines"] for c in claims[r])) for r in cohort}
    all_lines = set().union(*lines.values())
    by_brief = {}
    for r in cohort:
        by_brief.setdefault(facts[r]["briefVersion"], []).append(r)
    same_brief = []
    for brief, members in sorted(by_brief.items()):
        for a, b in itertools.permutations(sorted(members), 2):
            same_brief.append({"briefVersion": brief, "first": short(a), "second": short(b),
                               "draftSchemas": [facts[a]["draftSchema"], facts[b]["draftSchema"]],
                               "secondAddsShareOfFirstClusters": {str(t): gain(claims, a, b, t) for t in THRESHOLDS}})
    all_gains = [gain(claims, a, b, STRICT) for a, b in itertools.permutations(cohort, 2)]
    all_gains = [g for g in all_gains if g is not None]
    return {
        "label": "Observed (counts); Inferred (that the union stands in for a depth ceiling)",
        "inputsPerRun": inputs,
        "supportedClaims": {
            "perRunItems": {short(r): len(claims[r]) for r in cohort},
            "byThreshold": {str(t): cluster_summary(claims, t) for t in THRESHOLDS},
        },
        "inventoryEntries": {
            "perRunItems": {short(r): len(entries[r]) for r in cohort},
            "byThreshold": {str(t): cluster_summary(entries, t, same_kind) for t in THRESHOLDS},
        },
        "supportedCitedLines": {"union": len(all_lines),
                                "perRunShareOfUnion": {short(r): r3(len(lines[r]) / len(all_lines)) if all_lines else None
                                                       for r in cohort}},
        "secondRunGain": {
            "sameBriefPairs": same_brief,
            "allOrderedPairsAtStrict": {"pairs": len(all_gains), "min": r3(min(all_gains)) if all_gains else None,
                                        "median": r3(statistics.median(all_gains)) if all_gains else None,
                                        "max": r3(max(all_gains)) if all_gains else None},
            "r28Threshold": 0.25,
        },
        "predicates": {
            "supportedClaim": "a block of the draft inside the packet of the run's last fidelity verdict whose blockSupport "
                              "verdict is 'supported' and which cites at least one line",
            "sameClaim": "items of different runs join one cluster (union-find, transitive) when their cited (path, line) sets "
                         "have Jaccard >= the threshold; 'any' joins on one shared line; items of one run never join directly",
            "sameEntry": "inventory entries (each run's last inventory revision) join when kinds are equal and cited (path, "
                         "line) sets meet the threshold; an entry with no line citation is its own cluster",
            "share": "clusters holding at least one item of the run / all clusters",
            "secondRunGain": "clustering A and B together: clusters with no item of A / clusters with an item of A; the R28 rule "
                             "builds two-author mode only if a fresh second run at the same brief adds at least 0.25",
        },
        "denominator": f"{len(cohort)} runs at one repository and commit; union cluster counts per threshold stated",
    }


# ---------------------------------------------------------------------------------------------------------------- (e)

def finding_key(f):
    return (f.get("severity"), f.get("subject"), f.get("target", f.get("page")))


def agreement(a, b, id_key, value_key):
    left = {row.get(id_key): row.get(value_key) for row in a or []}
    right = {row.get(id_key): row.get(value_key) for row in b or []}
    both = set(left) & set(right)
    return r3(sum(left[k] == right[k] for k in both) / len(both)) if both else None


def figure_e_reviews(corpus):
    pairs, examined = [], 0
    for run in _run_keys(corpus):
        steps = _steps(corpus, run)
        for kind in ("fidelity", "design"):
            pattern = re.compile(rf"^{kind}-verdict-(\d+)\.json$")
            numbered = sorted((int(m.group(1)), key) for key in corpus["files"] if key.startswith(f"{run}/reviews/")
                              and key.count("/") == 2 for m in [pattern.match(key.split("/")[-1])] if m)
            for (n, k1), (m, k2) in zip(numbered, numbered[1:]):
                examined += 1
                v1, v2 = _json(corpus, k1), _json(corpus, k2)
                if v1.get("packetSha256") != v2.get("packetSha256"):
                    continue
                outcome = lambda num: next((s.get("outcome") for s in steps if s.get("step") == "review-check"
                                            and s.get("kind") == kind and s.get("number") == num), None)
                f1, f2 = {finding_key(f) for f in v1.get("findings") or []}, {finding_key(f) for f in v2.get("findings") or []}
                pairs.append({
                    "run": short(run), "kind": kind, "verdicts": [k1.split("/")[-1], k2.split("/")[-1]],
                    "reviewCheckOutcomes": [outcome(n), outcome(m)],
                    "sameSession": v1.get("sessionId") == v2.get("sessionId"),
                    "readiness": [v1.get("readiness"), v2.get("readiness")],
                    "readinessAgrees": v1.get("readiness") == v2.get("readiness"),
                    "findings": [len(v1.get("findings") or []), len(v2.get("findings") or [])],
                    "findingSetJaccard": r3(jaccard(f1, f2)),
                    "blockSupportAgreement": agreement(v1.get("blockSupport"), v2.get("blockSupport"), "blockId", "verdict"),
                    "coverageAgreement": agreement(v1.get("inventoryCoverage"), v2.get("inventoryCoverage"), "entryId",
                                                   "disposition"),
                })
    return {
        "label": "Observed",
        "consecutiveVerdictPairsExamined": examined,
        "pairsWithEqualPacket": len(pairs),
        "readinessAgreeing": sum(p["readinessAgrees"] for p in pairs),
        "pairsInDifferentSessions": sum(not p["sameSession"] for p in pairs),
        "pairs": pairs,
        "predicates": {
            "pair": "consecutive verdict files N and N+1 of one kind in one run with equal packetSha256",
            "findingSet": "set of (severity, subject, target or page); Jaccard between the two verdicts",
            "agreement": "share of block ids (entry ids) in both verdicts with equal blockSupport verdict (coverage disposition)",
            "reviewCheckOutcome": "the steps.jsonl review-check row of that kind whose number equals the verdict's number",
        },
        "denominator": "consecutiveVerdictPairsExamined, over every run and both review kinds",
    }


def grade_table(corpus, grades_key, labels_key, member):
    grades = _json(corpus, grades_key)["grades"]
    labels = _json(corpus, labels_key)
    labels = labels[member] if member else labels
    table = {}
    for row in grades:
        if row.get("kind") not in KINDS:
            raise InputError(f"{grades_key}: question {row.get('id')} has kind {row.get('kind')!r}")
        for label, cell in row.items():
            if label in ("id", "kind"):
                continue
            facts = cell.get("facts")
            if not isinstance(facts, list) or not facts:
                raise InputError(f"{grades_key}: question {row.get('id')} label {label}: no grades")
            table.setdefault(labels[label], {})[row["id"]] = (row["kind"], list(facts))
    return table


def shares(arm_grades):
    total = sum(sum(f) for _, f in arm_grades.values())
    count = sum(len(f) for _, f in arm_grades.values())
    per = {}
    for kind, facts in arm_grades.values():
        cell = per.setdefault(kind, [0.0, 0])
        cell[0] += sum(facts)
        cell[1] += len(facts)
    return total / count, {k: per[k][0] / per[k][1] for k in KINDS if k in per}


def spread(values):
    return round((max(values) - min(values)) * 100, 1)


def fact_agreement(x, y):
    same = total = 0
    absolute = 0.0
    for qid in x:
        a, b = x[qid][1], y[qid][1]
        if len(a) != len(b):
            raise InputError(f"question {qid}: {len(a)} and {len(b)} facts")
        same += sum(p == q for p, q in zip(a, b))
        absolute += sum(abs(p - q) for p, q in zip(a, b))
        total += len(a)
    return {"factsEqual": same, "facts": total, "shareEqual": r3(same / total), "meanAbsoluteGradeDifference": r3(absolute / total)}


def figure_e_instrument(corpus):
    tables = {name: grade_table(corpus, g, l, m) for name, g, l, m in GRADINGS}
    key = _json(corpus, "pilot/key.json")["questions"]
    facts_per_kind = {k: sum(len(q["required_facts"]) for q in key if q["kind"] == k) for k in KINDS}
    facts_total = sum(facts_per_kind.values())
    regrade = {}
    for arm in sorted({a for t in tables.values() for a in t}):
        seen = [(name, tables[name][arm]) for name, *_ in GRADINGS if arm in tables[name]]
        if len(seen) < 2:
            continue
        overall = {name: shares(g)[0] for name, g in seen}
        kinds = {k: {name: shares(g)[1][k] for name, g in seen} for k in KINDS}
        pair_agreement = [fact_agreement(a, b) for (_, a), (_, b) in itertools.combinations(seen, 2)]
        regrade[arm] = {
            "gradings": [name for name, _ in seen],
            "overall": {name: r3(v) for name, v in overall.items()},
            "overallSpreadPoints": spread(list(overall.values())),
            "perKindSpreadPoints": {k: spread(list(v.values())) for k, v in kinds.items()},
            "maxKindSpreadPoints": max(spread(list(v.values())) for v in kinds.values()),
            "factLevel": {"pairs": len(pair_agreement),
                          "minShareEqual": min(p["shareEqual"] for p in pair_agreement),
                          "maxMeanAbsoluteGradeDifference": max(p["meanAbsoluteGradeDifference"] for p in pair_agreement)},
        }
    fourth = tables["fourth"]
    readers = []
    for kept, new, text in READER_REPEATS:
        a, b = shares(fourth[kept]), shares(fourth[new])
        kind_diff = {k: round((b[1][k] - a[1][k]) * 100, 1) for k in KINDS}
        all_measurements = [shares(tables[name][kept])[0] for name, *_ in GRADINGS if kept in tables[name]] + [b[0]]
        all_kind = {k: spread([shares(tables[name][kept])[1][k] for name, *_ in GRADINGS if kept in tables[name]]
                              + [b[1][k]]) for k in KINDS}
        readers.append({
            "arms": [kept, new], "text": text, "grading": "fourth",
            "overall": [r3(a[0]), r3(b[0])], "overallDifferencePoints": round((b[0] - a[0]) * 100, 1),
            "perKindDifferencePoints": kind_diff,
            "maxAbsKindDifferencePoints": max(abs(v) for v in kind_diff.values()),
            "factLevel": fact_agreement(fourth[kept], fourth[new]),
            "sameTextEveryMeasurement": {"measurements": len(all_measurements), "overallSpreadPoints": spread(all_measurements),
                                         "perKindSpreadPoints": all_kind,
                                         "maxKindSpreadPoints": max(all_kind.values())},
        })
    overall_regrade = max(v["overallSpreadPoints"] for v in regrade.values())
    kind_regrade = max(v["maxKindSpreadPoints"] for v in regrade.values())
    overall_reader = max(abs(r["overallDifferencePoints"]) for r in readers)
    kind_reader = max(r["maxAbsKindDifferencePoints"] for r in readers)
    overall_same_text = max(r["sameTextEveryMeasurement"]["overallSpreadPoints"] for r in readers)
    kind_same_text = max(r["sameTextEveryMeasurement"]["maxKindSpreadPoints"] for r in readers)
    resolution = {k: round(100 / n, 1) for k, n in facts_per_kind.items()}
    sampling = {}
    for kept, *_ in READER_REPEATS:
        p = shares(fourth[kept])[0]
        sampling[kept] = {"share": r3(p), "overallPoints": round(100 * math.sqrt(p * (1 - p) / facts_total), 1),
                          "perKindPointsAt13Facts": round(100 * math.sqrt(p * (1 - p) / 13), 1)}
    return {
        "label": "Observed (spreads and differences); Inferred (the sampling error, which treats facts as independent draws)",
        "requiredFacts": facts_total,
        "factsPerKind": facts_per_kind,
        "pointsPerFactByKind": resolution,
        "pointsPerFactOverall": round(100 / facts_total, 2),
        "regrade": regrade,
        "readerRepeat": readers,
        "binomialSamplingError": sampling,
        "maxima": {"overallRegradePoints": overall_regrade, "kindRegradePoints": kind_regrade,
                   "overallReaderPoints": overall_reader, "kindReaderPoints": kind_reader,
                   "overallSameTextPoints": overall_same_text, "kindSameTextPoints": kind_same_text},
        "predicates": {
            "share": "sum of fact grades (0, 0.5, 1) / required facts, overall or over one kind's questions",
            "spreadPoints": "(max - min) * 100 over the listed gradings of one arm's unchanged answers",
            "readerRepeat": "two reader sessions given the same stored run's site, graded in the same (fourth) grading",
            "sameTextEveryMeasurement": "every grading of the kept arm plus the new reader's grading: reader and grader together",
            "factLevel": "facts given an equal grade in two gradings (or by two readers), over all required facts",
            "samplingError": "100 * sqrt(p (1 - p) / n), n the facts in the share",
        },
        "denominator": f"{facts_total} required facts over 24 questions; gradings first to fourth; arms graded at least twice "
                       "with unchanged answers, and two reader pairs",
        "caveat": "That arms D, E and P in the fourth grading are the pilot's stored answers, and that Y and Z read the same "
                  "text as D and E, rests on the reader record's README; the record stores no fourth grading input",
    }


def five_point_rule(instrument):
    m = instrument["maxima"]
    fact = min(instrument["pointsPerFactByKind"].values())
    return {
        "label": "Inferred (from the Observed maxima above)",
        "rulePoints": RULE_POINTS,
        "overall": {
            "observedNoisePoints": max(m["overallRegradePoints"], m["overallReaderPoints"], m["overallSameTextPoints"]),
            "insideObservedNoise": RULE_POINTS <= max(m["overallRegradePoints"], m["overallReaderPoints"],
                                                       m["overallSameTextPoints"]),
            "factsInFivePoints": round(RULE_POINTS / instrument["pointsPerFactOverall"], 1),
        },
        "perKind": {
            "observedNoisePoints": max(m["kindRegradePoints"], m["kindReaderPoints"], m["kindSameTextPoints"]),
            "insideObservedNoise": RULE_POINTS <= max(m["kindRegradePoints"], m["kindReaderPoints"], m["kindSameTextPoints"]),
            "smallestPointsPerFact": fact,
            "oneFactExceedsRule": fact > RULE_POINTS,
        },
    }


# ---------------------------------------------------------------------------------------------------------------- (f)

def figure_f(corpus, facts, listed, cohort):
    per_run, rounds_all = {}, {"fidelity": [], "design": []}
    for run in _run_keys(corpus):
        steps = _steps(corpus, run)
        rounds = []
        for i, s in enumerate(steps):
            if not (s.get("step") == "session-prompt" and s.get("role") == "review" and s.get("outcome") == "delivered"):
                continue
            refused = 0
            for t in steps[i + 1:]:
                if t.get("step") == "review-check" and t.get("kind") == s.get("kind"):
                    if t.get("outcome") == "validated":
                        rounds.append({"kind": s["kind"], "round": s.get("round"), "session": s.get("session"),
                                       "minutes": round(minutes(s["at"], t["at"]), 2), "refusedSubmissions": refused})
                        break
                    refused += 1
        wall = minutes(steps[0]["at"], steps[-1]["at"]) if steps else 0.0
        first_check = next((s["at"] for s in steps if s.get("step") == "check"), None)
        close = next((s for s in steps if s.get("step") == "close"), None)
        usage = close.get("usage") if close else None
        actions = {
            "sessionsStarted": len({(s.get("role"), s.get("kind"), s.get("session")) for s in steps if s.get("step") == "await"}),
            "launchFormRecords": len(listed.get(run, [])),
            "clarificationsAnswered": len(facts[run]["draft"].get("clarifications") or []),
            "usageFiguresGivenAtClose": int(usage not in (None, "not-recorded", {})),
        }
        per_run[short(run)] = {
            "repositoryId": facts[run]["repositoryId"], "inFixedInputCohort": run in cohort,
            "wallMinutesFirstToLastStep": round(wall, 1),
            "authorMinutesToFirstCheck": round(minutes(steps[0]["at"], first_check), 1) if first_check else None,
            "reviewRoundMinutesSum": round(sum(r["minutes"] for r in rounds), 1),
            "closed": close is not None, "rounds": rounds,
            "operatorActionsObservable": actions, "operatorActionsObservableTotal": sum(actions.values()),
        }
        for r in rounds:
            rounds_all[r["kind"]].append(r["minutes"])

    def summary(values):
        if not values:
            return {"rounds": 0}
        return {"rounds": len(values), "medianMinutes": round(statistics.median(values), 2), "minMinutes": min(values),
                "maxMinutes": max(values), "sumMinutes": round(sum(values), 1)}

    def share(rows):
        wall = sum(r["wallMinutesFirstToLastStep"] for r in rows)
        review = sum(r["reviewRoundMinutesSum"] for r in rows)
        return {"wallMinutes": round(wall, 1), "reviewMinutes": round(review, 1),
                "reviewShareOfWallTime": r3(review / wall) if wall else None}

    totals = [r["operatorActionsObservableTotal"] for r in per_run.values()]
    return {
        "label": "Observed (times, records); Inferred (the operator-action total is a floor: preflight, clone agreement, init, "
                 "the run-configuration answer and any consent step leave no step record)",
        "reviewRounds": {k: summary(v) for k, v in rounds_all.items()},
        "allRuns": share(list(per_run.values())),
        "fixedInputCohort": share([v for v in per_run.values() if v["inFixedInputCohort"]]),
        "operatorActionsObservableRange": [min(totals), max(totals)] if totals else None,
        "perRun": per_run,
        "predicates": {
            "round": "a steps.jsonl session-prompt row with role review and outcome delivered; it ends at the next review-check "
                     "row of the same kind with outcome validated; refused review-check rows between are counted",
            "minutes": "end.at minus delivery.at",
            "wall": "last step row's at minus the first's",
            "authorMinutesToFirstCheck": "first check row's at minus the first step row's",
            "sessionsStarted": "distinct (role, kind, session) over await rows: each is a terminal the operator started",
            "launchFormRecords": "names of inventory/*.launch.json and reviews/*.launch.json (listed, never read)",
            "clarificationsAnswered": "length of clarifications in the last draft revision",
            "usageFiguresGivenAtClose": "the close row carries a usage other than null, 'not-recorded' or {}",
        },
        "denominator": f"{len(per_run)} runs; rounds counted per kind in reviewRounds",
    }


# ---------------------------------------------------------------------------------------------------------------- record

def compute(corpus):
    facts = run_facts(corpus)
    repository, commit, cohort = fixed_input_cohort(facts)
    instrument = figure_e_instrument(corpus)
    inputs = [{"name": key, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
              for key, data in sorted(corpus["files"].items())]
    return {
        "format": FORMAT,
        "bead": "syzygy-5dhm.127",
        "status": "Not authority. A measurement over stored records; no session, no dossier run, no provider call.",
        "script": "scripts/dossier_stored_run_measures.py",
        "inputRoots": {
            "run-*": "the operator's dossier state directory (default ~/.local/state/syzygy-dossier); run-*.agents and "
                     "run-*.sessions never opened or listed",
            "pilot/": "docs/evidence/pursuit-2026-11-21b/pilot/",
            "readers/": "docs/evidence/syzygy-5dhm-136/readers-2026-11-23/",
        },
        "inputs": inputs,
        "inputsDigest": hashlib.sha256("".join(f"{i['sha256']}  {i['name']}\n" for i in inputs).encode()).hexdigest(),
        "launchRecordsListed": {short(r): len(v) for r, v in sorted(corpus["launchRecords"].items())},
        "runs": {short(r): {k: f[k] for k in ("repositoryId", "commit", "briefVersion", "draftSchema", "lastDraftRevision")}
                 for r, f in sorted(facts.items())},
        "fixedInputCohort": {"repositoryId": repository, "commit": commit, "runs": [short(r) for r in cohort],
                             "leftOut": {short(r): "another repository or commit" for r in sorted(facts) if r not in cohort},
                             "caveat": "the cohort's runs span several brief versions and draft schemas, so (a) and (b) mix "
                                       "author variance with the mechanism changing"},
        "figures": {
            "a_author_variance": figure_a(facts, cohort),
            "b_pooled_ceiling": figure_b(corpus, facts, cohort),
            "e_reviewer_consistency": figure_e_reviews(corpus),
            "e_comprehension_instrument_noise": instrument,
            "f_stage_time_and_operator_actions": figure_f(corpus, facts, corpus["launchRecords"], cohort),
        },
        "fivePointRule": five_point_rule(instrument),
    }


def differences(expected, actual, path="$"):
    if isinstance(expected, dict) and isinstance(actual, dict):
        out = []
        for key in sorted(set(expected) | set(actual), key=str):
            if key not in actual:
                out.append(f"{path}.{key}: missing from the recomputation")
            elif key not in expected:
                out.append(f"{path}.{key}: not in the record")
            else:
                out.extend(differences(expected[key], actual[key], f"{path}.{key}"))
        return out
    if isinstance(expected, list) and isinstance(actual, list) and len(expected) == len(actual):
        return [d for i, (e, a) in enumerate(zip(expected, actual)) for d in differences(e, a, f"{path}[{i}]")]
    return [] if expected == actual else [f"{path}: record {json.dumps(expected)[:80]}, recomputed {json.dumps(actual)[:80]}"]


def render(record):
    a = record["figures"]["a_author_variance"]
    b = record["figures"]["b_pooled_ceiling"]["supportedClaims"]["byThreshold"]["0.5"]
    e = record["figures"]["e_reviewer_consistency"]
    n = record["figures"]["e_comprehension_instrument_noise"]["maxima"]
    f = record["figures"]["f_stage_time_and_operator_actions"]
    rule = record["fivePointRule"]
    return "\n".join([
        f"inputs {len(record['inputs'])} files, digest {record['inputsDigest']}",
        f"(a) cohort {len(a['runs'])} runs; cited paths union {a['pathLevel']['union']}, mean Jaccard "
        f"{a['pathLevel']['meanPairwiseJaccard']}; claims loose {a['claimLevel']['loose']['meanOrderedPairShareMatched']}, "
        f"strict {a['claimLevel']['strict']['meanOrderedPairShareMatched']}",
        f"(b) supported-claim clusters at 0.5: {b['unionClusters']}; per-run share "
        f"{min(b['perRunShareOfUnion'].values())}-{max(b['perRunShareOfUnion'].values())}; in every run {b['clustersInEveryRun']}",
        f"(e) equal-packet pairs {e['pairsWithEqualPacket']} of {e['consecutiveVerdictPairsExamined']}, readiness agrees "
        f"{e['readinessAgreeing']}",
        f"(e) instrument noise, points: overall regrade {n['overallRegradePoints']}, reader {n['overallReaderPoints']}, same text "
        f"{n['overallSameTextPoints']}; per kind regrade {n['kindRegradePoints']}, reader {n['kindReaderPoints']}, same text "
        f"{n['kindSameTextPoints']}",
        f"(f) review share of wall time {f['allRuns']['reviewShareOfWallTime']} over {f['allRuns']['wallMinutes']} min",
        f"five-point rule: overall inside noise {rule['overall']['insideObservedNoise']}; per kind inside noise "
        f"{rule['perKind']['insideObservedNoise']}, one fact = {rule['perKind']['smallestPointsPerFact']}+ points",
    ])


# ---------------------------------------------------------------------------------------------------------------- selftest

def _edit(corpus, key, change):
    data = json.loads(corpus["files"][key])
    change(data)
    corpus["files"][key] = json.dumps(data).encode()


def _first_key(corpus, pattern):
    return next(k for k in sorted(corpus["files"]) if re.search(pattern, k))


def _cohort_runs(corpus):
    return fixed_input_cohort(run_facts(corpus))[2]


def _last_draft_key(corpus, run):
    return _keyed(corpus, run, "drafts", REV)


def _mut_drop_citation(corpus):
    """(a): a block loses its citations, so the block count and its matches change."""
    key = _last_draft_key(corpus, _cohort_runs(corpus)[0])

    def change(d):
        for root in ("sections", "introduction", "diagrams", "deepDives"):
            for b in blocks_raw(d.get(root)):
                b["citations"] = []
                return
    _edit(corpus, key, change)


def blocks_raw(node):
    if isinstance(node, dict):
        if isinstance(node.get("citations"), list) and node["citations"]:
            yield node
        for v in node.values():
            yield from blocks_raw(v)
    elif isinstance(node, list):
        for v in node:
            yield from blocks_raw(v)


def _mut_pole_label(corpus):
    """(a): a pole label changes words."""
    runs = _cohort_runs(corpus)
    key = next(_last_draft_key(corpus, r) for r in runs if json.loads(corpus["files"][_last_draft_key(corpus, r)]).get("poles"))
    _edit(corpus, key, lambda d: d["poles"][0].__setitem__("label", "zzqx wwvy"))


def _mut_unsupport(corpus):
    """(b): one supported block of a last fidelity verdict becomes unsupported."""
    run = _cohort_runs(corpus)[0]
    key = _keyed(corpus, run, "reviews", re.compile(r"^fidelity-verdict-(\d+)\.json$"))

    def change(v):
        next(row for row in v["blockSupport"] if row["verdict"] == "supported")["verdict"] = "unsupported"
    _edit(corpus, key, change)


def _mut_inventory_kind(corpus):
    """(b): an inventory entry's kind changes, so it no longer joins entries of its old kind."""
    run = _cohort_runs(corpus)[0]
    key = _keyed(corpus, run, "inventory", REV)
    _edit(corpus, key, lambda d: [e.__setitem__("kind", "zz-other") for e in d["entries"]])


def _mut_brief(corpus):
    """(b): the first run takes the second run's brief version, so the same-brief pairs change."""
    first, second = _cohort_runs(corpus)[:2]
    brief = json.loads(corpus["files"][f"{second}/brief.json"])["briefVersion"]
    _edit(corpus, f"{first}/brief.json", lambda d: d.__setitem__("briefVersion", brief + "-zz"))
    _edit(corpus, f"{second}/brief.json", lambda d: d.__setitem__("briefVersion", brief + "-zz"))


def _equal_packet_verdict(corpus, first=False):
    for run in _run_keys(corpus):
        for kind in ("fidelity", "design"):
            keys = sorted((int(m.group(1)), k) for k in corpus["files"] if k.startswith(f"{run}/reviews/") and k.count("/") == 2
                          for m in [re.match(rf"^{kind}-verdict-(\d+)\.json$", k.split("/")[-1])] if m)
            for (_, k1), (_, k2) in zip(keys, keys[1:]):
                if json.loads(corpus["files"][k1]).get("packetSha256") == json.loads(corpus["files"][k2]).get("packetSha256"):
                    return k1 if first else k2
    raise InputError("no equal-packet verdict pair")


def _mut_readiness(corpus):
    """(e): the second verdict of an equal-packet pair changes readiness."""
    _edit(corpus, _equal_packet_verdict(corpus), lambda v: v.__setitem__("readiness", "zz-ready"))


def _mut_finding(corpus):
    """(e): a finding's severity changes in the second verdict of an equal-packet pair."""
    _edit(corpus, _equal_packet_verdict(corpus), lambda v: v["findings"].append({"severity": "zz", "subject": "zz"}))


def _mut_packet(corpus):
    """(e): an equal-packet pair stops being one (its first verdict, never a run's last, whose packet (b) reads)."""
    _edit(corpus, _equal_packet_verdict(corpus, first=True), lambda v: v.__setitem__("packetSha256", "0" * 64))


def _mut_grade(corpus):
    """(e) instrument: one of arm D's grades in the second grading changes."""
    labels = json.loads(corpus["files"]["pilot/labels-second-grading.json"])
    label = next(l for l, arm in labels.items() if arm == "D")

    def change(g):
        facts = g["grades"][0][label]["facts"]
        facts[0] = 0 if facts[0] else 1
    _edit(corpus, "pilot/grading2/grades.json", change)


def _mut_reader_label(corpus):
    """(e) instrument: the fourth grading's label map swaps the two repeat readers."""
    def change(m):
        y = next(l for l, a in m.items() if a == "Y")
        z = next(l for l, a in m.items() if a == "Z")
        m[y], m[z] = "Z", "Y"
    _edit(corpus, "readers/labels/labels.json", change)


def _mut_key_fact(corpus):
    """(e) instrument: the key gains a required fact, so the resolution per fact changes."""
    _edit(corpus, "pilot/key.json", lambda k: k["questions"][0]["required_facts"].append("zz"))


def _steps_edit(corpus, change):
    """Edit the steps of the first run that has a validated review-check row."""
    run = next(r for r in _run_keys(corpus) if any(s.get("step") == "review-check" and s.get("outcome") == "validated"
                                                     for s in _steps(corpus, r)))
    key = f"{run}/steps.jsonl"
    rows = _steps(corpus, run)
    change(rows)
    corpus["files"][key] = "".join(json.dumps(r) + "\n" for r in rows).encode()


def _mut_round_time(corpus):
    """(f): the first validated review-check row moves an hour later."""
    def change(rows):
        row = next(r for r in rows if r.get("step") == "review-check" and r.get("outcome") == "validated")
        stamp = datetime.fromisoformat(row["at"].replace("Z", "+00:00"))
        row["at"] = stamp.replace(hour=(stamp.hour + 1) % 24).isoformat().replace("+00:00", "Z")
    _steps_edit(corpus, change)


def _mut_refused(corpus):
    """(f): a validated review-check becomes refused, so a round ends later and counts a refusal."""
    def change(rows):
        next(r for r in rows if r.get("step") == "review-check" and r.get("outcome") == "validated")["outcome"] = "refused"
    _steps_edit(corpus, change)


def _mut_await(corpus):
    """(f): an await row names a new session, so sessions started rises."""
    def change(rows):
        row = dict(next(r for r in rows if r.get("step") == "await"))
        row["session"] = 99
        rows.append(row)
    _steps_edit(corpus, change)


def _mut_launch(corpus):
    """(f): one more launch record is listed."""
    run = _run_keys(corpus)[0]
    corpus["launchRecords"][run] = corpus["launchRecords"][run] + ["reviews/zz.launch.json"]


MUTATIONS = (
    (_mut_drop_citation, "figures.a_author_variance.runs"),
    (_mut_pole_label, "figures.a_author_variance.polesAndThesis.meanPairwiseJaccardPoleLabelWords"),
    (_mut_unsupport, "figures.b_pooled_ceiling.supportedClaims.perRunItems"),
    (_mut_inventory_kind, "figures.b_pooled_ceiling.inventoryEntries.byThreshold"),
    (_mut_brief, "figures.b_pooled_ceiling.secondRunGain.sameBriefPairs"),
    (_mut_readiness, "figures.e_reviewer_consistency.readinessAgreeing"),
    (_mut_finding, "figures.e_reviewer_consistency.pairs"),
    (_mut_packet, "figures.e_reviewer_consistency.pairsWithEqualPacket"),
    (_mut_grade, "figures.e_comprehension_instrument_noise.regrade.D"),
    (_mut_reader_label, "figures.e_comprehension_instrument_noise.readerRepeat"),
    (_mut_key_fact, "figures.e_comprehension_instrument_noise.pointsPerFactByKind"),
    (_mut_round_time, "figures.f_stage_time_and_operator_actions.reviewRounds"),
    (_mut_refused, "figures.f_stage_time_and_operator_actions.perRun"),
    (_mut_await, "figures.f_stage_time_and_operator_actions.perRun"),
    (_mut_launch, "figures.f_stage_time_and_operator_actions.perRun"),
)


def _at(record, dotted):
    node = record
    for part in dotted.split("."):
        node = node[part]
    return node


def selftest(corpus, record=None):
    """Each mutation must change the figure its predicate feeds, and the recomputation must then differ from the record."""
    baseline = compute(corpus) if record is None else record
    if record is not None and differences(record, compute(corpus)):
        return ["the unmutated inputs do not reproduce the record; run --check first"]
    failures = []
    for mutate, target in MUTATIONS:
        mutated = copy.deepcopy(corpus)
        try:
            mutate(mutated)
            again = compute(mutated)
        except (StopIteration, KeyError, IndexError, InputError) as error:
            failures.append(f"{mutate.__name__}: could not apply ({type(error).__name__}: {error})")
            continue
        if _at(again, target) == _at(baseline, target):
            failures.append(f"{mutate.__name__}: {target} did not change")
        if not differences(baseline, again):
            failures.append(f"{mutate.__name__}: --check would pass")
    return failures


# ---------------------------------------------------------------------------------------------------------------- main

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--state-root", default=str(DEFAULT_STATE))
    parser.add_argument("--pilot", default=str(DEFAULT_PILOT))
    parser.add_argument("--readers", default=str(DEFAULT_READERS))
    parser.add_argument("--record", default=str(DEFAULT_RECORD))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    try:
        corpus = load_corpus(args.state_root, args.pilot, args.readers)
        record = compute(corpus)
    except (InputError, KeyError, ValueError) as error:
        print(f"inputs unreadable: {error}", file=sys.stderr)
        return 2
    path = pathlib.Path(args.record)
    if args.write:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record, indent=2, sort_keys=False) + "\n", encoding="utf-8")
        print(f"wrote {path} ({len(record['inputs'])} inputs)")
        return 0
    if args.check or args.selftest:
        try:
            stored = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            print(f"record unreadable: {error}", file=sys.stderr)
            return 2
        if args.check:
            found = differences(stored, record)
            for line in found:
                print(line)
            print(f"{len(found)} difference(s) over {len(record['inputs'])} inputs")
            return 1 if found else 0
        failures = selftest(corpus, stored)
        for line in failures:
            print(line)
        print(f"selftest: {len(MUTATIONS) - len(failures)} of {len(MUTATIONS)} mutations caught" if not failures
              else f"selftest: {len(failures)} failure(s) over {len(MUTATIONS)} mutations")
        return 1 if failures else 0
    print(render(record))
    return 0


if __name__ == "__main__":
    sys.exit(main())
