#!/usr/bin/env python3
"""Audit the 15 export-level test-only cap1-core functions (syzygy-bpyt.7.7).

Plus `authorizeWrite`, which the bead's 2026-10-22 note adds.  For each name the
sweep computes, from the git blobs at the subject commit (HEAD of the repo it is
run in; never the worktree bytes):

  * the defining file:line,
  * every non-test, non-comment reference outside the defining file (the
    denominator for "used only by tests": must be empty),
  * the test files that reference it, split into the CAP1 conformance file(s)
    and other tests, with call-site counts,
  * the quoted requirement clause (first paragraph under the CAP1-REQ heading
    of the adopted spec, with its line range and the spec file's digest),
  * each production anchor (file, line, matched text) the verdict rests on, and
    each absence anchor ("no non-test file outside the allowed set matches"),
  * the blob digest of every file cited.

The verdict, requirement and rationale are authored data (the VERDICTS table
below).  Everything the sweep can recompute is recomputed; a changed answer
makes `--check` fail, which is the cue to re-audit that row, not to edit the
record.

Usage:
  audit_sweep.py <repo-root>                  print the evidence JSON
  audit_sweep.py <repo-root> --check FILE     recompute and compare with FILE
  audit_sweep.py --selftest                   mutate fixtures, expect failures

The path-scoped checks use Python `re` (AGENTS.md verification rule 1).
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

SPEC = (
    "openspec/changes/project-registration-and-honest-shape-visibility/"
    "specs/project-registration-and-honest-shape-visibility/spec.md"
)
CONF = "packages/cap1-conformance/src/"
CORE = "packages/cap1-core/src/"
DAEMON = "packages/cap1-daemon/src/"
MAIN = "apps/syzygy/src/main.ts"
# Default population of an absence anchor: the Capability 1 production tree.
CAP1_SCOPE = [CORE, DAEMON, "apps/syzygy/src/"]

# Verdict vocabulary.
TEST_SUPPORT = "test-support"  # requirement wired in production by another path
GAP_FILED = "gap-already-filed"  # unwired; a bead already owns it
GAP_NEW = "gap-new-candidate"  # unwired; no bead owns it

# Each row: name, req, verdict, label, bead, why, anchors, absent.
#   anchors: (path, multiline regex, role)       -> must match; first match recorded
#   absent:  (regex, [allowed non-test paths][, scope prefixes]) -> no other non-test src file in scope matches
#            (default scope CAP1_SCOPE: cap1-core, cap1-daemon, apps/syzygy)
VERDICTS = [
    {
        "name": "authorizeObservation", "req": "CAP1-REQ-016", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "Production decides consent per (project, repository) pair in decideRepositoryConsent, whose "
               "pair predicate and record-subject-mismatch refusal feed computeCoverage; the conformance "
               "file's own sweep already runs through computeCoverage. authorizeObservation is a parallel "
               "per-pair predicate over the older ConsentResolution that no production module calls "
               "[Inferred: superseded by the consent-decision pipeline].",
        "anchors": [
            (CORE + "consent-decision.ts", r"^export function consentPairEvaluatedForEntry", "pair predicate (project and repository coordinates)"),
            (CORE + "consent-decision.ts", r"refuse\('record-subject-mismatch', reference\)", "refusal when the record's pair is not the entry's pair"),
            (CORE + "consent-decision.ts", r"^export function decideRepositoryConsent", "closed per-repository decision"),
            (DAEMON + "source-snapshot.ts", r"^\s+decideRepositoryConsent\(", "daemon decides before any content read"),
            (CORE + "coverage.ts", r"^export function computeCoverage", "decision -> coverage state"),
            (DAEMON + "pipeline.ts", r"computeCoverage\(declaration, consentDecisions, observations\)", "daemon pipeline call"),
        ],
        "absent": [],
    },
    {
        "name": "deriveEffectiveStatus", "req": "CAP1-REQ-046", "verdict": GAP_FILED, "label": "Observed",
        "bead": "syzygy-u2a.13",
        "why": "The only producer of AuthorityExposure. The human route has an optional getAuthorityExposures "
               "dependency that the production composition never supplies, so the page renders the disclosed "
               "absence and the machine channel carries no authority exposure.",
        "anchors": [
            (CORE + "authority.ts", r"^export function deriveEffectiveStatus", "the derivation REQ-046 names"),
            (DAEMON + "routes-human.ts", r"readonly getAuthorityExposures\?:", "optional dependency, never supplied"),
            (DAEMON + "routes-human.ts", r"No authority exposures were supplied", "disclosed absence rendered in production"),
            (MAIN, r"\.\.\.humanRoutes\(\{ getEvaluation \}\)", "production composition passes no authority source"),
        ],
        "absent": [(r"getAuthorityExposures", [DAEMON + "routes-human.ts"])],
    },
    {
        "name": "artifactInForce", "req": "CAP1-REQ-046", "verdict": GAP_FILED, "label": "Observed",
        "bead": "syzygy-u2a.13",
        "why": "Consumes an AuthorityExposure, which nothing in production produces (see deriveEffectiveStatus).",
        "anchors": [
            (CORE + "authority.ts", r"^export function artifactInForce", "answer-layer force predicate"),
            (MAIN, r"\.\.\.humanRoutes\(\{ getEvaluation \}\)", "production composition passes no authority source"),
        ],
        "absent": [(r"getAuthorityExposures", [DAEMON + "routes-human.ts"])],
    },
    {
        "name": "isComplete", "req": "CAP1-REQ-014", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "The requirement (a partial capture never renders as whole) is carried per repository by "
               "computeCoverage's degraded-partial state and by coverageBoundary's declared captured scopes, "
               "both served on both channels. No production code asserts a project-level 'complete', so the "
               "aggregate predicate has no caller; the daemon adapters also mint only full captures, so the "
               "partial arm is unreachable at runtime today.",
        "anchors": [
            (CORE + "coverage.ts", r"state: 'degraded-partial',", "partial capture declares its scope"),
            (CORE + "coverage.ts", r"^export function coverageBoundary", "declared captured scopes"),
            (DAEMON + "routes-machine.ts", r"coverageBoundary: coverageBoundary\(evaluation\.coverage\)", "machine channel serves the boundary"),
            (DAEMON + "routes-human.ts", r"case 'degraded-partial':", "human channel renders the partial state"),
            (DAEMON + "source-snapshot.ts", r"outcome: 'captured', capturedScope: REPOSITORY_ROOT_SCOPE", "adapter mints full captures only"),
        ],
        "absent": [],
    },
    {
        "name": "proposeEntryLink", "req": "CAP1-REQ-053", "verdict": TEST_SUPPORT, "label": "Inferred",
        "bead": "syzygy-u2a.7",
        "why": "REQ-053 says Syzygy MAY draft the proposal and SHALL NOT write or render it as applied. The "
               "prohibition limbs are carried in production by the proposed/current rendering (renderState "
               "over a constant empty proposal list) and by the absence of any governed write (state-dir "
               "refusal in main.ts). The optional drafting limb has no production caller; supplying one is a "
               "feature the u2a.7 non-goals exclude, not an unwired mandate.",
        "anchors": [
            (DAEMON + "routes-machine.ts", r"const OPEN_PROPOSALS: readonly Proposal\[\] = \[\];", "production proposals are the empty list"),
            (DAEMON + "routes-machine.ts", r"renderState\(answer, OPEN_PROPOSALS\)", "proposed/current rendering is wired"),
            (MAIN, r"^function governedPlaneViolation", "no write path into the governed plane"),
            (MAIN, r"const violation = governedPlaneViolation\(", "refusal applied at start-up"),
        ],
        "absent": [],
    },
    {
        "name": "computeDiscoverabilityWithProposal", "req": "CAP1-REQ-053", "verdict": GAP_FILED, "label": "Observed",
        "bead": "syzygy-u2a.7",
        "why": "Builds the DiscoverabilityWithProposal the human route renders. The route's getDiscoverability "
               "dependency is supplied by no production file on main, so the page renders the disclosed "
               "absence. u2a.7 (PR 585, open) wires findings; its diff adds no caller of this function "
               "[Observed in the PR diff at its head 3c30b2e2], so re-run this sweep when it merges.",
        "anchors": [
            (CORE + "discoverability.ts", r"^export function computeDiscoverabilityWithProposal", "finding plus proposal"),
            (DAEMON + "routes-human.ts", r"readonly getDiscoverability\?:", "optional dependency, never supplied"),
            (DAEMON + "routes-human.ts", r"No discoverability findings were supplied", "disclosed absence rendered in production"),
            (MAIN, r"\.\.\.humanRoutes\(\{ getEvaluation \}\)", "production composition passes no discoverability source"),
        ],
        "absent": [(r"getDiscoverability", [DAEMON + "routes-human.ts"])],
    },
    {
        "name": "extractDiscoverabilityDistinctions", "req": "CAP1-REQ-064", "verdict": GAP_FILED, "label": "Observed",
        "bead": "syzygy-u2a.7",
        "why": "The machine channel passes empty lists for the authority and discoverability planes to the "
               "distinction sweep, which then lists those kinds as missing. REQ-064 names the four-value "
               "discoverability domain as a distinction that must be machine-readable; today it is honestly "
               "reported missing, not carried.",
        "anchors": [
            (CORE + "distinction.ts", r"^export function extractDiscoverabilityDistinctions", "the discoverability-value extractor"),
            (DAEMON + "routes-machine.ts", r"authority and discoverability planes contribute nothing here", "sweep input is empty for these planes"),
            (DAEMON + "routes-machine.ts", r"^    \[\],\n    \[\],", "two empty plane arguments to sweepDistinctions"),
        ],
        "absent": [],
    },
    {
        "name": "epistemicMarking", "req": "CAP1-REQ-045", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "The marking is the fact's own label as text. Production emits it as the epistemic-label "
               "distinction on every fact (extractDistinctions, machine channel) and as data-epistemic-label "
               "on the human channel; epistemicMarking is a one-line restatement with no caller.",
        "anchors": [
            (CORE + "distinction.ts", r"name: 'epistemic-label',", "label distinction built from the fact"),
            (DAEMON + "routes-machine.ts", r"distinctions: extractDistinctions\(fact\),", "emitted per fact on the machine channel"),
            (DAEMON + "routes-human.ts", r'<span class="fact-label">\[', "label rendered as text on the human channel"),
        ],
        "absent": [],
    },
    {
        "name": "citeBasis", "req": "CAP1-REQ-045", "verdict": TEST_SUPPORT, "label": "Inferred",
        "bead": "syzygy-u2a.13",
        "why": "The prohibition limb (a presentation artifact is never a cited basis) holds structurally: "
               "production states a basis only as constituent fact names and never builds a BasisCandidate. "
               "The positive limb (the owning authority is the cited basis) has no production source because "
               "ExplanationFactSet.owningAuthority is populated by nothing in the daemon; that is the "
               "authority-exposure gap u2a.13 owns.",
        "anchors": [
            (CORE + "epistemic.ts", r"^export function citeBasis", "admission rule"),
            (DAEMON + "routes-human.ts", r"Stated basis:", "production basis = constituent facts"),
        ],
        "absent": [(r"owningAuthority", [DAEMON + "routes-human.ts"], [DAEMON, "apps/syzygy/src/"])],
    },
    {
        "name": "queryKey", "req": "CAP1-REQ-042", "verdict": TEST_SUPPORT, "label": "Inferred",
        "bead": None,
        "why": "Production computes one evaluation at start-up and serves every request from that same "
               "object, stamped with evaluationId, so two equivalent queries cannot diverge and every answer "
               "names its evaluation. queryKey/answersAgree are the test-side comparison of two independent "
               "runs and have no production caller.",
        "anchors": [
            (MAIN, r"const getEvaluation = \(\) => projectEvaluation;", "one evaluation for every route"),
            (DAEMON + "routes-human.ts", r"evaluationId\(evaluation\.model\.evaluation\)", "human answers stamped"),
            (DAEMON + "routes-machine.ts", r"evaluationId: id,", "machine answers stamped"),
        ],
        "absent": [],
    },
    {
        "name": "answersAgree", "req": "CAP1-REQ-042", "verdict": TEST_SUPPORT, "label": "Inferred",
        "bead": None,
        "why": "Same as queryKey: equality of two runs is judged in tests; production serves one stamped "
               "evaluation.",
        "anchors": [
            (MAIN, r"const getEvaluation = \(\) => projectEvaluation;", "one evaluation for every route"),
            (DAEMON + "routes-machine.ts", r"evaluationId: id,", "machine answers stamped"),
        ],
        "absent": [],
    },
    {
        "name": "presentProject", "req": "CAP1-REQ-060", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "Production keeps identity and label as separate fields (projectId vs displayName) and "
               "enumerates identity fields with registrationIdentityFields, which the machine channel serves. "
               "presentProject is a two-field record constructor with no caller.",
        "anchors": [
            (CORE + "declaration.ts", r"displayName: read\.declaration\.project\.name,", "label separate from identity"),
            (CORE + "stable-identity.ts", r"^export function registrationIdentityFields", "identity-field enumeration"),
            (DAEMON + "routes-machine.ts", r"registration: registrationIdentityFields\(evaluation\.registration\),", "served on the machine channel"),
        ],
        "absent": [],
    },
    {
        "name": "presentRepository", "req": "CAP1-REQ-060", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "Same as presentProject; the coverage identity fields are enumerated and served in production.",
        "anchors": [
            (CORE + "stable-identity.ts", r"^export function coverageIdentityFields", "identity-field enumeration"),
            (DAEMON + "routes-machine.ts", r"coverage: coverageIdentityFields\(evaluation\.coverage\),", "served on the machine channel"),
        ],
        "absent": [],
    },
    {
        "name": "isLocatorShaped", "req": "CAP1-REQ-060", "verdict": GAP_NEW, "label": "Observed",
        "bead": None,
        "why": "REQ-060: a repository's identity is never a URL, path or branch; a served identity equal to a "
               "URL or path is its falsifier. The declaration reader accepts any non-empty string as "
               "project.id and repositories[].id and no production module calls the shape check. "
               "Runtime probe (probe-req060.test.ts.txt; output in evidence.json): a declaration with "
               "project id 'https://example.com/acme/project' and repository id '/srv/repos/shared' reads, "
               "registers and is served as facts.projectId verbatim.",
        "anchors": [
            (CORE + "stable-identity.ts", r"^export function isLocatorShaped", "the shape check"),
            (CORE + "declaration.ts", r"`project\.id` \(the opaque project identifier\) must be a non-empty string", "project id admission: non-empty only"),
            (CORE + "declaration.ts", r"repository `id` \(the opaque repository identifier, RFC1-2\) must be a non-empty string", "repository id admission: non-empty only"),
        ],
        "absent": [(r"isLocatorShaped", [CORE + "stable-identity.ts"])],
    },
    {
        "name": "renderSuperseded", "req": "CAP1-REQ-062", "verdict": GAP_NEW, "label": "Inferred",
        "bead": None,
        "why": "No production code produces a superseded observation or assesses currency: assessCurrency has "
               "no non-test caller either (syzygy-dov.2 is the planning bead for it), and the daemon keeps "
               "no earlier evaluation to supersede. The limb is vacuous today rather than violated "
               "[Inferred]; it becomes live when retention or last-good state is authorized.",
        "anchors": [
            (CORE + "staleness.ts", r"^export function renderSuperseded", "superseded rendering"),
            (CORE + "staleness.ts", r"^export function assessCurrency", "currency assessment, also unwired"),
            (DAEMON + "routes-machine.ts", r"Freshness and staleness \(CAP1-REQ-062\) travel verbatim", "machine channel only forwards states it is given"),
        ],
        "absent": [(r"assessCurrency", [CORE + "staleness.ts"]), (r"'superseded'", [CORE + "staleness.ts"])],
    },
    {
        "name": "authorizeWrite", "req": "CAP1-REQ-061", "verdict": TEST_SUPPORT, "label": "Observed",
        "bead": None,
        "why": "Capability 1 performs no governed write; the production boundary is the start-up refusal of a "
               "state directory inside either real governed root, and the write-universe oracle is the "
               "external effect observer in cap1-system. authorizeWrite is already exported only from "
               "@syzygy/cap1-core/testing and compares by raw startsWith (it permits "
               "'openspec/../README.md'); the conformance file pins only green prefix cases.",
        "anchors": [
            (MAIN, r"^function governedPlaneViolation", "production write boundary"),
            (MAIN, r"const violation = governedPlaneViolation\(", "applied at start-up"),
            (CORE + "write-boundary.ts", r"openspec/\.\./README\.md` passes the prefix test", "false permit recorded in the source comment"),
            ("packages/cap1-system/src/write-boundary.system.test.ts", r"^describe\('RT6 — write boundary", "external write-universe oracle"),
        ],
        "absent": [],
    },
]

# Spec requirement ids the table cites; every one must resolve to a heading.
EXPORT_RE = r"^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def is_test(path: str) -> bool:
    return path.endswith(".test.ts")


def strip_comments(text: str) -> str:
    """Blank whole-line comments; leaves code (and trailing comments) intact."""
    out = []
    for line in text.split("\n"):
        s = line.lstrip()
        out.append("" if s.startswith(("//", "*", "/*")) else line)
    return "\n".join(out)


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def clause(spec_text: str, req: str):
    m = re.search(r"^### Requirement: " + re.escape(req) + r" — .*$", spec_text, re.M)
    if not m:
        return None
    start = line_of(spec_text, m.start())
    lines = spec_text.split("\n")
    body = []
    i = start  # 0-based index of the line after the heading
    # skip blank + "Group:" line, then take the paragraph up to the first "- **Case"
    while i < len(lines) and not lines[i].startswith("- **Case"):
        if lines[i].startswith("### Requirement"):
            break
        body.append(lines[i])
        i += 1
    para = [b for b in body if b.strip() and not b.startswith("Group:")]
    return {
        "heading": m.group(0),
        "headingLine": start,
        "quote": " ".join(" ".join(para).split()),
    }


def compute(files: dict, subject: str) -> dict:
    """Pure over {path: text}; `subject` is the commit the texts belong to."""
    src = {p: t for p, t in files.items() if p.endswith(".ts") and "/src/" in p}
    prod = {p: t for p, t in src.items() if not is_test(p)}
    tests = {p: t for p, t in src.items() if is_test(p)}
    prod_code = {p: strip_comments(t) for p, t in prod.items()}
    spec_text = files.get(SPEC, "")

    cited = {SPEC} if spec_text else set()
    rows, failures = [], []
    for v in VERDICTS:
        name = v["name"]
        word = re.compile(r"(?<![\w$])" + re.escape(name) + r"(?![\w$])")
        row = {
            "name": name, "requirement": v["req"], "verdict": v["verdict"],
            "verdictLabel": v["label"], "bead": v["bead"], "rationale": v["why"],
        }

        defs = [
            (p, line_of(t, m.start()))
            for p, t in prod.items()
            for m in [re.search(EXPORT_RE + re.escape(name) + r"(?![\w$])", t, re.M)]
            if m
        ]
        if len(defs) != 1:
            failures.append(f"{name}: expected exactly one definition, found {len(defs)}")
            row["definition"] = None
            def_path = None
        else:
            def_path = defs[0][0]
            row["definition"] = {"file": def_path, "line": defs[0][1]}
            cited.add(def_path)

        other_prod = sorted(p for p, t in prod_code.items() if p != def_path and word.search(t))
        comment_only = sorted(
            p for p, t in prod.items()
            if p != def_path and p not in other_prod and word.search(t)
        )
        row["productionReferencesOutsideDefiningFile"] = other_prod
        row["commentOnlyReferences"] = comment_only
        if other_prod:
            failures.append(f"{name}: no longer test-only; production references {other_prod}")

        test_rows = []
        for p, t in sorted(tests.items()):
            code_lines = [l for l in t.split("\n") if word.search(l) and not l.lstrip().startswith(("import", "//", "*"))]
            if word.search(t):
                test_rows.append({
                    "file": p, "kind": "conformance" if p.startswith(CONF) else "other",
                    "callSiteLines": len(code_lines),
                })
        row["tests"] = test_rows
        if not any(r["kind"] == "conformance" for r in test_rows):
            failures.append(f"{name}: no conformance file references it")
        for r in test_rows:
            cited.add(r["file"])

        c = clause(spec_text, v["req"])
        if c is None:
            failures.append(f"{name}: {v['req']} heading not found in the spec")
        row["clause"] = c

        found = []
        for path, rx, role in v["anchors"]:
            text = files.get(path)
            m = re.search(rx, text, re.M) if text is not None else None
            if m is None:
                failures.append(f"{name}: anchor missing in {path}: {rx}")
                found.append({"file": path, "role": role, "line": None, "pattern": rx})
            else:
                found.append({"file": path, "role": role, "line": line_of(text, m.start()),
                              "pattern": rx})
                cited.add(path)
        row["anchors"] = found

        absences = []
        for entry in v["absent"]:
            rx, allowed = entry[0], entry[1]
            scope = entry[2] if len(entry) > 2 else CAP1_SCOPE
            pat = re.compile(rx)
            pop = {p: t for p, t in prod_code.items() if p.startswith(tuple(scope))}
            hits = sorted(p for p, t in pop.items() if p not in allowed and pat.search(t))
            absences.append({"pattern": rx, "allowedFiles": allowed, "scopePrefixes": list(scope),
                             "otherNonTestFilesMatching": hits,
                             "denominatorNonTestSrcFiles": len(pop)})
            if hits:
                failures.append(f"{name}: absence anchor {rx} now matched in {hits}")
        row["absenceAnchors"] = absences
        rows.append(row)

    digests = {p: sha256(files[p]) for p in sorted(cited) if p in files}
    counts = {}
    for r in rows:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    return {
        "subject": {"commit": subject, "blobDigests": digests},
        "population": {
            "functions": len(rows),
            "nonTestSrcFiles": len(prod),
            "testSrcFiles": len(tests),
            "verdictCounts": counts,
        },
        "rows": rows,
        "failures": failures,
    }


def load_git(root: Path):
    def git(*a):
        return subprocess.run(["git", *a], cwd=root, capture_output=True, check=True).stdout

    commit = git("rev-parse", "HEAD").decode().strip()
    paths = [p for p in git("ls-tree", "-r", "-z", "--name-only", "HEAD").decode().split("\0") if p]
    wanted = [p for p in paths if (p.endswith(".ts") and "/src/" in p and p.startswith(("packages/", "apps/")))]
    wanted.append(SPEC)
    files = {p: git("show", f"HEAD:{p}").decode("utf-8") for p in wanted}
    return commit, files


def selftest() -> int:
    base = {
        MAIN: "const getEvaluation = () => projectEvaluation;\n...humanRoutes({ getEvaluation }),\n",
        CORE + "admission.ts": "export function authorizeObservation() {}\n",
        CORE + "consent-decision.ts": "export function consentPairEvaluatedForEntry() {}\n"
        "refuse('record-subject-mismatch', reference)\nexport function decideRepositoryConsent() {}\n",
        CONF + "req-016.conformance.test.ts": "authorizeObservation(x)\n",
        SPEC: "### Requirement: CAP1-REQ-016 — x\n\nGroup: g. Form: **p**.\n\nclause text.\n\n- **Case** c\n",
    }
    sub = [v for v in VERDICTS if v["name"] == "authorizeObservation"]
    saved = list(VERDICTS)
    VERDICTS[:] = [dict(sub[0], anchors=[sub[0]["anchors"][0], sub[0]["anchors"][1], sub[0]["anchors"][2]])]
    bad = 0
    try:
        ok = compute(base, "x")
        # a fixture that satisfies everything but the unfixtured anchors in other files
        expected_baseline = [f for f in ok["failures"]]
        if len(expected_baseline) != 0:
            print("FAIL baseline fixture should be clean:", expected_baseline)
            bad += 1
        mutants = {
            "production caller appears": lambda f: f.update({CORE + "evil.ts": "authorizeObservation(1)\n"}),
            "conformance file removed": lambda f: f.pop(CONF + "req-016.conformance.test.ts"),
            "anchor text removed": lambda f: f.update({CORE + "consent-decision.ts": f[CORE + "consent-decision.ts"].replace("record-subject-mismatch", "x")}),
            "definition removed": lambda f: f.update({CORE + "admission.ts": ""}),
            "requirement heading removed": lambda f: f.update({SPEC: "no headings\n"}),
        }
        for label, mutate in mutants.items():
            f = dict(base)
            mutate(f)
            res = compute(f, "x")
            # the caller mutant lives in a path that must be under /src/ to count
            if label == "production caller appears":
                f = dict(base)
                f["packages/x/src/evil.ts"] = "authorizeObservation(1)\n"
                res = compute(f, "x")
            if not res["failures"]:
                print(f"FAIL mutant not detected: {label}")
                bad += 1
            else:
                print(f"ok   mutant detected: {label}")
        # comment-only reference must not count as production use
        f = dict(base)
        f["packages/x/src/note.ts"] = "// authorizeObservation is mentioned here\n"
        res = compute(f, "x")
        if res["failures"] or res["rows"][0]["commentOnlyReferences"] != ["packages/x/src/note.ts"]:
            print("FAIL comment-only reference mishandled", res["failures"])
            bad += 1
        else:
            print("ok   comment-only reference reported, not counted")
        # absence anchor
        VERDICTS[:] = [dict(sub[0], anchors=[], absent=[(r"authorizeObservation", [CORE + "admission.ts"])])]
        f = dict(base)
        f[CORE + "evil.ts"] = "authorizeObservation(1)\n"
        res = compute(f, "x")
        if not any("absence anchor" in x for x in res["failures"]):
            print("FAIL absence anchor not enforced")
            bad += 1
        else:
            print("ok   absence anchor enforced")
    finally:
        VERDICTS[:] = saved
    print("selftest:", "FAILED" if bad else "passed")
    return 1 if bad else 0


def main(argv) -> int:
    if "--selftest" in argv:
        return selftest()
    root = Path(argv[1]).resolve()
    commit, files = load_git(root)
    result = compute(files, commit)
    result["sweepScript"] = {
        "path": "docs/evidence/syzygy-bpyt-7-7/audit_sweep.py",
        "sha256": sha256(Path(__file__).read_text(encoding="utf-8")),
    }
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if "--check" in argv:
        stored = json.loads(Path(argv[argv.index("--check") + 1]).read_text(encoding="utf-8"))
        fresh = json.loads(text)
        # the stored record carries the runtime probe and subject notes the sweep does not recompute
        keep = {k: stored[k] for k in ("probes", "notes") if k in stored}
        for k in keep:
            fresh[k] = keep[k]
        if fresh != stored:
            print("MISMATCH: recomputed sweep differs from the stored record", file=sys.stderr)
            return 1
        print("sweep matches the stored record")
        return 1 if result["failures"] else 0
    sys.stdout.write(text)
    if result["failures"]:
        for f in result["failures"]:
            print("FAILURE:", f, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
